# Electron Milestone 1 — foundation and compatibility

Status: completed on 5 October 2026. This document records the tested scope of Milestone 1. The updater, GitHub release pipeline, Discord connection, desktop settings surface, installed NSIS experience, and two-version update test belong to Milestones 2 and 3.

## Architecture

`index.html` remains the game renderer. It still loads local classic scripts into `window.Cardable`, runs from `file://`, and does not require a development server or runtime network access. `electron/main.js` owns application lifecycle, the single-instance lock, native window, IPC registration, logging, and existing updater/Discord service boundaries. `electron/preload.js` exposes only named desktop functions under `window.cardableDesktop`; renderer Node integration is off, context isolation and sandbox are on, and `webSecurity` remains enabled.

The files added by the first Electron pass are `electron/main.js`, `electron/preload.js`, `electron/config/desktop-config.js`, `electron/windows/*`, `electron/ipc/*`, `electron/logging/logger.js`, `electron/updater/auto-updater.js`, `electron/discord/rpc.js`, `src/core/desktop.js`, `tools/test-electron.cjs`, and the icon assets. The continuation added `electron/ipc/security.js` and `electron/lifecycle/graceful-shutdown.js`, then repaired the existing files rather than introducing another runtime layer.

## Compatibility risks and decisions

- Cardable uses synchronous `localStorage` writes for atomic pack reservation and Keep. The primary save remains `cardable.save` in the Electron renderer's `file://` origin. The desktop bridge mirrors that save into Electron's `userData/saves` directory and recovers it **before** game boot if renderer storage is absent. The save schema remains version 5.
- Save import/export, drag and drop, card rendering, Canvas/WebGL, animation clocks, keyboard and pointer handling, the conditional developer workspace, and local assets remain in the original renderer. No game logic was moved into Electron.
- The development workspace can switch storage contexts; native backup is restricted to the primary `cardable.save` context so a developer sandbox cannot replace the real backup.
- `index.html` has a local resource CSP. Main process navigation permits the app document and rejects other local files and child windows. External HTTP(S) and mail links are validated before opening in the system browser. IPC handlers validate the sender against the app's main document. Renderer permissions and webviews are denied.
- The native window keeps a 960×640 minimum, defaults to 1440×900, remembers bounds and display state, and repairs corrupt or offscreen settings. F11 toggles fullscreen. Development DevTools remain available by shortcut and do not auto-open in production.

## Desktop bridge and storage

Preload exposes named `app`, `window`, `system`, `storage`, `logs`, `updates`, `discord`, and `lifecycle` methods. It does not expose `ipcRenderer`, generic IPC, `require`, or filesystem operations. The lifecycle methods request a renderer save flush and acknowledge it before normal window close; the main process has a bounded timeout if the renderer is unresponsive.

The primary renderer save is localStorage. A secondary native copy is written atomically to `%APPDATA%\Cardable\saves\cardable-desktop-save.json`, with a bounded backup history. Window state and logs also live under Electron `userData`, not packaged resources. A missing renderer save is recovered from the native copy before `C.state.load()` and before timers, inventory, or tutorial initialize. Existing browser `file://` storage is path scoped and is not automatically imported from an unrelated browser profile; Settings → Data → Import save remains the explicit migration route for such a profile.

## Verification performed

- `npm ci` and `npm test`: exact dependencies, asset references and three Electron development launches. The isolated profile seeds a save, opens/cuts/keeps a Standard pack, opens Settings and Inventory, confirms no renderer `require` or `process`, closes through the save handshake, clears renderer localStorage, relaunches, and verifies card/currency recovery from native backup. The third launch initializes the conditional developer workspace and runs its Picker logic check. The project postinstall explicitly downloads Electron's binary so a fresh dependency install is runnable.
- `npm run build` and `npm run test:packaged`: the same three-launch flow against `dist/win-unpacked/Cardable.exe` from an ASAR package. A deliberately malformed/offscreen window-state file is repaired before launch.
- `npm audit --audit-level=moderate`: zero reported vulnerabilities after updating Electron, electron-builder, and electron-updater. The bundled Electron runtime is 44.5.1 in the tested build.
- Existing browser graphics regression: four presets, five cinematic renderers at each tier, FPS caps, hidden/unfocused policy, DPR3 touch opening, exact-once Keep, and reload persistence passed with no application errors or HTTP requests.
- A visible packaged review at 1440×900 confirmed the native frame, icon, pack composition, tutorial, inventory edge, version marker, and monochrome presentation. No player data was changed during that review.

Two older browser harnesses did not complete: the activity harness expected the settings corner to fade at a pointer location where it stayed visible, and the inventory performance harness timed out looking for the removed `.detail-flip` selector. They are recorded as legacy harness drift, not as passing compatibility evidence. The full feature matrix across every pack, aspect ratio, creator/director workflow, installed NSIS build, and hardware configuration remains Milestone 3 work.

Chromium occasionally writes `GPU state invalid after WaitForGetOffsetInRange` on process teardown. Both development and packaged runs exited successfully with no renderer exception or main-process error attributable to the game. This message should be monitored in later GPU and packaged regression runs.

## Build and use

From this directory: `npm ci`, `npm run electron:dev`, `npm test`, `npm run build`, then `npm run test:packaged`. `npm run build` produces the runnable unpacked application at `dist/win-unpacked/Cardable.exe`. Double-clicking the source `index.html` remains supported.

## Deferred continuation

The earlier agent left uncommitted `src/ui/settings-desktop.js` and edits to `src/ui/preferences.js` and `src/styles/settings.css`. They are preserved. The desktop settings script is not loaded by `index.html`, so this incomplete Milestone 2 surface is inactive. The updater service and Discord boundary also remain present, but this document does not claim a working public update or Discord connection.
