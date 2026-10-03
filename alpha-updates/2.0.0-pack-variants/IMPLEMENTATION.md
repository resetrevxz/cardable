# Pack variants implementation

## Contracts

`Cardable.packs.typeAt(n)` resolves a positive lifetime opening number. Enabled cadence definitions match multiples of `every`; priority wins, and data order breaks ties. Standard has null cadence. `upcoming(count)` returns definition objects after saved `packs.openedCount`; a dev-only one-shot override changes only the first entry. `packs:queueChanged` carries `openedCount`, `types`, `reason` and `forced`. Successful commit advances before emitting; canceled holds and failed writes do not.

Save schema 4 migrates from `stats.packsOpened` without recounting pending reveals. Owned legacy cards become Standard, pending legacy cards inherit their committed pack. `packId` remains on every instance. `packs.introSeen` records shown introductions. Export/import, backup, Restore and Undo use the existing full-save format.

Pool filters intersect. Inclusive numeric tier bounds, exact catalog brand/generation IDs and card ID lists apply before weights. Empty-tier downgrade stays within that filtered pool; unsatisfiable pools fail before stock/reward commit. Forced cards and tiers obey the same boundary. Variant multipliers scale only the existing independent gate; selection is unchanged.

## Presentation

`Cardable.packSkins.register` accepts idle/waiting/wrapper decorators, fluid/leak/cut tint values, a counter thumbnail renderer and a quality updater. Renderers receive the shared element and definition; quality receives element, pose, shared visual time, static/reduced flag and private per-material state. Existing silhouette and geometry remain shared. Standard decoration adds no visual changes.

Rare uses sapphire lacquer, chrome seals, highlight-masked facet embossing and clearcoat. High sweeps about every six seconds; Medium sweeps once per appearance; Low has a static gradient; Very Low is flat. Finish/reflection controls cap material detail; animation policy and reduced motion cap movement. Card monochrome mode governs cards and rarity effects; Rare packs retain their approved blue.

Counter fills continue to mean stock/refill progress. Markers are keyed to lifetime opening positions and retain their springs as the queue advances; replacement uses fades. Compact/expanded card tags read the selected instance, without splitting stacks by pack source.

## Developer behavior

Pack selection drives preview/odds only. Grants add shared stock. Force next is session-only and consumed by a successful opening; every opening still advances the lifetime schedule once. Editing openedCount leaves historical stats intact. The manual check is available only in the existing dev loader and never joins an automatic or legacy test run.

## Validation

PASS: manual check ran once in 6.76 ms (100 schedule positions, 3,000 seeded Rare pulls, schema-3 count migration). One headed file:// dev-sandbox session confirmed the R+ marker and Rare waiting/ready materials using DOM/computed styles, then completed a normal three-second Standard hold, tear, Legendary reveal and Keep. Exactly one kept Standard instance, one lifetime/stat increment, one stock consumption and $200 reward; zero console errors or network requests. No old suites, new test files, screenshots or profiling. Artistic appearance and a full graphics/recovery matrix were not separately tested.
