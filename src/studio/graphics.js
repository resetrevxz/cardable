(function(C,root){
  'use strict';
  var S=C.studioScenes;
  function identity(view){return {name:view.card.name,rarity:C.rarity(view.card.rarity).name,serial:view.instance.serial,variant:(C.variant(view.instance.variantId)||{}).name||'Original finish',wordmark:'cardable'};}
  function content(object,view){return object.content==='custom'?object.text:identity(view)[object.content]||object.text;}
  function color(rgb,alpha){return 'rgba('+rgb.map(function(v){return Math.round(v*255);}).join(',')+','+alpha+')';}
  function paint(g,w,h,objects,view){var unit=Math.min(w,h);(objects||[]).forEach(function(o){if(!o.visible||!o.opacity)return;var bw=o.size[0]*w,bh=o.size[1]*h;g.save();g.translate(o.position[0]*w,o.position[1]*h);g.rotate(o.rotation*Math.PI/180);g.globalAlpha=o.opacity;g.fillStyle=color(o.fill,o.fillOpacity);g.strokeStyle=color(o.color,1);g.lineWidth=o.stroke*unit/720;
    if(o.type==='rect'||o.type==='badge'){g.beginPath();g.roundRect(-bw/2,-bh/2,bw,bh,Math.min(bw/2,bh/2,o.radius*unit));g.fill();if(o.stroke)g.stroke();}
    if(o.type==='line'){g.beginPath();g.moveTo(-bw/2,0);g.lineTo(bw/2,0);g.stroke();}
    if(o.type==='text'||o.type==='badge'){var text=content(o,view),size=o.fontSize*unit;g.font=o.weight+' '+size+'px "'+o.font+'"';g.fillStyle=color(o.color,1);g.textBaseline='middle';g.textAlign=o.align;var lines=text.split('\n').slice(0,5),x=o.align==='left'?-bw/2:o.align==='right'?bw/2:0;lines.forEach(function(line,i){g.fillText(line,x,(i-(lines.length-1)/2)*size*1.25,bw);});}
    g.restore();});}
  function add(scene,type,options){if(scene.graphics.length>=32)throw Error('A scene supports 32 graphics.');var o=S.graphic(Object.assign({id:'graphic-'+root.crypto.randomUUID(),type:type,name:type==='text'?'Title':type==='rect'?'Frame':type==='line'?'Line':'Collector label'},options));scene.graphics.push(o);return o;}
  var templates=[{id:'poster',name:'Collector poster',shape:'4:5',copy:'A title above the card and a quiet serial below.'},{id:'desktop',name:'Desktop showcase',shape:'16:9',copy:'An understated collector label for a wide image.'},{id:'phone',name:'Phone wallpaper',shape:'9:16',copy:'Type stays inside the top and bottom safe margins.'},{id:'social',name:'Square edition',shape:'1:1',copy:'A compact name and rarity with room for the artwork.'}];
  function template(scene,id){var t=templates.find(function(t){return t.id===id;});if(!t)throw Error('Unknown layout.');if(S.locked(scene,scene.camera))throw Error('Unlock the camera before applying a layout.');if(scene.graphics.length+3>32)throw Error('Make room for three graphics first.');scene.camera.aspect=t.shape;
    // Templates add authored graphics, preserving existing layers and card edits.
    C.studioCamera.frame(scene,C.studioCamera.aspect(t.shape));scene.camera.distance=Math.min(9,scene.camera.distance*1.3);scene.camera.orthoScale=Math.min(20,scene.camera.orthoScale*1.3);scene.camera.autoFrame=scene.camera.lockToCard=false;scene.camera.focus=scene.card.position.slice();scene.camera.focusDistance=null;
    var wide=id==='desktop',ids=[];ids.push(add(scene,'text',{name:'GPU title',content:'name',position:wide?[.2,.18]:[.5,.1],size:wide?[.3,.1]:[.84,.08],fontSize:wide?.042:.035,weight:600,align:wide?'left':'center'}).id);
    ids.push(add(scene,'text',{name:'Edition & serial',content:'serial',position:wide?[.2,.86]:[.5,.91],size:wide?[.3,.06]:[.84,.05],font:'JetBrains Mono',fontSize:.015,align:wide?'left':'center',color:[.68,.69,.73]}).id);
    ids.push(add(scene,'line',{name:'Collector rule',position:wide?[.2,.8]:[.5,.85],size:wide?[.3,.01]:[.25,.01],stroke:1,color:[.4,.42,.47]}).id);return ids;
  }
  C.studioGraphics={paint:paint,content:content,identity:identity,add:add,templates:templates,template:template};
})(window.Cardable,window);
