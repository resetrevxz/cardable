# POLISH-BACKLOG

Codex appends ideas here instead of building them mid-stage. The owner ranks them. Format: `- [ ] (stage) idea — why it matters`.

## Seeded ideas (subtle, ranked roughly by impact)

- [x] (all) One light source everywhere: audit every highlight and shadow for direction consistency. Stage 8 source audit; rendered review remains pending.
- [x] (card) Parallax between art, foil and text layers by 1-3 px so the card looks thick. Art moves up to 2 px, foil counter-moves; reduced motion stays flat.
- [x] (card) Faint grain on the card body to avoid banding in dark gradients. Static local SVG texture at 2.5%.
- [x] (cards) Shelf cards get a static baked highlight in lite mode so they still feel metallic. Static top-left glare; no animation required.
- [x] (reveal) Very faint screen vignette that deepens during preFlip for tiers 7+. Neutral vignette, disabled with reduced motion.
- [x] (reveal) First-time pulls get a slightly longer bloom; duplicates skip the dust puff. Existing 200 ms New hold retained; subtle first-pull bloom gain and duplicate dust suppression added.
- [x] (menu) The pack shadow breathes in sync with its float. F6 grounds it outside the moving rig; it grows darker/larger as the pack lowers.
- [x] (menu) Digits in the countdown roll with a 20 ms stagger. Only changed digits participate.
- [x] (menu) The wordmark occasionally runs one silent morph when idle. F5 uses one calm scrambled letter after queued pointer restoration.
- [x] (inventory) Sheet top edge shows a 1 px highlight that brightens while dragging. Neutral highlight follows capture/release.
- [x] (inventory) Coverflow card reflection fades with distance from center. Continuous reflection alpha follows shelf position.
- [x] (global) Grain overlay at 2-3 % opacity. Static 2.5% texture shares the card's cached SVG image.
- [x] (global) Tab title and favicon states for "pack ready". Existing title behavior plus a quiet mono favicon dot.
- [x] (global) Every hover state audited for layout shift (must be none). Transform/opacity/translate/scale only; fixed shelf geometry retained. Browser confirmation remains pending.
- [ ] (later) Sound design (behind `config.flags.audio`).
- [ ] (later) Touch input mapping for hold and cut.

## Added by Codex

(append below)

## Stage 8 review and remaining acceptance work

The seeded items above were worked in their listed order after save/accessibility hardening. See `STAGE-8-DESIGN-REVIEW.md` for the screen review and `STAGE-8-REPORT.md` for evidence and limits. Checkmarks record implementation or existing behavior verified from source/tests; they do not assert a rendered designer signoff.

- [ ] (acceptance) Render every screen from the local file in color and mono; critique glass density, card contrast, reflection clipping and shine. The established file preview restriction prevents screenshots in this session.
- [ ] (acceptance) Measure browser paint/compositing on a mid-range laptop, especially the sheet's 40 px blur, grain and one full Secret finish among 300 tiles. Use the new profiler for JS/cadence, then the browser Performance panel for paint.
- [ ] (acceptance) Check the real native file picker and download, modal focus at 200% zoom, missing-font fallback, and system reduced-motion changes during every opening phase.
- [ ] (content) Replace the placeholder catalog when the owner supplies the real generation-wise card list. No replacement list is currently present.

## Requested F1–F6 fixes

Implemented in `FIXES-F1-F6-REPORT.md`: atomic whole-card handoff and art-only toast/flight thumbnails; pre-mounted transform/clip glass toast; subtle capped click breaths; exclusive opening pulses; fixed-slot independent logo scrambling; and the aligned satin pack rig with a grounded shadow. Source and behavior checks pass. Toast first-frame glass compositing and pack/wordmark screenshots remain part of the rendered acceptance gate above.

## Requested N1–N6 features

Implemented in `NEW-FEATURES-N1-N6-REPORT.md`: scoped R/button turns, the common engraved back, normal inventory-arrow activation, the transform carousel, bounded FLIP sort transitions and hover/focus version metadata. Shelf cards remain lite, with detail as the sole full card. Behavioral checks and host CPU samples are recorded; rendered material and 60 FPS acceptance remain in the gate above.

## Sealed idle pack review — ranked future polish

Rendered menu, half-filled tilted wrapper, and opening-stage foil were reviewed in Chromium. The pack now reads as a manufactured wrapper, with two recognizable seals and controlled silver highlights. These are optional follow-ups, outside this pass:

1. Validate sustained 60 FPS on the target laptop, including paint/compositing at 4K and rapid grabs; headless evidence remains narrower.
2. Refine the ground reflection into an attenuated silhouette rather than a broad metallic bounce.
3. Tune the liquid boundary's edge meniscus against photographed sealed films at oblique angles.
4. Add a tiny manufactured notch to the physical top edge when the opening animation can use it.
5. Make the security strip's etched line spacing less uniform at inspection distance.
6. Allow print batch metadata to be generated from an ephemeral visual seed, without changing pull randomness.
7. Refine the focal relief's highlight thickness at high display density.
8. Offer a secondary data-backed contents sheet if guarantees or eligible-generation filters are later authored.
9. Consider a back overlap seam if larger inspection angles ever become useful.
10. Revisit the front microprint's registration offset after a human review at normal viewing distance.

The detail someone would feel missing: the darker trough immediately beneath each compressed seal. It visually explains where the flat crimp becomes the card-filled body; keep that transition even when simplifying rendering.

## Major inventory refresh — acceptance and deferred ideas

Core refresh implementation and behavioral evidence are recorded in `INVENTORY-REFRESH.md`. The design critique is a source review; this task's file preview was blocked, so it does not claim a rendered Apple-style signoff.

1. Render and critique centered/neighbor card spacing, mystery faces and edge masks at 1280, 1920, 2560, 3840 and ultrawide widths.
2. Profile real sheet blur/compositing, moving Shelf, virtual Grid, live filters, detail and acquisition flight; target 60 fps on the intended laptop.
3. Review narrow toolbar/tab density and the handoff landing against the moving sheet; tune only after screenshots and Performance recordings.
4. Verify browser zoom 80–150%, physical pointer capture, native file requests and visible focus rings with both fonts and fallbacks.

Deferred until those gates are stable: multi-select, bulk actions, saved filters, drag-to-tab, collapsible groups, alphabetical index and onboarding hints.
