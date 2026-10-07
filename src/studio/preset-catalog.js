(function(C){
  'use strict';
  // Authored compositions. Individual placement, lens, palette and adaptation rules
  // are intentional; families classify them, they do not generate the scenes.
  var S=C.studioScenes;
  function lamp(type,p,c,i,size,rotation,extra){return Object.assign(S.light({type:type,position:p,color:c,intensity:i,size:size,rotation:rotation}),extra||{});}
  var W=[1,.97,.93],B=[.62,.78,1],G=[1,.64,.24],P=[1,.18,.53],T=[.12,.85,1];
  var rigs={
    'Three-point':[lamp('area',[-1.7,2.1,2.8],W,2.6,1.3,[-32,-30,0]),lamp('area',[1.5,.3,2],B,.95,1,[-12,38,0]),lamp('strip',[.7,1,-.9],W,2.3,.85,[-25,150,0])],
    'Rim and Fill':[lamp('strip',[-1.2,.7,-.6],B,3.1,1.1,[-14,-125,0]),lamp('area',[.5,.8,2.6],W,1.35,1.4,[-20,10,0])],
    'Butterfly':[lamp('area',[0,1.9,2.8],W,3.2,1.3,[-36,0,0]),lamp('area',[0,-.55,1.7],[.83,.9,1],.5,.8,[18,0,0])],
    'Rembrandt':[lamp('area',[-2,1.7,2.5],[1,.87,.7],3,1,[-29,-39,0]),lamp('point',[1.4,-.2,2],B,.5,.6,[0,0,0]),lamp('strip',[.9,.6,-.7],W,1.8,.6,[0,148,0])],
    'Top Softbox':[lamp('area',[0,3.3,1.3],W,3.4,2,[-66,0,0]),lamp('area',[0,.1,3],W,.7,1.5,[0,0,0])],
    'Split Light':[lamp('area',[-2.1,.4,1.1],[.9,.94,1],3.5,.9,[-6,-65,0]),lamp('strip',[1,.3,-.7],[.52,.64,1],1.9,.6,[0,135,0])],
    'Backlight Halo':[lamp('strip',[0,.65,-1.1],[.73,.84,1],4,1.5,[-15,180,0]),lamp('area',[-.3,1,2.7],W,1.1,1.8,[-22,0,0]),lamp('ambient',[0,0,0],[.18,.2,.26],.2,1,[0,0,0])],
    'Colored Gel Duo':[lamp('strip',[-1.5,.8,1.7],P,2.8,1,[-20,-40,0]),lamp('area',[1.5,.5,2],T,2.4,1.2,[-14,40,0])],
    'Practical Neon':[lamp('strip',[-1.2,.6,.5],P,3.2,1.5,[-12,-63,0]),lamp('strip',[1.3,.4,.4],T,2.9,1.3,[-8,70,0]),lamp('area',[0,1.5,2.5],[.78,.83,1],.8,1.2,[-25,0,0])],
    'Sunset Window':[lamp('directional',[-2,1.7,2],[1,.53,.25],1.5,1,[-25,-50,0],{gobo:'blinds'}),lamp('area',[1,.4,2],[.7,.73,1],.8,1.8,[-10,25,0])],
    'Moonlight':[lamp('directional',[1.6,2.2,2],[.38,.58,1],1.7,1,[-46,36,0]),lamp('area',[-1,.4,2],[.73,.85,1],.75,1.6,[-12,-25,0])],
    'Candle Flicker':[lamp('point',[-.9,-.25,1.4],[1,.55,.22],1.9,.4,[0,0,0],{animation:'flicker',speed:.3}),lamp('area',[1,1.1,2],[.66,.72,.95],.6,1.7,[-25,25,0])]
  };
  function prop(type,p,scale,color,material,extra){return Object.assign({type:type,position:p,scale:scale||[1,1,1],color:color||[.28,.3,.34],material:material||'matte'},extra||{});}
  function floor(color,surface){return prop('floor',[0,-.9,0],[1,1,1],color,'matte',{surface:surface||'matte'});}
  var looks=[
    ['Clean',{exposure:0,contrast:1,saturation:1,bloom:.09,vignette:.1}],
    ['Cinematic Teal-Orange',{exposure:-.08,contrast:1.14,saturation:.87,temperature:.08,tint:-.05,lift:[-.015,.012,.018],gain:[1.06,1,.96],bloom:.15,halation:.12,vignette:.25,grain:.018,flare:.06}],
    ['Noir',{exposure:-.12,contrast:1.26,saturation:.08,gamma:[.96,.96,.96],bloom:.08,vignette:.34,grain:.025}],
    ['Kodak-style Warm Film',{exposure:.08,contrast:1.06,saturation:.93,temperature:.3,tint:.04,lift:[.018,.009,-.008],gamma:[1.04,1.01,.99],gain:[1.03,1,.94],bloom:.14,halation:.24,vignette:.18,grain:.022,flare:.07}],
    ['Cool Chrome',{exposure:.02,contrast:1.17,saturation:.72,temperature:-.24,lift:[-.015,-.008,.012],gain:[.96,1,1.04],bloom:.1,vignette:.22}],
    ['Vaporwave',{exposure:.06,contrast:1.08,saturation:1.18,temperature:-.12,tint:.22,lift:[.022,.004,.035],gamma:[1.05,1,1.07],bloom:.3,halation:.12,vignette:.2,grain:.01,aberration:.07,flare:.12}],
    ['Matte Dream',{exposure:.1,contrast:.88,saturation:.78,temperature:.09,lift:[.038,.033,.036],gamma:[1.06,1.06,1.07],gain:[.97,.97,.99],bloom:.13,halation:.1,vignette:.14,grain:.015}],
    ['High-Key White',{exposure:.2,contrast:.95,saturation:.91,temperature:.035,lift:[.01,.01,.01],bloom:.06,vignette:0}],
    ['Neon Night',{exposure:-.12,contrast:1.16,saturation:1.13,temperature:-.16,tint:.08,lift:[-.012,-.014,.008],bloom:.28,halation:.18,vignette:.29,grain:.012,aberration:.045,flare:.1}],
    ['Bleach Bypass',{exposure:-.04,contrast:1.3,saturation:.42,temperature:-.06,gamma:[.97,.99,1],bloom:.07,vignette:.24,grain:.032,aberration:.01}]
  ];
  // Accent/rim/foil/warm are per-style limits, rather than one automatic recipe.
  var styles=[
    ['Museum','Showcase','quiet','warm','Three-point','Matte Dream',[.052,.049,.045],[0,.055,3.15,34], [floor([.13,.12,.105]),prop('plinth-square',[0,-.79,-.05],[1.12,.28,1],[.39,.36,.3]),prop('glass-case',[0,-.02,0],[1.04,1.23,1],[.8,.85,.9],'gloss',{castShadow:false})],{accent:.12,rim:.35,foil:.78,warm:.2}],
    ['Showroom','Showcase','bright','neutral','Butterfly','Clean',[.15,.16,.18],[-.14,.07,3.4,32],[floor([.18,.19,.21],'mirror'),prop('turntable',[0,-.78,0],[1.1,.4,1.1],[.34,.36,.4],'metal'),prop('softbox',[-1.55,.25,-.65],[.75,.75,.75])],{accent:.08,rim:.2,foil:.72,warm:.16}],
    ['Gallery Wall','Showcase','quiet','neutral','Top Softbox','Matte Dream',[.075,.08,.09],[0,.02,3.9,32],[floor([.14,.15,.17]),prop('collection',[0,.07,-.65],[.7,.7,.7],[.6,.6,.6],'matte',{arrangement:'wall'}),prop('led-strip',[0,1.1,-.7],[1.3,1,1],W,'emissive')],{accent:.18,rim:.26,foil:.84,warm:.25}],
    ['Pedestal','Showcase','dramatic','warm','Rim and Fill','Clean',[.022,.027,.035],[-.2,.12,3.65,32],[floor([.07,.08,.1],'glossy'),prop('plinth-round',[0,-.78,0],[1,.35,1],[.27,.29,.32],'metal'),prop('dust',[0,0,-.4],[1,1,1],[.65,.7,.82],'matte',{density:.12})],{accent:.27,rim:.6,foil:.78,warm:.15}],
    ['Product White','Studio','bright','neutral','Butterfly','High-Key White',[.7,.71,.72],[0,.035,3.2,33],[floor([.82,.82,.8]),prop('backdrop',[0,0,-1.3],[1,1,1],[.73,.74,.75],'matte',{gradient:[.89,.89,.88]})],{accent:.035,rim:.08,foil:.64,warm:.08}],
    ['Dark Seamless','Studio','quiet','neutral','Three-point','Clean',[.014,.016,.02],[-.1,.045,3,35],[floor([.035,.04,.05]),prop('easel',[0,-.15,-.15],[1,1,1],[.15,.16,.19],'metal')],{accent:.16,rim:.5,foil:.76,warm:.2}],
    ['Gradient Sweep','Studio','soft','cool','Rembrandt','Cool Chrome',[.055,.08,.125],[-.18,.07,3.3,32],[floor([.07,.1,.15],'glossy'),prop('backdrop',[0,0,-1.2],[1,1,1],[.035,.05,.085],'matte',{gradient:[.22,.3,.43]})],{accent:.31,rim:.32,foil:.8,warm:.14}],
    ['Paper Sweep','Studio','soft','warm','Top Softbox','Matte Dream',[.36,.31,.24],[.11,.13,3.45,32],[floor([.52,.46,.36]),prop('backdrop',[0,0,-1.15],[1,1,1],[.43,.37,.29],'matte',{gradient:[.58,.52,.42]}),prop('easel',[0,-.2,-.12],[.9,.9,.9],[.49,.4,.27])],{accent:.08,rim:.16,foil:.7,warm:.3}],
    ['Noir','Moody','dramatic','neutral','Split Light','Noir',[.006,.006,.008],[-.15,.03,3.2,35],[floor([.018,.02,.025]),prop('haze',[0,0,-.4],[1,1,1],[.14,.16,.2],'matte',{density:.15})],{accent:0,rim:.48,foil:.7,warm:.04}],
    ['Vault','Moody','dramatic','gold','Rembrandt','Kodak-style Warm Film',[.021,.017,.01],[.16,.08,3.6,32],[floor([.06,.05,.035],'glossy'),prop('plinth-round',[0,-.8,0],[1.1,.36,1.1],[.36,.25,.11],'metal'),prop('crown',[-1,-.5,-.1],[.75,.75,.75],G,'metal'),prop('trophy',[1,-.38,-.25],[.6,.6,.6],G,'metal')],{accent:.12,rim:.3,foil:.62,warm:.12}],
    ['Moonlight','Moody','quiet','blue','Moonlight','Cool Chrome',[.007,.013,.029],[-.09,.08,3.25,34],[floor([.025,.044,.075],'glossy'),prop('snow',[0,.1,-.5],[1,1,1],[.61,.72,.95],'matte',{density:.09})],{accent:.15,rim:.6,foil:.78,warm:.1}],
    ['Candlelit','Moody','soft','warm','Candle Flicker','Kodak-style Warm Film',[.025,.012,.008],[.12,.09,3.45,33],[floor([.1,.05,.025]),prop('plant',[1.05,-.34,-.45],[.7,.7,.7],[.21,.27,.13]),prop('dust',[0,0,-.4],[1,1,1],[.68,.42,.19],'matte',{density:.1})],{accent:.05,rim:.15,foil:.72,warm:.15}],
    ['Neon Alley','Neon','energetic','pink','Practical Neon','Neon Night',[.018,.009,.033],[-.2,.075,3.65,33],[floor([.055,.035,.07],'glossy'),prop('neon-tube',[-1.1,.58,-.6],[1,1,1],P,'emissive',{text:'CARDABLE',rotation:[0,15,0]}),prop('led-strip',[1.2,.15,-.5],[1,1,1],T,'emissive',{rotation:[0,0,90]}),prop('haze',[0,0,-.3],[1,1,1],[.12,.1,.23],'matte',{density:.18})],{accent:.32,rim:.38,foil:.62,warm:.08}],
    ['Synthwave Grid','Neon','energetic','purple','Colored Gel Duo','Vaporwave',[.028,.009,.065],[0,.12,3.5,34],[prop('grid-floor',[0,-.9,0],[1,1,1],[.36,.08,.55],'emissive'),prop('ring-light',[0,.1,-.95],[1.1,1.1,1.1],[.75,.18,.55],'emissive')],{accent:.26,rim:.3,foil:.67,warm:.05}],
    ['Arcade','Neon','playful','red','Colored Gel Duo','Vaporwave',[.023,.012,.033],[.2,.08,3.75,33],[floor([.06,.03,.07]),prop('neon-tube',[0,1.12,-.55],[.85,.85,.85],[1,.3,.15],'emissive',{text:'HIGH SCORE'}),prop('rgb-strip',[-1.15,-.42,-.3],[.7,.7,.7]),prop('fan',[1.1,-.25,-.2],[.6,.6,.6],[.4,.18,.6],'metal')],{accent:.22,rim:.4,foil:.66,warm:.06}],
    ['Cyber Rain','Neon','dramatic','cyan','Practical Neon','Neon Night',[.008,.018,.028],[-.14,.04,3.45,34],[floor([.024,.045,.065],'mirror'),prop('rain',[0,.1,-.2],[1,1,1],[.2,.6,.85],'matte',{density:.28}),prop('neon-tube',[1.2,.4,-.8],[.8,.8,.8],T,'emissive',{rotation:[0,0,90],text:'ONLINE'})],{accent:.2,rim:.58,foil:.62,warm:.08}],
    ['Workbench','Tech','quiet','warm','Sunset Window','Kodak-style Warm Film',[.045,.03,.022],[-.19,.18,3.8,32],[floor([.24,.16,.1]),prop('easel',[0,-.15,-.15]),prop('heatsink',[-1,-.5,-.3],[.65,.65,.65],[.43,.45,.46],'metal'),prop('cables',[1,-.6,-.2],[.7,.7,.7],[.17,.17,.18]),prop('screw',[.72,-.83,.35],[1.2,1.2,1.2])],{accent:.09,rim:.18,foil:.76,warm:.22}],
    ['Clean Room','Tech','bright','cyan','Top Softbox','High-Key White',[.43,.55,.59],[.13,.09,3.6,32],[floor([.55,.67,.7]),prop('glass-case',[0,0,0],[1.15,1.3,1.1],[.6,.87,.95],'gloss',{castShadow:false}),prop('heatsink',[1.08,-.55,-.4],[.5,.5,.5],[.63,.69,.74],'metal')],{accent:.08,rim:.18,foil:.66,warm:.06}],
    ['Server Hall','Tech','dramatic','blue','Rim and Fill','Cool Chrome',[.009,.018,.034],[-.2,.065,3.7,33],[floor([.04,.06,.08],'glossy'),prop('heatsink',[-1.2,-.12,-.65],[.75,1.7,.7],[.25,.29,.36],'metal'),prop('heatsink',[1.2,-.12,-.65],[.75,1.7,.7],[.25,.29,.36],'metal'),prop('led-strip',[-1,.3,-.4],[.8,.8,.8],T,'emissive',{rotation:[0,0,90]})],{accent:.18,rim:.64,foil:.79,warm:.08}],
    ['Teardown','Tech','precise','neutral','Three-point','Bleach Bypass',[.075,.08,.088],[.22,.28,3.9,32],[floor([.18,.19,.2]),prop('fan',[-1.12,-.3,-.1],[.7,.7,.7],[.2,.22,.25],'metal'),prop('heatsink',[1.1,-.4,-.15],[.65,.65,.65],[.48,.5,.53],'metal'),prop('pcie-bracket',[.7,-.7,.2],[.8,.8,.8],[.42,.44,.47],'metal'),prop('cables',[-.8,-.6,.1],[.5,.5,.5])],{accent:.12,rim:.25,foil:.8,warm:.12}],
    ['Throne','Epic','dramatic','gold','Rembrandt','Cinematic Teal-Orange',[.02,.012,.027],[0,.14,4,31],[floor([.07,.04,.07],'glossy'),prop('plinth-square',[0,-.78,0],[1.4,.4,1.3],[.3,.2,.09],'metal'),prop('crown',[0,1.02,-.12],[.65,.65,.65],G,'metal'),prop('laurel',[-1,-.18,-.1],[.8,.8,.8],G,'metal'),prop('laurel',[1,-.18,-.1],[.8,.8,.8],G,'metal',{rotation:[0,180,0]})],{accent:.23,rim:.5,foil:.6,warm:.12}],
    ['Aurora','Epic','soft','green','Colored Gel Duo','Matte Dream',[.009,.025,.039],[-.11,.09,3.45,34],[floor([.035,.08,.09],'glossy'),prop('haze',[0,.3,-.5],[1,1,1],[.1,.55,.42],'matte',{density:.25}),prop('fireflies',[0,.2,-.2],[1,1,1],[.25,.8,.62],'matte',{density:.14})],{accent:.36,rim:.55,foil:.75,warm:.04}],
    ['Eclipse','Epic','dramatic','blue','Backlight Halo','Cool Chrome',[.003,.005,.011],[.07,.025,3.35,34],[prop('ring-light',[0,.15,-.9],[1.23,1.23,1.23],[.57,.65,.92],'emissive'),prop('dust',[0,0,-.3],[1,1,1],[.6,.65,.85],'matte',{density:.08})],{accent:.14,rim:.8,foil:.72,warm:.05}],
    ['Stage Spotlight','Epic','dramatic','neutral','Butterfly','Clean',[.008,.008,.012],[-.12,.16,3.8,32],[floor([.07,.07,.09],'glossy'),prop('plinth-round',[0,-.79,0],[1.2,.3,1.2],[.25,.26,.3],'metal'),prop('spotlight-can',[-1.2,.65,-.75],[.8,.8,.8],[.25,.26,.28],'metal',{rotation:[55,-25,0]}),prop('haze',[0,0,-.4],[1,1,1],[.2,.21,.25],'matte',{density:.16})],{accent:.1,rim:.52,foil:.7,warm:.14}]
  ];
  var propSets=[
    ['Tech Bench',[prop('heatsink',[-1,-.5,-.2],[.7,.7,.7],null,'metal'),prop('fan',[1,-.4,-.2],[.65,.65,.65]),prop('cables',[.85,-.6,.1],[.7,.7,.7]),prop('screw',[-.6,-.83,.4])]],
    ['Trophy Corner',[prop('trophy',[1.1,-.38,-.15],[.65,.65,.65],G,'metal'),prop('laurel',[1.1,-.5,-.4],[.8,.8,.8],G,'metal'),prop('plinth-square',[1.1,-.8,-.15],[.7,.2,.7])]],
    ['Fan Array',[prop('fan',[-1.12,-.25,-.25],[.65,.65,.65],null,'metal'),prop('fan',[1.12,-.25,-.25],[.65,.65,.65],null,'metal'),prop('fan',[-1.12,.55,-.4],[.5,.5,.5],null,'metal'),prop('fan',[1.12,.55,-.4],[.5,.5,.5],null,'metal')]],
    ['Cable Garden',[prop('cables',[-1,-.65,-.15],[1,1,1],[.25,.18,.33]),prop('cables',[1,-.6,-.2],[.8,.8,.8],[.13,.3,.32],null,{rotation:[0,35,0]}),prop('plant',[1.25,-.25,-.7],[.8,.8,.8])]],
    ['Card Wall',[prop('collection',[0,0,-.7],[.72,.72,.72],null,null,{arrangement:'wall'}),prop('led-strip',[0,1.08,-.55],[1.3,1,1],W,'emissive')]],
    ['Stacked Fan',[prop('collection',[1,-.38,-.25],[.58,.58,.58],null,null,{arrangement:'fan'}),prop('collection',[-1,-.47,-.2],[.55,.55,.55],null,null,{arrangement:'stack'})]],
    ['Glass Cube Display',[prop('glass-case',[0,0,0],[1.12,1.3,1.12],[.7,.8,.9],'gloss',{castShadow:false}),prop('plinth-square',[0,-.8,0],[1.17,.24,1.17],[.22,.24,.28],'metal')]],
    ['Floating Shards',[prop('shard',[-1,.5,-.4],[.5,.9,.4],[.52,.73,.91],'gloss',{rotation:[25,20,-25]}),prop('shard',[1,-.25,-.2],[.45,.65,.5],[.76,.51,.84],'gloss',{rotation:[-20,35,45]}),prop('shard',[.8,.8,-.55],[.35,.5,.3],[.58,.8,.75],'gloss',{rotation:[25,-20,20]})]]
  ];
  var moves=['Hero','Close-up','Reveal','Turntable','Crane Up','Whip Pan Settle','Dolly Zoom','Orbit Left','Orbit Right','Handheld','Slow Float','Spec Sweep','Beauty Pass'],animations=['Float','Pulse Glow','Slow Tilt Reveal','Showcase Spin','Light Sweep','Flicker (safe)','Breathing Camera','Prop Orbit','Variant Glint'];
  function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');}
  var entries=[];function entry(kind,name,data,tags,adapt){entries.push({id:kind+':'+slug(name),kind:kind,name:name,data:data,tags:tags||[],adapt:adapt||{accent:.12,rim:.3,foil:.76,warm:.18}});}
  styles.forEach(function(x){entry('scene',x[0],{rig:x[4],look:x[5],backdrop:x[6],camera:x[7],props:x[8]},[x[1],x[2],x[3]],x[9]);});
  Object.keys(rigs).forEach(function(n){entry('rig',n,rigs[n],[/Neon|Gel/.test(n)?'Neon':'Studio',/Moon/.test(n)?'blue':/Candle|Sunset|Rembrandt/.test(n)?'warm':'neutral'],{accent:/Neon|Gel/.test(n)?.3:.12,rim:/Rim|Halo/.test(n)?.65:.3,foil:/Butterfly|Softbox/.test(n)?.65:.78,warm:/Candle|Sunset/.test(n)?.08:.2});});
  looks.forEach(function(x){entry('look',x[0],x[1],[/Neon|Vaporwave/.test(x[0])?'Neon':/Noir|Bleach/.test(x[0])?'dramatic':'soft',/Warm/.test(x[0])?'warm':/Cool|Teal/.test(x[0])?'cool':'neutral']);});
  propSets.forEach(function(x){entry('props',x[0],x[1],[/Tech|Fan|Cable/.test(x[0])?'Tech':'Showcase','components']);});moves.forEach(function(n){entry('move',n,null,['Camera',/Whip|Turntable/.test(n)?'energetic':'quiet']);});animations.forEach(function(n){entry('animation',n,null,['Motion',/Glow|Sweep|Flicker|Glint/.test(n)?'light':'soft']);});
  C.studioPresetCatalog={entries:entries,rigs:rigs,looks:looks,styles:styles,slug:slug};
})(window.Cardable);
