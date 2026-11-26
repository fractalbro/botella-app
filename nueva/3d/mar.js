// Botella nueva · el mar 3D. Solo se dibuja en los momentos clave: bienvenida, abrir y lanzar.
// API: window.Mar.set('hero'|'open'|'away'|'off'), window.Mar.uncork(0..1)
import { THREE, C, stage, bottle, sky, moon, ocean, lerp, ease, REDUCE, seed, rnd } from './kit.js';

const cv = document.getElementById('mar');
let mode = 'off', cork = 0, tMode = 0, on = false;
const ok = (() => { try { if (window.__no3d) return false; const g = document.createElement('canvas').getContext('webgl2'); if (!g) return false; if (navigator.connection && navigator.connection.saveData) return false; return true; } catch (e) { return false; } })();

if (!ok) { window.Mar = { set() {}, uncork() {}, ok: false }; document.documentElement.classList.add('no3d'); }
else {
  const S = stage(cv, { fov: 40, bloom: [0.5, 0.4, 0.9], progress: () => 0, active: () => on });
  S.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const { scene, camera } = S; scene.fog = new THREE.Fog('#0B2436', 40, 260); scene.environmentIntensity = .45;
  const sk = sky(scene, { hz: '#173E5C', stars: 900 });
  const mpos = new THREE.Vector3(8, 24, -90); const mo = moon(3); mo.position.copy(mpos); scene.add(mo);
  const SEA = -4.2;
  const oc = ocean({ moonDir: [mpos.x, mpos.y, mpos.z], fog: '#0B2436', skyc: '#123552', fogNear: 40, fogFar: 260, amp: .8 }); oc.mesh.position.y = SEA; scene.add(oc.mesh);
  scene.add(new THREE.HemisphereLight('#9FD8E8', '#05121F', .45)); const key = new THREE.DirectionalLight('#EAF6F2', 1.4); key.position.copy(mpos); scene.add(key);

  // faro lejano: un punto de luz cálida con su haz que barre
  const LX = 16, LZ = -70;
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#14324A', roughness: .95, flatShading: true })); rock.scale.set(8, 3, 6); rock.position.set(LX, SEA - 1, LZ); scene.add(rock);
  const lh = new THREE.Group(); lh.position.set(LX, SEA + 1.4, LZ); scene.add(lh);
  const wht = new THREE.MeshStandardMaterial({ color: '#EFE9E1', roughness: .55 }), red = new THREE.MeshStandardMaterial({ color: '#E8585E', roughness: .55 });
  let y = 0; [[1.4, 1.25], [1.25, 1.1], [1.1, .95], [.95, .85]].forEach(([a, b], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(b, a, 2, 32), i % 2 ? red : wht); m.position.y = y + 1; lh.add(m); y += 2; });
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 1.1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE7B0').multiplyScalar(3) })); lan.position.y = y + .55; lh.add(lan); const LY = y + .55;
  const L = 120; const bgeo = new THREE.ConeGeometry(12, L, 40, 1, true); bgeo.translate(0, -L / 2, 0); bgeo.rotateX(-Math.PI / 2); bgeo.rotateY(Math.PI);
  const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uI: { value: .7 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vD=-position.z/${L}.; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: 'uniform float uI; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ float e=pow(abs(dot(vN,vV)),1.6); float a=e*(1.-smoothstep(0.,1.,vD))*smoothstep(0.,.02,vD)*.6*uI; gl_FragColor=vec4(vec3(1.,.9,.68)*a,a); }' });
  const pivot = new THREE.Group(); pivot.position.set(LX, SEA + 1.4 + LY, LZ); const beam = new THREE.Mesh(bgeo, beamM); pivot.add(beam); scene.add(pivot);

  // las 12 orillas: 8 que se encienden primero y 4 que esperan
  seed(9); const lights = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * .9 + (i / 11) * Math.PI * .8 + (rnd() - .5) * .12, r = 22 + rnd() * 26;
    const m = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(i < 8 ? C.a : '#FFE7B0') }));
    m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r - 6, i, v: 0 }; m.scale.setScalar(.001); scene.add(m); lights.push(m);
  }

  // la botella
  const root = new THREE.Group(); scene.add(root); const b = bottle({ light: 2 }); b.position.y = -1.4; const holder = new THREE.Group(); holder.add(b); root.add(holder);

  const cp = new THREE.Vector3(), lk = new THREE.Vector3(), tmp = new THREE.Vector3();
  const pose = { hero: { p: [.3, 3.1, 0], s: .95, rz: -1.2, cam: [0, 1.4, 13], look: [0, 1.0, 0] }, open: { p: [0, 2.2, 0], s: 1.1, rz: -.35, cam: [0, 1.2, 11], look: [0, .6, 0] }, away: { p: [2, SEA + .3, -26], s: .9, rz: -1.5, cam: [0, SEA + 6, 16], look: [3, SEA - 3.5, -30] } };
  let cur = { p: new THREE.Vector3(.3, 3.1, 0), s: .95, rz: -1.2, cam: new THREE.Vector3(0, 1.4, 13), look: new THREE.Vector3(0, 1.2, 0) };
  let from = null, tA = 0;

  S.on((t, _p, dt) => {
    sk.update(t); oc.update(t); tMode += dt;
    const P = pose[mode] || pose.hero; const k = REDUCE ? 1 : 1 - Math.pow(mode === 'away' ? .35 : .08, dt);
    // la botella viaja en arco hacia el horizonte cuando se lanza
    tmp.set(...P.p); if (mode === 'away') { const u = ease(Math.min(1, tMode / 2.4)); tmp.set(lerp(0, P.p[0], u), lerp(2.2, P.p[1], u) + Math.sin(u * Math.PI) * 3.2, lerp(0, P.p[2], u)); tmp.y = Math.max(tmp.y, oc.hAt(tmp.x, tmp.z, t) + SEA + .3); cur.p.copy(tmp); }
    else cur.p.lerp(tmp, k);
    cur.s = lerp(cur.s, P.s, k); cur.rz = lerp(cur.rz, P.rz, k); cur.cam.lerp(tmp.set(...P.cam), k); cur.look.lerp(tmp.set(...P.look), k);
    const bob = mode === 'away' ? 0 : Math.sin(t * .8) * .16;
    root.position.set(cur.p.x, cur.p.y + bob, cur.p.z); root.scale.setScalar(cur.s);
    root.rotation.y = Math.sin(t * .3) * .25 + S.pointer.x * .2; holder.rotation.z = cur.rz + Math.sin(t * .6) * .04;
    // descorchar: el corcho baja un poco (anticipación) y salta
    const c = cork; b.userData.cork.position.y = 2.82 + (c < .15 ? -c * .3 : ease((c - .15) / .85) * 1.8); b.userData.cork.rotation.z = c * 2.4;
    b.userData.paper.position.y = .85 + ease(Math.max(0, (c - .6) / .4)) * .9; b.userData.paper.material.emissiveIntensity = .35 + c * 1.4;
    // faro: barre siempre; al lanzar se queda sobre tu botella
    let ang = t * .4; if (mode === 'away') { const to = tmp.set(cur.p.x - pivot.position.x, 0, cur.p.z - pivot.position.z); const aim = Math.atan2(-to.x, -to.z); const d = ((aim - ang) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; ang += d * ease(Math.min(1, Math.max(0, (tMode - 1.6) / 1.2))); }
    pivot.rotation.y = ang; pivot.rotation.x = -.06; beamM.uniforms.uI.value = mode === 'away' ? 1.2 : .7;
    oc.mat.uniforms.uSpot.value.set(cur.p.x, cur.p.z, 2.4, mode === 'away' ? Math.min(1, Math.max(0, tMode - 2.2)) * .7 : 0);
    // las orillas se encienden: 8 primero, 4 después (más tenues)
    lights.forEach(m => { const u = m.userData; const tgt = mode === 'away' ? (u.i < 8 ? (tMode > 2.6 + u.i * .18 ? 1 : 0) : (tMode > 4.6 + (u.i - 8) * .2 ? .55 : 0)) : 0; u.v = lerp(u.v, tgt, 1 - Math.pow(.02, dt)); m.scale.setScalar(Math.max(.001, u.v)); m.position.set(u.x, oc.hAt(u.x, u.z, t) + SEA + .4, u.z); });
    camera.position.copy(cur.cam).add(tmp.set(S.pointer.x * .3, 0, 0)); camera.lookAt(cur.look);
  });

  window.Mar = {
    ok: true,
    set(m) { if (m === mode) return; mode = m; tMode = 0; on = m !== 'off'; cv.classList.toggle('on', on); if (m !== 'open') cork = 0; },
    uncork(v) { cork = Math.max(0, Math.min(1, v)); }
  };
}
window.dispatchEvent(new Event('mar-ready'));
