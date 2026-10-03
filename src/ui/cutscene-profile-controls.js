(function(C){
  'use strict';
  var create=C.uiKit.create;
  // The setting's keyboard and pointer paths both go through the same hold control.
  C.uiKit.create=function(descriptor,parent,binding){
    if(descriptor.key!=='strobing')return create.call(this,descriptor,parent,binding);
    binding=binding||{get:C.settings.get,set:C.settings.set,subscribe:C.settings.onChange};
    var guarded=Object.assign({},binding,{set:function(key,value){if(value!=='full')binding.set(key,value);}});
    var control=create.call(this,descriptor,parent,guarded),button=control.buttons.filter(function(b){return b.value==='full';})[0];
    var confirm=C.uiKit.confirmation(button,function(){binding.set('strobing','full');},{mode:'hold',holdLabel:'Hold 3 seconds for Full'});
    button.setAttribute('aria-description','Hold for three seconds to enable Full strobing.');
    var update=control.update,destroy=control.destroy;
    control.update=function(now,dt){var a=update(now,dt),b=confirm.update(now,dt);return a||b;};
    control.destroy=function(){confirm.destroy();destroy();};
    return control;
  };
})(window.Cardable);
