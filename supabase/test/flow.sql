-- Recorrido completo del mar contra Postgres local (después de mock.sql y schema.sql).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$ select set_config('request.uid', u::text, false) $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not c then raise exception 'FALLÓ: %', msg; end if; raise notice 'ok · %', msg; end $$;

insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004'),('00000000-0000-0000-0000-000000000005');

-- El recorrido base corre sin las personas de ejemplo; al final se prueban aparte.
update bottles set hidden = true where owner in (select id from profiles where is_sample);
set role authenticated;
-- código inválido
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin insert into profiles(id, name, district, code_used) values (auth.uid(), 'Ana', 'Lince', 'NOPE'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%código%' then raise; end if; end;
end $$;
select pg_temp.ok(check_code('botella-01'), 'código en minúsculas vale');

-- cinco personas: 1 y 2 comparten temas
do $$ begin begin insert into profiles(id, name, district, topics, code_used, bottles) values (auth.uid(), 'Ana', 'Lince', '{Música,Cine,Libros}', 'botella-01', 99); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
do $$ begin begin insert into profiles(id, name, district, code_used, is_sample) values (auth.uid(), 'Ana', 'Lince', 'x', true); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Ana', 'Lince', '{Música,Cine,Libros}', 'botella-01');
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 3 and (select color_left from profiles where id = auth.uid()) = 2 and (select far_left from profiles where id = auth.uid()) = 1, 'regalo de bienvenida: 3 normales, 2 de color, 1 lejos, y el cliente no puede regalarse más');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Beto', 'Barranco', '{Música,Cine,Libros}', 'BOTELLA-01');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Cami', 'Surco', '{Música,Cine}', 'BOTELLA-01');
select pg_temp.as_user('00000000-0000-0000-0000-000000000004'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Dani', 'Lince', '{Fútbol}', 'BOTELLA-01');
select pg_temp.as_user('00000000-0000-0000-0000-000000000005'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Eli', 'Magdalena', '{Arte}', 'BOTELLA-01');
update profiles set paused = true where id = auth.uid();

-- privacidad: no veo perfiles ajenos ni puedo tocar mi saldo
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.ok((select count(*) from profiles) = 1, 'solo veo mi perfil');
do $$ begin begin update profiles set bottles = 50 where id = auth.uid(); raise exception 'debió fallar'; exception when insufficient_privilege then null; end; end $$;
select pg_temp.ok((select count(*) from tide()) = 1, 'la marea devuelve mi perfil');

-- lanzar: voz ajena no vale
do $$ begin begin perform launch_bottle('Pregunta', 'x', '00000000-0000-0000-0000-000000000002/a.m4a', 10); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%voz%' then raise; end if; end; end $$;
select pg_temp.ok((select shores from launch_bottle('Pregunta', '¿Cuál es tu lugar secreto en Lima?', '00000000-0000-0000-0000-000000000001/b1.m4a', 12)) = 3, 'llega a 3 orillas');
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 2, 'gasté una botella');
select pg_temp.ok((select count(*) from bottles) = 1, 'veo mi botella');
select pg_temp.ok((select shores from my_bottles()) = 3, 'mis botellas cuenta 3 orillas');
reset role;
select pg_temp.ok(not exists (select 1 from deliveries where to_id = '00000000-0000-0000-0000-000000000005'), 'la persona en pausa no recibe');
select pg_temp.ok(not exists (select 1 from deliveries where to_id = '00000000-0000-0000-0000-000000000001'), 'nunca me llega mi propia botella');
set role authenticated;

-- Beto abre y escucha
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.ok((select count(*) from shore()) = 1, 'Beto tiene 1 botella en su orilla');
select pg_temp.ok((select place from shore()) = 'Lince', 'se ve el distrito, no el nombre');
select pg_temp.ok(can_hear('00000000-0000-0000-0000-000000000001/b1.m4a'), 'Beto puede escuchar la botella que le llegó');
select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select pg_temp.ok(not can_hear('00000000-0000-0000-0000-000000000001/b1.m4a'), 'Eli no puede escucharla');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select open_delivery((select id from shore()));
select pg_temp.ok((select status from shore()) = 'opened', 'quedó abierta');
select pg_temp.ok((select rewarded from answer_delivery((select id from shore()), '00000000-0000-0000-0000-000000000002/r1.m4a', 20)), 'responder regala una botella');
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 4, 'Beto ahora tiene 4');
select pg_temp.ok((select count(*) from shore()) = 0, 'la botella salió de su orilla');
select pg_temp.ok((select alias from my_convos()) = 'Alguien de Lince', 'conversación anónima');
select pg_temp.ok((select count(*) from messages) = 2, 'la conversación empieza con la botella y la respuesta');

-- Ana ve la respuesta
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.ok((select answers from my_bottles()) = 1, 'Ana ve 1 respuesta');
select pg_temp.ok((select alias from my_convos()) = 'Alguien de Barranco', 'Ana ve a Alguien de Barranco');
select pg_temp.ok(can_hear('00000000-0000-0000-0000-000000000002/r1.m4a'), 'Ana escucha la respuesta');
insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos()), auth.uid(), '00000000-0000-0000-0000-000000000001/m2.m4a', 8);
do $$ begin begin insert into messages(convo_id, sender, body) values ((select id from my_convos()), auth.uid(), 'texto libre'); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
do $$ begin begin insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos()), '00000000-0000-0000-0000-000000000002', 'x/y.m4a', 3); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;

-- revelar nombres y llaves
select set_reveal((select id from my_convos()), true);
select pg_temp.ok(not (select revealed from my_convos()), 'revelar necesita a los dos');
select pg_temp.ok(not set_key((select id from my_convos())), 'una llave sola no abre la llamada');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select set_reveal((select id from my_convos()), true);
select pg_temp.ok((select alias from my_convos()) = 'Ana', 'con los dos, se ve el nombre');
select pg_temp.ok(set_key((select id from my_convos())), 'dos llaves abren la llamada');

-- Cami devuelve al mar: la botella busca otra orilla (Dani ya la tiene, Eli en pausa: no hay más)
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select return_delivery((select id from shore()));
select pg_temp.ok((select count(*) from shore()) = 0, 'Cami la devolvió');

-- Dani reporta: deja de verla y bloquea a Ana
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select report_delivery((select id from shore()), 'Me incomodó');
select pg_temp.ok((select count(*) from shore()) = 0, 'Dani ya no la ve');

-- Ana lanza otra: Dani (bloqueado) no la recibe
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select launch_bottle('Historia', null, '00000000-0000-0000-0000-000000000001/b2.m4a', 5);
reset role;
select pg_temp.ok(not exists (select 1 from deliveries d join bottles b on b.id = d.bottle_id where b.voice like '%b2.m4a' and d.to_id = '00000000-0000-0000-0000-000000000004'), 'bloqueado no recibe');
select pg_temp.ok((select count(*) from reports) = 1, 'quedó el reporte para revisar');

-- marea: lo que nadie abrió en 24 h sigue viaje
update deliveries set created_at = now() - interval '25 hours' where status = 'waiting';
update profiles set paused = false where id = '00000000-0000-0000-0000-000000000005';
update profiles set daily_day = lima_today() - 1 where id = '00000000-0000-0000-0000-000000000003';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.ok((select bottles from tide()) = 4, 'botella gratis del día');
reset role;
select pg_temp.ok(exists (select 1 from deliveries where status = 'drifted'), 'la marea movió las botellas viejas');
select pg_temp.ok(exists (select 1 from deliveries where to_id = '00000000-0000-0000-0000-000000000005' and status = 'waiting'), 'llegaron a una orilla nueva');

-- límite de premios: 3 por día
update profiles set earned = 3, earned_day = lima_today() where id = '00000000-0000-0000-0000-000000000005';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select pg_temp.ok(not (select rewarded from answer_delivery((select id from shore() limit 1), '00000000-0000-0000-0000-000000000005/r.m4a', 9)), 'después de 3 respuestas ya no hay premio');

-- bloquear desde el chat cierra la conversación
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select block_convo((select id from my_convos()), 'Spam');
select pg_temp.ok((select closed from my_convos()), 'conversación cerrada');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin begin insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos() where closed limit 1), auth.uid(), '00000000-0000-0000-0000-000000000001/z.m4a', 3); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;

-- borrar cuenta
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select delete_me();
reset role;
select pg_temp.ok(not exists (select 1 from profiles where id = '00000000-0000-0000-0000-000000000003'), 'cuenta borrada');
-- una persona nueva recibe botellas recientes que aún buscan orilla
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000006');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000006');
insert into profiles(id, name, district, code_used) values (auth.uid(), 'Fer', 'Lince', 'BOTELLA-01');
select tide();
select pg_temp.ok((select count(*) from shore()) >= 1, 'la persona nueva ya tiene botellas en su orilla');
reset role;
-- botella de color: llega primero a quien tiene ese tema
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin begin perform launch_bottle('Pregunta', null, '00000000-0000-0000-0000-000000000002/c0.m4a', 5, null, 'color'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%Elige%' then raise; end if; end; end $$;
select pg_temp.ok((select left_color from launch_bottle('Pregunta', null, '00000000-0000-0000-0000-000000000002/c1.m4a', 5, null, 'color', 'Arte')) = 1, 'gasté una de color');
reset role;
select pg_temp.ok(exists (select 1 from deliveries d join bottles b on b.id = d.bottle_id where b.voice like '%c1.m4a' and d.to_id = '00000000-0000-0000-0000-000000000005'), 'la de color llegó a quien le gusta el Arte');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.ok((select left_far from launch_bottle('Historia', null, '00000000-0000-0000-0000-000000000002/f1.m4a', 5, null, 'far')) = 0, 'gasté la que llega lejos');
do $$ begin begin perform launch_bottle('Historia', null, '00000000-0000-0000-0000-000000000002/f2.m4a', 5, null, 'far'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%lejos%' then raise; end if; end; end $$;
reset role;
-- ===== personas de ejemplo =====
update bottles set hidden = false where owner in (select id from profiles where is_sample);
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000007');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000007');
insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Gabi', 'Surco', '{Música,Viajes,Arte}', 'BOTELLA-01');
select pg_temp.ok((select tide_left from tide()) = 1 and (select gifts_left from profiles) = 1, 'regalo: 1 marea destacada y 1 lacre');
select pg_temp.ok((select count(*) from shore()) >= 3, 'la orilla nueva nunca está vacía: llegan botellas de ejemplo');
select pg_temp.ok((select bool_and(sample) from shore() where voice like 'seed/%'), 'las de ejemplo vienen marcadas');
select pg_temp.ok((select rewarded from answer_delivery((select id from shore() where sample limit 1), '00000000-0000-0000-0000-000000000007/a1.m4a', 7)), 'responder una de ejemplo también regala botella');
select pg_temp.ok((select count(*) from messages where convo_id = (select id from my_convos() limit 1)) = 2, 'su respuesta todavía no se ve');
select pg_temp.ok((select next_at from my_convos() limit 1) > now(), 'la app sabe cuándo llega su respuesta');
reset role;
update messages set created_at = clock_timestamp() where created_at > now();
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000007');
select pg_temp.ok((select count(*) from messages where convo_id = (select id from my_convos() limit 1)) = 3, 'la persona de ejemplo respondió con su voz');
select pg_temp.ok(not (select last_mine from my_convos() limit 1), 'queda como no leída');
select pg_temp.ok((select sample and call_voice like 'seed/%' from my_convos() limit 1), 'la conversación sabe que es de ejemplo y trae su saludo');
select set_reveal((select id from my_convos() limit 1), true);
select pg_temp.ok((select revealed and intro_voice like 'seed/%' from my_convos() limit 1), 'al compartir mi nombre, la persona de ejemplo comparte el suyo');
select pg_temp.ok(set_key((select id from my_convos() limit 1)), 'con una persona de ejemplo la llamada se abre al poner mi llave');
-- regalo y plan
select pg_temp.ok(send_gift((select id from my_convos() limit 1)) = 0, 'mandé mi botella con lacre');
do $$ begin begin perform send_gift((select id from my_convos() limit 1)); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%lacre%' then raise; end if; end; end $$;
select send_plan((select id from my_convos() limit 1), 'Un café frente al mar', 'Este sábado, 5 p.m.');
reset role;
update messages set created_at = clock_timestamp() where created_at > now();
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000007');
select pg_temp.ok(exists (select 1 from messages where body = '#planok|'), 'la persona de ejemplo aceptó el plan');
-- lanzar con pocos: alguien de ejemplo responde
reset role;
update profiles set paused = true where not is_sample and id <> '00000000-0000-0000-0000-000000000007';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000007');
select pg_temp.ok((select shores from launch_bottle('Pregunta', '¿Qué te hace feliz?', '00000000-0000-0000-0000-000000000007/l1.m4a', 6, null, 'free', null, null, true)) >= 1, 'mi botella llega a alguien aunque seamos pocos');
select pg_temp.ok((select tide_left from profiles) = 0, 'usé mi marea destacada');
select pg_temp.ok((select count(*) from my_convos() where i_launched) = 0, 'la conversación aparece recién cuando responde');
reset role;
update messages set created_at = clock_timestamp() where created_at > now();
update deliveries set opened_at = clock_timestamp() where opened_at > now();
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000007');
select pg_temp.ok((select count(*) from my_convos() where i_launched) = 1, 'alguien de ejemplo respondió mi botella');
select pg_temp.ok((select answers from my_bottles() where body = '¿Qué te hace feliz?') = 1, 'mis botellas cuenta su respuesta');
select pg_temp.ok((select openers from my_bottles() where body = '¿Qué te hace feliz?') is null, 'sin "quién la abrió" no veo quién');
-- muelle
select pg_temp.ok((select bottles from beta_get('p10')) >= 10, 'pack de 10 botellas');
select pg_temp.ok((select color_left from beta_get('color')) = 3, 'una de color más');
select pg_temp.ok((select far_left from beta_get('far')) = 2, 'una que llega lejos más');
select pg_temp.ok((select tide_left from beta_get('tide')) = 1, 'una marea destacada más');
select pg_temp.ok((select gifts_left from beta_get('gift')) = 1, 'una botella con lacre más');
select pg_temp.ok((select glass from beta_get('glass:ambar')) = 'ambar', 'vidrio ámbar');
select pg_temp.ok((select who_open from beta_get('who')), 'quién la abrió activado');
select pg_temp.ok(jsonb_array_length((select openers from my_bottles() where body = '¿Qué te hace feliz?')) = 1, 'ahora veo desde qué distrito la abrieron');
select pg_temp.ok((select captain from beta_get('captain')), 'plan Capitán');
do $$ begin begin perform beta_get('gratis-todo'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%muelle%' then raise; end if; end; end $$;
reset role;
update profiles set daily_day = lima_today() - 1, bottles = 20 where id = '00000000-0000-0000-0000-000000000007';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000007');
select pg_temp.ok((select bottles from tide()) = 23, 'Capitán: 3 botellas al día y no se pierden las compradas');
select pg_temp.ok((select glass from launch_bottle('Historia', null, '00000000-0000-0000-0000-000000000007/l2.m4a', 6) l join bottles b on b.id = l.bottle) = 'ambar', 'la botella sale en mi vidrio');
-- marea
select pg_temp.ok((select count(*) from marea() where sample) >= 2, 'la marea trae botellas destacadas');
select pg_temp.ok(marea_take((select bottle from marea() where taken is null and not mine limit 1)) is not null, 'abrir una de la marea la trae a mi orilla');
-- salidas
select pg_temp.ok((select count(*) from outings_list()) = 3, 'hay salidas de ejemplo');
select pg_temp.ok((select bool_and(starts_at > now()) from outings_list()), 'las salidas de ejemplo siempre están por venir');
select outing_join((select id from outings_list() limit 1), true);
select pg_temp.ok((select joined from outings_list() limit 1), 'me apunté a una salida');
select outing_join((select id from outings_list() limit 1), false);
select pg_temp.ok(not (select joined from outings_list() limit 1), 'me desapunté');
select pg_temp.ok(outing_create('Atardecer en Barranco', 'Puente de los Suspiros', now() + interval '2 days', 6, 'Vamos a ver el atardecer') is not null, 'propuse una salida');
select pg_temp.ok((select count(*) from outings_list() where mine) = 1, 'veo mi salida');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select outing_join((select id from outings_list() where name = 'Atardecer en Barranco'), true);
select pg_temp.ok((select taken from outings_list() where name = 'Atardecer en Barranco') = 2, 'alguien se apuntó a mi salida');
select pg_temp.ok(app_version() = 3, 'versión del servidor');
reset role;
\echo 'TODO OK'
