'use strict';
// Variants for bench-inventory-frames.cjs: each is a tweak applied after the inventory is open.
module.exports = {
  baseline: {},
  // the full-viewport dot canvas that sits behind the sheet and redraws as the pointer moves
  'no-dots': { css: '#dot-grid{display:none!important}' },
  // the pack menu that is hidden (opacity 0) behind the inventory but still laid out and animated
  'no-menu': { css: '.menu-shell{display:none!important}' },
  'no-dots-no-menu': { css: '#dot-grid,.menu-shell{display:none!important}' },
  // sheet decoration
  'flat-sheet': { css: '.inventory-sheet.cb-inventory-glass{box-shadow:none!important;background:#14151a!important}.cb-inventory-glass::before,.cb-inventory-glass::after{display:none!important}' },
  // card-level decoration inside tiles
  'no-card-shadows': { css: '.inventory-tile *{box-shadow:none!important;filter:none!important;text-shadow:none!important}' },
  // finished entrance animations (fill-mode both) keep every icon and caption a live compositor layer
  'fill-backwards': { css: '.detail-tag,.card__spec-icon,.achievement-emblem,.achievement-ring,.inventory-card-caption,.detail-panel,.inventory-toolbar{animation-fill-mode:backwards!important}' },
  'no-tile-anim': { css: '.inventory-tile *{animation:none!important}' },
  'fill-backwards-no-willchange': { css: '.detail-tag,.card__spec-icon,.achievement-emblem,.achievement-ring,.inventory-card-caption,.detail-panel,.inventory-toolbar{animation-fill-mode:backwards!important}.inventory-grid .inventory-tile{will-change:auto!important}' },
  'all-fixes': { css: '.detail-tag,.card__spec-icon,.achievement-emblem,.achievement-ring,.inventory-card-caption,.detail-panel,.inventory-toolbar{animation-fill-mode:backwards!important}.inventory-grid .inventory-tile{will-change:auto!important}.inventory-tile .card__tilter{transform:none!important}.inventory-depth-active .menu-shell{visibility:hidden!important}' },
  'all-fixes-no-dots': { css: '.detail-tag,.card__spec-icon,.achievement-emblem,.achievement-ring,.inventory-card-caption,.detail-panel,.inventory-toolbar{animation-fill-mode:backwards!important}.inventory-grid .inventory-tile{will-change:auto!important}.inventory-tile .card__tilter{transform:none!important}.inventory-depth-active .menu-shell{visibility:hidden!important}#dot-grid{display:none!important}' },
  'keep-tile-layer': { css: '.inventory-grid .inventory-tile{will-change:transform}' },
  'no-3d': { css: '.inventory-tile-pose,.inventory-tile-card,.inventory-track{transform-style:flat!important;will-change:auto!important;perspective:none!important}' }
};
