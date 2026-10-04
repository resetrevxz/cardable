# Implementation notes

## Data and scheduling

`src/data/classic-pack.js` registers one enabled pack, its card skin and an explicit list of fourteen catalog IDs released through 2006. Generation 1 is not used as an era: it also includes 2007 hardware. Existing card specifications and art are retained.

The existing identity-seeded scheduler adds Classic to the 5–10% interval on non-cadence slots; the branded interval stays 0–5%. Cadence wins first. Stock, refill time, hold duration, opening rewards and serial allocation are unchanged.

Pull tables filter before applying rarity weights. Secret is multiplied by four and normalized with the other eligible ordinary tiers. Era weights apply inside each tier, so a Classic GPU has three times the per-card selection weight of a modern GPU in the same tier. `config.classicPack.modernCardWeight` defaults to 1 and can be tuned from the dev registry. Zero excludes modern cards before the existing empty-tier policy. Limited remains unavailable under the catalog's existing rules. Variants with `kind:'frame'` are rejected by both normal and forced draws; unclassified existing finishes are surface coatings.

## Persistent cards

New Classic instances receive `cardSkinId:'classic'` in the initial durable pending-reveal commit. Schema 4→5 gives old instances a null skin without changing serials, ownership, finish, pack provenance or preferences. Import still verifies the original envelope checksum before migration. Keep, recovery, export/import, backups, Restore and Undo retain the instance field.

`C.stacks.key(cardId, variantId, cardSkinId)` preserves the existing two-element tuple for ordinary frames. A registered permanent skin appends a third element. Projection, favorites, custom collections, ordering and acquisition focus use that identity, preventing visually different frames from sharing a stack. Unique GPU completion still counts designs once.

`C.cardSkins` renders the same bezel in full cards and static thumbnails. Existing rarity backgrounds and surface coatings remain underneath; old border props are covered/replaced. Front tier LEDs and the terminal plate retain rarity identity. The engraved back receives the bezel without exposing the tier before the flip. Terminal fields use existing catalog values; unavailable values display a dash.

## Materials and input

Classic uses the pack skin registry. Plastic, bay, screws, vents and controls are CSS/vector primitives; seven-segment digits and the original pixel-chip badge are crisp SVG/CSS. There are no real case trademarks. `references/classic-border.png` was absent, so the monitor bezel follows the supplied description.

The shared material controller drives LEDs, display updates, charge progress, grille motion and gloss. High repeats the light pass every eight seconds; Medium gets one pass per appearance; Low/Very Low remain static. HDD updates use 600 ms steps, below 2 Hz. The focused full card's existing scheduler drives its cursor at no more than 1 Hz; thumbnails stay static. Hidden/AFK/material/reflection/animation policies apply without new private clocks or frame subscribers.

`C.packTransitions` registers `tornadoPixel`. It paints a bounded vector sample of the outgoing pack material, print and local logo, quantizes it through a small canvas, and moves fragments into a shrinking vortex. It never captures screens, reads canvas pixels or exports a raster. An ordered-dither mask reveals the incoming case. Medium shortens travel; Low uses a pixel fade; Very Low/reduced motion use fades. Preview changes and post-Keep arrivals use the same controller, with cleanup on cancellation and replacement.

`C.packOpenings` registers `pullTab`. It extends wrapper phases only, with pointer capture, resisted upward distance, stepped zig-zag perforation removal, bounded crinkles, snap at 85%, a flying strip and split case front. Enter and the existing accessible tear button use the shared tear action. Touch can drag the same tab through pointer events. Holds, commits, rarity cinematics, recovery and Keep remain in the existing state machine.

VT323 is bundled from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/vt323), with its SIL OFL in `assets/fonts/VT323-OFL.txt` and the offline license readout. The font exception applies only to Classic terminal plates. No runtime network assets, modules, audio, market or new Settings controls were added.
