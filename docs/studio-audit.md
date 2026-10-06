# Studio audit — Director 2 milestones A and B

Read the current AGENTS/Designs, complete Director 2 brief, archived original Inspect brief and all 22 files under src/studio. This is an expansion of that implementation. Findings below originate from source review; the final single runtime session and logic check are recorded separately. Version 1.0.0 is retained; publication is held at the owner's request.

| ID | Finding / reproduction | Location | Severity | Resolution / boundary |
|---|---|---|---|---|
| A01 | Undo stores only anonymous snapshots, caps at 50, and has no click-to-jump list. Drag followed by another action can create unclear steps. | scene.js, studio.js, ui/panels.js | High | Command history with do/undo, named grouped edits, timestamps, 100-step bound and History panel. |
| A02 | Preview/seek/pause write authored director flags before beginning an edit; undo can restore unexpected preview/playhead changes. | director.js, ui/panels.js | High | Transport state remains session-local; explicitly snapshot it for saves/photos. Commit edits before materializing a pose. |
| A03 | Missing and duplicate IDs are normalized only across lights/props; reserved camera/card IDs and arbitrary selector characters can collide or break key focus. | scene.js, ui/director.js | High | Stable reserved IDs, globally unique IDs, bounded groups, safe focus lookup and deterministic v1 migration. |
| A04 | v1 parser rejects newer versions and has no grouping or general animation model. | scene.js | High | v2 parser/migration, sorted-key serializer, canonical hierarchy and bounded animation data, preserving old camera/light tracks. |
| A05 | Selecting gizmos during playback uses authored rather than displayed matrices; animated prop handles ignore the sampled prop. Drag math changes if the viewport resizes mid-drag. | ui/gizmos.js | High | Use the displayed pose; stop/make editing pose explicit; use the drag's initial viewport rectangle; cancel drags on resize. |
| A06 | Locked gizmo focus can make hidden handles tabbable; prop picking can select a prop behind the card. | ui/gizmos.js, props.js, studio.js | Medium | Respect hidden/locked handles and card occlusion; keep nearest visible object selection. |
| A07 | Orbit yaw grows without bound while inspector yaw only spans +/-180 degrees. Plane intersections behind the camera are accepted. | camera.js | Medium | Wrap yaw consistently, retain clamped pitch, reject backward intersections. Euler rotation remains the original bounded implementation; advanced local/global handles belong to B. |
| A08 | Simple draw resets canvas dimensions on every change; tile draw leaves a nonidentity transform if the same renderer later draws normally. | renderer.js | Medium | Resize only when dimensions change; explicitly reset drawing state. |
| A09 | Slots/current face can mismatch after load/reset/undo because only info-plate changes trigger repaint, and selection/JSON drafts can be stale. | studio.js, ui/scenes.js | High | Validate selection after replacement, repaint for printed identity/plate changes, refresh JSON after scene loading and export deterministic JSON. |
| A10 | Render copies duplicate full scene metadata; shadow invalidation includes unrelated card identity fields. GPU targets remain allocated after optional passes disappear. | scene.js, renderer.js | Medium | Bounded render copies, focused shadow signature, release optional pass storage; all resources remain session-owned. |
| A11 | Hardware texture edge can be lower than tier face height (7/5 of width); fallback renderer after WebGL context failure can try 2D on that same canvas. | card-face.js, renderer.js | High | Clamp uploaded texture dimensions to hardware and tier; use a fresh fallback canvas. |
| A12 | Quality changes while open are ignored; no studio override/future Very High entry exists. | scene.js, studio.js, ui/panels.js | Medium | Studio quality adapter/override; Very High is reserved and dimmed until E's renderer/capability gate. Global preferences are untouched. |
| A13 | Static High has no progressive refinement; continuous decorative material animation prevents sleep even with ambient animation disabled. | studio.js, renderer.js | Medium | Shared-clock bounded refinement and explicit lower-tier Refine; obey animation preference and sleep after convergence. Preview uses 16 camera/light jitter samples; advanced bokeh, export accumulation and Very High belong to E. |
| A14 | Copy/download bypass Electron's native bridge. | photo.js, ui/scenes.js, recording.js | Medium | Use the available native text clipboard for JSON. This checkout has no native blob-save/image-clipboard API; existing image/clip browser fallbacks remain. Native file/image bridge and folder/image-sequence delivery belong to E. |
| A15 | Album refreshes race; metadata assumes every legacy blob/thumbnail exists. One broken record can hide all photos. | album.js, ui/album.js, ui/photo.js | Medium | Tolerate legacy metadata/thumbnail absence, serialize refresh results by revision, invalidate pending selection on deletion. Never delete old photo data. |
| A16 | Photo and recording jobs disable many controls but details summaries/gizmos can still take focus or shortcuts; Space overrides focused button activation. | studio.js, ui/photo.js, ui/director.js | Medium | Scoped text/native control keys, inert timeline during photo capture, disable blocked handles. Actual recording is not triggered under the testing policy. |
| A17 | Only six of eleven variants have studio ports; other coatings show limited preview. | materials.js, ui/panels.js | Fidelity gap | Retain honest limited-preview note. Ports remain Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam. Additional ports are not A scope. |
| A18 | Very narrow headers overflow when adding another history action; long names/values and tiny action targets need bounds. | studio.css, ui/panels.js | Medium | Compact/wrapping header and bounded History list, readable fields, coarse-pointer targets. Larger Simple/Pro layout belongs to B. |

## Coverage and limits

Lighting uses every effective light in the existing diffuse/specular paths; scene normalization and tier clipping preserve authored objects. DOF/post are existing High-only approximations. Photos use origin-clean painted faces, bounded tiles and immediate readback; requested dimensions include frames. Album capacity is checked in the write transaction; quota failures offer download. GPU programs/buffers/textures/framebuffers, pending art and collection decodes have explicit exit owners. Safe light animation remains soft and capped by the existing strobing profile.

Source review is not a measured GPU leak/profile or a visual fidelity guarantee. Repeated studio entries, 2K/4K product capture, actual recordings, Electron dialog execution, exhaustive skin/variant combinations and physical-device behavior are not additional runtime acceptance in this A run. No old tests, new test files, screenshots or profiling.

## Milestone A evidence
Testing: one studio session exercised grouped scrubs, Undo/History jump, playback through resize, High refinement and exit with no console errors; checkStudio2 ran once and passed 16 assertions in 8 ms; no old tests, test files, screenshots, recordings or profiling.

Local desktop delivery was attempted once from the isolated 1.0.0 worktree and stopped before building because its @electron/asar dependency is absent. No installer, shortcut or old build was replaced; cleanup and desktop handoff remain pending. Main-game source is integrated, while the separate main checkout's pre-existing staged 1.0.1 release edits remain untouched.

## Milestone B audit (before implementation)

| ID | Finding / reproduction | Location | Severity | Resolution |
|---|---|---|---|---|
| B01 | Scrub a camera key, then edit: the sampled camera loses reserved id, hierarchy and locks. | director.js | High | Preserve authored metadata while sampling numeric camera pose. |
| B02 | Throw inside an edit, then edit again: rollback leaves an open history transaction. | studio.js, scene.js | High | Explicit transaction cancellation and exact pre-edit rollback. |
| B03 | Right-click in the studio: the global capture listener consumes the event before the stage can open a menu. | ui/context-menu.js | Medium | Add a small scoped surface delegate; studio owns its menu and lifecycle. |
| B04 | Old navigation maps left-drag to orbit and right-drag to pan, blocking marquee/multi-selection and Blender-style navigation. | studio.js, ui/gizmos.js | Medium | Scoped workspace interaction, multi-selection, transform handles and shared-clock view transitions. |
| B05 | Selecting another object tears down the timeline and its focus, even on Animate. | ui/panels.js | Medium | Preserve the Animate dock independently of the inspector and reuse its existing transport/editor. |
| B06 | Simple controls, working-scene autosave, linked numeric axes, searchable library and scoped command palette are absent. | studio UI | Missing basic | Add B workspace and owned debounce autosave; retain the existing renderer and photo pipeline. |

## Milestone B final review

| ID | Finding / reproduction | Location | Severity | Resolution |
|---|---|---|---|---|
| B07 | A new orthographic/top view makes the old background ray, DOF depth reconstruction and polar camera basis unsuitable; nonuniform subject scales need a normal correction. | camera.js, renderer.js, photo.js | High | True orthographic projection with stable top-view basis, near/far rays, linear ortho depth and inverse-transpose normals; exports preserve the projection. |
| B08 | Filmstrip controls hidden only with CSS remain in the custom focus list; inactive transform handles can retain tabindex. | ui/workspace.js | Medium | Explicit filmstrip hidden state and inactive-handle aria-hidden/tabindex, including inspector changes. Final focus fix was source-reviewed after the single session opened. |
| B09 | Dropping a library item creates separate Add and Place commands, so Undo leaves a newly added item behind. | studio.js, ui/workspace.js | Medium | Pass the optional position to the existing additive Add operation: creation and placement share one command. Final fix was source-reviewed after the session opened. |
| B10 | Mood multiplies lens values beyond canonical limits; normalizing a save can subtly change the look. | ui/workspace.js | Medium | Clamp each lens value to its existing scene limits while keeping an immutable mood baseline. Final clamp was source-reviewed after the session opened. |
| B11 | An all-disconnected thumbnail queue can retain a temporary GL renderer; a first-edit autosave timer is not a true debounce. | ui/workspace.js | Medium | Release the empty queue's renderer and restart the single owned four-second timeout on commits. Exit cancels it. |
| B12 | Shortcut help initially contained clickable informational entries with no action. | ui/workspace.js | Medium | Give shuttle, work-area, marker and order commands the same scoped actions as their keyboard shortcuts. |

## Milestone B evidence and boundary

Testing: one main-game file:// studio session exercised Simple style/Mood/angle/Spin, Pro pages, group/multi-selection and snapped movement with Undo/Redo, command search, library search, top/ortho view, bounds/guides/crop, linked scale fields, context actions, resize, playback and exit with no console errors; checkStudio2 ran exactly once and passed 20 assertions in 9 ms; no old tests, new test files, screenshots, recordings or profiling.

On exit the studio DOM and all session command registrations were gone. Source owns only the shared studio subscriber, bounded thumbnail work and a cancellable autosave timeout. This is lifecycle evidence, not a measured performance or physical-device certification. Final small focus/drop/clamp/thumbnail/help fixes were source-reviewed; the running session was not reloaded or reopened. Photo/clip recording, native dialogs, repeated sessions, exhaustive variants and physical DPI remain outside this run's acceptance.

B provides workspace shells for all six Pro pages; Look and Deliver reuse their current controls. The seven existing styles and four basic shot buttons are a bridge to C's authored catalog. C still owns the 24 styles, card-aware adaptation, new looks/rigs/moves/prop/animation sets, user presets and gallery. Full typed tracks, graph editing, shots/transitions and titles remain D; new Look rendering, Very High and upgraded exports remain E; final accessibility/polish remains F.

Selection convention: Shift-left drag in Select is additive selection/marquee; Shift-right/middle drag or Shift-drag in Camera/transform mode pans. Tab switches workspace from stage focus; normal controls keep native Tab navigation. Collection duplicates reference owned instances and do not mint inventory cards. Workspace preferences are optional; scene v2 and the global save schema are unchanged.

The spec remains in alpha-updates/1.0.0-director-mode-2 from A; B continues that folder without changing an update number. Main source integration uses the existing index.html entry and lazy classic-script list. Protected pack/cutscene files were not edited. The separate main checkout's pre-existing 1.0.1 release work was preserved; this isolated feature is committed under 1.0.0 and no publication/tag/version advancement was performed.

Local desktop delivery was attempted once for B from the isolated 1.0.0 worktree. It stopped immediately because @electron/asar is absent, before replacing an installer, shortcut or old build. Desktop packaging/cleanup/handoff remain pending; the previous Cardable (Latest Build) delivery is preserved.
