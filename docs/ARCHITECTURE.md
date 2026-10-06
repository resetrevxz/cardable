# Architecture — browser and desktop

The game remains an offline classic-script renderer under `window.Cardable`. Browser play opens `index.html` directly through file:// with no bundler/server. Electron wraps the same renderer; only packaging/development uses Node. Keep source data, gameplay transactions and presentation independent. No runtime CDN/fetch/import, market or audio is introduced.

## Runtime routes and ordering

| Route | Owner / responsibility |
|---|---|
| `index.html`, `src/boot.js` | Executable classic-script order; ordinary boot follows `C.desktop.prepare()` and handles startup failure. `?dev=1` conditionally loads the local workspace before boot; never ordinary dev UI. |
| `src/data/` | Cards/generations/rarities/variants, packs and cutscene descriptors, validated settings, achievements, Journal and bundled player help. Registry helpers resolve IDs. |
| `src/core/` | Event bus, serial/pull/schedule, state/save tools, settings, input, inventory model/query, Journal/achievement projection and desktop/QoL integration. |
| `src/fx/`, `src/finishes/` | Shared effects scheduler, springs, bounded material painters, registered cutscene runtime/safety and rarity finishes; no private frame loop. |
| `src/ui/`, `src/styles/` | Pack/opening/menu, front thumbnails, sole full detail/preview, inventory panels, settings/Data/help/palette and neutral token-based UI. |
| `src/studio/` | Inspect camera/renderer/materials, scenes/props/lights/Director, photo capture and IndexedDB Album. JSON saves do not include photo blobs. |
| `electron/main.js`, `windows/`, `native/` | App lifecycle, persisted native window, Mini/taskbar/tray, narrow support/capture services and graceful close. |
| `electron/preload.js`, `ipc/` | Named secure native bridge, channel registry, exact main-document sender checks and bounded arguments. |
| `electron/logging/`, `updater/`, `discord/` | Rotating local logs, installed-app automatic updates with a save gate, retained manual modes and optional local Discord IPC; configuration is external. |
| package/lock/builder, `.github/`, `tools/` | Locked development dependencies, offline Windows x64 NSIS/dir packaging, paired release assets and transactional local delivery. |

Namespace/config and presentation/gameplay data precede state. Variants/stack helpers and settings schema precede save normalization; state/settings precede effects/input/UI. Collection precedes query; inventory icons/shelf/grid/toolbar/reorder/transition precede controller/detail. Save files/tools precede Data UI/preferences. Card/pack markup and accessibility precede dependent UI. Cutscene factories/descriptors load before reveal dispatch. `boot.js` defines boot last; the inline gate chooses ordinary or developer startup. Consult HTML order rather than introducing module imports.

## State, persistence and recovery

Current game save schema is **5**, settingsVersion is **2**, primary key is **cardable.save**. Older schema numbers in the extension history below describe evolution, not permission to bump/reset the current schema. Inventory/preferences use GPU/finish/optional skin stack keys; ownership remains immutable instances. Journal, achievements, desktop preferences and additive optional fields survive loader normalization, checksum imports, backups, Restore and Undo. Never mint unchosen Picker offers or assume `pendingReveal.cards[0]` exists.

Opening clones a candidate, reconciles timestamps and durably commits stock, exact pulls/serials, reward and `pendingReveal` before adoption. Keep/Delete and Picker decisions remain strict; a failed write cannot consume, reroll or duplicate a reward. Presentation and event-bus consumers do not own a second save. `C.settings.get/set/onChange/resetToDefaults`, `applyPreset`, `override/clearOverrides` and scoped `policyFor/withPolicy` own saved/effective policy; overrides/battery/safe-mode are temporary. `onChange` returns cleanup. `settings:changed`, `settings:persisted {saved}`, settings open/close and `save:replaced` synchronize views.

`C.saveTools` owns checked export, import preview, backup-before-replacement, Restore/reset and Undo. Data UI uses existing two-click/hold confirmation controls. C recovery leaves unreadable original primary text in place, retains earlier `.corrupt` copies using numbered keys, pauses autosave/ordinary commits and pack charge, and requires an explicit confirmed import/restore/new collection. A placeholder in-memory collection cannot be exported as normal progress. Preservation failure blocks replacement. `save:recovery` and `save:imported` coordinate notices; `C.friendly.showStartupFailure()` pauses boot writes and supplies plain help rather than resetting data.

Desktop preparation restores a valid native primary mirror before renderer boot if needed; it never reads a browser profile automatically. `electron/ipc/storage-handlers.js` retains the exact consulted mirror under `userData/saves/recovery/original-<sha256>.json`, outside rolling backup pruning, before a replacement. Unpreserved/read-failed originals block destructive mirroring. Developer storage contexts never replace the primary native mirror. Shutdown uses the existing prepare-close/close-ready handshake; native failure prevents ordinary data-losing update/relaunch. Pending recovery acknowledges close without overwriting its original. `desktop:storageError`/recovery flags give explicit guidance.

Mutable saves/settings/logs live under native userData/Chromium storage, never in ASAR or the install directory. Default userData identity remains Cardable and appId remains `com.cardable.game`. Album stores photo blobs in IndexedDB `cardable-studio/photos`, separately from save JSON/native mirror. Retain the source entry/file origin and preview path; before any necessary transition export JSON and separately download photos. A mirror restores collection state, not arbitrary photo origins.

## Native bridge and browser fallback

Preload exposes narrow `app`, `window`, `system`, `capture`, `support`, `storage`, `logs`, `updates` and `discord` groups as the existing desktop bridge; renderer integration aliases it to `C.native`. It exposes no generic IPC, arbitrary filesystem operation, process or require. Main windows keep sandbox/context isolation on and Node off, local CSP, blocked child windows/permissions/webviews and restricted navigation. `ipc/security.js` trusts only the exact top-level local index document, and each registrar validates its arguments.

The owner-approved automatic update mode permits native release traffic only in
configured installed Windows builds. Check/download are serialized; a ready update
installs on normal quit only after the renderer save/native disk acknowledgment.
Skip postpones this session; explicit Restart and update now uses the same gate.
Windows session ending and Safe-mode relaunch defer installation. Local preview,
browser and development runs cannot update the separate installed app. The narrow
updates.postpone IPC returns bounded updater state, never paths or a feed override.

Window APIs control scale/aspect/preferences, pack/taskbar status, awake/visibility and Mini through existing services. Storage can get/backup/open the fixed save folder; logs only accept bounded structural messages/open their fixed folder. Capture IDs reveal only service-created files. Support provides configured-source info, diagnostics/manual links, reports and explicit Safe Mode. Safe Mode disables acceleration before readiness and temporarily overrides effective graphics to Low; it never rewrites the saved preset. Normal browser play has no native bridge: save JSON, locally bundled help and Settings still work, and native-only actions are hidden or give a meaningful unavailable message.

`src/data/player-help.js` supplies offline content; `C.friendly.showHelp(topic)` reuses the existing welcome/support dialog and focus trap. `C.commands` and `C.keybindings` own the existing palette/shortcut registry; do not add a second palette. First-run Start playing and optional import use existing welcome markers/preview confirmations. Help returns focus to its surviving Settings trigger. Desktop captures/reporting/log sharing remain explicit actions, not automatic uploads. Release owner/repository and optional Discord ID are null until supplied; no public download/update/report success is fabricated.

## Registries

`Cardable.data.{rarities, cards, generations, packs}` are plain arrays. Lookups use the helpers below; keep per-frame projections cached rather than repeatedly rebuilding catalog arrays:

```js
C.rarity('super-rare')            // by id
C.card('geforce-256')   // by id
C.pack('standard')
C.finishes.register(id, { mount(el, card), update(dt, pointer), destroy(), lite(card) })
C.screens.register(id, { open(), close() })   // future market lives here, behind config.flags.market
```

## Shared events

`pack:ready`, `pack:opened`, `charge:start`, `charge:progress` (0-1), `charge:end`, `charge:complete`, `cut:progress`, `cut:complete`, `reveal:phase` (name), `card:revealed`, `card:kept`, `inventory:open`, `inventory:close`, `tutorial:step`, `currency:changed`, `save:written`. UI modules talk through events, never by calling each other directly.

Inventory also emits `inventory:selection {cardId}`, `inventory:modelChanged {shown,total}`, `inventory:preferencesChanged`, `inventory:collectionsChanged`, `inventory:viewChanged`, `inventory:dragContext`, `inventory:handoffSource {cardId,rect}` and `inventory:handoffTarget {cardId,rect}`, `inventory:handoffComplete {cardId}`. Detail integrates through detailOpen/detailReturned/returnTarget/detailNavigate/detailMembership events. View modules share the controller's query result, not separate ownership stores.

Schema 2 stores `inventoryUi` preferences separately from owned instances: view/sort/group, Show Unowned, active collection, last/pending card focus, favorite IDs, named collections of card IDs, and per-collection customOrders. Schema 1 migration preserves ownership and pending reveals. Query/session state and presentation rectangles are never saved. New catalog entries append in projection; saved order arrays are not rewritten just for catalog growth. Card records explicitly provide `brand` and `type: 'gpu'` for generated facets.

`C.events.declare/supports` describe available publishers; emitting also declares a name and notifies `events:available`. Listening alone does not activate a capability. Achievements and Journal subscribe independently; producers never call their APIs directly. `achievement:unlocked {id,tier,at,retro}`, backfilled/changed/resetting and `picker:chosen` retain their payloads/receipts. Current studio photo events activate their capability. `opening:introEnd` and `cutscene:beat` do not stand in for absent cutscene completion/skip publishers. See ACHIEVEMENTS and CINEMATICS for exact contracts.

## Conditional developer workspace

All tools, styles, galleries, simulations and embedded checks live in `src/dev/`. The only normal-page developer gate is the small inline `dev=1` check in `index.html`. Its loader injects local classic scripts sequentially: runtime, shell, saves, simulations, previews, tools, fun, check runner, then the four existing check suites. Only after loading does `C.dev.prepare()` select storage, clock and transient policies and call `C.boot()`. Ordinary play never creates `C.dev`, loads developer CSS, creates diagnostics, or runs checks.

- `C.uiKit.create(descriptor, parent, binding)` is shared by Settings and the workspace. Bindings provide `get(key)`, `set(key, value)` and optional `subscribe(key, callback)` returning cleanup. Switches, segments, sliders, selects, text/number inputs and `confirmation(button, action, {mode})` share behavior. Confirmation time uses real `performance.now()`; a hold always takes three real seconds.
- `C.dev.register({id, group, label, aliases, type, run/get/set, danger, hotkey, helper, choices, min, max, step, available, unavailable, render})` supplies tabs, rendering, palette entries and Alt shortcuts. It returns an unregister function. Custom render hooks receive a scope with shared controls, cleanup and frame subscriptions; returning a cleanup function is supported. Do not register prohibited game keys.
- `C.state.setStorageContext(key)` selects independent caches/recovery state. Save tools derive backup keys at use time and isolate Undo by context. Sandbox uses `cardable.save.dev-sandbox`, starts fresh, and resumes its own durable save. Its `.workspace` sidecar retains virtual clock/cap/quality/preview metadata. Five named snapshots and UI preferences are separate storage records. Context switching cancels jobs and previews, restores transient policy, then loads the other save. Developer mutations clone, validate strictly, preserve the real `.dev-session-backup` before the first write and adopt only after durable commit. Backup/commit failure adopts nothing.
- `C.clock.now()` is virtual wall time only when developer mode is loaded; timers and tag age use it. `C.state.encode(candidate)` normalizes developer stock/timer/acquisition timestamps when serializing the real context. Temporary over-cap stock and graphics overrides never become ordinary settings. Explicit balance, acquisition-date, serial and ownership edits are durable actions. `C.settings.override/clearOverrides` apply transient values; `withPolicy/policyFor` provide scoped local render policy.
- `C.pull.probabilities(pack, options)` supplies the normalized distribution for `createSampler` and real `pullCard`. Tier luck ramps by rank from ×1 to ×factor; finish chance is capped at 100%. Explicit pull options replace legacy developer dependencies. `opening:resolve`, `opening:prepareCommit` and `opening:committed` preserve successful-commit one-shot forcing and session statistics. `opening.openNow/finishCut/keepCurrent` retain reserve/reward/pendingReveal/Keep/Delete contracts. `C.presentation.openingRate` shortens frenzy presentation independently of confirmation holds.
- Card previews use `C.cardView.create(..., {independent:true, quality})`, with card-local policy, tilt/lamp and manual scoped updates. Developer replay creates pure presentation fixtures and never calls opening commit, allocates gameplay serials, consumes stock or awards currency. Galleries discover cards, tiers, finishes and preview states from the live catalog/registries. `gallery=1` aliases tiers only inside `dev=1`.
- Closing detaches the developer frame subscriber and destroys preview cards, cancels chunks/stress/recording/event capture and restores any immersive mode. Optional FPS listens to existing frame events without waking the game. Simulations yield after eight milliseconds; telemetry refreshes at 500 ms. No checks execute at startup. Checks run only from the existing logic-check button in an isolated context, restoring state and overrides in `finally`.

The catalog currently supports one `variantId` per instance, finish-stack favorites, no combo definitions and no score resolver. Multiple-finish/combo commands are unavailable until compatible catalog and runtime capabilities exist. First-pull/first-variant flags are preview metadata only. The original developer panel, gallery, profiler and dependent historical command-line harnesses are preserved under `archive/dev-menu-legacy/`; historical reports are indexed under archive/4.2.0-cleanup/.

## Extension recipes

**Add a card:** append to `src/data/cards.js`. Done.
**Add a generation:** append to `Cardable.data.generations`, then add cards with that `generation`.
**Add a pack type:** append to `src/data/packs.js` (`tierWeightModifiers`, `cardsPerPack`, `design`); set `enabled: true`. Wrapper parameters belong in `design`: material, wrapper, graphic, roughness, foilStrength, refraction, emboss, subtitle, series, batch, microprint and security. Register a graphic's SVG paths in `data.packGraphics`. Shared renderer code has no pack-id branches. No additional pack types or selector were introduced by the idle-pack refresh.
**Add a rarity:** see `docs/02-RARITIES.md` section 6.
**Add a finish or prop:** new file in `src/finishes/`, register it, add the script tag.
**Add a spec type on cards:** add a row to the formatter table in `src/ui/card-specs.js`.
**Add the market later:** register a screen, flip `config.flags.market`, and use the empty `#market-slot`. No core file needs to change; inventory instances already carry unique serials.
**Add sound later:** add `src/core/audio.js` behind `config.flags.audio` and subscribe to the events in section 4.

**Add an achievement or Journal producer:** extend the data/compact metric projection, publish its stable event/receipt and preserve optional state. Read ACHIEVEMENTS and the active Journal spec; do not mutate another consumer directly.
**Add a cutscene:** register the existing runtime factory and descriptor, with shared clock/disposal, seed, calm/mono/quality, handoff, retained-field/recovery and safety contracts in CINEMATICS. No private timer or new acquisition path.
**Add native functionality:** use a named narrow preload method, channel, secure registrar and argument validation; retain browser behavior. Never expose delivery/build/shortcut/filesystem management to the renderer.

## Pack presentation and strategy contracts

- `ui/pack-markup.js` builds the same seal/body/print regions for menu, charge shell and cut fragments. The wrapper silhouette is shared in `pack.css`. The static local laminate texture contains subtle brushing; specular light, film, printed relief and fluid remain separate layers.
- `ui/pack-material.js` caches lamp tokens and derives specular position, film offsets and relief from the same lamp/pointer-normal relationship used in `card.js`. Idle glint changes only a dedicated layer's opacity; gestures update the normal at display rate.
- `ui/pack-interaction.js` owns bounded pointer capture, spring translation/tilt/lift, a 34 ms card-mass lag, inspection and cancellation. It has no timer, pull or save writes. Pointer press grabs the wrapper; Space and the separate hold action still charge the established opening sequence. V or right-click toggles inspection; Escape exits.
- `ui/pack-fluid.js` renders timestamp progress and springs a gravity-relative surface angle and restrained acceleration-driven wave. The laminate carries a faint transmitted print image beneath the liquid boundary. This is a lightweight optical approximation, not ray tracing or a fluid solver.
- `ui/pack.js` coordinates these controllers in its existing shared-loop subscription, maintains timer/stock presentation, and exposes an ephemeral pose snapshot for opening. Hidden/reveal/inventory contexts pause it. Detailed updates skip an unavailable rear pack.
- `ui/opening.js` captures the idle pose before activating the opening context, then eases that pose into its existing charge stage. Commit, cancellation, pendingReveal and tear geometry retain their existing contracts.
- Reduced motion retains silver material and timestamp fill, with no drag translation, tilt, overshoot or slosh. No save schema or gameplay changes belong to this presentation layer.

### Brand schedule and wrapper

`src/data/brand-packs.js` appends four roster-limited pools and `randomChance` metadata. `core/packs.typeAt(n, optionalSave)` gives cadence priority, then hashes existing immutable save identity and opening number for weighted random entries. Four 1.25% outcomes give a combined 5% chance in normal slots. Standard is the fallback; the first two openings stay Standard. Commit resolves against its candidate save; no card RNG or new save field is used. Schema remains 4.

`ui/brand-pack-skins.js` registers four skins with the existing API. Logo sources belong to design data and are bundled under `assets/packs/`; markup displays them generically. `pack-skin-layer` marks removable decoration. The queue and tags project scheduled type and actual instance provenance. `pack.js` owns the preview turn; `opening.js` owns the post-Keep card/back/wrapper turn inside collecting. Both use the shared scheduler and fade equivalents. See `archive/update-history/2.1.0-brand-packs/IMPLEMENTATION.md`.

### Titan dial

Titan appends a 5% ordinary interval through data and filters its exact 17-card halo list in the production pull table. Its skin and `monolithDrop` arrival use existing registries/subscriptions. An opening strategy may expose `hint`, `actionLabel`, `advance` and `update`; its begin context provides guarded unseal/reveal callbacks. The interactive cutting phase advertises a step through opening context so literal Enter can advance it. `vaultOpening` delegates update until the strategy invokes the existing reveal controller. Durable commits/recovery remain central. See `archive/update-history/2.5.0-titan-pack/IMPLEMENTATION.md`.

## Save and registry evolution (retained unique rules)

## Stage 12 — Permanent variants and stack identities

The variant data and core stack/roll helpers load before inventory-model/state; material bindings load before card views. Card Tags load after pack-markup and before opening/inventory/detail. Save schema 3 adds immutable per-instance variantId, migrates legacy preferences to normal stack keys and keeps settingsVersion 1. Inventory entries and handoff/selection events carry stackKey alongside base cardId, and acquisition handoffs carry instanceId. Named collection membership uses stackKeys. See VARIANTS-AND-TAGS.md for complete current contracts and material extension rules; earlier GPU-only inventory references above describe Stage 7.

## Stage 13 graphics policy

settings-schema.js settingsVersion 2 migrates saved high/medium/low profiles and initializes all independent effect controls. settings.js resolves cached policy before emitting changes; applyPreset writes atomically. fx/loop.js paces one shared RAF with carried deadlines, handles visibility/focus, and reports actual frame gaps and subscriber JS duration. timers.js stops its interval in hidden sleep and reconciles on return. ui/performance.js never creates its own animation loop. graphics.css consumes independent data attributes. Card materials mount lazily; card-thumbnail.js creates front-only inventory views and inventoryTiles promotes on detail entry, then restores a fresh thumbnail. Procedural art templates use a bounded 96-entry cache and images use local thumbnail assets. Particle pools allocate on demand and shrink when lowered.

## 2.0.0 Pack schedule and skin registry

Pack definitions now include priority/cadence, pool filters, tier and variant multipliers, skin, counter style and copy. The core pack service resolves lifetime positions and upcoming definition objects. Save schema 4 stores packs.openedCount, packs.introSeen and immutable instance packId. The skin registry decorates existing idle/waiting/foil geometry; material quality uses the shared visual clock. Adding a type requires one complete data definition and optionally a registered skin. Dev preview selection is separate from one-shot next-pack forcing.

## 2.2.0 Classic pack, card skins and opening strategies

`src/data/classic-pack.js` declares the Classic pack, explicit pre-2007 catalog IDs and registered permanent card skins. The existing scheduler assigns its separate 5% interval to ordinary slots, after branded packs' combined 5%; cadence and the first tutorial openings retain precedence. Era weighting lives in the production pull table, alongside tier weighting and variant-kind exclusions. Modern weight defaults to `config.classicPack.modernCardWeight = 1` and has a dev registry editor.

Schema 5 adds nullable `cardSkinId` to instances. Ordinary card/finish keys keep their two-element tuple; a permanent skin adds a third registered element. `C.collection` projects those separate stacks while unique completion still counts GPU designs. Migrations, checksum imports, backups, Restore/Undo and pending-reveal recovery preserve the field without rerolling.

`C.cardSkins` decorates full cards and static thumbnails. `C.packOpenings` registers wrapper input strategies while the existing state machine retains stock consumption, the three-second hold, durable reservations and rarity cinematics. `C.packTransitions` supplies bounded vector snapshots, pixel quantization, ordered dithering and fragment motion for previews and collection handoffs. All controllers run from existing shared scheduler subscriptions and clean up their temporary nodes; they add no private clocks. See `archive/update-history/2.2.0-classic-pack/IMPLEMENTATION.md`.

## 2.4.0 Royal upgrades and interactive holder

Enabled definitions may declare `replacesPackId` and `replacementChance`. Cadence resolves first; a separate identity/position hash channel then chooses an upgrade of that base type. Royal replaces 5% of Rare slots; ordinary intervals and pull RNG stay unchanged. Schema 5 needs no new fields.

The Royal skin registers original crown, faceted mesh and woven-band renderers. `goldShine` uses the existing transition registry for preview and collection handoffs. `cutThenBox` declares `usesSharedCut` and an `afterTear` hook; the state machine retains its standard upper cut, then delegates `boxWaiting`/`boxOpening` updates and `input:packActivate`. A strategy may provide `fallbackMs` and an `updateReveal` decoration when the reserved tier has no cinematic. Durable reservations, stock, rewards and recovery remain central. All temporary presentation nodes clean up on reset/replacement. See the Royal implementation notes.

## 2.8.0 Picker offers

Data lives in data/picker-pack.js; slotRules.regularChance is exposed to the existing scheduler, preserving cadence and previous ordinary intervals. core/picker.js draws distinct IDs through the production probability table and per-option variant sampler, then applies the data guarantee. pendingReveal.options stores unminted results; choice is null until the durable decision creates one serial/instance in pendingReveal.cards. Optional guarantees and pickerChoice fields retain offer policy and provenance without a schema bump. state validation handles both unresolved and chosen shapes. Checksum imports/backups/Restore/Undo use the existing whole-save pipeline.

The shared opening adds a generic buildPending request hook and unresolved-offer resume hook. picker-pack-skin, picker-pack-swap and picker-pack-opening register through the existing APIs; registry implementations and cinematic/finish files remain untouched. The central scheduler supplies wrapper/gesture/pick time. picker:chosen emits only after durable choice, carrying options, chosenIndex, chosenTier, lowestTierChosen and bestTierChosen. Existing Journal/Achievement consumers may subscribe without producer calls.

## Packaging, delivery and acceptance

`electron-builder.config.cjs` extends package allowlists with public release metadata and bundled CHANGELOG.md. Only runtime index/src/assets/vendor/electron and required metadata ship; docs/archive/tools/tests/developer evidence stay out of ASAR. Stable Windows x64 offline NSIS one-click/per-user options retain app data and normal app shortcuts. The supported include requires players to close a running app manually and stops uncertain legacy upgrades; it does not kill processes.

`tools/deliver-desktop.cjs` owns isolated staging, source/artifact hashes, lock, manifests, atomic latest/last-good, stable preview/Latest Build link, rollback and exact owned cleanup. `dist/` is generated/ignored, not source or player data. Here `dist/desktop-qol-4.1.0/win-unpacked` deliberately keeps its original folder/file-origin while contents advance. Do not rename it for version cosmetics. A locked preview is pending handoff; never force-close it or switch origins. See DESKTOP-DELIVERY, BUILDING and RELEASING.

Runtime reads CHANGELOG.md; CI validates matching `changelog/X.Y.Z.md`, app/config/lock version and tag. Preserve installer/blockmap/latest.yml pairs; local delivery never publishes or installs. Consult ROADMAP, STRUCTURE-AUDIT and archive index for separate implementation/ancestry/packaging/runtime evidence. Current restricted testing and continuation are in PROMPTING.
