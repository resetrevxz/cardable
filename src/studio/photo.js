(function(C,root){
  'use strict';
  var formats={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'},frames=['none','polaroid','museum','slab'];
  function canvas(w,h){var el=root.document.createElement('canvas');el.width=w;el.height=h;return el;}
  function encode(el,mime,quality){return new Promise(function(resolve,reject){el.toBlob(function(blob){if(blob)resolve(blob);else reject(new Error('Photo encoding failed. Choose a smaller resolution.'));},mime,quality);});}
  function options(value,max,simple){
    value=value||{};var w=Number(value.w),h=Number(value.h);if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||w>max||h>max)throw new Error('Use whole-pixel dimensions from 32 to '+max+'.');
    if(w*h>32000000)throw new Error('Custom photos are limited to 32 megapixels to keep memory bounded.');
    if(simple&&(Math.max(w,h)>1920||w*h>1920*1080))throw new Error('Simple photos support up to 1080p (1920 × 1080 pixels).');
    return {w:w,h:h,format:formats[value.format]?value.format:'png',quality:Math.max(.1,Math.min(1,Number(value.quality)||.92)),frame:frames.indexOf(value.frame)>=0?value.frame:'none',watermark:!!value.watermark,caption:String(value.caption||'').slice(0,120),name:String(value.name||'Untitled photo').trim().slice(0,60),high:value.high!==false};
  }
  function area(o){var m=Math.round(Math.min(o.w,o.h)*.045),bottom=o.frame==='polaroid'?Math.round(o.h*.17):o.frame==='museum'?Math.round(o.h*.13):o.frame==='slab'?Math.round(o.h*.12):0;if(o.frame==='none')return {x:0,y:0,w:o.w,h:o.h};return {x:m,y:m,w:o.w-2*m,h:o.h-m-bottom};}
  function decorate(el,o,identity){
    var g=el.getContext('2d'),a=area(o),unit=Math.min(o.w,o.h),font=Math.max(8,unit*.018),y=a.y+a.h,serial=identity.serial||'',name=identity.name||'',tier=identity.tier||'',date=new Date(identity.at||Date.now()).toLocaleDateString();
    if(o.frame!=='none'){
      g.fillStyle=o.frame==='slab'?'#19191D':'#F1F0EC';g.fillRect(0,0,o.w,a.y);g.fillRect(0,a.y,a.x,o.h-a.y);g.fillRect(a.x+a.w,a.y,o.w-a.x-a.w,o.h-a.y);g.fillRect(a.x,y,a.w,o.h-y);
      g.strokeStyle=o.frame==='slab'?'#85858E':'#D2D1CD';g.lineWidth=Math.max(1,unit*.0015);g.strokeRect(a.x-.5,a.y-.5,a.w+1,a.h+1);g.fillStyle=o.frame==='slab'?'#F5F5F7':'#25252A';
      g.font='500 '+font+'px Inter';g.textBaseline='middle';g.textAlign='left';
      if(o.frame==='polaroid'){g.fillText(o.caption||name,a.x,y+(o.h-y)*.4,a.w);g.font=font*.65+'px "JetBrains Mono"';g.fillText(date,a.x,y+(o.h-y)*.75,a.w);}
      else {g.fillText(name,a.x,y+(o.h-y)*.35,a.w);g.font=font*.64+'px "JetBrains Mono"';g.fillText(tier+' · '+serial+(o.frame==='museum'?' · '+date:''),a.x,y+(o.h-y)*.7,a.w);}
      if(o.frame==='slab'){g.strokeStyle='#FFFFFF30';g.lineWidth=Math.max(1,unit*.004);g.strokeRect(a.x*.4,a.y*.4,o.w-a.x*.8,o.h-a.y*.8);}
    }
    if(o.watermark){g.font='500 '+Math.max(8,unit*.012)+'px Inter';g.textAlign='right';g.textBaseline='bottom';g.fillStyle=o.frame==='none'?'#FFFFFF99':o.frame==='slab'?'#C7C7CE':'#73737B';g.fillText('cardable',o.w-unit*.025,o.h-unit*.02);}
    return el;
  }
  // This same composition path is used by the one explicit logic check.
  function frame(source,o,identity){var el=canvas(o.w,o.h),a=area(o);el.getContext('2d').drawImage(source,a.x,a.y,a.w,a.h);return decorate(el,o,identity||{});}
  function release(job){if(job.released)return;job.released=true;if(job.renderer)job.renderer.destroy();if(job.faces)job.faces.destroy();if(job.assets)job.assets.destroy();if(job.output)job.output.width=job.output.height=1;if(job.tileCanvas)job.tileCanvas.width=job.tileCanvas.height=1;}
  function createJob(){var job={cancelled:false,released:false,abort:new root.AbortController()};job.cancel=function(){job.cancelled=true;job.abort.abort();release(job);};return job;}
  function alive(job,s){return !job.cancelled&&!s.closing&&s.root.isConnected;}
  function requireAlive(job,s){if(!alive(job,s))throw new Error('Capture cancelled.');}
  async function capture(s,value,job){
    var o=options(value,s.renderer.maxSize,s.renderer.kind==='Simple'),scene=C.studioScenes.parse(s.scene),tier=s.renderer.kind==='Simple'?'very-low':o.high?'high':s.tier,at=Date.now(),record;
    scene.presentationTime=s.lightTime;var a=area(o),viewport=s.viewport.getBoundingClientRect();if(scene.camera.autoFrame){C.studioCamera.frame(scene,viewport.width/viewport.height);scene.camera.autoFrame=false;}var sceneJson=C.studioScenes.serialize(scene);
    try{
      job.faces=await C.studioFace.paint(s.view.card,s.view.instance,scene,tier,s.view.el,s.entry,function(){return alive(job,s);});requireAlive(job,s);
      var surface=canvas(1,1);job.renderer=tier==='very-low'?C.studioRenderer.simple(surface,job.faces):C.studioRenderer.create(surface,job.faces,tier);
      if(job.renderer.kind==='Simple'&&tier!=='very-low')throw new Error('High-quality capture is unavailable. Use the Simple preview.');
      var effective=C.studioScenes.effective(scene,tier);
      var cropHeight=Math.min(viewport.height,viewport.width/(a.w/a.h))*.9;effective.camera.fov=2*Math.atan(Math.tan(effective.camera.fov*Math.PI/360)*cropHeight/viewport.height)*180/Math.PI;
      // Capture the exact sampled instant rather than advancing between tiles.
      effective.lights=C.studioLights.sample(effective.lights,scene.presentationTime,tier);effective.props=C.studioProps.sample(effective.props,scene.presentationTime,tier);
      job.assets=C.studioProps.assets(s,function(){});job.assets.sync(tier==='very-low'?[]:effective.props);await job.assets.ready();requireAlive(job,s);
      job.output=canvas(o.w,o.h);var g=job.output.getContext('2d',{alpha:false});
      if(tier==='very-low'){var cropWidth=cropHeight*a.w/a.h;job.renderer.draw(effective,a.w,a.h,job.assets,{fullW:viewport.width,fullH:viewport.height,x:(viewport.width-cropWidth)/2,y:(viewport.height-cropHeight)/2,w:cropWidth,h:cropHeight});g.drawImage(surface,a.x,a.y,a.w,a.h);}
      else {
        var bound=Math.min(1536,job.renderer.maxSize),pad=Math.ceil(Math.max(48,a.w*.017,a.h/1080*16)/4)*4,core=Math.floor((bound-pad*2)/4)*4;
        if(core<32)throw new Error('This device cannot allocate photo tiles. Use a smaller resolution.');
        job.tileCanvas=canvas(1,1);var tg=job.tileCanvas.getContext('2d'),total=Math.ceil(a.w/core)*Math.ceil(a.h/core),part=0;
        for(var y=0;y<a.h;y+=core)for(var x=0;x<a.w;x+=core){
          requireAlive(job,s);var left=Math.max(0,x-pad),top=Math.max(0,y-pad),cw=Math.min(core,a.w-x),ch=Math.min(core,a.h-y),tw=Math.min(a.w,left+cw+pad+(x-left))-left,th=Math.min(a.h,top+ch+pad+(y-top))-top;
          job.renderer.draw(effective,tw,th,job.assets,{fullW:a.w,fullH:a.h,x:left,y:top,w:tw,h:th});var pixels=job.renderer.pixels(),image=new root.ImageData(tw,th),stride=tw*4;
          for(var row=0;row<th;row++)image.data.set(pixels.subarray((th-1-row)*stride,(th-row)*stride),row*stride);
          job.tileCanvas.width=tw;job.tileCanvas.height=th;tg.putImageData(image,0,0);g.drawImage(job.tileCanvas,x-left,y-top,cw,ch,a.x+x,a.y+y,cw,ch);
          s.api.status('Rendering photo · '+(++part)+' / '+total+' tiles');await new Promise(function(resolve){root.setTimeout(resolve,0);});
        }
      }
      requireAlive(job,s);decorate(job.output,o,{name:s.view.card.name,serial:s.view.instance.serial,tier:C.rarity(s.view.card.rarity).name,at:at});
      var blob=await encode(job.output,formats[o.format],o.quality);requireAlive(job,s);
      var small=canvas(256,Math.max(1,Math.round(256*o.h/o.w)));if(small.height>256){small.height=256;small.width=Math.round(256*o.w/o.h);}small.getContext('2d').drawImage(job.output,0,0,small.width,small.height);
      var thumb;try{thumb=await encode(small,'image/jpeg',.72);}finally{small.width=small.height=1;}requireAlive(job,s);
      record={id:root.crypto.randomUUID?root.crypto.randomUUID():'photo-'+at+'-'+Math.random().toString(36).slice(2),cardId:s.view.card.id,instanceId:s.view.instance.instanceId,createdAt:at,w:o.w,h:o.h,blob:blob,thumb:thumb,sceneJson:sceneJson,name:o.name||s.view.card.name};
      var notice='Photo saved to your album.';try{await C.studioAlbum.save(record,function(){return alive(job,s);},job.abort.signal);}catch(error){requireAlive(job,s);notice=error.message+' This photo is available below; downloading now.';C.studioPhoto.download(record);}
      requireAlive(job,s);C.events.emit('studio:photo',{cardId:record.cardId,instanceId:record.instanceId,photoId:record.id,w:record.w,h:record.h,at:at});return {record:record,notice:notice+(blob.type!==formats[o.format]?' Your browser used PNG for this format.':'')};
    }finally{release(job);}
  }
  function download(photo){var url=URL.createObjectURL(photo.blob),a=root.document.createElement('a');a.href=url;a.download=(photo.name||'cardable-photo').replace(/[\/:*?"<>|]/g,'-')+'.'+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[photo.blob.type]||'png');a.click();root.queueMicrotask(function(){URL.revokeObjectURL(url);});}
  async function copy(photo){
    if(!root.ClipboardItem||!root.navigator.clipboard||!root.navigator.clipboard.write)throw new Error('Image clipboard is unavailable here. Download the photo instead.');
    // Start write during the user's click; browsers may require that activation.
    var png=photo.blob.type==='image/png'?Promise.resolve(photo.blob):(async function(){var image=await root.createImageBitmap(photo.blob),el=canvas(image.width,image.height);try{el.getContext('2d').drawImage(image,0,0);return await encode(el,'image/png',1);}finally{image.close();el.width=el.height=1;}})();
    await root.navigator.clipboard.write([new root.ClipboardItem({'image/png':png})]);
  }
  C.studioPhoto={options:options,area:area,frame:frame,encode:encode,createJob:createJob,capture:capture,download:download,copy:copy,get clipboard(){return !!(root.ClipboardItem&&root.navigator.clipboard&&root.navigator.clipboard.write);}};
})(window.Cardable,window);
