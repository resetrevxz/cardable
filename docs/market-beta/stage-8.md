# Cardable Market Beta 1.0.0 — Stage 8: acceptance, hardening and release

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. This stage asks one question of everything built in Stages 1 to 7: does it work together, for a person, on the real service? The matrix is in [ACCEPTANCE.md](ACCEPTANCE.md), the operator's manual in [RUNBOOK.md](RUNBOOK.md), the release record in [RELEASE.md](RELEASE.md). Earlier stages: [1](stage-1.md) · [2](stage-2.md) · [3](stage-3.md) · [4](stage-4.md) · [5](stage-5.md) · [6](stage-6.md) · [7](stage-7.md) · [Cloudflare](cloudflare.md).

## 0. Order of work and what it found

1. **Inventory lag first** (the owner's request before this stage). The inventory kept hundreds of compositor layers alive because finished animations held their end state (`both` fill-mode) and identity 3D transforms became layers, and it left the menu, the dot canvas and the pack scene running behind the sheet. Fixed on `perf/inventory-lag` (28 animation declarations, hidden menu, covered dots, Shop label writes, card sway at ≤30 Hz when still) and merged. Idle inventory is about 1 ms per second at every quality tier (headless). Details and tools: section 6.
2. **Merge main into the Market branch** (1.7.6 had landed while Stages 1–7 were built). Six conflicts, resolved by hand: the currency view (main moved the wallet into the Shop; the Market's three-number popover now lives there), the inventory toolbar, the opening flow (main kept paying 200 Credits per pack; the Market's Stage 3 removed it), `index.html`, Designs and the roadmap. Follow-ups the merge exposed: the Market HUD button overlapped the new Shop entry; overlapping dialogs could leave the Market permanently inert (surfaces now keep a reference count of what they made inert); the Electron smoke test still expected a pack to pay Credits.
3. **The acceptance audit** ([ACCEPTANCE.md](ACCEPTANCE.md)): every claim of the Stage 8 brief is Done, Verified, Not Verified, Blocked or Broken, with the evidence. A new cross-feature check (`npm run check:market-acceptance`) walks the journeys no stage check covered.
4. **The defect sprint** — what the audit found, all fixed, section 2.
5. **Hardening**: service modes, a daily budget breaker, a reset dry run, operator tooling and a live two-account trade (sections 3 and 4).
6. **Beta honesty**: a Beta tag at every width, Help & feedback (terms, privacy, moderation, rights, report), release notes (section 5).
7. **Release**: app 1.8.0 (the Market's own version stays Beta 1.0.0), merge, deploy, delivery, GitHub release. See [RELEASE.md](RELEASE.md).

## 1. What was added in this stage

| Area | What | Where |
|---|---|---|
| Service mode | `open`, `read-only`, `maintenance`; stored in D1 (`ops_state`, `ops_log`, schema 6), set only by the operator or the breaker, visible on `/v1/status`; the client shows "Paused" / "Beta · read-only", never sends a refused write and keeps sign-in alive | `cloudflare/src/maintenance.js`, `migrations/0006_ops.sql`, `src/market/online/{client,provider}.js` |
| Daily budget breaker | the cron counts the day's events from four index-only reads and switches to read-only past `DAILY_EVENT_BUDGET`, and opens again at 00:00 UTC | `cloudflare/src/budget.js` |
| Reports | `/v1/admin/summary` (counts only), `/v1/admin/reset-plan` (dry run: what a reset would delete, changes nothing), `/v1/admin/ops-log`, `/v1/admin/mode`, `/v1/admin/budget` | `cloudflare/src/{opsreport,maintenance,budget}.js` |
| Operator CLI | `deploy.cjs --admin ORIGIN mode|summary|budget|ops-log|reset-plan` (writes a reviewable `reset-plan.sql`, never applies it) | `cloudflare/scripts/deploy.cjs` |
| Live proof | one real two-account transaction with exact fee and balance checks, replay safety, reconcile and cleanup | `cloudflare/scripts/live-trade.cjs` |
| Help & feedback | terms, privacy, moderation, rights, a copyable report, the desktop GitHub report | `src/ui/market/page-help.js` |
| Beta badge | "Beta 1.0.0" wide, "Beta" narrow, with a tooltip about resets | `src/ui/market/shell.js` |
| Acceptance check | journeys, service modes, Help, 6 viewports × 15 routes, monochrome, four quality tiers, reduced motion | `tools/check-market-acceptance-browser.cjs` |
| Regression runner | the headless battery in one command, recorded | `tools/run-stage8-regression.cjs` |
| Header | HSTS on every API response | `cloudflare/src/util.js` |

## 2. Defects found and fixed

| # | Found by | Defect | Fix |
|---|---|---|---|
| 1 | merge | Market HUD button overlapped the Shop entry | position rule in `market.css` |
| 2 | trading check after the merge | overlapping dialogs (a confirmation opened as another closes) restored a stale `inert` and left the Market unclickable | `C.ui.present` counts holds per element |
| 3 | smoke test after the merge | Electron smoke asserted a pack pays Credits | expectation updated: balance stays exactly as seeded |
| 4 | security review of this stage | in `read-only` a **GET** could still change data: opening an ended auction settles it and a notifications read evaluates alerts | those reads only write while the service is open (test: an ended auction is not settled by anyone opening it while read-only, and settles exactly once after) |
| 5 | profile | the Market kept running the menu's pack scene, hint arrow and queue behind an opaque overlay, and held 29 compositor layers from finished entrance animations | the loop sleeps under the Market; entrance fills are `backwards` (high tier, Discover: 106 → 6 ms/s, 29 → 0 held layers) |
| 6 | the Stage 8 sweep | phone-width search field squeezed to a few pixels by the `/` hint | hint hidden on narrow windows |
| 7 | the Stage 8 sweep | the Beta tag disappeared on narrow windows | it stays (without the version) |
| 8 | the Stage 8 sweep | the wallet said "Not connected" while the service was paused | says "Paused" |
| 9 | the Stage 8 sweep (reduced motion) | a new profile ignored the system's reduced-motion preference | the first save starts with Reduced motion on when the system asks; saved settings are never touched |
| 10 | check flakiness | two checks failed about one run in four on a loaded machine (a typed bid field and a layout read taken mid-transition) | the checks read the field back and judge a layout after it settles; no product bug was behind either (investigated: the same input element, no re-render) |

Not defects, recorded so nobody chases them: a v1.5.x-era save that predates schema 3 loses its finishes on load because the 2→3 migration deliberately resets variant ids (the variant system was replaced then); the acceptance check therefore uses a current-schema save shaped like a 1.5.x one. `test:regression` and `check-optimization-journeys-browser` fail identically on unmodified `main` (Playwright cannot launch this Electron; a `.royal-holder` wait times out).

## 3. Service modes

| Mode | Reads | Writes | Sign-in refresh | Settlement (alarms, cron, a look) |
|---|---|---|---|---|
| `open` | yes | yes | yes | yes |
| `read-only` | yes | refused `503 read-only` | yes | waits |
| `maintenance` | `/v1/status` and the operator only | refused `503 maintenance` | refused | waits |

Test evidence: `cloudflare/test/ops.test.mjs` (8 tests, local Workers runtime) and the client side in `check:market-acceptance` (read-only and maintenance as the player sees them, with the converted cards intact afterwards).

## 4. Cost, caches and indexes

Nothing in this stage added a table scan or an N+1: the mode is one cached `ops_state` read per isolate per three seconds; the breaker is four `MAX()` reads every five minutes; the summary and the reset dry run count rows and are operator-only. The existing guards are unchanged and still proven by tests: a card's analytics stays within five statements, the search plan is index-supported (`EXPLAIN` test), pagination is cursor-based and bounded, uploads and Quick Sell have daily quotas, requests are rate limited per account and per address, and the analytics cache never changes a figure. Plan limits and the arithmetic for a 200-player beta are in [cloudflare.md](cloudflare.md) section 8; the breaker's default of 15,000 events a day keeps a Free plan inside its 100,000-writes-a-day allowance on the figures there. These are estimates from documentation and local measurement; production usage has not been observed.

## 5. Security minimums (checked)

Server-side authorisation on every route (the operator's answer 404 to anyone else); bearer tokens only, no cookies; refresh tokens stored hashed and rotated with reuse detection; bodies bounded while streaming; every write needs an `Idempotency-Key`; pictures validated by bytes, stripped and re-encoded in three sizes, never served as HTML (`nosniff`, sandbox CSP); comments are plain text with no markup, links or hidden characters; responses carry a locked-down CSP, `no-store`, `nosniff`, `no-referrer` and now HSTS; CORS echoes only listed origins; the client never puts a token in a URL and talks to exactly one origin set in the page's CSP; secrets live only in Wrangler's store and `cloudflare/.admin-token` (git-ignored, scanned for by `deploy.cjs --check`). Evidence: the Cloudflare suite (100 tests incl. MIME spoofing, oversized and chunked bodies, forged tokens, cross-account access, comment markup), `deploy.cjs --verify`, and the acceptance check's network assertions. Not done: Turnstile (no hosted challenge page exists for `file://`), an external penetration test, and a dependency audit of `wrangler`'s own tree.

## 6. Optimization pass (all four quality tiers)

Method: `tools/survey-surfaces.cjs` (compositor layers, held animations and main-thread milliseconds per second over a three-second idle window, per surface and tier), `tools/cpu-profile-surface.cjs`, `tools/trace-invalidations.cjs`, `tools/bench-market-scroll.cjs`. Headless Chromium/Edge on one developer machine with the frame loop uncapped (about 240 loops a second), so absolute milliseconds overstate a 60 Hz display by roughly four; the comparison between tiers and builds is what matters.

| Surface (idle) | very-low | low | medium | high |
|---|---|---|---|---|
| inventory (shelf) | 0.9 | 0.7 | 0.5 | 0.4 |
| inventory grid | 1.0 | 0.9 | 0.9 | 0.9 |
| main menu (ambient pack by design) | 1.9 | 1.9 | 51 | 70 |
| card detail | 25 | 61 | 188 | 200 |
| Shop | 1.6 | 39 | 79 | 86 |
| Settings (live preview card) | 1.7 | 243 | 254 | 276 |
| Market · Discover | 8.6 | 5.9 | 5.6 | 6.2 |
| Market · listing (live card) | 1.9 | 65 | 102 | 87 |
| Market · Stocks | 4.1 | 4.4 | 3.1 | 3.7 |

(ms of renderer main-thread work per second; layers and held animations: inventory 20–36 layers and 0 held at every tier, down from hundreds.) Market list scrolling by script at a steady speed: median frame 4.2 ms at every tier, 95th percentile 4.3 ms, zero frames over 25 ms in about 950 frames per tier on a 3,200-pixel Discover list, worst single frame 8–21 ms. What is left is by design: surfaces that show a live card (detail, Settings preview, a listing) animate that card, which is the showstopper; the main menu animates its pack at Medium and High. Settings costs the same on unmodified `main` (275 ms/s at medium), so it was not changed here. A real GPU, a 60 Hz display and long sessions were not measured.

## 7. What was not verified

Real hardware and GPUs; the installer's execution and a live updater upgrade (CI builds the installer; nothing here runs it); screen readers; a physical phone; Turnstile; load at scale; a real v1.5.6 save file (a shaped fixture was used); the Electron regression suite, which cannot launch on this machine even on unmodified `main`. See [ACCEPTANCE.md](ACCEPTANCE.md).
