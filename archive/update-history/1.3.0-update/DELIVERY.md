# 1.3.0 delivery status

Implementation is present locally. The final combined commit has not been made. The requested single file:// browser smoke check is pending because the browser tool rejected the local URL protocol. Its response expressly prohibits reaching that blocked page through alternative browser surfaces or indirect execution. No workaround, screenshot, recording, CPU stress or profiling job was attempted.

## Opening, Settings and inventory regression repair

The user reported freezes after the Space hold and collection, inaccessible card detail/Settings, and slow inventory in both normal and developer modes. Source inspection found two remaining reads of the removed `C.config.dev.queryFlag`: one inside every opening phase transition, another at the beginning of detail initialization. The latter throws before boot reaches tutorial, Settings and timers; the former throws during opening. Both now use the shared presentation interface or omit the retired diagnostic call. An exception in the old shared frame callback could also leave `inFrame` permanently true; subscriber failures are now reported once until recovery, and a `finally` releases the frame lock even when telemetry fails.

The resting-menu Settings gear is visible, including during the tutorial. Thumbnail creation now consistently uses the existing lightweight renderer, including collection flights, toast and inventory peek. Static thumbnails/mystery cards build bounded low-quality materials (Very Low remains Very Low); full reveal/detail effects retain player settings. Shelf paint measures viewport width once before card writes and keeps browsing cards lite. Inventory thumbnail filters/reflections are disabled, and an open inventory stays fully opaque.

These repairs have static verification only. Browser opening/Keep/detail/Settings acceptance and inventory FPS measurements are unverified; no profiling or automated test job was run. The combined 1.3.0 update remains uncommitted.

## Implemented source coverage

| Group | Tools |
| --- | --- |
| Save | Fresh/resumable sandbox; five named snapshot slots with save/held replacement/load/delete/rename/diff; lazy JSON tree/copy; validated held raw editor; existing checked export/import; session backup restore; context-scoped Undo. |
| Packs and time | Live enabled-pack picker, grants/count, cap through 99, pause, ×1/×10/×100/instant regeneration, 1h/8h/24h/7d/custom skips, instant durable opening. |
| Pulls | Tier/card/finish forcing, sticky/one-shot, luck ×1–×50, baseline/effective odds, chunked 100–100,000-pack distributions and optional atomic inventory addition. |
| Cards and inventory | Selected/every card/populated tier/random/every finish grants; 100/500/1,000/5,000 fixtures; instance date/serial/seen/favorite/preview flags; held deletion/clearing; mark all; add/set/×10/billion currency. |
| Variants lab | Live finish grid/demo picker/resolved identity/conflict explanation; local full effects, tilt/lamp/quality/mono/layer controls; evolve replay and grant; combo capability readout. |
| Opening and reveal | Isolated full presentation replay; phase seek/pause/frame-step; visual ×0.1–×4; evolve skip; tag printing, tag fixtures and freshness travel. |
| Quality and performance | Every quality tier including Very Low, motion/mono/dots/glow/idle overrides, optional FPS, restrained graph/metrics, manual ten-second recording/copy and 5/10/20ms CPU stress. |
| View and debug | Filter/pause/copy bounded events, console warnings/errors and uncaught errors, element/layer/hit outlines, reset overrides, cards/finishes/tags/tiers galleries and gallery=1 alias. |
| Checks | Existing logic checks relocated under src/dev; isolated explicit button, finally restoration, one-line summary and copyable details. No startup checks. |
| Fun | Durable stock-consuming frenzy/summary, session luck estimate/reset, 2,000-trial weighted completion estimate, owned-card showcase, photo/lamp mode and animated roulette with explicit grant. |

## Unavailable by current game rules

Cards have one permanent finish slot. Multi-finish selection/forcing, combo tags/distributions/finder results and combo score have no compatible data/runtime resolver. The UI states this explicitly. Disabled pack entries remain disabled. Heap and non-shared-rAF metrics show Unavailable when the browser exposes no supported information. First-pull/first-variant flags are preview metadata, persisted only in sandbox workspace data.

## Remaining acceptance work

Open index.html once with ?dev=1&sandbox=1 in a browser permitted to access local files. Confirm initial panel and Ctrl/Cmd+K search, execution and destructive-control focus. Run one representative tool in every tab; use Run logic checks for Checks. Confirm zero console errors, then stop. Do not trigger recording, CPU stress, screenshots or profiling. Fix any acceptance failures, rerun required static checks, review and commit all current visual/card-generation/dev-workspace changes as one 1.3.0 checkpoint. Existing graphics commit df5c51b remains in history; it was not rewritten.

Static validation evidence is recorded below after the final source pass.

- Static syntax: 89 classic source scripts and 1 inline script(s), 0 errors.
- Local/loader references: 0 missing. Conditional developer modules: 12. Loading order verified statically.
- Retired production dependencies/selectors: 0. Literal artwork references: 0 missing.
- Developer file whitespace: 0 errors. Git diff --check also passed.
- Browser smoke: blocked before navigation by the file:// protocol policy; no game or logic checks executed.
- Commit outcome: no commit; HEAD observed as df5c51b.
