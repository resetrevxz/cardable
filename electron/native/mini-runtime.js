(function(C){'use strict';
  // Only the full renderer owns gameplay state and save writes.
  C.settings={get:function(key){return key==='keyBindings'?(C.miniKeyBindings||{}):null;},holdKey:'Space'};
})(window.Cardable);
