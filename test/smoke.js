// Prueba de humo: recorre toda la app en un iPhone simulado con un Supabase falso y guarda capturas.
// Uso: node test/smoke.js <carpeta-de-capturas>
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || path.join(root, 'shots'); fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => {
  let p = q.url.split('?')[0]; if (p === '/') p = '/index.html';
  if (p.startsWith('/api/')) { r.writeHead(200, { 'content-type': 'application/json' }); return r.end(JSON.stringify(p === '/api/health' ? { push: false, lectura: true, filter: true } : p === '/api/lectura' ? { ok: true, pending: false } : { ok: true })); } if (p === '/vendor/supabase.js') p = '/test/fake-supabase.js';
  if (p === '/config.js') { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end("window.BOTELLA={url:'https://t.supabase.co',key:'k'}"); }
  fs.readFile(root + p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'text/plain' }); r.end(d); });
}).listen(4610);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices[process.env.DEVICE || 'iPhone 13'], permissions: ['microphone'], serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = [];
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts/.test(m.text())) errs.push('CON ' + m.text()); });
  let n = 0; const prim = []; const PSEL = '.screen:not(.exiting) .btn-a:not(.soft):not([disabled]), .screen:not(.exiting) .sendb, .screen:not(.exiting) .rec .mic';
  // Regla del sistema de diseño: como mucho un turquesa sólido visible por vista (con hoja abierta, cuenta la hoja). Se anota en primarios.txt.
  const primaries = () => p.evaluate(sel => { const sh = document.querySelector('.sheet'); const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; };
    const coach = document.querySelector('.coach'); if (coach) return 0; return [...document.querySelectorAll(sel)].filter(e => (!sh || sh.contains(e)) && vis(e)).length; }, PSEL).catch(() => -1);
  const shot = async name => { await p.waitForTimeout(700); const id = `${String(++n).padStart(2, '0')}-${name}`; await p.screenshot({ path: `${out}/${id}.png` }); prim.push(`${await primaries()}\t${id}`); };
  const tap = async (sel, t) => { const l = t ? p.locator(sel, { hasText: t }) : p.locator(sel); await l.first().click({ timeout: 5000 }); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { errs.push(`STEP ${name}: ${e.message.split('\n')[0]}`); await shot('FAIL-' + name); } };
  const record = async (ms = 2600) => { await tap('.screen:not(.exiting) .rec .mic'); await p.waitForTimeout(ms); await tap('.screen:not(.exiting) .rec .mic'); await p.waitForTimeout(400); };
  const hold = async sel => { const bx = await p.locator(sel).first().boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.waitForTimeout(1200); await p.mouse.up(); };

  await p.goto('http://localhost:4610/?c=BOTELLA-01'); await p.waitForTimeout(1200); await shot('bienvenida');
  await step('primera-botella', async () => {
    await tap('[data-act=firstGo]'); await p.waitForTimeout(600); await shot('primera-abrir'); await hold('[data-hold=uncork]'); await p.waitForTimeout(1000); await shot('primera-descorchada');
    await tap('[data-go=answer]'); await record(); await shot('primera-responder'); await tap('[data-act=sendAns]'); await p.waitForTimeout(600);
  });
  await step('registro', async () => {
    await shot('cuenta'); await p.fill('#em', 'ana@correo.com'); await p.fill('#pw', '12345678'); await tap('[data-act=authGo]'); await p.waitForTimeout(500);
    await shot('sobre-ti'); await p.fill('#nm', 'Ana'); await p.selectOption('#dist', 'Lince'); await tap('[data-act=adult] .box'); await tap('[data-act=aboutNext]');
    await shot('voz'); await record(); await tap('[data-act=voiceNext]');
    for (const t of ['Música', 'Cine', 'Libros']) await tap('#tops .chip', t); await tap('.chip', 'Conversaciones profundas'); await shot('temas'); await tap('[data-act=finish]'); await p.waitForTimeout(1400);
    await shot('chat-primera'); await p.waitForTimeout(3200); await shot('chat-primera-respondio'); await p.locator('#thread').evaluate(e => e.scrollTo(0, 9999)); await shot('chat-primera-siguiente');
  });
  await step('etapas', async () => {
    await tap('.stg'); await p.waitForTimeout(400); await shot('etapas-info'); await tap('.sheet [data-act=closeSheet]');
    await tap('[data-act=chatRec]'); await p.waitForTimeout(2200); await tap('[data-act=chatRecSend]'); await p.waitForTimeout(800); await shot('etapa-llamada');
    await tap('.scard [data-act=key]'); await p.waitForTimeout(3400); await shot('ejemplo-tierra');
    await tap('.screen:not(.exiting) [data-act=call]'); await p.waitForTimeout(3200); await shot('ejemplo-llamada');
    await p.waitForSelector('.sheet [data-act=planGo]', { timeout: 20000 }); await shot('plan'); await tap('.sheet [data-act=planGo]'); await p.waitForTimeout(3000); await shot('plan-aceptado');
    await tap('[data-act=back]'); await p.waitForTimeout(600);
  });
  await step('orilla', async () => { await p.waitForTimeout(1200); await shot('orilla-tour-1'); await tap('[data-act=tourNext]'); await shot('orilla-tour-2'); await tap('[data-act=tourNext]'); await shot('orilla-tour-3'); await tap('[data-act=tourNext]'); await shot('orilla-tour-4'); await tap('[data-act=tourEnd]'); await shot('orilla-primer-dia'); await tap('.float'); await p.waitForTimeout(500); await hold('[data-hold=uncork]'); await p.waitForTimeout(1000); await shot('descorchada'); });
  await step('responder', async () => { await tap('[data-go=answer]'); await record(); await tap('[data-act=sendAns]'); await p.waitForTimeout(1500); await shot('chat-nuevo'); await tap('[data-act=back]'); await p.waitForTimeout(400); });
  await step('conversaciones', async () => { await tap('.tabs button', 'Conversaciones'); await p.waitForTimeout(500); await shot('conversaciones'); await tap('[data-act=chatGo][data-id=c-ale]'); await p.waitForTimeout(600); await shot('chat-ale-etapa-voces');
    await tap('[data-act=chatRec]'); await p.waitForTimeout(2200); await tap('[data-act=chatRecSend]'); await p.waitForTimeout(800); await shot('chat-ale-quiere-hablar');
    await tap('.scard [data-act=key]'); await p.waitForTimeout(3200); await tap('.btn-ghost', 'Más tarde'); await p.waitForTimeout(500); await shot('chat-llamar'); await tap('[data-act=chatMenu]'); await shot('chat-menu'); await tap('[data-act=reveal]'); await p.waitForTimeout(600); await shot('chat-revelado');
    await tap('[data-act=giftAsk]'); await p.waitForTimeout(400); await tap('[data-act=giftGo]'); await p.waitForTimeout(700); await shot('lacre-enviado'); });
  await step('dúo', async () => {
    await tap('[data-act=back]'); await tap('.tabs button', 'Orilla'); await p.waitForTimeout(500); await tap('[data-go=launch]'); await shot('lanzar-simple'); await tap('[data-act=moreOpts]'); await tap('[data-act=duoT]'); await p.waitForTimeout(300); await shot('lanzar-duo'); await record(); await shot('lanzar-duo-lista');
    await tap('[data-act=duoStart]'); await p.waitForTimeout(900); await shot('duo-esperando'); await tap('[data-act=toMine]'); await p.waitForTimeout(700); await shot('mis-botellas-duo');
  });
  await step('lanzar', async () => {
    await tap('.tabs button', 'Orilla'); await p.waitForTimeout(500); await tap('[data-go=launch]'); await tap('.idea'); await tap('[data-act=btype][data-k=color]'); await p.selectOption('#btarget', 'topic:Cine'); await record(); await shot('lanzar-lista');
    await tap('[data-act=throw]'); await p.waitForTimeout(4000); await shot('lanzada'); await p.waitForTimeout(1600); await shot('avisos-pregunta'); await tap('.sheet [data-act=closeSheet]').catch(() => {}); await tap('[data-act=toMine]'); await p.waitForTimeout(600);
  });
  await step('marea-hoy', async () => { await tap('.tabs button', 'Orilla'); await p.waitForTimeout(800); await shot('orilla-tu-dia'); await tap('.today'); await p.waitForTimeout(900); await shot('marea-pregunta'); await record(); await tap('[data-act=tideSend]'); await p.waitForTimeout(1200); await shot('marea-respondida'); await p.locator('.screen:not(.exiting) .scroll').evaluate(e => e.scrollTo(0, 500)); await shot('marea-voces'); await tap('[data-act=back]'); await p.waitForTimeout(500); });
  await step('bitacora', async () => { await tap('.streak'); await p.waitForTimeout(800); await shot('bitacora'); await tap('[data-go=mapa]'); await p.waitForTimeout(800); await shot('mapa'); await tap('[data-act=back]'); await tap('[data-act=back]'); await p.waitForTimeout(500); });
  await step('lecturas', async () => { await tap('[data-act=toLecturas]'); await p.waitForTimeout(600); await shot('lecturas'); await tap('[data-act=lecNew]'); await p.waitForTimeout(500); await tap('.lq'); await record(); await shot('lectura-nueva'); await tap('[data-act=lecCreate]'); await p.waitForTimeout(1000); await shot('lectura-link'); await p.locator('.screen:not(.exiting) .scroll').evaluate(e => e.scrollTo(0, 900)); await shot('lectura-respuestas'); await tap('[data-act=ansMenu]'); await shot('lectura-opciones'); await tap('.sheet [data-act=closeSheet]'); await tap('[data-act=back]'); await p.waitForTimeout(500); await tap('[data-act=back]'); await p.waitForTimeout(500); });
  await step('muelle', async () => {
    await tap('.tabs button', 'Muelle'); await p.waitForTimeout(700); await shot('muelle'); await tap('[data-act=get][data-k=color]'); await p.waitForTimeout(500);
    await tap('[data-act=get][data-k=who]'); await p.waitForTimeout(500); await tap('.look', 'Ámbar'); await p.waitForTimeout(500);
    await p.locator('.screen:not(.exiting) .scroll').evaluate(e => e.scrollTo(0, 900)); await shot('muelle-2'); await tap('[data-act=get][data-k=captain]'); await p.waitForTimeout(500);
    await p.locator('.screen:not(.exiting) .scroll').evaluate(e => e.scrollTo(0, 9999)); await shot('muelle-3');
    await tap('.tabs button', 'Mis botellas'); await p.waitForTimeout(600); await shot('quien-la-abrio');
  });
  await step('marea', async () => { await tap('.tabs button', 'Orilla'); await p.waitForTimeout(500); await tap('[data-go=marea]'); await p.waitForTimeout(900); await shot('marea'); await tap('[data-act=mareaOpen]'); await p.waitForTimeout(900); await shot('marea-abrir'); await tap('[data-act=back]'); await p.waitForTimeout(500); });
  await step('salidas', async () => {
    await tap('[data-act=back]').catch(() => {}); await tap('.tabs button', 'Orilla'); await p.waitForTimeout(500); await tap('[data-go=salidas]'); await p.waitForTimeout(900); await shot('salidas');
    await tap('[data-act=outing]'); await p.waitForTimeout(400); await shot('salida'); await tap('[data-act=outJoin]'); await p.waitForTimeout(700);
    await tap('[data-go=proponer]'); await p.waitForTimeout(500); await tap('[data-act=outIdea]'); await p.waitForTimeout(300); await shot('proponer'); await tap('[data-act=outCreate]'); await p.waitForTimeout(900); await shot('salidas-mia');
    await tap('[data-act=back]'); await p.waitForTimeout(500);
  });
  await step('perfil', async () => { await tap('.tabs button', 'Orilla'); await p.waitForTimeout(400); await tap('[data-go=perfil]'); await p.waitForTimeout(500); await shot('perfil'); await tap('[data-act=rules]'); await shot('normas'); await tap('.sheet [data-act=closeSheet]'); });
  await step('reportar', async () => { await tap('.tabs button', 'Orilla'); await p.waitForTimeout(600); await tap('.float'); await p.waitForTimeout(400); await tap('[data-act=reportB]'); await shot('reportar'); await tap('[data-act=reportBGo]'); await p.waitForTimeout(600); await shot('orilla-despues'); await p.waitForTimeout(3800); await shot('orilla-limpia'); await tap('[data-go=perfil]'); await p.waitForTimeout(500); await p.locator('.screen:not(.exiting) .scroll').evaluate(e => e.scrollTo(0, 420)); await shot('perfil-invitar'); await tap('.tabs button', 'Orilla'); await p.waitForTimeout(500); });
  await step('escritorio', async () => { await p.setViewportSize({ width: 1280, height: 820 }); await p.waitForTimeout(500); await shot('escritorio-orilla'); await tap('.tabs button', 'Conversaciones'); await p.waitForTimeout(400); await tap('[data-act=chatGo]'); await p.waitForTimeout(600); await shot('escritorio-chat'); await tap('[data-act=back]'); await tap('.tabs button', 'Orilla'); await p.waitForTimeout(400); await tap('[data-go=launch]'); await shot('escritorio-lanzar'); });
  for (const [name, url, fn] of [['lectura-publica', '/?l=abc123', async q => { await q.waitForTimeout(1200); await q.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-lectura-publica.png` }); await q.locator('.rec .mic').click(); await q.waitForTimeout(2600); await q.locator('.rec .mic').click(); await q.waitForTimeout(400); await q.locator('[data-act=lpSend]').click(); await q.waitForTimeout(900); await q.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-lectura-cuenta.png` }); }],
    ['duo-publico', '/?d=duoTK', async q => { await q.waitForTimeout(1200); await q.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-duo-publico.png` }); }]]) {
    try { const c2 = await b.newContext({ ...devices[process.env.DEVICE || 'iPhone 13'], permissions: ['microphone'], serviceWorkers: 'block' }); const q = await c2.newPage(); q.on('pageerror', e => errs.push(name + ' PAGE ' + e.message)); await q.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await q.goto('http://localhost:4610' + url); await fn(q); await c2.close(); } catch (e) { errs.push(`STEP ${name}: ${e.message.split('\n')[0]}`); }
  }
  const desk = await b.newPage({ viewport: { width: 1280, height: 860 } }); await desk.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); await desk.goto('http://localhost:4610/'); await desk.waitForTimeout(1200); await desk.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-escritorio.png` });
  fs.writeFileSync(path.join(out, 'primarios.txt'), prim.join('\n') + '\n'); console.log(errs.length ? errs.join('\n') : 'SIN ERRORES'); await b.close(); srv.close();
})();
