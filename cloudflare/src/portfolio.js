// A player's portfolio on the Global Market, computed on the server from their own rows only.
//
// Accounting convention (also shown to the player):
//   * Cost basis is what the market set: the price paid for a card bought, won or ordered here. A bundle's price is split
//     by the cards' baseline values. A card that came from an import, or from a swap, has NO cost basis: it is reported
//     as "No cost basis", never as free and never as a loss.
//   * Realized profit counts a sale or a Quick Sell only when the card's basis is known: proceeds after the fee, minus
//     basis. Sales of cards with no basis add to volume and fees but not to profit.
//   * Unrealized change is estimate minus basis for held cards with a known basis. Estimates are Average Value
//     marks with their confidence, and are not what the market is obliged to pay. Quick Sell value is separate.
import { ApiError } from './util.js';
import { RULES, baselineOf, feeFor, keyOf, nameOf, quickSellQuote, serialFactor } from './economy.js';
import { fairOf } from './valuation.js';

const CONF_ORDER = ['none', 'low', 'medium', 'high'];

// The books are exact over every card; the list of holdings sent to the screen is bounded (the export has them all).
const HOLDINGS_SHOWN = 1000;

export async function portfolio(env, who, now, options) {
  const me = who.accountId;
  const [wallet, holds, cards, sold, bought, redeemed, swaps] = await Promise.all([
    env.DB.prepare('SELECT balance, held FROM wallets WHERE account_id = ?').bind(me).first(),
    env.DB.prepare('SELECT kind, COUNT(*) AS n, SUM(amount) AS amount FROM holds WHERE account_id = ? AND released_at IS NULL GROUP BY kind').bind(me).all(),
    env.DB.prepare("SELECT id, card_id, variant_id, skin_id, serial, state, basis, acquired_via, acquired_at, source FROM instances WHERE owner_id = ? AND state <> 'redeemed' ORDER BY id").bind(me).all(),
    env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(price), 0) AS volume, COALESCE(SUM(fee), 0) AS fees, SUM(CASE WHEN seller_basis IS NOT NULL THEN price - fee - seller_basis END) AS realized, SUM(CASE WHEN seller_basis IS NOT NULL THEN 1 ELSE 0 END) AS known, MAX(at) AS last FROM trades WHERE seller_id = ? AND kind <> 'swap'").bind(me).first(),
    env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(price), 0) AS volume, MAX(at) AS last FROM trades WHERE buyer_id = ? AND kind <> 'swap'").bind(me).first(),
    env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(quote), 0) AS credits, SUM(CASE WHEN basis IS NOT NULL THEN quote - basis END) AS realized, SUM(CASE WHEN basis IS NOT NULL THEN 1 ELSE 0 END) AS known FROM redemptions WHERE account_id = ?').bind(me).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM trades WHERE kind = 'swap' AND (seller_id = ? OR buyer_id = ?)").bind(me, me).first()
  ]);
  const items = cards.results;
  const specs = Array.from(new Map(items.map((i) => [keyOf(i.card_id, i.variant_id, i.skin_id), { cardId: i.card_id, variantId: i.variant_id, skinId: i.skin_id, serial: null }])).values());
  const fair = specs.length ? await fairOf(env, specs, now) : [];
  const byKey = new Map(specs.map((s, n) => [keyOf(s.cardId, s.variantId, s.skinId), fair[n]]));
  let total = 0, quick = 0, unrealized = 0, unrealizedN = 0, noBasis = 0, basisSum = 0;
  const confValue = { none: 0, low: 0, medium: 0, high: 0 };
  const holdings = items.map((i) => {
    const f = byKey.get(keyOf(i.card_id, i.variant_id, i.skin_id)), sf = serialFactor(i.serial);
    const estimate = Math.max(1, Math.round(f.average * sf)), q = quickSellQuote({ cardId: i.card_id, serial: i.serial }, f).quote;
    total += estimate; quick += q; confValue[f.confidence] += estimate;
    if (i.basis == null) noBasis++; else { unrealized += estimate - i.basis; unrealizedN++; basisSum += i.basis; }
    return { instanceId: i.id, cardId: i.card_id, name: nameOf(i.card_id), variantId: i.variant_id, cardSkinId: i.skin_id, serial: i.serial, state: i.state, basis: i.basis, acquiredVia: i.acquired_via || (i.source === 'legacy-import' ? 'beta-import' : null),
      acquiredAt: i.acquired_at, estimate, quickSell: q, confidence: f.confidence, samples: f.samples };
  });
  const confidence = total ? CONF_ORDER.slice().reverse().find((c) => confValue[c] / total >= 0.5) || (confValue.none / total > 0.5 ? 'none' : 'low') : 'none';
  const held = Object.fromEntries((holds.results || []).map((h) => [h.kind, { count: h.n, amount: h.amount }]));
  const escrowed = holdings.filter((h) => h.state === 'escrow').length;
  return {
    serverNow: now, wallet: { balance: wallet.balance, held: wallet.held, available: wallet.balance - wallet.held },
    reserved: { bids: held.bid || { count: 0, amount: 0 }, orders: held.order || { count: 0, amount: 0 }, offers: held.offer || { count: 0, amount: 0 }, cardsInEscrow: escrowed },
    cards: { count: holdings.length, owned: holdings.length - escrowed, inEscrow: escrowed, noCostBasis: noBasis, withCostBasis: unrealizedN },
    marks: { total, confidence, confidenceShare: Object.fromEntries(Object.keys(confValue).map((k) => [k, total ? confValue[k] / total : 0])), note: 'Estimated at Average Value. Not a price anyone must pay.' },
    quickSellValue: quick,
    unrealized: unrealizedN ? { change: unrealized, cards: unrealizedN, costBasis: basisSum } : null,
    realized: {
      sales: { count: sold.n, volume: sold.volume, fees: sold.fees, profit: sold.known ? sold.realized : null, withBasis: sold.known || 0, last: sold.last || null },
      quickSell: { count: redeemed.n, credits: redeemed.credits, profit: redeemed.known ? redeemed.realized : null, withBasis: redeemed.known || 0 },
      profit: (sold.known || redeemed.known) ? (sold.realized || 0) + (redeemed.realized || 0) : null,
      bought: { count: bought.n, volume: bought.volume, last: bought.last || null }, swaps: swaps.n, feesPaid: sold.fees
    },
    convention: 'Cost basis is the price paid here (a bundle split by baseline value). Imported and swapped-in cards have no cost basis. Realized profit counts only sales with a known basis, after the fee.',
    holdings: options && options.all ? holdings : holdings.slice(0, HOLDINGS_SHOWN), holdingsTruncated: !(options && options.all) && holdings.length > HOLDINGS_SHOWN,
    limits: { quickSellPerDay: RULES.quickSell.perAccountCardsPerDay }
  };
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCsv = (head, rows) => head.join(',') + '\n' + rows.map((r) => r.map(csvCell).join(',')).join('\n') + (rows.length ? '\n' : '');

// The player's own data, as a file. Counterparties appear only as their public alias; no account id or session leaves.
export async function exportData(env, who, url, now) {
  const what = url.searchParams.get('what') || 'holdings', format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json';
  if (!['holdings', 'trades', 'ledger'].includes(what)) throw new ApiError(422, 'invalid', 'Export holdings, trades or ledger.');
  const me = who.accountId;
  let head, rows, records;
  if (what === 'holdings') {
    const p = await portfolio(env, who, now, { all: true });
    head = ['serial', 'card', 'finish', 'skin', 'state', 'cost_basis', 'estimate', 'quick_sell', 'confidence', 'acquired_via', 'acquired_at'];
    records = p.holdings.map((h) => ({ serial: h.serial, card: h.name, finish: h.variantId || '', skin: h.cardSkinId || '', state: h.state, cost_basis: h.basis == null ? 'No cost basis' : h.basis, estimate: h.estimate, quick_sell: h.quickSell, confidence: h.confidence, acquired_via: h.acquiredVia || '', acquired_at: h.acquiredAt ? new Date(h.acquiredAt).toISOString() : '' }));
  } else if (what === 'trades') {
    const r = (await env.DB.prepare('SELECT t.*, s.alias AS seller_alias, b.alias AS buyer_alias FROM trades t JOIN accounts s ON s.id = t.seller_id JOIN accounts b ON b.id = t.buyer_id WHERE t.seller_id = ? OR t.buyer_id = ? ORDER BY t.at DESC, t.id LIMIT 5000').bind(me, me).all()).results;
    head = ['at', 'role', 'kind', 'card', 'cards', 'price', 'fee', 'you_receive_or_pay', 'counterparty', 'cost_basis', 'profit', 'receipt'];
    records = r.map((t) => {
      const seller = t.seller_id === me, net = seller ? t.price - t.fee : -t.price, first = JSON.parse(t.items)[0];
      return { at: new Date(t.at).toISOString(), role: seller ? 'seller' : 'buyer', kind: t.kind, card: nameOf(first.c), cards: t.item_count, price: t.price, fee: seller ? t.fee : 0, you_receive_or_pay: net,
        counterparty: seller ? t.buyer_alias : t.seller_alias, cost_basis: seller ? (t.seller_basis == null ? 'No cost basis' : t.seller_basis) : '', profit: seller && t.seller_basis != null && t.kind !== 'swap' ? t.price - t.fee - t.seller_basis : '', receipt: t.id };
    });
  } else {
    const r = (await env.DB.prepare('SELECT at, delta, reason, ref, balance_after FROM ledger WHERE account_id = ? ORDER BY id DESC LIMIT 10000').bind(me).all()).results;
    head = ['at', 'delta', 'reason', 'receipt', 'balance_after'];
    records = r.map((g) => ({ at: new Date(g.at).toISOString(), delta: g.delta, reason: g.reason, receipt: g.ref || '', balance_after: g.balance_after }));
  }
  rows = records.map((rec) => head.map((k) => rec[k]));
  const name = 'cardable-global-' + what + '-' + new Date(now).toISOString().slice(0, 10);
  return format === 'csv' ? { raw: toCsv(head, rows), contentType: 'text/csv; charset=utf-8', filename: name + '.csv' }
    : { raw: JSON.stringify({ exportedAt: now, what, count: records.length, items: records }, null, 2), contentType: 'application/json; charset=utf-8', filename: name + '.json' };
}
void baselineOf; void feeFor;
