"""One-time setup helper + weekly token health check.

  python scripts/setup_tokens.py exchange <SHORT_LIVED_USER_TOKEN>
      Turns the token you copy from Graph API Explorer into a long-lived user token,
      then prints your Page ID, a Page access token with no set expiry, and the linked
      Instagram account ID — paste them into .env / GitHub secrets.

  python scripts/setup_tokens.py check
      Confirms the Page token still works and the Instagram account is reachable;
      sends a Telegram alert if not. Run weekly (the workflow does this on Mondays).
"""
from __future__ import annotations

import sys

from common import SETTINGS, env, http

GRAPH = f"https://graph.facebook.com/{SETTINGS['graph_api_version']}"


def exchange(short_token: str) -> None:
    long_user = http("GET", f"{GRAPH}/oauth/access_token", params={
        "grant_type": "fb_exchange_token",
        "client_id": env("META_APP_ID"),
        "client_secret": env("META_APP_SECRET"),
        "fb_exchange_token": short_token,
    })["access_token"]
    pages = http("GET", f"{GRAPH}/me/accounts", params={
        "fields": "id,name,access_token,instagram_business_account{id,username}",
        "access_token": long_user,
    }).get("data", [])
    if not pages:
        sys.exit("No Pages found — make sure you granted pages_show_list and you are an admin of the Page.")
    for page in pages:
        ig = page.get("instagram_business_account") or {}
        print(f"\nPage: {page['name']}")
        print(f"  FB_PAGE_ID={page['id']}")
        print(f"  PAGE_ACCESS_TOKEN={page['access_token']}")
        print(f"  IG_USER_ID={ig.get('id', 'NOT LINKED — link the Instagram account to this Page first')}"
              + (f"   (@{ig['username']})" if ig.get("username") else ""))


def check() -> None:
    token = env("PAGE_ACCESS_TOKEN")
    problems = []
    try:
        page = http("GET", f"{GRAPH}/{env('FB_PAGE_ID')}", params={"fields": "name,followers_count", "access_token": token})
        print(f"Facebook OK — {page.get('name')} ({page.get('followers_count')} followers)")
    except Exception as exc:
        problems.append(f"Facebook: {exc}")
    try:
        ig = http("GET", f"{GRAPH}/{env('IG_USER_ID')}", params={"fields": "username,followers_count", "access_token": token})
        print(f"Instagram OK — @{ig.get('username')} ({ig.get('followers_count')} followers)")
    except Exception as exc:
        problems.append(f"Instagram: {exc}")
    if problems:
        import telegram

        telegram.send("🔑 <b>Token problem</b> — publishing will fail until fixed:\n" + "\n".join(problems)
                      + "\nRe-run: python scripts/setup_tokens.py exchange <new token>")
        sys.exit(1)


if __name__ == "__main__":
    if sys.argv[1:2] == ["exchange"] and len(sys.argv) == 3:
        exchange(sys.argv[2])
    elif sys.argv[1:] == ["check"]:
        check()
    else:
        sys.exit("usage: setup_tokens.py exchange <short_token> | check")
