'use strict';
// Loads the real catalog and the simulator's classic scripts into a vm sandbox for Node tests and experiments.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const FILES = ['src/data/rarities.js', 'src/data/cards.js', 'src/data/variants.js', 'src/data/packs.js', 'src/data/market-config.js', 'src/data/market-sim.js',
  'src/market/core.js', 'src/market/fixtures.js', 'src/market/sim/engine.js', 'src/market/sim/world.js', 'src/market/sim/player.js', 'src/market/sim/advisor.js'];

function load(extra) {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.Cardable = { data: {}, config: { variants: { chance: 0.1 } }, events: { on() {}, emit() {} } };
  vm.createContext(sandbox);
  FILES.concat(extra || []).forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file }));
  return sandbox.Cardable;
}
function makeEnv(C) {
  return C.market.sim.makeEnv({ cards: C.data.cards, rarities: C.data.rarities, variants: C.data.variants, packs: C.data.packs,
    names: { adjectives: C.market.fixtures.ADJECTIVES, nouns: C.market.fixtures.NOUNS } });
}
// A stand-in for the player's save with the same contract as the real host.
function mockHost(state) {
  state.receipts = state.receipts || new Set();
  state.inventory = state.inventory || [];
  state.log = state.log || [];
  return {
    state,
    balance: () => state.balance,
    hasReceipt: (id) => state.receipts.has(id),
    instance: (id) => { const i = state.inventory.find((x) => x.instanceId === id); return i ? JSON.parse(JSON.stringify(i)) : null; },
    settle: (effect) => {
      if (state.failNext) { state.failNext--; return false; }
      if (state.receipts.has(effect.receiptId)) return true;
      for (const id of effect.remove) if (!state.inventory.find((x) => x.instanceId === id)) return false;
      if (state.balance + effect.delta < 0) return false;
      for (const add of effect.add) if (state.inventory.some((x) => x.instanceId === add.instanceId || x.serial === add.serial)) return false;
      state.inventory = state.inventory.filter((x) => !effect.remove.includes(x.instanceId)).concat(JSON.parse(JSON.stringify(effect.add)));
      state.balance += effect.delta;
      state.receipts.add(effect.receiptId);
      state.log.push({ receipt: effect.receiptId, delta: effect.delta, reason: effect.reason });
      return true;
    }
  };
}
let seq = 0;
function playerCard(C, env, cardId, over) {
  seq += 1;
  return Object.assign({ instanceId: 'p' + seq, cardId, variantId: null, cardSkinId: null, serial: 'CBL-TEST-' + String(seq).padStart(6, '0'), packId: 'standard', pulledAt: 1000 + seq, seen: true }, over || {});
}
module.exports = { load, makeEnv, mockHost, playerCard, root };
