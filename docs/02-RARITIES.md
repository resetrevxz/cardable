# 02 — Rarity system

Source of truth for mechanics is `src/data/rarities.js`. This doc explains the visual design of each tier and how to extend the system.

Owner-approved card remake pass 1: Basic through Double Super Rare express their finish on the border around full-card artwork. Basic shifts white/gray with viewing angle; Common has an orbiting white rim highlight; Uncommon shifts lime/green/dark green with movement. Rare keeps sparkles on the upper pale-blue rim. Super Rare waves occupy its upper blue rim and fade into a static dark checker. Unusual pulses white light down its purple rim. Double Super Rare drifts gold faster than blue and twinkles around its checker/gold rim. No props are added to these seven tiers. Chances and higher-tier designs are unchanged. See `CARD-REMAKE-PASS-1.md`.

The system is a template reused from another project. **Ignore** its variants system and its card names. Everything else applies.

Owner-approved card remake pass 2: Legendary through Ascendant and Secret now use the same portrait face and neutral glass specs. Their material finishes stay in the rim; attached props sit outside it. Secret's old animated lettering is removed and its original black/white sweep cadence is restricted to the two vertical sides. Limited retains the prior design. See `CARD-REMAKE-PASS-2.md`.

## 1. Overview

| Tier | Code | Name | Chance | Group |
|---|---|---|---|---|
| 0 | B | Basic | 46.5 % | Common Tiers |
| 1 | C | Common | 23.5 % | Common Tiers |
| 2 | UC | Uncommon | 15 % | Common Tiers |
| 3 | R | Rare | 7.5 % | Common Tiers |
| 4 | SR | Super Rare | 2.5 % | Uncommon Tiers |
| 5 | U | Unusual | 2 % | Uncommon Tiers |
| 6 | SSR | Double Super Rare | 1.5 % | Uncommon Tiers |
| 7 | L | Legendary | 1 % (see note) | Rare Tiers |
| 8 | M | Mythical | 0.75 % | Rare Tiers |
| 9 | E | Exotic | 0.2 % | Rare Tiers |
| 10 | A | Ascendant | 0.045 % | Legendary Tiers |
| 11 | ? | Secret | 0.005 % | Legendary Tiers |
| 12 | # | Limited | not pullable | Exclusive Tiers |

Note: the chances as written add up to 100.5 %. The running totals in the source imply Legendary is 0.5 %. See OPEN-QUESTIONS #2. Code normalizes by the sum until this is decided.

Target card counts per tier (reference only; the real set is small for now): B 34, C 23, UC 18, R 39, SR 14, U 16, SSR 20, L 31, M 26, E 19, A 15, ? 16, # 15. `marketValueUsd` is stored in data but is RESERVED for the future market. Do not read or display it.

## 2. Rules for all finishes

- A **finish** = the tier's background design (`designSpec`) plus its optional **prop** (`propSpec`: borders, crowns, flames).
- Every finish is a module registered with `Cardable.finishes.register(id, { mount, update, destroy, lite })`. `lite` returns a static image-like render for shelf cards; only the focused card runs the full animation.
- Finishes render **behind** the shared foil, beam and glare layers from `docs/03-CARD.md`, so every tier still gets the metallic, mouse-following shine.
- Every finish must work in `rarityColorMode = "mono"` (same motion and patterns, white/gray/black values).
- Animations pause off-screen and when the tab is hidden. Reduced motion: keep the static version, drop the movement.
- Card frame shape: rounded rectangle by default. Props that say "square with small squircle edges" use a squircle path (use `corner-shape: squircle` where supported, otherwise an SVG path clip).

## 3. The tiers

Text in quotes is the original spec, kept verbatim. "Build" notes are implementation hints, not extra requirements.

### 0 Basic [B]
- Description: "A basic card with no distinction."
- Design: "A basic white color"
- Build: flat off-white base, no animation. The shared foil still shines.

### 1 Common [C]
- Description: "Common cards found in almost every pack."
- Design: "A basic gray color"
- Build: flat mid-gray base.

### 2 Uncommon [UC]
- Description: "More uncommon than common cards, but still usual."
- Design: "A basic lime color at the start fading to light green"
- Build: linear gradient lime to light green, top to bottom.

### 3 Rare [R]
- Description: "A rare card mostly found in rare card packs."
- Design: "A light blue shade with sparkles going to a less light blue without sparkles"
- Build: gradient from light blue (top) to a less light blue (bottom). Sparkles (tiny twinkling points) only in the lighter region, fading out as the gradient darkens.

### 4 Super Rare [SR]
- Description: "A super rare card mostly found rarely in rare card packs."
- Design: "A blue color with ocean-like animated waves on the blue going/fading to a darker blue with a checkerbox pattern non-animated"
- Build: top: blue with layered sine-wave bands drifting slowly; bottom: darker blue with a static checkerboard; a soft gradient mask blends the two.

### 5 Unusual [U]
- Description: "A strangely unique unusual card to come across."
- Design: "A purple color with animated white shining coming from the top with slowly boosting down and up (the white)"
- Build: purple base; a white light source at the top edge whose glow slowly extends downward and retracts, looping (about 5-6 s per cycle).

### 6 Double Super Rare [SSR]
- Description: "A double super rare card found rarest in rare card packs"
- Design: "A dark blue checkerbox pattern moving to a gold color with animated sparkles and the gold shifting colors with the dark blue following too slowly"
- Build: dark blue checkerboard fading into gold; gold has animated sparkles and a slow hue drift; the dark blue drifts more slowly than the gold ("following").

### 7 Legendary [L]
- Description: "A card so legendary that it's sought after for millions."
- Design: "A golden color with sparkles, tip sparks, and in the middle part a different waving line which fades colors from light yellow-gold to a red-maroon colors, the red maroon color has a checkerbox pattern in it"
- Prop: "A gold crown (with sparkles and sparks) with red, blue and green gemstones with red having a hexagonal rotating glow, the blue being a mythril like non-animated white-ish texture, and the green having a extremely shiny outline"
- Build: gold base with sparkles and small sparks at the tips/edges; a waving band through the middle side-rims fading light yellow-gold to red-maroon, with a checkerboard inside the maroon part. Crown prop: attached above the top edge, an SVG crown with sparkles and sparks; three gems: red (hexagonal glow that rotates), blue (static mythril-like whitish texture), green (very shiny outline).

### 8 Mythical [M]
- Description: "Such a tale said about mythical cards almost no one has seen it for ages."
- Design: "A ruby like color which slowly goes from a basic to a shining one, has the glassy look with shiny refractions and actual crystal look"
- Prop: "White to red flames outside the card having a burning flame animation from the bottom only"
- Build: a ruby rim cut into 48 crystalline facets, with a slow shine pulse and lamp-responsive refraction rays. Curled, uneven flame tongues originate outside the bottom edge, white at the core and red at the tips. A mask keeps the fire off the artwork and specs.

### 9 Exotic [E]
- Description: "A truly Exotic card that stands apart from the rest."
- Design: "A pink color with a purple border, and animated random shapes in the middle."
- Prop: "A glowing outside square with small squircle edges border made of dark purple with a pink outline with white going circling border"
- Build: pink/purple rim with drifting random geometric shapes in its middle side-sections. Outer squircle border: dark purple with pink outline and a white highlight that travels around it continuously.

### 10 Ascendant [A]
- Description: "A truly Ascendant card throughout generations."
- Design: "A white colored shifting pastel RGB colors on all side with random faded splashes happening every 2-3 seconds for 1 second fade in and out."
- Prop: "A outside square with small squircle edges which shines and shifts colors like a aurora but with pastel colors"
- Build: white rim with pastel color shifting along all sides; every 2-3 s (random) a soft splash of color fades in and out over 1 s. Outer squircle border with an aurora-style pastel shimmer.

### 11 Secret [?]
Two states. **Unfound** = the player does not own this card. **Found** = owned.
- Unfound description: "No record of this card exists."
- Unfound design: fast white line sweeps on black sides, without lettering.
- Unfound prop: "A black square outside border with small squircle edges at 95% opacity"
- Found description: "A secret card which was hidden by the world."
- Found design: white line sweeps on black sides invert to black lines on white, accelerate and grow to side coverage, then repeat. No lettering.
- Found prop: "A black square outside border with small squircle edges at 95% opacity, which reverses to white when the design text changes"
- Build (found loop): preserve the 1.8 s black/white sweep lead-in and 2.4 s inverted accelerating coverage phase, now restricted to the left/right rims. The outer squircle inverts with the sides. There is no logo, gibberish or letter-lock animation on the face. Found artwork is fully visible; an unfound card still conceals its identity, specs, art and serial on both faces.
- Inventory: an unowned Secret card shows its **Unfound** design in place of a plain silhouette, with no name. When pulled it plays the Found design.

### 12 Limited [#]
- Chance: not pullable by default (`pullable: false`), so it is excluded from the odds.
- Available description: "Only obtainable for a limited time till <date>"
- Unavailable description: "Was obtainable for a limited time till <date>"
- Design: "A purple color with animated white shining coming from the top with slowly boosting down and up (the white)" (same as Unusual, see OPEN-QUESTIONS #17)
- Prop: "A glowing crimson red border which makes the logo feel like it's flying."
- Build: Unusual-style base; a glowing crimson border; a slight float (parallax lift) on the logo so it appears to fly. `<date>` comes from `availableUntil` in data.

## 4. Reveal scaling (anticipation)

Anticipation sells the reveal. The 3-second hold is fixed for every pack; rarity changes what happens after the cut. Values are in `rarities.js` under `reveal`.

| Tier | riseMs | preFlipPauseMs | flipMs | bloom | gridDim | shiftPx |
|---|---|---|---|---|---|---|
| 0 Basic | 900 | 0 | 700 | 0 | 0.60 | 0 |
| 1 Common | 900 | 0 | 750 | 0 | 0.60 | 0 |
| 2 Uncommon | 950 | 0 | 800 | 0.10 | 0.65 | 0 |
| 3 Rare | 1000 | 300 | 900 | 0.20 | 0.70 | 0 |
| 4 Super Rare | 1050 | 350 | 1000 | 0.30 | 0.75 | 0 |
| 5 Unusual | 1100 | 350 | 1050 | 0.35 | 0.78 | 0 |
| 6 Double Super Rare | 1200 | 400 | 1150 | 0.45 | 0.80 | 0 |
| 7 Legendary | 1300 | 450 | 1300 | 0.60 | 0.85 | 1 |
| 8 Mythical | 1400 | 450 | 1400 | 0.65 | 0.88 | 1 |
| 9 Exotic | 1500 | 500 | 1500 | 0.75 | 0.90 | 1 |
| 10 Ascendant | 1700 | 500 | 1800 | 0.90 | 0.95 | 1 |
| 11 Secret | 2000 | 500 | 2200 | 1.00 | 1.00 | 1 |
| 12 Limited | 1300 | 450 | 1300 | 0.60 | 0.85 | 1 |

- `bloom` (0-1): strength of the soft light behind the card, tinted by the tier's own colors.
- `gridDim` (0-1): how much the dot grid dims during the reveal (1 = fully off except a halo around the card).
- `shiftPx`: a single barely perceptible screen shift at the pause.

## 5. Tier badge (replaces "pips")

There are 12+ tiers, so the earlier idea of 1-5 pips is replaced by a small mono badge with the code, for example `SR`, plus a 12-segment tier meter that fills one segment at a time (about 40 ms each) during the settle phase.

## 6. How to add a rarity

1. Append an object to `src/data/rarities.js` (copy an existing one; keep `tier` unique and ordered).
2. Add `src/finishes/<id>.js` calling `Cardable.finishes.register('<id>', …)`.
3. Add it to the table above and add a reveal row.
4. Add a `<script>` tag for the finish in `index.html`.
Nothing else in the UI changes.
