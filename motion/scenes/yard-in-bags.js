// Format: SCALE MORPH. 1 yd3 = 3 x 3 x 3 ft = 27 ft3; an 80 lb bag yields about 0.6 ft3 (typical, printed on
// the bag), so 27 / 0.6 = 45 bags = 45 x 80 = 3,600 lb of dry mix (recomputed in Python). 45 = 5 x 3 x 3 cells
// of 0.6 x 1 x 1 ft, so the bags tile the cube exactly. 1 yd3 = 0.765 m3.
SCENES['yard-in-bags'] = {
  duration: 10,
  beats: [0, 1.5, 3.0, 4.2, 7.2, 8.6, 10], // cube | 27 ft3 | one bag | fill | calc | CTA
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const S3 = 36; // 3 ft in inches
    const k = E.ramp(t, 0.6, 2.2);
    const P = E.camera({ yaw: E.lerp(0, -0.62, k) - 0.2 * E.seg(t, 2.2, 10), pitch: E.lerp(0, 0.45, k), dist: 1200, scale: E.lerp(13, 11, k), cx: 540, cy: 760, target: [S3 / 2, S3 / 2, S3 / 2] });
    const S = E.scene3d();
    E.ground(S, P, -12, S3 + 12, -12, S3 + 12, 6, 0.3 * k, 0);
    const v = [[0, 0, 0], [S3, 0, 0], [S3, S3, 0], [0, S3, 0]], w = v.map(p => [p[0], p[1], S3]);
    const edges = [];
    for (let i = 0; i < 4; i++) edges.push([v[i], v[(i + 1) % 4]], [w[i], w[(i + 1) % 4]], [v[i], w[i]]);
    const dk = E.ramp(t, 0.05, 1.2);
    edges.forEach((e, i) => { const a = E.clamp(dk * 12 - i); if (a > 0) E.line3(S, P, [e[0], [E.lerp(e[0][0], e[1][0], a), E.lerp(e[0][1], e[1][1], a), E.lerp(e[0][2], e[1][2], a)]], '#FFFFFF', 4, { layer: 3 }); });
    // cells: 5 along x (7.2 in), 3 along y, 3 along z; fill bottom-up, back to front
    const cells = [];
    for (let z = 0; z < 3; z++) for (let y = 2; y >= 0; y--) for (let x = 0; x < 5; x++) cells.push([x, y, z]);
    const one = E.ramp(t, 3.0, 3.6, E.back);
    const n = t < 4.2 ? (one > 0 ? 1 : 0) : 1 + Math.floor(44 * E.ramp(t, 4.2, 7.0, x => x));
    for (let i = 0; i < n; i++) {
      const [x, y, z] = cells[i], g = 0.5;
      const drop = i === n - 1 && t > 4.2 && t < 7.0 ? 0 : 0;
      const lift = i === 0 && t < 4.2 ? 14 * (1 - one) : drop;
      E.box(S, P, [x * 7.2 + g, y * 12 + g, z * 12 + g + lift], [(x + 1) * 7.2 - g, (y + 1) * 12 - g, (z + 1) * 12 - g + lift], C.yellow, { edge: 'rgba(14,42,71,0.45)', layer: 1 });
    }
    E.flush(ctx, S);
    // dims
    const da = E.fade(t, 1.5, 2.0, 2.9, 3.1);
    if (da > 0) {
      E.dim(ctx, P([0, 0, 0]), P([S3, 0, 0]), 50, '3 ft', da);
      E.dim(ctx, P([S3, 0, 0]), P([S3, S3, 0]), 50, '3 ft', da);
      E.dim(ctx, P([0, 0, S3]), P([0, 0, 0]), 50, '3 ft', da);
      E.text(ctx, '1 yd³ = 27 ft³', 540, 1130, { fam: 'mono', size: 46, color: '#FFFFFF', align: 'center', alpha: da, bg: C.navy });
    }
    const ob = E.fade(t, 3.1, 3.5, 4.0, 4.2);
    if (ob > 0) E.text(ctx, '1 bag (80 lb) ≈ 0.6 ft³', 540, 1130, { fam: 'mono', size: 42, color: C.yellow, align: 'center', alpha: ob, bg: C.navy });
    if (t > 4.2 && t < 8.7) {
      const a = 1 - E.seg(t, 8.4, 8.7);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1010, 952, 170, 16); ctx.fill();
      E.text(ctx, t < 7.2 ? 'bags' : '27 ÷ 0.6 = 45 bags', 100, 1072, { fam: 'mono', size: 36, color: C.muted });
      E.text(ctx, t < 7.2 ? String(n) : '45 × 80 lb = 3,600 lb', 100, 1146, { fam: 'mono', size: 56, color: C.blue });
      ctx.restore();
    }
    E.ctaCard(ctx, E.ramp(t, 8.7, 9.2, E.out), 'Bags or a truck?', 'Free concrete bag calculator → link in bio');
    E.chrome(ctx, t, { pillar: 'calculator', series: 'SCALE MORPH', title: ['1 yd³ of concrete', 'in 80 lb bags'], tag: 'ENGIFORMULA' });
  },
};
