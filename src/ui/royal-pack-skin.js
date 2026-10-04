(function(C,root) {
  'use strict';
  var uid=0,node=C.packMarkup.node,ns='http://www.w3.org/2000/svg';
  function svgNode(tag,attrs,parent){var el=root.document.createElementNS(ns,tag);Object.keys(attrs||{}).forEach(function(k){el.setAttribute(k,attrs[k]);});if(parent)parent.appendChild(el);return el;}
  function crown(parent,cls){
    var id='royal-gold-'+(++uid),svg=svgNode('svg',{class:cls||'royal-crown',viewBox:'0 0 160 108','aria-hidden':'true'},parent),defs=svgNode('defs',{},svg);
    var gold=svgNode('linearGradient',{id:id,x1:'0',y1:'0',x2:'.8',y2:'1'},defs);
    [['0','#FFF0B4'],['.23','#E3C064'],['.48','#8D5A1B'],['.64','#F4D784'],['1','#79501F']].forEach(function(s){svgNode('stop',{offset:s[0],'stop-color':s[1]},gold);});
    var metal='url(#'+id+')';
    svgNode('path',{d:'M24 82 12 31 42 51 40 17 65 47 80 8 95 47 120 17 118 51 148 31 136 82Z',fill:metal,stroke:'#FFE4A0','stroke-width':'1.4'},svg);
    svgNode('path',{d:'M25 80Q80 69 135 80L132 97Q80 105 28 97Z',fill:metal,stroke:'#F6D789','stroke-width':'1.5'},svg);
    svgNode('path',{d:'M29 84Q80 75 131 84M29 93Q80 101 131 93M21 43 31 76M43 30 49 74M80 22V73M117 30 111 74M139 43 129 76',fill:'none',stroke:'#FFF1C1','stroke-opacity':'.6','stroke-width':'1'},svg);
    svgNode('path',{d:'M48 67Q36 54 38 65T56 70M64 66Q53 51 57 65T74 68M96 66Q107 51 103 65T86 68M112 67Q124 54 122 65T104 70',fill:'none',stroke:'#684016','stroke-width':'1.4'},svg);
    [[12,30],[40,17],[80,8],[120,17],[148,30]].forEach(function(p){svgNode('circle',{cx:p[0],cy:p[1],r:4,fill:metal,stroke:'#FFF3C5','stroke-width':'1'},svg);svgNode('circle',{cx:p[0]-1,cy:p[1]-1,r:1,fill:'#FFF9DB'},svg);});
    [40,60,80,100,120].forEach(function(x){svgNode('path',{d:'M'+x+' 82l4 5-4 5-4-5Z',fill:x===80?'#801828':'#B37E37',stroke:'#FFDF91','stroke-width':'.8'},svg);svgNode('path',{d:'M'+x+' 83l-2 3h3Z',fill:'#FFEBC5','fill-opacity':'.75'},svg);});
    for(var x=32;x<=128;x+=8)svgNode('circle',{cx:x,cy:98-Math.abs(80-x)*.08,r:1.1,fill:'#FCE2A0'},svg);
    svgNode('path',{class:'royal-crown__glint',d:'M81 16 84 24 92 27 84 30 81 38 78 30 70 27 78 24Z',fill:'#FFFBE7'},svg);
    return svg;
  }
  function facets(parent){
    var cfg=C.config.royalPack,cols=cfg.facetColumns,rows=cfg.facetRows,svg=svgNode('svg',{class:'royal-mosaic',viewBox:'0 0 180 266',preserveAspectRatio:'none','aria-hidden':'true'},parent),points=[];
    var palette=['#35230C','#5C3B11','#82571B','#A67B2D','#D6B353','#F0D581','#B48B36','#714B19'];
    for(var y=0;y<=rows;y++)for(var x=0;x<=cols;x++)points.push([x*180/cols+(x&&x<cols?Math.sin(x*8+y*17)*6:0),y*266/rows+(y&&y<rows?Math.cos(x*13+y*5)*7:0)]);
    function tri(a,b,c,i){svgNode('polygon',{points:[a,b,c].map(function(p){return p.map(function(n){return n.toFixed(2);}).join(',');}).join(' '),fill:palette[i%palette.length],stroke:'#EECF81','stroke-width':'.45','stroke-opacity':'.2'},svg);}
    for(var yy=0;yy<rows;yy++)for(var xx=0;xx<cols;xx++){var a=points[yy*(cols+1)+xx],b=points[yy*(cols+1)+xx+1],c=points[(yy+1)*(cols+1)+xx],d=points[(yy+1)*(cols+1)+xx+1],i=xx*13+yy*19;tri(a,b,yy%2?c:d,i);tri(yy%2?b:a,d,c,i+3);}
    return svg;
  }
  function carpet(parent){
    var band=node('div','royal-carpet',parent),svg=svgNode('svg',{class:'royal-damask',viewBox:'0 0 180 40',preserveAspectRatio:'none','aria-hidden':'true'},band),defs=svgNode('defs',{},svg),id='royal-damask-'+(++uid);
    var p=svgNode('pattern',{id:id,width:30,height:24,patternUnits:'userSpaceOnUse'},defs);
    svgNode('path',{d:'M15 2c-4 4-6 6-2 10-8-2-8 5-3 5l5-3 5 3c5 0 5-7-3-5 4-4 2-6-2-10ZM15 16v6m-4-3h8',fill:'#3F0811',stroke:'#B03A45','stroke-opacity':'.35','stroke-width':'.5'},p);
    svgNode('path',{d:'m0 0 2 2-2 2-2-2Z',fill:'#D5AA52'},p);svgNode('rect',{width:180,height:40,fill:'url(#'+id+')'},svg);
    node('i','royal-carpet__threads',band);return band;
  }
  function render(el,pack){
    el.dataset.skin=pack.skin;el.querySelectorAll('.pack-wrapper').forEach(function(wrapper){
      if(wrapper.querySelector('.royal-face'))return;
      var face=node('div','pack-skin-layer royal-face',wrapper);facets(face);node('div','royal-facet-light',face);node('div','royal-charge-facets',face);
      var header=node('div','royal-header',face);node('span','royal-header__chip',header,'C');node('strong','',header,C.config.gameName);
      carpet(face);node('span','royal-label',face,pack.name.toUpperCase());crown(face);
      node('span','royal-tagline',face,pack.tagline);node('span','royal-footer',face,'SERIES '+pack.design.series+' / CROWN EDITION');
      node('div','royal-sheen',face);
      var dust=node('div','royal-dust',face);for(var i=0;i<C.config.royalPack.dustCount;i++){var mote=node('i','',dust);mote.style.left=(8+(i*37)%84)+'%';mote.style.top=(32+(i*23)%56)+'%';mote.style.setProperty('--mote-offset',i%4*1.8+'px');}
    });
  }
  function quality(el,pose,time,reduced,state){
    var cfg=C.config.royalPack,policy=C.settings.policy,rank=Math.min(C.settingsSchema.tiers.indexOf(C.settings.get('finishQuality')),policy.reflection);
    el.dataset.packQuality=C.settingsSchema.tiers[rank];
    if(state.appeared==null||time<state.appeared){state.appeared=time;state.lastPaint=-Infinity;}
    var active=!reduced&&policy.ambient&&policy.animation>=2&&rank>=2,age=time-state.appeared;
    var host=el.closest('.opening-stage'),phase=host&&host.dataset.phase,charging=phase==='charging'||phase==='draining';
    var waiting=!host&&!!el.closest('[data-state="waiting"]');
    if(state.waiting!==waiting){state.waiting=waiting;state.appeared=time;state.lastPaint=-Infinity;age=0;}
    if(time-state.lastPaint<1000/(policy.animationHz||20)&&state.phase===phase)return active;
    state.lastPaint=time;state.phase=phase;
    var fill=charging?Number(el.dataset.chargeFill)||0:1;
    var sweep=(rank===3?age%cfg.glintMs:age)/cfg.sheenMs,glint=active&&sweep<1;
    el.style.setProperty('--royal-sheen-x',(glint?-145+sweep*290:145)+'%');
    el.style.setProperty('--royal-sheen-opacity',glint?Math.sin(sweep*Math.PI)*.24:0);
    el.style.setProperty('--royal-glint',glint?Math.pow(Math.sin(sweep*Math.PI),6)*.8:0);
    el.style.setProperty('--royal-light-x',(rank===3&&active?42+(pose.ry||0)*1.1:42)+'%');
    el.style.setProperty('--royal-light-y',(rank===3&&active?30-(pose.rx||0)*1.1:30)+'%');
    el.style.setProperty('--royal-fill-top',(1-fill)*100+'%');
    el.style.setProperty('--royal-charge-glow',charging?fill*.45:0);
    el.style.setProperty('--royal-dust-y',active&&rank===3?(-age%9000/9000*18)+'px':'0px');
    el.style.setProperty('--royal-dust-opacity',active&&rank===3?policy.particles*.32:0);
    return active&&(rank===3||age<cfg.sheenMs);
  }
  C.royalPackArt={crown:crown,facets:facets,carpet:carpet};
  C.packSkins.register('royal',{renderIdle:render,renderWaiting:render,renderWrapper:render,quality:quality,
    fluidTint:['#FFF0BE','#C49A42'],leakTint:'#FFF4D4',cutGlow:'#FFF1CB',
    counterThumb:function(host){var thumb=node('span','pack-counter-thumb pack-counter-thumb--royal',host);crown(thumb,'royal-marker-crown');var glyph=node('span','pack-counter-glyph',host);glyph.textContent='ROYAL';}
  });
})(window.Cardable,window);
