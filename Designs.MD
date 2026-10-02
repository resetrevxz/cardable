# Designs.MD — Cardable design system

Single source of truth for look and feel. These rules apply to every screen. Screen-specific behavior lives in `docs/`.

## 1. Principles

1. The card is the showstopper. Everything else is quiet.
2. Quality over quantity. If a screen feels busy, remove things.
3. Content first, chrome second. UI hides when it is not needed.
4. One light source, one easing family, one glass recipe, used everywhere.
5. Motion communicates. Fast for UI (200-300 ms). Slow only for the card reveal.
6. Nothing pops. Everything enters and exits with a transition, staggered 50-100 ms.
7. Premium = restraint + precision: exact spacing, concentric radii, tabular numbers.

## 2. Tokens

Put these in `src/styles/tokens.css`. Never hard-code a value that has a token.

```css
:root {
  /* surfaces */
  --bg: #08080A;
  --bg-elev: #0E0E11;
  --surface: #111114;
  --surface-2: #17171B;
  --glass: rgba(255,255,255,.06);
  --glass-strong: rgba(255,255,255,.09);
  --hairline: rgba(255,255,255,.10);
  --hairline-strong: rgba(255,255,255,.16);
  --keyline: #020203;              /* near-black outline used on cards */

  /* text */
  --text: #F5F5F7;
  --text-dim: #8E8E93;
  --text-faint: #48484A;
  --highlight: #FFFFFF;

  /* type */
  --font-ui: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* radii (inner = outer - padding, keep nested corners concentric) */
  --r-card: 20px; --r-pack: 22px; --r-sheet: 28px; --r-button: 12px; --r-chip: 999px;

  /* spacing (4 px base) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 72px;

  /* motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --t-fast: 150ms; --t-ui: 250ms; --t-sheet: 500ms; --t-fade: 600ms;

  /* shadows (always layered: tight + medium + wide) */
  --shadow-1: 0 1px 2px rgba(0,0,0,.5), 0 6px 16px rgba(0,0,0,.35);
  --shadow-2: 0 2px 4px rgba(0,0,0,.5), 0 12px 28px rgba(0,0,0,.4), 0 32px 64px rgba(0,0,0,.35);

  /* light source: top-left. Vector points from the lamp toward the scene. */
  --lamp-x: 0.6; --lamp-y: 0.8;

  /* z layers */
  --z-grid: 0; --z-menu: 10; --z-sheet: 30; --z-stage: 40; --z-toast: 50; --z-cursor: 60;
}
```

## 3. Typography

Two fonts only. Load local files from `assets/fonts/` with `@font-face` and `font-display: swap`; the fallback stacks above must look acceptable on their own.

| Role | Font | Size / weight | Notes |
|---|---|---|---|
| Wordmark, display | Inter | 40-72 px / 600 | letter-spacing -0.04em, line-height 1 |
| Headings | Inter | 20-28 px / 600 | letter-spacing -0.02em |
| Body | Inter | 14-15 px / 400 | color `--text` or `--text-dim` |
| Labels | JetBrains Mono | 10-11 px / 500 | uppercase, letter-spacing 0.08em, color `--text-dim` |
| Numbers, serials, specs, timers | JetBrains Mono | any | `font-variant-numeric: tabular-nums` always |

Big type is quiet: large size, light contrast steps, lots of empty space around it.

## 4. Palette rules (important)

- **UI chrome is black, white and gray only.** Backgrounds, glass, text, buttons, dots, cursor glow, toasts, the inventory sheet, the pack wrapper.
- **The exceptions are rarity finishes and variant coatings on card faces.** Each rarity defines its own colors and animation in `docs/02-RARITIES.md`. Those colors appear only on: the card face and its frame/props, the small tier badge on that card, and the soft light bloom behind a card during its reveal. Nothing else in the UI ever takes a rarity color.
- Iridescence on the metallic foil is a silver-white shimmer with only faint cool and warm tints in the highlights. Normal foil never adds saturated color by itself. Owner-approved Rainbow Holo and Aurora coatings may use their specified colors on the card face; Card Tags remain neutral. Matte removes front reflections while retaining the rarity frame and props.
- `config.rarityColorMode` = `"color"` (default) or `"mono"`. In `"mono"` every finish renders using only white/gray/black variations of its motion and pattern. Build finishes so both modes work.

## 5. Glass recipe

Every glass surface uses this one recipe (toast, inventory sheet, buttons, tooltips):

```css
.glass {
  background: var(--glass);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid var(--hairline);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), var(--shadow-2);
}
.glass--sheet { backdrop-filter: blur(40px) saturate(150%); background: rgba(255,255,255,.05); }
```

The inventory sheet additionally has a soft shadow above it and lets the dot grid show faintly through.

## 6. Motion

| Use | Duration | Curve |
|---|---|---|
| Hover, press, small state changes | 150-250 ms | `--ease-out` |
| Panels, sheets | 400-500 ms | spring (below) |
| Fades of idle UI | 600 ms out, 150 ms in | `--ease-out` |
| Card reveal phases | per rarity, see `docs/04-PACK-OPENING.md` | see doc |

Springs (implement in `src/fx/springs.js`, one small shared utility):
- Card tilt: stiffness 140, damping 16, mass 1 (slight overshoot).
- Sheet drag: stiffness 220, damping 26. Rubber-band at limits.

Rules: never animate `left/top/width/height` (use `transform` and `opacity`). Linear easing only for progress fills. Numbers count up; they never jump. Everything that enters also has an exit animation.

## 7. Light model

One lamp, top-left. Everything obeys it:
- Highlights sit on top and left edges; shadows fall to the bottom-right.
- A card's tilt changes its angle to the lamp, so its glare, edge light and shadow shift together.
- The card shadow moves opposite to tilt and softens as the card lifts.

## 8. Layout and idle behavior

- Centered composition with generous empty space. Safe margin 32 px.
- Main menu corners: wordmark top-left (small), currency top-right, inventory arrow bottom-center, pack in the center. Nothing else.
- **Idle fade:** after 2.5 s without mouse movement, all UI except the pack fades out (600 ms). Any mouse movement brings it back (150 ms). Exceptions that never fade: an open inventory sheet, an active tutorial step, the opening sequence (which hides UI itself), a visible toast.

## 9. Component states

Every interactive element defines all of these: idle, hover, pressed, focus-visible, disabled.

| Element | Hover | Pressed |
|---|---|---|
| Button | lifts 1-2 px, shadow softens, hairline brightens, gentle "breathe" scale 1.00 to 1.02 | settles back to 0 px, scale 0.98 |
| Keycap (`Space`) | none | depresses 2 px, inner shadow |
| Chip / badge | hairline brightens | none |
| Inventory arrow | rises 3 px, brightens | pulls sheet |
| Card (shelf) | lifts 6 px, lite tilt | opens detail |
| Wordmark | letter morph (`docs/05-MAIN-MENU.md`) | none |

Add a hover response to almost everything interactive. Hover states must never shift layout.

## 10. Micro-interactions (global)

- Buttons breathe slightly on hover.
- Numbers count up (currency, collection count "12 / 40"); digits roll like a mechanical counter, changing only the digit that changed.
- Staggered entrances, 50-100 ms apart. Never everything at once.
- Loading: wordmark fades in first, then the pack, then the rest.
- Optional grain overlay, 2-3 % opacity, static, to prevent gradient banding.

## 11. Accessibility

- `prefers-reduced-motion`: replace movement with fades, disable ripples, sway, particles, letter morph, and rubber-banding. The reveal becomes crossfades.
- All interactive elements are keyboard reachable with a visible focus ring (1 px white at 60 % plus 3 px soft glow).
- Text contrast: `--text-dim` on `--bg` must stay readable; never use `--text-faint` for anything essential.
- Every animated state has a non-animated equivalent.

## 12. Performance budget

- 60 fps target on a mid-range laptop.
- Full foil/beam/glare/finish animation only on the one focused card. Shelf cards use a static "lite" render.
- Pause finish animations for off-screen cards and when the tab is hidden.
- Dot grid is one canvas, drawn only while something is animating (sleep when idle).
- Prefer CSS variables driven from one `requestAnimationFrame` loop over many timers.

## 13. Don'ts

- No colors outside section 4. No gradients on UI text. No thick borders. No default browser buttons.
- No emojis as icons. Use small inline SVG icons drawn in the same stroke weight.
- No more than one primary action visible at a time.
- No pop-in or pop-out; no linear easing (except progress); no bounce outside the card reveal.
- Do not add UI "just in case". If it is not needed right now, it is hidden.

## 14. References

- Apple HIG design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple HIG (materials, motion, sheets, typography): https://developer.apple.com/design/human-interface-guidelines/
- Apple product pages (iPhone, Vision Pro) for whitespace, big type and scroll reveals.
- Awwwards.com for reveal animations; Mobbin.com and Dribbble.com for bottom sheets, shelves and card layouts.
- CodePen: search "text scramble hover" and "letter morph hover" for the wordmark.
- Card foil technique: https://poke-holo.simey.me/ (study the light behavior; write original code, do not copy it, and render in the palette of this project).
- Put image references in `references/` (see `references/README.md`).

## Stage 13 graphics and accessibility update

Four independent graphics tiers: Very Low, Low, Medium (fresh-save default), High. Presets set the nine graphics controls together; FPS and accessibility stay independent. High retains the full silver/card material language with refined glare and edge light. Very Low uses static finishes, no cosmetic particles, no backdrop blur or dots, and flat grounding. Low retains attractive static materials with interaction-only motion. Inventory thumbnails are front-only and static, with one full card mounted on entering detail. Coarse-pointer play uses visible 44px touch targets, a hold action, Tear and Flip buttons, and Keep/Delete. The shared loop supports display refresh plus explicit FPS caps; hidden visuals sleep and refill reconciles from timestamps. See docs/GRAPHICS-UPDATE.md.

## Stage 14 inventory optimization

Inventory browsing uses a shaded prepainted panel instead of full-sheet backdrop filtering, flat front-only thumbnail layers, a single shelf pan and native grid scroll. Viewport-based virtualization bounds the compositor layers; metadata updates only when content changes. Very Low retains the active cut blade while removing the empty cursor blend surface. See docs/INVENTORY-PERFORMANCE.md for measured moving-scene results and limitations.
