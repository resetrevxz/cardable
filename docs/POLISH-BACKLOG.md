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
