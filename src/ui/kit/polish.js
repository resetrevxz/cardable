(function(C,root){
  'use strict';
  var doc=root.document, exits=new WeakMap(), tip=null, timer=null, owner=null, description=null, serial=0,ownerObserver=null;
  function calm(){return C.motion.reduced||!C.settings.policy.animation;}
  C.ui.exit=function(element,finish){
    if(exits.has(element))return exits.get(element).promise;
    element.inert=true;element.dataset.surfaceState='closing';C.ui.tooltips.hide();
    var record={},resolve;record.promise=new Promise(function(r){resolve=r;});record.resolve=resolve;exits.set(element,record);
    function done(){if(exits.get(element)!==record)return;exits.delete(element);element.dataset.surfaceState='closed';try{if(finish)finish();}finally{if(record.animation)record.animation.cancel();resolve();}}
    if(!element.isConnected||calm()||doc.hidden)done();else {record.animation=element.animate([{opacity:root.getComputedStyle(element).opacity},{opacity:0}],{duration:120,easing:'ease-out',fill:'forwards'});record.animation.finished.catch(function(){}).then(done);}
    return record.promise;
  };
  C.ui.enter=function(element){var previous=exits.get(element);if(previous){exits.delete(element);if(previous.animation)previous.animation.cancel();previous.resolve();}element.dataset.surfaceState='open';element.inert=false;};
  function hide(){root.clearTimeout(timer);timer=null;if(ownerObserver){ownerObserver.disconnect();ownerObserver=null;}if(owner&&tip){if(description===null)owner.removeAttribute('aria-describedby');else owner.setAttribute('aria-describedby',description);}if(tip)tip.remove();tip=null;owner=null;}
  function label(element){
    if(element.title){element.dataset.tooltip=element.title;element.removeAttribute('title');}
    var text=element.dataset.tooltip||element.getAttribute('aria-label')||'';
    var action=element.dataset.keyAction||element.dataset.shortcutAction;
    if(action&&C.keys){var key=C.keys.label(action);if(key&&text.indexOf(key)<0)text+=' · '+key;}
    return text;
  }
  function show(event){
    var target=event.target.closest&&event.target.closest('[data-tooltip],[title],.cb-icon-button,.inventory-icon,.studio-icon-button');
    if(!target||target===owner||target.closest('[inert],[hidden],[data-surface-state="closing"]')||C.settings.get('visibleTooltips')===false)return;
    var text=label(target);if(!text)return;hide();owner=target;
    timer=root.setTimeout(function(){
      if(!owner||!target.isConnected||!target.checkVisibility()||target.closest('[inert],[hidden]')){hide();return;}
      tip=doc.createElement('aside');tip.className='cb-tooltip cb-ui';tip.id='cb-tooltip-'+(++serial);tip.setAttribute('role','tooltip');tip.textContent=label(target);doc.body.appendChild(tip);
      description=target.getAttribute('aria-describedby');target.setAttribute('aria-describedby',(description?description+' ':'')+tip.id);
      ownerObserver=new MutationObserver(function(){if(!target.isConnected||target.closest('[inert],[hidden]')||!target.checkVisibility())hide();});ownerObserver.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','inert']});
      var r=target.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
      tip.style.left=Math.max(8,Math.min(root.innerWidth-w-8,r.left+r.width/2-w/2))+'px';tip.style.top=(r.bottom+h+16>root.innerHeight?Math.max(8,r.top-h-8):r.bottom+8)+'px';
    },400);
  }
  function leave(event){if(owner&&event.relatedTarget&&(owner.contains(event.relatedTarget)||tip&&tip.contains(event.relatedTarget)))return;hide();}
  C.ui.tooltips={hide:hide,dismiss:function(){if(!tip)return false;hide();return true;},attach:function(host){
    host.addEventListener('pointerover',show);host.addEventListener('focusin',show);host.addEventListener('pointerout',leave);host.addEventListener('focusout',leave);
    return function(){if(owner&&host.contains(owner))hide();host.removeEventListener('pointerover',show);host.removeEventListener('focusin',show);host.removeEventListener('pointerout',leave);host.removeEventListener('focusout',leave);};
  }};
  C.ui.tooltips.attach(doc);doc.addEventListener('scroll',hide,true);doc.addEventListener('pointerdown',hide,true);doc.addEventListener('visibilitychange',hide);
  root.addEventListener('keydown',function(e){if(e.key==='Escape'&&tip){hide();e.preventDefault();e.stopImmediatePropagation();}},true);
  C.events.on('ui:close',hide);C.events.on('save:willReplace',hide);
  // A single small illustration and one useful action for every empty surface.
  C.ui.empty=function(host,options){
    host.replaceChildren();host.classList.add('cb-empty');host.appendChild(C.icons.create(options.icon||'card'));
    var heading=doc.createElement('strong');heading.textContent=options.heading;host.appendChild(heading);
    if(options.description){var copy=doc.createElement('p');copy.textContent=options.description;host.appendChild(copy);}
    if(options.action)host.appendChild(C.ui.create('button',{label:options.label,onClick:options.action,variant:'primary'}));
  };
  C.ui.iconAction=function(button,icon,label){button.replaceChildren(C.icons.create(icon));button.classList.add('cb-icon-action');button.setAttribute('aria-label',label);button.dataset.tooltip=label;button.removeAttribute('title');return button;};
})(window.Cardable,window);
