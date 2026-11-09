"""Render a motion-kit scene (motion/scenes/<scene>.js) to a silent 1080x1920 MP4.

Usage: python scripts/render_motion.py <scene> <out.mp4> [--beats 5.2,6.1,...] [--fps 30] [--stills 2,5.5]
--beats stretches the scene's own beats to the voiceover slide lengths (make_reel.py passes them).
Uses the Python Playwright already in requirements.txt (same browser as render.py).
"""
from __future__ import annotations

import argparse
import base64
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def render(scene: str, out: Path, beats: list[float] | None = None, fps: int = 30, stills: list[float] = ()) -> float:
    from playwright.sync_api import sync_playwright

    url = (ROOT / "motion" / "index.html").as_uri() + f"?scene={scene}"
    if beats:
        url += "&beats=" + ",".join(f"{b:.3f}" for b in beats)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        page.goto(url)
        page.evaluate("window.ready")
        total = float(page.evaluate("window.total()"))
        n = round(total * fps)
        ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg",
                               "-framerate", str(fps), "-i", "-", "-c:v", "libx264", "-profile:v", "high",
                               "-pix_fmt", "yuv420p", "-crf", "20", "-g", "60", "-movflags", "+faststart", str(out)],
                              stdin=subprocess.PIPE)
        for f in range(n):
            data = page.evaluate("t => window.frame(t)", f / fps)
            ff.stdin.write(base64.b64decode(data.split(",", 1)[1]))
        ff.stdin.close()
        if ff.wait():
            raise SystemExit("ffmpeg failed while encoding the motion video")
        for t in stills:
            data = page.evaluate("t => window.frame(t, 0.9)", t)
            out.with_name(f"{out.stem}@{t}.jpg").write_bytes(base64.b64decode(data.split(",", 1)[1]))
        browser.close()
    return total


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("scene"); ap.add_argument("out")
    ap.add_argument("--beats", default=""); ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--stills", default="")
    a = ap.parse_args()
    beats = [float(x) for x in a.beats.split(",") if x]
    stills = [float(x) for x in a.stills.split(",") if x]
    print(f"{a.scene}: {render(a.scene, Path(a.out), beats or None, a.fps, stills):.2f} s -> {a.out}")
