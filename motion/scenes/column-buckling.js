// Format: FAILURE MECHANISM (load ramps up, member reaches its limit, the mode shape appears, the rule lands).
// Euler: P_cr = pi^2 E I / (K L)^2, so doubling L gives (1/2)^2 = 0.25 of the capacity (recomputed in Python).
SCENES['column-buckling'] = {
  duration: 10,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'paper');
    const panel = (cx, Lpx, label, cap, delay) => {
      const yb = 1130, yt = yb - Lpx;
      const load = E.ramp(t, 1.0 + delay, 4.0 + delay);
      const buck = E.ramp(t, 3.4 + delay * 0.5, 4.4 + delay * 0.5, E.out) * (cap < 1 ? 1 : 0.0);
      const amp = 46 * buck;
      // supports
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx - 34, yb + 46); ctx.lineTo(cx + 34, yb + 46); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - 60, yb + 46, 120, 8);
      // column (half sine when buckled)
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([cx + amp * Math.sin(Math.PI * u), yb - u * Lpx]); }
      ctx.strokeStyle = buck > 0.2 ? C.red : C.ink; ctx.lineWidth = 20; ctx.lineCap = 'round';
      E.path(ctx, pts, E.ramp(t, 0.2, 0.9));
      // load arrow grows
      const len = 40 + 90 * load;
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 8;
      if (load > 0) E.arrow(ctx, cx, yt - 30 - len, cx, yt - 22, 26);
      E.text(ctx, label, cx, yb + 96, { fam: 'mono', size: 34, color: C.muted, align: 'center', alpha: E.seg(t, 0.6, 1.0) });
      E.text(ctx, cap === 1 ? '1.00 P' : '0.25 P', cx, yb + 146, { fam: 'mono', size: 46, color: cap === 1 ? C.blue : C.red, align: 'center', alpha: E.seg(t, 5.0 + delay, 5.5 + delay) });
    };
    panel(300, 250, 'L', 1, 0);
    panel(780, 500, '2L', 0.25, 0.3);
    const f = E.ramp(t, 6.4, 7.0, E.out);
    if (f > 0) {
      ctx.save(); ctx.globalAlpha = f;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1330, 952, 120, 16); ctx.fill(); ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.stroke();
      E.text(ctx, 'P = π²EI / (KL)²', 100, 1384, { fam: 'mono', size: 40, color: C.blue });
      E.text(ctx, 'length is squared', 100, 1428, { size: 28, weight: 500, color: C.muted });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'knowledge', series: 'FAILURE MODE', title: ['Twice as tall,', 'a quarter as strong'], dark: false });
  },
};
