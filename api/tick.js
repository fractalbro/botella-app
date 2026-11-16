// Manda los avisos push pendientes y vuelve a pasar por el filtro las respuestas de lecturas que quedaron en espera.
// Lo llaman la app (después de cada acción que avisa a otra persona), la base de datos cada minuto y Vercel una vez al día.
const L = require('./_lib.js');
module.exports = async (req, res) => {
  if (!L.KEY) return L.json(res, 200, { off: true });
  const out = { sent: 0, reviewed: 0 };
  try { Object.assign(out, await L.drain()); } catch (e) { out.error = String(e.message || e).slice(0, 120); }
  if (L.GROQ) {
    try {
      for (const a of (await L.rpc('lectura_pending', { p_limit: 4 })) || []) {
        try {
          const f = await L.storage.get(a.voice); const ext = a.voice.split('.').pop();
          const m = await L.moderate(a.question || '', f.buf, f.type, ext);
          await L.rpc('lectura_resolve', { p_id: a.id, p_status: m.status === 'ok' ? 'ok' : 'blocked', p_reason: m.status === 'ok' ? null : (m.reason || 'sin voz'), p_transcript: m.text });
          if (m.status !== 'ok') await L.storage.del(a.voice);
          out.reviewed++;
        } catch (e) { out.error = String(e.message || e).slice(0, 120); break; }
      }
      if (out.reviewed) { const d = await L.drain().catch(() => null); if (d) out.sent += d.sent || 0; }
    } catch (e) { out.error = String(e.message || e).slice(0, 120); }
  }
  L.json(res, 200, out);
};
