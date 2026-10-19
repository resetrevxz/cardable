/* Cardable Market — offline simulation engine, part 2: world creation, bot behaviour, the daily rules and advance().
 * Bots are event driven: each has one next-wake time. Nothing runs per frame. */
(function (C) {
  'use strict';
  var S = C.market.sim;
  var MIN = S.MIN, HOUR = S.HOUR, DAY = S.DAY;
  var cfg = function () { return C.data.marketSim; };
  var core = function () { return C.market.core; };

  // ---- creation ------------------------------------------------------------------------------------------------------
  function blankWorld(seed, nonce, wall) {
    var s = core().hash32(String(seed) + '|' + nonce) || 1;
    return {
      v: 1, seed: String(seed), nonce: nonce, rng: s, wall0: wall || 0,
      now: 0, epoch: 0, nextId: 0, evSeq: 0, queue: [], day: -1,
      bots: [], listings: {}, closed: [], orders: {}, offers: {}, locks: {}, requests: {}, basis: {},
      trades: [], obs: {}, obsStamp: {}, daily: {}, agg: {}, feed: [], notices: [], receipts: {}, pending: [],
      minted: 0, days: [], speedNote: '', events: [], fireToday: { day: -1, n: 0 }, coach: { seen: false, nw0: null, t0: null, hist: [], lastSample: -1, done: {} },
      stats: { trades: 0, volume: 0, fees: 0, burnt: 0, allowance: 0, packs: 0, you: { sold: 0, bought: 0, earned: 0, spent: 0 } }
    };
  }
  function index(world) {
    world.botIndex = {};
    world.basis = world.basis || {};
    world.events = world.events || [];
    world.fireToday = world.fireToday || { day: -1, n: 0 };
    world.coach = world.coach || { seen: false, nw0: null, t0: null, hist: [], lastSample: -1, done: {} };
    // A world made before news existed gets its first piece of news an hour from now, so an older save is not left without any.
    if (!world.queue.some(function (e) { return e.type === 'news'; })) S.addEvent(world, world.now + HOUR, 'news', '');
    world.bots.forEach(function (b) { world.botIndex[b.id] = b; });
    // Traders get handles from the username generator; an older world is renamed once, its history rewritten to match.
    var nv = cfg().names ? cfg().names.version : 1;
    if ((world.namesV || 1) < nv) { renameBots(world); world.namesV = nv; }
    world._fair = {};
    return world;
  }

  // ---- usernames ------------------------------------------------------------------------------------------------------
  // A stable hash, never the world's random sequence, so naming changes nothing else about a world.
  function handleFor(world, bot, used, salt) {
    var n = cfg().names, h = function (tag) { return core().hash32(world.seed + '|' + world.nonce + '|' + bot.id + '|' + salt + '|' + tag) / 4294967296; };
    var pickOf = function (list, tag) { return list[Math.floor(h(tag) * list.length) % list.length]; };
    if (h('preset') < n.presetShare) {
      var free = n.presets.filter(function (p) { return !used[p.toLowerCase()]; });
      if (free.length) return pickOf(free, 'which');
    }
    var a = pickOf(n.first, 'a'), b = pickOf(n.second, 'b');
    if (used[(a + b).toLowerCase()]) return null;
    var roll = h('style'), style = n.styles[n.styles.length - 1][0], acc = 0;
    for (var i = 0; i < n.styles.length; i++) { acc += n.styles[i][1]; if (roll < acc) { style = n.styles[i][0]; break; } }
    var num = String(2 + Math.floor(h('num') * 97));
    if (style === 'camelNum') return a + b + num;
    if (style === 'snake') return a.toLowerCase() + '_' + b.toLowerCase();
    if (style === 'tag') return 'x' + a + b;
    return a + b;
  }
  function renameBots(world) {
    var used = {}, swaps = [];
    world.bots.forEach(function (bot) {
      var name = null;
      for (var salt = 0; salt < 24 && (!name || used[name.toLowerCase()]); salt++) name = handleFor(world, bot, used, salt);
      if (!name || used[name.toLowerCase()]) name = 'Trader' + bot.id.replace(/\D/g, '');
      // the base of a handle (no number, underscore or x prefix) is taken too, so there is no NeonFox beside NeonFox42
      used[name.toLowerCase()] = true; used[(/^x[A-Z]/.test(name) ? name.slice(1) : name).replace(/[_0-9]/g, '').toLowerCase()] = true;
      if (bot.alias && bot.alias !== name) swaps.push([bot.alias, name]);
      bot.alias = name;
    });
    function fix(text) { if (typeof text !== 'string') return text; swaps.forEach(function (s) { if (text.indexOf(s[0]) >= 0) text = text.split(s[0]).join(s[1]); }); return text; }
    (world.feed || []).forEach(function (f) { f.text = fix(f.text); });
    (world.notices || []).forEach(function (f) { f.text = fix(f.text); });
    Object.keys(world.offers || {}).forEach(function (id) { var o = world.offers[id]; if (o && o.note) o.note = fix(o.note); });
  }
  function uniqueAlias(world, env, used) {
    for (var tries = 0; tries < 200; tries++) {
      var a = S.pick(world, env.names.adjectives) + ' ' + S.pick(world, env.names.nouns);
      if (!used[a]) { used[a] = true; return a; }
    }
    return 'Bot ' + (Object.keys(used).length + 1);
  }
  function uniqueCode(world, used) {
    var alpha = cfg().world.codeAlphabet;
    for (var tries = 0; tries < 400; tries++) {
      var code = '';
      for (var i = 0; i < 4; i++) code += alpha.charAt(Math.floor(S.rnd(world) * alpha.length));
      if (!used[code]) { used[code] = true; return code; }
    }
    throw new Error('Could not allocate a bot serial code');
  }
  function wishFor(world, env, bot, persona) {
    var cards = env.cards, wish = [], size = persona.wish;
    function sample(list, n) {
      var pool = list.slice(), out = [];
      while (pool.length && out.length < n) out.push(pool.splice(Math.floor(S.rnd(world) * pool.length), 1)[0].id);
      return out;
    }
    if (persona.id === 'completionist') {
      var gen = S.pick(world, env.generations);
      bot.focus = { gen: gen };
      wish = sample(cards.filter(function (c) { return c.generation === gen; }), size);
    } else if (persona.id === 'specialist') {
      if (env.brands.length && S.chance(world, 0.7)) { var brand = S.pick(world, env.brands); bot.focus = { brand: brand }; wish = sample(cards.filter(function (c) { return c.brand === brand; }), size); }
      else { var g = S.pick(world, env.generations); bot.focus = { gen: g }; wish = sample(cards.filter(function (c) { return c.generation === g; }), size); }
    } else if (persona.id === 'collector') {
      wish = sample(cards.filter(function (c) { return (env.tierOf[c.id] || 0) >= 2; }), size);
    } else {
      var lo = persona.tier[0], hi = persona.tier[1];
      wish = sample(cards.filter(function (c) { var t = env.tierOf[c.id] || 0; return t >= lo && t <= hi; }), size);
    }
    return wish;
  }
  var START = { collector: [14, 26], investor: [8, 16], hunter: [6, 14], flipper: [8, 14], completionist: [16, 28], specialist: [12, 22], cautious: [8, 14], risk: [6, 12], hype: [6, 12] };

  function create(options, env) {
    var o = options || {};
    var world = blankWorld(o.seed != null ? o.seed : 'cardable', o.nonce || 1, o.wall || 0);
    var c = cfg(), personas = c.personas, usedAlias = {}, usedCode = {};
    if (o.reservedCodes) o.reservedCodes.forEach(function (x) { usedCode[x] = true; });
    for (var i = 0; i < c.world.bots; i++) {
      var persona = personas[i % personas.length];
      var bot = { id: 'b' + String(i + 1).padStart(2, '0'), alias: uniqueAlias(world, env, usedAlias), persona: persona.id, code: uniqueCode(world, usedCode), serial: 100 + Math.floor(S.rnd(world) * 2400),
        credits: 0, held: {}, inv: [], wish: [], focus: null, nextWake: 0, open: 0, soldRecent: {}, stats: { bought: 0, sold: 0, net: 0 } };
      bot.wish = wishFor(world, env, bot, persona);
      var range = START[persona.id] || [8, 14], n = Math.round(S.between(world, range[0], range[1])), value = 0;
      for (var j = 0; j < n; j++) {
        var it = S.mintItem(world, env, bot, 0, 'start');
        // Wish cards the bot already holds are the ones it keeps; give some of them to the start of the set.
        if (bot.wish.length && S.chance(world, 0.12)) { it.c = S.pick(world, bot.wish); }
        it.u = S.baselineFor(env, it.c, it.v, it.k) * S.between(world, 0.8, 1.05);
        value += it.u; bot.inv.push(it);
      }
      bot.credits = Math.round(value * S.between(world, 0.45, 1.1) + c.economy.allowance.reserveBase * S.between(world, 0.8, 1.4));
      world.bots.push(bot);
      S.addEvent(world, Math.round(S.between(world, 0, persona.wake[1]) * HOUR), 'wake', bot.id);
    }
    S.addEvent(world, DAY, 'day', '');
    S.addEvent(world, Math.round(S.between(world, 0.5, cfg().events.gapHours[1]) * HOUR), 'news', '');
    index(world);
    world.minted = 0;
    return world;
  }

  // ---- news ----------------------------------------------------------------------------------------------------------
  // A piece of news names a group of cards and moves what bots will pay (and ask) for them for a while. Nothing is invented
  // for the player: the same shift is what the bots act on, and trades are what move Average Value afterwards.
  function tierNames(env) {
    if (env._tierNames) return env._tierNames;
    var out = {};
    env.cards.forEach(function (c) { var r = env.rarityById[c.rarity], t = env.tierOf[c.id] || 0; if (r && !out[t]) out[t] = r.name; });
    env._tierNames = out;
    return out;
  }
  var BRANDS = { amd: 'AMD', nvidia: 'NVIDIA', intel: 'Intel', apple: 'Apple', qualcomm: 'Qualcomm', arm: 'Arm', ati: 'ATI', '3dfx': '3dfx', matrox: 'Matrox', s3: 'S3' };
  function brandName(b) { var key = String(b).toLowerCase(); return BRANDS[key] || (key.charAt(0).toUpperCase() + key.slice(1)); }
  function generationName(id) {
    var g = (C.data.generations || []).find(function (x) { return x.id === id; });
    return g && g.name ? g.name : id;
  }
  function inScope(scope, card, tier) {
    if (!card) return false;
    if (scope.card) return card.id === scope.card;
    if (scope.brand) return card.brand === scope.brand;
    if (scope.gen) return card.generation === scope.gen;
    if (scope.tierLo != null) return tier >= scope.tierLo && tier <= scope.tierHi;
    return false;
  }
  function scopeCards(env, scope) { return env.cards.filter(function (c) { return inScope(scope, c, env.tierOf[c.id] || 0); }); }
  // How strongly an event is acting at time t: 0 before it starts, a ramp up, full, then a fade after it ends.
  function strength(e, t) {
    var ev = cfg().events;
    if (t < e.start) return 0;
    if (t <= e.end) return Math.min(1, (t - e.start) / (ev.rampHours * HOUR));
    return Math.max(0, 1 - (t - e.end) / (ev.afterHours * HOUR));
  }
  // The multiplier news puts on one card's price for one bot (bot null: the average bot). 1 means no news applies.
  function eventFactor(world, env, it, bot) {
    var list = world.events;
    if (!list || !list.length) return 1;
    var card = env.cardById[it.c], tier = env.tierOf[it.c] || 0, m = 1, react = cfg().events.react, p = bot ? S.personaOf(bot) : null;
    for (var i = 0; i < list.length; i++) {
      var e = list[i], k = strength(e, world.now);
      if (!k || !inScope(e.scope, card, tier)) continue;
      var sens = p ? (react[p.id] != null ? react[p.id] : 0.7) : 0.7;
      m *= 1 + e.mag * k * sens;
    }
    return m;
  }
  // Public: the news that is announced or acting now, newest first, each with what it is doing at this moment.
  function activeNews(world) {
    var ev = cfg().events;
    return (world.events || []).filter(function (e) { return world.now <= e.end + ev.afterHours * HOUR; })
      .map(function (e) { return Object.assign({}, e, { phase: world.now < e.start ? 'coming' : world.now <= e.end ? 'acting' : 'fading', strength: strength(e, world.now) }); })
      .sort(function (a, b) { return b.announced - a.announced; });
  }
  function pickWeighted(world, list) {
    var total = list.reduce(function (n, x) { return n + x.weight; }, 0), r = S.rnd(world) * total;
    for (var i = 0; i < list.length; i++) { r -= list[i].weight; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function makeScope(world, env, kind) {
    var cards = env.cards;
    if (kind.id === 'brand' && env.brands.length) { var b = S.pick(world, env.brands); return { scope: { brand: b }, label: brandName(b) }; }
    if (kind.id === 'generation' && env.generations.length) { var g = S.pick(world, env.generations); return { scope: { gen: g }, label: generationName(g) }; }
    if (kind.id === 'tier') {
      var tiers = tierNames(env), keys = Object.keys(tiers).map(Number).sort(function (a, b) { return a - b; }).filter(function (t) { return t >= 1; });
      if (keys.length) { var lo = S.pick(world, keys), hi = Math.min(keys[keys.length - 1], lo + (S.chance(world, 0.5) ? 1 : 0)); return { scope: { tierLo: lo, tierHi: hi }, label: lo === hi ? tiers[lo] : tiers[lo] + ' and ' + tiers[hi] }; }
    }
    var c = S.pick(world, cards.filter(function (x) { return (env.tierOf[x.id] || 0) >= 1; }));
    return { scope: { card: c.id }, label: c.name };
  }
  function newsTick(world, env, host) {
    var ev = cfg().events, now = world.now;
    world.events = (world.events || []).filter(function (e) { return now <= e.end + ev.afterHours * HOUR + 6 * HOUR; });
    var live = world.events.filter(function (e) { return now <= e.end; }).length;
    if (live < ev.maxActive) {
      for (var tries = 0; tries < 8; tries++) {
        var kind = pickWeighted(world, ev.kinds), where = makeScope(world, env, pickWeighted(world, ev.scopes));
        var n = scopeCards(env, where.scope).length;
        if (n < (where.scope.card ? 1 : ev.minCards)) continue;
        // The same group is not in the news twice at once.
        if (world.events.some(function (e) { return JSON.stringify(e.scope) === JSON.stringify(where.scope) && now <= e.end; })) continue;
        var mag = Math.round(S.between(world, kind.mag[0], kind.mag[1]) * 100) / 100;
        var lead = Math.round(S.between(world, kind.leadHours[0], kind.leadHours[1]) * HOUR), dur = Math.round(S.between(world, kind.hours[0], kind.hours[1]) * HOUR);
        var up = mag > 0, pct = Math.round(Math.abs(mag) * 100 / 5) * 5;
        var e2 = { id: S.nextId(world, 'N'), kind: kind.id, scope: where.scope, label: where.label, mag: mag, announced: now, start: now + lead, end: now + lead + dur, cards: n,
          headline: up ? where.label + ' demand is rising' : where.label + ' prices are slipping',
          detail: up ? 'About ' + pct + '% more expected. Buy before it starts.' : 'About ' + pct + '% less expected. Hold off, or sell first.' };
        world.events.push(e2);
        S.feed(world, 'news', e2.headline + ' \u00b7 about ' + pct + '% ' + (up ? 'up' : 'down'), { news: e2.id });
        break;
      }
    }
    S.addEvent(world, now + Math.round(S.between(world, ev.gapHours[0], ev.gapHours[1]) * HOUR), 'news', '');
  }

  // ---- decisions -----------------------------------------------------------------------------------------------------
  function privateValue(world, env, bot, it, persona) {
    var fair = S.fairInfo(world, env, it.c, it.v, it.k);
    var noise = 1 + cfg().valuation.botNoise * (S.stableUnit(bot.id + '|' + S.itemKey(it)) * 2 - 1);
    var v = fair.average * S.serialFactor(it.s) * noise * eventFactor(world, env, it, bot);
    var wished = bot.wish.indexOf(it.c) >= 0;
    if (wished) v *= 1 + (persona.id === 'completionist' ? 0.3 : persona.id === 'collector' ? 0.18 : 0.08);
    if (persona.trend) {
      var ch = recentChange(world, it);
      if (ch != null) v *= 1 + persona.trend * S.clamp(ch, -0.3, 0.3);
    }
    var tier = env.tierOf[it.c] || 0;
    if (tier < persona.tier[0] || tier > persona.tier[1]) v *= 0.82;
    if (bot.focus && !wished) {
      var card = env.cardById[it.c];
      if (bot.focus.brand && card && card.brand !== bot.focus.brand) v *= 0.8;
      if (bot.focus.gen && card && card.generation !== bot.focus.gen) v *= 0.8;
    }
    return { value: v, fair: fair.average, wished: wished, confidence: fair.confidence };
  }
  // Change of the last trade against the average of the trades before it: only from observed trades.
  function recentChange(world, it) {
    var obs = world.obs[S.itemKey(it)];
    if (!obs || obs.length < 3) return null;
    var last = obs[obs.length - 1][1], prior = 0, n = Math.min(4, obs.length - 1);
    for (var i = 0; i < n; i++) prior += obs[obs.length - 2 - i][1];
    prior /= n;
    return prior ? (last - prior) / prior : null;
  }
  function interested(world, env, bot, it) {
    var p = S.personaOf(bot), tier = env.tierOf[it.c] || 0;
    if (bot.wish.indexOf(it.c) >= 0) return true;
    if (tier < p.tier[0] || tier > p.tier[1]) return false;
    var card = env.cardById[it.c];
    if (bot.focus && card) {
      if (bot.focus.brand && card.brand !== bot.focus.brand) return false;
      if (bot.focus.gen && card.generation !== bot.focus.gen) return false;
    }
    return true;
  }
  function openListings(world, exclude) {
    var out = [];
    for (var id in world.listings) { var l = world.listings[id]; if (l.status === 'open' && l.seller !== exclude && world.now < l.endsAt) out.push(l); }
    out.sort(function (a, b) { return a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1); });
    return out;
  }

  // What a trader looks at when it wakes: its best leads first (the cheapest against what it thinks the card is worth, an
  // auction that closes soon, a card it wants), then a random handful so it still stumbles on things.
  function scout(world, env, bot, persona, cands) {
    var st = cfg().strategy, scanN = st ? st.scan[persona.id] || 14 : 14, smartN = st ? Math.min(scanN, st.smart[persona.id] || 0) : 0, picked = [];
    if (smartN) {
      var scored = [];
      cands.forEach(function (l, i) {
        if (l.kind === 'swap' || l.items.length !== 1) return;
        var it = l.items[0];
        if (!interested(world, env, bot, it)) return;
        var fair = S.fairInfo(world, env, it.c, it.v, it.k).average * S.serialFactor(it.s);
        if (!(fair > 0)) return;
        var ratio = S.currentPrice(l) / fair;
        if (l.kind === 'auction' && l.endsAt - world.now < 2 * HOUR) ratio -= 0.06;
        if (bot.wish.indexOf(it.c) >= 0) ratio -= 0.1;
        scored.push({ i: i, r: ratio });
      });
      scored.sort(function (a, b) { return a.r - b.r || a.i - b.i; });
      var take = {};
      scored.slice(0, smartN).forEach(function (s) { take[s.i] = true; picked.push(cands[s.i]); });
      cands = cands.filter(function (_, i) { return !take[i]; });
    }
    var rest = Math.min(cands.length, scanN - picked.length);
    for (var k = 0; k < rest; k++) picked.push(cands.splice(Math.floor(S.rnd(world) * cands.length), 1)[0]);
    return picked;
  }
  // The cheapest competing fixed-price copy of the same card and finish, by anyone but this seller.
  function lowestAsk(world, it, seller) {
    var low = null;
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.status !== 'open' || l.kind !== 'fixed' || l.seller === seller || l.items.length !== 1 || world.now >= l.endsAt) continue;
      var x = l.items[0];
      if (x.c === it.c && (x.v || null) === (it.v || null) && (low == null || l.ask < low)) low = l.ask;
    }
    return low;
  }
  function undercuts(persona) { var st = cfg().strategy; return !!(st && st.undercut[persona.id]); }
  function wishers(world, cardId, except) { var n = 0; world.bots.forEach(function (b) { if (b.id !== except && b.wish.indexOf(cardId) >= 0) n++; }); return n; }
  // A fixed-price listing well under Average Value (the player's or a trader's) sends a bargain hunter or two to look soon.
  function alertScouts(world, env, l) {
    var st = cfg().strategy, bg = st && st.bargain;
    if (!bg || !l || l.kind !== 'fixed' || l.items.length !== 1) return 0;
    var it = l.items[0], fair = S.fairInfo(world, env, it.c, it.v, it.k).average * S.serialFactor(it.s);
    if (!(fair > 0) || l.ask > fair * (1 - bg.belowFair)) return 0;
    var hunters = world.bots.filter(function (b) { return b.id !== l.seller && bg.personas.indexOf(b.persona) >= 0 && S.botAvailable(b) >= l.ask; });
    var sent = 0;
    for (var i = 0; i < hunters.length && sent < bg.scouts; i++) {
      var b = hunters[(i + Math.floor(S.stableUnit(l.id + '|scout') * hunters.length)) % hunters.length];
      if (!interested(world, env, b, it)) continue;
      S.addEvent(world, world.now + Math.round(S.between(world, bg.delayMin[0], bg.delayMin[1]) * MIN), 'scout', b.id, { listing: l.id });
      sent++;
    }
    return sent;
  }

  function buyPass(world, env, host, bot, persona, only) {
    var picked = only || scout(world, env, bot, persona, openListings(world, bot.id));
    var best = null;
    picked.forEach(function (l) {
      if (l.kind === 'swap') return;
      if (l.items.length !== 1) return;
      var it = l.items[0];
      if (bot.soldRecent[S.itemKey(it)] && world.now - bot.soldRecent[S.itemKey(it)] < 3 * DAY) return;
      if (!interested(world, env, bot, it)) return;
      var pv = privateValue(world, env, bot, it, persona);
      var need = persona.buyMargin + (pv.wished ? -0.04 : 0) + (pv.confidence === 'none' ? 0.04 : 0);
      var price = S.currentPrice(l);
      var ceiling = Math.floor(pv.value * (1 - need));
      var avail = S.botAvailable(bot);
      if (l.kind === 'fixed') {
        if (l.ask <= ceiling && l.ask <= avail && (l.ask <= avail * persona.spend + 1 || pv.wished && l.ask <= avail * 0.85)) {
          var margin = (ceiling - l.ask) / Math.max(1, ceiling);
          if (!best || margin > best.margin) best = { l: l, margin: margin, how: 'fixed', pv: pv };
        }
      } else if (l.kind === 'auction') {
        var view = S.auctionView(l);
        if (view.lead && view.lead.by === bot.id) return;
        var minNext = view.bidders ? view.price + S.incrementFor(view.price) : l.start;
        var max = Math.min(ceiling, Math.floor(avail * (pv.wished ? 0.85 : persona.spend + 0.15)));
        // A crowded auction tends to finish above what the card is worth: shade the maximum unless the card is wanted.
        var st = cfg().strategy;
        if (st && !pv.wished && view.bidders >= st.crowdedBidders) max = Math.min(max, Math.floor(pv.value * (1 - need - st.crowdedShade)));
        if (max >= minNext) {
          var m2 = (ceiling - minNext) / Math.max(1, ceiling);
          if (!best || m2 > best.margin) best = { l: l, margin: m2, how: 'bid', max: max, pv: pv };
        }
      }
    });
    if (!best) return;
    if (best.how === 'fixed') {
      if (best.l.kind === 'fixed' && best.l.status === 'open') S.completeSale(world, env, host, best.l, { buyer: bot.id, price: best.l.ask, kind: 'fixed' });
    } else {
      var remaining = best.l.endsAt - world.now, total = best.l.endsAt - best.l.createdAt;
      if (S.chance(world, persona.snipe) && remaining > Math.max(20 * MIN, total * 0.15)) {
        var at = best.l.endsAt - Math.max(3 * MIN, Math.round(total * S.between(world, 0.01, 0.05)));
        S.addEvent(world, at, 'snipe', bot.id, { listing: best.l.id, max: best.max });
      } else {
        S.placeBid(world, env, host, best.l, bot.id, best.max);
      }
    }
  }

  function fireSaleAllowed(world, bot, persona) {
    var fs = cfg().fireSale, day = S.dayIndex(world.now);
    if (world.fireToday.day !== day) world.fireToday = { day: day, n: 0 };
    if (persona.quotes || persona.id === 'collector' || persona.id === 'completionist') return false;
    return world.fireToday.n < fs.perDay && S.chance(world, fs.chance);
  }
  function listItem(world, env, host, bot, persona, it, needCash) {
    var fair = S.fairInfo(world, env, it.c, it.v, it.k), sf = S.serialFactor(it.s);
    var value = fair.average * sf;
    var tier = env.tierOf[it.c] || 0, lp = cfg().listing;
    // A card several traders want sells best to a crowd: put it up for auction more often, with a firmer start.
    var demand = cfg().strategy ? wishers(world, it.c, bot.id) >= cfg().strategy.demandWishers : false;
    var wantsAuction = tier >= 1 && !needCash && S.chance(world, Math.min(0.85, persona.auction * (lp.auctionShare || 1) * (demand ? 1.8 : 1)));
    // Asks scatter around fair value: a little below to a little above, wider for bolder personalities.
    var markup = persona.markup * (S.rnd(world) - 0.3);
    if (needCash) markup = Math.min(markup, -0.03);
    var cost = it.u || 0;
    var why = needCash ? 'Needed Credits' : fair.confidence === 'none' ? 'Priced from the baseline estimate' : 'Priced from recent sales';
    bot.inv = bot.inv.filter(function (x) { return x !== it; });
    if (wantsAuction) {
      var dur = S.pick(world, lp.auctionHours) * HOUR;
      var start = Math.max(1, S.nice(value * S.between(world, 0.5, 0.78) * (demand ? 1.12 : 1)));
      var reserve = S.chance(world, 0.4) ? Math.max(start, S.nice(value * S.between(world, 0.82, 1.0))) : null;
      var buyout = S.chance(world, 0.15) ? S.nice(value * S.between(world, 1.2, 1.45)) : null;
      var l = S.makeListing(world, { kind: 'auction', seller: bot.id, items: [it], start: start, reserve: reserve, buyout: buyout, durationMs: dur, reason: why });
      bot.open += 1;
      S.feed(world, 'listed', bot.alias + ' put ' + S.cardLabel(env, it) + ' up for auction from ' + start + ' Credits', { listing: l.id });
      return l;
    }
    // Sellers follow part of the shift in their own price, and a fire sale is a seller who needs Credits now.
    var shift = eventFactor(world, env, it, null);
    if (shift !== 1) value *= 1 + (shift - 1) * cfg().events.askFollow;
    var fire = !needCash && fireSaleAllowed(world, bot, persona);
    if (fire) { var fsd = cfg().fireSale.discount; markup = -S.between(world, fsd[0], fsd[1]); why = 'Needs Credits quickly'; world.fireToday.n += 1; }
    var ask = S.nice(value * (1 + markup));
    if (cost && persona.id === 'flipper' && !fire) ask = Math.max(ask, S.nice(cost * 1.03));
    // Read the book: a seller who undercuts prices a step under the cheapest competing copy (never below its floor);
    // a patient one does not chase a cheap copy down and keeps to what the card is worth.
    var low = fire ? null : lowestAsk(world, it, bot.id);
    if (low != null && ask > low) {
      if (undercuts(persona)) {
        var floorAsk = Math.max(cfg().economy.minPrice, S.nice(value * (needCash ? 0.7 : 0.86)), cost && persona.id === 'flipper' ? S.nice(cost * 1.01) : 0);
        ask = Math.max(floorAsk, Math.min(ask, low - Math.max(1, Math.round(low * 0.02))));
        why = 'Priced under the cheapest copy';
      } else if (low < value * 0.9) ask = Math.max(ask, S.nice(value));
    }
    ask = Math.max(cfg().economy.minPrice, ask);
    var days = S.between(world, lp.fixedDurationDays[0], lp.fixedDurationDays[1]);
    if (fire) days = Math.min(days, 3);
    var l2 = S.makeListing(world, { kind: 'fixed', seller: bot.id, items: [it], ask: ask, durationMs: Math.round(days * DAY), reason: why });
    l2.pricedAt = world.now;
    if (fire) { l2.fire = true; l2.fairAt = Math.round(value); }
    bot.open += 1;
    S.feed(world, 'listed', bot.alias + ' listed ' + S.cardLabel(env, it) + ' at ' + ask + ' Credits', { listing: l2.id });
    S.matchOrdersFor(world, env, host, l2);
    if (l2.status === 'open') alertScouts(world, env, l2);
    return l2;
  }
  function sellPass(world, env, host, bot, persona) {
    var lp = cfg().listing;
    if (bot.open >= lp.maxOpenPerBot) return;
    var needCash = S.botAvailable(bot) < 25;
    var candidates = bot.inv.filter(function (it) {
      if (world.locks[it.i]) return false;
      var wished = bot.wish.indexOf(it.c) >= 0;
      if (wished && S.stableUnit(it.i + 'keep') < persona.keep) return false;
      var age = world.now - (it.a || 0);
      var hold = (persona.holdDays[0] + S.stableUnit(it.i + 'hold') * (persona.holdDays[1] - persona.holdDays[0])) * DAY;
      return needCash || age >= hold || !interested(world, env, bot, it) && age >= hold * 0.4;
    });
    if (!candidates.length) return;
    var n = Math.min(candidates.length, needCash ? 2 : 1 + (S.chance(world, 0.25) ? 1 : 0), lp.maxOpenPerBot - bot.open);
    for (var i = 0; i < n; i++) {
      var it = candidates.splice(Math.floor(S.rnd(world) * candidates.length), 1)[0];
      if (it) listItem(world, env, host, bot, persona, it, needCash);
    }
  }
  function manageOwn(world, env, host, bot, persona) {
    var staleMs = S.clamp((persona.wake[0] + persona.wake[1]) / 2 * 5, 10, 96) * HOUR;
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.seller !== bot.id || l.status !== 'open' || l.kind !== 'fixed') continue;
      if (world.now - (l.pricedAt || l.createdAt) < staleMs) continue;
      var fair = S.fairInfo(world, env, l.items[0].c, l.items[0].v, l.items[0].k).average * S.serialFactor(l.items[0].s);
      var floor = Math.max(cfg().economy.minPrice, S.nice(fair * 0.8)), cost = l.items[0].u || 0;
      if (persona.id === 'flipper' && cost) floor = Math.max(floor, S.nice(cost * 0.97));
      if (l.ask > floor) {
        var step = S.between(world, 0.04, 0.1), target = S.nice(l.ask * (1 - step));
        // an undercutter that is beaten by a cheaper copy moves to just under it rather than by a blind step
        var rival = undercuts(persona) ? lowestAsk(world, l.items[0], bot.id) : null;
        if (rival != null && rival < l.ask) target = Math.min(target, rival - Math.max(1, Math.round(rival * 0.02)));
        l.ask = Math.max(floor, Math.min(l.ask - 1, target));
        l.pricedAt = world.now;
        S.matchOrdersFor(world, env, host, l);
      } else l.pricedAt = world.now;
    }
  }
  function orderPass(world, env, host, bot, persona) {
    var mine = 0;
    for (var id in world.orders) if (world.orders[id].owner === bot.id && world.orders[id].status === 'open') mine++;
    if (mine >= cfg().listing.maxOrdersPerBot || !S.chance(world, 0.22)) return;
    var pool = persona.quotes
      ? env.cards.filter(function (c) { var t = env.tierOf[c.id] || 0; return t >= persona.tier[0] && t <= persona.tier[1]; })
      : env.cards.filter(function (c) { return bot.wish.indexOf(c.id) >= 0 && !bot.inv.some(function (x) { return x.c === c.id; }); });
    // A market maker quotes where the trading is: the cards with the most recent sales, when there are any.
    if (persona.quotes && pool.length > 8) {
      var busy = pool.map(function (c) { var o = world.obs[S.itemKey({ c: c.id, v: null, k: null })]; return { c: c, n: o ? o.length : 0 }; }).filter(function (x) { return x.n >= 3; });
      if (busy.length >= 4) pool = busy.sort(function (a, b) { return b.n - a.n; }).slice(0, 12).map(function (x) { return x.c; });
    }
    if (!pool.length) return;
    var card = S.pick(world, pool), fair = S.fairInfo(world, env, card.id, null, null).average;
    var price = Math.max(cfg().economy.minPrice, S.nice(fair * (1 - persona.buyMargin - S.between(world, 0.02, 0.1))));
    if (price > S.botAvailable(bot) * persona.spend + 1) return;
    var days = S.between(world, cfg().listing.buyOrderDays[0], cfg().listing.buyOrderDays[1]);
    S.openOrder(world, env, host, bot.id, { c: card.id, v: null, maxPrice: price, durationMs: Math.round(days * DAY) });
    S.feed(world, 'order', bot.alias + ' placed a buy order for ' + card.name + ' up to ' + price + ' Credits', {});
  }
  function swapPass(world, env, host, bot, persona) {
    // Answer standing swap listings from the player with an offer of equal value, when the bot wants the card.
    for (var id in world.listings) {
      var l = world.listings[id];
      if (l.seller !== 'you' || l.kind !== 'swap' || l.status !== 'open') continue;
      if (l.offers.some(function (oid) { var of = world.offers[oid]; return of && of.from === bot.id && of.status === 'pending'; })) continue;
      if (!S.chance(world, 0.3)) continue;
      var want = l.items[0], wv = S.itemWorth(world, env, want);
      if (!interested(world, env, bot, want)) continue;
      var give = bot.inv.filter(function (it) { return !world.locks[it.i] && bot.wish.indexOf(it.c) < 0; }).map(function (it) { return { it: it, w: S.itemWorth(world, env, it) }; })
        .filter(function (x) { return x.w >= wv * 0.9 && x.w <= wv * 1.25; }).sort(function (a, b) { return a.w - b.w; });
      if (!give.length) continue;
      var offer = { id: S.nextId(world, 'F'), from: bot.id, to: 'you', listingId: l.id, give: [give[0].it], get: l.items.slice(), cashFrom: 0, status: 'pending', createdAt: world.now,
        expiresAt: world.now + cfg().listing.offerExpiryDays * DAY, note: persona.label + ' offers a swap' };
      world.offers[offer.id] = offer; l.offers.push(offer.id);
      world.locks[give[0].it.i] = 'offer:' + offer.id;
      S.addEvent(world, offer.expiresAt, 'offerEnd', offer.id);
      S.notify(world, 'offer', S.aliasOf(world, bot.id) + ' offered ' + S.cardLabel(env, give[0].it) + ' for your ' + S.cardLabel(env, want) + '.', { listing: l.id, offer: offer.id });
      return;
    }
    // Put a spare duplicate up as a swap for a card on its wish list.
    if (bot.open >= cfg().listing.maxOpenPerBot || !S.chance(world, 0.08)) return;
    var spares = bot.inv.filter(function (it) { return !world.locks[it.i] && bot.inv.filter(function (x) { return x.c === it.c; }).length > 1; });
    var targets = bot.wish.filter(function (id2) { return !bot.inv.some(function (x) { return x.c === id2; }); });
    if (!spares.length || !targets.length) return;
    var it2 = spares[0], target = S.pick(world, targets);
    bot.inv = bot.inv.filter(function (x) { return x !== it2; });
    var l2 = S.makeListing(world, { kind: 'swap', seller: bot.id, items: [it2], durationMs: Math.round(S.between(world, 3, 8) * DAY), wants: { cardId: target, minFrac: cfg().listing.swapMinFrac }, reason: persona.label + ' wants a specific card' });
    bot.open += 1;
    S.feed(world, 'listed', bot.alias + ' offered ' + S.cardLabel(env, it2) + ' for a swap', { listing: l2.id });
  }

  function botWake(world, env, host, bot) {
    var persona = S.personaOf(bot);
    manageOwn(world, env, host, bot, persona);
    sellPass(world, env, host, bot, persona);
    buyPass(world, env, host, bot, persona);
    orderPass(world, env, host, bot, persona);
    swapPass(world, env, host, bot, persona);
    S.addEvent(world, world.now + Math.max(MIN * 5, Math.round(S.between(world, persona.wake[0], persona.wake[1]) * HOUR)), 'wake', bot.id);
  }

  // ---- offers answered by bots ---------------------------------------------------------------------------------------
  function botAnswersOffer(world, env, host, offer) {
    if (offer.status !== 'pending') return;
    var l = world.listings[offer.listingId], bot = S.botOf(world, offer.to);
    if (!l || l.status !== 'open' || !bot) { S.closeOffer(world, offer, 'declined', 'The listing is no longer open'); return; }
    var p = S.personaOf(bot), wantWorth = S.setsWorth(world, env, offer.get), giveWorth = S.setsWorth(world, env, offer.give) + (offer.cashFrom || 0);
    var wanted = l.wants && offer.give.some(function (it) { return it.c === l.wants.cardId; });
    var need = (l.wants ? l.wants.minFrac : cfg().listing.swapMinFrac) * (wanted ? 0.7 : 1);
    // Both sides must still hold what they agreed to trade.
    var stillThere = offer.give.every(function (it) { return !!host.instance(it.i); });
    if (!stillThere) { S.closeOffer(world, offer, 'withdrawn', 'The offered card is gone'); return; }
    if (giveWorth >= wantWorth * need) {
      acceptSwap(world, env, host, offer, l);
    } else if (giveWorth >= wantWorth * 0.6 && p.id !== 'cautious') {
      var gap = Math.ceil(wantWorth * need - giveWorth);
      offer.status = 'countered'; offer.cashFrom = (offer.cashFrom || 0) + gap; offer.counteredAt = world.now;
      offer.note = bot.alias + ' would do it with ' + gap + ' more Credits';
      S.notify(world, 'counter', bot.alias + ' countered: add ' + gap + ' Credits to swap for ' + S.cardLabel(env, offer.get[0]) + '.', { listing: l.id, offer: offer.id });
    } else {
      S.closeOffer(world, offer, 'declined', bot.alias + ' declined');
      S.notify(world, 'declined', bot.alias + ' declined your swap for ' + S.cardLabel(env, offer.get[0]) + '.', { listing: l.id, offer: offer.id });
    }
  }
  // Moves cards both ways. The player's side goes through the save in one settlement.
  function acceptSwap(world, env, host, offer, l) {
    var from = offer.from, to = offer.to, youGive = from === 'you', youGet = to === 'you';
    var cash = offer.cashFrom || 0, cashFee = cash > 0 ? S.fee(cash) : 0;
    var botSide = S.botOf(world, youGive ? to : from);
    if (!botSide) return false;
    var effect = { receiptId: 'R-' + world.nonce.toString(36) + '-' + offer.id, kind: 'swap', listingId: l.id, at: world.now, remove: [], add: [], delta: 0, reason: 'market swap', price: cash, fee: cashFee, items: [] };
    var playerItems = youGive ? offer.give : offer.get, botItems = youGive ? offer.get : offer.give;
    effect.remove = playerItems.map(function (it) { return it.i; });
    effect.add = botItems.map(function (it) { return S.instanceFrom(it, world.now, world); });
    effect.items = playerItems.concat(botItems).map(function (it) { return { i: it.i, c: it.c, v: it.v, k: it.k, s: it.s }; });
    // cash flows from the proposer to the recipient; the recipient's fee is taken from it
    var playerPays = youGive ? cash : 0, playerGets = youGive ? 0 : cash - cashFee;
    if (youGive && cash > 0 && host.balance() < cash) { S.closeOffer(world, offer, 'declined', 'Not enough Credits'); return false; }
    effect.delta = playerGets - playerPays;
    if (host.sign) host.sign(effect);
    world.receipts[effect.receiptId] = { state: 'pending', t: world.now, effect: effect, swap: offer.id };
    world.pending.push(effect.receiptId);
    offer.status = 'settling'; offer.settleId = effect.receiptId;
    var ok = false;
    try { ok = host.settle(effect) === true; } catch (_) { ok = false; }
    if (!ok) { world.receipts[effect.receiptId].attempts = 1; return false; }
    S.finishSwap(world, env, offer, l, effect.receiptId);
    return true;
  }
  function finishSwap(world, env, offer, l, receiptId) {
    var rec = world.receipts[receiptId];
    if (rec) { rec.state = 'done'; rec.doneAt = world.now; }
    world.pending = world.pending.filter(function (id) { return id !== receiptId; });
    var youGive = offer.from === 'you', bot = S.botOf(world, youGive ? offer.to : offer.from);
    var cash = offer.cashFrom || 0, cashFee = cash > 0 ? S.fee(cash) : 0;
    if (bot) {
      var theirs = youGive ? offer.get : offer.give;
      theirs.forEach(function (it) { S.removeFromInv(bot, it.i); delete world.locks[it.i]; });
      var received = youGive ? offer.give : offer.get;
      received.forEach(function (it) { it.a = world.now; it.u = 0; bot.inv.push(it); });
      if (youGive && cash > 0) bot.credits += cash - cashFee;
      if (!youGive && cash > 0) bot.credits -= cash;
      bot.stats.sold += 1; bot.stats.bought += 1;
    }
    if (cash > 0) world.stats.burnt += cashFee;
    (youGive ? offer.give : offer.get).forEach(function (it) { delete world.locks[it.i]; });
    offer.status = 'accepted'; offer.closedAt = world.now;
    if (l) {
      var bundle = l.items.slice();
      if (l.seller !== 'you') { var sb = S.botOf(world, l.seller); if (sb) { sb.open = Math.max(0, sb.open - 1); } }
      l.items = l.items; l.swappedFor = offer.id;
      S.finishListing(world, l, 'sold');
      l.soldFor = 0;
    }
    // A swap is a barter. It is shown in history but is not a priced sale, so it adds no price observation.
    world.stats.swaps = (world.stats.swaps || 0) + 1;
    var give = offer.give[0], get = offer.get[0];
    S.feed(world, 'swap', S.aliasOf(world, offer.from) + ' swapped ' + S.cardLabel(env, give) + ' with ' + S.aliasOf(world, offer.to) + ' for ' + S.cardLabel(env, get), { you: offer.from === 'you' || offer.to === 'you' });
    S.notify(world, 'swapped', 'Swap complete: ' + S.cardLabel(env, youGive ? give : get) + ' for ' + S.cardLabel(env, youGive ? get : give) + '.', { listing: l && l.id, offer: offer.id });
  }

  // ---- the daily rules: the only places Credits and cards enter ------------------------------------------------------
  // Finished orders and offers are history, not state: keep a few days of them (two weeks of the player's own).
  function pruneClosed(world) {
    var short = world.now - 3 * DAY, long = world.now - 14 * DAY, id;
    for (id in world.orders) {
      var o = world.orders[id];
      if (o.status === 'open') continue;
      var at = o.closedAt || o.expiresAt || o.createdAt || 0;
      if (at < (o.owner === 'you' ? long : short)) delete world.orders[id];
    }
    for (id in world.offers) {
      var of = world.offers[id];
      if (of.status === 'pending' || of.status === 'countered' || of.status === 'settling') continue;
      var when = of.closedAt || of.expiresAt || of.createdAt || 0;
      if (when < (of.from === 'you' || of.to === 'you' ? long : short)) delete world.offers[id];
    }
  }
  function dailyTick(world, env, host) {
    var c = cfg(), a = c.economy.allowance, issued = 0, opened = 0;
    var dayNo = S.dayIndex(world.now);
    // Allowance: top a bot up toward its reserve, never past it, within a daily cap. Visible in the totals.
    world.bots.forEach(function (bot) {
      var p = S.personaOf(bot), wealth = bot.credits + bot.inv.length * 20;
      var reserve = (a.reserveBase + wealth * a.reserveScale * 0.1) * p.allowance;
      var gap = reserve - bot.credits;
      if (gap > 0) { var give = Math.min(Math.ceil(gap), a.dailyCap * p.allowance); bot.credits += give; issued += give; }
    });
    world.stats.allowance += issued;
    pruneClosed(world);
    // Packs: bounded per bot and across the world.
    var pk = c.economy.packs, budget = pk.worldPerDay;
    var order = world.bots.slice().sort(function () { return S.rnd(world) - 0.5; });
    for (var i = 0; i < order.length && budget > 0; i++) {
      var bot = order[i], p2 = S.personaOf(bot), n = 0, expected = pk.perBotPerDay * p2.packs;
      while (n < pk.maxPerBotPerDay && budget > 0 && S.chance(world, expected / (n + 1))) {
        for (var j = 0; j < pk.cardsPerPack; j++) { var it = S.mintItem(world, env, bot, world.now, 'pack'); it.u = 0; bot.inv.push(it); }
        n += 1; budget -= 1; opened += 1;
      }
    }
    world.stats.packs += opened;
    var credits = world.bots.reduce(function (s, b) { return s + b.credits; }, 0);
    var openCount = 0; for (var id in world.listings) if (world.listings[id].status === 'open') openCount++;
    world.days.push({ d: dayNo, trades: world.stats.trades, volume: world.stats.volume, burnt: world.stats.burnt, issued: world.stats.allowance, packs: world.stats.packs, credits: credits, listings: openCount, minted: world.minted });
    if (world.days.length > c.keep.days) world.days.splice(0, world.days.length - c.keep.days);
    if (issued || opened) S.feed(world, 'day', 'A new simulated day: ' + opened + ' packs opened and ' + issued + ' Credits of allowance issued across the bots', {});
    S.addEvent(world, (dayNo + 1) * DAY, 'day', '');
  }

  // ---- the event loop ------------------------------------------------------------------------------------------------
  function handle(world, env, host, ev) {
    switch (ev.type) {
      case 'wake': { var b = S.botOf(world, ev.ref); if (b) botWake(world, env, host, b); break; }
      // a bargain hunter sent to look at one listing: it buys only if the price still fits what it thinks the card is worth
      case 'scout': {
        var bsc = S.botOf(world, ev.ref), ls = world.listings[ev.listing];
        if (bsc && ls && ls.status === 'open' && ls.kind === 'fixed' && world.now < ls.endsAt) buyPass(world, env, host, bsc, S.personaOf(bsc), [ls]);
        break;
      }
      case 'snipe': {
        var bs = S.botOf(world, ev.ref), l = world.listings[ev.listing];
        if (bs && l && l.status === 'open' && l.kind === 'auction') {
          var view = S.auctionView(l);
          if (!view.lead || view.lead.by !== bs.id) S.placeBid(world, env, host, l, bs.id, ev.max);
        }
        break;
      }
      case 'end': {
        var li = world.listings[ev.ref];
        if (!li || li.status !== 'open') break;
        if (li.kind === 'auction') { if (ev.ver !== li.endVer) break; S.endAuction(world, env, host, li); }
        else {
          S.returnItems(world, li); S.finishListing(world, li, 'expired');
          li.offers.forEach(function (oid) { var of0 = world.offers[oid]; if (of0 && (of0.status === 'pending' || of0.status === 'countered')) S.closeOffer(world, of0, 'withdrawn', 'The listing expired'); });
          if (li.seller === 'you') S.notify(world, 'expired', 'Your listing of ' + S.cardLabel(env, li.items[0]) + ' expired.', { listing: li.id });
        }
        break;
      }
      case 'orderEnd': {
        var o = world.orders[ev.ref];
        if (o && o.status === 'open') { o.status = 'expired'; var ob = S.botOf(world, o.owner); if (ob) delete ob.held['O' + o.id]; if (o.owner === 'you') S.notify(world, 'order-expired', 'Your buy order for ' + S.cardLabel(env, { c: o.c, v: o.v }) + ' expired.', { order: o.id }); }
        break;
      }
      case 'offerReply': { var of = world.offers[ev.ref]; if (of) botAnswersOffer(world, env, host, of); break; }
      case 'offerEnd': {
        var of2 = world.offers[ev.ref];
        if (of2 && (of2.status === 'pending' || of2.status === 'countered')) { S.closeOffer(world, of2, 'expired', 'Expired'); if (of2.to === 'you' || of2.from === 'you') S.notify(world, 'offer-expired', 'A swap offer expired.', { offer: of2.id }); }
        break;
      }
      case 'day': dailyTick(world, env, host); break;
      case 'news': newsTick(world, env, host); break;
      default: break;
    }
  }
  // Runs every event due up to `target`. Returns { processed, reached } so a caller can continue next slice.
  function advance(world, env, host, target, budget) {
    var q = world.queue, n = 0, cap = budget || cfg().tickBudgetEvents;
    while (q.length && q[0].t <= target && n < cap) {
      var ev = q.shift();
      world.now = Math.max(world.now, ev.t);
      handle(world, env, host, ev);
      n += 1;
    }
    var reached = !(q.length && q[0].t <= target);
    if (reached) world.now = Math.max(world.now, target);
    return { processed: n, reached: reached };
  }

  Object.assign(S, { create: create, index: index, advance: advance, botWake: botWake, privateValue: privateValue, blankWorld: blankWorld, acceptSwap: acceptSwap,
    finishSwap: finishSwap, botAnswersOffer: botAnswersOffer, eventFactor: eventFactor, activeNews: activeNews, scopeCards: scopeCards, inScope: inScope, newsTick: newsTick, dailyTick: dailyTick, openListings: openListings, interested: interested, alertScouts: alertScouts, lowestAsk: lowestAsk, handleFor: handleFor, renameBots: renameBots });
})(window.Cardable = window.Cardable || {});
