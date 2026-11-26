/* Dos mejoras que salieron de la prueba con 100 personas sintéticas (26/11):
   1) Nadie pedía la llamada: cuando ya se mandaron sus notas de voz, el chat la sugiere con una frase cálida.
   2) Pocos volvían: la primera vez que te responde una persona real, un momento propio con su voz. */

// 1) Invitación a llamarse, al final de la conversación, mientras nadie la haya pedido o descartado.
function callInvite(c) {
  if (!c || c.closed || c.cooled) return '';
  const g = stageOf(c); if (!g.voices || g.callable || c.my_key) return '';
  if (LS.get('callNo', []).includes(c.id)) return '';
  const asked = c.other_key;
  return `<div class="callinv rise" role="group" aria-label="Invitación a llamarse">
    <span class="ci-ic">${icon('phone')}</span>
    <div class="ci-tx"><b>${asked ? 'Te pidió una llamada.' : 'Ya se conocen la voz.'}</b>
    <p>${asked ? '¿Le dices que sí? Es por aquí, sin video y sin dar tu número.' : '¿Se llaman 5 minutos? Es por aquí, sin video y sin dar tu número. Se abre solo si los dos dicen que sí.'}</p>
    <div class="ci-b"><button class="btn btn-tonal btn-sm" data-act="key">${icon('phone', 's')} ${asked ? 'Sí, llamemos' : 'Pedir llamada'}</button><button class="btn btn-text btn-sm" data-act="callNo" data-id="${c.id}">Seguimos con notas de voz</button></div></div></div>`;
}
P.actions.callNo = el => { const ids = LS.get('callNo', []); ids.push(el.dataset.id); LS.set('callNo', ids); rerender(); };
{ const _after = P.screens.chat.after;
  P.screens.chat.after = function (sec) { const h = callInvite(convo()); if (h) sec.querySelector('#thread .thread')?.insertAdjacentHTML('beforeend', h); return _after.call(this, sec); }; }

// 2) Tu primera respuesta de una persona real: antes de la conversación, un momento con su voz.
P.screens.firstreply = {
  cls: 'moment firstreply', transient: true,
  anim: (...a) => P.screens.moment.anim(...a),
  render: () => { const c = convo(), m = P.st.firstMsg; if (!c) return '';
    const who = c.revealed ? esc(c.alias) : esc(c.alias || 'Alguien');
    return `${sb_()}<div style="flex:1"></div><div class="pad" style="padding-bottom:28px;text-align:center;background:linear-gradient(transparent,color-mix(in srgb,var(--bg) 90%,transparent) 40%)">
    <span class="eyebrow a">Tu primera respuesta</span>
    <div class="mword" style="font-size:52px">Alguien te escuchó.</div>
    <p class="lead" style="margin:14px auto 0">${who} oyó tu voz y te respondió con la suya.</p>
    ${m ? `<div class="frvn">${vn(m.voice, m.voice_secs, { peaks: m.voice_peaks })}</div>` : ''}
    <div class="foot" style="padding-bottom:0"><button class="btn btn-a" data-act="back">${icon('chat')} Responderle</button></div></div>`; }
};
{ const _openChat = openChat;
  openChat = async function (cid, opts = {}) {
    await _openChat(cid, opts);
    const c = S.convo; if (!c || c.id !== cid || P.curId !== 'chat' || c.sample || !c.i_launched || LS.get('firstReply', 0)) return;
    const m = (S.msgs[cid] || []).find(x => x.voice && x.sender !== uid() && !(x.body || '').startsWith('#'));
    if (!m) return;
    LS.set('firstReply', 1); P.st.firstMsg = m; P.st.momentAt = performance.now(); hap([10, 40, 20]); go('firstreply');
  }; }
