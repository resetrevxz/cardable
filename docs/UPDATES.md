# Updates

electron-builder generates app-update.yml from the public GitHub provider. electron-updater reads that configuration; runtime code never overrides it with setFeedURL. Packaged configured builds check after 30 seconds and every six hours; Settings allows manual checks. No runtime update traffic occurs in browser or development mode or builds without provider metadata.

The main-process service emits idle, checking, update-available, downloading/progress, update-downloaded, install-ready, no-update, error and unconfigured states. Operations are serialized. Error permits a fresh check and download retry. Updates never download or install automatically; closing the app does not auto-install. Later retains the download for an explicit later restart.

Install requires explicit Settings action, renderer durable local save/settings flush and successful native mirror acknowledgment. A timeout/failure postpones installation. pendingReveal and Studio data use the unchanged save pipeline. NSIS preserves the stable userData identity. Reinstalling into a different directory can change file-origin storage; the native primary mirror recovers missing state. Export browser saves through Data and import them into the desktop app when moving from a browser.

Required public acceptance test: install version A, keep cards/change settings/create a Studio scene, publish B with matching installer/latest.yml/blockmap, launch A, check, download, inspect progress, postpone, then explicitly install. Confirm B's app version and the exact original cards/serials/settings/scene after restart. Also test offline failure/retry and uninstall/reinstall. Do not describe mock/injected state tests as a GitHub version-to-version update.

Unsigned development builds can test local functionality but cannot certify code-signing/publisher behavior. Private release repositories must not require player credentials; use a dedicated public distribution repository instead.
