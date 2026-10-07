(function (C) {
  'use strict';
  C.data.journal = {
    cap: 5000, uniqueMilestones: [10, 25, 50, 100], packMilestones: [10, 50, 100, 500],
    empty: 'Your history starts with your first pull.',
    copies: 'You own {n} copies. The newest has serial {serial}.',
    categories: [
      { id: 'cards', name: 'Cards', types: ['pull', 'firstPull', 'rarityFirst', 'daySummary'] },
      { id: 'variants', name: 'Variants', types: ['variantFirst'] },
      { id: 'combos', name: 'Combos', types: ['comboFirst'] },
      { id: 'packs', name: 'Packs', types: ['packType'] },
      { id: 'achievements', name: 'Achievements', types: ['achievement'] },
      { id: 'milestones', name: 'Milestones', types: ['milestone', 'streak'] },
      { id: 'photos', name: 'Photos', types: ['photo'] }
    ],
    types: {
      pull: { name: 'Pull', glyph: 'M5 3h14v18H5ZM8 7h8M8 11h5', templates: [
        '{card}, from {pack}.', 'Another page for {card}. Serial {serial}.', '{card} arrived with {variants}.', 'A new copy of {card}. {pack} left its mark.', 'Collected {card}. Serial {serial} is yours.' ] },
      firstPull: { name: 'First card', highlight: true, glyph: 'm12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z', templates: [
        'First pull. {card} from {pack}.', '{card} joined the collection.', 'A place of its own: {card}.', 'The first {card}. A small beginning.', '{pack} brought a new face: {card}.' ] },
      variantFirst: { name: 'Variant discovered', highlight: true, glyph: 'M12 2 3 7v10l9 5 9-5V7ZM3 7l9 5 9-5M12 12v10', templates: [
        'Variant discovered: {variant}. It caught the light on {card}.', 'A first glimpse of {variant}, on {card}.', '{card} introduced {variant} to the collection.', '{variant} found its first home on {card}.', 'A new finish to remember: {variant}, on {card}.' ] },
      comboFirst: { name: 'Combo discovered', highlight: true, glyph: 'M3 6h12v12H3ZM9 3h12v12H9', templates: [
        'Combo found: {combo}. {variantA} and {variantB} on {card}.', '{card} brought {combo} into view.', 'Together for the first time: {variantA} and {variantB}.', 'A new pairing on {card}: {combo}.', '{combo} joined the journal through {card}.' ] },
      packType: { name: 'First pack', highlight: true, glyph: 'M4 4h16v16H4ZM4 8h16M8 4v4m8-4v4', templates: [
        'Opened {pack} for the first time. {tagline}', 'A first look inside {pack}. {tagline}', '{pack} opened a new chapter.', 'The first {pack}, now part of your story.', 'A new wrapper, a new memory: {pack}.' ] },
      rarityFirst: { name: 'First tier', highlight: true, glyph: 'M4 4h16v16H4ZM8 8h8v8H8Z', templates: [
        'Your first {tier}: {card}.', '{card} opened the door to {tier}.', 'A new tier in the collection: {tier}.', 'The first {tier} belongs to {card}.', '{tier}, discovered through {card}.' ] },
      achievement: { name: 'Achievement', highlight: true, glyph: 'M7 3h10v9a5 5 0 0 1-10 0ZM7 5H3v4a4 4 0 0 0 4 4m10-8h4v4a4 4 0 0 1-4 4M12 17v4m-4 0h8', templates: [
        'Achievement: {name}.', '{name}. A moment earned.', 'A new achievement for the book: {name}.', '{name} is now part of your story.', 'An achievement to remember: {name}.' ] },
      milestone: { name: 'Milestone', highlight: true, glyph: 'M5 21V3m0 0h14l-3 5 3 5H5', templates: [
        '{milestone}. {progress}', 'A new marker: {milestone}. {progress}', '{milestone}. The collection keeps growing.', 'Take a moment: {milestone}.', 'A page worth keeping: {milestone}. {progress}' ] },
      photo: { name: 'Studio photo', glyph: 'M3 7h5l2-3h4l2 3h5v13H3ZM12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8', templates: [
        'Photographed {card} in the studio.', 'A portrait of {card}, kept in the journal.', '{card} took a moment in the light.', 'The studio captured {card}.', 'A quiet frame for {card}.' ] },
      streak: { name: 'Daily streak', highlight: true, glyph: 'M5 5h14v15H5ZM5 10h14M8 3v5m8-5v5M9 14l2 2 4-4', templates: [
        '{n} days in a row.', 'The collection grew for {n} consecutive days.', 'A daily ritual: {n} days together.', '{n} days of returning to the collection.', 'Another day, another page. A {n}-day streak.' ] },
      daySummary: { name: 'Daily pulls', glyph: 'M4 4h16v16H4ZM7 8h10M7 12h10M7 16h6', templates: [
        '{n} pulls remembered. The standout was {card}.', 'A day of {n} pulls, led by {card}.', '{n} collected copies. {card} caught the light.', 'From this chapter: {n} pulls, including {card}.', '{n} arrivals in the book. Best pull: {card}.' ] }
    }
  };
})(window.Cardable);
