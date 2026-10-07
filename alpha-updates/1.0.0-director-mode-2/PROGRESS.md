# Director mode 2 — milestones A–E

Application version remains 1.0.0. Publication and version advancement are held at the owner's request. B continues the feature folder created in A; the spec is not moved or renumbered again.

A: completed command history, canonical scene v2 migration, hierarchy/animation storage, resize robustness, quality override and bounded preview refinement.

B: completed the Simple/Pro workspace expansion on the existing renderer. Simple has actual-card cached thumbnails for the seven existing styles, Mood, Light angle, four editable shots, Photo and Record. Pro has six pages, hierarchy/multi-selection, searchable/tagged/favorite/drag library, collapsible and resizable panels, scrubbable number fields and linked axes, local/global transform handles, snapping/alignment guides, grouping/duplicate/array/arrange tools, material/preview/bounds views, composition guides and crops, orthographic Front/Side/Top views, scoped commands/context menu/shortcuts and debounced per-instance working-scene autosave. Main index.html already loads the studio entry; B's owned sources are integrated through its lazy list.

C: completed the authored six-kind catalog (24 styles / 12 rigs / 13 moves / 10 looks / 8 prop sets / 9 animations), per-preset card-aware rules and raw-art brightness adaptation, visible real-renderer thumbnails, searchable/tagged/favorite/recent/similar browser with seeded Surprise/Remix, canonical user preset library and import/export/native text-copy, and the 168-cell dev reference gallery. Simple stays a compact style carousel with four shot buttons; Pro exposes editable preset channels. All applications use one undoable kind-aware path with Replace/Add and lock/owned-instance guards.

Remaining milestones:
- D: implementation complete in this run; grouped property timeline, key/selection/timing tools, easing/Bezier graph, editable world/screen paths, multiple cameras/shots/transitions, focus/handheld/dolly helpers, and eight timed title presets. Runtime acceptance remains bounded by the camera-walkthrough timeout recorded below.
- E: advanced grading/Look controls, hardware-gated Very High renderer, larger progressive render stills, native image/file/folder bridge, clips/image sequences and album upgrades. Look/Deliver pages currently reuse existing controls; Very High remains reserved and dimmed with A's future-global hook.
- F: final polish/accessibility and complete bug pass. The same manually invoked checkStudio2 is extended in B; do not add another check file or function.

Assumptions and retained boundaries:
- The original Inspect spec is the archived 2.6.0-inspect-director copy.
- Tab switches Simple/Pro when the stage has focus; normal controls retain normal keyboard navigation. Shift-left drag in Select adds/selects; Shift-right/middle drag and Camera-mode Shift-drag pan.
- Groups are containers over the existing world transforms. D owns full hierarchical animation editing.
- Browser export fallback remains because the current native bridge lacks arbitrary image/blob/folder save contracts; E owns that expansion.
- Existing six coating ports are retained: Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam. Other coatings keep the limited-preview note; C adds no gameplay coating port. Its Gold Foil gallery cell is a studio-only reference fixture because the game catalog has no Gold Foil variant.
- No save schema bump, version-file edit or shared cutscene/pack edit.

Audit and acceptance are recorded in docs/studio-audit.md.
Testing: one file:// studio session passed with no console errors; checkStudio2 ran exactly once and passed 25 assertions in 13 ms; no old suites, test files, screenshots, recordings or profiling. Final resource/focus/first-entry gallery corrections were source-reviewed without reopening studio.

The one required local desktop delivery attempt stopped before building because @electron/asar is absent in the isolated worktree; the previous installer and Cardable (Latest Build) shortcut remain intact. Desktop packaging, cleanup and handoff remain pending.

Gallery: open main index.html with ?dev=1&gallery=presets, then Inspect an owned card. The legacy developer gallery no longer disables inventory/detail for this studio route. First-entry automatic activation is source-reviewed; manual gallery entry was exercised in the single session.

D (2026-10-07): implemented the animation expansion on update/director-mode-2-d and integrated owned sources through the main index.html lazy entry. Continue the existing 1.0.0 hold; do not renumber the folder or release/tag this update. Old scene/photo parsing and the save schema remain compatible. E and F remain unfinished.

Testing D: one file:// studio entry confirmed keys, graph handles, editable paths and custom titles with no console errors before a browser-control timeout; checkStudio2 ran exactly once, 37 assertions passed in 19 ms; no old suites, test files, screenshots, recordings or profiling. No second studio entry or check rerun followed the final source-review corrections. Shot compositor pixels, playback, exit cleanup, native clipboard and output files remain runtime-unverified.

D assumptions: world-space group deltas; normalized screen-space title paths; nine-waypoint conversion retains conflicting camera channels disabled; overshooting easing styles retain their authored character while light playback obeys the profile/speed guards. Scalar camera focus distance supplements the existing focus point. Six existing variant ports remain unchanged. See docs/studio-audit.md for D01-D10, implementation details and precise acceptance limits.

D desktop delivery was attempted once and stopped before building because @electron/asar is absent. No previous installer/shortcut was replaced; desktop packaging/cleanup/handoff remains pending.


E: implemented Look grades/wheels/curve/lens controls, cheap luminance scopes and session split; hardware-gated Very High with sixteen lights, 4096 card textures, 2048 shadows, SSAO/SSR/shaped DOF, preview/rest scaling and half-float accumulation. Deliver extends Photo with supported 8K/Poster, cancellable tier-bounded progressive stills, 60 fps/portrait/square/loop real-time presets, original frame-stepped WebCodecs/WebM output, numbered PNG sequences, optional Very High motion blur, and native file/folder/PNG clipboard fallbacks. Album adds optional tags/search/filmstrip/compare/selection/sequential saves/storage meter/folder export, keeping existing IndexedDB and scenes. The shared scheduler owns all render progress; no studio clock continues after exit.

E audit: E01–E11 and precise source/runtime boundaries are in docs/studio-audit.md. Existing six variant ports remain unchanged. Worktree/branch: director-mode-2-work / update/director-mode-2-e; stage 28 remains 1.0.0, with no release/tag or update renumbering. Main integration uses its existing index.html studio entry.

Testing E: one main-index file:// session covered Look/scopes/split, refinement, Very High, Deliver/album controls and cleanup without console/WebGL errors; checkStudio2 ran exactly once (43 assertions, 18 ms); no old suites, test files, screenshots, photos/recordings or profiling. Final capability/frame/exit/Simple/preset/clipboard corrections are source-reviewed; exports, native actions and populated-album acceptance remain unverified.

Desktop delivery E: attempted once, blocked before packaging by missing @electron/asar. Previous delivery remains intact; packaging/cleanup/handoff pending. F remains unfinished: final polish, accessibility and final bug/acceptance pass.
