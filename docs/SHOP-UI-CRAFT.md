# Shop collection room — UI refinement

Historical first refinement. The later [composition and save-retry pass](SHOP-CINEMA.md) replaces its ornamental copy and display plates; its screenshots below retain the earlier design.

2026-10-13 · `feature/daily-shop` · follow-up to Stage 4 commit `d193606`.

The Shop now has a stronger Titan title lockup, a machined exhibit stage, and four card display plates with fine dividers. Artwork opens inspection directly. Prices stay beside the controls; compact purchase labels remove the repeated price from every button while their accessible names still state the exact item and cost.

## Interaction and motion

- **Rotate exhibit:** native range control with keyboard, pointer and touch input; Reset returns the pack to its original pose. Bounded pointer light and tilt add depth at the permitted graphics level.
- **Inside the vault:** browse the real 17 Titan catalog designs using a selector or previous/next buttons. One static thumbnail replaces the previous one. No card is minted, reserved or promised by browsing.
- **Turn card:** a visible control and the R shortcut invoke the existing card flip in focused inspection.
- **Focused rendering:** Shop's existing shared frame callback now advances its visible full inspection or receipt card. Independent card views were previously mounted without being advanced, which left a flip busy after its first turn. The four browsing thumbnails remain static, and hidden or destroyed full views do not update.
- **Daily selection:** a useful jump control scrolls to the offers and moves focus to their heading. Card art receives focus feedback and opens inspection with Enter/Space.
- **Motion:** header and Titan object entrances, staggered copy, offers arriving when they scroll into view, inspection transitions, roster changes, hold feedback and acquisition. Transform/opacity animation follows interface speed. Hold confirmation remains exactly 1.4 seconds. Ambient animation, Hover animations, reduced motion and quality remain separate controls. Hidden documents pause motion; closing or replacing a view disconnects observers and cancels animations. No additional frame subscription or private RAF loop was added.

## Verification

`tools/check-shop-craft.cjs` passed against local `file://` Chrome: keyboard rotation/reset, pointer lighting, direct artwork inspection, reverse/front card control, all 17 roster options, cycling/wrapping, 25 repeated roster changes without growth in live card views, unchanged wallet/inventory/serial/Shop data, independent motion/hover switches, simulated hidden-document pause, mono mobile, repeated Close cleanup, zero page/console errors and zero HTTP requests.

The existing Stage 3 purchase and touch/visual checks passed after the redesign. The Stage 4 acceptance script passed at 360×800, 390×844, 768×1024, 1024×768, 1366×768 and 1920×1080, plus 2× DPI, legacy saves, capped receipts, focus return and hold interrupted by resize. Syntax, asset paths and `git diff --check` passed. Screenshots were reviewed in color and monochrome. These remain browser checks, not physical-device or packaged Electron measurements.

Review [desktop](../artifacts/shop-craft-desktop.png), [daily displays](../artifacts/shop-craft-selection.png), [Titan catalog](../artifacts/shop-craft-vault.png), [mobile mono](../artifacts/shop-craft-mobile-mono.png), [mobile offers](../artifacts/shop-craft-mobile-selection.png), and the [interaction recording](../artifacts/shop-craft-tour.webm). The UI pattern and gallery entry are updated in `Designs.MD` and `src/ui/kit/gallery.js`.

The local Shop branch remains the review target; the Stage 4 Market integration boundary still applies.

The required one-time `npm run deliver:desktop` attempt stopped at its Windows process probe: `Get-CimInstance` cannot access the CIM resource in this sandbox. No installer or Latest Build shortcut was produced or replaced. Packaged Electron acceptance remains the documented Stage 4 boundary.
