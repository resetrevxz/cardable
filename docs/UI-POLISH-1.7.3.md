# Cardable 1.7.3 — UI polish

This implements the owner's approved UI survey and decisions on the isolated `codex/ui-polish` branch, starting from stage 121 (`838f5ac`). It keeps the offline classic-script runtime, save schema 5, exact card/serial ownership, pack schedules, pending-reveal recovery, purchase engine and separate Album database.

## Delivered scope

| Approved backlog | Implementation |
|---|---|
| 1–10: shared controls | Canonical SVG registry; semantic setting/action icons; one scoped hover/focus tooltip service with current shortcuts, descriptions, edge bounds and Escape priority. Familiar actions use icons; unfamiliar tools retain short labels. Native titles stop competing with shared descriptions. |
| 11–20: pack screen | Top stock/refill rail, configuration-driven preview capacity, one Open action and compact Flip action; removed the card/timer-pack sentence and separate reminder block. Shop uses a bag icon. The main-menu wallet is retired; inventory proximity remains independent. Tutorial anchors and visibility previews use the new rail. |
| 21–30: Inventory controls | Search, Filters, Sort, View, Show unowned and collection options share one retained panel. Patch notes and Help remain separate. Missing/invalid Show unowned is false; explicit choices survive load/import. Ownership controls agree. Readable filter chips have separate close icons; search errors retain valid results. Controls synchronize without rebuilding or stealing focus. |
| 31–40: cards and transitions | Complete bounded static fronts reuse card text/spec builders, static rarity/finish/prop layers and saved color mode. One hovered/focused inventory card can promote to full materials. Concealed content remains concealed. Duplicate stacks use one card and ×N; Copies still addresses real serials. Real tiles reposition for sorting; layout replacement no longer adds cloned morph cards. |
| 41–50: empty states | Inventory, Favorites, collections, wishlists, search results, Album, purchase history, preset results and graphics use relevant icons/messages/actions. The empty Inventory action returns focus to the existing pack opening action without consuming stock. Loading/storage/capability feedback retains its existing real operation boundaries. |
| 51–60: Settings | Descriptor-owned icons precede labels, survive search highlighting and differ across graphics effects. Repeated blurbs/helper copy recede; meaningful restrictions remain. The retired Credits visibility key stays compatible. Frozen preview, trap and background shield persist through exit. |
| 61–70: Album | Current-page header, album icon/count, storage disclosure, integrated controls and icon actions. One empty state, conditional inspector and exactly-two comparison gating. Mouse and keyboard Delete share click-again confirmation; repeat events cannot confirm; removal is guarded; Undo retains full photo bytes. |
| 71–80: Shop | Mounted wallet with readable balance and local subscriptions in stable header chrome. Static complete offer/comparison fronts, consistent coin prices and focused inspection materials. Holds cancel at close; card/settings/pack handoffs wait for exit. Existing wishlist, refresh, insufficient-funds and save-failure feedback is preserved. |
| 81–90: Studio/Director | Removed routine readiness/autosave narration and repeated camera instructions. One navigation Help entry, short page names, shared header/transport icons and clear selected states. Color & light and Graphics use plain titles. Save failures retain an explanation/export route. Saved-slot replacement/deletion uses separate confirmation activations and Undo snapshots including thumbnails. |
| 91–100: motion/helpers/Mini | Shared restrained control depth, independent hover/shadow/motion policy, 150 ms feedback / 240 ms ordinary arrival / 120 ms exit. Helpers and popovers use cancellable exits and ordered handoffs. Current shortcut/hold values replace stale strings. Mini uses local SVG actions and simpler copy while retaining its static renderer. Narrow layouts contain scrolling and focus targets. |

The shared UI gallery includes the new icon and empty-state specimens. `Designs.MD` documents the icon, tooltip, static-card and closing contracts. Achievements remain paused; Market and audio are excluded. The incoming website brief and other worktrees are preserved.

## Runtime and visual evidence

All game changes were exercised using disposable profiles. Browser journeys use the explicit localhost QA server; native journeys use the actual Electron main process, isolated `--test-user-data` directories and renderer sandbox. No player's live save/profile was used.

| Check | Observed result |
|---|---|
| `tools/check-ui-polish.cjs` | Native fresh inventory/CTA, combined controls/search, full fronts, one-live-card promotion, Settings, Shop wallet, Simple/Advanced Studio and Director; no renderer errors in its accepted run. Desktop retains its deliberate 1920-wide composition. |
| `tools/check-ui-polish-browser.cjs` | 390×800, 760×820, 1280×720 and 1920×1080 at 70%, 100% and 150%: twelve layout cases. Search errors/ownership agreement, keyboard tooltip/Escape, Settings search icons, empty Album, Delete-repeat protection, full-byte photo Undo and two-photo comparison. Repeated animated Settings reuse and palette close/reopen are checked. |
| `tools/check-ui-polish-contracts.cjs` | 26 color/mono renderer cases, shared front-value comparisons, art-only support, concealed Secret, real reload and export/parse/import for both ownership preferences, retained controls state and exact closure baselines. Three measured cycles each return to one view / fifteen frame subscribers after an explicit warmup. |
| `tools/check-inventory-performance-browser.cjs` | 1,512 finish stacks on each of Very Low, Low, Medium and High: bounded shelf/grid, no caption/tag rewrites during same-selection motion, refreshed favorites, pointer drag, detail promotion/flip/return, far scrolling, End, phone resize and release after closing. No page errors or remote requests. This establishes bounded work, not a hardware performance claim. |
| `tools/check-shop-stage4.cjs` | Six sizes, four offers, calm/Very Low presentation, legacy-copy purchase, receipt bounds, high DPI, focus return, resize-cancelled hold and subscriber return. |
| `tools/check-studio-stage4-lifecycle-browser.cjs` | Six journeys pass: fallback, hidden/locked controls, capture cancellation, reentry/photo persistence, persistent save-failure/export feedback, and confirmed slot replacement/deletion with exact scene/thumbnail Undo. |
| `npm run test:services` | Eight desktop-service tests pass, including updater/error/retry, IPC isolation, logging and Discord context ownership. |

The complete native regression passes all ten pack types, real save export/import, exact card/serial and Studio/photo persistence across relaunch, single-instance restoration, current developer logic, schedule, Picker, QoL and isolated achievement checks. It records no renderer errors or renderer network requests. Native startup/security, graceful shutdown, backup recovery and developer-workspace smoke also pass on 1.7.3. Mini completed sixteen gameplay/window journeys with no renderer errors or remote requests, but the suite remains failed at its retained native always-on-top assertion. A plain Electron window reproduces `isAlwaysOnTop() === false` even after explicitly requesting pinning on this host. No speculative game window change was retained; physical pinning still needs acceptance on another Windows session. Mini shows its pin label only when native state confirms it, uses Credits rather than a dollar symbol, and removes contradictory hold/press instructions and renderer commentary. Existing tests were updated for the current combined menu, Simple/Advanced navigation, property-track Director, Picker shuffle, Settings pages and asynchronous closure. Assertions still exercise their intended behavior; the inventory suite now additionally requires a nonempty initial rendered shelf. Shared tooltip dismissal is explicitly checked as a child layer before parent navigation, including removal of its owner. The existing QoL scale fixtures were updated for the already-shipped .35–2.4 viewport contract and High/Reduced motion Off defaults; the running geometry and defaults were unchanged. Removed Journal/Studio developer entry points were replaced by currently registered checks; actual Studio/photo behavior remains exercised directly.

Useful captures are generated under `qa-output/ui-polish/`, `qa-output/ui-polish-browser/`, `qa-output/ui-polish-contracts/`, `qa-output/inventory-optimization/` and `qa-output/director-stage4/`. They were inspected during implementation; generated captures and disposable profiles are not shipped source assets. The renderer gallery uses existing catalog definitions for twelve rarities and a marked representative definition for Limited, which has no catalog card record. That Limited case is renderer coverage, not an acquisition/ownership claim.

## Defects found and corrected during acceptance

- An empty search suggestion list covered the View controls; suggestions now close when empty and remain in panel flow.
- Hiding unowned cards could be reversed by the filter refresh; the handler retains the actual requested checkbox value.
- Grouping retained the sort from panel opening; callbacks now use saved current state and synchronize retained controls.
- Full standard thumbnails were still hidden by older art-only CSS; full body/finish/prop layers now explicitly render.
- Repeated Delete could confirm Album removal; repeated events are ignored and in-flight removal is guarded.
- Completed WAAPI exit fills could leave reused panels transparent; completed effects are cancelled after cleanup.
- Rapid palette reopening and synchronous helper handoffs could restore stale input shields; closing is guarded and handoffs await completion.
- A large-sheet blur override contradicted bounded inventory rendering; the source override was removed while keeping prepainted depth.
- The browser's old minimum body width overflowed at 150% on narrow windows; the layout now fits without horizontal document overflow.

## Manual limits

The checked captures and keyboard/pointer journeys are representative acceptance, not a claim about every hardware/assistive-technology combination. Physical touch, screen-reader device testing, every remapped shortcut permutation and broad GPU/driver performance remain manual coverage. Available Very High capability is respected; unsupported hardware paths retain their restrictions. Installer execution and a real previous-version-to-new-version updater installation remain outside the evidence from source, package and release checks.

No save-schema change, pack timing/reward change, serial reassignment, unchosen-offer minting, Market/audio activation or achievement-state reset is part of this update.

## Final checks and delivery

Source acceptance is complete with the Mini pinning limitation above. All 62 changed JavaScript/check files parse; all 186 startup scripts and 58 stylesheets exist; the data validator confirms 381 registry entries and 170 final art references; version/release notes validate at 1.7.3. The focused diff is checked for whitespace and unrelated files.

Desktop delivery follows this reviewed commit using the existing delivery tool. Its actual installer hash/path, preview binding, stable shortcut and cleanup outcome live in `dist/delivery/latest.json`; public publication is established only by the matching successful Actions runs and verified release assets/Pages links. The completion response records those observed results separately from this source report. No installer execution or player-profile upgrade is implied.
