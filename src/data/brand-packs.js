/* Fixed owner-supplied 122-card roster subsets. DATA ONLY.
 * Four equal 1.25% outcomes fill a combined 5% of non-cadence slots.
 * Keep explicit IDs: catalog additions do not silently enter branded packs.
 */
(function(C) {
  'use strict';
  C.data.packs = C.data.packs.concat([
    {
      id: 'nvidia', name: 'NVIDIA Pack', enabled: true,
      priority: 0, cadence: null, randomChance: 0.0125,
      pool: { brands: ['nvidia'], cardIds: ["geforce-gt-610", "geforce-gt-710", "geforce-gtx-650", "geforce-gtx-750", "geforce-fx-5500", "geforce-2-mx-200", "geforce-gt-630", "geforce-gt-730", "geforce-gt-1030", "geforce-gtx-1050", "geforce-gtx-1650", "geforce-rtx-3060", "geforce-fx-5200", "geforce-2-mx", "geforce-gtx-660", "geforce-gtx-760", "geforce-gtx-950", "geforce-gtx-1650-super", "geforce-gtx-1660", "geforce-gtx-1660-super", "geforce-rtx-3050", "geforce-rtx-4060", "geforce-gtx-670", "geforce-gtx-770", "geforce-gtx-960", "geforce-gtx-1050-ti", "geforce-gtx-750-ti", "geforce-2-gts", "geforce-fx-5600-ultra", "geforce-gtx-1060-3gb", "geforce-gt-740", "geforce-gtx-970", "geforce-gtx-1060-6gb", "geforce-gtx-1660-ti", "geforce-2-ultra", "geforce-gtx-680", "geforce-gtx-780", "geforce-gtx-1070", "geforce-rtx-2060", "geforce-rtx-3060-ti", "geforce-rtx-2060-super", "geforce-rtx-2070", "geforce-rtx-3070", "geforce-rtx-4060-ti", "geforce-rtx-5090", "geforce-rtx-4070-super", "geforce-gtx-980", "geforce-rtx-4070", "geforce-rtx-5070", "geforce-rtx-3080", "geforce-gtx-1080", "geforce-rtx-4070-ti", "geforce-gtx-1080-ti", "geforce-rtx-2080-ti", "geforce-rtx-4080", "geforce-gtx-980-ti", "geforce-rtx-3090", "geforce-gtx-690", "titan-x-pascal", "geforce-rtx-4090", "geforce-gtx-titan", "geforce-rtx-3090-ti", "geforce-rtx-5080", "titan-rtx", "geforce-256"] },
      skin: 'nvidia', cardsPerPack: 1, tierWeightModifiers: {}, variantChanceMultiplier: 1, guarantees: [],
      counterStyle: { accent: '#76B900', glyph: 'NV', label: 'NVIDIA PACK' },
      tagline: 'NVIDIA CARDS ONLY', introText: '', obtainable: 'timer',
      design: { material: 'graphite-machined', wrapper: 'brand-foil', graphic: null,
        companyLogo: 'assets/packs/nvidia-wordmark.svg', companyName: 'NVIDIA',
        roughness: .2, foilStrength: .7, refraction: .32, emboss: .7,
        subtitle: 'Brand archive / one card', showGenerationPool: false,
        series: '01', batch: 'NV / ARCHIVE', security: 'CBL / SEALED' }
    },
    {
      id: 'amd', name: 'AMD Pack', enabled: true,
      priority: 0, cadence: null, randomChance: 0.0125,
      pool: { brands: ['amd'], cardIds: ["radeon-hd-2400-pro", "radeon-hd-2600-pro", "radeon-rx-5500", "radeon-9000", "radeon-hd-2400-xt", "radeon-rx-6400", "radeon-7000", "radeon-9200", "radeon-hd-2600-xt", "radeon-rx-5600-xt", "radeon-rx-5500-xt", "radeon-rx-6500-xt", "radeon-7500", "radeon-8500", "radeon-hd-2900-xt", "radeon-hd-2900-pro", "radeon-rx-6600-xt", "radeon-rx-5700-xt", "radeon-rx-6600", "radeon-rx-7600", "radeon-rx-7800-xt", "radeon-rx-6700-xt", "radeon-rx-7700-xt", "radeon-rx-9060-xt", "radeon-rx-9070-xt", "radeon-rx-9070", "radeon-vii", "radeon-rx-6800-xt", "radeon-rx-6800", "radeon-rx-7900-xtx", "radeon-rx-7900-xt", "radeon-rx-6900-xt", "radeon-ddr"] },
      skin: 'amd', cardsPerPack: 1, tierWeightModifiers: {}, variantChanceMultiplier: 1, guarantees: [],
      counterStyle: { accent: '#ED1C24', glyph: 'AMD', label: 'AMD PACK' },
      tagline: 'AMD CARDS ONLY', introText: '', obtainable: 'timer',
      design: { material: 'red-anodized', wrapper: 'brand-foil', graphic: null,
        companyLogo: 'assets/packs/amd-logo.svg', companyName: 'AMD',
        roughness: .2, foilStrength: .7, refraction: .32, emboss: .7,
        subtitle: 'Brand archive / one card', showGenerationPool: false,
        series: '01', batch: 'AMD / ARCHIVE', security: 'CBL / SEALED' }
    },
    {
      id: 'snapdragon', name: 'Snapdragon Pack', enabled: true,
      priority: 0, cadence: null, randomChance: 0.0125,
      pool: { brands: ['qualcomm'], cardIds: ["snapdragon-x", "snapdragon-x-plus", "snapdragon-x-elite", "snapdragon-x2-elite"] },
      skin: 'snapdragon', cardsPerPack: 1, tierWeightModifiers: {}, variantChanceMultiplier: 1, guarantees: [],
      counterStyle: { accent: '#DAB777', glyph: 'SD', label: 'SNAPDRAGON PACK' },
      tagline: 'SNAPDRAGON CARDS ONLY', introText: '', obtainable: 'timer',
      design: { material: 'gold-ceramic', wrapper: 'brand-foil', graphic: null,
        companyLogo: 'assets/packs/snapdragon-logo.png', companyName: 'Snapdragon',
        roughness: .2, foilStrength: .7, refraction: .32, emboss: .7,
        subtitle: 'Brand archive / one card', showGenerationPool: false,
        series: '01', batch: 'SD / ARCHIVE', security: 'CBL / SEALED' }
    },
    {
      id: 'apple', name: 'Apple Pack', enabled: true,
      priority: 0, cadence: null, randomChance: 0.0125,
      pool: { brands: ['apple'], cardIds: ["apple-m1-gpu", "apple-m1-pro-gpu", "apple-m1-max-gpu", "apple-m2-pro-gpu", "apple-m2-gpu", "apple-m3-gpu", "apple-m4-gpu", "apple-m3-max-gpu", "apple-m3-pro-gpu", "apple-m3-ultra-gpu", "apple-m4-max-gpu", "apple-m5-gpu"] },
      skin: 'apple', cardsPerPack: 1, tierWeightModifiers: {}, variantChanceMultiplier: 1, guarantees: [],
      counterStyle: { accent: '#D8DBE4', glyph: 'AP', label: 'APPLE PACK' },
      tagline: 'APPLE CARDS ONLY', introText: '', obtainable: 'timer',
      design: { material: 'silver-anodized', wrapper: 'brand-foil', graphic: null,
        companyLogo: 'assets/packs/apple-logo.svg', companyName: 'Apple',
        roughness: .38, foilStrength: .7, refraction: .32, emboss: .7,
        subtitle: 'Brand archive / one card', showGenerationPool: false,
        series: '01', batch: 'AP / ARCHIVE', security: 'CBL / SEALED' }
    }
  ]);
})(window.Cardable);
