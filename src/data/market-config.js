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
      { id: 'simulation', label: 'Standard', shortLabel: 'Standard', state: 'local', stateLabel: 'Offline',
        blurb: 'Traders on this device. Works offline.',
        counterparties: 'Standard traders', sourceLabel: 'Standard trader' },
      { id: 'global', label: 'Players', shortLabel: 'Players', state: 'offline', stateLabel: 'Not connected',
        blurb: 'Real players, with their own Credits.',
        counterparties: 'Players', sourceLabel: 'Player' }
    ],

    formats: [
      { id: 'buy-now', label: 'Buy Now', short: 'Buy Now', icon: 'tag', blurb: 'A fixed price. The first buyer settles it.' },
      { id: 'auction', label: 'Auction', short: 'Auction', icon: 'gavel', blurb: 'Timed bidding with a proxy maximum.' },
      { id: 'swap', label: 'Trade', short: 'Trade', icon: 'swap', blurb: 'Card for card, with an optional Credits top-up.' }
    ],

    // Baseline value per rarity in Credits, scaled again per GPU by its own specification. Provisional.
    // Re-based for the 1.10.0 odds (docs/RARITY-ODDS-1.10.0.md): worth follows how seldom a card is pulled, so Rare and above are worth
    // two to three times what they were, Basic and Common a little less, and the average pull stays within about a quarter of before.
    rarityBase: { basic: 9, common: 17, uncommon: 34, rare: 140, 'super-rare': 330, unusual: 540, 'double-super-rare': 960,
      legendary: 1500, mythical: 3000, exotic: 5000, ascendant: 9000, secret: 16000 },
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
      { id: 'variant', label: 'Variant' },
      { id: 'change', label: 'Greatest change', help: 'The biggest move in either direction over the last 7 days, from completed sales only.' }
    ],
    presets: [
      { id: 'good-value', label: 'Good value', sort: 'value', filters: { minConfidence: 'medium', valueRatio: { max: 95 } } },
      { id: 'gaps', label: 'Collection gaps', sort: 'recommended', filters: { ownership: 'gap' } },
      { id: 'budget', label: 'Around your budget', sort: 'recommended', filters: { withinBudget: true } },
      { id: 'rare', label: 'Rare finds', sort: 'rarity', filters: { rarityTierMin: 5 } },
      { id: 'ending', label: 'Ending soon', sort: 'ending', filters: { formats: ['auction'], auctionStatus: 'ending' } },
      { id: 'variants', label: 'Popular variants', sort: 'popular', filters: { variantOnly: true } },
      // Explore areas driven by what has actually sold (volume, liquidity, change) and by what you collect.
      { id: 'trending-sales', label: 'Trending', sort: 'volume', filters: {} },
      { id: 'liquid', label: 'Highly liquid', sort: 'liquid', filters: { minConfidence: 'medium' } },
      { id: 'movers', label: 'Greatest change', sort: 'change', filters: {} },
      { id: 'watch-matches', label: 'Watchlist matches', sort: 'recommended', filters: { ownership: 'watching' } },
      { id: 'desired-variants', label: 'Desired variants', sort: 'recommended', filters: { variantOnly: true }, dynamic: 'variants' },
      { id: 'series', label: 'Series and brand', sort: 'recommended', filters: {}, dynamic: 'brands' }
    ],
    notices: {
      simulation: 'Standard is a market of software traders on this device. It works offline and is separate from Players.',
      global: 'Players is not connected in this build. When it is, only real player listings appear here.',
      globalSample: 'Sample layout. These listings are invented to show the design. They are not real players and never count as market volume.'
    },
    noticesShort: {
      simulation: 'Standard traders, offline.',
      global: 'Not connected. Real players only.',
      globalSample: 'Invented sample listings. Not real players.'
    },

    // Unified glossary shown in help popovers and the Market guide.
    glossary: [
      { id: 'average-value', term: 'Average Value', body: 'A robust average of recent completed sales for this exact card, finish and skin, pulled toward a baseline when there are few sales. It is an estimate, not a promise.' },
      { id: 'quick-sell', term: 'Quick Sell', body: 'A fixed price from the system for a card you do not want to list: a share of its Average Value, always below what another trader would pay. It is not a trade and never counts as volume or sets a price.' },
      { id: 'target-buy', term: 'Target Buy', body: 'A price at or below which this card looks well priced against its Average Value, after allowing for the spread.' },
      { id: 'target-sell', term: 'Target Sell', body: 'A price at which a listing is likely to sell in a reasonable time, given liquidity and the market fee.' },
      { id: 'volume', term: 'Volume', body: 'Completed sales only, counted in cards and in Credits. Listings, bids, Quick Sell and cancelled offers never count.' },
      { id: 'spread', term: 'Spread', body: 'The gap between the best bid and the lowest ask. A wide spread usually means a thin market.' },
      { id: 'reserve', term: 'Reserve', body: 'A hidden minimum. The auction only sells if the winning bid reaches it.' },
      { id: 'proxy-bid', term: 'Proxy bid', body: 'You name your maximum. The market bids the smallest amount that keeps you in front, up to that maximum.' },
      { id: 'settlement', term: 'Settlement', body: 'The moment a sale completes: the card changes owner, Credits move, and the fee is taken once.' },
      { id: 'escrow', term: 'Escrow', body: 'Credits or a card held aside while an offer is open, so nothing can be spent or sold twice.' },
      { id: 'quick-sell', term: 'Quick Sell', body: 'An instant sale to the game itself at a deliberate discount. It is not a player trade and is never counted as market volume.' },
      { id: 'realm', term: 'Realm', body: 'Standard (traders on this device, offline) and Players (real players). Balances, histories and values are never shared between them.' },
      { id: 'liquidity', term: 'Liquidity', body: 'How easily this card changes hands near its Average Value. Higher means faster, tighter trades.' },
      { id: 'confidence', term: 'Confidence', body: 'How much recent sale data supports the Average Value. Low means the estimate leans on the baseline.' },
      { id: 'volatility', term: 'Volatility', body: 'How far the price tends to move day to day. Scarcer rarities move more.' }
    ],

    // ---- Credits from cards (Stage 3) ----------------------------------------------------------------------------
    // Quick Sell is the system's standing bid for a card: a fixed share of its Average Value, always below what
    // another trader would pay. It is not a trade: it never becomes volume, a last sale or part of Average Value.
    quickSell: {
      factor: 0.55,               // share of Average Value paid
      tierFactor: {},             // optional per-rarity override, by rarity id
      ceilingOverBaseline: 1.5,   // the value a quote starts from never exceeds this multiple of the baseline
      floorUnderBaseline: 0.4,    // ... nor falls under this share of it, so a thin or bruised market cannot zero a card
      minPrice: 1,
      quoteTtlMs: 45000,          // a shown quote stands this long; Refresh quote gets a new one
      undoMs: 10000,              // the session Undo window, only while it is still reversible
      receiptsKept: 40, receiptItemsKept: 25
    },
    // Bulk Sell: safe by default. The presets only ever start from cards that are not protected.
    bulkSell: {
      defaultKeep: 1,             // copies of each card kept
      defaultMaxTier: 3,          // up to and including Rare unless the player raises it
      maxPerSale: 500,            // instances in one commit
      previewRows: 60,            // rows drawn at a time in the preview
      presets: [
        { id: 'extras', label: 'Extra copies', note: 'Keeps one of every card and finish. Never touches favorites, locked cards, finishes or anything above Rare.', keep: 1, maxTier: 3, finishes: false },
        { id: 'commons', label: 'Basic and Common extras', note: 'Keeps two of each. The gentlest clean-up.', keep: 2, maxTier: 1, finishes: false },
        { id: 'duplicates-all', label: 'All extra copies', note: 'Keeps one of each card, any rarity. Finishes are still kept.', keep: 1, maxTier: 11, finishes: false }
      ]
    },

    // Provisional tuning table, mirrored in docs/market-beta/stage-3.md.
    tuning: [
      { key: 'fee.bps', value: 200, note: '2% of the sale price; rounded half up with a one Credit minimum.' },
      { key: 'quickSell.factor', value: 0.55, note: 'Quick Sell pays 55% of Average Value, rounded down, at least 1 Credit.' },
      { key: 'quickSell.quote', value: '45 s', note: 'A quote is good for 45 seconds, then refreshes. A changed total is shown before anything is sold.' },
      { key: 'packOpenReward', value: 0, note: 'Opening a pack pays nothing. Credits come from selling cards.' },
      { key: 'auction.presets', value: '6h / 24h / 3d', note: 'Safe presets for Simple mode. Custom 1 hour to 14 days is Advanced only.' },
      { key: 'auction.incrementPct', value: 5, note: 'Minimum raise of 5% or 1 Credit, whichever is larger.' },
      { key: 'auction.snipe', value: '5 min', note: 'A bid in the last five minutes extends the close by five.' },
      { key: 'rarityBase', value: 'see config', note: 'Credits baseline per rarity before per-GPU and finish factors.' }
    ]
  };
})(window.Cardable = window.Cardable || {});
