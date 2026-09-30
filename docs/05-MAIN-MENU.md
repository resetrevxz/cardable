# 05 — Main menu

Quiet, centered, lots of empty space. The pack is the hero.

## 1. Layout

```
wordmark (TL, small)                                   currency (TR)

                         [ pack ]
                         timer / stock

                              ˄   <- inventory arrow (BC)
```
Nothing else. A hidden `#market-slot` container exists for the future market and is empty and hidden.

## 2. Idle fade

After 2.5 s without pointer movement, everything except the pack fades out over 600 ms. Movement restores it in 150 ms. Never fade during: open inventory, tutorial step, opening sequence, a visible toast. The pack keeps breathing.

## 3. The pack

- Materials: glass body with a foil wrapper design. Distinct pack types differ by finish (matte, glass, brushed metal), not by color (`src/data/packs.js` `design`).
- **Ready:** opaque, floats (about 4-6 px over 6 s), leans toward the cursor with a following shine, gentle breathing shadow.
- **Waiting (no pack ready):** the pack is **transparent** (glass outline only) and **fills with fluid** according to `progress(now)`. The fluid has a soft meniscus, tiny specks drifting, and eases continuously (no per-second stepping).
- **Ready moment** (`pack:ready`): the fluid completes, a single bright line sweeps across the pack, the pack becomes opaque, and the pack lifts slightly.
- Two stored packs: shown stacked with depth (the back one smaller, dimmer, slightly blurred), floating slightly out of sync.
- Hover before holding: the pack leans toward the cursor and its shine follows. Keycap hint "Space" appears near the pack on hover, and on the first visit even without hover.

## 4. Timer and stock indicator

- Countdown under the pack, mono and tabular. Format from `docs/01-GAME-RULES.md` (`7h 12m`, `42m 10s`, `38s`). Digits roll like a mechanical counter; only the changed digit animates.
- Show it small and dim; the exact time is fully visible on hover, and the fluid fill carries the meaning at a glance.
- **Stock indicator:** two small glass vials/capsules under the pack (one per stored pack slot). A vial fills with fluid (snappy, with a small slosh) when a pack arrives and drains when one is opened.

## 5. Currency

Top-right, mono, tabular. Value counts up when it changes, with a brief shimmer across the number. v1 has no earning or spending (`docs/01-GAME-RULES.md`).

## 6. Inventory arrow

Bottom-center chevron that breathes slowly and occasionally nudges upward. Hover: rises 3 px and brightens. Also show the top few pixels of the frosted sheet peeking above the bottom edge, with the tops of the first cards, as a hint of what is inside. Click, drag up, or press ArrowUp / I opens it (`docs/06-INVENTORY.md`).

## 7. Wordmark and letter morph

- Wordmark `cardable` (lowercase), Inter 600, tight letter-spacing, built as an **inline SVG (or one span per letter)** so each letter is animatable. The logo mark for the favicon and the card back is a simple monochrome "c" derived from it.
- **Hover behavior:** letters swap one at a time into alternate glyphs and back, in a looping wave while the pointer stays over it. Each swap is a quick vertical roll (about 200 ms) with a blur; stagger 40 ms per letter; the full loop is about 1.6 s. On pointer leave, finish the current swaps and settle to the real letters.
- Default glyph map in `config.logoMorph` (only `a` and `l` were specified; the others are suggestions to edit):

| letter | glyph |
|---|---|
| c | ( |
| a | @ |
| r | ® |
| d | ∂ |
| a | @ |
| b | 6 |
| l | / |
| e | € |

- Rarely (about once per minute of idle time) run one silent wave on its own.
- Reduced motion: no morph; the wordmark only brightens on hover.

## 8. Tab title and favicon

Set by the pack/timer system (`docs/01-GAME-RULES.md` section 8).

## 9. Load-in

Wordmark fades in first, then the pack, then currency and arrow, staggered 100-150 ms.
