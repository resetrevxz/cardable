# Designs.MD — Cardable's current design system

This guide describes the current game, publicly numbered **1.1.0** after the 4.2.0 development series, including four graphics tiers, collectible finishes, inventory/detail, cinematics and Electron. Detailed gameplay rules live in the numbered docs; authored scene timings live in [CINEMATICS](docs/CINEMATICS.md). Historical milestone designs are preserved in [the organization archive](archive/workspace-organization/README.md).

## Direction and visual hierarchy

The card is the showstopper. Use a near-black field, precise typography, restrained depth and ample space. The owner permits purposeful color accents in the default theme: use color for identity, selection, difficulty, progress and rewards while keeping shaded surfaces and readable text. Black, white and gray are the optional monochrome theme, not a blanket restriction on default chrome. Avoid decorative dashboard clutter or effects competing with readable names/specs.

The main screen centers the active pack, Cardable wordmark, stock/refill metrics and Credits. Inventory, settings and useful desktop controls remain discoverable. A focused detail/reveal gets visual priority; inactive scenes stop doing decorative work. Lighting comes from the upper left. Materials feel grounded and deliberate, never like an arbitrary glowing rectangle.

## Tokens and typography

[src/styles/tokens.css](src/styles/tokens.css) is the source of truth. Extend shared tokens rather than copying inconsistent local values.

| Token family | Current baseline |
|---|---|
| Background / surfaces | `#08080A` / `#111114` / `#17171B` |
| Text / dim / faint | `#F5F5F7` / `#8E8E93` / `#48484A` |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 72 px |
| Corner radii | Card 20, pack 22, sheet 28, button 12 px; retain squircle fallback |
| Timing | Fast 150, UI 250, sheet 500, fade 600 ms |
| Primary easing | `cubic-bezier(0.22, 1, 0.36, 1)` |

Use locally bundled Inter for UI and JetBrains Mono for values, labels, serials and technical detail, with system fallbacks. **VT323 is allowed only inside the Classic pack's terminal artwork. Bodoni Moda is allowed only for ASCENDANT artwork.** Mythical's Gothic title is original vector lettering. These exceptions do not authorize extra menu fonts.

Prefer solid shaded surfaces for browsing and Settings over blurring the whole game. Very Low/Low use solid tinted panels. Medium/High can use the independent glass policy for appropriate local surfaces; Inventory remains shaded at every tier. Preserve borders, readable contrast and foreground separation when blur is disabled.

## Four graphics tiers

Every tier retains the collectible's identity, readable information and all gameplay actions. Quality scales decoration and work, never rewards or timing rules. Medium is the default. Settings can customize each effect without losing other preferences.

| Preset | Presentation and resource intent |
|---|---|
| Very Low | Static collectible materials, simplified ornaments, no cosmetic particles/dots/trails or live finish mounts; solid panels and calm Canvas cinematics. Canvas DPR ceiling 1. |
| Low | Lightweight focused finishes/reflections/props, sparse decoration and single grounding shadow; solid panels, interaction-led motion and simplified cinematics. Canvas DPR ceiling 1.25. |
| Medium | Balanced focused materials, bounded particles/backgrounds, two shadow layers and moderate local glass; balanced scene geometry. Canvas DPR ceiling 1.5. |
| High | Full focused material/prop detail, refined glare/edge lighting and bounded full scene effects; full local glass/shadows. Canvas DPR ceiling 2, with narrower scene-specific caps where defined. |

The independent controls are card finishes, reflections, borders/props, particles, shadows, glass/blur, background effects, ambient animation, canvas resolution and cinematic detail. Changing one shows **Customized**. Applying a preset changes only those ten controls. Text stays at native CSS resolution. See [GRAPHICS-UPDATE](docs/GRAPHICS-UPDATE.md) and [settings-schema.js](src/data/settings-schema.js) for exact rates and choices.

FPS stays independent: Display refresh, 20, 30, 45, 60, 90, 120, 144, 165 or 240. Hidden-tab options are Sleep completely and Timer/title only; visible unfocused windows can run normally, cap at 30 or pause visuals. Refill reconciles elapsed time on wake. A performance display must sleep with the game and label Idle/Paused honestly; it is not a GPU profiler. Recommendations offer a lower preset and require an explicit action.

Use the shared scheduler. Full card effects belong to the focused card; browsing uses static front thumbnails, viewport-aware mount budgets and bounded caches/layers. Stop offscreen, hidden and inactive decorative work, and dispose temporary GL targets, particles and material bindings. High is a visual target with these same optimizations, not a guarantee of 240 FPS on every device.

## Motion, input and accessibility

Interaction feedback is usually 150–250 ms; sheets use the shared longer settle. Transform and opacity carry motion. Avoid layout animation and per-item recurring clocks. Hover, pointer tilt and decorative breathing obey quality, focus and activity policies.

Reduced motion is independent of quality. Use static poses and brief fades instead of camera travel, shaking, continuous rotation or moving wallpaper. Keep actions and collectible identity equally clear. The existing Color theme setting (`rarityColor`, color/mono) governs card/cinematic material accents and achievement chrome/artwork. Mono converts these accents and backgrounds to neutral values; new colored UI must provide the same neutral fallback without hiding status or actions.

Achievements uses lavender weekly headers, teal recurring headers, rose pinned headers and warm credit rewards. Difficulty accents progress from mint Common to green Uncommon, periwinkle Rare and amber Legendary. Text labels and milestone border patterns carry the same meaning in both themes. Default achievement illustrations use a static tint; monochrome displays their original neutral art. Keep these accents in shared tokens, with no new animated wallpaper or renderer.

Controls need visible focus, real keyboard actions, understandable disabled/selected states, modal focus trapping and focus restoration. Essential coarse-pointer actions have at least 44 px targets. Touch has hold-to-open, cutting/Tear fallback, Flip and Keep/Delete. Hints may quiet down; essential controls remain usable. Never rely on hue, hover or a tiny icon alone.

## Cards, inventory and detail

Card face/back anatomy, rarity props, specs and permanent variants are governed by [03-CARD](docs/03-CARD.md), [02-RARITIES](docs/02-RARITIES.md) and [VARIANTS-AND-TAGS](docs/VARIANTS-AND-TAGS.md). Preserve real timestamps, serials and provenance. No fabricated specs, rarity indicators on an Unfound Secret, arbitrary extra color or duplicate reward effects.

Shelf/Grid browsing uses static front-only thumbnails and local small art. Selecting promotes one full card; closing restores a fresh thumbnail and releases full bindings. Detail hides/dims the browsing scene instead of leaving many active materials behind it. A roughly 360 px information panel stacks on narrow layouts below 900 px. Content order emphasizes the collectible and meaningful provenance rather than repeating tier/serial/spec labels everywhere.

The detail overview is a quiet single pane. Inspect is the primary detail action; Favorite, Flip and More remain compact but accessible. Metadata tags are neutral except approved pack identity, with the useful variant/pack/fresh tags before overflow. Multi-select or bulk actions require their own scope.

Detail content uses the existing 40 ms stagger, 8 px rise and 250 ms settle when motion/animation quality allows. High alone adds the local 4 px blur when its glass policy allows; Medium keeps the rise without blur, and lower tiers favor opacity or static presentation. Segment/detail changes keep short readable transitions and respect reduced motion. [06-INVENTORY](docs/06-INVENTORY.md) owns layout, grouping, mount budgets and filters.

Inspect/Director uses the actual selected instance and separate photo storage. Keep editing tools out of normal play, offer clear close/reset/export actions, and use file-safe art-data paths where export needs an untainted canvas. Local imported photos must not be lost by JSON replacement or ordinary workspace cleanup.

## Main screen and activity

The stock counter, refill timer and Credits are quiet, legible metrics. The pack drives the central interaction. Hold remains three seconds; cutting and reveal use the central opening state machine. Space-to-Keep obeys readiness and modal guards. Presentation does not alter pulls, rewards or reservations.

Idle fade defaults to 15 seconds, retaining the small wordmark and useful metrics. The later AFK view uses a minimal timestamp/metrics presentation and suspends decorative scene work. Pointer proximity wakes appropriate controls without churning the whole scene. Waking must preserve an in-progress reveal. Timing choices and the ten-minute AFK behavior are in [05-MAIN-MENU](docs/05-MAIN-MENU.md).

## Authored color and artwork identities

These authored surfaces retain their own palettes. Default chrome may use the purposeful accents described above; do not borrow an unrelated pack's branding for a control. Monochrome remains a saved theme choice.

| Surface | Approved identity |
|---|---|
| Rarity faces and direct accents | Data-defined rarity/variant colors; Mono remains available. Rare retains sapphire identity. |
| Brand packs | NVIDIA, AMD, Snapdragon and Apple wrapper colors, queue markers and provenance tags. |
| Classic | Aged beige PC case, amber CRT/terminal, persistent bezel and engraved shared back; VT323 confined to terminal art. CLASSIC catalog identity remains independent from pack provenance. |
| Royal | Faceted gold/crown, red woven band and lacquer holder; restrained wrapper/tag accents. The holder hint and keyboard fallback stay clear. |
| Titan | Brushed steel `#8E9399`, carbon and ice-white armor/vault. No brand logo; the registered unseal interaction delegates to ordinary reveal. |
| Picker | Pearl-white triptych, aluminum, engraved offer numbers and teal `#2DE2B8` wrapper/window/queue accents. Preview one focused offer at full quality; confirmation remains an explicit second action/hold. |
| Authored cinematics | Approved rarity worlds and their retained fields, bounded by quality, Mono, reduced motion and Safe/Full policies. |

Pack contracts and art recipes are in [04-PACK-OPENING](docs/04-PACK-OPENING.md), [ARCHITECTURE](docs/ARCHITECTURE.md) and [historical pack specs](archive/update-history/README.md). Picker's three offers remain unminted until confirmation; its selection presentation cannot imply ownership of every offer.

## Cinematic presentation

Scenes read an already reserved instance. Conceal its face until the real handoff; a fake-out may never expose the reserved Secret front. The actual card back mounts at the authored handoff, flips through the shared controller and keeps the ordinary readiness/Keep/Delete gates. Skip, reload and quality changes do not reroll or pay again.

The current stories include sapphire star/cloud, refractive gel, gilded prism, Mythical Crimson Clock, Exotic galaxy, Ascendant Prismatic Dawn and Secret Fatal Exception. Their current complete descriptors supersede early A/B design fragments. Full/Short/Off is independent of cinematic quality; Very Low/reduced motion/Off retain understandable calm routes. [CINEMATICS](docs/CINEMATICS.md) is authoritative for durations, handoff, resources and unresolved acceptance.

Safe is the default strobing profile. Full requires the existing three-second confirmation; Full Secret has a pre-roll choice with an eight-second Safe fallback. Final-output luminance limits and the emergency brake remain authoritative over authored beats, Fast and scrubbing. No new flashes are authorized by a graphics preset.

Retained fields leave a readable center and bounded quiet motion: static Legendary crystals, Mythical rim smoke/embers, the same Exotic stars, Ascendant's serial-seeded pastel field and Secret's Found field. Reuse the session seed/clock at handoff; recovery uses the quiet deterministic endpoint. Never attach a live reveal field to shelf thumbnails. Dispose foreground resources and stop retained updates when hidden/inactive.

## Desktop and settings

Electron adds the existing system window frame, Mini/taskbar integration, command palette, bundled Help, diagnostics, explicit recovery and local captures. Keep their UI consistent with the main chrome; native bridges handle filesystem/window/update operations. No developer setup belongs in the player path. [PLAY](PLAY.md) describes installation; [ELECTRON](docs/ELECTRON.md) and [UPDATES](docs/UPDATES.md) describe native behavior.

Settings dims/shades the scene and uses a focused preview governed by the selected policy. Group graphics, performance, accessibility, controls and Data coherently. Preserve independent FPS/quality/motion controls and clearly distinguish temporary battery/Safe Mode overrides from saved preferences. Sound remains unavailable. Import/restore/reset actions require their existing explicit choices and recovery safeguards.

Welcome/Help should get a player to opening and recovery without a terminal. Updater status is quiet and specific; display actionable errors and keep saves safe on quit. Development UI is opt-in through the existing development route and stays absent from normal play. Preview/replay tools must not mint real rewards.

## Acceptance and future changes

The public download page in `site/` uses the same monochrome typography and restraint, as nine authored scenes: arrival, pack ritual, reveal, real finishes, interactive demo collection, serial archive, four complete Safe rarity cutscenes with play/pause/restart, installation and finale. Actual game renderers and generated product posters carry the story; graphics tiers are a short installation disclosure. It is a separate static website; build it with `site:build`. Illustrations must be identified honestly, download links must derive from release versions, and essential content must work without animation or JavaScript. Keep development commands out of the player installation flow.

Source integration, a built installer and a successful app session are different evidence. [BUGS](docs/BUGS.md) and [ROADMAP](docs/ROADMAP.md) retain runtime, device, motion, cinematic, photo and installer gaps. Historical observations are archived with their original scopes; they do not certify the present game. Follow [PROMPTING](docs/PROMPTING.md) for the owner's restricted verification policy.

New design work should improve hierarchy, clarity and resource bounds within the approved rules. Put unrelated concepts in [POLISH-BACKLOG](docs/POLISH-BACKLOG.md), rather than adding unrequested gameplay or visual systems.
