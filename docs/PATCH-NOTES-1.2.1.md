# Patch Notes 1.2.1 — local review

The Patch Notes screen is remade in the complete existing game worktree at `D:/CardableV2/patch-notes-2-work`, branch `update/patch-notes-2`. Main and other feature worktrees were not edited. The two pre-existing Patch Notes edits were copied, with their exact diff, to `D:/CardableV2/archive/artifacts/patch-notes-2-before-1.2.1-20261007` before the remake.

## Design and behavior

The release journal uses Cardable's inventory materials, near-black shaded surfaces, bundled fonts, and monochrome navigation. A release archive sits beside the reading surface, becoming horizontal on narrow layouts. Local artwork and live static feature demonstrations introduce the update. Existing GPU/finish specimens are labeled previews; catalog values replace unsupported draft hardware and balance claims.

The reference images informed the media-and-specimen gallery and grouped before/after rows. [Vercel's interface guidelines](https://vercel.com/design/guidelines) informed focus, native controls, restrained compositor motion, tabular comparisons, and empty-state recovery. [Apple's design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles), [layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout), and [materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials) informed hierarchy, familiarity, content separation, and legibility. Cardable's shaded inventory rule controls the browsing surface.

Search covers releases and all their content. Semantic version sorting, section filters, result counts, View more controls, expandable change groups, remembered positions, back-to-top, and full-release markdown copy support reading. Interactive mode enables pointer tilt, a before/after emphasis slider, and finish selection in inspection. One full specimen mounts at a time; close releases views and restores focus and prior inert states. Preview objects do not change inventory, odds, rewards, or save schema.

## Evidence and limits

One offline `file://` Chromium session used the actual `index.html` entry. Source corrections were loaded in that same session. No game screenshots, recordings, profiling, old suites, or new test files were created.

- The HUD opened the journal; the current hero and six static views mounted with no failed images or renderer errors.
- View more revealed six card specimens. Full inspection showed the RTX 5090 catalog values, including 2410 MHz boost, rather than the prior fabricated 2550 MHz value.
- Interactive finish selection, flip, reset, nested Escape, focus restoration, and a Tab cycle confined to inspection worked.
- Search, no-result recovery, semantic oldest/newest order, major-only filtering, section filtering, expand/collapse all, and a fourth comparison-row expansion worked.
- A per-release scroll position of 380 px restored after switching releases.
- DOM geometry found no horizontal overflow in the modal, content, or header at 1440×1000, 1024×768, 768×1024, 390×844, and 320×740. This is layout evidence, not screenshot-based visual acceptance or physical-device testing.
- Reduced motion produced no specimen tilt or modal entrance animation.
- The / shortcut focused journal search without opening the command palette; Escape closed the journal from the search input; N reopened it.
- Closing released all specimen views: zero live views, zero full cards, zero mounted journal specimens. Inventory remained byte-equivalent to its initial empty state.
- The final clipboard permission probe remained pending in headless file:// Chromium. A 1.2-second timeout now offers selectable notes rather than waiting indefinitely. That final timeout/fallback and hidden-tab video pausing received source/syntax review; they were not re-exercised after the session ended. Successful system clipboard delivery remains unverified.
- JavaScript syntax checks, release version/notes validation, and `git diff --check` passed. Gameplay was not changed, so no gameplay logic suite was run.

## Packaging state

The mandatory desktop-delivery attempt refused the worktree's linked `vendor` directory and did not replace the shared preview/shortcut. The empty vendor directory was materialized locally; the shared development dependency junction remains unchanged.

A direct `npm run dist` completed with publishing disabled before the owner's instruction to defer installer builds arrived. Its generated artifacts remain under this worktree's ignored `dist/`; nothing was installed, launched, published, or handed off to the desktop. The later clipboard/visibility source changes are absent from that earlier artifact. Further packaging is explicitly deferred; review the current source through `index.html`.

No merge, push, release tag, or publication was performed. The existing full-game worktree was reused rather than copying concurrent dirty main changes over it. Future merge integration remains an explicit owner action.
