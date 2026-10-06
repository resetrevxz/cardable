# Cardable workspace

The active game and Git repository are in [cardable-spec/cardable](cardable-spec/cardable). Double-click its index.html for offline browser play. For the Windows app, use **Cardable (Latest Build)** on your Desktop or the latest installer named by the game's dist/delivery/latest.json. See [PLAY](cardable-spec/cardable/PLAY.md).

| Location | What belongs here |
|---|---|
| cardable-spec/cardable | Current game, source, dependencies, current docs and desktop builds |
| alpha-updates | The single junction to current/planned specs in the game |
| archive/artifacts | Old outputs, stage11a snapshots/helper files and an empty generated cache tree |
| archive/worktrees | Four preserved Git-registered feature branches, including Card History's local edit |
| archive/manifest.json | Original-to-current move map, archived file hashes and worktree/link checks |

Past update specs are in the game's [archive/update-history](cardable-spec/cardable/archive/update-history/README.md), and obsolete docs/guidance are in [archive/workspace-organization](cardable-spec/cardable/archive/workspace-organization/README.md). The two space-spelled alpha aliases are removed; the canonical folder is intact.

The private package.json forwards development commands to the actual repository. `npm run dev`, `npm start`, and `npm run deliver:desktop` work from here. Players do not need npm. Follow [AGENTS](cardable-spec/cardable/AGENTS.md) and [Designs](cardable-spec/cardable/Designs.MD) for development; current verification restrictions still apply.

The active game path, save origin, installed user data and photos remain unchanged. Moving worktrees into the archive did not delete, merge or reset them. Use `git worktree list` in the game to locate them; restore their locations with `git worktree move`, not an ordinary folder move.
