// FOUNDATION SERIES 3/3 · The steel in a footing. Same 4'-6" × 12 in footing, d = 8.5 in, qu = 2.963 ksf (Part 2). Recomputed in Python:
// cantilever from the column face (4.5 − 1)/2 = 1.75 ft; Mu = 2.963 × 4.5 × 1.75² / 2 = 20.4 kip-ft (27.7 kN·m);
// As = 20.4 × 12 / (0.9 × 60 × 0.9 × 8.5) = 0.59 in² (383 mm²); minimum 0.0018 × 54 × 12 = 1.17 in² (752 mm²), 1.97×;
// 6 #4 = 1.20 in² each way, ≈ 9.6 in spacing. Cover cast against earth 3 in (ACI 318-19 Table 20.5.1.3.1); EC2 4.4.1.3(4): 75 mm vs soil.
// Beats (9): hook | flip | cantilever | 0.59 | minimum | 6 #4 | cover | dowels | end.
(() => {
  const B = E.beats([7.0, 5.5, 5.8, 6.6, 5.8, 7.8, 7.4, 4.7, 5.8]);
  SCENES['footing-steel'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'blueprint');
      const s = 11, cx = 540, yt = 720, yb = yt + 12 * s, half = 27 * s, cw = 6 * s, cy = (yt + yb) / 2;
      const rot = Math.PI * (E.ramp(t, B[1] + 0.3, B[1] + 1.8) - E.ramp(t, B[2] + 0.2, B[2] + 1.6));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
      // soil band (only when upright)
      ctx.fillStyle = `rgba(140,106,74,${0.35 * Math.max(0, Math.cos(rot))})`; ctx.fillRect(-200, yb, 1480, 140);
      // footing + column
      ctx.fillStyle = C.concrete; ctx.fillRect(cx - half, yt, 2 * half, yb - yt);
      ctx.fillStyle = C.steel; ctx.fillRect(cx - cw, yt - 160, 2 * cw, 160);
      // tension glow at the bottom
      const tg = E.ramp(t, B[2] + 1.6, B[2] + 2.6) * (1 - E.seg(t, B[6], B[6] + 0.5));
      if (tg > 0) { const g = ctx.createLinearGradient(0, yb, 0, yb - 50); g.addColorStop(0, E.alpha(C.orange, 0.7 * tg)); g.addColorStop(1, E.alpha(C.orange, 0)); ctx.fillStyle = g; ctx.fillRect(cx - half, yb - 50, 2 * half, 50); }
      // soil pressure arrows (up)
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 5;
      const pa = E.ramp(t, 0.3, 1.0);
      for (let i = 0; i < 11; i++) { const x = cx - half + 20 + i * (2 * half - 40) / 10; ctx.globalAlpha = pa; E.arrow(ctx, x, yb + 90, x, yb + 12, 16); }
      ctx.globalAlpha = 1;
      // column load (down)
      ctx.lineWidth = 10; E.arrow(ctx, cx, yt - 240, cx, yt - 168, 28);
      // bars (section dots) + cover
      const mat = E.ramp(t, B[5] + 0.4, B[5] + 2.4);
      const yr = yb - 3 * s - 3;
      for (let i = 0; i < 6; i++) { const k = E.clamp(mat * 6 - i); if (k <= 0) continue; ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(cx - half + 3 * s + i * (2 * half - 6 * s) / 5, yr - 20 * (1 - k), 8, 0, 7); ctx.fill(); }
      if (mat > 0) { ctx.strokeStyle = C.orange; ctx.lineWidth = 6; ctx.globalAlpha = mat; ctx.beginPath(); ctx.moveTo(cx - half + 3 * s, yr + 12); ctx.lineTo(cx + half - 3 * s, yr + 12); ctx.stroke(); ctx.globalAlpha = 1; }
      const dw = E.ramp(t, B[7], B[7] + 2.0);
      if (dw > 0) [-40, 40].forEach(o => { ctx.strokeStyle = C.yellow; ctx.lineWidth = 7; E.path(ctx, [[cx + o * 2.2, yr], [cx + o, yr], [cx + o, yr - 340]], dw); });
      ctx.restore();
      // cantilever bracket (upright only)
      const cb = E.fade(t, B[2] + 1.0, B[2] + 1.5, B[3] + 4, B[3] + 4.4);
      if (cb > 0) { ctx.save(); ctx.globalAlpha = cb; ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(cx + cw, yt - 60); ctx.lineTo(cx + cw, yb + 110); ctx.stroke(); ctx.setLineDash([]);
        E.text(ctx, '1.75 ft', cx + cw + (half - cw) / 2, yt - 20, { fam: 'mono', size: 30, color: C.yellow, align: 'center' });
        E.text(ctx, 'face', cx + cw + 10, yt - 70, { fam: 'mono', size: 24, color: C.yellow }); ctx.restore(); }
      const cv = E.fade(t, B[6] + 0.6, B[6] + 1.1, B[7], B[7] + 0.4);
      if (cv > 0) { const yr = yb - 3 * s - 3; ctx.save(); ctx.globalAlpha = cv; ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; const x = cx - half - 30;
        ctx.beginPath(); ctx.moveTo(x, yr); ctx.lineTo(x, yb); ctx.moveTo(x - 10, yr); ctx.lineTo(x + 10, yr); ctx.moveTo(x - 10, yb); ctx.lineTo(x + 10, yb); ctx.stroke();
        E.text(ctx, '3 in', x - 16, yr + 26, { fam: 'mono', size: 30, color: C.yellow, align: 'right' }); ctx.restore(); }
      if (rot > 0.2 && rot < 3.0 || (t > B[1] + 1.8 && t < B[2] + 0.2)) E.text(ctx, 'flipped: two cantilevers on a support', 540, 1000, { fam: 'mono', size: 28, color: '#FFFFFF', align: 'center', bg: C.navy, alpha: E.seg(t, B[1] + 1.6, B[1] + 2.0) * (1 - E.seg(t, B[2] + 0.2, B[2] + 0.5)) });
      // hook: two bars
      const hk = E.fade(t, 0.4, 0.9, B[1], B[1] + 0.4);
      if (hk > 0) { ctx.save(); ctx.globalAlpha = hk;
        const w1 = 400 * E.ramp(t, 0.8, 1.8), w2 = 400 * 1.97 * E.ramp(t, 2.6, 3.8);
        E.text(ctx, 'STRENGTH NEEDS', 64, 1040, { fam: 'mono', size: 24, color: C.line }); ctx.fillStyle = C.blue; E.rrect(ctx, 64, 1052, w1, 40, 8); ctx.fill();
        E.text(ctx, '0.59 in²', 80 + w1, 1084, { fam: 'mono', size: 32, color: '#FFFFFF' });
        E.text(ctx, 'CODE MINIMUM', 64, 1130, { fam: 'mono', size: 24, color: C.line }); ctx.fillStyle = C.orange; E.rrect(ctx, 64, 1142, Math.min(w2, 800), 40, 8); ctx.fill();
        E.text(ctx, '1.17 in²', 80 + Math.min(w2, 800) - 150, 1174, { fam: 'mono', size: 32, color: '#FFFFFF', alpha: E.seg(t, 3.4, 3.8) });
        ctx.restore(); }
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(3, 0.2, 1, 'Mu = 2.963 ksf × 4.5 × 1.75² / 2 = 20.4 kip·ft', 'As = 0.59 in²', { s1: 28, note: '(383 mm²)' });
      c(4, 0.6, 1, 'ACI 318 minimum (Grade 60): 0.0018 × b × h', '0.0018 × 54 × 12', { s1: 30 });
      c(5, 0.2, 1, '= 1.17 in² → minimum governs (1.97×)', '6 #4 each way ≈ 9.6 in', { c2: C.orange, note: '1.20 in²' });
      c(6, 1.6, 1, 'ACI 318-19 Table 20.5.1.3.1: cast against earth', '3 in cover', { s1: 30, note: 'EC2: 75 mm' });
      c(7, 1.6, 1, 'dowels lap with the column bars', 'the column starts here', { c2: C.ink, s2: 44 });
      E.rehook(ctx, t, B[1], 'Flip it over');
      E.rehook(ctx, t, B[4], 'But the code says double');
      E.rehook(ctx, t, B[6], 'The number crews forget');
      E.nextCard(ctx, E.ramp(t, B[8] + 0.6, B[8] + 1.2, E.out), 'FOUNDATION SERIES · COMPLETE', 'Next: the column series', 'Save all three parts');
      E.parts(ctx, t, 3, true);
      E.chrome(ctx, t, { pillar: 'site', series: 'FOUNDATION SERIES · PART 3', title: ['The steel in', 'a footing'], tag: 'ENGIFORMULA' });
    },
  };
})();
