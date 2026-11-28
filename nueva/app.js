// Botella · nueva. Prototipo navegable con datos de ejemplo. Una pantalla = una cosa.
{
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app'), tabs = $('#tabs'), sheetRoot = $('#sheet-root');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Telemetría (plan en docs/ux-discovery): se guarda local; al conectar Supabase se envía a una tabla de eventos.
addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__bip = e; });
const track = (ev, props = {}) => { try { const k = 'bn.ev', a = JSON.parse(localStorage.getItem(k) || '[]'); a.push({ ev, t: Date.now(), ...props }); localStorage.setItem(k, JSON.stringify(a.slice(-500))); } catch (e) {} };
(() => { try { const l = +localStorage.getItem('bn.last') || 0, now = Date.now(); track('sesion_iniciada', { dias_desde_ultima: l ? Math.floor((now - l) / 864e5) : null }); localStorage.setItem('bn.last', now); } catch (e) {} })();
const AUD = (() => { const mem = {}; let dbp;
  const db = () => dbp || (dbp = new Promise((ok, ko) => { try { const q = indexedDB.open('bn-voz', 1); q.onupgradeneeded = () => q.result.createObjectStore('a'); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); } catch (e) { ko(e); } }));
  const tx = (m, f) => db().then(d => new Promise((ok, ko) => { const t = d.transaction('a', m), r = f(t.objectStore('a')); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }));
  return {
    async put(blob) { const k = 'idb:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); mem[k] = URL.createObjectURL(blob); try { await tx('readwrite', st => st.put(blob, k)); } catch (e) {} return k; },
    now: k => mem[k] || null,
    async url(k) { if (mem[k]) return mem[k]; try { const b = await tx('readonly', st => st.get(k)); if (b) return mem[k] = URL.createObjectURL(b); } catch (e) {} return null; },
    // al abrir la app se cargan todas, para que el play responda al instante
    warm() { return tx('readonly', st => st.getAllKeys()).then(ks => Promise.all((ks || []).map(k => this.url(k)))).catch(() => {}); },
    wipe() { try { indexedDB.deleteDatabase('bn-voz'); } catch (e) {} } }; })();
AUD.warm();
const store = { get(k, d) { try { const v = localStorage.getItem('bn.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bn.' + k, JSON.stringify(v)); } catch (e) {} } };

// ---------- datos de ejemplo (voces sintéticas) ----------
const PK = {"answer-3":[8,[0.56,0.69,0.44,1.0,0.81,0.53,0.78,0.53,0.63,0.62,0.17,0.69,0.91,0.75,0.64,0.9,0.91,0.25,0.98,0.74,0.57,0.57,0.93,0.54,0.74,0.59,0.51,0.55]],"majo-reply":[12,[0.58,0.71,0.41,0.62,0.58,0.99,0.6,0.61,0.59,0.65,0.71,0.73,0.58,0.84,0.56,0.4,0.43,0.37,0.37,0.85,0.36,0.79,0.56,0.29,1.0,0.7,0.52,0.13]],"majo-call":[8,[0.54,0.66,0.66,0.91,0.62,0.57,0.37,0.78,0.47,0.66,0.38,0.37,0.25,0.74,0.86,0.84,0.77,0.79,0.47,0.7,0.8,1.0,0.64,0.44,0.51,0.41,0.29,0.12]],"caro-reply":[7,[0.7,0.69,0.54,0.74,0.71,0.59,0.71,0.49,0.69,1.0,0.7,0.44,0.52,0.8,0.57,0.71,0.71,0.53,0.58,0.49,0.86,0.47,0.48,0.69,0.53,0.73,0.53,0.28]],"caro-call":[5,[0.52,0.48,0.17,0.65,1.0,0.56,0.52,0.52,0.52,0.88,0.61,0.56,0.57,0.63,0.72,0.7,0.46,0.62,0.34,0.64,0.77,0.56,0.61,0.93,0.81,0.39,0.74,0.22]],"ivan-call":[8,[0.53,0.56,0.43,0.68,0.55,0.8,0.73,0.63,0.71,0.72,0.57,0.72,0.88,0.56,0.73,0.5,0.83,0.63,0.76,0.85,0.71,1.0,0.84,0.86,0.99,0.63,0.55,0.6]],"belen-reply":[8,[0.67,0.48,0.54,0.65,0.4,0.61,0.49,0.59,0.58,0.66,0.48,0.8,0.74,0.48,0.93,0.8,0.64,0.73,0.62,0.32,0.82,0.91,0.73,0.55,1.0,0.59,0.62,0.45]],"belen-call":[6,[0.53,0.45,0.28,0.9,0.88,0.54,0.56,0.97,0.56,0.12,0.55,1.0,0.52,0.64,0.66,0.71,0.63,0.91,0.58,0.68,0.72,0.59,0.69,0.75,0.79,0.68,0.64,0.41]],"majo-say":[14,[1.0,0.48,0.77,0.57,0.82,0.74,0.67,0.41,0.35,0.91,0.76,0.58,0.92,0.51,0.68,0.28,0.88,0.57,0.71,0.74,0.53,0.33,0.89,0.5,0.38,0.86,1.0,0.48]],"leo-say":[13,[0.67,0.42,0.32,0.41,1.0,0.48,0.49,0.29,0.59,0.6,0.53,0.39,0.4,0.16,0.6,0.49,0.4,0.39,0.44,0.41,0.67,0.55,0.61,0.52,0.4,0.3,0.42,0.18]],"ivan-say":[14,[0.82,0.91,0.74,0.68,0.67,0.86,0.81,1.0,0.89,0.71,0.58,0.86,0.65,0.91,0.62,0.63,0.74,0.73,0.89,0.71,0.73,0.74,0.79,0.69,0.87,0.8,0.69,0.74]],"caro-say":[13,[0.71,0.79,0.58,0.79,0.67,0.66,0.88,0.59,0.59,0.9,0.84,0.64,0.86,0.74,0.69,1.0,0.63,0.8,1.0,0.69,0.87,0.91,0.74,0.74,0.81,0.89,0.59,0.7]],"belen-say":[17,[0.62,0.6,0.83,0.63,0.52,0.56,0.56,0.58,0.7,0.64,0.59,0.57,0.71,0.7,0.48,0.74,0.55,0.67,0.58,0.52,0.71,0.62,0.66,0.82,0.73,0.62,0.61,1.0]],"leo-reply":[9,[0.77,1.0,0.44,0.52,0.52,0.6,0.32,0.28,0.79,0.72,0.29,0.15,0.91,0.62,0.48,0.87,0.74,0.51,0.67,0.64,0.56,0.44,0.38,0.4,0.48,0.37,0.32,0.12]],"leo-call":[8,[0.45,0.85,0.32,0.69,0.85,1.0,0.48,0.3,0.87,0.5,0.92,0.72,0.76,0.56,0.57,0.25,0.12,0.82,0.83,0.66,0.14,0.12,0.9,0.92,0.68,0.75,0.52,0.15]],"answer-1":[12,[1.0,0.54,0.49,0.54,0.47,0.57,0.61,0.55,0.63,0.5,0.6,0.53,0.63,0.64,0.58,0.46,0.51,0.45,0.49,0.58,0.46,0.74,0.57,0.59,0.42,0.61,0.62,0.46]],"answer-2":[9,[0.87,0.79,0.55,0.46,0.5,0.16,0.81,0.75,0.65,0.79,0.47,0.43,0.29,0.77,0.96,0.64,0.7,0.5,0.38,0.12,0.52,1.0,0.5,0.47,0.79,0.87,0.35,0.17]],"ivan-reply":[10,[0.97,0.85,1.0,0.8,0.8,0.63,0.72,0.69,0.65,0.57,0.92,0.63,0.84,0.83,0.41,0.89,0.79,0.65,0.71,0.8,0.84,0.75,0.76,0.76,0.65,0.64,0.69,0.71]]};
const B = {
  majo: { theme: 'la música', tag: 'Música', name: 'Majo', kind: 'Pregunta', q: '¿Qué harías un domingo si nadie en esta ciudad te conociera?', v: 'majo-say', c: '#FF70A9' },
  caro: { theme: 'la ciudad', tag: 'La ciudad', name: 'Caro', kind: 'Pregunta', q: '¿Cuál es el mejor atardecer que has visto en Lima?', v: 'caro-say', c: '#FFB061', gold: true },
  ivan: { theme: 'la música', tag: 'Música', name: 'Iván', kind: 'Pregunta', q: '¿Qué canción te devuelve a tus 15 años?', v: 'ivan-say', c: '#FF70A9' },
  leo: { theme: 'el cine', tag: 'Cine', kind: 'Confesión', q: 'Me mudé a Lima hace tres meses y todavía no tengo con quién ir al cine.', v: 'leo-say', c: '#8E8CFF', name: 'Leo' },
  belen: { theme: 'los libros', tag: 'Libros', kind: 'Historia', q: 'El día que me perdí en el Centro y terminó siendo lo mejor.', v: 'belen-say', c: '#9FE3B0', name: 'Belén' }
};
const TEMAS = ['Música', 'Cine', 'Libros', 'Comida', 'Viajes', 'La ciudad', 'Fútbol', 'Arte', 'Tecnología', 'Filosofía', 'Amor', 'Trabajo'];
const TC = { 'Música': '#FF70A9', 'Cine': '#8E8CFF', 'Libros': '#9FE3B0', 'Comida': '#FF9F7A', 'Viajes': '#7CC8FF', 'La ciudad': '#FFB061', 'Fútbol': '#9BE38B', 'Arte': '#F59BD5', 'Tecnología': '#7FD8C9', 'Filosofía': '#C7B8FF', 'Amor': '#FF8E9E', 'Trabajo': '#A9BCCB' };
const tc = t => (typeof TC !== 'undefined' && TC[t]) || '#7FD8C9';
// El color de cada botella es el de su tema (como en la pixel). Solo la dorada tiene color propio.
Object.values(B).forEach(b => { if (b.tag) b.c = tc(b.tag); });
// El tipo de botella (normal, llega lejos, dorada, de regalo). Las especiales tienen vidrio propio (SPC).
const corkOf = x => x ? (x.gold || x.dorada ? 'tide' : x.far ? 'far' : x.gift ? 'gift' : '') : '';
const PRECIO = { '': 'S/ 0.90', far: 'S/ 3.90', tide: 'S/ 5.90', gift: 'S/ 2.90' };
const precio = k => `<span class="price"><s>${PRECIO[k]}</s><b>Gratis</b></span>`;
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
// Tipos de botella: la misma definición en la versión pixel y en el servidor (launch_bottle). Ninguna se paga: todas se ganan.
// Toda botella sigue llegando a más gente hasta que alguien responde; el tipo solo cambia con cuánta gente empieza y dónde se ve.
const TIPO = {
  '': ['Normal', 'Empieza con 12 personas que aman tu tema', 12],
  far: ['Que llega lejos', 'Empieza con 30 personas, también de temas cercanos', 30],
  tide: ['Dorada', 'Además sale en Botellas doradas, donde cualquiera puede abrirla', 12]
};
const GANA = {
  far: 'La ganas al terminar tu primer día y a los 10 días seguidos.',
  tide: 'La ganas a los 2 días seguidos y cada lunes, si esa semana respondiste a alguien.',
  gift: 'La ganas a los 5 y a los 21 días seguidos.'
};
const baseOf = x => x.far ? 30 : x.duo ? 20 : 12;
const reachOf = x => x ? (x.reached || baseOf(x) + (x.heard || 0) * 3) : 0;
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
I.micoff = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16"/></svg>';
I.speaker = '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
I.logo = '<svg class="logo" viewBox="0 0 24 32" aria-hidden="true"><path d="M9.2 2.5h5.6M9.8 2.5v5.2C9.8 9.6 5 11.3 5 15.8v10.4A3.3 3.3 0 0 0 8.3 29.5h7.4a3.3 3.3 0 0 0 3.3-3.3V15.8c0-4.5-4.8-6.2-4.8-8.1V2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.6 21.5v-1.6M10.6 23.4v-5.4M12.6 24.6v-7.8M14.6 22.8v-4.2M16.4 21.2v-1" stroke="#7FD8C9" stroke-width="1.6" stroke-linecap="round"/></svg>';
I.reel = '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 7.5h6"/></svg>';
I.sea = '<svg viewBox="0 0 24 24"><path d="M5 8.5v-2l1-1.5v-1h2v1l1 1.5v2M15 13.5v-2l1-1.5v-1h2v1l1 1.5v2M6 8.5h2v3H6zM16 13.5h2v3h-2z"/><path d="M3 19c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/></svg>';
I.shuffle = '<svg viewBox="0 0 24 24"><path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 3.8c1.1 1.6 2.3 2.6 4.3 2.6H21M17.5 13.5 21 17l-3.5 3.5M3 17h3.5c1.3 0 2.2-.4 3-1.2M13.2 8.2c.8-.8 1.8-1.2 3.3-1.2H21M17.5 3.5 21 7l-3.5 3.5"/></svg>';
let bn = 0;
const CORKH = { far: '<path d="M104 18h6l8 7-8 7h-6z" fill="#4FB3E8"/>', tide: '<rect x="104" y="18" width="10" height="14" rx="2" fill="#F5B82E"/><path d="M114 18l5 3-3 4 3 4-5 3z" fill="#FFD447"/>', gift: '<rect x="104" y="18" width="10" height="14" rx="2" fill="#E8455B"/><path d="M113 25l7-7v14z" fill="#FF7A8E"/>' };
// Las especiales tienen vidrio propio, con colores que ningún tema usa.
const SPC = { far: '#00E1FF', tide: '#FFC24B', gift: '#E4ECF4' };
const bottleSVG = (c, cork) => { if (SPC[cork]) c = SPC[cork]; const id = 'g' + (bn++); return `<svg class="bt" viewBox="0 0 120 50" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".55" stop-color="${c}" stop-opacity=".14"/><stop offset="1" stop-color="${c}" stop-opacity=".38"/></linearGradient></defs><path d="M14 6h52c8 0 12 6 18 10h20v18H84c-6 4-10 10-18 10H14C8 44 4 40 4 34V16C4 10 8 6 14 6Z" fill="url(#${id})" stroke="${c}" stroke-opacity=".85" stroke-width="1.6"/><rect x="14" y="17.5" width="46" height="15" rx="7.5" fill="#F3E6C8"/><rect x="104" y="18" width="10" height="14" rx="2" fill="#8A5A33"/><path d="M15 11.5h44" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/></svg>`; };
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
  const src = v.startsWith('blob:') || v.startsWith('idb:') ? v : (PK[v] && (!v.startsWith('answer') || p.dataset.r) ? `v/${v}.mp3` : null);
  const fake = () => { if (curP !== p || fakeT) return; let t = 0; fakeT = setInterval(() => { t += .1; paint(p, t / s); p.querySelector('.t').textContent = fmt(t); if (t >= s) stopAudio(); }, 100); };
  const real = src && src.startsWith('idb:') ? AUD.now(src) : src;
  if (src && !real && !window.__noAudio) AUD.url(src).then(u => { if (curP !== p) return; if (!u) return fake(); audio.src = u; audio.play().catch(fake); });
  else if (real && !window.__noAudio) { audio.src = real; audio.play().catch(e => { if (e && e.name !== 'AbortError') fake(); }); audio.onerror = fake; audio.ontimeupdate = () => { if (curP !== p) return; paint(p, audio.currentTime / (audio.duration || s)); p.querySelector('.t').textContent = fmt(audio.currentTime); }; audio.onended = () => curP === p && stopAudio(); }
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
    stop() { cancelAnimationFrame(raf); const secs = (performance.now() - t0) / 1000; return new Promise(res => { if (sim || !mr) return res({ secs, url: null }); mr.onstop = async () => { stream.getTracks().forEach(t => t.stop()); url = await AUD.put(new Blob(chunks, { type: mr.mimeType })); res({ secs, url }); }; mr.stop(); }); }
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
let killSheet = null;
function sheet(html, bind) {
  killSheet && killSheet();
  sheetRoot.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  let close = () => { const s = $('.sheet', sheetRoot), c = $('.scrim', sheetRoot); if (!s) return; s.classList.add('out'); c.classList.add('out'); setTimeout(() => sheetRoot.innerHTML = '', 200); };
  const prev = document.activeElement, sh = $('.sheet', sheetRoot); sh.tabIndex = -1;
  const key = e => { if (e.key === 'Escape') { close(); } else if (e.key === 'Tab') { const f = $$('button,input,select,a[href]', sh); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } };
  document.addEventListener('keydown', key); const shut = close; close = () => { document.removeEventListener('keydown', key); killSheet = null; shut(); if (prev && prev.focus) prev.focus(); };
  killSheet = () => { document.removeEventListener('keydown', key); killSheet = null; sheetRoot.innerHTML = ''; };
  setTimeout(() => ($('button,input', sh) || sh).focus(), 30);
  $('.scrim', sheetRoot).onclick = close; $$('[data-close]', sheetRoot).forEach(b => b.onclick = close);
  bind && bind($('.sheet', sheetRoot), close);
}
let tt; function toast(t, c = '#7FD8C9', undo) { $$('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = `<i class="orb" style="background:${c}"></i>${esc(t)}${undo ? '<button class="undo">Deshacer</button>' : ''}`; document.body.append(d); const bye = () => { d.classList.add('out'); setTimeout(() => d.remove(), 220); }; if (undo) $('.undo', d).onclick = () => { clearTimeout(tt); bye(); undo(); }; clearTimeout(tt); tt = setTimeout(bye, undo ? 5000 : 2600); }

// ---------- navegación ----------
const R = {}; let cur = null, curName = '', curPar = {};
const TABBED = { mar: 'mar', charlas: 'charlas' };
function go(name, p = {}) {
  if (!R[name]) name = 'mar';
  stopAudio(); killSheet && killSheet(); const old = cur;
  const el = document.createElement('section'); el.className = 'scr enter'; el.dataset.s = name;
  const r = R[name](p); el.innerHTML = r.html; if (r.cls) el.className += ' ' + r.cls;
  app.append(el); cur = el; curName = name; curPar = p; window.__snap = null;
  if (old) { old.classList.add('leave'); setTimeout(() => old.remove(), 190); }
  tabs.hidden = !TABBED[name]; $$('.tab', tabs).forEach(t => t.dataset.go === TABBED[name] ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'));
  $('#unread').hidden = !Object.values(S.convs).some(c => c.unread);
  window.Mar && Mar.set(r.mar || 'off');
  $$('[data-go]', el).forEach(b => b.addEventListener('click', () => go(b.dataset.go, b.dataset.p ? JSON.parse(b.dataset.p) : {})));
  r.bind && r.bind(el);
  $$('.cnt[data-n]', el).forEach(b => { const n = +b.dataset.n, t0 = performance.now(); if (!n || matchMedia('(prefers-reduced-motion: reduce)').matches) return; b.textContent = '0'; const f = t => { const q = Math.min(1, (t - t0) / 900); b.textContent = Math.round(n * (1 - Math.pow(1 - q, 3))); if (q < 1 && document.body.contains(b)) requestAnimationFrame(f); }; requestAnimationFrame(f); });
  if (location.hash.slice(1) !== name && !p.nohash) history.replaceState(null, '', '#' + name);
  const { nohash, ...keep } = p; store.set('route', { n: name, p: keep });
}
const snap = () => { try { window.__snap && window.__snap(); } catch (e) {} };
addEventListener('pagehide', snap); document.addEventListener('visibilitychange', () => document.hidden && snap());
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
// Foto viva: sobre una imagen fija se animan solo las luces (olas bioluminiscentes, estrellas, brillo de la luna y la luz dentro de la botella).
// Las posiciones van en fracciones de la imagen; se recalculan con background-size: cover anclado arriba.
const CINE = {
  hero: { src: 'img/hero.jpg', w: 864, h: 1536, glow: [0.46, 0.39, 0.13], band: [0.23, 0.37], moon: [0.81, 0.105], stars: 0.2 },
  abrir: { src: 'img/abrir.jpg', w: 864, h: 1536, glow: [0.44, 0.35, 0.12], band: [0.22, 0.44], moon: [0.81, 0.085], stars: 0.19 },
  lanzada: { src: 'img/lanzada.jpg', w: 864, h: 1536, glow: [0.385, 0.355, 0.05], band: [0.36, 0.6], bandX: [0.22, 0.6], moon: [0.585, 0.205], stars: 0.22 },
  web: { src: 'img/hero-cine.jpg', w: 1536, h: 864, glow: [0.72, 0.68, 0.09], band: [0.4, 0.66], moon: [0.84, 0.13], stars: 0.35, pos: 'center' }
};
// Teñir la foto: solo cambia el turquesa (botella, olas que brillan) al color de la botella; el cielo y la arena quedan igual.
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const tintCache = {};
const tintPhoto = (src, hex) => tintCache[src + hex] || (tintCache[src + hex] = new Promise(ok => { const im = new Image(); im.onload = () => {
  try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data, [tr, tg, tb] = hexRgb(hex);
  const tmx = Math.max(tr, tg, tb) / 255, tmn = Math.min(tr, tg, tb) / 255; let th = 0; { const r = tr / 255, g = tg / 255, b = tb / 255, dd = tmx - tmn; if (dd) th = tmx === r ? ((g - b) / dd) % 6 : tmx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; th *= 60; if (th < 0) th += 360; }
  const ts = tmx ? (tmx - tmn) / tmx : 0;
  for (let i = 0; i < a.length; i += 4) { const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn; if (!dl || mx < .08) continue;
    let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h *= 60; if (h < 0) h += 360; const sat = dl / mx;
    // peso: turquesa puro (175°) pesa 1; se apaga hacia 150° y 200° (el azul de la noche queda fuera)
    const w = Math.min(1, Math.max(0, 1 - Math.abs(h - 176) / 28) * 2) * Math.min(1, Math.max(0, dl - .04) * 6); if (w < .02) continue;
    // el color nuevo se calcula entero y se mezcla con el original (así no aparecen tonos intermedios como el verde)
    const ns = Math.min(sat, ts * .85), v = mx, cc = v * ns, X = cc * (1 - Math.abs((th / 60) % 2 - 1)), m = v - cc, k = Math.floor(th / 60) % 6;
    const [R, G, Bb] = [[cc, X, 0], [X, cc, 0], [0, cc, X], [0, X, cc], [X, 0, cc], [cc, 0, X]][k]; a[i] = a[i] * (1 - w) + (R + m) * 255 * w; a[i + 1] = a[i + 1] * (1 - w) + (G + m) * 255 * w; a[i + 2] = a[i + 2] * (1 - w) + (Bb + m) * 255 * w; }
  x.putImageData(d, 0, 0); c.toBlob(b => ok(b ? URL.createObjectURL(b) : src), 'image/jpeg', .9); } catch (e) { ok(src); } }; im.onerror = () => ok(src); im.src = src; }));
const cineLive = (host, key, tint) => {
  const C = CINE[key], cv = document.createElement('canvas'), cx = cv.getContext('2d'); cv.className = 'cinecv'; host.appendChild(cv);
  const glowRgb = tint ? hexRgb(tint).join(',') : '127,216,201', sparkRgb = tint ? hexRgb(tint).map(v => Math.min(255, v + 30)).join(',') : '127,232,214';
  if (tint) { host.style.opacity = 0; tintPhoto(C.src, tint).then(u => { host.style.backgroundImage = `url(${u})`; host.style.opacity = ''; }); } else host.style.backgroundImage = `url(${C.src})`; if (C.pos) host.style.backgroundPosition = C.pos;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches; let raf = 0, P = [], S = [], G = [], boost = 0, flash = 0, W = 0, H = 0, sc = 1, ox = 0, oy = 0;
  const map = (fx, fy) => [ox + fx * C.w * sc, oy + fy * C.h * sc];
  const size = () => { const r = Math.min(devicePixelRatio || 1, 2); W = host.clientWidth; H = host.clientHeight; if (!W) return; cv.width = W * r; cv.height = H * r; cx.setTransform(r, 0, 0, r, 0, 0);
    sc = Math.max(W / C.w, H / C.h); ox = (W - C.w * sc) / 2; oy = C.pos === 'center' ? (H - C.h * sc) / 2 : 0;
    const bx = C.bandX || [0, 1], rnd = (a, b) => a + Math.random() * (b - a);
    P = Array.from({ length: Math.round(W * (C.band[1] - C.band[0]) * C.h * sc / 900) + 40 }, () => ({ fx: rnd(bx[0], bx[1]), fy: rnd(C.band[0], C.band[1]), p: Math.random() * 6.3, s: .6 + Math.random() * 1.6, z: .6 + Math.random() * 1.8, d: (Math.random() - .5) * .012 }));
    S = Array.from({ length: 70 }, () => ({ fx: Math.random(), fy: Math.random() * C.stars, p: Math.random() * 6.3, s: .3 + Math.random() * .9, z: .4 + Math.random() }));
    G = Array.from({ length: 26 }, () => ({ dx: (Math.random() - .5) * .05, fy: rnd(C.moon[1] + .1, Math.min(C.band[1] + .05, C.moon[1] + .5)), p: Math.random() * 6.3, s: 1 + Math.random() * 2 })); };
  const dot = (x, y, r, col, a) => { const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2); };
  const draw = t => { t /= 1000; cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = 'lighter';
    for (const q of S) { const a = Math.max(0, Math.sin(t * q.s + q.p)) ** 6 * .9; if (a < .03) continue; const [x, y] = map(q.fx, q.fy); dot(x, y, 2.2 * q.z, '235,245,255', a); }
    for (const q of G) { const a = Math.max(0, Math.sin(t * q.s + q.p)) ** 8 * .8; if (a < .03) continue; const [x, y] = map(C.moon[0] + q.dx * (q.fy - C.moon[1]) * 4, q.fy); dot(x, y, 3, '255,236,200', a); }
    for (const q of P) { const a = Math.max(0, Math.sin(t * q.s + q.p)) ** 4 * (.55 + boost * .4); if (a < .03) continue; const [x, y] = map(q.fx + Math.sin(t * .4 + q.p) * q.d, q.fy); dot(x, y, 3.2 * q.z, sparkRgb, a); }
    const [gx, gy] = map(C.glow[0], C.glow[1]), gr = C.glow[2] * C.w * sc, br = .22 + .12 * Math.sin(t * 1.3) + boost * .45 + flash;
    dot(gx, gy, gr * (1 + boost * .5 + flash * 2), glowRgb, Math.min(1, br));
    if (flash > 0) flash = Math.max(0, flash - .012);
    cx.globalCompositeOperation = 'source-over'; };
  const loop = t => { if (!document.body.contains(cv)) return; if (host.clientWidth !== W || host.clientHeight !== H) size(); if (W) draw(t); raf = still ? 0 : requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  return { boost: v => { boost = v; }, flash: () => { flash = .9; } };
};

// Bienvenida: una frase, un botón. (La imagen se rehace en estilo cinematográfico cuando llegue la referencia.)
R.bienvenida = () => ({ cls: 'clear cine', html: `
  <div class="cineimg" aria-hidden="true"></div>
  <div class="top"><span class="wm">${I.logo}botella</span></div>
  <div class="grow"></div>
  <h1 class="display">Aquí te conocen<br><span class="light">primero por tu voz.</span></h1>
  <p class="sub mt2 mb3">Escucha la voz de alguien que ama lo mismo que tú y respóndele con la tuya.</p>
  <div class="row-btns"><button class="btn btn-a" data-go="abrir" data-p='{"id":"majo","first":true}'>Abrir mi primera botella</button>
  <button class="btn btn-q" data-go="entrar">Ya tengo cuenta</button></div>`,
  bind(el) { cineLive($('.cineimg', el), 'hero'); } });

// Los pasos de entrada: los dos primeros ya están hechos cuando llegas a la cuenta (se siente avanzado, porque lo está).
const ONB = ['Escuchar', 'Responder', 'Tu cuenta', 'Tus temas'];
const onbBar = now => `<div class="onbp" aria-label="Paso ${now + 1} de ${ONB.length}">${ONB.map((t, i) => `<span class="${i < now ? 'done' : i === now ? 'now' : ''}"><i></i>${i < now ? I.check : ''}${t}</span>`).join('')}</div>`;

// Abrir: mantener para descorchar → papel crema con la voz.
R.abrir = ({ id = 'majo', first = false, zin = 0 }) => { const b = B[id]; return { cls: 'clear cine' + (zin ? ' zin' : ''), html: `
  <div class="cineimg" aria-hidden="true"></div>
  <div class="top"><button class="ib edge" data-go="${first ? 'bienvenida' : 'mar'}" aria-label="Cerrar">${I.x}</button><span></span><span style="width:44px"></span></div>
  <div class="grow center" id="fallback"></div>
  <div id="stage">
    <p class="center" style="margin:0"><span class="rtag" style="--c:${b.c}"><i></i>${esc(b.tag)}</span></p>
    <p class="head center mt2">Alguien que ama ${esc(b.theme)} te dejó ${b.kind === 'Pregunta' ? 'una pregunta' : b.kind === 'Confesión' ? 'una confesión' : 'una historia'}.</p>
    <div class="mt3"><button class="hold" id="hold" aria-label="Mantén para abrir"><svg class="r" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/></svg><svg class="ico" viewBox="0 0 24 24"><path d="M9 3h6v4H9zM10 7v3l-3 3v7.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5V13l-3-3V7"/></svg></button></div>
    <p class="cap center mt2">Mantén para abrir</p>
  </div>`,
  bind(el) {
    const live = cineLive($('.cineimg', el), 'abrir', b.c); el.style.setProperty('--a', b.c);
    const h = $('#hold', el), ring = $('circle', h); let t0 = 0, raf, done = false;
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 900); ring.style.strokeDashoffset = 295 * (1 - p); live.boost(p); el.style.setProperty('--u', p.toFixed(3)); if (p >= 1) return open(); raf = requestAnimationFrame(tick); };
    const down = e => { if (done) return; e.preventDefault(); t0 = performance.now(); tick(); };
    const up = () => { if (done) return; cancelAnimationFrame(raf); ring.style.transition = 'stroke-dashoffset .3s'; ring.style.strokeDashoffset = 295; setTimeout(() => ring.style.transition = '', 300); live.boost(0); };
    h.addEventListener('pointerdown', down); h.addEventListener('pointerup', up); h.addEventListener('pointerleave', up);
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    function open() {
      done = true; track('botella_escuchada', { id, first }); navigator.vibrate && navigator.vibrate(12); el.classList.add('opened'); live.flash(); live.boost(0); popSound();
      let c = .7; const pop = () => { c = Math.min(1, c + .03); window.Mar && Mar.uncork(c); if (c < 1) requestAnimationFrame(pop); }; pop();
      $('#stage', el).innerHTML = `<article class="paper in" style="--c:${b.c}"><p class="who"><i class="orb" style="background:${b.c}"></i>Alguien que ama ${esc(b.theme)} · ${esc(b.kind)}</p><p class="q">${esc(b.q)}</p>${player(b.v)}</article>
        <div class="row-btns mt2"><button class="btn btn-a" id="reply">${I.mic}Responder con mi voz</button><button class="btn btn-q" id="pass">Devolverla al mar</button></div>`;
      $('#reply', el).onclick = () => go('grabar', { id, first });
      $('#pass', el).onclick = () => { const before = [...S.shore]; S.shore = S.shore.filter(x => x !== id); save(); first ? go('cuenta') : (go('mar'), toast('Volvió al mar. Le llegará a otra persona.', '#7FD8C9', () => { S.shore = before; save(); go('mar'); })); };
      if (first) setTimeout(() => $('.player', el) && $('.player', el).click(), 500);
    }
  } }; };

// Grabar una respuesta.
R.grabar = ({ id = 'majo', first = false }) => { const b = B[id]; return { cls: 'nightbg', html: `
  <div class="top"><button class="ib edge" id="x" aria-label="Cerrar">${I.x}</button><span class="cap">Tu respuesta</span><span style="width:44px"></span></div>
  <div class="ficha"><p class="q" style="margin:0">${esc(b.q)}</p></div>
  <div class="grow"></div>
  <div class="rec-wrap" id="rw"></div>
  <div class="grow"></div>
  <div id="after"></div>`,
  bind(el) {
    $('#x', el).onclick = () => go(first ? 'abrir' : 'mar', { id, first });
    recUI(el, 'Desliza para enviar', r => { track('respuesta_enviada', { id, first, segundos: r.secs });
      if (first) { store.set('pending', { id, secs: r.secs, url: r.url }); go('cuenta'); }
      else { S.shore = S.shore.filter(x => x !== id); S.convs[id] = { stage: 0, when: 'Ahora', msgs: [{ f: 'them', v: b.v }, { f: 'me', v: r.url || 'mine', s: r.secs }] }; save(); go('mar'); toast('Enviada. Te avisamos cuando responda.'); }
    });
  } }; };

// Bloque de grabación compartido: micrófono → onda en vivo → escuchar → deslizar.
// Tu presentación: tu voz en vez de foto. Se abre junto con el nombre, cuando los dos deciden compartirlo.
R.presentacion = () => { const p = S.intro; return { cls: 'nightbg', html: `
  ${back('perfil')}
  <h1 class="title mt1">Tu presentación</h1>
  <p class="sub mt1">Tu voz en vez de una foto. Solo la escucha quien comparte su nombre contigo.</p>
  <p class="tipline mt2">${I.mic}Una idea: tu apodo y algo que te guste. Unos 15 segundos bastan.</p>
  ${p ? `<div class="half mt3"><p class="cap">La que tienes ahora</p>${player(p.url || 'mine' + p.secs, { mine: true, secs: p.secs })}</div>` : ''}
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`,
  bind(el) { recUI(el, 'Desliza para guardarla', r => { S.intro = { url: r.url, secs: r.secs }; saveX(); track('presentacion_grabada', { segundos: r.secs }); go('perfil'); toast('Presentación guardada'); }); } }; };

function recUI(el, slideLabel, onSend, hintTop = '') {
  const rw = $('#rw', el), after = $('#after', el); let rec = null;
  const idle = () => { rw.innerHTML = `${hintTop}<button class="mic" id="mic" aria-label="Grabar">${I.mic}</button><p class="cap">Toca para grabar · hasta 60 s</p>`; after.innerHTML = ''; $('#mic', el).onclick = start; };
  const start = async () => {
    rw.innerHTML = `<div class="timer" id="rtm">0:00</div><div class="livewave" id="lw">${'<i></i>'.repeat(28)}</div><button class="mic live" id="mic" aria-label="Terminar"><span class="sq"></span></button><p class="cap">Toca para terminar</p>`;
    const bars = $$('#lw i', el);
    const mic = $('#mic', el); const acc = new Array(28).fill(0); let cnt = 0; rec = recorder((t, lv) => { lv.forEach((v, i) => { if (i < 28) acc[i] += v; }); cnt++; el._pk = acc.map(x => x / Math.max(cnt, 1)); $('#rtm', el).textContent = fmt(t); bars.forEach((b, i) => b.style.height = (4 + (lv[i] || 0) * 40) + 'px'); const a = lv.length ? lv.reduce((x, y) => x + y, 0) / lv.length : 0; mic.style.setProperty('--lv', (1 + Math.min(a, 1) * .14).toFixed(3)); if (t >= 60) stop(); });
    $('#mic', el).onclick = stop; await rec.start();
  };
  const dk = el.dataset.s + JSON.stringify(curPar);
  const stop = async () => {
    if (!rec) return; const r = await rec.stop(); rec = null; show(r); };
  const show = r => { const secs = Math.max(3, Math.round(r.secs)); store.set('draft', { k: dk, url: r.url, secs: r.secs });
    rw.innerHTML = `<div style="width:100%;padding:14px 16px;border-radius:22px;background:rgba(244,239,231,.06)">${player(r.url || 'mine' + secs, { mine: true, secs })}</div><button class="btn btn-q" id="again">Grabar otra vez</button>`;
    $('#again', el).onclick = () => { store.set('draft', null); idle(); };
    after.innerHTML = `<div class="slide" id="sl"></div>`; slider($('#sl', el), slideLabel, () => { const pk = el._pk; if (pk && Math.max(...pk) > .02) { const m = Math.max(...pk); store.set('mypk', pk.map(x => +(x / m).toFixed(2))); } markDay(); store.set('draft', null); onSend({ url: r.url, secs }); });
  };
  const dr = store.get('draft'); if (dr && dr.k === dk && (!dr.url || !dr.url.startsWith('blob:'))) show(dr); else idle();
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
  bind(el) { const fm = $('#f', el), inp = $('#ci', el); fm.noValidate = true; setTimeout(() => inp.focus({ preventScroll: true }), 350); if (f.t !== 'password') inp.oninput = () => store.set('cta', { ...store.get('cta', {}), [f.k]: inp.value });
    $('#bk', el).onclick = () => i ? go('cuenta', { i: i - 1 }) : go(p ? 'grabar' : 'bienvenida', p ? { id: p.id, first: true } : {});
    fm.onsubmit = e => { e.preventDefault(); if (!check(fm)) return; const nv = { ...v, [f.k]: inp.value.trim() }; if (f.t !== 'password') store.set('cta', nv);
      if (!last) return go('cuenta', { i: i + 1 }); S.name = nv.n; save(); store.set('cta', null); track('cuenta_creada', { con_respuesta: !!p }); go('temas'); }; } }; };

// Temas: lo único que se muestra de ti antes del nombre.
R.temas = ({ edit = false } = {}) => { const T = TEMAS; return { html: `
  <div class="top"><button class="ib edge" data-go="${edit ? 'perfil' : 'cuenta'}" data-p='${edit ? '{}' : '{"i":2}'}' aria-label="Atrás">${I.back}</button><span class="cap">${edit ? '' : 'Último paso'}</span><span style="width:44px"></span></div>
  <h1 class="title mt2">${edit ? 'Tus temas' : '¿Qué te mueve?'}</h1>
  <p class="sub mt1 mb3">Elige tres. Tus botellas llegan a quien ama lo mismo.</p>
  <div class="tgrid" id="ch">${T.map((t, i) => `<button class="chip tcard" style="--c:${tc(t)};--d:${i * 28}ms" aria-pressed="${edit && S.temas.includes(t)}"><span class="tw" aria-hidden="true">${[.5, .9, .6, 1, .7, .4].map((h, k) => `<i style="height:${Math.round((h * .6 + .4 * Math.abs(Math.sin(i + k))) * 100)}%"></i>`).join('')}</span><b>${t}</b></button>`).join('')}</div>
  <div class="dsearch mt4"><label class="dlbl" for="dq">¿En qué distrito vives? <span class="lock">${I.lock}Nadie lo ve</span></label>
  <input class="cin dq" id="dq" placeholder="Busca tu distrito" autocomplete="off" value="${esc(store.get('dist', ''))}"><div class="dsug" id="dsug"></div></div>
  <div class="grow"></div>
  <button class="btn btn-a mt3" id="go" ${edit ? '' : 'disabled style="opacity:.4"'}>${edit ? 'Guardar' : 'Entrar al mar'}</button>`,
  bind(el) { const DIST = ['Ate', 'Barranco', 'Breña', 'Callao', 'Chorrillos', 'Comas', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lima Cercado', 'Lince', 'Los Olivos', 'Magdalena', 'Miraflores', 'Pueblo Libre', 'Rímac', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Miguel', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Otro'];
    const dq = $('#dq', el), ds = $('#dsug', el), norm = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    dq.oninput = () => { const q = norm(dq.value.trim()); ds.innerHTML = q && !DIST.includes(dq.value) ? DIST.filter(d => norm(d).includes(q)).slice(0, 4).map(d => `<button type="button" class="dsg">${d}</button>`).join('') : ''; $$('.dsg', ds).forEach(b => b.onclick = () => { dq.value = b.textContent; store.set('dist', dq.value); ds.innerHTML = ''; navigator.vibrate && navigator.vibrate(5); }); };
    const sel = () => $$('.chip[aria-pressed=true]', el).length; $$('.chip', el).forEach(c => c.onclick = () => { if (c.getAttribute('aria-pressed') === 'false' && sel() >= 3) return; c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'false'); const ok = sel() === 3; $('#go', el).disabled = !ok; $('#go', el).style.opacity = ok ? 1 : .4; });
    $('#go', el).onclick = () => { S.temas = $$('.chip[aria-pressed=true]', el).map(c => c.textContent); save(); if (edit) { go('perfil'); toast('Temas guardados'); return; } const p = store.get('pending'); if (p) { const b = B[p.id]; S.shore = S.shore.filter(x => x !== p.id); S.convs[p.id] = { stage: 0, when: 'Ahora', msgs: [{ f: 'them', v: b.v }, { f: 'me', v: p.url || 'answer-1', s: p.secs }] }; store.set('pending', null); save(); } store.set('onb', 1); track('temas_elegidos', { temas: S.temas }); go('mar'); toast(p ? 'Tu voz va en camino. Te avisamos cuando te responda.' : 'Bienvenido al mar.'); }; } }; };

// Entrar y recuperar contraseña.
const EQ = [{ k: 'e', q: '¿Cuál es tu correo?', h: 'El mismo con el que creaste tu cuenta.', t: 'email', ac: 'email', ph: 'nombre@correo.com' }, { k: 'p', q: 'Tu contraseña.', h: '', t: 'password', ac: 'current-password', ph: '••••••' }];
const oneQ = (f, i, n, btn, extra = '') => `
  <div class="top"><button class="ib edge" id="bk" aria-label="Atrás">${I.back}</button>${n > 1 ? `<span class="cdots" aria-label="Paso ${i + 1} de ${n}">${Array.from({ length: n }, (_, x) => `<i class="${x <= i ? 'on' : ''}"></i>`).join('')}</span>` : '<span></span>'}<span style="width:44px"></span></div>
  <div class="csaved-sp"></div>
  <form id="f" class="cform" autocomplete="on">
    <label class="cq" for="ci">${f.q}</label>
    <input class="cin" id="ci" type="${f.t}" autocomplete="${f.ac}" placeholder="${f.ph}" required value="${esc(f.v || '')}">
    ${f.h ? `<p class="ch">${f.h}</p>` : ''}${extra}
  </form>
  <div class="grow"></div>
  <button class="btn btn-a" form="f">${btn}</button>`;
// Entrar: igual que crear la cuenta, una pregunta a la vez y sin cajas.
R.entrar = ({ i = 0 } = {}) => { const f = { ...EQ[i], v: i ? '' : store.get('mail', '') }; return { cls: 'cta', html: oneQ(f, i, 2, i ? 'Entrar' : 'Seguir', i ? `<button type="button" class="lnk mt2" data-go="olvide">Olvidé mi contraseña</button>` : ''),
  bind(el) { const fm = $('#f', el), inp = $('#ci', el); fm.noValidate = true; setTimeout(() => inp.focus({ preventScroll: true }), 350);
    $('#bk', el).onclick = () => i ? go('entrar') : go('bienvenida');
    fm.onsubmit = e => { e.preventDefault(); if (!check(fm)) return; if (!i) { store.set('mail', inp.value.trim()); return go('entrar', { i: 1 }); } store.set('onb', 1); go('mar'); }; } }; };
R.olvide = () => ({ cls: 'cta', html: oneQ({ q: '¿A qué correo te mandamos el enlace?', h: 'Con ese enlace creas una contraseña nueva.', t: 'email', ac: 'email', ph: 'nombre@correo.com', v: store.get('mail', '') }, 0, 1, 'Enviar enlace'),
  bind(el) { const fm = $('#f', el); fm.noValidate = true; setTimeout(() => $('#ci', el).focus({ preventScroll: true }), 350); $('#bk', el).onclick = () => go('entrar', { i: 1 });
    fm.onsubmit = e => { e.preventDefault(); if (!check(fm)) return; go('entrar', { i: 1 }); toast('Listo. Revisa tu correo.'); }; } });

// Mar: lo que te llegó, tu botella y la pregunta de hoy. Nada más.
// Mar: voces a pantalla completa, una tras otra hacia arriba (como Reels).
// Portada = la forma de la voz dentro de la botella + la pregunta grande, en el color del tema.
let vb = 0;
const CORKV = { far: '<path d="M64 44V30l16-14 16 14v14z" fill="#4FB3E8"/><path d="M64 30l16-14 16 14" fill="none" stroke="#9EDCFA" stroke-width="3" stroke-linejoin="round"/>', tide: '<rect x="64" y="22" width="32" height="22" rx="5" fill="#F5B82E"/><path d="M64 24l5-14 11 9 11-9 5 14z" fill="#FFD447"/>', gift: '<rect x="64" y="22" width="32" height="22" rx="5" fill="#E8455B"/><path d="M80 23L62 12v18zM80 23l18-11v18z" fill="#FF7A8E"/>' };
const voiceBottle = (c, peaks, cork) => { if (SPC[cork]) c = SPC[cork]; const id = 'vb' + (vb++), pk = (peaks || []).slice(0, 18), n = pk.length || 18, w = 84 / n;
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
  // Las doradas salen primero: llegan a todas las orillas, sin importar el tema.
  const shore = [...S.shore].sort((a, b) => (B[b] && B[b].gold ? 1 : 0) - (B[a] && B[a].gold ? 1 : 0)), gtag = b => b.gold ? `Dorada · ${b.tag}` : b.tag;
  const reels = shore.map(id => ({ t: 'voz', id, b: B[id] })); const mode = store.get('marv', 'uno');
  reels.push({ t: 'hoy' }); if (S.mine) reels.push({ t: 'mine' });
  const nv = S.shore.length;
  const reel = (r, i) => {
    if (r.t === 'voz') { const b = r.b, secs = (PK[b.v] || [12])[0];
      return `<section class="reel" style="--c:${b.c}" data-i="${i}">
        <div class="cover">${voiceBottle(b.c, PK[b.v] && PK[b.v][1], corkOf(b))}</div>
        <div class="rtx"><span class="rtag"><i></i>${esc(gtag(b))} · ${esc(b.kind)}</span>
          <h2 class="rq">${esc(b.q)}</h2>
          <p class="rmeta">Alguien que ama ${esc(b.theme)} · ${fmt(secs)}</p>
          <div class="ract"><button class="btn rbtn" data-open="${r.id}"><span class="pl">${I.play}</span>Escuchar</button></div>
          ${i === 0 && reels.length > 1 ? `<p class="rhint">${I.chev}Desliza hacia arriba</p>` : ''}</div></section>`; }
    if (r.t === 'hoy') return `<section class="reel" style="--c:#FFE7B0" data-i="${i}">
        <div class="cover moonc"><span class="bigmoon"></span></div>
        <div class="rtx"><span class="rtag"><i></i>Pregunta de hoy · para todos</span>
          <h2 class="rq">¿Qué le dirías a tu yo de hace diez años?</h2>
          <p class="rmeta">${store.get('hoy') ? 'Ya respondiste. Escucha lo que dijeron otros.' : 'Responde con tu voz y escucha a otros.'}</p>
          <div class="ract"><button class="btn rbtn" data-go="hoy">${I.mic}${store.get('hoy') ? 'Escuchar respuestas' : 'Responder'}</button></div></div></section>`;
    return `<section class="reel" style="--c:${tc(S.mine.tema)}" data-i="${i}">
        <div class="cover">${voiceBottle(tc(S.mine.tema), null, corkOf(S.mine))}</div>
        <div class="rtx"><span class="rtag"><i></i>Tu ${esc(S.mine.kind.toLowerCase())} · ${esc(S.mine.tema)}</span>
          <h2 class="rq">${`Ya llegó a ${reachOf(S.mine)} personas.`}</h2>
          <p class="rmeta">Y sigue viajando hasta que alguien te responda.</p>
          <div class="ract"><button class="btn rbtn" data-go="botellas">${I.bottle}Ver mis botellas</button></div></div></section>`;
  };
  return { cls: 'tabbed reels', html: `
  <div class="rtop"><button class="dockc" data-go="muelle" aria-label="Muelle: ${X.far + X.tide} botellas especiales">${I.dock}<b>${X.far + X.tide || 'Muelle'}</b></button><span class="vmode" role="tablist" aria-label="Cómo ver el mar"><button role="tab" data-m="uno" aria-pressed="${mode === 'uno'}">Una a una</button><button role="tab" data-m="todo" aria-pressed="${mode === 'todo'}">Todo el mar</button></span><button class="me-pill solo" data-go="perfil" aria-label="Tu perfil">${voiceMark()}</button></div>
  <div class="sea" id="sea" aria-label="Todas las botellas del mar"><canvas class="seacv" aria-hidden="true"></canvas>
    <div class="seahead"><h2>${nv === 1 ? '1 botella nueva' : `${nv} botellas nuevas`} flotando</h2><p>Toca una para ver qué dice.</p></div>
    ${(() => { const spots = [[24, 30], [70, 25], [40, 52], [78, 56], [20, 74], [60, 80], [44, 22]]; const all = [...shore.map(id => ({ k: 'voz', id, b: B[id] })), { k: 'hoy' }, ...(S.mine ? [{ k: 'mine' }] : [])];
      return all.slice(0, spots.length).map((x, i) => { const [px, py] = spots[i], rot = [-14, 10, -6, 16, -10, 8, -4][i];
        if (x.k === 'hoy') return `<button class="fb moon" style="--x:${px}%;--y:${py};--d:${i * -.7}s" data-k="hoy"><span class="art"><span class="mmoon"></span></span><span class="lbl"><i style="background:#FFE7B0"></i>Pregunta de hoy</span></button>`;
        if (x.k === 'mine') return `<button class="fb mine" style="--x:${px}%;--y:${py};--d:${i * -.7}s;--r:${rot}deg;--c:${tc(S.mine.tema)}" data-k="mine"><span class="rip" aria-hidden="true"></span><span class="art">${voiceBottle(tc(S.mine.tema))}</span><span class="lbl"><i></i>La tuya</span></button>`;
        return `<button class="fb" style="--x:${px}%;--y:${py};--d:${i * -.7}s;--r:${rot}deg;--c:${x.b.c}" data-k="voz" data-id="${x.id}" data-i="${i}"><span class="rip" aria-hidden="true"></span><span class="art">${voiceBottle(x.b.c, PK[x.b.v] && PK[x.b.v][1])}</span><span class="lbl"><i></i>${esc(gtag(x.b))}</span></button>`; }).join(''); })()}
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
      sheet(`<p class="rtag" style="--c:${x.c}"><i></i>${esc(gtag(x))} · ${esc(x.kind)}</p><h2 class="title mt2">${esc(x.q)}</h2><p class="sub mt1">Alguien que ama ${esc(x.theme)} · ${fmt(secs)}</p><div class="row-btns"><button class="btn btn-a" id="go"><span class="pl">${I.play}</span>Escuchar</button><button class="btn btn-q" id="one">Verla en grande</button></div>`, (s2, close) => { $('#go', s2).onclick = () => { close(); go('abrir', { id }); }; $('#one', s2).onclick = () => { close(); toReel(i); }; }); });
    rs[0] && rs[0].classList.add('on');
    $$('[data-open]', el).forEach(bt => bt.onclick = () => { const rl = bt.closest('.reel'); rl.classList.add('zoom'); navigator.vibrate && navigator.vibrate(8); setTimeout(() => go('abrir', { id: bt.dataset.open, zin: 1 }), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280); });
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
R.lanzar = ({ idea = '', dorada = false } = {}) => { const LZ = store.get('lzd', {}); let kind = LZ.kind || 'Pregunta', tema = S.temas.includes(LZ.tema) ? LZ.tema : S.temas[0]; idea = idea || LZ.idea || ''; const P = { Pregunta: '¿Qué quieres preguntar?', Confesión: '¿Qué quieres confesar?', Historia: '¿Qué quieres contar?' };
  if (S.left <= 0) return { html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span></span><span style="width:44px"></span></div>
  <div class="grow"></div><h1 class="title">Por hoy lanzaste todas.</h1><p class="sub mt1">Mañana te llega una más. Y cada vez que respondes la botella de alguien, ganas otra.</p><div class="grow"></div>
  <button class="btn btn-a" data-go="mar">Responder una botella</button><button class="btn btn-q" data-go="muelle">Ver mis botellas especiales</button>` };
  return { cls: 'nightbg', html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span class="cap">${dorada ? 'Botella dorada' : ''}</span><span style="width:44px"></span></div>
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
    let kindSp = dorada ? 'tide' : '';
    const spName = k => `${TIPO[k][0]} · ${TIPO[k][2]} personas`;
    const openSp = () => sheet(`<h2 class="title">¿Cómo viaja tu botella?</h2><p class="sub">Toda botella sigue llegando a más gente hasta que alguien responde. Esto cambia con cuánta gente empieza.</p><div class="list mt2">${Object.keys(TIPO).map(k => { const n = k ? X[k] : null; return `<button class="item spo" data-k="${k}" aria-pressed="${k === kindSp}" ${n === 0 ? 'disabled' : ''}><span class="tx"><b>${TIPO[k][0]}</b><small>${TIPO[k][1]}.${n == null ? '' : n ? ` Te quedan ${n}.` : ` No te quedan. ${GANA[k]}`}</small></span>${k === kindSp ? I.check : ''}</button>`; }).join('')}</div><button class="btn btn-2 mt2" id="gm">${I.dock}Cómo ganar más</button>`, (sh, close) => {
      $$('.spo', sh).forEach(b => b.onclick = () => { kindSp = b.dataset.k; close(); const v = $('#spv', el); v && (v.textContent = spName(kindSp)); });
      $('#gm', sh).onclick = () => { close(); go('muelle'); }; });
    const openTema = () => { const mine = S.temas, rest = TEMAS.filter(t => !mine.includes(t)), ch = t => `<button class="chip" style="--c:${tc(t)}" aria-pressed="${t === tema}"><i></i>${esc(t)}</button>`;
      sheet(`<h2 class="title">¿Sobre qué tema?</h2><p class="sub">Tu botella llega a todas las personas que lo aman.</p><p class="cap tsec">Tus temas</p><div class="chips tchips">${mine.map(ch).join('')}</div><p class="cap tsec">Otros temas</p><div class="chips tchips">${rest.map(ch).join('')}</div>`,
        (sh, close) => $$('.chip', sh).forEach(c => c.onclick = () => { tema = c.textContent; $('#tmn', el) && ($('#tmn', el).textContent = tema); paintT(); navigator.vibrate && navigator.vibrate(5); setTimeout(close, 120); })); };
    const ideas = $('#ideas', el);
    ideas.onclick = () => sheet(`<h2 class="title">Ideas para ${kind === 'Pregunta' ? 'preguntar' : kind === 'Confesión' ? 'confesar' : 'contar'}</h2><p class="sub">Tócala y dila con tus palabras.</p><div class="row-btns" id="il"></div><button class="btn btn-q mt1" id="imore">${I.shuffle}Ver otras ideas</button>`, (s, close) => {
      const fill = () => { const l = $('#il', s); l.classList.remove('in'); void l.offsetWidth; l.innerHTML = nextIdeas(kind, IDEAS[kind]).map(t => `<button class="idea">${esc(t)}</button>`).join(''); l.classList.add('in');
        $$('.idea', l).forEach(b => b.onclick = () => { const p = $('#idea', el); p.hidden = false; p.textContent = b.textContent; close(); }); };
      fill(); $('#imore', s).onclick = () => { fill(); navigator.vibrate && navigator.vibrate(5); }; });
    window.__snap = () => { const q = $('#idea', el); store.set('lzd', { kind, tema, idea: q && !q.hidden ? q.textContent : '' }); }; 
    recUI(el, 'Desliza al mar', r => { store.set('lzd', null); const p = $('#idea', el), dor = kindSp === 'tide', far = kindSp === 'far'; if (dor) X.tide = Math.max(0, X.tide - 1); else if (far) X.far = Math.max(0, X.far - 1); else S.left = Math.max(0, S.left - 1); S.mine = { kind, tema, idea: p.hidden ? '' : p.textContent, heard: 0, dorada: dor, far, url: r.url, secs: r.secs }; S.sent.unshift({ ...S.mine, ans: 0, when: 'Ahora' }); saveX(); track('botella_lanzada', { dorada: dor, far, tema }); go('lanzada'); });
    // El tema se elige al final, junto al envío: primero hablas, después decides a quién le llega.
    new MutationObserver(() => { const sl = $('#sl', el); ideas.hidden = !!sl;
      if (sl && !$('.dest', el)) { sl.insertAdjacentHTML('beforebegin', `<button class="dest" id="dest"><span class="dl">Llega a quienes aman</span><span class="dv"><i></i><b id="tmn">${esc(tema)}</b></span><span class="dc">Cambiar</span></button>`); $('#dest', el).onclick = openTema; sl.insertAdjacentHTML('beforebegin', `<button class="dest sp" id="spb"><span class="dl">Cómo viaja</span><span class="dv"><b id="spv">${spName(kindSp)}</b></span><span class="dc">Cambiar</span></button>`); $('#spb', el).onclick = openSp; const lf = S.left - 1; sl.insertAdjacentHTML('afterend', `<p class="cap lzleft">${dorada ? '' : lf > 0 ? (lf === 1 ? 'Después de esta te queda 1 botella.' : `Después de esta te quedan ${lf} botellas.`) : 'Es tu última botella de hoy. Mañana llega otra.'}</p>`); } }).observe($('#after', el), { childList: true });
    new MutationObserver(() => el.classList.toggle('recing', !!$('#rtm', el))).observe($('#rw', el), { childList: true });
  } }; };

// Pregunta de hoy: la misma para todos. Respondes con tu voz y se abren las respuestas de los demás.
R.hoy = () => { const done = store.get('hoy'); const A = [['answer-1', 'el cine', '#8E8CFF'], ['answer-2', 'los libros', '#9FE3B0'], ['answer-3', 'la música', '#FF70A9']]; return { cls: 'nightbg', html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span class="cap">Pregunta de hoy</span><span style="width:44px"></span></div>
  <h1 class="title mt2">¿Qué le dirías a tu yo de hace diez años?</h1>
  ${done ? `<p class="sub mt1 mb3">Tú ya respondiste. Esto dijeron otros.</p>
  <div class="row-btns">${A.map(([v, t, c]) => `<div class="paper" style="padding:14px 16px"><p class="who" style="margin-bottom:8px"><i class="orb" style="background:${c}"></i>Alguien que ama ${t}</p>${player(v, { real: true })}</div>`).join('')}</div>
  <p class="cap center mt3">Mañana hay otra.</p>`
  : `<p class="sub mt1">Hoy todo Botella responde esta pregunta. Responde y escucha lo que dijeron los demás.</p>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`}`,
  bind(el) { if (!done) recUI(el, 'Desliza para enviar', () => { store.set('hoy', 1); go('hoy'); toast('Respuesta enviada'); }); } }; };

// Lanzada: el momento alto. El número de personas que la reciben sube en vivo.
R.lanzada = () => { const t = S.mine ? S.mine.tema : S.temas[0]; return { cls: 'clear cine', html: `
  <div class="cineimg" aria-hidden="true"></div>
  <div class="grow"></div>
  <h1 class="display center">Va en camino.</h1>
  <div class="bignum mt2" aria-live="polite"><b id="rb">0</b><span>personas que aman ${esc(AMA[t] || t.toLowerCase())} ya la recibieron</span></div>
  <p class="sub center mt2">Y sigue llegando a más gente hasta que alguien te responda.</p>
  <button class="btn btn-2 mt3" data-go="mar">Volver al mar</button>`,
  bind(el) { const tc = TC[t] || '#7FD8C9'; cineLive($('.cineimg', el), 'lanzada', tc); el.style.setProperty('--a', tc); const b = $('#rb', el), goal = S.mine ? baseOf(S.mine) : 12; let n = 0; const t0 = (window.Mar && Mar.ok ? 2400 : 400);
    setTimeout(() => { const iv = setInterval(() => { if (!document.body.contains(b)) return clearInterval(iv); n += n < goal ? 1 : (Math.random() < .04 ? 1 : 0); b.textContent = n; if (S.mine) { S.mine.reached = n; } }, n < goal ? 70 : 70); setTimeout(() => { if (S.mine) { const m = S.sent[0]; if (m) m.reached = n; saveX(); } }, 4000); }, t0); } }; };

// Conversaciones.
const stepsHTML = (st, cls = '') => `<span class="steps ${cls}">${[0, 1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</span>`;
const theirPk = id => (PK[B[id].v] || [0, fakePeaks(id.length)])[1];
const theirMark = (id, cls = '') => { const c = B[id].c; return voiceMark(cls, theirPk(id), [c, `color-mix(in oklab, ${c}, #fff 35%)`, `color-mix(in oklab, ${c}, #05121F 30%)`]); };
const STEPN = ['Notas de voz', 'Nombres', 'Llamada', 'Plan'];
const stepRing = (st, txt) => { const f = Math.min(1, (st + 1) / 4), C = 2 * Math.PI * 17; return `<span class="sring"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"/><circle class="on" cx="20" cy="20" r="17" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - f)}"/></svg><b>${st + 1}<small>/4</small></b></span><span class="stx"><small>${STEPN[st]}</small>${txt}</span>`; };
const pathHTML = st => `<span class="path">${STEP.map((t, i) => `<span class="${i < st ? 'done' : i === st ? 'now' : ''}"><i></i>${t}</span>`).join('')}</span>`;
R.charlas = () => { const ids = Object.keys(S.convs).sort((x, y) => (S.convs[y].unread ? 1 : 0) - (S.convs[x].unread ? 1 : 0)); const nu = ids.filter(k => S.convs[k].unread).length;
  return { cls: 'tabbed', html: `
  <div class="top"><span class="wm">${I.logo}botella</span><button class="me-pill solo" data-go="perfil" aria-label="Tu perfil">${voiceMark()}</button></div>
  <h1 class="title mt1">Conversaciones</h1>
  <p class="sub mt1">${ids.length ? (nu ? `${nu === 1 ? 'Una voz nueva te espera.' : `${nu} voces nuevas te esperan.`}` : `${n_(ids.length, 'conversación', 'conversaciones')}. Todas por voz.`) : 'Cuando respondas una botella, la conversación aparece aquí.'}</p>
  <div class="convs mt3">${ids.map(id => { const c = S.convs[id], b = B[id], last = c.msgs.filter(m => m.v).pop(), named = c.stage >= 1 && b.name, secs = last ? (PK[last.v] ? PK[last.v][0] : last.s || 8) : 0;
    return `<button class="conv${c.unread ? ' new' : ''}" style="--c:${b.c}" data-go="${c.unread && !c.cel ? 'respondio' : 'chat'}" data-p='{"id":"${id}"}'>
      ${theirMark(id)}
      <span class="cx"><span class="ctop"><b>${named ? esc(b.name) : `Alguien que ama ${esc(b.theme)}`}</b><span class="when">${esc(c.when)}</span></span>
      <span class="cq">${esc(b.q)}</span>
      <span class="clast">${last && last.f === 'them' ? `<span class="pip">${I.play}</span>${c.unread ? 'Nueva nota de voz' : 'Te respondió'} · ${fmt(secs)}` : `<span class="pip me">${I.check}</span>Le respondiste. Esperando su voz`}</span>
      </span></button>`; }).join('')}</div>
  ${S.shore.length ? `<div class="grow"></div><button class="waitc mt3" data-go="mar"><span class="wb">${S.shore.slice(0, 3).map(k => `<span class="mb">${voiceBottle(B[k].c)}</span>`).join('')}</span><span class="tx"><b>${S.shore.length === 1 ? 'Una botella flota en el mar' : `${S.shore.length} botellas flotan en el mar`}</b><small>Escúchalas y responde la que quieras</small></span>${I.chev}</button>` : ''}` }; };

// Chat: la ficha arriba (pregunta y pasos), las voces al medio, el siguiente paso y el micrófono abajo.
const STEP = ['Voces', 'Nombres', 'Llamada', 'Plan'];
R.chat = ({ id = 'leo' }) => { const b = B[id], c = S.convs[id]; c.unread = false; save(); const who = () => c.stage >= 1 && b.name ? b.name : `Alguien que ama ${b.theme}`; return { cls: 'chat', html: `
  <div class="top ctop2" style="--c:${b.c}"><button class="ib" data-go="charlas" aria-label="Atrás">${I.back}</button><span class="chead">${theirMark(id)}<span><b id="who">${esc(who())}</b><small>Les une ${esc(b.theme)}</small></span></span><button class="ib" id="menu" aria-label="Más opciones">${I.more}</button></div>
  <div class="ficha" style="--c:${b.c}"><p class="fk"><i></i>Su ${esc(b.kind.toLowerCase())}</p><p class="q">${esc(b.q)}</p><div id="st"></div></div>
  <div class="thread" id="th"></div>
  <div class="dock"><button class="next" id="next"></button><button class="rec" id="rec" aria-label="Grabar nota de voz">${I.mic}</button></div>`,
  bind(el) {
    const th = $('#th', el), st = $('#st', el), next = $('#next', el); th.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });
    const counts = () => ({ them: c.msgs.filter(m => m.f === 'them').length, me: c.msgs.filter(m => m.f === 'me').length });
    el.style.setProperty('--c', b.c);
    const msgHTML = m => m.f === 'sys' ? `<p class="sys">${m.t}</p>` : m.f === 'intro' ? `<div class="plan introm"><small>La presentación de ${esc(b.name)}</small>${player(m.v, { secs: m.s })}</div>` : m.f === 'plan' ? `<div class="plan"><small>${m.ok ? 'Plan aceptado' : 'Propusiste'}</small><b>${esc(m.t)}</b></div>` : `<div class="msg ${m.f}">${player(m.v, { mine: m.f === 'me', secs: m.s })}</div>`;
    const draw = () => {
      th.innerHTML = c.msgs.map(msgHTML).join(''); $('#who', el).textContent = who();
      const k = counts(), need = Math.max(0, 2 - k.them) + Math.max(0, 2 - k.me);
      const N = [
        need ? [need === 1 ? 'Una nota más y pueden compartir sus nombres' : `${need} notas más entre los dos y pueden compartir sus nombres`, null] : [`${I.eye}Compartir mi nombre`, askName],
        [`${I.phone}Pedir una llamada`, askCall], [`${I.plan}Proponer un plan`, askPlan], [`${I.check}Plan listo`, null]][c.stage];
      next.innerHTML = N[0]; next.disabled = !N[1]; next.onclick = N[1]; next.hidden = !N[1];
      st.innerHTML = stepRing(c.stage, N[1] ? ['Ya pueden compartir sus nombres, si los dos quieren.', 'Ya saben sus nombres. ¿Se escuchan en vivo?', 'Ya hablaron. ¿Se ven en un lugar público?'][c.stage] : c.stage === 3 ? 'Tienen un plan. Disfrútenlo.' : N[0]);
      requestAnimationFrame(() => el.scrollTop = el.scrollHeight);
    };
    const push = m => { c.msgs.push(m); save(); draw(); };
    function askName() { sheet(`<h2 class="title">¿Compartir tu nombre?</h2><p class="sub">Solo se muestra si los dos aceptan.</p><div class="row-btns"><button class="btn btn-a" id="y">Compartir</button><button class="btn btn-q" data-close>Todavía no</button></div>`, (s, close) => $('#y', s).onclick = () => { close(); push({ f: 'sys', t: 'Esperando su respuesta…' }); setTimeout(() => { c.msgs.pop(); c.stage = 1; track('nombres_compartidos', { id }); push({ f: 'sys', t: `Ahora saben sus nombres: <b>${esc(b.name)}</b> y <b>${esc(S.name || 'tú')}</b>` }); setTimeout(() => { push({ f: 'intro', v: b.v, s: 9 }); if (!S.intro) push({ f: 'sys', t: `Tu presentación falta. <button class="lnk" data-go="presentacion">Grábala aquí</button>` }); }, 900); }, 1800); }); }
    function askCall() { sheet(`<h2 class="title">¿Llamar a ${esc(b.name)}?</h2><p class="sub">Solo voz. Si no puede, no pasa nada.</p><div class="row-btns"><button class="btn btn-a" id="y">${I.phone}Pedir llamada</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s, close) => $('#y', s).onclick = () => { close(); toast(`${b.name} aceptó`); setTimeout(() => go('llamada', { id }), 900); }); }
    function askPlan() { const O = ['Ir al cine el martes', 'Café en el Centro', 'Caminar por el malecón']; sheet(`<h2 class="title">Propón un plan</h2><p class="sub">Un lugar público. Cada uno paga lo suyo.</p>${O.map(t => `<button class="idea">${t}</button>`).join('')}`, (s, close) => $$('.idea', s).forEach(o => o.onclick = () => { close(); push({ f: 'plan', t: o.textContent }); setTimeout(() => { c.msgs[c.msgs.length - 1].ok = true; c.stage = 3; save(); draw(); toast(`${b.name} dijo que sí`); }, 2000); })); }
    const RSN = ['Contenido sexual explícito', 'Insultos o burlas', 'Amenazas', 'Me hizo sentir incómodo', 'Otra cosa'];
    const block = () => sheet(`<h2 class="title">¿Bloquear a ${esc(who())}?</h2><p class="sub">No volverá a escucharte ni a escribirte, y esta conversación se cierra. No se lo avisamos.</p><div class="row-btns mt3"><button class="btn btn-2 danger" id="byes">Bloquear</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (sh, close) => $('#byes', sh).onclick = () => { close(); const keep = S.convs[id]; delete S.convs[id]; save(); track('bloqueo', { id }); go('charlas'); toast('Bloqueaste esta conversación.', '#FF7B7E', () => { S.convs[id] = keep; save(); go('charlas'); track('bloqueo_deshecho', { id }); }); });
    const report = () => sheet(`<h2 class="title">¿Qué pasó?</h2><p class="sub">Lo revisa una persona del equipo. ${esc(who())} no sabe que lo reportaste.</p><div class="row-btns mt2" id="rsn">${RSN.map(r => `<button class="idea">${r}</button>`).join('')}</div>`, (sh, close) => $$('#rsn .idea', sh).forEach(b => b.onclick = () => { track('reporte_creado', { id, motivo: b.textContent }); close(); setTimeout(() => sheet(`<p class="okmark">${I.check}</p><h2 class="title">Gracias por avisar.</h2><p class="sub">Lo vamos a revisar. ¿Quieres bloquear también a ${esc(who())}?</p><div class="row-btns mt3"><button class="btn btn-2 danger" id="alsob">Bloquear también</button><button class="btn btn-q" data-close>Por ahora no</button></div>`, (s2, c2) => $('#alsob', s2).onclick = () => { c2(); setTimeout(block, 210); }), 210); }));
    $('#menu', el).onclick = () => sheet(`<h2 class="title">${esc(who())}</h2><p class="sub">Nadie se entera de lo que elijas aquí, salvo el regalo.</p><div class="row-btns"><button class="btn btn-2" id="gf">${I.gift}Regalarle una botella</button><button class="btn btn-2" id="rp">Reportar</button><button class="btn btn-2" id="bl">Bloquear</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (s, close) => { $('#gf', s).onclick = () => { close(); const g = X.gift || 0; if (!g) return toast('No te quedan botellas de regalo. ' + GANA.gift); X.gift = g - 1; saveX(); track('botella_regalada', { id }); push({ f: 'sys', t: `Le regalaste una botella a ${esc(who())}. Ahora puede lanzar una más.` }); }; $('#rp', s).onclick = () => { close(); setTimeout(report, 210); }; $('#bl', s).onclick = () => { close(); setTimeout(block, 210); }; });
    // micrófono: toca para grabar, toca para enviar
    let rec = null; const rb = $('#rec', el);
    const dock = $('.dock', el), live = document.createElement('div'); live.className = 'dlive'; live.hidden = true; dock.prepend(live);
    const sendMine = r => { push({ f: 'me', v: r.url || 'mine' + c.msgs.length, s: Math.max(2, Math.round(r.secs)) }); markDay();
      if (counts().them < 3 || c.stage === 0) { th.insertAdjacentHTML('beforeend', '<div class="typing"><i></i><i></i><i></i></div>'); el.scrollTop = el.scrollHeight; setTimeout(() => push({ f: 'them', v: `${id}-reply` }), 2400); } };
    const reset = () => { live.hidden = true; live.innerHTML = ''; rb.hidden = false; rb.classList.remove('live'); rb.innerHTML = I.mic; draw(); };
    rb.onclick = async () => {
      if (!rec) { live.hidden = false; next.hidden = true; live.innerHTML = `<span class="rdot"></span><b id="ct">0:00</b><span class="cap">Toca para terminar</span>`; rec = recorder(t => { const ct = $('#ct', el); ct && (ct.textContent = fmt(t)); }); rb.classList.add('live'); rb.innerHTML = '<span class="sq"></span>'; await rec.start(); return; }
      const r = await rec.stop(); rec = null; rb.hidden = true;
      live.innerHTML = `<button class="ib" id="dis" aria-label="Borrar nota">${I.x}</button><div class="slide sm" id="csl"></div>`;
      $('#dis', el).onclick = reset; slider($('#csl', el), 'Desliza para enviar', () => { reset(); sendMine(r); });
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
    { c1: '#FFC24B', c2: '#FF8E9E', h: `<p class="wk">Tu racha más larga</p><b class="wn" data-n="${best}">0</b><h2>días seguidos grabando tu voz.</h2><p>Tu voz estuvo aquí todos esos días.</p>` },
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
  <div class="cctl"><button class="cbt" id="mute" aria-pressed="false"><span>${I.micoff}</span>Silenciar</button><button class="hang" id="h" aria-label="Colgar">${I.phone}</button><button class="cbt" id="spk" aria-pressed="false"><span>${I.speaker}</span>Altavoz</button></div>
  <p class="cap csafe">${I.lock}Solo voz. Tu número no se comparte.</p>`,
  bind(el) { let t = 0, iv; setTimeout(() => { audio.src = `v/${id}-call.mp3`; audio.play().catch(() => {}); iv = setInterval(() => { t++; const c = $('#ct', el); c && (c.textContent = fmt(t)); }, 1000); }, 1200);
    $$('.cbt', el).forEach(bt => bt.onclick = () => { const on = bt.getAttribute('aria-pressed') !== 'true'; bt.setAttribute('aria-pressed', on); navigator.vibrate && navigator.vibrate(6); if (bt.id === 'mute') { el.classList.toggle('muted', on); toast(on ? 'Silenciado. No te escucha.' : 'Te escucha de nuevo.'); } });
    $('#h', el).onclick = () => { clearInterval(iv); audio.pause(); const c = S.convs[id]; c.stage = 2; c.msgs.push({ f: 'sys', t: `Llamada · ${fmt(Math.max(t, 1))}` }); save(); go('chat', { id }); }; } }; };

// ================= LO DEMÁS: vive en tu perfil, una pantalla por cosa =================
const X = Object.assign({ far: 1, tide: 1, gift: 1, glass: 'Claro', captain: false, streak: 4 }, store.get('x', {}));
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
S.intro = store.get('intro', null);
const saveX = () => { store.set('x', X); store.set('sent', S.sent); store.set('outs', S.outs); store.set('lec', S.lec); store.set('duo', S.duo); store.set('intro', S.intro); save(); };
Object.assign(I, {
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/></svg>',
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

  <div class="fl mt3">${friendRow('#7FD8C9', 'mic', S.intro ? 'Tu presentación' : 'Graba tu presentación', S.intro ? `${S.intro.secs} s · Se escucha al compartir nombres` : 'Tu voz en vez de una foto', 'data-go="presentacion"')}</div>

  <button class="month mt2" data-go="mes" style="--c1:${cs[0]};--c2:${cs[1]};--c3:${cs[2]}">
    <span class="mlbl">Tu ${mes} en Botella · Toca para verlo</span>
    <b class="mbig">${heard} personas escucharon tu voz.</b>
    <span class="mrow"><span><b>${ans}</b>te respondieron</span><span><b>${notas}</b>notas de voz</span><span><b style="color:${top[2]}">${top[0]}</b>tu tema más escuchado</span></span>
    ${waveLine(pk)}
  </button>

  <button class="dockhero mt2" data-go="muelle">
    <span class="dhart" aria-hidden="true"><span class="b1">${voiceBottle('#8E8CFF')}</span><span class="b2">${voiceBottle('#FFD27A')}</span><span class="b3">${voiceBottle('#FFB061')}</span></span>
    <span class="dhtx"><span class="dhk">${I.dock}Muelle</span><b>Que tu voz llegue más lejos</b><small>Tus botellas que llegan lejos, doradas y de regalo. Se ganan usando tu voz.</small></span>
    <span class="dhcta">${X.far + X.tide ? `Tienes ${n_(X.far + X.tide, 'especial', 'especiales')}` : 'Cómo ganarlas'}${I.chev}</span>
  </button>

  <p class="eyebrow">Tu voz</p>
  <div class="duo2">
    <button class="vcard" data-go="botellas"><span class="vart">${sent.length ? sent.map(x => `<span class="mb">${voiceBottle(tc(x.tema), null, corkOf(x))}</span>`).join('') : `<span class="mb">${voiceBottle('#7FD8C9')}</span>`}</span><b>Mis botellas</b><small>${S.sent.length ? `${n_(S.sent.length, 'botella', 'botellas')} · ${n_(S.sent.reduce((t, x) => t + (x.ans || 0), 0), 'respuesta', 'respuestas')}` : 'Todavía ninguna'}</small></button>
    <button class="vcard" data-go="mapa"><span class="vart cst">${MAPA.map(([t, k, c], i) => `<i style="--c:${c};--s:${8 + k * 3}px;--x:${[18, 62, 34, 76][i]}%;--y:${[30, 22, 70, 66][i]}%"></i>`).join('')}<em></em></span><b>Mapa de tu voz</b><small>Conectó con ${n_(MAPA.length, 'tema', 'temas')}</small></button>
  </div>

  <button class="streakmini mt2" data-go="bitacora"><span class="smn"><b>${n}</b> ${n === 1 ? 'día seguido' : 'días seguidos'} grabando</span><span class="smw" aria-hidden="true">${weekStrip()}</span>${I.chev}</button>

  <p class="eyebrow">Con tus amigos</p>
  <div class="fl">
    ${friendRow('#C7B8FF', 'quote', '¿Qué piensan de ti?', la ? `${n_(la, 'amigo respondió', 'amigos respondieron')} “${esc(lec.q)}”` : 'Tus amigos te responden con su voz', 'data-go="lecturas"')}
    ${friendRow('#FF8E9E', 'two', 'Botella para dos', S.duo ? (S.duo.friend ? 'Ya están las dos voces. Falta lanzarla.' : 'Falta la voz de tu amigo') : 'Graba una botella junto a un amigo', 'data-go="dos"')}
    ${friendRow('#FFB061', 'people', 'Salidas en grupo', goOut ? `Vas a ${n_(goOut, 'salida', 'salidas')}` : `${n_(S.outs.length, 'plan', 'planes')} en Lima esta semana`, 'data-go="salidas"')}
  </div>

  <div class="list mt3">
    ${row('tide', 'Botellas doradas', 'Salen primero en tu mar. Las abre cualquiera', 'data-go="mar"')}
    ${row('gift', 'Invitar a alguien', 'Comparte Botella con un amigo', 'data-a="inv"')}
    ${row('key', 'Cuenta', 'Tus temas, normas y contraseña', 'data-a="cuenta"')}
  </div>`,
  bind(el) {
    const acts = {
      inv: () => sheet(`<h2 class="title">Invita a alguien</h2><p class="sub">Comparte este enlace. Tu amigo entra y se presenta con su voz, como tú.</p><div class="inp mt2" style="display:flex;align-items:center;color:var(--fg-2);font-size:14px">botella-app.vercel.app/?c=TU-CODIGO</div><div class="row-btns mt2"><button class="btn btn-a" id="cp">Copiar enlace</button></div>`, (s, close) => $('#cp', s).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); close(); track('invitacion_copiada'); toast('Enlace copiado'); }),
      rules: () => sheet(`<h2 class="title">Normas de la casa</h2><div class="list mt2 mb3">${['Coquetear está bien. Lo explícito, no.', 'Sin insultos ni amenazas.', 'Tu distrito nunca se muestra.', 'Puedes reportar o bloquear desde cualquier conversación.'].map(t => `<p class="item" style="margin:0;min-height:52px">${t}</p>`).join('')}</div><button class="btn btn-2" data-close>Entendido</button>`),
      cuenta: () => { const tg = (k, ic, t, on, sOn, sOff) => `<button class="item tog" role="switch" aria-checked="${on}" data-t="${k}"><span class="ic">${I[ic]}</span><span class="tx"><b>${t}</b><small>${on ? sOn : sOff}</small></span><span class="sw" aria-hidden="true"><i></i></span></button>`;
        const set = store.get('ajustes', { avisos: true, pausa: false });
        const tgs = () => tg('avisos', 'bell', 'Avisos', set.avisos, 'Te avisamos cuando alguien te responde', 'Apagados: revisa el mar cuando quieras') + tg('pausa', 'pause', 'Modo pausa', set.pausa, 'No te llegan botellas nuevas. Tus conversaciones siguen.', 'Te llegan botellas nuevas');
        sheet(`<h2 class="title">Cuenta</h2><div class="list mt2">${row('tag', 'Tus temas', S.temas.join(', '), 'data-a="temas"')}<div id="tgs" style="display:contents">${tgs()}</div>${row('home', 'Instalar Botella', 'En la pantalla de inicio de tu celular', 'data-a="inst"')}${row('rules', 'Normas de la casa', '', 'data-a="rules"')}${row('key', 'Cambiar contraseña', '', 'data-a="pw"')}${row('quote', 'Cuéntanos qué te parece', 'Una frase basta', 'data-a="fb"')}${row('out', 'Cerrar sesión', '', 'data-a="out"')}</div><button class="btn btn-q danger mt1" data-a="del">Borrar mi cuenta</button>`, (s, close) => {
          const wire = () => $$('.tog', s).forEach(b => b.onclick = () => { const k = b.dataset.t; set[k] = !set[k]; store.set('ajustes', set); track(k === 'pausa' ? 'pausa_cambiada' : 'avisos_cambiados', { on: set[k] }); $('#tgs', s).innerHTML = tgs(); wire();
            toast(k === 'pausa' ? (set.pausa ? 'En pausa. No te llegan botellas nuevas.' : 'Listo. Vuelven a llegarte botellas.') : (set.avisos ? 'Avisos activados' : 'Avisos apagados')); });
          wire(); $$('[data-a]', s).forEach(b => b.onclick = () => { const k = b.dataset.a; if (k === 'rules') return acts.rules(); close(); setTimeout(acts[k], 210); }); }); },
      inst: () => sheet(`<h2 class="title">Botella en tu inicio</h2><p class="sub">Se abre como una app, a pantalla completa y sin la barra del navegador.</p><ol class="dsteps mt2"><li><b>1</b>En iPhone, toca Compartir en Safari. En Android, abre el menú de Chrome.</li><li><b>2</b>Elige “Agregar a inicio”.</li><li><b>3</b>Abre Botella desde el ícono nuevo.</li></ol><div class="row-btns mt3">${window.__bip ? '<button class="btn btn-a" id="ins">Instalar ahora</button>' : ''}<button class="btn btn-q" data-close>Listo</button></div>`, (s, close) => $('#ins', s) && ($('#ins', s).onclick = () => { close(); window.__bip.prompt(); window.__bip = null; })),
      del: () => sheet(`<h2 class="title">¿Borrar tu cuenta?</h2><p class="sub">Se borran tu voz, tus botellas y tus conversaciones. No se puede deshacer.</p><div class="row-btns mt3"><button class="btn btn-2 danger" id="bye">Borrar para siempre</button><button class="btn btn-q" data-close>Me quedo</button></div>`, (sh, close) => $('#bye', sh).onclick = () => { close(); track('cuenta_borrada', { dias_de_uso: DAYS.length }); Object.keys(localStorage).filter(k => k.startsWith('bn.') && k !== 'bn.ev').forEach(k => localStorage.removeItem(k)); AUD.wipe(); location.hash = ''; location.reload(); }),
      fb: () => sheet(`<h2 class="title">¿Qué tal Botella?</h2><p class="sub">Lo que te gusta, lo que te confunde o lo que te falta.</p><div class="chips mt2" id="fbm">${['Me encanta', 'Me confunde algo', 'Me falta gente'].map(t => `<button class="chip" aria-pressed="false">${t}</button>`).join('')}</div><textarea class="inp mt2" id="fbt" rows="3" placeholder="Escribe aquí (opcional)" style="height:auto;padding-top:12px;resize:none"></textarea><div class="row-btns mt2"><button class="btn btn-a" id="fbs">Enviar</button></div>`, (sh, close) => { $$('#fbm .chip', sh).forEach(c => c.onclick = () => $$('#fbm .chip', sh).forEach(x => x.setAttribute('aria-pressed', x === c))); $('#fbs', sh).onclick = () => { const m = $('#fbm [aria-pressed=true]', sh); track('comentario', { animo: m ? m.textContent : null, texto: $('#fbt', sh).value.slice(0, 500) }); close(); toast('Gracias por contarnos.'); }; }),
      pw: () => go('olvide'), temas: () => go('temas', { edit: true }), out: () => sheet(`<h2 class="title">¿Cerrar sesión?</h2><p class="sub">Tus botellas y conversaciones te esperan cuando vuelvas a entrar.</p><div class="row-btns mt3"><button class="btn btn-2" id="bye">Cerrar sesión</button><button class="btn btn-q" data-close>Seguir aquí</button></div>`, (sh, close) => $('#bye', sh).onclick = () => { close(); store.set('onb', 0); go('bienvenida'); })
    };
    $$('[data-a]', el).forEach(b => b.onclick = () => acts[b.dataset.a]());
  } }; };

// Muelle: tus botellas especiales y cómo se ganan. Nada se compra.
const SPECIAL = [
  ['far', 'Que llega lejos', 'Empieza con 30 personas, también de temas cercanos.', '#8E8CFF'],
  ['tide', 'Dorada', 'Sale primero en el mar de todos y cualquiera puede abrirla.', '#FFC24B'],
  ['gift', 'De regalo', 'Se la mandas a alguien con quien conversas y recibe una botella más.', '#FFB061']
];
const GLASS = [['Claro', '#CFE9F2'], ['Verde', '#7FD8A0'], ['Ámbar', '#FFB061'], ['Esmerilado', '#B9C6D3']];
R.muelle = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Muelle</h1>
  <p class="sub mt1">Cada botella especial tiene su propio color. Por ahora todas son gratis: se ganan usando tu voz.</p>
  <div class="mcar mt3" id="mcar">${[...SPECIAL.map(([k, t, d]) => [t, d, GANA[k], SPC[k], X[k] ? `Tienes ${X[k]}` : 'Todavía no tienes', '', k]), ['Normales', 'Empiezan con 12 personas que aman tu tema.', 'Te llega una cada día y ganas otra cada vez que respondes una botella.', '#7FD8C9', `Tienes ${S.left}`, '', ''], ['Para dos', 'Tu voz y la de un amigo. Empieza con 20 personas y usa una normal.', 'La grabas con alguien que ya conoces.', '#FF8E9E', 'Grabar una', 'data-go="dos"']].map(([t, d, g, c, have, act, k], i) => `<${act ? 'button' : 'div'} class="mc" style="--c:${c}" ${act}><span class="mcart">${bottleSVG(c)}</span><em class="mchave">${have}</em><b>${t}</b><p>${d}</p><small>${g}</small>${k != null ? precio(k) : ''}</${act ? 'button' : 'div'}>`).join('')}</div>
  <div class="mdots" id="mdots">${Array.from({ length: SPECIAL.length + 2 }, (_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
  <p class="cap mt2">Toda botella sigue llegando a más gente hasta que alguien responde.</p>
  <button class="btn btn-2 mt3" data-go="bitacora">Ver los regalos por días seguidos</button>
  <p class="eyebrow">El vidrio de tus botellas</p>
  <div class="tiles">${GLASS.map(([g, c]) => `<button class="tile glass" data-g="${g}" aria-pressed="${X.glass === g}"><span class="art">${bottleSVG(c)}</span><span>${g}</span></button>`).join('')}</div>`,
  bind(el) { const mc = $('#mcar', el), md = $$('#mdots i', el); mc.addEventListener('scroll', () => { const w = mc.firstElementChild.offsetWidth + 12, k = Math.round(mc.scrollLeft / w); md.forEach((d, j) => d.classList.toggle('on', j === k)); }, { passive: true });
    $$('[data-g]', el).forEach(b => b.onclick = () => { X.glass = b.dataset.g; saveX(); go('muelle', { nohash: true }); toast(`Tus botellas viajan en vidrio ${X.glass.toLowerCase()}.`); }); } });

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
  <div class="mias mt2"><p class="eyebrow" style="margin:0">Tus botellas</p><h2 class="mias-t">Cada botella lleva tu voz a gente que ama lo mismo que tú.</h2><p class="cap">La lanzas y sigue llegando a más gente hasta que alguien te responde. El color es el tema. Las especiales tienen colores propios.</p>
    <div class="mias-l">${[['', 'Normales', S.left, 'Llegan a 12 personas que aman tu tema.'], ['far', 'Llegan lejos', X.far || 0, 'Llegan a 30 personas, también de temas cercanos.'], ['tide', 'Doradas', X.tide || 0, 'Salen primero en el mar de todos.'], ['gift', 'De regalo', X.gift || 0, 'Se las mandas a alguien con quien conversas.']].map(([k, t, n, d]) => `<div class="mia ${n ? '' : 'cero'}"><span class="art">${voiceBottle(tc(S.temas[0]), null, k)}</span><span class="tx"><b>${t}</b><small>${d}</small></span><em>×${n}</em></div>`).join('')}</div>
    <button class="btn btn-a mt2" data-go="lanzar">${I.mic}Lanzar una botella</button></div>
  ${pend.length ? `<p class="eyebrow" style="margin-top:20px">${pend.length === 1 ? 'Te respondieron. Escucha.' : `${pend.length} respuestas por escuchar`}</p>
  <div class="anscards">${pend.map(({ a: [v, th, c], x, i }) => `<div class="anscard" style="--c:${c}" data-v="${v}${i}"><p class="awho"><i></i>Alguien que ama ${esc(th)} respondió a tu ${esc(x.kind.toLowerCase())}${x.idea ? `: “${esc(x.idea)}”` : ''}</p>${player(v, { real: true })}<div class="aact"><button class="chip sm" data-go="charlas">${I.mic}Responder</button></div></div>`).join('')}</div>` : ''}
  <p class="eyebrow" style="margin-top:24px">Las que mandaste</p>
  <div class="bcards">${S.sent.length ? S.sent.map((x, i) => `<button class="bcard" style="--c:${tc(x.tema)}" data-i="${i}"><span class="mb">${voiceBottle(tc(x.tema), null, corkOf(x))}</span><span class="tx"><small class="btag"><i></i>Tu ${esc(x.kind.toLowerCase())} · ${esc(x.tema)} · ${esc(x.when)}</small><b>${x.idea ? esc(x.idea) : `Una ${esc(x.kind.toLowerCase())} solo con tu voz`}</b>${reachRow(x)}<small>${x.ans ? `<em class="hasans">${n_(x.ans, 'respuesta', 'respuestas')}</em> · ` : ''}Llegó a ${reachOf(x)} personas${x.heard ? `, ${x.heard} ya la escucharon` : ''}${x.far ? ' · con empujón' : ''}</small></span></button>`).join('') : `<div class="bempty"><span class="mb">${voiceBottle('#7FD8C9')}</span><p class="sub">Todavía no lanzas ninguna. Graba una pregunta y le llega a toda la gente que ama lo mismo que tú.</p></div>`}</div>
  ${S.sent.length ? `<p class="eyebrow" style="margin-top:24px">En números</p><div class="hero-n mt1"><b class="cnt" data-n="${heard}">${heard}</b><p>personas recibieron tus botellas.</p><small>${n_(S.sent.length, 'botella lanzada', 'botellas lanzadas')} · ${ans === 1 ? 'una persona te respondió' : `${ans} personas te respondieron`}</small></div>` : ''}
  <div class="mias mt3"><p class="eyebrow" style="margin:0">Muelle</p><h2 class="mias-t">Cómo conseguir más botellas</h2>
    <div class="mias-l">${[['', 'Normales', 'Una cada día y otra por cada botella que respondes.'], ['far', 'Llegan lejos', 'Al terminar tu primer día y a los 10 días seguidos.'], ['tide', 'Doradas', 'A los 2 días seguidos y cada lunes, si esa semana respondiste a alguien.'], ['gift', 'De regalo', 'A los 5 y a los 21 días seguidos.']].map(([k, t, d]) => `<div class="mia"><span class="art">${voiceBottle(tc(S.temas[0]), null, k)}</span><span class="tx"><b>${t}</b><small>${d}</small></span></div>`).join('')}</div>
    <button class="btn btn-2 mt2" data-go="muelle">Ver el Muelle</button></div>`,
  bind(el) {
    $$('.anscard', el).forEach(c => $('.player', c).addEventListener('click', () => { const k = c.dataset.v; X.heardAns = [...new Set([...(X.heardAns || []), k])]; saveX(); }));
    $$('[data-i]', el).forEach(b => b.onclick = () => { const i = +b.dataset.i, x = S.sent[i], reach = reachOf(x), as = ansOf(x, i);
      sheet(`<p class="btag" style="--c:${tc(x.tema)};margin:6px 0 0"><i></i>Tu ${esc(x.kind.toLowerCase())} · ${esc(x.tema)}</p><h2 class="title mt1">${x.idea ? esc(x.idea) : `Una ${esc(x.kind.toLowerCase())} solo con tu voz`}</h2>
      <div class="hero-n sm mt2"><b>${reach}</b><p>personas recibieron esta botella.</p><small>${x.heard} ya la escucharon · ${x.ans === 1 ? 'una respondió' : `${x.ans || 0} respondieron`}</small></div>
      ${as.length ? `<div class="row-btns mt2">${as.map(([v, th]) => `<div class="mini"><small>Alguien que ama ${esc(th)}</small>${player(v, { real: true })}</div>`).join('')}</div>` : '<p class="cap mt2">Sigue viajando hasta que alguien te responda.</p>'}
      <div class="row-btns mt3"><button class="btn btn-q" id="del">Retirarla del mar</button></div>`, (s2, close) => {
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
  <p class="sub mt1">${tot} personas te respondieron. El tema más cercano al centro es el que más respuestas te dio.</p>
  <svg class="mapsvg" viewBox="0 0 100 100" role="img" aria-label="Temas con los que conectó tu voz"><circle class="orbit" cx="50" cy="50" r="34"/>
    ${pts.map(p => `<line x1="50" y1="50" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${p.c}" stroke-opacity=".35" stroke-width="${(.3 + p.n * .12).toFixed(2)}"/>`).join('')}
    ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1.6 + p.n * .55).toFixed(1)}" fill="${p.c}"/><text x="${p.x.toFixed(1)}" y="${(p.y + 5.4 + p.n * .55).toFixed(1)}" text-anchor="middle">${p.t}</text>`).join('')}
    <circle class="home" cx="50" cy="50" r="3.4"/><text class="you" x="50" y="58.5" text-anchor="middle">Tu voz</text></svg>
  <div class="list">${P.map(([t, n, c]) => `<div class="item" style="min-height:52px"><i class="orb" style="background:${c};width:10px;height:10px"></i><span class="tx"><b>${t}</b></span><span class="cap">${n_(n, 'persona', 'personas')}</span></div>`).join('')}</div>` }; };

// Racha: días seguidos grabando tu voz (una botella, una respuesta o una pregunta para amigos).
const UNLOCK = [[2, 'Una botella dorada', '#FFC24B'], [3, 'Vidrio coral', '#FF8E7A'], [5, 'Una botella de regalo', '#FFB061'], [7, 'Vidrio violeta', '#B49CFF'], [10, 'Una que llega lejos', '#8E8CFF'], [14, 'Vidrio aurora', '#7FD8C9'], [21, 'Dos botellas de regalo', '#FFB061'], [30, 'Vidrio de luna', '#DCE6F0']];
R.bitacora = () => { const n = streak(), done = recToday(), nx = UNLOCK.find(u => u[0] > n), prev = (UNLOCK.filter(u => u[0] <= n).pop() || [0])[0];
  return { cls: 'pin', html: `
  ${back()}
  <div class="rhead mt1"><span class="rnum">${n}</span><h1 class="title">${n === 1 ? 'día seguido' : 'días seguidos'} grabando tu voz.</h1></div>
  <p class="sub mt2">Cuenta cada día en que grabas algo: una botella, una respuesta o una pregunta para tus amigos.</p>
  <div class="week mt3">${weekStrip()}</div>
  <div class="todayc mt3 ${done ? 'ok' : ''}">${done ? `${I.check}<span><b>Hoy ya grabaste.</b><small>Vuelve mañana y llegas a ${n + 1}.</small></span>` : `${I.mic}<span><b>Hoy todavía no grabas.</b><small>Graba algo hoy y sumas un día más.</small></span><button class="chip sm" data-go="lanzar">Grabar</button>`}</div>
  ${nx ? `<div class="next mt2"><span class="cap">Con ${nx[0]} días seguidos te regalamos</span><b>${nx[1]}</b><span class="bar"><i style="width:${Math.max(8, (n - prev) / (nx[0] - prev) * 100)}%"></i></span><span class="cap">${nx[0] - n === 1 ? 'Falta 1 día' : `Faltan ${nx[0] - n} días`}</span></div>` : ''}
  <p class="eyebrow">Regalos por días seguidos</p>
  <div class="gifts">${UNLOCK.map(([d, t, c]) => `<div class="gft${d <= n ? ' got' : ''}"><span class="art">${bottleSVG(c)}</span><b>${t}</b><small>${d <= n ? 'Ya es tuyo' : `A los ${d} días`}</small></div>`).join('')}</div>` }; };

// Botellas doradas: ya no tienen pantalla aparte. Salen primero en el Mar; la ruta vieja lleva allí.
R.marea = () => R.mar();

// Salidas en grupo: planes en lugares públicos.
R.salidas = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Salidas en grupo</h1>
  <p class="sub mt1">En lugares públicos. Cada uno paga lo suyo.</p>
  <div class="outs mt3">${S.outs.map((o, i) => { const [day, hr] = o.when.split(' · '), night = /8:|9:|10:/.test(hr || ''); return `<article class="out2${night ? ' night' : ''}" style="--c:${tc(o.tema)};--d:${i * 70}ms">
    <div class="opost" aria-hidden="true"><span class="osun"></span><span class="osea"></span><span class="olab">${I.pin}${esc(o.where)}</span></div>
    <div class="obody"><p class="otag"><i></i>Para quien ama ${esc(AMA[o.tema] || o.tema)}</p><h3>${esc(o.t)}</h3>
      <p class="otime"><b>${esc(hr || '')}</b><span>${esc(day || '')}</span></p>
      <div class="ofoot"><span class="ovoices" aria-label="${o.n} personas van">${Array.from({ length: Math.min(o.n, 3) }, (_, j) => voiceMark('xs', fakePeaks(j + i * 3), [TC[TEMAS[(j * 5 + i) % 12]], '#F4EFE7', TC[TEMAS[(j * 3 + i) % 12]]])).join('')}<em>${o.n} van${o.max - o.n ? ` · quedan ${o.max - o.n}` : ' · completa'}</em></span><button class="gobtn" data-i="${i}" aria-pressed="${o.go}">${o.go ? `${I.check}Vas` : 'Voy'}</button></div></div></article>`; }).join('')}</div>
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
  <h1 class="title mt1">¿Qué quieres que te respondan?</h1><p class="sub mt1 mb3">Elige una y grábala con tu voz.</p>
  <div class="row-btns" id="qs">${Q.map(t => `<button class="idea" aria-pressed="${t === q}">${t}</button>`).join('')}</div>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`,
  bind(el) { $$('#qs .idea', el).forEach(b => b.onclick = () => { q = b.textContent; $$('#qs .idea', el).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    recUI(el, 'Desliza para crear el enlace', () => { S.lec.unshift({ q, ans: [] }); saveX(); go('lecturas');
      sheet(`<h2 class="title">Mándalo a tus amigos</h2><p class="sub">Responden sin cuenta, solo con su voz.</p><div class="inp mt2" style="display:flex;align-items:center;color:var(--fg-2);font-size:14px">botella-app.vercel.app/l/TU-LECTURA</div><div class="row-btns mt2"><button class="btn btn-a" id="cp">Copiar enlace</button></div>`, (s, close) => $('#cp', s).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); close(); toast('Enlace copiado'); }); }, '<p class="cap center" style="margin:0 0 6px">Grábala con tu voz</p>'); } }; };
R.lectura = ({ i = 0 }) => { const l = S.lec[i] || S.lec[0]; return { cls: 'pin', html: `
  ${back('lecturas')}
  <h1 class="title mt1">${esc(l.q)}</h1>
  ${l.ans.length ? `<p class="sub mt1">Escucha primero. Después ves quién fue.</p>
  <div class="row-btns mt3">${l.ans.map(([v, who], j) => `<div class="paper lec" style="padding:14px 16px" data-j="${j}">${player(v, { real: true })}<span class="lecrow"><button class="reveal" disabled>Dale play y descubre quién fue</button><b class="who-is" hidden>${esc(who)}</b><button class="ib sm lecmore" aria-label="Opciones de esta respuesta">${I.more}</button></span></div>`).join('')}</div>`
  : '<p class="sub mt1">Todavía nadie responde. Cuando alguien lo haga, te avisamos.</p>'}`,
  bind(el) { $$('.lec', el).forEach(c => { const r = $('.reveal', c); $('.player', c).addEventListener('click', () => { r.disabled = false; r.textContent = '¿Quién fue?'; }); r.onclick = () => { r.hidden = true; $('.who-is', c).hidden = false; };
      $('.lecmore', c).onclick = () => sheet(`<h2 class="title">Esta respuesta</h2><p class="sub">Quien la grabó no se entera de lo que elijas.</p><div class="row-btns mt2"><button class="btn btn-2" id="lb">Borrarla</button><button class="btn btn-2" id="lr">Reportarla</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (sh, close) => {
        const drop = msg => { close(); const j = +c.dataset.j; l.ans.splice(j, 1); saveX(); go('lectura', { i, nohash: true }); toast(msg); };
        $('#lb', sh).onclick = () => drop('Respuesta borrada'); $('#lr', sh).onclick = () => { track('reporte_creado', { lectura: true }); drop('Gracias. La vamos a revisar y ya no la ves.'); }; }); }); } }; };

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
  bind(el) { const sl = $('#sl', el); sl && slider(sl, 'Desliza al mar', () => { S.mine = { kind: 'Historia', tema: S.temas[0], idea: 'Botella para dos', heard: 0, duo: true }; S.sent.unshift({ ...S.mine, ans: 0, when: 'Ahora' }); S.duo = null; saveX(); track('botella_lanzada', { duo: true }); go('lanzada'); });
    $('#share', el) && ($('#share', el).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); toast('Enlace copiado'); });
    $('#sim', el) && ($('#sim', el).onclick = () => { d.friend = true; saveX(); go('dos', { nohash: true }); });
    $('#del', el).onclick = () => { S.duo = null; saveX(); go('dos', { nohash: true }); }; } }
  : { html: `
  ${back()}
  <h1 class="title mt1">Botella para dos</h1>
  <p class="sub mt1">Tu voz y la de un amigo viajan juntas en una sola botella. Empieza con 20 personas.</p>
  <div class="pair merge mt3" aria-hidden="true"><span class="pb1">${voiceBottle(myColors()[0], myPk())}</span><span class="pglow"></span><span class="pb2">${voiceBottle('#7CC8FF')}</span></div>
  <p class="cap center pstep">Graba tu mitad. Después tu amigo graba la suya.</p>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`,
  bind(el) { recUI(el, 'Desliza para invitar', r => { S.duo = { url: r.url, secs: r.secs, friend: false }; saveX(); go('dos'); toast('Enlace copiado. Mándaselo a tu amigo.'); }); } }; };

// ---------- arranque ----------
const start = () => { const h = location.hash.slice(1), rt = store.get('route'); go(R[h] ? h : (store.get('onb') ? 'mar' : 'bienvenida'), rt && rt.n === h ? rt.p : {}); };
if (window.Mar) start(); else { let started = false; const s = () => { if (!started) { started = true; start(); } }; addEventListener('mar-ready', s, { once: true }); setTimeout(() => { if (!window.Mar) document.documentElement.classList.add("no3d"); s(); }, 2500); }
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (R[h] && h !== curName) go(h, { nohash: true }); });
window.__go = go;
}
