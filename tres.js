/* Botella · el mar en 3D (tres/mar.js) para los momentos clave. Se carga después de abrir la app, sin frenarla.
   Si el teléfono no tiene WebGL, ahorra datos o la carga falla, todo sigue como antes: el mar dibujado en 2D. */
(() => {
  const IDS = ['splash', 'intro', 'open', 'thrown', 'moment', 'firstreply', 'marea'];
  const q = location.search, nav = navigator;
  if (window.__no3d || /[?&]no3d/.test(q) || nav.connection?.saveData || (nav.deviceMemory && nav.deviceMemory < 2)) return;
  try { if (!document.createElement('canvas').getContext('webgl2')) return; } catch (e) { return; }
  const phone = document.querySelector('.phone'); if (!phone) return;
  const cv = document.createElement('canvas'); cv.className = 'mar3d'; cv.setAttribute('aria-hidden', 'true'); phone.insertBefore(cv, phone.firstChild);
  let M = null, raf = 0, still = 0;
  const is3 = () => M && IDS.includes(P.curId);
  const env = {
    reduce: typeof reduceMotion !== 'undefined' && reduceMotion,
    cur: () => ({ id: P.curId, st: P.st, slide: S.slide || 0, since: k => (performance.now() - (P.st[k] || 0)) / 1000,
      col: P.curId === 'open' ? btCol(S.sel) : P.curId === 'thrown' ? (P.st.featured ? '255,214,140' : S.me?.glass && P.st.btype === 'free' && GLASS[S.me.glass] ? GLASS[S.me.glass][2] : (BT[P.st.btype] || BT.free).col) : '127,216,201' })
  };
  // si el teléfono no da (cuadros de más de 60 ms en promedio), se apaga el 3D y vuelve el mar 2D
  let n = 0, last = 0, slow = 0;
  const loop = now => { raf = 0; if (!is3() || document.hidden) { last = 0; return; } try { M.frame(now); } catch (e) { off(e); return; }
    if (last && n < 40 && !window.__force3d) { n++; slow += now - last > 60 ? 1 : 0; if (n >= 10 && slow / n > .6) { off('lento'); return; } } last = now;
    // con "reducir movimiento" se dibuja la escena final y se queda quieta
    if (env.reduce && ++still > 2) return; raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf && is3()) { still = 0; raf = requestAnimationFrame(loop); } };
  const mark = () => { const on = is3(); document.documentElement.classList.toggle('g3on', !!on); if (on && P.root) { P.root.classList.add('g3'); M.screen(P.curId, performance.now()); kick(); } };
  const off = e => { console.warn('mar 3D apagado', e); M = null; document.documentElement.classList.remove('g3on'); document.querySelectorAll('.screen.g3').forEach(s => s.classList.remove('g3')); };
  const _go = go; go = function (id, o) { _go(id, o); if (M) mark(); };
  document.addEventListener('visibilitychange', kick);
  const load = () => import('./tres/mar.js').then(m => { M = m.create(cv, env); addEventListener('resize', () => M?.size()); mark(); }).catch(off);
  (window.requestIdleCallback || (f => setTimeout(f, 400)))(load, { timeout: 1500 });
})();
