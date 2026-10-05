# 4.2.0 cleanup â€” milestone D delivery

Date: 2026-10-06. Scope: SPEC.md milestone D only; A/B/C remain implemented at their recorded checkpoints. Final app version is 4.2.0, with unchanged appId, storage keys, save schema 5 and settingsVersion 2. No game rule, reward, cinematic renderer, native API, dependency or public provider is changed by D.

## Documentation and ownership

- ARCHITECTURE now routes actual browser/Electron/preload/IPC/persistence/packaging code, events/APIs, browser fallbacks and retained extension recipes.
- Designs.MD keeps its filename, leads with principles/tokens and consolidates specialized approvals; one byte-identical duplicated Stage 14 paragraph was removed. The alleged Architecture duplicate did not exist here.
- CINEMATICS consolidates current descriptor timings, registry/painter bounds, handoff/retained fields, skip/recovery, safety, reduced-motion and quality contracts. RARITY-INTROS remains a small compatibility route to the canonical doc and unaltered original.
- ROADMAP separates implementation/commit, packaging/runtime evidence and planned or deferred acceptance. STAGES preserves its old filename as read-routing compatibility.
- ACHIEVEMENTS documents the actual engine, optional state, APIs, events, UI and complete registry-derived catalog. Data-only inspection found 57 definitions, 41 initially available, six Studio/Picker definitions activated by existing publishers, and ten dormant requirements.
- Swipe/opening QoL, activity/proximity, inventory performance and graphics QA contracts are folded into the numbered/current docs with compatibility pointers. Stale template/variant, currency, selected-full-shelf and blur guidance is corrected against current behavior.
- Fixed bug/backlog narratives, historical reports/raw QA and an obsolete raw prompt are retained in the indexed archive; open evidence gates and ranked future ideas remain active. Original input plan is archived with a redirect, not executed.
- BUILDING/RELEASING/PROMPTING and PLAY separate player/developer flow, preserve actual test runners and restrict current testing. Both runtime CHANGELOG.md and CI changelog/4.2.0.md describe the same final release; package/config/root lock versions agree.

## Archive and worktree audit

[STRUCTURE-AUDIT.md](../../docs/STRUCTURE-AUDIT.md) is the keep/consolidate/archive map. [Archive index](../../archive/4.2.0-cleanup/README.md) and audit.json identify 47 moved tracked historical files plus 12 snapshots of originals: 59 records, 507,821 captured bytes, original paths/tracking/source revision and SHA-256. Scoped .gitattributes preserves archive bytes through Git checkouts. registry-snapshot.json records inspected data, not an additional game test.

The primary checkout remains in place. `alpha updates` is a junction to `alpha-updates`, verified through per-spec byte comparisons; it is retained, never traversed for destructive cleanup. Current/incoming/planned specs, especially 4.1.0/4.2.0/github-setup, stay in place. Preexisting missing 4.0.0 specs and untracked incoming material are not staged or reconstructed.

All four registered feature worktrees retain branch-only commits at the audit baseline; Card History also has modified AGENTS.md. No retirement or ordinary recursive move was performed. Ignored dependencies, outer workspace outputs/baselines and player profiles were not adopted as cleanup targets. No integration patch was reapplied. The shared checkout is not globally clean.

## Validation and local delivery

Source/document inspection passed all 59 exact archive hashes and 154 active local Markdown targets, current registered worktree state/ancestry, synchronized app/config/root-lock versions and both changelog consumers. The existing release metadata validator and config syntax/diff hygiene also passed. Generated `dist/delivery/latest.json` and `last-good.json` are authoritative for final build ID, source revision, installer/preview hashes, shortcut and cleanup. The historical preview folder name remains stable to preserve file origin.

The permitted one source-app opening used private profile `C:/Users/reset/AppData/Local/Temp/cardable-milestone-d-nNc6xX`, without dev UI. It reached the fresh welcome and Settings after Start playing. The help locator matched both the closing welcome's How to play button and Settings' button, so the interaction probe aborted before help/changelog and final console collection. This is an incomplete probe, not a passing help/changelog journey or a demonstrated product regression. No second launch was used. The retained native log confirms startup Version 4.2.0, initialized bridge, ready window and successful normal shutdown flush; it has no ERROR lines, but that does not replace the interrupted renderer-console observation. C's prior verified help/recovery session remains separate evidence.

Delivery uses the existing A tooling, Windows x64 offline NSIS/dir and publishing disabled. It does not install or launch the output. The normal NSIS player shortcut stays separate from Cardable (Latest Build). Superseded artifacts can be removed only if manifest-owned and after a validated replacement; legacy pre-manifest artifacts remain inventoried.

Testing line: documentation/source/archive-hash/reference/config inspection passed; one source-app session confirmed startup in native logs but its help/changelog/console probe was incomplete. No game logic changes require checkQol, so C's 23/23 result is not rerun or represented as a D regression result. No old suites, new test files, screenshots, recordings or profiling were used. Build/hash validation is delivery evidence rather than runtime regression.

## Remaining acceptance and external limits

The source app check does not prove packaged execution or actual installer upgrade/uninstall. Public hosting/GitHub CI/live updater, trusted signing/publisher and optional live Discord are unconfigured owner follow-ups. Installer execution, legacy custom/per-machine migration, locked-failure/interruption cases, native disk/startup recovery, Safe Mode relaunch, browser absence, real photo retention, physical device/high-refresh/thermal/GPU and broad cinematic/zoom/accessibility acceptance remain separately scoped.

C's reduced-motion emulation did not activate runtime reduced state; OS/manual On/Off behavior remains unverified. Ascendant C's one recorded playthrough does not establish every route. Secret C's setup obstruction left Safe/Full completion and live handoff acceptance pending. These gaps stay in active BUGS/ROADMAP/CINEMATICS, not buried as delivered history. D makes no 240 FPS, bug-free or warning-free installation claim.

No further cleanup milestone begins. Worktree retirement and broader acceptance need separate explicit scope; existing local delivery/documentation can complete independently of those external gaps.
