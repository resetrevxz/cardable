// Market analytics for the Global Market, derived ONLY from completed player-to-player Credit sales of one card
// (`price_observations`, written in the same transaction as the trade). A Quick Sell, a swap, a bundle, an offer, a
// cancelled order, a fixture or an upload never reaches this table, so none of them can be in a total or on a chart.
//
// Everything numeric here is a pure function of plain data (analyzeCard, analyzeGroup) so the formulas can be tested
// against hand-computed expectations. The SQL wrappers below only fetch and cache. Formulas are explained to the
// player in docs/market-beta/stage-6.md and in the card analytics panel ("How these numbers are made").
import { CATALOG } from './catalog.js';
import { DAY, HOUR, baselineOf, clamp, feeFor, keyOf, metaOf, nameOf, rarityOf, tierOf } from './economy.js';

const E = CATALOG.economy;
const MIN_FOR = E.valuation;                    // priorWeight, window, halfLifeDays, minForMedium, minForHigh
export const WINDOWS = {
  '24h': { span: DAY, bucket: HOUR }, '7d': { span: 7 * DAY, bucket: 6 * HOUR }, '30d': { span: 30 * DAY, bucket: DAY },
  '90d': { span: 90 * DAY, bucket: DAY }, all: { span: Infinity, bucket: DAY }
};

// ---- small statistics --------------------------------------------------------------------------------------------
export function weightedQuantile(values, weights, q) {
  if (!values.length) return null;
  const idx = values.map((v, i) => i).sort((a, b) => values[a] - values[b] || a - b);
  const total = weights.reduce((n, w) => n + w, 0);
  let acc = 0;
  for (const i of idx) { acc += weights[i]; if (acc >= q * total - 1e-9) return values[i]; }
  return values[idx[idx.length - 1]];
}
export const median = (values) => { if (!values.length) return null; const a = values.slice().sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
function stdev(values) {
  if (values.length < 2) return null;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1));
}
const tierSpread = (tier) => clamp(E.spread.base + E.spread.perTier * tier, 0, E.spread.cap);
const tierVolatility = (tier) => clamp(E.volatility.base + E.volatility.perTier * tier, 0, E.volatility.cap);

// The change of the last price over a period: against the last sale at or before the start of it. It is withheld
// (null) when there is no such sale or it is more than a period older than the start, so a stale reference is never
// presented as a change "over 24 hours".
export function changeOver(obs, now, spanMs) {
  if (!obs.length) return null;
  const last = obs[obs.length - 1];
  if (!isFinite(spanMs)) {
    const first = obs[0];
    return obs.length < 2 ? null : { abs: last[1] - first[1], pct: (last[1] - first[1]) / first[1], from: { price: first[1], at: first[0] }, to: { price: last[1], at: last[0] } };
  }
  const start = now - spanMs;
  let ref = null;
  for (let i = obs.length - 2; i >= 0; i--) if (obs[i][0] <= start) { ref = obs[i]; break; }
  if (!ref || start - ref[0] > spanMs * 2 || last[0] <= start) return null;
  return { abs: last[1] - ref[1], pct: (last[1] - ref[1]) / ref[1], from: { price: ref[1], at: ref[0] }, to: { price: last[1], at: last[0] } };
}

// ---- one exact card (card, finish, skin) -------------------------------------------------------------------------
// input: { obs: [[at, price]] oldest first (newest 200), now, baseline, tier,
//          vol: { h24:{units,credits}, d7:{units,credits}, d30:{units,credits}, prev7:{units}, all:{units,credits}, low30, high30 },
//          asks: [prices ascending], bids: [prices descending], supply }
export function analyzeCard(input) {
  const { obs, now, baseline, tier } = input, vol = input.vol || {}, asks = input.asks || [], bids = input.bids || [];
  const n30 = obs.filter((o) => o[0] > now - 30 * DAY).length;
  // Two mechanics: a card that trades often is judged on recent trades (short memory, mean); a scarce one on a long
  // memory and the median, which one odd sale cannot move.
  const mechanic = n30 >= 12 ? 'frequent' : 'scarce';
  const horizon = mechanic === 'frequent' ? 14 * DAY : 90 * DAY, half = mechanic === 'frequent' ? 3 * DAY : 14 * DAY;
  const win = obs.filter((o) => o[0] > now - horizon).slice(-100);
  const prices = win.map((o) => o[1]), med = median(prices);
  const capped = prices.map((p) => clamp(p, med * (1 - E.outlierBand), med * (1 + E.outlierBand)));
  const w = win.map((o) => Math.pow(0.5, Math.max(0, now - o[0]) / half)), wsum = w.reduce((a, b) => a + b, 0);
  const weightedMean = win.length ? capped.reduce((n, p, i) => n + p * w[i], 0) / wsum : null;
  const weightedMedian = win.length ? weightedQuantile(capped, w, 0.5) : null;
  const averageValue = win.length ? Math.max(1, Math.round(mechanic === 'frequent' ? weightedMean : weightedMedian)) : null;
  const prior = MIN_FOR.priorWeight;
  const fairValue = win.length ? Math.max(1, Math.round((baseline * prior + (averageValue) * wsum) / (prior + wsum))) : baseline;
  const recent14 = obs.filter((o) => o[0] > now - 14 * DAY).length;
  const confidence = recent14 >= MIN_FOR.minForHigh ? 'high' : recent14 >= MIN_FOR.minForMedium ? 'medium' : recent14 > 0 ? 'low' : 'none';
  const last = obs.length ? { price: obs[obs.length - 1][1], at: obs[obs.length - 1][0] } : null;

  const bestBid = bids.length ? bids[0] : null, lowestAsk = asks.length ? asks[0] : null;
  const spreadReal = bestBid != null && lowestAsk != null && lowestAsk >= bestBid;
  const spread = spreadReal ? { abs: lowestAsk - bestBid, pct: (lowestAsk - bestBid) / Math.max(1, fairValue), real: true } : { abs: null, pct: tierSpread(tier), real: false };

  const units7 = (vol.d7 && vol.d7.units) || 0;
  const rets = [];
  for (let i = 1; i < win.length; i++) if (win[i - 1][1] > 0) rets.push(Math.log(win[i][1] / win[i - 1][1]));
  const volatility = win.length >= 4 ? stdev(rets) : null;
  const liquidity = (obs.length || asks.length) ? clamp(Math.min(1, units7 / 8) * 0.6 + (spreadReal ? Math.max(0, 1 - spread.pct / 0.3) * 0.4 : 0.1), 0, 1) : null;

  // demand: open buy orders against open listings, bounded to a few percent of influence
  const demandPressure = (bids.length - asks.length) / (bids.length + asks.length + 2);

  // time to sell: inferable only from at least three sales in 30 days; the wait is the usual gap between sales,
  // multiplied by how many cheaper listings are ahead in the queue
  const sales30 = obs.filter((o) => o[0] > now - 30 * DAY);
  const gaps = [];
  for (let i = 1; i < sales30.length; i++) gaps.push(sales30[i][0] - sales30[i - 1][0]);
  let tts = null;

  // target ranges from execution quantiles; with fewer than four sales from the baseline and the tier's own volatility
  let q15, q40, q60, q85, basis;
  if (win.length >= 4) {
    q15 = weightedQuantile(capped, w, 0.15); q40 = weightedQuantile(capped, w, 0.40); q60 = weightedQuantile(capped, w, 0.60); q85 = weightedQuantile(capped, w, 0.85);
    basis = 'executions';
  } else {
    const band = clamp(tierVolatility(tier) * 2, 0.04, 0.3);
    q15 = fairValue * (1 - band); q40 = fairValue * (1 - band / 3); q60 = fairValue * (1 + band / 3); q85 = fairValue * (1 + band);
    basis = 'baseline';
  }
  const s = spread.pct, pressure = 1 + 0.03 * demandPressure;
  const mkTarget = (hf) => {
    const buyHigh = Math.max(1, Math.floor(q40 * (1 - s / 2) * pressure)), buyLow = Math.max(1, Math.min(buyHigh, Math.floor(q15 * (1 - s / 2))));
    const sellLow = Math.max(1, Math.ceil(q60 * (1 + s / 2) * pressure * hf)), sellHigh = Math.max(sellLow, Math.ceil(q85 * (1 + s / 2)));
    return { buy: { low: buyLow, high: buyHigh }, sell: { low: sellLow, high: sellHigh } };
  };
  let target = mkTarget(1), hf = 1;
  if (sales30.length >= 3) {
    const sorted = gaps.slice().sort((a, b) => a - b), pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    const queue = asks.filter((a) => a <= target.sell.low).length;
    const mult = 1 + queue, hours = (ms) => Math.max(1, Math.round(ms * mult / HOUR));
    tts = { medianHours: hours(median(gaps)), lowHours: hours(pick(0.25)), highHours: hours(pick(0.75)), basis: sales30.length + ' sales in 30 days, ' + queue + ' cheaper listing' + (queue === 1 ? '' : 's') + ' ahead' };
    hf = clamp(1 - 0.02 * Math.log2(Math.max(tts.medianHours, 6) / 24), 0.94, 1.04);
    target = mkTarget(hf);
  }
  const ask = target.sell.low, fee = feeFor(ask);
  return {
    mechanic, basis, confidence, fairValue, averageValue, baseline,
    observed: win.length ? { units: win.length, vwap: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length), median: med, weightedMedian: Math.round(weightedMedian), weightedMean: Math.round(weightedMean), windowDays: horizon / DAY } : null,
    last, range30: vol.low30 != null ? { low: vol.low30, high: vol.high30 } : null,
    change: { h24: changeOver(obs, now, DAY), d7: changeOver(obs, now, 7 * DAY), d30: changeOver(obs, now, 30 * DAY), d90: changeOver(obs, now, 90 * DAY), all: changeOver(obs, now, Infinity) },
    volume: { h24: vol.h24 || { units: 0, credits: 0 }, d7: vol.d7 || { units: 0, credits: 0 }, d30: vol.d30 || { units: 0, credits: 0 }, all: vol.all || { units: 0, credits: 0 } },
    bestBid, lowestAsk, spread, depth: { asks: depthOf(asks), bids: depthOf(bids) }, supply: input.supply || 0,
    turnover7d: units7 / Math.max(1, (input.supply || 0) + units7), volatility, liquidity, demandPressure,
    target, suggestedAsk: ask, expectedProceeds: ask - fee, expectedFee: fee, timeToSell: tts,
    inputs: { sales30: sales30.length, halfLifeDays: half / DAY, outlierBand: E.outlierBand, priorWeight: prior, spread: s, demandPressure, horizonFactor: hf }
  };
}
function depthOf(prices) {
  const out = [];
  for (const p of prices) { const last = out[out.length - 1]; if (last && last.price === p) last.count++; else out.push({ price: p, count: 1 }); }
  return out.slice(0, 5);
}

// ---- a group of cards (index, rarity, brand, generation) or one card, as a price series ---------------------------------
// rows: [{ at, card_key, price }] oldest first; for a card scope the series is in Credits, for a group in index points
// (price against the card's own baseline, as 100), so cards of different value can share one line.
export function buildCandles(rows, windowId, now, mode) {
  const w = WINDOWS[windowId] || WINDOWS['7d'];
  const start = isFinite(w.span) ? now - w.span : -Infinity, buckets = new Map();
  for (const r of rows) {
    if (r.at < start) continue;
    const [c, v, k] = r.card_key.split('|');
    const value = mode === 'price' ? r.price : r.price / Math.max(1, baselineOf(c, v || null, k || null)) * 100;
    const b = Math.floor(r.at / w.bucket), row = buckets.get(b);
    if (!row) buckets.set(b, { at: b * w.bucket + w.bucket / 2, open: value, high: value, low: value, close: value, volume: 1, credits: r.price });
    else { row.high = Math.max(row.high, value); row.low = Math.min(row.low, value); row.close = value; row.volume++; row.credits += r.price; }
  }
  return Array.from(buckets.keys()).sort((a, b) => a - b).map((b) => {
    const c = buckets.get(b);
    return mode === 'price' ? c : Object.assign(c, { open: round1(c.open), high: round1(c.high), low: round1(c.low), close: round1(c.close) });
  });
}
const round1 = (x) => Math.round(x * 10) / 10;
export function candleChange(candles, now, spanMs) {
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1], start = now - spanMs;
  let ref = null;
  for (let i = candles.length - 2; i >= 0; i--) if (candles[i].at <= start) { ref = candles[i]; break; }
  if (!ref || last.at <= start || !ref.close) return null;
  return (last.close - ref.close) / ref.close;
}

// Per-card figures from the last two weeks of sales: the leaders' tables, the movers and the discovery lists.
// rows: [{ at, card_id, card_key, price }] oldest first.
export function perCard(rows, now) {
  const by = new Map();
  for (const r of rows) { if (!by.has(r.card_id)) by.set(r.card_id, []); by.get(r.card_id).push(r); }
  const out = [];
  for (const [cardId, list] of by) {
    const obs = list.map((r) => [r.at, r.price]);
    const u7 = list.filter((r) => r.at > now - 7 * DAY), prev = list.filter((r) => r.at <= now - 7 * DAY && r.at > now - 14 * DAY);
    const credits7 = u7.reduce((n, r) => n + r.price, 0);
    const keys = new Set(list.map((r) => r.card_key));
    const ratio = list.map((r) => r.price / Math.max(1, baselineOf(...r.card_key.split('|').map((x, i) => (i === 0 ? x : x || null)))));
    out.push({
      cardId, name: nameOf(cardId), rarity: rarityOf(cardId), tier: tierOf(cardId), meta: metaOf(cardId), keys: keys.size,
      units7: u7.length, credits7, prev7Units: prev.length, lastPrice: obs[obs.length - 1][1], lastAt: obs[obs.length - 1][0],
      change7: changeOver(obs, now, 7 * DAY), growth: prev.length ? (u7.length - prev.length) / prev.length : (u7.length ? null : 0),
      vsBaseline: ratio.length ? ratio[ratio.length - 1] : null, samples14: list.length
    });
  }
  return out;
}
export const cardKey = keyOf;
