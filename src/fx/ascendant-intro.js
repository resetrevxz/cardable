(function (C, root) {
  'use strict';
  var M = C.cutsceneMath, TAU = Math.PI * 2, warmed = null;
  var PASTELS = [[255,159,178], [168,240,198], [169,204,255], [213,195,255], [255,210,176], [255,241,168]];
  function rgba(c, a) {
    if (C.config.rarityColorMode === 'mono') { var l = Math.round(c[0]*.213+c[1]*.715+c[2]*.072); c = [l,l,l]; }
    return 'rgba(' + c.join(',') + ',' + M.clamp(a) + ')';
  }
  function build(spec, serial) {
    return C.crystalSceneEngine.create(String(serial), Object.assign({}, spec, { qualityLevel: ['very-low','low','medium','high'].indexOf(C.settings.get('cinematicQuality')) }));
  }
  C.ascendantIntro = {
    warmup: function (spec, serial) {
      if(root.document.fonts)root.document.fonts.load('48px "Ascendant Bodoni"').catch(function(){});
      if (C.cutscenes.mode()==='light') {if(warmed)warmed.scene.dispose();warmed=null;return;}
      if (warmed && warmed.serial === serial) return;
      if (warmed) warmed.scene.dispose();
      warmed = { serial: serial, scene: build(spec, serial) };
      // Allocate targets and compile the same passes while the opaque foil covers the viewport.
      warmed.scene.paint(C.viewport.width, C.viewport.height, 4);
    },
    create: function () {
      var mist=null,mistKey='',cloudAtlas=null,cloudKey='',cloudBanks=[]; var scene = null, spec, serial = '', particles = [], sprites = Object.create(null), level = 2, time = 0;
      var pulseTimeFactor=1,pulseBeats=[],sparkBeats=[],spinFactors=[1,1],profile='safe';var timeline=null;function at(id){return timeline[id].start/1000;}function span(id){return timeline[id].ms/1000;}
      var stats = { backend: 'canvas' },titleCache=null,titleKey='',retainedTime=0,flashDone=false,flashLastAge=-1;
      function glow(g, x, y, rx, ry, c, alpha) {
        if (alpha <= 0) return;
        var key = C.config.rarityColorMode + c.join(',');
        if (!sprites[key]) {
          var s = root.document.createElement('canvas'); s.width = s.height = 128;
          var q = s.getContext('2d'), gradient = q.createRadialGradient(64,64,0,64,64,64);
          gradient.addColorStop(0,rgba(c,.9)); gradient.addColorStop(.09,rgba(c,.56));
          gradient.addColorStop(.32,rgba(c,.12)); gradient.addColorStop(1,rgba(c,0));
          q.fillStyle=gradient;q.fillRect(0,0,128,128);sprites[key]=s;
        }
        g.save();g.globalAlpha*=alpha;g.drawImage(sprites[key],x-rx,y-ry,rx*2,ry*2);g.restore();
      }
      function point(g, r, t, intensity) {
        g.save();g.rotate(t*.08);
        for(var arm=0;arm<6;arm++){
          g.save();g.rotate(arm*TAU/6);g.beginPath();g.moveTo(0,-r);g.quadraticCurveTo(r*.023,-r*.09,r*.06,0);g.quadraticCurveTo(r*.023,r*.07,0,r*.11);g.quadraticCurveTo(-r*.023,r*.07,-r*.06,0);g.quadraticCurveTo(-r*.023,-r*.09,0,-r);
          var grad=g.createLinearGradient(0,-r,0,0);grad.addColorStop(0,rgba(PASTELS[arm],0));grad.addColorStop(.64,rgba(PASTELS[arm],intensity*.3));grad.addColorStop(1,rgba([255,255,255],intensity));g.fillStyle=grad;g.fill();g.restore();
        }
        glow(g,0,0,r*.85,r*.85,[221,228,255],intensity*.55);
        glow(g,0,0,r*.12,r*.12,[255,255,255],intensity);
        g.restore();
      }
      function spark(g,w,h,t) {
        var r=Math.min(w,h)*.18,appear=M.smooth((t-1)/.5),pulse=0;
        sparkBeats.forEach(function(beat,index){
          var age=t-beat.ms/1000;if(age<0||age>.9)return;
          pulse+=Math.sin(M.clamp(age/.6)*Math.PI)*.015;
          for(var ring=0;ring<3;ring++){
            g.beginPath();g.arc(w*.5,h*.5,r*(.28+M.smooth(age/.9)*2.5)+ring*1.6,0,TAU);
            g.strokeStyle=rgba(PASTELS[ring*2],(1-M.clamp(age/.9))*.2);g.lineWidth=1;g.stroke();
          }
        });
        g.save();g.translate(w*.5,h*.5);var scale=1+pulse;g.scale(scale,scale);point(g,r,t,appear);g.restore();
        if(t>=3)glow(g,w*.5,h*.5,w*.6,h*.65,[212,224,248],M.smooth((t-3)/.5)*.11);
      }
      function cloudMaterial(){
        var key=serial+':'+C.config.rarityColorMode;if(cloudAtlas&&cloudKey===key)return cloudAtlas;cloudKey=key;
        var c=root.document.createElement('canvas');c.width=384;c.height=192;var q=c.getContext('2d'),pixels=q.createImageData(c.width,c.height),r=M.random('flight-cloud:'+serial),grid=new Float32Array(32*32);
        for(var i=0;i<grid.length;i++)grid[i]=r();
        function noise(x,y){var ix=Math.floor(x)&31,iy=Math.floor(y)&31,fx=M.smooth(x-Math.floor(x)),fy=M.smooth(y-Math.floor(y));return M.mix(M.mix(grid[iy*32+ix],grid[iy*32+((ix+1)&31)],fx),M.mix(grid[((iy+1)&31)*32+ix],grid[((iy+1)&31)*32+((ix+1)&31)],fx),fy);}
        for(var y=0;y<192;y++)for(var x=0;x<384;x++){
          var u=x/384,v=y/192,n=noise(u*7,v*5)*.6+noise(u*17,v*13)*.28+noise(u*31,v*27)*.12;
          var hull=Math.pow(Math.max(0,1-Math.pow((u-.5)*2,2)-Math.pow((v-.52)*2,2)),.55),alpha=M.smooth((n+hull*.34-.4)/.24)*hull;
          var light=M.clamp(.75-v*.53+n*.48),at=(y*384+x)*4,col=[M.mix(94,247,light),M.mix(112,250,light),M.mix(151,255,light)];
          if(C.config.rarityColorMode==='mono'){var gray=col[0]*.213+col[1]*.715+col[2]*.072;col=[gray,gray,gray];}
          for(var k=0;k<3;k++)pixels.data[at+k]=col[k];pixels.data[at+3]=Math.round(alpha*255);
        }
        q.putImageData(pixels,0,0);cloudAtlas=c;return c;
      }
      function skyFallback(g,w,h,t){
        var p=M.clamp(t/(spec.skyFlight.endMs/1000)),travel=spec.skyFlight.travel*Math.pow(p,2.7),sky=g.createLinearGradient(0,0,0,h);
        sky.addColorStop(0,rgba([97,133,188],1));sky.addColorStop(1,rgba([22,42,80],1));g.fillStyle=sky;g.fillRect(0,0,w,h);
        var sprite=cloudMaterial();g.save();g.translate(w*.5,h*.5);g.rotate(Math.sin(p*4.1)*.025*p*p);
        cloudBanks.forEach(function(bank){var z=bank.z-travel;if(z<.9)return;var scale=9/z,x=bank.x*w*.12*scale,y=bank.y*h*.14*scale;
          g.globalAlpha=M.smooth((z-1)/2)*.9;g.drawImage(sprite,x-w*.42*scale,y-h*.24*scale,w*.84*scale,h*.48*scale);
        });g.restore();
        var wash=M.smooth((p-.77)/.23)*.94;g.fillStyle=rgba([255,255,255],wash);g.fillRect(0,0,w,h);
      }
      function skyFlight(g,w,h,t){
        var image=scene&&scene.paint(w,h,t);if(image)g.drawImage(image,0,0,w,h);else skyFallback(g,w,h,t);
        // Retain the authored spark and its three local beats as the flight's guide.
        // It recedes into the cloud bank; it never exposes a card or creates a global flash.
        g.save();g.globalAlpha=1-M.smooth((t-2.5)/1.1);g.translate(w*.5,h*.5);g.scale(.52,.52);g.translate(-w*.5,-h*.5);if(t>=1)spark(g,w,h,t);g.restore();
        var veil=M.smooth((t-(spec.skyFlight.endMs/1000-1.7))/1.7);g.fillStyle=rgba([255,255,255],veil);g.fillRect(0,0,w,h);
        stats.backend=scene?scene.stats.backend:'canvas';stats.failure=scene&&scene.stats.failure||null;
      }
      // No ceiling, falling crystal or pool: the failure route follows the same cloud edit.
      function fallback(g,w,h,t) {
        var arrival=M.smooth((t-at('veil'))/span('veil'));
        skyFallback(g,w,h,t);g.fillStyle=rgba([5,6,10],arrival);g.fillRect(0,0,w,h);
        g.save();g.globalAlpha=arrival*.6;var material=mistMaterial();
        g.drawImage(material,-w*.1,h*.2,w*1.2,h*.7);g.restore();
      }
      function mistMaterial(){
        var key=C.config.rarityColorMode;if(mist&&mistKey===key)return mist;mistKey=key;
        var s=root.document.createElement('canvas');s.width=256;s.height=128;var q=s.getContext('2d'),image=q.createImageData(256,128),random=M.random('prismatic-floor-mist'),grid=new Float32Array(32*16);
        for(var i=0;i<grid.length;i++)grid[i]=random();
        function noise(x,y){var ix=Math.floor(x)%32,iy=Math.floor(y)%16,fx=M.smooth(x-Math.floor(x)),fy=M.smooth(y-Math.floor(y));return M.mix(M.mix(grid[iy*32+ix],grid[iy*32+(ix+1)%32],fx),M.mix(grid[((iy+1)%16)*32+ix],grid[((iy+1)%16)*32+(ix+1)%32],fx),fy);}
        for(var y=0;y<128;y++)for(var x=0;x<256;x++){var n=noise(x/16,y/16)*.6+noise(x/8,y/8)*.28+noise(x/4,y/4)*.12,at=(y*256+x)*4,edge=Math.sin(y/128*Math.PI);image.data[at]=210;image.data[at+1]=key==='mono'?210:220;image.data[at+2]=key==='mono'?210:240;image.data[at+3]=Math.pow(M.clamp((n-.3)/.5),2)*edge*52;}
        q.putImageData(image,0,0);mist=s;return mist;
      }
      function atmosphere(g,w,h,t) {
        var amount=M.smooth((t-at('veil'))/(span('veil')+span('ascend')));
        g.save();g.globalCompositeOperation='screen';
        var fog=mistMaterial();for(var layer=0;layer<3;layer++){g.save();g.globalAlpha=.28/(layer+1)*amount;
          var xx=Math.sin(t*(.035+layer*.018)+layer)*w*.06;
          g.drawImage(fog,xx-w*.1,h*(.18+layer*.22)+Math.sin(t*.09+layer)*h*.025,w*1.2,h*.35);g.restore();}
        var allowed=level===3?1:level===2?.5:.25;
        particles.forEach(function(p,i){if(i>=particles.length*allowed)return;
          var x=(p.x+Math.sin(t*.15+p.phase)*.007)*w,y=((p.y-t*.001+p.phase*.0001+2)%1)*h,a=(.08+.06*Math.sin(t*.5+p.phase))*amount;
          if(i%19===0)glow(g,x,y,12*p.z,12*p.z,PASTELS[i%6],a*.38);
          g.fillStyle=rgba(PASTELS[i%6],a);g.beginPath();g.arc(x,y,Math.max(.35,p.z*.7),0,TAU);g.fill();
        });g.restore();
      }
      function arc(g,r,a,b,color,width){g.beginPath();g.arc(0,0,r,a,b);g.strokeStyle=color;g.lineWidth=width;g.stroke();}
      function polygon(g,points){g.beginPath();points.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.closePath();}
      function frameHeight(w,h){return Math.min(h,w/2.39);}
      function dialRadius(w,h){return Math.min(Math.min(w,h)*spec.ritual.clockRadius,frameHeight(w,h)*.455);}
      function pulseRings(g,w,h,t){
        var radius=Math.min(Math.min(w,h)*spec.ritual.sigilRadius,frameHeight(w,h)*.23);
        pulseBeats.forEach(function(beat){if(beat.id!=='pulse')return;var age=t-beat.ms/1000;if(age<0||age>.7)return;
          for(var split=0;split<3;split++){g.save();g.translate(w*.5,h*.5);arc(g,radius*(1.2+M.smooth(age/.7)*1.45)+split*.65,0,TAU,rgba(PASTELS[split*2],(1-age/.7)*.17),.7);g.restore();}
        });
      }
      function ritualFallback(g,w,h,t){
        var radius=Math.min(Math.min(w,h)*spec.ritual.sigilRadius,frameHeight(w,h)*.23),morph=M.smooth((t-at('morph'))/span('morph')),titleAge=Math.max(0,t-at('title')),turn=TAU*M.starTurns(titleAge,span('title')+span('shatter'),spec.ritual.starMaxRps,spinFactors);
        g.save();var arrival=M.smooth((t-at('veil'))/(span('veil')+span('ascend')));g.globalAlpha=arrival;g.translate(w*.5,h*.5);g.rotate(turn);g.scale(M.mix(.28,1,arrival),M.mix(.28,1,arrival));
        var pulseAge=Math.max(0,t-at('topPulse')),cycles=(pulseAge*spec.ritual.pulseHzStart+pulseAge*pulseAge*(spec.ritual.pulseHzEnd-spec.ritual.pulseHzStart)/(2*span('topPulse')))*pulseTimeFactor,phase=cycles-Math.floor(cycles);
        var pulse=t<at('morph')&&t>=at('topPulse')?M.clamp(Math.exp(-phase*8)*Math.sin(phase*Math.PI*5)/.49):0;g.scale(1+pulse*.12,1+pulse*.12);
        for(var fringe=0;fringe<3;fringe++){g.save();g.translate((fringe-1)*1.1,0);g.beginPath();
          for(var edge=0;edge<=192;edge++){var a=edge*TAU/192,hex=.87/Math.cos(((a+Math.PI/6)%(Math.PI/3))-Math.PI/6),star=.54+.46*Math.pow(.5+.5*Math.cos(a*12),2.8),r;
            if(morph<1/3)r=M.mix(hex,.91,M.smooth(morph*3));else if(morph<2/3)r=M.mix(.91,star,M.smooth(morph*3-1));else r=star;
            if(edge)g.lineTo(Math.cos(a)*r*radius,Math.sin(a)*r*radius);else g.moveTo(Math.cos(a)*r*radius,Math.sin(a)*r*radius);}
          g.strokeStyle=rgba(fringe===1?[255,255,255]:PASTELS[fringe*2],.78);g.lineWidth=1;g.stroke();g.restore();}
        g.restore();g.save();g.translate(w*.5,h*.5);g.globalAlpha=M.smooth((morph-2/3)*3);arc(g,radius*1.35,0,TAU,rgba([255,255,255],.65),1);arc(g,radius*1.47,0,TAU,rgba(PASTELS[2],.35),1);
        g.beginPath();g.moveTo(-radius*.19,-radius*1.67);g.lineTo(0,-radius*1.87);g.lineTo(radius*.19,-radius*1.67);g.strokeStyle=rgba([255,255,255],.75);g.stroke();g.restore();
        g.save();g.translate(w*.5,h*.5);g.rotate((t-at('ascend'))*(.08+Math.max(0,t-at('ascend'))*.035));
        particles.slice(0,level===3?240:120).forEach(function(p,i){var a=p.phase,r=(.7+p.x*1.9)*radius;arc(g,r,a,a+.008+p.z*.018,rgba(PASTELS[i%6],.18),.6);});g.restore();
      }
      function titleMaterial(w,h){
        var loaded=root.document.fonts&&root.document.fonts.check('48px "Ascendant Bodoni"'),key=Math.round(w)+':'+Math.round(h)+':'+loaded+':'+C.config.rarityColorMode;
        if(titleCache&&titleKey===key)return titleCache;titleKey=key;
        var text='ASCENDANT',size=Math.min(64,w*.071,frameHeight(w,h)*.16),measure=root.document.createElement('canvas').getContext('2d');
        measure.font='500 '+size+'px "Ascendant Bodoni", Georgia, "Times New Roman", serif';
        var tracking=size*spec.ritual.titleTrackingEm,total=measure.measureText(text).width+tracking*(text.length-1);
        if(total>w*.86){size*=w*.86/total;tracking=size*spec.ritual.titleTrackingEm;measure.font='500 '+size+'px "Ascendant Bodoni", Georgia, "Times New Roman", serif';}
        var letters=[],cursor=0,padding=18;
        for(var i=0;i<text.length;i++){
          var width=measure.measureText(text[i]).width,images=[];
          [[255,255,255],PASTELS[0],PASTELS[2],PASTELS[1]].forEach(function(color){
            var c=root.document.createElement('canvas');c.width=Math.ceil(width+padding*2);c.height=Math.ceil(size*1.5+padding*2);var q=c.getContext('2d');q.font=measure.font;q.textBaseline='alphabetic';q.fillStyle=rgba(color,1);q.fillText(text[i],padding,padding+size);images.push(c);
          });
          letters.push({x:cursor,width:width,images:images});cursor+=width+tracking;
        }
        titleCache={letters:letters,width:cursor-tracking,size:size,padding:padding};return titleCache;
      }
      function title(g,w,h,t){
        var material=titleMaterial(w,h),cfg=spec.ritual,age=t-at('title'),r=dialRadius(w,h),left=w*.5-material.width*.5,baseline=h*.5+r*.59;
        material.letters.forEach(function(letter,index){
          var enter=M.smooth((age-index*cfg.titleStaggerMs/1000)/.85);if(enter<=0)return;
          var x=left+letter.x-material.padding,y=baseline-material.size-material.padding+(1-enter)*12,split=M.mix(cfg.titleSplitPx,1,enter),blur=(1-enter)*cfg.titleBlurPx;
          function letterPaint(){
            g.save();g.globalAlpha*=enter;if(blur>.1)g.filter='blur('+blur.toFixed(2)+'px)';
            g.globalAlpha*=.48;g.drawImage(letter.images[1],x-split,y);g.drawImage(letter.images[2],x+split,y);g.drawImage(letter.images[3],x,y+split*.22);g.globalAlpha/= .48;g.drawImage(letter.images[0],x,y);g.restore();
          }
          if(t<at('shatter')){letterPaint();return;}
          var breakage=M.clamp((t-at('shatter'))/span('shatter')),out=Math.sin(M.clamp(breakage/.55)*Math.PI*.5),converge=M.smooth((breakage-.4)/.6),cx=x+letter.images[0].width*.5,cy=y+letter.images[0].height*.5;
          var width=letter.images[0].width,height=letter.images[0].height;
          var facets=[[[x,y],[x+width,y],[x+width*.57,y+height*.45]],[[x,y],[x+width*.57,y+height*.45],[x,y+height]],[[x+width,y],[x+width,y+height],[x+width*.57,y+height*.45]],[[x,y+height],[x+width*.57,y+height*.45],[x+width,y+height]]];
          facets.forEach(function(points,facet){
            var angle=index*2.399+facet*1.57,drift=out*(12+facet*5)*(1-converge);
            g.save();g.translate(Math.cos(angle)*drift+(w*.5-cx)*converge,Math.sin(angle)*drift+(h*.5-cy)*converge);
            g.translate(cx,cy);g.rotate(Math.sin(angle)*out*.09);g.scale(1-converge*.92,1-converge*.92);g.translate(-cx,-cy);g.globalAlpha*=1-M.smooth((breakage-.82)/.18);
            C.cutsceneText.facet(g,points,letterPaint);g.restore();
          });
        });
      }
      function readouts(g,w,h,t){
        var age=t-at('title'),epoch=Math.floor(age*spec.ritual.sideUpdateHz),progress=M.clamp(age/2),radius=dialRadius(w,h),narrow=w/h<.8;
        var left='SPECTRUM '+Math.round(380+(750-380)*progress)+' > 750 NM',right='ALTITUDE '+String(Math.floor(999999*progress)).padStart(6,'0')+' > 999999';
        // Readout values and scrambling change at most twice per second, on the master timeline.
        var quantized=M.clamp(epoch/(2*spec.ritual.sideUpdateHz));
        left='SPECTRUM '+Math.round(380+370*quantized)+' > 750 NM';right='ALTITUDE '+String(Math.floor(999999*quantized)).padStart(6,'0')+' > 999999';
        g.save();g.font=(narrow?7:Math.max(8,Math.min(10,w*.008)))+'px '+(root.getComputedStyle(root.document.documentElement).getPropertyValue('--font-mono')||'monospace');g.textBaseline='middle';
        var alpha=.4*Math.pow(.5+.5*Math.cos(age*Math.PI*1.2),2)*M.smooth(age/.45)*(1-M.smooth((age-3)/1));
        [left,right].forEach(function(text,column){
          var x=narrow?(column?w*.73:w*.27):(column?w*.86:w*.14),y=h*.5+(narrow?-radius*.6:0);g.textAlign='center';
          var value=C.cutsceneText.scramble(text,M.clamp(epoch*.25),serial+':readout:'+column,epoch);g.fillStyle=rgba([255,255,255],alpha);g.fillText(value,x,y);
          ['TIER X','ASCENDANT','0.045 %'].forEach(function(line,i){g.fillStyle=rgba(PASTELS[(i+column)%6],alpha*.32);g.fillText(line,x,y+(i+1)*(narrow?9:13));});
        });g.restore();
      }
      function ritual(g,w,h,t,spatial){
        if(!spatial)ritualFallback(g,w,h,t);
        pulseRings(g,w,h,t);
        if(t>=at('clock')&&(!timeline.card||t<at('card'))){
          g.save();g.translate(w*.5,h*.5);
          C.cutsceneClock.draw(g,dialRadius(w,h),t-at('clock'),M.smooth((t-at('clock'))/.7),0,false,{prismatic:true,ascent:timeline.aurora?M.smooth((t-at('aurora'))/(spec.climax.riseMs/1000)):0,config:spec.clock,palette:spec.palette,rgba:rgba,arc:arc,polygon:polygon,beats:spec.beats,startMs:timeline.clock.start,font:root.getComputedStyle(root.document.documentElement).getPropertyValue('--font-mono')});g.restore();
        }
        if(t>=at('title')&&(!timeline.aurora||t<at('aurora'))){title(g,w,h,t);readouts(g,w,h,t);}
        if(t>=at('title')&&(!timeline.aurora||t<at('explosion'))){
          // Freeze the final split at S7, then dissolve it as the curtains brighten.
          // The spatial inversion never toggles or drops abruptly at the shot boundary.
          var splitTime=timeline.aurora?Math.min(t,at('aurora')):t;
          var pass=(splitTime-at('title'))/(spec.ritual.splitPassMs/1000),cycle=pass%2,pos=cycle<=1?cycle:2-cycle,x=M.mix(-w*.08,w*1.08,pos),soft=w*.075;
          g.save();g.globalAlpha=timeline.aurora?1-M.smooth((t-at('aurora'))/span('aurora')):1;g.globalCompositeOperation='difference';var mask=g.createLinearGradient(x-soft,0,x+soft,0);mask.addColorStop(0,'#fff');mask.addColorStop(1,'#000');g.fillStyle=mask;g.fillRect(0,0,w,h);g.restore();
        }
      }
      function curtainsFallback(g,w,h,t){
        var p=M.smooth((t-at('aurora'))/(spec.climax.riseMs/1000)),count=level===3?5:level===2?4:3;
        g.save();g.globalCompositeOperation='screen';
        for(var layer=0;layer<count;layer++){
          var height=h*M.mix(spec.climax.startHeight,spec.climax.endHeight,p),depth=1+layer*.18;
          for(var pleat=0;pleat<32;pleat++){
            var x=w*pleat/31+Math.sin(pleat*.4+t*.2+layer)*w*.009,y=h-height*(.88+.12*Math.sin(pleat*.29+layer));
            var sheet=g.createLinearGradient(0,y,0,h);sheet.addColorStop(0,rgba(PASTELS[(pleat+layer)%6],0));sheet.addColorStop(.12,rgba(PASTELS[(pleat+layer)%6],.11*p/depth));sheet.addColorStop(.7,rgba([255,255,255],.05*p/depth));sheet.addColorStop(1,rgba(PASTELS[(layer+2)%6],0));g.fillStyle=sheet;
            g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+Math.sin(t*.2+pleat)*14,y+height*.3,x-12,h-height*.15,x+2,h);g.lineTo(x+w*.018,h);g.bezierCurveTo(x+w*.018-12,h-height*.15,x+Math.sin(t*.2+pleat)*14+w*.018,y+height*.3,x+w*.018,y);g.closePath();g.fill();
          }
        }
        g.restore();
      }
      function explosion(g,w,h,t){
        var age=t-at('explosion'),cfg=spec.climax;if(age<0)return;
        var end=(cfg.flashRiseMs+cfg.flashDecayMs)/1000;
        if(flashLastAge>=0&&age<flashLastAge)flashDone=true;flashLastAge=age;
        if(age>=end){flashDone=true;return;}
        var p=M.clamp(age/(cfg.shockwaveMs/1000)),radius=Math.min(w,h)*(.12+(1-Math.pow(1-p,3))*1.55);
        g.save();g.translate(w*.5,h*.5);
        for(var fringe=0;fringe<3;fringe++)arc(g,radius+(fringe-1)*3,0,TAU,rgba(fringe===1?[255,255,255]:PASTELS[fringe*2],(1-p)*.55),Math.max(1,6*(1-p)));
        g.restore();glow(g,w*.5,h*.5,w*.85,h*.012,[255,255,255],Math.sin(p*Math.PI)*.65);
        // The only global flash envelope. A monotonic rise and smooth decay; never replay on seeking.
        if(!flashDone){var rise=cfg.flashRiseMs/1000,alpha=age<rise?M.smooth(age/rise):1-M.smooth((age-rise)/(cfg.flashDecayMs/1000));g.fillStyle=rgba([255,255,255],alpha*cfg.flashOpacity*(profile==='safe'?.55:1));g.fillRect(0,0,w,h);}
      }
      function climax(g,w,h,t,spatial){
        if(!spatial)curtainsFallback(g,w,h,t);
        var p=M.smooth((t-at('aurora'))/(spec.climax.riseMs/1000));
        g.save();g.globalCompositeOperation='screen';
        particles.forEach(function(part,i){if(i>=Math.ceil(particles.length*(level===3?.5:level===2?.25:.12)))return;
          var age=(t-at('aurora')+part.phase)%2.4,y=h*(1-age/2.4)*M.mix(1,.9,p),x=w*(part.x+Math.sin(t*.4+part.phase)*.015)*(1-p*.1)+w*.05*p;
          g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.sin(part.phase)*2,y+6*part.z);g.strokeStyle=rgba(PASTELS[i%6],p*.28*(1-age/2.4));g.lineWidth=.75;g.stroke();
        });g.restore();
        // The finale resolves into the very renderer that will remain behind the mounted card.
        g.save();g.globalAlpha=M.smooth((t-at('aurora'))/span('aurora'))*.65;C.ascendantBackground.draw(g,w,h,t,serial);g.restore();
        if(t>=at('explosion')){
          var progress=M.smooth((t-at('explosion'))/span('explosion'));g.save();g.globalAlpha=progress;C.ascendantBackground.draw(g,w,h,t,serial);g.restore();explosion(g,w,h,t);
        }
      }
      function light(g,w,h,progress){
        releaseScene();var ms=progress*spec.light.ms;
        g.fillStyle='#05060a';g.fillRect(0,0,w,h);
        var radius=Math.min(Math.min(w,h)*.12,frameHeight(w,h)*.2),pointAlpha=M.smooth((ms-350)/650)*(1-M.smooth((ms-1100)/650)),sigilAlpha=M.smooth((ms-850)/850);
        g.save();g.translate(w*.5,h*.5);point(g,radius*.45,0,pointAlpha*.6);g.globalAlpha=sigilAlpha;
        var scale=C.motion.reduced?1:M.mix(.25,1,M.smooth((ms-850)/850));g.scale(scale,scale);
        for(var split=0;split<3;split++){
          g.save();g.translate((split-1)*.8,0);g.beginPath();for(var i=0;i<=24;i++){var a=i*TAU/24,r=radius*(i%2?.56:1);if(i)g.lineTo(Math.cos(a)*r,Math.sin(a)*r);else g.moveTo(Math.cos(a)*r,Math.sin(a)*r);}g.strokeStyle=rgba(split===1?[255,255,255]:PASTELS[split*2],split===1?.66:.18);g.lineWidth=.8;g.stroke();g.restore();
        }
        arc(g,radius*1.35,0,TAU,rgba([255,255,255],.45),.7);arc(g,radius*1.47,0,TAU,rgba(PASTELS[2],.25),.7);g.beginPath();g.moveTo(-radius*.16,-radius*1.64);g.lineTo(0,-radius*1.8);g.lineTo(radius*.16,-radius*1.64);g.strokeStyle=rgba([255,255,255],.45);g.stroke();g.restore();
        if(ms>=1400){var material=titleMaterial(w,h);g.save();g.globalAlpha=M.smooth((ms-1400)/600);material.letters.forEach(function(letter){g.drawImage(letter.images[0],w*.5-material.width*.5+letter.x-material.padding,h*.5+radius*1.2-material.padding);});g.restore();}
        var fieldTime=Math.max(0,ms-2100)/1000;g.save();g.globalAlpha=M.smooth((ms-2100)/(spec.light.handoffMs-2100));C.ascendantBackground.draw(g,w,h,fieldTime,serial);g.restore();retainedTime=fieldTime;C.ascendantBackground.setTime(serial,fieldTime);
      }
      function handoff(lightMode){
        releaseScene();retainedTime=lightMode?Math.max((spec.light.handoffMs-2100)/1000,retainedTime):at('card');var offset=lightMode?0:Math.max(0,(time-at('card'))*1000);
        C.ascendantBackground.setTime(serial,retainedTime+offset/1000);C.ascendantBackground.setBorder(serial,lightMode?1:M.smooth(offset/spec.cardScene.borderMs));return offset;
      }
      function cardFrame(age,lightMode){
        var duration=lightMode?spec.light.ms-spec.light.handoffMs:spec.cardScene.ms,progress=M.smooth(age/duration),time=retainedTime+(lightMode?0:age/1000);
        C.ascendantBackground.setTime(serial,time);C.ascendantBackground.setBorder(serial,lightMode?1:M.smooth(age/spec.cardScene.borderMs));
        return {progress:progress,scale:lightMode?1:M.mix(spec.cardScene.scaleFrom,1,progress),opacity:lightMode?1:M.smooth(age/160),done:age>=duration};
      }
      function start(next, seed, quiet) {
        profile=C.cutscenes.profile();
        releaseScene();spec=next;pulseBeats=spec.beats.filter(function(b){return b.id==='pulse';});pulseTimeFactor=1;timeline=C.cutscenes.timeline(next).sections;sparkBeats=spec.beats.filter(function(b){return /^spark[123]$/.test(b.id);});serial=String(seed);time=0;retainedTime=0;flashDone=false;flashLastAge=-1;titleCache=null;level=['very-low','low','medium','high'].indexOf(C.settings.get('cinematicQuality'));
        var random=M.random('prismatic-dawn:'+serial);particles=[];
        for(var i=0;i<360;i++)particles.push({x:random(),y:random(),z:.4+random()*1.5,phase:random()*TAU});
        var bankRandom=M.random('flight-banks:'+serial);cloudBanks=[];cloudAtlas=null;cloudKey='';
        for(var bank=0;bank<28;bank++)cloudBanks.push({x:(bank%2?-1:1)*(.8+bankRandom()*3.5),y:(bankRandom()-.5)*4,z:10+bank*.9});
        cloudBanks.sort(function(a,b){return b.z-a.z;});
        if(!quiet&&!C.motion.reduced&&C.settings.policy.animation&&level>0){scene=warmed&&warmed.serial===serial?warmed.scene:build(spec,serial);if(warmed&&warmed.scene!==scene)warmed.scene.dispose();warmed=null;}
        if(scene)scene.setProfile(profile);stats.backend=scene?scene.stats.backend:'canvas';stats.failure=scene&&scene.stats.failure||null;
      }
      function paint(g,w,h,section,elapsed,staticProgress) {
        var offset=0;for(var i=0;i<spec.sections.length;i++){if(spec.sections[i].id===section.id)break;offset+=spec.sections[i].ms;}
        time=(offset+section.p*spec.sections[i].ms)/1000;
        g.fillStyle='#05060a';g.fillRect(0,0,w,h);
        if(staticProgress!=null){light(g,w,h,staticProgress);return;}
        if(time<at('veil')){skyFlight(g,w,h,time);return;}
        if(timeline.card&&time>=at('card')){C.ascendantBackground.draw(g,w,h,time,serial);retainedTime=time;C.ascendantBackground.setTime(serial,time);explosion(g,w,h,time);return;}
        if(section.id==='release'){C.ascendantBackground.draw(g,w,h,retainedTime,serial);return;}
        var spatial=scene&&scene.paint(w,h,time);
        if(spatial){var kick=0;if(spec.ritual&&time>=at('topPulse')&&time<at('morph'))pulseBeats.forEach(function(beat){if(beat.id!=='pulse')return;var age=time-beat.ms/1000;if(age>=0&&age<.22)kick+=Math.sin(age/.22*Math.PI)*.8;});g.drawImage(spatial,Math.sin(time*.45)*.3,Math.cos(time*.39)*.3-kick,w,h);}else fallback(g,w,h,time);
        atmosphere(g,w,h,time);
        if(spec.ritual&&time>=at('veil'))ritual(g,w,h,time,spatial);
        // One slow immersion holds white across the cut and uncovers the centered sigil.
        // This is the arrival transition; only the existing finale owns a flash envelope.
        if(time<at('veil')+span('veil')){var cover=1-M.smooth((time-at('veil'))/span('veil'));g.fillStyle=rgba([255,255,255],cover);g.fillRect(0,0,w,h);}
        if(timeline.aurora&&time>=at('aurora'))climax(g,w,h,time,spatial);
        if(scene)scene.setProfile(profile);stats.backend=scene?scene.stats.backend:'canvas';stats.failure=scene&&scene.stats.failure||null;
      }
      function releaseScene(){if(scene)scene.dispose();scene=null;}
      return {start:start,paint:paint,stop:releaseScene,releaseScene:releaseScene,handoff:handoff,cardFrame:cardFrame,
        setProfile:function(value){profile=value;if(scene)scene.setProfile(value);},
        setPulseFactor:function(value,beats){pulseTimeFactor=value;pulseBeats=beats;if(scene)scene.setPulseFactor(value);},
        setSparkBeats:function(beats){sparkBeats=beats;},
        setSpinFactors:function(value){spinFactors=value;if(scene)scene.setSpinFactors(value);},
        paintRelease:function(g,w,h,age,quiet){var t=retainedTime+(quiet?0:age/1000);C.ascendantBackground.draw(g,w,h,t,serial);if(!quiet)explosion(g,w,h,t);},
        setQuality:function(next){level=next;if(scene)scene.setQuality(next);},
        backplate:function(g,w,h,t){var continuous=retainedTime+t;C.ascendantBackground.setTime(serial,continuous);C.ascendantBackground.draw(g,w,h,continuous,serial);},
        get scene(){return scene;},stats:stats};
    }
  };
  C.cutscenes.register('prismatic', C.ascendantIntro.create);
  C.cutscenes.register('ascendant', C.ascendantIntro.create);
})(window.Cardable, window);
