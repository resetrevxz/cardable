# Stage 4 — sealed idle pack refresh

**Done**
- Rebuilt the idle Standard wrapper with wider crimped seals, pinched sides, seams, shallow folds, visible thickness, internal card pressure, and layered shadow/reflection.
- Added silver satin foil, lamp-driven reflections/film offsets, embossed die-ring geometry, restrained security printing, generation metadata and native manufacturing microprint. Motif paths and presentation parameters come from pack data.
- Added bounded pointer grab/drag, spring return, small lift/rotation, restrained flex, and 34 ms internal-mass lag. Right-click or V inspects; Escape returns. Dragging performs no pull or save mutation.
- Integrated timestamp-derived fill into the foil volume, with a gravity-relative meniscus, acceleration response and a faint transmitted print image beneath the boundary. Ready arrival remains a single silver sweep.
- Kept the existing Space hold, early-release drain, atomic charge commit, cut/tear, reveal and reload recovery. Opening starts from the idle pose and uses the same wrapper construction.
- Added a pointer hold action below the pack; its label stays secondary to the object. Kept the configured one card per pack and eight-hour regeneration.
- Preserved classic scripts, direct file:// play, offline assets, monochrome UI, reduced motion, and the shared animation loop. No audio or network dependencies.
- Updated architecture/extension instructions and recorded the rendered critique in POLISH-BACKLOG.md.

**Skipped or changed**
- New pack types, themes and a selector were excluded per the user's instruction. Existing disabled pack data remains disabled.
- The existing one-card count remains authoritative; the brief's example “5 GPU cards” was not made into a new game rule. No invented guarantees or probabilities are printed.
- The pack stays grounded instead of using the former 5 px float. Idle motion is a slow, subtle change in the material's glint.
- Refraction is a bounded layered laminate/transmitted-print approximation. It does not simulate full cloth, fluids or ray-traced optics.
- Unrestricted flipping, a backside, an odds sheet, grab-to-tear and optional fingerprints were deferred. Current opening mechanics remain intact.
- Existing inventory, catalog, currency and other working-tree changes were preserved separately from the pack checkpoint.

**Look at**
- Double-click index.html. Drag the body in either ready or waiting state; hold Space to open. Holding the Open pack action provides the pointer equivalent. A short hold drains without consuming the pack.
- Press V while the pack has focus or right-click it to inspect, then press Escape. Check the relief and security strip at left/right/up/down angles.
- Browser evidence and screenshots are in D:/CardableV2/outputs/idle-pack/. The QA runner is tools/check-idle-pack.cjs; provide Playwright through NODE_PATH. Tests use isolated browser storage.
- Focused state suites cover the menu, atomic opening/cancellation, reveal/collection and hidden-tab recovery. Rendered browser checks cover six fill levels, four drag profiles, five resolutions, reduced motion and the complete reload/Keep journey.
- Validation completed both in the shared working tree and in an export of the isolated pack checkpoint: 18 menu groups, 26 opening groups, 24 reveal/collection groups, 11 browser groups, plus a separate staged pointer-hold opening/Keep check. No application exceptions or network requests occurred in either browser journey.
- Browser measurements are preserved in IDLE-PACK-WORKING-BROWSER-EVIDENCE.json and IDLE-PACK-STAGED-BROWSER-EVIDENCE.json. A separate dedicated comparison reached approximately 55 FPS with the pack versus 60 without it in headless Chromium; the concurrent staged sample reported 40 FPS and a 33.3 ms empty-page median. Pack JavaScript peaked at 0.2 ms in these samples. These measurements do not certify sustained 60 FPS or manual feel on target hardware.

**Open questions**
- No new gameplay decisions were required. Existing defaults from OPEN-QUESTIONS remain in place.
- Headless cadence is measured separately from JavaScript cost. The 60 FPS target on a representative laptop and real manual handling remain hardware acceptance checks; see the recorded browser profile for measured results rather than a universal FPS claim.
