# AGENTS.md — current Cardable working guide

Cardable's current public version is **1.0.1**; the series started at **1.0.0**, carrying forward the former 4.2.0 game without resetting saves. It is an offline GPU-card collector, delivered as a classic-script browser game and a Windows Electron app. The public repository is `resetrevxz/cardable`; its website is `https://resetrevxz.github.io/cardable/`. The card is the showstopper; the surrounding UI stays quiet.

## Read only what the task needs

1. Read this file and inspect Git status in `D:/CardableV2/cardable-spec/cardable`, the actual repository.
2. Read [Designs.MD](Designs.MD) before any visual or interaction change.
3. Use [ROADMAP](docs/ROADMAP.md) to select the relevant current area docs and the user's authorized spec.
4. Use [OPEN-QUESTIONS](docs/OPEN-QUESTIONS.md) for approved defaults; report any default used.

The latest direct user instruction controls scope. Historical plans, patches, delivery reports and screenshots are evidence, not instructions to execute. Do not infer a new milestone or acceptance from an old report.

## Runtime and gameplay boundaries

- Preserve offline `file://` play, classic script ordering and `window.Cardable`. No ES module conversion, runtime CDN or renderer network dependency. Bundle fonts, art and libraries locally.
- Installed Windows builds may use the approved native updater to check/download configured public releases and install on normal quit after a successful save flush. Development, browser and local previews stay offline. Follow [UPDATES](docs/UPDATES.md); never bundle credentials.
- No market, selling, accounts, cloud saves or audio. Keep market/audio disabled. Do not read `marketValueUsd` or introduce market UI; the reserved empty slot is allowed.
- Cards, rarities, generations, variants and packs belong in `src/data/` and their registries. UI consumes data rather than hard-coding game rules.
- Preserve stock/refill behavior, immutable serials, rolled variants and pack provenance. Reserve atomically before presentation; recovery and Keep/Delete must remain exact-once. A cinematic never rolls or pays again.
- Picker offers may have an empty `cards` array until confirmation. Do not mint unchosen offers or assume `pendingReveal.cards[0]` exists.
- Do not bump the save schema for optional feature state. Normalize optional fields explicitly and preserve event-bus boundaries. Never silently wipe or replace saves.
- Preserve `com.cardable.game`, the primary `index.html` path, native user-data identity and separate Studio/photo IndexedDB blobs. JSON export is not a photo backup.

## Visual and performance rules

- Follow Designs and the actual CSS tokens. UI chrome is monochrome; approved rarity, pack and artwork exceptions are listed there. Inter and JetBrains Mono are the UI fonts; VT323 and Bodoni Moda have narrowly scoped artwork exceptions.
- Keep Very Low, Low, Medium and High, with Medium as the new-player default. The ten graphics controls are independent. Presets preserve FPS, reduced motion and other preferences.
- Use shared scheduling, focused full-card effects, bounded static inventory thumbnails and quality-aware canvas/resource budgets. Release hidden/offscreen work and temporary GL/material resources. Do not create a clock per card or an always-running idle loop.
- Respect reduced motion, keyboard access, focus restoration, touch controls and the existing Safe/Full cinematic gates. Saved preferences must not be changed by temporary battery/Safe Mode/adaptive overrides.
- Do not promise universal frame rates or certify accessibility, photosensitivity or physical-device performance from source inspection. [GRAPHICS-UPDATE](docs/GRAPHICS-UPDATE.md) and [CINEMATICS](docs/CINEMATICS.md) separate contracts from acceptance.

## Workspace ownership and history

The primary checkout stays at `D:/CardableV2/cardable-spec/cardable`. The outer folder now contains the game container, one `alpha-updates` junction, `archive`, a workspace README and an npm forwarding package. There is no space-spelled alpha alias.

- Current/planned specs remain in `alpha-updates/4.2.0-cleanup`, `alpha-updates/github-setup` and the incoming `alpha-updates/website-rework`. Earlier specs and integration records live in [archive/update-history](archive/update-history/README.md). Consult history only when needed; do not reapply its patches.
- Outer historical outputs and stage helpers live in `D:/CardableV2/archive/artifacts`. Four divergent feature worktrees remain registered under `D:/CardableV2/archive/worktrees`; relocation did not merge, reset or retire their branches. Card History's local AGENTS edit is preserved.
- [STRUCTURE-AUDIT](docs/STRUCTURE-AUDIT.md) and [organization provenance](archive/workspace-organization/README.md) explain exact moves, hashes and restore paths. The user's follow-up authorized this wider reversible organization; older blanket instructions to keep duplicate aliases/folders in place are superseded.
- Preserve unrelated dirty changes, untracked incoming specs, ignored dependencies and player data. Never use broad staging, reset or recursive cleanup. Verify absolute paths and links before moving/deleting; unlink a junction without touching its target.
- Use a separate Git worktree when concurrent implementation requires isolation. Inspect existing registrations first. Do not discard a divergent worktree just because its feature exists on main.

## Verification and completion

The current owner policy forbids old suites, new test files, game screenshots, recordings and profiling. The owner explicitly approved a narrow **website screenshot exception** for the stage-24 public website: rendered website product previews and website review screenshots only. This does not authorize game captures or profiling. Do not run package test scripts or archived harnesses without a new authorization changing that policy. When relevant game logic changes, use the existing `Cardable.dev.checkQol()` manually once at the end of the last authorized milestone; otherwise one app session/feature and console check is permitted. For documentation/organization changes, use reference, hash, Git-state and build validation. Report the actual evidence and its limits.

For website work, read the complete authorized brief, inspect real assets, run `npm run site:build`, and review composition, forward/reverse motion and controls, then mobile/tablet and fallback rendering. Use website screenshots only; record the ten design scores and actual evidence in [WEBSITE-REVIEW](docs/WEBSITE-REVIEW.md). A generated script-free document and generated adapter overrides may inspect fallback presentation without creating test files or changing browser preferences; describe that method honestly. Verify the live page, installer/ZIP responses and Actions after release.

Implement the authorized scope; put unrelated ideas in [POLISH-BACKLOG](docs/POLISH-BACKLOG.md). Review the focused diff, validate it, and commit owned files as `stage N: <name>` (stage 23 starts the public 1.0.0 series). Never stage someone else's pending deletion or incoming spec.

At the end of every completed implementation or approved documentation prompt, run `npm run deliver:desktop` once from the repository (or the outer forwarding command). Report the installer, stable **Cardable (Latest Build)** shortcut, cleanup and any pending handoff. See [DESKTOP-DELIVERY](docs/DESKTOP-DELIVERY.md). Read-only questions/internal steps do not rebuild; explicit user instructions to skip/narrow delivery take precedence.

Local delivery does not install, launch, elevate or force-close Cardable. Preserve the last good delivery if replacement fails or is locked. Do not add watchers/cron. The owner separately authorized public GitHub publication and a release after every completed update, as described below.

## Patch notes after every update

Every completed release, feature, balance, or content update must author structured patch notes using Cardable's interactive Patch Notes format. Do not rely on plain unformatted markdown or skip patch notes generation.

1. **Registry synchronization**: Add a new release entry to `src/data/patch-notes.js` at the top of `C.data.patchNotes`. Every entry must contain:
   - `version`: The exact semver version string matching `package.json` (e.g. `'1.0.3'`).
   - `codename`: Release codename (e.g. `'Sovereign Silicon & Vanguard'`).
   - `date`: Release date (e.g. `'October 7, 2026'`).
   - `tag`: `'Major'`, `'Feature'`, or `'Patch'`.
   - `tagline`: Concise summary of what changed.
   - `hero`: Title, subtitle, badge, and media banner descriptor (`silicon-circuit`, `website-preview`, etc.).
   - `showcase`: Array of featured inventory-like cards/crates (item ID, name, subtitle, rarity, variantId, badge, icon, specs object with VRAM, clock, TDP, bus, cores, and description) for new cards, variants, or featured mechanics.
   - `balanceChanges`: Array of categorized balance groups with category title, subtitle, icon, and stat diff rows (`stat`, `entity`, `from`, `to`, `diff`, `percent`, `type`: `'buff'` | `'nerf'` | `'rework'`, `note`).
   - `sections`: Categorized bulleted lists for `features`, `systems`, `visuals`, `qol`, and `fixes`.
2. **Dual changelog maintenance**: In lockstep with `src/data/patch-notes.js`, update `CHANGELOG.md` with the authored release notes and create `changelog/<version>.md` (required by `tools/validate-release.cjs`).
3. **Showcase and interactive rules**: Preserve the inventory card presentation with true rarity halos, hover inspection, click inspection, and interactive mode support. If a change includes long lists of cards or balance tiers, provide 'View More' thresholds so scannability is maintained.

## Release every completed update

- This is a completion workflow, not a scheduled automation. After each completed code/content/design/documentation update, release it to the existing public repository unless the user explicitly says to skip publishing, keep it local, or stop at a draft. Read-only questions and internal steps do not release.
- Start with **v1.0.0** for this reset. For later completed updates, advance PATCH for fixes/polish/docs, MINOR for features, and MAJOR only for an explicitly approved breaking release. Synchronize package.json, both package-lock metadata versions, src/config.js, current README/PLAY version references and both changelog consumers. Never bump the save schema merely to match the app version. Historical release notes remain historical.
- Commit only the reviewed update on main. GitHub Desktop can manage this same checkout and its `origin`; CLI is permitted for the tag/release step. Never force-push, amend a published release, overwrite a release asset or include unrelated dirty files.
- Run the mandatory local desktop delivery once, then `npm run release:github`. That command validates data/version/notes, pushes main and an immutable `vX.Y.Z` tag, and starts the Windows release workflow. Inspect Actions until it finishes; report failures rather than claiming a release from a pushed tag alone.
- CI builds the offline Windows installer, a ZIP of the **entire Electron app folder**, the matching `.blockmap`/`latest.yml` pair and SHA256SUMS.txt. It publishes the validated release automatically. A configured signing requirement fails closed; until credentials exist, releases are explicitly unsigned. Never bypass the updater's signature checks or bundle secrets.
- Pages deploys only generated `dist/site` from `site/` and selected local assets. It does not serve the game/internal docs directory. Download URLs derive from the current package version. Pages waits for matching published installer and complete-folder assets; successful release publication explicitly dispatches Pages. The release helper preserves the six known incoming website brief files without adopting them. If unrelated development is dirty, publish the reviewed commit from a clean isolated checkout; never relax its dirty-source guard. Verify the live website and both asset links after release.
- Record the published tag, Actions outcome, installer/folder URLs, local Latest Build shortcut and actual verification limits. Installer execution, a live updater upgrade and hardware/cinematic acceptance are separate work. Moving from the old 4.x app numbers to 1.0.0 requires a one-time manual installer; preserve appId/user-data/save identity.

See [RELEASING](docs/RELEASING.md) and the adapted [GitHub setup spec](alpha-updates/github-setup/SPEC.md). The owner's current public-repo/release request supersedes that spec's old private-only, draft-only and Pages-out-of-scope rules.

Finish with exactly these headings: **Done**, **Skipped or changed**, **Look at**, **Open questions**. State what changed, the checks actually performed, remaining acceptance and any assumptions. Be honest about source, packaging and runtime evidence being separate.
