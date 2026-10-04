(function (C) {
  'use strict';
  var listeners = Object.create(null);
  // Publishing/declaring a capability is distinct from subscribing to it.
  var published = new Set();
  function declare(name) {
    if (published.has(name)) return;
    published.add(name);
    (listeners['events:available'] || []).slice().forEach(function (fn) { fn({ name: name }); });
  }
  C.events = {
    declare: declare,
    supports: function (name) { return published.has(name); },
    get listenerCount() { return Object.keys(listeners).reduce(function (n, name) { return n + listeners[name].length; }, 0); },
    on: function (name, fn) {
      if (typeof fn !== 'function') throw new TypeError('Event listener must be a function');
      (listeners[name] || (listeners[name] = [])).push(fn);
      return function () { C.events.off(name, fn); };
    },
    off: function (name, fn) {
      var list = listeners[name];
      if (!list) return;
      var index = list.indexOf(fn);
      if (index !== -1) list.splice(index, 1);
    },
    emit: function (name, payload) {
      declare(name);
      (listeners[name] || []).slice().forEach(function (fn) { fn(payload); });
    }
  };
})(window.Cardable);
