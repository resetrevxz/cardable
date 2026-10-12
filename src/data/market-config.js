/* Cardable Market — configuration. DATA ONLY.
 * Every price factor, fee, duration, threshold and label the market shell reads lives here.
 * Values marked provisional are reversible beta defaults to be tuned in Stage 3 against real tier distribution.
 * This file never reads the reserved marketValueUsd field of the rarity data.
 */
(function (C) {
  'use strict';
  C.data = C.data || {};

  C.data.market = {
    betaVersion: '1.0.0',
    stage: 1,
    contractVersion: 1,
    previewStorageKey: 'cardable.market.preview',

    // The two environments never share balances, histories, inventory claims or valuations.
    realms: [
      { id: 'simulation', label: 'Simulation', shortLabel: 'Simulation', state: 'preview', stateLabel: 'Preview',
        blurb: 'Bots on this device. Works offline and never involves other people.',
        counterparties: 'Simulation bots', sourceLabel: 'Simulation bot' },
      { id: 'global', label: 'Global Market', shortLabel: 'Global', state: 'offline', stateLabel: 'Not connected',
        blurb: 'Real players only. Not available in this build.',
        counterparties: 'Players', sourceLabel: 'Player' }
    ],

    formats: [
      { id: 'buy-now', label: 'Buy Now', short: 'Buy Now', icon: 'tag', blurb: 'A fixed price. The first buyer settles it.' },
      { id: 'auction', label: 'Auction', short: 'Auction', icon: 'gavel', blurb: 'Timed bidding with a proxy maximum.' },
      { id: 'swap', label: 'Trade', short: 'Trade', icon: 'swap', blurb: 'Card for card, with an optional Credits top-up.' }
    ],

    // Baseline value per rarity in Credits, scaled again per GPU by its own specification. Provisional.
    rarityBase: { basic: 10, common: 18, uncommon: 32, rare: 70, 'super-rare': 130, unusual: 200, 'double-super-rare': 320,
      legendary: 600, mythical: 1200, exotic: 2400, ascendant: 4800, secret: 9000 },
    rarityBaseFallbackGrowth: 1.9,
    // A card's own spec score nudges its baseline within its tier (0.8x to 1.35x).
    cardSpread: { min: 0.8, max: 1.35 },
    variantClassFactor: { Common: 1.15, Uncommon: 1.3, Rare: 1.8, Epic: 2.4 },
    skinFactor: 1.25,
    serial: { lowCounter: 100, lowBonus: 0.3, roundBonus: 0.06, min: 0.92, max: 1.35 },

    // Hybrid volatility: common tiers sit near their baseline, scarce tiers move more and quote wider spreads.
    volatility: { base: 0.012, perTier: 0.011, cap: 0.16 },
    spread: { base: 0.03, perTier: 0.012, cap: 0.22 },
    liquidity: { base: 0.95, perTier: 0.07, floor: 0.12 },
    confidence: { highSamples: 25, mediumSamples: 10 },
    targets: { buyBelow: 0.04, sellAbove: 0.03 },
    verdict: { undervalued: 0.9, overpriced: 1.15 },

    // Fees and listing policy. Provisional until Stage 3 balance tests.
    fee: { bps: 200, rounding: 'half-up', minFee: 1, label: '2% market fee' },
    auction: {
      presets: [
        { id: '6h', label: '6 hours', hours: 6 },
        { id: '24h', label: '24 hours', hours: 24 },
        { id: '3d', label: '3 days', hours: 72 }
      ],
      defaultPreset: '24h',
      customMinHours: 1, customMaxHours: 336,
      incrementPct: 5, incrementMin: 1,
      snipeWindowMin: 5, snipeExtendMin: 5,
      reserveMin: 0
    },
    listing: { titleMax: 60, descriptionMax: 280, coverRatios: ['card', '4:5', '1:1', '16:9'], maxBundle: 6 },
    relativeValue: { min: 50, max: 150, step: 5, default: 90 },
    confirmThreshold: 500,

    // Discover.
    tabs: [
      { id: 'for-you', label: 'For You' },
      { id: 'new', label: 'New' },
      { id: 'ending', label: 'Ending soon' },
      { id: 'trending', label: 'Trending' },
      { id: 'trades', label: 'Recent trades' }
    ],
    pageSize: { feed: 24, terminal: 40, reduced: 12 },
    sorts: [
      { id: 'recommended', label: 'Recommended', help: 'Fit for you: value, budget, collection gaps, liquidity and trust. Not price order.' },
      { id: 'newest', label: 'Newest' },
      { id: 'ending', label: 'Ending soonest' },
      { id: 'bids', label: 'Most bids' },
      { id: 'value', label: 'Best value', help: 'Lowest price relative to a confident Average Value.' },
      { id: 'price-asc', label: 'Price: low to high' },
      { id: 'price-desc', label: 'Price: high to low' },
      { id: 'liquid', label: 'Most liquid' },
      { id: 'discount', label: 'Biggest discount' },
      { id: 'profit', label: 'Highest estimated profit', help: 'Average Value after the market fee, minus the asking price.' },
      { id: 'volume', label: 'Highest volume' },
      { id: 'popular', label: 'Most watched' },
      { id: 'rarity', label: 'Rarity' },
      { id: 'serial', label: 'Lowest serial' },
      { id: 'variant', label: 'Variant' }
    ],
    presets: [
      { id: 'good-value', label: 'Good value', sort: 'value', filters: { minConfidence: 'medium', valueRatio: { max: 95 } } },
      { id: 'gaps', label: 'Collection gaps', sort: 'recommended', filters: { ownership: 'gap' } },
      { id: 'budget', label: 'Around your budget', sort: 'recommended', filters: { withinBudget: true } },
      { id: 'rare', label: 'Rare finds', sort: 'rarity', filters: { rarityTierMin: 5 } },
      { id: 'ending', label: 'Ending soon', sort: 'ending', filters: { formats: ['auction'], auctionStatus: 'ending' } },
      { id: 'variants', label: 'Popular variants', sort: 'popular', filters: { variantOnly: true } }
    ],
    notices: {
      simulation: 'Preview. The Simulation market is not running yet. These listings are fixed sample data and nothing here can be bought, bid on or sold.',
      global: 'Global Market is not connected in this build. When it is, only real player listings appear here.',
      globalSample: 'Sample layout. These listings are invented to show the design. They are not real players and never count as market volume.'
    },
    noticesShort: {
      simulation: 'Sample data only. Not tradable yet.',
      global: 'Not connected. Real players only.',
      globalSample: 'Invented sample listings. Not real players.'
    },

    // Unified glossary shown in help popovers and the Market guide.
    glossary: [
      { id: 'average-value', term: 'Average Value', body: 'A robust average of recent completed sales for this exact card, finish and skin, pulled toward a baseline when there are few sales. It is an estimate, not a promise.' },
      { id: 'target-buy', term: 'Target Buy', body: 'A price at or below which this card looks well priced against its Average Value, after allowing for the spread.' },
      { id: 'target-sell', term: 'Target Sell', body: 'A price at which a listing is likely to sell in a reasonable time, given liquidity and the market fee.' },
      { id: 'volume', term: 'Volume', body: 'Completed sales only, counted in cards and in Credits. Listings, bids, Quick Sell and cancelled offers never count.' },
      { id: 'spread', term: 'Spread', body: 'The gap between the best bid and the lowest ask. A wide spread usually means a thin market.' },
      { id: 'reserve', term: 'Reserve', body: 'A hidden minimum. The auction only sells if the winning bid reaches it.' },
      { id: 'proxy-bid', term: 'Proxy bid', body: 'You name your maximum. The market bids the smallest amount that keeps you in front, up to that maximum.' },
      { id: 'settlement', term: 'Settlement', body: 'The moment a sale completes: the card changes owner, Credits move, and the fee is taken once.' },
      { id: 'escrow', term: 'Escrow', body: 'Credits or a card held aside while an offer is open, so nothing can be spent or sold twice.' },
      { id: 'quick-sell', term: 'Quick Sell', body: 'An instant sale to the game itself at a deliberate discount. It is not a player trade and is never counted as market volume.' },
      { id: 'realm', term: 'Realm', body: 'Simulation (bots, offline) and Global Market (real players). Balances, histories and valuations are never shared between them.' },
      { id: 'liquidity', term: 'Liquidity', body: 'How easily this card changes hands near its Average Value. Higher means faster, tighter trades.' },
      { id: 'confidence', term: 'Confidence', body: 'How much recent sale data supports the Average Value. Low means the estimate leans on the baseline.' },
      { id: 'volatility', term: 'Volatility', body: 'How far the price tends to move day to day. Scarcer rarities move more.' }
    ],

    // Provisional tuning table, mirrored in docs/market-beta/stage-1.md.
    tuning: [
      { key: 'fee.bps', value: 200, note: '2% of the sale price; rounded half up with a one Credit minimum.' },
      { key: 'quickSell', value: 'Stage 3', note: 'Quick Sell percentage is set from balance tests.' },
      { key: 'auction.presets', value: '6h / 24h / 3d', note: 'Safe presets for Simple mode. Custom 1 hour to 14 days is Advanced only.' },
      { key: 'auction.incrementPct', value: 5, note: 'Minimum raise of 5% or 1 Credit, whichever is larger.' },
      { key: 'auction.snipe', value: '5 min', note: 'A bid in the last five minutes extends the close by five.' },
      { key: 'rarityBase', value: 'see config', note: 'Credits baseline per rarity before per-GPU and finish factors.' }
    ]
  };
})(window.Cardable = window.Cardable || {});
