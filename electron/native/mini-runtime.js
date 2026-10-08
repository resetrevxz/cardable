(function(C){'use strict';
  // Mini has no state loader, save writer, input/opening controller or desktop API.
  C.settings={get:function(key){return key==='keyBindings'?(C.miniKeyBindings||{}):null;},holdKey:'Space'};
  C.viewport={parent:function(parent){return parent;}};
})(window.Cardable);
