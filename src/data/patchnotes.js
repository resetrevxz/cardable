(function(C){'use strict';C.data.patchNotes=[
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
