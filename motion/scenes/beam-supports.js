// BEAM SERIES 1/3 · Same beam, four supports. w = 10 kN/m, L = 6 m (0.685 kip/ft, 19.7 ft), recomputed in Python:
// simple wL²/8 = 45 kN·m (33.2 kip-ft); fixed-fixed wL²/12 = 30 at the supports, wL²/24 = 15 mid-span;
// cantilever wL²/2 = 180 kN·m (132.8 kip-ft). Deflection coefficients 5/384, 1/384, 1/8 → simple 5×, cantilever 48× fixed.
// Beats (9 slides): hook | load | simple | clamp | fixed | remove | cantilever | sag | next.
(() => {
  const B = E.beats([4.7, 3.9, 4.7, 2.2, 8.1, 2.4, 6.6, 5.8, 7.0]);
  const x0 = 150, x1 = 930, Lp = x1 - x0, yb = 640, yd = 920, sc = 1.0; // px per kN·m
  const Ms = u => 45 * 4 * u * (1 - u);                 // sagging +, u = x/L
  const Mf = u => (10 / 12) * (36 * 6 * u - 36 * 6 * u * u - 36);
  const Mc = u => -0.5 * 10 * Math.pow(6 * (1 - u), 2) * 1; // wall at the left: -wL²/2 at u = 0
  const ys = u => (u * (1 - 2 * u * u + u * u * u)) / 0.3125;
  const yf = u => 16 * u * u * (1 - u) * (1 - u);
  const yc = u => (6 * u * u - 4 * u ** 3 + u ** 4) / 3; // cantilever UDL, tip (u = 1) = 1
  SCENES['beam-supports'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'paper');
      // mode weights: simple → fixed → cantilever, with the hook previewing all three quickly
      let wf = E.ramp(t, B[3], B[3] + 1.2), wc = E.ramp(t, B[5] + 0.2, B[5] + 1.6);
      if (t < B[1]) { const h = t / B[1]; wf = E.fade(h, 0.25, 0.4, 0.55, 0.62); wc = E.fade(h, 0.58, 0.7, 0.92, 1.0); }
      if (t > B[8]) { wc = 1 - E.ramp(t, B[8], B[8] + 1.0); wf = 1; }
      const ws = 1 - wf;
      const M = u => (Ms(u) * ws + Mf(u) * wf) * (1 - wc) + Mc(u) * wc;
      // deflected shape amplitude (px): simple 26, fixed 6, cantilever 140 (sketch, not to scale)
      const defl = u => (26 * ys(u) * ws + 6 * yf(u) * wf) * (1 - wc) + 140 * yc(u) * wc;
      const load = t < B[1] ? E.ramp(t, 0.1, 0.8) : 1;
      const dk = Math.min(load, 1) * (t < B[1] ? 1 : E.ramp(t, B[1], B[1] + 1.5) * 0 + 1);
      // supports
      const pinA = (1 - wf) * (1 - wc), wallL = Math.max(wf, wc), wallR = wf * (1 - wc), roll = (1 - wf) * (1 - wc);
      ctx.fillStyle = C.ink;
      [[x0, pinA, 0], [x1, roll, 1]].forEach(([x, a, r]) => {
        if (a <= 0.01) return;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, yb + 14); ctx.scale(a, a);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, 50); ctx.lineTo(30, 50); ctx.closePath(); ctx.fill();
        if (r) { ctx.beginPath(); ctx.arc(-16, 62, 10, 0, 7); ctx.arc(16, 62, 10, 0, 7); ctx.fill(); }
        ctx.restore();
      });
      E.wall(ctx, x0, yb - 80, yb + 80, 40 * wallL, -1, wallL);
      E.wall(ctx, x1, yb - 80, yb + 80, 40 * wallR, 1, wallR);
      // beam
      const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push([x0 + u * Lp, yb + defl(u) * dk]); }
      ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.lineCap = 'butt'; E.path(ctx, pts, E.ramp(t, 0.02, 0.4));
      // hogging glow over supports in the last beat
      const hg = E.ramp(t, B[8] + 1.2, B[8] + 2.0);
      if (hg > 0) {
        ctx.save(); ctx.globalAlpha = hg * (0.6 + 0.4 * Math.sin(t * 6)); ctx.strokeStyle = C.orange; ctx.lineWidth = 10;
        [[0, 0.21], [0.79, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(x0 + a * Lp, yb - 14); ctx.lineTo(x0 + b * Lp, yb - 14); ctx.stroke(); });
        ctx.restore();
        E.text(ctx, 'TOP IN TENSION', x0 + 4, yb - 140, { fam: 'mono', size: 26, color: C.orange, alpha: hg });
        E.text(ctx, 'TOP IN TENSION', x1 - 4, yb - 140, { fam: 'mono', size: 26, color: C.orange, alpha: hg, align: 'right' });
      }
      // load arrows
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 5;
      for (let i = 0; i < 13; i++) {
        const u = i / 12, a = E.ramp(t, 0.1 + i * 0.04, 0.5 + i * 0.04, E.out);
        if (a <= 0) continue;
        const x = x0 + u * Lp, yTip = yb - 16 + defl(u) * dk, drop = 100 * (1 - a);
        ctx.globalAlpha = a; E.arrow(ctx, x, yTip - 100 - drop, x, yTip - drop, 18);
      }
      ctx.globalAlpha = 1;
      const la = E.ramp(t, B[1], B[1] + 0.6) * (1 - E.seg(t, B[7], B[7] + 0.4));
      E.text(ctx, 'w = 10 kN/m', x1, yb - 140, { fam: 'mono', size: 34, color: C.orange, align: 'right', alpha: la });
      E.text(ctx, 'L = 6 m', 540, yb + 120, { fam: 'mono', size: 30, color: C.muted, align: 'center', alpha: la * (1 - E.seg(t, B[2], B[2] + 0.5)) });
      // moment diagram (sagging below the axis in blue, hogging above in orange)
      const dg = (t < B[1] ? E.seg(t, 0.15, 0.3) : E.ramp(t, B[2], B[2] + 1.6)) * (1 - E.seg(t, B[7], B[7] + 0.5)) + E.seg(t, B[8] + 0.6, B[8] + 1.2) * 0;
      if (dg > 0) {
        const n = Math.max(2, Math.round(80 * Math.min(1, dg * 1.5)) + 1);
        ctx.save(); ctx.globalAlpha = Math.min(1, dg * 2);
        const pt = i => { const u = i / 80; return [x0 + u * Lp, yd + M(u) * sc]; };
        ctx.beginPath(); ctx.moveTo(x0, yd); for (let i = 0; i < n; i++) ctx.lineTo(...pt(i)); ctx.lineTo(pt(n - 1)[0], yd); ctx.closePath();
        ctx.fillStyle = E.alpha(C.blue, 0.14); ctx.fill();
        ctx.lineWidth = 6; for (let i = 1; i < n; i++) { const a = pt(i - 1), b = pt(i); ctx.strokeStyle = (b[1] < yd - 0.5) ? C.orange : C.blue; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yd); ctx.lineTo(x1, yd); ctx.stroke();
        E.text(ctx, 'BENDING MOMENT', x1, yd + 36, { fam: 'mono', size: 22, color: C.muted, align: 'right' });
        ctx.restore();
      }
      // big numbers per mode
      const lbl = (s, x, y, a, c) => E.text(ctx, s, x, y, { fam: 'mono', size: 44, color: c, align: 'center', alpha: a, bg: '#FFFFFF', pad: 10 });
      if (t >= B[1]) {
        const fa = E.seg(t, B[4] + 0.8, B[4] + 1.3) * (1 - wc);
        lbl('−30', x0 + 70, yd - 30 * sc - 26, fa, C.orange); lbl('−30', x1 - 70, yd - 30 * sc - 26, fa, C.orange);
        lbl('+15', 540, yd + 15 * sc + 48, E.seg(t, B[4] + 3.5, B[4] + 4) * (1 - wc), C.blue);
        lbl('−180 kN·m', x0 + 190, yd - 180 * sc + 40, E.seg(t, B[6] + 0.3, B[6] + 1) * (1 - E.seg(t, B[7], B[7] + .4)) * (t > B[8] ? 0 : 1), C.orange);
      } else {
        // hook counter
        const h = t / B[1], v = h < 0.3 ? 45 : h < 0.6 ? 30 : 180;
        E.text(ctx, `${v} kN·m`, 540, 1100, { fam: 'mono', size: 96, color: v === 180 ? C.orange : C.blue, align: 'center', alpha: E.seg(t, 0.2, 0.5) });
        E.text(ctx, h < 0.3 ? 'simply supported' : h < 0.6 ? 'both ends fixed' : 'cantilever', 540, 1160, { fam: 'mono', size: 32, color: C.muted, align: 'center', alpha: E.seg(t, 0.2, 0.5) });
      }
      // formula card per beat
      const cs = E.fade(t, B[2] + 0.4, B[2] + 0.9, B[3], B[3] + 0.3);
      E.card(ctx, cs, 'simply supported: M = wL²/8 = 10 × 6² / 8', `= ${E.count(45, E.seg(t, B[2] + 0.9, B[2] + 2))} kN·m`, { note: '(33.2 kip·ft)', an: E.seg(t, B[2] + 2, B[2] + 2.4) });
      const cf = E.fade(t, B[4] + 1.5, B[4] + 2, B[5], B[5] + 0.3);
      E.card(ctx, cf, 'fixed both ends: wL²/12 at supports, wL²/24 mid', '30 and 15 kN·m', { note: '(22.1 / 11.1 kip·ft)' });
      const cc = E.fade(t, B[6] + 0.8, B[6] + 1.3, B[7], B[7] + 0.3);
      E.card(ctx, cc, 'cantilever: M = wL²/2 = 10 × 6² / 2', `= ${E.count(180, E.seg(t, B[6] + 1.3, B[6] + 2.6))} kN·m`, { c2: C.orange, note: '6× the fixed beam', an: E.seg(t, B[6] + 3, B[6] + 3.5) });
      // sag race
      const sr = E.fade(t, B[7] + 0.3, B[7] + 0.8, B[8], B[8] + 0.5);
      if (sr > 0) {
        ctx.save(); ctx.globalAlpha = sr;
        E.text(ctx, 'MID-SPAN / TIP DEFLECTION, SAME BEAM', 64, 790, { fam: 'mono', size: 24, color: C.muted });
        [['fixed–fixed', 1, C.green], ['simply supported', 5, C.blue], ['cantilever', 48, C.red]].forEach(([s, v, c], i) => {
          const y = 830 + i * 70, w = 600 * v / 48 * E.ramp(t, B[7] + 0.6 + i * 0.4, B[7] + 1.6 + i * 0.4);
          ctx.fillStyle = c; E.rrect(ctx, 64, y, Math.max(10, w), 44, 8); ctx.fill();
          E.text(ctx, `${s}  ${v}×`, 64 + Math.max(10, w) + 16, y + 33, { fam: 'mono', size: 30, color: c });
        });
        ctx.restore();
      }
      E.card(ctx, E.fade(t, B[7] + 2.4, B[7] + 2.9, B[8], B[8] + 0.3), 'coefficients: 1/384 · 5/384 · 1/8', 'cantilever = 48× fixed', { c2: C.red });
      E.rehook(ctx, t, B[3], 'Now clamp both ends');
      E.rehook(ctx, t, B[5], 'Now remove a support');
      E.rehook(ctx, t, B[7], 'And the sag?');
      E.nextCard(ctx, E.ramp(t, B[8] + 2.2, B[8] + 2.8, E.out), 'NEXT · BEAM SERIES PART 2', 'Where the steel goes', 'Follow so you catch it');
      E.parts(ctx, t, 1);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'BEAM SERIES · PART 1', title: ['Same beam,', 'four supports'], dark: false, tag: 'ENGIFORMULA' });
    },
  };
})();
