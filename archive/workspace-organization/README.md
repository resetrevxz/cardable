# Workspace organization — 2026-10-06

The owner explicitly requested cleanup of the outer workspace, duplicate alpha shortcuts, outdated docs and root guidance after 4.2.0 milestone D. This archive preserves the prior guidance and moved reports. Current instructions are [AGENTS](../../AGENTS.md), [Designs](../../Designs.MD), [ROADMAP](../../docs/ROADMAP.md) and [STRUCTURE-AUDIT](../../docs/STRUCTURE-AUDIT.md).

[manifest.json](manifest.json) maps exact original/destination paths and SHA-256 values, including external artifacts and registered worktrees. Its source baseline is main `96333560a8d640560e18ee9d000fd8368576a081`. It records preexisting dirty deletions/untracked incoming specs, which are not adopted as unrelated work.

- `originals/`: byte-preserved pre-rewrite AGENTS.md, Designs.MD, STRUCTURE-AUDIT, ROADMAP and PROMPTING.
- `docs/`: old compatibility stubs, the V3 narrative and dated graphics/optimization/updater implementation reports removed from active docs.
- [../update-history](../update-history/README.md): past alpha-update specs, delivery records, integration patches and empty placeholders, retaining original directory names.
- `D:/CardableV2/archive/artifacts`: historical output/snapshots/stage helpers; all moved files are verified against their captured hashes.
- `D:/CardableV2/archive/worktrees`: four Git-registered feature worktrees; branch histories and the local Card History AGENTS edit are preserved.

Archived documents retain their original bytes and original source-relative link context. Resolve original paths with the manifest/archive indexes; do not treat old plans, commands or milestone states as current authorization. The original D archive under [../4.2.0-cleanup](../4.2.0-cleanup/README.md) remains intact.

To recover artifacts, find their original/destination pair in the manifest, verify the recorded hashes and move the exact folder/file to a checked, free destination. Worktrees must be moved with `git worktree move`; their old locations are not independent copies. Do not move the primary game or overwrite player data. Reintroducing duplicate junctions is unnecessary.
