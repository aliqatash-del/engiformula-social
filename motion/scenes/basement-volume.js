// CONCRETE SERIES 2/3 · A whole basement in yards. 30 × 40 ft basement, 8 in walls, recomputed in Python:
// centerline 2 × (29.33 + 39.33) = 137.3 ft. Footing 20 × 10 in: 1.667 × 0.833 × 137.3 = 190.7 ft³ = 7.06 yd³.
// Walls 8 in × 8 ft: 0.667 × 8 × 137.3 = 732.4 ft³ = 27.13 yd³. Slab 4 in inside: 28.67 × 38.67 × 0.333 = 369.5 ft³ = 13.68 yd³.
// Total 47.88 yd³ (36.6 m³); walls 56.7%. Outside perimeter 140 ft instead of 137.3 adds 0.53 yd³ to the walls.
// Beats (9): hook | footing | centerline | walls! | wall size | slab | total | corners | next.
(() => {
  const B = E.beats([7.8, 3.9, 5.8, 3.5, 4.7, 4.7, 5.8, 7.4, 7.4]);
  const parts = [['footing', 7.06, '#BFC7D2'], ['walls', 27.13, '#F26A1B'], ['slab', 13.68, '#E6E8EB']];
  SCENES['basement-volume'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'blueprint');
      const hook = t < B[1];
      const fk = hook ? E.ramp(t, 0.3, 1.0) : E.ramp(t, B[1] + 0.3, B[2] + 1.0);
      const wk = hook ? E.ramp(t, 1.0, 1.8) : E.ramp(t, B[3] + 0.3, B[4] + 0.8);
      const sk = hook ? E.ramp(t, 1.8, 2.4) : E.ramp(t, B[5] + 0.2, B[5] + 1.6);
      const P = E.camera({ yaw: -0.65 + 0.25 * Math.sin(t * 0.12), pitch: 0.6, dist: 3200, scale: 1.4, cx: 540, cy: 900, target: [0, 0, 30] });
      const S = E.scene3d();
      E.ground(S, P, -300, 300, -240, 240, 48, 0.25, -10);
      const fc = C.concrete, ed = 'rgba(14,42,71,0.35)';
      if (fk > 0) {
        const z = -10 + 10 * fk;
        E.box(S, P, [-246, 166, -10], [246, 186, z], '#BFC7D2', { edge: ed });
        E.box(S, P, [-246, -186, -10], [246, -166, z], '#BFC7D2', { edge: ed });
        E.box(S, P, [-246, -166, -10], [-226, 166, z], '#BFC7D2', { edge: ed });
        E.box(S, P, [226, -166, -10], [246, 166, z], '#BFC7D2', { edge: ed });
      }
      // centerline
      const cl = E.fade(t, B[2], B[2] + 0.4, B[3], B[3] + 0.4) + E.fade(t, B[7] + 0.2, B[7] + 0.6, B[8], B[8] + 0.4);
      if (cl > 0) { const r = [[-236, -176, 1], [236, -176, 1], [236, 176, 1], [-236, 176, 1]]; for (let i = 0; i < 4; i++) E.line3(S, P, [r[i], r[(i + 1) % 4]], C.yellow, 5, { layer: 5, dash: [14, 10], alpha: E.clamp(cl) }); }
      if (wk > 0) {
        const h = 96 * wk, wc = t > B[4] + 0.8 && t < B[6] ? C.orange : C.concrete;
        E.box(S, P, [-240, 172, 0], [240, 180, h], wc, { edge: ed });
        E.box(S, P, [-240, -180, 0], [240, -172, h], wc, { edge: ed });
        E.box(S, P, [-240, -172, 0], [-232, 172, h], wc, { edge: ed });
        E.box(S, P, [232, -172, 0], [240, 172, h], wc, { edge: ed });
      }
      if (sk > 0) E.box(S, P, [-232, -172, 0], [232, 172, 4 * Math.max(0.1, sk)], fc, { edge: ed });
      // corners counted twice
      const cn = E.ramp(t, B[7] + 0.6, B[7] + 1.4) * (1 - E.seg(t, B[8], B[8] + 0.4));
      if (cn > 0) [[-240, -180], [232, -180], [232, 172], [-240, 172]].forEach(([x, y]) => E.box(S, P, [x, y, 0], [x + 8, y + 8, 96 + 30 * cn * (0.5 + 0.5 * Math.sin(t * 8))], C.red, { layer: 2 }));
      E.flush(ctx, S);
      // dims
      const dm = E.fade(t, B[1] + 0.6, B[1] + 1.0, B[3], B[3] + 0.3);
      if (dm > 0) E.text(ctx, 'footing 20 in × 10 in', 540, 1000, { fam: 'mono', size: 30, color: '#FFFFFF', align: 'center', alpha: dm, bg: C.navy });
      const dw = E.fade(t, B[4] + 0.2, B[4] + 0.6, B[5], B[5] + 0.3);
      if (dw > 0) E.text(ctx, 'wall 8 in × 8 ft', 540, 1000, { fam: 'mono', size: 30, color: C.orange, align: 'center', alpha: dw, bg: C.navy });
      // stacked bar
      const vals = hook ? [fk, wk, sk] : [fk, E.ramp(t, B[4], B[4] + 1.2), sk];
      let x = 64; const W = 952;
      ctx.save(); ctx.globalAlpha = E.seg(t, 0.2, 0.6);
      ctx.fillStyle = 'rgba(207,224,255,0.12)'; E.rrect(ctx, 64, 610, W, 56, 10); ctx.fill();
      let total = 0;
      parts.forEach(([n, v, col], i) => {
        const w = W * v / 47.88 * vals[i]; total += v * vals[i];
        if (w > 1) { ctx.fillStyle = col; ctx.fillRect(x, 610, w, 56); if (w > 120) E.text(ctx, `${n} ${v.toFixed(i === 0 ? 2 : i === 1 ? 1 : 1)}`, x + 12, 648, { fam: 'mono', size: 24, color: C.navy }); }
        x += w;
      });
      E.text(ctx, `${total.toFixed(1)} yd³`, 1016, 720, { fam: 'mono', size: 52, color: '#FFFFFF', align: 'right' });
      ctx.restore();
      const pc = E.fade(t, 3.6, 4.0, B[1] - 0.3, B[1]) + E.fade(t, B[6] + 2.4, B[6] + 2.8, B[7], B[7] + 0.3);
      if (pc > 0) E.text(ctx, 'walls = 57%', 64, 720, { fam: 'mono', size: 40, color: C.orange, alpha: E.clamp(pc) });
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(2, 0.6, 1, 'centerline: 2 × (29.33 + 39.33) = 137.3 ft', '1.667 × 0.833 × 137.3 = 7.06 yd³', { s1: 30, s2: 40 });
      c(4, 0.8, 1, '0.667 ft × 8 ft × 137.3 ft = 732 ft³', '= 27.13 yd³', { c2: C.orange });
      c(5, 1.0, 1, '28.67 × 38.67 × 4/12 = 369.5 ft³', '= 13.68 yd³', {});
      c(6, 0.3, 1, '7.06 + 27.13 + 13.68', '= 47.88 yd³', { note: '(36.6 m³)' });
      c(7, 2.2, 1, 'outside perimeter 140 ft vs 137.3 ft', '+0.53 yd³ of wall', { c2: C.red, note: 'use the centerline' });
      E.rehook(ctx, t, B[3], 'This is the big one');
      E.rehook(ctx, t, B[7], 'Measuring the outside?');
      E.nextCard(ctx, E.ramp(t, B[8] + 1.6, B[8] + 2.2, E.out), 'NEXT · CONCRETE SERIES PART 3', '48 yards: how many trucks?', 'Free concrete calculator → link in bio');
      E.parts(ctx, t, 2, true);
      E.chrome(ctx, t, { pillar: 'calculator', series: 'CONCRETE SERIES · PART 2', title: ['A whole basement', 'in yards'], tag: 'ENGIFORMULA' });
    },
  };
})();
