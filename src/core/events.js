(function (C) {
  'use strict';
  var listeners = Object.create(null);
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
    },
    // Notifications run after a transaction. A broken observer must neither
    // undo a successful write nor prevent the remaining observers from running.
    // Preparation events deliberately retain emit's fail-closed behavior.
    notify: function (name, payload) {
      try { declare(name); } catch (error) { console.error('Cardable event declaration failed: ' + name, error); }
      (listeners[name] || []).slice().forEach(function (fn) {
        try { fn(payload); } catch (error) { console.error('Cardable notification failed: ' + name, error); }
      });
    }
  };
})(window.Cardable);
