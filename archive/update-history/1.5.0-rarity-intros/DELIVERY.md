# Rarity intro quality revision — delivery

## Done

- Rebuilt Basic/Common/Uncommon around shaped light fronts, short peaks and continuous inward releases; added clearly visible lime stars and green perimeter circles.
- Made Rare blue throughout. Added drifting cloud material, a slow four-point-star approach, a 180 ms snap and sixteen silhouette-derived crystal pieces.
- Rebuilt Super Rare with detailed rotating ornamental rings, blue wisps/dark pockets, an elongated faceted cyan star, continuous particle gathering/burst, a two-second portal hold, star dive and pale-blue wash.
- Added the requested 400 ms flip, with a 160 ms overlapping effect release. Removed the separate rise/pre-flip wait for these five tiers. Normal totals after the tear are 1.60/1.75/2.20/4.20/7.00 seconds, excluding metadata/variant settlement.
- Suppressed floating reward receipts and the previous collection toast during the cinematic/flip so they cannot interrupt the composition. Rewards and toast clocks continue normally.
- Kept the shared scheduler, editable section/palette descriptors, bounded canvas, Mono/Fast/accessibility fallbacks, variant readiness, durable reservation, rewards and recovery. Cached the cloud atlas and composited portal field to avoid full-screen multi-layer raster work during the dive.

Focused verification used isolated headless Chromium on the actual file:// game; the player's browser/save was never accessed. Seven browser groups passed with zero page/console errors and zero external network requests: all five real-time sequences and overlay/flip handoffs; reduced/Low/Very Low/High-Fast alternatives; narrow Mono resize; variant transformation; pending-reveal reload; hidden-tab pause; and multi-card repeated Delete/Keep decisions. Each commit consumes one pack and grants $200 once; serials, reserved cards and currency remain unchanged during presentation. Repeated inputs apply each decision once.

The final recorded run measured intro/flip times of approximately 1224/404, 1370/410, 1818/411, 3818/408 and 6625/414 ms. Handoffs remained covered until the card back was mounted, then the overlay cleared about 159–174 ms into the flip. The differences from configured durations are normal frame quantization.

## Skipped or changed

- Unusual, Double Super Rare, Legendary and higher cutscenes remain deferred. No sound or new pack/game rules were added.
- This is a polish revision within the existing 1.5.0 update; no version bump or Git commit was made. Unrelated dirty-tree changes were preserved.
- The slow cloud-field material is cached at 30 Hz at 384/512 px for Medium/High, while the full-screen renderer, rings, star, camera and card handoff paint on every shared scheduler frame. This is a material cache, not the removed Medium 30 Hz intro throttle.
- Native-window play and every hardware configuration are not certified. Uncaptured headless Super Rare runs at default display refresh measured Medium p95 frame time 16.8 ms, p95 paint 3.3 ms; High p95 frame time 33.3 ms, p95 paint 5.1 ms, with occasional missed frames. Shared frame limiting remains unchanged. The saved walkthrough itself is a 25 FPS Playwright capture and should not be used to judge native rendering FPS.

## Look at

Open `D:/CardableV2/outputs/rarity-polish/preview.html` for the Normal-speed walkthrough and current peak keyframes. The first visual review identified distracting solid cloud bands and a flat central star; those were refined. Motion-frame review also exposed old collection/reward overlays above the new intro; the final run verifies that they are hidden during the cinematic. Review the lower-tier impact and the Rare/Super Rare composition before requesting higher tiers.

Raw local evidence: `verification.json`, `performance-display.json`, `normal-speed.webm` and section images in the same output directory. Verification helpers live outside the game checkout; no old broad suites were used.

## Open questions

None for the implemented scope. Artistic preference and native-window High frame pacing remain for human review; higher tiers are not advanced automatically.
