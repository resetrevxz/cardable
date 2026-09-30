# 03 — The card

The card is the showstopper. Spend the effort here.

## 1. Shape and layout

- Aspect ratio 5:7 (2.5 x 3.5). Corner radius `--r-card`. Default shown height about 62 vh in reveal and detail views.
- **Outline:** a thin near-black keyline (`--keyline`, 1-2 px) outside a 1 px inner edge highlight. Match `references/02-card-frame.png`.

**Front** (minimal, lots of space):
```
[ SR ]                         gen 3      <- tier badge (mono) / generation (mono, dim)
┌────────────────────────────────────┐
│                                    │
│            ART WINDOW              │   <- procedural GPU art (section 5)
│                                    │
└────────────────────────────────────┘
Card Name                               <- Inter 600, tight tracking
16 GB  GDDR6X                           <- VRAM, mono, large
cores · boost · bus · power             <- specs, mono, small, dim
CBL-7K3F-000142                         <- serial, mono, tiny (footer)
[tier meter: 12 ticks]
```
Show only the most important specs on the face (VRAM plus up to three more). Full specs appear in the detail view.

**Back:** near-black metal surface, the Cardable logo mark centered, the serial number engraved below it (mono, large tracking). The same foil/glare layers apply to the back.

## 2. Layer stack (bottom to top)

| # | Layer | Purpose |
|---|---|---|
| 0 | shadow | layered drop shadow; moves opposite to tilt |
| 1 | body | brushed dark-metal base |
| 2 | finish background | the rarity design (`docs/02-RARITIES.md`) |
| 3 | art | procedural GPU art, in the art window |
| 4 | foil | masked iridescent foil (repeating gradients) |
| 5 | beam | vertical holographic beam(s) |
| 6 | glare | soft glare plus a small sharp specular core |
| 7 | text | name, specs, serial, badge |
| 8 | prop | finish props (crown, flames, squircle borders) |
| 9 | edge | edge light plus the near-black keyline |

All effect layers read the same CSS variables, updated from one animation loop:

```
--mx, --my     pointer position over the card, 0..1
--rx, --ry     tilt in degrees (capped at ±14)
--lamp-angle   derived from tilt and the global lamp
--lift         0..1, how far the card is raised
```

## 3. Effects

**Tilt with weight.** The card looks toward the pointer using a spring (stiffness 140, damping 16). Cap ±12-15 degrees. Darken the far edge slightly so the angle reads. Idle sway: if the pointer is still for about 3 s, drift slowly on a small sine path so the card never looks frozen.

**Foil (metallic, iridescent).** A masked layer of repeating linear/conic gradients in white and silver with faint cool and warm tints only in the highlights. Blend with `overlay` / `soft-light` (or `color-dodge` at low opacity) so it reacts to the surface underneath. Shift `background-position` with `--mx`/`--my` so it slides as you tilt.

**Vertical beam holo.** A repeating vertical gradient (thin bright bands with soft falloff) that shifts horizontally with tilt. Add a light `filter: brightness()/contrast()` pass. Every card has it; intensity may scale mildly with tier.

**Glare.** Two parts: a broad soft radial highlight following the pointer, and a small sharp specular core that moves faster (about 1.5x). Both follow the lamp.

**Edge light.** The card border catches light on the side facing the lamp, like machined metal. Implement as a conic or linear gradient mask on the border.

**Metal.** Fine anisotropic brushing on the body (very subtle repeating gradient) so the surface reads as metal, not plastic.

Starting snippet (adapt freely):

```css
.card__glare {
  background:
    radial-gradient(circle at calc(var(--mx)*100%) calc(var(--my)*100%), rgba(255,255,255,.35), transparent 45%),
    radial-gradient(circle at calc(var(--mx)*100%) calc(var(--my)*100%), rgba(255,255,255,.9), transparent 6%);
  mix-blend-mode: overlay;
}
.card__beam {
  background: repeating-linear-gradient(100deg, transparent 0 9%, rgba(255,255,255,.18) 11%, transparent 14% 26%);
  background-position: calc(var(--mx)*100%) 0;
  mix-blend-mode: soft-light; filter: brightness(1.15) contrast(1.1);
}
```

## 4. Render modes

- **full:** all layers animated. Only the focused card (pack reveal, detail view, hovered shelf card).
- **lite:** static image-like render, no per-frame work. Everything else (shelf cards, thumbnails, toast).
- Switch modes with a 150 ms crossfade. Reduced motion: full mode uses no sway and slower, smaller tilt.

## 5. Art (procedural, original)

Generate original art per card from a seed so it is unique and cheap: an abstract GPU die/PCB/heatsink composition drawn in SVG or canvas, using fine trace lines, grids, fan or vapor-chamber motifs, tinted only by the tier's finish. The `art` field selects the generator, so hand-made images can replace it later without touching the card code:

```js
art: { kind: 'procedural', motif: 'die', seed: 101 }    // now
art: { kind: 'image', src: 'assets/cards/gen1-basic-01.webp' }  // later
```

## 6. Card data schema (`src/data/cards.js`)

```js
{
  id: 'gen1-basic-01',            // unique, stable, never reused
  name: 'Placeholder GPU 01',     // user supplies real names
  generation: 'gen1',             // must exist in Cardable.data.generations
  rarity: 'basic',                // must match a rarity id
  vram: { amount: 2, unit: 'GB', type: 'GDDR5' },
  specs: { cores: 640, boostMhz: 1100, busBits: 128, tdpW: 60 },   // free-form key/values, shown by a formatter table
  art: { kind: 'procedural', motif: 'die', seed: 101 },
  pullable: true
}
```

Spec labels and units come from a formatter table in `src/ui/card-specs.js`, so adding a new spec type does not touch layout code.

## 7. Serial stamp

On settle, the front serial "prints": characters appear about 30-40 ms apart with a brief bright flicker, like a laser engraving.

## 8. Tests to run in dev

Render one card of every tier in a `?dev=1` gallery page to check finishes, lite mode, and mono mode side by side.
