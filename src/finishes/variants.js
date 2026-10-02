/* Surface coatings are independent of rarity frames and share the card's lamp. */
(function (C, root) {
  'use strict';
  var registry = Object.create(null);
  function element(tag, name, parent) { var el = root.document.createElement(tag); el.className = name; if (parent) parent.appendChild(el); return el; }
  function surface(id, card, instance) {
    var el = element('div', 'variant-surface variant-' + id), plane = element('div', 'variant-plane', el);
    el.setAttribute('aria-hidden', 'true'); el.dataset.variant = id;
    if (id === 'beam') element('div', 'variant-plane variant-plane--opposing', el);
    if (id === 'shattered') {
      var random = C.art.random(Array.from(instance.serial).reduce(function (n,c) { return n*31+c.charCodeAt(0) >>> 0; }, 17));
      var count = [4, 8, 16, 24][C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality'))], rows = count / 4;
      for (var i = 0; i < count; i++) {
        var col = i % 4, row = Math.floor(i / 4), shard = element('i', 'variant-shard', el);
        var x = col*25, y = row*100/rows, w = 28, h = 100/rows + 3;
        shard.style.clipPath = 'polygon(' + x + '% ' + y + '%,' + (x+w) + '% ' + (y+random()*h) + '%,' + (x+random()*w) + '% ' + (y+h) + '%)';
        shard.style.setProperty('--shard-angle', (random()*300) + 'deg'); shard.style.setProperty('--shard-offset', random()*80 + '%');
      }
    }
    if (id === 'spotlight') {
      plane.classList.add('variant-spotlight-subject');
      var subject = element('div', 'variant-subject-gloss', plane);
      if (card.art.kind === 'image') {
        subject.style.maskImage = 'url("' + card.art.subjectMask + '")'; subject.style.webkitMaskImage = subject.style.maskImage;
      } else {
        var art = C.art.render(card), hardware = art.querySelector('.gpu-art__hardware'), svg = C.finishes.svg('svg', { viewBox: art.getAttribute('viewBox'), class: 'variant-procedural-gloss', preserveAspectRatio: 'xMidYMid slice' }, subject);
        var defs = C.finishes.svg('defs', {}, svg), maskId = C.finishes.uid('variant-subject'), mask = C.finishes.svg('mask', { id: maskId }, defs);
        if (hardware) { var silhouette = hardware.cloneNode(true); silhouette.querySelectorAll('*').forEach(function(p){p.setAttribute('fill','white');p.setAttribute('stroke','white');p.setAttribute('style','fill:white;stroke:white;opacity:1');}); mask.appendChild(silhouette); }
        var gradientId = C.finishes.uid('variant-gloss'), gradient = C.finishes.svg('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
        [['0','#fff','0'],['.4','#fff','.03'],['.52','#fff','.7'],['.56','#fff','.06'],['1','#fff','0']].forEach(function(s){C.finishes.svg('stop', { offset:s[0], 'stop-color':s[1], 'stop-opacity':s[2] }, gradient);});
        C.finishes.svg('rect', { width:400, height:560, fill:'url(#'+gradientId+')', mask:'url(#'+maskId+')', class:'variant-svg-light' }, svg);
      }
    }
    return el;
  }
  C.variantMaterials = {
    registry: registry,
    register: function (id, material) { ['mount','update','destroy','lite'].forEach(function(k){if(typeof material[k]!=='function')throw new Error('Variant material needs '+k);}); registry[id]=material; },
    bind: function (id, host, card, instance) {
      var material=registry[id], binding=null, accumulated=0, staticView=null;
      function clear() { if(binding)material.destroy(binding);binding=null;accumulated=0; }
      var stop=C.settings.onChange('finishQuality',function(){
        clear();
        if(staticView){var parent=staticView.parentNode,next=material.lite(card,instance);if(parent)parent.insertBefore(next,staticView);staticView.remove();staticView=next;}
      });
      return {
        activate:function(){if(!binding&&C.settings.policy.finishHz)binding=material.mount(host,card,instance);},
        deactivate:clear,
        update:function(dt,pointer){
          var hz=C.settings.policy.finishHz;if(!hz)return false;
          if(!binding)binding=material.mount(host,card,instance);
          accumulated+=dt;if(accumulated+0.01<1000/hz)return id==='aurora'||id==='galaxy-holo';
          var moving=material.update(accumulated,pointer,binding);accumulated=0;return moving;
        },
        destroy:function(){stop();clear();},
        lite:function(){if(!staticView)staticView=material.lite(card,instance);return staticView;}
      };
    }
  };
  C.data.variants.forEach(function(v){C.variantMaterials.register(v.id, {
    mount:function(host,card,instance){var el=surface(v.id,card,instance);host.appendChild(el);return {el:el,plane:el.children[0],time:0};},
    update:function(dt,pointer,binding){
      if(v.id!=='aurora'&&v.id!=='galaxy-holo')return false;
      binding.time+=dt;
      // Translate a prepainted optical layer; rebuilding radial gradients each
      // frame is expensive even when the JavaScript subscriber is very small.
      binding.plane.style.transform='translate3d('+(Math.sin(binding.time/4200)*10)+'%,0,0)';
      return true;
    },
    destroy:function(binding){binding.el.remove();}, lite:function(card,instance){return surface(v.id,card,instance);}
  });});
})(window.Cardable,window);
