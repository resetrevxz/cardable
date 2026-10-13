(function(C){
  'use strict';
  var S=C.studioScenes,P=C.studioProps,K=C.studioCamera;
  // Authored scene support is measured against the real mesh. This runs only
  // when constructing a catalog scene, never when loading a player's photo.
  function align(scene,preserveCamera){
    var bottom=scene.card.position[1]-.7*scene.card.scale[1],support=scene.props.find(function(p){return /^plinth-|turntable/.test(p.type)&&Math.abs(p.position[0]-scene.card.position[0])<.2;}),glass=scene.props.find(function(p){return p.type==='glass-case'&&Math.abs(p.position[0]-scene.card.position[0])<.2;}),easel=scene.props.find(function(p){return p.type==='easel'&&Math.abs(p.position[0])<.2;}),floor=scene.props.find(function(p){return p.type==='floor'||p.type==='grid-floor';});
    var contact=bottom;
    if(glass){glass.scale[1]=Math.max(1.55,glass.scale[1]);glass.position[1]=bottom+.53*glass.scale[1];contact=glass.position[1]+P.bounds('glass-case').min[1]*glass.scale[1];}
    if(support){var box=P.bounds(support.type);support.position[1]=contact-box.max[1]*support.scale[1];contact=support.position[1]+box.min[1]*support.scale[1];}
    else if(easel){easel.position[1]=bottom+.305*easel.scale[1];contact=easel.position[1]+P.bounds('easel').min[1]*easel.scale[1];}
    if(floor)floor.position[1]=contact-P.bounds(floor.type).max[1]*floor.scale[1];
    scene.props.forEach(function(p){if(p.background||(!/^plinth-|turntable|easel|glass-case/.test(p.type)&&p.type!=='floor'))p.background=true;});
    // Rings around the subject used the small equipment mesh and were entirely
    // occluded. A halo is a ring without its stand, large enough to clear the card.
    scene.props.forEach(function(p){if(p.type==='ring-light'&&Math.abs(p.position[0]-scene.card.position[0])<.4){p.type='halo';p.name='Halo';p.scale=[3.3,3.3,1];p.position[1]=.06;p.background=true;}});
    scene.props.forEach(function(p){if(p.type==='halo')p.color=p.color.map(function(v){return v*.35;});});
    if(!preserveCamera){scene.camera.target=[0,-.015,0];scene.camera.focus=scene.card.position.slice();}
    scene.backdrop.pattern=scene.backdrop.pattern||'stage';return scene;
  }
  // A background's transform is also the local parent of explicitly tagged set
  // dressing. Authored positions stay intact; serialize only the transform.
  function background(scene){var out=S.clone(scene),b=out.backdrop;
    // Portrait compositions have less room beside the subject. Keep practical
    // fixtures and ornaments inside the frame, then apply the user's transform.
    // This is a render copy: changing photo shape never rewrites authored props.
    var ratio=K.aspect(out.camera.aspect)||16/9;
    if(out.presetId&&ratio<1.2)out.props.forEach(function(p){
      if(!p.background||P.isEffect(p)||['floor','grid-floor','backdrop','collection','halo'].indexOf(p.type)>=0||Math.abs(p.position[0])<.6)return;
      var box=P.bounds(p.type),depth=out.camera.distance-p.position[2],half=depth*Math.tan(out.camera.fov*Math.PI/360)*ratio*.92,available=Math.max(.12,half-.56),width=(box.max[0]-box.min[0])*p.scale[0],factor=Math.min(1,available/Math.max(.01,width));
      p.scale=p.scale.map(function(v){return v*factor;});var radius=width*factor*.5;p.position[0]=Math.sign(p.position[0])*Math.min(Math.abs(p.position[0]),Math.max(.56+radius,half-radius));
    });
    var m=P.model(b.position,b.rotation,b.scale);m[12]+=b.offset[0];m[13]+=b.offset[1];out.props.forEach(function(p){if(!p.background)return;p.position=K.transform(m,p.position).slice(0,3);p.rotation=p.rotation.map(function(v,i){return v+b.rotation[i];});p.scale=p.scale.map(function(v,i){return v*b.scale[i];});});return out;}
  // A direct Advanced placement makes set dressing independent. Bake the
  // displayed pose and its own keyed transforms in the same undo command so
  // the backdrop is never applied a second time to an already placed object.
  function place(scene,ids,display){var selected=scene.props.filter(function(p){return p.background&&ids.indexOf(p.id)>=0&&!S.locked(scene,p);});selected.forEach(function(p){var shown=display.props.find(function(o){return o.id===p.id;});if(shown&&(shown.position.some(function(v){return Math.abs(v)>20;})||shown.scale.some(function(v){return v<.05||v>6;})))throw Error('Reset the background transform before placing this prop independently.');});selected.forEach(function(p){var shown=display.props.find(function(o){return o.id===p.id;});if(!shown)return;var reference=S.clone(scene);reference.backdrop=S.clone(display.backdrop);reference.camera=S.clone(display.camera);
      scene.animation.tracks.filter(function(t){return t.target===p.id&&['position','rotation','scale'].indexOf(t.property)>=0;}).forEach(function(t){t.keys.forEach(function(k){if(!Array.isArray(k.value))return;var copy=S.clone(reference),object=copy.props.find(function(o){return o.id===p.id;});object[t.property]=k.value.slice();var world=background(copy).props.find(function(o){return o.id===p.id;});k.value=world[t.property].slice();});});
      ['position','rotation','scale'].forEach(function(k){p[k]=shown[k].slice();});p.rotation=p.rotation.map(function(v){return ((v+180)%360+360)%360-180;});p.background=false;
    });}
  C.studioComposition={align:align,background:background,place:place};
})(window.Cardable);
