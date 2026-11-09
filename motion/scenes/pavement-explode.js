// Format: EXPLODED LAYERS (2D section -> 3D slab -> layers lift apart with labels).
// Illustrative flexible pavement build-up (typical, varies by design): 3 in AC, 8 in base, 12 in subbase.
// 3 in = 76 mm, 8 in = 203 mm, 12 in = 305 mm, total 23 in = 584 mm (recomputed in Python). Vertical scale x3.
SCENES['pavement-explode'] = {
  duration: 10.5,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const W = 72, D = 120, vz = 3;
    const layers = [
      { n: 'Asphalt surface', d: '3 in (76 mm)', th: 3, col: '#3A4553' },
      { n: 'Crushed-stone base', d: '8 in (203 mm)', th: 8, col: C.steel },
      { n: 'Granular subbase', d: '12 in (305 mm)', th: 12, col: '#C9B48A' },
      { n: 'Subgrade (native soil)', d: 'compacted', th: 10, col: '#8C6A4A' },
    ];
    const k = E.ramp(t, 2.6, 4.8);
    const ex = E.ramp(t, 5.0, 6.6, E.back);
    const P = E.camera({
      yaw: E.lerp(0, -0.55, k) - 0.15 * E.seg(t, 4.8, 10.5), pitch: E.lerp(0, 0.42, k), dist: 1800,
      scale: E.lerp(6.6, 3.3, k), cx: E.lerp(540, 380, k), cy: E.lerp(900, 880, k), target: [0, E.lerp(0, D / 2, k), 0],
    });
    const S = E.scene3d();
    const len = Math.max(0.5, D * E.ramp(t, 3.0, 4.8));
    let ztop = 0; const tops = [];
    layers.forEach((L, i) => {
      const gap = ex * 9 * (layers.length - 1 - i);
      const z1 = (ztop) * vz + gap, z0 = (ztop - L.th) * vz + gap;
      tops.push([z0, z1]);
      ztop -= L.th;
    });
    // shift so the stack is centred
    const mid = (tops[0][1] + tops[3][0]) / 2;
    layers.forEach((L, i) => {
      const [z0, z1] = tops[i];
      const appear = E.ramp(t, 0.4 + i * 0.35, 1.0 + i * 0.35, E.out);
      if (appear <= 0) return;
      const zz0 = z0 - mid, zz1 = z0 - mid + (z1 - z0) * appear;
      E.box(S, P, [-W, 0, zz0], [W, len, zz1], L.col, { edge: 'rgba(255,255,255,0.35)', lw: 2 });
    });
    E.flush(ctx, S);
    // labels: section view (left) then exploded (right callouts)
    layers.forEach((L, i) => {
      const [z0, z1] = tops[i];
      const zc = (z0 + z1) / 2 - mid;
      const a2 = E.seg(t, 0.8 + i * 0.35, 1.2 + i * 0.35) * (1 - E.seg(t, 2.6, 3.0));
      if (a2 > 0) {
        const q = P([W, 0, zc]);
        E.text(ctx, L.d, q[0] - 20, q[1] + 10, { fam: 'mono', size: 26, color: '#FFFFFF', align: 'right', alpha: a2 });
      }
      const a3 = E.seg(t, 6.2 + i * 0.25, 6.6 + i * 0.25);
      if (a3 > 0) {
        const q = P([W, 0, zc]);
        const lx = 730, ly = q[1] + 8;
        ctx.save(); ctx.globalAlpha = a3; ctx.strokeStyle = C.line; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(q[0] + 6, q[1]); ctx.lineTo(lx - 14, ly - 8); ctx.stroke(); ctx.restore();
        E.text(ctx, L.n, lx, ly - 14, { size: 28, weight: 600, color: '#FFFFFF', alpha: a3 });
        E.text(ctx, L.d, lx, ly + 24, { fam: 'mono', size: 26, color: C.yellow, alpha: a3 });
      }
    });
    E.text(ctx, 'SECTION', 540, 1300, { fam: 'mono', size: 30, color: C.line, align: 'center', alpha: E.seg(t, 0.4, 0.8) * (1 - E.seg(t, 2.6, 3.0)) });
    const r = E.ramp(t, 8.4, 8.9, E.out);
    if (r > 0) {
      ctx.save(); ctx.globalAlpha = r;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1300, 952, 110, 16); ctx.fill();
      E.text(ctx, 'Only the top 3 in is asphalt.', 100, 1352, { size: 38, weight: 600, color: C.ink });
      E.text(ctx, 'Typical build-up · your design governs', 100, 1392, { size: 28, weight: 500, color: C.muted });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'site', series: 'EXPLODED VIEW', title: ["What's under", 'the asphalt'] });
  },
};
