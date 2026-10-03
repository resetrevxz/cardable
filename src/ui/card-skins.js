(function(C,root) {
  'use strict';
  var registry=Object.create(null);
  function node(tag,cls,parent,text){var el=root.document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;parent.appendChild(el);return el;}
  C.cardSkins={registry:registry,register:function(id,skin){if(!C.cardSkin(id))throw new Error('Unknown card skin');registry[id]=skin;},
    apply:function(face,card,instance,context){var skin=registry[instance.cardSkinId];if(skin)skin.render(face,card,instance,context);},
    update:function(el,instance,time,animate){var skin=registry[instance.cardSkinId];return skin?skin.update(el,time,animate):false;}};
  C.cardSkins.register('classic',{
    render:function(face,card,instance,context){
      var bezel=node('div','classic-card-bezel',face);bezel.setAttribute('aria-hidden','true');
      ['tl','tr','bl','br'].forEach(function(corner){node('i','classic-screw classic-screw--'+corner,bezel);});
      node('span','classic-card-sticker',bezel,'CLASSIC');
      if(face.classList.contains('card__face--back'))return;
      var rarity=C.rarity(card.rarity),meter=node('div','classic-card-tier',bezel);
      for(var i=0;i<12;i++){var led=node('i','classic-card-tier__segment',meter);led.dataset.lit=i<=rarity.tier;}
      node('span','classic-card-tier__code',meter,rarity.code);
      var plate=node('div','classic-terminal',face);
      var concealed=context.presentation&&context.presentation.concealed;
      node('div','classic-terminal__title',plate,concealed?'UNKNOWN HARDWARE':card.name.toUpperCase());
      var specs=card.specs||{},clock=specs.coreClockMhz||specs.gpuClockMhz||specs.boostMhz;
      [['VRAM',concealed?'—':C.cardSpecs.vram(card)],['CLK',concealed||clock==null?'—':clock+' MHZ'],
        ['BUS',concealed||specs.busBits==null?'—':specs.busBits+' BIT'],['TIER',rarity.code]].forEach(function(pair){node('div','classic-terminal__field',plate,pair[0]+' '+String(pair[1]).toUpperCase());});
      node('span','classic-terminal__cursor',plate,'█').setAttribute('aria-hidden','true');
    },
    update:function(el,time,animate){var cursor=el._classicCursor||(el._classicCursor=el.querySelector('.classic-terminal__cursor'));if(cursor){var opacity=!animate||Math.floor(time/1000)%2===0?'1':'0';if(cursor.style.opacity!==opacity)cursor.style.opacity=opacity;}return !!cursor&&animate;}
  });
})(window.Cardable,window);
