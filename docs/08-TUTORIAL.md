# 08 — Tutorial

Shown to new players, who start with 2 packs. Short, quiet, skippable. It teaches by highlighting, not by walls of text.

## Principles

- Non-blocking: never trap the player. A tiny "Skip" (mono, dim) is always available, and Esc skips.
- Spotlight, not popups: dim everything except the highlighted element, using a soft dot-grid halo around it (`docs/07-DOT-GRID-CURSOR.md`).
- One instruction on screen at a time, one short line, Inter, dim, fades in with the step.
- The tutorial uses a **real** pack and a real pull. Nothing is faked.
- Progress is saved (`save.tutorial.step`). If the tab closes mid-tutorial it resumes at the same step. `?dev=1` can replay it.

## Steps

| Step id | Highlight | Copy | Advances when |
|---|---|---|---|
| `welcome` | pack | "You have 2 packs." | pack hovered, or after 2.5 s |
| `hold` | pack + `Space` keycap (pulsing) | "Hold Space to open." | the 3 s charge completes |
| `cut` | wrapper's top strip with the shared draw-on highlighter | "Drag across the top to cut." | the tear completes |
| `keep` | Keep button | "Press Space to keep it." | Keep pressed |
| `inventory` | inventory arrow (pulses) | "Your cards live here." | sheet opened, or after 6 s |
| `timer` | timer and miniature stock cards | "A new pack arrives every 2 hours." (text uses `config.packs.regenMs`) | after 4 s |
| `done` | none | none | sets `tutorial.done = true` |

## Rules

- During `hold` and `cut`, the rest of the UI stays hidden as in a normal opening.
- The top highlighter in `cut` repeats every `config.openingMotion.cutGuideMs` until the player starts cutting.
- The top highlighter and label are shared with ordinary opening; the tutorial highlights that area.
- Keyboard-only players: `cut` shows "Press Enter to tear" after 5 s (`docs/04-PACK-OPENING.md`).
- Reduced motion: no pulsing or ghost animation; use static highlights.

## 1.2.0 refresh

Cut advances to Keep across the modern cinematic/direct-flip phases and actual Keep readiness; recovered cards do not replay an already-completed tear. Skip sits below the settings gear, instructions wrap within the viewport, and replay refreshes copy/layout. The inventory lesson pins the pull-up visible.
