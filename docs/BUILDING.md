# Building Cardable

Use Node.js 24 LTS with npm. From the repository root:

For completed implementation/documentation prompts use `npm run deliver:desktop`.
It builds isolated Windows artifacts, validates them, preserves the stable preview
origin and hands off Cardable (Latest Build) with transactional rollback and owned
cleanup. See [DESKTOP-DELIVERY.md](DESKTOP-DELIVERY.md). It does not install or launch
the app. The current 4.2.0 policy in [PROMPTING.md](PROMPTING.md) restricts testing;
the historical test commands below are not authorization to run them for A–D.

1. `npm ci` installs the lockfile and Electron binary.
2. `npm run electron:dev` launches development with F12 DevTools.
3. `npm test` runs assets, service tests and isolated Electron smoke tests.
4. `npm run build` produces dist/win-unpacked/Cardable.exe.
5. `npm run test:packaged` repeats the smoke tests against ASAR.
6. `npm run dist` produces dist/Cardable-Setup-4.1.0.exe and its blockmap (version follows package.json).

After packaging, run `npm run test:package` for ASAR contents, `npm run test:regression` for game/lifecycle/persistence, and `npm run test:cinematics` for five full High/Safe rare timelines. `npm run test:nsis-update` builds and installs two isolated fixture versions, performs an actual local update/reinstall and retains evidence; it does not modify an existing Cardable installation. See electron-milestone-3.md and ELECTRON-CHECKLIST.md for verified scope. QA evidence is ignored under qa-output.

Close the packaged application before rebuilding the same dist directory; Windows locks its loaded DLLs. Build first, then run packaged checks sequentially. Different isolated fixture output directories may be built independently.

For the restricted 4.1.0 QoL delivery, do not run the older test commands above:
only one isolated app session and one manual Cardable.dev.checkQol invocation are
authorized. Packaging itself is still allowed. With the existing unpacked app
running, build safely beside it using:

`npm run dist -- --config.directories.output=dist/desktop-qol-4.1.0`

This produces the updated app at dist/desktop-qol-4.1.0/win-unpacked/Cardable.exe
and installer at dist/desktop-qol-4.1.0/Cardable-Setup-4.1.0.exe. Close the old app
normally before launching the new one. Export a save and download Studio photos
before changing installation directories; JSON backups do not migrate IndexedDB
photo blobs between file origins. No installation is performed by this build.

Source index.html remains runnable by double-click. There is no development server requirement. Audio remains intentionally disabled by the existing game configuration.

Public distribution configuration is desktop-release.json. Set owner/repository before making an update-enabled distribution. Local builds with null values work offline and state clearly that updates are not configured. CI generates its repository configuration from public variables. Never put tokens into this file.

Code signing is optional for development and strongly recommended for public Windows releases. CI can use WINDOWS_CSC_LINK and WINDOWS_CSC_KEY_PASSWORD secrets. Without a signing certificate, Windows may display an unknown-publisher/SmartScreen warning; a generated installer is not evidence of a verified publisher. Inspect the signed executable and generated app-update.yml publisherName before public acceptance: updater signature verification is conditional on that configuration. Checksums alone do not authenticate a compromised provider.

Ignore dependencies, dist and build output in Git. Use npm audit to review dependencies. npm may report deprecated transitive packages; the current lockfile audit and actual build/test outcomes are recorded in the milestone report.
