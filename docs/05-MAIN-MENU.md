# 05 — Main menu

## 2.1.0 brand packs

Normal slots have a combined 5% brand-pack chance, split equally across NVIDIA, AMD, Snapdragon and Apple. Every fourth slot stays Rare and the two starting tutorial packs stay Standard. The upcoming type is stable per save/opening number. Brand wrappers show a Cardable header above the company logo and brand-only caption, with colored waiting/refill fluid. Counter slots keep stock semantics while their markers, info menu and title follow the next type. Ordinary menu type changes turn through a foil back; reduced motion and low animation use fades. The post-Keep handoff arrives directly at the menu wrapper without replaying its old slide-in.

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

After 15 s without activity, secondary controls fade out over 600 ms. Keep the pack, timer, stock/refill visualizer, card/pack counts and a wordmark scaled to 65%. Activity restores the controls. Open inventory, tutorial, opening and visible-toast contexts retain their own presentation. After 10 minutes, the AFK view hides the scene and panels and pauses decorative rendering while timestamp-driven metrics remain live. See `05-MAIN-MENU.md`.

## 3. The pack

- Materials: glass body with a foil wrapper design. Distinct pack types differ by finish (matte, glass, brushed metal), with the approved pack-surface palette exceptions in Designs.MD (`src/data/packs.js` `design`).
- **Ready:** opaque, floats (about 4-6 px over 6 s), leans toward the cursor with a following shine, gentle breathing shadow.
- **Waiting (no pack ready):** the pack is **transparent** (glass outline only) and **fills with fluid** according to `progress(now)`. The fluid has a soft meniscus, tiny specks drifting, and eases continuously (no per-second stepping).
- **Ready moment** (`pack:ready`): the fluid completes, a single bright line sweeps across the pack, the pack becomes opaque, and the pack lifts slightly.
- Two stored packs: shown stacked with depth (the back one smaller, dimmer, slightly blurred), floating slightly out of sync.
- Hover before holding: the pack leans toward the cursor and its shine follows. Keycap hint "Space" appears near the pack on hover, and on the first visit even without hover.

## 4. Timer and stock indicator

- Countdown under the pack, mono and tabular. Format from `docs/01-GAME-RULES.md` (`7h 12m`, `42m 10s`, `38s`). Digits roll like a mechanical counter; only the changed digit animates.
- Show it small and dim; the exact time is fully visible on hover, and the fluid fill carries the meaning at a glance.
- **Stock indicator:** four miniature silver card backs under the pack, one per stored pack slot. Stored cards appear filled; the next empty slot fills continuously from the same two-hour timestamp as the countdown. Further slots stay empty. An arriving card lifts slightly and catches a quick silver sweep; opening a pack eases its slot back toward the current refill level. Reduced motion keeps the fill and replaces movement with a brief shine.

## 5. Currency

Top-right, mono, tabular. Value counts up when it changes, with a brief shimmer across the number. The owner-approved opening commit grants $200 once; no spending UI is introduced (`docs/01-GAME-RULES.md`).

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

## 2.0.0 Queue presentation

The front and rear wrappers display upcoming positions one and two, including during regeneration. The stock row still displays stored fills and first-empty refill progress; schedule markers overlay those slots independently. Rare positions have a blue ring, glossy thumbnail and R+ glyph. Markers retain lifetime keys through 250 ms spring advancement; consumed markers burst and retire, while new markers fade in four openings ahead. Reduced motion uses fades. Show R+ in N beyond the visible row and one saved introduction when Rare first becomes next, deferred while game dialogs/tutorial/opening are active. The ready Rare title is Cardable - Rare pack ready.

## Idle, AFK and inventory proximity (current)

- The default idle delay is 15 seconds. The setting offers 15 seconds, 30 seconds or Never; existing 2.5/5-second settings normalize to the new default. Mouse/pen movement, pointer presses, keyboard input, wheel movement and text input reset inactivity.
- Ordinary idle keeps the pack, countdown, total owned-copy count, stored-pack count and next-pack stock fill visible. The wordmark scales to 65%. Existing inventory/tutorial/opening/toast holds retain their presentation.
- Credits independently fade after the configured inactivity delay even while a keyboard or panel visibility hold keeps the rest of the interface visible. Activity restores them. See `04-PACK-OPENING.md`.
- At 10 minutes, AFK is independent of idle-fade settings and visibility holds. Card/pack visuals, panels, dots, cursor and performance display hide. The shared scheduler runs only the pack metrics subscriber, with static digit updates on timer ticks. Refills and tab title still use the original timestamps. Returning from a hidden tab re-evaluates elapsed inactivity.
- Activity wakes the existing scene without keeping, deleting or rerolling a card. A reserved reveal remains in the same phase and the same save.
- Inventory opacity ranges from 32% away to 100% nearby, with a 600ms fade. Keyboard focus keeps controls readable. Within 160px of the sheet/button, the current bounded Shelf/Grid thumbnails mount at opening geometry before a session starts. Dragging exposes card content before release. Leaving the closed sheet releases the thumbnails; proximity alone never writes selection preferences or ownership.
- The settings gear is visible on the resting menu, including during the tutorial. Inventory, detail, dragging, opening and settings panels suppress it. Idle/AFK presentation still hides secondary chrome; activity restores it.
