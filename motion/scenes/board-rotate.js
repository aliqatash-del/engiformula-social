// Format: TURN IT (one object rotates while a live number tracks it; the number is the story).
// 2x12 (1.5 x 11.25 in): I on edge = 178.0 in4, flat = 3.16 in4, ratio 56x (recomputed in Python).
// I(theta) = (b h^3 cos^2 + h b^3 sin^2) / 12 for the rotated rectangle about the horizontal axis.
SCENES['board-rotate'] = {
  duration: 10,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const b = 1.5, h = 11.25, Lb = 120;
    const th = (Math.PI / 2) * (E.ramp(t, 2.6, 5.2) - E.ramp(t, 8.6, 9.8)); // turns flat, then back (loop)
    const I = (b * h ** 3 * Math.cos(th) ** 2 + h * b ** 3 * Math.sin(th) ** 2) / 12;
    const sagMax = 11 * (3.164 / I) ** 0.5 * E.ramp(t, 0.8, 1.6); // exaggerated visual only
    const P = E.camera({ yaw: -0.95 + 0.12 * Math.sin(t * 0.6), pitch: 0.3, dist: 900, scale: 6.0, cx: 540, cy: 860, target: [0, Lb / 2, 0] });
    const S = E.scene3d();
    E.ground(S, P, -36, 36, -12, Lb + 12, 12, 0.25, -26);
    const ys = Array.from({ length: 21 }, (_, i) => (Lb * i) / 20);
    const ring = y => {
      const sag = -sagMax * Math.sin((Math.PI * y) / Lb);
      return [[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, h / 2], [-b / 2, h / 2]].map(([x, z]) => [x * Math.cos(th) - z * Math.sin(th), x * Math.sin(th) + z * Math.cos(th) + sag]);
    };
    E.sweepY(S, P, ring, ys, '#D8B27A', { edge: 'rgba(14,42,71,0.25)', lw: 1 });
    // supports
    [0, Lb].forEach(y => E.box(S, P, [-8, y - 3, -26], [8, y + 3, -6.5], C.steel, { edge: 'rgba(14,42,71,0.4)' }));
    E.flush(ctx, S);
    // load arrow at mid-span
    const q = P([0, Lb / 2, 12]);
    ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 6; ctx.globalAlpha = E.seg(t, 0.4, 0.8);
    E.arrow(ctx, q[0], q[1] - 150, q[0], q[1] - 20, 22); ctx.globalAlpha = 1;
    // live readout
    ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = E.seg(t, 0.6, 1.0); E.rrect(ctx, 64, 1110, 952, 190, 16); ctx.fill();
    E.text(ctx, 'I = b·h³ / 12', 100, 1170, { fam: 'mono', size: 34, color: C.muted });
    E.text(ctx, `I = ${I >= 10 ? I.toFixed(0) : I.toFixed(2)} in⁴`, 100, 1250, { fam: 'mono', size: 64, color: I > 60 ? C.blue : C.red });
    const ra = E.fade(t, 5.4, 5.8, 8.4, 8.8);
    E.text(ctx, '56× less stiff', 980, 1250, { fam: 'title', weight: 700, size: 46, color: C.red, align: 'right', alpha: ra });
    ctx.globalAlpha = 1;
    E.text(ctx, th < 0.7 ? 'ON EDGE' : 'FLAT', 540, 1060, { fam: 'mono', size: 32, color: C.yellow, align: 'center' });
    E.chrome(ctx, t, { pillar: 'calculator', series: 'TURN IT', title: ['Same 2×12.', 'Turn it flat.'] });
  },
};
