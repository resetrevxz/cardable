# Legendary ceremony — delivery

## Done

- Implemented only Legendary in this pass: rising embers, molten side flames, a slowly approaching/turning gold prism and aura, three mirrored crystal illumination passes, a seal and a quiet resolve into the card flip.
- Used the owner's gold-outline/crystalline reference for the light language. Original geometry and material code create the molten edge, noise heat, metallic prism reflections, fine internal facets, luminous axis/rim and beveled crystal catches. No weapon or external asset was reproduced.
- Normal timings after the foil tear are embers 650 → flames 1850 → aura 1700 → sweeps 3000 → seal 900 → resolve 500 → flip 400 ms: 9.00 seconds to the front. The sweeps move center-out, return inward, then fill the field center-out. Palettes and all section durations remain editable in the rarity descriptor.
- Reused the direct 400 ms flip with a 160 ms overlapping foreground release. Card creation remains at the handoff; existing metadata and variant readiness continue to gate Keep/Delete.
- Retained the final crystal field behind the card as a static background, with a darker reading space. It fades over 450 ms on collection/discard and clears before another reveal or the menu. Reload reconstructs it from the reserved instance without replaying the intro.
- Kept the offline classic-script structure, shared scheduler/FPS cap, independent presentation randomness, Mono/Fast/reduced-motion and Low/Very Low alternatives. Cached flame/crystal fields are bounded to a 640 px long dimension, periodic heat to 128×256, geometry to 192 facets and 36 embers, and glow sprites to eight. The main gilded canvas is bounded to 1.5/1.3 million pixels on High/Medium.

Thirteen focused browser check groups passed in isolated Chromium against the actual `file://` game, with zero page/console errors and zero external network requests:

- Normal-speed opening/handoff, card absence during the ceremony, no old rise/pre-flip wait, exact-once Keep/pack rewards and cleanup.
- Reduced-motion 800 ms, Low 1200 ms, Very Low 600 ms and Fast 6020 ms intro plus 280 ms flip.
- Mono pixel checks, narrow/resize, variant transformation/readiness, reserved-reveal reload and simulated hidden-tab pause/resume.
- Multi-card repeated Delete/Keep, and a separate Legendary-to-Common reservation that removes the gold field before the next intro while preserving both original cards, serials and one reward.
- The retained field does not repaint while reading and restores pixel-identically on reload. Live Mono/color and portrait resize work. Keep fades it over 450 ms; Delete also cleans it while preserving the pack reward and serial.
- All seven earlier intros and the existing Mythical reveal still run and Keep correctly, with no inherited gold background.
- A configured 30 FPS cap bounds drawing to 16–20 frames in a 600 ms shared-scheduler interval.

The final recorded run measured approximately 8632 ms intro, 401 ms flip and 167 ms overlapping release. Differences from descriptor values are frame quantization. Pulls, reserved cards, serials, pack consumption and the existing $200 reward are unchanged by presentation; repeated decisions apply once.

## Skipped or changed

- Mythical and higher cinematics remain deferred. No audio or new game rules.
- Version is now 1.7.0. The revision is uncommitted at the owner's request, and unrelated workspace changes were preserved.
- The first visual pass had flat ribbon flames and rectangular sweep masks. Those were replaced by continuous molten contours, separately moving periodic heat, thinner wisps and face-by-face illumination. Prism reflections/rim/core were strengthened. A texture repeat seam was removed, and the seal now blends continuously from the final crystal pass.
- Native-window performance and all hardware remain unverified. Uncaptured 1280×800 headless tests measured Medium mean frame time 16.99 ms / p95 16.8 ms / p95 paint 4.8 ms. High measured mean 18.85 ms / p95 33.3 ms / p95 paint 6.1 ms, with occasional missed frames. The shared FPS cap remains authoritative.

## Look at

Open `D:/CardableV2/outputs/legendary-reveal/preview.html` for the Normal-speed walkthrough and six selected compositions. It includes the retained background and its exit after Keep. The preview loads all images, decodes/plays the video and fits a 390 px viewport. The 25 FPS Playwright recording is not a native rendering FPS measurement.

The real-time run was visually inspected through keyframes and motion strips at 250 ms intervals, including the prism approach, all three passes, full-field crystallization, seal, flip, retained background and exit. The handoff stays continuous; no blank frame or lingering foreground was observed. Portrait and Mono compositions were captured separately.

Raw evidence and helpers live outside the checkout in that output folder: `verification.json`, `lifecycle-verification.json`, `performance-display.json`, `preview-check.json`, `normal-speed.webm`, section/portrait images and motion strips. The player's browser profile and save were never accessed.

## Open questions

No blocking questions. The section lengths and prism composition were chosen within the approved gold-flame/crystal direction. Final artistic preference and native High frame pacing remain available for human review.
