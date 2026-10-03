(function (C) {
  'use strict';
  var D=C.dev;
  D.startups.push(function(){
    var group='Cutscenes';
    function register(id,label,type,properties){D.register(Object.assign({id:'cutscene.'+id,label:label,type:type,group:group},properties));}
    function film(){return C.cutscenes.active;}
    register('ascendant','Play Ascendant · milestone C','button',{helper:'Use a sandbox save. Runs the complete S0–S8 film and shared-background card handoff.',run:function(){
      if(C.opening.phase!=='idle')throw new Error('Finish the active reveal first.');
      if(!D.sandbox)D.switchSandbox(true);
      if(!C.state.current.packs.ready)D.mutate('Cinematic preview pack',function(s){s.packs.ready=1;});
      D.force={tier:'ascendant',card:'',variant:'',sticky:false};
      var cleanup=C.events.on('reveal:phase',function(phase){if(phase==='cutting'){cleanup();Promise.resolve().then(function(){C.opening.finishCut();});}});
      if(D.show)D.show(false);
      if(!C.opening.openNow(D.pack().id)){cleanup();throw new Error('Pack opening is unavailable.');}
    }});
    register('scrub','Timeline position (ms)','slider',{helper:'Presentation only. The reserved card and rewards stay unchanged.',min:0,max:32500,step:50,available:function(){return !!film();},get:function(){return film()?film().timeMs:0;},set:function(value){if(film())film().seek(value);}});
    register('scene','Jump to section','segment',{helper:'S0–S8 descriptor sections; stays on the shared reveal clock.',choices:['prelude','spark','cave','tip','fall','impact','underwater','tendrils','ascend','topPulse','morph','clock','title','shatter','aurora','explosion','card'],get:function(){return C.opening.intro.section;},available:function(){return !!film();},set:function(id){film().jump(id);}});
    register('rate','Cinematic timescale','slider',{helper:'0.1–4×, independent of pull and pack timers.',min:.1,max:4,step:.1,available:function(){return !!film();},get:function(){return film()?film().rate:1;},set:function(value){film().setRate(value);}});
    register('quality','Cinematic quality override','segment',{helper:'Changes this renderer only. Resolution ramps; saved graphics settings stay unchanged.',choices:['very-low','low','medium','high'],available:function(){return !!film();},get:function(){return ['very-low','low','medium','high'][film()?film().level:2];},set:function(value){film().setQuality(['very-low','low','medium','high'].indexOf(value));}});
    register('skip','Skip to card','button',{helper:'Enabled after two seconds. Uses the shared 500 ms skip path.',available:function(){return !!film()&&film().timeMs>=2000;},run:function(){film().skip();}});
    register('length','Full / Short','segment',{helper:'Full 32.5 s; Short follows the listed shots (16.5 s including the card). Reduced motion remains calm.',choices:['full','short'],get:function(){return C.settings.get('cutscenes')==='short'?'short':'full';},set:function(value){D.setSetting('cutscenes',value);if(film())film().setMode(value);}});
    register('flashMeter','Show safe-flash meter','toggle',{helper:'Dev-only luminance-change graph from the existing canvas. One declared flash; not a safety certification.',get:function(){return C.cutscenes.debug.meter;},set:function(value){C.cutscenes.debug.meter=!!value;C.fx.wake();}});
    register('mono','Monochrome materials','toggle',{helper:'Use the existing session color override.',get:function(){return C.settings.get('rarityColor')==='mono';},set:function(value){D.setSetting('rarityColor',value?'mono':'color');}});
  });
})(window.Cardable);
