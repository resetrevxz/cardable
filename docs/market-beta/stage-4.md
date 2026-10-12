# Cardable Market Beta 1.0.0 — Stage 4 acceptance report: online beta foundation

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. Unreleased: no merge to `main`, no GitHub Release, no live-site change, no desktop delivery. Operator runbook: [cloudflare.md](cloudflare.md).

## 0. The honest headline

The online foundation is **built and verified locally, and not deployed**. Wrangler is installed and the Worker runs on the real Workers runtime with local D1 and Durable Objects, where 16 integration tests, a rehearsed 10-point verification and a 9-step browser check pass. But `wrangler whoami` reports *not authenticated*: Cloudflare shows its sign-in page and needs the account owner's interactive consent, which I cannot and must not give. Therefore **no Cloudflare resource exists, nothing is live, and no URL, id or account number in this report is real**. The game ships with the online realm switched off (empty `apiBase`, `connect-src 'none'`) and makes no network request.

Blocked step, exactly: `npx wrangler login` (owner consent) → then `node cloudflare/scripts/deploy.cjs --apply` → `--verify <origin>` → `--apply-origin <origin>`. The remote half of `deploy.cjs --apply` (D1 and R2 creation, remote migration, secret put, deploy) has therefore **never been executed**; it is reviewed code, not exercised code. `--check`, `--plan`, `--verify` (against a local origin) and `--apply-origin`'s guard were run.

## 1. What was built

| Area | What exists |
|---|---|
| Server (`cloudflare/`) | Worker with the v1 API, D1 schema (migration 0001), SQLite-backed Durable Object `Gate`, generated card catalog (132 cards, 11 finishes, 2 skins, hash `9d98017c5afa56a9`), local test suite, guarded deploy script |
| Identity | Private account, server-issued unique two-word alias (65,536 combinations, retry, 90 % guard), 15 minute signed access tokens re-checked against D1, rotating refresh tokens with reuse detection, recovery code, session list and revoke |
| Client (`src/market/online/`) | transport with timeout, no cookies, no tokens in URLs, local-only override for tests; state machine `unconfigured → signed-out → online / offline / error`; synchronous Global provider that is empty and says why |
| Interface | realm badge and notice follow the real state; Global page states (connect, unreachable + retry, "No one is selling yet"); Account page connect, recovery code (shown once), settings, sessions; collection conversion dialog; composer note honest about Global |
| Wallet and ledger | online Credits are a separate wallet with its own ledger, starting at 0; the offline wallet is untouched and labelled `local` |
| Import | one-time conversion of an offline collection (section 3) |

The Global realm shows **real players only**: there are no bots, fixtures or Simulation numbers online, and a realm with nobody trading is empty and says so.

## 2. Authentication and privacy

Summarized in cloudflare.md section 4. Points worth stating here:

- No email, IP, device id, account id or secret is ever returned to a player; other players will only ever see the alias. Network addresses are used transiently as a rate-limit key (hashed) and are not stored on rows.
- The recovery code is shown once and kept only as a hash. It stays valid, so it is as sensitive as a password. Rotation is not built.
- **Turnstile cannot run from a `file://` page.** The server verifies a token when `TURNSTILE_SECRET` is set; the browser side would need a hosted challenge page, which is not built. Until then abuse control is rate limiting only.
- Tokens are stored in `localStorage`; a copied profile is a copied session until revoked.

## 3. One-time beta import ("convert my collection")

Flow: the player exports a backup first (a visible step; the dialog offers the normal JSON export), **Preview** sends a package (card identity only: instance id, card, finish, skin, serial, pack, pulled-at; never Credits, settings, photos or the save), the server validates and returns accepted items and reasoned rejections, the player reviews, **Convert** commits once with an `Idempotency-Key`, and a signed receipt is stored permanently.

Validation: known cards, finishes and skins against the server catalog; serial grammar `CBL-<code>-######` whose code matches the package's origin code; unique ids and serials inside the package; plausible timestamps; item count at most `packsOpened + 25`; cap 3,000 items in the beta. Duplicates are detected three ways (instance id, serial, player/origin code). One import per account and one per package hash, enforced by `UNIQUE` constraints, so two accounts importing the same file race to a single winner and the loser is told why. The commit is one `batch()` (the `imports` row and chunked `json_each` inserts); an interrupted or failed commit leaves nothing behind and the account can import again. The offline save is read and **never modified**; the dialog says the offline cards stay where they are.

**This is not claimed to be cheat-proof.** The offline save is a file the player owns. Someone can edit it and fabricate a plausible package: the checks bound how much (counts, grammar, catalog, uniqueness, one claim per package and per account) but cannot prove a card was ever really opened. Imported items are recorded as `source = legacy-import` so later economy rules can treat them differently, and the beta cap limits the damage of a forged import. Real protection against this arrives only for cards that are opened online (a later stage).

## 4. Transaction model

Documented in cloudflare.md section 7: one `batch()` per mutation, guards in each statement, `CHECK`/`UNIQUE` constraints as the last line, Durable Object lock as optimization only, idempotent replay for the import. Escrow states and the ledger exist in the schema for Stage 5; this stage writes no trade, no price and no listing.

## 5. Tests and evidence

| Check | Result |
|---|---|
| `npm run test:cloudflare` (16 tests, real Workers runtime, local D1 and DO, random secret per run) | **16 / 16 pass** — [log](stage-4-cloudflare-tests.txt) |
| `npm run check:market-online` (headless Chromium from `file://`, local Worker) | **9 / 9** — [evidence](stage-4-evidence.json) |
| `deploy.cjs --verify http://127.0.0.1:<port>` | 10 / 10 |
| `deploy.cjs --check` | passes names, secret scan and wrangler; **fails authentication** (expected, reported) |
| Regression: `npm run test:market` | 70 / 70 |
| Regression: `check:market` (Stage 1), `check:market-sim` (Stage 2, 18 steps), `check:market-economy` (Stage 3, 13 steps) | all pass |

The 16 integration tests cover: public status and CORS; registration and alias grammar; alias uniqueness across 60 accounts; tampered, missing and logged-out tokens; refresh rotation and stolen-token reuse; recovery; registration rate limit; import happy path, idempotent replay and already-imported; package or serials claimed by another account; implausible, malformed and damaged packages; simultaneous imports of one collection by two accounts and by one account; an interrupted import; per-account isolation; D1 constraints (negative balance, held above balance, duplicate serial, bad formats, orphan rows); error shape without stacks. The browser check also records what went over the wire: no Credits, no tokens in URLs, only the allowed origin.

Screenshots (`docs/market-beta/screenshots/online-*.jpg`): signed out, connect dialog, recovery code, connected empty Global, settings, import preview, import receipt, offline state.

Not checked: any real Cloudflare behavior (cold starts, D1 latency, Durable Object location, actual quotas, a real `workers.dev` TLS origin); Electron packaged build with the online realm on (it is off); Turnstile in a browser; concurrency beyond the local runtime.

## 6. Cost and limits

Figures were read from Cloudflare's documentation on 2026-10-13 and are tabulated, with the arithmetic for the beta, in cloudflare.md section 8. In short: Workers Free is enough for a small beta; its **50 D1 queries per invocation** shaped the import (chunked `json_each`), **100,000 row writes per day** is the budget that matters (a 3,000-card import is about 9,000), and exceeding a Free limit blocks rather than bills. The Workers request limit was not re-fetched; check before launch. No paid plan was chosen or is required for the beta.

## 7. Design decisions and caveats

- **D1 is the authority, the Durable Object is not.** If the Gate is unavailable, correctness still holds from the D1 guards.
- **Bearer tokens, no cookies**, so CORS is an allowlist for hygiene, not an auth boundary.
- **`file://` is a first-class origin** (`Origin: null` is allowed); that is why there are no cookies and why Turnstile needs a hosted page.
- **The listing schema exists, the listing API is read-only and empty.** Nothing in this stage can create a listing or a trade.
- **Beta realms are disposable.** Schema changes are forward-only migrations; the beta database may be reset by the owner before Stage 8 (and nothing offline depends on it).

## 8. Unresolved and gated

| Item | Status | Needs |
|---|---|---|
| Wrangler login | not done | owner interactive consent |
| Remote D1, R2, secret, deploy | not done | login, then `deploy.cjs --apply` |
| Live health check and real `--verify` | not done | deployed origin |
| Client origin + CSP switched on | not done | verified origin, then `--apply-origin` |
| Turnstile widget (hosted challenge page + sitekey) | not built | owner decision |
| Workers request-limit figure | not re-fetched | docs check |
| Recovery-code rotation | not built | later |

## 8a. Security review follow-up

An automated review of the Stage 4 commit raised four findings. They were addressed in the commit `stage 4: harden rate limits, request bounds and import claims`, with regression tests:

| Finding | Fix |
|---|---|
| Rate-limit bypass in the Durable Object: a request in a short-window bucket (`api`, 60 s) deleted the counters of long-window buckets (`import-commit`, 1 h) in the same object, so hourly limits never held under normal traffic | stale windows are deleted per bucket only |
| Request bodies were buffered whole when the declared length was absent or wrong | bodies are read as a stream and cut off at the limit (413) |
| Import plausibility trusted the self-reported opening count, and any account could import serials under another save's player code | the check is documented as a damage guard only; one import per origin code (`UNIQUE`), idempotency key unique per account (migration 0002) |
| Recovery could create unlimited sessions | at most 10 live sessions per account; recovery ends the oldest |

The review's exact wording was not available to me; these four are what I found in the files it named and the categories it listed, so a fourth item of the review may differ from my reading.

## 9. For Stage 5

The server already has wallets with `held ≤ balance`, instances with `escrow` state, a ledger with `UNIQUE(account_id, idem)`, and `listings`/`listing_items` with a one-listing-per-instance constraint. Stage 5 adds the mutations on top, each one `batch()`, each idempotent through the `idempotency` table.
