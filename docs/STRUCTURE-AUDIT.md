# Current workspace structure and ownership

The 2026-10-06 follow-up implements the owner's wider workspace organization request. Milestone D had archived selected files inside the repository while leaving the outer workspace, duplicate junctions and compatibility documents in place. That earlier keep-in-place policy is superseded by this request. The original audit/guidance is preserved in [organization provenance](../archive/workspace-organization/README.md).

## Locations

| Area | Current location and decision |
|---|---|
| Primary game/Git root | `D:/CardableV2/cardable-spec/cardable` — unchanged to preserve file origin and local storage |
| Current/planned specs | Primary `alpha-updates/4.2.0-cleanup` and `alpha-updates/github-setup` |
| One convenient outer alias | `D:/CardableV2/alpha-updates` — junction to the primary spec folder |
| Historical update specs/patches | Primary `archive/update-history/`; original folder names and bytes preserved |
| Historical consolidation/evidence | Primary `archive/4.2.0-cleanup/`; earlier archive remains intact |
| Superseded active docs/guidance | Primary `archive/workspace-organization/`; snapshots, reports and move manifest |
| Old outputs and stage helpers | `D:/CardableV2/archive/artifacts/`; includes outputs, stage11a snapshots/helpers and an empty literal `%SystemDrive%` generated tree |
| Registered feature worktrees | `D:/CardableV2/archive/worktrees/`; relocated using `git worktree move`, not merged or deleted |
| Current generated runtime/build files | Primary dependencies, `dist`, QA output and resource/tool folders remain in their expected locations |

Both space-spelled `alpha updates` junctions were unlinked without traversing or deleting their target. The canonical real spec directory remains. Historical Git entries under the duplicate alias are removed; the preexisting missing 4.0.0 Electron spec deletion remains outside this change. Incoming `github-setup` stays untouched and untracked.

The outer README maps the workspace, and its private package forwards npm commands into the actual game. The app remains version 4.2.0. No save, photo, game source, dependency, release identity or player profile is moved by this organization.

## Worktrees and recovery

| Folder under outer `archive/worktrees` | Branch | Preserved HEAD | Local state |
|---|---|---|---|
| achievements-ab | update/achievements-ab | 82271abc5f2b3b934ce966e7e01536effe2bacd2 | Clean |
| card-history-work | update/card-history | 12cd96b518e6b3f4cf29818f5f7d4e9a231ec31f | Modified AGENTS.md preserved byte-for-byte |
| inspect-director-work | update/inspect-director | f43ced5b38fc84aef1fb9b5c199fc8bd99871235 | Clean |
| picker-pack-work | update/picker-pack | 6ee8770e44df87361c82c369b6d2add951f3e8d5 | Clean |

These branches remain divergent. Their features being present on main does not make their branch history disposable. HEAD, branch, status and dirty-file hashes are checked before/after relocation. Use the registered new paths for future work. To restore an old path, use `git worktree move` from its current path to the old path after checking the destination is free; ordinary folder moves are not the worktree recovery procedure.

## Archive integrity and references

[manifest.json](../archive/workspace-organization/manifest.json) records source HEAD, initial dirty state, original/destination paths, every archived file's byte count/SHA-256, link targets, snapshots and worktree state. A copy is stored in the outer archive. Inventory/hash checks do not follow junctions. The historical outputs' one internal `src` junction is retargeted to its moved baseline source; links to the primary assets/vendor and bundled dependencies retain their targets.

Active docs route directly to canonical guidance. Old compatibility stubs and dated graphics/updater implementation reports are archived rather than left in `docs/`. Historical originals retain source-relative context and are read as evidence; their old paths/commands are not runnable current instructions. The archive index maps original locations to destinations. Empty historical spec placeholders are preserved in the historical tree rather than cluttering the active spec directory.

## Validation boundaries

This pass validates archive hashes, worktree registration/state, junction targets, current local Markdown references, focused Git hygiene and the required desktop delivery. It changes documentation and filesystem organization, not game behavior. No old suites, new test files, screenshots, profiling, app/installer execution or hardware acceptance is implied. [BUGS](BUGS.md), [CINEMATICS](CINEMATICS.md) and [ROADMAP](ROADMAP.md) keep unresolved acceptance visible. Public hosting, trusted signing and live update acceptance remain external owner setup.
