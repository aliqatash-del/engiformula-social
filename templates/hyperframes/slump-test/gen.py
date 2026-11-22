"""Generate the HyperFrames slump-test reel (index.html + compositions/slump.html) from the voice timing."""
import json, re
from pathlib import Path

P = Path(__file__).parent / "slump"
T = json.load(open(Path(__file__).parent.parent / "v2/sl/timing.json"))
D = T["beats"]; B = [0.0]
for d in D: B.append(round(B[-1] + d, 3))
TOTAL = B[-1]
W = T["words"]

# cone geometry: 40 px per inch, base at y 640, centre x 540; 12 in tall, 8 in base, 4 in top
PX, Y0, X0 = 40, 640, 540
hw = lambda z: (4 - 2 * z / 12) * PX            # half width at height z (in)
yz = lambda z: Y0 - z * PX
def band(z0, z1):
    return f"{X0-hw(z0):.1f},{yz(z0):.1f} {X0+hw(z0):.1f},{yz(z0):.1f} {X0+hw(z1):.1f},{yz(z1):.1f} {X0-hw(z1):.1f},{yz(z1):.1f}"
L1, L2 = 2.606, 6.074                              # equal-volume layer tops (in), recomputed in Python

HEAD = ["The ==slump test== in 60 s", "Set up ==the cone==", "3 layers · ==25 rods== each", "",
        "Lift in ==about 5 s==", "Measure ==the drop==", "Check the ==mix ticket==", "Part 3: ==the water== problem"]
def hl(s):
    return re.sub(r"==([^=]+)==", r'<span class="hl">\1</span>', s)

# caption groups (<= 3 words, break at punctuation)
groups, g = [], []
for w in W:
    g.append(w)
    if len(g) >= 3 or re.search(r"[,.;:!?]$", w[0]):
        groups.append(g); g = []
if g: groups.append(g)
caps, captl = [], []
for i, g in enumerate(groups):
    a = 0.0 if i == 0 else g[0][1]
    b = groups[i + 1][0][1] if i + 1 < len(groups) and groups[i + 1][0][1] - g[-1][2] < 0.5 else g[-1][2] + 0.25
    spans = "".join(f'<span id="w{i}-{k}" class="cw">{re.sub(r"[,.;:!?]$", "", w[0])}</span> ' for k, w in enumerate(g))
    caps.append(f'<div id="cap{i}" class="clip cap" data-layout-allow-caption-zone data-start="{a:.3f}" data-duration="{b-a:.3f}" data-track-index="3"><div class="capbox" id="capb{i}">{spans}</div></div>')
    captl.append(f'FT("#capb{i}", {{scale: 0.85, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.16, ease: "back.out(1.6)"}}, {a:.3f});')
    for k, w in enumerate(g):
        end = g[k + 1][1] if k + 1 < len(g) else b
        captl.append(f'FT("#w{i}-{k}", {{color: "#FFFFFF"}}, {{color: "#FFC145", duration: 0.05}}, {max(0, w[1]-0.03):.3f});')
        captl.append(f'tl.to("#w{i}-{k}", {{color: "#FFFFFF", duration: 0.05}}, {end:.3f});')

heads = "\n".join(
    f'<h1 id="h{i}" class="clip head" data-start="{B[i]:.3f}" data-duration="{B[i+1]-B[i]:.3f}" data-track-index="2"><span class="hin" id="hin{i}">{hl(s)}</span></h1>'
    for i, s in enumerate(HEAD) if s)
headtl = "\n".join(
    f'FT("#hin{i} .w", {{opacity: 0, filter: "blur(6px)"}}, {{opacity: 1, filter: "blur(0px)", duration: 0.13, stagger: 0.067}}, {B[i] + (0 if i == 0 else 0.05):.3f});'
    for i, s in enumerate(HEAD) if s and i > 0)

def wordwrap(html):  # wrap each word for staggered entrances
    return re.sub(r'(?<=>)([^<]+)(?=<)', lambda m: " ".join(f'<span class="w">{t}</span>' for t in m.group(1).split()), html)
heads = re.sub(r'(<span class="hin" id="hin\d+">)(.*?)(</span></h1>)', lambda m: m.group(1) + wordwrap("<x>" + m.group(2) + "</x>")[3:-4] + m.group(3), heads)

b = B
scene = f"""<template>
<style>
  @font-face {{ font-family: "Space Grotesk"; font-weight: 700; src: url("assets/fonts/space-grotesk-latin-700-normal.woff2"); }}
  @font-face {{ font-family: "JetBrains Mono"; font-weight: 600; src: url("assets/fonts/jetbrains-mono-latin-600-normal.woff2"); }}
  #root {{ position: absolute; inset: 0; overflow: hidden; font-family: Inter, sans-serif; }}
  .bg {{ position: absolute; inset: 0; background-color: #F26A1B;
        background-image: radial-gradient(rgba(14,42,71,0.10) 3px, transparent 3.5px); background-size: 28px 28px; }}
  .flood {{ position: absolute; inset: 0; background: #0E2A47; z-index: 5; }}
  .tag {{ position: absolute; left: 120px; top: 300px; padding: 10px 22px; background: #0E2A47; color: #fff; border-radius: 12px;
         font: 600 30px "JetBrains Mono", monospace; letter-spacing: 1px; }}
  .head {{ position: absolute; left: 120px; right: 120px; top: 370px; margin: 0; color: #fff; font: 700 84px/1.06 "Space Grotesk", sans-serif; }}
  .head .hl {{ background: #0E2A47; color: #FFC145; border-radius: 12px; padding: 0 10px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }}
  .w {{ display: inline-block; margin-right: 0.22em; }}
  .stage {{ position: absolute; left: 0; top: 520px; width: 1080px; height: 760px; }}
  .stage svg {{ width: 1080px; height: 760px; overflow: visible; }}
  .mono {{ font: 600 34px "JetBrains Mono", monospace; }}
  .cap {{ z-index: 6; position: absolute; left: 0; right: 0; top: 1300px; display: flex; justify-content: center; }}
  .capbox {{ background: rgba(14,42,71,0.94); color: #fff; border-radius: 18px; padding: 10px 28px 16px; font: 700 66px "Space Grotesk", sans-serif; }}
  .sticker {{ position: absolute; width: 260px; height: 260px; border-radius: 50%; background: #FFC145; border: 8px solid #0E2A47;
             display: flex; flex-direction: column; align-items: center; justify-content: center; color: #0E2A47; }}
  .sticker b {{ font: 700 92px "Space Grotesk", sans-serif; line-height: 1; }}
  .sticker i {{ font: 600 28px "JetBrains Mono", monospace; font-style: normal; margin-top: 8px; }}
  .card {{ position: absolute; background: #fff; border: 6px solid #0E2A47; border-radius: 22px; box-shadow: 12px 12px 0 #0E2A47; color: #0E2A47; }}
  .big {{ position: absolute; left: 0; right: 0; text-align: center; color: #FFC145; font: 700 150px/1 "Space Grotesk", sans-serif; }}
</style>
<div id="root" data-composition-id="slump" data-width="1080" data-height="1920">
  <div class="bg" id="bg"></div>
  <div class="flood clip" id="flood" data-start="{b[3]:.3f}" data-duration="{b[4]-b[3]:.3f}" data-track-index="1">
    <div class="big" id="rush1" style="top:720px">DON'T</div><div class="big" id="rush2" style="top:880px">RUSH</div><div class="big" id="rush3" style="top:1040px; color:#fff">THIS</div>
  </div>
  <div class="tag" id="tag">POUR DAY · PART 2/3</div>
  {heads}
  <div class="stage" id="stage"><div id="cam">
  <svg viewBox="0 0 1080 760">
    <rect id="plate" x="160" y="640" width="760" height="26" rx="6" fill="#0E2A47"/>
    <g id="mix">
      <polygon id="lay1" points="{band(0, L1)}" fill="#D4D7DC"/>
      <polygon id="lay2" points="{band(L1, L2)}" fill="#C3C7CE"/>
      <polygon id="lay3" points="{band(L2, 12)}" fill="#D4D7DC"/>
    </g>
    <path id="slumped" d="M 350 640 C 380 560, 430 330, 540 320 C 650 330, 700 560, 730 640 Z" fill="#D4D7DC" stroke="#0E2A47" stroke-width="6"/>
    <g id="cone2"><polygon points="{X0+330-hw(12):.1f},{yz(0):.1f} {X0+330+hw(12):.1f},{yz(0):.1f} {X0+330+hw(0):.1f},{yz(12):.1f} {X0+330-hw(0):.1f},{yz(12):.1f}" fill="rgba(138,155,176,0.45)" stroke="#0E2A47" stroke-width="8" stroke-linejoin="round"/></g>
    <g id="cone">
      <polygon points="{band(0, 12)}" fill="rgba(138,155,176,0.28)" stroke="#0E2A47" stroke-width="8" stroke-linejoin="round"/>
      <rect x="{X0-hw(0)-70}" y="612" width="70" height="20" rx="4" fill="#0E2A47"/><rect x="{X0+hw(0)}" y="612" width="70" height="20" rx="4" fill="#0E2A47"/>
      <rect x="{X0-hw(12)-40}" y="300" width="20" height="60" rx="4" fill="#0E2A47"/><rect x="{X0+hw(12)+20}" y="300" width="20" height="60" rx="4" fill="#0E2A47"/>
    </g>
    <g id="dims" class="mono" fill="#0E2A47">
      <text id="d12" x="{X0-hw(6)-36}" y="420" text-anchor="end">12 in</text><text id="d12m" x="{X0-hw(6)-36}" y="462" text-anchor="end" font-size="26">300 mm</text>
      <text id="d8" x="{X0}" y="712" text-anchor="middle">8 in · 200 mm</text>
      <text id="d4" x="{X0}" y="140" text-anchor="middle">4 in · 100 mm</text>
    </g>
    <g id="lines" class="mono" fill="#fff" font-size="28">
      <line x1="{X0+hw(L1)+10}" y1="{yz(L1):.1f}" x2="{X0+hw(L1)+60}" y2="{yz(L1):.1f}" stroke="#fff" stroke-width="5"/><text x="{X0+hw(L1)+70}" y="{yz(L1)+10:.1f}">2⅝ in</text>
      <line x1="{X0+hw(L2)+10}" y1="{yz(L2):.1f}" x2="{X0+hw(L2)+60}" y2="{yz(L2):.1f}" stroke="#fff" stroke-width="5"/><text x="{X0+hw(L2)+70}" y="{yz(L2)+10:.1f}">6⅛ in</text>
    </g>
    <g id="rodg"><rect id="rod" x="{X0-8}" y="0" width="16" height="420" rx="8" fill="#0E2A47"/></g>
    <g id="countg"><text id="count" x="890" y="300" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="120" fill="#FFC145" stroke="#0E2A47" stroke-width="4">25</text>
      <text x="890" y="350" text-anchor="middle" class="mono" fill="#0E2A47" font-size="28">RODS / LAYER</text></g>
    <g id="measure">
      <rect id="hrod" x="470" y="146" width="560" height="16" rx="8" fill="#0E2A47"/>
      <rect id="tape" x="526" y="164" width="28" height="160" fill="#FFC145" stroke="#0E2A47" stroke-width="4"/>
      <text x="506" y="250" text-anchor="end" class="mono" fill="#fff" font-size="44">4 in</text><text x="506" y="292" text-anchor="end" class="mono" fill="#0E2A47" font-size="28">100 mm slump</text>
    </g>
  </svg></div></div>
  <div class="sticker" id="stk" style="left:760px; top:930px"><b>60 s</b><i>EXPLAINED</i></div>
  <div class="sticker" id="stk5" style="left:760px; top:560px"><b>5 s</b><i>STRAIGHT UP</i></div>
  <div class="card" id="ticket" style="left:120px; top:560px; width:780px; height:430px; padding:34px 40px; box-sizing:border-box">
    <div style="font:600 28px 'JetBrains Mono',monospace; color:#5B6B80">MIX TICKET</div>
    <div style="font:700 56px 'Space Grotesk'; margin-top:18px">Specified slump</div>
    <div style="font:600 64px 'JetBrains Mono',monospace; color:#1E5BD8">4 in</div>
    <div style="font:700 56px 'Space Grotesk'; margin-top:18px">Measured</div>
    <div style="font:600 64px 'JetBrains Mono',monospace; color:#187A50">4 in</div>
  </div>
  <div class="card" id="nowater" style="left:600px; top:860px; width:360px; height:150px; display:flex; align-items:center; justify-content:center; background:#C73A3A; color:#fff; font:700 46px 'Space Grotesk'">+ WATER? NO</div>
  <div class="card" id="follow" style="left:120px; top:600px; width:840px; height:380px; padding:40px; box-sizing:border-box">
    <div style="display:flex; align-items:center; gap:28px"><div style="width:130px;height:130px;border-radius:50%;background:#0E2A47;color:#FFC145;font:700 60px 'Space Grotesk';display:flex;align-items:center;justify-content:center">EF</div>
      <div><div style="font:700 54px 'Space Grotesk'">@engiformula</div><div style="font:600 30px Inter;color:#5B6B80">Civil engineering, computed</div></div></div>
    <div id="fbtn" style="margin-top:40px; height:100px; border-radius:18px; background:#1E5BD8; color:#fff; font:700 48px 'Space Grotesk'; display:flex; align-items:center; justify-content:center">Follow</div>
  </div>
  <div class="tag" id="src" style="top:1060px; left:120px; background:rgba(14,42,71,0.85); font-size:24px">ASTM C143 · EN 12350-2</div>
  {''.join(caps)}
</div>
<script>
  const tl = gsap.timeline({{ paused: true }});
  const FT = (t, a, b, p) => tl.fromTo(t, a, Object.assign({{ immediateRender: p === 0 }}, b), p);
  const B = {json.dumps(B)};
  // hook: everything on screen at frame 0
  tl.set(["#slumped", "#cone2", "#dims", "#lines", "#rodg", "#countg", "#measure", "#stk5", "#ticket", "#nowater", "#follow", "#src"], {{opacity: 0}}, 0);
  tl.set("#mix", {{svgOrigin: "540 640", scaleY: 1, scaleX: 1}}, 0);
  FT("#stk", {{scale: 1.25, rotation: -14}}, {{scale: 1, rotation: -6, duration: 0.5, ease: "back.out(1.6)"}}, 0);
  FT("#cam", {{scale: 1.06}}, {{scale: 1, duration: 1.2, ease: "expo.out"}}, 0);
  // beat 1: set up the cone (empty), dimensions arrive
  tl.to("#stk", {{x: 340, opacity: 0, duration: 0.3, ease: "power3.in"}}, B[1]);
  FT(["#lay1", "#lay2", "#lay3"], {{opacity: 1}}, {{opacity: 0, duration: 0.25}}, B[1]);
  FT("#dims", {{opacity: 0}}, {{opacity: 1, duration: 0.3}}, B[1] + 1.2);
  FT("#d12", {{opacity: 0, x: -20}}, {{opacity: 1, x: 0, duration: 0.3, ease: "expo.out"}}, B[1] + 2.0);
  FT("#d8", {{opacity: 0, y: 20}}, {{opacity: 1, y: 0, duration: 0.3, ease: "expo.out"}}, B[1] + 3.0);
  FT("#d4", {{opacity: 0, y: -20}}, {{opacity: 1, y: 0, duration: 0.3, ease: "expo.out"}}, B[1] + 3.8);
  FT("#src", {{opacity: 0}}, {{opacity: 1, duration: 0.3}}, B[1] + 1.2);
  // beat 2: three layers, 25 rods each
  tl.to(["#dims", "#src"], {{opacity: 0, duration: 0.2}}, B[2]);
  FT("#cam", {{scale: 1}}, {{scale: 1.08, duration: 0.5, ease: "power2.inOut"}}, B[2]);
  ["#lay1", "#lay2", "#lay3"].forEach((id, k) => {{
    const t0 = B[2] + 0.2 + k * 1.15;
    FT(id, {{opacity: 0, scaleY: 0, transformOrigin: "50% 100%"}}, {{opacity: 1, scaleY: 1, duration: 0.35, ease: "power4.out"}}, t0);
    FT("#rod", {{y: -80}}, {{y: 0, duration: 0.09, ease: "power2.in", repeat: 7, yoyo: true}}, t0 + 0.35);
  }});
  FT(["#rodg", "#countg", "#lines"], {{opacity: 0}}, {{opacity: 1, duration: 0.2}}, B[2] + 0.3);
  tl.to(["#rodg", "#countg"], {{opacity: 0, duration: 0.2}}, B[3] - 0.25);
  // beat 3: colour flood re-hook
  FT("#rush1", {{scale: 1.4, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.25, ease: "expo.out"}}, B[3]);
  FT("#rush2", {{scale: 1.4, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.25, ease: "expo.out"}}, B[3] + 0.25);
  FT("#rush3", {{scale: 1.4, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.25, ease: "expo.out"}}, B[3] + 0.5);
  // beat 4: strike off, lift in ~5 s, concrete slumps 4 in
  tl.to("#lines", {{opacity: 0, duration: 0.1}}, B[4]);
  FT("#cam", {{scale: 1.08}}, {{scale: 1, duration: 0.6, ease: "power2.inOut"}}, B[4]);
  tl.to("#cone", {{y: -170, duration: 1.8, ease: "power1.inOut"}}, B[4] + 1.2);
  tl.to("#cone", {{opacity: 0, duration: 0.5}}, B[4] + 2.8);
  tl.to("#mix", {{opacity: 0, duration: 0.3}}, B[4] + 2.3);
  FT("#slumped", {{opacity: 0, scaleY: 1.5, scaleX: 0.75, svgOrigin: "540 640"}}, {{opacity: 1, scaleY: 1, scaleX: 1, duration: 1.2, ease: "power2.out"}}, B[4] + 2.3);
  FT("#stk5", {{opacity: 0, scale: 1.3}}, {{opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.6)"}}, B[4] + 1.1);
  tl.to("#stk5", {{opacity: 0, duration: 0.2}}, B[5] - 0.2);
  // beat 5: inverted cone beside, rod across, tape reads 4 in
  FT("#cone2", {{opacity: 0, y: -120}}, {{opacity: 1, y: 0, duration: 0.6, ease: "expo.out"}}, B[5] + 0.1);
  FT("#measure", {{opacity: 0}}, {{opacity: 1, duration: 0.2}}, B[5] + 1.2);
  FT("#tape", {{scaleY: 0, transformOrigin: "50% 0%"}}, {{scaleY: 1, duration: 0.7, ease: "power2.out"}}, B[5] + 2.4);
  // beat 6: ticket
  tl.to("#stage", {{opacity: 0.0, duration: 0.25}}, B[6]);
  FT("#ticket", {{opacity: 0, y: 60}}, {{opacity: 1, y: 0, duration: 0.45, ease: "expo.out"}}, B[6] + 0.05);
  FT("#nowater", {{opacity: 0, scale: 1.4, rotation: 8}}, {{opacity: 1, scale: 1, rotation: -4, duration: 0.3, ease: "back.out(1.6)"}}, B[6] + 3.1);
  tl.to(["#ticket", "#nowater"], {{opacity: 0, duration: 0.2}}, B[7] - 0.1);
  // beat 7: follow
  FT("#follow", {{opacity: 0, scale: 0.9}}, {{opacity: 1, scale: 1, duration: 0.4, ease: "expo.out"}}, B[7]);
  tl.to("#fbtn", {{scale: 0.94, duration: 0.08, yoyo: true, repeat: 1}}, B[7] + 2.4);
  tl.set("#fbtn", {{backgroundColor: "#E6E8EB", color: "#0E2A47", textContent: "Following"}}, B[7] + 2.56);
  // headlines
  {headtl}
  // captions
  {chr(10).join(captl)}
  window.__timelines["slump"] = tl;
</script>
</template>
"""
(P / "compositions" / "slump.html").write_text(scene)

index = f"""<!doctype html>
<html lang="en" data-resolution="portrait"><head><meta charset="utf-8"><meta name="viewport" content="width=1080, height=1920"><script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script></head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1080" data-height="1920">
    <div id="slump" data-composition-id="slump" data-composition-src="compositions/slump.html" data-start="0" data-duration="{TOTAL:.3f}"
         data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>
    <audio id="voice" class="clip" src="assets/voice.wav" data-start="0" data-duration="{TOTAL:.3f}" data-track-index="5" data-volume="1"></audio>
    <audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="{TOTAL:.3f}" data-track-index="6" data-volume="0.6"></audio>
  </div>
  <script>window.__timelines = window.__timelines || {{}}; window.__timelines["main"] = gsap.timeline({{ paused: true }});</script>
</body></html>
"""
(P / "index.html").write_text(index)
print("B", B)
