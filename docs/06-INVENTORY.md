# 06 — Inventory

A frosted-glass sheet that pulls up from the main menu. A shelf, not a grid.

## 1. The sheet

- Collapsed: only the arrow (plus a few pixels of the sheet's top edge) is visible.
- Open via arrow click, drag up, ArrowUp or `I`. Close via drag down, arrow, Esc.
- Drag follows the pointer, then springs to rest (stiffness 220, damping 26). Rubber-band resistance at the limits; a flick adds velocity.
- **Depth:** when open, the main menu behind scales to about 0.96, blurs (about 8 px) and dims (about 40 %).
- **Surface:** the glass recipe from `Designs.MD` section 5 (heavy blur, faint white tint, 1 px top highlight, soft shadow above). The dot grid stays faintly visible through it.
- Sheet height: about 62 vh.

## 2. Header (tiny)

Left: "Collection" (Inter, small). Right: `12 / 40` (mono, counts up when the sheet opens) with a thin progress line beneath that fills in the same fluid style as the pack timer. Under it, one quiet row of text options: `All · By generation · By rarity` with a sliding underline for the active one.

## 3. Shelf

- One horizontal, snap-scrolling row (`scroll-snap-type: x mandatory`), momentum scrolling, a light tick and a small scale pulse as each card centers.
- **Coverflow feel:** the card nearest the center scales up (about 1.0) and sharpens; others shrink (about 0.82) and dim slightly (opacity about 0.6). The centered card shows a soft reflection on the glass beneath it.
- At rest, show **only the card art and its name**. Stats appear on hover or when opened.
- **Duplicates stack:** one tile with a small `x3` count, not three tiles. Instances keep their own serials underneath.
- **Not-owned cards** appear as faint silhouettes so the collection shows what is missing without clutter: dark outline of the card shape with the generation label only. Names are hidden (`???`), see OPEN-QUESTIONS #9. The **Secret** tier shows its Unfound design instead of a plain silhouette. On open, one very faint shimmer sweeps left to right across the silhouettes once.
- **New badge:** a small dot on a tile until its card is first viewed (`seen` flag).
- Order: by generation (`order`), then tier, then card id. Every card in `Cardable.data.cards` gets a tile (owned or silhouette).
- Performance: virtualize. Render only tiles within about ±6 of the center; the rest are placeholders of the same width. Shelf cards use **lite** render mode; only the centered/hovered card is full.

## 4. Detail view

- Click or Enter on a card: it **lifts out of the sheet** with a shared-element transition into a full-screen detail view (the card visibly travels from its tile). The sheet dims behind it.
- The detail card is in full mode with the same tilt, foil and shine as the reveal, and a slow idle sway.
- Show: name, tier badge and meter, generation, VRAM, full specs, description text of the tier, and for stacks a small serial browser (left/right arrows through the instances' serials, mono).
- Flip control: a small circular button flips the card to show the back (logo plus serial) with a 3D flip.
- Close: click outside, Esc, or drag down; the card flies back to its tile.

## 5. Empty states

- No cards yet: the shelf shows only silhouettes, and a single quiet line: "Open your first pack."
- Collection count shows `0 / N`.

## 6. Data

`ownedByCardId = group(save.inventory, 'cardId')` gives counts and instances. The catalog is `Cardable.data.cards`. No separate inventory data is stored beyond `save.inventory`.
