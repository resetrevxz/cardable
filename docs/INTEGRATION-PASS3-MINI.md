# Optimization and Mini integration into current main

Release follow-up: the owner subsequently authorized committing and publishing the integrated update as **1.5.0 — Smoother collections**. The initial local handoff and 1.4.3 baseline measurements below remain historical evidence; the earlier no-commit instruction is superseded for this release.

This local update integrates `D:/CardableV2/OptimizationPass3` and `D:/CardableV2/MiniModeRework` into `D:/CardableV2/cardable-spec/cardable`, based on main `64e9dd716da26a1ae8e1706cc010134a228de396`. Version remains **1.4.3**. The owner requested no commits/version change; nothing is staged, committed, tagged or published. This is a bounded implementation task, not a resumed goal.

## Integration boundaries

Both feature worktrees started at `d992575`. Three-way patch integration retained main's newer collections/wishlists, loading screen, pack styling, and disabled Achievements feature. One append conflict in `smooth.css` was resolved by retaining both main's newer UI rules and the cinematic control backing fix. Mini's older version, changelogs, patch notes and root guidance were deliberately excluded. The original worktrees and the unrelated incoming website brief remain untouched. Patch snapshots and the main base are retained under `D:/CardableV2/archive/artifacts/integration-pass3-mini-20261011`.

## Changes

- Carry forward bounded grid mount preparation, direct thumbnail image selection, omitted hidden thumbnail material trees, reusable geometry and height-only resize handling.
- Retain pack face controller/canvas disposal and DPR changes, formatter caches, shared UI mount batching, scalar quality reads, and identical spring behavior.
- Carry forward bounded Secret wallpaper/text/dialog caches with unchanged flash-limiter behavior.
- Integrate the lightweight always-on-top Mini companion, snapshot IPC, Open/Keep/Picker actions, reservation-token validation, recovery, saved 30/60 FPS and Left/Right docking, and Free/16:9/21:9/custom window sizing.
- Optimize the new collection membership projection with a single bounded cache. Search/filter and tab navigation reuse membership. Membership/favorite/sort changes, in-place developer edits and new base projections invalidate it. Manual movement flags now use two linear groups instead of rescanning all collections for every tab.
- Update only collection selection/focus states when switching tabs; retain existing tab labels/icons and preserve header/layout resizing.
- Replace Mini's whole-inventory sort with a linear scan retaining only the newest three candidates. Snapshot/recent data remains bounded and the full renderer remains the only save writer.
- Make QA wait for the new loading screen and deferred desktop welcome. Earlier tests attempting entry before startup completed were harness failures, not proof of a game bug.

## Current-main measurements

Sequential accelerated Electron runs compared unmodified current main `64e9dd7` with this merged source. Each route contains 1,512 finish stacks, runs for 20 seconds and advances at 700 px/sec on this machine's 240 Hz display. The 1% low is the reciprocal of the mean of the slowest 1% of page RAF gaps. These individual local samples are not universal hardware guarantees.

| Preset / route | Before average FPS | Merged average FPS | Before 1% low FPS | Merged 1% low FPS | Before max gap ms | Merged max gap ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Low grid | 210.3 | 238.5 | 54.9 | 146.4 | 45.8 | 8.4 |
| High grid | 208.8 | 238.7 | 53.0 | 156.1 | 50.1 | 8.4 |
| Low moving shelf | 239.0 | 239.5 | 166.6 | 197.1 | 20.9 | 16.7 |
| High moving shelf | 233.9 | 237.4 | 92.1 | 115.5 | 41.6 | 33.4 |

Evidence: `qa-output/optimization/main143-baseline.json` and `main143-merged.json`; both runs completed with no renderer errors or network requests. This is a fresh comparison with 1.4.3, not the earlier 1.4.0 figures. High shelf still has occasional long gaps.

The new collection fixture has 24 custom collections/wishlists and 1,512 stacks. Five paired runs of 150 repeated membership projections measured roughly 129–132 ms before versus 40–41 ms merged (about 69% less CPU time). This measures projection work, not rendered FPS. Thirty projection comparisons match baseline output, including every tab sort, active collection/favorites and invalid-ID fallback. In-place edits invalidate the cache. Evidence: `qa-output/merged-collections/evidence.json`.

## Verification

- Mini source suite: 16 checks, including sandbox/bridge boundaries, keyboard/remapping, exact-once Keep, stale actions, unminted Picker offers, failed saves, relaunch recovery, hidden-game refill, idle behavior, both frame ceilings, docking, native aspect and custom sizing. No renderer exceptions/network requests. Its inherited evidence directory is named `qa-output/mini-1.4.1`; the tested source is current **1.4.3**, not a downgrade.
- Optimization source suite: 20 groups including all ten pack strategies, repeated Keep, forty front/rear face rebuilds, effective quality/DPR, twelve locale combinations, unchanged springs, geometry and bounded grids/focus across all four regular tiers.
- Browser journeys pass all four presets at desktop and 390px: End/Home, pointer detail promotion, Flip/return, reduced motion, color/mono scroll preservation and hidden cleanup.
- Collections: 15 current main checks, 30 baseline comparisons, retained tab child identity and one selected/focusable tab after switching. Desktop color and phone monochrome screenshots inspected.
- Mini reserved/color and recent/monochrome screenshots inspected; current source screenshots cover window presets/custom sizing too.
- All eight native service tests, catalog integrity (380 entries / 170 art references), HTML resources (176 scripts / 53 stylesheets), changed source syntax and whitespace checks pass.
- Merged Full High/Safe Legendary and Secret openings pass visible content, actual handoff, readable retained-field controls and exactly one saved Keep reward. Native captures inspected; evidence: `qa-output/merged-cinematics/evidence.json`. This does not extend acceptance to every cinematic/profile.
- Electron smoke passes opening/settings/inventory, bridge isolation, desktop service rejection guards, graceful close, native-backup recovery and the opt-in developer workspace. Its test-only renderer script now waits for the new loading/welcome surface; normal runtime behavior is unchanged by that harness fix.

## Remaining acceptance

No minimum-device guarantee, perfect 1% lows, live updater/installer acceptance, multi-display/DPI hot-plug acceptance or exhaustive cinematic/variant certification is claimed. This task focuses the newer main changes; it does not resume the earlier unbounded cinematic optimization goal. No visual effects were removed or added to lower presets based on unmeasured assumptions. Mini retains its existing Right/30 FPS defaults. Player profiles were not used for tests.

The mandatory local desktop delivery is run once after these source checks. Its generated result is `dist/delivery/latest.json`; the final handoff reports ready/pending/failure status, installer and shortcut. This workflow does not install, launch or publish the game. Original feature worktrees remain available for rollback; the temporary unmodified 1.4.3 baseline is solely measurement evidence.
