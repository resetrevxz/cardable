(function (C, root) {
  'use strict';
  C.state.load();
  C.input.init();
  C.dots.init();
  C.cursor.init();
  C.logo.init();
  C.menu.init();
  C.dev.init();
  C.packView.init();
  C.currencyView.init();
  C.inventoryHint.init();
  C.gallery.init();
  C.opening.init();
  // Subscribe the menu before catch-up so a new arrival plays once on load.
  C.timers.start();
})(window.Cardable, window);
