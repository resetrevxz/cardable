(function (C, root) {
  'use strict';
  var registry = Object.create(null);
  C.finishes = {
    registry: registry,
    register: function (id, definition) {
      ['mount', 'update', 'destroy', 'lite'].forEach(function (method) {
        if (typeof definition[method] !== 'function') throw new TypeError('Finish ' + id + ' needs ' + method);
      });
      if (registry[id]) throw new Error('Finish already registered: ' + id);
      registry[id] = definition;
    },
    bind: function (id, element, card, context) {
      var definition = registry[id];
      if (!definition) throw new Error('Unimplemented finish: ' + id);
      var binding = definition.mount(element, card, context);
      return {
        update: function (dt, pointer) { return definition.update(dt, pointer, binding); },
        destroy: function () { definition.destroy(binding); },
        lite: function () { return definition.lite(card, context); }
      };
    },
    surface: function (id, context) {
      var element = root.document.createElement('div');
      element.className = 'finish-surface finish-' + id;
      element.dataset.colorMode = context.colorMode;
      return element;
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
