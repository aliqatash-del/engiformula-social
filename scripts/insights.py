"""Collect performance numbers and send the daily / weekly report to Telegram.

Usage:
  python scripts/insights.py daily    # follower counts + 24 h snapshot of yesterday's posts
  python scripts/insights.py weekly   # top/bottom posts by engagement, pillar ranking (Sunday)
Writes data/followers.csv and data/post_metrics.csv — Claude reads these for the monthly review.
Meta renames metrics from time to time; unknown metrics are skipped and logged, never fatal.
"""
from __future__ import annotations

import csv
import datetime as dt
import sys
from collections import defaultdict

import telegram
from common import DATA, PUBLISHED, SETTINGS, Post, env, http, log, now

GRAPH = f"https://graph.facebook.com/{SETTINGS['graph_api_version']}"
IG_METRICS = ["reach", "views", "likes", "comments", "saved", "shares", "total_interactions"]
FB_FIELDS = "shares,comments.summary(true).limit(0),reactions.summary(true).limit(0)"


def followers() -> dict:
    token = env("PAGE_ACCESS_TOKEN")
    ig = http("GET", f"{GRAPH}/{env('IG_USER_ID')}", params={"fields": "followers_count", "access_token": token})
    fb = http("GET", f"{GRAPH}/{env('FB_PAGE_ID')}", params={"fields": "followers_count", "access_token": token})
    return {"instagram": ig.get("followers_count"), "facebook": fb.get("followers_count")}


def ig_metrics(media_id: str) -> dict:
    out = {}
    token = env("PAGE_ACCESS_TOKEN")
    for metric in IG_METRICS:  # one by one so a renamed metric doesn't kill the rest
        try:
            body = http("GET", f"{GRAPH}/{media_id}/insights", params={"metric": metric, "access_token": token})
            out[metric] = body["data"][0]["values"][0]["value"]
        except Exception as exc:
            log(f"IG metric {metric} unavailable for {media_id}: {str(exc)[:120]}")
    return out


def fb_metrics(object_id: str) -> dict:
    try:
        body = http("GET", f"{GRAPH}/{object_id}", params={"fields": FB_FIELDS, "access_token": env("PAGE_ACCESS_TOKEN")})
        return {
            "shares": (body.get("shares") or {}).get("count", 0),
            "comments": body.get("comments", {}).get("summary", {}).get("total_count", 0),
            "reactions": body.get("reactions", {}).get("summary", {}).get("total_count", 0),
        }
    except Exception as exc:
        log(f"FB metrics unavailable for {object_id}: {str(exc)[:120]}")
        return {}


def append_csv(path, row: dict) -> None:
    DATA.mkdir(exist_ok=True)
    new = not path.exists()
    with path.open("a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(row.keys()))
        if new:
            writer.writeheader()
        writer.writerow(row)


def published_posts() -> list[Post]:
    return [Post(p.parent) for p in sorted(PUBLISHED.glob("*/post.yaml"))]


def daily() -> None:
    t = now()
    counts = followers()
    append_csv(DATA / "followers.csv", {"date": t.date().isoformat(), **counts})
    lines = [f"📊 <b>Daily</b> — IG {counts['instagram']} · FB {counts['facebook']} followers"]
    for post in published_posts():
        when = dt.datetime.fromisoformat(post.data["published_at"])
        if not (dt.timedelta(hours=20) <= t - when <= dt.timedelta(hours=44)):
            continue  # snapshot each post once, about 24 h after publishing
        ids = post.data.get("published_ids", {})
        ig = ig_metrics(ids["instagram"]) if "instagram" in ids else {}
        fb = fb_metrics(ids["facebook"]) if "facebook" in ids else {}
        append_csv(DATA / "post_metrics.csv", {
            "post_id": post.id, "pillar": post.data["pillar"], "type": post.data["type"], "slot": post.data["slot"],
            **{f"ig_{k}": ig.get(k, "") for k in IG_METRICS}, **{f"fb_{k}": fb.get(k, "") for k in ("reactions", "comments", "shares")},
        })
        reach = ig.get("reach") or 0
        rate = (ig.get("total_interactions", 0) / reach * 100) if reach else 0
        lines.append(f"• <code>{post.id}</code> IG reach {reach}, eng. {rate:.1f}%, saves {ig.get('saved', 0)}, "
                     f"sends {ig.get('shares', 0)} · FB reactions {fb.get('reactions', 0)}")
    telegram.send("\n".join(lines))


def weekly() -> None:
    path = DATA / "post_metrics.csv"
    if not path.exists():
        telegram.send("📈 Weekly report: no post data yet.")
        return
    rows = list(csv.DictReader(path.open()))[-30:]

    def rate(r):
        reach = float(r.get("ig_reach") or 0)
        return float(r.get("ig_total_interactions") or 0) / reach * 100 if reach else 0

    ranked = sorted(rows, key=rate, reverse=True)
    by_pillar = defaultdict(list)
    for r in rows:
        by_pillar[r["pillar"]].append(rate(r))
    lines = ["📈 <b>Weekly report</b>", "", "<b>Top 3</b>"]
    lines += [f"• {r['post_id']} — {rate(r):.1f}%" for r in ranked[:3]]
    lines += ["", "<b>Bottom 3</b>"]
    lines += [f"• {r['post_id']} — {rate(r):.1f}%" for r in ranked[-3:]]
    lines += ["", "<b>Pillars (avg IG engagement by reach)</b>"]
    lines += [f"• {p}: {sum(v) / len(v):.1f}% ({len(v)} posts)" for p, v in sorted(by_pillar.items(), key=lambda kv: -sum(kv[1]) / len(kv[1]))]
    lines += ["", "Ask Claude: “run the weekly review” to get the full report and next week's plan."]
    telegram.send("\n".join(lines))


if __name__ == "__main__":
    {"daily": daily, "weekly": weekly}.get((sys.argv[1:] or [""])[0], lambda: sys.exit("usage: insights.py daily|weekly"))()
