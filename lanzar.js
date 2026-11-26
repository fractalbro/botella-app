/* Lanzar una botella (elegida por Cesar el 25/11: "micrófono al centro").
   Orden de importancia: 1) qué tipo de botella, 2) grabar tu voz (lo principal), 3) ideas solo si no sabes qué decir.
   Al terminar de grabar, en el pie aparece un botón que se desliza: arrastras la botella y sale al mar. */
const lvReach = () => (S.duoOn ? 12 : S.btype === 'far' ? 20 : 8);
const lvPrivacy = () => `<p class="small muted lv-priv">${icon('lock', 's')} Llega a ${lvReach()} personas. Te escuchan antes de saber quién eres.</p>`;
const lvKindChips = () => `<div class="chips lv-kinds" id="kinds" role="radiogroup" aria-label="Qué vas a lanzar">${Object.keys(KINDS).map(k => `<button class="chip${S.kind === k ? ' on' : ''}" role="radio" aria-checked="${S.kind === k}" data-act="lvKind" data-k="${k}">${k}</button>`).join('')}</div>`;
// la idea elegida, en una línea sobre el micrófono, con su forma de quitarla
const lvPicked = () => S.idea >= 0 && KINDS[S.kind][S.idea] ? `<div class="lv-picked"><span class="tag">Idea</span><span class="q">“${esc(KINDS[S.kind][S.idea])}”</span><button class="btn btn-text btn-sm" data-act="ideaClear">Quitar</button></div>` : '';
const lvIdeaList = () => `<div class="lv-ideas">${KINDS[S.kind].map((q, i) => `<button class="idea${S.idea === i ? ' on' : ''}" data-act="lvIdea" data-i="${i}">${q}</button>`).join('')}</div>`;
// botón que se desliza: la botella es la perilla. Con teclado, Enter o espacio la lanzan.
const lvSlide = left => `<div class="slide${left ? '' : ' soft'}" id="slide" role="button" tabindex="0" aria-label="Enviar al mar. Desliza la botella hacia la derecha, mantenla presionada o presiona Enter.">
    <span class="sl-fill" id="slf"></span><span class="sl-t" id="slt">Desliza para enviarla</span><span class="sl-arrows" aria-hidden="true">›››</span><span class="sl-go" id="slg" aria-hidden="true">Suelta y sale al mar</span><span class="sl-help" aria-hidden="true">Arrástrala o mantenla presionada</span>
    <span class="sl-k" id="slk">${bottleSVG('rgba(4,18,28,.85)', 'rgba(4,18,28,.10)')}</span></div><p class="small muted sl-sub">Sale hacia ${lvReach()} personas. Si te arrepientes, suéltala.</p>`;

P.screens.launch = {
  render: () => { const left = btLeft(S.btype); return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Lanzar una botella<small>${BT[S.btype].name}: ${left ? `te ${left === 1 ? 'queda 1' : 'quedan ' + left}` : 'no te quedan'}</small></span></div>
    <div class="scroll pad lv">
      <div class="display rise" style="margin-top:4px">${S.rec.launch ? 'Ya está.<br><b>¿La lanzamos?</b>' : '¿Qué quieres <b>lanzar</b> al mar?'}</div>
      ${lvKindChips()}
      <div class="lv-stage lv-big">${lvPicked()}${recBox('launch', 'Habla como si le contaras a un amigo. Con 10 segundos basta.')}</div>
      ${S.rec.launch ? '' : `<div class="lv-help"><button class="btn btn-text" data-act="ideasOpen">${icon('spark', 's')} ¿Sin ideas? Te damos algunas</button></div>`}
      ${launchOptsHTML()}${lvPrivacy()}${launchEmptyHTML(left)}
    </div>
    ${S.rec.launch ? `<div class="foot pad">${S.duoOn ? `<button class="btn btn-a${S.me?.bottles ? '' : ' soft'}" data-act="duoStart">${icon('duo')} Guardar mi mitad e invitar</button>` : lvSlide(left)}</div>` : ''}`; },
  after(sec) {
    sec.querySelector('#bbody')?.addEventListener('input', e => { S.body = e.target.value; });
    sec.querySelector('#btarget')?.addEventListener('change', e => { S.target = e.target.value; });
    const sl = sec.querySelector('#slide'); if (sl) bindSlide(sl);
  }
};

function bindSlide(sl) {
  const k = sl.querySelector('#slk'), f = sl.querySelector('#slf'), t = sl.querySelector('#slt'), g = sl.querySelector('#slg');
  let x0 = null, dx = 0, max = 0, moved = false, ready = false, taps = 0, holdT = 0, holdRaf = 0, helpT = 0;
  // Mantener presionado también lanza: la botella avanza sola mientras sostienes (para quien toca en vez de arrastrar).
  const holdStop = () => { clearTimeout(holdT); cancelAnimationFrame(holdRaf); holdT = holdRaf = 0; const was = sl.classList.contains('holding'); sl.classList.remove('holding'); return was; };
  const holdStart = () => { sl.classList.add('holding'); sl.classList.remove('help'); hap(6); const t0 = performance.now(), from = dx, D = 850;
    const step = now => { const k = Math.min(1, (now - t0) / D), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; dx = from + (max - from) * e; set(dx); setReady(dx > max * .82);
      if (k < 1) holdRaf = requestAnimationFrame(step); else { holdStop(); x0 = null; sl.classList.remove('drag'); dx = 0; go(); } };
    holdRaf = requestAnimationFrame(step); };
  // Fuera de los bordes la botella se resiste (como una liga) en vez de frenarse en seco.
  const band = (over, size = 44) => (1 - 1 / (over * .55 / size + 1)) * size;
  const SPRING = 'cubic-bezier(.2,1.3,.3,1)';
  const set = (x, anim) => { const tr = anim ? `transform .32s ${SPRING}, width .32s ${SPRING}, opacity .2s` : 'none';
    k.style.transition = f.style.transition = t.style.transition = tr; k.style.transform = `translateX(${x}px) rotate(${-Math.max(0, x) * .06}deg)`; f.style.width = `calc(${Math.max(0, x)}px + var(--sl-k))`; t.style.opacity = Math.max(0, 1 - x / (max * .55)); };
  const setReady = on => { if (on === ready) return; ready = on; sl.classList.toggle('ready', on); if (on) hap(8); };
  const go = () => {
    sl.classList.add('done'); setReady(true); if (g) g.textContent = '¡Al mar!'; hap([8, 30, 14]);
    // Anticipación: la botella retrocede un poquito y luego sale en curva hacia el mar.
    const from = k.style.transform || 'none';
    if (reduceMotion || !k.animate) set(max, true);
    else { k.style.transition = 'none'; f.style.transition = `width .2s ${SPRING}`; f.style.width = '100%';
      k.animate([{ transform: from }, { transform: `translateX(${max - 10}px) rotate(6deg) scale(1.06,.94)`, offset: .3, easing: 'cubic-bezier(.7,0,.84,0)' },
        { transform: `translateX(${max + 70}px) translateY(-30px) rotate(-32deg) scale(.8)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }); }
    setTimeout(() => { P.actions.throw(); if (sl.isConnected && P.curId === 'launch') { k.getAnimations?.().forEach(a => a.cancel()); sl.classList.remove('done'); setReady(false); if (g) g.textContent = 'Suelta y sale al mar'; set(0, true); } }, reduceMotion ? 200 : 340); };
  sl.addEventListener('pointerdown', e => { if (sl.classList.contains('done')) return; max = sl.clientWidth - k.offsetWidth - 8; x0 = e.clientX - dx; moved = false; sl.setPointerCapture(e.pointerId); sl.classList.add('drag'); hap(4); holdT = setTimeout(() => { if (!moved && x0 != null) holdStart(); }, 320); });
  sl.addEventListener('pointermove', e => { if (x0 == null || sl.classList.contains('holding')) return; const raw = e.clientX - x0; if (Math.abs(raw) > 6) clearTimeout(holdT);
    dx = raw < 0 ? -band(-raw, 10) : raw > max ? max + band(raw - max, 16) : raw; if (Math.abs(raw) > 6) moved = true; set(dx); setReady(dx > max * .82); });
  const end = () => { if (x0 == null) return; x0 = null; sl.classList.remove('drag'); const held = holdStop(); if (held) moved = true;
    if (dx > max * .82) { dx = 0; return go(); }
    dx = 0; setReady(false); set(0, true);
    // un toque sin arrastrar: la botella da un saltito para mostrar hacia dónde va
    if (!moved) { sl.classList.remove('nudge'); void sl.offsetWidth; sl.classList.add('nudge');
      // desde el segundo toque, el botón explica las dos formas de lanzar
      if (++taps >= 2) { sl.classList.add('help'); clearTimeout(helpT); helpT = setTimeout(() => sl.classList.remove('help'), 3200); } } };
  sl.addEventListener('pointerup', end); sl.addEventListener('pointercancel', end);
  sl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); max = sl.clientWidth - k.offsetWidth - 8; go(); } });
}

P.actions.lvKind = el => { S.kind = el.dataset.k; S.idea = -1; S.body = ''; rerender(); };
P.actions.lvIdea = el => { const i = +el.dataset.i; if (S.idea === i) { S.idea = -1; S.body = ''; } else { S.idea = i; S.body = KINDS[S.kind][i]; } rerender(); };
P.actions.ideaClear = () => { S.idea = -1; S.body = ''; rerender(); };
P.actions.ideasOpen = () => { const s = sheet(`${sheetHead('Ideas para empezar')}<p class="small muted" style="margin:0 0 6px">Toca una y respóndela con tu voz. O ignóralas: lo tuyo siempre suena mejor.</p>${lvIdeaList()}`); s.addEventListener('click', e => { if (e.target.closest('[data-act=lvIdea]')) setTimeout(closeSheet, 60); }); };
