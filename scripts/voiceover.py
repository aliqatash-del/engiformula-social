"""Generate a free AI voiceover (Kokoro TTS) and word-timed captions for a Reel.

Usage: python scripts/voiceover.py <post_id>
       python scripts/voiceover.py --pending      (print ids of reels whose voice/video is missing or stale)
Reads each slide's `voice:` line (plain text written the way it should be spoken, e.g. "number four bar").
Writes voice.m4a + captions.srt in the post folder and sets in post.yaml:
  slides[].seconds   stretched to fit the narration (never shortened)
  voiceover, captions, reel_built_from (hash of the slide text, so the workflow knows when to rebuild)
Kokoro runs on GitHub Actions (build-reels.yml); it needs espeak-ng, ffmpeg and `pip install kokoro soundfile`.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys

from common import SETTINGS, find_post, load_queue, log

VOICE = SETTINGS["voice"]
RATE = 24000  # Kokoro outputs 24 kHz mono


def slides_hash(post) -> str:
    """Hash of everything that changes the frames or the narration (seconds excluded: we edit them)."""
    slides = [{k: v for k, v in s.items() if k != "seconds"} for s in post.data.get("slides", [])]
    return hashlib.sha1(json.dumps(slides, sort_keys=True).encode()).hexdigest()[:12]


def needs_build(post) -> bool:
    d = post.data
    if d.get("type") != "reel" or not any(s.get("voice") for s in d.get("slides", [])):
        return False
    return not (post.folder / "reel.mp4").exists() or d.get("reel_built_from") != slides_hash(post)


def speak(pipeline, text: str):
    """Return (audio samples, [(word, start, end)]) for one slide's narration."""
    import numpy as np

    audio, words, offset = [], [], 0.0
    for result in pipeline(text, voice=VOICE["name"], speed=VOICE.get("speed", 1.0), split_pattern=None):
        samples = result.audio.numpy()
        for t in result.tokens or []:
            if t.start_ts is None or not re.search(r"\w", t.text):  # punctuation: glue onto the previous word
                if words:
                    words[-1][0] += t.text
                continue
            words.append([t.text, offset + t.start_ts, offset + t.end_ts])
        audio.append(samples)
        offset += len(samples) / RATE
    return np.concatenate(audio), words


def srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def chunks(words: list, size: int):
    """Group words into short caption chunks; a chunk also ends at a comma or full stop."""
    group = []
    for w in words:
        group.append(w)
        if len(group) >= size or re.search(r"[,.;:!?]$", w[0]):
            yield group
            group = []
    if group:
        yield group


def main(post_id: str) -> None:
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    post = find_post(post_id)
    if not post:
        sys.exit("post not found")
    if post.data.get("type") != "reel":
        sys.exit("voiceover.py only handles reels")
    slides = post.data.get("slides", [])
    pipeline = KPipeline(lang_code=VOICE.get("lang_code", "a"), repo_id="hexgrad/Kokoro-82M")
    pad, lead = VOICE.get("pad_seconds", 0.35), VOICE.get("lead_seconds", 0.1)

    track, cues, start = [], [], 0.0
    for i, slide in enumerate(slides, start=1):
        text = (slide.get("voice") or "").strip()
        secs = float(slide.get("seconds", 4))
        if text:
            audio, words = speak(pipeline, text)
            spoken = len(audio) / RATE
            secs = round(max(secs, lead + spoken + pad), 2)
            slide["seconds"] = secs  # keep the frame on screen while it is spoken
            for group in chunks(words, VOICE.get("caption_words", 3)):
                cues.append((start + lead + group[0][1], start + lead + group[-1][2],
                             " ".join(w[0] for w in group)))
            clip = np.zeros(int(round(secs * RATE)), dtype=np.float32)
            at = int(lead * RATE)
            clip[at:at + len(audio)] = audio[: len(clip) - at]
            log(f"{post.id}: slide {i} narration {spoken:.2f} s -> on screen {secs} s")
        else:
            clip = np.zeros(int(round(secs * RATE)), dtype=np.float32)
        track.append(clip)
        start += secs

    # Close gaps between caption chunks so the text doesn't flicker, but never run into the next slide.
    lines = []
    for n, (a, b, text) in enumerate(cues, start=1):
        if n < len(cues) and cues[n][0] - b < 0.4:
            b = cues[n][0]
        lines.append(f"{n}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n")
    (post.folder / "captions.srt").write_text("\n".join(lines))

    wav = post.folder / ".voice.wav"
    sf.write(wav, np.concatenate(track), RATE)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav.name, "-c:a", "aac", "-b:a", "128k",
                    "-ar", "48000", "voice.m4a"], cwd=post.folder, check=True)
    wav.unlink()

    total = sum(float(s.get("seconds", 4)) for s in slides)
    if total > VOICE.get("max_seconds", 60):
        log(f"WARNING {post.id}: reel is {total:.1f} s — over {VOICE.get('max_seconds', 60)} s, trim the voice lines")
    post.data["slides"] = slides
    post.set(voiceover="voice.m4a", captions="captions.srt", reel_built_from=slides_hash(post))
    log(f"{post.id}: voice.m4a + captions.srt written ({total:.1f} s, voice {VOICE['name']})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: voiceover.py <post_id> | --pending")
    if sys.argv[1] == "--pending":
        print("\n".join(p.id for p in load_queue() if needs_build(p)))
    else:
        main(sys.argv[1])
