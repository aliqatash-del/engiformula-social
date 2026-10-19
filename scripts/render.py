"""Render the slides described in a post.yaml into brand-correct JPEGs with Playwright.

Usage: python scripts/render.py <post_id>
Text markup inside slide fields:  ==word== -> rebar-yellow highlight,  **12 mm** -> formula-blue number.
"""
from __future__ import annotations

import json
import re
import sys

from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup, escape
from PIL import Image

from common import ROOT, find_post, log

BRAND = json.loads((ROOT / "config" / "brand.json").read_text())


def hl(text: str) -> Markup:
    safe = str(escape(text))
    safe = re.sub(r"==(.+?)==", r'<span class="hl">\1</span>', safe)
    safe = re.sub(r"\*\*(.+?)\*\*", r'<span class="num">\1</span>', safe)
    return Markup(safe)


ENV = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=True)
ENV.filters["hl"] = hl


def render_slides(post, slides: list[dict], kind: str, prefix: str = "slide") -> list[str]:
    from playwright.sync_api import sync_playwright

    canvas = BRAND["canvas"]
    w, h = canvas["reel"] if kind in ("story", "reel_cover") else canvas["feed"]
    pillar = BRAND["pillars"][post.data["pillar"]]
    template = ENV.get_template("slide.html")
    names = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        for i, slide in enumerate(slides, start=1):
            html = template.render(
                c=BRAND["colors"], pillar=pillar, slide=slide, kind=kind, w=w, h=h,
                safe=canvas["safe_margin"], reel_top=canvas["reel_safe_top"], reel_bottom=canvas["reel_safe_bottom"],
                title_size=slide.get("title_size", 96 if i == 1 else 72),
                title_gap=slide.get("title_gap", 150 if i == 1 else 90),
                formula_size=slide.get("formula_size", 80),
                fonts=(ROOT / "templates" / "fonts").as_uri(),
            )
            tmp = post.folder / f".render-{i}.html"
            tmp.write_text(html)
            page.goto(tmp.as_uri(), wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            tmp.unlink()
            png = post.folder / f"{prefix}-{i:02d}.png"
            page.screenshot(path=str(png), clip={"x": 0, "y": 0, "width": w, "height": h})
            jpg = png.with_suffix(".jpg")
            Image.open(png).convert("RGB").save(jpg, "JPEG", quality=92, optimize=True)
            png.unlink()
            names.append(jpg.name)
            log(f"{post.id}: rendered {jpg.name} ({w}x{h})")
        browser.close()
    return names


def main(post_id: str) -> None:
    post = find_post(post_id)
    if not post:
        sys.exit("post not found")
    kind = post.data["type"]
    slides = post.data.get("slides")
    if not slides:
        sys.exit("post.yaml has no 'slides' to render")
    if kind in ("image", "carousel", "story"):
        total = len(slides)
        for i, s in enumerate(slides, start=1):
            if kind == "carousel" and "counter" not in s:
                s["counter"] = f"{i} / {total}"
        post.set(media=render_slides(post, slides, kind))
    elif kind == "reel":
        names = render_slides(post, slides, "reel_cover", prefix="frame")
        post.set(frames=names)
        log("reel frames rendered — run make_reel.py to assemble the video")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: render.py <post_id>")
    main(sys.argv[1])
