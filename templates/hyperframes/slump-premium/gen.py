"""Generate the premium slump-test HyperFrames project (index + stage + type compositions)."""
import json, os, re, html
D = os.path.dirname(os.path.abspath(__file__))
P = D + '/proj'
tm = json.load(open(D + '/timing.json'))
B = [0.0]
for x in tm['beats']: B.append(round(B[-1] + x, 3))
END = round(B[-1] + 1.2, 3)
B[-1] = END

# ---- caption words (display form) ----
words = [list(w) for w in tm['words']]
# merge spoken spelling into display tokens
out = []
i = 0
while i < len(words):
    w = words[i]
    if w[0] == 'A' and i + 5 < len(words) and [x[0] for x in words[i:i+6]] == ['A', 'S', 'T', 'M', 'C', 'ninety-four,']:
        out.append(['ASTM C94,', w[1], words[i+5][2]]); i += 6; continue
    out.append(w); i += 1
NUM = {'Twenty-five': '25', 'three': '3', 'Three': '3', 'four.': '4.', 'four': '4', 'Four': '4', 'five': '5', 'five.': '5.', 'Seven?': '7?', 'inches.': 'in.'}
for w in out:
    w[0] = NUM.get(w[0], w[0])
# group into caption lines: break after punctuation or 4 words
groups, cur = [], []
for w in out:
    cur.append(w)
    if len(cur) >= 6 or re.search(r'[.?!]$', w[0]) or (len(cur) >= 3 and w[0].endswith(',')):
        groups.append(cur); cur = []
if cur: groups.append(cur)

HEAD = [
    (0, ["Fail this test", "the ==truck goes back=="], None),
    (1, ["Set up: ==damp== cone", "damp base plate"], None),
    (2, ["==3 layers==", "25 strokes each"], None),
    (4, ["Lift ==straight up==", "no twist"], None),
    (5, ["Measure to the", "==top center=="], None),
    (6, ["Spec 4 in:", "==3 to 5 in== passes"], "ASTM C94 slump tolerance"),
    (7, ["Part 3:", "==water on site=="], None),
]

def head_html(lines):
    out = []
    for ln in lines:
        parts = re.split(r'(==[^=]+==)', ln)
        spans = []
        for p in parts:
            if not p: continue
            hl = p.startswith('==')
            for w in p.strip('=').split(' '):
                if w: spans.append(f'<span class="w{" hl" if hl else ""}">{html.escape(w)}</span>')
        out.append('<span class="ln">' + ' '.join(spans) + '</span>')
    return ''.join(out)

clips, tl = [], []
for bi, lines, sub in HEAD:
    SH = {5: 1.5}
    s, e = B[bi] + (0.0 if bi == 0 else 0.05) + SH.get(bi, 0), B[bi + 1] - 0.02 + SH.get(bi + 1, 0)
    if bi == 7: e = END
    cid = f'h{bi}'
    clips.append(f'<h1 id="{cid}" class="clip head" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="2">{head_html(lines)}'
                 + (f'<span class="sub" id="{cid}s">{html.escape(sub)}</span>' if sub else '') + '</h1>')
    first = bi == 0
    if not first: tl.append(f'FT("#{cid} .w", {{opacity: 0, filter: "blur(8px)"}}, {{opacity: 1, filter: "blur(0px)", duration: 0.16, stagger: 0.06, ease: "power2.out"}}, {s + 0.05:.3f});')
    if sub:
        tl.append(f'FT("#{cid}s", {{opacity: 0}}, {{opacity: 1, duration: 0.3}}, {s + 0.6:.3f});')
    if bi != 7:
        tl.append(f'tl.to("#{cid} .w", {{opacity: 0, filter: "blur(8px)", duration: 0.14, stagger: 0.02, ease: "power2.in"}}, {e - 0.22:.3f});')

# captions
caps = []
for gi, g in enumerate(groups):
    s = g[0][1] - 0.05
    e = groups[gi + 1][0][1] - 0.05 if gi + 1 < len(groups) else END
    e = min(e, g[-1][2] + 0.9)
    ws = ' '.join(f'<span class="cw" id="c{gi}_{j}">{html.escape(w[0])}</span>' for j, w in enumerate(g))
    caps.append(f'<div id="c{gi}" class="clip cap" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="3"><div class="capin">{ws}</div></div>')
    for j, w in enumerate(g):
        tl.append(f'tl.set("#c{gi}_{j}", {{color: "#D9560F"}}, {w[1]:.3f}); tl.set("#c{gi}_{j}", {{color: "#14181E"}}, {w[2] + 0.02:.3f});')
    tl.append(f'FT("#c{gi} .capin", {{opacity: 0, scale: 0.96}}, {{opacity: 1, scale: 1, duration: 0.14, ease: "power2.out"}}, {s:.3f});')

# re-hook flood (beat 3)
fs, fe = B[3], B[4]
flood = f'''<div id="flood" class="clip flood" data-start="{fs:.3f}" data-duration="{fe - fs:.3f}" data-track-index="4">
  <div class="fl" id="fl1" style="top:560px">MOST CREWS</div><div class="fl" id="fl2" style="top:740px">GET THIS</div><div class="fl ink" id="fl3" style="top:920px">WRONG.</div>
</div>'''
tl.append(f'FT("#flood", {{clipPath: "inset(100% 0 0 0)"}}, {{clipPath: "inset(0% 0 0 0)", duration: 0.32, ease: "power3.inOut"}}, {fs:.3f});')
for k, d in enumerate([0.22, 0.52, 0.86]):
    tl.append(f'FT("#fl{k+1}", {{opacity: 0, scale: 1.25, filter: "blur(10px)"}}, {{opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.22, ease: "expo.out"}}, {fs + d:.3f});')
tl.append(f'tl.to("#flood", {{clipPath: "inset(0 0 100% 0)", duration: 0.3, ease: "power3.in"}}, {fe - 0.32:.3f});')

# mix ticket (beat 6)
ts, te = B[6] + 0.25, B[7] - 0.05
ticket = f'''<div id="ticket" class="clip ticket" data-start="{ts:.3f}" data-duration="{te - ts:.3f}" data-track-index="5">
 <div class="tk" id="tk"><div class="perf"></div>
  <div class="tkh"><b>BATCH TICKET</b><i>No. 004817</i></div>
  <div class="row"><span>Mix</span><span>4000 psi · 3/4 in agg.</span></div>
  <div class="row"><span>Load</span><span>9.0 yd³</span></div>
  <div class="row hlr" id="tkslump"><span>Slump</span><span>4 in</span></div>
  <div class="row"><span>Batched</span><span>07:42</span></div>
  <div class="row"><span>Water added</span><span>______ gal</span></div>
 </div></div>'''
tl.append(f'FT("#tk", {{x: -620, rotation: -6}}, {{x: 0, rotation: -2, duration: 0.7, ease: "expo.out"}}, {ts:.3f});')
tl.append(f'FT("#tkslump", {{backgroundColor: "rgba(242,106,27,0)"}}, {{backgroundColor: "rgba(242,106,27,1)", color: "#ffffff", duration: 0.25}}, {B[6] + 0.9:.3f});')
tl.append(f'tl.to("#tk", {{x: -640, duration: 0.35, ease: "power3.in"}}, {te - 0.4:.3f});')

# CTA (beat 7)
cs = B[7] + 0.9
cta = f'''<div id="cta" class="clip cta" data-start="{cs:.3f}" data-duration="{END - cs:.3f}" data-track-index="6"><div id="ctain"><span class="rule"></span>FOLLOW · PART 3 NEXT</div></div>'''
tl.append(f'FT("#ctain", {{opacity: 0, filter: "blur(8px)"}}, {{opacity: 1, filter: "blur(0px)", duration: 0.25, ease: "power2.out"}}, {cs:.3f});')
tl.append(f'FT("#ctain .rule", {{scaleX: 0}}, {{scaleX: 1, duration: 0.5, ease: "expo.out", transformOrigin: "0 50%"}}, {cs + 0.1:.3f});')

TYPE = f'''<template>
<style>
  @font-face {{ font-family: "Barlow Condensed"; font-weight: 700; src: url("assets/fonts/barlow-condensed-latin-700-normal.woff2"); }}
  @font-face {{ font-family: "Barlow Condensed"; font-weight: 800; src: url("assets/fonts/barlow-condensed-latin-800-normal.woff2"); }}
  @font-face {{ font-family: "Barlow"; font-weight: 600; src: url("assets/fonts/barlow-latin-600-normal.woff2"); }}
  @font-face {{ font-family: "Barlow"; font-weight: 700; src: url("assets/fonts/barlow-latin-700-normal.woff2"); }}
  @font-face {{ font-family: "IBM Plex Mono"; font-weight: 500; src: url("assets/fonts/ibm-plex-mono-latin-500-normal.woff2"); }}
  #root {{ position: absolute; inset: 0; overflow: hidden; color: #14181E; }}
  .series {{ position: absolute; left: 124px; top: 300px; font: 600 30px "Barlow", sans-serif; letter-spacing: 3px; color: #4F555D; display: flex; align-items: center; gap: 16px; }}
  .series::before {{ content: ""; width: 44px; height: 6px; background: #F26A1B; }}
  .head {{ position: absolute; left: 124px; right: 124px; top: 352px; margin: 0; font: 800 112px/0.98 "Barlow Condensed", sans-serif; text-transform: uppercase; letter-spacing: -0.5px; }}
  .head .ln {{ display: block; }}
  .head .w {{ display: inline-block; }}
  .head .hl {{ color: #D9560F; }}
  .head .sub {{ display: block; margin-top: 18px; font: 600 32px "Barlow", sans-serif; letter-spacing: 1px; text-transform: none; color: #4F555D; }}
  .cap {{ position: absolute; left: 0; right: 0; top: 1150px; display: flex; justify-content: center; z-index: 8; }}
  .capin {{ background: rgba(247,244,238,0.94); padding: 8px 26px 12px; border-radius: 8px; font: 700 56px "Barlow", sans-serif; color: #14181E; box-shadow: 0 6px 24px rgba(20,24,30,0.12); }}
  .flood {{ position: absolute; inset: 0; background: #F26A1B; z-index: 6; }}
  .fl {{ position: absolute; left: 0; right: 0; text-align: center; font: 800 172px/1 "Barlow Condensed", sans-serif; color: #FFFFFF; letter-spacing: -1px; }}
  .fl.ink {{ color: #14181E; }}
  .ticket {{ position: absolute; left: 124px; top: 640px; z-index: 5; }}
  .tk {{ width: 440px; background: #FBFAF6; padding: 22px 26px 26px; box-shadow: 0 18px 40px rgba(20,24,30,0.28), 0 2px 0 rgba(20,24,30,0.08); font: 500 27px "IBM Plex Mono", monospace; color: #2A2F36; position: relative; }}
  .tk .perf {{ position: absolute; left: 0; right: 0; top: -10px; height: 20px; background: radial-gradient(circle at 10px 0, transparent 9px, #FBFAF6 10px) 0 10px / 20px 20px repeat-x; }}
  .tkh {{ display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #14181E; padding-bottom: 10px; margin-bottom: 8px; }}
  .tkh b {{ font: 800 44px "Barlow Condensed", sans-serif; letter-spacing: 1px; color: #14181E; }}
  .tkh i {{ font-style: normal; font-size: 28px; color: #5B6068; }}
  .row {{ display: flex; justify-content: space-between; padding: 9px 8px; border-bottom: 1px dashed rgba(20,24,30,0.25); }}
  .cta {{ position: absolute; left: 124px; top: 590px; z-index: 5; }}
  #ctain {{ font: 700 48px "Barlow Condensed", sans-serif; letter-spacing: 2px; display: flex; align-items: center; gap: 20px; }}
  #ctain .rule {{ display: inline-block; width: 70px; height: 10px; background: #F26A1B; }}
</style>
<div id="root" data-composition-id="type" data-width="1080" data-height="1920">
  <div class="series" id="series">POUR DAY · PART 2 OF 3</div>
  {chr(10).join(clips)}
  {flood}
  {ticket}
  {cta}
  {chr(10).join(caps)}
</div>
<script>
  window.__timelines = window.__timelines || {{}};
  const tl = gsap.timeline({{ paused: true }});
  const FT = (t, a, b, p) => tl.fromTo(t, a, Object.assign({{ immediateRender: p === 0 }}, b), p);
  {chr(10).join('  ' + x for x in tl)}
  tl.set({{}}, {{}}, {END});
  window.__timelines["type"] = tl;
</script>
</template>
'''
import os
PLATE = os.environ.get('PLATE') == '1'
STAGE_BG = 'transparent' if PLATE else '#EFEBE4'
PLATE_JS = ' window.SLUMP_PLATE = true;' if PLATE else ''
PLATE_TAG = (f'    <video id="plate" class="clip" src="assets/plate.mp4" muted playsinline data-start="0" data-duration="{END}" data-track-index="0" style="position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover"></video>\n') if PLATE else ''
STAGE = f'''<template>
<style>
  @font-face {{ font-family: "Barlow Condensed"; font-weight: 700; src: url("assets/fonts/barlow-condensed-latin-700-normal.woff2"); }}
  @font-face {{ font-family: "Barlow Condensed"; font-weight: 800; src: url("assets/fonts/barlow-condensed-latin-800-normal.woff2"); }}
  @font-face {{ font-family: "Barlow"; font-weight: 600; src: url("assets/fonts/barlow-latin-600-normal.woff2"); }}
  #root {{ position: absolute; inset: 0; overflow: hidden; background: {STAGE_BG}; }}
  #stage3d {{ position: absolute; inset: 0; }}
  #draft {{ position: absolute; inset: 0; width: 1080px; height: 1920px; }}
</style>
<div id="root" data-composition-id="stage" data-width="1080" data-height="1920">
  <div id="stage3d"></div>
  <canvas id="draft" width="1080" height="1920"></canvas>
</div>
<script>window.SLUMP_BEATS = {json.dumps(B)};{PLATE_JS}</script>
<script src="assets/lib/stage.js"></script>
<script>
  window.__timelines = window.__timelines || {{}};
  const tl = gsap.timeline({{ paused: true }});
  tl.set({{}}, {{}}, {END});
  window.__timelines["stage"] = tl;
</script>
</template>
'''
INDEX = f'''<!doctype html>
<html lang="en" data-resolution="portrait"><head><meta charset="utf-8"><meta name="viewport" content="width=1080, height=1920"><script src="assets/lib/gsap.min.js"></script></head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1080" data-height="1920">
{PLATE_TAG}    <div id="stage" data-composition-id="stage" data-composition-src="compositions/stage.html" data-start="0" data-duration="{END}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>
    <div id="type" data-composition-id="type" data-composition-src="compositions/type.html" data-start="0" data-duration="{END}" data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920"></div>
    <audio id="voice" class="clip" src="assets/voice.wav" data-start="0" data-duration="{END}" data-track-index="5" data-volume="1"></audio>
    <audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="{END}" data-track-index="6" data-volume="0.55"></audio>
  </div>
  <script>window.__timelines = window.__timelines || {{}}; window.__timelines["main"] = gsap.timeline({{ paused: true }});</script>
</body></html>
'''
open(P + '/compositions/type.html', 'w').write(TYPE)
open(P + '/compositions/stage.html', 'w').write(STAGE)
open(P + '/index.html', 'w').write(INDEX)
json.dump({'B': B, 'END': END}, open(D + '/beats.json', 'w'))
print('B', B, 'groups', len(groups))
