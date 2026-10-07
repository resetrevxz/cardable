# 06 — Inventory

The approved major inventory refresh supersedes the original shelf-only brief. The inventory is a mounted glass sheet with Shelf and Grid views, discovery tools and saved collection preferences. Chrome remains monochrome. Ownership is still `save.inventory`; collections reference current finish/skin stack keys and never copy instances.

**Current presentation:** Stage 12 finish-stack identities and Stage 14 rendering rules supersede the historical card-ID and centered-full-card descriptions below. Shelf and Grid both use front-only static thumbnails; detail owns the full card. The sheet uses shaded prepainted surfaces without full-sheet backdrop filtering, and viewport-based mount budgets replace fixed overscan. See `VARIANTS-AND-TAGS.md` and `06-INVENTORY.md`. Historical validation figures in the refresh report do not establish results for later edits.

The collection summary spans the title/count columns and wraps at narrow widths. Search validation occupies a separate row below its input, retains the last valid results, and associates its message with the input. Search and chips share the header's responsive inset; long filter values wrap inside the sheet. These layout refinements add no frame subscribers or thumbnail effects.

In side-by-side detail, the width budget includes the card's complete prop bounds, information column and intervening gap before centering the composition. Tall/narrow windows must not size the card against the entire viewport while adding the metadata column outside that budget. Stacked detail retains its existing height limits and scrollable information panel.

## 1. Sheet and toolbar

Four detents are configured in `config.inventoryMotion.detents`: Peek (104 px), Normal (62 vh), Expanded (82 vh), and Full (16 px from the viewport top). Peek shows the owned/catalog count and a static selected-owned thumbnail. The handle owns sheet dragging; card gestures belong to Shelf/Grid. The spring remains stiffness 220, damping 26, with rubber-band limits and velocity-based settling.

Arrow click, focused Enter, I and ArrowUp open. Space remains reserved for pack opening. Collapse returns to Peek. Escape first cancels a reorder, closes a popover/search or detail, then closes the sheet. Background controls become inert while open; keyboard focus remains inside the current modal. The current sheet uses prepainted shading and depth dimming at Normal, with no full-scene blur. Opening and settings retain input ownership.

The restrained toolbar contains collapse, title/count/progress, Search, Filter, Sort, Shelf/Grid and More. Inline SVGs share a stroke style, delayed tooltips and visible focus rings. Tabs are All Cards, Favorites and custom collections. Show Unowned persists.

## 2. Shared ownership and query model

`C.collection.project` groups duplicate instances and supplies canonical generation/tier/card-ID order. Unowned retired placeholder records are omitted; owned retired instances remain available. `C.inventoryQuery` produces the result model for both views, with stable selection by current stack key.

Search covers owned names, brand/type metadata, generation, registry rarity, normalized VRAM, memory type and formatted specs. Unknown cards disclose only generation and rarity in text searches. Tags: `name`, `rarity`, `vram`, `generation`, `brand`, `owned`, `new`, `type`, `memoryType`. Quotes support spaces. VRAM examples: `vram:8`, `vram:>=16`, `vram:8-16`. MB values normalize to GB; shared memory has no numeric value. Terms combine with AND; selected facet values within a category combine with OR. Invalid tags report an inline error and retain the last valid result set.

Filters include generated rarity/generation/brand/memory facets, ownership and duplicates, New, minimum quantity and VRAM range. Chips can be removed individually; Clear Filters is available. Suggestions use registry facets. No unsupported year/architecture/series/visual-color fields are invented.

Sorts: Catalog, Custom, recent/oldest acquisition, name A–Z/Z–A, rarity low/high, generation, VRAM low/high, quantity and first owned serial. Missing values sort last; catalog index breaks ties. Group by None, Rarity, Generation, Brand, Ownership or New/Existing. Grid has group headers; Shelf has a quiet crossing label. Custom sort requires grouping None.

## 3. Shelf and Grid

Shelf keeps one floating position in card units. A recycled window contains at most ±6 neighbors, with translations relative to the viewport center. There is no catalog-length rail, no `index * pitch` world coordinate and no inherited perspective on the track. Shallow per-tile turning/depth avoids the old compressed faces. Wheel/trackpad, drag momentum, arrows, Home/End and PageUp/PageDown feed the same bounded position. The white focus light follows it and stretches with velocity.

Shelf and Grid use front-only static thumbnails, including the selected Shelf card; detail promotes the sole full card. Hover adds a static highlight/lift. Grid uses the current viewport/preset budget below, rather than a fixed two-row overscan. It computes responsive columns and binary-searches row bounds before rendering. Selection survives view, sort, filter and viewport changes whenever the selected card remains in the results.

Both views show one tile per design with duplicate quantity and New badges. Ordinary unknown cards use an etched GPU silhouette, technical dots, lock, UNKNOWN CARD, generation/rarity and static registered finish details. Names/specs remain hidden. Secret uses the registered Unfound face.

View/sort transitions measure visible tiles, then animate lite overlays using transforms/opacity with bounded staggering. Reduced motion uses a short crossfade.

## 4. Collections, reorder and detail

Custom collections support create, rename, tab move, delete and an owned-card membership checklist. Counts ignore stale/unowned preference references without deleting saved arrays. Favorite and membership mutations require ownership. Each collection has an independent custom order; new registry IDs append in catalog order during projection.

In Custom sort, hold a tile then drag to lift a lite clone, open a small insertion gap and auto-scroll at the view edges. Escape cancels without saving. Context Move Earlier/Move Later uses the same reorder command. Other sorts explain how to enable rearranging.

Click/Enter lifts the same visible card into detail. Detail retains tilt, shine, R/button flip and explicit duplicate serial buttons, and adds quantity, latest acquisition, Favorite, collection membership and previous/next result navigation. Left/Right navigates designs, not serials. Scroll position is restored per design. Escape closes the membership popover before detail. Viewing detail clears New on that design's instances; selection alone does not.

## 5. Acquisition and persistence

Final Keep atomically sets `inventoryUi.pendingFocusCardId` to the last collected card alongside adding instances and clearing `pendingReveal`. It preserves `pulledAt`, `seen`, serials and pack statistics. A same-session handoff carries only a source rectangle and card ID. Opening inventory selects that card, animates a lite clone into the target and highlights it; after reload it selects/highlights directly. It switches to All and clears session filters to make the acquired card reachable. The pending focus clears after the handoff completes (or after the direct reload highlight); closing an unfinished flight retains it. New stays until detail is viewed.

Save schema 2 adds `inventoryUi`: viewMode, sortMode, groupMode, showUnowned, activeCollectionId, lastSelectedCardId, pendingFocusCardId, favorites, collections and customOrders. Schema 1 migration supplies defaults without changing inventory, packs, serials, tutorial or pending reveals. Malformed preferences normalize independently; stale IDs are ignored in projection.

Search, facets, popovers, gestures, sheet progress and momentum are session state. View/sort/group/Show Unowned, favorites, collections/orders and selection persist. Ordinary preference saves retain the existing session-only storage fallback; opening/Keep remain strict transactions.

## 6. Accessibility, performance and acceptance

All animation uses the shared scheduler and visible-time clock. Hidden tabs pause it and cancel captures. Full effects are limited globally to one card. Lite neighbors, mystery faces and Grid do no per-frame finish work. Reduced motion removes turning, lift, blur and rubber-band motion, with crossfades for transitions and static highlights.

Dev fixture controls provide 60, 300, 500 and 1000 logical designs without changing the save. `tools/check-inventory-refresh.cjs` covers queries/preferences, geometry, focus, recovery and resources; Stage 7 retains detail contracts too. See [INVENTORY-REFRESH.md](../archive/4.2.0-cleanup/docs/INVENTORY-REFRESH.md) for current evidence and manual acceptance. The browser preview tool blocked file://; screenshot, material quality and measured browser FPS remain unconfirmed.

Deferred: multi-select, bulk actions, saved filters, drag-to-tab, collapsible groups, alphabetical index and onboarding hints. No market, selling, trading, prices or audio. Stage 12 adds cosmetic variants and Card Tags.

## Stage 12 additions

Current inventory uses schema-3 GPU/finish stacks, artwork-only card presentations, neutral Card Tags and finish search/filter/grouping. Favorite/membership/order and selection IDs are stack keys; individual serials remain stored instances. Detail tags track the selected serial while stack summary dates use the newest copy. Completion still counts GPU designs; All Cards counts rows and the summary reports owned finishes/variant copies. See VARIANTS-AND-TAGS.md for current identities, migration and accessibility.

## 2.2.0 Permanent Classic frames

Instances from Classic Pack carry `cardSkinId:'classic'`. Full reveal/detail cards, static Shelf/Grid thumbnails and collection/receipt copies render the same monitor bezel and terminal panel through `C.cardSkins`. Skinned instances form a separate stack from the same GPU/finish with an ordinary frame; ordinary tuple identities stay unchanged. Favorites, collections, serial browsing, ordering, acquisition focus and export/import preserve these identities. Rarity backgrounds and surface coatings remain visible beneath the bezel.

`era:classic` filters the explicit pre-2007 catalog IDs, across all packs and both inventory views. `era:modern` is also recognized; other era values report an inline error. A neutral CLASSIC glyph identifies this hardware independently of the selected instance's pack provenance.

## 2.7.0 detail panel (current)

This replaces the historical detail information layout described above. The former Overview/History tabs were retired in 1.2.0; the overview is shown directly. The default panel contains only additional specs beyond the visible card plate, optional real lore, an ownership line and a collapsed selector for individual copies in the finish stack. Studio inspection remains available.

At most three provenance chips include the +N control. Variant/pack/freshness take priority; additional freshness, Normal, serial, rarity, exact unpack time and other tags live in a glass popover. All specs expands additional specs without repeating the plate. The registered Inspect action remains primary; Flip/Favorite/More are icon controls. More retains collection membership and adds selected-card JSON export, serial copying and selected-copy deletion through the shared three-second hold confirmation. Removal requires a successful durable write and never adjusts rewards, pulls, serial counters or pack consumption.

Navigation arrows move outside the information panel. Left/Right navigates result cards; I opens Inspect, F toggles Favorite, R uses the existing card flip handler, and Escape dismisses a detail/collection popover before closing. Serial copying on either face uses Clipboard API with a textarea fallback. Inactive panes are inert and cannot contribute overflow. Tabs expose tablist/tab/tabpanel semantics.

The inventory sheet is hidden while detail owns its visual, preserving layout for its return. The panel is 360 px and vertically centered; below 900 px it stacks under the card with whole-view scrolling. Default 720p desktop content has no panel scroll, horizontal overflow or clipped actions. Expanded content uses thin custom scrollbars. Card-plate specs, tier badge/meter and internal R hint are not repeated in the panel.

## Current rendering and mount budgets

- Shelf pans one track. Only the two nearby cards change scale/opacity; captions, counts, tags, visibility and selection attributes update when their value changes. Tile content refreshes when the collection projection changes. Selected date labels invalidate at the next local midnight.
- Shelf virtualization derives its radius from viewport and card pitch: visible cards plus one buffered card per edge for Low/Medium/High; Very Low omits that extra buffer. The 1366px fixture mounts 7 or 9 tiles, instead of 13. It still covers the visible edges while dragging.
- Grid uses binary range lookup, includes partially visible top rows, and keeps at most one extra row on either side beyond partial-row coverage (zero extra rows for Very Low). Existing geometry/labels are cached. A ResizeObserver corrects layout when the actual sheet width changes after viewport/chrome layout.
- Native grid scrolling and shelf poses use bounded compositor layers. Closing or moving away destroys the thumbnails and releases those layers. Reduced motion retains its static shelf poses.
- Browsing uses static front-only materials and image thumbnails. Entering detail still promotes one complete card, including its back, rarity, props and coating; returning replaces it with a thumbnail.
- The inventory sheet uses a prepainted shaded panel, edge lighting and depth dimming instead of nested sheet backdrop blur plus a blurred menu and shelf mask. This applies to all tiers. Other game/settings glass remains controlled independently. Very Low uses a plain panel and static motion; Low uses solid tint; Medium/High have shaded surfaces and differing edge fades/shadows.
- Very Low hides the entire empty cursor blend container. The cutting blade remains visible when active. Previously only its decorative children were hidden, leaving an expensive empty screen-blended surface.
- Spotlight cannot load external local image masks through file:// CSS masking in Chromium. Offline image cards keep their optical glint without that mask; procedural silhouettes retain their inline SVG mask. No network workaround is introduced.

The complete original moving-scene matrix and fixture/measurement limits are retained in [archived INVENTORY-PERFORMANCE](../archive/4.2.0-cleanup/docs/INVENTORY-PERFORMANCE.md). Its scoped headless improvements do not certify physical devices, 240 Hz, later code or a stale activity-suite expectation. These measurements were not rerun for 4.2.0.

## 1.2.0 fixes and visuals

The header uses a compact Inter title, quiet completion count and spaced mono values with UI labels. New/variant summary actions still filter. Only the closed pull-up and peek fade after five seconds, returning with bottom-edge proximity, focus, I/Arrow Up or touch. Open browsing and the tutorial inventory lesson stay visible. The detail overview remains direct; History tabs, entrypoints and recording are retired. Existing save.journal records survive imports/exports unchanged. Original feature files are in [the retirement archive](../archive/card-history-retired/README.md).
