// COLUMN SERIES 1/3 · Same column, 16× the capacity. Euler P = π²EI/(kL)², so capacity ∝ 1/k² (recomputed in Python):
// k = 2.0 flagpole 0.25×, 1.0 pinned 1×, 0.7 fixed-pinned 2.04×, 0.5 fixed-fixed 4× → 16× span.
// Recommended design k (AISC 360-22 Commentary Table C-A-7.1): 2.1 and 0.65 → (2.1/0.65)² = 10.4×.
// Slenderness λ = L0/i, i = h/√12: 300 mm square, 3 m pinned → i = 86.6 mm, λ = 34.6.
// Beats (9 slides): hook | flagpole | pinned | fixed-pinned | fixed-fixed | design k | 10× | slenderness | next.
(() => {
  const B = E.beats([6.6, 6.2, 4.7, 5.9, 5.1, 8.1, 2.0, 7.0, 5.8]);
  const cols = [
    { x: 190, k: 2.0, kd: 2.1, cap: '0.25×', base: 'fixed', top: 'free', f: u => 1 - Math.cos(Math.PI * u / 2) },
    { x: 420, k: 1.0, kd: 1.0, cap: '1×', base: 'pin', top: 'pin', f: u => Math.sin(Math.PI * u) },
    { x: 650, k: 0.7, kd: 0.8, cap: '2×', base: 'fixed', top: 'pin', f: u => (1 - Math.cos(Math.PI * u)) * Math.sin(Math.PI * u) / 1.3 },
    { x: 880, k: 0.5, kd: 0.65, cap: '4×', base: 'fixed', top: 'fixed', f: u => (1 - Math.cos(2 * Math.PI * u)) / 2 },
  ];
  SCENES['column-ends'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'paper');
      const yb = 980, H = 205, yt = yb - H;
      const focus = t < B[1] ? -1 : t < B[5] ? E.beatOf(t, B) - 1 : -1;
      const fadeOut = 1 - E.seg(t, B[7], B[7] + 0.4) + E.seg(t, B[8], B[8] + 0.5);
      cols.forEach((c, i) => {
        const on = t < B[1] ? E.ramp(t, 0.2 + i * 0.25, 0.7 + i * 0.25, E.back) : (t < B[i + 1] ? 0.25 : 1);
        if (on <= 0) return;
        const hi = focus === -1 || focus === i;
        ctx.save(); ctx.globalAlpha = E.clamp(on) * (hi ? 1 : 0.3) * E.clamp(fadeOut);
        // ends
        if (c.base === 'fixed') E.wall(ctx, c.x - 50, yb, yb + 30, 100, 1);
        else { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(c.x, yb); ctx.lineTo(c.x - 28, yb + 40); ctx.lineTo(c.x + 28, yb + 40); ctx.closePath(); ctx.fill(); }
        if (c.top === 'fixed') E.wall(ctx, c.x - 50, yt - 30, yt, 100, 1);
        else if (c.top === 'pin') { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(c.x, yt); ctx.lineTo(c.x - 28, yt - 40); ctx.lineTo(c.x + 28, yt - 40); ctx.closePath(); ctx.fill(); }
        // buckled shape
        const bk = t < B[1] ? E.ramp(t, 1.2 + i * 0.3, 2.2 + i * 0.3) : (t < B[i + 1] ? 0 : E.ramp(t, B[i + 1] + 0.3, B[i + 1] + 1.3));
        const amp = 36 * bk * (1 - 0.6 * E.seg(t, B[8], B[8] + 1.5) * (i === 1 ? 1 : 0));
        const pts = []; for (let j = 0; j <= 40; j++) { const u = j / 40; pts.push([c.x + amp * c.f(u), yb - u * H]); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 16; ctx.lineCap = 'round'; E.path(ctx, pts, 1);
        // effective length bracket (half-wave), drawn left of the column
        if (bk > 0.5) {
          const Le = c.k * H, y0 = c.base === 'fixed' && c.top === 'fixed' ? yb - H * 0.25 : c.base === 'fixed' && c.top === 'pin' ? yb - H * 0.3 : yb;
          const yy0 = c.top === 'free' ? yb : y0, yy1 = yy0 - Le;
          ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.globalAlpha *= E.seg(bk, 0.5, 1);
          ctx.beginPath(); ctx.moveTo(c.x - 62, yy0); ctx.lineTo(c.x - 62, yy1); ctx.moveTo(c.x - 72, yy0); ctx.lineTo(c.x - 52, yy0); ctx.moveTo(c.x - 72, yy1); ctx.lineTo(c.x - 52, yy1); ctx.stroke(); ctx.setLineDash([]);
          if (c.top === 'free') { ctx.save(); ctx.globalAlpha *= 0.35; ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.setLineDash([6, 8]); const g = []; for (let j = 0; j <= 30; j++) { const u = 1 + j / 30; g.push([c.x + amp * (1 - Math.cos(Math.PI * u / 2)), yb - u * H]); } E.path(ctx, g, 1); ctx.restore(); }
        }
        // labels under the column
        const design = E.seg(t, B[5] + 0.6, B[5] + 1.2) * (t < B[7] ? 1 : 0);
        const kv = design > 0.5 ? c.kd : c.k;
        E.text(ctx, `k = ${kv}`, c.x, yb + 82, { fam: 'mono', size: 30, color: design > 0.5 ? C.orange : C.muted, align: 'center' });
        const cap = design > 0.5 ? ['0.23×', '1×', '1.6×', '2.4×'][i] : c.cap;
        E.text(ctx, cap, c.x, yb + 140 - 0, { fam: 'mono', size: 46, color: i === 3 ? C.green : i === 0 ? C.red : C.blue, align: 'center', alpha: E.seg(bk, 0.6, 1) * (1 - E.seg(t, B[7], B[7] + 0.3)) });
        ctx.restore();
      });
      // names, top of each column
      const names = ['flagpole', 'pinned', 'fixed–pin', 'fixed–fixed'];
      cols.forEach((c, i) => E.text(ctx, names[i], c.x, 520 + 30, { fam: 'mono', size: 26, color: C.muted, align: 'center', alpha: E.seg(t, 0.5, 1) * (focus === -1 || focus === i ? 1 : 0.3) * (t > B[7] && t < B[8] ? 0 : 1) * (E.beatOf(t, B) === 5 ? 0 : 1) }));
      // 16× callout
      const sx = E.fade(t, B[4] + 2.2, B[4] + 2.7, B[5], B[5] + 0.3) + E.fade(t, 3.6, 4.0, B[1] - 0.3, B[1]);
      E.text(ctx, '16×', 540, 640, { fam: 'title', weight: 700, size: 120, color: C.orange, align: 'center', alpha: E.clamp(sx) });
      const tx = E.fade(t, B[6], B[6] + 0.4, B[7], B[7] + 0.3);
      E.text(ctx, '≈ 10×', 540, 640, { fam: 'title', weight: 700, size: 120, color: C.orange, align: 'center', alpha: tx });
      // slenderness beat: one column with section
      const sl = E.fade(t, B[7] + 0.3, B[7] + 0.8, B[8], B[8] + 0.4);
      if (sl > 0) {
        ctx.save(); ctx.globalAlpha = sl;
        ctx.fillStyle = C.concrete; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        ctx.fillRect(500, 600, 80, 380); ctx.strokeRect(500, 600, 80, 380);
        ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(460, 600); ctx.lineTo(460, 980); ctx.stroke();
        E.text(ctx, '3 m', 440, 800, { fam: 'mono', size: 34, color: C.blue, align: 'right' });
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(700, 690, 160, 160); ctx.strokeRect(700, 690, 160, 160);
        ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(780, 770, 6, 0, 7); ctx.fill();
        E.text(ctx, '300 mm', 780, 890, { fam: 'mono', size: 28, color: C.ink, align: 'center' });
        ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(780, 770); ctx.lineTo(780 + 43, 770); ctx.stroke();
        E.text(ctx, 'i = h/√12', 780, 680, { fam: 'mono', size: 26, color: C.blue, align: 'center' });
        ctx.restore();
      }
      E.card(ctx, E.fade(t, B[7] + 1.0, B[7] + 1.5, B[8], B[8] + 0.3), 'λ = L0 / i = 3000 / (300/√12) = 3000 / 86.6', `λ = ${E.count(34.6, E.seg(t, B[7] + 1.5, B[7] + 2.6), 1)}`, { note: 'pinned, 3 m' });
      E.card(ctx, E.fade(t, B[5] + 1.6, B[5] + 2.1, B[6] + 0.1, B[6] + 0.4), 'design k: AISC 360-22 Comm. Table C-A-7.1', '(2.1 / 0.65)² = 10.4×', { s1: 30 });
      E.card(ctx, E.fade(t, B[4] + 0.6, B[4] + 1.0, B[4] + 2.1, B[4] + 2.3), 'capacity ∝ 1 / k²   (Euler: π²EI / (kL)²)', '1/0.5² ÷ 1/2² = 16', { s1: 30 });
      // last beat: the pinned column starts to bow slightly
      E.rehook(ctx, t, B[3], 'Now clamp the ends');
      E.rehook(ctx, t, B[5], "Nothing is truly fixed");
      E.nextCard(ctx, E.ramp(t, B[8] + 1.6, B[8] + 2.2, E.out), 'NEXT · COLUMN SERIES PART 2', 'The moment not on the drawing', 'Follow so you catch it');
      E.parts(ctx, t, 1);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'COLUMN SERIES · PART 1', title: ['Same column,', '16× the capacity'], dark: false, tag: 'ENGIFORMULA' });
    },
  };
})();
