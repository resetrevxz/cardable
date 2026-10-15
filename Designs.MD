# The Cardable design rules

Current app: **1.7.5**. The 1.2 series includes the One Cardable foundation, Controls update, desktop reliability and frame consistency passes. The owner's instruction permits purposeful color in the normal theme; full monochrome belongs to the saved Color theme setting. The older monochrome-only sentence in the incoming brief is superseded.

## 1. Principles

1. The card is the hero. Chrome recedes; artwork keeps its identity.
2. One surface language: near-black ink and local frosted glass. Browsing and Settings keep readable dark glass with solid accessibility fallbacks.
3. Restraint: fewer elements, more space, one primary action per decision.
4. Physical light: a top-left lamp, a top hairline and a pointer-following edge where quality permits.
5. Motion explains change. Ordinary feedback takes 150–240 ms; cinematic pacing remains separately authored.
6. Precision: a 4 px grid, concentric radii, optical alignment and tabular numbers.
7. Quiet color: periwinkle selection by default (the player may choose another accent), mint success, warm progress/rewards and rose destructive/error accents. Meaning always has a label or shape. Mono replaces semantic accents with neutral values.
8. Consistency over novelty: reuse the kit; add a pattern to its API, gallery and rules before using it.
9. Design idle, hover, pressed, focus, disabled, loading, empty and error states.
10. Accessible by default: visible focus, meaningful labels, predictable keyboard navigation and reduced motion.

## 2. Foundations

The source of truth is `src/ui/kit/tokens.css`, with compatibility aliases for existing card, pack and layout contracts in `src/styles/tokens.css`.

| Foundation | Rule |
|---|---|
| Ink | 0 #08080A; 1 #0E0E11; 2 #141418; 3 #1B1B20 |
| Glass | White 4/6/9%; blur 12/24/40 px, saturation 140%; solid fallback at Very Low/Low |
| Stroke | White 10/16/22%; top highlight 18%; focus 2 px white 70% with 4 px white 15% outer ring |
| Text | Primary #F5F5F7, secondary #A1A1A6, tertiary #94949B (raised from the brief's faint value for readable small text); disabled opacity 40% |
| Type | Local Inter and JetBrains Mono; weights 400/500/600. Display 48/52/-0.04em/600; title 28/32/-0.03em/600; heading 20/24/-0.02em/600; body 14/20/400; strong body 500; small 12/16/400; mono label 11/14/+0.08em/500 |
| Space | 4, 8, 12, 16, 24, 32, 48, 72 px; inner padding 16/24; related gaps 8, group gaps 24 |
| Radius | Tiny 6, control 10, panel 14, card/sheet 20, large sheet 28, chip 999; inner radius = outer minus padding |
| Elevation | Four layered shadows (sm/md/lg/xl); page scrim 40% ink |
| Layers | Content 0, sticky 10, panels 20, sheets 30, overlays 40, toasts 50, tooltips 60, cursor 70 |
| Layout | Existing 1920×1080 scale; max sheet 1200, Settings 704 docked left, dialog 480, popover 320; safe-area insets; comfortable 40 px rows, compact 32 px |

Use variables for color, timing, easing, radii, layers and shadows. Never convert collected art, pack identities or authored films into arbitrary generic component colors. Minimum contrast targets are 4.5:1 for body text and 3:1 for large text/icons; a token is not itself an accessibility certification.

## 3. Motion

Instant 80, fast 150, base 240, slow 400, sheet 500, cinematic 800+ ms. Entrances/hover use `cubic-bezier(0.22,1,0.36,1)`; movement uses `cubic-bezier(0.65,0,0.35,1)`; progress uses linear. Springs: soft 140/16, snappy 220/26, sheet 200/28. Enter with an 8 px rise, up to 4 px unblur and opacity; 40 ms stagger capped at eight items. Exit fades with a 4 px sink over 120 ms.

Animate transform, opacity, filter or clip-path, never layout or `transition: all`. Numbers use the existing rolling digits. No UI flash; slow pulses at most 0.5 Hz. High uses full detail, Medium reduced blur/motion, Low solid surfaces and fades, Very Low static states. The independent glass/animation/shadow controls take precedence over preset defaults. Reduced motion uses opacity/static poses without pointer parallax or cosmetic loops. No component owns an idle RAF; enhancement runs on interactions and mount changes, and progress uses the existing scheduler.

## 4. Interaction states

Hover raises a control 1 px or an interactive card 4 px and strengthens its edge. The six behaviors are `lift`, `glow-edge`, `reveal`, `magnet` (max 4 px), `tilt` (cards only), `press`. Press is scale .98 over 80 ms. Focus-visible is never removed or clipped. Disabled controls explain why when unclear. Loading uses a silhouette/fluid fill, dark skeleton or grouped ring; progress labels describe real loaded/total work, never invented percentages. Empty states offer one explanation and a useful next action. Errors stay next to the failing input or appear as persistent dismissible toasts.

Desktop targets are at least 32 px high; essential coarse-pointer targets are at least 44 px. Gesture actions have keyboard/button alternatives. Destructive confirmation remains hold/click-again/typed according to actual risk, with undo wherever possible. Save/reset/recovery and tier-based deletion safeguards are unchanged.

## 5. Components and API

Classic scripts expose `Cardable.ui.create(type, props)` and `Cardable.ui.mount(root)`; `cb-` classes and data attributes own styling. Mount adds behavior to existing semantic controls without replacing their state, handlers, save contracts or owner geometry. Full control skins are explicit kit components. Help belongs in an owner header; it must not insert an extra child into a sheet or grid. `Cardable.ui.progress` exposes accurate progress updates; `Cardable.ui.loader` is bounded and never blocks input. Components are demonstrated at `?dev=1&gallery=ui`.

| Family | Anatomy / keyboard / states |
|---|---|
| Button, icon button | Label or accessible name, one SVG icon, primary/secondary/ghost/danger/hold/click-again; Enter/Space; full standard states |
| Switch, checkbox, radio | Named control plus selected state; native checkbox/radio semantics or role=switch; Space toggles |
| Segmented control, tabs | Named group, selected item, roving Tab position; arrows/Home/End select; sliding existing indicators share tokens |
| Slider, number/text/search field, select | Named input with helper/error/reset; native keyboard; Alt-drag scrubs kit number fields within bounds; no blocked paste |
| Keycap, chip, badge, Tag | Mono label and geometry; Tag compact/semi/open with hover/focus preview and click pin; no hue-only meaning |
| Tooltip, popover, help | 400 ms initial tooltip; help title/body/shortcuts; Escape dismisses; help uses a readable solid surface |
| Sheet, drawer, dialog | Named surface and close action; app owners trap/restore focus through the existing accessibility API; Escape closes the top layer |
| Toast | Bottom center, up to three, four seconds; achievement, undo/action and persistent dismissible error variants; polite live status |
| Fluid/ring progress, loader, skeleton | Accurate loaded/total or progressbar semantics; calm reduced-motion/static states; no spinner |
| Empty, panel/card, row/list/tree, stat, section, divider, scroll | Shared ink/glass, type and radii; tree/outliner owners preserve selection keyboard; thin contained scroll; no hidden actions |
| Context menu, command palette | Existing action registries and navigation, migrated surfaces and controls; arrows/Enter/Escape; close restores focus |

Every family has a purpose, anatomy, variants, states, keyboard/accessible naming, quality policy and a gallery example. Screen-specific layout remains in kit component styles. Existing `settingsControls` remains an adapter for schema rows and confirmed Data actions.

## 6. Patterns

### Cardable Studio, Director reborn Stage 1

The Studio uses the same ink, text, accent, focus, radii and spacing tokens as the game. The stage and collectible lead. A quiet header carries instance identity, Undo/Redo, Presets, Preview, Photo and Exit; Workspace discloses scenes, history, quality and panel controls. Set, Light, Camera, Animate, Look and Deliver form one predictable page strip. The viewport tool strip occupies its own row so it cannot obscure the card or its tags. Local Studio layout styles live in `src/ui/kit/components/studio-reborn.css`.

Inspector controls have readable 12 px labels, finite typed values, bounded scrubbing, a native slider where appropriate and a named reset action. Drag a numeric label to scrub; Shift is fine and Ctrl/Cmd is coarse. Arrow keys nudge a focused label; Enter/Space or double-click resets. A scrub or slider gesture creates one history command. An empty number draft restores the last valid value. Native color pickers and hex fields remain synchronized with HSV controls; invalid hex text has adjacent feedback. Scene swatches represent actual light colors. They are distinct from the saved UI accent.

Groups fold within a contained inspector and retain their state without resizing the stage. Panel widths use bounded pointer or arrow-key separators. The preset browser is a narrow sheet with real composition tiles, search, six named categories, explicit application semantics and a compact disclosure for saving, importing and seeded variations. Source validation and actual rendered validation are separate. Tiles render at the active tier, load their own bounded companion-card artwork and show sampled poses for motion. Preview errors are labelled instead of being disguised as another composition.

Scene replacement, adding lights and applying a color look affect different domains. Each is one undoable action, with a named history readout and precise Undo/Redo hints. The application choice resets when the preset category changes. Original/grade comparison has a draggable divider and native keyboard slider. Immersive Preview hides tools and panels; Escape returns to the workspace. It never changes the saved scene or mode preference.

All controls have meaningful names and strong focus. Studio tooltips use the kit styling and a scoped 400 ms hover/focus owner that releases on exit. Color and saved monochrome convey the same selected and disabled states. Low tiers keep solid surfaces; reduced motion removes decorative transitions. Thumbnail and capture work stay bounded and use the existing scheduler. The UI gallery’s **Studio precision controls** entry opens the live Studio numeric/slider/reset/history components on a local specimen, without editing a collected card or save.

Backdrop position, local offset, rotation and scale belong to the backdrop, independently of camera and card transforms. Older scenes normalize to the identity transform and original stage. A solid background remains uniform when translated; stage, sweep and grid backgrounds visibly move in both WebGL and the Simple fallback. The detailed scene contract and actual acceptance evidence are recorded in [Director Stage 1](docs/DIRECTOR-STAGE-1.md). Later stages can add the full Simple/Advanced background workflow on this contract.

### Studio photography: Look, Adjust, Capture

Simple Studio is a three-step photography workspace over the same editable scene used by Advanced. The shared `Cardable.ui.create('stepper')` pattern numbers and names each step, uses `aria-current`, retains one Tab stop, and supports arrows, Home and End. Back and Continue retain the image and edits. The kit gallery includes a functioning specimen. A bounded side rail owns the current step; the picture area keeps its dimensions when controls change. Narrow windows place the rail beneath the picture with its own scroll surface. Capture stays in the fixed footer.

Look tiles use the actual collectible, active render quality and selected photo shape. Search and everyday descriptions help choose among the authored styles. Adjust exposes Brightness, Pop, Color and Warmth first; Light areas and Dark areas belong in More adjustments. Sliders show their preset default mark, value, explanation and named reset. A drag or keyboard gesture creates one history edit. Reset adjustments retains the chosen scene; Reset to preset rebuilds its authored composition.

View, Move background and Move card are explicit exclusive tools. Background dragging has a grab cursor and arrow-key alternative, and never pans the camera. Zoom background, Rotate background and Center background share the scene backdrop contract. Tagged set dressing follows the backdrop on a render copy; display supports remain with the collectible. Portrait framing adapts peripheral dressing before applying the player's movement. The collectible, lights and camera keep their identities and edits. Comparison displays the selected look before adjustments, without changing scene data.

Capture offers bounded Fast, High quality, supported 4K and Custom output through the existing photo pipeline. Formats, shape, optional caption/frame/branding and destination have native labelled controls. Progress describes actual tile/sample work. The viewfinder response remains restrained, with no full-screen flash. A successful write alone says Saved to Album. Failed storage or file writes retain the encoded photo and a working Download route. The result offers View photo, Download, Save to Album when needed, Retake and Return to editing. Preview and export use the same framing and grade; optional output frames are shown on the resulting photograph.

The simplified renderer supports these same scene transforms and basic whole-image adjustments, with spatial props and background blur omitted honestly. Blur requires High or Very High WebGL, and 4K is disabled when unavailable. Color, saved monochrome and reduced motion follow the shared kit. No step owns an idle animation clock. See [Director Stage 2](docs/DIRECTOR-STAGE-2.md) for measured acceptance and limits.

### Advanced Studio: scene, color, graphics and Director

Advanced keeps one scene and one history across Scene, Light, Camera, Director, Color & Light, Graphics and Export. The header shows the card, actual working-scene save state, Undo/Redo, presets, commands, preview, named scene saving, quality, photo and exit. The hierarchy owns search, nested groups, visibility and locks; its object library is a disclosure, leaving the layer list readable. The inspector uses contained collapsible groups. Bounded panel separators and the timeline separator accept pointer and arrow-key resizing. Small windows constrain widths and stack the inspector; they do not advertise a horizontal resize handle for a stacked panel.

Select/Move/Rotate/Scale/Camera share compact SVG icons, meaningful accessible names, tooltips and shortcut hints. World/local space, move and angle increments, grid and composition guides belong to View. X/Y/Z use restrained axis colors in Color, labels and neutral strokes in Mono. A transform gesture is one history action. Groups are organizational world-space containers; ordinary grouped placement edits their unlocked physical members once. Alignment and distribution retain spacing inside a selected group. Frame selected/all and cardinal camera views clear conflicting explicit camera coordinates. Locked cameras resist framing and projection changes.

Color & Light presents five ordered control stages: Light, Balance, Contrast, Curves and Finish. Bypass retains the authored values; reset affects only that stage. The controls have real bounded image transforms. Shadows/Midtones/Highlights wheels operate lift/gamma/gain and show RGB values. The Master RGB and channel curves use draggable, keyboard-adjustable points with smooth shape-preserving interpolation. A shared color contract serves WebGL and the bounded fallback; costly optical effects remain disabled with an explanation when unsupported. Optical bloom/blur are evaluated from the scene image; display texture and vignette finish the corrected image. Histogram and waveform sample the actual preview at most four times per second, without an idle clock, and stop when their surface is hidden. Grade presets explicitly replace color/lens settings; one Undo restores the prior correction. Simple sliders resume a bypassed correction stage in the same undoable gesture, and explain this behavior.

Graphics is a screen-space layer workflow for locally bundled text, actual collectible metadata, badges, lines and framing shapes. It uses the same canvas painter in the viewfinder, saved photos and clips. Positions and box sizes are normalized to the picture area, type size to its short edge; output resolution must not change placement. Metadata is resolved from the inspected instance, preserving its serial. Graphic selection supports dragging, proportional resizing, rotation, ordering, duplication, lock/hide, typed values, and center/margin snapping with visible guides. Poster, desktop, phone and square layouts add layers and frame the existing subject with breathing room. Immersive Preview hides editing handles and comparison chrome, showing the finished grade without modifying the saved scene.

Director keeps the existing pose keys and property tracks. Its labels, icons, playhead, time/frame readout and ruler stay readable. Key collisions cancel a move instead of deleting a key. Copy/paste, duplication, markers, interpolation, Bézier handles, Auto Key, camera/light/background tracks and repeat modes use the same transaction boundary. Playback shortcuts belong to Director; text controls keep their native input behavior. The searchable reference reads actual Controls bindings and reports their contexts and conflicts. The UI gallery includes live color and graphic specimens with local history, independent of collected scenes. See [Director Stage 3](docs/DIRECTOR-STAGE-3.md) for actual verification and limits.

### Studio finish: menus and reversible preset trials

Studio context actions use the existing `Cardable.contextMenu.showSurface` owner contract. The same menu painter supplies ink/glass, row icons, shortcut hints, bounded entrance/exit, animated selection, disabled states and keyboard navigation. A Studio heading replaces the pack status. Stationary right-click opens commands without starting a camera edit; right-drag stays a camera gesture. Layers select the clicked object; Graphics actions target graphic layers; Simple actions lead to Look, Adjust and Capture. Escape/Tab/outside click dismiss and restore focus. Native text menus remain available. The menu uses its actual coordinate scale and safe area, including enlarged interface sizes, and releases its scheduler subscription on close. Reduced motion and Very Low keep static poses.

The hierarchy presents each layer as one quiet selected row, with persistent named visibility/lock controls. Studio header wrapping responds to the owner's actual width, including interface zoom, through a local container query. Essential actions stay available. Simple composition tools have compact stacked icons and words; background wheel scaling belongs to Move background, independently of camera locking. Hidden or locked backgrounds explain why their Simple controls are disabled. Reset background transform affects placement only. Hiding the background also hides its tagged dressing, preserving transforms and independent display supports.

Preset tiles retain immediate one-edit Apply and add an explicit Preview action. A trial affects only presentation. Apply preview creates one history command; Return to my scene, closing, changing application semantics or exiting cancels the trial. No trial changes recents, saves or history. The bounded browser keeps the picture visible on desktop and uses the existing contained mobile sheet. Graphics and timed titles are painted from the complete preview scene, using the same scene model. The live preset gallery and existing Studio kit specimens remain the demonstrations. Acceptance and known limits are recorded in [Director Stage 4](docs/DIRECTOR-STAGE-4.md).

### Shop showroom and acquisition (Stages 1–4)

`C.shop.open()` presents one kit sheet over the menu, and `C.shop.close()` releases it. The menu Shop button is the discoverable entry. The sheet uses `Cardable.ui.present` for the modal input shield, keyboard trap, Escape and focus return. The shop owns one contained scroll surface; its top row separates navigation, wallet readout and help from the physical object stage. The featured Titan exhibit uses the actual `titan` pack renderer. Four static, art-only `C.cardView` thumbnails form the daily selection; focused inspection alone mounts a full card. The UI gallery has a Shop showroom entry.

The command palette also opens the Shop. Header controls have 44 px hit targets, including on narrow screens. A short entry rise and first-day offer turn use transform and opacity only; Very Low and saved reduced motion use the static pose. The first-day turn never gates buying. Hold progress belongs to the existing kit control. A purchased Titan card keeps `shop-pack` provenance after Keep, so collection tags can distinguish it from a natural Titan pull. Shop receipts, saved quotes and errors use words as well as restrained surface accents.

Shop uses one continuous dark Titan stage with an angled light beam, a grounded pack and large product typography. Four unboxed card previews follow the stage; copy gives actual names, finish, rarity, price and meaningful ownership or failure state. Omit decorative captions, slogans and repeated save/quote labels. Receipt IDs use progressive disclosure. The native rotation slider works with keyboard and touch; Reset returns to the original pose. Card art opens inspection, with bounded pointer light and tilt and an explicit Turn card action. The real 17-design Titan pool uses a native selector and previous/next controls; previews never reserve an outcome. Full motion carries the selected object between browsing, inspection and a successfully saved receipt using feature-detected native view transitions. Closing, changing motion policy and hiding the document interrupt them; late callbacks cannot reopen a closed Shop. Scroll entry uses one-shot IntersectionObserver/transform/opacity animation. Observers and animations release with the view; no extra frame subscription is added.

Shop settings reuse the saved settings schema and the Gameplay page: Showroom/Compact layout, Cinematic/Quiet motion and daily/price/rarity ordering. Quiet never overrides global reduced motion or graphics limits. Local settings controls use named native selects and preserve focus when reordering existing DOM tiles. A save failure reveals Retry save and Data settings; retry writes current state without replaying the rejected transaction. A successful retry requires a new hold to buy. Recovery never retries over an unresolved recovery choice.

Individual Shop preferences commit before being applied. A failed write retains their prior values and returns native controls to those values, with the existing adjacent save notice. Gameplay settings listboxes retain their current selection; their feedback distinguishes a retained Shop change from ordinary session-only settings. Reset Shop settings restores the five Shop defaults in one metadata commit, preserving the wallet, cards, quotes, lists and all other preferences. Failed reset retains the complete prior Shop selection. Retry saves current state; it does not replay a rejected change. Global restore/default behavior keeps its existing contract.

Purchase history is a quiet receipt list reached by the header's named receipt icon. It reads retained transactions, uses actual paid Credits and the player's date/time formats, filters Cards/Packs, and pages eight records at a time. Receipt IDs, owned serials and finishes expand on demand. Ready packs open through the existing handoff; owned card links request the exact instance, including later copies in a stack. Missing copies have no View action. History has no full card, thumbnail renderer, private clock or save writer. The receipt cap is shown as recent purchases when reached.

Compare offers is a semantic table of saved prices and catalog specs, with four static card previews, a contained keyboard-scrollable region and a pinned row-label column on mobile. Shared memory stays Shared; unavailable values stay a dash, and vendor-specific processor counts retain their own labels. The saved Differences only switch hides identical rows. Inspecting a comparison card returns to its column. Owned/purchased/funds states update after a save; rollover and replacement rebuild the current day. No ranking, market estimate or numeric score is invented. A native mirror failure says Local save is intact when primary persistence succeeded; Retry backup awaits its real result and stays available on a completed receipt.

Wishlist controls use native disclosure under offers and inspection. Select an existing list, add/remove the definition, choose Low/Normal/High priority, or create a named wishlist with that card. Shop uses the inventory model's optional durable path, preserving inventory identity and leaving failed edits unchanged. Buying keeps wishlist membership. Wishlisted first only reorders existing offers; the saved Wishlist marks option hides visual marks without changing membership. Open disclosures do not stretch neighboring offer prices. Save status lives in Shop settings and progressively reveals local write state, native backup presence, current slot, game file and profile location. Check now reads metadata; it neither retries a purchase nor replaces a save. Native results are labeled Present, with a count, rather than an inferred current snapshot.

Daily inspection places Previous, a tabular position, Next and Turn card under the full card. Left/Right browse in the saved offer order and preserve the originating Shop/comparison route. Fields keep their native arrows. Browsing cancels an unfinished hold before a deferred object transition; an expired/replaced view cannot step into a new quote. Only the focused card mounts full effects. Controls retain focus after a step, keep 44 px targets and wrap on narrow screens. They use the existing object-transition and calm/static paths, with no extra timer or frame loop. The header stays Shop. Price and purchase precede a native Specifications disclosure; its open state is retained while browsing this Shop session, without a save write.

Save status includes Export save, using the existing checked save envelope and download helper. Primary write failure does not prevent exporting the current retained collection; recovery and boot failure do. Export starts a download and reports that start, rather than promising a completed file. Failure remains adjacent. The export includes Shop receipts and settings, while the short guidance keeps Studio photos on their separate Album route. Export does not retry saving, adopt a rejected purchase or resolve recovery.

`shop-offer` has idle, hover, focus and pressed controls. The price is tabular and always paired with Credits. Stage 3 uses the kit confirmation button for every paid action, with the exact item and price visible before its 1.4-second hold. The rim/fill advances under pointer, touch or focused keyboard pressure; release, exit, blur, Escape and close cancel immediately. The saved card or purchased Titan entitlement appears only after a successful durable write. The receipt presents the real card/pack, new balance and inventory/opening handoff; the bought slot remains marked Purchased and its copy count updates. Ready, unaffordable, purchased, loading, expired, empty and save-error contracts remain in `docs/SHOP-SPEC.md`. Low and Very Low use solid ink and static previews; monochrome keeps labels, borders and focus, while reduced motion removes decorative lift. Closing destroys previews and stops the Shop's single countdown timer.

Collections use a quiet numbered color mark, compact count/completion text and a restrained header tint. `swatch-row` is a labelled radiogroup with None and six existing token accents (Blue, Mint, Amber, Rose, Green, Peach); arrows/Home/End select, each swatch has a name and checked state, and neutral numbered marks retain identity in monochrome. `kind-picker` reuses kit segments for Collection/Wishlist. `wishlist-state` pairs Wanted/Owned with Low/Normal/High priority; Wanted has a dashed edge, Owned a check. These patterns include ordinary interaction/disabled/error states in the UI gallery and use solid surfaces at Very Low/Low.

All cards and Favorites stay first, followed by pinned collections in manual order and the chosen tab-sort view. Tab sorting never saves a different manual order. Reorder uses transform only for 240 ms and stops for reduced motion or disabled animation. Collection options use glass inventory popovers, 38 px fields with the 11 px radius token and 40/32 px rows. Descriptions are limited to 120 characters. Clear uses click-again and a four-second Undo that restores membership without erasing later additions.

Wishlists store definition IDs and retain entries when ownership changes. Their header reports X of Y owned, independent of filtering. Missing entries keep silhouette art and show non-Secret names only in wishlists; Secret retains its Unfound concealment. Empty wishlists explain their purpose and offer Add a card from All cards. Missing first sorts missing entries ahead of owned entries without grouping. All controls restore focus and remain keyboard reachable; no collection pattern owns an idle loop.

Settings is a glass slab docked on the left or right (704 px, 12 px inset, 26 px radius; the `settingsSide` option), so the game stays visible beside it. The rail stays on the outer edge. An 84 px icon rail selects one page at a time, with a sliding accent pill; pages hold titled cards of rows. Rows have label, one-line helper, control, changed dot and reset. Search covers every page with highlights; a page restores its own defaults with click-again and Undo. Simple is the default; Advanced reveals flagged rows and pages and never changes saved values. Layout is data: `C.data.settingsPages` lists pages, sections and keys. Deep links use `openSettings(settingId)`; older group names still resolve.

The preview dock sits under the page. Pointing at or focusing a row shows what it does: `split` previews draw Off and On on either side of a draggable divider, `pair` previews run two panes, and card options show the player's real card. Previews draw on one canvas through the shared scheduler only while Settings is open, rest on a still frame eight seconds after the last interaction, and hold still for reduced motion and Very Low animation. The dock folds away and remembers it. A preview never changes a saved value.

Settings controls: switch, segments, dropdown (button plus listbox), slider with filled track, frame-rate picker (readout, slider, scrollable presets, exact field), graphics tiers, level meter, swatches and wordmark tiles. Scrollable strips keep keyboard roving and scroll the selection into view. Destructive actions keep their levels: hold for Reset save and Full strobing, click-again for restores and imports, a listed preview plus Undo for quick setups.

Lists use 40/32 px rows, a glass hover and selected left accent bar. Sheets rise, drawers enter from the right, and both shade underlying content. Toasts stack bottom-center above inventory. Tooltips include current shortcut labels when available. Every screen/panel provides Help; F1 or ? toggles Help mode. First-use hints remain dismissible. Navigation uses segmented tabs, Escape and chevrons, never breadcrumbs.

## 7. Voice and copy

Sentence case, calm specific language, verbs on buttons, no emoji/exclamation marks/player-facing implementation jargon. Use pack, card, variant and capitalized rarity names consistently. Format tabular numbers, thousands and dates coherently; errors explain what happened and what to do. Long names truncate with a complete tooltip; accessible names remain complete.

## 8. Iconography

One inline SVG sprite in `src/ui/kit/icons.js`, 1.5 px strokes with round caps/joins, 16/20/24 px grids and named icons. Pack/card/variant/tier concepts have glyphs. An icon always has a visible label or accessible name/tooltip. Seeded achievement emblems are collectible sigils, not a second control-icon family.

## 9. Sound hooks

No audio. Components emit `ui:hover`, `ui:press`, `ui:toggle`, `ui:open`, `ui:close`, `ui:confirm`, `ui:error`, `ui:success`, `ui:scroll-tick` for a future system. Hooks never grant gameplay rewards.

## 10. Accessibility

Focus order follows reading order. Native semantic controls come before custom ARIA. Every control has a name, selected and disabled states are explicit, focus returns after closing a layer, and decorative SVG is hidden. Color is redundant with text/borders. Respect reduced motion, user scale and coarse-pointer targets. Imported photos and JSON saves keep their separate recovery contracts.

## 11. Governance and exceptions

New chrome uses the kit and shared tokens; new patterns appear here and in the gallery first. `scripts/lint-ui.js` counts drift by file (a progress counter, not pass/fail). The ten-item checklist lives in AGENTS and the PR template.

Exceptions: authored card/variant/pack/cinematic materials retain their recipes and timings; Studio viewport/gizmos retain scene colors and axis tints; Classic VT323, Ascendant Bodoni and Mythical vector title remain artwork-only; developer tools allow denser layouts. Layout compatibility selectors carry existing geometry into the kit without changing game actions. Archived histories are evidence, not new scope.

Design references: [Vercel interface guidelines](https://vercel.com/design/guidelines), [Apple color](https://developer.apple.com/design/human-interface-guidelines/color), [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Cardable adopts their focus, semantic controls, redundant color, restraint and meaningful-motion guidance within its offline runtime.

## Appendix: retained gameplay, artwork and delivery contracts

# Designs.MD — Cardable's current design system

This guide describes the current game, publicly numbered **1.3.3** after the 4.2.0 development series, including five graphics tiers, collectible finishes, inventory/detail, cinematics and Electron. Detailed gameplay rules live in the numbered docs; authored scene timings live in [CINEMATICS](docs/CINEMATICS.md). Historical milestone designs are preserved in [the organization archive](archive/workspace-organization/README.md).

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

Prefer solid shaded surfaces for browsing and Settings over blurring the whole game. Very Low/Low use solid tinted panels. Medium/High can use the independent glass policy for appropriate local surfaces; Inventory uses translucent frosted glass at Medium and above and a solid fill below. High/Very High add three bounded 16 px refracting rim strips, a brighter bevel and subtle spectral coating; Medium omits refraction and uses denser 12 px frost. The independent Glass / blur setting controls this material; explicit customized settings stay independent. Preserve borders, readable contrast and foreground separation when blur is disabled.

## Four graphics tiers

Every tier retains the collectible's identity, readable information and all gameplay actions. Quality scales decoration and work, never rewards or timing rules. High is the new-player default. Settings can customize each effect without losing other preferences.

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

Inventory pointer previews wait 110 ms before constructing live materials and 130 ms before returning to the complete static front. Crossing a tile briefly never rebuilds it. Keyboard focus promotes immediately; only one browsing tile is live. Cancel pending work on recycle, removal, detail handoff and restore, and reject promotion on hidden/inert surfaces or a hidden document. Detail explicitly restores pointer interaction and accessible visibility on an inherited live preview, then makes its returning visual noninteractive.

Card face/back anatomy, rarity props, specs and permanent variants are governed by [03-CARD](docs/03-CARD.md), [02-RARITIES](docs/02-RARITIES.md) and [VARIANTS-AND-TAGS](docs/VARIANTS-AND-TAGS.md). Preserve real timestamps, serials and provenance. No fabricated specs, rarity indicators on an Unfound Secret, arbitrary extra color or duplicate reward effects.

Shelf/Grid browsing uses static front-only thumbnails and local small art. Selecting promotes one full card; closing restores a fresh thumbnail and releases full bindings. Detail keeps the static browsing scene visible beneath a shaded scrim, with background interaction disabled and no full-window blur. The lifted card remains grounded in its collection during entry and return. A roughly 360 px information panel stacks on narrow layouts below 900 px. Content order emphasizes the collectible and meaningful provenance rather than repeating tier/serial/spec labels everywhere.

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
| Titan | Brushed steel `#8E9399`, black heatsink window and ice-white LEDs; a faceted shroud released by a three-click knob. No brand logo; the registered unseal interaction delegates to ordinary reveal. |
| Picker | A clear sleeve with three card backs and teal `#2DE2B8` label, ring and queue accents. The three offers are shown, shuffled by hand and picked from their backs; confirmation remains an explicit second action/hold. |
| Authored cinematics | Approved rarity worlds and their retained fields, bounded by quality, Mono, reduced motion and Safe/Full policies. |

Pack contracts and art recipes are in [04-PACK-OPENING](docs/04-PACK-OPENING.md), [ARCHITECTURE](docs/ARCHITECTURE.md) and [historical pack specs](archive/update-history/README.md). Picker's three offers remain unminted until confirmation; its selection presentation cannot imply ownership of every offer.

## Cinematic presentation

Scenes read an already reserved instance. Conceal its face until the real handoff; a fake-out may never expose the reserved Secret front. The actual card back mounts at the authored handoff, flips through the shared controller and keeps the ordinary readiness/Keep/Delete gates. Skip, reload and quality changes do not reroll or pay again.

The current stories include Rare's blue side light, layered sky, curved glass star, accelerating cloud timelapse and continuous pale-blue fracture wash, Super Rare's suspended light pillar, layered cloud seal, star constellation, refractive glass collapse and single white climax, purple refractive gel, Double Super Rare's blended blue/gold glass and turning prism, gilded prism, Mythical Crimson Clock, Exotic galaxy, Ascendant Prismatic Dawn and Secret Fatal Exception. Their current complete descriptors supersede early A/B design fragments. Full/Short/Off is independent of cinematic quality; Very Low/reduced motion/Off retain understandable calm routes. [CINEMATICS](docs/CINEMATICS.md) is authoritative for durations, handoff, resources and unresolved acceptance.

Full is the new-player strobing profile by the owner's explicit instruction. Switching from Safe to Full in its direct setting retains the three-second confirmation; Full Secret has a pre-roll choice with an eight-second Safe fallback. Final-output luminance limits and the emergency brake remain authoritative over authored beats, Fast and scrubbing. No new flashes are authorized by a graphics preset.

Retained fields leave a readable center and bounded quiet motion: static Legendary crystals, Mythical rim smoke/embers, the same Exotic stars, Ascendant's serial-seeded pastel field and Secret's Found field. Reuse the session seed/clock at handoff; recovery uses the quiet deterministic endpoint. Never attach a live reveal field to shelf thumbnails. Dispose foreground resources and stop retained updates when hidden/inactive.

## Desktop and settings

Electron adds the existing system window frame, Mini/taskbar integration, command palette, bundled Help, diagnostics, explicit recovery and local captures. Keep their UI consistent with the main chrome; native bridges handle filesystem/window/update operations. No developer setup belongs in the player path. [PLAY](PLAY.md) describes installation; [ELECTRON](docs/ELECTRON.md) and [UPDATES](docs/UPDATES.md) describe native behavior.

Settings shades only its own side of the scene and previews options in its dock. Pages group graphics, performance, appearance, motion, gameplay, accessibility, controls and Data. Preserve independent FPS/quality/motion controls and clearly distinguish temporary battery/Safe Mode overrides from saved preferences. Sound remains unavailable and has no placeholder rows. Import/restore/reset actions require their existing explicit choices and recovery safeguards.

Welcome/Help should get a player to opening and recovery without a terminal. Updater status is quiet and specific; display actionable errors and keep saves safe on quit. Development UI is opt-in through the existing development route and stays absent from normal play. Preview/replay tools must not mint real rewards.

## Acceptance and future changes

The public download page in `site/` uses the same monochrome typography and restraint, as nine authored scenes: arrival, pack ritual, reveal, real finishes, interactive demo collection, serial archive, four complete Safe rarity cutscenes with play/pause/restart, installation and finale. Actual game renderers and generated product posters carry the story; graphics tiers are a short installation disclosure. It is a separate static website; build it with `site:build`. Illustrations must be identified honestly, download links must derive from release versions, and essential content must work without animation or JavaScript. Keep development commands out of the player installation flow.

Source integration, a built installer and a successful app session are different evidence. [BUGS](docs/BUGS.md) and [ROADMAP](docs/ROADMAP.md) retain runtime, device, motion, cinematic, photo and installer gaps. Historical observations are archived with their original scopes; they do not certify the present game. Follow [PROMPTING](docs/PROMPTING.md) for how to verify work.

New design work should improve hierarchy, clarity and resource bounds within the approved rules. Put unrelated concepts in [POLISH-BACKLOG](docs/POLISH-BACKLOG.md), rather than adding unrequested gameplay or visual systems.

## Controls and release showcase

The keybinding editor uses kit buttons in one stable row: action and context, primary, secondary, Reset and Clear. Capture has an explicit waiting state; conflicts name the affected action and context and offer Swap or Clear. Escape cancels capture; Ctrl/Cmd+, always reaches Settings. Treat context shortcuts separately from native focus navigation.

Profiles use a kit dialog showing every changed value before Apply. Cancel preserves the previous state, and the following toast keeps its Undo action visible even when informational toasts are hidden. Advanced visibility uses root attributes, never removes the card or the emergency Settings routes, and stops hidden effects. Numeric scale and frame choices do not alter authored cutscene time.

The release showcase uses actual local artwork, typography-led feature sections, finish specimens and nested card inspection. A preview specimen is clearly marked and never minted. Static previews are bounded; only the focused inspection receives live card effects. Accent selection follows the saved color/mono theme. Component examples live in the UI gallery; Controls and Profiles link to their actual Settings sections.

Reference principles: [Vercel web interface guidelines](https://vercel.com/design/guidelines), [Apple keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards), [Apple color](https://developer.apple.com/design/human-interface-guidelines/color), and [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Local Cardable tokens and offline contracts remain authoritative.

## Smooth and seamless (1.3.0)

Nothing should vanish, jump or arrive without motion. These rules apply to new work:

- **Sheets carry their contents.** While the inventory sheet moves, its cards, tabs and tools stay visible and fade with `--inventory-open` (0 at peek, 1 at the normal height). Content is hidden only once the sheet has come to rest.
- **Size follows position.** Between two heights the card views are sized from the sheet's current position each frame, so a height change never lands as a jump.
- **One layout per header.** A header keeps the same arrangement in every state; elements that only apply to one state reserve their space and fade.
- **Pages ease in.** Changing a page inside the sheet plays `cb-page-in` (rise, fade and a short unblur) on the incoming page. Cards, Achievements and the album are peers; choosing a collection returns to the cards.
- **Shared feedback.** Hover lifts 1 to 3 px, press scales to .97, popovers and tooltips arrive with `cb-pop-in`, scrims fade. Use the duration tokens and `--ease-out`; scale durations by `--q-motion`. Everything stops for reduced motion, the Hover animations option and Very Low.
- **Glass.** The inventory sheet uses its shared `inventory-glass` material: High/Very High charcoal opacity 52–74%, 18 px frost, a spectral beveled rim and edge-only SVG refraction. Medium uses 74–86% opacity and 12 px frost without refraction; lower glass tiers and Reduce transparency use solid ink. Monochrome neutralizes the spectral coating. Foreground cards and controls are never distorted, shadows retain their independent setting, and no optical animation clock is added. The UI gallery carries the same material specimen.

The photo album is an inventory page (`src/studio/ui/album.js`): header with usage, search and sort; tag chips; a selection bar; a photo grid; and an inspector for the selected photo. Photos remain in their own IndexedDB store. Deleting uses click-again plus an Undo toast that restores the full photo.

Shared styles for these rules live in `src/ui/kit/components/smooth.css`.

## The card is the menu (1.3.1)

Card detail has no information panel. The lifted card sits alone, larger, with two additions:

- **Hotspots.** The card's own parts are controls: rarity badge, generation, serial, brand mark, name, memory and specs. Each shows a hairline ring on hover or focus and opens a callout beside the card, joined to the part by a leader line. Hover opens after 140 ms and closes after 240 ms; a click or Enter pins it. On narrow windows the callout sits over the card instead. Parts pulse once in sequence when the card arrives so they can be found.
- **Action rail.** Round glass buttons beside the card: Inspect (accent), Favorite, Flip, Copies when there are several, and More (copy serial, export, add to collection, delete). Labels slide out on hover with their key.

A callout carries a mono eyebrow, a title, label and value rows, and at most one accent action (Replay cutscene, Copy serial). Hotspots are bound in `src/ui/detail-panel.js` by selector, so a card skin without a part simply has no hotspot for it. Cutscene replays are free.

## Visual pass notes (1.3.2)

- **Reveal decision.** Under the revealed card: a round Flip, an accent Keep pill with its key, and a quiet Delete that turns rose on hover. One row, centered on the card. Flip lives with the decision, not at the top of the screen.
- **Cut prompt.** The Tear pill sits directly under the pack and the key hint under the pill; they never share a position.
- **Top-right group.** Credits, Help and Settings form one row and leave together when the inventory or Settings opens. Patch notes moved to the Inventory header in 1.5.1.
- **Tags on the shelf.** A card's tag rail shows for the centered, hovered or focused card only. The selected card's tags never sit on its caption.
- **Dialogs, toasts and the command palette** use the same dense glass, light edge and radii as Settings. Help topics are an accordion of cards with a chevron, one open at a time by default.

## Visual pass notes (1.3.3)

- **Inventory popovers** (Filters, Sort, Collection options, New collection) are glass cards inset from the sheet edge. Filter choices are pills that fill with the accent when chosen; the native checkbox stays underneath for keyboard and screen readers.
- **Fields** in the inventory share one recipe: 38 px, 11 px radius, glass fill, a soft focus halo. Search carries its icon.
- **Deleting a copy.** The card preview leads, each caution is a tinted row with a warning mark, and the hold button is rose while Cancel is neutral.
- **Performance overlay** uses the same glass; its sections are small cards with a chevron.
- **Studio, Simple mode.** Photo is the accent pill, the mood slider has an accent thumb, style tiles lift and ring when chosen, and help sits beside the mode switch. Scene colors and gizmos keep their own palette.
- **Teaching motion retires.** The card-part pulse and its hint stop for good once the player has opened a callout, following the rule that frequent interactions should not keep animating.

## Pack material family

Shared silhouette, Cardable header band, central emblem and name/tagline/footer hierarchy; distinct authored palettes and materials. Use 3–4 procedural material layers with believable brushing, lacquer, ceramic, glass, seams and crimps. Three lean planes separate body/emblem/glints by 1–3 px, tied to the same upper-left lamp. Each pack owns ready, waiting/progress, arrival, charge, dissolve, hover, swap, counter and static low-tier states. Signature loops are slow (10–18 seconds), low amplitude and stop when inactive. Medium keeps static materials plus one existing moving highlight, Low one static highlight, Very Low flat; extra work is confined to High/Very High. Briefs live in docs/packs; ?dev=1&gallery=packs exposes tier/state/color specimens. Brand logo handling remains local.

## Pack faces and the turn

Every pack is a real object: a printed front, a printed back and an extruded edge in one 3D pose. The player can move it (drag), tip and orbit it (inspect, V or right-click), and turn it over with **R**, the Flip control beside Open pack, or a double-click.

- **Front first.** Starting a hold always turns the pack to its front; the opening never begins on the back. Reduced motion swaps faces with a brief fade.
- **Backs.** Standard and Rare paint their own backs (fin seal, plain copy, barcode). Other packs show a generic back in their own colours until they are redone.
- **Designed faces** (`design.face` in `src/data/packs.js`, painters in `src/ui/pack-face.js`): artwork is painted once per size into a canvas; reflections are CSS gradients driven by each face's own normal; the only per-frame canvas is the face turned toward the player.
- **Standard:** satin black, the dot grid parked on the right, `SERIES 01`, perforation dots that ignite behind the blade.
- **Rare:** sapphire, a drifting dot network, a chameleon arrival, and a hold in which the printed marks re-form as a white grid. See [docs/packs](docs/packs/standard.md).
- **Brand packs** (milestone B), each with its own startup, hold and cut: NVIDIA (shroud, spinning fan, laser cut), AMD (slash, tachometer), Snapdragon (chip package, routed traces, BGA back), Apple (aurora glass, light ring). Designs live in `src/ui/pack-designs-brand.js`; briefs in `docs/packs`.
- **Classic and Royal** (milestone C): Classic is a beige tower-case front (key power-up, pull seal, pixel-away arrival); Royal is a crimson sleeve under a breathing gold glass coat, opened by tearing both sides, with a plated gold card frame per top tier. Both are boxes with real depth. Designs live in `src/ui/pack-designs-heritage.js`.
- **Search and palette** (1.5.0): search fields are rounded glass with their own icon and show focus as one accent edge with a soft glow, never a ring on the bare input; the command palette lists commands before cards when empty and ends in keycap hints; the shortcut sheet has a live filter.
- **Responsive status** (1.5.0): the pack's status cluster scales 1.2x from 1000 px tall and 1.45x from 1300 px; below 520 px wide the wordmark is 128 px; tutorial Skip and Help sit under the wordmark.
- **Startup** (1.5.0): no panel, no text. A 132 x 4 px bar sits under where the pack will be (`.cb-startup`), appears after a 140 ms delay, fills by easing toward a goal that rises per stage and drifts inside it, stays at least 420 ms once seen, then fades. Settings, Patch notes, Help and the pack status wait (`body.is-booting`); trying to pull the inventory shows a locked toast once. Reduced motion jumps the bar without easing. `?dev=1&bootDelay=3000` holds the start for review.
- **Achievements** (remade in 1.5.0, paused behind `config.flags.achievements`): a two-pane workspace on the inventory sheet. Header (title and summary, week reset chip, help, back), a 300 to 380 px list pane (search, segmented filter, difficulty select, plain section labels, 64 px glass rows with a 40 px emblem tile, title, difficulty and state, a 3 px progress bar and a hover pin) and a record card (112 px emblem over a soft accent wash, chips, 28 px title, progress, objective rows, a gold credit reward with its claim pill, the milestone frame rail). One accent for selection and progress; gold only for rewards; difficulty hues are chips. Phone width shows one pane at a time and drops Back to cards (the tabs lead back).
- **HUD glass** (1.4.2; Patch notes left the row in 1.5.1): the Credits coin, the Settings gear and Help share one glass surface (gradient fill, 1 px edge at 13% white, inset top light, layered shadow, 22 px blur that follows the glass-quality setting) and a 2 px accent focus ring.
- **Pack status cluster** (1.4.1): under the pack, a quiet stack, not a panel: a sentence-case label (Next pack, Regenerating, Pack storage) over the time in 22 px Inter semibold tabular figures with the units dimmed; one prominent **Open pack** pill in the accent with its hold key as a keycap; a secondary **Flip** pill with **R** (pressed while turned, labelled Front); the stock row of 18 x 26 cards (neutral fill when stored, accent fill rising while refilling); and a 12 px counter line. Targets are 34 px (44 px on coarse pointers) with a 2 px accent focus ring. On wide, short windows (500 px tall or less) the cluster stands to the right of the pack and the stage stays centered.
- **Pack stage** (milestone E): the stage rises on shorter windows (`--stage-lift`) so the timer, Open pack, queue and counter clear the inventory sheet; Flip sits beside the timer; each face casts a faint `--face-glow` on the floor through the ground shadow.
- **Titan and Picker** (milestone D): Titan is a faceted aluminium shroud with a window onto a heatsink, opened with a machined knob (`shroudDial`). Picker is a clear sleeve with three card backs, opened with the shared cut and followed by a hand-shuffled pick table (`shuffleThree`: show, turn, gather, overhand drops, riffle, cut, deal, monte swaps, pick). Designs live in `src/ui/pack-designs-halo.js`, the table in `src/ui/picker-shuffle.js`.
- Quality: Very Low is flat with no gloss layers or edge shading; Low keeps one specular lobe; Medium and High add the environment and brushed layers and the network drift; High adds the floor reflection.

- **Credits** (1.5.1): a 44 px glass coin at the left of Help and Settings, with the order Credits, Help, Settings. It is collapsed by default (coin at 78% opacity). The readout (mono label over the tabular balance, `.cb-credits-readout`) slides out to its left on hover, keyboard focus, a balance change (about 2.8 s) or while pinned, and takes no layout space while collapsed. Click or Enter pins a card with the full balance and where credits come from; Escape or an outside click closes it. Proximity chrome and the idle fade still hide the whole chip. Lower glass tiers use the solid fill; reduced motion drops the slide.
- **Patch notes** (1.5.1): a 32 px journal icon in the Inventory header, between the options menu and Help, with an accent unread dot until the current version has been opened. The Release-notes visibility option hides it.
- **Early openings** (1.5.1): Basic, Common and Uncommon are one horizontal line that extends from the centre while seeded particles rise and fall away from it with short fading tails, then it thins and retreats. Basic is white, Common silver, Uncommon lime with a second green and a slight wave. Reduced motion, Off and Very Low draw one still line with a few particles. Exotic and Secret no longer borrow Basic: Exotic starts at its stars and Secret at its black screen (1.5.2).
- **Studio panels** (1.5.1): a closed Layers or Inspector panel is also `hidden`; the viewport keeps column 2 through explicit grid columns so it never collapses.

## Cinematic optics and Very High

High and opt-in Very High share physically plausible procedural lighting and bounded filmic optics. The card remains the visual anchor; grain, edge dispersion, focus, bloom and micro-motion stay restrained. Low/Medium retain their lighter paths, and reduced motion removes gesture ornaments. Hardware gating explains unavailable Very High; temporary fallback preserves the requested saved tier. Window open/fullscreen transitions remain owned by the native platform. Review aids are ephemeral unminted specimens.

## Desktop readiness and update pattern (1.2.3)

The launch surface uses the kit ink, text, radius and shadow tokens, a static collectible silhouette and real preparation labels. Never delay startup to show branding or claim installation on an ordinary launch. First desktop use shows the actual executable folder, separate save/photo guidance and one Start collecting action. Setup uses native Windows folder selection; new installs may choose a location, while updates preserve the registered folder and photo origin.

Installed-app updates download without taking over the game. A labelled corner panel shows download progress only when total work is known. A ready update may count down for 15 seconds only in a focused, visible, idle menu with no pending reveal, recovery, sheet, Studio or editing context. Later defers the session. Saving and the native disk mirror must succeed before restart. Reduced motion and monochrome retain the same labels. The gallery includes launch and update specimens.

## Mini companion

Mini is a separate native 352 × 620 companion with dense ink panels, shared type/color/radius tokens, stock slots, a real timestamp-derived refill bar, one primary Open/Keep action and three recent collected thumbnails. It is always on top and docks Left/Right on the main window's display. The gear saves side and 30/60 FPS; Ctrl+M and Open/Keep use the Controls bindings. Escape closes the gear first, then restores the full game. Picker uses a labelled three-row choice list with 1/2/3 keycaps. Reserved cards say Saved safely; failed saves have a persistent adjacent message. Expand restores the exact pending reveal for inspection or deletion.

The companion loads no catalog, full card renderer, pack material, canvas or film. Artwork is static local thumbnails, bounds are fixed, updates are coalesced to the saved frame ceiling and unchanged snapshots do not rebuild the view. The hidden full renderer retains timer/save ownership and pauses its shared visual scheduler. Reduced motion has no extra movement, and saved monochrome changes both artwork and semantic accents. The full renderer is the only save writer; the mini bridge accepts bounded, token-checked commands and reports completion.

Desktop settings own saved window proportions (Free, 16:9, 21:9), size presets and explicit custom size application. Native dimensions fit the work area. Fullscreen and maximized windows return to windowed mode on explicit size application; the native state keeper remembers the result.

## UI polish (1.7.3)

Controls use the canonical `Cardable.icons` registry: 24-unit SVGs, 1.5-unit strokes and rounded caps/joins. Familiar quick actions may be icon-only with an accessible action name; unfamiliar tools keep short labels. A shared `Cardable.ui.tooltips.attach(scope)` service owns hover/focus descriptions, a 400 ms initial delay, current shortcuts, edge clamping and Escape dismissal. Do not add competing native titles or another tooltip tree. Interactive content belongs in a popover.

Use one Inventory controls panel for Search, Filters, Sort, View, Show unowned and collection options. Retain focused fields and synchronize checked/selected state from saved preferences without rebuilding the panel. Fresh/missing Show unowned is false, while explicit booleans remain unchanged. Patch notes and Help stay separate. Album owns its page heading, compact count and a storage disclosure.

Browsing uses complete static card fronts built from the same text/spec anatomy as detail. Retain the explicit `full` and `art-only` names. Full thumbnails mount bounded static body, finish and prop layers, never a back face or live material tree. At most one hovered/focused card per inventory surface may promote to a live card, and returns to static when inactive. Conceal protected unowned content. Use one visible card with a quantity badge, with real copies available in detail. Sorting moves real tiles; layout replacement never adds decorative cloned cards.

`Cardable.ui.present` returns state and a `closed` promise. Close is idempotent. Input is blocked immediately; the owner, focus trap, frozen preview and background shield persist through the 120 ms exit. Restore input/focus and clean resources only afterward. Navigation handoffs await the outgoing owner. Geometry owners such as Inventory and Studio retain their authored movement. Ordinary controls use 150 ms feedback, panels 240 ms arrival and 120 ms exit, with saved motion/hover/shadow/glass controls respected. Cancel completed WAAPI effects before reusing a surface.

Pack stock sits in the top rail; the main menu retains Shop, Help and Settings. The wallet mounts only inside Shop. Empty states use one relevant icon, a short message and one next action. Keep names, values, prices, stats and meaningful restrictions/failures; move secondary explanations to Help/tooltips. Routine save state uses a quiet icon. Persistent save failures keep an explanation and an export route. For acceptance evidence and the scope map, see `docs/UI-POLISH-1.7.3.md`.
