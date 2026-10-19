"""Assemble a 9:16 Reel from rendered frames (+ optional voiceover and captions) with ffmpeg.

Usage: python scripts/make_reel.py <post_id>
Reads from post.yaml:
  frames:   [frame-01.jpg, ...]          (written by render.py)
  slides:   [{seconds: 3, ...}, ...]      seconds each frame stays on screen (default 4)
  voiceover: voice.mp3                    optional — your recording or a TTS file
  captions:  captions.srt                 optional — burned in (word-level SRT from whisperX works best)
Writes reel.mp4 (H.264 + AAC, 1080x1920, 30 fps, moov atom at the front as Meta requires).
For motion graphics, build the reel in Remotion instead and drop the MP4 in the post folder.
"""
from __future__ import annotations

import subprocess
import sys

from common import find_post, log


def main(post_id: str) -> None:
    post = find_post(post_id)
    if not post:
        sys.exit("post not found")
    d = post.data
    frames = d.get("frames") or []
    if not frames:
        sys.exit("no frames — run render.py first")
    slides = d.get("slides", [])
    durations = [float(slides[i].get("seconds", 4)) if i < len(slides) else 4.0 for i in range(len(frames))]

    concat = post.folder / "frames.txt"
    lines = []
    for name, secs in zip(frames, durations):
        lines += [f"file '{name}'", f"duration {secs}"]
    lines.append(f"file '{frames[-1]}'")  # concat demuxer needs the last file repeated
    concat.write_text("\n".join(lines) + "\n")

    out = post.folder / "reel.mp4"
    total = sum(durations)
    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat.name]
    voice = d.get("voiceover")
    if voice:
        cmd += ["-i", voice]
    else:
        cmd += ["-f", "lavfi", "-t", str(total), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]
    vf = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p"
    if d.get("captions"):
        style = ("FontName=Inter,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00472A0E,"
                 "BorderStyle=3,Outline=6,Shadow=0,Alignment=2,MarginV=230")
        vf += f",subtitles={d['captions']}:force_style='{style}'"
    cmd += ["-vf", vf, "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "60",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-shortest", "-t", str(total),
            "-movflags", "+faststart", out.name]
    subprocess.run(cmd, cwd=post.folder, check=True, capture_output=True)
    concat.unlink()
    post.set(media=["reel.mp4"])
    log(f"{post.id}: reel.mp4 built ({total:.0f} s)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: make_reel.py <post_id>")
    main(sys.argv[1])
