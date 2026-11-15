// Cliente Supabase falso, en memoria, para la prueba de humo de la interfaz (no toca ningún servidor).
(() => {
  const ME = 'me-1', now = () => new Date().toISOString(), ago = m => new Date(Date.now() - m * 60000).toISOString();
  const AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  const db = {
    session: null, profile: null, mine: [], msgs: [],
    shore: [
      { id: 'd1', status: 'waiting', arrived: ago(40), kind: 'Pregunta', body: '¿Qué harías un domingo si nadie en esta ciudad te conociera?', voice: 'x/b1.m4a', voice_secs: 12, voice_peaks: null, place: 'Barranco' },
      { id: 'd2', status: 'waiting', arrived: ago(90), kind: 'Confesión', body: 'Me mudé a Lima hace tres meses y todavía no tengo con quién ir al cine.', voice: 'x/b2.m4a', voice_secs: 19, voice_peaks: null, place: 'Jesús María' },
      { id: 'd3', status: 'waiting', arrived: ago(200), kind: 'Historia', body: null, voice: 'x/b3.m4a', voice_secs: 25, voice_peaks: null, place: 'Magdalena' }
    ],
    convos: [{ id: 'c-ale', alias: 'Alguien de Miraflores', place: 'Miraflores', revealed: false, my_reveal: false, other_reveal: true, my_key: false, other_key: true, closed: false, last_at: ago(30), created_at: ago(900), i_launched: true, intro_voice: null, intro_secs: null, last_mine: false }]
  };
  db.msgs.push({ id: 'm1', convo_id: 'c-ale', sender: ME, voice: 'me-1/q.m4a', voice_secs: 9, body: '#bottle|Pregunta|¿Cuál es tu lugar secreto en Lima?', created_at: ago(900) },
    { id: 'm2', convo_id: 'c-ale', sender: 'o', voice: 'o/a.m4a', voice_secs: 27, body: null, created_at: ago(700) },
    { id: 'm3', convo_id: 'c-ale', sender: 'o', voice: 'o/b.m4a', voice_secs: 14, body: null, created_at: ago(30) });
  window.__db = db;
  const ok = d => Promise.resolve({ data: d, error: null });
  function q(t) {
    let op = 'select', payload, single = false; const f = [];
    const b = {
      select() { return b; }, insert(p) { op = 'insert'; payload = p; return b; }, update(p) { op = 'update'; payload = p; return b; },
      eq(k, v) { f.push(r => r[k] === v); return b; }, order() { return b; }, limit() { return b; }, single() { single = true; return b; }, maybeSingle() { single = true; return b; },
      then(res, rej) {
        let out = null;
        if (t === 'profiles' && op === 'insert') { db.profile = { ...payload, bottles: 2, earned: 0, earned_day: null, paused: false }; }
        else if (t === 'profiles' && op === 'update') Object.assign(db.profile, payload);
        else if (t === 'messages' && op === 'insert') { const m = { id: 'n' + Math.random(), created_at: now(), ...payload }; db.msgs.push(m); out = single ? m : [m]; }
        else if (t === 'messages') out = db.msgs.filter(r => f.every(x => x(r)));
        return ok(out).then(res, rej);
      }
    };
    return b;
  }
  const rpcs = {
    check_code: a => a.p_code === 'BOTELLA-01',
    tide: () => db.profile ? { ...db.profile, id: ME } : null,
    shore: () => db.shore.filter(d => d.status === 'waiting' || d.status === 'opened'),
    open_delivery: a => { db.shore.find(d => d.id === a.p_id).status = 'opened'; },
    return_delivery: a => { db.shore = db.shore.filter(d => d.id !== a.p_id); },
    report_delivery: a => { db.shore = db.shore.filter(d => d.id !== a.p_id); },
    answer_delivery: a => {
      const d = db.shore.find(x => x.id === a.p_id); db.shore = db.shore.filter(x => x !== d);
      const id = 'c-' + d.id; db.convos.unshift({ id, alias: 'Alguien de ' + d.place, place: d.place, revealed: false, my_reveal: false, other_reveal: false, my_key: false, other_key: false, closed: false, last_at: now(), created_at: now(), i_launched: false, last_mine: true });
      db.msgs.push({ id: 'b' + id, convo_id: id, sender: 'o', voice: d.voice, voice_secs: d.voice_secs, body: `#bottle|${d.kind}|${d.body || ''}`, created_at: d.arrived }, { id: 'r' + id, convo_id: id, sender: ME, voice: a.p_voice, voice_secs: a.p_secs, created_at: now() });
      db.profile.bottles++; return [{ convo: id, rewarded: true, left_bottles: db.profile.bottles }];
    },
    launch_bottle: a => { db.profile.bottles--; db.mine.unshift({ id: 'b' + Math.random(), kind: a.p_kind, body: a.p_body, voice: a.p_voice, voice_secs: a.p_secs, voice_peaks: a.p_peaks, created_at: now(), shores: 3, opened: 0, answers: 0, waiting: 3, convo: null }); return [{ bottle: 'b', shores: 3, left_bottles: db.profile.bottles }]; },
    my_bottles: () => [...db.mine, { id: 'old', kind: 'Pregunta', body: '¿Cuál es tu lugar secreto en Lima?', voice: 'me-1/q.m4a', voice_secs: 9, created_at: ago(900), shores: 3, opened: 2, answers: 1, waiting: 0, convo: 'c-ale' }],
    my_convos: () => db.convos,
    set_reveal: a => { const c = db.convos.find(x => x.id === a.p_convo); c.my_reveal = a.p_on; c.revealed = c.my_reveal && c.other_reveal; if (c.revealed) c.alias = 'Ale'; },
    set_key: a => { const c = db.convos.find(x => x.id === a.p_convo); c.my_key = true; return c.my_key && c.other_key; },
    block_convo: a => { db.convos.find(x => x.id === a.p_convo).closed = true; },
    delete_me: () => null
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
