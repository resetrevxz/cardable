# Studio audit — Director 2 milestones A, B and C

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

## Milestone C audit (before implementation)

| ID | Finding | Resolution |
|---|---|---|
| C01 | Surprise uses unseeded Math.random; only seven scene styles and one look are browsable. | Explicit authored catalog, deterministic seed and family-constrained remix. |
| C02 | Preset format forces every kind into a whole scene and optional save normalization drops user preset storage. | Canonical typed preset snapshots and bounded optional user/favorite/recent state. |
| C03 | Style emits success inside a transaction; rig replacement leaves orphaned animation targets; Add drops referenced collection identity. | One atomic kind-aware application path, track cleanup, ID remapping and owned collection filtering. |
| C04 | Typed preset channels other than card tilt cannot play or be edited. | Bounded property sampler and generic preset-key editing; full timeline tooling remains D. |
| C05 | Mood ignores grading contrast and style transitions only tween camera/lights. | Immutable mood baseline and neutral-compatible grade interpolation. |
| C06 | Thumbnail queue eagerly renders offscreen tiles and grows with search/filter rebuilds. | Visibility-driven shared-clock queue with bounded cache and explicit resource release. |

| C07 | The legacy developer gallery treats any gallery query as a standalone tier gallery and skips inventory/detail initialization. | Reserve gallery=presets for the lazy studio; retain legacy gallery routes. This tiny dev-runtime route fix is additive. |
| C08 | Gallery gating used a nonexistent config.dev flag; opening it before invalidating thumbnails discarded its queued tiles. | Use the actual developer capability and queue the gallery after invalidation. Source corrected during the single session; manual gallery entry exercised it without reopening studio. |

The already moved spec remains in the 1.0.0 feature folder. C continues this folder under the owner's version hold. Main's existing art-data, lighting and material inputs retain their contents and original line endings.



## Milestone C final review and evidence

C adds 24 individually authored styles in six families, 12 rigs, 13 camera moves, ten grading looks, eight prop sets and nine animation presets. Styles carry individual palette/rim/foil/Classic adaptation rules; a bounded raw-art luminance sample drives dark-art rim compensation. Complementary accents, foil intensity limits and softer/warmer Classic lighting are studio-only. Every preset kind produces canonical scene data; camera/animation presets produce editable keys. New grading values default to neutral when loading old scenes/photos. Very Low uses brightness/contrast/saturation fallback; full grading runs in the studio post pass. E still owns advanced Look tools and rendering quality.

The shared browser offers search, family/mood/color tags, favorites, recents, similar styles, deterministic seed-based Surprise/Remix, and a 32-preset user library with save/rename/duplicate/delete/favorite/import/export and native text-copy support. Native arbitrary file dialogs are absent from this checkout's bridge, so import/export use browser fallbacks. Imported scene references are bounded and collection props only retain owned serials. Replace/Add asks once per studio session, can be reset in the browser, and each application is one history command. A look replaces its grading component; Add for object sets keeps the existing camera/look. Appending a move respects the 15-second limit and fails visibly if no time remains.

The reference gallery contains all 24 styles × Basic, Holographic, Matte, Cosmic, Gold Foil, Classic and Legendary. Open the main index with ?dev=1&gallery=presets, then Inspect an owned card; rendering stays inside the studio session. Cosmic uses the existing Galaxy Holo port. Gold Foil has no gameplay variant in the current catalog, so its gallery cell is an explicitly studio-only foil reference fixture; it adds no inventory item, registry entry or gameplay coating. Other variants retain their existing limited-preview status. Final first-entry route/gating/queue fixes are source-reviewed; the session exercised the gallery manually after correcting the route flag in memory, without reopening studio.

| ID | Final finding | Resolution / acceptance boundary |
|---|---|---|
| C09 | Reference switches rebuilt shader programs and a two-face cache repeatedly repainted the same seven references. | Reuse the thumbnail renderer's programs/geometry while replacing four owned face textures; retain at most seven reference faces and 72 small cached previews. Final resource optimization is source-reviewed without an additional session or profiling. |
| C10 | A preset dialog could leave underlying workspace controls active, and text clipboard bypassed the available native bridge. | Own and restore inert states for underlying surfaces; contain shortcut bubbling; use Cardable.native.system.copyText with browser fallback. Final focus/clipboard changes are source-reviewed. |
| C12 | The new shard mesh uses glass faces; the existing transparent pass initially admitted only glass cases. | Include shards in that existing pass and exclude them from the opaque mirror pass. Final correction is source-reviewed without another studio session or check run. |
| C11 | Reducing duration only clamped legacy keys; typed keys/work area/markers/shots could exceed the new duration. | Clamp their ranges together. Full timeline tools remain D. |

Testing: one main-game file:// studio session exercised the 168-cell gallery, preset browsing/search, Replace/Add prompting, styles/camera moves, generic Float key editing, warm grading, user save/rename/duplicate/favorite, resize and exit with no console errors; checkStudio2 ran exactly once and passed 25 assertions in 13 ms; no old suites, new test files, screenshots, recordings or profiling.

The browser setup was recovered before studio entry after an automation timeout. The studio was entered once. On exit its DOM and scoped commands were gone. Final first-entry gallery routing, texture reuse, modal inert-state and text-copy fixes were source-reviewed; the studio was not reloaded or reopened. Runtime photo/clip output, native clipboard/dialog execution, exhaustive per-style taste review, physical devices and measured performance remain unverified, rather than certified by the gallery or source audit.

C's owned sources are integrated through the existing main index.html lazy entry. The only non-studio code change is one developer-runtime condition reserving gallery=presets for studio; legacy galleries are unchanged. Protected packs/cutscenes, main's unrelated changes, app versions and save schema were not edited. Feature commits stay on the 1.0.0 hold; the already-created feature folder is continued rather than renumbered. The main checkout's independent 1.0.1 version remains untouched.

Local desktop delivery was attempted once for C from the isolated 1.0.0 worktree. It stopped before building because @electron/asar is absent. No installer, Latest Build shortcut or old build was replaced; desktop packaging/cleanup/handoff remain pending. No release, tag or publication was performed.

Unfinished implementation: D's complete timeline/keyframe/graph/motion-path/shot-transition/title tools; E's advanced Look page, Very High capability/render implementation, progressive still/export/clip/image-sequence and album upgrades; F's final polish/accessibility/bug pass. C supplies only the editable preset channels and sequence metadata needed now, not D's full editing workspace.

## Milestone D — animation expansion (2026-10-07)

Implemented on `update/director-mode-2-d`, continuing the existing 1.0.0 feature folder. The main game's existing index.html lazy studio entry loads the new authoring modules; no second game entry was added. Only studio sources and owned audit/progress documents changed. Protected cutscene/pack files, application version files and the save schema were not edited.

Audit preceded implementation. Findings below include the live-session bug and final source-review corrections.

| ID | Severity / reproduction | Resolution |
| --- | --- | --- |
| D01 | Major: parse/save a string side key or boolean visibility key; both became numeric zero. | Preserve discrete values, exact endpoint changes, and all easing/Bezier data in canonical v2 animation storage. Reject malformed value shapes during sampling. |
| D02 | Major: use Beauty Pass shot metadata or a shot-only scene; shots were ignored and playback could be disabled. | Multiple named cameras, shot binding, cut/dissolve/dip/whip sampling, per-shot duration and blend length; playback availability includes shots, titles, shake and typed tracks. Preserve main camera identity when a shot uses another camera. |
| D03 | Major: animate backdrop color; the sampled object shared the authored backdrop. | Clone backdrop before sampling, retain authored tracks, and sample into render copies. |
| D04 | Major: record a typed-only animation with a trimmed work area. | Existing clip path recognizes all authored animation and starts at In, using work-area duration/speed within the original 15-second cap. Runtime recording was prohibited and remains unverified. |
| D05 | Moderate: assign Back/Step easing or a fast playback speed to light keys, or loop a very short range. | Soft light interpolation, profile- and speed-aware key spacing, smooth work-area closure, visibility fades applied after intensity, and static light pose for loops below the allowed cadence. Reduced motion still allows manual scrubbing. |
| D06 | Major, found live: key a property and refresh while the workspace retained the timeline. | Clear the retention flag before disposing/rebuilding the dock. Live correction confirmed one dock, functioning keys/curves/paths/titles and no console errors. Timeline-owned path resources are disposed on page switch/exit. |
| D07 | Moderate, found in the camera walkthrough: Snapshot camera rebuilt a collapsed camera section, hiding the next action. | Preserve the open/closed state of all timeline inspector sections across refreshes. The browser-control timeout ended the session before this correction could be exercised; source-reviewed without reopening. |
| D08 | Moderate: explicit position/rotation could override later orbit edits; auto-key also keyed their computed values unnecessarily. | Clear explicit camera pose on ordinary navigation, avoid redundant computed channels in auto-key/pose capture, expose channel muting, and retain conflicting channels disabled when generating a motion path or dolly zoom. |
| D09 | Moderate: authored group transform channels, titles, and additional cameras had no sampling/editing path. | World-space group deltas, full typed property editor, camera transform/FOV/focus/aperture channels, scalar focus-distance channel, screen-space title channels and timed title rendering. Object-click rack focus includes prop picking. |
| D10 | Moderate: custom camera-move presets could lose additional cameras/title bindings on application. | Import bounded camera/title objects and remap their track/shot identities in the existing kind-aware preset application. All actions retain the existing transaction/undo boundary. |

The Animate workspace adds a seconds ruler and frame readout (24/30/60 fps), speed, repeat, In/Out, zoom/scroll and snapping to frames, keys and markers. Camera/Card/Lights/Props/Look/FX/Titles tracks have diamonds, mute controls, collapse groups, drag/box selection, copy/paste, grouped retiming, time scaling, deletion and matching loop endpoints. The property/pose inspector authors keys and auto-key coalesces normal scene edits into command history. Legacy pose keys still play and have an undoable expansion into editable property tracks.

The graph editor includes numeric/vector component curves, key selection and draggable/keyboard Bezier handles, with monotone X handles and optional Y overshoot. Easing adds Step, Cubic In/Out/InOut, Back, Elastic, Bounce and Spring while retaining old easing IDs. The path overlay samples only while Animate's Motion path is open, caches unchanged geometry, exposes editable waypoints, and can generate an editable nine-waypoint camera/object path from existing motion. Titles also use normalized screen-space paths. Camera helpers provide seeded handheld motion, point/distance focus animation and dolly zoom. Eight title compositions use only Inter/JetBrains Mono, editable identity/custom text, and timed entry/exit fades. Preview, photo and existing clip title painting share the same painter. Dissolve buffers allocate only on an actual dissolve, shrink afterward, and release with the session renderer. No independent animation clock, watcher, profiler or shared cutscene helper was added.

Assumptions: groups retain B's world-space container model and animate a delta over their descendants; stored camera rotation uses radians and object/card rotations use degrees, matching existing storage. Back/Elastic/Bounce/Spring intentionally overshoot or reverse value progression; their normalized time is monotone and endpoints exact, whereas bounded curves have monotone values. Legacy motion-path conversion samples nine waypoints and retains conflicting authored channels disabled, so undo or channel toggles recover them. The held 1.0.0 folder is continued rather than creating another numbered update. Very High remains the existing reserved tier/hook for E. Six existing coating ports remain Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam; D adds no coating port.

Testing: one main-game file:// studio entry confirmed typed card keys, Bezier keyboard handles, path waypoint edits and custom timed titles with no console errors before a browser-control timeout; checkStudio2 ran exactly once (without another studio entry), passed 37 assertions in 19 ms; no old suites, test files, screenshots, recordings or profiling.

Acceptance boundary: the timed-out camera walkthrough did not confirm dissolve/dip/whip pixels or playback, exit resource cleanup, native clipboard, recording or photo output. The final section persistence, scalar focus distance, screen-space title paths, custom camera-move binding import and profile/speed loop guards are source-reviewed; the studio was not reloaded/reopened, and the logic check was not repeated after final source-review corrections. The named logic check covers the shot/transition calculations and eight title envelopes, not GPU compositing or visual taste on all cards/devices. These boundaries do not count as measured performance or full manual acceptance.

D implementation is complete. E remains: advanced Look tools/scopes/split, hardware-gated Very High rendering, progressive render still/output options, native image/folder delivery, clip/image sequence and album upgrades. F remains: final polish, accessibility and complete bug/acceptance pass. Keep those milestones separate from this implementation.

Local desktop delivery was attempted once for D from the isolated 1.0.0 worktree and stopped before building because `@electron/asar` is absent. No installer, Latest Build shortcut, previous build or player data was replaced; desktop packaging/cleanup/handoff remains pending. No release, tag or publication was performed.
