// Slump test, 3D stage + drafting annotations. Pure function of t (seconds).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const W = 1080, H = 1920;
const B = window.SLUMP_BEATS; // beat starts
const U = 0.25; // world units per inch (1 unit = 4 in = ~100 mm)

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2); // power2/3 inOut
const eOut = (k) => 1 - Math.pow(1 - k, 4); // power4.out
const eExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
const eIn = (k) => k * k * k;
function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function vnoise(x, y) { // value noise
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash(a * 57 + b * 131);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbm(x, y, o = 4) { let a = 0, f = 1, s = 0.5, n = 0; for (let i = 0; i < o; i++) { a += s * vnoise(x * f, y * f); n += s; f *= 2.03; s *= 0.5; } return a / n; }

// ---------- procedural textures ----------
function canvasTex(size, draw, srgb = true, rep = 1) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
function noiseFill(ctx, n, base, amp, scale, seed) {
  const img = ctx.createImageData(n, n), d = img.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = (fbm((x + seed) / scale, (y + seed * 3) / scale, 5) - 0.5) * amp;
    const g = (hash(x * 3.1 + y * 7.7 + seed) - 0.5) * amp * 0.35;
    const i = (y * n + x) * 4;
    d[i] = clamp(base[0] + v + g, 0, 255); d[i + 1] = clamp(base[1] + v + g, 0, 255); d[i + 2] = clamp(base[2] + v + g, 0, 255); d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
// fresh concrete: wet grey paste + visible coarse aggregate
const freshTex = canvasTex(512, (ctx, n) => {
  noiseFill(ctx, n, [118, 114, 107], 46, 40, 11);
  const r = rng(7);
  for (let i = 0; i < 520; i++) {
    const x = r() * n, y = r() * n, s = 2 + r() * 7, tone = 120 + r() * 70;
    ctx.fillStyle = `rgba(${tone},${tone * 0.93},${tone * 0.84},${0.35 + r() * 0.4})`;
    ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, 7); ctx.fill();
  }
});
const freshBump = canvasTex(512, (ctx, n) => noiseFill(ctx, n, [128, 128, 128], 160, 18, 5), false);
// section cut: tighter, shows aggregate clearly
const cutTex = canvasTex(512, (ctx, n) => {
  noiseFill(ctx, n, [128, 124, 116], 30, 30, 21);
  const r = rng(99);
  for (let i = 0; i < 900; i++) {
    const x = r() * n, y = r() * n, s = 3 + r() * 11, tone = 135 + r() * 80;
    ctx.fillStyle = `rgb(${tone},${tone * 0.9},${tone * 0.8})`;
    ctx.beginPath();
    const k = 5 + Math.floor(r() * 3), rot = r() * 6;
    for (let j = 0; j < k; j++) { const a = rot + (j / k) * Math.PI * 2, rr = s * (0.7 + r() * 0.5); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(60,58,54,0.35)"; ctx.lineWidth = 1; ctx.stroke();
  }
});
// broom-finished slab
const slabTex = canvasTex(1024, (ctx, n) => {
  noiseFill(ctx, n, [196, 191, 182], 26, 90, 3);
  const r = rng(3);
  for (let i = 0; i < 1400; i++) {
    const y = r() * n, x = r() * n, l = 40 + r() * 160;
    ctx.strokeStyle = `rgba(${r() < 0.5 ? "90,86,80" : "235,232,226"},${0.05 + r() * 0.08})`; ctx.lineWidth = 1 + r() * 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (r() - 0.5) * 4); ctx.stroke();
  }
  // saw-cut joint
  ctx.fillStyle = "rgba(70,66,60,0.55)"; ctx.fillRect(0, n * 0.5 - 2, n, 4);
}, true, 1);
const slabBump = canvasTex(1024, (ctx, n) => {
  noiseFill(ctx, n, [128, 128, 128], 60, 6, 9);
  ctx.fillStyle = "rgb(40,40,40)"; ctx.fillRect(0, n * 0.5 - 2, n, 4);
}, false, 1);
// galvanised spangle + brushed steel
const spangleTex = canvasTex(512, (ctx, n) => {
  noiseFill(ctx, n, [196, 200, 204], 18, 60, 41);
  const r = rng(12);
  for (let i = 0; i < 260; i++) {
    const x = r() * n, y = r() * n, s = 10 + r() * 26, tone = 180 + r() * 50;
    ctx.fillStyle = `rgba(${tone},${tone + 4},${tone + 8},0.35)`;
    ctx.beginPath(); const k = 6; for (let j = 0; j < k; j++) { const a = (j / k) * 6.283 + r(); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } ctx.fill();
  }
});
const brushedTex = canvasTex(512, (ctx, n) => {
  ctx.fillStyle = "#a9adb2"; ctx.fillRect(0, 0, n, n);
  const r = rng(5);
  for (let i = 0; i < 2200; i++) { const y = r() * n; ctx.strokeStyle = `rgba(${r() < 0.5 ? "255,255,255" : "40,44,50"},${0.05 + r() * 0.07})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(n, y + r() * 2); ctx.stroke(); }
});

// ---------- renderer / scene ----------
const host = document.getElementById("stage3d");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.domElement.style.cssText = "position:absolute;inset:0;width:1080px;height:1920px";
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color("#EFEBE4");
scene.background = SKY; scene.fog = new THREE.Fog(SKY, 30, 70);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);

const key = new THREE.DirectionalLight("#FFF1DE", 2.6);
key.position.set(-6, 11, 7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
scene.add(key);
const rim = new THREE.DirectionalLight("#DCE8FF", 1.1); rim.position.set(5, 5, -8); scene.add(rim);
scene.add(new THREE.HemisphereLight("#FFFFFF", "#B9B2A6", 0.55));

// ground slab
const slabMat = new THREE.MeshStandardMaterial({ map: slabTex, bumpMap: slabBump, bumpScale: 0.6, roughness: 0.92, metalness: 0 });
slabTex.repeat.set(4, 4); slabBump.repeat.set(4, 4);
const slab = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), slabMat);
slab.rotation.x = -Math.PI / 2; slab.position.y = -0.06; slab.receiveShadow = true; scene.add(slab);

// base plate (non-absorbent steel), 18 x 18 in
const plateMat = new THREE.MeshStandardMaterial({ map: brushedTex, color: "#ffffff", metalness: 0.85, roughness: 0.42 });
const plate = new THREE.Mesh(new THREE.BoxGeometry(18 * U, 0.06, 18 * U), plateMat);
plate.position.y = -0.03; plate.castShadow = false; plate.receiveShadow = true; scene.add(plate);
// wet patch on plate
const wetMat = new THREE.MeshStandardMaterial({ color: "#5d6166", metalness: 0.9, roughness: 0.12, transparent: true, opacity: 0 });
const wet = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), wetMat);
wet.rotation.x = -Math.PI / 2; wet.position.y = 0.002; wet.receiveShadow = true; scene.add(wet);

// ---------- slump cone (ASTM C143: 8 in base, 4 in top, 12 in high) ----------
const RB = 4 * U, RT = 2 * U, HC = 12 * U; // 1.0, 0.5, 3.0
const coneMat = new THREE.MeshStandardMaterial({ map: spangleTex, color: "#ffffff", metalness: 0.92, roughness: 0.38, side: THREE.DoubleSide, envMapIntensity: 1.0 });
const coneInMat = new THREE.MeshStandardMaterial({ color: "#c3c8ce", metalness: 0.8, roughness: 0.5, side: THREE.BackSide });
const cone = new THREE.Group(); scene.add(cone);
const coneBody = new THREE.Group(); cone.add(coneBody);
let coneShell = null, coneShellIn = null;
function buildConeShell(open) {
  const w = open * Math.PI / 2; // removed half-angle around +z
  if (coneShell) { coneBody.remove(coneShell); coneShell.geometry.dispose(); coneBody.remove(coneShellIn); coneShellIn.geometry.dispose(); }
  const pts = [new THREE.Vector2(RB, 0), new THREE.Vector2(RT, HC)];
  const g = new THREE.LatheGeometry(pts, 96, w, Math.PI * 2 - 2 * w);
  coneShell = new THREE.Mesh(g, coneMat); coneShell.castShadow = true; coneShell.receiveShadow = true;
  const pi = [new THREE.Vector2(RB - 0.012, 0), new THREE.Vector2(RT - 0.012, HC)];
  coneShellIn = new THREE.Mesh(new THREE.LatheGeometry(pi, 96, w, Math.PI * 2 - 2 * w), coneInMat);
  coneBody.add(coneShell, coneShellIn);
}
// rolled rims, foot pieces, handles
const rimMat = coneMat;
const rimTop = new THREE.Mesh(new THREE.TorusGeometry(RT, 0.03, 12, 96), rimMat); rimTop.rotation.x = Math.PI / 2; rimTop.position.y = HC; rimTop.castShadow = true;
const rimBot = new THREE.Mesh(new THREE.TorusGeometry(RB, 0.035, 12, 96), rimMat); rimBot.rotation.x = Math.PI / 2; rimBot.position.y = 0.035; rimBot.castShadow = true;
cone.add(rimTop, rimBot);
const feet = [];
for (const s of [-1, 1]) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.42), coneMat);
  f.position.set(s * (RB + 0.28), 0.025, 0); f.castShadow = true; cone.add(f); feet.push(f);
  const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 32, Math.PI), coneMat);
  const yh = HC * 0.66, rh = lerp(RB, RT, 0.66);
  hnd.position.set(s * (rh + 0.02), yh, 0); hnd.rotation.set(0, s > 0 ? 0 : Math.PI, -Math.PI / 2 * s);
  hnd.rotation.set(Math.PI / 2, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  hnd.castShadow = true; cone.add(hnd);
}

// ---------- concrete ----------
const concMat = new THREE.MeshStandardMaterial({ map: freshTex, bumpMap: freshBump, bumpScale: 1.2, roughness: 0.48, metalness: 0.0, color: "#ffffff" });
freshTex.repeat.set(2, 2); freshBump.repeat.set(2, 2);
const concrete = new THREE.Mesh(new THREE.BufferGeometry(), concMat); concrete.castShadow = true; concrete.receiveShadow = true; scene.add(concrete);
const cutMat = new THREE.MeshStandardMaterial({ map: cutTex, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
const section = new THREE.Group(); scene.add(section);

// slumped profile: flat top at Hs, base radius chosen so volume matches the frustum
const VOL = Math.PI * HC / 3 * (RB * RB + RB * RT + RT * RT);
const HS = HC - 4 * U; // 4 in slump
function slumpR(y, Rb) { const s = y / HS; return 0.58 + (Rb - 0.58) * Math.pow(1 - s, 1.7) - 0.08 * Math.pow(s, 6); }
function vol(fn, h) { let v = 0; const n = 200; for (let i = 0; i < n; i++) { const r = fn((i + 0.5) / n * h); v += Math.PI * r * r * h / n; } return v; }
let lo = 1, hi = 3; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (vol((y) => slumpR(y, m), HS) < VOL) lo = m; else hi = m; }
const RBS = (lo + hi) / 2;
const frR = (y) => lerp(RB, RT, y / HC);

// concrete geometry from: fill height h (cone shape), slump progress p, open wedge w
function concreteGeo(h, p, open, rough = 1) {
  const NY = 40, NP = 128, w = open * Math.PI / 2, phi0 = w, phiL = Math.PI * 2 - 2 * w;
  const Ht = lerp(h, HS, p);
  const pos = [], uv = [], idx = [];
  const prof = (s) => { // s in [0,1] along height -> [r, y]
    const y = s * Ht;
    const r0 = frR(s * h), r1 = slumpR(s * HS, RBS);
    return [lerp(r0, r1, p), y];
  };
  // side + top cap rings: rows 0..NY side, then rings to the centre
  const rows = [];
  for (let j = 0; j <= NY; j++) rows.push([...prof(j / NY), 0]);
  const CAP = 10;
  for (let j = 1; j <= CAP; j++) { const [r, y] = prof(1); const k = j / CAP; rows.push([r * (1 - k), y + (p * 0.06) * Math.sin(k * Math.PI / 2) * (1 - k * 0.2), 1]); }
  for (let j = 0; j < rows.length; j++) {
    const [r, y, cap] = rows[j];
    for (let i = 0; i <= NP; i++) {
      const a = phi0 + phiL * (i / NP);
      const n = rough * (fbm(Math.cos(a) * 1.6 + 10 + y * 1.3, Math.sin(a) * 1.6 + y * 1.9, 3) - 0.5) * (0.035 + 0.06 * p) * (r > 0.05 ? 1 : 0);
      const rr = Math.max(0, r + n);
      const yy = y + (cap ? rough * (fbm(rr * Math.cos(a) * 3, rr * Math.sin(a) * 3, 3) - 0.5) * 0.05 * (1 - (j - NY) / CAP * 0.5) : 0);
      pos.push(rr * Math.sin(a), yy, rr * Math.cos(a));
      uv.push(i / NP * 3, cap ? 1 + rr : y / 1.5);
    }
  }
  const cols = NP + 1;
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < NP; i++) {
    const a = j * cols + i, b = a + cols;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// section face (z=0 plane, facing +z) with three layer tones
const L1 = 2.606 * U, L2 = 6.074 * U; // equal-volume layer tops (in)
function sectionFaces(h) {
  section.clear();
  const bands = [[0, Math.min(h, L1), 1.0], [L1, Math.min(h, L2), 0.93], [L2, Math.min(h, HC), 1.05]];
  for (const [y0, y1, tone] of bands) {
    if (y1 <= y0 + 0.001) continue;
    const sh = new THREE.Shape();
    sh.moveTo(-frR(y0) + 0.01, y0); sh.lineTo(frR(y0) - 0.01, y0); sh.lineTo(frR(y1) - 0.01, y1); sh.lineTo(-frR(y1) + 0.01, y1); sh.closePath();
    const g = new THREE.ShapeGeometry(sh);
    const p = g.attributes.position; const uv = [];
    for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / 1.4 + 0.5, p.getY(i) / 1.4);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const m = cutMat.clone(); m.color = new THREE.Color(tone, tone, tone * 0.98);
    const mesh = new THREE.Mesh(g, m); mesh.position.z = 0.0; mesh.receiveShadow = true; section.add(mesh);
    if (y1 < h - 0.001) { // layer joint line
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(frR(y1) * 2 - 0.02, 0.012), new THREE.MeshBasicMaterial({ color: "#4a4741" }));
      ln.position.set(0, y1, 0.002); section.add(ln);
    }
  }
}

// tamping rod: 5/8 in dia, 24 in long, hemispherical tip
const rodMat = new THREE.MeshStandardMaterial({ color: "#9aa0a7", metalness: 0.95, roughness: 0.32 });
const rod = new THREE.Group();
const rr = (5 / 16) * U, rl = 24 * U;
const rodC = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, rl, 24), rodMat); rodC.position.y = rl / 2 + rr; rodC.castShadow = true;
const rodT = new THREE.Mesh(new THREE.SphereGeometry(rr, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), rodMat); rodT.position.y = rr; rodT.castShadow = true;
const rodT2 = rodT.clone(); rodT2.rotation.x = Math.PI; rodT2.position.y = rl + rr;
rod.add(rodC, rodT, rodT2); scene.add(rod);

// ---------- 2D drafting overlay ----------
const ov = document.getElementById("draft");
ov.width = W; ov.height = H; const g2 = ov.getContext("2d");
const INK = "#14181E", ACC = "#F26A1B", PAPER = "#F7F4EE";
const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
function label(txt, x, y, col = INK, size = 40, bg = PAPER, sub) {
  g2.font = `700 ${size}px "Barlow Condensed"`;
  const w = g2.measureText(txt).width; let w2 = 0;
  if (sub) { g2.font = `600 ${size * 0.62}px "Barlow"`; w2 = g2.measureText(sub).width + 12; }
  const pw = w + w2 + 28, ph = size + 14;
  g2.fillStyle = bg; g2.fillRect(x - pw / 2, y - ph / 2, pw, ph);
  g2.fillStyle = col; g2.textBaseline = "middle"; g2.textAlign = "left";
  g2.font = `700 ${size}px "Barlow Condensed"`; g2.fillText(txt, x - pw / 2 + 14, y + 2);
  if (sub) { g2.font = `600 ${size * 0.62}px "Barlow"`; g2.fillStyle = "#5B6068"; g2.fillText(sub, x - pw / 2 + 14 + w + 12, y + 3); }
}
function arrow(x, y, ang, col) {
  const L = 22, Wd = 7; g2.fillStyle = col; g2.beginPath();
  g2.moveTo(x, y); g2.lineTo(x - Math.cos(ang) * L - Math.sin(ang) * Wd, y - Math.sin(ang) * L + Math.cos(ang) * Wd);
  g2.lineTo(x - Math.cos(ang) * L + Math.sin(ang) * Wd, y - Math.sin(ang) * L - Math.cos(ang) * Wd); g2.closePath(); g2.fill();
}
// dimension: a,b screen points of the feature; off = screen offset vector of the dim line
function dim(a, b, off, k, txt, col = INK, sub, ext = true) {
  if (k <= 0) return;
  const A = [a[0] + off[0], a[1] + off[1]], Bp = [b[0] + off[0], b[1] + off[1]];
  g2.strokeStyle = col; g2.lineWidth = 2.5; g2.globalAlpha = 1;
  if (ext) { // extension lines with 8 px gap
    const ol = Math.hypot(off[0], off[1]) || 1, ux = off[0] / ol, uy = off[1] / ol;
    const ke = clamp(k * 3);
    for (const [p, q] of [[a, A], [b, Bp]]) { g2.beginPath(); g2.moveTo(p[0] + ux * 10, p[1] + uy * 10); g2.lineTo(lerp(p[0] + ux * 10, q[0] + ux * 14, ke), lerp(p[1] + uy * 10, q[1] + uy * 14, ke)); g2.stroke(); }
  }
  const kd = clamp((k - 0.2) / 0.5); if (kd <= 0) return;
  const mx = (A[0] + Bp[0]) / 2, my = (A[1] + Bp[1]) / 2;
  const e = eOut(kd);
  const P = [lerp(mx, A[0], e), lerp(my, A[1], e)], Q = [lerp(mx, Bp[0], e), lerp(my, Bp[1], e)];
  g2.lineWidth = col === INK ? 2.5 : 4; g2.beginPath(); g2.moveTo(P[0], P[1]); g2.lineTo(Q[0], Q[1]); g2.stroke();
  const ang = Math.atan2(Q[1] - P[1], Q[0] - P[0]);
  if (kd > 0.6) { arrow(Q[0], Q[1], ang, col); arrow(P[0], P[1], ang + Math.PI, col); }
  const kl = clamp((k - 0.55) / 0.3);
  if (kl > 0) { g2.globalAlpha = kl; label(txt, mx, my, col, col === INK ? 44 : 64, PAPER, sub); g2.globalAlpha = 1; }
}
function leader(p, to, k, txt, col = INK, sub) {
  if (k <= 0) return;
  const e = eOut(clamp(k / 0.5));
  g2.strokeStyle = col; g2.lineWidth = 2.5;
  g2.fillStyle = col; g2.beginPath(); g2.arc(p[0], p[1], 6, 0, 7); g2.fill();
  g2.beginPath(); g2.moveTo(p[0], p[1]); g2.lineTo(lerp(p[0], to[0], e), lerp(p[1], to[1], e)); g2.stroke();
  const kl = clamp((k - 0.45) / 0.3);
  if (kl > 0) { g2.globalAlpha = kl; g2.font = `700 44px "Barlow Condensed"`; const right = to[0] >= p[0];
    g2.textAlign = right ? "left" : "right"; g2.textBaseline = "middle"; g2.fillStyle = col; g2.fillText(txt, to[0] + (right ? 12 : -12), to[1]);
    if (sub) { const w = g2.measureText(txt).width; g2.font = `600 28px "Barlow"`; g2.fillStyle = "#5B6068"; g2.fillText(sub, to[0] + (right ? 22 + w : -22 - w), to[1] + 2); }
    g2.globalAlpha = 1; }
}
function counter(n, k, x, y, cap, sub) {
  if (k <= 0) return; g2.globalAlpha = clamp(k * 3);
  g2.textAlign = "left"; g2.textBaseline = "alphabetic";
  g2.font = `800 210px "Barlow Condensed"`; g2.fillStyle = INK; g2.fillText(String(n), x, y);
  g2.font = `700 40px "Barlow Condensed"`; g2.fillStyle = ACC; g2.fillText(cap, x, y + 50);
  if (sub) { g2.font = `600 28px "Barlow"`; g2.fillStyle = "#5B6068"; g2.fillText(sub, x, y + 88); }
  g2.globalAlpha = 1; g2.textAlign = "left";
}
// tolerance scale (ASTM C94, specified 4 in -> +/- 1 in)
function scale(k, mark, markCol, verdict, vk) {
  if (k <= 0) return;
  const x0 = 150, x1 = 930, y = 1062, v2x = (v) => lerp(x0, x1, v / 8);
  const e = eOut(clamp(k / 0.6));
  g2.strokeStyle = INK; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(x0, y); g2.lineTo(lerp(x0, x1, e), y); g2.stroke();
  g2.font = `600 30px "Barlow"`; g2.fillStyle = INK; g2.textAlign = "center";
  for (let v = 0; v <= 8; v++) { if (v2x(v) > lerp(x0, x1, e) + 1) break; g2.beginPath(); g2.moveTo(v2x(v), y - 14); g2.lineTo(v2x(v), y + 14); g2.stroke(); g2.fillText(v + (v === 8 ? " in" : ""), v2x(v), y + 46); }
  const kb = clamp((k - 0.35) / 0.3);
  if (kb > 0) { g2.fillStyle = `rgba(20,24,30,${0.12 * kb})`; g2.fillRect(v2x(3), y - 26, (v2x(5) - v2x(3)) * eOut(kb), 52); }
  if (mark != null) {
    const x = v2x(mark); g2.fillStyle = markCol; g2.beginPath(); g2.moveTo(x, y - 6); g2.lineTo(x - 18, y - 40); g2.lineTo(x + 18, y - 40); g2.closePath(); g2.fill();
    g2.fillRect(x - 3, y - 6, 6, 30);
    if (verdict && vk > 0) { const ga = g2.globalAlpha; g2.globalAlpha = ga * clamp(vk * 3); g2.fillStyle = markCol; g2.textAlign = "center"; if (verdict.length > 6) { g2.font = `800 96px "Barlow Condensed"`; g2.fillText("SEND IT", 800, 790); g2.fillText("BACK?", 800, 880); } else { g2.font = `800 130px "Barlow Condensed"`; g2.fillText(verdict, 800, 860); } g2.globalAlpha = ga; }
  }
  g2.textAlign = "left";
}

// ---------- the film ----------
const camKeys = (t) => {
  // [pos, target, fov]
  const hero = [[5.2, 4.4, 11.5], [0.9, 2.2, 0], 30];
  const setup = [[4.6, 5.6, 10.2], [0, 2.6, 0], 28];
  const setup2 = [[-3.6, 3.9, 10.6], [0, 1.6, 0], 27];
  const cut = [[0.6, 2.2, 10.8], [0, 1.45, 0], 26];
  const cut2 = [[1.6, 3.0, 9.6], [0, 1.6, 0], 25];
  const lift = [[4.4, 4.8, 13.0], [-0.5, 4.0, 0], 32];
  const side = [[1.1, 2.3, 12.4], [1.0, 1.85, 0], 26];
  const pay = [[1.6, 2.6, 13.0], [1.0, 1.85, 0], 26];
  const end = [[-4.6, 4.0, 11.4], [0.8, 2.0, 0], 29];
  const K = [
    [0, hero], [B[1] - 0.01, [[4.4, 4.0, 10.2], [0.9, 2.2, 0], 30]],
    [B[1], setup], [B[1] + 2.2, [[1.4, 5.2, 10.6], [0, 2.6, 0], 28]], [B[2] - 0.3, setup2],
    [B[2] + 0.2, cut], [B[3] - 0.1, cut2],
    [B[4] - 0.05, lift], [B[5] + 0.6, [[3.4, 4.6, 13.0], [0.2, 3.9, 0], 31]],
    [B[5] + 1.6, side], [B[6] - 0.2, side],
    [B[6] + 0.8, pay], [B[7] - 0.3, pay], [B[7] + 0.3, [[-1.2, 3.6, 12.2], [0.8, 2.0, 0], 29]], [B[8] + 2, end],
  ];
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const [ta, A] = K[i], [tb, Bk] = K[i + 1];
  const hard = tb - ta < 0.05; // hard cut
  const k = hard ? 0 : eIO(seg(t, ta, tb));
  const tg = A[1].map((v, j) => lerp(v, Bk[1][j], k));
  const ps = A[0].map((v, j) => lerp(v, Bk[0][j], k));
  const F = 1.9; return [ps.map((v, j) => tg[j] + (v - tg[j]) * F), tg, lerp(A[2], Bk[2], k)];
};

let lastOpen = -1;
function renderAt(t) {
  // camera
  const [cp, ct, fov] = camKeys(t);
  camera.position.set(...cp); camera.fov = fov; camera.setViewOffset(W, H, 0, 50, W, H); camera.updateProjectionMatrix(); camera.lookAt(...ct);

  // --- state ---
  // fill height, slump progress, cone transform, cutaway
  let fill = 0, p = 0, coneY = 0, coneX = 0, coneFlip = 0, coneVis = 1, open = 0, rodState = null, wetK = 0;
  const T1 = B[1], T2 = B[2], T3 = B[3], T4 = B[4], T5 = B[5];
  const LIFT0 = T4 + 0.25, LIFT1 = LIFT0 + 4.6; // timed lift, 4.6 s (5 +/- 2 s)
  const FLIP0 = LIFT1 + 0.05, FLIP1 = FLIP0 + 0.85;
  const ROD0 = FLIP1 + 0.1, ROD1 = ROD0 + 0.7;
  const endState = () => { fill = HC; p = 1; coneY = HC + 0.45; coneFlip = 1; rodState = "across"; wetK = 1; };
  if (t < T1) { endState(); }
  else if (t < T2) { // setup: cone drops in, things get wet
    const kd = seg(t, T1 + 0.05, T1 + 0.65); coneY = lerp(2.2, 0, eOut(kd)) + (kd >= 1 ? 0 : 0); wetK = eIO(seg(t, T1 + 0.9, T1 + 2.0));
  } else if (t < LIFT0) {
    wetK = 1;
    open = t < T3 ? eIO(seg(t, T2, T2 + 0.55)) : 1 - eIO(seg(t, T3 + 0.3, T3 + 1.1));
    // fill schedule
    const f1 = [T2 + 0.4, T2 + 0.9], r1 = [T2 + 0.95, T2 + 1.9], f2 = [T2 + 1.95, T2 + 2.35], r2 = [T2 + 2.4, T2 + 3.3], f3 = [T2 + 3.35, T2 + 3.75], r3 = [T2 + 3.8, T2 + 4.6];
    fill = t < f1[1] ? lerp(0, L1, eOut(seg(t, ...f1))) : t < f2[0] ? L1 : t < f2[1] ? lerp(L1, L2, eOut(seg(t, ...f2))) : t < f3[0] ? L2 : lerp(L2, HC, eOut(seg(t, ...f3)));
    const stroke = (iv, bot, top) => { if (t < iv[0] || t > iv[1]) return null; const k = seg(t, ...iv); const n = 6; const ph = (k * n) % 1; const i = Math.floor(k * n);
      const a = i * 2.4 + 0.6, rad = Math.min((i % 3) * 0.22 + 0.15, frR(top) - 0.12); const depth = ph < 0.45 ? eIn(ph / 0.45) : 1 - eOut((ph - 0.45) / 0.55);
      return { x: (i % 2 ? 1 : -1) * rad * (0.4 + 0.6 * Math.abs(Math.sin(a))), z: 0.03, y: lerp(top + 1.6, bot, depth), count: Math.min(25, Math.round(k * 25 + 0.49)) }; };
    rodState = stroke(r1, 0.0, L1) || stroke(r2, L1 - 0.25, L2) || stroke(r3, L2 - 0.25, HC);
    window.__layer = t < r1[1] + 0.3 ? 1 : t < r2[1] + 0.3 ? 2 : 3;
    window.__strokes = rodState ? rodState.count : (t > r1[1] && t < f2[0]) || (t > r2[1] && t < f3[0]) || t > r3[1] ? 25 : 0;
  } else if (t < FLIP0) { // lift
    wetK = 1; fill = HC; const k = eIO(seg(t, LIFT0, LIFT1)); coneY = k * (HC + 0.45);
    p = eOut(seg(t, LIFT0 + 0.9, LIFT1 + 0.8)) ; p = Math.min(p, clamp((coneY) / HC * 1.15));
  } else { // flip, rod across, measure, payoff, cta
    wetK = 1; fill = HC; p = Math.min(1, eOut(seg(t, LIFT0 + 0.9, LIFT1 + 0.8)));
    const kf = eIO(seg(t, FLIP0, FLIP1));
    coneFlip = kf; coneY = HC + 0.45;
    if (t > ROD0) rodState = t < ROD1 ? { lay: eOut(seg(t, ROD0, ROD1)) } : "across";
  }

  // --- apply ---
  wetMat.opacity = 0.55 * wetK; coneMat.roughness = lerp(0.38, 0.22, wetK);
  const openQ = Math.round(open * 40) / 40;
  if (openQ !== lastOpen) { buildConeShell(openQ); lastOpen = openQ; }
  cone.visible = coneVis > 0;
  { // flip about the cone's mid-height along an arc; th = -pi*coneFlip
    const th = -Math.PI * coneFlip, k = coneFlip;
    const mx = lerp(0, 2.45, k), my = lerp(coneY + HC / 2, HC / 2, k) + Math.sin(k * Math.PI) * 0.3;
    const rx = -(HC / 2) * Math.sin(th), ry = (HC / 2) * Math.cos(th);
    cone.rotation.set(0, 0, th); cone.position.set(mx - rx, my - ry, 0);
  }
  rimTop.visible = rimBot.visible = true; feet.forEach((f) => (f.visible = true));

  if (fill > 0.001) {
    concrete.visible = true;
    concrete.geometry.dispose(); concrete.geometry = concreteGeo(fill, p, open > 0.98 ? 1 : 0);
  } else concrete.visible = false;
  section.visible = open > 0.98 && fill > 0.001;
  if (section.visible) sectionFaces(fill);

  // rod
  rod.visible = !!rodState;
  if (rodState === "across" || (rodState && rodState.lay != null)) {
    const k = rodState === "across" ? 1 : rodState.lay;
    rod.rotation.set(0, 0, Math.PI / 2 * k);
    // lies across the inverted cone's base (now on top at y = HC), reaching over the specimen
    const yTop = HC + rr; rod.position.set(lerp(1.0, 3.35, k), lerp(HC + 1.2, yTop, k), 0.0);
  } else if (rodState) { rod.rotation.set(0, 0, 0); rod.position.set(rodState.x, rodState.y, rodState.z); }

  renderer.render(scene, camera);

  // --- drafting overlay ---
  g2.clearRect(0, 0, W, H);
  // setup dims
  if (t >= T1 && t < T2 + 0.3) {
    const k1 = seg(t, T1 + 1.0, T1 + 2.1), k2 = seg(t, T1 + 1.6, T1 + 2.7), k3 = seg(t, T1 + 2.2, T1 + 3.3);
    const out = clamp(1 - seg(t, T2 - 0.15, T2 + 0.15));
    g2.globalAlpha = out;
    const a = proj(RB + 0.0, 0, 0.0), b = proj(RT, HC, 0);
    dim(proj(-RB, 0, 0), proj(-RB, HC, 0), [-140, 0], k1, "12 in", INK, "300 mm");
    dim(proj(-RT, HC, 0), proj(RT, HC, 0), [0, -90], k2, "4 in", INK, "100 mm");
    dim(proj(-RB, 0, 0), proj(RB, 0, 0), [0, 120], k3, "8 in", INK, "200 mm");
    const kf = seg(t, T1 + 2.9, T1 + 3.6);
    if (kf > 0) { const fp = proj(RB + 0.28, 0.05, 0); leader(fp, [fp[0] + 30, fp[1] + 130], kf, "Foot pieces", ACC); }
    g2.globalAlpha = 1;
  }
  // fill: layer lines + counter
  if (t >= T2 + 0.6 && t < T3) {
    const kL1 = seg(t, T2 + 0.95, T2 + 1.5), kL2 = seg(t, T2 + 2.4, T2 + 2.95);
    const x = frR(L1) + 0.02;
    leader(proj(frR(L1) - 0.05, L1, 0), [Math.min(proj(RB + 0.6, L1, 0)[0], 790), proj(0, L1, 0)[1]], kL1, "2⅝ in", INK);
    leader(proj(frR(L2) - 0.05, L2, 0), [Math.min(proj(RB + 0.6, L2, 0)[0], 790), proj(0, L2, 0)[1]], kL2, "6⅛ in", INK);
    counter(window.__strokes || 0, seg(t, T2 + 0.9, T2 + 1.1), 124, 1010, "STROKES", `LAYER ${window.__layer || 1} OF 3`);
  }
  // lift timer
  if (t >= LIFT0 - 0.2 && t < FLIP1 + 0.4) {
    const el = clamp(t - LIFT0, 0, 4.6);
    const k = clamp(seg(t, LIFT0 - 0.2, LIFT0 + 0.1)) * (1 - seg(t, LIFT1 + 0.1, LIFT1 + 0.4));
    g2.globalAlpha = k;
    g2.textAlign = "left"; g2.font = `800 170px "Barlow Condensed"`; g2.fillStyle = INK;
    g2.fillText(el.toFixed(1), 124, 1010); const tw = g2.measureText(el.toFixed(1)).width;
    g2.font = `700 64px "Barlow Condensed"`; g2.fillText("s", 134 + tw, 1010);
    g2.font = `700 40px "Barlow Condensed"`; g2.fillStyle = ACC; g2.fillText("TARGET 5 ± 2 s", 126, 1062);
    g2.globalAlpha = 1; g2.textAlign = "left";
  }
  // measure
  if (t >= ROD1 - 0.1 && t < T6()) {
    const k = seg(t, ROD1, ROD1 + 1.2);
    const out = 1 - seg(t, B[6] - 0.2, B[6] + 0.2);
    g2.globalAlpha = out;
    // dimension from rod underside down to the displaced original centre of the top
    const top = HS + 0.03 * 0;
    const a = proj(0, HC, 0), b = proj(0, top, 0);
    dim(a, b, [0, 0], k, "4 in", ACC, "100 mm", false);
    // emphasise rod and cone base levels
    const kk = seg(t, ROD1 - 0.1, ROD1 + 0.4);
    if (kk > 0) { g2.setLineDash([10, 8]); g2.strokeStyle = INK; g2.lineWidth = 2; const l0 = proj(-1.2, HC, 0), l1 = proj(1.7, HC, 0); g2.beginPath(); g2.moveTo(l0[0], l0[1]); g2.lineTo(lerp(l0[0], l1[0], kk), l1[1]); g2.stroke(); g2.setLineDash([]); }
    const kc = seg(t, ROD1 + 0.6, ROD1 + 1.3);
    g2.globalAlpha = 1;
  }
  // payoff: drafting-pad panel with tolerance scale
  if (t >= B[6] + 0.05 && t < B[7] + 0.4) {
    const kin = eIO(seg(t, B[6] + 0.05, B[6] + 0.45)), kout = eIn(seg(t, B[7] - 0.3, B[7] + 0.1));
    const top = lerp(H, 0, kin) + kout * H;
    g2.fillStyle = "#F4F1EB"; g2.fillRect(0, top, W, H);
    g2.save(); g2.beginPath(); g2.rect(0, top, W, H); g2.clip();
    g2.strokeStyle = "rgba(20,24,30,0.06)"; g2.lineWidth = 1;
    for (let x = 0; x <= W; x += 45) { g2.beginPath(); g2.moveTo(x, top); g2.lineTo(x, H); g2.stroke(); }
    for (let y = 0; y <= H; y += 45) { if (y < top) continue; g2.beginPath(); g2.moveTo(0, y); g2.lineTo(W, y); g2.stroke(); }
    const k = seg(t, B[6] + 1.4, B[6] + 2.6);
    const tSeven = B[6] + 5.25;
    const m = t < tSeven ? 4 : lerp(4, 7, eOut(seg(t, tSeven, tSeven + 0.5)));
    const fail = t >= tSeven + 0.3;
    scale(k, k > 0.5 ? m : null, fail ? "#D7261E" : ACC, fail ? "SEND IT BACK?" : "PASS", fail ? seg(t, tSeven + 0.3, tSeven + 0.6) : seg(t, B[6] + 2.4, B[6] + 2.8));
    g2.restore();
  }
}
function T6() { return B[6] + 0.2; }

window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.stage = (async () => {
  await document.fonts.load('700 40px "Barlow Condensed"'); await document.fonts.load('800 40px "Barlow Condensed"'); await document.fonts.load('600 20px "Barlow"');
  renderAt(0);
  await renderer.compileAsync(scene, camera);
})();
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__renderStage = renderAt;
renderAt(0);
