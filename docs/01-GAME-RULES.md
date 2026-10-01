# 01 — Game rules

All numbers live in `src/config.js` and `src/data/`. Change them there, never in UI code.

## 1. Packs and the timer

- A new pack arrives every `config.packs.regenMs` (**2 hours**, per the owner).
- Up to `config.packs.maxStored` (**4**) packs can be stored. At the cap, the timer is **paused** (time is not banked).
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

Run `tick` on load, on `visibilitychange` (tab shown), and on a light 1 s timer, including background tabs. Browsers may throttle the timer; reconciliation always uses timestamps. Emit `timer:tick` to refresh the title and `pack:ready` when `ready` increases (drives the ready animation).

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
- Pressing **Keep**, Enter or a fresh press of Space moves the pending card(s) into `inventory`. A key still held from charging never accepts a card. Ignore repeated Space presses and preserve control-specific Space behavior outside the revealed card.

## 3. Inventory model (built for a future market)

Every pulled card is a unique **instance** with its own serial. Stacks ("x3") are a display grouping by `cardId`, not merged data. The owner-approved Delete action discards a revealed instance before collection; its serial is never reused. Keep/Delete require a durable write. Mixed decisions in multi-card packs persist their progress and collect only kept instances.

## 4. Serial numbers

- Format: `CBL-<playerCode>-<counter>` for example `CBL-7K3F-000142`.
- `playerCode`: 4 characters from `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, generated once on first run and saved. It keeps serials unique across different players' saves once a market exists.
- `counter`: 6 digits, increments per pulled instance, saved with the game. Never reused, never reset.
- All formatting lives in `src/core/serial.js` so it is easy to change.

## 5. Currency

- Name and symbol come from `config.currency`: Credits, displayed with `$`.
- Starts at 0. Every newly opened pack pays `config.currency.packOpenReward` (**$200**) at charge completion, in the same durable write that consumes the pack and reserves its results. Cancelled holds and failed commits pay nothing. Reload/replay and Keep/Delete never pay again. No backfill is applied to old saved openings.
- The balance counts up while silver coins fly from the pack to the counter. Reduced motion uses a static reward receipt and count-up. No market or new spending UI is introduced.

## 6. Duplicates

Duplicates stack visually ("x3") in the inventory. No selling or converting in v1.

## 7. Save data

Storage: `localStorage`, main key `config.storage.key`, JSON, versioned. Stage 11b keeps one durable previous snapshot under `<key>.backup`; corrupt recovery remains under `<key>.corrupt`.

```json
{
  "schemaVersion": 2,
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
  "settings": { "settingsVersion": 1, "motion": "auto", "quality": "high", "dots": "on", "cursorGlow": true, "idleFade": "2.5", "rarityColor": "color", "tilt": "normal", "revealSpeed": "normal", "serialOnFront": true, "openKey": "space", "cutAssist": "normal", "keyHints": true, "volume": 70, "muted": false, "nudgeDismissed": false },
  "stats": { "packsOpened": 0 },
  "inventoryUi": { "viewMode": "shelf", "sortMode": "catalog", "groupMode": "none", "showUnowned": true, "activeCollectionId": "all", "lastSelectedCardId": null, "pendingFocusCardId": null, "favorites": [], "collections": [], "customOrders": { "all": [], "favorites": [] } }
}
```

Robustness:
- Wrap all storage access in try/catch. If storage is unavailable, run in memory and show a small quiet notice.
- If the save fails to parse, keep a copy under `<key>.corrupt`, then start fresh.
- `save.schemaVersion` drives migrations in `src/core/state.js`.
- Data exports use `{app, schemaVersion, exportedAt, save, checksum}`. Import validates before preview, backs up before committing, and replaces through `save:replaced` without reloading. See 11-SETTINGS section 6 for confirmations and Undo.
- Reset preserves normalized settings. A failed backup or durable replacement blocks the action; ordinary settings and tutorial saves retain the session fallback.
- Save on every meaningful change (pack consumed, Keep pressed, tutorial step), not on a timer.

## 8. Browser title and favicon

- While refilling, show the real countdown to the next pack and its remaining percentage, for example `Cardable · 1h 59m · 100%`, even if some packs are already stored. Update quietly once per second, writing the title only when its text changes. Remaining percentage counts down to zero. Once a pack arrives, show `Cardable · pack ready` until a pack is opened or the tab returns to the foreground; then resume the next refill countdown. At the four-pack cap the title stays `Cardable · pack ready`.
- Favicon is the logo mark as an inline SVG data URI (no file needed).

## 9. Dev tools (`?dev=1` in the URL)

Needed to test 0.005 % rarities. Available only when `?dev=1`: a tiny mono panel (bottom-left) with: force next pull tier, grant packs, skip the timer, reset save, replay tutorial, toggle `rarityColorMode`, show FPS. Never visible without the flag.

## 10. Out of scope for v1

Market, trading, variants, music and sound, mobile/touch layouts, accounts, cloud saves.
