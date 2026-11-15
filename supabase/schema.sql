-- Botella · beta. Pegar completo en Supabase > SQL Editor > Run. Se puede volver a correr sin perder datos.
-- Todas las reglas del mar corren aquí, en el servidor. El cliente nunca ve quién lanzó una botella.

-- ========== CÓDIGOS DE INVITACIÓN ==========
create table if not exists public.codes (
  code text primary key,
  active boolean not null default true,
  uses int not null default 0,
  max_uses int not null default 150
);
alter table public.codes enable row level security; -- la app nunca lee la lista
insert into public.codes(code) values ('BOTELLA-01') on conflict do nothing;

create or replace function public.check_code(p_code text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from codes where code = upper(trim(p_code)) and active and uses < max_uses);
$$;
grant execute on function public.check_code(text) to anon, authenticated;

create or replace function public.lima_today() returns date language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;

-- ========== PERFILES ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 25),
  district text not null check (char_length(district) between 1 and 40),
  topics text[] not null default '{}',
  seeks text[] not null default '{}',
  intro_voice text,
  intro_secs int,
  intro_peaks jsonb,
  code_used text,
  paused boolean not null default false,
  bottles int not null default 3,      -- botellas normales para lanzar
  daily_day date,                      -- último día en que recibió su botella gratis
  earned_day date,                     -- día del contador de respuestas premiadas
  earned int not null default 0,       -- botellas ganadas respondiendo hoy (máx. 3)
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- Botellas especiales de regalo para la beta: de color (eliges a quién llega) y que llega lejos (10 orillas).
alter table public.profiles add column if not exists color_left int not null default 2;
alter table public.profiles add column if not exists far_left int not null default 1;

revoke update on public.profiles from authenticated;
grant update (name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, paused, last_seen) on public.profiles to authenticated;

-- Nadie lee perfiles ajenos: las conversaciones son anónimas hasta que los dos revelan su nombre.
drop policy if exists "ver mi perfil" on public.profiles;
create policy "ver mi perfil" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "crear mi perfil" on public.profiles;
create policy "crear mi perfil" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.profile_defaults() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from codes where code = upper(trim(coalesce(new.code_used, ''))) and active and uses < max_uses) then
    raise exception 'Ese código de invitación no es válido.';
  end if;
  update codes set uses = uses + 1 where code = upper(trim(new.code_used));
  new.code_used := upper(trim(new.code_used));
  new.bottles := 3; new.color_left := 2; new.far_left := 1; new.daily_day := lima_today(); new.earned_day := lima_today(); new.earned := 0; new.paused := false;
  new.created_at := now(); new.last_seen := now();
  return new;
end $$;
drop trigger if exists profile_defaults on public.profiles;
create trigger profile_defaults before insert on public.profiles for each row execute function public.profile_defaults();

-- ========== BLOQUEOS Y REPORTES ==========
create table if not exists public.blocks (
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b)
);
alter table public.blocks enable row level security;
drop policy if exists "mis bloqueos" on public.blocks;
create policy "mis bloqueos" on public.blocks for select to authenticated using (a = auth.uid());

create or replace function public.blocked(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (a = x and b = y) or (a = y and b = x));
$$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  target uuid references public.profiles(id) on delete set null,
  bottle_id uuid,
  convo_id uuid,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  reviewed boolean not null default false
);
alter table public.reports enable row level security; -- solo se leen desde el panel de Supabase

-- ========== BOTELLAS ==========
create table if not exists public.bottles (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('Pregunta','Confesión','Historia')),
  body text check (char_length(body) <= 140),
  voice text not null,
  voice_secs int not null check (voice_secs between 1 and 60),
  voice_peaks jsonb,
  hidden boolean not null default false, -- la apaga un reporte
  created_at timestamptz not null default now()
);
alter table public.bottles add column if not exists btype text not null default 'free' check (btype in ('free','color','far'));
alter table public.bottles add column if not exists target_topic text;
alter table public.bottles add column if not exists target_district text;
alter table public.bottles enable row level security;
drop policy if exists "mis botellas" on public.bottles;
create policy "mis botellas" on public.bottles for select to authenticated using (owner = auth.uid());

-- A quién llegó cada botella. Una botella esperando más de 24 h sin abrir sigue su viaje a otra orilla.
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  bottle_id uuid not null references public.bottles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','opened','answered','returned','drifted')),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  unique (bottle_id, to_id)
);
create index if not exists deliveries_to on public.deliveries(to_id, status);
alter table public.deliveries enable row level security;
drop policy if exists "botellas en mi orilla" on public.deliveries;
create policy "botellas en mi orilla" on public.deliveries for select to authenticated using (to_id = auth.uid());

-- ========== CONVERSACIONES ==========
create table if not exists public.convos (
  id uuid primary key default gen_random_uuid(),
  bottle_id uuid references public.bottles(id) on delete set null,
  a uuid not null references public.profiles(id) on delete cascade, -- lanzó la botella
  b uuid not null references public.profiles(id) on delete cascade, -- respondió
  reveal_a boolean not null default false,
  reveal_b boolean not null default false,
  key_a boolean not null default false, -- llave para llamar: la llamada se abre si los dos la ponen
  key_b boolean not null default false,
  closed boolean not null default false,
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (bottle_id, b)
);
alter table public.convos enable row level security;
drop policy if exists "mis conversaciones" on public.convos;
create policy "mis conversaciones" on public.convos for select to authenticated using (auth.uid() in (a, b));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  convo_id uuid not null references public.convos(id) on delete cascade,
  sender uuid not null references public.profiles(id) on delete cascade,
  voice text,
  voice_secs int check (voice_secs between 1 and 120),
  voice_peaks jsonb,
  body text check (char_length(body) <= 300), -- solo avisos del sistema: #call, #bottle
  created_at timestamptz not null default now(),
  check (body is not null or voice is not null)
);
create index if not exists messages_convo on public.messages(convo_id, created_at);
alter table public.messages enable row level security;

create or replace function public.in_convo(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from convos where id = c and auth.uid() in (a, b));
$$;
drop policy if exists "leer mis mensajes" on public.messages;
create policy "leer mis mensajes" on public.messages for select to authenticated using (public.in_convo(convo_id));
drop policy if exists "escribir en mis conversaciones" on public.messages;
create policy "escribir en mis conversaciones" on public.messages for insert to authenticated with check (
  sender = auth.uid()
  and exists (select 1 from convos c where c.id = convo_id and auth.uid() in (c.a, c.b) and not c.closed and not public.blocked(c.a, c.b))
  and (body is null or body like '#call|%')
);

create or replace function public.touch_convo() returns trigger language plpgsql security definer set search_path = public as $$
begin update convos set last_at = new.created_at where id = new.convo_id; return new; end $$;
drop trigger if exists touch_convo on public.messages;
create trigger touch_convo after insert on public.messages for each row execute function public.touch_convo();

-- ========== EL MAR ==========
-- Elige n orillas para una botella: personas activas, no pausadas, sin bloqueos, que aún no la recibieron,
-- con más temas en común y menos botellas esperando.
create or replace function public.deliver(p_bottle uuid, p_n int) returns int language plpgsql security definer set search_path = public as $$
declare bo bottles; mine text[]; got int := 0; r record;
begin
  select * into bo from bottles where id = p_bottle;
  if bo.id is null or bo.hidden then return 0; end if;
  select topics into mine from profiles where id = bo.owner;
  for r in
    select p.id from profiles p
    where p.id <> bo.owner and not p.paused
      and not exists (select 1 from deliveries d where d.bottle_id = bo.id and d.to_id = p.id)
      and not blocked(p.id, bo.owner)
      and not exists (select 1 from convos c where c.bottle_id = bo.id and c.b = p.id)
    order by -- una botella de color llega primero a quien cumple lo que eligió quien la lanzó
             ((bo.target_topic is null or bo.target_topic = any(p.topics)) and (bo.target_district is null or p.district = bo.target_district)) desc,
             cardinality(array(select unnest(p.topics) intersect select unnest(mine))) desc,
             (select count(*) from deliveries w where w.to_id = p.id and w.status = 'waiting') asc,
             (p.last_seen > now() - interval '3 days') desc,
             random()
    limit p_n
  loop
    insert into deliveries(bottle_id, to_id) values (bo.id, r.id);
    got := got + 1;
  end loop;
  return got;
end $$;
revoke execute on function public.deliver(uuid, int) from public, anon, authenticated;

-- Se llama al abrir la app: botella gratis del día y la marea (lo que nadie abrió en 24 h sigue su viaje).
create or replace function public.tide() returns profiles language plpgsql security definer set search_path = public as $$
declare me profiles; r record;
begin
  update profiles set last_seen = now() where id = auth.uid() returning * into me;
  if me.id is null then return null; end if;
  if me.daily_day is distinct from lima_today() then
    update profiles set daily_day = lima_today(), bottles = least(bottles + 1, 9) where id = me.id returning * into me;
  end if;
  for r in
    select d.id, d.bottle_id from deliveries d join bottles b on b.id = d.bottle_id
    where d.status = 'waiting' and d.created_at < now() - interval '24 hours' and not b.hidden
      and b.created_at > now() - interval '7 days'
    order by d.created_at limit 30
    for update of d skip locked
  loop
    update deliveries set status = 'drifted' where id = r.id;
    if (select count(*) from deliveries where bottle_id = r.bottle_id) < 15 then perform deliver(r.bottle_id, 1); end if;
  end loop;
  -- Si mi orilla está casi vacía, el mar me trae botellas recientes que todavía buscan quién las escuche.
  if not me.paused then
    for r in
      select b.id from bottles b
      where b.owner <> me.id and not b.hidden and b.created_at > now() - interval '7 days'
        and not blocked(b.owner, me.id)
        and not exists (select 1 from deliveries d where d.bottle_id = b.id and d.to_id = me.id)
        and (select count(*) from deliveries d where d.bottle_id = b.id and d.status in ('waiting','opened')) < 3
        and (select count(*) from deliveries d where d.bottle_id = b.id) < 15
      order by b.created_at desc
      limit greatest(0, 3 - (select count(*) from deliveries d where d.to_id = me.id and d.status in ('waiting','opened')))
    loop
      insert into deliveries(bottle_id, to_id) values (r.id, me.id) on conflict do nothing;
    end loop;
  end if;
  return me;
end $$;
grant execute on function public.tide() to authenticated;

drop function if exists public.launch_bottle(text, text, text, int, jsonb);
drop function if exists public.launch_bottle(text, text, text, int, jsonb, text, text, text);
create or replace function public.launch_bottle(p_kind text, p_body text, p_voice text, p_secs int, p_peaks jsonb default null,
  p_type text default 'free', p_topic text default null, p_district text default null)
returns table (bottle uuid, shores int, left_bottles int, left_color int, left_far int) language plpgsql security definer set search_path = public as $$
declare me profiles; bid uuid; n int;
begin
  select * into me from profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  p_type := coalesce(p_type, 'free');
  if p_type = 'free' and me.bottles < 1 then raise exception 'Te quedaste sin botellas. Responde una y ganas otra.'; end if;
  if p_type = 'color' and me.color_left < 1 then raise exception 'Ya usaste tus botellas de color.'; end if;
  if p_type = 'far' and me.far_left < 1 then raise exception 'Ya usaste tu botella que llega lejos.'; end if;
  if p_type not in ('free','color','far') then raise exception 'Ese tipo de botella no existe.'; end if;
  if p_type = 'color' and p_topic is null and p_district is null then raise exception 'Elige a quién quieres que llegue tu botella de color.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  if (select count(*) from bottles where owner = me.id and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'Lanzaste muchas botellas seguidas. Espera un rato.';
  end if;
  insert into bottles(owner, kind, body, voice, voice_secs, voice_peaks, btype, target_topic, target_district)
    values (me.id, p_kind, nullif(trim(p_body), ''), p_voice, least(greatest(p_secs, 1), 60), p_peaks, p_type,
            case when p_type = 'color' then p_topic end, case when p_type = 'color' then p_district end) returning id into bid;
  update profiles set bottles = bottles - (p_type = 'free')::int, color_left = color_left - (p_type = 'color')::int, far_left = far_left - (p_type = 'far')::int
    where id = me.id returning * into me;
  n := deliver(bid, case when p_type = 'far' then 10 else 3 end);
  return query select bid, n, me.bottles, me.color_left, me.far_left;
end $$;
grant execute on function public.launch_bottle(text, text, text, int, jsonb, text, text, text) to authenticated;

-- Mi orilla: lo que me llegó. Nunca devuelve quién la lanzó.
drop function if exists public.shore();
create or replace function public.shore() returns table (
  id uuid, status text, arrived timestamptz, kind text, body text, voice text, voice_secs int, voice_peaks jsonb, place text, btype text
) language sql stable security definer set search_path = public as $$
  select d.id, d.status, d.created_at, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, p.district, b.btype
  from deliveries d join bottles b on b.id = d.bottle_id join profiles p on p.id = b.owner
  where d.to_id = auth.uid() and d.status in ('waiting','opened') and not b.hidden and not blocked(b.owner, auth.uid())
  order by d.created_at desc limit 20;
$$;
grant execute on function public.shore() to authenticated;

create or replace function public.open_delivery(p_id uuid) returns void language sql security definer set search_path = public as $$
  update deliveries set status = 'opened', opened_at = coalesce(opened_at, now()) where id = p_id and to_id = auth.uid() and status = 'waiting';
$$;
grant execute on function public.open_delivery(uuid) to authenticated;

create or replace function public.return_delivery(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare d deliveries;
begin
  update deliveries set status = 'returned' where id = p_id and to_id = auth.uid() and status in ('waiting','opened') returning * into d;
  if d.id is not null and (select count(*) from deliveries where bottle_id = d.bottle_id) < 15 then perform deliver(d.bottle_id, 1); end if;
end $$;
grant execute on function public.return_delivery(uuid) to authenticated;

-- Responder abre una conversación privada y, hasta 3 veces al día, regala una botella.
create or replace function public.answer_delivery(p_id uuid, p_voice text, p_secs int, p_peaks jsonb default null)
returns table (convo uuid, rewarded boolean, left_bottles int) language plpgsql security definer set search_path = public as $$
declare d deliveries; bo bottles; me profiles; cid uuid; rw boolean := false;
begin
  select * into d from deliveries where id = p_id and to_id = auth.uid() and status in ('waiting','opened') for update;
  if d.id is null then raise exception 'Esta botella ya no está en tu orilla.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> auth.uid()::text then raise exception 'Falta tu nota de voz.'; end if;
  select * into bo from bottles where id = d.bottle_id;
  if bo.hidden or blocked(bo.owner, auth.uid()) then raise exception 'Esta botella ya no está disponible.'; end if;
  insert into convos(bottle_id, a, b) values (bo.id, bo.owner, auth.uid()) returning id into cid;
  insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, body, created_at)
    values (cid, bo.owner, bo.voice, bo.voice_secs, bo.voice_peaks, '#bottle|' || bo.kind || '|' || coalesce(bo.body, ''), bo.created_at);
  insert into messages(convo_id, sender, voice, voice_secs, voice_peaks) values (cid, auth.uid(), p_voice, least(greatest(p_secs, 1), 120), p_peaks);
  update deliveries set status = 'answered', opened_at = coalesce(opened_at, now()) where id = d.id;
  select * into me from profiles where id = auth.uid() for update;
  if me.earned_day is distinct from lima_today() then me.earned := 0; end if;
  if me.earned < 3 then rw := true; me.earned := me.earned + 1; me.bottles := me.bottles + 1; end if;
  update profiles set earned = me.earned, earned_day = lima_today(), bottles = me.bottles where id = me.id;
  return query select cid, rw, me.bottles;
end $$;
grant execute on function public.answer_delivery(uuid, text, int, jsonb) to authenticated;

-- Mis botellas con su viaje: a cuántas orillas llegó, cuántos la abrieron y cuántos respondieron.
drop function if exists public.my_bottles();
create or replace function public.my_bottles() returns table (
  id uuid, kind text, body text, voice text, voice_secs int, voice_peaks jsonb, created_at timestamptz,
  shores int, opened int, answers int, waiting int, convo uuid, btype text, target text
) language sql stable security definer set search_path = public as $$
  select b.id, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, b.created_at,
    (select count(*) from deliveries d where d.bottle_id = b.id)::int,
    (select count(*) from deliveries d where d.bottle_id = b.id and d.opened_at is not null)::int,
    (select count(*) from convos c where c.bottle_id = b.id)::int,
    (select count(*) from deliveries d where d.bottle_id = b.id and d.status = 'waiting')::int,
    (select c.id from convos c where c.bottle_id = b.id order by c.created_at limit 1),
    b.btype, coalesce(b.target_topic, b.target_district)
  from bottles b where b.owner = auth.uid() order by b.created_at desc limit 50;
$$;
grant execute on function public.my_bottles() to authenticated;

-- Conversaciones: el otro es "Alguien de <distrito>" hasta que los dos revelan su nombre.
drop function if exists public.my_convos();
create or replace function public.my_convos() returns table (
  id uuid, alias text, place text, revealed boolean, my_reveal boolean, other_reveal boolean,
  my_key boolean, other_key boolean, closed boolean, last_at timestamptz, created_at timestamptz, i_launched boolean,
  intro_voice text, intro_secs int, last_mine boolean
) language sql stable security definer set search_path = public as $$
  select c.id,
    case when c.reveal_a and c.reveal_b then o.name else 'Alguien de ' || o.district end,
    o.district, c.reveal_a and c.reveal_b,
    case when c.a = auth.uid() then c.reveal_a else c.reveal_b end,
    case when c.a = auth.uid() then c.reveal_b else c.reveal_a end,
    case when c.a = auth.uid() then c.key_a else c.key_b end,
    case when c.a = auth.uid() then c.key_b else c.key_a end,
    c.closed or blocked(c.a, c.b), c.last_at, c.created_at, c.a = auth.uid(),
    case when c.reveal_a and c.reveal_b then o.intro_voice end,
    case when c.reveal_a and c.reveal_b then o.intro_secs end,
    coalesce((select m.sender = auth.uid() from messages m where m.convo_id = c.id order by m.created_at desc limit 1), false)
  from convos c join profiles o on o.id = case when c.a = auth.uid() then c.b else c.a end
  where auth.uid() in (c.a, c.b)
  order by c.last_at desc;
$$;
grant execute on function public.my_convos() to authenticated;

create or replace function public.set_reveal(p_convo uuid, p_on boolean) returns void language sql security definer set search_path = public as $$
  update convos set reveal_a = case when a = auth.uid() then p_on else reveal_a end,
                    reveal_b = case when b = auth.uid() then p_on else reveal_b end
  where id = p_convo and auth.uid() in (a, b);
$$;
grant execute on function public.set_reveal(uuid, boolean) to authenticated;

create or replace function public.set_key(p_convo uuid) returns boolean language sql security definer set search_path = public as $$
  update convos set key_a = case when a = auth.uid() then true else key_a end,
                    key_b = case when b = auth.uid() then true else key_b end
  where id = p_convo and auth.uid() in (a, b) and not closed
  returning key_a and key_b;
$$;
grant execute on function public.set_key(uuid) to authenticated;

create or replace function public.block_convo(p_convo uuid, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
declare c convos; other uuid;
begin
  select * into c from convos where id = p_convo and auth.uid() in (a, b);
  if c.id is null then return; end if;
  other := case when c.a = auth.uid() then c.b else c.a end;
  insert into blocks(a, b) values (auth.uid(), other) on conflict do nothing;
  update convos set closed = true where (a = auth.uid() and b = other) or (a = other and b = auth.uid());
  if p_reason is not null then
    insert into reports(reporter, target, convo_id, reason) values (auth.uid(), other, c.id, left(p_reason, 300));
  end if;
end $$;
grant execute on function public.block_convo(uuid, text) to authenticated;

-- Reportar una botella: sale de mi orilla y deja de viajar si junta 2 reportes.
create or replace function public.report_delivery(p_id uuid, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare d deliveries; bo bottles;
begin
  select * into d from deliveries where id = p_id and to_id = auth.uid();
  if d.id is null then return; end if;
  select * into bo from bottles where id = d.bottle_id;
  insert into reports(reporter, target, bottle_id, reason) values (auth.uid(), bo.owner, bo.id, left(coalesce(p_reason, 'Sin motivo'), 300));
  insert into blocks(a, b) values (auth.uid(), bo.owner) on conflict do nothing;
  update deliveries set status = 'returned' where id = d.id;
  if (select count(distinct reporter) from reports where bottle_id = bo.id) >= 2 then update bottles set hidden = true where id = bo.id; end if;
end $$;
grant execute on function public.report_delivery(uuid, text) to authenticated;

create or replace function public.delete_me() returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
grant execute on function public.delete_me() to authenticated;

-- Las funciones de servicio no se exponen.
revoke execute on function public.blocked(uuid, uuid) from anon;
revoke execute on function public.profile_defaults() from public, anon, authenticated;

-- ========== AVISOS EN VIVO ==========
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.deliveries; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.convos; exception when duplicate_object then null; end;
end $$;

-- ========== NOTAS DE VOZ ==========
insert into storage.buckets (id, name, public, file_size_limit) values ('voice', 'voice', false, 3145728)
  on conflict (id) do nothing;

-- Escuchas una nota si es tuya, si llegó a tu orilla o si está en una de tus conversaciones.
create or replace function public.can_hear(p_path text) returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_path, '/', 1) = auth.uid()::text
    or exists (select 1 from bottles b join deliveries d on d.bottle_id = b.id where b.voice = p_path and d.to_id = auth.uid() and not b.hidden)
    or exists (select 1 from messages m join convos c on c.id = m.convo_id where m.voice = p_path and auth.uid() in (c.a, c.b))
    or exists (select 1 from profiles o join convos c on o.id in (c.a, c.b) where o.intro_voice = p_path and auth.uid() in (c.a, c.b) and c.reveal_a and c.reveal_b);
$$;
grant execute on function public.can_hear(text) to authenticated;

drop policy if exists "subir mi voz" on storage.objects;
drop policy if exists "borrar mi voz" on storage.objects;
drop policy if exists "escuchar voz permitida" on storage.objects;
create policy "subir mi voz" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borrar mi voz" on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "escuchar voz permitida" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and public.can_hear(name));
