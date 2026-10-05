# Unusual and Double Super Rare — delivery

## Done

- Added the two requested cinematics using an original procedural refractive glass/gel material, inspired by the owner's purple reference. Long gently warped seams, irregular facets, dark pockets, caustic edges, independently moving highlights and elongated glints give the surface depth.
- Staged a visible first slow beam, then increased speed and density. Bright needle cores, softer screen-blended bloom and refracted echoes make the later sweeps more legible. One tinted-white saturation peak leads into a 140 ms travel lock, 200 ms release and the existing brief flip.
- Unusual is purple/white. Double Super Rare maintains blue on the left and gold on the right, including beams crossing the center and the final blue-white/gold-white wash.
- Normal durations after the foil tear, including the 400 ms flip, are 7.20 / 7.80 seconds. Section durations and palette choices live in `src/data/rarities.js`.
- Reused the existing 160 ms overlay/flip overlap, metadata and variant readiness, Keep/Delete gating, pending-reveal recovery and exact-once pack rewards. No gameplay pull/serial/pack code was changed.
- Added the classic-script material painter before the shared intro controller; no separate RAF or timer. Cached 512 px material atlases and a 640 px slow glass field; the latter refreshes at 30 Hz while beams, sparkles, saturation and the handoff draw on each shared scheduler frame. Material cache is bounded to seven palettes. Visible refraction canvases are bounded to 1.5 / 1.3 million pixels on High / Medium.

Thirteen focused browser check groups passed in isolated Chromium on the actual `file://` game with zero page/console errors and zero external network requests:

- Two Normal-speed real-time openings: card absent until handoff, no rise/pre-flip pause, overlay present when card back mounts, clean release and exact-once Keep/rewards.
- Both tiers' reduced motion, Low, Very Low and Fast alternatives; Fast intros are 4760 / 5180 ms and the flip is 280 ms.
- Both tiers' all-pixel Mono checks, portrait viewport, resize and live Mono/color/quality switches. Double Super Rare retains blue on the left and gold on the right.
- Variant transformation and its readiness gate, reload during intro, simulated hidden-tab pause/resume, repeated Delete/Keep, and two-card reservations. An additional fixture reserves Unusual then Double Super Rare with the actual sampler and verifies that both original cards, serials and one pack reward remain intact.
- First-five integration regression: each existing intro still hides its card, hands off and can be kept after metadata.
- A configured 30 FPS cap limits painting to 16–20 frames in a 600 ms shared-scheduler interval.

The final recorded run measured intro / flip / overlay-release times of 6827 / 406 / 172 ms for Unusual and 7435 / 415 / 165 ms for Double Super Rare. The small differences from descriptor values are frame quantization. Pulls, serials and currency remain unchanged during the animation; the pack is consumed and its $200 reward granted only once at the existing commit.

## Skipped or changed

- Legendary and higher cinematics remain deferred. No audio, external assets or new game rules.
- Version is now 1.6.0. The revision is uncommitted at the owner's request, and unrelated shared-tree work was preserved.
- The first visual pass looked like flat curtains. Heavy outlines were replaced with thinner refracted seams, irregular facets and stronger luminous folds. Beam ignition was then staged explicitly so random offscreen rays cannot hide its first sweep.
- Full-resolution layer painting missed frames in the initial High test. The smaller cached glass field and 1.5 million pixel refraction budget reduced mean frame time substantially. Final uncaptured 1280×800 headless runs measured mean frame times of 17.92 / 18.18 ms for Unusual Medium / High and 18.15 / 18.31 ms for Double Super Rare. P95 paint cost was 4.8–5.7 ms; occasional missed frames remain (p95 frame time 33.3 ms). Native-window performance and all hardware are not certified.

## Look at

Open `D:/CardableV2/outputs/prism-reveals/preview.html` for the Normal-speed walkthrough and six section keyframes. The local preview loads all images, decodes/plays the video and fits a 390 px viewport. The video is a 25 FPS Playwright recording, not a native rendering FPS measurement.

The real-time sequence was captured and visually inspected through keyframes and 250 ms motion-frame strips, including the final effect/flip handoff and portrait composition. No blank handoff or lingering effect was observed; both palettes remain distinct. The preview was queued in the Codex browser panel; the tool did not confirm that a visible tab opened.

Raw evidence and helpers are outside the checkout in that same output folder: `verification.json`, `extra-verification.json`, `performance-display.json`, `preview-check.json`, `normal-speed.webm`, section/portrait images and motion strips. Player browser data and saves were never accessed.

## Open questions

No blocking questions. Section lengths were chosen to give the glass formation and beam acceleration time to read, with a compact finish. Artistic preference and native-window frame pacing remain available for human review.
