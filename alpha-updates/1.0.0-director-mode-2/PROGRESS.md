# Director mode 2 — milestones A and B

Application version remains 1.0.0. Publication and version advancement are held at the owner's request. B continues the feature folder created in A; the spec is not moved or renumbered again.

A: completed command history, canonical scene v2 migration, hierarchy/animation storage, resize robustness, quality override and bounded preview refinement.

B: completed the Simple/Pro workspace expansion on the existing renderer. Simple has actual-card cached thumbnails for the seven existing styles, Mood, Light angle, four editable shots, Photo and Record. Pro has six pages, hierarchy/multi-selection, searchable/tagged/favorite/drag library, collapsible and resizable panels, scrubbable number fields and linked axes, local/global transform handles, snapping/alignment guides, grouping/duplicate/array/arrange tools, material/preview/bounds views, composition guides and crops, orthographic Front/Side/Top views, scoped commands/context menu/shortcuts and debounced per-instance working-scene autosave. Main index.html already loads the studio entry; B's owned sources are integrated through its lazy list.

Remaining milestones:
- C: 24 hand-tuned card-aware styles; expanded light rigs, camera moves, looks, prop and animation presets; preset browser/adaptation; native-aware user preset UI and gallery. B deliberately reuses the seven existing styles and four basic shots, rather than claiming the C catalog is complete.
- D: full typed channel playback/editor, tracks, keyframes, easing/graph editor, motion paths, shot management/transitions and titles. B's typed card-tilt track supports Simple Spin; existing camera/light editing remains usable.
- E: advanced grading/Look controls, hardware-gated Very High renderer, larger progressive render stills, native image/file/folder bridge, clips/image sequences and album upgrades. Look/Deliver pages currently reuse existing controls; Very High remains reserved and dimmed with A's future-global hook.
- F: final polish/accessibility and complete bug pass. The same manually invoked checkStudio2 is extended in B; do not add another check file or function.

Assumptions and retained boundaries:
- The original Inspect spec is the archived 2.6.0-inspect-director copy.
- Tab switches Simple/Pro when the stage has focus; normal controls retain normal keyboard navigation. Shift-left drag in Select adds/selects; Shift-right/middle drag and Camera-mode Shift-drag pan.
- Groups are containers over the existing world transforms. D owns full hierarchical animation editing.
- Browser export fallback remains because the current native bridge lacks arbitrary image/blob/folder save contracts; E owns that expansion.
- Existing six coating ports are retained: Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam. Other coatings keep the limited-preview note; B adds no coating port.
- No save schema bump, version-file edit or shared cutscene/pack edit.

Audit and acceptance are recorded in docs/studio-audit.md.
Testing: one main-game file:// studio session passed with no console errors; checkStudio2 ran exactly once and passed 20 assertions in 9 ms; no old tests, new test files, screenshots, recordings or profiling. Final small focus/drop/clamp/resource/help fixes were source-reviewed without reopening the session. Physical devices, photo/clip outputs and native dialogs remain unverified.

The one required local desktop delivery attempt stopped before building because @electron/asar is absent in the isolated worktree; the previous installer and Cardable (Latest Build) shortcut remain intact. Desktop packaging, cleanup and handoff remain pending.
