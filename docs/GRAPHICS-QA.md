# Graphics update QA

Acceptance uses isolated saves and classic scripts opened through `file://`. Player storage is never modified. Raw working-checkout evidence and screenshots are in `D:/CardableV2/outputs/graphics-update/`; committed JSON summaries accompany this report.

## Behavior and browser coverage

- Fifteen regression suites pass 314 behavior groups and cover foundation, all rarity modules, pack hold/cut/reveal/collection, tutorial, inventory/detail, settings, save export/import/reset/undo and permanent variants. The new graphics suite adds migration, atomic presets, independent overrides, 60/120/240 Hz synthetic RAF pacing, all numeric caps, focus pause/cap, hidden timer reconciliation, bounded resources, thumbnail teardown, live face preservation and missing-memory metadata.
- Real Chromium: all four presets, all thirteen rarity renderers (fixture for a tier without a catalog entry), all eleven coating renderers, preset reload/customization, focus pause, hidden sleep and timestamp catch-up. Material construction/update/teardown checks do not certify every rarity/coating visual combination.
- A 1000-card fixture expands to 1750 finish stacks: seven mounted Shelf tiles, no thumbnail back faces or live materials, one full card on detail entry and zero on return. Deterministic inventory tests also exercise Grid, rapid navigation, selected serials, filters, reorder, hidden cancellation, repeated modal cycles and listener bounds.
- Real native Chromium touch input at 390×844 DPR3: three-second hold, Tear fallback, Flip, Keep and reload without duplication. Low at 30 FPS also accepts a native top-strip cut, reloads the immutable reserved card and Deletes it without duplicating the one-time pack reward. Native touch also opens and closes inventory detail. Settings fit portrait and 844×390 landscape. Advanced reflection and FPS controls are operated through their real selects.
- No application page errors, runtime HTTP requests or missing rendered images in the browser acceptance run. Screenshots were inspected; an intercepted Flip target was fixed by placing the touch control outside the card scene. The mobile settings gear was moved clear of the detail Close target. A live animation override now refreshes static/3D face presentation. Incomplete memory metadata renders “Unknown” and is omitted from memory-type facets instead of crashing or being described as shared memory.

## Measured comparison

Same headless Chromium, 1366×768 DPR2, isolated saves, captured before source and current code. Three-second warmup and 2.2-second scene samples; idle measured for 1.2 seconds. CDP ScriptDuration/TaskDuration include CPU/browser work, not GPU time. See GRAPHICS-COMPARISON.json for every sample.

| Scene | Before High | Very Low | Low | Medium | High |
| --- | ---: | ---: | ---: | ---: | ---: |
| Menu frames / 2.2 s | 132 | 2 | 2 | 132 | 132 |
| Menu script CPU ms / sample | 10.12 | 0.43 | 0.38 | 7.04 | 9.10 |
| Inventory scene DOM nodes | 1819 | 1351 | 1352 | 1352 | 1352 |
| Mounted tiles / 1750 stacks | 7 | 7 | 7 | 7 | 7 |
| Idle menu frames / 1.2 s | 73 | 1 | 1 | 2 | 1 |
| Canvas pixels at DPR2 | 4196352 | 0 (detached) | 1639680 | 2360448 | 4196352 |

The High inventory scene has 467 fewer nodes (25.7%). Low tiers perform no continuous menu animation after settling; the remaining one-second timer wake is intentional. Very Low's focused card test becomes static and stops frames. In the heavy Mythical/galaxy coating scene, samples were 60 frames before High, 0 Very Low (static), 107 Low, 68 Medium and 59 High over roughly 2.2 seconds. High's heavy scene had higher measured task cost in this run (297 vs 259 ms), while its menu script cost decreased. Timing varies with software rendering and system load; this is evidence of scalable effect costs and idle/DOM improvements, not a universal speedup for every High material.

Actual browser refresh in these headless runs was approximately 60 Hz. Synthetic 120/240 Hz scheduling tests verify pacing logic only. No physical phone, basic laptop, 240 Hz monitor, thermal/battery test or hardware GPU timing was available. **240+ FPS on a midrange laptop is not certified.** Further High gains should target the masked SVG/blur-heavy rarity surfaces using real-device paint profiling.

## Shared checkout and checkpoint

Unrelated currency implementation, pack styling, catalog/photo queue, fonts, roster artifacts and ignore-file work are preserved outside this optimization commit. Targeted motion/shimmer changes common to the original currency widget are included; the existing working-checkout currency flights also respect particle/animation budgets. A scoped currency overlay is saved in the output evidence folder without absorbing that widget's unrelated implementation. The staged snapshot is validated independently against its committed catalog; the working checkout receives a separate browser pass after the null-safe metadata fix.
