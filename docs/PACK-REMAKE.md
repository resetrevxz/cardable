# Pack remake

Owner brief: remake every pack as a real 3D object (printed front and back, flippable with R, always opened from the front), one milestone at a time, quality over quantity.

| Milestone | Scope | State |
|---|---|---|
| A | 3D pack engine, flip and orbit, front-first opening, Standard, Rare | Implemented; see below |
| B | NVIDIA, AMD, Snapdragon, Apple | Not started |
| C | Classic, Royal | Not started |
| D | Titan, Picker | Not started |
| E | Design refinement across all packs | Not started |

## A: what changed
- `src/ui/pack-markup.js`: a unit is two faces plus extruded edge strips under one `perspective()` pose; the back is built lazily; `foil()` and `setPack()` build designed faces.
- `src/ui/pack-face.js`: Standard and Rare painters, network, grid, mosaic, chameleon and cut dots; ResizeObserver repaint; Studio and transition snapshots.
- `src/ui/pack-interaction.js`, `pack.js`, `pack-fluid.js`: flip and orbit springs, per-face lighting, mirrored fluid on the back.
- `src/ui/opening.js`: yaw handoff, charge hook, foil face effects.
- `src/styles/pack-3d.css`, `src/data/key-actions.js`, `src/data/packs.js`, `src/config.js`.
- `C.dev.checkPackFaces()` (Dev workspace, Checks).
- Fixed a mojibake separator in the cut hint.

## Verification limits
Checked in a browser session at 1280x720: Standard front and back, Rare front and back, a flip captured mid-turn at a fixed angle, Very Low and Low tiers, hold and cut for Rare and Standard, opening from a flipped pack, chameleon arrival, Keep and collect after a reveal, and a legacy pack (NVIDIA) front and back. Not checked: real hardware frame rates, Very High, touch, the packaged Electron app, the monochrome theme, the 1920x1080 composed layout.
