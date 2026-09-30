# Stage 2 — Card component (tiers 0–3)

## Done

- Front and back faces at 5:7, using `--r-card`, a 1 px inner highlight, and a 2 px near-black `--keyline`. Each face has the specified layers 1–9 above the shared layer-0 shadow: body, finish, art, foil, beam, glare, text, prop, and edge. The prop layer is empty for these four tiers.
- Shared spring utility with stiffness 140, damping 16, mass 1, bounded time steps, and a 14-degree tilt cap. Pointer-driven lamp, glare, fast specular core, edge light, far-edge darkening, and opposite-moving layered shadow use one animation subscriber. Small idle sway begins after three seconds.
- Brushed metal body, masked repeating linear/conic foil, vertically oriented holographic bands, broad glare, sharp specular core, and a masked illuminated border. The back has a dark metal surface, centered original logo mark, and engraved serial.
- Seeded original SVG GPU compositions with PCB traces, heatsink fins, screws, and die/fan/vapor motifs. Art and spec formatter registries allow later data additions without changing the component layout.
- Data-driven name, VRAM, up to three additional specs, tier badge, and 12-segment meter. The serial stamps at 35 ms per character with a brief engraving flicker when the card settles; it can be replayed in the gallery.
- Registered Basic, Common, Uncommon, and Rare finishes only. Both color modes are supported, including static and animated Rare sparkles.
- One focused full card; every other card uses static lite materials. Material opacity crossfades take 150 ms. Off-screen and hidden-tab effects stop. Lite mode cancels serial animation and does no per-frame card work.
- Reduced motion uses smaller, more damped tilt, no lift/sway/twinkle, immediate engraving, and opacity-only face changes. Keyboard focus and Enter/Space face turning are supported.
- Gallery at `index.html?dev=1&gallery=1`: four tiers in each color mode, focus/hover selection, face turning, stamp replay, and an all-lite toggle. Ordinary `index.html` retains the Stage 1 shell.
- Verification: `node tools/check-stage2.cjs` passes 13 behavior groups; `node tools/check-stage1.cjs` passes 15 Stage 1 groups and all six Stage 0 checks. The instrumented DOM checks cover layer order, seeded art, content, save/data preservation, spring behavior, caps, mode switching, suspension, keyboard interaction, and reduced motion. No application errors were logged by that harness. These are behavioral checks, not browser rendering or performance measurements.

## Skipped or changed

- Added presentation tuning under `config.cardView`; existing configuration values, catalog data, and save schema are unchanged. Added a color-mode change event to the existing dev control, and exported the Stage 1 harness for reuse.
- The catalog has no Uncommon card. Its gallery entry is an explicitly labeled, in-memory study derived from an existing procedural record. It is never registered in the catalog, pulled, or saved. Gallery serials do not advance the saved counter or consume packs.
- Inspected all supplied references: `README.md` and `image.png`. The latter informed the study of dark machined forms and bright metal edges; its weapon artwork, branding, and gold palette were not copied. The indexed `01-shine.png` and requested `02-card-frame.png` are absent. The frame therefore follows the written keyline/radius specification; exact reference matching is unconfirmed.
- Local font files remain absent, so the existing system fallbacks apply.
- The browser tool previously rejected this project's `file://` preview and explicitly prohibited alternate routes to the same preview. No browser screenshots could be taken or critiqued. Direct file opening, actual blend/mask/3D appearance, CSS crossfades, and measured 60 fps remain unconfirmed. The required visual acceptance gate is still open.
- No later-stage finishes, pack/reveal sequence, inventory, market, audio, or variants were added.

## Look at

1. Double-click `index.html`, then append `?dev=1&gallery=1` to its browser address. Confirm eight cards, four per color mode, and no application console errors. Missing local fonts may produce resource warnings while fallbacks render.
2. Move slowly across Basic and Common, then sweep across Rare. The materials should read as restrained metal rather than a white overlay: inspect the fine brushing, moving foil, narrow vertical bands, fast core, and edge illumination. These are review targets, not screenshot observations.
3. Inspect the outline at 100% zoom and at a larger display scale. The near-black keyline should be crisp, the inner highlight thin, and corners concentric. Exact matching needs the missing frame reference.
4. Stop moving for three seconds. Check the small sway, spring weight, bounded tilt, darkened far edge, and coherent shadow. Scroll the active card off-screen and return; switch tabs and return.
5. Focus a card with Tab; turn it with Enter/Space or the toolbar. Check the back engraving and both faces' light response. Replay the stamp, then switch to all-lite during the stamp: it should settle immediately to static text.
6. Compare full and lite using the toolbar. Watch the 150 ms fade for a jump in glare, ghosted beams, or a dull-looking static finish. Every inactive card should remain visually complete.
7. Compare the two rows. Mono should remove color from the face and art while retaining distinct tonal finishes. Check that names, specs, and serials remain readable through the highlights with the fallback fonts.
8. Change reduced motion while a card is moving: no sway, lift, particles, or engraving animation should remain; tilt should settle within three degrees and faces should crossfade.
9. Use browser performance tools on the target laptop to measure active rendering and verify the 60 fps target. The dev FPS panel is a quick indicator, not a measured performance certificate. Capture color/full, mono, back, and all-lite screenshots before accepting the material appearance.

## Open questions

- Applied defaults: rarity color stays on card faces with mono support (#3); small mono badge plus a 12-segment meter (#6); existing serial format (#7); VRAM plus the first three available specs from cores, boost clock, bus, and power (#18); local font fallbacks (#19); desktop scope (#21); serial on both front and back (#22).
- Basic through Rare fill one through four meter segments respectively. The existing tier-0 numbering is retained; the zero-based meter convention still leaves 12 segments as specified.
- The empty Uncommon tier needs real catalog content later; the gallery study remains temporary.
- Supply `02-card-frame.png` for exact frame comparison. Browser screenshots and measured performance are still required to close visual acceptance.
