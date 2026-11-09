// Format: FLOW + SECTION (pipe section fills, extrudes into a sloped run, flow particles show direction, slope reads out).
// 1% slope: 0.01 x 100 ft = 1.00 ft = 12 in of fall (recomputed in Python). Slope exaggerated x8 for visibility.
SCENES['pipe-slope'] = {
  duration: 10,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const r = 9, Lp = 240, ex = 25, fall = 0.01 * Lp * ex; // world units: inches-ish, slope exaggerated
    const k = E.ramp(t, 2.6, 4.8);
    const P = E.camera({ yaw: E.lerp(0, -1.35, k), pitch: E.lerp(0, 0.12, k), dist: 1600, scale: E.lerp(20, 3.5, k), cx: 540, cy: E.lerp(860, 860, k), target: [0, E.lerp(0, Lp / 2, k), E.lerp(0, -fall / 2, k)] });
    const S = E.scene3d();
    const zc = y => -fall * (y / Lp);
    const len = Math.max(0.5, Lp * E.ramp(t, 3.0, 4.8));
    const fill = E.ramp(t, 1.0, 2.2);
    // 2D section: circle + water segment
    const a2 = 1 - E.seg(t, 3.0, 3.6);
    if (a2 > 0) {
      const c = P([0, 0, 0]), R = r * 30;
      ctx.save(); ctx.globalAlpha = a2;
      const d = 0.5 * fill; // depth ratio
      const h = -R + 2 * R * d, ang = Math.acos(Math.max(-1, Math.min(1, -h / R)));
      ctx.fillStyle = E.alpha(C.blue, 0.85); ctx.beginPath();
      ctx.arc(c[0], c[1], R, Math.PI / 2 - ang, Math.PI / 2 + ang); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c[0], c[1], R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * E.ramp(t, 0.2, 1.0)); ctx.stroke();
      E.text(ctx, 'half full', c[0], c[1] + R + 70, { fam: 'mono', size: 32, color: C.line, align: 'center', alpha: E.seg(t, 1.6, 2.0) });
      ctx.restore();
    }
    if (t > 3.0) {
      const N = 14;
      const ring = y => Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; return [r * Math.cos(a), zc(y) + r * Math.sin(a)]; });
      const ys = Array.from({ length: 13 }, (_, i) => (len * i) / 12);
      E.sweepY(S, P, ring, ys, C.steel, { alpha: 0.35, cull: false, layer: 2 });
      // water strip (bottom half) as a flat ribbon plus moving particles
      for (let i = 0; i < 12; i++) {
        const y0 = ys[i], y1 = ys[i + 1];
        E.face(S, P, [[-r, y0, zc(y0)], [r, y0, zc(y0)], [r, y1, zc(y1)], [-r, y1, zc(y1)]], C.blue, { cull: false, flat: true, alpha: 0.9, layer: 1 });
      }
      const pa = E.seg(t, 4.6, 5.0);
      for (let j = 0; j < 26; j++) {
        const y = ((j * 37 + t * 60) % Lp);
        if (y > len - 4) continue;
        const x = ((j * 53) % 9) - 4;
        E.line3(S, P, [[x, y, zc(y) + 0.3], [x, y + 8, zc(y + 8) + 0.3]], '#FFFFFF', 4, { alpha: pa, layer: 3 });
      }
    }
    E.flush(ctx, S);
    const d1 = E.ramp(t, 5.2, 6.0);
    if (d1 > 0) {
      const a = P([r + 2, 0, zc(0)]), b = P([r + 2, Lp, zc(Lp)]), b0 = P([r + 2, Lp, zc(0)]);
      ctx.save(); ctx.globalAlpha = d1; ctx.setLineDash([10, 8]); ctx.strokeStyle = C.yellow; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(...a.slice(0, 2)); ctx.lineTo(...b0.slice(0, 2)); ctx.lineTo(...b.slice(0, 2)); ctx.stroke(); ctx.restore();
      E.text(ctx, '1 ft fall', b[0] - 20, (b[1] + b0[1]) / 2, { fam: 'mono', size: 32, color: C.yellow, alpha: d1, align: 'right' });
      E.text(ctx, 'slope exaggerated', 540, 1120, { fam: 'mono', size: 24, color: C.line, alpha: d1 * 0.7, align: 'center' });
      E.text(ctx, '100 ft run', (a[0] + b0[0]) / 2, (a[1] + b0[1]) / 2 - 24, { fam: 'mono', size: 32, color: C.yellow, alpha: d1, align: 'center' });
    }
    const f = E.ramp(t, 6.6, 7.2, E.out);
    if (f > 0) {
      ctx.save(); ctx.globalAlpha = f;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1200, 952, 140, 16); ctx.fill();
      E.text(ctx, '1% = 0.01 × 100 ft', 100, 1258, { fam: 'mono', size: 38, color: C.muted });
      E.text(ctx, '= 1 ft (12 in) of fall', 100, 1316, { fam: 'mono', size: 46, color: C.blue });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'calculator', series: 'FLOW', title: ['What 1% slope', 'really means'] });
  },
};
