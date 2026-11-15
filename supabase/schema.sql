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
-- Del muelle (gratis en la beta): marea destacada, lacre, quién la abrió, vidrio y plan Capitán. Las personas de ejemplo llevan is_sample.
alter table public.profiles add column if not exists tide_left int not null default 1;
alter table public.profiles add column if not exists gifts_left int not null default 1;
alter table public.profiles add column if not exists who_open boolean not null default false;
alter table public.profiles add column if not exists glass text;
alter table public.profiles add column if not exists captain boolean not null default false;
alter table public.profiles add column if not exists is_sample boolean not null default false;
-- El cliente solo puede escribir estos campos al crear su perfil: los saldos los pone el servidor.
revoke insert on public.profiles from authenticated;
grant insert (id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, code_used) on public.profiles to authenticated;

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
  if new.is_sample then return new; end if; -- solo las crea este archivo (el cliente no puede escribir is_sample)
  if not exists (select 1 from codes where code = upper(trim(coalesce(new.code_used, ''))) and active and uses < max_uses) then
    raise exception 'Ese código de invitación no es válido.';
  end if;
  update codes set uses = uses + 1 where code = upper(trim(new.code_used));
  new.code_used := upper(trim(new.code_used));
  new.bottles := 3; new.color_left := 2; new.far_left := 1; new.tide_left := 1; new.gifts_left := 1; new.who_open := false; new.glass := null; new.captain := false; new.daily_day := lima_today(); new.earned_day := lima_today(); new.earned := 0; new.paused := false;
  new.created_at := now(); new.last_seen := now();
  return new;
end $$;
drop trigger if exists profile_defaults on public.profiles;
create trigger profile_defaults before insert on public.profiles for each row execute function public.profile_defaults();

-- Voces de las personas de ejemplo (respuesta y saludo de llamada). Solo las leen las funciones del servidor.
create table if not exists public.sample_voices (
  id uuid primary key references public.profiles(id) on delete cascade,
  key text unique not null,
  reply_voice text, reply_secs int, reply_peaks jsonb,
  call_voice text, call_secs int
);
alter table public.sample_voices enable row level security;
create table if not exists public.sample_clips (kind text not null, n int not null, voice text not null, secs int not null, peaks jsonb, primary key (kind, n));
alter table public.sample_clips enable row level security;

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
alter table public.bottles add column if not exists featured boolean not null default false; -- sale en la marea de las 21:00
alter table public.bottles add column if not exists glass text;
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
create policy "leer mis mensajes" on public.messages for select to authenticated using (public.in_convo(convo_id) and created_at <= now());
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
    where p.id <> bo.owner and not p.paused and not p.is_sample
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
    update profiles set daily_day = lima_today(),
      bottles = case when bottles >= (case when captain then 30 else 9 end) then bottles else least(bottles + (case when captain then 3 else 1 end), case when captain then 30 else 9 end) end,
      far_left = far_left + (captain and extract(isodow from lima_today()) = 1)::int
      where id = me.id returning * into me;
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
        and not blocked(b.owner, me.id) and not (select is_sample from profiles o where o.id = b.owner)
        and not exists (select 1 from deliveries d where d.bottle_id = b.id and d.to_id = me.id)
        and (select count(*) from deliveries d where d.bottle_id = b.id and d.status in ('waiting','opened')) < 3
        and (select count(*) from deliveries d where d.bottle_id = b.id) < 15
      order by b.created_at desc
      limit greatest(0, 3 - (select count(*) from deliveries d where d.to_id = me.id and d.status in ('waiting','opened')))
    loop
      insert into deliveries(bottle_id, to_id) values (r.id, me.id) on conflict do nothing;
    end loop;
    -- Mientras somos pocos, las botellas de ejemplo completan la orilla para que siempre haya algo que escuchar.
    for r in
      select b.id from bottles b join profiles o on o.id = b.owner
      where o.is_sample and not b.hidden and not blocked(b.owner, me.id)
        and not exists (select 1 from deliveries d where d.bottle_id = b.id and d.to_id = me.id)
        and not exists (select 1 from convos c where c.bottle_id = b.id and c.b = me.id)
      order by cardinality(array(select unnest(o.topics) intersect select unnest(me.topics))) desc, random()
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
drop function if exists public.launch_bottle(text, text, text, int, jsonb, text, text, text, boolean);
create or replace function public.launch_bottle(p_kind text, p_body text, p_voice text, p_secs int, p_peaks jsonb default null,
  p_type text default 'free', p_topic text default null, p_district text default null, p_featured boolean default false)
returns table (bottle uuid, shores int, left_bottles int, left_color int, left_far int, left_tide int) language plpgsql security definer set search_path = public as $$
declare me profiles; bid uuid; n int; s profiles; cid uuid; cl record;
begin
  select * into me from profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  p_type := coalesce(p_type, 'free'); p_featured := coalesce(p_featured, false);
  if p_type not in ('free','color','far') then raise exception 'Ese tipo de botella no existe.'; end if;
  if p_type = 'free' and me.bottles < 1 then raise exception 'Te quedaste sin botellas. Responde una o pide más en el muelle.'; end if;
  if p_type = 'color' and me.color_left < 1 then raise exception 'Ya usaste tus botellas de color. Pide más en el muelle.'; end if;
  if p_type = 'far' and me.far_left < 1 then raise exception 'Ya usaste tu botella que llega lejos. Pide otra en el muelle.'; end if;
  if p_featured and me.tide_left < 1 then raise exception 'Te quedaste sin marea destacada. Pide otra en el muelle.'; end if;
  if p_type = 'color' and p_topic is null and p_district is null then raise exception 'Elige a quién quieres que llegue tu botella de color.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  if (select count(*) from bottles where owner = me.id and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'Lanzaste muchas botellas seguidas. Espera un rato.';
  end if;
  insert into bottles(owner, kind, body, voice, voice_secs, voice_peaks, btype, target_topic, target_district, featured, glass)
    values (me.id, p_kind, nullif(trim(p_body), ''), p_voice, least(greatest(p_secs, 1), 60), p_peaks, p_type,
            case when p_type = 'color' then p_topic end, case when p_type = 'color' then p_district end, p_featured, me.glass) returning id into bid;
  update profiles set bottles = bottles - (p_type = 'free')::int, color_left = color_left - (p_type = 'color')::int, far_left = far_left - (p_type = 'far')::int,
    tide_left = tide_left - p_featured::int
    where id = me.id returning * into me;
  n := deliver(bid, case when p_type = 'far' then 10 else 3 end);
  -- Mientras somos pocos, una persona de ejemplo escucha tu botella y te responde en un minuto (máximo 3 al día).
  if n < 3 and (select count(*) from convos c join profiles o on o.id = c.b where c.a = me.id and o.is_sample and c.created_at > now() - interval '1 day') < 3 then
    select o.* into s from profiles o where o.is_sample and not blocked(o.id, me.id)
      and not exists (select 1 from convos c where c.a = me.id and c.b = o.id)
      order by cardinality(array(select unnest(o.topics) intersect select unnest(me.topics))) desc, random() limit 1;
    if s.id is null then
      select o.* into s from profiles o where o.is_sample and not blocked(o.id, me.id)
        and not exists (select 1 from convos c where c.bottle_id = bid and c.b = o.id) order by random() limit 1;
    end if;
    select * into cl from sample_clips where kind = 'answer' order by random() limit 1;
    if s.id is not null and cl.voice is not null then
      insert into deliveries(bottle_id, to_id, status, created_at, opened_at) values (bid, s.id, 'answered', now(), now() + interval '30 seconds');
      insert into convos(bottle_id, a, b) values (bid, me.id, s.id) returning id into cid;
      insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, body, created_at)
        values (cid, me.id, p_voice, least(greatest(p_secs, 1), 60), p_peaks, '#bottle|' || p_kind || '|' || coalesce(nullif(trim(p_body), ''), ''), now());
      insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, created_at) values (cid, s.id, cl.voice, cl.secs, cl.peaks, now() + interval '70 seconds');
      n := n + 1;
    end if;
  end if;
  return query select bid, n, me.bottles, me.color_left, me.far_left, me.tide_left;
end $$;
grant execute on function public.launch_bottle(text, text, text, int, jsonb, text, text, text, boolean) to authenticated;

-- Mi orilla: lo que me llegó. Nunca devuelve quién la lanzó.
drop function if exists public.shore();
create or replace function public.shore() returns table (
  id uuid, status text, arrived timestamptz, kind text, body text, voice text, voice_secs int, voice_peaks jsonb, place text, btype text,
  featured boolean, glass text, sample boolean
) language sql stable security definer set search_path = public as $$
  select d.id, d.status, d.created_at, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, p.district, b.btype, b.featured, b.glass, p.is_sample
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
  -- Si era una botella de ejemplo, su autora o autor te responde con su voz a los pocos segundos.
  insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, created_at)
    select cid, v.id, v.reply_voice, v.reply_secs, v.reply_peaks, now() + interval '25 seconds' from sample_voices v where v.id = bo.owner;
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
  shores int, opened int, answers int, waiting int, convo uuid, btype text, target text, featured boolean, openers jsonb
) language sql stable security definer set search_path = public as $$
  select b.id, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, b.created_at,
    (select count(*) from deliveries d where d.bottle_id = b.id)::int,
    (select count(*) from deliveries d where d.bottle_id = b.id and d.opened_at <= now())::int,
    (select count(*) from convos c where c.bottle_id = b.id and exists (select 1 from messages m where m.convo_id = c.id and m.sender = c.b and m.created_at <= now()))::int,
    (select count(*) from deliveries d where d.bottle_id = b.id and d.status = 'waiting')::int,
    (select c.id from convos c where c.bottle_id = b.id and exists (select 1 from messages m where m.convo_id = c.id and m.sender = c.b and m.created_at <= now()) order by c.created_at limit 1),
    b.btype, coalesce(b.target_topic, b.target_district), b.featured,
    -- "Quién la abrió" (del muelle): el distrito y la hora de cada persona que la abrió. Nunca el nombre.
    case when (select who_open from profiles where id = auth.uid()) then
      (select coalesce(jsonb_agg(jsonb_build_object('place', p.district, 'at', d.opened_at, 'answered', d.status = 'answered') order by d.opened_at desc), '[]'::jsonb)
       from deliveries d join profiles p on p.id = d.to_id where d.bottle_id = b.id and d.opened_at <= now()) end
  from bottles b where b.owner = auth.uid() order by b.created_at desc limit 50;
$$;
grant execute on function public.my_bottles() to authenticated;

-- Conversaciones: el otro es "Alguien de <distrito>" hasta que los dos revelan su nombre.
drop function if exists public.my_convos();
create or replace function public.my_convos() returns table (
  id uuid, alias text, place text, revealed boolean, my_reveal boolean, other_reveal boolean,
  my_key boolean, other_key boolean, closed boolean, last_at timestamptz, created_at timestamptz, i_launched boolean,
  intro_voice text, intro_secs int, last_mine boolean, sample boolean, next_at timestamptz, call_voice text, call_secs int
) language sql stable security definer set search_path = public as $$
  select c.id,
    case when c.reveal_a and c.reveal_b then o.name else 'Alguien de ' || o.district end,
    o.district, c.reveal_a and c.reveal_b,
    case when c.a = auth.uid() then c.reveal_a else c.reveal_b end,
    case when c.a = auth.uid() then c.reveal_b else c.reveal_a end,
    case when c.a = auth.uid() then c.key_a else c.key_b end,
    case when c.a = auth.uid() then c.key_b else c.key_a end,
    c.closed or blocked(c.a, c.b),
    coalesce((select max(m.created_at) from messages m where m.convo_id = c.id and m.created_at <= now()), c.created_at),
    c.created_at, c.a = auth.uid(),
    case when c.reveal_a and c.reveal_b then o.intro_voice end,
    case when c.reveal_a and c.reveal_b then o.intro_secs end,
    coalesce((select m.sender = auth.uid() from messages m where m.convo_id = c.id and m.created_at <= now() order by m.created_at desc limit 1), false),
    o.is_sample,
    (select min(m.created_at) from messages m where m.convo_id = c.id and m.created_at > now()),
    v.call_voice, v.call_secs
  from convos c join profiles o on o.id = case when c.a = auth.uid() then c.b else c.a end
  left join sample_voices v on v.id = o.id
  where auth.uid() in (c.a, c.b)
    -- una botella mía aparece como conversación cuando la otra persona ya respondió
    and (c.b = auth.uid() or exists (select 1 from messages m where m.convo_id = c.id and m.sender = c.b and m.created_at <= now()))
  order by 10 desc;
$$;
grant execute on function public.my_convos() to authenticated;

-- Con una persona de ejemplo, ella acepta al instante: así se puede probar todo el recorrido.
create or replace function public.set_reveal(p_convo uuid, p_on boolean) returns void language sql security definer set search_path = public as $$
  update convos c set reveal_a = case when a = auth.uid() then p_on when p_on and (select is_sample from profiles where id = c.a) then true else reveal_a end,
                    reveal_b = case when b = auth.uid() then p_on when p_on and (select is_sample from profiles where id = c.b) then true else reveal_b end
  where id = p_convo and auth.uid() in (a, b);
$$;
grant execute on function public.set_reveal(uuid, boolean) to authenticated;

create or replace function public.set_key(p_convo uuid) returns boolean language sql security definer set search_path = public as $$
  update convos c set key_a = case when a = auth.uid() or (select is_sample from profiles where id = c.a) then true else key_a end,
                    key_b = case when b = auth.uid() or (select is_sample from profiles where id = c.b) then true else key_b end
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

-- ========== MUELLE (gratis en la beta: nada se cobra) ==========
drop function if exists public.beta_get(text);
create or replace function public.beta_get(p_item text) returns profiles language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  select * into me from profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  if (select count(*) from beta_claims where who = me.id and created_at > now() - interval '1 day') >= 60 then
    raise exception 'Ya pediste mucho del muelle hoy. Vuelve mañana.';
  end if;
  case
    when p_item = 'color' then update profiles set color_left = least(color_left + 1, 20) where id = me.id returning * into me;
    when p_item = 'far' then update profiles set far_left = least(far_left + 1, 10) where id = me.id returning * into me;
    when p_item = 'tide' then update profiles set tide_left = least(tide_left + 1, 10) where id = me.id returning * into me;
    when p_item = 'gift' then update profiles set gifts_left = least(gifts_left + 1, 10) where id = me.id returning * into me;
    when p_item = 'who' then update profiles set who_open = true where id = me.id returning * into me;
    when p_item = 'p3' then update profiles set bottles = least(bottles + 3, 60) where id = me.id returning * into me;
    when p_item = 'p10' then update profiles set bottles = least(bottles + 10, 60) where id = me.id returning * into me;
    when p_item = 'p30' then update profiles set bottles = least(bottles + 30, 60) where id = me.id returning * into me;
    when p_item = 'captain' then update profiles set captain = true, who_open = true, bottles = greatest(bottles, 3), color_left = greatest(color_left, 3), far_left = greatest(far_left, 1), tide_left = greatest(tide_left, 1) where id = me.id returning * into me;
    when p_item = 'nocaptain' then update profiles set captain = false where id = me.id returning * into me;
    when p_item in ('glass:verde', 'glass:ambar', 'glass:esmerilado', 'glass:none') then
      update profiles set glass = nullif(split_part(p_item, ':', 2), 'none') where id = me.id returning * into me;
    else raise exception 'Eso no está en el muelle.';
  end case;
  insert into beta_claims(who, item) values (me.id, p_item);
  return me;
end $$;
grant execute on function public.beta_get(text) to authenticated;

-- ========== LA MAREA DE LAS 21:00 ==========
-- Botellas destacadas de las últimas 48 horas (y las de ejemplo). Abrir una la trae a tu orilla.
drop function if exists public.marea();
create or replace function public.marea() returns table (
  bottle uuid, kind text, body text, voice text, voice_secs int, voice_peaks jsonb, place text, glass text, sample boolean, created_at timestamptz, mine boolean, taken text
) language sql stable security definer set search_path = public as $$
  select b.id, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, p.district, b.glass, p.is_sample, b.created_at, b.owner = auth.uid(),
    (select d.status from deliveries d where d.bottle_id = b.id and d.to_id = auth.uid())
  from bottles b join profiles p on p.id = b.owner
  where b.featured and not b.hidden and not blocked(b.owner, auth.uid()) and (p.is_sample or b.created_at > now() - interval '48 hours')
  order by p.is_sample, b.created_at desc limit 12;
$$;
grant execute on function public.marea() to authenticated;

create or replace function public.marea_take(p_bottle uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare bo bottles; did uuid;
begin
  select * into bo from bottles where id = p_bottle and featured and not hidden;
  if bo.id is null or bo.owner = auth.uid() or blocked(bo.owner, auth.uid()) then raise exception 'Esta botella ya no está en la marea.'; end if;
  if exists (select 1 from convos c where c.bottle_id = bo.id and c.b = auth.uid()) then raise exception 'Ya respondiste esta botella.'; end if;
  insert into deliveries(bottle_id, to_id) values (bo.id, auth.uid()) on conflict (bottle_id, to_id) do update set status = 'opened' returning id into did;
  return did;
end $$;
grant execute on function public.marea_take(uuid) to authenticated;

-- ========== REGALOS Y PLANES EN LA CONVERSACIÓN ==========
create or replace function public.convo_other(p_convo uuid) returns uuid language sql stable security definer set search_path = public as $$
  select case when a = auth.uid() then b else a end from convos where id = p_convo and auth.uid() in (a, b) and not closed and not blocked(a, b);
$$;

-- Botella con lacre: queda dorada en la conversación y le regala una botella normal a la otra persona.
create or replace function public.send_gift(p_convo uuid) returns int language plpgsql security definer set search_path = public as $$
declare other uuid := convo_other(p_convo); me profiles;
begin
  if other is null then raise exception 'Esta conversación ya terminó.'; end if;
  select * into me from profiles where id = auth.uid() for update;
  if me.gifts_left < 1 then raise exception 'Te quedaste sin botellas con lacre. Pide otra en el muelle.'; end if;
  update profiles set gifts_left = gifts_left - 1 where id = me.id returning * into me;
  update profiles set bottles = least(bottles + 1, 60) where id = other and not is_sample;
  insert into messages(convo_id, sender, body) values (p_convo, me.id, '#gift|');
  return me.gifts_left;
end $$;
grant execute on function public.send_gift(uuid) to authenticated;

-- Armar un plan: lugar y día. Siempre lugares públicos.
create or replace function public.send_plan(p_convo uuid, p_place text, p_when text) returns void language plpgsql security definer set search_path = public as $$
declare other uuid := convo_other(p_convo); cl record;
begin
  if other is null then raise exception 'Esta conversación ya terminó.'; end if;
  if coalesce(trim(p_place), '') = '' or coalesce(trim(p_when), '') = '' then raise exception 'Elige un lugar y un día.'; end if;
  if (select count(*) from messages where convo_id = p_convo and sender = auth.uid() and body like '#plan|%' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Ya propusiste varios planes. Espera su respuesta.';
  end if;
  insert into messages(convo_id, sender, body) values (p_convo, auth.uid(), '#plan|' || left(replace(trim(p_place), '|', ' '), 80) || '|' || left(replace(trim(p_when), '|', ' '), 60));
  if (select is_sample from profiles where id = other) then
    select * into cl from sample_clips where kind = 'planok' order by random() limit 1;
    insert into messages(convo_id, sender, body, created_at) values (p_convo, other, '#planok|', now() + interval '12 seconds');
    if cl.voice is not null then insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, created_at) values (p_convo, other, cl.voice, cl.secs, cl.peaks, now() + interval '14 seconds'); end if;
  end if;
end $$;
grant execute on function public.send_plan(uuid, text, text) to authenticated;

create or replace function public.accept_plan(p_convo uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if convo_other(p_convo) is null then raise exception 'Esta conversación ya terminó.'; end if;
  insert into messages(convo_id, sender, body) values (p_convo, auth.uid(), '#planok|');
end $$;
grant execute on function public.accept_plan(uuid) to authenticated;

-- ========== SALIDAS EN GRUPO ==========
create table if not exists public.outings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 60),
  place text not null check (char_length(place) between 3 and 80),
  starts_at timestamptz not null,
  cap int not null default 8 check (cap between 3 and 12),
  descr text check (char_length(descr) <= 200),
  boosted boolean not null default false,
  weekly boolean not null default false, -- las de ejemplo se repiten cada semana
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.outings enable row level security;
create table if not exists public.outing_members (
  outing uuid not null references public.outings(id) on delete cascade,
  member uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (outing, member)
);
alter table public.outing_members enable row level security;
create table if not exists public.beta_claims (id bigserial primary key, who uuid not null references public.profiles(id) on delete cascade, item text not null, created_at timestamptz not null default now());
alter table public.beta_claims enable row level security;

drop function if exists public.outings_list();
create or replace function public.outings_list() returns table (
  id uuid, name text, place text, starts_at timestamptz, cap int, taken int, descr text, host text, host_place text, mine boolean, joined boolean, boosted boolean, sample boolean
) language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.place,
    case when o.weekly and o.starts_at < now() then o.starts_at + ceil(extract(epoch from now() - o.starts_at) / 604800) * interval '7 days' else o.starts_at end,
    o.cap,
    (1 + (select count(*) from outing_members m where m.outing = o.id) + case when p.is_sample then (abs(hashtext(o.id::text)) % 3) + 1 else 0 end)::int,
    o.descr, p.name, p.district, o.owner = auth.uid(),
    exists (select 1 from outing_members m where m.outing = o.id and m.member = auth.uid()), o.boosted, p.is_sample
  from outings o join profiles p on p.id = o.owner
  where not o.cancelled and (o.weekly or o.starts_at > now() - interval '3 hours') and not blocked(o.owner, auth.uid())
  order by o.boosted desc, 4 asc limit 40;
$$;
grant execute on function public.outings_list() to authenticated;

create or replace function public.outing_create(p_name text, p_place text, p_at timestamptz, p_cap int, p_descr text) returns uuid language plpgsql security definer set search_path = public as $$
declare me profiles; oid uuid;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  if p_at is null or p_at < now() + interval '30 minutes' or p_at > now() + interval '60 days' then raise exception 'Elige una fecha entre hoy y los próximos dos meses.'; end if;
  if (select count(*) from outings where owner = me.id and not cancelled and starts_at > now()) >= (case when me.captain then 3 else 1 end) then
    raise exception 'Ya tienes una salida activa. Cuando pase, puedes proponer otra.';
  end if;
  insert into outings(owner, name, place, starts_at, cap, descr) values (me.id, trim(p_name), trim(p_place), p_at, least(greatest(coalesce(p_cap, 8), 3), case when me.captain then 12 else 8 end), nullif(trim(p_descr), '')) returning id into oid;
  return oid;
end $$;
grant execute on function public.outing_create(text, text, timestamptz, int, text) to authenticated;

create or replace function public.outing_join(p_id uuid, p_on boolean) returns void language plpgsql security definer set search_path = public as $$
declare o record;
begin
  select * into o from outings_list() l where l.id = p_id;
  if o.id is null then raise exception 'Esta salida ya no está disponible.'; end if;
  if o.mine then raise exception 'Es tu salida: ya estás.'; end if;
  if p_on then
    if o.taken >= o.cap and not o.joined then raise exception 'Esta salida ya está llena.'; end if;
    insert into outing_members(outing, member) values (p_id, auth.uid()) on conflict do nothing;
  else delete from outing_members where outing = p_id and member = auth.uid(); end if;
end $$;
grant execute on function public.outing_join(uuid, boolean) to authenticated;

create or replace function public.outing_cancel(p_id uuid) returns void language sql security definer set search_path = public as $$
  update outings set cancelled = true where id = p_id and owner = auth.uid();
$$;
grant execute on function public.outing_cancel(uuid) to authenticated;

create or replace function public.outing_boost(p_id uuid) returns void language sql security definer set search_path = public as $$
  update outings set boosted = true where id = p_id and owner = auth.uid();
$$;
grant execute on function public.outing_boost(uuid) to authenticated;

-- La app pregunta esto al abrir: si el servidor quedó desactualizado, lo dice en vez de fallar en silencio.
create or replace function public.app_version() returns int language sql immutable as $$ select 3 $$;
grant execute on function public.app_version() to anon, authenticated;

-- Las funciones de servicio no se exponen.
revoke execute on function public.blocked(uuid, uuid) from anon;
revoke execute on function public.profile_defaults() from public, anon, authenticated;
revoke execute on function public.convo_other(uuid) from public, anon, authenticated;

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

-- ========== PERSONAS DE EJEMPLO ==========
-- 12 voces sintéticas para que las primeras personas tengan con quién probar. Se ven marcadas como "de ejemplo".
-- Para apagarlas: update public.bottles set hidden = true where owner in (select id from public.profiles where is_sample);
-- (Generado por seed/src/make_sql.py)
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'majo.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000001', 'Majo', 'Barranco', '{"Música","La ciudad","Arte","Viajes"}', '{}', 'seed/majo-intro.mp3', 6, '[0.88, 0.77, 0.62, 0.55, 0.57, 0.53, 0.46, 0.57, 0.26, 0.12, 0.78, 0.36, 0.85, 0.52, 0.3, 1.0, 0.46, 0.45, 0.68, 0.6, 0.77, 0.38, 0.47, 0.79, 0.73, 0.34, 0.28, 0.36]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000001', '5a5a0000-0000-4000-8000-000000000001', 'Pregunta', '¿Qué harías un domingo si nadie en esta ciudad te conociera?', 'seed/majo-say.mp3', 14, '[1.0, 0.48, 0.77, 0.57, 0.82, 0.74, 0.67, 0.41, 0.35, 0.91, 0.76, 0.58, 0.92, 0.51, 0.68, 0.28, 0.88, 0.57, 0.71, 0.74, 0.53, 0.33, 0.89, 0.5, 0.38, 0.86, 1.0, 0.48]'::jsonb, true, now() - interval '3 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000001', 'majo', 'seed/majo-reply.mp3', 12, '[0.58, 0.71, 0.41, 0.62, 0.58, 0.99, 0.6, 0.61, 0.59, 0.65, 0.71, 0.73, 0.58, 0.84, 0.56, 0.4, 0.43, 0.37, 0.37, 0.85, 0.36, 0.79, 0.56, 0.29, 1.0, 0.7, 0.52, 0.13]'::jsonb, 'seed/majo-call.mp3', 8) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'leo.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000002', 'Leo', 'Lince', '{"Cine","Libros","La ciudad","Trabajo"}', '{}', 'seed/leo-intro.mp3', 6, '[0.12, 0.72, 0.7, 0.34, 0.57, 0.26, 0.18, 0.53, 0.75, 0.58, 0.34, 0.26, 0.45, 1.0, 0.55, 0.47, 0.36, 0.41, 0.58, 0.42, 0.58, 0.42, 0.25, 0.46, 0.25, 0.15, 0.12, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000002', '5a5a0000-0000-4000-8000-000000000002', 'Confesión', 'Me mudé a Lima hace tres meses y todavía no tengo con quién ir al cine.', 'seed/leo-say.mp3', 13, '[0.67, 0.42, 0.32, 0.41, 1.0, 0.48, 0.49, 0.29, 0.59, 0.6, 0.53, 0.39, 0.4, 0.16, 0.6, 0.49, 0.4, 0.39, 0.44, 0.41, 0.67, 0.55, 0.61, 0.52, 0.4, 0.3, 0.42, 0.18]'::jsonb, false, now() - interval '6 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000002', 'leo', 'seed/leo-reply.mp3', 9, '[0.77, 1.0, 0.44, 0.52, 0.52, 0.6, 0.32, 0.28, 0.79, 0.72, 0.29, 0.15, 0.91, 0.62, 0.48, 0.87, 0.74, 0.51, 0.67, 0.64, 0.56, 0.44, 0.38, 0.4, 0.48, 0.37, 0.32, 0.12]'::jsonb, 'seed/leo-call.mp3', 8) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rocio.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000003', 'Rocío', 'Jesús María', '{"Comida","La ciudad","Amor","Música"}', '{}', 'seed/rocio-intro.mp3', 6, '[0.69, 1.0, 0.4, 0.64, 0.63, 0.82, 0.53, 0.68, 0.51, 0.64, 0.68, 0.24, 0.67, 0.63, 0.68, 0.55, 0.62, 0.9, 0.48, 0.58, 0.56, 0.69, 0.62, 0.57, 0.53, 0.96, 0.64, 0.43]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000003', '5a5a0000-0000-4000-8000-000000000003', 'Historia', 'Lo más raro que me pasó en una combi.', 'seed/rocio-say.mp3', 15, '[0.64, 0.72, 0.92, 0.62, 0.74, 0.42, 0.74, 0.72, 0.95, 0.51, 0.6, 0.86, 0.52, 0.65, 0.73, 0.75, 0.7, 0.57, 0.73, 0.79, 0.82, 0.84, 1.0, 0.54, 0.91, 0.79, 0.61, 0.62]'::jsonb, false, now() - interval '9 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000003', 'rocio', 'seed/rocio-reply.mp3', 8, '[0.74, 0.56, 0.73, 0.63, 0.74, 0.87, 0.61, 0.91, 0.66, 0.58, 1.0, 0.56, 0.66, 0.81, 0.8, 0.5, 0.63, 0.59, 0.56, 0.79, 0.73, 0.92, 0.77, 0.71, 0.59, 0.51, 0.8, 0.65]'::jsonb, 'seed/rocio-call.mp3', 7) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'ivan.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000004', 'Iván', 'Surco', '{"Música","Fútbol","Tecnología","Viajes"}', '{}', 'seed/ivan-intro.mp3', 6, '[0.69, 0.8, 0.68, 1.0, 0.71, 0.69, 0.86, 0.89, 0.72, 0.67, 0.54, 0.67, 0.39, 0.97, 0.75, 0.88, 0.79, 0.59, 0.18, 0.25, 0.57, 0.44, 0.98, 0.82, 0.79, 0.41, 0.86, 0.42]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000004', '5a5a0000-0000-4000-8000-000000000004', 'Pregunta', '¿Qué canción te devuelve a tus 15 años?', 'seed/ivan-say.mp3', 14, '[0.82, 0.91, 0.74, 0.68, 0.67, 0.86, 0.81, 1.0, 0.89, 0.71, 0.58, 0.86, 0.65, 0.91, 0.62, 0.63, 0.74, 0.73, 0.89, 0.71, 0.73, 0.74, 0.79, 0.69, 0.87, 0.8, 0.69, 0.74]'::jsonb, false, now() - interval '12 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000004', 'ivan', 'seed/ivan-reply.mp3', 10, '[0.97, 0.85, 1.0, 0.8, 0.8, 0.63, 0.72, 0.69, 0.65, 0.57, 0.92, 0.63, 0.84, 0.83, 0.41, 0.89, 0.79, 0.65, 0.71, 0.8, 0.84, 0.75, 0.76, 0.76, 0.65, 0.64, 0.69, 0.71]'::jsonb, 'seed/ivan-call.mp3', 8) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'vale.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000005', 'Vale', 'Miraflores', '{"Música","Amor","Viajes","Arte"}', '{}', 'seed/vale-intro.mp3', 6, '[0.52, 0.24, 0.69, 0.73, 0.53, 0.46, 0.41, 0.52, 0.4, 0.24, 1.0, 0.65, 0.37, 0.59, 0.51, 0.41, 0.13, 0.75, 0.47, 0.73, 0.82, 0.65, 0.63, 0.74, 0.47, 0.44, 0.4, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000005', '5a5a0000-0000-4000-8000-000000000005', 'Confesión', 'Nunca he ido sola a un concierto y quiero intentarlo.', 'seed/vale-say.mp3', 9, '[0.42, 0.56, 0.61, 0.78, 0.59, 0.56, 0.45, 0.63, 0.72, 0.71, 1.0, 0.49, 0.55, 0.8, 0.51, 0.5, 0.78, 0.74, 0.71, 0.68, 0.63, 0.52, 0.49, 0.6, 0.47, 0.24, 0.81, 0.43]'::jsonb, false, now() - interval '15 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000005', 'vale', 'seed/vale-reply.mp3', 7, '[0.61, 0.66, 0.91, 0.66, 0.41, 0.32, 0.52, 0.34, 0.56, 1.0, 0.69, 0.74, 0.67, 0.51, 0.12, 0.71, 0.53, 0.59, 0.75, 0.56, 0.67, 0.75, 0.68, 0.75, 0.3, 0.53, 0.4, 0.19]'::jsonb, 'seed/vale-call.mp3', 5) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'nico.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000006', 'Nico', 'San Miguel', '{"Comida","La ciudad","Fútbol","Trabajo"}', '{}', 'seed/nico-intro.mp3', 5, '[0.44, 0.87, 0.56, 0.97, 0.77, 0.63, 0.46, 0.37, 0.55, 0.46, 0.33, 0.22, 0.12, 0.12, 0.49, 0.65, 0.56, 0.45, 1.0, 0.7, 0.26, 0.84, 0.4, 0.49, 0.35, 0.42, 0.12, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000006', '5a5a0000-0000-4000-8000-000000000006', 'Pregunta', '¿Cuál es tu huarique favorito y por qué nadie lo conoce?', 'seed/nico-say.mp3', 14, '[0.56, 0.71, 0.7, 0.82, 0.59, 0.57, 0.83, 1.0, 0.4, 0.54, 0.67, 0.65, 0.77, 0.64, 1.0, 0.74, 0.53, 0.77, 0.98, 0.63, 0.78, 0.39, 0.59, 0.42, 0.65, 0.77, 0.63, 0.49]'::jsonb, false, now() - interval '18 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000006', 'nico', 'seed/nico-reply.mp3', 8, '[0.62, 0.82, 0.46, 0.57, 0.31, 0.24, 0.56, 0.57, 0.8, 0.45, 0.7, 0.59, 0.83, 0.31, 0.48, 0.42, 0.39, 0.31, 0.22, 0.51, 1.0, 0.76, 0.77, 0.58, 0.38, 0.6, 0.57, 0.12]'::jsonb, 'seed/nico-call.mp3', 5) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'belen.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000007', 'Belén', 'Pueblo Libre', '{"Libros","Filosofía","La ciudad","Arte"}', '{}', 'seed/belen-intro.mp3', 6, '[0.63, 0.92, 0.51, 0.56, 0.71, 0.72, 0.26, 0.66, 0.83, 0.64, 0.59, 0.52, 0.57, 1.0, 0.94, 0.52, 0.57, 0.5, 0.39, 0.7, 0.62, 0.79, 0.44, 0.47, 0.62, 0.5, 0.52, 0.16]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000007', '5a5a0000-0000-4000-8000-000000000007', 'Historia', 'El día que me perdí en el Centro y terminó siendo lo mejor.', 'seed/belen-say.mp3', 17, '[0.62, 0.6, 0.83, 0.63, 0.52, 0.56, 0.56, 0.58, 0.7, 0.64, 0.59, 0.57, 0.71, 0.7, 0.48, 0.74, 0.55, 0.67, 0.58, 0.52, 0.71, 0.62, 0.66, 0.82, 0.73, 0.62, 0.61, 1.0]'::jsonb, false, now() - interval '21 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000007', 'belen', 'seed/belen-reply.mp3', 8, '[0.67, 0.48, 0.54, 0.65, 0.4, 0.61, 0.49, 0.59, 0.58, 0.66, 0.48, 0.8, 0.74, 0.48, 0.93, 0.8, 0.64, 0.73, 0.62, 0.32, 0.82, 0.91, 0.73, 0.55, 1.0, 0.59, 0.62, 0.45]'::jsonb, 'seed/belen-call.mp3', 6) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'ale.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000008', 'Ale', 'Chorrillos', '{"Filosofía","Amor","Libros","Viajes"}', '{}', 'seed/ale-intro.mp3', 6, '[0.79, 0.57, 0.55, 0.61, 0.48, 0.26, 0.38, 0.29, 0.12, 0.61, 0.42, 1.0, 0.4, 0.52, 0.46, 0.35, 0.31, 0.5, 0.4, 0.35, 0.91, 0.63, 0.72, 0.37, 0.43, 0.4, 0.28, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000008', '5a5a0000-0000-4000-8000-000000000008', 'Pregunta', '¿Qué le dirías a tu yo de hace diez años?', 'seed/ale-say.mp3', 12, '[0.51, 0.56, 0.56, 0.6, 0.63, 0.67, 0.45, 0.41, 0.12, 0.78, 0.61, 0.65, 0.59, 0.66, 0.55, 0.53, 0.48, 0.46, 0.73, 0.79, 0.44, 0.3, 0.67, 1.0, 0.53, 0.51, 0.34, 0.23]'::jsonb, false, now() - interval '24 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000008', 'ale', 'seed/ale-reply.mp3', 8, '[0.7, 0.47, 0.43, 0.44, 0.62, 0.44, 0.47, 0.51, 0.47, 0.18, 0.12, 0.84, 0.39, 0.37, 0.31, 0.34, 0.45, 0.2, 1.0, 0.56, 0.45, 0.46, 0.68, 0.46, 0.35, 0.38, 0.44, 0.15]'::jsonb, 'seed/ale-call.mp3', 5) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'diego.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000009', 'Diego', 'San Borja', '{"Tecnología","Trabajo","Cine","Música"}', '{}', 'seed/diego-intro.mp3', 6, '[0.61, 0.73, 0.52, 0.67, 0.46, 0.41, 0.37, 0.31, 0.12, 0.12, 0.72, 1.0, 0.6, 0.41, 0.56, 0.39, 0.41, 0.42, 0.53, 0.61, 0.4, 0.36, 0.55, 0.47, 0.36, 0.23, 0.12, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000009', '5a5a0000-0000-4000-8000-000000000009', 'Confesión', 'Trabajo desde casa y a veces paso días sin hablar con nadie.', 'seed/diego-say.mp3', 12, '[1.0, 0.87, 0.93, 0.83, 0.7, 0.85, 0.7, 0.58, 0.68, 0.7, 0.63, 0.52, 0.25, 0.92, 0.64, 0.64, 0.57, 0.36, 0.26, 0.77, 0.73, 0.7, 0.61, 0.42, 0.89, 0.84, 0.57, 0.36]'::jsonb, false, now() - interval '27 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000009', 'diego', 'seed/diego-reply.mp3', 7, '[0.75, 0.79, 0.66, 0.72, 0.77, 0.63, 0.57, 0.41, 0.4, 0.12, 0.83, 1.0, 0.74, 0.79, 0.51, 0.74, 0.52, 0.42, 0.45, 0.4, 0.26, 0.12, 0.72, 1.0, 0.53, 0.63, 0.56, 0.12]'::jsonb, 'seed/diego-call.mp3', 4) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'caro.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000010', 'Caro', 'Magdalena', '{"Viajes","La ciudad","Arte","Comida"}', '{}', 'seed/caro-intro.mp3', 6, '[0.84, 1.0, 0.43, 0.65, 0.95, 0.75, 0.79, 0.67, 0.8, 0.77, 0.23, 0.7, 0.84, 0.77, 0.69, 0.12, 0.88, 0.67, 0.91, 0.79, 0.63, 0.69, 0.74, 0.59, 0.79, 0.66, 0.76, 0.58]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000010', '5a5a0000-0000-4000-8000-000000000010', 'Pregunta', '¿Cuál es el mejor atardecer que has visto en Lima?', 'seed/caro-say.mp3', 13, '[0.71, 0.79, 0.58, 0.79, 0.67, 0.66, 0.88, 0.59, 0.59, 0.9, 0.84, 0.64, 0.86, 0.74, 0.69, 1.0, 0.63, 0.8, 1.0, 0.69, 0.87, 0.91, 0.74, 0.74, 0.81, 0.89, 0.59, 0.7]'::jsonb, true, now() - interval '30 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000010', 'caro', 'seed/caro-reply.mp3', 7, '[0.7, 0.69, 0.54, 0.74, 0.71, 0.59, 0.71, 0.49, 0.69, 1.0, 0.7, 0.44, 0.52, 0.8, 0.57, 0.71, 0.71, 0.53, 0.58, 0.49, 0.86, 0.47, 0.48, 0.69, 0.53, 0.73, 0.53, 0.28]'::jsonb, 'seed/caro-call.mp3', 5) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'sebas.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000011', 'Sebas', 'La Molina', '{"Fútbol","La ciudad","Tecnología","Comida"}', '{}', 'seed/sebas-intro.mp3', 6, '[0.57, 0.76, 0.17, 0.89, 0.68, 0.74, 0.49, 0.73, 0.61, 0.51, 0.45, 0.87, 1.0, 0.52, 0.65, 0.68, 0.75, 0.5, 0.79, 0.45, 0.54, 0.86, 0.69, 0.68, 0.88, 0.61, 0.69, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000011', '5a5a0000-0000-4000-8000-000000000011', 'Historia', 'La vez que me quedé dormido en el Metropolitano.', 'seed/sebas-say.mp3', 14, '[0.72, 0.58, 0.7, 0.74, 0.63, 0.61, 0.61, 0.7, 0.79, 0.54, 0.77, 0.63, 0.86, 0.68, 0.77, 1.0, 0.88, 0.68, 0.65, 0.64, 0.88, 0.64, 0.88, 0.78, 0.8, 0.6, 0.63, 0.45]'::jsonb, false, now() - interval '33 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000011', 'sebas', 'seed/sebas-reply.mp3', 7, '[0.77, 0.72, 0.71, 0.67, 0.85, 0.85, 0.7, 0.77, 0.9, 0.62, 0.69, 0.96, 0.63, 0.83, 0.76, 0.95, 0.65, 0.73, 0.74, 0.74, 0.19, 0.93, 0.79, 0.82, 1.0, 0.54, 0.9, 0.33]'::jsonb, 'seed/sebas-call.mp3', 4) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('00000000-0000-0000-0000-000000000000', '5a5a0000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'andrea.ejemplo@botella.invalid', '', now(), '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles(id, name, district, topics, seeks, intro_voice, intro_secs, intro_peaks, is_sample, code_used, bottles) values ('5a5a0000-0000-4000-8000-000000000012', 'Andrea', 'San Isidro', '{"Trabajo","Libros","Filosofía","Arte"}', '{}', 'seed/andrea-intro.mp3', 6, '[0.68, 0.69, 0.68, 0.46, 0.78, 0.56, 0.52, 0.48, 0.32, 0.19, 0.12, 0.58, 0.79, 0.93, 0.8, 0.71, 0.29, 0.55, 1.0, 0.6, 0.32, 0.68, 0.4, 0.36, 0.61, 0.47, 0.18, 0.12]'::jsonb, true, 'EJEMPLO', 0) on conflict (id) do update set name = excluded.name, district = excluded.district, topics = excluded.topics, intro_voice = excluded.intro_voice, intro_secs = excluded.intro_secs, intro_peaks = excluded.intro_peaks, is_sample = true;
insert into public.bottles(id, owner, kind, body, voice, voice_secs, voice_peaks, featured, created_at) values ('5a5ab000-0000-4000-8000-000000000012', '5a5a0000-0000-4000-8000-000000000012', 'Pregunta', 'Si pudieras aprender algo nuevo este año, ¿qué sería?', 'seed/andrea-say.mp3', 10, '[0.84, 0.46, 0.74, 0.5, 0.12, 0.34, 0.67, 0.56, 0.58, 0.47, 0.42, 0.51, 0.35, 0.23, 0.69, 1.0, 0.67, 0.52, 0.44, 0.42, 0.52, 0.25, 0.5, 0.39, 0.33, 0.12, 0.43, 0.52]'::jsonb, false, now() - interval '36 hours') on conflict (id) do update set kind = excluded.kind, body = excluded.body, voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, featured = excluded.featured;
insert into public.sample_voices(id, key, reply_voice, reply_secs, reply_peaks, call_voice, call_secs) values ('5a5a0000-0000-4000-8000-000000000012', 'andrea', 'seed/andrea-reply.mp3', 7, '[0.27, 0.54, 1.0, 0.41, 0.34, 0.43, 0.2, 0.12, 0.57, 0.57, 0.44, 0.5, 0.39, 0.33, 0.49, 0.24, 0.25, 0.12, 0.69, 0.64, 0.47, 0.46, 0.46, 0.78, 0.41, 0.3, 0.33, 0.12]'::jsonb, 'seed/andrea-call.mp3', 5) on conflict (id) do update set reply_voice = excluded.reply_voice, reply_secs = excluded.reply_secs, reply_peaks = excluded.reply_peaks, call_voice = excluded.call_voice, call_secs = excluded.call_secs;
insert into public.sample_clips(kind, n, voice, secs, peaks) values ('answer', 1, 'seed/answer-1.mp3', 12, '[1.0, 0.54, 0.49, 0.54, 0.47, 0.57, 0.61, 0.55, 0.63, 0.5, 0.6, 0.53, 0.63, 0.64, 0.58, 0.46, 0.51, 0.45, 0.49, 0.58, 0.46, 0.74, 0.57, 0.59, 0.42, 0.61, 0.62, 0.46]'::jsonb) on conflict (kind, n) do update set voice = excluded.voice, secs = excluded.secs, peaks = excluded.peaks;
insert into public.sample_clips(kind, n, voice, secs, peaks) values ('answer', 2, 'seed/answer-2.mp3', 9, '[0.87, 0.79, 0.55, 0.46, 0.5, 0.16, 0.81, 0.75, 0.65, 0.79, 0.47, 0.43, 0.29, 0.77, 0.96, 0.64, 0.7, 0.5, 0.38, 0.12, 0.52, 1.0, 0.5, 0.47, 0.79, 0.87, 0.35, 0.17]'::jsonb) on conflict (kind, n) do update set voice = excluded.voice, secs = excluded.secs, peaks = excluded.peaks;
insert into public.sample_clips(kind, n, voice, secs, peaks) values ('answer', 3, 'seed/answer-3.mp3', 8, '[0.56, 0.69, 0.44, 1.0, 0.81, 0.53, 0.78, 0.53, 0.63, 0.62, 0.17, 0.69, 0.91, 0.75, 0.64, 0.9, 0.91, 0.25, 0.98, 0.74, 0.57, 0.57, 0.93, 0.54, 0.74, 0.59, 0.51, 0.55]'::jsonb) on conflict (kind, n) do update set voice = excluded.voice, secs = excluded.secs, peaks = excluded.peaks;
insert into public.sample_clips(kind, n, voice, secs, peaks) values ('planok', 1, 'seed/planok-1.mp3', 5, '[0.12, 0.64, 0.39, 0.96, 0.54, 0.34, 0.49, 0.26, 0.12, 0.7, 0.57, 0.52, 0.73, 0.5, 0.29, 0.12, 0.71, 0.36, 0.71, 0.86, 0.73, 1.0, 0.38, 0.42, 0.36, 0.26, 0.32, 0.12]'::jsonb) on conflict (kind, n) do update set voice = excluded.voice, secs = excluded.secs, peaks = excluded.peaks;
insert into public.sample_clips(kind, n, voice, secs, peaks) values ('planok', 2, 'seed/planok-2.mp3', 5, '[0.81, 0.71, 0.59, 0.5, 0.45, 0.68, 0.49, 0.78, 0.74, 1.0, 0.75, 0.66, 0.82, 0.3, 0.94, 0.3, 0.88, 0.57, 0.16, 0.77, 0.53, 0.78, 0.89, 0.74, 0.53, 0.61, 0.78, 0.62]'::jsonb) on conflict (kind, n) do update set voice = excluded.voice, secs = excluded.secs, peaks = excluded.peaks;
insert into public.outings(id, owner, name, place, starts_at, cap, descr, weekly) values ('5a5a0e00-0000-4000-8000-000000000001', '5a5a0000-0000-4000-8000-000000000001', 'Caminata al atardecer', 'Malecón de Miraflores, frente al Parque del Amor', ((date_trunc('week', now() at time zone 'America/Lima') + interval '5 days' + time '17:30') at time zone 'America/Lima'), 8, 'Caminamos del Parque del Amor al faro y terminamos en un café. Cada uno paga lo suyo.', true) on conflict (id) do update set name = excluded.name, place = excluded.place, descr = excluded.descr;
insert into public.outings(id, owner, name, place, starts_at, cap, descr, weekly) values ('5a5a0e00-0000-4000-8000-000000000002', '5a5a0000-0000-4000-8000-000000000003', 'Preguntas frente al mar', 'Bajada de Baños, Barranco', ((date_trunc('week', now() at time zone 'America/Lima') + interval '4 days' + time '18:00') at time zone 'America/Lima'), 8, 'Cada uno trae una pregunta que lanzó esta semana y la contestamos en voz alta.', true) on conflict (id) do update set name = excluded.name, place = excluded.place, descr = excluded.descr;
insert into public.outings(id, owner, name, place, starts_at, cap, descr, weekly) values ('5a5a0e00-0000-4000-8000-000000000003', '5a5a0000-0000-4000-8000-000000000002', 'Cine y conversa', 'Un cine en Lince, luego café', ((date_trunc('week', now() at time zone 'America/Lima') + interval '2 days' + time '20:00') at time zone 'America/Lima'), 6, 'Vemos la película de la semana y la comentamos a la salida.', true) on conflict (id) do update set name = excluded.name, place = excluded.place, descr = excluded.descr;
-- ========== FIN PERSONAS DE EJEMPLO ==========
