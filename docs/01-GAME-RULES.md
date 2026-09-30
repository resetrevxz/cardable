# 01 — Game rules

All numbers live in `src/config.js` and `src/data/`. Change them there, never in UI code.

## 1. Packs and the timer

- A new pack arrives every `config.packs.regenMs` (default **8 hours**, see OPEN-QUESTIONS #1).
- Up to `config.packs.maxStored` (**2**) packs can be stored. At the cap, the timer is **paused** (time is not banked).
- New players start with `config.packs.startingPacks` (**2**) packs and the tutorial (`docs/08-TUTORIAL.md`).
- Timers use real timestamps so they keep running while the tab is closed. There is no interval-based counting.

State: `packs.ready` (0..max) and `packs.timerStartedAt` (ms, or `null` when at the cap).

```
tick(now):
  if ready >= max:            timerStartedAt = null; return
  if timerStartedAt == null:  timerStartedAt = now          // dropped below the cap
  elapsed = now - timerStartedAt
  if elapsed < 0:             timerStartedAt = now; return  // clock moved backwards: ignore
  gained = floor(elapsed / regenMs)
  ready = min(max, ready + gained)
  if ready >= max:            timerStartedAt = null
  else:                       timerStartedAt += gained * regenMs
progress(now) = (now - timerStartedAt) / regenMs           // 0..1 for the fluid fill
openPack():
  ready -= 1; if timerStartedAt == null: timerStartedAt = now
```

Run `tick` on load, on `visibilitychange` (tab shown), and on a light 1 s timer while visible. Emit `pack:ready` when `ready` increases (drives the tab title and the ready animation).

Countdown format: `7h 12m` when 1 h or more, `42m 10s` under 1 h, `38s` under 1 min. Digits are mono and tabular.

## 2. Pulling a card

The result is decided **before** any animation and can never be changed by it.

```
pullCard(pack):
  1. tier = weightedPick(rarities where pullable, weight = chance * (pack.tierWeightModifiers[tier.id] ?? 1))
  2. if tier has no pullable cards: apply config.pull.emptyTierPolicy
       "downgrade" (default): move to the next lower tier that has cards
       "renormalize": redo step 1 using only tiers that have cards
  3. card = uniform pick among the tier's pullable cards
  4. instance = { instanceId, cardId, serial, pulledAt, seen: false }
```

- Weights are normalized by their sum. In dev mode, log a warning if the chances do not sum to 100 (they currently sum to 100.5, see OPEN-QUESTIONS #2).
- `pack.cardsPerPack` (default **1**) cards are pulled per pack. If more than 1, reveal them one at a time (`docs/04-PACK-OPENING.md`).
- The Limited tier is `pullable: false` and never appears in normal pulls.
- **Commit at charge completion.** When the 3-second hold completes, consume the pack, resolve the pull, and store it as `save.pendingReveal`. This prevents refreshing to re-roll. On the next load, if `pendingReveal` exists, skip straight to the revealed state with the Keep button.
- Pressing **Keep** moves the pending card(s) into `inventory`.

## 3. Inventory model (built for a future market)

Every pulled card is a unique **instance** with its own serial. Stacks ("x3") are a display grouping by `cardId`, not merged data. Nothing is ever deleted in v1.

## 4. Serial numbers

- Format: `CBL-<playerCode>-<counter>` for example `CBL-7K3F-000142`.
- `playerCode`: 4 characters from `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, generated once on first run and saved. It keeps serials unique across different players' saves once a market exists.
- `counter`: 6 digits, increments per pulled instance, saved with the game. Never reused, never reset.
- All formatting lives in `src/core/serial.js` so it is easy to change.

## 5. Currency

- Name and symbol come from `config.currency` (placeholder values, OPEN-QUESTIONS #11).
- v1: displayed only, starts at 0, count-up animation on change. Expose `Cardable.currency.add(n)` but wire **no** earning or spending yet.

## 6. Duplicates

Duplicates stack visually ("x3") in the inventory. No selling or converting in v1.

## 7. Save data

Storage: `localStorage`, one key (`config.storage.key`), JSON, versioned.

```json
{
  "schemaVersion": 1,
  "playerCode": "7K3F",
  "createdAt": 0,
  "packs": { "ready": 2, "timerStartedAt": null },
  "serialCounter": 0,
  "inventory": [
    { "instanceId": "…", "cardId": "gen1-basic-01", "serial": "CBL-7K3F-000001", "pulledAt": 0, "seen": false }
  ],
  "pendingReveal": null,
  "currency": 0,
  "tutorial": { "step": "welcome", "done": false },
  "settings": { "reducedMotion": null },
  "stats": { "packsOpened": 0 }
}
```

Robustness:
- Wrap all storage access in try/catch. If storage is unavailable, run in memory and show a small quiet notice.
- If the save fails to parse, keep a copy under `<key>.corrupt`, then start fresh.
- `save.schemaVersion` drives migrations in `src/core/state.js`.
- Include export and import of the save as a JSON file in the polish stage (clearing browser data would otherwise erase the collection).
- Save on every meaningful change (pack consumed, Keep pressed, tutorial step), not on a timer.

## 8. Browser title and favicon

- Default title `Cardable`. When a pack is ready and the tab is hidden: `Cardable · pack ready`. When the tab is visible: `Cardable`.
- Favicon is the logo mark as an inline SVG data URI (no file needed).

## 9. Dev tools (`?dev=1` in the URL)

Needed to test 0.005 % rarities. Available only when `?dev=1`: a tiny mono panel (bottom-left) with: force next pull tier, grant packs, skip the timer, reset save, replay tutorial, toggle `rarityColorMode`, show FPS. Never visible without the flag.

## 10. Out of scope for v1

Market, trading, variants, music and sound, mobile/touch layouts, accounts, cloud saves.
