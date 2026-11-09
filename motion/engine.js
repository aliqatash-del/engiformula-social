// EngiFormula motion kit: a tiny, deterministic canvas engine for 1080x1920 reels.
// Every scene is a pure function draw(ctx, t) of time in seconds, so a frame can be
// rendered at any t (scripts/render_motion.js steps through t = frame / fps).
// Stylized flat-shaded 3D only, never photoreal; brand colours from config/brand.json.
(function () {
  const E = {};
  E.W = 1080; E.H = 1920;
  E.C = {
    paper: '#F7F5F0', grid: '#D9DEE6', navy: '#0E2A47', blue: '#1E5BD8', orange: '#F26A1B',
    yellow: '#FFC145', steel: '#8A9BB0', concrete: '#E6E8EB', green: '#187A50', red: '#C73A3A',
    line: '#CFE0FF', ink: '#0E2A47', muted: '#5B6B80',
  };
  E.PILLAR = {
    calculator: ['CALCULATOR', '#1E5BD8', '#FFFFFF'], knowledge: ['KNOW THIS', '#0E2A47', '#FFFFFF'],
    site: ['SITE REALITY', '#F26A1B', '#FFFFFF'], community: ['QUIZ', '#FFC145', '#0E2A47'],
    career: ['CAREER', '#E6E8EB', '#0E2A47'],
  };

  // ---------- time helpers ----------
  E.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  E.seg = (t, a, b) => E.clamp((t - a) / (b - a));
  E.lerp = (a, b, k) => a + (b - a) * k;
  E.ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  E.out = x => 1 - Math.pow(1 - x, 3);
  E.back = x => { if (x <= 0) return 0; const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  E.ramp = (t, a, b, f = E.ease) => f(E.seg(t, a, b));
  E.fade = (t, a, b, c, d) => Math.min(E.seg(t, a, b), 1 - E.seg(t, c, d));

  // ---------- colour ----------
  E.rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  E.shade = (hex, k, a = 1) => {
    const [r, g, b] = E.rgb(hex);
    const f = v => Math.round(E.clamp(v * k, 0, 255));
    return `rgba(${f(r)},${f(g)},${f(b)},${a})`;
  };
  E.alpha = (hex, a) => { const [r, g, b] = E.rgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ---------- backgrounds ----------
  E.bg = (ctx, style = 'blueprint') => {
    const dark = style === 'blueprint';
    ctx.fillStyle = dark ? E.C.navy : E.C.paper;
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.lineWidth = 1;
    for (let x = 0; x <= E.W; x += 40) {
      ctx.strokeStyle = dark ? (x % 200 ? 'rgba(207,224,255,0.07)' : 'rgba(207,224,255,0.14)') : (x % 200 ? 'rgba(217,222,230,0.6)' : 'rgba(217,222,230,1)');
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, E.H); ctx.stroke();
    }
    for (let y = 0; y <= E.H; y += 40) {
      ctx.strokeStyle = dark ? (y % 200 ? 'rgba(207,224,255,0.07)' : 'rgba(207,224,255,0.14)') : (y % 200 ? 'rgba(217,222,230,0.6)' : 'rgba(217,222,230,1)');
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(E.W, y + 0.5); ctx.stroke();
    }
  };

  // ---------- text ----------
  E.font = (w, size, fam) => `${w} ${size}px ${fam === 'mono' ? '"JetBrains Mono"' : fam === 'title' ? '"Space Grotesk"' : 'Inter'}, sans-serif`;
  E.text = (ctx, s, x, y, o = {}) => {
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.font = E.font(o.weight || 600, o.size || 40, o.fam);
    ctx.fillStyle = o.color || E.C.ink;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.bg) {
      const m = ctx.measureText(s), pad = o.pad ?? 14, h = (o.size || 40) * 1.3;
      const w = m.width + pad * 2;
      const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w + pad : x - pad;
      ctx.fillStyle = o.bg; E.rrect(ctx, x0, y - h * 0.78, w, h, o.radius ?? 8); ctx.fill();
      ctx.fillStyle = o.color || E.C.ink;
    }
    ctx.fillText(s, x, y);
    ctx.restore();
  };
  // typewriter: reveal k of the characters
  E.type = (s, k) => s.slice(0, Math.round(s.length * E.clamp(k)));
  E.count = (v, k, dp = 0) => (v * E.clamp(k)).toFixed(dp);
  E.rrect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  // ---------- brand chrome (safe zone: text between y=220 and y=1500) ----------
  E.chrome = (ctx, t, o) => {
    const dark = o.dark ?? true;
    const a = E.ramp(t, 0, 0.5, E.out);
    const [label, bgc, fg] = E.PILLAR[o.pillar || 'knowledge'];
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = E.font(600, 24, 'mono');
    const w = ctx.measureText(label).width + 36;
    ctx.fillStyle = dark && o.pillar === 'knowledge' ? '#FFFFFF' : bgc;
    E.rrect(ctx, 64, 236, w, 46, 8); ctx.fill();
    ctx.fillStyle = dark && o.pillar === 'knowledge' ? E.C.navy : fg;
    ctx.fillText(label, 82, 268);
    if (o.series) E.text(ctx, o.series, 64 + w + 18, 268, { fam: 'mono', size: 24, color: dark ? E.C.line : E.C.muted });
    const ty = 360 - 30 * (1 - a);
    const lines = Array.isArray(o.title) ? o.title : [o.title];
    lines.forEach((ln, i) => E.text(ctx, ln, 64, ty + i * 76, { fam: 'title', weight: 700, size: 70, color: dark ? '#FFFFFF' : E.C.ink }));
    E.text(ctx, 'engiformula.com', 64, 1490, { fam: 'mono', size: 26, color: dark ? E.C.line : E.C.muted });
    E.text(ctx, o.tag || 'MOTION KIT MOCKUP', 1016, 1490, { fam: 'mono', size: 22, color: dark ? 'rgba(207,224,255,0.6)' : E.C.muted, align: 'right' });
    ctx.restore();
  };
  // CTA card for the last beat, kept above the caption band (captions sit at y 1220-1300).
  E.ctaCard = (ctx, a, line1, line2 = 'Free calculator → link in bio') => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = E.C.blue; E.rrect(ctx, 64, 1010 + 20 * (1 - a), 952, 170, 16); ctx.fill();
    E.text(ctx, line1, 100, 1076 + 20 * (1 - a), { fam: 'title', weight: 700, size: 46, color: '#FFFFFF' });
    E.text(ctx, line2, 100, 1144 + 20 * (1 - a), { size: 38, weight: 600, color: '#FFFFFF' });
    ctx.restore();
  };
  // Burned-in caption chunk (mock of the voiceover captions), bottom edge above the 420 px UI zone.
  E.caption = (ctx, t, cues) => {
    const c = cues.find(q => t >= q[0] && t < q[1]);
    if (!c) return;
    const k = E.out(E.seg(t, c[0], c[0] + 0.15));
    ctx.save(); ctx.globalAlpha = k;
    E.text(ctx, c[2], 540, 1360 + 10 * (1 - k), { size: 50, weight: 600, color: '#FFFFFF', bg: E.C.navy, align: 'center', pad: 22, radius: 10 });
    ctx.restore();
  };

  // ---------- 2D drawing helpers ----------
  E.path = (ctx, pts, k = 1, close = false) => {
    // draw-on stroke: k = 0..1 of total length
    const P = close ? [...pts, pts[0]] : pts;
    let L = 0; const seg = [];
    for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); L += d; }
    let left = L * E.clamp(k);
    if (left <= 0) return;
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length; i++) {
      if (left >= seg[i - 1]) { ctx.lineTo(P[i][0], P[i][1]); left -= seg[i - 1]; }
      else { const f = left / seg[i - 1]; ctx.lineTo(E.lerp(P[i - 1][0], P[i][0], f), E.lerp(P[i - 1][1], P[i][1], f)); break; }
    }
    ctx.stroke();
  };
  E.arrow = (ctx, x0, y0, x1, y1, head = 18) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
    ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  };
  // Dimension line between screen points a and b, offset by off px along the normal.
  E.dim = (ctx, a, b, off, label, k, color = E.C.line) => {
    if (k <= 0) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * off, ny = dx / L * off;
    const A = [a[0] + nx, a[1] + ny], B = [b[0] + nx, b[1] + ny];
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.globalAlpha *= E.clamp(k * 2);
    ctx.setLineDash([]);
    E.path(ctx, [a, A], k); E.path(ctx, [b, B], k);
    const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    E.path(ctx, [m, A], k); E.path(ctx, [m, B], k);
    if (k > 0.6) {
      ctx.beginPath(); ctx.arc(A[0], A[1], 5, 0, 7); ctx.arc(B[0], B[1], 5, 0, 7); ctx.fill();
      const ang = Math.atan2(dy, dx), flip = Math.abs(ang) > Math.PI / 2;
      ctx.translate(m[0] + nx * 0.35, m[1] + ny * 0.35); ctx.rotate(flip ? ang + Math.PI : ang);
      ctx.globalAlpha *= E.seg(k, 0.6, 1);
      E.text(ctx, label, 0, 0, { fam: 'mono', size: 30, color, align: 'center', base: 'middle', bg: E.C.navy, pad: 8 });
    }
    ctx.restore();
  };

  // ---------- 3D: camera + painter's renderer ----------
  // World: x right, y depth (away), z up. yaw turns about z, pitch tilts down (pi/2 = plan view).
  E.camera = (o) => {
    const { yaw = 0, pitch = 0, dist = 3000, scale = 1, cx = 540, cy = 900, target = [0, 0, 0] } = o;
    const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
    return p => {
      const x = p[0] - target[0], y = p[1] - target[1], z = p[2] - target[2];
      const x1 = x * cY - y * sY, y1 = x * sY + y * cY;
      const d = y1 * cP - z * sP, v = z * cP + y1 * sP;
      const s = dist / (dist + d) * scale;
      return [cx + x1 * s, cy - v * s, d];
    };
  };
  E.LIGHT = (() => { const l = [-0.45, -0.6, 0.66]; const n = Math.hypot(...l); return l.map(v => v / n); })();
  E.scene3d = () => ({ items: [] });
  E.face = (S, P, pts, color, o = {}) => {
    const pr = pts.map(P);
    // normal from world points
    const [a, b, c] = pts; const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(...n) || 1; n = n.map(q => q / nl);
    if (o.cull !== false) {
      let area = 0; for (let i = 0; i < pr.length; i++) { const p = pr[i], q = pr[(i + 1) % pr.length]; area += p[0] * q[1] - q[0] * p[1]; }
      if (area > 0) return; // back-facing (screen y down => CCW world appears CW)
    }
    const lit = 0.62 + 0.45 * Math.max(0, n[0] * E.LIGHT[0] + n[1] * E.LIGHT[1] + n[2] * E.LIGHT[2]);
    const depth = o.depth ?? pr.reduce((s, p) => s + p[2], 0) / pr.length;
    S.items.push({ kind: 'poly', pr, fill: E.shade(color, o.flat ? 1 : lit, o.alpha ?? 1), edge: o.edge, lw: o.lw ?? 2, depth, layer: o.layer || 0 });
  };
  E.line3 = (S, P, pts, color, lw = 3, o = {}) => {
    const pr = pts.map(P);
    S.items.push({ kind: 'line', pr, color, lw, depth: o.depth ?? pr.reduce((s, p) => s + p[2], 0) / pr.length - (o.bias || 0), layer: o.layer || 0, alpha: o.alpha ?? 1, dash: o.dash });
  };
  E.text3 = (S, P, p, s, o = {}) => { const q = P(p); S.items.push({ kind: 'text', q, s, o, depth: -1e9, layer: 99 }); };
  // Box with faces ordered so normals point outward.
  E.box = (S, P, a, b, color, o = {}) => {
    const [x0, y0, z0] = a, [x1, y1, z1] = b;
    const v = (x, y, z) => [x, y, z];
    const F = [
      [v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)], // front y0
      [v(x1, y1, z0), v(x0, y1, z0), v(x0, y1, z1), v(x1, y1, z1)], // back y1
      [v(x0, y1, z0), v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1)], // left x0
      [v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), v(x1, y0, z1)], // right x1
      [v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], // top
      [v(x0, y1, z0), v(x1, y1, z0), v(x1, y0, z0), v(x0, y0, z0)], // bottom
    ];
    F.forEach(f => E.face(S, P, f, color, o));
  };
  // Prism along y (bars, pipes) with n sides.
  E.rodY = (S, P, x, z, r, y0, y1, color, n = 8, o = {}) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p0 = [x + r * Math.cos(a0), z + r * Math.sin(a0)], p1 = [x + r * Math.cos(a1), z + r * Math.sin(a1)];
      E.face(S, P, [[p0[0], y0, p0[1]], [p0[0], y1, p0[1]], [p1[0], y1, p1[1]], [p1[0], y0, p1[1]]], color, o);
    }
    const cap = y => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x + r * Math.cos(a), y, z + r * Math.sin(a)]; });
    E.face(S, P, cap(y0), color, o); E.face(S, P, cap(y1).reverse(), color, o);
  };
  // Sweep a CCW (x, z) section along y: ring(y) returns [[x, z], ...] so the section can bend or rotate.
  E.sweepY = (S, P, ring, ys, color, o = {}) => {
    const R = ys.map(y => ring(y).map(([x, z]) => [x, y, z]));
    for (let i = 0; i + 1 < R.length; i++) {
      const a = R[i], b = R[i + 1], n = a.length;
      for (let j = 0; j < n; j++) E.face(S, P, [a[j], b[j], b[(j + 1) % n], a[(j + 1) % n]], color, o);
    }
    E.face(S, P, R[0], color, o); E.face(S, P, [...R[R.length - 1]].reverse(), color, o);
  };
  E.flush = (ctx, S) => {
    S.items.sort((p, q) => (p.layer - q.layer) || (q.depth - p.depth));
    for (const it of S.items) {
      if (it.kind === 'poly') {
        ctx.beginPath(); it.pr.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.fillStyle = it.fill; ctx.fill();
        if (it.edge) { ctx.strokeStyle = it.edge; ctx.lineWidth = it.lw; ctx.lineJoin = 'round'; ctx.stroke(); }
      } else if (it.kind === 'line') {
        ctx.save(); ctx.globalAlpha *= it.alpha; ctx.strokeStyle = it.color; ctx.lineWidth = it.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (it.dash) ctx.setLineDash(it.dash);
        ctx.beginPath(); it.pr.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
      } else if (it.kind === 'text') {
        E.text(ctx, it.s, it.q[0] + (it.o.dx || 0), it.q[1] + (it.o.dy || 0), it.o);
      }
    }
    S.items = [];
  };
  // Ground grid on z = z0 (fades with alpha), for depth cues when the camera tilts.
  E.ground = (S, P, x0, x1, y0, y1, step, alpha, z0 = 0, color = '#CFE0FF') => {
    if (alpha <= 0) return;
    for (let x = x0; x <= x1 + 1e-6; x += step) E.line3(S, P, [[x, y0, z0], [x, y1, z0]], color, 1.5, { alpha, layer: -1 });
    for (let y = y0; y <= y1 + 1e-6; y += step) E.line3(S, P, [[x0, y, z0], [x1, y, z0]], color, 1.5, { alpha, layer: -1 });
  };

  // QUIZ COUNTDOWN factory: question in the title, 3 options, 5-count ring, reveal, two lines of why, CTA.
  // Beats: [0, 1.8 question+options, 6.0 countdown, 7.0 reveal, 8.6 why, 10 CTA].
  E.quiz = (cfg) => ({
    duration: 10,
    beats: [0, 1.8, 6.0, 7.0, 8.6, 10],
    draw(ctx, t) {
      const C = E.C;
      E.bg(ctx, 'paper');
      const reveal = E.seg(t, 6.0, 6.4);
      cfg.options.forEach((o, i) => {
        const a = E.ramp(t, 0.5 + i * 0.25, 0.9 + i * 0.25, E.back);
        if (a <= 0) return;
        const y = 560 + i * 140, right = i === cfg.correct;
        ctx.save(); ctx.globalAlpha = E.clamp(a); ctx.translate(0, 30 * (1 - a));
        ctx.fillStyle = reveal > 0 ? (right ? E.alpha(C.green, 0.12 + 0.88 * reveal) : E.alpha('#FFFFFF', 1 - 0.5 * reveal)) : '#FFFFFF';
        E.rrect(ctx, 64, y, 952, 112, 16); ctx.fill();
        ctx.strokeStyle = reveal > 0 && right ? C.green : C.grid; ctx.lineWidth = 3; ctx.stroke();
        E.text(ctx, String.fromCharCode(65 + i), 110, y + 72, { fam: 'mono', size: 40, color: reveal > 0 && right ? '#FFFFFF' : C.blue });
        E.text(ctx, o, 170, y + 72, { size: 40, weight: 600, color: reveal > 0 && right ? '#FFFFFF' : C.ink, alpha: reveal > 0 && !right ? 0.5 : 1 });
        ctx.restore();
      });
      const tk = E.seg(t, 1.8, 6.0);
      if (t > 1.6 && t < 6.4) {
        ctx.save(); ctx.globalAlpha = E.seg(t, 1.6, 1.8) * (1 - E.seg(t, 6.0, 6.4));
        ctx.lineWidth = 14; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.arc(540, 1080, 70, 0, 7); ctx.stroke();
        ctx.strokeStyle = C.yellow; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(540, 1080, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - tk)); ctx.stroke();
        E.text(ctx, String(Math.max(1, Math.ceil(5 * (1 - tk)))), 540, 1100, { fam: 'mono', size: 60, color: C.ink, align: 'center' });
        ctx.restore();
      }
      const w = E.ramp(t, 6.6, 7.2, E.out) * (1 - E.seg(t, 8.6, 8.9));
      if (w > 0) {
        ctx.save(); ctx.globalAlpha = w;
        E.text(ctx, cfg.why[0], 64, 1040, { fam: 'mono', size: 40, color: C.ink });
        E.text(ctx, cfg.why[1], 64, 1100, { size: 34, weight: 500, color: C.muted });
        ctx.restore();
      }
      E.ctaCard(ctx, E.ramp(t, 8.7, 9.2, E.out), cfg.cta[0], cfg.cta[1]);
      E.chrome(ctx, t, { pillar: 'community', series: 'QUIZ · 5 SECONDS', title: cfg.title, dark: false, tag: 'ENGIFORMULA' });
    },
  });

  window.E = E;
  window.SCENES = window.SCENES || {};
})();
