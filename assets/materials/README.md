# Local coating assets

These original SVG material textures were generated locally for Stage 12: 3,200 subpixel glitter dots for Starlight, 250 stars for Galaxy Holo, and 2,600 light/dark grain dots for Matte. Each texture is one local image layer, rather than thousands of animated DOM elements. Seeded placement makes the textures reproducible and stable.

The 38 alpha masks in `assets/cards/masks/` derive from the owner's existing card artwork. They preserve the product outline, fill internal silhouette gaps, soften the edge by less than one source pixel and stop above the photographed floor reflection. Per-image floor cutoffs distinguish chip portraits and taller brackets. They are optical masks, not replacement artwork or newly sourced assets. Image masks retain source dimensions and the same cover/46% positioning as the front artwork. Procedural Spotlight masks use the existing GPU hardware group instead.

Runtime needs no build step, script, remote service or image dependency beyond these files.
