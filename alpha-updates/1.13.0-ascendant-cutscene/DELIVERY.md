# Ascendant Prismatic Dawn - milestones A and B

Milestone A was committed as `08fc340`. This revision completes milestone B (S4-S6) and stops before C. SPEC remains intact in this delivery folder.

## Built in B

- A continuous overhead camera arc and hexagon match, local 1.00-1.12 elastic pulses at 1.2-2.4 Hz, prismatic water rings and small camera kicks. Local light modulation is limited to the descriptor's 2.5%; no explosion flash was added.
- One WebGL SDF carries the hexagon through circle, 12-point star and two-ring/rising-chevron sigil. Thin RGB-split mandala lines, 2000/1000/500 instanced history streak quads, clockwise/curl motion and three upward FBM mist strata reuse the existing native engine, targets, post passes and resource lifetime. Pool geometry fades into haze before the clock. Canvas fallback includes the ritual; composition respects the portrait cinematic frame.
- The shared Mythical clock now supports a prismatic style: progressively drawn thin rings, 60 marks with 12 major lengths, XII/III/VI/IX in the existing mono font, counter-rotating ratchets, shared three-hand geometry, accelerating hands and a prismatic trail wedge. It aligns at 23.2 seconds and holds for 300 ms; its mechanical frames and wind hold together.
- Locally bundled, unmodified OFL Bodoni Moda for ASCENDANT only, with Georgia/Times fallback. Cached letter canvases use 0.35em tracking, 90 ms stagger, rise/12 px blur and 12-to-1 px pastel split convergence. A soft inversion mask sweeps in three seconds per pass; side readouts scramble-resolve and update no faster than 2 Hz. The star accelerates to at most two revolutions per second with shutter samples. Title triangle facets drift apart and contract into the core.
- Extracted Mythical's band-fragment primitive into shared `cutscene-text.js`, alongside seeded scramble and facet masks. The original Mythical band choreography uses the same helper. No second engine, timeline, skip system or post stack was introduced.
- Presentation-only B descriptor extension keeps sections, palette, pulse/clock/title controls and beats together. The shared runtime now supports distinct keys for repeated pulse/tick events. Four pulse beats and 48 major tick crossings accompany clockStart/clockAlign/titleIn/titleBreak. No durable/pull/reward logic changed.
- Dev play/scrub/jump now covers all fourteen S0-S6 sections and 28 seconds at Normal. Fast retains the existing 70% scale. Existing quality, Mono, hidden pause, skip and recovery architecture remain.
- B ends gently on the shared procedural Ascendant field, carries its age into the retained card background and uses the existing 400 ms direct flip. This temporary milestone ending contains no explosion. GPU resources retire at handoff.

## Exactly unfinished - milestone C

- S7 (28-31 seconds): 3-5 pleated aurora curtains/rising sparks, accelerating inward convergence, camera pull/push, clock-hand blur and progressive whitening; the 30.6-second shockwave/halo, anamorphic flare, 700 ms aberration envelope, exactly one bright flash and letterbox exit.
- S8 (31-32.5 seconds): final explosion-to-shared-background choreography and complete exact-frame continuity, card 0.96-to-1 materialization/soft bloom and drawn outer squircle aurora border. The shared field/retained-time foundation exists; this final sequence is not built.
- Full/Short/Off Cards setting applied to all cutscenes, specified Short choreography and prescribed three-second no-flash/no-shake light sequence. Existing reduced/static alternatives remain, not the finished C alternative.
- Short/Full dev toggle, safe-flash luminance-change graph and remaining auroraRise/flash/cardIn beats. The full 32.5-second film is unfinished.

No wider visual, FPS, narrow-screen, resize, context-loss, reload, skip or graphics-matrix acceptance is claimed from the single allowed launch. Those configurations were not exercised.

## Testing

One headed file:// game launch and one Medium/Normal dev-triggered playthrough reached the revealed card through all fourteen S0-S6 sections with WebGL2 and the local font loaded; zero console errors/warnings. No tests, screenshots or profiling runs.

## Focused Git checkpoint

The tracked A renderer/runtime/dev/CSS changes and B's new descriptor, shared text utility and bundled font are committed directly. Overlapping B changes to index.html, the previously uncommitted Mythical painter, Designs.MD and reveal docs are saved exactly in B-INTEGRATION.patch with LF-normalized byte hashes in B-INTEGRATION-BASE.json. They are already applied in the live workspace; do not apply twice. The patch applies with git apply --unidiff-zero against the milestone A live workspace plus its earlier revisions. The earlier A integration patch remains its prerequisite. This preserves the unrelated prior work rather than adding those entire revisions to B's commit.
