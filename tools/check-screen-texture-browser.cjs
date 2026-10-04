'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const baselinePath = process.env.CARDABLE_SCREEN_BASELINE || path.resolve(__dirname, '../../../outputs/v3-optimization/baseline/src/fx/cutscene-screen-engine.js');
(async () => {
  const browser = await chromium.launch({headless: true});
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.evaluate(() => {Cardable.tutorial.skipButton.click(); Cardable.settings.applyPreset('high'); window.optimizedScreenFactory = Cardable.cutsceneScreenEngine.create;});
    await page.addScriptTag({content: fs.readFileSync(baselinePath, 'utf8')});
    const result = await page.evaluate(() => {
      const original = Cardable.cutsceneScreenEngine.create;
      Cardable.cutsceneScreenEngine.create = window.optimizedScreenFactory;
      function run(factory) {
        const engine = factory(), source = document.createElement('canvas'), mask = document.createElement('canvas');
        const q = source.getContext('2d'), m = mask.getContext('2d'), hashes = [];
        if (engine.stats.backend !== 'webgl2') throw new Error('WebGL2 required to verify texture uploads');
        for (let frame = 0; frame < 8; frame++) {
          source.width = mask.width = frame >= 3 && frame < 6 ? 200 : 160;
          source.height = mask.height = frame >= 3 && frame < 6 ? 120 : 90;
          q.fillStyle = '#16232a'; q.fillRect(0, 0, source.width, source.height);
          q.fillStyle = frame % 2 ? '#daaa71' : '#74bece'; q.fillRect(12 + frame * 7, 9, 45, 34);
          m.fillStyle = '#000'; m.fillRect(0, 0, mask.width, mask.height);
          m.fillStyle = '#fff'; m.fillRect(12 + frame * 7, 9, 45, 34);
          engine.render(source, 320, 180, frame / 10, {mask, hold: .3, smear: .1, noise: .03, curve: .035}, 3);
          const gl = engine.canvas.getContext('webgl2'), pixels = new Uint8Array(engine.canvas.width * engine.canvas.height * 4);
          gl.readPixels(0, 0, engine.canvas.width, engine.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let hash = 2166136261, sum = 0;
          for (let i = 0; i < pixels.length; i++) {hash = Math.imul(hash ^ pixels[i], 16777619); sum += pixels[i];}
          hashes.push({hash: hash >>> 0, sum, error: gl.getError()});
        }
        const stats = {...engine.stats}; engine.dispose();
        return {hashes, stats};
      }
      return {before: run(original), after: run(window.optimizedScreenFactory)};
    });
    assert.deepEqual(result.after.hashes, result.before.hashes);
    assert(result.after.hashes.every(frame => frame.error === 0));
    assert.equal(result.after.stats.textureAllocations, 6);
    assert.equal(result.after.stats.textureUpdates, 10);
    assert.deepEqual(errors, []);
    const out = path.resolve(__dirname, '../../../outputs/graphics-profiles'); fs.mkdirSync(out, {recursive: true});
    fs.writeFileSync(path.join(out, 'screen-texture-qa.json'), JSON.stringify(result, null, 2));
    console.log('PASS: eight changing masked-feedback frames match baseline pixels; three resizes allocate storage, stable dimensions reuse it; no WebGL errors.');
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
