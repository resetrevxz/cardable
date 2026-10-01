(function (C, root) {
  'use strict';
  var paths = {
    variant:'M12 2 3 7v10l9 5 9-5V7ZM3 7l9 5 9-5M12 12v10',
    new:'m12 2 2.7 6.3L21 11l-6.3 2.7L12 20l-2.7-6.3L3 11l6.3-2.7Z',
    favorite:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
    rarity:'M4 4h16v16H4ZM8 8h8v8H8Z', date:'M4 5h16v16H4ZM4 10h16M8 2v6m8-6v6',
    age:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2', print:'M6 3h12v5H6ZM4 8h16v10h-3M7 18H4M7 14h10v7H7Z'
  };
  function dateLabel(timestamp, now) {
    var date=new Date(timestamp),today=new Date(now);today.setHours(0,0,0,0);var yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
    return timestamp>=today.getTime()&&timestamp<new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).getTime()?'Unpacked Today':timestamp>=yesterday.getTime()&&timestamp<today.getTime()?'Unpacked Yesterday':'Unpacked '+date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  }
  function derive(entry, instance, mode, now) {
    now=now==null?Date.now():now;var tags=[],variant=C.variant(entry.variantId),favorite=C.inventoryModel.current.favorites.indexOf(entry.stackKey)>=0;
    tags.push({kind:'variant',text:entry.owned?(variant?variant.name:'Normal'):'Undiscovered',label:entry.owned?(variant?'Variant: '+variant.name+', '+variant.class:'Normal finish'):'Undiscovered card'});
    if(entry.isNew)tags.push({kind:'new',text:mode==='compact'?'':'New',label:'New · unseen copies in this finish stack'});
    if(favorite)tags.push({kind:'favorite',text:mode==='compact'?'':'Favorite',label:'Favorite finish stack'});
    if(mode!=='compact') {
      tags.push({kind:'rarity',text:entry.rarity.name,label:'Card rarity: '+entry.rarity.name});
      if(entry.owned&&instance) {
        tags.push({kind:'date',text:dateLabel(instance.pulledAt,now),label:'Unpacked '+new Date(instance.pulledAt).toLocaleString()});
        if(mode==='detail') {
          var days=Math.max(0,Math.floor((now-instance.pulledAt)/86400000));
          tags.push({kind:'age',text:days?days+' '+(days===1?'day':'days')+' old':'Less than a day old',label:'Time since unpacking'});
          tags.push({kind:'print',text:instance.serial,label:'Recorded print serial: '+instance.serial});
          if(entry.card.retired)tags.push({kind:'print',text:'Retired design',label:'Retired catalog design'});
        }
      }
    }
    return tags;
  }
  function render(host, entry, instance, mode, now) {
    var tags=derive(entry,instance,mode||'compact',now),signature=JSON.stringify(tags);
    if(host.dataset.tagSignature===signature)return;host.dataset.tagSignature=signature;host.classList.add('card-tags');host.setAttribute('role','list');host.setAttribute('aria-label','Card Tags');
    while(host.children.length)host.children[0].remove();
    tags.forEach(function(tag){var el=root.document.createElement('span');el.className='card-tag card-tag--'+tag.kind;el.setAttribute('role','listitem');if(mode==='detail')el.setAttribute('tabindex','0');el.setAttribute('aria-label',tag.label);el.title=tag.label;
      var svg=root.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');var path=root.document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',paths[tag.kind]);svg.appendChild(path);el.appendChild(svg);
      if(tag.text){var text=root.document.createElement('span');text.textContent=tag.text;el.appendChild(text);}else el.classList.add('card-tag--icon');host.appendChild(el);
    });
  }
  C.cardTags={derive:derive,render:render,dateLabel:dateLabel};
})(window.Cardable,window);
