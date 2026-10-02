# Graphics update — v1.2.0

Four presets apply instantly: **Very Low, Low, Medium, High**. Medium is the new-player default. Existing saved High/Medium/Low settings migrate to the same tier. No inventory, pack timing, pull probabilities, serials or immutable variants change.

| Effect | Very Low | Low | Medium | High |
| --- | --- | --- | --- | --- |
| Card finishes / coatings | Static; no live mount | 15 updates/s | 30 updates/s | 60 updates/s |
| Glare and reflection tracking | Off | 15 updates/s; simple glare | 30 updates/s | Display cadence; refined light |
| Props / borders | Static simplified | Half-detail; 15 updates/s | Three-quarter detail; 30 updates/s | Full geometry; 60 updates/s |
| Cosmetic particle density | 0 | 15% | 50% | 100% |
| Shadows | Flat grounding | Single shadow | Two layers | Full depth |
| Glass and blur | Solid tinted surfaces | Solid tinted surfaces | 60% blur radii | Full blur |
| Background dots | Off; canvas detached | Sparse; 15 paints/s | Medium; 30 paints/s | Full; 60 paints/s |
| Trails / ripple limit | Off / 0 | Off / 1 | On / 2 | On / 3 |
| Ambient animation | Static | Interaction only | Focused ambient | Focused ambient |
| Canvas pixel ratio ceiling | 1 | 1.25 | 1.5 | 2 |

These are independent advanced settings, not sliders tied implicitly to the preset. Changing an effect displays **Customized**. Selecting any preset resets only these nine graphics controls. FPS, reduced motion, key mappings, color mode and other preferences are preserved. Text remains at native CSS resolution. Low and Very Low keep collectible identity, rarity ornaments and readable metadata.

**FPS limit:** Display refresh (default for every preset), 30, 60, 90, 120, 144, 165 or 240. Caps never exceed actual display cadence. A carried deadline gives fractional caps their intended average on faster displays. The optional display reports rendered animation FPS, frame duration and subscriber JS time; it says Idle/Paused when work stops and never forces extra frames. It is not a GPU profiler.

**Hidden tab:** Sleep completely (default) stops visual frames and the recurring refill interval. Returning reconciles timestamp-based refills immediately, respecting four stored packs without banking time. Timer/title only retains the one-second timer/title updates while all visuals sleep. **Unfocused visible window:** Normal (default), 30 FPS or Pause visuals. This setting leaves refill logic independent. Reveals resume from saved progress; uncommitted holds cancel on blur/hide.

Slow sustained rendering can recommend the next lower preset. The recommendation compares measured frame gaps with the active cap/display target after warmup, excludes sleep and hidden gaps, and requires eight seconds below 75% of target. It never changes quality automatically. Apply and Dismiss are explicit actions.

Inventory Shelf/Grid uses bounded front-only static thumbnail DOM, local lower-resolution image assets, no text/back faces or live material bindings. Detail promotes one full card and returns a newly built thumbnail. Finish and coating bindings mount only when focused, release when made lite, and rebuild on relevant graphics changes. Procedural art templates are cached with a 96-entry bound. Particle pools allocate on emission and shrink on lowering quality. Pack fluid, material and pose values are cached; timer ticks wake a quiet menu rather than keeping an idle loop alive.

Touch play has a visible hold-to-open action, native top-strip cutting, a Tear fallback, Flip, Keep/Delete, inventory and settings. Coarse-pointer targets are at least 44px; essential controls survive idle fade. Keyboard controls and the fixed three-second hold remain supported. Reduced motion remains separate from graphics quality and continues to use static/fade equivalents.

High improves core glare and edge illumination while retaining focused rarity and coating effects. Its performance depends on display, browser and device. See [GRAPHICS-QA.md](GRAPHICS-QA.md) for measured evidence and its limits.

Stage 14 further optimizes inventory browsing: its sheet now uses shaded surfaces instead of full backdrop blur at every preset. Static card materials, bounded compositor layers, viewport-aware mount budgets and responsive grid layout keep moving inventory inexpensive. Other panels retain their independent glass controls. See [INVENTORY-PERFORMANCE.md](INVENTORY-PERFORMANCE.md).
