-- Recorrido completo del mar contra Postgres local (después de mock.sql y schema.sql).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$ select set_config('request.uid', u::text, false) $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if c is not true then raise exception 'FALLÓ: %', msg; end if; raise notice 'ok · %', msg; end $$;

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
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 3 and (select color_left from profiles where id = auth.uid()) = 0 and (select tide_left from profiles where id = auth.uid()) = 1 and (select far_left from profiles where id = auth.uid()) = 1, 'regalo de bienvenida: 3 normales, 1 lejos, 1 dorada, ninguna de color, y el cliente no puede regalarse más');
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
select pg_temp.ok((select place from shore()) = 'Música', 'se ve un tema en común, ni el distrito ni el nombre');
select pg_temp.ok(can_hear('00000000-0000-0000-0000-000000000001/b1.m4a'), 'Beto puede escuchar la botella que le llegó');
select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select pg_temp.ok(not can_hear('00000000-0000-0000-0000-000000000001/b1.m4a'), 'Eli no puede escucharla');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select open_delivery((select id from shore()));
select pg_temp.ok((select status from shore()) = 'opened', 'quedó abierta');
select pg_temp.ok((select rewarded from answer_delivery((select id from shore()), '00000000-0000-0000-0000-000000000002/r1.m4a', 20)), 'responder regala una botella');
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 4, 'Beto ahora tiene 4');
select pg_temp.ok((select count(*) from shore()) = 0, 'la botella salió de su orilla');
select pg_temp.ok((select alias from my_convos()) = 'Alguien que ama la música', 'conversación anónima: se ve un tema en común');
select pg_temp.ok((select count(*) from messages) = 2, 'la conversación empieza con la botella y la respuesta');

-- Ana ve la respuesta
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.ok((select answers from my_bottles()) = 1, 'Ana ve 1 respuesta');
select pg_temp.ok((select alias from my_convos()) = 'Alguien que ama la música' and (select place from my_convos()) <> 'Barranco', 'Ana no ve el distrito de Beto');
select pg_temp.ok(can_hear('00000000-0000-0000-0000-000000000002/r1.m4a'), 'Ana escucha la respuesta');
insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos()), auth.uid(), '00000000-0000-0000-0000-000000000001/m2.m4a', 8);
do $$ begin begin insert into messages(convo_id, sender, body) values ((select id from my_convos()), auth.uid(), 'texto libre'); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
do $$ begin begin insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos()), '00000000-0000-0000-0000-000000000002', 'x/y.m4a', 3); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;

-- revelar nombres y llaves
select set_reveal((select id from my_convos()), true);
select pg_temp.ok(not (select revealed from my_convos()), 'revelar necesita a los dos');
do $$ begin begin perform set_key((select id from my_convos())); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%2 notas%' then raise; end if; end; end $$;
select pg_temp.ok((select my_voices = 2 and other_voices = 1 from my_convos()), 'la conversación cuenta las notas de cada uno: la llamada todavía está bloqueada');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos()), auth.uid(), '00000000-0000-0000-0000-000000000002/m3.m4a', 6);
select set_reveal((select id from my_convos()), true);
select pg_temp.ok((select alias from my_convos()) = 'Ana', 'con los dos, se ve el nombre');
select pg_temp.ok(not set_key((select id from my_convos())), 'una llave sola no abre la llamada');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
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
update deliveries set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where status = 'waiting';
update profiles set paused = false where id = '00000000-0000-0000-0000-000000000005';
update profiles set daily_day = lima_today() - 1 where id = '00000000-0000-0000-0000-000000000003';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.ok((select bottles from tide()) = 4, 'botella gratis del día');
reset role;
select pg_temp.ok(exists (select 1 from deliveries where status = 'drifted'), 'la marea movió las botellas viejas');
-- ya la respondieron (la persona de ejemplo): la botella cumplió y deja de viajar
select pg_temp.ok(not exists (select 1 from deliveries where to_id = '00000000-0000-0000-0000-000000000005'), 'ya respondida, deja de viajar');
-- sin respuesta, lo que vence sigue su viaje a otra persona
delete from convos where bottle_id = (select id from bottles where voice like '%b2.m4a');
update deliveries set status = 'waiting', expires_at = now() - interval '1 hour' where bottle_id = (select id from bottles where voice like '%b2.m4a') and status = 'drifted';
select tick();
select pg_temp.ok(exists (select 1 from deliveries where to_id = '00000000-0000-0000-0000-000000000005' and status = 'waiting'), 'sin respuesta, sigue llegando a gente nueva');

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
-- una persona nueva recibe botellas recientes que aún buscan orilla (las que nadie respondió todavía)
insert into bottles(owner, kind, voice, voice_secs) values ('00000000-0000-0000-0000-000000000001', 'Pregunta', '00000000-0000-0000-0000-000000000001/b4.m4a', 5);
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000006');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000006');
insert into profiles(id, name, district, code_used) values (auth.uid(), 'Fer', 'Lince', 'BOTELLA-01');
select tide();
select pg_temp.ok((select count(*) from shore()) >= 1, 'la persona nueva ya tiene botellas en su orilla');
reset role;
-- el tema que eliges al lanzar viaja con la botella: llega primero a quien ama ese tema
update profiles set bottles = bottles + 1 where id = '00000000-0000-0000-0000-000000000002';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.ok((select left_color from launch_bottle('Pregunta', null, '00000000-0000-0000-0000-000000000002/c1.m4a', 5, null, 'free', 'Arte')) = 0, 'una normal con tema, sin botellas de color');
reset role;
select pg_temp.ok((select target_topic = 'Arte' and target_district is null from bottles where voice like '%c1.m4a'), 'la botella guarda su tema y nunca un distrito');
select pg_temp.ok(exists (select 1 from deliveries d join bottles b on b.id = d.bottle_id where b.voice like '%c1.m4a' and d.to_id = '00000000-0000-0000-0000-000000000005'), 'la botella del Arte llegó a quien le gusta el Arte');
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
select pg_temp.ok((select tide_left from tide()) = 1 and (select gifts_left from profiles) = 1, 'regalo: 1 marea destacada y 1 botella de regalo');
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
insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos() limit 1), auth.uid(), '00000000-0000-0000-0000-000000000007/a2.m4a', 5);
select set_reveal((select id from my_convos() limit 1), true);
select pg_temp.ok((select revealed and intro_voice like 'seed/%' from my_convos() limit 1), 'al compartir mi nombre, la persona de ejemplo comparte el suyo');
select pg_temp.ok(set_key((select id from my_convos() limit 1)), 'con una persona de ejemplo la llamada se abre al poner mi llave');
-- regalo y plan
select pg_temp.ok(send_gift((select id from my_convos() limit 1)) = 0, 'mandé mi botella de regalo');
do $$ begin begin perform send_gift((select id from my_convos() limit 1)); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%de regalo%' then raise; end if; end; end $$;
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
select pg_temp.ok((select color_left from beta_get('color')) = 1, 'la app vieja todavía puede pedir una de color');
select pg_temp.ok((select far_left from beta_get('far')) = 2, 'una que llega lejos más');
select pg_temp.ok((select tide_left from beta_get('tide')) = 1, 'una marea destacada más');
select pg_temp.ok((select gifts_left from beta_get('gift')) = 1, 'una botella de regalo más');
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
select launch_bottle('Historia', null, '00000000-0000-0000-0000-000000000007/l2.m4a', 6);
select pg_temp.ok((select glass from bottles where voice like '%/l2.m4a') = 'ambar', 'la botella sale en mi vidrio');
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
select pg_temp.ok(app_version() = 7, 'versión del servidor');
reset role;

-- ===== volver: avisos, constancia, caducidad, marea, enfriamiento =====
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000008'),('00000000-0000-0000-0000-000000000009'),('00000000-0000-0000-0000-000000000010'),('00000000-0000-0000-0000-000000000011');
update profiles set paused = true where id = '00000000-0000-0000-0000-000000000007';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Hugo', 'Barranco', '{Música,Cine,Arte}', 'BOTELLA-01');
select pg_temp.as_user('00000000-0000-0000-0000-000000000009'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Inés', 'Lince', '{Música,Cine,Arte}', 'BOTELLA-01');
select pg_temp.as_user('00000000-0000-0000-0000-000000000010'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Juan', 'Surco', '{Música}', 'BOTELLA-01');
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok((select shores from launch_bottle('Pregunta', '¿Qué te da paz?', '00000000-0000-0000-0000-000000000008/v1.m4a', 9)) >= 2, 'Hugo lanza y llega a Inés y a Juan');
select pg_temp.ok((select streak from profiles) = 1, 'lanzar cuenta como día de constancia');
reset role;
select pg_temp.ok((select bool_and(d.expires_at >= d.created_at + interval '6 hours' and d.expires_at <= d.created_at + interval '30 hours' and extract(hour from d.expires_at at time zone 'America/Lima') = 21) from deliveries d join bottles b on b.id = d.bottle_id where b.voice like '%/v1.m4a'), 'cada botella caduca con una marea de las 21:00, entre 6 y 30 horas después');
select pg_temp.ok(next_tide('2026-11-15 12:00-05') = '2026-11-15 21:00-05' and next_tide('2026-11-15 21:30-05') = '2026-11-16 21:00-05', 'la próxima marea se calcula en hora de Lima');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select open_delivery((select id from shore() limit 1));
reset role;
select pg_temp.ok(exists (select 1 from notices where to_id = '00000000-0000-0000-0000-000000000008' and kind = 'opened' and title = 'Tu botella llegó a alguien que ama la música'), 'aviso: tu botella llegó a alguien que ama la música');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select answer_delivery((select id from shore() limit 1), '00000000-0000-0000-0000-000000000009/r1.m4a', 8);
reset role;
select pg_temp.ok(exists (select 1 from notices where to_id = '00000000-0000-0000-0000-000000000008' and kind = 'msg' and title = 'Respondieron tu botella' and body like 'Alguien que ama la música%'), 'aviso: respondieron tu botella');
select pg_temp.ok(not exists (select 1 from notices n join profiles p on p.id = n.to_id where p.is_sample), 'las personas de ejemplo no reciben avisos');
-- constancia: tercer día seguido desbloquea el vidrio coral
update profiles set streak = 2, streak_day = lima_today() - 1 where id = '00000000-0000-0000-0000-000000000009';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos() limit 1), auth.uid(), '00000000-0000-0000-0000-000000000009/r2.m4a', 5);
select pg_temp.ok((select streak = 3 and 'coral' = any(glasses) and tide_left >= 1 and unlocks @> array[2,3] from profiles), 'tres días seguidos: vidrio coral y una botella dorada');
select pg_temp.ok((select glass from beta_get('glass:coral')) = 'coral', 'puedo ponerme el vidrio que gané');
do $$ begin begin perform beta_get('glass:luna'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%días seguidos%' then raise; end if; end; end $$;
select pg_temp.ok((select (home()->>'streak')::int = 3 and (home()->'next'->>'days')::int = 5 from profiles), 'la orilla sabe mi racha y el próximo desbloqueo');
reset role;
select pg_temp.ok((select count(*) from notices where to_id = '00000000-0000-0000-0000-000000000009' and kind = 'unlock') = 2, 'cada desbloqueo avisa');
-- la racha se corta si pasa un día sin voz
update profiles set streak_day = lima_today() - 3 where id = '00000000-0000-0000-0000-000000000009';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select pg_temp.ok((home()->>'streak')::int = 0, 'sin voz ayer, la racha vuelve a cero');
-- enfriamiento: 48 horas sin respuesta
reset role;
update convos set last_at = now() - interval '41 hours' where a = '00000000-0000-0000-0000-000000000008' and b = '00000000-0000-0000-0000-000000000009';
select tick();
select pg_temp.ok((select count(*) from notices where kind = 'cooling' and to_id = '00000000-0000-0000-0000-000000000008') = 1, 'aviso a quien le toca responder cuando la conversación se enfría');
select tick();
select pg_temp.ok((select count(*) from notices where kind = 'cooling') = 1, 'el aviso de enfriamiento sale una sola vez');
update convos set last_at = now() - interval '49 hours' where a = '00000000-0000-0000-0000-000000000008' and b = '00000000-0000-0000-0000-000000000009';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok((select cooled from my_convos() limit 1), 'a las 48 horas la conversación vuelve al mar');
do $$ begin begin insert into messages(convo_id, sender, voice, voice_secs) values ((select id from my_convos() limit 1), auth.uid(), '00000000-0000-0000-0000-000000000008/z.m4a', 3); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
select send_gift((select id from my_convos() limit 1));
select pg_temp.ok(not (select cooled from my_convos() limit 1), 'una botella de regalo la reaviva');
-- caducidad: lo que no abrí se lo lleva la marea
reset role;
update deliveries set expires_at = now() - interval '1 minute' where to_id = '00000000-0000-0000-0000-000000000010' and status = 'waiting';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.ok((select count(*) from shore()) = 0, 'la botella que no abrí ya no está en mi orilla');
reset role;
select tick();
select pg_temp.ok((select status from deliveries where to_id = '00000000-0000-0000-0000-000000000010' limit 1) = 'drifted', 'la marea se la llevó');
-- la pregunta del día
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok((home()->'tide'->>'question') = tide_question(lima_today()) and length(tide_question(lima_today())) > 10, 'hay pregunta del día');
select pg_temp.ok(tide_answer('00000000-0000-0000-0000-000000000008/t1.m4a', 12) ? 'bottle', 'Hugo deja su voz para la marea');
do $$ begin begin perform tide_answer('00000000-0000-0000-0000-000000000008/t2.m4a', 12); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%Ya dejaste%' then raise; end if; end; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select tide_answer('00000000-0000-0000-0000-000000000009/t1.m4a', 10);
select pg_temp.ok((marea_now()->'today'->>'count')::int = 2 and (marea_now()->'today'->>'answered')::boolean, 'la marea de hoy ya tiene dos voces');
select pg_temp.ok((select held from my_bottles() where tide_day is not null) or extract(hour from now() at time zone 'America/Lima') >= 21, 'mi voz espera la marea');
reset role;
delete from deliveries where bottle_id in (select id from bottles where tide_day is not null);
select tide_release(lima_today());
select pg_temp.ok(exists (select 1 from deliveries d join bottles b on b.id = d.bottle_id where b.tide_day is not null and b.owner = '00000000-0000-0000-0000-000000000008' and d.to_id = '00000000-0000-0000-0000-000000000009'), 'a las 21:00 las voces llegan primero a quienes también respondieron');
select pg_temp.ok(exists (select 1 from notices where kind = 'tide' and to_id = '00000000-0000-0000-0000-000000000008' and body like '1 voz más respondió%')
  and exists (select 1 from notices where kind = 'tide' and to_id = '00000000-0000-0000-0000-000000000010' and body like '2 voces respondieron%Deja la tuya%'), 'todos reciben el aviso de la marea, con su versión');
update bottles set tide_day = case when extract(hour from now() at time zone 'America/Lima') >= 21 then lima_today() else lima_today() - 1 end where tide_day is not null;
delete from deliveries where bottle_id in (select id from bottles where tide_day is not null) and to_id = '00000000-0000-0000-0000-000000000010';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.ok(jsonb_array_length(marea_now()->'last'->'voices') = 2 and not (marea_now()->'last'->>'unlocked')::boolean, 'quien no dejó su voz ve las voces cerradas');
do $$ begin begin perform marea_take((select (v->>'bottle')::uuid from jsonb_array_elements(marea_now()->'last'->'voices') v limit 1)); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%marea%' then raise; end if; end; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok(marea_take((select (v->>'bottle')::uuid from jsonb_array_elements(marea_now()->'last'->'voices') v where not (v->>'mine')::boolean limit 1)) is not null, 'quien dejó su voz abre las de los demás');

-- ===== botella para dos =====
select pg_temp.ok(duo_start('Pregunta', '¿Playa o sierra?', '00000000-0000-0000-0000-000000000008/d1.m4a', 7) ? 'token', 'Hugo graba su mitad');
select pg_temp.ok((select bottles from profiles) = 1, 'y gasta una botella');
select pg_temp.ok(jsonb_array_length(my_duos()) = 1, 'la ve esperando a su dúo');
do $$ begin begin perform duo_join((my_duos()->0->>'token'), '00000000-0000-0000-0000-000000000008/d2.m4a', 5); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%tu dúo%' then raise; end if; end; end $$;
reset role; select token as tk from duos \gset
set role anon; select set_config('request.uid', '', false);
select pg_temp.ok((duo_peek(:'tk')->>'name') = 'Hugo' and open_voice('00000000-0000-0000-0000-000000000008/d1.m4a'), 'con el link se escucha la primera mitad sin cuenta');
reset role; set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select pg_temp.ok((duo_join(:'tk', '00000000-0000-0000-0000-000000000009/d2.m4a', 6)->>'shores')::int >= 1, 'Inés graba la otra mitad y la botella sale');
select pg_temp.ok((select duo from my_bottles() where body = '¿Playa o sierra?'), 'la botella para dos también es de Inés');
reset role;
select pg_temp.ok(not exists (select 1 from deliveries d join bottles b on b.id = d.bottle_id where b.voice2 is not null and d.to_id in ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009')), 'no le llega a ninguno de los dos');
select pg_temp.ok(not (select open_voice(voice) from duos), 'al completarse, la mitad deja de ser pública');
select pg_temp.ok(exists (select 1 from notices where kind = 'duo' and to_id = '00000000-0000-0000-0000-000000000008' and title = 'Inés grabó su mitad'), 'Hugo recibe el aviso');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.ok((select place = 'Música' and place2 = 'Música' and voice2 like '%/d2.m4a' from shore() where voice2 is not null), 'a Juan le llega con las dos voces y lo que comparte con cada una');
select pg_temp.ok(can_hear('00000000-0000-0000-0000-000000000009/d2.m4a'), 'Juan puede escuchar la segunda voz');
select answer_delivery((select id from shore() where voice2 is not null), '00000000-0000-0000-0000-000000000010/da.m4a', 9);
select pg_temp.ok((select count(*) from my_convos() where duo) = 2, 'responder a un dúo abre una conversación con cada uno');
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select pg_temp.ok((select count(*) from my_convos() where duo and i_launched) = 1 and (select answers from my_bottles() where duo) = 1, 'Inés recibe la respuesta en su propia conversación');
select pg_temp.ok((select count(*) from messages m where m.convo_id = (select id from my_convos() where duo) and m.body like '#bottle%') = 2, 'la conversación trae las dos voces del dúo');
-- un dúo que nadie completa devuelve la botella
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select duo_start('Historia', null, '00000000-0000-0000-0000-000000000010/d3.m4a', 7);
select pg_temp.ok(duo_cancel((my_duos()->0->>'token')) = 4, 'cancelar devuelve la botella');

-- ===== pide una lectura =====
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
do $$ begin begin perform lectura_create('Dime lo peor de mí', '00000000-0000-0000-0000-000000000008/q.m4a', 5); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%lista%' then raise; end if; end; end $$;
select pg_temp.ok(lectura_create((lectura_questions())[1], '00000000-0000-0000-0000-000000000008/q.m4a', 5) ? 'slug', 'Hugo pide una lectura con una pregunta guiada');
do $$ begin begin perform lectura_put((select id from lecturas), 'x', 3, null, 'd', 'i', 'ok', null, null); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
do $$ begin begin perform lectura_take('x', 'd', 'i'); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end; end $$;
reset role; select slug as sl from lecturas \gset
set role anon; select set_config('request.uid', '', false);
select pg_temp.ok((lectura_peek(:'sl')->>'open')::boolean and lectura_peek(:'sl')->>'name' = 'Hugo' and open_voice('00000000-0000-0000-0000-000000000008/q.m4a'), 'quien abre el link ve la pregunta y escucha la voz, sin cuenta');
reset role;
select pg_temp.ok(lectura_put(lectura_take((select slug from lecturas), 'dev-1', 'ip-1'), 'lectura/a1.m4a', 8, null, 'dev-1', 'ip-1', 'ok', null, 'me caíste súper bien') is not null, 'el servidor entrega una respuesta aprobada');
do $$ begin begin perform lectura_take((select slug from lecturas), 'dev-1', 'ip-1'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%Ya respondiste%' then raise; end if; end; end $$;
select lectura_put(lectura_take((select slug from lecturas), 'dev-2', 'ip-2'), 'lectura/a2.m4a', 8, null, 'dev-2', 'ip-2', 'blocked', 'insulto', '...');
select pg_temp.ok(lectura_take((select slug from lecturas), 'dev-2', 'ip-2') is not null, 'si el filtro frenó tu respuesta, puedes grabar otra');
select lectura_put((select id from lecturas), 'lectura/a3.m4a', 8, null, 'dev-2', 'ip-2', 'pending', null, null);
select pg_temp.ok((select count(*) from lectura_answers) = 2, 'una respuesta por dispositivo');
select lectura_resolve((select id from lectura_answers where status = 'pending'), 'ok', null, 'qué lindo eres');
select pg_temp.ok((select count(*) from notices where kind = 'lectura' and to_id = '00000000-0000-0000-0000-000000000008') = 2, 'cada respuesta aprobada avisa a quien preguntó');
-- con cuenta: la respuesta guarda quién fue y quien preguntó ve el nombre; nadie responde su propia lectura
select lectura_put(lectura_take((select slug from lecturas), 'u-1', 'ip-7'), 'lectura/a4.m4a', 6, null, 'u-1', 'ip-7', 'ok', null, 'hola', '00000000-0000-0000-0000-000000000001');
do $$ begin begin perform lectura_put((select id from lecturas), 'lectura/a5.m4a', 6, null, 'u-8', 'ip-8', 'ok', null, null, '00000000-0000-0000-0000-000000000008'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%propia lectura%' then raise; end if; end; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok((select count(*) from jsonb_array_elements(lectura_inbox((select id from lecturas))) e where e->>'name' = (select name from profiles where id = '00000000-0000-0000-0000-000000000001')) = 1, 'quien pregunta ve el nombre de quien respondió con cuenta');
reset role;
delete from lectura_answers where device = 'u-1';
select pg_temp.ok(check_code('L:' || (select slug from lecturas limit 1)) and not check_code('L:noexiste'), 'un link de lectura abierta sirve de invitación');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok((my_lecturas()->0->>'answers')::int = 2 and (my_lecturas()->0->>'fresh')::int = 2, 'Hugo ve dos respuestas nuevas');
select pg_temp.ok(can_hear('lectura/a1.m4a'), 'y puede escucharlas');
select pg_temp.ok(not exists (select 1 from lectura_answers), 'pero no puede leer la tabla: no sabe de qué dispositivo vino');
select pg_temp.as_user('00000000-0000-0000-0000-000000000009');
select pg_temp.ok(not can_hear('lectura/a1.m4a'), 'nadie más las escucha');
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select lectura_heard((lectura_inbox((my_lecturas()->0->>'id')::uuid)->0->>'id')::uuid);
select pg_temp.ok((my_lecturas()->0->>'fresh')::int = 1 and (home()->>'lecturas')::int = 1, 'al escucharla deja de ser nueva');
select lectura_answer_report((select (a->>'id')::uuid from jsonb_array_elements(lectura_inbox((my_lecturas()->0->>'id')::uuid)) a where a->>'voice' = 'lectura/a1.m4a'), 'Es ofensiva');
select pg_temp.ok((my_lecturas()->0->>'answers')::int = 1, 'reportar la saca de mi lista');
select lectura_create((lectura_questions())[2], '00000000-0000-0000-0000-000000000008/q2.m4a', 5);
reset role;
do $$ begin begin perform lectura_take((select slug from lecturas order by created_at desc limit 1), 'dev-1', 'ip-9'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%No puedes%' then raise; end if; end; end $$;
select pg_temp.ok(true, 'el dispositivo reportado no vuelve a responderle, aunque no sepa quién es');
select pg_temp.ok((select count(*) from reports where answer_id is not null) = 1, 'el reporte queda para revisar');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select lectura_close((my_lecturas()->1->>'id')::uuid);
reset role;
do $$ begin begin perform lectura_take((select slug from lecturas order by created_at limit 1), 'dev-5', 'ip-5'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%cerró%' then raise; end if; end; end $$;
update lecturas set closes_at = now() - interval '1 minute' where not closed;
select tick();
select pg_temp.ok((select bool_and(closed) from lecturas) and exists (select 1 from notices where kind = 'lectura' and title = 'Tu lectura cerró'), 'a las 24 horas la lectura se cierra sola');

-- ===== primer día y push =====
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000011'); insert into profiles(id, name, district, topics, code_used) values (auth.uid(), 'Kike', 'Miraflores', '{Música}', 'BOTELLA-01');
select pg_temp.ok((select convo from welcome_answer('5a5ab000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000011/w.m4a', 6)) is not null, 'la respuesta que grabó antes de registrarse se envía al crear la cuenta');
select pg_temp.ok((home()->'quest'->>'heard')::boolean and (home()->'quest'->>'answered')::boolean and not (home()->'quest'->>'launched')::boolean, 'tarea del primer día: ya escuchó y respondió, falta lanzar');
select launch_bottle('Pregunta', null, '00000000-0000-0000-0000-000000000011/l.m4a', 6);
select pg_temp.ok((home()->'quest'->>'just')::boolean, 'al lanzar completa su primer día');
select pg_temp.ok((select far_left from profiles) = 2, 'y gana una botella que llega lejos');
select pg_temp.ok(not (home()->'quest'->>'just')::boolean and (home()->'quest'->>'done')::boolean, 'el premio se entrega una sola vez');
select pg_temp.ok((voice_map()->>'bottles')::int = 1, 'el mapa de su voz cuenta su botella');
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select pg_temp.ok((select count(*) from jsonb_array_elements(voice_map()->'places') p where p->>'place' = 'Música') = 1 and not exists (select 1 from jsonb_array_elements(voice_map()->'places') p where p->>'place' in ('Lince','Surco','Barranco')) and (voice_map()->>'heard')::int >= 1, 'el mapa de Hugo muestra temas, nunca distritos');
select push_subscribe('https://push.example/hugo', 'k', 'a');
do $$ begin begin perform push_take(10); raise exception 'debió fallar'; exception when insufficient_privilege then null; end; end $$;
reset role;
select pg_temp.ok((select count(*) from push_take(500) where endpoint = 'https://push.example/hugo') = 0, 'con la app abierta no sale push');
update notices set pushed_at = null where to_id = '00000000-0000-0000-0000-000000000008'; update profiles set last_seen = now() - interval '10 minutes' where id = '00000000-0000-0000-0000-000000000008';
select pg_temp.ok((select count(*) from push_take(500) where endpoint = 'https://push.example/hugo') >= 3, 'con la app cerrada, los avisos salen por push');
select pg_temp.ok((select count(*) from push_take(500)) = 0, 'y cada aviso sale una sola vez');
-- mientras nadie responda, cada hora suma 6 personas más, hasta el tope
reset role;
delete from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a');
create temp table w2 as select count(*) n from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a');
update bottles set created_at = now() - interval '2 hours', grew_at = null where voice like '%011/l.m4a';
select tick();
select pg_temp.ok((select grew_at is not null from bottles where voice like '%011/l.m4a'), 'a la hora sin respuesta la botella suma gente');
select pg_temp.ok((select count(*) from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a')) between 1 and 6 and (select n from w2) = 0, 'suma hasta 6 personas por vez');
create temp table w3 as select count(*) n from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a');
select tick();
select pg_temp.ok((select count(*) from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a')) = (select n from w3), 'no vuelve a sumar antes de otra hora');
update bottles set grew_at = now() - interval '2 hours' where voice like '%011/l.m4a';
delete from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a');
select tick();
select pg_temp.ok((select count(*) from deliveries where bottle_id = (select id from bottles where voice like '%011/l.m4a')) >= 1, 'y otra hora después vuelve a sumar');
-- las doradas llegan a todas las orillas, sin importar el tema, y salen primero
update profiles set tide_left = 1, bottles = bottles + 1 where id = '00000000-0000-0000-0000-000000000011';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000011');
select launch_bottle('Pregunta', 'Una dorada', '00000000-0000-0000-0000-000000000011/oro.m4a', 6, null, 'free', 'Música', null, true);
reset role;
delete from deliveries where bottle_id = (select id from bottles where voice like '%011/oro.m4a') and to_id = '00000000-0000-0000-0000-000000000008';
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-000000000008');
select tide();
select pg_temp.ok((select featured from shore() limit 1), 'la dorada llegó a otra orilla y sale primero');
select pg_temp.ok((select topic from shore() limit 1) = 'Música', 'la botella trae su tema, que decide su color');
reset role;

-- avisos: varias personas abren la misma botella y queda un solo aviso con el resumen
insert into bottles(id, owner, kind, voice, voice_secs) values ('0000b000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001', 'Pregunta', '00000000-0000-0000-0000-000000000001/b9.m4a', 5);
insert into deliveries(bottle_id, to_id) values ('0000b000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000002'), ('0000b000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000005'), ('0000b000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000006');
update deliveries set status = 'opened', opened_at = now() where bottle_id = '0000b000-0000-4000-8000-000000000001';
select pg_temp.ok((select count(*) from notices where kind = 'opened' and ref = '0000b000-0000-4000-8000-000000000001') = 1, 'un solo aviso por botella');
select pg_temp.ok((select title from notices where kind = 'opened' and ref = '0000b000-0000-4000-8000-000000000001') = '3 personas escucharon tu botella', 'el aviso dice cuántas la escucharon');
\echo 'TODO OK'
