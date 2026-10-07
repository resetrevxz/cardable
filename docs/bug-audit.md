# 1.2.0 Part 1 bug audit

Scope: source review plus one final offline session and one manual `checkStability()` invocation. No legacy suites, test files, game captures, recordings or profiling. App/installer version stays 1.1.0. The referenced `alpha-updates/1.2.0-PLAN.md` was absent; Part 1 controls scope. GitHub and website work are excluded.

| Area | Bug / concern | Repro / evidence | Severity | Status |
|---|---|---|---|---|
| Inventory / inspect | Grid recenters on every resize and detail return; active opening context resets the entire sheet | Scroll a grid, inspect, resize, return; grid `resize/restore` calls `focusId`; inventory opening handler calls `reset` | High | Preserve scroll and gate sandbox replay reset; final runtime check pending |
| Detail / studio | Hidden detail still runs its visual subscriber while studio loads | Enter studio during detail lift/shine; detail scheduler lacked studio guard | Medium | Detail subscriber sleeps during studio/pending entry |
| Tags | Compact label geometry has no explicit hover/focus/pin state and rails cannot wrap | Hover/focus rapid transitions; inspect `card-tags` render and nowrap rail | Medium | Explicit compact/semi-open/open states, normal flex layout, ellipsis/title, keyboard buttons and Escape unpin |
| Tutorial targets | Spotlight caches geometry through moving layouts | Open lesson while sheet/pack is moving; `layout` returns with same target | Medium | Stable producer attributes and shared-frame geometry |
| Tutorial recovery | Reload at cut lesson replays wrapper and can conflict with pending presentation | Reload after durable commit during cut | High | Recover same reserved card, advance to Keep; never replay or roll again |
| Tutorial pack | Developer force / scheduled special pack can affect replayed tutorial | Replay after multiple openings with forced pack | High | Standard resolver/preview and commit override while lesson is active |
| Tutorial step | Registered intros bypass the old rising phase | Reach intro from cut with tutorial active | Medium | Cut advances on intro/rising/revealed; replay explicitly re-adopts saved step |
| Tutorial Skip / resize | Narrow copy can overflow; Skip lacks coarse-pointer minimum/insets | Narrow window, native title bar | Medium | Wrapped instructions, 44px Skip, safe-area/titlebar inset |
| Currency | Credits mutations bypass common transaction/ledger; spending adopts before persistence | Opening, achievements, picker, dev, failed currency save | High | Section 2 transaction work pending |
| Inventory delete | No rarity typing, protection or undo; detail-only entry | Delete a Legendary/favorite copy through More | High | Section 3 work pending |
| Cutscenes | No owned-card paid replay route | Inspect owned cinematic tier | Feature | Section 4 work pending |
| Performance | FPS toggle reports averages only; no percentile window | Turn on performance display | Feature | Section 5 work pending |
| Journal | Active listeners and entry points conflict with retirement | Inventory tabs, detail History, palette | Medium | Section 6 archive pending; saved data must remain |
| Opening styles / early release / reload | Existing atomic pending reveal and charge/drain paths | Source: opening, packs, input, picker | High | Retain transactions; full per-phase/style reload matrix unverified |
| Cutscene skip / quality / motion | Shared intro clock, safety and disposal already own policy | Source: rarity-intro, cutscene runtime/safety | High | Reuse; full cinematic/device matrix unverified |
| Pack counter / swaps | Tutorial must not use special preview transition | Source: pack queue and preview swap | Medium | Standard tutorial queue; post-lesson swap remains existing behavior |
| Sort / search / filters / stacks / silhouettes | Existing query/model and bounded thumbnail views | Source: inventory, grid, shelf, query | Medium | Preserve; exhaustive combinations unverified |
| Achievements | Rewards directly mutate currency | Source: achievements reward/persist adapter | High | Ledger integration pending; counters independent of Journal |
| Settings / export / import / backups | New optional data can be dropped by fixed loader | Source: state migration, save tools, settings normalization | High | Optional wallet/unlocks and passive journal preservation pending |
| Electron window / tray / notifications / mirrors / mini | No new native behavior required | Existing desktop service contracts and delivery docs | Medium | Source-only boundary; native lifecycle acceptance unverified |
| Focus / hidden / DPI / repeated screens | Shared scheduler/native visibility stop visuals; grid observer lives with app-long grid | Source: loop, viewport, studio cleanup, inventory | Medium | Avoid new always-on loops; physical DPI and memory-growth measurements prohibited/unverified |
| Studio photos | Photo blobs live in separate IndexedDB | Source: studio entry/controller/album | High | Preserve origin/storage; import-photo/relaunch coverage unverified |
| Console | Clean normal session still required | Final offline feature session | Medium | Pending |

Design references: [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines), Apple [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) and [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Apple source content read through its public documentation JSON. Use purposeful motion, semantics, visible focus, forgiving targets, safe areas and reduced-motion alternatives. Color remains in the default UI; full monochrome follows Settings.

Known issues and limits: exhaustive tutorial reload/skip/resize at every step and quality, native installer execution, photo import, hardware/DPI, measured idle CPU/memory growth and complete cutscene matrix are not inferred from source/build checks. Required overlay cost target must be measured in a separately authorized profiling pass.
