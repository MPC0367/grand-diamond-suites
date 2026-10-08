/* ═══════════════════════════════════════════════════════════
   GRAND DIAMOND SUITES — WebGL hero
   A refractive brilliant-cut diamond drifting in gold dust.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("gem");
const hero = document.getElementById("hero");
if (!canvas || !hero) throw new Error("hero canvas missing");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (err) {
  canvas.remove();
  throw err;
}
/* The transmission pass renders a full-viewport buffer every frame,
   so pixel ratio is the main cost lever — cap it hard. */
const smallScreen = window.innerWidth < 700;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, smallScreen ? 1.25 : 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
camera.position.set(0, 0.2, 7);

/* Soft studio reflections for the physical material */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ── The stone ─────────────────────────────────── */
const group = new THREE.Group();
scene.add(group);

/* Brilliant-cut profile swept into a lathe: culet → girdle → crown → table */
const profile = [
  new THREE.Vector2(0.0, -1.28),
  new THREE.Vector2(0.52, -0.62),
  new THREE.Vector2(1.02, -0.02),
  new THREE.Vector2(1.06, 0.1),
  new THREE.Vector2(0.62, 0.46),
  new THREE.Vector2(0.0, 0.46)
];
const gemGeo = new THREE.LatheGeometry(profile, 14);
/* Full refraction on desktop; on phones the transmission pass is the
   single biggest GPU cost, so serve a champagne-gold facet instead. */
const gemMat = smallScreen
  ? new THREE.MeshPhysicalMaterial({
      color: 0xc8a96b,
      metalness: 0.92,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
      flatShading: true
    })
  : new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.015,
      transmission: 1,
      thickness: 2.4,
      ior: 2.32,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      attenuationColor: new THREE.Color(0xf0d6a0),
      attenuationDistance: 2.6,
      envMapIntensity: 1.5,
      flatShading: true
    });
const gem = new THREE.Mesh(gemGeo, gemMat);
gem.position.y = 0.5;
gem.rotation.x = 0.12;
group.add(gem);

/* Ghost facet cage floating behind the stone */
const cage = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.7, 0)),
  new THREE.LineBasicMaterial({ color: 0xc8a96b, transparent: true, opacity: 0.07 })
);
cage.position.y = 0.4;
group.add(cage);

/* ── Gold dust ─────────────────────────────────── */
const COUNT = 340;
const pos = new Float32Array(COUNT * 3);
const seed = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  const r = 2.2 + Math.random() * 5.5;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  pos[i * 3 + 1] = r * Math.cos(phi) * 0.62;
  pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.5 - 1;
  seed[i] = Math.random() * Math.PI * 2;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const dustMat = new THREE.PointsMaterial({
  color: 0xe6cd96,
  size: 0.028,
  transparent: true,
  opacity: 0.75,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
});
const dust = new THREE.Points(dustGeo, dustMat);
scene.add(dust);

/* ── Lights (sparkle accents over the env map) ─── */
const key = new THREE.PointLight(0xfff2d8, 30, 30);
key.position.set(4, 4, 5);
scene.add(key);
const rim = new THREE.PointLight(0x93a7c8, 14, 30);
rim.position.set(-5, -2, 3);
scene.add(rim);

/* ── Sizing ────────────────────────────────────── */
const resize = () => {
  const w = hero.clientWidth;
  const h = hero.clientHeight;
  if (w === 0 || h === 0) return; /* hidden or collapsed pane — wait for real bounds */
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  /* keep the stone comfortably framed on narrow screens */
  camera.position.z = w < 700 ? 9 : 7;
  camera.updateProjectionMatrix();
};
resize();
window.addEventListener("resize", resize);
if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(hero);
document.addEventListener("visibilitychange", () => { if (!document.hidden) resize(); });

/* ── Animation ─────────────────────────────────── */
const clock = new THREE.Clock();
let visible = true;
let raf = null;

const io = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible && raf === null && !reduceMotion) loop();
}, { threshold: 0 });
io.observe(hero);

const lerp = (a, b, t) => a + (b - a) * t;
let rx = 0, ry = 0;

function frame() {
  const t = clock.getElapsedTime();
  const gd = window.__gd || { heroProgress: 0, mouseX: 0, mouseY: 0 };
  const p = gd.heroProgress;

  gem.rotation.y = t * 0.28 + p * 2.4;
  gem.position.y = 0.5 + Math.sin(t * 0.8) * 0.07 - p * 1.6;
  const s = 1 - p * 0.35;
  gem.scale.setScalar(Math.max(0.2, s));

  cage.rotation.y = -t * 0.05;
  cage.rotation.x = t * 0.03;

  ry = lerp(ry, gd.mouseX * 0.22, 0.045);
  rx = lerp(rx, gd.mouseY * 0.14, 0.045);
  group.rotation.y = ry;
  group.rotation.x = rx;

  dust.rotation.y = t * 0.02;
  const posAttr = dustGeo.attributes.position;
  for (let i = 0; i < COUNT; i++) {
    posAttr.array[i * 3 + 1] += Math.sin(t * 0.6 + seed[i]) * 0.0009;
  }
  posAttr.needsUpdate = true;
  dustMat.opacity = 0.75 * (1 - p * 0.9);

  renderer.render(scene, camera);
}

function loop() {
  if (!visible || reduceMotion) { raf = null; return; }
  frame();
  raf = requestAnimationFrame(loop);
}

if (reduceMotion) {
  frame(); /* a single elegant still */
} else {
  loop();
}
