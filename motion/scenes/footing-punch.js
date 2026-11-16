// FOUNDATION SERIES 2/3 · How a footing actually fails. Recomputed in Python (ACI 318-19 §22.6 two-way shear, λs = 1 for d ≤ 10 in):
// 4'-6" square, 12 in thick, d = 8.5 in, f'c = 3,000 psi, 12 in column, assumed factored load 60 kips (267 kN).
// qu = 60 / 20.25 = 2.963 ksf; b0 = 4(12 + 8.5) = 82 in; φVc = 0.75 × 4√3000 × 82 × 8.5 = 114.5 kips (509 kN);
// Vu = 2.963 × (20.25 − 1.708²) = 51.4 kips (229 kN) → 45%. At 10 in thick (d = 6.5): φVc 79.0, Vu 53.0 → 67%.
// Beats (9): hook | three ways | bending | one-way | punching | perimeter | 45% | 10 in | next.
(() => {
  const B = E.beats([7.0, 3.2, 2.8, 6.2, 5.8, 8.5, 7.4, 5.5, 4.7]);
  SCENES['footing-punch'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'blueprint');
      const sec = E.fade(t, B[1], B[1] + 0.5, B[5], B[5] + 0.5);
      const a3 = 1 - sec;
      const thin = E.ramp(t, B[7] + 0.3, B[7] + 1.4) * (1 - E.ramp(t, B[8] + 1.5, B[8] + 2.5));
      const Th = 12 - 2 * thin, d = 8.5 - 2 * thin;
      if (a3 > 0) {
        const plan = E.ramp(t, B[5], B[5] + 1.2);
        const P = E.camera({ yaw: -0.6 + 0.1 * Math.sin(t * 0.3), pitch: E.lerp(0.5, 0.95, plan), dist: 2400, scale: 5.4, cx: 540, cy: 780, target: [0, 0, 0] });
        const S = E.scene3d();
        E.ground(S, P, -48, 48, -48, 48, 12, 0.25, -Th);
        const punch = t < B[1] ? E.ramp(t, 1.0, 4.5) : 0;
        const pz = -16 * punch;
        E.box(S, P, [-27, -27, -Th], [27, 27, 0], C.concrete, { edge: 'rgba(14,42,71,0.35)' });
        if (punch > 0) {
          const r0 = 6, r1 = 6 + d, z0 = pz, z1 = -Th + pz;
          const top = [[-r0, -r0, z0], [r0, -r0, z0], [r0, r0, z0], [-r0, r0, z0]], bot = [[-r1, -r1, z1], [r1, -r1, z1], [r1, r1, z1], [-r1, r1, z1]];
          for (let i = 0; i < 4; i++) E.face(S, P, [bot[i], bot[(i + 1) % 4], top[(i + 1) % 4], top[i]], C.red, { edge: 'rgba(14,42,71,0.4)', layer: 1 });
          E.face(S, P, [...bot].reverse(), C.red, { layer: 1 });
        }
        E.box(S, P, [-6, -6, pz], [6, 6, 34 + pz], C.steel, { edge: 'rgba(14,42,71,0.4)', layer: 2 });
        // critical perimeter at d/2
        const cp = t < B[1] ? E.ramp(t, 4.5, 5.5) : E.ramp(t, B[5] + 0.8, B[5] + 2.0);
        if (cp > 0) { const r = 6 + d / 2, sq = [[-r, -r, 0.2], [r, -r, 0.2], [r, r, 0.2], [-r, r, 0.2]];
          for (let i = 0; i < 4; i++) { const a = sq[i], b = sq[(i + 1) % 4], k = E.clamp(cp * 4 - i); if (k > 0) E.line3(S, P, [a, [E.lerp(a[0], b[0], k), E.lerp(a[1], b[1], k), 0.2]], C.yellow, 6, { layer: 3, dash: [12, 8] }); } }
        ctx.save(); ctx.globalAlpha = a3; E.flush(ctx, S); ctx.restore();
        const ak = E.ramp(t, 0.2, 0.7, E.back);
        const top = P([0, 0, 34 + pz]); ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 10;
        if (ak > 0 && a3 > 0.5) { ctx.globalAlpha = a3; E.arrow(ctx, top[0], top[1] - 120, top[0], top[1] - 12, 30); ctx.globalAlpha = 1; }
        if (t > B[5]) {
          E.text(ctx, `b0 = 4 × (12 + ${d}) = ${4 * (12 + d)} in`, 540, 610, { fam: 'mono', size: 34, color: C.yellow, align: 'center', alpha: E.seg(t, B[5] + 2.0, B[5] + 2.5) * a3, bg: C.navy });
          E.text(ctx, `${Th} in thick · d = ${d} in`, 540, 660, { fam: 'mono', size: 28, color: C.line, align: 'center', alpha: E.seg(t, B[5] + 0.5, B[5] + 1) * a3 });
        }
        // usage gauge
        const ug = E.seg(t, B[6] + 0.3, B[6] + 0.8);
        if (ug > 0) {
          const use = 0.45 + 0.22 * thin, w = 952 * use * E.ramp(t, B[6] + 0.6, B[6] + 2.2);
          ctx.save(); ctx.globalAlpha = ug * a3;
          ctx.fillStyle = 'rgba(207,224,255,0.15)'; E.rrect(ctx, 64, 935, 952, 50, 25); ctx.fill();
          ctx.fillStyle = use > 0.6 ? C.orange : C.green; E.rrect(ctx, 64, 935, Math.max(50, w), 50, 25); ctx.fill();
          E.text(ctx, `punching shear used: ${Math.round(100 * use * E.ramp(t, B[6] + 0.6, B[6] + 2.2))}%`, 84, 971, { fam: 'mono', size: 30, color: '#FFFFFF' });
          ctx.restore();
        }
      }
      // section view: three failure modes
      if (sec > 0) {
        ctx.save(); ctx.globalAlpha = sec;
        const s = 12, cx = 540, yt = 760, yb = yt + 12 * s, half = 27 * s, cw = 6 * s, dpx = 8.5 * s;
        ctx.fillStyle = 'rgba(140,106,74,0.35)'; ctx.fillRect(0, yb, 1080, 100);
        ctx.fillStyle = C.concrete; ctx.fillRect(cx - half, yt, 2 * half, yb - yt);
        ctx.fillStyle = C.steel; ctx.fillRect(cx - cw, yt - 190, 2 * cw, 190);
        ctx.fillStyle = C.orange; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx - half + 50 + i * (2 * half - 100) / 5, yb - 36, 7, 0, 7); ctx.fill(); }
        ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 5;
        for (let i = 0; i < 9; i++) { const x = cx - half + 30 + i * (2 * half - 60) / 8; E.arrow(ctx, x, yb + 80, x, yb + 10, 14); }
        ctx.strokeStyle = C.red; ctx.lineWidth = 5;
        const m1 = E.ramp(t, B[2], B[2] + 1.0), m2 = E.ramp(t, B[3] + 0.3, B[3] + 1.6), m3 = E.ramp(t, B[4] + 0.2, B[4] + 1.6);
        if (m1 > 0) { E.path(ctx, [[cx + cw, yb], [cx + cw + 4, yb - 70]], m1); }
        if (m2 > 0) { ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + cw + dpx, yt - 30); ctx.lineTo(cx + cw + dpx, yb + 10); ctx.stroke(); ctx.restore();
          E.path(ctx, [[cx + cw + dpx + 60, yb - 4], [cx + cw + dpx, yt + 50], [cx + cw + dpx - 30, yt + 4]], m2); }
        if (m3 > 0) { ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; [-1, 1].forEach(sg => { const x = cx + sg * (cw + dpx / 2); ctx.beginPath(); ctx.moveTo(x, yt - 30); ctx.lineTo(x, yb + 10); ctx.stroke(); }); ctx.restore();
          [-1, 1].forEach(sg => E.path(ctx, [[cx + sg * cw, yt], [cx + sg * (cw + yb - yt), yb]], m3)); }
        const lab = (s2, x, y, a) => E.text(ctx, s2, x, y, { fam: 'mono', size: 28, color: '#FFFFFF', alpha: a, bg: C.navy, align: 'center' });
        lab('1 bending at the face', cx + cw + 10, yt - 230 + 0, m1 * (1 - E.seg(t, B[3], B[3] + 0.3)));
        lab('2 one-way shear at d', cx + cw + dpx, yt - 50, m2 * (1 - E.seg(t, B[4], B[4] + 0.3)));
        lab('3 punching, checked at d/2', cx, yt - 230, m3);
        lab('d/2', cx - cw - dpx / 4, yt + 70, m3);
        ctx.restore();
      }
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(3, 1.6, 1, 'ACI 318-19 §22.5: critical section at d', 'crack across the full width', { s2: 40 });
      c(4, 1.6, 1, 'ACI 318-19 §22.6: perimeter at d/2', 'a cone around the column', { s2: 40 });
      c(5, 3.0, 1, '4\'-6" × 12 in · d = 8.5 in · 3,000 psi', 'b0 = 82 in', {});
      c(6, 2.4, 1, 'φVc = 0.75 × 4√3000 × 82 × 8.5 → 509 kN', '114 kips vs Vu 51 kips', { s1: 30 });
      c(7, 1.4, 1, '10 in thick: d = 6.5 in, b0 = 74 in', '79 kips vs 53 kips', { c2: C.orange, note: '67%' });
      E.rehook(ctx, t, B[4], "Here's the cookie cutter");
      E.rehook(ctx, t, B[7], 'Shave it to 10 in');
      E.nextCard(ctx, E.ramp(t, B[8] + 1.2, B[8] + 1.8, E.out), 'NEXT · FOUNDATION SERIES PART 3', 'The steel in a footing', 'Top or bottom? Follow to find out');
      E.parts(ctx, t, 2, true);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'FOUNDATION SERIES · PART 2', title: ['How a footing', 'actually fails'], tag: 'ENGIFORMULA' });
    },
  };
})();
