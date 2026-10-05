# Achievements inventory remake

The earlier A/B/C achievement engine is published into the main game with a new inventory-native screen. The existing inventory tab and detail-action registries are used. A small `inventory.setPage(id)` seam gives extension pages the existing sheet, focus/input ownership, detents and scheduler, and pauses/clears Shelf/Grid while an extension is shown. Card browsing preferences remain intact. The main entry point is `cardable-spec/cardable/index.html`; no deployment service is involved.

## Design

Monochrome type and restrained glass follow the current AGENTS.md and Designs.MD. The screen has a large progress summary, Up next and Latest unlock features, counted category navigation, segmented filters, search/sort and a responsive grid. Tiles distinguish locked, in-progress and complete milestones with neutral states, tier marks and dates. Hidden names, glyphs, progress and rewards stay concealed. The detail drawer shows the ladder, earned dates and rewards; a surviving triggering serial has a static thumbnail and links into the existing card detail. Returning from the card restores the achievement. Card detail offers a related Achievements action through the shared registry.

Achievements is a real inventory tab. All Cards/Favorites/custom collections switch back to the existing card views; History and Studio keep their existing entry points. The tab has an earned count and unseen indicator. The toast and context-menu entry open this same tab. Ctrl/Cmd+F focuses achievement search; Escape closes detail before collapsing inventory. Focus and reduced-motion rules use the shared helpers. High has hover illumination and staggered movement, Medium omits pointer illumination, Low uses fades/static counts, Very Low is immediate, and reduced motion uses opacity.

## Publication

Seven achievement files are copied from the dedicated worktree into the main checkout. Additive hooks in the current event bus, optional save extension, save-export event and developer loader preserve newer Journal/Studio work. The current main index retains every pack/cinematic/studio include and adds achievements data/settings/metrics/engine/UI/style includes in dependency order. The main save schema/config and protected pack/cinematic/finish files are untouched.

The next free main update version is 2.7.0, after the 2.6.0 inspector update. The unchanged supplied advancements spec moves into this folder as SPEC.md. The earlier isolated 2.4.0-achievements worktree history remains available. The shared checkout's unrelated dirty files are not staged or committed; the focused remake is committed on update/achievements-ab.

The 57-entry catalogue and conditional dependencies/rewards are retained. Historical backfill and unlocks keep the contract `achievement:unlocked { id, tier, at, retro }`; the UI never calls the Journal API. Missing publishers/metadata continue to exclude their achievements from totals. Pack rewards remain deferred without a typed production grant API. Daily habits use local dates, and retro history without evidence cannot be invented.

Testing: One main-index file:// sandbox game opening confirmed the native tab, Cards return, real opening/toast deferral, drawer/triggering-card link/return, related card action, search and a 390px layout without horizontal overflow, with zero game-console errors; the existing check ran once and passed in 2 ms; no old tests, new test files, screenshots, recordings or profiling.
