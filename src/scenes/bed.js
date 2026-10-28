// River View: a bed made up the way each room is dressed. Drag to turn it; pick a room and the colours follow.
// Palettes come from the rooms' own walls, throws and cushions in the photographs.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Color, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial,
  CylinderGeometry, SphereGeometry, PlaneGeometry, HemisphereLight, DirectionalLight, PointLight,
  CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, RepeatWrapping, MathUtils,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const BED_ROOMS = {
  light: { wall: '#aab09d', brick: 0, throw: '#a28d7a', c1: '#cbbfb4', c2: '#8e7f77', rug: '#c4beb4', base: '#6a6e69', head: '#8d9086', shade: '#e4d9c7' },
  royal: { wall: '#2f3d52', brick: 0, throw: '#15263d', c1: '#c9982a', c2: '#8d8a97', rug: '#b9a17f', base: '#6c7584', head: '#44526b', shade: '#f3efe6' },
  vision: { wall: '#7e9588', brick: 0, throw: '#7b8693', c1: '#cf9fa5', c2: '#4d6676', rug: '#d0c294', base: '#5a5f66', head: '#8b948f', shade: '#efe9dc' },
  rock: { wall: '#9a5f49', brick: 1, throw: '#ab9e93', c1: '#c9a29d', c2: '#7d9bab', rug: '#c9b6b2', base: '#3e444b', head: '#666a6e', shade: '#ece4d8' },
};

function brickTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 240;
  const g = c.getContext('2d');
  g.fillStyle = '#c9bdb0';
  g.fillRect(0, 0, c.width, c.height);
  const tones = ['#a65a4b', '#b3695a', '#9b5043', '#c07a66', '#a95f50', '#b8705e'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const bw = 62, bh = 26, gap = 4;
  for (let row = 0; row < 8; row++) {
    const y = row * (bh + gap) + gap / 2;
    const off = row % 2 ? -(bw + gap) / 2 : 0;
    for (let x = off; x < c.width; x += bw + gap) {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)];
      g.fillRect(x, y, bw, bh);
      g.fillStyle = 'rgba(0,0,0,' + (0.05 + rnd() * 0.1).toFixed(2) + ')';
      g.fillRect(x, y + bh - 5, bw, 5);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2.2, 3.4);
  t.anisotropy = 4;
  return t;
}

export function initBed(el, opts = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'scene3d__canvas';
  canvas.style.touchAction = 'pan-y';
  el.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 60);

  scene.add(new HemisphereLight(0xffffff, 0x8a7d70, 1.1));
  const sun = new DirectionalLight(0xfff1dd, 2.1);
  sun.position.set(3.5, 6.5, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 18 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const mats = {};
  const targets = {};
  const mat = (name, color, rough = 0.85, extra = {}) => {
    mats[name] = new MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
    targets[name] = new Color(color);
    return mats[name];
  };
  const box = (w, h, d, material, r = 0.04) => {
    const m = new Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), material);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const put = (m, x, y, z, parent) => { m.position.set(x, y, z); (parent || scene).add(m); return m; };

  // The room: a slab of polished concrete with a back wall and a side wall.
  mat('floor', '#8a837e', 0.9);
  mat('wall', BED_ROOMS.light.wall, 0.95);
  const room = new Group();
  scene.add(room);
  put(box(5.4, 0.16, 3.8, mats.floor, 0.05), 0, -0.08, 0, room);
  put(box(5.4, 2.7, 0.12, mats.wall, 0.02), 0, 1.35, -1.9, room);
  put(box(0.12, 2.7, 3.8, mats.wall, 0.02), -2.7, 1.35, 0, room);
  const brickMat = new MeshStandardMaterial({ map: brickTexture(), roughness: 0.95, transparent: true, opacity: 0 });
  const brick = new Mesh(new PlaneGeometry(5.4, 2.7), brickMat);
  brick.position.set(0, 1.35, -1.838);
  brick.receiveShadow = true;
  room.add(brick);
  const brickSide = new Mesh(new PlaneGeometry(3.8, 2.7), brickMat);
  brickSide.rotation.y = Math.PI / 2;
  brickSide.position.set(-2.638, 1.35, 0);
  brickSide.receiveShadow = true;
  room.add(brickSide);

  // The bed, headboard to the back wall.
  const bed = new Group();
  bed.position.set(0.05, 0, -0.78);
  room.add(bed);
  mat('base', BED_ROOMS.light.base, 0.8);
  mat('head', BED_ROOMS.light.head, 0.95);
  mat('linen', '#f4f2ee', 0.95);
  mat('throw', BED_ROOMS.light.throw, 1);
  mat('c1', BED_ROOMS.light.c1, 0.95);
  mat('c2', BED_ROOMS.light.c2, 0.95);
  mat('rug', BED_ROOMS.light.rug, 1);
  mat('leg', '#15181a', 0.5);
  mat('table', '#f2f0ec', 0.6);
  mat('shade', BED_ROOMS.light.shade, 0.9);

  put(box(1.74, 0.34, 2.1, mats.base, 0.05), 0, 0.31, 0, bed);
  [[-0.78, -0.95], [0.78, -0.95], [-0.78, 0.95], [0.78, 0.95]].forEach(([x, z]) => {
    const leg = new Mesh(new CylinderGeometry(0.05, 0.04, 0.14, 12), mats.leg);
    leg.castShadow = true;
    put(leg, x, 0.07, z, bed);
  });
  put(box(1.84, 1.0, 0.12, mats.head, 0.05), 0, 0.88, -1.08, bed);
  put(box(1.66, 0.26, 2.0, mats.linen, 0.08), 0, 0.61, 0.02, bed);
  put(box(1.72, 0.1, 1.5, mats.linen, 0.05), 0, 0.77, 0.3, bed);
  const fold = new Mesh(new CylinderGeometry(0.07, 0.07, 1.72, 20), mats.linen);
  fold.rotation.z = Math.PI / 2; fold.castShadow = true;
  put(fold, 0, 0.84, -0.42, bed);
  put(box(1.78, 0.035, 0.52, mats.throw, 0.015), 0, 0.84, 0.62, bed);

  const soft = [];
  [-0.43, 0.43].forEach(x => {
    const p = put(box(0.74, 0.17, 0.46, mats.linen, 0.08), x, 0.9, -0.78, bed);
    p.rotation.x = -0.3;
    soft.push(p);
  });
  const k1 = put(box(0.44, 0.44, 0.13, mats.c1, 0.05), -0.5, 1.06, -0.5, bed);
  k1.rotation.set(-0.95, 0.12, 0.2);
  const k2 = put(box(0.4, 0.4, 0.13, mats.c2, 0.05), 0.0, 1.05, -0.46, bed);
  k2.rotation.set(-0.95, -0.05, -0.08);
  const k3 = put(box(0.4, 0.4, 0.13, mats.c1, 0.05), 0.52, 1.04, -0.48, bed);
  k3.rotation.set(-0.95, -0.16, -0.18);
  soft.push(k1, k2, k3);

  put(box(2.5, 0.02, 1.2, mats.rug, 0.01), 0, 0.011, 1.6, bed).receiveShadow = true;

  // A bedside table and a lamp whose bulb lights the headboard wall.
  const table = new Mesh(new CylinderGeometry(0.25, 0.25, 0.56, 32), mats.table);
  table.castShadow = true; table.receiveShadow = true;
  put(table, 1.3, 0.28, -0.78, bed);
  const stem = new Mesh(new CylinderGeometry(0.014, 0.014, 0.5, 8), mats.leg);
  stem.castShadow = true;
  put(stem, 1.3, 0.81, -0.78, bed);
  const lampShade = new Mesh(new CylinderGeometry(0.14, 0.2, 0.22, 28, 1, true), new MeshStandardMaterial({ color: '#f3e9d6', roughness: 1, emissive: '#ffb45a', emissiveIntensity: 0.5, side: 2 }));
  put(lampShade, 1.3, 1.17, -0.78, bed);
  const bulb = new Mesh(new SphereGeometry(0.06, 16, 12), new MeshBasicMaterial({ color: '#ffd9a0' }));
  put(bulb, 1.3, 1.12, -0.78, bed);
  const glow = new PointLight(0xffb866, 5, 4.2, 1.6);
  glow.position.set(1.3, 1.15, -0.62);
  bed.add(glow);

  // State.
  const rig = { az: 0.62, polar: 1.12, dist: 11.2 };
  let baseAz = 0.62, current = 'light', dragging = false, lastX = 0, lastY = 0, vel = 0, idleSince = performance.now(), pulse = 0;
  const api = { room: 'light', onInteract: null };

  const apply = key => {
    const p = BED_ROOMS[key];
    if (!p) return;
    ['wall', 'base', 'head', 'throw', 'c1', 'c2', 'rug', 'shade'].forEach(n => targets[n].set(p[n]));
    api.brickTarget = p.brick;
  };
  api.brickTarget = 0;
  api.setRoom = key => {
    if (!BED_ROOMS[key] || key === current) return;
    current = key; api.room = key; apply(key);
    pulse = 1;
    idleSince = performance.now();
    kick();
  };
  // Start already dressed for the first room.
  Object.entries(BED_ROOMS.light).forEach(([n, v]) => { if (mats[n] && n !== 'brick') mats[n].color.set(v); });

  let w = 0, h = 0;
  const resize = () => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole room in frame on tall, narrow screens.
    rig.dist = (camera.aspect < 1 ? 15.5 : camera.aspect < 1.3 ? 13 : 11.2);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(() => { resize(); kick(); }).observe(el);
  resize();

  canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0;
    el.classList.add('is-dragging');
    canvas.setPointerCapture(e.pointerId);
    api.onInteract && api.onInteract();
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vel = -dx * 0.006;
    baseAz = MathUtils.clamp(baseAz + vel, -1.6, 1.6);
    if (e.pointerType !== 'touch') rig.polar = MathUtils.clamp(rig.polar - dy * 0.004, 0.75, 1.42);
    idleSince = performance.now();
    kick();
  });
  const end = () => { dragging = false; idleSince = performance.now(); el.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { baseAz = MathUtils.clamp(baseAz - 0.15, -1.6, 1.6); kick(); }
    if (e.key === 'ArrowRight') { baseAz = MathUtils.clamp(baseAz + 0.15, -1.6, 1.6); kick(); }
  });
  canvas.tabIndex = 0;

  let visible = false, raf = 0, last = performance.now(), t = 0;
  const frame = now => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt;
    // Colours ease toward the room that was picked.
    const k = 1 - Math.exp(-dt * 5);
    let moving = false;
    ['wall', 'base', 'head', 'throw', 'c1', 'c2', 'rug', 'shade'].forEach(n => {
      const c = mats[n].color;
      if (Math.abs(c.r - targets[n].r) + Math.abs(c.g - targets[n].g) + Math.abs(c.b - targets[n].b) > 0.002) { c.lerp(targets[n], k); moving = true; }
    });
    lampShade.material.color.copy(mats.shade.color);
    const bo = brickMat.opacity + (api.brickTarget - brickMat.opacity) * k;
    if (Math.abs(bo - api.brickTarget) > 0.004) moving = true;
    brickMat.opacity = bo;
    if (!dragging && Math.abs(vel) > 0.00005) { baseAz = MathUtils.clamp(baseAz + vel, -1.6, 1.6); vel *= 0.92; moving = true; }
    // A little breathing when the soft furnishings are re-dressed.
    pulse = Math.max(0, pulse - dt * 1.6);
    const s = 1 + Math.sin(pulse * Math.PI) * 0.1;
    soft.forEach(m => m.scale.set(1, s, 1));
    const idle = !reduce && !dragging && now - idleSince > 3000;
    const az = baseAz + (idle ? Math.sin(t * 0.35) * 0.32 : 0);
    const sp = Math.sin(rig.polar), cp = Math.cos(rig.polar);
    camera.position.set(Math.sin(az) * rig.dist * sp, rig.dist * cp + 0.2, Math.cos(az) * rig.dist * sp);
    camera.lookAt(0, 0.82, 0);
    renderer.render(scene, camera);
    if (visible && !document.hidden && (idle || moving || dragging || pulse > 0 || Math.abs(vel) > 0.00005 || !reduce)) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: '120px' }).observe(el);
  document.addEventListener('visibilitychange', kick);
  el.classList.add('is-live');
  api.kick = kick;
  return api;
}
