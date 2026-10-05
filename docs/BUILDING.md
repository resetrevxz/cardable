# Building Cardable

Use Node.js 24 LTS with npm. From the repository root:

1. `npm ci` installs the lockfile and Electron binary.
2. `npm run electron:dev` launches development with F12 DevTools.
3. `npm test` runs assets, service tests and isolated Electron smoke tests.
4. `npm run build` produces dist/win-unpacked/Cardable.exe.
5. `npm run test:packaged` repeats the smoke tests against ASAR.
6. `npm run dist` produces dist/Cardable-Setup-4.0.0.exe and its blockmap (version follows package.json).

Source index.html remains runnable by double-click. There is no development server requirement. Audio remains intentionally disabled by the existing game configuration.

Public distribution configuration is desktop-release.json. Set owner/repository before making an update-enabled distribution. Local builds with null values work offline and state clearly that updates are not configured. CI generates its repository configuration from public variables. Never put tokens into this file.

Code signing is optional for development and strongly recommended for public Windows releases. CI can use WINDOWS_CSC_LINK and WINDOWS_CSC_KEY_PASSWORD secrets. Without a signing certificate, Windows may display an unknown-publisher/SmartScreen warning; a generated installer is not evidence of a verified publisher.

Ignore dependencies, dist and build output in Git. Use npm audit to review dependencies. npm may report deprecated transitive packages; the current lockfile audit and actual build/test outcomes are recorded in the milestone report.
