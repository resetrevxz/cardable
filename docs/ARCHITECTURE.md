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
    styles/
      tokens.css  base.css  glass.css  card.css  pack.css  menu.css  inventory.css
```

Script order in `index.html`: `namespace.js`, `config.js`, data files, `core/*`, `fx/*`, `finishes/*`, `ui/*`, then a final `boot.js`.

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

## 5. Dev validation (runs at boot when `?dev=1`)

Warn (console plus a small panel) if: rarity chances do not sum to 100; a card references an unknown rarity or generation; duplicate ids; a rarity has no registered finish; a tier that is pullable has zero cards (and which policy applies).

## 6. Extension recipes

**Add a card:** append to `src/data/cards.js`. Done.
**Add a generation:** append to `Cardable.data.generations`, then add cards with that `generation`.
**Add a pack type:** append to `src/data/packs.js` (`tierWeightModifiers`, `cardsPerPack`, `design`); set `enabled: true`. Add its wrapper look in `pack.css` via `data-pack="<id>"`.
**Add a rarity:** see `docs/02-RARITIES.md` section 6.
**Add a finish or prop:** new file in `src/finishes/`, register it, add the script tag.
**Add a spec type on cards:** add a row to the formatter table in `src/ui/card-specs.js`.
**Add the market later:** register a screen, flip `config.flags.market`, and use the empty `#market-slot`. No core file needs to change; inventory instances already carry unique serials.
**Add sound later:** add `src/core/audio.js` behind `config.flags.audio` and subscribe to the events in section 4.
