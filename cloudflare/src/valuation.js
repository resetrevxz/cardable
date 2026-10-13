// Server-side card values: Average Value from executed player trades (price observations), over the card's baseline
// from the catalog. Only player Credit sales of one card ever write an observation; Quick Sell and swaps never do.
// A page of listings costs a handful of queries however many cards it shows (D1 limits queries per invocation).
import { DAY, baselineOf, fairInfo, keyOf, serialFactor } from './economy.js';

const CHUNK = 80;
const chunks = (list) => { const out = []; for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK)); return out; };
const marks = (n) => new Array(n).fill('?').join(',');

function changeOver(obs, now, windowMs) {
  if (!obs || obs.length < 2) return null;
  const last = obs[obs.length - 1], start = now - windowMs;
  let ref = null;
  for (let i = obs.length - 2; i >= 0; i--) if (obs[i][0] <= start) { ref = obs[i]; break; }
  if (!ref || start - ref[0] > windowMs * 2 || last[0] <= start) return null;
  return (last[1] - ref[1]) / ref[1];
}

// specs: [{ cardId, variantId, skinId, serial }]. Returns valuations aligned with the specs.
export async function valuations(env, specs, now) {
  const keys = Array.from(new Set(specs.map((s) => keyOf(s.cardId, s.variantId, s.skinId))));
  const cards = Array.from(new Set(specs.map((s) => s.cardId)));
  const obs = new Map(), vol = new Map(), asks = new Map(), bids = [];
  const queries = [];
  for (const part of chunks(keys)) {
    queries.push(env.DB.prepare('SELECT card_key, at, price FROM (SELECT card_key, at, price, id, ROW_NUMBER() OVER (PARTITION BY card_key ORDER BY id DESC) AS rn FROM price_observations WHERE card_key IN (' + marks(part.length) + ')) WHERE rn <= 16 ORDER BY card_key, id').bind(...part));
    queries.push(env.DB.prepare('SELECT card_key, SUM(CASE WHEN at > ? THEN 1 ELSE 0 END) AS v24, SUM(CASE WHEN at > ? THEN price ELSE 0 END) AS c24, COUNT(*) AS v7, SUM(price) AS c7 FROM price_observations WHERE card_key IN (' + marks(part.length) + ') AND at > ? GROUP BY card_key').bind(now - DAY, now - DAY, ...part, now - 7 * DAY));
  }
  for (const part of chunks(cards)) {
    queries.push(env.DB.prepare("SELECT card_id, variant_id, skin_id, MIN(price) AS ask FROM listings WHERE status = 'active' AND kind = 'fixed' AND item_count = 1 AND ends_at > ? AND card_id IN (" + marks(part.length) + ') GROUP BY card_id, variant_id, skin_id').bind(now, ...part));
    queries.push(env.DB.prepare("SELECT card_id, variant_id, any_finish, skin_id, any_skin, max_price FROM orders WHERE status = 'open' AND expires_at > ? AND card_id IN (" + marks(part.length) + ') ORDER BY max_price DESC LIMIT 1500').bind(now, ...part));
  }
  const results = queries.length ? await env.DB.batch(queries) : [];
  let r = 0;
  for (let i = 0; i < chunks(keys).length; i++) {
    for (const row of results[r++].results) { if (!obs.has(row.card_key)) obs.set(row.card_key, []); obs.get(row.card_key).push([row.at, row.price]); }
    for (const row of results[r++].results) vol.set(row.card_key, row);
  }
  for (let i = 0; i < chunks(cards).length; i++) {
    for (const row of results[r++].results) asks.set(keyOf(row.card_id, row.variant_id, row.skin_id), row.ask);
    for (const row of results[r++].results) bids.push(row);
  }
  return specs.map((s) => {
    const key = keyOf(s.cardId, s.variantId, s.skinId), baseline = baselineOf(s.cardId, s.variantId, s.skinId), list = obs.get(key) || [];
    const f = fairInfo(list, now, baseline), sf = s.serial ? serialFactor(s.serial) : 1, v = vol.get(key);
    const bidRow = bids.find((b) => b.card_id === s.cardId && (b.any_finish || (b.variant_id || null) === (s.variantId || null)) && (b.any_skin || (b.skin_id || null) === (s.skinId || null)));
    return {
      key, baseline: Math.max(1, Math.round(baseline * sf)), baseAverage: baseline, average: Math.max(1, Math.round(f.average * sf)), samples: f.samples,
      confidence: f.confidence, basis: f.basis, lastSale: f.lastSale, lastAt: f.lastAt, fair: f.average,
      bestBid: bidRow ? bidRow.max_price : null, lowestAsk: asks.has(key) ? asks.get(key) : null,
      volume24h: v ? v.v24 : 0, volume7d: v ? v.v7 : 0, credits24h: v ? v.c24 : 0, credits7d: v ? v.c7 : 0,
      change24h: changeOver(list, now, DAY), change7d: changeOver(list, now, 7 * DAY), serialFactor: sf, source: 'players'
    };
  });
}
export async function valuationOf(env, spec, now) { return (await valuations(env, [spec], now))[0]; }

// The un-serial-adjusted fair value used by the system redemption: baseline and Average Value of the exact card.
export async function fairOf(env, specs, now) {
  const out = await valuations(env, specs, now);
  return out.map((v) => ({ baseline: v.baseAverage, average: v.fair, basis: v.basis, confidence: v.confidence, samples: v.samples }));
}
