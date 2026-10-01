(function (C, root) {
  'use strict';
  var registry = Object.create(null), nextId = 0;
  C.finishes = {
    registry: registry,
    register: function (id, definition) {
      ['mount', 'update', 'destroy', 'lite'].forEach(function (method) {
        if (typeof definition[method] !== 'function') throw new TypeError('Finish ' + id + ' needs ' + method);
      });
      if (registry[id]) throw new Error('Finish already registered: ' + id);
      registry[id] = definition;
    },
    describe: function (id, card, context) {
      var definition = registry[id];
      return definition && definition.describe ? definition.describe(card, context) : {};
    },
    previewStates: function (id) { return registry[id].previewStates || [null]; },
    bind: function (id, element, card, context) {
      var definition = registry[id];
      if (!definition) throw new Error('Unimplemented finish: ' + id);
      var binding = definition.mount(element, card, context), accumulated = 0, moving = false;
      return {
        update: function (dt, pointer) { accumulated += dt; var interval = 1000 / C.settings.policy.finishHz; if (accumulated + 0.01 < interval) return moving; moving = definition.update(accumulated, pointer, binding); accumulated = 0; return moving; },
        destroy: function () { definition.destroy(binding); },
        lite: function () { return definition.lite(card, Object.assign({}, context, { propElement: context.litePropElement })); }
      };
    },
    surface: function (id, context) {
      var element = root.document.createElement('div');
      element.className = 'finish-surface finish-' + id;
      element.dataset.colorMode = context.colorMode;
      return element;
    },
    element: function (tag, className, parent) {
      var element = root.document.createElement(tag); element.className = className;
      if (parent) parent.appendChild(element); return element;
    },
    svg: function (tag, attrs, parent) {
      var element = root.document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.keys(attrs || {}).forEach(function (key) { element.setAttribute(key, attrs[key]); });
      if (parent) parent.appendChild(element); return element;
    },
    uid: function (prefix) { nextId += 1; return 'finish-' + prefix + '-' + nextId; },
    squircle: function (parent, className) {
      var svg = C.finishes.svg('svg', { viewBox: '0 0 100 140', class: 'finish-squircle-frame ' + className, 'data-shape': 'squircle', 'aria-hidden': 'true' }, parent);
      var defs = C.finishes.svg('defs', {}, svg), clipId = C.finishes.uid('frame-clip');
      var clip = C.finishes.svg('clipPath', { id: clipId }, defs);
      C.finishes.svg('path', { d: 'M12 0H88C100 0 100 0 100 12V128C100 140 100 140 88 140H12C0 140 0 140 0 128V12C0 0 0 0 12 0Z' }, clip);
      var group = C.finishes.svg('g', { 'clip-path': 'url(#' + clipId + ')' }, svg);
      var path = C.finishes.svg('path', { d: 'M12 2H88C98 2 98 2 98 12V128C98 138 98 138 88 138H12C2 138 2 138 2 128V12C2 2 2 2 12 2Z', fill: 'none', 'stroke-width': 3 }, group);
      return { el: svg, defs: defs, path: path };
    },
    sparkles: function (parent, count, seed, bounds, className) {
      var stars = [], random = C.art.random(seed);
      for (var i = 0; i < count; i += 1) {
        var star = C.finishes.element('i', 'finish-sparkle ' + (className || ''), parent);
        star.style.left = (bounds.x + random() * bounds.width) + '%';
        star.style.top = (bounds.y + random() * bounds.height) + '%';
        var strength = 0.3 + random() * 0.6; star.style.opacity = strength;
        stars.push({ el: star, phase: random() * Math.PI * 2, strength: strength });
      }
      return stars;
    },
    twinkle: function (stars, time, speed) {
      stars.forEach(function (star, index) { if (C.settings.get('quality') === 'low' || C.settings.get('quality') === 'medium' && index % 2) { star.el.style.opacity = 0; return; } star.el.style.opacity = star.strength * (0.2 + 0.8 * Math.pow(Math.sin(time * speed + star.phase), 4)); });
    },
    flat: function (id) {
      return {
        mount: function (element, card, context) { var surface = C.finishes.surface(id, context); element.appendChild(surface); return surface; },
        update: function () { return false; },
        destroy: function (surface) { surface.remove(); },
        lite: function (card, context) { return C.finishes.surface(id, context); }
      };
    }
  };
})(window.Cardable, window);
