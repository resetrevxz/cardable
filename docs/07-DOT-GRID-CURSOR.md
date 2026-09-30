# 07 — Dot grid and cursor

The dot grid is invisible until the pointer is near. It is the game's signature ambient effect.

## 1. Implementation

- One full-screen `<canvas>` at `--z-grid`, sized with `devicePixelRatio`, resized on window resize.
- Dots on a regular grid. Each dot is drawn only if it has any visible energy (alpha above a tiny threshold).
- One shared `requestAnimationFrame` loop. **Sleep** (stop scheduling frames) when there is no pointer motion, no ripple and no trail energy. Wake on pointer move, click or any hold.
- Grid is drawn behind the menu and remains faintly visible through the inventory sheet's glass.

## 2. Parameters (put in `config.dots`)

| Param | Default | Meaning |
|---|---|---|
| spacing | 26 px | grid pitch |
| baseRadius | 0.9 px | dot radius at rest energy |
| maxRadius | 2.2 px | radius at full energy (dots grow near the cursor, like a lens) |
| influenceRadius | 170 px | cursor influence distance |
| falloff | smooth (gaussian or smoothstep) | never a hard circle |
| baseAlpha / maxAlpha | 0 / 0.55 | dots invisible at rest |
| lean | 1.5 px | dots drift away from the cursor (gravity-like) |
| trailDecayMs | 400 | brightness of a passed dot cools off, so fast movement draws a faint comet line |
| rippleMs | 600 | click ripple lifetime |
| rippleSecondDelayMs | 120 | second, fainter ring trails the first |
| rippleSpeed | 700 px/s | ring expansion speed |

## 3. Effects

1. **Hover reveal:** dots near the cursor appear and grow, with smooth falloff.
2. **Lean:** dots shift 1-2 px away from the cursor. Barely visible; it should read as physical.
3. **Trail:** each dot has a `heat` value set when the cursor passes; it decays over `trailDecayMs`.
4. **Click ripple (anywhere):** a ring of brightened dots expands from the click point, brightest at the center, fading over about 600 ms; a second fainter ring follows 120 ms later (55 % intensity).
5. **Hold ripples:** while the pack charges, rings pulse outward from the pack center in time with the fill, faster as it nears full.
6. **Focus dim:** during the reveal, dim the grid to `1 - gridDim` overall (see `docs/02-RARITIES.md` table) with a soft halo of visible dots around the card.
7. **Tutorial spotlight:** the grid can hold a soft halo around a highlighted element (`docs/08-TUTORIAL.md`).
8. **Sheet:** with the inventory open, keep the grid at low energy.

## 4. Cursor glow (`src/fx/cursor.js`)

- A soft white radial glow (about 220 px, low opacity) that **lags** the real pointer slightly (easing about 0.18) and is drawn with `mix-blend-mode: screen`.
- Personality by context:

| Context | Cursor |
|---|---|
| default | soft glow |
| over a button or card | glow shrinks to a small ring; grows about 10 % |
| cutting | slim "blade" glint aligned with the motion direction |
| during the flip | hidden |
| idle 2.5 s | fades with the rest of the UI |

- Hide the native cursor only over the pack wrapper while cutting, and keep it elsewhere for accessibility.
- Touch devices: no glow (v1 is desktop).

## 5. Rules

- Colors: white only. Never tinted by rarity.
- Reduced motion: no lean, no trail, no ripples; hover reveal becomes a simple opacity change.
- Budget: a 1920x1080 grid at 26 px is about 3,000 dots; that is fine per frame, but compute only dots inside the influence radius plus active ripples.
