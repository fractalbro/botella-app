// Recibe la respuesta anónima a una lectura. Nadie escribe directo en la base: la voz pasa primero por el filtro
// (transcripción + revisión) y solo si pasa se le entrega a quien preguntó. El dispositivo se guarda con hash para poder bloquearlo.
const L = require('./_lib.js');
const EXT = { 'audio/mp4': 'm4a', 'audio/aac': 'm4a', 'audio/x-m4a': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.json(res, 405, { message: 'Método no permitido.' });
  if (!L.KEY) return L.json(res, 503, { code: 'off', message: 'Las lecturas todavía no están activas. Vuelve a intentar más tarde.' });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || !b.slug || !b.device || !b.audio) return L.json(res, 400, { message: 'No se pudo enviar tu respuesta.' });
  if (b.adult !== true) return L.json(res, 400, { message: 'Confirma que tienes 18 años o más.' });
  const type = String(b.mime || '').split(';')[0].toLowerCase(), ext = EXT[type]; if (!ext) return L.json(res, 400, { message: 'Este navegador no grabó un audio compatible.' });
  const buf = Buffer.from(String(b.audio), 'base64'); const secs = Math.round(+b.secs || 0);
  if (buf.length < 800 || buf.length > 2.5 * 1024 * 1024 || secs < 2 || secs > 61) return L.json(res, 400, { message: 'Graba entre 2 y 60 segundos.' });
  const peaks = Array.isArray(b.peaks) ? b.peaks.slice(0, 40).map(n => Math.max(0, Math.min(1, +n || 0))) : null;
  try {
    const salt = await L.kv('salt', () => L.crypto.randomBytes(24).toString('hex'));
    const h = s => L.crypto.createHash('sha256').update(salt + '|' + s).digest('hex').slice(0, 32);
    const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'sin-ip';
    const device = h('d:' + String(b.device).slice(0, 80)), iph = h('i:' + ip);
    let lid; try { lid = await L.rpc('lectura_take', { p_slug: String(b.slug).slice(0, 40), p_device: device, p_ip: iph }); }
    catch (e) { return L.json(res, e.pg === 'P0001' ? 409 : 500, { message: e.pg === 'P0001' ? e.message : 'No se pudo enviar tu respuesta. Intenta otra vez.' }); }
    const peek = await L.rpc('lectura_peek', { p_slug: b.slug }).catch(() => null);
    const path = `lectura/${lid}/${L.crypto.randomUUID()}.${ext}`;
    const put = (status, reason, text, voice) => L.rpc('lectura_put', { p_lectura: lid, p_voice: voice, p_secs: secs, p_peaks: peaks, p_device: device, p_ip: iph, p_status: status, p_reason: reason || null, p_transcript: text || null });
    let m = null;
    if (L.GROQ) { try { m = await L.moderate(peek && peek.question || '', buf, type, ext); } catch (e) { console.error('filtro', e.message); } }
    if (m && m.status === 'empty') return L.json(res, 422, { code: 'empty', message: 'No se entendió tu voz. Graba otra vez, un poco más cerca del micrófono.' });
    if (m && m.status === 'blocked') {
      await put('blocked', m.reason, m.text, 'filtrada');
      return L.json(res, 422, { code: 'filtered', message: `No entregamos esta respuesta porque ${L.WHY[m.reason] || 'no cumple las normas'}. Puedes grabar otra.` });
    }
    await L.storage.put(path, buf, type);
    await put(m ? 'ok' : 'pending', null, m && m.text, path);
    if (m) await L.drain().catch(() => {});
    return L.json(res, 200, { ok: true, pending: !m });
  } catch (e) { console.error(e); return L.json(res, 500, { message: 'No se pudo enviar tu respuesta. Intenta otra vez.' }); }
};
