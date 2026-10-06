# Cardable's public page

The public source/download repository is **resetrevxz/cardable**. The landing page is **https://resetrevxz.github.io/cardable/**. The owner authorized a public repository, starting public versions at **v1.0.0**, and publication after every completed update. This supersedes the former private-only GitHub plan.

## Website

`site/` contains the landing-page HTML, CSS, JavaScript and original README hero illustration. `npm run site:build` writes `dist/site` with selected local GPU art, fonts/licenses and generated versioned release links. No renderer API, network fetch, external CDN or game module is needed by the website. It uses responsive layouts, keyboard buttons, native FAQ details, reduced motion and a non-JavaScript download fallback.

`.github/workflows/pages.yml` deploys that generated folder with GitHub's Pages artifact workflow. Repository **Settings → Pages → Source** must be **GitHub Actions**, not the game's root or internal docs folder. The workflow needs `pages: write`, `id-token: write` and the `github-pages` environment. The repository root `index.html` remains the actual offline game and is not replaced by the website.

See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). A failed earlier Pages attempt is not evidence of this new deployment; verify Actions and the final live URL.

## Downloads

The recommended **Cardable-Setup-X.Y.Z.exe** contains the complete Electron app. The alternative **Cardable-X.Y.Z-Windows-x64.zip** contains the entire unpacked app, including resources, DLLs and locales. Extract all files and run Cardable.exe. The source-code ZIP provided by GitHub is a different download for source/browser play.

Releases also attach the installer blockmap, matching latest.yml and SHA256SUMS.txt. The static website links to those release assets; large binaries are not tracked in Git or uploaded as Pages content. Installer/ZIP publication must finish before calling their links usable. Folder builds use manual updates; installed builds use the configured save-gated native updater.

## Repository and GitHub Desktop

The existing local Git history is preserved and pushed through `origin`, with no force-push or reset. GitHub Desktop can add the local game repository and use Fetch/Push origin normally. Tag/release creation uses `npm run release:github` and GitHub CLI; GitHub Desktop does not itself build or create Releases.

The private package wrapper in the outer workspace forwards development/release commands to the actual game. Archives and test runners remain source history, while node_modules, output, intermediate art and secrets remain ignored. Only the generated game allowlist ships in the installer.

## Evidence limits

Source/data/resource validation, a successful Windows build, ZIP entry/hash validation, Pages interaction checks and live asset responses are distinct evidence. No game/browser suite, screenshot, clean-profile installer execution, signed-updater upgrade, device/GPU or photosensitivity certification is inferred. Follow [RELEASING](RELEASING.md), [PROMPTING](PROMPTING.md), [BUGS](BUGS.md) and [CINEMATICS](CINEMATICS.md).
