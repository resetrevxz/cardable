# 1.2.0: One Cardable

Part 2 of 4 of the 1.2.0 release. Every screen, panel and tool should look and behave like one product. This update writes **the Cardable design rules** (in the spirit of Apple's HIG or Vercel's Geist rules, but for Cardable), builds **one UI kit** that enforces them, and **moves every screen onto it**, including the newer features (Director mode, achievements, patch notes, settings, mini mode) that currently do not share the same feel.

Run as **one task** with two checkpoints. **Version rule:** do not change any version; append to `## Unreleased (1.2.0)` (see `alpha-updates/1.2.0-PLAN.md`).

**Read first:** `AGENTS.md`, the current `Designs.MD`, `alpha-updates/1.2.0-PLAN.md`, and **all UI code**: `src/ui/`, `src/styles/`, the studio UI, settings, achievements, inventory, tags, detail view, context menu, command palette, dev menu, tutorial overlay, mini mode, toasts, performance overlay, loaders. Audit before building.

## 0. Rules

- Classic scripts, offline, no libraries, file:// and Electron safe. Additive saves only; no schema bump.
- Monochrome UI. Color only appears in card art, rarity and variant effects, packs, cutscenes, studio scene content, and viewport gizmo axis tints.
- Existing behavior must not change except where a screen is remade. Existing settings, keybindings, saves and scenes keep working.
- Quality tiers, reduced motion and the strobing profile apply to all new UI.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add `scripts/lint-ui.js` (a **progress counter**, not a pass/fail test): it scans CSS for hard-coded colors, durations, easings, radii, z-indexes and shadows outside the token files and prints counts per file. Run it before and after migrating and report the numbers. Otherwise open the app once, visit each migrated screen, confirm no console errors, stop.

## 1. The Cardable Design Rules (write these into `Designs.MD`)

Restructure `Designs.MD` into the rulebook below (keep any still-valid old content in an appendix). Every rule is concrete and testable by eye. Numbers here are the defaults; Codex may tune them while keeping the structure.

### 1.1 Principles
1. **The card is the hero.** UI recedes; nothing competes with a card.
2. **One surface language:** near-black ink and frosted glass. No other surface styles.
3. **Restraint.** Fewer elements, more space. Every element earns its place; if unsure, remove it.
4. **Light is physical.** One lamp at the top left. Surfaces catch it with a top highlight and a light-following edge near the pointer.
5. **Motion explains.** Fast by default (150 to 250 ms); slow only for reveals and cinematic moments. Nothing pops: everything enters and exits.
6. **Precision.** 4 px grid, concentric radii, tabular numerals, optical alignment, pixel-snapped hairlines.
7. **Quiet color.** Monochrome UI. Meaning is never carried by color alone.
8. **Consistency over novelty.** If a pattern exists, use it. A new pattern must be added to the kit and the rulebook first.
9. **Every state is designed:** idle, hover, pressed, focus, disabled, loading, empty, error.
10. **Accessible by default:** contrast, focus, reduced motion, keyboard.

### 1.2 Foundations (tokens)
- **Ink and surfaces:** `--ink-0 #08080A` (app background), `--ink-1 #0E0E11` (panels), `--ink-2 #141418` (raised), `--ink-3 #1B1B20` (inputs, wells). **Glass levels:** `--glass-1` white 4 %, `--glass-2` 6 %, `--glass-3` 9 %, with blur 12 / 24 / 40 px and saturate 140 %.
- **Strokes:** hairline white 10 %, strong 16 %, hover 22 %; focus ring 2 px white 70 % with a 4 px soft white 15 % outer glow.
- **Text:** primary `#F5F5F7`, secondary `#A1A1A6`, tertiary `#6E6E73`, disabled 40 % of primary. Minimum contrast: body 4.5:1, large text and icons 3:1.
- **Typography:** Inter and JetBrains Mono only (display fonts only inside packs and cutscenes). Scale (px size / line height / tracking / weight): Display 48/52/-0.04em/600; Title 28/32/-0.03em/600; Heading 20/24/-0.02em/600; Body 14/20/0/400; Body strong 14/20/0/500; Small 12/16/0/400; Label (mono, uppercase) 11/14/+0.08em/500; Number (mono, tabular) any size. Weights only 400, 500, 600. One display size per screen.
- **Spacing:** 4 px grid: 4, 8, 12, 16, 24, 32, 48, 72. Inner padding of containers 16 or 24. Gaps between related items 8; between groups 24.
- **Radii:** 6 (tiny), 10 (controls), 14 (panels), 20 (cards/sheets), 28 (large sheets), 999 (chips). Nested radius = outer radius minus padding.
- **Elevation:** four shadow levels (sm, md, lg, xl), each layered (tight, medium, wide). Overlays dim the page with a scrim of 40 % ink.
- **Z-index scale:** content 0, sticky 10, panels 20, sheets 30, overlays 40, toasts 50, tooltips 60, cursor effects 70. No other z-index values.
- **Light model:** lamp at the top left; top highlight on glass is 1 px white 18 %; the light-following edge is a radial gradient on the border near the pointer (Medium and above).
- **Layout:** design size 1920 x 1080 with the existing scale system; content max widths: sheets 1200, settings 880, dialogs 480, popovers 320; safe-area variables for the title bar and notches; density modes `comfortable` (default) and `compact`.

### 1.3 Motion
- **Durations:** instant 80, fast 150, base 240, slow 400, sheet 500, cinematic 800+. **Easings:** `ease-out` `cubic-bezier(0.22, 1, 0.36, 1)` for entrances and hover; `ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)` for movement; linear only for progress. **Springs:** soft (stiffness 140, damping 16), snappy (220, 26), sheet (200, 28).
- **Enter pattern:** rise 8 px + unblur 4 px + opacity 0 to 1; stagger 40 ms (cap 8 items). **Exit:** opacity and 4 px sink, 120 ms.
- Animate only `transform`, `opacity`, `filter` and `clip-path`. Never layout properties. No bounce outside reveals. Numbers roll; they never jump.
- **Quality mapping** via tokens `--q-blur`, `--q-motion`, `--q-shadow`: High 1.0; Medium 0.6 blur and shorter motion; Low solid tinted surfaces and fades only; Very Low no animation. Reduced motion: opacity only, no parallax or loops.
- **Strobing:** nothing UI-level flashes. Pulses are slow (at most 0.5 Hz), low amplitude, and obey the strobing profile.

### 1.4 Interaction states (one system)
- **Hover:** surface brightens one glass level, hairline to 22 %, the light-following edge appears; interactive cards lift 4 px with a softer shadow, controls lift 1 px. Six standard hover behaviors only: `lift`, `glow-edge`, `reveal` (secondary info fades in), `magnet` (small pull toward the cursor, max 4 px), `tilt` (cards only), `press`.
- **Pressed:** scale 0.98, shadow collapses, 80 ms.
- **Focus-visible:** the focus ring above, never removed, never clipped.
- **Disabled:** 40 % opacity, no hover, a tooltip explains why when it is not obvious.
- **Loading:** the fluid progress (brand style) or a breathing dot trio for indeterminate waits; skeletons are dark glass blocks with a slow light sweep. Never a spinner.
- **Empty:** a quiet glyph, one line of text, and one action if there is one.
- **Error:** specific, kind, with the next step, inline near the problem; a toast only for things that are not tied to a place.
- **Targets:** at least 32 px high on desktop; icon buttons 32 px; hit area may exceed the visual.
- **Destructive actions:** hold-to-confirm (about 1.5 s) for deleting data; click-again for medium risk; typed confirmation for severe loss; always an undo when possible; never a plain modal "Are you sure?".

### 1.5 Components (the kit; see section 2)
Each component has: purpose, anatomy, variants, states, keyboard, accessibility, quality-tier behavior, and a gallery entry.

### 1.6 Patterns
- **Settings rows:** label, one-line helper, control on the right; changed rows show a dot and a per-row reset on hover.
- **Lists and rows:** 40 px rows (comfortable) or 32 px (compact), hover highlight is the glass level, selected rows have a left white 2 px bar.
- **Sheets and drawers:** sheets rise from the bottom with the sheet spring; drawers slide from the right; both dim the page, close on `Esc`, and trap focus.
- **Toasts:** one system, bottom center above the inventory arrow, stack of up to 3, 4 s, with variants for achievements (glyph and tier ticks), undo (action button) and errors (stays until dismissed). Never top of screen except the Electron title-bar area.
- **Popovers and tooltips:** tooltips 400 ms delay, 12 px text, include the shortcut; popovers are glass level 2 with an arrow-less 8 px offset.
- **Help:** every screen and panel has a `?` help button; **Help mode** (`F1` or the `?` key) highlights all help-enabled elements and shows a short explanation on click.
- **Onboarding and hints:** first-use hints are dismissible cards, once.
- **Navigation:** tabs are sliding segmented tabs; breadcrumbs are not used; back is `Esc` or a chevron.

### 1.7 Voice and copy
Sentence case. Short, specific, calm. No exclamation marks, no emoji, no jargon. Verbs on buttons ("Open pack", "Save scene"). Numbers are formatted consistently (`1,234`, `12.4K`, dates like "Oct 4, 2026", relative time under a day). Game terms: pack, card, variant, rarity names capitalized (Rare, Legendary). Errors say what happened and what to do.

### 1.8 Iconography
One inline SVG sprite, 1.5 px stroke, round caps, 16/20/24 px grids, named in a registry; no emoji, no mixed styles. Custom glyph set for the game's own concepts (pack, card, variant slots, tiers). Icons never carry meaning without a label or tooltip.

### 1.9 Sound hooks (no audio yet)
Every component emits a standard event for the future sound system: `ui:hover`, `ui:press`, `ui:toggle`, `ui:open`, `ui:close`, `ui:confirm`, `ui:error`, `ui:success`, `ui:scroll-tick`.

### 1.10 Accessibility
Contrast thresholds above; focus order follows reading order; every control has an accessible name; `prefers-reduced-motion` and the quality tiers are honored; color is never the only signal; hit targets as above; text can scale with the UI scale setting.

### 1.11 Governance (how the rules stay true)
- **Kit-only rule:** new UI uses kit components and tokens; a new pattern is added to the kit and rulebook first.
- A **UI checklist** (10 yes/no items) goes into `AGENTS.md` and the PR template.
- `scripts/lint-ui.js` shows drift; the gallery shows every component in every state and tier.
- Exceptions (packs, cutscenes, studio scene content, the dev menu's relaxed density) are listed in the rulebook with the reason.

## 2. The UI kit (`src/ui/kit/`)

HTML and CSS first with `cb-` class prefixes and `data-*` attributes, plus a small JavaScript enhancement layer (classic scripts; `Cardable.ui.mount(root)` upgrades markup; `Cardable.ui.create(type, props)` builds components in code). Files: `tokens.css`, `base.css`, `components/*.css`, `components/*.js`, `icons.js`, `index.js`.

**Components:** Button (primary, secondary, ghost, hold-confirm, click-again), Icon button, Switch, Checkbox, Radio, Segmented control, Tabs (sliding), Slider, Number field (scrubbable), Text field, Search field, Select/Menu, Keycap and shortcut hint, Chip, Badge, Tag (compact, semi-open, open), Tooltip, Popover, Sheet, Drawer, Dialog (inline and rare modal), Toast, Progress (fluid), Ring progress, Skeleton, Empty state, Panel/Card (glass), List/Row, Section header (sticky), Stat tile, Divider, Scroll area (thin custom scrollbar), Help button, Context menu and Command palette (existing, migrated to the kit styles), Tree/outliner row (for Director mode).

**Gallery:** `?dev=1&gallery=ui` shows every component in every variant and state, at every quality tier, with a density toggle and a reduced-motion toggle.

## 3. Migrate every screen (delete the old one-off styles as you go)

Migrate in this order; each screen drops its legacy CSS when done:

1. **Shared surfaces:** toasts, tooltips, popovers, context menu, command palette, dialogs, buttons everywhere.
2. **Settings (shell only):** two-pane layout (group navigation with icons on the left, content on the right), a search field that filters settings with highlights, per-row reset and change dot, "Restore defaults" per section, deep links from the context menu and command palette (`openSettings(settingId)`). Make it **schema-driven**: groups and rows render from `settings-schema` entries (including `advanced: true` and `group` fields) so the Controls update only adds data. Add the Simple/Advanced toggle scaffold (Advanced shows rows flagged advanced; the content arrives in Controls). Pin the live preview card.
3. **Achievements:** a hero header (progress ring, count, "next up" suggestions), category rail, tile grid, detail drawer, redesigned unlock toast (kit toast variant). Each achievement gets a **procedural monochrome emblem** (an SVG sigil generated from its id with tier ornaments) so tiles are visually distinct. Hidden ones show a blurred emblem.
4. **Inventory text:** a proper type hierarchy for tiles, headers, counts, filters and empty states: names Inter 500/600 14 px with ellipsis and tooltip, secondary mono 11 px labels, tier chips, stack counts as a small pill, no text over art without a scrim, consistent baseline, consistent number formats.
5. **Tags:** rebuild on the kit's Tag component (compact, semi-open, open) with consistent geometry and the state machine from the stability update.
6. **Patch notes screen** (new): a sheet opened automatically after a version change (once) and from About and the command palette. Left: a version timeline (version, date, unread dots). Right: the selected version with a large version number, date, a highlight slot (image or short loop from `assets/patch/<version>/`), sections with icons (New, Improved, Fixed, Balance, Known issues), "Try it" buttons that deep-link into features, search, copy as Markdown, keyboard navigation. Source of truth: `src/data/patchnotes.js` (structured data); `scripts/gen-changelog.js` generates `CHANGELOG.md` from it. Seed it with the `Unreleased (1.2.0)` entries.
7. **Mini mode:** lighter and better. A separate lightweight window page (`mini.html`) that does not load the heavy game UI: it shows the next pack (its real skin, simplified), the countdown, a compact stack indicator and an Open button; receives state from the main process over IPC; renders at about 30 fps; no dot grid, no WebGL; pauses when occluded; draggable anywhere, remembers position per display, always-on-top toggle, opacity setting, right-click kit menu, double-click to expand. Opening a pack expands the main window into the normal opening.
8. **Card loading visualizer:** a kit loader for card art and effects: the card silhouette outline draws itself with the fluid fill, a skeleton shimmer in the art window, and a label with real progress; also used while cutscenes or studio assets warm up (a segmented ring per asset group). Never blocks input; bounded in time; reduced motion simplified.
9. **Performance overlay:** migrate the Simple and Advanced overlays to kit styles.
10. **Director mode (studio) UI:** migrate the toolbar, panels, inspector, library, timeline and dialogs to the kit (the studio may use a denser `compact` density and the viewport gizmo tints; panels, buttons, fields, tabs, toasts and menus follow the kit).
11. **Remaining:** the detail view, pack counter and menu chrome, credits chip, inventory toolbar, tutorial overlay, dev menu (relaxed density but kit controls), cutscene overlay UI (skip hints, notices), Electron panels (import, backups, away panel).

## 4. Help and hover systems

- **Help registry:** `src/data/help.js` entries `{ id, title, body, shortcuts, links }`; `Cardable.help.attach(element, id)`; the `?` help button component opens a popover; **Help mode** highlights every help-enabled element. Write help text for every main screen and panel (short, specific, 1 to 3 sentences, using the live keybinding labels where they exist).
- **Hover system:** the six standard behaviors are classes/attributes in the kit (`data-hover="lift|glow-edge|reveal|magnet|tilt|press"`); apply them consistently across all migrated screens. Interactive cards use `tilt` or `lift`, rows use `glow-edge`, buttons use `lift` and `press`, secondary info uses `reveal`.

## 5. Checkpoints

- **Checkpoint 1:** the rulebook in `Designs.MD`, tokens, the kit, the gallery, the help and hover systems, `lint-ui.js` baseline numbers. Commit.
- **Checkpoint 2:** all migrations (section 3), new screens, legacy CSS removal, final lint numbers, the logic-free sanity pass in the gallery at all tiers. Commit.

## 6. Manual checks

1. Open the gallery at every quality tier, in compact and comfortable density, with reduced motion: every component has all states and looks like one family.
2. Walk the app screen by screen: spacing, type, radii, motion and hover feel identical; no leftover old styles.
3. Settings: search, deep links, reset, change dots and the advanced scaffold work; changes apply live.
4. Achievements, tags, inventory text, patch notes, mini mode, loader and overlays all match the rulebook.
5. Director mode no longer looks like a different app.
6. Help buttons exist on every screen; Help mode works; hover behavior is consistent.
7. `lint-ui.js` shows violations dropped to near zero in migrated files; no console errors; the browser build still works.

## 7. Out of scope

Rebinding and new settings content (Controls), the visual overhaul of packs and cutscenes, sound, Discord, the shop, trading, the market, mobile layouts.
