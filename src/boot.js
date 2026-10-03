(function (C, root) {
  'use strict';
  C.boot = function () {
  C.state.load();
  C.packs.init();
  C.settings.init();
  C.contextMenu.init();
  root.document.body.style.setProperty('--page-grain-opacity', C.config.polish.grainOpacity);
  C.input.init();
  C.dots.init();
  C.cursor.init();
  C.logo.init();
  C.menu.init();
  C.packView.init();
  C.currencyView.init();
  C.inventoryHint.init();
  C.opening.init();
  C.inventory.init();
  C.detail.init();
  C.tutorial.init();
  C.preferences.init();
  // Subscribe the menu before catch-up so a new arrival plays once on load.
  C.timers.start();
  C.events.emit('app:ready');
  };
})(window.Cardable, window);
