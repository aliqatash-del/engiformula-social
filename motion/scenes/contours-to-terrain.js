// Format: MAP TO TERRAIN (contour plan draws, lifts into a 3D surface, then a section cut reads the ground profile).
// Illustrative terrain (no site data): contour interval 2 m, vertical exaggeration 2x.
SCENES['contours-to-terrain'] = {
  duration: 11,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const hf = (x, y) => 100 + 14 * Math.exp(-((x - 12) ** 2 + (y - 8) ** 2) / 520) + 8 * Math.exp(-((x + 24) ** 2 + (y + 20) ** 2) / 320) + 0.06 * x;
    const N = 44, R = 50, st = (2 * R) / N;
    const lift = E.ramp(t, 3.4, 6.0);
    const vex = 2;
    const k = E.ramp(t, 3.0, 5.6);
    const P = E.camera({
      yaw: E.lerp(0, -0.7, k) - 0.35 * E.seg(t, 5.6, 11), pitch: E.lerp(Math.PI / 2, 0.62, k), dist: 900,
      scale: E.lerp(9.0, 8.4, k), cx: 540, cy: E.lerp(840, 880, k), target: [0, 0, E.lerp(0, 12, k)],
    });
    const S = E.scene3d();
    const Z = h => (h - 100) * vex * lift;
    // grid samples
    const H = []; for (let i = 0; i <= N; i++) { H[i] = []; for (let j = 0; j <= N; j++) H[i][j] = hf(-R + i * st, -R + j * st); }
    // marching squares per level
    const drawK = E.ramp(t, 0.4, 2.8);
    for (let lev = 100; lev <= 120; lev += 2) {
      const idx = (lev - 100) / 2, appear = E.clamp(drawK * 11 - idx);
      if (appear <= 0) continue;
      const major = lev % 10 === 0;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const v = [H[i][j], H[i + 1][j], H[i + 1][j + 1], H[i][j + 1]];
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const pts = [];
        for (let e = 0; e < 4; e++) {
          const a = v[e], b = v[(e + 1) % 4];
          if ((a - lev) * (b - lev) < 0) {
            const f = (lev - a) / (b - a), p = c[e], q = c[(e + 1) % 4];
            pts.push([-R + (p[0] + (q[0] - p[0]) * f) * st, -R + (p[1] + (q[1] - p[1]) * f) * st, Z(lev)]);
          }
        }
        for (let m = 0; m + 1 < pts.length; m += 2)
          E.line3(S, P, [pts[m], pts[m + 1]], major ? C.yellow : C.line, major ? 4 : 2.5, { alpha: appear * (major ? 1 : 0.85), layer: 1 });
      }
    }
    // mesh surface
    const mesh = E.ramp(t, 5.4, 6.8);
    if (mesh > 0) {
      for (let i = 0; i <= N; i += 2) {
        const row = [], col = [];
        for (let j = 0; j <= N; j++) { row.push([-R + i * st, -R + j * st, Z(H[i][j])]); col.push([-R + j * st, -R + i * st, Z(H[j][i])]); }
        E.line3(S, P, row, '#FFFFFF', 1.5, { alpha: 0.35 * mesh, layer: 0 });
        E.line3(S, P, col, '#FFFFFF', 1.5, { alpha: 0.35 * mesh, layer: 0 });
      }
    }
    // section A-A at y = 8
    const cut = E.ramp(t, 7.4, 8.6);
    if (cut > 0) {
      const ys = 8, prof = [];
      for (let x = -R; x <= -R + 2 * R * cut + 1e-6; x += 1) prof.push([x, ys, Z(hf(x, ys))]);
      const plane = [[-R, ys, -4], [R, ys, -4], [R, ys, 32], [-R, ys, 32]];
      E.face(S, P, plane, C.blue, { alpha: 0.22 * E.clamp(cut * 3), cull: false, flat: true, layer: 2 });
      if (prof.length > 1) E.line3(S, P, prof, C.orange, 7, { layer: 3 });
    }
    E.flush(ctx, S);
    if (t < 3.4) {
      const a = E.seg(t, 1.5, 2.0) * (1 - E.seg(t, 3.0, 3.4));
      E.text(ctx, 'PLAN · contours every 2 m', 540, 1290, { fam: 'mono', size: 30, color: C.line, align: 'center', alpha: a });
      [['120 m', 12, 8]].forEach(([lv, x, y]) => {
        const q = P([x, y, 0]); E.text(ctx, String(lv), q[0], q[1], { fam: 'mono', size: 26, color: C.yellow, align: 'center', alpha: a, bg: C.navy, pad: 6 });
      });
    }
    const sa = E.seg(t, 8.6, 9.0);
    if (sa > 0) {
      ctx.save(); ctx.globalAlpha = sa;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1150, 952, 120, 16); ctx.fill();
      E.text(ctx, 'Section A–A: the ground profile', 100, 1206, { size: 38, weight: 600, color: C.ink });
      E.text(ctx, 'falls out of the contours', 100, 1250, { size: 32, weight: 500, color: C.muted });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'knowledge', series: 'MAP → TERRAIN', title: ['Read contours', 'in 3D'] });
  },
};
