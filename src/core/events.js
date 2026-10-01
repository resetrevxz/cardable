(function (C) {
  'use strict';
  var listeners = Object.create(null);
  C.events = {
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
      (listeners[name] || []).slice().forEach(function (fn) { fn(payload); });
    }
  };
})(window.Cardable);
