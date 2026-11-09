// Format: BUILD SEQUENCE (stylized time-lapse: each stage drops in with a label; no photos, no real site).
SCENES['build-sequence'] = {
  duration: 10,
  beats: [0, 1.93, 3.26, 4.59, 5.92, 7.25, 8.6, 10], // one stage per slide, then CTA
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'blueprint');
    const P = E.camera({ yaw: -0.7 - 0.25 * E.seg(t, 0, 10), pitch: 0.5, dist: 2400, scale: 2.6, cx: 650, cy: 820, target: [0, 0, 60] });
    const S = E.scene3d();
    E.ground(S, P, -120, 120, -120, 120, 24, 0.3, 0);
    const stages = ['Excavate', 'Footings', 'Columns', 'Slab', 'Next level', 'Roof'];
    const st = Math.min(5, Math.floor(E.seg(t, 0.6, 8.6) * 6));
    const drop = (i, a, b) => { const s0 = 0.6 + i * 1.33; return E.ramp(t, s0, s0 + 0.7, E.back); };
    // excavation pit
    const e0 = drop(0);
    if (e0 > 0) E.box(S, P, [-100, -80, -24 * e0], [100, 80, 0], '#8C6A4A', { edge: 'rgba(255,255,255,0.2)', cull: true });
    const cols = [[-80, -60], [0, -60], [80, -60], [-80, 60], [0, 60], [80, 60]];
    const f = drop(1);
    if (f > 0) cols.forEach(([x, y]) => E.box(S, P, [x - 16, y - 16, -24 + 60 * (1 - f)], [x + 16, y + 16, -10 + 60 * (1 - f)], C.concrete, { edge: 'rgba(14,42,71,0.35)' }));
    const c1 = drop(2);
    if (c1 > 0) cols.forEach(([x, y]) => E.box(S, P, [x - 6, y - 6, -10], [x + 6, y + 6, -10 + 70 * c1], C.steel, { edge: 'rgba(14,42,71,0.4)' }));
    const s1 = drop(3);
    if (s1 > 0) E.box(S, P, [-100, -80, 60 + 80 * (1 - s1)], [100, 80, 68 + 80 * (1 - s1)], C.concrete, { edge: 'rgba(14,42,71,0.35)' });
    const c2 = drop(4);
    if (c2 > 0) cols.forEach(([x, y]) => E.box(S, P, [x - 6, y - 6, 68], [x + 6, y + 6, 68 + 66 * c2], C.steel, { edge: 'rgba(14,42,71,0.4)' }));
    const r1 = drop(5);
    if (r1 > 0) E.box(S, P, [-100, -80, 134 + 80 * (1 - r1)], [100, 80, 142 + 80 * (1 - r1)], C.blue, { edge: 'rgba(255,255,255,0.3)' });
    E.flush(ctx, S);
    // stage ticker
    stages.forEach((s, i) => {
      const on = i <= st && t > 0.6;
      const y = 620 + i * 58, x = 64;
      E.text(ctx, `${i + 1} ${s}`, x, y, { fam: 'mono', size: 30, color: on ? (i === st ? C.yellow : '#FFFFFF') : 'rgba(207,224,255,0.3)' });
    });
    E.ctaCard(ctx, E.ramp(t, 8.7, 9.2, E.out), 'Which stage runs late on your jobs?', 'Comment below · follow for more');
    E.chrome(ctx, t, { pillar: 'site', series: 'BUILD SEQUENCE', title: ['How a frame', 'goes up'], tag: 'ENGIFORMULA' });
  },
};
