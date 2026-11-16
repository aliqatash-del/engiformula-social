// BEAM SERIES 2/3 · Where the steel goes. Recomputed in Python:
// C30/37: fctm 2.9 MPa vs fck 30 MPa (EN 1992-1-1:2004 Table 3.1) → 0.097, about a tenth.
// Fixed-fixed UDL: moment changes sign at x = L(1/2 − 1/(2√3)) = 0.211L, so top bars run to ~0.3L.
// As = M / (fyd · z) = 45e6 / (434.8 × 0.9 × 450) = 256 mm² (0.396 in²) → 3H12 = 339 mm²; 2 #4 = 0.40 in².
// fyd = 500/1.15 (EC2 Table 2.1N); z = 0.9d typical practice; 45 kN·m (Part 1, simply supported) used as the design moment.
// Beats (9): hook | load | bottom bars | fixed | top bars | shear | stirrups | how much | next.
(() => {
  const B = E.beats([6.6, 3.9, 6.2, 3.2, 7.8, 4.7, 3.9, 8.1, 7.0]);
  const x0 = 150, x1 = 930, Lp = x1 - x0, yT = 600, yB = 780, Hd = yB - yT;
  SCENES['beam-steel'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'paper');
      const fx = E.ramp(t, B[3], B[3] + 1.2);              // simple → fixed
      const amp = 16 * E.ramp(t, 0.3, 1.4);
      const ys = u => (u * (1 - 2 * u * u + u * u * u)) / 0.3125, yf = u => 16 * u * u * (1 - u) * (1 - u);
      const dy = u => amp * (ys(u) * (1 - fx) + yf(u) * fx * 0.6);
      const X = u => x0 + u * Lp;
      // supports
      ctx.fillStyle = C.ink;
      [[x0, 0], [x1, 1]].forEach(([x, r]) => {
        const a = 1 - fx; if (a <= 0.01) return;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, yB + 4);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-28, 46); ctx.lineTo(28, 46); ctx.closePath(); ctx.fill();
        if (r) { ctx.beginPath(); ctx.arc(-14, 58, 9, 0, 7); ctx.arc(14, 58, 9, 0, 7); ctx.fill(); }
        ctx.restore();
      });
      E.wall(ctx, x0, yT - 70, yB + 70, 40 * fx, -1, fx); E.wall(ctx, x1, yT - 70, yB + 70, 40 * fx, 1, fx);
      // beam body (transparent concrete)
      const N = 60, top = [], bot = [];
      for (let i = 0; i <= N; i++) { const u = i / N; top.push([X(u), yT + dy(u)]); bot.push([X(u), yB + dy(u)]); }
      ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); [...bot].reverse().forEach(p => ctx.lineTo(...p)); ctx.closePath();
      ctx.fillStyle = 'rgba(230,232,235,0.9)'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
      // tension glow: bottom (sagging) and top near supports (hogging, fixed only)
      const glow = E.ramp(t, 0.6, 1.6) * (1 - E.seg(t, B[7], B[7] + 0.4) * 0.6);
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        const sag = (1 - fx) * 4 * u * (1 - u) + fx * Math.max(0, (6 * u - 6 * u * u - 1) / 0.5);
        const hog = fx * Math.max(0, -(6 * u - 6 * u * u - 1));
        if (sag > 0.02) { ctx.fillStyle = E.alpha(C.orange, 0.55 * glow * Math.min(1, sag)); ctx.fillRect(X(i / N), yB - 30 + dy(u), Lp / N + 1, 30); }
        if (hog > 0.02) { ctx.fillStyle = E.alpha(C.orange, 0.55 * glow * Math.min(1, hog)); ctx.fillRect(X(i / N), yT + dy(u), Lp / N + 1, 30); }
      }
      // flexural cracks
      ctx.strokeStyle = C.red; ctx.lineWidth = 3;
      const ck = E.ramp(t, B[2], B[2] + 1.5) * (1 - E.seg(t, B[7], B[7] + 0.4));
      [0.32, 0.4, 0.47, 0.53, 0.6, 0.68].forEach((u, j) => { const k = E.clamp(ck * 1.6 - j * 0.1); if (k > 0) { const L = (30 + 20 * Math.sin(u * 9)) * k; ctx.beginPath(); ctx.moveTo(X(u), yB + dy(u)); ctx.lineTo(X(u) + 4, yB + dy(u) - L); ctx.stroke(); } });
      const ct = E.ramp(t, B[4], B[4] + 1.5) * (1 - E.seg(t, B[7], B[7] + 0.4));
      [0.04, 0.09, 0.14, 0.86, 0.91, 0.96].forEach((u, j) => { const k = E.clamp(ct * 1.6 - (j % 3) * 0.15); if (k > 0) { ctx.beginPath(); ctx.moveTo(X(u), yT + dy(u)); ctx.lineTo(X(u) - 3, yT + dy(u) + 36 * k); ctx.stroke(); } });
      const cs = E.ramp(t, B[5] + 0.2, B[5] + 1.6) * (1 - E.seg(t, B[7], B[7] + 0.4));
      [0.12, 0.19].forEach((u, j) => { const k = E.clamp(cs * 1.5 - j * 0.3); if (k <= 0) return;
        [[u, 1], [1 - u, -1]].forEach(([uu, s]) => { ctx.beginPath(); ctx.moveTo(X(uu), yB - 10 + dy(uu)); ctx.lineTo(X(uu) - s * 120 * k, yB - 10 - 120 * k + dy(uu)); ctx.stroke(); }); });
      // bars
      ctx.lineCap = 'round';
      const bb = E.ramp(t, B[2] + 1.6, B[2] + 3.2);
      if (bb > 0) { ctx.strokeStyle = C.orange; ctx.lineWidth = 9; const p = []; for (let i = 0; i <= N; i++) { const u = i / N * (0.04 + 0.92 * bb) + 0.02; p.push([X(u), yB - 16 + dy(u)]); } E.path(ctx, p, 1); }
      const tb = E.ramp(t, B[4] + 2.2, B[4] + 3.8);
      if (tb > 0) { ctx.strokeStyle = C.orange; ctx.lineWidth = 9;
        [[0, 0.3], [1, 0.7]].forEach(([a, b]) => { const p = []; for (let i = 0; i <= 20; i++) { const u = a + (b - a) * (i / 20) * tb; p.push([X(u), yT + 16 + dy(u)]); } E.path(ctx, p, 1); }); }
      const ip = E.fade(t, B[4] + 1.0, B[4] + 1.5, B[5], B[5] + 0.4);
      if (ip > 0) [0.211, 0.789].forEach(u => { ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(X(u), yT - 50); ctx.lineTo(X(u), yB + 50); ctx.stroke(); ctx.setLineDash([]); E.text(ctx, 'M = 0', X(u), yB + 84, { fam: 'mono', size: 26, color: C.blue, align: 'center', alpha: ip }); });
      // stirrups, tighter toward supports
      const st = E.ramp(t, B[6], B[6] + 2.0);
      if (st > 0) { const xs = []; let u = 0.03, s = 0.025; while (u < 0.5) { xs.push(u, 1 - u); u += s; s *= 1.18; }
        xs.sort((a, b) => a - b).forEach((u, j) => { const k = E.clamp(st * 2 - Math.abs(u - 0.5) * 2 * 0 - j / xs.length); if (k <= 0) return;
          ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.globalAlpha = k; ctx.strokeRect(X(u) - 3, yT + 8 + dy(u), 6, Hd - 16); ctx.globalAlpha = 1; }); }
      // load arrows
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 4;
      for (let i = 0; i < 11; i++) { const u = i / 10, a = E.ramp(t, 0.1 + i * 0.03, 0.4 + i * 0.03, E.out); if (a <= 0) continue; ctx.globalAlpha = a; E.arrow(ctx, X(u), yT - 90 + dy(u), X(u), yT - 8 + dy(u), 16); }
      ctx.globalAlpha = 1;
      // hook: tension vs compression strength bars
      const hk = E.fade(t, 0.8, 1.3, B[1] - 0.2, B[1] + 0.3);
      if (hk > 0) {
        ctx.save(); ctx.globalAlpha = hk;
        E.text(ctx, 'C30/37 CONCRETE (EN 1992-1-1 Table 3.1)', 64, 860, { fam: 'mono', size: 24, color: C.muted });
        const w1 = 760 * E.ramp(t, 1.2, 2.2), w2 = 760 * 2.9 / 30 * E.ramp(t, 2.4, 3.0);
        ctx.fillStyle = C.blue; E.rrect(ctx, 64, 885, w1, 44, 8); ctx.fill();
        E.text(ctx, 'compression 30 MPa', 80, 917, { fam: 'mono', size: 28, color: '#FFFFFF' });
        ctx.fillStyle = C.orange; E.rrect(ctx, 64, 945, Math.max(8, w2), 44, 8); ctx.fill();
        E.text(ctx, 'tension 2.9 MPa  (about 1/10)', 64 + w2 + 16, 977, { fam: 'mono', size: 28, color: C.orange });
        ctx.restore();
      }
      // section inset + card for "how much"
      const hm = E.fade(t, B[7] + 0.3, B[7] + 0.8, B[8], B[8] + 0.4);
      if (hm > 0) {
        ctx.save(); ctx.globalAlpha = hm;
        const sx = 470, sy = 820; ctx.fillStyle = C.concrete; ctx.fillRect(sx, sy, 120, 170); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(sx, sy, 120, 170);
        ctx.fillStyle = C.orange; [0, 1, 2].forEach(j => { ctx.beginPath(); ctx.arc(sx + 25 + j * 35, sy + 145, 9, 0, 7); ctx.fill(); });
        ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 140, sy); ctx.lineTo(sx + 140, sy + 145); ctx.stroke();
        E.text(ctx, 'd = 450 mm', sx + 155, sy + 80, { fam: 'mono', size: 26, color: C.blue });
        E.text(ctx, '3H12', sx - 20, sy + 155, { fam: 'mono', size: 28, color: C.orange, align: 'right' });
        ctx.restore();
      }
      E.card(ctx, E.fade(t, B[7] + 0.6, B[7] + 1.0, B[7] + 3.6, B[7] + 3.9), 'As = M / (fyd × 0.9d)', '45e6 / (435 × 0.9 × 450)', { s2: 42 });
      E.card(ctx, E.fade(t, B[7] + 3.8, B[7] + 4.2, B[8], B[8] + 0.3), '= 256 mm² needed → 3H12 = 339 mm²', '3 × 12 mm bars', { note: '(2 #4 = 0.40 in²)' });
      E.card(ctx, E.fade(t, B[2] + 3.2, B[2] + 3.6, B[3], B[3] + 0.3), 'sagging: bottom in tension', 'main bars at the bottom', { s2: 42 });
      E.card(ctx, E.fade(t, B[6] + 1.6, B[6] + 2.0, B[7], B[7] + 0.3), 'shear cracks run at ~45°', 'stirrups closer at the ends', { s2: 42 });
      // last beat: the beam sags anyway
      E.rehook(ctx, t, B[3], 'Now the fixed beam');
      E.rehook(ctx, t, B[5], 'Then the cracks turn 45°');
      E.rehook(ctx, t, B[7], 'So how much steel?');
      E.nextCard(ctx, E.ramp(t, B[8] + 1.8, B[8] + 2.4, E.out), 'NEXT · BEAM SERIES PART 3', 'How deep should a beam be?', 'Follow so you catch it');
      E.parts(ctx, t, 2);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'BEAM SERIES · PART 2', title: ['Where the', 'steel goes'], dark: false, tag: 'ENGIFORMULA' });
    },
  };
})();
