(function(C,root){
  'use strict';
  function label(s,text){var row=C.studioUI.node('label','studio-field',s.panel);C.studioUI.node('span','',row,text);return row;}
  function choice(s,text,key,pairs,changed){var row=label(s,text),el=C.studioUI.node('select','studio-select',row);el.setAttribute('aria-label',text);pairs.forEach(function(pair){var opt=C.studioUI.node('option','',el,pair[1]);opt.value=pair[0];opt.disabled=!!pair[2];});el.value=s.photoOptions[key];el.addEventListener('change',function(){s.photoOptions[key]=el.value;if(changed)changed();else s.api.dirty();});return el;}
  function input(s,text,key,type,min,max,step,changed){var row=label(s,text),el=C.studioUI.node('input','',row);el.type=type;el.setAttribute('aria-label',text);if(min!=null)el.min=min;if(max!=null)el.max=max;if(step!=null)el.step=step;if(type==='checkbox')el.checked=s.photoOptions[key];else el.value=s.photoOptions[key];if(type==='text')el.maxLength=key==='caption'?120:60;el.addEventListener('change',function(){s.photoOptions[key]=type==='checkbox'?el.checked:type==='text'?el.value:Number(el.value);if(changed)changed();});return el;}
  function dimensions(s){var o=s.photoOptions;if(o.resolution==='custom')return;var pairs={'1080':[1920,1080],'2k':[2560,1440],'4k':[3840,2160]},size=pairs[o.resolution],ratio=o.matchGuide&&C.studioCamera.aspect(s.scene.camera.aspect)||size[0]/size[1],edge=size[0];o.w=ratio>=1?edge:Math.round(edge*ratio);o.h=ratio>=1?Math.round(edge/ratio):edge;if(s.renderer&&s.renderer.kind==='Simple'){var scale=Math.min(1,1920/Math.max(o.w,o.h),Math.sqrt(1920*1080/(o.w*o.h)));o.w=Math.floor(o.w*scale);o.h=Math.floor(o.h*scale);}}
  function panel(s){
    var simple=s.renderer&&s.renderer.kind==='Simple',max=s.renderer?s.renderer.maxSize:1920;
    if(!s.photoOptions)s.photoOptions={resolution:'1080',w:1920,h:1080,format:'png',quality:.92,frame:'none',caption:'',name:s.view.card.name,watermark:false,high:true,matchGuide:true};
    dimensions(s);var o=s.photoOptions;
    C.studioUI.node('p','studio-copy',s.panel,'One frozen scene. Finished image dimensions include the frame. '+(simple?'Simple captures up to 1080p.':'Larger images render in bounded tiles.'));
    function rebuild(){s.api.select('photo');}
    choice(s,'Resolution','resolution',[['1080','1080p'],['2k','2K · 2560 × 1440',simple||max<2560],['4k','4K · 3840 × 2160',simple||max<3840],['custom','Custom']],rebuild);
    input(s,'Match aspect guide','matchGuide','checkbox',null,null,null,rebuild);
    input(s,'Width · pixels','w','number',32,max,1).disabled=o.resolution!=='custom';
    input(s,'Height · pixels','h','number',32,max,1).disabled=o.resolution!=='custom';
    C.studioUI.node('p','studio-copy',s.panel,'Maximum edge '+max.toLocaleString()+' px · maximum '+(simple?'2.07':'32')+' MP.');
    choice(s,'Format','format',[['png','PNG · lossless'],['jpeg','JPEG'],['webp','WebP']],rebuild);
    input(s,'Quality','quality','range',.1,1,.01).disabled=o.format==='png';
    choice(s,'Frame','frame',[['none','None'],['polaroid','Polaroid'],['museum','Museum label'],['slab','Collector slab']],rebuild);
    if(o.frame==='polaroid')input(s,'Caption','caption','text');
    input(s,'Photo name','name','text');input(s,'Cardable watermark','watermark','checkbox');
    input(s,'Highest capture quality','high','checkbox').disabled=simple;
    if(s.photoBusy)C.studioUI.node('p','studio-copy',s.panel,'Capture in progress…');
    else C.studioUI.button('Capture photo',s.panel,function(){capture(s);});
    if(s.latestPhoto){var actions=C.studioUI.node('div','studio-presets-row',s.panel);C.studioUI.button('Download latest',actions,function(){C.studioPhoto.download(s.latestPhoto);});C.studioUI.button('Copy latest',actions,function(){C.studioPhoto.copy(s.latestPhoto).then(function(){s.api.status('Photo copied.');},function(error){s.api.status(error.message);});}).disabled=!C.studioPhoto.clipboard;}
    C.studioUI.button('Open album',s.panel,function(){C.studio.openAlbum();}).disabled=s.photoBusy;
  }
  function lock(s,value){
    s.photoBusy=value;if(s.directorDock)s.directorDock.inert=value;s.root.classList.toggle('is-capturing',value);s.root.querySelector('.studio-layout').inert=value;s.root.querySelector('.studio-tools').inert=value;s.photoFilm.el.inert=value;
    if(value){s.photoButtons=Array.from(s.root.querySelectorAll('.studio-topbar button')).filter(function(b){return b!==s.exit;}).map(function(b){var r={el:b,disabled:b.disabled};b.disabled=true;return r;});s.exit.focus({preventScroll:true});}
    else {(s.photoButtons||[]).forEach(function(r){r.el.disabled=r.disabled;});s.photoButtons=[];s.lastFrame=null;C.studioUI.history(s);s.api.dirty();}
  }
  function shutter(s,record){
    if(s.shutter){URL.revokeObjectURL(s.shutter.url);s.shutter.el.remove();if(s.shutter.fly)s.shutter.fly.remove();}
    var el=C.studioUI.node('div','studio-shutter',s.viewport),finder=C.studioUI.node('div','studio-shutter-finder',el);el.setAttribute('aria-hidden','true');C.studioUI.node('div','studio-shutter-sweep',el);var fly=C.studioUI.node('img','studio-photo-flight',s.root),from=s.viewport.getBoundingClientRect(),target=(s.photoFilm.el.querySelector('.studio-filmstrip-items button')||s.photoFilm.el.querySelector('button')).getBoundingClientRect(),dx=target.left+target.width/2-from.left-from.width/2,dy=target.top+target.height/2-from.top-from.height/2,url=URL.createObjectURL(record.thumb);fly.alt='';fly.style.left=(from.left+from.width/2-80)+'px';fly.style.top=(from.top+from.height/2-50)+'px';fly.src=url;fly.onload=fly.onerror=function(){URL.revokeObjectURL(url);};s.shutter={el:el,fly:fly,url:url,dx:dx,dy:dy,age:0};C.fx.wake();
  }
  async function capture(s){
    if(s.photoBusy||s.recordJob||s.closing||!s.renderer)return;try{C.studioPhoto.options(s.photoOptions,s.renderer.maxSize,s.renderer.kind==='Simple');}catch(error){s.api.status(error.message);return;}
    s.api.commit();s.gizmos.cancel();var job=s.photoJob=C.studioPhoto.createJob();lock(s,true);s.api.status('Preparing photo…');
    try{var result=await C.studioPhoto.capture(s,s.photoOptions,job);if(s.closing||!s.root.isConnected)return;s.latestPhoto=result.record;s.api.status(result.notice);shutter(s,result.record);await s.photoFilm.refresh();}
    catch(error){if(!s.closing&&s.root.isConnected)s.api.status(error.message);}
    finally{if(s.root.isConnected&&!s.closing){lock(s,false);if(s.selected==='photo'){s.api.select('photo');var button=Array.from(s.panel.querySelectorAll('button')).find(function(b){return b.textContent==='Capture photo';});if(button)button.focus({preventScroll:true});}}if(s.photoJob===job)s.photoJob=null;}
  }
  C.studioPhotoPanel=panel;C.studioPhotoPanel.capture=capture;
  C.studioFilmstrip={create:function(s,host){
    var el=C.studioUI.node('div','studio-filmstrip',host),items=C.studioUI.node('div','studio-filmstrip-items',el),usage=C.studioUI.node('p','studio-album-usage',el),urls=[],dead=false,revision=0;
    C.studioUI.button('Album',el,function(){C.studio.openAlbum();});
    function clear(){urls.forEach(URL.revokeObjectURL);urls=[];items.replaceChildren();}
    async function refresh(){var rev=++revision;try{var list=await C.studioAlbum.list(),info=await C.studioAlbum.usage(list);if(dead||rev!==revision)return;clear();list.slice(0,12).forEach(function(photo){var b=C.studioUI.button('',items,function(){C.studio.openAlbum(photo.id);},photo.name);b.setAttribute('aria-label','Open photo: '+photo.name);var img=C.studioUI.node('img','',b),url=photo.thumb?URL.createObjectURL(photo.thumb):'';if(url){urls.push(url);img.src=url;}img.alt='';img.loading='lazy';});usage.textContent=C.studioAlbumUI.usageText(info);}
      catch(error){if(!dead)usage.textContent=error.message;}}
    var off=C.events.on('studio:albumChanged',refresh);refresh();return {el:el,refresh:refresh,destroy:function(){dead=true;revision++;off();clear();}};
  }};
})(window.Cardable,window);
