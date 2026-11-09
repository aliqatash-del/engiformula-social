// Format: FORCE FLOW (load drops on, member deflects, the diagram draws itself, formula lands with the number).
// SI-led example: simply supported, w = 20 kN/m, L = 6 m: M = wL^2/8 = 90 kN-m (66.4 kip-ft), recomputed in Python.
// Beats (6 slides): hook | load | deflect | diagram | number | CTA. Caption band (y 1220-1300) kept clear.
SCENES['load-to-moment'] = {
  duration: 10.5,
  beats: [0, 1.2, 2.6, 4.4, 6.4, 8.6, 10.5],
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'paper');
    const x0 = 140, x1 = 940, yb = 650, L = x1 - x0;
    const defl = 42 * E.ramp(t, 2.8, 4.0);
    const shape = u => (u * (1 - 2 * u * u + u * u * u)) / 0.3125; // elastic curve, peak 1 at mid-span
    const sa = E.ramp(t, 0.05, 0.4, E.back);
    ctx.fillStyle = C.ink;
    [[x0, 0], [x1, 1]].forEach(([x, roller]) => {
      ctx.save(); ctx.translate(x, yb + 14); ctx.scale(sa, sa);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, 50); ctx.lineTo(30, 50); ctx.closePath(); ctx.fill();
      if (roller) { ctx.beginPath(); ctx.arc(-16, 62, 10, 0, 7); ctx.arc(16, 62, 10, 0, 7); ctx.fill(); }
      ctx.restore();
    });
    const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([x0 + u * L, yb + defl * shape(u)]); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.lineCap = 'butt'; E.path(ctx, pts, E.ramp(t, 0.05, 0.6));
    if (defl > 0) { ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = C.steel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 5;
    const nA = 11;
    for (let i = 0; i < nA; i++) {
      const u = i / (nA - 1), a = E.ramp(t, 0.5 + i * 0.07, 0.9 + i * 0.07, E.out);
      if (a <= 0) continue;
      const x = x0 + u * L, yTip = yb - 16 + defl * shape(u), drop = 120 * (1 - a);
      ctx.globalAlpha = a; E.arrow(ctx, x, yTip - 110 - drop, x, yTip - drop, 20);
    }
    ctx.globalAlpha = 1;
    const la = E.ramp(t, 1.3, 1.8);
    if (la > 0) { ctx.globalAlpha = la; ctx.beginPath(); ctx.moveTo(x0, yb - 126); ctx.lineTo(x1, yb - 126); ctx.stroke(); ctx.globalAlpha = 1; }
    E.text(ctx, 'w = 20 kN/m', 540, yb - 150, { fam: 'mono', size: 34, color: C.orange, align: 'center', alpha: la });
    E.text(ctx, 'L = 6 m', 540, yb + 110, { fam: 'mono', size: 32, color: C.muted, align: 'center', alpha: E.seg(t, 1.4, 1.9) * (1 - E.seg(t, 4.2, 4.6)) });
    const yd = 770, Mpx = 200;
    const bk = E.ramp(t, 4.5, 6.2);
    if (bk > 0) {
      const bm = []; for (let i = 0; i <= 60; i++) { const u = i / 60; bm.push([x0 + u * L, yd + Mpx * 4 * u * (1 - u)]); }
      const n = Math.max(2, Math.round(60 * bk) + 1), part = bm.slice(0, n);
      ctx.fillStyle = E.alpha(C.blue, 0.16); ctx.beginPath(); ctx.moveTo(x0, yd); part.forEach(p => ctx.lineTo(...p)); ctx.lineTo(part[part.length - 1][0], yd); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.blue; ctx.lineWidth = 6; ctx.beginPath(); part.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yd); ctx.lineTo(x1, yd); ctx.stroke();
      E.text(ctx, 'BENDING MOMENT', x0, yd - 20, { fam: 'mono', size: 24, color: C.muted, alpha: bk });
    }
    const pk = E.ramp(t, 6.0, 6.5, E.back);
    if (pk > 0) { ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(540, yd + Mpx, 12 * pk, 0, 7); ctx.fill(); E.text(ctx, 'max at mid-span', 570, yd + Mpx + 8, { fam: 'mono', size: 26, color: C.blue, alpha: pk * (1 - E.seg(t, 8.6, 9)) }); }
    const f = E.ramp(t, 6.4, 7.0, E.out) * (1 - E.seg(t, 8.6, 8.9));
    if (f > 0) {
      ctx.save(); ctx.globalAlpha = f;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1010, 952, 160, 16); ctx.fill(); ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.stroke();
      E.text(ctx, `M = wL²/8${t > 7.0 ? ' = 20 × 6² / 8' : ''}`, 100, 1070, { fam: 'mono', size: 38, color: C.muted });
      E.text(ctx, `= ${E.count(90, E.seg(t, 7.2, 8.2))} kN·m`, 100, 1140, { fam: 'mono', size: 54, color: C.blue, alpha: E.seg(t, 7.0, 7.3) });
      E.text(ctx, '(66.4 kip·ft)', 980, 1140, { fam: 'mono', size: 30, color: C.muted, align: 'right', alpha: E.seg(t, 8.0, 8.4) });
      ctx.restore();
    }
    E.ctaCard(ctx, E.ramp(t, 8.8, 9.3, E.out), 'Check mid-span first', 'Save this · free calculators → link in bio');
    E.chrome(ctx, t, { pillar: 'knowledge', series: 'FORCE FLOW', title: ['Where a beam', 'works hardest'], dark: false, tag: 'ENGIFORMULA' });
  },
};
