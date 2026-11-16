// CONCRETE SERIES 1/3 · Your slab order is short. Recomputed in Python:
// 20 × 20 ft × 4 in: 20 × 20 × 4/12 = 133.3 ft³ ÷ 27 = 4.94 yd³ (3.78 m³).
// Thickened edge 12 in wide × 8 in extra on the 76 ft centerline: 76 × 1 × 8/12 = 50.7 ft³ = 1.88 yd³ (+38%).
// Subgrade ½ in low under 4 in = +12.5% (+0.62 yd³). Total 184 ft³ = 6.81 yd³ (5.21 m³); +10% = 7.5 yd³.
// Vertical scale exaggerated ×3 in the 3D view. Beats (9): hook | size | formula | 4.94 | flip | edge | subgrade | total | next.
(() => {
  const B = E.beats([6.2, 3.2, 6.2, 5.8, 2.2, 8.9, 7.4, 5.5, 6.6]);
  const Z = 3;
  SCENES['slab-volume'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'blueprint');
      const tilt = E.ramp(t, B[1], B[1] + 2.0);
      const flip = E.ramp(t, B[4], B[4] + 1.6) * (1 - E.ramp(t, B[6] - 0.2, B[6] + 0.6));
      const hookTilt = t < B[1] ? E.ramp(t, 0.2, 1.6) : 1;
      const pitch = t < B[1] ? E.lerp(Math.PI / 2, 0.55, hookTilt) : E.lerp(E.lerp(Math.PI / 2, 0.55, tilt), -0.42, flip);
      const P = E.camera({ yaw: -0.7 + 0.12 * Math.sin(t * 0.3), pitch, dist: 2600, scale: 2.25, cx: 540, cy: 830, target: [0, 0, 0] });
      const sec = E.fade(t, B[6] + 0.4, B[6] + 1.0, B[7], B[7] + 0.4);
      const S = E.scene3d();
      const a3 = 1 - sec;
      if (a3 > 0) {
        const pour = t < B[1] ? E.ramp(t, 0.4, 1.8) : E.ramp(t, B[2], B[2] + 2.0) || 0;
        const fill = t < B[1] ? pour : Math.max(E.ramp(t, B[1] + 0.2, B[1] + 0.3) * 0, pour);
        // outline
        const o = [[-120, -120, 4 * Z], [120, -120, 4 * Z], [120, 120, 4 * Z], [-120, 120, 4 * Z]];
        for (let i = 0; i < 4; i++) E.line3(S, P, [o[i], o[(i + 1) % 4]], '#FFFFFF', 3, { layer: 3, alpha: 1 - E.clamp(fill) * 0.8 });
        if (fill > 0) E.box(S, P, [-120, -120, 0], [120, 120, 4 * Z * Math.max(0.05, fill)], C.concrete, { edge: 'rgba(14,42,71,0.35)' });
        const edge = t < B[1] ? E.fade(t, 3.6, 4.0, 5.6, 6.0) : E.ramp(t, B[5] + 0.3, B[5] + 1.6);
        if (edge > 0) {
          const d = -8 * Z * edge, col = C.orange;
          E.box(S, P, [-120, -120, d], [120, -108, 0], col, { edge: 'rgba(14,42,71,0.35)' });
          E.box(S, P, [-120, 108, d], [120, 120, 0], col, { edge: 'rgba(14,42,71,0.35)' });
          E.box(S, P, [-120, -108, d], [-108, 108, 0], col, { edge: 'rgba(14,42,71,0.35)' });
          E.box(S, P, [108, -108, d], [120, 108, 0], col, { edge: 'rgba(14,42,71,0.35)' });
        }
        ctx.save(); ctx.globalAlpha = a3; E.flush(ctx, S); ctx.restore();
        const dk = E.fade(t, B[1] + 0.3, B[1] + 0.8, B[3] + 3, B[3] + 3.4);
        if (dk > 0) {
          E.dim(ctx, P([-120, -120, 4 * Z]), P([120, -120, 4 * Z]), 50, '20 ft', dk, '#FFFFFF');
          E.dim(ctx, P([120, -120, 4 * Z]), P([120, 120, 4 * Z]), 50, '20 ft', dk, '#FFFFFF');
        }
        const ek = E.fade(t, B[5] + 1.6, B[5] + 2.0, B[6], B[6] + 0.3);
        if (ek > 0) {
          const p = P([0, -120, -8 * Z]);
          E.text(ctx, 'thickened edge: 12 in wide, +8 in deep', 540, Math.min(980, p[1] + 70), { fam: 'mono', size: 30, color: C.orange, align: 'center', alpha: ek, bg: C.navy });
        }
        if (flip > 0.5) E.text(ctx, 'VIEW FROM BELOW · vertical scale ×3', 540, 990, { fam: 'mono', size: 22, color: C.line, align: 'center', alpha: (flip - 0.5) * 2 * a3 });
      }
      // subgrade section
      if (sec > 0) {
        ctx.save(); ctx.globalAlpha = sec;
        const y0 = 700, th = 80, dip = 20 * E.ramp(t, B[6] + 1.2, B[6] + 2.4); // 4 in = 80 px, ½ in = 10 px (shown ×2)
        ctx.fillStyle = 'rgba(140,106,74,0.45)'; ctx.fillRect(64, y0 + th, 952, 200);
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(140, y0 + th);
        for (let x = 140; x <= 940; x += 10) { const u = (x - 140) / 800; ctx.lineTo(x, y0 + th + dip * Math.sin(Math.PI * u)); }
        ctx.lineTo(940, y0 + th); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.concrete; ctx.fillRect(64, y0, 952, th);
        E.text(ctx, '4 in slab', 100, y0 + 52, { fam: 'mono', size: 30, color: C.navy });
        E.text(ctx, '½ in low = +½ in of concrete', 540, y0 + th + 80, { fam: 'mono', size: 32, color: '#FFFFFF', align: 'center', alpha: E.seg(t, B[6] + 2.2, B[6] + 2.8) });
        E.text(ctx, 'SECTION · dip shown ×2', 540, 990, { fam: 'mono', size: 22, color: C.line, align: 'center' });
        ctx.restore();
      }
      // running counter (top right)
      const v = t < B[1] ? 4.94 * E.ramp(t, 0.4, 1.8) : t < B[3] ? 0 : t < B[5] + 0.3 ? 4.94 : t < B[7] ? (133.33 + 50.67 * E.ramp(t, B[5] + 0.3, B[5] + 1.6)) / 27 : 6.81 + 0.69 * E.ramp(t, B[7] + 2.0, B[7] + 3.0);
      const ca = t < B[1] ? E.seg(t, 0.4, 0.8) : E.seg(t, B[3], B[3] + 0.4);
      E.text(ctx, `${v.toFixed(2)} yd³`, 1016, 640, { fam: 'mono', size: 56, color: v > 6 ? C.orange : '#FFFFFF', align: 'right', alpha: ca * (t > B[8] + 0.5 ? 1 - E.seg(t, B[8] + 0.5, B[8] + 1) : 1) });
      E.text(ctx, '− 1.88 yd³ missing', 1016, 690, { fam: 'mono', size: 30, color: C.red, align: 'right', alpha: E.fade(t, 3.6, 4.0, B[1] - 0.3, B[1]) });
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(2, 0.3, 1, 'V = L × W × T, all in feet: 4 in = 4/12 ft', '20 × 20 × 4/12 = 133.3 ft³', { s1: 30, s2: 46 });
      c(3, 0.3, 1, '133.3 ft³ ÷ 27 ft³ per yd³', `= ${E.count(4.94, E.seg(t, B[3] + 0.6, B[3] + 1.8), 2)} yd³`, { note: '(3.78 m³)' });
      c(5, 2.2, 1, 'edge: 76 ft × 1 ft × 8/12 ft = 50.7 ft³', '+ 1.88 yd³', { c2: C.orange, note: '+38%' });
      c(6, 2.6, 1, '½ in low ÷ 4 in slab', '+ 12.5%', { c2: C.orange, note: '(+0.62 yd³)' });
      c(7, 0.3, 1, '133.3 + 50.7 = 184 ft³ = 6.81 yd³', '+10% → order 7.5 yd³', { note: '(5.2 m³ net)' });
      E.rehook(ctx, t, B[4], 'Now flip it over');
      E.rehook(ctx, t, B[6], "The half inch you can't see");
      E.nextCard(ctx, E.ramp(t, B[8] + 0.8, B[8] + 1.4, E.out), 'NEXT · CONCRETE SERIES PART 2', 'A whole basement in yards', 'Free concrete calculator → link in bio');
      E.parts(ctx, t, 1, true);
      E.chrome(ctx, t, { pillar: 'calculator', series: 'CONCRETE SERIES · PART 1', title: ['Your slab order', 'is short'], tag: 'ENGIFORMULA' });
    },
  };
})();
