# Secret cutscene — "Fatal Exception"

Tier 11 (Secret, 0.005 %, about 1 in 20,000 pulls). It must be the best cutscene in the game: about **40 seconds**, the most ambitious, and a genuine surprise.

**The idea:** it starts as a plain, boring **Basic** reveal. At the last second it **cuts to black**. Then the game turns out to be running inside a fake operating system, and everything breaks: boot failure, a desktop, an avalanche of error windows, hung-window smear trails, a collapsing GUI, GPU artifacts, a stop screen, a terminal, a frozen buffer, a CRT power-off. From the dead black, the Secret card background resurrects and locks in. **The background is the last part of the cutscene** and stays as the card's background.

**Aesthetic:** authentic OS-failure glitching, not generic RGB-split. Think hung windows leaving trails when dragged, popup avalanches, a blue stop screen, dying-GPU artifacts, a task manager melting down, a CRT collapsing to a dot.

---

## 0. What to read first

1. `AGENTS.md` and `Designs.MD`.
2. **The existing Mythical and Ascendant cutscenes.** Follow their registration, timeline engine, hooks into the opening state machine, skip handling, quality handling, warm-up and handoff. Reuse all shared code (timeline, WebGL helpers, post-processing, beat events). Extract shared parts instead of duplicating.
3. `docs/02-RARITIES.md` tier 11 and `src/finishes/secret*` (the card's Found and Unfound designs).
4. The settings system (`Cardable.settings`) and the opening state machine.

## 1. Rules

- **Original fiction, no real-product IP.** The fake OS is called **NorthStar OS** (rename freely). Do not use Microsoft's logo, wallpaper, fonts, sounds, icons or exact dialog and stop-screen text. Generic UI patterns (title bars, close buttons, buttons, taskbars) are fine; draw all icons and text originals in code.
- **Procedural only, offline, classic scripts, no libraries, file:// safe.** No image, video or audio assets.
- **Fonts:** no new fonts. Render OS text with a small embedded bitmap font (5x7 glyphs, ASCII) or the existing mono font drawn at integer pixel sizes into a low-res canvas.
- **Seeded variation:** seed the dialog order, icon layout, error codes and hex content from the card instance serial.
- **Palette:** monochrome game, but the fake OS may use its own colors: teal desktop `#0B7285`, navy title bars `#12206B`, light gray window faces `#C8C8CC`, stop screen blue `#0A2A6B`, artifact accents magenta `#FF00FF`, cyan `#00FFFF`, green `#39FF14`. The **final scene returns to pure black and white** (the Secret finish). Mono mode (`rarityColor = Mono`): everything grayscale.
- **No tests, screenshots or profiling.** Manual checks only (section 12).

## 2. Photosensitivity system (mandatory, build first)

The user wants a genuinely **strobing, glitchy Full version** and a **separate Safe version** (not just a removal). Both play the same story and length with different intensity profiles.

**Setting:** `strobing` in Settings (Cards group): **Safe** (default) / Full. Add copy: "Full includes rapid flashing, strobing and loud glitching that can trigger seizures in people with photosensitive epilepsy." Switching to Full requires a hold-to-confirm (3 s). Apply the setting to all rarity cutscenes through one helper, `Cardable.cutscenes.profile()` returning `'safe'` or `'full'`. (Cap the pulses in the existing Mythical and Ascendant cutscenes for Safe as a small follow-up; list it in the report.)

**Pre-roll notice (Full only):** before the cutscene starts, a glass card: "This sequence contains rapid flashing and strobing." Buttons: **Play full** and **Play safe**. If nothing is chosen within 8 seconds, it plays **safe**. Show it every time (the cutscene is extremely rare).

**Reduced motion** (`prefers-reduced-motion`) or `cutscenes = Off`: play the **calm version** (section 10) with no flashing, shake or fast motion.

**Safe profile (default). Limits:**
- Never more than 3 flashes in any one second; a flash is an opposing pair of luminance changes of 10 % or more (where the darker value is below 0.80 relative luminance) over a large area; no saturated red flashes; no large regular stripe or checker patterns; no continuous strobing.
- Screen shake at most 3 px and 3 Hz. No instant full-screen reboot flicker; use crossfades.
- Still dramatic: window avalanches, trails, tearing, pixelation, static offsets, scanline sweeps, typing, hex walls and the CRT collapse all remain.

**Full profile limits (opt-in, risk reduced, not eliminated):** strobing only in short bursts (at most 0.6 s each) with at least 1.5 s of calm between bursts; full-screen alternation never faster than 8 Hz; at most 8 s of strobing in total across the cutscene; no saturated-red full-screen flashes; no large regular stripe or checker patterns during a strobe; strobing alternates between black and mid-gray or partial-area patches where possible, not full white.

**Safety limiter (end of the render chain):** downsample the final frame to about 64 x 36, compute mean relative luminance per frame, and track opposing changes over a rolling 1 s window. In **Safe**, if a violation is imminent, blend the output toward the previous frame (temporal low-pass) so limits cannot be exceeded. In **Full**, an emergency brake caps alternation at 8 Hz and bursts at 0.6 s no matter what the timeline requests.

**Dev meter:** register a tool in the dev menu (or `?dev=1&cutscene=secret`): "Flash meter" shows luminance per frame, flashes per second, red flag, current profile, PASS/WARN. Use it to verify Safe.

**Secret card background:** the Found design alternates black and white at a large scale (lines grow until the whole card is black, then inverts). That must also respect the profile: in Safe, full inversions happen at most once every 4 s with a crossfade of at least 600 ms and line speed capped; in Full, keep the original behavior but never faster than 2 inversions per second. Lite (shelf) renders stay static.

## 3. Architecture

- Register through the same cutscene registry; set `cutscene: 'secret'` on the Secret entry in `rarities.js` `reveal`. It plays where Mythical's plays and continues into the normal card appearance and `settling`.
- **Two-layer render pipeline:**
  1. A low-resolution **OS canvas** (2D): 640 x 360 on High, 480 x 270 on Medium, 400 x 225 on Low, drawn with a tiny scene model (windows with title, content, z-order, state; icons; taskbar; cursor). Drawn pixel-crisp.
  2. A **WebGL post chain** at full resolution: nearest-neighbor upscale, then the passes below, then the safety limiter.
- **Post passes:** feedback smear (ping-pong buffer for window trails), block displacement and scanline tears, RGB channel shift, pixel-sort approximation, JPEG-style 8x8 block quantization, datamosh-like hold and smear, CRT (curvature, shadow mask, bloom, convergence error, flicker, vignette), static noise, final composite.
- **Timeline engine:** the shared master clock with time-scale curves (freeze-stutter), scene scheduler, and `Cardable.events` `cutscene:beat` emissions for the future sound system: `cut`, `hum`, `post`, `bootFail`, `desktop`, `click`, `error` (each dialog), `avalanche`, `hang`, `themeFlip`, `stopScreen`, `reboot`, `hex`, `freeze`, `shutdown`, `crtLine`, `crtDot`, `black`, `pixel`, `lock` (each letter), `invert`, `cardIn`. Do not add sound.
- **Warm-up:** compile shaders and prebuild textures during `dissolving` and `cutting`.
- **Skip:** after 2 s show a faint mono hint "Esc to skip". Skipping fades through black (never a flash, in either profile) to Act H, the final background, then the card.
- **Reload mid-cutscene:** recover to the revealed state, never replay.
- **UI:** all game UI, dot grid, cursor glow and the native cursor are hidden during the cutscene (the fake OS draws its own cursor).
- **Dev tools:** play, scrub by act, time scale, profile override, quality override, flash meter, short/full.

## 4. Timeline (Full length, 40.0 s; Safe is identical in length and story)

### Act A — The Fake-Out (0.0 to 2.4)
Play the standard **Basic** reveal exactly as the game does for tier 0 (clean rise, no pause, quick flip, plain white card edge). One tiny wrongness at 1.0 s: the card's shadow skips a single frame. At **2.4 s, mid-flip, with the face about to appear, hard cut to black.** Only a thin sliver of a plain white Basic frame is ever visible; never show the face.

### Act B — Black (2.4 to 4.0)
Total black and silence (beat `black`, then `hum`). At 3.4 s a single blinking text cursor `_` appears at the top-left.

### Act C — Boot Failure (4.0 to 10.0)
A BIOS-style POST on a CRT: "NORTHSTAR BIOS v0.0.5", memory test counting up fast, device list ("CARDABLE VIRTUAL ADAPTER ... OK"), lines typed at varying speed with micro-stalls and a faint rolling bar. Then `SECRET.DAT ........ FOUND`, then "WARNING: unexpected file in pack." Lines begin to corrupt: letters swap to symbols, a line repeats and stutters, the word SECRET spreads into other lines. "Booting NorthStar OS..." with a progress bar that stalls at 99 %, jitters backward, then cuts to the desktop.
- **Safe:** no flicker; stalls and corruption stay.

### Act D — The Desktop (10.0 to 19.0)
- A 90s-meets-modern pixel desktop: teal background with a faint dot grid, taskbar with a clock stuck at `00:00`, icons: My Collection, Packs, Recycle Bin, and **SECRET.DAT** (it pulses subtly). An autonomous cursor glides over and double-clicks it (hourglass cursor).
- **The error avalanche:** one dialog appears ("SECRET.DAT could not be opened."). The cursor clicks OK; two more appear; then four, then eight (exponential). The fake assistant, a tiny pixel star named **NORTH**, offers help ("It looks like you're trying to open a secret. Would you like help?").
- **Hung-window smear:** the cursor drags a "(Not Responding)" window across the screen and the classic trail smear paints a hall of mirrors. Several windows hang and smear at once; the screen becomes a carpet of dialogs.
- A **Task Manager** window shows `cardable.exe` at 100 % CPU, a memory graph climbing off the chart, a process list that fills with `secret.dat` entries.
- A **File Explorer** window lists `secret_0001.dat ... secret_9999.dat`, scrolling faster and faster.
- Ends with the screen so full that new windows appear in the same frame at random places.
- **Full:** windows appear instantly in clusters with 1-frame duplicates; short static bursts.
- **Safe:** windows scale in over 120 ms, no duplicates, max 12 new windows per second, no static bursts; smear, density and cursor chaos stay.

### Act E — Breakdown (19.0 to 27.0)
- **Theme montage:** the OS window style jumps through eras (bevel gray, blue gradient bars, glass blur, flat modern) while the taskbar clock runs through years (1999, 2007, 2012, 2018, 2022...). It is a nod to the game's GPU generations.
- **Desktop collapse:** icons detach and fall with simple physics, piling at the bottom; the wallpaper tears with horizontal block displacement; windows lose their title bars one by one; scanline roll; pixel-sorting waves sweep the image; 8x8 JPEG-block artifacts; datamosh holds and smears.
- **VRAM artifacts** (the GPU dying): checker patches, spiky polygon bursts, dithered magenta/cyan/green corruption, a wrong-colored texture mosaic. Short, violent bursts.
- Task Manager's CPU graph pegs; the memory number overflows to `NaN`.
- **Full:** theme flips at about 4 Hz in bursts; artifact bursts (up to 6, 0.35 s each); shake up to 12 px.
- **Safe:** theme changes are 800 ms crossfades; artifacts become static patches at reduced contrast with no red and no regular patterns; shake 3 px.

### Act F — Stop and Reboot (27.0 to 32.0)
- **Stop screen (original design):** deep blue, white mono text, a big `[ ! ]` glyph, "NorthStar has stopped to protect itself." Stop code `SECRET_FOUND`, a progress counter "Collecting error info" that counts **backward**, and a fake QR-like block grid that is clearly not a real QR code.
- **Reboot loop:** it reboots, the POST text flashes by, crashes again, reboots, three times, each faster and each ending on the same corrupted desktop.
- **Terminal:** a console types at inhuman speed: `> reveal --secret`, `permission denied`, `> override`, `> override --force`, then a scrolling hex wall in which one run of bytes **`53 45 43 52 45 54`** (ASCII for SECRET) lights up and repeats down the columns.
- **Full:** three reboots as quick black/text cuts (about 6 Hz, 1.2 s total).
- **Safe:** one slow 1.5 s crossfade reboot with scrolling "rebooting..." text; the hex wall and terminal are unchanged.

### Act G — Total Collapse (32.0 to 36.0)
- **Freeze-stutter:** the frame holds 120 to 250 ms repeatedly, with the cursor swarm (dozens of ghost cursors trailing) still moving inside the held image, then catching up in jumps.
- The image tears into tiles that desync and slide; every window turns into a flat gray rectangle then into noise.
- A final dialog: "It is now safe to look away." (original text).
- **CRT power-off:** the image collapses into a single bright horizontal line, the line shrinks to a dot, the dot fades. Beats `crtLine`, `crtDot`.
- **Full:** short static bursts in the freeze. **Safe:** low-contrast noise, no bursts.

### Act H — Resurrection (36.0 to 40.0): the background is the last part
- 0.8 s of dead black. A single white pixel appears at the center (beat `pixel`).
- A **glyph storm** blooms from the pixel across the whole screen: gibberish characters `@#$&_-%/\|` shifting in rapid succession with fast white lines sweeping across them. This is the Secret Found design, rendered full-screen.
- Every 0.3 s one letter of **"Secret"** locks in with a small white animation (S, e, c, r, e, t = 1.8 s; beat `lock` each), the rest of the storm continues around the locked letters. When all six are locked, hold for 0.4 s.
- Then play the **first inversion cycle** of the Found design: the field reverses to black lines on white, the lines accelerate and grow until the screen is all black, then reverses to white lines on black (profile limits in section 2).
- At 40.0 the **card appears** over this exact background with its black squircle border at 95 % opacity (the prop), which flips to white when the design inverts. The game continues into the normal settle phase.
- **Do not remove or replace this background; it is the card's background.**

## 5. Detail library

**Dialog text bank (all original; shuffle with the seed):**
- "SECRET.DAT could not be opened. Access denied. (Nice try.)"
- "A secret has occurred."
- "cardable.exe has stopped responding."
- "Not enough memory to hold this much rarity."
- "This program performed an illegal operation and will be shut down. Please contact the card."
- "Are you sure you want to see this?" [Yes] [Yes]
- "Save changes to reality before closing?"
- "Error 0x53454352 (SECRET). Description: found."
- "The card you are looking for is not here. It is here."
- "Warning: rarity buffer overflow."
- "Send a report to the odds?"
- "0.005 %: you were not supposed to see this."
- "Disk full. Please delete 1 coincidence."
- "NS fatal exception 0E at 0000:5EC12E70."
- "Network cable unplugged from universe."
- "Task DESTINY.EXE is not responding. End task?"
- "NorthStar is searching for a solution... no solution found."
- Titles carry `(Not Responding)` when hung; buttons: OK, Cancel, Retry, Ignore, Yes, Yes.

**Dialog look:** light gray face with a 1 px bevel, navy title bar with a close button, pixel icons (X, !, ?, i) drawn in code. Drag a hung window with the mouse and the smear leaves trails because the feedback buffer is not cleared under it.

**Cursor:** arrow, hourglass, and a swarm mode (dozens of trailing copies) for Act G.

**Hung-window smear technique:** each frame, composite the OS canvas over the previous frame's feedback buffer with a mask that excludes the "clean" areas, so hung windows leave persistent copies at their old positions while healthy windows redraw normally.

**Datamosh and pixel sort:** hold selected tiles of the previous frame while the rest updates, with displacement vectors taken from the cursor and window motion; pixel sort by luminance along rows in bursts.

**CRT:** curvature, aperture grille/shadow mask, bloom, subtle convergence offset, vignette. It strengthens through the cutscene; the collapse in Act G uses a real line-to-dot power-off.

**Extras:** a defrag-style block map shifting in a corner window; an "Are you sure?" dialog that blocks the title bar of another; a cursor that tries to close dialogs faster than they spawn; a clipboard window containing only `SECRET`; and a final tiny window in Act G that reads `_`.

## 6. Settings

- `strobing`: **Safe** / Full (section 2).
- `cutscenes`: **Full** / Short / Off (shared with the other cutscenes).
- **Short** (about 16 s): fake-out and black (3 s), boot failure (3 s), desktop and avalanche (4 s), breakdown and stop (3 s), collapse (1.5 s), resurrection (up to the full 4 s).

## 7. Quality tiers

| Tier | OS buffer | Post | Windows on screen | Smear |
|---|---|---|---|---|
| High | 640 x 360 | full chain | up to 60 | feedback buffer |
| Medium | 480 x 270 | no pixel sort or JPEG blocks | up to 40 | feedback buffer |
| Low | 400 x 225 | scanlines, shift, CRT only | up to 20 | canvas-drawn trails |
| Very Low | **calm version** | | | |

Adaptive: if average frame time exceeds 24 ms during Acts C and D, drop one tier for the rest (no visible pop).

## 8. Final-background handoff

The Secret finish exposes a shared renderer (for example `Cardable.finishes.secret.drawBackground(target, time, seed, state)`) used by both the card and Act H, with the same seed and a continuous clock, so the cutscene's last frame is the card's first frame background. The profile limits from section 2 apply inside it.

## 9. Interaction with the other cutscenes

Use the shared engine and reuse their timeline conventions. This cutscene must not change how Mythical or Ascendant look, apart from reading `Cardable.cutscenes.profile()` for the Safe caps listed in section 2.

## 10. Calm version (reduced motion, Very Low, cutscenes = Off)

About 4 seconds, 2D only: the Basic fake-out, a fade to black, one static glitchy error window fading in and out, a pixel that blooms into the "Secret" lock-in, then a slow fade to the card on its background. No flashing, no shake, no fast motion.

## 11. Milestones (stop at a clean one; commit each; list what is unfinished)

- **A:** photosensitivity system (setting, notice, limiter, dev meter, profile helper), engine reuse, OS canvas and post chain, Acts A to C.
- **B:** Acts D to F (desktop, error avalanche, smear, breakdown, artifacts, stop screen, reboot, terminal, hex wall).
- **C:** Acts G and H (collapse, CRT power-off, resurrection, final background handoff and inversion cycle), Short mode, calm version, settings entries, Safe caps for the other cutscenes.

## 12. Manual checks (by eye)

1. The fake-out really looks like a Basic reveal, then cuts to black.
2. The boot sequence is believable and decays convincingly.
3. The dialog avalanche escalates; hung-window smear trails look authentic.
4. Era theme montage, desktop collapse and artifacts are readable and violent in Full.
5. The stop screen, reboot loop and hex wall (`53 45 43 52 45 54`) land.
6. The CRT power-off line and dot work; the dead black beat works.
7. The resurrection letter-lock and inversion cycle feel earned; the card background matches the card with no seam.
8. **Safe version:** same story, same length, no strobing; the flash meter stays PASS the whole way.
9. **Full version:** the pre-roll notice appears; the safe fallback triggers after 8 s idle; the emergency brake holds the caps.
10. Esc skips cleanly through black to the final background; reload mid-cutscene recovers.
11. Medium, Low and Very Low complete without stutter; reduced motion plays the calm version.
12. No console errors; UI and cursor restore afterwards.

## 13. Out of scope

Sound (hooks only), changes to other tiers beyond the Safe caps, the card front design, the market.
