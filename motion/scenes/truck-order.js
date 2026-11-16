// CONCRETE SERIES 3/3 · 48 yards: how many trucks? Basement net 47.88 yd³ (Part 2). Recomputed in Python:
// +5% = 50.3 yd³, +10% = 52.7 yd³; at 10 yd³ a truck (typical max, check your supplier): 52 = 5 full + 2 yd³ short load;
// 50 = exactly 5 trucks, 50/47.88 − 1 = 4.4% spare. Normal-weight concrete 145–150 pcf → 3,915–4,050 lb/yd³ →
// 39,150–40,500 lb ≈ 20 tons per 10 yd³ truck. ASTM C94/C94M: discharge within 90 minutes (unless the purchaser waives it).
// Beats (9): hook | net | waste | catch | 52 | 50 | 20 tons | 90 min | pro move.
(() => {
  const B = E.beats([7.8, 4.7, 5.1, 4.7, 7.4, 4.7, 4.7, 6.2, 5.8]);
  const truck = (ctx, x, y, fill, a, spin, hl) => {
    if (a <= 0) return;
    const { C } = E;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-120, 40, 230, 14);                  // chassis
    ctx.fillStyle = C.blue; E.rrect(ctx, 64, -20, 64, 62, 10); ctx.fill();       // cab
    ctx.fillStyle = C.line; ctx.fillRect(78, -8, 34, 22);                         // window
    ctx.fillStyle = C.navy; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
    [-90, -40, 90].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 60, 16, 0, 7); ctx.fill(); ctx.stroke(); });
    // drum (tilted ellipse) with fill
    ctx.save(); ctx.translate(-30, 4); ctx.rotate(-0.22);
    ctx.beginPath(); ctx.ellipse(0, 0, 92, 40, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(207,224,255,0.18)'; ctx.fill();
    ctx.clip(); ctx.fillStyle = hl || C.concrete; ctx.fillRect(-92, 40 - 80 * fill, 184 * 1, 80 * fill);
    ctx.restore();
    ctx.save(); ctx.translate(-30, 4); ctx.rotate(-0.22); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 92, 40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.orange; ctx.lineWidth = 4; for (let k = 0; k < 3; k++) { const ph = (spin + k / 3) % 1; const xx = -80 + 160 * ph; ctx.beginPath(); ctx.moveTo(xx, -36); ctx.lineTo(xx + 20, 36); ctx.stroke(); }
    ctx.restore();
    ctx.restore();
  };
  SCENES['truck-order'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'blueprint');
      const bi = E.beatOf(t, B);
      // which plan is shown: 52 (six trucks) or 50 (five)
      const show52 = (t < B[1] && t < 4.2) || bi === 4;
      const show50 = (t < B[1] && t >= 4.2) || bi === 5;
      const showT = t < B[1] || bi === 4 || bi === 5 || bi === 6 || bi === 8;
      const loads = show50 ? [10, 10, 10, 10, 10] : [10, 10, 10, 10, 10, 2];
      if (showT) {
        const a = bi === 4 ? E.seg(t, B[4], B[4] + 0.4) : bi === 5 ? E.seg(t, B[5], B[5] + 0.4) : bi === 6 ? E.seg(t, B[6], B[6] + 0.4) : bi === 8 ? E.seg(t, B[8], B[8] + 0.4) : E.seg(t, 0.2, 0.6);
        const t0 = bi === 0 ? (t < 4.2 ? 0.3 : 4.2) : B[bi];
        (bi === 6 ? [10] : loads).forEach((v, i) => {
          const col = i % 3, row = Math.floor(i / 3), x = bi === 6 ? 540 : 200 + col * 340, y = bi === 6 ? 760 : 690 + row * 190;
          const k = E.ramp(t, t0 + 0.2 + i * 0.25, t0 + 0.8 + i * 0.25, E.back);
          const short = v < 10;
          ctx.save(); if (bi === 6) { ctx.translate(540, 760); ctx.scale(1.8, 1.8); ctx.translate(-540, -760); }
          truck(ctx, x + 400 * (1 - E.clamp(k)), y, v / 10 * E.ramp(t, t0 + 0.6 + i * 0.25, t0 + 1.4 + i * 0.25), a * E.clamp(k * 2), t * 0.8 + i * 0.2, short ? C.red : null);
          if (bi !== 6) E.text(ctx, `${v} yd³`, x - 30, y - 56, { fam: 'mono', size: 28, color: short ? C.red : '#FFFFFF', align: 'center', alpha: a * E.clamp(k), bg: C.navy });
          ctx.restore();
          if (short && k > 0.6) E.text(ctx, '+ short-load fee', x - 110, y + 116, { fam: 'mono', size: 26, color: C.navy, bg: C.yellow, alpha: a });
        });
        if (bi === 6) E.text(ctx, '≈ 20 tons', 540, 975, { fam: 'title', weight: 700, size: 90, color: C.orange, align: 'center', alpha: E.seg(t, B[6] + 1.2, B[6] + 1.8) });
        if (bi === 8) E.text(ctx, '?', 880, 820, { fam: 'title', weight: 700, size: 90, color: C.yellow, align: 'center', alpha: E.seg(t, B[8] + 0.8, B[8] + 1.2) });
      }
      // net + waste bars
      const wv = E.fade(t, B[1] + 0.2, B[1] + 0.6, B[3], B[3] + 0.3);
      if (wv > 0) {
        ctx.save(); ctx.globalAlpha = wv;
        const sc = 14; // px per yd³
        const row = (y, v, lab, col, k) => { ctx.fillStyle = col; E.rrect(ctx, 64, y, sc * v * k, 64, 10); ctx.fill(); E.text(ctx, `${lab}  ${(v * k).toFixed(1)} yd³`, 84, y + 44, { fam: 'mono', size: 30, color: C.navy }); };
        row(620, 47.88, 'net', C.concrete, E.ramp(t, B[1] + 0.3, B[1] + 1.6));
        row(720, 50.27, '+5%', C.yellow, E.ramp(t, B[2] + 0.2, B[2] + 1.2));
        row(820, 52.67, '+10%', C.orange, E.ramp(t, B[2] + 2.2, B[2] + 3.2));
        ctx.strokeStyle = '#FFFFFF'; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; [10, 20, 30, 40, 50].forEach(v => { ctx.beginPath(); ctx.moveTo(64 + sc * v, 600); ctx.lineTo(64 + sc * v, 910); ctx.stroke(); E.text(ctx, `${v}`, 64 + sc * v, 950, { fam: 'mono', size: 24, color: C.line, align: 'center' }); });
        ctx.restore();
      }
      // capacity bar for the catch
      const ct = E.fade(t, B[3] + 0.3, B[3] + 0.7, B[4], B[4] + 0.3);
      if (ct > 0) { truck(ctx, 540, 800, E.ramp(t, B[3] + 0.6, B[3] + 2.4), ct, t * 0.8, null); ctx.save(); ctx.globalAlpha = ct; E.text(ctx, 'up to ~10 yd³ a truck', 540, 940, { fam: 'mono', size: 40, color: '#FFFFFF', align: 'center' }); E.text(ctx, '(typical · check your supplier)', 540, 990, { fam: 'mono', size: 26, color: C.line, align: 'center' }); ctx.restore(); }
      // 90 minute clock
      const ck = E.fade(t, B[7] + 0.2, B[7] + 0.6, B[8], B[8] + 0.3);
      if (ck > 0) { ctx.save(); ctx.globalAlpha = ck; const cx = 540, cy = 800, r = 170, k = E.ramp(t, B[7] + 0.6, B[7] + 4.6, x => x);
        ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(207,224,255,0.15)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
        ctx.strokeStyle = k > 0.8 ? C.red : C.yellow; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        E.text(ctx, `${Math.round(90 * k)} min`, cx, cy + 20, { fam: 'mono', size: 70, color: '#FFFFFF', align: 'center' }); ctx.restore(); }
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(2, 3.4, 1, '47.88 × 1.05 = 50.3 · × 1.10 = 52.7', 'order 50 or 52 yd³?', { s1: 30 });
      c(4, 2.4, 1, '52 yd³ = 5 × 10 + 2', '6 trucks, one nearly empty', { c2: C.red, s2: 42 });
      c(5, 1.2, 1, '50 / 47.88 = 1.044', '5 full trucks · 4.4% spare', { c2: C.green, s2: 42 });
      c(6, 2.2, 1, '10 yd³ × 3,915–4,050 lb/yd³', '39,000–40,500 lb', { note: '(145–150 pcf)' });
      c(7, 0.8, 1, 'ASTM C94/C94M: discharge within 90 min', 'space trucks to the pour', { s1: 30, s2: 42 });
      c(8, 2.0, 1, 'pro move: hold the last truck', 'measure, then call it', { c2: C.ink, s2: 44 });
      E.rehook(ctx, t, B[3], "Here's the catch");
      E.rehook(ctx, t, B[6], 'Each truck is a clock');
      E.parts(ctx, t, 3, true);
      E.chrome(ctx, t, { pillar: 'calculator', series: 'CONCRETE SERIES · PART 3', title: ['48 yards:', 'how many trucks?'], tag: 'ENGIFORMULA' });
    },
  };
})();
