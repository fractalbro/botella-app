/* Pulido 26/11: movimiento y detalles que no cambian cómo funciona la app.
   Va al final: se puede quitar entero (y pulido.css) si algo no convence. */

// Hoja: se puede bajar con el dedo desde el agarre o el título. Hacia arriba se resiste como una liga.
window.bindSheetDrag = s => {
  let y0 = null, dy = 0, t0 = 0, h = 0;
  const band = (over, size = 60) => (1 - 1 / (over * .55 / size + 1)) * size;
  s.addEventListener('pointerdown', e => {
    if (reduceMotion || e.button > 0) return;
    const top = s.getBoundingClientRect().top, inHead = e.clientY - top < 64;
    if (!(e.target.closest('.grab') || (inHead && !e.target.closest('button,a,input,select,textarea,[data-act]')))) return;
    if (s.scrollTop > 0) return;
    y0 = e.clientY; dy = 0; t0 = performance.now(); h = s.offsetHeight; s.setPointerCapture(e.pointerId); s.classList.add('drag'); s.classList.remove('back');
  });
  s.addEventListener('pointermove', e => { if (y0 == null) return; const raw = e.clientY - y0; dy = raw < 0 ? -band(-raw) : raw; s.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 == null) return; y0 = null; s.classList.remove('drag');
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > h * .28 || (dy > 24 && v > .5)) { s.style.setProperty('--sh-y', `translateY(${dy}px)`); s.style.transform = ''; closeSheet(); return; }
    s.classList.add('back'); s.style.transform = ''; dy = 0;
  };
  s.addEventListener('pointerup', end); s.addEventListener('pointercancel', end);
};

// Aviso de arriba: se puede empujar hacia arriba para quitarlo; hacia abajo se resiste.
const _banner = banner;
banner = function (o) {
  _banner(o);
  const b = [...document.querySelectorAll('.banner')].pop(); if (!b || reduceMotion) return;
  let y0 = null, dy = 0, moved = false;
  b.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; moved = false; });
  b.addEventListener('pointermove', e => { if (y0 == null) return; const raw = e.clientY - y0; if (Math.abs(raw) > 6 && !moved) { moved = true; b.setPointerCapture(e.pointerId); b.classList.add('drag'); }
    if (!moved) return; dy = raw > 0 ? (1 - 1 / (raw * .55 / 30 + 1)) * 30 : raw; b.style.transform = `translateY(${dy}px)`; });
  const end = () => { if (y0 == null) return; y0 = null; if (!moved) return; b.classList.remove('drag');
    if (dy < -24) { b.style.setProperty('--bn-y', `translateY(${dy}px)`); b.style.transform = ''; b.classList.add('out'); setTimeout(() => b.remove(), 170); }
    else { b.style.transition = 'transform 260ms cubic-bezier(.2,1.2,.4,1)'; b.style.transform = ''; } };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  // un arrastre no cuenta como toque (no abre la conversación)
  b.addEventListener('click', e => { if (moved) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
};

// Cabecera: cuando bajas, el contenido se esfuma bajo ella en vez de cortarse en seco.
document.addEventListener('scroll', e => {
  const sc = e.target; if (!(sc instanceof Element) || !sc.classList.contains('scroll')) return;
  sc.closest('.screen')?.classList.toggle('scrolled', sc.scrollTop > 4);
}, true);

// Etapas del chat: si la conversación avanzó desde la última vez que la viste, la barrita se llena con un gesto.
const _stepsBar = stepsBar;
stepsBar = function (c) {
  let html = _stepsBar(c);
  try {
    const g = stageOf(c), idx = STAGES.findIndex(([k]) => g.st[k] === 'cur');
    const seen = P.st.sbarSeen || (P.st.sbarSeen = {}), before = seen[c.id];
    if (before != null && idx > before) html = html.replace('class="sbar"', 'class="sbar adv"');
    seen[c.id] = idx;
  } catch (e) {}
  return html;
};

// Barra de pasos del registro: arranca donde quedó en el paso anterior y avanza hasta el nuevo.
const _go = go;
go = function (id, opts) {
  const prev = document.querySelector('.screen:not(.exiting) .progress i')?.style.width;
  const r = _go(id, opts);
  const bar = P.root?.querySelector('.progress i');
  if (bar && prev && prev !== bar.style.width && !reduceMotion) { const to = bar.style.width; bar.style.transition = 'none'; bar.style.width = prev; void bar.offsetWidth; bar.style.transition = ''; requestAnimationFrame(() => { bar.style.width = to; }); }
  return r;
};

// Pantallas donde el texto cruza la luna: la luna baja de brillo para que se lea.
['perfil', 'lecpub', 'duojoin', 'answer'].forEach(id => { if (P.screens[id]) P.screens[id].moon = .35; });

// Último toque: la guía de la orilla no aparece encima de un dedo en movimiento.
document.addEventListener('pointerdown', () => { P.lastTouch = performance.now(); }, true);
