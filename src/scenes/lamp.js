// River View: the black pendant lamp from the Royal Room. It swings with the pointer and is lit while check-in is open.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, CylinderGeometry,
  SphereGeometry, LatheGeometry, Vector2, PointLight, HemisphereLight, DirectionalLight, Sprite, SpriteMaterial,
  CanvasTexture, SRGBColorSpace, AdditiveBlending, DoubleSide, MathUtils, Color,
} from 'three';

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,214,140,1)');
  r.addColorStop(0.35, 'rgba(255,170,70,0.45)');
  r.addColorStop(1, 'rgba(255,150,40,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function initLamp(el, opts = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'scene3d__canvas';
  canvas.style.touchAction = 'pan-y';
  el.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(26, 1, 0.1, 60);
  camera.position.set(0, 1.55, 9.5);
  camera.lookAt(0, 1.55, 0);
  scene.add(new HemisphereLight(0xffffff, 0x6d625a, 0.9));
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 4, 6);
  scene.add(key);

  const PIVOT_Y = 4.4;
  const pivot = new Group();
  pivot.position.y = PIVOT_Y;
  scene.add(pivot);

  const cord = new Mesh(new CylinderGeometry(0.012, 0.012, 3.5, 6), new MeshBasicMaterial({ color: 0x8a8e87 }));
  cord.position.y = -1.75;
  pivot.add(cord);

  const lamp = new Group();
  lamp.position.y = -3.5;
  pivot.add(lamp);

  // Shade: matte black outside, brass inside, like the one over the Royal Room's bed.
  const outer = [[0.05, 0.62], [0.12, 0.56], [0.2, 0.46], [0.46, 0.08], [0.56, 0]];
  const inner = [[0.54, -0.01], [0.44, 0.06], [0.18, 0.43], [0.1, 0.52], [0.04, 0.6]];
  const outerMat = new MeshStandardMaterial({ color: '#34383c', roughness: 0.5, metalness: 0.35, side: DoubleSide });
  const innerMat = new MeshStandardMaterial({ color: '#c9962f', roughness: 0.35, metalness: 0.55, emissive: new Color('#ff9d2e'), emissiveIntensity: 0, side: DoubleSide });
  const lathe = pts => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 56);
  lamp.add(new Mesh(lathe(outer), outerMat));
  lamp.add(new Mesh(lathe(inner), innerMat));
  const cap = new Mesh(new CylinderGeometry(0.06, 0.06, 0.12, 16), outerMat);
  cap.position.y = 0.66;
  lamp.add(cap);
  const bulbMat = new MeshBasicMaterial({ color: '#59462c' });
  const bulb = new Mesh(new SphereGeometry(0.15, 24, 18), bulbMat);
  bulb.position.y = 0.2;
  lamp.add(bulb);
  const glow = new Sprite(new SpriteMaterial({ map: glowTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(2.6, 2.6, 1);
  glow.position.set(0, -0.15, 0.2);
  lamp.add(glow);
  const light = new PointLight(0xffb15a, 0, 6, 1.6);
  light.position.set(0, 0.05, 0.4);
  lamp.add(light);

  const api = { lit: !!opts.lit, set(v) { api.lit = !!v; kick(); }, toggle() { api.set(!api.lit); return api.lit; } };
  let level = 0; // 0 dark, 1 lit
  let angle = 0, vel = 0, target = 0, hover = false;
  let w = 0, h = 0;

  const resize = () => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // The glow must fit inside the canvas, or its edge shows as a box.
    const visW = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * 9.5 * camera.aspect;
    const g = Math.min(2.6, visW * 0.94);
    glow.scale.set(g, g, 1);
  };
  new ResizeObserver(() => { resize(); kick(); }).observe(el);
  resize();

  // Pointer pushes the lamp the way a hand would; a press gives it a shove.
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    target = ((e.clientX - r.left) / r.width - 0.5) * 0.22;
    hover = true; kick();
  });
  el.addEventListener('pointerleave', () => { target = 0; hover = false; });
  el.addEventListener('pointerdown', e => {
    const r = el.getBoundingClientRect();
    vel += (e.clientX - r.left < r.width / 2 ? 1 : -1) * 0.45;
    kick();
  });

  let visible = false, raf = 0, last = performance.now(), t = 0;
  const frame = now => {
    raf = 0;
    const dt = Math.min(0.04, (now - last) / 1000); last = now;
    t += dt;
    // Damped pendulum, pulled gently toward the pointer.
    const goal = reduce ? 0 : target + Math.sin(t * 0.8) * 0.006;
    const acc = -34 * (angle - goal) - 5.2 * vel;
    vel += acc * dt;
    angle += vel * dt;
    pivot.rotation.z = angle;
    lamp.rotation.z = -angle * 0.35;
    const want = api.lit ? 1 : 0;
    level += (want - level) * (1 - Math.exp(-dt * 6));
    innerMat.emissiveIntensity = level * 1.4;
    bulbMat.color.set('#59462c').lerp(new Color('#ffe0a6'), level);
    glow.material.opacity = level * 0.95;
    light.intensity = level * 7;
    renderer.render(scene, camera);
    const settled = Math.abs(angle - goal) < 0.0008 && Math.abs(vel) < 0.002 && Math.abs(level - want) < 0.003;
    if (visible && !document.hidden && (!settled || !reduce)) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: '120px' }).observe(el);
  document.addEventListener('visibilitychange', kick);
  el.classList.add('is-live');
  return api;
}
