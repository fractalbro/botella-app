-- Recorrido completo del mar contra Postgres local (después de mock.sql y schema.sql).
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$ select set_config('request.uid', u::text, false) $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not c then raise exception 'FALLÓ: %', msg; end if; raise notice 'ok · %', msg; end $$;

insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004'),('00000000-0000-0000-0000-000000000005');

set role authenticated;
-- código inválido
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
do $$ begin
  begin insert into profiles(id, name, district, code_used) values (auth.uid(), 'Ana', 'Lince', 'NOPE'); raise exception 'debió fallar';
  exception when others then if sqlerrm not like '%código%' then raise; end if; end;
end $$;
select pg_temp.ok(check_code('botella-01'), 'código en minúsculas vale');

-- cinco personas: 1 y 2 comparten temas
insert into profiles(id, name, district, topics, code_used, bottles) values (auth.uid(), 'Ana', 'Lince', '{Música,Cine,Libros}', 'botella-01', 99);
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 2, 'el cliente no puede regalarse botellas');
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
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 1, 'gasté una botella');
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
select pg_temp.ok((select bottles from profiles where id = auth.uid()) = 3, 'Beto ahora tiene 3');
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
select pg_temp.ok((select bottles from tide()) = 3, 'botella gratis del día');
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
\echo 'TODO OK'
