# 1.2.0: Stability and cleanup

Part 1 of 4 of the 1.2.0 release. Fix what is broken, make the game steadier, and ship five small, finished features. Run it as **one task** with one checkpoint (after section 1).

**Version rule:** do **not** change the game version, `package.json` version or installer version. Append your entries under `## Unreleased (1.2.0)` in `CHANGELOG.md` and the patch-notes data. See `alpha-updates/1.2.0-PLAN.md`.

**Read first:** `AGENTS.md`, `Designs.MD`, `alpha-updates/1.2.0-PLAN.md`, then the code for the inventory, detail view, inspect/studio, tags, tutorial, the credits (coin) chip, the opening state machine, the settings system, and the dev menu.

## 0. Rules

- Additive saves only: optional new fields, no schema bump, existing saves keep loading.
- Use the current design tokens and existing components (hold-to-confirm, click-again, glass recipe, toasts). A bigger UI unification comes in the next update, so build new UI as self-contained components prefixed `cb-` that are easy to migrate.
- Quality tiers, reduced motion, strobing profile and the minimal testing policy apply.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE logic check, `Cardable.dev.checkStability()`, run once at the end: delete rules by tier (hold needed for all, typed name needed for tier 7 and above, locked or favorited cards blocked), wallet ledger arithmetic and the cap, cutscene unlock persistence and atomic payment, and the performance statistics math (percentiles and 1% low). Under 1 second, never automatic. For everything else, open the game once, exercise each changed feature, confirm no console errors, stop.

## 1. Bug fix pass, tutorial fix, tiny optimization (checkpoint after this section)

### 1.1 Known bugs
1. **Inventory UI unloads when you inspect a card.** Entering inspect (card detail or studio) must never tear down the inventory. Inspect is an overlay layer; leaving it restores the inventory exactly (sheet position, scroll, selected card, sort, filters, search, open tab). Find the root cause (likely teardown, a missing restore path, or state that is reset on enter/exit) and fix it for every entry route (shelf click, keyboard, command palette, context menu, achievements or journal links if present).
2. **Tags are broken in semi-open mode.** Define a clean tag state machine (compact, semi-open on hover or focus, open on click or pin) with correct geometry: never clipped by the card or tile, never overlapping other tags, correct hit areas, no stuck states when the pointer leaves quickly, keyboard accessible, correct z-order, consistent on the shelf, in the detail view and on the revealed card. Tidy the semi-open look (spacing, alignment, text truncation with tooltip, consistent icon sizes) while fixing it.

### 1.2 Tutorial: fix, do not remake
Keep the existing steps and copy. Audit every path and fix whatever breaks:
- Fresh save; skip at every step; reload at every step; resize at every step; replay from the dev menu; Esc handling; reduced motion; every quality tier; low frame rate.
- The tutorial pack must always be a Standard pack and must not be affected by special pack rules, the swap animations or the opening styles.
- Step targets must be found reliably (use stable `data-tutorial` attributes instead of fragile selectors), highlights must follow elements when the layout moves or resizes, and the tutorial must never leave the UI hidden, a hold stuck, or a spotlight orphaned.
- The tutorial must not trap input: Skip is always reachable; it never blocks the opening interaction; it resumes correctly after reload.
- Key labels shown by the tutorial read from the keybinding source if one exists (a later update adds rebinding).

### 1.3 General bug audit
Audit all main flows and write `docs/bug-audit.md` (table: area, bug, repro, severity, status), then fix everything that can be fixed safely. Cover at least: pack opening (all opening styles, early release, reload at each phase), cutscenes (skip, reduced motion, quality changes), the pack counter and swap animations, inventory (sort, filter, search, stacks, silhouettes, virtualization), detail view and flip, studio enter/exit and photos, achievements, settings (every control persists and applies), export/import/reset/backups, Electron specifics (window state, notifications, tray, saves mirror, mini mode), resize and DPI changes, window focus and hidden-tab behavior, console errors and warnings, and memory growth after repeated screen changes. Anything unfixable goes in the report under known issues.

### 1.4 Tiny optimization (low risk only)
No architectural refactors. Fix only measurable, safe things: event listeners and `requestAnimationFrame` loops that leak or keep running when a screen is hidden or the window is minimized; canvases and GPU resources not disposed on screen exit; layout thrash in hot paths; avoidable large-blur surfaces on lower quality tiers; image decode and loading hints; redundant timers. Goal: near-zero CPU when idle, no growth in memory, listeners or DOM nodes after repeatedly opening and closing screens. Use the new advanced performance overlay (section 5) to verify.

## 2. Credits UI remake (the coin chip)

"Credits" here means the **currency display** (the coin chip with the amount), not a credits roll.

- **Chip:** a compact glass chip at the top right with a coin glyph (a simple, original embossed coin with a subtle sheen that sweeps every ~8 s), the amount in mono with tabular numerals, rolling digits that change only the digit that changed. Large numbers format as `12.4K` and `3.2M` with the exact value in the tooltip.
- **Change feedback:** a floating delta (`+25`, `-150`) that rises and fades near the chip, a tiny shimmer across the number, and a brief ring pulse; no strobing, one effect at a time, queued if several changes arrive together (merge deltas within 400 ms).
- **Popover (hover or click):** "Wallet" with the amount, today's earned and spent, and the last 10 changes (label, amount, time) from a ledger. The ledger is additive: `save.wallet.log` (cap 200, newest first) with `{ at, delta, reason }`; every credit change in the game adds a reason string from a fixed set (reveal duplicate, shop, delete refund, cutscene unlock, dev). Existing credit changes must be routed through one function so nothing bypasses the ledger.
- States: zero (dim coin, helper text), loading, large-number overflow, and idle fade with the rest of the UI. Respect safe areas and the Electron title-bar inset.
- Quality tiers: High full effects; Medium no sheen; Low and Very Low static. Reduced motion: no floating delta, simple fade.

## 3. Delete in inventory

- **Entry points:** the card detail "more" menu, the inventory right-click menu, and a `Delete` key on the focused tile. Multi-copy cards: choose which copy (list with serial, date, variants); never delete a copy silently.
- **Rules by tier:**
  - Tiers 0 to 6 (Basic to Double Super Rare): a glass confirmation with the card preview, serial and any refund, and a **hold-to-confirm button** (about 1.5 s with the fluid fill).
  - **Tiers 7 and above (Legendary, Mythical, Exotic, Ascendant, Secret):** the same hold button (about 2.5 s) **plus a typed confirmation**: the player must type the exact card name (case-insensitive, trimmed) before the hold button becomes active. Paste is allowed. Show a clear one-line warning ("This card is Legendary. This cannot be undone.").
- **Extra warnings (any tier):** if the copy has a low serial (counter 100 or lower), a variant or combo, or is the player's only copy of that card, show it as a plain line in the dialog. **Favorited or locked cards cannot be deleted** until unfavorited or unlocked (the dialog says why and offers the action).
- Keep existing refund behavior if there is one and show the amount in the dialog; do not invent a new refund.
- After deleting: a short undo toast (10 s) that restores the exact instance (serial, variants, date) if the player acts; the undo is unavailable after reload. Journal, tags, achievements counters and the inventory counts must stay consistent (use the existing events).
- Keyboard accessible, `Esc` cancels, no accidental activation by Enter or Space while the hold button is not focused, reduced motion simplifies the fill.

## 4. Replay cutscene (unlocked by paying credits)

- In card inspect (detail view and the studio card), cards of tiers that have a cutscene show **Replay cutscene**.
- **Locked by default.** A locked button shows a lock and the price. Unlock = pay credits once; after that, replaying that cutscene is free forever for all your cards of that tier (a gallery-style unlock). Pay with a click-again or short hold confirm, deduct credits atomically through the wallet function (ledger reason `cutscene unlock`), persist in `save.unlocks.cutscenes` (additive), and emit an event for achievements and the journal if they exist.
- Prices are data (`src/data/economy.js` or the existing config), tunable, with defaults such as Mythical 150, Ascendant 400, Secret 1000. Not enough credits: the button shows how many are missing and does nothing else.
- Replay plays the cutscene **in a sandbox**: it uses the card's tier cutscene, does not consume a pack, does not change the inventory or serials, honors the strobing profile and skip, and returns to exactly where the player was (including the inventory state).
- Pending in 1.2.0: no "replay all" and no price changes per card.

## 5. Performance overlay (Simple and Advanced)

Toggle with `F3` (cycles Off, Simple, Advanced) and a Settings entry (Settings > Performance); remember the choice.

- **Simple mode (tiny):** one small line in the corner, dim mono, no panel: `FPS 144  1% low 98`. "1% low" is the frame rate implied by the 99th-percentile frame time over the last 5 seconds. Click-through (does not block the UI), updates twice a second, color-neutral.
- **Advanced mode (for bug fixing):** a compact glass panel (draggable, pin to any corner, collapsible sections, Copy report button) with:
  - frame time graph (last 5 s, 30 Hz), FPS, 1% low, 0.1% low, p50/p95/p99/max frame time, dropped frames, long tasks count (`PerformanceObserver`);
  - memory (`performance.memory` where available), DOM node count, active animations (`document.getAnimations().length`), running `requestAnimationFrame` loops (instrument via a wrapper), canvases and WebGL contexts alive, event-bus events per second, timers;
  - current quality tier and any adaptive downgrade events, resolution scale, DPR, window size and UI scale, active screen/scene and cutscene (so a spike has a context), GPU renderer string where available, uptime, save size and storage estimate.
- The overlay itself must cost under about 0.3 ms per frame; update DOM text at 2 Hz, graph at 30 Hz, and do no work when off. Quality Very Low shows Simple only.
- Copy report produces plain text (versions, platform, quality, the metrics snapshot, the last 30 s min/avg/max) for pasting into bug reports.

## 6. Cleanup

- **Archive card history.** Remove the Journal's entry points (inventory tab, context menu, detail view button) and its listeners; move its code and spec to `archive/`; keep saved `save.journal` data untouched (do not delete user data) but unused. Make sure achievements and tags have no dependency on it. Remove it from docs and the patch notes.
- Remove dead code, unused CSS and stale dev tools you encounter while fixing bugs, but only when clearly unused. List removals in the report.

## 7. Milestones (stop at a clean one only if budget requires)

- **Checkpoint 1:** section 1 (bugs, tutorial, tiny optimization), commit.
- **Checkpoint 2:** sections 2 to 6, the logic check, commit.

## 8. Manual checks

1. Inspecting any card from the inventory never unloads the inventory; leaving restores everything.
2. Tags behave in compact, semi-open and open states everywhere with no clipping or stuck states.
3. The tutorial completes, skips and resumes in all the listed conditions.
4. `docs/bug-audit.md` exists; fixed items are verified; the console is clean in a normal session.
5. The coin chip rolls, shows deltas, and the wallet popover matches the ledger.
6. Deleting follows the tier rules (typed name from Legendary up), blocks favorites and locks, and undo works.
7. Replay cutscene is locked until paid, then free for that cutscene; credits and the ledger update correctly; the inventory is untouched.
8. `F3` cycles the overlay; Simple shows only FPS and 1% low; Advanced shows the metrics and Copy report works; idle CPU is lower than before.
9. Journal entry points are gone; achievements and tags still work.

## 9. Out of scope

The UI unification and kit (next update), rebinding and new settings (Controls), the tutorial remake, new packs or cutscenes, sound, Discord, the shop, trading, the market, the website and GitHub work.
