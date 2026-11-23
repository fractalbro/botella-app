/* Botella · muelle, marea de las 21:00, salidas en grupo, regalos, planes y llamadas de ejemplo. */
'use strict';

/* ================= MUELLE ================= */
/* En la beta todo es gratis: se muestra el precio que tendrá después, tachado. */
const STORE = {
  specials: [
    { k: 'color', name: 'Botella de color', tag: 'tú eliges', desc: 'Elige a quién llega: a quienes les gusta un tema.', price: '2.90', art: () => btSVG('color') , left: () => S.me?.color_left },
    { k: 'far', name: 'Botella que llega lejos', tag: '20 personas', desc: 'Llega a 20 personas en vez de 8.', price: '5.90', art: () => btSVG('far'), left: () => S.me?.far_left },
    { k: 'tide', name: 'Botella dorada', tag: '21:00', desc: 'Sale primera en la marea de las 21:00, para todo Lima.', price: '1.90', art: () => btSVG('free', null, true), left: () => S.me?.tide_left },
    { k: 'who', name: 'Quién la abrió', tag: 'para siempre', desc: 'Mira qué tema compartes con cada persona que abrió tu botella, y a qué hora.', price: '4.90', art: () => `<span class="iart">${icon('eye')}</span>`, own: () => S.me?.who_open }
  ],
  gifts: [{ k: 'gift', name: 'Botella sellada', tag: 'regalo', desc: 'Un regalo para alguien con quien conversas: una botella sellada que se queda en el chat y le da una botella para lanzar.', price: '3.90', art: () => `<span class="gb">${bottleSVG('rgba(255,214,140,.98)', 'rgba(255,200,110,.34)')}<i class="seal"></i></span>`, left: () => S.me?.gifts_left }],
  looks: [
    { k: 'glass:none', g: null, name: 'Transparente', desc: 'El vidrio de siempre.', price: '' },
    { k: 'glass:verde', g: 'verde', name: 'Verde', desc: 'Tus botellas viajan en vidrio verde.', price: '4.90' },
    { k: 'glass:ambar', g: 'ambar', name: 'Ámbar', desc: 'Tus botellas viajan en vidrio ámbar.', price: '4.90' },
    { k: 'glass:esmerilado', g: 'esmerilado', name: 'Esmerilado', desc: 'Tus botellas viajan en vidrio esmerilado.', price: '4.90' }
  ],
  packs: [
    { k: 'p3', qty: 3, name: 'Pack Orilla', desc: 'Para un día con mucho que decir', price: '4.90' },
    { k: 'p10', qty: 10, name: 'Pack Marea', desc: 'Para toda la semana', price: '12.90', best: true },
    { k: 'p30', qty: 30, name: 'Pack Océano', desc: '25 + 5 de regalo', price: '29.90' }
  ],
  perks: ['3 botellas al día en vez de 1', 'Ves quién abrió tus botellas', 'Una botella que llega lejos cada lunes', 'Hasta 3 salidas activas y de hasta 12 personas']
};
const price = p => p ? `<s>S/ ${p}</s>` : '';
async function claim(k) {
  const me = await rpc('beta_get', { p_item: k }); S.me = Array.isArray(me) ? me[0] : me; hap([8, 30, 8]);
  const all = [...STORE.specials, ...STORE.gifts, ...STORE.looks, ...STORE.packs]; const it = all.find(x => x.k === k);
  toast(k === 'captain' ? 'Ya eres Capitán. Gratis por ahora.' : k === 'nocaptain' ? 'Dejaste el plan Capitán.' : k.startsWith('glass') ? `Listo: tus botellas viajan en vidrio ${it ? it.name.toLowerCase() : ''}.` : it?.qty ? `Ya tienes ${it.qty} botellas más.` : k === 'who' ? 'Listo: ya ves qué tema compartes con quien abre tus botellas.' : it ? `Listo: ya tienes una ${it.name.toLowerCase()}.` : 'Listo: ya es tuya.');
  return S.me;
}
P.actions.get = async el => { if (el.classList.contains('soft')) return; el.classList.add('soft'); try { await claim(el.dataset.k); P.st.gotK = el.dataset.k; rerender(); } catch (e) { el.classList.remove('soft'); err(e); } };
P.actions.toStore = () => go('store', { fade: true });
const itemHTML = (it, btn) => `<div class="sitem${P.st.gotK === it.k ? ' got' : ''}"><span class="art">${it.art()}</span><span class="tx"><b>${it.name}${it.tag ? ` <em>${it.tag}</em>` : ''}</b><span>${it.desc}</span></span><span class="pr">${btn}</span></div>`;
const getBtn = (k, label = 'Gratis') => `<button class="btn btn-a btn-sm" data-act="get" data-k="${k}">${label}</button>`;
P.screens.store = {
  cls: 'storebg',
  render: () => { const m = S.me || {}; return `${sb_()}<div class="scroll pad"><div class="top"><h1 class="h2" style="flex:1;margin:0">Tienda</h1>${meBtn()}</div>
    <p class="lead" style="margin-top:2px">Aquí recoges botellas especiales. Lanzar, escuchar, responder y llamar siempre es gratis.</p>
    <div class="beta rise">${icon('spark', 's')}<span><b>Por ahora, todo gratis.</b> Botella está empezando: pide lo que quieras sin pagar nada. El precio tachado es lo que costará más adelante.</span></div>
    <div class="bal rise d1"><div><b>${m.bottles ?? 0}</b><span>Normales</span></div><div><b style="color:#FF8FC0">${m.color_left ?? 0}</b><span>De color</span></div><div><b style="color:#FFD68C">${m.far_left ?? 0}</b><span>Llegan lejos</span></div><div><b style="color:#FFD68C">${m.tide_left ?? 0}</b><span>Doradas</span></div><div><b style="color:#F2C46D">${m.gifts_left ?? 0}</b><span>Regalos</span></div></div>
    <div class="sec rise d2"><span class="eyebrow">Botellas especiales</span>${STORE.specials.map(it => itemHTML(it, it.own && it.own() ? '<span class="pill a">Activo</span>' : `${price(it.price)}${getBtn(it.k)}`)).join('')}</div>
    <div class="sec rise d2"><span class="eyebrow">Regalos</span>${STORE.gifts.map(it => itemHTML(it, `${price(it.price)}${getBtn(it.k)}`)).join('')}</div>
    <div class="sec rise d3"><span class="eyebrow">Tu vidrio</span><div class="looks">${STORE.looks.map(it => { const on = (m.glass || null) === it.g; return `<button class="look${on ? ' on' : ''}" data-act="get" data-k="${it.k}"><span class="bsv">${btSVG('free', it.g)}</span><b>${it.name}</b><span>${on ? 'Usando' : it.price ? `<s>S/ ${it.price}</s> Gratis` : 'Gratis'}</span></button>`; }).join('')}</div></div>
    <div class="sec rise d3"><span class="eyebrow">Packs de botellas</span><div class="spacks">${STORE.packs.map(it => `<button class="spack${it.best ? ' best' : ''}" data-act="get" data-k="${it.k}"><b class="num">${it.qty}</b><span class="pn">${it.name}</span><span>${it.desc}</span><span class="pp"><s>S/ ${it.price}</s> Gratis</span></button>`).join('')}</div></div>
    <div class="captain rise d4"><span class="eyebrow a">Plan Capitán</span><div class="h2" style="font-size:26px">Más botellas cada día y salidas más grandes.</div>
      <ul>${STORE.perks.map(p => `<li>${icon('check', 's')}${p}</li>`).join('')}</ul>
      ${m.captain ? `<div class="pill a" style="justify-self:start">Eres Capitán</div><button class="btn btn-ghost btn-sm" data-act="get" data-k="nocaptain">Dejar el plan</button>` : `<span class="small muted"><s>S/ 19.90 al mes</s> · gratis por ahora</span><button class="btn btn-a" data-act="get" data-k="captain">Ser Capitán gratis</button>`}</div>
    <div class="sec"><span class="eyebrow">Siempre gratis</span><div class="frees"><div>${icon('bottle', 's')}<b>Una botella al día</b><span>y hasta 3 más por responder</span></div><div>${icon('eye', 's')}<b>Abrir sin límite</b><span>escucha y responde todas</span></div><div>${icon('phone', 's')}<b>Tu voz</b><span>notas de voz y llamadas</span></div><div>${icon('users', 's')}<b>En grupo</b><span>salidas de la comunidad</span></div></div></div>
    <div style="height:18px"></div></div>${tabsHTML('store')}`; },
  async after() { if (!P.st.storeFresh) { P.st.storeFresh = true; try { await loadMe(); if (P.curId === 'store') rerender(); } catch (e) {} } },
  leave() { P.st.storeFresh = false; P.st.gotK = null; }
};

/* ================= LA MAREA DE LAS 21:00 ================= */
const limaHour = () => +new Date().toLocaleString('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false });
P.screens.marea = {
  anim(ctx, w, h, t) {
    const horizon = .34, mx = sky(ctx, w, h, t, horizon);
    waves(ctx, w, h, t, horizon, mx, (i, wv) => { if (i !== 1) return; [[.18, 0], [.5, 1.7], [.8, 3.1]].forEach(([x, p]) => { const bx = w * x + Math.sin(t * .4 + p) * 10, by = wv(bx), sl = (wv(bx + 6) - wv(bx - 6)) / 12; bottle(ctx, bx, by - 5, .62, Math.atan(sl) - .3, 1.3, '255,214,140'); }); });
  },
  render: () => { const after = limaHour() >= 21, list = S.marea; return `${sb_()}<div class="top pad">${backBtn()}<span class="title">La marea<small>${after ? 'Llegó hoy a las 21:00' : 'Cada noche a las 21:00'}</small></span></div>
    <div style="height:15%;flex:none"></div>
    <div class="scroll pad" style="background:linear-gradient(transparent,var(--bg) 60px)">
      <div class="display rise" style="font-size:34px">${after ? 'La marea <b>llegó</b>.' : 'La marea <b>de anoche</b>.'}</div>
      <p class="lead rise d1">Cada noche a las 9 la marea trae botellas de todo Lima. Las doradas son destacadas: alguien quiso que llegaran primero.${after ? '' : ` La próxima llega en ${Math.max(1, 21 - limaHour())} h.`}</p>
      ${list.length ? list.map((b, i) => `<button class="mrow rise d${Math.min(i + 1, 4)}" data-act="mareaOpen" data-id="${b.bottle}"${b.mine ? ' disabled' : ''}><span class="bsv">${btSVG('free', b.glass, true)}</span><span style="flex:1;min-width:0"><span class="eyebrow">${esc(b.kind)} · ${esc(b.place)}${b.sample ? ' <span class="nw">· de ejemplo</span>' : ''}</span><span class="t">${esc(b.body || 'Una nota de voz de ' + fmt(b.voice_secs))}</span></span>${b.mine ? '<span class="pill">Tuya</span>' : b.taken === 'answered' ? '<span class="pill">Respondida</span>' : '<span class="pill a">Abrir</span>'}</button>`).join('')
        : '<p class="small muted">Todavía no hay botellas destacadas. Lanza una con la marea desde “Lanzar una botella”.</p>'}
      <button class="btn btn-glass" data-act="mareaLaunch" style="margin-top:16px">${icon('tide')} Que la mía salga en la marea</button>
      <div style="height:16px"></div></div>`; },
  async after() { if (!P.st.mareaFresh) { P.st.mareaFresh = true; try { await loadMarea(); if (P.curId === 'marea') rerender(); } catch (e) {} } },
  leave() { P.st.mareaFresh = false; }
};
P.actions.mareaLaunch = () => { S.featured = (S.me?.tide_left || 0) > 0; go('launch'); if (!S.featured) toast('No te quedan doradas: pide una gratis en la tienda.'); };
P.actions.mareaOpen = async el => {
  const b = S.marea.find(x => x.bottle === el.dataset.id); if (!b || b.mine) return;
  if (b.taken === 'answered') return toast('Ya respondiste esta botella. Está en tus conversaciones.');
  try {
    const did = await rpc('marea_take', { p_bottle: b.bottle }); await loadShore();
    S.sel = S.shore.find(x => x.id === did) || { id: did, status: 'opened', arrived: b.created_at, kind: b.kind, body: b.body, voice: b.voice, voice_secs: b.voice_secs, voice_peaks: b.voice_peaks, place: b.place, featured: true, glass: b.glass, sample: b.sample };
    S.sel.featured = true; P.st.uncorked = false; P.st.flyR = null; go('open');
  } catch (e) { err(e); }
};

/* ================= SALIDAS EN GRUPO ================= */
const PLACES = [['El malecón de Miraflores', 'Miraflores · al atardecer, con gente alrededor'], ['Un café frente al mar', 'Barranco · para seguir conversando'], ['El Parque del Amor', 'Miraflores · de día, fácil de encontrar'], ['La Bajada de Baños', 'Barranco · concurrida, frente al mar'], ['El Parque Kennedy', 'Miraflores · céntrico, siempre con gente']];
const OUT_IDEAS = ['Caminata al atardecer', 'Preguntas frente al mar', 'Confesiones y café', 'Cine y conversa'];
const whenTxt = iso => { const d = new Date(iso), o = { timeZone: 'America/Lima' }; const day = d.toLocaleDateString('es-PE', { ...o, weekday: 'long', day: 'numeric', month: 'short' }); const t = d.toLocaleTimeString('es-PE', { ...o, hour: 'numeric', minute: '2-digit', hour12: true }); return day.charAt(0).toUpperCase() + day.slice(1) + ' · ' + t.replace(/\s?a\.?\s?m\.?/i, ' a. m.').replace(/\s?p\.?\s?m\.?/i, ' p. m.'); };
P.screens.salidas = {
  anim(ctx, w, h, t) { const mx = sky(ctx, w, h, t, .3); waves(ctx, w, h, t, .3, mx, null, 4); [.3, .5, .7].forEach((x, i) => { ctx.fillStyle = `rgba(255,190,110,${.55 + Math.sin(t * 3 + i) * .25})`; ctx.shadowColor = '#FFB061'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(w * x, h * .3 - 3, 3.4, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }); },
  render: () => `${sb_()}<div class="top pad">${backBtn()}<span class="title">Salidas en grupo<small>Apuntarte es gratis · cada uno paga lo suyo</small></span></div>
    <div style="height:12%;flex:none"></div>
    <div class="scroll pad" style="background:linear-gradient(transparent,var(--bg) 60px)">
      <div class="display rise" style="font-size:34px">Salgamos <b>en grupo</b>.</div>
      <p class="lead rise d1">Las propone gente de Botella. Apuntarte es gratis, van en grupo y siempre a lugares públicos.</p>
      ${S.outings.length ? S.outings.map((o, i) => `<button class="orow rise d${Math.min(i + 1, 4)}${o.boosted ? ' boost' : ''}" data-act="outing" data-id="${o.id}"><span class="oi">${icon('users')}</span><span style="flex:1;min-width:0"><span class="t">${esc(o.name)}</span><span class="s">${esc(whenTxt(o.starts_at))}</span><span class="s">${esc(o.place)}${o.sample ? ' <span class="nw">· de ejemplo</span>' : ''}</span>${o.sample ? '' : `<span class="cap">${Array.from({ length: o.cap }, (_, k) => `<i class="${k < o.taken ? 'on' : ''}"></i>`).join('')}<small>${o.taken} de ${o.cap}</small></span>`}</span>${o.mine ? '<span class="pill">Tuya</span>' : o.joined ? '<span class="pill">Vas</span>' : o.taken >= o.cap ? '<span class="pill">Llena</span>' : '<span class="pill a">Ver</span>'}</button>`).join('')
        : '<p class="small muted">Todavía no hay salidas. Propón la primera.</p>'}
      <div style="height:12px"></div></div>
    <div class="foot pad"><button class="btn btn-a" data-go="proponer">${icon('pin')} Proponer una salida</button></div>`,
  async after() { if (!P.st.outFresh) { P.st.outFresh = true; try { await loadOutings(); if (P.curId === 'salidas') rerender(); } catch (e) {} } },
  leave() { P.st.outFresh = false; }
};
P.actions.outing = el => {
  const o = S.outings.find(x => x.id === el.dataset.id); if (!o) return;
  sheet(`${sheetHead(esc(o.name))}<div class="odet"><p>${icon('cal', 's')} ${esc(whenTxt(o.starts_at))}</p><p>${icon('pin', 's')} ${esc(o.place)}</p><p>${icon('users', 's')} ${o.sample ? '' : `${o.taken} de ${o.cap} · `}propone ${o.mine ? 'tú' : esc(someone(o.host_place))}${o.sample ? ' (de ejemplo)' : ''}</p>${o.descr ? `<p class="muted">${esc(o.descr)}</p>` : ''}</div>
    <p class="small muted" style="margin:4px 0 14px">Siempre en lugares públicos. Cuéntale a alguien de confianza a dónde vas.</p>
    ${o.mine ? `${o.boosted ? '' : `<button class="btn btn-a" data-act="outBoost" data-id="${o.id}">${icon('spark')} Destacar mi salida <span class="small" style="opacity:.7;margin-left:4px"><s>S/ 2.90</s> gratis</span></button>`}<button class="btn btn-ghost" data-act="outCancel" data-id="${o.id}" style="margin-top:6px">Cancelar mi salida</button>`
      : o.joined ? `<button class="btn btn-ghost" data-act="outJoin" data-id="${o.id}" data-on="0">Ya no voy</button>` : `<button class="btn btn-a${o.taken >= o.cap ? ' soft' : ''}" data-act="outJoin" data-id="${o.id}" data-on="1">Me apunto</button>`}`);
};
const outDo = async (fn, msg) => { try { await fn(); closeSheet(); await loadOutings(); if (P.curId === 'salidas') rerender(); toast(msg); } catch (e) { err(e); } };
P.actions.outJoin = el => outDo(() => rpc('outing_join', { p_id: el.dataset.id, p_on: el.dataset.on === '1' }), el.dataset.on === '1' ? 'Listo, vas. Cuéntale a alguien de confianza a dónde.' : 'Listo, ya no vas.');
P.actions.outCancel = el => outDo(() => rpc('outing_cancel', { p_id: el.dataset.id }), 'Cancelaste tu salida.');
P.actions.outBoost = el => outDo(() => rpc('outing_boost', { p_id: el.dataset.id }), 'Tu salida ahora sale primera en la lista.');
const nextDays = () => { const out = []; for (let i = 0; i < 10; i++) { const d = new Date(Date.now() + i * 864e5); const v = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); const l = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric' }); out.push([v, l.charAt(0).toUpperCase() + l.slice(1)]); } return out; };
P.screens.proponer = {
  render: () => { const F = P.st.out || (P.st.out = { name: '', place: PLACES[0][0], day: nextDays()[2][0], time: '18:00', cap: 8, descr: '' }); return `${sb_()}<div class="top pad">${backBtn()}<span class="title">Proponer una salida</span></div><div class="scroll pad">
    <div class="display" style="font-size:32px;margin-top:6px">¿Qué <b>hacemos</b>?</div>
    <label class="field" style="margin-top:16px"><input id="oname" maxlength="60" value="${esc(F.name)}" placeholder="Ponle nombre a tu salida" aria-label="Nombre de la salida"></label>
    <div class="ideas" style="margin-top:10px">${OUT_IDEAS.map(i => `<button class="idea${F.name === i ? ' on' : ''}" data-act="outIdea" data-v="${i}">${i}</button>`).join('')}</div>
    <div class="sec"><span class="eyebrow">Dónde</span><label class="field select" style="margin-top:10px"><select id="oplace" aria-label="Lugar">${PLACES.map(([p, d]) => `<option value="${esc(p)}"${F.place === p ? ' selected' : ''}>${esc(p)} · ${esc(d.split(' · ')[0])}</option>`).join('')}</select></label></div>
    <div class="sec"><span class="eyebrow">Cuándo</span><div class="two" style="margin-top:10px"><label class="field select"><select id="oday" aria-label="Día">${nextDays().map(([v, l]) => `<option value="${v}"${F.day === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label><label class="field select"><select id="otime" aria-label="Hora">${['10:00', '12:00', '16:00', '17:30', '18:00', '19:00', '20:00', '21:00'].map(t => `<option${F.time === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div></div>
    <div class="sec"><span class="eyebrow">Cuántos, contándote</span><div class="chips" style="margin-top:10px">${[4, 6, 8].concat(S.me?.captain ? [12] : []).map(n => `<button class="chip${F.cap === n ? ' on' : ''}" data-act="outCap" data-v="${n}">${n}</button>`).join('')}</div></div>
    <div class="sec"><label class="field"><input id="odescr" maxlength="200" value="${esc(F.descr)}" placeholder="Cuenta el plan en una línea (opcional)" aria-label="Descripción"></label></div>
    <p class="small muted">Elige lugares públicos. Cada uno paga lo suyo.</p></div>
    <div class="foot pad"><button class="btn btn-a" data-act="outCreate">Publicar mi salida</button></div>`; },
  after(sec) { const F = P.st.out; sec.querySelector('#oname').addEventListener('input', e => { F.name = e.target.value; }); sec.querySelector('#odescr').addEventListener('input', e => { F.descr = e.target.value; }); ['oplace', 'oday', 'otime'].forEach(id => sec.querySelector('#' + id).addEventListener('change', e => { F[{ oplace: 'place', oday: 'day', otime: 'time' }[id]] = e.target.value; })); }
};
P.actions.outIdea = el => { P.st.out.name = el.dataset.v; rerender(); };
P.actions.outCap = el => { P.st.out.cap = +el.dataset.v; rerender(); };
P.actions.outCreate = async el => {
  const F = P.st.out; if ((F.name || '').trim().length < 3) return toast('Ponle nombre a tu salida.');
  el.classList.add('soft');
  try { await rpc('outing_create', { p_name: F.name.trim(), p_place: F.place, p_at: `${F.day}T${F.time}:00-05:00`, p_cap: F.cap, p_descr: F.descr }); P.st.out = null; await loadOutings(); P.hist = P.hist.filter(x => x !== 'salidas'); go('salidas', { back: true }); toast('Tu salida está publicada. Aquí ves quién se va apuntando.'); }
  catch (e) { el.classList.remove('soft'); err(e); }
};

/* ================= REGALO: BOTELLA CON LACRE ================= */
P.actions.giftAsk = () => {
  const c = convo(); if (!c || c.closed) return; const n = S.me?.gifts_left || 0;
  sheet(`${sheetHead('Regalar una botella sellada')}<div class="giftart"><span class="gb">${bottleSVG('rgba(255,214,140,.98)', 'rgba(255,200,110,.34)')}<i class="seal"></i></span></div>
    <p class="muted" style="font-size:14px;margin:0 0 14px;text-align:center">Una botella sellada que se queda en esta conversación. A ${c.revealed ? esc(c.alias) : 'esta persona'} le regala una botella para lanzar.</p>
    ${n ? `<button class="btn btn-a" data-act="giftGo">${icon('gift')} Mandarla (te ${n === 1 ? 'queda 1' : 'quedan ' + n})</button>` : `<button class="btn btn-a" data-act="giftGet">${icon('bag')} Pedir una gratis en la tienda</button>`}<button class="btn btn-ghost" data-act="closeSheet" style="margin-top:6px">Ahora no</button>`);
};
P.actions.giftGet = async el => { el.classList.add('soft'); try { await claim('gift'); P.actions.giftAsk(); } catch (e) { el.classList.remove('soft'); err(e); } };
P.actions.giftGo = async el => {
  const c = convo(); el.classList.add('soft');
  try { const left = await rpc('send_gift', { p_convo: c.id }); S.me.gifts_left = left; closeSheet(); await loadMsgs(c.id); rerender(); hap([10, 30, 10, 30, 20]); toast('Tu regalo llegó.'); }
  catch (e) { el.classList.remove('soft'); err(e); }
};

/* ================= ARMAR UN PLAN ================= */
const PLAN_DAYS = ['Hoy', 'Mañana', 'Este sábado', 'Este domingo'], PLAN_TIMES = ['en la mañana', 'en la tarde', 'al atardecer', 'en la noche'];
P.actions.planAsk = () => {
  const c = convo(); if (!c || c.closed) return; const F = P.st.plan || (P.st.plan = { place: 0, day: 2, time: 2 });
  sheet(`${sheetHead('Armar un plan')}<p class="muted" style="font-size:14px;margin:0 0 10px">Propón un lugar público y un día. ${c.revealed ? esc(c.alias) : 'La otra persona'} lo acepta si le va.</p>
    <div class="planpick">${PLACES.slice(0, 4).map(([p, d], i) => `<button class="setrow${F.place === i ? ' on' : ''}" data-act="planPick" data-f="place" data-v="${i}">${icon('pin')}<span style="flex:1"><b>${esc(p)}</b><span>${esc(d)}</span></span>${F.place === i ? icon('check', 's') : ''}</button>`).join('')}</div>
    <div class="chips" style="margin-top:12px">${PLAN_DAYS.map((d, i) => `<button class="chip${F.day === i ? ' on' : ''}" data-act="planPick" data-f="day" data-v="${i}">${d}</button>`).join('')}</div>
    <div class="chips" style="margin-top:8px">${PLAN_TIMES.map((d, i) => `<button class="chip${F.time === i ? ' on' : ''}" data-act="planPick" data-f="time" data-v="${i}">${d}</button>`).join('')}</div>
    <button class="btn btn-a" data-act="planGo" style="margin-top:16px">${icon('send')} Proponer el plan</button>`);
};
P.actions.planPick = el => { P.st.plan[el.dataset.f] = +el.dataset.v; P.actions.planAsk(); };
P.actions.planGo = async el => {
  const c = convo(), F = P.st.plan; el.classList.add('soft');
  try { await rpc('send_plan', { p_convo: c.id, p_place: PLACES[F.place][0], p_when: `${PLAN_DAYS[F.day]}, ${PLAN_TIMES[F.time]}` }); closeSheet(); await Promise.all([loadMsgs(c.id), loadConvos()]); S.convo = S.convos.find(x => x.id === c.id) || c; rerender(); toast('Propusiste el plan. Su respuesta aparece en este chat.'); }
  catch (e) { el.classList.remove('soft'); err(e); }
};
P.actions.planOk = async el => { const c = convo(); el.classList.add('soft'); try { await rpc('accept_plan', { p_convo: c.id }); await loadMsgs(c.id); rerender(); toast('¡Plan hecho! Cuéntale a alguien de confianza dónde y a qué hora.'); } catch (e) { el.classList.remove('soft'); err(e); } };

/* ================= LLAMADA DE EJEMPLO ================= */
/* Con una persona de ejemplo, la llamada reproduce su saludo grabado: así se prueba todo el recorrido. */
function demoCall(c) {
  recCancel(); stopPlayer();
  const C = CALL = { convo: c.id, name: c.alias, role: 'demo', state: 'ringing', stream: null, q: [], mute: false };
  P.hist = P.hist.filter(x => x !== 'moment'); go('call', { noPush: P.curId === 'moment' });
  C.to = setTimeout(async () => {
    if (CALL !== C) return; C.state = 'live'; C.t0 = Date.now(); hap([10, 40, 10]); rerender();
    C.iv = setInterval(() => { const el = $('#calltime'); if (el) el.textContent = callClock(); }, 1000);
    const [url] = await signed([c.call_voice]); if (!url || CALL !== C) return;
    const a = C.audio = new Audio(url); a.setAttribute('playsinline', ''); a.onended = () => { C.to = setTimeout(() => { if (CALL === C) callEnd('Fue una llamada de ejemplo. Con personas reales, la llamada es en vivo.'); }, 1800); };
    a.play().catch(() => {});
  }, 2600);
}
