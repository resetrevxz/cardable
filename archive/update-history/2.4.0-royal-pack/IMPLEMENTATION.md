# Royal Pack implementation

## Scheduling and pool

The owner's clarification is **5% on Rare packs**, implemented as a replacement draw on every fourth lifetime position. `replacesPackId` and `replacementChance` are data fields. The scheduler uses a separate `upgrade:<base id>` hash channel from the immutable save identity and position. It neither shifts ordinary pack intervals nor consumes card/finish RNG. It resolves from the candidate save at commit and keeps the existing queue event, override cancellation/failure and successful-clear semantics. Royal is therefore about 1.25% of all lifetime positions, with the first tutorial slots excluded as before.

`src/data/royal-pack.js` filters inclusive numeric tiers 7–11. Its empty modifiers preserve catalog weights; the production probability table yields the requested normalized distribution. Default luck is 1 and the variant multiplier is 1. Existing developer luck can intentionally change previews/pulls. Forced cards and tiers must pass the same pool. Empty-tier downgrade stays inside it; an empty minimum tier fails before the durable commit.

No new durable fields are needed. Existing `packId`, pending reservation, intro flags, immutable identity, `openedCount`, card skin and finish fields remain schema 5. Keep, imports, backups, Restore and Undo retain provenance. Stock, refill, three-second hold, reward, serial and recovery retain the existing transaction.

## Presentation

`royal-pack-skin.js` registers a skin and shared original crown/facet/carpet primitives. The gold triangles, central shading and specular facets follow the supplied gold reference; the red woven band interprets the carpet reference through original damask vector geometry, fine weave and bead/thread edges. The silhouette, crimp geometry and top-area cut remain shared. The crown is an original SVG, not a company emblem. Gold/red are confined to pack surfaces, its marker, actual-instance provenance and the holder; other chrome and card finishes keep existing color rules.

High moves pointer-linked highlights, a glint/sheen sweep every five seconds and capped dust. Medium gets one sweep per appearance and a static facet field; Low keeps subdued static facets; Very Low keeps a flat gold material with its identifying print/crown. Material/reflection and animation controls restrict decoration independently. Shared queue motion supplies the slow marker pulse and advancement. Hidden/AFK contexts sleep; reduced motion replaces travel and bursts with fades.

`royal-pack-effects.js` registers `goldShine` and `cutThenBox`. The arrival uses one bounded local shine and a gradient mask, cleaned on completion/replacement. Post-Keep uses the existing back turn followed by that same registry effect. Dissolution paints bounded floating triangles from the skin's original mesh, without screen capture or pixel reads. It omits particles on static policies.

The opening strategy declares `usesSharedCut`; the central state machine keeps its original press/drag guide, blade, upper-seal validation and keyboard tear. After the split it enters `boxWaiting`, then `boxOpening`. A real button becomes usable when its 900 ms rise ends; the quiet Click hint appears at 2,000 ms. Clicking it or the dedicated Enter action advances once. Settings/modal and hidden-state guards apply, and the lid/shine/light run locally for 1,100 ms. The actual reserved card stays unmounted until the box finishes.

If the reserved rarity has an opening descriptor, its existing intro, handoff, metadata/finish and Keep/Delete gates run. Otherwise the same card reveal controller uses the strategy's 3,000 ms rise with a local crown/glint decoration, then the brief flip and existing readiness gates. It uses card monochrome mode for that fallback decoration. Save replacement/reset and recovery remove temporary box/triangle/crown nodes. Recovery exposes the reserved front directly and grants nothing again.

`input:packActivate` routes Enter to an interactive wrapper step without rebinding hold/Keep controls. The existing single manual schedule check now treats Royal as an upgrade of a Rare slot; its isolated Rare samples and migration check remain unchanged. No new manual command or automatic check was introduced.

Initialization explicitly binds the strategy even when the cached next pack already matches. This also fixes initial Classic pull-tab binding. The app uses version 2.4.0; 2.3.0 is reserved for concurrent Secret cinematic work. This feature's checkpoint excludes that work and preserves the shared checkout and index.
