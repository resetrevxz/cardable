# 04 — Pack opening

The most important sequence in the game. Build it as a state machine driven by a single timeline, with the pull already decided (`docs/01-GAME-RULES.md`).

Owner-approved remake pass 1 adds **Delete** beside Keep after the same reveal delay. Delete durably resolves the current reserved instance, fades the card away, and returns to the menu without an inventory flight or collection pulse. A pack now awards **$200** in its charge-completion write; a separate silver coin flight heads to the balance. Failed writes preserve both stock and balance. Recovery exposes both decisions and does not pay again. Actions remain within the viewport on short windows. In future multi-card packs, discarded IDs are saved alongside the existing decision count, and only kept instances enter inventory.

## 1. States

```
idle → charging → dissolving → cutting → tearing → rising → preFlip → flipping → settling → revealed → collecting → idle
         ↓ (release early / Esc / blur)
       draining → idle
```

Rules: only one pack can be in the sequence at a time; ignore input that is invalid for the current state; every transition is explicit and logged in dev mode. If `cardsPerPack` is greater than 1, loop `rising → … → revealed` per card, and finish with one `collecting` step.

## 2. Input

- **Hold Space for 3000 ms** (`config.hold.chargeMs`). Ignore `event.repeat`. Call `preventDefault()` so the page never scrolls.
- Releasing early, pressing Esc, `window.blur` or `visibilitychange` (hidden) → `draining`.
- Alternative input for later: pointer press-and-hold on the pack. Abstract input in `src/core/input.js` (`chargeStart`, `chargeEnd`, `cutMove`) so Space and pointer both map to it.
- Accessibility fallback: after the dissolve, a subtle hint appears after 5 s idle — press Enter to tear the pack open.

## 3. Phase details

### charging (0-3000 ms, linear progress)
- Fluid rises inside the pack's glass body from the bottom. The surface wobbles (spring-driven), settles into a slight wave, and becomes more agitated above 70 %. Soft meniscus curve at the edges. Tiny specks drift upward.
- Light leaks through the pack seams, intensity proportional to progress squared. The pack vibrates lightly after 60 % (amplitude up to about 1.2 px).
- Keycap hint "Space" fades in near the pack and visibly depresses while held.
- Dot grid: hold ripples pulse outward from the pack in time with the fill, faster as it nears full.
- Everything else fades to near zero (UI hides during the sequence).
- Optional subtle "tell" for high tiers: slightly stronger light leak (never colored). Keep it faint.

### draining (700 ms)
- The fluid drains back with a small slosh instead of resetting instantly. Vibration and light leak ease out. Then `idle`.

### charge complete → commit
- At 3000 ms: consume the pack, resolve the pull, write `pendingReveal`. Cannot be undone.

### dissolving (900 ms)
- The glass shell and fluid dissolve into fine particles that drift upward, leaving a flat **foil wrapper** (matte-metal sheet with the pack design printed on it, card silhouette inside).
- A faint dashed "cut here" hint appears on the wrapper after 2 s (in the first-time tutorial it is a ghost cut path).

### cutting (no time limit)
- Input: press and drag across the wrapper (`config.cut.requirePress = true`, see OPEN-QUESTIONS #15). Cursor glow becomes a slim "blade" glint.
- Record pointer positions in wrapper-local coordinates every 8 px or so and smooth them.
- Visuals: a thin bright line at the leading point, fading behind it over about 300 ms; thickness reduces slightly with speed. The cut remains as a thin dark seam.
- Resistance: while cutting, the visual blade lags the real pointer (lerp about 0.35) so it feels like dragging through foil.
- The cut does not need to be perfect and may wander.
- Auto-finish: once the path has spanned at least 80 % of the wrapper along its main axis, extend it in a smooth line to the edges and go to `tearing`.
- If the pointer is released early, the partial seam stays; the player can continue later.
- Direction: if |dx| ≥ |dy| the cut splits top/bottom, otherwise left/right.

### tearing (350 ms) and splitting (500 ms)
- Split the wrapper along the cut path into two polygons (extended path + wrapper outline → two `clip-path` / canvas clips).
- The halves lift apart 6-14 px along the cut normal, rotate ±1.2 degrees, and reveal a light gap.
- 20-40 tiny flecks/fibers spray from the seam (white rects/lines, 400-700 ms, light gravity).
- Fragments then fall away (translateY 40-120 px, opacity to 0, 700 ms).

### rising (`reveal.riseMs`)
- The card face-down emerges from the wrapper: rises about 12 % of its height, scales 1.00 to 1.06, rotates ±6 degrees on Y. Its back shows the logo and serial.

### preFlip (`reveal.preFlipPauseMs`)
- A hold of anticipation. The card hovers, the light intensifies, the dot grid dims to `reveal.gridDim`, the tier's bloom fades in, and if `shiftPx` is 1, the screen shifts once by 1 px. Commons skip this (0 ms).

### flipping (`reveal.flipMs`)
- 3D flip about the Y axis with ease-in-out, slight overshoot at the end (spring), a small lift and scale (1.00 to 1.08 to 1.00).
- **Signature moment:** when the face passes 90 degrees, one white shine sweeps the card from one corner to the opposite corner in about 700 ms (soft-edged, angled about 20 degrees, `overlay`/`soft-light`). Match `references/01-shine.png`.
- Cursor glow disappears during the flip.

### settling (about 1.2 s)
- The card lands with a small bounce, a puff of light dust (8-14 tiny particles), and the shadow tightens.
- The card now tilts toward the cursor (full mode).
- Info arrives in sequence: name (fade), serial (stamp, +180 ms), specs (one by one, 80 ms apart), tier badge, tier meter fills segment by segment (about 40 ms each).
- **First time this card is pulled:** reveal +200 ms longer and a soft "New" label. **Duplicate:** 15 % shorter (not for tiers 7+) and a "x2" note.
- A quiet **Keep** button appears 400 ms after the last item. Enter or click activates it. Guard against a still-held Space triggering it.

### collecting (about 900 ms)
- On Keep: the card scales down and its thumbnail (lite mode) flies toward the inventory arrow. A small glass toast slides in from the bottom: thumbnail, name, "Added to inventory". The arrow pulses once when the thumbnail lands. The toast stays 2.4 s.
- Then the menu returns gently (200 ms delay), the pack timer fill continues from where it was, and the UI fade timer restarts.

## 4. Rarity scaling

Use `reveal` values from `docs/02-RARITIES.md`. Commons are quick; higher tiers get longer rise, a pause before the flip, a slower flip, more bloom and a deeper grid dim. Secret and Ascendant may add one extra flourish each (Secret: the scrambling logo appears on the card back for 400 ms before the flip).

## 5. Edge cases

- Reload during `charging`: nothing consumed. Reload after commit: resume at `revealed` (no animation) with the pending card and Keep.
- Two stored packs: after collecting, the second pack slides forward.
- Reduced motion: charge is a plain fill; dissolve and tear become crossfades; flip becomes a crossfade with one soft shine; no particles, ripples or sway.
- Cancel is never possible after commit.

## 6. Dot grid and cursor during the sequence

See `docs/07-DOT-GRID-CURSOR.md`. Summary: hold ripples while charging, normal near-cursor dots while cutting, grid dims to `gridDim` from `preFlip` on, cursor glow off during the flip.
