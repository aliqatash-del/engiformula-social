---
description: Create one post from a topic, ready for approval
argument-hint: "<topic> [type] [slot]"
---
Create one post about: $ARGUMENTS

Follow "How a post is built" in CLAUDE.md exactly: post.yaml, numbers recomputed in Python, render, look at the result, validate, commit. If no slot is given, take the next free slot that matches the weekly template. Reply with the hook, the slot and the rendered images.
