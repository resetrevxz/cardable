# Stage 5 — Opening through the tear

## Done

- Implemented `idle → charging → dissolving → cutting → tearing → torn` and the cancellable `charging → draining → idle` branch. All transitions are explicit and logged in dev mode.
- Three-second Space charging: linear fluid fill, spring meniscus, upward specks, increased agitation above 70%, squared seam light, vibration above 60%, depressed Space keycap, and increasingly frequent grid pulses.
- Early release, Esc, blur and hidden-tab cancellation drain with slosh over 700 ms, preserve the pack, and require a fresh key press. Accepted keys prevent scrolling; repeated Space presses, unrelated controls and editable fields cannot start another sequence.
- One durable commit contains consumed stock, timer restart, resolved card instances, candidate serial allocation, opening statistics and `pendingReveal`. A failed durable write preserves stock, serials, statistics, the dev forced tier and the previous saved JSON. Ordinary saves retain their existing session-only fallback.
- Reload recovery restores the same committed wrapper at cutting without drawing another pull or consuming another pack. The pending result contains `{ packId, cards, committedAt }`; visual progress is not saved, and the schema remains version 1.
- A 900 ms glass dissolve leaves a monochrome matte foil wrapper with original pack printing and a generic enclosed-card silhouette. Menu and opening use the same pack DOM builder.
- Press-and-drag cutting: approximately 8 px samples, smoothed dark seam, speed-sensitive white leading trail fading over 300 ms, either-endpoint continuation within 16 px, pointer capture and cleanup, and automatic completion at 80% dominant-axis span.
- Splitting uses the actual extended seam and outline as complementary clip polygons. Self-intersecting loops are removed from the tear boundary while the original scratch seam remains visible before tearing.
- Blade cursor follows with time-adjusted 0.35 interpolation, aligns with motion, and owns the native cursor only over the cutting wrapper. Cursor ownership clears on release, leave, blur, capture loss and phase changes.
- Enter immediately tears the wrapper, completing a partial path or supplying a horizontal center path. Dashed guidance appears after two seconds; the Enter hint appears after five seconds without cutting activity.
- Tear timeline: 350 ms lift, 500 ms split and 700 ms fall-away; 6–14 px separation, ±1.2° rotation, a white gap and 32 fibers with 400–700 ms lifetimes and light gravity.
- Hidden tabs pause visual timelines. Live reduced-motion changes select plain fills, opacity-based transitions, direct cursor positioning and static effects, with particles, vibration, ripples and slosh removed.
- Opening hides and makes menu controls inert through event-based ownership and a named visibility hold. Hidden wordmark/menu effects pause. Cutting sleeps after transient effects and hints settle; the terminal stage also sleeps.
- Dev controls expose the phase, retain reset, and replay the committed wrapper after tearing without changing the saved result. Other state-changing dev controls are guarded while opening is active. The gallery does not enable opening.
- Verification with the real classic scripts in the instrumented Node DOM/storage/clock harness:

  | Check | Result |
  |---|---|
  | Stage 5 focused behavior groups | 26 PASS |
  | Stage 1 shell groups | 15 PASS |
  | Stage 0 console checks | 6 PASS |
  | Stage 2 card groups | 13 PASS |
  | Stage 3 tiers 4–6 groups | 14 PASS |
  | Stage 3 tiers 7–9 groups | 15 PASS |
  | Stage 3 tiers 10–12 groups | 15 PASS |
  | Stage 4 menu groups | 18 PASS |

- Checks include 2999 ms cancellation, exact 3000 ms release, quota/storage denial, candidate-only serial allocation, reload before and after tearing, actual-catalog forced Common/Secret pulls, repeated short-travel rejection, horizontal/vertical cuts, loop removal, resize/high-DPI sizing, capture loss, live reduced motion, hidden tearing, sleep, replay and reset.
- All 46 local classic scripts and the tool scripts passed syntax compilation. A recursive comparison against HEAD confirmed every pre-existing configuration value is unchanged; the data diff is empty.
- Commit name: `stage 5: opening through tear`.

## Skipped or changed

- This checkpoint ends at `torn`. Card rise, anticipation, flip, settling, Keep, collection, toast and tutorial choreography remain for later work.
- As selected, the full specification's reload-at-Keep behavior is temporarily replaced by reload-at-cutting. The committed result remains reserved after the fragments disappear; another opening is blocked.
- No data files, existing configuration values or save-schema version changed. Added named Stage 5 presentation fields and narrow core APIs for candidate consumption, serial allocation and durable commitment.
- Pointer hold-to-charge and the optional high-tier light tell were omitted as planned. No market, audio or variants were added.
- Browser screenshots, rendered appearance and measured 60 fps remain **unconfirmed**. The existing `file://` browser preview restriction was respected; no alternate browser, indirect execution or local-server workaround was used. Node checks establish behavior and scheduling, not GPU rendering.
- A screenshot-based visual critique could not be performed. Manual review should pay particular attention to glass/foil continuity, the visibility of the meniscus and slosh, thin seam/glint restraint, and clipping along wandering cuts.

## Look at

1. Double-click `index.html`. Hold Space for about two seconds and release. Check that the fluid sloshes down, the keycap rises, the menu returns and both original packs remain. Repeat with Esc, another window taking focus, and switching tabs.
2. Open with `?dev=1`, choose a forced tier, then hold Space for three seconds. Watch the glass dissolve into the flat wrapper. Refresh before cutting: the wrapper should return directly, with stock and serial counter unchanged from the committed save.
3. Drag partway across the foil and release. Check the persistent dark seam and fading highlight. Resume near either end. A press elsewhere should leave the seam unchanged. Verify wandering horizontal and vertical cuts both split along their paths after spanning 80%.
4. Check the blade's lag and orientation, and confirm the native pointer returns when leaving the wrapper or losing focus. Resize midway through a partial cut; its normalized shape should survive.
5. Press Enter on a fresh or partially cut wrapper. Check lift, the narrow light gap, white fibers, rotation and fall-away. The endpoint should contain no card and no new opening action.
6. At the endpoint, use **Replay committed wrapper** to repeat the cut without another consumption or draw. Use **Reset save** to return to the menu for another charge.
7. Enable reduced motion while charging and while tearing. Check static fluid, direct cursor motion and crossfades without particles, vibration, slosh or rings.
8. In dev mode, leave cutting stationary for more than five seconds, then check `Cardable.fx.stats.running === false`. Repeat after tearing. For real rendering performance, watch the dev FPS counter during charging and cutting; this still needs browser measurement on the target laptop.
9. Inspect `Cardable.state.current.pendingReveal` before and after refresh/replay. Its card IDs, instance IDs and serials should stay identical. The pending card is not added to inventory in this half-stage.

## Open questions

- No unresolved product choices. Selected checkpoint policies: recover at cutting, hold the empty endpoint, reject a commit that cannot be durably saved, and resume partial cuts from either endpoint.
- Applicable defaults followed: fixed three-second hold (#5); one card per pack with multiple-card support (#4); normalized written chances (#2); empty-tier downgrade (#8); press-and-drag (#15); the enabled standard pack (#16); serial format (#7); monochrome chrome (#3); local font fallbacks (#19); desktop scope (#21). Existing eight-hour regeneration and two-pack cap remain intact (#1, #14).
- Actual material appearance and measured rendering performance remain pending manual verification because the permitted browser preview is unavailable.
