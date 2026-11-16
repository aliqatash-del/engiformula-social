// BEAM SERIES 3/3 · How deep should a beam be? 6 m span, recomputed in Python:
// ACI 318-19 Table 9.3.1.1 (fy 60 ksi, normal weight): L/16 = 375 mm (14.8 in), L/18.5 = 324, L/21 = 286, cantilever L/8 = 750 mm.
// EN 1992-1-1:2004 Table 7.4N (recommended): simply supported K = 1.0, L/d = 14 (ρ 1.5%) → 429 mm, 20 (ρ 0.5%) → 300 mm;
// cantilever K = 0.4 → L/d 5.6–8 → d 1071–750 mm. Part 1: cantilever deflects 48× the fixed beam.
// Beats (9): hook | ACI | 375 | table | EC2 | 14–20 | cantilever | 48× | next/loop.
(() => {
  const B = E.beats([7.4, 3.9, 4.7, 6.6, 4.7, 7.8, 3.5, 4.7, 9.3]);
  SCENES['beam-depth'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'paper');
      const x0 = 150, x1 = 930, yc = 830, s = 0.13; // px per mm of depth (same scale as span: 780 px = 6000 mm)
      // depth (mm) and support mode through the story
      let h = 375 * E.ramp(t, 0.4, 2.0), mode = 'simple', lab = 'h = 375 mm';
      const bi = E.beatOf(t, B);
      if (bi === 3) { const k = E.seg(t, B[3], B[4]); const m = k < 0.33 ? 0 : k < 0.66 ? 1 : 2; mode = ['one', 'both', 'cant'][m]; h = [324, 286, 750][m]; lab = ['L/18.5 = 324 mm', 'L/21 = 286 mm', 'L/8 = 750 mm'][m]; }
      if (bi === 4 || bi === 5) { const r = E.ramp(t, B[5] + 0.5, B[5] + 4.5); h = E.lerp(300, 429, r); lab = `d = ${Math.round(h)} mm`; }
      if (bi === 6 || bi === 7) { mode = 'cant'; const r = E.ramp(t, B[6] + 0.4, B[6] + 2.4); h = E.lerp(750, 1071, r); lab = `d = ${Math.round(h)} mm`; }
      if (bi === 8) { mode = 'both'; h = E.lerp(1071, 286, E.ramp(t, B[8], B[8] + 1.2)); lab = 'L/21 = 286 mm'; }
      const hp = h * s;
      // supports
      const pin = (x, r) => { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(x, yc + hp / 2); ctx.lineTo(x - 26, yc + hp / 2 + 44); ctx.lineTo(x + 26, yc + hp / 2 + 44); ctx.closePath(); ctx.fill(); if (r) { ctx.beginPath(); ctx.arc(x - 13, yc + hp / 2 + 56, 9, 0, 7); ctx.arc(x + 13, yc + hp / 2 + 56, 9, 0, 7); ctx.fill(); } };
      if (mode === 'simple') { pin(x0, 0); pin(x1, 1); }
      if (mode === 'one') { pin(x0, 0); E.wall(ctx, x1, yc - 90, yc + 90, 36, 1); }
      if (mode === 'both') { E.wall(ctx, x0, yc - 90, yc + 90, 36, -1); E.wall(ctx, x1, yc - 90, yc + 90, 36, 1); }
      if (mode === 'cant') E.wall(ctx, x0, yc - 90, yc + 90, 36, -1);
      // beam
      ctx.fillStyle = C.concrete; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.fillRect(x0, yc - hp / 2, x1 - x0, hp); ctx.strokeRect(x0, yc - hp / 2, x1 - x0, hp);
      ctx.strokeStyle = C.orange; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0 + 10, yc + hp / 2 - 8); ctx.lineTo(x1 - 10, yc + hp / 2 - 8); ctx.stroke();
      // depth dim
      ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1 + 40, yc - hp / 2); ctx.lineTo(x1 + 40, yc + hp / 2); ctx.moveTo(x1 + 30, yc - hp / 2); ctx.lineTo(x1 + 50, yc - hp / 2); ctx.moveTo(x1 + 30, yc + hp / 2); ctx.lineTo(x1 + 50, yc + hp / 2); ctx.stroke();
      E.text(ctx, lab, 540, yc - hp / 2 - 24, { fam: 'mono', size: 36, color: C.blue, align: 'center', alpha: E.seg(t, 0.8, 1.2) });
      E.text(ctx, 'L = 6 m · drawn to scale', 540, yc + Math.max(hp / 2, 40) + 100, { fam: 'mono', size: 26, color: C.muted, align: 'center', alpha: E.seg(t, 0.8, 1.2) * (bi <= 2 ? 1 : 0) });
      const big = bi <= 2 ? 'L/16' : bi === 3 ? ['L/18.5', 'L/21', 'L/8'][E.seg(t, B[3], B[4]) < 0.33 ? 0 : E.seg(t, B[3], B[4]) < 0.66 ? 1 : 2] : bi <= 5 ? 'L/d 20 → 14' : bi <= 7 ? '× 0.4' : 'L/21';
      E.text(ctx, big, 540, 690, { fam: 'title', weight: 700, size: 120, color: bi >= 6 && bi <= 7 ? C.red : C.orange, align: 'center', alpha: E.seg(t, 1.0, 1.6) });
      // ACI table
      const tb = E.fade(t, B[3] + 0.2, B[3] + 0.6, B[4], B[4] + 0.4);
      if (tb > 0) {
        ctx.save(); ctx.globalAlpha = tb;
        const rows0 = 0; const rows = [['simply supported', 'L/16', '375'], ['one end continuous', 'L/18.5', '324'], ['both ends continuous', 'L/21', '286'], ['cantilever', 'L/8', '750']];
        const k = E.seg(t, B[3], B[4]), cur = k < 0.33 ? 1 : k < 0.66 ? 2 : 3;
        rows.forEach((r, i) => { const y = 1000 + i * 44; const on = i === cur; E.text(ctx, r[0], 64, y, { fam: 'mono', size: 28, color: on ? C.blue : C.muted }); E.text(ctx, r[1], 640, y, { fam: 'mono', size: 28, color: on ? C.blue : C.muted }); E.text(ctx, `${r[2]} mm`, 1016, y, { fam: 'mono', size: 28, color: on ? C.blue : C.muted, align: 'right' }); });
        ctx.restore();
      }
      // EC2 slider
      const sl = E.fade(t, B[5] + 0.2, B[5] + 0.6, B[6], B[6] + 0.3);
      if (sl > 0) {
        ctx.save(); ctx.globalAlpha = sl;
        const r = E.ramp(t, B[5] + 0.5, B[5] + 4.5), sx = 120, sw = 840, sy = 960;
        ctx.strokeStyle = C.grid; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy); ctx.stroke();
        ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw * r, sy); ctx.stroke();
        ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(sx + sw * r, sy, 18, 0, 7); ctx.fill();
        E.text(ctx, 'ρ 0.5% · L/d 20', sx, sy + 56, { fam: 'mono', size: 28, color: C.muted });
        E.text(ctx, 'ρ 1.5% · L/d 14', sx + sw, sy + 56, { fam: 'mono', size: 28, color: C.muted, align: 'right' });
        ctx.restore();
      }
      const cb = E.fade(t, B[7] + 0.3, B[7] + 0.8, B[8], B[8] + 0.3);
      if (cb > 0) E.text(ctx, 'PART 1: cantilever sags 48× the fixed beam', 540, 960, { fam: 'mono', size: 30, color: C.red, align: 'center', alpha: cb });
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(1, 0.3, 2, 'ACI 318-19 Table 9.3.1.1 · simply supported', '6000 / 16 = 375 mm', { s1: 30, note: '(14.8 in)' });
      c(4, 0.8, 1, 'EN 1992-1-1:2004 Table 7.4N · K = 1.0', 'L/d = 14 to 20', { s1: 30 });
      c(6, 0.4, 1, 'cantilever: K = 0.4 → L/d 5.6 to 8', 'd = 750 to 1071 mm', { c2: C.red });
      E.card(ctx, E.fade(t, B[8] + 3.0, B[8] + 3.4, B[8] + 6.4, B[8] + 6.7), 'meet the ratio → deflection usually covered', 'fixed both ends: L/21', { s1: 30 });
      E.rehook(ctx, t, B[4], 'Eurocode asks about steel');
      E.rehook(ctx, t, B[6], 'The cantilever gets 0.4');
      E.nextCard(ctx, E.ramp(t, B[8] + 6.6, B[8] + 7.2, E.out), 'BEAM SERIES · COMPLETE', "That's why the fixed beam won", 'Rewatch from Part 1 · save the series');
      E.parts(ctx, t, 3);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'BEAM SERIES · PART 3', title: ['How deep should', 'a beam be?'], dark: false, tag: 'ENGIFORMULA' });
    },
  };
})();
