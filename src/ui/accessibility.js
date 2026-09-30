(function (C, root) {
  'use strict';
  var traps = [], selector = 'button, a[href], input, select, textarea, [tabindex]';
  function available(el) {
    if (el.disabled || el.getAttribute('tabindex') === '-1') return false;
    for (var parent = el; parent; parent = parent.parentElement) if (parent.hidden || parent.inert || parent.getAttribute('aria-hidden') === 'true') return false;
    return true;
  }
  C.accessibility = {
    trap: function (container) { traps = traps.filter(function (el) { return el !== container; }); traps.push(container); },
    release: function (container) { traps = traps.filter(function (el) { return el !== container; }); },
    available: available
  };
  root.document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || !traps.length) return;
    var scope = traps[traps.length - 1], list = Array.from(scope.querySelectorAll(selector)).filter(available);
    if (!list.length) { event.preventDefault(); return; }
    var index = list.indexOf(root.document.activeElement), next = event.shiftKey ? index - 1 : index + 1;
    if (index === -1 || next < 0 || next >= list.length) { event.preventDefault(); list[index === -1 ? event.shiftKey ? list.length - 1 : 0 : (next + list.length) % list.length].focus({ preventScroll: true }); }
  });
})(window.Cardable, window);
