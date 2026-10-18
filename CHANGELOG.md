# Cardable v1.11.0 — The same Cardable

The Market now looks and moves like the rest of the game.

- **The menu buttons match.** Market, Shop, Help and Settings are four round glass buttons, the same size and the same distance apart. The Shop button was a small square; it is a circle now.
- **A quieter top bar.** The word "Market" is gone and the mark stays. Home, Browse, Auctions, Portfolio and Prices are icons in a glass dock with a sliding highlight, and their names show on hover. The icons were redrawn.
- **The island.** One black pill at the top says what needs you: you were outbid, a swap offer is waiting, an auction you are in ends soon, something just sold. When nothing is open it shows the clock in Local and the connection in Global. Press it to see your trades with a card, a status and the time left for each, and the clock controls under them.
- **Nothing moves when you switch.** Local and Global share every slot: the wallet keeps one width, the island keeps one width, and Home exists in both (Global's has your balance and your trades). The day clock no longer vanishes.
- **Rarer cards look it.** Tiles, suggestions and your holdings take the colour of their rarity. From Uncommon up the rim and glow grow with the tier, Super Rare and above get a foil that crosses the art once, and Legendary and above carry a prismatic edge. Basic and Common stay plain. Portfolio now shows your holdings as cards (with the old list one switch away).
- **Buying feels like something.** A card you buy or win lifts, holds in its rarity's light and flies into Portfolio; a sale sends Credits into your wallet. Legendary and above add a ring of rays. It skips itself under Reduced motion, Very Low quality and Hover animations off.
- **Less cramped, less wordy.** More room around everything, rounder surfaces, pill buttons. "Simulation" is "Local". Section blurbs, repeated disclaimers and long explanations were cut to a line or moved into a tooltip; "Stocks" is "Prices" everywhere.

Saves are unchanged: no schema change, and the Market's rules, prices and odds are as in 1.10.0.

---

# Cardable v1.10.0 — Rarer rares

Rare cards are rare now, common cards are common, and the Market prices follow.

- **Rarer rares.** Across every pack you open, Legendary or better was one card in ten; it is now about one in sixty-six, and Mythical, Exotic, Ascendant and Secret are five to seven times scarcer. Basic and Common are more than 63% of cards (they were 47%).
- **Every pack rebalanced.** Rare Packs now arrive every sixth opening instead of every fourth and hold back the top tiers; Royal Packs are about a tenth as frequent; Titan Packs about a fifteenth; the Classic Pack's Secret boost is halved. Rare Packs still always give Rare or better, Royal still always gives Legendary or better, and the Picker still offers one Rare or better.
- **Prices follow rarity.** Rare through Secret cards are worth two to three times what they were; Basic and Common a little less. The Shop prices of the scarcest cards went up so that buying there and selling on the Market is never a free profit. On average a pull is worth about a third less in Credits, and the lucky ones are worth far more.
- **Livelier Market.** Cards lean toward your mouse and catch a band of light once; the glow takes the card's rarity colour (scarcer cards glow more); suggestions and news react; buttons sink when pressed; the tab underline slides to the tab you pick. Nothing moves for touch, Reduced motion, Hover animations off, or Very Low and Low quality.

Saves are unchanged: no schema change. Cards you already own keep their tier, serial and finish. The full before and after is in docs/RARITY-ODDS-1.10.0.md.

---

# Cardable v1.9.0 — Local Market 2.0

The Simulation is easier to start, calmer to look at, and worth getting good at.

- **A new front page.** The Market opens on Home ("Today"): your net worth counting to its new value, a level and goals, the best moves right now and the news. Each suggestion says what you pay, what you keep after the 2% fee and why, and has one button. Quick Sell is one tap away for cash now.
- **A coach on every listing.** "A good price", "A fair price" or "More than it usually sells for", with what such cards usually sell for and what a resale would keep. It is a guide, never a promise, and says so.
- **A market worth reading.** News names a brand, generation, rarity or card and moves what traders pay, with time to act before it starts. Sellers in a hurry list fire sales under the going price. Market makers keep everyday cards moving. Set a buy order a little under a card's Average Value and it catches a fire sale before anyone else can. In seeded 14-day tests, doing nothing stays flat, clicking at random loses about 10%, and following the coach gains about 68% on average. Measured by simulation, not by people.
- **Less crowded.** Five sections (Home, Browse, Auctions, Portfolio, Prices) and More; the standing Simulation notice is gone; Simple mode shows only the list, the feed tabs and one sort. More room around everything, a two-row phone header, and a search that opens when you tap it.
- **Motion for money.** The wallet pulses and a small "+33" or "−38" rises from it, a price that moves while you look flashes, net worth counts to its new value, a level or goal bursts briefly. All of it is skipped under Reduced motion, Hover animations off, Very Low quality and when the game is hidden.
- **Brisk speed.** Two simulated hours per minute of play (a day in twelve minutes), the default for new profiles; your own choice is kept.
- Fixed: the featured card on Browse could run past the edge of a 360 px phone.

Saves are unchanged: no schema change, and an older Simulation world keeps its traders and gets its first news an hour after loading. Opening a pack still pays nothing; Credits come from selling and trading.

---

# Cardable v1.8.0 — Market Beta

Cardable Market arrives as a beta: a place to sell, bid, swap and watch what your cards are worth. It has two separate worlds. The **Simulation** is an offline market of bot traders that runs on your device only while Cardable is open. **Global** is a market of real players under anonymous names, with its own Credits, and it is only used if you choose to connect.

- **Credits now come from selling.** Opening a pack no longer pays Credits. Quick Sell (always priced below a card's Average Value, and shown before you press it) and Bulk Sell (exact copies, favorites protected, one hold to confirm) pay Credits and leave a receipt with Undo. Existing saves keep their Credits.
- **Simulation (offline).** Buy, list, auction, swap and place buy orders against bot traders. Its clock stops whenever Cardable is closed, hidden or paused. Nothing in it needs the internet.
- **Global (online beta).** Convert your collection once (your offline save is only read), then trade with real players: fixed prices, auctions with proxy bids, reserves, buyouts and anti-sniping, swaps with counteroffers, bundles and buy orders. The server decides every price, fee (2%) and winner, and closes auctions on time even when nobody is online.
- **Numbers you can trust.** Prices and charts come only from completed sales between players, with confidence shown. Portfolio books, alerts, watchlists, comparison and recommendations are included. Cards from packs show "No cost basis" instead of a made-up profit.
- **Pictures, comments and reviews.** Attach your own photos (or Director album pictures) to a listing, ask questions, and review a seller after a completed trade. Pictures are checked and stripped of camera and location data on the server. Reports reach a human moderator.
- **Beta honesty.** A Beta badge is always visible. Help & feedback explains what is kept, the terms, moderation and how to report a problem. The Global economy may be reset with notice; your offline game, Credits and photos never are. If the service is paused or read-only, the Market says so and nothing is lost.
- **Much lighter inventory.** Opening the inventory no longer builds hundreds of idle compositor layers or keeps the menu working behind it. Idle inventory time is down to roughly 1 ms per second in headless measurements, and the Market stops the pack scene, hint arrow and queue behind it too.
- **Calmer first run.** A new profile starts with Reduced motion on when your system asks for less motion. Existing settings are never changed.

Save schema, card ownership and the card, pack and rarity rules are unchanged. The Market's own version is Beta 1.0.0 and is independent of this app version. See docs/market-beta/ for the acceptance record, operator runbook and release record.

---

# Cardable v1.7.6 — Lighter inventory

Inventory keeps complete cards and rarity designs while browsing uses static fronts throughout. Opening a card still brings up its full materials and cursor interaction.

- Removed live hover/focus material rebuilding, full-sheet backdrop blur, rim refraction filters and moving Shelf blur.
- Added clearer glass edges, soft static lighting and a separated header without a live optical pass.
- Appearance → Inventory now includes six background palettes, a custom color picker and 0–100% opacity, with miniature inventory previews and a live Settings dock preview.
- Light backgrounds choose readable chrome colors. Reduce transparency and High contrast make the chosen background opaque.
- Fixed normal-height Grid focus positioning when a complete card is taller than the viewport.

Focused browser/native checks and repeated inventory measurements are recorded in docs/INVENTORY-LIGHT-1.7.6.md. Save schema, card ownership and gameplay rules remain unchanged.

---

# Cardable v1.7.5 — Inventory glass

Inventory now uses translucent charcoal glass that fits Cardable's quiet interface. High and Very High add a brighter bevel, subtle spectral highlights, frosted depth and real backdrop refraction along the rim. Medium uses denser, simpler frost; Low and Very Low retain solid surfaces.

- Refraction is limited to three narrow edge regions, keeping card artwork, stats and controls sharp.
- Glass, shadows and monochrome retain their independent settings. Reduce transparency restores a solid surface, and no optical animation loop is added.
- The complete static cards and the recent first-click and hover-churn fixes remain in place.

Browser and native Electron checks cover quality policies, independent overrides, accessibility fallbacks, actual refracted pixels, controls and supported window sizes. Repeated inventory measurements record the added High glass cost and the rejected full-sheet refraction experiment. See docs/INVENTORY-GLASS-1.7.5.md for evidence and acceptance limits. Save data and gameplay rules are unchanged.

---

# Cardable v1.7.4 — Inventory fixes

Cards opened from a live inventory preview now respond to the cursor on their first inspection. Rapid browsing avoids repeatedly constructing and tearing down full card materials.

- A detail handoff restores pointer interaction on the card; its returning preview becomes noninteractive again.
- Pointer previews activate after a short, cancellable hover. Keyboard focus remains immediate, and one browsing card can use live materials.
- Pending hover work is cancelled when cards are recycled, taken into detail, restored or removed. Complete static fronts, rarity frames and key stats remain visible.

Browser and native Electron journeys check first-click tracking in Shelf and Grid, flip/return, keyboard focus, reduced motion and cleanup. Repeated four-tier hover/scroll measurements compare the same large collection against 1.7.3. See docs/INVENTORY-FIXES-1.7.4.md for measured results and limits. No save schema, card ownership, pack timing or reward changes are included.

---

# Cardable v1.7.3 — UI polish

Inventory cards now show their complete fronts, rarity frames and key stats. Search, filters, sort, view and Show unowned share one compact controls panel. New collections start with Show unowned off; existing explicit choices are preserved.

- **Clearer controls.** Shared SVG icons, keyboard-aware tooltips, visible focus and consistent hover depth. Settings rows have individual icons, including Dot grid and Cursor glow.
- **A quieter pack screen.** Pack availability sits at the top. The redundant card/timer-pack sentence and separate Open/Flip reminder are removed. The Credits wallet lives in Shop.
- **Complete card previews.** Browsing uses static fronts with shared card stats and rarity treatments. One focused or hovered inventory card can use live materials. Duplicate stacks show one card and ×N, with each serial still available in Copies.
- **Useful empty states.** Empty inventory, Favorites, collections, wishlists, Album, purchase history, presets and graphics offer a relevant icon and next action.
- **Album and Studio cleanup.** Compact photo counts, storage details in a popover, icon actions and one empty Album state. Album keyboard Delete uses the same confirmation as its button, ignores key repeat and retains full-photo Undo. Studio and Director remove repeated navigation/status copy and use clearer page names and transport icons. Scene-slot replacement and deletion have confirmation and Undo.
- **Predictable exits.** Closing panels retain their input shield until the exit finishes. Shop, Settings, Patch notes and helper handoffs wait for closure; reusable surfaces remain visible after repeated opening.

Offline play, existing cards, serials, Credits, pack schedules, pending reveals, purchase durability and photo storage remain unchanged. Achievements remain paused; Market and audio remain outside this update.

Verification includes native Electron UI journeys, the four-tier virtual inventory suite, Shop integration, Studio lifecycle, desktop service checks, a twelve-case browser size/scale matrix, Album confirmation/Undo/comparison and repeated animated panel reuse. See docs/UI-POLISH-1.7.3.md for the exact evidence and remaining manual limits. Installer execution, live updater upgrades and broad physical-device performance are not established by these checks.

---

# Cardable v1.7.2 — Director Studio

Cardable Studio has been rebuilt around the collectible. Simple mode takes you through Look → Adjust → Capture; Advanced brings scene editing, lighting, color grading, graphics and Director animation into one shared workspace.

- **Better compositions.** The existing presets keep their identities, with repaired lighting, camera motion, framing, props and support alignment. Twelve new photo looks join the catalog, for 115 authored presets across six categories.
- **Independent backgrounds.** Move, rotate and scale the background without moving the card or camera. Simple has direct drag, arrow keys and scroll scaling; Advanced has layers, typed transforms, gizmos, snapping, locks and animation tracks.
- **Color and layouts.** Ordered correction stages, color wheels, smooth master/channel curves, before/after and real preview scopes. Add local text, actual collectible metadata, badges, lines and shapes, or start with poster, desktop, phone and square layouts. Overlays carry into photos and clips.
- **A quieter workspace.** Refined layers, inspectors, controls, tooltips, resizable panels, timeline and immersive preview, with saved color/monochrome and reduced-motion support. Right-click uses Cardable’s main-menu styling and animation, with proper selection, keyboard navigation, focus, screen bounds and camera-drag handling.
- **Try before applying.** Search, favorites, recent and saved presets retain their existing data. Temporary previews change only the picture; Apply is one undoable action and Return restores your scene.
- **Keep the photograph.** PNG, JPEG and WebP output, supported high-resolution and 4K capture, separate IndexedDB Album photos, saved-scene reopening and supported video-only WebM export. Cancellation releases temporary render work; failed writes retain a download route.

Existing collected cards, ownership, serials, currency, pack reservations and Album blobs remain unchanged. Studio scenes migrate through optional fields without a game-save schema change. The CPU fallback remains a clearly labelled static preview with capability limits; saved graphics preferences are preserved.

Verification included 23 focused regression tests, 43 built-in Studio checks, 2,875 preset renders across five references and five tiers, 470 portrait/landscape composition images, 94 complete Simple photo journeys, color/monochrome layouts, real encoded photo/video output, simulated WebGL failure and export/Album lifecycle checks. The implementation and evidence are documented in docs/DIRECTOR-STAGE-1.md through docs/DIRECTOR-STAGE-4.md.

This release is unsigned. Installer execution, a live updater upgrade, physical touch gestures, long recordings and broad hardware performance remain separate acceptance work.

# Cardable v1.7.1 — Cinematic by default

New players now start with High graphics, full-length cutscenes, Full strobing and reduced motion Off. All ten graphics controls start at High, with normal reveal speed and cutscene skipping disabled.

The Cinematic quick setup now restores full motion, all rarity cutscene routes, Full strobing, normal reveal speed, full variant animation, pack transitions and cinematic Shop motion. It clears both skip-all and play-once options, so a saved skip or reduced-motion choice cannot silently defeat that setup. Review the changes and select Apply; Undo remains available.

Existing saved preferences are retained when loading or upgrading. To enable the complete presentation on an existing save, use Settings → Quick setups → Cinematic → Apply. Safe, reduced motion, lighter graphics and calm reveals remain selectable. Secret retains its flashing notice and existing final-output limits. Market remains disabled.

This release is unsigned. Installer execution, a live updater upgrade and a broad physical-device performance matrix remain separate acceptance work.

# Cardable v1.7.0 — Shop

The Daily Shop arrives with four GPU offers that rotate at local midnight and a featured Titan First Contact pack. Prices stay fixed for the day. Inspect the cards, compare their catalog specs, mark wishlist targets, and hold to buy with Credits.

- A cinematic showroom with interactive card backs, pack rotation, sequential inspection and the complete card-design gallery.
- A 1.4-second hold confirms purchases. Cards retain their serials and Shop provenance; receipts link to the exact copy in your collection.
- Purchased Titan packs use the existing opening ceremony and recover after interruption. They do not consume refill stock or grant the normal pack-opening Credits reward.
- Saved Showroom/Compact layouts, Cinematic/Quiet motion, sorting and comparison preferences. Keyboard controls, monochrome, reduced motion and lower graphics tiers remain available.
- Purchase history, durable wishlist priorities, save status, explicit save/backup retry and direct JSON save export from the Shop.
- Failed purchase writes retain the prior collection and Credits. Failed Shop preference changes retain the saved setting.

This release also includes the existing Rare and Super Rare cinematic updates, blended Double Super Rare glass, and the Windows setup option for reduced motion. Existing saves and app identity are preserved. Market remains disabled and its separate branch is not included.

The Windows release is unsigned. JSON save exports do not include Studio photos; download those separately from the Album. Installer execution, a live updater upgrade and performance across physical devices remain separate acceptance work.

# Cardable v1.6.4 — Celestial seal

Super Rare is completely rebuilt around the supplied references. A small cloud star forms a suspended blue seal above a luminous ground circle. The camera pushes into layered clouds, four curved constellation marks and broken glass arcs around a bright central star. Eight curved glass forms fold inward, refract the clouds and catch changing highlights as the star compresses into a brilliant point. One white explosion ends the cinematic and hands to the existing card reveal.

Full lasts 12 seconds; authored Short retains all six stages in 7.3 seconds. Off/reduced motion/lowest graphics use a calm three-second seal without the cloud atlases or glass shader. Cloud composition and texture uploads are capped at 30 Hz; geometry follows the shared cinematic clock. The 640 px High / 448 px Medium glass target has a Canvas fallback, handles context loss and releases resources after handoff. Materials and the first shader draw warm during the committed wrapper phase.

Verification covered color/monochrome, 1280 × 720 and 390 × 844, Full/Short/Fast/Off/reduced motion, a complete recorded High sequence, the native Medium opening through Keep and reload, and failed Keep followed by exact-once reload recovery. White remains held after backward seeking; monochrome pixels are neutral; context loss falls back and the next run restores the glass renderer. A sampled Rare frame matches 1.6.3 exactly. The real player profile was untouched. Installer execution, live updater and a hardware performance matrix remain unverified. Kept local for review; this build is unsigned.

# Cardable v1.6.3 — Cloudbreak

Rare has a new atmospheric cloud material, a curved glass star, directional bevels and a luminous core. Pale-blue side light introduces the scene; layered clouds cross the star faster and faster, the star fractures into sixteen pieces carrying its last cloud image, and a growing pale-blue wash hands directly to the card. Full lasts 8 seconds; authored Short retains all five stages in 5.2 seconds. Off and reduced motion retain the calm route. Materials warm during the committed wrapper opening and are released after the reveal.

Save warnings now offer Retry saving and clear when storage recovers. Preparation/encoding errors no longer incorrectly mark primary storage unavailable. Caught failures record their operation, stage and error metadata in the desktop log without recording the collection. Reservations and rewards remain atomic.

Verification covered color and monochrome, 1280 × 720 and 390 × 844, Full/Short/Fast/Off/reduced motion, the Rare opening through Keep, injected failed Keep followed by reload and exact-once recovery, and warning retry/recovery. A copied native profile successfully opened Double Super Rare and retained it after reload; native injected failures verified the new warning and caught-error logging. The final Rare opening also completed through Keep and reload in the copied desktop profile. The owner's original failure was not reproduced and its cause remains unconfirmed. The real player profile was not modified. Installer execution, live updater and hardware performance remain unverified. This build is unsigned.

# Cardable v1.6.2 — Blue and gold

Double Super Rare now blends its blue and gold across the whole cinematic. Flowing color bands, crossing translucent ribbons, a turning faceted prism, moving reflections and brighter bevel highlights replace the fixed blue-left/gold-right presentation. The accelerating light passes resolve into an overlapping pearl, blue and gold wash before the existing card handoff.

The 7.4-second story, 140 ms material lock, saved graphics choices and reduced-motion alternatives are retained. Local procedural materials and bounded caches use the existing cinematic scheduler. No new network dependency, audio, save schema or reward behavior is added.

Source browser checks covered High color, Medium monochrome, 1280 × 720 and 390 × 844, Short/Fast/reduced motion, and a normal opening through the card reveal and exact-once Keep. Both colors appeared on both halves; monochrome was grayscale. A sampled Unusual frame matched the prior renderer exactly. The opening had no page errors or network requests. Installer execution, live updater upgrades and hardware performance remain unverified. This release is unsigned.

# Cardable v1.6.1 — Star collapse

Super Rare begins with the small four-point star from Rare. It slowly develops into a broken blue ring around moving clouds, a tall central star and six curved satellites. The seal enlarges and brightens, folds into overlapping refractive glass forms, and explodes into one white flash. The cinematic ends on white and hands directly to the card reveal.

Full lasts 10.4 seconds; the authored Short route retains every stage in 6.4 seconds. Safe uses a slower white rise, and reduced motion, Off and the lowest graphics tiers retain the calm still route. Cloud materials stay local and bounded, with no new animation loop, network dependency or audio.

Source browser review covered color and monochrome, 1280 × 720 and 390 × 844, Medium/High, Full/Short/Fast/Off, and a normal opening through the card handoff and exact-once Keep. The opening had no page errors or network requests. Installer execution, live updater upgrades and hardware performance remain unverified. This release is unsigned.

# Cardable v1.6.0 — Blue hour

Rare opens with pale-blue light fading in from both sides. Its original four-point cloud star appears, clouds cross it faster and faster, and the star breaks into a growing blue wash before the card handoff. The Full route is 5.43 seconds; Short keeps the shared shortened clock, while Off/reduced motion/Very Low keep a calm still reveal.

Reduced motion is Off by default, including older Auto defaults. A Windows installer checkbox can turn it on for a new collection, and Settings can change it later. Existing On choices are retained. Saves, serials, pack rewards and the save schema are unchanged. This release is unsigned.

# Cardable v1.5.6 — Very Low gets a little

Very Low stays static for everything that loops, but two short event-only touches now run there too: panels and toasts fade and rise in once, and the card's lit edge is drawn. Each ends by itself and uses only opacity and transform. Saves and the save schema are unchanged.

Matching headless runs showed Very Low menu idle at 0.1% main-thread busy, unchanged. Real low-end hardware remains unmeasured. This release is unsigned.

# Cardable v1.5.5 — Low gets more

The event-only touches that reached Medium in 1.5.4 now also run on Low, plus the lit card edge. Very Low is unchanged and stays static. Saves and the save schema are unchanged.

- **Low.** Detail and toolbar panels rise in, serials etch, new cards glint, toasts spring and the stock meniscus sloshes. Each is a short transform or opacity animation that ends by itself. The card's lit edge is one static shadow.
- **Left alone.** Looping light passes, filter blurs and the two-gradient glare stay on Medium and High; Very Low keeps everything static.

Matching headless runs showed Low menu idle at 0.1% and shelf scrolling at 0.5% main-thread busy, unchanged. Real low-end hardware remains unmeasured. This release is unsigned.

# Cardable v1.5.4 — Medium gets more

Medium now shows several touches that were High-only because they cost almost nothing: they run once on an event or are a single static layer. Saves and the save schema are unchanged, and nothing was removed from any tier.

- **Event animations on Medium.** Detail and toolbar panels rise in, the serial is etched on stamping, new cards glint on arrival, toasts spring in, and the stock meniscus sloshes when a pack is ready. Each is a short transform or opacity animation that ends on its own.
- **Richer card glare and edge light on Medium.** The two-gradient glare and the lit edge use the same layer Medium already painted.
- **Left on High.** Looping light passes, filter blurs, the ambient pack drift and per-row settings entrances still cost continuous or burst work, so they stay High features.

A matching headless run showed Medium card detail at 5.6% main-thread busy and menu idle at 4.3%, with no regression against 1.5.3. Real low-end hardware remains unmeasured. This release is unsigned.

# Cardable v1.5.3 — Smoother frames

A performance pass on the menu, card detail and cinematics. Saves, serials, odds, pack cadence and the save schema are unchanged, and no graphics tier lost a visual feature.

- **Calmer main thread.** Pack and card lighting no longer rewrites unchanged values every frame, skips layers a pack does not have, and rounds lighting values to steps far below one device pixel. In matching headless runs the menu's idle main-thread load fell from 7.1% to 3.3% on Medium and from 11.9% to 3.6% on High; moving the pointer over the menu fell from about 22% to 13% (Medium) and 16% (High).
- **Fewer forced restyles.** Proximity checks for Credits, Settings and the Inventory peek reuse a rectangle for 100 ms instead of forcing a restyle on every pointer event.
- **Exotic.** Colour strings are cached per palette and alpha; its per-frame script time fell from about 5.6 to 2.4 ms (Medium) and 9.3 to 3.5 ms (High) in the same headless runs.
- **New metrics.** The Advanced performance panel shows frames over budget, the busiest frame callbacks and what keeps the frame loop awake. `Cardable.fx.profile` and `tools/profile-main-thread.cjs` expose the same numbers for development.

Measurements are from one desktop CPU in headless Chromium with software rendering, so they compare changes, not devices. Cinematics that are bound by the GPU (Ascendant, Mythical, Secret on High) were left as they are. A clean installer run and real low-end hardware remain unverified. This release is unsigned.

# Cardable v1.5.2 — Straight to it

Exotic and Secret openings begin with their own scene instead of a Basic borrowed prelude or a card-back fake-out, and the returning-player pack card is gone. Saves, serials, odds and the save schema are unchanged.

- **Exotic.** The Basic corner prelude and its black beat are removed; the opening starts at the star field and runs 17.9 seconds.
- **Secret.** The card-back rise and flip fake-out is removed; the film begins at its black screen. Later beats keep their authored times. Safe/Full gates, skip and the calm route are unchanged.
- **Pack ready card.** The "pack ready" card shown when you return to the desktop app is removed entirely.

Verification: a source run in the built-in browser stepped both openings through their sections without errors. Installer execution and hardware remain unverified. This release is unsigned.

# Cardable v1.5.1 — Cleaner corners

Inspect and Director open reliably again, the top-right corner is rebuilt around a collapsing Credits chip, and Basic, Common and Uncommon openings become a single line of light. Saves, serials, odds, pack cadence and the save schema are unchanged. Achievements remain paused with their progress retained.

- **Inspect and Director.** Opening the studio no longer fails with a "reading 'kind'" error after you last used Animate, and a studio that cannot open is cleaned up instead of staying half built. Closing the Layers or Inspector panel no longer collapses the viewport.
- **Credits.** One coin sits beside Help and Settings. It opens into a readout on hover, keyboard focus or when your balance changes, then folds away again. Click it to pin the balance card.
- **Patch notes.** The main menu button is gone; a small journal button with an unread dot sits in the Inventory header.
- **Away summary.** "While you were away" no longer appears on the pack-ready card.
- **Basic, Common and Uncommon.** The opening is a thin line that extends from the centre while particles drift away from it, then retreats. Uncommon adds a gentle wave and a second green. Reduced motion shows a still line.

Verification: a source run in the built-in browser covered Inspect on a card whose last page was Animate at Medium, High and Very Low, building and previewing an Auto-director orbit, the Credits chip in both widths, Patch notes from the Inventory, and sampled frames of the three openings. A clean installer run, live updater upgrade and other hardware remain unverified. This release is unsigned.

# Cardable v1.5.0 — Smoother collections

Browse larger collections with fewer hitches, organize the cards you want, and open packs from the lightweight Mini companion. Existing cards, serials, pack odds, saved preferences and the save schema are preserved. Achievements remain paused with their progress retained.

- **Smoother browsing.** Grid preparation is bounded, thumbnail artwork loads directly, hidden material trees are omitted, and resizing the sheet reuses its layout. Retired pack canvases and observers are released.
- **Collections and wishlists.** Organize tabs with colors, pins, descriptions and sorting. Wishlists track missing cards and priorities; duplicating, clearing and Undo preserve membership. Searches reuse collection projections and switching tabs reuses their labels and icons.
- **Open here, keep here.** Ctrl+M opens an always-on-top Mini companion with stock, refill progress, credits and the three newest collected cards. Open and Keep use your existing bindings; Picker offers use 1/2/3. Expand restores the same reserved card. Failed saves and stale requests cannot grant another reward.
- **Your window.** Mini remembers Left/Right docking and a 30/60 FPS ceiling. Desktop settings offer Free/16:9/21:9 proportions, size presets and custom dimensions.
- **Less repeated work.** Locale formatting, effective quality reads and Secret's settled scene elements reuse bounded resources. Safe/Full cinematic controls and the per-frame flash limiter are preserved. Keep/Delete remain readable over retained bright fields.

Matching 20-second local measurements against 1.4.3 showed grid 1% lows rising from 55 to 146 FPS on Low and 53 to 156 FPS on High, with maximum grid gaps falling to 8.4 ms. Moving-shelf lows rose from 167 to 197 FPS on Low and 92 to 116 FPS on High. Repeated collection projections used about 69% less CPU time in a 24-collection fixture. These are machine-specific samples, not guaranteed frame rates; High shelf still has occasional longer gaps.

Verification includes all ten pack strategies, collection behavior comparisons, four-preset desktop/phone journeys, source and packaged Mini recovery/failure/Picker checks, native smoke/save recovery, and Full High/Safe Legendary and Secret handoff. A clean installer run, live updater upgrade, other hardware and the exhaustive cinematic/profile matrix remain unverified. This release is unsigned.

# Cardable v1.4.3 — Quiet start

Cardable starts with a bar instead of a panel, Achievements step aside while they are reworked, and a long list of small interface fixes lands. Saved collections, serials, odds, pack cadence and the save schema are unchanged. Your achievement progress is kept in the save and returns when the feature does.

- **Achievements are paused.** The tab, notices, shortcuts, commands and settings for Achievements are hidden for now. Nothing is deleted: the feature stays in the game and will come back reworked.
- **A quieter start.** Cardable no longer opens with a full panel. A small bar sits under the pack and fills smoothly while the game loads, then leaves. It waits a moment before it shows, so a quick start never flashes it. Until the game has loaded, Settings and Patch notes stay out of sight and the inventory says it is blocked if you try to pull it up.
- **Command palette.** A rounded search field with its own icon and a soft accent focus, keycap hints in the footer, and everyday commands first when the field is empty.
- **Keyboard shortcuts.** The sheet has a close icon, a live filter (type "flip" to find every flip shortcut) and clean keycaps.
- **Where you are.** Card detail shows "54 of 134" beside the Flip hint, including for undiscovered cards. On touch or pen, a quick sideways swipe moves to the next or previous card. (Code-checked only.)
- **Hold feedback.** Open pack fills as you hold it, and a quick tap reads "Hold to open" for a moment so the gesture teaches itself.
- **Shelf captions.** Undiscovered cards read "Unknown card" with "Common · Gen 2" under them, so nothing is cut off. Pointing at the Inventory title explains its two numbers.
- **Photo album.** The search field shows focus around the whole field, and an empty album hides its selection tools.
- **Large displays and phones.** The pack's timer and buttons grow on tall displays. On phones the wordmark shrinks so Credits and Settings never cover it, and the detail hint stays on one line.
- **Tutorial.** Skip tutorial and Help stand at the top left instead of over Credits and Settings, and the first step shows only the pack.
- **Cleaner details.** The cut hint is readable, and Patch notes no longer draws a focus ring around the whole window.
- **Fixed: Studio top bar.** In Pro mode at 1280 px wide, History and Scenes sat under the Simple/Pro switch and Help covered Layers and Inspector. The bar now keeps everything on one row and wraps cleanly on narrower windows. In narrow Studio windows the view cube moves to the bottom left.
- **Fixed: inventory on phones.** At phone width the collection tabs (All Cards, Favorites) were hidden behind New collection. They now have their own row, only the card you are on shows its tags, and the empty peek thumbnail no longer adds a row to the header.
- **Fixed: credits symbol.** Credits no longer show a dollar sign in the pack menu and save preview.

Checked in a browser session with screenshots at several window sizes, and the pack, schedule, Picker and control dev checks. Touch input, real-hardware frame rate, a clean Windows install and the packaged app's start were not exercised. This release is unsigned.

# Cardable v1.4.2 — One glass

Patch notes and Help now share the surface of Credits and Settings. Saved collections, serials, odds and the save schema are unchanged.

- **Matching glass.** Patch notes and Help are the same rounded glass as Credits and Settings, with the same edge light, shadow and blur. Patch notes shows its label larger with the version beside it.
- **Settings gear.** The gear takes the same glass so the row reads as one set.
- **Unread dot.** The dot on Patch notes uses your accent color and sits inside the corner.
- **Fixed: Help position.** Help no longer overlaps Patch notes when Patch notes is wider than first measured.

Checked in a browser session with a screenshot at 1280 x 720 and the measured spacing of all four controls. Monochrome, the lower glass tiers, touch input and a clean Windows install were not exercised. This release is unsigned.

# Cardable v1.4.1 — Quiet details

The area under the pack is redrawn to match the rest of the game. Saved collections, serials, odds, pack cadence and the save schema are unchanged.

- **Clearer status.** A short label (Next pack, Regenerating or Pack storage) sits over the time, set large with the units dimmed. The numbers keep their width as they change.
- **One clear action.** Open pack is a single accent pill that shows its hold key. Flip is a quieter pill beside it with R, and reads Front while the pack is turned over.
- **Calmer stock row.** Stored packs are bright cards, and the one refilling fills with your accent color. Queue labels are larger and easier to read.
- **Easier to hit.** Buttons are 34 px tall (44 px on touch) and show a clear focus ring on the keyboard.
- **Short windows.** When the window is 500 px tall or less, the status stands beside the pack instead of running into the inventory.
- **Fixed: Flip label.** The button now returns to Flip whenever the pack is brought back to the front.

Checked in a browser session with screenshots at 1280 x 720 and 800 x 450, in color and monochrome, plus the pack, schedule, Picker and control dev checks. Touch input, Very High, a clean Windows install and real-hardware frame rate were not exercised. This release is unsigned.

# Cardable v1.4.0 — Every pack

Every card pack is redrawn as a 3D object you can move and turn over, with its own startup, hold and opening. This release also carries the Every corner visual pass (1.3.3 and 1.3.4 were never published) and the Ascendant inspect fix. Saved collections, serials and the save schema are unchanged.

- **Packs are objects now.** Every pack is a real 3D object with a printed front and back. Drag to move it, press **R** (or the Flip control, or double-click) to turn it over, and right-click to inspect from any angle. An opening always starts from the front.
- **Standard.** Black, with the dot grid printed down the right side, the cardable mark at the top and Series 01 at the bottom. The wrapper at the top shows the dots as you cut.
- **Rare.** A chameleon that starts black and turns blue, with connected moving dots and a few bigger ones. While you hold Space the icons rematerialize into a clean white grid, and the cut brings the grid back.
- **NVIDIA, AMD, Snapdragon and Apple.** Each has its own face, back, startup, hold and cut: a shroud and fan with the green band, a red slash, a package with its pin grid, and a frosted pearl.
- **Classic.** A retro PC case. It pixelates and flies away on startup, the key turns and the lights blink while you hold, and you pull the sticker to tear it open. The card inside gets a more detailed command panel.
- **Royal.** A glass coat that appears and dissolves every two seconds with translucent gold triangles; holding dissolves it. It tears open on both sides to reveal a small red carpet, then opens to the card. Each rarity has its own gold frame, Legendary above Secret.
- **Titan.** A faceted aluminium shroud inspired by the Titan X and GTX 1080 Ti coolers. A machined knob releases it in three clicks.
- **Picker.** Opens on a clear sleeve of three card backs that shuffle like a magician's riffle. After the cut the three cards are shown, turned over, shuffled by hand (overhand drops, a riffle, a cut, a deal and two swaps) and you pick one from the backs.
- **Quieter stage.** The Flip control sits beside the timer. On shorter windows the stage rises so the timer, queue and counter clear the inventory, and each pack throws a faint pool of its own colour on the floor.

- **Inventory height.** Appearance › Interface chooses how tall the inventory opens: Compact, Standard (the default) or Tall. It re-measures live, even with the inventory open.
- **Panels rise in.** The performance panel and dialogs rise in; drawers slide in from the right.
- **Quieter appearances.** Inventory tooltips, search errors and the delete caution fade in instead of popping up.
- **Achievement and menu motion.** An achievement opened on a narrow window eases in, and menu notices fade in.
- **Filter chips ease in.** Filter chips and the empty-collection note ease in instead of appearing at once.
- **Collection tabs slide.** A single indicator glides to the collection you pick instead of the highlight jumping. It stays away on Achievements and the album.
- **Plainer journal.** Journal entries state what happened, without filler lines like “a moment earned” or “now part of your story”.
- **Settings accents.** Settings accents follow your accent color and the monochrome theme, like the rest of the game.
- **Notice position.** Gameplay › Notices chooses whether unlock and action notices appear at the bottom (the default) or the top of the screen. Top notices drop in from above.
- **Fixed: hover errors.** Hover effects no longer throw an error when the pointer passes over the page background.
- **Fixed: inventory pull from fully open.** Pulling the sheet down from its full height no longer detaches it from the bottom edge. It stays anchored and shrinks as one surface.
- **Fixed: Inspect on Ascendant cards.** The Studio quietly failed to open for Ascendant cards. It opens now, and if the Studio ever cannot prepare a card it says so instead of doing nothing.
- **Inventory popovers.** Filters, Sort, Collection options and New collection are glass cards set in from the edge. Filter choices are pills instead of small checkboxes.
- **Search and fields.** The inventory search has its icon and the same field style as Settings. The Show Unowned checkbox is drawn to match.
- **Deleting a copy.** The card leads, each caution is a clear tinted row, and the hold-to-delete button is rose while Cancel stays neutral.
- **Performance overlay.** Same glass as the rest, with its sections as small cards.
- **Studio, Simple mode.** Photo is the accent button, the mood slider and style tiles match the rest of the game, and help sits beside the mode switch.
- **Card detail.** The one-time pulse that points out the card's parts stops for good after you open your first callout.
- The centered card's tags stay on one line.
- **Cleaner inventory header.** The "0 New · variant copies · finishes" line is gone; the inventory title and count stand on their own.
- **Achievements.** The "The collection continues" line above the heading is removed.
- **Card captions setting.** Appearance › Interface has a Card captions switch that hides the name and tier under each card in the shelf and grid.
- **Shelf caption entrance.** Captions rise in as their card settles; they stay still with reduced motion. (Code-checked only.)
- **Shelf captions.** Each card's "Basic · Generation 1" line stays on one row under its name instead of wrapping its number onto a second line.

Checked in a browser session with screenshots at several window sizes: every pack's front and back, charge, cut and arrival at controlled poses, a flip mid-turn, Royal's two-sided tear and carpet, the Picker flow from cut to pick to reveal, the Titan knob, reduced motion and the Very Low and Low tiers, plus the dev checks for faces, flip and the Picker. Real-hardware frame rate, the Very High tier, touch input, the monochrome theme on the stage, a clean Windows install and the cinematic matrix were not exercised. Saved collections, serials, odds, pack cadence and the save schema are unchanged. This release is unsigned.

# Cardable v1.3.2 — A closer look

A visual pass over the weakest screens. Saved collections, serials and the save schema are unchanged.

- **Reveal.** Keep is now a large accent button with its key, Delete is a quiet pill beside it, and Flip sits with them under the card instead of at the top of the screen. New cards carry a small NEW mark.
- **Cutting a pack.** The Tear button no longer covers the Enter hint; the button sits under the pack and the hint under the button.
- **Shelf.** The selected card's tags no longer overlap its name. Tags appear for the card you are on or pointing at.
- **Menu.** The help button joins Patch notes, Credits and Settings in the top-right row, and that row hides together when the inventory or Settings opens.
- **How to play.** Rebuilt as an accordion of cards on glass, with copy updated for the new inventory, card detail and album.
- **Toasts, dialogs and the command palette** share the Settings glass, with clearer actions and a marked selection in the palette.
- The Outline wordmark specimen in Settings is drawn as an outline again.

Checked in a browser session with screenshots at a 1080p-equivalent layout: menu, shelf and grid, Achievements, Settings, How to play, the command palette, toasts, and a full pack opening through cut, reveal and Keep. The Windows app, touch input and monochrome were not exercised. This release is unsigned.

---

# Cardable v1.3.1 — The card is the menu

Card detail is rebuilt around the card itself. Saved collections, serials and the save schema are unchanged.

- **No side panel.** Opening a card lifts it larger and alone. Everything the panel held now lives on the card or beside it.
- **Point at the card.** Its parts are controls: the rarity badge, generation, serial, brand mark, name, memory and specs. Each opens a small callout joined to the part by a line, with what it means and what you can do. Specs finally have labels; the generation shows how much of it you have collected.
- **Replay from the rarity.** The rarity callout replays that card's cutscene, and replays are now free. Credits are no longer spent on them.
- **Action rail.** Round buttons beside the card: Inspect, Favorite, Flip, Copies when you own several, and More for copying the serial, exporting, adding to a collection or deleting.
- **Keyboard.** Tab moves through the card's parts, Enter pins a callout and Esc closes it. I, F and R still inspect, favorite and flip.
- **History is gone.** The History tab, card history and its shortcuts are removed from the inventory.
- **Credits.** The credits button no longer animates on hover.
- Removed the styles for the old detail panel.

Checked in a browser session with screenshots at 1280×720 and 760×820: every callout, the rail menus, favorite, flip, a free Ascendant replay returning to the card, and the narrow layout. Card skins other than the standard front, touch input and the Windows app were not exercised. This release is unsigned.

---

# Cardable v1.3.0 — Smooth and seamless

A cleanup and visuals update. Settings is rebuilt as a glass panel, the inventory moves as one piece, and the photo album lives beside your cards. Saved collections, serials and the save schema are unchanged; every existing preference carries over.

## Settings

- **A new panel.** A glass panel docked beside the game, with an icon rail: Graphics, Performance, Appearance, Motion, Gameplay, Accessibility, Profiles, Data and About, plus Controls and Studio in Advanced. Search covers every page at once.
- **Left or right.** Dock the panel on either side from Appearance, or with the swap button in its header.
- **Simple and Advanced.** Simple shows the options most players want. Advanced adds the rest without changing anything you saved.
- **Live previews.** Point at an option and the dock shows what it does: the dot grid under a moving pointer with a live dot count, reduced motion beside full motion, frames for your cap, glass against solid panels. Many previews split Off and On with a divider you can drag. Card options use your real card.
- **Graphics in one place.** Five preset tiles with all ten effects underneath. Advanced turns each into a dropdown; a customized mix returns to its preset in one tap.
- **Any frame rate.** Pick a preset, drag the slider or type an exact cap from 10 to 500 FPS.
- **New options.** Accent color, seven wordmark finishes, wordmark glyph swaps, dot spacing and color, click ripples, cursor glow size and color.
- **Quick setups.** Balanced, Performance, Cinematic, Minimal and Comfort list every change before applying, with Undo afterwards.

## Inventory

- **It moves as one piece.** Cards, tabs and tools now travel with the sheet as it opens and closes, fading with its position. Before, they vanished the moment the sheet began to close.
- **No more size jump.** Cards grow and shrink with the sheet between its heights instead of snapping when you let go.
- **A steady header.** The title and tools keep one layout whether the sheet is tucked away or open.
- **Seamless pages.** Cards, Achievements and the album ease in when you switch. Choosing a collection from another page takes you back to your cards.
- **Glass.** The sheet uses the same glass as Settings on Medium and above, and stays solid on lower tiers or with Reduce transparency.

## Photo album

- **Inside the inventory.** The album is a tab beside Achievements instead of a separate full-screen view.
- **Easier to manage.** Search, sort by newest, oldest or name, and filter by tag. Rename a photo in place, add or remove tags as chips, and star favorites.
- **Viewer.** Open any photo full size and step through with the arrow keys, or compare two side by side.
- **Selection.** Ctrl-click and Shift-click to select several, then download them together. Delete asks twice and offers Undo.
- **Keyboard.** Arrows move, Enter opens, F favorites, Delete removes, / searches.

## Credits

- The credits popover is redrawn around the balance. The day summary and the history list are gone.

## Polish and cleanup

- Buttons, tabs, tiles, popovers, tooltips and dialogs share one set of hover, press and arrival animations. All of it respects reduced motion, the Hover animations option and Very Low.
- Disabled placeholders (sound, daily notices) and duplicate visibility switches leave Settings. A hidden duplicate folds into the control that remains, so nothing is stuck off.
- Removed the styles for the old album, the old two-pane Settings and the wallet history.

Checked in a browser session at 1280×720 with screenshots: Settings on both sides, every page in both modes and all previews; the inventory opening, changing height and closing, measured frame by frame; Achievements and album page changes; album search, selection, inspector and viewer; and the credits popover. The Windows app paths (Desktop page, Unlimited frame cap, folder export, updates) were not exercised. This release is unsigned.

---

# Cardable v1.2.4 — A steadier collection

A frame consistency and bug-fix pass, preserving saved collections and the existing installation/update flow.

- Developer backups move to a separate IndexedDB store instead of duplicating the save in limited local storage. The old backup is removed only after its exact contents are stored and read back. Current and preceding session restores remain available; unavailable backups still block real edits safely.
- Developer controls restore focus before hiding. Electron no longer reports a cancelled launch navigation as missing game files when its own game document is loading.
- Very High pack settings now reach Mini and taskbar state, and Mini retains the selected pack material tier.
- Inventory stays visible and inert behind card detail, so the lifted card returns to a visible collection. The shaded backdrop avoids a full-window blur pass.
- Navigation saves no longer clone the entire collection or rebuild an unchanged inventory projection. Favorite/collection filtering uses lookup sets and sorting calculates each acquisition key once.
- Developer timer ticks copy only pack state until a refill requires a real save. Selected favorite badges refresh with cached queries.
- Static thumbnails avoid repainting when a graphics change leaves their bounded material tier unchanged.
- Mythical's ruby touches the water at the splash beat and continues sinking into the underwater shot. Splash rings and droplets follow its contact point; Canvas recovery follows the same fall clock.
- Medium's Mythical cave uses fewer wall subdivisions while retaining its bounds, major rock silhouettes and materials. High and Very High retain their full geometry; Very High now retains High's hanging cluster count.
- Cinematic splash/ribbon buffers, draw matrices, color uniforms and fixed shadow camera data are reused. Adaptive resolution uses bounded allocation steps instead of reallocating targets for every eased pixel change.
- Secret's Very High route uses the authored High OS composition. Secret/Ascendant warmups respect the starting quality and retire when the reveal takes a calm route. Retired Secret renderers release their context and backing canvas.
- The performance display distinguishes average FPS of the slowest 1%/0.1% from frame-time percentiles, excludes wake-up placeholder frames, labels initial/paused sampling and shows sample count. Its graph refresh and save-size reads do less work.

Functional checks used an isolated copied desktop profile and presentation-only samples. The owner confirmed forced Ascendant now opens in their browser. Reduced allocation/geometry is verified separately from measured FPS and physical hardware acceptance. Existing installer/upgrade, wider browser and full cinematic acceptance limits remain; this release is unsigned.

---

# Cardable v1.2.3 — Ready to collect

A reliability and installer pass for Windows, with the same collection, serials and save schema.

- Fixed the native Discord Settings row crashing refresh during startup and saving. A completed save no longer becomes a failed pack opening because a post-write observer throws.
- Preserved fail-closed preparation and atomic reservations, with clearer storage-full/recovery messages and startup error details in native logs.
- Fixed missing Mythical flames, Exotic props and frozen prop motion on Very High.
- Guided setup shows folder selection for new installations, progress and shortcut creation. Updates keep the registered location and preserve player data.
- Every launch reports real preparation work. First desktop use explains the app folder, save location and separate Studio photo backups.
- Installed updates download quietly, then offer a 15-second restart only in an idle menu. Later postpones this session; a save or native mirror failure cancels restart. Settings can disable idle restarts.

Source sessions verified native startup, pack reservation, Keep and reload with a copied player profile. Installer packaging and UI state inspection are separate from live public A→B upgrade acceptance. This release remains unsigned.

---

# Cardable v1.2.2 — One Cardable: Your collection. Your controls.

Every detail, under your control. The 1.2 series comes together with the shared Cardable interface, a complete creative workspace and a new Controls update.

## Make Cardable yours

- Remap keyboard actions across play, inventory, card details, Settings, History and Director. Assign two keys, resolve context conflicts, reset an action or choose Default, One-handed or Compact controls. Export and import your bindings.
- Advanced Settings offers interface visibility, Minimal and Zen layouts, independent animation preferences, solid surfaces, stronger contrast, larger labels and keyboard focus emphasis. Ctrl/Cmd+, always opens Settings.
- Default, Performance, Cinematic, Minimal and Accessibility profiles preview every changed setting and include Undo. Settings export/import previews changes before applying them.
- Scale the interface from 70% to 150%, choose an animation cap up to 240 FPS or Unlimited, and reduce heavy canvas resolution. Unlimited desktop rendering requires a save-flushed restart; battery saver applies a temporary lower cap.
- Choose Normal, Short or Quick pack holds, use toggle-to-hold, pick per-rarity Play/Short/Skip routes, or skip all cutscenes. Rewards and reserved cards use the same exact-once opening path.

## One collection, one creative workspace

- The shared shaded interface keeps readable Settings, consistent controls, clean wallet geometry and separate outliner actions. Purposeful color belongs to the normal theme; monochrome remains optional.
- Director retains Simple/Pro workflows, procedural props, presets, materials, animation tracks, grading, deliver tools and the photo album. Tools, timeline operations, pages and view commands can be rebound; Studio preferences cover navigation, snapping, gizmos and autosave.
- History returns with a virtual collection timeline, milestones and per-card copy memories. Existing achievement boards, deterministic weekly goals, Picker offers, wallet receipts and protected deletion remain integrated.
- Ascendant's latest worktree sequence travels through clouds; Mythical retains its richer crystal cave. Reduced motion and Safe/Full presentation remain independent preferences.
- A new release showcase pairs actual local collection artwork with feature chapters, finish specimens, comparisons and nested inspection. Preview cards never enter your save.

## Your progress stays yours

Optional settings and history fields keep the existing save schema and app identity. Keep/Delete, Picker choice and rewards preserve atomic commit behavior. Legendary and higher deletion always requires the exact card name and a protected hold, including discard during reveal. Low-tier confirmation can be disabled.

## Downloads

Windows 10/11 x64. Choose the installer or extract the entire full-folder ZIP before running Cardable.exe. The browser build remains offline and uses local assets. This release is unsigned; installer signatures, a live updater upgrade and physical-device/cinematic acceptance are not certified by this update.

The existing v1.2.0 and v1.2.1 tags and assets are preserved. This follow-up uses the next available patch version.

## Unreleased (1.2.0)

Part 4 · Visual overhaul, included in the pending 1.2.2 release.

- All ten pack identities gain layered procedural materials, refined lean lighting and complete state/tier specimens.
- Twenty-four Director additions: eight scenes, four light rigs, six camera moves and six looks; existing card-aware adaptation remains.
- Smoother card-loading fluid, preserved actual asset counts, subtle panel/collection motion and calmer serial engraving.

## Materials, light and motion

Ten sealed pack identities gain distinct procedural materials and lean lighting. Mythical and Ascendant gain a shared High-tier filmic pipeline, richer reflections, depth focus and atmosphere. The glass-prism vignette preserves Ascendant's cloud ritual timing.

Very High is an optional fifth graphics preset, offered after a bounded hardware check. Extra detail uses central numeric budgets; sustained slow frames temporarily return to High. Medium remains the default, and lower tiers retain their lighter scene paths.

Director adds 24 card-aware presets: eight scenes, four rigs, six camera moves and six looks. Subtle inventory, serial, achievement and Settings motion follows quality and reduced-motion preferences. Loader fluid retains accurate asset progress.
