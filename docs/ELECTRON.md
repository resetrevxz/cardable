# Cardable desktop

The existing offline classic-script game remains the renderer. Electron owns lifecycle, the native window, validated IPC, updater, optional Discord IPC and native logs/backups. Development and packaged builds load local index.html with sandbox/context isolation on, Node integration off, a local CSP, denied child windows/permissions/webviews and restricted navigation.

Preload exposes named app, window, lifecycle, storage, logs, system, updates and discord methods. No generic IPC, filesystem API, require or process is exposed. IPC requires the app's exact top-level document; arguments are validated in the main process.

The game save stays in localStorage, schema 5. A native primary-save mirror is kept under userData/saves. Missing renderer storage is restored before boot. The existing Data export/import is the explicit route from a browser profile. No browser profile is read automatically. Developer sandbox saves never replace the primary native mirror. Game-created Studio scenes and progress are contained in the existing save; ordinary Chromium storage also retains workspace records.

Default Windows paths are `%APPDATA%/Cardable`, its saves folder and logs/cardable.log. Mutable data never lives in ASAR or the installation directory. NSIS retains userData during upgrade/uninstall. The installer identity must remain com.cardable.game and productName Cardable across releases.

Studio photos use Chromium IndexedDB cardable-studio/photos, not JSON/the native mirror. Download photos before changing installation directories, since file-origin storage can change. Developer mode does not imply a sandbox: ?dev=1 uses the real save unless sandbox=1 is selected explicitly.

See [BUILDING.md](BUILDING.md), [RELEASING.md](RELEASING.md), [UPDATES.md](UPDATES.md), [DISCORD_RPC.md](DISCORD_RPC.md), [ELECTRON-CHECKLIST.md](ELECTRON-CHECKLIST.md) and the milestone reports for tested scope and remaining acceptance.
