(function(C,root){
  'use strict';
  var M=C.cutsceneMath;
  // All poses are in a 640x360 logical desktop. The actual buffer remains tier bounded.
  C.secretOSScene={create:function(spec,seed,canvas){
    var cfg=spec.os,p=cfg.palette,random=M.random('northstar:'+seed),q=canvas.getContext('2d',{alpha:false});
    var mask=root.document.createElement('canvas'),mq=mask.getContext('2d');
    var trailMask=root.document.createElement('canvas'),trailQ=trailMask.getContext('2d');
    var feedback=root.document.createElement('canvas'),fq=feedback.getContext('2d',{alpha:false});
    var fresh=root.document.createElement('canvas'),freshQ=fresh.getContext('2d');
    var glass=root.document.createElement('canvas'),gq=glass.getContext('2d',{alpha:false});
    var desktopEnd=root.document.createElement('canvas'),eq=desktopEnd.getContext('2d',{alpha:false});
    var frozen=root.document.createElement('canvas'),freezeQ=frozen.getContext('2d',{alpha:false});
    var dying=root.document.createElement('canvas'),dyingQ=dying.getContext('2d',{alpha:false}),holds=[],freezeAt=0;
    var collapseRandom=M.random('northstar-collapse:'+seed),tiles=[],noise=root.document.createElement('canvas');noise.width=noise.height=32;
    var nq=noise.getContext('2d');for(var ny=0;ny<32;ny++)for(var nx=0;nx<32;nx++){var gray=42+Math.floor(collapseRandom()*40);nq.fillStyle='rgb('+gray+','+gray+','+gray+')';nq.fillRect(nx,ny,1,1);}
    while(freezeAt<spec.collapse.compressMs){holds.push(freezeAt);freezeAt+=spec.collapse.holdMinMs+collapseRandom()*(spec.collapse.holdMaxMs-spec.collapse.holdMinMs);}
    for(var ti=0;ti<48;ti++)tiles.push({x:ti%8*80,y:Math.floor(ti/8)*60,phase:collapseRandom()*6.28,offset:collapseRandom()*.8});
    var plan=[],windows=[],births=[],beats=[],last=-1,previous=null,scale=1,level=2,profile='safe',presentation=0;
    var fullBurst=null,burstArmed=true,calmUntil=-Infinity,burstTotal=0,lastTheme=-1,lastReboot=-1;
    var icons=cfg.icons.map(function(name,i){return {name:name,x:48+Math.floor(random()*7),y:38+i*69+Math.floor(random()*5),phase:random()*6.28};});
    var hex=[];for(var row=0;row<48;row++){var bytes=[];for(var col=0;col<24;col++)bytes.push(Math.floor(random()*256).toString(16).padStart(2,'0').toUpperCase());hex.push(bytes);}
    var order=cfg.dialogs.map(function(_,i){return i;});
    for(var i=order.length-1;i>1;i--){var j=1+Math.floor(random()*i),swap=order[i];order[i]=order[j];order[j]=swap;}
    var errorIndex=0;
    function dialog(ms){
      var index=errorIndex++,message=cfg.dialogs[order[index%order.length]],w=250+Math.floor(random()*32),h=Math.max(104,80+Math.ceil(message.length/30)*14);
      plan.push({id:'error:'+index,kind:'error',text:message,title:index===0?'SECRET.DAT':'NorthStar error',symbol:['!','X','?','i'][index%4],
        x:index===0?192:8+Math.floor(random()*(618-w)),y:index===0?98:13+Math.floor(random()*(310-h)),w:w,h:h,ms:ms,
        phase:random()*6.28,code:Math.floor(random()*65536).toString(16).toUpperCase().padStart(4,'0'),hung:index===0||index%7===3});
    }
    cfg.desktop.waves.forEach(function(wave){for(var n=0;n<wave.count;n++)dialog(wave.ms);});
    while(errorIndex<cfg.desktop.dialogCount)dialog(cfg.desktop.tailMs+(errorIndex-15)*cfg.desktop.tailStepMs);
    [
      {id:'tasks',kind:'tasks',title:'Task Manager',x:352,y:38,w:269,h:210,ms:4100},
      {id:'files',kind:'files',title:'File Explorer',x:25,y:61,w:257,h:233,ms:5100},
      {id:'defrag',kind:'defrag',title:'Allocation map',x:12,y:226,w:175,h:100,ms:5750},
      {id:'clipboard',kind:'clipboard',title:'Clipboard',x:415,y:240,w:170,h:84,ms:6350}
    ].forEach(function(window){window.phase=random()*6.28;plan.push(window);});
    plan.sort(function(a,b){return a.ms-b.ms;});
    var model={windows:windows,icons:icons,cursor:{x:330,y:188,shape:'arrow'},seed:String(seed),beats:beats,section:'desktop',newWindowsPerSecond:0,theme:0};
    function px(v){return Math.round(v*scale)/scale;}
    function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(px(x),px(y),px(w),px(h));}
    function text(g,value,x,y,color,size){g.fillStyle=color||'#111318';g.font=Math.max(6,Math.round((size||11)*scale))/scale+'px "JetBrains Mono",monospace';g.textBaseline='top';g.fillText(value,px(x),px(y));}
    function clip(g,x,y,w,h){g.beginPath();g.rect(px(x),px(y),px(w),px(h));g.clip();}
    function bevel(g,x,y,w,h,down){rect(g,x,y,w,h,down?'#6d7177':'#eeeeef');rect(g,x+1,y+1,w-1,h-1,down?'#eeeeef':'#54575c');rect(g,x+1,y+1,w-2,h-2,p.face);}
    function line(g,x,y,xx,yy,color,width){g.beginPath();g.moveTo(px(x),px(y));g.lineTo(px(xx),px(yy));g.strokeStyle=color;g.lineWidth=(width||1)/scale;g.stroke();}
    function button(g,label,x,y,w,pressed){bevel(g,x,y,w,18,pressed);text(g,label,x+(w-label.length*6)/2+(pressed?1:0),y+4+(pressed?1:0),'#18191c',10);}
    function wrap(g,message,x,y,w,size,height){size=size||11;height=height||14;text(g,'',x,y,null,size);var words=message.split(' '),row='',at=y;words.forEach(function(word){var next=row?row+' '+word:word;if(g.measureText(next).width>w&&row){text(g,row,x,at,null,size);at+=height;row=word;}else row=next;});if(row)text(g,row,x,at,null,size);}
    function emit(id,key,story){if(!beats.some(function(b){return b.key===key;}))beats.push({id:id,key:key,ms:story});}
    function resize(){
      var changed=mask.width!==canvas.width||mask.height!==canvas.height;
      scale=canvas.width/640;
      if(changed){
        // Scale retained feedback instead of replacing a dense desktop when quality adapts.
        var copy=root.document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(feedback,0,0,copy.width,copy.height);
        var oldMask=root.document.createElement('canvas');oldMask.width=canvas.width;oldMask.height=canvas.height;oldMask.getContext('2d').drawImage(trailMask,0,0,oldMask.width,oldMask.height);
        var hadMask=trailMask.width>1&&trailMask.dataset.ready;
        [mask,trailMask,feedback,fresh,glass,desktopEnd,frozen,dying].forEach(function(c){c.width=canvas.width;c.height=canvas.height;});fq.drawImage(copy,0,0);
        if(hadMask)trailQ.drawImage(oldMask,0,0);else{trailQ.fillStyle='#fff';trailQ.fillRect(0,0,trailMask.width,trailMask.height);}trailMask.dataset.ready='1';
        previous=null;glass.dataset.ready='';desktopEnd.dataset.ready='';frozen.dataset.ready='';
      }
      [q,mq,trailQ,fq,gq,eq].forEach(function(g){g.setTransform(scale,0,0,scale,0,0);g.imageSmoothingEnabled=false;});
    }
    function burst(requested){
      if(profile!=='full')return false;
      if(!requested)burstArmed=true;
      if(fullBurst!==null&&(!requested||presentation-fullBurst>=500)){burstTotal+=Math.min(500,presentation-fullBurst);fullBurst=null;calmUntil=presentation+1500;}
      if(requested&&burstArmed&&fullBurst===null&&presentation>=calmUntil&&burstTotal<8000){fullBurst=presentation;burstArmed=false;}
      return fullBurst!==null;
    }
    function advance(age,story){
      births=births.filter(function(t){return presentation-t<1000;});
      // Births use the presentation clock, so Fast, slow playback and dev scrubbing cannot
      // turn the Safe avalanche into more than twelve new windows per wall-clock second.
      plan.forEach(function(window){
        if(window.born!==undefined||window.ms>age)return;
        if(profile==='safe'&&births.length>=cfg.desktop.safeWindowsPerSecond)return;
        window.born=presentation;births.push(presentation);windows.push(window);
        if(window.kind==='error')emit('error',window.id,story);
      });
      model.newWindowsPerSecond=births.length;
    }
    function icon(g,icon,x,y,age,alpha){
      g.save();g.globalAlpha*=alpha;
      var s=cfg.icons.indexOf(icon.name),cx=x-11,cy=y-12;
      if(s===0){rect(g,cx,cy+3,24,18,'#142945');rect(g,cx+3,cy,18,21,'#d5e1e4');rect(g,cx+6,cy+4,11,2,p.bar);rect(g,cx+6,cy+9,8,1,'#536f79');}
      if(s===1){rect(g,cx,cy,22,25,'#97abb2');rect(g,cx+2,cy+2,18,20,p.bar);line(g,cx+3,cy+4,cx+19,cy+4,'#e2edef');text(g,'P',cx+8,cy+8,'#e9eeef',10);}
      if(s===2){rect(g,cx+3,cy+5,18,21,'#aabfc0');rect(g,cx+1,cy+3,22,3,'#e0eeee');for(var n=0;n<3;n++)rect(g,cx+7+n*4,cy+9,1,12,'#456f78');}
      if(s===3){rect(g,cx+3,cy,18,23,'#c9d6d9');rect(g,cx+14,cy,7,7,p.desktop);line(g,cx+14,cy,cx+14,cy+7,'#e1f3f2');text(g,'?',cx+8,cy+8,p.bar,12);g.globalAlpha*=.09+.04*Math.sin(age*2);rect(g,cx-5,cy-5,34,33,'#d0eceb');}
      g.restore();text(g,icon.name,x-icon.name.length*3,y+18,'#eef4f4',10);
    }
    function background(age,breakdown){
      rect(q,0,0,640,360,p.desktop);for(var yy=8;yy<340;yy+=16)for(var xx=8;xx<640;xx+=16)rect(q,xx,yy,1,1,'rgba(255,255,255,.075)');
      icons.forEach(function(item,i){var fall=breakdown?Math.max(0,(age-9)*1.7-i*.3):0,x=item.x,y=item.y;
        if(fall){var drop=Math.min(1,fall);y=Math.min(313-i*4,y+fall*fall*130);x+=Math.sin(item.phase)*drop*42;}icon(q,item,x,y,age,1);});
      bevel(q,0,336,640,24,false);button(q,'NorthStar',4,339,80,false);rect(q,93,341,192,15,'#b7b9bd');text(q,age<2?'Desktop':'SECRET.DAT',101,344,'#34353b',10);
      bevel(q,568,340,68,17,true);text(q,breakdown?cfg.years[Math.min(4,Math.floor((age-9)*1000/cfg.breakdown.themeMs))]:'00:00',582,344,'#26272b',10);
    }
    function pose(window,age){
      var hung=window.hung&&age*1000>=cfg.desktop.hangMs;
      if(!hung)return {x:window.x,y:window.y,hung:false};
      var t=Math.max(0,age-cfg.desktop.dragMs/1000),i=Number(window.id.split(':')[1])||0;
      var x=window.x+Math.sin(t*(i?1.7:1.25)+window.phase)*Math.min(146,t*72),y=window.y+Math.cos(t*1.33+window.phase)*Math.min(70,t*35);
      return {x:Math.round(Math.max(-30,Math.min(628-window.w,x))),y:Math.round(Math.max(8,Math.min(331-window.h,y))),hung:true};
    }
    function taskContents(g,window,age,breakdown){
      var x=window.x+10,y=window.y+30;
      text(g,'CPU 100%  |  MEM '+(breakdown?'NaN':' '+Math.floor(120+Math.pow(Math.max(0,age-4.1),2)*640)+' MB'),x,y,'#222930',10);
      rect(g,x,y+17,window.w-20,52,'#192c2c');for(var grid=0;grid<4;grid++)line(g,x,y+17+grid*13,x+window.w-20,y+17+grid*13,'#28413c');
      g.save();clip(g,x,y+17,window.w-20,52);
      line(g,x,y+19,x+window.w-20,y+19,'#5ebf8d');
      var off=Math.max(0,age-4.1)*9;g.beginPath();for(var i=0;i<60;i++){var v=43-Math.pow((i+off)/22,2)*5,xx=x+i*(window.w-20)/59,yy=y+17+v; if(!i)g.moveTo(xx,yy);else g.lineTo(xx,yy);}g.strokeStyle='#81baca';g.lineWidth=1/scale;g.stroke();g.restore();
      text(g,'PROCESS           CPU  MEMORY',x,y+80,'#272d35',9);text(g,'cardable.exe      100%  '+(breakdown?'NaN':'overflow'),x,y+95,'#202835',9);
      for(i=0;i<4;i++)text(g,'secret.dat        100%  '+(breakdown?'NaN':'????'),x,y+111+i*13,'#27353b',9);
    }
    function contents(g,window,age,breakdown){
      var x=window.x,y=window.y;
      if(window.kind==='tasks'){taskContents(g,window,age,breakdown);return;}
      if(window.kind==='files'){
        rect(g,x+7,y+27,window.w-14,19,'#e5e5e6');text(g,'/pack/SECRET/',x+13,y+31,'#31363e',10);text(g,'Name                Type',x+13,y+55,'#525b60',10);
        var offset=Math.min(9983,Math.floor(Math.pow(Math.max(0,age-5.1),2.25)*210));
        for(var row=0;row<10;row++)text(g,'secret_'+String(Math.min(9999,offset+row+1)).padStart(4,'0')+'.dat    DAT',x+13,y+74+row*13,row%2?'#25313c':'#424c58',10);
        rect(g,x+window.w-12,y+51,5,window.h-62,'#888e96');rect(g,x+window.w-12,y+51+offset/9999*(window.h-80),5,18,'#d7dbe1');return;
      }
      if(window.kind==='defrag'){
        for(var yy=0;yy<6;yy++)for(var xx=0;xx<23;xx++){var code=(xx*17+yy*13+Math.floor(age*3))%11;rect(g,x+8+xx*7,y+28+yy*8,5,6,code<3?'#788998':code<6?p.bar:'#dfe0e1');}return;
      }
      if(window.kind==='clipboard'){text(g,'SECRET',x+18,y+41,'#181f2e',17);return;}
      bevel(g,x+12,y+36,21,23,false);text(g,window.symbol,x+19,y+40,p.bar,14);
      wrap(g,window.text,x+43,y+35,window.w-53);
      text(g,'NS 0x'+window.code,x+43,y+window.h-40,'#6a6e79',9);
      var pressed=window.id==='error:0'&&age>2.44&&age<2.65;
      var yes=window.text==='Are you sure you want to see this?';
      button(g,yes?'Yes':'OK',x+window.w-77,y+window.h-26,62,pressed);
      if(yes)button(g,'Yes',x+window.w-145,y+window.h-26,62,false);
      else if(Number(window.id.split(':')[1])%3===1)button(g,['Retry','Ignore','Cancel'][Number(window.id.split(':')[1])%3],x+window.w-145,y+window.h-26,62,false);
    }
    function drawWindow(g,window,position,age,theme,alpha,entrance,breakdown){
      g.save();g.globalAlpha*=alpha;
      var grow=profile==='safe'?M.smooth(entrance/cfg.desktop.safeEntranceMs):1;
      if(grow<=0){g.restore();return;}g.translate(px(position.x),px(position.y));g.translate(px(window.w/2),px(window.h/2));g.scale(.93+.07*grow,.93+.07*grow);g.translate(px(-window.w/2),px(-window.h/2));g.globalAlpha*=grow;
      rect(g,3,4,window.w,window.h,'rgba(0,0,0,.24)');
      if(theme===0)bevel(g,0,0,window.w,window.h,false);
      else{rect(g,0,0,window.w,window.h,theme===2?'#668a9c':'#7a8191');rect(g,1,1,window.w-2,window.h-2,theme>=3?'#d1d4d7':p.face);}
      if(theme===2&&glass.width){g.save();clip(g,2,2,window.w-4,window.h-4);g.globalAlpha*=.23;g.drawImage(glass,0,0,glass.width,glass.height,-position.x,-position.y,640,360);g.restore();}
      var lost=breakdown&&Number(window.id.split(':')[1])%9<(age-9)*1.1;
      if(!lost){
        var fill=p.bar;if(theme===1||theme===2){fill=g.createLinearGradient(0,0,window.w,0);fill.addColorStop(0,p.bar);fill.addColorStop(1,theme===1?'#527fb9':'#96b3c1');}
        rect(g,3,3,window.w-6,19,fill);
        g.save();clip(g,8,3,window.w-45,19);text(g,window.title+(position.hung?' (Not Responding)':''),8,7,'#f4f4f5',10);g.restore();
        bevel(g,window.w-34,5,12,13,false);text(g,'_',window.w-31,4,'#181b22',9);bevel(g,window.w-19,5,13,13,model.cursor.pressed&&Math.abs(model.cursor.x-(position.x+window.w-13))<13&&Math.abs(model.cursor.y-(position.y+11))<13);text(g,'x',window.w-16,6,'#15181f',10);
      }else rect(g,3,3,window.w-6,19,'#979ca3');
      g.save();clip(g,3,24,window.w-6,window.h-27);
      // Contents are local to the transformed window, keeping every dialog draggable.
      contents(g,Object.assign({},window,{x:0,y:0}),age,breakdown);g.restore();g.restore();
    }
    function themeAt(age){
      var e=(age-9)*1000,cfgE=cfg.breakdown,base=Math.min(4,Math.max(0,Math.floor(e/cfgE.themeMs))),blend=M.smooth((e%cfgE.themeMs)/cfgE.safeCrossfadeMs);
      var requested=cfgE.bursts.some(function(ms){return e>=ms&&e<ms+cfgE.themeBurstMs;});
      var active=burst(requested),theme=base;
      if(profile==='full'&&active)theme=(base+Math.floor((presentation-fullBurst)/250))%4;
      if(theme!==lastTheme){emit('themeFlip','themeFlip:'+profile+':'+(profile==='safe'?base:Math.floor(e/250)),19000+e);lastTheme=theme;}
      return {from:Math.max(0,base-1),to:theme,blend:profile==='safe'?blend:1,burst:active};
    }
    function cursor(age){
      var target=icons[3],x,y,shape='arrow',press=false;
      if(age<1.4){var f=M.smooth(age/1.05);x=M.mix(330,target.x,f);y=M.mix(188,target.y,f);press=age>=1.1&&age<1.18||age>=1.3&&age<1.38;}
      else if(age<2.12){x=target.x;y=target.y;shape='hourglass';}
      else if(age<2.65){x=M.mix(target.x,windows[0]?windows[0].x+windows[0].w-43:370,M.smooth((age-2.12)/.3));y=M.mix(target.y,windows[0]?windows[0].y+windows[0].h-18:181,M.smooth((age-2.12)/.3));press=age>2.44;}
      else if(age<4.8){x=330+Math.sin(age*3)*86;y=164+Math.cos(age*2.1)*54;shape=Math.floor(age*3)%3?'arrow':'hourglass';}
      else{var hung=windows.find(function(window){return window.id==='error:0';}),at=hung?pose(hung,age):{x:180,y:100};x=at.x+88;y=at.y+13;press=Math.floor(age*5)%3===0;
        if(age>6.4&&windows.length){var step=(age-6.4)*4.8,index=Math.floor(step),a=windows[index%windows.length],b=windows[(index+1)%windows.length],aa=pose(a,age),bb=pose(b,age),f=M.smooth(step-index);x=M.mix(aa.x+a.w-13,bb.x+b.w-13,f);y=M.mix(aa.y+11,bb.y+11,f);press=step-index>.84;}}
      model.cursor={x:x,y:y,shape:shape,pressed:press};
    }
    function drawCursor(target){
      var g=target||q;
      var c=model.cursor,x=Math.round(c.x),y=Math.round(c.y);g.save();g.translate(px(x),px(y));
      if(c.shape==='hourglass'){bevel(g,-1,-1,12,18,false);line(g,1,2,9,2,'#182532');line(g,1,15,9,15,'#182532');line(g,1,3,8,13,'#203343');line(g,9,3,2,13,'#203343');rect(g,4,6,3,5,p.bar);}
      else{g.beginPath();g.moveTo(0,0);g.lineTo(0,17);g.lineTo(4,13);g.lineTo(8,20);g.lineTo(11,18);g.lineTo(7,12);g.lineTo(13,12);g.closePath();g.fillStyle='#f5f5f5';g.fill();g.strokeStyle='#111519';g.lineWidth=1/scale;g.stroke();}
      if(c.pressed){g.strokeStyle='rgba(235,244,245,.35)';g.lineWidth=1/scale;g.beginPath();g.arc(2,3,9,0,6.28);g.stroke();}g.restore();
    }
    function north(age){
      if(age*1000<cfg.desktop.assistantMs)return;
      var a=M.smooth((age*1000-cfg.desktop.assistantMs)/220);q.save();q.globalAlpha=a;bevel(q,403,277,226,49,false);text(q,'NORTH',431,281,p.bar,10);
      wrap(q,cfg.assistant,431,293,190,9,12);q.fillStyle='#e7ecec';q.beginPath();q.moveTo(416,282);q.lineTo(419,290);q.lineTo(427,294);q.lineTo(419,297);q.lineTo(416,306);q.lineTo(413,297);q.lineTo(405,294);q.lineTo(413,290);q.closePath();q.fill();text(q,'?',413,290,p.bar,9);q.restore();
    }
    function artifacts(age,theme){
      var e=(age-9)*1000,amount=M.smooth(e/3000),full=profile==='full',active=full&&theme.burst&&presentation-fullBurst<cfg.breakdown.artifactBurstMs,colors=[p.magenta,p.cyan,p.green],opacity=full?(active?.72:.23):.16;
      q.save();q.globalAlpha=opacity*amount;
      var rr=M.random('northstar-artifacts:'+seed+':'+(active?Math.floor(presentation/125):0));
      // Safe uses an irregular fixed mask: no checker, no saturation/red changes, no noise bursts.
      for(var i=0;i<(level>=3?32:20);i++){
        var x=Math.floor(rr()*620),y=Math.floor(rr()*310),w=12+Math.floor(rr()*58),h=3+Math.floor(rr()*22);
        rect(q,x,y,w,h,full?colors[i%3]:['#597580','#354e63','#7c8c96'][i%3]);
        if(full&&!theme.burst&&i%4===0){for(var cy=0;cy<h;cy+=4)for(var cx=0;cx<w;cx+=4)if((cx+cy)%8===0)rect(q,x+cx,y+cy,3,3,'#08171e');}
        else for(var d=0;d<6;d++)rect(q,x+Math.floor(rr()*w),y+Math.floor(rr()*h),1,1,full?'#1b1330':'#a7b6bc');
      }
      // A corrupted triangle buffer reaches across several windows, while empty space stays dark.
      for(i=0;i<4;i++){var xx=rr()*640,yy=rr()*280;q.beginPath();q.moveTo(xx,yy);q.lineTo(xx+rr()*130-60,yy+4);q.lineTo(xx+rr()*250-125,yy+90*rr());q.closePath();q.fillStyle=full?colors[i%3]:'#5b7487';q.fill();}
      q.restore();
    }
    function desktop(age,breakdown,retain){
      advance(age*1000,10000+age*1000);cursor(age);
      var theme=breakdown?themeAt(age):{from:0,to:0,blend:1,burst:burst(profile==='full'&&age>6.15&&age<6.5)};
      if(breakdown&&!glass.dataset.ready){gq.save();gq.setTransform(1,0,0,1,0,0);gq.filter='blur(3px)';gq.drawImage(feedback,0,0);gq.restore();glass.dataset.ready='1';}
      background(age,breakdown);
      mq.clearRect(0,0,640,360);mq.drawImage(trailMask,0,0,trailMask.width,trailMask.height,0,0,640,360);
      var cap=cfg.windowCaps[level],reserved=windows.filter(function(window){return window.kind!=='error'||window.id==='error:0';});
      var visible=reserved.concat(windows.filter(function(window){return reserved.indexOf(window)<0;}).slice(-(cap-reserved.length))),sameMoment=last>=0&&presentation>last&&presentation-last<250;
      if(age>=4.7&&age<6.4){var hero=visible.find(function(window){return window.id==='error:0';});if(hero){visible.splice(visible.indexOf(hero),1);visible.push(hero);}}
      visible.forEach(function(window){
        var at=pose(window,age),entrance=presentation-window.born;
        if(at.hung){
          // Swept hull excludes the clean OS from the persistent raw feedback. Current
          // window footprints below write through, so old copies never cover new ones.
          var before=window.previous||at,tx=px(Math.min(before.x,at.x)),ty=px(Math.min(before.y,at.y)),tw=px(window.w+Math.abs(at.x-before.x)),th=px(window.h+Math.abs(at.y-before.y));mq.clearRect(tx,ty,tw,th);trailQ.clearRect(tx,ty,tw,th);
          if(level<2){for(var k=4;k>0;k--){var old=pose(window,Math.max(cfg.desktop.hangMs/1000,age-k*.085));drawWindow(q,window,old,age,theme.to,.5,entrance,breakdown);}}
        }
        window.at=at;window.state=at.hung?'hung':'responsive';window.z=visible.indexOf(window);
      });
      var duplicateBudget=Math.max(0,cap-visible.length);
      visible.forEach(function(window){
        var at=window.at,entrance=presentation-window.born;
        if(profile==='full'&&sameMoment&&window.born>last&&window.kind==='error'&&duplicateBudget>0){drawWindow(q,window,{x:at.x+7,y:at.y-4,hung:false},age,theme.to,.55,entrance,breakdown);duplicateBudget--;}
        if(theme.blend<1)drawWindow(q,window,at,age,theme.from,1,entrance,breakdown);
        drawWindow(q,window,at,age,theme.to,theme.blend,entrance,breakdown);
        rect(mq,at.x-1,at.y-1,window.w+6,window.h+7,'#fff');window.previous=at;
      });
      // Give the diagnostic windows clear beats, then let the avalanche bury them again.
      visible.filter(function(window){return window.kind==='tasks'&&(age<5.1||age>6.5&&age<7.6||age>11.8&&age<13.3)||window.kind==='files'&&(age<6.45||age>7.7&&age<8.5||age>9&&age<10.5);}).forEach(function(window){if(theme.blend<1)drawWindow(q,window,window.at,age,theme.from,1,presentation-window.born,breakdown);drawWindow(q,window,window.at,age,theme.to,theme.blend,presentation-window.born,breakdown);rect(mq,window.at.x,window.at.y,window.w+4,window.h+4,'#fff');});
      if(!breakdown)north(age);else artifacts(age,theme);
      drawCursor();rect(mq,model.cursor.x-3,model.cursor.y-3,22,29,'#fff');
      if(level>=2){
        // Canvas mirror has the same mask as WebGL, keeping a useful fallback on context loss.
        freshQ.clearRect(0,0,fresh.width,fresh.height);freshQ.globalCompositeOperation='source-over';freshQ.drawImage(canvas,0,0);freshQ.globalCompositeOperation='destination-in';freshQ.drawImage(mask,0,0);freshQ.globalCompositeOperation='source-over';
        fq.save();fq.setTransform(1,0,0,1,0,0);fq.drawImage(fresh,0,0);fq.restore();
        // OS source is opaque; the feedback shader receives the fresh raster + clean mask.
        q.save();q.setTransform(1,0,0,1,0,0);q.drawImage(feedback,0,0);q.restore();
      }else{fq.save();fq.setTransform(1,0,0,1,0,0);fq.drawImage(canvas,0,0);fq.restore();}
      if(retain){eq.save();eq.setTransform(1,0,0,1,0,0);eq.drawImage(canvas,0,0);eq.restore();desktopEnd.dataset.ready='1';}
      var e=Math.max(0,age-9),wave=.5+.5*Math.sin(e*1.3),strength=M.smooth(e/4);
      model.theme=theme.to;model.visibleWindows=visible;
      return {mask:level>=2?mask:null,curve:.035+strength*.018,shift:breakdown?1+strength*1.4:.5,tear:breakdown?.02+strength*.065:age>4.7?.008:0,
        sort:breakdown?strength*wave*.75:0,jpeg:breakdown?strength*.52:0,hold:breakdown?strength*.68:0,
        smear:breakdown?strength*7:0,vector:[(model.cursor.x-(previous?previous.x:model.cursor.x))*scale,(model.cursor.y-(previous?previous.y:model.cursor.y))*scale],
        noise:theme.burst?.08:.008,flicker:theme.burst&&Math.floor((presentation-fullBurst)/125)%2?.11:0,
        shake:breakdown?(profile==='safe'?Math.sin(presentation/1000*6.28*cfg.breakdown.safeShakeHz)*cfg.breakdown.safeShakePx:theme.burst?Math.sin(presentation*.029)*cfg.breakdown.fullShakePx:0):0};
    }
    function stopScreen(age){
      rect(q,0,0,640,360,p.stop);text(q,'[ ! ]',44,33,'#e4edf1',39);text(q,'NorthStar has stopped to protect itself.',45,101,'#dce5eb',16);
      text(q,'The current session encountered a secret.',46,137,'#c8d7e6',12);text(q,'Stop code: SECRET_FOUND',46,167,'#dde5ef',13);
      text(q,'Collecting error info: '+Math.max(0,99-Math.floor(age*72))+'%',46,202,'#c2d3e5',12);
      text(q,'Do not restart reality manually.',46,228,'#b0c4dd',11);
      var rr=M.random('northstar-stop-grid:'+seed);for(var yy=0;yy<9;yy++)for(var xx=0;xx<13;xx++){var value=rr();if(value>.57)rect(q,475+xx*5+(yy%2?2:0),202+yy*5,3,3,'#a8bed8');}
      text(q,'DIAGNOSTIC FRAGMENTS / NOT A CODE',439,256,'#97b2cd',8);text(q,'NS / '+String(seed).slice(-16),46,314,'#88a7c9',10);
    }
    function cachedDesktop(){q.save();q.setTransform(1,0,0,1,0,0);q.drawImage(desktopEnd,0,0);q.restore();}
    function terminal(age){
      rect(q,0,0,640,360,'#000');text(q,'NORTHSTAR RECOVERY / SESSION '+String(seed).slice(-10),22,18,'#889aa8',10);
      cfg.stop.commands.forEach(function(command,i){var count=Math.max(0,Math.floor((age-i*260)/12));text(q,command.slice(0,count),22,46+i*23,i===1?'#8a9ca8':'#c0ced4',12);});
      var hexAge=Math.max(0,age-(cfg.stop.hexMs-cfg.stop.terminalMs)),scroll=Math.floor(hexAge/60),lines=Math.min(18,Math.floor(hexAge/55));
      q.save();clip(q,21,147,603,185);
      for(var row=0;row<lines;row++){
        var bytes=hex[(row+scroll)%hex.length],at=row*16+149,mark=(row+scroll)%3===0;
        text(q,(0x5ec12000+(row+scroll)*24).toString(16).toUpperCase(),22,at,'#475763',9);
        var out=bytes.join(' ');if(mark)out=out.slice(0,12)+cfg.stop.secretHex+out.slice(29);
        text(q,out,95,at,'#6c7b85',9);
        if(mark){var charWidth=q.measureText('0').width;text(q,cfg.stop.secretHex,95+charWidth*12,at,'#e3ebed',9);}
      }q.restore();text(q,'_',22,Math.min(341,149+lines*16),'#c5d2d7',12);
    }
    function stop(age,boot){
      var ms=age*1000,control=cfg.stop,effect={curve:.05,shift:.6,noise:.012};
      if(ms<control.safeRebootStartMs){stopScreen(age);return effect;}
      if(ms<control.terminalMs){
        if(profile==='safe'){
          var f=M.clamp((ms-control.safeRebootStartMs)/control.safeRebootMs);
          // One slow reboot: stop -> POST -> the same failed desktop. No black/text cuts.
          if(f<.5){stopScreen(age);q.save();q.globalAlpha=M.smooth(f*2);boot(5.99);q.restore();}
          else{boot(5.99);q.save();q.globalAlpha=M.smooth((f-.5)*2);cachedDesktop();q.restore();}
          rect(q,18,292,360,35,'rgba(0,0,0,.7)');text(q,'rebooting'+'.'.repeat(1+Math.floor(f*3)),27,302,'#bcc9d0',12);
          if(lastReboot!==0){emit('reboot','reboot:safe',27000+control.safeRebootStartMs);lastReboot=0;}
        }else{
          var finalCycle=control.fullCycles[control.fullCycles.length-1];
          if(ms>=finalCycle.ms+finalCycle.duration){burst(false);cachedDesktop();return effect;}
          var cycle=control.fullCycles.findIndex(function(item){return ms<item.ms+item.duration;}),part=control.fullCycles[Math.max(0,cycle)],at=M.clamp((ms-part.ms)/part.duration);
          var live=burst(ms<control.safeRebootStartMs+500);
          if(cycle!==lastReboot){emit('reboot','reboot:full:'+cycle,27000+part.ms);lastReboot=cycle;}
          boot(Math.min(5.99,at*13));
          if(live){if(at>.42&&at<.6)stopScreen(.8);else if(at>=.6)cachedDesktop();effect.flicker=Math.floor((presentation-fullBurst)/125)%2?.18:0;}
          else{q.save();q.globalAlpha=M.smooth((at-.38)/.45);cachedDesktop();q.restore();}
        }
      }else{burst(false);terminal(ms-control.terminalMs);}
      return effect;
    }
    function collapse(age,boot){
      var ms=age*1000,control=spec.collapse;
      if(!frozen.dataset.ready){stop(4.999,boot);freezeQ.drawImage(canvas,0,0);frozen.dataset.ready='1';}
      var index=0;holds.forEach(function(at,i){if(ms>=at)index=i;});var held=holds[index]/1000,tear=M.smooth(held/2.1);
      dyingQ.save();dyingQ.setTransform(scale,0,0,scale,0,0);dyingQ.imageSmoothingEnabled=false;
      rect(dyingQ,0,0,640,360,'#000');
      tiles.forEach(function(tile){
        var desync=Math.max(0,tear-tile.offset),dx=Math.round(Math.sin(tile.phase+held*3)*desync*48),dy=Math.round(Math.cos(tile.phase+held*2)*desync*17);
        dyingQ.drawImage(frozen,tile.x*scale,tile.y*scale,80*scale,60*scale,tile.x+dx,tile.y+dy,80,60);
      });
      (model.visibleWindows||windows.slice(-cfg.windowCaps[level])).forEach(function(window,i){
        var at=window.at||window,flatten=M.smooth((held-.3-i*.014)/.8);if(!flatten)return;
        dyingQ.save();dyingQ.globalAlpha=flatten*(profile==='safe'?.48:.74);rect(dyingQ,at.x,at.y,window.w,window.h,'#686b70');
        var dissolve=M.smooth((held-1-i*.012)/.8);dyingQ.globalAlpha*=dissolve;dyingQ.drawImage(noise,0,0,32,32,at.x,at.y,window.w,window.h);dyingQ.restore();
      });
      // Cursors keep moving against the held tile poses, then the desktop catches up.
      var oldCursor=model.cursor,count=level>=3?44:level>=2?32:20,live=presentation/1000;
      for(var cursorIndex=count-1;cursorIndex>=0;cursorIndex--){var a=live-cursorIndex*.026;model.cursor={x:320+Math.sin(a*2.7)*230,y:171+Math.cos(a*3.3)*124,shape:cursorIndex%9===0?'hourglass':'arrow'};
        dyingQ.save();dyingQ.globalAlpha=.2+.6*(1-cursorIndex/count);drawCursor(dyingQ);dyingQ.restore();
      }model.cursor=oldCursor;
      if(ms>=control.dialogMs&&ms<control.tinyMs+180){dyingQ.save();dyingQ.globalAlpha=M.smooth((ms-control.dialogMs)/180);bevel(dyingQ,165,130,310,90,false);rect(dyingQ,168,133,304,19,p.bar);text(dyingQ,'NorthStar / final exception',178,137,'#f4f4f5',11);text(dyingQ,'It is now safe to look away.',183,173,'#17191c',12);dyingQ.restore();}
      if(ms>=control.tinyMs){var fade=M.smooth((ms-control.tinyMs)/120);dyingQ.save();dyingQ.globalAlpha=fade;bevel(dyingQ,297,151,46,42,false);rect(dyingQ,300,154,40,13,p.bar);text(dyingQ,'_',315,175,'#18191c',12);dyingQ.restore();}
      dyingQ.restore();rect(q,0,0,640,360,'#000');
      var compression=M.smooth((ms-control.compressMs)/(control.lineMs-control.compressMs)),height=Math.max(.6,360*(1-compression));
      if(ms<control.lineMs)q.drawImage(dying,0,0,dying.width,dying.height,0,180-height/2,640,height);
      else if(ms<control.dotMs){var length=640*(1-M.smooth((ms-control.lineMs)/(control.dotMs-control.lineMs)));rect(q,320-length/2,179.5,Math.max(1,length),1.2,'#dce1e4');rect(q,320-length/2,179,Math.max(1,length),2.2,'rgba(170,184,194,.18)');}
      else if(ms<control.blackMs){q.save();q.globalAlpha=1-M.smooth((ms-control.dotMs)/(control.blackMs-control.dotMs));rect(q,319.5,179.5,1.5,1.5,'#e5e7e9');q.restore();}
      var active=burst(ms<400||ms>=1900&&ms<2250);
      model.freezeHoldMs=index+1<holds.length?holds[index+1]-holds[index]:control.compressMs-holds[index];model.ghostCursors=count;
      return {curve:.055,shift:ms<control.compressMs?.6:0,noise:ms<control.compressMs?(active?.055:.005):0,tear:ms<control.compressMs?tear*.045:0};
    }
    return {model:model,mask:mask,
      getBeats:function(){return beats;},
      paint:function(section,age,time,options){
        level=options.level;profile=options.profile;presentation=options.presentationMs;resize();model.section=section;
        var effect;
        if(section==='desktop'||section==='breakdown')effect=desktop(section==='desktop'?age:9+age,section==='breakdown',section==='breakdown');
        else{
          if(!desktopEnd.dataset.ready){desktop(16.99,true,true);desktopEnd.dataset.ready='1';}
          effect=section==='collapse'?collapse(age,options.boot):stop(age,options.boot);
        }
        previous={x:model.cursor.x,y:model.cursor.y};last=presentation;
        return effect;
      },
      stop:function(){[mask,trailMask,feedback,fresh,glass,desktopEnd,frozen,dying,noise].forEach(function(c){c.width=c.height=1;});}
    };
  }};
})(window.Cardable,window);
