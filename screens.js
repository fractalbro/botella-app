/* Botella · pantallas. Cada pantalla tiene render(), y opcionalmente after() y anim(). */
'use strict';

/* ================= BIENVENIDA ================= */
P.screens.splash = {
  anim: night(.22, true, 1),
  render: () => `${sb_()}<div style="flex:1"></div><div class="pad" style="padding-bottom:30px;background:linear-gradient(transparent,rgba(3,16,28,.92) 30%)">
    <div class="wordmark splash-wm rise d1" style="font-size:92px">Botella</div>
    <p class="rise d2" style="font-family:var(--display);font-weight:200;font-size:24px;letter-spacing:-.02em;color:var(--a);margin:10px 0 0">Lanza tu voz al mar.</p>
    <p class="lead rise d3">Aquí vales por lo que dices, no por cómo te ves. Graba una pregunta o algo que quieras contar: llega a ocho personas afines y quien quiere, te responde.</p>
    <div class="foot rise d4" style="padding-bottom:0"><button class="btn btn-a" data-act="firstGo">${icon('bottle')} Escuchar una botella</button><button class="btn btn-ghost" data-go="intro">Crear mi cuenta</button><button class="linkbtn" data-act="toLogin">Ya tengo cuenta</button></div></div>`
};
P.actions.toLogin = () => { S.authMode = 'login'; go('account'); };

const SLIDES = [
  { title: 'Graba una pregunta y <b>lánzala al mar</b>.', text: 'O algo que quieras contar. Sin fotos y sin perfil: solo tu voz.' },
  { title: 'Llega a <b>ocho orillas</b>.', text: 'La escuchan ocho personas afines. Si en 6 horas nadie responde, el mar la lleva a cuatro más. Si alguien responde, se abre una conversación privada y anónima.' },
  { title: 'Responder te da <b>otra botella</b>.', text: 'Cada respuesta tuya te regala una botella para lanzar, hasta 3 al día. Si nadie la abre, la marea la lleva a otra orilla.' }
];
P.screens.intro = {
  anim(ctx, w, h, t) {
    const k = S.slide || 0, horizon = .4, mx = sky(ctx, w, h, t, horizon);
    if (k === 1) lighthouse(ctx, w * .9, h * horizon - 8, 7, t, -.28 + Math.sin(t * .8) * .3, 1);
    waves(ctx, w, h, t, horizon, mx, (i, wv) => {
      if (k === 0 && i === 1) { const bx = w * .5 + Math.sin(t * .3) * w * .06, by = wv(bx), sl = (wv(bx + 6) - wv(bx - 6)) / 12; bottle(ctx, bx, by - 6, 1.1, Math.atan(sl) - .35); }
      if (k === 1 && i === 1) { const u = (t * .12) % 1, bx = w * (.5 + u * .1), by = wv(bx) - u * h * .06; bottle(ctx, bx, by, .8 - u * .45, -.3, 1 - u * .4); }
      if (k === 2 && i === 1) { [[.36, 0], [.64, 1.4]].forEach(([x, p]) => { const bx = w * x + Math.sin(t * .4 + p) * 8, by = wv(bx), sl = (wv(bx + 6) - wv(bx - 6)) / 12; bottle(ctx, bx, by - 6, .9, Math.atan(sl) - .35 + (p ? .5 : 0)); }); }
    });
    if (k === 1) [.22, .55, .84].forEach((x, i) => { ctx.fillStyle = 'rgba(127,216,201,' + (.5 + Math.sin(t * 2 + i) * .3) + ')'; ctx.shadowColor = '#7FD8C9'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(w * x, h * horizon - 2, 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });
  },
  render: () => { const i = S.slide || 0, s = SLIDES[i], last = i === SLIDES.length - 1; return `${sb_()}<div class="top pad"><span style="flex:1"></span><button class="btn btn-ghost btn-sm" data-act="skipIntro">Saltar</button></div><div style="flex:1" data-act="slideNext"></div>
    <div class="pad" style="padding-bottom:26px;background:linear-gradient(transparent,var(--bg) 26%)">
      <div class="dots" aria-label="Paso ${i + 1} de ${SLIDES.length}">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="display rise d1" style="margin-top:20px">${s.title}</div><p class="lead rise d2">${s.text}</p>
      <div class="foot" style="padding-bottom:0"><button class="btn btn-a" data-act="slideNext">${last ? 'Crear mi cuenta' : 'Siguiente'}</button>${last ? '<button class="btn btn-ghost" data-act="toLogin">Ya tengo cuenta</button>' : ''}</div></div>`; }
};
P.actions.slideNext = () => { if ((S.slide || 0) < SLIDES.length - 1) { S.slide++; go('intro', { noPush: true }); } else P.actions.skipIntro(); };
P.actions.skipIntro = () => { S.authMode = 'signup'; go(S.code ? 'account' : 'code'); };

/* ================= REGISTRO ================= */
P.screens.code = {
  render: () => `${sb_()}<div class="top pad">${backBtn()}<span class="title">Crear cuenta</span></div>${steps(1)}<div class="scroll pad">
    <div class="display" style="margin-top:22px">Tu <b>código</b> de invitación</div><p class="lead">Por ahora Botella es solo con invitación: escribe el código que te compartieron.</p>
    <form id="codef" data-form="code"><label class="field" style="margin-top:26px"><input id="cd" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="BOTELLA-01" value="${esc(LS.get('code', '') || '')}" aria-label="Código de invitación"></label></form></div>
    <div class="foot pad"><button class="btn btn-a" data-act="codeNext">Continuar</button></div>`
};
P.actions.codeNext = async el => {
  const c = $('#cd').value.trim().toUpperCase(); if (!c) return toast('Escribe tu código de invitación.');
  el.classList.add('soft');
  try { const ok = await rpc('check_code', { p_code: c }); if (!ok) { el.classList.remove('soft'); return toast('Ese código no es válido. Pídele uno nuevo a quien te invitó.'); } S.code = c; LS.set('code', c); S.authMode = 'signup'; go('account'); }
  catch (e) { el.classList.remove('soft'); err(e); }
};

P.screens.account = {
  render: () => { const up = S.authMode === 'signup'; return `${sb_()}<div class="top pad">${backBtn()}<span class="title">${up ? 'Crear cuenta' : 'Entrar'}</span></div>${up ? steps(2) : ''}<div class="scroll pad">
    <div class="display" style="margin-top:22px">${up ? 'Tu <b>correo</b>' : 'Hola de <b>nuevo</b>'}</div><p class="lead">${up ? 'Solo para entrar a tu cuenta. Nunca se muestra a nadie.' : 'Entra con tu correo y contraseña.'}</p>
    <form id="authf" data-form="auth">
      <label class="field" style="margin-top:22px"><input id="em" type="email" inputmode="email" autocomplete="email" placeholder="tu@correo.com" aria-label="Correo"></label>
      <label class="field" style="margin-top:10px"><input id="pw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'Crea una contraseña (8 o más)' : 'Contraseña'}" aria-label="Contraseña"></label>
      <button type="submit" hidden></button>
    </form>
    ${up ? '' : '<button class="btn btn-ghost btn-sm" data-act="forgot" style="margin-top:10px">Olvidé mi contraseña</button>'}</div>
    <div class="foot pad"><button class="btn btn-a" data-act="authGo">${up ? 'Crear mi cuenta' : 'Entrar'}</button><button class="btn btn-ghost" data-act="authSwap">${up ? 'Ya tengo cuenta' : 'Soy nuevo: crear cuenta'}</button></div>`; }
};
P.actions.authSwap = () => { if (S.authMode === 'login') { S.authMode = 'signup'; go(S.code ? 'account' : 'code', { noPush: S.code ? true : false }); } else { S.authMode = 'login'; go('account', { noPush: true }); } };
P.actions.authGo = async el => {
  const email = $('#em').value.trim(), pass = $('#pw').value, up = S.authMode === 'signup';
  if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Revisa tu correo.');
  if (pass.length < 8) return toast('La contraseña necesita 8 caracteres o más.');
  if (S.busy) return; S.busy = true; el.classList.add('soft'); el.textContent = up ? 'Creando tu cuenta…' : 'Entrando…';
  try {
    if (up) {
      const { data, error } = await sb.auth.signUp({ email, password: pass }); if (error) throw error;
      if (data.user && data.user.identities && !data.user.identities.length) throw { message: 'Ese correo ya tiene cuenta. Entra con tu contraseña.' };
      let ses = data.session; if (!ses) { const r2 = await sb.auth.signInWithPassword({ email, password: pass }); ses = r2.data && r2.data.session; if (r2.error && /not confirmed/i.test(r2.error.message)) throw { message: 'Esta cuenta quedó sin confirmar. Escríbenos para activarla o regístrate con otro correo.' }; }
      if (!ses) throw { message: 'Falta un ajuste en el servidor: hay que apagar la confirmación de correo.' };
      S.session = ses;
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw /Invalid login/i.test(error.message) ? { message: 'Ese correo y esa contraseña no coinciden.' } : /not confirmed/i.test(error.message) ? { message: 'Esta cuenta quedó sin confirmar. Escríbenos para activarla o regístrate con otro correo.' } : error;
      S.session = data.session;
    }
    S.busy = false; await enter();
  } catch (e) { S.busy = false; err(e, /already|registered/i.test(e.message || '') ? 'Ese correo ya tiene cuenta. Entra con tu contraseña.' : undefined); if (P.curId === 'account') rerender(); }
};
P.actions.forgot = async () => {
  const email = $('#em').value.trim(); if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Escribe tu correo arriba y vuelve a tocar aquí.');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
  if (error) return err(error, 'No pudimos enviar el correo. Intenta en unos minutos.');
  toast('Te enviamos un correo para crear una contraseña nueva.');
};

P.screens.about = {
  render: () => { const D = S.draft; return `${sb_()}<div class="top pad"><span style="width:44px"></span><span class="title">Crear cuenta</span></div>${steps(3)}<div class="scroll pad">
    <div class="display" style="margin-top:22px">¿Cómo te <b>llamamos</b>?</div><p class="lead">Solo tu nombre o apodo. Nadie lo ve hasta que los dos decidan compartir su nombre.</p>
    <label class="field" style="margin-top:20px"><input id="nm" maxlength="25" value="${esc(D.name)}" placeholder="Tu nombre o apodo" aria-label="Nombre o apodo" autocomplete="given-name"></label>
    <div class="sec"><span class="eyebrow">Tu distrito</span><label class="field select" style="margin-top:10px"><select id="dist" aria-label="Tu distrito">${DISTRICTS.map(d => `<option${D.district === d ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div>
    <button class="check" role="checkbox" aria-checked="${!!D.adult}" data-act="adult" style="margin-top:22px"><span class="box">${icon('check', 's')}</span><span>Tengo 18 años o más y acepto las <u data-act="rules">normas de la comunidad</u>.</span></button></div>
    <div class="foot pad"><button class="btn btn-a${D.adult ? '' : ' soft'}" id="pfgo" data-act="aboutNext">Continuar</button></div>`; }
};
P.actions.dist = el => { S.draft.district = el.dataset.v; document.querySelectorAll('#dist .chip').forEach(c => c.classList.toggle('on', c === el)); };
P.actions.adult = (el, e) => { if (e && e.target.closest('u')) return P.actions.rules(); S.draft.adult = !S.draft.adult; el.setAttribute('aria-checked', S.draft.adult); $('#pfgo').classList.toggle('soft', !S.draft.adult); };
P.actions.aboutNext = () => {
  const n = $('#nm').value.trim(); S.draft.name = n; S.draft.district = $('#dist').value;
  if (!n) return toast('Escribe tu nombre o apodo.');
  if (!S.draft.adult) return toast('Confirma que tienes 18 años o más para continuar.');
  go('voice');
};
P.screens.voice = {
  render: () => `${sb_()}<div class="top pad">${backBtn()}<span class="title">Crear cuenta</span></div>${steps(4)}<div class="scroll pad">
    <div class="display" style="margin-top:22px">En vez de foto, <b>tu voz</b>.</div><p class="lead">Graba unos 15 segundos: tu apodo y algo que te guste. Solo lo escucha quien decida compartir su nombre contigo.</p>
    <div class="sec">${recBox('intro', 'Toca para grabar tu presentación.')}</div></div>
    <div class="foot pad"><button class="btn btn-a${S.rec.intro ? '' : ' soft'}" data-needs="intro" data-act="voiceNext">Continuar</button></div>`
};
P.actions.voiceNext = () => { if (!S.rec.intro) return needVoice('intro'); go('topics'); };
P.screens.topics = {
  render: () => { const D = S.draft; return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Crear cuenta</span></div>${steps(5)}<div class="scroll pad">
    <div class="display" style="margin-top:22px">¿De qué te gusta <b>hablar</b>?</div><p class="lead">Elige al menos tres. Así tus botellas llegan a personas afines.</p>
    <div class="chips" id="tops" style="margin-top:20px">${TOPICS.map(g => `<button class="chip genre${D.topics.includes(g) ? ' on' : ''}" data-act="topic" data-v="${g}" aria-pressed="${D.topics.includes(g)}">${g}</button>`).join('')}</div>
    <div class="sec"><span class="eyebrow">¿Qué buscas?</span><div class="chips">${SEEKS.map(g => `<button class="chip${D.seeks.includes(g) ? ' on' : ''}" data-act="seek" data-v="${g}" aria-pressed="${D.seeks.includes(g)}">${g}</button>`).join('')}</div></div>
    </div>
    <div class="foot pad"><button class="btn btn-a" data-act="finish">Llegar a mi orilla</button></div>`; }
};
const togIn = (arr, v, el) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); el.classList.toggle('on', i < 0); el.setAttribute('aria-pressed', i < 0); };
P.actions.topic = el => togIn(S.draft.topics, el.dataset.v, el);
P.actions.seek = el => togIn(S.draft.seeks, el.dataset.v, el);
P.actions.finish = async el => {
  const D = S.draft; if (D.topics.length < 3) return toast('Elige al menos tres temas.');
  if (!S.rec.intro) { go('voice'); return needVoice('intro'); }
  if (S.busy) return; S.busy = true; el.classList.add('soft'); el.textContent = 'Preparando tu orilla…';
  try {
    const r = S.rec.intro, path = await upload(r.blob, r.ext);
    const { error } = await sb.from('profiles').insert({ id: uid(), name: D.name, district: D.district, topics: D.topics, seeks: D.seeks, intro_voice: path, intro_secs: r.secs, intro_peaks: r.peaks, code_used: S.code || LS.get('code', '') });
    if (error) { if (/código/.test(error.message)) { S.busy = false; toast('Tu código de invitación ya no es válido. Escribe otro.'); go('code'); return; } throw error; }
    delete S.rec.intro; S.busy = false; S.firstRes = await sendFirst(); await enter(true);
  } catch (e) { S.busy = false; el.classList.remove('soft'); el.textContent = 'Llegar a mi orilla'; err(e); }
};

/* ================= ORILLA ================= */
const SPOTS = [[8, 18], [50, 32], [18, 50], [58, 8], [30, 70], [62, 58]];
const countHTML = () => { const n = S.me?.bottles || 0; return `${icon('bottle', 's')}<b class="num">${n}</b><span>${n === 1 ? 'botella' : 'botellas'}</span>`; };
const meBtn = () => `<button class="iconbtn glass" data-go="perfil" data-fade aria-label="Tu perfil">${orb('var(--a)', 26)}</button>`;
P.screens.orilla = {
  anim: night(.42, false),
  render: () => { const list = S.shore.slice(0, 6), n = S.shore.length, today = todayCard(); return `${sb_()}<div class="pad" style="flex:none">
      <div class="top"><span class="wordmark" style="font-size:30px;flex:1">Botella</span>${S.home ? streakChip() : ''}<button class="mybottles" data-go="store" data-fade aria-label="Tienes ${S.me?.bottles || 0} botellas para lanzar. Ver el muelle">${countHTML()}</button>${meBtn()}</div>
    </div>
    <div style="flex:1;position:relative">
      ${list.map((b, i) => { const lv = b.status === 'waiting' ? leaves(b.expires_at) : ''; return `<button class="float${b.status === 'opened' ? ' seen' : ''}${lv.startsWith('se va en') ? ' soon' : ''}" style="left:${SPOTS[i][0]}%;top:${SPOTS[i][1]}%" data-act="openB" data-id="${b.id}" aria-label="Abrir botella: ${esc(b.kind.toLowerCase())} desde ${esc(b.place)}${lv ? ', ' + lv : ''}">${btSVG(b.btype, b.glass, b.featured)}<span>${b.voice2 ? 'Para dos' : esc(b.kind)} · ${esc(b.place)}${lv ? `<small>${lv}</small>` : ''}</span></button>`; }).join('')}
    </div>
    <div class="pad shorebot" style="flex:none;padding-bottom:14px;background:linear-gradient(transparent,rgba(3,16,28,.9) 40%)">
      <div class="h2" style="font-size:24px">${n ? `${n === 1 ? 'Una botella llegó' : n + ' botellas llegaron'} a tu orilla` : 'Tu orilla está en calma'}</div>
      ${today ? '' : `<p class="small muted" style="margin:6px 0 12px">${n ? 'Toca una para escucharla. Si nadie la abre, la marea de las 21:00 se la lleva.' : 'Lanza la primera. Cuando alguien lance una, la marea la trae hasta aquí.'}</p>`}
      ${today ? `<div style="margin:10px 0 10px">${today}</div>` : ''}
      <div class="quick">${today ? '' : `<button class="tide" data-go="marea">${icon('tide', 's')}<span><b>La marea</b>${mareaLine()}</span></button>`}<button class="tide" data-act="toLecturas">${icon('quote', 's')}<span><b>Pide una lectura${S.home?.lecturas ? `<em class="cnt">${S.home.lecturas}</em>` : ''}</b>qué piensan de ti</span></button><button class="tide" data-go="salidas">${icon('users', 's')}<span><b>Salidas</b>en grupo, gratis</span></button></div>
      <button class="btn btn-a" data-go="launch">${icon('bottle')} Lanzar una botella</button>
    </div>${tabsHTML('orilla')}`; },
  async after() { if (!P.st.shoreFresh) { P.st.shoreFresh = true; try { await Promise.all([loadMe(), loadShore(), loadHome()]); if (P.curId === 'orilla') rerender(); } catch (e) {} } },
  leave() { P.st.shoreFresh = false; }
};
P.actions.toLecturas = () => go('lecturas');
P.actions.openB = el => { S.sel = S.shore.find(b => b.id === el.dataset.id); if (!S.sel) return; P.st.uncorked = S.sel.status === 'opened'; const r = el.querySelector('svg').getBoundingClientRect(), p = phoneEl().getBoundingClientRect(); P.st.flyR = { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height }; P.st.flyAt = performance.now(); go('open'); };

/* abrir: mantener para descorchar */
P.screens.open = {
  anim(ctx, w, h, t, st) {
    const mx = sky(ctx, w, h, t, .62); waves(ctx, w, h, t, .62, mx, null, 4);
    let bx = w / 2 - 20, by = h * .2 + Math.sin(t) * 4, sc = 1.35;
    const f = st.flyR && since('flyAt') < .65 ? ease(since('flyAt') / .6) : 1;
    if (f < 1) { const fx = st.flyR.x + st.flyR.w / 2, fy = st.flyR.y + st.flyR.h / 2; bx = fx + (bx - fx) * f; by = fy + (by - fy) * f; sc = .75 + (sc - .75) * f; }
    const shake = st.holdAt && !st.uncorked ? Math.min(1, (performance.now() - st.holdAt) / 900) : 0;
    if (shake) { bx += Math.sin(t * 60) * 2 * shake; by += Math.cos(t * 50) * 1.5 * shake; }
    const k = st.uncorked ? Math.min(1, since('corkAt') / .7) : 0, e = ease(k);
    bottle(ctx, bx, by, sc, -.25 - e * .2, .8 + shake, btCol(S.sel), false);
    const rot = -.25 - e * .2; ctx.save(); ctx.fillStyle = '#8A5A33'; ctx.translate(bx + 56 * sc * Math.cos(rot) + e * 50, by + 56 * sc * Math.sin(rot) - e * 80 + e * e * 40); ctx.rotate(rot + e * 4); ctx.fillRect(-4 * sc, -5 * sc, 8 * sc, 10 * sc); ctx.restore();
    if (st.uncorked && k < 1) for (let i = 0; i < 10; i++) { const a = -1.4 + i * .14, r = e * 60; ctx.fillStyle = `rgba(246,231,196,${1 - e})`; ctx.beginPath(); ctx.arc(bx + 56 * sc * Math.cos(rot) + Math.cos(a) * r, by + 56 * sc * Math.sin(rot) + Math.sin(a) * r, 2, 0, 7); ctx.fill(); }
  },
  render: () => { const b = S.sel; if (!b) return ''; return `${sb_()}<div class="top pad">${backBtn()}<span class="title">${b.featured ? 'Llegó con la marea' : 'Llegó a tu orilla'}<small>${ago(b.arrived)} · desde ${esc(b.place)}</small></span>${b.first ? '<span style="width:44px"></span>' : `<button class="iconbtn glass" data-act="reportB" aria-label="Reportar esta botella">${icon('flag')}</button>`}</div>
    <div style="height:17%;flex:none"></div>
    ${P.st.uncorked ? `<div class="scroll pad"><div class="paper"><span class="eyebrow">${esc(b.kind)} · desde ${esc(b.place)}</span>${b.body ? `<div class="q">${esc(b.body)}</div>` : '<div class="q">Escucha su voz.</div>'}${vn(b.voice, b.voice_secs, { peaks: b.voice_peaks })}${b.voice2 ? `<span class="eyebrow" style="display:block;margin:14px 0 8px">Y su dúo, desde ${esc(b.place2 || b.place)}</span>${vn(b.voice2, b.voice2_secs, { peaks: b.voice2_peaks })}` : ''}</div>
    ${b.sample ? sampleNote() : ''}<p class="small muted rise d3" style="margin-top:14px">${b.first ? 'Respóndele con tu voz. Tu respuesta sale cuando creas tu cuenta, y te contesta en un minuto.' : b.voice2 ? 'La lanzaron dos amigos. Si respondes, les llega a los dos.' : 'Si respondes, se abre una conversación privada entre los dos.'}</p></div>
    <div class="foot pad"><button class="btn btn-a" data-go="answer">${icon('mic')} Responder con mi voz</button>${b.first ? '<button class="btn btn-ghost" data-act="firstSkip">Ahora no, crear mi cuenta</button>' : '<button class="btn btn-ghost" data-act="toSea">Devolver al mar</button>'}</div>`
    : `<div style="flex:1"></div><div class="pad" style="padding-bottom:12px"><span class="eyebrow a rise">${esc(b.kind)} · desde ${esc(b.place)}${b.sample ? ' · de ejemplo' : ''}</span><div class="display rise d1" style="font-size:34px;margin-top:8px">Alguien lanzó esto <b>al mar</b>.</div><p class="lead rise d2">${b.first ? 'Descórchala y escucha su voz. Sin fotos y sin perfil.' : 'Descórchala para escuchar su voz.'}</p></div>
    <div class="foot pad">${holdBtn('uncork', `${icon('bottle')} Mantén para descorchar`, 900)}</div>`}`; },
  after() { setTimeout(() => { P.st.flyR = null; }, 700); }
};
P.actions.uncork = () => { P.st.uncorked = true; P.st.corkAt = performance.now(); P.st.holdAt = 0; hap([10, 30, 20]); if (S.sel) { const was = S.sel.status; S.sel.status = 'opened'; if (!S.sel.first && was === 'waiting') { rpc('open_delivery', { p_id: S.sel.id }).then(() => { if (S.home?.quest && !S.home.quest.heard) loadHome(); }).catch(() => {}); } } go('open', { noPush: true }); setTimeout(() => P.root?.querySelector('.vn')?.click(), 650); };
P.actions.toSea = async () => {
  const b = S.sel; if (!b) return;
  try { await rpc('return_delivery', { p_id: b.id }); S.shore = S.shore.filter(x => x.id !== b.id); P.hist = []; go('orilla', { back: true }); toast('Volvió al mar. Llegará a otra orilla.'); } catch (e) { err(e); }
};
const REASONS = ['Es ofensiva o de odio', 'Contenido sexual', 'Me pide dinero o datos', 'Parece de un menor de edad', 'Otra cosa'];
P.actions.reportB = () => { sheet(`${sheetHead('Reportar esta botella')}<p class="muted" style="font-size:14px;margin:0 0 12px">Sale de tu orilla, no te volverán a llegar botellas de esta persona y la revisamos.</p>${REASONS.map(r => `<button class="setrow" data-act="reportBGo" data-v="${r}">${icon('flag')}<span style="flex:1"><b>${r}</b></span></button>`).join('')}`); };
P.actions.reportBGo = async el => {
  const b = S.sel; closeSheet(); if (!b) return;
  try { await rpc('report_delivery', { p_id: b.id, p_reason: el.dataset.v }); S.shore = S.shore.filter(x => x.id !== b.id); P.hist = []; go('orilla', { back: true }); toast('Gracias por avisar. La vamos a revisar.'); } catch (e) { err(e); }
};

/* responder */
P.screens.answer = {
  anim: night(.78, false),
  render: () => { const b = S.sel; if (!b) return ''; return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Tu respuesta<small>Para alguien de ${esc(b.place)}</small></span></div>
    <div class="scroll pad"><div class="minipaper rise" style="margin-top:6px"><small>${esc(b.kind)}</small>${esc(b.body || 'Una nota de voz de ' + fmt(b.voice_secs))}</div>
    <div class="sec">${recBox('ans', 'Responde con calma. Hasta 60 segundos.')}</div>
    <p class="small muted">${b.first ? 'Tu voz sale apenas crees tu cuenta. Toma un minuto.' : 'Cada respuesta te regala una botella, hasta 3 al día.'}</p></div>
    <div class="foot pad"><button class="btn btn-a${S.rec.ans ? '' : ' soft'}" data-act="sendAns" data-needs="ans">${icon('send')} ${b.first ? 'Enviar y crear mi cuenta' : 'Enviar respuesta'}</button></div>`; }
};
P.actions.sendAns = async el => {
  const b = S.sel, r = S.rec.ans; if (!r) return needVoice('ans'); if (!b || S.busy) return;
  if (b.first) { S.first = b; toast('Tu respuesta quedó guardada. Crea tu cuenta y sale al mar.'); return P.actions.skipIntro(); }
  S.busy = true; el.classList.add('soft'); el.innerHTML = 'Enviando…';
  try {
    const path = await upload(r.blob, r.ext);
    const [res] = await rpc('answer_delivery', { p_id: b.id, p_voice: path, p_secs: r.secs, p_peaks: r.peaks });
    delete S.rec.ans; S.busy = false; S.shore = S.shore.filter(x => x.id !== b.id);
    if (S.me) S.me.bottles = res.left_bottles;
    await loadConvos(); P.hist = ['orilla']; await openChat(res.convo, { noPush: true }); loadHome(); askPush('answer'); ping();
    P.timers.push(setTimeout(() => banner({ ic: `<span style="width:34px;display:block">${bottleSVG()}</span>`, title: res.rewarded ? 'Ganaste una botella' : 'Ya ganaste tus 3 botellas de hoy', text: res.rewarded ? 'Por responder. Úsala para lanzar la tuya.' : 'En el muelle puedes pedir más, gratis por ahora.', go: res.rewarded ? 'launch' : 'store' }), 900));
  } catch (e) { S.busy = false; el.classList.remove('soft'); el.innerHTML = `${icon('send')} Enviar respuesta`; err(e, 'No se pudo enviar tu respuesta. Intenta otra vez.'); }
};

/* ================= LANZAR ================= */
P.screens.launch = {
  render: () => { const left = btLeft(S.btype); return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Lanzar una botella<small>${BT[S.btype].name}: ${left ? `te ${left === 1 ? 'queda 1' : 'quedan ' + left}` : 'no te quedan'}</small></span></div>
    <div class="scroll pad">
      <div class="display rise" style="font-size:34px;margin-top:4px">¿Qué quieres <b>lanzar</b> al mar?</div>
      <div class="chips rise d1" style="margin-top:16px" id="kinds">${Object.keys(KINDS).map(k => `<button class="chip${S.kind === k ? ' on' : ''}" data-act="kind" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="sec rise d2" style="margin-top:18px"><label class="field"><input id="bbody" maxlength="140" value="${esc(S.body)}" placeholder="Escríbela en una línea (opcional)" aria-label="Tu botella en una línea"></label>
        <div class="ideas" id="ideas" style="margin-top:10px">${ideasHTML()}</div></div>
      <div class="sec"><button class="setrow duot" role="switch" aria-checked="${!!S.duoOn}" data-act="duoT">${icon('duo')}<span style="flex:1"><b>Botella para dos</b><span>Grabas tu mitad, un amigo graba la suya y sale al mar con las dos voces, hacia 12 orillas.</span></span><span class="sw"></span></button></div>
      ${S.duoOn ? '' : `<div class="sec"><span class="eyebrow">Tipo de botella</span><div class="btypes" id="btypes">${btypesHTML()}</div>
        ${S.btype === 'color' ? `<label class="field select" style="margin-top:10px"><select id="btarget" aria-label="A quién llega">${targetOpts()}</select></label>` : ''}
        <p class="small muted" style="margin:8px 0 0">${BT[S.btype].desc}</p>
        <button class="setrow" role="switch" aria-checked="${S.featured}" data-act="featT" style="margin-top:10px">${icon('tide')}<span style="flex:1"><b>Que salga en la marea de las 21:00</b><span>${(S.me?.tide_left || 0) ? `Arriba de todas, para todo Lima. Te ${S.me.tide_left === 1 ? 'queda 1' : 'quedan ' + S.me.tide_left}.` : 'No te quedan. Pide una en el muelle.'}</span></span><span class="sw"></span></button></div>`}
      <div class="sec">${recBox('launch', 'Toca para grabarla. Hasta 60 segundos.')}</div>
      ${left ? '' : `<div class="empty-note"><p class="small" style="margin:0">${S.btype === 'free' ? 'Te quedaste sin botellas normales. Responde una que te llegó y ganas otra, o pide más en el muelle.' : 'Ya usaste las de este tipo.'}</p><button class="btn btn-light btn-sm" data-act="getMore" data-k="${S.btype === 'free' ? 'p10' : S.btype}">${icon('bag', 's')} Pedir ${S.btype === 'free' ? '10 botellas' : 'otra'} gratis</button></div>`}
    </div>
    ${S.rec.launch && S.duoOn ? `<div class="foot pad"><button class="btn btn-a${S.me?.bottles ? '' : ' soft'}" data-act="duoStart">${icon('duo')} Guardar mi mitad e invitar</button></div>` : S.rec.launch ? `<div class="foot pad"><div class="fling${left ? '' : ' soft'}" id="fling"><span class="fb" id="fb">${bottleSVG()}</span><span class="ft">Desliza la botella hacia arriba</span></div><button class="btn btn-a${left ? '' : ' soft'}" data-act="throw">${icon('send')} Lanzar al mar</button></div>` : ''}`; },
  after(sec) {
    const fb = sec.querySelector('#fb'); let y0 = null, dy = 0;
    sec.querySelector('#bbody').addEventListener('input', e => { S.body = e.target.value; });
    sec.querySelector('#btarget')?.addEventListener('change', e => { S.target = e.target.value; });
    if (!fb) return;
    fb.addEventListener('pointerdown', e => { if (!S.rec.launch) { needVoice('launch'); return; } y0 = e.clientY; fb.setPointerCapture(e.pointerId); fb.style.transition = 'none'; });
    fb.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.min(0, e.clientY - y0); fb.style.transform = `translateY(${dy}px) rotate(${dy * .25}deg) scale(${1 - dy / 400})`; });
    const end = () => { if (y0 == null) return; y0 = null; fb.style.transition = 'transform .35s cubic-bezier(.2,1.4,.3,1)'; if (dy < -70) { fb.style.transform = 'translateY(-400px) rotate(-60deg) scale(.4)'; setTimeout(() => P.actions.throw(), 220); } else fb.style.transform = ''; dy = 0; };
    fb.addEventListener('pointerup', end); fb.addEventListener('pointercancel', end);
  }
};
P.actions.recorded = id => { if (id === 'launch' && P.curId === 'launch') { go('launch', { noPush: true }); if (S.rec.launch) setTimeout(() => { const sc = P.root.querySelector('.scroll'); sc && sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' }); }, 60); } };
function ideasHTML() { return KINDS[S.kind].map((q, i) => `<button class="idea${S.idea === i ? ' on' : ''}" data-act="idea" data-i="${i}">${q}</button>`).join(''); }
P.actions.kind = el => { S.kind = el.dataset.k; S.idea = -1; document.querySelectorAll('#kinds .chip').forEach(c => c.classList.toggle('on', c.dataset.k === S.kind)); $('#ideas').innerHTML = ideasHTML(); };
P.actions.idea = el => { S.idea = +el.dataset.i; S.body = KINDS[S.kind][S.idea]; $('#bbody').value = S.body; $('#ideas').innerHTML = ideasHTML(); };
const BT = {
  free: { name: 'Normal', sub: '8 orillas', desc: 'Llega a 8 personas afines, y a 4 más si nadie responde en 6 horas.', col: '127,216,201' },
  color: { name: 'De color', sub: 'tú eliges', desc: 'Llega a 8 personas del tema o distrito que elijas.', col: '255,112,169' },
  far: { name: 'Llega lejos', sub: '20 orillas', desc: 'La escuchan 20 personas en vez de 8.', col: '255,214,140' }
};
const btLeft = k => (k === 'color' ? S.me?.color_left : k === 'far' ? S.me?.far_left : S.me?.bottles) || 0;
const btSVG = (k, glass, featured) => featured ? bottleSVG('rgba(255,214,140,.98)', 'rgba(255,200,110,.32)') : k === 'color' ? bottleSVG('rgba(255,150,195,.95)', 'rgba(255,112,169,.22)') : k === 'far' ? bottleSVG('rgba(255,214,140,.95)', 'rgba(255,214,140,.22)') : glass && GLASS[glass] ? bottleSVG(GLASS[glass][0], GLASS[glass][1]) : bottleSVG();
const btCol = b => !b ? '127,216,201' : b.featured || b.btype === 'far' ? '255,214,140' : b.btype === 'color' ? '255,112,169' : b.glass && GLASS[b.glass] ? GLASS[b.glass][2] : '127,216,201';
const sampleNote = () => `<div class="samplenote rise d3">${icon('spark', 's')}<span><b>Botella de ejemplo.</b> Es una voz sintética para que pruebes Botella mientras se suma más gente. Si le respondes, te contesta.</span></div>`;
function mareaLine() { const h = +new Date().toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }); return h >= 21 ? 'llegó hoy a las 21:00' : 'hoy a las 21:00'; }
function btypesHTML() { return Object.entries(BT).map(([k, b]) => `<button class="btype${S.btype === k ? ' on' : ''}${btLeft(k) ? '' : ' empty'}" data-act="btype" data-k="${k}" style="--bc:${b.col}"><span class="bsv">${btSVG(k)}</span><b>${b.name}</b><span>${b.sub}</span><em>${btLeft(k)}</em></button>`).join(''); }
function targetOpts() { const v = S.target || 'topic:' + (S.me?.topics?.[0] || TOPICS[0]); S.target = v; return `<optgroup label="Por tema">${TOPICS.map(t => `<option value="topic:${t}"${v === 'topic:' + t ? ' selected' : ''}>Les gusta: ${t}</option>`).join('')}</optgroup><optgroup label="Por distrito">${DISTRICTS.filter(d => d !== 'Otro distrito').map(d => `<option value="district:${d}"${v === 'district:' + d ? ' selected' : ''}>Viven en ${d}</option>`).join('')}</optgroup>`; }
P.actions.btype = el => { S.btype = el.dataset.k; go('launch', { noPush: true }); };
P.actions.featT = el => { if (!S.featured && !(S.me?.tide_left > 0)) { return P.actions.getMore({ dataset: { k: 'tide' } }); } S.featured = !S.featured; el.setAttribute('aria-checked', S.featured); };
P.actions.getMore = async el => { const k = el.dataset.k; try { await claim(k); if (k === 'tide') S.featured = true; if (P.curId === 'launch') go('launch', { noPush: true }); } catch (e) { err(e); } };
P.actions.throw = async () => {
  const r = S.rec.launch; if (!r) return needVoice('launch');
  if (!btLeft(S.btype)) { const fb = $('#fb'); if (fb) fb.style.transform = ''; return toast(S.btype === 'free' ? 'Te quedaste sin botellas normales. Responde una que te llegó y ganas otra.' : 'Ya usaste las de este tipo. Elige otra.'); }
  if (S.launching) return; S.launching = true;
  P.st.thrownAt = performance.now(); P.st.shores = null; go('thrown', { noPush: true });
  try {
    const path = await upload(r.blob, r.ext);
    const [tk, tv] = S.btype === 'color' ? (S.target || '').split(':') : [];
    P.st.btype = S.btype;
    P.st.featured = S.featured && S.me?.tide_left > 0;
    const [res] = await rpc('launch_bottle', { p_kind: S.kind, p_body: S.body.trim() || null, p_voice: path, p_secs: r.secs, p_peaks: r.peaks, p_type: S.btype, p_topic: tk === 'topic' ? tv : null, p_district: tk === 'district' ? tv : null, p_featured: P.st.featured });
    delete S.rec.launch; S.body = ''; S.idea = -1; S.featured = false; Object.assign(S.me, { bottles: res.left_bottles, color_left: res.left_color, far_left: res.left_far, tide_left: res.left_tide ?? S.me.tide_left }); P.st.shores = res.shores; if (!btLeft(S.btype)) S.btype = 'free'; loadBottles().catch(() => {});
    watchPending(75000); watchPending(150000); loadHome(); askPush('launch'); ping();
  } catch (e) { P.st.shores = -1; err(e, 'Tu botella no pudo salir. Intenta otra vez.'); go('launch', { noPush: true }); }
  S.launching = false;
};

/* lanzada: arco, chapuzón, faro, orillas */
P.screens.thrown = {
  transient: true,
  anim(ctx, w, h, t, st) {
    const horizon = .4, mx = sky(ctx, w, h, t, horizon), k = since('thrownAt');
    const lx = w * .9, ly = h * horizon - 8, beamOn = k > 1.2 && k < 3.4 ? Math.min(1, (k - 1.2) * 3, (3.4 - k) * 3) : .25;
    const beamA = k > 1.2 && k < 3.4 ? -.28 + Math.sin((k - 1.2) / 2.2 * Math.PI) * .32 : -.1;
    lighthouse(ctx, lx, ly, 7, t, beamA, beamOn);
    const n = st.shores > 0 ? st.shores : 3, col = st.featured ? '255,214,140' : S.me?.glass && st.btype === 'free' ? GLASS[S.me.glass][2] : (BT[st.btype] || BT.free).col;
    waves(ctx, w, h, t, horizon, mx, (i, wv) => {
      if (i !== 1) return;
      if (k < .9) { const u = k / .9, x = w * (.7 - u * .28), y = h * (.98 - Math.sin(u * Math.PI) * .5); bottle(ctx, x, Math.min(y, h * .98), .8, u * 7, 1, col); }
      else {
        const u = Math.min(1, (k - .9) / 3), x = w * .42 + u * w * .04, y = wv(w * .42) - u * h * .06; const lit = beamOn > .5 && Math.abs(beamA + .05) < .12; bottle(ctx, x, y, .8 - u * .4, -.3 + Math.sin(t) * .05, lit ? 2.4 : 1 - u * .3, col);
        if (k < 1.6) { const q = (k - .9) / .7; for (let r = 0; r < 3; r++) { ctx.strokeStyle = 'rgba(170,240,228,' + (.6 * (1 - q)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(w * .42, wv(w * .42) + 4, 20 + q * 140 + r * 18, 4 + q * 20 + r * 4, 0, 0, 7); ctx.stroke(); } }
      }
    });
    if (k >= 3.4 && st.shores != null) { const q = Math.min(1, (k - 3.4) / .8); for (let i = 0; i < n; i++) { if (i / n > q) continue; const x = w * (.1 + i * (.6 / Math.max(1, n - 1))), a = .5 + Math.sin(t * 2 + i) * .3; ctx.fillStyle = `rgba(${col},${a})`; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(x, h * horizon - 2, 3.8, 0, 7); ctx.fill(); ctx.shadowBlur = 0; } }
  },
  render: () => `<div style="flex:1"></div><div class="pad" style="padding-bottom:26px;background:linear-gradient(transparent,rgba(3,16,28,.92) 35%)">
    <span class="eyebrow a" id="tstat">Lanzada</span><div class="display" id="thead" style="margin-top:8px">Tu botella cayó al mar.</div>
    <p class="lead" id="tlead">La marea la lleva hacia personas con tus mismos temas.</p>
    <div class="foot" style="padding-bottom:0"><button class="btn btn-light" data-act="toMine">Ver mis botellas</button></div></div>`,
  after() {
    const set = (a, b, c) => { const e1 = $('#tstat'), e2 = $('#thead'), e3 = $('#tlead'); if (!e1) return; [e1, e2, e3].forEach(e => { e.classList.remove('rise'); void e.offsetWidth; e.classList.add('rise'); }); e1.textContent = a; e2.textContent = b; e3.textContent = c; };
    P.timers.push(setTimeout(() => set('El faro la guía', 'La luz del faro pasa por tu botella.', 'Busca orillas con tus mismos temas.'), 1300));
    const final = () => { const n = P.st.shores; if (n == null) { P.timers.push(setTimeout(final, 400)); return; } if (n < 0) return;
      set('En camino', n > 1 ? `Tu botella va hacia ${n} orillas.` : n === 1 ? 'Llegó a una orilla.' : 'Tu botella flota en el mar.',
        (P.st.featured ? 'Además sale en la marea de las 21:00. ' : '') + (n >= 8 ? (P.st.duo ? 'Lleva las dos voces. Quien responda, les responde a los dos. ' : '') + 'Si alguien responde, te avisamos. Si nadie la abre, la marea de las 21:00 la lleva a otra orilla.' : 'Todavía somos pocos: llegará a más personas a medida que se sumen. Te avisamos cuando alguien responda.')); };
    P.timers.push(setTimeout(final, 3500));
  }
};
P.actions.toMine = () => { P.st.duo = false; P.hist = ['orilla']; go('mine', { fade: true, noPush: true }); };

/* ================= MIS BOTELLAS ================= */
P.screens.mine = {
  render: () => `${sb_()}<div class="scroll pad"><div class="top"><span class="h2" style="flex:1">Mis botellas</span>${meBtn()}</div>
    ${duosHTML()}${S.bottles.length ? mapCard() : ''}
    ${S.bottles.length ? S.bottles.map((b, i) => { const sub = b.held ? 'Espera la marea de las 21:00' : b.answers ? `Llegó a ${b.shores} ${b.shores === 1 ? 'orilla' : 'orillas'} · ${b.answers} ${b.answers === 1 ? 'respuesta' : 'respuestas'}` : b.shores ? `En el mar · llegó a ${b.shores} ${b.shores === 1 ? 'orilla' : 'orillas'}${b.opened ? ` · ${b.opened === 1 ? 'la abrió 1 persona' : 'la abrieron ' + b.opened}` : ''}` : 'Flotando · espera a que llegue gente nueva';
      return `<div class="row rise d${Math.min(i, 4)}${b.answers ? '' : ' drift'}" ${b.answers ? `data-act="mineGo" data-id="${b.id}" role="button" tabindex="0"` : ''}><span style="flex:1;min-width:0">${b.duo ? '<span class="eyebrow a">Para dos</span>' : b.tide_day ? '<span class="eyebrow a">Pregunta de la marea</span>' : ''}<span class="t" style="font-weight:300;font-size:18px">${esc(b.body || b.kind + ' de ' + fmt(b.voice_secs))}</span><span class="s">${sub}</span>${openersHTML(b)}<span class="shores">${Array.from({ length: Math.max(3, Math.min(b.shores, 8)) }, (_, k) => `<i class="${k < b.opened ? 'on' : ''}"></i>`).join('')}</span>${vn(b.voice, b.voice_secs, { mine: true, peaks: b.voice_peaks })}${b.voice2 ? vn(b.voice2, b.voice2_secs, { mine: true, peaks: b.voice2_peaks }) : ''}${b.answers ? '' : `<span class="driftb">${bottleSVG()}</span>`}</span>${b.answers ? '<span class="pill a">Escuchar</span>' : ''}</div>`; }).join('')
      : `<div class="empty rise"><span style="width:120px;display:block;margin:30px auto 10px">${bottleSVG()}</span><div class="h3" style="text-align:center">Todavía no lanzas ninguna</div><p class="small muted" style="text-align:center;margin:6px auto 18px;max-width:30ch">Graba una pregunta o algo que quieras contar, y lánzala.</p><button class="btn btn-a" data-go="launch">${icon('bottle')} Lanzar una botella</button></div>`}
  </div>${tabsHTML('mine')}`,
  async after() { if (!P.st.mineFresh) { P.st.mineFresh = true; try { await Promise.all([loadBottles(), loadDuos()]); if (P.curId === 'mine') rerender(); } catch (e) {} } },
  leave() { P.st.mineFresh = false; }
};
function openersHTML(b) {
  if (!b.opened) return '';
  if (!b.openers) return `<button class="who-up" data-act="toStore">${icon('eye', 's')} Ver desde dónde la abrieron</button>`;
  return `<span class="who">${b.openers.slice(0, 4).map(o => `<i>${icon(o.answered ? 'chat' : 'eye', 's')}${esc(o.place)} · ${ago(o.at)}</i>`).join('')}</span>`;
}
P.actions.mineGo = (el, e) => { if (e && e.target.closest('.who-up')) return; if (e && e.target.closest('.vn')) return; const b = S.bottles.find(x => x.id === el.dataset.id); if (!b) return; if (b.answers > 1) { go('convos', { fade: true }); return; } if (b.convo) openChat(b.convo); };

/* ================= CONVERSACIONES ================= */
/* Bandeja de conversaciones: hora a la derecha, punto de no escuchado, qué pasó al último y en qué etapa van.
   Referencias de Mobbin: Messages de Apple (punto y hora) y Meetup (filtro "No leídos"). */
const stamp = iso => { const d = new Date(iso), n = new Date(); if (d.toDateString() === n.toDateString()) return hm(iso); if (new Date(Date.now() - 864e5).toDateString() === d.toDateString()) return 'Ayer'; return Date.now() - d < 6 * 864e5 ? d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '') : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', ''); };
const pending = c => !c.closed && !c.cooled && !c.last_mine;
function stageName(c) { const s = stageOf(c); return s.plan ? 'Plan' : s.spoke ? 'Plan' : s.voices ? 'Llamada' : 'Voces'; }
function convoRow(c, i) {
  const nw = unread(c), off = c.closed || c.cooled;
  const prev = c.closed ? 'Conversación cerrada' : c.cooled ? 'Volvió al mar' : nw ? 'Nota de voz nueva' : c.last_mine ? 'Tú: nota de voz' : c.my_key && c.other_key ? 'Ya pueden llamarse' : c.i_launched ? 'Respondió tu botella' : 'Respondiste su botella';
  return `<button class="crow${nw ? ' new' : ''}${off ? ' off' : ''} rise d${Math.min(i, 4)}" data-act="chatGo" data-id="${c.id}">
    <span class="cdot" aria-hidden="true"></span>${orb(colorOf(c.id), 48)}
    <span class="cmain"><span class="cl1"><b>${esc(c.alias)}</b><time datetime="${c.last_at}">${stamp(c.last_at)}</time></span>
      <span class="cl2">${icon(off ? 'tide' : c.last_mine ? 'check' : 'mic', 's')}<span>${prev}</span>${off ? '' : `<em>${stageName(c)}</em>`}</span></span></button>`;
}
function convoListHTML() {
  const n = S.convos.filter(pending).length, f = P.st.cf === 'p' && n ? 'p' : 'all', list = f === 'p' ? S.convos.filter(pending) : S.convos;
  return `${S.convos.length > 1 ? `<div class="chips cfil rise" role="tablist"><button class="chip${f === 'all' ? ' on' : ''}" role="tab" aria-selected="${f === 'all'}" data-act="cFil" data-f="all">Todas</button><button class="chip${f === 'p' ? ' on' : ''}" role="tab" aria-selected="${f === 'p'}" data-act="cFil" data-f="p">Te toca responder${n ? ` <b class="cnt">${n}</b>` : ''}</button></div>` : ''}
    <div class="clist">${list.map(convoRow).join('')}</div>`;
}
P.actions.cFil = el => { if (el.dataset.f === 'p' && !S.convos.some(pending)) return toast('Estás al día: no te toca responder a nadie.'); P.st.cf = el.dataset.f; rerender(); };
P.screens.convos = {
  render: () => `${sb_()}<div class="scroll pad"><div class="top"><span class="h2" style="flex:1">Conversaciones</span>${meBtn()}</div>
    ${S.convos.length ? convoListHTML()
      : `<div class="empty rise"><div class="h3" style="text-align:center;margin-top:40px">Aún no hay conversaciones</div><p class="small muted" style="text-align:center;margin:6px auto 18px;max-width:30ch">Se abren cuando respondes una botella o alguien responde la tuya. Son anónimas hasta que los dos compartan su nombre.</p><button class="btn btn-glass" data-go="orilla" data-fade>Ir a mi orilla</button></div>`}
  </div>${tabsHTML('convos')}`,
  async after() { if (!P.st.convosFresh) { P.st.convosFresh = true; try { await loadConvos(); if (P.curId === 'convos') rerender(); } catch (e) {} } },
  leave() { P.st.convosFresh = false; }
};
P.actions.chatGo = el => openChat(el.dataset.id);
async function openChat(cid, opts = {}) {
  try {
    if (!S.convos.find(c => c.id === cid)) await loadConvos();
    S.convo = S.convos.find(c => c.id === cid); if (!S.convo) return toast('No encontramos esa conversación.');
    await loadMsgs(cid); markRead(cid); go('chat', opts);
  } catch (e) { err(e); }
}
const convo = () => S.convo;
function msgHTML(m, i) {
  const me = m.sender === uid();
  if (m.body && m.body.startsWith('#bottle|')) { const [, kind, text] = m.body.split('|'), mb = convo().i_launched, duo = convo().duo; return `<div class="msg${mb ? ' me' : ''} rise"><div class="minipaper"><small>${mb ? 'Tu botella' : 'Su botella'}${duo ? ' para dos' : ''} · ${esc((kind || '').toLowerCase())}</small>${esc(text || 'Una nota de voz')}</div>${vn(m.voice, m.voice_secs, { mine: mb, peaks: m.voice_peaks })}<span class="when">${hm(m.created_at)}</span></div>`; }
  if (m.body === '#bottle2|') { const mb = convo().i_launched; return `<div class="msg${mb ? ' me' : ''}"><span class="when" style="margin:0 0 4px">${m.sender === uid() ? 'Tu mitad' : 'La otra voz de la botella'}</span>${vn(m.voice, m.voice_secs, { mine: mb, peaks: m.voice_peaks })}</div>`; }
  if (m.body && m.body.startsWith('#gift|')) return `<div class="msg${me ? ' me' : ''} rise"><div class="giftcard"><span class="gb">${bottleSVG('rgba(255,214,140,.98)', 'rgba(255,200,110,.34)')}<i class="seal"></i></span><b>${me ? 'Le mandaste una botella con lacre' : 'Te mandó una botella con lacre'}</b><span>${me ? 'Se queda dorada en esta conversación.' : 'Te regaló una botella para lanzar.'}</span></div><span class="when">${hm(m.created_at)}</span></div>`;
  if (m.body && m.body.startsWith('#plan|')) { const [, place, when] = m.body.split('|'); const ok = (S.msgs[convo().id] || []).some(x => x.body === '#planok|' && x.sender !== m.sender && x.created_at > m.created_at); const later = (S.msgs[convo().id] || []).some(x => x.body && x.body.startsWith('#plan|') && x.created_at > m.created_at);
    return `<div class="msg${me ? ' me' : ''} rise"><div class="plancard">${icon('pin')}<span class="eyebrow ${ok ? 'a' : ''}">${ok ? 'Plan aceptado' : me ? 'Propusiste un plan' : 'Te propone un plan'}</span><b>${esc(place)}</b><span>${esc(when)}</span>${!me && !ok && !later && !convo().closed ? '<button class="btn btn-a btn-sm" data-act="planOk">Acepto</button>' : ''}</div><span class="when">${hm(m.created_at)}</span></div>`; }
  if (m.body === '#planok|') return `<div class="sys">${icon('check', 's')} ${me ? 'Aceptaste el plan' : 'Aceptó el plan'} · lugares públicos y avísale a alguien de confianza</div>`;
  if (m.body && m.body.startsWith('#call|')) return `<div class="sys">${icon('phone', 's')} ${me ? 'Llamaste' : 'Te llamó'} · ${hm(m.created_at)}</div>`;
  if (!m.voice) return '';
  return `<div class="msg${me ? ' me' : ''}${i > S.msgs[convo().id].length - 4 ? ' rise' : ''}">${vn(m.voice, m.voice_secs, { mine: me, peaks: m.voice_peaks })}<span class="when">${hm(m.created_at)}</span></div>`;
}
/* Separadores de día, como en las apps de mensajes: una sola fecha por día y la hora en cada nota. */
const hm = iso => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
function dayLabel(iso) {
  const d = new Date(iso), n = new Date(), y = new Date(Date.now() - 864e5);
  if (d.toDateString() === n.toDateString()) return 'Hoy';
  if (d.toDateString() === y.toDateString()) return 'Ayer';
  const l = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return l.charAt(0).toUpperCase() + l.slice(1);
}
function threadHTML(list) {
  let last = '';
  return list.map((m, i) => { const h = msgHTML(m, i); if (!h || !m.created_at) return h; const d = new Date(m.created_at).toDateString(); const sep = d !== last ? `<div class="day" role="separator">${dayLabel(m.created_at)}</div>` : ''; last = d; return sep + h; }).join('');
}
/* La conversación avanza por etapas: primero las voces, después los nombres, la llamada y, si les nace, un plan.
   Todas se ven desde el inicio; las que faltan muestran qué las abre. */
const talked = c => (S.msgs[c.id] || []).some(m => m.body && m.body.startsWith('#call|')) || LS.get('talked', []).includes(c.id);
function stageOf(c) {
  const need = 2, mine = Math.min(need, c.my_voices || 0), theirs = c.sample ? need : Math.min(need, c.other_voices || 0), voices = mine >= need && theirs >= need;
  const callable = c.my_key && c.other_key, plan = (S.msgs[c.id] || []).some(m => m.body && m.body.startsWith('#plan|')), spoke = callable && (talked(c) || plan);
  const st = {
    voz: voices ? 'done' : 'cur',
    nombre: c.revealed ? 'done' : 'open',
    llamada: !voices ? 'lock' : spoke ? 'done' : 'cur',
    plan: plan ? 'done' : spoke ? 'cur' : 'lock'
  };
  return { st, mine, theirs, need, voices, callable, spoke, plan };
}
const STAGES = [['voz', 'Voces', 'mic'], ['nombre', 'Nombres', 'eye'], ['llamada', 'Llamada', 'phone'], ['plan', 'Plan', 'pin']];
function stagesHTML(c) {
  if (c.closed) return '';
  const g = stageOf(c);
  return `<div class="stages" role="list" aria-label="Etapas de la conversación">${STAGES.map(([k, label, ic], i) => { const v = g.st[k];
    return `${i ? `<span class="sln${v === 'lock' ? '' : ' on'}"></span>` : ''}<button class="stg ${v}" role="listitem" data-act="stageInfo" aria-label="${label}: ${v === 'done' ? 'listo' : v === 'lock' ? 'todavía cerrado' : 'disponible'}"><i>${icon(v === 'done' ? 'check' : v === 'lock' ? 'lock' : ic, 's')}</i><span>${label}</span></button>`; }).join('')}</div>`;
}
/* una sola línea con lo que sigue */
function nextLine(c) {
  const g = stageOf(c), other = c.revealed ? esc(c.alias) : 'esta persona';
  if (c.cooled) return `${icon('clock', 's')} Pasaron 48 horas sin respuesta y esta conversación volvió al mar.`;
  const cool = c.cool_at && new Date(c.cool_at) - Date.now() < 12 * 3600e3 ? ` Si nadie responde, vuelve al mar en ${until(c.cool_at)}.` : '';
  if (!g.voices) return `<span class="vc">${Array.from({ length: g.need }, (_, k) => `<i class="${k < g.mine ? 'on' : ''}"></i>`).join('')}</span> Tú ${g.mine}/${g.need}${c.sample ? '' : ` · ${c.revealed ? esc(c.alias) : 'la otra persona'} ${g.theirs}/${g.need}`}. Con 2 notas de voz de cada uno se abre la llamada.${cool}`;
  if (!g.callable) return `${icon('phone', 's')} ${c.my_key ? `Pediste la llamada. Falta que ${other} la pida.` : c.other_key ? `${c.revealed ? esc(c.alias) : 'Esta persona'} ya quiere hablar en vivo.` : 'Ya pueden abrir la llamada: se abre si los dos la piden.'}${cool}`;
  if (!g.spoke) return `${icon('phone', 's')} Ya pueden llamarse. Solo voz, sin video.`;
  if (!g.plan) return `${icon('pin', 's')} ¿Se ven? Propongan un lugar público, si les nace.`;
  return `${icon('check', 's')} Ya hay un plan. Lugares públicos y avísale a alguien de confianza.`;
}
/* la acción de la etapa actual, al final del hilo y pequeña: el chat va primero */
function stageCard(c) {
  if (c.closed) return '<div class="divider">Esta conversación terminó</div>';
  if (c.cooled) return '<div class="divider">Volvió al mar</div>';
  const g = stageOf(c);
  if (!g.voices) return '';
  if (!g.callable) return `<div class="scard${c.other_key ? ' on' : ''}"><span class="si">${icon(c.my_key ? 'clock' : 'phone')}</span><span class="tx"><b>${c.other_key ? 'Quiere hablar contigo' : c.my_key ? 'Pediste la llamada' : '¿Hablan en vivo?'}</b><span>${c.my_key ? 'Se abre cuando también la pida.' : c.other_key ? 'Pídela tú y se abre.' : 'Se abre si los dos la piden.'}</span></span>${c.my_key ? '' : '<button class="btn btn-a btn-sm" data-act="key">Pedir llamada</button>'}</div>`;
  if (!g.spoke) return `<div class="scard on"><span class="si">${icon('phone')}</span><span class="tx"><b>Ya pueden llamarse</b><span>Los dos dijeron que sí.</span></span><button class="btn btn-a btn-sm" data-act="call">Llamar</button></div>`;
  if (!g.plan) return `<div class="scard"><span class="si">${icon('pin')}</span><span class="tx"><b>¿Se ven?</b><span>Propón un lugar público y un día.</span></span><button class="btn btn-light btn-sm" data-act="planAsk">Armar un plan</button></div>`;
  return '';
}
P.actions.stageInfo = () => {
  const c = convo(); if (!c) return; const g = stageOf(c);
  const row = (k, ic, t, d) => { const v = g.st[k]; return `<div class="setrow stinfo ${v}">${icon(v === 'done' ? 'check' : v === 'lock' ? 'lock' : ic)}<span style="flex:1"><b>${t}</b><span>${d}</span></span>${v === 'done' ? '<span class="pill a">Listo</span>' : v === 'lock' ? '<span class="pill">Pronto</span>' : ''}</div>`; };
  sheet(`${sheetHead('Cómo avanza una conversación')}<p class="muted" style="font-size:14px;margin:0 0 10px">Aquí primero se conocen por lo que dicen. Lo demás se abre a su ritmo.</p>
    ${row('voz', 'mic', '1. Notas de voz', `Mándense al menos 2 cada uno. Van ${g.mine} tuyas${c.sample ? '' : ` y ${g.theirs} suyas`}.`)}
    ${row('nombre', 'eye', '2. Sus nombres', 'Cuando quieran. Se ven solo si los dos los comparten.')}
    ${row('llamada', 'phone', '3. Llamada de voz', 'Se abre con las 2 notas de cada uno y si los dos la piden. Sin video.')}
    ${row('plan', 'pin', '4. Un plan', 'Después de hablar, si les nace, propongan un lugar público.')}
    ${c.revealed || c.closed ? '' : `<button class="btn btn-glass" data-act="reveal" style="margin-top:10px">${icon('eye')} ${c.my_reveal ? 'Ocultar mi nombre' : 'Compartir mi nombre'}</button>`}`);
};
P.screens.chat = {
  render: () => { const c = convo(); if (!c) return ''; const list = S.msgs[c.id] || [], g = stageOf(c); return `${sb_()}<div class="top pad">${backBtn()}${orb(colorOf(c.id), 40)}<span class="title">${esc(c.alias)}<small>${c.sample ? 'de ejemplo · ' : ''}${c.revealed ? esc(c.place) + ' · ' : ''}${c.duo ? 'botella para dos' : c.i_launched ? 'respondió tu botella' : 'respondiste su botella'}</small></span>${g.callable && !c.closed ? `<button class="iconbtn glass" data-act="call" aria-label="Llamar">${icon('phone')}</button>` : ''}<button class="iconbtn glass" data-act="chatMenu" aria-label="Opciones">${icon('more')}</button></div>
    ${c.closed ? '' : `<div class="pad stagebar">${stagesHTML(c)}<p class="nextl">${nextLine(c)}</p></div>`}
    <div class="scroll pad" id="thread"><div class="thread">
      ${c.sample ? `<div class="samplenote">${icon('spark', 's')}<span>Conversación de ejemplo con una voz sintética, para que pruebes todo el recorrido. Con personas reales funciona igual.</span></div>` : ''}
      ${threadHTML(list)}
      ${c.next_at && new Date(c.next_at) > Date.now() ? `<div class="msg typing"><span class="dots3"><i></i><i></i><i></i></span><span class="when">Grabando una nota de voz…</span></div>` : ''}
      ${!c.closed && !c.cooled && !c.revealed && (c.other_reveal || c.my_reveal) ? `<button class="reveal" data-act="chatMenu">${icon('eye', 's')}<span>${c.my_reveal ? 'Ya compartiste tu nombre. Se ve cuando la otra persona también lo comparta.' : 'Quiere compartir su nombre contigo. Toca para compartir el tuyo.'}</span></button>` : ''}
      ${stageCard(c)}
    </div></div>
    ${c.closed || c.cooled ? '' : `<div class="foot pad cfoot" id="cfoot">${chatFoot()}</div>`}`; },
  after(sec) { const s = sec.querySelector('#thread'); if (s) s.scrollTop = s.scrollHeight; watchPending(); },
  leave() { if (S.convo) markRead(S.convo.id); }
};
function chatFoot() {
  if (REC.mr && REC.id === 'chat') return `<button class="iconbtn glass" data-act="chatRecCancel" aria-label="Cancelar">${icon('close')}</button><div class="clive"><span class="num" id="ctime">0:00</span><span class="cwave" id="cwave"></span></div><button class="iconbtn sendb" data-act="chatRecSend" aria-label="Enviar nota de voz">${icon('send')}</button>`;
  return `<button class="iconbtn glass giftb" data-act="giftAsk" aria-label="Mandar una botella con lacre">${icon('gift')}</button><span class="small muted" style="text-align:center">Toca el micrófono para grabar</span><button class="iconbtn sendb" data-act="chatRec" aria-label="Grabar nota de voz">${icon('mic')}</button>`;
}
P.actions.chatRec = async () => {
  if (REC.mr || CALL) return;
  const ok = await recStart(MAXV, (t, s) => { const e = $('#ctime'); if (e) e.textContent = fmt(t); const w = $('#cwave'); if (w) { const i = document.createElement('i'); i.style.height = Math.round(4 + 22 * (s[s.length - 1] || 0)) + 'px'; w.appendChild(i); if (w.children.length > 40) w.firstChild.remove(); } }, () => P.actions.chatRecSend());
  if (!ok) return; REC.id = 'chat'; $('#cfoot').innerHTML = chatFoot();
};
P.actions.chatRecCancel = () => { recCancel(); const f = $('#cfoot'); if (f) f.innerHTML = chatFoot(); };
P.actions.chatRecSend = async () => {
  const c = convo(); const r = await recStop(); const f = $('#cfoot'); if (f) f.innerHTML = chatFoot(); if (!r || !c) return;
  const tmp = { id: 'tmp' + Date.now(), convo_id: c.id, sender: uid(), voice: r.url, voice_secs: r.secs, voice_peaks: r.peaks, created_at: new Date().toISOString() };
  S.msgs[c.id].push(tmp); rerender();
  try {
    const path = await upload(r.blob, r.ext);
    const { data, error } = await sb.from('messages').insert({ convo_id: c.id, sender: uid(), voice: path, voice_secs: r.secs, voice_peaks: r.peaks }).select().single();
    if (error) throw error;
    URLS.set(path, r.url);
    const l = S.msgs[c.id]; const i = l.indexOf(tmp); if (i >= 0 && !l.some(x => x.id === data.id)) l[i] = data; else if (i >= 0) l.splice(i, 1);
    c.last_mine = true; c.last_at = data.created_at; c.my_voices = (c.my_voices || 0) + 1; loadHome(); ping();
  } catch (e) { S.msgs[c.id] = S.msgs[c.id].filter(x => x !== tmp); err(e, 'No se pudo enviar tu nota de voz.'); }
  if (P.curId === 'chat') rerender();
};
P.actions.key = async el => {
  const c = convo(); if (!c) return; if (!stageOf(c).voices) return P.actions.stageInfo(); el.disabled = true;
  try { const both = await rpc('set_key', { p_convo: c.id }); c.my_key = true; if (both) { c.other_key = true; momentFor(c); } else rerender(); } catch (e) { el.disabled = false; err(e); }
};
function momentFor(c) { const seen = LS.get('moments', []); if (seen.includes(c.id)) { if (P.curId === 'chat') rerender(); return; } seen.push(c.id); LS.set('moments', seen); P.st.momentAt = performance.now(); go('moment'); }
P.actions.chatMenu = () => {
  const c = convo(); if (!c) return;
  sheet(`${sheetHead(esc(c.alias))}
    ${c.closed ? '' : `<button class="setrow" role="switch" aria-checked="${c.my_reveal}" data-act="reveal">${icon('eye')}<span style="flex:1"><b>Compartir mi nombre</b><span>${c.revealed ? 'Los dos lo compartieron.' : 'Se muestra solo cuando los dos lo comparten.'}</span></span><span class="sw"></span></button>`}
    ${c.revealed && c.intro_voice ? `<div class="setrow" style="cursor:default">${icon('user')}<span style="flex:1"><b>Su presentación</b>${vn(c.intro_voice, c.intro_secs || 10)}</span></div>` : ''}
    ${c.closed ? '' : `<button class="setrow" data-act="blockAsk">${icon('block')}<span style="flex:1"><b>Bloquear</b><span>Termina la conversación y no vuelven a cruzarse.</span></span></button>`}
    ${c.closed ? '' : `${stageOf(c).spoke ? `<button class="setrow" data-act="planAsk">${icon('pin')}<span style="flex:1"><b>Armar un plan</b><span>Propón un lugar público y un día.</span></span></button>` : ''}<button class="setrow" data-act="stageInfo">${icon('spark')}<span style="flex:1"><b>Cómo avanza la conversación</b><span>Voces, nombres, llamada y plan.</span></span></button><button class="setrow" data-act="giftAsk">${icon('gift')}<span style="flex:1"><b>Mandar botella con lacre</b><span>Un regalo dorado que se queda en la conversación.</span></span></button>`}
    <button class="setrow" data-act="reportAsk">${icon('flag')}<span style="flex:1"><b>Reportar</b><span>Bloquea y nos avisa para revisar.</span></span></button>`);
};
P.actions.reveal = async el => {
  const c = convo(); const on = !c.my_reveal;
  try { await rpc('set_reveal', { p_convo: c.id, p_on: on }); await loadConvos(); S.convo = S.convos.find(x => x.id === c.id); closeSheet(); rerender(); toast(on ? (S.convo.revealed ? `Ahora se conocen: ${S.convo.alias}.` : 'Listo. Se verá cuando la otra persona también lo comparta.') : 'Tu nombre vuelve a estar oculto.'); } catch (e) { err(e); }
};
P.actions.blockAsk = () => sheet(`${sheetHead('¿Bloquear?')}<p class="muted" style="font-size:14px;margin:0 0 16px">La conversación termina para los dos y no te volverán a llegar sus botellas.</p><button class="btn btn-a" data-act="blockGo">Bloquear</button><button class="btn btn-ghost" data-act="closeSheet" style="margin-top:6px">Cancelar</button>`);
P.actions.reportAsk = () => sheet(`${sheetHead('Reportar')}<p class="muted" style="font-size:14px;margin:0 0 12px">La conversación termina y la revisamos.</p>${REASONS.map(r => `<button class="setrow" data-act="blockGo" data-v="${r}">${icon('flag')}<span style="flex:1"><b>${r}</b></span></button>`).join('')}`);
P.actions.blockGo = async el => {
  const c = convo(); closeSheet();
  try { await rpc('block_convo', { p_convo: c.id, p_reason: el.dataset.v || null }); c.closed = true; await loadConvos(); P.hist = ['orilla']; go('convos', { back: true }); toast(el.dataset.v ? 'Gracias por avisar. Lo vamos a revisar.' : 'Bloqueaste a esta persona.'); } catch (e) { err(e); }
};

/* momento de conexión */
P.screens.moment = {
  cls: 'moment', transient: true,
  anim(ctx, w, h, t) {
    const horizon = .5, mx = sky(ctx, w, h, t, horizon), k = since('momentAt'), a = ease(k / 1.2);
    waves(ctx, w, h, t, horizon, mx, (i, wv) => {
      if (i !== 2) return;
      if (k < 1.5) { const xA = w * (-.1 + .48 * a), xB = w * (1.1 - .48 * a); bottle(ctx, xA, wv(xA) - 6, .7, -.2 + Math.sin(t) * .1, 1, '127,216,201', k < 1.25); bottle(ctx, xB, wv(xB) - 6, .7, Math.PI + .2 + Math.sin(t + 1) * .1, 1, '255,214,140', k < 1.25); }
      else { bottle(ctx, w * .38, wv(w * .38) - 6, .7, -.2, .6, '127,216,201', false); bottle(ctx, w * .62, wv(w * .62) - 6, .7, Math.PI + .2, .6, '255,214,140', false); }
    });
    if (k > 1.25) {
      const q = ease((k - 1.25) / 1), cy = h * .5 - 30 - q * h * .16, sp = (1 - Math.min(1, Math.max(0, (k - 1.8) / .6))) * 46;
      [[-1, '#F3E6C8'], [1, '#F6E7C4']].forEach(([s, c]) => { ctx.save(); ctx.translate(w / 2 + s * sp, cy); ctx.rotate(s * (1 - q) * .5); ctx.shadowColor = 'rgba(255,236,190,.9)'; ctx.shadowBlur = 30 * q; ctx.fillStyle = c; ctx.fillRect(-36, -24, 72, 48); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(42,32,22,.35)'; for (let j = 0; j < 4; j++) ctx.fillRect(-26, -12 + j * 8, j % 2 ? 36 : 52, 2); ctx.restore(); });
      if (k > 2.4) { const f = Math.max(0, 1 - (k - 2.4) / 1); for (let i = 0; i < 3; i++) { ctx.strokeStyle = `rgba(246,231,196,${f * .6})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(w / 2, cy, 40 + (k - 2.4) * w * (.4 + i * .2), 0, 7); ctx.stroke(); } }
    }
  },
  render: () => { const c = convo(); return `${sb_()}<div style="flex:1"></div><div class="pad" style="padding-bottom:28px;text-align:center;background:linear-gradient(transparent,color-mix(in srgb,var(--bg) 90%,transparent) 40%)">
    <span class="eyebrow a">Las dos botellas llegaron a la misma orilla</span>
    <div class="mword" style="font-size:58px">¡Tierra a la vista!</div>
    <p class="lead" style="margin:14px auto 0">Tú y ${c && c.revealed ? esc(c.alias) : 'esta persona'} se hablaron sin verse. Ahora, sus voces.</p>
    <div class="foot" style="padding-bottom:0"><button class="btn btn-a" data-act="call">${icon('phone')} Llamar ahora</button><button class="btn btn-ghost" data-act="back">Después</button></div></div>`; }
};

/* ================= PERFIL ================= */
P.screens.perfil = {
  anim: (ctx, w, h, t) => { const mx = sky(ctx, w, h, t, .2); waves(ctx, w, h, t, .2, mx, null, 3); },
  render: () => { const m = S.me || {}; return `${sb_()}<div class="top pad"><span class="title"></span>${(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? '' : `<button class="iconbtn glass" data-act="install" aria-label="Instalar en tu celular">${icon('download')}</button>`}</div>
    <div class="scroll pad">
      <div class="me rise">${orb('var(--a)', 88, true)}<div class="h2" style="margin-top:8px">${esc(m.name || '')}</div><div class="small muted">${esc(m.district || '')}</div>${m.intro_voice ? vn(m.intro_voice, m.intro_secs || 10, { mine: true, peaks: m.intro_peaks }) : ''}<button class="btn btn-ghost btn-sm" data-act="reIntro" style="margin-top:6px">Grabar otra presentación</button></div>
      <div class="sec rise d1"><span class="eyebrow">Tus botellas</span><div class="stats"><div class="stat2"><b>${m.bottles ?? 0}</b><span>Normales</span></div><div class="stat2"><b style="color:#FF8FC0">${m.color_left ?? 0}</b><span>De color</span></div><div class="stat2"><b style="color:#FFD68C">${m.far_left ?? 0}</b><span>Llegan lejos</span></div></div><p class="small muted" style="margin:8px 0 0">Cada respuesta te regala una normal (te quedan ${Math.max(0, 3 - (m.earned_day === limaToday() ? m.earned : 0))} por ganar hoy).</p></div>
      <div class="invite rise d2"><span class="eyebrow a">Invita a un amigo</span><div class="h2" style="font-size:24px">Mientras más gente, más orillas.</div><div class="code"><span>${esc(inviteLink().replace(/^https?:\/\//, ''))}</span><button class="btn btn-a btn-sm" data-act="copyLink">${icon('copy', 's')} Copiar</button></div>${navigator.share ? `<button class="btn btn-glass" data-act="shareLink">${icon('export')} Compartir invitación</button>` : ''}</div>
      <div class="sec rise d2"><span class="eyebrow">Tu voz</span>
        <button class="setrow" data-go="bitacora">${icon('flame')}<span style="flex:1"><b>Tu bitácora</b><span>${S.home?.streak ? plural(S.home.streak, 'día seguido', 'días seguidos') + ' · ' : ''}lo que ganas con constancia.</span></span>${icon('arrow', 's')}</button>
        <button class="setrow" data-go="mapa">${icon('map')}<span style="flex:1"><b>El mapa de tu voz</b><span>Por qué distritos viajaron tus botellas.</span></span>${icon('arrow', 's')}</button>
        <button class="setrow" data-act="toLecturas">${icon('quote')}<span style="flex:1"><b>Pide una lectura</b><span>Tus amigos te responden con su voz, en anónimo.</span></span>${icon('arrow', 's')}</button>
        ${pushRow()}</div>
      <div class="sec rise d3"><span class="eyebrow">Tu seguridad</span>
        <button class="setrow" role="switch" aria-checked="${!!m.paused}" data-act="pauseT">${icon('pausei')}<span style="flex:1"><b>Modo pausa</b><span>No te llegan botellas nuevas. Tus conversaciones siguen.</span></span><span class="sw"></span></button>
        <button class="setrow" data-act="rules">${icon('shield')}<span style="flex:1"><b>Normas y privacidad</b><span>Cómo cuidamos la comunidad y tus datos.</span></span></button>
        <button class="setrow" data-act="logout">${icon('out')}<span style="flex:1"><b>Cerrar sesión</b></span></button>
        <button class="setrow" data-act="deleteAsk">${icon('trash')}<span style="flex:1"><b>Borrar mi cuenta</b><span>Se borra todo: tu perfil, tus botellas y tus conversaciones.</span></span></button>
      </div>
      <div style="height:24px"></div>
    </div>${tabsHTML('perfil')}`; }
};
const limaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const inviteLink = () => `${location.origin}/?c=${encodeURIComponent(S.me?.code_used || LS.get('code', '') || '')}`;
P.actions.copyLink = el => { try { navigator.clipboard?.writeText(inviteLink()).catch(() => {}); } catch (e) {} el.innerHTML = `${icon('check', 's')} Copiado`; toast('Link copiado. Mándaselo a quien quieras invitar.'); };
P.actions.shareLink = () => navigator.share({ title: 'Botella', text: 'Lanza tu voz al mar. Te invito a Botella:', url: inviteLink() }).catch(() => {});
P.actions.pauseT = async el => {
  const on = !S.me.paused;
  try { const { error } = await sb.from('profiles').update({ paused: on }).eq('id', uid()); if (error) throw error; S.me.paused = on; el.setAttribute('aria-checked', on); toast(on ? 'Modo pausa activado.' : 'Volviste a estar visible.'); } catch (e) { err(e); }
};
P.actions.reIntro = () => { delete S.rec.reintro; sheet(`${sheetHead('Tu presentación')}<p class="muted" style="font-size:14px;margin:0">Tu apodo y algo que te guste, en unos 15 segundos.</p>${recBox('reintro', 'Toca para grabar.')}<button class="btn btn-a soft" data-needs="reintro" data-act="reIntroSave">Guardar</button>`); };
P.actions.reIntroSave = async el => {
  const r = S.rec.reintro; if (!r) return needVoice('reintro'); el.classList.add('soft'); el.textContent = 'Guardando…';
  try { const path = await upload(r.blob, r.ext); const { error } = await sb.from('profiles').update({ intro_voice: path, intro_secs: r.secs, intro_peaks: r.peaks }).eq('id', uid()); if (error) throw error; URLS.set(path, r.url); Object.assign(S.me, { intro_voice: path, intro_secs: r.secs, intro_peaks: r.peaks }); delete S.rec.reintro; closeSheet(); rerender(); toast('Listo, guardamos tu nueva presentación.'); }
  catch (e) { el.classList.remove('soft'); el.textContent = 'Guardar'; err(e); }
};
P.actions.install = () => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (P.st.bip) { P.st.bip.prompt(); P.st.bip = null; return; }
  sheet(`${sheetHead('Botella en tu inicio')}<p class="muted" style="font-size:14px;margin:0 0 16px">${ios ? 'En Safari, toca <b>Compartir</b> y luego <b>Agregar a inicio</b>.' : 'En el menú del navegador (⋮), toca <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.'} Se abre como una app, a pantalla completa.</p><button class="btn btn-a" data-act="closeSheet">Entendido</button>`);
};
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); P.st.bip = e; });
P.actions.rules = () => sheet(`${sheetHead('Normas y privacidad')}<div class="rulesbox">
  <p><b>Solo mayores de 18.</b> Si alguien parece menor de edad, repórtalo.</p>
  <p><b>Respeto.</b> Coquetear está bien, como en la vida real. Nada de insultos, amenazas, odio ni contenido sexual explícito. Nada de pedir dinero, cuentas o datos personales.</p>
  <p><b>Anónimo de verdad.</b> Tus botellas solo muestran tu distrito. Tu nombre y tu presentación se ven solo cuando los dos deciden compartirlos.</p>
  <p><b>Para verse en persona,</b> elijan lugares públicos y avísale a alguien de confianza.</p>
  <p><b>Reportes.</b> Cada reporte bloquea a la persona y lo revisa el equipo. Una botella con dos reportes deja de viajar.</p>
  <p><b>Lecturas.</b> Las respuestas anónimas pasan por un filtro automático antes de llegar. Quien pidió la lectura puede borrar, reportar y bloquear sin saber quién fue.</p>
  <p><b>Tus datos.</b> Guardamos tu correo, tu perfil y tus notas de voz para que la app funcione. No los vendemos ni los compartimos. Puedes borrar tu cuenta y todo se elimina.</p>
  <p><b>Estamos empezando.</b> Puede haber errores; tus opiniones nos ayudan a mejorarla.</p></div><button class="btn btn-a" data-act="closeSheet" style="margin-top:8px">Entendido</button>`);
P.actions.logout = async () => { await sb.auth.signOut().catch(() => {}); location.replace('/'); };
P.actions.deleteAsk = () => sheet(`${sheetHead('¿Borrar tu cuenta?')}<p class="muted" style="font-size:14px;margin:0 0 16px">Se borran tu perfil, tus botellas, tus notas de voz y tus conversaciones. No se puede deshacer.</p><button class="btn btn-a" data-act="deleteGo">Borrar todo</button><button class="btn btn-ghost" data-act="closeSheet" style="margin-top:6px">Cancelar</button>`);
P.actions.deleteGo = async el => {
  el.classList.add('soft'); el.textContent = 'Borrando…';
  try { const { data: fs } = await sb.storage.from('voice').list(uid(), { limit: 1000 }); if (fs && fs.length) await sb.storage.from('voice').remove(fs.map(f => uid() + '/' + f.name)); await rpc('delete_me'); await sb.auth.signOut(); localStorage.clear(); location.replace('/'); }
  catch (e) { el.classList.remove('soft'); el.textContent = 'Borrar todo'; err(e); }
};
