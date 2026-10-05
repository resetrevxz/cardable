# Releasing Cardable

One-time setup: push this repository to GitHub and enable Actions. For a public source repository, the workflow defaults to that repository as the release provider. For private source, set public Actions variables CARDABLE_RELEASE_OWNER and CARDABLE_RELEASE_REPOSITORY to a dedicated public distribution repository and add CARDABLE_RELEASE_TOKEN with contents-write permission on that repository. Default GITHUB_TOKEN is sufficient when publishing to the source repository. No token is included in a desktop build.

Optional public variable CARDABLE_DISCORD_APPLICATION_ID enables RPC in CI builds. Optional WINDOWS_CSC_LINK and WINDOWS_CSC_KEY_PASSWORD secrets sign Windows artifacts. Configure repository permissions for tag-triggered Actions and protect release tags.

Release procedure:

1. Synchronize package.json, root/package lock metadata and src/config.js to the same MAJOR.MINOR.PATCH without altering unrelated dependency versions.
2. Add matching player notes to bundled CHANGELOG.md and changelog/X.Y.Z.md; runtime and CI consume different files.
3. Follow the authorized testing policy, record actual evidence/remaining gaps and commit focused files. The normal public-release gate includes tests, packaged/regression/resource checks and changed cinematic review, but the current 4.2.0 cleanup policy prohibits rerunning those suites. Its local delivery is not public release acceptance. Build local handoff with npm run deliver:desktop; separately authorize missing public-release coverage before publication.
4. Tag `vX.Y.Z` and push the commit and tag.
5. Actions validates, tests, builds and uploads the installer, blockmap and latest.yml (beta.yml for beta prereleases) into a draft release.
6. Review artifacts, install the build, then publish the draft in GitHub.
7. Test the previous installed version detecting, downloading and installing this release, and verify saves/settings/Studio scenes. Record the result before broad distribution.

Use `X.Y.Z-beta.N` for beta releases; stable builds do not opt into prereleases. Keep appId/productName unchanged. Do not publish updater metadata without its matching installer. CI verifies SHA-512 against the generated executable and does not publish if tests fail. Drafts are intentionally invisible to normal update checks until reviewed and published.

No release has been published from this checkout: it has no configured remote. The workflow must be exercised on the owner's actual GitHub repository.
