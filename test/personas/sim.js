// Simulador de 100 personas para Botella: cada una entra, busca lo que quiere con sus palabras y su estrategia.
// Uso: node test/personas/sim.js . salida-personas [desde] [hasta] [paralelo]   (después: python3 test/personas/analiza.py salida-personas)
// Cada persona busca lo que quiere con sus palabras ("audio", "mensaje", "grabar"); las metáforas solo las usa quien lee con calma.
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]); fs.mkdirSync(out, { recursive: true });
const PERS = JSON.parse(fs.readFileSync(path.join(__dirname, 'personas.json'), 'utf8'));
const from = +(process.argv[4] || 1), to = +(process.argv[5] || 100), PAR = +(process.argv[6] || 6);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const PORT = 4700 + Math.floor(Math.random() * 200);
http.createServer((q, r) => {
  let p = q.url.split('?')[0]; if (p === '/') p = '/index.html';
  if (p.startsWith('/api/')) { r.writeHead(200, { 'content-type': 'application/json' }); return r.end(JSON.stringify(p === '/api/health' ? { push: false, lectura: true, filter: true } : p === '/api/lectura' ? { ok: true, pending: false } : { ok: true })); }
  if (p === '/vendor/supabase.js') p = '/test/fake-supabase.js';
  if (p === '/config.js') { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end("window.BOTELLA={url:'https://t.supabase.co',key:'k'}"); }
  fs.readFile(root + p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'text/plain' }); r.end(d); });
}).listen(PORT);

const DEV = {
  'iPhone SE': { ...devices['iPhone SE'] }, 'iPhone 13': { ...devices['iPhone 13'] },
  'Android chico': { ...devices['Galaxy S8'] }, 'Android grande': { ...devices['Pixel 7'] },
  'Escritorio': { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  'Tablet': { ...devices['iPad Mini'] }
};
// Lo que una persona común busca (palabras literales) y lo que solo entiende quien ya leyó la metáfora.
const GOALS = {
  escuchar: { lit: ['escuchar', 'oír', 'reproducir', 'play'], met: ['descorch', 'abrir', 'botella'] },
  responder: { lit: ['responder', 'contestar', 'grabar', 'enviar', 'mandar'], met: [] },
  cuenta: { lit: ['crear mi cuenta', 'crear cuenta', 'registr', 'continuar', 'entrar', 'enviar y crear', 'siguiente'], met: ['orilla'] },
  mensajes: { lit: ['mensajes', 'chat', 'conversaciones'], met: [] },
  lanzar: { lit: ['mandar', 'enviar', 'publicar', 'nueva', 'preguntar', 'grabar'], met: ['lanzar'] },
  llamada: { lit: ['llamar', 'llamada'], met: [] },
  nombre: { lit: ['compartir mi nombre', 'mi nombre', 'nombre'], met: [] },
  seguridad: { lit: ['reportar', 'bloquear', 'denunciar', 'si algo no va bien', 'normas'], met: ['•••', 'más opciones'] },
  lectura_resp: { lit: ['responder', 'grabar', 'enviar', 'con tu cuenta'], met: [] },
  duo: { lit: ['grabar', 'unirme', 'sumar', 'enviar', 'mi mitad'], met: ['lanzar'] },
  lectura_pedir: { lit: ['qué piensan de ti', 'piensan de mí', 'pedir', 'amigos'], met: ['lectura'] },
  salida: { lit: ['salidas', 'salir', 'grupo', 'me apunto'], met: [] },
  marea: { lit: ['pregunta de hoy', 'pregunta del día'], met: ['marea'] }
};
function goalsFor(p) {
  const g = [];
  if (p.entrada === 'invitacion' || p.entrada === 'sin_codigo') {
    g.push('escuchar', 'responder', 'cuenta');
    if (/acoso/.test(p.motivo)) g.push('seguridad');
    g.push('mensajes', 'lanzar');
    if (/pareja|sola/.test(p.motivo)) g.push('nombre', 'llamada');
    g.push(['lectura_pedir', 'salida', 'marea'][p.id % 3]);
  } else if (p.entrada === 'lectura') g.push('escuchar', 'lectura_resp', 'cuenta', 'lanzar');
  else if (p.entrada === 'duo') g.push('escuchar', 'duo', 'cuenta');
  else { g.push('mensajes', 'responder', p.id % 2 ? 'llamada' : 'nombre', 'lanzar', p.id % 2 ? 'marea' : 'seguridad'); }
  return g;
}
function done(g, s) {
  const db = s.db || {}, conv = db.convos || [], q = db.quest || {};
  switch (g) {
    case 'escuchar': return q.heard || s.uncorked || s.played > 0;
    case 'responder': return q.answered || s.acts.some(a => /sendAns|chatRecSend|tideSend/.test(a));
    case 'cuenta': return !!(db.session && db.profile);
    case 'mensajes': return s.screen === 'convos' || s.screen === 'chat';
    case 'lanzar': return !!q.launched;
    case 'llamada': return conv.some(c => c.my_key);
    case 'nombre': return conv.some(c => c.my_reveal);
    case 'seguridad': return /Reportar|Bloquear/.test(s.sheetText || '');
    case 'lectura_resp': return s.acts.includes('lpSend') && s.hadRec;
    case 'duo': return s.acts.includes('duoJoin') && s.hadRec;
    case 'lectura_pedir': return (db.lecturas || []).length > 0;
    case 'salida': return (db.outings || []).some(o => o.joined);
    case 'marea': return !!db.tideAns;
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const JARGON = ['orilla', 'muelle', 'marea', 'descorch', 'lacre', 'dorada', 'vidrio', 'capitán', 'bitácora', 'lectura', 'lanzar', 'botella para dos', 'llega lejos', 'de color'];

async function run(p) {
  const R = (() => { let s = p.id * 9973; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const dev = DEV[p.dispositivo]; const z = p.zoom;
  const ctxOpts = { ...dev, viewport: { width: Math.round(dev.viewport.width / z), height: Math.round(dev.viewport.height / z) }, deviceScaleFactor: (dev.deviceScaleFactor || 1) * z, reducedMotion: p.reducir_movimiento ? 'reduce' : 'no-preference', serviceWorkers: 'block', locale: 'es-PE', timezoneId: 'America/Lima' };
  if (p.mic === 'ok') ctxOpts.permissions = ['microphone'];
  const ctx = await BROWSER.newContext(ctxOpts); const page = await ctx.newPage();
  const res = { id: p.id, persona: p, goals: {}, issues: [], errors: [], steps: [], screens: [], t0: Date.now() };
  const issue = (type, screen, detail, sev = 'media') => { const k = type + '|' + screen + '|' + detail; if (!res.issues.some(i => i.k === k)) res.issues.push({ k, type, screen, detail, sev }); };
  page.on('pageerror', e => res.errors.push('PAGE ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts|net::ERR/.test(m.text())) res.errors.push('CON ' + m.text().slice(0, 200)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(({ mic, vuelve }) => {
    if (mic !== 'ok') { const err = mic === 'denegado' ? 'NotAllowedError' : 'NotFoundError'; navigator.mediaDevices && (navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException(mic === 'denegado' ? 'Permission denied' : 'Requested device not found', err))); }
    window.__simPlayed = 0; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__simPlayed++; return op.apply(this, arguments); };
    if (vuelve) { let _db; Object.defineProperty(window, '__db', { configurable: true, get: () => _db, set: v => { v.session = { user: { id: 'me-1' } }; v.profile = { id: 'me-1', name: 'Rosa', district: 'Lince', topics: ['Cine', 'Música', 'Libros'], intents: ['Conversaciones profundas'], adult: true, bottles: 3, color_left: 2, far_left: 1, tide_left: 1, gifts_left: 1, who_open: false, glass: null, captain: false, earned: 0, paused: false, intro_voice: 'x/i.m4a', intro_secs: 6 }; v.quest = { heard: true, answered: true, launched: true }; v.streak = 2; _db = v; } }); try { localStorage.setItem('botella.welcomed', '1'); } catch (e) {} }
  }, { mic: p.mic, vuelve: p.entrada === 'vuelve' });
  if (p.red === 'lenta') { const cdp = await ctx.newCDPSession(page); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 20000 }); }
  const url = { invitacion: '/?c=BOTELLA-01', sin_codigo: '/', lectura: '/?l=abc123', duo: '/?d=duoTK', vuelve: '/' }[p.entrada];
  try { await page.goto(`http://localhost:${PORT}${url}`, { timeout: 30000 }); } catch (e) { res.errors.push('GOTO ' + e.message.slice(0, 120)); }
  await sleep(p.red === 'lenta' ? 2500 : 1300);

  const goals = goalsFor(p); let gi = 0, onGoal = 0; const seen = new Set(); let lastSig = '', sameCount = 0, cut = false, hadRec = false, played = 0;
  const acts = [];
  const readMs = w => p.lee === 'todo' ? Math.min(w * 220, 9000) : p.lee === 'algo' ? Math.min(w * 90, 3500) : 250;
  const canMet = p.soltura === 'alta' || (p.soltura === 'media' && p.lee !== 'poco');

  for (let step = 0; step < 60 && gi < goals.length; step++) {
    if (p.red === 'se_corta' && step === 8 && !cut) { await ctx.setOffline(true); cut = true; issue('red', '-', 'se cortó internet a mitad del uso', 'info'); }
    if (cut && step === 12) { await ctx.setOffline(false); }
    let st;
    try {
      st = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (el.closest('[inert]')) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') return false; return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
        document.querySelectorAll('[data-sim]').forEach(e => e.removeAttribute('data-sim'));
        const sheet = document.getElementById('sheet');
        const scope = sheet || document.querySelector('#app .screen:not(.exiting)') || document.body;
        const els = [...scope.querySelectorAll('button,a[href],[data-act],[data-go],[role=button],input,select,[data-hold],.chip')].filter(vis);
        const extra = sheet ? [] : [...document.querySelectorAll('.banner')].filter(vis);
        const cand = [...new Set([...els, ...extra])].map((e, i) => { e.setAttribute('data-sim', i); const r = e.getBoundingClientRect(); const lab = (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 80); return { i, tag: e.tagName.toLowerCase(), lab, act: e.dataset.act || e.dataset.go || '', primary: e.classList.contains('btn-a'), soft: e.classList.contains('soft') || e.disabled, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top), id: e.id, type: e.type || '', named: !!(e.getAttribute('aria-label') || e.innerText.trim() || e.labels?.length || e.title), cls: e.className && e.className.baseVal === undefined ? String(e.className).slice(0, 40) : '' }; });
        // CTA principal fuera de la vista
        const prim = [...scope.querySelectorAll('.btn-a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && !e.closest('[inert]') && getComputedStyle(e).display !== 'none'; });
        const primOff = prim.length && !prim.some(vis);
        const text = (scope.innerText || '').replace(/\s+/g, ' ').trim();
        const ox = document.scrollingElement.scrollWidth > innerWidth + 1;
        const offR = [...scope.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); if (r.width < 4 || r.right <= innerWidth + 2) return false; let a = e.parentElement; while (a) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return false; a = a.parentElement; } return vis(e) || r.left < innerWidth; }).slice(0, 3).map(e => (e.className && String(e.className).slice(0, 30)) || e.tagName);
        const clipped = [...scope.querySelectorAll('h1,h2,h3,.display,.title,.t,b,.lab,.lead,span')].filter(e => vis(e) && e.children.length === 0 && e.innerText.trim().length > 3 && (e.scrollWidth > e.clientWidth + 2) && getComputedStyle(e).textOverflow === 'ellipsis').slice(0, 4).map(e => e.innerText.trim().slice(0, 40));
        const heading = !!scope.querySelector('h1,h2,[role=heading],.display,.h2,.title');
        const toast = document.querySelector('.toast')?.textContent || '';
        return { screen: (typeof P !== 'undefined' && P.curId) || '?', sheet: !!sheet, sheetText: sheet ? sheet.innerText.slice(0, 400) : '', cand, primOff, text, words: text.split(' ').length, ox, offR, clipped, heading, toast, rec: !!scope.querySelector('.rec .mic'), recDone: !!scope.querySelector('.rec .vn'), recLive: !!scope.querySelector('.rec.live'), db: window.__db ? JSON.parse(JSON.stringify({ session: __db.session, profile: __db.profile, quest: __db.quest, convos: __db.convos, lecturas: __db.lecturas, outings: __db.outings, tideAns: __db.tideAns })) : {}, uncorked: !!(typeof P !== 'undefined' && P.st && P.st.uncorked), played: window.__simPlayed, focusRing: null };
      });
    } catch (e) { res.errors.push('EVAL ' + e.message.slice(0, 120)); await sleep(800); continue; }
    played = st.played; if (st.recDone) hadRec = true;
    const scr = st.screen + (st.sheet ? '+hoja' : '');
    const S = { db: st.db, screen: st.screen, sheetText: st.sheetText, acts, uncorked: st.uncorked, played, hadRec };
    // metas cumplidas
    while (gi < goals.length && done(goals[gi], S)) { res.goals[goals[gi]] = { ok: true, pasos: onGoal }; gi++; onGoal = 0; }
    if (gi >= goals.length) break;
    const goal = goals[gi];
    // revisión de la pantalla (una vez por persona)
    if (!seen.has(scr)) {
      seen.add(scr); res.screens.push(scr);
      if (st.ox) issue('desborde', scr, 'la pantalla se mueve de lado (scroll horizontal)', 'alta');
      if (st.offR.length) issue('fuera_de_pantalla', scr, 'elementos salen por la derecha: ' + st.offR.join(', '), 'media');
      if (st.primOff && !st.sheet) issue('cta_oculto', scr, 'el botón principal no se ve sin hacer scroll', 'media');
      st.clipped.forEach(c => issue('texto_cortado', scr, c, 'baja'));
      st.cand.filter(c => !c.named && c.tag !== 'input' && c.tag !== 'select').forEach(c => issue('sin_nombre', scr, `${c.tag}.${c.cls}`, p.estrategia === 'lector_pantalla' ? 'alta' : 'media'));
      st.cand.filter(c => (c.w < 32 || c.h < 32) && c.tag !== 'input' && !/chip/.test(c.cls) && c.lab).forEach(c => issue('toque_chico', scr, `${c.lab.slice(0, 30)} (${c.w}×${c.h})`, z > 1 || p.edad > 55 ? 'media' : 'baja'));
      const low = st.text.toLowerCase(); const jar = JARGON.filter(j => low.includes(j));
      if (jar.length && p.soltura === 'baja') issue('jerga', scr, jar.join(', '), 'media');
      if (!st.heading && p.estrategia === 'lector_pantalla') issue('sin_titulo', scr, 'la pantalla no tiene un título que el lector anuncie', 'media');
      if (st.words > 140 && p.lee !== 'todo') issue('mucho_texto', scr, `${st.words} palabras`, 'baja');
      await sleep(readMs(st.words));
    }
    // ¿dando vueltas?
    const sig = scr + '|' + st.text.slice(0, 200);
    if (sig === lastSig) sameCount++; else sameCount = 0; lastSig = sig;
    if (onGoal >= (p.paciencia / goals.length * 2.2 + 4) | sameCount >= 4) {
      res.goals[goal] = { ok: false, pasos: onGoal, donde: scr, motivo: sameCount >= 4 ? 'atascada en la misma pantalla' : 'no encontró cómo' };
      issue('meta_fallida', scr, `${goal}: ${res.goals[goal].motivo}`, 'alta');
      gi++; onGoal = 0; sameCount = 0; continue;
    }
    onGoal++;
    // ---------- formularios ----------
    const c = st.cand; const by = f => c.find(f);
    let target = null, how = 'tap';
    const em = by(x => x.id === 'em'), nm = by(x => x.id === 'nm'), cd = by(x => x.id === 'cd');
    try {
      if (em) {
        const e = await page.$('#em'); if (!(await e.inputValue())) { await page.fill('#em', p.se_equivoca && !res._typo ? 'rosa@gmail' : `p${p.id}@correo.com`); await page.fill('#pw', p.se_equivoca && !res._typo ? '1234' : 'clave12345'); if (p.se_equivoca && !res._typo) res._typo = 'pending'; }
        else if (res._typo === 'pending') { const t = st.toast; if (t) { issue('validacion', scr, 'mensaje: ' + t, 'info'); } else issue('validacion_muda', scr, 'correo/contraseña mal escritos: no apareció explicación', 'alta'); await page.fill('#em', `p${p.id}@correo.com`); await page.fill('#pw', 'clave12345'); res._typo = 'ok'; }
      }
      if (nm) { const v = await page.inputValue('#nm'); if (!v) await page.fill('#nm', p.nombre_largo ? 'María de los Ángeles Fernández' : p.nombre); const ad = await page.$('[data-act=adult]'); if (ad && (await ad.getAttribute('aria-checked')) !== 'true' && !(p.se_equivoca && !res._adultMiss)) await ad.click().catch(() => {}); else if (ad && p.se_equivoca && !res._adultMiss) res._adultMiss = 1; else if (ad && res._adultMiss === 1 && (await ad.getAttribute('aria-checked')) !== 'true') { issue('validacion', scr, 'olvidó marcar 18+: ' + (st.toast || 'sin aviso'), st.toast ? 'info' : 'alta'); await ad.click().catch(() => {}); res._adultMiss = 2; } if (p.edad < 18 && !res._minor) { res._minor = 1; issue('menor', scr, 'una persona de 17 años marcó "tengo 18 o más": la app no puede saberlo', 'info'); } }
      if (cd && p.entrada === 'sin_codigo') { const v = await page.inputValue('#cd'); if (!v) { await page.fill('#cd', p.soltura === 'alta' ? 'BOTELLA-01' : 'no tengo'); } else if (v === 'no tengo' && !res._nocode) { res._nocode = 1; issue('sin_invitacion', scr, 'sin código no puede entrar; mensaje: ' + (st.toast || 'ninguno'), 'alta'); await page.fill('#cd', 'BOTELLA-01'); } }
      const tops = await page.$$('#tops .chip.on'); if ((await page.$('#tops')) && tops.length < 3) { const ch = await page.$$('#tops .chip:not(.on)'); for (const x of ch.slice(0, 3 - tops.length)) await x.click().catch(() => {}); const w = await page.$('.chip:not(#tops .chip)'); }
    } catch (e) {}
    // ---------- grabar si hace falta ----------
    const wantsVoice = ['responder', 'lanzar', 'lectura_resp', 'duo', 'marea', 'cuenta', 'lectura_pedir'].includes(goal);
    if (st.rec && !st.recDone && !st.recLive && wantsVoice && !(res._micTries > 1)) {
      res._micTries = (res._micTries || 0) + 1;
      await page.click('.screen:not(.exiting) .rec .mic, #sheet .rec .mic').catch(() => {}); await sleep(2700);
      const live = await page.$('.rec.live'); if (live) { await page.click('.rec.live .mic').catch(() => {}); await sleep(500); acts.push('rec'); res.steps.push({ scr, goal, a: 'grabó' }); continue; }
      const after = await page.evaluate(() => ({ t: document.querySelector('.toast')?.textContent || '', s: document.getElementById('sheet')?.innerText.slice(0, 160) || '' }));
      issue('microfono', scr, `${p.mic}: ${after.s ? 'hoja: ' + after.s.split('\n')[0] : after.t ? 'aviso: ' + after.t : 'no pasó nada'}`, after.s || after.t ? 'media' : 'alta');
      res.steps.push({ scr, goal, a: 'micrófono falló' }); continue;
    }
    // ---------- elegir qué tocar ----------
    const words = GOALS[goal].lit.concat(canMet ? GOALS[goal].met : []);
    const score = x => { const l = (x.lab || '').toLowerCase(); let s = 0; words.forEach((w, k) => { if (l.includes(w)) s = Math.max(s, 10 - k * .3); }); if (s && x.primary) s += 2; if (x.soft) s -= 4; return s; };
    const usable = c.filter(x => x.tag !== 'input' && x.tag !== 'select' && x.lab !== '' || x.act);
    const ranked = usable.map(x => [score(x), x]).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]);
    const skip = usable.filter(x => /ahora no|después|saltar|más tarde|cerrar|entendido|listo/i.test(x.lab));
    const primary = usable.filter(x => x.primary && !x.soft);
    const strat = p.estrategia; const rnd = R();
    if (strat === 'explorador' && rnd < .45) target = usable[Math.floor(R() * usable.length)];
    else if (strat === 'impaciente' && rnd < .3 && skip.length) target = skip[0];
    else if (strat === 'atras' && rnd < .18) how = 'back';
    else if (strat === 'toca_todo' && rnd < .35) how = 'deco';
    if (!target && how === 'tap') target = (ranked[0] && ranked[0][1]) || (st.sheet && skip[0]) || primary[0] || (strat === 'lector' || strat === 'principal' ? usable.find(x => /btn/.test(x.cls)) : usable[Math.floor(R() * usable.length)]);
    if (!target && how === 'tap') how = 'back';
    // ---------- actuar ----------
    const before = sig; let a = how;
    try {
      if (how === 'back') { await page.goBack({ timeout: 3000 }).catch(() => {}); a = 'atrás (botón del teléfono)'; const ex = await page.evaluate(() => !!(typeof P !== 'undefined' && document.querySelector('#app'))).catch(() => false); if (!ex) issue('salio_de_app', scr, 'el botón atrás sacó a la persona de la app', 'alta'); }
      else if (how === 'deco') {
        const pt = await page.evaluate(() => { const v = [...document.querySelectorAll('#app .screen:not(.exiting) :is(.paper,.q,.display,.lead,.eyebrow,.float span,.pill,.stat,.tq,.shores,.mrow,.bal,.minipaper,.scard,.row,canvas)')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 10 && r.top > 0 && r.bottom < innerHeight && !e.closest('[data-act],[data-go],button') && !e.querySelector('[data-act],button'); }); if (!v.length) return null; const e = v[Math.floor(Math.random() * v.length)]; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, c: String(e.className.baseVal ?? e.className).slice(0, 30), t: (e.innerText || '').slice(0, 30) }; });
        if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(500); const s2 = await page.evaluate(() => (typeof P !== 'undefined' && P.curId) + '|' + (document.querySelector('#app .screen:not(.exiting)')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200)).catch(() => ''); a = `tocó algo que no es botón (${pt.c})`; if (s2 === before.replace('+hoja', '') && /paper|float|scard|row|tq|mrow/.test(pt.c)) issue('parece_boton', scr, `${pt.c} "${pt.t}" parece tocable y no hace nada`, 'baja'); }
      } else if (strat === 'teclado') {
        let reached = false, n = 0, ring = true;
        await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
        for (; n < 45; n++) { await page.keyboard.press('Tab'); const f = await page.evaluate(i => { const e = document.activeElement; if (!e) return {}; const cs = getComputedStyle(e); const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none'; return { hit: e.getAttribute('data-sim') === String(i), ring, inert: !!e.closest('[inert]'), vis: e.getBoundingClientRect().width > 0 }; }, target.i); if (!f.ring && f.vis) ring = false; if (f.hit) { reached = true; break; } }
        if (!reached) { issue('teclado', scr, `no se llega con Tab a "${target.lab.slice(0, 30)}"`, 'alta'); await page.click(`[data-sim="${target.i}"]`, { timeout: 2500 }).catch(() => {}); }
        else { if (n > 15) issue('teclado_largo', scr, `${n + 1} Tabs para llegar a "${target.lab.slice(0, 30)}"`, 'baja'); if (!ring) issue('foco_invisible', scr, 'algún elemento enfocado no muestra dónde está el foco', 'media'); await page.keyboard.press('Enter'); }
        a = 'teclado → ' + target.lab;
      } else if (strat === 'doble' && target.primary) { await page.dblclick(`[data-sim="${target.i}"]`, { timeout: 2500 }); a = 'doble toque → ' + target.lab; }
      else if (target.act && /hold|uncork/i.test(target.act) || (await page.$(`[data-sim="${target.i}"][data-hold]`))) {
        if (p.estrategia === 'impaciente' || p.edad > 60) { await page.click(`[data-sim="${target.i}"]`, { timeout: 2500 }); a = 'toque corto en "mantén" → ' + target.lab; }
        else { const bx = await page.locator(`[data-sim="${target.i}"]`).boundingBox(); await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await page.mouse.down(); await sleep(1300); await page.mouse.up(); a = 'mantuvo → ' + target.lab; }
      } else { await page.click(`[data-sim="${target.i}"]`, { timeout: 2500, force: !!target.soft }); a = 'tocó → ' + target.lab; }
      if (target && target.act) acts.push(target.act);
    } catch (e) { a = (target ? target.lab.slice(0, 40) + ' → ' : '') + a + ' (no se pudo: ' + (/intercepts pointer events/.test(e.message) ? 'tapado por ' + ((e.message.match(/(<[^>]{0,90}>)[^<]*intercepts/) || ['', '?'])[1]) : /not visible/.test(e.message) ? 'no visible' : /outside of the viewport/.test(e.message) ? 'fuera de la vista' : /not stable/.test(e.message) ? 'se estaba moviendo' : 'tiempo agotado') + ')'; if (target) issue('no_tocable', scr, `"${target.lab.slice(0, 30)}" visible pero tapado o no responde`, 'media'); }
    await sleep(900);
    // ¿cambió algo?
    const after = await page.evaluate(() => ((typeof P !== 'undefined' && P.curId) || '?') + (document.getElementById('sheet') ? '+hoja' : '') + '|' + ((document.getElementById('sheet') || document.querySelector('#app .screen:not(.exiting)') || document.body).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200) + '|' + (document.querySelector('.toast')?.textContent || '')).catch(() => '');
    const changed = after.split('|').slice(0, 2).join('|') !== before;
    const toastNow = after.split('|')[2] || '';
    if (how === 'tap' && target && !changed && !toastNow && !/play|vp|chip/.test(target.cls + target.act) && !/nota de voz|copiar|copiado/i.test(target.lab) && !/^rec/.test(target.act) && target.tag !== 'a') issue('toque_muerto', scr, `"${target.lab.slice(0, 40)}" no hizo nada visible`, target.soft ? 'media' : 'media');
    if (toastNow) res.steps.push({ scr, goal, a: 'aviso: ' + toastNow });
    res.steps.push({ scr, goal, a, changed });
  }
  for (; gi < goals.length; gi++) if (!res.goals[goals[gi]]) res.goals[goals[gi]] = { ok: false, pasos: onGoal, donde: res.screens[res.screens.length - 1], motivo: 'se acabó la paciencia' };
  res.ms = Date.now() - res.t0; res.issues.forEach(i => delete i.k);
  try { await page.screenshot({ path: `${out}/p${String(p.id).padStart(3, '0')}-fin.png` }); } catch (e) {}
  await ctx.close();
  return res;
}
let BROWSER;
(async () => {
  BROWSER = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const list = PERS.filter(p => p.id >= from && p.id <= to); const results = []; let k = 0;
  await Promise.all(Array.from({ length: PAR }, async () => { while (k < list.length) { const p = list[k++]; try { const r = await run(p); results.push(r); fs.writeFileSync(`${out}/p${String(p.id).padStart(3, '0')}.json`, JSON.stringify(r, null, 1)); process.stdout.write(`${p.id}${Object.values(r.goals).every(g => g.ok) ? '✓' : '·'} `); } catch (e) { process.stdout.write(`${p.id}✗(${e.message.slice(0, 60)}) `); } } }));
  await BROWSER.close(); console.log('\nlisto', results.length); process.exit(0);
})();
