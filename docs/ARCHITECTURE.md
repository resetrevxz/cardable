# ARCHITECTURE

Goal: adding a card, rarity, pack, generation or finish never requires touching UI code.

## 1. Constraints

- Runs from `index.html` by double-click (file://). **Classic scripts only**, no ES modules and no build step.
- One global namespace: `window.Cardable`. Each file is an IIFE: `(function (C) { ... })(window.Cardable);`
- No network at runtime. Optional libraries (for example `vendor/gsap.min.js`) are local files; prefer plain CSS, the Web Animations API and canvas, and use a library only where it clearly helps.
- localStorage on file:// works in most browsers but is tied to the file location, which is why export/import of saves is planned (Stage 8).

## 2. File tree

```
cardable/
  index.html
  AGENTS.md
  Designs.MD
  docs/                 specs (this folder)
  references/           images + README.md
  assets/fonts/         Inter, JetBrains Mono (woff2)
  vendor/               optional local libraries
  src/
    config.js           all tunable numbers and flags
    data/
      rarities.js       tiers, chances, reveal params, design text
      cards.js          generations + cards
      packs.js          pack types
    core/
      namespace.js      creates window.Cardable and registries (load first)
      events.js         tiny event bus
      state.js          save/load/migrate, autosave on change
      inventory-model.js  schema-2 preferences, favorites, collections, safe mutations (before state)
      collection.js     ownership projection and dev fixtures
      inventory-query.js  parsing, generated facets, filters, stable sorts and groups
      inventory-checks.js isolated dev regressions (after UI modules)
      timers.js         pack timer (tick/progress/open)
      pull.js           weighted pull, emptyTierPolicy
      serial.js         serial generation and format
      input.js          Space hold, pointer, keyboard abstraction
      dev.js            ?dev=1 tools + data validation
    fx/
      springs.js        spring utility
      dots.js           dot grid canvas
      cursor.js         cursor glow
      particles.js      small shared particle helper
    finishes/
      index.js          registry helpers
      basic.js … limited.js   one file per rarity finish
    ui/
      menu.js  pack.js  opening.js  card.js  card-specs.js
      inventory.js  detail.js  tutorial.js  toast.js  logo.js
      inventory-icons.js  inventory-toolbar.js  inventory-shelf.js  inventory-grid.js
      inventory-reorder.js  inventory-transition.js  (before inventory controller)
    styles/
      tokens.css  base.css  glass.css  card.css  pack.css  menu.css  inventory.css
      inventory-controls.css  inventory-views.css (after inventory.css)
```

Script order in `index.html`: `namespace.js`, `config.js`, data files, `core/*`, `fx/*`, `finishes/*`, `ui/*`, then a final `boot.js`.

Inventory dependencies: events → inventory-model → state; collection → inventory-query; card/pack-markup/accessibility → inventory-icons/shelf/grid/toolbar/reorder/transition → inventory controller → detail → inventory-checks → boot. The HTML is the executable classic-script order. No runtime imports or fetches.

## 3. Registries

`Cardable.data.{rarities, cards, generations, packs}` are plain arrays. Lookups go through helpers so nothing scans arrays in hot paths:

```js
C.rarity('sr')            // by id
C.card('gen1-basic-01')   // by id
C.pack('standard')
C.finishes.register(id, { mount(el, card), update(dt, pointer), destroy(), lite(card) })
C.screens.register(id, { open(), close() })   // future market lives here, behind config.flags.market
```

## 4. Events (`Cardable.events.on/emit`)

`pack:ready`, `pack:opened`, `charge:start`, `charge:progress` (0-1), `charge:end`, `charge:complete`, `cut:progress`, `cut:complete`, `reveal:phase` (name), `card:revealed`, `card:kept`, `inventory:open`, `inventory:close`, `tutorial:step`, `currency:changed`, `save:written`. UI modules talk through events, never by calling each other directly.

Inventory also emits `inventory:selection {cardId}`, `inventory:modelChanged {shown,total}`, `inventory:preferencesChanged`, `inventory:collectionsChanged`, `inventory:viewChanged`, `inventory:dragContext`, `inventory:handoffSource {cardId,rect}` and `inventory:handoffTarget {cardId,rect}`, `inventory:handoffComplete {cardId}`. Detail integrates through detailOpen/detailReturned/returnTarget/detailNavigate/detailMembership events. View modules share the controller's query result, not separate ownership stores.

Schema 2 stores `inventoryUi` preferences separately from owned instances: view/sort/group, Show Unowned, active collection, last/pending card focus, favorite IDs, named collections of card IDs, and per-collection customOrders. Schema 1 migration preserves ownership and pending reveals. Query/session state and presentation rectangles are never saved. New catalog entries append in projection; saved order arrays are not rewritten just for catalog growth. Card records explicitly provide `brand` and `type: 'gpu'` for generated facets.

## 5. Dev validation (runs at boot when `?dev=1`)

Warn (console plus a small panel) if: rarity chances do not sum to 100; a card references an unknown rarity or generation; duplicate ids; a rarity has no registered finish; a tier that is pullable has zero cards (and which policy applies).

## 6. Extension recipes

**Add a card:** append to `src/data/cards.js`. Done.
**Add a generation:** append to `Cardable.data.generations`, then add cards with that `generation`.
**Add a pack type:** append to `src/data/packs.js` (`tierWeightModifiers`, `cardsPerPack`, `design`); set `enabled: true`. Wrapper parameters belong in `design`: material, wrapper, graphic, roughness, foilStrength, refraction, emboss, subtitle, series, batch, microprint and security. Register a graphic's SVG paths in `data.packGraphics`. Shared renderer code has no pack-id branches. No additional pack types or selector were introduced by the idle-pack refresh.
**Add a rarity:** see `docs/02-RARITIES.md` section 6.
**Add a finish or prop:** new file in `src/finishes/`, register it, add the script tag.
**Add a spec type on cards:** add a row to the formatter table in `src/ui/card-specs.js`.
**Add the market later:** register a screen, flip `config.flags.market`, and use the empty `#market-slot`. No core file needs to change; inventory instances already carry unique serials.
**Add sound later:** add `src/core/audio.js` behind `config.flags.audio` and subscribe to the events in section 4.

## 7. Sealed pack presentation

- `ui/pack-markup.js` builds the same seal/body/print regions for menu, charge shell and cut fragments. The wrapper silhouette is shared in `pack.css`. The static local laminate texture contains subtle brushing; specular light, film, printed relief and fluid remain separate layers.
- `ui/pack-material.js` caches lamp tokens and derives specular position, film offsets and relief from the same lamp/pointer-normal relationship used in `card.js`. Idle glint changes only a dedicated layer's opacity; gestures update the normal at display rate.
- `ui/pack-interaction.js` owns bounded pointer capture, spring translation/tilt/lift, a 34 ms card-mass lag, inspection and cancellation. It has no timer, pull or save writes. Pointer press grabs the wrapper; Space and the separate hold action still charge the established opening sequence. V or right-click toggles inspection; Escape exits.
- `ui/pack-fluid.js` renders timestamp progress and springs a gravity-relative surface angle and restrained acceleration-driven wave. The laminate carries a faint transmitted print image beneath the liquid boundary. This is a lightweight optical approximation, not ray tracing or a fluid solver.
- `ui/pack.js` coordinates these controllers in its existing shared-loop subscription, maintains timer/stock presentation, and exposes an ephemeral pose snapshot for opening. Hidden/reveal/inventory contexts pause it. Detailed updates skip an unavailable rear pack.
- `ui/opening.js` captures the idle pose before activating the opening context, then eases that pose into its existing charge stage. Commit, cancellation, pendingReveal and tear geometry retain their existing contracts.
- Reduced motion retains silver material and timestamp fill, with no drag translation, tilt, overshoot or slosh. No save schema or gameplay changes belong to this presentation layer.
