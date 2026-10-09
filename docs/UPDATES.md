# Updates

## Automatic installed-app updates (public 1.x)

The owner authorized automatic updates after cleanup. desktop-release.json →
updates.mode is automatic, with the public resetrevxz/cardable provider configured.
the installed Windows app checks after 30 seconds and every six hours, downloads
available updates in the background, and installs a ready update on normal quit.
Gameplay remains offline; release traffic stays in the native process. Browser,
development, unpacked preview and unconfigured builds make no scheduled requests.
Public numbering starts at v1.0.0. Earlier 4.x installations need the new installer once; normal update checks do not downgrade. A live installed 1.x upgrade remains separate acceptance.

From 1.2.3, a corner panel shows background download and ready status. With
Settings → About → Restart for updates when idle enabled, a ready update counts
down for 15 seconds only in a visible, focused idle menu. Pack opening/reservation,
inventory, Settings, Studio, dialogs, recovery and other editing contexts postpone
the countdown. Later defers this session; Settings still offers manual restart.
The restart uses the same save and native disk mirror gate. A failure cancels it.
The first relaunch from setup uses --updated and shows real collection restoration,
without invented installation percentages or a mandatory branding delay.

Settings → About displays progress, retained error details/retry, release notes,
Restart and update now, and Skip update on this quit. Skip leaves the cached
download and postpones automatic installation for the current app session;
reopening Settings offers explicit restart. A subsequent launch checks and can
reuse the cached download. Normal quit does not reopen the game after updating.
Windows session ending and Safe-mode relaunch postpone installation.

Legacy link mode opens the configured GitHub Releases page; github-public manually
checks the public latest-release API. Both retain manual behavior. Public GitHub
releases require no player token. The renderer has no general-purpose network API.

## Retained installer-updater infrastructure

electron-builder generates app-update.yml from the public GitHub provider. electron-updater reads that configuration; runtime code never overrides it with setFeedURL. Runtime capability requires a packaged Windows app with its adjacent stock NSIS uninstaller. Delivery metadata is shared by the installer and preview and does not establish installation; a normal unpacked preview has no installed uninstaller. Explicit loopback update fixtures retain their separate behavior; ordinary builds cannot opt into fixture profiles through environment variables.

The main-process service emits idle, checking, update-available, downloading/progress, update-downloaded, install-ready, no-update, error and unconfigured states. Check and download operations are serialized; an automatic download starts only after checking finishes. Error permits a fresh check and download retry. The library's autoDownload and autoInstallOnAppQuit flags stay false: Cardable owns orchestration and the save gate, preventing library listeners from bypassing them.

Both explicit restart and automatic normal-quit installation require a successful renderer save/settings flush and native mirror acknowledgment. A timeout/failure postpones installation even though ordinary closing may proceed. The main process records flush success separately from permission to close. pendingReveal and Studio data use the unchanged save pipeline. NSIS preserves stable userData and the existing installation directory. Export browser saves through Data and import them into the desktop app when moving from a browser.

The custom NSIS process check allows an updater-launched silent installer up to
ten seconds for Cardable to exit naturally. It then stops if any Cardable process
remains, including a local preview. It never calls the stock force-kill path.

Required public acceptance: install version A, keep cards/change settings/create a Studio scene/photo, publish signed B with matching installer/latest.yml/blockmap, launch A and observe background check/download. Verify Skip postpones this quit, explicit restart preserves exact cards/serials/settings/scenes/photo bytes, and a separate normal quit installs without relaunch. Exercise offline/retry, failed flush, Windows shutdown, Safe mode and unpacked preview exclusion. A real public A→B installation remains unverified; injected UI states are not end-to-end update evidence. Current testing restrictions still apply until the owner authorizes broader acceptance.

Unsigned development builds can test local functionality but cannot certify code-signing/publisher behavior. Private release repositories must not require player credentials; use a dedicated public distribution repository instead.

`npm run test:nsis-update` is the retained historical 4.0.0→4.0.1 loopback fixture, with separate branding/profile/cache. Its explicit manual restart flow does not certify the new automatic policy or a public GitHub update. Do not run it under the current restricted testing policy. First installation still starts when the user runs setup; in-place updates use silent NSIS after the app's successful save gate.

Studio photos live in Chromium IndexedDB, not in JSON save exports or the native mirror. In-place update/reinstall at the same directory preserves the tested origin. Moving installation directories can change file-origin photo storage; download/retain photos first. The JSON mirror restores cards/settings/scenes but does not migrate photo blobs from another file origin automatically.
