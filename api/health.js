// Le dice a la app qué tiene activo el servidor y le da la llave pública para suscribirse a los avisos push.
const L = require('./_lib.js');
module.exports = async (req, res) => {
  let key = null; if (L.KEY) { try { key = (await L.vapid()).pub; } catch (e) {} }
  L.json(res, 200, { push: !!key, key, lectura: !!L.KEY, filter: !!(L.KEY && L.GROQ) });
};
