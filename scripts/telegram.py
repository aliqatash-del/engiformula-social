"""Telegram bot: approval requests with buttons, reminders, and reading the owner's taps.

The bot is free (Telegram Bot API). Create it with @BotFather, then send /start to it once
and put your chat id in TELEGRAM_CHAT_ID (python scripts/telegram.py whoami prints it).
Only that chat id can approve anything.
"""
from __future__ import annotations

import datetime as dt
import json
import sys

from common import DRY_RUN, SETTINGS, TZ, Post, env, find_post, http, load_queue, log, now, read_state, write_state

API = "https://api.telegram.org/bot{token}/{method}"
PILLAR_DOT = {"calculator": "🔵", "knowledge": "⚫", "site": "🟠", "community": "🟡", "career": "⚪"}


def call(method: str, **data) -> dict:
    url = API.format(token=env("TELEGRAM_BOT_TOKEN"), method=method)
    files = data.pop("_files", None)
    if files:
        return http("POST", url, data=data, files=files)
    return http("POST", url, json=data)


def chat_id() -> str:
    return env("TELEGRAM_CHAT_ID")


def send(text: str, **extra) -> dict:
    return call("sendMessage", chat_id=chat_id(), text=text, parse_mode="HTML",
                disable_web_page_preview=True, **extra)


def keyboard(post_id: str) -> dict:
    # callback_data must stay under 64 bytes: "a|<id>" with ids like 2026-11-03-rebar-weight
    return {"inline_keyboard": [[
        {"text": "✅ Approve", "callback_data": f"a|{post_id}"[:64]},
        {"text": "✏️ Needs edit", "callback_data": f"e|{post_id}"[:64]},
        {"text": "❌ Reject", "callback_data": f"r|{post_id}"[:64]},
    ]]}


def summary(post: Post) -> str:
    d = post.data
    when = post.slot.astimezone(TZ).strftime("%a %d %b · %H:%M")
    dot = PILLAR_DOT.get(d.get("pillar", ""), "•")
    caption = d["caption"].strip()
    if len(caption) > 700:
        caption = caption[:700] + "…"
    lines = [
        f"{dot} <b>{d['type'].upper()}</b> · {', '.join(d['platforms'])} · {when} (Riyadh)",
        f"<code>{post.id}</code>",
        "",
        caption.replace("<", "&lt;"),
        "",
        " ".join(d.get("hashtags", [])),
    ]
    if d.get("first_comment"):
        lines += ["", f"💬 First comment (FB): {d['first_comment']}"]
    if d.get("manual_steps"):
        lines += ["", f"🖐 After publishing: {d['manual_steps']}"]
    lines += ["", "<i>Your tap is saved on the next run (within 30 min): the buttons then change to ✅ Approved.</i>"]
    return "\n".join(lines)


def send_preview(post: Post) -> None:
    """Send the media (or an album) then the caption with the approval buttons."""
    media = [p for p in post.media_paths() if p.exists()]
    images = [p for p in media if p.suffix.lower() in (".jpg", ".jpeg", ".png")]
    videos = [p for p in media if p.suffix.lower() in (".mp4", ".mov")]
    if DRY_RUN:
        log(f"DRY_RUN telegram preview {post.id}: {len(images)} images, {len(videos)} videos")
    elif len(images) > 1:
        group = [{"type": "photo", "media": f"attach://f{i}"} for i, _ in enumerate(images[:10])]
        files = {f"f{i}": open(p, "rb") for i, p in enumerate(images[:10])}
        call("sendMediaGroup", chat_id=chat_id(), media=json.dumps(group), _files=files)
    elif images:
        call("sendPhoto", chat_id=chat_id(), _files={"photo": open(images[0], "rb")})
    elif videos:
        call("sendVideo", chat_id=chat_id(), _files={"video": open(videos[0], "rb")})
    msg = send(summary(post), reply_markup=keyboard(post.id))
    result = msg.get("result")
    post.set(status="pending_approval",
             telegram_message_id=result.get("message_id") if isinstance(result, dict) else None)


DECISIONS = {"a": "approved", "e": "draft", "r": "rejected"}
LABELS = {"approved": "✅ Approved", "draft": "✏️ Sent back for edits", "rejected": "❌ Rejected"}


def approve_all_keyboard(count: int, day: str) -> dict:
    """One button that approves every post waiting for approval on that day (YYYY-MM-DD)."""
    return {"inline_keyboard": [[{"text": f"✅ Approve all {count}", "callback_data": f"A|{day}"}]]}


def decide(post: Post | None, action: str) -> str | None:
    """Apply one button decision. Returns the new status, or None if nothing changed."""
    if not post or action not in DECISIONS:
        return None
    late = dt.timedelta(hours=SETTINGS["approval"]["late_publish_hours"])
    revivable = post.status == "skipped" and now() <= post.slot + late  # skipped by the old 2-hour rule
    if post.status != "pending_approval" and not revivable:
        return None
    new = DECISIONS[action]
    post.set(status=new, decided_at=now().isoformat())
    return new


def answer_tap(cb: dict, label: str) -> None:
    # The scheduler polls every 30 min, long after Telegram's few-second window to answer a tap,
    # so these two are best effort: a stale tap must not stop the run (the decision is already saved).
    for method, args in (("answerCallbackQuery", {"callback_query_id": cb["id"], "text": label}),
                         ("editMessageReplyMarkup", {"chat_id": chat_id(), "message_id": cb["message"]["message_id"],
                          "reply_markup": {"inline_keyboard": [[{"text": label, "callback_data": "noop|"}]]}})):
        try:
            call(method, **args)
        except RuntimeError as exc:
            log(f"telegram: {method} skipped ({str(exc)[-80:]})")


def process_updates() -> list[str]:
    """Read button taps and text replies since last run. Returns a list of what changed."""
    offset = read_state("telegram_offset", 0)
    body = call("getUpdates", offset=offset, timeout=0, allowed_updates=["callback_query", "message"])
    changes = []
    updates = body.get("result", [])
    if updates:
        log(f"telegram: {len(updates)} update(s) received")
    for update in updates:
        offset = max(offset, update["update_id"] + 1)
        cb = update.get("callback_query")
        msg = update.get("message")
        chat = (cb or {}).get("message", {}).get("chat", {}) if cb else (msg or {}).get("chat", {})
        if str(chat.get("id")) != str(chat_id()):
            continue  # ignore anyone else
        write_state("telegram_last_update", now().isoformat())  # lets the daily message spot lost taps
        if cb:
            action, _, post_id = cb["data"].partition("|")
            if action == "A":  # "Approve all" for one day
                done = [p.id for p in load_queue() if p.status == "pending_approval"
                        and p.slot.astimezone(TZ).date().isoformat() == post_id and decide(p, "a")]
                changes += [f"{pid}: approved (approve all)" for pid in done]
                label = f"✅ Approved {len(done)}" if done else "Nothing left to approve"
            else:
                post = find_post(post_id)
                new = decide(post, action)
                if new:
                    changes.append(f"{post_id}: {new}")
                    if new == "draft":
                        send(f"Reply to this message with what to change for <code>{post_id}</code>.",
                             reply_markup={"force_reply": True})
                label = LABELS[new] if new else (f"already {post.status}" if post else "not found")
            answer_tap(cb, label)
            continue
        if msg and msg.get("reply_to_message"):
            quoted = msg["reply_to_message"].get("text", "")
            for token in quoted.split():
                post = find_post(token.strip("<>.,:"))
                if post:
                    notes = post.data.get("edit_requests", []) + [msg.get("text", "")]
                    post.set(edit_requests=notes)
                    changes.append(f"{post.id}: edit request saved")
                    break
        elif msg and msg.get("text", "").strip().lower() in ("ping", "/ping", "/start"):
            send("✅ I can hear you. Taps and messages reach the scheduler on its next run (every 30 min).")
            changes.append("ping answered")
    write_state("telegram_offset", offset)
    return changes


if __name__ == "__main__":
    if sys.argv[1:] == ["whoami"]:
        result = call("getUpdates")
        for u in result.get("result", []):
            m = u.get("message") or {}
            if m:
                print("chat id:", m["chat"]["id"], "from:", m["chat"].get("first_name"))
    elif sys.argv[1:] == ["updates"]:
        # Read-only look at what Telegram is holding for the bot (doesn't move the saved offset).
        hook = call("getWebhookInfo").get("result", {})
        print("webhook url:", hook.get("url") or "(none)", "| pending:", hook.get("pending_update_count"))
        offset = read_state("telegram_offset", 0)
        print("saved offset:", offset)
        for u in call("getUpdates", offset=offset, timeout=0).get("result", []):
            cb, m = u.get("callback_query"), u.get("message") or {}
            if cb:
                print(u["update_id"], "tap", cb.get("data"), "chat ok:", str(cb["message"]["chat"]["id"]) == str(chat_id()))
            else:
                print(u["update_id"], "message", "chat ok:", str(m.get("chat", {}).get("id")) == str(chat_id()), repr(m.get("text", ""))[:40])
    elif sys.argv[1:] == ["token"]:
        # Describes the saved token's shape without printing it, to spot a bad paste.
        import os, re
        raw = os.getenv("TELEGRAM_BOT_TOKEN", "")
        tok = raw.strip()
        print("length:", len(raw), "| stray spaces/newlines:", raw != tok)
        print("looks like a bot token (digits:35 chars):", bool(re.fullmatch(r"\d{6,12}:[A-Za-z0-9_-]{35}", tok)))
        print("has spaces inside:", " " in tok, "| colons:", tok.count(":"))
        try:
            me = call("getMe").get("result", {})
            print("Telegram accepts it: True | bot username:", me.get("username"))
        except RuntimeError as exc:
            print("Telegram accepts it: False |", str(exc).split("failed")[-1][:60])
    elif sys.argv[1:2] == ["test"]:
        print(send("EngiFormula bot is connected ✅"))
    else:
        print("usage: telegram.py whoami | test | updates | token")
