(function(C,root){
  'use strict';
  var current=null;
  function node(tag,cls,parent,text){var el=root.document.createElement(tag);el.className=cls||'';if(text!=null)el.textContent=text;if(parent)parent.appendChild(el);return el;}
  function button(text,parent,run){var b=node('button','studio-button',parent,text);b.type='button';b.addEventListener('click',run);return b;}
  function usageText(info){var text=info.count+' / 100 photos · '+(info.bytes/1048576).toFixed(1)+' MB';if(info.estimate&&Number.isFinite(info.estimate.usage)&&Number.isFinite(info.estimate.quota))text+=' · browser '+(info.estimate.usage/1048576).toFixed(1)+' / '+(info.estimate.quota/1048576).toFixed(0)+' MB';return text;}
  function close(){
    var s=current;if(!s)return;current=null;s.revision++;s.refreshRevision++;s.urls.forEach(URL.revokeObjectURL);if(s.previewURL)URL.revokeObjectURL(s.previewURL);s.off.forEach(function(off){off();});C.accessibility.release(s.el);s.el.remove();root.document.body.classList.remove('studio-album-active');s.hidden.forEach(function(r){if(r.el.isConnected){r.el.inert=r.inert;r.el.style.visibility=r.visibility;}});s.releaseScope();s.releaseMenu();if(s.timers)C.timers.start();if(s.focus&&s.focus.isConnected)s.focus.focus({preventScroll:true});C.events.emit('studio:albumContext',{active:false});C.fx.wake();
  }
  async function selected(s,id){
    var revision=++s.revision;s.preview.replaceChildren();if(s.previewURL){URL.revokeObjectURL(s.previewURL);s.previewURL=null;}
    try{var photo=await C.studioAlbum.get(id);if(current!==s||revision!==s.revision)return;if(!photo||!(photo.blob instanceof root.Blob)){s.notice.textContent='This photo was removed.';return;}
      s.selectedId=id;var img=node('img','studio-album-photo',s.preview);img.alt=photo.name;s.previewURL=URL.createObjectURL(photo.blob);img.src=s.previewURL;
      node('p','studio-copy',s.preview,photo.w+' × '+photo.h+' · '+new Date(photo.createdAt).toLocaleString());
      var row=node('label','studio-field',s.preview);node('span','',row,'Photo name');var name=node('input','',row);name.type='text';name.value=photo.name;name.maxLength=60;name.setAttribute('aria-label','Photo name');
      async function action(run){try{await run();}catch(error){if(current===s)s.notice.textContent=error.message;}}
      var actions=node('div','studio-presets-row',s.preview);
      button('Rename',actions,function(){action(async function(){await C.studioAlbum.rename(photo.id,name.value);if(current===s){s.notice.textContent='Photo renamed.';C.events.emit('studio:albumChanged');await refresh(s,photo.id);}});});
      button('Download',actions,function(){C.studioPhoto.download(photo);});
      button('Copy image',actions,function(){C.studioPhoto.copy(photo).then(function(){if(current===s)s.notice.textContent='Image copied.';},function(error){if(current===s)s.notice.textContent=error.message+' Download the photo instead.';});}).disabled=!C.studioPhoto.clipboard;
      var owned=C.state.current.inventory.some(function(i){return i.instanceId===photo.instanceId&&i.cardId===photo.cardId;});
      button('Reopen scene',actions,function(){if(!owned)return;close();C.studio.reopenPhoto(photo);}).disabled=!owned;
      if(!owned)node('p','studio-copy',s.preview,'This serial is no longer in your collection. Its photo remains available.');
      button('Delete photo',actions,function(){action(async function(){s.revision++;await C.studioAlbum.remove(photo.id);if(current===s){s.preview.replaceChildren();s.selectedId=null;s.notice.textContent='Photo deleted.';C.events.emit('studio:albumChanged');await refresh(s);}});});
    }catch(error){if(current===s)s.notice.textContent=error.message;}
  }
  async function refresh(s,id){
    var revision=s.refreshRevision=(s.refreshRevision||0)+1;try{var list=await C.studioAlbum.list(),info=await C.studioAlbum.usage(list);if(current!==s||revision!==s.refreshRevision)return;s.urls.forEach(URL.revokeObjectURL);s.urls=[];s.grid.replaceChildren();s.usage.textContent=usageText(info);
      if(!list.length)node('p','studio-copy',s.grid,'Your album is empty. Inspect a card and capture a photo to begin.');
      list.forEach(function(photo){var b=button('',s.grid,function(){selected(s,photo.id);});b.classList.add('studio-album-tile');b.setAttribute('aria-label','View photo: '+photo.name);var img=node('img','',b),url=photo.thumb?URL.createObjectURL(photo.thumb):'';s.urls.push(url);img.alt='';img.src=url;img.loading='lazy';node('span','',b,photo.name);node('small','',b,photo.w+' × '+photo.h);});if(id)await selected(s,id);
    }catch(error){if(current===s)s.notice.textContent=error.message;}
  }
  C.studioAlbumUI={get active(){return !!current;},usageText:usageText,close:close,
    open:async function(id){
      if(current){if(id)await selected(current,id);return;}if(C.studio.pending||C.preferences.open||C.opening.phase!=='idle')return;
      if(C.studioController&&C.studioController.capturing)return;
      if(C.contextMenu.open)C.contextMenu.close();if(C.inventory.toolbar)C.inventory.toolbar.close();
      var s=current={urls:[],hidden:[],off:[],revision:0,focus:root.document.activeElement};s.timers=C.timers.running;C.timers.stop();s.releaseMenu=C.menu.suspendActivity();s.releaseScope=C.fx.scope('studio-album');
      s.el=node('section','studio-album',root.document.body);s.el.setAttribute('role','dialog');s.el.setAttribute('aria-modal','true');s.el.setAttribute('aria-label','Photo album');s.el.setAttribute('data-tool-surface','album');
      var top=node('header','studio-album-top',s.el),heading=node('div','',top);node('p','studio-kicker',heading,'CARDABLE / PHOTO ALBUM');node('h1','',heading,'The collection, composed.');var exit=button('Close album',top,close);s.usage=node('p','studio-album-usage',s.el);s.notice=node('p','studio-copy',s.el);s.notice.setAttribute('role','status');var layout=node('div','studio-album-layout',s.el);s.grid=node('div','studio-album-grid',layout);s.preview=node('aside','studio-album-preview',layout);node('p','studio-copy',s.preview,'Choose a photo to download it or reopen its scene.');
      C.viewport.layers().forEach(function(el){if(el===s.el||el.tagName==='SCRIPT')return;s.hidden.push({el:el,inert:el.inert,visibility:el.style.visibility});el.inert=true;el.style.visibility='hidden';});root.document.body.classList.add('studio-album-active');C.accessibility.trap(s.el);exit.focus({preventScroll:true});
      s.el.addEventListener('keydown',function(event){event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();}});
      ['click','contextmenu','pointerdown','pointerup','wheel','keyup'].forEach(function(name){s.el.addEventListener(name,function(event){event.stopPropagation();if(name==='contextmenu')event.preventDefault();});});
      s.off.push(C.events.on('save:willReplace',close),C.events.on('detail:reset',close));C.events.emit('studio:albumContext',{active:true});await refresh(s,id);
    }
  };
})(window.Cardable,window);
