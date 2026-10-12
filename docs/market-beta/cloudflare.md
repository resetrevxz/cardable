# Cardable Market Beta — Cloudflare runbook (beta/staging only)

Everything online for the Market beta lives in resources named `cardable-market-beta*`. Nothing here is production, nothing is attached to a custom domain, and nothing outside those names is read, changed or deleted. The code is in `cloudflare/`; this file is the operator's guide. The acceptance report is [stage-4.md](stage-4.md).

> **Status at the end of Stage 4 (2026-10-13): not deployed.** The Cloudflare CLI (Wrangler 4.149) is installed in `cloudflare/` and the Worker is verified end to end on the local Workers runtime, but `wrangler whoami` reports *not authenticated* and the sign-in needs the account owner's interactive consent. No remote resource was created, so no ID or URL in this file is real yet. Section 9 lists the exact steps that remain. Nothing below is claimed as live.

## 1. Resources

| Resource | Name / binding | Purpose | Created by |
|---|---|---|---|
| Worker | `cardable-market-beta` (`workers.dev` only, no routes) | the HTTPS API `/v1/*` | `deploy.cjs --apply` |
| D1 database | `cardable-market-beta-db` · binding `DB` | the single source of truth (accounts, wallets, ledger, instances, imports, listings schema) | `deploy.cjs --apply` |
| Durable Object class | `Gate` · binding `GATE` · SQLite-backed | per-key rate limiting and short locks; it owns **no** game data | Worker migration `v1` |
| R2 bucket | `cardable-market-beta-media` · binding `MEDIA` | private listing images (used from Stage 7; created now so the binding is stable) | `deploy.cjs --apply` |
| Secret | `SESSION_SECRET` | HMAC key for access tokens and import receipts | `wrangler secret put` (stdin) |
| Secret (optional) | `TURNSTILE_SECRET` | bot challenge verification, when the owner enables it | `wrangler secret put` |

Recorded after deployment (non-sensitive identifiers only): `account_id`, D1 `database_id`, the `workers.dev` origin, the deployed version id. Fill them in the table in section 9 when they exist.

## 2. Configuration (`cloudflare/wrangler.toml`)

Plain variables (public, safe to commit): `ENVIRONMENT=beta`, `API_VERSION=1`, `CORS_ALLOW`, `TURNSTILE_SITEKEY` (empty = no challenge), `BETA_IMPORT_CAP=3000`, `SESSION_TTL_SECONDS=900`, `REFRESH_TTL_DAYS=30`. `REGISTER_PER_HOUR` defaults to 8 in code.

Secrets are **never** in this file, in the client, in markdown, in logs or in screenshots. `deploy.cjs --check` scans the folder for private keys, token-shaped strings and secret assignments and fails if it finds any. Local development passes a throw-away secret with `--var`; tests generate a random one per run.

## 3. Deploy, verify, switch the client on

Run from `cloudflare/` after the owner has signed in once (`npx wrangler login`, approve the consent screen in the browser; the script never types a credential):

```bash
npm install
node scripts/deploy.cjs --check          # read-only: tooling, authentication, config, secret scan
node scripts/deploy.cjs --plan           # prints exactly what --apply will create
node scripts/deploy.cjs --apply          # D1 + R2 + migrations + secrets + deploy; refuses when unauthenticated
node scripts/deploy.cjs --verify https://cardable-market-beta.<subdomain>.workers.dev
node scripts/deploy.cjs --apply-origin https://cardable-market-beta.<subdomain>.workers.dev
```

- `--apply` reuses a D1 database of exactly that name if it exists, never deletes, generates `SESSION_SECRET` locally and pipes it to Wrangler on stdin (never printed or stored).
- `--verify` makes real requests: status and schema, trace id, locked-down CSP, `no-store`, CORS for the `null` (file://) origin and its refusal for a foreign origin, 401 without a token, a real registration, an empty zero wallet, and that logout revokes the session at once. It exits non-zero on any failure. It has been rehearsed against a local `wrangler dev` origin (10/10).
- `--apply-origin` writes the verified origin into `src/data/market-online.js` and into the page's `connect-src`. Until then the renderer CSP is `connect-src 'none'` and the game makes no request at all.

### Rollback

`wrangler rollback` returns the Worker to its previous version. The D1 schema is forward-only: a migration is a new numbered file in `cloudflare/migrations/`; do not edit an applied file. To switch the online realm off in a build, empty `apiBase` and restore `connect-src 'none'`; the offline game is unaffected.

## 4. Authentication

There are no email addresses, passwords, IPs or account ids in anything a player sees. The public identity is a **server-issued two-word alias** (for example "Steady Nightjar"), unique case-insensitively, drawn from 256 × 256 words; allocation retries on collision and stops at 90 % of the pool.

| Item | Rule |
|---|---|
| Register | `POST /v1/auth/register`. Per network address 8 / hour. Turnstile token verified when `TURNSTILE_SECRET` is set. Returns alias, short-lived access token, refresh token and a **one-time recovery code** shown once. |
| Access token | HMAC-SHA-256 signed, 15 minutes, carries the session id; the session is re-checked in D1 on every request, so logout and revocation are immediate. Bearer header only, never a cookie, never a URL. |
| Refresh token | 32 random bytes, stored hashed, rotated on every use. Presenting an already-rotated token is treated as theft: the session is revoked. 30 days. |
| Recovery code | 20 characters, shown once at registration, stored only as a hash. It stays valid (it is the account's long-term key, like a password: whoever holds it can sign in), 10 attempts / hour per address. Opens a new session on another device. Lost code + lost device = a new account (deliberate: there is no email to reset from). Rotating it is not built. |
| Sessions | list and revoke from Settings; each is scoped to one account. Every query is `WHERE account_id = <token's account>`; ids from the client are never trusted for ownership. |
| Rate limits | per address: register, refresh, recover; per account: 600 requests / minute, 12 import previews / hour, 6 import commits / hour. Enforced by the `Gate` Durable Object so they hold across Worker instances. |
| Turnstile on `file://` | The widget cannot run from a `file://` page (it needs a real origin and its own script). The server side is built and verified; the browser side needs a small hosted challenge page, which is **not built**. With no `TURNSTILE_SECRET` the registration rate limit is the only abuse control. Say so before opening the beta widely. |
| Token storage | `localStorage` on the device (the offline app is a browser game; no OS keychain is available to it). A stolen profile folder is a stolen session until revoked. |

CORS is an allowlist (`null`/`file://`, localhost, the GitHub Pages origin). It is not an authentication boundary: bearer tokens are.

## 5. API contract (v1)

All responses are `{ "ok": true, "data": … , "trace": "<id>" }` or `{ "ok": false, "error": { "code", "message", "detail"? }, "trace": "<id>" }`. Every response has `cache-control: no-store`, `x-content-type-options: nosniff` and `content-security-policy: default-src 'none'; frame-ancestors 'none'`. Errors never contain a stack. List endpoints use opaque cursors (`?limit=&cursor=`), never offsets.

| Method · path | Auth | Answer |
|---|---|---|
| GET `/v1/status` | none | service, version, schema, catalog hash, features (`trading:false`, `listings:false` in this stage), turnstile sitekey |
| POST `/v1/auth/register` · `/refresh` · `/recover` | none | tokens (+ alias, recovery code on register) |
| POST `/v1/auth/logout` · GET `/v1/auth/sessions` · DELETE `/v1/auth/sessions/:id` | bearer | revoke / list / revoke one |
| GET `/v1/me` | bearer | alias, createdAt, imported, realm |
| GET `/v1/wallet` | bearer | balance, held, available, newest 30 ledger rows |
| GET `/v1/inventory` | bearer | online-owned instances, cursor paged, total |
| GET `/v1/listings` | bearer | always `items: []`, `emptyReason: "no-listings"` until Stage 5 writes them |
| GET `/v1/prices` | bearer | `items: []`; only completed **player** sales ever appear here |
| GET `/v1/notifications` | bearer | newest 50 |
| GET/PUT `/v1/settings` | bearer | `notifyBids`, `notifyTrades`, `notifyWatch` |
| POST `/v1/import/preview` | bearer | validate a package, return accepted items and reasoned rejections, 15 minute preview id |
| POST `/v1/import/commit` | bearer + `Idempotency-Key` | one-time claim; returns the signed receipt |
| GET `/v1/import/receipt` | bearer | the permanent receipt |

## 6. Schema (`migrations/0001_init.sql`, schema 1)

`schema_info` · `accounts` (alias UNIQUE NOCASE, recovery hash UNIQUE) · `sessions` (refresh hash UNIQUE, previous hash kept for reuse detection) · `wallets` (`CHECK balance ≥ 0`, `0 ≤ held ≤ balance`, version) · `ledger` (append-only by convention: no code path updates or deletes a row; `delta ≠ 0`, `balance_after ≥ 0`, `UNIQUE(account_id, idem)`) · `instances` (server-issued id, **`serial` UNIQUE globally**, `source`, `state ∈ owned|escrow|redeemed`) · `imports` (**one per account, one per package hash**, receipt signature, idempotency key UNIQUE) · `import_previews` · `idempotency` (`PRIMARY KEY(account_id, key)`, request hash; reserved for Stage 5) · `listings`, `listing_items` (`instance_id` UNIQUE: a card can be in one listing), `price_observations`, `notifications`, `settings`.

Indexes: ledger by account (id desc), instances by owner/state/card, listings by status/ends_at, price by card/at, notifications by account, sessions by account. Foreign keys cascade only from account-owned convenience rows; money and card rows never cascade.

### Migration contract

1. A migration is a new `NNNN_name.sql`; applied files are immutable.
2. Forward only. Destructive changes ship as add-new → backfill → switch → (later migration) drop.
3. Local rehearsal first: `wrangler d1 migrations apply cardable-market-beta-db --local`, then the test suite, then `--remote`.
4. `schema_info.schema` and `/v1/status.schema` move together; the client treats a higher schema than it knows as read-only.

## 7. Consistency model

D1 is the single source of truth. Every mutation is **one `db.batch([...])`**, which D1 runs as a single transaction; each statement carries its own guard (`WHERE`, `CHECK`, `UNIQUE`), so a race or a retry can only fail whole, never half-apply. The one-time import is idempotent through `imports.idem` (UNIQUE): replaying a commit with the same `Idempotency-Key` returns the first receipt, never a second import. The generic `idempotency` table (`account, key, request hash → response`) is in the schema for the trading mutations of Stage 5 and is not written yet. The Durable Object serializes an account's import (a short lock) and rate-limits; if it is unavailable the guard statements in D1 still hold, so it is an optimization and a politeness, not a correctness dependency. Escrow (`instances.state = 'escrow'`, `wallets.held`) and the `ledger` are in the schema now; Stage 5 adds the mutations that use them, under the same rules.

## 8. Limits and cost (read from Cloudflare's documentation on 2026-10-13; re-check before relying on them)

| Item | Workers **Free** | Workers **Paid** |
|---|---|---|
| D1 rows read | 5,000,000 / day | 25 B / month included, then $0.001 / million |
| D1 rows written | 100,000 / day | 50 M / month included, then $1.00 / million |
| D1 storage | 5 GB account total, 500 MB / database | 5 GB included, then $0.75 / GB-month, 10 GB / database |
| D1 queries per Worker invocation | **50** | 1,000 |
| D1 bound parameters / statement · statement length · row size | 100 · 100 KB · 2 MB | same |
| Durable Objects (SQLite-backed) | available on Free: 100,000 requests / day, 13,000 GB-s / day | 1 M requests / month then $0.15 / M |
| R2 | 10 GB-month, 1 M Class A, 10 M Class B per month; egress free | $0.015 / GB-month beyond, $4.50 / M Class A, $0.36 / M Class B |

Exceeding a Free-plan daily limit **blocks** further queries rather than billing; moving to Paid is the owner's decision and is not made here. The documentation also carries the Workers request limits (100,000 requests / day on Free); that figure was not re-fetched in this stage, so check it with the others.

How the beta is shaped by them:

- **50 queries per invocation** (Free): the import inserts with `json_each` in chunks of 400 rows per statement, so a 3,000-card import is about 8 statements, not 3,000. The beta cap `BETA_IMPORT_CAP = 3000` keeps one import inside both this limit and the 2 MB row limit of a stored preview.
- **Writes are the scarce resource**: an inserted instance writes its row plus two index entries (about 3 row writes). A full 3,000-card import is therefore roughly 9,000–10,000 row writes, so the Free plan supports about ten full imports a day; a typical collection (a few hundred cards) is about 1,000. Registration is roughly 8 row writes. Read-only browsing costs reads, which are 50× more plentiful.
- **Pagination**: cursors on the primary key (`id > ?`), bounded `limit ≤ 100`, so a page costs at most `limit + 1` row reads.
- **Budget estimate for a beta of 200 players on Free**: 200 registrations (~1,600 writes) + 200 imports of 300 cards (~200,000 writes) over a week is ~30,000 writes/day, inside the 100,000/day limit; reads under 100,000/day. Not measured in production; it is arithmetic from the figures above.

## 9. Verification record and the steps that remain

| Check | Result |
|---|---|
| `wrangler --version` | 4.149.0 (installed from `cloudflare/package.json`) |
| `wrangler whoami` | **not authenticated** (2026-10-13) |
| Local integration tests `cloudflare/test/api.test.mjs` on the real Workers runtime (`wrangler dev --local`, local D1 and DO) | 16 / 16 pass |
| `deploy.cjs --verify` against a local origin | 10 / 10 pass |
| `deploy.cjs --check` | names ok · secret scan ok · wrangler ok · **authentication FAIL** |

Remaining, in order — each is blocked only by the first:

1. **Owner:** `npx wrangler login` in `cloudflare/`, approve the Cloudflare consent screen (billing/plan prompts, if any, are the owner's).
2. `node scripts/deploy.cjs --apply`, then `--verify <origin>`.
3. If both pass: `--apply-origin <origin>`, re-run `npm run check:market-online`, commit.
4. Optional: create a Turnstile widget in the dashboard, put its sitekey in `wrangler.toml`, and set `TURNSTILE_SECRET` with `--turnstile-secret-stdin`.

| Identifier | Value |
|---|---|
| Account id | _not created_ |
| D1 database id | _not created_ |
| Worker origin | _not deployed_ |
| Deployed version id | _not deployed_ |
