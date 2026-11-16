// COLUMN SERIES 3/3 · Why ties are so close. Recomputed in Python:
// ACI 318-19 25.7.2.1: tie spacing ≤ min(16 db, 48 dt, least dimension) = min(16 × 1.0, 48 × 0.375, 12) = min(16, 18, 12) = 12 in (#8 bars, #3 ties, 12 in column).
// EN 1992-1-1 9.5.3(3) recommended: min(20 φmin, b, 400) = min(320, 300, 400) = 300 mm (16 mm bars, 300 mm column); 9.5.3(4): × 0.6 → 180 mm.
// Steel: ACI 318-19 10.6.1.1 1%–8%; EC2 9.5.2(3) max 4% outside laps; 4H16 = 804 mm² / 90,000 mm² = 0.89%.
// Beats (9): hook | squeeze | ties | how close | ACI | EC2 | ×0.6 | steel % | end.
(() => {
  const B = E.beats([5.8, 6.2, 5.1, 4.3, 8.9, 6.2, 6.6, 6.2, 3.9]);
  SCENES['column-ties'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'paper');
      const L = 180, R = 420, yt = 580, yb = 1000, bx = [212, 388];
      const hook = t < B[1];
      const ties = hook ? E.ramp(t, 3.0, 4.2) : E.ramp(t, B[2] + 0.2, B[2] + 1.6);
      const squeeze = hook ? E.ramp(t, 0.4, 2.4) * (1 - ties) : E.ramp(t, B[1] + 0.4, B[1] + 3) * (1 - ties);
      const n = 6, sp = (yb - yt) / n;
      const tight = E.ramp(t, B[6] + 0.6, B[6] + 2.0) * (1 - E.seg(t, B[8], B[8] + 0.6));
      // slab bands
      if (tight > 0) { ctx.fillStyle = E.alpha(C.steel, 0.5 * tight); ctx.fillRect(80, yt - 40, 440, 40); ctx.fillRect(80, yb, 440, 30); }
      // concrete
      ctx.fillStyle = 'rgba(230,232,235,0.85)'; ctx.fillRect(L, yt, R - L, yb - yt); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(L, yt, R - L, yb - yt);
      // spalled cover chunks
      if (squeeze > 0.4) { ctx.fillStyle = C.concrete; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        [[-1, 0.45], [-1, 0.6], [1, 0.5], [1, 0.38]].forEach(([sg, u], j) => { const k = (squeeze - 0.4) / 0.6, x = (sg < 0 ? L : R) + sg * 70 * k, y = yt + u * (yb - yt) + 30 * k * (j % 2 ? 1 : -1);
          ctx.save(); ctx.translate(x, y); ctx.rotate(k * 1.5 * sg); ctx.fillRect(-16, -12, 32, 24); ctx.strokeRect(-16, -12, 32, 24); ctx.restore(); }); }
      // bars: bow between restraints
      bx.forEach((x, i) => { const sg = i ? 1 : -1; ctx.strokeStyle = C.orange; ctx.lineWidth = 8; ctx.beginPath();
        for (let j = 0; j <= 120; j++) { const y = yt + (yb - yt) * j / 120, u = (y - yt) / (yb - yt);
          const big = 60 * squeeze * Math.sin(Math.PI * u), small = 6 * ties * (1 - tight * 0.6) * Math.abs(Math.sin(Math.PI * u * n)) * E.ramp(t, B[2] + 1.0, B[2] + 2.0) * (hook ? 0 : 1);
          const xx = x + sg * (big + small); j ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); } ctx.stroke(); });
      // ties
      if (ties > 0) { ctx.strokeStyle = C.blue; ctx.lineWidth = 5;
        const ys = []; for (let i = 0; i <= n; i++) ys.push(yt + i * sp);
        if (tight > 0) { ys.push(yt + sp * 0.6 * tight, yb - sp * 0.6 * tight); }
        ys.forEach((y, i) => { const k = E.clamp(ties * (n + 1) - i * 0.6); if (k <= 0) return; ctx.globalAlpha = k; ctx.strokeRect(bx[0] - 14, y - 4, bx[1] - bx[0] + 28, 8); });
        ctx.globalAlpha = 1; }
      // load arrows
      ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 9;
      const la = hook ? E.ramp(t, 0.2, 0.6) : 1; ctx.globalAlpha = la; E.arrow(ctx, 300, yt - 110, 300, yt - 14, 26); ctx.globalAlpha = 1;
      // spacing dim
      const sd = E.fade(t, B[2] + 1.6, B[2] + 2.0, B[8], B[8] + 0.4);
      if (sd > 0) { ctx.save(); ctx.globalAlpha = sd; ctx.strokeStyle = C.blue; ctx.lineWidth = 3; const x = R + 34; ctx.beginPath(); ctx.moveTo(x, yt + sp); ctx.lineTo(x, yt + 2 * sp); ctx.moveTo(x - 10, yt + sp); ctx.lineTo(x + 10, yt + sp); ctx.moveTo(x - 10, yt + 2 * sp); ctx.lineTo(x + 10, yt + 2 * sp); ctx.stroke();
        E.text(ctx, 's', x + 16, yt + 1.5 * sp + 10, { fam: 'mono', size: 32, color: C.blue }); ctx.restore(); }
      // right panel: rules
      const rows = (a, title, items) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
        E.text(ctx, title, 520, 640, { fam: 'title', weight: 700, size: 40, color: C.ink });
        items.forEach(([l, v, win], i) => { const k = E.ramp(t, a0(i), a0(i) + 0.5); const y = 720 + i * 90;
          E.text(ctx, l, 520, y, { fam: 'mono', size: 28, color: C.muted, alpha: k });
          E.text(ctx, v, 520, y + 42, { fam: 'mono', size: 38, color: win ? C.green : C.ink, alpha: k, bg: win ? E.alpha(C.green, 0.12) : undefined, pad: 8 }); });
        ctx.restore(); };
      let a0 = i => B[4] + 0.8 + i * 2.2;
      rows(E.fade(t, B[4] + 0.2, B[4] + 0.6, B[5], B[5] + 0.3), 'ACI 318-19 25.7.2.1', [['16 × #8 bar (1.0 in)', '16 in', 0], ['48 × #3 tie (0.375 in)', '18 in', 0], ['least column side', '12 in  ✓', 1]]);
      a0 = i => B[5] + 0.6 + i * 1.4;
      rows(E.fade(t, B[5] + 0.2, B[5] + 0.6, B[6], B[6] + 0.3), 'EN 1992-1-1 9.5.3', [['20 × 16 mm bar', '320 mm', 0], ['column width b', '300 mm  ✓', 1], ['cap', '400 mm', 0]]);
      a0 = i => B[6] + 1.0 + i * 1.4;
      rows(E.fade(t, B[6] + 0.2, B[6] + 0.6, B[7], B[7] + 0.3), 'Near slabs and laps', [['within h of a beam or slab', '0.6 × 300', 0], ['', '180 mm  ✓', 1]]);
      const sp2 = E.fade(t, B[7] + 0.2, B[7] + 0.6, B[8], B[8] + 0.4);
      if (sp2 > 0) { ctx.save(); ctx.globalAlpha = sp2;
        ctx.fillStyle = C.concrete; ctx.fillRect(560, 620, 200, 200); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(560, 620, 200, 200);
        ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.strokeRect(586, 646, 148, 148);
        ctx.fillStyle = C.orange; [[600, 660], [720, 660], [600, 780], [720, 780]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); });
        E.text(ctx, '4H16 = 0.89%', 560, 870, { fam: 'mono', size: 32, color: C.ink });
        const g = (y, a, b, lab, col) => { ctx.fillStyle = 'rgba(14,42,71,0.08)'; E.rrect(ctx, 520, y, 480, 26, 13); ctx.fill(); ctx.fillStyle = col; E.rrect(ctx, 520 + 480 * a / 8, y, 480 * (b - a) / 8, 26, 13); ctx.fill(); E.text(ctx, lab, 520, y - 10, { fam: 'mono', size: 24, color: C.muted }); };
        g(940, 1, 8, 'ACI 318-19 10.6.1.1: 1% to 8%', C.blue); g(1000 - 0, 0.2, 4, 'EC2 9.5.2(3): max 4% outside laps', C.green);
        ctx.restore(); }
      E.rehook(ctx, t, B[3], 'So how close?');
      E.rehook(ctx, t, B[6], 'Near the slab it tightens');
      E.nextCard(ctx, E.ramp(t, B[8] + 0.2, B[8] + 0.8, E.out), 'COLUMN SERIES · COMPLETE', 'Ends, hidden moment, ties', 'Rewatch from Part 1 · save the series');
      E.parts(ctx, t, 3);
      E.chrome(ctx, t, { pillar: 'site', series: 'COLUMN SERIES · PART 3', title: ['Why ties are', 'so close'], dark: false, tag: 'ENGIFORMULA' });
    },
  };
})();
