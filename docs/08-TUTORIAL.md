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
| `cut` | wrapper with a ghost cut path animating across it | "Slide across to cut." | the tear completes |
| `keep` | Keep button | "Keep it." | Keep pressed |
| `inventory` | inventory arrow (pulses) | "Your cards live here." | sheet opened, or after 6 s |
| `timer` | timer and stock vials | "A new pack arrives every 8 hours." (text uses `config.packs.regenMs`) | after 4 s |
| `done` | none | none | sets `tutorial.done = true` |

## Rules

- During `hold` and `cut`, the rest of the UI stays hidden as in a normal opening.
- The ghost path in `cut` repeats every 3 s until the player starts cutting.
- The ghost path and the "cut here" hint are the same element, styled by a `tutorial` flag.
- Keyboard-only players: `cut` shows "Press Enter to tear" after 5 s (`docs/04-PACK-OPENING.md`).
- Reduced motion: no pulsing or ghost animation; use static highlights.
