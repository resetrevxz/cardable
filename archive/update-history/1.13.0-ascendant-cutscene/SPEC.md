# Ascendant cutscene — "Prismatic Dawn"

Tier 10 (Ascendant, 0.045 %, about 1 in 2,200 pulls). This is a showstopper. It must feel like a short film, not an effect: dark to white, one continuous idea, every shot connected to the next by a match cut.

**Story in one line:** a seed of light enters a glass crystal in a cavern, the crystal falls into a pool of liquid light, grows living filaments of light, ascends through a clock of ages into a sigil, and detonates into the card.

**Feel:** serene, huge, precise, expensive. White light and pastel RGB only. Slow, confident camera. Nothing flickers or flashes cheaply.

---

## 0. What to read first

1. `AGENTS.md` and `Designs.MD` (rules, glass recipe, motion principles, quality tiers).
2. **The existing Mythical cutscene.** Find it in the repo and study how it is registered, timed, hooked into the opening state machine, skipped, and handed off to the card. **Follow the same conventions and reuse every shared piece** (engine/timeline, WebGL helpers, post-processing, clock component, glitch text, skip handling, quality handling). Do not duplicate; extract shared code if it is not shared yet.
3. `docs/02-RARITIES.md` tier 10 and `src/finishes/ascendant*` (the card's Ascendant finish). The cutscene must end on that exact background.
4. `docs/04-PACK-OPENING.md` for the phases (`rising`, `preFlip`, `flipping`, `settling`), and the settings and quality systems.

## 1. Rules

- **Palette (allowed here):** the UI is monochrome, but rarity cutscenes may use their tier colors. Ascendant = near-black blue at the start, white, and **pastel RGB** only: rose `#FF9FB2`, mint `#A8F0C6`, sky `#A9CCFF`, plus lavender `#D5C3FF`, peach `#FFD2B0`, lemon `#FFF1A8`. Lit areas stay high-luminance and low-saturation (about 35 %); saturation only rises in dispersion fringes (up to about 60 %). Void colors: `#05060A`, `#0B0F24`. Mono mode (`rarityColor = Mono`): render everything in grayscale; dispersion becomes a white-to-gray split.
- **Fonts:** the game's two fonts stay for UI. The title may use one local display font, like the Mythical gothic. Use a high-contrast Didone/serif with an open license (for example Bodoni Moda or Playfair Display, both OFL), saved in `assets/fonts/`, loaded locally, with a `Georgia, "Times New Roman", serif` fallback. Never load from the network at runtime.
- **Procedural only:** no image or video assets. Everything is generated in code (shaders, SDFs, noise, particles, canvas). If a real sigil image exists later it can replace the procedural one.
- **Offline, classic scripts, no libraries, works from file://.** Shaders are strings in JS (no fetch).
- **Performance:** target 60 fps on High; one full-screen canvas; DPR capped at 2; resolution scale by quality; pause when the tab is hidden; dispose GPU resources when finished.
- **No tests, screenshots or profiling runs.** Manual checks only (section 11).

## 2. Architecture and integration

- Register through the same registry the Mythical cutscene uses (`Cardable.cutscenes.register('ascendant', ...)` or its equivalent). Add `cutscene: 'ascendant'` to the Ascendant entry's `reveal` data. Selection is by the committed card's tier, never by the animation.
- **Where it plays:** exactly where Mythical's plays in the opening sequence (after the tear, replacing the normal `rising`/`preFlip` for this tier). When it ends, the sequence continues into the normal card appearance and `settling` (name, serial, specs, Keep).
- **Warm-up:** the pull is committed at the end of the 3-second hold, so compile shaders and build geometry during `dissolving` and `cutting`. Never start the cutscene until it is ready, and never stutter.
- **Seeded variation:** seed the cave layout (crystal positions, sizes, tilt) from the card instance serial, so every pull has a slightly different cave.
- **Timeline engine:** one master clock with a time-scale curve (slow-motion ramps), scene scheduler, and a `beat(name, t)` emitter. Emit `Cardable.events` `cutscene:beat` with these names for the future sound system: `spark1`, `spark2`, `spark3`, `creak`, `break`, `impact`, `tendrils`, `pulse` (each), `clockStart`, `tick` (each major tick), `clockAlign`, `titleIn`, `titleBreak`, `auroraRise`, `flash`, `cardIn`. Do not add sound.
- **Skip:** after 2 s show a faint mono hint "Esc to skip" for every cutscene (add it as a feature) (bottom right). Esc or click fast-forwards over about 500 ms straight to the explosion beat (the single flash still plays, then the card appears on the correct background). Never skip into a half-built state.
- **UI during the cutscene:** all UI, the dot grid, cursor glow and native cursor are hidden (restore on Esc hint). Cinematic letterbox bars (2.39:1) slide in over 0.8 s and out at the flash.
- **Reload mid-cutscene:** jump to the final revealed state (as with the existing `pendingReveal` recovery); never replay.
- **Dev:** register tools through the dev menu registry (or `?dev=1&cutscene=ascendant` if absent): play, scrub, jump to scene, time scale 0.1x to 4x, quality override, short/full, mono toggle, "show safe-flash meter" (graph of luminance change per second, to verify the safety rule).

## 3. Master look

- **Camera language:** slow push-ins, gentle parallax, micro handheld drift (0.3 px), rack-focus depth of field (blur layers, 2 to 4 px max), one whip-pan into the side shot, and match cuts between shots (ring to ring, hexagon to hexagon, circle to circle).
- **Post stack (always on, scaled by quality):** bloom with a high threshold, subtle anamorphic horizontal streaks on the brightest points, chromatic aberration (stronger at edges), vignette, halation, film grain (2 to 3 %), faint lens ghosts on bright sources.
- **Color script:** deep indigo-black at the start; cool pastel accents in the cave; the pool tint blooms pastel RGB; everything gets whiter and more luminous as the story ascends; ends in pure white that resolves into the card background.
- **Dispersion everywhere:** every glass or light edge splits slightly into R/G/B (offsets scaled by thickness or distance from center).

## 4. Timeline (Full mode, about 32.5 s)

### S0 Prelude (0.0 to 1.0)
UI fades; letterbox bars slide in; screen goes to deep indigo-black with grain and a faint vignette. A few dust motes drift in a barely visible light shaft.

### S1 The Spark (1.0 to 4.0)
A single white point of light fades in at the center with a 6-point diffraction spike. It pulses like a heartbeat at 1.6 s, 2.4 s and 3.0 s (accelerating). Each pulse sends out a thin shockwave ring split into three slightly different radii (R, G, B), and pushes the camera in 1.5 %. On the third pulse the light blooms softly (no flash; ramp over 0.5 s) and reveals the cave.

### S2 The Prism Cave (4.0 to 10.0)
- **4.0 to 5.5 reveal:** the camera tilts up from darkness. Hundreds of glass crystals fade in, lit by the spark, which drifts into the largest crystal (the **keystone**) and glows inside it like a lantern.
- **5.5 to 8.0 dwell (give the cave time):** slow dolly forward. Three depth layers with parallax plus blurred foreground crystals. Caustics sweep across dark cave walls, light shafts with floating dust, thin floor mist, drops of light falling from crystal tips, subtle sway. Occasionally a crystal rings with a small shimmer and a ring of light. The pool below is a perfect mirror reflecting the cave.
- **8.0 to 9.2 the tip:** the keystone creaks. A hairline RGB crack propagates from its attachment point along its facets. It tilts 2, then 4, then 7 degrees; dust falls; neighboring crystals ring; micro-shake of 0.8 px. Hold completely still for 0.4 s (anticipation). Then it breaks free.
- **9.2 to 10.0 the fall:** slow motion (time scale 0.35), rotating, trailing a dispersive light streak. The camera tilts down to follow. Time ramps back to normal at the surface.

### S3 The Pool (10.0 to 15.0)
- **10.0 to 10.6 impact:** slow-motion splash crown of droplets with dispersion, ring ripples across the mirror surface. **The water takes on a tint:** pastel RGB blooms outward from the impact over 1.2 s and settles into a living thin-film iridescence that keeps shimmering.
- **10.6 to 12.5 the side shot:** a short motion-blurred whip-pan to a side cutaway. Water surface above, the crystal sinking slowly, bubble streams with tiny RGB rims, god rays through the surface, caustic lines on the back wall, a gradient from luminous white at the top to deep prismatic indigo at the bottom.
- **12.5 to 15.0 the tendrils:** luminous filaments grow from the crystal's facets, attached to it with glowing bases. 14 to 22 strands (High), tapering, swaying like jellyfish tentacles with curl-noise motion and a slow contraction pulse (about every 1.1 s, synced with the heartbeat). Each strand has its own pastel hue offset; bright pulses travel along each strand from the crystal outward; tips shed tiny rising spores; one or two strands curl around bubbles. Where the red-and-black Mythical version used crimson crystals, this uses clear glass and white-pastel light.

### S4 The Top Shot (15.0 to 20.0)
- **15.0 to 15.8 transition:** the camera rolls up and over the surface into a top-down view (match cut: the crystal's hexagonal top at the center, ripple rings around it).
- **15.8 to 18.0 pulsing:** the hexagon pulses hard, scaling 1.00 to 1.12 with an elastic ease. Each pulse sends a prismatic ring through the water and a small camera kick. The rate rises from 1.2 Hz to 2.4 Hz (never above 3 Hz); brightness modulation stays within the safety limits.
- **18.0 to 20.0 transformation:** the hexagon slowly morphs through an SDF blend: hexagon to circle to 12-point star to the **Ascendant sigil** (two thin concentric rings, a 12-point star, a small rising chevron above). Everything becomes steadily whiter and more luminous.
- **Atmosphere:** wind particles (streaked lines advected by curl noise plus a clockwise swirl, about 2,000 on High) circle the center and speed up; soft white mist rises from the bottom edge in 3 parallax layers (fbm noise, faint RGB fringe); a mandala of thin RGB-split concentric lines grows around the sigil.

### S5 The Clock of Ages (20.0 to 24.0)
Reuse and restyle the Mythical clock component: thin white lines, RGB-split edges. Concentric rings draw in with a stroke-dash reveal; 60 minor and 12 major ticks, numerals in the mono font at XII/III/VI/IX; rings counter-rotate with a ratchet feel; hour and minute hands plus a sweeping second hand with a faint prismatic motion-trail wedge, all accelerating as if time itself speeds up. The water fades into white haze; wind particles align with the rotation; every major tick emits a `tick` beat and a tiny ring pulse. At 23.2 s the hands align at 12 and everything holds for 0.3 s.

### S6 The Title (24.0 to 28.0)
- **"ASCENDANT"** forms over the sigil in the display serif, very wide tracking (about 0.35em), 90 ms letter stagger. Each letter rises and sharpens (blur 12 px to 0). It starts with a wide RGB split (about 12 px) that converges to about 1 px.
- **Black/white split:** a soft vertical split line sweeps slowly across the screen (3 s per pass, back and forth). On one side the scene is white-on-black, on the other black-on-white; text and clock lines invert as the line passes. It must never flicker or exceed the safety limits.
- **Side text (glitching):** two columns of tiny mono readouts that scramble-resolve and disappear/reappear (at most 2 Hz): left `SPECTRUM 380 > 750 NM` counting up, right `ALTITUDE 000000 > 999999`, plus ghost lines `TIER X`, `ASCENDANT`, `0.045 %`.
- **The star** at the center spins faster and faster (cap about 2 revolutions per second, with motion blur).
- **27.0 to 28.0 break:** the title shatters along crystal facets into prismatic shards that drift outward, then converge into the star.

### S7 The Ascension (28.0 to 31.0)
- **Light curtains** (the equivalent of Mythical's rising flames): 3 to 5 layers of vertical, pleated aurora sheets rise from the bottom edge, from 20 % to 90 % of the screen height over 2.5 s, brightening, with rising sparks.
- The star reaches maximum speed, the clock hands blur, wind particles converge into the center, the camera pulls back then pushes in, and the whole image whitens.
- **30.6 the explosion:** one expanding shockwave ring of prismatic light with an RGB-fringed halo, an anamorphic horizontal flare, a chromatic-aberration burst (0 to 1 to 0 over 700 ms) and the single bright flash (timing in section 1). Letterbox bars slide out.

### S8 The Card (31.0 to 32.5)
The shockwave dissolves into the **final background: the Ascendant card background** (white with shifting pastel RGB on all sides and the random faded splashes every 2 to 3 seconds, 1 s fade in/out). **Do not remove or replace this background; it is the card's background.** The card materializes in the center (scale 0.96 to 1, soft bloom), and its **outer squircle aurora border draws itself** around the card edge in pastel RGB. The sequence then continues into the normal settle phase.

## 5. Detail library (techniques; choose what hits 60 fps)

**Crystals.** Hexagonal prisms with chamfered 6-sided pyramid caps, double-terminated for some; heights 0.6 to 4.5, base radii 0.12 to 0.45, tilt up to 8 degrees, clusters of 3 to 7 with small satellites, about 60 visible, shorter denser beds on the walls. Rasterized 3D (generated meshes) with a screen-space refraction pass: Fresnel reflection, refraction offset along the normal scaled by thickness, **per-channel dispersion** (R/G/B offsets about 0.6 % to 1.4 % of the screen width), thin white inclusion planes ("phantoms"), a scatter glow near lit tips, bevel highlights, a procedural gradient-dome environment for reflections. The keystone is larger with an emissive pulsing core and visible internal veins. Avoid full ray-marched glass unless it holds frame rate.

**Cave.** Mostly dark silhouettes lit by caustics (animated noise projected on walls), volumetric god rays from the light seed (radial shafts), floor mist, dust motes, shallow depth of field.

**Water.** A polished white "liquid light" surface: a height-field ripple simulation (about 256 x 256, ping-pong; analytic rings on Low), planar reflection (flipped screen-space fake is fine), Fresnel blend, thin-film interference tint mapped to the pastel palette from view angle and ripple height, splash droplets as particles with dispersion. Cutaway: volume gradient, bubbles with RGB rims, caustics, god rays.

**Tendrils.** Verlet chains of about 28 segments, curl-noise force plus contraction pulse, camera-facing tapered ribbons rendered additively with a white core and a pastel halo (hue offset per strand), traveling pulses, glowing attach points, spore particles from the tips.

**Sigil and morph.** All in signed distance fields in one fragment shader: interpolate between hexagon, circle, star and sigil shapes; outline plus soft inner glow; RGB-split edges.

**Wind and mist.** Particles are thin streak quads with long motion history (not points); mist is 3 fbm layers drifting upward with parallax.

**Text.** Render the title to an offscreen 2D canvas, sample as a texture for the chromatic split, blur-in and shatter (facet masks), or use SVG path glyphs. Side text is a mono 2D canvas overlay.

**Post.** Half-resolution bloom, separable blur, one combined composite pass.

## 6. Final-background handoff

The Ascendant finish exposes one shared background renderer (for example `Cardable.finishes.ascendant.drawBackground(target, time, seed)`). The cutscene's last scenes and the card use the **same** renderer with the same seed and a continuous time value, so the transition from cutscene to card shows no seam. The cutscene's final frame equals the card's first frame background.

## 7. Settings

- Add `cutscenes`: **Full** / Short / Off in the Settings Cards group (apply it to all rarity cutscenes; if Mythical already has its own setting, unify them). Reduced motion forces the light version.
- Short mode (about 14 s): S1 (1.5 s), cave reveal and tip (3 s), splash and tendrils (3 s), top shot and morph (3 s), title and break (2.5 s), ascension and explosion (2 s), then S8.

## 8. Quality tiers

| Tier | Resolution | Particles | Water | Tendrils | Crystals | Post |
|---|---|---|---|---|---|---|
| High | 1.0x (DPR cap 2) | 100 % | height-field sim | 14 to 22 | full refraction + dispersion | full |
| Medium | 0.75x | 50 % | sim at 128 | 10 | refraction, no foreground blur | bloom half-res, no ghosts |
| Low | 0.5x | 25 % | analytic rings | 6, sine-driven | cheap shading, 3-channel offset only | bloom + vignette |
| Very Low | **light version** (section 9) | | | | | |

**Adaptive:** during S1 and S2 measure frame time. If the average exceeds 24 ms on High or Medium, drop one tier for the rest of the cutscene by ramping the resolution scale (no visible pop). Warm everything up in advance so the measurement is not polluted by compile time.

## 9. Light version (Very Low, reduced motion, cutscenes = Off)

About 3 seconds, 2D canvas or CSS only: fade to deep indigo, a point of light expands into the sigil with thin rings, the title fades in with a soft RGB split, then a soft fade (no flash, no shake) into the card on its background.

## 10. Milestones (stop at a clean one if budget runs out; commit each)

- **A:** shared engine reuse, timeline, skip, quality/adaptive handling, dev tools, S0 to S3 (spark, cave with the tip and fall, pool, side shot, tendrils).
- **B:** S4 to S6 (top shot, morph, atmosphere, clock, title, black/white split, side text, star, shatter).
- **C:** S7 and S8 (light curtains, explosion, final-background handoff, squircle border draw), Short mode, light version, settings entry, safe-flash meter.
List exactly which scenes or details are unfinished when stopping.

## 11. Manual checks (by eye, about 12 lines)

1. The cave has real depth and time to breathe before the crystal tips.
2. The tip, hold and fall read clearly; slow motion ramps feel smooth.
3. The pool tint blooms after impact; the side shot is readable.
4. Tendrils look alive, attached to the crystal, and pastel RGB.
5. The top shot pulses hard but never strobes; the morph to the sigil is smooth.
6. The clock accelerates and aligns at 12.
7. The title converges from RGB split to crisp; the split line never flickers.
8. Exactly one flash; the safe-flash meter stays under the limits.
9. The final background matches the card background with no seam.
10. Esc skips cleanly to the flash and the card; reload mid-cutscene recovers.
11. Medium, Low and Very Low all complete without stutter; reduced motion has no flash.
12. No console errors; UI and cursor restore afterwards.

## 12. Out of scope

Sound (hooks only), other tiers' cutscenes, changes to the card itself beyond reading the shared background renderer.
