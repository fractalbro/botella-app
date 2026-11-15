// Cliente Supabase falso, en memoria, para la prueba de humo de la interfaz (no toca ningún servidor).
(() => {
  const ME = 'me-1', now = () => new Date().toISOString(), ago = m => new Date(Date.now() - m * 60000).toISOString();
  const AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  const db = {
    session: null, profile: null,  mine: [], msgs: [],
    shore: [
      { id: 'd1', status: 'waiting', arrived: ago(40), kind: 'Pregunta', body: '¿Qué harías un domingo si nadie en esta ciudad te conociera?', voice: 'seed/majo-say.mp3', voice_secs: 14, voice_peaks: null, place: 'Barranco', sample: true, featured: true, expires_at: new Date(Date.now() + 2 * 3600e3).toISOString() },
      { id: 'd2', status: 'waiting', arrived: ago(90), kind: 'Confesión', body: 'Me mudé a Lima hace tres meses y todavía no tengo con quién ir al cine.', voice: 'x/b2.m4a', voice_secs: 19, voice_peaks: null, place: 'Jesús María', btype: 'color' },
      { id: 'd3', status: 'waiting', arrived: ago(200), kind: 'Historia', body: null, voice: 'x/b3.m4a', voice_secs: 25, voice_peaks: null, place: 'Magdalena' }
    ],
    marea: [{ bottle: 'm1', kind: 'Pregunta', body: '¿Cuál es el mejor atardecer que has visto en Lima?', voice: 'seed/caro-say.mp3', voice_secs: 13, voice_peaks: null, place: 'Magdalena', glass: null, sample: true, created_at: ago(300), mine: false, taken: null }],
    outings: [{ id: 'o1', name: 'Caminata al atardecer', place: 'Malecón de Miraflores, frente al Parque del Amor', starts_at: new Date(Date.now() + 3 * 864e5).toISOString(), cap: 8, taken: 3, descr: 'Caminamos del Parque del Amor al faro y terminamos en un café.', host: 'Majo', host_place: 'Barranco', mine: false, joined: false, boosted: false, sample: true }],
    convos: [{ id: 'c-ale', alias: 'Alguien de Miraflores', place: 'Miraflores', revealed: false, my_reveal: false, other_reveal: true, my_key: false, other_key: true, closed: false, last_at: ago(30), created_at: ago(900), i_launched: true, intro_voice: null, intro_secs: null, last_mine: false }]
  };
  Object.assign(db, { quest: { heard: false, answered: false, launched: false }, streak: 0, duos: [], lecturas: [], lecAns: [{ id: 'la1', voice: 'seed/ale-reply.mp3', secs: 12, peaks: null, at: ago(20), heard: false }, { id: 'la2', voice: 'seed/caro-reply.mp3', secs: 9, peaks: null, at: ago(90), heard: false }], notices: [] });
  db.msgs.push({ id: 'm1', convo_id: 'c-ale', sender: ME, voice: 'me-1/q.m4a', voice_secs: 9, body: '#bottle|Pregunta|¿Cuál es tu lugar secreto en Lima?', created_at: ago(900) },
    { id: 'm2', convo_id: 'c-ale', sender: 'o', voice: 'o/a.m4a', voice_secs: 27, body: null, created_at: ago(700) },
    { id: 'm3', convo_id: 'c-ale', sender: 'o', voice: 'o/b.m4a', voice_secs: 14, body: null, created_at: ago(30) });
  window.__db = db;
  const ok = d => Promise.resolve({ data: d, error: null });
  function q(t) {
    let op = 'select', payload, single = false; const f = [];
    const b = {
      select() { return b; }, insert(p) { op = 'insert'; payload = p; return b; }, update(p) { op = 'update'; payload = p; return b; },
      eq(k, v) { f.push(r => r[k] === v); return b; }, gt() { return b; }, lte() { return b; }, not() { return b; }, in() { return b; }, order() { return b; }, limit() { return b; }, single() { single = true; return b; }, maybeSingle() { single = true; return b; },
      then(res, rej) {
        let out = null;
        if (t === 'profiles' && op === 'insert') { db.profile = { ...payload, bottles: 3, color_left: 2, far_left: 1, tide_left: 1, gifts_left: 1, who_open: false, glass: null, captain: false, earned: 0, earned_day: null, paused: false }; }
        else if (t === 'profiles' && op === 'update') Object.assign(db.profile, payload);
        else if (t === 'messages' && op === 'insert') { const m = { id: 'n' + Math.random(), created_at: now(), ...payload }; db.msgs.push(m); out = single ? m : [m]; }
        else if (t === 'notices') out = db.notices || [];
        else if (t === 'messages') out = db.msgs.filter(r => f.every(x => x(r)) && r.created_at <= now());
        return ok(out).then(res, rej);
      }
    };
    return b;
  }
  const rpcs = {
    check_code: a => a.p_code === 'BOTELLA-01',
    tide: () => db.profile ? { ...db.profile, id: ME } : { id: null, bottles: null },
    shore: () => db.shore.filter(d => d.status === 'waiting' || d.status === 'opened'),
    open_delivery: a => { db.shore.find(d => d.id === a.p_id).status = 'opened'; db.quest.heard = true; },
    return_delivery: a => { db.shore = db.shore.filter(d => d.id !== a.p_id); },
    report_delivery: a => { db.shore = db.shore.filter(d => d.id !== a.p_id); },
    answer_delivery: a => {
      const d = db.shore.find(x => x.id === a.p_id); db.shore = db.shore.filter(x => x !== d);
      const id = 'c-' + d.id; db.convos.unshift({ id, alias: 'Alguien de ' + d.place, place: d.place, revealed: false, my_reveal: false, other_reveal: false, my_key: false, other_key: false, closed: false, last_at: now(), created_at: now(), i_launched: false, last_mine: true });
      db.msgs.push({ id: 'b' + id, convo_id: id, sender: 'o', voice: d.voice, voice_secs: d.voice_secs, body: `#bottle|${d.kind}|${d.body || ''}`, created_at: d.arrived }, { id: 'r' + id, convo_id: id, sender: ME, voice: a.p_voice, voice_secs: a.p_secs, created_at: now() });
      if (d.sample) { const at = new Date(Date.now() + 2500).toISOString(); db.convos[0].sample = true; db.convos[0].call_voice = 'seed/majo-call.mp3'; db.convos[0].call_secs = 8; db.msgs.push({ id: 'sr' + id, convo_id: id, sender: 'o', voice: 'seed/majo-reply.mp3', voice_secs: 12, created_at: at }); }
      db.quest.answered = true; db.streak = Math.max(db.streak, 1); db.profile.bottles++; return [{ convo: id, rewarded: true, left_bottles: db.profile.bottles }];
    },
    launch_bottle: a => { db.quest.launched = true; db.streak = Math.max(db.streak, 1); if (a.p_featured) db.profile.tide_left--;  const k = a.p_type || 'free'; if (k === 'color') { if (!a.p_topic && !a.p_district) throw new Error('target'); db.profile.color_left--; } else if (k === 'far') db.profile.far_left--; else db.profile.bottles--; db.mine.unshift({ id: 'b' + Math.random(), kind: a.p_kind, body: a.p_body, voice: a.p_voice, voice_secs: a.p_secs, voice_peaks: a.p_peaks, created_at: now(), shores: 3, opened: 0, answers: 0, waiting: 3, convo: null }); return [{ bottle: 'b', shores: k === 'far' ? 10 : 3, left_bottles: db.profile.bottles, left_color: db.profile.color_left, left_far: db.profile.far_left, left_tide: db.profile.tide_left }]; },
    my_bottles: () => [...db.mine, { id: 'old', openers: db.profile.who_open ? [{ place: 'Barranco', at: ago(800), answered: true }, { place: 'Surco', at: ago(850), answered: false }] : null, kind: 'Pregunta', body: '¿Cuál es tu lugar secreto en Lima?', voice: 'me-1/q.m4a', voice_secs: 9, created_at: ago(900), shores: 3, opened: 2, answers: 1, waiting: 0, convo: 'c-ale' }],
    my_convos: () => db.convos.map(c => { const ms = db.msgs.filter(m => m.convo_id === c.id); const vis = ms.filter(m => m.created_at <= now()), fut = ms.filter(m => m.created_at > now()); const last = vis[vis.length - 1]; const mv = vis.filter(m => m.voice && m.sender === ME).length, ov = vis.filter(m => m.voice && m.sender !== ME).length; return { ...c, my_voices: mv, other_voices: ov, cool_at: c.my_key && c.other_key ? null : new Date(Date.now() + 20 * 3600e3).toISOString(), cooled: false, last_at: last ? last.created_at : c.last_at, last_mine: last ? last.sender === ME : c.last_mine, next_at: fut.length ? fut[0].created_at : null }; }),
    app_version: () => 4,
    beta_get: a => { const p = db.profile, k = a.p_item; if (k === 'color') p.color_left++; else if (k === 'far') p.far_left++; else if (k === 'tide') p.tide_left++; else if (k === 'gift') p.gifts_left++; else if (k === 'who') p.who_open = true; else if (/^p\d+/.test(k)) p.bottles += +k.slice(1); else if (k === 'captain') { p.captain = true; p.who_open = true; } else if (k === 'nocaptain') p.captain = false; else if (k.startsWith('glass:')) p.glass = k === 'glass:none' ? null : k.slice(6); return { ...p, id: ME }; },
    marea: () => db.marea,
    marea_take: a => { const m = db.marea.find(x => x.bottle === a.p_bottle); const id = 'dm' + m.bottle; if (!db.shore.find(x => x.id === id)) db.shore.unshift({ id, status: 'opened', arrived: now(), kind: m.kind, body: m.body, voice: m.voice, voice_secs: m.voice_secs, place: m.place, sample: true, featured: true }); m.taken = 'opened'; return id; },
    send_gift: a => { db.profile.gifts_left--; db.msgs.push({ id: 'g' + Math.random(), convo_id: a.p_convo, sender: ME, body: '#gift|', created_at: now() }); return db.profile.gifts_left; },
    send_plan: a => { db.msgs.push({ id: 'p' + Math.random(), convo_id: a.p_convo, sender: ME, body: `#plan|${a.p_place}|${a.p_when}`, created_at: now() }); db.msgs.push({ id: 'pk' + Math.random(), convo_id: a.p_convo, sender: 'o', body: '#planok|', created_at: new Date(Date.now() + 1500).toISOString() }); },
    accept_plan: a => { db.msgs.push({ id: 'pa' + Math.random(), convo_id: a.p_convo, sender: ME, body: '#planok|', created_at: now() }); },
    outings_list: () => db.outings,
    outing_create: a => { db.outings.push({ id: 'o' + Math.random(), name: a.p_name, place: a.p_place, starts_at: new Date(a.p_at).toISOString(), cap: a.p_cap, taken: 1, descr: a.p_descr, host: 'Ana', host_place: 'Lince', mine: true, joined: false, boosted: false, sample: false }); return 'x'; },
    outing_join: a => { const o = db.outings.find(x => x.id === a.p_id); o.joined = a.p_on; o.taken += a.p_on ? 1 : -1; },
    outing_cancel: a => { db.outings = db.outings.filter(x => x.id !== a.p_id); },
    outing_boost: a => { db.outings.find(x => x.id === a.p_id).boosted = true; },
    set_reveal: a => { const c = db.convos.find(x => x.id === a.p_convo); c.my_reveal = a.p_on; c.revealed = c.my_reveal && c.other_reveal; if (c.revealed) c.alias = 'Ale'; },
    set_key: a => { const c = db.convos.find(x => x.id === a.p_convo); c.my_key = true; if (c.sample) c.other_key = true; return c.my_key && c.other_key; },
    block_convo: a => { db.convos.find(x => x.id === a.p_convo).closed = true; },
    delete_me: () => null,
    welcome_answer: a => {
      const id = 'c-first'; db.convos.unshift({ id, alias: 'Alguien de Surco', place: 'Surco', revealed: false, my_reveal: false, other_reveal: false, my_key: false, other_key: false, closed: false, last_at: now(), created_at: now(), i_launched: false, last_mine: true, sample: true, call_voice: 'seed/ivan-call.mp3', call_secs: 8 });
      db.msgs.push({ id: 'bf', convo_id: id, sender: 'o', voice: 'seed/ivan-say.mp3', voice_secs: 14, body: '#bottle|Pregunta|¿Qué canción te devuelve a tus 15 años?', created_at: ago(60) }, { id: 'rf', convo_id: id, sender: ME, voice: a.p_voice, voice_secs: a.p_secs, created_at: now() }, { id: 'sf', convo_id: id, sender: 'o', voice: 'seed/ivan-reply.mp3', voice_secs: 10, created_at: new Date(Date.now() + 2500).toISOString() });
      db.quest.heard = db.quest.answered = true; db.profile.bottles++; return [{ convo: id, rewarded: true, left_bottles: db.profile.bottles }];
    },
    home: () => ({ quest: { ...db.quest, done: db.quest.heard && db.quest.answered && db.quest.launched }, streak: db.streak, today: db.streak > 0, best: 4, next: null, tide: { question: '¿Qué le dirías a tu yo de hace diez años?', arrived: false, answered: !!db.tideAns, count: 7 }, lecturas: db.lecAns.filter(x => !x.heard).length, far_left: db.profile.far_left }),
    marea_now: () => ({ today: { day: 'hoy', question: '¿Qué le dirías a tu yo de hace diez años?', arrived: false, answered: !!db.tideAns, count: 7 }, last: { day: 'ayer', question: '¿Qué te hizo sonreír hoy?', unlocked: !!db.tideAns, voices: [{ bottle: 't1', place: 'Barranco', secs: 18, glass: null, mine: false, taken: null }, { bottle: 't2', place: 'Lince', secs: 31, glass: 'violeta', mine: false, taken: null }, { bottle: 't3', place: 'Surco', secs: 22, glass: null, mine: false, taken: null }] }, featured: db.marea }),
    tide_answer: () => { db.tideAns = true; db.streak = Math.max(db.streak, 1); return { bottle: 'tb', arrived: false }; },
    voice_map: () => ({ places: [{ place: 'Barranco', opened: 4, answered: 2 }, { place: 'Miraflores', opened: 3, answered: 0 }, { place: 'Surco', opened: 1, answered: 1 }, { place: 'La Molina', opened: 1, answered: 0 }], heard: 9, answers: 3, bottles: 3, shores: 12 }),
    my_duos: () => db.duos,
    duo_start: a => { db.profile.bottles--; const d = { token: 'duoTK', kind: a.p_kind, body: a.p_body, voice: a.p_voice, secs: a.p_secs, peaks: null, created_at: now(), expires_at: new Date(Date.now() + 72 * 3600e3).toISOString() }; db.duos.unshift(d); db.quest.launched = true; return { token: d.token, left_bottles: db.profile.bottles }; },
    duo_peek: a => ({ token: a.p_token, kind: 'Pregunta', body: '¿Cuál es el plan perfecto para un domingo en Lima?', name: 'Majo', place: 'Barranco', voice: 'seed/majo-say.mp3', secs: 14, peaks: null, status: 'open', mine: false }),
    duo_join: () => ({ bottle: 'bd', shores: 6 }),
    duo_cancel: a => { db.duos = db.duos.filter(d => d.token !== a.p_token); return ++db.profile.bottles; },
    lectura_create: a => { const l = { id: 'L1', slug: 'abc123', question: a.p_question, voice: a.p_voice, secs: a.p_secs, peaks: null, open: true, closes_at: new Date(Date.now() + 24 * 3600e3).toISOString(), created_at: now(), answers: 2, fresh: 2, filtered: 1, pending: 0 }; db.lecturas.unshift(l); return { id: l.id, slug: l.slug }; },
    my_lecturas: () => db.lecturas,
    lectura_inbox: () => db.lecAns,
    lectura_heard: a => { const x = db.lecAns.find(y => y.id === a.p_answer); if (x) x.heard = true; },
    lectura_close: a => { db.lecturas.find(l => l.id === a.p_id).open = false; },
    lectura_answer_delete: a => { db.lecAns = db.lecAns.filter(x => x.id !== a.p_answer); },
    lectura_answer_report: a => { db.lecAns = db.lecAns.filter(x => x.id !== a.p_answer); },
    lectura_peek: a => ({ slug: a.p_slug, name: 'Majo', question: '¿Qué es lo primero que pensaste de mí cuando me conociste?', voice: 'seed/majo-say.mp3', secs: 9, peaks: null, open: true, mine: false, answers: 3 }),
    push_subscribe: () => null, push_unsubscribe: () => null,
  };
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: () => ok({ session: db.session }), onAuthStateChange() {}, signOut: () => ok(null), resetPasswordForEmail: () => ok(null), updateUser: () => ok(null),
        signUp: () => { db.session = { user: { id: ME } }; return ok({ session: db.session, user: { id: ME, identities: [1] } }); },
        signInWithPassword: () => { db.session = { user: { id: ME } }; return ok({ session: db.session }); }
      },
      from: q, rpc: (n, a) => ok(rpcs[n](a || {})),
      storage: { from: () => ({ createSignedUrls: ps => ok(ps.map(p => ({ path: p, signedUrl: AUDIO }))), upload: () => ok({}), remove: () => ok({}), list: () => ok([]) }) },
      channel: () => { const c = { on: () => c, subscribe: cb => { setTimeout(() => cb && cb('SUBSCRIBED'), 30); return c; }, send: () => Promise.resolve('ok') }; return c; },
      removeChannel() {}
    })
  };
})();
