# Cardable 4.2.0 — Electron Delivery, Friendly Setup & Safe Cleanup

> Status: revised specification only. Milestones A–D are planned, not implemented by this revision.
> Audit: 2026-10-05; primary checkout D:/CardableV2/cardable-spec/cardable; branch main; baseline f4d746a.
> Current package version: 4.1.0. Do not mark 4.2.0 shipped before implementation and delivery finish.
> Historical input: [ORIGINAL-PLAN-v2.md](ORIGINAL-PLAN-v2.md). Retained for traceability, NOT execution.

## 1. Outcome and boundaries

A new Windows player downloads one offline installer, runs it and plays from a
normal desktop/Start Menu shortcut. No Node.js, npm, terminal, source checkout,
Discord Application ID, GitHub login or account setup is required to play.

After completed change prompts, development should automatically deliver a fresh
installer and one usable app shortcut. Remove superseded local delivery only
after successful replacement; never destroy the working build, installed app,
player data or a running process to make cleanup succeed.

This is a continuation, not another Electron migration. Reuse existing main,
preload/contextBridge, registered IPC, native bridge, settings, palette, quality
tiers, history, window, logging, storage and updater infrastructure. Finish gaps
rather than introduce competing services.

Keep the browser version working via file://, classic scripts and window.Cardable.
No new libraries, palette colors, sound, market, gameplay rules, save/settings
schema bump or mandatory external credentials. Preserve approved existing
design exceptions, reduced motion and exact-once opening/reward/recovery rules.

Do A, B, C, D in order, only as authorized by the current prompt. Commit focused
changes at clean milestone boundaries; list exact unfinished work. The present
spec-only revision does not build, install, publish, create automation or delete
anything. Milestone A must exist before promising future automatic delivery.

## 2. Actual baseline — do not restart completed work

Source presence, commits, packaging and runtime acceptance are different evidence.
The original claim that all branches/features are fully delivered is withdrawn.
Recheck the checkout, source and relevant delivery records before implementation.

| Area | Verified baseline at audit | 4.2.0 implication |
|---|---|---|
| Repository | Primary checkout is on main; other feature directories are registered Git worktrees | Do not relocate the primary repo or treat worktrees as junk |
| Electron 4.0.0 | Main/preload/IPC, storage/system/logging, lifecycle/windows, update and optional Discord services exist; milestone 1/2/3 commits are on main | Continue these boundaries; no reimplementation |
| Desktop 4.1.0 | A/B/C/D commits: 28b3bad, 06da695, 3e9c208, f4d746a | Reuse scale, Mini/taskbar/window life, palette, shortcuts and friendly UI |
| Card History | Existing history engine and inventory History tab, including Achievements coordination, are in desktop source | Include in packaged delivery; no history rewrite |
| Browser | index.html, classic scripts and guarded Cardable.native integration remain | Native-absent browser fallbacks must survive |
| Onboarding/help | Welcome/import guidance, changelog/version, away summary, diagnostics, safe-mode and release/reporting boundaries exist | Improve gaps, not duplicate panels |
| Persistence | Renderer state plus native atomic JSON mirror under userData/saves; rolling backups exist | Preserve identity, recovery and backup behavior |
| Studio photos | src/studio/album.js uses IndexedDB; JSON save exports do not include photo blobs | Preserve storage origin and explain separate photo export |
| Packaging | Windows x64 NSIS + unpacked targets; appId com.cardable.game; desktop/Start Menu shortcuts enabled | Simplify installation; add safe artifact replacement |
| Distribution | 4.1.0 DELIVERY reports a successful separate output after default-output EBUSY | Never overwrite/force-close a running unpacked build |
| GitHub | Release workflow and updater scaffolding exist; owner/repository are null; no Git remote at audit | Public hosting/signing/live updates remain deferred |
| Acceptance | 4.1.0 DELIVERY records one app session, checkQol 18/18 and no observed renderer console errors | Not proof of full packaged or hardware regression |
| Unverified | Delivery lists hardware, captures, safe-mode relaunch, real file drop, packaged execution/signature and logger EPIPE guard limitations | Carry these gaps forward honestly |

Source routing:

- Electron: electron/main.js, electron/preload.js, electron/ipc/,
  electron/windows/, electron/native/, electron/logging/, electron/updater/,
  electron/discord/.
- State/bridge: src/core/desktop.js, src/core/state.js,
  electron/ipc/storage-handlers.js, src/studio/album.js.
- Desktop UX: src/core/qol.js, src/ui/desktop-tools.js,
  src/ui/desktop-friendly.js, src/ui/settings-desktop.js,
  src/data/desktop-settings.js, src/ui/preferences.js.
- Build/release: package.json, package-lock.json, electron-builder.config.cjs,
  desktop-release.json, .github/workflows/release.yml, docs/BUILDING.md,
  docs/RELEASING.md, CHANGELOG.md and changelog/.

Do not infer branch ancestry or acceptance just because a feature appears in
source. Audit source, history, dirty files and outstanding delivery independently.
Older cutscene folders do not establish whether later stages are missing or
runtime-accepted. Do not replace existing cinematics as part of doc cleanup.

## 3. External facts checked against official documentation

- Electron includes its runtime for players; installing Node.js/npm is a
  development prerequisite, not player setup.
  [Electron prerequisites](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites).
- NSIS supports one-click per-user installation, desktop/Start Menu shortcuts
  and launch-after-finish. The desktop shortcut option "always" recreates it on
  reinstall. Stable appId preserves installer identity. Keep bundled nsis rather
  than nsis-web, which downloads packages.
  [electron-builder v26 NSIS](https://www.electron.build/v26/docs/nsis/).
- Packaging, signing and public hosting are separate. Do not promise a verified
  publisher or warning-free Windows installation from a build log.
  [Electron distribution](https://www.electronjs.org/docs/latest/tutorial/distribution-overview).

Windows x64 is the supported deliverable for this update; other platforms are
not implied. GitHub remains unconfigured until the later update already
requested by the owner. Signing certificates and a public download URL are
external follow-ups, not prerequisites for completing local delivery.

## 4. Safety and ownership

1. Read AGENTS.md, Designs.MD, relevant stage/area docs and OPEN-QUESTIONS.
   Preserve architecture and design contracts; no arbitrary filename/line-count
   target justifies losing requirements.
2. Keep appId, userData, storage keys, player identity and save/settings schema
   unchanged. Preserve pendingReveal, recovery and exact-once rewards.
3. Never silently switch storage origin or preview directory. JSON export does
   not migrate Studio photos. Before a necessary transition, provide save export
   and photo download guidance; stop that transition if preservation is unresolved.
4. Do not silently install, elevate privileges, publish, force-kill Cardable or
   clear a profile. A locked file is a deferred handoff, not deletion authority.
5. Never recursively move/delete a workspace, .git, assets, dependencies, userData,
   saves, logs, photos, installed app or unrelated Desktop/download files.
6. Cleanup only exact manifest-owned superseded installers/blockmaps/shortcuts/
   build outputs after replacement succeeds. Reject path escapes, symlinks,
   junctions and reparse points. Validate absolute paths and targets before removal.
7. Do not prune published releases or orphan active latest.yml/blockmap pairs.
   Local delivery cleanup is separate from installer-managed application upgrades.
8. Inspect and stage only the milestone's files. No blind git add -A in the dirty
   shared checkout; preserve incoming specs, deletions and unrelated edits.
9. Archive evidence with provenance instead of destroying it. Deferred/manual
   acceptance stays visible; fixed source does not automatically mean tested.
10. Document external/optional blockers and continue independent authorized work.

## 5. Milestone A — Automatic local delivery, safely

### A1. One command

Add one documented command, e.g. npm run deliver:desktop, using existing
Node/Electron tooling and Windows shortcut facilities; no new library.

- Resolve the actual repo root; lock against concurrent delivery with safe stale
  lock handling. No renderer-facing API for building installers or managing links.
- Build a fresh Windows x64 offline NSIS installer and unpacked app, publishing
  disabled, in an owned staging directory. A running old unpacked app must not
  corrupt the new build. Never force it closed.
- Validate installer/executable/resources/app.asar and required bundled files,
  version/source identity, sizes and SHA-256 before handoff. Include desktop
  scripts, Card History and bundled changelog.
- Record build ID, version, source revision and dirty-source fingerprint, hashes,
  owned paths, shortcut target and pending cleanup in a delivery manifest.
  This metadata is not a game save change; keep personal paths out of public
  release metadata.
- Promote latest installer/pointer transactionally only after validation.
  Preserve the last-good manifest, installer and shortcut on failure/interruption.
  A manifest may not advertise partially copied files.

### A2. Shortcut and old-build lifecycle

Two destinations, accurately labeled:

- Installed player app: NSIS upgrades the existing stable installation and
  creates/refreshes Cardable desktop and Start Menu app shortcuts.
- Local preview: one Cardable (Latest Build) shortcut to a stable preview path
  and entry URL. It launches the app, not npm, a terminal or an installer disguised
  as the game. Do not overwrite the separate installed-app shortcut.

Build first, then promote preview and refresh its shortcut. If the old preview
is running/locked, keep its working shortcut and the new validated installer,
mark preview promotion pending and ask the user to close the old app normally.
Never silently redirect to another file-origin location.

After installer AND requested shortcut handoff succeed, prune old manifest-owned
installer/blockmap/preview outputs when safe. Keep rollback until promotion
commits. Locked old artifacts remain with an explicit pending-cleanup record.
Repeated runs converge to one current installer and one preview shortcut.

For pre-manifest legacy builds/links, enumerate exact paths and link targets
first; adopt only verified artifacts owned by this checkout, with a recorded
list. No broad Cardable*.exe/.lnk deletion. Record what was removed, what remains
and whether/how it can be recovered.

### A3. After-prompt protocol

Persist this instruction in AGENTS.md and docs/PROMPTING.md when A is implemented:

- At the end of each completed change/implementation prompt, including approved
  docs changes, run delivery once and report installer, shortcut and cleanup.
- Read-only questions/status requests and internal agent steps do not rebuild.
  An explicit user instruction to skip/narrow delivery takes precedence.
- This is a completion protocol plus command, not an OS/chat event hook.
  Do not create cron, a polling service or a background watcher.
- Report failures honestly and retain last-good output. Budget limits never
  justify deleting old delivery before replacement exists.
- Do not bump app version on every prompt; distinguish builds using build identity.
- Do not automatically install or launch an app from the delivery command.

Acceptance: repeatable command; safe failed/interrupted/locked-app handoff;
shortcut targets the actual app; only owned old artifacts are removed.
Document which paths were exercised under the testing policy.

## 6. Milestone B — Download, install, play

### B1. Simpler existing NSIS installer

Use existing electron-builder config, not a competing/custom installer.

- Default one-click per-user installation with no directory/all-users choice;
  ordinary fresh per-user setup should not need administrator rights.
- Desired explicit options: oneClick true, perMachine false,
  allowToChangeInstallationDirectory false, createDesktopShortcut "always",
  createStartMenuShortcut true, runAfterFinish true,
  deleteAppDataOnUninstall false. Verify support against the installed builder.
- Retain stable appId com.cardable.game, icon, normal product name, offline nsis
  target and bundled assets/fonts/vendor content.
- Preserve existing installs during upgrade; audit older per-machine/custom-path
  installations instead of assuming they migrate automatically.
- Update/uninstall must not silently delete saves, photos or settings.
  Keep separately confirmed in-game reset separate from installer cleanup.
- If upgrading requires closing the app, give clear guidance and preserve data;
  never force-terminate it behind the user's back.

### B2. Player guide, separate from developer setup

Add a short README/PLAY guide with:

1. Download Cardable-Setup-X.Y.Z.exe from the real configured source when it
   exists. Until then explain a locally supplied installer; no invented URL.
2. Run it. Cardable opens and creates normal shortcuts. No unzip/npm/Node steps.
3. Play offline; progress saves locally. Explain export, restore and separate
   Studio-photo downloads.

State Windows x64 support, current version, actual artifact-derived approximate
size and verified signature/publisher status. Do not invent hardware minima,
antivirus approval or warning-free installation. Explain unsigned-build warnings
without advising users to disable security software.

Include concise help for a locked upgrade and missing saves, without wiping the
profile. Keep npm ci/build in BUILDING, publishing/signing in RELEASING.
Preserve paired release assets and updater scaffolding. No account or Discord
credentials belong in onboarding.

Acceptance: player flow requires no terminal/developer dependencies; installer
options are explicit; updates are not a fresh-profile switch; external hosting/
signing limits are stated.

## 7. Milestone C — Helpful first run, recovery and discoverability

Build on existing welcome/tutorial/settings/palette/support infrastructure.

- First run: clear Start playing and optional Import browser save actions.
  Import uses existing preview/confirm; never auto-overwrites progress.
  Returning users are not repeatedly interrupted by setup.
- Three short lines explain local saving/backups and separate photo downloads.
  Offer Export save/Open saves folder through existing secure commands/handlers.
- Add locally bundled How to play / Desktop help via Settings and the existing
  palette: open a pack, Keep, find cards/History, shortcuts, export/restore,
  quality/safe-mode and install/update. No network/dev menu needed for help.
- Browser users get meaningful fallbacks or hidden native-only actions; no silent
  dead buttons or mandatory native bridge.
- Reuse safe-mode, diagnostics and logs. On actual startup/storage failures show
  plain recovery actions; preserve corrupt/original data, never silently reset it.
- Keep release/reporting truthfully unconfigured until GitHub is supplied.
  No broken download/report link or login prompt.
- Respect saved quality and reduced motion; lower tiers still have understandable
  reveal/Keep/History states. Explain temporary safe-mode overrides; no surprise
  permanent downgrade, profiling loop or full-fidelity-at-every-tier promise.
- Keep dev tools out of normal UI; use existing monochrome styles, keyboard
  focus and dismissible help. No duplicate palette or new color system.

Acceptance: new users can reach gameplay and recovery without developer tools;
returning users are not re-onboarded; History stays accessible; native absence,
unconfigured releases and storage failure have clear outcomes.

## 8. Milestone D — Documentation and safe structure cleanup

### D1. Audit, don't assume

Produce a keep/consolidate/archive map with references, tracking, dirty state,
branch ancestry and unresolved acceptance. Original file counts/sizes, line
numbers and achievement totals are not verified current facts.

The primary checkout NEVER moves. achievements-ab, card-history-work,
inspect-director-work and picker-pack-work are registered Git worktrees, not
disposable copies. Retirement needs a separate dirty/untracked/unmerged audit
and explicit approval, then Git-aware or managed archival. Never move a worktree
inside another repository or use ordinary recursive folder moves for it.

Compare space-named "alpha updates" and hyphenated alpha-updates before any
consolidation; similar names do not prove identical content. Preserve incoming,
active and planned specs, especially 4.1.0, 4.2.0 and github-setup.
Do not archive unfinished updates as delivered.

### D2. Consolidate without losing contracts

- ARCHITECTURE: actual duplicate removal plus Electron/preload/IPC/persistence/
  packaging routes, events/APIs, extension recipes and browser fallbacks.
- Designs.MD: principles first, verified duplication removed, existing approved
  palette exceptions consolidated. Keep the established filename unless every
  reference is audited; don't rename merely for aesthetics.
- CINEMATICS: consolidate RARITY-INTROS timing, renderer registry, retained fields,
  skip/recovery, Safe/Full, reduced-motion/quality contracts. Keep archival
  originals/redirects. Commits alone do not prove cutscene acceptance.
- ROADMAP: distinguish implemented, committed, packaged, runtime-verified and
  planned; include 4.0.0/4.1.0/4.2.0. If STAGES is consolidated, retain read
  routing/redirect and ongoing acceptance instead of erasing its contracts.
- ACHIEVEMENTS: promote actual engine/catalog/UI/optional-state contracts.
  Derive catalog counts from current registry, not the old spec.
- Consolidate CUT-SWIPE and OPENING-QOL into 04-PACK-OPENING, IDLE-ACTIVITY into
  05-MAIN-MENU, INVENTORY-PERFORMANCE into 06-INVENTORY, GRAPHICS-QA into
  GRAPHICS-UPDATE only after preserving unique rules and verification limits.
- BUGS/POLISH-BACKLOG: archive fixed history with provenance; retain actual
  deferred/manual acceptance and blockers in active guidance.
- Preserve numbered gameplay docs, OPEN-QUESTIONS, VARIANTS-AND-TAGS and desktop
  BUILDING/RELEASING. Correct stale variant/template warnings against approved
  current behavior, not from guesses.
- PROMPTING: concise read routing, continuation, dirty-tree, testing, delivery and
  archive policies. Archive means not loaded by default, not forbidden to
  consult. Do not claim no test runner exists.

Archive historical reports, raw QA JSON, old prompts and superseded specs with
an index recording original paths, purpose and unresolved limits. Remove active
references only after consolidation and reference checking; do not delete
evidence as "noise". Deletions require exact ownership and recoverability.

### D3. Final layout and delivery

Retain AGENTS.md, Designs.MD, index.html, src/, assets/, vendor/, electron/,
tools/, tests/, package.json, package-lock.json, electron-builder.config.cjs,
desktop-release.json, .github/, LICENSE, CHANGELOG.md, changelog/, current
alpha-updates/, docs/ and indexed archive/. dist/ is generated/ignored, not
source or a player-data directory.

Do not delete dependencies, tests, release workflow, license or lockfiles because
the old proposed tree omitted them. Use existing packaging allowlists to exclude
developer evidence from the shipped app; derive size claims from real artifacts.

Search for broken references after doc consolidation. Keep both release-note
consumers consistent: runtime bundles CHANGELOG.md; CI expects versioned
changelog notes. Preserve any redirect needed by older prompts.

When authorized milestones finish, synchronize existing version sources and
release notes for 4.2.0, rebuild through A, commit focused changes, and report
leftover artifacts, acceptance gaps, worktrees, hosting/signing and manual
actions. A shared dirty checkout must not be reported globally clean.

## 9. Testing policy and honest acceptance

The owner's restricted policy overrides older instructions: no old suites, new
test files, screenshots, recordings or profiling. Do not run npm test or existing
packaged/NSIS/regression/cinematics harnesses under this policy.

Do not add a second dev check. Reuse Cardable.dev.checkQol() only when relevant
logic changes; extend that same small named check only as necessary and run once
at the end of the last milestone completed in the run, never automatically.
Ask for separate authorization if broader coverage is needed.

Otherwise open the app once, confirm the changed feature and console, then stop.
Build/hash/config validation is delivery validation, not runtime regression.
Installer execution/relaunch/upgrade, hardware and browser regression remain
explicitly unverified unless separately authorized.

For this spec-only revision: repository/docs and official-source inspection plus
Markdown/diff hygiene only; no app launch, installer build or game tests.
Each report has one testing line naming actual evidence and limits.
Use AGENTS headings: Done, Skipped or changed, Look at, Open questions.

## 10. Deferred requirements and non-goals

- Owner supplies public repository/download URL and signing credentials later;
  real publishing, issue submission and live updater acceptance remain deferred.
- Other platforms, controllers, telemetry, cloud accounts/saves, online gameplay,
  new audio and major cutscene/renderer work are outside this update.
- External-worktree retirement requires separate explicit approval.
- Existing unverified desktop paths stay listed; they do not block independent
  local delivery, documentation or help work.
- Broader regression/security/performance work needs an authorized testing policy.

Completion is a safe local Windows delivery and clear beginner flow with truthful
acceptance/external limits—not invented public availability or destroyed history.
