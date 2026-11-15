# Botella · beta

Lanza tu voz al mar: grabas una pregunta, llega a tres personas afines y quien quiere, te responde con su voz.

PWA estática sin build: `index.html`, `app.js` (base, voz, dibujo del mar), `screens.js` (pantallas), `live.js` (llamadas, avisos en vivo, arranque), `styles.css` (estilo del prototipo) y `app.css`.
Backend: Supabase (auth, Postgres con RLS, Storage para notas de voz, Realtime para avisos y señalización de llamadas).

## Puesta en marcha
1. Supabase > SQL Editor: pegar `supabase/schema.sql` completo y Run (se puede volver a correr).
2. Supabase > Authentication > Sign In / Providers > Email: apagar **Confirm email**.
3. Supabase > Authentication > URL Configuration: poner la URL de Vercel como Site URL (para el correo de "olvidé mi contraseña").
4. Completar `config.js` con el Project URL y la publishable (anon) key.
5. Vercel: importar el repo, sin build (Framework: Other).

Código de invitación inicial: `BOTELLA-01` (hasta 150 usos). Link de invitación: `https://<tu-dominio>/?c=BOTELLA-01`.
Más códigos: `insert into codes(code) values ('AMIGOS-02');`

## Qué revisar en el panel
- `reports`: reportes de botellas y conversaciones (marcar `reviewed`).
- `bottles.hidden = true` apaga una botella. Una botella con 2 reportes se apaga sola.

## Pruebas
- Reglas del servidor contra Postgres local: `PGHOST=... PGPORT=... PGUSER=... sh supabase/test/run.sh`
- Recorrido completo de la interfaz con cliente falso: `node test/smoke.js shots`
