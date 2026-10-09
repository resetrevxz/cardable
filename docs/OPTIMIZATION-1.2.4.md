# 1.2.4 frame consistency pass

The owner requested an ongoing optimization, bug and QoL hunt, emphasizing 1% lows, lower presets, grounded inventory detail and synchronized Mythical water contact. This report separates source/resource reductions, functional checks and FPS evidence. No universal speed or bug-free claim follows from a small source session.

## Changes

- Developer backup preparation uses a separate IndexedDB store and preserves/read-verifies the exact legacy backup before freeing that known local-storage key. Current and preceding session baselines remain restorable, including retained older legacy bytes. Backup failure still blocks real edits and pack preparation. Controls mount after preparation; focus returns outside the panel before hiding.
- Electron ignores only a cancelled initial load when the real game document is loading; genuine missing-file errors keep recovery. Very High is accepted by the native pack-state validator and Mini's material tier resolver.
- Developer timer reconciliation copies only pack fields until a refill actually changes stock/anchor. Selected favorite tags invalidate alongside cached query content.
- Inventory UI edits clone only optional `inventoryUi`, retaining card/journal identity. The inventory projection is cached by catalog/instance-array identity and the collection's seen revision. Search, filter, favorite, membership, sort and view changes invalidate the query; navigation-only saves do not. Filter callbacks take snapshots because the toolbar mutates its filter object.
- Query sorting caches each entry's key, including oldest/newest acquisition extrema. Favorites and collection membership use per-query sets. Static thumbnail repaint signatures describe their actual bounded material tier.
- Detail shades the mounted static collection at every preset, blocks background input and keeps one promoted full card. The previous sheet visibility rule and full-window blur are removed.
- Mythical uses one analytic fall/contact/sink clock for GL and Canvas. Its tip reaches y=0 at the 8-second impact and continues descending through the 9-second underwater camera cut. Rings, crown and droplets use the actual contact point. Authored 27.6-second story duration is retained.
- Medium reduces only wall subdivisions; major cave dimensions, mass silhouettes, materials and cluster counts remain. A native sample constructed 60,192 rock vertices versus the earlier 90,096, about 33% fewer. High/Very High retained 135,024 vertices and 30 hanging clusters; Very High previously constructed only 18 clusters.
- GL splash/ribbon arrays, per-draw model matrices, normalized colors and a fixed shadow camera are reused. Adaptive resolution allocation uses 1/16 bands, reducing repeated target reallocations during easing. One 81-paint resource check crossed four dimension bands; it was not an FPS benchmark.
- Secret clamps its authored four-level OS composition to High for Very High. Warmups match starting quality and release when a calm route starts; Secret renderer disposal releases the backing canvas/context. Ascendant calm starts also retire cached scenes.
- HUD lows average the slowest fraction's instantaneous FPS and retain p99 separately. First frames after wake are excluded; initial/paused states and sample count are explicit. Save bytes derive from the last serialized JSON instead of encoding the entire save twice per second. The Advanced graph refreshes at most 10 Hz.

## Functional evidence so far

One source Electron session used `dist/optimization-profile`, seeded through import with a copy of the earlier diagnostic profile. Original player data was not edited. Renderer reloads kept the same isolated session.

- Detail entry/return passed on Very Low, Low, Medium and High: sheet visible, background inert, one full card, successful saves, no renderer errors. Native narrow-window navigation returned a valid target rectangle. This uses the existing composed desktop scale and is not phone/browser acceptance.
- Two saves and a selection change produced zero additional projections/queries. Card and journal references were retained. Favorite and custom-collection filtering returned the selected stack.
- Repeated real filter UI changes returned 2 duplicate stacks, 0 unowned, 20 owned/all, 3 new and 20 after clearing New, with no renderer errors.
- Shared physical contact samples showed tip y≈0 at 8 seconds and continued descent at 8.1/8.5/8.99/9/9.01. GL samples painted across the fall/impact/underwater beats on Medium, High and eligible Very High without failure.
- Presentation-only samples painted every Mythical section and retired GL by the omen. Forced context loss continued through the Canvas impact and underwater route. These sampled checkpoints do not certify the film's physical-device feel or photosensitivity.
- Secret Very High adopted WebGL and reused its warmed OS texture (one allocation, one update); lowering to Low retired the engine/canvas to 1×1. Secret/Ascendant warmup-to-calm checks each disposed the one cached scene and adopted none.
- A native Standard pack reserved successfully, consumed one pack, incremented the serial once, added one card through Keep (22→23), cleared its reservation and retained 23 cards after reload. No renderer errors or save-failure message occurred.
- Synthetic HUD input with 99 ordinary frames and one 100 ms frame returned a 10 FPS slowest-1% result. This verifies the metric calculation, not game speed.
- With writes to the old developer-backup key denied, an IndexedDB baseline was prepared, the old key migrated with prior-session recovery available, and forced Ascendant reserved once without renderer errors. The owner separately confirmed that Ascendant now opens in their browser after refresh; Keep/reload and wider browser acceptance are not inferred from that confirmation.
- With both backup stores deliberately denied in the isolated profile, developer mutation threw `QuotaExceededError`, the save stayed unchanged, and opening created no pending reservation. The storage-full guidance appeared. The denial was removed and reload restored the durable baseline with 27 cards and no pending reveal. The expected diagnostic failure is distinct from an unhandled renderer error.
- Closing focused developer controls returned focus to their chip before `aria-hidden`. Five unchanged timer ticks made no deep-clone calls and preserved save/pack references. A selected favorite toggle updated both the saved favorite and its visible badge.
- Early native navigation reproduced `ERR_ABORTED (-3)` and followed the cancellation branch with a ready game document instead of missing-file recovery.
- Native pack-state accepted a Very High payload, Mini opened with both its document quality and pack material set to `very-high`, and restoring it returned to the visible main window with no renderer errors.
- A distinct legacy backup was preserved byte-for-byte, an older legacy string remained archived, and the local key was removed only after verification. Both current and previous session baselines remained available; primary save was present and no reveal was pending.
- The existing `Cardable.dev.checkQol()` ran once at the checkpoint and stopped at its known first legacy viewport assertion: expected 0.62 at 1100×680, actual 0.5729167. It was not edited or rerun to manufacture a pass. Syntax validation passed for 25 changed JavaScript files; data validation passed for 372 registry entries and 170 final art references. The isolated app closed normally.

## Pending acceptance

The owner policy in AGENTS/PROMPTING prohibits profiling, old suites, new test files and game screenshots/recordings. A focused before/after timing exception has been requested; no authorization is assumed. Actual average FPS/1% gains, physical hardware, browser/touch, full film/input/recovery matrices and live installer/updater execution remain separate acceptance. The permitted `checkQol()` remains blocked by its known obsolete viewport expectation. Packaging/publication follow this reviewed source checkpoint; manifests, immutable tag and Actions are their separate delivery evidence.
