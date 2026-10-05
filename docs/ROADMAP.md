# Roadmap and read routing

Give one authorized milestone per prompt. Read AGENTS.md, Designs.MD, the relevant route below, then OPEN-QUESTIONS.md. Source presence, a commit, a package and runtime acceptance are separate facts. Older stage checklists and acceptance wording are preserved in [the original STAGES](../archive/4.2.0-cleanup/docs/STAGES.md); they are not permission to rerun old suites. Follow [PROMPTING.md](PROMPTING.md).

## Current delivery state

| Work | Implementation / commit | Packaging / runtime evidence | Remaining scope |
|---|---|---|---|
| Classic browser stages 0–8 | Foundation, cards, packs, opening, tutorial, inventory and Data exist on main | Historical reports/QA in indexed archive; source remains file:// classic scripts | Later code, physical devices, full browser/zoom/material matrix are not certified by original checks |
| Settings 11a/11b and permanent variants 12 | Engine/panel, import/export/restore/reset, finish-stack identity integrated | Historical settings/variant records retained | Native files, all material combinations and physical accessibility need scoped acceptance |
| Graphics 13, inventory 14, refresh 15 | Four tiers, static thumbnail browsing, independent cinematic detail and shaded panels | Scoped historical Chromium measurements and regression records | Hardware/GPU/thermal/240 Hz performance not certified |
| Ascendant A/B/C | Current 32.5 s endpoint and settings/renderer contracts integrated | Recorded single Full/Medium/Normal C playthrough | Short/Fast/calm/mono/skip/reload/resize/context loss and wider quality matrix remain unaccepted |
| Secret A/B/C | Current 40 s endpoint, safety limiter, collapse/resurrection and retained field integrated | C launch reached startup, then setup obstruction prevented film playback | C Safe/Full completion and handoff acceptance remain outstanding |
| Pack families / Picker | Brand, Classic, Royal, Titan and durable three-offer Picker source integrated | Their per-update implementation/validation records retained in alpha-updates | Picker rendered choice/reload acceptance remains limited; do not infer complete delivery from branch ancestry |
| Achievements / Journal / Inspect-Studio / detail | Main includes engine/catalog/UI, optional state and Studio/photo routes | Per-update records describe narrower checkpoints; C exercised help and recovery, not every feature | Event capabilities, photos, retained worktree changes and manual UI/hardware gates remain explicit |
| Electron 4.0.0 | Secure bridge, lifecycle, persistence, updater/RPC and release infrastructure integrated | [Archived Electron milestone reports](../archive/4.2.0-cleanup/README.md) record their original test scopes | Public CI/provider, trusted signing and live Discord remain external |
| Desktop 4.1.0 | Mini, taskbar, palette, welcome, captures, help/support scaffolding and History integration committed | [4.1.0 delivery](../alpha-updates/4.1.0-desktop-qol/DELIVERY.md) records one session/checkQol and build limits | Relaunch/files/packaged/signing/device paths remain scoped, not inferred |
| Optimization 4.1.1 / stage 16 | `f914947`: resize feedback, native/mini redundant work and graphics application | [OPTIMIZATION-4.1.1](OPTIMIZATION-4.1.1.md) records its actual regression and measurements | No blanket speed or bug-free guarantee |
| 4.2.0 A / stage 17 | `5240fee`: transactional local delivery, manifests, stable preview and shortcut | [A delivery](../alpha-updates/4.2.0-cleanup/A-DELIVERY.md), subsequent ready hash-verified handoffs | Some interruption/locked/failure paths remain unexercised |
| 4.2.0 B / stage 18 | `14518e2`: one-click per-user installer and PLAY guide | [B delivery](../alpha-updates/4.2.0-cleanup/B-DELIVERY.md), configured installer built | Installer execution/upgrade not accepted for this pass |
| 4.2.0 C / stage 19 | `8620e6a`: first-run actions, bundled help and explicit save recovery | One app session, checkQol 23/23, zero renderer errors and ready delivery; [C report](../alpha-updates/4.2.0-cleanup/C-DELIVERY.md) | Reduced-motion probe, native failure/relaunch/installer/browser/photo gaps remain |
| 4.2.0 D / stage 20 | Documentation consolidation, indexed byte-preserved archive, worktree audit and synchronized 4.2.0 release notes | [D report](../alpha-updates/4.2.0-cleanup/D-DELIVERY.md) records source/archive/reference checks, partial app observation and generated delivery evidence | Help/changelog/console probe incomplete; external/manual gates remain; D does not rerun broad suites |

The primary main is the active checkout. Four feature worktrees remain registered with divergent ancestry, and Card History has an unrelated dirty AGENTS.md; see [STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md). Their presence is not a claim that main lacks the feature, nor permission to delete them.

## Read by area

| Area | Read after root guidance |
|---|---|
| Rules, card/catalog, rarity | ARCHITECTURE, 01-GAME-RULES, 02-RARITIES, 03-CARD; VARIANTS-AND-TAGS for coatings/stack identity |
| Packs/opening | 01-GAME-RULES, 04-PACK-OPENING, CINEMATICS; relevant active pack spec |
| Menu/activity | 05-MAIN-MENU, 07-DOT-GRID-CURSOR, GRAPHICS-UPDATE |
| Inventory/detail/History | 06-INVENTORY, 03-CARD, VARIANTS-AND-TAGS; alpha-updates/2.5.0-card-history and 2.7.0-card-detail |
| Tutorial/settings/Data | 08-TUTORIAL, 11-SETTINGS, 01-GAME-RULES, ARCHITECTURE |
| Achievements | ACHIEVEMENTS, ARCHITECTURE; alpha-updates/2.7.0-achievements for original intent |
| Cinematics/materials | CINEMATICS, 02-RARITIES, GRAPHICS-UPDATE; current Ascendant/Secret specs and their unresolved delivery reports |
| Graphics/performance | GRAPHICS-UPDATE, 06-INVENTORY, GRAPHICS-REFRESH, OPTIMIZATION-4.1.1; BUGS for acceptance limits |
| Studio/Director/photos | ARCHITECTURE, alpha-updates/2.6.0-inspect-director/SPEC.md and IMPLEMENTATION.md; preserve separate IndexedDB blobs |
| Desktop/lifecycle/support | ELECTRON, ARCHITECTURE, PLAY, UPDATES, DISCORD_RPC; relevant 4.1.0/4.2.0 spec |
| Delivery/installation/release | DESKTOP-DELIVERY, BUILDING, RELEASING, PLAY, PROMPTING |
| Structure/docs cleanup | STRUCTURE-AUDIT, archive index, current SPEC; no external-worktree retirement without explicit approval |

## Planned and deferred

No timeline is inferred. [POLISH-BACKLOG](POLISH-BACKLOG.md) retains ranked ideas and manual evidence gates. Multi-select/bulk inventory, saved filters, extra variant slots/combos, absent release-year metadata and additional platforms need their own approved specs. The market and audio remain off. Public GitHub hosting/signing/CI, live updater acceptance and optional Discord credentials are owner follow-ups under the retained github-setup plan. No account, cloud save or online gameplay is introduced.
