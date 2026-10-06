# Ascendant Prismatic Dawn - milestone C

A (`08fc340`) and B (`33f9a6a`) remain the foundation. C completes S7/S8 and the remaining presentation controls. SPEC remains intact in this delivery folder.

## Built

- S7 (28-31 seconds): 3-5 independently pleated, dispersive aurora layers rise from 20% to 90% height over 2.5 seconds; rising sparks, inward wind, maximum-speed sigil, blurred clock hands, camera pullback/push-in and progressive white. The final B inversion mask dissolves smoothly into these layers.
- At 30.6 seconds: prismatic shockwave and halo, horizontal flare, the shared post-stack's 700 ms chromatic envelope, and exactly one global white flash (110 ms rise, 590 ms smooth decay). Flash replay is suppressed after backward dev seeking. Letterboxing exits at the climax. No audio.
- S8 (31-32.5 seconds): direct 400 ms flip at final position, 0.96-to-1 card materialization/soft bloom, 1200 ms outer squircle aurora stroke draw and foreground fade over the first 160 ms. Metadata/variants/readiness resume after S8. Native 3D resources retire at mount.
- One shared serial-seeded white/pastel field supplies the final scenes, retained backdrop and card finish, with continuous age, smoothly interpolated colors and seeded faded edge splashes. Light playback freezes this field. Keep/Delete fades and immediate saved-card recovery continue through existing handlers.
- Cards setting Full / Short / Off extends the current schema before normalization; older saves default to Full. All rarity intros read this setting through the same controller. Ascendant Short retains the specified shot lengths, clock/title and ending: **16.5 seconds** including S8 (the listed pre-card durations sum to 15 seconds, rather than the approximate 14). Full is 32.5 seconds. Fast keeps the existing 70% scale.
- Very Low, reduced motion and Off use a three-second Canvas-only sequence: indigo, calm point, sigil/thin rings, local serif title and fade into the field/card. No flash, camera shake or 3D initialization.
- Dev Full/Short controls, S7/S8 scrub/jumps, and an optional small 10 Hz linear-luminance-change graph with declared flash count. The graph is an inspection aid, not a photosensitivity certification. Local pulse spacing and spin are capped in compressed playback and dev rate overrides. Existing registry, scheduler, skip, engine/post, clock and seeded presentation code are reused.

## Exactly unfinished

No milestone C scene or requested control remains unfinished in the implementation. Broader visual/safety/performance acceptance remains unverified: Short, Fast, Light, Mono, skip, reload, narrow viewports/resize, context loss, other graphics tiers and FPS targets were not exercised under the owner's single-playthrough restriction. No measured FPS or photosensitivity certification is claimed.

## Testing

One headed file:// game launch and one Full/Medium/Normal dev-triggered playthrough completed all 17 sections and reached the revealed card with WebGL2, zero console errors/warnings, one flash beat, a retained backdrop and completed border; GPU resources and cinematic UI were released. No tests, screenshots, recording or profiling runs.

## Focused Git checkpoint

C commits its renderer/runtime/descriptor/dev/finish changes and the settings extension directly. Overlapping index.html, rarity-intro.js, opening.js and documentation edits are captured as the exact C-only delta in C-INTEGRATION.patch, with LF-normalized byte hashes in C-INTEGRATION-BASE.json. Those changes are already applied to this live workspace; do not apply twice. The patch is based on the live B workspace plus its prior uncommitted revisions, and is applied using git apply --unidiff-zero when reconstructing that state. A and B integration artifacts remain prerequisites. Unrelated changes are not staged or committed.
