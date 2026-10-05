# Structure and ownership audit — 4.2.0

Audited 2026-10-06 from primary `main` at `8620e6ae904882ad974eb761057b04e48e4f4d39`, before D edits. [Machine-readable provenance](../archive/4.2.0-cleanup/audit.json) records exact archive paths, byte counts, SHA-256, tracking, baseline dirty state and worktrees. This audit separates source presence, ancestry, delivery and acceptance.

## Keep, consolidate and archive map

| Area | Decision | Reason and current route |
|---|---|---|
| Primary `D:/CardableV2/cardable-spec/cardable` | Keep in place | Actual Git root; `index.html`, file origin, appId and player storage must remain stable. |
| AGENTS.md / Designs.MD | Keep filenames | Principles and tokens lead Designs; one identical Stage 14 section removed. Approved exceptions and unique component rules retained. No rename for aesthetics. |
| ARCHITECTURE | Consolidate | Current classic-script, Electron/preload/IPC/storage/build routes; registries, events and extension recipes retained. The alleged duplicate Stage 14 paragraph was absent from this checkout's original Architecture. |
| CINEMATICS / ROADMAP / ACHIEVEMENTS | Promote canonical docs | Superseded milestone narration is archived; current timing, safety, catalog/API and acceptance remain visible. RARITY-INTROS/STAGES retain compatibility routes. |
| CUT-SWIPE / OPENING-QOL | Consolidate into 04-PACK-OPENING | Swipe coverage, resume tolerance, accessible alternatives, Space guard, refill/title and evidence limits preserved; original snapshots and small redirects retained. |
| IDLE-ACTIVITY | Consolidate into 05-MAIN-MENU | Idle/AFK, credit visibility, proximity and wake/reveal preservation retained. |
| INVENTORY-PERFORMANCE | Consolidate into 06-INVENTORY | Static front thumbnails, sole full detail, mount budgets, cached metadata and shaded surfaces retained. Historical measurements remain archived. |
| GRAPHICS-QA | Consolidate into GRAPHICS-UPDATE | Current controls plus scoped historical evidence and hardware limits; old JSON preserved, no universal FPS promise. |
| BUGS / POLISH-BACKLOG | Active gates and ideas | Fixed issue tables and implementation narratives archived; deferred/manual evidence and ranked future work stay active. |
| Historical reports, raw QA, original prompt | Archive exact owned files | 47 tracked reports/QA/prompt files moved into indexed archive; 12 original consolidation inputs snapshotted byte-for-byte. No evidence purged. |
| Numbered gameplay docs / OPEN-QUESTIONS / VARIANTS-AND-TAGS | Keep | Preserve gameplay and approved defaults; correct stale variant, stock, inventory-render and template wording. |
| BUILDING / RELEASING / desktop docs | Keep and refresh | Separate player setup from development; current version, paired release assets, restricted testing and delivery command. |
| `src/`, `assets/`, `vendor/`, `electron/`, `tools/`, `tests/` | Keep | Runtime, local resources and actual test runners remain. Docs cleanup adds no game rules, new tests or renderer rewrite. |
| package/lock/builder/release config / `.github/` / LICENSE / changelogs | Keep | Stable packaging identity and dependencies; synchronize only app version and both release-note consumers to 4.2.0. |
| `dist/`, dependencies, QA output, outer workspace artifacts | Keep as generated/external | Ignored output is not source or a save directory. Only delivery tooling may prune its exact superseded owned artifacts after successful replacement. |

## Two alpha names and incoming work

`alpha updates` is a Windows **junction** whose resolved target is this checkout's `alpha-updates`. The per-spec comparison in audit.json confirms the same bytes through both names; these are aliases, not independent trees. Keep the compatibility junction, do not recursively move/delete it, and stage only canonical hyphenated paths. Historic Git entries through the alias are not authority to rewrite incoming files.

Keep every current alpha-update folder: several include contracts, integration patches or unfinished/manual acceptance. In particular, Ascendant/Secret runtime completeness cannot be inferred from commits; Picker's rendered flow and recovery coverage remain limited. Do not reapply integration patches. The 3.0.0 Electron spec is historical input; 4.0.0 milestone records establish actual implementation, and 4.1.0/4.2.0 delivery records describe subsequent scopes. Specs are retained rather than marked fully accepted and archived wholesale.

Incoming/planned `4.1.0-desktop-qol`, `4.2.0-cleanup`, and `github-setup` files stay in place, including untracked material. The tracked ORIGINAL-PLAN-v2 now routes to its intact indexed archive; its destructive suggestions are superseded by SPEC.md. The preexisting missing `4.0.0-electron/SPEC.md` under both spellings is preserved as a dirty deletion; it is not reconstructed or staged by D. Existing Electron evidence now routes to archived reports, without a dangling active link to that absent spec.

## Registered worktree audit

Counts below are `main-only / branch-only` commits at the audit baseline. Patch-equivalent feature integration does not establish merged ancestry or safe retirement.

| Registered path | Branch / HEAD | Dirty or untracked | Divergence | Decision |
|---|---|---|---|---|
| `D:/CardableV2/achievements-ab` | `update/achievements-ab` / `82271ab` | None observed | 21 / 5 | Keep |
| `D:/CardableV2/card-history-work` | `update/card-history` / `12cd96b` | Modified AGENTS.md; no untracked observed | 21 / 5 | Keep |
| `D:/CardableV2/inspect-director-work` | `update/inspect-director` / `f43ced5` | None observed | 19 / 8 | Keep |
| `D:/CardableV2/picker-pack-work` | `update/picker-pack` / `6ee8770` | None observed | 18 / 5 | Keep |

No feature HEAD is an ancestor of primary main. All four remain registered and untouched. Retirement requires a separate audit of dirty, ignored, untracked and unmerged contents, explicit user approval, and Git-aware or managed archival. No worktree is moved inside another repository. Outer baseline/review/output folders were not adopted as owned cleanup targets.

## References and acceptance

Current read routing is [ROADMAP.md](ROADMAP.md). Historical Markdown and QA path references are resolved through [the archive index](../archive/4.2.0-cleanup/README.md); archived originals retain their original bytes and source-relative context. Compatibility filenames remain for older prompts. Active local Markdown targets are checked after consolidation; original archive links are provenance, not current runnable guidance.

[BUGS.md](BUGS.md), [CINEMATICS.md](CINEMATICS.md) and [D-DELIVERY.md](../alpha-updates/4.2.0-cleanup/D-DELIVERY.md) retain unresolved runtime, physical-device, installer, motion and external acceptance. Hosting/signing/Discord require owner configuration. This shared checkout is not globally clean.
