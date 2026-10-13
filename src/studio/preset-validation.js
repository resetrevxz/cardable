(function(C){
  'use strict';
  // Explicit source validation. No canvas is created and no preset is applied.
  // Render acceptance is a separate browser harness, including pixel readback.
  var S=C.studioScenes,P=C.studioPresets,A=C.studioAnimation;
  function finite(value,path,fail){
    if(typeof value==='number'&&!Number.isFinite(value))fail.push(path+' is not finite');
    else if(Array.isArray(value))value.forEach(function(v,i){finite(v,path+'['+i+']',fail);});
    else if(value&&typeof value==='object')Object.keys(value).forEach(function(k){finite(value[k],path+'.'+k,fail);});
  }
  function inspect(scene,kind){
    var errors=[],warnings=[],objects=S.objects(scene),ids=new Set(),supported=[].concat.apply([],Object.keys(S.catalog).map(function(k){return S.catalog[k].map(function(p){return p[0];});}));
    finite(scene,'scene',errors);
    objects.forEach(function(o){if(!o.id||ids.has(o.id))errors.push('Duplicate/missing object ID: '+o.id);ids.add(o.id);});
    scene.props.forEach(function(p){if(supported.indexOf(p.type)<0)errors.push('Unsupported prop: '+p.type);if(p.type==='collection'&&!p.instances.length)warnings.push('Collection prop '+p.id+' needs owned companion cards');});
    if(scene.lights.length>16||scene.props.length>60)errors.push('Authoring object budget exceeded');
    if(scene.props.reduce(function(n,p){return n+(p.type==='collection'?p.instances.length:0);},0)>10)errors.push('Companion-card budget exceeded');
    scene.animation.cameras.concat(scene.animation.titles).forEach(function(o){if(ids.has(o.id))errors.push('Animation object ID collision: '+o.id);ids.add(o.id);});
    var tracks=new Set(),keys=new Set();
    scene.animation.tracks.forEach(function(t){if(tracks.has(t.id))errors.push('Duplicate track ID: '+t.id);tracks.add(t.id);var o=A.object(scene,t.target);
      if(!o)errors.push('Missing animation target: '+t.target);else if(A.properties(scene,o).indexOf(t.property)<0)errors.push('Unsupported animation property: '+t.target+'.'+t.property);
      t.keys.forEach(function(k){if(keys.has(k.id))errors.push('Duplicate key ID: '+k.id);keys.add(k.id);if(k.time<0||k.time>scene.director.duration)errors.push('Key outside duration');});
    });
    scene.keyframes.forEach(function(k){if(keys.has(k.id))errors.push('Duplicate pose key ID: '+k.id);keys.add(k.id);if(!ids.has(k.target))errors.push('Missing pose target');});
    if(keys.size>1024||scene.animation.tracks.length>256||scene.keyframes.length>96)errors.push('Animation budget exceeded');
    if(kind==='scene'){
      var m=C.studioCamera.matrices(scene.camera,16/9,scene.card),center=C.studioCamera.project(m,scene.card.position);
      if(!scene.card.visible||!center.front||center.x<0||center.x>1||center.y<0||center.y>1)errors.push('Primary card is invisible or framed outside the image');
      var top=C.studioCamera.project(m,C.studioCamera.transform(m.model,[0,.7,0]).slice(0,3)),bottom=C.studioCamera.project(m,C.studioCamera.transform(m.model,[0,-.7,0]).slice(0,3)),height=Math.abs(top.y-bottom.y);
      if(!Number.isFinite(height)||height<.12||height>1.2)errors.push('Unreasonable full-scene card framing: '+height);
    }
    if(S.serialize(scene)!==S.serialize(S.parse(S.serialize(scene))))errors.push('Scene serialization changes data');
    return {errors:errors,warnings:warnings};
  }
  function catalog(profiles){
    profiles=profiles||[null];var tiers=Object.keys(S.tiers),rows=[],counts={},seen=new Set(),checks=0,meshes=new Map();
    function vertices(type,tier){var key=type+':'+tier;if(!meshes.has(key)){var data=C.studioProps.mesh(type,tier);if(!data.length||data.length%27||!Array.from(data).every(Number.isFinite))throw Error('Invalid procedural mesh '+key);meshes.set(key,data.length/9);}return meshes.get(key);}
    P.catalog.forEach(function(entry){var errors=[],warnings=[],cases=0;counts[entry.kind]=(counts[entry.kind]||0)+1;
      if(seen.has(entry.id))errors.push('Duplicate catalog ID');seen.add(entry.id);finite(entry.data,entry.id,errors);
      var data=entry.data;if(entry.kind==='scene'&&data){if(!C.studioPresetCatalog.rigs[data.rig])errors.push('Missing rig '+data.rig);if(!C.studioPresetCatalog.looks.some(function(l){return l[0]===data.look;}))errors.push('Missing look '+data.look);}
      var rawProps=entry.kind==='props'?data:entry.kind==='scene'&&data?data.props:[];
      (rawProps||[]).forEach(function(p){if(!Object.keys(S.catalog).some(function(k){return S.catalog[k].some(function(x){return x[0]===p.type;});}))errors.push('Unknown authored prop '+p.type);});
      (entry.kind==='rig'?data||[]:entry.kind==='scene'&&data?C.studioPresetCatalog.rigs[data.rig]||[]:[]).forEach(function(l){if(C.studioLights.types.indexOf(l.type)<0)errors.push('Unknown authored light '+l.type);});
      profiles.forEach(function(profile){var base=S.defaults({cardId:'qa',instanceId:'qa-primary',serial:'REFERENCE',pulledAt:0});base.props=[S.prop({id:'qa-fan',type:'fan'})];base.post.exposure=.3;base.backdrop.position=[.2,.1,0];
        try{
          var before=S.serialize(base),built=P.build(entry,base,profile,'stage-1'),again=P.build(entry,base,profile,'stage-1');
          if(S.serialize(built)!==S.serialize(again))errors.push('Build is not deterministic');
          if(S.serialize(base)!==before)errors.push('Build changed the input scene');
          var combined=P.combine(base,entry,built,false,'high'),checked=inspect(combined,entry.kind);errors=errors.concat(checked.errors);warnings=warnings.concat(checked.warnings);
          var encoded=P.serialize(P.snapshot(entry.kind,entry.name,built,'audit-'+entry.id));if(P.serialize(P.parse(encoded))!==encoded)errors.push('Preset round-trip changes data');
          tiers.forEach(function(tier){var effective=S.effective(combined,tier),budget=S.limits(tier);if(effective.lights.length>budget.lights||effective.props.length>budget.props)errors.push('Unsafe '+tier+' budget');
            var total=effective.props.reduce(function(n,p){return n+vertices(p.type,tier)*(p.type==='collection'?p.instances.length:1);},0),cap={'very-high':750000,high:400000,medium:200000,low:80000,'very-low':0}[tier];if(total>cap)errors.push('Unsafe mesh budget for '+tier+': '+total+' vertices');
            [0,.35,1].forEach(function(t){var pose=C.studioDirector.sample(combined,combined.director.duration*t,0,true);finite(pose,'sample',errors);});cases++;checks++;
          });
        }catch(error){errors.push(error.message);}
      });
      rows.push({id:entry.id,kind:entry.kind,name:entry.name,cases:cases,errors:Array.from(new Set(errors)),warnings:Array.from(new Set(warnings)),rendered:false});
    });
    return {type:'source-data',counts:counts,entries:rows.length,cases:checks,passed:rows.every(function(r){return !r.errors.length;}),rows:rows};
  }
  C.studioPresetValidation={inspect:inspect,catalog:catalog};
})(window.Cardable);
