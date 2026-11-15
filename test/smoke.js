// Prueba de humo: recorre toda la app en un iPhone simulado con un Supabase falso y guarda capturas.
// Uso: node test/smoke.js <carpeta-de-capturas>
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || path.join(root, 'shots'); fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; if (p === '/vendor/supabase.js') p = '/test/fake-supabase.js';
  if (p === '/config.js') { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end("window.BOTELLA={url:'https://t.supabase.co',key:'k'}"); }
  fs.readFile(root + p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'text/plain' }); r.end(d); });
}).listen(4610);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices[process.env.DEVICE || 'iPhone 13'], permissions: ['microphone'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = [];
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts/.test(m.text())) errs.push('CON ' + m.text()); });
  let n = 0; const shot = async name => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const tap = async (sel, t) => { const l = t ? p.locator(sel, { hasText: t }) : p.locator(sel); await l.first().click({ timeout: 5000 }); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { errs.push(`STEP ${name}: ${e.message.split('\n')[0]}`); await shot('FAIL-' + name); } };
  const record = async (ms = 2600) => { await tap('.screen:not(.exiting) .rec .mic'); await p.waitForTimeout(ms); await tap('.screen:not(.exiting) .rec .mic'); await p.waitForTimeout(400); };
  const hold = async sel => { const bx = await p.locator(sel).first().boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(1200); await p.mouse.up(); };

  await p.goto('http://localhost:4610/?c=BOTELLA-01'); await p.waitForTimeout(1200); await shot('bienvenida');
  await step('registro', async () => {
    await tap('[data-go=intro]'); await shot('intro-1'); await tap('.foot [data-act=slideNext]'); await shot('intro-2'); await tap('.foot [data-act=slideNext]'); await shot('intro-3'); await tap('.foot [data-act=slideNext]');
    await shot('cuenta'); await p.fill('#em', 'ana@correo.com'); await p.fill('#pw', '12345678'); await tap('[data-act=authGo]'); await p.waitForTimeout(500);
    await shot('sobre-ti'); await p.fill('#nm', 'Ana'); await p.selectOption('#dist', 'Lince'); await tap('[data-act=adult]'); await shot('sobre-ti-lleno'); await tap('[data-act=aboutNext]');
    await shot('voz'); await record(); await shot('voz-lista'); await tap('[data-act=voiceNext]');
    for (const t of ['Música', 'Cine', 'Libros']) await tap('#tops .chip', t); await tap('.chip', 'Conversaciones profundas'); await shot('temas'); await tap('[data-act=finish]'); await p.waitForTimeout(900);
  });
  await step('orilla', async () => { await shot('orilla'); await tap('.float'); await p.waitForTimeout(500); await shot('abrir'); await hold('[data-hold=uncork]'); await p.waitForTimeout(1000); await shot('descorchada'); });
  await step('responder', async () => { await tap('[data-go=answer]'); await shot('responder'); await record(); await shot('responder-lista'); await tap('[data-act=sendAns]'); await p.waitForTimeout(1500); await shot('chat-nuevo'); });
  await step('chat', async () => {
    await tap('[data-act=chatRec]'); await p.waitForTimeout(1500); await shot('chat-grabando'); await tap('[data-act=chatRecSend]'); await p.waitForTimeout(600); await shot('chat-enviado');
    await tap('[data-act=back]'); await p.waitForTimeout(400);
  });
  await step('conversaciones', async () => { await tap('.tabs button', 'Conversaciones'); await p.waitForTimeout(500); await shot('conversaciones'); await tap('[data-act=chatGo][data-id=c-ale]'); await p.waitForTimeout(600); await shot('chat-ale'); await tap('[data-act=key]'); await p.waitForTimeout(3200); await shot('tierra-a-la-vista'); await tap('.btn-ghost', 'Después'); await p.waitForTimeout(500); await shot('chat-llamar'); await tap('[data-act=chatMenu]'); await shot('chat-menu'); await tap('[data-act=reveal]'); await p.waitForTimeout(600); await shot('chat-revelado'); });
  await step('lanzar', async () => {
    await tap('[data-act=back]'); await tap('.tabs button', 'Orilla'); await p.waitForTimeout(500); await tap('[data-go=launch]'); await shot('lanzar'); await tap('.idea'); await tap('[data-act=btype][data-k=color]'); await p.selectOption('#btarget', 'district:Barranco'); await shot('lanzar-color'); await record(); await shot('lanzar-lista');
    await tap('[data-act=throw]'); await p.waitForTimeout(1500); await shot('lanzada-1'); await p.waitForTimeout(2500); await shot('lanzada-2'); await tap('[data-act=toMine]'); await p.waitForTimeout(600); await shot('mis-botellas');
  });
  await step('perfil', async () => { await tap('.tabs button', 'Perfil'); await p.waitForTimeout(500); await shot('perfil'); await tap('[data-act=rules]'); await shot('normas'); await tap('.sheet [data-act=closeSheet]'); });
  await step('reportar', async () => { await tap('.tabs button', 'Orilla'); await p.waitForTimeout(600); await tap('.float'); await p.waitForTimeout(400); await tap('[data-act=reportB]'); await shot('reportar'); await tap('[data-act=reportBGo]'); await p.waitForTimeout(600); await shot('orilla-despues'); });
  await step('escritorio', async () => { await p.setViewportSize({ width: 1280, height: 820 }); await p.waitForTimeout(500); await shot('escritorio-orilla'); await tap('.tabs button', 'Conversaciones'); await p.waitForTimeout(400); await tap('[data-act=chatGo]'); await p.waitForTimeout(600); await shot('escritorio-chat'); await tap('[data-act=back]'); await tap('.tabs button', 'Orilla'); await p.waitForTimeout(400); await tap('[data-go=launch]'); await shot('escritorio-lanzar'); });
  const desk = await b.newPage({ viewport: { width: 1280, height: 860 } }); await desk.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await desk.goto('http://localhost:4610/'); await desk.waitForTimeout(1200); await desk.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-escritorio.png` });
  console.log(errs.length ? errs.join('\n') : 'SIN ERRORES'); await b.close(); srv.close();
})();
