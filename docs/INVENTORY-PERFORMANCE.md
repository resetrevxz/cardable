# Stage 14 - Inventory performance

The moving inventory incurred substantial browser rendering work despite small JavaScript frame costs. This update separates content changes from motion and removes nested full-surface rendering effects from browsing.

## Rendering and budgets

- Shelf pans one track. Only the two nearby cards change scale/opacity; captions, counts, tags, visibility and selection attributes update when their value changes. Tile content refreshes when the collection projection changes. Selected date labels invalidate at the next local midnight.
- Shelf virtualization derives its radius from viewport and card pitch: visible cards plus one buffered card per edge for Low/Medium/High; Very Low omits that extra buffer. The 1366px fixture mounts 7 or 9 tiles, instead of 13. It still covers the visible edges while dragging.
- Grid uses binary range lookup, includes partially visible top rows, and keeps at most one extra row on either side beyond partial-row coverage (zero extra rows for Very Low). Existing geometry/labels are cached. A ResizeObserver corrects layout when the actual sheet width changes after viewport/chrome layout.
- Native grid scrolling and shelf poses use bounded compositor layers. Closing or moving away destroys the thumbnails and releases those layers. Reduced motion retains its static shelf poses.
- Browsing uses static front-only materials and image thumbnails. Entering detail still promotes one complete card, including its back, rarity, props and coating; returning replaces it with a thumbnail.
- The inventory sheet uses a prepainted shaded panel, edge lighting and depth dimming instead of nested sheet backdrop blur plus a blurred menu and shelf mask. This applies to all tiers. Other game/settings glass remains controlled independently. Very Low uses a plain panel and static motion; Low uses solid tint; Medium/High have shaded surfaces and differing edge fades/shadows.
- Very Low hides the entire empty cursor blend container. The cutting blade remains visible when active. Previously only its decorative children were hidden, leaving an expensive empty screen-blended surface.
- Spotlight cannot load external local image masks through file:// CSS masking in Chromium. Offline image cards keep their optical glint without that mask; procedural silhouettes retain their inline SVG mask. No network workaround is introduced.

## Captured evidence

Private Chromium file:// contexts, 1366x900, a 60Hz browser cadence, 1,512 finish stacks from the actual catalog, every preset. Five-second sustained shelf movement and grid scrolling, after 1.5 seconds of warmup. The baseline is the source snapshot captured immediately before this inventory update, with the same local assets. Script-driven motion deliberately sustains rendering; these are moving-scene results, not idle FPS.

Numbers below are median / p95 frame gaps in milliseconds; lower is better. Grid uses raw requestAnimationFrame gaps: the game scheduler sleeps between native scroll notifications and resets its own frame delta, so that delta is not a valid grid FPS measure.

| View | Preset | Before, ms | After, ms | Mounted at sample end |
| --- | --- | --- | --- | --- |
| Shelf | very-low | 50.0 / 83.4 | 16.7 / 16.8 | 13 -> 7 |
| Shelf | low | 33.3 / 66.7 | 16.7 / 16.7 | 13 -> 9 |
| Shelf | medium | 66.7 / 133.4 | 16.7 / 16.8 | 13 -> 9 |
| Shelf | high | 66.6 / 150.0 | 16.7 / 16.8 | 13 -> 9 |
| Grid | very-low | 66.7 / 83.4 | 16.7 / 16.7 | 36 -> 18 |
| Grid | low | 50.0 / 66.8 | 16.7 / 16.8 | 36 -> 30 |
| Grid | medium | 83.3 / 150.0 | 16.7 / 16.8 | 36 -> 30 |
| Grid | high | 83.4 / 100.0 | 16.7 / 16.8 | 36 -> 30 |

High shelf p99 was 33.3ms, so occasional missed refreshes still occurred. Median/p95 after optimization were approximately one 60Hz frame across all eight scenes. Inventory script time at p95 was 0.2-0.4ms. High shelf child mutations fell from 1,956 to 268; its attribute mutations fell from 7,574 to 3,065 despite processing about four times as many frames. Steady movement inside the same selection now produces zero caption/tag child writes.

These measurements are headless browser observations on this host. They do not certify a physical phone, the user's premium PC, or 240Hz rendering. Images and appearance were inspected in desktop and phone-width screenshots.

## Verification and reproduction

`tools/check-inventory-performance-browser.cjs` checks all presets: bounded mounts, unchanged-content movement, favorite metadata refresh, pointer drag, detail promotion/flip/return, long-grid scrolling, keyboard End under reduced motion, phone resize, and thumbnail release away after close. It also checks that the Very Low cursor fix preserves the cutting blade. Contexts are private and never read or modify the player's save.

`tools/profile-inventory-motion.cjs` captures raw browser frame gaps, subscriber JS time, DOM mutations, mounted nodes, screenshots, runtime errors and network requests. Use `PROFILE_MODE=shelf` or `grid`; optional `PROFILE_INDEX` points to a source snapshot. `PROFILE_LABEL` names the evidence file; `CARDABLE_QA_OUTPUT` overrides the output folder. Optional `PROFILE_CSS` / `PROFILE_SET` allow repeatable ablations.

Captured JSON/screenshots are in the workspace outputs/inventory-optimization folder. Baseline browser errors were local Spotlight-mask CORS failures; optimized runs had none. The focused regression suite must report zero page/console errors and zero HTTP requests.

The separate activity regression tool still expects the distant settings gear to be hidden, while the current pending activity stylesheet intentionally makes it always visible. That stale expectation failed; it is not counted as passing coverage or changed by this inventory update.

The isolated staged checkpoint also passed all four preset journeys with its 720-stack catalog, independently of the pending developer workspace/asset update. The working checkout passed with 1,512 stacks. The checkpoint additionally prevents the settings gear from covering the inventory detail close button. Pending proximity code skips open-sheet geometry reads and repeated identical opacity writes; those integration edits remain with the existing uncommitted activity implementation.
