# Designs.MD — Cardable design system

## Owner-approved 2.1.0 brand wrapper exception

NVIDIA green/graphite/chrome, AMD red/dark metal, Snapdragon gold/red/black and Apple silver are authorized on sealed wrappers, opening materials, queue markers and actual-instance provenance tags. Each keeps the shared silhouette and seals, a Cardable header, a local company logo and brand-only caption. The generated NVIDIA concept in `assets/packs/nvidia-concept-v1.png` guides the coded chamfers and inlays. UI chrome stays neutral; card mono mode governs cards and rarity cinematics. Brand tint clears before rarity reveal.

Type changes turn through a quiet foil back. After durable Keep, the earned card turns through its engraved back, swaps at the hidden edge, and returns as the next wrapper. The shared effects clock owns both turns; reduced motion and Low/Very Low animation settings crossfade. High uses pointer gloss and six-second sheen; Medium gets one sweep per appearance; lower presets retain static identity.

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
- Owner-approved rarity opening intros may use full-screen rarity colors while the card remains hidden: Basic white, Common gray, Uncommon lime/green, Rare blue with a sky-blue cloudy crystal star, Super Rare a navy/blue celestial star and ornamental rings, Unusual purple/white refractive gel glass, and Double Super Rare blue glass on the left and gold on the right. These seven intros flow into a brief 400 ms card flip, with no separate rise or pre-flip pause. Unusual and Double Super Rare use long warped seams, irregular facets, separate moving highlights and accelerating side-to-side beams, followed by one tinted-white peak and a short frozen impact. Chrome remains monochrome. Mono mode makes these intros grayscale; reduced motion replaces travel, bursts and flashes with a brief restrained fade. See `docs/RARITY-INTROS.md`.
- Legendary extends that approved opening palette with molten gold side flames, a faceted central prism and three seconds of mirrored crystal illumination. The final crystal field becomes a static gold background behind the card through metadata, variants and Keep/Delete, with a quiet darker center for readability. It fades as the card leaves and clears before another reveal or the menu. The gun reference informs the golden outline and facets; the composition contains no weapon. Mono and reduced motion retain intentional static alternatives. Legendary uses the same brief flip and overlapping release.
- Mythical's owner-approved Crimson Clock cinematic uses a spatial ruby/black cave, reflected black water, submerged crystal tendrils and a corrupted mechanical ritual. Its original vector gothic MYTHICAL wordmark is cinematic artwork, not a third UI font. A single white explosion flash resolves into the same 400 ms flip with a 160 ms overlapping release. A dark red-black field remains behind the card with slow edge smoke and sparse embers (at most 10 Hz on the shared scheduler); it freezes when unfocused, activity-hidden or under static graphics/motion policies. The field fades on Keep/Delete and clears before another reveal. Mono converts both renderers to grayscale; Low, Very Low and reduced motion use restrained static alternatives. No audio, runtime network dependency or change to pulls accompanies this effect.

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

Exotic's owner-approved cinematic extends the rarity palette exception: a familiar white Basic pulse cuts to intentional black, then blue/violet/pink stars accelerate for ten Normal-speed seconds into a twisting tunnel. The stop leaves a brief shutter smear before a tilted luminous galaxy forms. Its layered purple gas, dark dust lanes, dense rotating stellar arms, compact pale/gold core and shooting stars remain distinct. The galaxy fades completely before the card flip; the same dots persist as a dark, quietly drifting wallpaper. UI chrome and metadata remain monochrome. Fast scales the full presentation to 70%; reduced motion and Low/Very Low omit the tunnel, roll, shimmer and impact, retaining static stars. No audio.

Exotic's retained field has a subdued center for the card and edge-weighted light. It runs at no more than 10 updates per second on the shared scheduler, sleeps on blur/hidden/activity sleep/static policies, and fades over 450 ms on either decision. Recovery reconstructs its seeded quiet field immediately without replaying the reveal. The galaxy's live renderer has no private timer or animation loop.

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
- **Idle fade:** after 15 s without activity, secondary controls fade out (600 ms). Keep the pack, countdown, card/pack counts, stock/refill visualizer and wordmark; the wordmark shrinks to 65%. Activity restores the controls. Open inventory, tutorial, opening and toast contexts keep their own presentation.
- **AFK:** after 10 minutes without activity, hide the card/pack scene and panels, and suspend decorative rendering. Keep a small wordmark and timestamp-driven countdown/counts/refill visualizer. Activity restores the same state, including any reserved reveal. See `docs/IDLE-ACTIVITY.md`.

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

## 1.3.0 developer workspace

The developer workspace reuses the game glass, fonts and settings controls, with quiet monochrome chrome, a vertical SVG rail, sticky group headings, mono values and filled/hollow status dots. Dock width defaults to 420 px and stays inside the viewport; resize, opacity and pinning are explicit controls. Destructive actions require a three-second real-time hold. Ctrl/Cmd+K traps and returns focus, while registered tools use allowed Alt shortcuts. Existing game modals retain focus ownership.

The normal one-full-card rule remains the gameplay policy. The developer comparison lab may render visible independent cards at full effect inside its isolated scope; offscreen previews sleep and all are destroyed on tab/panel close. Reduced motion substitutes static reveal states and deterministic roulette selection. Tags for unsupported combinations explain the missing catalog rules instead of fabricating results. Showcase/photo restore the view, input ownership and focus when exiting.

## Stage 14 inventory optimization

Inventory browsing uses a shaded prepainted panel instead of full-sheet backdrop filtering, flat front-only thumbnail layers, a single shelf pan and native grid scroll. Viewport-based virtualization bounds the compositor layers; metadata updates only when content changes. Very Low retains the active cut blade while removing the empty cursor blend surface. See docs/INVENTORY-PERFORMANCE.md for measured moving-scene results and limitations.

## Stage 14 inventory optimization

Inventory browsing uses a shaded prepainted panel instead of full-sheet backdrop filtering, flat front-only thumbnail layers, a single shelf pan and native grid scroll. Viewport-based virtualization bounds the compositor layers; metadata updates only when content changes. Very Low retains the active cut blade while removing the empty cursor blend surface. See docs/INVENTORY-PERFORMANCE.md for measured moving-scene results and limitations.


Ascendant Prismatic Dawn is delivered incrementally under `alpha-updates/1.13.0-ascendant-cutscene/SPEC.md`. Milestone A contains only S0–S3: a near-black/pastel spark, procedural spatial glass cave, tipping keystone, liquid-light impact and submerged rooted filaments. Its new light is local and restrained; no explosion flash exists until milestone C. It uses Mythical's extracted WebGL engine and post-processing, the extracted clock component, the shared reveal scheduler and a shared skip timeline. Presentation randomness is seeded from the reserved serial. The Ascendant white/pastel edge field is now a shared procedural finish renderer; its complete S7/S8 continuity and border choreography remain milestone C. A local serif title font is permitted exclusively for the later Ascendant cinematic title, per the owner-supplied spec; UI typography remains unchanged.


Ascendant milestone B extends Prismatic Dawn through S4-S6. The top-down hexagon scales locally at 1.2-2.4 Hz with only 2.5% local light modulation, then becomes the 12-point/ring/chevron sigil in one SDF shader. Pastel history streaks and three rising FBM mist strata precede a thin glass clock; the clock rests at 12 from 23.2 to 23.5 seconds. The locally bundled OFL Bodoni Moda font is restricted to ASCENDANT's cinematic title; Inter and JetBrains Mono remain the UI fonts. The title sharpens from blur and separated pastel edges, a three-second spatial inversion mask sweeps the composition, and facet shards converge inward. Side readout updates are capped at 2 Hz. No explosion or extra flash exists in B; C owns that one climax and the full final border choreography.


Ascendant milestone C completes S7/S8: three to five pleated pastel light curtains rise into white, with inward wind, sparks, blurred clock hands and a pullback/push-in. Its only global flash is a single 110 ms rise / 590 ms decay envelope at 30.6 s; seeking backwards cannot replay it. The title's final inversion dissolves gradually into the curtains. Normal and compressed playback cap local pulse rates at 2.4 Hz and star rotation at two revolutions per second. The shockwave resolves into the exact shared white/pastel finish field, using the reserved serial and continuous presentation age. The 400 ms direct flip runs within the 1.5-second materialization and squircle border draw; metadata follows. Full/Short/Off appear in Cards settings. Very Low, reduced motion and Off use a three-second Canvas-only, no-flash/no-shake sequence. The dev-only luminance-change graph is an inspection aid, not a safety certification. All geometry/materials remain procedural, classic-script and offline; no audio is added.

## 2.2.0 Classic visual exception

The owner-authorized Classic pack is an original aged-plastic case inspired by the supplied retro tower photo: warm beige bezel, molded seams, screws, drive bay, physical buttons, restrained LEDs, vent grooves and an original Cardable pixel badge. Colored hardware details stay inside the pack and its provenance/queue markers. Waiting keeps a dim case outline and segmented progress; charge updates the red display and grille, with amber wrapper light. Classic arrivals use ordered-dither pixels and a shrinking vortex, followed by a slow case fade. Lower quality, reduced motion, hidden/AFK and independent material/reflection/animation controls restrict decoration.

Every card born from this pack permanently uses a beige monitor bezel and amber terminal panel. Rarity stays in its background finish, front LED strip, code and tags; the common engraved back does not expose tier during the initial flip. Four screws, chamfered corners, grain and a small CLASSIC sticker define the frame. Locally bundled OFL VT323 is permitted only on this terminal plate; other UI keeps existing fonts. Catalog-era CLASSIC tags are neutral and independent of pack provenance. The original description is used because `references/classic-border.png` is absent.


### Secret milestone A: Fatal Exception

Secret now begins with a Basic-material fake-out, interrupted mid-flip at 2.4 seconds, a black hold, and a six-second NorthStar BIOS failure. NorthStar OS is original fiction; its existing mono typography and all pixels, materials, symbols and artifacts are procedural. The reserved card face is never used by the fake-out. Shared shader/target utilities and the existing bloom/composite pass serve both the crystal engine and the OS screen engine. Classic scripts and offline file access remain mandatory.

Strobing defaults to Safe. Full selection requires the existing three-second hold control; every Full Secret playback has a pre-roll choice and an eight-second Safe fallback. A final-output 64-by-36 linear-luminance sampler drives the limiter and measured dev meter. Safe uses no POST flicker; Full retains a short local flicker burst with a global emergency brake. These controls reduce risk; the dev meter is an implementation inspection aid. Secret's shared Found field uses seeded irregular lines and at least 800 ms inversion crossfades spaced 4.8 seconds apart in Safe. Static shelf views do not invert. The original monochrome side-rim presentation and 95% squircle remain.

Milestone A has a temporary 600 ms release into that shared field and the normal 400 ms direct flip. The full desktop, collapse, resurrection, first inversion and 40-second final-background choreography are unfinished (milestones B/C). Existing Mythical/Ascendant Safe profile caps and the authored Short/calm routes also remain milestone C. No audio is added.
