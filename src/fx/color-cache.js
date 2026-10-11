(function (C) {
  'use strict';
  // Canvas colour strings for the cinematic painters. Building 'rgba(r,g,b,a)' per particle per frame
  // was a measurable share of Exotic's frame; palette arrays are stable, so strings are cached per
  // array and 8-bit alpha (a canvas stores 8-bit alpha, so nothing visible changes).
  var strings = new WeakMap(), monos = new WeakMap();
  function tone(c) {
    if (C.config.rarityColorMode !== 'mono') return c;
    var m = monos.get(c);
    if (!m) { var l = Math.round(c[0] * .213 + c[1] * .715 + c[2] * .072); m = [l, l, l]; monos.set(c, m); }
    return m;
  }
  function rgba(c, a) {
    if (!(a > 0)) a = 0; else if (a > 1) a = 1;
    var k = Math.round(a * 255), table = strings.get(c);
    if (!table) { table = Object.create(null); strings.set(c, table); }
    return table[k] || (table[k] = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (k === 0 ? 0 : k === 255 ? 1 : +(k / 255).toFixed(3)) + ')');
  }
  C.fxColor = { tone: tone, rgba: rgba };
})(window.Cardable);
