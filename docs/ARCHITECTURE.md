# ARCHITECTURE

## 2.1.0 brand pack extension

`src/data/brand-packs.js` appends four roster-limited pools and `randomChance` metadata. `core/packs.typeAt(n, optionalSave)` gives cadence priority, then hashes existing immutable save identity and opening number for weighted random entries. Four 1.25% outcomes give a combined 5% chance in normal slots. Standard is the fallback; the first two openings stay Standard. Commit resolves against its candidate save; no card RNG or new save field is used. Schema remains 4.

`ui/brand-pack-skins.js` registers four skins with the existing API. Logo sources belong to design data and are bundled under `assets/packs/`; markup displays them generically. `pack-skin-layer` marks removable decoration. The queue and tags project scheduled type and actual instance provenance. `pack.js` owns the preview turn; `opening.js` owns the post-Keep card/back/wrapper turn inside collecting. Both use the shared scheduler and fade equivalents. See `alpha-updates/2.1.0-brand-packs/IMPLEMENTATION.md`.

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
      settings-schema.js validated settings defaults, descriptors and root application hooks
      font-licenses.js  bundled offline font credits/licenses
    core/
      namespace.js      creates window.Cardable and registries (load first)
      events.js         tiny event bus
      state.js          save/load/migrate, autosave on change
      settings.js       settings API and resolved live effect policies (after state)
      save-files.js     legacy raw JSON and offline Blob downloads
      save-tools.js     checksum envelopes, backup, durable replacement and Undo
      inventory-model.js  schema-3 stack preferences, favorites, collections, safe mutations (before state)
      collection.js     ownership projection
      inventory-query.js  parsing, generated facets, filters, stable sorts and groups
      timers.js         pack timer (tick/progress/open)
      pull.js           weighted pull, emptyTierPolicy
      serial.js         serial generation and format
      input.js          Space hold, pointer, keyboard abstraction
    fx/
      springs.js        spring utility
      dots.js           dot grid canvas
      cursor.js         cursor glow
      particles.js      small shared particle helper
      refraction-intro.js  cached glass/gel material painter (before rarity-intro)
      gilded-intro.js    molten-gold/crystal painter and static backplate (before rarity-intro)
      mythical-scene.js  private bounded WebGL2 cave/water scene (no private clock)
      mythical-intro.js  ruby clock ritual, Canvas fallback and living backplate
      rarity-intro.js    shared-clock intro controller and optional retained background
    finishes/
      index.js          registry helpers
      basic.js … limited.js   one file per rarity finish
    ui/
      menu.js  pack.js  opening.js  card.js  card-specs.js
      inventory.js  detail.js  tutorial.js  toast.js  logo.js
      inventory-icons.js  inventory-toolbar.js  inventory-shelf.js  inventory-grid.js
      inventory-reorder.js  inventory-transition.js  (before inventory controller)
      settings-controls.js  reusable switches, segments and confirmation controls
      settings-data.js  Data drop zone, preview, progress, hold and Undo toast
      preferences.js    settings modal, sole full preview and compatibility context events
    styles/
      tokens.css  base.css  glass.css  card.css  pack.css  menu.css  inventory.css
      inventory-controls.css  inventory-views.css (after inventory.css)
      settings.css      settings controls and live quality/motion policies (loaded last)
```

Script order in `index.html`: `namespace.js`, `config.js`, data files, `core/*`, `fx/*`, `finishes/*`, `ui/*`, then `boot.js`, which defines `C.boot`. A final inline query gate invokes boot directly for ordinary play; `dev=1` first loads local `src/dev/loader.js`.

Inventory dependencies: events → inventory-model → state; collection → inventory-query; card/pack-markup/accessibility → inventory-icons/shelf/grid/toolbar/reorder/transition → inventory controller → detail → boot definition → query gate. The HTML is the executable classic-script order. No runtime imports or fetches.

Settings dependencies: settings-schema before state; settings after state and before the effects loop; settings-controls before preferences. Boot loads the save, then initializes settings before input/effects/UI. Schema 2 retains game progress and stores normalized settingsVersion 1. Old reducedMotion/rarityColorMode fields migrate to motion/rarityColor. Runtime root attributes and the resolved reduced-motion class agree, including an explicit Off override of the OS preference.

`C.settings.get/set/onChange/resetToDefaults` owns settings persistence. `onChange` returns an unsubscribe function. Effective quality, tilt, dot, cut and reveal policies leave registry data/config values unchanged. `settings:changed {key,value}`, `settings:open/close` and `save:replaced` coordinate live application; `settings:persisted {saved}` distinguishes durable storage from the session fallback. The compatibility preferences context blocks input/inventory/detail interaction. The modal owns the only full card and restores surviving focus on close.

Data dependencies: state/settings/save-files → save-tools; settings-controls → settings-data → preferences; embedded Data checks in the conditional developer loader. `C.saveTools` owns checked exports, import preview parsing, durable backup-before-commit replacement, restore and timed Undo. Its injectable `create(adapter)` supports isolated checks without touching player storage. `save:replaced` bridges existing reset/imported cleanup and recovery listeners, so opening, inventory, tutorial, timer/title, currency and settings re-read the adopted state. `data:changed` refreshes backup/Undo presentation. File reading, confirmations, progress and toast motion use the existing lifecycle/shared scheduler; no network or reload is involved.

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

## 5. Conditional developer workspace (1.3.0)

All tools, styles, galleries, simulations and embedded checks live in `src/dev/`. The only normal-page developer gate is the small inline `dev=1` check in `index.html`. Its loader injects local classic scripts sequentially: runtime, shell, saves, simulations, previews, tools, fun, check runner, then the four existing check suites. Only after loading does `C.dev.prepare()` select storage, clock and transient policies and call `C.boot()`. Ordinary play never creates `C.dev`, loads developer CSS, creates diagnostics, or runs checks.

- `C.uiKit.create(descriptor, parent, binding)` is shared by Settings and the workspace. Bindings provide `get(key)`, `set(key, value)` and optional `subscribe(key, callback)` returning cleanup. Switches, segments, sliders, selects, text/number inputs and `confirmation(button, action, {mode})` share behavior. Confirmation time uses real `performance.now()`; a hold always takes three real seconds.
- `C.dev.register({id, group, label, aliases, type, run/get/set, danger, hotkey, helper, choices, min, max, step, available, unavailable, render})` supplies tabs, rendering, palette entries and Alt shortcuts. It returns an unregister function. Custom render hooks receive a scope with shared controls, cleanup and frame subscriptions; returning a cleanup function is supported. Do not register prohibited game keys.
- `C.state.setStorageContext(key)` selects independent caches/recovery state. Save tools derive backup keys at use time and isolate Undo by context. Sandbox uses `cardable.save.dev-sandbox`, starts fresh, and resumes its own durable save. Its `.workspace` sidecar retains virtual clock/cap/quality/preview metadata. Five named snapshots and UI preferences are separate storage records. Context switching cancels jobs and previews, restores transient policy, then loads the other save. Developer mutations clone, validate strictly, preserve the real `.dev-session-backup` before the first write and adopt only after durable commit. Backup/commit failure adopts nothing.
- `C.clock.now()` is virtual wall time only when developer mode is loaded; timers and tag age use it. `C.state.encode(candidate)` normalizes developer stock/timer/acquisition timestamps when serializing the real context. Temporary over-cap stock and graphics overrides never become ordinary settings. Explicit balance, acquisition-date, serial and ownership edits are durable actions. `C.settings.override/clearOverrides` apply transient values; `withPolicy/policyFor` provide scoped local render policy.
- `C.pull.probabilities(pack, options)` supplies the normalized distribution for `createSampler` and real `pullCard`. Tier luck ramps by rank from ×1 to ×factor; finish chance is capped at 100%. Explicit pull options replace legacy developer dependencies. `opening:resolve`, `opening:prepareCommit` and `opening:committed` preserve successful-commit one-shot forcing and session statistics. `opening.openNow/finishCut/keepCurrent` retain reserve/reward/pendingReveal/Keep/Delete contracts. `C.presentation.openingRate` shortens frenzy presentation independently of confirmation holds.
- Card previews use `C.cardView.create(..., {independent:true, quality})`, with card-local policy, tilt/lamp and manual scoped updates. Developer replay creates pure presentation fixtures and never calls opening commit, allocates gameplay serials, consumes stock or awards currency. Galleries discover cards, tiers, finishes and preview states from the live catalog/registries. `gallery=1` aliases tiers only inside `dev=1`.
- Closing detaches the developer frame subscriber and destroys preview cards, cancels chunks/stress/recording/event capture and restores any immersive mode. Optional FPS listens to existing frame events without waking the game. Simulations yield after eight milliseconds; telemetry refreshes at 500 ms. No checks execute at startup. Checks run only from the existing logic-check button in an isolated context, restoring state and overrides in `finally`.

The catalog currently supports one `variantId` per instance, finish-stack favorites, no combo definitions and no score resolver. Multiple-finish/combo commands are unavailable until compatible catalog and runtime capabilities exist. First-pull/first-variant flags are preview metadata only. The original developer panel, gallery, profiler and dependent historical command-line harnesses are preserved under `archive/dev-menu-legacy/`; historical reports remain in docs.

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

## Stage 12 — Permanent variants and stack identities

The variant data and core stack/roll helpers load before inventory-model/state; material bindings load before card views. Card Tags load after pack-markup and before opening/inventory/detail. Save schema 3 adds immutable per-instance variantId, migrates legacy preferences to normal stack keys and keeps settingsVersion 1. Inventory entries and handoff/selection events carry stackKey alongside base cardId, and acquisition handoffs carry instanceId. Named collection membership uses stackKeys. See VARIANTS-AND-TAGS.md for complete current contracts and material extension rules; earlier GPU-only inventory references above describe Stage 7.

## Stage 13 graphics policy

settings-schema.js settingsVersion 2 migrates saved high/medium/low profiles and initializes all independent effect controls. settings.js resolves cached policy before emitting changes; applyPreset writes atomically. fx/loop.js paces one shared RAF with carried deadlines, handles visibility/focus, and reports actual frame gaps and subscriber JS duration. timers.js stops its interval in hidden sleep and reconciles on return. ui/performance.js never creates its own animation loop. graphics.css consumes independent data attributes. Card materials mount lazily; card-thumbnail.js creates front-only inventory views and inventoryTiles promotes on detail entry, then restores a fresh thumbnail. Procedural art templates use a bounded 96-entry cache and images use local thumbnail assets. Particle pools allocate on demand and shrink when lowered.


## 2.0.0 Pack schedule and skin registry

Pack definitions now include priority/cadence, pool filters, tier and variant multipliers, skin, counter style and copy. The core pack service resolves lifetime positions and upcoming definition objects. Save schema 4 stores packs.openedCount, packs.introSeen and immutable instance packId. The skin registry decorates existing idle/waiting/foil geometry; material quality uses the shared visual clock. Adding a type requires one complete data definition and optionally a registered skin. Dev preview selection is separate from one-shot next-pack forcing.

## 2.2.0 Classic pack, card skins and opening strategies

`src/data/classic-pack.js` declares the Classic pack, explicit pre-2007 catalog IDs and registered permanent card skins. The existing scheduler assigns its separate 5% interval to ordinary slots, after branded packs' combined 5%; cadence and the first tutorial openings retain precedence. Era weighting lives in the production pull table, alongside tier weighting and variant-kind exclusions. Modern weight defaults to `config.classicPack.modernCardWeight = 1` and has a dev registry editor.

Schema 5 adds nullable `cardSkinId` to instances. Ordinary card/finish keys keep their two-element tuple; a permanent skin adds a third registered element. `C.collection` projects those separate stacks while unique completion still counts GPU designs. Migrations, checksum imports, backups, Restore/Undo and pending-reveal recovery preserve the field without rerolling.

`C.cardSkins` decorates full cards and static thumbnails. `C.packOpenings` registers wrapper input strategies while the existing state machine retains stock consumption, the three-second hold, durable reservations and rarity cinematics. `C.packTransitions` supplies bounded vector snapshots, pixel quantization, ordered dithering and fragment motion for previews and collection handoffs. All controllers run from existing shared scheduler subscriptions and clean up their temporary nodes; they add no private clocks. See `alpha-updates/2.2.0-classic-pack/IMPLEMENTATION.md`.
