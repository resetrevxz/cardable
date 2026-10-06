# AGENTS.md — current Cardable working guide

Cardable 4.2.0 is an offline GPU-card collector, delivered as a classic-script browser game and a Windows Electron app. Collecting, opening and recovery share the same renderer and save contracts. The card is the showstopper; the surrounding UI stays quiet.

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

- Current/planned specs remain in `alpha-updates/4.2.0-cleanup` and `alpha-updates/github-setup`. Earlier specs and integration records live in [archive/update-history](archive/update-history/README.md). Consult history only when needed; do not reapply its patches.
- Outer historical outputs and stage helpers live in `D:/CardableV2/archive/artifacts`. Four divergent feature worktrees remain registered under `D:/CardableV2/archive/worktrees`; relocation did not merge, reset or retire their branches. Card History's local AGENTS edit is preserved.
- [STRUCTURE-AUDIT](docs/STRUCTURE-AUDIT.md) and [organization provenance](archive/workspace-organization/README.md) explain exact moves, hashes and restore paths. The user's follow-up authorized this wider reversible organization; older blanket instructions to keep duplicate aliases/folders in place are superseded.
- Preserve unrelated dirty changes, untracked incoming specs, ignored dependencies and player data. Never use broad staging, reset or recursive cleanup. Verify absolute paths and links before moving/deleting; unlink a junction without touching its target.
- Use a separate Git worktree when concurrent implementation requires isolation. Inspect existing registrations first. Do not discard a divergent worktree just because its feature exists on main.

## Verification and completion

The current owner policy forbids old suites, new test files, screenshots, recordings and profiling. Do not run package test scripts or archived harnesses without a new authorization changing that policy. When relevant game logic changes, use the existing `Cardable.dev.checkQol()` manually once at the end of the last authorized milestone; otherwise one app session/feature and console check is permitted. For documentation/organization changes, use reference, hash, Git-state and build validation. Report the actual evidence and its limits.

Implement the authorized scope; put unrelated ideas in [POLISH-BACKLOG](docs/POLISH-BACKLOG.md). Review the focused diff, validate it, and commit owned files as `stage N: <name>` (stage 22 is the workspace organization follow-up). Never stage someone else's pending deletion or incoming spec.

At the end of every completed implementation or approved documentation prompt, run `npm run deliver:desktop` once from the repository (or the outer forwarding command). Report the installer, stable **Cardable (Latest Build)** shortcut, cleanup and any pending handoff. See [DESKTOP-DELIVERY](docs/DESKTOP-DELIVERY.md). Read-only questions/internal steps do not rebuild; explicit user instructions to skip/narrow delivery take precedence.

Delivery does not authorize installing, launching, publishing, elevating or force-closing Cardable. Preserve the last good delivery if replacement fails or is locked. Do not add watchers/cron or bump the app version per prompt; delivery build IDs identify revisions.

Finish with exactly these headings: **Done**, **Skipped or changed**, **Look at**, **Open questions**. State what changed, the checks actually performed, remaining acceptance and any assumptions. Be honest about source, packaging and runtime evidence being separate.
