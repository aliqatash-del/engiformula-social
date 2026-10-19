"""Telegram bot: approval requests with buttons, reminders, and reading the owner's taps.

The bot is free (Telegram Bot API). Create it with @BotFather, then send /start to it once
and put your chat id in TELEGRAM_CHAT_ID (python scripts/telegram.py whoami prints it).
Only that chat id can approve anything.
"""
from __future__ import annotations

import json
import sys

from common import DRY_RUN, TZ, Post, env, find_post, http, log, now, read_state, write_state

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


def process_updates() -> list[str]:
    """Read button taps and text replies since last run. Returns a list of what changed."""
    offset = read_state("telegram_offset", 0)
    body = call("getUpdates", offset=offset, timeout=0, allowed_updates=["callback_query", "message"])
    changes = []
    for update in body.get("result", []):
        offset = max(offset, update["update_id"] + 1)
        cb = update.get("callback_query")
        if cb:
            if str(cb["message"]["chat"]["id"]) != str(chat_id()):
                continue  # ignore anyone else
            action, _, post_id = cb["data"].partition("|")
            post = find_post(post_id)
            label = "not found"
            if post and post.status == "pending_approval":
                new = {"a": "approved", "e": "draft", "r": "rejected"}[action]
                post.set(status=new, decided_at=now().isoformat())
                label = {"approved": "✅ Approved", "draft": "✏️ Sent back for edits", "rejected": "❌ Rejected"}[new]
                changes.append(f"{post_id}: {new}")
                if new == "draft":
                    send(f"Reply to this message with what to change for <code>{post_id}</code>.",
                         reply_markup={"force_reply": True})
            elif post:
                label = f"already {post.status}"
            call("answerCallbackQuery", callback_query_id=cb["id"], text=label)
            call("editMessageReplyMarkup", chat_id=chat_id(), message_id=cb["message"]["message_id"],
                 reply_markup={"inline_keyboard": [[{"text": label, "callback_data": "noop|"}]]})
        msg = update.get("message")
        if msg and str(msg["chat"]["id"]) == str(chat_id()) and msg.get("reply_to_message"):
            quoted = msg["reply_to_message"].get("text", "")
            for token in quoted.split():
                post = find_post(token.strip("<>.,:"))
                if post:
                    notes = post.data.get("edit_requests", []) + [msg.get("text", "")]
                    post.set(edit_requests=notes)
                    changes.append(f"{post.id}: edit request saved")
                    break
    write_state("telegram_offset", offset)
    return changes


if __name__ == "__main__":
    if sys.argv[1:] == ["whoami"]:
        result = call("getUpdates")
        for u in result.get("result", []):
            m = u.get("message") or {}
            if m:
                print("chat id:", m["chat"]["id"], "from:", m["chat"].get("first_name"))
    elif sys.argv[1:2] == ["test"]:
        print(send("EngiFormula bot is connected ✅"))
    else:
        print("usage: telegram.py whoami | test")
