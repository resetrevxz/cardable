# Cardable Market Beta — operator runbook

For the person who runs the Global Market beta. Everything here is a command you can paste. Nothing in this file contains a secret; the operator token lives in `cloudflare/.admin-token` (git-ignored) and in the Worker's secret store.

All commands run from `cloudflare/` unless they say otherwise. `ORIGIN` is the Worker address: `https://cardable-market-beta.resetrevxz.workers.dev`.

## 1. What runs where

| Thing | Name / id | Notes |
|---|---|---|
| Worker | `cardable-market-beta` | `workers.dev` address above; cron every 5 minutes |
| Account | `d2cf850211741463a3cfd2caaea8d743` | not a secret |
| D1 database | `cardable-market-beta-db` · `16cf1582-4d8a-436a-b18d-bf0ba5859399` | schema 6 after the Stage 8 migration |
| R2 bucket | `cardable-market-beta-media` | private; pictures only, reached through the Worker |
| Durable Object | `Gate` (SQLite-backed) | rate limits, per-listing alarms |
| Secrets | `SESSION_SECRET`, `ADMIN_TOKEN` | set with `wrangler secret put`; never printed, never in the repo |

## 2. A daily look (two minutes)

```bash
node scripts/deploy.cjs --admin ORIGIN summary
node scripts/deploy.cjs --admin ORIGIN reconcile
node scripts/deploy.cjs --admin ORIGIN usage
```

* `summary` — row counts per table, Credits in wallets and held, listings by status, current mode. Counts only: no names, tokens or serials.
* `reconcile` — checks every invariant (cards in one place, Credits equal the ledger, holds equal what is open, every sale has a trade). `"ok": true` and `"problems": []` is the only good answer.
* `usage` — pictures stored and their bytes.

## 3. The service mode (hard stop)

| Mode | Players see | The Worker does |
|---|---|---|
| `open` | normal | everything |
| `read-only` | "Beta · read-only": look around, nothing can be changed | answers reads; refuses every write with `read-only` (503); sign-in refresh and sign-out still work; **opening a listing no longer settles it and alerts are not evaluated**; the 5-minute sweep and the per-listing alarms wait |
| `maintenance` | "Paused for maintenance": a calm empty state, nothing lost | answers only `/v1/status` and the operator routes; nothing is read, written or settled |

```bash
node scripts/deploy.cjs --admin ORIGIN mode                                   # show it
node scripts/deploy.cjs --admin ORIGIN mode read-only "Checking the books."   # change it (message is optional, 200 characters)
node scripts/deploy.cjs --admin ORIGIN mode maintenance "Back at 18:00 UTC."
node scripts/deploy.cjs --admin ORIGIN mode open
node scripts/deploy.cjs --admin ORIGIN ops-log                                # who changed it, when, why
```

A change reaches every edge within about three seconds (each isolate looks at the mode that often). Every change is logged in `ops_log` with its actor. While paused, auctions that end wait; when the service opens, each is settled exactly once at its true end time (the winner is whoever led at the deadline).

**When to use which.** `read-only` for anything you want to inspect while players can still look: a reconcile that reports problems, a suspected exploit, a slow D1. `maintenance` for anything that needs the data quiet: a migration, a restore, a reset. The offline game and the Simulation never depend on the service, so neither mode affects them.

## 4. The daily budget breaker

Every five minutes the cron counts how many things happened since its last look (new ledger rows, listing events, notifications, accounts) with four index-only reads. When a UTC day's total reaches `DAILY_EVENT_BUDGET` (default 15,000; set it in `wrangler.toml` `[vars]` and redeploy) the service goes `read-only` by itself, with the message "Daily capacity reached … Changes resume at 00:00 UTC", logged under the actor `circuit-breaker`. At the next UTC day the cron lifts a pause the breaker made (never one an operator made).

* Why: a Free plan blocks past its daily write allowance anyway; a Paid plan would just bill. The breaker stops a runaway client or a hot loop early and says why.
* Look at it: `node scripts/deploy.cjs --admin ORIGIN budget` (runs one check now and prints `used`, `limit`, `tripped`).
* Open it sooner: `mode open` — but it will trip again at the next check unless you raised the budget or the day rolled over.
* One event is roughly three to six D1 row writes, so 15,000 events is on the order of 45,000–90,000 writes, inside the Free plan's 100,000/day. Re-derive this from the dashboard before trusting it (section 9).

## 5. Incident playbook

| What you see | Do this |
|---|---|
| `reconcile` reports a problem | `mode read-only` → `--admin ORIGIN repair` → `reconcile` again. If it is still not clean: `mode maintenance`, export (section 6), keep the output, and do not repair further by hand. |
| A report of a wrong balance or a duplicated card | `mode read-only`, `reconcile`, find the account's `ledger` rows with the summary tools, compare with `trades`. A real duplicate would show as a reconcile problem. |
| Abuse in comments, reviews or pictures | `node scripts/moderate.cjs` (hide, mute, block uploads, take down a picture or listing; every action is logged). No mode change needed. |
| A bad deploy | `npx wrangler rollback` (pick the previous version) — the database is untouched. If the bad version also ran a migration, see "Restore" below instead. |
| D1 is slow or erroring | `mode maintenance`, check the Cloudflare status page, wait, `mode open`, `reconcile`. |
| Storage near its limit | `usage`; remove abandoned drafts by waiting for the cron (it removes unattached pictures), or take down large pictures with `moderate.cjs`. |
| The operator token leaked | `npx wrangler secret put ADMIN_TOKEN` with a new random value, write it to `cloudflare/.admin-token`. Nothing else changes. |
| The session secret leaked | `npx wrangler secret put SESSION_SECRET` with a new random value. **Every access token stops working at once** and players sign in again with their refresh token; refresh tokens are stored hashed and still work. |
| Players report "paused" and you did not pause it | `ops-log` — it will say whether the breaker did. |
| Anything you do not understand | `mode maintenance`. A paused beta costs nothing; a wrong repair can. |

### Restore

D1 keeps point-in-time history (Time Travel). To look and to restore:

```bash
npx wrangler d1 time-travel info cardable-market-beta-db --timestamp "2026-10-16T12:00:00Z"
node scripts/deploy.cjs --admin ORIGIN mode maintenance "Restoring."
npx wrangler d1 time-travel restore cardable-market-beta-db --timestamp "2026-10-16T12:00:00Z"
node scripts/deploy.cjs --admin ORIGIN reconcile
node scripts/deploy.cjs --admin ORIGIN mode open
```

A restore also takes back the sales made after that time; tell players why. Pictures in R2 are not part of D1 history: a restored database may point at a picture that no longer exists (it then shows as unavailable) or leave pictures nothing points to (the cron removes them). The retention window depends on the plan; read it on the Cloudflare dashboard before you rely on it.

## 6. Backups and export summaries

```bash
node scripts/deploy.cjs --admin ORIGIN mode read-only "Taking a backup."
npx wrangler d1 export cardable-market-beta-db --remote --output ../../cardable-market-beta-backup-YYYYMMDD.sql   # outside the repository
node scripts/deploy.cjs --admin ORIGIN summary > ../../cardable-market-beta-summary-YYYYMMDD.json
node scripts/deploy.cjs --admin ORIGIN mode open
```

The export holds every table, including hashed session tokens and card serials: keep it private and delete it when it has served. The `summary` file is the safe thing to quote in a record: counts and totals, no personal detail. Record the summary's numbers and the export's date in `docs/market-beta/RELEASE.md`, never the export itself.

**What survives for players:** their offline save, Credits, cards and Studio photos live on their own device and are never part of any of this. A player's Global account is recoverable on a new device with the recovery code they were shown once.

## 7. Beta reset policy

The Global economy is a beta and may be reset. A reset deletes every Global account, Credit, card, listing, sale, price, comment, review, follow and picture. It never touches anyone's offline game.

**It is not done by the API and it is never done as a side effect of anything.** The rule:

1. The owner decides, in writing, and says why. The decision is recorded in `docs/market-beta/RELEASE.md`.
2. Players are told first, on this page's Help & feedback text and in the release notes, with a date.
3. `mode maintenance "Beta reset."`
4. A backup (section 6) is on disk.
5. Dry run — prints what would go and writes `cloudflare/reset-plan.sql` (git-ignored, not applied):

   ```bash
   node scripts/deploy.cjs --admin ORIGIN reset-plan
   ```

   The plan lists every row count and a `DELETE` per table. The audit tables (`moderation_log`, `ops_log`), the service mode, the schema record and the guard table are kept. Pictures are removed separately: list the R2 bucket and delete its keys (the plan says so).
6. The owner reads the plan and the numbers and approves. Only then:

   ```bash
   npx wrangler d1 execute cardable-market-beta-db --remote --file reset-plan.sql
   node scripts/deploy.cjs --admin ORIGIN reconcile       # must be clean, with zero accounts
   node scripts/deploy.cjs --admin ORIGIN mode open
   ```

7. Record what was removed (the dry-run counts) and when.

**No reset was run in Stage 8.** The dry run exists and is tested (`cloudflare/test/ops.test.mjs`: it changes no row).

## 8. Deploy and roll back

```bash
node scripts/deploy.cjs --check
node scripts/deploy.cjs --plan
node scripts/deploy.cjs --apply                 # creates what is missing, applies migrations, deploys
node scripts/deploy.cjs --verify ORIGIN         # real requests; fails loudly
```

Migrations only add. A deploy that is only code is undone with `npx wrangler rollback`. A migration is not undone: it adds tables and columns, so the previous code keeps working against it.

## 9. Cost watch

Open the Cloudflare dashboard weekly while the beta is small: Workers requests, D1 rows read/written, R2 operations and storage. The numbers to compare against are in `cloudflare.md` section 8 and in the per-request budgets of the tests (a card's analytics is five statements; a trade is under 25). If rows written per day approach the plan's allowance, lower `DAILY_EVENT_BUDGET` before the plan does it for you.

## 10. Who can see what

Only the operator token opens `/v1/admin/*`, and those routes answer `404` to everyone else so they are not advertised. Operator actions that change a player's experience are logged (`moderation_log`, `ops_log`). Nothing the operator tools print contains an access token, a recovery code or a refresh token.
