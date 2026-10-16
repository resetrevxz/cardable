// Read models. Everything a player sees about other players is an alias and public card facts: no account id, no
// session, no private maximum bid. A player's own maximum, holds and orders are shown only to that player.
import { ApiError } from './util.js';
import { DAY, RULES, TIERS, feeFor, nameOf, resolveAuction } from './economy.js';
import { CATALOG } from './catalog.js';
import { valuations } from './valuation.js';
import { settleListing } from './listings.js';
import { evaluateOwnAlerts } from './alerts.js';
import { mayWrite } from './maintenance.js';

const placeholders = (n) => new Array(n).fill('?').join(',');
const FORMAT = { fixed: 'buy-now', auction: 'auction', swap: 'swap' };

function cursorOf(value, id) { return btoa(JSON.stringify([value, id])).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function parseCursor(text) {
  if (!text) return null;
  try { const v = JSON.parse(atob(String(text).replace(/-/g, '+').replace(/_/g, '/'))); if (Array.isArray(v) && v.length === 2 && typeof v[1] === 'string') return v; } catch (_) { /* bad cursor */ }
  throw new ApiError(400, 'bad-cursor', 'That page marker is not valid.');
}
const clampLimit = (v, def, max) => Math.max(1, Math.min(max, Number(v) || def));

// The pictures a seller put on a listing, as the game asks for them: ids to read through /v1/media, never addresses.
function imagesOf(r) {
  try { return JSON.parse(r.images || '[]').map((i) => ({ id: i.u, alt: i.alt || '', width: i.w || null, height: i.h || null })); } catch (_) { return []; }
}
function coverOf(r) {
  try { return r.cover ? JSON.parse(r.cover) : null; } catch (_) { return null; }
}

// The public listing, as the market shows it. `me` is the viewer's account id (or null).
function listingRow(r, me, val, now) {
  const items = JSON.parse(r.items), first = items[0], mine = r.seller_id === me;
  const view = {
    id: r.id, format: FORMAT[r.kind], kind: r.kind, status: r.status, ask: r.price, title: r.title, description: r.note,
    card: { cardId: first.c, variantId: first.v || null, cardSkinId: first.k || null, serial: first.s, count: r.item_count, packId: first.p || null },
    items: items.map((i) => Object.assign({ cardId: i.c, variantId: i.v || null, cardSkinId: i.k || null, serial: i.s, packId: i.p || null }, mine ? { instanceId: i.i } : {})),
    seller: { alias: r.seller_alias, isYou: mine, sales: r.seller_sales || 0, tenureDays: Math.max(0, Math.floor((now - (r.seller_since || now)) / DAY)),
      rating: r.seller_reviews ? { average: Math.round(r.seller_rating * 10) / 10, count: r.seller_reviews } : null },
    images: imagesOf(r), cover: coverOf(r), treatment: r.treatment || 'none', commentCount: r.comment_count || 0,
    valuation: val, createdAt: r.created_at, endsAt: r.ends_at, closedAt: r.closed_at, soldFor: r.sold_price, endNote: r.end_note || '', snipeNote: r.snipe_note || '',
    isMine: mine, version: r.version, source: 'players', reservedCard: false
  };
  if (r.kind === 'auction') {
    const hasBids = r.bid_count > 0;
    view.auction = { start: r.start_price, current: r.price, bids: r.bid_count, bidders: r.bidder_count, hasReserve: r.reserve != null, buyout: r.buyout, step: r.step || null,
      reserveMet: r.reserve == null || (hasBids && r.price >= r.reserve) || (r.leader_max != null && r.leader_max >= r.reserve), extensions: r.extensions,
      leaderAlias: hasBids ? r.leader_alias : null, youLead: !!me && r.leader_id === me, myMax: r.my_max == null ? null : r.my_max, myActive: !!r.my_active,
      reserveAmount: mine ? r.reserve : null, firstEndsAt: r.first_ends_at, maxExtensions: RULES.auction.snipeMaxExtensions };
    const inc = r.step || Math.max(RULES.auction.incrementMin, Math.round(r.price * RULES.auction.incrementPct / 100));
    view.auction.increment = inc; view.auction.minNext = r.bidder_count ? r.price + inc : r.start_price;
  }
  if (r.kind === 'swap') view.swap = { wants: r.wants ? JSON.parse(r.wants) : null, minTopUp: r.min_topup, direction: 'asks', openToCounter: true };
  return view;
}

export const LISTING_SQL = 'SELECT l.*, s.alias AS seller_alias, s.created_at AS seller_since, ld.alias AS leader_alias, ' +
  '(SELECT COUNT(*) FROM trades t WHERE t.seller_id = l.seller_id) AS seller_sales, ' +
  "(SELECT COUNT(*) FROM reviews rv WHERE rv.seller_id = l.seller_id AND rv.status = 'visible') AS seller_reviews, " +
  "(SELECT AVG(rv.rating) FROM reviews rv WHERE rv.seller_id = l.seller_id AND rv.status = 'visible') AS seller_rating, " +
  "(SELECT COUNT(*) FROM comments cm WHERE cm.listing_id = l.id AND cm.status IN ('visible', 'seller_hidden', 'held')) AS comment_count, " +
  '(SELECT max_amount FROM bids b WHERE b.listing_id = l.id AND b.bidder_id = ?1) AS my_max, ' +
  '(SELECT active FROM bids b WHERE b.listing_id = l.id AND b.bidder_id = ?1) AS my_active, ' +
  "(SELECT max_amount FROM bids b WHERE b.listing_id = l.id AND b.bidder_id = l.leader_id AND l.seller_id = ?1) AS leader_max " +
  'FROM listings l JOIN accounts s ON s.id = l.seller_id LEFT JOIN accounts ld ON ld.id = l.leader_id ';

export async function withValuations(env, rows, me, now) {
  const specs = rows.map((r) => { const f = JSON.parse(r.items)[0]; return { cardId: f.c, variantId: f.v || null, skinId: f.k || null, serial: f.s }; });
  const vals = specs.length ? await valuations(env, specs, now) : [];
  return rows.map((r, n) => listingRow(r, me, vals[n], now));
}

// ---- browse ------------------------------------------------------------------------------------------------------------
// Server-side search over the facets an index can serve (kind, card, rarity, brand, generation, finish, skin, price,
// serial, bids, reserve, time left, tier, seller), keyset-paginated. Derived facets (value against Average Value,
// liquidity, confidence, wishlist) are applied by the interface to the page it receives.
const csv = (v, max = 8) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, max);
export const SORTS = { newest: ['l.created_at', 'DESC'], ending: ['l.ends_at', 'ASC'], 'price-asc': ['l.price', 'ASC'], 'price-desc': ['l.price', 'DESC'], bids: ['l.bid_count', 'DESC'] };
export function searchPlan(p, who, now) {
  const where = [], binds = [], mineOnly = p.get('mine') === '1';
  if (mineOnly) { where.push('l.seller_id = ?'); binds.push(who.accountId); }
  else { where.push("l.status = 'active'"); where.push('l.ends_at > ?'); binds.push(now); }
  const inList = (col, list) => { where.push(col + ' IN (' + list.map(() => '?').join(',') + ')'); binds.push(...list); };
  const kinds = csv(p.get('kind')).filter((k) => ['fixed', 'auction', 'swap'].includes(k)); if (kinds.length) inList('l.kind', kinds);
  if (p.get('cardId')) { where.push('l.card_id = ?'); binds.push(String(p.get('cardId')).slice(0, 80)); }
  const rar = csv(p.get('rarity')); if (rar.length) inList('l.rarity', rar);
  if (p.get('brand')) { where.push('l.brand = ?'); binds.push(String(p.get('brand')).slice(0, 40)); }
  if (p.get('generation')) { where.push('l.generation = ?'); binds.push(String(p.get('generation')).slice(0, 40)); }
  const variants = csv(p.get('variant'));
  if (variants.length) {
    const named = variants.filter((v) => v !== 'none'), parts = [];
    if (named.length) { parts.push('l.variant_id IN (' + named.map(() => '?').join(',') + ')'); binds.push(...named); }
    if (variants.includes('none')) parts.push('l.variant_id IS NULL');
    where.push('(' + parts.join(' OR ') + ')');
  }
  const skins = csv(p.get('skin'));
  if (skins.length) {
    const named = skins.filter((v) => v !== 'none'), parts = [];
    if (named.length) { parts.push('l.skin_id IN (' + named.map(() => '?').join(',') + ')'); binds.push(...named); }
    if (skins.includes('none')) parts.push('l.skin_id IS NULL');
    where.push('(' + parts.join(' OR ') + ')');
  }
  const int = (name) => { const n = Number(p.get(name)); return p.get(name) != null && p.get(name) !== '' && Number.isSafeInteger(n) ? n : null; };
  if (int('min') != null) { where.push('l.price >= ?'); binds.push(int('min')); }
  if (int('max') != null) { where.push('l.price <= ?'); binds.push(int('max')); }
  if (int('serialMax') != null) { where.push('l.serial_n IS NOT NULL AND l.serial_n <= ?'); binds.push(int('serialMax')); }
  if (int('minBids') != null) { where.push('l.bid_count >= ?'); binds.push(int('minBids')); }
  if (int('tierMin') != null) { where.push('l.tier >= ?'); binds.push(int('tierMin')); }
  if (int('tierMax') != null) { where.push('l.tier <= ?'); binds.push(int('tierMax')); }
  if (int('endsWithin') != null) { where.push("l.kind = 'auction' AND l.ends_at <= ?"); binds.push(now + int('endsWithin')); }
  const reserve = p.get('reserve');
  if (reserve === 'met') where.push('l.reserve IS NOT NULL AND l.price >= l.reserve');
  else if (reserve === 'unmet') where.push('l.reserve IS NOT NULL AND l.price < l.reserve');
  else if (reserve === 'none') where.push('l.reserve IS NULL');
  if (p.get('seller')) { where.push('l.seller_id = (SELECT id FROM accounts WHERE alias = ? COLLATE NOCASE)'); binds.push(String(p.get('seller')).slice(0, 40)); }
  const q = String(p.get('q') || '').trim().toLowerCase().slice(0, 60);
  if (q) {
    const ids = Object.keys(CATALOG.names).filter((id) => CATALOG.names[id].toLowerCase().indexOf(q) >= 0 || (CATALOG.meta[id].b || '').toLowerCase().indexOf(q) >= 0).slice(0, 50);
    if (!ids.length) where.push('0');
    else inList('l.card_id', ids);
  }
  return { where, binds, mineOnly };
}

export async function browse(env, who, url, now) {
  const p = url.searchParams, limit = clampLimit(p.get('limit'), 50, 100), sort = Object.prototype.hasOwnProperty.call(SORTS, p.get('sort')) ? p.get('sort') : 'newest';
  const cur = parseCursor(p.get('cursor')), plan = searchPlan(p, who, now), order = SORTS[sort];
  const where = plan.where.slice(), binds = plan.binds.slice();
  if (cur) { where.push('(' + order[0] + ' ' + (order[1] === 'DESC' ? '<' : '>') + ' ? OR (' + order[0] + ' = ? AND l.id ' + (order[1] === 'DESC' ? '<' : '>') + ' ?))'); binds.push(cur[0], cur[0], cur[1]); }
  const sql = LISTING_SQL + 'WHERE ' + where.join(' AND ') + ' ORDER BY ' + order[0] + ' ' + order[1] + ', l.id ' + order[1] + ' LIMIT ' + (limit + 1);
  const [main, count] = await env.DB.batch([
    env.DB.prepare(sql).bind(who.accountId, ...binds),
    env.DB.prepare('SELECT COUNT(*) AS n FROM listings l WHERE ' + plan.where.join(' AND ')).bind(...plan.binds)
  ]);
  const rows = main.results, page = rows.slice(0, limit), items = await withValuations(env, page, who.accountId, now), total = count.results[0].n;
  const lastRow = page[page.length - 1];
  const key = { newest: lastRow && lastRow.created_at, ending: lastRow && lastRow.ends_at, 'price-asc': lastRow && lastRow.price, 'price-desc': lastRow && lastRow.price, bids: lastRow && lastRow.bid_count }[sort];
  return { items, nextCursor: rows.length > limit && lastRow ? cursorOf(key, lastRow.id) : null, total, serverNow: now, source: 'players', emptyReason: total ? null : 'no-listings',
    cost: { rowsRead: (main.meta.rows_read || 0) + (count.meta.rows_read || 0), statements: 2 } };
}

// ---- one listing ---------------------------------------------------------------------------------------------------------------
export async function detail(env, who, id, now) {
  let r = await env.DB.prepare(LISTING_SQL + 'WHERE l.id = ?2').bind(who.accountId, id).first();
  if (!r) throw new ApiError(404, 'not-found', 'That listing could not be found.');
  // A listing past its end is settled on the spot: whoever opens it sees the truth, not a stale "active".
  if (r.status === 'active' && now >= r.ends_at && await mayWrite(env)) {
    await settleListing(env, id, now);
    r = await env.DB.prepare(LISTING_SQL + 'WHERE l.id = ?2').bind(who.accountId, id).first();
  }
  const [view] = await withValuations(env, [r], who.accountId, now);
  const out = { listing: view, serverNow: now };
  if (r.kind === 'auction') {
    const events = (await env.DB.prepare("SELECT e.at, e.price_after, e.kind, a.alias FROM bid_events e JOIN accounts a ON a.id = e.bidder_id WHERE e.listing_id = ? AND e.kind <> 'extend' ORDER BY e.id DESC LIMIT 12").bind(id).all()).results;
    out.history = events.map((e) => ({ by: e.alias, price: e.price_after, at: e.at, kind: e.kind }));
    out.reservedByYou = r.my_active ? r.my_max : 0;
  }
  if (r.kind === 'swap') {
    const first = JSON.parse(r.items)[0];
    const offers = (await env.DB.prepare(
      "SELECT o.*, f.alias AS from_alias, t.alias AS to_alias FROM offers o JOIN accounts f ON f.id = o.from_id JOIN accounts t ON t.id = o.to_id WHERE o.listing_id = ? AND (o.from_id = ? OR o.to_id = ?) ORDER BY o.updated_at DESC LIMIT 30").bind(id, who.accountId, who.accountId).all()).results;
    const all = offers.flatMap((o) => JSON.parse(o.items));
    const vals = all.length ? await valuations(env, all.map((i) => ({ cardId: i.c, variantId: i.v, skinId: i.k, serial: i.s })), now) : [];
    let at = 0;
    out.offers = offers.map((o) => {
      const items = JSON.parse(o.items).map((i) => ({ cardId: i.c, variantId: i.v || null, cardSkinId: i.k || null, serial: i.s, worth: vals[at++].average }));
      return { id: o.id, listingId: o.listing_id, status: o.status, awaiting: o.awaiting, round: o.round, from: o.from_alias, to: o.to_alias, fromYou: o.from_id === who.accountId, toYou: o.to_id === who.accountId,
        give: items, cash: o.cash, refund: o.refund, note: o.message, createdAt: o.created_at, updatedAt: o.updated_at, expiresAt: o.expires_at, myTurn: o.status === 'pending' && ((o.awaiting === 'seller' && o.to_id === who.accountId) || (o.awaiting === 'offerer' && o.from_id === who.accountId)) };
    });
    void first;
  }
  const similar = (await env.DB.prepare(LISTING_SQL + "WHERE l.card_id = ?2 AND l.status = 'active' AND l.ends_at > ?3 AND l.id <> ?4 ORDER BY l.price LIMIT 6").bind(who.accountId, r.card_id, now, id).all()).results;
  out.similar = await withValuations(env, similar, who.accountId, now);
  const trades = (await env.DB.prepare('SELECT t.*, s.alias AS seller_alias, b.alias AS buyer_alias FROM trades t JOIN accounts s ON s.id = t.seller_id JOIN accounts b ON b.id = t.buyer_id WHERE t.card_id = ? ORDER BY t.at DESC, t.id LIMIT 6').bind(r.card_id).all()).results;
  out.trades = trades.map(tradeView);
  return out;
}

export function tradeView(t) {
  const first = JSON.parse(t.items)[0];
  return { id: t.id, at: t.at, kind: t.kind, price: t.price, fee: t.fee, cardId: first.c, variantId: first.v || null, cardSkinId: first.k || null, serial: first.s, count: t.item_count,
    seller: t.seller_alias, buyer: t.buyer_alias, attributed: !!t.attributed, barter: t.kind === 'swap' };
}
export async function trades(env, who, url) {
  const p = url.searchParams, limit = clampLimit(p.get('limit'), 30, 100), cur = parseCursor(p.get('cursor')), binds = [], where = [];
  if (p.get('cardId')) { where.push('t.card_id = ?'); binds.push(String(p.get('cardId'))); }
  if (p.get('mine') === '1') { where.push('(t.seller_id = ? OR t.buyer_id = ?)'); binds.push(who.accountId, who.accountId); }
  if (cur) { where.push('(t.at < ? OR (t.at = ? AND t.id > ?))'); binds.push(cur[0], cur[0], cur[1]); }
  const rows = (await env.DB.prepare('SELECT t.*, s.alias AS seller_alias, b.alias AS buyer_alias FROM trades t JOIN accounts s ON s.id = t.seller_id JOIN accounts b ON b.id = t.buyer_id' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY t.at DESC, t.id LIMIT ' + (limit + 1)).bind(...binds).all()).results;
  const page = rows.slice(0, limit);
  const sums = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(price), 0) AS volume FROM trades WHERE kind <> 'swap'" + (p.get('cardId') ? ' AND card_id = ?' : '')).bind(...(p.get('cardId') ? [String(p.get('cardId'))] : [])).first();
  return { items: page.map(tradeView), nextCursor: rows.length > limit ? cursorOf(page[page.length - 1].at, page[page.length - 1].id) : null, total: sums.n, volume: sums.volume };
}

// ---- a card's market ---------------------------------------------------------------------------------------------------------------
export async function cardMarket(env, who, cardId, variantId, now) {
  if (!nameOf(cardId) || nameOf(cardId) === cardId) throw new ApiError(404, 'not-found', 'That card is not in the catalog.');
  const spec = { cardId, variantId: variantId || null, skinId: null, serial: null };
  const [valuation] = await valuations(env, [spec], now);
  const rows = (await env.DB.prepare(LISTING_SQL + "WHERE l.card_id = ?2 AND l.status = 'active' AND l.ends_at > ?3 ORDER BY l.price, l.created_at LIMIT 40").bind(who.accountId, cardId, now).all()).results;
  const listings = await withValuations(env, rows, who.accountId, now);
  const trs = (await env.DB.prepare('SELECT t.*, s.alias AS seller_alias, b.alias AS buyer_alias FROM trades t JOIN accounts s ON s.id = t.seller_id JOIN accounts b ON b.id = t.buyer_id WHERE t.card_id = ? ORDER BY t.at DESC, t.id LIMIT 10').bind(cardId).all()).results;
  const asks = (await env.DB.prepare("SELECT price FROM listings WHERE card_id = ? AND status = 'active' AND kind = 'fixed' AND item_count = 1 AND ends_at > ? ORDER BY price LIMIT 5").bind(cardId, now).all()).results.map((x) => x.price);
  const bids = (await env.DB.prepare("SELECT max_price FROM orders WHERE card_id = ? AND status = 'open' AND expires_at > ? ORDER BY max_price DESC LIMIT 5").bind(cardId, now).all()).results.map((x) => x.max_price);
  const mine = (await env.DB.prepare("SELECT * FROM orders WHERE card_id = ? AND account_id = ? AND status = 'open' ORDER BY created_at DESC").bind(cardId, who.accountId).all()).results.map(orderView);
  const variants = Array.from(new Set(listings.map((l) => l.card.variantId).filter(Boolean)));
  return { cardId, valuation, listings, trades: trs.map(tradeView), variants, depth: { asks, bids }, myOrders: mine, serverNow: now };
}
export function orderView(o) {
  return { id: o.id, cardId: o.card_id, variantId: o.variant_id, anyFinish: !!o.any_finish, cardSkinId: o.skin_id, anySkin: !!o.any_skin, maxPrice: o.max_price, quantity: o.quantity, filled: o.filled,
    spent: o.spent, status: o.status, createdAt: o.created_at, expiresAt: o.expires_at, closedAt: o.closed_at, reserved: o.status === 'open' ? o.max_price * (o.quantity - o.filled) : 0, mine: true };
}

// ---- the player's own activity ----------------------------------------------------------------------------------------------------
export async function activity(env, who, now) {
  const me = who.accountId;
  // The player's own alerts are looked at now, by this request; a failure here never costs them their activity page.
  if (await mayWrite(env)) { try { await evaluateOwnAlerts(env, who, now); } catch (_) { /* looked at again on the next request */ } }
  const mineRows = (await env.DB.prepare(LISTING_SQL + 'WHERE l.seller_id = ?1 ORDER BY (l.status = \'active\') DESC, l.created_at DESC LIMIT 60').bind(me).all()).results;
  const bidRows = (await env.DB.prepare(LISTING_SQL + "WHERE l.status = 'active' AND l.id IN (SELECT listing_id FROM bids WHERE bidder_id = ?1) ORDER BY l.ends_at LIMIT 40").bind(me).all()).results;
  const orders = (await env.DB.prepare('SELECT * FROM orders WHERE account_id = ? ORDER BY (status = \'open\') DESC, created_at DESC LIMIT 40').bind(me).all()).results;
  const offerRows = (await env.DB.prepare('SELECT o.*, f.alias AS from_alias, t.alias AS to_alias FROM offers o JOIN accounts f ON f.id = o.from_id JOIN accounts t ON t.id = o.to_id WHERE o.from_id = ? OR o.to_id = ? ORDER BY (o.status = \'pending\') DESC, o.updated_at DESC LIMIT 40').bind(me, me).all()).results;
  const notes = (await env.DB.prepare('SELECT id, at, kind, body, read_at, ref FROM notifications WHERE account_id = ? ORDER BY id DESC LIMIT 60').bind(me).all()).results;
  const wallet = await env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(me).first();
  const holds = (await env.DB.prepare('SELECT kind, ref, amount FROM holds WHERE account_id = ? AND released_at IS NULL').bind(me).all()).results;
  const [mine, bids] = await Promise.all([withValuations(env, mineRows, me, now), withValuations(env, bidRows, me, now)]);
  return {
    serverNow: now, wallet: { balance: wallet.balance, held: wallet.held, available: wallet.balance - wallet.held },
    mine, bids: bids.map((b) => Object.assign({}, b, { outbid: !!(b.auction && b.auction.myMax != null && !b.auction.youLead), reserved: (holds.find((h) => h.kind === 'bid' && h.ref === b.id) || { amount: 0 }).amount })),
    orders: orders.map(orderView),
    offers: offerRows.map((o) => ({ id: o.id, listingId: o.listing_id, status: o.status, awaiting: o.awaiting, round: o.round, from: o.from_alias, to: o.to_alias, fromYou: o.from_id === me, toYou: o.to_id === me,
      give: JSON.parse(o.items).map((i) => ({ cardId: i.c, variantId: i.v || null, cardSkinId: i.k || null, serial: i.s })), cash: o.cash, refund: o.refund, note: o.message,
      createdAt: o.created_at, updatedAt: o.updated_at, expiresAt: o.expires_at, myTurn: o.status === 'pending' && ((o.awaiting === 'seller' && o.to_id === me) || (o.awaiting === 'offerer' && o.from_id === me)) })),
    notifications: notes.map((n) => ({ id: n.id, at: n.at, kind: n.kind, text: n.body, listingId: n.ref && n.ref.startsWith('lst_') ? n.ref : null, ref: n.ref, read: !!n.read_at })),
    unread: notes.filter((n) => !n.read_at).length
  };
}
export async function markRead(env, who, body, now) {
  const upTo = Number(body.upTo);
  if (!Number.isSafeInteger(upTo) || upTo < 0) throw new ApiError(422, 'invalid', 'Say which notifications to mark as read.');
  const r = await env.DB.prepare('UPDATE notifications SET read_at = ? WHERE account_id = ? AND id <= ? AND read_at IS NULL').bind(now, who.accountId, upTo).run();
  return { ok: true, changed: r.meta ? r.meta.changes : 0 };
}

// The wallet's statement: each ledger row with the receipt it belongs to.
export async function history(env, who, url) {
  const p = url.searchParams, limit = clampLimit(p.get('limit'), 30, 100), cur = parseCursor(p.get('cursor'));
  const rows = (await env.DB.prepare('SELECT g.id, g.at, g.delta, g.reason, g.ref, g.balance_after, t.kind AS t_kind, t.price AS t_price, t.fee AS t_fee, t.card_id AS t_card, t.item_count AS t_count, ' +
    'sa.alias AS t_seller, ba.alias AS t_buyer, t.seller_id AS t_seller_id, r.card_id AS r_card, r.quote AS r_quote ' +
    'FROM ledger g LEFT JOIN trades t ON t.id = g.ref LEFT JOIN accounts sa ON sa.id = t.seller_id LEFT JOIN accounts ba ON ba.id = t.buyer_id ' +
    'LEFT JOIN (SELECT op_id, MIN(card_id) AS card_id, SUM(quote) AS quote FROM redemptions GROUP BY op_id) r ON r.op_id = g.ref ' +
    'WHERE g.account_id = ? ' + (cur ? 'AND g.id < ? ' : '') + 'ORDER BY g.id DESC LIMIT ' + (limit + 1)).bind(...(cur ? [who.accountId, Number(cur[0])] : [who.accountId])).all()).results;
  const page = rows.slice(0, limit);
  return {
    items: page.map((g) => ({ id: g.id, at: g.at, delta: g.delta, reason: g.reason, receiptId: g.ref, balance: g.balance_after,
      trade: g.t_kind ? { kind: g.t_kind, price: g.t_price, fee: g.t_fee, cardId: g.t_card, name: nameOf(g.t_card), count: g.t_count, seller: g.t_seller, buyer: g.t_buyer } : null,
      redemption: g.r_quote ? { cardId: g.r_card, total: g.r_quote, note: 'Sold to the system at a fixed lower price. Not a player sale.' } : null })),
    nextCursor: rows.length > limit ? cursorOf(String(page[page.length - 1].id), String(page[page.length - 1].id)) : null
  };
}

export async function inventory(env, who, url) {
  const p = url.searchParams, limit = clampLimit(p.get('limit'), 100, 500), after = p.get('cursor') || '';
  const rows = (await env.DB.prepare("SELECT id, card_id, variant_id, skin_id, serial, source, state, pulled_at, pack_id, escrow_ref FROM instances WHERE owner_id = ? AND state <> 'redeemed' AND id > ? ORDER BY id LIMIT ?").bind(who.accountId, after, limit + 1).all()).results;
  const page = rows.slice(0, limit);
  const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM instances WHERE owner_id = ? AND state <> 'redeemed'").bind(who.accountId).first()).n;
  return { items: page.map((r) => ({ id: r.id, cardId: r.card_id, variantId: r.variant_id, cardSkinId: r.skin_id, serial: r.serial, source: r.source, state: r.state, pulledAt: r.pulled_at, packId: r.pack_id,
    listedIn: r.state === 'escrow' ? r.escrow_ref : null })), nextCursor: rows.length > limit ? page[page.length - 1].id : null, total };
}
export { RULES, TIERS, feeFor, resolveAuction, placeholders };
