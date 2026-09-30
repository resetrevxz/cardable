(function (C, root) {
  'use strict';
  C.state.load();
  C.timers.start();
  C.input.init();
  C.dots.init();
  C.cursor.init();
  C.logo.init();
  C.menu.init();
  C.dev.init();
  C.gallery.init();
})(window.Cardable, window);
