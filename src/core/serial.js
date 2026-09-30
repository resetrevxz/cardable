(function (C) {
  'use strict';
  var alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  function randomIndex(length) {
    var bytes = new Uint8Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      return bytes[0] % length;
    }
    return Math.floor(Math.random() * length);
  }
  C.serial = {
    makePlayerCode: function () {
      var out = '';
      for (var i = 0; i < C.config.serial.playerCodeLength; i += 1) out += alphabet.charAt(randomIndex(alphabet.length));
      return out;
    },
    format: function (playerCode, counter) {
      return C.config.serial.prefix + '-' + playerCode + '-' + String(counter).padStart(C.config.serial.counterDigits, '0');
    },
    next: function () {
      if (!C.state.current) C.state.load();
      C.state.current.serialCounter += 1;
      C.state.save();
      return C.serial.format(C.state.current.playerCode, C.state.current.serialCounter);
    },
    alphabet: alphabet
  };
})(window.Cardable);
