/* Botella · llamadas de voz, avisos en vivo y arranque. */
'use strict';

/* ================= LLAMADA ================= */
/* Solo voz, de teléfono a teléfono. El timbre viaja como mensaje de la conversación; la conexión se negocia por un canal propio. */
const RTC = { iceServers: CFG.ice || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
let CALL = null;
const callClock = () => { const C = CALL; const t = C && C.t0 ? Math.floor((Date.now() - C.t0) / 1000) : 0; return fmt(t); };
const callSig = p => { try { CALL && CALL.ch && CALL.ch.send({ type: 'broadcast', event: 'sig', payload: p }); } catch (e) {} };
function callJoin(C) {
  return new Promise(res => {
    C.ch = sb.channel('call-' + C.convo, { config: { broadcast: { self: false } } });
    C.ch.on('broadcast', { event: 'sig' }, ({ payload }) => onSig(C, payload)).subscribe(st => { if (st === 'SUBSCRIBED') res(true); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') res(false); });
    setTimeout(() => res(false), 8000);
  });
}
function callPC(C) {
  const pc = C.pc = new RTCPeerConnection(RTC); C.stream.getTracks().forEach(t => pc.addTrack(t, C.stream));
  pc.onicecandidate = e => { if (e.candidate) callSig({ k: 'ice', c: e.candidate }); };
  pc.ontrack = e => { const a = C.audio = C.audio || new Audio(); a.autoplay = true; a.setAttribute('playsinline', ''); a.srcObject = e.streams[0]; a.play().catch(() => {}); };
  pc.onconnectionstatechange = () => {
    if (CALL !== C) return; const st = pc.connectionState;
    if (st === 'connected' && C.state !== 'live') { C.state = 'live'; C.t0 = Date.now(); clearTimeout(C.to); hap([10, 40, 10]); C.iv = setInterval(() => { const el = $('#calltime'); if (el) el.textContent = callClock(); if (Date.now() - C.t0 >= MAXCALL * 1000) callEnd('La llamada llegó a 30 minutos. Pueden volver a llamarse.'); }, 1000); if (P.curId === 'call') rerender(); }
    else if (st === 'failed') callEnd('No conectó. Con datos a veces pasa: prueba con wifi o déjale una nota de voz.');
  };
  return pc;
}
async function onSig(C, p) {
  if (CALL !== C || !p) return;
  try {
    if (p.k === 'ready' && C.role === 'out' && !C.pc) { C.state = 'connecting'; if (P.curId === 'call') rerender(); const pc = callPC(C); const o = await pc.createOffer(); await pc.setLocalDescription(o); callSig({ k: 'offer', sdp: pc.localDescription }); }
    else if (p.k === 'offer' && C.role === 'in' && C.stream && !C.pc) { const pc = callPC(C); await pc.setRemoteDescription(p.sdp); for (const c of C.q) await pc.addIceCandidate(c).catch(() => {}); C.q = []; const a = await pc.createAnswer(); await pc.setLocalDescription(a); callSig({ k: 'answer', sdp: pc.localDescription }); }
    else if (p.k === 'answer' && C.pc && !C.pc.currentRemoteDescription) { await C.pc.setRemoteDescription(p.sdp); for (const c of C.q) await C.pc.addIceCandidate(c).catch(() => {}); C.q = []; }
    else if (p.k === 'ice') { if (C.pc && C.pc.remoteDescription) await C.pc.addIceCandidate(p.c).catch(() => {}); else C.q.push(p.c); }
    else if (p.k === 'bye') callEnd(C.state === 'live' ? 'La llamada terminó.' : C.role === 'out' ? 'Ahora no puede contestar. Déjale una nota de voz.' : 'Llamada perdida.', true);
  } catch (e) { console.error(e); callEnd('No se pudo conectar la llamada.'); }
}
function callEnd(msg, remote) {
  const C = CALL; if (!C) return; if (!remote) callSig({ k: 'bye' }); CALL = null; clearInterval(C.iv); clearTimeout(C.to);
  try { C.stream && C.stream.getTracks().forEach(t => t.stop()); } catch (e) {} try { C.pc && C.pc.close(); } catch (e) {} try { if (C.audio) { C.audio.pause(); C.audio.srcObject = null; } } catch (e) {}
  const ch = C.ch; if (ch) setTimeout(() => sb.removeChannel(ch), remote ? 0 : 400);
  if (P.curId === 'call') { if (S.convo && S.convo.id === C.convo) openChat(C.convo, { back: true, noPush: true }); else back(); }
  if (msg) toast(msg);
  // Después de hablar, lo natural es armar un plan.
  if (C.state === 'live') { const tk = LS.get('talked', []); if (!tk.includes(C.convo)) { tk.push(C.convo); LS.set('talked', tk.slice(-200)); } }
  if (C.state === 'live' && Date.now() - (C.t0 || 0) > 4000) setTimeout(() => { if (P.curId === 'chat' && S.convo?.id === C.convo && !(S.msgs[C.convo] || []).some(m => m.body && m.body.startsWith('#plan|'))) P.actions.planAsk(); }, 1400);
}
async function callMic() { try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch (e) { micHelp(e); return null; } }
P.actions.call = async () => {
  const c = convo(); if (!c || CALL) return; if (!(c.my_key && c.other_key)) return toast('La llamada se abre cuando los dos la piden.');
  if (c.sample) return demoCall(c);
  if (!window.RTCPeerConnection) return toast('Aquí no se puede llamar. Abre Botella en Chrome o Safari.');
  recCancel(); stopPlayer();
  const stream = await callMic(); if (!stream) return;
  const C = CALL = { convo: c.id, name: c.alias, role: 'out', state: 'ringing', stream, q: [], mute: false }; P.hist = P.hist.filter(x => x !== 'moment'); go('call', { noPush: P.curId === 'moment' });
  if (!(await callJoin(C))) { if (CALL === C) callEnd('No se pudo iniciar la llamada. Revisa tu conexión.'); return; } if (CALL !== C) return;
  const { error } = await sb.from('messages').insert({ convo_id: c.id, sender: uid(), body: '#call|' + Date.now() }); if (error) { callEnd('No se pudo iniciar la llamada.'); return; }
  C.to = setTimeout(() => { if (CALL === C && C.state !== 'live') callEnd('No contestó. Déjale una nota de voz.'); }, 40000);
};
async function callIncoming(c) {
  if (CALL || REC.mr) return; const C = CALL = { convo: c.id, name: c.alias, role: 'in', state: 'incoming', stream: null, q: [], mute: false };
  S.convo = c; hap([200, 100, 200, 100, 200]); go('call'); callJoin(C);
  C.to = setTimeout(() => { if (CALL === C && C.state === 'incoming') callEnd('Llamada perdida.', true); }, 40000);
}
P.actions.callAccept = async () => { const C = CALL; if (!C || C.role !== 'in') return; const stream = await callMic(); if (!stream) { callEnd(); return; } if (CALL !== C) { stream.getTracks().forEach(t => t.stop()); return; } C.stream = stream; C.state = 'connecting'; rerender(); callSig({ k: 'ready' }); };
P.actions.callEnd = () => callEnd(CALL && CALL.state === 'live' ? 'La llamada terminó.' : '');
P.actions.callMute = el => { const C = CALL; if (!C || !C.stream) return; C.mute = !C.mute; C.stream.getAudioTracks().forEach(t => t.enabled = !C.mute); el.classList.toggle('on', C.mute); el.setAttribute('aria-label', C.mute ? 'Activar micrófono' : 'Silenciar'); };
P.screens.call = {
  anim: night(.68, false), transient: true,
  render: () => { const C = CALL; if (!C) return ''; const col = colorOf(C.convo);
    const label = C.state === 'live' ? callClock() : C.state === 'incoming' ? 'Te llama' : C.state === 'connecting' ? 'Conectando…' : 'Llamando…';
    return `${sb_()}<div class="scroll pad call" style="display:flex;flex-direction:column;justify-content:space-between;padding-block:24px 34px">
    <div class="who" style="padding-top:clamp(60px,14vh,140px)"><span class="eyebrow a">Llamada de voz</span><div class="h2" style="margin-top:6px">${esc(C.name)}</div><div class="muted small">Se conocieron por una botella</div></div>
    <div style="display:grid;justify-items:center;gap:14px"><div style="display:flex;gap:26px;align-items:center">${orb(col, 96, C.state === 'live')}${orb('var(--a)', 72, false)}</div><div class="num" id="calltime" style="font-family:var(--display);font-weight:200;font-size:44px;letter-spacing:-.03em">${label}</div><div class="small muted" style="text-align:center;max-width:28ch">Sin fotos ni video. Solo sus voces.</div></div>
    <div class="ctrls">${C.state === 'incoming' ? `<button class="end" data-act="callEnd" aria-label="Rechazar">${icon('end')}</button><button class="accept" data-act="callAccept" aria-label="Contestar">${icon('phone')}</button>` : `<button data-act="callMute" class="${C.mute ? 'on' : ''}" aria-label="Silenciar">${icon('mute')}</button><button class="end" data-act="callEnd" aria-label="Colgar">${icon('end')}</button>`}</div></div>`; }
};

/* ================= EN VIVO ================= */
let LIVE = null;
function subscribe() {
  if (LIVE || !uid()) return;
  LIVE = sb.channel('me-' + uid())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => onMessage(m))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries', filter: `to_id=eq.${uid()}` }, () => onDelivery())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'convos' }, ({ new: c }) => onConvo(c))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices', filter: `to_id=eq.${uid()}` }, ({ new: n }) => onNotice(n))
    .subscribe();
}
async function onMessage(m) {
  if (!m || m.sender === uid()) return;
  let c = S.convos.find(x => x.id === m.convo_id);
  if (!c) { await loadConvos().catch(() => {}); c = S.convos.find(x => x.id === m.convo_id); if (!c) return; }
  c.last_at = m.created_at; c.last_mine = false;
  if (m.body && m.body.startsWith('#call|')) { if (Date.now() - (+m.body.split('|')[1] || 0) < 45000) callIncoming(c); }
  const list = S.msgs[c.id]; if (list && !list.some(x => x.id === m.id)) list.push(m);
  if (P.curId === 'chat' && S.convo && S.convo.id === c.id) { markRead(c.id); if (!(REC.mr && REC.id === 'chat') && !playBtn) rerender(); return; }
  if (m.body && m.body.startsWith('#bottle|')) banner({ ic: `<span style="width:34px;display:block">${bottleSVG()}</span>`, title: 'Alguien respondió tu botella', text: 'Toca para escuchar su respuesta.', go: 'chat', v: c.id });
  else if (m.voice) banner({ ic: orb(colorOf(c.id), 34), title: c.alias, text: 'Te mandó una nota de voz', go: 'chat', v: c.id });
  if (['convos', 'orilla', 'mine', 'perfil', 'store'].includes(P.curId)) rerender();
}
let shoreT = null;
function onDelivery() {
  clearTimeout(shoreT);
  shoreT = setTimeout(async () => {
    const before = S.shore.length; await loadShore().catch(() => {});
    if (S.shore.length > before && !['open', 'answer', 'launch', 'thrown', 'call'].includes(P.curId)) {
      if (P.curId === 'orilla') rerender();
      else banner({ ic: `<span style="width:34px;display:block">${bottleSVG()}</span>`, title: 'Una botella llegó a tu orilla', text: 'Toca para escucharla.', go: 'orilla' });
    }
  }, 600);
}
async function onConvo(row) {
  const prev = S.convos.find(x => x.id === row.id); const had = prev && prev.my_key && prev.other_key;
  await loadConvos().catch(() => {}); const c = S.convos.find(x => x.id === row.id); if (!c) return;
  if (S.convo && S.convo.id === c.id) S.convo = c;
  if (!had && c.my_key && c.other_key) { if (P.curId === 'chat' && S.convo?.id === c.id) momentFor(c); else banner({ ic: orb(colorOf(c.id), 34), title: `${c.alias} también pidió la llamada`, text: 'Llámense cuando quieran.', go: 'chat', v: c.id }); return; }
  if (prev && !prev.revealed && c.revealed) banner({ ic: orb(colorOf(c.id), 34), title: `Ya saben sus nombres: ${c.alias}`, text: 'Los dos compartieron su nombre.', go: 'chat', v: c.id });
  if (P.curId === 'chat' && S.convo?.id === c.id && !(REC.mr && REC.id === 'chat')) rerender();
}

/* ================= ARRANQUE ================= */
async function enter(fresh) {
  try {
    const ver = await rpc('app_version').catch(() => 0);
    const me = await loadMe();
    if (!me) { P.hist = []; go('about', { fade: true }); return; }
    S.outdated = !(ver >= 5);
    await Promise.all([refreshAll(), loadHome(), loadDuos()]); subscribe(); P.hist = []; P.st.shoreFresh = true;
    go('orilla', { fade: true });
    const first = S.firstRes; S.firstRes = null;
    if (S.outdated) setTimeout(outdatedSheet, 700);
    else if (S.link?.l) { P.hist = ['orilla']; go('lecpub'); }
    else if (S.link?.d) { P.hist = ['orilla']; go('duojoin'); }
    else if (S.after === 'lectura') { S.after = null; P.hist = ['orilla']; go('lecturas'); }
    else if (first?.convo) { P.hist = ['orilla']; await openChat(first.convo, { noPush: true }); setTimeout(() => banner({ ic: `<span style="width:34px;display:block">${bottleSVG()}</span>`, title: 'Tu respuesta llegó', text: 'Te contesta en un minuto.' }), 900); }
    else if (fresh) setTimeout(() => banner({ ic: `<span style="width:34px;display:block">${bottleSVG()}</span>`, title: 'Tu regalo de bienvenida', text: '8 botellas para empezar. Tócalas.', go: 'store' }), 1200);
    if (S.pendingGo && !S.link) { const g = S.pendingGo; S.pendingGo = null; LS.set('seenAt', new Date().toISOString()); setTimeout(() => noticeGo(g), 300); }
    else if (!fresh) setTimeout(missed, 1500); else LS.set('seenAt', new Date().toISOString());
    pushSync().catch(() => {}); ping(4000);
  } catch (e) { err(e, 'No pudimos conectar con el mar. Revisa tu internet.'); go('splash'); }
}
/* Si el servidor no tiene la última versión de supabase/schema.sql, se dice claro en vez de mostrar saldos en cero. */
function outdatedSheet() {
  sheet(`${sheetHead('Estamos actualizando Botella')}<p class="muted" style="font-size:14px;margin:0 0 16px">Por unos minutos pueden faltar botellas o el muelle. No perdiste nada: vuelve a entrar en un rato.</p>
    <button class="btn btn-a" data-act="closeSheet">Entendido</button>`);
}
function boot() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-hold]')) return;
    const v = e.target.closest('[data-play]'); if (v) { play(v); return; }
    const nd = e.target.closest('[data-needs]'); if (nd && !S.rec[nd.dataset.needs]) { needVoice(nd.dataset.needs); return; }
    const a = e.target.closest('[data-act]'); if (a && P.actions[a.dataset.act]) { P.actions[a.dataset.act](a, e); return; }
    const gl = e.target.closest('[data-go]'); if (gl) { closeSheet(); go(gl.dataset.go, { fade: gl.hasAttribute('data-fade') }); }
  });
  document.addEventListener('submit', e => { e.preventDefault(); if (e.target.dataset.form === 'auth') P.actions.authGo($('[data-act=authGo]')); if (e.target.dataset.form === 'code') P.actions.codeNext($('[data-act=codeNext]')); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[role=button][data-act]')) e.target.click(); });
  bindHold();
  new ResizeObserver(() => { sizeCanvas(); drawFrame(performance.now()); }).observe(phoneEl());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.me && !CALL) { loadMe().then(() => Promise.all([loadShore(), loadConvos(), loadHome()])).then(() => { if (['orilla', 'convos', 'perfil'].includes(P.curId)) rerender(); missed(); }).catch(() => {}); ping(); } });
  requestAnimationFrame(loop);
  if (document.fonts?.ready) document.fonts.ready.then(() => drawFrame(performance.now()));
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});

  const q = new URLSearchParams(location.search), code = q.get('c'), dl = q.get('d'), ll = q.get('l');
  if (code) { S.code = code.trim().toUpperCase(); LS.set('code', S.code); }
  if (dl || ll) S.link = ll ? { l: ll.slice(0, 40) } : { d: dl.slice(0, 40) };
  if (q.get('go')) S.pendingGo = { go: q.get('go'), ref: q.get('ref') };
  if (code || dl || ll || q.get('go')) history.replaceState(null, '', location.pathname);
  sb.auth.onAuthStateChange((ev, ses) => {
    if (ev === 'PASSWORD_RECOVERY') { S.session = ses; setTimeout(() => sheet(`${sheetHead('Tu nueva contraseña')}<label class="field"><input id="npw" type="password" autocomplete="new-password" placeholder="8 caracteres o más" aria-label="Nueva contraseña"></label><button class="btn btn-a" data-act="newPass" style="margin-top:12px">Guardar</button>`), 400); }
    if (ev === 'SIGNED_OUT') { S.session = null; }
  });
  const guest = () => go(S.link?.l ? 'lecpub' : S.link?.d ? 'duojoin' : 'splash');
  sb.auth.getSession().then(({ data }) => { S.session = data && data.session; if (S.session) enter(); else guest(); }).catch(guest);
}
P.actions.newPass = async () => { const p = $('#npw').value; if (p.length < 8) return toast('La contraseña necesita 8 caracteres o más.'); const { error } = await sb.auth.updateUser({ password: p }); if (error) return err(error); closeSheet(); toast('Listo, ya tienes contraseña nueva.'); enter(); };
boot();
