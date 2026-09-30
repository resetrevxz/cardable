/* Event/scheduler checks in a simulated DOM. This does not certify browser rendering or FPS. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const scripts = Array.from(html.matchAll(/<script src="([^"]+)"/g), match => match[1]);
const tokens = new Map(Array.from(fs.readFileSync(path.join(base, 'src/styles/tokens.css'), 'utf8').matchAll(/(--[\w-]+):\s*([^;]+);/g), match => [match[1], match[2]]));

function runtime(dev = false, gallery = false) {
  let now = 0, nextId = 1;
  const tasks = new Map(), queries = new Map(), logs = [], store = new Map();
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
    fire(type, event = {}) { event.type = type; event.target ||= this; (this.listeners.get(type) || []).slice().forEach(fn => fn(event)); }
  }
  class Element extends Target {
    constructor(tag) {
      super(); this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.className = '';
      this.style = { setProperty(key, value) { this[key] = String(value); } };
      this.classList = {
        contains: value => this.className.split(/\s+/).includes(value),
        add: (...values) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...values])].join(' '); },
        remove: (...values) => { this.className = this.className.split(/\s+/).filter(value => !values.includes(value)).join(' '); },
        toggle: (value, enabled) => { enabled = enabled === undefined ? !this.classList.contains(value) : enabled; this.classList[enabled ? 'add' : 'remove'](value); return enabled; }
      };
    }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    removeAttribute(key) { delete this.attrs[key]; }
    getAttribute(key) { return this.attrs[key] ?? null; }
    matches(selectors) {
      return selectors.split(',').some(selector => {
        selector = selector.trim();
        if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
        if (selector === '[tabindex]') return 'tabindex' in this.attrs;
        if (selector === 'a[href]') return this.tagName === 'a' && 'href' in this.attrs;
        if (selector === '[role="button"]') return this.attrs.role === 'button';
        if (selector === '[data-cursor="ring"]') return this.attrs['data-cursor'] === 'ring';
        return selector === this.tagName;
      });
    }
    closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
    contains(element) { return this === element || this.children.some(child => child.contains(element)); }
    querySelector(tag) { for (const child of this.children) { if (child.tagName === tag) return child; const nested = child.querySelector(tag); if (nested) return nested; } return null; }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    getComputedTextLength() { return this.textContent.length * 24; }
    getBoundingClientRect() { return this.rect || { left: 50, top: 50, width: 100, height: 32 }; }
  }
  const document = new Target();
  document.body = new Element('body'); document.documentElement = new Element('html');
  document.hidden = false; document.title = 'Cardable'; document.activeElement = document.body;
  document.createElement = tag => new Element(tag);
  document.createElementNS = (_, tag) => new Element(tag);
  document.fonts = { ready: { then(fn) { fn(); } } };
  const ids = new Map();
  const make = (tag, id, classes = '') => { const el = new Element(tag); el.className = classes; if (id) ids.set(id, el); document.body.appendChild(el); return el; };
  make('link', 'favicon');
  const canvas = make('canvas', 'dot-grid');
  const drawing = { arcs: [], clears: 0, transforms: [], globalAlpha: 1, setTransform(...args) { this.transforms.push(args); }, clearRect() { this.arcs = []; this.clears += 1; }, beginPath() {}, arc(x, y, radius) { this.arcs.push({ x, y, radius, alpha: this.globalAlpha }); }, fill() {} };
  canvas.getContext = () => drawing;
  const wordmark = make('div', 'wordmark', 'wordmark idle-chrome entrance');
  wordmark.setAttribute('tabindex', 0); wordmark.appendChild(new Element('svg'));
  const pack = make('div', 'pack-placeholder', 'pack-placeholder entrance');
  make('div', 'cursor-glow', 'cursor-glow idle-chrome');
  document.getElementById = id => ids.get(id);
  function schedule(fn, delay, interval = 0) { const id = nextId++; tasks.set(id, { fn, due: now + delay, interval }); return id; }
  const window = new Target();
  Object.assign(window, {
    document, performance: { now: () => now }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    location: { search: dev ? '?dev=1' + (gallery ? '&gallery=1' : '') : '' }, crypto: require('node:crypto').webcrypto,
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) },
    setTimeout: (fn, delay = 0) => schedule(fn, delay), clearTimeout: id => tasks.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, delay), clearInterval: id => tasks.delete(id),
    requestAnimationFrame: fn => schedule(() => fn(now), 1000 / 60), cancelAnimationFrame: id => tasks.delete(id),
    getComputedStyle: () => ({ getPropertyValue: key => tokens.get(key) || '' }),
    matchMedia: query => {
      if (!queries.has(query)) { const media = new Target(); media.matches = query.includes('pointer: fine'); queries.set(query, media); }
      return queries.get(query);
    },
    console: Object.fromEntries(['log', 'info', 'warn', 'error'].map(level => [level, (...args) => logs.push({ level, text: args.join(' ') })]))
  });
  const context = vm.createContext({ window, URLSearchParams, performance: window.performance, Option: class extends Element { constructor(text, value) { super('option'); this.textContent = text; this.value = value; } } });
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), context, { filename: file });
  const C = window.Cardable;
  const advance = ms => {
    const end = now + ms;
    let steps = 0;
    while (true) {
      let selected = null;
      for (const entry of tasks) if (entry[1].due <= end && (!selected || entry[1].due < selected[1].due)) selected = entry;
      if (!selected) break;
      if (++steps > 20000) throw new Error('Scheduler did not settle');
      const [id, task] = selected; now = task.due;
      if (task.interval) task.due += task.interval; else tasks.delete(id);
      task.fn();
    }
    now = end;
  };
  const move = (x, y, target = document.body) => document.fire('pointermove', { clientX: x, clientY: y, pointerType: 'mouse', target });
  const click = (x, y, target = document.body) => { const event = { clientX: x, clientY: y, detail: 1, target }; target.fire('click', event); if (target !== document) document.fire('click', event); };
  const hidden = value => { document.hidden = value; document.fire('visibilitychange'); };
  const reduced = value => { const query = queries.get('(prefers-reduced-motion: reduce)'); query.matches = value; query.fire('change'); };
  return { C, window, document, drawing, canvas, wordmark, pack, logs, store, advance, move, click, hidden, reduced, now: () => now, Element };
}

module.exports = { runtime, html, scripts };
if (require.main === module) {
let passed = 0;
function check(name, fn) { fn(); passed += 1; console.log('PASS ' + name); }
const r = runtime();

check('classic local script order, staged entrance, and initial scheduler sleep', () => {
  assert(!scripts.some(file => /https?:/.test(file)));
  assert(scripts.indexOf('src/fx/loop.js') < scripts.indexOf('src/ui/logo.js'));
  assert.equal(scripts.at(-1), 'src/boot.js');
  assert(!r.document.body.classList.contains('is-loaded'));
  r.advance(40); assert(r.document.body.classList.contains('is-loaded'));
  r.advance(510); assert(r.document.body.classList.contains('has-entered'));
  assert.equal(r.C.fx.stats.running, false);
  const frames = r.C.fx.stats.frameCount; r.advance(500); assert.equal(r.C.fx.stats.frameCount, frames);
  assert.equal(r.C.dots.stats.visibleDots, 0);
});

check('hover reveal has bounded alpha, lens growth, lean, and coalesced pointer input', () => {
  let moves = 0; r.C.events.on('pointer:move', () => { moves += 1; });
  r.move(390, 390); r.move(400, 400); r.advance(20);
  assert.equal(moves, 1);
  assert(r.drawing.arcs.length > 0);
  for (const dot of r.drawing.arcs) {
    assert(Math.hypot(dot.x - 400, dot.y - 400) < r.C.config.dots.influenceRadius + r.C.config.dots.lean);
    assert(dot.alpha > 0 && dot.alpha <= r.C.config.dots.maxAlpha);
    assert(dot.radius >= r.C.config.dots.baseRadius && dot.radius <= r.C.config.dots.maxRadius);
  }
  assert(r.drawing.arcs.some(dot => dot.radius > 2));
  assert(r.drawing.arcs.some(dot => Math.abs((dot.x - 13) % 26) > 0.01));
});

check('travelled pointer path leaves a trail, then canvas drawing stops with a stationary halo', () => {
  r.move(700, 450); r.move(1050, 400); r.advance(20);
  assert(r.C.dots.stats.trailCells > 0);
  assert(r.drawing.arcs.some(dot => Math.hypot(dot.x - 1050, dot.y - 400) > 170));
  r.advance(1200); assert.equal(r.C.dots.stats.trailCells, 0); assert.equal(r.C.fx.stats.running, false);
  const draws = r.C.dots.stats.draws; r.advance(600); assert.equal(r.C.dots.stats.draws, draws);
  assert(r.drawing.arcs.every(dot => Math.hypot(dot.x - 1050, dot.y - 400) <= 172));
});

check('pointer leave clears the halo and every click creates two rings with a delayed fainter second', () => {
  r.document.fire('pointerout', { relatedTarget: null }); r.advance(20); assert.equal(r.drawing.arcs.length, 0);
  const button = new r.Element('button');
  r.click(793, 507, button); r.advance(100);
  assert.equal(r.C.dots.stats.ripples, 2);
  assert(!r.drawing.arcs.some(dot => Math.hypot(dot.x - 793, dot.y - 507) < 5));
  r.advance(50);
  const inner = r.drawing.arcs.find(dot => Math.hypot(dot.x - 793, dot.y - 507) < 5);
  assert(inner && inner.alpha <= 0.55 * 0.55);
  r.advance(650); assert.equal(r.C.dots.stats.ripples, 0); assert.equal(r.C.fx.stats.running, false);
});

check('high-DPI resize rebuilds dimensions and grid pitch', () => {
  r.window.innerWidth = 1920; r.window.innerHeight = 1080; r.window.devicePixelRatio = 2;
  r.window.fire('resize'); r.advance(20);
  assert.equal(r.canvas.width, 3840); assert.equal(r.canvas.height, 2160);
  assert.equal(r.C.dots.stats.columns, Math.ceil(1920 / 26)); assert.equal(r.C.dots.stats.rows, Math.ceil(1080 / 26));
  assert.deepEqual(r.drawing.transforms.at(-1), [2, 0, 0, 2, 0, 0]);
});

check('cursor follows with lag and becomes a ring over controls', () => {
  r.move(200, 200); r.advance(20);
  const button = new r.Element('button'); r.move(600, 200, button); r.advance(20);
  const cursor = r.document.getElementById('cursor-glow');
  assert(cursor.classList.contains('is-ring'));
  const x = Number(cursor.style.transform.match(/translate3d\(([^p]+)/)[1]); assert(x > 200 && x < 600);
});

check('live reduced motion clears transient effects and removes growth, lean, lag, and glyph rolls', () => {
  r.click(900, 600); r.reduced(true); r.advance(20);
  assert.equal(r.C.dots.stats.ripples, 0); assert.equal(r.C.dots.stats.trailCells, 0);
  r.move(800, 300); r.advance(20);
  assert(r.drawing.arcs.every(dot => dot.radius === 0.9 && (dot.x - 13) % 26 === 0 && (dot.y - 13) % 26 === 0));
  assert(r.document.getElementById('cursor-glow').style.transform.startsWith('translate3d(800px,300px'));
  r.wordmark.fire('pointerenter'); r.advance(300); assert.equal(r.C.logo.stats.active, false);
  r.wordmark.fire('pointerleave'); r.reduced(false); r.advance(20);
});

check('idle starts at 2.5 seconds, retains the pack, and movement restores chrome immediately', () => {
  r.move(810, 310); r.advance(2499); assert.equal(r.C.menu.idle, false);
  r.advance(2); assert.equal(r.C.menu.idle, true);
  assert(!r.pack.classList.contains('idle-chrome'));
  r.move(811, 310); assert.equal(r.C.menu.idle, false);
  const css = fs.readFileSync(path.join(base, 'src/styles/menu.css'), 'utf8');
  assert(css.includes('transition-duration: var(--t-fade)'));
  assert(css.includes('transition-duration: var(--t-fast)'));
});

check('keyboard focus and named holds keep controls visible without saved tutorial state blocking idle', () => {
  const button = new r.Element('button'); r.document.activeElement = button;
  r.document.fire('keydown', { key: 'Tab', target: button }); r.document.fire('focusin', { target: button });
  r.advance(3000); assert.equal(r.C.menu.idle, false);
  r.document.fire('pointerdown'); assert.equal(r.C.menu.idle, true);
  r.C.menu.holdVisible('future-screen', true); r.advance(3000); assert.equal(r.C.menu.idle, false);
  r.C.menu.holdVisible('future-screen', false); assert.equal(r.C.menu.idle, true);
});

check('SVG has one animated group per letter, loops on hover, and settles on leave', () => {
  r.move(40, 40, r.wordmark); r.advance(20); r.wordmark.fire('pointerenter');
  const first = r.C.logo.stats.waves;
  for (let i = 0; i < 4; i += 1) { r.move(40 + i, 40, r.wordmark); r.advance(900); }
  assert(r.C.logo.stats.waves >= first + 2);
  assert.equal(r.wordmark.querySelector('svg').querySelector('defs').children.length, 8);
  r.wordmark.fire('pointerleave'); r.advance(250); assert.equal(r.C.logo.stats.active, false);
  const groups = r.wordmark.querySelector('svg').children.find(child => child.tagName === 'g').children;
  assert(groups.every(group => group.children[0].children[0].style.transform === 'translateY(0px)'));
  const draws = r.C.dots.stats.draws; r.advance(400); assert.equal(r.C.dots.stats.draws, draws);
});

check('idle chrome settles a hovered logo and lets the shared loop sleep', () => {
  r.move(40, 40, r.wordmark); r.advance(20); r.wordmark.fire('pointerenter');
  r.advance(2800); assert.equal(r.C.menu.idle, true); assert.equal(r.C.logo.stats.active, false);
  assert.equal(r.C.fx.stats.running, false);
  const frames = r.C.fx.stats.frameCount; r.advance(200); assert.equal(r.C.fx.stats.frameCount, frames);
  r.wordmark.fire('pointerleave');
});

check('a minute of idle queues one wave without revealing the logo until pointer movement', () => {
  r.advance(60000); assert.equal(r.C.menu.idle, true);
  const waves = r.C.logo.stats.waves; r.move(200, 200);
  assert.equal(r.C.logo.stats.waves, waves + 1); assert.equal(r.C.menu.idle, false);
  r.advance(1800); assert.equal(r.C.logo.stats.active, false);
});

check('hidden tabs cancel animation and expired ripples are not replayed', () => {
  r.click(800, 500); r.advance(20); r.hidden(true);
  const frames = r.C.fx.stats.frameCount; r.advance(2000); assert.equal(r.C.fx.stats.frameCount, frames);
  assert.equal(r.document.title, 'Cardable · pack ready');
  r.hidden(false); r.advance(20); assert.equal(r.C.dots.stats.ripples, 0); assert.equal(r.document.title, 'Cardable');
  assert(r.document.getElementById('favicon').getAttribute('href').startsWith('data:image/svg+xml,'));
  assert.equal(r.logs.filter(log => log.level === 'error').length, 0);
});

const d = runtime(true);
check('dev integration runs six Stage 0 checks once and retains the real save', () => {
  assert.equal(d.logs.filter(log => log.text.includes('[Cardable check] PASS')).length, 6);
  assert.equal(d.logs.filter(log => log.level === 'error').length, 0);
  assert.equal(d.C.state.current.packs.ready, 2);
  assert.equal(d.store.get('cardable.save'), JSON.stringify(d.C.state.current));
  d.advance(1000); assert.equal(d.C.fx.stats.running, false);
  assert(d.C.dev.panel.children.some(child => child.textContent.startsWith('FPS: idle')));
});

check('dev title test is transient and restores the normal title on return', () => {
  const button = d.C.dev.panel.children.find(child => child.textContent === 'Test pack-ready title');
  d.C.state.current.packs.ready = 0;
  const saved = d.store.get('cardable.save'), state = JSON.stringify(d.C.state.current);
  d.click(70, 70, button); d.hidden(true); assert.equal(d.document.title, 'Cardable');
  d.advance(1001); assert.equal(d.document.title, 'Cardable · pack ready');
  assert.equal(d.store.get('cardable.save'), saved); assert.equal(JSON.stringify(d.C.state.current), state);
  d.hidden(false); assert.equal(d.document.title, 'Cardable');
});

console.log('\n' + passed + ' Stage 1 checks passed; 6 Stage 0 console checks passed. Browser visuals and measured FPS are unverified.');
}
