---
description: Draft next week's 10 posts (Mon–Sun) as drafts in content/queue, rendered and validated
---
Plan the week starting on the next Monday (or $ARGUMENTS if a date is given).

1. Read CLAUDE.md, config/settings.yaml and the last 30 rows of data/post_metrics.csv (if present) — favour the pillars and formats that performed best, and avoid repeating a topic used in the last 6 weeks (check content/published).
2. Fetch https://engiformula.com/calculators to pick calculator topics.
3. Follow the weekly plan template in CLAUDE.md: 4 reels, 3 carousels, 2 image posts, 1 Facebook text post, at the right slots.
4. For each post: create the folder + post.yaml, recompute every number with Python, render (render.py / make_reel.py), view the images, validate.
5. Commit with message "plan: week of <date>".
6. Reply with a table: day · slot · type · pillar · hook — and list anything that needs the owner (photos to supply, voiceovers to record).
