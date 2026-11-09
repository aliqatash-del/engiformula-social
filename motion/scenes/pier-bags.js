// Reel 2026-11-09-bags-for-a-post-pier, rebuilt in the motion style (Plan -> Solid + live calculator).
// Timed to the existing voiceover (beats at 0, 5.22, 11.27, 16.27, 21.44, 26.44, 31.74 s).
// Numbers (recomputed in Python): pi x 0.5^2 x 4 = 3.14 ft3 (0.089 m3); 80 lb bag ~ 0.6 ft3 (typical yield);
// 3.14 / 0.6 = 5.24 -> 6 bags. One bag fills 0.6 / 3.1416 x 48 = 9.17 in of the 48 in hole.
SCENES['pier-bags'] = {
  duration: 31.74,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const B = [0, 5.22, 11.27, 16.27, 21.44, 26.44, 31.74];
    const r = 6, D = 48, perBag = (0.6 / Math.PI) / 1 * 48 / 1; // inches of depth per bag
    const fillPerBag = 0.6 / (Math.PI * 0.25 * 4) * D;           // 9.17 in
    const k = E.ramp(t, 4.6, 6.8) * (1 - E.ramp(t, 29.6, 31.6));  // tilt in, tilt back for the loop
    const spin = 0.35 * E.seg(t, 6.8, 29.6);
    const P = E.camera({
      yaw: E.lerp(0, -0.5, k) - spin * k, pitch: E.lerp(0, 0.5, k), dist: 1400,
      scale: E.lerp(9.0, 8.2, k), cx: E.lerp(540, 470, k), cy: E.lerp(640, 600, k), target: [0, 0, -D / 2 + E.lerp(0, 6, k)],
    });
    const S = E.scene3d();

    // ---- beat 1: 2D section (elevation) ----
    const a2 = 1 - E.seg(t, 5.0, 6.0);
    if (a2 > 0) {
      ctx.save(); ctx.globalAlpha = a2;
      const g0 = P([-40, 0, 0]), g1 = P([40, 0, 0]);
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; E.path(ctx, [g0, g1], E.ramp(t, 0.2, 0.9));
      // ground hatch
      ctx.strokeStyle = 'rgba(207,224,255,0.35)'; ctx.lineWidth = 2;
      for (let x = -38; x < 38; x += 5) if (Math.abs(x) > r + 2) { const p = P([x, 0, 0]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 14, p[1] + 14); ctx.globalAlpha = a2 * E.seg(t, 0.6, 1.0); ctx.stroke(); }
      ctx.globalAlpha = a2;
      const hole = [[-r, 0, 0], [-r, 0, -D], [r, 0, -D], [r, 0, 0]].map(P);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; E.path(ctx, hole, E.ramp(t, 0.6, 2.2));
      E.dim(ctx, hole[0], hole[3], -50, '12 in', E.ramp(t, 1.6, 2.4));
      E.dim(ctx, hole[3], hole[2], -60, '4 ft', E.ramp(t, 2.6, 3.4));
      ctx.restore();
    }

    // ---- 3D pier hole and fill ----
    if (t > 5.0) {
      const N = 28, ring = Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; return [r * Math.cos(a), r * Math.sin(a)]; });
      const ga = E.seg(t, 5.0, 5.8);
      E.ground(S, P, -36, 36, -36, 36, 6, 0.3 * ga, 0);
      // wire hole
      for (let i = 0; i < N; i += 2) E.line3(S, P, [[ring[i][0], ring[i][1], 0], [ring[i][0], ring[i][1], -D]], '#FFFFFF', 1.5, { alpha: 0.35 * ga, layer: 2 });
      [0, -D].forEach(z => E.line3(S, P, [...ring, ring[0]].map(([x, y]) => [x, y, z]), '#FFFFFF', 3, { alpha: ga, layer: 2 }));
      // fill level: bags 1-5 between 16.6 and 21.0 s, bag 6 at 22.0 s (capped at the top)
      let bags = 0;
      for (let b = 0; b < 5; b++) bags += E.ramp(t, 16.6 + b * 0.85, 17.3 + b * 0.85, E.out);
      bags += E.ramp(t, 21.9, 22.7, E.out);
      const h = Math.min(D, bags * fillPerBag);
      if (h > 0.2) {
        for (let i = 0; i < N; i++) {
          const p = ring[i], q = ring[(i + 1) % N];
          E.face(S, P, [[p[0], p[1], -D], [q[0], q[1], -D], [q[0], q[1], -D + h], [p[0], p[1], -D + h]], C.concrete, { layer: 1 });
        }
        E.face(S, P, ring.map(([x, y]) => [x, y, -D + h]), C.concrete, { layer: 1, edge: 'rgba(14,42,71,0.25)' });
      }
      // bag lines inside the fill (one per bag)
      for (let b = 1; b <= Math.floor(bags + 1e-6) && b * fillPerBag < D; b++)
        E.line3(S, P, [...ring, ring[0]].map(([x, y]) => [x, y, -D + b * fillPerBag]), C.steel, 2, { layer: 1.5 });
      // the falling bag
      const drops = [16.6, 17.45, 18.3, 19.15, 20.0, 21.9];
      drops.forEach((s0, i) => {
        const f = E.seg(t, s0 - 0.5, s0 + 0.15);
        if (f <= 0 || f >= 1) return;
        const z = E.lerp(40, -D + i * fillPerBag + 4, f * f);
        E.box(S, P, [-5, -3.5, z], [5, 3.5, z + 9], i === 5 ? C.orange : C.yellow, { edge: 'rgba(14,42,71,0.5)', layer: 3 });
      });
    }
    E.flush(ctx, S);

    // ---- beat 3: one bag, shown beside the hole ----
    const bg = E.fade(t, 11.4, 12.0, 15.9, 16.4);
    if (bg > 0) {
      const S2 = E.scene3d();
      const P2 = E.camera({ yaw: -0.5, pitch: 0.45, dist: 1400, scale: 9, cx: 860, cy: 760, target: [0, 0, 0] });
      const lift = 30 * (1 - E.back(E.seg(t, 11.4, 12.2)));
      E.box(S2, P2, [-7, -4.5, lift], [7, 4.5, 16 + lift], C.yellow, { edge: 'rgba(14,42,71,0.5)' });
      ctx.save(); ctx.globalAlpha = bg; E.flush(ctx, S2);
      E.text(ctx, '80 lb', 860, 700, { fam: 'mono', size: 30, color: C.navy, align: 'center' });
      ctx.restore();
    }

    // ---- live calculator card (beats 2-5), above the caption zone ----
    const ca = E.ramp(t, 5.6, 6.2, E.out);
    if (ca > 0) {
      ctx.save(); ctx.globalAlpha = ca;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1010, 952, 170, 16); ctx.fill();
      let l1 = '', l2 = '', c2 = C.blue;
      if (t < B[2]) { l1 = '12 in Ø = 0.5 ft radius'; l2 = `π × 0.5² × 4 = ${E.count(3.14, E.seg(t, 7.6, 10.2), 2)} ft³`; }
      else if (t < B[3]) { l1 = 'Hole: 3.14 ft³ (0.089 m³)'; l2 = '80 lb bag ≈ 0.6 ft³'; c2 = C.ink; }
      else if (t < B[4]) { l1 = '3.14 ÷ 0.6'; l2 = `= ${E.count(5.2, E.seg(t, 16.6, 20.6), 1)} bags`; }
      else { l1 = 'Round up. A short bag means a cold joint.'; l2 = '6 bags per pier'; c2 = C.green; }
      E.text(ctx, l1, 100, 1072, { fam: l1.length > 30 ? 'body' : 'mono', size: 34, weight: 500, color: C.muted });
      E.text(ctx, l2, 100, 1146, { fam: 'mono', size: 56, color: c2 });
      ctx.restore();
    }
    // bag counter chips
    const shown = t > 16.6 ? Math.min(6, (t > 21.9 ? 6 : Math.min(5, Math.floor((t - 16.6) / 0.85) + 1))) : 0;
    if (shown > 0 && t < B[5]) for (let i = 0; i < shown; i++) {
      ctx.fillStyle = i === 5 ? C.orange : C.yellow; E.rrect(ctx, 760 + (i % 3) * 82, 470 + Math.floor(i / 3) * 82, 66, 66, 10); ctx.fill();
      E.text(ctx, String(i + 1), 793 + (i % 3) * 82, 515 + Math.floor(i / 3) * 82, { fam: 'mono', size: 30, color: C.navy, align: 'center' });
    }
    // ---- beat 6: CTA ----
    const cta = E.ramp(t, 26.5, 27.1, E.out) * (1 - E.seg(t, 31.2, 31.74));
    if (cta > 0) {
      ctx.save(); ctx.globalAlpha = cta;
      ctx.fillStyle = C.blue; E.rrect(ctx, 64, 1010, 952, 170, 16); ctx.fill();
      E.text(ctx, 'Every pier, every size', 100, 1076, { fam: 'title', weight: 700, size: 46, color: '#FFFFFF' });
      E.text(ctx, 'Free calculator → link in bio', 100, 1144, { size: 38, weight: 600, color: '#FFFFFF' });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'calculator', series: 'PLAN → SOLID', title: ['Bags for a 12 in', 'pier, 4 ft deep?'], tag: 'ENGIFORMULA' });
  },
};
