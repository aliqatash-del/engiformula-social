---
name: engiformula-post
description: Use whenever writing, rendering or reviewing an EngiFormula social post (Facebook, Instagram, Reels, Stories, carousels) — brand colours, caption formula, hook formulas, hashtag rules and the post.yaml format.
---

# EngiFormula post

## Hook formulas (pick one, first line / first 2 seconds)
1. Result first — "A 12 mm bar weighs 0.888 kg/m — here's the 2-second formula."
2. Contradiction — "Your slab needs more concrete than the drawing says."
3. Costly mistake — "This one detail cracks more slabs than bad concrete."
4. Challenge — "Most engineers get this deflection question wrong."
5. Speed — "Concrete for a 12×20 slab in 20 seconds."
6. Insider — "What your PE prep book won't tell you about load combos."
7. Before/after — "Hand calc: 6 minutes. Calculator: 6 seconds."
8. Myth — "No, you don't add 20% waste to every concrete order."

## Caption formula
hook → value (2–4 short lines, both unit systems) → one specific question → CTA (save / send to a colleague / comment KEYWORD; "free calculator — link in bio") → hashtags in the list (max 5: 2 broad, 2 niche, #engiformula).
Write for sends: every post should be worth forwarding to a colleague.

## Visual rules
- Paper #F7F5F0 with 40px grid #D9DEE6; ink #0E2A47; one hero number in Formula Blue #1E5BD8; one highlighted word on Rebar Yellow #FFC145; pointers in Safety Orange #F26A1B.
- Cover and CTA slides use the pillar colour as a full block (`style: block`); quizzes use `style: dark`.
- Feed 1080×1350; reels/stories 1080×1920 with text between 220 px from the top and 420 px from the bottom.
- Fonts: Space Grotesk (titles), Inter (text), JetBrains Mono (numbers) — bundled in templates/fonts.
- Hooks ≤ 7 words on covers; ≤ 25 words of body per slide.

## post.yaml fields
id, slot, type (image|carousel|reel|story|text), platforms, pillar (calculator|knowledge|site|community|career), status (draft), source, caption, hashtags, first_comment, alt_text, ai_generated, manual_steps, slides[] (title, body, formula, legend, result, table, cta, style, seconds, voice), voiceover, captions.
Reels: give every slide a `voice` line written as spoken ("number four bar", "P S I", "cubic yards"); pushing the post runs .github/workflows/build-reels.yml (Kokoro TTS, voice set in config/settings.yaml `voice:`), which stretches `seconds`, writes voice.m4a + captions.srt and builds reel.mp4.

## Quality gate before you finish
- Every number recomputed in Python and shown.
- Code edition named when a rule is stated.
- validate.py passes; rendered images viewed — nothing clipped, nothing overlapping.
