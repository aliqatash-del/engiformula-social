---
description: Apply the edit notes the owner sent from Telegram
---
Find every post in content/queue with status draft, a non-empty edit_requests list and no edits_done flag. For each: apply the requested changes, recompute numbers, re-render, validate, set edits_done: true, commit. Reply with a one-line summary per post.
