(function(C,root){
  'use strict';
  function gallery(){
    var panel=C.ui.create('sheet',{label:'Pack material gallery',className:'visual-pack-gallery'}),origin=root.document.activeElement;
    panel.append(C.ui.create('section-header',{label:'The sealed collection'}),C.ui.create('row',{label:'Presentation specimens · no cards are reserved or granted.'}));
    var grid=root.document.createElement('div');grid.className='visual-pack-grid';panel.appendChild(grid);
    var tier='high',state='ready',mode='color';
    function draw(){grid.replaceChildren();C.data.packs.forEach(function(pack){var cell=C.ui.create('panel'),title=root.document.createElement('h3');title.textContent=pack.name;cell.append(title);var stage=root.document.createElement('div');stage.className='visual-pack-specimen';stage.dataset.state=state==='waiting'?'waiting':'ready';cell.append(stage);var unit=C.settings.withPolicy(tier,function(){return C.packMarkup.unit(stage,false,pack);});C.packCouture.setState(unit.el,pack,state);unit.el.dataset.packQuality=tier;if(state==='waiting'){unit.wrapper.style.opacity='.35';unit.fluid.style.transform='translateY(45%)';}unit.el.style.filter=mode==='mono'?'grayscale(1)':'';unit.el.style.setProperty('--couture-sweep','15%');unit.el.style.setProperty('--couture-x','38%');unit.el.style.setProperty('--couture-y','25%');grid.appendChild(cell);});}
    panel.appendChild(C.ui.create('row',{children:[C.ui.create('select',{label:'Material tier',options:C.settingsSchema.tiers,value:tier,onChange:function(v){tier=v;draw();}}),C.ui.create('select',{label:'Pack state',options:C.packCouture.states,value:state,onChange:function(v){state=v;draw();}}),C.ui.create('select',{label:'Color theme',options:['color','mono'],value:mode,onChange:function(v){mode=v;draw();}})]}));
    var surface;panel.appendChild(C.ui.create('button',{label:'Close gallery',onClick:function(){surface.close();}}));draw();surface=C.ui.present(panel,{anchor:origin});return surface;
  }
  C.dev.packGallery=gallery;C.dev.register({id:'visual-packs',group:'Previews',label:'Pack material gallery',type:'button',run:gallery});
  C.events.on('app:ready',function(){if(new URLSearchParams(root.location.search).get('gallery')==='packs')gallery();});
})(window.Cardable,window);
