// COLUMN SERIES 2/3 · The moment not on the drawing. Recomputed in Python:
// EC2 5.2(9): ei = l0/400 = 3000/400 = 7.5 mm → 1,000 kN × 7.5 mm = 7.5 kN·m.
// Magnifier 1/(1 − N/Ncr): 0.25 → 1.33, 0.5 → 2.0, 0.8 → 5.0.
// EC2 6.1(4): e0 = max(h/30, 20 mm) = max(10, 20) = 20 mm → 20 kN·m (14.8 kip-ft); 1,000 kN = 225 kips.
// ACI 318-19 6.6.4.5.4: M2,min = Pu(0.6 + 0.03h) → 12 in column: 0.96 in (24 mm).
// Beats (9): hook | not straight | l0/400 | 7.5 kN·m | snowball | magnifier | floor | codes | next.
(() => {
  const B = E.beats([6.6, 2.4, 6.6, 5.8, 6.2, 8.9, 2.4, 9.3, 4.7]);
  SCENES['column-pdelta'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'paper');
      const cx = 300, yb = 990, yt = 650, H = yb - yt;
      // bow amplitude (px, exaggerated): imperfection then P-delta growth
      let amp = 36 * E.ramp(t, B[1], B[1] + 1.2);
      amp *= 1 + 1.0 * E.ramp(t, B[4] + 0.5, B[4] + 4) * (1 - E.ramp(t, B[6], B[6] + 1));
      const bars = E.ramp(t, B[8], B[8] + 2.0);
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([cx + amp * Math.sin(Math.PI * u), yb - u * H]); }
      // supports
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx - 30, yb + 44); ctx.lineTo(cx + 30, yb + 44); ctx.closePath(); ctx.fill();
      // straight reference
      ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx, yt - 20); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 60; ctx.lineCap = 'butt'; E.path(ctx, pts, E.ramp(t, 0.05, 0.5));
      ctx.strokeStyle = C.concrete; ctx.lineWidth = 52; E.path(ctx, pts, E.ramp(t, 0.05, 0.5));
      if (bars > 0) [-14, 14].forEach(o => { ctx.strokeStyle = C.orange; ctx.lineWidth = 6; const p = pts.map(([x, y], i) => [x + o + Math.sign(o) * 10 * bars * Math.sin(Math.PI * i / 40 * 6) ** 2, y]); E.path(ctx, p, 1); });
      // load arrow
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 10;
      E.arrow(ctx, cx, yt - 110, cx, yt - 30, 28);
      E.text(ctx, 'N = 1,000 kN', cx + 30, yt - 80, { fam: 'mono', size: 32, color: C.orange, alpha: E.seg(t, 0.4, 0.8) });
      E.text(ctx, '(225 kips)', cx + 30, yt - 44, { fam: 'mono', size: 26, color: C.muted, alpha: E.seg(t, 0.6, 1.0) });
      // offset dimension at mid-height
      const od = E.seg(t, B[2] + 0.8, B[2] + 1.4) * (1 - E.seg(t, B[8], B[8] + 0.5));
      if (od > 0) {
        const ym = yb - H / 2;
        ctx.save(); ctx.globalAlpha = od; ctx.strokeStyle = C.blue; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, ym); ctx.lineTo(cx + amp, ym); ctx.stroke();
        const lbl = t < B[4] ? 'e = 7.5 mm' : 'e grows';
        E.text(ctx, lbl, cx + amp + 40, ym + 10, { fam: 'mono', size: 30, color: C.blue });
        E.text(ctx, 'bow shown ×100', cx - 40, yb + 90, { fam: 'mono', size: 22, color: C.muted, align: 'left' });
        ctx.restore();
      }
      // moment swirl
      const ms = E.seg(t, B[3] + 0.4, B[3] + 1.0) * (1 - E.seg(t, B[8], B[8] + 0.5));
      if (ms > 0) {
        const r = 46 + 20 * E.ramp(t, B[4] + 0.5, B[4] + 4) * (1 - E.ramp(t, B[6], B[6] + 1));
        ctx.save(); ctx.globalAlpha = ms; ctx.strokeStyle = C.red; ctx.fillStyle = C.red; ctx.lineWidth = 6;
        const ym = yb - H / 2, a0 = -2.4, a1 = 1.4 + (t * 2 % 0.0001);
        ctx.beginPath(); ctx.arc(cx + amp, ym, r, a0, a1); ctx.stroke();
        const ex = cx + amp + r * Math.cos(a1), ey = ym + r * Math.sin(a1);
        E.arrow(ctx, ex - 1, ey - 8, ex - 8, ey + 2, 18);
        ctx.restore();
      }
      // right panel
      const R = 600;
      const hk = E.fade(t, 0.3, 0.8, B[1], B[1] + 0.4);
      if (hk > 0) {
        ctx.save(); ctx.globalAlpha = hk;
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(R, 600, 400, 300); ctx.strokeStyle = C.grid; ctx.lineWidth = 3; ctx.strokeRect(R, 600, 400, 300);
        E.text(ctx, 'COLUMN C3 · DRAWING', R + 24, 650, { fam: 'mono', size: 24, color: C.muted });
        E.text(ctx, 'N = 1,000 kN', R + 24, 720, { fam: 'mono', size: 34, color: C.ink });
        E.text(ctx, 'M = 0', R + 24, 780, { fam: 'mono', size: 34, color: C.ink });
        const st = E.ramp(t, 2.0, 2.5, E.back);
        if (st > 0) { ctx.save(); ctx.translate(R + 200, 840); ctx.rotate(-0.12); ctx.scale(st, st); ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.strokeRect(-190, -40, 380, 76); E.text(ctx, 'DESIGN M = 20 kN·m', 0, 12, { fam: 'mono', size: 30, color: C.red, align: 'center' }); ctx.restore(); }
        ctx.restore();
      }
      const loop = E.fade(t, B[4] + 0.4, B[4] + 0.9, B[5], B[5] + 0.4);
      if (loop > 0) {
        ctx.save(); ctx.globalAlpha = loop;
        const lx = 800, ly = 790, rr = 150, nodes = ['load', 'bend', 'offset', 'moment'];
        ctx.strokeStyle = C.orange; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(lx, ly, rr, 0, Math.PI * 2 * E.ramp(t, B[4] + 0.6, B[4] + 3)); ctx.stroke();
        nodes.forEach((n, i) => { const a = -Math.PI / 2 + i * Math.PI / 2, k = E.seg(t, B[4] + 0.8 + i * 0.6, B[4] + 1.2 + i * 0.6);
          E.text(ctx, n, lx + rr * Math.cos(a), ly + rr * Math.sin(a) + 10, { fam: 'mono', size: 30, color: C.navy, align: 'center', bg: C.yellow, alpha: k }); });
        const sp = (t * 1.6) % (Math.PI * 2); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(lx + rr * Math.cos(sp), ly + rr * Math.sin(sp), 10, 0, 7); ctx.fill();
        ctx.restore();
      }
      const mag = E.fade(t, B[5] + 0.2, B[5] + 0.7, B[6], B[6] + 0.4);
      if (mag > 0) {
        ctx.save(); ctx.globalAlpha = mag;
        E.text(ctx, 'MOMENT × 1/(1 − N/Ncr)', 560, 640, { fam: 'mono', size: 26, color: C.muted });
        [['25%', 1.33], ['50%', 2.0], ['80%', 5.0]].forEach(([s, v], i) => {
          const k = E.ramp(t, B[5] + 0.8 + i * 2.2, B[5] + 2.0 + i * 2.2), y = 690 + i * 100, w = 380 * v / 5 * k;
          E.text(ctx, `N = ${s} Ncr`, 560, y + 36, { fam: 'mono', size: 26, color: C.ink, alpha: k });
          ctx.fillStyle = i === 2 ? C.red : C.blue; E.rrect(ctx, 560, y + 50, Math.max(8, w), 30, 8); ctx.fill();
          E.text(ctx, `×${v.toFixed(2).replace(/\.?0+$/, '')}`, 570 + Math.max(8, w), y + 75, { fam: 'mono', size: 30, color: i === 2 ? C.red : C.blue, alpha: k });
        });
        ctx.restore();
      }
      const fl = E.fade(t, B[7] + 0.2, B[7] + 0.7, B[8], B[8] + 0.4);
      if (fl > 0) {
        ctx.save(); ctx.globalAlpha = fl;
        E.text(ctx, 'MINIMUM ECCENTRICITY', 560, 640, { fam: 'mono', size: 26, color: C.muted });
        E.text(ctx, 'Eurocode 2', 560, 710, { fam: 'title', weight: 700, size: 40, color: C.ink });
        E.text(ctx, 'max(h/30, 20 mm)', 560, 760, { fam: 'mono', size: 32, color: C.blue });
        E.text(ctx, 'ACI 318', 560, 850, { fam: 'title', weight: 700, size: 40, color: C.ink, alpha: E.seg(t, B[7] + 4.5, B[7] + 5) });
        E.text(ctx, '0.6 + 0.03h (in)', 560, 900, { fam: 'mono', size: 32, color: C.blue, alpha: E.seg(t, B[7] + 4.5, B[7] + 5) });
        ctx.restore();
      }
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(2, 1.6, 1, 'EN 1992-1-1 5.2(9): ei = l0 / 400', '3000 / 400 = 7.5 mm', {});
      c(3, 1.2, 1, 'M = N × e = 1,000 kN × 0.0075 m', '= 7.5 kN·m', { note: '(5.5 kip·ft)' });
      E.card(ctx, E.fade(t, B[7] + 1.2, B[7] + 1.6, B[7] + 4.6, B[7] + 4.9), 'EC2 6.1(4): 300 mm column → max(10, 20)', 'e0 = 20 mm → 20 kN·m', { s1: 30, note: '(14.8 kip·ft)' });
      E.card(ctx, E.fade(t, B[7] + 5.0, B[7] + 5.4, B[8], B[8] + 0.3), 'ACI 318-19 6.6.4.5.4 · 12 in column', '0.6 + 0.36 = 0.96 in', { note: '(24 mm)' });
      E.rehook(ctx, t, B[4], 'And it snowballs');
      E.rehook(ctx, t, B[6], 'So codes set a floor');
      E.nextCard(ctx, E.ramp(t, B[8] + 1.0, B[8] + 1.6, E.out), 'NEXT · COLUMN SERIES PART 3', 'Why ties are so close', 'Follow so you catch it');
      E.parts(ctx, t, 2);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'COLUMN SERIES · PART 2', title: ['The moment', 'not on the drawing'], dark: false, tag: 'ENGIFORMULA' });
    },
  };
})();
