# EngiFormula Social — automation starter kit

Claude plans and writes posts → `render.py` turns them into brand images and reels → you tap **Approve** in Telegram → the scheduler publishes to Instagram and the Facebook Page through Meta's official Graph API → daily and weekly reports come back to Telegram.

```
Claude (plan + write) → content/queue/<post>/post.yaml → render.py / make_reel.py → validate.py
      → Telegram: preview + [Approve] [Needs edit] [Reject]
      → scheduler.py (GitHub Actions, every 30 min) → publish.py → Instagram + Facebook
      → insights.py → data/*.csv → Telegram reports → Claude weekly/monthly review
```

Nothing is ever published without your tap. Posts still unapproved 24 h after their slot are skipped.

## What it costs

| Item | Cost |
| --- | --- |
| Meta Graph API (Facebook + Instagram publishing, insights) | Free |
| Telegram bot | Free |
| GitHub private repo + Actions (~900 of the free 2,000 min/month) | Free |
| Cloudflare R2 media bucket (10 GB free) | Free at this volume |
| Claude Pro/Max subscription (Claude + Claude Code) | your existing plan |
| Optional: Meta boosts | ~$5/day from Phase 2 |
| Optional: WhatsApp alerts instead of Telegram | paid per message by Meta — not included |

## Setup, step by step (about 2 hours, once)

### 1. Put this folder in a private GitHub repo
1. github.com → New repository → name `engiformula-social` → **Private** → Create.
2. Upload all files from this kit (or `git push`). Keep `.env` out of git — it's in `.gitignore`.

### 2. Create the Instagram account and link it to the Page
1. Instagram app → create **@engiformula** (or the closest free handle).
2. Settings → Account type and tools → **Switch to professional account** → **Business** → category *Education* or *Engineering*.
3. Meta Business Suite (business.facebook.com) → Settings → **Instagram accounts** → Connect → log in → link it to the EngiFormula Facebook Page.
4. Apply the brand kit: profile picture, bio, link to engiformula.com.

### 3. Create the Meta app and get your tokens (no App Review needed for your own Page)
1. developers.facebook.com → **My Apps → Create app** → use case **"Manage everything on your Page"** (or type *Business*) → name it `EngiFormula Publisher`.
2. In the app dashboard add the **Instagram** product (API setup with Facebook Login) if it isn't added automatically.
3. Copy **App ID** and **App Secret** (App settings → Basic) → `META_APP_ID`, `META_APP_SECRET`.
4. Open **Tools → Graph API Explorer** → select your app → **User Token** → add permissions:
   `pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_engagement, read_insights, instagram_basic, instagram_content_publish, instagram_manage_insights, instagram_manage_comments, business_management`
   → **Generate Access Token** → approve for the EngiFormula Page and Instagram account.
5. On your computer: `python scripts/setup_tokens.py exchange <the token you just copied>`
   It prints `FB_PAGE_ID`, `PAGE_ACCESS_TOKEN` (no set expiry) and `IG_USER_ID`.
6. Keep the app in **Development mode**: as the app admin you have Standard Access, which is enough to publish to Pages you manage.

### 4. Create the public media bucket (Instagram fetches images and videos by URL)
1. dash.cloudflare.com → **R2** → Create bucket `engiformula-media`.
2. Bucket → Settings → **Public access** → enable the r2.dev URL (or connect `media.engiformula.com`) → copy it to `PUBLIC_MEDIA_BASE_URL`.
3. R2 → **Manage API tokens** → Create token with *Object Read & Write* on that bucket → copy Access Key ID, Secret, and the S3 endpoint.
4. Bucket → Settings → **Object lifecycle rules** → delete objects after 7 days.

### 5. Create the Telegram approval bot
1. In Telegram, open **@BotFather** → `/newbot` → name `EngiFormula Approvals` → copy the token → `TELEGRAM_BOT_TOKEN`.
2. Open your new bot and send `/start`.
3. Run `python scripts/telegram.py whoami` → copy your chat id → `TELEGRAM_CHAT_ID`.
4. Run `python scripts/telegram.py test` — you should get "EngiFormula bot is connected ✅".

### 6. Add the secrets to GitHub
Repo → Settings → Secrets and variables → Actions → **New repository secret** for each line of `.env.example`
(FB_PAGE_ID, IG_USER_ID, PAGE_ACCESS_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, PUBLIC_MEDIA_BASE_URL).
Then Settings → Actions → General → Workflow permissions → **Read and write**.

### 7. Install locally (for rendering and testing)
```bash
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env    # fill in the values
```

### 8. Dry run — nothing is sent
```bash
DRY_RUN=1 FAKE_NOW=2026-10-27T10:00:00+03:00 python scripts/scheduler.py   # sends the sample post "for approval"
DRY_RUN=1 FAKE_NOW=2026-11-02T20:05:00+03:00 python scripts/scheduler.py   # shows every API call it would make
```

### 9. First real post (Phase 0 gate)
1. Change the sample post's `slot` to 30 minutes from now, commit.
2. Wait for the Telegram preview → tap **Approve**.
3. Within 30 minutes of the slot it publishes; Telegram sends the confirmation. Check both apps.

### 10. Connect Claude
- **Claude Code** (desktop app or web): open this repo. `CLAUDE.md` and `.claude/` load automatically. Try `/draft-post concrete volume for a 12x20 ft slab`.
- **Recommended external skills** (install once inside the repo):
  ```bash
  npx skills add remotion-dev/skills                                   # motion-graphics reels in React
  npx skills add coreyhaines31/marketingskills --skill social copywriting -a claude-code
  ```
  In an interactive Claude Code session: `/plugin marketplace add anthropics/skills` then `/plugin install example-skills@anthropic-agent-skills` (canvas-design, brand-guidelines, frontend-design, skill-creator).
- **Claude scheduled task** (Claude app → this repo): every Sunday 10:00 Riyadh → "Run /weekly-review and /plan-week for EngiFormula". Every 1st of the month → "Run /monthly-review".

## Daily routine for you (~20 minutes)
1. Telegram previews arrive 2 days ahead → **Approve**, **Needs edit** (then reply with what to change), or **Reject**. The 09:00 message lists everything still waiting and has one **Approve all** button.
   - Taps are picked up on the next run (within 30 min); the buttons then change to ✅ Approved.
   - Approved late? The post still goes out on the next run, up to 24 h after its slot. After that it is skipped.
   - Not sure the bot hears you? Send **ping**; it answers on the next run. If it never answers, another app is reading this bot's messages.
2. After each publish: reply to comments within the first hour.
3. Stories: add the poll / link sticker by hand when Telegram asks (the API can't add stickers).

## Files
| Path | What it does |
| --- | --- |
| `CLAUDE.md` | Instructions Claude Code follows: voice, pillars, rules, how to build a post |
| `config/settings.yaml` | Slots, approval timings, platform limits, Graph API version |
| `config/brand.json` | Colours, pillar chips, fonts, canvas sizes |
| `templates/slide.html` + `fonts/` | The brand template every image is rendered from (fonts are SIL OFL) |
| `content/queue/<id>/post.yaml` | One post: caption, hashtags, slides, status |
| `scripts/render.py` | Slides → 1080×1350 / 1080×1920 JPEGs |
| `scripts/voiceover.py` | Slide `voice:` lines → free Kokoro AI voice (voice.m4a) + word-timed captions.srt; runs in the Build reels workflow on every pushed reel |
| `scripts/make_reel.py` | Frames + voiceover + captions → Meta-ready MP4 |
| `scripts/validate.py` | Hashtag cap, caption length, links, sizes, alt text, reel length |
| `scripts/telegram.py` | Approval previews, buttons, edit notes |
| `scripts/scheduler.py` | The heartbeat: approvals → reminders → publishing |
| `scripts/publish.py` | Instagram + Facebook Graph API publishing |
| `scripts/insights.py` | Follower and post metrics → CSV → Telegram reports |
| `scripts/setup_tokens.py` | Token exchange (setup) and weekly health check |
| `.github/workflows/` | Scheduler every 30 min (08:00–21:30 Riyadh); daily/weekly reports; token check |

## Limits to know
- Instagram API: up to 100 posts per 24 h; carousels up to 10 items; images must be JPEG; Reels 3 s–15 min.
- Facebook API: 30 Reels per 24 h per Page; Reels 3–90 s.
- Stickers (poll, link, music), collab invites and the Trial Reels switch are app-only — Telegram reminds you.
- GitHub may start scheduled runs a few minutes late; posts publish within ~30 minutes of their slot.
- When Meta retires `graph_api_version`, update it in `config/settings.yaml`.
