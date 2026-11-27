-- Botella. Pegar completo en Supabase > SQL Editor > Run. Se puede volver a correr sin perder datos.
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

-- Un link de lectura abierta también sirve de invitación ('L:<slug>'): quien responde crea su cuenta ahí mismo.
-- Lo mismo un link de botella para dos que sigue abierto ('D:<token>').
create or replace function public.check_code(p_code text) returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if upper(trim(coalesce(p_code, ''))) like 'L:%' then
    return exists (select 1 from lecturas where lower(slug) = lower(substr(trim(p_code), 3)) and not closed and closes_at > now());
  end if;
  if upper(trim(coalesce(p_code, ''))) like 'D:%' then
    return exists (select 1 from duos where lower(token) = lower(substr(trim(p_code), 3)) and status = 'open' and expires_at > now());
  end if;
  return exists (select 1 from codes where code = upper(trim(p_code)) and active and uses < max_uses);
end $$;
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
-- Botellas especiales (27/11): ninguna se paga, todas se ganan. Que llega lejos empieza con 30 personas; la dorada sale
-- además en Botellas doradas; la de regalo se manda en una conversación. La de color ya no existe: su trabajo lo hace
-- el tema que toda botella elige al lanzarse (color_left queda solo para la app vieja).
alter table public.profiles add column if not exists color_left int not null default 0;
alter table public.profiles add column if not exists far_left int not null default 1;
-- Del muelle (todo se gana, nada se paga): dorada, botella de regalo, quién la abrió, vidrio y plan Capitán. Las personas de ejemplo llevan is_sample.
alter table public.profiles add column if not exists tide_left int not null default 1;
alter table public.profiles add column if not exists gifts_left int not null default 1;
-- Las botellas de color que alguien tenía se vuelven doradas: nadie pierde nada.
update public.profiles set tide_left = least(tide_left + color_left, 10), color_left = 0 where color_left > 0;
alter table public.profiles add column if not exists who_open boolean not null default false;
alter table public.profiles add column if not exists glass text;
alter table public.profiles add column if not exists captain boolean not null default false;
alter table public.profiles add column if not exists is_sample boolean not null default false;
-- Constancia: días seguidos usando tu voz, vidrios ganados y regalos ya entregados. Solo los escribe el servidor.
alter table public.profiles add column if not exists streak int not null default 0;
alter table public.profiles add column if not exists streak_day date;
alter table public.profiles add column if not exists best_streak int not null default 0;
alter table public.profiles add column if not exists glasses text[] not null default '{}';
alter table public.profiles add column if not exists unlocks int[] not null default '{}';
alter table public.profiles add column if not exists quest_done boolean not null default false;
alter table public.profiles add column if not exists sample_fill timestamptz; -- última vez que la marea le trajo botellas de ejemplo
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
  if not check_code(new.code_used) then
    raise exception 'Ese código de invitación no es válido.';
  end if;
  update codes set uses = uses + 1 where code = upper(trim(new.code_used));
  new.code_used := upper(trim(new.code_used));
  new.bottles := 3; new.color_left := 0; new.far_left := 1; new.tide_left := 1; new.gifts_left := 1; new.who_open := false; new.glass := null; new.captain := false; new.streak := 0; new.streak_day := null; new.best_streak := 0; new.glasses := '{}'; new.unlocks := '{}'; new.quest_done := false; new.sample_fill := null; new.daily_day := lima_today(); new.earned_day := lima_today(); new.earned := 0; new.paused := false;
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

-- Lo que se ve de alguien antes de saber su nombre: un tema que comparten, nunca el distrito.
-- El distrito queda privado: solo acerca botellas y sugiere lugares para un plan.
create or replace function public.vibe(p_viewer uuid, p_other uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.t from unnest((select topics from profiles where id = p_other)) with ordinality u(t, i)
      where u.t = any(coalesce((select topics from profiles where id = p_viewer), '{}')) order by u.i limit 1),
    (select topics[1] from profiles where id = p_other));
$$;
create or replace function public.vibe_phrase(t text) returns text language sql immutable as $$
  select case t when 'Música' then 'ama la música' when 'Cine' then 'ama el cine' when 'Libros' then 'ama los libros'
    when 'Viajes' then 'ama viajar' when 'Fútbol' then 'ama el fútbol' when 'Comida' then 'ama comer rico'
    when 'La ciudad' then 'ama la ciudad' when 'Trabajo' then 'vive su trabajo' when 'Filosofía' then 'ama la filosofía'
    when 'Amor' then 'cree en el amor' when 'Tecnología' then 'ama la tecnología' when 'Arte' then 'ama el arte'
    else 'ama ' || lower(t) end;
$$;
create or replace function public.alguien(p_viewer uuid, p_other uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce('Alguien que ' || vibe_phrase(vibe(p_viewer, p_other)), 'Alguien');
$$;
revoke execute on function public.vibe(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.alguien(uuid, uuid) from public, anon, authenticated;

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
alter table public.reports add column if not exists answer_id uuid; -- respuesta anónima de una lectura
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
-- La pregunta del día (kind 'Marea', se suelta a las 21:00) y la botella para dos (dos voces, dos orillas de origen).
alter table public.bottles add column if not exists tide_day date;
alter table public.bottles add column if not exists partner uuid references public.profiles(id) on delete set null;
alter table public.bottles add column if not exists voice2 text;
alter table public.bottles add column if not exists voice2_secs int;
alter table public.bottles add column if not exists voice2_peaks jsonb;
alter table public.bottles add column if not exists wave2 boolean not null default false; -- ya no se usa (regla vieja de 8 + 4)
alter table public.bottles add column if not exists grew_at timestamptz; -- la última vez que la botella sumó gente porque nadie respondía
-- Alcance: una botella llega a 12 personas al lanzarla (30 si llega lejos, 20 si es para dos) y, mientras nadie responda,
-- suma 6 más cada hora, sin tope, hasta llegar a todas las personas afines. Así siempre está llegando a gente nueva.
create or replace function public.bottle_cap(p_btype text) returns int language sql immutable as $$ select 1000000 $$;
alter table public.bottles drop constraint if exists bottles_kind_check;
alter table public.bottles add constraint bottles_kind_check check (kind in ('Pregunta','Confesión','Historia','Marea'));
create index if not exists bottles_tide on public.bottles(tide_day) where tide_day is not null;
alter table public.bottles enable row level security;
drop policy if exists "mis botellas" on public.bottles;
create policy "mis botellas" on public.bottles for select to authenticated using (auth.uid() in (owner, partner));

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
-- Una botella sin abrir se va con la marea de las 21:00 (la primera que pase al menos 6 horas después de llegar).
alter table public.deliveries add column if not exists expires_at timestamptz;
create or replace function public.next_tide(ts timestamptz) returns timestamptz language sql immutable as $$
  select case when (ts at time zone 'America/Lima')::time < time '21:00'
    then (((ts at time zone 'America/Lima')::date + time '21:00') at time zone 'America/Lima')
    else (((ts at time zone 'America/Lima')::date + 1 + time '21:00') at time zone 'America/Lima') end;
$$;
create or replace function public.delivery_defaults() returns trigger language plpgsql as $$
begin new.expires_at := coalesce(new.expires_at, public.next_tide(new.created_at + interval '6 hours')); return new; end $$;
drop trigger if exists delivery_defaults on public.deliveries;
create trigger delivery_defaults before insert on public.deliveries for each row execute function public.delivery_defaults();
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
-- Una botella para dos abre dos conversaciones con quien responde: una con cada voz del dúo.
alter table public.convos drop constraint if exists convos_bottle_id_b_key;
create unique index if not exists convos_bottle_a_b on public.convos(bottle_id, a, b);
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
  and exists (select 1 from convos c where c.id = convo_id and auth.uid() in (c.a, c.b) and not c.closed and not public.blocked(c.a, c.b)
              -- sin respuesta en 48 horas la conversación vuelve al mar, salvo que ya puedan llamarse
              and ((c.key_a and c.key_b) or c.last_at > now() - interval '48 hours'))
  and (body is null or body like '#call|%')
);

create or replace function public.touch_convo() returns trigger language plpgsql security definer set search_path = public as $$
begin update convos set last_at = new.created_at where id = new.convo_id; return new; end $$;
drop trigger if exists touch_convo on public.messages;
create trigger touch_convo after insert on public.messages for each row execute function public.touch_convo();

-- ========== AVISOS, PUSH Y TAREAS CON HORA ==========
-- Un aviso es lo que la app muestra como banner y lo que sale como notificación push. "at" puede ser futuro.
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  to_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,   -- opened, msg, call, tide, expiring, cooling, lectura, duo, unlock, quest
  title text not null check (char_length(title) <= 120),
  body text check (char_length(body) <= 240),
  go text,              -- pantalla a la que lleva
  ref text,             -- conversación, botella o lectura
  at timestamptz not null default now(),
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notices_to on public.notices(to_id, at desc);
create index if not exists notices_due on public.notices(at) where pushed_at is null;
alter table public.notices enable row level security;
drop policy if exists "mis avisos" on public.notices;
create policy "mis avisos" on public.notices for select to authenticated using (to_id = auth.uid());

create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security; -- solo el servidor

-- Datos privados del servidor (llaves de push, sal para los dispositivos). Nadie los lee desde la app.
create table if not exists public.server_kv (key text primary key, value text not null);
alter table public.server_kv enable row level security;
insert into public.server_kv(key, value) values ('site', 'https://botella-app.vercel.app') on conflict do nothing;
create table if not exists public.jobs_done (job text not null, day date not null, at timestamptz not null default now(), primary key (job, day));
alter table public.jobs_done enable row level security;

create or replace function public.notify(p_to uuid, p_kind text, p_title text, p_body text default null, p_go text default null, p_ref text default null, p_at timestamptz default now())
returns void language sql security definer set search_path = public as $$
  insert into notices(to_id, kind, title, body, go, ref, at)
  select p.id, p_kind, left(p_title, 120), left(p_body, 240), p_go, p_ref, coalesce(p_at, now()) from profiles p where p.id = p_to and not p.is_sample;
$$;
revoke execute on function public.notify(uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;

-- ========== BOTELLA PARA DOS ==========
create table if not exists public.duos (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default left(replace(gen_random_uuid()::text, '-', ''), 16),
  owner uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('Pregunta','Confesión','Historia')),
  body text check (char_length(body) <= 140),
  voice text not null, voice_secs int not null, voice_peaks jsonb,
  status text not null default 'open' check (status in ('open','done','cancelled')),
  partner uuid references public.profiles(id) on delete set null,
  bottle_id uuid references public.bottles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours'
);
alter table public.duos enable row level security;

-- ========== PIDE UNA LECTURA ==========
-- Una pregunta guiada que se comparte por link. Desde el 16/11 se responde con cuenta: quien pregunta escucha la voz y después ve el nombre.
create table if not exists public.lecturas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null default left(replace(gen_random_uuid()::text, '-', ''), 12),
  owner uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  voice text not null, voice_secs int not null, voice_peaks jsonb,
  closed boolean not null default false,
  closes_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);
alter table public.lecturas enable row level security;
-- Cada respuesta queda ligada a un dispositivo (un código al azar, guardado con hash): anónima para quien pregunta, no para el sistema.
create table if not exists public.lectura_answers (
  id uuid primary key default gen_random_uuid(),
  lectura uuid not null references public.lecturas(id) on delete cascade,
  voice text not null, voice_secs int not null, voice_peaks jsonb,
  device text not null, ip text,
  status text not null default 'pending' check (status in ('pending','ok','blocked','deleted','reported')),
  reason text, transcript text,
  heard boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lectura, device)
);
alter table public.lectura_answers enable row level security;
alter table public.lectura_answers add column if not exists author uuid references public.profiles(id) on delete set null;
create table if not exists public.lectura_blocks (
  owner uuid not null references public.profiles(id) on delete cascade,
  device text not null, ip text, ip_until timestamptz,
  created_at timestamptz not null default now(),
  primary key (owner, device)
);
alter table public.lectura_blocks enable row level security;

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
    where p.id <> bo.owner and p.id is distinct from bo.partner and not p.paused and not p.is_sample
      and not exists (select 1 from deliveries d where d.bottle_id = bo.id and d.to_id = p.id)
      and not blocked(p.id, bo.owner) and (bo.partner is null or not blocked(p.id, bo.partner))
      and not exists (select 1 from convos c where c.bottle_id = bo.id and c.b = p.id)
    order by -- la pregunta del día llega primero a quienes también dejaron su voz esa noche
             (bo.tide_day is not null and exists (select 1 from bottles x where x.owner = p.id and x.tide_day = bo.tide_day)) desc,
             -- toda botella llega primero a quien ama el tema que eligió quien la lanzó (el distrito nunca es un destino)
             (bo.target_topic is null or bo.target_topic = any(p.topics)) desc,
             cardinality(array(select unnest(p.topics) intersect select unnest(mine))) desc,
             -- el distrito nunca se muestra, pero acerca: a igual afinidad, primero alguien cercano
             (p.district = (select q.district from profiles q where q.id = bo.owner)) desc,
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

-- Se llama al abrir la app: botella gratis del día, tareas con hora y lo que trae el mar.
create or replace function public.tide() returns profiles language plpgsql security definer set search_path = public as $$
declare me profiles; r record; room int; fresh int;
begin
  update profiles set last_seen = now() where id = auth.uid() returning * into me;
  if me.id is null then return null; end if;
  if me.daily_day is distinct from lima_today() then
    update profiles set daily_day = lima_today(),
      bottles = case when bottles >= (case when captain then 30 else 9 end) then bottles else least(bottles + (case when captain then 3 else 1 end), case when captain then 30 else 9 end) end,
      far_left = far_left + (captain and extract(isodow from lima_today()) = 1)::int,
      -- cada lunes, una dorada para quien respondió al menos una botella en la última semana
      tide_left = least(tide_left + (extract(isodow from lima_today()) = 1 and exists (select 1 from convos c where c.b = me.id and c.created_at > now() - interval '7 days'))::int, 10)
      where id = me.id returning * into me;
  end if;
  perform tick();
  if not me.paused then
    -- Si mi orilla está casi vacía, el mar me trae botellas recientes que todavía buscan quién las escuche.
    for r in
      select b.id from bottles b
      where b.owner <> me.id and b.partner is distinct from me.id and not b.hidden and b.created_at > now() - interval '7 days'
        and (b.tide_day is null or now() >= ((b.tide_day + time '21:00') at time zone 'America/Lima'))
        and not blocked(b.owner, me.id) and not (select is_sample from profiles o where o.id = b.owner)
        and not exists (select 1 from deliveries d where d.bottle_id = b.id and d.to_id = me.id)
        and (select count(*) from deliveries d where d.bottle_id = b.id and d.status in ('waiting','opened')) < 12
        and (select count(*) from deliveries d where d.bottle_id = b.id) < bottle_cap(b.btype)
      order by b.created_at desc
      limit greatest(0, 3 - (select count(*) from deliveries d where d.to_id = me.id and d.status in ('waiting','opened')))
    loop
      insert into deliveries(bottle_id, to_id) values (r.id, me.id) on conflict do nothing;
    end loop;
    -- Las doradas de las últimas 48 horas llegan a todas las orillas, sin importar el tema: salen primero en el mar de cada persona.
    insert into deliveries(bottle_id, to_id)
      select b.id, me.id from bottles b join profiles o on o.id = b.owner
      where b.featured and not b.hidden and not o.is_sample and b.created_at > now() - interval '48 hours'
        and b.owner <> me.id and b.partner is distinct from me.id and not blocked(b.owner, me.id)
        and not exists (select 1 from deliveries d where d.bottle_id = b.id and d.to_id = me.id)
        and not exists (select 1 from convos c where c.bottle_id = b.id and c.b = me.id)
      order by b.created_at desc limit 3
      on conflict do nothing;
    -- Mientras somos pocos, las botellas de ejemplo acompañan: tres al llegar y luego hasta dos con cada marea de las 21:00.
    fresh := case when me.sample_fill is null then 3 when me.sample_fill < next_tide(now()) - interval '1 day' then 2 else 0 end;
    if fresh > 0 then
      room := least(fresh, greatest(0, 4 - (select count(*) from deliveries d where d.to_id = me.id and d.status in ('waiting','opened'))::int));
      for r in
        select b.id, d.id as old from bottles b join profiles o on o.id = b.owner
          left join deliveries d on d.bottle_id = b.id and d.to_id = me.id
        where o.is_sample and not b.hidden and not blocked(b.owner, me.id)
          and (d.id is null or (d.status in ('drifted','returned') and d.created_at < now() - interval '6 days'))
          and not exists (select 1 from convos c where c.bottle_id = b.id and c.b = me.id)
        order by (d.id is null) desc, cardinality(array(select unnest(o.topics) intersect select unnest(me.topics))) desc, random()
        limit room
      loop
        if r.old is null then insert into deliveries(bottle_id, to_id) values (r.id, me.id) on conflict do nothing;
        else update deliveries set status = 'waiting', created_at = now(), opened_at = null, expires_at = next_tide(now() + interval '6 hours') where id = r.old; end if;
      end loop;
      update profiles set sample_fill = now() where id = me.id returning * into me;
    end if;
  end if;
  return me;
end $$;
grant execute on function public.tide() to authenticated;

-- Mientras somos pocos, una persona de ejemplo escucha tu botella y te responde en un minuto (máximo 3 al día).
-- Devuelve 1 si alguien de ejemplo la tomó.
create or replace function public.sample_answer(p_bottle uuid) returns int language plpgsql security definer set search_path = public as $$
declare bo bottles; s profiles; cid uuid; cl record; who uuid;
begin
  select * into bo from bottles where id = p_bottle;
  if bo.id is null then return 0; end if;
  if (select count(*) from convos c join profiles o on o.id = c.b where c.a = bo.owner and o.is_sample and c.created_at > now() - interval '1 day') >= 3 then return 0; end if;
  select o.* into s from profiles o where o.is_sample and not blocked(o.id, bo.owner)
    and not exists (select 1 from convos c where c.a = bo.owner and c.b = o.id)
    order by cardinality(array(select unnest(o.topics) intersect select unnest((select topics from profiles where id = bo.owner)))) desc, random() limit 1;
  if s.id is null then
    select o.* into s from profiles o where o.is_sample and not blocked(o.id, bo.owner)
      and not exists (select 1 from convos c where c.bottle_id = bo.id and c.b = o.id) order by random() limit 1;
  end if;
  select * into cl from sample_clips where kind = 'answer' order by random() limit 1;
  if s.id is null or cl.voice is null then return 0; end if;
  insert into deliveries(bottle_id, to_id, status, created_at, opened_at) values (bo.id, s.id, 'answered', now(), now() + interval '30 seconds');
  foreach who in array array_remove(array[bo.owner, bo.partner], null) loop
    perform notify(who, 'opened', 'Tu botella llegó a ' || lower(alguien(who, s.id)), 'Alguien la descorchó y la está escuchando.', 'mine', bo.id::text, now() + interval '30 seconds');
    insert into convos(bottle_id, a, b) values (bo.id, who, s.id) returning id into cid;
    insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, body, created_at)
      values (cid, bo.owner, bo.voice, bo.voice_secs, bo.voice_peaks, '#bottle|' || bo.kind || '|' || coalesce(bo.body, ''), now());
    if bo.voice2 is not null then
      insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, body, created_at) values (cid, coalesce(bo.partner, bo.owner), bo.voice2, bo.voice2_secs, bo.voice2_peaks, '#bottle2|', now() + interval '1 millisecond');
    end if;
    insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, created_at) values (cid, s.id, cl.voice, cl.secs, cl.peaks, now() + interval '70 seconds');
  end loop;
  return 1;
end $$;
revoke execute on function public.sample_answer(uuid) from public, anon, authenticated;

drop function if exists public.launch_bottle(text, text, text, int, jsonb);
drop function if exists public.launch_bottle(text, text, text, int, jsonb, text, text, text);
drop function if exists public.launch_bottle(text, text, text, int, jsonb, text, text, text, boolean);
create or replace function public.launch_bottle(p_kind text, p_body text, p_voice text, p_secs int, p_peaks jsonb default null,
  p_type text default 'free', p_topic text default null, p_district text default null, p_featured boolean default false)
returns table (bottle uuid, shores int, left_bottles int, left_color int, left_far int, left_tide int) language plpgsql security definer set search_path = public as $$
declare me profiles; bid uuid; n int;
begin
  select * into me from profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  p_type := coalesce(p_type, 'free'); p_featured := coalesce(p_featured, false);
  if p_type not in ('free','color','far') then raise exception 'Ese tipo de botella no existe.'; end if;
  if p_kind is null or p_kind not in ('Pregunta','Confesión','Historia') then raise exception 'Ese tipo de botella no existe.'; end if;
  if p_type = 'free' and me.bottles < 1 then raise exception 'Te quedaste sin botellas. Responde una o pide más en el muelle.'; end if;
  if p_type = 'color' and me.color_left < 1 then raise exception 'Ya usaste tus botellas de color. Pide más en el muelle.'; end if;
  if p_type = 'far' and me.far_left < 1 then raise exception 'Ya usaste tu botella que llega lejos. Pide otra en el muelle.'; end if;
  if p_featured and me.tide_left < 1 then raise exception 'Te quedaste sin botellas doradas. Pide otra en el muelle.'; end if;
  if p_type = 'color' and nullif(trim(p_topic), '') is null then raise exception 'Elige el tema de tu botella.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  if (select count(*) from bottles where owner = me.id and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'Lanzaste muchas botellas seguidas. Espera un rato.';
  end if;
  insert into bottles(owner, kind, body, voice, voice_secs, voice_peaks, btype, target_topic, target_district, featured, glass)
    values (me.id, p_kind, nullif(trim(p_body), ''), p_voice, least(greatest(p_secs, 1), 60), p_peaks, p_type,
            nullif(trim(p_topic), ''), null, p_featured, me.glass) returning id into bid;
  update profiles set bottles = bottles - (p_type = 'free')::int, color_left = color_left - (p_type = 'color')::int, far_left = far_left - (p_type = 'far')::int,
    tide_left = tide_left - p_featured::int
    where id = me.id returning * into me;
  n := deliver(bid, case when p_type = 'far' then 30 else 12 end);
  if n < 3 then n := n + sample_answer(bid); end if;
  return query select bid, n, me.bottles, me.color_left, me.far_left, me.tide_left;
end $$;
grant execute on function public.launch_bottle(text, text, text, int, jsonb, text, text, text, boolean) to authenticated;

-- Mi orilla: lo que me llegó. Nunca devuelve quién la lanzó.
drop function if exists public.shore();
create or replace function public.shore() returns table (
  id uuid, status text, arrived timestamptz, kind text, body text, voice text, voice_secs int, voice_peaks jsonb, place text, btype text,
  featured boolean, glass text, sample boolean, expires_at timestamptz, tide_day date,
  voice2 text, voice2_secs int, voice2_peaks jsonb, place2 text
) language sql stable security definer set search_path = public as $$
  select d.id, d.status, d.created_at, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, vibe(auth.uid(), b.owner), b.btype, b.featured, b.glass, p.is_sample,
    case when d.status = 'waiting' then coalesce(d.expires_at, d.created_at + interval '24 hours') else d.opened_at + interval '48 hours' end,
    b.tide_day, b.voice2, b.voice2_secs, b.voice2_peaks, (case when b.voice2 is not null then vibe(auth.uid(), b.partner) end)
  from deliveries d join bottles b on b.id = d.bottle_id join profiles p on p.id = b.owner
  where d.to_id = auth.uid() and d.status in ('waiting','opened') and not b.hidden and not blocked(b.owner, auth.uid())
    and (d.status <> 'waiting' or coalesce(d.expires_at, d.created_at + interval '24 hours') > now())
  order by b.featured desc, d.created_at desc limit 20;
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
  if d.id is not null and (select count(*) from deliveries where bottle_id = d.bottle_id) < (select bottle_cap(btype) from bottles where id = d.bottle_id) then perform deliver(d.bottle_id, 1); end if;
end $$;
grant execute on function public.return_delivery(uuid) to authenticated;

-- Responder abre una conversación privada y, hasta 3 veces al día, regala una botella.
-- Si la botella era para dos, se abre una conversación con cada voz del dúo.
create or replace function public.answer_delivery(p_id uuid, p_voice text, p_secs int, p_peaks jsonb default null)
returns table (convo uuid, rewarded boolean, left_bottles int) language plpgsql security definer set search_path = public as $$
declare d deliveries; bo bottles; me profiles; cid uuid; first uuid; rw boolean := false; who uuid;
begin
  select * into d from deliveries where id = p_id and to_id = auth.uid() and status in ('waiting','opened') for update;
  if d.id is null then raise exception 'Esta botella ya no está en tu orilla.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> auth.uid()::text then raise exception 'Falta tu nota de voz.'; end if;
  select * into bo from bottles where id = d.bottle_id;
  if bo.hidden or blocked(bo.owner, auth.uid()) then raise exception 'Esta botella ya no está disponible.'; end if;
  foreach who in array array_remove(array[bo.owner, bo.partner], null) loop
    if who = auth.uid() or blocked(who, auth.uid()) then continue; end if;
    insert into convos(bottle_id, a, b) values (bo.id, who, auth.uid()) returning id into cid;
    first := coalesce(first, cid);
    insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, body, created_at)
      values (cid, bo.owner, bo.voice, bo.voice_secs, bo.voice_peaks, '#bottle|' || bo.kind || '|' || coalesce(bo.body, ''), bo.created_at);
    if bo.voice2 is not null then
      insert into messages(convo_id, sender, voice, voice_secs, voice_peaks, body, created_at)
        values (cid, coalesce(bo.partner, bo.owner), bo.voice2, bo.voice2_secs, bo.voice2_peaks, '#bottle2|', bo.created_at + interval '1 millisecond');
    end if;
    insert into messages(convo_id, sender, voice, voice_secs, voice_peaks) values (cid, auth.uid(), p_voice, least(greatest(p_secs, 1), 120), p_peaks);
  end loop;
  cid := first;
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
  shores int, opened int, answers int, waiting int, convo uuid, btype text, target text, featured boolean, openers jsonb,
  tide_day date, duo boolean, voice2 text, voice2_secs int, voice2_peaks jsonb, held boolean
) language sql stable security definer set search_path = public as $$
  select b.id, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, b.created_at,
    (select count(*) from deliveries d where d.bottle_id = b.id)::int,
    (select count(*) from deliveries d where d.bottle_id = b.id and d.opened_at <= now())::int,
    (select count(*) from convos c where c.bottle_id = b.id and c.a = auth.uid() and exists (select 1 from messages m where m.convo_id = c.id and m.sender = c.b and m.created_at <= now()))::int,
    (select count(*) from deliveries d where d.bottle_id = b.id and d.status = 'waiting')::int,
    (select c.id from convos c where c.bottle_id = b.id and c.a = auth.uid() and exists (select 1 from messages m where m.convo_id = c.id and m.sender = c.b and m.created_at <= now()) order by c.created_at limit 1),
    b.btype, coalesce(b.target_topic, b.target_district), b.featured,
    -- "Quién la abrió" (del muelle): el tema en común y la hora de cada persona que la abrió. Nunca el nombre.
    case when (select who_open from profiles where id = auth.uid()) then
      (select coalesce(jsonb_agg(jsonb_build_object('place', vibe(auth.uid(), p.id), 'at', d.opened_at, 'answered', d.status = 'answered') order by d.opened_at desc), '[]'::jsonb)
       from deliveries d join profiles p on p.id = d.to_id where d.bottle_id = b.id and d.opened_at <= now()) end,
    b.tide_day, b.voice2 is not null, b.voice2, b.voice2_secs, b.voice2_peaks,
    b.tide_day is not null and now() < ((b.tide_day + time '21:00') at time zone 'America/Lima')
  from bottles b where auth.uid() in (b.owner, b.partner) order by b.created_at desc limit 50;
$$;
grant execute on function public.my_bottles() to authenticated;

-- Conversaciones: el otro es "Alguien que ama el cine" (un tema en común) hasta que los dos revelan su nombre.
drop function if exists public.my_convos();
create or replace function public.my_convos() returns table (
  id uuid, alias text, place text, revealed boolean, my_reveal boolean, other_reveal boolean,
  my_key boolean, other_key boolean, closed boolean, last_at timestamptz, created_at timestamptz, i_launched boolean,
  intro_voice text, intro_secs int, last_mine boolean, sample boolean, next_at timestamptz, call_voice text, call_secs int,
  cool_at timestamptz, cooled boolean, duo boolean, my_voices int, other_voices int
) language sql stable security definer set search_path = public as $$
  select c.id,
    case when c.reveal_a and c.reveal_b then o.name else alguien(auth.uid(), o.id) end,
    vibe(auth.uid(), o.id), c.reveal_a and c.reveal_b,
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
    v.call_voice, v.call_secs,
    -- sin respuesta en 48 horas la conversación vuelve al mar, salvo que ya puedan llamarse
    case when c.key_a and c.key_b then null else c.last_at + interval '48 hours' end,
    not (c.key_a and c.key_b) and c.last_at < now() - interval '48 hours',
    exists (select 1 from bottles bb where bb.id = c.bottle_id and bb.voice2 is not null),
    (select count(*) from messages m where m.convo_id = c.id and m.voice is not null and m.created_at <= now() and m.sender = auth.uid())::int,
    (select count(*) from messages m where m.convo_id = c.id and m.voice is not null and m.created_at <= now() and m.sender <> auth.uid())::int
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

-- La llamada se desbloquea conversando: cada uno necesita al menos 2 notas de voz en la conversación.
create or replace function public.set_key(p_convo uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare c convos; other uuid; mine int; theirs int; r boolean;
begin
  select * into c from convos where id = p_convo and auth.uid() in (a, b) and not closed;
  if c.id is null then return false; end if;
  other := case when c.a = auth.uid() then c.b else c.a end;
  select count(*) filter (where sender = auth.uid()), count(*) filter (where sender <> auth.uid()) into mine, theirs
    from messages where convo_id = c.id and voice is not null and created_at <= now();
  if mine < 2 or (theirs < 2 and not (select is_sample from profiles where id = other)) then
    raise exception 'La llamada se abre cuando cada uno haya mandado al menos 2 notas de voz.';
  end if;
  update convos x set key_a = case when a = auth.uid() or (select is_sample from profiles where id = x.a) then true else key_a end,
                    key_b = case when b = auth.uid() or (select is_sample from profiles where id = x.b) then true else key_b end
  where id = p_convo returning key_a and key_b into r;
  return r;
end $$;
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
    when p_item in ('glass:coral', 'glass:violeta', 'glass:aurora', 'glass:luna') then -- se ganan con constancia, no están en venta
      if not split_part(p_item, ':', 2) = any(me.glasses) then raise exception 'Ese vidrio se gana con días seguidos, no se pide en el muelle.'; end if;
      update profiles set glass = split_part(p_item, ':', 2) where id = me.id returning * into me;
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
  select b.id, b.kind, b.body, b.voice, b.voice_secs, b.voice_peaks, vibe(auth.uid(), b.owner), b.glass, p.is_sample, b.created_at, b.owner = auth.uid(),
    (select d.status from deliveries d where d.bottle_id = b.id and d.to_id = auth.uid())
  from bottles b join profiles p on p.id = b.owner
  where b.featured and not b.hidden and not blocked(b.owner, auth.uid()) and (p.is_sample or b.created_at > now() - interval '48 hours')
  order by p.is_sample, b.created_at desc limit 12;
$$;
grant execute on function public.marea() to authenticated;

create or replace function public.marea_take(p_bottle uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare bo bottles; did uuid;
begin
  select * into bo from bottles b where b.id = p_bottle and not b.hidden and (b.featured or (b.tide_day is not null
    and now() >= ((b.tide_day + time '21:00') at time zone 'America/Lima')
    and exists (select 1 from bottles x where x.owner = auth.uid() and x.tide_day >= b.tide_day)));
  if bo.id is null or bo.owner = auth.uid() or blocked(bo.owner, auth.uid()) then raise exception 'Esta botella ya no está en la marea.'; end if;
  if exists (select 1 from convos c where c.bottle_id = bo.id and c.b = auth.uid()) then raise exception 'Ya respondiste esta botella.'; end if;
  insert into deliveries(bottle_id, to_id) values (bo.id, auth.uid()) on conflict (bottle_id, to_id) do update set status = 'opened', opened_at = coalesce(deliveries.opened_at, now()) returning id into did;
  return did;
end $$;
grant execute on function public.marea_take(uuid) to authenticated;

-- ========== REGALOS Y PLANES EN LA CONVERSACIÓN ==========
create or replace function public.convo_other(p_convo uuid) returns uuid language sql stable security definer set search_path = public as $$
  select case when a = auth.uid() then b else a end from convos where id = p_convo and auth.uid() in (a, b) and not closed and not blocked(a, b);
$$;

-- Botella de regalo: queda dorada en la conversación y le regala una botella normal a la otra persona.
create or replace function public.send_gift(p_convo uuid) returns int language plpgsql security definer set search_path = public as $$
declare other uuid := convo_other(p_convo); me profiles;
begin
  if other is null then raise exception 'Esta conversación ya terminó.'; end if;
  select * into me from profiles where id = auth.uid() for update;
  if me.gifts_left < 1 then raise exception 'Te quedaste sin botellas de regalo. Pide otra en el muelle.'; end if;
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
    o.descr, p.name, vibe(auth.uid(), o.owner), o.owner = auth.uid(),
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

-- ========== CONSTANCIA: DÍAS SEGUIDOS Y DESBLOQUEOS ==========
-- Un día cuenta si usaste tu voz: lanzar, responder, la pregunta de la marea o una nota en una conversación.
create or replace function public.unlock_plan() returns table (days int, kind text, item text, label text) language sql immutable as $$
  values (2, 'tide', '1', 'una botella dorada'), (3, 'glass', 'coral', 'el vidrio coral'), (5, 'gift', '1', 'una botella de regalo'),
         (7, 'glass', 'violeta', 'el vidrio violeta'), (10, 'far', '1', 'una botella que llega lejos'), (14, 'glass', 'aurora', 'el vidrio aurora'),
         (21, 'gift', '2', 'dos botellas de regalo'), (30, 'glass', 'luna', 'el vidrio de luna');
$$;
create or replace function public.bump_streak(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare me profiles; d date := lima_today(); n int; u record;
begin
  select * into me from profiles where id = p_id for update;
  if me.id is null or me.is_sample or me.streak_day = d then return; end if;
  n := case when me.streak_day = d - 1 then me.streak + 1 else 1 end;
  update profiles set streak = n, streak_day = d, best_streak = greatest(best_streak, n) where id = p_id;
  for u in select * from unlock_plan() p where p.days <= n and not (p.days = any(me.unlocks)) order by p.days loop
    update profiles set unlocks = array_append(unlocks, u.days),
      glasses = case when u.kind = 'glass' then array_append(glasses, u.item) else glasses end,
      tide_left = tide_left + case when u.kind = 'tide' then u.item::int else 0 end,
      gifts_left = gifts_left + case when u.kind = 'gift' then u.item::int else 0 end,
      far_left = far_left + case when u.kind = 'far' then u.item::int else 0 end
    where id = p_id;
    perform notify(p_id, 'unlock', u.days || ' días seguidos: ganaste ' || u.label,
      case when u.kind = 'glass' then 'Es tuyo para siempre. Elígelo en tu bitácora.' else 'Ya está en tu muelle.' end, 'bitacora');
  end loop;
end $$;
revoke execute on function public.bump_streak(uuid) from public, anon, authenticated;

create or replace function public.on_bottle() returns trigger language plpgsql security definer set search_path = public as $$
begin perform bump_streak(new.owner); if new.partner is not null then perform bump_streak(new.partner); end if; return new; end $$;
drop trigger if exists on_bottle on public.bottles;
create trigger on_bottle after insert on public.bottles for each row execute function public.on_bottle();

-- Cada mensaje avisa a la otra persona (también por push) y cuenta para la constancia de quien habla.
create or replace function public.on_message() returns trigger language plpgsql security definer set search_path = public as $$
declare c convos; rcpt uuid; snd profiles; who text; first boolean;
begin
  if new.body like '#bottle%' then return new; end if;
  select * into c from convos where id = new.convo_id;
  if c.id is null or new.sender not in (c.a, c.b) then return new; end if;
  if new.voice is not null and new.body is null then perform bump_streak(new.sender); end if;
  rcpt := case when new.sender = c.a then c.b else c.a end;
  select * into snd from profiles where id = new.sender;
  who := case when c.reveal_a and c.reveal_b then snd.name else alguien(rcpt, snd.id) end;
  if new.body is null then
    first := new.sender = c.b and not exists (select 1 from messages m where m.convo_id = c.id and m.sender = c.b and m.id <> new.id and m.voice is not null);
    perform notify(rcpt, 'msg', case when first then 'Respondieron tu botella' else who end,
      case when first then who || ' te contestó con su voz.' else 'Te mandó una nota de voz.' end, 'chat', c.id::text, new.created_at);
  elsif new.body like '#gift|%' then perform notify(rcpt, 'msg', who || ' te mandó una botella de regalo', 'Te regaló una botella para lanzar.', 'chat', c.id::text, new.created_at);
  elsif new.body like '#plan|%' then perform notify(rcpt, 'msg', who || ' te propone un plan', split_part(new.body, '|', 2) || ' · ' || split_part(new.body, '|', 3), 'chat', c.id::text, new.created_at);
  elsif new.body like '#planok|%' then perform notify(rcpt, 'msg', who || ' aceptó tu plan', 'Lugares públicos y avísale a alguien de confianza.', 'chat', c.id::text, new.created_at);
  elsif new.body like '#call|%' then perform notify(rcpt, 'call', who || ' te está llamando', 'Abre Botella para contestar.', 'chat', c.id::text, new.created_at);
  end if;
  return new;
end $$;
drop trigger if exists on_message on public.messages;
create trigger on_message after insert on public.messages for each row execute function public.on_message();

-- "Tu botella llegó a alguien que ama el cine": cuando alguien descorcha una botella tuya.
create or replace function public.on_open() returns trigger language plpgsql security definer set search_path = public as $$
declare bo bottles; place text; who uuid;
begin
  if old.status = 'waiting' and new.status = 'opened' then
    select * into bo from bottles where id = new.bottle_id;
    foreach who in array array_remove(array[bo.owner, bo.partner], null) loop
      perform notify(who, 'opened', 'Tu botella llegó a ' || lower(alguien(who, new.to_id)), 'Alguien la descorchó y la está escuchando.', 'mine', bo.id::text);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists on_open on public.deliveries;
create trigger on_open after update on public.deliveries for each row execute function public.on_open();

-- ========== LA PREGUNTA DEL DÍA ==========
-- Todos responden la misma pregunta durante el día y a las 21:00 la marea suelta las voces.
create or replace function public.tide_question(p_day date) returns text language sql immutable as $$
  select q[1 + mod(p_day - date '2026-01-01', array_length(q, 1))] from (select array[
    '¿Qué fue lo mejor que te pasó hoy?', '¿Qué canción no has podido dejar de escuchar esta semana?', '¿A quién extrañas hoy?',
    '¿Cuál es tu rincón favorito de Lima y por qué?', '¿Qué te hizo reír esta semana?', '¿Qué harías mañana si no tuvieras miedo?',
    '¿Qué comida te lleva directo a tu infancia?', '¿Qué aprendiste de la última persona que te rompió el corazón?', '¿Qué plan simple te hace feliz?',
    '¿Qué le agradecerías hoy a alguien que no lo sabe?', '¿Cuál fue tu mejor domingo?', '¿Qué te gustaría que te preguntaran más seguido?',
    '¿Qué película podrías ver mil veces?', '¿Qué te quita el sueño últimamente?', '¿Qué es lo más valiente que has hecho por amor?',
    '¿Qué lugar del Perú quieres conocer y con quién irías?', '¿Qué cosa pequeña te cambió el día?', '¿Qué consejo te dieron que sí funcionó?',
    '¿Qué te gusta de ti que antes no te gustaba?', '¿Cómo sería tu cita perfecta en Lima?', '¿Qué historia de tu familia siempre cuentas?',
    '¿Qué sonido te da paz?', '¿De qué te gustaría hablar toda una noche?', '¿Qué estás esperando con ganas?',
    '¿Qué te dijo alguien que nunca se te olvidó?', '¿Qué harías con un día libre y cien soles?', '¿Qué te enamora de una persona?',
    '¿Cuál es tu recuerdo favorito frente al mar?', '¿Qué dejaste de hacer y quieres retomar?', '¿Qué te gustaría decirle a tu yo del próximo año?',
    '¿Qué huarique recomiendas con los ojos cerrados?', '¿Qué es lo más bonito que hiciste por alguien desconocido?', '¿Qué te haría quedarte despierto hasta tarde hoy?',
    '¿Qué talento escondido tienes?', '¿Qué fue lo último que te sorprendió?', '¿Con qué canción te declararías?'
  ] as q) t;
$$;

create or replace function public.tide_answer(p_voice text, p_secs int, p_peaks jsonb default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; d date := lima_today(); bid uuid; arrived boolean := extract(hour from now() at time zone 'America/Lima') >= 21;
begin
  select * into me from profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  if exists (select 1 from bottles where owner = me.id and tide_day = d) then raise exception 'Ya dejaste tu voz para la marea de hoy.'; end if;
  insert into bottles(owner, kind, body, voice, voice_secs, voice_peaks, glass, tide_day)
    values (me.id, 'Marea', tide_question(d), p_voice, least(greatest(p_secs, 1), 60), p_peaks, me.glass, d) returning id into bid;
  if arrived then perform deliver(bid, 12); end if;
  return jsonb_build_object('bottle', bid, 'arrived', arrived);
end $$;
grant execute on function public.tide_answer(text, int, jsonb) to authenticated;

-- La pantalla de la marea: la pregunta de hoy, las voces de la última marea y las botellas doradas.
create or replace function public.marea_now() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d date := lima_today(); arrived boolean := extract(hour from now() at time zone 'America/Lima') >= 21; ld date; unlocked boolean;
begin
  ld := case when arrived then d else d - 1 end;
  unlocked := exists (select 1 from bottles where owner = auth.uid() and tide_day >= ld);
  return jsonb_build_object(
    'today', jsonb_build_object('day', d, 'question', tide_question(d), 'arrived', arrived,
      'answered', exists (select 1 from bottles where owner = auth.uid() and tide_day = d),
      'count', (select count(*) from bottles where tide_day = d and not hidden)),
    'last', jsonb_build_object('day', ld, 'question', tide_question(ld), 'unlocked', unlocked,
      'voices', coalesce((select jsonb_agg(v order by v->>'at' desc) from (
        select jsonb_build_object('bottle', b.id, 'place', vibe(auth.uid(), b.owner), 'secs', b.voice_secs, 'peaks', b.voice_peaks, 'glass', b.glass, 'at', b.created_at,
          'mine', b.owner = auth.uid(), 'taken', (select x.status from deliveries x where x.bottle_id = b.id and x.to_id = auth.uid())) as v
        from bottles b join profiles p on p.id = b.owner
        where b.tide_day = ld and not b.hidden and not blocked(b.owner, auth.uid()) order by b.created_at desc limit 30) t), '[]'::jsonb)),
    'featured', coalesce((select jsonb_agg(to_jsonb(m)) from marea() m), '[]'::jsonb));
end $$;
grant execute on function public.marea_now() to authenticated;

-- A las 21:00 la marea suelta las voces del día: cada una viaja a 12 orillas y todos reciben el aviso.
create or replace function public.tide_release(d date) returns void language plpgsql security definer set search_path = public as $$
declare r record; n int; q text := tide_question(d);
begin
  for r in select id from bottles where tide_day = d and not hidden loop perform deliver(r.id, 12); end loop;
  select count(*) into n from bottles where tide_day = d and not hidden;
  insert into notices(to_id, kind, title, body, go)
  select p.id, 'tide', 'Llegó la marea de las 21:00',
    case when exists (select 1 from bottles b where b.owner = p.id and b.tide_day = d)
      then case when n > 1 then (n - 1) || case when n = 2 then ' voz más respondió: ' else ' voces más respondieron: ' end || q else 'Tu voz ya viaja. Mira qué más trajo el mar.' end
      else case when n > 0 then n || case when n = 1 then ' voz respondió: ' else ' voces respondieron: ' end || q || ' Deja la tuya para escucharlas.' else 'Trajo botellas nuevas a tu orilla.' end end,
    'marea'
  from profiles p where not p.is_sample and not p.paused and p.last_seen > now() - interval '14 days';
end $$;
revoke execute on function public.tide_release(date) from public, anon, authenticated;

-- ========== LO QUE PASA CON LA HORA ==========
-- Se llama al abrir la app y, si el servidor tiene pg_cron, cada minuto. Cada tarea corre una sola vez.
create or replace function public.tick() returns void language plpgsql security definer set search_path = public as $$
declare d date := lima_today(); hr int := extract(hour from now() at time zone 'America/Lima'); r record; n int;
begin
  -- La marea se lleva lo que nadie abrió (y lo abierto que nadie respondió en 48 horas) hacia otra orilla.
  for r in
    select x.id, x.bottle_id, b.hidden, b.created_at, b.btype, o.is_sample from deliveries x join bottles b on b.id = x.bottle_id join profiles o on o.id = b.owner
    where (x.status = 'waiting' and coalesce(x.expires_at, x.created_at + interval '24 hours') < now())
       or (x.status = 'opened' and x.opened_at < now() - interval '48 hours')
    order by x.created_at limit 40 for update of x skip locked
  loop
    update deliveries set status = 'drifted' where id = r.id;
    if not r.hidden and not r.is_sample and r.created_at > now() - interval '7 days' and (select count(*) from deliveries where bottle_id = r.bottle_id) < bottle_cap(r.btype) then
      perform deliver(r.bottle_id, 1);
    end if;
  end loop;
  -- Mientras nadie responda, cada hora la botella suma 6 personas más (sin tope, ver bottle_cap).
  for r in
    select b.id, b.btype from bottles b join profiles o on o.id = b.owner
    where not b.hidden and not o.is_sample and b.created_at > now() - interval '7 days'
      and coalesce(b.grew_at, b.created_at) < now() - interval '1 hour'
      and (b.tide_day is null or now() >= ((b.tide_day + time '21:00') at time zone 'America/Lima') + interval '1 hour')
      and not exists (select 1 from convos c where c.bottle_id = b.id)
    order by coalesce(b.grew_at, b.created_at) limit 40 for update of b skip locked
  loop
    update bottles set grew_at = now() where id = r.id;
    n := least(6, bottle_cap(r.btype) - (select count(*) from deliveries where bottle_id = r.id)::int);
    if n > 0 then perform deliver(r.id, n); end if;
  end loop;
  -- 19:00: aviso a quien tiene botellas sin abrir que se van esta noche.
  if hr in (19, 20) then
    insert into jobs_done(job, day) values ('expiring', d) on conflict do nothing;
    if found then
      insert into notices(to_id, kind, title, body, go)
      select t.to_id, 'expiring', case when t.c = 1 then 'La marea se lleva una botella a las 21:00' else 'La marea se lleva ' || t.c || ' botellas a las 21:00' end,
        'Todavía no la' || case when t.c = 1 then '' else 's' end || ' abres. Escucha antes de que siga' || case when t.c = 1 then '' else 'n' end || ' su viaje.', 'orilla'
      from (select x.to_id, count(*) c from deliveries x join profiles p on p.id = x.to_id
            where x.status = 'waiting' and x.expires_at <= next_tide(now()) and x.expires_at > now() and not p.is_sample and not p.paused group by x.to_id) t;
    end if;
  end if;
  -- 21:00: llega la marea con las voces de la pregunta del día.
  if hr >= 21 then
    insert into jobs_done(job, day) values ('tide', d) on conflict do nothing;
    if found then perform tide_release(d); end if;
  end if;
  -- Conversaciones que se enfrían: aviso a quien le toca responder cuando quedan pocas horas.
  for r in
    select c.id, c.a, c.b, (select m.sender from messages m where m.convo_id = c.id and m.created_at <= now() and m.voice is not null order by m.created_at desc limit 1) as last_sender
    from convos c
    where not c.closed and not (c.key_a and c.key_b) and c.last_at < now() - interval '40 hours' and c.last_at > now() - interval '48 hours'
      and not exists (select 1 from notices x where x.kind = 'cooling' and x.ref = c.id::text and x.created_at > c.last_at)
    limit 50
  loop
    perform notify(case when r.last_sender = r.a then r.b else r.a end, 'cooling', 'Una conversación se enfría',
      'Si nadie responde en unas horas, vuelve al mar. Mándale una nota de voz.', 'chat', r.id::text);
  end loop;
  -- Botellas para dos que nadie completó: se cancelan y la botella vuelve a quien la empezó.
  for r in update duos set status = 'cancelled' where status = 'open' and expires_at < now() returning owner loop
    update profiles set bottles = bottles + 1 where id = r.owner;
    perform notify(r.owner, 'duo', 'Tu botella para dos venció', 'Nadie grabó la otra mitad. Te devolvimos tu botella.', 'mine');
  end loop;
  -- Lecturas que cumplieron sus 24 horas.
  for r in update lecturas set closed = true where not closed and closes_at < now() returning id, owner loop
    select count(*) into n from lectura_answers where lectura = r.id and status = 'ok';
    perform notify(r.owner, 'lectura', 'Tu lectura cerró', case when n = 0 then 'No llegaron respuestas esta vez.' when n = 1 then 'Recibiste 1 respuesta.' else 'Recibiste ' || n || ' respuestas.' end, 'lecturas', r.id::text);
  end loop;
  delete from notices where created_at < now() - interval '30 days';
end $$;
revoke execute on function public.tick() from public, anon, authenticated;

-- Con pg_cron y pg_net (los dos vienen en Supabase), las tareas corren cada minuto y el push sale a tiempo aunque nadie abra la app.
create or replace function public.cron_minute() returns void language plpgsql security definer set search_path = public as $$
declare site text;
begin
  perform tick();
  if exists (select 1 from notices n join push_subs s on s.user_id = n.to_id where n.pushed_at is null and n.at <= now())
     or exists (select 1 from lectura_answers where status = 'pending' and created_at < now() - interval '1 minute') then
    select value into site from server_kv where key = 'site';
    begin execute 'select net.http_post(url := $1, body := $2)' using site || '/api/tick', '{}'::jsonb; exception when others then null; end;
  end if;
end $$;
revoke execute on function public.cron_minute() from public, anon, authenticated;
do $$ begin
  begin create extension if not exists pg_net; exception when others then raise notice 'Sin pg_net: %', sqlerrm; end;
  begin create extension if not exists pg_cron; exception when others then raise notice 'Sin pg_cron: %', sqlerrm; end;
  begin execute $q$select cron.schedule('botella-minuto', '* * * * *', 'select public.cron_minute()')$q$; exception when others then raise notice 'Sin tareas por minuto: %', sqlerrm; end;
end $$;

-- ========== PUSH ==========
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_endpoint, '') !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'No se pudo activar los avisos.'; end if;
  insert into push_subs(endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
  delete from push_subs where user_id = auth.uid() and endpoint not in (select endpoint from push_subs where user_id = auth.uid() order by created_at desc limit 5);
end $$;
grant execute on function public.push_subscribe(text, text, text) to authenticated;
create or replace function public.push_unsubscribe(p_endpoint text) returns void language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint and user_id = auth.uid();
$$;
grant execute on function public.push_unsubscribe(text) to authenticated;
-- El servidor toma los avisos que ya tocan y los marca como enviados. Si la persona está con la app abierta, no se manda push.
create or replace function public.push_take(p_limit int default 60) returns table (id uuid, kind text, title text, body text, go text, ref text, endpoint text, p256dh text, auth text)
language sql security definer set search_path = public as $$
  with due as (
    update notices n set pushed_at = now() where n.id in (select x.id from notices x where x.pushed_at is null and x.at <= now() order by x.at limit p_limit for update skip locked)
    returning n.*)
  select due.id, due.kind, due.title, due.body, due.go, due.ref, s.endpoint, s.p256dh, s.auth
  from due join push_subs s on s.user_id = due.to_id join profiles p on p.id = due.to_id
  where due.at > now() - interval '3 hours' and p.last_seen < now() - interval '75 seconds';
$$;
create or replace function public.push_gone(p_endpoint text) returns void language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint;
$$;

-- ========== PRIMER DÍA ==========
-- La primera botella se escucha y se responde antes de crear la cuenta; al terminar el registro, la respuesta se envía.
create or replace function public.welcome_answer(p_bottle uuid, p_voice text, p_secs int, p_peaks jsonb default null)
returns table (convo uuid, rewarded boolean, left_bottles int) language plpgsql security definer set search_path = public as $$
declare did uuid;
begin
  if not exists (select 1 from bottles b join profiles o on o.id = b.owner where b.id = p_bottle and o.is_sample and not b.hidden) then raise exception 'Esta botella ya no está disponible.'; end if;
  if exists (select 1 from convos c where c.bottle_id = p_bottle and c.b = auth.uid()) then raise exception 'Ya respondiste esta botella.'; end if;
  insert into deliveries(bottle_id, to_id, status, opened_at) values (p_bottle, auth.uid(), 'opened', now())
    on conflict (bottle_id, to_id) do update set status = 'opened', opened_at = coalesce(deliveries.opened_at, now()) returning id into did;
  return query select * from answer_delivery(did, p_voice, p_secs, p_peaks);
end $$;
grant execute on function public.welcome_answer(uuid, text, int, jsonb) to authenticated;

-- Lo que la orilla necesita saber: la tarea del primer día, la pregunta de hoy y lo que falta para el próximo desbloqueo.
create or replace function public.home() returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; d date := lima_today(); heard boolean; answered boolean; launched boolean; just boolean := false; alive int;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then return null; end if;
  heard := exists (select 1 from deliveries where to_id = me.id and opened_at is not null);
  answered := exists (select 1 from convos where b = me.id);
  launched := exists (select 1 from bottles where me.id in (owner, partner));
  if heard and answered and launched and not me.quest_done then
    update profiles set quest_done = true, far_left = far_left + 1 where id = me.id and not quest_done returning * into me;
    just := me.id is not null;
    if just then perform notify(me.id, 'quest', 'Completaste tu primer día', 'Ganaste una botella que llega lejos: llega a 30 personas.', 'launch'); end if;
    select * into me from profiles where id = auth.uid();
  end if;
  alive := case when me.streak_day >= d - 1 then me.streak else 0 end;
  return jsonb_build_object(
    'quest', jsonb_build_object('heard', heard, 'answered', answered, 'launched', launched, 'done', me.quest_done, 'just', just),
    'streak', alive, 'today', me.streak_day = d, 'best', me.best_streak,
    'next', (select jsonb_build_object('days', p.days, 'label', p.label, 'kind', p.kind, 'item', p.item) from unlock_plan() p where p.days > alive order by p.days limit 1),
    'tide', jsonb_build_object('question', tide_question(d), 'arrived', extract(hour from now() at time zone 'America/Lima') >= 21,
      'answered', exists (select 1 from bottles where owner = me.id and tide_day = d), 'count', (select count(*) from bottles where tide_day = d and not hidden)),
    'lecturas', (select count(*) from lectura_answers a join lecturas l on l.id = a.lectura where l.owner = me.id and a.status = 'ok' and not a.heard),
    'far_left', me.far_left);
end $$;
grant execute on function public.home() to authenticated;

-- El mapa de tu voz: con qué temas conectó tu voz (los temas en común de quienes abrieron y respondieron).
create or replace function public.voice_map() returns jsonb language sql stable security definer set search_path = public as $$
  with o as (
    select coalesce(vibe(auth.uid(), p.id), 'Otros') as place, x.status from deliveries x join bottles b on b.id = x.bottle_id join profiles p on p.id = x.to_id
    where auth.uid() in (b.owner, b.partner) and x.opened_at <= now())
  select jsonb_build_object(
    'places', coalesce((select jsonb_agg(jsonb_build_object('place', t.place, 'opened', t.n, 'answered', t.a) order by t.n desc) from (select place, count(*) n, count(*) filter (where status = 'answered') a from o group by place) t), '[]'::jsonb),
    'heard', (select count(*) from o), 'answers', (select count(*) from o where status = 'answered'),
    'bottles', (select count(*) from bottles b where auth.uid() in (b.owner, b.partner)),
    'shores', (select count(*) from deliveries x join bottles b on b.id = x.bottle_id where auth.uid() in (b.owner, b.partner)));
$$;
grant execute on function public.voice_map() to authenticated;

-- ========== BOTELLA PARA DOS ==========
-- Grabas tu mitad, le mandas el link a un amigo y, cuando graba la suya, sale al mar con las dos voces. Llega a 6 orillas.
create or replace function public.duo_start(p_kind text, p_body text, p_voice text, p_secs int, p_peaks jsonb default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; tk text;
begin
  select * into me from profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  if p_kind is null or p_kind not in ('Pregunta','Confesión','Historia') then raise exception 'Ese tipo de botella no existe.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  if me.bottles < 1 then raise exception 'Te quedaste sin botellas. Responde una o pide más en el muelle.'; end if;
  if (select count(*) from duos where owner = me.id and status = 'open' and expires_at > now()) >= 2 then raise exception 'Ya tienes dos botellas para dos esperando a tu dúo.'; end if;
  insert into duos(owner, kind, body, voice, voice_secs, voice_peaks) values (me.id, p_kind, nullif(trim(p_body), ''), p_voice, least(greatest(p_secs, 1), 60), p_peaks) returning token into tk;
  update profiles set bottles = bottles - 1 where id = me.id returning * into me;
  return jsonb_build_object('token', tk, 'left_bottles', me.bottles);
end $$;
grant execute on function public.duo_start(text, text, text, int, jsonb) to authenticated;

create or replace function public.duo_peek(p_token text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('token', d.token, 'kind', d.kind, 'body', d.body, 'name', p.name, 'place', vibe(auth.uid(), d.owner), 'voice', d.voice, 'secs', d.voice_secs, 'peaks', d.voice_peaks,
    'status', case when d.status = 'open' and d.expires_at < now() then 'cancelled' else d.status end, 'mine', d.owner = auth.uid())
  from duos d join profiles p on p.id = d.owner where d.token = p_token;
$$;
grant execute on function public.duo_peek(text) to anon, authenticated;

create or replace function public.duo_join(p_token text, p_voice text, p_secs int, p_peaks jsonb default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare du duos; me profiles; o profiles; bid uuid; n int;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  select * into du from duos where token = p_token for update;
  if du.id is null or du.status <> 'open' or du.expires_at < now() then raise exception 'Esta botella para dos ya no está esperando.'; end if;
  if du.owner = me.id then raise exception 'Esta mitad es tuya: la otra la graba tu dúo.'; end if;
  if blocked(du.owner, me.id) then raise exception 'Esta botella para dos ya no está esperando.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  select * into o from profiles where id = du.owner;
  insert into bottles(owner, partner, kind, body, voice, voice_secs, voice_peaks, voice2, voice2_secs, voice2_peaks, glass)
    values (du.owner, me.id, du.kind, du.body, du.voice, du.voice_secs, du.voice_peaks, p_voice, least(greatest(p_secs, 1), 60), p_peaks, o.glass) returning id into bid;
  update duos set status = 'done', partner = me.id, bottle_id = bid where id = du.id;
  n := deliver(bid, 20);
  if n < 3 then n := n + sample_answer(bid); end if;
  perform notify(du.owner, 'duo', me.name || ' grabó su mitad', 'Su botella para dos ya está en el mar.', 'mine', bid::text);
  return jsonb_build_object('bottle', bid, 'shores', n);
end $$;
grant execute on function public.duo_join(text, text, int, jsonb) to authenticated;

create or replace function public.duo_cancel(p_token text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update duos set status = 'cancelled' where token = p_token and owner = auth.uid() and status = 'open';
  if found then update profiles set bottles = bottles + 1 where id = auth.uid(); end if;
  select bottles into n from profiles where id = auth.uid();
  return n;
end $$;
grant execute on function public.duo_cancel(text) to authenticated;

create or replace function public.my_duos() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('token', token, 'kind', kind, 'body', body, 'voice', voice, 'secs', voice_secs, 'peaks', voice_peaks, 'created_at', created_at, 'expires_at', expires_at) order by created_at desc), '[]'::jsonb)
  from duos where owner = auth.uid() and status = 'open' and expires_at > now();
$$;
grant execute on function public.my_duos() to authenticated;

-- ========== PIDE UNA LECTURA ==========
-- Solo preguntas guiadas: nadie escribe la suya, así no se usa para invitar ataques.
create or replace function public.lectura_questions() returns text[] language sql immutable as $$
  select array[
    '¿Qué es lo primero que pensaste de mí cuando me conociste?', '¿Qué recuerdo conmigo no se te olvida?', '¿Qué es lo que más te gusta de mí?',
    '¿Qué canción te hace pensar en mí?', 'Si me describieras con tres palabras, ¿cuáles serían?', '¿Qué crees que hago mejor que nadie?',
    '¿Qué momento conmigo te hizo reír más?', '¿Qué te da curiosidad de mí y nunca me preguntaste?', '¿Qué plan me propondrías para este fin de semana?',
    '¿En qué crees que he cambiado desde que me conoces?', '¿Qué te gustaría que hiciéramos juntos este año?', '¿Qué consejo me darías con cariño?'];
$$;
grant execute on function public.lectura_questions() to anon, authenticated;

create or replace function public.lectura_create(p_question text, p_voice text, p_secs int, p_peaks jsonb default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare me profiles; r lecturas;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Primero crea tu cuenta.'; end if;
  if not p_question = any(lectura_questions()) then raise exception 'Elige una de las preguntas de la lista.'; end if;
  if p_voice is null or split_part(p_voice, '/', 1) <> me.id::text then raise exception 'Falta tu nota de voz.'; end if;
  if (select count(*) from lecturas where owner = me.id and not closed and closes_at > now()) >= 3 then raise exception 'Ya tienes tres lecturas abiertas. Cierra una para pedir otra.'; end if;
  if (select count(*) from lecturas where owner = me.id and created_at > now() - interval '1 day') >= 6 then raise exception 'Pediste muchas lecturas hoy. Vuelve mañana.'; end if;
  insert into lecturas(owner, question, voice, voice_secs, voice_peaks) values (me.id, p_question, p_voice, least(greatest(p_secs, 1), 60), p_peaks) returning * into r;
  perform bump_streak(me.id);
  return jsonb_build_object('id', r.id, 'slug', r.slug, 'closes_at', r.closes_at);
end $$;
grant execute on function public.lectura_create(text, text, int, jsonb) to authenticated;

create or replace function public.my_lecturas() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'slug', l.slug, 'question', l.question, 'voice', l.voice, 'secs', l.voice_secs, 'peaks', l.voice_peaks,
    'open', not l.closed and l.closes_at > now(), 'closes_at', l.closes_at, 'created_at', l.created_at,
    'answers', (select count(*) from lectura_answers a where a.lectura = l.id and a.status = 'ok'),
    'fresh', (select count(*) from lectura_answers a where a.lectura = l.id and a.status = 'ok' and not a.heard),
    'filtered', (select count(*) from lectura_answers a where a.lectura = l.id and a.status = 'blocked'),
    'pending', (select count(*) from lectura_answers a where a.lectura = l.id and a.status = 'pending')) order by l.created_at desc), '[]'::jsonb)
  from (select * from lecturas where owner = auth.uid() order by created_at desc limit 30) l;
$$;
grant execute on function public.my_lecturas() to authenticated;

create or replace function public.lectura_inbox(p_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'voice', a.voice, 'secs', a.voice_secs, 'peaks', a.voice_peaks, 'at', a.created_at, 'heard', a.heard, 'name', p.name) order by a.created_at desc), '[]'::jsonb)
  from lectura_answers a join lecturas l on l.id = a.lectura left join profiles p on p.id = a.author where l.id = p_id and l.owner = auth.uid() and a.status = 'ok';
$$;
grant execute on function public.lectura_inbox(uuid) to authenticated;

create or replace function public.lectura_heard(p_answer uuid) returns void language sql security definer set search_path = public as $$
  update lectura_answers a set heard = true from lecturas l where a.id = p_answer and l.id = a.lectura and l.owner = auth.uid();
$$;
grant execute on function public.lectura_heard(uuid) to authenticated;

create or replace function public.lectura_close(p_id uuid) returns void language sql security definer set search_path = public as $$
  update lecturas set closed = true where id = p_id and owner = auth.uid();
$$;
grant execute on function public.lectura_close(uuid) to authenticated;

-- Quien pregunta manda: borra una respuesta, o la reporta y ese dispositivo no vuelve a responderle nunca.
create or replace function public.lectura_answer_delete(p_answer uuid) returns void language sql security definer set search_path = public as $$
  update lectura_answers a set status = 'deleted' from lecturas l where a.id = p_answer and l.id = a.lectura and l.owner = auth.uid() and a.status = 'ok';
$$;
grant execute on function public.lectura_answer_delete(uuid) to authenticated;

create or replace function public.lectura_answer_report(p_answer uuid, p_reason text default null) returns void language plpgsql security definer set search_path = public as $$
declare a lectura_answers;
begin
  select x.* into a from lectura_answers x join lecturas l on l.id = x.lectura where x.id = p_answer and l.owner = auth.uid() and x.status in ('ok', 'deleted');
  if a.id is null then return; end if;
  update lectura_answers set status = 'reported' where id = a.id;
  insert into lectura_blocks(owner, device, ip, ip_until) values (auth.uid(), a.device, a.ip, now() + interval '48 hours')
    on conflict (owner, device) do update set ip = excluded.ip, ip_until = excluded.ip_until;
  insert into reports(reporter, answer_id, reason) values (auth.uid(), a.id, left(coalesce(p_reason, 'Respuesta de lectura'), 300));
end $$;
grant execute on function public.lectura_answer_report(uuid, text) to authenticated;

-- Lo que ve quien abre el link, sin cuenta.
create or replace function public.lectura_peek(p_slug text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', l.slug, 'name', p.name, 'question', l.question, 'voice', l.voice, 'secs', l.voice_secs, 'peaks', l.voice_peaks,
    'open', not l.closed and l.closes_at > now(), 'closes_at', l.closes_at, 'mine', l.owner = auth.uid(),
    'answers', (select count(*) from lectura_answers a where a.lectura = l.id and a.status = 'ok'))
  from lecturas l join profiles p on p.id = l.owner where l.slug = p_slug;
$$;
grant execute on function public.lectura_peek(text) to anon, authenticated;

-- Las respuestas entran solo por el servidor (api/lectura.js), que las transcribe y las pasa por el filtro antes de entregarlas.
create or replace function public.lectura_take(p_slug text, p_device text, p_ip text) returns uuid language plpgsql security definer set search_path = public as $$
declare l lecturas;
begin
  select * into l from lecturas where slug = p_slug;
  if l.id is null or l.closed or l.closes_at < now() then raise exception 'Esta lectura ya cerró.'; end if;
  if coalesce(p_device, '') = '' then raise exception 'No se pudo enviar tu respuesta.'; end if;
  if exists (select 1 from lectura_blocks b where b.owner = l.owner and (b.device = p_device or (b.ip = p_ip and b.ip_until > now())))
     or (select count(*) from lectura_answers where device = p_device and status in ('blocked', 'reported') and created_at > now() - interval '30 days') >= 3 then
    raise exception 'No puedes responder esta lectura.';
  end if;
  if exists (select 1 from lectura_answers where lectura = l.id and device = p_device and status <> 'blocked') then raise exception 'Ya respondiste esta lectura.'; end if;
  if (select count(*) from lectura_answers where lectura = l.id and device = p_device) >= 3 then raise exception 'No puedes responder esta lectura.'; end if;
  if (select count(*) from lectura_answers where lectura = l.id) >= 150 then raise exception 'Esta lectura ya recibió muchas respuestas.'; end if;
  if (select count(*) from lectura_answers where lectura = l.id and ip = p_ip) >= 8
     or (select count(*) from lectura_answers where ip = p_ip and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Llegaron muchas respuestas desde tu red. Intenta más tarde.';
  end if;
  return l.id;
end $$;

drop function if exists public.lectura_put(uuid, text, int, jsonb, text, text, text, text, text);
create or replace function public.lectura_put(p_lectura uuid, p_voice text, p_secs int, p_peaks jsonb, p_device text, p_ip text, p_status text, p_reason text, p_transcript text, p_author uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare aid uuid; own uuid;
begin
  if p_author is not null and p_author = (select owner from lecturas where id = p_lectura) then raise exception 'Es tu propia lectura: compártela para que te respondan.'; end if;
  delete from lectura_answers where lectura = p_lectura and device = p_device and status = 'blocked' and p_status <> 'blocked';
  insert into lectura_answers(lectura, voice, voice_secs, voice_peaks, device, ip, status, reason, transcript)
    values (p_lectura, p_voice, least(greatest(p_secs, 1), 60), p_peaks, p_device, p_ip, p_status, left(p_reason, 200), left(p_transcript, 2000))
    on conflict (lectura, device) do update set author = coalesce(p_author, lectura_answers.author), voice = excluded.voice, voice_secs = excluded.voice_secs, voice_peaks = excluded.voice_peaks, status = excluded.status, reason = excluded.reason, transcript = excluded.transcript, created_at = now()
    returning id into aid;
  if p_author is not null then update lectura_answers set author = p_author where id = aid; end if;
  if p_status = 'ok' then
    select owner into own from lecturas where id = p_lectura;
    perform notify(own, 'lectura', 'Llegó una respuesta a tu lectura', 'Te contestaron con su voz. Escúchala.', 'lecturas', p_lectura::text);
  end if;
  return aid;
end $$;

drop function if exists public.lectura_pending(int);
create or replace function public.lectura_pending(p_limit int default 5) returns table (id uuid, voice text, question text) language sql security definer set search_path = public as $$
  select a.id, a.voice, l.question from lectura_answers a join lecturas l on l.id = a.lectura where a.status = 'pending' and a.created_at < now() - interval '30 seconds' order by a.created_at limit p_limit;
$$;
create or replace function public.lectura_resolve(p_id uuid, p_status text, p_reason text, p_transcript text) returns void language plpgsql security definer set search_path = public as $$
declare a lectura_answers; own uuid;
begin
  update lectura_answers set status = p_status, reason = left(p_reason, 200), transcript = left(p_transcript, 2000) where id = p_id and status = 'pending' returning * into a;
  if a.id is not null and p_status = 'ok' then
    select owner into own from lecturas where id = a.lectura;
    perform notify(own, 'lectura', 'Llegó una respuesta a tu lectura', 'Te contestaron con su voz. Escúchala.', 'lecturas', a.lectura::text);
  end if;
end $$;

-- Funciones que solo usa el servidor (api/*.js con la llave secreta): nadie más las ejecuta.
do $$ declare f text; begin
  foreach f in array array['push_take(int)', 'push_gone(text)', 'lectura_take(text, text, text)', 'lectura_put(uuid, text, int, jsonb, text, text, text, text, text, uuid)',
                           'lectura_pending(int)', 'lectura_resolve(uuid, text, text, text)'] loop
    execute 'revoke execute on function public.' || f || ' from public, anon, authenticated';
    begin execute 'grant execute on function public.' || f || ' to service_role'; exception when undefined_object then null; end;
  end loop;
end $$;
do $$ begin
  begin alter publication supabase_realtime add table public.notices; exception when duplicate_object then null; end;
end $$;

-- La app pregunta esto al abrir: si el servidor quedó desactualizado, lo dice en vez de fallar en silencio.
create or replace function public.app_version() returns int language sql immutable as $$ select 7 $$;
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

-- Voces que se escuchan con el link, sin cuenta: la pregunta de una lectura abierta y la primera mitad de una botella para dos.
create or replace function public.open_voice(p_path text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from lecturas l where l.voice = p_path and not l.closed and l.closes_at > now())
      or exists (select 1 from duos d where d.voice = p_path and d.status = 'open' and d.expires_at > now());
$$;
grant execute on function public.open_voice(text) to anon, authenticated;
-- Escuchas una nota si es tuya, si llegó a tu orilla, si está en una de tus conversaciones o si es una respuesta aprobada de tu lectura.
create or replace function public.can_hear(p_path text) returns boolean language sql stable security definer set search_path = public as $$
  select split_part(p_path, '/', 1) = auth.uid()::text
    or exists (select 1 from bottles b join deliveries d on d.bottle_id = b.id where p_path in (b.voice, b.voice2) and d.to_id = auth.uid() and not b.hidden)
    or exists (select 1 from bottles b where p_path in (b.voice, b.voice2) and auth.uid() in (b.owner, b.partner))
    or exists (select 1 from messages m join convos c on c.id = m.convo_id where m.voice = p_path and auth.uid() in (c.a, c.b))
    or exists (select 1 from profiles o join convos c on o.id in (c.a, c.b) where o.intro_voice = p_path and auth.uid() in (c.a, c.b) and c.reveal_a and c.reveal_b)
    or exists (select 1 from lectura_answers a join lecturas l on l.id = a.lectura where a.voice = p_path and l.owner = auth.uid() and a.status = 'ok')
    or public.open_voice(p_path);
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
drop policy if exists "escuchar voz con link" on storage.objects;
create policy "escuchar voz con link" on storage.objects for select to anon
  using (bucket_id = 'voice' and public.open_voice(name));

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
