# Stage 3 — This session: tiers 4–6

## Done

- Added one registered `mount/update/destroy/lite` module per new tier: `super-rare.js`, `unusual.js`, and `double-super-rare.js`. Original design text is retained verbatim in the modules and the existing rarity data. All three have `propSpec: null`, so no props were invented.
- Super Rare: blue top with three drifting ocean wave bands, softly blended into darker blue with an independently static checkerboard below.
- Unusual: purple with a white light source at the top whose glow extends downward and retracts over a 5.5-second cycle.
- Double Super Rare: dark blue checkerboard fading into gold, seeded sparkles in the gold region, gold color drift over nine seconds, and blue drift following over 27 seconds.
- Every new finish has an intentional neutral mono palette and a static lite render. The surfaces remain behind the shared foil, beam, and glare. Full/lite still crossfades in 150 ms.
- Animation runs through the existing shared scheduler on one focused full front card. Other cards remain static; off-screen cards, hidden tabs, back faces, and reduced-motion finishes stop updating. No new animation loops, timers inside finish modules, or infinite CSS animations were added.
- Gallery now discovers registered finishes from the rarity registry and shows tiers 0–6 in both color modes: 14 cards total, with one full and 13 lite by default. Empty catalog tiers remain labeled in-memory studies and never alter saved inventory or counters.
- Added a floating gallery FPS sampler. It records a five-second window of actual scheduler frame timestamps, reports average cadence and p95/max frame interval, and cancels if the full card changes, goes off-screen, turns over, or the tab/motion preference changes. It remains available while inspecting cards farther down the gallery.
- Verification: `node tools/check-stage3.cjs` passes 14 behavior groups; `node tools/check-stage2.cjs` passes 13; `node tools/check-stage1.cjs` passes 15 plus all six Stage 0 checks. All source JavaScript passes syntax checks. Data files are unchanged. No application errors were logged in the instrumented runtime.

## Skipped or changed

- Session scope was taken as the explicit “implement tiers 4–6.” A clarification was requested about the conflicting Secret instruction; with no answer received, tier 11 was deferred with the other later finishes. This is a partial Stage 3 checkpoint, not completion of all tiers 4–12.
- Added visual timing and sampling settings under `config.finishMotion`. Existing config values, catalog data, game rules, and save schema are unchanged.
- Updated Stage 2 regression assertions to inspect its original four tiers within the expanded gallery; the assertions still verify their behavior and save preservation.
- The existing browser security rejection of local-file preview prohibits using an alternate route to the same preview. No browser screenshots, screenshot critique, or measured browser FPS could be obtained. Simulated 60 Hz timestamps verified the sampler's arithmetic and one-full/13-lite update isolation only. They do not establish rendering performance, intentional mono appearance, or the 60 fps acceptance criterion.
- Local font files and the named frame reference are still absent, as recorded in the Stage 2 report.

## Look at

1. Open `index.html` directly and append `?dev=1&gallery=1`. Confirm all seven implemented tiers in the color and mono sections.
2. Inspect Super Rare: waves should be visible and ocean-like around the art window; the darker lower checkerboard must remain still. Check the softness of their boundary and the contrast of white text.
3. Inspect Unusual for at least six seconds: the white light must originate at the top, travel downward, then retract. It should remain a restrained light effect over purple rather than washing out the card.
4. Inspect Double Super Rare for at least 30 seconds: gold should drift sooner than blue; sparkles should belong to the gold region. Check that they do not compete with the specs and engraving.
5. Compare mono and color, including all-lite mode. The neutral versions should retain the finish's pattern and depth. Switch between modes and watch for jumps during the 150 ms crossfade.
6. Hover/focus each new finish, then scroll it out of view, switch tabs, turn it over, or enable reduced motion. Verify movement stops and resumes appropriately without replaying hidden time.
7. Select a visible new-tier card, keep it on its front with motion enabled, and click **Measure 5 s FPS** at the bottom-right. The sample includes one full and 13 lite cards in the gallery. Repeat for each new finish and both color modes. Use browser performance tools to inspect paint/compositing cost and confirm the 60 fps target; the sampler reports frame cadence, not a hardware certification.
8. Capture screenshots of the three color finishes, their mono counterparts, and all-lite mode. The visual review targets above remain unverified until actual browser renders are inspected.

## Open questions

- Applied defaults: monochrome UI with rarity color confined to card faces (#3), local font fallbacks (#19), and desktop scope (#21). No new gameplay defaults were needed.
- Exact wave/drift speeds and sparkle count were unspecified. They are named visual settings in `config.finishMotion`; Unusual uses the documented 5–6-second range, and Double Super Rare's blue cycle is three times slower than gold.
- The session limit takes precedence over the generic Secret requirement for this checkpoint. Secret's found/unfound designs remain outstanding.
- Visual acceptance and measured 60 fps remain open because browser preview is blocked.
