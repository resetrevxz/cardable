# Director Stage 2 — Simple photography and preset alignment

This stage continues `feature/director-mode-update` in `D:/CardableV2/DirectorModeUpdate`, after Stage 1 commit `4d0e6d9`. It does not integrate into main, publish a release, run desktop delivery or replace the installed game. The owner’s Stage 2 attachment and additional preset-alignment request define the scope.

## Implemented experience

Simple Studio now has three real screens: **Choose a look → Make it yours → Capture your photo**. Navigation retains one live scene and history. The picture stays in a stable area while the side rail changes; narrow windows place that rail below it. The shared kit stepper supports arrows, Home, End and one Tab stop, and has a functioning gallery example. Advanced retains its existing tools, scene data and capture settings.

Look offers searchable, rendered tiles and everyday descriptions. The original 35 scenes remain, with their identifiers. Twelve new compositions bring the scene count to 47 and the complete six-category catalog to 115: Obsidian, Arctic Glass, Retro Computer, Platinum Vault, Royal Gold, Sakura Glow, Midnight Display, Deep Space, Analog Film, White Cyclorama, Emerald Laboratory and Sunset Horizon. They use different authored staging, lighting, palettes, camera positions and post processing. Profiles still adapt to the selected collectible and finish. Thumbnails use the active quality and photo shape.

Adjust exposes Brightness, Pop, Color and Warmth; More adjustments reveals Light areas and Dark areas. Each has a live slider, value, default mark, explanation and reset. Gestures use the existing one-command history. Reset adjustments keeps the selected look; Reset to preset rebuilds its authored composition. Comparison renders the chosen look before adjustments without editing the scene. Capture returns to the edited picture. Camera zoom/angle, Frame card, five photo shapes, background zoom/rotation/centering and exclusive View/Move background/Move card tools are functional. Background/card movement also accepts arrows and touch. Editing an existing Director pose retains the sampled camera/background and its timeline data. Move card releases camera follow/automatic framing when needed, so the move visibly changes the composition. Blur is available only at High or Very High WebGL.

Capture uses the existing renderer, encoder, IndexedDB Album and native/browser file routes. Fast, High quality, supported 4K and bounded Custom output work with PNG, JPEG and WebP. Shape, optional frame/caption/branding and destination have native labelled controls. Capture stays in the fixed footer. The image area updates for custom dimensions and output frames; the resulting photograph displays the frame itself. Tile/sample progress reflects real work. The existing restrained viewfinder response remains, with no full-screen flash.

The result offers View photo, Download, Save to Album when needed, Retake and Return to editing. The full-size dialog uses the shared kit’s modal shield, focus restoration and centralized key routing and closes with Escape. Failed Album writes retain a real encoded photo and a download/retry route; they do not claim storage succeeded. Only successful writes emit the existing photo notification. The generic capture API remains free of automatic downloads for sequence/clip callers; Simple’s Download destination performs its own explicit file operation. Advanced rendered-still feedback reports the actual Album result.

## Preset defects repaired

| Defect | Source repair |
|---|---|
| Floating cards, shelves intersecting printed details and inconsistent support contact | Measure the actual procedural meshes; align the card/case base, plinth/turntable, easel shelf and authored floor when building a catalog preset |
| Glass cases too short for the subject and its tags | Enlarge the authored enclosure and align its internal display base, then align the support beneath it |
| Eclipse/Observatory/Synthwave rings hidden behind the card | Use a dedicated, thin, smooth halo mesh without the equipment stand, sized to clear the subject |
| Side fixtures and ornaments cut off in portrait compositions | Adapt peripheral dressing on a render copy before applying the player’s background transform; authored scene data is preserved |
| Procedural room floor could occlude the actual authored floor | Suppress the procedural floor intersection when a floor mesh owns the stage; the real floor renders at its measured height |
| Dark backgrounds changed state while appearing stationary after contrast grading | Preserve a subdued, palette-matched movable wash for Moonlight and Obsidian, above their grade’s black clipping threshold |
| Thumbnail proportions differed from the chosen photo shape | Render at the actual aspect and fit the result into the tile, with no distortion |
| Tiles remained blank after printed-face loading | Disconnect/reobserve the thumbnail visibility owner when faces change, then rebuild the bounded queue |
| Prop arrangements were centered on the origin rather than a moved subject | Place an applied arrangement relative to the current card and measure its display supports; camera and grade remain untouched |
| Reopening another card’s Album scene stalled indefinitely | Detail’s pending-Studio guard blocked its own return/lift animation. Pending still blocks input, while the transition can finish before Studio entry |
| Hidden Simple UI rewrote Advanced photo dimensions/samples | Simple output updates run only while Simple is active |

Scene, rig, look, prop, camera and animation identities/application semantics from Stage 1 remain. Presets still apply as one undoable action. Existing saved scenes are parsed, rather than rebuilt through the authoring alignment helper.

## Scene and renderer contract

Scene JSON remains version 2 with version 1 migration and no gameplay save-schema change. Optional `presetId` remembers the authored starting point; each prop’s optional `background` flag identifies set dressing. Older scenes receive null/false defaults. Backdrop position, offset, rotation and scale remain the independent Stage 1 contract. Tagged dressing follows that transform on the render copy. Display supports, collectible, lights and camera remain independent. Direct Advanced viewport placement bakes a piece of dressing and its own keyed transforms into an independent object in one undo command, preventing the background transform from being applied twice. Out-of-bounds composite poses fail with Reset background guidance. The same effective scene path feeds preview, thumbnails and capture.

The simplified renderer uses camera framing and card position/scale, chooses the visible card face, and grades the whole picture, including its procedural background. It supports the everyday adjustments, movement and export with a bounded 1080p ceiling. It omits spatial props, lens blur and advanced lighting honestly; unsupported 4K/blur controls are disabled. No private animation clock was added. Fonts, artwork and scripts remain local and export-safe under `file://`.

## Actual verification

- `node --test tests/studio-stage1.test.cjs tests/studio-stage2.test.cjs`: **12 focused tests pass**. The deterministic catalog audit covers **115 entries × five adaptation profiles × five tiers = 2,875 source cases**. Additional tests measure support/shelf/case contact, subject framing in all five photo shapes, old identifiers, twelve new looks, exact background history/serialization and non-mutating portrait adaptation and exact Advanced placement of moved dressing.
- `node tools/check-studio-stage2-browser.cjs`: real offline Edge, a disposable browser profile, local fonts/art and actual Studio controls. **115 presets × five references × five tiers = 2,875 render cases**, with **4,275 sampled frames** for static and moving presets, plus 235 High subject-visibility comparisons. References include Basic, Rare Holo, Classic, Legendary and Matte.
- **94 complete scene journeys**: all 47 styles on Radeon RX 5700 XT / Rainbow Holo and Radeon HD 2400 Pro. Each chooses the tile, adjusts brightness, moves the background, changes shape, captures, verifies dimensions/MIME/Album storage, reopens the scene, returns to editing and starts a real download. Formats and all five shapes rotate through the matrix.
- Visible background pixel changes are measured for every scene at High WebGL and Very Low Simple: **94 cases**. These numerical checks complement contact-sheet review; they are not a perceptual certification of every possible small movement.
- Preview/export comparison uses a frozen Emerald Laboratory scene with warmth and independent background movement. The compared PNG has the same framing and grade, with mean absolute channel difference approximately **1.1 / 255**, including resolution/sample antialiasing differences. Custom and normal output use the same image path.
- Real captures decode to **1536 × 1920** portrait PNG and **3840 × 2160** 4K PNG. Captioned poster capture, Download destination, retry after an injected Album write failure, pure export with no implicit downloads, touch events, exact undo/redo, mode preservation, saved scene reentry, immersive Escape, modal Escape, keyboard stepper and WebGL creation failure/recovery are checked.
- Layout screenshots are reviewed at **390, 768, 1280 and 1920 px**, in color and saved monochrome, across all three steps. The saved reduced-motion path is also checked separately. Current `Cardable.dev.checkStudio2()` passes its 43 explicit checks. Browser runs report **zero JavaScript/console errors and zero HTTP(S) requests**. Syntax and whitespace checks pass.

## Evidence and boundaries

The tests and browser harness are committed. Generated evidence stays local and ignored in `qa-output/director-stage2/`: runtime JSON, five labelled contact sheets, 24 layout screenshots, preview/export comparison PNGs and the fallback result. The harness uses locally available Playwright and Edge; set `NODE_PATH` to the bundled package directory when needed. `STUDIO_EXTRA_ONLY=1` runs focused capture/recovery checks; the default runs the full matrix.

Visual review is development acceptance; the owner’s final art-direction judgment remains separate. This matrix samples the stated references and motion times, rather than every GPU definition, variant or animation frame. Touch is exercised through native browser touch events, not a physical device. Storage/WebGL failures are deliberately injected. Native save dialogs, physical GPU/driver performance, packaged Electron, installer/updater execution, clipboard permissions, full clip recording/sequence export and broader gameplay suites were not certified. The generic export API and existing delivery routes are preserved and regression-checked at their shared capture boundary.

All implementation writes belong to the Director worktree. No inventory ownership, economy, serial, reservation or shared cutscene code was changed. Other worktrees remain outside this change; concurrent work can advance them independently. Integration and delivery require the owner’s separate approval.
