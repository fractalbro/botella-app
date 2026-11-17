/* Botella · volver: primer día, constancia, pregunta del día, mapa de tu voz, botella para dos, lecturas y avisos. */
'use strict';

/* ================= BASE ================= */
Object.assign(ICONS, {
  flame: '<path d="M12 3c.6 3.2 4.6 4.8 4.6 9.4a4.6 4.6 0 01-9.2 0c0-1.7.6-2.9 1.5-3.9.3 1.2.9 1.9 1.6 2.2C10.200 8.300 10.800 5.600 12 3z"/>',
  map: '<path d="M9 4L3 6.500v13.500l6-2.500 6 2.500 6-2.500V4l-6 2.500z"/><path d="M9 4v13.500M15 6.500V20"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.500 2h-15z"/><path d="M10 20a2 2 0 004 0"/>',
  duo: '<circle cx="8" cy="9" r="3.200"/><circle cx="16" cy="9" r="3.200"/><path d="M2.500 19a5.500 5.500 0 0111 0M10.500 19a5.500 5.500 0 0111 0"/>',
  link: '<path d="M10 14a4 4 0 005.700 0l3-3a4 4 0 00-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 00-5.700 0l-3 3a4 4 0 005.700 5.700l1-1"/>',
  quote: '<path d="M5 17c2-1 3-3 3-6H5V6h5v5c0 4-2 6-5 6zM14 17c2-1 3-3 3-6h-3V6h5v5c0 4-2 6-5 6z"/>'
});
Object.assign(GLASS, {
  coral: ['rgba(255,150,135,.96)', 'rgba(255,125,110,.24)', '255,140,125'], violeta: ['rgba(190,165,255,.96)', 'rgba(160,130,255,.26)', '180,155,255'],
  aurora: ['rgba(125,205,255,.96)', 'rgba(90,180,255,.24)', '115,200,255'], luna: ['rgba(250,250,255,.98)', 'rgba(235,240,255,.36)', '245,247,255']
});
const UNLOCKS = [
  { days: 2, kind: 'color', name: 'Una botella de color' }, { days: 3, kind: 'glass', item: 'coral', name: 'Vidrio coral' },
  { days: 5, kind: 'gift', name: 'Una botella con lacre' }, { days: 7, kind: 'glass', item: 'violeta', name: 'Vidrio violeta' },
  { days: 10, kind: 'far', name: 'Una botella que llega lejos' }, { days: 14, kind: 'glass', item: 'aurora', name: 'Vidrio aurora' },
  { days: 21, kind: 'gift', name: 'Dos botellas con lacre' }, { days: 30, kind: 'glass', item: 'luna', name: 'Vidrio de luna' }
];
const FIRST = { id: 'first', first: true, bottle: '5a5ab000-0000-4000-8000-000000000004', status: 'waiting', kind: 'Pregunta', body: '¿Qué canción te devuelve a tus 15 años?', voice: 'seed/ivan-say.mp3', voice_secs: 14, voice_peaks: null, place: 'Música', sample: true, btype: 'free', arrived: new Date().toISOString() };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const b64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
const deviceId = () => { let d = LS.get('device', ''); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); LS.set('device', d); } return d; };
const myCode = () => S.me?.code_used || S.code || LS.get('code', '') || '';
const linkTo = (k, v) => `${location.origin}/?${k}=${encodeURIComponent(v)}${myCode() ? '&c=' + encodeURIComponent(myCode()) : ''}`;
async function share(el, { title, text, url }) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); } catch (e) {}
  toast('Link copiado. Pégalo en WhatsApp o donde quieras.');
}
/* cuánto falta para una hora */
function until(iso) { const m = Math.round((new Date(iso) - Date.now()) / 60000); if (m <= 0) return 'ya'; if (m < 60) return `${m} min`; const h = Math.round(m / 60); return h < 48 ? `${h} h` : `${Math.round(h / 24)} días`; }
const limaNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
function tideIn() { const n = limaNow(), mins = (21 - n.getHours()) * 60 - n.getMinutes(); return mins <= 0 ? '' : mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`; }
function leaves(iso) { if (!iso) return ''; const d = new Date(iso), ms = d - Date.now(); if (ms <= 0) return ''; const sameDay = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) === limaToday(); return ms < 3 * 3600e3 ? `se va en ${until(iso)}` : sameDay ? 'se va hoy a las 21:00' : 'se va mañana a las 21:00'; }

/* servidor (funciones de Vercel): avisos push y filtro de lecturas */
let srvP = null;
const srv = () => srvP || (srvP = fetch('/api/health').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(d => (S.srv = d || {})));
let pingT = null;
function ping(ms = 1500) { clearTimeout(pingT); pingT = setTimeout(() => { fetch('/api/tick', { method: 'POST' }).catch(() => {}); }, ms); }

async function loadHome() { try { S.home = await rpc('home'); } catch (e) { S.home = S.home || null; } if (S.home?.quest?.just) { loadMe().catch(() => {}); } return S.home; }
async function loadDuos() { try { S.duos = (await rpc('my_duos')) || []; } catch (e) { S.duos = []; } }
async function loadLecturas() { S.lecturas = (await rpc('my_lecturas')) || []; }
async function loadMap() { S.map = await rpc('voice_map'); }

/* ================= PRIMER MINUTO: ESCUCHAR ANTES DE REGISTRARSE ================= */
P.actions.firstGo = () => { S.sel = { ...FIRST }; P.st.uncorked = false; P.st.flyR = null; go('open'); };
P.actions.firstSkip = () => { S.first = null; P.actions.skipIntro(); };
/* Al crear la cuenta, la respuesta que grabó sale hacia quien lanzó esa botella. */
async function sendFirst() {
  const r = S.rec.ans; if (!r || !S.first) return null;
  try {
    const path = await upload(r.blob, r.ext);
    const [res] = await rpc('welcome_answer', { p_bottle: S.first.bottle, p_voice: path, p_secs: r.secs, p_peaks: r.peaks });
    URLS.set(path, r.url); delete S.rec.ans; S.first = null; return res;
  } catch (e) { console.error(e); S.first = null; return null; }
}

/* ================= ORILLA: TU DÍA ================= */
function streakChip() { const n = S.home?.streak || 0; return `<button class="streak${S.home?.today ? ' on' : ''}" data-go="bitacora" aria-label="${n ? plural(n, 'día seguido', 'días seguidos') : 'Tu constancia'}. Ver tu bitácora">${icon('flame', 's')}${n ? `<b class="num">${n}</b>` : ''}<span>${n ? (n === 1 ? 'día' : 'días') : 'racha'}</span></button>`; } // nunca un cero que culpa
function todayCard() {
  const h = S.home; if (!h) return '';
  const q = h.quest;
  if (q && !q.done) {
    const st = [q.heard, q.answered, q.launched], n = st.filter(Boolean).length;
    const [t, s] = !q.heard ? ['Escucha una botella', 'Toca una de las que flotan en tu orilla.'] : !q.answered ? ['Responde con tu voz', 'Abre una botella y contéstale.'] : ['Lanza tu primera botella', 'Al lanzarla ganas una que llega a 20 personas.'];
    return `<button class="today quest" data-act="questGo"><span class="qs">${st.map((d, i) => `<i class="${d ? 'on' : ''}">${d ? icon('check', 's') : i + 1}</i>`).join('')}</span><span class="tx"><small>Tu primer día · ${n} de 3</small><b>${t}</b><span>${s}</span></span>${icon('arrow', 's')}</button>`;
  }
  const t = h.tide || {}, left = tideIn();
  const [k, a, b] = t.arrived ? ['Llegó la marea', t.count ? `${plural(t.count, 'voz respondió', 'voces respondieron')} la pregunta de hoy` : 'Mira lo que trajo el mar esta noche', t.answered ? 'Escúchalas ahora.' : 'Deja la tuya para escucharlas.']
    : t.answered ? ['La marea de las 21:00', 'Tu voz ya espera la marea', `${left ? `Llega en ${left}` : 'Está por llegar'}${t.count > 1 ? ` con ${t.count - 1} ${t.count === 2 ? 'voz más' : 'voces más'}` : ''}.`]
      : ['Pregunta de hoy', t.question || '', `Deja tu voz antes de las 21:00${left ? ` · faltan ${left}` : ''}.`];
  return `<button class="today${t.arrived ? ' gold' : ''}" data-go="marea"><span class="ti">${icon('tide')}</span><span class="tx"><small>${k}</small><b>${esc(a)}</b><span>${b}</span></span>${icon('arrow', 's')}</button>`;
}
P.actions.questGo = () => { const q = S.home?.quest || {}; if (q.heard && q.answered) return go('launch'); const f = P.root.querySelector('.float'); if (f) { toast(q.heard ? 'Abre una botella y respóndele con tu voz.' : 'Toca una botella para escucharla.'); f.classList.remove('nudge'); void f.offsetWidth; f.classList.add('nudge'); } else toast('Tu orilla está en calma. Lanza tu primera botella.'); };

/* ================= BITÁCORA: CONSTANCIA Y DESBLOQUEOS ================= */
P.screens.bitacora = {
  anim: (ctx, w, h, t) => { const mx = sky(ctx, w, h, t, .2); waves(ctx, w, h, t, .2, mx, null, 3); },
  render: () => { const h = S.home || {}, n = h.streak || 0, m = S.me || {}, got = m.unlocks || [], nx = UNLOCKS.find(u => u.days > n);
    const prev = nx ? (UNLOCKS.filter(u => u.days <= n).pop()?.days || 0) : 0;
    return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Tu bitácora</span></div>
    <div class="scroll pad">
      <div class="streakbig rise">${n ? `<b class="num">${n}</b><span>${n === 1 ? 'día seguido' : 'días seguidos'}</span>` : '<b class="num" style="font-size:44px">Hoy empieza</b><span>tu próxima racha</span>'}</div>
      ${weekHTML(n, h.today)}
      <p class="lead rise d1" style="margin:6px auto 0;text-align:center">${h.today ? 'Hoy ya cuenta. Mañana, una nota de voz y sigues.' : n ? 'Hoy todavía no cuenta. Lanza, responde o deja tu voz en la marea y sumas un día.' : 'Cada día que usas tu voz cuenta: lanza, responde o deja tu voz en la marea.'}</p>
      ${nx ? `<div class="nextup rise d2"><span class="eyebrow a">Próximo regalo</span><b>${nx.name}</b><span class="bar"><i style="width:${Math.max(6, (n - prev) / (nx.days - prev) * 100)}%"></i></span><span class="small muted">${nx.days - n === 1 ? 'Falta 1 día' : `Faltan ${nx.days - n} días`} · al llegar a ${nx.days} días seguidos</span></div>` : ''}
      <div class="sec rise d3"><span class="eyebrow">Se gana con constancia, no se compra</span>
        ${UNLOCKS.map(u => { const ok = got.includes(u.days), on = u.item && m.glass === u.item;
          return `<${ok && u.item ? 'button data-act="wear" data-k="' + u.item + '"' : 'div'} class="urow${ok ? ' ok' : ''}"><span class="ua">${u.kind === 'glass' ? `<span class="bsv">${btSVG('free', u.item)}</span>` : u.kind === 'gift' ? `<span class="gb">${bottleSVG('rgba(255,214,140,.98)', 'rgba(255,200,110,.34)')}<i class="seal"></i></span>` : `<span class="bsv">${btSVG(u.kind)}</span>`}</span><span class="tx"><b>${u.name}</b><span>${u.days} días seguidos</span></span>${ok ? (u.item ? `<span class="${on ? 'tag ok' : 'act'}">${on ? 'Usando' : 'Usar'}</span>` : `<span class="tag ok">${icon('check', 's')} Ganado</span>`) : `<span class="tag">${icon('lock', 's')} ${u.days - n === 1 ? 'Falta 1' : u.days - n > 0 ? 'Faltan ' + (u.days - n) : 'Pronto'}</span>`}</${ok && u.item ? 'button' : 'div'}>`; }).join('')}
        <p class="small muted" style="margin:10px 0 0">Tu mejor racha: ${plural(h.best || 0, 'día', 'días')}. Lo que ganas se queda contigo aunque la racha se corte.</p></div>
      <div class="sec"><span class="eyebrow">Tu voz</span>
        <button class="setrow" data-go="mapa">${icon('map')}<span style="flex:1"><b>El mapa de tu voz</b><span>Mira con qué temas conectó.</span></span>${icon('arrow', 's')}</button>
        ${pushRow()}</div>
      <div style="height:24px"></div></div>`; },
  async after() { if (!P.st.bitFresh) { P.st.bitFresh = true; try { await Promise.all([loadMe(), loadHome()]); if (P.curId === 'bitacora') rerender(); } catch (e) {} } },
  leave() { P.st.bitFresh = false; }
};
/* la semana en curso: cada día con voz se enciende (como las rachas de las apps de hábitos) */
function weekHTML(n, today) {
  const t = limaNow(), dow = (t.getDay() + 6) % 7, end = today ? 0 : 1;
  return `<div class="week rise d1" aria-label="Esta semana">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => { const back = dow - i, on = back >= end && back < end + n, now = back === 0;
    return `<span class="wd${on ? ' on' : ''}${now ? ' now' : ''}"><small>${d}</small><i>${on ? icon('flame', 's') : ''}</i></span>`; }).join('')}</div>`;
}
P.actions.wear = async el => { const k = S.me?.glass === el.dataset.k ? 'glass:none' : 'glass:' + el.dataset.k; try { const me = await rpc('beta_get', { p_item: k }); S.me = Array.isArray(me) ? me[0] : me; rerender(); toast(k === 'glass:none' ? 'Volviste al vidrio de siempre.' : 'Listo: tus botellas viajan en tu vidrio nuevo.'); } catch (e) { err(e); } };

/* ================= EL MAPA DE TU VOZ ================= */
/* Tu voz en el centro y los temas alrededor, como constelación: se enciende cada tema con el que conectó tu voz.
   Nunca se muestran distritos: lo que cuenta es con qué conectas, no de dónde es nadie. */
function mapSVG(places) {
  const by = Object.fromEntries((places || []).map(p => [p.place, p])), mine = S.me?.topics || [], N = TOPICS.length;
  const pos = TOPICS.map((t, i) => { const a = -Math.PI / 2 + i / N * Math.PI * 2; return [t, 50 + Math.cos(a) * 33, 50 + Math.sin(a) * 33, Math.cos(a)]; });
  const rays = pos.filter(([t]) => by[t]).map(([t, x, y]) => `<path class="ray" d="M50 50 Q${(50 + x) / 2 + (y - 50) * .18} ${(50 + y) / 2 - (x - 50) * .18} ${x} ${y}"/>`).join('');
  const dots = pos.map(([t, x, y, c]) => { const p = by[t], n = p ? p.opened : 0, r = n ? Math.min(1.8 + Math.sqrt(n) * .7, 3.8) : 1.1, anchor = c > .3 ? 'start' : c < -.3 ? 'end' : 'middle', lx = x + (c > .3 ? r + 2 : c < -.3 ? -(r + 2) : 0), ly = y + (Math.abs(c) <= .3 ? (y < 50 ? -(r + 2.2) : r + 4.4) : 1.2);
    return `<g class="md${n ? ' on' : ''}${p && p.answered ? ' ans' : ''}${mine.includes(t) ? ' mine' : ''}">${n ? `<circle cx="${x}" cy="${y}" r="${r + 3}" class="halo"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}"/><text x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(t)}${n ? ` · ${n}` : ''}</text></g>`; }).join('');
  return `<svg class="mapsvg" viewBox="0 0 100 100" role="img" aria-label="Los temas con los que conectó tu voz"><circle class="orbit" cx="50" cy="50" r="33"/>${rays}${dots}<circle class="home" cx="50" cy="50" r="3"/><text class="you" x="50" y="58" text-anchor="middle">Tu voz</text></svg>`;
}
P.screens.mapa = {
  render: () => { const m = S.map, ps = m?.places || [];
    return `${sb_()}<div class="top pad">${backBtn()}<span class="title">El mapa de tu voz</span></div><div class="scroll pad">
    <div class="display rise" style="margin-top:4px">${!m ? 'Buscando <b>tu voz</b>…' : ps.length ? `Tu voz conectó con <b>${plural(ps.length, 'tema', 'temas')}</b>.` : 'Tu voz todavía <b>no viaja</b>.'}</div>
    <div class="mapbox rise d1">${mapSVG(ps)}</div>
    ${m ? `<div class="stats rise d2"><div class="stat2"><b>${m.heard}</b><span>${m.heard === 1 ? 'persona la escuchó' : 'personas la escucharon'}</span></div><div class="stat2"><b>${m.answers}</b><span>${m.answers === 1 ? 'te respondió' : 'te respondieron'}</span></div><div class="stat2"><b>${m.bottles}</b><span>${m.bottles === 1 ? 'botella lanzada' : 'botellas lanzadas'}</span></div></div>` : ''}
    <p class="small muted" style="margin:12px 0 0">${ps.length ? 'Cada luz es un tema que compartes con alguien que descorchó una botella tuya. Las doradas te respondieron. Nunca mostramos de dónde es nadie.' : 'Cuando alguien descorche una botella tuya, se enciende el tema que comparten.'}</p>
    ${ps.length ? '' : `<button class="btn btn-a" data-go="launch" style="margin-top:16px">${icon('bottle')} Lanzar una botella</button>`}
    <div style="height:24px"></div></div>`; },
  async after() { if (!P.st.mapFresh) { P.st.mapFresh = true; try { await loadMap(); if (P.curId === 'mapa') rerender(); } catch (e) {} } },
  leave() { P.st.mapFresh = false; }
};
const mapCard = () => `<button class="mapcard rise" data-go="mapa">${icon('map')}<span style="flex:1"><b>El mapa de tu voz</b><span>Mira con qué temas conectó tu voz.</span></span>${icon('arrow', 's')}</button>`;

/* ================= LA MAREA: PREGUNTA DEL DÍA ================= */
async function loadMareaNow() { const d = await rpc('marea_now'); S.mareaNow = d; S.marea = d?.featured || []; }
P.screens.marea = {
  anim(ctx, w, h, t) {
    const horizon = .3, mx = sky(ctx, w, h, t, horizon);
    waves(ctx, w, h, t, horizon, mx, (i, wv) => { if (i !== 1) return; [[.18, 0], [.5, 1.7], [.8, 3.1]].forEach(([x, p]) => { const bx = w * x + Math.sin(t * .4 + p) * 10, by = wv(bx), sl = (wv(bx + 6) - wv(bx - 6)) / 12; bottle(ctx, bx, by - 5, .62, Math.atan(sl) - .3, 1.3, '255,214,140'); }); });
  },
  render: () => { const d = S.mareaNow, t = d?.today || S.home?.tide || {}, L = d?.last, list = S.marea || [], left = tideIn(), vs = L?.voices || [];
    const lastName = t.arrived ? 'La marea de esta noche' : 'La marea de anoche';
    return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Pregunta de hoy<small>La marea · ${t.arrived ? 'las voces llegaron a las 21:00' : left ? `las voces llegan en ${left}` : 'cada noche a las 21:00'}</small></span></div>
    <div style="height:9%;flex:none"></div>
    <div class="scroll pad" style="background:linear-gradient(transparent,var(--bg) 60px)">
      <div class="tq rise" id="tq"><span class="eyebrow a">Hoy todos responden</span><div class="q">${esc(t.question || '')}</div>
        ${t.answered ? `<div class="tdone">${icon('check', 's')}<span>${t.arrived ? 'Tu voz ya viaja con la marea de hoy.' : `Tu voz espera la marea. Llega en ${left || 'un momento'}.`}</span></div>`
          : `${recBox('tide', 'Responde con tu voz. Una frase basta.')}<button class="btn btn-a${S.rec.tide ? '' : ' soft'}" data-needs="tide" data-act="tideSend">${icon('tide')} ${t.arrived ? 'Dejar mi voz en la marea' : 'Dejar mi voz para las 21:00'}</button>`}
        <p class="small muted" style="margin:10px 0 0">${t.count ? `${plural(t.count, 'voz ya respondió', 'voces ya respondieron')} hoy. ` : ''}Grabas tu respuesta ahora y a las 21:00 se abren las voces de todos para escucharlas.</p></div>
      ${L ? `<div class="sec rise d1"><span class="eyebrow">${lastName}</span><p class="small muted" style="margin:-4px 0 10px">${esc(L.question)}</p>
        ${vs.length ? vs.map(v => `<button class="mrow voice${L.unlocked || v.mine ? '' : ' locked'}" data-act="tideOpen" data-id="${v.bottle}"${v.mine ? ' disabled' : ''}><span class="bsv">${btSVG('free', v.glass)}</span><span style="flex:1;min-width:0"><span class="t">Una voz de ${esc(someone(v.place))}</span><span class="eyebrow">${fmt(v.secs)}</span></span>${v.mine ? '<span class="tag">Tuya</span>' : v.taken === 'answered' ? '<span class="tag">Respondida</span>' : L.unlocked ? '<span class="act">Abrir</span>' : `<span class="tag">${icon('lock', 's')}</span>`}</button>`).join('')
          : `<p class="small muted">${t.arrived ? 'Todavía nadie dejó su voz hoy. Que la tuya sea la primera.' : 'Anoche la marea llegó sin voces. Deja la tuya para la de hoy.'}</p>`}
        ${vs.length && !L.unlocked ? `<p class="small" style="margin:10px 0 0;color:#FFD68C">Deja tu voz en la pregunta de hoy y se abren todas.</p>` : ''}</div>` : ''}
      <div class="sec rise d2"><span class="eyebrow">Botellas doradas</span><p class="small muted" style="margin:-4px 0 4px">Alguien quiso que llegaran primero a todo Lima.</p>
      ${list.length ? list.map(b => `<button class="mrow" data-act="mareaOpen" data-id="${b.bottle}"${b.mine ? ' disabled' : ''}><span class="bsv">${btSVG('free', b.glass, true)}</span><span style="flex:1;min-width:0"><span class="eyebrow">${esc(b.kind)} · ${esc(b.place)}${b.sample ? ' · de ejemplo' : ''}</span><span class="t">${esc(b.body || 'Una nota de voz de ' + fmt(b.voice_secs))}</span></span>${b.mine ? '<span class="tag">Tuya</span>' : b.taken === 'answered' ? '<span class="tag">Respondida</span>' : '<span class="act">Abrir</span>'}</button>`).join('')
        : '<p class="small muted">Todavía no hay botellas doradas.</p>'}
      <button class="btn btn-glass" data-act="mareaLaunch" style="margin-top:14px">${icon('tide')} Lanzar una dorada</button></div>
      <div style="height:16px"></div></div>`; },
  async after() { if (!P.st.mareaFresh) { P.st.mareaFresh = true; try { await loadMareaNow(); if (P.curId === 'marea' && !(REC.mr && REC.id === 'tide')) rerender(); } catch (e) {} } },
  leave() { P.st.mareaFresh = false; }
};
P.actions.tideSend = async el => {
  const r = S.rec.tide; if (!r) return needVoice('tide'); if (S.busy) return; S.busy = true; el.classList.add('soft'); el.textContent = 'Enviando…';
  try {
    const path = await upload(r.blob, r.ext); await rpc('tide_answer', { p_voice: path, p_secs: r.secs, p_peaks: r.peaks });
    URLS.set(path, r.url); delete S.rec.tide; hap([10, 30, 20]); await Promise.all([loadMareaNow(), loadHome()]); S.busy = false; rerender();
    toast(S.mareaNow?.today?.arrived ? 'Tu voz salió con la marea de hoy.' : 'Listo. A las 21:00 tu voz sale con la marea.'); loadBottles().catch(() => {}); askPush('tide'); ping();
  } catch (e) { S.busy = false; err(e); if (P.curId === 'marea') rerender(); }
};
P.actions.tideOpen = async el => {
  const L = S.mareaNow?.last, v = L?.voices.find(x => x.bottle === el.dataset.id); if (!v || v.mine) return;
  if (v.taken === 'answered') return toast('Ya respondiste esta voz. Está en tus conversaciones.');
  if (!L.unlocked) { toast('Deja tu voz en la pregunta de hoy para abrir las demás.'); document.getElementById('tq')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  try { const did = await rpc('marea_take', { p_bottle: v.bottle }); await loadShore(); S.sel = S.shore.find(x => x.id === did); if (!S.sel) return toast('Esta voz ya siguió su viaje.'); P.st.uncorked = false; P.st.flyR = null; go('open'); } catch (e) { err(e); }
};

/* ================= BOTELLA PARA DOS ================= */
const duoLink = tk => linkTo('d', tk);
P.actions.duoT = el => { S.duoOn = !S.duoOn; if (S.duoOn) { S.btype = 'free'; S.featured = false; } go('launch', { noPush: true }); };
P.actions.duoStart = async el => {
  const r = S.rec.launch; if (!r) return needVoice('launch'); if (S.busy) return;
  if (!(S.me?.bottles > 0)) return toast('Te quedaste sin botellas normales. Responde una que te llegó y ganas otra.');
  S.busy = true; el.classList.add('soft'); el.textContent = 'Preparando…';
  try {
    const path = await upload(r.blob, r.ext);
    const d = await rpc('duo_start', { p_kind: S.kind, p_body: S.body.trim() || null, p_voice: path, p_secs: r.secs, p_peaks: r.peaks });
    URLS.set(path, r.url); delete S.rec.launch; S.me.bottles = d.left_bottles; S.duoWait = { token: d.token, kind: S.kind, body: S.body.trim() }; S.body = ''; S.idea = -1; S.duoOn = false; S.busy = false; loadDuos();
    P.hist = ['orilla']; go('duowait');
  } catch (e) { S.busy = false; err(e); if (P.curId === 'launch') rerender(); }
};
P.screens.duowait = {
  anim: (ctx, w, h, t) => { const mx = sky(ctx, w, h, t, .46); waves(ctx, w, h, t, .46, mx, (i, wv) => { if (i !== 1) return; const bx = w * .38 + Math.sin(t * .3) * 8, by = wv(bx); bottle(ctx, bx, by - 6, .9, -.3, 1); ctx.globalAlpha = .35 + Math.sin(t * 2) * .12; bottle(ctx, w * .64, wv(w * .64) - 6, .9, Math.PI + .3, .4, '255,214,140'); ctx.globalAlpha = 1; }); },
  render: () => { const d = S.duoWait || {}; return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Botella para dos</span></div><div style="flex:1"></div>
    <div class="pad" style="padding-bottom:22px;background:linear-gradient(transparent,rgba(3,16,28,.94) 30%)">
      <span class="eyebrow a rise">Tu mitad está lista</span><div class="display rise d1" style="margin-top:8px">Falta <b>la otra voz</b>.</div>
      <p class="lead rise d2">Mándale este link a quien quieras. Escucha tu mitad, graba la suya y la botella sale con las dos voces a 12 personas.</p>
      <div class="code rise d3"><span>${esc(duoLink(d.token || '').replace(/^https?:\/\//, ''))}</span><button class="btn btn-tonal btn-sm" data-act="duoCopy">${icon('copy', 's')} Copiar</button></div>
      <div class="foot" style="padding-bottom:0"><button class="btn btn-a" data-act="duoShare">${icon('export')} Mandar el link</button><button class="btn btn-ghost" data-act="toMine">Listo, la veo en mis botellas</button></div>
      <p class="small muted" style="margin:4px 0 0;text-align:center">Tiene 3 días. Si nadie graba, te devolvemos tu botella.</p></div>`; }
};
const duoMsg = d => ({ title: 'Botella para dos', text: `Lancemos una botella juntos en Botella${d.body ? `: "${d.body}"` : ''}. Yo ya grabé mi mitad, falta la tuya.`, url: duoLink(d.token) });
P.actions.duoShare = el => share(el, duoMsg(S.duoWait || {}));
P.actions.duoCopy = el => { try { navigator.clipboard?.writeText(duoLink(S.duoWait.token)).catch(() => {}); } catch (e) {} el.innerHTML = `${icon('check', 's')} Copiado`; toast('Link copiado. Mándaselo a quien quieras.'); };
P.actions.duoAgain = el => { const d = (S.duos || []).find(x => x.token === el.dataset.id); if (d) share(el, duoMsg(d)); };
P.actions.duoCancel = async el => { try { S.me.bottles = await rpc('duo_cancel', { p_token: el.dataset.id }); await loadDuos(); rerender(); toast('Cancelada. Te devolvemos tu botella.'); } catch (e) { err(e); } };
const duosHTML = () => (S.duos || []).map(d => `<div class="row duorow rise"><span style="flex:1;min-width:0"><span class="eyebrow a">Para dos · esperando la otra voz</span><span class="t" style="font-weight:300">${esc(d.body || d.kind + ' de ' + fmt(d.secs))}</span><span class="s">Vence en ${until(d.expires_at)}</span><span class="duoacts"><button class="btn btn-tonal btn-sm" data-act="duoAgain" data-id="${d.token}">${icon('export', 's')} Invitar</button><button class="btn btn-ghost btn-sm" data-act="duoCancel" data-id="${d.token}">Cancelar</button></span></span></div>`).join('');

/* quien recibe el link */
P.screens.duojoin = {
  anim: night(.2, false),
  render: () => { const d = S.duoPeek;
    if (!d) return `${sb_()}<div class="scroll pad" style="display:grid;place-items:center"><p class="muted">Buscando la botella…</p></div>`;
    if (d.status !== 'open') return gone('Esta botella para dos ya no está esperando', d.status === 'done' ? 'Alguien ya grabó la otra mitad y salió al mar.' : 'Venció o la cancelaron. Pide que te manden otra.');
    if (d.mine) return gone('Esta es tu mitad', 'La otra mitad la graba alguien más. Mándale el link a quien quieras.', `<button class="btn btn-a" data-act="duoMine">${icon('export')} Mandar el link</button>`);
    return `${sb_()}<div class="top pad"><span class="wordmark" style="font-size:26px;flex:1">Botella</span></div><div style="height:8%;flex:none"></div>
    <div class="scroll pad" style="background:linear-gradient(transparent,var(--bg) 50px)">
      <span class="eyebrow a rise">Botella para dos</span><div class="display rise d1" style="margin-top:8px"><b>${esc(d.name)}</b> quiere lanzar una botella contigo.</div>
      <div class="paper rise d2" style="margin-top:16px"><span class="eyebrow">${esc(d.kind)} · su mitad${d.place ? ' · ' + esc(d.place) : ''}</span><div class="q">${esc(d.body || 'Escucha su voz.')}</div>${vn(d.voice, d.secs, { peaks: d.peaks })}</div>
      <div class="sec"><span class="eyebrow">Tu mitad</span>${recBox('duo2', 'Graba tu mitad. Con 10 segundos basta.')}</div>
      <p class="small muted">Sale al mar con las dos voces y llega a 12 personas. Si alguien responde, les llega a los dos.</p><div style="height:10px"></div></div>
    ${S.rec.duo2 ? `<div class="foot pad"><button class="btn btn-a" data-needs="duo2" data-act="duoJoin">${icon('send')} ${S.me ? 'Lanzar juntos' : 'Crear mi cuenta y lanzar'}</button></div>` : ''}`; },
  async after() { if (S.duoPeek) return; try { S.duoPeek = (await rpc('duo_peek', { p_token: S.link.d })) || { status: 'cancelled' }; } catch (e) { S.duoPeek = { status: 'cancelled' }; } if (P.curId === 'duojoin') rerender(); }
};
const gone = (t, s, extra = '') => `${sb_()}<div class="top pad"><span class="wordmark" style="font-size:26px;flex:1">Botella</span></div><div style="flex:1"></div><div class="pad" style="padding-bottom:26px"><div class="display">${t}</div><p class="lead">${s}</p><div class="foot" style="padding-bottom:0">${extra}<button class="btn ${extra ? 'btn-ghost' : 'btn-a'}" data-act="leaveLink">${S.me ? 'Ir a mi orilla' : 'Conocer Botella'}</button></div></div>`;
P.actions.leaveLink = () => { S.link = null; S.after = null; P.hist = []; if (S.me) go('orilla', { fade: true }); else go('splash', { fade: true }); };
P.actions.duoMine = () => { S.duoWait = { token: S.link.d, kind: S.duoPeek.kind, body: S.duoPeek.body || '' }; S.link = null; P.hist = ['orilla']; go('duowait'); };
P.actions.duoJoin = async el => {
  const r = S.rec.duo2; if (!r) return needVoice('duo2');
  if (!S.me) { S.after = 'duo'; toast('Guardamos tu mitad. Sale al crear tu cuenta.'); return P.actions.skipIntro(); }
  if (S.busy) return; S.busy = true; el.classList.add('soft'); el.textContent = 'Lanzando…';
  try {
    const path = await upload(r.blob, r.ext); const d = await rpc('duo_join', { p_token: S.link.d, p_voice: path, p_secs: r.secs, p_peaks: r.peaks });
    URLS.set(path, r.url); delete S.rec.duo2; S.busy = false; S.link = null; S.after = null; S.duoPeek = null;
    P.st.thrownAt = performance.now(); P.st.shores = d.shores; P.st.btype = 'free'; P.st.featured = false; P.st.duo = true; P.hist = ['orilla']; go('thrown', { noPush: true });
    refreshAll().catch(() => {}); watchPending(75000); ping();
  } catch (e) { S.busy = false; err(e); if (P.curId === 'duojoin') { S.duoPeek = null; rerender(); } }
};

/* ================= PIDE UNA LECTURA ================= */
const LQ = ['¿Qué es lo primero que pensaste de mí cuando me conociste?', '¿Qué recuerdo conmigo no se te olvida?', '¿Qué es lo que más te gusta de mí?', '¿Qué canción te hace pensar en mí?', 'Si me describieras con tres palabras, ¿cuáles serían?', '¿Qué crees que hago mejor que nadie?', '¿Qué momento conmigo te hizo reír más?', '¿Qué te da curiosidad de mí y nunca me preguntaste?', '¿Qué plan me propondrías para este fin de semana?', '¿En qué crees que he cambiado desde que me conoces?', '¿Qué te gustaría que hiciéramos juntos este año?', '¿Qué consejo me darías con cariño?'];
const lecLink = slug => linkTo('l', slug);
const lecMsg = l => ({ title: 'Te pido una lectura', text: `Te pido una lectura: "${l.question}" Respóndeme con tu voz en Botella. Primero escucho tu voz y después veo quién eres.`, url: lecLink(l.slug) });
P.screens.lecturas = {
  render: () => { const ls = S.lecturas || [];
    return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Pide una lectura</span></div><div class="scroll pad">
    <div class="display rise" style="margin-top:4px">¿Qué piensan <b>de ti</b>?</div>
    <p class="lead rise d1">Elige una pregunta, grábala y comparte el link. Tus amigos responden con su voz desde Botella. Escuchas cada voz primero y después ves quién fue: adivinar antes es parte de la gracia.</p>
    <button class="btn btn-a rise d2" data-act="lecNew" style="margin-top:16px">${icon('quote')} Pedir una lectura</button>
    ${ls.length ? `<div class="sec rise d3"><span class="eyebrow">Tus lecturas</span>${ls.map(l => `<button class="lrow" data-act="lecOpen" data-id="${l.id}"><span style="flex:1;min-width:0"><span class="t">${esc(l.question)}</span><span class="s">${l.open ? `Abierta · cierra en ${until(l.closes_at)}` : 'Cerrada'} · ${plural(l.answers, 'respuesta', 'respuestas')}</span></span>${l.fresh ? `<span class="cnt">${l.fresh}</span>` : icon('arrow', 's')}</button>`).join('')}</div>` : ''}
    <div class="safe rise d3">${icon('shield')}<span><b>Con cuidado.</b> Cada respuesta pasa por un filtro antes de llegarte: los insultos, las amenazas y lo muy explícito no se entregan. Puedes borrar, reportar o bloquear cualquier respuesta.</span></div>
    <div style="height:24px"></div></div>`; },
  async after() { if (!P.st.lecFresh) { P.st.lecFresh = true; try { await loadLecturas(); if (P.curId === 'lecturas') rerender(); } catch (e) {} } },
  leave() { P.st.lecFresh = false; }
};
P.actions.lecNew = async () => {
  const s = await srv();
  if (!s.lectura) return sheet(`${sheetHead('Las lecturas llegan pronto')}<p class="muted" style="margin:0 0 16px">Estamos terminando el filtro que revisa cada respuesta antes de entregártela. Cuando esté listo, este botón te lleva directo.</p><button class="btn btn-a" data-act="closeSheet">Entendido</button>`);
  S.lq = S.lq ?? 0; delete S.rec.lec; go('lecnew');
};
P.screens.lecnew = {
  render: () => `${sb_()}<div class="top pad">${backBtn()}<span class="title">Pedir una lectura</span></div><div class="scroll pad">
    <div class="display" style="margin-top:4px">Elige tu <b>pregunta</b></div>
    <div class="lqs" id="lqs">${LQ.map((q, i) => `<button class="lq${S.lq === i ? ' on' : ''}" data-act="lqPick" data-i="${i}">${q}</button>`).join('')}</div>
    <div class="sec"><span class="eyebrow">Grábala con tu voz</span><p class="small muted" style="margin:-4px 0 0">Es lo primero que van a escuchar tus amigos.</p>${recBox('lec', 'Lee la pregunta en voz alta, a tu manera.')}</div>
    <p class="small muted">Queda abierta 24 horas. Puedes cerrarla antes.</p><div style="height:8px"></div></div>
    <div class="foot pad"><button class="btn btn-a${S.rec.lec ? '' : ' soft'}" data-needs="lec" data-act="lecCreate">${icon('link')} Crear mi link</button></div>`
};
P.actions.lqPick = el => { S.lq = +el.dataset.i; document.querySelectorAll('#lqs .lq').forEach(b => b.classList.toggle('on', b === el)); };
P.actions.lecCreate = async el => {
  const r = S.rec.lec; if (!r) return needVoice('lec'); if (S.busy) return; S.busy = true; el.classList.add('soft'); el.textContent = 'Creando tu link…';
  try {
    const path = await upload(r.blob, r.ext); const d = await rpc('lectura_create', { p_question: LQ[S.lq], p_voice: path, p_secs: r.secs, p_peaks: r.peaks });
    URLS.set(path, r.url); delete S.rec.lec; S.busy = false; await loadLecturas(); P.hist = P.hist.filter(x => x !== 'lecnew'); P.st.lecNewId = d.id; await openLec(d.id, { noPush: true }); loadHome(); askPush('lectura');
  } catch (e) { S.busy = false; err(e); if (P.curId === 'lecnew') rerender(); }
};
async function openLec(id, opts = {}) {
  try { if (!(S.lecturas || []).find(l => l.id === id)) await loadLecturas(); S.lec = S.lecturas.find(l => l.id === id); if (!S.lec) return toast('No encontramos esa lectura.'); S.lecAns = (await rpc('lectura_inbox', { p_id: id })) || []; go('lectura', opts); } catch (e) { err(e); }
}
P.actions.lecOpen = el => openLec(el.dataset.id);
P.screens.lectura = {
  render: () => { const l = S.lec; if (!l) return ''; const as = S.lecAns || [], isNew = P.st.lecNewId === l.id;
    return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Tu lectura<small>${l.open ? `Abierta · cierra en ${until(l.closes_at)}` : 'Cerrada'}</small></span>${l.open ? `<button class="iconbtn glass" data-act="lecMenu" aria-label="Opciones">${icon('more')}</button>` : ''}</div><div class="scroll pad">
    <div class="paper rise" style="margin-top:6px"><span class="eyebrow">Tu pregunta</span><div class="q">${esc(l.question)}</div>${vn(l.voice, l.secs, { mine: true, peaks: l.peaks })}</div>
    ${l.open ? `<div class="sharebox rise d1">${isNew ? '<b>Tu link está listo.</b>' : ''}<span class="small muted">${isNew ? 'Compártelo por WhatsApp o en tus historias. Mientras más gente, más voces.' : 'Compártela otra vez para recibir más voces.'}</span><div class="code"><span>${esc(lecLink(l.slug).replace(/^https?:\/\//, ''))}</span><button class="btn btn-tonal btn-sm" data-act="lecCopy">${icon('copy', 's')} Copiar</button></div><button class="btn btn-a" data-act="lecShare">${icon('export')} Compartir mi lectura</button></div>` : ''}
    <div class="sec rise d2"><span class="eyebrow">${as.length ? plural(as.length, 'voz', 'voces') : 'Respuestas'}</span>
      ${as.length ? as.map((a, i) => `<div class="arow${a.heard ? '' : ' new'}" data-heard="${a.id}">${orb(colorOf(a.id), 38)}<span style="flex:1;min-width:0"><span class="s"><b class="who">${a.heard ? esc(a.name || 'Sin nombre') : 'Escúchala para ver quién es'}</b> · ${ago(a.at)}${a.heard ? '' : ' · nueva'}</span>${vn(a.voice, a.secs, { peaks: a.peaks })}</span><button class="iconbtn" data-act="ansMenu" data-id="${a.id}" aria-label="Opciones de esta respuesta">${icon('more')}</button></div>`).join('')
        : `<p class="small muted">${l.open ? 'Todavía no llega ninguna. Aparecen aquí apenas alguien responda.' : 'Esta lectura cerró sin respuestas.'}</p>`}
      ${l.pending ? `<p class="small muted" style="margin-top:10px">${icon('clock', 's')} ${plural(l.pending, 'respuesta espera', 'respuestas esperan')} la revisión del filtro.</p>` : ''}
      ${l.filtered ? `<p class="small muted" style="margin-top:10px">${icon('shield', 's')} El filtro frenó ${plural(l.filtered, 'respuesta que no cumplía', 'respuestas que no cumplían')} las normas. No te ${l.filtered === 1 ? 'llegó' : 'llegaron'}.</p>` : ''}</div>
    <div style="height:24px"></div></div>`; },
  after(sec) { sec.addEventListener('click', e => { const row = e.target.closest('[data-play]')?.closest('[data-heard]'); if (!row) return; const a = (S.lecAns || []).find(x => x.id === row.dataset.heard); if (a && !a.heard) { a.heard = true; row.classList.remove('new'); const w = row.querySelector('.who'); if (w) w.textContent = a.name || 'Sin nombre'; rpc('lectura_heard', { p_answer: a.id }).then(() => { loadLecturas(); loadHome(); }).catch(() => {}); } }); },
  leave() { P.st.lecNewId = null; }
};
P.actions.lecShare = el => share(el, lecMsg(S.lec));
P.actions.lecCopy = el => { try { navigator.clipboard?.writeText(lecLink(S.lec.slug)).catch(() => {}); } catch (e) {} el.innerHTML = `${icon('check', 's')} Copiado`; toast('Link copiado. Pégalo en WhatsApp o en tus historias.'); };
P.actions.lecMenu = () => sheet(`${sheetHead('Tu lectura')}<button class="setrow" data-act="lecClose">${icon('lock')}<span style="flex:1"><b>Cerrar la pregunta</b><span>Ya nadie podrá responder. Conservas las respuestas.</span></span></button>`);
P.actions.lecClose = async () => { closeSheet(); try { await rpc('lectura_close', { p_id: S.lec.id }); await loadLecturas(); S.lec = S.lecturas.find(l => l.id === S.lec.id); rerender(); toast('Cerraste tu lectura.'); } catch (e) { err(e); } };
P.actions.ansMenu = el => { S.ansId = el.dataset.id; sheet(`${sheetHead('Esta respuesta')}
  <button class="setrow danger" data-act="ansDel">${icon('trash')}<span style="flex:1"><b>Borrar</b><span>Desaparece de tu lectura.</span></span></button>
  <button class="setrow danger" data-act="ansReport">${icon('block')}<span style="flex:1"><b>Reportar y bloquear</b><span>Se borra, la revisamos y esa persona no podrá volver a responderte. No se entera de que la bloqueaste.</span></span></button>`); };
const ansDone = async (fn, msg) => { closeSheet(); try { await fn(); S.lecAns = (await rpc('lectura_inbox', { p_id: S.lec.id })) || []; await loadLecturas(); S.lec = S.lecturas.find(l => l.id === S.lec.id) || S.lec; rerender(); toast(msg); loadHome(); } catch (e) { err(e); } };
P.actions.ansDel = () => ansDone(() => rpc('lectura_answer_delete', { p_answer: S.ansId }), 'Respuesta borrada.');
P.actions.ansReport = () => ansDone(() => rpc('lectura_answer_report', { p_answer: S.ansId, p_reason: 'Respuesta de lectura reportada' }), 'Gracias por avisar. Esa persona ya no puede responderte.');

/* quien abre el link: sin cuenta */
P.screens.lecpub = {
  anim: night(.2, false),
  render: () => { const l = S.lecPeek, ok = S.lecSent;
    if (!l) return `${sb_()}<div class="scroll pad" style="display:grid;place-items:center"><p class="muted">Abriendo la lectura…</p></div>`;
    if (ok) return `${sb_()}<div class="top pad"><span class="wordmark" style="font-size:26px;flex:1">Botella</span></div><div style="flex:1"></div><div class="pad" style="padding-bottom:26px;background:linear-gradient(transparent,rgba(3,16,28,.94) 30%)">
      <span class="eyebrow a rise">${ok.pending ? 'Tu voz está en revisión' : 'Tu voz llegó'}</span><div class="display rise d1" style="margin-top:8px">${ok.pending ? `Tu voz va camino a <b>${esc(l.name)}</b>.` : `Tu voz ya le llegó a <b>${esc(l.name)}</b>.`}</div>
      <p class="lead rise d2">Fue sin tu nombre. ¿Y a ti qué te dirían? Pide tu propia lectura.</p>
      <div class="foot rise d3" style="padding-bottom:0"><button class="btn btn-a" data-act="lecMine">${icon('quote')} Pedir mi propia lectura</button>${S.me ? `<button class="btn btn-ghost" data-act="leaveLink">Ir a mi orilla</button>` : `<button class="btn btn-ghost" data-act="leaveLink">Conocer Botella</button>`}</div></div>`;
    if (l.mine) return gone('Esta lectura es tuya', 'Compártela con tus amigos para recibir sus voces.', `<button class="btn btn-a" data-act="lecToMine">Ver mis respuestas</button>`);
    if (!l.open) return gone('Esta lectura ya cerró', `${l.name ? esc(l.name) + ' ya no recibe respuestas. ' : ''}Puedes pedir la tuya y ver qué te dicen.`, `<button class="btn btn-a" data-act="lecMine">${icon('quote')} Pedir mi propia lectura</button>`);
    return `${sb_()}<div class="top pad"><span class="wordmark" style="font-size:26px;flex:1">Botella</span><span class="tag">${icon('user', 's')} Con tu cuenta</span></div><div style="height:6%;flex:none"></div>
    <div class="scroll pad" style="background:linear-gradient(transparent,var(--bg) 50px)">
      <span class="eyebrow a rise">${esc(l.name)} te pide una lectura</span>
      <div class="paper rise d1" style="margin-top:12px"><div class="q">${esc(l.question)}</div>${vn(l.voice, l.secs, { peaks: l.peaks })}</div>
      <div class="sec" style="margin-top:20px"><span class="eyebrow">Respóndele con tu voz</span><p class="small muted" style="margin:-4px 0 0">Respondes con tu cuenta de Botella. ${esc(l.name)} escucha tu voz primero y después ve tu nombre.${l.answers ? ` Ya ${l.answers === 1 ? 'respondió 1 persona' : 'respondieron ' + l.answers + ' personas'}.` : ''}</p>${recBox('lp', 'Toca para grabar. Una frase basta.')}</div>
      <p class="small muted" style="margin:12px 0 0">${icon('shield', 's')} Di lo que piensas, con respeto. Un filtro revisa cada respuesta: los insultos, las amenazas y lo muy explícito no se entregan. Tu audio lo recibe solo ${esc(l.name)}, que puede borrarlo.</p><div style="height:10px"></div></div>
    ${S.rec.lp ? `<div class="foot pad"><button class="btn btn-a" data-needs="lp" data-act="lpSend">${icon('send')} ${S.me ? 'Enviar mi respuesta' : 'Crear mi cuenta y enviar'}</button></div>` : ''}`; }, // el pie aparece al grabar: así el micrófono queda a la vista
  async after() { if (S.after === 'lp' && S.me && S.rec.lp && !S.busy) return P.actions.lpSend(); if (S.lecPeek) return; try { S.lecPeek = (await rpc('lectura_peek', { p_slug: S.link.l })) || { open: false, name: '' }; } catch (e) { S.lecPeek = { open: false, name: '' }; } if (P.curId === 'lecpub') rerender(); }
};
P.actions.lpAdult = el => { S.lpAdult = !S.lpAdult; el.setAttribute('aria-checked', S.lpAdult); };
P.actions.lpSend = async el => {
  const r = S.rec.lp; if (!r) return needVoice('lp');
  // Las lecturas se responden con cuenta: tu voz te espera mientras la creas y sale sola al terminar.
  if (!S.me) { S.after = 'lp'; if (!S.code) S.code = 'L:' + S.link.l; toast('Guardamos tu respuesta. Sale al crear tu cuenta.'); return P.actions.skipIntro(); }
  if (S.busy) return;
  S.busy = true; if (el) { el.classList.add('soft'); el.textContent = 'Enviando tu voz…'; }
  try {
    const tok = (await sb.auth.getSession()).data?.session?.access_token || '';
    const res = await fetch('/api/lectura', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ slug: S.link.l, device: deviceId(), adult: true, audio: await b64(r.blob), mime: r.blob.type || (r.ext === 'm4a' ? 'audio/mp4' : 'audio/webm'), secs: r.secs, peaks: r.peaks }) });
    const d = await res.json().catch(() => ({})); S.busy = false;
    if (!res.ok) { if (d.code === 'filtered' || d.code === 'empty') { delete S.rec.lp; rerender(); return sheet(`${sheetHead(d.code === 'empty' ? 'No se entendió tu voz' : 'Esta respuesta no se entregó')}<p class="muted" style="margin:0 0 16px">${esc(d.message || '')}</p><button class="btn btn-a" data-act="closeSheet">Grabar otra</button>`); } rerender(); return toast(d.message || 'No se pudo enviar tu respuesta. Intenta otra vez.'); }
    delete S.rec.lp; S.lecSent = d; S.after = null; hap([10, 30, 20]); rerender();
  } catch (e) { S.busy = false; rerender(); toast(navigator.onLine ? 'No se pudo enviar tu respuesta. Intenta otra vez.' : 'Sin conexión. Revisa tu internet e intenta otra vez.'); }
};
P.actions.lecMine = () => { S.link = null; S.lecPeek = null; S.lecSent = null; if (S.me) { P.hist = ['orilla']; go('lecturas'); } else { S.after = 'lectura'; P.actions.skipIntro(); } };
P.actions.lecToMine = () => { S.link = null; S.lecPeek = null; P.hist = ['orilla']; go('lecturas'); };

/* ================= AVISOS: EN LA APP Y POR PUSH ================= */
const NIC = { opened: 'bottle', unlock: 'flame', quest: 'star', tide: 'tide', expiring: 'clock', cooling: 'clock', lectura: 'quote', duo: 'duo' };
const nIcon = k => `<span class="nic">${icon(NIC[k] || 'bell')}</span>`;
function noticeGo(n) { if (n.go === 'chat' && n.ref) return openChat(n.ref); if (n.go === 'lecturas' && n.ref) return openLec(n.ref); if (P.screens[n.go]) return go(n.go, { fade: true }); go('orilla', { fade: true }); }
function onNotice(n) {
  if (!n || n.kind === 'msg' || n.kind === 'call') return;
  const wait = new Date(n.at) - Date.now(); if (wait > 10 * 60000) return;
  setTimeout(async () => {
    LS.set('seenAt', new Date().toISOString());
    if (n.kind === 'opened') loadBottles().catch(() => {}); if (n.kind === 'unlock' || n.kind === 'quest') { await loadMe().catch(() => {}); await loadHome(); } if (n.kind === 'lectura') { loadLecturas().catch(() => {}); loadHome(); } if (n.kind === 'duo') { loadDuos(); loadBottles().catch(() => {}); } if (n.kind === 'tide') loadHome();
    if (['call', 'thrown', 'open', 'answer'].includes(P.curId) && n.kind !== 'unlock') return;
    banner({ ic: nIcon(n.kind), title: n.title, text: n.body || '', go: 'notice', v: JSON.stringify({ go: n.go, ref: n.ref }) });
    if (['orilla', 'mine', 'bitacora', 'lecturas'].includes(P.curId)) setTimeout(rerender, 300);
  }, Math.max(0, wait));
}
const bannerGo0 = P.actions.bannerGo;
P.actions.bannerGo = el => { if (el.dataset.go === 'notice') { try { noticeGo(JSON.parse(el.dataset.v)); } catch (e) {} return; } bannerGo0(el); };
/* Al volver: lo que pasó mientras no estabas. */
async function missed() {
  const since = LS.get('seenAt', null); LS.set('seenAt', new Date().toISOString()); if (!since) return;
  try {
    const { data } = await sb.from('notices').select('id,kind,title,body,go,ref,at').gt('at', since).lte('at', new Date().toISOString()).not('kind', 'in', '(msg,call)').order('at', { ascending: false }).limit(6);
    if (!data || !data.length || P.curId !== 'orilla') return; S.missed = data;
    sheet(`${sheetHead('Mientras no estabas')}${data.map((n, i) => `<button class="setrow" data-act="missedGo" data-i="${i}">${icon(NIC[n.kind] || 'bell')}<span style="flex:1"><b>${esc(n.title)}</b><span>${esc(n.body || '')} · ${ago(n.at)}</span></span></button>`).join('')}`);
  } catch (e) {}
}
P.actions.missedGo = el => { const n = S.missed?.[+el.dataset.i]; closeSheet(); if (n) noticeGo(n); };

/* push */
const pushOK = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const u8 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pushSync() {
  if (!pushOK() || Notification.permission !== 'granted') return false;
  const s = await srv(); if (!s.push || !s.key) return false;
  const reg = await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(s.key) });
  const j = sub.toJSON(); await rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }); LS.set('push', true); return true;
}
async function pushOn() {
  if (isIOS() && !standalone()) return sheet(`${sheetHead('Primero, Botella en tu inicio')}<p class="muted" style="margin:0 0 16px">En iPhone los avisos llegan cuando Botella está en tu pantalla de inicio. En Safari, toca <b>Compartir</b> (el cuadrado con la flecha) y luego <b>Agregar a inicio</b>. Ábrela desde ahí y activa los avisos.</p><button class="btn btn-a" data-act="closeSheet">Entendido</button>`);
  if (!pushOK()) return toast('Este navegador no permite avisos. Prueba con Chrome o Safari actualizados.');
  const s = await srv(); if (!s.push) return toast('Los avisos todavía no están listos. Mientras tanto, lo nuevo te espera al abrir Botella.');
  try { const p = await Notification.requestPermission(); if (p !== 'granted') return toast(isIOS() ? 'Los avisos están bloqueados para Botella. Actívalos en Ajustes, Notificaciones, Botella.' : 'Los avisos están bloqueados para Botella. Toca el candado junto a la dirección y permite Notificaciones.'); await pushSync(); closeSheet(); toast('Listo. Te avisamos cuando te respondan y cuando llegue la marea.'); if (['bitacora', 'perfil'].includes(P.curId)) rerender(); }
  catch (e) { console.error(e); toast('No pudimos activar los avisos. Intenta otra vez.'); }
}
P.actions.pushOn = pushOn;
P.actions.pushOff = async () => { try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) { await rpc('push_unsubscribe', { p_endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); } } catch (e) {} LS.set('push', false); rerender(); toast('Avisos apagados en este celular.'); };
const pushActive = () => pushOK() && Notification.permission === 'granted' && LS.get('push', false);
function pushRow() { const on = pushActive(); return `<button class="setrow" role="switch" aria-checked="${on}" data-act="${on ? 'pushOff' : 'pushOn'}">${icon('bell')}<span style="flex:1"><b>Avisos en tu celular</b><span>Cuando te responden, cuando abren tu botella y cuando llega la marea.</span></span><span class="sw"></span></button>`; }
/* Se ofrece una sola vez, justo después de usar tu voz: ahí es cuando sirve. */
async function askPush(why) {
  if (LS.get('pushAsked', false) || pushActive()) return; const s = await srv(); if (!s.push) return;
  if (!pushOK() && !(isIOS() && !standalone())) return; if ('Notification' in window && Notification.permission === 'denied') return;
  LS.set('pushAsked', true);
  const t = { answer: 'Tu respuesta ya va en camino.', launch: 'Tu botella ya está en el mar.', tide: 'Tu voz ya espera la marea.', lectura: 'Tu lectura ya está abierta.' }[why] || '';
  setTimeout(() => { if (document.getElementById('sheet')) return; sheet(`${sheetHead('¿Te avisamos?')}<p class="muted" style="margin:0 0 16px">${t} Activa los avisos y te enteras cuando alguien te responde, cuando descorchan tu botella y cuando llega la marea de las 21:00.</p><button class="btn btn-a" data-act="pushOn">${icon('bell')} Activar avisos</button><button class="btn btn-ghost" data-act="closeSheet" style="margin-top:6px">Ahora no</button>`); }, why === 'launch' ? 5200 : 2600);
}
/* mientras la app está abierta, el servidor no manda push */
setInterval(() => { if (!document.hidden && S.me && uid()) sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', uid()).then(() => {}, () => {}); }, 45000);
/* tocar una notificación trae a la pantalla correcta */
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { const d = e.data; if (d && d.type === 'go' && S.me) noticeGo(d); });
