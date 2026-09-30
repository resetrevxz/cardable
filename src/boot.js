(function (C, root) {
  'use strict';
  C.state.load();
  C.timers.start();
  C.input.init();
  C.dev.init();
  var baseTitle = 'Cardable';
  C.events.on('pack:ready', function () {
    if (root.document.hidden) root.document.title = baseTitle + ' · pack ready';
  });
  root.document.addEventListener('visibilitychange', function () {
    root.document.title = root.document.hidden && C.state.current.packs.ready > 0 ? baseTitle + ' · pack ready' : baseTitle;
  });
})(window.Cardable, window);
