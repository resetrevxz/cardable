// The rules of the Global Market, as pure functions. No database, no clock, no network: the transaction layer feeds
// these plain data and gets plain answers, so the rules can be tested exhaustively and cannot drift from what the
// statements enforce. Numbers that come from the game's own data (baselines, finish and skin factors, the serial
// factor, the fee, Quick Sell) are read from the generated catalog; trading rules are constants here.
import { CATALOG } from './catalog.js';

const E = CATALOG.economy;
export const HOUR = 3600_000, DAY = 24 * HOUR;

export const RULES = {
  fee: { bps: E.fee.bps, minFee: E.fee.minFee },
  price: { min: 1, max: 100_000_000 },
  bundle: { max: 6 },
  limits: { activeListings: 40, openOrders: 12, orderQuantity: 10, pendingOffersPerListing: 20, pendingOffersPerAccount: 20, counterRounds: 6, titleLength: 60, noteLength: 280, messageLength: 140 },
  auction: {
    minDurationMs: HOUR, maxDurationMs: 14 * DAY, presetsMs: [12 * HOUR, 24 * HOUR, 48 * HOUR, 72 * HOUR], defaultMs: 24 * HOUR,
    incrementPct: 5, incrementMin: 1, snipeWindowMs: 5 * 60_000, snipeExtendMs: 5 * 60_000, snipeMaxExtensions: 6
  },
  fixed: { minDurationMs: HOUR, maxDurationMs: 30 * DAY, defaultMs: 7 * DAY },
  swap: { minDurationMs: HOUR, maxDurationMs: 30 * DAY, defaultMs: 5 * DAY, offerExpiryMs: 2 * DAY },
  order: { minDurationMs: HOUR, maxDurationMs: 30 * DAY, defaultMs: 3 * DAY },
  // Beta tuning of the system redemption (Quick Sell): per account per UTC day, and a circuit breaker for the whole realm.
  quickSell: { perAccountCardsPerDay: 40, perAccountCreditsPerDay: 4000, perRequestMax: 50, globalCreditsPerDay: 250_000, quoteTtlMs: 45_000 },
  history: { keepIdempotencyMs: 7 * DAY, keepNotificationsMs: 30 * DAY }
};

// The operator may tune the system redemption's limits with plain variables (QS_CARDS_PER_DAY, QS_CREDITS_PER_DAY,
// QS_REALM_CREDITS_PER_DAY) without a code change; anything else falls back to the beta defaults above.
export function quickSellLimits(env) {
  const pos = (v, d) => { const n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : d; }, q = RULES.quickSell;
  return { perAccountCardsPerDay: pos(env && env.QS_CARDS_PER_DAY, q.perAccountCardsPerDay), perAccountCreditsPerDay: pos(env && env.QS_CREDITS_PER_DAY, q.perAccountCreditsPerDay),
    globalCreditsPerDay: pos(env && env.QS_REALM_CREDITS_PER_DAY, q.globalCreditsPerDay), perRequestMax: q.perRequestMax, quoteTtlMs: q.quoteTtlMs };
}

export const roundHalfUp = (x) => Math.floor(x + 0.5);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function feeFor(price) {
  if (!(price > 0)) return 0;
  return Math.min(price, Math.max(RULES.fee.minFee, roundHalfUp(price * RULES.fee.bps / 10000)));
}
export const keyOf = (cardId, variantId, skinId) => [cardId, variantId || '', skinId || ''].join('|');
export const isCard = (id) => Object.prototype.hasOwnProperty.call(CATALOG.cards, id);
export const nameOf = (id) => CATALOG.names[id] || id;
export const rarityOf = (id) => CATALOG.cards[id] || null;
export const tierOf = (id) => (E.tier[id] == null ? 0 : E.tier[id]);

// ---- value -------------------------------------------------------------------------------------------------------------
export function serialFactor(serial) {
  const m = /-(\d{1,9})$/.exec(String(serial || ''));
  if (!m) return 1;
  const n = Number(m[1]), s = E.serial;
  let f = 1;
  if (n <= s.lowCounter) f += s.lowBonus * (1 - (n - 1) / s.lowCounter);
  if (n > 0 && (n % 100 === 0 || n === 1)) f += s.roundBonus;
  return clamp(f, s.min, s.max);
}
// The value of the card and finish and skin before anyone traded it (no serial factor).
export function baselineOf(cardId, variantId, skinId) {
  const base = E.base[cardId];
  if (base == null) return 1;
  const cls = variantId ? E.variantClass[variantId] : null, v = cls && E.variantClassFactor[cls] ? E.variantClassFactor[cls] : 1, k = skinId ? E.skinFactor : 1;
  return Math.max(1, roundHalfUp(base * v * k));
}
// Weighted, outlier-clamped mean of executed player trades, pulled toward the baseline while data is thin.
// obs: [[time, price], ...] oldest first.
export function fairInfo(obs, now, baseline) {
  const cv = E.valuation, out = { baseline, average: baseline, samples: 0, effective: 0, confidence: 'none', basis: 'baseline', lastSale: null, lastAt: null };
  if (!obs || !obs.length) return out;
  const half = cv.halfLifeDays * DAY, prices = obs.map((o) => o[1]).sort((a, b) => a - b), median = prices[Math.floor(prices.length / 2)];
  let sum = 0, wsum = 0, recent = 0;
  for (const o of obs) {
    const age = Math.max(0, now - o[0]), w = Math.pow(0.5, age / half);
    if (age <= 14 * DAY) recent++;
    sum += clamp(o[1], median * (1 - E.outlierBand), median * (1 + E.outlierBand)) * w; wsum += w;
  }
  out.average = Math.max(1, Math.round((baseline * cv.priorWeight + (sum / wsum) * wsum) / (cv.priorWeight + wsum)));
  out.samples = recent; out.effective = wsum; out.basis = 'sales';
  out.confidence = recent >= cv.minForHigh ? 'high' : recent >= cv.minForMedium ? 'medium' : recent > 0 ? 'low' : 'none';
  const last = obs[obs.length - 1];
  out.lastSale = last[1]; out.lastAt = last[0];
  return out;
}
// What the system pays for a card at once. A quote starts from the Average Value, kept inside a band around the
// card's own baseline so a thin or lopsided market cannot move it far; rounded down, never below the minimum.
export function quickSellQuote(instance, fair) {
  const q = E.quickSell, sf = serialFactor(instance.serial);
  const baselineExact = Math.max(1, Math.round(fair.baseline * sf)), average = Math.max(1, Math.round(fair.average * sf));
  const start = Math.min(Math.max(average, Math.ceil(baselineExact * q.floorUnderBaseline)), Math.floor(baselineExact * q.ceilingOverBaseline));
  const factor = q.tierFactor && q.tierFactor[rarityOf(instance.cardId)] != null ? q.tierFactor[rarityOf(instance.cardId)] : q.factor;
  return { quote: Math.max(q.minPrice, Math.floor(start * factor)), fair: average, baseline: baselineExact, basis: fair.basis, confidence: fair.confidence, samples: fair.samples, factor };
}

// ---- auctions ----------------------------------------------------------------------------------------------------------
export function incrementFor(price, step) {
  if (step) return step;
  return Math.max(RULES.auction.incrementMin, Math.round(price * RULES.auction.incrementPct / 100));
}
// Proxy bidding: the highest maximum leads, the earliest bidder wins a tie, and the price is one step above the runner-up
// (never above the leader's maximum, never below the start). Once the leader's maximum reaches the reserve the price shows
// at least the reserve: that is what it will sell for.
// auction: { start, reserve, step }, proxies: [{ id, max, seq }]
export function resolveAuction(auction, proxies) {
  const entries = proxies.slice().sort((a, b) => b.max - a.max || a.seq - b.seq);
  const lead = entries[0] || null, second = entries[1] || null;
  let price = auction.start;
  if (lead && second) price = Math.max(auction.start, Math.min(lead.max, second.max + incrementFor(second.max, auction.step)));
  if (lead && auction.reserve && price < auction.reserve && lead.max >= auction.reserve) price = auction.reserve;
  const reserveMet = !auction.reserve || (!!lead && lead.max >= auction.reserve);
  const minNext = entries.length ? price + incrementFor(price, auction.step) : auction.start;
  return { lead, second, price, bidders: entries.length, reserveMet, minNext };
}
// Validates and applies one proxy bid to a set of proxies. Returns { ok, proxies, view, before } or { ok:false, error, ... }.
export function applyBid(auction, proxies, bidder, max, seq) {
  const before = resolveAuction(auction, proxies), mine = proxies.find((p) => p.id === bidder) || null;
  if (!Number.isSafeInteger(max) || max <= 0) return { ok: false, error: 'invalid' };
  if (mine && max <= mine.max) return { ok: false, error: 'lower', minimum: mine.max + 1 };
  const leads = before.lead && before.lead.id === bidder;
  if ((!mine && max < before.minNext) || (mine && max < before.minNext && !leads)) return { ok: false, error: 'increment', minimum: before.minNext };
  const next = mine ? proxies.map((p) => (p.id === bidder ? { id: p.id, max, seq: p.seq } : p)) : proxies.concat([{ id: bidder, max, seq }]);
  return { ok: true, proxies: next, before, view: resolveAuction(auction, next) };
}
// The end of an auction: who pays what, or why nothing sold.
export function closeAuction(auction, proxies) {
  const view = resolveAuction(auction, proxies);
  if (!view.lead) return { sold: false, why: 'No bids' };
  if (auction.reserve && !view.reserveMet) return { sold: false, why: 'Reserve not met', view };
  return { sold: true, winner: view.lead.id, price: view.price, view };
}

// ---- swaps -------------------------------------------------------------------------------------------------------------
const RARITY_ORDER = Object.keys(E.tier).sort((a, b) => E.tier[a] - E.tier[b]);
// The seller's conditions for a swap listing, checked against what an offer actually puts forward. `wants` is data:
//   { cardIds?: [], minTier?: n, variantIds?: [], anyFinish?: bool, skinIds?: [], minItems?: n, minValuePct?: n, serialMax?: n }
// Every clause is evaluated; the answer lists the ones that failed in plain language.
export function checkWants(wants, items, valueOf, listingValue, credits) {
  const failures = [];
  if (!wants) return { ok: true, failures };
  const total = items.reduce((n, it) => n + valueOf(it), 0);
  if (wants.minItems && items.length < wants.minItems) failures.push('Needs at least ' + wants.minItems + ' card' + (wants.minItems === 1 ? '' : 's') + '.');
  if (Array.isArray(wants.cardIds) && wants.cardIds.length && !items.some((it) => wants.cardIds.includes(it.cardId))) failures.push('Needs one of the wanted cards.');
  if (wants.minTier != null && !items.some((it) => tierOf(it.cardId) >= wants.minTier)) failures.push('Needs a card of at least tier ' + wants.minTier + '.');
  if (Array.isArray(wants.variantIds) && wants.variantIds.length && !items.some((it) => wants.variantIds.includes(it.variantId))) failures.push('Needs a wanted finish.');
  if (Array.isArray(wants.skinIds) && wants.skinIds.length && !items.some((it) => wants.skinIds.includes(it.skinId))) failures.push('Needs a wanted card skin.');
  if (wants.serialMax != null && !items.some((it) => { const m = /-(\d+)$/.exec(it.serial || ''); return m && Number(m[1]) <= wants.serialMax; })) failures.push('Needs a serial number of ' + wants.serialMax + ' or lower.');
  if (wants.minValuePct != null) {
    const need = Math.ceil(listingValue * wants.minValuePct / 100);
    if (total + credits < need) failures.push('Needs at least ' + wants.minValuePct + '% of the listing\'s Average Value (' + need + ' Credits) in cards and Credits.');
  }
  return { ok: failures.length === 0, failures, total };
}
export function normalizeWants(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const w = {}, ids = (list, test) => (Array.isArray(list) ? Array.from(new Set(list.filter((x) => typeof x === 'string' && test(x)))).slice(0, 12) : []);
  const cards = ids(raw.cardIds, isCard); if (cards.length) w.cardIds = cards;
  const variants = ids(raw.variantIds, (x) => CATALOG.variants.includes(x)); if (variants.length) w.variantIds = variants;
  const skins = ids(raw.skinIds, (x) => CATALOG.skins.includes(x)); if (skins.length) w.skinIds = skins;
  const int = (v, lo, hi) => (Number.isSafeInteger(v) && v >= lo && v <= hi ? v : null);
  const tier = int(raw.minTier, 0, 11); if (tier != null) w.minTier = tier;
  const items = int(raw.minItems, 1, RULES.bundle.max); if (items != null) w.minItems = items;
  const pct = int(raw.minValuePct, 1, 300); if (pct != null) w.minValuePct = pct;
  const serial = int(raw.serialMax, 1, 999999); if (serial != null) w.serialMax = serial;
  return Object.keys(w).length ? w : null;
}
export const TIERS = RARITY_ORDER;
