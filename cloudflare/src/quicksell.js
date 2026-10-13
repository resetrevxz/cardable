// Quick Sell on the Global Market: a system redemption of a card the player owns into newly issued Credits.
//
// It is NOT a trader, a listing or a bot. It never appears in `trades` or `price_observations`, so it can never be a
// last sale, sale volume, part of Average Value or a seller's reputation. It is a standing, disclosed, lower bid:
//     quote = max(1, floor(clamp(Average Value, 0.4 x baseline, 1.5 x baseline) x 0.55))
// the same rule the offline game uses. The card is marked redeemed (its serial is retired for good), the Credits are
// issued once through the ledger, and a durable receipt is kept. Beta quotas bound how many Credits one account, and the
// whole realm, can issue per day, because this is the only place Credits are created.
import { ApiError, num } from './util.js';
import { DAY, RULES, nameOf, quickSellLimits, quickSellQuote } from './economy.js';
import { Tx, mutate, newId } from './ops.js';
import { fairOf } from './valuation.js';

const placeholders = (n) => new Array(n).fill('?').join(',');

async function usage(env, accountId, now) {
  const day = Math.floor(now / DAY) * DAY;
  const mine = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(quote), 0) AS c FROM redemptions WHERE account_id = ? AND at >= ?').bind(accountId, day).first();
  const all = await env.DB.prepare('SELECT COALESCE(SUM(quote), 0) AS c FROM redemptions WHERE at >= ?').bind(day).first();
  const q = quickSellLimits(env);
  return { day, cards: mine.n, credits: mine.c, realmCredits: all.c,
    limits: { cardsPerDay: q.perAccountCardsPerDay, creditsPerDay: q.perAccountCreditsPerDay, realmCreditsPerDay: q.globalCreditsPerDay },
    cardsLeft: Math.max(0, q.perAccountCardsPerDay - mine.n), creditsLeft: Math.max(0, q.perAccountCreditsPerDay - mine.c), resetsAt: day + DAY };
}

async function quoteRows(env, accountId, ids, now) {
  const rows = (await env.DB.prepare('SELECT id, card_id, variant_id, skin_id, serial, state, owner_id FROM instances WHERE id IN (' + placeholders(ids.length) + ')').bind(...ids).all()).results;
  if (rows.length !== ids.length || rows.some((r) => r.owner_id !== accountId)) throw new ApiError(409, 'not-owned', 'One of those cards is not in your collection.');
  const bad = rows.find((r) => r.state !== 'owned');
  if (bad) throw new ApiError(409, bad.state === 'escrow' ? 'locked' : 'sold', bad.state === 'escrow' ? 'A card in a listing or an offer cannot be sold to the system. Withdraw it first.' : 'That card was already sold.');
  const fair = await fairOf(env, rows.map((r) => ({ cardId: r.card_id, variantId: r.variant_id, skinId: r.skin_id, serial: r.serial })), now);
  const byId = new Map(rows.map((r, n) => [r.id, { r, f: fair[n] }]));
  return ids.map((id) => {
    const { r, f } = byId.get(id), q = quickSellQuote({ cardId: r.card_id, serial: r.serial }, f);
    return { instanceId: r.id, cardId: r.card_id, name: nameOf(r.card_id), variantId: r.variant_id, cardSkinId: r.skin_id, serial: r.serial, quote: q.quote, fair: q.fair, baseline: q.baseline, basis: q.basis, confidence: q.confidence, samples: q.samples, factor: q.factor };
  });
}

function parseIds(raw) {
  const ids = Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : String(raw || '').split(',').filter(Boolean);
  if (!ids.length) throw new ApiError(422, 'empty', 'Choose at least one card.');
  if (ids.length > RULES.quickSell.perRequestMax) throw new ApiError(422, 'too-many', 'That is more than one sale can hold (' + RULES.quickSell.perRequestMax + ').');
  if (new Set(ids).size !== ids.length) throw new ApiError(422, 'duplicate', 'The same card was chosen twice.');
  return ids;
}

export async function quote(env, who, rawIds, now) {
  const ids = parseIds(rawIds), items = await quoteRows(env, who.accountId, ids, now), u = await usage(env, who.accountId, now);
  const total = items.reduce((n, i) => n + i.quote, 0);
  return { items, total, usage: u, expiresAt: now + RULES.quickSell.quoteTtlMs, quotaOk: items.length <= u.cardsLeft && total <= u.creditsLeft && u.realmCredits + total <= u.limits.realmCreditsPerDay,
    disclosure: 'This is the system buying your card at a fixed, lower price. It is not another player, and it does not set market prices.' };
}

export async function redeem(env, who, key, body, now) {
  const ids = parseIds(body.instanceIds), expect = body.expectTotal == null ? null : num(body.expectTotal);
  return mutate(env, who, key, { op: 'quick-sell', ids, expect }, now, async () => {
    const items = await quoteRows(env, who.accountId, ids, now), total = items.reduce((n, i) => n + i.quote, 0), u = await usage(env, who.accountId, now);
    if (expect != null && expect !== total) throw new ApiError(409, 'quote-changed', 'The quote changed. Review the new total.', { total, items });
    if (ids.length > u.cardsLeft) throw new ApiError(429, 'quota', 'The beta lets one account sell ' + u.limits.cardsPerDay + ' cards a day to the system. You can sell ' + u.cardsLeft + ' more today.', { usage: u });
    if (total > u.creditsLeft) throw new ApiError(429, 'quota', 'The beta limits Credits from the system to ' + u.limits.creditsPerDay + ' a day per account. ' + u.creditsLeft + ' left today.', { usage: u });
    if (u.realmCredits + total > u.limits.realmCreditsPerDay) throw new ApiError(429, 'realm-quota', 'The system has paid out its daily total for the whole beta. It resets at midnight UTC.', { usage: u });
    const opId = newId('qs'), tx = new Tx(env, now), day = u.day;
    tx.guard('not_owned', "(SELECT COUNT(*) FROM instances WHERE id IN (" + placeholders(ids.length) + ") AND owner_id = ? AND state = 'owned') = ?", ...ids, who.accountId, ids.length);
    const lim = quickSellLimits(env);
    tx.guard('quota', 'COALESCE((SELECT SUM(quote) FROM redemptions WHERE account_id = ? AND at >= ?), 0) + ? <= ?', who.accountId, day, total, lim.perAccountCreditsPerDay);
    tx.guard('quota', 'COALESCE((SELECT COUNT(*) FROM redemptions WHERE account_id = ? AND at >= ?), 0) + ? <= ?', who.accountId, day, ids.length, lim.perAccountCardsPerDay);
    tx.guard('quota', 'COALESCE((SELECT SUM(quote) FROM redemptions WHERE at >= ?), 0) + ? <= ?', day, total, lim.globalCreditsPerDay);
    tx.add("UPDATE instances SET state = 'redeemed', escrow_ref = NULL WHERE id IN (" + placeholders(ids.length) + ") AND owner_id = ? AND state = 'owned'", ...ids, who.accountId);
    items.forEach((i) => tx.add('INSERT INTO redemptions (id, account_id, at, instance_id, card_id, variant_id, skin_id, serial, quote, fair, baseline, op_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      newId('rd'), who.accountId, now, i.instanceId, i.cardId, i.variantId, i.cardSkinId, i.serial, i.quote, i.fair, i.baseline, opId));
    tx.credit(who.accountId, total, 'quick sell', opId);
    return { tx, result: { ok: true, receiptId: opId, total, count: items.length, at: now, items: items.map((i) => ({ instanceId: i.instanceId, cardId: i.cardId, serial: i.serial, quote: i.quote, fair: i.fair })),
      disclosure: 'Sold to the system at a fixed lower price. This is not a player sale and does not affect market prices.' } };
  });
}
export { usage as quickSellUsage };
