/* Botella · beta. Lanza tu voz al mar: llega a ocho orillas y quien quiere, te responde. */
'use strict';
const { createClient } = window.supabase;
const CFG = window.BOTELLA || {};
const sb = createClient(CFG.url || 'https://x.supabase.co', CFG.key || 'x', { auth: { persistSession: true, autoRefreshToken: true } });

/* ================= BASE ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get(k, d) { try { const v = localStorage.getItem('botella-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('botella-' + k, JSON.stringify(v)); } catch (e) {} } };
const uid = () => S.session?.user?.id;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = s => { let h = 7; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); };
const COLORS = ['#7FD8C9', '#FFC24B', '#8E8CFF', '#FF70A9', '#FFB061', '#9FE3B0'];
const colorOf = id => COLORS[hash(id) % COLORS.length];
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hap = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const MAXV = 60, MINV = 2, MAXCALL = 30 * 60;

const DISTRICTS = ['Barranco', 'Miraflores', 'San Isidro', 'Surco', 'Lince', 'Magdalena', 'Jesús María', 'Pueblo Libre', 'San Miguel', 'San Borja', 'La Molina', 'Chorrillos', 'Lima Centro', 'Los Olivos', 'Otro distrito'];
const TOPICS = ['Música', 'Cine', 'Libros', 'Viajes', 'Fútbol', 'Comida', 'La ciudad', 'Trabajo', 'Filosofía', 'Amor', 'Tecnología', 'Arte'];
/* Antes de saber su nombre, de alguien se ve un tema que comparten contigo, nunca su distrito (igual que vibe_phrase en el servidor). */
const LOVES = { 'Música': 'ama la música', 'Cine': 'ama el cine', 'Libros': 'ama los libros', 'Viajes': 'ama viajar', 'Fútbol': 'ama el fútbol', 'Comida': 'ama comer rico', 'La ciudad': 'ama la ciudad', 'Trabajo': 'vive su trabajo', 'Filosofía': 'ama la filosofía', 'Amor': 'cree en el amor', 'Tecnología': 'ama la tecnología', 'Arte': 'ama el arte' };
const someone = t => t ? 'alguien que ' + (LOVES[t] || 'ama ' + String(t).toLowerCase()) : 'alguien';
const SEEKS = ['Conversaciones profundas', 'Reírme un rato', 'Conocer gente en Lima', 'Que alguien me escuche', 'Conocer a alguien especial'];
const KINDS = { Pregunta: ['¿Qué canción te devuelve a tus 15 años?', '¿Cuál es tu lugar secreto en Lima?', '¿Qué harías si mañana no tuvieras que trabajar?'], 'Confesión': ['Nunca he ido sola al cine y quiero intentarlo.', 'Extraño tener alguien con quien hablar de libros.'], Historia: ['Lo más raro que me pasó en una combi.', 'El día que me perdí en el Centro y fue lo mejor.'] };

const ICONS = {
  back: '<path d="M15 5l-7 7 7 7"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  end: '<path d="M3 14c5-4.5 13-4.5 18 0l-2.5 3-3.5-1.5V13a10 10 0 00-6 0v2.5L5.5 17z" fill="currentColor" stroke="none"/>',
  mute: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0011.5 5.4M19 11c0 .7-.1 1.3-.3 1.9M12 18v3M4 4l16 16"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', chat: '<path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>', check: '<path d="M5 12l5 5 9-10"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  heart: '<path d="M12 20s-8-4.5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6.5-8 11-8 11z"/>', export: '<path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"/>',
  bottle: '<path d="M10 3h4v3l2 3v11a1 1 0 01-1 1H9a1 1 0 01-1-1V9l2-3z"/><path d="M8 13h8"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>', moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  pausei: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>', block: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  out: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 016 0v2"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14a6 6 0 013.5 6"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>', gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/>',
  tide: '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><circle cx="12" cy="7" r="3"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'
};
const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const sb_ = () => '<div class="sbs" aria-hidden="true"></div>';
const orb = (c, size = 44, talk = false) => `<span class="orb${talk ? ' talk' : ''}" style="--c:${c};width:${size}px;height:${size}px" aria-hidden="true"></span>`;
const GLASS = { verde: ['rgba(150,225,140,.95)', 'rgba(110,200,110,.24)', '140,215,130'], ambar: ['rgba(240,170,90,.95)', 'rgba(220,140,60,.26)', '235,165,85'], esmerilado: ['rgba(235,242,248,.95)', 'rgba(220,232,240,.3)', '225,236,245'] };
const bottleSVG = (stroke = 'rgba(170,240,228,.9)', fill = 'rgba(127,216,201,.2)') => `<svg viewBox="0 0 120 40" aria-hidden="true"><path d="M16 6h56q14 0 18 8h18v12H90q-4 8-18 8H16q-10 0-10-14T16 6z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/><rect x="22" y="14" width="48" height="12" rx="5" fill="#F6E7C4"/><rect x="108" y="15" width="8" height="10" fill="#8A5A33"/></svg>`;
const ago = iso => { const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`; const d = Math.round(h / 24); return d === 1 ? 'ayer' : `hace ${d} días`; };
const clock = iso => { const d = new Date(iso), t = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }); const today = new Date().toDateString() === d.toDateString(); const y = new Date(Date.now() - 864e5).toDateString() === d.toDateString(); return today ? `Hoy, ${t}` : y ? `Ayer, ${t}` : `${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}, ${t}`; };

/* ================= ESTADO ================= */
const S = {
  session: null, me: null, shore: [], bottles: [], convos: [], msgs: {}, sel: null, convo: null, launching: false,
  slide: 0, authMode: 'signup', code: null, draft: { name: '', district: 'Barranco', adult: false, topics: [], seeks: [] },
  kind: 'Pregunta', idea: -1, btype: 'free', target: null, featured: false, body: '', rec: {}, busy: false, marea: [], outings: [], outdated: false
};
const P = { screens: {}, actions: {}, cur: null, curId: null, hist: [], timers: [], canvas: null, ctx: null, root: null, t0: performance.now(), st: {} };
const readMap = LS.get('read', {});
const markRead = id => { readMap[id] = new Date().toISOString(); LS.set('read', readMap); };
const unread = c => !c.last_mine && (!readMap[c.id] || new Date(c.last_at) > new Date(readMap[c.id]));

/* ================= AVISOS ================= */
const phoneEl = () => document.querySelector('.phone');
// Aviso pasajero: oscuro, justo encima del pie (o de la hoja abierta); nunca tapa los títulos.
function toast(msg, kind) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const ph = phoneEl(), t = document.createElement('div'); t.dataset.at = Date.now();
  t.className = 'toast' + (kind ? ' ' + kind : ''); t.setAttribute('role', 'status'); t.textContent = msg;
  // Se ubica otra vez cuando la pantalla nueva termina de montarse (el aviso suele llegar justo al cambiar de pantalla).
  // Con una hoja abierta (aunque se abra después del aviso): encima de la hoja si cabe; si la hoja es alta, dentro, bajo su título, sin tapar sus opciones.
  const place = () => { if (!t.isConnected) return; const scr = [...ph.querySelectorAll('.screen:not(.exiting)')].pop(), sh = document.getElementById('sheet'), pr = ph.getBoundingClientRect();
    if (sh) { if (t.parentNode === sh) return; const room = sh.getBoundingClientRect().top - pr.top;
      if (room < (t.offsetHeight || 56) + 64) { t.classList.add('insheet'); sh.insertBefore(t, sh.children[2] || null); return; } }
    else if (t.parentNode !== ph) { t.classList.remove('insheet'); ph.appendChild(t); }
    const anchor = sh || (scr && scr.querySelector('.nextstep, .foot, .tabs'));
    t.style.setProperty('--toast-b', (anchor ? Math.max(16, pr.bottom - anchor.getBoundingClientRect().top + 8) : 24) + 'px'); };
  ph.appendChild(t); place(); requestAnimationFrame(place); const iv = setInterval(place, 150); setTimeout(() => { clearInterval(iv); t.remove(); }, 3300);
}
function banner({ ic = '', title, text = '', go: target = '', v = '' }) {
  document.querySelectorAll('.banner').forEach(b => b.remove());
  const b = document.createElement('button'); b.className = 'banner'; b.setAttribute('role', 'status');
  if (target) { b.dataset.act = 'bannerGo'; b.dataset.go = target; b.dataset.v = v; }
  b.innerHTML = `<span class="bi">${ic}</span><span class="bt"><b>${esc(title)}</b>${text ? `<span>${esc(text)}</span>` : ''}</span><small>ahora</small>`;
  // Baja justo bajo la cabecera de la pantalla: nunca tapa el título.
  const ph = phoneEl(), place = () => { if (!b.isConnected) return; const scr = [...ph.querySelectorAll('.screen:not(.exiting)')].pop(), top = scr && scr.querySelector('.top'), pr = ph.getBoundingClientRect();
    b.style.top = top ? Math.max(12, top.getBoundingClientRect().bottom - pr.top + 6) + 'px' : ''; };
  ph.appendChild(b); place(); requestAnimationFrame(place); const iv = setInterval(place, 200); setTimeout(() => clearInterval(iv), 1600); hap([10, 40, 10]);
  const out = () => { if (!b.isConnected) return; b.classList.add('out'); setTimeout(() => b.remove(), 360); };
  setTimeout(out, 5200); b.addEventListener('click', () => setTimeout(out, 50));
}
P.actions.bannerGo = el => { const t = el.dataset.go, v = el.dataset.v; if (t === 'chat' && v) openChat(v); else go(t, { fade: true }); };
function err(e, fallback) {
  console.error(e); if (!navigator.onLine) return toast('Sin conexión. Revisa tu internet e intenta otra vez.');
  const m = e && e.message || '';
  const mine = /[áéíóú¿¡ñ]|Ese |Esta |Te |Primero|Falta|Lanzaste|botella/.test(m) && !/row-level|violates|JWT|fetch|policy/i.test(m);
  toast(mine ? m : (fallback || 'No salió. Fue cosa nuestra: intenta otra vez en un momento.'));
}
function closeSheet() { document.getElementById('sheet')?.remove(); }
P.actions.closeSheet = closeSheet;
function sheet(html) { closeSheet(); const s = document.createElement('div'); s.className = 'sheet pad'; s.id = 'sheet'; s.innerHTML = `<div class="grab"></div>${html}`; (P.root || phoneEl()).appendChild(s); return s; }
const sheetHead = t => `<div style="display:flex;align-items:center;margin-bottom:8px"><span class="h3" style="flex:1">${t}</span><button class="iconbtn" data-act="closeSheet" aria-label="Cerrar">${icon('close')}</button></div>`;

/* ================= DIBUJO DEL MAR ================= */
const STARS = (() => { const r = rng(7); return Array.from({ length: 80 }, () => [r(), r() * .55, r() * 1.4 + .3, r() * 6]); })();
function sky(ctx, w, h, t, horizon) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#020B15'); g.addColorStop(horizon, '#0A2238'); g.addColorStop(1, '#03101C');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (const [x, y, s, p] of STARS) { if (y * h > horizon * h - 10) continue; ctx.fillStyle = 'rgba(230,245,255,' + (.35 + Math.sin(t * 1.5 + p) * .25) + ')'; ctx.fillRect(x * w, y * h, s, s); }
  const mx = w * .78, my = h * .14, mr = Math.min(w, h) * .06;
  const mg = ctx.createRadialGradient(mx, my, mr * .5, mx, my, mr * 5); mg.addColorStop(0, 'rgba(220,245,240,.22)'); mg.addColorStop(1, 'rgba(220,245,240,0)');
  ctx.fillStyle = mg; ctx.fillRect(0, 0, w, h * horizon + 40); ctx.fillStyle = '#EAF6F2'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
  return mx;
}
function waves(ctx, w, h, t, horizon, mx, onLayer, n = 6) {
  const span = (1 - horizon) / n;
  const wave = (x, i) => h * (horizon + i * span) + Math.sin(x * .009 + t * (.6 + i * .15) + i * 1.7) * (4 + i * 3) + Math.sin(x * .021 - t * .9 + i) * 3;
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, wave(x, i)); ctx.lineTo(w, h); ctx.closePath();
    ctx.fillStyle = 'rgba(' + (6 + i * 2) + ',' + (30 + i * 5 - i * i) + ',' + (54 - i * 4) + ',.94)'; ctx.fill();
    for (let k = 0; k < 5; k++) { const gx = mx + Math.sin(t * .7 + k * 2 + i) * (16 + i * 10); ctx.fillStyle = 'rgba(220,245,240,' + Math.max(0, .16 - i * .022) + ')'; ctx.fillRect(gx - (12 - k), wave(gx, i) + 3, 24 - k * 2, 1.5); }
    onLayer?.(i, x => wave(x, i));
  }
}
function bottle(ctx, x, y, s, rot, glow = 1, col = '127,216,201', cork = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(' + col + ',' + .7 * glow + ')'; ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(' + col + ',.22)'; ctx.strokeStyle = 'rgba(' + col + ',.95)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, -14); ctx.lineTo(16, -14); ctx.quadraticCurveTo(30, -14, 34, -6); ctx.lineTo(52, -6); ctx.lineTo(52, 6); ctx.lineTo(34, 6); ctx.quadraticCurveTo(30, 14, 16, 14); ctx.lineTo(-40, 14); ctx.quadraticCurveTo(-48, 14, -48, 0); ctx.quadraticCurveTo(-48, -14, -40, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 18; ctx.shadowColor = 'rgba(255,236,190,.9)'; ctx.fillStyle = '#F6E7C4'; ctx.beginPath(); ctx.rect(-34, -6, 46, 12); ctx.fill();
  ctx.shadowBlur = 0; if (cork) { ctx.fillStyle = '#8A5A33'; ctx.fillRect(52, -5, 8, 10); } ctx.restore();
}
function lighthouse(ctx, x, y, s, t, beamA, on = 1) {
  ctx.save(); ctx.translate(x, y);
  if (on > 0) { ctx.save(); ctx.rotate(beamA); const g = ctx.createLinearGradient(0, 0, -s * 30, 0); g.addColorStop(0, `rgba(255,244,210,${.55 * on})`); g.addColorStop(1, 'rgba(255,244,210,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -s * 2.4); ctx.lineTo(-s * 34, -s * 7); ctx.lineTo(-s * 34, s * 7); ctx.lineTo(0, -s * 1.6); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#0A1B2B'; ctx.beginPath(); ctx.moveTo(-s * 1.2, s * 2); ctx.lineTo(-s * .7, -s * 2); ctx.lineTo(s * .7, -s * 2); ctx.lineTo(s * 1.2, s * 2); ctx.fill();
  ctx.fillStyle = 'rgba(234,246,242,.25)'; ctx.fillRect(-s * .9, -s * .2, s * 1.8, s * .4);
  ctx.fillStyle = `rgba(255,244,210,${.5 + on * .5})`; ctx.shadowColor = '#FFF4D2'; ctx.shadowBlur = 20 * on; ctx.fillRect(-s * .55, -s * 2.9, s * 1.1, s * .9); ctx.shadowBlur = 0;
  ctx.fillStyle = '#0A1B2B'; ctx.beginPath(); ctx.moveTo(-s * .8, -s * 2.9); ctx.lineTo(0, -s * 3.6); ctx.lineTo(s * .8, -s * 2.9); ctx.fill();
  ctx.restore();
}
const night = (horizon, withBottle, layer = 2) => (ctx, w, h, t) => {
  const mx = sky(ctx, w, h, t, horizon);
  waves(ctx, w, h, t, horizon, mx, (i, wv) => { if (withBottle && i === layer) { const bx = w * .4 + Math.sin(t * .25) * w * .05, by = wv(bx), sl = (wv(bx + 6) - wv(bx - 6)) / 12; bottle(ctx, bx, by - 6, Math.min(Math.min(w, h) * .0042 + .3, 1.5), Math.atan(sl) - .35); } });
};
const ease = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
// Con "reducir movimiento" las escenas se muestran en su cuadro final, no en el inicial.
const since = key => reduceMotion ? 99 : (performance.now() - (P.st[key] || 0)) / 1000;

/* ================= NAVEGACIÓN ================= */
function sizeCanvas() {
  if (!P.canvas) return;
  const r = P.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
  P.cw = r.width; P.ch = r.height; P.canvas.width = Math.round(r.width * dpr); P.canvas.height = Math.round(r.height * dpr);
  P.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawFrame(now) { if (!P.canvas || !P.cur?.anim) return; try { P.cur.anim(P.ctx, P.cw, P.ch, (now - P.t0) / 1000 + 1.5, P.st); } catch (e) {} }
function loop(now) { if (!reduceMotion && !document.hidden) drawFrame(now); requestAnimationFrame(loop); }
function go(id, { back = false, fade = false, noPush = false } = {}) {
  const def = P.screens[id]; if (!def) return;
  P.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); P.timers = [];
  if (P.curId !== id) { recCancel(); stopPlayer(); document.querySelectorAll('.toast').forEach(t => { if (Date.now() - (+t.dataset.at || 0) > 400) t.remove(); }); } // un aviso viejo no sigue a la pantalla nueva
  const same = P.curId === id;
  if (!same) P.cur?.leave?.();
  if (!back && !noPush && P.curId && !same && !P.cur?.transient) P.hist.push(P.curId);
  P.curId = id; P.cur = def;
  const app = document.getElementById('app');
  const old = P.root && P.root.isConnected ? P.root : null;
  const keepScroll = same ? old?.querySelector('.scroll')?.scrollTop : 0;
  [...app.children].forEach(c => { if (c !== old) c.remove(); });
  const sec = document.createElement('section');
  const dir = same || fade ? 'enter-fade' : back ? 'enter-b' : 'enter-f';
  sec.className = 'screen ' + (same ? 'still ' : '') + (reduceMotion ? (same ? '' : 'enter-fade') : same ? '' : dir) + (def.cls ? ' ' + def.cls : '') + (def.anim ? ' sea' : '');
  sec.innerHTML = (def.anim ? '<canvas class="bgc" aria-hidden="true"></canvas>' : '') + def.render();
  app.appendChild(sec); P.root = sec;
  if (old) {
    if (same || reduceMotion) old.remove();
    else { old.querySelectorAll('[id]').forEach(e => e.removeAttribute('id')); old.setAttribute('aria-hidden', 'true'); old.classList.remove('enter-f', 'enter-b', 'enter-fade'); old.classList.add('exiting', fade ? 'exit-fade' : back ? 'exit-b' : 'exit-f'); setTimeout(() => old.remove(), 260); }
  }
  guard();
  if (keepScroll) { const s = sec.querySelector('.scroll'); if (s) s.scrollTop = keepScroll; }
  P.canvas = sec.querySelector('canvas.bgc'); P.ctx = P.canvas?.getContext('2d'); sizeCanvas();
  def.after?.(sec);
  if (P.canvas) drawFrame(performance.now());
}
const rerender = () => { if (P.curId) go(P.curId, { noPush: true }); };
// Atrás de Android y el gesto de borde vuelven a la pantalla anterior, sin salir de la app.
// Una sola entrada de guardia en el historial: el atrás del teléfono cierra la hoja o vuelve una pantalla.
const guard = () => { try { if (P.hist.length && !history.state?.g) history.pushState({ g: 1 }, ''); } catch (e) {} };
addEventListener('popstate', () => { if (document.getElementById('sheet')) closeSheet(); else if (P.hist.length) back(); guard(); });
function back() { let prev = P.hist.pop(); while (prev && prev === P.curId) prev = P.hist.pop(); go(prev || (S.me ? 'orilla' : 'splash'), { back: true }); }
P.actions.back = back;
const backBtn = () => `<button class="iconbtn glass" data-act="back" aria-label="Volver">${icon('back')}</button>`;
const steps = n => `<div class="pad" style="flex:none"><div class="progress" aria-label="Paso ${n} de 6"><i style="width:${n / 6 * 100}%"></i></div></div>`;

function tabsHTML(active) {
  const badge = S.convos.filter(unread).length;
  const items = [['orilla', 'Orilla', 'home'], ['mine', 'Mis botellas', 'bottle'], ['convos', 'Conversaciones', 'chat'], ['store', 'Muelle', 'bag']];
  return `<nav class="tabs" aria-label="Secciones">${items.map(([id, label, ic]) => `<button class="${id === active ? 'on' : ''}" data-go="${id}" data-fade ${id === active ? 'aria-current="page"' : ''}>${icon(ic)}${label}${id === 'convos' && badge ? `<span class="badge">${badge}</span>` : ''}</button>`).join('')}</nav>`;
}

/* mantener presionado */
function holdBtn(act, label, ms = 900, cls = 'btn-a') { return `<button class="btn ${cls} hold" data-hold="${act}" style="--hold:${ms}ms"><span class="fill"></span><span>${label}</span></button>`; }
function bindHold() {
  let timer = null, el = null;
  const stop = () => { if (el) el.classList.remove('on'); clearTimeout(timer); timer = null; el = null; };
  document.addEventListener('contextmenu', e => { if (e.target.closest('[data-hold]')) e.preventDefault(); });
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest('[data-hold]'); if (!h) return;
    el = h; h.classList.add('on'); P.st.holdAt = performance.now();
    const ms = parseInt(getComputedStyle(h).getPropertyValue('--hold')) || 900;
    timer = setTimeout(() => { const a = h.dataset.hold; stop(); P.holdFired = performance.now(); P.actions[a]?.(h); }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => document.addEventListener(t, e => { if (!el) return; if (t === 'pointerleave' && e.target !== el) return; stop(); P.st.holdAt = 0; }, true));
  document.addEventListener('click', e => { const h = e.target.closest('[data-hold]'); if (!h) return; if (e.detail === 0) P.actions[h.dataset.hold]?.(h); else if (!h.classList.contains('on') && !P.holdAuto && performance.now() - (P.holdFired || 0) > 800) {
      // Un toque también descorcha: el relleno corre solo y se mantiene el ritual.
      const ms = parseInt(getComputedStyle(h).getPropertyValue('--hold')) || 900; h.classList.add('on'); hap(6); P.holdAuto = true; P.st.holdAt = performance.now();
      setTimeout(() => { P.holdAuto = false; P.st.holdAt = 0; if (!h.isConnected) return; h.classList.remove('on'); P.holdFired = performance.now(); P.actions[h.dataset.hold]?.(h); }, ms);
    } });
}

/* ================= VOZ ================= */
const URLS = new Map(), URLX = new Map();
// Ondas reales de las voces de ejemplo (antes salían inventadas).
let SEEDPEAKS = {}; fetch('/seed/v/peaks.json').then(r => r.ok ? r.json() : {}).then(j => { SEEDPEAKS = j || {}; }).catch(() => {});
const seedURL = p => '/seed/v/' + p.slice(5);
async function signed(paths) {
  paths.forEach(p => { if (p && p.startsWith('seed/') && !URLS.has(p)) URLS.set(p, seedURL(p)); });
  // Los links firmados duran 3 h: pasadas 2,5 h se piden otra vez (si no, al volver al día siguiente nada suena).
  paths.forEach(p => { if (p && URLX.has(p) && URLX.get(p) < Date.now()) { URLS.delete(p); URLX.delete(p); } });
  const need = [...new Set(paths.filter(p => p && !p.startsWith('blob:') && !URLS.has(p)))];
  if (need.length) { const { data } = await sb.storage.from('voice').createSignedUrls(need, 60 * 60 * 3); (data || []).forEach(d => { if (d.signedUrl) { URLS.set(d.path, d.signedUrl); URLX.set(d.path, Date.now() + 2.5 * 3600e3); } }); }
  return paths.map(p => p && p.startsWith('blob:') ? p : URLS.get(p));
}
async function upload(blob, ext) { const path = `${uid()}/${crypto.randomUUID()}.${ext}`; const { error } = await sb.storage.from('voice').upload(path, blob, { contentType: blob.type || undefined, upsert: false }); if (error) throw error; return path; }

const REC = { mr: null, chunks: [], t0: 0, iv: null, stream: null, mime: '', an: null, ac: null, samples: [], id: null };
// Un solo contexto de audio para toda la app (iPhone limita cuántos se abren) y que se reanuda con cada toque.
let AC = null;
function audioCtx() { try { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } if (AC && AC.state !== 'running') AC.resume().catch(() => {}); } catch (e) {} return AC; }
document.addEventListener('pointerdown', () => { if (AC && AC.state !== 'running') AC.resume().catch(() => {}); }, true);
// Micrófono denegado: una hoja con la salida según el error y el teléfono, no un aviso que se va.
function micHelp(e) {
  const ua = navigator.userAgent, ios = /iP(hone|ad|od)/.test(ua) || (/Mac/.test(ua) && 'ontouchend' in document), inApp = /Instagram|FBAN|FBAV|TikTok|Line\//.test(ua), pwa = matchMedia('(display-mode: standalone)').matches, n = e && e.name;
  let steps;
  if (inApp) steps = ios ? 'Estás dentro de otra app. Toca <b>···</b> arriba y elige <b>Abrir en Safari</b>.' : 'Estás dentro de otra app. Toca <b>⋮</b> arriba y elige <b>Abrir en Chrome</b>.';
  else if (n === 'NotFoundError') steps = 'No encontramos un micrófono. Si usas audífonos, desconéctalos y prueba otra vez.';
  else if (n === 'NotReadableError' || n === 'AbortError') steps = 'Otra app está usando el micrófono, quizá una llamada. Ciérrala y vuelve a tocar.';
  else if (ios) steps = pwa ? 'Abre <b>Ajustes</b>, busca <b>Botella</b> o <b>Safari</b>, entra a <b>Micrófono</b> y elige <b>Permitir</b>. Luego vuelve aquí.' : 'Toca <b>aA</b> a la izquierda de la dirección, luego <b>Configuración del sitio web</b> y pon <b>Micrófono</b> en <b>Permitir</b>.';
  else steps = pwa ? 'Mantén presionado el ícono de Botella, toca <b>Información de la app</b>, luego <b>Permisos</b> y activa <b>Micrófono</b>.' : 'Toca el ícono a la izquierda de la dirección, luego <b>Permisos</b> y activa <b>Micrófono</b>.';
  sheet(`${sheetHead('Para grabar, falta tu micrófono')}<p class="muted" style="margin:0 0 10px">${steps}</p><p class="small muted" style="margin:0 0 16px">${icon('lock', 's')} Solo grabamos cuando tú tocas el botón.</p><button class="btn btn-a" data-act="closeSheet">Listo, probar otra vez</button>`);
}
function recMime() { if (!window.MediaRecorder) return null; for (const m of ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']) if (MediaRecorder.isTypeSupported(m)) return m; return ''; }
async function recStart(max, onTick, onAuto) {
  const mime = recMime(); if (mime === null) { toast('Aquí no se puede grabar. Si abriste el link desde Instagram o WhatsApp, toca ⋯ y elige “Abrir en el navegador”.'); return false; }
  const ctx = audioCtx(); // se crea dentro del toque: en iPhone, si nace después, queda pausado y la onda sale plana
  // Solo limpieza de captura: menos ruido, eco y volumen parejo. La voz no se modula.
  try { REC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: { ideal: 1 } } }); } catch (e) { micHelp(e); return false; }
  stopPlayer(); REC.mime = mime; REC.chunks = []; REC.samples = [];
  try { REC.src = ctx.createMediaStreamSource(REC.stream); REC.an = ctx.createAnalyser(); REC.an.fftSize = 2048; REC.an.smoothingTimeConstant = 0; REC.src.connect(REC.an); } catch (e) { REC.an = null; }
  const opts = mime ? { mimeType: mime } : {}; opts.audioBitsPerSecond = /webm/.test(mime) ? 32000 : 64000; // una nota de 60 s pesa menos de medio mega
  try { REC.mr = new MediaRecorder(REC.stream, opts); } catch (e) { REC.mr = new MediaRecorder(REC.stream, mime ? { mimeType: mime } : undefined); } REC.mr.ondataavailable = e => { if (e.data.size) REC.chunks.push(e.data); }; REC.mr.start(250); REC.t0 = Date.now(); hap(10);
  const buf = new Uint8Array(2048);
  REC.iv = setInterval(() => {
    const t = (Date.now() - REC.t0) / 1000; let lv = 0;
    // Nivel real (RMS en dB, de -55 a -5 dBFS): la onda se parece a lo que dijiste.
    if (REC.an) { REC.an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } lv = Math.min(1, Math.max(0, (20 * Math.log10(Math.sqrt(s / buf.length) + 1e-6) + 55) / 50)); }
    REC.samples.push(lv); onTick && onTick(t, REC.samples); if (t >= max) { hap(20); onAuto && onAuto(); }
  }, 50);
  return true;
}
function toPeaks(s, n = 28) { if (!s.length || !Math.max(...s)) return null; const o = []; for (let i = 0; i < n; i++) { const a = Math.floor(i * s.length / n), b = Math.max(a + 1, Math.floor((i + 1) * s.length / n)); o.push(Math.max(...s.slice(a, b))); } const mx = Math.max(...o) || 1; return o.map(v => Math.round(Math.max(.12, v / mx) * 100) / 100); }
function recStop() {
  return new Promise(res => {
    const mr = REC.mr; if (!mr) { res(null); return; } clearInterval(REC.iv);
    const secs = Math.round((Date.now() - REC.t0) / 1000), peaks = toPeaks(REC.samples);
    const done = () => { REC.stream && REC.stream.getTracks().forEach(t => t.stop()); try { REC.src && REC.src.disconnect(); } catch (e) {} REC.mr = null; REC.id = null; };
    mr.onstop = () => {
      const type = (mr.mimeType || REC.mime || 'audio/webm'); const blob = new Blob(REC.chunks, { type: type.split(';')[0] }); done(); hap(8);
      if (secs < MINV) { toast('Muy cortita. Graba al menos 2 segundos.'); res(null); return; }
      res({ blob, secs: Math.min(Math.max(secs, 1), MAXV), peaks, ext: /mp4|aac/.test(type) ? 'm4a' : 'webm', url: URL.createObjectURL(blob) });
    };
    try { mr.stop(); } catch (e) { done(); res(null); }
  });
}
function recCancel() { if (REC.mr) { clearInterval(REC.iv); try { REC.mr.onstop = null; REC.mr.stop(); } catch (e) {} REC.stream && REC.stream.getTracks().forEach(t => t.stop()); try { REC.src && REC.src.disconnect(); } catch (e) {} REC.mr = null; REC.id = null; } }

/* nota de voz: botón con barras */
function bars(peaks, seed, n = 26) {
  if (!(peaks && peaks.length) && SEEDPEAKS[seed]) peaks = SEEDPEAKS[seed];
  const r = rng(hash(seed)); let b = '';
  for (let i = 0; i < n; i++) { const p = peaks && peaks.length ? peaks[Math.floor(i * peaks.length / n)] : null; const h = p != null ? Math.round(6 + p * 20) : 6 + Math.round((Math.sin(i * .55 + (hash(seed) % 7)) * .5 + .5) * 14 + r() * 8); b += `<i style="height:${h}px"></i>`; }
  return b;
}
function vn(path, secs, { mine = false, peaks = null } = {}) {
  return `<button class="vn${mine ? ' mine' : ''}" data-play="${esc(path)}" data-secs="${secs}" aria-label="Escuchar nota de voz de ${fmt(secs)}"><span class="vp">${icon('play', 's')}</span><span class="vb">${bars(peaks, path)}</span><span class="vd">${fmt(secs)}</span></button>`;
}
let player = null, playBtn = null;
function stopPlayer() { if (player) { try { player.pause(); } catch (e) {} } }
async function play(btn) {
  const path = btn.dataset.play, dur = +btn.dataset.secs;
  if (playBtn === btn && player) { player.pause(); return; }
  stopPlayer();
  if (navigator.onLine === false) { toast('Sin conexión. Se escucha cuando vuelvas.'); return; }
  btn.classList.add('loading');
  let url; try { [url] = await signed([path]); } catch (e) {}
  if (!url) { btn.classList.remove('loading'); toast('No cargó esta nota de voz. Revisa tu internet y tócala otra vez.'); return; }
  const a = new Audio(); a.setAttribute('playsinline', ''); a.preload = 'auto'; a.src = url; player = a; playBtn = btn;
  const bs = [...btn.querySelectorAll('.vb i')];
  const reset = () => { btn.classList.remove('loading'); btn.querySelector('.vp').innerHTML = icon('play', 's'); bs.forEach(b => b.classList.remove('on')); btn.querySelector('.vd').textContent = fmt(dur); if (player === a) { player = null; playBtn = null; } };
  a.onplay = () => { btn.querySelector('.vp').innerHTML = icon('pause', 's'); };
  a.onwaiting = a.onstalled = () => btn.classList.add('loading'); a.onplaying = () => btn.classList.remove('loading');
  a.ontimeupdate = () => { const d = isFinite(a.duration) && a.duration > 0 ? a.duration : dur; const p = a.currentTime / d; bs.forEach((b, i) => b.classList.toggle('on', (i + .5) / bs.length <= p)); btn.querySelector('.vd').textContent = fmt(Math.max(0, Math.ceil(d - a.currentTime))); };
  a.onpause = a.onended = reset;
  // Si el link venció o falló la red, se pide de nuevo una vez antes de avisar.
  a.onerror = () => { reset(); if (!btn.dataset.retried && !path.startsWith('blob:') && !path.startsWith('seed/')) { btn.dataset.retried = 1; URLS.delete(path); URLX.delete(path); play(btn); return; } toast('No cargó esta nota de voz. Revisa tu internet y tócala otra vez.'); };
  a.play().catch(() => reset());
}

/* grabadora grande (registro, lanzar, responder) */
function recBox(id, hint = 'Toca para grabar. Con 10 segundos basta.') {
  const r = S.rec[id];
  if (r) return `<div class="rec" id="rec-${id}"><div class="eyebrow a">Tu nota de voz</div>${vn(r.url, r.secs, { mine: true, peaks: r.peaks })}<button class="btn btn-text" data-act="rerec" data-id="${id}">Volver a grabar</button></div>`;
  return `<div class="rec" id="rec-${id}"><div class="time num">0:00</div><div class="wave"></div><button class="mic" data-act="recToggle" data-id="${id}" aria-label="Grabar">${icon('mic')}</button><div class="hint">${hint}</div></div>`;
}
P.actions.recToggle = async btn => {
  const id = btn.dataset.id, box = document.getElementById('rec-' + id); if (!box) return;
  if (REC.mr && REC.id === id) { const r = await recStop(); if (r) S.rec[id] = r; if (box.isConnected) box.outerHTML = recBox(id); refreshNeeds(); if (r) P.actions.recorded?.(id); if (r && (id === 'lp' || id === 'duo2')) rerender(); return; }
  if (REC.mr) return;
  const wave = box.querySelector('.wave'), time = box.querySelector('.time'), hint = box.querySelector('.hint');
  const ok = await recStart(MAXV, (t, s) => {
    time.textContent = fmt(t);
    const i = document.createElement('i'); i.style.height = Math.round(6 + 48 * (s[s.length - 1] || 0)) + 'px'; wave.appendChild(i);
    if (wave.children.length > 64) wave.firstChild.remove();
  }, () => P.actions.recToggle(btn));
  if (!ok) return;
  REC.id = id; box.classList.add('live'); btn.innerHTML = icon('stop'); btn.setAttribute('aria-label', 'Detener'); hint.textContent = 'Grabando… toca el cuadrado para terminar'; wave.innerHTML = '';
};
P.actions.rerec = el => { const id = el.dataset.id; delete S.rec[id]; document.getElementById('rec-' + id).outerHTML = recBox(id); refreshNeeds(); P.actions.recorded?.(id); if (id === 'lp' || id === 'duo2') rerender(); };
function refreshNeeds() { document.querySelectorAll('[data-needs]').forEach(b => b.classList.toggle('soft', !S.rec[b.dataset.needs])); }
function needVoice(id) {
  toast('Primero graba tu nota de voz: toca el micrófono.');
  const box = document.getElementById('rec-' + id); box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const m = box?.querySelector('.mic'); if (m) { m.classList.remove('nudge'); void m.offsetWidth; m.classList.add('nudge'); }
}

/* ================= DATOS ================= */
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args); if (error) throw error; return data; }
async function loadMe() { let d = await rpc('tide'); d = Array.isArray(d) ? d[0] : d; S.me = d && d.id ? d : null; return S.me; } // sin perfil, el servidor devuelve una fila vacía
async function loadShore() { S.shore = (await rpc('shore')) || []; }
async function loadBottles() { S.bottles = (await rpc('my_bottles')) || []; }
async function loadConvos() { S.convos = (await rpc('my_convos')) || []; watchPending(); }
async function loadMarea() { S.marea = (await rpc('marea')) || []; }
async function loadOutings() { S.outings = (await rpc('outings_list')) || []; }
/* respuestas programadas (las personas de ejemplo responden a los pocos segundos): la app vuelve a mirar justo a esa hora */
let pendT = null;
function watchPending(extraMs) {
  P.extra = (P.extra || []).filter(t => t > Date.now()); if (extraMs) P.extra.push(Date.now() + extraMs);
  const nexts = [...S.convos.map(c => c.next_at && new Date(c.next_at).getTime()).filter(Boolean), ...P.extra];
  if (!nexts.length) return; const at = Math.min(...nexts); if (P.pendAt && P.pendAt <= at && P.pendAt > Date.now()) return;
  clearTimeout(pendT); P.pendAt = at;
  pendT = setTimeout(async () => {
    P.pendAt = 0; const before = new Map(S.convos.map(c => [c.id, c.last_at]));
    try { await loadConvos(); } catch (e) { return; }
    for (const c of S.convos) {
      if (c.last_mine || before.get(c.id) === c.last_at) continue;
      if (P.curId === 'chat' && S.convo && S.convo.id === c.id) { S.convo = c; await loadMsgs(c.id).catch(() => {}); markRead(c.id); if (!(REC.mr && REC.id === 'chat') && !playBtn) rerender(); continue; }
      banner({ ic: orb(colorOf(c.id), 34), title: before.has(c.id) ? c.alias : 'Alguien respondió tu botella', text: before.has(c.id) ? 'Te mandó una nota de voz' : 'Toca para escuchar su respuesta.', go: 'chat', v: c.id });
    }
    if (['convos', 'orilla', 'mine'].includes(P.curId)) rerender();
  }, Math.max(800, at - Date.now() + 1200));
}
async function loadMsgs(cid) { const { data, error } = await sb.from('messages').select('*').eq('convo_id', cid).order('created_at'); if (error) throw error; S.msgs[cid] = data || []; }
const refreshAll = () => Promise.all([loadShore(), loadBottles(), loadConvos()]);
