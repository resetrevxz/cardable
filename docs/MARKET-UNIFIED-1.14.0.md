# One Market — Cardable 1.14.0

Status: implementation integrated and Worker schema 7 deployed with live service verification passed. Desktop delivery and the GitHub release remain pending. This record does not confirm public app publication or an installer upgrade.

## Current behavior

The game, Shop and Market use one Credit balance and one collection of actual card instances. Browse combines computer-trader listings with player listings after an account is connected and linked. Before that link completes, player listings remain gated and offline play continues with computer traders. Standard and Players are no longer visible economy choices. Internal `simulation` and `global` provider ids and legacy API routes remain compatibility details; they do not define separate player wallets.

Text size and contrast have been improved, and Market Settings groups related controls. The primary navigation is four labelled tabs: Browse, Shop, Your cards and Activity. Search, the shared wallet, the notch and Close stay in the Market shell. Secondary tools, including Advanced, live in Market Settings. The Shop uses the same game purchase path and collection.

Simple selling starts with bidding enabled. The preference persists for later drafts, and turning it off creates a fixed-price listing. An auction can carry an optional Buy now price that remains available after bids. Reviews state the exact instance, price or starting bid, duration, fee and proceeds before confirmation. Existing locks prevent a listed instance being spent twice.

## Persistence and synchronization

Optional unified state is normalized without changing the save schema or app identity. Migration retains a durable backup. Stale queued listings are canceled during migration, with a readable notice in Account rather than an invisible or stranded queue. Before linking, progress remains local. Linking brings the current game balance and actual cards into the account's unified state; it is not a separate portfolio import. Linked offline commits journal Credit deltas and added or removed actual instances, including their rolled identity and provenance. They do not reconstruct cards from catalog templates.

`src/market/online/sync.js` persists the checkpoint and pending journal with the local save. Uploads are ordered; server sequencing, operation identities and receipts make retries exact-once. Server snapshots are applied to the same local wallet and collection while preserving pending local changes. Uncertain trade results retain their original identity for recovery before later journal upload. The backend in `cloudflare/src/game.js` and migration `0007_one_market.sql` tracks account links, instance mappings and the active device.

Only one device is active for a linked account. Finish pending synchronization before explicitly transferring play to the receiving device. A stale device is refused rather than allowed to overwrite newer ownership or balances. After recovery-code authentication, a separate confirmed Restore last synced state action can recover from an unavailable device. Its durable request survives lost replies; the complete prior save, including unsynchronized progress, remains in a local backup while the synchronized collection becomes active. Finish a reserved pack before transfer. JSON import/export remains local backup and recovery; Studio photos remain in separate storage and need a separate backup.

Network access stays inside `src/market/online/` and requires explicit connection. The Worker remains authoritative for player trades, ownership, holds, fees, bids, deadlines and settlement. Idempotency and transaction receipts apply to mutations. Old realm APIs remain internal compatibility paths while the player sees one economy.

## Verification recorded so far

These checks ran against the integrated implementation in disposable saves and databases.

| Check | Observed result | Boundary |
|---|---|---|
| Market unit suite | 121 passed | Includes stale queued-listing migration cancellation; not installer acceptance |
| Backend final full suite | 109 passed in 209.98 s | Includes final buyout behavior |
| Focused backend game suite | 9 passed | After the final buyout change |
| Unified browser final check | 6 passed | Source browser acceptance |
| Unified online browser final check | 9 passed | Includes cold-feed focus preservation and explicit lost-device recovery; separate from production checks, separate from production service checks |
| Economy browser check | 13 passed | Existing economy flows |
| Electron services via `npm test` | Passed | Native service checks, separate from installer execution |
| Shop stage check | Passed | Focused Shop acceptance |
| Worker deployment and live verification | Schema 7 deployed; all checks passed | Status, authentication, CORS, media and logout |
| Existing Simulation browser suite | 18 passed | Updated intentional navigation, review and trader-clock labels |
| Isolated native launch and recovery | Passed | Isolated application run, not setup or live-updater acceptance |

Release evidence will be added after delivery and publication. Do not infer an all-bugs-fixed claim from these checks. Clean-profile installer execution, a real previous-version updater upgrade, broad hardware performance and screen reader acceptance have not been tested in this update.

## Delivery and publication

Worker schema 7 deployment and live status/authentication/CORS/media/logout checks passed. Pending: reviewed commit, `npm run deliver:desktop`, stable Latest Build handoff, GitHub release/Actions and live website/asset verification. No public app artifact URLs or successful setup run are asserted here. The integrating agent owns these shared release operations and will replace this pending status with actual outcomes.

## Superseded guidance

This update supersedes the earlier Standard/Players realm switch, separate online wallet and collection, online import workflow, and icon-only Market navigation. Historical 1.8.0–1.13.0 documents remain evidence of those versions. Current rules are in root AGENTS.md and Designs.MD; unrelated offline, provenance, save, photo, accessibility and quality contracts continue to apply.
