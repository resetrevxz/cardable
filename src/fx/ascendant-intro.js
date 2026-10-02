(function (C, root) {
  'use strict';
  var M = C.cutsceneMath, TAU = Math.PI * 2, warmed = null;
  var PASTELS = [[255,159,178], [168,240,198], [169,204,255], [213,195,255], [255,210,176], [255,241,168]];
  function rgba(c, a) {
    if (C.config.rarityColorMode === 'mono') { var l = Math.round(c[0]*.213+c[1]*.715+c[2]*.072); c = [l,l,l]; }
    return 'rgba(' + c.join(',') + ',' + M.clamp(a) + ')';
  }
  function build(spec, serial) {
    return C.crystalSceneEngine.create(String(serial), Object.assign({}, spec, { qualityLevel: ['very-low','low','medium','high'].indexOf(C.settings.get('quality')) }));
  }
  C.ascendantIntro = {
    warmup: function (spec, serial) {
      if (C.motion.reduced || C.settings.get('quality') === 'very-low' || !C.settings.policy.animation) return;
      if (warmed && warmed.serial === serial) return;
      if (warmed) warmed.scene.dispose();
      warmed = { serial: serial, scene: build(spec, serial) };
      // Allocate targets and compile the same passes while the opaque foil covers the viewport.
      warmed.scene.paint(root.innerWidth, root.innerHeight, 4);
    },
    create: function () {
      var mist=null,mistKey=''; var scene = null, spec, serial = '', particles = [], sprites = Object.create(null), level = 2, time = 0;
      var stats = { backend: 'canvas' };
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
        [1.6,2.4,3].forEach(function(at,index){
          var age=t-at;if(age<0||age>.9)return;
          pulse+=Math.sin(M.clamp(age/.6)*Math.PI)*.015;
          for(var ring=0;ring<3;ring++){
            g.beginPath();g.arc(w*.5,h*.5,r*(.28+M.smooth(age/.9)*2.5)+ring*1.6,0,TAU);
            g.strokeStyle=rgba(PASTELS[ring*2],(1-M.clamp(age/.9))*.2);g.lineWidth=1;g.stroke();
          }
        });
        g.save();g.translate(w*.5,h*.5);var scale=1+pulse;g.scale(scale,scale);point(g,r,t,appear);g.restore();
        if(t>=3)glow(g,w*.5,h*.5,w*.6,h*.65,[212,224,248],M.smooth((t-3)/.5)*.11);
      }
      // Procedural fallback keeps the same spatial narrative when WebGL is unavailable.
      function fallback(g,w,h,t) {
        var under=t>=10.6,random=M.random('fallback:'+serial),cx=w*.5;
        var sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,under?'#8995ab':'#05060a');sky.addColorStop(1,'#0b0f24');g.fillStyle=sky;g.fillRect(0,0,w,h);
        if(!under){
          for(var i=0;i<60;i++){
            var x=random()*w,depth=.35+random()*.65,y=random()*h*.16,length=h*(.08+random()*.29)*depth,width=length*.17;
            g.beginPath();g.moveTo(x-width,y);g.lineTo(x+width,y);g.lineTo(x+width*.75,y+length*.7);g.lineTo(x,y+length);g.lineTo(x-width*.75,y+length*.7);g.closePath();
            var facet=g.createLinearGradient(x-width,y,x+width,y);facet.addColorStop(0,rgba(PASTELS[i%6],.14*depth));facet.addColorStop(.5,'rgba(228,234,248,.55)');facet.addColorStop(1,rgba(PASTELS[(i+2)%6],.1));g.fillStyle=facet;g.fill();
          }
          g.fillStyle='#18202b';g.fillRect(0,h*.78,w,h*.22);
        }
        var fall=M.clamp((t-9.2)/.8),y=under?h*.42:M.mix(h*.31,h*.76,fall*fall),angle=t<9.2?M.smooth((t-8)/.8)*7*Math.PI/180:7*Math.PI/180+fall*.63;
        g.save();g.translate(cx,y);g.rotate(angle);g.beginPath();g.moveTo(0,-h*.09);g.lineTo(h*.026,-h*.06);g.lineTo(h*.026,h*.055);g.lineTo(0,h*.09);g.lineTo(-h*.026,h*.055);g.lineTo(-h*.026,-h*.06);g.closePath();g.fillStyle=rgba([213,229,255],.85);g.fill();g.strokeStyle=rgba(PASTELS[0],.55);g.lineWidth=1;g.stroke();g.restore();
        glow(g,cx,y,h*.16,h*.16,[216,228,255],.32);
        if(under){for(var i=0;i<10;i++){g.beginPath();var a=i*TAU/10;for(var j=0;j<28;j++){var u=j/28,x=cx+Math.cos(a)*u*u*h*.2+Math.sin(u*6-t+i)*u*12,yy=y+u*h*.21*M.smooth((t-12.5)/.8);if(j)g.lineTo(x,yy);else g.moveTo(x,yy);}g.strokeStyle=rgba(PASTELS[i%6],.45);g.lineWidth=1.3;g.stroke();}}
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
        var amount=t<5.5?M.smooth((t-4)/1.5):1;
        g.save();g.globalCompositeOperation='screen';
        var fog=mistMaterial();for(var layer=0;layer<3;layer++){g.save();g.globalAlpha=.4/(layer+1);var xx=Math.sin(t*(.035+layer*.018)+layer)*w*.06;g.drawImage(fog,xx-w*.1,h*(t<10.6?.68:.72)+Math.sin(t*.09+layer)*h*.025,w*1.2,h*.3);g.restore();}
        // Shafts begin at the keystone. They stay translucent and leave clear dark pockets.
        if(t<10.6){
          var sx=w*.5,sy=h*.22;
          for(var i=0;i<5;i++){g.beginPath();g.moveTo(sx,sy);g.lineTo(w*(.06+i*.21)+Math.sin(t*.15+i)*20,h*.92);g.lineTo(w*(.11+i*.21)+Math.sin(t*.15+i)*20,h*.92);g.closePath();var ray=g.createLinearGradient(sx,sy,sx,h);ray.addColorStop(0,rgba(PASTELS[i],.045*amount));ray.addColorStop(1,rgba(PASTELS[i],0));g.fillStyle=ray;g.fill();}
        }else{
          var water=g.createLinearGradient(0,h*.08,0,h);water.addColorStop(0,rgba([233,239,255],.15));water.addColorStop(.22,rgba([173,201,255],.025));water.addColorStop(1,rgba([11,15,36],0));g.fillStyle=water;g.fillRect(0,0,w,h);
        }
        var allowed=level===3?1:level===2?.5:.25;
        particles.forEach(function(p,i){if(i>=particles.length*allowed)return;var x=(p.x+Math.sin(t*.15+p.phase)*.007)*w,y=((p.y-t*.001+p.phase*.0001+2)%1)*h,a=(.08+.06*Math.sin(t*.5+p.phase))*amount;
          if(i%19===0)glow(g,x,y,12*p.z,12*p.z,PASTELS[i%6],a*.38);
          g.fillStyle=rgba(PASTELS[i%6],a);g.beginPath();g.arc(x,y,Math.max(.35,p.z*.7),0,TAU);g.fill();
        });
        g.restore();
      }
      function start(next, seed, quiet) {
        releaseScene();spec=next;serial=String(seed);time=0;level=['very-low','low','medium','high'].indexOf(C.settings.get('quality'));
        var random=M.random('prismatic-dawn:'+serial);particles=[];
        for(var i=0;i<360;i++)particles.push({x:random(),y:random(),z:.4+random()*1.5,phase:random()*TAU});
        if(!quiet&&!C.motion.reduced&&C.settings.policy.animation&&level>0){scene=warmed&&warmed.serial===serial?warmed.scene:build(spec,serial);if(warmed&&warmed.scene!==scene)warmed.scene.dispose();warmed=null;}
        stats.backend=scene?scene.stats.backend:'canvas';stats.failure=scene&&scene.stats.failure||null;
      }
      function paint(g,w,h,section,elapsed,staticProgress) {
        var offset=0;for(var i=0;i<spec.sections.length;i++){if(spec.sections[i].id===section.id)break;offset+=spec.sections[i].ms;}
        time=(offset+section.p*spec.sections[i].ms)/1000;
        g.fillStyle='#05060a';g.fillRect(0,0,w,h);
        if(staticProgress!=null){releaseScene();g.save();g.translate(w*.5,h*.5);point(g,Math.min(w,h)*.12,0,Math.sin(staticProgress*Math.PI)*.6);g.restore();return;}
        if(time<4){if(time<1){g.fillStyle=rgba([11,15,36],M.smooth(time/.8)*.45);g.fillRect(0,0,w,h);}if(time>=1)spark(g,w,h,time);return;}
        if(section.id==='release'){C.ascendantBackground.draw(g,w,h,0,serial);return;}
        var spatial=scene&&scene.paint(w,h,time);
        if(spatial){g.drawImage(spatial,0,0,w,h);if(time>=10.6&&time<10.82){g.save();g.globalAlpha=.055*(1-(time-10.6)/.22);g.drawImage(spatial,-w*.016,0,w,h);g.drawImage(spatial,w*.016,0,w,h);g.restore();}}else fallback(g,w,h,time);
        atmosphere(g,w,h,time);
        if(time<5.5){var k=M.smooth((time-4)/1.5),anchor=scene&&scene.anchor||[.5,.3],x=M.mix(w*.5,anchor[0]*w,k),y=M.mix(h*.5,anchor[1]*h,k);g.save();g.translate(x,y);point(g,Math.min(w,h)*M.mix(.16,.025,k),time,1-M.smooth((time-5.1)/.4));g.restore();}
        if(time<4.5){var cover=1-M.smooth((time-4)/.5);g.fillStyle=rgba([5,6,10],cover);g.fillRect(0,0,w,h);glow(g,w*.5,h*.5,w*.42,h*.52,[224,232,248],cover*.1);}
        // A ends gently after the side shot. The ritual and single climax belong to B/C.
        if(time>14.65){g.save();g.globalAlpha=M.smooth((time-14.65)/.35);C.ascendantBackground.draw(g,w,h,0,serial);g.restore();}
        stats.backend=scene?scene.stats.backend:'canvas';stats.failure=scene&&scene.stats.failure||null;
      }
      function releaseScene(){if(scene)scene.dispose();scene=null;}
      return {start:start,paint:paint,stop:releaseScene,releaseScene:releaseScene,
        setQuality:function(next){level=next;if(scene)scene.setQuality(next);},
        backplate:function(g,w,h,t){C.ascendantBackground.draw(g,w,h,t,serial);},
        get scene(){return scene;},stats:stats};
    }
  };
  C.cutscenes.register('prismatic', C.ascendantIntro.create);
  C.cutscenes.register('ascendant', C.ascendantIntro.create);
})(window.Cardable, window);
