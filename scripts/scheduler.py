"""The heartbeat. Run every 30 minutes (GitHub Actions cron or any server cron).

Each run:
 1. reads your Telegram taps (approve / needs edit / reject) and edit notes
 2. validates new drafts inside the approval window and sends them to Telegram
 3. sends the daily reminder and the final reminder before each slot
 4. publishes approved posts whose slot has arrived; skips anything unapproved
"""
from __future__ import annotations

import datetime as dt
import shutil

import telegram
from common import PUBLISHED, SETTINGS, TZ, load_queue, log, now, read_state, write_state
from publish import publish_post
from validate import check

APPROVAL = SETTINGS["approval"]
RUN_EVERY_MIN = 30  # must match the cron in .github/workflows/scheduler.yml


def local_hm(value: str) -> tuple[int, int]:
    h, m = value.split(":")
    return int(h), int(m)


def run() -> None:
    t = now()
    local = t.astimezone(TZ)
    sent = read_state("reminders", {})

    # 1. taps from Telegram
    for change in telegram.process_updates():
        log(f"telegram: {change}")

    posts = load_queue()

    # 2. drafts -> approval
    window_end = t + dt.timedelta(days=APPROVAL["send_batch_days_ahead"])
    for post in posts:
        if post.status != "draft" or post.slot > window_end or post.slot < t:
            continue
        if post.data.get("edit_requests") and not post.data.get("edits_done"):
            continue  # waiting for Claude to apply your edit notes
        errors = check(post)
        if errors:
            key = f"invalid:{post.id}:{len(errors)}"
            if key not in sent:
                telegram.send(f"⚠️ <code>{post.id}</code> can't go to approval yet:\n- " + "\n- ".join(errors))
                sent[key] = t.isoformat()
            continue
        telegram.send_preview(post)
        log(f"{post.id}: sent for approval")

    # 3a. daily reminder
    h, m = local_hm(APPROVAL["reminder_daily_at"])
    today_key = f"daily:{local.date()}"
    reminder_time = local.replace(hour=h, minute=m, second=0, microsecond=0)
    if today_key not in sent and reminder_time <= local < reminder_time + dt.timedelta(minutes=RUN_EVERY_MIN * 2):
        pending = [p for p in posts if p.status == "pending_approval"]
        today = [p for p in posts if p.slot.astimezone(TZ).date() == local.date() and p.status == "approved"]
        if pending or today:
            lines = [f"☀️ <b>Today</b>: {len(today)} approved post(s) scheduled."]
            if pending:
                lines.append(f"⏳ {len(pending)} waiting for your approval:")
                lines += [f"• <code>{p.id}</code> — {p.slot.astimezone(TZ):%a %H:%M}" for p in pending[:15]]
            telegram.send("\n".join(lines))
        sent[today_key] = t.isoformat()

    # 3b. final reminder before the slot
    for post in posts:
        if post.status != "pending_approval":
            continue
        lead = post.slot - dt.timedelta(hours=APPROVAL["final_reminder_hours"])
        key = f"final:{post.id}"
        if lead <= t < post.slot and key not in sent:
            telegram.send(f"⏰ <code>{post.id}</code> goes out at {post.slot.astimezone(TZ):%H:%M} "
                          f"and still needs approval — it will be skipped if not approved.")
            sent[key] = t.isoformat()

    # 4. publish or skip
    window = dt.timedelta(minutes=APPROVAL["publish_window_minutes"])
    for post in posts:
        if post.slot > t:
            continue
        if post.status == "approved" and t <= post.slot + window:
            outcome = publish_post(post)
            if outcome["results"]:
                links = ", ".join(f"{k}: {v}" for k, v in outcome["results"].items())
                msg = f"🚀 Published <code>{post.id}</code> ({links})."
                if post.data.get("manual_steps"):
                    msg += f"\n🖐 Now do: {post.data['manual_steps']}"
                msg += "\n💬 Reply to comments in the next hour."
                telegram.send(msg)
            if outcome["errors"]:
                telegram.send(f"❌ Problems with <code>{post.id}</code>: {outcome['errors']}")
            if post.status == "published":
                shutil.move(str(post.folder), str(PUBLISHED / post.folder.name))
        elif post.status in ("approved", "pending_approval", "draft") and t > post.slot + window:
            post.set(status="skipped")
            telegram.send(f"⏭ Skipped <code>{post.id}</code> — it wasn't approved/published in time. "
                          f"Change its slot to reuse it.")

    write_state("reminders", sent)
    write_state("last_run", {"at": t.isoformat()})


if __name__ == "__main__":
    PUBLISHED.mkdir(parents=True, exist_ok=True)
    run()
