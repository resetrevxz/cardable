# Releasing Cardable

One-time setup: push this repository to GitHub and enable Actions. For a public source repository, the workflow defaults to that repository as the release provider. For private source, set public Actions variables CARDABLE_RELEASE_OWNER and CARDABLE_RELEASE_REPOSITORY to a dedicated public distribution repository and add CARDABLE_RELEASE_TOKEN with contents-write permission on that repository. Default GITHUB_TOKEN is sufficient when publishing to the source repository. No token is included in a desktop build.

Optional public variable CARDABLE_DISCORD_APPLICATION_ID enables RPC in CI builds. Configure repository permissions for tag-triggered Actions and protect release tags. desktop-release.json defaults to automatic updates once a public provider is supplied; link and github-public retain their earlier manual behavior. See UPDATES.md for save-gated installation and preview exclusions.

## Windows signing setup

Public tag builds now require signing: CI sets CARDABLE_REQUIRE_SIGNING=1 and
verifies trusted Authenticode signatures and timestamps on both Cardable.exe and
the final installer before creating a draft. Missing credentials or a mismatched
publisher fail the release; local delivery remains possible unsigned. A signing
provider and identity verification are external owner setup, not an app feature.

Set Actions variable CARDABLE_SIGNING_PUBLISHER to the exact certificate Common
Name. Set CARDABLE_SIGNING_MODE to one supported backend:

- certificate (default): use WINDOWS_CSC_LINK and WINDOWS_CSC_KEY_PASSWORD secrets
  for an existing exportable PFX/P12; the workflow maps them to CSC_LINK and
  CSC_KEY_PASSWORD. For a Windows certificate-store/hardware-token installation,
  use CARDABLE_CERTIFICATE_SUBJECT or CARDABLE_CERTIFICATE_SHA1 variables on a
  suitable runner with the provider's middleware. A hosted runner cannot access
  a USB token plugged into the developer's computer.
- azure: set CARDABLE_AZURE_SIGNING_ENDPOINT, CARDABLE_AZURE_SIGNING_ACCOUNT and
  CARDABLE_AZURE_CERTIFICATE_PROFILE variables, plus AZURE_TENANT_ID,
  AZURE_CLIENT_ID and AZURE_CLIENT_SECRET secrets. The configuration uses the
  installed electron-builder v26 win.azureSignOptions API. Complete Azure identity,
  certificate-profile and signing-role setup separately. Microsoft Public Trust
  currently excludes India; individual eligibility is limited to US/Canada.
- custom: set CARDABLE_SIGN_SCRIPT to a provider-specific Node signing-hook file
  available on the build runner. The hook uses v26 win.signtoolOptions.sign and
  must sign/timestamp every supplied task.path or throw. Install that provider's
  CLI and supply its secrets in Actions before packaging; selecting custom alone
  does not provision a cloud account, hook or credentials.

Modern public certificates generally use hardware/cloud key protection; do not
assume a new purchase yields an exportable PFX. Never commit signing keys, tokens
or passwords. The public publisher is included in app-update.yml for normal
electron-updater signature verification; no credentials enter app metadata. Do
not disable update signature verification. Sign during packaging before creating
checksums/blockmaps, rather than modifying published installers afterward.

References: [electron-builder v26 Windows signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-win/),
[Microsoft Artifact Signing eligibility](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart),
[DigiCert key protection](https://www.digicert.com/signing/code-signing-certificates).
Signing establishes a publisher; it does not promise warning-free SmartScreen
behavior. [Microsoft reputation guidance](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

Release procedure:

1. Synchronize package.json, root/package lock metadata and src/config.js to the same MAJOR.MINOR.PATCH without altering unrelated dependency versions.
2. Add matching player notes to bundled CHANGELOG.md and changelog/X.Y.Z.md; runtime and CI consume different files.
3. Follow the authorized testing policy, record actual evidence/remaining gaps and commit focused files. The normal public-release gate includes tests, packaged/regression/resource checks and changed cinematic review, but the current 4.2.0 cleanup policy prohibits rerunning those suites. Its local delivery is not public release acceptance. Build local handoff with npm run deliver:desktop; separately authorize missing public-release coverage before publication.
4. Tag `vX.Y.Z` and push the commit and tag.
5. Actions validates, tests, signs, verifies signatures/timestamps and uploads the installer, blockmap and latest.yml (beta.yml for beta prereleases) into a draft release.
6. Review artifacts, install the build, then publish the draft in GitHub.
7. Test the previous installed version detecting, downloading and installing this release, and verify saves/settings/Studio scenes. Record the result before broad distribution.

Use `X.Y.Z-beta.N` for beta releases; stable builds do not opt into prereleases. Keep appId/productName unchanged. Do not publish updater metadata without its matching installer. CI verifies SHA-512 against the generated executable and does not publish if tests fail. Drafts are intentionally invisible to normal update checks until reviewed and published.

No release has been published from this checkout: it has no configured remote. The workflow must be exercised on the owner's actual GitHub repository.
