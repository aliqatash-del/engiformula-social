// Format: PLAN TO SOLID + LIVE CALCULATOR (plan view tilts up, footing extrudes, rebar mat drops, concrete pours, counter runs).
// Example: 6 x 6 ft footing, 18 in thick: 6 x 6 x 1.5 = 54 ft3 = 2.00 yd3 (1.53 m3), recomputed in Python.
SCENES['plan-to-footing'] = {
  duration: 11.5,
  beats: [0, 1.3, 2.6, 5.4, 6.6, 8.4, 9.8, 11.5], // plan | column+dims | mat | extrude | pour | volume | CTA
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const B = 36, T = 18, c = 8, colH = 54; // half-width, thickness, half column, column height above footing (in)
    const k = E.ramp(t, 3.2, 5.6);
    const P = E.camera({
      yaw: E.lerp(0, -0.6, k) - 0.25 * E.seg(t, 5.6, 11), pitch: E.lerp(Math.PI / 2, 0.5, k), dist: 2400,
      scale: E.lerp(6.6, 5.6, k), cx: 540, cy: E.lerp(840, 800, k), target: [0, 0, E.lerp(0, 22, k)],
    });
    const S = E.scene3d();
    E.ground(S, P, -96, 96, -96, 96, 12, 0.3 * k, 0);

    // 2D plan phase
    const a2d = 1 - E.seg(t, 3.6, 4.4);
    if (a2d > 0) {
      ctx.save(); ctx.globalAlpha = a2d;
      const sq = [[-B, -B, T], [B, -B, T], [B, B, T], [-B, B, T]].map(P);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; E.path(ctx, sq, E.ramp(t, 0.05, 0.9), true);
      const col = [[-c, -c, T], [c, -c, T], [c, c, T], [-c, c, T]].map(P);
      const ck = E.ramp(t, 1.4, 2.0);
      ctx.fillStyle = E.alpha(C.line, 0.25 * ck); ctx.beginPath(); col.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; E.path(ctx, col, ck, true);
      ctx.beginPath(); ctx.moveTo(...col[0]); ctx.lineTo(...col[2]); ctx.moveTo(...col[1]); ctx.lineTo(...col[3]); ctx.globalAlpha = a2d * ck; ctx.stroke();
      ctx.globalAlpha = a2d;
      ctx.setLineDash([14, 10]); ctx.strokeStyle = C.orange; ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const v = -30 + i * 10, kk = E.ramp(t, 1.8 + i * 0.06, 2.4 + i * 0.06);
        E.path(ctx, [P([-33, v, T]), P([33, v, T])], kk); E.path(ctx, [P([v, -33, T]), P([v, 33, T])], kk);
      }
      ctx.setLineDash([]);
      E.dim(ctx, sq[3], sq[2], 60, '6 ft', E.ramp(t, 1.2, 2.0));
      E.dim(ctx, sq[2], sq[1], 60, '6 ft', E.ramp(t, 1.4, 2.2));
      E.text(ctx, 'PLAN', 540, 1260, { fam: 'mono', size: 30, color: C.line, align: 'center', alpha: E.seg(t, 0.6, 1.0) });
      ctx.restore();
    }

    // 3D phase
    if (t > 3.6) {
      const th = T * E.ramp(t, 3.9, 5.4);            // footing extrudes (wire)
      const mat = E.ramp(t, 5.4, 6.2, E.back);       // rebar mat drops in
      const pour = E.ramp(t, 6.6, 7.8);
      const colk = E.ramp(t, 7.8, 8.8, E.out);
      const zMat = 3 + 30 * (1 - mat);
      if (mat > 0) for (let i = 0; i < 7; i++) {
        const v = -30 + i * 10;
        E.rodY(S, P, v, zMat, 0.9, -33, 33, C.orange, 6, { alpha: E.clamp(mat * 2) });
        E.line3(S, P, [[-33, v, zMat + 1.2], [33, v, zMat + 1.2]], C.orange, 5, { alpha: E.clamp(mat * 2) });
      }
      const g = 1 - pour;
      if (g > 0 && th > 0.2) {
        const lo = [[-B, -B, 0], [B, -B, 0], [B, B, 0], [-B, B, 0]], hi = lo.map(p => [p[0], p[1], th]);
        for (let i = 0; i < 4; i++) {
          E.line3(S, P, [lo[i], lo[(i + 1) % 4]], '#FFFFFF', 3, { alpha: g, layer: 2 });
          E.line3(S, P, [hi[i], hi[(i + 1) % 4]], '#FFFFFF', 3, { alpha: g, layer: 2 });
          E.line3(S, P, [lo[i], hi[i]], '#FFFFFF', 3, { alpha: g, layer: 2 });
        }
      }
      if (pour > 0) E.box(S, P, [-B, -B, 0], [B, B, T * pour], C.concrete, { edge: 'rgba(14,42,71,0.35)', layer: 1 });
      if (colk > 0) E.box(S, P, [-c, -c, T], [c, c, T + colH * colk], C.steel, { edge: 'rgba(14,42,71,0.4)', layer: 1 });
    }
    E.flush(ctx, S);

    // live calculator card
    const r = E.ramp(t, 6.6, 7.1, E.out) * (1 - E.seg(t, 9.9, 10.2));
    if (r > 0) {
      ctx.save(); ctx.globalAlpha = r;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1010, 952, 170, 16); ctx.fill();
      const steps = ['6 ft', '6 ft × 6 ft', '6 × 6 × 1.5 ft', '6 × 6 × 1.5 = 54 ft³'];
      const si = Math.min(3, Math.floor(E.seg(t, 6.8, 8.4) * 4));
      E.text(ctx, steps[si], 100, 1076, { fam: 'mono', size: 38, color: C.muted });
      const v = E.seg(t, 8.4, 9.6);
      E.text(ctx, `÷ 27 = ${E.count(2.0, v, 2)} yd³`, 100, 1146, { fam: 'mono', size: 52, color: C.blue, alpha: E.clamp(v * 4) });
      E.text(ctx, '(1.53 m³)', 980, 1146, { fam: 'mono', size: 30, color: C.muted, align: 'right', alpha: E.seg(t, 9.6, 10) });
      ctx.restore();
    }
    E.ctaCard(ctx, E.ramp(t, 10.0, 10.5, E.out), 'Any footing, any size', 'Free footing calculator → link in bio');
    E.chrome(ctx, t, { pillar: 'calculator', series: 'PLAN → SOLID', title: ['Concrete for a', '6 × 6 ft footing'], tag: 'ENGIFORMULA' });
  },
};
