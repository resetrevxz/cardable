# v3.0.0 optimization pass - in progress

Objective: improve the entire game substantially while preserving game rules, collection/pull/recovery invariants and the existing visual identity. The version is still 2.5.0 until the full release acceptance is established. The Settings refresh is partial progress, not completion of this objective.

## Current evidence

- The graphics refresh removes full-scene Settings blur and adds independently configurable cinematic quality. Its current-checkout acceptance and paired measurements are in GRAPHICS-REFRESH.md.
- Heavy focused card views remain expensive. Removing metadata backdrop blur and hiding the rear face explicitly did not improve the current software-rendered samples. Those experimental overrides were not applied to the source.
- Secret's screen engine now allocates OS/mask texture storage only when dimensions change, then uses texSubImage2D for subsequent uploads. Feedback ping-pong, CRT, bloom, output composition and safety sampling remain intact.
- `tools/check-screen-texture-browser.cjs` compares the captured original engine with the current engine using eight changing source/mask frames and three dimension configurations. Full-frame hashes and byte sums match for every output, with no WebGL errors. Frame uploads make six allocations and ten updates, rather than replacing storage on all sixteen uploads. Both engines release their resources.
- A brief High Secret scene sample measured roughly 13 FPS before and 14 FPS after, with similar 83 ms p95 gaps. This is insufficient evidence of a major improvement. The renderer remains a priority, especially GPU/Canvas copying, final-output readback and full-resolution post effects. The safety limiter must continue to inspect final displayed frames.

Evidence: `D:/CardableV2/outputs/graphics-profiles/secret-upload-before.json`, `secret-upload-after.json` and `screen-texture-qa.json`. The original source snapshot is `D:/CardableV2/outputs/v3-optimization/baseline/`. The texture test accepts CARDABLE_SCREEN_BASELINE for another captured original engine path.

## Remaining release acceptance

- Establish substantial improvements in the heavy detail and cinematic paths, with comparable baseline/current samples and unchanged visual/effect behavior.
- Check all pack skins, ordinary menu/activity, moving inventory, Settings and full opening journeys across the four presets; validate hidden/unfocused behavior and reduced motion.
- Verify full cinematic timelines, skip/recovery/handoff and safety behavior, beyond startup-only checks.
- Verify deterministic reservations, three-second hold, cutting, Keep/Delete and exact-once ownership/rewards on reload and cancellation.
- Review and isolate a coherent release checkpoint from the extensive pre-existing working-tree changes, then update the version and release notes to 3.0.0.

The goal remains active. Startup tests, narrowed UI improvements and green syntax checks do not establish whole-game release acceptance or physical-device FPS claims.
