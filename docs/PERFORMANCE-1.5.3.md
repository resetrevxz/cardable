# Performance pass (1.5.3)

How it was measured: `tools/profile-main-thread.cjs` runs the game in headless Chromium and reports main-thread busy, script, layout and style time per tier and scene (menu, menu with pointer, card detail, shelf and grid scrolling). Chromium's CDP profiler and tracing were used to find where style recalculation came from. All numbers are from one desktop CPU with software rendering; use them to compare changes on the same machine, not to promise frame rates on other hardware.

| Scene (main-thread busy) | Tier | Before | After |
|---|---|---|---|
| Menu idle | Medium | 7.1% | 3.3% |
| Menu idle | High | 11.9% | 3.6% |
| Menu, moving pointer | Low | 14.8% | 14.1% |
| Menu, moving pointer | Medium | 22.1% | 13.4% |
| Menu, moving pointer | High | 22.1% | 15.5% |

Very Low idles at 0.1% and Low at 0.1%; shelf and grid scrolling stay at about 0.6–1.5% on every tier.

What changed
- Inherited custom properties restyle their whole subtree, so lighting variables are rounded to steps far below one device pixel and several were removed where no layer used them (designed-face packs have no couture layers). Sweep, parallax and breathing for couture packs are written straight to their one element.
- Same-value writes to `data-pack-quality` and the flip-fade class were guarded.
- `Cardable.fx.rect(el)` reuses a bounding rectangle for 100 ms for pointer-driven proximity checks.
- `Cardable.fxColor` caches canvas colour strings for Exotic and Mythical.
- `Cardable.fx.profile` (opt in; the Advanced performance panel enables it while open) records per-callback CPU time and which callbacks keep the frame loop awake.

What was left alone: GL cinematics (Ascendant, Mythical, Secret) are bound by raster/GPU work in this setup; their resolution, pass and field budgets already scale by tier, so they stay High-tier features. No tier's visual features were reduced, and nothing was moved down a tier without a measurement: Low and Very Low idle at about 0.1%, so a new ambient loop there would add continuous work rather than being free.
