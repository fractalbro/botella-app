/* Botella elegante con el servidor real: mismas cuentas, botellas, voces y conversaciones que la app actual y la pixel.
   Se activa solo si están /vendor/supabase.js y /config.js (en botella-app.vercel.app). Sin ellos, o con ?demo, la app usa los datos de ejemplo.
   app.js vive dentro de un bloque, así que esta función se evalúa desde adentro de ese bloque (ve S, B, R, go…).
   Lo único que expone hacia afuera es window.LV. */
window.LVsrc = () => {
  const CFG = window.BOTELLA || null;
  if (!(window.supabase && CFG && CFG.url) || /[?&]demo\b/.test(location.search)) return;
  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
  const D = { ses: null, me: null, urls: new Map(), urlx: new Map(), msgs: {}, convos: [], home: null, marea: null, busy: false };
  // Las botellas de la bienvenida son las de ejemplo del servidor: tu primera respuesta le llega a esa persona.
  const WEL = { majo: '5a5ab000-0000-4000-8000-000000000001', leo: '5a5ab000-0000-4000-8000-000000000002', ivan: '5a5ab000-0000-4000-8000-000000000004', belen: '5a5ab000-0000-4000-8000-000000000007', caro: '5a5ab000-0000-4000-8000-000000000010' };
  const uid = () => D.ses && D.ses.user ? D.ses.user.id : null;
  const rpc = async (n, a) => { const { data, error } = await sb.rpc(n, a); if (error) throw error; return data; };
  const one = d => Array.isArray(d) ? d[0] : d;
  const hashS = s => { let h = 7; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); };
  const pk28 = p => Array.isArray(p) && p.length ? Array.from({ length: 28 }, (_, i) => +Math.min(1, Math.max(.12, +p[Math.floor(i * p.length / 28)] || .2)).toFixed(2)) : null;
  const hhmm = iso => { const d = new Date(iso), n = new Date(); if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' }); if (n - d < 2 * 864e5) return 'Ayer'; return d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''); };
  const theme = t => t ? (AMA[t] || String(t).toLowerCase()) : 'lo mismo que tú';
  const busy = (b, t) => { if (!b) return () => {}; const h = b.innerHTML; b.disabled = true; b.textContent = t; return () => { if (document.body.contains(b)) { b.disabled = false; b.innerHTML = h; } }; };
  const ES = /^(Ya|Esta|Este|Esa|Ese|Eso|Te|Tu|Primero|La|El|Falta|Elige|Lanzaste|No|Sin|Botella|Nadie|Solo)\b/;
  function errMsg(e, f) {
    const m = String((e && (e.message || e.error_description)) || '');
    if (/fetch|network|Load failed/i.test(m) || !navigator.onLine) return 'Sin señal. Revisa tu internet e intenta de nuevo.';
    if (/Invalid login/i.test(m)) return 'Ese correo y esa contraseña no coinciden.';
    if (/already|registered/i.test(m)) return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
    if (/rate limit|too many|seconds/i.test(m)) return 'Muchos intentos seguidos. Espera un minuto y vuelve a probar.';
    if (/código/i.test(m)) return 'Ese código de invitación no sirve. Pide otro a quien te invitó.';
    return ES.test(m) ? m : (f || 'Algo falló de nuestro lado. Intenta de nuevo.');
  }
  const fail = (e, f) => toast(errMsg(e, f), '#FF7B7E');

  /* ---------- voces: enlaces firmados por 3 horas; las de ejemplo salen del sitio ---------- */
  async function signed(paths) {
    const now = Date.now(), need = [];
    for (const p of paths) { if (!p || (D.urls.has(p) && (D.urlx.get(p) || Infinity) > now)) continue; if (p.startsWith('seed/')) { D.urls.set(p, '/seed/v/' + p.slice(5)); continue; } need.push(p); }
    const u = [...new Set(need)];
    if (u.length) { const { data } = await sb.storage.from('voice').createSignedUrls(u, 10800); (data || []).forEach(d => { if (d.signedUrl) { D.urls.set(d.path, d.signedUrl); D.urlx.set(d.path, now + 9e6); } }); }
  }
  // Cada voz queda en PK con su duración y su forma, así las pantallas la dibujan igual que las de ejemplo.
  const voz = (path, secs, peaks, seed) => { const u = D.urls.get(path); if (!u) return 'x' + hashS(seed || path); PK[u] = [secs || 8, pk28(peaks) || fakePeaks(hashS(path) % 9)]; return u; };
  async function blobOf(r) { const b = r && r.url ? await AUD.blob(r.url) : null; if (!b || !b.size) throw { message: 'No se grabó nada. Graba otra vez.' }; return b; }
  async function upload(blob) {
    const ext = /mp4|aac|m4a/.test(blob.type) ? 'm4a' : 'webm', path = `${uid()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('voice').upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false }); if (error) throw error;
    D.urls.set(path, URL.createObjectURL(blob)); D.urlx.set(path, Infinity); return path;
  }
  const peaksNow = () => store.get('mypk', null);

  /* ---------- lo que trae el servidor, en la forma de las pantallas ---------- */
  function syncMe() { const m = D.me; if (!m) return; S.name = m.name; S.temas = (m.topics || []).slice(0, 3); S.left = m.bottles; X.far = m.far_left || 0; X.tide = m.tide_left || 0; X.gift = m.gifts_left || 0;
    S.intro = m.intro_voice && D.urls.get(m.intro_voice) ? { url: voz(m.intro_voice, m.intro_secs, m.intro_peaks), secs: m.intro_secs || 8 } : null; }
  async function loadMe() { D.me = one(await rpc('tide')); if (D.me && !D.me.id) D.me = null; if (D.me && D.me.intro_voice) await signed([D.me.intro_voice]).catch(() => {}); syncMe(); return D.me; }
  async function loadShore() {
    const rows = (await rpc('shore')) || []; await signed(rows.map(r => r.voice));
    S.shore = rows.map(r => { const t = r.topic || r.place; B[r.id] = { live: 1, theme: theme(t), tag: t || 'Para ti', kind: r.kind === 'Marea' ? 'Pregunta' : r.kind, q: r.body || '', v: voz(r.voice, r.voice_secs, r.voice_peaks, r.id), c: tc(t), gold: !!r.featured, far: r.btype === 'far', status: r.status }; return r.id; });
  }
  async function loadConvos() {
    const rows = (await rpc('my_convos')) || []; D.convos = rows; const ids = rows.map(c => c.id);
    let ms = [];
    if (ids.length) { const { data, error } = await sb.from('messages').select('*').in('convo_id', ids).order('created_at'); if (error) throw error; ms = data || []; }
    const now = new Date().toISOString(); await signed([...ms.filter(m => m.voice && m.created_at <= now).map(m => m.voice), ...rows.map(c => c.intro_voice)]);
    const seen = (store.get('lvseen', {}) || {}), cel = (store.get('lvcel', {}) || {}), me = uid(), next = {};
    rows.forEach(c => {
      const L = ms.filter(m => m.convo_id === c.id && m.created_at <= now), bm = L.find(m => m.body && m.body.startsWith('#bottle|'));
      const [, kind = 'Pregunta', ...qq] = bm ? bm.body.split('|') : [], their = L.find(m => m.voice && m.sender !== me);
      B[c.id] = { live: 1, theme: theme(c.place), tag: c.place || 'Para ti', kind: kind === 'Marea' ? 'Pregunta' : kind, q: qq.join('|'), v: their ? voz(their.voice, their.voice_secs, their.voice_peaks) : 'x' + hashS(c.id), c: tc(c.place), name: c.revealed ? c.alias : undefined, bvoice: bm && bm.voice };
      const msgs = []; let voices = 0, plan = null;
      L.forEach(m => {
        if (m.voice) { msgs.push({ f: m.sender === me ? 'me' : 'them', v: voz(m.voice, m.voice_secs, m.voice_peaks), s: m.voice_secs || 5 }); voices++;
          if (voices === 4 && c.revealed) named(msgs, c); return; }
        const b = m.body || '';
        if (b.startsWith('#plan|')) { const [, place, when] = b.split('|'); plan = { f: 'plan', t: `${place} · ${when}`, mine: m.sender === me, ok: false }; msgs.push(plan); }
        else if (b === '#planok|' && plan) plan.ok = true;
        else if (b.startsWith('#gift|')) msgs.push({ f: 'sys', t: m.sender === me ? 'Le regalaste una botella. Ahora puede lanzar una más.' : 'Te regaló una botella. Ya puedes lanzar una más.' });
      });
      if (c.revealed && voices < 4) named(msgs, c);
      if (c.closed) msgs.push({ f: 'sys', t: 'Esta conversación terminó.' });
      const unread = !c.last_mine && (seen[c.id] || '') < c.last_at;
      next[c.id] = { live: 1, raw: c, stage: plan && plan.ok ? 3 : c.my_key && c.other_key ? 2 : c.revealed ? 1 : 0, when: hhmm(c.last_at), unread, cel: !!cel[c.id] || !unread, msgs, typing: !!c.next_at };
    });
    S.convs = next;
    // las personas de ejemplo responden a los pocos segundos: se busca otra vez a esa hora
    clearTimeout(D.pt); const nx = rows.map(c => c.next_at ? new Date(c.next_at) - Date.now() : 0).filter(x => x > 0 && x < 3e5);
    if (nx.length) D.pt = setTimeout(() => loadConvos().then(() => redraw(['chat', 'charlas', 'mar'])).catch(() => {}), Math.min(...nx) + 900);
  }
  function named(msgs, c) { msgs.push({ f: 'sys', t: `Ahora saben sus nombres: <b>${esc(c.alias)}</b> y <b>${esc(S.name || 'tú')}</b>` }); if (c.intro_voice && D.urls.get(c.intro_voice)) msgs.push({ f: 'intro', v: voz(c.intro_voice, c.intro_secs), s: c.intro_secs || 8 }); }
  async function loadMine() {
    const rows = ((await rpc('my_bottles')) || []).filter(r => !r.tide_day), tm = (store.get('lvtema', {}) || {});
    await signed(rows.map(r => r.voice));
    S.sent = rows.map(r => { const ansL = Object.keys(S.convs).filter(k => B[k].bvoice && B[k].bvoice === r.voice).map(k => { const t = S.convs[k].msgs.find(m => m.f === 'them'); return t ? [t.v, B[k].theme, B[k].c, k] : null; }).filter(Boolean);
      return { id: r.id, kind: r.kind, tema: r.target || tm[r.id] || S.temas[0] || 'Música', idea: r.body || '', ans: r.answers, heard: r.opened, reached: r.shores, when: hhmm(r.created_at), far: r.btype === 'far', gold: !!r.featured, url: voz(r.voice, r.voice_secs, r.voice_peaks), at: r.created_at, ansL }; });
    const last = S.sent[0]; S.mine = last && Date.now() - new Date(last.at) < 2 * 864e5 ? last : null;
  }
  async function loadHome() { D.home = await rpc('home').catch(() => null); const t = D.home && D.home.tide; if (t && t.question) HOY.q = t.question; }
  async function loadMarea() { D.marea = await rpc('marea_now').catch(() => null); }
  async function loadAll() { await loadMe(); if (!D.me) return; await Promise.all([loadShore(), loadConvos().then(loadMine), loadHome()].map(p => p.catch(e => console.warn(e)))); }

  /* al entrar a una pantalla se pinta con lo que hay y se vuelve a pintar si el servidor trae algo nuevo */
  const LOADERS = { mar: [loadShore, loadHome, () => loadConvos().then(loadMine)], charlas: [loadConvos], chat: [loadConvos], botellas: [() => loadConvos().then(loadMine)], perfil: [loadMe, () => loadConvos().then(loadMine)], muelle: [loadMe], hoy: [loadHome, loadMarea], lanzar: [loadMe] };
  const sig = () => JSON.stringify([S.shore, Object.values(S.convs).map(c => [c.msgs.length, c.stage, c.unread, c.typing]), S.sent.map(x => [x.reached, x.heard, x.ans]), S.left, X.far, X.tide, X.gift, HOY.q, D.home && D.home.tide, D.marea && D.marea.last && D.marea.last.voices && D.marea.last.voices.length, !!S.intro]);
  const quiet = () => !!(document.querySelector('#rtm') || document.querySelector('.rec.live') || document.querySelector('.sheet') || (typeof curP !== 'undefined' && curP));
  function redraw(names) { if (names.includes(curName) && !quiet()) go(curName, { ...curPar, nohash: true, lv: 1 }); }
  function refresh(name) {
    const L = LOADERS[name]; if (!L || !D.me) return; const before = sig();
    Promise.all(L.map(f => f())).then(() => { if (curName === name && sig() !== before) redraw([name]); }).catch(() => { if (!navigator.onLine) toast('Sin señal. Lo que ves puede no estar al día.', '#FF7B7E'); });
  }

  /* ---------- en vivo: mensajes, botellas que llegan y nombres ---------- */
  let CH = null, shoreT = null;
  function subscribe() {
    if (CH || !uid()) return;
    CH = sb.channel('me-' + uid())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => onMsg(m))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries', filter: `to_id=eq.${uid()}` }, () => { clearTimeout(shoreT); shoreT = setTimeout(onDelivery, 600); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'convos' }, () => loadConvos().then(() => redraw(['chat', 'charlas'])).catch(() => {}))
      .subscribe();
  }
  async function onMsg(m) {
    if (!m || m.sender === uid()) return;
    if (m.body && m.body.startsWith('#call|')) { if (Date.now() - (+m.body.split('|')[1] || 0) < 45000) { await loadConvos().catch(() => {}); if (S.convs[m.convo_id]) callIncoming(m.convo_id); } return; }
    const had = !!S.convs[m.convo_id]; await loadConvos().catch(() => {}); loadMine().catch(() => {});
    if (curName === 'chat' && curPar.id === m.convo_id) return redraw(['chat']);
    redraw(['charlas', 'mar']); if (!S.convs[m.convo_id]) return;
    if (!had) { toast('¡Te respondieron una botella!', B[m.convo_id].c); popSound(); }
    else if (m.voice) toast(`${B[m.convo_id].name || 'Alguien que ama ' + B[m.convo_id].theme} te mandó una nota de voz`, B[m.convo_id].c);
  }
  async function onDelivery() { const before = S.shore.length; await loadShore().catch(() => {}); if (S.shore.length > before) { if (curName === 'mar') redraw(['mar']); else if (!['lanzar', 'llamada', 'grabar'].includes(curName)) toast('Llegó una botella nueva al mar.'); } }
  document.addEventListener('visibilitychange', () => { if (D.me && !document.hidden && !CALL) loadMe().then(() => refresh(curName)).catch(() => {}); });
  setInterval(() => { if (D.me && !document.hidden && !CALL && !quiet()) refresh(curName); }, 30000);

  /* ---------- cuenta ---------- */
  const QCODE = { k: 'code', q: '¿Cuál es tu código de invitación?', h: 'Te lo dio quien te invitó a Botella. Si llegaste con un enlace, ya va adentro.', t: 'text', ac: 'off', ph: 'BOTELLA-01' };
  async function signUp(email, pass) {
    const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error;
    if (data.user && data.user.identities && !data.user.identities.length) throw { message: 'Ese correo ya tiene cuenta. Entra con tu contraseña.' };
    let ses = data.session; if (!ses) { const r2 = await sb.auth.signInWithPassword({ email, password: pass }); if (r2.error) throw r2.error; ses = r2.data && r2.data.session; }
    if (!ses) throw { message: 'No pudimos terminar de crear tu cuenta. Intenta en unos minutos.' }; D.ses = ses;
  }
  async function createProfile() {
    const { error } = await sb.from('profiles').insert({ id: uid(), name: (S.name || store.get('cta', {}).n || 'Sin nombre').slice(0, 25), district: store.get('dist', '') || 'Otro', topics: S.temas, seeks: [], code_used: store.get('code', '') });
    if (error) { if (/código/i.test(error.message)) { store.set('codeok', false); throw { message: 'Tu código de invitación ya no sirve. Pide otro a quien te invitó.' }; } if (!/duplicate/i.test(error.message)) throw error; }
    // tu primera respuesta viaja a la persona de la bienvenida
    const p = store.get('pending'); let first = null;
    if (p && WEL[p.id]) { try { const b = await blobOf(p), path = await upload(b); const r = one(await rpc('welcome_answer', { p_bottle: WEL[p.id], p_voice: path, p_secs: Math.max(1, Math.min(120, Math.round(p.secs))), p_peaks: peaksNow() })); first = r && r.convo; } catch (e) { console.warn(e); } }
    store.set('pending', null); return first;
  }
  async function enter(to, p = {}) { await loadAll(); if (!D.me) return go('temas'); subscribe(); store.set('onb', 1); go(to || 'mar', p); }
  async function signOut() { try { await sb.auth.signOut(); } catch (e) {} D.ses = null; D.me = null; if (CH) { try { sb.removeChannel(CH); } catch (e) {} CH = null; }
    ['onb', 'pending', 'cta', 'route', 'draft', 'lzd', 'intro'].forEach(k => { try { localStorage.removeItem('bn.' + k); } catch (e) {} }); S.shore = []; S.convs = {}; S.sent = []; S.mine = null; S.intro = null; }

  /* ---------- llamada de voz: de teléfono a teléfono, sin cámara ---------- */
  const RTC = { iceServers: (CFG && CFG.ice) || [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
  let CALL = null;
  const callSig = p => { try { CALL && CALL.ch && CALL.ch.send({ type: 'broadcast', event: 'sig', payload: p }); } catch (e) {} };
  const callJoin = C => new Promise(res => { C.ch = sb.channel('call-' + C.convo, { config: { broadcast: { self: false } } });
    C.ch.on('broadcast', { event: 'sig' }, ({ payload }) => onSig(C, payload)).subscribe(st => { if (st === 'SUBSCRIBED') res(true); else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') res(false); }); setTimeout(() => res(false), 8000); });
  function callPC(C) {
    const pc = C.pc = new RTCPeerConnection(RTC); C.stream.getTracks().forEach(t => pc.addTrack(t, C.stream));
    pc.onicecandidate = e => { if (e.candidate) callSig({ k: 'ice', c: e.candidate }); };
    pc.ontrack = e => { const a = C.audio = C.audio || new Audio(); a.autoplay = true; a.setAttribute('playsinline', ''); a.srcObject = e.streams[0]; a.play().catch(() => {}); };
    pc.onconnectionstatechange = () => { if (CALL !== C) return; const st = pc.connectionState;
      if (st === 'connected' && C.state !== 'live') { C.state = 'live'; C.t0 = Date.now(); clearTimeout(C.to); navigator.vibrate && navigator.vibrate(20); if (curName === 'llamada') go('llamada', { id: C.convo, nohash: true }); }
      else if (st === 'failed') callEnd('No conectó. Con datos a veces pasa: prueba con wifi o déjale una nota de voz.'); };
    return pc;
  }
  async function onSig(C, p) {
    if (CALL !== C || !p) return;
    try {
      if (p.k === 'ready' && C.role === 'out' && !C.pc) { C.state = 'connecting'; const pc = callPC(C); const o = await pc.createOffer(); await pc.setLocalDescription(o); callSig({ k: 'offer', sdp: pc.localDescription }); }
      else if (p.k === 'offer' && C.role === 'in' && C.stream && !C.pc) { const pc = callPC(C); await pc.setRemoteDescription(p.sdp); for (const c of C.q) await pc.addIceCandidate(c).catch(() => {}); C.q = []; const a = await pc.createAnswer(); await pc.setLocalDescription(a); callSig({ k: 'answer', sdp: pc.localDescription }); }
      else if (p.k === 'answer' && C.pc && !C.pc.currentRemoteDescription) { await C.pc.setRemoteDescription(p.sdp); for (const c of C.q) await C.pc.addIceCandidate(c).catch(() => {}); C.q = []; }
      else if (p.k === 'ice') { if (C.pc && C.pc.remoteDescription) await C.pc.addIceCandidate(p.c).catch(() => {}); else C.q.push(p.c); }
      else if (p.k === 'bye') callEnd(C.state === 'live' ? 'La llamada terminó.' : C.role === 'out' ? 'Ahora no puede contestar. Déjale una nota de voz.' : 'Llamada perdida.', true);
    } catch (e) { console.error(e); callEnd('No se pudo conectar la llamada.'); }
  }
  function callEnd(msg, remote) {
    const C = CALL; if (!C) return; if (!remote) callSig({ k: 'bye' }); CALL = null; clearTimeout(C.to);
    try { C.stream && C.stream.getTracks().forEach(t => t.stop()); } catch (e) {} try { C.pc && C.pc.close(); } catch (e) {} try { if (C.audio) { C.audio.pause(); C.audio.srcObject = null; } } catch (e) {}
    const ch = C.ch; if (ch) setTimeout(() => sb.removeChannel(ch), remote ? 0 : 400);
    if (curName === 'llamada') go('chat', { id: C.convo });
    if (msg) setTimeout(() => toast(msg), 400);
  }
  const callMic = async () => { try { return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch (e) { toast('Para llamar, permite el micrófono en tu navegador.', '#FF7B7E'); return null; } };
  async function callOut(id) {
    if (CALL) return; if (!window.RTCPeerConnection) return toast('Aquí no se puede llamar. Abre Botella en Safari o Chrome.');
    stopAudio(); const stream = await callMic(); if (!stream) return;
    const C = CALL = { convo: id, role: 'out', state: 'ringing', stream, q: [] }; go('llamada', { id });
    if (!(await callJoin(C))) { if (CALL === C) callEnd('No se pudo iniciar la llamada. Revisa tu conexión.'); return; } if (CALL !== C) return;
    const { error } = await sb.from('messages').insert({ convo_id: id, sender: uid(), body: '#call|' + Date.now() }); if (error) { callEnd('No se pudo iniciar la llamada.'); return; }
    C.to = setTimeout(() => { if (CALL === C && C.state !== 'live') callEnd('No contestó. Déjale una nota de voz.'); }, 40000);
  }
  function callIncoming(id) {
    if (CALL || quiet()) return; const C = CALL = { convo: id, role: 'in', state: 'incoming', stream: null, q: [] };
    go('llamada', { id }); callJoin(C); navigator.vibrate && navigator.vibrate([200, 100, 200]);
    C.to = setTimeout(() => { if (CALL === C && C.state === 'incoming') callEnd('Llamada perdida.', true); }, 40000);
  }
  async function callAccept() { const C = CALL; if (!C || C.role !== 'in') return; const stream = await callMic(); if (!stream) { callEnd(); return; } if (CALL !== C) { stream.getTracks().forEach(t => t.stop()); return; } C.stream = stream; C.state = 'connecting'; go('llamada', { id: C.convo, nohash: true }); callSig({ k: 'ready' }); }

  /* ---------- pantallas que en vivo cambian por completo ---------- */
  function install() {
    // Conversación con datos reales: las mismas piezas que la de ejemplo, con acciones del servidor.
    R.chat = ({ id }) => { const b = B[id], c = S.convs[id];
      if (!b || !c) { setTimeout(() => loadConvos().then(() => S.convs[id] ? go('chat', { id, nohash: true }) : go('charlas')).catch(() => go('charlas')), 0); return { html: `${back('charlas')}<p class="sub mt3">Buscando la conversación…</p>` }; }
      const raw = c.raw; c.unread = false; const sn = (store.get('lvseen', {}) || {}); sn[id] = raw.last_at; store.set('lvseen', sn);
      const who = () => b.name || `Alguien que ama ${b.theme}`;
      return { cls: 'chat', html: `
      <div class="top ctop2" style="--c:${b.c}"><button class="ib" data-go="charlas" aria-label="Atrás">${I.back}</button><span class="chead">${theirMark(id)}<span><b id="who">${esc(who())}</b><small>Les une ${esc(b.theme)}</small></span></span><button class="ib" id="menu" aria-label="Más opciones">${I.more}</button></div>
      <div class="ficha" style="--c:${b.c}"><p class="fk"><i></i>${raw.i_launched ? 'Tu' : 'Su'} ${esc(b.kind.toLowerCase())}</p><p class="q">${esc(b.q || 'Solo su voz, sin texto.')}</p><div id="st"></div></div>
      <div class="thread" id="th"></div>
      <div class="dock"><button class="next" id="next"></button>${raw.closed ? '' : `<button class="rec" id="rec" aria-label="Grabar nota de voz">${I.mic}</button>`}</div>`,
      bind(el) {
        const th = $('#th', el), st = $('#st', el), next = $('#next', el); th.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); const ok = e.target.closest('#pok'); if (ok) acceptPlan(); });
        el.style.setProperty('--c', b.c);
        const msgHTML = m => m.f === 'sys' ? `<p class="sys">${m.t}</p>` : m.f === 'intro' ? `<div class="plan introm"><small>La presentación de ${esc(b.name || '')}</small>${player(m.v, { secs: m.s })}</div>` : m.f === 'plan' ? `<div class="plan"><small>${m.ok ? 'Plan confirmado' : m.mine ? 'Propusiste · esperando que confirme' : 'Te propone un plan'}</small><b>${esc(m.t)}</b>${!m.ok && !m.mine ? '<button class="chip sm mt1" id="pok">Me parece bien</button>' : ''}</div>` : `<div class="msg ${m.f}">${player(m.v, { mine: m.f === 'me', secs: m.s })}</div>`;
        const draw = () => {
          th.innerHTML = c.msgs.map(msgHTML).join('') + (c.typing ? '<div class="typing"><i></i><i></i><i></i></div>' : '');
          const k = { them: raw.other_voices, me: raw.my_voices }, need = Math.max(0, 2 - k.them) + Math.max(0, 2 - k.me);
          const N = raw.closed ? ['Esta conversación terminó', null]
            : c.stage === 0 ? (raw.my_reveal ? ['Le avisamos que quieres compartir tu nombre. Se muestran si también quiere.', null] : need ? [need === 1 ? 'Una nota más y pueden compartir sus nombres' : `${need} notas más entre los dos y pueden compartir sus nombres`, null] : [`${I.eye}${raw.other_reveal ? 'Quiere decirte su nombre. Compartir el mío' : 'Compartir mi nombre'}`, askName])
            : c.stage === 1 ? (raw.my_key ? ['Le avisamos que quieres llamar. Se abre cuando los dos quieran.', null] : [`${I.phone}${raw.other_key ? 'Quiere llamarte. Yo también quiero' : 'Pedir una llamada'}`, askCall])
            : c.stage === 2 ? [`${I.phone}Llamar ahora`, () => callOut(id)] : [`${I.check}Plan listo`, null];
          const N2 = c.stage === 2 && !c.msgs.some(m => m.f === 'plan' && !m.ok) ? `<button class="next" id="pl2">${I.plan}Proponer un plan</button>` : '';
          next.innerHTML = N[0]; next.disabled = !N[1]; next.onclick = N[1]; next.hidden = false;
          st.innerHTML = stepRing(c.stage, N[1] ? ['Ya pueden compartir sus nombres, si los dos quieren.', 'Ya saben sus nombres. ¿Se escuchan en vivo?', 'Ya pueden llamarse. ¿Se ven en un lugar público?'][c.stage] || 'Tienen un plan. Disfrútenlo.' : c.stage === 3 ? 'Tienen un plan. Disfrútenlo.' : N[0]) + N2;
          const p2 = $('#pl2', el); p2 && (p2.onclick = askPlan);
          requestAnimationFrame(() => el.scrollTop = el.scrollHeight);
        };
        const again = async () => { await loadConvos().catch(() => {}); if (curName === 'chat' && curPar.id === id) go('chat', { id, nohash: true }); };
        function askName() { sheet(`<h2 class="title">¿Compartir tu nombre?</h2><p class="sub">Solo se muestra si los dos aceptan. Al mismo tiempo se abre la presentación de cada uno.</p><div class="row-btns"><button class="btn btn-a" id="y">Compartir</button><button class="btn btn-q" data-close>Todavía no</button></div>`, (s, close) => $('#y', s).onclick = async () => { const u = busy($('#y', s), 'Avisando…'); try { await rpc('set_reveal', { p_convo: id, p_on: true }); track('nombres_compartidos', { id }); close(); again(); } catch (e) { u(); fail(e); } }); }
        function askCall() { sheet(`<h2 class="title">¿Llamar por voz?</h2><p class="sub">Solo voz, sin cámara, y tu número no se comparte. La llamada se abre cuando los dos quieran.</p><div class="row-btns"><button class="btn btn-a" id="y">${I.phone}Quiero llamar</button><button class="btn btn-q" data-close>Ahora no</button></div>`, (s, close) => $('#y', s).onclick = async () => { const u = busy($('#y', s), 'Avisando…'); try { const both = await rpc('set_key', { p_convo: id }); close(); toast(both ? 'Ya pueden llamarse. Toca Llamar ahora.' : 'Le avisamos que quieres llamar.', b.c); again(); } catch (e) { u(); fail(e); } }); }
        function askPlan() { const O = ['Café en el Centro', 'Ir al cine', 'Caminar por el malecón'], W = ['Hoy', 'Mañana', 'Este fin de semana'];
          sheet(`<h2 class="title">Propón un plan</h2><p class="sub">Un lugar público. Cada uno paga lo suyo.</p><p class="cap tsec">Qué</p><div class="chips" id="po">${O.map((t, i) => `<button class="chip" aria-pressed="${!i}">${t}</button>`).join('')}</div><p class="cap tsec">Cuándo</p><div class="chips" id="pw">${W.map((t, i) => `<button class="chip" aria-pressed="${!i}">${t}</button>`).join('')}</div><button class="btn btn-a mt3" id="y">Proponer</button>`, (s, close) => {
            ['#po', '#pw'].forEach(g => $$(g + ' .chip', s).forEach(ch => ch.onclick = () => $$(g + ' .chip', s).forEach(x => x.setAttribute('aria-pressed', x === ch))));
            $('#y', s).onclick = async () => { const u = busy($('#y', s), 'Proponiendo…'); try { await rpc('send_plan', { p_convo: id, p_place: $('#po [aria-pressed=true]', s).textContent, p_when: $('#pw [aria-pressed=true]', s).textContent }); close(); toast('Plan propuesto. Te avisamos cuando responda.', b.c); again(); } catch (e) { u(); fail(e); } }; }); }
        async function acceptPlan() { try { await rpc('accept_plan', { p_convo: id }); toast('Plan confirmado. Lugar público y avísale a alguien de confianza.', b.c); again(); } catch (e) { fail(e); } }
        const RSN = ['Contenido sexual explícito', 'Insultos o burlas', 'Amenazas', 'Me hizo sentir incómodo', 'Otra cosa'];
        const block = reason => sheet(`<h2 class="title">¿Bloquear a ${esc(who())}?</h2><p class="sub">No volverá a escucharte ni a escribirte, y esta conversación se cierra. No se lo avisamos.</p><div class="row-btns mt3"><button class="btn btn-2 danger" id="byes">Bloquear</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (sh, close) => $('#byes', sh).onclick = async () => { try { await rpc('block_convo', { p_convo: id, p_reason: reason || null }); close(); track('bloqueo', { id }); delete S.convs[id]; go('charlas'); toast('Bloqueaste esta conversación.', '#FF7B7E'); } catch (e) { fail(e); } });
        const report = () => sheet(`<h2 class="title">¿Qué pasó?</h2><p class="sub">Lo revisa una persona del equipo. ${esc(who())} no sabe que lo reportaste.</p><div class="row-btns mt2" id="rsn">${RSN.map(r => `<button class="idea">${r}</button>`).join('')}</div>`, (sh, close) => $$('#rsn .idea', sh).forEach(x => x.onclick = () => { track('reporte_creado', { id, motivo: x.textContent }); close(); setTimeout(() => block(x.textContent), 220); }));
        const gift = async () => { if (!X.gift) return toast('No te quedan botellas de regalo. ' + GANA.gift); try { X.gift = await rpc('send_gift', { p_convo: id }); track('botella_regalada', { id }); again(); toast('Le regalaste una botella.', b.c); } catch (e) { fail(e); } };
        $('#menu', el).onclick = () => sheet(`<h2 class="title">${esc(who())}</h2><p class="sub">Nadie se entera de lo que elijas aquí, salvo el regalo.</p><div class="row-btns">${raw.closed ? '' : `<button class="btn btn-2" id="gf">${I.gift}Regalarle una botella</button>`}<button class="btn btn-2" id="rp">Reportar</button><button class="btn btn-2" id="bl">Bloquear</button><button class="btn btn-q" data-close>Cancelar</button></div>`, (s, close) => { const g = $('#gf', s); g && (g.onclick = () => { close(); gift(); }); $('#rp', s).onclick = () => { close(); setTimeout(report, 220); }; $('#bl', s).onclick = () => { close(); setTimeout(() => block(), 220); }; });
        const rb = $('#rec', el); if (!rb) return draw();
        let rec = null; const dock = $('.dock', el), live = document.createElement('div'); live.className = 'dlive'; live.hidden = true; dock.prepend(live);
        const reset = () => { live.hidden = true; live.innerHTML = ''; rb.hidden = false; rb.classList.remove('live'); rb.innerHTML = I.mic; draw(); };
        const sendMine = async r => { try { const bl = await blobOf(r), path = await upload(bl);
            const { error } = await sb.from('messages').insert({ convo_id: id, sender: uid(), voice: path, voice_secs: Math.max(1, Math.min(120, Math.round(r.secs))), voice_peaks: peaksNow() }); if (error) throw error;
            markDay(); c.msgs.push({ f: 'me', v: voz(path, Math.round(r.secs), peaksNow()), s: Math.round(r.secs) }); raw.my_voices++; draw(); loadConvos().catch(() => {}); }
          catch (e) { fail(e, 'No se pudo enviar. Graba otra vez.'); } };
        rb.onclick = async () => {
          if (!rec) { live.hidden = false; next.hidden = true; live.innerHTML = `<span class="rdot"></span><b id="ct">0:00</b><span class="cap">Toca para terminar</span>`; rec = recorder(t => { const ct = $('#ct', el); ct && (ct.textContent = fmt(t)); }); rb.classList.add('live'); rb.innerHTML = '<span class="sq"></span>'; await rec.start(); return; }
          const r = await rec.stop(); rec = null; rb.hidden = true;
          live.innerHTML = `<button class="ib" id="dis" aria-label="Borrar nota">${I.x}</button><div class="slide sm" id="csl"></div>`;
          $('#dis', el).onclick = reset; slider($('#csl', el), 'Desliza para enviar', () => { reset(); sendMine(r); });
        };
        draw();
      } }; };

    // Llamada real: sonando, contestar, conectando y en vivo.
    R.llamada = ({ id }) => { const b = B[id] || { c: '#7FD8C9', theme: '' }, C = CALL;
      if (!C || C.convo !== id) { setTimeout(() => go('chat', { id }), 0); return { html: '' }; }
      const lab = () => !CALL ? '' : CALL.state === 'live' ? fmt((Date.now() - CALL.t0) / 1000) : CALL.state === 'incoming' ? 'Te está llamando' : CALL.state === 'connecting' ? 'Conectando…' : 'Llamando…';
      return { cls: 'call clear', html: `
      <p class="cap">Llamada de voz</p><h1 class="title">${esc(b.name || 'Alguien que ama ' + b.theme)}</h1><p class="sub" id="ct">${lab()}</p>
      <div class="voiceorb" style="--c:${b.c}"></div>
      ${C.state === 'incoming' ? `<div class="row-btns" style="width:100%"><button class="btn btn-a" id="ok">${I.phone}Contestar</button><button class="btn btn-q" id="no">Ahora no</button></div>`
        : `<div class="cctl"><button class="cbt" id="mute" aria-pressed="false"><span>${I.micoff}</span>Silenciar</button><button class="hang" id="h" aria-label="Colgar">${I.phone}</button><span style="width:72px"></span></div>`}
      <p class="cap csafe">${I.lock}Solo voz. Tu número no se comparte.</p>`,
      bind(el) { const t = setInterval(() => { const ct = $('#ct', el); if (!ct || !document.body.contains(el) || !CALL) return clearInterval(t); ct.textContent = lab(); el.classList.toggle('live', CALL.state === 'live'); }, 250);
        const ok = $('#ok', el); ok && (ok.onclick = callAccept); const no = $('#no', el); no && (no.onclick = () => callEnd('', false));
        const h = $('#h', el); h && (h.onclick = () => { clearInterval(t); callEnd(CALL && CALL.state === 'live' ? 'La llamada terminó.' : ''); });
        const m = $('#mute', el); m && (m.onclick = () => { const on = m.getAttribute('aria-pressed') !== 'true'; m.setAttribute('aria-pressed', on); el.classList.toggle('muted', on); CALL && CALL.stream && CALL.stream.getAudioTracks().forEach(tr => tr.enabled = !on); toast(on ? 'Silenciado. No te escucha.' : 'Te escucha otra vez.'); }); } }; };

    // Pregunta de hoy: la del servidor; al responder se escuchan las voces de la marea.
    R.hoy = () => { const t = D.home && D.home.tide, done = !!(t && t.answered), M = D.marea, last = M && M.last, list = last && last.unlocked ? (last.voices || []).filter(x => !x.mine).slice(0, 8) : [];
      if (!M && done) setTimeout(() => loadMarea().then(() => curName === 'hoy' && go('hoy', { nohash: true })), 0);
      return { cls: 'nightbg', html: `
      <div class="top"><button class="ib edge" data-go="mar" aria-label="Cerrar">${I.x}</button><span class="cap">Pregunta de hoy</span><span style="width:44px"></span></div>
      <h1 class="title mt2">${esc(HOY.q)}</h1>
      ${done ? `<p class="sub mt1 mb3">${list.length ? (M.today && last.day === M.today.day ? 'Tú ya respondiste. Esto dijeron otros.' : `Mientras llegan las de hoy, escucha la pregunta anterior: “${esc(last.question)}”`) : 'Tu voz ya está en el mar. Cuando lleguen las voces de los demás, te avisamos.'}</p>
      <div class="row-btns">${list.map(x => `<div class="paper" style="padding:14px 16px"><p class="who" style="margin-bottom:8px"><i class="orb" style="background:${tc(x.place)}"></i>Alguien que ama ${esc(theme(x.place))}</p><button class="btn btn-2" data-tb="${x.bottle}">${I.play}Escuchar · ${fmt(x.secs || 10)}</button></div>`).join('')}</div>
      <p class="cap center mt3">Mañana hay otra.</p>`
      : `<p class="sub mt1">Hoy todo Botella responde esta pregunta. Responde y escucha lo que dijeron los demás.</p>
      <div class="grow"></div><div class="rec-wrap" id="rw"></div><div class="grow"></div><div id="after"></div>`}`,
      bind(el) {
        $$('[data-tb]', el).forEach(bt => bt.onclick = async () => { const u = busy(bt, 'Abriendo…'); try { const did = await rpc('marea_take', { p_bottle: bt.dataset.tb }); await loadShore(); if (!B[did]) throw { message: 'Esta voz ya no está en el mar.' }; go('abrir', { id: did }); } catch (e) { u(); fail(e); } });
        if (!done) recUI(el, 'Desliza para enviar', async r => { try { const path = await upload(await blobOf(r)); await rpc('tide_answer', { p_voice: path, p_secs: Math.max(1, Math.min(60, Math.round(r.secs))), p_peaks: peaksNow() }); await Promise.all([loadHome(), loadMarea()]); go('hoy', { nohash: true }); toast('Respuesta enviada'); } catch (e) { fail(e, 'No se pudo enviar. Graba otra vez.'); go('hoy', { nohash: true }); } });
      } }; };
    HOY.done = () => !!(D.home && D.home.tide && D.home.tide.answered);

    // El momento "te respondieron" se celebra una sola vez por conversación, también tras recargar.
    const resp = R.respondio; R.respondio = p => { const cel = (store.get('lvcel', {}) || {}); cel[p.id] = 1; store.set('lvcel', cel); return B[p.id] ? resp(p) : { html: '' }; };
  }

  /* ---------- lo que la app de ejemplo llama en vivo ---------- */
  const LV = window.LV = {
    sb, D,
    ev: c => eval(c),   // solo para las pruebas automáticas
    async boot() {
      install();
      S.shore = []; S.convs = {}; S.sent = []; S.mine = null; S.lec = []; S.outs = []; S.duo = null;
      const qs = new URLSearchParams(location.search), code = qs.get('c');
      if (code) { const c = code.trim().toUpperCase(); store.set('code', c); history.replaceState(null, '', location.pathname + location.hash); rpc('check_code', { p_code: c }).then(ok => { store.set('codeok', !!ok); if (!ok) { store.set('code', null); if (!CQ.some(q => q.k === 'code')) CQ.unshift(QCODE); } }).catch(() => {}); }
      if (!store.get('codeok', false) && !store.get('code', null) && !CQ.some(q => q.k === 'code')) CQ.unshift(QCODE);
      sb.auth.onAuthStateChange((ev, ses) => { D.ses = ses; if (ev === 'PASSWORD_RECOVERY') setTimeout(() => LV.newPass(), 300); });
      try { const { data } = await sb.auth.getSession(); D.ses = data && data.session; } catch (e) {}
      const h = location.hash.slice(1), rt = store.get('route'), par = rt && rt.n === h ? rt.p : {};
      if (D.ses) {
        try { await loadAll(); } catch (e) { go('bienvenida'); toast('Sin señal. Revisa tu internet e intenta de nuevo.', '#FF7B7E'); return; }
        if (D.me) { subscribe(); store.set('onb', 1); const ok = R[h] && !['bienvenida', 'cuenta', 'entrar', 'temas', 'abrir', 'grabar', 'respondio', 'lanzada', 'llamada'].includes(h); return go(ok ? h : 'mar', ok ? par : {}); }
        return go('temas');   // la cuenta se creó pero falta elegir los temas
      }
      store.set('onb', 0);
      go(['bienvenida', 'abrir', 'grabar', 'cuenta', 'entrar', 'olvide'].includes(h) ? h : 'bienvenida', par);
    },
    on(name, p) { if (!p.lv) refresh(name); },
    guard(name) { if (D.me || D.ses) return name; return ['bienvenida', 'abrir', 'grabar', 'cuenta', 'entrar', 'olvide'].includes(name) ? name : 'bienvenida'; },
    // abrir y devolver una botella del mar
    open(id) { if (B[id] && B[id].live) rpc('open_delivery', { p_id: id }).catch(() => {}); },
    async pass(id) { try { await rpc('return_delivery', { p_id: id }); S.shore = S.shore.filter(x => x !== id); go('mar'); toast('Volvió al mar. Le llegará a otra persona.'); } catch (e) { fail(e); } },
    async answer(id, r) { if (D.busy) return; D.busy = true;
      try { const path = await upload(await blobOf(r)); const row = one(await rpc('answer_delivery', { p_id: id, p_voice: path, p_secs: Math.max(1, Math.min(120, Math.round(r.secs))), p_peaks: peaksNow() }));
        if (row) S.left = row.left_bottles; S.shore = S.shore.filter(x => x !== id); await loadConvos().catch(() => {});
        if (row && row.convo && S.convs[row.convo]) { S.convs[row.convo].cel = true; go('chat', { id: row.convo }); } else go('charlas');
        toast(row && row.rewarded ? 'Tu respuesta va en camino. Ganaste una botella más.' : 'Tu respuesta va en camino.'); }
      catch (e) { fail(e, 'No se pudo enviar. Tu grabación sigue aquí: intenta otra vez.'); go('grabar', { id, nohash: true }); }
      D.busy = false; },
    async intro(r) { try { const path = await upload(await blobOf(r)); const { error } = await sb.from('profiles').update({ intro_voice: path, intro_secs: Math.max(1, Math.min(60, Math.round(r.secs))), intro_peaks: peaksNow() }).eq('id', uid()); if (error) throw error;
        await loadMe(); go('perfil'); toast('Presentación guardada'); } catch (e) { fail(e, 'No se pudo guardar. Graba otra vez.'); go('presentacion', { nohash: true }); } },
    // crear la cuenta: código (si falta), nombre, correo, contraseña y temas
    async code(v, ok, btn) { const u = busy(btn, 'Revisando…'); const c = v.trim().toUpperCase(); try { if (!(await rpc('check_code', { p_code: c }))) { u(); return toast('Ese código no sirve. Revisa las letras o pide otro a quien te invitó.', '#FF7B7E'); } store.set('code', c); store.set('codeok', true); ok(); } catch (e) { u(); fail(e); } },
    async signup(v, pass, btn) { const u = busy(btn, 'Creando tu cuenta…'); try { await signUp(v.e, pass); S.name = v.n; save(); track('cuenta_creada', { con_respuesta: !!store.get('pending') }); go('temas'); } catch (e) { u(); fail(e, 'No pudimos crear tu cuenta. Intenta en unos minutos.'); } },
    async temas(edit, btn) { const u = busy(btn, edit ? 'Guardando…' : 'Preparando tu mar…');
      try {
        if (edit) { const { error } = await sb.from('profiles').update({ topics: S.temas }).eq('id', uid()); if (error) throw error; await loadMe(); go('perfil'); toast('Temas guardados'); return; }
        if (!uid()) return go('cuenta');
        const first = await createProfile(); track('temas_elegidos', { temas: S.temas });
        await enter(first ? 'chat' : 'mar', first ? { id: first } : {}); toast(first ? 'Tu voz va en camino. Te avisamos cuando te responda.' : 'Bienvenido al mar.');
      } catch (e) { u(); fail(e); } },
    async login(email, pass, btn) { const u = busy(btn, 'Entrando…'); const { data, error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) { u(); return fail(error); } D.ses = data.session; try { await enter(); } catch (e) { u(); fail(e); } },
    async reset(email, btn) { const u = busy(btn, 'Enviando…'); const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); u(); if (error) return fail(error); go('entrar', { i: 1 }); toast('Listo. Revisa tu correo: ahí está el enlace.'); },
    newPass() { sheet(`<h2 class="title">Crea tu contraseña nueva</h2><form id="np"><input class="cin" id="npi" type="password" autocomplete="new-password" placeholder="Al menos 6 caracteres" minlength="6" required></form><button class="btn btn-a mt3" form="np">Guardar</button>`, (s, close) => { $('#np', s).onsubmit = async e => { e.preventDefault(); const v = $('#npi', s).value; if (v.length < 6) return toast('Usa al menos 6 caracteres.', '#FF7B7E'); const { error } = await sb.auth.updateUser({ password: v }); if (error) return fail(error); close(); toast('Listo. Ya tienes contraseña nueva.'); enter(); }; }); },
    async out() { await signOut(); go('bienvenida'); },
    async del(btn) { const u = busy(btn, 'Borrando…'); try { await rpc('delete_me'); await signOut(); AUD.wipe(); go('bienvenida'); toast('Tu cuenta se borró.'); } catch (e) { u(); fail(e); } },
    // lanzar una botella
    async launch({ kind, tema, idea, kindSp, r }) { if (D.busy) return; D.busy = true;
      try { const path = await upload(await blobOf(r));
        const row = one(await rpc('launch_bottle', { p_kind: kind, p_body: idea || null, p_voice: path, p_secs: Math.max(1, Math.min(60, Math.round(r.secs))), p_peaks: peaksNow(), p_type: kindSp === 'far' ? 'far' : 'free', p_topic: tema, p_district: null, p_featured: kindSp === 'tide' }));
        const tm = (store.get('lvtema', {}) || {}); tm[row.bottle] = tema; store.set('lvtema', tm);
        S.left = row.left_bottles; X.far = row.left_far; X.tide = row.left_tide;
        S.mine = { id: row.bottle, kind, tema, idea, heard: 0, reached: row.shores, far: kindSp === 'far', gold: kindSp === 'tide', url: voz(path, Math.round(r.secs), peaksNow()), ans: 0, when: 'Ahora', at: new Date().toISOString(), ansL: [] };
        S.sent.unshift(S.mine); track('botella_lanzada', { dorada: kindSp === 'tide', far: kindSp === 'far', tema }); go('lanzada'); }
      catch (e) { fail(e, 'No se pudo lanzar. Tu grabación sigue aquí: intenta otra vez.'); go('lanzar', { nohash: true }); }
      D.busy = false; },
    invite: () => `${location.origin}${location.pathname}?c=${encodeURIComponent(store.get('code', '') || 'BOTELLA-01')}`,
    streak: () => (D.me && D.me.streak) || 0
  };
};
