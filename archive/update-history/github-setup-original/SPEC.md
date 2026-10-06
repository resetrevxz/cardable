# GitHub setup: repo, README, releases and builds

Make the project look and work like a well-run product on GitHub, **private first**. This supersedes the public-release assumptions in the older `docs/10-RELEASE.md` (public Pages site, public repo). The game uses real hardware brand names, logos and photographs for a private friends-only game, so **the repository stays private** unless the owner later decides to replace that material.

**Read first:** `AGENTS.md`, the Electron app code and README, `alpha-updates/` (folder names and versions), `docs/` (only to know what exists), `.gitignore`.

1. Create a GitHub account if needed, install **Git** and the **GitHub CLI** (`gh`), and run `gh auth login` once (choose HTTPS and a browser login). Do not paste tokens into chat.
2. Decide the repository name (default `cardable`) and confirm it is **private**.
3. Take the README screenshots (see section 4) with the app's `F2` tool and drop them into `docs/images/`.
4. Upload the social preview image in the repo settings (the API cannot do this).

If `gh` is not authenticated, Codex stops and tells the owner exactly which command to run.

## 2. Rules

- **No secrets, ever.** No tokens, keys, `.env`, personal paths, emails, machine names. Scan the whole tree before the first push. Use GitHub Actions secrets for anything needed later (for example code signing).
- Keep `assets/cards-source/`, `assets/audio-src/`, `dist-electron/`, `node_modules/` and other bulky or source-only folders in `.gitignore`. Warn if any tracked file exceeds 50 MB (GitHub rejects files over 100 MB); suggest Git LFS only if truly needed.
- **Confirm before the first push and before creating the repo**: show the planned name, visibility (private), the file count and total size, and wait for the owner's go-ahead. Never make a repository public.
- Do not rewrite history, force-push or delete branches unless asked.
- Testing: do not run old tests or create test suites. The only automated check added is a tiny Node data check (section 6) that runs in CI. Otherwise confirm each workflow file is valid YAML and the commands in it exist locally.

## 3. Repository structure and hygiene

- Branch model: `main` is stable; each alpha update lives on a branch named after its folder (`alpha-0.4.0-title`) and merges by pull request (squash). A tag per release.
- Files to add or update: `README.md` (section 4), `CHANGELOG.md` (Keep a Changelog style; one entry per alpha version, newest first, written in the premium style below), `NOTICE.md` (third-party licenses for fonts, audio credits, brand and trademark disclaimer), `SECURITY.md` (one paragraph: how to report), `.gitattributes` (normalize line endings, mark binaries), `.editorconfig`.
- `.github/`: issue templates (Bug report with a diagnostics field and "which pack/card", Feature request, **Balance and content feedback** for odds/card questions), a PR template with a short checklist (what changed, which update folder, manual checks done, save-compatibility note), `release.yml` (auto-generated release note categories: Features, Fixes, Content, Polish), a small `labels.yml` plus a script `scripts/sync-labels.ps1` or `.sh` that creates labels with `gh label create` (type: bug, feature, content, polish, audio, balance; area: packs, cards, variants, ui, studio, electron, save; priority: now, next, later).
- **Writing style** for README, changelog and release notes: calm, precise, confident; short declarative sentences; present tense; concrete numbers ("13 rarity tiers", "122 cards"); no hype words, no exclamation marks, no emoji; sentence case headings; honest limits.

## 4. README (private-friendly, premium)

Sections in order, each short:

1. **Hero:** wordmark, one-line tagline, the version, a hero screenshot (`docs/images/hero.png`).
2. **What it is** (2 to 3 sentences) and **Highlights** (5 lines: the pack opening and cutscenes, metal cards with foil and variants, 13 rarity tiers and special packs, the collection and studio, achievements and history).
3. **Install:** download the installer from Releases; Windows SmartScreen steps for an unsigned app (More info, then Run anyway); the portable and zip options; where saves and backups live; how to **bring a save from the browser version** (export in the browser, import in the app); how to update (download the newer installer; saves are kept).
4. **How it plays** (4 numbered steps) and **Controls** (small table; link to the in-app shortcuts overlay).
5. **Screenshots** (6 images with captions): `hero`, `opening`, `reveal`, `inventory`, `detail`, `studio`. If an image is missing, leave a visible `TODO` comment and list the missing ones in the report; never leave broken image links.
6. **Settings worth knowing:** quality tiers, strobing Safe/Full, desktop options.
7. **Troubleshooting:** the app does not start, a white or black screen (Safe mode), low frame rate (quality tier, hardware acceleration), save restore from backup, audio, notifications.
8. **Report a bug** (the in-app button and the issue template).
9. **Roadmap** (link to `ROADMAP.md`) and **Credits and licenses** (link to `NOTICE.md`).
10. Footer: the independent-fan-project and trademark disclaimer.

Keep it dark-theme friendly (transparent PNGs or dark-bordered screenshots), one H1, no badge walls (badges for private repositories may not render for everyone).

## 5. CI with GitHub Actions

- **`.github/workflows/check.yml`** (on pull requests and pushes to `main`): runs on `ubuntu-latest`, Node LTS, `node scripts/check-data.js` (section 6), then validates JSON files and that referenced art files exist for cards whose `artStatus` is `final`. Fast, no browser.
- **`.github/workflows/release.yml`** (on tags matching `alpha-*` or `v*`): runs on `windows-latest`, Node LTS, caches npm, runs `npm ci` and `npm run dist`, uploads the NSIS installer, portable exe and zip, and **creates a draft GitHub Release** with notes taken from the matching `CHANGELOG.md` section. Windows minutes count against the private-repo free allowance (and count extra), and a build only needs a few minutes, so keep the workflow lean and cache dependencies. Never publish the release automatically; leave it as a draft for the owner to review.
- Signing: leave the signing step present but disabled, driven by repository secrets, and document it in `electron/README.md`. `forceCodeSigning` stays false until the owner sets it up.
- Optional: enable Dependabot **security** updates for npm (weekly, grouped) so Electron and electron-builder vulnerabilities are flagged.
- No mac/linux builds unless the owner asks.

## 6. `scripts/check-data.js` (behavior and integrity only)

Runs in plain Node with no browser. Load the data files (`src/data/*.js`) into a `vm` context with a stubbed `window`, then check invariants, never specific content:
- ids are unique (cards, packs, variants, rarities, achievements); every card references an existing rarity and generation; every pack pool filter references existing brands/generations/tiers; every variant slot exists; combo recipes reference existing variants;
- rarity chances are positive and normalizable; slot rules probabilities sum to at most 1;
- for each card with `artStatus: 'final'` the referenced image files exist;
- every sound id referenced by event mappings exists (if the audio system exists).
Print one summary line; exit non-zero on failure. Do not read source code text, check copy, or assert on names or counts.

## 7. Releases

- Tag format `alpha-0.4.0` (matches the update folder and `config.version`); title "Cardable alpha 0.4.0"; body in the premium style: a two-sentence intro, **What's new** (4 to 7 lines), **Content** (new cards or packs), **Fixes**, **Known issues**, **Install** (three lines), **Save compatibility** (one line). Attach the installer, portable exe and zip.
- A script `scripts/new-release.ps1`/`.sh` (or an npm script) that: reads `config.version`, checks `CHANGELOG.md` has a matching entry, creates the tag, pushes it and prints the link to the draft release. It asks for confirmation before pushing.
- The release workflow's output is always a **draft**.

## 8. Project management

- **`ROADMAP.md`:** Now, Next, Later columns written from the owner's roadmap (finish what is in flight, beta hardening, pack shop for alpha 3.0, trading and market later, mobile later). Short, honest.
- **Issues:** create GitHub issues for the remaining roadmap items with the labels above and a milestone per upcoming alpha version (create the milestones with `gh api`). Do not create more than 40 issues; group small items.
- Optionally create a GitHub Project board only if `gh` has the project scope; otherwise skip and say so.

## 9. Repo settings (document, do what the API allows)

Description, topics (`game`, `electron`, `javascript`, `collectible-card-game`, `gpu`), disable Wiki, enable Issues, enable Discussions only if the owner wants, default branch `main`. List what the owner must still do by hand (social preview image, collaborators).

## 10. Milestones (stop at a clean one, commit, list what is unfinished)

- **A: local files.** `.gitignore` review, secrets and size scan, README, CHANGELOG, NOTICE, SECURITY, templates, labels script, `check-data.js`, `ROADMAP.md`. No network actions.
- **B: create and push.** Show the plan and wait for the owner's go-ahead, create the **private** repository with `gh`, push `main`, apply labels, milestones and issues, repo settings.
- **C: CI and releases.** The two workflows, the release script, a dry run of `check.yml` logic locally, and instructions for the first tag. Do not create the first release without confirmation.

## 11. Manual checks

1. `git status` is clean, the scan found no secrets, and no tracked file is oversized.
2. The README renders well on GitHub in dark and light themes; no broken images.
3. Issue and PR templates appear when creating an issue or PR.
4. `check.yml` passes on `main`; a tag triggers `release.yml` and produces a **draft** release with the three artifacts and notes.
5. The installer from the release installs and runs on a clean Windows profile.
6. The repository is **private** (verify in settings).

## 12. Out of scope

Making the repository public, GitHub Pages, code signing, auto-update, mobile builds.
