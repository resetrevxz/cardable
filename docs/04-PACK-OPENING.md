# 04 — Pack opening

## 2.5.0 Titan vault dial

Titan preserves the three-second hold, atomic stock/count/reward reservation and tier cinematic. After armor dissolution, drag the vault dial clockwise through three quarter-turn ticks, or press Enter once per tick. The touch action reads Next tick. Lights and a restrained local tick pulse show progress. After the third tick, bolts retract and the door unseals over 1.4 seconds, then the reserved tier's existing cinematic runs. The real card stays hidden until this handoff. Reload restores the exact committed card directly without replay or duplicate reward. Reduced motion keeps static tick lights and fades the door.

## 2.1.0 brand packs and collection turn

The next scheduled pack is stable across preview, charge cancellation and reload. Non-cadence slots have a combined 5% branded chance, equal NVIDIA/AMD/Snapdragon/Apple shares; Rare retains every fourth opening. Each uses the existing commit, stock consumption, $200 reward and immutable pending reveal, with roster-restricted pools. Card and finish random draws are unchanged.

After a durable Keep, collecting rotates the earned card from front through its engraved back, changes surfaces at the hidden edge, and returns as the next scheduled pack. The turn advances no gameplay state. It works while ready or regenerating, uses the shared clock and a fade equivalent for reduced/low animation, and cleans up on save replacement. The inventory toast and collect pulse still confirm ownership. Delete retains its existing discard presentation.

The most important sequence in the game. Build it as a state machine driven by a single timeline, with the pull already decided (`docs/01-GAME-RULES.md`).

Owner-approved remake pass 1 adds **Delete** beside Keep after the same reveal delay. Delete durably resolves the current reserved instance, fades the card away, and returns to the menu without an inventory flight or collection pulse. A pack now awards **$200** in its charge-completion write; a separate silver coin flight heads to the balance. Failed writes preserve both stock and balance. Recovery exposes both decisions and does not pay again. Actions remain within the viewport on short windows. In future multi-card packs, discarded IDs are saved alongside the existing decision count, and only kept instances enter inventory.

## 1. States

```
idle → charging → dissolving → cutting → tearing → rarityIntro → rising → preFlip → flipping → settling → revealed → collecting → idle
         ↓ (release early / Esc / blur)
       draining → idle
```

Rules: only one pack can be in the sequence at a time; ignore input that is invalid for the current state; every transition is explicit and logged in dev mode. If `cardsPerPack` is greater than 1, loop `rising → … → revealed` per card, and finish with one `collecting` step.

## 2. Input

- **Hold Space for 3000 ms** (`config.hold.chargeMs`). Ignore `event.repeat`. Call `preventDefault()` so the page never scrolls.
- Releasing early, pressing Esc, `window.blur` or `visibilitychange` (hidden) → `draining`.
- Alternative input for later: pointer press-and-hold on the pack. Abstract input in `src/core/input.js` (`chargeStart`, `chargeEnd`, `cutMove`) so Space and pointer both map to it.
- Accessibility fallback: after the dissolve, a subtle hint appears after 5 s idle — press Enter to tear the pack open.

## 3. Phase details

### charging (0-3000 ms, linear progress)
- Fluid rises inside the pack's glass body from the bottom. The surface wobbles (spring-driven), settles into a slight wave, and becomes more agitated above 70 %. Soft meniscus curve at the edges. Tiny specks drift upward.
- Light leaks through the pack seams, intensity proportional to progress squared. The pack vibrates lightly after 60 % (amplitude up to about 1.2 px).
- Keycap hint "Space" fades in near the pack and visibly depresses while held.
- Dot grid: hold ripples pulse outward from the pack in time with the fill, faster as it nears full.
- Everything else fades to near zero (UI hides during the sequence).
- Optional subtle "tell" for high tiers: slightly stronger light leak (never colored). Keep it faint.

### draining (700 ms)
- The fluid drains back with a small slosh instead of resetting instantly. Vibration and light leak ease out. Then `idle`.

### charge complete → commit
- At 3000 ms: consume the pack, resolve the pull, write `pendingReveal`. Cannot be undone.

### dissolving (900 ms)
- The glass shell and fluid dissolve into fine particles that drift upward, leaving a flat **foil wrapper** (matte-metal sheet with the pack design printed on it, card silhouette inside).
- When the dissolve ends, the top-strip highlighter and cut label appear immediately. The tutorial uses the same guide.

### cutting (no time limit)
- Press and swipe in the upper pack area. The input zone extends from 10% above the wrapper to 36% down, plus 56px past either side. During a captured swipe, vertical drift is tolerated from 28% above to 55% down. Lower-body strokes remain invalid.
- Pointer positions automatically align to the top seam at `config.cut.guideY` (9%). The visible blade and tip follow this seam even if the pointer wanders. Vertical-only travel cannot advance the cut.
- A bright silver trail, glowing tip and speed-sensitive glint follow the swipe, with slight localized foil recoil. Releasing preserves the seam and lets the glow cool. Resume anywhere on the cut or within 72px of an endpoint; there is no need to find an exact pixel.
- A normal cut completes at 72% horizontal coverage (Easy: 60%). A 130ms completion sweep extends the seam to both edges, then removes the top cap. Both directions and fast single-event swipes work. Progress describes seal coverage, not total back-and-forth distance.
- The draw-on guide and live swipe label share the existing scheduler. Reduced motion retains a static guide, aligned seam and completion feedback with no recoil or particles.
- Enter and the touch Tear button remain immediate accessible alternatives.

### tearing (180 ms), splitting (240 ms), falling (420 ms)
- Split the wrapper across the aligned top seam. A brief white gap and pooled foil flecks mark release.
- The cap peels aside with a stronger 7-degree turn while the main wrapper separates gently, then both fall and fade into the rarity intro when configured, followed by the existing card reveal.
- Cut effects remain neutral silver/white. Reserved-card, reward, Keep/Delete and reload semantics are unchanged.

### rarityIntro (Basic through Exotic)
- After the wrapper falls away, read the rarity of the reserved instance. Keep the card unmounted while the full-screen light/star sequence runs, then enter `rising`.
- Each rarity owns its sections and durations in `openingIntro` in `src/data/rarities.js`. Mono, quality and reduced-motion treatments share the same reservation; see `RARITY-INTROS.md`.
- Reload recovery skips this phase and immediately exposes the saved card with Keep/Delete, preserving exact-once rewards and decisions.

### rising (`reveal.riseMs`)
- The card face-down emerges from the wrapper: rises about 12 % of its height, scales 1.00 to 1.06, rotates ±6 degrees on Y. Its back shows the logo and serial.

### preFlip (`reveal.preFlipPauseMs`)
- A hold of anticipation. The card hovers, the light intensifies, the dot grid dims to `reveal.gridDim`, the tier's bloom fades in, and if `shiftPx` is 1, the screen shifts once by 1 px. Commons skip this (0 ms).

### flipping (`reveal.flipMs`)
- 3D flip about the Y axis with ease-in-out, slight overshoot at the end (spring), a small lift and scale (1.00 to 1.08 to 1.00).
- **Signature moment:** when the face passes 90 degrees, one white shine sweeps the card from one corner to the opposite corner in about 700 ms (soft-edged, angled about 20 degrees, `overlay`/`soft-light`). Match `references/01-shine.png`.
- Cursor glow disappears during the flip.

### settling (about 1.2 s)
- The card lands with a small bounce, a puff of light dust (8-14 tiny particles), and the shadow tightens.
- The card now tilts toward the cursor (full mode).
- Info arrives in sequence: name (fade), serial (stamp, +180 ms), specs (one by one, 80 ms apart), tier badge, tier meter fills segment by segment (about 40 ms each).
- **First time this card is pulled:** reveal +200 ms longer and a soft "New" label. **Duplicate:** 15 % shorter (not for tiers 7+) and a "x2" note.
- A quiet **Keep** button appears 400 ms after the last item, with a small Space keycap. A fresh Space press, Enter or click activates it. Guard against a still-held Space triggering it, key repeats, and acceptance before the button is available.

### collecting (about 900 ms)
- On Keep: the card scales down and its thumbnail (lite mode) flies toward the inventory arrow. A small glass toast slides in from the bottom: thumbnail, name, "Added to inventory". The arrow pulses once when the thumbnail lands. The toast stays 2.4 s.
- Then the menu returns gently (200 ms delay), the pack timer fill continues from where it was, and the UI fade timer restarts.

## 4. Rarity scaling

Use `reveal` values from `docs/02-RARITIES.md`. Commons are quick; higher tiers get longer rise, a pause before the flip, a slower flip, more bloom and a deeper grid dim. Secret and Ascendant may add one extra flourish each (Secret: the scrambling logo appears on the card back for 400 ms before the flip).

Owner-approved `openingIntro` descriptors now override that entrance for Basic through Exotic. After the foil tear, the reserved card stays unmounted while its rarity sequence runs. The effect then hands directly into a 400 ms back-to-front flip, overlapping its first 160 ms; the old rise/pre-flip pause is bypassed. Metadata and variant readiness still gate Keep/Delete. Legendary's 8600 ms ceremony uses molten side flames, a gold prism and three seconds of mirrored crystal sweeps. Its final crystal field remains static behind the card. Mythical's 27,600 ms Crimson Clock film uses a spatial cave/fall, underwater crystal tendrils, an overhead red omen and corrupted clock ritual, then one white explosion flash. Its red-black field remains with quiet edge smoke/embers. Exotic's 19,300 ms intro interrupts Basic's white peak with black, establishes a colored starfield, accelerates for ten seconds, brakes into a tilted rotating galaxy, then fades the galaxy while keeping those stars behind the card. These backgrounds fade over 450 ms during collection/discard. Reload restores the appropriate seed-derived field and the same front card without replay or another reward. See `RARITY-INTROS.md` for section timings, Fast/Mono/static alternatives and renderer contracts.

## 5. Edge cases

- Reload during `charging`: nothing consumed. Reload after commit: resume at `revealed` (no animation) with the pending card and Keep.
- Two stored packs: after collecting, the second pack slides forward.
- Reduced motion: charge is a plain fill; dissolve and tear become crossfades; flip becomes a crossfade with one soft shine; no particles, ripples or sway.
- Cancel is never possible after commit.

## 6. Dot grid and cursor during the sequence

See `docs/07-DOT-GRID-CURSOR.md`. Summary: hold ripples while charging, normal near-cursor dots while cutting, grid dims to `gridDim` from `preFlip` on, cursor glow off during the flip.

## 7. Stage 12 variant transformation

Roll one cosmetic finish after GPU selection, with an independent 10% gate. Persist `variantId` with the reserved serial in the original opening commit. Existing committed reveals migrate to Normal. After the ordinary front reveal settles, a variant enters `variantReveal` for 1200 ms (840 ms with Fast reveal, 180 ms with reduced motion): normal hold, accelerating coating alignment snaps, final lock and settle. Keep/Delete remain gated until the final tag appears. A reload recovers the final saved finish immediately without another roll, reward or animation. See `VARIANTS-AND-TAGS.md` and its QA report.


## 2.0.0 Scheduled pack commits

Resolve the pack from the candidate save at commit time, increment openedCount with the existing statistics/reward/stock transaction, and store packId on the pending reveal and each instance. Canceled holds and failed writes preserve the queue; recovery never re-resolves or recounts the committed pack. The charge shell previews the upcoming skin. Registered fluid/leak/cut tint values apply only to wrapper phases; post-tear rarity and card reveal behavior stays unchanged.


## Ascendant cinematic handoff (milestone C)

Ascendant's registered intro replaces rise/preFlip after the foil tear. The shared timeline reaches cardIn at 31 seconds; the card mounts face-down and flips over the existing 400 ms while the foreground fades over 160 ms. The 1.5-second S8 scale/bloom/border presentation continues through flipping and settling. Hold infoClock and the controlled reveal until S8 completes, then resume the existing metadata, variant and Keep/Delete gates. Full is 32.5 seconds including S8; Short follows the specified shot lengths for 16.5 seconds including S8. Fast scales these presentation durations by 70%; charge/cut timing remains unchanged.

Cards > Cutscenes applies Full/Short/Off to all rarity intros. Ascendant's Off, reduced-motion and Very Low path is a three-second quiet Canvas sequence, including its final 400 ms flip. The finish background and retained viewport share the reserved serial and continuous field time, with the quiet path frozen. Background decision fades, multi-card transition and pendingReveal recovery use the existing handlers. No pull RNG, serial assignment, pack/reward transaction or durable recovery logic is changed.

## 2.2.0 Classic pull-tab strategy

Classic shares the existing three-second hold and atomic opening commit. Its wrapper resolves `opening:'pullTab'` through `C.packOpenings`: after pixel-block dissolution, press the labeled top tab and drag upward. Resistance and 32 perforation steps lead to a snap at 85% of the configured pull distance, a flying strip, case separation and amber interior light. Pointer capture supports drag continuation; partial progress can be resumed. Enter and the touch opening button use the same tear completion. The committed type, serial, finish and permanent card skin recover unchanged; wrapper interaction never re-rolls a card or grants another reward. Existing tier cinematics and Keep/Delete gates follow the case opening.

`swapIn:'tornadoPixel'` routes preview replacements and post-Keep arrivals through the shared transition registry. At normal quality the earned card first turns to its engraved back, then the outgoing pack fragments and the incoming case appears. Medium shortens the vortex; Low uses a pixel fade; Very Low/reduced motion use fades. Ready and regenerating arrivals land on the same upcoming skin.


### Secret checkpoint A

Secret enters `rarityIntro` through the same reveal hook. Serial-seeded presentation and warm-up are shared with Ascendant. A Full pre-roll pauses the cinematic clock before any story advancement; either profile has the same Acts A–C duration. The temporary release mounts the actual card only at the existing direct flip, preserving metadata, variants, Keep/Delete and pending-reveal recovery. The quiet shared Secret field remains until the normal decision fade. A adds no reservation, reward, stock or serial mutation. Desktop and final resurrection choreography remain B/C.

## 2.4.0 Royal cut and holder

Royal upgrades 5% of scheduled Rare slots. Its one-card pool is Legendary through Secret, with unchanged normalized catalog weights. The hold still takes three seconds, and the successful commit consumes shared stock, advances the lifetime count/statistic once, grants the existing reward and reserves the exact Royal instance.

`cutThenBox` keeps the shared top-area guide and press/drag cut. After golden triangle dissolution and the top split, a red lacquer holder rises for 900 ms. Click/Enter becomes available when it settles; a neutral Click hint appears after 2,000 ms. Activation is single-shot and blocked by hidden/settings contexts. The lid opens over 1,100 ms with one local shine and warm light, then the reserved tier's own intro follows. Without a tier intro, its card rises over three seconds with a local crown/glint/shine, then flips and passes the normal metadata/finish/Keep gates. Reduced motion fades instead of traveling or rotating.

Reload after any committed wrapper/holder step restores the same card directly at revealed, without replay, reroll, recount or reward. `goldShine` routes incoming preview and post-Keep types through the shared transition clock. Standard, branded and Classic strategies retain their current controls.

### Secret milestone C handoff

Secret's descriptor now ends the 40-second Fatal Exception in its own shared Found background, then enters the existing 400 ms flip directly. `secretIntro.handoff()` preserves the last field clock/profile/inversion epoch and frees the OS WebGL resources. `rarityIntro` starts the retained backdrop at that clock rather than zero; the finish samples it before its first frame and sets the squircle border immediately. The transient Secret title and glyph storm clear in the final scene. Metadata, variants, Keep/Delete readiness, 450 ms background exit and exact-once reservation/reward paths are unchanged. Recovery and the shared black skip display the quiet seeded field directly, without replay. Short is an authored 18.5-second route; reduced motion/Very Low/Off is a four-second calm Canvas route. Safe's return inversion waits for its 4.8-second interval, continuing after the flip.

C runtime acceptance is still pending: the only permitted launch reached the game with zero startup console errors/warnings, but its open dev workspace intercepted a tutorial-skip interaction before either Secret preview was started. No meter PASS, full-speed playback or handoff verification is asserted.

## 2.7.0 Picker interaction

Picker consumes shared stock/count/reward in the same charge-completion transaction but reserves three distinct unminted options, with at least one Rare or better. Drag either wing outward or press Enter; the cards flip one by one without a tier cinematic. Choose using 1/2/3, arrows/Enter or pointer. A quick second click/Enter (within 1.6 seconds) or 600 ms press confirms; failed storage leaves the original options and serial counter unchanged. Only the confirmed option mints the next serial. Its existing cinematic/reveal/variant/Keep sequence follows. Secret options are ??? with no disclosed name/tier/art until selected.

Reload before choice resumes the same pick screen directly; reload after choice exposes the exact chosen card at Keep. Recovery never re-draws, consumes stock or rewards again. Reduced motion uses fades and omits travel/particles. See alpha-updates/2.7.0-picker-pack/SPEC.md and IMPLEMENTATION.md.
