# Electron Milestone 3 — hardening and release review

Local implementation/verification on 5 October 2026. This is a continuation, not a replacement game/runtime. Public-distribution acceptance remains open.

## Previous implementation and continuation

The first agent already supplied main/preload, lifecycle/window/bounds, named IPC handlers, save mirror, logger, updater/Discord scaffolding, icons, packaging and a launch test, plus unfinished desktop Settings code. The existing game was already the renderer. Continuation stabilized boot/recovery/security/close/dependencies and real development/ASAR tests, then committed Milestone 1 `6b917e4`. Milestone 2 reused Settings and finished updater/RPC/release configuration/CI/docs, committed `9917005`. No useful infrastructure was discarded or competing implementation introduced.

## Fixed/completed here

- Real Electron regression, ASAR verification, full-timeline cutscene and isolated two-version NSIS tests. Release CI runs packaged regression/resource checks before uploading a draft.
- Picker choices inherited a non-interactive opening stage; the existing option surface now enables pointer events. Real mouse selection/exact-once reward tested.
- A low-FPS suggestion could intercept Keep during a long reveal. Its existing design is retained but display is deferred to the clear menu; opening/Settings/inventory/Studio/album contexts hide it without discarding the suggestion.
- Installed app metadata synchronizes renderer version before boot; corrupt primary text is preserved before mirror recovery. Existing schema 5/encode/atomic save conventions retained.
- Idempotent updater window rebinding, disabled web installers, explicitly confirmed silent in-place NSIS upgrade (initial install remains assisted). No automatic download/install/restart.
- Bounded log metadata and protocol-only external URL logging, consistent navigation restrictions; no security relaxation.
- RPC synchronous-exception/late-client guards; existing Studio/Director enter/exit maps to private creator presence, independent of overlapping developer context.
- Existing tests repaired for current schema/provenance, retained Settings corner and renamed Flip control. Existing developer Checks wrapper correctly isolates dev clocks/save fixtures; tests not deleted.
- Smoke test now waits for asynchronous game boot/recovery instead of reading null state at did-finish-load. This was harness timing, not replacement boot logic.

## Actual verification

| Check | Evidence |
| --- | --- |
| Development/assets/services | npm test: 136 scripts + 35 styles, seven service/origin/private-presence tests, three isolated Electron launches, Standard opening/Keep, Settings/Inventory, native mirror recovery/developer workspace. |
| ASAR smoke | Same repeated launch/recovery, malformed/offscreen window state, isolation, diagnostics and invalid URL/save/RPC/install tests against the packaged executable. |
| ASAR interaction | 600 durable instances; pointer shelf drag, bounded shelf/grid, sort/filter/search, mouse/keyboard card flip; Studio load/save/exit and Director orbit/play/pause/scrub; all ten packs with exact +1 Keep; window sizes 960×640 through 3840×2160, ultrawide/F11. |
| Existing logic | Existing bug/settings/data/inventory checks, pack schedule, Picker, Journal, Achievements and Studio photo/IndexedDB checks retained and run using the developer tool wrapper. |
| Full presentation | Actual High/Full/Safe Legendary 8.6s, Mythical 27.6s, Exotic 19.3s, Ascendant 32.5s, Secret 40s, no skip/seek/time acceleration. Nonblank Canvas/WebGL scenes, correct front cards and Keep; zero app errors/game HTTP requests. Screenshots visually reviewed. |
| Browser parity | Activity, inventory-performance and graphics-refresh harnesses pass: four presets/1512 finish stacks, all five cinematic backends at four tiers, caps/hidden/unfocused/refill/DPR3 touch and reload. Opening-journey and expanded photo/file-I/O results recorded below when complete. |
| Real local installed update | A4.0.0 detects/downloads B4.0.1 from generated loopback metadata, postpones, explicitly installs/restarts, reports B and preserves exact cards/currency/settings/Studio plus byte-identical IndexedDB PNG photo; uninstall/reinstall preserves them too. Not a mocked installer or public GitHub test. |
| Package/release | NSIS/blockmap build, 171 local HTML resources/230 shipped JS+CSS checked, syntax/version/icon/CSP/channel/no-fixture/no-developer-path/credential-pattern checks; version/notes validation. Actual Authenticode NotSigned status confirmed. |
| Dependencies/security | npm audit: zero vulnerabilities. Standard audit of all 20 Electron files, independent baseline/architecture and focused imported-save/native/updater backward dataflow: no actionable findings. Not an entire renderer audit or signing guarantee. |

One otherwise-idle regression measured startup 505/460/480 ms, ~58.2 FPS at cap60, renderer working set ~295 MiB (peak~458 MiB), GPU-process working set~303 MiB. These are scoped host observations, not GPU hardware-utilization/weak-device/high-refresh certification. Hardware acceleration retained. Measurements vary with test/build contention.

The fast reward test deliberately uses Very Low/cutscenes off/reduced motion in its isolated profile. That test window is not a visual acceptance view or normal Medium fresh-save default. Full High/Safe review is separate. Menu/Settings/detail/Studio/Director/grid/ultrawide and each rare cinematic/card were inspected without replacing existing art.

## Reproduction/evidence

After npm ci and npm run dist, run npm test, test:packaged, test:package, test:regression, test:cinematics, test:nsis-update, release:validate and npm audit. Existing tools/check-activity-browser.cjs, check-inventory-performance-browser.cjs, check-graphics-refresh-browser.cjs and check-optimization-journeys-browser.cjs exercise source file://; those browser harnesses require installed Playwright Chromium. Electron tests use the bundled executable without a browser download.

qa-output contains ignored JSON/screenshots. Tests use isolated temporary profiles; the update fixture retains installers/logs/profile and prints its exact path, then uninstalls its temporary application. Its separate package identity also isolates its LOCALAPPDATA updater cache. No existing player profile/installation was used.

Security scan 525e3aed-7baa-4138-afc7-d569c8d8b8de is sealed in local Codex security state. Its snapshot predates later test/docs edits; subsequent native changes only extend fixture verification and wait for smoke boot. Normal native security boundaries are unchanged. Daybreak access was not granted; protected external visibility was not assumed. No findings is not a guarantee of absolute security.

Fresh-clone and expanded checks are appended only after actual completion; pending checks are not counted as passes.

## Remaining/manual acceptance

No Git remote/public provider is configured. Follow RELEASING.md to configure public owner/repository, push/tag, run CI and publish two reviewed releases, then run the real public GitHub A→B test. Keep installer/metadata/blockmap together. Add signing secrets and inspect generated publisherName/Authenticode; checksums alone do not independently authenticate a compromised provider.

Live Discord needs only the optional public Application ID/branding asset and installed client; test absence/restart and On→Off if enabling it. No credentials belong in game files and Discord configuration is not required for local completion.

Manually review production installer wizard/shortcuts/Start Menu/native taskbar, physical DPI/monitor changes and intended hardware. Native titlebar retained; optional protocol/notifications/Alt+Enter omitted. Marketplace/audio remain out of scope. Full public-distribution acceptance is not claimed.

Unrelated untracked future-spec directories from other work are preserved, not included in migration commits.
