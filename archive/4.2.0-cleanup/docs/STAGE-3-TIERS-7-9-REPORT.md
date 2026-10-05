# Stage 3 — This session: tiers 7–9

## Done

- Added `legendary.js`, `mythical.js`, and `exotic.js`, each registered with `mount/update/destroy/lite`. Each module retains the original design and prop text verbatim in its source; rarity data is unchanged.
- Legendary: golden surface with sparkles and tip sparks; a waving yellow-gold-to-maroon band with checkerboxes in its maroon region. The gold SVG crown has sparkles/sparks, a red gemstone with a rotating hexagonal glow, a blue gemstone with static whitish mythril lines, and a green gemstone with a bright outlined edge.
- Mythical: ruby surface slowly pulses into a shining state. White-core/red-tip flame tongues grow upward from bottom anchors outside the nametag. A text-sized hidden measuring label keeps the flame frame aligned with name wrapping; an SVG mask protects the label's center.
- Exotic: pink surface, purple border, and seeded drifting circles/triangles/rectangles in the middle. Its outer squircle frame has a dark purple body, pink outline/glow, and a white dash traveling continuously around the perimeter. SVG path clipping provides the shape fallback; a `corner-shape` support rule is included.
- Extended the finish context with independent live/lite prop mount points at layer 8. Backgrounds stay at layer 2, below the shared foil, beam, and glare. Props crossfade with materials in 150 ms. Earlier tiers still have empty prop layers.
- Added shared SVG construction, unique definition IDs, and bounded sparkle helpers. Every new finish has explicit neutral mono colors for background and prop, plus a complete static lite render. No new per-finish animation loops or timers were added.
- New effects use the one existing focused-card update. Off-screen cards, hidden tabs, back faces, lite cards, and reduced-motion finishes stop animating. Reduced motion selects the static prop as well as the static background.
- The registry-driven gallery now shows tiers 0–9 in both color modes: 20 cards, one full and 19 lite. The existing five-second FPS sampler automatically includes the expanded card count.
- Verification: 15 new groups pass in `node tools/check-stage3-tiers7-9.cjs`; the 14 tiers-4–6 groups, 13 Stage 2 groups, 15 Stage 1 groups, and six Stage 0 checks also pass. Source JavaScript passes syntax checks. Tests cover layer placement, each prop, static blue texture, seeded shapes, unique SVG IDs, mono mode propagation, lifecycle cleanup, suspension, lite isolation, and the sampler's arithmetic. No application errors were logged by the instrumented runtime.

## Skipped or changed

- This is a partial Stage 3 checkpoint for the explicit session range, tiers 7–9. The Secret instruction was interpreted as the same generic Stage 3 requirement from the previous session; tiers 10–12, including Secret found/unfound, remain for a later pass.
- Added new presentation settings under `config.finishMotion`. Existing settings, catalog data, game mechanics, and save schema are unchanged. The card/registry prop seam is shared infrastructure needed for these tiers.
- Regression assertions now allow newly registered finishes and the larger gallery while retaining their original-tier checks. The DOM harness also reflects SVG `class` attributes in class lookup.
- Browser tooling previously rejected local-file preview and prohibited alternate routes to that preview. Screenshots and screenshot critique could not be produced. Actual material/prop appearance, mono appearance, direct file opening, and measured 60 fps remain unverified. The simulated 60 Hz FPS sample verifies arithmetic and one-full/19-lite update isolation; it performs no real browser paint or GPU work.
- Missing local font files and the missing named frame reference remain as documented in Stage 2. No later-stage gameplay, market, audio, or variants were added.

## Look at

1. Open `index.html` directly, then append `?dev=1&gallery=1`. Confirm ten tiers in each color-mode section and no application console errors.
2. Inspect Legendary's crown and all three gem treatments. The red hex glow should rotate, blue texture should remain still, and green outline should be crisp. Check that crown sparkles and corner sparks remain restrained, and that the yellow-gold/maroon waving checker band is visible around the art window.
3. Inspect Mythical's ruby pulse and flame frame. Flames should originate below the nametag and rise around its exterior, leaving letters readable. Check alignment with fallback fonts, wrapped names, and resized cards; these layout and masking details need actual browser inspection.
4. Inspect Exotic's middle shapes and outer frame at 100% zoom and a larger display scale. Check the small squircle corners, dark purple/pink layering, smooth white perimeter motion, and near-black shared keyline. Verify no clipping at corners or overlapping gallery neighbors.
5. Compare color, mono, and all-lite mode. Distinct gem tones, flame cores/tips, and border layers should still read in grayscale. Switch full/lite and reduced motion during animation; background and prop should crossfade together without a jump.
6. Scroll the focused card out of view, switch tabs, and turn it to the back. Check that finish and prop movement stops, and resumes without replaying hidden time.
7. Select each visible new-tier card on its front with motion enabled and click **Measure 5 s FPS** at bottom-right. Repeat in both color modes. The sampler includes one full and 19 lite gallery cards; use browser performance tools to confirm paint/compositing cost and the 60 fps target.
8. Capture color/full, mono, and all-lite screenshots of the three new tiers before closing visual acceptance. The observations above are review targets, not screenshot findings.

## Open questions

- Applied defaults: monochrome UI with rarity colors on card faces (#3), local font fallbacks (#19), SVG squircle fallback (#20), and desktop scope (#21).
- Animation speeds and counts were unspecified; named settings cover the seven-second Legendary wave, six-second red-gem rotation, 6.5-second ruby pulse, 1.6-second flame cycle, eleven-second shape drift, and five-second perimeter sweep.
- The explicit tiers-7–9 session limit was used. Secret found/unfound and the rest of tiers 10–12 are outstanding.
- Visual acceptance and measured browser FPS remain open because the permitted preview route is blocked.
