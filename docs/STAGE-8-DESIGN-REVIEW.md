# Stage 8 design review

This is a source/layout and behavioral review. No rendered screenshots are available through the permitted browser surface: the established `file://` preview restriction remains in effect. The observations below identify hierarchy and material decisions that can be inspected in code. They are not claims about unseen pixels or measured browser paint performance.

## Screen review

| Screen/state | Review | Change or retained decision | Human visual check |
|---|---|---|---|
| Ready/waiting menu | The pack remains the single focal object, with quiet corner chrome. Adding permanent save buttons here would weaken that hierarchy. | Save/display controls live inside Collection, with Ctrl/Cmd+, access. Shadow/float phase stays unified; rolling digits now stagger. | Check pack glass opacity, shadow softness and 32 px safe margins with missing fonts. |
| Tutorial | Copy and the highlighted action should carry the lesson; animation must not become another task. | Existing copy, real-pull sequence and static reduced-motion halo/ghost are retained. Settings pauses the lesson, and its Esc cannot skip it accidentally. | Check instruction placement through charge, cut, Keep, inventory and timer. |
| Charging/draining | Fill communicates elapsed commitment. Cancelled actions should visibly release their tension. | Existing charge/drain timing retained; reduced motion uses plain fill/fades with no vibration, slosh, particles or hold pulses. | Check fluid boundary, keycap, early-release light falloff. |
| Cutting/tearing | The seam must feel continuous and direct. Extra chrome would compete with the blade. | Existing press/drag and Enter fallback retained. New focus styling does not force an outline onto the noninteractive tearing wrapper. | Check capture cleanup, curved seam, split boundary and reduced-motion tear. |
| Rise/anticipation/flip/settle | Rarity pacing is already strong; an additional saturated effect would be excess. | A faint neutral vignette supports tiers 7+, the original white sweep stays inside glare, and first-pull bloom is slightly fuller. Duplicates omit dust. Timings remain data-driven. | Compare Common, Legendary and Secret in both modes; check the sweep and cursor suppression. |
| Keep/collection/toast | Keep remains the sole primary action. Collection should close the interaction without demanding attention again. | Existing one collection commit, thumbnail flight and glass toast retained; reduced motion fades rather than travels. New hover/press/focus treatments preserve geometry. | Check one toast/pulse, multi-card flow, and no toast overlap with essential controls. |
| Collection sheet/shelf | A shelf has spatial memory. Stable widths and continuous centering matter more than extra labels. | At most 13 card visuals, one full card, fading reflections and a drag-responsive top highlight. Missing-card generation labels now retain readable contrast despite peripheral dimming. | Check reflection clipping, top-edge weight, 300-tile motion and text legibility. |
| Detail/serial browser | The same card should visibly leave and return to its slot. Specs support the object rather than surround it with controls. | Shared-node lift retained; modal keyboard focus contained. Tilt receives subtle art/foil parallax. Duplicate instances use the same pose and a short crossfade. | Check card/info balance, serial alignment, front/back continuity and resize. |
| Finish gallery | Diagnostic density is appropriate here; pairing color/mono must stay independent of normal settings. | Paired finishes remain independent, one full view at a time. Static lite highlight/grain make comparison useful before hovering. | Check all finishes, found/unfound Secret, off-screen suspension and actual GPU load. |
| Save/display/import/recovery | File operations must clearly state what they will replace, while keeping the game visually quiet. | A compact frosted dialog, import summary, explicit Replace save, previous-save backup, readable recovery notice, live motion/color preferences, and focus restoration. | Check native download/picker, readable errors, Tab order and 200% zoom. |

## Ranked material/motion work

Following the backlog's ranking, after save and accessibility fixes:

1. **One light source.** Preserve the top-left lamp vector across glare, keyline, edge and shadow. Audit glass highlights and bottom-right cast shadows together.
2. **Card depth.** Add 2 px art parallax with a smaller foil counter-movement; text remains the stable reading plane. Reduced motion removes it.
3. **Gradient texture.** Add one static 2.5% local SVG grain image on card bodies; no noise animation or extra card layer.
4. **Lite material.** Bake a restrained top-left glare so static shelf cards still read as metal.
5. **Anticipation.** Add a faint neutral vignette to high-tier preFlip, driven by the existing anticipation clock.
6. **New/duplicate pacing.** Retain New's existing longer hold, strengthen its bloom subtly within the existing accent rules, and suppress duplicate dust.
7. **Pack grounding.** Retain the existing shadow breathing from the same float phase, avoiding competing oscillations.
8. **Number precision.** Stagger changed digits by 20 ms, clamp delayed progress to zero, and keep reduced-motion changes static.
9. **Quiet brand life.** Retain the already-implemented queued idle wave that never reveals faded UI on its own.
10. **Sheet contact.** Brighten the existing 1 px top edge while captured, then restore its resting alpha on release/cancel.

Lower-ranked existing-stage items were also completed: continuously fading reflection, static global grain, ready favicon, and hover geometry audit. Audio and touch mapping remain explicitly deferred under AGENTS.md and desktop scope.

## The detail people would feel missing

The light should not reset when a shelf card becomes a detail card. Reusing the same node, keeping the same top-left lamp and adding only a short white sweep preserves its identity through the lift. That continuity matters more than another visible flourish.
