// Format: QUIZ COUNTDOWN (question, 3 options, timer ring, reveal + one-line why). Loops back to the question.
// #5 bar = 5/8 in = 15.875 mm vs 16 mm: 16 mm is larger by 0.125 mm (recomputed in Python).
SCENES['quiz-countdown'] = {
  duration: 10,
  draw(ctx, t) {
    const { C } = E;
    E.bg(ctx, 'paper');
    const opts = ['#5 bar (US)', '16 mm bar (metric)', 'Exactly the same'];
    const reveal = E.seg(t, 6.0, 6.4);
    opts.forEach((o, i) => {
      const a = E.ramp(t, 0.8 + i * 0.25, 1.2 + i * 0.25, E.back);
      if (a <= 0) return;
      const y = 640 + i * 150, right = i === 1;
      ctx.save(); ctx.globalAlpha = E.clamp(a);
      ctx.translate(0, 30 * (1 - a));
      ctx.fillStyle = reveal > 0 ? (right ? E.alpha(C.green, 0.12 + 0.88 * reveal) : E.alpha('#FFFFFF', 1 - 0.5 * reveal)) : '#FFFFFF';
      E.rrect(ctx, 64, y, 952, 112, 16); ctx.fill();
      ctx.strokeStyle = reveal > 0 && right ? C.green : C.grid; ctx.lineWidth = 3; ctx.stroke();
      E.text(ctx, String.fromCharCode(65 + i), 110, y + 72, { fam: 'mono', size: 40, color: reveal > 0 && right ? '#FFFFFF' : C.blue });
      E.text(ctx, o, 170, y + 72, { size: 40, weight: 600, color: reveal > 0 && right ? '#FFFFFF' : C.ink, alpha: reveal > 0 && !right ? 0.5 : 1 });
      ctx.restore();
    });
    // timer ring 5 s
    const tk = E.seg(t, 1.0, 6.0);
    if (t > 1.0 && t < 6.4) {
      ctx.save(); ctx.globalAlpha = 1 - E.seg(t, 6.0, 6.4);
      ctx.lineWidth = 14; ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.arc(540, 1230, 70, 0, 7); ctx.stroke();
      ctx.strokeStyle = C.yellow; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(540, 1230, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - tk)); ctx.stroke();
      E.text(ctx, String(Math.max(1, Math.ceil(5 * (1 - tk)))), 540, 1250, { fam: 'mono', size: 60, color: C.ink, align: 'center' });
      ctx.restore();
    }
    const w = E.ramp(t, 6.6, 7.2, E.out);
    if (w > 0) {
      ctx.save(); ctx.globalAlpha = w;
      E.text(ctx, '#5 = 5/8 in = 15.875 mm', 64, 1210, { fam: 'mono', size: 40, color: C.ink });
      E.text(ctx, '16 mm wins by 0.125 mm. Close enough', 64, 1270, { size: 34, weight: 500, color: C.muted });
      E.text(ctx, 'to swap? Check the spec first.', 64, 1316, { size: 34, weight: 500, color: C.muted });
      ctx.restore();
    }
    E.chrome(ctx, t, { pillar: 'community', series: 'QUIZ · 5 SECONDS', title: ['Which bar', 'is thicker?'], dark: false });
  },
};
