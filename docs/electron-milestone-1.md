# Milestone 1 Documentation — Electron Foundation & Web Compatibility

## 1. Overview & Architecture

Cardable has been successfully migrated from a browser-only runtime into an Electron desktop application (version `4.0.0`) with zero feature regressions to the underlying HTML/CSS/JavaScript game. The game renderer remains completely preserved as a classic web application, while Electron provides a secure, robust native host runtime around it.

### Architecture Layout

```
cardable/
├── electron/
│   ├── main.js                  # App lifecycle, single-instance lock, window orchestration
│   ├── preload.js               # Secure contextBridge exposing window.cardableDesktop
│   ├── config/
│   │   └── desktop-config.js    # Central desktop configuration & icon paths
│   ├── windows/
│   │   ├── main-window.js       # BrowserWindow creation, security policies & lifecycle
│   │   └── window-state.js      # Multi-display bounds tracking & recovery
│   ├── logging/
│   │   └── logger.js            # Native logging to userData/logs/cardable.log
│   ├── updater/
│   │   └── auto-updater.js      # Auto-updater lifecycle & mock engine
│   ├── discord/
│   │   └── rpc.js               # Discord RPC service boundary (deferred)
│   └── ipc/
│       ├── channels.js          # Central typed IPC channel constants
│       ├── app-handlers.js      # App info, paths, quit
│       ├── window-handlers.js   # Window minimize, maximize, fullscreen, close
│       ├── system-handlers.js   # Safe URL opening, clipboard, system diagnostics
│       ├── storage-handlers.js  # Atomic userData save backup & persistence sync
│       ├── logging-handlers.js  # Renderer error forwarding to file log
│       ├── updater-handlers.js  # Update checking, downloading, installing
│       └── discord-handlers.js  # Discord presence boundary IPC
├── src/
│   └── core/
│       └── desktop.js           # Browser-safe desktop integration bridge
└── assets/
    └── icons/                   # Temporary development icon assets (PNG & multi-res ICO)
```

## 2. Files Added and Modified

### Added
- `electron/main.js`: Main process entry point.
- `electron/preload.js`: Isolated preload script using `contextBridge`.
- `electron/config/desktop-config.js`: Central desktop configuration.
- `electron/windows/main-window.js`: BrowserWindow manager with strict security policies.
- `electron/windows/window-state.js`: Display-aware window position persistence.
- `electron/logging/logger.js`: Rotating disk file logger (`userData/logs/cardable.log`).
- `electron/updater/auto-updater.js`: Update engine using `electron-updater`.
- `electron/discord/rpc.js`: Clean architectural service boundary for Discord RPC.
- `electron/ipc/*.js`: IPC handlers for app, window, system, storage, logging, updater, discord.
- `src/core/desktop.js`: Renderer desktop bridge that connects to `window.cardableDesktop` if available and safely no-ops in standard browsers.
- `assets/icons/`: Generated multi-resolution `icon.ico`, `icon.png` (512x512), and scaled PNGs.
- `tools/generate-icons.cjs`: Reproducible icon generator using Chrome headless.
- `tools/test-electron.cjs`: Automated smoke test harness for development and packaged builds.
- `tools/verify-assets.cjs`: Asset and link integrity validator.

### Modified
- `index.html`: Added `<script src="src/core/desktop.js"></script>` to connect the renderer bridge.
- `src/config.js`: Updated version to `4.0.0`.
- `package.json`: Configured Electron build targets, dependencies (`electron`, `electron-builder`, `electron-updater`), scripts, and NSIS installer definitions.

## 3. APIs Exposed Through Preload

Strict context isolation is enforced. Neither `require` nor `ipcRenderer` is exposed to renderer scripts. Only typed methods are exposed under `window.cardableDesktop`:

- `cardableDesktop.isDesktop`: `true`
- `cardableDesktop.app`:
  - `getInfo()`: `{ name, version, electronVersion, chromeVersion, nodeVersion, isPackaged, platform, arch }`
  - `getPaths()`: `{ userData, logs, appPath }`
  - `quit()`: Closes the application.
- `cardableDesktop.window`:
  - `minimize()`: Minimizes the window.
  - `maximize()`: Toggles window maximization.
  - `restore()`: Restores maximized window.
  - `isMaximized()`: Returns boolean.
  - `close()`: Closes window with graceful cleanup.
  - `toggleFullscreen()`: Toggles F11 fullscreen.
  - `isFullscreen()`: Returns fullscreen state.
- `cardableDesktop.system`:
  - `openExternal(url)`: Safely opens http/https/mailto URLs in user's default browser after validation.
  - `getDiagnostics()`: Returns detailed system, CPU, memory, OS, and GPU feature info.
  - `copyText(text)`: Writes validated text to system clipboard.
- `cardableDesktop.storage`:
  - `backupSave(json)`: Atomically writes save payload to `userData/saves/cardable-desktop-save.json`.
  - `getBackup()`: Retrieves the disk backup payload if available.
  - `openSaveDir()`: Opens the user's save directory in Windows Explorer.
- `cardableDesktop.logs`:
  - `write(level, message, meta)`: Appends renderer log events to the native file log.
  - `getPath()`: Returns absolute log file path.
  - `openDir()`: Opens the log folder in Explorer.
- `cardableDesktop.updates`:
  - `check(isManual)`: Triggers update check.
  - `download()`: Downloads available update.
  - `install()`: Quits and applies downloaded update.
  - `getState()`: Returns current updater lifecycle state.
  - `onStateChange(cb)`: Subscribes to updater state transitions.
- `cardableDesktop.discord`:
  - `setPresence(presence)`: Calls Discord RPC service boundary.
  - `clearPresence()`: Clears presence.
  - `getStatus()`: Returns service status (reporting deferred state).

## 4. Storage Decisions & Double-Persistence

To ensure user data is never lost, wiped, or affected by origin isolation changes under Electron:
1. **Primary Persistence:** Cardable continues to use its fast, synchronous in-memory state and origin `localStorage` under `cardable.save`.
2. **Secondary / Native Anchor:** Every `save:written` event is mirrored asynchronously to `userData/saves/cardable-desktop-save.json` using atomic temporary file writes.
3. **Rolling Backups:** The desktop layer automatically retains up to 5 historical timestamped backups in `userData/saves/backups/`.
4. **Crash / Origin Migration Recovery:** On launch, if `localStorage` has no existing save, the desktop bridge automatically queries `userData/saves/cardable-desktop-save.json` and restores the save.
5. **Packaged Safety:** User saves are strictly written to `%APPDATA%\Cardable\saves`, completely separate from application installation files and ASAR packages.

## 5. Security Decisions

1. `nodeIntegration: false`: Renderer has zero Node.js runtime access.
2. `contextIsolation: true`: Renderer DOM context is isolated from preload execution context.
3. `sandbox: true`: Chromium renderer sandbox is active.
4. `webSecurity: true`: Same-origin policy and standard web security remain fully enabled.
5. Navigation restrictions: `will-navigate` blocks all out-of-application navigation; external links are directed to `shell.openExternal`.
6. Child window restriction: `setWindowOpenHandler` blocks new window creation (`action: 'deny'`).
7. IPC argument validation: All IPC calls validate argument types and bounds.
8. Zero packaged secrets: No GitHub tokens or private keys exist in the codebase.

## 6. Verification and Testing Performed

1. **Asset Integrity Test:** Verified all 135 script tags and 35 stylesheets load without missing files.
2. **Syntax Validation:** All JavaScript files in `src/` and `electron/` syntax-checked cleanly.
3. **Development Launch:** Verified `npm run electron:dev` and `tools/test-electron.cjs`.
   - Result: `SMOKE_TEST_SUCCESS`, `hasCardableDesktop: true`, `hasCardable: true`, `hasState: true`, `cardableVersion: '4.0.0'`.
4. **Packaged Build Execution:** Packaged unpacked binary via `npm run build` (`dist/win-unpacked/Cardable.exe`).
   - Ran `dist/win-unpacked/Cardable.exe --smoke-test`.
   - Result: Packaged application launched, verified preload bridge, created backup save, and exited with code 0 (`SMOKE_TEST_SUCCESS`).
5. **Persistence Verification:** Confirmed `cardable-desktop-save.json` is created in `%APPDATA%\Cardable\saves\`.
6. **Logging Verification:** Confirmed native logging in `%APPDATA%\Cardable\logs\cardable.log`.

## 7. Remaining Issues

None for Milestone 1. The application foundation is verified and stable. Milestone 2 platform features (in-game update UI, installer packaging, release pipelines, diagnostics UI) follow next.
