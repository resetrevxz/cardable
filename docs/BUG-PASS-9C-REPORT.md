# Done

- Created `BUGS.md` with all nine audit areas, reproduction steps, status definitions, evidence and manual acceptance steps: 13 fixed logic/integration issues, four deferred browser acceptance gates and two intentional behaviors.
- Fixed modal shortcut focus, inventory capture cleanup on close/sort/resize, stale save fallback recovery, unknown reserved-card startup failures, timer watcher cleanup, candidate-only timer reconciliation, serial-counter repair and tutorial Skip keyboard access.
- Protected dev checks from active presentation state and isolated their fallback cache. Blocked storage reports the checks it can perform without claiming persistent reload success.
- Added 13 dev-console regression fixtures. With storage available, all 19 console checks print PASS: six Stage 0 checks plus the new 13. `Cardable.dev.runBugChecks()` runs the isolated fixtures alone; active opening/modals defer the state simulations.
- Added `tools/check-bug-pass.cjs`: 27 passing adversarial groups, including a focused rerun of each fixed row. All 13 previous suites pass, covering 270 prior groups; total 297 behavior groups. Syntax checks pass for 71 JS/CJS files.
- Ran 50 real charge/pull/reveal/Keep/collection cycles with Common, Legendary and Secret, including opening while a previous toast is visible. All 50 instances and serials are unique. Global listeners remain 35, event listeners 126 and scheduler subscribers 14. Transient card views return to zero; scheduled tasks peak at four and return to three. Matching tier/toast DOM phases remain bounded.
- Recorded fresh host CPU profiling: moving 300-tile carousel p95 0.642 ms, max 4.276 ms; one full Secret among a 300-entry collection p95 0.023 ms. These are instrumented Node workloads, excluding browser painting and GPU composition.

# Skipped or changed

- Rendered screenshots, overflow/zoom/font inspection, native import/export, double-click browser behavior, browser heap growth and measured FPS ≥55 remain unconfirmed. The established file preview restriction was respected. No browser was tested during this pass.
- Local save loading now repairs a lagging serial counter; strict imported saves continue to reject it. Unknown pending cards use the existing backup/recovery path. The save schema is unchanged.
- Kept the specified visible-only one-second timer and hidden-tab catch-up, and the intentional dev data warnings. These are explicitly recorded as `won't fix` in `BUGS.md`.
- Existing test assertions now use the expanded console check count. The runtime/harness expose read-only resource counts for the audit.
- No data or config values changed. Optional untracked `assets/` font files were preserved and excluded from the commit. No market, audio, variants or later-stage features added.

# Look at

- `BUGS.md` is the issue ledger and coverage/manual acceptance matrix.
- `BUG-PASS-9C-EVIDENCE.json` records the new checks and retained-resource audit; `BUG-PASS-9C-REGRESSIONS.json` records every prior suite; `BUG-PASS-9C-PROFILE.json` records host CPU samples.
- In a permitted local-file browser, prioritize modal I/ArrowUp focus, close/sort/resize mid-drag, keyboard tutorial Skip, expiry at commit, storage failures and reload recovery. Then inspect all screens at 1280×720, 1920×1080 and a narrow window at 80–150% zoom.
- Record real dev FPS and browser Performance/heap evidence before accepting the four deferred gates. The source/logic audit establishes behavior; it cannot certify material appearance or compositing.

# Open questions

- No new game-rule decisions were needed. Preserved defaults #1/#2/#4/#5/#7/#8/#12/#14/#15/#16/#19/#21: eight-hour regen, normalized chances, one card with multi-card support, fixed three-second hold, existing serial format, downgrade empty tiers, visual duplicate stacks, cap two/no banking, press-and-drag cut, standard pack, local font fallbacks and desktop scope.
- The real replacement card list remains unsupplied; this audit preserves the existing catalog.
