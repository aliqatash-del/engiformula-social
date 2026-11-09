// Format: BLUEPRINT TO BUILD (2D section draws itself, extrudes into a 3D member, cage fills, concrete pours).
// Example: 12 x 24 in beam, 20 ft long. Volume 1 x 2 x 20 = 40 ft3 = 1.48 yd3 (1.13 m3), recomputed in Python.
SCENES['section-to-beam'] = {
  duration: 11,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const b = 12, h = 24, L = 240;
    const bars = [[-3.5, 2.5, 0.5], [0, 2.5, 0.5], [3.5, 2.5, 0.5], [-3.69, 21.69, 0.3125], [3.69, 21.69, 0.3125]];
    const si = 1.75; // stirrup centreline inset

    const k = E.ramp(t, 3.6, 6.4);              // 2D -> 3D camera move
    const ext = L * E.ramp(t, 3.9, 6.6);       // extrusion length
    const P = E.camera({
      yaw: E.lerp(0, -0.55, k) - 0.18 * E.seg(t, 6.4, 11), pitch: E.lerp(0, 0.36, k) + 0.08 * E.seg(t, 6.4, 11), dist: 2600,
      scale: E.lerp(20, 4.1, k), cx: E.lerp(540, 600, k), cy: E.lerp(930, 900, k),
      target: [0, E.lerp(0, L / 2, k), h / 2],
    });
    const S = E.scene3d();
    E.ground(S, P, -60, 60, 0, L, 12, 0.35 * k, 0);

    // --- 2D drawing phase (section in the x-z plane at y = 0) ---
    const a2d = 1 - E.seg(t, 4.2, 5.2);
    const outline = [[-b / 2, 0, 0], [b / 2, 0, 0], [b / 2, 0, h], [-b / 2, 0, h]].map(P);
    if (a2d > 0) {
      ctx.save(); ctx.globalAlpha = a2d;
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5; E.path(ctx, outline, E.ramp(t, 0.4, 2.0), true);
      ctx.strokeStyle = C.orange; ctx.lineWidth = 4;
      E.path(ctx, [[-b / 2 + si, 0, si], [b / 2 - si, 0, si], [b / 2 - si, 0, h - si], [-b / 2 + si, 0, h - si]].map(P), E.ramp(t, 2.3, 3.2), true);
      bars.forEach(([x, z, r], i) => {
        const pk = E.back(E.seg(t, 2.6 + i * 0.12, 3.0 + i * 0.12));
        if (pk <= 0) return; const q = P([x, 0, z]);
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(q[0], q[1], r * 20 * pk, 0, 7); ctx.fill();
      });
      E.dim(ctx, outline[0], outline[1], 70, '12 in', E.ramp(t, 1.5, 2.3));
      E.dim(ctx, outline[1], outline[2], 70, '24 in', E.ramp(t, 1.8, 2.6));
      const la = E.seg(t, 3.0, 3.4);
      E.text(ctx, '2 #5 top', outline[3][0] - 26, outline[3][1] + 70, { fam: 'mono', size: 28, color: C.yellow, align: 'right', alpha: la });
      E.text(ctx, '3 #8 bottom', outline[0][0] - 26, outline[0][1] - 40, { fam: 'mono', size: 28, color: C.yellow, align: 'right', alpha: la });
      E.text(ctx, '#4 stirrup', outline[0][0] - 26, outline[0][1] - 230, { fam: 'mono', size: 28, color: C.orange, align: 'right', alpha: la });
      ctx.restore();
    }

    // --- 3D phase ---
    if (t > 3.9) {
      const pour = E.ramp(t, 7.9, 9.0);           // concrete level rises
      const cageA = E.clamp((t - 3.9) / 0.6);
      bars.forEach(([x, z, r]) => E.rodY(S, P, x, z, r * 1.25, 0, Math.max(ext, 0.5), C.orange, 8, { alpha: cageA }));
      const nSt = 30;
      for (let i = 0; i < nSt; i++) {
        const y = 2 + 8 * i;
        if (y > ext) break;
        const sk = E.seg(t, 6.0 + i * 0.05, 6.3 + i * 0.05);
        if (sk <= 0) continue;
        const pts = [[-b / 2 + si, y, si], [b / 2 - si, y, si], [b / 2 - si, y, h - si], [-b / 2 + si, y, h - si], [-b / 2 + si, y, si]];
        E.line3(S, P, pts, C.orange, 3, { alpha: sk, bias: 0.5 });
      }
      // ghost concrete (wire) during the build, solid concrete as it pours
      const ghost = 1 - pour;
      if (ghost > 0 && ext > 1) {
        const v = [[-b / 2, 0, 0], [b / 2, 0, 0], [b / 2, 0, h], [-b / 2, 0, h]];
        const w = v.map(p => [p[0], ext, p[2]]);
        for (let i = 0; i < 4; i++) {
          E.line3(S, P, [v[i], v[(i + 1) % 4]], '#FFFFFF', 3, { alpha: ghost, layer: 2 });
          E.line3(S, P, [w[i], w[(i + 1) % 4]], '#FFFFFF', 3, { alpha: ghost, layer: 2 });
          E.line3(S, P, [v[i], w[i]], '#FFFFFF', 3, { alpha: ghost, layer: 2 });
        }
      }
      if (pour > 0) E.box(S, P, [-b / 2, 0, 0], [b / 2, L, h * pour], C.concrete, { edge: 'rgba(14,42,71,0.35)', layer: 1 });
    }
    E.flush(ctx, S);

    // labels + result
    const dl = E.fade(t, 6.4, 6.8, 7.8, 8.0);
    if (dl > 0) {
      E.text(ctx, '20 ft', 820, 1150, { fam: 'mono', size: 34, color: C.line, alpha: dl, bg: C.navy });
      E.text(ctx, '30 stirrups @ 8 in', 140, 1150, { fam: 'mono', size: 30, color: C.orange, alpha: dl, bg: C.navy });
    }
    const r = E.ramp(t, 9.0, 9.6, E.out);
    if (r > 0) {
      ctx.save(); ctx.globalAlpha = r;
      ctx.fillStyle = '#FFFFFF'; E.rrect(ctx, 64, 1110, 952, 150, 16); ctx.fill();
      E.text(ctx, '1 × 2 × 20 ft = 40 ft³', 100, 1172, { fam: 'mono', size: 36, color: C.muted });
      E.text(ctx, `= ${E.count(1.48, E.seg(t, 9.0, 9.9), 2)} yd³  (1.13 m³)`, 100, 1230, { fam: 'mono', size: 46, color: C.blue });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'knowledge', series: 'BLUEPRINT → BUILD', title: ['From section', 'to beam'] });
  },
};
