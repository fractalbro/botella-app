/* Lanzar una botella: 5 maneras de ordenar la pantalla, para elegir con Cesar.
   ?lanzar=1..5 elige una y queda guardada; ?lanzar=0 vuelve a la de siempre.
   Las 5 comparten el mismo orden de importancia: 1) qué tipo de botella, 2) grabar tu voz (lo principal),
   3) ideas solo si no sabes qué decir. Y ninguna pide deslizar: lanzar es un botón que dice lo que hace. */
const LANZARV = (() => { try { const q = new URLSearchParams(location.search).get('lanzar'); if (q != null) LS.set('lanzarv', /^[1-5]$/.test(q) ? q : ''); } catch (e) {} return LS.get('lanzarv', ''); })();
const LV_NAMES = { 1: 'Micrófono al centro', 2: 'Dos pasos', 3: 'Grabadora abajo', 4: 'Tres pasos a la vista', 5: 'Mantén para lanzar' };
const KDESC = { Pregunta: 'Algo que quieras escuchar de otra persona.', 'Confesión': 'Algo que no le cuentas a cualquiera.', Historia: 'Algo que te pasó y vale la pena contar.' };
const KLINE = { Pregunta: 'Pregúntale algo a alguien que todavía no conoces.', 'Confesión': 'Cuenta algo que no le dirías a cualquiera.', Historia: 'Cuenta algo que te pasó. Con tu voz suena mejor.' };

const lvReach = () => (S.duoOn ? 12 : S.btype === 'far' ? 20 : 8);
const lvPrivacy = () => `<p class="small muted lv-priv">${icon('lock', 's')} Llega a ${lvReach()} personas. Te escuchan antes de saber quién eres.</p>`;
const lvHint = 'Habla como si le contaras a un amigo. Con 10 segundos basta.';
const lvKindChips = () => `<div class="chips lv-kinds" id="kinds" role="radiogroup" aria-label="Qué vas a lanzar">${Object.keys(KINDS).map(k => `<button class="chip${S.kind === k ? ' on' : ''}" role="radio" aria-checked="${S.kind === k}" data-act="lvKind" data-k="${k}">${k}</button>`).join('')}</div>`;
// la idea elegida, en una línea sobre el micrófono, con su forma de quitarla
const lvPicked = () => S.idea >= 0 && KINDS[S.kind][S.idea] ? `<div class="lv-picked"><span class="tag">Idea</span><span class="q">“${esc(KINDS[S.kind][S.idea])}”</span><button class="btn btn-text btn-sm" data-act="ideaClear">Quitar</button></div>` : '';
const lvIdeaList = () => `<div class="lv-ideas">${KINDS[S.kind].map((q, i) => `<button class="idea${S.idea === i ? ' on' : ''}" data-act="lvIdea" data-i="${i}">${q}</button>`).join('')}</div>`;
// el botón de lanzar, igual en 1-4: dice lo que hace y a cuántos llega
const lvThrowBtn = (left, inline) => S.duoOn
  ? `<button class="btn btn-a${S.rec.launch && S.me?.bottles ? '' : ' soft'}" data-act="duoStart">${icon('duo')} Guardar mi mitad e invitar</button>`
  : `<button class="btn btn-a lv-throw${S.rec.launch && left ? '' : ' soft'}" data-act="throw">${icon('send')} Lanzar al mar${inline ? '' : ` <span class="lv-n">· ${lvReach()} personas</span>`}</button>`;
const lvFoot = left => S.rec.launch ? `<div class="foot pad">${lvThrowBtn(left)}</div>` : '';
const lvHead = left => `${sb_()}<div class="top pad">${backBtn()}<span class="title">Lanzar una botella<small>${BT[S.btype].name}: ${left ? `te ${left === 1 ? 'queda 1' : 'quedan ' + left}` : 'no te quedan'}</small></span></div>`;

const LV = {
  /* 1. Micrófono al centro: el tipo arriba, un micrófono grande en medio, las ideas detrás de un enlace */
  1: left => `${lvHead(left)}<div class="scroll pad lv lv1">
      <div class="display rise" style="margin-top:4px">${S.rec.launch ? 'Ya está.<br><b>¿La lanzamos?</b>' : '¿Qué quieres <b>lanzar</b> al mar?'}</div>
      ${lvKindChips()}
      <div class="lv-stage lv-big">${lvPicked()}${recBox('launch', lvHint)}</div>
      ${S.rec.launch ? '' : `<div class="lv-help"><button class="btn btn-text" data-act="ideasOpen">${icon('spark', 's')} ¿Sin ideas? Te damos algunas</button></div>`}
      ${launchOptsHTML()}${lvPrivacy()}${launchEmptyHTML(left)}
    </div>${lvFoot(left)}`,

  /* 2. Dos pasos: primero eliges qué es (tarjetas grandes), después la pantalla es solo grabar */
  2: left => !S.lvStep2 ? `${lvHead(left)}<div class="scroll pad lv lv2">
      <div class="display rise" style="margin-top:4px">¿Qué vas a <b>lanzar</b>?</div>
      <p class="lead muted rise d1" style="margin:8px 0 0">Elige una. Después la grabas con tu voz.</p>
      <div class="lv-kcards">${Object.keys(KINDS).map((k, i) => `<button class="lv-kcard rise d${i + 1}" data-act="kindPick" data-k="${k}"><span><b>${k}</b><span>${KDESC[k]}</span><em>Por ejemplo: ${KINDS[k][0]}</em></span>${icon('arrow', 's')}</button>`).join('')}</div>
      ${lvPrivacy()}
    </div>`
    : `${lvHead(left)}<div class="scroll pad lv lv2">
      <div class="lv-chosen rise"><span class="tag">${S.kind}</span><button class="btn btn-text btn-sm" data-act="kindBack">Cambiar</button></div>
      <div class="display rise" style="margin-top:6px">${S.rec.launch ? 'Ya está.<br><b>¿La lanzamos?</b>' : 'Ahora, <b>grábala</b><br>con tu voz.'}</div>
      <div class="lv-stage lv-big">${lvPicked()}${recBox('launch', lvHint)}</div>
      ${S.rec.launch ? '' : `<div class="sec lv-blank"><span class="eyebrow">Si te quedas en blanco</span>${lvIdeaList()}</div>`}
      ${launchOptsHTML()}${lvPrivacy()}${launchEmptyHTML(left)}
    </div>${lvFoot(left)}`,

  /* 3. Grabadora abajo: como un mensaje de voz, el micrófono queda al alcance del pulgar; una idea a la vez, solo si la pides */
  3: left => `${lvHead(left)}<div class="scroll pad lv lv3">
      <div class="seg lv-seg" role="radiogroup" aria-label="Qué vas a lanzar">${Object.keys(KINDS).map(k => `<button class="${S.kind === k ? 'on' : ''}" role="radio" aria-checked="${S.kind === k}" data-act="lvKind" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="display rise lv3-t">${S.rec.launch ? 'Ya está.<br><b>¿La lanzamos?</b>' : `Habla de <b>lo que quieras</b>.`}</div>
      <p class="lead muted" style="margin:8px 0 0">${S.rec.launch ? 'Escúchala si quieres. Si te gusta, lánzala.' : KLINE[S.kind]}</p>
      ${S.rec.launch ? '' : S.idea >= 0 ? `<div class="lv-onecard rise"><span class="eyebrow">Una idea</span><p>${esc(KINDS[S.kind][S.idea])}</p><div class="lv-row"><button class="btn btn-text btn-sm" data-act="ideaNext">Otra idea</button><button class="btn btn-text btn-sm" data-act="ideaClear">Quitar</button></div></div>`
        : `<div class="lv-help left"><button class="btn btn-text" data-act="ideaNext">${icon('spark', 's')} Dame una idea</button></div>`}
      ${launchOptsHTML()}${lvPrivacy()}${launchEmptyHTML(left)}
    </div>
    <div class="foot pad lv3-foot">${S.rec.launch ? `${recBox('launch')}${lvThrowBtn(left)}` : recBox('launch', 'Toca y habla. Con 10 segundos basta.')}</div>`,

  /* 4. Tres pasos a la vista: 1 elige, 2 graba, 3 lanza. Siempre se ve en qué paso vas */
  4: left => { const st = S.rec.launch ? 3 : 2; const n = (i, t) => `<span class="lv-num${i < st ? ' done' : i === st ? ' on' : ''}">${i < st ? '' : i}</span><span class="lv-st">${t}</span>`;
    return `${lvHead(left)}<div class="scroll pad lv lv4">
      <div class="display rise" style="margin-top:4px">Tu botella,<br><b>en tres pasos</b>.</div>
      <ol class="lv-steps">
        <li class="done"><div class="lv-sh">${n(1, 'Elige qué es')}</div>${lvKindChips()}</li>
        <li class="${st === 2 ? 'on' : 'done'}"><div class="lv-sh">${n(2, 'Grábala con tu voz')}</div>${lvPicked()}<div class="lv-stage">${recBox('launch', lvHint)}</div>
          ${S.rec.launch ? '' : S.lvIdeas ? `<div class="lv-blank"><span class="eyebrow">Ideas, por si te quedas en blanco</span>${lvIdeaList()}</div>` : `<div class="lv-help"><button class="btn btn-text btn-sm" data-act="ideasToggle">${icon('spark', 's')} ¿Sin ideas? Ver algunas</button></div>`}</li>
        <li class="${st === 3 ? 'on' : ''}" id="lv-step3"><div class="lv-sh">${n(3, 'Lánzala al mar')}</div>${lvThrowBtn(left, true)}${lvPrivacy()}</li>
      </ol>
      ${launchOptsHTML()}${launchEmptyHTML(left)}
    </div>`; },

  /* 5. Mantén para lanzar: el tipo como palabras grandes, el micrófono al centro y un lanzamiento con ritual (como descorchar) */
  5: left => `${lvHead(left)}<div class="scroll pad lv lv5">
      <div class="lv-words" role="radiogroup" aria-label="Qué vas a lanzar">${Object.keys(KINDS).map(k => `<button class="${S.kind === k ? 'on' : ''}" role="radio" aria-checked="${S.kind === k}" data-act="lvKind" data-k="${k}">${k}</button>`).join('')}</div>
      <p class="lead muted" style="margin:6px 0 0">${S.rec.launch ? 'Lista. Escúchala si quieres antes de lanzarla.' : KDESC[S.kind]}</p>
      <div class="lv-stage lv-big">${lvPicked()}${recBox('launch', lvHint)}</div>
      ${S.rec.launch ? '' : `<div class="sec lv-blank"><span class="eyebrow">¿Sin ideas? Toca una</span><div class="ideas" id="ideas" style="margin-top:8px">${KINDS[S.kind].map((q, i) => `<button class="idea${S.idea === i ? ' on' : ''}" data-act="lvIdea" data-i="${i}">${q}</button>`).join('')}</div></div>`}
      ${launchOptsHTML()}${lvPrivacy()}${launchEmptyHTML(left)}
    </div>${S.rec.launch ? `<div class="foot pad">${S.duoOn ? lvThrowBtn(left) : `<div class="lv-hold">${holdBtn('throw', `${icon('send')} Mantén presionado para lanzar`, 900, `btn-a${left ? '' : ' soft'}`)}<p class="small muted">Lanza a ${lvReach()} personas. Si te arrepientes, suelta.</p></div>`}</div>` : ''}`
};

if (LANZARV && LV[LANZARV]) {
  const base = P.screens.launch;
  P.screens.launch = { ...base, render: () => LV[LANZARV](btLeft(S.btype)), after(sec) { base.after?.(sec); if (LANZARV === '4' && S.rec.launch) setTimeout(() => sec.querySelector('#lv-step3')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); } };
}
P.actions.lvKind = el => { S.kind = el.dataset.k; S.idea = -1; S.body = ''; rerender(); };
P.actions.kindPick = el => { S.kind = el.dataset.k; S.idea = -1; S.body = ''; S.lvStep2 = true; go('launch', { noPush: true }); };
P.actions.kindBack = () => { S.lvStep2 = false; go('launch', { noPush: true }); };
P.actions.lvIdea = el => { const i = +el.dataset.i; if (S.idea === i) { S.idea = -1; S.body = ''; } else { S.idea = i; S.body = KINDS[S.kind][i]; } rerender(); };
P.actions.ideaClear = () => { S.idea = -1; S.body = ''; rerender(); };
P.actions.ideaNext = () => { const n = KINDS[S.kind].length; S.idea = (S.idea + 1) % n; S.body = KINDS[S.kind][S.idea]; rerender(); };
P.actions.ideasToggle = () => { S.lvIdeas = !S.lvIdeas; rerender(); };
P.actions.ideasOpen = () => { const s = sheet(`${sheetHead('Ideas para empezar')}<p class="small muted" style="margin:0 0 6px">Toca una y respóndela con tu voz. O ignóralas: lo tuyo siempre suena mejor.</p>${lvIdeaList()}`); s.addEventListener('click', e => { if (e.target.closest('[data-act=lvIdea]')) setTimeout(closeSheet, 60); }); };
