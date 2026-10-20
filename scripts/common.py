"""Shared helpers: settings, environment, post files, HTTP with dry-run."""
from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import sys
from zoneinfo import ZoneInfo

import requests
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
QUEUE = ROOT / "content" / "queue"
PUBLISHED = ROOT / "content" / "published"
STATE = ROOT / "state"
DATA = ROOT / "data"

try:  # local runs read .env; GitHub Actions passes secrets as env vars
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:  # pragma: no cover
    pass

SETTINGS = yaml.safe_load((ROOT / "config" / "settings.yaml").read_text())
TZ = ZoneInfo(SETTINGS["timezone"])
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"

STATUSES = ["draft", "pending_approval", "approved", "rejected", "published", "failed", "skipped"]


def env(name: str, required: bool = True) -> str:
    value = os.getenv(name, "").strip()  # a pasted secret often carries a stray space or newline
    if required and not value and not DRY_RUN:
        sys.exit(f"Missing environment variable {name}. See .env.example.")
    return value or f"<{name}>"


def now() -> dt.datetime:
    fake = os.getenv("FAKE_NOW")  # for tests: ISO time with offset
    return dt.datetime.fromisoformat(fake) if fake else dt.datetime.now(dt.timezone.utc)


def log(msg: str) -> None:
    stamp = now().astimezone(TZ).strftime("%Y-%m-%d %H:%M")
    print(f"[{stamp}] {msg}", flush=True)


# ---------- posts ----------

class Post:
    """A post lives in content/queue/<id>/post.yaml with its media files beside it."""

    def __init__(self, folder: pathlib.Path):
        self.folder = folder
        self.path = folder / "post.yaml"
        self.data = yaml.safe_load(self.path.read_text())

    @property
    def id(self) -> str:
        return self.data["id"]

    @property
    def slot(self) -> dt.datetime:
        value = self.data["slot"]
        if isinstance(value, dt.datetime):
            return value if value.tzinfo else value.replace(tzinfo=TZ)
        parsed = dt.datetime.fromisoformat(str(value))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=TZ)

    @property
    def status(self) -> str:
        return self.data.get("status", "draft")

    def set(self, **fields) -> None:
        self.data.update(fields)
        self.save()

    def save(self) -> None:
        self.path.write_text(yaml.safe_dump(self.data, sort_keys=False, allow_unicode=True))

    def media_paths(self) -> list[pathlib.Path]:
        return [self.folder / m for m in self.data.get("media", [])]

    def full_caption(self, platform: str) -> str:
        caption = self.data["caption"].strip()
        tags = self.data.get("hashtags", [])
        if tags:
            caption += "\n\n" + " ".join(tags)
        return caption


def load_queue() -> list[Post]:
    posts = [Post(p.parent) for p in sorted(QUEUE.glob("*/post.yaml"))]
    return sorted(posts, key=lambda p: p.slot)


def find_post(post_id: str) -> Post | None:
    folder = QUEUE / post_id
    return Post(folder) if (folder / "post.yaml").exists() else None


# ---------- state ----------

def read_state(name: str, default):
    path = STATE / f"{name}.json"
    return json.loads(path.read_text()) if path.exists() else default


def write_state(name: str, value) -> None:
    STATE.mkdir(exist_ok=True)
    (STATE / f"{name}.json").write_text(json.dumps(value, indent=2, default=str))


# ---------- HTTP ----------

def http(method: str, url: str, **kwargs) -> dict:
    """requests wrapper: prints instead of calling when DRY_RUN=1, raises with Meta's message on error."""
    if DRY_RUN:
        shown = {k: v for k, v in kwargs.items() if k in ("params", "data", "json")}
        log(f"DRY_RUN {method} {url} {json.dumps(shown, default=str)[:400]}")
        return {"id": "dry_run_id", "post_id": "dry_run_post", "video_id": "dry_run_video",
                "upload_url": "https://rupload.facebook.com/dry_run", "status_code": "FINISHED",
                "ok": True, "result": [], "success": True}
    response = requests.request(method, url, timeout=120, **kwargs)
    try:
        body = response.json()
    except ValueError:
        body = {"raw": response.text}
    if response.status_code >= 400 or (isinstance(body, dict) and "error" in body):
        raise RuntimeError(f"{method} {url.split('?')[0]} failed ({response.status_code}): {body}")
    return body
