# Four-tier graphics refresh

The game keeps Very Low, Low, Medium and High, with Medium as the fresh-save default. Ten independently adjustable graphics controls cover finishes, reflections, props, particles, shadows, glass, backgrounds, ambient animation, canvas resolution and cinematic detail. A preset applies all ten atomically and preserves FPS, motion, controls and other preferences. Existing saves inherit cinematic detail from their saved preset.

Very Low keeps readable art and metadata with static materials, no decorative particles or ambient animation, solid panels and calm Canvas cinematics. Low keeps lightweight materials and interaction, fewer particles and simplified rendering. Medium uses balanced geometry, resolution and update budgets. High retains full focused card effects and cinematic geometry/post processing. Reduced motion and cinematic safety controls remain authoritative at every tier.

FPS choices are Display refresh, 20, 30, 45, 60, 90, 120, 144, 165 and 240. The cap is independent of the preset and cannot exceed the display cadence. Hidden tabs either sleep completely or retain timer/title updates; both stop visual frames. Visible unfocused windows can continue normally, cap at 30 FPS, or pause visuals. Refills reconcile real elapsed time when returning.

## Rendering changes

- Cinematic detail is now independent of the base preset, including the newer Mythical, Exotic, Ascendant and Secret renderers, their warmup, geometry and resolution selection. Canvas resolution remains a separate ceiling.
- Settings uses a shaded background instead of filtering the entire underlying game. The panel's glass control and full preview materials remain intact.
- Card updates write the flip-availability attribute only when it changes.
- Cinematic resizing no longer clears an unchanged canvas backing store. Changing canvas resolution also requests a resize.

## Current-checkout evidence

Isolated Chromium contexts opened the actual game using file://. Sampling used a 1366 by 900 viewport, 1.4 seconds warmup, and three seconds of frame gaps. Before and after samples were sequential on the same machine. Raw evidence is under `D:/CardableV2/outputs/v3-optimization/tiers-before.json` and `tiers-after.json`; the directory name predates this refresh and does not represent a version change.

| Scene | Before | After |
| --- | ---: | ---: |
| Medium settings / Mythical preview | 22 FPS | 51 FPS |
| High settings / Mythical preview | 22 FPS | 49 FPS |
| Medium Exotic / galaxy detail | 39 FPS | 50 FPS |
| High Exotic / galaxy detail | 35 FPS | 40 FPS |

The settings change directly addresses full-scene blur composition. Detail has only a small attribute-write change; its timing differences are subject to rendering/system noise and should not be attributed entirely to that change. Very Low and Low samples had roughly 60 Hz browser cadence, but static scenes do not continuously render game frames. Raw browser cadence must not be reported as static-scene animation FPS.

`tools/check-graphics-refresh-browser.cjs` verifies preset migration/application, independent cinematic customization and reload, real 20/45 FPS pacing, five cinematic renderer startup/render/release paths at every tier, unfocused pause, hidden sleep/timer behavior and refill reconciliation. A DPR3 phone viewport uses native touch for the three-second hold, Tear and Keep; reload checks one owned instance and unchanged currency. Phone settings and the 20 FPS select are exercised. Evidence and the phone screenshot are in `D:/CardableV2/outputs/graphics-refresh/`.

`tools/check-inventory-performance-browser.cjs` passes all presets with 1,512 finish stacks, bounded shelf/grid mounts, drag, favorites, detail flip/return, keyboard navigation, reduced motion, phone resizing and cleanup. Both suites report zero application errors and zero HTTP requests. Cinematic checks cover startup/render/release rather than every beat of all full-duration films.

The archived graphics browser suite uses an obsolete pack-state fixture that replaces the newer pack counter and fails with "Opening number must be a positive safe integer". The current-checkout suite preserves that state and tests the relevant flows directly. Physical low-end hardware and sustained 240+ FPS were not tested. The High preview still exceeds a 16.7 ms frame budget on this software-rendered browser; this update does not certify universal 60 or 240 FPS.

The checkout contains extensive pre-existing edits and untracked cinematic dependencies. Changes remain reviewable in the shared working tree rather than absorbing those unrelated additions into a release commit.
