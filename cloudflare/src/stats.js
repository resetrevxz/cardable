// Analytics read endpoints: fetch from D1 (index-supported queries, bounded rows, exact aggregates) and cache.
// The caches hold only public, account-independent numbers, so they are shared by every player. Caching never changes a
// figure: totals come from SQL aggregates over the whole window, only the series are bounded (and say so).
import { ApiError } from './util.js';
import { CATALOG } from './catalog.js';
import { DAY, baselineOf, isCard, keyOf, metaOf, nameOf, rarityOf, tierOf } from './economy.js';
import { WINDOWS, analyzeCard, buildCandles, candleChange, perCard, windowOf } from './analytics.js';

const SERIES_CAP = 20000;
const memory = new Map();
// How long an answer is shared, by window. The long windows scan every sale in their span (their totals are exact), so
// they are computed rarely; the short ones are cheap and are kept fresh.
const TTL = { '24h': 30, '7d': 45, '30d': 180, '90d': 600, all: 600 };
const bucket = (now, ttl) => Math.floor(now / (ttl * 1000));

// Every query of an analytics answer goes through a meter, and the answer reports it: statements and rows read.
function meter() {
  const m = { queries: 0, rowsRead: 0 };
  m.all = async (stmt) => { const r = await stmt.all(); m.queries++; m.rowsRead += (r.meta && r.meta.rows_read) || 0; return r; };
  m.first = async (stmt) => { const r = await stmt.all(); m.queries++; m.rowsRead += (r.meta && r.meta.rows_read) || 0; return r.results[0] || null; };
  return m;
}

// Cache API (per data center) with an in-isolate fallback. Off in the test environment unless asked for, so the
// time-travelling tests always read the truth.
async function cached(env, name, ttlSec, compute) {
  const on = env.ANALYTICS_CACHE === 'on' || env.ENVIRONMENT === 'beta';
  if (!on) { const v = await compute(); return Object.assign({}, v, { cache: 'off' }); }
  const url = 'https://analytics.cardable.invalid/' + encodeURIComponent(name);
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      const hit = await caches.default.match(url);
      if (hit) return Object.assign(await hit.json(), { cache: 'hit' });
      const v = await compute();
      await caches.default.put(url, new Response(JSON.stringify(v), { headers: { 'cache-control': 'public, max-age=' + ttlSec, 'content-type': 'application/json' } }));
      return Object.assign({}, v, { cache: 'miss' });
    }
  } catch (_) { /* fall through to memory */ }
  const m = memory.get(name);
  if (m && Date.now() - m.at < ttlSec * 1000) return Object.assign({}, m.v, { cache: 'hit' });
  const v = await compute();
  memory.set(name, { at: Date.now(), v });
  if (memory.size > 200) memory.delete(memory.keys().next().value);
  return Object.assign({}, v, { cache: 'miss' });
}

async function cardInputs(env, spec, now, m) {
  const key = keyOf(spec.cardId, spec.variantId, spec.skinId);
  const rows = (await m.all(env.DB.prepare('SELECT at, price FROM price_observations WHERE card_key = ? ORDER BY at DESC LIMIT 200').bind(key))).results;
  const obs = rows.reverse().map((r) => [r.at, r.price]);
  const agg = await m.first(env.DB.prepare('SELECT ' +
    'SUM(CASE WHEN at > ?1 THEN 1 ELSE 0 END) AS u24, SUM(CASE WHEN at > ?1 THEN price ELSE 0 END) AS c24, ' +
    'SUM(CASE WHEN at > ?2 THEN 1 ELSE 0 END) AS u7, SUM(CASE WHEN at > ?2 THEN price ELSE 0 END) AS c7, ' +
    'SUM(CASE WHEN at > ?3 THEN 1 ELSE 0 END) AS u30, SUM(CASE WHEN at > ?3 THEN price ELSE 0 END) AS c30, ' +
    'SUM(CASE WHEN at <= ?2 AND at > ?4 THEN 1 ELSE 0 END) AS p7, ' +
    'MIN(CASE WHEN at > ?3 THEN price END) AS low30, MAX(CASE WHEN at > ?3 THEN price END) AS high30, COUNT(*) AS uall, COALESCE(SUM(price), 0) AS call ' +
    'FROM price_observations WHERE card_key = ?5')
    .bind(now - DAY, now - 7 * DAY, now - 30 * DAY, now - 14 * DAY, key));
  const asks = (await m.all(env.DB.prepare("SELECT price FROM listings WHERE status = 'active' AND kind = 'fixed' AND item_count = 1 AND card_id = ? AND variant_id IS ? AND skin_id IS ? AND ends_at > ? ORDER BY price LIMIT 60")
    .bind(spec.cardId, spec.variantId || null, spec.skinId || null, now))).results.map((r) => r.price);
  const bids = (await m.all(env.DB.prepare("SELECT max_price FROM orders WHERE status = 'open' AND expires_at > ? AND card_id = ? AND (any_finish = 1 OR variant_id IS ?) AND (any_skin = 1 OR skin_id IS ?) ORDER BY max_price DESC LIMIT 60")
    .bind(now, spec.cardId, spec.variantId || null, spec.skinId || null))).results.map((r) => r.max_price);
  const supply = (await m.first(env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE status = 'active' AND card_id = ? AND variant_id IS ? AND skin_id IS ? AND ends_at > ?").bind(spec.cardId, spec.variantId || null, spec.skinId || null, now))).n;
  return { key, obs, asks, bids, supply, vol: { h24: { units: agg.u24 || 0, credits: agg.c24 || 0 }, d7: { units: agg.u7 || 0, credits: agg.c7 || 0 }, d30: { units: agg.u30 || 0, credits: agg.c30 || 0 },
    all: { units: agg.uall || 0, credits: agg.call || 0 }, prev7: { units: agg.p7 || 0 }, low30: agg.low30, high30: agg.high30 } };
}

export async function cardAnalytics(env, spec, windowId, now) {
  if (!isCard(spec.cardId)) throw new ApiError(404, 'not-found', 'That card is not in the catalog.');
  // A finish or skin that is not in the catalog is refused before anything is read or cached, so the set of cache keys
  // (and of queries a caller can cause) is bounded by the catalog and not by what a caller types.
  if (spec.variantId && !CATALOG.variants.includes(spec.variantId)) throw new ApiError(404, 'not-found', 'That finish is not in the catalog.');
  if (spec.skinId && !CATALOG.skins.includes(spec.skinId)) throw new ApiError(404, 'not-found', 'That skin is not in the catalog.');
  const win = windowOf(windowId);
  // the cache key is the exact card and window, in a time bucket the length of its lifetime
  const name = 'card|' + keyOf(spec.cardId, spec.variantId, spec.skinId) + '|' + win + '|' + bucket(now, TTL[win] || 45);
  return cached(env, name, TTL[win] || 45, async () => {
    const m = meter();
    const inputs = await cardInputs(env, spec, now, m);
    const a = analyzeCard({ obs: inputs.obs, now, baseline: baselineOf(spec.cardId, spec.variantId, spec.skinId), tier: tierOf(spec.cardId), vol: inputs.vol, asks: inputs.asks, bids: inputs.bids, supply: inputs.supply });
    const w = WINDOWS[win], start = isFinite(w.span) ? now - w.span : 0;
    const rows = inputs.obs.filter((o) => o[0] >= start).map((o) => ({ at: o[0], card_key: inputs.key, price: o[1] }));
    const candles = buildCandles(rows, win, now, 'price');
    return { key: inputs.key, cardId: spec.cardId, name: nameOf(spec.cardId), window: win, analytics: a, candles, tradesCounted: rows.length, source: 'players', serverNow: now, cost: { queries: m.queries, rowsRead: m.rowsRead },
      coverage: inputs.obs.length ? { from: inputs.obs[0][0], to: now, retained: inputs.obs.length, total: inputs.vol.all.units } : null, truncated: inputs.vol.all.units > inputs.obs.length };
  });
}

function membersOf(scope, id) {
  const ids = Object.keys(CATALOG.cards);
  if (scope === 'rarity') return ids.filter((c) => rarityOf(c) === id);
  if (scope === 'brand') return ids.filter((c) => metaOf(c).b === id);
  if (scope === 'generation') return ids.filter((c) => metaOf(c).g === id);
  return ids;
}
const leaderRow = (p) => ({ cardId: p.cardId, name: p.name, valuation: { average: p.lastPrice, change7d: p.change7 ? p.change7.pct : null, volume7d: p.units7, credits7d: p.credits7,
  samples: p.samples14, confidence: p.samples14 >= 12 ? 'high' : p.samples14 >= 4 ? 'medium' : p.samples14 > 0 ? 'low' : 'none', lastAt: p.lastAt } });

export async function stocks(env, q, now) {
  const scope = ['index', 'rarity', 'brand', 'generation', 'card'].includes(q.scope) ? q.scope : 'index', win = windowOf(q.window);
  // The whole market has no id. Anything else must name a real group (an unknown one is empty and never cached).
  const id = scope === 'index' ? '' : String(q.id || '').slice(0, 60);
  if (scope === 'card') {
    if (!isCard(id)) return { scope, id, window: win, empty: true, title: id, serverNow: now, source: 'players' };
    const r = await cardAnalytics(env, { cardId: id, variantId: q.variantId || null, skinId: null }, win, now);
    return Object.assign({}, r, { scope, id, title: nameOf(id), members: 1, unit: 'Credits', closes: r.candles.map((c) => c.close), now });
  }
  const members = membersOf(scope, id);
  if (!members.length) return { scope, id, window: win, empty: true, title: id || 'Cardable Index', serverNow: now, source: 'players' };
  const name = 'group|' + scope + '|' + id + '|' + win + '|' + bucket(now, TTL[win] || 45);
  return cached(env, name, TTL[win] || 45, async () => {
    const set = new Set(members), w = WINDOWS[win], start = isFinite(w.span) ? now - w.span : 0, m = meter();
    const totals = (await m.all(env.DB.prepare('SELECT card_id, COUNT(*) AS n, SUM(price) AS c, SUM(CASE WHEN at > ?1 THEN 1 ELSE 0 END) AS u24, SUM(CASE WHEN at > ?1 THEN price ELSE 0 END) AS c24, ' +
      'SUM(CASE WHEN at > ?2 THEN 1 ELSE 0 END) AS u7 FROM price_observations WHERE at >= ?3 GROUP BY card_id').bind(now - DAY, now - 7 * DAY, start))).results.filter((r) => set.has(r.card_id));
    const rows = (await m.all(env.DB.prepare('SELECT at, card_id, card_key, price FROM price_observations WHERE at >= ? ORDER BY at DESC LIMIT ?').bind(Math.min(start, now - 14 * DAY), SERIES_CAP + 1))).results.reverse();
    const truncated = rows.length > SERIES_CAP;
    const mine = rows.filter((r) => set.has(r.card_id));
    const candles = buildCandles(mine, win, now, 'index');
    const sum = (k) => totals.reduce((n, r) => n + (r[k] || 0), 0);
    const per = perCard(mine.filter((r) => r.at > now - 14 * DAY), now);
    const traded = per.filter((p) => p.samples14 > 0);
    const ratios = mine.slice(-60).map((r) => r.price / Math.max(1, baselineOf(...r.card_key.split('|').map((x, i) => (i === 0 ? x : x || null)))));
    const mean = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
    const vol = ratios.length >= 4 ? Math.sqrt(ratios.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (ratios.length - 1)) / mean : null;
    return {
      scope, id, window: win, title: scope === 'index' ? 'Cardable Index' : scope === 'generation' ? (CATALOG.generations[id] || id) : id, members: members.length, unit: 'Index points',
      candles, closes: candles.map((c) => c.close), tradesCounted: sum('n'), serverNow: now, now, source: 'players', truncated, cost: { queries: m.queries, rowsRead: m.rowsRead },
      coverage: mine.length ? { from: mine[0].at, to: now, retained: mine.length, total: sum('n') } : null,
      aggregate: { volume24h: sum('u24'), volume7d: sum('u7'), credits24h: sum('c24'), change24h: candleChange(candles, now, DAY), change7d: candleChange(candles, now, 7 * DAY), volatility: vol,
        liquidity: Math.min(1, sum('u7') / Math.max(8, members.length * 0.3)), spread: null, samples: sum('n'), cardsTraded: traded.length },
      leaders: {
        active: traded.slice().sort((a, b) => b.units7 - a.units7 || b.credits7 - a.credits7).slice(0, 6).map(leaderRow),
        gainers: traded.filter((p) => p.change7 && p.change7.pct > 0).sort((a, b) => b.change7.pct - a.change7.pct).slice(0, 5).map(leaderRow),
        losers: traded.filter((p) => p.change7 && p.change7.pct < 0).sort((a, b) => a.change7.pct - b.change7.pct).slice(0, 5).map(leaderRow),
        values: traded.filter((p) => p.vsBaseline != null).sort((a, b) => a.vsBaseline - b.vsBaseline).slice(0, 5).map(leaderRow)
      }
    };
  });
}

// Discovery lists, all from the last 14 days of real sales: who is moving, who is busy, who is getting busier.
export async function movers(env, now) {
  return cached(env, 'movers|' + Math.floor(now / 60000), 45, async () => {
    const rows = (await env.DB.prepare('SELECT at, card_id, card_key, price FROM price_observations WHERE at > ? ORDER BY at DESC LIMIT ?').bind(now - 14 * DAY, SERIES_CAP).all()).results.reverse();
    const per = perCard(rows, now);
    const recent = (await env.DB.prepare("SELECT at, card_id, price, kind, item_count FROM trades WHERE kind <> 'swap' ORDER BY at DESC, id LIMIT 30").all()).results;
    const view = (p) => ({ cardId: p.cardId, name: p.name, rarity: p.rarity, lastPrice: p.lastPrice, change7d: p.change7 ? p.change7.pct : null, units7: p.units7, credits7: p.credits7, growth: p.growth, vsBaseline: p.vsBaseline, samples: p.samples14 });
    return {
      serverNow: now, source: 'players', cardsTraded: per.length,
      rising: per.filter((p) => p.change7 && p.change7.pct > 0).sort((a, b) => b.change7.pct - a.change7.pct).slice(0, 10).map(view),
      falling: per.filter((p) => p.change7 && p.change7.pct < 0).sort((a, b) => a.change7.pct - b.change7.pct).slice(0, 10).map(view),
      trending: per.filter((p) => p.growth != null && p.units7 >= 2).sort((a, b) => b.growth - a.growth || b.units7 - a.units7).slice(0, 10).map(view),
      active: per.slice().sort((a, b) => b.units7 - a.units7 || b.credits7 - a.credits7).slice(0, 10).map(view),
      liquid: per.filter((p) => p.units7 >= 3).sort((a, b) => b.units7 - a.units7).slice(0, 10).map(view),
      recentlySold: recent.map((t) => ({ cardId: t.card_id, name: nameOf(t.card_id), price: t.price, at: t.at, bundle: t.item_count > 1 }))
    };
  });
}
