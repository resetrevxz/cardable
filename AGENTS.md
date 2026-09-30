# AGENTS.md — Cardable

Cardable is a local, offline, single-player HTML game. Players collect GPU cards from timed packs. The UI is premium, quiet and Apple-like. **The card is the showstopper.**

## Read order

1. This file.
2. `Designs.MD` — always, before touching any UI.
3. The docs listed for your stage in `docs/STAGES.md`. Do not load every doc every time.
4. `docs/OPEN-QUESTIONS.md` — the defaults to follow for anything undecided.

## Hard rules

- **No market.** Do not build it, stub UI for it, or read `marketValueUsd`. The only allowed hooks are an empty `#market-slot` element and `config.flags.market = false`.
- **No variants system. No music or sound (yet).** Both are flagged off in `src/config.js`.
- **Offline and self-contained.** No network requests at runtime, no CDN links. Libraries go in `vendor/`, fonts in `assets/fonts/`.
- **Must run by double-clicking `index.html`** (file://). Use classic `<script>` tags and the `window.Cardable` namespace. Do NOT use ES module imports; browsers block them on file://.
- **Data-driven.** Cards, rarities, packs and generations live only in `src/data/`. UI code reads them through the registries and never hard-codes a card, tier or pack.
- **Palette.** UI chrome is black, white and gray only. Rarity colors appear only on card faces (see `Designs.MD` section 4).
- **Two fonts only:** Inter plus a mono (JetBrains Mono), both with system fallbacks.
- **Never invent game rules.** If a rule is missing, use the default in `docs/OPEN-QUESTIONS.md` and say that you did.
- Respect `prefers-reduced-motion`. Keep 60 fps: full card effects only on the focused card.

## Stage protocol

1. Do only the stage you were given. Do not start the next one.
2. Implement the stage checklist. Put extra ideas in `docs/POLISH-BACKLOG.md` instead of building them.
3. Run it. If you can take screenshots, do so and critique them like an Apple designer before reporting.
4. Finish with a report using exactly these headings:
   - **Done** (list)
   - **Skipped or changed** (and why)
   - **Look at** (what the human should check)
   - **Open questions** (anything you had to assume)
5. Commit to git: `stage N: <name>`.

## Where things go

See `docs/ARCHITECTURE.md` for the file tree, registries, events, and the recipes for adding a card, rarity, pack, generation or finish.
