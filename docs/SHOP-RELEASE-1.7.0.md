# Shop release integration — 1.7.0

The owner authorized merging Shop into main and releasing 1.7.0 on October 13, 2026. Main at `d25f7f0` fast-forwarded to the completed Shop checkpoint `8dedf07`; no conflict resolution or feature reimplementation was needed. The fetched public main at `9996e2f` was an ancestor, so the release also carries the existing local 1.6.0–1.6.4 cinematic and save-recovery updates.

Market remains disabled. `feature/market-beta` was not merged, and its checkout was not modified. Existing pack rewards, refill stock and optional save-schema contracts remain as implemented on main. Purchased Titan openings follow the separate Shop entitlement contract.

## Merged-source checks

The following existing checks passed from the primary main checkout with isolated browser contexts:

- `scripts/check-data.js`, `tools/verify-assets.cjs`, release version/notes validation and the generated website build.
- `check-shop-stage2.cjs`: deterministic offers, frozen quotes, rollover and persistence.
- `check-shop-stage3.cjs` and `check-shop-stage3-edge.cjs`: purchase identity, exact funds, rejected writes, recovery, repeats, import/restore, counter boundaries, midnight and ordinary-pack regression.
- `check-shop-stage3-titan.cjs`: Medium charge → shroud dial → reveal → Keep, reload recovery and the retained authentic card.
- `check-shop-stage4.cjs`: six viewport sizes from 360×800 to 1920×1080, high DPI, calm settings, focus return, hold cancellation, bounded subscriptions, legacy inventory and receipt-cap retention.
- `check-shop-preferences.cjs`: atomic preference/reset writes, rejected control rollback, reload, preserved economy/global settings and recovery blocking.
- `check-shop-wishlist.cjs`: durable target creation/membership, priority, sorting, saved marks and read-only status.
- `check-shop-export.cjs`: actual JSON download and checked import round trip during a rejected primary write, with no rejected purchase or implicit save retry.

Desktop color and mobile monochrome captures were reviewed. Rerun captures remain QA evidence rather than replacing the historical Stage 2–4 images. The wishlist check now derives its expected game path from its checkout instead of assuming the old `Shop/index.html` location.

## Delivery and publication boundary

The release uses the primary checkout's established Latest Build preview and shortcut binding. Mandatory delivery records the actual version, source/artifact hashes, installer, preview promotion and cleanup in `dist/delivery/`; it does not install or launch the player app. Packaged native QA must use an asserted disposable profile and route exported JSON into that profile.

`npm run release:github` pushes main and the immutable `v1.7.0` tag after validation. The Windows workflow builds and validates the installer, complete Electron-folder ZIP, blockmap, `latest.yml` and checksum manifest, then publishes and dispatches Pages. A pushed tag alone is not completed release evidence; Actions, assets and live download links must be checked afterward.

Installer execution, a live updater upgrade, physical touch and a broad hardware performance matrix remain separate acceptance work. The reported real browser storage-full issue was not identified by the isolated failure fixtures. The release remains unsigned, and Studio photos are separate from JSON saves.
