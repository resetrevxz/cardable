# Mythical: the Crimson Clock — delivery

## Done

- Implemented Mythical only, with all eleven editable intro sections and the direct flip. Normal is 27,600 ms of ceremony plus a 400 ms flip; Fast is 19,320 + 280 ms. The pack charge, tear, metadata and variant settlement are additional.
- Built a native WebGL2 cave with irregular stone, hanging ruby clusters, a ceiling socket/pivot for the hero, fracture chips, parallax, facet lighting/internal ruby light and black-water reflections. The impact has an analytic splash crown, droplets, red tint and expanding rings. The side shot has rooted moving tendrils and rising bubbles; the camera then stays below the cave ceiling and projects the star on the water.
- Built the red omen, broken beveled clock rim, engraved marks, counter-rotating frames, three hands, corrupted original vector gothic title, displaced letter slices, textured flames and one white flash. Clock ornamentation is adapted from the supplied reference; its countdown/audio/app are not used.
- Reviewed the real-time production capture and extracted motion sequences as well as section keyframes. Refined flat rock shading, the crystal silhouette/light, ceiling pivot, flame shape, title/star spacing and the overhead camera before delivery.
- Retained the red-black field behind the card, with a darker center and slow edge smoke/embers at at most 10 Hz. It pauses on blur, hidden tabs, activity hide and static graphics/motion; the 3D scene is released. Reload reconstructs the seed-derived quiet field and same saved front/variant, without replay. Both Keep and final Delete let the 450 ms backdrop fade finish before clearing the stage.
- Verified 17 focused browser groups (7 opening, 10 lifecycle) with zero page/console errors and zero HTTP requests. Cases cover Normal/Fast, Low/Very Low/reduced motion, Mono pixels, resize, variants, hidden-tab visibility fixture, GPU context loss/unavailability, background sleeping, recovery during major shots, repeated decisions, two-card packs, next-rarity cleanup and all eight earlier intros.
- Final recorded Normal run: intro 27,623.2 ms, flip phase 465.8 ms and foreground end 183.8 ms after flip entry. Configured animation durations remain 27,600/400/160 ms; observed phase events include frame scheduling and card rendering. No rise/pre-flip phase or extra blank overlay is inserted.
- Unrecorded 1920×1080 hardware-accelerated Chromium, ANGLE/D3D11 on the local Radeon RX 7800 XT: Medium 973,840 visible pixels, mean frame 16.73 ms and p95 16.70 ms; High 1,498,176 pixels, mean 16.68 ms and p95 16.80 ms. Recorded playback is separate from these measurements. Default software-only browser tests were also used for initial exploration; their slow frames are not hardware performance evidence.
- Syntax and focused diff whitespace checks passed. Existing unrelated workspace changes were preserved; this revision is uncommitted and nothing was staged.

## Skipped or changed

- Exotic and higher cinematics remain deferred. No audio or gameplay/save-schema work was added.
- The cave and water use procedural mesh/material rendering and optical approximations. This is not a fluid simulation or ray-traced production film. Performance has been measured on this desktop; minimum-spec laptop performance is unverified.
- Gothic lettering is original vector artwork confined to the ceremony. The game continues using its two existing UI fonts.
- Recovery resets the ephemeral living smoke to its deterministic quiet phase; it does not save the animation phase. Static recovery matches at fixed viewport/palette.
- Lifecycle fixtures use presentation acceleration for state assertions; full-speed pacing and visual captures use the real timeline. Hidden-tab checks exercise the existing visibility event fixture.

## Look at

- Open `D:/CardableV2/outputs/mythical-reveal/preview.html` for the complete production video, section keyframes, narrow/color/Mono views and linked verification JSON.
- Inspect the crystal's tip and water contact, the underwater tendrils, overhead star projection, readable-to-corrupted title, accelerating clock, single flash and immediate card flip.
- Leave the revealed card open to see the quiet edge smoke, then Keep or Delete to check the backdrop's exit.

## Open questions

- None blocking this implementation. Visual taste still benefits from the owner's review of the included real-time preview.
