# Smoother (1.12.1)

The owner reported that going to the inventory was choppy and that much of the game felt choppy. This pass measured where frames were lost and fixed the causes it found. It changes no look, no rule and no save.

## How it was measured

Headless Chromium (Playwright) with ANGLE on Direct3D 11, on the owner's AMD Radeon RX 7800 XT, so raster and compositing ran on the real GPU and no window opened. A page with 300 cards (or 1,512 where noted) at High, `fpsLimit` Display. "Janky" is a frame more than 25 ms after the last (vsync was 60 Hz, so anything over 16.7 ms is a missed frame). Each transition ran twice in one page; run 0 includes one-time costs (first build, the GPU compiling a shader it has never seen), run 1 is what the player feels every other time. The unmodified 1.12.0 source was run the same way for comparison. These are one machine's numbers, not a promise for other hardware.

## What was wrong, and what changed

| Where | Cause | Fix |
|---|---|---|
| Inventory open and close | Three custom properties were written on `<body>` every frame of the slide. Custom properties inherit, so every element in the document restyled each frame. The menu's blur and opacity they drove were already forced off (`ui-polish.css`, `inventory-views.css`), so only the scale ever showed. | The scale is written straight to the menu shell; the dead blur and opacity rules were removed. |
| Inventory open and close | `--inventory-open` on the sheet and `--inventory-tile-width/-height` on the shelf restyled every card inside them each frame. | Registered with `@property { inherits: false }` and written on the few elements that read them (`src/ui/kit/components/inventory.css`). |
| Inventory open and close | Every frame wrote the sheet's height and then read `offsetTop` and `clientWidth` (shelf and the hidden grid), flushing layout a second time. | A pull frame resizes only the visible view and reuses the toolbar height measured when the pull began. |
| Opening a card | `--detail-focus` was written on `<body>` each frame of the lift. | Written on the sheet that reads it, non-inherited. |
| Tutorial | `--tutorial-pulse` was written on `<body>` every frame, for as long as a step showed. The page sat about 50% busy. | Non-inherited, written on the two things that read it. |
| Rare cinematic | A per-pixel sky bake (about 90 ms) ran when the pack began to dissolve, and `intro.stop()` then discarded it, so it ran again (about 100 ms) when the intro started. | Baked in 3 ms slices, kept across the stop, built once. The pixels are identical. |
| Super Rare cinematic | Same pattern: 206 ms warm-up plus 169 ms again at the start. | Same fix; a warm-up that is not used is released after 20 s. Pixels identical. |
| Exotic cinematic | The spiral dust bake (about 400 ms) ran in the intro's first frame; it had no warm-up. | Added a warm-up (4 ms slices) called with the other cinematics' warm-ups. Pixels identical. |
| Mythical and Ascendant | Each shader program was linked and then waited for before the next. | The programs are submitted together and checked once, after the scene's geometry is built. Failures are thrown in the same place as before. |

## Results (High, 300 cards, repeat open unless marked)

| Transition | 1.12.0 | 1.12.1 |
|---|---|---|
| Inventory open (shelf, pointer near the arrow) | 11 to 12 janky frames; main thread 475 to 500 ms, of which style 390 to 420 ms | 0 to 3 janky frames; main thread 145 to 195 ms, style 45 to 52 ms |
| Inventory close | 12 to 13 janky frames | 0 to 1 |
| Card detail open | 12 to 15 janky frames | 0 (first open of a session: 3 to 5) |
| Tutorial, hold step, idle | main thread 52.7% busy, 47% style | 3.4% busy, 0.8% style |
| Rare pack opening | 421 ms lost to long frames, worst frame 250 ms | 136 ms lost, worst frame 83 ms |
| Exotic intro start (warmed) | 410 ms | 23 ms |
| Super Rare warm-up and start | 206 ms and 169 ms | 4 ms and 11 ms |
| Mythical intro start (cold shader cache) | 389 ms | 180 ms |

With 1,512 cards the open went from 7 to 8 janky frames to 0 and the close from 3 to 5 to 0 to 1.

## Not changed, and why

- The first open of a session can still take a 100 to 280 ms frame: the GPU compiles shaders it has never seen. The installed app keeps a shader cache, so this should happen once per install or driver update. It was not verified in the installed app.
- Settings, Shop and Market each cost about 100 to 170 ms the first time they open (they build then). Later opens are smooth.
- Steady-state frames were already fine: menu, pointer, shelf, grid and the cinematic loops all ran at the refresh rate with one to two milliseconds of main-thread work per frame.
- Mythical's and Ascendant's first start still waits for the largest program to compile when the shader cache is cold.

## Checked

- Settled layout of the shelf and sheet is the same as 1.12.0 (within 0.2 px, the spread the unmodified code itself shows between runs) at Normal, Expanded, Full, after a window resize, after Shelf/Grid switches, after an interrupted open, after a drag and with Reduced motion; settled screenshots look the same.
- The three inventory checks (`check-inventory-interaction`, `-performance-browser`, `-glass`), the 107 market and odds tests, the Electron service tests, the data and asset checks and the notch and polish browser checks pass.
- The Rare, Super Rare and Exotic textures hash identically to 1.12.0, and Mythical, Ascendant, Exotic, Secret, Rare and Super Rare start in WebGL 2 or canvas as before with no console errors.
- `check-activity-browser` and the pack-driving profile's detail scene fail the same way on unmodified 1.12.0 (a stale selector and an environment issue); they were not touched.

## Not checked

The installed Windows app, a physical display faster than 60 Hz (a run without the frame-rate limit showed 1 to 2 ms of main-thread work per frame everywhere except the tutorial, which is fixed), the lower graphics tiers beyond a few spot runs, a screen reader, and the Royal and Titan cut gestures (the harness cannot drive them).
