(function (C, root) {
  'use strict';
  var files=['runtime','backup','shell','saves','simulations','previews','tools','cutscenes','fun','checks','settings-checks','data-checks','bug-checks','inventory-checks','pack-checks','picker-check','picker-tools','achievements','qol-check','stability-check','controls-check','visual-gallery','visual-sheet','visual-check'];
  var css=root.document.createElement('link');css.rel='stylesheet';css.href='src/ui/kit/components/developer.css';root.document.head.appendChild(css);
  function load(index) {
    if(index===files.length){
      Promise.resolve(C.desktop && C.desktop.prepare ? C.desktop.prepare() : false).then(async function(){
        C.dev.prepare();C.boot();if(C.setup)C.setup.status('Preparing developer backup…');
        await C.dev.prepareBackup();C.dev.init();if(C.setup){C.setup.finish();C.setup.welcome();}
      }).catch(function(error){C.bootFailure=true;if(C.setup)C.setup.finish();if(C.friendly)C.friendly.showStartupFailure(error);root.console.error('Cardable developer startup failed:',error);});
      return;
    }
    var script=root.document.createElement('script');script.src='src/dev/'+files[index]+'.js';script.async=false;
    script.onload=function(){load(index+1);};script.onerror=function(){var error=new Error('Cannot load developer module: '+files[index]);C.bootFailure=true;if(C.setup)C.setup.finish();if(C.friendly)C.friendly.showStartupFailure(error);root.console.error(error);};
    root.document.body.appendChild(script);
  }
  load(0);
})(window.Cardable,window);
