(function(C,root){
  'use strict';
  function props(s,p){
    var ui=C.studioUI,field=ui.field,select=ui.select,section=ui.section,button=ui.button,limits=C.studioScenes.limits(s.tier),simple=s.renderer&&s.renderer.kind==='Simple';
    if(!p){ui.node('p','studio-copy',s.panel,s.scene.props.length+' / '+limits.props+' props · up to ten lite collection cards. '+(simple?'Simple mode keeps props stored but does not render them.':'Select a prop in the stage or outliner.'));
      if(s.scene.props.length>=Math.max(1,limits.props-2))ui.node('p','studio-limited',s.panel,limits.props?'Near the prop limit. Delete a prop to make room.':'Very Low stores scenes with props and renders no props.');
      Object.keys(C.studioScenes.catalog).forEach(function(group){section(s,group.charAt(0).toUpperCase()+group.slice(1));var grid=ui.node('div','studio-presets-grid',s.panel);C.studioScenes.catalog[group].forEach(function(pair){button(pair[1],grid,function(){s.api.addProp(pair[0]);}).disabled=simple||s.scene.props.length>=limits.props;});});
      section(s,'Scene objects');s.scene.props.forEach(function(prop){button(prop.name+(prop.visible?'':' · hidden'),s.panel,function(){ui.inspect(s,'prop',prop.id);});});return;}
    field(s,'Name','text',p.name,null,null,null,function(v){p.name=v.slice(0,60);},p.locked);
    field(s,'Locked','checkbox',p.locked,null,null,null,function(v){p.locked=v;}).addEventListener('change',function(){ui.inspect(s,'prop',p.id);});
    field(s,'Visible','checkbox',p.visible,null,null,null,function(v){p.visible=v;},p.locked);
    ui.color(s,p,'color','Color');select(s,'Material',p.material,['matte','gloss','metal','emissive'],function(v){p.material=v;},p.locked);
    ui.vector(s,'Position',p.position,-8,8,.05,function(){},p.locked);ui.vector(s,'Rotation',p.rotation,-180,180,1,function(){},p.locked);ui.vector(s,'Scale',p.scale,.05,6,.05,function(){},p.locked);
    field(s,'Cast shadow','checkbox',p.castShadow,null,null,null,function(v){p.castShadow=v;},p.locked||s.tier==='low'||simple||C.studioProps.isEffect(p));
    select(s,'Animation',p.animation,['none','spin','float'],function(v){p.animation=v;},p.locked||C.motion.reduced||simple);field(s,'Animation speed','range',p.speed,.1,3,.1,function(v){p.speed=v;},p.locked||C.motion.reduced||simple);
    if(C.studioProps.isEffect(p))field(s,'Effect density / opacity','range',p.density,.05,1,.05,function(v){p.density=v;},p.locked);
    if(p.type==='floor')select(s,'Floor surface',p.surface,['matte','glossy','mirror'],function(v){p.surface=v;},p.locked);
    if(p.type==='backdrop')ui.color(s,p,'gradient','Gradient top');
    if(p.type==='neon-tube'){var input=field(s,'Neon text','text',p.text,null,null,null,function(v){p.text=v.slice(0,12);},p.locked);input.maxLength=12;}
    if(p.type==='pack')select(s,'Pack skin',p.packId,C.data.packs.map(function(pack){return [pack.id,pack.name];}),function(v){p.packId=v;},p.locked);
    if(p.type==='collection'){select(s,'Arrangement',p.arrangement,['stack','fan','wall'],function(v){p.arrangement=v;},p.locked);section(s,'Collection · ten cards total');
      var chosen=ui.node('div','studio-collection-list',s.panel),instances=C.state.current.inventory;
      p.instances.forEach(function(id){var instance=instances.find(function(i){return i.instanceId===id;}),card=instance&&C.data.cards.find(function(c){return c.id===instance.cardId;});button((card?card.name:'Unavailable card')+' · remove',chosen,function(){s.api.mutate(function(){p.instances=p.instances.filter(function(v){return v!==id;});});ui.inspect(s,'prop',p.id);}).disabled=p.locked;});
      var holder=ui.node('label','studio-field',s.panel),picker=ui.node('select','studio-select',holder);picker.setAttribute('aria-label','Add collection card');ui.node('option','',picker,'Choose a collected card').value='';
      instances.forEach(function(instance){if(p.instances.indexOf(instance.instanceId)>=0)return;var card=C.data.cards.find(function(c){return c.id===instance.cardId;});if(card){var option=ui.node('option','',picker,card.name+' · '+instance.serial);option.value=instance.instanceId;}});
      picker.disabled=p.locked;picker.addEventListener('change',function(){if(!picker.value)return;var total=s.scene.props.reduce(function(n,v){return n+(v.type==='collection'?v.instances.length:0);},0);if(total>=10){s.api.status('Collection-card limit reached: ten per scene.');picker.value='';return;}s.api.mutate(function(){p.instances.push(picker.value);});ui.inspect(s,'prop',p.id);});
    }
    var row=ui.node('div','studio-presets-row',s.panel);button('Snap to floor',row,function(){s.api.mutate(function(){C.studioProps.snap(p);});ui.inspect(s,'prop',p.id);}).disabled=p.locked||C.studioProps.isEffect(p);button('Duplicate',row,function(){s.api.duplicate();},'Ctrl/Cmd+D').disabled=p.locked;button('Delete',row,function(){s.api.remove();},'Del').disabled=p.locked;
    if(C.motion.reduced)ui.node('p','studio-copy',s.panel,'Reduced motion pauses prop animation, spinning parts and effects.');
  }
  function scenes(s){
    var ui=C.studioUI,button=ui.button,store=C.state.current.studio||(C.state.current.studio={slots:[],last:{}}),name=ui.node('input','studio-scene-name',s.panel);
    name.type='text';name.maxLength=60;name.placeholder='Scene name';name.setAttribute('aria-label','Scene name');name.value=s.slotName||'Untitled scene';name.addEventListener('input',function(){s.slotName=name.value;});
    ui.node('p','studio-copy',s.panel,'Ten slots. Save writes the current composition and thumbnail. Load keeps the exact card you entered with. Last scene saves on exit.');
    var grid=ui.node('div','studio-slots',s.panel);
    for(var i=0;i<10;i++)(function(index){var slot=store.slots[index],row=ui.node('div','studio-slot',grid);if(slot&&slot.thumbnail){var image=ui.node('img','',row);image.src=slot.thumbnail;image.alt='Scene thumbnail: '+slot.name;image.width=160;image.height=100;}
      ui.node('span','studio-copy',row,(index+1)+'. '+(slot?slot.name:'Empty'));var actions=ui.node('div','studio-presets-row',row);
      button('Save',actions,function(){s.api.saveSlot(index,name.value);scenesRefresh();});button('Load',actions,slot?function(){s.api.loadScene(slot.scene);s.slotName=slot.name;ui.inspect(s,'scenes');}:null);
      button('Delete',actions,slot?function(){store.slots[index]=null;C.state.save();scenesRefresh();}:null);
    })(i);
    function scenesRefresh(){ui.inspect(s,'scenes');}
    ui.section(s,'Copyable scene JSON');var text=ui.node('textarea','studio-json',s.panel);text.rows=8;text.spellcheck=false;text.setAttribute('aria-label','Scene JSON');text.value=s.jsonDraft||C.studioScenes.serialize(s.scene);text.addEventListener('input',function(){s.jsonDraft=text.value;});var actions=ui.node('div','studio-presets-row',s.panel);
    button('Export JSON',actions,function(){text.value=JSON.stringify(C.studioScenes.parse(s.scene),null,2);s.jsonDraft=text.value;text.focus();text.select();s.api.status('Scene JSON selected. Copy with Ctrl/Cmd+C.');});
    button('Copy JSON',actions,async function(){text.focus();text.select();try{await root.navigator.clipboard.writeText(text.value);s.api.status('Scene JSON copied.');}catch(_){s.api.status('JSON selected. Use Ctrl/Cmd+C to copy.');}});
    button('Import JSON',actions,function(){try{if(text.value.length>262144)throw Error('Scene JSON is too large.');s.api.loadScene(C.studioScenes.parse(text.value));s.api.status('Scene imported. Undo restores the previous composition.');ui.inspect(s,'scenes');}catch(error){s.api.status(error.message);}});
  }
  C.studioPropPanel=props;C.studioScenePanel=scenes;
})(window.Cardable,window);
