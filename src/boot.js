(function (C, root) {
  'use strict';
  C.boot = function () {
  if (C.setup) C.setup.status(C.desktop.info && C.desktop.info.updated ? 'Finishing your update · restoring your collection…' : 'Restoring your collection…');
  C.state.load();
  C.packs.init();
  C.settings.init();
  if (C.setup) C.setup.status('Preparing cards and controls…');
  if(C.desktop.info && C.desktop.info.safeMode) {
    ['quality'].concat(C.settingsSchema.graphicsKeys).forEach(function(key){C.settings.override(key,'low');});
  }
  C.viewport.init();
  C.qol.init();
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
  C.events.notify('app:ready');
  };
})(window.Cardable, window);
