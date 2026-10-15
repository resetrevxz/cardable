/* Local Shop policy. Credits are game units, never market prices. */
(function (C) {
  'use strict';
  C.data.shop = {
    version: 1, offerCount: 4, retainedDays: 32, retainedReceipts: 64,
    featuredPackId: 'titan', featuredPrice: 7600,
    baseByRarity: {
      basic: 900, common: 1200, uncommon: 1700, rare: 2400,
      'super-rare': 3200, unusual: 3900, 'double-super-rare': 4700,
      legendary: 6000, mythical: 7800, exotic: 10500,
      ascendant: 16000, secret: 24000
    },
    convenienceMultiplier: 1.25,
    variantMultiplier: 1.20,
    // Future content can set a positive shopPriceMultiplier on a card definition.
    minimumPrice: 100, maximumPrice: 1000000, priceStep: 50
  };
})(window.Cardable);
