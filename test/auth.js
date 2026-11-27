// Recuperar y cambiar contraseña: recorre olvidé → correo enviado → enlace → contraseña nueva, y el enlace vencido. Guarda capturas.
// Uso: DEVICE='iPhone SE' node test/auth.js <carpeta-de-capturas>
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = process.argv[2] || path.join(root, 'shots-auth'); fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => {
  let p = q.url.split('?')[0]; if (p === '/') p = '/index.html';
  if (p.startsWith('/api/')) { r.writeHead(200, { 'content-type': 'application/json' }); return r.end('{"ok":true}'); } if (p === '/vendor/supabase.js') p = '/test/fake-supabase.js';
  if (p === '/config.js') { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end("window.BOTELLA={url:'https://t.supabase.co',key:'k'}"); }
  fs.readFile(root + p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'text/plain' }); r.end(d); });
}).listen(4611);
(async () => {
  const b = await chromium.launch(); const errs = []; let n = 0;
  const page = async url => { const ctx = await b.newContext({ ...devices[process.env.DEVICE || 'iPhone 13'], serviceWorkers: 'block', deviceScaleFactor: 2 }); const p = await ctx.newPage(); await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts/.test(m.text())) errs.push('CON ' + m.text()); }); await p.goto('http://localhost:4611' + url); await p.waitForTimeout(1200); return p; };
  const shot = async (p, name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const cur = p => p.evaluate(() => P.curId);
  try {
    let p = await page('/'); await p.evaluate(() => { S.authMode = 'login'; go('account'); }); await p.waitForTimeout(500); await p.fill('#em', 'ana@correo.com'); await shot(p, 'entrar');
    await p.click('[data-act=forgot]'); await p.waitForTimeout(500); if (await cur(p) !== 'olvide') errs.push('no abrió olvide'); await shot(p, 'olvide');
    await p.click('.screen:not(.exiting) [data-act=forgotSend]'); await p.waitForTimeout(500); await shot(p, 'olvide-enviado');
    if (!await p.locator('.screen:not(.exiting) [data-act=forgotSend][disabled]').count()) errs.push('reenviar debería esperar 60 s');
    await p.click('[data-act=forgotOther]'); await p.waitForTimeout(400); if ((await p.inputValue('#fem')) !== 'ana@correo.com') errs.push('no conservó el correo');
    p = await page('/?olvide=1'); if (await cur(p) !== 'olvide') errs.push('?olvide=1 no abre olvide');
    p = await page('/#access_token=x&type=recovery'); if (await cur(p) !== 'nuevaclave') errs.push('el enlace del correo no abre nuevaclave'); await p.fill('#npw', 'nueva-clave-9'); await p.click('[data-act=pwEye]'); await shot(p, 'nueva-clave');
    await p.click('[data-act=newPass]'); await p.waitForTimeout(1500); if (await cur(p) === 'nuevaclave') errs.push('no entró tras guardar'); await shot(p, 'nueva-clave-lista');
    p = await page('/#error=access_denied&error_code=otp_expired'); if (await cur(p) !== 'nuevaclave') errs.push('enlace vencido no avisa'); await shot(p, 'enlace-vencido');
    await p.click('[data-act=recoverAgain]'); await p.waitForTimeout(500); if (await cur(p) !== 'olvide') errs.push('pedir otro no lleva a olvide');
  } catch (e) { errs.push(e.message.split('\n')[0]); }
  await b.close(); srv.close(); if (errs.length) { console.log('ERRORES\n' + errs.join('\n')); process.exit(1); } console.log('auth ok', n, 'capturas');
})();
