(function (C) {
  'use strict';
  // Display-only currency. No gameplay earning/spending is wired in v1.
  C.currency = {
    add: function (amount) {
      if (!Number.isSafeInteger(amount) || amount < 0) throw new TypeError('Currency addition must be a non-negative safe integer');
      var before = C.state.current.currency, next = before + amount;
      if (!Number.isSafeInteger(next)) throw new RangeError('Currency exceeds the safe integer range');
      if (next === before) return next;
      C.state.current.currency = next; C.state.save();
      C.events.emit('currency:changed', { before: before, value: next });
      return next;
    }
  };
})(window.Cardable);
