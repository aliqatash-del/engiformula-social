// BEAM DEPTH v2 (upgrade sample, remake of beam-3) · 6 m span, numbers recomputed in Python:
// hook beam 150 mm deep; 150 → 375 mm is (375/150)^3 = 15.6× stiffer (I = b h^3 / 12).
// ACI 318-19 Table 9.3.1.1 (fy 60 ksi, normal weight): L/16 = 375 mm (14.8 in), L/18.5 = 324, L/21 = 286, cantilever L/8 = 750 (2× L/16).
// EN 1992-1-1:2004 Table 7.4N (K = 1.0): L/d 20 (ρ 0.5%) → d = 300 mm, L/d 14 (ρ 1.5%) → d = 429 mm.
// Beats (9): hook | depth³ | ACI L/16 | re-hook | 4 supports | EC2 re-hook | L/d 20→14 | payoff | save + loop.
// Real-time scene: window.BEATS (seconds per beat, from the voiceover) and window.WORDS (word timings) drive it.
(() => {
  const D0 = [2.925, 3.865, 5.649, 2.979, 6.806, 3.745, 6.169, 4.846, 4.309];
  const SC = {
    get beats() { return E.beats(window.BEATS || D0); },
    get duration() { const b = this.beats; return b[b.length - 1]; },
  };
  const HEAD = ['6 m beam. ==Too thin.==', 'Stiffness grows with ==depth³==', 'ACI 318: ==span / 16==', 'Same span. ==Four answers.==',
    'Supports ==change the depth==', 'Eurocode asks ==about steel==', 'L/d ==20 → 14==', 'Ratio first, ==math later==', 'Save the ==cheat sheet=='];
  let G = null;

  // 3D beam: span along x (-3000..3000 mm), width 300 along y, depth h along z, deflected by sag(u) (u = 0..1).
  const beam3d = (S, P, h, sag, shape, col) => {
    const N = 30, xs = [];
    for (let i = 0; i <= N; i++) xs.push(-3000 + 6000 * i / N);
    const dz = x => { const u = (x + 3000) / 6000; return -sag * shape(u); };
    for (let i = 0; i < N; i++) {
      const a = xs[i], b = xs[i + 1], za = dz(a), zb = dz(b);
      E.face(S, P, [[a, -150, za + h], [b, -150, zb + h], [b, 150, zb + h], [a, 150, za + h]], col, { cull: false, edge: null });          // top
      E.face(S, P, [[a, -150, za], [b, -150, zb], [b, -150, zb + h], [a, -150, za + h]], col, { cull: false });                           // front
      E.face(S, P, [[a, 150, za], [b, 150, zb], [b, 150, zb + h], [a, 150, za + h]], col, { cull: false, alpha: 1 });                   // back
      E.face(S, P, [[a, -150, za], [b, -150, zb], [b, 150, zb], [a, 150, za]], col, { cull: false });                                    // bottom
    }
    // outline the front face so the shape reads at any size
    const top = xs.map(x => [x, -150, dz(x) + h]), bot = xs.map(x => [x, -150, dz(x)]).reverse();
    E.line3(S, P, [...top, ...bot, top[0]], E.C.navy, 3, { bias: 50 });
    E.face(S, P, [[3000, -150, dz(3000)], [3000, 150, dz(3000)], [3000, 150, dz(3000) + h], [3000, -150, dz(3000) + h]], col, { cull: false, edge: E.C.navy, lw: 3 });
    return dz;
  };
  const SHAPE = {
    simple: u => Math.sin(Math.PI * u),
    one: u => Math.sin(Math.PI * u) * (1 - 0.45 * u) * 1.2,
    both: u => (1 - Math.cos(2 * Math.PI * u)) / 2,
    cant: u => u * u * (3 - u) / 2,
  };

  SC.draw = function (ctx, t) {
    const { C } = E; const B = this.beats; const bi = E.beatOf(t, B);
    if (!G) G = E.capGroups(window.WORDS);
    E.bg2(ctx);
    const loopK = E.seg(t, B[9] - 0.7, B[9]); // last 0.7 s: drift back to the hook state for a clean loop

    // ---------- story state ----------
    let h = 150, sag = 0, mode = 'simple', label = 'h = 150 mm';
    const sagHook = 420 * E.lerp(0.55, 1, E.ramp(t, 0, 1.4, E.out));
    if (bi === 0) { sag = sagHook; label = 'h = 150 mm'; }
    if (bi === 1) { const k = E.ramp(t, B[1] + 0.2, B[1] + 2.6); h = E.lerp(150, 375, k); sag = 420 * Math.pow(150 / h, 3); label = `h = ${Math.round(h)} mm`; }
    if (bi === 2 || bi === 3) { h = 375; sag = 420 * Math.pow(150 / 375, 3); label = 'h = 375 mm'; }
    const tOne = E.said('continuous', B[4] + 0.2), tBoth = E.said('both', B[4] + 2.2), tCant = E.said('cantilever', B[4] + 4), tDbl = E.said('double', B[4] + 5.6);
    if (bi === 4) {
      const st = t < tBoth - 0.1 ? 0 : t < tCant - 0.1 ? 1 : 2;
      const from = [375, 324, 286][st], to = [324, 286, 750][st], ts = [B[4], tBoth - 0.1, tCant - 0.1][st];
      h = E.lerp(from, to, E.ramp(t, ts, ts + 0.6, E.out)); mode = ['one', 'both', 'cant'][st]; label = `h = ${Math.round(h)} mm`;
    }
    if (bi === 5) { h = 300 + 50; mode = 'simple'; label = 'd = 300 mm'; }
    let rho = 0.5;
    if (bi === 6) { const k = E.ramp(t, E.said('heavy', B[6] + 3) - 0.3, E.said('heavy', B[6] + 3) + 1.6); const d = E.lerp(300, 6000 / 14, k); h = d + 50; rho = E.lerp(0.5, 1.5, k); label = `d = ${Math.round(d)} mm`; }
    if (bi === 7) { h = 375; label = 'h = 375 mm'; }
    if (bi === 8) { h = E.lerp(375, 150, loopK); sag = 420 * loopK; label = ''; }

    // ---------- camera per beat ----------
    const cams = [
      { yaw: -0.5, pitch: 0.24, scale: 0.19, tx: 1100, cy: 840, dist: 5200 },
      { yaw: -0.7, pitch: 0.28, scale: 0.2, tx: 1200, cy: 840, dist: 5200 },
      { yaw: -0.62, pitch: 0.2, scale: 0.44, tx: 2500, cy: 860 },
      { yaw: -0.28, pitch: 0.3, scale: 0.13, tx: 0, cy: 820 },
      { yaw: -0.3, pitch: 0.28, scale: 0.125, tx: 0, cy: 790 },
      { yaw: -1.25, pitch: 0.12, scale: 0.7, tx: 3000, cy: 830 },
      { yaw: -1.05, pitch: 0.18, scale: 0.6, tx: 3000, cy: 800 },
      { yaw: -0.6, pitch: 0.26, scale: 0.18, tx: 1100, cy: 820, dist: 5200 },
      { yaw: -0.5, pitch: 0.24, scale: 0.19, tx: 1100, cy: 840, dist: 5200 },
    ];
    const c0 = cams[Math.max(0, bi - 1)], c1 = cams[bi];
    const ck = bi === 0 ? 1 : E.ramp(t, B[bi], B[bi] + 0.9);
    const drift = E.seg(t, B[bi], B[bi + 1]);
    const cam = {
      yaw: E.lerp(c0.yaw, c1.yaw, ck) - 0.05 * drift, pitch: E.lerp(c0.pitch, c1.pitch, ck),
      scale: E.lerp(c0.scale, c1.scale, ck) * (1 + 0.04 * drift), cx: 540, cy: E.lerp(c0.cy, c1.cy, ck),
      dist: E.lerp(c0.dist || 9000, c1.dist || 9000, ck), target: [E.lerp(c0.tx, c1.tx, ck), 0, 180],
    };
    const P = E.camera(cam);

    // ---------- world ----------
    ctx.save();
    const pk = E.punch(t, B); ctx.translate(540, 860); ctx.scale(pk, pk); ctx.translate(-540, -860);
    const S = E.scene3d();
    E.ground(S, P, -3600, 3600, -1200, 1200, 600, 0.35, -700);
    const wallL = mode === 'both' || mode === 'cant', wallR = mode === 'both' || mode === 'one';
    if (wallL) E.box(S, P, [-3600, -500, -900], [-3000, 500, 1400], C.steel, { edge: C.navy, lw: 2 });
    if (wallR) E.box(S, P, [3000, -500, -900], [3600, 500, 1400], C.steel, { edge: C.navy, lw: 2 });
    const dz = beam3d(S, P, h, sag, SHAPE[mode], C.concrete);
    E.flush(ctx, S);
    // pins / rollers under free ends
    const pin = (x, roller) => {
      const p = P([x, 0, dz(x)]), s = Math.min(64, cam.scale * 380);
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - s * 0.45, p[1] + s * 0.8); ctx.lineTo(p[0] + s * 0.45, p[1] + s * 0.8); ctx.closePath(); ctx.fill();
      if (roller) { ctx.beginPath(); ctx.arc(p[0] - s * 0.22, p[1] + s, s * 0.16, 0, 7); ctx.arc(p[0] + s * 0.22, p[1] + s, s * 0.16, 0, 7); ctx.fill(); }
    };
    if (bi !== 5 && bi !== 6) {
      if (!wallL) pin(-3000, false);
      if (!wallR && mode !== 'cant') pin(3000, true);
    }
    // rebar line in elevation (bottom steel)
    ctx.save(); ctx.strokeStyle = C.orange; ctx.lineWidth = Math.max(3, cam.scale * 30); ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i <= 30; i++) { const x = -2950 + 5900 * i / 30; const p = P([x, -150, dz(x) + 50]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); ctx.restore();
    // load arrows in the hook
    const la = (bi === 0 ? 1 : 0) + (bi === 8 ? loopK : 0);
    if (la > 0) {
      ctx.save(); ctx.globalAlpha = la; ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 5;
      for (let x = -2700; x <= 2700; x += 600) { const p = P([x, 0, dz(x) + h]); const off = 12 * Math.sin(t * 6 + x); E.arrow(ctx, p[0], p[1] - 130 + off, p[0], p[1] - 14, 20); }
      ctx.restore();
    }
    // depth dimension at the right end face
    if (label && bi !== 5 && bi !== 6) {
      const a = P([3000, -150, dz(3000)]), b = P([3000, -150, dz(3000) + h]);
      ctx.save(); ctx.strokeStyle = C.yellow; ctx.fillStyle = C.yellow; ctx.lineWidth = 4;
      const x = Math.max(a[0], b[0]) + 34;
      ctx.beginPath(); ctx.moveTo(x, a[1]); ctx.lineTo(x, b[1]); ctx.moveTo(x - 14, a[1]); ctx.lineTo(x + 14, a[1]); ctx.moveTo(x - 14, b[1]); ctx.lineTo(x + 14, b[1]); ctx.stroke();
      ctx.restore();
      const lx = Math.min(x + 24, 1016);
      E.text(ctx, label, lx, (a[1] + b[1]) / 2 + 14, { fam: 'mono', size: 44, color: C.yellow, align: lx > 760 ? 'right' : 'left', bg: 'rgba(8,24,42,0.85)', pad: 12 });
    }
    // section view (beats 5-6): bars in the end face, count grows with ρ
    if (bi === 5 || bi === 6) {
      const n = bi === 5 ? 2 : Math.round(E.lerp(2, 6, (rho - 0.5) / 1.0));
      for (let i = 0; i < n; i++) { const y = -110 + 220 * (n === 1 ? 0.5 : i / (n - 1)); const p = P([3000, y, 55]); ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(p[0], p[1], cam.scale * 9000 / 9000 * 26, 0, 7); ctx.fill(); }
      const a = P([3000, -150, 0]), b = P([3000, -150, h - 50]);
      ctx.save(); ctx.strokeStyle = C.yellow; ctx.lineWidth = 4; const x = a[0] - 40;
      ctx.beginPath(); ctx.moveTo(x, a[1] - 55 * cam.scale); ctx.lineTo(x, b[1]); ctx.stroke(); ctx.restore();
      E.text(ctx, label, x - 20, (a[1] + b[1]) / 2, { fam: 'mono', size: 46, color: C.yellow, align: 'right', bg: 'rgba(8,24,42,0.85)', pad: 12 });
    }
    // sag readout in the hook
    if (bi === 0) E.text(ctx, 'sag exaggerated', 540, 1160, { fam: 'mono', size: 28, color: 'rgba(207,224,255,0.7)', align: 'center', alpha: E.seg(t, 0.8, 1.2) });
    if (bi === 0) E.bigNum(ctx, t, -0.3, 'TOO SHALLOW', 540, 1060, { size: 70, color: C.red });
    ctx.restore();

    // ---------- data panels (y 1000-1220) ----------
    if (bi === 1) {
      const k = E.ramp(t, B[1] + 0.2, B[1] + 2.6);
      E.bigNum(ctx, t, B[1] + 0.3, `${Math.pow(E.lerp(150, 375, k) / 150, 3).toFixed(1)}× stiffer`, 540, 1100, { size: 96 });
      E.text(ctx, '(375 / 150)³ = 15.6', 540, 1190, { fam: 'mono', size: 34, color: C.line, align: 'center', alpha: E.seg(t, B[1] + 2.6, B[1] + 3) });
    }
    if (bi === 2) {
      const t1 = E.said('sixteen', B[2] + 1.5), t2 = E.said('thousand', B[2] + 2.5);
      E.bigNum(ctx, t, t1 - 0.1, 'L / 16', 540, 1060, { size: 110, color: C.orange });
      const k = E.seg(t, t2, t2 + 0.3);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 100, 1130, 880, 96, 14); ctx.fill(); ctx.restore();
        E.text(ctx, '6000 / 16 = 375 mm', 140, 1196, { fam: 'mono', size: 46, color: C.blue, alpha: k });
        E.text(ctx, '14.8 in', 950, 1196, { fam: 'mono', size: 32, color: C.muted, align: 'right', alpha: k }); }
    }
    if (bi >= 3 && bi <= 4) {
      // bar chart of the four ACI depths, to scale (0.2 px per mm)
      const rows = [['L/16', 375], ['L/18.5', 324], ['L/21', 286], ['L/8', 750]];
      const cur = bi === 3 ? 0 : t < tBoth - 0.1 ? 1 : t < tCant - 0.1 ? 2 : 3;
      rows.forEach((r, i) => {
        const a = bi === 3 ? E.ramp(t, B[3] + 0.4 + i * 0.12, B[3] + 0.8 + i * 0.12, E.back) : 1; if (a <= 0) return;
        const x = 130 + i * 230, base = 1110, hh = r[1] * 0.2 * E.clamp(a);
        const on = i === cur, col = i === 3 && on ? C.red : on ? C.yellow : 'rgba(207,224,255,0.35)';
        ctx.fillStyle = col; E.rrect(ctx, x, base - hh, 130, hh, 8); ctx.fill();
        E.text(ctx, r[0], x + 65, base + 44, { fam: 'mono', size: 30, color: on ? '#FFFFFF' : C.line, align: 'center' });
        E.text(ctx, String(r[1]), x + 65, base - hh - 14, { fam: 'mono', size: 34, color: on ? '#FFFFFF' : C.line, align: 'center', alpha: E.clamp(a) });
      });
      if (bi === 4) E.bigNum(ctx, t, tDbl - 0.05, '2× deeper', 540, 650, { size: 100, color: C.red });
    }
    if (bi === 6) {
      const k = (rho - 0.5) / 1.0, sx = 120, sw = 840, sy = 1120;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(207,224,255,0.25)';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy); ctx.stroke(); ctx.strokeStyle = C.yellow;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw * k, sy); ctx.stroke(); ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(sx + sw * k, sy, 24, 0, 7); ctx.fill(); ctx.restore();
      E.text(ctx, 'light steel ρ 0.5%', sx, sy + 66, { fam: 'mono', size: 30, color: C.line });
      E.text(ctx, 'heavy ρ 1.5%', sx + sw, sy + 66, { fam: 'mono', size: 30, color: C.line, align: 'right' });
      E.text(ctx, `L/d ${E.lerp(20, 14, k).toFixed(0)}`, 540, 1040, { fam: 'title', weight: 700, size: 90, color: '#FFFFFF', align: 'center' });
    }
    if (bi === 7) {
      const k = E.ramp(t, B[7] + 0.3, B[7] + 0.9, E.out);
      ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = C.green; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      E.path(ctx, [[440, 1080], [510, 1150], [650, 990]], E.ramp(t, B[7] + 0.3, B[7] + 0.9)); ctx.restore();
      E.text(ctx, 'deflection usually covered', 540, 1215, { fam: 'mono', size: 34, color: C.line, align: 'center', alpha: k });
    }
    if (bi === 8) {
      const a = E.ramp(t, B[8], B[8] + 0.4, E.back) * (1 - loopK);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = E.clamp(a); ctx.translate(0, 40 * (1 - E.clamp(a)));
        ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 560, 952, 640, 24); ctx.fill();
        E.text(ctx, 'MINIMUM DEPTH · 6 m SPAN', 104, 630, { fam: 'mono', size: 30, color: C.muted });
        [['simply supported', 'L/16', '375 mm'], ['one end continuous', 'L/18.5', '324 mm'], ['both ends continuous', 'L/21', '286 mm'], ['cantilever', 'L/8', '750 mm'], ['Eurocode 2 (d)', 'L/d 14–20', '300–429']].forEach((r, i) => {
          const y = 710 + i * 86; E.text(ctx, r[0], 104, y, { size: 36, weight: 600, color: C.ink }); E.text(ctx, r[1], 680, y, { fam: 'mono', size: 36, color: C.blue, align: 'right' }); E.text(ctx, r[2], 976, y, { fam: 'mono', size: 36, color: C.ink, align: 'right' });
          ctx.fillStyle = C.grid; ctx.fillRect(104, y + 26, 872, 2);
        });
        E.text(ctx, 'ACI 318-19 Table 9.3.1.1 · EN 1992-1-1 Table 7.4N', 104, 1160, { fam: 'mono', size: 24, color: C.muted });
        ctx.restore();
      }
    }

    // ---------- chrome: tag, part pips, headline, captions ----------
    E.text(ctx, 'KNOW THIS', 64, 268, { fam: 'mono', size: 26, color: C.navy, bg: '#FFFFFF', pad: 16 });
    E.text(ctx, 'BEAM SERIES', 248, 268, { fam: 'mono', size: 26, color: C.line });
    E.parts(ctx, 1, 3, true);
    const hi = bi === 8 && loopK > 0.5 ? 0 : bi;
    E.headline(ctx, t, hi === 0 && bi === 8 ? B[9] - 0.35 : B[bi], HEAD[hi], { first: t < 0.05 });
    E.kcap(ctx, t, G);
    E.flash(ctx, t, B);
  };
  SCENES['beam-depth-v2'] = SC;
})();
