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
      var vents=node('div','classic-card-vents',bezel);for(var v=0;v<7;v++)node('i','',vents);
      if(face.classList.contains('card__face--back'))return;
      var serial=String(instance.serial||'');
      node('span','classic-card-plate',bezel,'S/N '+(serial.slice(-8)||'--------'));
      var dip=node('div','classic-card-dip',bezel),bits=0;for(var c=0;c<serial.length;c++)bits=(bits*31+serial.charCodeAt(c))>>>0;
      for(var d=0;d<8;d++){var sw=node('i','',dip);sw.dataset.on=String((bits>>d)&1?true:false);}
      var tierNow=C.rarity(card.rarity).tier,leds=node('div','classic-card-leds',bezel);
      [['pwr',true],['act',tierNow>=4],['err',tierNow>=9]].forEach(function(l){var led=node('i','classic-card-led',leds);led.dataset.kind=l[0];led.dataset.on=String(l[1]);});
      node('span','classic-card-label',bezel,'PWR ACT ERR');
      var rarity=C.rarity(card.rarity),meter=node('div','classic-card-tier',bezel);
      for(var i=0;i<12;i++){var led=node('i','classic-card-tier__segment',meter);led.dataset.lit=i<=rarity.tier;}
      node('span','classic-card-tier__code',meter,rarity.code);
      var plate=node('div','classic-terminal',face);
      var concealed=context.presentation&&context.presentation.concealed;
      node('div','classic-terminal__prompt',plate,'C:\\CARDABLE> SPEC');
      node('div','classic-terminal__title',plate,concealed?'UNKNOWN HARDWARE':card.name.toUpperCase());
      var specs=card.specs||{},clock=specs.coreClockMhz||specs.gpuClockMhz||specs.boostMhz;
      [['VRAM',concealed?'—':C.cardSpecs.vram(card)],['CLK',concealed||clock==null?'—':clock+' MHZ'],
        ['BUS',concealed||specs.busBits==null?'—':specs.busBits+' BIT'],['TIER',rarity.code]].forEach(function(pair){node('div','classic-terminal__field',plate,pair[0]+' '+String(pair[1]).toUpperCase());});
      node('span','classic-terminal__cursor',plate,'█').setAttribute('aria-hidden','true');
    },
    update:function(el,time,animate){var cursor=el._classicCursor||(el._classicCursor=el.querySelector('.classic-terminal__cursor'));if(cursor){var opacity=!animate||Math.floor(time/1000)%2===0?'1':'0';if(cursor.style.opacity!==opacity)cursor.style.opacity=opacity;}return !!cursor&&animate;}
  });
  C.cardSkins.register('royal',{
    render:function(face,card,instance,context){
      var frame=node('div','royal-card-frame',face);frame.setAttribute('aria-hidden','true');
      var tier=C.rarity(card.rarity);frame.dataset.tier=tier.id;
      for(var i=0;i<4;i++)node('i','',frame);
      if(!face.classList.contains('card__face--back'))node('b','',frame);
    },
    update:function(){return false;}
  });
})(window.Cardable,window);
