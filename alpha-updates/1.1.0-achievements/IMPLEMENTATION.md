# 1.1.0 Achievements — local implementation

Implemented on main: three deterministic weekly objectives with explicit credit claims and preserved rollover rewards; twenty auto-paying recurring definitions with retained overflow and five evolving border designs; the original capability-gated one-time catalogue reduced to single objectives with old paid receipts retained. No one-time milestone UI. Credits only; no Journal API calls; four-field achievement:unlocked bus events; optional board state under schema 5.

The native inventory tab now contains a shaded grouped sidebar, pinned section, difficulty/status filters and search, a static illustrated inspector, objective disclosures/bars, claim states, evidence-card navigation, recurring border previews and a fixed current-objective completion footer. Five original SVG illustrations ship locally. Narrow layouts use a list/detail back flow. Reduced-motion and independent graphics settings bound effects; no new timer or renderer is introduced.

Defaults: Monday 00:00 UTC weekly reset; recurring auto-claim; visible/minimized-aware time with no offline catch-up; retained legacy one-time catalogue because the owner has not supplied a replacement list. New repeatable progress starts at installation of the optional board. Weekly pins follow their slots. Complete unclaimed weekly rewards persist; incomplete ones expire.

QA references read: official Vercel web interface guidelines and Apple HIG layout, accessibility and progress guidance. Source review applies native controls, text/pattern status, predictable disclosure, 44 px controls, fixed progress placement, keyboard focus and calm policies. This does not certify the full physical accessibility/device matrix.

Testing: one file:// Chromium game session confirmed real opening/Keep progress, one-time auto-awards, pinning, milestone previews, weekly manual claim and narrow list/detail navigation with zero renderer console errors; checkQol was invoked once and stopped at a fixture payload-filter bug, corrected without rerun.

The logic check passed its earlier weekly count, single-objective, rollover/claim and recurring overflow assertions before the fixture error. Its final event-contract and legacy/deletion receipt assertions remain unaccepted. No old suites, new test files, screenshots, recordings or profiling were used. Developer progress controls supplied the otherwise long weekly completion; a whole real week was not observed. Reload/import/installer execution and physical devices remain outside this bounded session.

Package version and config remain 1.1.0. Local desktop delivery runs once after the focused commit. No GitHub publication, new worktree or save-schema change. Unrelated deletions and the website-rework spec remain untouched.
