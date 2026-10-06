# GitHub setup — public Cardable 1.0.0

This adapted plan records the owner's 2026-10-06 request: a public source repository and good-looking download page, easy Electron installation and complete-folder download, public version reset to v1.0.0, and a release after every completed update. The [original private-first spec](../../archive/update-history/github-setup-original/SPEC.md) is preserved as historical input.

## Authorized scope

- Create public **resetrevxz/cardable**, preserve the existing main history, and push the complete tracked project. Keep local dependencies, builds, intermediate art and secrets ignored.
- Provide a premium dark README and responsive GitHub Pages landing page, with a primary Windows installer download, complete Electron folder ZIP alternative, source link, backups/browser-save help and honest unsigned/version-reset guidance.
- Use the current game rather than older guessed counts/roadmap. No market, trading, audio or new game feature is introduced. Use existing artwork/illustrations rather than fabricated gameplay screenshots.
- Synchronize package/lock/renderer version to 1.0.0 without changing save schema, appId, storage identity or stable preview path.
- Configure installed-app updates against this public repository. Existing 4.x builds need the 1.0.0 installer once; do not enable blanket downgrades.
- Add current issue/PR templates, font/dependency notices, private security reporting, labels, editor/line-ending guidance and source integrity CI.
- Deploy **dist/site** through Pages Actions. Root index.html remains offline game source; internal docs/game folders are not the Pages publish directory.
- Tag v1.0.0 and publish the validated Windows installer, full-folder ZIP, updater metadata/blockmap and SHA256SUMS.txt. Future completed updates advance a version and publish through the AGENTS completion protocol. Preserve releases and immutable tags.

## Adaptations

Public source/Pages and automatic release publication are now owner-authorized; the old private-only, Pages-out-of-scope and draft-only rules are superseded. Electron and the native updater already exist: adapt their current packaging/lifecycle. Signing is optional until credentials exist, clearly disclosed for unsigned builds; configured required signing fails closed. No credentials are committed or bundled, and updater signature checks remain intact.

The restriction on old suites, new test files, screenshots, recordings and profiling remains. The original tiny data integrity check is implemented as scripts/check-data.js for source CI; build/hash/reference/archive checks are permitted. Packaging/site checks do not certify actual installation, a live updater upgrade or device/cinematic acceptance.

## Completion

Commit focused source/guidance, deliver the local desktop once, publish the authorized repository/tag, observe Pages and Windows Actions, verify the live page and installer/folder assets, and report URLs with actual limits. GitHub Desktop manages this checkout; CLI handles version tags/Releases. Read-only turns do not release. See [GITHUB-PAGES](../../docs/GITHUB-PAGES.md) and [RELEASING](../../docs/RELEASING.md).
