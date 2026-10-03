(function(C){
  'use strict';
  C.cutsceneGL={
    screenVertex:'#version 300 es\nprecision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}',
    compositeFragment:`#version 300 es
          precision highp float;in vec2 uv;out vec4 result;uniform sampler2D uScene,uBloom;uniform vec2 uPixel;uniform float uPass,uTime,uDawn,uMono,uHigh,uBurst;
          void main(){vec3 c=texture(uScene,uv).rgb;if(uPass>.5){vec3 sum=vec3(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 s=texture(uScene,uv+vec2(float(x),float(y))*uPixel*2.).rgb;sum+=max(s-vec3(.22),vec3(0.))/9.;}result=vec4(sum,1.);return;}
          vec3 east=texture(uScene,uv+vec2(uPixel.x,0.)).rgb,west=texture(uScene,uv-vec2(uPixel.x,0.)).rgb,north=texture(uScene,uv+vec2(0.,uPixel.y)).rgb,south=texture(uScene,uv-vec2(0.,uPixel.y)).rgb;
          float edge=length(max(max(east,west),max(north,south))-min(min(east,west),min(north,south)));c=mix(c,(east+west+north+south+c*4.)/8.,smoothstep(.10,.48,edge)*.7);
          vec3 glow=vec3(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)glow+=texture(uBloom,uv+vec2(float(x),float(y))*uPixel*5.).rgb/9.;c+=glow*.55;
          if(uDawn>.5&&uHigh>.5&&length(uv-.5)>.47){vec3 soft=vec3(0.);for(int k=-2;k<=2;k++)soft+=texture(uScene,uv+vec2(float(k)*uPixel.x*2.,float(k)*uPixel.y)).rgb/5.;c=mix(c,soft,.65);}
          if(uDawn>.5){vec2 off=(uv-.5)*uPixel*(2.2+uBurst*22.);c.r=texture(uScene,uv+off).r+glow.r*.55;c.b=texture(uScene,uv-off).b+glow.b*.55;
            float streak=0.;for(int k=-4;k<=4;k++)streak+=max(0.,dot(texture(uScene,uv+vec2(float(k)*uPixel.x*9.,0.)).rgb,vec3(.213,.715,.072))-.65)/9.;c+=streak*.08;
            if(uHigh>.5){vec3 ghost=texture(uBloom,vec2(1.)-uv*.9-.05).rgb;c+=ghost*.016;}float grain=fract(sin(dot(uv+uTime*.0001,vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.023;}

          float vignette=1.-smoothstep(.23,.83,length((uv-.5)*vec2(1.,.9)));c*=.55+.45*vignette;c=vec3(1.)-exp(-c*1.65);c=pow(c,vec3(.82));c=mix(c,vec3(dot(c,vec3(.213,.715,.072))),uMono);result=vec4(c,1.);}`,
    create:function(gl,resources){
      function shader(type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){var error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(error);}return s;}
      function program(v,f){var vs=null,fs=null,p=null;try{vs=shader(gl.VERTEX_SHADER,v);fs=shader(gl.FRAGMENT_SHADER,f);p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));resources.programs.push(p);return {p:p,u:Object.create(null)};}catch(error){if(p)gl.deleteProgram(p);throw error;}finally{if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);}}
      function uniform(p,key){if(p.u[key]===undefined)p.u[key]=gl.getUniformLocation(p.p,key);return p.u[key];}
      function target(depth){var texture=gl.createTexture(),f=gl.createFramebuffer(),d=depth?gl.createRenderbuffer():null;resources.textures.push(texture);resources.frames.push(f);if(d)resources.renderbuffers.push(d);return {texture:texture,f:f,depth:d,w:0,h:0};}
      function sizeTarget(t,w,h){if(t.w===w&&t.h===h)return;t.w=w;t.h=h;gl.bindTexture(gl.TEXTURE_2D,t.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindFramebuffer(gl.FRAMEBUFFER,t.f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.texture,0);if(t.depth){gl.bindRenderbuffer(gl.RENDERBUFFER,t.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,t.depth);}if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Cutscene render target unavailable');}
      return {program:program,uniform:uniform,target:target,sizeTarget:sizeTarget};
    }
  };
})(window.Cardable);
