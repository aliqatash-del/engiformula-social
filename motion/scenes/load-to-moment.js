// Format: FORCE FLOW (load drops on, member deflects, the diagram draws itself, formula lands with the number).
// Example: simply supported, w = 1.5 kip/ft, L = 20 ft: M = wL^2/8 = 75 kip-ft (101.7 kN-m), recomputed in Python.
SCENES['load-to-moment'] = {
  duration: 10.5,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'paper');
    const x0 = 140, x1 = 940, yb = 760, L = x1 - x0;
    const defl = 46 * E.ramp(t, 3.0, 4.2) ;
    const shape = u => (u * (1 - 2 * u * u + u * u * u)) / 0.3125; // normalised elastic curve, peak 1 at mid-span
    // supports
    const sa = E.ramp(t, 0.3, 0.8, E.back);
    ctx.fillStyle = C.ink;
    [[x0, 0], [x1, 1]].forEach(([x, roller]) => {
      ctx.save(); ctx.translate(x, yb + 14); ctx.scale(sa, sa);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, 50); ctx.lineTo(30, 50); ctx.closePath(); ctx.fill();
      if (roller) { ctx.beginPath(); ctx.arc(-16, 62, 10, 0, 7); ctx.arc(16, 62, 10, 0, 7); ctx.fill(); }
      ctx.restore();
    });
    // beam (deflected)
    const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([x0 + u * L, yb + defl * shape(u)]); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.lineCap = 'butt'; E.path(ctx, pts, E.ramp(t, 0.2, 0.9));
    if (defl > 0) {
      ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = C.steel; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke(); ctx.restore();
    }
    // UDL arrows drop in one after another
    ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 5;
    const nA = 11;
    for (let i = 0; i < nA; i++) {
      const u = i / (nA - 1), a = E.ramp(t, 1.2 + i * 0.07, 1.6 + i * 0.07, E.out);
      if (a <= 0) continue;
      const x = x0 + u * L, yTip = yb - 16 + defl * shape(u), drop = 120 * (1 - a);
      ctx.globalAlpha = a; E.arrow(ctx, x, yTip - 110 - drop, x, yTip - drop, 20);
    }
    ctx.globalAlpha = 1;
    const la = E.ramp(t, 2.0, 2.5);
    if (la > 0) { ctx.globalAlpha = la; ctx.beginPath(); ctx.moveTo(x0, yb - 126 + defl * 0); ctx.lineTo(x1, yb - 126); ctx.stroke(); ctx.globalAlpha = 1; }
    E.text(ctx, 'w = 1.5 kip/ft', 540, yb - 150, { fam: 'mono', size: 34, color: C.orange, align: 'center', alpha: la });
    E.text(ctx, 'L = 20 ft', 540, yb + 110, { fam: 'mono', size: 32, color: C.muted, align: 'center', alpha: E.seg(t, 0.8, 1.2) * (1 - E.seg(t, 4.2, 4.6)) });
    // bending moment diagram
    const yd = 900, Mpx = 230;
    const bk = E.ramp(t, 4.4, 6.0);
    if (bk > 0) {
      const bm = []; for (let i = 0; i <= 60; i++) { const u = i / 60; bm.push([x0 + u * L, yd + Mpx * 4 * u * (1 - u)]); }
      const n = Math.max(2, Math.round(60 * bk) + 1), part = bm.slice(0, n);
      ctx.fillStyle = E.alpha(C.blue, 0.16); ctx.beginPath(); ctx.moveTo(x0, yd); part.forEach(p => ctx.lineTo(...p)); ctx.lineTo(part[part.length - 1][0], yd); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.blue; ctx.lineWidth = 6; ctx.beginPath(); part.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yd); ctx.lineTo(x1, yd); ctx.stroke();
      E.text(ctx, 'BENDING MOMENT', x0, yd - 20, { fam: 'mono', size: 24, color: C.muted, alpha: bk });
    }
    const pk = E.ramp(t, 6.0, 6.6, E.back);
    if (pk > 0) {
      ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(540, yd + Mpx, 12 * pk, 0, 7); ctx.fill();
    }
    const f = E.ramp(t, 6.4, 7.0, E.out);
    if (f > 0) {
      ctx.save(); ctx.globalAlpha = f;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1190, 952, 150, 16); ctx.fill();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.stroke();
      E.text(ctx, `M = wL²/8${t > 7.4 ? ' = 1.5 × 20² / 8' : ''}`, 100, 1250, { fam: 'mono', size: 38, color: C.muted });
      E.text(ctx, `= ${E.count(75, E.seg(t, 7.8, 8.8))} kip·ft`, 100, 1312, { fam: 'mono', size: 50, color: C.blue, alpha: E.seg(t, 7.6, 7.9) });
      E.text(ctx, '(101.7 kN·m)', 980, 1312, { fam: 'mono', size: 30, color: C.muted, align: 'right', alpha: E.seg(t, 8.8, 9.2) });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'knowledge', series: 'FORCE FLOW', title: ['Where a beam', 'works hardest'], dark: false });
  },
};
