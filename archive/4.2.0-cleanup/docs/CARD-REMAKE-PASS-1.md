# Card remake — pass 1

Owner scope: remake all seven listed tiers, Basic through Double Super Rare. New pack types remain deferred. Keep the two-hour pack cadence and four-pack storage cap.

## Shipped design

- Full portrait artwork, machined material rim and neutral smoked glass information panel. Cardable identity, serial, full rarity name/code and generation at the top.
- Memory capacity/type plus available chip, clock, memory-bus and power specs. Visible spec labels are replaced by original SVG pictograms; accessible labels and hover titles remain. Shared/unified memory is not presented as dedicated VRAM. No hardware values are invented.
- Basic white/gray angle response; Common white orbit; Uncommon lime/forest angle response; Rare pale-blue upper sparkles; Super Rare ocean and static dark checker; Unusual purple/top-white breathing light; Double Super Rare blue checker/gold drift and rim sparkles.
- Cardable C/die logo on the back. Existing layer order, foil, beam, glare, tilt springs, shadow, serial stamp, flip and signature reveal shine remain. Lite backs display serials immediately. Thumbnails retain static rims; only the focused full card animates.
- Delete beside Keep, with the same reveal gate and held-key protection. Delete saves before fading out, preserves the pack reward, and does not create an inventory flight. Future multi-card packs persist mixed decisions and collect only kept instances. Failed writes leave both actions available for retry.
- $200 per successfully committed pack opening, in the same write as the consumed pack and reserved result. No rewards on cancel, failed save, recovery, replay or card decision. A silver coin flight travels from the pack toward the briefly visible counter; reduced motion shows the reward without flight.
- Removed the GPU-card count, “Digital sealed pack” and “Offline collection system” print from menu, charge shell and cut fragments.

## Artwork and scope

The existing `assets/cards` photos cover Basic, Common and Uncommon cards. Rare through Double Super Rare have no matching supplied image files and retain original procedural GPU illustrations, now composed for a portrait card. These are illustrations rather than model-specific photographs. The remaining fronts and props are deferred to pass 2. The first seven tiers add no props. Existing rarity weights remain unchanged and retain the project's normalization rule. Market data is not consumed.

## Verification

Focused checks cover seven material/layout contracts, reward atomicity, quota failure/retry, no reward replay after reload, Delete and mixed decisions, held-key guards, static backs, flight cleanup and reduced motion. Existing card, finish, opening, reveal and flip checks are included in the final isolated snapshot verification.

Final isolated snapshot: **121 behavior groups passed** (13 card, 14 finish, 18 menu/currency, 26 opening, 24 reveal/collection, 19 flip/inventory regression, 7 remake/reward/decision). **9 real-browser groups passed**. The two existing spec/sparkle assertions and currency-format assertions were updated for the requested four-spec face, rim sparkles and `$` symbol. The checkpoint excludes concurrent settings, currency-widget and cutting changes in the shared checkout.

Real Chromium opens the game directly with `file://`. Browser checks cover seven faces/back, full portrait inset geometry, Shared/unified memory at compact size, live Common/Super Rare/Double Super Rare materials, sole full card, mono/reduced motion, real keyboard opening, Keep/Delete, recovery, one reward per pack, and actions remaining visible at 1280×720, 390×844 and 844×390. No application exceptions or HTTP requests were observed. Screenshots and browser evidence are in `D:/CardableV2/outputs/card-remake`.

Visual review: the upper artwork was competing with the rarity labels, so the top scrim was deepened. The glass panel remains inside the inner frame and uses a two-column icon grid. The short-window reveal is raised enough to keep both buttons visible. Static backs were corrected to show the serial immediately. Glass blur is limited to the focused card; static faces use the same layered glass tint without a live backdrop filter.

Browser verification demonstrates rendering and behavior, not a guaranteed 60 FPS on the user's hardware. The test fixture does not alter saved card records or normal pack odds.

A separate 3-second headless sample at 1440×1000, with a 430px-wide Double Super Rare card, measured **57.0 FPS**, median frame interval **16.7ms**, p95 **33.2ms**. The static portrait comparison measured **60.0 FPS**. The baseline has an off-screen gallery focus and no visible live finish. These are short headless measurements rather than a hardware guarantee. Evidence is stored in `CARD-REMAKE-PASS-1-EVIDENCE.json`.

## Assumptions

Credits remains the currency name, now displayed with `$`. Delete discards the just-revealed instance before collection; it does not delete an existing inventory stack. The reward remains earned after Delete. Old saved pending packs are resumed without a retroactive award.

## Entry points

`src/styles/card-remake.css` owns the new layout; `rarities.frontDesign` chooses it. `card-specs.frontRows` chooses the presentation limit. `pack-reward.js` listens to `pack:reward` after the durable opening commit and uses the shared frame loop. `pendingReveal.discardedInstanceIds` is optional, validated save data for multi-card decisions. The earlier `keptCount` field now represents the number of resolved decisions for compatibility.
