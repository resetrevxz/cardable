(function(C,root){
  'use strict';
  var fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 result;
uniform sampler2D uOS,uPrevious;
uniform vec2 uSize,uBuffer;
uniform float uTime,uCurve,uShift,uTear,uSort,uJPEG,uHold,uSmear,uNoise,uFlicker,uMono,uLevel;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 fetchOS(vec2 p){return texture(uOS,(floor(p*uBuffer)+.5)/uBuffer).rgb;}
void main(){
  float aspect=uBuffer.x/uBuffer.y;vec2 fit=vec2(min(uSize.x,uSize.y*aspect),min(uSize.y,uSize.x/aspect));
  vec2 p=(uv-.5)*uSize/fit*2.;p*=1.+dot(p,p)*uCurve;vec2 at=p*.5+.5;
  if(any(lessThan(at,vec2(0.)))||any(greaterThan(at,vec2(1.)))){result=vec4(0.,0.,0.,1.);return;}
  float row=floor(at.y*uBuffer.y/8.);float block=hash(vec2(row,floor(uTime*6.)));
  at.x+=(block-.5)*uTear*step(.72,block);
  vec2 offset=vec2(uShift/uSize.x,0.);vec3 c=fetchOS(at);
  c.r=fetchOS(at+offset).r;c.b=fetchOS(at-offset).b;
  if(uSort>0.&&uLevel>2.5){vec3 selected=c;for(int k=1;k<=5;k++){vec3 v=fetchOS(at+vec2(float(k)*uSort/uBuffer.x,0.));if(dot(v,vec3(.213,.715,.072))>dot(selected,vec3(.213,.715,.072)))selected=v;}c=mix(c,selected,uSort);}
  if(uJPEG>0.&&uLevel>2.5){vec2 tile=(floor(at*uBuffer/8.)*8.+4.)/uBuffer;vec3 coarse=floor(fetchOS(tile)*12.)/12.;c=mix(c,coarse,uJPEG);}
  vec2 tile=floor(at*uBuffer/16.);vec3 old=texture(uPrevious,uv+vec2(uSmear/uSize.x,0.)).rgb;
  float hold=step(.65,hash(tile))*uHold;float trail=step(.06,length(old-c))*uSmear*.08;
  c=mix(c,old,clamp(max(hold,trail),0.,.94));
  // Aperture grille is below ten-percent contrast; it never creates a flash pattern.
  float scan=1.-.025*(.5+.5*sin(at.y*uBuffer.y*6.283185));
  vec3 mask=vec3(.985);mask[int(mod(floor(gl_FragCoord.x),3.))]=1.;c*=mask*scan;
  float rolling=exp(-pow((fract(at.y+uTime*.07)-.5)*18.,2.));c*=1.-rolling*.025;
  c+=vec3((hash(gl_FragCoord.xy+floor(uTime*30.))-.5)*uNoise);
  c*=1.-uFlicker;
  c=mix(c,vec3(dot(c,vec3(.213,.715,.072))),uMono);
  result=vec4(max(c,vec3(0.)),1.);
}`;
  C.cutsceneScreenEngine={create:function(){
    var canvas=root.document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:true}),lost=false,disposed=false;
    var resources={programs:[],textures:[],frames:[],renderbuffers:[]},gpu,pass,composite,os,feedback,bloom,read=0;
    var stats={backend:gl?'webgl2':'canvas',frames:0};
    function dispose(){if(disposed)return;disposed=true;if(gl){resources.programs.forEach(function(p){gl.deleteProgram(p);});resources.textures.forEach(function(t){gl.deleteTexture(t);});resources.frames.forEach(function(f){gl.deleteFramebuffer(f);});resources.renderbuffers.forEach(function(r){gl.deleteRenderbuffer(r);});}resources={programs:[],textures:[],frames:[],renderbuffers:[]};}
    canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();lost=true;stats.backend='canvas';});
    if(gl)try{gpu=C.cutsceneGL.create(gl,resources);pass=gpu.program(C.cutsceneGL.screenVertex,fragment);composite=gpu.program(C.cutsceneGL.screenVertex,C.cutsceneGL.compositeFragment);os=gl.createTexture();resources.textures.push(os);gl.bindTexture(gl.TEXTURE_2D,os);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);feedback=[gpu.target(false),gpu.target(false)];bloom=gpu.target(false);}catch(error){dispose();lost=true;stats.backend='canvas';}
    function texture(p,name,t,unit){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(gpu.uniform(p,name),unit);}
    return {canvas:canvas,stats:stats,dispose:dispose,
      render:function(source,w,h,time,effect,level){
        if(!gl||lost||disposed||level<2)return source;
        var budget=level===3?1500000:975000,dpr=Math.min(1.5,C.settings.policy.dpr,Math.sqrt(budget/(w*h))),rw=Math.max(1,Math.floor(w*dpr)),rh=Math.max(1,Math.floor(h*dpr));
        if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;feedback.forEach(function(t){gpu.sizeTarget(t,rw,rh);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);});gpu.sizeTarget(bloom,Math.max(1,rw>>1),Math.max(1,rh>>1));}
        gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(pass.p);texture(pass,'uOS',os,0);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);texture(pass,'uPrevious',feedback[read].texture,1);
        gl.uniform2f(gpu.uniform(pass,'uSize'),rw,rh);gl.uniform2f(gpu.uniform(pass,'uBuffer'),source.width,source.height);
        var values={Time:time,Curve:effect.curve==null?.035:effect.curve,Shift:effect.shift||0,Tear:effect.tear||0,Sort:effect.sort||0,JPEG:effect.jpeg||0,Hold:effect.hold||0,Smear:effect.smear||0,Noise:effect.noise||0,Flicker:effect.flicker||0,Mono:C.config.rarityColorMode==='mono'?1:0,Level:level};
        Object.keys(values).forEach(function(name){gl.uniform1f(gpu.uniform(pass,'u'+name),values[name]);});
        var write=1-read;gl.bindFramebuffer(gl.FRAMEBUFFER,feedback[write].f);gl.viewport(0,0,rw,rh);gl.drawArrays(gl.TRIANGLES,0,3);read=write;
        gl.useProgram(composite.p);texture(composite,'uScene',feedback[read].texture,0);texture(composite,'uBloom',feedback[1-read].texture,1);gl.uniform2f(gpu.uniform(composite,'uPixel'),1/rw,1/rh);
        ['Time','Dawn','Mono','High','Burst'].forEach(function(name){gl.uniform1f(gpu.uniform(composite,'u'+name),name==='Time'?time:name==='Mono'&&C.config.rarityColorMode==='mono'?1:0);});
        gl.uniform1f(gpu.uniform(composite,'uPass'),1);gl.bindFramebuffer(gl.FRAMEBUFFER,bloom.f);gl.viewport(0,0,bloom.w,bloom.h);gl.drawArrays(gl.TRIANGLES,0,3);
        texture(composite,'uBloom',bloom.texture,1);gl.uniform1f(gpu.uniform(composite,'uPass'),0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,rw,rh);gl.drawArrays(gl.TRIANGLES,0,3);stats.frames++;return canvas;
      }
    };
  }};
})(window.Cardable,window);
