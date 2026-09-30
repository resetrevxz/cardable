# Stage 5 — Reveal and collection report

## Done

- Completed `tearing → rising → preFlip → flipping → settling → revealed → collecting → idle`. The temporary empty `torn` endpoint is replaced after the existing tear/fall track completes.
- Added controlled card presentation without changing the ten-layer stack or normal gallery keyboard flip/stamp behavior. The reveal is approximately 62 vh, constrained to the viewport, with one full card at a time.
- Rise/anticipation/flip read each rarity's reveal values. Common is 900/0/750 ms; Legendary 1300/450/1300 ms; Secret 2000/500/2200 ms. Bloom and grid dim use the same records; the background retains a card halo at Secret's full dim.
- Added the single white 700 ms diagonal shine in the existing glare layer, spring-like flip overshoot, glow suppression during flipping, landing bounce, bounded dust, and handoff to pointer tilt.
- Added ordered name/serial/specs/badge/meter presentation, New or actual duplicate count, and phase-gated Keep with held-key/repeat protection. Secret uses Found without prematurely granting ownership and has its 400 ms scrambling back-logo cue.
- Intermediate Keeps durably save `pendingReveal.keptCount`. Final Keep inserts the whole pack once and clears pendingReveal atomically. Failed writes retain the current card for retry. Stock, serials, opening statistics, timestamps and resolved results are preserved.
- Old pending saves without keptCount recover as zero. Any committed phase reloads directly to the current unkept card with Keep available, without another pull. A reload after final Keep returns to the saved inventory/menu.
- Added one 900 ms collection with staggered lite thumbnails, one arrow pulse, a 2.4 s glass toast, 200 ms delayed menu return, remaining-pack handoff and restored idle control. Timer and tab-title behavior continue using real state.
- Added live reduced-motion and hidden-tab handling, collection resize retargeting, reset cleanup and replay of the same committed result.
- Verified through the real classic scripts in a Node VM with instrumented DOM/storage/clocks:

| Checks | Passed |
|---|---:|
| Stage 0 console checks | 6 |
| Stage 1 | 15 |
| Stage 2 | 13 |
| Stage 3, tiers 4–6 / 7–9 / 10–12 | 14 / 15 / 15 |
| Stage 4 | 18 |
| Stage 5 charge/cut/tear regression | 26 |
| Stage 5 reveal/collection | 24 |
| JavaScript syntax | 54 files |

The behavior totals are 140 groups plus the six Stage 0 checks. These are behavioral/scheduling checks, not browser rendering measurements. No harness application errors were logged. Existing config values and every data file were compared with the baseline and remain unchanged; only named presentation tuning was added in `config.revealMotion`.

## Skipped or changed

- `references/01-shine.png` is missing. As selected, implemented the written reference: original white, soft edges, approximately 20 degrees, corner-to-corner, approximately 700 ms. The unrelated supplied weapon image was not used as card art or a shine reference.
- Screenshots, visual critique of rendered screenshots, material appearance and measured 60 fps are unconfirmed. The existing file preview restriction was respected; no alternate browser, local server or indirect screenshot route was used to bypass it.
- Reload recovery now resumes at revealed/Keep, replacing the first-half cutting checkpoint as required by the completed Stage 5 specification. The dev replay control now replays the committed reveal through cutting without rerolling.
- No tutorial, inventory sheet/detail view, market, audio or variants were added.

## Look at

1. Double-click `index.html`, append `?dev=1` to its file URL, and use the real dev controls. Force Common, hold Space for three seconds, then drag the wrapper or press Enter to tear. Check its quick rise/flip, no anticipation pause, white diagonal shine, information sequence and Keep.
2. Keep the card. Check thumbnail flight to the visible inventory arrow, one pulse, glass toast, remaining pack sliding forward and menu return. Open the same Common again to compare New versus x2 pacing.
3. Grant stock as needed and force Legendary, then Secret. Legendary should have a longer hold, warm direct bloom in color mode and slower flip. Secret should have the longest buildup, scrambling back logo, black/white Found finish and full background dim with a retained halo. Cursor glow should be absent throughout each flip.
4. At Keep, toggle color/mono. Use Replay committed reveal to repeat the same saved result. Neither control should alter stock or serials.
5. Refresh during any committed phase: the same card and serial should appear immediately with Keep. Refresh during collection: inventory should already contain the card and the menu should return without another opening.
6. Change reduced motion during a reveal, hide/return to the tab during flip or stamping, and resize during collection. Check no restored back covering the front, no skipped animation time, clipped shine, contained layout and no console errors.
7. Inspect the dev FPS readout while the full card is active. Smoothness and actual 60 fps still require this browser check. The gallery sampler's simulated 60 Hz result is not a rendering benchmark.
8. Multi-card behavior is covered by an isolated three-card fixture in `tools/check-stage5-reveal.cjs`; production pack data still gives one card. It checks intermediate recovery, repeated-card labels, three unique serials, one final write/collection and three staggered lite flights.

## Open questions

- Defaults followed: monochrome chrome/direct rarity accents (#3); one card with support for more (#4); fixed charge with rarity-scaled reveal (#5); 12-segment meter (#6); serial format (#7); empty-tier downgrade (#8); display-only duplicate stacks (#12); VRAM plus three specs (#18); local font fallbacks (#19); desktop scope (#21); serial on both faces (#22).
- Accepted pacing interpretation: New adds 200 ms to the final reveal hold. Low-tier duplicates shorten motion durations by 15%; shine duration, information delays and Keep readability timing remain intact. Tiers 7+ retain their full motion durations.
- Accepted multi-card presentation: staggered thumbnails inside one collection phase, with one summary toast and one arrow pulse. Inventory is granted at final Keep; earlier Keeps remain durable progress inside pendingReveal.
- No further product decisions are required for this stage. Supplying the named shine reference and performing the browser acceptance checks would close the remaining visual uncertainty.
