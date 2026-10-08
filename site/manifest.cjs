'use strict';
// Bounded public presentation: no game entry, state, pulls or native bridges.
module.exports = {
  cards: ['geforce-rtx-4090','radeon-rx-7900-xtx','geforce-rtx-3090','titan-rtx','geforce-gtx-1080-ti','geforce-rtx-4080','radeon-rx-7900-xt','titan-x-pascal','geforce-rtx-3090-ti','geforce-gtx-titan','geforce-rtx-3080','radeon-vii','geforce-rtx-4070','radeon-rx-9070-xt','geforce-rtx-3060-ti','geforce-rtx-2060','radeon-rx-6700-xt','geforce-gtx-970','radeon-rx-6600','geforce-gtx-1050-ti','intel-arc-a380','geforce-gtx-760','geforce-gt-710','apple-m1-gpu'],
  styles: ['tokens','card','finishes','card-remake','card-remake-high','variants','pack','pack-variants','opening'],
  scripts: ['core/namespace','config','data/rarities','data/ascendant-cutscene','data/cards','data/packs','data/classic-pack','data/variants','data/settings-schema','data/quality-profiles','core/events',
    '@adapter','fx/cut-geometry','fx/cutscene-safety','fx/springs','fx/cutscene-card-back','fx/gilded-intro','fx/cutscene-gl','fx/cinematic-optics','fx/prismatic-world','fx/crystal-scene-engine','fx/cutscene-clock','fx/cutscene-text','fx/ascendant-background','fx/ascendant-intro','fx/mythical-scene','fx/mythical-intro','fx/exotic-intro',
    'finishes/index','finishes/basic','finishes/common','finishes/uncommon','finishes/rare','finishes/super-rare','finishes/unusual','finishes/double-super-rare','finishes/legendary','finishes/mythical','finishes/exotic','finishes/ascendant',
    'ui/card-specs','ui/card-art','finishes/variants','ui/card','ui/card-skins','ui/card-thumbnail','ui/pack-markup','ui/pack-skins','ui/pack-material']
};
