'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), C = { data: {} };
const context = vm.createContext({ window: { Cardable: C }, console });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="(src\/data\/[^"?]+\.js)"/g)].map(match => match[1]);
for (const script of scripts) vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script, timeout: 2000 });
let entries = 0, images = 0;
for (const [name, collection] of Object.entries(C.data)) {
  if (!Array.isArray(collection) || !collection.every(item => item && typeof item.id === 'string')) continue;
  const ids = new Set();
  for (const item of collection) { if (ids.has(item.id)) throw new Error(`Duplicate ${name} id: ${item.id}`); ids.add(item.id); entries++; }
}
const rarities = new Set((C.data.rarities || []).map(item => item.id)), generations = new Set((C.data.generations || []).map(item => item.id));
for (const card of C.data.cards || []) {
  if (!rarities.has(card.rarity) || !generations.has(card.generation)) throw new Error(`Unknown catalog reference: ${card.id}`);
  if (card.artStatus !== 'final') continue;
  for (const asset of [card.art?.src, card.art?.thumb, card.art?.subjectMask].filter(Boolean)) {
    const resolved = path.resolve(root, asset);
    if (!resolved.startsWith(root + path.sep) || !fs.statSync(resolved).isFile()) throw new Error(`Missing final art: ${card.id}`);
    images++;
  }
}
const pullable = (C.data.rarities || []).filter(item => item.pullable !== false && item.chance != null);
const total = pullable.reduce((sum, item) => sum + item.chance, 0);
if (pullable.some(item => !(item.chance > 0)) || !(total > 0) || !Number.isFinite(total)) throw new Error('Rarity chances must be positive and normalizable.');
const packChance = (C.data.packs || []).filter(item => item.randomChance != null).reduce((sum, item) => { if (!(item.randomChance >= 0 && item.randomChance <= 1)) throw new Error(`Invalid pack probability: ${item.id}`); return sum + item.randomChance; }, 0);
if (packChance > 1) throw new Error('Pack slot probabilities exceed 1.');
console.log(`Data integrity: ${entries} registry entries, ${images} final art references; unique IDs and catalog references valid.`);
