// Botella · nueva. Prototipo navegable con datos de ejemplo. Una pantalla = una cosa.
{
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app'), tabs = $('#tabs'), sheetRoot = $('#sheet-root');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Telemetría (plan en docs/ux-discovery): se guarda local; al conectar Supabase se envía a una tabla de eventos.
const track = (ev, props = {}) => { try { const k = 'bn.ev', a = JSON.parse(localStorage.getItem(k) || '[]'); a.push({ ev, t: Date.now(), ...props }); localStorage.setItem(k, JSON.stringify(a.slice(-500))); } catch (e) {} };
(() => { try { const l = +localStorage.getItem('bn.last') || 0, now = Date.now(); track('sesion_iniciada', { dias_desde_ultima: l ? Math.floor((now - l) / 864e5) : null }); localStorage.setItem('bn.last', now); } catch (e) {} })();
const store = { get(k, d) { try { const v = localStorage.getItem('bn.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bn.' + k, JSON.stringify(v)); } catch (e) {} } };

// ---------- datos de ejemplo (voces sintéticas) ----------
const PK = {"answer-3":[8,[0.56,0.69,0.44,1.0,0.81,0.53,0.78,0.53,0.63,0.62,0.17,0.69,0.91,0.75,0.64,0.9,0.91,0.25,0.98,0.74,0.57,0.57,0.93,0.54,0.74,0.59,0.51,0.55]],"majo-reply":[12,[0.58,0.71,0.41,0.62,0.58,0.99,0.6,0.61,0.59,0.65,0.71,0.73,0.58,0.84,0.56,0.4,0.43,0.37,0.37,0.85,0.36,0.79,0.56,0.29,1.0,0.7,0.52,0.13]],"majo-call":[8,[0.54,0.66,0.66,0.91,0.62,0.57,0.37,0.78,0.47,0.66,0.38,0.37,0.25,0.74,0.86,0.84,0.77,0.79,0.47,0.7,0.8,1.0,0.64,0.44,0.51,0.41,0.29,0.12]],"caro-reply":[7,[0.7,0.69,0.54,0.74,0.71,0.59,0.71,0.49,0.69,1.0,0.7,0.44,0.52,0.8,0.57,0.71,0.71,0.53,0.58,0.49,0.86,0.47,0.48,0.69,0.53,0.73,0.53,0.28]],"caro-call":[5,[0.52,0.48,0.17,0.65,1.0,0.56,0.52,0.52,0.52,0.88,0.61,0.56,0.57,0.63,0.72,0.7,0.46,0.62,0.34,0.64,0.77,0.56,0.61,0.93,0.81,0.39,0.74,0.22]],"ivan-call":[8,[0.53,0.56,0.43,0.68,0.55,0.8,0.73,0.63,0.71,0.72,0.57,0.72,0.88,0.56,0.73,0.5,0.83,0.63,0.76,0.85,0.71,1.0,0.84,0.86,0.99,0.63,0.55,0.6]],"belen-reply":[8,[0.67,0.48,0.54,0.65,0.4,0.61,0.49,0.59,0.58,0.66,0.48,0.8,0.74,0.48,0.93,0.8,0.64,0.73,0.62,0.32,0.82,0.91,0.73,0.55,1.0,0.59,0.62,0.45]],"belen-call":[6,[0.53,0.45,0.28,0.9,0.88,0.54,0.56,0.97,0.56,0.12,0.55,1.0,0.52,0.64,0.66,0.71,0.63,0.91,0.58,0.68,0.72,0.59,0.69,0.75,0.79,0.68,0.64,0.41]],"majo-say":[14,[1.0,0.48,0.77,0.57,0.82,0.74,0.67,0.41,0.35,0.91,0.76,0.58,0.92,0.51,0.68,0.28,0.88,0.57,0.71,0.74,0.53,0.33,0.89,0.5,0.38,0.86,1.0,0.48]],"leo-say":[13,[0.67,0.42,0.32,0.41,1.0,0.48,0.49,0.29,0.59,0.6,0.53,0.39,0.4,0.16,0.6,0.49,0.4,0.39,0.44,0.41,0.67,0.55,0.61,0.52,0.4,0.3,0.42,0.18]],"ivan-say":[14,[0.82,0.91,0.74,0.68,0.67,0.86,0.81,1.0,0.89,0.71,0.58,0.86,0.65,0.91,0.62,0.63,0.74,0.73,0.89,0.71,0.73,0.74,0.79,0.69,0.87,0.8,0.69,0.74]],"caro-say":[13,[0.71,0.79,0.58,0.79,0.67,0.66,0.88,0.59,0.59,0.9,0.84,0.64,0.86,0.74,0.69,1.0,0.63,0.8,1.0,0.69,0.87,0.91,0.74,0.74,0.81,0.89,0.59,0.7]],"belen-say":[17,[0.62,0.6,0.83,0.63,0.52,0.56,0.56,0.58,0.7,0.64,0.59,0.57,0.71,0.7,0.48,0.74,0.55,0.67,0.58,0.52,0.71,0.62,0.66,0.82,0.73,0.62,0.61,1.0]],"leo-reply":[9,[0.77,1.0,0.44,0.52,0.52,0.6,0.32,0.28,0.79,0.72,0.29,0.15,0.91,0.62,0.48,0.87,0.74,0.51,0.67,0.64,0.56,0.44,0.38,0.4,0.48,0.37,0.32,0.12]],"leo-call":[8,[0.45,0.85,0.32,0.69,0.85,1.0,0.48,0.3,0.87,0.5,0.92,0.72,0.76,0.56,0.57,0.25,0.12,0.82,0.83,0.66,0.14,0.12,0.9,0.92,0.68,0.75,0.52,0.15]],"answer-1":[12,[1.0,0.54,0.49,0.54,0.47,0.57,0.61,0.55,0.63,0.5,0.6,0.53,0.63,0.64,0.58,0.46,0.51,0.45,0.49,0.58,0.46,0.74,0.57,0.59,0.42,0.61,0.62,0.46]],"answer-2":[9,[0.87,0.79,0.55,0.46,0.5,0.16,0.81,0.75,0.65,0.79,0.47,0.43,0.29,0.77,0.96,0.64,0.7,0.5,0.38,0.12,0.52,1.0,0.5,0.47,0.79,0.87,0.35,0.17]],"ivan-reply":[10,[0.97,0.85,1.0,0.8,0.8,0.63,0.72,0.69,0.65,0.57,0.92,0.63,0.84,0.83,0.41,0.89,0.79,0.65,0.71,0.8,0.84,0.75,0.76,0.76,0.65,0.64,0.69,0.71]]};
const B = {
  majo: { theme: 'la música', tag: 'Música', name: 'Majo', kind: 'Pregunta', q: '¿Qué harías un domingo si nadie en esta ciudad te conociera?', v: 'majo-say', c: '#FF70A9' },
  caro: { theme: 'la ciudad', tag: 'La ciudad', name: 'Caro', kind: 'Pregunta', q: '¿Cuál es el mejor atardecer que has visto en Lima?', v: 'caro-say', c: '#FFB061' },
  ivan: { theme: 'la música', tag: 'Música', name: 'Iván', kind: 'Pregunta', q: '¿Qué canción te devuelve a tus 15 años?', v: 'ivan-say', c: '#FFC24B' },
  leo: { theme: 'el cine', tag: 'Cine', kind: 'Confesión', q: 'Me mudé a Lima hace tres meses y todavía no tengo con quién ir al cine.', v: 'leo-say', c: '#8E8CFF', name: 'Leo' },
  belen: { theme: 'los libros', tag: 'Libros', kind: 'Historia', q: 'El día que me perdí en el Centro y terminó siendo lo mejor.', v: 'belen-say', c: '#9FE3B0', name: 'Belén' }
};
const TEMAS = ['Música', 'Cine', 'Libros', 'Comida', 'Viajes', 'La ciudad', 'Fútbol', 'Arte', 'Tecnología', 'Filosofía', 'Amor', 'Trabajo'];
const TC = { 'Música': '#FF70A9', 'Cine': '#8E8CFF', 'Libros': '#9FE3B0', 'Comida': '#FF9F7A', 'Viajes': '#7CC8FF', 'La ciudad': '#FFB061', 'Fútbol': '#9BE38B', 'Arte': '#F59BD5', 'Tecnología': '#7FD8C9', 'Filosofía': '#C7B8FF', 'Amor': '#FF8E9E', 'Trabajo': '#E6D38A' };
const tc = t => (typeof TC !== 'undefined' && TC[t]) || '#7FD8C9';
const AMA = { 'Música': 'la música', 'Cine': 'el cine', 'Libros': 'los libros', 'Comida': 'la comida', 'Viajes': 'viajar', 'La ciudad': 'la ciudad', 'Fútbol': 'el fútbol', 'Arte': 'el arte', 'Tecnología': 'la tecnología', 'Filosofía': 'la filosofía', 'Amor': 'el amor', 'Trabajo': 'su trabajo' };
const IDEAS = {
  Pregunta: ['¿Qué canción te devuelve a tus 15 años?', '¿Cuál es tu huarique favorito?', '¿Qué harías si mañana no tuvieras que trabajar?', '¿Qué película verías mil veces?', '¿Cuál fue el mejor consejo que te dieron?', '¿A qué lugar de Lima llevarías a alguien que no la conoce?', '¿Qué te hace reír aunque no quieras?', '¿Qué plato te recuerda a tu casa?', '¿Cuál es tu plan perfecto para un domingo?', '¿Qué aprendiste tarde y te hubiera gustado saber antes?', '¿Qué libro le recomendarías a un desconocido?', '¿A quién le darías las gracias hoy?', '¿Qué te da miedo y lo haces igual?', '¿Cuál es la mejor conversación que tuviste con un extraño?', '¿Qué serie te hizo desvelarte?', '¿Qué sonido te da paz?', '¿Qué harías con un día libre en la playa?', '¿Qué cosa pequeña te alegra el día?', '¿Qué viaje sigues soñando?', '¿Qué canción pondrías para empezar una fiesta?', '¿Cuál es tu mayor manía?', '¿Qué le preguntarías a tu yo de 80 años?', '¿Qué es lo más valiente que has hecho?', '¿Dónde se come el mejor ceviche, según tú?'],
  Confesión: ['Algo que nunca le he dicho a nadie…', 'Lo que más extraño de cuando era niño', 'Una costumbre rara que tengo', 'Lo que me cuesta pedir', 'Una vez fingí que me gustaba algo y…', 'Lo que hago cuando nadie me ve', 'La última vez que lloré con una película', 'Algo de lo que me arrepiento poco', 'Mi placer culposo musical', 'Lo que más me da vergüenza de mi celular', 'Algo que todavía no sé hacer', 'Un sueño que no le cuento a nadie', 'Lo que me pongo nervioso de decir en voz alta', 'Una mentira piadosa que sigo sosteniendo', 'La persona a la que todavía le debo una disculpa', 'Lo que me hace sentir solo en esta ciudad', 'Algo que me gustaría que alguien me pregunte', 'Lo más raro que he buscado en internet', 'Un miedo que parece tonto pero es real', 'Lo que haría si nadie me juzgara'],
  Historia: ['Lo más raro que me pasó en una combi', 'El mejor día de este año', 'Cómo conocí a mi mejor amigo', 'La vez que me perdí y terminó bien', 'Mi primer trabajo', 'Un viaje que salió todo mal', 'La noche en que no dormí y valió la pena', 'Un desconocido que me ayudó', 'La comida más rara que probé', 'La vez que dije que sí sin pensarlo', 'Mi peor cita', 'Un concierto que no olvido', 'El día que me mudé', 'La vez que me reí en el peor momento', 'Una tradición de mi familia', 'Lo que aprendí de mi abuela', 'Un verano que recuerdo', 'La vez que llegué tarde a algo importante', 'Algo que encontré en la calle', 'El mejor regalo que me dieron']
};
// Muestra 4 ideas a la vez y rota sin repetir hasta agotar; así nunca se ven las mismas.
const deck = {}; const nextIdeas = (k, pool, n = 4) => { const d = deck[k] = deck[k] && deck[k].length >= n ? deck[k] : [...(deck[k] || []), ...pool.slice().sort(() => Math.random() - .5).filter(x => !(deck[k] || []).includes(x))]; return d.splice(0, n); };
const S = {
  shore: store.get('shore', ['caro', 'ivan', 'leo', 'belen']),
  name: store.get('name', ''),
  convs: store.get('convs', null) || {
    leo: { stage: 0, unread: true, when: '9:41', msgs: [{ f: 'them', v: 'leo-say' }, { f: 'me', v: 'answer-1' }, { f: 'them', v: 'leo-reply' }] },
    belen: { stage: 0, when: 'Ayer', msgs: [{ f: 'them', v: 'belen-say' }, { f: 'me', v: 'answer-1' }] }
  },
  temas: store.get('temas', ['Música', 'Cine', 'La ciudad']),
  left: store.get('left', 4),
  mine: store.get('mine', null)
};
const reachOf = x => x ? (x.reached || 24 + (x.heard || 0) * 3 + (x.far ? 40 : 0)) : 0;
const save = () => { store.set('shore', S.shore); store.set('convs', S.convs); store.set('name', S.name); store.set('temas', S.temas); store.set('left', S.left); store.set('mine', S.mine); };

// ---------- iconos ----------
const I = {
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/></svg>',
  plan: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/></svg>',
  bottle: '<svg viewBox="0 0 24 24"><path d="M10 2.5h4M10.5 2.5v4.2L8 10v9.5A2 2 0 0 0 10 21.5h4a2 2 0 0 0 2-2V10l-2.5-3.3V2.5"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17.5 14.5a5 5 0 0 1 3.5 5"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.5 9 8 12 8ZM12 8s1.5-4.5 4-3.5S15 8 12 8Z"/></svg>',
  rules: '<svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v6c0 4.5-3.3 7.7-7.5 9-4.2-1.3-7.5-4.5-7.5-9V6Z"/><path d="M9 12l2 2 4-4"/></svg>',
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9Z"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 8l-4 4 4 4M5 12h10"/></svg>',
  dock: '<svg viewBox="0 0 24 24"><path d="M3 18h18M5 18V9l7-5 7 5v9M9 18v-5h6v5"/></svg>',
  knob: '<svg viewBox="0 0 48 48"><path d="M10 18h18c3 0 5 3 8 3h4v6h-4c-3 0-5 3-8 3H10a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><rect x="11" y="21.5" width="13" height="5" rx="2.5" fill="currentColor" opacity=".5"/></svg>'
};
I.reel = '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 7.5h6"/></svg>';
I.sea = '<svg viewBox="0 0 24 24"><path d="M5 8.5v-2l1-1.5v-1h2v1l1 1.5v2M15 13.5v-2l1-1.5v-1h2v1l1 1.5v2M6 8.5h2v3H6zM16 13.5h2v3h-2z"/><path d="M3 19c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/></svg>';
I.shuffle = '<svg viewBox="0 0 24 24"><path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 3.8c1.1 1.6 2.3 2.6 4.3 2.6H21M17.5 13.5 21 17l-3.5 3.5M3 17h3.5c1.3 0 2.2-.4 3-1.2M13.2 8.2c.8-.8 1.8-1.2 3.3-1.2H21M17.5 3.5 21 7l-3.5 3.5"/></svg>';
let bn = 0;
const bottleSVG = c => { const id = 'g' + (bn++); return `<svg class="bt" viewBox="0 0 120 50" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".55" stop-color="${c}" stop-opacity=".14"/><stop offset="1" stop-color="${c}" stop-opacity=".38"/></linearGradient></defs><path d="M14 6h52c8 0 12 6 18 10h20v18H84c-6 4-10 10-18 10H14C8 44 4 40 4 34V16C4 10 8 6 14 6Z" fill="url(#${id})" stroke="${c}" stroke-opacity=".85" stroke-width="1.6"/><rect x="14" y="17.5" width="46" height="15" rx="7.5" fill="#F3E6C8"/><rect x="104" y="18" width="10" height="14" rx="2" fill="#8A5A33"/><path d="M15 11.5h44" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/></svg>`; };
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fakePeaks = n => Array.from({ length: 28 }, (_, i) => +(0.3 + Math.abs(Math.sin(i * 1.7 + n)) * .7).toFixed(2));

// ---------- audio: un solo reproductor para toda la app ----------
const audio = new Audio(); let curP = null, fakeT = null;
function player(v, { mine = false, secs, peaks, real = false } = {}) {
  const [s, pk] = PK[v] || [secs || 8, peaks || fakePeaks(v.length)];
  return `<button class="player${mine ? ' mine' : ''}"${real ? ' data-r="1"' : ''} data-v="${esc(v)}" data-s="${s}" aria-label="Escuchar nota de ${fmt(s)}"><span class="pb">${I.play}</span><span class="wave">${pk.map(p => `<i style="height:${Math.round(p * 100)}%"></i>`).join('')}</span><span class="t">${fmt(s)}</span></button>`;
}
function stopAudio() { audio.pause(); clearInterval(fakeT); fakeT = null; if (curP) { curP.querySelector('.pb').innerHTML = I.play; $$('.wave i', curP).forEach(i => i.classList.remove('on')); curP.querySelector('.t').textContent = fmt(+curP.dataset.s); } curP = null; }
function paint(p, f) { const bars = $$('.wave i', p); const n = Math.round(f * bars.length); bars.forEach((b, i) => b.classList.toggle('on', i < n)); }
document.addEventListener('click', e => {
  const p = e.target.closest('.player'); if (!p) return;
  if (curP === p) { stopAudio(); return; }
  stopAudio(); curP = p; p.querySelector('.pb').innerHTML = I.pause; const s = +p.dataset.s; const v = p.dataset.v;
  const src = v.startsWith('blob:') ? v : (PK[v] && (!v.startsWith('answer') || p.dataset.r) ? `v/${v}.mp3` : null);
  const fake = () => { if (curP !== p || fakeT) return; let t = 0; fakeT = setInterval(() => { t += .1; paint(p, t / s); p.querySelector('.t').textContent = fmt(t); if (t >= s) stopAudio(); }, 100); };
  if (src && !window.__noAudio) { audio.src = src; audio.play().catch(e => { if (e && e.name !== 'AbortError') fake(); }); audio.onerror = fake; audio.ontimeupdate = () => { if (curP !== p) return; paint(p, audio.currentTime / (audio.duration || s)); p.querySelector('.t').textContent = fmt(audio.currentTime); }; audio.onended = () => curP === p && stopAudio(); }
  else fake();
});

// ---------- grabar: micrófono real si se puede; si no, una simulación ----------
function recorder(onTick) {
  let mr, chunks = [], stream, an, raf, t0, sim, url = null;
  return {
    async start() {
      t0 = performance.now();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mr = new MediaRecorder(stream); mr.ondataavailable = e => chunks.push(e.data); mr.start();
        const ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 64; src.connect(an); const d = new Uint8Array(an.frequencyBinCount);
        const loop = () => { an.getByteFrequencyData(d); onTick((performance.now() - t0) / 1000, [...d].slice(2, 30).map(x => x / 255)); raf = requestAnimationFrame(loop); }; loop();
      } catch (e) { sim = true; const loop = () => { const t = (performance.now() - t0) / 1000; onTick(t, Array.from({ length: 28 }, (_, i) => .2 + Math.abs(Math.sin(t * 6 + i * .8)) * (.4 + .4 * Math.sin(t * 2.3 + i)))); raf = requestAnimationFrame(loop); }; loop(); }
    },
    stop() { cancelAnimationFrame(raf); const secs = (performance.now() - t0) / 1000; return new Promise(res => { if (sim || !mr) return res({ secs, url: null }); mr.onstop = () => { url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })); stream.getTracks().forEach(t => t.stop()); res({ secs, url }); }; mr.stop(); }); }
  };
}

// ---------- deslizar para lanzar ----------
function slider(el, label, done) {
  el.innerHTML = `<div class="fill"></div><div class="lbl"><em>${esc(label)}</em></div><div class="knob" role="button" tabindex="0" aria-label="${esc(label)}">${I.knob}</div>`;
  const k = $('.knob', el), fill = $('.fill', el); let x0 = 0, x = 0, drag = false, max = 0;
  const set = v => { x = v; k.style.transform = `translateX(${v}px)`; fill.style.width = (v + 60) + 'px'; $('.lbl', el).style.opacity = 1 - v / max * 1.4; };
  const end = () => { if (!drag) return; drag = false; if (x > max * .82) { set(max); el.classList.add('done'); navigator.vibrate && navigator.vibrate(18); setTimeout(done, 180); } else { k.style.transition = fill.style.transition = 'transform .45s cubic-bezier(.34,1.56,.64,1),width .45s cubic-bezier(.34,1.56,.64,1)'; set(0); setTimeout(() => k.style.transition = fill.style.transition = '', 460); } };
  k.addEventListener('pointerdown', e => { drag = true; max = el.clientWidth - 64; x0 = e.clientX - x; k.setPointerCapture(e.pointerId); });
  k.addEventListener('pointermove', e => { if (!drag) return; let v = e.clientX - x0; if (v < 0) v = v / 4; if (v > max) v = max + (v - max) / 4; set(Math.max(-12, v)); });
  k.addEventListener('pointerup', end); k.addEventListener('pointercancel', end);
  k.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); max = el.clientWidth - 64; set(max); el.classList.add('done'); setTimeout(done, 180); } });
}

// ---------- hojas y avisos ----------
function sheet(html, bind) {
  sheetRoot.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  let close = () => { const s = $('.sheet', sheetRoot), c = $('.scrim', sheetRoot); if (!s) return; s.classList.add('out'); c.classList.add('out'); setTimeout(() => sheetRoot.innerHTML = '', 200); };
  const prev = document.activeElement, sh = $('.sheet', sheetRoot); sh.tabIndex = -1;
  const key = e => { if (e.key === 'Escape') { close(); } else if (e.key === 'Tab') { const f = $$('button,input,select,a[href]', sh); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } };
  document.addEventListener('keydown', key); const shut = close; close = () => { document.removeEventListener('keydown', key); shut(); if (prev && prev.focus) prev.focus(); };
  setTimeout(() => ($('button,input', sh) || sh).focus(), 30);
  $('.scrim', sheetRoot).onclick = close; $$('[data-close]', sheetRoot).forEach(b => b.onclick = close);
  bind && bind($('.sheet', sheetRoot), close);
}
let tt; function toast(t, c = '#7FD8C9', undo) { $$('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = `<i class="orb" style="background:${c}"></i>${esc(t)}${undo ? '<button class="undo">Deshacer</button>' : ''}`; document.body.append(d); const bye = () => { d.classList.add('out'); setTimeout(() => d.remove(), 220); }; if (undo) $('.undo', d).onclick = () => { clearTimeout(tt); bye(); undo(); }; clearTimeout(tt); tt = setTimeout(bye, undo ? 5000 : 2600); }

// ---------- navegación ----------
const R = {}; let cur = null, curName = '';
const TABBED = { mar: 'mar', charlas: 'charlas' };
function go(name, p = {}) {
  if (!R[name]) name = 'mar';
  stopAudio(); const old = cur;
  const el = document.createElement('section'); el.className = 'scr enter'; el.dataset.s = name;
  const r = R[name](p); el.innerHTML = r.html; if (r.cls) el.className += ' ' + r.cls;
  app.append(el); cur = el; curName = name;
  if (old) { old.classList.add('leave'); setTimeout(() => old.remove(), 190); }
  tabs.hidden = !TABBED[name]; $$('.tab', tabs).forEach(t => t.dataset.go === TABBED[name] ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'));
  $('#unread').hidden = !Object.values(S.convs).some(c => c.unread);
  window.Mar && Mar.set(r.mar || 'off');
  $$('[data-go]', el).forEach(b => b.addEventListener('click', () => go(b.dataset.go, b.dataset.p ? JSON.parse(b.dataset.p) : {})));
  r.bind && r.bind(el);
  if (location.hash.slice(1) !== name && !p.nohash) history.replaceState(null, '', '#' + name);
}
$$('.tab', tabs).forEach(t => t.onclick = () => go(t.dataset.go));


// ---------- tu voz: su forma (avatar) y los días seguidos grabando ----------
const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const DAYS = store.get('days', null) || [4, 3, 2, 1].map(i => dayKey(new Date(Date.now() - i * 864e5)));
const recToday = () => DAYS.includes(dayKey());
const streak = () => { let n = 0, d = new Date(); if (!recToday()) d = new Date(d - 864e5); while (DAYS.includes(dayKey(d))) { n++; d = new Date(d - 864e5); } return n; };
const markDay = () => { const k = dayKey(); if (!DAYS.includes(k)) { DAYS.push(k); store.set('days', DAYS.slice(-60)); track('racha_dia', { dias: streak() }); } };
const myPk = () => store.get('mypk', null) || Array.from({ length: 28 }, (_, i) => +(0.35 + Math.abs(Math.sin(i * 1.3 + (S.name || 'tu').length)) * .65).toFixed(2));
const myColors = () => { const c = S.temas.map(tc); return [c[0] || '#7FD8C9', c[1] || c[0] || '#7FD8C9', c[2] || c[0] || '#7FD8C9']; };
const marks = (pk, n) => Array.from({ length: n }, (_, i) => { const v = pk[Math.floor(i * pk.length / n)] || .5, env = Math.sin(Math.PI * (i + .5) / n); return Math.max(.12, v * env); });
const voiceMark = (cls = '', pk = myPk(), cs = myColors()) => { const n = 9, w = 26 / n;
  return `<span class="vmark ${cls}" style="--c1:${cs[0]};--c2:${cs[1]};--c3:${cs[2]}" aria-hidden="true"><svg viewBox="0 0 40 40">${marks(pk, n).map((v, i) => { const h = 4 + v * 22; return `<rect x="${(7 + i * w + w * .2).toFixed(2)}" y="${(20 - h / 2).toFixed(2)}" width="${(w * .6).toFixed(2)}" height="${h.toFixed(2)}" rx="${(w * .3).toFixed(2)}"/>`; }).join('')}</svg></span>`; };
const waveLine = (pk, n = 48) => `<svg class="wline" viewBox="0 0 ${n * 4} 40" preserveAspectRatio="none" aria-hidden="true">${Array.from({ length: n }, (_, i) => { const v = pk[i % pk.length] * (.55 + .45 * Math.sin(i * .37) ** 2), h = 3 + v * 34; return `<rect x="${i * 4 + .8}" y="${(20 - h / 2).toFixed(1)}" width="2.4" height="${h.toFixed(1)}" rx="1.2"/>`; }).join('')}</svg>`;

// ================= PANTALLAS =================

// Formularios: errores claros, en español y junto al campo (sin las burbujas del navegador).
function check(form) {
  form.noValidate = true; let ok = true; $$('.ferr', form).forEach(x => x.remove()); $$('[aria-invalid]', form).forEach(x => x.removeAttribute('aria-invalid'));
  $$('input', form).forEach(i => { let m = '';
    if (i.type === 'checkbox') { if (i.required && !i.checked) m = 'Botella es solo para mayores de 18.'; }
    else if (i.required && !i.value.trim()) m = i.type === 'email' ? 'Escribe tu correo.' : i.type === 'password' ? 'Escribe tu contraseña.' : 'Escribe tu nombre.';
    else if (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)) m = 'Revisa tu correo: falta algo, como la @ o el punto.';
    else if (i.minLength > 0 && i.value.length < i.minLength) m = `Usa al menos ${i.minLength} caracteres.`;
    if (m) { ok = false; i.setAttribute('aria-invalid', 'true'); const e = document.createElement('p'); e.className = 'ferr'; e.textContent = m; (i.closest('label') || i).after(e); }
  });
  const first = $('[aria-invalid]', form); first && first.focus(); return ok;
}
// Bienvenida: una frase, un botón. (La imagen se rehace en estilo cinematográfico cuando llegue la referencia.)
R.bienvenida = () => ({ cls: 'clear', mar: 'hero', html: `
  <div class="top"><span class="wm">botella</span></div>
  <div class="grow"></div>
  <h1 class="display">Te escuchan<br><span class="light">antes de verte.</span></h1>
  <p class="sub mt2 mb3">Graba una pregunta con tu voz y alguien que ama lo mismo que tú te responde.</p>
  <div class="row-btns"><button class="btn btn-a" data-go="abrir" data-p='{"id":"majo","first":true}'>Abrir mi primera botella</button>
  <button class="btn btn-q" data-go="entrar">Ya tengo cuenta</button></div>` });

// Los pasos de entrada: los dos primeros ya están hechos cuando llegas a la cuenta (se siente avanzado, porque lo está).
const ONB = ['Escuchar', 'Responder', 'Tu cuenta', 'Tus temas'];
const onbBar = now => `<div class="onbp" aria-label="Paso ${now + 1} de ${ONB.length}">${ONB.map((t, i) => `<span class="${i < now ? 'done' : i === now ? 'now' : ''}"><i></i>${i < now ? I.check : ''}${t}</span>`).join('')}</div>`;

// Abrir: mantener para descorchar → papel crema con la voz.
R.abrir = ({ id = 'majo', first = false }) => { const b = B[id]; return { cls: 'clear', mar: 'open', html: `
  <div class="top"><button class="ib edge" data-go="${first ? 'bienvenida' : 'mar'}" aria-label="Cerrar">${I.x}</button><span class="cap">${esc(b.kind)}</span><span style="width:44px"></span></div>
  <div class="grow center" id="fallback"></div>
  <div id="stage">
    <p class="center" style="margin:0"><span class="rtag" style="--c:${b.c}"><i></i>${esc(b.tag)} · ${esc(b.kind)}</span></p>
    <p class="head center mt2">Alguien que ama ${esc(b.theme)} te dejó ${b.kind === 'Pregunta' ? 'una pregunta' : b.kind === 'Confesión' ? 'una confesión' : 'una historia'}.</p>
    <div class="mt3"><button class="hold" id="hold" aria-label="Mantén para abrir"><svg class="r" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/></svg><svg class="ico" viewBox="0 0 24 24"><path d="M9 3h6v4H9zM10 7v3l-3 3v7.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5V13l-3-3V7"/></svg></button></div>
    <p class="cap center mt2">Mantén para abrir</p>
  </div>`,
  bind(el) {
    if (!window.Mar || !Mar.ok) { el.classList.add('flat'); el.style.setProperty('--c', b.c); $('#fallback', el).innerHTML = `<div class="obot"><span class="rip"></span>${voiceBottle(b.c, PK[b.v] && PK[b.v][1])}</div>`; }
    const h = $('#hold', el), ring = $('circle', h); let t0 = 0, raf, done = false;
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 900); ring.style.strokeDashoffset = 295 * (1 - p); window.Mar && Mar.uncork(p * .7); el.style.setProperty('--u', p.toFixed(3)); if (p >= 1) return open(); raf = requestAnimationFrame(tick); };
    const down = e => { if (done) return; e.preventDefault(); t0 = performance.now(); tick(); };
    const up = () => { if (done) return; cancelAnimationFrame(raf); ring.style.transition = 'stroke-dashoffset .3s'; ring.style.strokeDashoffset = 295; setTimeout(() => ring.style.transition = '', 300); window.Mar && Mar.uncork(0); };
    h.addEventListener('pointerdown', down); h.addEventListener('pointerup', up); h.addEventListener('pointerleave', up);
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    function open() {
      done = true; track('botella_escuchada', { id, first }); navigator.vibrate && navigator.vibrate(12); el.classList.add('opened'); if (el.classList.contains('flat')) popSound();
      let c = .7; const pop = () => { c = Math.min(1, c + .03); window.Mar && Mar.uncork(c); if (c < 1) requestAnimationFrame(pop); }; pop();
      $('#stage', el).innerHTML = `<article class="paper in" style="--c:${b.c}"><p class="who"><i class="orb" style="background:${b.c}"></i>Alguien que ama ${esc(b.theme)} · ${esc(b.kind)}</p><p class="q">${esc(b.q)}</p>${player(b.v)}</article>
        <div class="row-btns mt2"><button class="btn btn-a" id="reply">${I.mic}Responder con mi voz</button><button class="btn btn-q" id="pass">Devolverla al mar</button></div>`;
      $('#reply', el).onclick = () => go('grabar', { id, first });
      $('#pass', el).onclick = () => { const before = [...S.shore]; S.shore = S.shore.filter(x => x !== id); save(); first ? go('cuenta') : (go('mar'), toast('Volvió al mar. Le llegará a otra persona.', '#7FD8C9', () => { S.shore = before; save(); go('mar'); })); };
      if (first) setTimeout(() => $('.player', el) && $('.player', el).click(), 500);
    }
  } }; };

// Grabar una respuesta.
R.grabar = ({ id = 'majo', first = false }) => { const b = B[id]; return { html: `
  <div class="top"><button class="ib edge" id="x" aria-label="Cerrar">${I.x}</button><span class="cap">Tu respuesta</span><span style="width:44px"></span></div>
  <div class="ficha"><p class="q" style="margin:0">${esc(b.q)}</p></div>
  <div class="grow"></div>
  <div class="rec-wrap" id="rw"></div>
  <div class="grow"></div>
  <div id="after"></div>`,
  bind(el) {
    $('#x', el).onclick = () => go(first ? 'abrir' : 'mar', { id, first });
    recUI(el, 'Desliza para enviar', r => { track('respuesta_enviada', { id, first, segundos: r.secs });
      if (first) { store.set('pending', { id, secs: r.secs }); go('cuenta'); }
      else { S.shore = S.shore.filter(x => x !== id); S.convs[id] = { stage: 0, when: 'Ahora', msgs: [{ f: 'them', v: b.v }, { f: 'me', v: r.url || 'mine', s: r.secs }] }; save(); go('mar'); toast('Enviada. Te avisamos cuando responda.'); }
    });
  } }; };

// Bloque de grabación compartido: micrófono → onda en vivo → escuchar → deslizar.
function recUI(el, slideLabel, onSend, hintTop = '') {
  const rw = $('#rw', el), after = $('#after', el); let rec = null;
  const idle = () => { rw.innerHTML = `${hintTop}<button class="mic" id="mic" aria-label="Grabar">${I.mic}</button><p class="cap">Toca para grabar · hasta 60 s</p>`; after.innerHTML = ''; $('#mic', el).onclick = start; };
  const start = async () => {
    rw.innerHTML = `<div class="timer" id="rtm">0:00</div><div class="livewave" id="lw">${'<i></i>'.repeat(28)}</div><button class="mic live" id="mic" aria-label="Terminar"><span class="sq"></span></button><p class="cap">Toca para terminar</p>`;
    const bars = $$('#lw i', el);
    const mic = $('#mic', el); const acc = new Array(28).fill(0); let cnt = 0; rec = recorder((t, lv) => { lv.forEach((v, i) => { if (i < 28) acc[i] += v; }); cnt++; el._pk = acc.map(x => x / Math.max(cnt, 1)); $('#rtm', el).textContent = fmt(t); bars.forEach((b, i) => b.style.height = (4 + (lv[i] || 0) * 40) + 'px'); const a = lv.length ? lv.reduce((x, y) => x + y, 0) / lv.length : 0; mic.style.setProperty('--lv', (1 + Math.min(a, 1) * .14).toFixed(3)); if (t >= 60) stop(); });
    $('#mic', el).onclick = stop; await rec.start();
  };
  const stop = async () => {
    if (!rec) return; const r = await rec.stop(); rec = null; const secs = Math.max(3, Math.round(r.secs));
    rw.innerHTML = `<div style="width:100%;padding:14px 16px;border-radius:22px;background:rgba(244,239,231,.06)">${player(r.url || 'mine' + secs, { mine: true, secs })}</div><button class="btn btn-q" id="again">Grabar otra vez</button>`;
    $('#again', el).onclick = idle;
    after.innerHTML = `<div class="slide" id="sl"></div>`; slider($('#sl', el), slideLabel, () => { const pk = el._pk; if (pk && Math.max(...pk) > .02) { const m = Math.max(...pk); store.set('mypk', pk.map(x => +(x / m).toFixed(2))); } markDay(); onSend({ url: r.url, secs }); });
  };
  idle();
}

// Cuenta: una pregunta a la vez, en letra grande y sin cajas. Tu respuesta espera guardada.
const CQ = [
  { k: 'n', q: '¿Cómo te llamas?', h: 'Nadie lo ve hasta que tú quieras.', t: 'text', ac: 'given-name', ph: 'Tu nombre' },
  { k: 'e', q: '¿Cuál es tu correo?', h: 'Solo para entrar y avisarte cuando te respondan.', t: 'email', ac: 'email', ph: 'nombre@correo.com' },
  { k: 'p', q: 'Crea una contraseña.', h: 'Al menos 6 caracteres.', t: 'password', ac: 'new-password', ph: '••••••', min: 6 }];
R.cuenta = ({ i = 0 } = {}) => { const p = store.get('pending'), f = CQ[i], v = store.get('cta', {}), last = i === CQ.length - 1; return { cls: 'cta', html: `
  <div class="top"><button class="ib edge" id="bk" aria-label="Atrás">${I.back}</button><span class="cdots" aria-label="Paso ${i + 1} de ${CQ.length}">${CQ.map((_, x) => `<i class="${x <= i ? 'on' : ''}"></i>`).join('')}</span><span style="width:44px"></span></div>
  ${p && i === 0 ? `<p class="csaved">${I.check}Tu respuesta está guardada. Crea tu cuenta para enviarla.</p>` : '<div class="csaved-sp"></div>'}
  <form id="f" class="cform" autocomplete="on">
    <label class="cq" for="ci">${f.q}</label>
    <input class="cin" id="ci" name="${f.k}" type="${f.t}" autocomplete="${f.ac}" placeholder="${f.ph}" required ${f.min ? `minlength="${f.min}"` : ''} value="${f.t === 'password' ? '' : esc(v[f.k] || '')}">
    <p class="ch">${f.h}</p>
    ${last ? `<label class="cage"><input type="checkbox" required><span class="box">${I.check}</span>Tengo 18 años o más</label>` : ''}
  </form>
  <div class="grow"></div>
  <button class="btn btn-a" form="f">${last ? 'Crear mi cuenta' : 'Seguir'}</button>`,
  bind(el) { const fm = $('#f', el), inp = $('#ci', el); fm.noValidate = true; setTimeout(() => inp.focus({ preventScroll: true }), 350);
    $('#bk', el).onclick = () => i ? go('cuenta', { i: i - 1 }) : go(p ? 'grabar' : 'bienvenida', p ? { id: p.id, first: true } : {});
    fm.onsubmit = e => { e.preventDefault(); if (!check(fm)) return; const nv = { ...v, [f.k]: inp.value.trim() }; if (f.t !== 'password') store.set('cta', nv);
      if (!last) return go('cuenta', { i: i + 1 }); S.name = nv.n; save(); store.set('cta', null); track('cuenta_creada', { con_respuesta: !!p }); go('temas'); }; } }; };

// Temas: lo único que se muestra de ti antes del nombre.
R.temas = ({ edit = false } = {}) => { const T = TEMAS; return { html: `
  <div class="top"><button class="ib edge" data-go="${edit ? 'perfil' : 'cuenta'}" data-p='${edit ? '{}' : '{"i":2}'}' aria-label="Atrás">${I.back}</button><span class="cap">${edit ? '' : 'Último paso'}</span><span style="width:44px"></span></div>
  <h1 class="title mt2">${edit ? 'Tus temas' : '¿Qué te mueve?'}</h1>
  <p class="sub mt1 mb3">Elige tres. Tus botellas llegan a quien ama lo mismo.</p>
  <div class="chips" id="ch">${T.map(t => `<button class="chip" aria-pressed="${edit && S.temas.includes(t)}">${t}</button>`).join('')}</div>
  <label class="field mt4"><span style="display:flex;justify-content:space-between">Tu distrito <i class="lock" style="font-style:normal">${I.lock}Nunca se muestra</i></span>
  <select class="inp"><option>Barranco</option><option>Jesús María</option><option>Lince</option><option>Miraflores</option><option>San Isidro</option><option>Surco</option><option>Otro</option></select></label>
  <div class="grow"></div>
  <button class="btn btn-a mt3" id="go" ${edit ? '' : 'disabled style="opacity:.4"'}>${edit ? 'Guardar' : 'Entrar al mar'}</button>`,
  bind(el) { const sel = () => $$('.chip[aria-pressed=true]', el).length; $$('.chip', el).forEach(c => c.onclick = () => { if (c.getAttribute('aria-pressed') === 'false' && sel() >= 3) return; c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'false'); const ok = sel() === 3; $('#go', el).disabled = !ok; $('#go', el).style.opacity = ok ? 1 : .4; });
    $('#go', el).onclick = () => { S.temas = $$('.chip[aria-pressed=true]', el).map(c => c.textContent); save(); if (edit) { go('perfil'); toast('Temas guardados'); return; } const p = store.get('pending'); if (p) { const b = B[p.id]; S.shore = S.shore.filter(x => x !== p.id); S.convs[p.id] = { stage: 0, when: 'Ahora', msgs: [{ f: 'them', v: b.v }, { f: 'me', v: 'answer-1', s: p.secs }] }; store.set('pending', null); save(); } store.set('onb', 1); track('temas_elegidos', { temas: S.temas }); go('mar'); toast(p ? 'Tu voz va en camino. Te avisamos cuando te responda.' : 'Bienvenido al mar.'); }; } }; };

// Entrar y recuperar contraseña.
R.entrar = () => ({ html: `
  <div class="top"><button class="ib edge" data-go="bienvenida" aria-label="Atrás">${I.back}</button><span></span><span style="width:44px"></span></div>
  <h1 class="title mt2 mb3">Hola de nuevo.</h1>
  <form id="f"><label class="field"><span>Correo</span><input class="inp" type="email" required autocomplete="email"></label>
  <label class="field"><span>Contraseña</span><input class="inp" type="password" required autocomplete="current-password"></label></form>
  <button class="btn btn-q" style="width:auto;align-self:flex-start;padding:0 4px" data-go="olvide">Olvidé mi contraseña</button>
  <div class="grow"></div><button class="btn btn-a" form="f">Entrar</button>`,
  bind(el) { $('#f', el).noValidate = true; $('#f', el).onsubmit = e => { e.preventDefault(); if (!check(e.target)) return; store.set('onb', 1); go('mar'); }; } });
R.olvide = () => ({ html: `
  <div class="top"><button class="ib edge" data-go="entrar" aria-label="Atrás">${I.back}</button><span></span><span style="width:44px"></span></div>
  <h1 class="title mt2">¿Olvidaste tu contraseña?</h1><p class="sub mt1 mb3">Te mandamos un enlace para crear otra.</p>
  <form id="f"><label class="field"><span>Correo</span><input class="inp" type="email" required autocomplete="email"></label></form>
  <div class="grow"></div><button class="btn btn-a" form="f">Enviar enlace</button>`,
  bind(el) { $('#f', el).noValidate = true; $('#f', el).onsubmit = e => { e.preventDefault(); if (!check(e.target)) return; go('entrar'); toast('Listo. Revisa tu correo.'); }; } });

// Mar: lo que te llegó, tu botella y la pregunta de hoy. Nada más.
// Mar: voces a pantalla completa, una tras otra hacia arriba (como Reels).
// Portada = la forma de la voz dentro de la botella + la pregunta grande, en el color del tema.
let vb = 0;
const voiceBottle = (c, peaks) => { const id = 'vb' + (vb++), pk = (peaks || []).slice(0, 18), n = pk.length || 18, w = 84 / n;
  return `<svg class="vbot" viewBox="0 0 160 300" aria-hidden="true"><defs>
    <clipPath id="${id}c"><path d="M62 70V40h36v30c0 10 26 22 26 52v128c0 14-10 24-24 24H60c-14 0-24-10-24-24V122c0-30 26-42 26-52Z"/></clipPath>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".55"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs>
    <path d="M62 70V40h36v30c0 10 26 22 26 52v128c0 14-10 24-24 24H60c-14 0-24-10-24-24V122c0-30 26-42 26-52Z" fill="url(#${id}s)"/>
    <g clip-path="url(#${id}c)">${Array.from({ length: n }, (_, i) => { const h = 26 + (pk[i] ?? Math.abs(Math.sin(i * 1.7))) * 110; return `<rect class="vbar" style="--i:${i}" x="${38 + i * w + w * .22}" y="${200 - h / 2}" width="${w * .56}" height="${h}" rx="${w * .28}" fill="url(#${id}g)"/>`; }).join('')}</g>
    <path d="M62 70V40h36v30c0 10 26 22 26 52v128c0 14-10 24-24 24H60c-14 0-24-10-24-24V122c0-30 26-42 26-52Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
    <path d="M46 132c0-20 12-30 20-38" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>
    <rect x="64" y="22" width="32" height="22" rx="5" fill="#9A6A3E"/><rect x="64" y="22" width="32" height="6" rx="3" fill="#B8865A"/>
  </svg>`; };
R.mar = () => {
  // El mar nunca se queda vacío: si ya escuchaste todas, llegan otras voces de ejemplo.
  if (!S.shore.length) { const all = Object.keys(B); let nx = all.filter(id => !S.convs[id]); if (!nx.length) nx = all; S.shore = nx.slice(0, 3); save(); setTimeout(() => toast(S.shore.length === 1 ? 'Llegó una botella nueva' : `Llegaron ${S.shore.length} botellas nuevas`), 400); }
  const reels = S.shore.map(id => ({ t: 'voz', id, b: B[id] })); const mode = store.get('marv', 'uno');
  reels.push({ t: 'hoy' }); if (S.mine) reels.push({ t: 'mine' });
  const nv = S.shore.length;
  const reel = (r, i) => {
    if (r.t === 'voz') { const b = r.b, secs = (PK[b.v] || [12])[0];
      return `<section class="reel" style="--c:${b.c}" data-i="${i}">
        <div class="cover">${voiceBottle(b.c, PK[b.v] && PK[b.v][1])}</div>
        <div class="rtx"><span class="rtag"><i></i>${esc(b.tag)} · ${esc(b.kind)}</span>
          <h2 class="rq">${esc(b.q)}</h2>
          <p class="rmeta">Alguien que ama ${esc(b.theme)} · ${fmt(secs)}</p>
          <div class="ract"><button class="btn rbtn" data-go="abrir" data-p='{"id":"${r.id}"}'><span class="pl">${I.play}</span>Escuchar</button></div>
          ${i === 0 && reels.length > 1 ? `<p class="rhint">${I.chev}Desliza hacia arriba</p>` : ''}</div></section>`; }
    if (r.t === 'hoy') return `<section class="reel" style="--c:#FFE7B0" data-i="${i}">
        <div class="cover moonc"><span class="bigmoon"></span></div>
        <div class="rtx"><span class="rtag"><i></i>Pregunta de hoy · para todos</span>
          <h2 class="rq">¿Qué le dirías a tu yo de hace diez años?</h2>
          <p class="rmeta">${store.get('hoy') ? 'Ya respondiste. Escucha lo que dijeron otros.' : 'Responde con tu voz y escucha a otros.'}</p>
          <div class="ract"><button class="btn rbtn" data-go="hoy">${I.mic}${store.get('hoy') ? 'Escuchar respuestas' : 'Responder'}</button></div></div></section>`;
    return `<section class="reel" style="--c:${tc(S.mine.tema)}" data-i="${i}">
        <div class="cover">${voiceBottle(tc(S.mine.tema))}</div>
        <div class="rtx"><span class="rtag"><i></i>Tu ${esc(S.mine.kind.toLowerCase())} · ${esc(S.mine.tema)}</span>
          <h2 class="rq">${`Ya llegó a ${reachOf(S.mine)} personas.`}</h2>
          <p class="rmeta">Y sigue viajando hasta que alguien te responda.</p>
          <div class="ract"><button class="btn rbtn" data-go="botellas">${I.bottle}Ver mis botellas</button></div></div></section>`;
  };
  return { cls: 'tabbed reels', html: `
  <div class="rtop"><span style="width:44px"></span><span class="vmode" role="tablist" aria-label="Cómo ver el mar"><button role="tab" data-m="uno" aria-pressed="${mode === 'uno'}">Una a una</button><button role="tab" data-m="todo" aria-pressed="${mode === 'todo'}">Todo el mar</button></span><button class="me-pill solo" data-go="perfil" aria-label="Tu perfil">${voiceMark()}</button></div>
  <div class="sea" id="sea" aria-label="Todas las botellas del mar"><canvas class="seacv" aria-hidden="true"></canvas>
    <div class="seahead"><h2>${nv === 1 ? '1 botella nueva' : `${nv} botellas nuevas`} flotando</h2><p>Toca una para ver qué dice.</p></div>
    ${(() => { const spots = [[24, 30], [70, 25], [40, 52], [78, 56], [20, 74], [60, 80], [44, 22]]; const all = [...S.shore.map(id => ({ k: 'voz', id, b: B[id] })), { k: 'hoy' }, ...(S.mine ? [{ k: 'mine' }] : [])];
      return all.slice(0, spots.length).map((x, i) => { const [px, py] = spots[i], rot = [-14, 10, -6, 16, -10, 8, -4][i];
        if (x.k === 'hoy') return `<button class="fb moon" style="--x:${px}%;--y:${py};--d:${i * -.7}s" data-k="hoy"><span class="art"><span class="mmoon"></span></span><span class="lbl"><i style="background:#FFE7B0"></i>Pregunta de hoy</span></button>`;
        if (x.k === 'mine') return `<button class="fb mine" style="--x:${px}%;--y:${py};--d:${i * -.7}s;--r:${rot}deg;--c:${tc(S.mine.tema)}" data-k="mine"><span class="rip" aria-hidden="true"></span><span class="art">${voiceBottle(tc(S.mine.tema))}</span><span class="lbl"><i></i>La tuya</span></button>`;
        return `<button class="fb" style="--x:${px}%;--y:${py};--d:${i * -.7}s;--r:${rot}deg;--c:${x.b.c}" data-k="voz" data-id="${x.id}" data-i="${i}"><span class="rip" aria-hidden="true"></span><span class="art">${voiceBottle(x.b.c, PK[x.b.v] && PK[x.b.v][1])}</span><span class="lbl"><i></i>${esc(x.b.tag)}</span></button>`; }).join(''); })()}
  </div>
  <div class="feed" id="feed">${nv ? '' : `<section class="reel calm" style="--c:#7FD8C9"><div class="cover">${voiceBottle('#7FD8C9')}</div><div class="rtx"><h2 class="rq">Vienen más botellas en camino.</h2><p class="rmeta">Ya escuchaste todas las de ahora. Mientras llegan otras, lanza la tuya: llega a todas las personas que aman tu tema.</p><div class="ract"><button class="btn rbtn" data-go="lanzar">${I.mic}Grabar mi botella</button></div></div></section>`}${reels.map(reel).join('')}</div>
  <div class="dots" id="dots">${reels.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>`,
  bind(el) {
    const f = $('#feed', el), cnt = $('#cnt', el), ds = $$('#dots i', el), rs = $$('.reel', el);
    const run = seaWater($('.seacv', el));
    addEventListener('resize', () => { run.reset(); if (el.classList.contains('mapmode')) run(true); });
    const setMode = m => { el.classList.toggle('mapmode', m === 'todo'); run(m === 'todo' && document.body.contains(el)); $$('.vmode button', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m)); store.set('marv', m); };
    setMode(mode); $$('.vmode button', el).forEach(b => b.onclick = () => { setMode(b.dataset.m); track('mar_vista', { vista: b.dataset.m }); navigator.vibrate && navigator.vibrate(6); });
    const toReel = i => { setMode('uno'); f.scrollTo({ top: i * f.clientHeight, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' }); };
    $$('.fb', el).forEach(b => b.onclick = () => { const k = b.dataset.k;
      if (k === 'hoy') return toReel(nv);
      if (k === 'mine') return toReel(nv + 1);
      const id = b.dataset.id, x = B[id], i = +b.dataset.i, secs = (PK[x.v] || [12])[0];
      sheet(`<p class="rtag" style="--c:${x.c}"><i></i>${esc(x.tag)} · ${esc(x.kind)}</p><h2 class="title mt2">${esc(x.q)}</h2><p class="sub mt1">Alguien que ama ${esc(x.theme)} · ${fmt(secs)}</p><div class="row-btns"><button class="btn btn-a" id="go"><span class="pl">${I.play}</span>Escuchar</button><button class="btn btn-q" id="one">Verla en grande</button></div>`, (s2, close) => { $('#go', s2).onclick = () => { close(); go('abrir', { id }); }; $('#one', s2).onclick = () => { close(); toReel(i); }; }); });
    rs[0] && rs[0].classList.add('on');
    const fresh = Object.keys(S.convs).find(k => S.convs[k].unread && !S.convs[k].cel); if (fresh) setTimeout(() => curName === 'mar' && go('respondio', { id: fresh }), 900);
    let last = 0; f.addEventListener('scroll', () => { const i = Math.round(f.scrollTop / f.clientHeight); if (i === last) return; last = i;
      rs.forEach((r, k) => r.classList.toggle('on', k === i)); ds.forEach((d, k) => d.classList.toggle('on', k === i));
      if (cnt && nv > 1) cnt.textContent = i < nv ? `${i + 1} de ${nv} botellas` : `${nv} botellas`; navigator.vibrate && navigator.vibrate(4); }, { passive: true });
  } }; };

// Agua del mar en canvas: oleaje suave, brillos de luna y destellos. Se usa en Todo el mar y en la bienvenida.
const seaWater = cv => {
  const cx = cv.getContext('2d'); let raf = 0, G = [];
    const spr = (w, h, col) => { const o = document.createElement('canvas'); o.width = w; o.height = h; const x = o.getContext('2d'), g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.setTransform(1, 0, 0, h / w, 0, h / 2 - h / 2 * (h / w) * (w / h)); x.fillStyle = g; x.fillRect(0, 0, w, w); return o; };
    const SG = spr(64, 64, 'rgba(200,238,246,1)'), SG2 = spr(64, 64, 'rgba(255,236,196,1)'), SW = spr(256, 256, 'rgba(120,200,215,1)');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = () => { const r = devicePixelRatio || 1; cv.width = cv.clientWidth * r; cv.height = cv.clientHeight * r; cx.setTransform(r, 0, 0, r, 0, 0);
      const W = cv.clientWidth, H = cv.clientHeight; G = Array.from({ length: Math.round(W * H / 900) }, () => { const d = Math.random() ** 1.6; return { x: Math.random() * W, y: H * (.12 + d * .9), d, l: 6 + d * 26, p: Math.random() * 6.3, s: .6 + Math.random() * 1.4, v: (Math.random() - .5) * 6 }; }); };
    const draw = t => { const W = cv.clientWidth, H = cv.clientHeight; t /= 1000;
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0B2B40'); g.addColorStop(.45, '#082233'); g.addColorStop(1, '#03101A'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      const m = cx.createRadialGradient(W * .78, -H * .05, 0, W * .78, -H * .05, H * .75); m.addColorStop(0, 'rgba(255,231,176,.20)'); m.addColorStop(1, 'rgba(255,231,176,0)'); cx.fillStyle = m; cx.fillRect(0, 0, W, H);
      for (let k = 0; k < 7; k++) { const y = H * (.2 + k * .13) + Math.sin(t * .35 + k * 1.7) * 14, x = W * (.5 + Math.sin(t * .12 + k * 2.1) * .35), w = W * (1.1 + k * .12); cx.globalAlpha = .07 + k * .012; cx.drawImage(SW, x - w / 2, y - 26 - k * 3, w, 52 + k * 6); }
      cx.globalCompositeOperation = 'lighter';
      for (const q of G) { const a = Math.max(0, Math.sin(t * q.s + q.p)) ** 3 * (.25 + q.d * .65); if (a < .02) continue;
        const warm = Math.abs(q.x - W * .78) < W * .2, x = ((q.x + t * q.v) % W + W) % W, y = q.y + Math.sin(t * .8 + q.x * .02) * (1 + q.d * 3), h = 2 + q.d * 4;
        cx.globalAlpha = Math.min(1, a); cx.drawImage(warm ? SG2 : SG, x - q.l / 2, y - h / 2, q.l, h); }
      cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
      const v = cx.createRadialGradient(W / 2, H * .55, H * .25, W / 2, H * .55, H * .85); v.addColorStop(0, 'rgba(3,16,26,0)'); v.addColorStop(1, 'rgba(3,16,26,.55)'); cx.fillStyle = v; cx.fillRect(0, 0, W, H); };
    const loop = t => { if (!document.body.contains(cv)) return; if (cv.width !== Math.round(cv.clientWidth * (devicePixelRatio || 1))) size(); draw(t); raf = still ? 0 : requestAnimationFrame(loop); };
    const run = on => { cancelAnimationFrame(raf); raf = 0; if (!on) return; if (!G.length) size(); raf = requestAnimationFrame(loop); };
  run.reset = () => { G = []; }; return run; };

// Lanzar: tipo → grabar (lo principal) → ideas solo si las pides → deslizar.
R.lanzar = ({ idea = '', dorada = false } = {}) => { let kind = 'Pregunta', tema = S.temas[0]; const P = { Pregunta: '¿Qué quieres preguntar?', Confesión: '¿Qué quieres confesar?', Historia: '¿Qué quieres contar?' };
  if (S.left <= 0) return { html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span></span><span style="width:44px"></span></div>
  <div class="grow"></div><h1 class="title">Por hoy lanzaste todas.</h1><p class="sub mt1">Mañana tienes 4 más. Si invitas a alguien, te damos una ahora.</p><div class="grow"></div>
  <button class="btn btn-2" data-go="perfil">Invitar a alguien</button>` };
  return { html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span class="cap">${dorada ? 'Dorada · sale primero en el mar' : S.left === 1 ? 'Te queda 1 botella' : `Te quedan ${S.left} botellas`}</span><span style="width:44px"></span></div>
  <div class="seg mt2" id="seg">${Object.keys(P).map(k => `<button aria-pressed="${k === kind}">${k}</button>`).join('')}</div>
  <div class="lzhead">
    <h1 class="title" id="pq">${P[kind]}</h1>
    <p class="sub" id="idea" ${idea ? '' : 'hidden'}>${esc(idea)}</p>
  </div>
  <div class="grow"></div>
  <div class="rec-wrap" id="rw"></div>
  <div class="grow"></div>
  <div id="after"></div>
  <button class="btn btn-q" id="ideas">¿Sin ideas?</button>`,
  bind(el) {
    $$('#seg button', el).forEach(b => b.onclick = () => { kind = b.textContent; $$('#seg button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); $('#pq', el).textContent = P[kind]; });
    const paintT = () => el.style.setProperty('--c', TC[tema] || '#7FD8C9'); paintT();
    const openTema = () => { const mine = S.temas, rest = TEMAS.filter(t => !mine.includes(t)), ch = t => `<button class="chip" style="--c:${tc(t)}" aria-pressed="${t === tema}"><i></i>${esc(t)}</button>`;
      sheet(`<h2 class="title">¿Sobre qué tema?</h2><p class="sub">Tu botella llega a todas las personas que lo aman.</p><p class="cap tsec">Tus temas</p><div class="chips tchips">${mine.map(ch).join('')}</div><p class="cap tsec">Otros temas</p><div class="chips tchips">${rest.map(ch).join('')}</div>`,
        (sh, close) => $$('.chip', sh).forEach(c => c.onclick = () => { tema = c.textContent; $('#tmn', el) && ($('#tmn', el).textContent = tema); paintT(); navigator.vibrate && navigator.vibrate(5); setTimeout(close, 120); })); };
    const ideas = $('#ideas', el);
    ideas.onclick = () => sheet(`<h2 class="title">Ideas para ${kind === 'Pregunta' ? 'preguntar' : kind === 'Confesión' ? 'confesar' : 'contar'}</h2><p class="sub">Tócala y dila con tus palabras.</p><div class="row-btns" id="il"></div><button class="btn btn-q mt1" id="imore">${I.shuffle}Ver otras ideas</button>`, (s, close) => {
      const fill = () => { const l = $('#il', s); l.classList.remove('in'); void l.offsetWidth; l.innerHTML = nextIdeas(kind, IDEAS[kind]).map(t => `<button class="idea">${esc(t)}</button>`).join(''); l.classList.add('in');
        $$('.idea', l).forEach(b => b.onclick = () => { const p = $('#idea', el); p.hidden = false; p.textContent = b.textContent; close(); }); };
      fill(); $('#imore', s).onclick = () => { fill(); navigator.vibrate && navigator.vibrate(5); }; });
    recUI(el, 'Desliza al mar', () => { const p = $('#idea', el); if (dorada) X.tide = Math.max(0, X.tide - 1); else S.left = Math.max(0, S.left - 1); S.mine = { kind, tema, idea: p.hidden ? '' : p.textContent, heard: 0, dorada }; S.sent.unshift({ ...S.mine, ans: 0, when: 'Ahora' }); saveX(); track('botella_lanzada', { dorada: !!dorada, tema }); go('lanzada'); });
    // El tema se elige al final, junto al envío: primero hablas, después decides a quién le llega.
    new MutationObserver(() => { const sl = $('#sl', el); ideas.hidden = !!sl;
      if (sl && !$('.dest', el)) { sl.insertAdjacentHTML('beforebegin', `<button class="dest" id="dest"><span class="dl">Llega a quienes aman</span><span class="dv"><i></i><b id="tmn">${esc(tema)}</b></span><span class="dc">Cambiar</span></button>`); $('#dest', el).onclick = openTema; } }).observe($('#after', el), { childList: true });
    new MutationObserver(() => el.classList.toggle('recing', !!$('#rtm', el))).observe($('#rw', el), { childList: true });
  } }; };

// Pregunta de hoy: la misma para todos. Respondes con tu voz y se abren las respuestas de los demás.
R.hoy = () => { const done = store.get('hoy'); const A = [['answer-1', 'el cine', '#8E8CFF'], ['answer-2', 'los libros', '#9FE3B0'], ['answer-3', 'la música', '#FF70A9']]; return { html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span class="cap">Pregunta de hoy</span><span style="width:44px"></span></div>
  <h1 class="title mt2">¿Qué le dirías a tu yo de hace diez años?</h1>
  ${done ? `<p class="sub mt1 mb3">Tú ya respondiste. Esto dijeron otros.</p>
  <div class="row-btns">${A.map(([v, t, c]) => `<div class="paper" style="padding:14px 16px"><p class="who" style="margin-bottom:8px"><i class="orb" style="background:${c}"></i>Alguien que ama ${t}</p>${player(v, { real: true })}</div>`).join('')}</div>
  <p class="cap center mt3">Mañana hay otra.</p>`
  : `<p class="sub mt1">Todos responden la misma. Cuando respondas, escuchas a los demás.</p>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`}`,
  bind(el) { if (!done) recUI(el, 'Desliza para enviar', () => { store.set('hoy', 1); go('hoy'); toast('Respuesta enviada'); }); } }; };

// Lanzada: el momento alto. El número de personas que la reciben sube en vivo.
R.lanzada = () => { const t = S.mine ? S.mine.tema : S.temas[0]; return { cls: 'clear', mar: 'away', html: `
  <div class="grow"></div>
  <h1 class="display center">Va en camino.</h1>
  <div class="bignum mt3" aria-live="polite"><b id="rb">0</b><span>personas ya la recibieron</span></div>
  <p class="sub center mt2">Llega a todas las personas que aman ${esc(AMA[t] || t.toLowerCase())}, y sigue llegando a más hasta que alguien te responda.</p>
  <p class="cap center mt2">Te avisamos apenas alguien responda. Cada respuesta abre una conversación privada.</p>
  <button class="btn btn-2 mt4" data-go="mar">Volver al mar</button>`,
  bind(el) { const b = $('#rb', el), goal = 24 + Math.floor(Math.random() * 14); let n = 0; const t0 = (window.Mar && Mar.ok ? 2400 : 400);
    setTimeout(() => { const iv = setInterval(() => { if (!document.body.contains(b)) return clearInterval(iv); n += n < goal ? 1 : (Math.random() < .04 ? 1 : 0); b.textContent = n; if (S.mine) { S.mine.reached = n; } }, n < goal ? 70 : 70); setTimeout(() => { if (S.mine) { const m = S.sent[0]; if (m) m.reached = n; saveX(); } }, 4000); }, t0); } }; };

// Conversaciones.
const stepsHTML = (st, cls = '') => `<span class="steps ${cls}">${[0, 1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</span>`;
const theirPk = id => (PK[B[id].v] || [0, fakePeaks(id.length)])[1];
const theirMark = (id, cls = '') => { const c = B[id].c; return voiceMark(cls, theirPk(id), [c, `color-mix(in oklab, ${c}, #fff 35%)`, `color-mix(in oklab, ${c}, #05121F 30%)`]); };
const pathHTML = st => `<span class="path">${STEP.map((t, i) => `<span class="${i < st ? 'done' : i === st ? 'now' : ''}"><i></i>${t}</span>`).join('')}</span>`;
R.charlas = () => { const ids = Object.keys(S.convs).sort((x, y) => (S.convs[y].unread ? 1 : 0) - (S.convs[x].unread ? 1 : 0)); const nu = ids.filter(k => S.convs[k].unread).length;
  return { cls: 'tabbed', html: `
  <div class="top"><span class="wm">botella</span><button class="me-pill solo" data-go="perfil" aria-label="Tu perfil">${voiceMark()}</button></div>
  <h1 class="title mt1">Conversaciones</h1>
  <p class="sub mt1">${ids.length ? (nu ? `${nu === 1 ? 'Una voz nueva te espera.' : `${nu} voces nuevas te esperan.`}` : `${n_(ids.length, 'conversación', 'conversaciones')}. Todas por voz.`) : 'Cuando respondas una botella, la conversación aparece aquí.'}</p>
  <div class="convs mt3">${ids.map(id => { const c = S.convs[id], b = B[id], last = c.msgs.filter(m => m.v).pop(), named = c.stage >= 1 && b.name, secs = last ? (PK[last.v] ? PK[last.v][0] : last.s || 8) : 0;
    return `<button class="conv${c.unread ? ' new' : ''}" style="--c:${b.c}" data-go="${c.unread && !c.cel ? 'respondio' : 'chat'}" data-p='{"id":"${id}"}'>
      ${theirMark(id)}
      <span class="cx"><span class="ctop"><b>${named ? esc(b.name) : `Alguien que ama ${esc(b.theme)}`}</b><span class="when">${esc(c.when)}</span></span>
      <span class="cq">“${esc(b.q)}”</span>
      <span class="clast">${last && last.f === 'them' ? `<span class="pip">${I.play}</span>${c.unread ? 'Nueva nota de voz' : 'Te respondió'} · ${fmt(secs)}` : `<span class="pip me">${I.check}</span>Le respondiste. Esperando su voz`}</span>
      ${pathHTML(c.stage)}</span></button>`; }).join('')}</div>
  ${S.shore.length ? `<div class="grow"></div><button class="waitc mt3" data-go="mar"><span class="wb">${S.shore.slice(0, 3).map(k => `<span class="mb">${voiceBottle(B[k].c)}</span>`).join('')}</span><span class="tx"><b>${S.shore.length === 1 ? 'Una botella flota en el mar' : `${S.shore.length} botellas flotan en el mar`}</b><small>Escúchalas y responde la que quieras</small></span>${I.chev}</button>` : ''}` }; };

// Chat: la ficha arriba (pregunta y pasos), las voces al medio, el siguiente paso y el micrófono abajo.
const STEP = ['Voces', 'Nombres', 'Llamada', 'Plan'];
R.chat = ({ id = 'leo' }) => { const b = B[id], c = S.convs[id]; c.unread = false; save(); const who = () => c.stage >= 1 && b.name ? b.name : `Alguien que ama ${b.theme}`; return { cls: 'chat', html: `
  <div class="top ctop2" style="--c:${b.c}"><button class="ib" data-go="charlas" aria-label="Atrás">${I.back}</button><span class="chead">${theirMark(id)}<span><b id="who">${esc(who())}</b><small>Les une ${esc(b.theme)}</small></span></span><button class="ib" id="menu" aria-label="Más opciones">${I.more}</button></div>
  <div class="ficha" style="--c:${b.c}"><p class="fk"><i></i>Su ${esc(b.kind.toLowerCase())}</p><p class="q">${esc(b.q)}</p><div id="st"></div></div>
  <div class="thread" id="th"></div>
  <div class="dock"><button class="next" id="next"></button><button class="rec" id="rec" aria-label="Grabar nota de voz">${I.mic}</button></div>`,
  bind(el) {
    const th = $('#th', el), st = $('#st', el), next = $('#next', el);
    const counts = () => ({ them: c.msgs.filter(m => m.f === 'them').length, me: c.msgs.filter(m => m.f === 'me').length });
    el.style.setProperty('--c', b.c);
    const msgHTML = m => m.f === 'sys' ? `<p class="sys">${m.t}</p>` : m.f === 'plan' ? `<div class="plan"><small>${m.ok ? 'Plan aceptado' : 'Propusiste'}</small><b>${esc(m.t)}</b></div>` : `<div class="msg ${m.f}">${player(m.v, { mine: m.f === 'me', secs: m.s })}</div>`;
    const draw = () => {
      th.innerHTML = c.msgs.map(msgHTML).join(''); $('#who', el).textContent = who();
      st.innerHTML = pathHTML(c.stage);
      const k = counts(), need = Math.max(0, 2 - k.them) + Math.max(0, 2 - k.me);
      const N = [
        need ? [need === 1 ? '1 nota más para ver nombres' : `${need} notas más para ver nombres`, null] : [`${I.eye}Compartir mi nombre`, askName],
        [`${I.phone}Pedir una llamada`, askCall], [`${I.plan}Proponer un plan`, askPlan], [`${I.check}Plan listo`, null]][c.stage];
      next.innerHTML = N[0]; next.disabled = !N[1]; next.onclick = N[1];
      requestAnimationFrame(() => el.scrollTop = el.scrollHeight);
    };
    const push = m => { c.msgs.push(m); save(); draw(); };
    function askName() { sheet(`<h2 class="title">¿Compartir tu nombre?</h2><p class="sub">Solo se muestra si los dos aceptan.</p><div class="row-btns"><button class="btn btn-a" id="y">Compartir</button><button class="btn btn-q" data-close>Todavía no</button></div>`, (s, close) => $('#y', s).onclick = () => { close(); push({ f: 'sys', t: 'Esperando su respuesta…' }); setTimeout(() => { c.msgs.pop(); c.stage = 1; track('nombres_compartidos', { id }); push({ f: 'sys', t: `Ahora saben sus nombres: <b>${esc(b.name)}</b> y <b>${esc(S.name || 'tú')}</b>` }); }, 1800); }); }
    function askCall() { sheet(`<h2 class="title">¿Llamar a ${esc(b.name)}?</h2><p class="sub">Solo voz. Si no puede, no pasa nada.</p><div class="row-btns"><button class="btn btn-a" id="y">${I.phone}Pedir llamada</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s, close) => $('#y', s).onclick = () => { close(); toast(`${b.name} aceptó`); setTimeout(() => go('llamada', { id }), 900); }); }
    function askPlan() { const O = ['Ir al cine el martes', 'Café en el Centro', 'Caminar por el malecón']; sheet(`<h2 class="title">Propón un plan</h2><p class="sub">Un lugar público. Cada uno paga lo suyo.</p>${O.map(t => `<button class="idea">${t}</button>`).join('')}`, (s, close) => $$('.idea', s).forEach(o => o.onclick = () => { close(); push({ f: 'plan', t: o.textContent }); setTimeout(() => { c.msgs[c.msgs.length - 1].ok = true; c.stage = 3; save(); draw(); toast(`${b.name} dijo que sí`); }, 2000); })); }
    $('#menu', el).onclick = () => sheet(`<h2 class="title">${esc(who())}</h2><p class="sub">Nadie se entera de lo que elijas aquí.</p><div class="row-btns"><button class="btn btn-2" id="rp">Reportar</button><button class="btn btn-2" id="bl">Bloquear</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (s, close) => { $('#rp', s).onclick = () => { close(); track('reporte_creado', { id }); toast('Gracias. Lo revisamos hoy.'); }; $('#bl', s).onclick = () => { close(); delete S.convs[id]; save(); go('charlas'); toast('Bloqueado. No volverá a escucharte.'); }; });
    // micrófono: toca para grabar, toca para enviar
    let rec = null; const rb = $('#rec', el);
    rb.onclick = async () => {
      if (!rec) { rec = recorder(t => { next.innerHTML = `<span style="color:var(--danger)">●</span> ${fmt(t)} · toca para enviar`; }); rb.classList.add('live'); rb.innerHTML = I.check; next.disabled = true; await rec.start(); return; }
      const r = await rec.stop(); rec = null; rb.classList.remove('live'); rb.innerHTML = I.mic; push({ f: 'me', v: r.url || 'mine' + c.msgs.length, s: Math.max(2, Math.round(r.secs)) });
      if (counts().them < 3 || c.stage === 0) { th.insertAdjacentHTML('beforeend', '<div class="typing"><i></i><i></i><i></i></div>'); el.scrollTop = el.scrollHeight; setTimeout(() => push({ f: 'them', v: `${id}-reply` }), 2400); }
    };
    draw();
  } }; };


// "Te respondieron": el momento alto. Botella que sube, corcho que salta, sonido de descorche y vibración.
const popSound = () => { try { const ac = new (window.AudioContext || window.webkitAudioContext)(), t = ac.currentTime;
  const n = ac.createBuffer(1, ac.sampleRate * .25, ac.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
  const src = ac.createBufferSource(); src.buffer = n; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1800, t); bp.frequency.exponentialRampToValueAtTime(420, t + .12); bp.Q.value = 3;
  const g = ac.createGain(); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .22); src.connect(bp).connect(g).connect(ac.destination); src.start(t);
  const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(140, t + .09); og.gain.setValueAtTime(.5, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og).connect(ac.destination); o.start(t); o.stop(t + .12);
  const f = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate), fd = f.getChannelData(0); for (let i = 0; i < fd.length; i++) fd[i] = (Math.random() < .004 ? (Math.random() * 2 - 1) : 0) * (1 - i / fd.length);
  const fs = ac.createBufferSource(); fs.buffer = f; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const fg = ac.createGain(); fg.gain.value = .35; fs.connect(hp).connect(fg).connect(ac.destination); fs.start(t + .05);
  setTimeout(() => ac.close(), 1600); } catch (e) {} };
R.respondio = ({ id = 'leo' }) => { const b = B[id], c = S.convs[id] || {}; c.cel = true; save(); track('momento_respuesta', { id });
  return { cls: 'clear moment', html: `
  <div class="mo" style="--c:${b.c}">
    <div class="mo-glow"></div><div class="mo-rings"><i></i><i></i><i></i></div>
    <div class="mo-spark">${Array.from({ length: 18 }, (_, k) => `<i style="--a:${k * 20}deg;--d:${(k % 3) * .06}s;--r:${90 + (k % 4) * 22}px"></i>`).join('')}</div>
    <div class="mo-bot">${voiceBottle(b.c, PK[b.v] && PK[b.v][1])}<span class="mo-cork"></span></div>
    <div class="mo-tx"><p class="rtag" style="--c:${b.c}"><i></i>${esc(b.tag)}</p>
      <h1 class="display">Te respondieron.</h1>
      <p class="sub">Alguien que ama ${esc(b.theme)} le contestó a tu voz.</p>
      <div class="row-btns mt3"><button class="btn btn-a" data-go="chat" data-p='{"id":"${id}"}'><span class="pl">${I.play}</span>Escuchar su respuesta</button><button class="btn btn-q" data-go="mar">Después</button></div></div>
  </div>`,
  bind(el) { const go1 = () => { el.classList.add('pop'); popSound(); navigator.vibrate && navigator.vibrate([18, 40, 70]); };
    setTimeout(go1, 950); } }; };


// Tu mes, estilo Wrapped: historias a pantalla completa. Toca a la derecha para avanzar, a la izquierda para volver.
R.mes = () => { const cs = myColors(), pk = myPk(), mesN = new Date().toLocaleDateString('es-PE', { month: 'long', timeZone: 'America/Lima' }).toLowerCase(), Mes = mesN[0].toUpperCase() + mesN.slice(1);
  const heard = S.sent.reduce((t, x) => t + reachOf(x), 0), ans = S.sent.reduce((t, x) => t + (x.ans || 0), 0) + Object.keys(S.convs).length;
  const notas = S.sent.length + Object.values(S.convs).reduce((t, c) => t + c.msgs.filter(m => m.f === 'me').length, 0) + 9, mins = Math.max(3, Math.round(notas * 34 / 60)), top = MAPA[0], best = streak() + 3;
  const SL = [
    { c1: cs[0], c2: cs[1], h: `<p class="wk">Tu ${mesN} en Botella</p>${voiceMark('wx', pk, cs)}<h2>Este mes, tu voz viajó por Lima.</h2><p>Mira hasta dónde llegó.</p>` },
    { c1: '#7FD8C9', c2: '#3A6A8E', h: `<p class="wk">Te escucharon</p><b class="wn" data-n="${heard}">0</b><h2>personas escucharon tu voz.</h2><p>Sin ver tu cara. Solo por lo que dijiste.</p>` },
    { c1: top[2], c2: '#05121F', h: `<p class="wk">Tu tema</p><h2 class="wt">${top[0]}</h2><p>Fue lo que más conectó contigo. ${top[1]} personas que lo aman te respondieron.</p><div class="wdots">${MAPA.map(([t, k, c]) => `<span style="--c:${c};--s:${10 + k * 6}px"><i></i>${t}</span>`).join('')}</div>` },
    { c1: cs[2], c2: cs[0], h: `<p class="wk">Hablaste</p><b class="wn" data-n="${mins}">0</b><h2>minutos con gente nueva.</h2><p>En ${notas} notas de voz y ${n_(ans, 'conversación', 'conversaciones')}.</p>${waveLine(pk, 40)}` },
    { c1: '#FFC24B', c2: '#FF8E9E', h: `<p class="wk">Tu racha más larga</p><b class="wn" data-n="${best}">0</b><h2>días seguidos grabando tu voz.</h2><p>Pocas personas llegan a tanto.</p>` },
    { c1: cs[0], c2: cs[2], h: `<div class="wcard"><p class="wk">Mi ${mesN} en Botella</p>${voiceMark('wx sm2', pk, cs)}<div class="wrow"><span><b>${heard}</b>me escucharon</span><span><b>${mins} min</b>de voz</span><span><b>${top[0]}</b>mi tema</span></div><p class="wbrand">botella · conoce gente por su voz</p></div><div class="row-btns mt3"><button class="btn rbtn" id="share">Compartir mi mes</button><button class="btn btn-q" data-go="perfil">Volver a mi perfil</button></div>` }
  ];
  return { cls: 'clear wrapped', html: `
  <div class="wbars">${SL.map(() => '<i><b></b></i>').join('')}</div>
  <button class="ib wclose" data-go="perfil" aria-label="Cerrar">${I.x}</button>
  <div class="wslides">${SL.map((x, i) => `<section class="ws" style="--c1:${x.c1};--c2:${x.c2}" data-i="${i}">${x.h}</section>`).join('')}</div>
  <button class="wnav wprev" aria-label="Anterior"></button><button class="wnav wnext" aria-label="Siguiente"></button>`,
  bind(el) { const ws = $$('.ws', el), bars = $$('.wbars i', el); let i = -1, tm; track('mes_visto');
    const count = s => $$('.wn', s).forEach(b => { const n = +b.dataset.n, t0 = performance.now(); const f = t => { const p = Math.min(1, (t - t0) / 1100); b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1 && document.body.contains(b)) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const show = k => { if (k < 0) k = 0; if (k >= ws.length) return go('perfil'); i = k; clearTimeout(tm);
      ws.forEach((s, j) => s.classList.toggle('on', j === i)); el.classList.toggle('last', i === ws.length - 1); bars.forEach((b, j) => { b.className = j < i ? 'done' : j === i ? 'run' : ''; });
      count(ws[i]); navigator.vibrate && navigator.vibrate(5); if (i < ws.length - 1) tm = setTimeout(() => document.body.contains(el) && show(i + 1), 5200); };
    $('.wnav.wnext', el).onclick = () => show(i + 1); $('.wnav.wprev', el).onclick = () => show(i - 1);
    $('#share', el).onclick = () => { track('mes_compartido'); const t = 'Mi mes en Botella: me escucharon personas que no conozco, solo por mi voz.'; navigator.share ? navigator.share({ title: 'Botella', text: t, url: 'https://botella-app.vercel.app' }).catch(() => {}) : (navigator.clipboard && navigator.clipboard.writeText(t + ' https://botella-app.vercel.app').catch(() => {}), toast('Copiado para compartir')); };
    show(0); } }; };

// Llamada: solo voz, una esfera que respira.
R.llamada = ({ id = 'leo' }) => { const b = B[id]; return { cls: 'call clear', html: `
  <p class="cap">Llamada de voz</p><h1 class="title">${esc(b.name)}</h1><p class="sub" id="ct">Conectando…</p>
  <div class="voiceorb"></div>
  <button class="hang" id="h" aria-label="Colgar">${I.phone}</button>`,
  bind(el) { let t = 0, iv; setTimeout(() => { audio.src = `v/${id}-call.mp3`; audio.play().catch(() => {}); iv = setInterval(() => { t++; const c = $('#ct', el); c && (c.textContent = fmt(t)); }, 1000); }, 1200);
    $('#h', el).onclick = () => { clearInterval(iv); audio.pause(); const c = S.convs[id]; c.stage = 2; c.msgs.push({ f: 'sys', t: `Llamada · ${fmt(Math.max(t, 1))}` }); save(); go('chat', { id }); }; } }; };

// ================= LO DEMÁS: vive en tu perfil, una pantalla por cosa =================
const X = Object.assign({ color: 0, far: 0, tide: 0, gift: 0, glass: 'Claro', captain: false, streak: 4 }, store.get('x', {}));
S.sent = store.get('sent', [
  { kind: 'Pregunta', tema: 'Cine', idea: '¿Qué película verías mil veces?', heard: 8, ans: 2, when: 'Ayer' },
  { kind: 'Confesión', tema: 'Música', idea: '', heard: 5, ans: 0, when: 'Lunes' }
]);
S.outs = store.get('outs', [
  { t: 'Caminata al atardecer', where: 'Malecón de Miraflores', when: 'Sábado · 5:30 p. m.', n: 5, max: 8, tema: 'La ciudad', go: false },
  { t: 'Cine y conversa', where: 'Un cine en Miraflores', when: 'Martes · 8:00 p. m.', n: 3, max: 6, tema: 'Cine', go: false },
  { t: 'Preguntas frente al mar', where: 'Bajada de Baños, Barranco', when: 'Domingo · 4:00 p. m.', n: 7, max: 8, tema: 'Filosofía', go: false }
]);
S.lec = store.get('lec', [{ q: '¿Qué fue lo primero que pensaste de mí?', ans: [['answer-1', 'Andrea'], ['answer-2', 'Pato'], ['answer-3', 'Lu']] }]);
S.duo = store.get('duo', null);
const saveX = () => { store.set('x', X); store.set('sent', S.sent); store.set('outs', S.outs); store.set('lec', S.lec); store.set('duo', S.duo); save(); };
Object.assign(I, {
  tide: '<svg viewBox="0 0 24 24"><path d="M3 9c2 0 2-1.5 4.5-1.5S9.5 9 12 9s2-1.5 4.5-1.5S19 9 21 9M3 14c2 0 2-1.5 4.5-1.5S9.5 14 12 14s2-1.5 4.5-1.5S19 14 21 14M3 19c2 0 2-1.5 4.5-1.5S9.5 19 12 19s2-1.5 4.5-1.5S19 19 21 19"/></svg>',
  map: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/><circle cx="18" cy="6.5" r="1.4"/><circle cx="5" cy="14" r="1.4"/><circle cx="15" cy="19.5" r="1.4"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M4 18V12a6 6 0 0 1 6-6M14 18V12a6 6 0 0 1 6-6M4 18h5v-5H4M14 18h5v-5h-5"/></svg>',
  two: '<svg viewBox="0 0 24 24"><path d="M6 3h3M6.5 3v3L5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h2A1.5 1.5 0 0 0 10 19V8.5L8.5 6V3M15 3h3M15.5 3v3L14 8.5V19a1.5 1.5 0 0 0 1.5 1.5h2A1.5 1.5 0 0 0 19 19V8.5L17.5 6V3"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>'
});
const back = (to = 'perfil', cap = '') => `<div class="top"><button class="ib edge" data-go="${to}" aria-label="Atrás">${I.back}</button><span class="cap">${cap}</span><span style="width:44px"></span></div>`;
const row = (ic, t, s, attr) => `<button class="item" ${attr}><span class="ic">${I[ic]}</span><span class="tx"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span>${I.chev}</button>`;
const free = () => '';
const n_ = (n, a, b) => `${n} ${n === 1 ? a : b}`;

// Perfil: arriba tu voz y tu mes; luego tus botellas; luego lo que haces con amigos; lo demás, junto al final.
const tile = (ic, t, attr) => `<button class="tile3" ${attr}><span class="ic">${I[ic]}</span><b>${t}</b></button>`;
const MAPA = [['Cine', 5, '#8E8CFF'], ['Música', 3, '#FF70A9'], ['Libros', 2, '#9FE3B0'], ['La ciudad', 1, '#FFB061']];
const weekStrip = () => { const L = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; return Array.from({ length: 7 }, (_, k) => { const d = new Date(Date.now() - (6 - k) * 864e5), on = DAYS.includes(dayKey(d)); return `<span class="${on ? 'on' : ''}${k === 6 ? ' today' : ''}"><i></i>${L[d.getDay()]}</span>`; }).join(''); };
const friendRow = (c, ic, t, s, attr) => `<button class="frow" style="--c:${c}" ${attr}><span class="fic">${I[ic]}</span><span class="tx"><b>${t}</b><small>${s}</small></span>${I.chev}</button>`;
R.perfil = () => { const n = streak(), done = recToday(), cs = myColors(), pk = myPk();
  const heard = S.sent.reduce((t, x) => t + (x.heard || 0), 0) + 23, ans = S.sent.reduce((t, x) => t + (x.ans || 0), 0) + Object.keys(S.convs).length;
  const notas = S.sent.length + Object.values(S.convs).reduce((t, c) => t + c.msgs.filter(m => m.f === 'me').length, 0) + 9;
  const mes = new Date().toLocaleDateString('es-PE', { month: 'long', timeZone: 'America/Lima' }).toLowerCase(), top = MAPA[0];
  const sent = S.sent.slice(0, 3), lec = S.lec[0], la = S.lec.reduce((t, l) => t + l.ans.length, 0), goOut = S.outs.filter(o => o.go).length;
  return { cls: 'pin', html: `
  ${back('mar')}
  <div class="me-head mt1">${voiceMark('big', pk, cs)}<span><h1 class="title">${esc(S.name || 'Tú')}</h1><span class="tchips">${S.temas.map(t => `<span style="--c:${tc(t)}"><i></i>${esc(t)}</span>`).join('')}</span></span></div>

  <button class="month mt3" data-go="mes" style="--c1:${cs[0]};--c2:${cs[1]};--c3:${cs[2]}">
    <span class="mlbl">Tu ${mes} en Botella · Toca para verlo</span>
    <b class="mbig">${heard} personas escucharon tu voz.</b>
    <span class="mrow"><span><b>${ans}</b>te respondieron</span><span><b>${notas}</b>notas de voz</span><span><b style="color:${top[2]}">${top[0]}</b>tu tema más escuchado</span></span>
    ${waveLine(pk)}
  </button>

  <button class="streakc mt2" data-go="bitacora">
    <span class="sn"><b>${n}</b><small>${n === 1 ? 'día' : 'días'}</small></span>
    <span class="tx"><b>${n ? `${n === 1 ? '1 día seguido' : `${n} días seguidos`} grabando tu voz` : 'Graba hoy y empieza tu racha'}</b><small>${done ? `Hoy ya grabaste. Mañana llegas a ${n + 1}.` : n ? `Graba algo hoy para llegar a ${n + 1}.` : 'Una botella o una respuesta cuentan.'}</small></span>
    <span class="wk">${weekStrip()}</span>
  </button>

  <p class="eyebrow">Tu voz</p>
  <div class="duo2">
    <button class="vcard" data-go="botellas"><span class="vart">${sent.length ? sent.map(x => `<span class="mb">${voiceBottle(tc(x.tema))}</span>`).join('') : `<span class="mb">${voiceBottle('#7FD8C9')}</span>`}</span><b>Mis botellas</b><small>${S.sent.length ? `${n_(S.sent.length, 'botella', 'botellas')} · ${n_(S.sent.reduce((t, x) => t + (x.ans || 0), 0), 'respuesta', 'respuestas')}` : 'Todavía ninguna'}</small></button>
    <button class="vcard" data-go="mapa"><span class="vart cst">${MAPA.map(([t, k, c], i) => `<i style="--c:${c};--s:${8 + k * 3}px;--x:${[18, 62, 34, 76][i]}%;--y:${[30, 22, 70, 66][i]}%"></i>`).join('')}<em></em></span><b>Mapa de tu voz</b><small>Conectó con ${n_(MAPA.length, 'tema', 'temas')}</small></button>
  </div>

  <p class="eyebrow">Con tus amigos</p>
  <div class="fl">
    ${friendRow('#C7B8FF', 'quote', '¿Qué piensan de ti?', la ? `${n_(la, 'amigo respondió', 'amigos respondieron')} “${esc(lec.q)}”` : 'Tus amigos te responden con su voz', 'data-go="lecturas"')}
    ${friendRow('#FF8E9E', 'two', 'Botella para dos', S.duo ? (S.duo.friend ? 'Ya están las dos voces. Falta lanzarla.' : 'Falta la voz de tu amigo') : 'Graba una botella junto a un amigo', 'data-go="dos"')}
    ${friendRow('#FFB061', 'people', 'Salidas en grupo', goOut ? `Vas a ${n_(goOut, 'salida', 'salidas')}` : `${n_(S.outs.length, 'plan', 'planes')} en Lima esta semana`, 'data-go="salidas"')}
  </div>

  <div class="list mt3">
    ${row('dock', 'Muelle', 'Botellas especiales, gratis', 'data-go="muelle"')}
    ${row('tide', 'Botellas doradas', 'Salen primero en el mar de todos', 'data-go="marea"')}
    ${row('gift', 'Invitar a alguien', 'Los dos reciben una botella extra', 'data-a="inv"')}
    ${row('key', 'Cuenta', 'Tus temas, normas y contraseña', 'data-a="cuenta"')}
  </div>`,
  bind(el) {
    const acts = {
      inv: () => sheet(`<h2 class="title">Invita a alguien</h2><p class="sub">Cuando entre, los dos reciben una botella extra.</p><div class="inp mt2" style="display:flex;align-items:center;color:var(--fg-2);font-size:14px">botella-app.vercel.app/?c=TU-CODIGO</div><div class="row-btns mt2"><button class="btn btn-a" id="cp">Copiar enlace</button></div>`, (s, close) => $('#cp', s).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); close(); track('invitacion_copiada'); toast('Enlace copiado'); }),
      rules: () => sheet(`<h2 class="title">Normas de la casa</h2><div class="list mt2 mb3">${['Coquetear está bien. Lo explícito, no.', 'Sin insultos ni amenazas.', 'Tu distrito nunca se muestra.', 'Puedes reportar o bloquear desde cualquier conversación.'].map(t => `<p class="item" style="margin:0;min-height:52px">${t}</p>`).join('')}</div><button class="btn btn-2" data-close>Entendido</button>`),
      cuenta: () => sheet(`<h2 class="title">Cuenta</h2><div class="list mt2">${row('tag', 'Tus temas', S.temas.join(', '), 'data-a="temas"')}${row('rules', 'Normas de la casa', '', 'data-a="rules"')}${row('key', 'Cambiar contraseña', '', 'data-a="pw"')}${row('quote', 'Cuéntanos qué te parece', 'Una frase basta', 'data-a="fb"')}${row('out', 'Cerrar sesión', '', 'data-a="out"')}</div>`, (s, close) => { $$('[data-a]', s).forEach(b => b.onclick = () => { const k = b.dataset.a; if (k === 'rules') return acts.rules(); close(); setTimeout(acts[k], 210); }); }),
      fb: () => sheet(`<h2 class="title">¿Qué tal Botella?</h2><p class="sub">Lo que te gusta, lo que te confunde o lo que te falta.</p><div class="chips mt2" id="fbm">${['Me encanta', 'Me confunde algo', 'Me falta gente'].map(t => `<button class="chip" aria-pressed="false">${t}</button>`).join('')}</div><textarea class="inp mt2" id="fbt" rows="3" placeholder="Escribe aquí (opcional)" style="height:auto;padding-top:12px;resize:none"></textarea><div class="row-btns mt2"><button class="btn btn-a" id="fbs">Enviar</button></div>`, (sh, close) => { $$('#fbm .chip', sh).forEach(c => c.onclick = () => $$('#fbm .chip', sh).forEach(x => x.setAttribute('aria-pressed', x === c))); $('#fbs', sh).onclick = () => { const m = $('#fbm [aria-pressed=true]', sh); track('comentario', { animo: m ? m.textContent : null, texto: $('#fbt', sh).value.slice(0, 500) }); close(); toast('Gracias por contarnos.'); }; }),
      pw: () => go('olvide'), temas: () => go('temas', { edit: true }), out: () => sheet(`<h2 class="title">¿Cerrar sesión?</h2><p class="sub">Tus botellas y conversaciones te esperan cuando vuelvas a entrar.</p><div class="row-btns mt3"><button class="btn btn-2" id="bye">Cerrar sesión</button><button class="btn btn-q" data-close>Seguir aquí</button></div>`, (sh, close) => $('#bye', sh).onclick = () => { close(); store.set('onb', 0); go('bienvenida'); })
    };
    $$('[data-a]', el).forEach(b => b.onclick = () => acts[b.dataset.a]());
  } }; };

// Muelle: una cosa a la vez. Especiales · Más botellas · Capitán.
const SPECIAL = [
  ['color', 'De color', 'Llega solo a quienes aman un tema que eliges', '#FF70A9'],
  ['far', 'Que llega lejos', 'También a quienes aman otros temas', '#8E8CFF'],
  ['tide', 'Dorada', 'Sale primero en el mar de todos en cuanto la lanzas', '#FFC24B'],
  ['gift', 'De regalo', 'Para alguien con quien conversas: le das una botella más', '#FFB061']
];
const GLASS = [['Claro', '#CFE9F2'], ['Verde', '#7FD8A0'], ['Ámbar', '#FFB061'], ['Esmerilado', '#B9C6D3']];
const PACKS = [[3, 'Para un día con mucho que decir'], [10, 'Para toda la semana'], [30, 'Para el mes, con 5 de regalo']];
let muelleTab = 0;
const MUELLE = [
  () => `<div class="grid2">${SPECIAL.map(([k, t, d, c]) => `<button class="spc" data-k="${k}"><span class="art">${bottleSVG(c)}</span><b>${t}</b><small>${d}</small><span class="foot">${X[k] ? `<em class="have">Tienes ${X[k]}</em>` : '<span></span>'}<span class="chip sm">Pedir</span></span></button>`).join('')}</div>`,
  () => `<p class="sub">Cada día puedes lanzar 4 botellas. Si quieres lanzar más, pide un paquete.</p>
    <div class="list mt2">${PACKS.map(([q, d]) => `<button class="item" data-pack="${q}"><span class="ic"><b style="font-weight:500">+${q}</b></span><span class="tx"><b>${q} botellas más</b><small>${d}</small></span><span class="chip sm">Pedir</span></button>`).join('')}</div>
    <p class="eyebrow">El vidrio de tus botellas</p>
    <div class="tiles">${GLASS.map(([g, c]) => `<button class="tile glass" data-g="${g}" aria-pressed="${X.glass === g}"><span class="art">${bottleSVG(c)}</span><span>${g}</span></button>`).join('')}</div>`,
  () => `<div class="capt">
    <h2 class="title" style="font-size:22px">Más botellas cada día y salidas más grandes.</h2>
    <ul>${['3 botellas extra al día', 'Ves qué tema compartes con quien abre tus botellas', 'Una que llega lejos cada lunes', 'Salidas de hasta 12 personas'].map(t => `<li>${I.check}${t}</li>`).join('')}</ul>
    ${X.captain ? `<button class="btn btn-2" id="capt">Eres Capitán · dejar el plan</button>` : `<p class="cap mb2"><s>S/ 19.90 al mes</s> · gratis por ahora</p><button class="btn btn-a" id="capt">Ser Capitán gratis</button>`}</div>`
];
R.muelle = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Muelle</h1>
  <p class="sub mt1">Todas las botellas especiales son gratis.</p>
  <div class="seg mt3" id="mt">${['Especiales', 'Más botellas', 'Capitán'].map((t, i) => `<button aria-pressed="${i === muelleTab}">${t}</button>`).join('')}</div>
  <div id="mp" class="mt3"></div>`,
  bind(el) {
    const paint = () => { $('#mp', el).innerHTML = MUELLE[muelleTab](); wire(); };
    const again = msg => { saveX(); paint(); toast(msg); };
    const wire = () => {
      $$('[data-k]', el).forEach(b => b.onclick = () => { X[b.dataset.k]++; again(`Listo. Tienes una botella ${SPECIAL.find(s => s[0] === b.dataset.k)[1].toLowerCase()}.`); });
      $$('[data-pack]', el).forEach(b => b.onclick = () => { S.left += +b.dataset.pack; again(`Llegaron ${b.dataset.pack} botellas a tu muelle.`); });
      $$('[data-g]', el).forEach(b => b.onclick = () => { X.glass = b.dataset.g; again(`Tus botellas viajan en vidrio ${X.glass.toLowerCase()}.`); });
      const c = $('#capt', el); c && (c.onclick = () => { X.captain = !X.captain; if (X.captain) S.left += 3; again(X.captain ? 'Ya eres Capitán. Gratis por ahora.' : 'Dejaste el plan Capitán.'); });
    };
    $$('#mt button', el).forEach((b, i) => b.onclick = () => { muelleTab = i; $$('#mt button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); paint(); });
    paint();
  } });

// Mis botellas: a cuántas llegó cada una y quién respondió.
const reachRow = x => `<span class="rbar"><i style="width:${Math.min(100, (x.heard || 0) / Math.max(1, reachOf(x)) * 100)}%"></i></span>`;
// Respuestas de ejemplo para tus botellas (voz + quién respondió, sin nombre ni distrito).
const ANS = [['caro-reply', 'la ciudad', '#FFB061'], ['ivan-reply', 'la música', '#FFC24B'], ['majo-reply', 'la música', '#FF70A9'], ['belen-reply', 'los libros', '#9FE3B0']];
const ansOf = (x, i) => x.ans ? Array.from({ length: x.ans }, (_, k) => ANS[(i * 2 + k) % ANS.length]) : [];
R.botellas = () => { const heard = S.sent.reduce((t, x) => t + reachOf(x), 0), ans = S.sent.reduce((t, x) => t + (x.ans || 0), 0);
  const pend = S.sent.flatMap((x, i) => ansOf(x, i).map(a => ({ a, x, i }))).filter(p => !(X.heardAns || []).includes(p.a[0] + p.i));
  return { cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Mis botellas</h1>
  ${pend.length ? `<p class="eyebrow" style="margin-top:20px">${pend.length === 1 ? 'Te respondieron. Escucha.' : `${pend.length} respuestas por escuchar`}</p>
  <div class="anscards">${pend.map(({ a: [v, th, c], x, i }) => `<div class="anscard" style="--c:${c}" data-v="${v}${i}"><p class="awho"><i></i>Alguien que ama ${esc(th)} respondió a tu ${esc(x.kind.toLowerCase())}${x.idea ? `: “${esc(x.idea)}”` : ''}</p>${player(v, { real: true })}<div class="aact"><button class="chip sm" data-go="charlas">${I.mic}Responder</button></div></div>`).join('')}</div>` : ''}
  ${S.sent.length ? `<div class="facts mt3"><p><b>${S.sent.length}</b><span>${S.sent.length === 1 ? 'lanzada' : 'lanzadas'}</span></p><p><b>${heard}</b><span>personas las recibieron</span></p><p><b>${ans}</b><span>${ans === 1 ? 'te respondió' : 'te respondieron'}</span></p></div>` : ''}
  <p class="eyebrow" style="margin-top:24px">Tus botellas en el mar</p>
  <div class="bcards">${S.sent.length ? S.sent.map((x, i) => `<button class="bcard" style="--c:${tc(x.tema)}" data-i="${i}"><span class="mb">${voiceBottle(tc(x.tema))}</span><span class="tx"><small class="btag"><i></i>Tu ${esc(x.kind.toLowerCase())} · ${esc(x.tema)} · ${esc(x.when)}</small><b>${x.idea ? esc(x.idea) : `Una ${esc(x.kind.toLowerCase())} solo con tu voz`}</b>${reachRow(x)}<small>${x.ans ? `<em class="hasans">${n_(x.ans, 'respuesta', 'respuestas')}</em> · ` : ''}Llegó a ${reachOf(x)} personas${x.heard ? `, ${x.heard} ya la escucharon` : ''}${x.far ? ' · con empujón' : ''}</small></span></button>`).join('') : `<div class="bempty"><span class="mb">${voiceBottle('#7FD8C9')}</span><p class="sub">Todavía no lanzas ninguna. Graba una pregunta y le llega a toda la gente que ama lo mismo que tú.</p></div>`}</div>
  <div class="grow"></div><button class="btn btn-a mt3" data-go="lanzar">${I.mic}Lanzar otra</button>`,
  bind(el) {
    $$('.anscard', el).forEach(c => $('.player', c).addEventListener('click', () => { const k = c.dataset.v; X.heardAns = [...new Set([...(X.heardAns || []), k])]; saveX(); }));
    $$('[data-i]', el).forEach(b => b.onclick = () => { const i = +b.dataset.i, x = S.sent[i], reach = reachOf(x), as = ansOf(x, i);
      sheet(`<p class="btag" style="--c:${tc(x.tema)};margin:6px 0 0"><i></i>Tu ${esc(x.kind.toLowerCase())} · ${esc(x.tema)}</p><h2 class="title mt1">${x.idea ? esc(x.idea) : `Una ${esc(x.kind.toLowerCase())} solo con tu voz`}</h2>
      <div class="facts mt2"><p><b>${reach}</b><span>personas la recibieron</span></p><p><b>${x.heard}</b><span>ya la escucharon</span></p><p><b>${x.ans || 0}</b><span>${x.ans === 1 ? 'respondió' : 'respondieron'}</span></p></div>
      ${as.length ? `<div class="row-btns mt2">${as.map(([v, th]) => `<div class="mini"><small>Alguien que ama ${esc(th)}</small>${player(v, { real: true })}</div>`).join('')}</div>` : '<p class="cap mt2">Sigue viajando hasta que alguien te responda.</p>'}
      <div class="row-btns mt3">${x.far ? '' : `<button class="btn btn-a" id="push">${I.bottle}Empujarla a otros temas también</button>`}<button class="btn btn-q" id="del">Retirarla del mar</button></div>`, (s2, close) => {
        const p = $('#push', s2); p && (p.onclick = () => { close(); if (X.far > 0) { X.far--; x.far = true; saveX(); go('botellas', { nohash: true }); track('botella_empujada', { tema: x.tema }); toast('Listo. Ahora también llega a gente de otros temas.', tc(x.tema)); } else setTimeout(() => sheet(`<h2 class="title">Te falta una botella que llega lejos</h2><p class="sub">En el muelle te damos una, gratis.</p><div class="row-btns mt3"><button class="btn btn-a" id="gm">Ir al muelle</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s3, c3) => $('#gm', s3).onclick = () => { c3(); muelleTab = 0; go('muelle'); }), 220); });
        $('#del', s2).onclick = () => { close(); const was = S.sent.splice(i, 1)[0], mine = S.mine; if (S.mine && S.mine.idea === was.idea && S.mine.tema === was.tema) S.mine = null; saveX(); go('botellas', { nohash: true }); track('botella_retirada', { tema: was.tema });
          toast('La retiraste del mar. Ya nadie más la recibe.', '#FFE7B0', () => { S.sent.splice(i, 0, was); S.mine = mine; saveX(); go('botellas', { nohash: true }); }); };
      }); });
  } }; };

// El mapa de tu voz: los temas con los que conectó.
R.mapa = () => { const P = MAPA; const tot = P.reduce((a, p) => a + p[1], 0);
  const pts = P.map(([t, n, c], i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / P.length) + .4, r = 34; return { t, n, c, x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r }; });
  return { cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Tu voz conectó con ${P.length} temas.</h1>
  <p class="sub mt1">${tot} personas te respondieron. Más cerca de ti, el tema que más te escuchó.</p>
  <svg class="mapsvg" viewBox="0 0 100 100" role="img" aria-label="Temas con los que conectó tu voz"><circle class="orbit" cx="50" cy="50" r="34"/>
    ${pts.map(p => `<line x1="50" y1="50" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${p.c}" stroke-opacity=".35" stroke-width="${(.3 + p.n * .12).toFixed(2)}"/>`).join('')}
    ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1.6 + p.n * .55).toFixed(1)}" fill="${p.c}"/><text x="${p.x.toFixed(1)}" y="${(p.y + 5.4 + p.n * .55).toFixed(1)}" text-anchor="middle">${p.t}</text>`).join('')}
    <circle class="home" cx="50" cy="50" r="3.4"/><text class="you" x="50" y="58.5" text-anchor="middle">Tu voz</text></svg>
  <div class="list">${P.map(([t, n, c]) => `<div class="item" style="min-height:52px"><i class="orb" style="background:${c};width:10px;height:10px"></i><span class="tx"><b>${t}</b></span><span class="cap">${n_(n, 'persona', 'personas')}</span></div>`).join('')}</div>` }; };

// Racha: días seguidos grabando tu voz (una botella, una respuesta o una pregunta para amigos).
const UNLOCK = [[3, 'Vidrio verde', '#7FD8A0'], [7, 'Una botella que llega lejos', '#8E8CFF'], [14, 'Vidrio esmerilado', '#B9C6D3'], [30, 'Una botella dorada cada semana', '#FFC24B']];
R.bitacora = () => { const n = streak(), done = recToday(), nx = UNLOCK.find(u => u[0] > n), prev = (UNLOCK.filter(u => u[0] <= n).pop() || [0])[0];
  return { cls: 'pin', html: `
  ${back()}
  <div class="rhead mt1"><span class="rnum">${n}</span><h1 class="title">${n === 1 ? 'día seguido' : 'días seguidos'} grabando tu voz.</h1></div>
  <p class="sub mt2">Cuenta cada día en que grabas algo: una botella, una respuesta o una pregunta para tus amigos.</p>
  <div class="week mt3">${weekStrip()}</div>
  <div class="todayc mt3 ${done ? 'ok' : ''}">${done ? `${I.check}<span><b>Hoy ya grabaste.</b><small>Vuelve mañana y llegas a ${n + 1}.</small></span>` : `${I.mic}<span><b>Hoy todavía no grabas.</b><small>Si termina el día sin grabar, vuelves a empezar desde 0.</small></span><button class="chip sm" data-go="lanzar">Grabar</button>`}</div>
  ${nx ? `<div class="next mt2"><span class="cap">Con ${nx[0]} días seguidos te regalamos</span><b>${nx[1]}</b><span class="bar"><i style="width:${Math.max(8, (n - prev) / (nx[0] - prev) * 100)}%"></i></span><span class="cap">${nx[0] - n === 1 ? 'Falta 1 día' : `Faltan ${nx[0] - n} días`}</span></div>` : ''}
  <p class="eyebrow">Regalos por días seguidos</p>
  <div class="gifts">${UNLOCK.map(([d, t, c]) => `<div class="gft${d <= n ? ' got' : ''}"><span class="art">${bottleSVG(c)}</span><b>${t}</b><small>${d <= n ? 'Ya es tuyo' : `A los ${d} días`}</small></div>`).join('')}</div>` }; };

// Botellas doradas: salen primero en el mar de todos, en cuanto se lanzan. Sin horarios.
R.marea = () => { const L = ['majo', 'leo', 'belen'];
  return { cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Botellas doradas</h1>
  <p class="sub mt1">Una dorada sale primero en el mar de todos en cuanto la lanzas, a la hora que quieras. Estas son las de hoy.</p>
  <div class="row-btns mt3">${L.map(id => { const b = B[id]; return `<button class="gold" data-go="abrir" data-p='{"id":"${id}"}'><span class="art">${bottleSVG('#FFC24B')}</span><span class="tx"><small><i class="orb" style="background:${b.c}"></i>Alguien que ama ${esc(b.theme)}</small><b>${esc(b.q)}</b></span></button>`; }).join('')}</div>
  <div class="grow"></div>
  <button class="btn btn-2 mt3" id="mine">${I.mic}Lanzar una dorada</button>`,
  bind(el) { $('#mine', el).onclick = () => X.tide > 0 ? go('lanzar', { dorada: true }) : sheet(`<h2 class="title">Necesitas una dorada</h2><p class="sub">En el muelle te damos una, gratis.</p><div class="row-btns mt3"><button class="btn btn-a" id="gm">Ir al muelle</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s, close) => $('#gm', s).onclick = () => { close(); go('muelle'); }); } }; };

// Salidas en grupo: planes en lugares públicos.
R.salidas = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Salidas en grupo</h1>
  <p class="sub mt1">En lugares públicos. Cada uno paga lo suyo.</p>
  <div class="row-btns mt3">${S.outs.map((o, i) => `<div class="out" style="--c:${tc(o.tema)}"><p class="cap" style="margin:0"><i class="orb" style="background:var(--c);width:7px;height:7px"></i> Para quien ama ${esc(AMA[o.tema] || o.tema)}</p><b>${esc(o.t)}</b><span class="sub" style="font-size:14px">${I.pin}${esc(o.where)} · ${esc(o.when)}</span>
    <div class="foot"><span class="seats">${Array.from({ length: o.max }, (_, j) => `<i class="${j < o.n ? 'on' : ''}"></i>`).join('')}</span><span class="cap">${o.max - o.n ? `Quedan ${o.max - o.n}` : 'Completa'}</span><button class="gobtn" data-i="${i}" aria-pressed="${o.go}">${o.go ? `${I.check}Vas` : 'Voy'}</button></div></div>`).join('')}</div>
  <div class="grow"></div>
  <button class="btn btn-a mt3" data-go="proponer">Proponer una salida</button>`,
  bind(el) { $$('[data-i]', el).forEach(b => b.onclick = () => { const o = S.outs[+b.dataset.i]; if (!o.go && o.n >= o.max) return toast('Ya está completa.', '#FFE7B0'); o.go = !o.go; o.n += o.go ? 1 : -1; saveX(); go('salidas', { nohash: true }); toast(o.go ? 'Listo. El día antes te recordamos.' : 'Ya no vas.'); }); } });
R.proponer = () => { const IDE = ['Caminata al atardecer', 'Preguntas frente al mar', 'Confesiones y café', 'Cine y conversa'], PL = ['Malecón de Miraflores', 'Parque Kennedy', 'Bajada de Baños, Barranco', 'Parque del Amor'], DIA = ['Hoy', 'Mañana', 'Sábado', 'Domingo'], HR = ['5:00 p. m.', '6:30 p. m.', '8:00 p. m.'], N = [4, 6, 8];
  const st = { t: IDE[0], where: PL[0], d: DIA[2], h: HR[0], max: 6 };
  const grp = (k, arr, lbl) => `<p class="eyebrow">${lbl}</p><div class="chips" data-k="${k}">${arr.map(v => `<button class="chip" aria-pressed="${st[k] === v}">${v}</button>`).join('')}</div>`;
  return { cls: 'pin', html: `
  ${back('salidas')}
  <h1 class="title mt1">¿Qué proponemos?</h1>
  ${grp('t', IDE, 'El plan')}${grp('where', PL, 'Dónde · siempre un lugar público')}${grp('d', DIA, 'Qué día')}${grp('h', HR, 'A qué hora')}${grp('max', N, 'Cuántas personas')}
  <div class="grow"></div>
  <button class="btn btn-a mt3" id="pub">Publicar la salida</button>`,
  bind(el) { $$('.chips[data-k]', el).forEach(g => $$('.chip', g).forEach(c => c.onclick = () => { const k = g.dataset.k; st[k] = k === 'max' ? +c.textContent : c.textContent; $$('.chip', g).forEach(x => x.setAttribute('aria-pressed', x === c)); }));
    $('#pub', el).onclick = () => { S.outs.unshift({ t: st.t, where: st.where, when: `${st.d} · ${st.h}`, n: 1, max: st.max, tema: S.temas[0], go: true }); saveX(); go('salidas'); toast('Publicada. Le llega a quienes aman ' + (AMA[S.temas[0]] || S.temas[0]) + '.'); }; } }; };

// ¿Qué piensan de ti?: tus amigos responden con su voz; primero escuchas, después ves quién fue.
const FC = ['#C7B8FF', '#FF8E9E', '#7CC8FF', '#9FE3B0', '#FFB061'];
const LQ = ['¿Qué fue lo primero que pensaste de mí?', '¿Qué hago que nadie más hace?', '¿En qué canción me ves?', '¿Qué crees que no me animo a hacer?', '¿Qué película te recuerda a mí?', '¿Qué es lo que más te gusta de hablar conmigo?', '¿A qué lugar de Lima me llevarías?', '¿Qué consejo me darías hoy?', '¿Qué te imaginas que hago un domingo?', '¿Cuál es tu recuerdo favorito conmigo?', '¿Qué superpoder crees que tengo?', '¿Qué plato pedirías por mí?', '¿Qué me dirías si fuera mi cumpleaños?', '¿Qué debería animarme a hacer este año?', '¿Cómo me describirías en tres palabras?', '¿Qué canción pondrías en mi viaje?'];
R.lecturas = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">¿Qué piensan de ti?</h1>
  <p class="sub mt1">Tus amigos te responden con su voz. Primero escuchas y después ves quién fue.</p>
  <div class="lcards mt3">${S.lec.map((l, i) => `<button class="lcard" data-go="lectura" data-p='{"i":${i}}'><b>${esc(l.q)}</b><span class="lfoot">${l.ans.length ? `<span class="faces">${l.ans.map((a, j) => voiceMark('sm', PK[a[0]] ? PK[a[0]][1] : fakePeaks(j), [FC[j % 5], FC[(j + 1) % 5], FC[(j + 2) % 5]])).join('')}</span><span class="cap">${n_(l.ans.length, 'voz', 'voces')} por escuchar</span>` : '<span class="cap">Todavía nadie responde. Te avisamos cuando alguien lo haga.</span>'}</span></button>`).join('')}</div>
  <p class="eyebrow">Otras preguntas para tus amigos</p>
  <div class="row-btns">${nextIdeas('lq', LQ.filter(q => !S.lec.some(l => l.q === q)), 3).map(q => `<button class="idea" data-go="lecnueva" data-p='${JSON.stringify({ q }).replace(/'/g, '&#39;')}'>${esc(q)}</button>`).join('')}</div>
  <div class="grow"></div>
  <button class="btn btn-a mt3" data-go="lecnueva">${I.mic}Grabar una pregunta</button>` });
R.lecnueva = ({ q: q0 } = {}) => { let q = LQ.includes(q0) ? q0 : null; const Q = [...(q ? [q] : []), ...nextIdeas('lqn', LQ.filter(x => x !== q), q ? 3 : 4)]; q = q || Q[0];
  return { html: `
  ${back('lecturas')}
  <p class="eyebrow" style="margin-top:4px">Elige la pregunta</p>
  <div class="row-btns" id="qs">${Q.map(t => `<button class="idea" aria-pressed="${t === q}">${t}</button>`).join('')}</div>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`,
  bind(el) { $$('#qs .idea', el).forEach(b => b.onclick = () => { q = b.textContent; $$('#qs .idea', el).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    recUI(el, 'Desliza para crear el enlace', () => { S.lec.unshift({ q, ans: [] }); saveX(); go('lecturas');
      sheet(`<h2 class="title">Mándalo a tus amigos</h2><p class="sub">Responden sin cuenta, solo con su voz.</p><div class="inp mt2" style="display:flex;align-items:center;color:var(--fg-2);font-size:14px">botella-app.vercel.app/l/TU-LECTURA</div><div class="row-btns mt2"><button class="btn btn-a" id="cp">Copiar enlace</button></div>`, (s, close) => $('#cp', s).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); close(); toast('Enlace copiado'); }); }, '<p class="cap center" style="margin:0 0 6px">Grábala con tu voz</p>'); } }; };
R.lectura = ({ i = 0 }) => { const l = S.lec[i] || S.lec[0]; return { cls: 'pin', html: `
  ${back('lecturas')}
  <h1 class="title mt1">${esc(l.q)}</h1>
  ${l.ans.length ? `<p class="sub mt1">Escucha primero. Después ves quién fue.</p>
  <div class="row-btns mt3">${l.ans.map(([v, who], j) => `<div class="paper lec" style="padding:14px 16px" data-j="${j}">${player(v, { real: true })}<button class="reveal" disabled>Escúchala para ver quién fue</button><b class="who-is" hidden>${esc(who)}</b></div>`).join('')}</div>`
  : '<p class="sub mt1">Todavía nadie responde. Cuando alguien lo haga, te avisamos.</p>'}`,
  bind(el) { $$('.lec', el).forEach(c => { const r = $('.reveal', c); $('.player', c).addEventListener('click', () => { r.disabled = false; r.textContent = '¿Quién fue?'; }); r.onclick = () => { r.hidden = true; $('.who-is', c).hidden = false; }; }); } }; };

// Botella para dos: grabas tu mitad, un amigo graba la suya y sale al mar con las dos voces.
R.dos = () => { const d = S.duo; return d ? { html: `
  ${back()}
  <h1 class="title mt1">Botella para dos</h1>
  <p class="sub mt1">${d.friend ? 'Ya están las dos voces. Lánzala.' : 'Falta la voz de tu amigo. Cuando la grabe, te avisamos.'}</p>
  <div class="row-btns mt3">
    <div class="pair sm"><span class="pb1">${voiceBottle(myColors()[0], myPk())}<small>Tu voz</small></span><span class="plus">+</span><span class="pb2${d.friend ? '' : ' wait'}">${voiceBottle('#7CC8FF')}<small>${d.friend ? 'Su voz' : 'Esperando'}</small></span></div>
    <div class="half"><p class="cap">Tu mitad</p>${player(d.url || 'mine' + d.secs, { mine: true, secs: d.secs })}</div>
    <div class="half${d.friend ? '' : ' wait'}"><p class="cap">Su mitad</p>${d.friend ? player('majo-reply') : '<span class="typing"><i></i><i></i><i></i></span>'}</div>
  </div>
  <div class="grow"></div>
  ${d.friend ? '<div class="slide mt3" id="sl"></div>' : `<button class="btn btn-a mt3" id="share">Mandar el enlace otra vez</button><button class="btn btn-q" id="sim">Ver cómo queda cuando responda</button>`}
  <button class="btn btn-q" id="del">Empezar de nuevo</button>`,
  bind(el) { const sl = $('#sl', el); sl && slider(sl, 'Desliza al mar', () => { S.mine = { kind: 'Historia', tema: S.temas[0], idea: 'Botella para dos', heard: 0 }; S.sent.unshift({ ...S.mine, ans: 0, when: 'Ahora' }); S.duo = null; saveX(); track('botella_lanzada', { duo: true }); go('lanzada'); });
    $('#share', el) && ($('#share', el).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); toast('Enlace copiado'); });
    $('#sim', el) && ($('#sim', el).onclick = () => { d.friend = true; saveX(); go('dos', { nohash: true }); });
    $('#del', el).onclick = () => { S.duo = null; saveX(); go('dos', { nohash: true }); }; } }
  : { html: `
  ${back()}
  <h1 class="title mt1">Botella para dos</h1>
  <div class="pair mt3"><span class="pb1">${voiceBottle(myColors()[0], myPk())}<small>Tu voz</small></span><span class="plus">+</span><span class="pb2">${voiceBottle('#7CC8FF')}<small>La de tu amigo</small></span></div>
  <ol class="dsteps mt3"><li><b>1</b>Grabas tu mitad</li><li><b>2</b>Tu amigo graba la suya</li><li><b>3</b>Sale al mar con las dos voces</li></ol>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`,
  bind(el) { recUI(el, 'Desliza para invitar', r => { S.duo = { url: r.url, secs: r.secs, friend: false }; saveX(); go('dos'); toast('Enlace copiado. Mándaselo a tu amigo.'); }); } }; };

// ---------- arranque ----------
const start = () => { const h = location.hash.slice(1); go(R[h] ? h : (store.get('onb') ? 'mar' : 'bienvenida')); };
if (window.Mar) start(); else { let started = false; const s = () => { if (!started) { started = true; start(); } }; addEventListener('mar-ready', s, { once: true }); setTimeout(() => { if (!window.Mar) document.documentElement.classList.add("no3d"); s(); }, 2500); }
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (R[h] && h !== curName) go(h, { nohash: true }); });
window.__go = go;
}
