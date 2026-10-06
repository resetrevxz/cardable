# Secret — Fatal Exception, milestone A

## Done

- Moved the owner-supplied spec intact into this delivery folder. The concurrent Classic delivery uses 2.2.0, so Secret uses the next 2.3.0 folder.
- Added Safe (default) / Full in Cards settings, the shared profile helper, a three-second Full hold using the existing confirmation control, and the per-play Full pre-roll with Play full / Play safe and eight-second Safe fallback.
- Added a final-output limiter sampling 64x36 linear-luminance pixels each frame. It detects large-area opposing changes, constrains Safe rate/continuous alternation, and gates Full alternation, burst length, calm gaps and total strobe budget. Displayed output is remeasured after temporal blending. The dev Flash meter reports measured luminance, flashes/s, red flag, profile and PASS/WARN.
- Extracted shader compilation, uniforms, targets and the existing crystal bloom/composite shader into shared WebGL utilities. Mythical/Ascendant continue using the extracted implementation. The OS screen engine adds nearest upload, ping-pong feedback, tears, channel shift, pixel sorting, block quantization, datamosh controls, CRT, noise and the final composite. Medium/Low restrictions and context-unavailable fallback are implemented; B enables the dormant corruption controls.
- Built Acts A–C: the shared Basic corner fronts and common back engraving, a one-frame shadow skip, mid-flip cut at 2.4 s without the reserved face, black hold/cursor, original NorthStar POST, memory count, typed micro-stalls, SECRET contamination and 99% progress failure.
- Registered the renderer and warm-up through existing reveal hooks; reused shared timing, adaptive quality, beat events, skip and recovery. Added Secret playback, act scrub/profile/quality/rate and measured meter to the existing dev group.
- Added a shared deterministic Secret background used by the temporary final scene, retained backdrop and Found finish. Safe uses capped irregular sweeps and 800 ms crossfades between inversions spaced 4.8 s apart. Full keeps the lead/coverage cadence, bounded below two inversions/s. Lite views remain static. Card front, pull RNG, pack/reward/serial mutations and audio were untouched.

## Skipped or changed

- Stopped at milestone A. Its clean temporary endpoint is a 600 ms fade into the shared Secret field and the existing 400 ms direct flip: 11 s total at Normal, excluding pack charge. It does not claim to be the finished 40-second cutscene.
- B is unfinished: Acts D–F desktop/icons/cursor, NORTH assistant, seeded dialog avalanche, actual hung-window masks and trails, Task Manager/Explorer, era montage, icon physics, VRAM artifacts, stop screen, reboot and terminal/hex wall; corresponding beat events.
- C is unfinished: Acts G–H freeze/cursor swarm, tile collapse, CRT line/dot/black, pixel resurrection, glyph storm and six-letter lock, first inversion and exact 40-second continuous final-scene handoff. Also the authored Short route, complete four-second calm narrative, final quality/setting polish and Safe caps for Mythical/Ascendant. A currently has a restrained static-error fallback, not the final calm story.
- The requested Short sections add to 18.5 s including the full 4-second resurrection; the spec calls this about 16 s. C should preserve the listed section durations and document that total, not silently shorten the final field.
- Full playback verification remains unfinished. The single-launch check invoked Keep before action readiness after Safe, then timed out waiting for idle. The browser was closed without beginning Full. No second launch was performed.
- Existing dirty and concurrent Classic changes remain live and unstaged. Shared dirty integration edits are captured in A-INTEGRATION.patch with LF-normalized byte hashes; it is already applied to the working game. This avoids committing pre-existing work. Do not apply it twice.

## Look at

- The fake-out's ordinary Basic material and its interruption before the face; the readable POST decay and delayed 99% failure.
- The Full pre-roll and the measured meter in the next authorized playback. Wait for Keep readiness before advancing between profiles.
- B/C should continue this renderer, scene model, shared post chain and Secret field; do not replace the last scene with a separate wallpaper or replay recovery.

## Open questions

None for A. The explicit milestone boundary governs unfinished work. The global photosensitivity caps take precedence over any later act's conflicting burst examples.

Testing: one headed file:// game launch, Medium/Normal, dev Secret preview in Safe completed fakeout → black → boot → release with WebGL2 and retained backdrop; meter PASS, peak 1 opposing large-area change pair/s, red flag false, 0 warnings and 0 console errors. Full did not start because the between-profile advance timed out. No tests, screenshots or profiling were performed.

Milestone B implementation and its limited playback evidence: see B-DELIVERY.md.

## Milestone C checkpoint

See [C-DELIVERY.md](C-DELIVERY.md) for the completed C implementation and its outstanding runtime acceptance. The sole permitted C launch stopped during setup before either profile was triggered. C-INTEGRATION.patch is already applied to the live shared workspace and must not be applied twice.
