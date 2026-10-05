# Card remake — pass 2

Owner scope: Legendary, Mythical, Exotic, Ascendant, and Secret. These five tiers now share the portrait artwork, Cardable header, top serial/rarity and smoked glass memory/spec panel introduced in pass 1.

## Shipped design

- Legendary: a responsive gold rim, middle gold-to-maroon checker wave, perimeter stars and tip sparks. A crown attaches above the card with rotating red hexagonal glow, static whitish blue mythril striations and a bright green gem outline.
- Mythical: 48 cut ruby facets, slowly pulsing glass highlights and lamp-responsive refraction rays. Uneven curled flames burn white-to-red outside the bottom edge. An SVG mask protects artwork and specs; the flame base fades into the surrounding space. The New/duplicate note and flip hint move above this card to clear the fire.
- Exotic: a pink/purple rim with seeded shapes drifting in the middle sections of its sides. A separate outer squircle combines dark purple, a pink outline and an orbiting white highlight.
- Ascendant: white and shifting pastel rims, an outer pastel aurora squircle, and seeded splashes every 2–3 seconds with a one-second fade. Splashes expand around a rim anchor, so the artwork cannot mask away the splash.
- Secret: remove the animated logo and letter-lock field. Preserve the prior 1.8-second black/white sweep and 2.4-second inverted acceleration/coverage loop, confined to left/right rims. The outer frame inverts with the sides. Found cards show portrait art and specs; unfound cards show Cardable and the mystery description without revealing GPU identity, generation, specs, artwork or serial.

Original reflections, foil, beam, glare, tilt, shadow, reveal timing, flip and Cardable back are retained. Full effects use the existing shared scheduler and sole focused card. Unfocused, offscreen, back-face and reduced-motion materials stay static. Color/mono modes apply to both live and lite props. No runtime library, remote asset or second animation loop is added.

The data-only `propOutset` metadata reserves top/bottom fractions of card height and side fractions of card width in collection detail. Detail layout accounts for those bounds, keeps the crown on screen, and places stacked details below Mythical's external flames. Earlier cards without this metadata retain their existing layout.

## Scope and interpretation

The owner's prior border-only direction governs the middle band/shapes: they occupy the middle side-rims and leave the GPU portrait clear. All five tiers use supplied local photos from the catalog. Limited retains its prior front and prop. No pack types are added. Existing odds, card counts, weights and normalization remain unchanged; market and variation systems remain deferred. The $200 durable reward, two-hour refill, four-pack cap and Keep/Delete behavior are retained.

## Verification

Final isolated checkpoint snapshot is based on `1e43cf2` and includes only the changes for this request over that committed base. Concurrent currency and pack styles in the shared working tree are excluded from this checkpoint.

189 behavior groups passed: 13 card, 14 lower finishes, 15 Legendary–Exotic, 15 Ascendant/Secret/Limited, 7 reward/decision, 18 menu, 26 opening, 24 reveal/collection, 19 flip/inventory regressions, 29 inventory refresh and 9 retained detail groups. Existing tests were updated to replace obsolete letter-lock and nametag-flame assertions with sweep cadence, concealment, crystal facets and bottom-origin fire. Pass 1 tests continue to cover its seven tiers.

21 real Chromium/file:// browser groups passed: 12 for this pass, 9 for the earlier tiers/reward/decisions. Checks cover all five full portraits, top serials, glass bounds, external props, moving gem/shine/wave/shape/aurora/sweep effects, rim-anchored splashes, missing Secret letters, concealed identity, mono/reduced motion, sole full card, static unfocused/back materials, 15 actual pending reveals across 1280×720, 390×844 and 844×390, 15 rendered detail-controller fixtures across those sizes, visible actions/props/hints, Secret Keep and recovery, Cardable back, and zero application exceptions/HTTP requests. Browser saves are isolated test fixtures; they do not alter the player's save.

Headless Chromium sampled one focused 430 px Mythical card at 1440×1000 for three seconds: 60.0 FPS, 16.7 ms median and 16.8 ms p95 frame interval. Static mode sampled 60.0 FPS with zero full cards. This is a browser scheduler/rendering observation, not a hardware or sustained-play guarantee.

Evidence and screenshots: `D:/CardableV2/outputs/card-remake-pass2/`. Main preview: `browser/higher-tiers.png`. Compact reveal screenshots include Mythical portrait and Legendary landscape. See `CARD-REMAKE-PASS-2-EVIDENCE.json` for measured bounds and group results.

## Visual review

The first flame strip looked uniform, so the tongues now have varied widths/heights, curled tips, independent sway and a faded base. Red was strengthened after reviewing the initial pink fire. Compact screenshots caught the New/flip hints crossing the flame strip; moving those hints above the card keeps the attached prop and actions clear. The crown and external frames fit the tested short landscape reveal without cropping. A phone detail probe initially put the crown's top at -36.9 px; reserving its attached-prop extent brings it to 39.1 px. A full-face scale on Ascendant's splash would hide it behind the art mask, so expansion now changes the gradient radius around an edge anchor.

The main GPU artwork and neutral spec glass remain the focal point. Color appears in the material rim, attached prop and existing reveal bloom. No open implementation questions remain for this pass.
