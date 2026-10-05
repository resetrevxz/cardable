(function (C) {
  'use strict';
  function lamp(type, position, color, intensity, extras) { return Object.assign(C.studioScenes.light({ type: type, position: position, color: color, intensity: intensity }), extras || {}); }
  var rigs = {
    Studio: function () { return [lamp('area', [-1.6, 2, 2.6], [1, .97, .93], 2.8, { rotation: [-30, -30, 0], size: 1 }), lamp('area', [1.4, .4, 2], [.8, .88, 1], 1.2, { rotation: [-10, 35, 0] }), lamp('strip', [0, 1, -1], [1, 1, 1], 2.2, { rotation: [-25, 180, 0] })]; },
    Rim: function () { return [lamp('strip', [-1.1, .6, -.8], [.75, .86, 1], 4, { rotation: [-10, -125, 0], size: .9 }), lamp('point', [1.3, .2, 1.7], [1, .94, .83], .9)]; },
    Noir: function () { return [lamp('spot', [-1.2, 2.2, 2.3], [1, 1, 1], 5, { rotation: [-40, -28, 0], angle: 35, gobo: 'blinds', softness: .18 })]; },
    'Neon Alley': function () { return [lamp('strip', [-1.2, .7, 1.3], [1, .08, .5], 3, { rotation: [-20, -42, 0] }), lamp('strip', [1.3, .3, 1.7], [.06, .8, 1], 3, { rotation: [-10, 38, 0] }), lamp('ambient', [0, 0, 0], [.18, .13, .25], .25)]; },
    Sunset: function () { return [lamp('directional', [-2, 1, 2], [1, .45, .15], 1.3, { rotation: [-18, -55, 0] }), lamp('ambient', [0, 0, 0], [.42, .35, .62], .6, { bottom: [.2, .1, .08] })]; },
    Moonlight: function () { return [lamp('directional', [1.5, 2, 2], [.4, .6, 1], 1.6, { rotation: [-45, 35, 0] }), lamp('area', [-1, .2, 2], [.78, .86, 1], .5)]; },
    Showroom: function () { return [lamp('area', [-1.3, 1.6, 2.2], [1, 1, 1], 3, { size: 1.2, rotation: [-30, -30, 0] }), lamp('area', [1.2, 1, 1.8], [1, .98, .92], 2, { size: .9, rotation: [-25, 30, 0] }), lamp('ambient', [0, 0, 0], [.8, .85, 1], .35)]; },
    Vault: function () { return [lamp('spot', [0, 2.5, 2], [1, .8, .36], 4, { rotation: [-50, 0, 0], angle: 40 }), lamp('strip', [1.1, .1, -1], [.5, .72, 1], 2.5, { rotation: [0, 140, 0] })]; }
  };
  function arrangement(name,scene,tier){
    var props=[];function add(type,position,options){var p=C.studioProps.create(type);p.position=position;if(options)Object.keys(options).forEach(function(k){p[k]=options[k];});props.push(p);return p;}
    if(name==='Void'){add('haze',[0,0,-.5],{color:[.12,.16,.25],density:.2});}
    else {
      add('floor',[0,-.88,0],{color:name==='Sunset Desk'?[.24,.13,.075]:[.13,.14,.16],surface:name==='Showroom'?'mirror':name==='Vault'?'glossy':'matte'});
      if(name==='Museum'){add('plinth-square',[0,-.81,0],{scale:[1.1,.3,1],material:'metal'});add('glass-case',[0,-.05,0],{scale:[1,1.3,1],color:[.75,.82,.9],castShadow:false});add('spotlight-can',[1.15,.7,-.9],{rotation:[90,0,0]});}
      else if(name==='Neon Alley'){add('neon-tube',[-1,.55,-.7],{color:[1,.08,.5],text:'CARDABLE',rotation:[0,15,0]});add('led-strip',[1,.2,-.5],{color:[.06,.8,1],rotation:[0,0,90]});add('haze',[0,0,0],{density:.3});add('rain',[0,0,.2],{density:.25});}
      else if(name==='Sunset Desk'){add('plant',[1,-.32,-.15]);add('pack',[-1,-.35,-.15],{packId:scene.card.source&&scene.card.source.packId||'standard',rotation:[0,15,0],material:'gloss'});add('easel',[0,-.13,-.1]);}
      else if(name==='Vault'){add('plinth-round',[0,-.8,0],{scale:[1,.45,1],color:[.3,.24,.12],material:'metal'});add('crown',[-.95,-.53,0]);add('trophy',[1,-.4,-.1]);add('dust',[0,.1,0],{color:[.75,.6,.3],density:.3});}
      else if(name==='Showroom'){add('turntable',[0,-.76,0],{scale:[1,.55,1],material:'metal'});add('softbox',[-1.4,.4,-.3],{rotation:[0,30,0]});add('ring-light',[1.3,.4,-.3],{rotation:[0,-30,0]});}
      else {add('easel',[0,-.13,-.15]);add('softbox',[-1.4,.45,-.3],{rotation:[0,25,0]});}
    }
    return props.slice(0,C.studioScenes.limits(tier).props);
  }
  C.studioPresets = { rigs: Object.keys(rigs), scenes: ['Studio', 'Museum', 'Neon Alley', 'Sunset Desk', 'Void', 'Vault', 'Showroom', 'Surprise me'],
    lights: function (name, tier) { return (rigs[name] || rigs.Studio)().slice(0, C.studioScenes.limits(tier).lights).map(function (l, i) { l.id = i === 0 ? 'key' : 'rig-' + i; l.name = i === 0 ? 'Key light' : 'Fill ' + i; return l; }); },
    apply: function (name, scene, tier) { if (name === 'Surprise me') name = this.scenes[Math.floor(Math.random() * (this.scenes.length - 1))]; var rig = { Museum: 'Studio', 'Sunset Desk': 'Sunset', Void: 'Rim' }[name] || name, next = C.studioScenes.defaults(); next.card = C.studioScenes.clone(scene.card); next.lights = this.lights(rig, tier); next.backdrop.color = name === 'Showroom' ? [.16, .16, .17] : name === 'Museum' ? [.07, .07, .075] : name === 'Sunset Desk' ? [.05, .025, .02] : name === 'Void' ? [.004, .004, .006] : [.025, .025, .033]; next.props=arrangement(name,next,tier);next.camera.yaw = name === 'Museum' ? 0 : -.12; next.camera.pitch = name === 'Sunset Desk' ? .18 : .04; next.post.bloom = name === 'Neon Alley' ? .35 : .12; return next; }
  };
})(window.Cardable);
