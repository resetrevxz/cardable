# Pack remake

Owner brief: remake every pack as a real 3D object (printed front and back, flippable with R, always opened from the front), one milestone at a time, quality over quantity.

| Milestone | Scope | State |
|---|---|---|
| A | 3D pack engine, flip and orbit, front-first opening, Standard, Rare | Implemented; see below |
| B | NVIDIA, AMD, Snapdragon, Apple | Implemented; see below |
| C | Classic, Royal | Implemented; see below |
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

## B: what changed
- `src/ui/pack-face.js`: faces accept `draw`, `cutDraw` and `foil` hooks; shared painting kit (`C.packFaces.kit`); a generic arrival registrar (`defineArrival`) used by every designed pack.
- `src/ui/pack-designs-brand.js` and `src/styles/pack-designs-brand.css`: NVIDIA, AMD, Snapdragon and Apple faces, backs and effects.
- `src/data/brand-packs.js`: `design.face` and a `swapIn` per brand (`rayTrace`, `slashIn`, `bootUp`, `bloom`).
- Rear copy anchored above the barcode on every designed back so it cannot collide at small sizes.
- Liquid is lighter on designed packs so the hold effects read through it.

## C: what changed
- `src/ui/pack-designs-heritage.js` and `src/styles/pack-designs-heritage.css`: Classic and Royal faces, backs, key power-up, pixel-away arrival, glass coat.
- `src/ui/royal-pack-effects.js`: `sideTear` replaces `cutThenBox`. New `royalPack` config values: `doorsMs`, `carpetDelayMs`, `carpetMs`, `carpetHoldMs`.
- `src/ui/card-skins.js` and `src/data/royal-pack.js`: a plated gold frame skin (`royal`) with a set per top tier; Classic's command panel is fuller.
- Engine: per-design silhouette and edge outline (`outline`), designed registry exposed.
- `src/studio/card-face.js`: Studio photos paint the Royal frame too.
