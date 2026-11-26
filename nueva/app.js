// Botella · nueva. Prototipo navegable con datos de ejemplo. Una pantalla = una cosa.
{
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app'), tabs = $('#tabs'), sheetRoot = $('#sheet-root');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
const AMA = { 'Música': 'la música', 'Cine': 'el cine', 'Libros': 'los libros', 'Comida': 'la comida', 'Viajes': 'viajar', 'La ciudad': 'la ciudad', 'Fútbol': 'el fútbol', 'Arte': 'el arte', 'Tecnología': 'la tecnología', 'Filosofía': 'la filosofía', 'Amor': 'el amor', 'Trabajo': 'su trabajo' };
const IDEAS = { Pregunta: ['¿Qué canción te devuelve a tus 15 años?', '¿Cuál es tu huarique favorito?', '¿Qué harías si mañana no tuvieras que trabajar?'], Confesión: ['Algo que nunca le he dicho a nadie…', 'Lo que más extraño de cuando era niño', 'Una costumbre rara que tengo'], Historia: ['Lo más raro que me pasó en una combi', 'El mejor día de este año', 'Cómo conocí a mi mejor amigo'] };
const S = {
  shore: store.get('shore', ['caro', 'ivan']),
  name: store.get('name', ''),
  convs: store.get('convs', null) || {
    leo: { stage: 0, unread: true, when: '9:41', msgs: [{ f: 'them', v: 'leo-say' }, { f: 'me', v: 'answer-1' }, { f: 'them', v: 'leo-reply' }] },
    belen: { stage: 0, when: 'Ayer', msgs: [{ f: 'them', v: 'belen-say' }, { f: 'me', v: 'answer-1' }] }
  },
  temas: store.get('temas', ['Música', 'Cine', 'La ciudad']),
  left: store.get('left', 4),
  mine: store.get('mine', null)
};
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
let tt; function toast(t, c = '#7FD8C9') { $$('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = `<i class="orb" style="background:${c}"></i>${esc(t)}`; document.body.append(d); clearTimeout(tt); tt = setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 220); }, 2600); }

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

// ================= PANTALLAS =================

// Bienvenida: una frase, un botón.
R.bienvenida = () => ({ cls: 'clear', mar: 'hero', html: `
  <div class="top"><span class="wm">botella</span></div>
  <div class="grow"></div>
  <h1 class="display">Te escuchan<br><span class="light">antes de verte.</span></h1>
  <p class="sub mt2 mb3">Una voz, una pregunta, ocho personas.</p>
  <div class="row-btns"><button class="btn btn-a" data-go="abrir" data-p='{"id":"majo","first":true}'>Abrir mi primera botella</button>
  <button class="btn btn-q" data-go="entrar">Ya tengo cuenta</button></div>` });

// Abrir: mantener para descorchar → papel crema con la voz.
R.abrir = ({ id = 'majo', first = false }) => { const b = B[id]; return { cls: 'clear', mar: 'open', html: `
  <div class="top"><button class="ib edge" data-go="${first ? 'bienvenida' : 'mar'}" aria-label="Cerrar">${I.x}</button><span class="cap">${esc(b.kind)}</span><span style="width:44px"></span></div>
  <div class="grow center" id="fallback"></div>
  <div id="stage">
    <p class="head center">Alguien que ama ${esc(b.theme)} te escribió.</p>
    <div class="mt3"><button class="hold" id="hold" aria-label="Mantén para abrir"><svg class="r" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47"/></svg><svg class="ico" viewBox="0 0 24 24"><path d="M9 3h6v4H9zM10 7v3l-3 3v7.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5V13l-3-3V7"/></svg></button></div>
    <p class="cap center mt2">Mantén para abrir</p>
  </div>`,
  bind(el) {
    if (!window.Mar || !Mar.ok) $('#fallback', el).innerHTML = `<div style="width:62%;margin:12vh auto 0;transform:rotate(-14deg)">${bottleSVG(b.c)}</div>`;
    const h = $('#hold', el), ring = $('circle', h); let t0 = 0, raf, done = false;
    const tick = () => { const p = Math.min(1, (performance.now() - t0) / 900); ring.style.strokeDashoffset = 295 * (1 - p); window.Mar && Mar.uncork(p * .7); if (p >= 1) return open(); raf = requestAnimationFrame(tick); };
    const down = e => { if (done) return; e.preventDefault(); t0 = performance.now(); tick(); };
    const up = () => { if (done) return; cancelAnimationFrame(raf); ring.style.transition = 'stroke-dashoffset .3s'; ring.style.strokeDashoffset = 295; setTimeout(() => ring.style.transition = '', 300); window.Mar && Mar.uncork(0); };
    h.addEventListener('pointerdown', down); h.addEventListener('pointerup', up); h.addEventListener('pointerleave', up);
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    function open() {
      done = true; navigator.vibrate && navigator.vibrate(12);
      let c = .7; const pop = () => { c = Math.min(1, c + .03); window.Mar && Mar.uncork(c); if (c < 1) requestAnimationFrame(pop); }; pop();
      $('#stage', el).innerHTML = `<article class="paper in"><p class="who"><i class="orb" style="background:${b.c}"></i>Alguien que ama ${esc(b.theme)}</p><p class="q">${esc(b.q)}</p>${player(b.v)}</article>
        <div class="row-btns mt2"><button class="btn btn-a" id="reply">${I.mic}Responder con mi voz</button><button class="btn btn-q" id="pass">Devolverla al mar</button></div>`;
      $('#reply', el).onclick = () => go('grabar', { id, first });
      $('#pass', el).onclick = () => { S.shore = S.shore.filter(x => x !== id); save(); first ? go('cuenta') : (go('mar'), toast('Volvió al mar. Le llegará a otra persona.')); };
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
    recUI(el, 'Desliza para enviar', r => {
      if (first) { store.set('pending', { id }); go('cuenta'); }
      else { S.shore = S.shore.filter(x => x !== id); S.convs[id] = { stage: 0, when: 'Ahora', msgs: [{ f: 'them', v: b.v }, { f: 'me', v: r.url || 'mine', s: r.secs }] }; save(); go('mar'); toast('Enviada. Te avisamos cuando responda.'); }
    });
  } }; };

// Bloque de grabación compartido: micrófono → onda en vivo → escuchar → deslizar.
function recUI(el, slideLabel, onSend, hintTop = '') {
  const rw = $('#rw', el), after = $('#after', el); let rec = null;
  const idle = () => { rw.innerHTML = `${hintTop}<button class="mic" id="mic" aria-label="Grabar">${I.mic}</button><p class="cap">Toca para grabar · hasta 60 s</p>`; after.innerHTML = ''; $('#mic', el).onclick = start; };
  const start = async () => {
    rw.innerHTML = `<div class="timer" id="tm">0:00</div><div class="livewave" id="lw">${'<i></i>'.repeat(28)}</div><button class="mic live" id="mic" aria-label="Terminar"><span class="sq"></span></button><p class="cap">Toca para terminar</p>`;
    const bars = $$('#lw i', el);
    rec = recorder((t, lv) => { $('#tm', el).textContent = fmt(t); bars.forEach((b, i) => b.style.height = (4 + (lv[i] || 0) * 40) + 'px'); if (t >= 60) stop(); });
    $('#mic', el).onclick = stop; await rec.start();
  };
  const stop = async () => {
    if (!rec) return; const r = await rec.stop(); rec = null; const secs = Math.max(3, Math.round(r.secs));
    rw.innerHTML = `<div style="width:100%;padding:14px 16px;border-radius:22px;background:rgba(244,239,231,.06)">${player(r.url || 'mine' + secs, { mine: true, secs })}</div><button class="btn btn-q" id="again">Grabar otra vez</button>`;
    $('#again', el).onclick = idle;
    after.innerHTML = `<div class="slide" id="sl"></div>`; slider($('#sl', el), slideLabel, () => onSend({ url: r.url, secs }));
  };
  idle();
}

// Cuenta: tres campos, una promesa.
R.cuenta = () => ({ html: `
  <div class="top"><span class="wm">botella</span></div>
  <h1 class="title mt2">Guarda tu lugar.</h1>
  <p class="sub mt1 mb3">Tu nombre nadie lo ve hasta que tú quieras.</p>
  <form id="f" class="grow" autocomplete="on">
    <label class="field"><span>Tu nombre</span><input class="inp" name="n" required autocomplete="given-name"></label>
    <label class="field"><span>Correo</span><input class="inp" name="e" type="email" required autocomplete="email"></label>
    <label class="field"><span>Contraseña</span><input class="inp" name="p" type="password" minlength="6" required autocomplete="new-password"></label>
    <label class="cap" style="display:flex;gap:10px;align-items:center;margin:6px 4px 0"><input type="checkbox" required style="width:20px;height:20px;accent-color:#7FD8C9"> Tengo 18 años o más</label>
  </form>
  <button class="btn btn-a mt3" form="f">Seguir</button>`,
  bind(el) { $('#f', el).onsubmit = e => { e.preventDefault(); S.name = new FormData(e.target).get('n').trim(); save(); go('temas'); }; } });

// Temas: lo único que se muestra de ti antes del nombre.
R.temas = ({ edit = false } = {}) => { const T = TEMAS; return { html: `
  <div class="top"><button class="ib edge" data-go="${edit ? 'perfil' : 'cuenta'}" aria-label="Atrás">${I.back}</button><span class="cap">${edit ? '' : '2 de 2'}</span><span style="width:44px"></span></div>
  <h1 class="title mt2">${edit ? 'Tus temas' : '¿Qué te mueve?'}</h1>
  <p class="sub mt1 mb3">Elige tres. Tus botellas llegan a quien ama lo mismo.</p>
  <div class="chips" id="ch">${T.map(t => `<button class="chip" aria-pressed="${edit && S.temas.includes(t)}">${t}</button>`).join('')}</div>
  <label class="field mt4"><span style="display:flex;justify-content:space-between">Tu distrito <i class="lock" style="font-style:normal">${I.lock}Nunca se muestra</i></span>
  <select class="inp"><option>Barranco</option><option>Jesús María</option><option>Lince</option><option>Miraflores</option><option>San Isidro</option><option>Surco</option><option>Otro</option></select></label>
  <div class="grow"></div>
  <button class="btn btn-a mt3" id="go" ${edit ? '' : 'disabled style="opacity:.4"'}>${edit ? 'Guardar' : 'Entrar al mar'}</button>`,
  bind(el) { const sel = () => $$('.chip[aria-pressed=true]', el).length; $$('.chip', el).forEach(c => c.onclick = () => { if (c.getAttribute('aria-pressed') === 'false' && sel() >= 3) return; c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'false'); const ok = sel() === 3; $('#go', el).disabled = !ok; $('#go', el).style.opacity = ok ? 1 : .4; });
    $('#go', el).onclick = () => { S.temas = $$('.chip[aria-pressed=true]', el).map(c => c.textContent); save(); if (edit) { go('perfil'); toast('Temas guardados'); return; } const p = store.get('pending'); if (p) { const b = B[p.id]; S.convs[p.id] = { stage: 0, when: 'Ahora', msgs: [{ f: 'them', v: b.v }, { f: 'me', v: 'answer-1' }] }; store.set('pending', null); save(); } store.set('onb', 1); go('mar'); toast('Tu respuesta llegó.'); }; } }; };

// Entrar y recuperar contraseña.
R.entrar = () => ({ html: `
  <div class="top"><button class="ib edge" data-go="bienvenida" aria-label="Atrás">${I.back}</button><span></span><span style="width:44px"></span></div>
  <h1 class="title mt2 mb3">Hola de nuevo.</h1>
  <form id="f"><label class="field"><span>Correo</span><input class="inp" type="email" required autocomplete="email"></label>
  <label class="field"><span>Contraseña</span><input class="inp" type="password" required autocomplete="current-password"></label></form>
  <button class="btn btn-q" style="width:auto;align-self:flex-start;padding:0 4px" data-go="olvide">Olvidé mi contraseña</button>
  <div class="grow"></div><button class="btn btn-a" form="f">Entrar</button>`,
  bind(el) { $('#f', el).onsubmit = e => { e.preventDefault(); store.set('onb', 1); go('mar'); }; } });
R.olvide = () => ({ html: `
  <div class="top"><button class="ib edge" data-go="entrar" aria-label="Atrás">${I.back}</button><span></span><span style="width:44px"></span></div>
  <h1 class="title mt2">¿Olvidaste tu contraseña?</h1><p class="sub mt1 mb3">Te mandamos un enlace para crear otra.</p>
  <form id="f"><label class="field"><span>Correo</span><input class="inp" type="email" required autocomplete="email"></label></form>
  <div class="grow"></div><button class="btn btn-a" form="f">Enviar enlace</button>`,
  bind(el) { $('#f', el).onsubmit = e => { e.preventDefault(); go('entrar'); toast('Listo. Revisa tu correo.'); }; } });

// Mar: lo que te llegó, tu botella y la pregunta de hoy. Nada más.
R.mar = () => { const n = S.shore.length; const pos = [[6, 6], [52, 30], [30, 17]]; return { cls: 'tabbed', html: `
  <div class="top"><span class="wm">botella</span><button class="avatar" data-go="perfil" aria-label="Tu perfil">${esc((S.name || 'T')[0].toUpperCase())}</button></div>
  <h1 class="title mt2">${n ? `${n === 1 ? 'Llegó una botella' : `Llegaron ${n} botellas`}` : 'El mar está tranquilo'}</h1>
  <p class="sub mt1">${n ? 'Toca una para abrirla.' : 'Lanza la tuya mientras tanto.'}</p>
  <div class="shore"><div class="stars"></div><div class="moon"></div>
    ${S.shore.map((id, i) => `<button class="float" style="left:${pos[i][0]}%;bottom:${pos[i][1]}%" data-go="abrir" data-p='{"id":"${id}"}' aria-label="Abrir botella de ${esc(B[id].tag)}">${bottleSVG(B[id].c)}<span>${esc(B[id].tag)}</span></button>`).join('')}
  </div>
  <div class="list mt2">
    ${S.mine ? `<button class="item" id="mine"><span class="ic">${I.bottle}</span><span class="tx"><b>Tu ${esc(S.mine.kind.toLowerCase())} sobre ${esc(S.mine.tema.toLowerCase())}</b><small>${S.mine.heard ? `${S.mine.heard} de 8 ya la oyeron` : 'En camino a 8 personas'}</small></span><span class="reach sm">${Array.from({ length: 8 }, (_, i) => `<i class="${i < S.mine.heard ? 'heard' : 'on'}"></i>`).join('')}</span></button>` : ''}
    <button class="item" id="today"><span class="ic">${I.moon}</span><span class="tx"><b>¿Qué le dirías a tu yo de hace diez años?</b><small>${store.get('hoy') ? 'Escucha lo que respondieron otros' : 'Pregunta de hoy · responde con tu voz'}</small></span>${I.chev}</button>
  </div>`,
  bind(el) {
    $('#mine', el) && ($('#mine', el).onclick = () => go('botellas'));
    $('#today', el).onclick = () => go('hoy');
  } }; };

// Lanzar: tipo → grabar (lo principal) → ideas solo si las pides → deslizar.
R.lanzar = ({ idea = '', dorada = false } = {}) => { let kind = 'Pregunta', tema = S.temas[0]; const P = { Pregunta: '¿Qué quieres preguntar?', Confesión: '¿Qué quieres confesar?', Historia: '¿Qué quieres contar?' };
  if (S.left <= 0) return { html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span></span><span style="width:44px"></span></div>
  <div class="grow"></div><h1 class="title">Por hoy lanzaste todas.</h1><p class="sub mt1">Mañana tienes 4 más. Si invitas a alguien, te damos una ahora.</p><div class="grow"></div>
  <button class="btn btn-2" data-go="perfil">Invitar a alguien</button>` };
  return { html: `
  <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span class="cap">${dorada ? 'Dorada · sale a las 21:00' : S.left === 1 ? 'Te queda 1 botella' : `Te quedan ${S.left} botellas`}</span><span style="width:44px"></span></div>
  <div class="seg mt1" id="seg">${Object.keys(P).map(k => `<button aria-pressed="${k === kind}">${k}</button>`).join('')}</div>
  <div class="chips mt2" id="tm" role="radiogroup" aria-label="Sobre qué">${S.temas.map(t => `<button class="chip" role="radio" aria-pressed="${t === tema}">${esc(t)}</button>`).join('')}</div>
  <h1 class="title mt3" id="pq">${P[kind]}</h1>
  <p class="sub mt1" id="idea" ${idea ? '' : 'hidden'}>${esc(idea)}</p>
  <div class="grow"></div>
  <div class="rec-wrap" id="rw"></div>
  <div class="grow"></div>
  <div id="after"></div>
  <button class="btn btn-q" id="ideas">¿Sin ideas?</button>`,
  bind(el) {
    $$('#seg button', el).forEach(b => b.onclick = () => { kind = b.textContent; $$('#seg button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); $('#pq', el).textContent = P[kind]; });
    $$('#tm .chip', el).forEach(b => b.onclick = () => { tema = b.textContent; $$('#tm .chip', el).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    const ideas = $('#ideas', el);
    ideas.onclick = () => sheet(`<h2 class="title">Ideas para ${kind === 'Pregunta' ? 'preguntar' : kind === 'Confesión' ? 'confesar' : 'contar'}</h2><p class="sub">Tócala y dila con tus palabras.</p>${IDEAS[kind].map(t => `<button class="idea">${esc(t)}</button>`).join('')}`, (s, close) => $$('.idea', s).forEach(b => b.onclick = () => { const p = $('#idea', el); p.hidden = false; p.textContent = b.textContent; close(); }));
    recUI(el, 'Desliza al mar', () => { const p = $('#idea', el); if (dorada) X.tide = Math.max(0, X.tide - 1); else S.left = Math.max(0, S.left - 1); S.mine = { kind, tema, idea: p.hidden ? '' : p.textContent, heard: 0, dorada }; S.sent.unshift({ ...S.mine, ans: 0, when: 'Ahora' }); saveX(); go('lanzada'); });
    new MutationObserver(() => ideas.hidden = !!$('#sl', el)).observe($('#after', el), { childList: true });
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

// Lanzada: el momento alto. 8 luces se encienden; 4 esperan.
R.lanzada = () => { const t = S.mine ? S.mine.tema : S.temas[0]; return { cls: 'clear', mar: 'away', html: `
  <div class="grow"></div>
  <h1 class="display center">Va en camino.</h1>
  <div class="reach big mt3" id="rb">${'<i></i>'.repeat(8)}<span class="sep"></span>${'<i class="later"></i>'.repeat(4)}</div>
  <p class="sub center mt2">Llega a 8 personas que aman ${esc(AMA[t] || t.toLowerCase())}. Si nadie responde en 6 horas, a 4 más.</p>
  <button class="btn btn-2 mt4" data-go="mar">Volver al mar</button>`,
  bind(el) { $$('#rb i:not(.later)', el).forEach((d, i) => setTimeout(() => d.classList.add('on'), (window.Mar && Mar.ok ? 2600 : 400) + i * 180)); } }; };

// Conversaciones.
const stepsHTML = (st, cls = '') => `<span class="steps ${cls}">${[0, 1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</span>`;
R.charlas = () => { const ids = Object.keys(S.convs); return { cls: 'tabbed', html: `
  <div class="top"><span class="wm">botella</span><button class="avatar" data-go="perfil" aria-label="Tu perfil">${esc((S.name || 'T')[0].toUpperCase())}</button></div>
  <h1 class="title mt2 mb2">Conversaciones</h1>
  ${ids.length ? `<div class="list">${ids.map(id => { const c = S.convs[id], b = B[id]; const last = c.msgs[c.msgs.length - 1]; return `
    <button class="item" data-go="chat" data-p='{"id":"${id}"}'><i class="orb" style="background:${b.c};width:12px;height:12px"></i>
    <span class="tx"><b>${c.stage >= 1 && b.name ? esc(b.name) : `Alguien que ama ${esc(b.theme)}`}</b><small>${last.f === 'them' ? 'Te respondió' : 'Esperando su voz'}</small></span>
    <span style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="when">${esc(c.when)}</span>${c.unread ? '<i class="unread"></i>' : stepsHTML(c.stage, 'mini')}</span></button>`; }).join('')}</div>`
  : `<p class="sub">Cuando respondas una botella, la conversación aparece aquí.</p>`}
  ${S.shore.length ? `<div class="grow"></div><button class="item waiting" data-go="mar"><span class="ic">${I.bottle}</span><span class="tx"><b>${S.shore.length === 1 ? 'Una botella te espera' : `${S.shore.length} botellas te esperan`}</b><small>Cada una puede ser tu próxima conversación</small></span>${I.chev}</button>` : ''}` }; };

// Chat: la ficha arriba (pregunta y pasos), las voces al medio, el siguiente paso y el micrófono abajo.
const STEP = ['Voces', 'Nombres', 'Llamada', 'Plan'];
R.chat = ({ id = 'leo' }) => { const b = B[id], c = S.convs[id]; c.unread = false; save(); const who = () => c.stage >= 1 && b.name ? b.name : `Alguien que ama ${b.theme}`; return { cls: 'chat', html: `
  <div class="top"><button class="ib" data-go="charlas" aria-label="Atrás">${I.back}</button><span class="mid" id="who">${esc(who())}</span><button class="ib" id="menu" aria-label="Más opciones">${I.more}</button></div>
  <div class="ficha"><p class="q">“${esc(b.q)}”</p><div id="st"></div></div>
  <div class="thread" id="th"></div>
  <div class="dock"><button class="next" id="next"></button><button class="rec" id="rec" aria-label="Grabar nota de voz">${I.mic}</button></div>`,
  bind(el) {
    const th = $('#th', el), st = $('#st', el), next = $('#next', el);
    const counts = () => ({ them: c.msgs.filter(m => m.f === 'them').length, me: c.msgs.filter(m => m.f === 'me').length });
    const msgHTML = m => m.f === 'sys' ? `<p class="sys">${m.t}</p>` : m.f === 'plan' ? `<div class="plan"><small>${m.ok ? 'Plan aceptado' : 'Propusiste'}</small><b>${esc(m.t)}</b></div>` : `<div class="msg ${m.f}">${player(m.v, { mine: m.f === 'me', secs: m.s })}</div>`;
    const draw = () => {
      th.innerHTML = c.msgs.map(msgHTML).join(''); $('#who', el).textContent = who();
      st.innerHTML = `${stepsHTML(c.stage)}<div class="lbls">${STEP.map((s, i) => i === c.stage ? `<b>${s}</b>` : `<span>${s}</span>`).join('')}</div>`;
      const k = counts(), need = Math.max(0, 2 - k.them) + Math.max(0, 2 - k.me);
      const N = [
        need ? [`Nombres en ${need} ${need === 1 ? 'nota' : 'notas'} más`, null] : [`${I.eye}Compartir mi nombre`, askName],
        [`${I.phone}Pedir una llamada`, askCall], [`${I.plan}Proponer un plan`, askPlan], [`${I.check}Plan listo`, null]][c.stage];
      next.innerHTML = N[0]; next.disabled = !N[1]; next.onclick = N[1];
      requestAnimationFrame(() => el.scrollTop = el.scrollHeight);
    };
    const push = m => { c.msgs.push(m); save(); draw(); };
    function askName() { sheet(`<h2 class="title">¿Compartir tu nombre?</h2><p class="sub">Solo se muestra si los dos aceptan.</p><div class="row-btns"><button class="btn btn-a" id="y">Compartir</button><button class="btn btn-q" data-close>Todavía no</button></div>`, (s, close) => $('#y', s).onclick = () => { close(); push({ f: 'sys', t: 'Esperando su respuesta…' }); setTimeout(() => { c.msgs.pop(); c.stage = 1; push({ f: 'sys', t: `Ahora saben sus nombres: <b>${esc(b.name)}</b> y <b>${esc(S.name || 'tú')}</b>` }); }, 1800); }); }
    function askCall() { sheet(`<h2 class="title">¿Llamar a ${esc(b.name)}?</h2><p class="sub">Solo voz. Si no puede, no pasa nada.</p><div class="row-btns"><button class="btn btn-a" id="y">${I.phone}Pedir llamada</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s, close) => $('#y', s).onclick = () => { close(); toast(`${b.name} aceptó`); setTimeout(() => go('llamada', { id }), 900); }); }
    function askPlan() { const O = ['Ir al cine el martes', 'Café en el Centro', 'Caminar por el malecón']; sheet(`<h2 class="title">Propón un plan</h2><p class="sub">Un lugar público. Cada uno paga lo suyo.</p>${O.map(t => `<button class="idea">${t}</button>`).join('')}`, (s, close) => $$('.idea', s).forEach(o => o.onclick = () => { close(); push({ f: 'plan', t: o.textContent }); setTimeout(() => { c.msgs[c.msgs.length - 1].ok = true; c.stage = 3; save(); draw(); toast(`${b.name} dijo que sí`); }, 2000); })); }
    $('#menu', el).onclick = () => sheet(`<h2 class="title">${esc(who())}</h2><p class="sub">Nadie se entera de lo que elijas aquí.</p><div class="row-btns"><button class="btn btn-2" id="rp">Reportar</button><button class="btn btn-2" id="bl">Bloquear</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (s, close) => { $('#rp', s).onclick = () => { close(); toast('Gracias. Lo revisamos hoy.'); }; $('#bl', s).onclick = () => { close(); delete S.convs[id]; save(); go('charlas'); toast('Bloqueado. No volverá a escucharte.'); }; });
    // micrófono: toca para grabar, toca para enviar
    let rec = null; const rb = $('#rec', el);
    rb.onclick = async () => {
      if (!rec) { rec = recorder(t => { next.innerHTML = `<span style="color:var(--danger)">●</span> ${fmt(t)} · toca para enviar`; }); rb.classList.add('live'); rb.innerHTML = I.check; next.disabled = true; await rec.start(); return; }
      const r = await rec.stop(); rec = null; rb.classList.remove('live'); rb.innerHTML = I.mic; push({ f: 'me', v: r.url || 'mine' + c.msgs.length, s: Math.max(2, Math.round(r.secs)) });
      if (counts().them < 3 || c.stage === 0) { th.insertAdjacentHTML('beforeend', '<div class="typing"><i></i><i></i><i></i></div>'); el.scrollTop = el.scrollHeight; setTimeout(() => push({ f: 'them', v: `${id}-reply` }), 2400); }
    };
    draw();
  } }; };

// Llamada: solo voz, una esfera que respira.
R.llamada = ({ id = 'leo' }) => { const b = B[id]; return { cls: 'call clear', html: `
  <p class="cap">Llamada de voz</p><h1 class="title">${esc(b.name)}</h1><p class="sub" id="ct">Conectando…</p>
  <div class="voiceorb"></div>
  <button class="hang" id="h" aria-label="Colgar">${I.phone}</button>`,
  bind(el) { let t = 0, iv; setTimeout(() => { audio.src = `v/${id}-call.mp3`; audio.play().catch(() => {}); iv = setInterval(() => { t++; const c = $('#ct', el); c && (c.textContent = fmt(t)); }, 1000); }, 1200);
    $('#h', el).onclick = () => { clearInterval(iv); audio.pause(); const c = S.convs[id]; c.stage = 2; c.msgs.push({ f: 'sys', t: `Llamada · ${fmt(Math.max(t, 1))}` }); save(); go('chat', { id }); }; } }; };

// ================= LO DEMÁS: vive en tu perfil, una pantalla por cosa =================
const X = Object.assign({ color: 0, far: 0, tide: 0, gift: 0, glass: 'Transparente', captain: false, streak: 4 }, store.get('x', {}));
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

// Perfil: el índice de todo lo que no es Mar ni Conversaciones.
R.perfil = () => ({ cls: 'pin', html: `
  ${back('mar')}
  <h1 class="title mt1">${esc(S.name || 'Tú')}</h1><p class="sub mt1">${S.temas.map(esc).join(' · ')}</p>
  <div class="stat"><button data-go="bitacora"><b>${X.streak}</b><span>días seguidos</span></button><button data-go="muelle"><b>${S.left}</b><span>botellas para lanzar</span></button></div>
  <p class="eyebrow">Tu voz</p>
  <div class="list">
    ${row('bottle', 'Mis botellas', n_(S.sent.length, 'lanzada', 'lanzadas'), 'data-go="botellas"')}
    ${row('map', 'El mapa de tu voz', 'Con quién conectó', 'data-go="mapa"')}
    ${row('quote', '¿Qué piensan de ti?', 'Tus amigos responden con su voz', 'data-go="lecturas"')}
  </div>
  <p class="eyebrow">Con más gente</p>
  <div class="list">
    ${row('two', 'Botella para dos', 'Lánzala con un amigo', 'data-go="dos"')}
    ${row('people', 'Salidas en grupo', 'Planes en lugares públicos', 'data-go="salidas"')}
    ${row('gift', 'Invitar a alguien', 'Los dos reciben una botella', 'data-a="inv"')}
  </div>
  <p class="eyebrow">Muelle</p>
  <div class="list">
    ${row('dock', 'Muelle', 'Botellas especiales, gratis en la beta', 'data-go="muelle"')}
    ${row('tide', 'La marea de las 21:00', 'Botellas doradas de todo Lima', 'data-go="marea"')}
  </div>
  <p class="eyebrow">Estilo visual (prueba)</p>
  <div class="seg mt1" id="dir">${['Marea', 'Papel', 'Vidrio', 'Faro', 'Bitácora'].map((t, i) => `<button aria-pressed="${(document.documentElement.dataset.dir || '1') === String(i + 1)}" data-d="${i + 1}">${t}</button>`).join('')}</div>
  <p class="eyebrow">Cuenta</p>
  <div class="list">
    ${row('tag', 'Tus temas', S.temas.join(', '), 'data-a="temas"')}
    ${row('rules', 'Normas de la casa', '', 'data-a="rules"')}
    ${row('key', 'Cambiar contraseña', '', 'data-a="pw"')}
    ${row('out', 'Cerrar sesión', '', 'data-a="out"')}
  </div>`,
  bind(el) { $$('#dir button', el).forEach(b => b.onclick = () => { const d = b.dataset.d; if (d === '1') delete document.documentElement.dataset.dir; else document.documentElement.dataset.dir = d; store.set('estilo', d); try { localStorage.setItem('bn.estilo', d); } catch (e) {} $$('#dir button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $$('[data-a]', el).forEach(b => b.onclick = () => ({
    inv: () => sheet(`<h2 class="title">Invita a alguien</h2><p class="sub">Cuando entre, los dos reciben una botella extra.</p><div class="inp mt2" style="display:flex;align-items:center;color:var(--fg-2);font-size:14px">botella-app.vercel.app/?c=TU-CODIGO</div><div class="row-btns mt2"><button class="btn btn-a" id="cp">Copiar enlace</button></div>`, (s, close) => $('#cp', s).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); close(); toast('Enlace copiado'); }),
    rules: () => sheet(`<h2 class="title">Normas de la casa</h2><div class="list mt2 mb3">${['Coquetear está bien. Lo explícito, no.', 'Sin insultos ni amenazas.', 'Tu distrito nunca se muestra.', 'Puedes reportar o bloquear desde cualquier conversación.'].map(t => `<p class="item" style="margin:0;min-height:52px">${t}</p>`).join('')}</div><button class="btn btn-2" data-close>Entendido</button>`),
    pw: () => go('olvide'), temas: () => go('temas', { edit: true }), out: () => { store.set('onb', 0); go('bienvenida'); }
  }[b.dataset.a]())); } });

// Muelle: en la beta todo es gratis; el precio de después se ve tachado.
const SPECIAL = [
  ['color', 'De color', 'Llega solo a quienes aman un tema que eliges', '2.90', '#FF70A9'],
  ['far', 'Que llega lejos', 'A 20 personas en vez de 8', '5.90', '#8E8CFF'],
  ['tide', 'Dorada', 'Sale primera en la marea de las 21:00', '1.90', '#FFC24B'],
  ['gift', 'Con lacre', 'Un regalo para alguien con quien conversas', '3.90', '#FFB061']
];
const GLASS = [['Transparente', '#CFE9F2', ''], ['Verde', '#7FD8A0', '4.90'], ['Ámbar', '#FFB061', '4.90'], ['Esmerilado', '#B9C6D3', '4.90']];
const PACKS = [[3, 'Para un día con mucho que decir', '4.90'], [10, 'Para toda la semana', '12.90'], [30, '25 más 5 de regalo', '29.90']];
R.muelle = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Muelle</h1>
  <p class="sub mt1">En la beta todo es gratis. Lanzar y responder, siempre.</p>
  <p class="eyebrow">Botellas especiales</p>
  <div class="list">${SPECIAL.map(([k, t, d, p, c]) => `<div class="item"><span class="art">${bottleSVG(c)}</span><span class="tx"><b>${t}${X[k] ? ` <em class="have">Tienes ${X[k]}</em>` : ''}</b><small>${d}</small></span><span class="get">${free(p)}<button class="chip sm" data-k="${k}">Pedir</button></span></div>`).join('')}</div>
  <p class="eyebrow">Más botellas normales</p>
  <div class="tiles">${PACKS.map(([q, d, p]) => `<button class="tile" data-pack="${q}"><b>${q}</b><span>${d}</span>${free(p)}</button>`).join('')}</div>
  <p class="eyebrow">Tu vidrio</p>
  <div class="tiles">${GLASS.map(([g, c, p]) => `<button class="tile glass" data-g="${g}" aria-pressed="${X.glass === g}"><span class="art">${bottleSVG(c)}</span><span>${g}</span>${X.glass === g ? '<span class="price">Usando</span>' : free(p)}</button>`).join('')}</div>
  <div class="capt mt3">
    <p class="eyebrow a" style="margin:0 0 6px">Plan Capitán</p>
    <h2 class="title" style="font-size:22px">Más botellas cada día y salidas más grandes.</h2>
    <ul>${['3 botellas extra al día', 'Ves qué tema compartes con quien abre tus botellas', 'Una que llega lejos cada lunes', 'Salidas de hasta 12 personas'].map(t => `<li>${I.check}${t}</li>`).join('')}</ul>
    ${X.captain ? `<button class="btn btn-2" id="capt">Eres Capitán · dejar el plan</button>` : `<p class="cap mb2"><s>S/ 19.90 al mes</s> · gratis por ahora</p><button class="btn btn-a" id="capt">Ser Capitán gratis</button>`}
  </div>`,
  bind(el) {
    $$('[data-k]', el).forEach(b => b.onclick = () => { X[b.dataset.k]++; saveX(); const t = SPECIAL.find(s => s[0] === b.dataset.k)[1]; go('muelle', { nohash: true }); toast(`Listo. Tienes una botella ${t.toLowerCase()}.`); });
    $$('[data-pack]', el).forEach(b => b.onclick = () => { S.left += +b.dataset.pack; saveX(); go('muelle', { nohash: true }); toast(`Llegaron ${b.dataset.pack} botellas a tu muelle.`); });
    $$('[data-g]', el).forEach(b => b.onclick = () => { X.glass = b.dataset.g; saveX(); go('muelle', { nohash: true }); toast(`Tus botellas viajan en vidrio ${X.glass.toLowerCase()}.`); });
    $('#capt', el).onclick = () => { X.captain = !X.captain; if (X.captain) S.left += 3; saveX(); go('muelle', { nohash: true }); toast(X.captain ? 'Ya eres Capitán. Gratis por ahora.' : 'Dejaste el plan Capitán.'); };
  } });

// Mis botellas: a cuántas llegó cada una y quién respondió.
const reachRow = (heard, cls = 'sm') => `<span class="reach ${cls}">${Array.from({ length: 8 }, (_, i) => `<i class="${i < heard ? 'heard' : 'on'}"></i>`).join('')}</span>`;
R.botellas = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Mis botellas</h1>
  <p class="sub mt1">Blanco: ya la escucharon. Turquesa: en camino.</p>
  <div class="list mt2">${S.sent.length ? S.sent.map((b, i) => `<button class="item" data-i="${i}"><span class="ic">${I.bottle}</span><span class="tx"><b>Tu ${esc(b.kind.toLowerCase())} sobre ${esc(b.tema.toLowerCase())}</b><small>${b.ans ? n_(b.ans, 'respuesta', 'respuestas') : b.heard ? `${b.heard} de 8 la escucharon` : 'En camino'} · ${esc(b.when)}</small></span>${reachRow(b.heard)}</button>`).join('') : '<p class="sub">Todavía no lanzas ninguna.</p>'}</div>
  <div class="grow"></div><button class="btn btn-2 mt3" data-go="lanzar">Lanzar otra</button>`,
  bind(el) { $$('[data-i]', el).forEach(b => b.onclick = () => { const x = S.sent[+b.dataset.i]; sheet(`<h2 class="title">Tu ${esc(x.kind.toLowerCase())}</h2><p class="sub">${x.idea ? `“${esc(x.idea)}” · ` : ''}Para quien ama ${esc(AMA[x.tema] || x.tema.toLowerCase())}</p>
    <div class="reach big mt2 mb2">${Array.from({ length: 8 }, (_, i) => `<i class="${i < x.heard ? 'heard' : 'on'}"></i>`).join('')}<span class="sep"></span>${'<i class="later"></i>'.repeat(4)}</div>
    <p class="cap center mb3">Las 4 de la derecha llegan si en 6 h nadie responde.</p>
    ${x.ans ? `<button class="btn btn-a" id="toc">Escuchar ${x.ans === 1 ? 'la respuesta' : `las ${x.ans} respuestas`}</button>` : '<button class="btn btn-2" data-close>Listo</button>'}`, (s, close) => { const t = $('#toc', s); t && (t.onclick = () => { close(); go('charlas'); }); }); }); } });

// El mapa de tu voz: los temas con los que conectó.
R.mapa = () => { const P = [['Cine', 5, '#8E8CFF'], ['Música', 3, '#FF70A9'], ['Libros', 2, '#9FE3B0'], ['La ciudad', 1, '#FFB061']]; const tot = P.reduce((a, p) => a + p[1], 0);
  const pts = P.map(([t, n, c], i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / P.length) + .4, r = 34; return { t, n, c, x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r }; });
  return { cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Tu voz conectó con ${P.length} temas.</h1>
  <p class="sub mt1">${tot} personas te respondieron. Cada punto es un tema.</p>
  <svg class="mapsvg" viewBox="0 0 100 100" role="img" aria-label="Temas con los que conectó tu voz"><circle class="orbit" cx="50" cy="50" r="34"/>
    ${pts.map(p => `<line x1="50" y1="50" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="${p.c}" stroke-opacity=".35" stroke-width="${(.3 + p.n * .12).toFixed(2)}"/>`).join('')}
    ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1.6 + p.n * .55).toFixed(1)}" fill="${p.c}"/><text x="${p.x.toFixed(1)}" y="${(p.y + 5.4 + p.n * .55).toFixed(1)}" text-anchor="middle">${p.t}</text>`).join('')}
    <circle class="home" cx="50" cy="50" r="3.4"/><text class="you" x="50" y="58.5" text-anchor="middle">Tu voz</text></svg>
  <div class="list">${P.map(([t, n, c]) => `<div class="item" style="min-height:52px"><i class="orb" style="background:${c};width:10px;height:10px"></i><span class="tx"><b>${t}</b></span><span class="cap">${n_(n, 'persona', 'personas')}</span></div>`).join('')}</div>` }; };

// Tu bitácora: la racha y lo que se gana con constancia.
const UNLOCK = [[3, 'Vidrio verde'], [7, 'Una botella que llega lejos'], [14, 'Vidrio esmerilado'], [30, 'Una dorada cada semana']];
R.bitacora = () => { const n = X.streak, nx = UNLOCK.find(u => u[0] > n), prev = (UNLOCK.filter(u => u[0] <= n).pop() || [0])[0]; const D = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return { cls: 'pin', html: `
  ${back()}
  <div class="streak mt2"><b>${n}</b><span>días seguidos</span></div>
  <div class="week">${D.map((d, i) => `<span class="${i < n ? 'on' : ''}${i === n - 1 ? ' today' : ''}"><i></i>${d}</span>`).join('')}</div>
  <p class="sub center mt2">Hoy ya cuenta. Mañana, una nota de voz y sigues.</p>
  ${nx ? `<div class="next mt3"><p class="eyebrow a" style="margin:0">Próximo regalo</p><b>${nx[1]}</b><span class="bar"><i style="width:${Math.max(8, (n - prev) / (nx[0] - prev) * 100)}%"></i></span><span class="cap">${nx[0] - n === 1 ? 'Falta 1 día' : `Faltan ${nx[0] - n} días`}</span></div>` : ''}
  <p class="eyebrow">Se gana con constancia, no se compra</p>
  <div class="list">${UNLOCK.map(([d, t]) => `<div class="item" style="min-height:56px"><span class="ic${d <= n ? ' ok' : ''}">${d <= n ? I.check : I.lock}</span><span class="tx"><b>${t}</b><small>${d} días</small></span>${d <= n ? '<span class="cap">Tuyo</span>' : ''}</div>`).join('')}</div>` }; };

// La marea de las 21:00: botellas doradas de todo Lima.
R.marea = () => { const h = +new Date().toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }); const L = ['majo', 'leo', 'belen'];
  return { cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">${h >= 21 ? 'La marea llegó.' : 'La marea de anoche.'}</h1>
  <p class="sub mt1">Cada noche a las 9 llegan botellas doradas de todo Lima.${h >= 21 ? '' : ` La próxima, en ${Math.max(1, 21 - h)} h.`}</p>
  <div class="row-btns mt3">${L.map(id => { const b = B[id]; return `<button class="gold" data-go="abrir" data-p='{"id":"${id}"}'><span class="art">${bottleSVG('#FFC24B')}</span><span class="tx"><small><i class="orb" style="background:${b.c}"></i>Alguien que ama ${esc(b.theme)}</small><b>${esc(b.q)}</b></span></button>`; }).join('')}</div>
  <div class="grow"></div>
  <button class="btn btn-2 mt3" id="mine">${I.tide}Que la mía salga en la marea</button>`,
  bind(el) { $('#mine', el).onclick = () => X.tide > 0 ? go('lanzar', { dorada: true }) : sheet(`<h2 class="title">Necesitas una dorada</h2><p class="sub">En el muelle te damos una, gratis.</p><div class="row-btns mt3"><button class="btn btn-a" id="gm">Ir al muelle</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s, close) => $('#gm', s).onclick = () => { close(); go('muelle'); }); } }; };

// Salidas en grupo: planes en lugares públicos.
R.salidas = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">Salidas en grupo</h1>
  <p class="sub mt1">En lugares públicos. Cada uno paga lo suyo.</p>
  <div class="row-btns mt3">${S.outs.map((o, i) => `<div class="out"><p class="cap" style="margin:0"><i class="orb" style="background:var(--a);width:7px;height:7px"></i> Para quien ama ${esc(AMA[o.tema] || o.tema)}</p><b>${esc(o.t)}</b><span class="sub" style="font-size:14px">${I.pin}${esc(o.where)} · ${esc(o.when)}</span>
    <div class="foot"><span class="dots">${Array.from({ length: o.max }, (_, j) => `<i class="${j < o.n ? 'on' : ''}"></i>`).join('')}</span><span class="cap">${o.n} de ${o.max}</span><button class="chip sm" data-i="${i}" aria-pressed="${o.go}">${o.go ? 'Vas' : 'Voy'}</button></div></div>`).join('')}</div>
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
R.lecturas = () => ({ cls: 'pin', html: `
  ${back()}
  <h1 class="title mt1">¿Qué piensan de ti?</h1>
  <p class="sub mt1">Grabas una pregunta y se la mandas a tus amigos. Responden con su voz. Primero escuchas; después ves quién fue.</p>
  <div class="list mt2">${S.lec.map((l, i) => `<button class="item" data-go="lectura" data-p='{"i":${i}}'><span class="ic">${I.quote}</span><span class="tx"><b>${esc(l.q)}</b><small>${l.ans.length ? n_(l.ans.length, 'respuesta', 'respuestas') : 'Esperando respuestas'}</small></span>${I.chev}</button>`).join('')}</div>
  <div class="grow"></div>
  <button class="btn btn-a mt3" data-go="lecnueva">Hacer una pregunta</button>` });
R.lecnueva = () => { const Q = ['¿Qué fue lo primero que pensaste de mí?', '¿Qué hago que nadie más hace?', '¿En qué canción me ves?', '¿Qué crees que no me animo a hacer?']; let q = Q[0];
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
    <div class="half"><p class="cap">Tu mitad</p>${player(d.url || 'mine' + d.secs, { mine: true, secs: d.secs })}</div>
    <div class="half${d.friend ? '' : ' wait'}"><p class="cap">Su mitad</p>${d.friend ? player('majo-reply') : '<span class="typing"><i></i><i></i><i></i></span>'}</div>
  </div>
  <div class="grow"></div>
  ${d.friend ? '<div class="slide mt3" id="sl"></div>' : `<button class="btn btn-a mt3" id="share">Mandar el enlace otra vez</button><button class="btn btn-q" id="sim">Ver cómo queda cuando responda</button>`}
  <button class="btn btn-q" id="del">Empezar de nuevo</button>`,
  bind(el) { const sl = $('#sl', el); sl && slider(sl, 'Desliza al mar', () => { S.mine = { kind: 'Historia', tema: S.temas[0], idea: 'Botella para dos', heard: 0 }; S.sent.unshift({ ...S.mine, ans: 0, when: 'Ahora' }); S.duo = null; saveX(); go('lanzada'); });
    $('#share', el) && ($('#share', el).onclick = () => { navigator.clipboard && navigator.clipboard.writeText('https://botella-app.vercel.app').catch(() => {}); toast('Enlace copiado'); });
    $('#sim', el) && ($('#sim', el).onclick = () => { d.friend = true; saveX(); go('dos', { nohash: true }); });
    $('#del', el).onclick = () => { S.duo = null; saveX(); go('dos', { nohash: true }); }; } }
  : { html: `
  ${back()}
  <h1 class="title mt1">Botella para dos</h1>
  <p class="sub mt1">Grabas tu mitad, un amigo graba la suya y sale al mar con las dos voces.</p>
  <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`,
  bind(el) { recUI(el, 'Desliza para invitar', r => { S.duo = { url: r.url, secs: r.secs, friend: false }; saveX(); go('dos'); toast('Enlace copiado. Mándaselo a tu amigo.'); }); } }; };

// ---------- arranque ----------
const start = () => { const h = location.hash.slice(1); go(R[h] ? h : (store.get('onb') ? 'mar' : 'bienvenida')); };
if (window.Mar) start(); else { let started = false; const s = () => { if (!started) { started = true; start(); } }; addEventListener('mar-ready', s, { once: true }); setTimeout(() => { if (!window.Mar) document.documentElement.classList.add("no3d"); s(); }, 2500); }
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (R[h] && h !== curName) go(h, { nohash: true }); });
window.__go = go;
}
