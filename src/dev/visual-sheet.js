(function(C,root){
  'use strict';
  var recipes={mythical:[1.8,6.5,8.35,12.4,20.8,25.3],ascendant:[4.8,9.9,11.8,13.6,22.2,27.3]};
  function sheet(id){
    if(!recipes[id])throw Error('Choose mythical or ascendant.');
    var tier=C.quality.availability().available&&C.settings.get('quality')==='very-high'?'very-high':'high',spec=C.rarity(id).openingIntro;
    var page=C.ui.create('sheet',{label:id+' composition contact sheet',className:'visual-contact-sheet'}),canvas=root.document.createElement('canvas'),q=canvas.getContext('2d',{alpha:false});canvas.width=1800;canvas.height=800;
    var tile=root.document.createElement('canvas');tile.width=600;tile.height=350;var g=tile.getContext('2d',{alpha:false});
    q.fillStyle='#08080A';q.fillRect(0,0,canvas.width,canvas.height);
    C.settings.withPolicy(tier,function(){var painter=id==='mythical'?C.mythicalIntro.create():C.ascendantIntro.create();try{painter.start(spec,'CBL-CONTACT-SHEET');painter.setProfile('safe');recipes[id].forEach(function(time,index){var ms=time*1000,offset=0,section;spec.sections.some(function(s){if(ms<offset+s.ms){section={id:s.id,p:Math.max(0,Math.min(1,(ms-offset)/s.ms))};return true;}offset+=s.ms;});g.fillStyle='#08080A';g.fillRect(0,0,600,350);painter.paint(g,600,350,section,ms,null);var x=index%3*600,y=Math.floor(index/3)*400;q.drawImage(tile,x,y);q.fillStyle='#B8BCC6';q.font='14px monospace';q.fillText(id.toUpperCase()+' / '+time.toFixed(1)+' s / '+tier,x+16,y+378);});}finally{painter.stop();}});
    tile.width=tile.height=1;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Six fixed-time '+id+' composition frames. Safe profile.');page.appendChild(canvas);var surface;
    page.appendChild(C.ui.create('row',{label:'Composition specimens · fixed timecodes · no opening, rewards or save writes.'}));page.appendChild(C.ui.create('button',{label:'Close contact sheet',onClick:function(){surface.close();}}));surface=C.ui.present(page);C.dev.lastContactSheet={scene:id,canvas:canvas,tier:tier};return surface;
  }
  C.dev.contactSheet=sheet;
  ['mythical','ascendant'].forEach(function(id){C.dev.register({id:'visual-sheet-'+id,group:'Previews',label:id[0].toUpperCase()+id.slice(1)+' contact sheet',type:'button',run:function(){sheet(id);}});});
  C.events.on('app:ready',function(){var id=new URLSearchParams(root.location.search).get('sheet');if(recipes[id])sheet(id);});
})(window.Cardable,window);
