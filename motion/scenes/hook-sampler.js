// HOOK / RE-HOOK / CTA SAMPLER (v2 style): 12 short clips, one per beat, for the owner to pick standards.
// Numbers recomputed in Python: 10 ft wall, 120 pcf, phi 30 deg -> Ka = 1/3, P = 0.5 Ka g H^2 = 2,000 lb/ft at H/3 = 3.3 ft;
// drains clogged (gamma' = 57.6 pcf + water 62.4 pcf) -> 960 + 3,120 = 4,080 lb/ft = 2.04x.
// 6 m bays at 10 kPa: interior column 36 m2 -> 360 kN, corner 9 m2 -> 90 kN (4x). Slab 8 x 3 m: 8/3 = 2.7 > 2 -> one-way (typical practice).
(() => {
  const D0 = [4.415, 3.224, 3.938, 2.984, 4.594, 3.646, 3.592, 3.013, 3.367, 2.953, 4.157, 4.196];
  const CLIPS = [
    ['HOOK 1 · RESULT FIRST', '==2,000 lb== on every foot', 'wall'],
    ['HOOK 2 · COSTLY MISTAKE', 'Clogged drains = ==double load==', 'water'],
    ['HOOK 3 · CONTRADICTION', 'Same building. ==4× the load.==', 'columns'],
    ['HOOK 4 · CHALLENGE', 'One-way or two-way? ==3 seconds.==', 'quiz'],
    ['HOOK 5 · STORY', '1981: ==one rod change==', 'story'],
    ['RE-HOOK 1 · THE CATCH', '==But== there is a catch', 'catch'],
    ['RE-HOOK 2 · CODE CLASH', 'Eurocode ==disagrees==', 'clash'],
    ['RE-HOOK 3 · OPEN LOOP', 'Remember this ==number==', 'loop'],
    ['CTA 1 · FOLLOW', 'Part 2 ==drops tomorrow==', 'follow'],
    ['CTA 2 · COMMENT KEYWORD', 'Comment ==WALL==', 'comment'],
    ['CTA 3 · DM KEYWORD', 'DM ==SLAB==', 'dm'],
    ['CTA 4 · SAVE + SEND', '==Save== it. ==Send== it.', 'save'],
  ];
  let G = null;
  const SC = { get beats() { return E.beats(window.BEATS || D0); }, get duration() { const b = this.beats; return b[b.length - 1]; } };
  const { C } = E;
  const box = (x, y, w, h, col, r = 16) => { ctx_.fillStyle = col; E.rrect(ctx_, x, y, w, h, r); ctx_.fill(); };
  let ctx_ = null;

  // retaining wall with a pressure triangle; k = triangle scale (1 = 2,000 lb/ft), water = 0..1
  const wall = (ctx, u, k, water) => {
    const x0 = 250, top = 640, base = 1180, H = base - top;
    ctx.fillStyle = 'rgba(242,106,27,0.18)'; ctx.fillRect(x0 + 70, top + 10, 690, H - 10);           // retained soil
    ctx.strokeStyle = 'rgba(242,106,27,0.35)'; ctx.lineWidth = 2;
    for (let y = top + 40; y < base; y += 40) { ctx.beginPath(); ctx.moveTo(x0 + 80, y); ctx.lineTo(x0 + 750, y - 20); ctx.stroke(); }
    if (water > 0) { const wy = base - H * water; ctx.fillStyle = 'rgba(30,91,216,0.45)'; ctx.fillRect(x0 + 70, wy, 690, base - wy); }
    ctx.fillStyle = C.concrete; ctx.fillRect(x0, top, 70, H); ctx.fillRect(x0 - 120, base - 10, 330, 60);  // stem + footing
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3; ctx.strokeRect(x0, top, 70, H);
    const w = 260 * k; // triangle width at the base
    ctx.fillStyle = water > 0 ? 'rgba(199,58,58,0.55)' : 'rgba(255,193,69,0.6)';
    ctx.beginPath(); ctx.moveTo(x0 + 70, top); ctx.lineTo(x0 + 70 + w, base); ctx.lineTo(x0 + 70, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.fillStyle = '#FFFFFF'; ctx.lineWidth = 6;
    const ay = base - H / 3; E.arrow(ctx, x0 + 70 + w * 0.9 + 120, ay, x0 + 84, ay, 26);
    E.text(ctx, 'H/3', x0 + 70 + w * 0.9 + 130, ay + 12, { fam: 'mono', size: 34, color: '#FFFFFF' });
    E.text(ctx, '10 ft', x0 - 30, top + H / 2, { fam: 'mono', size: 34, color: C.line, align: 'right' });
  };

  SC.draw = function (ctx, t) {
    ctx_ = ctx; const B = this.beats; const i = E.beatOf(t, B), u = t - B[i], d = B[i + 1] - B[i];
    if (!G) G = E.capGroups(window.WORDS);
    E.bg2(ctx);
    const kind = CLIPS[i][2];
    ctx.save(); const pk = E.punch(t, B); ctx.translate(540, 860); ctx.scale(pk, pk); ctx.translate(-540, -860);
    if (kind === 'wall') { wall(ctx, u, 1, 0); E.bigNum(ctx, u, -0.3, '2,000 lb/ft', 640, 760, { size: 84 }); }
    if (kind === 'water') {
      const k = E.ramp(u, 0.2, 1.8, E.out); wall(ctx, u, E.lerp(1, 2.04, k), k);
      E.text(ctx, `${Math.round(E.lerp(2000, 4080, k)).toLocaleString('en-US')} lb/ft`, 720, 760, { fam: 'mono', size: 56, color: '#FFFFFF', align: 'center' });
      E.bigNum(ctx, u, 1.6, '2×', 860, 920, { size: 160, color: C.red });
    }
    if (kind === 'columns') {
      const g = 250, x0 = 165, y0 = 690; // 3x3 bays drawn as 3 x 2 visible bays
      ctx.fillStyle = 'rgba(255,193,69,0.55)'; const a = E.ramp(u, 0.2, 0.8, E.out);
      ctx.fillRect(x0 + g * 0.5 + g * 1, y0 + g * 0.5, g * a, g * a);                       // interior: full bay
      ctx.fillStyle = 'rgba(30,91,216,0.6)'; ctx.fillRect(x0, y0, g * 0.5 * a, g * 0.5 * a); // corner: quarter bay
      ctx.strokeStyle = 'rgba(207,224,255,0.5)'; ctx.lineWidth = 2;
      for (let c = 0; c <= 3; c++) { ctx.beginPath(); ctx.moveTo(x0 + c * g, y0); ctx.lineTo(x0 + c * g, y0 + 2 * g); ctx.stroke(); }
      for (let r = 0; r <= 2; r++) { ctx.beginPath(); ctx.moveTo(x0, y0 + r * g); ctx.lineTo(x0 + 3 * g, y0 + r * g); ctx.stroke(); }
      for (let c = 0; c <= 3; c++) for (let r = 0; r <= 2; r++) { ctx.fillStyle = (c === 2 && r === 1) ? C.yellow : (c === 0 && r === 0) ? C.blue : C.concrete; ctx.fillRect(x0 + c * g - 18, y0 + r * g - 18, 36, 36); }
      E.text(ctx, '360 kN', x0 + 2 * g, y0 + g + 70, { fam: 'mono', size: 40, color: C.navy, align: 'center', bg: C.yellow, pad: 10 });
      E.text(ctx, '90 kN', x0 + 40, y0 + 60, { fam: 'mono', size: 40, color: '#FFFFFF', bg: C.blue, pad: 10 });
      E.text(ctx, '6 m bays · 10 kPa', 540, y0 - 40, { fam: 'mono', size: 32, color: C.line, align: 'center' });
      E.bigNum(ctx, u, 1.6, '4×', 900, 600 + 2 * g, { size: 120, color: C.yellow });
    }
    if (kind === 'quiz') {
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.strokeRect(120, 700, 840, 315);
      E.text(ctx, '8 m', 540, 680, { fam: 'mono', size: 40, color: C.line, align: 'center' });
      E.text(ctx, '3 m', 990, 870, { fam: 'mono', size: 40, color: C.line });
      const k = E.seg(u, 0.2, d - 0.6), n = Math.max(1, Math.ceil(3 * (1 - k)));
      if (u < d - 0.6) {
        ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(207,224,255,0.25)'; ctx.beginPath(); ctx.arc(540, 1150, 70, 0, 7); ctx.stroke();
        ctx.strokeStyle = C.yellow; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(540, 1150, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); ctx.stroke();
        E.text(ctx, String(n), 540, 1172, { fam: 'mono', size: 64, color: '#FFFFFF', align: 'center' });
      } else E.bigNum(ctx, u, d - 0.6, 'ONE-WAY · 8/3 = 2.7 > 2', 540, 1150, { size: 50, color: C.green, fam: 'mono' });
      ctx.lineCap = 'butt';
    }
    if (kind === 'story') {
      E.bigNum(ctx, u, -0.3, '1981', 540, 720, { size: 200, color: '#FFFFFF' });
      ctx.strokeStyle = C.steel; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(540, 830); ctx.lineTo(540, 1180); ctx.stroke();
      [[960, 'walkway 1'], [1140, 'walkway 2']].forEach(([y, s]) => { ctx.fillStyle = C.concrete; ctx.fillRect(300, y, 480, 34); E.text(ctx, s, 800, y + 28, { fam: 'mono', size: 28, color: C.line }); });
      const a = E.ramp(u, 1.5, 2.0, E.out);
      ctx.fillStyle = E.alpha(C.red, a); ctx.beginPath(); ctx.arc(540, 977, 26, 0, 7); ctx.fill();
      E.bigNum(ctx, u, 2.2, '2× load', 300, 880, { size: 70, color: C.red });
    }
    if (kind === 'catch') {
      const sh = u < 0.4 ? Math.sin(u * 90) * 14 * (1 - u / 0.4) : 0;
      ctx.translate(sh, 0);
      ctx.fillStyle = C.yellow; E.rrect(ctx, 140, 720, 800, 300, 30); ctx.fill();
      E.text(ctx, 'BUT…', 540, 920, { fam: 'title', weight: 700, size: 190, color: C.navy, align: 'center' });
      E.text(ctx, 'only for one support type', 540, 1110, { fam: 'mono', size: 40, color: C.line, align: 'center', alpha: E.seg(u, 0.8, 1.2) });
    }
    if (kind === 'clash') {
      const a = E.ramp(u, 0, 0.35, E.out);
      ctx.fillStyle = C.blue; ctx.fillRect(-540 * (1 - a), 640, 540, 520); ctx.fillStyle = C.orange; ctx.fillRect(540 + 540 * (1 - a), 640, 540, 520);
      E.text(ctx, 'ACI 318', 270 - 540 * (1 - a), 880, { fam: 'title', weight: 700, size: 76, color: '#FFFFFF', align: 'center' });
      E.text(ctx, 'L / 16', 270 - 540 * (1 - a), 980, { fam: 'mono', size: 56, color: '#FFFFFF', align: 'center' });
      E.text(ctx, 'EC2', 810 + 540 * (1 - a), 880, { fam: 'title', weight: 700, size: 76, color: '#FFFFFF', align: 'center' });
      E.text(ctx, 'L/d 14–20', 810 + 540 * (1 - a), 980, { fam: 'mono', size: 56, color: '#FFFFFF', align: 'center' });
      E.bigNum(ctx, u, 0.5, 'VS', 540, 900, { size: 110, color: C.yellow });
    }
    if (kind === 'loop') {
      E.bigNum(ctx, u, -0.3, '4×', 540, 860, { size: 260, color: C.yellow });
      const a = E.ramp(u, 1.0, 1.4, E.back);
      ctx.save(); ctx.globalAlpha = E.clamp(a); ctx.translate(540, 1100); ctx.rotate(-0.06);
      E.text(ctx, 'COMES BACK IN PART 3', 0, 0, { fam: 'mono', size: 44, color: '#FFFFFF', bg: C.orange, pad: 18, align: 'center' }); ctx.restore();
    }
    if (kind === 'follow') {
      box(120, 640, 840, 420, '#FFFFFF', 28);
      ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(250, 770, 80, 0, 7); ctx.fill();
      E.text(ctx, 'EF', 250, 792, { fam: 'title', weight: 700, size: 64, color: C.yellow, align: 'center' });
      E.text(ctx, '@engiformula', 360, 760, { fam: 'title', weight: 700, size: 52, color: C.ink });
      E.text(ctx, 'Civil engineering, computed', 360, 815, { size: 32, weight: 500, color: C.muted });
      const pressed = u > 1.3, s = 1 - 0.08 * Math.max(0, 1 - Math.abs(u - 1.3) / 0.15);
      ctx.save(); ctx.translate(540, 960); ctx.scale(s, s);
      ctx.fillStyle = pressed ? C.concrete : C.blue; E.rrect(ctx, -360, -50, 720, 100, 18); ctx.fill();
      E.text(ctx, pressed ? 'Following' : 'Follow', 0, 16, { fam: 'title', weight: 700, size: 46, color: pressed ? C.ink : '#FFFFFF', align: 'center' }); ctx.restore();
      ['PART 1', 'PART 2 · TOMORROW', 'PART 3'].forEach((p, k) => E.text(ctx, p, [200, 540, 880][k], 1170, { fam: 'mono', size: 28, color: k === 1 ? C.navy : C.line, bg: k === 1 ? C.yellow : 'rgba(207,224,255,0.15)', pad: 12, align: 'center' }));
    }
    if (kind === 'comment' || kind === 'dm') {
      const word = kind === 'comment' ? 'WALL' : 'SLAB';
      box(90, 620, 900, 560, '#FFFFFF', 28);
      E.text(ctx, kind === 'comment' ? 'Comments' : 'engiformula', 140, 690, { fam: 'title', weight: 700, size: 40, color: C.ink });
      const typed = E.type(word, E.seg(u, 0.4, 1.0));
      if (kind === 'comment') {
        box(130, 1060, 820, 90, '#F0F2F5', 45);
        E.text(ctx, typed || 'Add a comment…', 175, 1118, { size: 38, weight: 600, color: typed ? C.ink : C.muted });
        if (u > 1.2) { box(130, 760, 560, 90, '#F0F2F5', 24); E.text(ctx, 'you: ' + word, 160, 818, { size: 38, weight: 600, color: C.ink }); }
        if (u > 1.8) { box(260, 880, 690, 120, C.blue, 24); E.text(ctx, 'Sent you the pressure sheet', 290, 935, { size: 34, weight: 600, color: '#FFFFFF' }); E.text(ctx, 'check your DMs', 290, 980, { size: 30, weight: 500, color: '#FFFFFF' }); }
      } else {
        if (u > 0.4) { box(620, 760, 330, 100, C.blue, 40); E.text(ctx, typed, 785, 826, { fam: 'title', weight: 700, size: 46, color: '#FFFFFF', align: 'center' }); }
        if (u > 1.6) { box(130, 900, 640, 170, '#F0F2F5', 30); E.text(ctx, 'Here you go:', 165, 955, { size: 34, weight: 600, color: C.ink }); E.text(ctx, 'Slab thickness table.pdf', 165, 1030, { fam: 'mono', size: 32, color: C.blue }); }
      }
    }
    if (kind === 'save') {
      const a = E.ramp(u, 0.3, 0.7, E.back), b = E.ramp(u, 1.4, 1.8, E.out);
      ctx.save(); ctx.translate(330, 880); ctx.scale(1 + 0.15 * Math.sin(Math.PI * E.seg(u, 0.3, 0.7)), 1 + 0.15 * Math.sin(Math.PI * E.seg(u, 0.3, 0.7)));
      ctx.beginPath(); ctx.moveTo(-90, -130); ctx.lineTo(90, -130); ctx.lineTo(90, 130); ctx.lineTo(0, 60); ctx.lineTo(-90, 130); ctx.closePath();
      ctx.fillStyle = E.alpha(C.yellow, E.clamp(a)); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(750 + 120 * b, 880 - 120 * b); ctx.rotate(-0.4);
      ctx.beginPath(); ctx.moveTo(-110, 0); ctx.lineTo(110, -90); ctx.lineTo(40, 100); ctx.lineTo(10, 20); ctx.closePath();
      ctx.fillStyle = C.blue; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.stroke(); ctx.restore();
      E.text(ctx, 'SAVE', 330, 1100, { fam: 'mono', size: 44, color: '#FFFFFF', align: 'center' });
      E.text(ctx, 'SEND', 750, 1100, { fam: 'mono', size: 44, color: '#FFFFFF', align: 'center' });
    }
    ctx.restore();
    // label + headline + captions
    E.text(ctx, CLIPS[i][0], 64, 268, { fam: 'mono', size: 30, color: C.navy, bg: C.yellow, pad: 16 });
    E.text(ctx, `${i + 1}/12`, 1016, 268, { fam: 'mono', size: 28, color: C.line, align: 'right' });
    E.headline(ctx, t, B[i], CLIPS[i][1], { first: t < 0.05 });
    E.kcap(ctx, t, G);
    E.flash(ctx, t, B);
  };
  SCENES['hook-sampler'] = SC;
})();
