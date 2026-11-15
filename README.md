# Botella · beta

Lanza tu voz al mar: grabas una pregunta, llega a tres personas afines y quien quiere, te responde con su voz.

PWA estática sin build: `index.html`, `app.js` (base, voz, dibujo del mar), `screens.js` (pantallas), `extras.js` (muelle, marea destacada, salidas, regalos, planes), `more.js` (primer día, constancia, pregunta de la marea, mapa de tu voz, botella para dos, lecturas, avisos push), `live.js` (llamadas, avisos en vivo, arranque), `styles.css` (estilo del prototipo) y `app.css`.
Backend: Supabase (auth, Postgres con RLS, Storage para notas de voz, Realtime para avisos y señalización de llamadas) y funciones de Vercel en `api/` (avisos push y filtro de las lecturas).

## Puesta en marcha
1. Supabase > SQL Editor: pegar `supabase/schema.sql` completo y Run (se puede volver a correr).
2. Supabase > Authentication > Sign In / Providers > Email: apagar **Confirm email**.
3. Supabase > Authentication > URL Configuration: poner la URL de Vercel como Site URL (para el correo de "olvidé mi contraseña").
4. Completar `config.js` con el Project URL y la publishable (anon) key.
5. Vercel: importar el repo, sin build (Framework: Other).
6. Vercel > Settings > Environment Variables (Production), y luego Redeploy:
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase > Project Settings > API Keys > `service_role` (o la secret key). Solo vive en el servidor.
   - `GROQ_API_KEY`: de console.groq.com > API Keys. Transcribe y filtra las respuestas anónimas de las lecturas.
   - Opcional: `SITE_URL` con tu dominio (por defecto usa el de Vercel).
   Para comprobar: abre `https://<tu-dominio>/api/health`. Debe decir `"push":true,"lectura":true`.
7. Supabase > Database > Extensions: activar **pg_cron** y **pg_net** y volver a correr `schema.sql`. Así la marea de las 21:00, los avisos y el cierre de lecturas corren cada minuto. Sin ellas igual funciona, pero solo cuando alguien abre la app (y una vez al día por el cron de Vercel).

Código de invitación inicial: `BOTELLA-01` (hasta 150 usos). Link de invitación: `https://<tu-dominio>/?c=BOTELLA-01`.
Más códigos: `insert into codes(code) values ('AMIGOS-02');`

## Qué revisar en el panel
- `reports`: reportes de botellas, conversaciones y respuestas de lecturas (marcar `reviewed`).
- `lectura_answers` con `status = 'blocked'`: lo que frenó el filtro, con el motivo y la transcripción (el audio no se guarda).
- `bottles.hidden = true` apaga una botella. Una botella con 2 reportes se apaga sola.

## Pruebas
- Reglas del servidor contra Postgres local: `PGHOST=... PGPORT=... PGUSER=... sh supabase/test/run.sh`
- Recorrido completo de la interfaz con cliente falso: `node test/smoke.js shots`

## Personas de ejemplo (beta)
Mientras llega gente, 12 personas de ejemplo con voces sintéticas (Kokoro y Piper, libres) llenan la orilla, responden tus botellas,
aceptan llamadas de ejemplo y planes. Se ven marcadas como "de ejemplo". Las voces están en `seed/v/` y se regeneran con
`seed/src/make_voices.py` + `seed/src/make_sql.py`. Para apagarlas:
`update public.bottles set hidden = true where owner in (select id from public.profiles where is_sample);`

## Actualizar la base de datos sola
Agrega en GitHub > Settings > Secrets and variables > Actions el secreto `SUPABASE_DB_URL` (Supabase > Connect > Session pooler > URI).
Desde ahí, cada cambio a `supabase/schema.sql` se aplica solo. Sin el secreto, hay que pegar el archivo en el SQL Editor.

## Volver y traer a otros
- **Primer minuto**: en la bienvenida, "Escuchar una botella" abre una botella de ejemplo antes de registrarse. Si respondes, tu voz sale al crear la cuenta y te contestan en un minuto.
- **Tu primer día**: escuchar, responder y lanzar. Al completarlo ganas una botella que llega lejos.
- **La marea de las 21:00**: una pregunta del día para todos. Tu voz sale a las 21:00 y abre las voces de los demás. Las botellas sin abrir se van con la marea.
- **Constancia**: cada día que usas tu voz suma. Vidrios y regalos se ganan con días seguidos, no se compran (`unlock_plan()` en el schema).
- **Conversaciones por etapas**: Voces → Nombres → Llamada → Plan. La llamada se abre con 2 notas de voz de cada uno; el plan, después de hablar. Sin respuesta en 48 horas la conversación vuelve al mar.
- **Botella para dos** (`?d=`) y **Pide una lectura** (`?l=`): links para compartir. Las lecturas se responden sin cuenta, solo mayores de 18, con filtro antes de entregar y el dueño puede borrar, reportar (bloquea ese celular) y cerrar. Duran 24 horas.
- **Avisos push**: en iPhone solo funcionan con Botella agregada a la pantalla de inicio (iOS 16.4 o más).
