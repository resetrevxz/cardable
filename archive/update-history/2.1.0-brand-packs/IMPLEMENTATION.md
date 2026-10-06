# Implementation notes

The owner confirmed four separate packs and a combined 5% chance. The authoritative list is `alpha-updates/1.3.0-update/cards-roster.json`: NVIDIA 65, AMD 33, Snapdragon 4 and Apple 12. Brand catalog IDs are `nvidia`, `amd`, `qualcomm` and `apple`. Explicit `pool.cardIds` intersect `pool.brands`, preventing future catalog additions from entering these archives automatically. Original normalized tier weights and filtered-pool downgrade apply; no minimum tier or extra finish multiplier was requested.

`src/data/brand-packs.js` extends the registry. Each entry has `randomChance: .0125`. Production `packs.typeAt(n, optionalSave)` first resolves priority cadence, then draws a deterministic uniform value from the immutable saved player code, creation timestamp and opening number. The first two openings use Standard. `upcoming` and candidate-save commit resolution share this code. Reloads, cancellations, exports, imports and Restore preserve the next type without adding save fields or consuming card RNG. Forced dev types remain one-shot. Schema stays 4; app version is 2.1.0.

`brand-pack-skins.js` registers materials through the skin API. Shared markup reads logo metadata; it never chooses a brand or pool. Logos are local images; pack surfaces use CSS geometry rather than the generated bitmap. `pack-skin-layer` permits cleanup when a wrapper changes type. High tracks the pointer and repeats a six-second sheen; Medium runs one sweep per appearance; Low and Very Low stay static. Waiting/refill semantics, shared scheduler, reflection/material policies and reduced motion continue to apply.

The collection spin uses the existing `collecting` phase, after durable Keep. It rotates the same card view to its authentic engraved back, changes surfaces at the hidden edge, and lands the next wrapper at the menu pack position. Ownership, serial, finish, reward and opening count are never mutated by this animation. Hidden-tab policy pauses its presentation clock. Save replacement destroys the temporary wrapper. The inventory toast and collect pulse confirm the earned card.

## Design references and local artwork

- NVIDIA: [official RTX 5090 page](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/). Graphite, silver machining and green inlays. Its `n24-nvidia-logo` SVG provides the logo; `nvidia-eye.svg` crops the original eye geometry.
- AMD: [official Radeon page](https://www.amd.com/en/products/graphics/desktops/radeon.html). Dark metal, red geometric bands and arrow geometry. [Official header logo](https://www.amd.com/content/dam/code/images/header/amd-header-logo.svg) is bundled verbatim.
- Snapdragon: [official laptop page](https://www.qualcomm.com/snapdragon/laptops-and-tablets). Gold-on-black chip treatment with the red flame wordmark. [Official red logo](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/images/snapdragon/snapdragon-logo-red-2.png) is bundled verbatim.
- Apple: [official MacBook Pro page](https://www.apple.com/macbook-pro/). Silver metal, spare typography and generous spacing. Its navigation vector is bundled with a tight viewBox and dark fill.

`assets/packs/nvidia-concept-v1.png` was generated with built-in imagegen; its exact prompt is `assets/packs/nvidia-concept-prompt.txt`. The live skin translates silver chamfers, a graphite center, lime inlays and header hierarchy into code. These are unofficial Cardable wrappers; no partnership or performance claims are added. Validation is recorded in `VALIDATION.md`; no new manual command or automatic check is introduced.
