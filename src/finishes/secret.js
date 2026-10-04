(function (C) {
  'use strict';
  // Unfound design: "Fast white line sweeps on black, confined to the sides, without lettering."
  // Unfound prop: "A black square outside border with small squircle edges at 95% opacity"
  // Found design: "White line sweeps on black sides invert to black lines on white, accelerate and grow to cover the sides, then repeat; no lettering."
  // Found prop: "A black square outside border with small squircle edges at 95% opacity, which reverses to white when the design text changes"
  function presentation(card, context) {
    var state = context.state || (context.owned ? 'found' : 'unfound'), rarity = C.rarity(card.rarity);
    if (state !== 'found' && state !== 'unfound') throw new Error('Unknown Secret state: ' + state);
    return { state: state, concealed: state === 'unfound', hideArt: state === 'unfound', hasProp: true, backScramble: true, revealAccent: '#FFFFFF',
      description: state === 'found' ? rarity.foundDescription : rarity.unfoundDescription };
  }
  function surface(card, context, staticPolicy) {
    var info = presentation(card, context), el = C.finishes.surface('secret', context);
    el.dataset.secretState = info.state;
    var field = C.finishes.element('div', 'finish-secret-lines', el);
    var canvas=C.finishes.element('canvas','',field);canvas.width=staticPolicy?64:256;canvas.height=Math.round(canvas.width*1.4);
    var g=canvas.getContext('2d',{alpha:false}),seed=String(context.instance&&context.instance.serial||card.id);
    var initial=staticPolicy?{time:0,profile:C.cutscenes.profile()}:C.secretBackground.sample(seed,0);
    var picture=C.secretBackground.draw(g,canvas.width,canvas.height,initial.time,seed,info.state==='found',initial.profile,!!staticPolicy||C.motion.reduced||!C.settings.policy.animation);
    var prop = C.finishes.surface('secret-prop', context); prop.classList.add('finish-prop');
    var frame = C.finishes.squircle(prop, 'finish-secret-frame'); frame.path.setAttribute('stroke', 'var(--secret-border)'); frame.path.setAttribute('opacity', '0.95');
    var border=Math.round(picture.inversion*255);prop.style.setProperty('--secret-border','rgb('+border+','+border+','+border+')');
    (context.propElement || el).appendChild(prop);
    return { el: el, prop: prop, canvas:canvas,g:g,seed:seed, found: info.state === 'found', time: 0, phase: 'sweep' };
  }
  C.finishes.register('secret', {
    previewStates: ['found', 'unfound'], describe: presentation,
    mount: function (element, card, context) { var state = surface(card, context); element.appendChild(state.el); return state; },
    update: function (dt, pointer, state) {
      state.time+=dt;
      var field=C.secretBackground.sample(state.seed,state.time/1000),staticPolicy=C.motion.reduced||!C.settings.policy.animation;
      var picture=C.secretBackground.draw(state.g,state.canvas.width,state.canvas.height,field.time,state.seed,state.found,field.profile,staticPolicy);
      var border=Math.round(picture.inversion*255);state.prop.style.setProperty('--secret-border','rgb('+border+','+border+','+border+')');
      return true;
    },
    destroy: function (state) { state.prop.remove(); state.el.remove(); },
    lite: function (card, context) { return surface(card, context, true).el; },
    drawBackground:function(target,time,seed,state){return C.secretBackground.draw(target.g,target.width,target.height,time,seed,state.found,state.profile,state.static);}
  });
})(window.Cardable);
