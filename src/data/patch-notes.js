/* Release journal. DATA ONLY. Showcase IDs resolve through the game registries.
 * A showcase is a preview, never a new drop or an owned instance.
 */
(function (C) {
  'use strict';
  C.data.patchNotes = [
    {
      version: '1.2.1', codename: 'A closer look', date: 'October 7, 2026', tag: 'Feature',
      tagline: 'Less reading between the lines. More seeing what changed.',
      hero: {
        title: 'Every update.\nA closer look.', badge: 'The release journal',
        subtitle: 'Explore the details, inspect the collection, and see changes side by side. Patch notes, made for Cardable.',
        mediaKind: 'collection-preview',
        media: [{ kind: 'image', src: 'assets/cards/geforce-rtx-5090.webp', alt: 'RTX 5090 collection artwork', caption: 'Collection artwork · preview specimen' }]
      },
      showcaseTitle: 'The collection, up close',
      showcaseSubtitle: 'Existing cards and finishes demonstrate the new preview gallery. Select one to inspect.',
      showcase: [
        { id: 'geforce-rtx-5090', variantId: 'rainbow-holo', badge: 'Card preview', description: 'A familiar card, a new way to look. The gallery uses the same static rarity materials as your inventory.' },
        { id: 'radeon-rx-7900-xtx', variantId: 'matte', badge: 'Finish preview', description: 'Inspect the Matte finish on a Legendary specimen. Catalog specifications stay attached to their actual card.' },
        { id: 'geforce-rtx-5080', variantId: 'aurora', badge: 'Finish preview', description: 'The Aurora coating and Ascendant frame, brought into the release journal through the shared card renderer.' },
        { id: 'apple-m5-gpu', variantId: null, badge: 'Card preview', description: 'Shared memory stays shared. Inspection reads the catalog rather than inventing memory capacities or clocks.' },
        { id: 'geforce-rtx-3090', variantId: 'beam', badge: 'Finish preview', description: 'A Beam specimen for exploring the new full-size inspection. This preview does not add a card to your collection.' },
        { id: 'geforce-rtx-4090', variantId: 'shattered', badge: 'Finish preview', description: 'Shattered glass, a familiar GPU, and a focused inspection surface. Return to exactly where you left the journal.' }
      ],
      previews: [
        { id: 'gallery', title: 'See it before you read it.', label: '01 / Collection previews', description: 'Real card art, registered finishes, and an inspect action on every specimen.', kind: 'gallery' },
        { id: 'compare', title: 'The change is in the details.', label: '02 / Change comparisons', description: 'Expandable groups put the previous and current behavior next to each other.', kind: 'comparison' }
      ],
      balanceTitle: 'Changes, side by side',
      balanceSubtitle: 'Interface changes in 1.2.1. Gameplay odds, rewards, refill cadence, and hardware specifications are unchanged.',
      balanceChanges: [
        { id: 'gallery', category: 'Collection previews', subtitle: 'From a generic illustration to the actual collectible', icon: 'cards', changes: [
          { stat: 'Card presentation', entity: 'Release gallery', from: 'Generic silicon icons', to: 'Inventory card materials', type: 'rework', note: 'Artwork, rarity frames, and finishes resolve through the existing registries.' },
          { stat: 'Specifications', entity: 'Inspect', from: 'Manually entered values', to: 'Current catalog values', type: 'rework', note: 'Unknown fields are omitted; unified memory is explicitly shared.' },
          { stat: 'Card inspection', entity: 'Preview specimen', from: 'Stylized SVG', to: 'Shared full card renderer', type: 'rework', note: 'Flip, choose a preview finish, and reset the view without granting rewards.' },
          { stat: 'Gallery browsing', entity: 'Long lists', from: 'Full list', to: '3 previews, then View more', type: 'rework', note: 'Search reveals matching specimens even when they were initially below the fold.' }
        ] },
        { id: 'reading', category: 'Reading & discovery', subtitle: 'Find an update. Keep your place.', icon: 'search', changes: [
          { stat: 'Search scope', entity: 'Journal', from: 'Card names only', to: 'Versions, names & all changes', type: 'rework', note: 'Release titles, descriptions, cards, comparisons, and detailed sections are searchable.' },
          { stat: 'Release order', entity: 'Archive', from: 'Reversed registry order', to: 'Semantic version sorting', type: 'rework', note: 'Newest, oldest, and major releases remain separate from the section filters.' },
          { stat: 'Reading position', entity: 'Navigation', from: 'Reset on refresh', to: 'Remembered per release', type: 'rework', note: 'Changing mode or expanding content keeps your place; switching releases restores it.' },
          { stat: 'Long changes', entity: 'Details', from: 'Always expanded', to: 'Expandable, with View more', type: 'rework', note: 'Expand all, collapse all, and section shortcuts help you scan at your own pace.' }
        ] },
        { id: 'interaction', category: 'Interaction & motion', subtitle: 'Purposeful feedback, quiet browsing', icon: 'motion', changes: [
          { stat: 'Hero presentation', entity: 'Preview media', from: 'Recurring particle loop', to: 'Local still artwork', type: 'rework', note: 'Browsing does not start decorative animation loops. Future video entries use manual playback.' },
          { stat: 'Interactive mode', entity: 'Journal', from: 'Simulated balance toast', to: 'Working preview controls', type: 'rework', note: 'Tilt specimens, scrub a before/after comparison, and switch finishes in inspection.' },
          { stat: 'Keyboard navigation', entity: 'Dialogs', from: 'One focus scope', to: 'Nested focus & restoration', type: 'rework', note: 'Escape closes inspection first, then the journal; / focuses search.' },
          { stat: 'Motion preferences', entity: 'Browsing', from: 'Decorative animation', to: 'Quality-aware, reduced motion', type: 'rework', note: 'Reduced motion retains every control and comparison without tilt or scroll travel.' }
        ] }
      ],
      sections: {
        features: [
          'A dedicated Patch notes button beside Credits, with a quiet unread indicator for the current version.',
          'An inventory-style journal with a release archive, feature previews, card specimens, and change comparisons.',
          'Interactive mode adds pointer tilt, a before/after slider, and selectable finishes in full-size inspection.',
          'The existing Settings → About and command palette entries open the same release journal.',
          'Local images and optional manually played videos can accompany future release entries.'
        ],
        systems: [
          'Structured release entries supply the version, codename, date, media, specimens, comparisons, and categorized details.',
          'Preview instances are temporary and clearly labeled. They do not mint serials, reserve offers, or write inventory.',
          'Every future update must maintain the structured journal and both markdown changelog consumers.'
        ],
        visuals: [
          'Near-black shaded panels, subtle edge lighting, bundled Inter and JetBrains Mono, and generous spacing match the inventory.',
          'The featured media uses existing local collection artwork, with a caption that identifies it as a preview.',
          'Rarity and finish color remain on the collectible. Navigation and ordinary labels remain monochrome.'
        ],
        qol: [
          'Search update numbers, codenames, cards, variants, balance rows, and all detailed changes from one field.',
          'Sort releases by newest or oldest, or show only major updates.',
          'Filter by Overview, Cards & finishes, Changes, or Details, with result counts and a clear empty state.',
          'View more controls bound card galleries, long change groups, and detailed lists.',
          'Expand or collapse all change groups; jump to sections and return to the top.',
          'Copy the full selected release as markdown, including specimens and before/after values.',
          'Reading progress, remembered release positions, and focus restoration keep navigation predictable.'
        ],
        fixes: [
          'Removed unsupported hardware tuning and drop-rate claims from the previous Patch Notes draft.',
          'Inspection now uses actual catalog rarity, specifications, and registered finishes.',
          'Closing or rebuilding the journal destroys mounted specimen views and releases their listeners.',
          'The journal blocks background interaction while open and restores each element’s prior inert state.',
          'Escape works from search and inspection controls; copy failures offer selectable notes.'
        ]
      }
    },
    {
      version: '1.0.3', codename: 'Patch Notes, first edition', date: 'October 7, 2026', tag: 'Feature',
      tagline: 'The first structured Patch Notes hub, with a dedicated HUD entry and release registry.',
      hero: { title: 'The first edition.', subtitle: 'A dedicated place for Cardable updates.', badge: 'From the archive' },
      showcase: [], balanceChanges: [],
      sections: { features: ['Added the Patch Notes hub, HUD button, Settings entry, and command palette shortcut.', 'Introduced structured release entries, showcase galleries, and expandable comparison groups.'], fixes: ['The original draft included unsupported sample balance and hardware claims. Those claims have been removed from this journal.'] }
    },
    {
      version: '1.0.1', codename: 'Cinematic Public Website', date: 'October 6, 2026', tag: 'Feature',
      tagline: 'A download page built around the collection and authored rarity worlds.',
      hero: { title: 'A world beyond the wrapper.', subtitle: 'Nine authored scenes, a demo collection, and Safe rarity films.', badge: 'From the archive', media: [{ kind: 'image', src: 'assets/cards/geforce-rtx-4090.webp', alt: 'RTX 4090 collection artwork', caption: 'Collection artwork · website specimen' }] },
      showcase: [], balanceChanges: [], sections: { features: ['Rebuilt the public website as nine authored scenes.', 'Added an interactive 24-card demo collection and four Safe cutscenes with playback controls.'], systems: ['Bundled the website assets while preserving the offline classic-script game.'], qol: ['Provided installer and complete-folder ZIP download paths.'] }
    },
    {
      version: '1.0.0', codename: 'Public Genesis', date: 'October 6, 2026', tag: 'Major',
      tagline: 'The public version series began, carrying forward the game and its existing saves.',
      hero: { title: 'The collection begins.', subtitle: 'Offline play. A collection that stays yours.', badge: 'From the archive' },
      showcase: [], balanceChanges: [], sections: { features: ['Initial public Windows installer and complete-folder app distribution.'], systems: ['Preserved app identity, saves, and the classic-script browser entry.'] }
    }
  ];
})(window.Cardable);
