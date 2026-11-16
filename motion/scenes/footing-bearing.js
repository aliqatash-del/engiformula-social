// FOUNDATION SERIES 1/3 · Why footings spread. Recomputed in Python:
// 40 kips (178 kN) on a 12 × 12 in column base = 40,000 psf (278 psi) = 20× a 2,000 psf allowable (sand,
// IBC 2021 Table 1806.2 presumptive values: sand 2,000, clay 1,500, sandy gravel/gravel 3,000 psf).
// A = 40,000 / 2,000 = 20 ft² → 4.47 ft → 4'-6" square (1.37 m); clay 26.7 ft² → 5.16 ft → 5'-2"; gravel 13.3 ft² → 3.65 ft → 3'-8".
// Beats (9 slides): hook | 40 kips | sand | spread | 4'-6" | clay | gravel | bulb | next.
(() => {
  const B = E.beats([5.8, 6.2, 5.8, 5.5, 4.7, 5.1, 3.9, 7.0, 5.8]);
  SCENES['footing-bearing'] = {
    duration: B[B.length - 1], beats: B,
    draw(ctx, t) {
      const { C } = E;
      E.bg(ctx, 'blueprint');
      // footing half-width in inches through the story
      let h = 6;
      h = E.lerp(h, 27, E.ramp(t, B[3] + 0.4, B[4]));
      h = E.lerp(h, 31, E.ramp(t, B[5] + 0.4, B[5] + 1.6));
      h = E.lerp(h, 22, E.ramp(t, B[6] + 0.2, B[6] + 1.4));
      h = E.lerp(h, 27, E.ramp(t, B[8], B[8] + 1));
      const soil = t < B[5] + 0.4 ? 2000 : t < B[6] + 0.2 ? 1500 : t < B[8] ? 3000 : 2000;
      const A = Math.pow(2 * h / 12, 2), q = 40000 / A, ratio = q / soil;
      const heat = ratio > 1.05 ? C.red : C.green;
      const a3 = 1 - E.seg(t, B[7], B[7] + 0.6) + E.seg(t, B[8], B[8] + 0.6);
      if (a3 > 0) {
        ctx.save(); ctx.globalAlpha = E.clamp(a3);
        const P = E.camera({ yaw: -0.6 + 0.15 * Math.sin(t * 0.25), pitch: 0.5, dist: 2400, scale: 5.0, cx: 470, cy: 760, target: [0, 0, 6] });
        const S = E.scene3d();
        E.ground(S, P, -48, 48, -48, 48, 12, 0.3, -12);
        E.box(S, P, [-h, -h, -12], [h, h, 0], heat === C.red && h < 7 ? C.concrete : C.concrete, { edge: 'rgba(14,42,71,0.35)' });
        // pressure patch under the footing (heat)
        E.face(S, P, [[-h, -h, -11.9], [h, -h, -11.9], [h, h, -11.9], [-h, h, -11.9]].reverse(), heat, { flat: true, alpha: 0.35, cull: false, layer: -1 });
        const cl = E.ramp(t, 0.05, 0.5, E.out);
        E.box(S, P, [-6, -6, 0], [6, 6, 44 * cl], C.steel, { edge: 'rgba(14,42,71,0.4)' });
        E.flush(ctx, S);
        // load arrow
        const top = P([0, 0, 44]);
        const drop = E.ramp(t, 0.3, 0.8, E.back);
        ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 10;
        if (drop > 0) E.arrow(ctx, top[0], top[1] - 110, top[0], top[1] - 14, 30);
        E.text(ctx, '40 kips', top[0] + 30, top[1] - 70, { fam: 'mono', size: 38, color: C.orange, alpha: E.seg(t, 0.6, 1.0) });
        E.text(ctx, '(178 kN)', top[0] + 30, top[1] - 32, { fam: 'mono', size: 28, color: C.line, alpha: E.seg(t, 0.8, 1.2) });
        // size label
        const ftIn = h <= 6.5 ? '1 ft column' : h < 24 ? "3'-8\"" : h < 29 ? "4'-6\"" : "5'-2\"";
        const pf = P([h, -h, -12]), pb = P([h, h, -12]);
        if (h > 7) E.dim(ctx, pf, pb, 50, ftIn, 1, '#FFFFFF');
        ctx.restore();
        // pressure meter (log scale 1,000 → 40,000 psf)
        const mx = 930, my0 = 980, my1 = 600, ly = v => my0 - (my1 - my0) * -1 * (Math.log10(v / 1000) / Math.log10(40));
        ctx.save(); ctx.globalAlpha = E.clamp(a3) * E.seg(t, 0.3, 0.8);
        ctx.fillStyle = 'rgba(207,224,255,0.12)'; E.rrect(ctx, mx - 22, my1 - 10, 44, my0 - my1 + 20, 22); ctx.fill();
        const yq = ly(Math.min(40000, Math.max(1000, q)));
        ctx.fillStyle = heat; E.rrect(ctx, mx - 16, yq, 32, my0 - yq, 16); ctx.fill();
        const ya = ly(soil);
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(mx - 60, ya); ctx.lineTo(mx + 40, ya); ctx.stroke(); ctx.setLineDash([]);
        E.text(ctx, `${soil.toLocaleString('en-US')} allowed`, mx - 70, ya + 10, { fam: 'mono', size: 24, color: '#FFFFFF', align: 'right' });
        E.text(ctx, `${Math.round(q).toLocaleString('en-US')} psf`, mx - 70, Math.min(yq + 10, ya - 40), { fam: 'mono', size: 30, color: heat, align: 'right' });
        E.text(ctx, 'PRESSURE', mx, my0 + 50, { fam: 'mono', size: 22, color: C.line, align: 'center' });
        ctx.restore();
        // soil chip
        const name = soil === 2000 ? 'SAND' : soil === 1500 ? 'CLAY' : 'GRAVEL';
        E.text(ctx, `${name} · ${soil.toLocaleString('en-US')} psf allowable`, 64, 640, { fam: 'mono', size: 28, color: C.navy, bg: soil === 1500 ? '#C9A27A' : soil === 3000 ? '#BFC7D2' : C.yellow, alpha: E.seg(t, B[2], B[2] + 0.5) * E.clamp(a3) * (t > B[8] ? 0 : 1) });
      }
      // pressure bulbs (section)
      const bs = E.fade(t, B[7] + 0.3, B[7] + 0.9, B[8], B[8] + 0.5);
      if (bs > 0) {
        ctx.save(); ctx.globalAlpha = bs;
        const yg = 640;
        ctx.fillStyle = 'rgba(140,106,74,0.35)'; ctx.fillRect(0, yg, 1080, 360);
        [[300, 44, '3\'-8"'], [780, 62, '5\'-2"']].forEach(([cx, w, lab], j) => {
          const px = w * 2.6, grow = E.ramp(t, B[7] + 0.8 + j * 0.8, B[7] + 2.8 + j * 0.8);
          for (let k = 4; k >= 1; k--) {
            ctx.strokeStyle = E.alpha(C.yellow, 0.25 + 0.18 * (4 - k)); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(cx, yg + 30, px * (0.35 + 0.25 * k) * 0.75, px * 0.42 * k * grow, 0, 0, Math.PI); ctx.stroke();
          }
          ctx.fillStyle = C.concrete; ctx.fillRect(cx - px / 2, yg, px, 30);
          ctx.fillStyle = C.steel; ctx.fillRect(cx - 16, yg - 150, 32, 150);
          E.text(ctx, lab, cx, yg - 170, { fam: 'mono', size: 30, color: '#FFFFFF', align: 'center' });
        });
        ctx.restore();
      }
      // cards
      const c = (i, a, b, l1, l2, o) => E.card(ctx, E.fade(t, B[i] + a, B[i] + a + 0.4, B[i + b], B[i + b] + 0.3), l1, l2, o);
      c(1, 0.4, 1, '40 kips on a 12 × 12 in column = 1 ft²', '= 40,000 psf', { c2: C.red, note: '(278 psi)' });
      c(2, 0.4, 1, 'sand: IBC 2021 Table 1806.2', '2,000 psf allowed', { c2: C.green, note: '(96 kPa) · 20× less' });
      c(3, 0.6, 1, 'area needed = 40,000 / 2,000', `= ${E.count(20, E.seg(t, B[3] + 1, B[3] + 2.2))} ft²`, { note: '(1.86 m²)' });
      c(4, 0.2, 1, '√20 = 4.47 ft → round up', '4\'-6" square', { note: '(1.37 m)' });
      c(5, 0.8, 1, 'clay: 40,000 / 1,500 = 26.7 ft²', '5\'-2" square', { note: '(1.57 m)' });
      c(6, 0.6, 1, 'gravel: 40,000 / 3,000 = 13.3 ft²', '3\'-8" square', { note: '(1.12 m)' });
      c(7, 1.4, 1, 'stress spreads below the footing:', 'wider footing → deeper bulb', { s2: 40 });
      E.rehook(ctx, t, B[3], 'So spread it');
      E.rehook(ctx, t, B[5], 'Same column on clay?');
      E.rehook(ctx, t, B[7], 'What happens below?');
      E.nextCard(ctx, E.ramp(t, B[8] + 0.8, B[8] + 1.4, E.out), 'NEXT · FOUNDATION SERIES PART 2', 'How a footing actually fails', 'Follow so you catch it');
      E.parts(ctx, t, 1, true);
      E.chrome(ctx, t, { pillar: 'knowledge', series: 'FOUNDATION SERIES · PART 1', title: ['Why footings', 'spread out'], tag: 'ENGIFORMULA' });
    },
  };
})();
