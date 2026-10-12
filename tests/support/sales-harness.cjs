'use strict';
// Loads the shared economy code (currency ledger, valuation, sales, deletion rules, market core and the simulator)
// into a vm sandbox with a small in-memory stand-in for the save store. Used by the Stage 3 tests and experiments.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const FILES = ['src/data/rarities.js', 'src/data/cards.js', 'src/data/variants.js', 'src/data/packs.js', 'src/data/economy.js', 'src/data/market-config.js', 'src/data/market-sim.js',
  'src/market/core.js', 'src/market/fixtures.js', 'src/market/sim/engine.js', 'src/market/sim/world.js', 'src/market/sim/player.js', 'src/market/sim/runtime.js',
  'src/core/variants.js', 'src/core/currency.js', 'src/core/card-deletion.js', 'src/market/sim/provider.js', 'src/market/valuation.js', 'src/market/sales.js'];

function load(options) {
  options = options || {};
  const sandbox = { console };
  sandbox.window = sandbox;
  let clock = 1000;
  sandbox.performance = { now: () => clock };
  const C = sandbox.Cardable = { data: {}, config: { variants: { chance: 0.1 }, currency: { packOpenReward: 0 } }, events: { on() {}, emit() { return true; }, notify() {} } };
  sandbox.__advance = (ms) => { clock += ms; };
  vm.createContext(sandbox);
  // minimal lookups the shared code expects from the game
  sandbox.Cardable.clock = { now: () => 1700000000000 };
  FILES.forEach((file) => {
    if (file === 'src/core/variants.js') {
      // helpers first: C.card, C.rarity, C.variant from the registries
      sandbox.Cardable.card = (id) => C.data.cards.find((c) => c.id === id) || null;
      sandbox.Cardable.rarity = (id) => C.data.rarities.find((r) => r.id === id) || null;
      sandbox.Cardable.variant = (id) => (id ? C.data.variants.find((v) => v.id === id) || null : null);
      sandbox.Cardable.cardSkin = () => null;
    }
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
  });
  const S = C.market.sim;
  const env = S.makeEnv({ cards: C.data.cards, rarities: C.data.rarities, variants: C.data.variants, packs: C.data.packs,
    names: { adjectives: C.market.fixtures.ADJECTIVES, nouns: C.market.fixtures.NOUNS } });
  const runtime = { env, world: null, state: 'idle', reason: '', error: null, revision: 0, speedId: 'standard', paused: false, factor: () => 60, peek: () => ({ state: 'running', reason: '' }) };
  runtime.heldCredits = () => (runtime.world ? S.playerHeld(runtime.world) : 0);
  runtime.lockOf = (id) => (runtime.world ? runtime.world.locks[id] || null : null);
  C.marketSim = { ensure: () => runtime, runtime, lockOf: (id) => runtime.lockOf(id), heldCredits: () => runtime.heldCredits() };

  // The save store: encode/validate/commit with the same contract the sales code relies on.
  const store = {
    current: null, commits: 0, failNext: 0, lastError: null, recovery: null,
    encode: (s) => JSON.stringify(s),
    validate(candidate) {
      const ids = new Set(), serials = new Set();
      for (const i of candidate.inventory) {
        if (ids.has(i.instanceId)) throw new Error('duplicate instance id');
        if (serials.has(i.serial)) throw new Error('duplicate serial');
        ids.add(i.instanceId); serials.add(i.serial);
      }
      if (!Number.isSafeInteger(candidate.currency) || candidate.currency < 0) throw new Error('bad currency');
      return true;
    },
    commit(candidate) {
      if (this.failNext > 0) { this.failNext--; return false; }
      this.current = JSON.parse(JSON.stringify(candidate)); this.commits++;
      return true;
    }
  };
  C.state = store;
  C.collection = { revision: 0 };
  C.stacks = C.stacks;
  C.bootFailure = false;
  C.market.store = { watching: () => ({}), session: {}, isWatching: () => false };
  C.qol = { toast() {} };
  C.settings = { get: (key) => (key === 'confirmLowDelete' ? true : undefined) };
  // a save with a starting collection
  let seq = 0;
  function inventoryItem(cardId, over) {
    seq += 1;
    return Object.assign({ instanceId: 'inst-' + seq, cardId, variantId: null, cardSkinId: null, serial: 'CBL-TEST-' + String(seq).padStart(6, '0'), packId: 'standard', pulledAt: 1000 + seq, seen: true }, over || {});
  }
  function newSave(cards, extra) {
    const save = Object.assign({ playerCode: 'TEST', createdAt: 1, currency: 0, inventory: (cards || []).map((c) => (typeof c === 'string' ? inventoryItem(c) : c)),
      inventoryUi: { favorites: [], collections: [], customOrders: {} }, wallet: { daily: {}, log: [] }, market: { receipts: [], sales: [] }, pendingReveal: null }, extra || {});
    store.current = save;
    return save;
  }
  return { C, S, env, runtime, store, inventoryItem, newSave, advance: sandbox.__advance, cards: C.data.cards, rarities: C.data.rarities };
}
module.exports = { load, root };
