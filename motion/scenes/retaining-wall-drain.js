// Format: X-RAY CUTAWAY. Why retaining walls have weep holes: trapped water adds pressure behind the wall;
// a drain and weep holes let it out. Qualitative only (no numbers on screen), typical practice.
// Beats: wall section | soil + rain | water rises, pressure grows | drain + weep holes | 3D wall, row of holes | CTA.
SCENES['retaining-wall-drain'] = {
  duration: 11,
  beats: [0, 1.3, 2.8, 5.0, 7.0, 9.2, 11],
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    // section units: px-ish world, wall along y for the 3D phase
    const H = 60, T = 6, Bw = 36, Bt = 6; // stem height, stem thickness, base width, base thickness
    const k = E.ramp(t, 7.0, 8.6);
    const P = E.camera({ yaw: E.lerp(0, -0.75, k), pitch: E.lerp(0, 0.35, k), dist: 1600, scale: E.lerp(9.2, 6.5, k), cx: E.lerp(440, 560, k), cy: E.lerp(900, 800, k), target: [6, E.lerp(0, 60, k), 30] });
    const S = E.scene3d();
    const len = 120 * E.ramp(t, 7.2, 8.8);
    const drain = E.ramp(t, 5.0, 5.8);
    // water level behind the wall: rises 2.8-5.0, falls after the drain opens
    const wl = H * 0.85 * E.ramp(t, 2.8, 4.6) * (1 - 0.92 * E.ramp(t, 5.6, 6.8));
    // ---- 2D section (x across, z up), soil on the right of the stem ----
    const sec = 1 - E.seg(t, 7.0, 7.6);
    const Q = (x, z) => P([x, 0, z]);
    if (sec > 0) {
      ctx.save(); ctx.globalAlpha = sec;
      // soil block
      const sa = E.ramp(t, 1.3, 1.9);
      if (sa > 0) {
        ctx.fillStyle = E.alpha('#8C6A4A', 0.85 * sa);
        const s0 = Q(T, Bt), s1 = Q(Bw - 6, Bt), s2 = Q(Bw - 6, H), s3 = Q(T, H);
        ctx.beginPath(); ctx.moveTo(...s0.slice(0, 2)); ctx.lineTo(...s1.slice(0, 2)); ctx.lineTo(...s2.slice(0, 2)); ctx.lineTo(...s3.slice(0, 2)); ctx.closePath(); ctx.fill();
      }
      // water inside soil
      if (wl > 0.5) {
        ctx.fillStyle = E.alpha(C.blue, 0.65);
        const w0 = Q(T, Bt), w1 = Q(Bw - 6, Bt), w2 = Q(Bw - 6, Bt + wl), w3 = Q(T, Bt + wl);
        ctx.beginPath(); ctx.moveTo(...w0.slice(0, 2)); ctx.lineTo(...w1.slice(0, 2)); ctx.lineTo(...w2.slice(0, 2)); ctx.lineTo(...w3.slice(0, 2)); ctx.closePath(); ctx.fill();
        // pressure triangle on the stem (grows with depth), arrows push left
        const pr = wl / H;
        ctx.strokeStyle = '#FF6B6B'; ctx.fillStyle = '#FF6B6B'; ctx.lineWidth = 7;
        for (let i = 1; i <= 5; i++) {
          const z = Bt + wl - (wl * i) / 5 + 2, len = 60 + 240 * pr * (i / 5);
          const a = Q(T, z);
          E.arrow(ctx, a[0] + len, a[1], a[0] + 4, a[1], 24);
        }
      }
      // rain
      const ra = E.fade(t, 1.4, 1.8, 4.6, 5.0);
      if (ra > 0) { ctx.strokeStyle = E.alpha(C.line, 0.7 * ra); ctx.lineWidth = 3; for (let i = 0; i < 18; i++) { const x = T + 2 + (i * 7.3) % (Bw - 10), ph = ((t * 1.6 + i * 0.37) % 1); const p = Q(x, H + 12 - 14 * ph); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - 6, p[1] + 22); ctx.stroke(); } }
      // gravel drain + weep holes
      if (drain > 0) {
        ctx.fillStyle = E.alpha(C.steel, 0.9 * drain);
        const g0 = Q(T, Bt), g1 = Q(T + 5, Bt), g2 = Q(T + 5, H - 4), g3 = Q(T, H - 4);
        ctx.beginPath(); ctx.moveTo(...g0.slice(0, 2)); ctx.lineTo(...g1.slice(0, 2)); ctx.lineTo(...g2.slice(0, 2)); ctx.lineTo(...g3.slice(0, 2)); ctx.closePath(); ctx.fill();
        [Bt + 4, Bt + 22].forEach(z => { const a = Q(0, z), b = Q(T, z); ctx.strokeStyle = E.alpha(C.yellow, drain); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
        const fl = E.fade(t, 5.6, 5.9, 6.8, 7.0);
        if (fl > 0) { ctx.strokeStyle = E.alpha(C.blue, fl); ctx.lineWidth = 6; [Bt + 4, Bt + 22].forEach(z => { const a = Q(0, z); for (let j = 0; j < 3; j++) { const ph = (t * 2 + j / 3) % 1; ctx.beginPath(); ctx.arc(a[0] - 20 - 60 * ph, a[1] + 40 * ph * ph, 5, 0, 7); ctx.stroke(); } }); }
      }
      // wall outline (stem + base)
      const wall = [Q(-12, 0), Q(Bw - 12, 0), Q(Bw - 12, Bt), Q(T, Bt), Q(T, H), Q(0, H), Q(0, Bt), Q(-12, Bt)];
      ctx.fillStyle = E.alpha(C.concrete, 0.9 * E.ramp(t, 0.6, 1.2)); ctx.beginPath(); wall.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; E.path(ctx, wall.map(p => p.slice(0, 2)), E.ramp(t, 0.05, 0.9), true);
      const tl = E.fade(t, 3.6, 4.0, 4.8, 5.0);
      E.text(ctx, 'water pressure', Q(0, Bt + 20)[0] - 24, Q(0, Bt + 20)[1], { fam: 'mono', size: 30, color: '#FF6B6B', align: 'right', alpha: tl });
      const tw = E.fade(t, 5.6, 6.0, 6.8, 7.0);
      E.text(ctx, 'weep holes', Q(0, Bt + 22)[0] - 30, Q(0, Bt + 22)[1] - 20, { fam: 'mono', size: 30, color: C.yellow, align: 'right', alpha: tw });
      E.text(ctx, 'drain', Q(T + 5, H - 10)[0] + 16, Q(T + 5, H - 10)[1], { fam: 'mono', size: 30, color: '#FFFFFF', alpha: tw });
      ctx.restore();
    }
    // ---- 3D wall with a row of weep holes ----
    if (t > 7.0) {
      const a3 = E.seg(t, 7.0, 7.6);
      E.box(S, P, [-12, 0, 0], [Bw - 12, Math.max(len, 0.5), Bt], C.concrete, { edge: 'rgba(14,42,71,0.3)', alpha: a3 });
      E.box(S, P, [0, 0, Bt], [T, Math.max(len, 0.5), H], C.concrete, { edge: 'rgba(14,42,71,0.3)', alpha: a3 });
      for (let y = 10; y < len - 4; y += 20) {
        const r = 1.6, N = 10, ring = Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2; return [-0.2, y + r * Math.cos(a), Bt + 4 + r * Math.sin(a)]; });
        E.face(S, P, ring, '#1A2430', { cull: false, flat: true, layer: 1 });
      }
    }
    E.flush(ctx, S);
    const ha = E.fade(t, 8.8, 9.0, 9.1, 9.2);
    E.text(ctx, 'a row of weep holes along the wall', 540, 1100, { fam: 'mono', size: 32, color: C.yellow, align: 'center', alpha: E.fade(t, 8.4, 8.8, 9.2, 9.4), bg: C.navy });
    E.ctaCard(ctx, E.ramp(t, 9.3, 9.8, E.out), 'Blocked weep holes? Clear them.', 'Send this to your site team');
    E.chrome(ctx, t, { pillar: 'site', series: 'X-RAY', title: ['Why retaining walls', 'have weep holes'], tag: 'ENGIFORMULA' });
  },
};
