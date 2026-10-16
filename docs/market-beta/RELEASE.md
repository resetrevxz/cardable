# Cardable Market Beta 1.0.0 — release record

What was released, how, and what was and was not checked. Written at the end of Stage 8. No secret appears here: identifiers below are not secrets (the same ones are in `wrangler.toml`).

## 1. Versions

| Thing | Version | Notes |
|---|---|---|
| Cardable app (installer, updater, website) | **1.8.0** (from 1.7.6; MINOR for a feature) | synchronised in `package.json`, both `package-lock.json` entries, `src/config.js`, README, PLAY, AGENTS, Designs, `changelog/1.8.0.md`, `CHANGELOG.md`, patch notes |
| Market | **Beta 1.0.0** (`market.betaVersion`) | independent of the app version; shown in the Beta tag and the Help report |
| Global service (`/v1/status`) | `1.0.0-beta`, API 1, **schema 6** | forward-only migrations `0001`…`0006` |
| Save schema | 5, unchanged | no save migration; the Market keeps optional records that are normalized, not versioned |

The updater compares the installed app version with the published one, so 1.8.0 supersedes 1.7.6 and a Market-only change later is an ordinary patch release; the Market's beta number never has to match.

## 2. Live service (promoted and verified 2026-10-16)

| Resource | Value |
|---|---|
| Worker | `cardable-market-beta` — `https://cardable-market-beta.resetrevxz.workers.dev` (workers.dev only; this is the intentionally named beta endpoint, nothing here is production) |
| Account | `d2cf850211741463a3cfd2caaea8d743` |
| D1 | `cardable-market-beta-db` · `16cf1582-4d8a-436a-b18d-bf0ba5859399` · schema 6 |
| R2 | `cardable-market-beta-media` (private) |
| Secrets | `SESSION_SECRET`, `ADMIN_TOKEN` — kept as they were (the deploy script no longer replaces an existing secret); never printed |
| Cron | every 5 minutes: daily budget check, then the sweep while the service is open |

Deploy: `node scripts/deploy.cjs --apply` applied migration `0006_ops.sql` and deployed the Worker; `--verify` then passed **every** check (23: status and schema 6, mode `open`, HSTS, CSP, no-store, CORS for `null` and a refused foreign origin, 401 without a token, registration, empty zero wallet, a real R2 picture round trip with the HTML and SVG refusals, cross-account isolation, logout). `--admin reconcile`: `ok`, no problems. `--admin reset-plan`: a dry run, nothing applied (the plan covers every table; the audit tables and the service mode are kept).

**The hard stop on the live service.** The operator set `maintenance` ("Stage 8 live check."); the live status page reported it, a wallet request was refused with `maintenance` and a retry hint, the mode was set back to `open`, and `/v1/status` reported `open`. Both changes are in `ops_log` under the actor `deploy-script`.

**A real two-account transaction on the live service** (`cloudflare/scripts/live-trade.cjs`, record in [stage-8-live-trade.json](stage-8-live-trade.json)): two new private accounts each converted a few test cards; the buyer Quick Sold four cards for exactly the quote (34 Credits); the seller listed one card at 34; the buyer bought it for 34 and paid nothing else; the seller received 33 (the 2% fee is 0.68, so the 1-Credit minimum applies); the card moved to the buyer once; repeating the request with the same key changed nothing; a new request for the same listing was refused (`closed`) and charged nothing; the realm reconciled clean; both test imports were then revoked through the operator route (2 unspent cards each removed).

What stays in the beta from that test, so nobody is surprised: two anonymous accounts, one completed sale of one cheap card at 34 Credits (it is the only entry in the live price history), the buyer's one purchased card, and the ledger rows for those. They disappear with any future reset.

Resources as recorded by the `summary` report just before the trade (counts only): 8 accounts, 28 imported cards, 3 uploads, 0 listings, 0 trades, 0 Credits in wallets; after the trade the realm reconciles with no problems.

## 3. Beta reset decision

**No reset was run, and none is proposed.** The policy, the dry run and the manual execution steps are in [RUNBOOK.md](RUNBOOK.md) section 7; the dry run is tested and has been run once on the live database (nothing changed).

## 4. Desktop and public release

Filled in after publication — see section 6.

## 5. Verification that backs the release

| Evidence | Result |
|---|---|
| Headless battery, `node tools/run-stage8-regression.cjs` ([record](stage-8-regression.json)) | **18 of 18** suites: data integrity, assets, desktop services, market node tests, merged collections, the Cloudflare suite (**100** tests on the real local runtime), Market interface, Simulation (18 steps), economy (13), online (9), analytics (11), trading (10), social (14), acceptance (15), inventory glass, inventory interaction, UI polish contracts, release validation |
| Electron smoke (`npm run test:electron`) | passes (run once; it opens a real window) |
| Live | `--verify`, reconcile, the hard stop and the two-account trade above |

Not run and why: the Electron regression suite (`test:regression`) cannot launch on this machine even on unmodified `main` (Playwright's Electron launch fails); `check-optimization-journeys-browser` fails identically on `main`. The installer was not executed and no live updater upgrade was observed. See [ACCEPTANCE.md](ACCEPTANCE.md) section 5.

## 6. Publication record

(Written after the release; see below.)
