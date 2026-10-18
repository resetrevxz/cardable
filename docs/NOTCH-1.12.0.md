# The notch (1.12.0)

The owner's brief: a dynamic notch on the top bar that shows what is happening in the market, including the value of current cards, high-price sales and anything interesting; it should appear even when the Market is closed; it should have icons and cover the player's own listings, auctions, bids, what is good, what fell and what rose; the player should set the priority; and it should show how much money there is to spend with quick options such as bidding higher, things the player is looking for, and more, and look really good. This page records how it is built, the decisions, what was checked, and what was not. The rules live in Designs section 12 ("The notch").

## Shape

| Piece | File | Job |
|---|---|---|
| Feed | `src/market/notch.js` | Pure. A snapshot of the player's market life and their settings in, an ordered list of items out. Raise-bid options. |
| Reader | `src/market/sim/provider.js` `notch()` | Big sales, price movers among the cards held, matches for the wishlist, alerts and watched listings, rare listings that just appeared. Read-only. |
| Pill, panel, peek | `src/ui/market/island.js` | Two copies of one pill (header, main menu), the panel, quick actions, peek, throttled refresh. |
| Customize | `src/ui/market/notch-settings.js` | Mode, switches, ordered list (drag, arrows, Alt + arrows). |
| Look | `src/ui/kit/components/market-notch.css` | Pill, layer, peek, panel, rows, sheet; calm rules. |
| Choices | `src/data/market-settings.js`, `src/market/store.js` | Six `marketNotch*` settings; pins, hidden items and the day's opening net worth in the Market's own record. |
| Tuning | `src/data/market-sim.js` `notch` | What counts as a big sale (top 5% of three days, or Legendary and above) and a rare find. |

## Decisions

- **One component, two places.** The same pill and panel work inside the Market (popover in the Market frame) and on the main menu (popover in a fixed layer). Copy of the Market's resets and tokens is scoped to the layer so nothing depends on the Market being built.
- **The order is the priority.** The player's order of seventeen kinds decides what the pill says first; urgency decides inside a kind; pins beat both. Quiet, Calm and Busy decide which kinds may speak at all. Three ambient kinds (cards' value, Credits to spend, the clock) fill the quiet; if the player hides everything the pill says a plain "Local".
- **Quick options never skip the review.** Raising a bid and buying a deal open the same `ui.sim.confirm` with the exact numbers; the options come from `raiseOptions()`, which never offers less than the minimum next bid or more than the player's held maximum plus free Credits. The one exception is the existing Large trades only setting, which already lets a small trade run directly and says so afterwards.
- **No new idle loop.** The pill repaints on simulator updates (at most once a second), store changes, settlements and settings changes; the snapshot is read at most every 2.4 s; rotation advances on those updates; the only timer is the six-second life of a peek. While the menu's chrome is faded for idleness or the page is hidden, nothing is read.
- **It never creates or changes a world.** The reader and activity calls are guarded by "a Local world exists". The notch loads the saved world at start so the market can move on the main menu, and `src/market/sim/game.js` now holds the clock while a pack is opening, Studio or a tutorial is open, or setup or recovery is pending, so a settlement cannot meet another change to the save.
- **Quiet by default for newcomers.** Before the Market has ever been opened the notch is not on the main menu.

## Found on the way

- The I and Up Arrow keys opened the inventory behind the Market, and behind any dialog, since the inventory key handler never looked at either. Fixed in `src/ui/inventory.js`; the Customize sheet's Alt + Up reordering exposed it.
- Rebuilding the open panel on every update dropped keyboard focus. The panel now repaints only when what it says changed, and keeps focus on the same control (or inside the panel when its control disappeared).

## Checks actually run

- `tests/market-notch.test.cjs`: 14 node tests of the feed (order, modes, hiding, pins and snoozes, quick bids within limits, deals, rare finds, movers, determinism, defaults matching the settings).
- `tests/market-sim-provider.test.cjs`: the reader's shapes against a real simulated world.
- `tools/check-market-notch-browser.cjs`: ten steps, real mouse and keyboard, headless (appears only after the Market exists and the timer makes room; spending matches the wallet; bids show Bid higher; a quick bid opens the review, changes nothing until confirmed, then raises the maximum; a peek appears and Escape dismisses it; Customize reorders by keyboard, hides a kind and changes mode; pin, hide and Reset; the settings and Off; Reduced motion; small and phone sizes). Run three times in a row without a failure.
- The existing Market checks and the full battery, updated where selectors moved on purpose.

## Not verified

- A real mouse and eyes at 60 fps on real hardware, and the drag-to-reorder gesture by hand (the keyboard path is checked; the pointer drag uses the browser's drag events and was not driven).
- A screen reader. The pill is a button with `aria-expanded` and a live region for loud items; nobody used it with assistive technology.
- A long session: the market moving on the main menu for hours, and Global with a live account (the notch reads Global through the same calls the Market uses, and the Global checks pass, but a connected account's notch was not watched).
- Whether the defaults feel right to a new player (Calm; seven-second rotation; six-second peek).
