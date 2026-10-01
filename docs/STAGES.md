# STAGES

Give Codex **one stage per prompt**. Suggested prompt:

> Read AGENTS.md and Designs.MD, then the docs listed for Stage N below. Do only Stage N and follow the stage protocol in AGENTS.md.

Suggested model use: Sol at high reasoning for stages 2, 3, 5 and 7; Luna for stage 0, 6 and data edits.

## Stage 0 — Scaffold
**Docs:** ARCHITECTURE, 01-GAME-RULES.
- Folder structure, `index.html`, `namespace.js`, `events.js`, `config.js`, the three data files, `state.js` (save/load/migrate), `timers.js`, `pull.js`, `serial.js`, `dev.js` with validation and the dev panel.
- `tokens.css`, `base.css`, `glass.css` with fonts loaded and fallbacks working.
- Unit-style checks in the dev console: timer catch-up after a simulated 20 h gap, pull distribution over 100,000 pulls (matches the chances), serials never repeat.
**Accept:** page opens by double-click; `?dev=1` shows the panel; no console errors; the checks above print PASS.

## Stage 1 — Shell
**Docs:** Designs.MD, 07-DOT-GRID-CURSOR, 05-MAIN-MENU (sections 1, 2, 7, 9).
- Dot grid, cursor glow and personalities, click ripple (two rings), idle fade, load-in sequence, wordmark SVG with the letter-morph loop, favicon, tab title logic.
**Accept:** dots appear only near the cursor with smooth falloff; ripple on any click; UI fades at 2.5 s and returns on movement; morph loops while hovered and settles on leave; reduced-motion mode works.

## Stage 2 — Card component (tiers 0-3)
**Docs:** 03-CARD, 02-RARITIES (sections 2, 3 for tiers 0-3).
- Front and back, all 10 layers, tilt spring, foil, beam, glare with specular core, edge light, keyline, procedural art generator, serial stamp, tier badge and meter, full and lite modes.
- `?dev=1` gallery page showing one card per tier (only implemented tiers).
**Accept:** the card visibly looks metallic and holographic, follows the cursor with weight, stays at 60 fps, and looks correct in lite mode.

## Stage 3 — Remaining finishes (tiers 4-12)
**Docs:** 02-RARITIES.
- One finish module per tier, including props and the Secret found/unfound states. Both `rarityColorMode` values.
**Accept:** gallery shows all 13 tiers; animations pause when off-screen; mono mode looks intentional; FPS stays acceptable with 13 lite cards plus one full.

## Stage 4 — Pack and menu
**Docs:** 05-MAIN-MENU, 01-GAME-RULES (section 1).
- Pack states (ready, waiting/transparent-fill, ready moment), fluid timer, stock vials, currency counter, inventory arrow (visual only), two-stack pack.
**Accept:** waiting pack fills continuously to match `progress()`; the ready moment plays once; digits roll; stock vials fill and drain.

## Stage 5 — Opening sequence
**Docs:** 04-PACK-OPENING, 02-RARITIES (section 4), 07-DOT-GRID-CURSOR.
- Full state machine: hold-to-charge with fluid, drain, commit, dissolve, cut with path-following seam, tear, split, rise, preFlip, flip with signature shine, settle, Keep, toast, inventory arrow pulse.
- `pendingReveal` recovery on reload.
**Accept:** every phase plays for a common and for a forced Secret (dev panel); early release drains with slosh; reload after commit resumes at Keep; nothing can be re-rolled.

## Stage 6 — Tutorial
**Docs:** 08-TUTORIAL.
**Accept:** a fresh save gets 2 packs and walks through all steps; skip works; it resumes after reload.

## Stage 7 — Inventory
**Docs:** 06-INVENTORY, 03-CARD (render modes).
- Approved major refresh: four sheet detents, bounded recycled Shelf and virtualized Grid, monochrome toolbar, search/facets/sorts/grouping, favorites/custom collections, custom reorder, mystery faces/Secret Unfound, duplicate counts and New badges.
- Shared-element detail with result navigation, membership/favorite controls, scroll restoration, flip and serial browser. Durable acquisition focus and schema-1-to-2 preference migration.
**Accept:** bounded DOM/finite coordinates through 1000 logical designs; sole full card; stable selection; keyboard/RM/hidden behavior; smooth physical transitions at 60 fps in a permitted browser. See INVENTORY-REFRESH.md for verified versus manual evidence.

## Stage 8 — Polish and hardening
**Docs:** Designs.MD, POLISH-BACKLOG.
- Save export/import, corrupted-save handling, reduced-motion pass, focus rings, performance profiling, then a designer review pass of every screen. Work the backlog in ranked order.
**Accept:** the accessibility and performance sections of Designs.MD are all met.

## Prompt to run after each stage

> Review this like a senior Apple designer. List 10 subtle improvements ranked by impact, and the detail nobody would consciously notice but would feel missing. Do not implement them; append them to docs/POLISH-BACKLOG.md.

## Stage 11a — Settings engine and panel

**Docs:** 11-SETTINGS sections 1–5 and 7–9, 07-DOT-GRID-CURSOR.

- Validated settingsVersion 1 in save schema 2; live motion, quality, dots, cursor, idle fade, card tilt/color/front serial, reveal speed, keys, assist and hints.
- Gear/S entry, glass spring panel, sole full preview, keyboard focus, defaults confirmation/Undo, private About font licenses and performance nudge.
- Existing color/mono option only; Sound and all five Data actions disabled.

**Accept:** focused checks and integration evidence in SETTINGS-11A.md. Browser screenshots/material appearance and target-machine 60 FPS require manual verification. Data tools are Stage 11b.

## Stage 11b — Data tools

**Docs:** 11-SETTINGS section 6, 5.4, 5.5, 7 and 8; 01-GAME-RULES section 7.

- Checksum exports, validated import/drop preview, automatic backups, safe reset, restore, tutorial replay and Undo.
- Every replacement refreshes modules through save:replaced without reloading the page.

**Accept:** focused Data safety and lifecycle checks in SETTINGS-11B.md; rendered glass/hold/download interactions and actual file-open behavior require the manual acceptance pass. Stage 11a remains a separate committed checkpoint.
