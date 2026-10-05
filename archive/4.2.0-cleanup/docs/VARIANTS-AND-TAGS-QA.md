# Stage 12 acceptance evidence — 2026-10-02

## Scope and tested checkout

Cardable 1.1.0, save schema 3. QA used a separate copy of the intended checkpoint at `D:/CardableV2/outputs/variants/checkpoint`: the current Stage 12 sources and assets, with the three pre-existing dirty currency/pack files taken from HEAD and the unrelated untracked fonts/hero image omitted. This verifies the delivered update independently of that other work. The shared working tree retains those edits.

## Automated results

- **344 passing logic groups across 17 suites.** Stage 1–8, all tier materials, visual fixes, card remake, opening QoL, settings/Data tools, and 19 variant/tag groups. Source scripts also pass `node --check`.
- **12 passing Playwright groups in real Chromium using file://.** No browser exceptions and no HTTP(S) requests. Dev-mode startup's existing embedded checks pass as part of the suite.
- The variant suite checks the exact 10% threshold and each weighted interval boundary, a seeded 100,000-roll sample, independence across all 12 pullable rarities, legacy migration, old checksums, export/import, backups, Restore, Undo, unsupported IDs, stacks/preferences/filtering/New, selected-serial dates, failed Keep, hidden pauses, reduced motion, recovery/Delete, and exact acquisition identity.
- Existing opening suites cover failed original durable commits, unchanged stock/serials/rewards on failure, committed replay, multi-card pending recovery and repeated input. New browser coverage uses the actual three-second Space hold and confirms that finish plus $200 are saved before the optical transformation.
- Material inspection includes Normal plus all eleven finishes on both supplied images and procedural artwork. A **132-combination matrix** checks all 12 pullable rarities with every finish, including back isolation and concealed Secret. Additional screenshots inspect Legendary crown, Mythical flames, Exotic/Ascendant frames, owned Secret, mobile layout and reduced motion.
- Inventory checks verify artwork-only shelf/grid/peek/flying copies, separate finish stacks, one GPU completion count, per-finish favorites/collections/order, duplicate serial navigation, printed detail restoration and a clean return with zero leftover transition cards.

The machine-readable results are in `VARIANTS-AND-TAGS-EVIDENCE.json`. Test commands are `node tools/check-variants.cjs`, the existing `tools/check-stage*.cjs` suites, and `node tools/check-variants-browser.cjs` with Playwright available through NODE_PATH. Browser screenshots default to the workspace outputs directory and can be redirected with CARDABLE_QA_OUTPUT.

## Visual review

Reviewed captures under `D:/CardableV2/outputs/variants/checkpoint-browser/`:

- `all-finishes.png`: 24 image/procedural views. Silver bands and opposing Beam stay achromatic; Rainbow, Galaxy and Aurora read separately; Shattered is angular; Starlight and Matte use bounded texture images. Spotlight follows the supplied GPU silhouette and procedural hardware rather than lighting a rectangular image window.
- `inventory-shelf.png`, `inventory-grid.png`: art is clear, tag rails sit above the cards and names/copy metadata below. Reflected cards contain artwork without a second reflected text block.
- `detail-beam.png`, `legendary-variant-detail.png`: readable printed fronts and selected-serial metadata; crown and tags have separate clearance.
- `mobile-detail.png`, `mobile-crown-tags.png`: safe card/prop bounds with a scrollable detail panel. Keyboard labels expose compact New/Favorite information; expanded detail tags are focusable.
- `variant-reveal-start.png`, `variant-reveal-middle.png`, `variant-reveal-finished.png`: normal start, coating alignment/fade and final finish tag with enabled actions. Reloaded Spotlight displays its final finish immediately.

Masks derive from the 38 owner-supplied card images. The optical mask excludes the photographed floor reflection; baked light remains in the image. Future supplied art needs its own subject mask. No external art, network dependency or executable asset pipeline was added.

## Performance measurements and limits

The 1000-design fixture contains multiple finishes per GPU and more than 1000 logical inventory entries. Browser assertions observed **12 mounted shelf cards, 42 grid cards and one full-effect card**. Grid/neighbors use static materials; Starlight/Matte/Galaxy use one SVG texture each and Shattered uses 24 bounded shards per material. Galaxy/Aurora translate a prepainted layer through the shared quality-throttled scheduler.

A separate headless comparison warmed each Basic card for four seconds, then sampled two seconds of idle motion at 1440 × 1000. Small Normal/Aurora measured about **15.1 / 14.5 FPS**; large-fixture Normal/Aurora measured **12.0 / 11.9 FPS**, with p95 frame gaps approximately **150 / 183 ms** for the large fixture. Focused-card JavaScript maximum subscriber cost was at most **0.3 ms** in that comparison. These are headless paint/compositing measurements, not proof of hardware-accelerated performance. The existing 60 FPS target is **not verified** and was not met by this environment; check the delivered game in the user's accelerated browser before claiming it.

The final browser acceptance run also reports its short cadence sample in the evidence JSON; do not treat a short sample or concurrent-test timing as a hardware benchmark. Functional, virtualization, lifecycle, motion-preference and offline assertions pass independently of timing.

## Remaining human acceptance

Inspect tilt/shine and reveal rhythm on the target GPU/browser, especially Spotlight masks and the high-tier prop combinations. Verify sustained 60 FPS there. No functional acceptance item is intentionally deferred; target-machine rendering performance remains unverified.
