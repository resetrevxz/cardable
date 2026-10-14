(function(C){
  'use strict';
  // Fixed processing order, with independent bypass. Authored values never change
  // when a stage or expensive renderer effect is temporarily unavailable.
  var stages=[
    {id:'lighting',name:'Light',description:'Set the exposure and tonal range.',fields:['exposure','highlights','shadows','whites','blacks']},
    {id:'balance',name:'Balance',description:'Neutralize color, then set its intensity.',fields:['temperature','tint','saturation','vibrance']},
    {id:'contrast',name:'Contrast',description:'Shape contrast and shadows, midtones and highlights.',fields:['contrast','lift','gamma','gain']},
    {id:'creative',name:'Curves',description:'Refine the master curve and individual channels.',fields:['curve','channels']},
    {id:'finish',name:'Finish',description:'Apply lens and texture effects last.',fields:['bloom','halation','vignette','grain','aberration','flare','sharpen','tiltShift']}
  ],identity=[0,.25,.5,.75,1];
  // Shape-preserving cubic Hermite. Each segment stays within its endpoints;
  // flat and opposing slopes have zero tangents, so a curve cannot overshoot.
  function tone(a,x){x=Math.max(0,Math.min(1,x));var v=x*4,i=Math.min(3,Math.floor(v)),t=v-i,d=a[i+1]-a[i];function slope(j){if(j===0)return a[1]-a[0];if(j===4)return a[4]-a[3];var p=a[j]-a[j-1],q=a[j+1]-a[j];return p*q<=0?0:2*p*q/(p+q);}var m=slope(i),n=slope(i+1);if(!d)m=n=0;else{var length=Math.hypot(m/d,n/d);if(length>3){m*=3/length;n*=3/length;}}var t2=t*t,t3=t2*t;return Math.max(Math.min(a[i],a[i+1]),Math.min(Math.max(a[i],a[i+1]),(2*t3-3*t2+1)*a[i]+(t3-2*t2+t)*m+(-2*t3+3*t2)*a[i+1]+(t3-t2)*n));}
  function resolve(post){var out=Object.assign({},post),base=C.studioScenes.defaults().post;stages.forEach(function(stage){if(post.stages&&post.stages[stage.id]===false)stage.fields.forEach(function(k){out[k]=stage.id==='finish'?0:base[k];});});return out;}
  function reset(post,id){var stage=stages.find(function(s){return s.id===id;}),base=C.studioScenes.defaults().post;if(stage)stage.fields.forEach(function(k){post[k]=C.studioScenes.clone(base[k]);});}
  function pixel(rgb,p){var base=rgb.map(function(v){v*=Math.pow(2,p.exposure);return v/(1+Math.max(v-1,0));}),gray=base[0]*.213+base[1]*.715+base[2]*.072,l=Math.max(0,Math.min(1,gray)),light=(p.highlights*Math.pow(l,3)+p.shadows*Math.pow(1-l,3))*.3+(p.whites*Math.pow(l,6)+p.blacks*Math.pow(1-l,6))*.18;
    base=base.map(function(v){return v+light;});gray=base[0]*.213+base[1]*.715+base[2]*.072;var chroma=Math.max.apply(Math,base)-Math.min.apply(Math,base),sat=Math.max(0,p.saturation+p.vibrance*(1-Math.min(1,chroma))),balance=[1+p.temperature*.12+p.tint*.035,1-p.tint*.055,1-p.temperature*.12+p.tint*.035];
    return base.map(function(v,i){v=gray+(v-gray)*sat;v*=balance[i];v=(v-.5)*p.contrast+.5;v=Math.pow(Math.max(0,(v+p.lift[i])*p.gain[i]),1/Math.max(.5,p.gamma[i]));return tone((p.channels||[identity,identity,identity])[i],tone(p.curve,v));});
  }
  function processor(p){var exposure=Math.pow(2,p.exposure),balance=[1+p.temperature*.12+p.tint*.035,1-p.tint*.055,1-p.temperature*.12+p.tint*.035],tonal=p.highlights||p.shadows||p.whites||p.blacks,curved=JSON.stringify(p.curve)!==JSON.stringify(identity)||(p.channels||[]).some(function(a){return JSON.stringify(a)!==JSON.stringify(identity);}),tables=curved?[0,1,2].map(function(i){var data=new Float32Array(1025);for(var n=0;n<=1024;n++)data[n]=tone((p.channels||[])[i]||identity,tone(p.curve,n/1024));return data;}):null;
    return function(r,g,b,out){r*=exposure;g*=exposure;b*=exposure;r/=1+Math.max(r-1,0);g/=1+Math.max(g-1,0);b/=1+Math.max(b-1,0);var gray=r*.213+g*.715+b*.072,l=Math.max(0,Math.min(1,gray)),light=tonal?(p.highlights*l*l*l+p.shadows*Math.pow(1-l,3))*.3+(p.whites*Math.pow(l,6)+p.blacks*Math.pow(1-l,6))*.18:0;r+=light;g+=light;b+=light;gray=r*.213+g*.715+b*.072;var saturation=Math.max(0,p.saturation+p.vibrance*(1-Math.min(1,Math.max(r,g,b)-Math.min(r,g,b))));out[0]=r;out[1]=g;out[2]=b;for(var i=0;i<3;i++){var value=((gray+(out[i]-gray)*saturation)*balance[i]-.5)*p.contrast+.5;value=Math.max(0,(value+p.lift[i])*p.gain[i]);if(p.gamma[i]!==1)value=Math.pow(value,1/Math.max(.5,p.gamma[i]));if(curved){var at=Math.max(0,Math.min(1,value))*1024,n=Math.min(1023,Math.floor(at)),t=at-n;value=tables[i][n]*(1-t)+tables[i][n+1]*t;}out[i]=Math.max(0,Math.min(1,value));}return out;};
  }
  C.studioColor={stages:stages,identity:identity,tone:tone,resolve:resolve,reset:reset,pixel:pixel,processor:processor};
})(window.Cardable);
