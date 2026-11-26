// Botella · el mar en 3D para los momentos clave de la app (bienvenida, intro, abrir, lanzar, conexión, marea).
// Es el mismo mar, botella y faro de la web. Un solo escenario vive detrás de las pantallas; cada pantalla
// pide una "toma" (cámara + qué hace la botella) y la cámara viaja suave de una toma a otra.
// Movimiento: ease-out, nada lineal, nada pasa de 1,2 s salvo lo ambiental (docs de la web: MOTION.md).
import { THREE, C, bottle, sky, moon, ocean, orb, glow, warm, autoRes, lerp, seed, rnd } from './kit.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const cl = x => Math.max(0, Math.min(1, x));
const ez = x => 1 - Math.pow(1 - cl(x), 3);                 // ease-out
const spring = x => { x = cl(x); return 1 - Math.pow(2, -9 * x) * Math.cos(x * 9); }; // pequeño rebote al llegar
const rgb = s => { const [r, g, b] = String(s || '127,216,201').split(',').map(Number); return new THREE.Color(r / 255, g / 255, b / 255); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function create(canvas, env) {
  // env: { reduce, cur() → { id, st, slide, since(key), col } }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.transmissionResolutionScale = .5; // el vidrio redibuja la escena: a media resolución no se nota
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(C.bg); scene.fog = new THREE.Fog('#0B2436', 40, 260);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000);
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(128, 128), 0.45, 0.4, 0.9); composer.addPass(bloom); composer.addPass(new OutputPass());
  const ar = autoRes(renderer, composer, { budget: 1.1e6, min: .5 }); let lastNow = 0;

  // ---- cielo, luna, mar ----
  const sk = sky(scene, { hz: '#173E5C', stars: 900 });
  const mpos = V(-9, 11, -110); const mo = moon(2); mo.position.copy(mpos); scene.add(mo);
  const oc = ocean({ moonDir: [mpos.x, mpos.y, mpos.z], fog: '#0B2436', skyc: '#123552', fogNear: 30, fogFar: 240, amp: .55, size: 420 }); scene.add(oc.mesh);
  scene.add(new THREE.HemisphereLight('#9FD8E8', '#05121F', .5)); const key = new THREE.DirectionalLight('#EAF6F2', 1.3); key.position.copy(mpos); scene.add(key);
  const sea = (x, z, t) => oc.hAt(x, z, t) + oc.mesh.position.y;

  // ---- el faro, a lo lejos a la derecha ----
  const LX = 11, LZ = -92;
  const rg = new THREE.IcosahedronGeometry(1, 3); const rp = rg.attributes.position; seed(5);
  for (let i = 0; i < rp.count; i++) { const v = V(0, 0, 0).fromBufferAttribute(rp, i); v.multiplyScalar(1 + Math.sin(v.x * 4 + v.z * 3) * .12 + Math.sin(v.y * 7) * .06 + (rnd() - .5) * .08); rp.setXYZ(i, v.x, v.y, v.z); } rg.computeVertexNormals();
  const rock = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: '#14324A', roughness: .95, flatShading: true })); rock.scale.set(7, 2.6, 5.5); rock.position.set(LX, -1, LZ); scene.add(rock);
  const lh = new THREE.Group(); lh.position.set(LX, 1.2, LZ); lh.scale.setScalar(.85); scene.add(lh);
  const red = new THREE.MeshStandardMaterial({ color: '#E8585E', roughness: .55 }), wht = new THREE.MeshStandardMaterial({ color: '#EFE9E1', roughness: .55 });
  let y = 0; [[1.2, 1.1], [1.1, 1.0], [1.0, .9], [.9, .8]].forEach(([r1, r2], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, 1.7, 32), i % 2 ? red : wht); m.position.y = y + .85; lh.add(m); y += 1.7; });
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .16, 32), new THREE.MeshStandardMaterial({ color: '#1E4A6B', roughness: .6 })); gal.position.y = y + .08; lh.add(gal); y += .16;
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, 1, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE7B0').multiplyScalar(3.2) })); lan.position.y = y + .5; lh.add(lan); const LY = y + .5; y += 1;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.72, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1E4A6B', roughness: .5 })); dome.position.y = y; lh.add(dome);
  const BL = 110; const bgeo = new THREE.ConeGeometry(10, BL, 40, 1, true); bgeo.translate(0, -BL / 2, 0); bgeo.rotateX(-Math.PI / 2); bgeo.rotateY(Math.PI);
  const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uT: { value: 0 }, uI: { value: .6 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vD=-position.z/${BL}.; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: 'uniform float uT,uI; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ float e=pow(abs(dot(vN,vV)),1.6); float a=e*(1.-smoothstep(0.,1.,vD))*smoothstep(0.,.02,vD)*.7*uI; a*=.85+.15*sin(vD*40.-uT*2.); gl_FragColor=vec4(vec3(1.,.9,.68)*a,a); }' });
  const pivot = new THREE.Group(); pivot.position.set(LX, 1.2 + LY * .85, LZ); const beam = new THREE.Mesh(bgeo, beamM); pivot.add(beam); const beam2 = beam.clone(); beam2.rotation.y = Math.PI; pivot.add(beam2); scene.add(pivot);

  // ---- botellas ----
  const tintOf = (o, c) => { o.b.traverse(m => { if (m.isMesh && m.material.transmission) { m.material.color.copy(c).lerp(new THREE.Color('#ffffff'), .55); m.material.attenuationColor.copy(c); } }); o.pl.color.copy(c); };
  // la luz de cada botella vive fuera de ella y nunca se oculta: si cambia la cantidad de luces, three recompila todo (congelón)
  const mk = (light) => { const b = bottle({ light: 0 }); const holder = new THREE.Group(); holder.add(b); b.position.y = -1.4; const root = new THREE.Group(); root.add(holder); scene.add(root);
    const pl = new THREE.PointLight(C.a, 0, 4, 2); scene.add(pl); return { root, holder, b, pl, light }; };
  const lightAt = o => { if (o.root.visible) { o.b.userData.paper.getWorldPosition(o.pl.position); o.pl.intensity = o.light; } else o.pl.intensity = 0; };
  const H = mk(2.2);           // la protagonista: tu botella o la que te llegó
  const M2 = mk(1.6);          // la otra (intro 3 y el momento de conexión)
  tintOf(M2, rgb('255,214,140'));
  seed(12); const far = []; // las orillas: 8 + 4 personas, y las doradas de la marea
  for (let i = 0; i < 12; i++) { const b = bottle({ light: 0 }); b.scale.setScalar(.6); b.userData.paper.material = b.userData.paper.material.clone(); const g = new THREE.Group(); g.add(b); b.rotation.z = -1.45; const slot = [5, 2, 9, 0, 7, 3, 10, 1, 6, 11, 4, 8][i];
    g.userData = { x: (slot / 11 - .5) * 17 + (rnd() - .5) * 2, z: -16 - rnd() * 30, ph: rnd() * 6, ry: rnd() * 6, i }; const gl = glow(C.a, 3); gl.position.y = .4; g.add(gl); g.userData.gl = gl; g.visible = false; scene.add(g); far.push(g); }
  // corcho que salta y chispas de papel
  const sparkG = new THREE.BufferGeometry(); const SN = 26; const sp = new Float32Array(SN * 3), sv = []; for (let i = 0; i < SN; i++) sv.push(V((rnd() - .5) * 1.4, .8 + rnd() * 1.6, (rnd() - .5) * 1.4)); sparkG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sparkG, new THREE.PointsMaterial({ color: new THREE.Color(C.paper).multiplyScalar(2.2), size: .07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(sparks);
  // anillos en el agua (el chapuzón) y anillo de luz (el encuentro)
  const ringM = () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#AAF0E4').multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 64), ringM()); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
  const halo = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), ringM()); halo.material.color.set(new THREE.Color(C.paper).multiplyScalar(1.8)); scene.add(halo);
  const orbA = orb(C.a, .13, 2.6), orbB = orb('#FFD68C', .13, 2.6); scene.add(orbA, orbB);

  // ---- tomas: cámara y encuadre por pantalla (lift sube la escena para que no choque con el texto) ----
  const SHOTS = {
    splash: { cam: V(0, 1.2, 8), look: V(0, 1.2, -2), lift: .32 },
    intro: { cam: V(0, 1.25, 8.4), look: V(0, 1.25, -2), lift: .32 },
    open: { cam: V(0, 1.2, 8), look: V(0, 1.2, -2), lift: .32 },
    thrown: { cam: V(0, 2.4, 9), look: V(0, 2.4, -2), lift: .28 },
    moment: { cam: V(0, 1.5, 8), look: V(0, 1.5, -2), lift: .34 },
    marea: { cam: V(0, 2, 9), look: V(0, 2, -2), lift: .4 }
  };
  SHOTS.firstreply = SHOTS.moment;
  let cur = 'splash', from = { cam: SHOTS.splash.cam.clone(), look: SHOTS.splash.look.clone(), lift: SHOTS.splash.lift }, enterAt = 0, w = 0, h = 0;
  const camNow = { cam: from.cam.clone(), look: from.look.clone(), lift: from.lift };
  const size = () => { const W = canvas.clientWidth, Hh = canvas.clientHeight; if (!W || !Hh || (W === w && Hh === h)) return; w = W; h = Hh; ar.size(w, h); camera.aspect = w / h; camera.fov = w / h > 1 ? 34 : 48; camera.updateProjectionMatrix(); };

  function screen(id, now) { if (!SHOTS[id]) return; if (id !== cur) { from = { cam: camNow.cam.clone(), look: camNow.look.clone(), lift: camNow.lift }; cur = id; enterAt = now; } }

  const tmp = V(0, 0, 0), up = V(0, 1, 0), dir = V(0, 0, -1);
  const showFar = (n, q, col, t, golden) => far.forEach((g, i) => { const u = g.userData; const vis = i < n; g.visible = vis; if (!vis) return; g.position.set(u.x, sea(u.x, u.z, t) + .1, u.z); g.rotation.y = u.ry; g.children[0].rotation.x = Math.sin(t + u.ph) * .2;
    u.gl.material.color.copy(col); const on = cl(q * n - i); u.gl.material.opacity = lerp(u.gl.material.opacity, on * (golden ? .9 : .75), .18); u.gl.scale.setScalar(1 + u.gl.material.opacity * 1.1); g.children[0].userData.paper.material.emissiveIntensity = .1 + on * (golden ? .9 : .6); });
  const bob = (o, x, z, t, lift = .25, s = 1) => { o.root.position.set(x, sea(x, z, t) + lift, z); o.root.scale.setScalar(s); };
  const corkReset = o => { o.b.userData.cork.position.set(0, 2.82, 0); o.b.userData.cork.rotation.set(0, 0, 0); o.b.userData.cork.visible = true; o.b.userData.paper.position.y = .85; o.b.userData.paper.material.emissiveIntensity = .35; };
  const project = (px, py, depth) => { // de un punto de la pantalla (px) al mundo, a cierta distancia de la cámara
    const ndc = V(px / w * 2 - 1, -(py / h) * 2 + 1, .5); ndc.unproject(camera); return ndc.sub(camera.position).normalize().multiplyScalar(depth).add(camera.position); };

  function frame(now) {
    size(); if (!w) return; if (lastNow) ar.tick(now - lastNow); lastNow = now;
    const c = env.cur(), R = env.reduce, t = R ? 2 : now / 1000, k = R ? 99 : (now - enterAt) / 1000;
    sk.update(t); oc.update(t); beamM.uniforms.uT.value = t;
    // cámara: viaja de la toma anterior a esta en 1 s con ease-out
    const S = SHOTS[cur], q = R ? 1 : ez(k / 1.0);
    camNow.cam.copy(from.cam).lerp(S.cam, q); camNow.look.copy(from.look).lerp(S.look, q); camNow.lift = lerp(from.lift, S.lift, q);
    camera.position.copy(camNow.cam); camera.position.x += Math.sin(t * .23) * .12; camera.position.y += Math.sin(t * .31) * .06; camera.lookAt(camNow.look);
    const short = w < h ? Math.min(.05, Math.max(0, 2.1 - h / w) * .15) : 0; // iPhone SE y pantallas bajas: la escena sube un poco más
    camera.setViewOffset(w, h, 0, h * (camNow.lift + short), w, h); camera.updateProjectionMatrix();
    // por defecto: faro girando suave, sin foco, sin orillas, la segunda botella escondida
    let beamA = t * .35, spot = 0, sx = 0, sz = 0; beamM.uniforms.uI.value = .55; M2.root.visible = false; orbA.visible = orbB.visible = false; halo.material.opacity = 0; rings.forEach(r => r.material.opacity = 0); sparks.visible = false;
    let nFar = 0, qFar = 0, farCol = rgb(c.col), golden = false; oc.mesh.position.y = 0;
    H.root.visible = true; tintOf(H, rgb(c.col));
    const st = c.st || {};

    if (cur === 'splash' || cur === 'intro') {
      const sl = cur === 'intro' ? c.slide : 0; corkReset(H);
      if (sl === 1) { // llega a ocho orillas: la botella se aleja, el faro barre, se encienden 8 luces
        const u = R ? 1 : ez(k / 2.4); bob(H, lerp(.3, 1.4, u), lerp(-1, -16, u), t, .2, lerp(1, .8, u));
        nFar = 8; qFar = R ? 1 : cl((k - 1.1) / 1.6); beamM.uniforms.uI.value = .9;
      } else { bob(H, sl === 2 ? -.95 : .8, sl === 2 ? -1 : -1.6, t, .22, sl === 2 ? .82 : .88); }
      if (sl === 2) { M2.root.visible = true; corkReset(M2); const u = R ? 1 : spring(k / 1.1); bob(M2, lerp(4, 1.1, u), -1.6, t, .22, .82); M2.holder.rotation.set(0, 0, 1.3 + Math.sin(t * .7) * .06); M2.root.rotation.y = Math.PI + Math.sin(t * .4) * .2; }
      H.holder.rotation.set(Math.sin(t * .9) * .08, 0, -1.32 + Math.sin(t * .6) * .06); H.root.rotation.set(0, Math.sin(t * .3) * .3 - .2, 0);
    }

    if (cur === 'open') {
      // la botella que tocaste en la orilla vuela hasta aquí, tiembla mientras mantienes, y descorcha
      const up_ = st.uncorked ? (R ? 1 : ez(c.since('corkAt') / .9)) : 0;
      camera.updateMatrixWorld(); const base = project(w * .5, h * lerp(.33, .19, up_), 7.5); base.y += Math.sin(t) * .06; let sc = lerp(.95, .55, up_);
      const fk = st.flyR && !R ? ez(c.since('flyAt') / .6) : 1;
      if (fk < 1) { const p0 = project(st.flyR.x + st.flyR.w / 2, st.flyR.y + st.flyR.h / 2, 7.5); base.lerpVectors(p0, base, fk); sc = lerp(.3, sc, fk); }
      const shake = st.holdAt && !st.uncorked ? cl((performance.now() - st.holdAt) / 900) : 0;
      H.root.position.copy(base); H.root.position.x += Math.sin(t * 60) * .03 * shake; H.root.position.y += Math.cos(t * 50) * .025 * shake; H.root.scale.setScalar(sc);
      H.holder.rotation.set(0, 0, -1.05 - up_ * .25 + Math.sin(t * .7) * .04); H.root.rotation.set(0, -.35 + Math.sin(t * .4) * .12, 0);
      const ck = H.b.userData.cork, pk = st.uncorked ? (R ? 99 : c.since('corkAt')) : 0;
      if (st.uncorked) { const e = ez(pk / .7); ck.position.set(e * .9, 2.82 + e * 2.2 - e * e * .9, 0); ck.rotation.z = e * 4; ck.visible = pk < 1.2; H.b.userData.paper.position.y = .85 + ez(pk / .9) * .5; H.b.userData.paper.material.emissiveIntensity = .35 + (1 - ez((pk - .2) / 1.4)) * 2.2 + .5;
        if (pk < 1.2) { sparks.visible = true; sparks.material.opacity = 1 - pk / 1.2; const a = sparkG.attributes.position; tmp.set(0, 2.9, 0); H.b.localToWorld(tmp); sv.forEach((v, i) => a.setXYZ(i, tmp.x + v.x * ez(pk / .9) * 1.2, tmp.y + v.y * ez(pk / .9) - pk * pk * .8, tmp.z + v.z * ez(pk / .9))); a.needsUpdate = true; } }
      else { corkReset(H); H.b.userData.paper.material.emissiveIntensity = .35 + shake * 1.4; }
      beamM.uniforms.uI.value = .35;
    }

    if (cur === 'thrown') {
      // arco desde tu mano, chapuzón, el faro la encuentra y se encienden las orillas
      const kk = R ? 99 : c.since('thrownAt'), HS = V(0, 0, -9); corkReset(H);
      if (kk < .9) { const u = kk / .9; const x = lerp(2.2, HS.x, u), z = lerp(5, HS.z, u), yy = lerp(-.5, sea(HS.x, HS.z, t) + .2, u) + Math.sin(u * Math.PI) * 4.2; H.root.position.set(x, yy, z); H.root.scale.setScalar(.8); H.holder.rotation.set(0, 0, -1.3 + u * 7); H.root.rotation.set(0, .4, 0); }
      else { const u = cl((kk - .9) / 4); bob(H, HS.x + u * .6, HS.z - u * 3, t, .2, .8); H.holder.rotation.set(Math.sin(t * .9) * .1, 0, -1.4); H.root.rotation.set(0, .4 + Math.sin(t * .3) * .2, 0);
        if (kk < 2.2) rings.forEach((r, i) => { const q2 = cl((kk - .9 - i * .14) / 1.1); r.position.set(HS.x, sea(HS.x, HS.z, t) + .05, HS.z); r.scale.setScalar(.3 + ez(q2) * (2.6 + i * .9)); r.material.opacity = q2 > 0 ? (1 - q2) * .75 : 0; }); }
      // el faro apunta a tu botella entre 1,2 s y 3,4 s
      const lock = R ? 0 : cl(Math.min((kk - 1.2) * 2, (3.6 - kk) * 2));
      tmp.set(H.root.position.x - pivot.position.x, 0, H.root.position.z - pivot.position.z); const aim = Math.atan2(-tmp.x, -tmp.z); const d = (((aim - beamA) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI; beamA += d * ez(lock);
      spot = ez(lock) * .9; sx = H.root.position.x; sz = H.root.position.z; beamM.uniforms.uI.value = .6 + lock * .6;
      if (st.shores != null && st.shores > 0) { nFar = Math.min(12, st.shores); qFar = R ? 1 : cl((kk - 3.4) / 1.2); }
      farCol = rgb(c.col); golden = !!st.featured;
    }

    if (cur === 'moment' || cur === 'firstreply') {
      // dos botellas se encuentran; sus voces suben y se juntan en el aire
      const kk = R ? 99 : c.since('momentAt'), a = R ? 1 : ez(kk / 1.2); M2.root.visible = true; tintOf(H, rgb('127,216,201'));
      const meet = 1.25; [H, M2].forEach((o, i) => { const s = i ? 1 : -1; bob(o, s * lerp(5.2, 1.05, a), -2, t, .22, .85); o.holder.rotation.set(Math.sin(t + i) * .08, 0, s * -1.36); o.root.rotation.set(0, i ? Math.PI : 0, 0);
        const ck = o.b.userData.cork; if (kk > meet) { const e = ez((kk - meet) / .6); ck.position.set(e * .5, 2.82 + e * 1.4, 0); ck.visible = kk < meet + .7; } else { ck.visible = true; ck.position.set(0, 2.82, 0); } });
      if (kk > meet) { const q2 = ez((kk - meet) / 1.1), sep = (1 - cl((kk - 1.9) / .6)) * .9; orbA.visible = orbB.visible = true;
        const cy = lerp(.6, 1.9, q2); orbA.position.set(-sep - (1 - q2) * .3, cy, -2); orbB.position.set(sep + (1 - q2) * .3, cy, -2); const s2 = .8 + q2 * 1.2; orbA.scale.setScalar(s2); orbB.scale.setScalar(s2);
        if (kk > 2.4) { const f = cl((kk - 2.4) / 1.4); halo.position.set(0, cy, -2); halo.lookAt(camera.position); halo.scale.setScalar(.4 + ez(f) * 5); halo.material.opacity = (1 - f) * .8; } }
    }

    if (cur === 'marea') {
      // sube la marea y trae las botellas doradas
      const u = R ? 1 : ez(k / 1.8); oc.mesh.position.y = lerp(-.9, 0, u); H.root.visible = false; nFar = 7; qFar = R ? 1 : cl((k - .4) / 1.6); farCol = rgb('255,214,140'); golden = true; beamM.uniforms.uI.value = .7;
    }

    pivot.rotation.y = beamA; pivot.rotation.x = -.05; oc.mat.uniforms.uSpot.value.set(sx, sz, 2, spot);
    showFar(nFar, qFar, farCol, t, golden); lightAt(H); lightAt(M2);
    composer.render();
  }
  // compila todo en segundo plano; la app muestra el 3D recién cuando esto termina
  size(); camera.aspect = (w / h) || .5; camera.updateProjectionMatrix();
  // y un cuadro de ensayo, todavía invisible, para que el vidrio y el brillo también queden listos
  const ready = warm(renderer, scene, camera).then(() => { try { frame(performance.now()); lastNow = 0; } catch (e) {} });
  return { frame, screen, size, ready, pause: () => { lastNow = 0; }, dispose: () => renderer.dispose() };
}
