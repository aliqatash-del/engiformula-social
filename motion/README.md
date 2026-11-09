# Motion kit

Deterministic motion graphics for 1080×1920 reels, drawn with Canvas 2D (flat-shaded stylized 3D, never photoreal).

- `engine.js` — timing/easing, brand colours and chrome, draw-on paths, dimension lines, a small 3D camera
  (yaw/pitch/perspective) with a painter's renderer: `box`, `rodY`, `sweepY`, `line3`, `text3`, `ground`.
- `scenes/<name>.js` — one reel format each; `draw(ctx, t)` is a pure function of time.
- Render: `node scripts/render_motion.js <scene> [...] [--out dir] [--fps 30] [--stills 2,5.5] [--preview]`
  (`--preview` writes only the stills). Output: H.264/AAC MP4 with a silent track, faststart.

| Scene | Format |
| --- | --- |
| section-to-beam | Blueprint → Build |
| plan-to-footing | Plan → Solid + live calculator |
| contours-to-terrain | Map → Terrain |
| pavement-explode | Exploded view |
| load-to-moment | Force flow |
| board-rotate | Turn it |
| column-buckling | Failure mode |
| pipe-slope | Flow |
| build-sequence | Build sequence |
| quiz-countdown | Quiz countdown |

Every number drawn on screen is stated in the scene's header comment and was recomputed in Python before use.
Next step: let `make_reel.py` take a `motion:` scene for a post and mux it with the Kokoro voiceover and captions.
