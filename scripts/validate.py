"""Check a post against platform rules and house rules before it goes to approval.

Usage: python scripts/validate.py [post_id ...]   (no ids = every draft in the queue)
Exit code 1 if any post has errors.
"""
from __future__ import annotations

import re
import subprocess
import sys

from PIL import Image

from common import SETTINGS, Post, find_post, load_queue

LIM = SETTINGS["limits"]
TYPES = {"image", "carousel", "reel", "story", "text"}
PLATFORMS = {"instagram", "facebook"}
URL_RE = re.compile(r"https?://|www\.|\b[a-z0-9-]+\.(com|net|org|io)\b", re.I)


def video_seconds(path) -> float | None:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=True)
        return float(out.stdout.strip())
    except Exception:
        return None


def check(post: Post) -> list[str]:
    d, errors = post.data, []
    for key in ("id", "slot", "type", "platforms", "pillar", "caption"):
        if key not in d:
            errors.append(f"missing field '{key}'")
    if errors:
        return errors
    if d["type"] not in TYPES:
        errors.append(f"type must be one of {sorted(TYPES)}")
    if not set(d["platforms"]) <= PLATFORMS:
        errors.append(f"platforms must be within {sorted(PLATFORMS)}")

    tags = d.get("hashtags", [])
    if "instagram" in d["platforms"] and len(tags) > LIM["instagram_max_hashtags"]:
        errors.append(f"{len(tags)} hashtags — Instagram allows {LIM['instagram_max_hashtags']}")
    if any(not t.startswith("#") or " " in t for t in tags):
        errors.append("each hashtag must start with # and contain no spaces")
    if re.search(r"(^|\s)#[A-Za-z_]", d["caption"]):
        errors.append("put hashtags in the 'hashtags' list, not inside the caption")

    caption_len = len(post.full_caption("instagram"))
    if caption_len > LIM["instagram_caption_max_chars"]:
        errors.append(f"caption is {caption_len} chars (max {LIM['instagram_caption_max_chars']})")
    if "facebook" in d["platforms"] and URL_RE.search(d["caption"]):
        errors.append("link found in caption — put links in 'first_comment' (Facebook) / bio (Instagram)")

    media = post.media_paths()
    if d["type"] != "text":
        if not media:
            errors.append("no media listed")
        for m in media:
            if not m.exists():
                errors.append(f"media file not found: {m.name}")
        if not d.get("alt_text") and d["type"] in ("image", "carousel"):
            errors.append("alt_text is required for image posts")
    if d["type"] == "text" and "instagram" in d["platforms"]:
        errors.append("Instagram cannot publish text-only posts")
    if d["type"] == "carousel" and not 2 <= len(media) <= LIM["instagram_carousel_max_items"]:
        errors.append(f"carousel needs 2–{LIM['instagram_carousel_max_items']} items, has {len(media)}")

    for m in media:
        if not m.exists():
            continue
        if m.suffix.lower() in (".jpg", ".jpeg", ".png"):
            if m.suffix.lower() == ".png" and "instagram" in d["platforms"]:
                errors.append(f"{m.name}: Instagram API needs JPEG — run render.py (it exports .jpg)")
            if m.stat().st_size > LIM["image_max_mb"] * 1024 * 1024:
                errors.append(f"{m.name}: larger than {LIM['image_max_mb']} MB")
            with Image.open(m) as im:
                w, h = im.size
                ratio = w / h
                if d["type"] in ("image", "carousel") and not (0.8 - 0.01 <= ratio <= 1.91):
                    errors.append(f"{m.name}: aspect {w}x{h} outside 4:5–1.91:1")
                if d["type"] == "story" and abs(ratio - 9 / 16) > 0.02:
                    errors.append(f"{m.name}: stories should be 9:16, got {w}x{h}")
        elif m.suffix.lower() in (".mp4", ".mov"):
            secs = video_seconds(m)
            if secs is not None:
                if "facebook" in d["platforms"] and d["type"] == "reel" and secs > LIM["facebook_reel_max_seconds"]:
                    errors.append(f"{m.name}: {secs:.0f}s — Facebook Reels max {LIM['facebook_reel_max_seconds']}s")
                if secs < 3:
                    errors.append(f"{m.name}: reels must be at least 3 s")
    return errors


def main(ids: list[str]) -> int:
    posts = [find_post(i) for i in ids] if ids else [p for p in load_queue() if p.status == "draft"]
    bad = 0
    for post in posts:
        if post is None:
            print("post not found")
            bad += 1
            continue
        errors = check(post)
        if errors:
            bad += 1
            print(f"✗ {post.id}")
            for e in errors:
                print(f"    - {e}")
        else:
            print(f"✓ {post.id}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
