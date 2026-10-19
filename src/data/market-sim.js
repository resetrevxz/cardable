/* Cardable Market — offline simulation tuning. DATA ONLY.
 * Everything the simulator decides with is a number in this file: speeds, bot personalities, supply and credit
 * rules, listing behaviour, persistence limits. Values marked provisional are the Stage 2 defaults, chosen from the
 * seeded experiments recorded in docs/market-beta/stage-2.md; Stage 3 tunes them against the real Credit flow. */
(function (C) {
  'use strict';
  C.data = C.data || {};
  var HOUR = 3600000, DAY = 24 * HOUR;

  C.data.marketSim = {
    schema: 1,
    storageKey: 'cardable.market.sim',

    // ---- time -------------------------------------------------------------------------------------------------
    // Simulation time is its own clock. It advances only while the game is actively running (visible, not
    // paused). One real second of active play equals `factor` simulated seconds. There is no catch-up.
    speeds: [
      { id: 'calm', label: 'Calm', factor: 20, note: 'One minute of play is twenty simulated minutes.' },
      { id: 'standard', label: 'Standard', factor: 60, note: 'One minute of play is one simulated hour.' },
      { id: 'brisk', label: 'Brisk', factor: 120, note: 'One minute of play is two simulated hours. A day takes twelve minutes.' },
      { id: 'fast', label: 'Fast', factor: 240, note: 'One minute of play is four simulated hours.' }
    ],
    defaultSpeed: 'brisk',
    maxGapMs: 30000,          // a longer gap between two active ticks is an interruption and counts as zero
    tickBudgetEvents: 250,    // events handled per slice before yielding
    persistEveryMs: 4000,     // dirty-state write cadence while running (player actions write at once)
    warmupDays: 5,            // real engine run at world creation so there is genuine history on day one

    world: {
      bots: 36,
      startDay: 0,
      codeAlphabet: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    },

    // ---- credits and supply: the only places new Credits or cards can appear --------------------------------
    economy: {
      feeBps: 200, feeMin: 1,
      // Bots are topped up toward a reserve once a simulated day, never past it, with a daily cap.
      allowance: { dailyCap: 60, reserveBase: 160, reserveScale: 0.35 },
      // Bots open packs: bounded per bot and across the world per day, announced in the feed.
      packs: { perBotPerDay: 0.2, maxPerBotPerDay: 2, worldPerDay: 4, cardsPerPack: 1 },
      // Minimum price floor (Credits) and the biggest single price move an observation may imply.
      minPrice: 1, outlierBand: 0.55
    },

    // ---- valuation from observed local trades -----------------------------------------------------------------
    valuation: {
      priorWeight: 6,          // pseudo-observations the baseline counts as
      window: 16,              // observations kept per card+finish+skin
      halfLifeDays: 6,         // older sales count for less
      minForMedium: 4, minForHigh: 12,
      botNoise: 0.07           // each bot's own opinion differs by this much, stable per bot and card
    },

    // ---- listings -----------------------------------------------------------------------------------------------
    listing: {
      auctionHours: [12, 24, 48, 72],
      auctionShare: 1.7,     // multiplies each personality's taste for auctions when it lists (capped at 85%)
      incrementPct: 5, incrementMin: 1,
      snipeWindowMin: 5, snipeExtendMin: 5, snipeMaxExtensions: 6,
      fixedDurationDays: [3, 10],
      maxBundle: 6, maxOpenPerBot: 6, maxOpenPerPlayer: 40,
      buyOrderDays: [2, 7], maxOrdersPerBot: 2,
      offerExpiryDays: 2, swapMinFrac: 0.85
    },

    // ---- bot personalities (all values per simulated time; see engine for how each is used) -----------------
    // wake: hours between decisions. buyMargin: discount to its private value it needs. markup: ask above fair.
    // holdDays: how long it sits on a card before selling. spend: share of free Credits one purchase may take.
    // auction: preference for timed auctions. snipe: chance it bids in the last tenth of an auction.
    // tier: [low, high] rarity tiers it prefers. trend: weight on recent price direction. keep: share of cards kept.
    personas: [
      { id: 'collector', label: 'Careful collector', blurb: 'Buys cards for a binder and rarely sells.', wake: [10, 30], buyMargin: 0.02, markup: 0.18, holdDays: [20, 60], spend: 0.35, auction: 0.35, snipe: 0.3, tier: [0, 11], trend: 0, keep: 0.7, wish: 14, allowance: 1.0, packs: 1.0 },
      { id: 'investor', label: 'Value investor', blurb: 'Buys under fair value and holds for the long run.', wake: [14, 40], buyMargin: 0.12, markup: 0.22, holdDays: [12, 40], spend: 0.4, auction: 0.2, snipe: 0.5, tier: [3, 11], trend: -0.1, keep: 0.1, wish: 8, allowance: 1.3, packs: 0.6 },
      { id: 'hunter', label: 'Deal hunter', blurb: 'Only moves on clear bargains, and bids late.', wake: [6, 18], buyMargin: 0.18, markup: 0.12, holdDays: [2, 12], spend: 0.3, auction: 0.5, snipe: 0.7, tier: [0, 8], trend: 0, keep: 0.05, wish: 6, allowance: 0.9, packs: 0.8 },
      { id: 'flipper', label: 'Quick flipper', blurb: 'Turns cards over fast on thin margins.', wake: [2, 8], buyMargin: 0.07, markup: 0.07, holdDays: [0.3, 3], spend: 0.5, auction: 0.15, snipe: 0.2, tier: [0, 7], trend: 0.1, keep: 0, wish: 3, allowance: 1.1, packs: 0.7 },
      { id: 'completionist', label: 'Completionist', blurb: 'Works through a set and pays up for the missing card.', wake: [8, 24], buyMargin: -0.05, markup: 0.2, holdDays: [30, 90], spend: 0.45, auction: 0.3, snipe: 0.4, tier: [0, 11], trend: 0, keep: 0.85, wish: 22, allowance: 1.0, packs: 1.2 },
      { id: 'specialist', label: 'Specialist', blurb: 'Knows one brand or generation and trades only in it.', wake: [8, 22], buyMargin: 0.05, markup: 0.15, holdDays: [6, 25], spend: 0.35, auction: 0.35, snipe: 0.4, tier: [0, 11], trend: 0, keep: 0.4, wish: 12, allowance: 1.0, packs: 0.9 },
      { id: 'cautious', label: 'Cautious buyer', blurb: 'Prefers steady, liquid cards and small positions.', wake: [12, 36], buyMargin: 0.1, markup: 0.1, holdDays: [4, 20], spend: 0.15, auction: 0.1, snipe: 0.2, tier: [0, 4], trend: -0.05, keep: 0.2, wish: 6, allowance: 0.8, packs: 0.8 },
      { id: 'risk', label: 'Risk seeker', blurb: 'Chases scarce cards and accepts wide spreads.', wake: [6, 20], buyMargin: -0.02, markup: 0.3, holdDays: [3, 30], spend: 0.55, auction: 0.5, snipe: 0.5, tier: [5, 11], trend: 0.2, keep: 0.1, wish: 6, allowance: 1.2, packs: 1.0 },
      { id: 'maker', label: 'Market maker', blurb: 'Quotes a price to buy and a price to sell on everyday cards, and lives on the gap.', wake: [3, 10], buyMargin: 0.1, markup: 0.1, holdDays: [0.2, 2], spend: 0.25, auction: 0.04, snipe: 0, tier: [0, 6], trend: 0, keep: 0, wish: 2, allowance: 1.2, packs: 0.5, quotes: true },
      { id: 'hype', label: 'Hype follower', blurb: 'Buys what has just moved and sells into strength.', wake: [3, 12], buyMargin: 0.0, markup: 0.1, holdDays: [0.5, 6], spend: 0.4, auction: 0.3, snipe: 0.3, tier: [0, 9], trend: 0.55, keep: 0, wish: 4, allowance: 1.0, packs: 0.9 }
    ],

    // ---- news: demand shifts the player can read and act on ----------------------------------------------------------------
    // A piece of news changes what the bots are willing to pay (and ask) for the cards it names. The price history, which
    // is where Average Value comes from, only follows after trades happen, so the player who reads the news can be early.
    // Hype lifts demand after a short lead; a dip lowers it; both fade back. How strongly each personality reacts is below.
    events: {
      gapHours: [3, 6],              // between one piece of news and the next
      maxActive: 3,
      afterHours: 8,                  // how long the effect takes to fade once the news is over
      rampHours: 2,                   // how long it takes to reach full strength
      kinds: [
        { id: 'hype', weight: 5, mag: [0.25, 0.5], leadHours: [1.5, 4], hours: [9, 20] },
        { id: 'dip', weight: 3, mag: [-0.34, -0.16], leadHours: [0.3, 1], hours: [10, 24] }
      ],
      scopes: [ { id: 'brand', weight: 4 }, { id: 'generation', weight: 3 }, { id: 'tier', weight: 2 }, { id: 'card', weight: 2 } ],
      minCards: 4,
      react: { collector: 0.5, investor: 0.4, hunter: 0.6, flipper: 1.0, completionist: 0.5, specialist: 0.9, cautious: 0.3, risk: 1.2, maker: 0.8, hype: 1.5 },
      askFollow: 0.6                  // share of the shift that sellers put into their own asking prices
    },

    // ---- fire sales: a seller who needs Credits now ----------------------------------------------------------------------
    // Rare and capped per simulated day, so a bargain is something you spot, not something that is always there.
    fireSale: { chance: 0.34, perDay: 16, discount: [0.18, 0.4] },

    // ---- the coach: how the Market tells a beginner what is worth doing --------------------------------------------------
    // Everything it says is computed from the world's own listings, orders, news and trades. Thresholds live here.
    coach: {
      minGain: 3,                     // Credits a suggestion must be worth after the fee
      minGainPct: 0.06,               // and this share of what it costs
      dealBelowFair: 0.1,             // a listing this far under Average Value is a deal
      snipeHours: 8,                  // an auction closing within this time can be sniped
      snipeBidUp: 0.1,                // how far above the current bid the last bid is expected to land
      resellDiscount: 0.04,           // list a little under fair to sell quickly
      wantedPremium: [0.08, 0.22],    // asking above fair when traders are looking for the card
      maxMoves: 6,
      maxOrders: 4, trapBelowFair: 0.16, trapMinTrades: 3, trapMaxShare: 0.3,
      levels: [
        { id: 0, name: 'Newcomer', at: 0 }, { id: 1, name: 'Trader', at: 1 }, { id: 2, name: 'Flipper', at: 40 },
        { id: 3, name: 'Dealer', at: 140 }, { id: 4, name: 'Broker', at: 400 }, { id: 5, name: 'Tycoon', at: 1000 }
      ],
      historyEveryHours: 3, historyKeep: 120
    },

    // Stable bot names reuse the Market's two-word aliases.
    nameSeedTag: 'sim-bots',

    // ---- trader usernames (1.13.0) ----------------------------------------------------------------------------------
    // Each trader gets a handle from a stable hash of the world seed and its id (no random draws, so the world's own
    // sequence is unchanged). Some are hand-picked presets, the rest are built from two parts in one of a few styles.
    names: {
      version: 2,
      presetShare: 0.35,
      presets: ['GPUGoblin', 'FrameRateFran', 'ThermalPaste', 'OverclockOlly', 'VRAMVandal', 'SiliconSage', 'ShaderShark', 'FanCurveFinn', 'BinnedBen', 'CacheMoney',
        'HeatsinkHank', 'LowLatencyLu', 'TexelTrader', 'CoilWhineCal', 'MegahertzMo', 'PixelPilgrim', 'DieShrinkDee', 'BusWidthBea', 'TensorTess', 'RaytraceRae',
        'BoostClockBo', 'SolderSam', 'WaferWendy', 'NanometerNico', 'BlowerFanBea', 'KilowattKai', 'MintCondition', 'FoilHunter', 'GradedGrace', 'SlabbedSid'],
      first: ['Neon', 'Turbo', 'Pixel', 'Quantum', 'Velvet', 'Cobalt', 'Hyper', 'Lunar', 'Static', 'Crimson', 'Silent', 'Rapid', 'Frost', 'Ember', 'Chrome', 'Nova', 'Atomic',
        'Glitch', 'Retro', 'Solar', 'Midnight', 'Copper', 'Arctic', 'Volt', 'Prism', 'Shadow', 'Golden', 'Binary', 'Echo', 'Lucky'],
      second: ['Falcon', 'Fox', 'Koi', 'Raptor', 'Otter', 'Lynx', 'Badger', 'Heron', 'Mantis', 'Panda', 'Wolf', 'Viper', 'Orca', 'Hawk', 'Moth', 'Yak', 'Gecko', 'Raven',
        'Trader', 'Dealer', 'Broker', 'Collector', 'Hoarder', 'Flipper', 'Baron', 'Smith', 'Rider', 'Pilot', 'Ghost', 'Wizard'],
      // style weights: CamelCase, CamelCase with a number, lower_snake, CamelCase with an x prefix
      styles: [['camel', 0.42], ['camelNum', 0.3], ['snake', 0.18], ['tag', 0.1]]
    },

    // ---- strategies shared by every personality (1.13.0) ------------------------------------------------------------
    // scan: how many listings a trader looks at when it wakes; smart: how many of those are its best leads (the cheapest
    // against what it thinks the card is worth, auctions closing soon, cards it wants) rather than a random sample.
    // undercut: whether it prices just under the cheapest competing copy when it lists or reprices.
    // bargain: a fixed-price listing this far under Average Value sends one or two bargain hunters to look within the hour.
    strategy: {
      scan: { collector: 12, investor: 18, hunter: 22, flipper: 20, completionist: 16, specialist: 16, cautious: 12, risk: 16, maker: 18, hype: 16 },
      smart: { collector: 5, investor: 10, hunter: 14, flipper: 12, completionist: 8, specialist: 8, cautious: 5, risk: 8, maker: 10, hype: 8 },
      undercut: { flipper: true, hunter: true, maker: true, hype: true, cautious: true, risk: true },
      crowdedBidders: 3, crowdedShade: 0.04,
      bargain: { belowFair: 0.15, scouts: 2, delayMin: [8, 50], personas: ['hunter', 'flipper', 'investor', 'maker'] },
      demandWishers: 3
    },

    // ---- the notch: what counts as a big sale and a rare find ----
    notch: { salesHours: 12, salesMinTrades: 8, rareTier: 7, rareHours: 3 },

    // ---- persistence and presentation limits --------------------------------------------------------------------
    keep: { trades: 700, feed: 120, receipts: 400, days: 120, notices: 80 },
    maxStateBytes: 1800000,
    help: {
      intro: 'Traders on this device buy and sell cards with you. It works offline and is separate from Players.',
      pause: 'Time runs only while Cardable is open and visible. It does not catch up after you close it.',
      reset: 'Starts a fresh set of traders and listings. Your cards and Credits stay, except cards you have listed, which come back.'
    }
  };
  C.data.marketSim.HOUR = HOUR; C.data.marketSim.DAY = DAY;
})(window.Cardable = window.Cardable || {});
