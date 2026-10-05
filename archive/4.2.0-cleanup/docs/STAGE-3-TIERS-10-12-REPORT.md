# Stage 3 — This session: tiers 10–12

## Done

- Added individual registered `ascendant.js`, `secret.js`, and `limited.js` modules with `mount/update/destroy/lite`. Their original design and prop text is retained verbatim in source and checked against rarity data. All thirteen finishes are now implemented.
- Ascendant: white base, pastel RGB energy rotating around all four sides, seeded random splash intervals of 2–3 seconds, and a one-second fade in/out. A clipped SVG squircle frame shifts pastel aurora colors. Mono uses shifting neutral luminance in both surface and frame.
- Secret Unfound: six rapidly scrambling glyphs including the prescribed punctuation, quick white line sweeps, and a black squircle border at 95% opacity. Its name, specs, art and serial are concealed, including the back serial and accessible label. The exact Unfound description is shown.
- Secret Found: letters lock left-to-right every 300 ms with small white flashes. At 1.8 seconds, the completed word inverts to black on white; sweep frequency and line thickness rise until the background is covered in black. The loop then returns to white-on-black scrambling. The prop changes black/white with the phase. Its exact Found description is shown in the gallery.
- Secret state normally comes from saved ownership; explicit preview state or `owned: true` can be supplied to the card component without altering inventory. These are presentation options, not a variant or new save field.
- Limited: reuses the Unusual purple base and moving white top glow, adding a crimson glowing border and a slightly floating/parallax Cardable mark. Mono has a neutral glowing rim. Description substitution reads `availableUntil`; the null default keeps the literal `<date>` placeholder. Pull eligibility is unchanged.
- Backgrounds remain at layer 2, props at layer 8, with the ten-layer stack retained. Every new state has a static lite render and the existing 150 ms material/prop crossfade. Effects use the shared focused-card scheduler; they stop offscreen, in hidden tabs, on the back face, in lite mode, and under reduced motion. There are no new per-finish frame loops or timers.
- The registry-driven dev gallery shows all thirteen tiers in both modes, with both Secret states: 28 previews, one full and 27 lite. Empty catalog tiers still use labeled temporary studies. Opening the gallery does not change saved inventory, pack count, or serial counter.
- Verification: 15 new behavior groups pass in `node tools/check-stage3-tiers10-12.cjs`. Regression coverage passes: 15 Stage 1 groups, 13 Stage 2 groups, 14 tiers-4–6 groups, 15 tiers-7–9 groups, and all six Stage 0 console checks. JavaScript syntax and diff whitespace checks pass. The instrumented runtime logged no application errors.
- The gallery FPS sampler correctly reports one full plus 27 lite cards with simulated timestamps: 300 frames over five seconds, 60 Hz, p95/max gap approximately 16.67 ms. This verifies sampler arithmetic and animation isolation; it does not measure browser rendering performance.

## Skipped or changed

- Existing config values, data files and save schema are unchanged. Added named presentation tunables under `config.finishMotion` for the three new tiers. Registry metadata allows state previews, descriptions and concealment without embedding a Secret branch in the card builder.
- Unfound replaces the art window as required. Found retains its procedural GPU art as a faint etching, so it does not obscure the letter animation. White text on restrained dark backing stays readable during inversion; this treatment needs visual inspection.
- Regression checks for unsupported tiers and gallery counts now permit the completed registry while retaining their earlier-tier assertions.
- Browser tooling previously rejected this local-file preview and prohibited alternate routes to it. No workaround was used. Screenshots, screenshot critique, direct-file runtime inspection, actual mono/material appearance and measured 60 fps remain unverified. Stage 3 code is complete; visual/performance acceptance remains open.
- Missing local font files use the existing system fallbacks. No later-stage gameplay, audio, market or variants were added.

## Look at

1. Open `index.html` directly and append `?dev=1&gallery=1`. Confirm fourteen previews in each section: all thirteen tiers with an extra Secret state. Check the application console for errors.
2. Focus Ascendant in each mode. Check pastel energy along every side, small squircle corners, aurora shimmer, and soft random splashes every 2–3 seconds lasting one second. Mono should read as white/silver rather than flat gray.
3. Focus Secret Found for several loops. Check six 300 ms locks, the last-letter flash, complete `Secret`, inversion, increasing line speed/thickness, complete black coverage and reset. Check the border inverts with the background and that GPU etching/text plates do not overpower the effect.
4. Focus Secret Unfound. It must never lock or invert, and must expose no card name, specs, GPU artwork or serial. Turn it to the back and inspect its accessible label as well.
5. Compare Limited with Unusual. The white top glow should match; Limited adds a restrained crimson rim and a lifted mark. In mono, check that the rim still reads as light. The placeholder date must remain `<date>` with current data.
6. Toggle all-lite mode, change reduced motion during animation, scroll the selected card out of view, switch tabs, and turn the card over. All finishes must pause, retain their state, and return without replaying hidden time. Background and prop must crossfade together.
7. With motion enabled and a new-tier front card visible, click **Measure 5 s FPS** at bottom-right. Repeat for Ascendant, both Secret states and Limited in both modes. The workload is one full and 27 lite previews. Inspect real frame gaps and browser paint/compositing cost for the 60 fps target; harness timing is not performance evidence.
8. Capture color/full, mono and all-lite screenshots before closing acceptance. Review glyph legibility, border clipping, black/white coverage, pastel saturation, Limited glow restraint and readability with fallback fonts. These are manual review targets, not claimed screenshot findings.

## Open questions

- Applied defaults: monochrome chrome with rarity colors restricted to cards (#3); Unfound Secret instead of a silhouette, with no name (#9); Limited remains non-pullable with a null deadline and `<date>` placeholder (#13); Limited shares Unusual's base (#17); local font fallbacks (#19); clipped SVG squircle fallback (#20); desktop scope (#21).
- Additional unspecified timing/tuning is named in config: 12-second aurora cycle; 55 ms glyph scrambling; 120 ms lock flash; 2.4-second accelerating coverage phase from 2 to 8 sweeps/second; eight line bands growing from 3% to 12.75% height; six-second Limited float with 2.4 px lift and 4 px parallax. Specified 300 ms locks and splash intervals/duration are preserved.
- With no deadline configured, Limited's available-description template is a presentation placeholder and does not make the tier obtainable. A future date is shown as its UTC calendar date; expired dates use the exact unavailable-description template.
- Actual material appearance, intentional mono appearance, screenshots and measured browser FPS remain open because the permitted preview route is blocked.
