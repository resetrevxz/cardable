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
      { id: 'fast', label: 'Fast', factor: 240, note: 'One minute of play is four simulated hours.' }
    ],
    defaultSpeed: 'standard',
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
      { id: 'hype', label: 'Hype follower', blurb: 'Buys what has just moved and sells into strength.', wake: [3, 12], buyMargin: 0.0, markup: 0.1, holdDays: [0.5, 6], spend: 0.4, auction: 0.3, snipe: 0.3, tier: [0, 9], trend: 0.55, keep: 0, wish: 4, allowance: 1.0, packs: 0.9 }
    ],

    // Stable bot names reuse the Market's two-word aliases.
    nameSeedTag: 'sim-bots',

    // ---- persistence and presentation limits --------------------------------------------------------------------
    keep: { trades: 700, feed: 120, receipts: 400, days: 120, notices: 80 },
    maxStateBytes: 1800000,
    help: {
      intro: 'Simulation is a local, offline market. The traders are software bots on this device, not people. It works with no internet, and it never touches Global Market or your account.',
      pause: 'Simulation time runs only while Cardable is open and visible. When you close the game, hide the window or pause it, the market stops exactly where it is. It does not catch up afterwards.',
      reset: 'Resetting Simulation starts a fresh set of bots and listings. Your cards and Credits stay as they are, except cards you currently have listed, which come back to you.'
    }
  };
  C.data.marketSim.HOUR = HOUR; C.data.marketSim.DAY = DAY;
})(window.Cardable = window.Cardable || {});
