# Releasing Cardable

Public versions start at **v1.0.0** after the 4.x development series. The owner authorizes **resetrevxz/cardable** as the public source, website and Windows distribution repository, and a published release after each completed update. Old private-only/draft-only instructions are historical. Keep appId com.cardable.game, native user-data identity and save schema unchanged.

## Every completed update

1. Finish the authorized change. Advance PATCH for fixes/polish/docs, MINOR for features, or an owner-approved MAJOR for breaking changes. Read-only questions/internal steps do not release.
2. Synchronize package.json, root/package metadata in package-lock.json, src/config.js, current README/PLAY references, bundled CHANGELOG.md and changelog/X.Y.Z.md. Preserve old notes and record actual evidence/gaps.
3. Validate the focused patch under the current owner policy, commit only owned files on main, and run **npm run deliver:desktop** once. Do not install/launch automatically.
4. Run **npm run release:github**. It verifies data/version/notes, requires a committed main update, pushes main and an immutable **vX.Y.Z** tag, and starts Windows Actions. It never stages files, retags older commits or force-pushes. GitHub Desktop can do ordinary commit/Push origin; CLI handles the release tag.
5. Inspect Actions until source, Pages and Windows workflows complete. Report failures; a pushed tag is not a completed release.
6. Verify published installer, full-folder ZIP, matching blockmap/latest.yml and SHA256SUMS.txt. Open the live website and verify download links. Report public URLs and local Latest Build shortcut.

CI builds locked Windows x64 packages, validates data/version/updater metadata, hashes every ZIP entry against the complete Electron folder, generates checksums and publishes. Existing releases/assets are preserved. User instructions to skip publication or stop at a draft take precedence.

## Assets

- **Cardable-Setup-X.Y.Z.exe**: complete offline per-user installer; recommended.
- **Cardable-X.Y.Z-Windows-x64.zip**: entire unpacked Electron folder, including resources/DLLs/locales. Extract all, then run Cardable.exe. Manual updates.
- **Cardable-Setup-X.Y.Z.exe.blockmap** and **latest.yml**: matching updater pair. Verify SHA-512 against the final installer before publishing.
- **SHA256SUMS.txt**: download integrity hashes.

GitHub's source ZIP is a separate download. Binaries belong in Releases, not Git or Pages. [GitHub file-size guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Signing

The first release is explicitly **unsigned**. CI defaults CARDABLE_REQUIRE_SIGNING to 0 until a provider is configured; native updater signature checks remain intact. Set Actions variable **CARDABLE_REQUIRE_SIGNING=1** and exact **CARDABLE_SIGNING_PUBLISHER** when credentials exist. Missing/mismatched signatures or timestamps then fail closed.

Existing builder backends: certificate/store, Azure, custom. Set CARDABLE_SIGNING_MODE. Certificate builds use WINDOWS_CSC_LINK and WINDOWS_CSC_KEY_PASSWORD secrets; Azure uses account/profile/endpoint variables and AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET secrets; custom requires its hook/CLI on the runner. Hardware tokens need provider middleware. No key, token or password enters Git, metadata or the website.

Sign during packaging before checksums/blockmaps. With required signing, tools/verify-windows-signatures.ps1 verifies trusted timestamped installer/app signatures. [electron-builder Windows signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-win/).

## Reset and updates

Installed 1.x builds use the public release provider and successful-save/normal-quit installation gate. Previews, development and full-folder builds do not act as installed apps. Old 4.x builds will not auto-update down to 1.0.0: install the new release once after closing normally and backing up progress/photos. Do not enable blanket allowDowngrade or change storage identity.

## Acceptance

Current policy permits the small data validator and source/resource/build/ZIP/Pages checks, with no old suites, new test files, screenshots, recordings or profiling. Clean-profile installer execution, real previous-version updater upgrades, hardware performance and the full cinematic/accessibility matrix remain unverified. Keep BUGS, ROADMAP and CINEMATICS gaps visible. Public source does not grant third-party artwork licenses; see NOTICE.md.

Pages configuration is in [GITHUB-PAGES](GITHUB-PAGES.md). Check live outcome rather than merely giving publication instructions.
