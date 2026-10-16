'use strict';
// The pull odds (1.10.0, docs/RARITY-ODDS-1.10.0.md): rarer rares, commoner commons, and values that follow. These pin the intent, not every digit,
// so a later retune that keeps the shape still passes and one that makes rare cards common again does not.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const report = JSON.parse(execFileSync(process.execPath, [path.join(root, 'tools', 'rarity-report.cjs'), '--json'], { cwd: root, encoding: 'utf8' }));
const ORDER = ['basic', 'common', 'uncommon', 'rare', 'super-rare', 'unusual', 'double-super-rare', 'legendary', 'mythical', 'exotic', 'ascendant', 'secret'];
const base = {}; ORDER.forEach((id) => { base[id] = report.base[id] / 100; }); // the data file lists percentages
const orBetter = (table, from) => ORDER.slice(ORDER.indexOf(from)).reduce((sum, id) => sum + (table[id] || 0), 0);

test('base chances sum to exactly 100 and fall with every tier', () => {
  const total = ORDER.reduce((s, id) => s + report.base[id], 0);
  assert.ok(Math.abs(total - 100) < 1e-9, 'sum is ' + total);
  for (let i = 1; i < ORDER.length; i++) assert.ok(report.base[ORDER[i]] < report.base[ORDER[i - 1]], ORDER[i] + ' is rarer than ' + ORDER[i - 1]);
});

test('Basic and Common are the bulk of a normal pack, and rare cards are rare', () => {
  assert.ok(base.basic + base.common >= 0.8, 'Basic and Common are at least 80% of a card');
  assert.ok(orBetter(base, 'rare') <= 0.075, 'Rare or better is at most 7.5% of a card in a Standard pack');
  assert.ok(orBetter(base, 'legendary') <= 0.006, 'Legendary or better is at most 0.6% of a card in a Standard pack');
});

test('over every pack that opens, the top tiers stay out of reach', () => {
  assert.ok(orBetter(report.overall, 'legendary') <= 0.02, 'Legendary or better is at most 1 in 50 cards overall');
  assert.ok(orBetter(report.overall, 'mythical') <= 0.01, 'Mythical or better is at most 1 in 100 overall');
  assert.ok(orBetter(report.overall, 'exotic') <= 0.003, 'Exotic or better is at most 1 in 330 overall');
  assert.ok(report.overall.secret <= 0.0001, 'Secret is at most 1 in 10,000 overall');
  // the Rare Pack guarantees Rare or better, so overall Rare may out-number Uncommon; from there up every tier is rarer than the one below
  for (let i = ORDER.indexOf('super-rare'); i < ORDER.length; i++) assert.ok(report.overall[ORDER[i]] < report.overall[ORDER[i - 1]], ORDER[i] + ' is rarer than ' + ORDER[i - 1]);
});

test('the guaranteed packs keep their promise without handing out the top', () => {
  assert.ok(Math.abs(orBetter(report.perPack.rare, 'rare') - 1) < 1e-9, 'a Rare Pack card is Rare or better');
  assert.ok(orBetter(report.perPack.rare, 'legendary') <= 0.03, 'Legendary or better is at most 3% of a Rare Pack card');
  assert.ok(orBetter(report.perPack.royal, 'legendary') > 0.99, 'a Royal Pack card is Legendary or better');
  assert.ok(orBetter(report.perPack.picker, 'rare') > 0.99, 'a Picker Pack always offers Rare or better');
  assert.ok(report.shares.royal <= 0.002, 'Royal Packs are rare themselves (at most 1 opening in 500)');
  assert.ok(report.shares.titan <= 0.003, 'Titan Packs are rare themselves');
});

test('every ordinary pack is mostly Basic and Common', () => {
  Object.keys(report.perPack).filter((id) => ['standard', 'nvidia', 'amd', 'snapdragon', 'apple', 'classic'].indexOf(id) >= 0).forEach((id) => {
    assert.ok(report.perPack[id].basic + report.perPack[id].common >= 0.8, id + ' is mostly Basic and Common');
  });
});

test('Credits per pull stay in a sane band and a Rare Pack is worth far more than a Standard one', () => {
  assert.ok(report.meanValue.overall > 80 && report.meanValue.overall < 200, 'mean pull value ' + report.meanValue.overall);
  assert.ok(report.meanValue.rare > report.meanValue.standard * 4, 'a Rare Pack card is worth several Standard cards');
  assert.ok(report.meanValue.royal > report.meanValue.rare, 'a Royal Pack card is worth more than a Rare Pack card');
});

test('the Shop is never cheaper than the market for any card or finish', () => {
  execFileSync(process.execPath, [path.join(root, 'tools', 'check-value-relations.cjs')], { cwd: root, encoding: 'utf8' });
});
