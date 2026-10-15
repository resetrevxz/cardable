(function (C, root) {
  'use strict';
  C.inventoryIcons = {
    create: function(name){return C.icons.create(name);},
    button: function (name, label, action, parent) { var el = C.packMarkup.node('button','inventory-icon',parent); el.type = 'button'; el.setAttribute('aria-label',label); el.dataset.tooltip = label; el.appendChild(C.inventoryIcons.create(name)); if (action) el.addEventListener('click',action); return el; }
  };
})(window.Cardable, window);
