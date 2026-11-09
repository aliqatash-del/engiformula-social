// Format: FAILURE MODE (load ramps up, member reaches its limit, the mode shape appears, the rule lands).
// Euler: P_cr = pi^2 E I / (K L)^2, so doubling L gives (1/2)^2 = 0.25 of the capacity (recomputed in Python).
// Beats (6 slides): hook | two columns | load + buckle | formula | quarter | CTA. Caption band kept clear.
SCENES['column-buckling'] = {
  duration: 10,
  beats: [0, 1.2, 3.0, 4.8, 6.4, 8.2, 10],
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'paper');
    const endA = 1 - E.seg(t, 8.2, 8.6);
    const panel = (cx, Lpx, label, quarter, delay) => {
      const yb = 950, yt = yb - Lpx;
      const load = E.ramp(t, 3.0 + delay, 4.6 + delay) - 0.6 * E.ramp(t, 9.4, 10);
      const buck = quarter ? E.ramp(t, 3.9, 4.8, E.out) * (1 - E.ramp(t, 9.4, 10)) : 0;
      const amp = 44 * buck;
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(cx, yb); ctx.lineTo(cx - 34, yb + 46); ctx.lineTo(cx + 34, yb + 46); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - 60, yb + 46, 120, 8);
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([cx + amp * Math.sin(Math.PI * u), yb - u * Lpx]); }
      ctx.strokeStyle = buck > 0.2 ? C.red : C.ink; ctx.lineWidth = 20; ctx.lineCap = 'round';
      E.path(ctx, pts, E.ramp(t, 0.05, 0.5 + delay));
      const len = 40 + 90 * Math.max(0, load);
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 8;
      if (load > 0) E.arrow(ctx, cx, yt - 30 - len, cx, yt - 22, 26);
      E.text(ctx, label, cx, yb + 100, { fam: 'mono', size: 34, color: C.muted, align: 'center', alpha: E.seg(t, 1.2, 1.8) * endA });
      E.text(ctx, quarter ? '0.25 P' : '1.00 P', cx, yb + 160, { fam: 'mono', size: 50, color: quarter ? C.red : C.blue, align: 'center', alpha: E.seg(t, 6.4 + delay, 6.9 + delay) * endA });
    };
    panel(300, 210, 'L', false, 0);
    panel(780, 420, '2L', true, 0.3);
    // formula card, top left (clear of both columns)
    const f = E.ramp(t, 4.8, 5.4, E.out);
    if (f > 0) {
      ctx.save(); ctx.globalAlpha = f;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 480, 520, 150, 16); ctx.fill(); ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.stroke();
      E.text(ctx, 'P = π²EI / (KL)²', 96, 546, { fam: 'mono', size: 38, color: C.blue });
      E.text(ctx, t > 6.4 ? 'L is squared: 2² = 4' : 'Euler buckling load', 96, 598, { size: 28, weight: 500, color: C.muted });
      ctx.restore();
    }
    E.ctaCard(ctx, E.ramp(t, 8.4, 8.9, E.out), 'Tall and slender? Brace it.', 'Save this for your next column check');
    E.chrome(ctx, t, { pillar: 'knowledge', series: 'FAILURE MODE', title: ['Twice as tall,', 'a quarter as strong'], dark: false, tag: 'ENGIFORMULA' });
  },
};
