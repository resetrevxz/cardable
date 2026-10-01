/* Permanent surface finishes. Weights are conditional on the independent 10% roll. */
(function (C) {
  'use strict';
  C.data.variants = [
    { id: 'rainbow-holo', name: 'Rainbow Holo', class: 'Common', weight: 18 },
    { id: 'vertical-holo', name: 'Vertical Holo', class: 'Common', weight: 16 },
    { id: 'horizontal-holo', name: 'Horizontal Holo', class: 'Common', weight: 16 },
    { id: 'matte', name: 'Matte', class: 'Common', weight: 10 },
    { id: 'beam', name: 'Beam', class: 'Uncommon', weight: 16 },
    { id: 'cross', name: 'Cross', class: 'Rare', weight: 4 },
    { id: 'spotlight', name: 'Spotlight', class: 'Rare', weight: 4 },
    { id: 'galaxy-holo', name: 'Galaxy Holo', class: 'Rare', weight: 4 },
    { id: 'starlight', name: 'Starlight', class: 'Rare', weight: 4 },
    { id: 'shattered', name: 'Shattered', class: 'Rare', weight: 4 },
    { id: 'aurora', name: 'Aurora', class: 'Rare', weight: 4 }
  ];
  C.variant = function (id) { return C.data.variants.find(function (v) { return v.id === id; }) || null; };
})(window.Cardable);
