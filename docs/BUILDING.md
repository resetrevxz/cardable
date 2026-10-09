# Building Cardable

Players use [PLAY.md](../PLAY.md), not these developer commands. Development uses the existing Node/npm lockfile and Electron tooling. From the actual repo root:

1. `npm ci` installs locked dependencies and Electron.
2. `npm run electron:dev` opens development with explicit DevTools access.
3. `npm run deliver:desktop` builds/validates isolated Windows x64 offline NSIS and unpacked outputs, promotes the stable preview/Latest Build shortcut transactionally, and cleans only superseded manifest-owned outputs after handoff. It never installs, launches, publishes, elevates or kills Cardable. See [DESKTOP-DELIVERY](DESKTOP-DELIVERY.md).

Current app/config/root lock version is **1.2.3**. Installer names derive from package.json (`Cardable-Setup-1.2.3.exe`); exact build paths/hashes are generated in ignored `dist/delivery/latest.json`. Approximate player size and signature status derive from the actual installer, not source counts. Retain the stable `dist/desktop-qol-4.1.0/win-unpacked` preview binding; its historical name preserves origin/storage while contents advance. Do not build directly into a running preview or create a different origin as a workaround.

The existing offline NSIS config is one-click/per-user, preserves app data and recreates normal desktop/Start Menu shortcuts. Its supported include asks the player to close a running app and retries, while silent setup/uncertain legacy paths stop. Setup execution/upgrade is separate acceptance. JSON exports omit Studio photo blobs; download photos separately before a necessary origin transition.

## Existing commands and current authorization

The repo has actual test/service/browser/packaged/NSIS/cinematic runners, plus assets/package/release validators. `npm test`, `test:services`, `test:packaged`, `test:regression`, `test:nsis-update`, `test:cinematics`, optimization checks and profiling commands remain in package.json/tools/tests. Historical Electron evidence is [indexed here](../archive/4.2.0-cleanup/README.md). Keeping these commands does not authorize running them under the current 4.2.0 policy: no old suites, new test files, captures/recordings or profiling. See [PROMPTING](PROMPTING.md).

Use `deliver:desktop:verify` to inspect current artifact/preview/link hashes, `:inspect` for exact legacy inventory and `:resume` for a pending same-source handoff after closing the app normally. Build/hash/config/source/resource validation is delivery evidence, not runtime regression. Ordinary `npm run build`/`dist` remain manual standalone packaging options; use the delivery command for completed implementation/documentation prompts.

Source index.html still runs by double-click without a dev server or modules. Audio remains disabled. Packaging allowlists retain local src/assets/vendor/electron/index/required metadata while excluding docs/archive/tools/tests/developer evidence; dist/node_modules/QA output are ignored, not cleanup targets.

Public provider identifiers live in desktop-release.json; owner/repository identify the public resetrevxz/cardable distribution. Tokens/signing credentials never enter that file or ASAR. [RELEASING](RELEASING.md) covers owner-configured hosting/CI/signing and paired assets. A successful build/hash is not a verified publisher, actual installation or live updater result.
