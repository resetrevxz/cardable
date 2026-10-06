# Director mode 2 — milestone A
Application version remains 1.0.0. No release/tag is requested.

A expands the existing studio with command history, canonical scene v2 migration, hierarchy/animation data, resize fixes, a studio quality override and bounded preview refinement. See docs/studio-audit.md for findings and the acceptance boundary.

Remaining milestones:
- B: genuinely simple default mode; Pro pages/library/inspector; advanced gizmos, snapping, arrange/group tools, commands and shortcuts.
- C: hand-tuned card-aware styles, rigs, shots, looks, prop/animation presets; live thumbnails, browser, user preset UI and gallery. A supplies only a scene-preset serialization foundation.
- D: typed channel playback/editor, tracks, expanded easing/graph, motion paths, shots/transitions and titles. Existing camera/light pose keys remain usable; v2 animation data is retained for D.
- E: grading/Look page, hardware-gated Very High renderer, render-still sample counts, native file/image clipboard bridge, clips/image sequences and album expansion.
- F: remaining polish, accessibility and final bug pass. The single manually invoked checkStudio2 exists in A for the required end-of-run check; extend its same function with newly implemented interpolation in D, rather than adding another check.

Assumptions:
- The original Inspect spec is the archived 2.6.0-inspect-director copy; its former incoming path was already removed by repository organization.
- A owns data grouping and group visibility/locking. Creating/grouping/arranging objects interactively belongs to B.
- Preview refinement is 16 camera/light jitter samples; larger render exports and new lens effects belong to E.
- The current native bridge exposes text clipboard but no arbitrary encoded-image clipboard or blob/folder save contract. Browser photo/clip fallback remains until E supplies that bridge.
- Existing six coating ports are retained: Rainbow Holo, Vertical Holo, Aurora, Matte, Galaxy Holo and Beam. Other coatings retain the limited-preview note.

Acceptance: the single studio session passed; checkStudio2 was invoked exactly once (16 assertions, 8 ms). Final source review also guards locked camera/group navigation and inherited Look locks without adding another runtime session. Physical DPI/driver behavior remains unverified. Local desktop handoff is pending because the isolated worktree lacks @electron/asar; the one required delivery attempt left the existing installer/shortcut intact.
