# Inspect and Director mode — the card studio

From a card's detail view the player taps **Inspect** and enters a photo studio: a dark stage with the card in the center where they can add **lights** (including colored ones), **props**, move the **camera**, direct short camera moves, and **take photos** that are saved to an album and can be downloaded or copied.

This is the biggest feature in the game. Build it in milestones.

**Read first:** `AGENTS.md`, `Designs.MD`, the card renderer and its layers, the variants system (`src/data/variants.js`, variant renderers), finishes, card skins, the detail view, the settings quality tiers, the dev menu registry, and the strobing profile helper (`Cardable.cutscenes.profile()`).

## 1. Rules and constraints

- Classic scripts, offline, file:// safe, no libraries. Everything procedural (no image/model assets for props).
- **Additive save only** (no schema bump): scenes in `save.studio`; photos in IndexedDB (section 8). Do not edit other save fields.
- **Do not modify shared cutscene files.** If you need WebGL helpers, reuse them read-only or copy what you need into `src/studio/`. Other updates are running at the same time.
- Monochrome UI. Light and prop colors only affect the scene.
- **Photosensitivity:** light animations (pulse, flicker, strobe) follow `Cardable.cutscenes.profile()`: Safe at most 2 flashes per second with soft ramps and no full-frame strobing; Full at most 5 Hz. The shutter effect is a quick vignette dip and a thin light sweep, never a full-screen white flash. Reduced motion: no turntable, no light animation by default.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE small logic check, `Cardable.dev.checkStudio()`, run once at the end of the last milestone: scene JSON round-trips (serialize then parse equals), undo/redo restores state, light and prop limits clamp, a photo's pixel size matches its requested size, and the album stores and retrieves a blob. Under 2 seconds, never automatic.

### The key technical constraint (verify first)

The game runs from **file://**. In Chrome, images loaded from file:// **taint** canvases and cannot be used as WebGL textures or read back for export. A studio needs both. **In milestone A, verify this in the target browsers.** If confirmed (expected), solve it like this:

- **Art as same-origin data.** Add a build script (`scripts/build-art-data.js`, Node) that converts every `assets/cards/<id>.webp` into `assets/art-data/<id>.js` containing a base64 data URI registered with `Cardable.art.register(id, dataUri)`. The studio loads a card's art by injecting its script tag on demand (never all at once), then decodes it into a texture. Document the command and run it when art changes; if an art-data file is missing, fall back to the procedural art. Do not change how the normal game displays art.
- Fonts loaded through `@font-face` do not taint canvases and can be used for text.
- If the browser does not taint (for example Firefox with same-folder access), the same loader still works.

## 2. Architecture decision

Inspect mode runs on its own **WebGL studio renderer**, so lights, shadows, depth of field and photos are exact and exportable. It does **not** try to screenshot the DOM card. Structure:

- `src/studio/`: `studio.js` (mode controller), `renderer.js` (WebGL scene, passes), `card-face.js` (the card face painter), `lights.js`, `props.js`, `camera.js`, `scene.js` (JSON schema, undo/redo), `photo.js`, `album.js` (IndexedDB), `ui/*` (panels), `presets.js`.
- **Card face painter:** draws the card face and back into 2D canvases at high resolution (2048 x 2867 on High): frame (including skins such as the Classic frame if the card has one, through the same skin registry), art (from the art-data loader), info plate with the real fonts, tier badge and meter, serial, tags, the card back (logo and serial), and the rarity finish background. The painter reads the same data and skin registries as the DOM card, so new cards, finishes and skins need no studio edits.
- **Card model:** a thin rounded-rectangle slab with a bevel so the edges catch light; front and back textures; a normal/roughness map derived from the art and plate for convincing specular response.
- **Finishes:** each finish may expose an optional `studio` hook (`paint(ctx2d, t)` for animated backgrounds, or a shader chunk). Without it, the painter draws a static baked version from the finish's declared palette.
- **Variants:** the studio has a variant-effect interface, `variant.studio = { shader chunk or paint(ctx, t), uses: ['lights','normal'] }`, reading `lights` (an array) instead of the single global lamp. Port in this priority order: Holographic, Vertical Holo, Chromatic, Matte, Shiny, Iridescent, Cosmic, God Ray, Brushed Steel, Gold Foil, then the rest over time. A variant without a studio port renders the base card and shows a small "Studio preview limited" note on the Card tab. Do not block the milestone on ports beyond the priority list.

## 3. Entering and leaving

- A camera-icon **Inspect** action in the card detail view (register through a detail-actions registry if it exists; otherwise add the smallest additive hook) and the `E` key there.
- Transition: a shared-element zoom from the detail card into the stage (the card keeps its tilt and light), the rest of the UI fades; Esc or the Exit button zooms back. If the scene has unsaved changes, the scene autosaves as "Last scene" for that card; no confirmation dialogs.
- The studio pauses the dot grid, the menu and everything not needed. The card in the studio is the exact card (instance, variants, pack skin, front/back).

## 4. Studio UI (glass, premium, minimal)

- **Top bar:** card name, undo/redo, scene presets menu, reset, quality chip, exit.
- **Left outliner:** a list of scene objects (card, lights, props) with eye, lock and delete; click to select.
- **Right inspector:** properties of the selected object (see below), animated sections.
- **Bottom toolbar:** Select, Lights, Props, Camera, Backdrop, Card, Photo, each opening its panel as a glass drawer. Hotkeys: `L` add light, `P` props, `C` camera, `F` frame the card, `Del` delete, `Ctrl/Cmd+Z/Shift+Z` undo/redo, `Ctrl/Cmd+D` duplicate, `Esc` deselect, then exit. Do not use Space for anything except toggling the turntable while the studio is open.
- **Viewport gizmos:** drag lights and props in 3D (move on a plane with depth handle, rotate ring, scale handle), snapping with Shift, a light shows its cone or area shape and a small color dot.
- Everything is keyboard accessible where practical; hints in tooltips.

## 5. Lights

- Types: **point**, **spot** (cone angle, softness, optional **gobo** patterns: blinds, grid, leaves, stars), **directional/sun**, **area softbox** (rectangular), **strip**, and **ambient/sky** (top and bottom color).
- Properties: position/rotation, intensity, **color** (hue ring, saturation/value, pastel/neon/warm/cool presets, temperature slider in Kelvin), size (softness), falloff, shadows on/off with softness, **animation** (none, pulse, flicker, sweep, orbit; speed; subject to the strobing profile).
- Up to 8 lights (High), 4 (Medium), 2 (Low). The key light drives shadows and the card's edge light, glare and foil response; every light contributes diffuse and specular to the card and props.
- Light preset rigs: Studio (three-point), Rim, Noir, Neon Alley (magenta and cyan), Sunset, Moonlight, Showroom, Vault.

## 6. Props (all procedural, lit by the rig, with transform gizmos)

- **Stage:** floor (matte, glossy, mirror), seamless backdrop (color, gradient), plinth (square, round), display easel, glass case (transparent with refraction approximation), turntable (spins), grid floor.
- **Fixtures (visible and emissive):** softbox, ring light, neon tube (adjustable color and text up to 12 characters), spotlight can, LED strip.
- **Effects:** haze/volumetric fog, dust motes, sparks, confetti, snow, rain, fireflies, smoke, lens flare.
- **Hardware:** fan (spinning), heatsink block, cable bundle, PCIe bracket, RGB strip, screws and standoffs.
- **Decor:** crown, trophy cup, laurel ribbon, plant, a Cardable pack (using the real pack skins when available), and **other cards from the collection** (up to 10, lite) arranged as stacks, fans or walls.
- Per prop: color (where it makes sense), material (matte, gloss, metal, emissive), cast shadow, animate (spin, float), snap to floor, lock, visibility. Limit total props per scene (High 40, Medium 25, Low 12) and warn when near the limit.

## 7. Camera and director tools

- **Camera:** orbit (drag), pan, dolly (scroll), field of view, roll, **depth of field** (focus point click, aperture), lens effects (bloom, vignette, grain, chromatic aberration, lens flare), aspect crops (1:1, 4:5, 16:9, 9:16, card-only) with guide frames, tilt-shift, auto-frame, lock-to-card.
- **Director mode:** keyframes for the camera and for lights (position, intensity, color), a timeline scrubber with easing curves, loop and ping-pong, preview playback; a **turntable** shot, an **auto-director** button that builds a cinematic orbit with a light preset and an optional title card (card name, tier and serial); **record a clip** (up to 15 s) with `canvas.captureStream` and `MediaRecorder` to WebM when supported (hide the button if not).

## 8. Photo mode and the album

- **Shutter:** a Photo panel with resolution presets (1080p, 2K, 4K, custom within `MAX_TEXTURE_SIZE`/`MAX_RENDERBUFFER_SIZE`, rendering in tiles when needed), format (PNG, JPEG, WebP), quality, frame style (none, **Polaroid** with caption and date, **museum label** plate, **collector slab** frame), optional small Cardable watermark (default off), and the capture button with the shutter micro-animation (viewfinder snap, thin sweep, a soft vignette dip) and a thumbnail that flies to the album.
- **Actions per photo:** download, copy to clipboard (when the Clipboard API allows image blobs), reopen the scene that made it, rename, delete.
- **Album:** IndexedDB with `{ id, cardId, instanceId, createdAt, w, h, blob, thumb, sceneJson, name }`, up to 100 photos with a live usage readout (use `navigator.storage.estimate()` when available), a filmstrip in the studio and a grid sheet reachable from the inventory toolbar and the context menu. If IndexedDB is unavailable, photos still download and a notice explains that they cannot be saved.
- Emit `Cardable.events.emit('studio:photo', { cardId, instanceId, photoId, w, h, at })` for achievements and the journal. Emit `studio:enter` and `studio:exit`.

## 9. Scenes

- Scene JSON: `{ version, card: { side, tilt, plate }, lights: [...], props: [...], camera: {...}, backdrop: {...}, keyframes: [...], post: {...} }`.
- **Undo/redo** (50 steps). **Slots:** 10 saved scenes (name, thumbnail) in `save.studio.slots`, plus "Last scene" per card instance, import/export as copyable JSON, and presets (Studio, Museum, Neon Alley, Sunset Desk, Void, Vault, Showroom, **Surprise me**).

## 10. Quality tiers

| Tier | Lights | Shadows | DOF/Bloom | Props | Resolution of card textures |
|---|---|---|---|---|---|
| High | 8 | soft | full | 40 | 2048 wide |
| Medium | 4 | basic | bloom only | 25 | 1536 |
| Low | 2 | none | none | 12 | 1024 |
| Very Low | Inspect opens a **simple mode**: one light, a backdrop, no props, photos at up to 1080p | | | | 768 |

Photos can render at the highest quality regardless of the live tier (render once at capture time, then restore).

## 11. Milestones (stop at a clean one, commit, list what is unfinished)

- **A: foundation.** Verify the file:// constraint; art-data build script and loader; studio shell and transition; renderer with the card slab, face painter (front, back, frame, art, plate), orbit camera; save/restore the "Last scene".
- **B: lights and camera.** Light types, colors, gizmos, shadows, specular response of the card, DOF and post, camera tools, undo/redo, presets.
- **C: props and scenes.** The prop catalog, outliner, inspector, scene slots, import/export.
- **D: photos.** Photo mode, resolutions, frames, album, clipboard, events.
- **E: variants and director.** Variant studio ports in the priority order, finish hooks, keyframes and timeline, turntable, auto-director, clip recording.

## 12. Manual checks

1. Inspect opens from any card, in the studio the card matches the DOM card (front, back, frame, art, plate, tags).
2. Moving and recoloring lights visibly changes the card's glare, foil, edge light and shadow.
3. Props appear, move, scale, receive light, and cast shadows; limits warn.
4. A 4K photo downloads at the right size and looks sharp; the Polaroid and slab frames render correctly; the album saves, reopens scenes and deletes.
5. Priority variants respond to lights; unported variants show the limited note.
6. Keyframes play back smoothly; the clip records when supported.
7. Quality tiers degrade gracefully; reduced motion disables the turntable and light animation.
8. No console errors; leaving the studio restores the normal UI exactly.

## 13. Out of scope

Sharing to other players, sound, user-imported models or images, changing the normal card renderer.
