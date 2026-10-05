# Electron continuation checklist

Compared with `alpha updates/4.0.0-electron/SPEC.md` against actual source and runtime evidence on 5 October 2026. Every requirement family is grouped below; source implementation is not equated with external acceptance. See the milestone reports for evidence and limits.

## DONE

| Requirement family | Actual state |
| --- | --- |
| Existing game, compatibility inventory | Original index.html, classic scripts, namespace, assets/fonts, effects, timers and save engine retained; no framework/server or game rewrite. Browser/API/loading/storage risks documented in milestone 1 and ELECTRON.md. |
| Main architecture/lifecycle | Main/preload/IPC/services/windows separated; ready/activate/window-all-closed, native window/icon/version, single-instance restore/focus, development/production loading, bounded graceful close and crash logs. |
| Security | Node off, context isolation/sandbox/webSecurity on; narrow bridge, all seven registrars validate exact main-frame/document origin, arguments bounded/validated, child windows/webviews/permissions denied, navigation and external URLs restricted. No generic native access/tokens. Runtime tests, scoped audit, dependency and ASAR checks performed. |
| Window experience | Native controls; minimum/default 960×640/1440×900; remembered position/size/maximize/fullscreen; corrupt/offscreen recovery; F11; sizes through 3840×2160 and ultrawide exercised. |
| Renderer regression | Menu/Settings/focus, all ten packs, card effects/flip, inventory shelf/grid/sort/filter/search/pointer drag, Studio/Director, durable rewards/pending recovery, mouse/keyboard/touch/scroll/resizing/fullscreen, four graphics tiers and hidden/refill behavior. Five full High/Full/Safe rare timelines rendered and handed off correctly. Existing logic checks retained. |
| Persistence/migration | Schema 5/primary origin identity retained; atomic reservations, native userData mirror/recovery before boot, corrupt text preservation, primary-only mirror, close/update save acknowledgment and explicit browser export/import. Exact cards/serials/settings/Studio checked across restart/local NSIS update. Photo blob persistence receives separate IndexedDB checks. Mutable data is outside ASAR. |
| Development workflow | npm ci/dev/electron:dev/build/dist/test/test:electron plus packaged/regression/resource/cinematic/update tests. DevTools available only through development configuration, not auto-opened. Offline file:// browser workflow retained. |
| Updater implementation | Builder/updater, NSIS, generated GitHub provider, full states/progress/notes/retry/Later, configured background/manual checks, explicit download/restart and successful durable-flush guard. No setFeedURL/auto-install-on-quit. Real local A→B installed update exercised. |
| Release automation implementation | Tags, lockfile install, version/tag/changelog checks, tests before draft upload, NSIS/ASAR/resource/regression/hash checks; understandable installer/blockmap/channel artifacts, dedicated public release repo support, scoped secret references and stable/beta documentation. |
| RPC implementation | Main-process local IPC; optional public ID, no required credentials, default-off durable preference, absence/failure/reconnect/throttle/clear handling, private broad screens including Studio/Director, elapsed time/optional branding. Injected tests pass. |
| Desktop/logging/UX | Versions, save/log folders, diagnostics/copy/GPU/runtime info, native single-instance focus, safe links and recoverable window state. Startup wordmark/native frame retained. Startup/versions/updater/RPC/errors/crashes logged with rotation and bounded metadata, no unnecessary full URLs/player inventory. |
| Performance/release safety | Startup/FPS/process-memory observations, card-heavy virtualization, pack/cinematic/Studio/Director/window interactions; acceleration retained with no folklore flags. ASAR resources/syntax/icon/version/CSP/channel/no-fixture/developer-path checks, isolated install/update/uninstall/reinstall, local executable branding/unsigned status. |
| Documentation | ELECTRON, BUILDING, RELEASING, UPDATES, DISCORD_RPC, three milestone reports, this checklist and changelog. |

## PARTIALLY DONE

- GitHub release/updater acceptance: implemented provider/workflow; actual update tested against a local generic feed, not the owner's GitHub repository. No remote is configured.
- Live Discord: local/mock absence, reconnect, privacy and disabling verified; actual connection/branding needs the optional owner Application ID and client.
- Physical visual/performance acceptance: real packaged screenshots/interactions reviewed; automated dimensions/DPR3 are not certification of physical monitor/DPI changes, weak GPUs or high-refresh displays. Flash-meter results are not medical safety certification.

## NOT DONE

- Public CI execution/publication, trusted Windows signing/publisher verification and live Discord application setup: missing owner-controlled external configuration.
- Optional custom titlebar, Alt+Enter, protocol links and notifications: deliberately omitted as unnecessary. Native controls/F11 retained. Marketplace/audio additions remain prohibited; existing audio/music are intentionally off, not removed for Electron.

## BROKEN / UNVERIFIED

- No known reproducible serious application failure remains in the tested scope; not proof of exhaustive manual coverage of every hardware/game path.
- Production installer wizard branding, actual Desktop/Start Menu shortcuts and physical multi-monitor changes require owner review. Isolated fixture suppresses shortcuts to avoid changing the existing installation.
- Occasional Chromium `GPU state invalid after WaitForGetOffsetInRange` during successful teardown has no reproduced corresponding renderer error/reward loss.
- Milestone 1 is stabilized/committed. Achievable local Milestones 2/3 work is completed; full SPEC public-distribution acceptance stays open until external checks pass.
