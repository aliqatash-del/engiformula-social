// Format: US vs UK SPLIT. 1 yd = 0.9144 m, so 1 m = 1.094 yd and 1 m3 = 1.094^3 = 1.308 yd3;
// 1 yd3 = 0.765 m3 (recomputed in Python). A cubic metre is about 31% bigger than a cubic yard.
SCENES['yard-vs-metre'] = {
  duration: 10,
  beats: [0, 1.5, 3.0, 4.6, 6.6, 8.4, 10], // two cubes | yard | metre | overlay | conversion | CTA
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const Y = 36, M = 39.37; // inches
    const merge = E.ramp(t, 4.6, 6.2);
    const k = E.ramp(t, 0.1, 1.2);
    const cube = (P, s, color, alpha, layer, draw) => {
      const v = [[0, 0, 0], [s, 0, 0], [s, s, 0], [0, s, 0]], w = v.map(p => [p[0], p[1], s]);
      const ed = []; for (let i = 0; i < 4; i++) ed.push([v[i], v[(i + 1) % 4]], [w[i], w[(i + 1) % 4]], [v[i], w[i]]);
      return ed;
    };
    const S = E.scene3d();
    const camFor = (cx) => E.camera({ yaw: -0.62 - 0.15 * E.seg(t, 1, 10), pitch: E.lerp(0, 0.45, k), dist: 1400, scale: 6.4, cx, cy: 790, target: [M / 2, M / 2, M / 2] });
    const PL = camFor(E.lerp(290, 540, merge)), PR = camFor(E.lerp(790, 540, merge));
    const dk = E.ramp(t, 0.05, 1.3);
    const edgesY = cube(null, Y), edgesM = cube(null, M);
    const drawEdges = (P, edges, color, lw) => edges.forEach((e, i) => { const a = E.clamp(dk * 12 - i); if (a > 0) E.line3(S, P, [e[0], [E.lerp(e[0][0], e[1][0], a), E.lerp(e[0][1], e[1][1], a), E.lerp(e[0][2], e[1][2], a)]], color, lw, { layer: 2 }); });
    // filled faces fade in once both are drawn
    const fa = E.ramp(t, 1.2, 1.8) * (1 - 0.6 * merge);
    if (fa > 0) {
      E.box(S, PR, [0, 0, 0], [M, M, M], C.orange, { alpha: 0.55 * fa, layer: 0 });
      E.box(S, PL, [0, 0, 0], [Y, Y, Y], C.blue, { alpha: 0.75 * fa, layer: 1 });
    }
    drawEdges(PR, edgesM, C.orange, 4);
    drawEdges(PL, edgesY, '#FFFFFF', 4);
    E.flush(ctx, S);
    const la = E.fade(t, 1.5, 2.0, 4.4, 4.7);
    E.text(ctx, '1 yd³', 290, 560, { fam: 'title', weight: 700, size: 52, color: '#FFFFFF', align: 'center', alpha: E.seg(t, 0.8, 1.2) * (1 - merge) });
    E.text(ctx, '1 m³', 790, 560, { fam: 'title', weight: 700, size: 52, color: C.orange, align: 'center', alpha: E.seg(t, 0.8, 1.2) * (1 - merge) });
    E.text(ctx, '3 ft = 0.914 m', 290, 1060, { fam: 'mono', size: 30, color: '#FFFFFF', align: 'center', alpha: E.fade(t, 1.6, 2.0, 4.4, 4.7) });
    E.text(ctx, '1 m = 3.28 ft', 790, 1060, { fam: 'mono', size: 30, color: C.orange, align: 'center', alpha: E.fade(t, 3.1, 3.5, 4.4, 4.7) });
    const ov = E.fade(t, 5.4, 5.8, 6.5, 6.7);
    if (ov > 0) E.text(ctx, 'a cubic metre is 31% bigger', 540, 1080, { fam: 'mono', size: 36, color: C.yellow, align: 'center', alpha: ov, bg: C.navy });
    const ca = E.ramp(t, 6.7, 7.2, E.out) * (1 - E.seg(t, 8.4, 8.7));
    if (ca > 0) {
      ctx.save(); ctx.globalAlpha = ca;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1010, 952, 170, 16); ctx.fill();
      E.text(ctx, '1 m³ = 1.308 yd³', 100, 1076, { fam: 'mono', size: 44, color: C.blue });
      E.text(ctx, '1 yd³ = 0.765 m³', 100, 1146, { fam: 'mono', size: 44, color: C.ink });
      ctx.restore();
    }
    E.ctaCard(ctx, E.ramp(t, 8.5, 9.0, E.out), 'Ordering from the other side?', 'Free yd³ ↔ m³ converter → link in bio');
    E.chrome(ctx, t, { pillar: 'calculator', series: 'US vs UK', title: ['Cubic yard vs', 'cubic metre'], tag: 'ENGIFORMULA' });
  },
};
