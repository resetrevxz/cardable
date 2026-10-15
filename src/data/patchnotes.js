(function(C){'use strict';C.data.patchNotes=[
  {
    version:'1.7.4',codename:'Inventory fixes',date:'October 15, 2026',tag:'Fix',tagline:'Responsive inspection and lighter browsing.',
    hero:{badge:'CARDABLE / 1.7.4',title:'Inventory fixes.',subtitle:'First-click cursor tracking and less work during rapid browsing.',media:[]},
    sections:{fixes:['Cards handed from a live inventory preview into detail become interactive immediately, so the first inspection follows the cursor.','Delayed hover work is cancelled when a card leaves its browsing surface.'],visuals:['Complete static card fronts keep their artwork, rarity treatment and stats.'],qol:['Rapid pointer sweeps keep static previews; a settled hover activates live materials. Keyboard focus remains immediate.']},
    entries:['First-click card inspection follows the cursor.','Rapid browsing avoids rebuilding full materials for every passing card.']
  },
  {
    version:'1.7.3',codename:'UI polish',date:'October 15, 2026',tag:'Update',tagline:'Complete cards and clearer controls.',
    hero:{badge:'CARDABLE / 1.7.3',title:'UI polish.',subtitle:'One inventory menu, complete card previews and consistent navigation.',media:[]},
    sections:{fixes:['Closing panels keep the background blocked until their exit finishes. Shop, Settings and helper handoffs run in order.','Album Delete uses the same confirmation for keyboard and pointer, ignores key repeat and retains full-photo Undo.','New inventories hide unowned cards by default while existing saved choices are preserved.'],visuals:['Complete inventory and daily-offer card fronts retain artwork, rarity frames and key specs. Duplicate stacks show one card and a ×N badge.','Shared icons, focus tooltips and restrained hover depth connect Settings, Album, Shop, Studio and Director.'],qol:['Search, Filters, Sort, View and Show unowned share one compact inventory panel.','Pack stock moves to the top; Credits balance moves into Shop. Empty surfaces offer a useful next action.','Album uses a compact count and storage popover. Studio removes repeated navigation and routine save narration; scene slots support confirmation and Undo.']},
    entries:['Complete card previews and one inventory controls menu.','Clearer icons, useful empty states and ordered panel exits.']
  },
  {
    version:'1.7.2',codename:'Director Studio',date:'October 14, 2026',tag:'Update',tagline:'Your collectible. Your composition.',
    hero:{badge:'CARDABLE / 1.7.2',title:'Director Studio.',subtitle:'Simple photography and a capable Advanced workspace, sharing one scene.',media:[]},
    sections:{fixes:['Repaired preset lighting, camera motion, support alignment and portrait framing. Existing preset identities are retained.','Right-click commands now use the main-menu surface, with working focus, keyboard navigation, screen bounds and camera-drag handling.'],visuals:['Refined layers, inspectors, controls and timelines, with saved monochrome, reduced motion and enlarged interface layouts.','Twelve new photo looks, color wheels and smooth channel curves, plus metadata text, badges, shapes and layout templates.'],qol:['Look → Adjust → Capture in Simple; scene, lighting, grading, graphics and Director animation in Advanced.','Move, rotate and scale backgrounds independently. Try presets before applying; Undo restores every confirmed edit.','Real PNG/JPEG/WebP photos, supported 4K and WebM, safe Album reopening and cancellation cleanup. Collected cards, serials and existing photos are preserved.']},
    entries:['The Studio is rebuilt around the card.','Compose, develop and keep a photograph without losing your work.']
  },
  {
    version:'1.7.1',codename:'Cinematic by default',date:'October 13, 2026',tag:'Fix',tagline:'Start with the whole ceremony.',
    hero:{badge:'CARDABLE / 1.7.1',title:'Cinematic by default.',subtitle:'High detail, full-length cutscenes and full motion from the first launch.',media:[]},
    sections:{fixes:['Cinematic setup now clears reduced motion and saved cutscene skips, including individual rarity routes.'],visuals:['New players start with High graphics and Full strobing.'],qol:['Existing saves can restore the full presentation through Settings → Quick setups → Cinematic. Existing preferences stay as chosen on load.']},
    entries:['New-player settings show the full presentation.','Cinematic setup restores every cutscene route.']
  },
  {
    version:'1.7.0',codename:'Shop',date:'October 13, 2026',tag:'Feature',tagline:'Four daily cards. One featured Titan pack.',
    hero:{badge:'CARDABLE / 1.7.0',title:'Shop.',subtitle:'Inspect, compare, mark your targets and hold to add a card to your collection.',media:[]},
    sections:{fixes:['Rejected purchases retain your Credits and collection. Failed Shop preference writes retain the saved setting.'],visuals:['A cinematic showroom, interactive card backs, pack rotation and sequential inspection.'],qol:['Four daily offers with fixed prices, purchased Titan packs, wishlists, purchase history and direct save export.','Saved layouts, sorting and quiet motion; save status with explicit retry actions.']},
    entries:['The Daily Shop is open.','Buy cards and a featured Titan pack with Credits.']
  },
  {
    version:'1.6.4',codename:'Celestial seal',date:'October 12, 2026',tag:'Update',tagline:'Super Rare becomes a ceremony of light.',
    hero:{badge:'CARDABLE / 1.6.4',title:'Celestial seal.',subtitle:'A suspended seal, luminous cloud star and inward-folding glass end in one white explosion.',media:[]},
    sections:{fixes:['The white endpoint remains held after backward seeking.'],visuals:['Super Rare has a new formation shot, layered clouds, broken arcs, constellation marks and curved glass with moving refraction.'],qol:['Full lasts 12 seconds; Short keeps all six stages in 7.3 seconds. Calm settings retain a three-second seal.']},
    entries:['Super Rare is completely remade from the supplied references.','The star compresses through overlapping glass into one white climax.']
  },
  {
    version:'1.6.3',codename:'Cloudbreak',date:'October 12, 2026',tag:'Update',tagline:'Rare moves through a sky of light.',
    hero:{badge:'CARDABLE / 1.6.3',title:'Cloudbreak.',subtitle:'A glass star, accelerating clouds and a pale-blue break into the card reveal.',media:[]},
    sections:{fixes:['Saving warnings clear after recovery and offer Retry saving. Preparation errors no longer report that primary storage is unavailable.'],visuals:['Rare has layered clouds, a curved glass star, luminous lighting and sixteen fragments that retain the original material.'],qol:['Rare Full lasts 8 seconds; Short keeps all five stages in 5.2 seconds.']},
    entries:['Rare has a new atmospheric cutscene.','Save warnings offer retry and clear when saving recovers.']
  },
  {
    version:'1.6.2',codename:'Blue and gold',date:'October 12, 2026',tag:'Update',tagline:'Double Super Rare flows through both colors.',
    hero:{badge:'CARDABLE / 1.6.2',title:'Blue and gold.',subtitle:'Blended glass, crossing ribbons and a turning prism give Double Super Rare a new look.',media:[]},
    sections:{fixes:['Blue and gold now mix throughout Double Super Rare, with no hard center seam.'],visuals:['Crossing glass ribbons, moving reflections, a turning faceted prism and brighter bevels refresh the cutscene.'],qol:[]},
    entries:['Blue and gold flow through the whole cutscene.','Double Super Rare has new depth, reflections and glass lighting.']
  },
  {
    version:'1.6.1',codename:'Star collapse',date:'October 12, 2026',tag:'Update',tagline:'Super Rare grows, intensifies and collapses into light.',
    hero:{badge:'CARDABLE / 1.6.1',title:'Star collapse.',subtitle:'A small Rare star forms a blue cloud seal, brightens, folds inward through glass, and ends in one white flash.',media:[]},
    sections:{fixes:[],visuals:['Super Rare grows from a small star into a luminous cloud seal, intensifies, collapses through glass, and ends in one white flash.'],qol:['Full is 10.4 seconds; Short keeps every stage in 6.4 seconds. Reduced motion and Off keep a calm reveal.']},
    entries:['Super Rare has a new cloud and star cutscene.','One white climax hands directly into the card reveal.']
  },
  {
    version:'1.6.0',codename:'Blue hour',date:'October 12, 2026',tag:'Update',tagline:'Rare has a new cloud and starlight reveal.',
    hero:{badge:'CARDABLE / 1.6.0',title:'Blue hour.',subtitle:'Blue light gathers at the edges, clouds race through the Rare star, and the card emerges from a pale-blue wash.',media:[]},
    sections:{fixes:['Reduced motion starts Off for new players and old Auto defaults.'],visuals:['Rare now builds from side light to an accelerating cloud timelapse, star fracture and blue card reveal.'],qol:['Windows setup offers an opt-in reduced-motion checkbox; the in-game setting remains available.']},
    entries:['Rare has a reworked opening cinematic.','Reduced motion is opt-in during setup and in Settings.']
  },
  {
    version:'1.5.6',codename:'Very Low gets a little',date:'October 11, 2026',tag:'Update',tagline:'Two short event touches reach Very Low.',
    hero:{badge:'CARDABLE / 1.5.6',title:'Very Low gets a little.',subtitle:'Panels and toasts fade in once and the card edge is lit, with nothing looping.',media:[]},
    sections:{fixes:[],visuals:['Panels and toasts fade and rise in once on Very Low.','The lit card edge shows on Very Low.'],qol:['Nothing loops on Very Low.']},
    entries:['Short event fades reach Very Low.','Very Low still has no looping effects.']
  },
  {
    version:'1.5.5',codename:'Low gets more',date:'October 11, 2026',tag:'Update',tagline:'Event animations reach Low.',
    hero:{badge:'CARDABLE / 1.5.5',title:'Low gets more.',subtitle:'Short event animations and the lit card edge now run on Low.',media:[]},
    sections:{
      fixes:[],
      visuals:[
        'Panels rise in, serials etch, new cards glint and toasts spring on Low.',
        'The lit card edge shows on Low.'
      ],
      qol:[
        'Very Low stays fully static.'
      ]
    },
    entries:['Event animations now run on Low.','Very Low is unchanged.']
  },
  {
    version:'1.5.4',codename:'Medium gets more',date:'October 11, 2026',tag:'Update',tagline:'Cheap High touches now on Medium.',
    hero:{badge:'CARDABLE / 1.5.4',title:'Medium gets more.',subtitle:'Short event animations and richer card glare move down from High.',media:[]},
    sections:{
      fixes:[],
      visuals:[
        'Panels rise in, serials etch, new cards glint and toasts spring on Medium.',
        'Medium card glare and edge light match High.'
      ],
      qol:[
        'Looping and filter-based effects stay High-only to protect frame times.'
      ]
    },
    entries:['Cheap event animations now run on Medium.','Card glare and edge light match High on Medium.']
  },
  {
    version:'1.5.3',codename:'Smoother frames',date:'October 11, 2026',tag:'Update',tagline:'Less work per frame in the menu, detail and Exotic.',
    hero:{badge:'CARDABLE / 1.5.3',title:'Smoother frames.',subtitle:'The menu and card detail do less work every frame, with the same look.',media:[]},
    sections:{
      fixes:[
        'Pack lighting stops rewriting unchanged values and skips layers a pack does not have.',
        'Pointer proximity checks no longer force a restyle on every movement.'
      ],
      visuals:[
        'Exotic builds its colour strings once per palette, lowering its script time.'
      ],
      qol:[
        'The Advanced performance panel shows frames over budget, the busiest callbacks and what keeps frames running.'
      ]
    },
    entries:['Lower idle and pointer cost on the menu.','New frame metrics in the Advanced performance panel.']
  },
  {
    version:'1.5.2',codename:'Straight to it',date:'October 11, 2026',tag:'Update',tagline:'Exotic and Secret begin at once.',
    hero:{badge:'CARDABLE / 1.5.2',title:'Straight to it.',subtitle:'Exotic and Secret skip their lead-ins, and the returning pack card is gone.',media:[]},
    sections:{
      fixes:[
        'The pack-ready card shown when returning to the desktop app is removed.'
      ],
      visuals:[
        'Exotic starts directly at its star field.',
        'Secret skips its card-back fake-out and begins at its black screen.'
      ],
      qol:[]
    },
    entries:['Exotic and Secret begin without a lead-in.','No more pack-ready card on return.']
  },
  {
    version:'1.5.1',codename:'Cleaner corners',date:'October 11, 2026',tag:'Update',tagline:'Studio opens reliably, and the corner gets quieter.',
    hero:{badge:'CARDABLE / 1.5.1',title:'Cleaner corners.',subtitle:'A Credits chip that folds away, Patch notes in the Inventory and a line of light for early openings.',media:[]},
    sections:{
      fixes:[
        'Inspect and Director open again after Animate was your last page; a studio that fails to open is cleaned up.',
        'Closing the Layers or Inspector panel keeps the viewport in the middle of the studio.',
        'The pack-ready card no longer says how long you were away.'
      ],
      visuals:[
        'Credits is one coin beside Help and Settings that opens into a readout and folds away when idle.',
        'Basic, Common and Uncommon openings are a line that extends with particles drifting from it.'
      ],
      qol:[
        'Patch notes moved from the main menu to a small button in the Inventory header, with an unread dot.',
        'Help sits beside Settings, so the top-right row has the same three controls at every window width.'
      ]
    },
    entries:['Inspect and Director open reliably.','Credits collapses when it is not needed.','Patch notes live in the Inventory.']
  },
  {
    version:'1.5.0',codename:'Smoother collections',date:'October 11, 2026',tag:'Update',tagline:'Smoother browsing and a companion that opens packs.',
    hero:{badge:'CARDABLE / 1.5.0',title:'Smoother collections.',subtitle:'Organize what you own, track what you want, and open packs from Mini.',media:[]},
    sections:{
      fixes:[
        'Large grids prepare a bounded number of thumbnails at a time and reuse their layout as the sheet changes height.',
        'Retired pack canvases are released, and thumbnail artwork loads directly.',
        'Keep and Delete stay readable over bright retained cinematic fields.'
      ],
      visuals:[
        'Collections support colors, pins, descriptions and tab sorting; wishlists track missing cards and priorities.',
        'The always-on-top Mini companion shows stock, refill progress and your three newest collected cards.'
      ],
      qol:[
        'Open and Keep work inside Mini using your Controls bindings. Picker offers use 1, 2 and 3; Expand restores the same reserved card.',
        'Mini remembers Left or Right docking and a 30 or 60 FPS ceiling.',
        'Desktop settings offer Free, 16:9 and 21:9 proportions, presets and custom window sizes.',
        'Searches reuse collection membership and selecting a tab reuses its labels and icons. Achievements remain paused with progress retained.'
      ]
    },
    entries:['Smoother collection browsing with less repeated work.','Collections and wishlists have more organization tools.','Open, choose and Keep cards inside the lightweight Mini companion.']
  },
  {
    version:'1.4.3',codename:'Quiet start',date:'October 11, 2026',tag:'Update',tagline:'A bar instead of a panel, and Achievements take a break.',
    hero:{badge:'CARDABLE / 1.4.3',title:'Quiet start.',subtitle:'Cardable starts with a small bar under the pack. Achievements are paused while they are reworked, and your progress is kept.',media:[]},
    sections:{
      fixes:[
        'The Studio top bar no longer overlaps in Pro mode: History, Scenes, Layers, Inspector and Help each have their own place.',
        'On phones the inventory’s collection tabs are visible again, and tags no longer overlap on the shelf.',
        'Credits no longer show a dollar sign in the pack menu and save preview.',
        'Patch notes no longer draws a focus ring around the whole window.'
      ],
      visuals:[
        'Starting Cardable shows only a small bar under the pack. Settings and Patch notes appear once the game has loaded, and the inventory says it is blocked until then.',
        'The command palette has a rounded search field and keycap hints, and lists everyday commands first.',
        'Undiscovered shelf cards read “Unknown card” with a short “Common · Gen 2” line.',
        'The pack’s timer and buttons grow on tall displays; on phones the wordmark and detail hint fit.',
        'The tutorial’s first step shows only the pack, with Skip and Help at the top left.'
      ],
      qol:[
        'Achievements are paused: no tab, notices, shortcuts or settings for now. Your progress stays in your save.',
        'The Keyboard shortcuts sheet has a live filter and a close icon.',
        'Card detail shows where you are, like “54 of 134”, and swiping sideways on touch or pen moves between cards.',
        'Open pack fills while you hold it, and a quick tap reads “Hold to open”.'
      ]
    },
    entries:[
      'Cardable starts with a small bar instead of a panel.',
      'Achievements are paused while they are reworked.',
      'The palette, shortcuts and card detail are easier to use.'
    ]
  },
  {
    version:'1.4.2',codename:'One glass',date:'October 11, 2026',tag:'Update',tagline:'Patch notes and Help match Credits and Settings.',
    hero:{badge:'CARDABLE / 1.4.2',title:'One glass.',subtitle:'The four controls in the top corner now share one surface.',media:[]},
    sections:{
      fixes:[
        'Help no longer overlaps Patch notes when Patch notes is wider than first measured.'
      ],
      visuals:[
        'Patch notes and Help use the same glass as Credits and Settings.',
        'The Settings gear takes the same glass so the row reads as one set.',
        'The unread dot on Patch notes uses your accent color.'
      ]
    },
    entries:[
      'Patch notes and Help match Credits and Settings.'
    ]
  },
  {
    version:'1.4.1',codename:'Quiet details',date:'October 11, 2026',tag:'Update',tagline:'The area under the pack, redrawn.',
    hero:{badge:'CARDABLE / 1.4.1',title:'Quiet details.',subtitle:'The timer, Open pack, Flip and the stock row now match the rest of the game.',media:[]},
    sections:{
      fixes:[
        'The Flip button returns to “Flip” whenever the pack is brought back to the front.'
      ],
      visuals:[
        'A clear label over a large time with dimmed units. The digits keep their width as they change.',
        'Open pack is a single accent pill that shows its hold key; Flip is a quieter pill beside it.',
        'Stored packs are bright cards and the refilling one fills with your accent color.',
        'On short windows the status stands beside the pack instead of meeting the inventory.'
      ],
      qol:[
        'Buttons are larger to hit, and the keyboard focus ring is clear.'
      ]
    },
    entries:[
      'The timer, Open pack, Flip and stock row are redrawn.',
      'Short windows keep the status clear of the inventory.'
    ]
  },
  {
    version:'1.4.0',codename:'Every pack',date:'October 11, 2026',tag:'Update',tagline:'All ten packs redrawn as objects you can turn over.',
    hero:{badge:'CARDABLE / 1.4.0',title:'Every pack.',subtitle:'Ten packs redrawn as 3D objects with a front and a back, each with its own startup, hold and opening. Plus the Every corner visual pass.',media:[]},
    sections:{
      fixes:[
        'Inspect now opens the Studio for Ascendant cards. It failed silently before.',
        'If the Studio cannot prepare a card, it tells you.',
        'Pulling the inventory down from fully open keeps it attached to the bottom edge instead of detaching.',
        'Hover effects no longer throw an error when the pointer passes over the page background.',
        'Shelf captions keep “Basic · Generation 1” on one line instead of wrapping the number.',
        'Appearance › Interface: a Card captions switch hides the name and tier under each card.',
        'Appearance › Interface: Inventory height opens the sheet Compact, Standard or Tall.',
        'Gameplay › Notices: Notice position puts unlock and action notices at the top or bottom. Top notices drop in from above.'
      ],
      visuals:[
        'Every pack is a 3D object with a printed front and back. Press R, the Flip control or double-click to turn it over; an opening always starts from the front.',
        'Standard and Rare are redrawn: a dot grid down the right, a chameleon Rare that rematerializes its icons while you hold.',
        'NVIDIA, AMD, Snapdragon and Apple each have their own face, back and animations.',
        'Classic is a retro PC case with a pull-sticker tear. Royal is glass that dissolves, with a two-sided tear and a red carpet.',
        'Titan opens with a machined knob. Picker shuffles three cards by hand and you pick one from the backs.',
        'Short windows raise the stage so the timer, queue and counter clear the inventory.',
        'Inventory popovers are glass cards with pill filters.',
        'The deletion dialog leads with the card and shows each caution as a clear row.',
        'The performance overlay and the Studio’s Simple mode share the rest of the game’s controls.',
        'Collection tabs share one indicator that slides to the collection you pick.',
        'Filter chips and the empty-collection note ease in instead of appearing at once.',
        'An achievement opened on a narrow window eases in, and menu notices fade in.',
        'Inventory tooltips, search errors and the delete caution fade in instead of popping up.',
        'The performance panel and dialogs rise in; drawers slide in from the right.'
      ],
      qol:[
        'Inventory search has its icon and a matching field style.',
        'The card-part pulse in card detail stops after you open your first callout.',
        'The inventory’s “0 New · variant copies · finishes” line is removed; the title and count stand alone.',
        'Achievements drops the “The collection continues” line above its heading.',
        'Settings accents follow your accent color and the monochrome theme, like the rest of the game.',
        'The journal states what happened, without filler lines like “now part of your story”.'
      ]
    },
    entries:[
      'All ten packs are redrawn as 3D objects you can turn over with R.',
      'Ascendant cards can be inspected in the Studio again.',
      'Inventory popovers, search and the deletion dialog are redrawn.',
      'The performance overlay and Studio Simple mode match the rest of the game.'
    ]
  },
  {
    version:'1.3.2',codename:'A closer look',date:'October 10, 2026',tag:'Update',tagline:'A visual pass over the weakest screens.',
    hero:{badge:'CARDABLE / 1.3.2',title:'A closer look.',subtitle:'The reveal decision, the cut prompt, help and the shelf, redrawn.',media:[]},
    sections:{
      visuals:[
        'Reveal: a large accent Keep with its key, a quiet Delete, and Flip beside them under the card.',
        'Cutting: the Tear button sits under the pack and no longer covers the Enter hint.',
        'Shelf: the selected card’s tags no longer overlap its name, and appear only for the card you are on.',
        'Toasts, dialogs and the command palette share the Settings glass.'
      ],
      qol:[
        'Help joins Patch notes, Credits and Settings in one top-right row.',
        'How to play is an accordion with copy updated for the inventory, card detail and album.'
      ]
    },
    entries:[
      'The reveal decision is redrawn around a clear Keep.',
      'Overlaps fixed on the cut screen and the shelf.',
      'Help, toasts, dialogs and the command palette are restyled.'
    ]
  },
  {
    version:'1.3.1',codename:'The card is the menu',date:'October 10, 2026',tag:'Update',tagline:'Point at a card to explore it.',
    hero:{badge:'CARDABLE / 1.3.1',title:'The card is the menu.',subtitle:'Card detail without a side panel: the card itself answers your pointer.',media:[]},
    sections:{
      features:[
        'Opening a card lifts it larger and alone, with no information panel beside it.',
        'Point at the rarity, generation, serial, brand mark, name or specs to open a callout joined to that part.',
        'Replay a cutscene from the rarity callout. Replays are now free.'
      ],
      qol:[
        'Round buttons beside the card: Inspect, Favorite, Flip, Copies and More.',
        'Specs are labelled, and the generation shows how much of it you have collected.',
        'Tab moves through the card, Enter pins a callout and Esc closes it.'
      ],
      systems:[
        'The History tab, card history and their shortcuts are removed.',
        'The credits button no longer animates on hover.'
      ]
    },
    entries:[
      'Card detail is rebuilt around the card, without a side panel.',
      'Parts of the card open callouts with details and actions.',
      'Cutscene replays are free.',
      'History is removed from the inventory.'
    ]
  },
  {
    version:'1.3.0',codename:'Smooth and seamless',date:'October 10, 2026',tag:'Update',tagline:'Glass, motion and an album beside your cards.',
    hero:{badge:'CARDABLE / 1.3.0',title:'Smooth and seamless.',subtitle:'A new Settings panel, an inventory that moves as one piece, and the photo album beside your cards.',media:[]},
    sections:{
      features:[
        'Settings is a glass panel beside the game with an icon rail. Dock it left or right.',
        'Point at an option to preview it: dots under a moving pointer with a live count, reduced motion beside full motion, and Off against On with a divider you can drag.',
        'The photo album is a tab in the inventory, with search, sorting, tags, favorites, a full-size viewer and compare.',
        'Set any frame-rate cap from 10 to 500 FPS. New looks: accent color, wordmark finishes, dot spacing and color, click ripples, and cursor glow size and color.'
      ],
      visuals:[
        'The inventory sheet uses glass on Medium and above.',
        'Cards, tabs and tools travel with the sheet as it opens and closes instead of vanishing.',
        'Cards grow with the sheet between its heights; they no longer snap when you let go.',
        'Cards, Achievements and the album ease in when you switch pages.',
        'Buttons, tabs, tiles, popovers and dialogs share one set of hover, press and arrival animations.'
      ],
      qol:[
        'Simple shows the options most players want; Advanced adds the rest without changing what you saved.',
        'Quick setups list every change before applying and offer Undo. Search covers every Settings page.',
        'Album: rename in place, tag chips, multi-select with Ctrl and Shift, keyboard shortcuts, and Undo after deleting.',
        'The credits popover shows your balance without the day summary or history list.'
      ],
      systems:[
        'Disabled placeholders and duplicate visibility switches leave Settings. Saved preferences carry over.',
        'Old album, two-pane Settings and wallet-history styles are removed.'
      ]
    },
    entries:[
      'Settings is rebuilt as a glass panel with live previews, on the left or right.',
      'The inventory moves as one piece: no vanishing cards, no size snap.',
      'The photo album is a tab in the inventory with search, tags and a viewer.',
      'Any frame-rate cap from 10 to 500 FPS, plus accent color and wordmark finishes.',
      'Shared hover, press and arrival animations across the game.'
    ]
  },
  {
    version:'1.2.4',codename:'A steadier collection',date:'October 9, 2026',tag:'Optimization',tagline:'Less repeated work. A grounded collection.',
    hero:{badge:'CARDABLE / 1.2.4',title:'A steadier collection.',subtitle:'Less repeated work. A grounded collection.',media:[]},
    sections:{
      fixes:[
        'Developer backups no longer duplicate the save in limited local storage. Existing backups are preserved before migration.',
        'Electron handles cancelled launch navigation without a false missing-files dialog. Very High pack settings reach Mini and taskbar state.',
        'Inventory stays visible behind card detail and remains ready for the card’s return.',
        'Mythical’s ruby touches the water at the splash beat and continues sinking into the underwater shot, including Canvas recovery.',
        'Very High retains Mythical’s full hanging crystals and Secret’s authored High OS composition.',
        'Secret and Ascendant discard cached GPU scenes when a reveal takes a calm route or starts at another quality.'
      ],
      systems:[
        'Developer timer ticks avoid copying the collection until a refill needs a real save.',
        'Navigation saves reuse unchanged inventory projections; sorting and collection filters do less repeated work.',
        'Medium’s Mythical cave uses fewer wall subdivisions, with its major shapes and materials retained.',
        'Cinematic buffers and draw data are reused; adaptive resolution reallocates in bounded steps.'
      ],
      qol:[
        'Developer controls restore focus on close, and current or preceding session backups can be restored.',
        'The performance display distinguishes slowest-frame averages from percentiles and excludes wake-up placeholders.',
        'Initial and paused sampling are labelled, with sample count in Advanced. Its graph and save-size reads do less work.'
      ]
    },
    entries:[
      'Developer save backups move out of limited local storage, with verified preservation.',
      'Inventory stays visible behind card detail.',
      'Mythical water contact and sinking follow one continuous clock.',
      'Inventory, Medium cave geometry and cinematic allocations do less repeated work.',
      'Very High and calm-route cinematic handoffs retain their intended resource bounds.',
      'Performance lows, sampling states and HUD overhead are corrected.'
    ]
  },
  {
    "version": "1.2.3",
    "codename": "Ready to collect",
    "date": "October 9, 2026",
    "tag": "Bug fixes",
    "tagline": "Reliable saves. A calmer setup.",
    "sections": {
      "fixes": [
        "Fixed a desktop Settings exception that interrupted startup and reported completed saves as failures.",
        "Pack reservations and Keep notifications preserve successful writes even if an optional observer fails.",
        "Mythical flames and Exotic props retain their detail on Very High."
      ],
      "qol": [
        "Guided Windows setup lets a new installation choose its folder; updates retain the existing location.",
        "Startup reports actual preparation work, with folder and backup guidance on first desktop use.",
        "Installed updates download in the background and offer a 15-second restart when the menu is idle. Later postpones the session."
      ]
    },
    "entries": [
      "Fixed a desktop Settings exception that interrupted startup and reported completed saves as failures.",
      "Pack reservations and Keep notifications preserve successful writes even if an optional observer fails.",
      "Mythical flames and Exotic props retain their detail on Very High.",
      "Guided Windows setup lets a new installation choose its folder; updates retain the existing location.",
      "Startup reports actual preparation work, with folder and backup guidance on first desktop use.",
      "Installed updates download in the background and offer a 15-second restart when the menu is idle. Later postpones the session."
    ],
    "hero": {
      "badge": "CARDABLE / 1.2.3",
      "title": "Ready to collect.",
      "subtitle": "Reliable saves. A calmer setup.",
      "media": []
    }
  },
  {
    "version": "1.2.2",
    "codename": "One Cardable",
    "date": "October 8, 2026",
    "tag": "Update",
    "tagline": "A richer collection, from sealed foil to first light.",
    "hero": {
      "title": "A closer look.\nA richer world.",
      "badge": "CARDABLE / 1.2.2",
      "subtitle": "Ten sealed identities. Cinematic rarity worlds. Twenty-four new Director compositions. All brought together by controls that feel like yours.",
      "mediaKind": "collection-preview",
      "media": [
        {
          "kind": "image",
          "src": "assets/cards/geforce-rtx-5090.webp",
          "alt": "GeForce RTX 5090 collection artwork",
          "caption": "Actual collection artwork · preview specimen"
        }
      ]
    },
    "showcaseTitle": "The card is still the showstopper",
    "showcaseSubtitle": "Explore actual cards and finishes. Preview specimens never enter your collection.",
    "showcase": [
      {
        "id": "geforce-rtx-5090",
        "variantId": "rainbow-holo",
        "badge": "Rainbow Holo",
        "description": "Prismatic detail, framed by the same card materials used in your collection."
      },
      {
        "id": "radeon-rx-7900-xtx",
        "variantId": "matte",
        "badge": "Matte",
        "description": "A quiet finish for a powerful collectible. Inspect and flip the actual renderer."
      },
      {
        "id": "geforce-rtx-5080",
        "variantId": "aurora",
        "badge": "Aurora",
        "description": "A luminous finish and an Ascendant frame, with purposeful color in the normal theme."
      },
      {
        "id": "geforce-gtx-1660",
        "variantId": null,
        "badge": "Collection",
        "description": "The familiar cards, with clearer details, protected deletion and copy history."
      }
    ],
    "previews": [
      {
        "id": "gallery",
        "title": "A collection worth a closer look.",
        "label": "01 / The card",
        "description": "Inspect real specimens, flip the card and try a finish.",
        "kind": "gallery"
      },
      {
        "id": "compare",
        "title": "Made to fit the way you play.",
        "label": "02 / Your controls",
        "description": "Compare the new controls and interface options side by side.",
        "kind": "comparison"
      }
    ],
    "balanceTitle": "A more considered experience",
    "balanceSubtitle": "These are interface and presentation changes. Pull reservations, serials and reward commits retain their existing contracts.",
    "balanceChanges": [
      {
        "id": "visual-overhaul",
        "category": "Materials & light",
        "subtitle": "Every sealed moment, reconsidered.",
        "icon": "cards",
        "changes": [
          {
            "stat": "Sealed packs",
            "entity": "All ten registered identities",
            "from": "Existing wrappers",
            "to": "Procedural material collection",
            "type": "rework",
            "note": "Brushed platinum, sapphire clearcoat, titanium, pearl triptych and distinct brand finishes. Lean lighting, state transitions and lightweight renders share one silhouette."
          },
          {
            "stat": "Rarity worlds",
            "entity": "Mythical / Ascendant",
            "from": "Existing scene rendering",
            "to": "Filmic optics and prism light",
            "type": "rework",
            "note": "High adds depth focus, bloom, filtered shadows and richer water. Ascendant introduces a glass-prism vignette within its existing cloud ritual."
          },
          {
            "stat": "Graphics ladder",
            "entity": "Settings",
            "from": "Four tiers",
            "to": "Gated Very High",
            "type": "rework",
            "note": "A fifth opt-in tier uses numeric budgets, a short hardware check and a temporary High fallback. Medium stays the default."
          },
          {
            "stat": "Director presets",
            "entity": "Creative workspace",
            "from": "Existing catalog",
            "to": "24 additional compositions",
            "type": "rework",
            "note": "Eight scenes, four rigs, six camera moves and six looks adapt to the card and join the seven-reference gallery."
          }
        ]
      },
      {
        "id": "controls",
        "category": "Controls & accessibility",
        "subtitle": "Familiar defaults. More freedom.",
        "icon": "motion",
        "changes": [
          {
            "stat": "Keyboard actions",
            "entity": "Across Cardable",
            "from": "Fixed shortcuts",
            "to": "Two bindings per action",
            "type": "rework",
            "note": "Search, capture, resolve conflicts, reset or export your bindings. Ctrl/Cmd+, always opens Settings."
          },
          {
            "stat": "Pack hold",
            "entity": "Gameplay",
            "from": "3 seconds",
            "to": "3 / 2 / 1 seconds",
            "type": "rework",
            "note": "Normal stays the default. Toggle-to-hold makes charging possible without holding a key."
          },
          {
            "stat": "Interface scale",
            "entity": "Display",
            "from": "90–150%",
            "to": "70–150%",
            "type": "rework",
            "note": "Live 5% steps, plus Small, Normal and Large presets."
          }
        ]
      },
      {
        "id": "studio",
        "category": "Create & collect",
        "subtitle": "The creative tools meet the collection.",
        "icon": "cards",
        "changes": [
          {
            "stat": "Director controls",
            "entity": "Studio",
            "from": "Fixed tools",
            "to": "Remappable workspace",
            "type": "rework",
            "note": "Tools, views, pages, timeline, markers and capture actions share the controls registry."
          },
          {
            "stat": "Collection history",
            "entity": "Inventory",
            "from": "Separate worktree",
            "to": "Integrated History",
            "type": "rework",
            "note": "A virtual timeline, collection milestones and individual copy memories."
          },
          {
            "stat": "Ascendant scene",
            "entity": "Cinematics",
            "from": "Crystal cave",
            "to": "Cloud ritual",
            "type": "rework",
            "note": "The cloud scene and enriched Mythical cave are integrated with Safe / Full presentation."
          }
        ]
      },
      {
        "id": "interface",
        "category": "One surface language",
        "subtitle": "Quiet chrome. Expressive cards.",
        "icon": "search",
        "changes": [
          {
            "stat": "Settings",
            "entity": "Preferences",
            "from": "One level of detail",
            "to": "Simple / Advanced",
            "type": "rework",
            "note": "Search, row resets, changed indicators, profiles with preview and Undo."
          },
          {
            "stat": "Interface visibility",
            "entity": "Advanced",
            "from": "Fixed chrome",
            "to": "Minimal / Zen / custom",
            "type": "rework",
            "note": "Keep the pack and card in view. Emergency Settings and the context menu stay available."
          },
          {
            "stat": "Cutscene routing",
            "entity": "Each rarity",
            "from": "Global duration",
            "to": "Play / Short / Skip",
            "type": "rework",
            "note": "Optional play-once and skip-all choices operate after the pull is reserved."
          }
        ]
      }
    ],
    "sections": {
      "features": [
        "A complete keybinding editor with two bindings, context conflicts, swap/clear, presets and JSON export/import.",
        "Advanced Settings adds interface visibility, effect controls, profiles, gameplay preferences, formats and accessibility.",
        "Director includes remappable tools, view presets, timeline operations, page tabs and navigation preferences.",
        "History returns with collection milestones, a virtual timeline and per-card copy memories.",
        "Dev-only pack material gallery and fixed-time composition contact sheets for Mythical and Ascendant."
      ],
      "systems": [
        "One shared frame scheduler enforces the selected animation cap. Battery saver temporarily reduces the effective cap.",
        "Unlimited desktop rendering is applied after a save-flushed restart; higher rates can use more power and produce more heat.",
        "Optional settings and history state preserve the existing save schema, storage identity and collected serials.",
        "Picker offers remain unminted until selection. Rewards and Keep/Delete retain their exact-once commit path."
      ],
      "visuals": [
        "All ten packs gain layered procedural materials, lean lighting and complete state/tier specimens.",
        "High-tier Mythical and Ascendant rendering adds filmic grading, multi-scale bloom, depth focus, denser atmosphere and richer reflections.",
        "Very High is opt-in, hardware gated and budgeted globally; sustained slow rendering temporarily uses High.",
        "Director gains eight scenes, four light rigs, six camera moves and six looks, with card-aware adaptation.",
        "Loader fluid, serial etching, achievement emblems, inventory skew and panel motion respect reduced motion and graphics controls.",
        "Shared shaded surfaces, concentric controls, readable Settings and repaired inventory and outliner geometry.",
        "Purposeful periwinkle, mint, warm and rose accents in the normal theme. Saved monochrome presents the same states.",
        "Ascendant now travels through clouds; Mythical retains its enriched crystal cave. Reduced motion and Safe presentation stay separate.",
        "The release showcase uses real collection artwork and registered finishes, with bounded previews and nested inspection."
      ],
      "qol": [
        "Small, Normal and Large interface presets, 12/24-hour time, date and number formats.",
        "Pack-ready desktop notifications can be disabled. Daily and sound placeholders remain unavailable.",
        "Low-tier deletion can use a direct action; Legendary and higher always require the exact card name and protected hold.",
        "Settings profiles show every proposed change and provide Undo after applying. Ctrl/Cmd+, remains available even in Zen."
      ],
      "fixes": [
        "Segmented controls and wallet chips now keep consistent geometry without overlapping selected states.",
        "Inventory remains mounted while inspecting, preserving the browsing state when returning.",
        "Director outliner visibility and lock controls keep usable, separate targets.",
        "Integrated feature branches retain the newer inventory, achievements, Studio and Picker corrections from main."
      ]
    },
    "entries": [
      "All ten packs gain layered procedural materials, lean lighting and complete state/tier specimens.",
      "High-tier Mythical and Ascendant rendering adds filmic grading, multi-scale bloom, depth focus, denser atmosphere and richer reflections.",
      "Very High is opt-in, hardware gated and budgeted globally; sustained slow rendering temporarily uses High.",
      "Director gains eight scenes, four light rigs, six camera moves and six looks, with card-aware adaptation.",
      "Loader fluid, serial etching, achievement emblems, inventory skew and panel motion respect reduced motion and graphics controls.",
      "A complete keybinding editor with two bindings, context conflicts, swap/clear, presets and JSON export/import.",
      "Advanced Settings adds interface visibility, effect controls, profiles, gameplay preferences, formats and accessibility.",
      "Director includes remappable tools, view presets, timeline operations, page tabs and navigation preferences.",
      "History returns with collection milestones, a virtual timeline and per-card copy memories.",
      "One shared frame scheduler enforces the selected animation cap. Battery saver temporarily reduces the effective cap.",
      "Unlimited desktop rendering is applied after a save-flushed restart; higher rates can use more power and produce more heat.",
      "Optional settings and history state preserve the existing save schema, storage identity and collected serials.",
      "Picker offers remain unminted until selection. Rewards and Keep/Delete retain their exact-once commit path.",
      "Shared shaded surfaces, concentric controls, readable Settings and repaired inventory and outliner geometry.",
      "Purposeful periwinkle, mint, warm and rose accents in the normal theme. Saved monochrome presents the same states.",
      "Ascendant now travels through clouds; Mythical retains its enriched crystal cave. Reduced motion and Safe presentation stay separate.",
      "The release showcase uses real collection artwork and registered finishes, with bounded previews and nested inspection.",
      "Small, Normal and Large interface presets, 12/24-hour time, date and number formats.",
      "Pack-ready desktop notifications can be disabled. Daily and sound placeholders remain unavailable.",
      "Low-tier deletion can use a direct action; Legendary and higher always require the exact card name and protected hold.",
      "Settings profiles show every proposed change and provide Undo after applying. Ctrl/Cmd+, remains available even in Zen.",
      "Segmented controls and wallet chips now keep consistent geometry without overlapping selected states.",
      "Inventory remains mounted while inspecting, preserving the browsing state when returning.",
      "Director outliner visibility and lock controls keep usable, separate targets.",
      "Integrated feature branches retain the newer inventory, achievements, Studio and Picker corrections from main."
    ]
  }
];})(window.Cardable);
