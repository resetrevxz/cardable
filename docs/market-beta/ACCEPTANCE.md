# Cardable Market Beta 1.0.0 — acceptance matrix

Status words, used exactly: **Done** (built, not independently checked), **Verified** (built and a named check or measurement ran and passed), **Not Verified** (built, no check was possible or run), **Blocked** (needs something outside this work), **Broken** (a check failed and it is not fixed). Everything marked Verified names its evidence. The numbers come from the run recorded in [stage-8-regression.json](stage-8-regression.json) (a headless battery; no window opens) and the files beside it. Release facts are in [RELEASE.md](RELEASE.md).

Two kinds of evidence are kept apart on purpose: **local** (the real Worker on the local Workers runtime with a real local D1, Durable Objects and R2; the real game over `http://127.0.0.1` or `file://` in headless Chromium) and **live** (the deployed Worker). Where a row says *live*, the transaction really crossed the internet.

## 1. Journeys

### Journey 1 — a new offline profile

| Step | Status | Evidence |
|---|---|---|
| A new save starts with 0 Credits | Verified | `freshState` has `currency: 0`; acceptance step 1 reads the start balance |
| Opening a pack pays nothing (no 200 Credits) | Verified | acceptance step 1 (balance before = after); `check:market-economy` "keeping a card still works and pays nothing"; Electron smoke (balance stays exactly as seeded) |
| Keep keeps the exact serial shown at the reveal | Verified | acceptance step 1 compares the serial of the revealed card with the kept instance |
| Quick Sell pays less than the card is worth, and says so first | Verified | acceptance step 1 (`quote < fair`); `check:market-economy` "Sell this copy: the price is stated first, a stale quote is refused, receipt and Undo" |
| Buy a listing from a bot, once | Verified | `check:market-sim` "buying a fixed-price listing through the interface moves the card and the Credits exactly once" |
| Local auction: a proxy bid holds Credits and releases them when it ends | Verified | `check:market-sim` "a proxy bid holds Credits, shows leading, and the hold is released when the auction ends" |
| Close and reopen: the Simulation does not advance while the game is closed or hidden | Verified for reload and a hidden document (headless); **Not Verified** for a real app quit | `check:market-sim` "a hidden document freezes the clock and returning does not catch up", "a reload keeps the world, an open bid and its hold" |
| Bulk Sell previews exact copies, protects favorites and locked cards, one hold commits | Verified | `check:market-economy` "Bulk Sell previews exact copies, protects favorites and finishes, and one hold sells them in one commit"; `tests/market-sales.test.cjs` "protected cards are refused: favorite, locked and listed, with the reason" |
| Receipts list exactly what was sold and the ledger reads consistent | Verified | `check:market-economy` receipts step |

### Journey 2 — an existing save, then the one-time online import

| Step | Status | Evidence |
|---|---|---|
| A save with duplicates, finishes, a locked card, favorites and collections loads intact on the current schema | Verified | acceptance step 2 (every instance, serial, finish and lock identical; collections keep their stack keys) |
| A real v1.5.6 save file | **Not Verified** | none was available; the fixture is a current-schema save shaped like one (no Shop or Market records). A pre-schema-3 file loses its finishes by design (the 2→3 migration resets variant ids) |
| A Studio photo survives | Verified | acceptance step 3 writes a blob to the Studio IndexedDB before the import and reads the same bytes back after |
| Preview, convert once, signed receipt | Verified | `check:market-online`; acceptance step 3 |
| Retry with the same key returns the same receipt and converts nothing twice | Verified | acceptance step 3; Worker test "simultaneous commits by one account import once" |
| The offline save is byte-for-byte unchanged by the import | Verified | acceptance step 3 compares the serialized inventory, Credits and inventory UI before and after |
| Another account cannot claim the same save | Verified | Worker tests "a package another account already claimed, and serials already owned, are refused", "simultaneous imports of one collection by two accounts: exactly one wins" |

### Journey 3 — two online players

| Step | Status | Evidence |
|---|---|---|
| Fixed price: one fee, one receipt, ownership moves once, replay changes nothing | Verified | Worker test "fixed price: list, buy, one fee, one receipt…"; **live**: `cloudflare/scripts/live-trade.cjs` (record in [stage-8-live-trade.json](stage-8-live-trade.json)) |
| 2% fee, at least 1, rounded half up, taken once from the seller | Verified | Worker rules test "the 2% fee rounds half up…"; live trade checks the seller's exact net |
| Auction: proxy bids, reserve, anti-sniping, buy-it-now, the exact deadline | Verified | Worker tests (auction ×6) and 3,000 generated auctions (property test) |
| Server-side expiry with every client closed | Verified | Worker test "an auction closes on time with nobody online: the listing's own alarm settles it" |
| Swaps, counteroffers, bundles, buy orders | Verified | Worker tests (swap ×2, bundle, orders); `check:market-trading` drives them through the interface |
| Two buyers race for one listing; 120 generated interleavings | Verified | Worker `races.test.mjs` |
| No bots, fixtures or Simulation numbers in Global | Verified | `check:market-online` ("the connected Global Market is empty on purpose and has a wallet of zero"), Worker analytics tests ("only real sales are counted") |
| A real two-account transaction on the live service | see [RELEASE.md](RELEASE.md) | `live-trade.cjs` against the deployed Worker |

### Journey 4 — pictures, comments, reviews, discovery

| Step | Status | Evidence |
|---|---|---|
| Upload from the file picker and from the Director album | Verified | `check:market-social` |
| Pictures: bytes decide the type, metadata stripped, three sizes, private until attached | Verified | Worker social tests; `deploy.cjs --verify` (real R2 round trip, live) |
| Comments (plain text, one level of replies, limits), reports hold a comment | Verified | Worker social tests; `check:market-social` |
| A review only from a completed trade, once; a Quick Sell or the Simulation earns none | Verified | Worker social test |
| Notifications and alerts reach the in-app inbox once | Verified | Worker analytics tests |
| Stocks, Portfolio, recommendation and search | Verified | `check:market-analytics`; Worker analytics tests (search plan uses indexes) |

### Failure modes

| Failure | Status | Evidence |
|---|---|---|
| Dropped connection: the client says so, retry is safe, the offline game is untouched | Verified | `check:market-online` ("an unreachable service is a quiet offline state"); Worker idempotency tests |
| Stale bid or stale price | Verified | Worker tests ("a price change protects the buyer", "bids are refused with a reason") |
| Insufficient Credits | Verified | Worker tests (forbidden and impossible operations); `check:market-trading` (disabled button with its reason) |
| Duplicate submit | Verified | Worker test "a retry or double click with the same key acts once, even all at once" |
| Parallel purchases | Verified | Worker `races.test.mjs` |
| Lost authentication | Verified | Worker tests (tampered token, reuse of a refreshed token, recovery); the client signs out cleanly on `bad-token` / `session-ended` |
| Batch sale with a protected instance | Verified | `check:market-economy` (favorites and finishes are left out of the preview); `tests/market-sales.test.cjs` (a favorite, a locked and a listed copy are each refused with the reason, even when requested directly) |
| Rate limits | Verified | Worker tests (registration per address, comments, uploads, hourly buckets) |
| An edited local save | Verified | `check:market-sim` "a simulation file with a forged receipt cannot add cards or Credits to the save"; the server never trusts an offline Credit balance (the import carries card identity only, and refuses implausible packages) |
| MIME spoofing of a picture | Verified | Worker test "what is not a safe picture is refused"; `--verify` (an HTML page sent as a picture, an SVG) live |
| Markup or script in a comment | Verified | Worker test "comments are plain text…"; the client renders with `textContent` only |
| The service paused or read-only | Verified | `cloudflare/test/ops.test.mjs` (8); acceptance steps 4–5 |
| The daily budget reached | Verified | `ops.test.mjs` "the daily circuit breaker…" |

## 2. Interface

| Claim | Status | Evidence |
|---|---|---|
| Every route fits without horizontal scroll, with the Beta tag visible, at 360×800 @2×, 390×844 @3×, 768×1024, 1280×720, 1920×1080 and 2560×1080 | Verified | acceptance check, 15 routes × 6 viewports (Discover, Buy Now, Trades, Stocks, Portfolio, Activity, Watchlist, Alerts, Compare, My listings, Settings, Help, Compose, a card page, a listing page) |
| Saved monochrome conveys the same states | Verified for layout and the Beta tag at phone and desktop widths; state colour-independence was reviewed in screenshots and is a design rule (`Designs.MD`) | acceptance sweep, `sweep-mono-*.jpg` |
| All four quality tiers | Verified | acceptance sweep at very-low, low, medium, high |
| Reduced motion | Verified | acceptance sweep with the system preference: nothing animates on Discover, a listing, Stocks or Help; a new profile now starts with Reduced motion on |
| Keyboard access, focus restoration, screen reader behaviour | Done for keyboard and focus (existing kit behaviour; `check:market*` use the keyboard paths); **Not Verified** with a screen reader | — |
| Phone behaviour on a physical device | **Not Verified** (emulated viewports only) | — |
| Idle cost and scrolling | Verified (headless, see [stage-8.md](stage-8.md) section 6) | `survey-surfaces.cjs`, `bench-market-scroll.cjs` |
| No per-listing animation frame loop | Verified | a source search finds two `requestAnimationFrame` calls in the Market (popover placement and frame focus), both one-shot; the survey shows zero running animations on every Market route |

## 3. Service, security and operations

| Claim | Status | Evidence |
|---|---|---|
| Hard stop (maintenance), read-only, and a recovery path | Verified | `ops.test.mjs`; [RUNBOOK.md](RUNBOOK.md) sections 3 and 5 |
| A look never changes data while paused | Verified | `ops.test.mjs` "read-only means a look changes nothing" |
| Daily budget breaker | Verified | `ops.test.mjs` |
| Reset dry run changes nothing and lists no personal detail | Verified | `ops.test.mjs`; **no reset was run** |
| Restore from Time Travel | Not Verified | documented from the Wrangler command help; not exercised on the live database |
| Export summaries and backup | Done | `--admin summary` verified locally; `wrangler d1 export` was not run against the live database in this stage |
| Server-side authorisation, bounded bodies, idempotency, headers | Verified | Cloudflare suite (100 tests), `--verify` |
| Turnstile bot challenge | **Blocked** | no hosted challenge page can exist for a `file://` game; sign-up is rate limited per address instead |
| Third-party dependency audit, external penetration test | Not Verified | — |
| Secrets never printed or committed | Verified | `deploy.cjs --check` secret scan; `.admin-token` is git-ignored |

## 4. Release

| Claim | Status | Evidence |
|---|---|---|
| Host version 1.8.0 is newer than 1.7.6 for the updater; the Market's own version (Beta 1.0.0) is independent | Verified | `release:validate`; `market.betaVersion` is separate in `src/data/market-config.js` |
| Release notes, help, terms, privacy, moderation, rights | Done | `changelog/1.8.0.md`, patch notes, Help & feedback |
| Installer, ZIP, checksums, updater metadata, links | see [RELEASE.md](RELEASE.md) | CI run and live asset checks |
| A live updater upgrade from 1.7.6 to 1.8.0 | **Not Verified** | needs an installed 1.7.6 and a person to run it |

## 5. Open items, ranked

1. Nobody has run the installer on a clean machine or watched the updater take 1.7.6 to 1.8.0.
2. A screen-reader pass and a physical-phone pass of the Market.
3. Turnstile: sign-up is open to anyone, limited per address.
4. A restore rehearsal on a copy of the live database.
5. Production load: all figures are local or arithmetic.
