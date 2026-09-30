/* Cardable's single classic-script namespace. */
(function (root) {
  'use strict';
  var C = root.Cardable = root.Cardable || {};
  C.data = C.data || {};
  C.registries = C.registries || {};
  C.version = '0.1.0';
  C.randomId = function (prefix) {
    var bytes = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return (prefix || 'id') + '-' + Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  };
  C.rarity = function (id) { return C.data.rarities.find(function (item) { return item.id === id; }) || null; };
  C.card = function (id) { return C.data.cards.find(function (item) { return item.id === id; }) || null; };
  C.pack = function (id) { return C.data.packs.find(function (item) { return item.id === id; }) || null; };
})(window);
