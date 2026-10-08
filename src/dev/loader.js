(function (C, root) {
  'use strict';
  var files=['runtime','shell','saves','simulations','previews','tools','cutscenes','fun','checks','settings-checks','data-checks','bug-checks','inventory-checks','pack-checks','picker-check','picker-tools','achievements','qol-check','stability-check'];
  var css=root.document.createElement('link');css.rel='stylesheet';css.href='src/ui/kit/components/developer.css';root.document.head.appendChild(css);
  function load(index) {
    if(index===files.length){
      Promise.resolve(C.desktop && C.desktop.prepare ? C.desktop.prepare() : false).then(function(){
        C.dev.prepare();C.events.on('app:ready',function(){C.dev.init();});C.boot();
      });
      return;
    }
    var script=root.document.createElement('script');script.src='src/dev/'+files[index]+'.js';script.async=false;
    script.onload=function(){load(index+1);};script.onerror=function(){root.console.error('Cannot load developer module: '+files[index]);};
    root.document.body.appendChild(script);
  }
  load(0);
})(window.Cardable,window);
