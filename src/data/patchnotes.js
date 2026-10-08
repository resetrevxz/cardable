(function(C){'use strict';C.data.patchNotes=[
  {
    "version": "1.2.2",
    "codename": "One Cardable",
    "date": "October 8, 2026",
    "tag": "Update",
    "tagline": "Your collection. Your controls. One considered experience.",
    "hero": {
      "title": "Every detail.\nUnder your control.",
      "badge": "CARDABLE / 1.2.2",
      "subtitle": "A shared design language, a complete creative workspace, and controls that feel like yours. Welcome to One Cardable.",
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
        "History returns with collection milestones, a virtual timeline and per-card copy memories."
      ],
      "systems": [
        "One shared frame scheduler enforces the selected animation cap. Battery saver temporarily reduces the effective cap.",
        "Unlimited desktop rendering is applied after a save-flushed restart; higher rates can use more power and produce more heat.",
        "Optional settings and history state preserve the existing save schema, storage identity and collected serials.",
        "Picker offers remain unminted until selection. Rewards and Keep/Delete retain their exact-once commit path."
      ],
      "visuals": [
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
