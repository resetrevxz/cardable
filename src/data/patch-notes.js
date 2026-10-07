/* Cardable — Patch Notes Registry. DATA ONLY.
 * Defines structured update history, hero previews, inventory-like card showcases,
 * and interactive balance changes.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};

  C.data.patchNotes = [
    {
      version: '1.0.3',
      codename: 'Sovereign Silicon & Vanguard',
      date: 'October 7, 2026',
      tag: 'Major',
      tagline: 'Reimagined Patch Notes Hub with inventory-like card showcases, interactive balance dropdowns, real-time 3D inspection, and silicon tuning.',
      hero: {
        title: 'Sovereign Silicon & The Patch Notes Remake',
        subtitle: 'Alongside our hardware and drop-rate tuning, we are introducing flagship GPU showcases, finish variants, and interactive balance analytics.',
        badge: 'Major Overhaul',
        mediaKind: 'silicon-circuit'
      },
      showcase: [
        {
          id: 'geforce-rtx-5090',
          name: 'GeForce RTX 5090',
          subtitle: 'Flagship Die',
          rarity: 'mythical',
          variantId: 'holographic',
          badge: 'New Flagship',
          icon: 'nvidia',
          specs: { vram: '32 GB GDDR7', cores: '21760', boostMhz: 2550, busBits: 512, tdpW: 575 },
          description: 'Blackwell ultra-enthusiast architecture with 512-bit GDDR7 interface, full holographic diffraction finish, and extreme compute throughput.'
        },
        {
          id: 'radeon-rx-7900-xtx',
          name: 'Radeon RX 7900 XTX',
          subtitle: 'RDNA 3 Vapor',
          rarity: 'legendary',
          variantId: 'overclocked',
          badge: 'Tuned',
          icon: 'amd',
          specs: { vram: '24 GB GDDR6', cores: '12288', boostMhz: 2500, busBits: 384, tdpW: 355 },
          description: 'Navi 31 multi-chiplet module with overclocked vapor chamber tuning and high-bandwidth Infinity Cache.'
        },
        {
          id: 'apple-m5-gpu',
          name: 'Apple M5 GPU',
          subtitle: 'Unified Neural Core',
          rarity: 'secret',
          variantId: 'ascendant',
          badge: 'Secret Arrival',
          icon: 'apple',
          specs: { vram: '64 GB Unified', cores: '40 Cores', boostMhz: 1900, busBits: 512, tdpW: 120 },
          description: 'Next-generation custom silicon with 16-wide execution units, dynamic caching, and ascendant prismatic finish.'
        },
        {
          id: 'geforce-rtx-5080',
          name: 'GeForce RTX 5080',
          subtitle: 'Blackwell Enthusiast',
          rarity: 'legendary',
          variantId: 'prototype',
          badge: 'New Card',
          icon: 'nvidia',
          specs: { vram: '16 GB GDDR7', cores: '10752', boostMhz: 2610, busBits: 256, tdpW: 400 },
          description: 'High-frequency GDDR7 memory architecture with prototype vapor-phase substrate and tuned boost curves.'
        },
        {
          id: 'snapdragon-x-elite',
          name: 'Snapdragon X Elite',
          subtitle: 'Oryon Adreno Core',
          rarity: 'uncommon',
          variantId: 'normal',
          badge: 'Efficiency',
          icon: 'snapdragon',
          specs: { vram: '32 GB LPDDR5X', cores: '3840', boostMhz: 1250, busBits: 128, tdpW: 45 },
          description: 'High-efficiency low-power architecture built on 4nm process technology with integrated NPU acceleration.'
        },
        {
          id: 'picker-pack',
          name: 'Picker Crate',
          subtitle: 'Triptych Selection',
          rarity: 'exotic',
          variantId: 'pearl',
          badge: 'Featured Crate',
          icon: 'pack',
          specs: { vram: '3 Offers', cores: '1 Choice', boostMhz: 144, busBits: 256, tdpW: 0 },
          description: 'Three-way pearl selection crate offering guaranteed high-tier choice reservation before reveal.'
        }
      ],
      balanceChanges: [
        {
          category: 'Flagship Silicon & Thermal Tuning',
          subtitle: 'Overclock curves and power targets normalized across high-density dies',
          icon: 'chip',
          changes: [
            {
              stat: 'Boost Clock Ceiling',
              entity: 'GeForce RTX 5080',
              from: '2500 MHz',
              to: '2610 MHz',
              diff: '+110 MHz',
              percent: '+4.4%',
              type: 'buff',
              note: 'Higher sustained boost in ambient workloads'
            },
            {
              stat: 'Power Target (TDP)',
              entity: 'GeForce RTX 5090',
              from: '600W',
              to: '575W',
              diff: '-25W',
              percent: '-4.2%',
              type: 'buff',
              note: 'Improved vapor-plate power delivery efficiency'
            },
            {
              stat: 'Memory Bus Bandwidth',
              entity: 'Radeon RX 7900 XTX',
              from: '960 GB/s',
              to: '1024 GB/s',
              diff: '+64 GB/s',
              percent: '+6.7%',
              type: 'buff',
              note: 'Unified Infinity Cache latency reduced by 12%'
            },
            {
              stat: 'Unified Memory Fabric',
              entity: 'Apple M5 GPU',
              from: '800 GB/s',
              to: '920 GB/s',
              diff: '+120 GB/s',
              percent: '+15.0%',
              type: 'buff',
              note: '16-channel fabric interconnect activated'
            }
          ]
        },
        {
          category: 'Pack Mechanics & Progression Tuning',
          subtitle: 'Refill cadence and reserve boundaries rebalanced for active players',
          icon: 'pack',
          changes: [
            {
              stat: 'Pack Refill Cadence',
              entity: 'Regen Timer',
              from: '2.5 Hours',
              to: '2.0 Hours',
              diff: '-30 Mins',
              percent: '-20.0%',
              type: 'buff',
              note: 'Faster recharge allows more daily openings'
            },
            {
              stat: 'Max Stored Packs',
              entity: 'Stock Ceiling',
              from: '3 Packs',
              to: '4 Packs',
              diff: '+1 Pack',
              percent: '+33.3%',
              type: 'buff',
              note: 'Higher offline accumulation ceiling'
            },
            {
              stat: 'Ascendant Rate in Titan',
              entity: 'Titan Pack',
              from: '0.40%',
              to: '0.65%',
              diff: '+0.25%',
              percent: '+62.5%',
              type: 'buff',
              note: 'Vault unseal rewards high-tier hunters'
            },
            {
              stat: 'Basic Pack VRAM Floor',
              entity: 'Gen 1 Pool',
              from: '1 GB',
              to: '2 GB',
              diff: '+1 GB',
              percent: '+100%',
              type: 'buff',
              note: 'Legacy 1GB cards eliminated from primary drop pool'
            }
          ]
        },
        {
          category: 'Finish Shaders & Resource Bounds',
          subtitle: 'Particle caps and canvas ceiling optimizations',
          icon: 'sparkle',
          changes: [
            {
              stat: 'Specular Glare Rate',
              entity: 'High Preset',
              from: '60 Hz',
              to: '120 Hz',
              diff: '+60 Hz',
              percent: '+100%',
              type: 'buff',
              note: 'Smoother specular sheen on high-refresh displays'
            },
            {
              stat: 'Offscreen Canvas Buffers',
              entity: 'Renderer',
              from: '12 Buffers',
              to: '4 Buffers',
              diff: '-8 Buffers',
              percent: '-66.7%',
              type: 'buff',
              note: 'Aggressive resource disposal when cards unmount'
            },
            {
              stat: 'Stellar Particle Count',
              entity: 'Exotic Cutscene',
              from: '2400',
              to: '1800',
              diff: '-600',
              percent: '-25.0%',
              type: 'nerf',
              note: 'Bounded fill-rate to prevent iGPU stutters'
            }
          ]
        }
      ],
      sections: {
        features: [
          'Brand-new Patch Notes Hub featuring Apple and Vercel-inspired glassmorphism, responsive inventory tiles, and live hardware inspection.',
          'Interactive Mode playground enabling real-time 3D card tilt, specular lighting response, and balance change simulation.',
          'Special Patch Notes button mounted directly next to the Credits indicator in the main HUD and beside Credits in Settings.',
          'Multi-criteria search engine and sorting controls (Newest, Oldest, Major Only) across all historical release logs.',
          'Hover Inspect system: hovering over cards spawns a floating 3D specimen preview; clicking triggers full 3D inspection.'
        ],
        systems: [
          'Centralized patch notes registry in src/data/patch-notes.js with version, codename, hero banner, showcase items, and balance tables.',
          'Full integration with Cardable.commands (\'patch-notes\'), global shortcut \'N\', and Settings → About navigation.',
          'Unviewed badge notification system persisting last seen version in localStorage.',
          'Offline-safe markdown exporter for one-click release note sharing.'
        ],
        visuals: [
          'Inventory-like card presentation matching reference specifications with real rarity halos, custom finish shaders, and micro-spec chips.',
          'Smooth accordion transitions using CSS grid-template-rows animation with custom spring curves.',
          'Vercel-inspired subtle radial spotlight following cursor movements across patch note panels.',
          'Silky momentum scroll container with reading progress indicator and sticky blurred header.'
        ],
        qol: [
          '\'View More\' expander buttons for long card galleries and multi-tier balance changes.',
          'Interactive Hover Inspect: hovering over cards displays live memory and boost specifications.',
          'One-click \'Copy Markdown\' button to copy release notes directly to clipboard.',
          'Full keyboard accessibility (Esc to close, / to search, Arrow keys to navigate, Tab traps).'
        ],
        fixes: [
          'Fixed changelog modal crashing in offline browser environments where Electron native support was absent.',
          'Resolved layout jitter during accordion height calculations by enforcing transform and grid row transitions.',
          'Prevented offscreen card views from accumulating uncollected RAF listeners in the background.'
        ]
      }
    },
    {
      version: '1.0.1',
      codename: 'Cinematic Public Website',
      date: 'October 6, 2026',
      tag: 'Feature',
      tagline: 'Rebuilt download page as nine authored scenes using actual card, pack, finish, and cinematic renderers.',
      hero: {
        title: 'Cinematic Public Experience',
        subtitle: 'Showcasing Cardable on the web with interactive 24-card demo collection and Safe cutscenes.',
        badge: 'Web Release',
        mediaKind: 'website-preview'
      },
      showcase: [
        {
          id: 'geforce-rtx-4090',
          name: 'GeForce RTX 4090',
          subtitle: 'Ada Lovelace Titan',
          rarity: 'mythical',
          variantId: 'normal',
          badge: 'Web Featured',
          icon: 'nvidia',
          specs: { vram: '24 GB GDDR6X', cores: '16384', boostMhz: 2520, busBits: 384, tdpW: 450 },
          description: 'Ada Lovelace flagship featured in the interactive demo showroom.'
        },
        {
          id: 'apple-m4-max-gpu',
          name: 'Apple M4 Max GPU',
          subtitle: 'Pro Silicon',
          rarity: 'legendary',
          variantId: 'normal',
          badge: 'Web Featured',
          icon: 'apple',
          specs: { vram: '128 GB Unified', cores: '40 Cores', boostMhz: 1800, busBits: 512, tdpW: 100 },
          description: 'Massive unified memory bandwidth demonstrated on the download site.'
        }
      ],
      balanceChanges: [
        {
          category: 'Website Engine Optimization',
          subtitle: 'Static asset bundling and demo bounds',
          icon: 'network',
          changes: [
            {
              stat: 'Demo Collection Footprint',
              entity: 'Web Demo',
              from: '14.2 MB',
              to: '3.8 MB',
              diff: '-10.4 MB',
              percent: '-73.2%',
              type: 'buff',
              note: 'Lossless vector compression for showcase assets'
            }
          ]
        }
      ],
      sections: {
        features: [
          'Interactive 24-card demo collection on the public download website.',
          'Four complete Safe rarity cutscenes with play, pause, and restart controls.',
          'Automatic GitHub Pages dispatch tied to release publication.'
        ],
        systems: [
          'CI checks matching changelog/1.0.1.md, package version, and tag before release.',
          'Preserved offline file:// runtime rules and classic script bundling.'
        ],
        visuals: [
          'Authored nine-scene scrolling arrival sequence with live finish shaders.',
          'High-contrast and reduced-motion website fallbacks.'
        ],
        qol: [
          'Direct installer and portable whole-folder ZIP download cards.',
          'Real-time system requirement badge detection.'
        ],
        fixes: [
          'Fixed Windows installer hash mismatch in release validation pipeline.'
        ]
      }
    },
    {
      version: '1.0.0',
      codename: 'Public Genesis',
      date: 'October 6, 2026',
      tag: 'Major',
      tagline: 'Start of the public version series at v1.0.0 carrying forward the 4.2.0 game without resetting player saves.',
      hero: {
        title: 'Public Release & Packaging',
        subtitle: 'First public distribution with automatic updater hooks, Windows installer, and repository guidance.',
        badge: 'Genesis Release',
        mediaKind: 'box-setup'
      },
      showcase: [
        {
          id: 'geforce-rtx-3090',
          name: 'GeForce RTX 3090',
          subtitle: 'Ampere Giant',
          rarity: 'legendary',
          variantId: 'normal',
          badge: 'Classic',
          icon: 'nvidia',
          specs: { vram: '24 GB GDDR6X', cores: '10496', boostMhz: 1700, busBits: 384, tdpW: 350 },
          description: 'The iconic 24GB Ampere flagship carrying saves from the 4.x era.'
        }
      ],
      balanceChanges: [
        {
          category: 'Save Migration & Stability',
          subtitle: 'Backward-compatible profile retention',
          icon: 'database',
          changes: [
            {
              stat: 'Save Schema Migration Loss',
              entity: 'Profile Database',
              from: '0.1%',
              to: '0.0%',
              diff: 'Exact-Once',
              percent: '100%',
              type: 'buff',
              note: '100% byte-exact preservation of legacy saves'
            }
          ]
        }
      ],
      sections: {
        features: [
          'Initial public Windows x64 NSIS installer and standalone portable build.',
          'Signed updater foundation with automatic fallback to safe local mode.',
          'Consolidated workspace structure and repository guidance.'
        ],
        systems: [
          'Preserved com.cardable.game identity and save persistence.',
          'Bundled SIL Open Font License documentation for Inter and JetBrains Mono.'
        ],
        visuals: [
          'Refined near-black chrome and typography tokens across all screens.'
        ],
        qol: [
          'One-click browser save importer with confirmation modal.'
        ],
        fixes: [
          'Eliminated race conditions during startup IndexedDB photo reconciliation.'
        ]
      }
    },
    {
      version: '4.2.0',
      codename: 'Desktop Delivery & Recovery',
      date: 'October 5, 2026',
      tag: 'Patch',
      tagline: 'Automatic updater checks, background downloads, save-gated installation, and recovery diagnostics.',
      hero: {
        title: 'Desktop Recovery & Safe Mode',
        subtitle: 'Comprehensive diagnostic tools, safe-mode relaunch, and automated desktop delivery pipelines.',
        badge: 'Core Update',
        mediaKind: 'desktop-shield'
      },
      showcase: [
        {
          id: 'geforce-256',
          name: 'GeForce 256',
          subtitle: 'Origin of GPU',
          rarity: 'rare',
          variantId: 'normal',
          badge: 'Classic',
          icon: 'nvidia',
          specs: { vram: '32 MB SDR', cores: '4 Pipelines', boostMhz: 120, busBits: 128, tdpW: 20 },
          description: 'The pioneer of hardware transform and lighting.'
        }
      ],
      balanceChanges: [
        {
          category: 'Recovery Safeguards',
          subtitle: 'Error tolerance and backup frequency',
          icon: 'shield',
          changes: [
            {
              stat: 'Backup Retention Slots',
              entity: 'Saves Engine',
              from: '1 Slot',
              to: '3 Slots',
              diff: '+2 Slots',
              percent: '+200%',
              type: 'buff',
              note: 'Multiple snapshot history prevents corrupt overwrite'
            }
          ]
        }
      ],
      sections: {
        features: [
          'Safe Mode restart disabling hardware acceleration for troubleshooting.',
          'One-click diagnostic log and save directory openers in Settings.',
          'Away summaries tracking pack regeneration while offline.'
        ],
        systems: [
          'Automatic desktop build verification scripts.',
          'Zero telemetry and 100% offline player privacy.'
        ],
        visuals: [
          'Clean system notifications and status toasts.'
        ],
        qol: [
          'Keyboard navigation shortcuts: Ctrl+K palette, F1 help, F2 capture.'
        ],
        fixes: [
          'Fixed resize observer feedback loop on variable-DPI displays.'
        ]
      }
    }
  ];
})(window.Cardable);
