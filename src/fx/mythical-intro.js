(function (C, root) {
  'use strict';
  var TAU=Math.PI*2;
  function clamp(v){return Math.max(0,Math.min(1,v));}
  function smooth(v){v=clamp(v);return v*v*(3-2*v);}
  function mix(a,b,t){return a+(b-a)*t;}
  function randomFor(seed){var n=2166136261;for(var i=0;i<seed.length;i++)n=Math.imul(n^seed.charCodeAt(i),16777619);return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function rgb(c){if(C.config.rarityColorMode!=='mono')return c;var l=Math.round(c[0]*.213+c[1]*.715+c[2]*.072);return [l,l,l];}
  function rgba(c,a){return 'rgba('+rgb(c).join(',')+','+clamp(a)+')';}
  function polygon(g,pts){g.beginPath();pts.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.closePath();}
  // Original vector lettering: no third font, platform glyph dependency or network asset.
  var glyphs={
    M:'M3 88V12L10 2L29 30L48 2L55 12V88L48 96L41 87V30L29 48L17 30V87L10 96Z',
    Y:'M0 5L10 0L29 30L48 0L58 5L35 43V86L41 93L29 99L17 93L23 86V43Z',
    T:'M0 5L7 0H51L58 5L52 20L46 12H35V86L42 93L29 99L16 93L23 86V12H12L6 20Z',
    H:'M2 8L10 0L18 8L16 39H42L40 8L48 0L56 8L54 87L48 96L40 88L42 51H16L18 88L10 96L4 87Z',
    I:'M15 7L29 0L43 7L35 14V83L43 91L29 98L15 91L23 83V14Z',
    C:'M53 14L43 0H17L4 14V80L17 96H43L55 83L48 70L39 83H23L16 75V22L23 13H39L47 27Z',
    A:'M1 88L21 11L29 0L37 11L57 88L50 96L43 88L38 69H20L15 88L8 96ZM24 56H34L29 29Z',
    L:'M4 8L12 0L20 8L18 82H43L51 72L57 87L49 96H12L4 88Z'
  };
  var word='MYTHICAL'.split('').map(function(letter){return new Path2D(glyphs[letter]);});
  C.mythicalIntro={create:function(){
    var scene=null,seed='',spec=null,cloud=null,cloudKey='',plate=null,plateKey='',heat=null,heatKey='',rock=null,rockKey='',glows=Object.create(null),motes=[],fragments=[],rings=[],lastTime=0,timeline=Object.create(null);
    var RED=[236,16,40],RUBY=[100,3,20],PALE=[255,209,204],profile='safe',presentationFactor=1,flashDone=false,flashAge=-1;
    var stats={backend:'canvas',backdropPaints:0,sceneFrames:0};
    function glow(g,x,y,rx,ry,c,a){if(a<=0)return;var color=rgb(c),key=color.join(',');if(!glows[key]){var s=root.document.createElement('canvas');s.width=s.height=128;var q=s.getContext('2d'),grad=q.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba('+color+',1)');grad.addColorStop(.12,'rgba('+color+',.68)');grad.addColorStop(.4,'rgba('+color+',.12)');grad.addColorStop(1,'rgba('+color+',0)');q.fillStyle=grad;q.fillRect(0,0,128,128);glows[key]=s;}g.save();g.globalAlpha*=a;g.drawImage(glows[key],x-rx,y-ry,rx*2,ry*2);g.restore();}
    function material(){
      var key=C.config.rarityColorMode+':'+RED+':'+RUBY;if(cloud&&cloudKey===key)return cloud;cloudKey=key;
      var s=root.document.createElement('canvas');s.width=s.height=384;var q=s.getContext('2d'),image=q.createImageData(384,384),random=randomFor('crimson-smoke-material');
      var grids=[12,24,48].map(function(n){var values=new Float32Array(n*n);for(var i=0;i<values.length;i++)values[i]=random();return {n:n,values:values};});
      function noise(grid,x,y){var n=grid.n,xx=(x%1+1)%1*n,yy=(y%1+1)%1*n,ix=Math.floor(xx),iy=Math.floor(yy),fx=smooth(xx-ix),fy=smooth(yy-iy),v=grid.values;return mix(mix(v[iy*n+ix],v[iy*n+(ix+1)%n],fx),mix(v[((iy+1)%n)*n+ix],v[((iy+1)%n)*n+(ix+1)%n],fx),fy);}
      for(var y=0;y<384;y++)for(var x=0;x<384;x++){var u=x/384,v=y/384,dx=u-.5,dy=v-.5,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx)+r*3.2;u=.5+Math.cos(a)*r+Math.sin(v*17)*.055;v=.5+Math.sin(a)*r+Math.sin(u*13)*.045;var n=noise(grids[0],u,v)*.59+noise(grids[1],u,v)*.28+noise(grids[2],u,v)*.13;var density=Math.pow(smooth((n-.27)/.52),2),edge=smooth(r/.26)*(1-smooth((r-.35)/.34)),at=(y*384+x)*4,c=rgb(RED.map(function(channel,k){return mix(RUBY[k]*.15,channel*.57,density);}));for(var k=0;k<3;k++)image.data[at+k]=c[k];image.data[at+3]=Math.round(density*edge*230);}
      q.putImageData(image,0,0);cloud=s;return cloud;
    }
    function arc(g,r,a,b,c,width){g.beginPath();g.arc(0,0,r,a,b);g.strokeStyle=c;g.lineWidth=width;g.stroke();}
    function dial(g,r,t,strength,rupture,remnant){C.cutsceneClock.draw(g,r,t,strength,rupture,remnant,{RED:RED,PALE:PALE,rings:rings,arc:arc,polygon:polygon,rgba:rgba,glow:glow});}
    function atmosphere(g,w,h,t,amount){var sprite=material(),base=g.globalAlpha;g.save();g.globalAlpha=base*amount;g.translate(w*.5,h*.5);g.rotate(Math.sin(t*.06)*.045);g.drawImage(sprite,-w*.62+Math.sin(t*.13)*w*.025,-h*.66,w*1.24,h*1.32);g.globalCompositeOperation='screen';g.globalAlpha=base*amount*.5;g.rotate(-.12);g.drawImage(sprite,-w*.61-Math.sin(t*.08)*w*.024,-h*.6,w*1.26,h*1.24);g.restore();}
    function particleField(g,w,h,t,amount,wind){if(C.settings.policy.particles<=0)return;g.save();motes.forEach(function(p,i){if(i>=motes.length*C.settings.policy.particles)return;var x=(p.x+t*(wind?.033:.002))%1*w,y=(p.y-t*(wind?.008:.006)+100)%1*h;var a=amount*(.15+.35*(.5+.5*Math.sin(t*.8+p.phase)));if(i%9===0)glow(g,x,y,p.size*4,p.size*4,RED,a*.15);g.fillStyle=rgba(i%5===0?PALE:RED,a);g.beginPath();g.arc(x,y,p.size*.55,0,TAU);g.fill();if(wind&&i%3===0){g.beginPath();g.moveTo(x,y);g.lineTo(x-p.size*9,y+p.size*1.2);g.strokeStyle=rgba(RED,a*.3);g.lineWidth=.6;g.stroke();}});g.restore();}
    function star(g,r,t,formation,heat,rupture){
      var safe=profile==='safe',beat=.86+Math.sin(t*TAU*(safe?presentationFactor:1)*(safe?1:1.55))*(safe?.045:.14),spin=t*.075+rupture*rupture*32,rr=r*(.90+formation*.13)*beat;
      glow(g,0,0,rr*3,rr*2.1,RED,.35+heat*.25);glow(g,0,0,rr*.62,rr*.62,RED,.7);
      g.save();g.rotate(spin);
      var points=[];for(var ray=0;ray<16;ray++){var a=ray*TAU/16,long=ray%2===0,reach=long?(ray%4===0?1:.64):.105;points.push([Math.cos(a)*rr*reach,Math.sin(a)*rr*reach]);}polygon(g,points);var fill=g.createRadialGradient(0,0,0,0,0,rr);fill.addColorStop(0,rgba(PALE,.98));fill.addColorStop(.13,rgba([255,43,54],.99));fill.addColorStop(.55,rgba(RED,.8));fill.addColorStop(1,rgba(RED,.03));g.fillStyle=fill;g.fill();
      // Facets retain a mineral silhouette before the core burns into the reference's long rays.
      for(var i=0;i<8;i++){var a=i*TAU/8,reach=i%2?.64:1;polygon(g,[[0,0],[Math.cos(a)*rr*reach,Math.sin(a)*rr*reach],[Math.cos(a+.19)*rr*.15,Math.sin(a+.19)*rr*.15]]);g.fillStyle=rgba(i%2?RUBY:PALE,(1-heat)*.24);g.fill();}
      g.globalCompositeOperation='screen';for(var beam=0;beam<8;beam++){g.save();g.rotate(beam*TAU/8);glow(g,0,0,rr*(.7+heat*.9)*(beam%2?.74:1),rr*(.012+heat*.008),[255,54,65],.32+heat*.48);g.restore();}glow(g,0,0,rr*.09,rr*.09,[255,255,255],.55+heat*.45);g.restore();
    }
    function title(g,w,h,r,t,arrival,corrupt,rupture){
      var scale=Math.min(w*.83/512,r*2.25/512),left=w/2-256*scale,top=h*.5+r*.42,alpha=smooth(arrival/.18)*(1-smooth((rupture-.72)/.28));
      g.save();g.globalAlpha*=alpha;g.translate(left,top);g.scale(scale,scale);
      for(var i=0;i<word.length;i++){var jitter=corrupt>.4?Math.sin(Math.floor(t*12)+i*2.1)*corrupt*3:0;g.save();g.translate(i*64+jitter,Math.sin(t*5+i)*rupture*9);var gradient=g.createLinearGradient(0,0,58,0),swap=.5+.5*Math.sin(t*2.7+i*.13);gradient.addColorStop(0,rgba(swap>.5?[5,0,2]:RED,1));gradient.addColorStop(.49,rgba(swap>.5?[10,0,3]:PALE,1));gradient.addColorStop(.51,rgba(swap>.5?RED:[6,0,2],1));gradient.addColorStop(1,rgba(swap>.5?PALE:RED,1));g.fillStyle=gradient;g.strokeStyle=rgba([255,77,86],.67);g.lineWidth=.65;
        var mutate=corrupt>.35&&Math.sin(Math.floor(t*7)+i*2.4)>.58;
        if(rupture>.45){var breakage=smooth((rupture-.45)/.55);C.cutsceneText.bands(g,{count:4,height:25,width:64,x:function(band){return Math.sin(i*2.3+band)*breakage*30;},y:function(band){return (band-1.5)*breakage*25;},turn:function(band){return Math.sin(i+band)*breakage*.12;}},function(){g.fill(word[i],'evenodd');g.stroke(word[i]);});}
        else if(mutate){g.beginPath();g.moveTo(9,9);g.lineTo(48,91);g.lineTo(48,20);g.lineTo(10,78);g.moveTo(0,48);g.lineTo(58,48);g.strokeStyle=rgba(RED,.95);g.lineWidth=4;g.stroke();}else{g.fill(word[i],'evenodd');g.stroke(word[i]);}
        if(corrupt>.2){g.save();g.beginPath();g.rect(-6,20+((Math.floor(t*11)+i*9)%55),74,6);g.clip();g.translate(Math.sin(t*29+i)*corrupt*12,0);g.fillStyle=rgba(PALE,.4);g.fill(word[i],'evenodd');g.restore();}g.restore();}
      // Sparse, hand-drawn side ciphers. They do not mutate the card's actual name or metadata.
      if(corrupt>.1){for(var k=0;k<14;k++){var x=k<7?-22:530,y=12+(k%7)*13;g.strokeStyle=rgba(k%2?RED:PALE,(.25+corrupt*.2)*(.5+.5*Math.sin(Math.floor(t*8)+k)));g.lineWidth=.8;g.beginPath();g.moveTo(x-6,y);g.lineTo(x+5,y-5);g.lineTo(x+3,y+5);g.moveTo(x-4,y+3);g.lineTo(x+6,y+2);g.stroke();}}g.restore();
    }
    function heatMaterial(){var key=C.config.rarityColorMode+':'+RED+':'+PALE;if(heat&&heatKey===key)return heat;heatKey=key;heat=root.document.createElement('canvas');heat.width=128;heat.height=256;var q=heat.getContext('2d'),pixels=q.createImageData(128,256),random=randomFor('crimson-flame'),grid=new Float32Array(16*32);for(var i=0;i<grid.length;i++)grid[i]=random();function noise(u,v){var x=(u%1+1)%1*16,y=(v%1+1)%1*32,ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return mix(mix(grid[iy*16+ix],grid[iy*16+(ix+1)%16],fx),mix(grid[((iy+1)%32)*16+ix],grid[((iy+1)%32)*16+(ix+1)%16],fx),fy);}
      for(var y=0;y<256;y++)for(var x=0;x<128;x++){var u=x/128,v=y/256,n=noise(u+Math.sin(v*10)*.025,v)*.6+noise(u*2,v*2)*.4,fuel=v-.47+n*.38+Math.sin(u*TAU*6+Math.sin(v*11)*.55)*.12,alpha=smooth(fuel/.17)*smooth(v/.15),hot=Math.pow(smooth((fuel-.08)/.65),1.9),c=rgb(RED.map(function(v,k){return mix(v*[.68,.19,.5][k],PALE[k]*[1,.74,.61][k],hot);} )),at=(y*128+x)*4;for(var k=0;k<3;k++)pixels.data[at+k]=c[k];pixels.data[at+3]=Math.round(alpha*255);}q.putImageData(pixels,0,0);return heat;}
    function fire(g,w,h,t,p){if(p<=0)return;var sprite=heatMaterial(),height=h*(.10+p*.33);g.save();g.globalCompositeOperation='screen';g.globalAlpha=p*.8;var shift=t*.028%1*w;g.drawImage(sprite,-shift,h-height,w,height);g.drawImage(sprite,w-shift,h-height,w,height);g.globalAlpha=p*.35;g.drawImage(sprite,-w*.1+Math.sin(t*.8)*w*.04,h-height*.84,w*1.2,height*.84);g.restore();if(C.settingsSchema.tiers.indexOf(C.settings.get('cinematicQuality'))>=3){g.save();g.globalCompositeOperation='screen';for(var tongue=0;tongue<9;tongue++){var xx=w*(tongue+.5)/9,phase=t*.6+tongue*2.399,lift=height*(.65+.18*Math.sin(phase)),lean=Math.sin(phase*.7)*w*.018;g.beginPath();g.moveTo(xx-w*.035,h);g.bezierCurveTo(xx-w*.04,h-lift*.4,xx+lean-w*.012,h-lift*.8,xx+lean,h-lift);g.bezierCurveTo(xx+lean+w*.012,h-lift*.6,xx+w*.04,h-lift*.25,xx+w*.035,h);g.fillStyle=rgba(tongue%3?RED:PALE,p*(profile==='safe'?.075:.12));g.fill();}g.restore();}glow(g,w/2,h,w*.7,height*.38,RED,p*.2);}
    function backplate(g,w,h,t){t=t||0;var key=seed+':'+C.config.rarityColorMode;if(!plate||plateKey!==key){plateKey=key;plate=root.document.createElement('canvas');plate.width=640;plate.height=480;var q=plate.getContext('2d');q.fillStyle=rgba([7,0,3],1);q.fillRect(0,0,640,480);atmosphere(q,640,480,0,.77);q.save();q.translate(320,240);dial(q,280,0,.3,0,true);q.restore();var dark=q.createRadialGradient(320,235,5,320,235,220);dark.addColorStop(0,'rgba(0,0,0,.87)');dark.addColorStop(.6,'rgba(0,0,0,.53)');dark.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=dark;q.fillRect(0,0,640,480);}g.drawImage(plate,0,0,w,h);if(t>0){atmosphere(g,w,h,t,.13);for(var i=0;i<Math.ceil(12*C.settings.policy.particles);i++){var p=motes[i],side=i%2?.9:.1,x=w*(side+Math.sin(t*.07+p.phase)*.05),y=h*((p.y-t*.008+100)%1);glow(g,x,y,p.size*2,p.size*3,RED,.14);}}stats.backdropPaints++;}
    function rockMaterial(){
      var key=seed+':'+C.config.rarityColorMode;if(rock&&rockKey===key)return rock;rockKey=key;
      var c=root.document.createElement('canvas');c.width=640;c.height=480;var q=c.getContext('2d'),r=randomFor('cave-rock:'+seed);
      q.fillStyle=rgba([9,5,8],1);q.fillRect(0,0,640,480);
      for(var i=0;i<140;i++){
        var x=r()*640,y=r()*350,wide=24+r()*120,tall=15+r()*85;
        polygon(q,[[x-wide,y],[x-wide*.4,y-tall],[x+wide*.7,y-tall*.8],[x+wide,y+tall*.4],[x,y+tall]]);
        var shade=q.createLinearGradient(x-wide,y-tall,x+wide,y+tall);shade.addColorStop(0,rgba([44,24,29],.65));shade.addColorStop(.3,rgba([21,14,21],.9));shade.addColorStop(1,rgba([3,1,4],.9));q.fillStyle=shade;q.fill();
        q.beginPath();q.moveTo(x-wide,y);q.lineTo(x-wide*.4,y-tall);q.lineTo(x+wide*.7,y-tall*.8);q.strokeStyle=rgba([79,46,50],.12);q.lineWidth=.7;q.stroke();
      }
      var opening=q.createRadialGradient(320,220,15,320,220,280);opening.addColorStop(0,'rgba(0,0,0,.08)');opening.addColorStop(1,'rgba(0,0,0,.65)');q.fillStyle=opening;q.fillRect(0,0,640,480);rock=c;return c;
    }
    function canvasCave(g,w,h,t){
      // A deliberate fallback, including context loss; never interrupt a committed reveal.
      g.fillStyle=rgba([7,1,4],1);g.fillRect(0,0,w,h);
      var push=smooth(t/timeline.cave.ms),zoom=1+push*.12;g.drawImage(rockMaterial(),-w*(zoom-1)*.5,-h*(zoom-1)*.15,w*zoom,h*zoom);atmosphere(g,w,h,t,.3);
      var underwater=t>=timeline.underwater.start,cx=w*.5,water=h*.75,heroSize=Math.min(w,h)*.13,releaseAngle=spec.caveArt.tipAngle,descent=t>=timeline.fall.start?C.cutsceneMath.crystalFall(t,timeline,releaseAngle):null;
      var contactY=water-heroSize*Math.cos(releaseAngle+.63),contactX=cx-heroSize*Math.sin(releaseAngle+.63),heroY=descent?mix(h*.25,contactY,descent.phase*descent.phase)+descent.depth*h*.1:h*.25;
      if(underwater){var atCut=C.cutsceneMath.crystalFall(timeline.underwater.start,timeline,spec.caveArt.tipAngle);heroY=h*.48+(descent.depth-atCut.depth)*h*.1;}
      if(!underwater){for(var i=0;i<22;i++){var p=motes[i],x=p.x*w,y=h*(.06+p.y*.18),size=(.04+p.size*.03)*h;g.save();g.translate(x,y);g.rotate(Math.sin(t*.65+p.phase)*.012);polygon(g,[[0,-size*.3],[size*.23,0],[size*.14,size*.48],[0,size],[-size*.19,size*.43],[-size*.21,0]]);var ruby=g.createLinearGradient(-size*.2,0,size*.2,0);ruby.addColorStop(0,rgba([31,1,8],.95));ruby.addColorStop(.44,rgba(RED,.68));ruby.addColorStop(.53,rgba(PALE,.2));ruby.addColorStop(1,rgba(RUBY,.9));g.fillStyle=ruby;g.fill();g.strokeStyle=rgba(RED,.25);g.stroke();g.restore();}g.fillStyle='rgba(0,0,0,.8)';g.fillRect(0,water,w,h-water);for(var k=0;k<5;k++){g.beginPath();g.ellipse(t>=timeline.impact.start?contactX:cx,water,w*(.04+k*.07),h*(.007+k*.012),0,0,TAU);g.strokeStyle=rgba(RED,t>=timeline.impact.start?.18:.04);g.stroke();}}
      var heroAngle=descent?descent.angle:t<timeline.tip.start?0:smooth((t-timeline.tip.start)/(timeline.tip.ms*.72))*spec.caveArt.tipAngle;
      g.save();g.translate(cx,heroY);g.rotate(heroAngle);var size=heroSize;polygon(g,[[0,-size],[size*.37,-size*.55],[size*.27,size*.3],[0,size],[-size*.3,size*.24],[-size*.37,-size*.55]]);g.fillStyle=rgba(RUBY,1);g.fill();g.strokeStyle=rgba(RED,.8);g.lineWidth=1;g.stroke();g.beginPath();g.moveTo(0,-size);g.lineTo(-size*.09,size*.2);g.lineTo(0,size);g.moveTo(size*.37,-size*.55);g.lineTo(-size*.09,size*.2);g.lineTo(-size*.37,-size*.55);g.strokeStyle=rgba(PALE,.16);g.stroke();if(underwater)for(var j=0;j<9;j++){g.beginPath();g.moveTo(Math.sin(j)*size*.2,-size*.1);for(var u=0;u<=1;u+=.08)g.lineTo(Math.sin(j+u*5-t)*u*size*.4+(j-4)*u*size*.1,-size*.1-u*size*1.7);g.strokeStyle=rgba(RED,.5);g.lineWidth=1;g.stroke();}g.restore();glow(g,cx,heroY,size*1.5,size*1.5,RED,.15);particleField(g,w,h,t,.6,false);
    }
    function progress(id,t){return clamp((t-timeline[id].start)/timeline[id].ms);}
    function fullTime(section){var s=timeline[section.id];return s.start+s.ms*section.p;}
    function start(next,nextSeed){profile=C.cutscenes.profile();presentationFactor=1;flashDone=false;flashAge=-1;if(scene)scene.dispose();scene=null;spec=next;seed=nextSeed||'';lastTime=0;plate=null;plateKey='';glows=Object.create(null);RED=next.color;RUBY=next.orbitColor;PALE=next.starColor;timeline=Object.create(null);var offset=0;next.sections.forEach(function(s){timeline[s.id]={start:offset,ms:s.ms/1000};offset+=s.ms/1000;});var random=randomFor('mythical-presentation:'+seed);motes=[];fragments=[];rings=[];for(var i=0;i<100;i++)motes.push({x:random(),y:random(),size:.6+random()*2.1,phase:random()*TAU});for(var j=0;j<64;j++)fragments.push({a:random()*TAU,r:.3+random()*.7,size:.005+random()*.018,spin:(random()-.5)*3});for(var k=0;k<26;k++)rings.push({a:k*TAU/26+.012,span:TAU/26*(.64+random()*.24)});stats.backend='canvas';}
    function paint(g,w,h,section,elapsed,still){
      var t=fullTime(section);lastTime=t;
      if(still!==null){releaseScene();backplate(g,w,h,0);var fade=Math.sin(Math.PI*clamp(still))*.25;glow(g,w/2,h/2,Math.min(w,h)*.17,Math.min(w,h)*.17,RED,fade);return;}
      var omenStart=timeline.omen.start,omenFade=timeline.omen.ms*.2;
      if(t<omenStart+omenFade){if(!scene)scene=C.mythicalScene.create(seed,spec);scene.setProfile(profile);scene.setPresentationFactor(presentationFactor);var image=scene.paint(w,h,Math.min(t,omenStart));stats.backend=scene.stats.backend;stats.sceneFrames=scene.stats.frames;stats.sceneDetail={rockVertices:scene.stats.rockVertices,hangingClusters:scene.stats.hangingClusters,detailSize:scene.stats.detailSize};if(image)g.drawImage(image,0,0,w,h);else canvasCave(g,w,h,t);if(t<omenStart){var top=progress('ascend',t);if(top>.55){g.save();g.globalAlpha=smooth((top-.55)/.45)*.42;g.translate(w/2,h/2);star(g,Math.min(w,h)*.15,t,top,0,0);g.restore();particleField(g,w,h,t,(top-.55)*.5,true);atmosphere(g,w,h,t,(top-.55)*.45);}return;}}
      if(t>=omenStart+omenFade&&scene){scene.dispose();scene=null;}
      g.save();if(t<omenStart+omenFade)g.globalAlpha*=smooth((t-omenStart)/omenFade);
      g.fillStyle=rgba(spec.background,1);g.fillRect(0,0,w,h);
      var omen=progress('omen',t),clock=progress('clock',t),rupture=progress('rupture',t),r=Math.min(w,h)*.37,explosionStart=timeline.explosion.start,fade=t>=explosionStart?1-smooth(progress('explosion',t)/.76):1;
      if(t>=timeline.release.start){backplate(g,w,h,0);g.restore();return;}
      atmosphere(g,w,h,t,.35+omen*.38+rupture*.4);particleField(g,w,h,t,.45+clock*.3,true);fire(g,w,h,t,smooth(clock*.38+rupture*.75));
      g.save();g.translate(w*.5,h*.5);g.globalAlpha*=fade;
      for(var ring=0;ring<3;ring++){var rr=r*(.78+ring*.12),turn=t*(ring%2?-.04:.025);for(var part=0;part<4;part++)arc(g,rr,part*TAU/4+turn+.09,part*TAU/4+turn+1.22,rgba(RED,smooth(omen/.5)*(.14+Math.sin(t*6*(profile==='safe'?presentationFactor:1)-ring)*(profile==='safe'?.018:.055))),1+ring*.5);}
      if(clock>0)dial(g,r,t,smooth(clock/.22),rupture,false);star(g,r*.58,t,omen,smooth(omen)*.78+rupture*.22,rupture);g.restore();
      if(clock>0)title(g,w,h,r,t,clock,clamp((clock-.18)/.6)+rupture*.3,rupture);
      if(rupture>0||t>=explosionStart){g.save();g.translate(w/2,h/2);var burst=t>=explosionStart?smooth(progress('explosion',t)):0;fragments.forEach(function(f,i){var a=f.a+t*(.09+rupture*1.4)*f.spin,rr=r*(f.r*(1-rupture*.5)+burst*2.2),size=r*f.size*(1-burst*.5);g.save();g.translate(Math.cos(a)*rr,Math.sin(a)*rr);g.rotate(a+t*f.spin);polygon(g,[[-size,0],[size*.6,-size*.5],[size*.9,size*.35],[0,size]]);g.fillStyle=rgba(i%3?RED:PALE,.12+rupture*.6);g.fill();g.restore();});g.restore();}
      if(t>=explosionStart){var p=progress('explosion',t);if(flashAge>=0&&p<flashAge)flashDone=true;flashAge=p;if(p>=1)flashDone=true;var flash=flashDone?0:(p<.18?smooth(p/.18):1-smooth((p-.18)/.82))*(profile==='safe'?.45:1);g.save();g.translate(w/2,h/2);arc(g,Math.min(w,h)*(.07+p*1.15),0,TAU,rgba(PALE,(1-p)*.7),Math.min(w,h)*.006*(1-p));g.restore();g.fillStyle='rgba(255,255,255,'+flash+')';g.fillRect(0,0,w,h);}
      g.restore();
    }
    function releaseScene(){if(scene){scene.dispose();scene=null;}}
    return {start:start,paint:paint,setProfile:function(value){profile=value;},setQuality:function(value){if(scene)scene.setQuality(value);},setPresentationFactor:function(value){presentationFactor=value;},backplate:backplate,releaseScene:releaseScene,stop:releaseScene,stats:stats,get scene(){return scene;},get time(){return lastTime;}};
  }};
})(window.Cardable, window);
