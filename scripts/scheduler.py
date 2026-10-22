"""The heartbeat. Run every 30 minutes (GitHub Actions cron or any server cron).

Each run:
 1. reads your Telegram taps (approve / needs edit / reject) and edit notes
 2. validates new drafts inside the approval window and sends them to Telegram
 3. sends the daily reminder and the final reminder before each slot
 4. publishes approved posts whose slot has arrived (late approvals too, within late_publish_hours);
    skips anything still unapproved after that
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

    # 3a. one daily message: what goes out today, what still needs a tap, and an "Approve all" button
    h, m = local_hm(APPROVAL["reminder_daily_at"])
    today_key = f"daily:{local.date()}"
    reminder_time = local.replace(hour=h, minute=m, second=0, microsecond=0)
    if today_key not in sent and reminder_time <= local < reminder_time + dt.timedelta(minutes=RUN_EVERY_MIN * 2):
        pending = [p for p in posts if p.status == "pending_approval"]
        today = [p for p in posts if p.slot.astimezone(TZ).date() == local.date() and p.status == "approved"]
        if pending or today:
            lines = [f"☀️ <b>Today</b>: {len(today)} approved post(s) scheduled."]
            lines += [f"• {p.slot.astimezone(TZ):%H:%M} <code>{p.id}</code>" for p in today]
            if pending:
                lines += ["", f"⏳ {len(pending)} waiting for your approval (previews are above in this chat):"]
                lines += [f"• {p.slot.astimezone(TZ):%a %H:%M} <code>{p.id}</code>" for p in pending[:15]]
                last_tap = read_state("telegram_last_update", None)
                quiet = dt.timedelta(hours=APPROVAL["tap_alert_hours"])
                if not last_tap or t - dt.datetime.fromisoformat(last_tap) > quiet:
                    since = (f"since {dt.datetime.fromisoformat(last_tap).astimezone(TZ):%a %d %b %H:%M}" if last_tap
                             else f"in the last {APPROVAL['tap_alert_hours']} h")
                    lines += ["", f"⚠️ No tap or message from you has reached me {since}. "
                                  "If you have been tapping, another app may be reading this bot: send <b>ping</b> here to test."]
            telegram.send("\n".join(lines), **({"reply_markup": telegram.approve_all_keyboard(len(pending))} if pending else {}))
        sent[today_key] = t.isoformat()

    # 3b. final reminder before the slot
    late = dt.timedelta(hours=APPROVAL["late_publish_hours"])
    for post in posts:
        if post.status != "pending_approval":
            continue
        lead = post.slot - dt.timedelta(hours=APPROVAL["final_reminder_hours"])
        key = f"final:{post.id}"
        if lead <= t < post.slot and key not in sent:
            telegram.send(f"⏰ <code>{post.id}</code> is due at {post.slot.astimezone(TZ):%H:%M} and still needs your tap. "
                          f"If you approve later it still goes out on the next run, up to {APPROVAL['late_publish_hours']} h late.",
                          reply_markup=telegram.keyboard(post.id))
            sent[key] = t.isoformat()

    # 4. publish or skip
    for post in posts:
        if post.slot > t:
            continue
        if post.status == "approved" and t <= post.slot + late:
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
        elif post.status in ("approved", "pending_approval", "draft") and t > post.slot + late:
            post.set(status="skipped")
            telegram.send(f"⏭ Skipped <code>{post.id}</code>: not approved within {APPROVAL['late_publish_hours']} h of its slot. "
                          f"Ask Claude to give it a new slot if you still want it.")

    write_state("reminders", sent)
    log("run finished")


if __name__ == "__main__":
    PUBLISHED.mkdir(parents=True, exist_ok=True)
    run()
