# One Cardable - 1.2.0 Part 2

Implemented in the `update-1.2.0` worktree, with checkpoint 1 at `29ede08` (stage 34) and the screen migration checkpoint at stage 35. The app remains **1.1.0** and save schema **5**; the update is under **Unreleased (1.2.0)**.

## Scope and source

The owner clarified that One Cardable Part 2 is the intended update. The incoming paths are swapped: `alpha-updates/update1.2.0-part3/SPEC.md` contains this brief; the part2 path contains Controls. Controls and rebinding are deferred. The referenced `alpha-updates/1.2.0-PLAN.md` is absent; no substitute plan or release version was invented.

Read AGENTS, Designs and related architecture/settings/inventory/achievement/studio/desktop guidance, then audited 144 UI/style files before building. The inventory is in `one-cardable-ui-audit.json`. Official Vercel Web Interface Guidelines and Apple HIG Color, Motion and Accessibility informed semantic states, predictable controls, focus and motion rules. The owner's explicit color instruction supersedes the brief's monochrome default: normal chrome uses restrained semantic accents; saved monochrome neutralizes those accents.

## Implementation

- Designs is an eleven-section rulebook with retained valid artwork/history guidance in an appendix. AGENTS and the PR template carry the ten-item UI checklist.
- The classic-script kit supplies tokens, shared control/surface skins, sprite icons, creation/mounting, modal presentation, focus/keyboard behavior, confirmation, progress/loaders, help, six hover behaviors and silent `ui:*` event hooks.
- Eighteen one-off UI stylesheets moved into kit component styles; their paths and centralized values are recorded in `one-cardable-style-migration.json`. Artwork, pack, cinematic and independent graphics-policy styles retain their existing contracts.
- Settings has schema-derived groups/rows, search/highlights, changed markers and resets, section restore with Undo, deep links, an Advanced scaffold and a pinned preview. Data/About remain working routes; their destructive/import safeguards are retained.
- Achievements has a progress hero, next-up suggestions, distinct deterministic SVG emblems, tiles/detail inspector and the shared unlock toast. Inventory captions and tag geometry use the shared type/state rules.
- Structured `src/data/patchnotes.js` drives the timeline/search/copy/feature links and `scripts/gen-changelog.js`. The local authored SVG highlight is an illustration, not a game capture. Known dates come from existing release-tag dates; older missing dates are labelled honestly. The native legacy popup delegates to the same once-per-version reader.
- Mini keeps the real pack skins in a separate page with coalesced IPC updates capped near 30 Hz, latest-state catch-up after hiding, stock/countdown/open, custom drag, per-display positions, separate pin/opacity preferences, a kit menu and double-click expansion. Sender/frame checks and bounded values guard its IPC.
- Art and asset loaders have real completed-item counts and an eight-second presentation deadline. Studio/cinematic groups use rings. No input wait or reward/timing gate was added.
- Detail, menu/opening/tutorial chrome, performance overlays, Director panels/library/timeline/dialogs, developer controls, help/credits and native-facing Data/welcome/away surfaces share the kit. Pack and cinematic artwork was preserved.

## Progress counter

`lint-ui.js` is a progress counter, not a pass/fail suite. Its corrected easing matcher excludes token references. The same counter reads the initial `fb858c1` styles with `--ref` and the final files; JSON reports include per-file figures.

| Category | Whole source before | Whole source after | Migrated 18 files before | Kit after |
| --- | ---: | ---: | ---: | ---: |
| Hard-coded colors | 1450 | 1117 | 333 | 0 |
| Durations | 31 | 0 | 31 | 0 |
| Easings | 0 | 0 | 0 | 0 |
| Radii | 171 | 65 | 106 | 0 |
| Layers | 99 | 39 | 60 | 0 |
| Shadows | 119 | 88 | 31 | 0 |

Remaining whole-source counts primarily belong to authored card/pack/film materials and the graphics-policy bridge. Computed values, inherited geometry and inline styles require human review; a zero kit count is not an accessibility/performance certification.

## Actual review and limits

An isolated offline Chrome session used the real entry point and a separate Mini page with an IPC stand-in. A first startup helper had to be replaced when its input channel closed; the actual review session used reloads to validate repairs. No old suites, new test files, game screenshots, recordings or profiling were used.

Observed: gallery at all four tiers and both densities, reduced motion, eight state previews, confirmation/toast/error examples, and a real modal with Escape/focus restoration; Settings search, live normal/mono, change markers, row reset, section restore, Advanced and a focused `fpsLimit` link; Data/About/credits/help; patch-note search/copy/keyboard/date/highlight; inventory captions and the Achievements board/detail; card detail and Inspect; all six Pro pages (Set, Light, Camera, Animate, Look, Deliver) and Director/timeline controls; menu context and opening Help; tutorial replay/dismissal; developer controls; Simple performance presentation and Advanced markup with instrumentation kept off. Mini showed Standard/Royal skins, stock, ready/waiting, disabled Open, mono, Help, pin/opacity messages and double-click restore.

The walkthrough exposed and repaired: old/new gallery route overlap, missing Help accessible names, main Help placement, a loader caption/ring conflict, an old direct-SVG-path flip mutation, hidden command-palette content falsely blocking context menus, and Data actions needing the new group route. One caught gallery caption error occurred during repair; subsequent source reloads and the repaired flow reported no new page/console errors. Locator/interaction mistakes were corrected separately and are not claimed as game faults.

All 39 changed/new JavaScript files passed syntax checks; root/Mini local HTML references resolved; generated changelog and focused Git whitespace checks passed. Gallery/state observations and DOM geometry do not replace visual/device/accessibility certification.

Not exercised: an installed-app upgrade, actual native Mini drag/pin/opacity/multi-monitor/occlusion, forced slow/missing asset paths, every rarity/finish/film, photos/recording/export, destructive Data replacement, or hardware performance. Native welcome/import/backups/away paths were source-reviewed and share the same skins; their full OS-backed paths remain manual acceptance. No public release is made while this four-part update holds the app version.

## Local delivery

After integrating the reviewed checkpoints, run the mandatory local desktop delivery once from the primary checkout. Its `dist/delivery/latest.json` records the actual build ID, source revision/fingerprint, validated installer, stable Latest Build shortcut, cleanup and handoff state. Delivery neither installs nor launches Cardable; the final response reports its actual outcome.
