# Cardable desktop

The existing offline classic-script game remains the renderer. Electron owns lifecycle, the native window, validated IPC, updater, optional Discord IPC and native logs/backups. Development and packaged builds load local index.html with sandbox/context isolation on, Node integration off, a local CSP, denied child windows/permissions/webviews and restricted navigation.

Preload exposes named app, window, lifecycle, storage, logs, system, updates and discord methods. No generic IPC, filesystem API, require or process is exposed. IPC requires the app's exact top-level document; arguments are validated in the main process.

The game save stays in localStorage, schema 5. A native primary-save mirror is kept under userData/saves. A valid mirror can restore missing renderer storage before boot; corrupt/unreadable storage enters explicit recovery with retained originals. The existing Data export/import is the explicit route from a browser profile. No browser profile is read automatically. Developer sandbox saves never replace the primary native mirror. Game-created Studio scenes and progress are contained in the existing save; ordinary Chromium storage also retains workspace records.

Default Windows paths are `%APPDATA%/Cardable`, its saves folder and logs/cardable.log. Mutable data never lives in ASAR or the installation directory. NSIS retains userData during upgrade/uninstall. The installer identity must remain com.cardable.game and productName Cardable across releases.

Studio photos use Chromium IndexedDB cardable-studio/photos, not JSON/the native mirror. Download photos before changing installation directories, since file-origin storage can change. Developer mode does not imply a sandbox: ?dev=1 uses the real save unless sandbox=1 is selected explicitly.

See [BUILDING.md](BUILDING.md), [RELEASING.md](RELEASING.md), [UPDATES.md](UPDATES.md), [DISCORD_RPC.md](DISCORD_RPC.md), [ELECTRON-CHECKLIST.md](../archive/4.2.0-cleanup/docs/ELECTRON-CHECKLIST.md) and the milestone reports for tested scope and remaining acceptance.

## 4.1.0 desktop polish

The additive `Cardable.native.capture` and `.support` APIs use the same exact
main-frame sender checks as existing handlers. Captures write only generated PNG
names under Pictures/Cardable; revealing files uses bounded session IDs, not
renderer-supplied paths. Card rectangles are checked against the native content
bounds and zoom. No capture runs automatically.

Support configuration stays in desktop-release.json (`owner`, `repository`,
`updates.mode`). The approved 4.2.0 follow-up defaults to automatic installed-app
checks/downloads and save-gated installation on normal quit. Legacy link and
github-public modes retain manual behavior. All remain unconfigured until public
GitHub identifiers are supplied. Browser/development/unpacked previews perform
no scheduled checks. Renderer CSP/network isolation is unchanged. Reports/copies
exclude save contents and paths, using only structural
lifecycle log lines. The changelog is bundled into ASAR at build time.

Safe mode relaunches only after the existing save/disk handshake succeeds. The
`--safe-mode` startup flag disables hardware acceleration before app readiness;
renderer graphics overrides are Low for that session without changing the saved
preset. A normal launch removes those overrides.

Card History's existing optional save state and engine ship unchanged in Electron;
its inventory tab and Achievements switch-coordination fix are included. There
is no schema bump. Welcome/version/recent-command markers are separate local UI
preferences; commands never bypass Data preview/confirmation for save replacement.
See [4.1.0 delivery](../alpha-updates/4.1.0-desktop-qol/DELIVERY.md) for exact scope.

## 4.2.0 help, recovery and delivery

Bundled help and welcome reuse the existing Settings/palette/focus infrastructure; Start playing is direct and browser import stays optional/confirmed. Unreadable primary saves and consulted native mirrors retain their original text before replacement; pending recovery pauses writes/opening and uses explicit Data decisions. The native original archive is outside rolling backups. Startup/storage failures keep profiles and offer local save/log/Safe Mode guidance. Browser users keep meaningful JSON/help paths without mandatory native APIs.

ARCHITECTURE documents bridge, persistence and packaging routes; DESKTOP-DELIVERY describes stable origin/hashes/rollback/owned cleanup. ROADMAP and the indexed archive distinguish source, commits, packaged evidence and actual runtime acceptance. Native failure, relaunch/installer/physical-device and C reduced-motion gaps remain explicit; public release/reporting/signing is unconfigured until supplied.
