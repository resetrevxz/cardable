(function (C) {
  'use strict';
  function transact(amount, direction) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new TypeError('Currency amount must be a non-negative safe integer');
    var before = C.state.current.currency;
    if (direction < 0 && amount > before) {
      C.events.emit('currency:insufficient', { requested: amount, available: before });
      return false;
    }
    var next = direction > 0 ? before + amount : before - amount;
    if (!Number.isSafeInteger(next)) throw new RangeError('Currency exceeds the safe integer range');
    if (next === before) return next;
    C.state.current.currency = next;
    C.state.save();
    C.events.emit('currency:changed', { before: before, value: next, amount: Math.abs(next - before), direction: direction });
    return next;
  }

  C.currency = {
    add: function (amount) {
      return transact(amount, 1);
    },
    canAfford: function (amount) {
      if (!Number.isSafeInteger(amount) || amount < 0) throw new TypeError('Currency amount must be a non-negative safe integer');
      return C.state.current.currency >= amount;
    },
    spend: function (amount) {
      return transact(amount, -1);
    }
  };
})(window.Cardable);
