# Exotic — Stellar Flight

## Done

- Implemented Exotic only: Basic's actual white corner/spread/peak painter for 880 ms, a deliberate 520 ms black cut, 1400 ms star emergence, **10000 ms acceleration**, 420 ms shutter-blur stop, 1000 ms ignition, 3600 ms rotating galaxy, 1200 ms galaxy dissolve and 280 ms starfield release. Intro 19300 + flip 400 = **19.7 seconds** at Normal. Fast scales both to 70%: 13510 + 280 = 13.79 seconds. Charge, foil tear, metadata and variant settlement are additional.
- Built a perspective starfield with independently seeded depths, colored glows, glints, continuous velocity integration, twisting curved streaks, restrained high-speed shake and long beams. The same stars continue through the galaxy dissolve and card handoff, without a position reset.
- Built an original tilted galaxy with layered spiral gas, dark dust pockets, three dense stellar bands, selective live twinkles, golden accents, a compact pale core, local diffraction and shooting stars. Cached 768 px gas materials and three 1024 px stellar atlases preserve 5800 stellar points while reducing per-frame work. The composition reframes inside a portrait viewport.
- Retained the quiet starfield behind the card. Its subdued center keeps metadata readable; slow drift, twinkle and occasional faint shooting stars run at at most 10 Hz through the shared scheduler. Blur, hidden tabs, activity sleep and static policies pause it. Keep and Delete fade it over 450 ms, and the next card clears it. Recovery reconstructs the seeded quiet field and same front/variant, skipping galaxy preparation and cinematic replay.
- Reviewed the real-time production capture, chronological motion frames and desktop/portrait section keyframes. Refined sparse arms, oversized highlights, the acceleration's early pacing and field continuity. Replaced thousands of fresh circle paths with cached stellar layers after the first performance pass missed frames.
- Passed **18 focused browser groups**: 7 opening/timing/accessibility groups, 9 lifecycle groups and 2 actual-input/randomness groups. Zero page/console errors and HTTP requests in the focused suites. Covered Normal/Fast, all presets, reduced motion, pixel-exact Mono, resize, variants, hidden visibility fixture, 10 Hz background pause/resume, repeated decisions, multi-card packs, transition to Common, all nine earlier intros, 30 FPS cap and recovery during every Exotic section.
- Actual Space input still commits only after the three-second hold: one pack consumed, one serial reserved and one $200 reward. All Exotic renderer sections and the background were exercised with Math.random replaced by a throwing guard; they consume no gameplay randomness and leave durable state unchanged.
- Final recorded Normal trace: acceleration **10004.8 ms**, intro **19318.6 ms**, flip **403.8 ms**, foreground end **179.7 ms** after flip entry. Configured values are 10000/19300/400/160 ms; phase observations include frame scheduling and card mounting. No rise/pre-flip phase is inserted, and the reserved card stays unmounted through the film.
- Unrecorded 1920×1080 hardware Chromium (ANGLE/D3D11, Radeon RX 7800 XT): Medium 973840 visible pixels, mean frame **17.00 ms**, p95 **16.70 ms**, p95 draw **3.60 ms**; High 1498176 pixels, mean **16.74 ms**, p95 **16.80 ms**, p95 draw **4.80 ms**. This is roughly 59 FPS on the measured desktop. The visible canvas is bounded to 975000/1500000 pixels and DPR 1.5.
- Updated Designs.MD, pack-opening documentation, rarity-renderer documentation and this alpha delivery. Syntax and focused diff whitespace checks passed. Earlier effects and unrelated workspace changes were preserved. Nothing was staged or committed.

## Skipped or changed

- Higher rarity cinematics remain deferred. This pass implements the Exotic sequence only.
- The galaxy is original procedural Canvas artwork with perspective/star-plane projection, cached materials and optical trails. The supplied anime image informs motion/light; its character is not reproduced. No external engine, runtime download or audio is introduced.
- Performance is measured on this desktop. Lower-power GPU/mobile performance remains unmeasured; reduced motion and Low/Very Low retain the existing 800/1200/600 ms static alternatives. Fast's requested acceleration is seven seconds under the existing 70% policy.
- Recovery resets ephemeral wallpaper motion to a deterministic quiet phase rather than saving animation time. Static recovery matches at a fixed viewport/palette.
- Lifecycle fixtures use controlled clocks/presentation acceleration for state checks. The Normal capture and section timing assertions run at real speed. Hidden-tab checks use the existing visibility-event fixture. Earlier-rarity lifecycle checks include Mythical's Canvas fallback when WebGL is deliberately unavailable.

## Look at

- Open [the preview](D:/CardableV2/outputs/exotic-reveal/preview.html) for the real-time video, composition keyframes, portrait/Mono views and linked QA evidence.
- Inspect the white-to-black interruption, visibly increasing speed across the ten-second flight, shutter smear at the stop, dense rotating spiral and the galaxy's fade into the same stars.
- Inspect the brief flip and readable retained field, then Keep/Delete to see its exit. The preview contains an actual settled card, alongside controller-sampled keyframes.

## Open questions

- None blocking implementation. The chosen Normal duration is 19.7 seconds to the card front; each section and palette remains editable in src/data/rarities.js. Visual taste should be assessed with the full-speed preview.
