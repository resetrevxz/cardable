(function(C){
  'use strict';
  var D=C.studioPresetCatalog,S=C.studioScenes;
  function light(type,p,c,i,size,r,extra){return S.light(Object.assign({type:type,position:p,color:c,intensity:i,size:size,rotation:r},extra||{}));}
  function prop(type,p,s,c,m,extra){return Object.assign({type:type,position:p,scale:s,color:c,material:m||'matte'},extra||{});}
  var W=[.9,.95,1],B=[.26,.48,1],G=[1,.42,.16],T=[.25,.88,.8];
  var rigs={
    'Edge Light Trio':[light('strip',[-1.1,.4,-.6],B,2.7,1,[0,-140,0]),light('strip',[1.2,.5,-.4],W,2.2,1,[0,140,0]),light('area',[0,1.4,2.8],W,1.8,1.8,[-24,0,0])],
    'Cathedral Shaft':[light('spot',[-1.7,3.6,1.9],W,4.2,1,[-65,-28,0],{angle:28,gobo:'grid',softness:.45}),light('area',[.8,.35,2.4],B,1.1,2,[-12,20,0]),light('strip',[0,.7,-1],W,1.8,1.2,[0,180,0])],
    'Gel Split Warm/Cool':[light('area',[-1.8,1.2,2.2],[1,.66,.4],2.3,1.6,[-25,-35,0]),light('strip',[1.3,.6,1.2],[.36,.7,1],2.1,1,[-12,48,0]),light('area',[0,2,3],W,.8,2,[-30,0,0])],
    'Under-Glow':[light('area',[0,-1.1,1.3],T,2.2,1.3,[35,0,0]),light('strip',[-1,.8,-.5],W,2,1,[0,-130,0]),light('area',[.6,1.6,2.6],W,1.5,1.5,[-28,12,0])]
  };
  Object.keys(rigs).forEach(function(n){D.rigs[n]=rigs[n];});
  var looks=[
    ['Silver Print',{exposure:.06,contrast:1.08,saturation:.3,gain:[.99,1,1.02],bloom:.1,halation:.07,grain:.013}],
    ['Night Chrome',{exposure:-.1,contrast:1.2,saturation:.74,temperature:-.2,bloom:.16,vignette:.25,halation:.12}],
    ['Soft Pastel',{exposure:.14,contrast:.93,saturation:.73,lift:[.018,.02,.028],gamma:[1.04,1.04,1.05],bloom:.13}],
    ['Heat Haze',{exposure:.015,contrast:1.09,saturation:.88,temperature:.28,halation:.22,bloom:.17,grain:.017}],
    ['Ink Wash',{exposure:-.03,contrast:.87,saturation:.15,lift:[.025,.025,.023],vignette:.24,grain:.025}],
    ['Cobalt Film',{exposure:0,contrast:1.13,saturation:.82,temperature:-.21,tint:.035,lift:[-.01,.004,.018],gain:[.98,1,1.04],grain:.016,halation:.11}]
  ];D.looks.push.apply(D.looks,looks);
  var styles=[
    ['Silicon Cathedral','Epic','quiet','cool','Cathedral Shaft','Cobalt Film',[.012,.02,.043],[-.13,.16,3.8,32],[prop('floor',[0,-.9,0],[1,1,1],[.055,.08,.12],null,{surface:'glossy'}),prop('ring-light',[-1.2,.5,-1],[.7,1.5,.7],W,'emissive'),prop('ring-light',[1.2,.5,-1],[.7,1.5,.7],W,'emissive'),prop('haze',[0,.3,-.7],[1,1,1],[.22,.35,.5],null,{density:.14})],{accent:.18,rim:.55,foil:.7,warm:.1}],
    ['Foundry','Tech','dramatic','warm','Gel Split Warm/Cool','Heat Haze',[.029,.016,.011],[.16,.12,3.5,34],[prop('floor',[0,-.9,0],[1,1,1],[.13,.08,.055]),prop('heatsink',[-1.1,-.15,-.6],[.6,1.3,.7],[.31,.28,.25],'metal'),prop('sparks',[1,-.3,-.7],[1,1,1],G,null,{density:.13}),prop('smoke',[0,.1,-.8],[1,1,1],[.2,.15,.12],null,{density:.1})],{accent:.12,rim:.45,foil:.64,warm:.08}],
    ['Observatory','Epic','quiet','blue','Edge Light Trio','Night Chrome',[.004,.007,.021],[-.1,.13,3.7,33],[prop('ring-light',[0,.35,-1.3],[1.5,1.5,1.5],[.26,.38,.62],'emissive'),prop('dust',[0,.5,-1],[1,1,1],[.65,.77,1],null,{density:.12}),prop('plinth-round',[0,-.8,0],[1,.25,1],[.08,.1,.17],'metal')],{accent:.16,rim:.6,foil:.7,warm:.05}],
    ['Glass Atrium','Showcase','bright','neutral','Top Softbox','Soft Pastel',[.37,.45,.48],[.11,.08,3.45,33],[prop('floor',[0,-.9,0],[1,1,1],[.51,.59,.6],null,{surface:'glossy'}),prop('glass-case',[0,0,-.02],[1.16,1.3,1.12],[.8,.92,.95],'gloss',{castShadow:false}),prop('plant',[1.16,-.38,-.6],[.7,.7,.7],[.22,.39,.27])],{accent:.06,rim:.17,foil:.66,warm:.1}],
    ['Datacenter Aisle','Tech','precise','cyan','Edge Light Trio','Cobalt Film',[.008,.017,.024],[-.06,.06,3.8,32],[prop('floor',[0,-.9,0],[1,1,1],[.035,.05,.065],null,{surface:'glossy'}),prop('heatsink',[-1.2,.1,-.85],[.65,1.9,.7],[.17,.23,.28],'metal'),prop('heatsink',[1.2,.1,-.85],[.65,1.9,.7],[.17,.23,.28],'metal'),prop('led-strip',[-1,.2,-.5],[.8,.8,.8],T,'emissive',{rotation:[0,0,90]}),prop('led-strip',[1,.2,-.5],[.8,.8,.8],B,'emissive',{rotation:[0,0,90]})],{accent:.17,rim:.45,foil:.75,warm:.08}],
    ['Dark Gallery','Showcase','quiet','neutral','Cathedral Shaft','Silver Print',[.006,.008,.012],[0,.08,3.25,35],[prop('floor',[0,-.9,0],[1,1,1],[.04,.046,.055]),prop('plinth-square',[0,-.8,0],[1.15,.27,1],[.18,.19,.22]),prop('spotlight-can',[-1.2,1.2,-.6],[.6,.6,.6],[.23,.25,.28],'metal',{rotation:[55,-20,0]})],{accent:.08,rim:.3,foil:.68,warm:.1}],
    ['Sandbox Mini','Studio','playful','warm','Butterfly','Soft Pastel',[.16,.13,.1],[.12,.27,3.8,32],[prop('floor',[0,-.9,0],[1,1,1],[.34,.26,.17]),prop('plinth-square',[0,-.8,0],[1.13,.2,1],[.48,.38,.25]),prop('plant',[1,-.5,-.5],[.5,.5,.5],[.31,.4,.23]),prop('screw',[-.75,-.8,.35],[1.4,1.4,1.4],[.6,.64,.68],'metal')],{accent:.1,rim:.18,foil:.7,warm:.2}],
    ['Zero-G','Epic','soft','cool','Under-Glow','Night Chrome',[.007,.018,.027],[-.12,.1,3.6,33],[prop('shard',[-1,.5,-.4],[.45,.85,.4],[.43,.7,.8],'gloss',{animation:'float',rotation:[18,25,-25]}),prop('shard',[1,-.3,-.5],[.45,.75,.4],[.75,.55,.83],'gloss',{animation:'float',rotation:[-18,-20,35]}),prop('dust',[0,.2,-.8],[1,1,1],[.47,.72,.83],null,{density:.08})],{accent:.28,rim:.58,foil:.72,warm:.05}]
  ];D.styles.push.apply(D.styles,styles);
  var entries=[];
  function add(kind,name,data,tags,adapt){var e={id:kind+':'+D.slug(name),kind:kind,name:name,data:data,tags:tags,adapt:adapt||{accent:.14,rim:.4,foil:.72,warm:.1},visualUpdate:true};D.entries.push(e);entries.push(e);}
  styles.forEach(function(x){add('scene',x[0],{rig:x[4],look:x[5],backdrop:x[6],camera:x[7],props:x[8]},[x[1],x[2],x[3]],x[9]);});
  Object.keys(rigs).forEach(function(n){add('rig',n,rigs[n],['Light','Visual overhaul']);});looks.forEach(function(x){add('look',x[0],x[1],['Look','Visual overhaul']);});
  ['Orbit Reveal','Spiral Push','Rack Focus Pair','Slow Crane Down','Detail Crawl','Pendulum'].forEach(function(n){add('move',n,null,['Camera','quiet']);});
  C.visualPresets={entries:entries};
})(window.Cardable);
