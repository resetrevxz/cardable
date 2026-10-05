(function (C) {
  'use strict';
  // Small additive render registries shared by independently shipped updates.
  function registry() {
    var items = new Map();
    return { register: function (id, render) { items.set(id, render); return function () { items.delete(id); }; },
      render: function (host, context) { items.forEach(function (render) { render(host, context); }); } };
  }
  C.inventoryTabs = C.inventoryTabs || registry();
  C.detailActions = C.detailActions || registry();
})(window.Cardable);
