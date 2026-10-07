(function (C, root) {
  'use strict';
  // A private, offline WebGL2 scene. The reveal controller owns time and presentation.
  var TAU = Math.PI * 2;
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function rng(seed) { var n = 2166136261; for (var i = 0; i < seed.length; i++) n = Math.imul(n ^ seed.charCodeAt(i), 16777619); return function () { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
  function normalize(a) { var d = Math.hypot(a[0], a[1], a[2]) || 1; return a.map(function (v) { return v / d; }); }
  function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function sub(a, b) { return a.map(function (v, i) { return v - b[i]; }); }
  function dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function multiply(a, b) { var c = new Float32Array(16); for (var j=0;j<4;j++) for(var i=0;i<4;i++) for(var k=0;k<4;k++) c[j*4+i]+=a[k*4+i]*b[j*4+k]; return c; }
  function view(eye, target, up) { var z=normalize(sub(eye,target)), x=normalize(cross(up||[0,1,0],z)), y=cross(z,x); return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]); }
  function projection(aspect) { var f=1/Math.tan(.46), n=.08, far=65; return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]); }
  function model(x,y,z,s,angle) { var c=Math.cos(angle||0)*s, q=Math.sin(angle||0)*s; return new Float32Array([c,q,0,0,-q,c,0,0,0,0,s,0,x,y,z,1]); }
  var prismaticGeometry=false;
  var identity=model(0,0,0,1,0);
  C.cutsceneMath={clamp:clamp,smooth:smooth,mix:mix,random:rng,
    starTurns:function(age,ramp,max,factors){var a=Math.min(age,ramp);return (.1*a+(max-.1)*a*a/(2*ramp))*factors[0]+Math.max(0,age-ramp)*max*factors[1];}};
  function triangle(out,a,b,c) { var n=normalize(cross(sub(b,a),sub(c,a))); [a,b,c].forEach(function(p){out.push(p[0],p[1],p[2],n[0],n[1],n[2]);}); }
  function crystal(out,x,y,z,r,length,angle,random) {
    var rings=[], sides=prismaticGeometry?6:7,tilt=prismaticGeometry?(random()-.5)*.28:0;
    for(var row=0;row<3;row++) { var ring=[]; for(var i=0;i<sides;i++){var a=i*TAU/sides+angle, rr=r*(row===0?.66:row===1?1:.62)*(1+(random()-.5)*.12);ring.push([x+Math.cos(a)*rr+tilt*[.48,.12,-.48][row]*length,y+[.48,.12,-.48][row]*length,z+Math.sin(a)*rr]);} rings.push(ring); }
    for(var j=0;j<sides;j++) {var k=(j+1)%sides; triangle(out,[x+tilt*.68*length,y+.68*length,z],rings[0][k],rings[0][j]); for(var h=0;h<2;h++){triangle(out,rings[h][j],rings[h][k],rings[h+1][j]);triangle(out,rings[h][k],rings[h+1][k],rings[h+1][j]);} triangle(out,rings[2][j],rings[2][k],[x+.04*r-tilt*length,y-length,z]);}
  }
  var vertex = '#version 300 es\nprecision highp float;layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;uniform mat4 uVP,uModel;uniform float uMaterial,uTime,uCrack;out vec3 vWorld,vNormal;void main(){vec4 p=uModel*vec4(aPosition,1.);if(uMaterial>.5&&uMaterial<1.5){float weight=clamp((5.7-aPosition.y)/2.,0.,1.);p.x+=(sin(uTime*.6+aPosition.z)*.013+sin(uTime*28.+aPosition.x)*uCrack*.008)*weight;}vWorld=p.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uVP*p;}';
  var fragment = `#version 300 es
  precision highp float;
  in vec3 vWorld,vNormal;out vec4 result;
  uniform vec3 uEye,uHero,uRuby;uniform float uTime,uMaterial,uMono,uUnder,uClip,uPulse,uCrack,uDawn,uWetness,uHeroLight;uniform sampler2D uStone,uGlass;uniform vec2 uViewport;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  vec3 palette(vec3 c){return mix(c,vec3(dot(c,vec3(.213,.715,.072))),uMono);}
  void main(){
    if(uClip>.5&&vWorld.y<.025)discard;
    vec3 n=normalize(vNormal),v=normalize(uEye-vWorld),delta=uHero-vWorld;float distance=length(delta);vec3 l=normalize(delta);
    vec3 axis=abs(n);vec2 uv=axis.y>axis.x&&axis.y>axis.z?vWorld.xz:axis.x>axis.z?vWorld.zy:vWorld.xy;
    vec4 stone=texture(uStone,uv*.19);float rough=stone.a;vec3 bump=vec3(stone.g-.5,stone.r-.5,stone.b-.5)*.62;n=normalize(n+bump*(uMaterial<.5?1.:.035));
    float diffuse=max(dot(n,l),0.),falloff=1./(1.+distance*distance*.085),fill=max(dot(n,normalize(vec3(-.5,1.,.8))),0.);
    float fresnel=pow(1.-max(dot(n,v),0.),3.),spec=pow(max(dot(reflect(-l,n),v),0.),mix(95.,12.,rough));
    vec3 ruby=uRuby,col;
    if(uMaterial<.5){
      float fine=texture(uStone,uv*2.3).r;float grain=stone.r*.6+fine*.4;
      float vein=abs(texture(uStone,uv*.43+stone.gb*.08).r-.47);float seam=1.-smoothstep(.006,.014,vein);
      float strata=.65+.35*sin(vWorld.y*3.4+stone.r*4.+vWorld.z*.32);
      float wet=uWetness*smoothstep(.35,.75,stone.r)*(1.-rough*.4);
      vec3 rimDirection=normalize(vec3(-3.,5.5,-2.)-vWorld);
      float rim=max(dot(n,rimDirection),0.);
      col=vec3(.071,.063,.067)*(.45+grain*1.45)*(.32+fill*.8)*strata+ruby*diffuse*falloff*.29*uHeroLight;
      col*=1.-seam*.76;col+=vec3(.35,.25,.25)*spec*falloff*(.4+wet*.9);
      col+=vec3(.18,.038,.043)*rim*.21+vec3(.14,.006,.009)*seam*.1+fresnel*(.018+wet*.055);
    }else{
      float vein=pow(1.-abs(sin(vWorld.y*5.2+vWorld.x*9.+sin(vWorld.z*12.))),22.);
      float interior=pow(max(dot(-n,l),0.),2.);float striation=.5+.5*sin(vWorld.y*17.+vWorld.x*6.);
      float band=pow(max(0.,sin(vWorld.y*7.+vWorld.x*11.+vWorld.z*4.)),12.);
      float thickness=.3+abs(dot(n,normalize(vec3(.2,.1,1.))))*.8;
      vec3 absorption=exp(-vec3(.6,4.8,3.5)*thickness);
      col=vec3(.019,.001,.005)+ruby*(diffuse*.45+interior*.3+fill*.08)*falloff*uHeroLight;
      col+=absorption*vec3(.24,.09,.08)*interior+vec3(.95,.48,.46)*spec*.9;
      col+=vec3(.55,.06,.10)*fresnel+vec3(.72,.008,.025)*vein*.055;
      col+=ruby*striation*.016+ruby*uPulse*(.045+fresnel*.22)+vec3(.29,.011,.025)*band*interior;
      if(uMaterial>2.5){float core=exp(-dot(delta,delta)*3.);col+=ruby*core*.49+vec3(.9,.18,.15)*vein*.07;float crack=exp(-pow((vWorld.y-uHero.y-.91)*25.,2.))*uCrack;col+=vec3(1.,.3,.26)*crack*.9;}
      else if(uMaterial>1.5)col=vec3(.25,.008,.018)+ruby*(diffuse*.45+fresnel*.24)+vec3(.95,.10,.10)*uPulse*.28;
      if(uDawn<.5&&uMaterial>3.5){
        vec2 screen=gl_FragCoord.xy/uViewport;
        vec3 reflected=texture(uGlass,clamp(screen+n.xz*.013,vec2(.002),vec2(.998))).rgb;
        col=vec3(.008,.002,.007)+reflected*(.2+fresnel*.6)+ruby*(spec*.48+fresnel*.15);
      }
    }
    if(uDawn>.5){
      vec3 rose=vec3(1.,.624,.698),mint=vec3(.659,.941,.776),sky=vec3(.663,.8,1.);
      vec3 fringe=mix(mix(rose,mint,.5+.5*sin(vWorld.y*3.+uTime*.24)),sky,.5+.5*sin(vWorld.z*2.1));
      if(uMaterial<.5){float caustic=pow(max(0.,sin(vWorld.x*4.+sin(vWorld.z*3.+uTime*.35))+sin(vWorld.y*5.-uTime*.21))*.5,8.);
        col=vec3(.021,.026,.05)*(1.+stone.r)+fringe*(diffuse*falloff*.17+caustic*.15)+spec*vec3(.25);}
      else {vec3 env=mix(vec3(.055,.07,.14),vec3(.68,.73,.84),clamp(n.y*.5+.5,0.,1.));
        float phantom=pow(1.-abs(sin(vWorld.y*7.+vWorld.x*3.)),36.);
        vec2 screen=gl_FragCoord.xy/uViewport;vec2 refractOffset=n.xy*(.006+min(distance,4.)*.002);
        vec3 through=vec3(texture(uGlass,clamp(screen+refractOffset*1.4,vec2(.002),vec2(.998))).r,texture(uGlass,clamp(screen+refractOffset,vec2(.002),vec2(.998))).g,texture(uGlass,clamp(screen+refractOffset*.6,vec2(.002),vec2(.998))).b);
        col=through*(uClip>.5?0.:.42)*(1.-fresnel)+env*(.14+fresnel*.7)+fringe*(diffuse*falloff*.3+fresnel*.12)+vec3(1.)*spec*.75+phantom*.075;
        if(uMaterial>2.5){float core=exp(-dot(delta,delta)*2.8);col+=vec3(.85,.88,1.)*core*(.34+uPulse*.045);
          float fissure=exp(-pow((vWorld.y-uHero.y-.9+uCrack*1.9)*28.,2.))*uCrack;col+=fringe*fissure*.7;}
        if(uMaterial>1.5&&uMaterial<2.5){float wave=pow(.5+.5*sin(vWorld.y*8.-uTime*5.7),8.);col=vec3(.46,.5,.56)+fringe*(.35+wave*.22);}}
    }
    float fog=1.-exp(-length(uEye-vWorld)*(uUnder>.5?.105:.028));col=mix(col,uDawn>.5?vec3(.018,.025,.066):vec3(.009,.001,.004),fog);
    col*=uUnder>.5?(uDawn>.5?vec3(.73,.84,1.):vec3(.7,.43,.46)):vec3(1.);result=vec4(palette(col),1.);
  }`;
  var waterFragment = `#version 300 es
  precision highp float;in vec3 vWorld,vNormal;out vec4 result;
  uniform sampler2D uReflection,uHeight;uniform float uSim;uniform mat4 uReflectVP;uniform vec3 uEye,uRuby;uniform float uTime,uImpact,uMono,uUnder,uOmen,uDawn;
  void main(){
    vec2 p=vWorld.xz;float d=length(p);float wave=sin(p.x*2.7+uTime*.9)*.019+sin(p.y*3.9-uTime*.7)*.014;
    float ring=sin(d*16.-uImpact*11.)*exp(-abs(d-uImpact*2.5)*2.)*exp(-uImpact*.62)*step(0.,uImpact);
    vec3 n=normalize(vec3(cos(p.x*2.7+uTime)*.08+ring*.1,1.,sin(p.y*3.9-uTime)*.07+ring*.1));
    if(uSim>.5){vec2 st=clamp(p/16.+.5,vec2(.01),vec2(.99));float dx=texture(uHeight,st+vec2(.005,0.)).r-texture(uHeight,st-vec2(.005,0.)).r;float dz=texture(uHeight,st+vec2(0.,.005)).r-texture(uHeight,st-vec2(0.,.005)).r;n=normalize(n+vec3(dx*3.,0.,dz*3.));}
    vec4 projected=uReflectVP*vec4(vWorld,1.);vec2 uv=projected.xy/projected.w*.5+.5;uv+=n.xz*.018+wave*.015;
    vec3 reflected=texture(uReflection,clamp(uv,vec2(.002),vec2(.998))).rgb;
    float fresnel=.22+.65*pow(1.-abs(dot(n,normalize(uEye-vWorld))),3.);float tint=step(0.,uImpact)*exp(-d*d/(.6+uImpact*1.7));
    vec3 col=vec3(.003,.002,.006)+reflected*fresnel*.8+uRuby*.14*tint*.65;
    float angle=atan(p.y,p.x);float rays=pow(abs(cos(angle*4.)),28.)*exp(-d*2.6);col+=uRuby*(rays*.8+exp(-d*7.)*.5)*uOmen;
    float second=sin(d*23.-uImpact*13.)*exp(-abs(d-uImpact*1.6)*2.3)*exp(-uImpact*.9)*step(0.,uImpact);
    float glint=pow(max(0.,dot(reflect(normalize(vWorld-uEye),n),normalize(vec3(-.4,1.,.1)))),90.);
    col+=vec3(.2,.052,.055)*max(0.,ring+second*.35)*.6+uRuby*glint*.055;
    if(uUnder>.5)col=col*.5+vec3(.016,.002,.006);
    if(uDawn>.5){vec3 pastel=.82+.16*cos(vec3(0.,2.1,4.2)+d*1.7+uTime*.3+wave*9.);
      float spread=step(0.,uImpact)*exp(-d*d/(.35+max(uImpact,0.)*2.2));
      col=reflected*(.6+fresnel*.25)+vec3(.065,.08,.12)+pastel*spread*.34+max(0.,ring)*vec3(.32,.37,.4);
      if(uUnder>.5)col=mix(vec3(.1,.15,.25),pastel*.8,.7);}
    col=mix(col,vec3(dot(col,vec3(.213,.715,.072))),uMono);result=vec4(col,1.);
  }`;
  var pointVertex = '#version 300 es\nprecision highp float;layout(location=0)in vec4 aPoint;uniform mat4 uVP;uniform float uDpr;out float vAlpha,vBubble;void main(){gl_Position=uVP*vec4(aPoint.xyz,1.);gl_PointSize=clamp(abs(aPoint.w)*uDpr*85./gl_Position.w,1.,34.);vAlpha=min(1.,abs(aPoint.w)*.45);vBubble=1.-step(0.,aPoint.w);}';
  var pointFragment = '#version 300 es\nprecision highp float;in float vAlpha,vBubble;uniform float uMono;uniform vec3 uRuby;out vec4 result;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;vec3 c=mix(uRuby,vec3(dot(uRuby,vec3(.213,.715,.072))),uMono);float shape=mix(pow(1.-d,2.),exp(-pow((d-.68)*8.,2.))*.65,vBubble);result=vec4(c,shape*vAlpha*.7);}';
  var screenVertex='#version 300 es\nprecision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}';
  // The haze field is independent of time: animation translates its sampling point.
  // Paint its original four-octave noise once, then reuse the bounded local atlas.
  var fogNoise=`
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    float fbm(vec2 p){float n=0.,a=.5;for(int k=0;k<4;k++){n+=a*noise(p);p=p*2.03+vec2(3.1,7.7);a*=.5;}return n;}`;
  var fogFragment=`#version 300 es
    precision highp float;in vec2 uv;out vec4 result;
    ${fogNoise}
    void main(){float f=fbm(uv*16.+vec2(0.,-8.));result=vec4(f,f,f,1.);}`;
  // True spatial cloud density, integrated front-to-back at half resolution.
  // The periodic volume is baked once; no per-frame noise generation or extra clock.
  var skyFragment=`#version 300 es
    precision highp float;precision highp sampler3D;in vec2 uv;out vec4 result;
    uniform sampler3D uCloud;uniform vec2 uViewport;uniform float uProgress,uTravel,uShake,uMono,uTime;uniform int uSteps;
    float density(vec3 p){
      float body=texture(uCloud,p*.038).r*.62+texture(uCloud,p*.091+vec3(.21,.06,.17)).r*.27+texture(uCloud,p*.213).r*.11;
      float floor=smoothstep(-6.,-1.2,p.y)*(1.-smoothstep(5.,11.,p.y));
      float bank=smoothstep(9.,18.,p.z)*(1.-smoothstep(39.,51.,p.z));
      // A passage with massive rolling shoulders; it closes into the far bank.
      float passage=(1.-smoothstep(1.2,5.,abs(p.x)))*(1.-smoothstep(1.,4.,abs(p.y-1.))) *(1.-smoothstep(21.,31.,p.z));
      return max(0.,body-(.41+passage*.28))*3.6*floor*bank;
    }
    void main(){
      float p=uProgress,speed=p*p,roll=sin(p*4.1)*.025*speed;
      vec2 q=(uv-.5)*vec2(uViewport.x/uViewport.y,1.);
      vec2 tremor=vec2(sin(uTime*17.)+.36*sin(uTime*29.),cos(uTime*13.)+.3*sin(uTime*23.))*uShake/uViewport*speed;
      q+=tremor;q=mat2(cos(roll),-sin(roll),sin(roll),cos(roll))*q;
      vec3 ro=vec3(sin(p*2.4)*.7,1.4+p*.35,1.+uTravel*pow(p,2.7));
      vec3 rd=normalize(vec3(q*1.34,1.)),sun=normalize(vec3(-.45,.48,.75));
      float sunAngle=max(0.,dot(rd,sun));
      vec3 col=mix(vec3(.11,.2,.38),vec3(.55,.67,.83),smoothstep(-.45,.1,rd.y));
      col+=vec3(.82,.74,.57)*pow(sunAngle,48.)*.42;
      vec3 scattering=vec3(0.);float trans=1.,stepLength=38./float(uSteps);
      for(int i=0;i<40;i++){
        if(i>=uSteps||trans<.018)break;
        vec3 pos=ro+rd*(.3+(float(i)+.5)*stepLength);
        float d=density(pos);if(d<.007)continue;
        float shadow=density(pos+sun*1.9)*1.8+density(pos+sun*4.5)*1.1;
        float light=exp(-shadow);float silver=pow(sunAngle,12.)*light;
        vec3 cloud=mix(vec3(.23,.32,.49),vec3(.92,.95,1.),light*.72+silver*.18);
        cloud+=vec3(.12,.075,.065)*smoothstep(-1.,4.,pos.y)*light;
        float alpha=1.-exp(-d*stepLength*.84);scattering+=cloud*alpha*trans;trans*=1.-alpha;
      }
      col=col*trans+scattering;
      // Broad, monotonic immersion into white, held across the next shot boundary.
      col=mix(col,vec3(1.),smoothstep(.77,1.,p)*.94);
      col=mix(col,vec3(dot(col,vec3(.213,.715,.072))),uMono);result=vec4(col,1.);
    }`;
  // One SDF carries the keystone silhouette through the complete four-shape transformation.
  var sigilFragment=`#version 300 es
    precision highp float;in vec2 uv;out vec4 result;
    uniform vec2 uViewport,uCenter;uniform float uTime,uShape,uScale,uRotation,uOpacity,uMono,uFog,uLight,uRadius,uBackground,uMandala,uTitleAge,uAscension,uCurtains,uCamera;uniform int uCurtainLayers;
    uniform sampler2D uFogAtlas;
    float fbm(vec2 p){return texture(uFogAtlas,(p-vec2(0.,-8.))/16.).r;}
    float segment(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
    float field(vec2 p,float turn){
      float co=cos(turn),si=sin(turn);p=mat2(co,-si,si,co)*p;
      float a=atan(p.y,p.x),r=length(p),sector=6.2831853/6.;
      float hex=cos(floor(.5+a/sector)*sector-a)*r-.87,circle=r-.91;
      if(uShape<1.)return mix(hex,circle,smoothstep(0.,1.,uShape));
      float tooth=pow(.5+.5*cos(a*12.),2.8),star=r-(.54+.46*tooth);
      if(uShape<2.)return mix(circle,star,smoothstep(0.,1.,uShape-1.));
      float rings=min(abs(r-1.35),abs(r-1.47))-.009;
      float chevron=min(segment(p,vec2(-.19,1.67),vec2(0.,1.87)),segment(p,vec2(0.,1.87),vec2(.19,1.67)))-.012;
      float sigil=min(abs(star)-.013,min(rings,chevron));
      return mix(abs(star)-.014,sigil,smoothstep(0.,1.,uShape-2.));
    }
    float ink(vec2 p,float turn){float d=field(p,turn),line=exp(-abs(d)*105.);float halo=exp(-abs(d)*12.)*.11;float inside=(1.-smoothstep(-.3,0.,d))*(1.-smoothstep(1.6,2.1,uShape))*.06;return line+halo+inside;}
    void main(){
      if(uBackground>.5){vec3 haze=mix(vec3(.055,.065,.10),vec3(.071),uMono);result=vec4(haze,uOpacity);return;}
      float shorter=min(uViewport.x,uViewport.y),radius=uRadius*shorter*uScale;vec2 p=(uv-uCenter)*uViewport/(radius*uCamera);
      float split=1.1/radius;vec3 light=vec3(0.);
      float r=length(p);
      // Beyond this hull, even the widest exponential halo is below byte precision.
      // Haze and curtains still cover the whole screen.
      if(r<3.&&uOpacity>0.){
      // Shutter integration keeps the accelerating star continuous rather than strobing.
      if(uTitleAge<=0.)light=vec3(ink(p+vec2(split,0.),uRotation),ink(p,uRotation),ink(p-vec2(split,0.),uRotation));
      else for(int j=0;j<4;j++){float turn=uRotation-float(j)*min(.075,uTitleAge*.022);
        light+=vec3(ink(p+vec2(split,0.),turn),ink(p,turn),ink(p-vec2(split,0.),turn))*.25;}
      light=mix(light,vec3(dot(light,vec3(.213,.715,.072))),uMono)*uOpacity*(.8+uLight);
      float mandala=0.;for(int i=0;i<5;i++){float target=1.65+float(i)*.16;mandala+=exp(-abs(r-target)*145.)*.08*smoothstep(float(i)*.09,.85,uMandala);}
      light+=vec3(.83,.9,1.)*mandala*uOpacity;
      }
      // Three upward FBM strata, at different scales and speeds, fade the pool into haze.
      float mist=0.;if(uFog>0.)for(int layer=0;layer<3;layer++){float z=float(layer);vec2 q=uv*vec2(3.5+z*1.8,3.+z)+vec2(z*4.,-uTime*(.055+z*.025));float f=fbm(q);float fringe=fbm(q+vec2(.009,0.))-f;mist+=pow(max(0.,f-.23),2.)*(1.-smoothstep(.15,.82,uv.y))*(.5-z*.1);light+=vec3(.91,.95,1.)*fringe*.03*uFog;}
      light+=vec3(.83,.89,1.)*mist*uFog;
      // Pleated translucent sheets have independent depths, crests and thin-film edge dispersion.
      if(uCurtains>0.)for(int layer=0;layer<5;layer++){
        if(layer>=uCurtainLayers)break;float z=float(layer),rise=mix(.2,.9,uCurtains);
        float crest=rise*(.92+.08*sin(uv.x*5.+z*1.7+uTime*.2));
        float pleat=sin(uv.x*(34.+z*11.)+sin(uv.x*8.+uTime*.27+z)*1.5-uTime*(.17+z*.03));
        float ridge=pow(.5+.5*pleat,9.),body=(1.-smoothstep(crest-.08,crest+.04,uv.y))*smoothstep(0.,.09,uv.y);
        float edge=exp(-abs(uv.y-crest)*90.);vec3 pastel=.88+.1*cos(vec3(0.,2.1,4.2)+uv.x*2.+z);
        light+=pastel*body*(.022+ridge*.08)*(1.+uAscension)*uCurtains/(1.+z*.25);
        light+=pastel*edge*.065*uCurtains;
      }
      light+=vec3(1.)*uAscension*uAscension*.17;
      light=mix(light,vec3(dot(light,vec3(.213,.715,.072))),uMono);result=vec4(light,1.);
    }`;
  var windVertex=`#version 300 es
    precision highp float;layout(location=0)in vec4 aWind;uniform vec2 uViewport;uniform float uTime,uStrength,uConverge;out vec2 vStrip;out float vAlpha;out vec3 vColor;
    vec2 orbit(float t){float age=max(0.,t),speed=.055+min(age,9.)*.055,angle=aWind.y+age*speed*aWind.z;
      float r=aWind.x*(.98+.03*sin(age*.7+aWind.y*3.));vec2 p=vec2(cos(angle),sin(angle))*r;
      // A smooth curl field bends each history strip without changing its root trajectory.
      p+=vec2(sin(p.y*6.+age*.3),-cos(p.x*6.-age*.3))*.018*aWind.w;p*=1.-uConverge*.94;return p;}
    void main(){
      int corner=gl_VertexID;vec2 q=corner==0?vec2(0.,-1.):corner==1?vec2(1.,-1.):corner==2?vec2(0.,1.):corner==3?vec2(0.,1.):corner==4?vec2(1.,-1.):vec2(1.,1.);
      float history=.06+aWind.w*.14;vec2 head=orbit(uTime),tail=orbit(uTime-history),d=head-tail;
      vec2 normal=normalize(vec2(-d.y,d.x)+vec2(.0001));vec2 p=mix(tail,head,q.x)+normal*q.y*(.00028+aWind.w*.00045);
      p*=min(uViewport.x,uViewport.y)/uViewport;gl_Position=vec4(p*2.,0.,1.);vStrip=q;vAlpha=(.06+.1*aWind.w)*uStrength;
      vColor=.87+.11*cos(vec3(0.,2.1,4.2)+aWind.y);
    }`;
  var windFragment=`#version 300 es
    precision highp float;in vec2 vStrip;in float vAlpha;in vec3 vColor;uniform float uMono;out vec4 result;
    void main(){vec3 c=mix(vColor,vec3(dot(vColor,vec3(.213,.715,.072))),uMono);result=vec4(c,(1.-abs(vStrip.y))*sin(vStrip.x*3.1415926)*vAlpha);}`;
  C.crystalSceneEngine = { create: function (seed,descriptor) {
    descriptor=descriptor||C.rarity('mythical').openingIntro;
    var dawn=descriptor.kind==='prismatic',level=dawn?(descriptor.qualityLevel==null?2:descriptor.qualityLevel):['very-low','low','medium','high'].indexOf(C.settings.get('cinematicQuality')),resolution=dawn?[.5,.5,.75,1][level]:1;prismaticGeometry=dawn;
    var timeline=Object.create(null),offset=0;descriptor.sections.forEach(function(s){timeline[s.id]={start:offset,ms:s.ms/1000};offset+=s.ms/1000;});
    var caveMs=timeline.cave.ms,tipStart=timeline.tip.start,tipMs=timeline.tip.ms,fallStart=timeline.fall.start,fallMs=timeline.fall.ms,impactStart=timeline.impact.start,underStart=timeline.underwater.start,underMs=timeline.underwater.ms,ascendStart=(timeline.ascend||{start:15}).start,ascendMs=(timeline.ascend||{ms:.8}).ms;
    var random=rng((dawn?'prismatic-cave:':'crimson-cave:')+seed), canvas=root.document.createElement('canvas'), gl=null, lost=false, disposed=false;
    var programs=[], buffers=[], textures=[], frames=[], renderbuffers=[], stats={backend:'canvas',frames:0,drawCalls:0};
    var stoneMesh,crystalsMesh,heroMesh,waterMesh,tendrilMesh,splashMesh,pointBuffer,reflection,scene,bloom,blur,fogAtlas,mainProgram,waterProgram,pointsProgram,postProgram,bloomProgram,sigilProgram,windProgram,windBuffer;
    var hanging=[],caveArt=descriptor.caveArt||{},skyProgram=null,skyTarget=null,cloudTexture=null;
    // 300 ambient points + 20 bubbles + 40 impact droplets can coexist at the side-shot cut.
    var pulseTimeFactor=1,spinFactors=[1,1],intensityProfile='full',presentationFactor=1;var simulation=null,chainState=[],chainTime=null;var heroScreen=[.5,.3];var width=0,height=0,particleData=new Float32Array(1440),tendrilData=new Float32Array(22*32*6*6),particles=[];
    try { gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'}); } catch (_) {}
    canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();lost=true;stats.backend='canvas';});
    var gpu=null;
    function helpers(){return gpu||(gpu=C.cutsceneGL.create(gl,{programs:programs,textures:textures,frames:frames,renderbuffers:renderbuffers}));}
    function program(v,f){return helpers().program(v,f);}
    function uniform(p,key){return helpers().uniform(p,key);}
    function mesh(data,dynamic){var b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data instanceof Float32Array?data:new Float32Array(data),dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);return {buffer:b,count:data.length/6};}
    function target(){return helpers().target(true);}
    function sizeTarget(t,w,h){helpers().sizeTarget(t,w,h);}
    function rockPlane(out,axis,origin,u,v,cols,rows){var grid=[],normals=[];for(var y=0;y<=rows;y++){var row=[];for(var x=0;x<=cols;x++){var p=origin.slice(),relief=dawn?1:1+(caveArt.rockRelief||.68)*2;
      p[axis]+=(Math.sin(x*.41+y*.29)*.3+Math.sin(x*.9-y*.6)*.11+(random()-.5)*.13)*relief;
      if(!dawn)p[axis]+=Math.sin(x*.13+y*.07)*.26+Math.sin(y*.17)*Math.sin(x*.22)*.22;
      p[(axis+1)%3]+=u*x/cols;p[(axis+2)%3]+=v*y/rows;row.push(p);}grid.push(row);}
      for(var ny=0;ny<=rows;ny++){var normalRow=[];for(var nx=0;nx<=cols;nx++)normalRow.push(normalize(cross(sub(grid[Math.min(rows,ny+1)][nx],grid[Math.max(0,ny-1)][nx]),sub(grid[ny][Math.min(cols,nx+1)],grid[ny][Math.max(0,nx-1)]))));normals.push(normalRow);}
      function vertexAt(x,y){var p=grid[y][x],n=normals[y][x];out.push(p[0],p[1],p[2],n[0],n[1],n[2]);}
      for(var j=0;j<rows;j++)for(var i=0;i<cols;i++){vertexAt(i,j);vertexAt(i,j+1);vertexAt(i+1,j);vertexAt(i+1,j);vertexAt(i,j+1);vertexAt(i+1,j+1);}}
    function makeCloudVolume(){
      var n=descriptor.skyFlight.noiseSize,voxels=new Uint8Array(n*n*n),coarse=new Float32Array(16*16*16),r=rng('ascendant-cloud-volume:'+seed);
      for(var i=0;i<coarse.length;i++)coarse[i]=r();
      function sample(x,y,z,period){
        var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(x-ix),fy=smooth(y-iy),fz=smooth(z-iz);
        function at(a,b,c){var mask=period-1;return coarse[((c&mask)*16+(b&mask))*16+(a&mask)];}
        var a=mix(mix(at(ix,iy,iz),at(ix+1,iy,iz),fx),mix(at(ix,iy+1,iz),at(ix+1,iy+1,iz),fx),fy);
        var b=mix(mix(at(ix,iy,iz+1),at(ix+1,iy,iz+1),fx),mix(at(ix,iy+1,iz+1),at(ix+1,iy+1,iz+1),fx),fy);return mix(a,b,fz);
      }
      for(var z=0;z<n;z++)for(var y=0;y<n;y++)for(var x=0;x<n;x++)voxels[(z*n+y)*n+x]=Math.round(255*(sample(x*4/n,y*4/n,z*4/n,4)*.6+sample(x*8/n,y*8/n,z*8/n,8)*.28+sample(x*16/n,y*16/n,z*16/n,16)*.12));
      cloudTexture=gl.createTexture();textures.push(cloudTexture);gl.bindTexture(gl.TEXTURE_3D,cloudTexture);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,n,n,n,0,gl.RED,gl.UNSIGNED_BYTE,voxels);
      gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R].forEach(function(key){gl.texParameteri(gl.TEXTURE_3D,key,gl.REPEAT);});gl.generateMipmap(gl.TEXTURE_3D);
    }
    function prepare(){
      if(!gl)return;
      try{
        mainProgram=program(vertex,fragment);waterProgram=program(vertex,waterFragment);pointsProgram=program(pointVertex,pointFragment);
        if(dawn&&descriptor.skyFlight){skyProgram=program(screenVertex,skyFragment);skyTarget=helpers().target(false);makeCloudVolume();}
        if(dawn&&descriptor.ritual){
          sigilProgram=program(screenVertex,sigilFragment);windProgram=program(windVertex,windFragment);
          var fogProgram=program(screenVertex,fogFragment);fogAtlas=helpers().target(false);sizeTarget(fogAtlas,1024,1024);
          gl.useProgram(fogProgram.p);gl.viewport(0,0,fogAtlas.w,fogAtlas.h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        }
        postProgram=program(C.cutsceneGL.screenVertex,C.cutsceneGL.separableComposite());
        bloomProgram=program(C.cutsceneGL.screenVertex,C.cutsceneGL.bloomHorizontalFragment);
        var rocks=[],cluster=[],hero=[],water=[];
        rockPlane(rocks,1,[-9,5.7,-10],20,18,60,48);rockPlane(rocks,2,[-9,-2,-8],18,9,56,32);
        rockPlane(rocks,0,[-6,-2,-8],9,17,32,52);rockPlane(rocks,0,[6,-2,-8],9,17,32,52);
        crystal(rocks,0,dawn?5.85:5.7,0,.19,dawn?.52:.3,.2,rng('crimson-ceiling-socket'));
        if(!dawn){
          // Rock teeth and shelves overlap the wall grid in actual depth, rather than painted stripes.
          for(var ridge=0;ridge<32;ridge++){
            var side=ridge%2?-1:1,z=-7+(ridge>>1)*.72;
            crystal(rocks,side*(5.65+random()*.4),1.1+random()*3.2,z,.35+random()*.55,1.1+random()*2.7,random()*TAU,random);
            if(ridge%3===0)crystal(rocks,side*(2.6+random()*1.8),5.9,z,.24+random()*.4,.6+random()*.9,random()*TAU,random);
          }
          var groups=C.settings.get('cinematicQuality')==='high'?caveArt.highClusters:caveArt.clusters;
          for(var group=0;group<(groups||12);group++){
            var gx=(group%2?-1:1)*(1.5+random()*3.9),gz=group<4?3.2+random()*1.4:-6+random()*8,geometry=[];
            var length=group<4?2.1+random()*1.2:.9+random()*1.4;
            crystal(geometry,0,-length*.68,0,.13+length*.15,length,random()*TAU,random);
            for(var tooth=0;tooth<3;tooth++){var small=length*(.28+random()*.29);crystal(geometry,(random()-.5)*.75,-small*.68,(random()-.5)*.65,.07+small*.12,small,random()*TAU,random);}
            hanging.push({mesh:mesh(geometry),x:gx,y:5.65,z:gz,phase:random()*TAU,weight:.55+random()*.45});
          }
        }
        // Strong foreground silhouettes and smaller nested clusters avoid a repeated picket fence.
        var clusterX=0,clusterZ=0;for(var i=0;i<(dawn?(level===3?140:level===2?90:60):(C.settings.get('cinematicQuality')==='high'?56:36));i++){var x=(random()-.5)*12,z=-7+random()*10;if(dawn){if(i%5===0){clusterX=x;clusterZ=z;}else{x=clusterX+(random()-.5)*.8;z=clusterZ+(random()-.5)*.8;}}if(Math.abs(x)<1.1&&z>-1) x+=x<0?-1.6:1.6;var length=(dawn?.6:.35)+Math.pow(random(),2)*(dawn?3.9:1.65);crystal(cluster,x,5.55-length*.5,z,.09+length*.14,length,random()*TAU,random);}
        for(var j=0;j<20;j++){var side=j%2?-1:1;crystal(cluster,side*(4.7+random()*.6),1+random()*3.5,-6+random()*9,.12+random()*.16,.4+random()*.7,random()*TAU,random);}
        crystal(hero,0,0,0,.35,1.2,.18,rng('crimson-hero:'+seed));
        triangle(water,[-18,0,-18],[-18,0,18],[18,0,-18]);triangle(water,[18,0,-18],[-18,0,18],[18,0,18]);
        stoneMesh=mesh(rocks);crystalsMesh=mesh(cluster);heroMesh=mesh(hero);waterMesh=mesh(water);tendrilMesh=mesh(tendrilData,true);splashMesh=mesh(new Float32Array(40*6*6),true);
        pointBuffer=gl.createBuffer();buffers.push(pointBuffer);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);gl.bufferData(gl.ARRAY_BUFFER,particleData,gl.DYNAMIC_DRAW);
        if(sigilProgram){
          var wind=new Float32Array(descriptor.ritual.windCount*4),windRandom=rng('prismatic-wind:'+seed);
          for(var wi=0;wi<wind.length;wi+=4){wind[wi]=.17+Math.sqrt(windRandom())*.58;wind[wi+1]=windRandom()*TAU;wind[wi+2]=.65+windRandom()*.7;wind[wi+3]=windRandom();}
          windBuffer=gl.createBuffer();buffers.push(windBuffer);gl.bindBuffer(gl.ARRAY_BUFFER,windBuffer);gl.bufferData(gl.ARRAY_BUFFER,wind,gl.STATIC_DRAW);
        }
        for(var k=0;k<300;k++)particles.push({x:(random()-.5)*13,y:-4+random()*10,z:-6+random()*13,size:.12+Math.pow(random(),5)*1.1,phase:random()*TAU});
        var size=256,pixels=new Uint8Array(size*size*4),noise=[];
        for(var q=0;q<32*32;q++)noise.push(random());
        function sample(x,y){var xx=(x%32+32)%32,yy=(y%32+32)%32,ix=Math.floor(xx),iy=Math.floor(yy),fx=smooth(xx-ix),fy=smooth(yy-iy);return mix(mix(noise[iy*32+ix],noise[iy*32+(ix+1)%32],fx),mix(noise[((iy+1)%32)*32+ix],noise[((iy+1)%32)*32+(ix+1)%32],fx),fy);}
        for(var py=0;py<size;py++)for(var px=0;px<size;px++){var coarse=sample(px/16,py/16),detail=sample(px/4,py/4),n=coarse*.65+detail*.35,index=(py*size+px)*4;pixels[index]=Math.round(n*255);pixels[index+1]=Math.round((sample(px/16+.12,py/16)-coarse+.5)*255);pixels[index+2]=Math.round((sample(px/16,py/16+.12)-coarse+.5)*255);pixels[index+3]=Math.round((.35+detail*.6)*255);}
        var texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);mainProgram.stone=texture;
        reflection=target();scene=target();bloom=target();blur=target();if(dawn&&level>=2)makeSimulation(level===3?256:128);stats.backend='webgl2';
      }catch(error){stats.failure=error.message;dispose();}
    }
    function makeSimulation(n){
      var texture=gl.createTexture();textures.push(texture);simulation={n:n,a:new Float32Array(n*n),b:new Float32Array(n*n),old:new Float32Array(n*n),pixels:new Uint8Array(n*n*4),texture:texture,last:null,impact:false};
      gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    }
    function simulateWater(t){
      if(!simulation||level<2)return;var f=simulation,n=f.n;
      if(f.last===null||t<f.last||t-f.last>.5){f.a.fill(0);f.b.fill(0);f.old.fill(0);f.last=t;f.impact=false;}
      if(t>=impactStart&&!f.impact){var age=t-impactStart;for(var y=0;y<n;y++)for(var x=0;x<n;x++){var r=Math.hypot(x-n*.5,y-n*.5)/(n*.0625);f.a[y*n+x]=Math.cos(r*5.-age*8.)*Math.exp(-r*r*.9)*.12*Math.exp(-age*.5);}f.impact=true;}
      var steps=Math.min(8,Math.floor((t-f.last)*60));
      for(var k=0;k<steps;k++){for(var row=1;row<n-1;row++)for(var col=1;col<n-1;col++){var at=row*n+col;f.b[at]=(2*f.a[at]-f.old[at]+.22*(f.a[at-1]+f.a[at+1]+f.a[at-n]+f.a[at+n]-4*f.a[at]))*.997;}var prev=f.old;f.old=f.a;f.a=f.b;f.b=prev;f.last+=1/60;}
      for(var i=0;i<f.a.length;i++){var at=i*4;f.pixels[at]=Math.max(0,Math.min(255,128+f.a[i]*600));f.pixels[at+1]=f.pixels[at+2]=f.pixels[at];f.pixels[at+3]=255;}
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,f.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,f.pixels);
    }
    function dispose(){if(disposed)return;if(gl&&!lost){buffers.forEach(function(b){gl.deleteBuffer(b);});textures.forEach(function(t){gl.deleteTexture(t);});frames.forEach(function(f){gl.deleteFramebuffer(f);});renderbuffers.forEach(function(r){gl.deleteRenderbuffer(r);});programs.forEach(function(p){gl.deleteProgram(p);});}disposed=true;canvas.width=canvas.height=1;gl=null;stats.backend='canvas';}
    function drawMesh(p,m,transform){gl.uniformMatrix4fv(uniform(p,'uModel'),false,transform||identity);gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,m.count);stats.drawCalls++;}
    function scenePass(vp,eye,hero,heroX,angle,t,under,clip,reflectVP,impact){
      gl.useProgram(mainProgram.p);gl.uniformMatrix4fv(uniform(mainProgram,'uVP'),false,vp);gl.uniform3fv(uniform(mainProgram,'uEye'),eye);gl.uniform3fv(uniform(mainProgram,'uHero'),[heroX,hero,0]);gl.uniform3fv(uniform(mainProgram,'uRuby'),descriptor.color.map(function(v){return v/255;}));gl.uniform1f(uniform(mainProgram,'uDawn'),dawn?1:0);gl.uniform1f(uniform(mainProgram,'uCrack'),t<fallStart?smooth(((t-tipStart)/tipMs-.22)/.7):0);gl.uniform1f(uniform(mainProgram,'uTime'),t);gl.uniform1f(uniform(mainProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);gl.uniform1f(uniform(mainProgram,'uUnder'),under?1:0);gl.uniform1f(uniform(mainProgram,'uClip'),clip?1:0);gl.uniform1f(uniform(mainProgram,'uPulse'),impact>=0?.6+(intensityProfile==='safe'?.09:.3)*Math.sin(t*3*(intensityProfile==='safe'?presentationFactor:1)):.15);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mainProgram.stone);gl.uniform1i(uniform(mainProgram,'uStone'),0);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,clip?mainProgram.stone:reflection.texture);gl.uniform1i(uniform(mainProgram,'uGlass'),2);gl.uniform2f(uniform(mainProgram,'uViewport'),clip?reflection.w:width,clip?reflection.h:height);
      gl.uniform1f(uniform(mainProgram,'uWetness'),dawn?0:caveArt.wetness||.58);gl.uniform1f(uniform(mainProgram,'uHeroLight'),dawn?1:caveArt.heroLight||1.15);
      gl.uniform1f(uniform(mainProgram,'uMaterial'),0);drawMesh(mainProgram,stoneMesh);gl.uniform1f(uniform(mainProgram,'uMaterial'),1);drawMesh(mainProgram,crystalsMesh);
      hanging.forEach(function(cluster,index){
        if(index>=(level===3?caveArt.highClusters:caveArt.clusters))return;
        var tremor=t>=tipStart&&t<fallStart?smooth((t-tipStart)/tipMs)*Math.sin(t*19+cluster.phase)*.009:0;
        var sway=Math.sin(t*.65+cluster.phase)*(caveArt.sway||.012)*cluster.weight+tremor;
        drawMesh(mainProgram,cluster.mesh,model(cluster.x,cluster.y,cluster.z,1,sway));
      });
      gl.uniform1f(uniform(mainProgram,'uMaterial'),3);drawMesh(mainProgram,heroMesh,model(heroX,hero,0,1.35,angle));
      if(!dawn&&t>tipStart+tipMs*.32&&t<impactStart){
        // The joint sheds solid chips first; their paths continue through the hero release.
        for(var chip=0;chip<8;chip++){var age=t-tipStart-tipMs*.32-chip*.07;if(age<0)continue;
          drawMesh(mainProgram,heroMesh,model(Math.sin(chip*2.399)*age*.32,5.45-age*age*1.65,Math.cos(chip*2.399)*age*.25,.025+(chip%3)*.015,chip+age*2));}
      }
      if(impact>=0&&impact<.8){gl.uniform1f(uniform(mainProgram,'uMaterial'),dawn?2:4);drawMesh(mainProgram,splashMesh);}
      if(under&&!clip){gl.uniform1f(uniform(mainProgram,'uMaterial'),2);drawMesh(mainProgram,tendrilMesh);}
      if(!clip){gl.useProgram(waterProgram.p);gl.uniformMatrix4fv(uniform(waterProgram,'uVP'),false,vp);gl.uniformMatrix4fv(uniform(waterProgram,'uReflectVP'),false,reflectVP);gl.uniform3fv(uniform(waterProgram,'uEye'),eye);gl.uniform3fv(uniform(waterProgram,'uRuby'),descriptor.color.map(function(v){return v/255;}));gl.uniform1f(uniform(waterProgram,'uDawn'),dawn?1:0);gl.uniform1f(uniform(waterProgram,'uOmen'),smooth((t-ascendStart)/ascendMs));gl.uniform1f(uniform(waterProgram,'uTime'),t);gl.uniform1f(uniform(waterProgram,'uImpact'),impact);gl.uniform1f(uniform(waterProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);gl.uniform1f(uniform(waterProgram,'uUnder'),under?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,reflection.texture);gl.uniform1i(uniform(waterProgram,'uReflection'),0);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,simulation&&level>=2?simulation.texture:mainProgram.stone);gl.uniform1i(uniform(waterProgram,'uHeight'),3);gl.uniform1f(uniform(waterProgram,'uSim'),dawn&&simulation&&level>=2?1:0);drawMesh(waterProgram,waterMesh);}
    }
    function tendrils(t,hero,progress,angle){
      var strands=dawn?(level===3?20:level===2?10:6):12,segments=dawn?28:32,offset=0;
      function put(a,b,c){var n=normalize(cross(sub(b,a),sub(c,a)));[a,b,c].forEach(function(p){for(var j=0;j<3;j++)tendrilData[offset++]=p[j];for(var k=0;k<3;k++)tendrilData[offset++]=n[k];});}
      var reset=chainTime===null||t<chainTime||t-chainTime>.3,dt=reset?1/60:Math.max(0,Math.min(.04,t-chainTime));
      for(var i=0;i<strands;i++){
        var a=i*TAU/strands,rx=Math.cos(angle)*Math.cos(a)*.24-Math.sin(angle)*.15,ry=hero+Math.sin(angle)*Math.cos(a)*.24+Math.cos(angle)*.15,rz=Math.sin(a)*.24;
        var length=(1.1+(i%4)*.27)*smooth(progress/.35),chain=chainState[i];
        if(dawn&&level>=2){
          if(reset||!chain){chain=chainState[i]=[];for(var s=0;s<=segments;s++){var u=s/segments,p=[rx+Math.cos(a)*u*.35,ry-u*length,rz+Math.sin(a)*u*.35];chain.push({p:p,old:p.slice()});}}
          var root=chain[0];root.p=[rx,ry,rz];root.old=root.p.slice();
          for(var s=1;s<=segments;s++){var item=chain[s],pos=item.p.slice(),u=s/segments,damping=.96;
            for(var axis=0;axis<3;axis++){var force=axis===1?-.48:Math.sin(u*7+t*.8+i*2.399+axis*2.1)*.45;item.p[axis]+=(item.p[axis]-item.old[axis])*damping+force*dt*dt;}item.old=pos;}
          var step=length/segments;
          for(var iteration=0;iteration<4;iteration++)for(var s=1;s<=segments;s++){var prev=chain[s-1].p,next=chain[s].p,d=sub(next,prev),mag=Math.hypot.apply(Math,d)||1,ratio=(mag-step)/mag;for(var axis=0;axis<3;axis++){if(s>1)prev[axis]+=d[axis]*ratio*.5;next[axis]-=d[axis]*ratio*(s===1?1:.5);}}
        }
        for(var j=0;j<segments;j++){var points=[];for(var end=0;end<2;end++){var u=(j+end)/segments,p;
          if(dawn&&level>=2)p=chain[j+end].p;else p=[rx+Math.cos(a)*u*u*.65+Math.sin(u*6-t*1.4+i)*u*.23,ry+(dawn?-1:1)*u*length,rz+Math.sin(a)*u*u*.65+Math.cos(u*7-t+i)*u*.22];
          var pulse=Math.exp(-Math.pow((u-((t/1.1+i*.13)%1))*12,2)),width=.022*(1-u*.88)*(1+pulse*.5);points.push([[p[0]-width,p[1],p[2]],[p[0]+width,p[1],p[2]]]);}
          put(points[0][0],points[1][0],points[0][1]);put(points[0][1],points[1][0],points[1][1]);}
      }
      chainTime=t;gl.bindBuffer(gl.ARRAY_BUFFER,tendrilMesh.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,tendrilData);tendrilMesh.count=strands*segments*6;
    }
    function ritualPass(t,w,h,opacity){
      if(!sigilProgram||t<ascendStart)return;
      var cfg=descriptor.ritual,holdStart=timeline.clock.start+(descriptor.clock.alignStartMs+descriptor.clock.alignMs)/1000,hold=descriptor.clock.holdMs/1000;
      var animationTime=t<holdStart?t:t<holdStart+hold?holdStart:t-hold;var age=Math.max(0,t-timeline.topPulse.start),duration=timeline.topPulse.ms;
      var cycles=(age*cfg.pulseHzStart+age*age*(cfg.pulseHzEnd-cfg.pulseHzStart)/(2*duration))*pulseTimeFactor,fraction=cycles-Math.floor(cycles);
      var pulse=t>=timeline.topPulse.start&&t<timeline.morph.start?clamp(Math.exp(-fraction*8)*Math.sin(fraction*Math.PI*5)/.49):0;
      var ascension=timeline.aurora?smooth((t-timeline.aurora.start)/descriptor.climax.riseMs*1000):0;var arrival=smooth((t-ascendStart)/ascendMs),shape=3*smooth((t-timeline.morph.start)/timeline.morph.ms),rotation=.015*Math.sin(animationTime*.3);
      if(t>=timeline.title.start){rotation=TAU*C.cutsceneMath.starTurns(t-timeline.title.start,timeline.title.ms+timeline.shatter.ms,cfg.starMaxRps,spinFactors);}
      gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.useProgram(sigilProgram.p);
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,fogAtlas.texture);gl.uniform1i(uniform(sigilProgram,'uFogAtlas'),3);
      gl.uniform2f(uniform(sigilProgram,'uViewport'),width,height);gl.uniform2f(uniform(sigilProgram,'uCenter'),mix(heroScreen[0],.5,arrival),mix(1-heroScreen[1],.5,arrival));
      gl.uniform1f(uniform(sigilProgram,'uRadius'),Math.min(cfg.sigilRadius,Math.min(h,w/2.39)*.23/Math.min(w,h)));gl.uniform1f(uniform(sigilProgram,'uTime'),animationTime);gl.uniform1f(uniform(sigilProgram,'uShape'),shape);
      gl.uniform1f(uniform(sigilProgram,'uScale'),mix(.28,1,arrival)*(1+pulse*cfg.pulseScale));gl.uniform1f(uniform(sigilProgram,'uRotation'),rotation);
      gl.uniform1f(uniform(sigilProgram,'uOpacity'),smooth((t-ascendStart)/.55)*opacity);gl.uniform1f(uniform(sigilProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);
      gl.uniform1f(uniform(sigilProgram,'uAscension'),ascension);gl.uniform1f(uniform(sigilProgram,'uCurtains'),ascension);
      gl.uniform1i(uniform(sigilProgram,'uCurtainLayers'),level===3?descriptor.climax.curtainLayers:level===2?4:3);
      var camera=timeline.aurora?(t<timeline.aurora.start+1?smooth((t-timeline.aurora.start)/1):smooth((t-timeline.aurora.start-1)/1.6)):0;
      gl.uniform1f(uniform(sigilProgram,'uCamera'),!timeline.aurora||t<timeline.aurora.start?1:t<timeline.aurora.start+1?mix(1,.87,camera):mix(.87,1.3,camera));
      gl.uniform1f(uniform(sigilProgram,'uMandala'),(t-timeline.topPulse.start)/timeline.topPulse.ms);gl.uniform1f(uniform(sigilProgram,'uTitleAge'),Math.max(0,t-timeline.title.start));
      gl.uniform1f(uniform(sigilProgram,'uFog'),smooth((t-ascendStart)/3)*.7);gl.uniform1f(uniform(sigilProgram,'uLight'),pulse*cfg.pulseLight);
      // Fade the reflected pool into haze before the scene geometry retires at the clock.
      gl.uniform1f(uniform(sigilProgram,'uBackground'),1);gl.uniform1f(uniform(sigilProgram,'uOpacity'),smooth((t-timeline.morph.start)/timeline.morph.ms));gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,3);
      gl.uniform1f(uniform(sigilProgram,'uBackground'),0);gl.uniform1f(uniform(sigilProgram,'uOpacity'),smooth((t-ascendStart)/.55)*opacity);gl.blendFunc(gl.ONE,gl.ONE);gl.drawArrays(gl.TRIANGLES,0,3);stats.drawCalls+=2;
      gl.useProgram(windProgram.p);gl.uniform2f(uniform(windProgram,'uViewport'),width,height);gl.uniform1f(uniform(windProgram,'uTime'),animationTime-ascendStart);gl.uniform1f(uniform(windProgram,'uConverge'),ascension);gl.uniform1f(uniform(windProgram,'uStrength'),smooth((t-ascendStart)/2)*opacity);gl.uniform1f(uniform(windProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);
      gl.bindBuffer(gl.ARRAY_BUFFER,windBuffer);gl.enableVertexAttribArray(0);gl.disableVertexAttribArray(1);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);gl.vertexAttribDivisor(0,1);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLES,0,6,Math.floor(cfg.windCount*[0,.25,.5,1][level]));gl.vertexAttribDivisor(0,0);gl.disable(gl.BLEND);stats.drawCalls++;
    }
    function composite(t,rw,rh){
        gl.useProgram(postProgram.p);gl.uniform1i(uniform(postProgram,'uBloomRaw'),0);var burst=0;if(dawn&&timeline.explosion){var burstAge=(t-timeline.explosion.start)/(descriptor.climax.aberrationMs/1000);if(burstAge>=0&&burstAge<=1)burst=Math.sin(burstAge*Math.PI);}
        gl.uniform1f(uniform(postProgram,'uBurst'),burst);gl.uniform1f(uniform(postProgram,'uDawn'),dawn?1:0);gl.uniform1f(uniform(postProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);gl.uniform1f(uniform(postProgram,'uHigh'),level===3?1:0);gl.uniform1f(uniform(postProgram,'uTime'),t);gl.uniform2f(uniform(postProgram,'uPixel'),1/rw,1/rh);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,scene.texture);gl.uniform1i(uniform(postProgram,'uScene'),0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mainProgram.stone);gl.uniform1i(uniform(postProgram,'uBloom'),1);gl.uniform1f(uniform(postProgram,'uPass'),1);gl.bindFramebuffer(gl.FRAMEBUFFER,bloom.f);gl.viewport(0,0,bloom.w,bloom.h);gl.drawArrays(gl.TRIANGLES,0,3);
        gl.useProgram(bloomProgram.p);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,bloom.texture);gl.uniform1i(uniform(bloomProgram,'uBloom'),1);gl.uniform2f(uniform(bloomProgram,'uPixel'),1/rw,1/rh);gl.bindFramebuffer(gl.FRAMEBUFFER,blur.f);gl.viewport(0,0,blur.w,blur.h);gl.drawArrays(gl.TRIANGLES,0,3);
        gl.useProgram(postProgram.p);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,bloom.texture);gl.uniform1i(uniform(postProgram,'uBloomRaw'),2);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,blur.texture);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,rw,rh);gl.uniform1f(uniform(postProgram,'uPass'),0);gl.drawArrays(gl.TRIANGLES,0,3);
    }
    function paint(w,h,t){
      if(!gl||lost||disposed)return null;
      try {
        var cfg=C.config.rarityIntro,budget=C.settings.get('cinematicQuality')==='high'?cfg.mythicalMaxPixels:cfg.mythicalMediumPixels,dpr=Math.min(root.devicePixelRatio||1,cfg.maxDpr,C.settings.policy.dpr,Math.sqrt(budget/(w*h))),rw=Math.max(1,Math.floor(w*dpr)),rh=Math.max(1,Math.floor(h*dpr));
        if(dawn){var desired=[.5,.5,.75,1][level];resolution+=Math.max(-.015,Math.min(.015,desired-resolution));dpr*=resolution;rw=Math.max(1,Math.floor(w*dpr));rh=Math.max(1,Math.floor(h*dpr));}
        if(width!==rw||height!==rh){width=rw;height=rh;canvas.width=rw;canvas.height=rh;sizeTarget(scene,rw,rh);sizeTarget(reflection,Math.max(1,rw>>1),Math.max(1,rh>>1));sizeTarget(bloom,Math.max(1,rw>>1),Math.max(1,rh>>1));sizeTarget(blur,rw,Math.max(1,rh>>1));}
        if(skyProgram&&t<timeline.cave.start){
          var flight=descriptor.skyFlight;sizeTarget(skyTarget,Math.max(1,rw>>1),Math.max(1,rh>>1));
          gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.useProgram(skyProgram.p);gl.viewport(0,0,skyTarget.w,skyTarget.h);
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,cloudTexture);gl.uniform1i(uniform(skyProgram,'uCloud'),0);
          gl.uniform2f(uniform(skyProgram,'uViewport'),rw,rh);gl.uniform1f(uniform(skyProgram,'uProgress'),clamp(t/(flight.endMs/1000)));
          gl.uniform1f(uniform(skyProgram,'uTravel'),flight.travel);gl.uniform1f(uniform(skyProgram,'uShake'),intensityProfile==='safe'?Math.min(flight.shakePx,1.2):flight.shakePx);
          gl.uniform1f(uniform(skyProgram,'uTime'),t);gl.uniform1f(uniform(skyProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);
          gl.uniform1i(uniform(skyProgram,'uSteps'),level===3?flight.highSteps:level===2?flight.mediumSteps:flight.lowSteps);gl.drawArrays(gl.TRIANGLES,0,3);
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER,skyTarget.f);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,scene.f);
          gl.blitFramebuffer(0,0,skyTarget.w,skyTarget.h,0,0,rw,rh,gl.COLOR_BUFFER_BIT,gl.LINEAR);
          composite(t,rw,rh);stats.drawCalls=4;stats.frames++;return canvas;
        }
        if(!dawn||!sigilProgram||t<timeline.clock.start)simulateWater(t);var hero=4.35,heroX=0,angle=0,eye=[mix(2.6,1.1,smooth((t-timeline.cave.start)/caveMs)),2.6,mix(9.6,7.9,smooth((t-timeline.cave.start)/caveMs))],targetPoint=[0,2.55,-.35],impact=t>=impactStart?t-impactStart:-1,under=t>=underStart;
        if(t>=tipStart){var tip=smooth((t-tipStart)/(tipMs*(caveArt.pauseAt||.72))),tipAngle=caveArt.tipAngle||.23;angle=tip*tipAngle+Math.sin(t*17)*.003*tip;if(dawn){var k=clamp((t-tipStart)/Math.max(.01,tipMs-.4));angle=(k<.34?mix(0,2,smooth(k/.34)):k<.68?mix(2,4,smooth((k-.34)/.34)):mix(4,7,smooth((k-.68)/.32)))*Math.PI/180;}heroX=Math.sin(angle)*1.1016;hero+=1.1016*(1-Math.cos(angle));}
        if(!dawn){
          var establish=smooth((t-timeline.cave.start)/caveMs);
          eye=[mix(2.9,1.05,establish),mix(2.15,2.75,establish),mix(10.4,7.9,establish)];targetPoint=[0,mix(2.65,3.1,establish),-.2];
          if(t>=tipStart){var focus=smooth((t-tipStart)/tipMs);eye[0]=mix(1.05,.72,focus);eye[2]=mix(7.9,7.1,focus);targetPoint[1]=mix(3.1,3.6,focus);}
        }
        if(t>=fallStart){var fall=clamp((t-fallStart)/fallMs);if(dawn)fall=fall*(.35+.65*fall);var releaseAngle=dawn?7*Math.PI/180:caveArt.tipAngle||.23;hero=mix(4.35+1.1016*(1-Math.cos(releaseAngle)),-.15,fall*fall);heroX=Math.sin(releaseAngle)*1.1016*(1-fall*.7);angle=releaseAngle+fall*.63;eye=[dawn?.9:mix(.72,.9,smooth(fall)),mix(dawn?2.6:2.75,1.55,smooth(fall)),mix(dawn?7.9:7.1,6.3,smooth(fall))];targetPoint=[0,mix(dawn?2.55:3.6,.5,smooth(fall)),0];}
        if(t>=impactStart&&t<underStart){eye=[.9,1.55,6.3];targetPoint=[0,.5,0];}
        if(under){var p=clamp((t-underStart)/(dawn?5:underMs));heroX=0;hero=-.15-1.8*(1-Math.pow(1-p,3));angle=(dawn?7*Math.PI/180+.63:(caveArt.tipAngle||.23)+.63)+(t-underStart)*.11;eye=[mix(3.9,3.1,smooth(p)),mix(-.7,-1.3,smooth(p)),mix(5.7,4.6,smooth(p))];targetPoint=[0,hero+.1,0];if(!dawn||!sigilProgram||t<timeline.clock.start)tendrils(t,hero,dawn?clamp((t-(timeline.tendrils||timeline.underwater).start)/2.5):p,angle);}
        if(impact>=0&&impact<.8){var crown=[],r=.35+impact*.8,raise=Math.sin(impact/.8*Math.PI)*.38;for(var seg=0;seg<40;seg++){var a=seg*TAU/40,b=(seg+1)*TAU/40,h0=raise*(.5+.5*Math.pow(Math.sin(seg*2.1),2)),h1=raise*(.5+.5*Math.pow(Math.sin((seg+1)*2.1),2));triangle(crown,[Math.cos(a)*r,.015,Math.sin(a)*r],[Math.cos(b)*r,.015,Math.sin(b)*r],[Math.cos(a)*(r+.08),h0,Math.sin(a)*(r+.08)]);triangle(crown,[Math.cos(a)*(r+.08),h0,Math.sin(a)*(r+.08)],[Math.cos(b)*r,.015,Math.sin(b)*r],[Math.cos(b)*(r+.08),h1,Math.sin(b)*(r+.08)]);}gl.bindBuffer(gl.ARRAY_BUFFER,splashMesh.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(crown));}
        if(t>=ascendStart){var ascend=smooth((t-ascendStart)/ascendMs);
          var side=smooth(clamp((ascendStart-underStart)/(dawn?5:underMs)));
          eye=[mix(dawn?mix(3.9,3.1,side):3.1,.03,ascend),mix(dawn?mix(-.7,-1.3,side):-1.3,4.6,ascend),mix(dawn?mix(5.7,4.6,side):4.6,.035,ascend)];
          targetPoint=[0,mix(dawn?hero+.1:-1.85,0,ascend),0];under=eye[1]<0;}
        // Portrait widens the camera distance instead of cropping the hero's fall.
        if(w/h<.8){eye[2]*=1.65;eye[0]*=.75;}
        var roll=dawn&&t>=ascendStart?Math.sin(clamp((t-ascendStart)/ascendMs)*Math.PI)*.12:0;var proj=projection(w/h),vp=multiply(proj,view(eye,targetPoint,[Math.sin(roll),Math.cos(roll),0])),clipW=vp[3]*heroX+vp[7]*hero+vp[15];heroScreen=[.5+(vp[0]*heroX+vp[4]*hero+vp[12])/clipW*.5,.5-(vp[1]*heroX+vp[5]*hero+vp[13])/clipW*.5];var mirrorEye=[eye[0],-eye[1],eye[2]],mirrorTarget=[targetPoint[0],-targetPoint[1],targetPoint[2]],reflectVP=multiply(proj,view(mirrorEye,mirrorTarget,[0,-1,0]));
        gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.disable(gl.DITHER);stats.drawCalls=0;
        gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,mainProgram.stone);gl.bindFramebuffer(gl.FRAMEBUFFER,reflection.f);gl.viewport(0,0,reflection.w,reflection.h);gl.clearColor(dawn?.02:.005,dawn?.024:.001,dawn?.039:.003,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!under&&!(dawn&&sigilProgram&&t>=timeline.clock.start))scenePass(reflectVP,mirrorEye,hero,heroX,angle,t,false,true,reflectVP,impact);
        gl.bindFramebuffer(gl.FRAMEBUFFER,scene.f);gl.viewport(0,0,rw,rh);gl.clearColor(dawn?.02:.008,dawn?.024:.001,dawn?.039:.004,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!(dawn&&sigilProgram&&t>=timeline.clock.start))scenePass(vp,eye,hero,heroX,angle,t,under,false,reflectVP,impact);
        var allowance=C.settings.policy.particles,count=Math.floor((C.settings.get('cinematicQuality')==='high'?300:160)*allowance);
        for(var i=0;i<count;i++){var p=particles[i],at=i*4;particleData[at]=p.x+Math.sin(t*.15+p.phase)*.12;particleData[at+1]=p.y+Math.sin(t*.13+p.phase)*.1;particleData[at+2]=p.z;particleData[at+3]=p.size;}
        if(allowance>0&&t>=tipStart+tipMs*.28&&t<fallStart){for(var chip=0;chip<32;chip++){var age=Math.max(0,t-tipStart-tipMs*.28-chip*.023),pos=(count+chip)*4;particleData[pos]=Math.sin(chip*2.39)*age*.21;particleData[pos+1]=5.43-age*age*1.6;particleData[pos+2]=Math.cos(chip*2.39)*age*.18;particleData[pos+3]=.10+(chip%4)*.035;}count+=32;}
        if(allowance>0&&under){for(var bubble=0;bubble<20;bubble++){var phase=bubble*.618,bi=(count+bubble)*4;particleData[bi]=Math.sin(bubble*2.399)*(.45+(bubble%3)*.22)+Math.sin(t+phase)*.025;particleData[bi+1]=hero+((t-underStart)*.28+phase)%2.6;particleData[bi+2]=Math.cos(bubble*2.399)*.6;particleData[bi+3]=-(.17+(bubble%4)*.035);}count+=20;}
        if(dawn&&allowance>0&&under){for(var spore=0;spore<chainState.length;spore++){var chain=chainState[spore],tip=chain[chain.length-1].p,si=count*4,age=(t+spore*.618)%1.1;particleData[si]=tip[0]+Math.sin(spore*2.399+age)*age*.08;particleData[si+1]=tip[1]+age*.13;particleData[si+2]=tip[2];particleData[si+3]=.085*(1-age/1.1);count++;}}
        // Impact droplets follow analytic ballistic paths and never enter saved state.
        if(allowance>0&&impact>=0&&impact<1.4){for(var j=0;j<40;j++){var a=j*2.399,s=.7+(j%7)*.17,k=(count+j)*4;particleData[k]=Math.cos(a)*impact*s;particleData[k+1]=impact*(2.5+(j%5)*.2)-impact*impact*3;particleData[k+2]=Math.sin(a)*impact*s;particleData[k+3]=.13;}count+=40;}
        gl.useProgram(pointsProgram.p);gl.uniformMatrix4fv(uniform(pointsProgram,'uVP'),false,vp);gl.uniform1f(uniform(pointsProgram,'uDpr'),dpr);gl.uniform3fv(uniform(pointsProgram,'uRuby'),descriptor.color.map(function(v){return v/255;}));gl.uniform1f(uniform(pointsProgram,'uMono'),C.config.rarityColorMode==='mono'?1:0);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,particleData);gl.enableVertexAttribArray(0);gl.disableVertexAttribArray(1);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);gl.drawArrays(gl.POINTS,0,dawn&&sigilProgram&&t>=timeline.clock.start?0:count);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
        if(dawn&&sigilProgram)ritualPass(t,w,h,1);
        composite(t,rw,rh);stats.frames++;return canvas;
      }catch(error){stats.failure=error.message;dispose();return null;}
    }
    prepare();return {paint:paint,dispose:dispose,setProfile:function(value){intensityProfile=value;},setPresentationFactor:function(value){presentationFactor=value;},setPulseFactor:function(value){pulseTimeFactor=value;},setSpinFactors:function(value){spinFactors=value;},setQuality:function(next){level=next;chainTime=null;if(gl&&dawn&&level>=2&&(!simulation||simulation.n!==(level===3?256:128)))makeSimulation(level===3?256:128);},stats:stats,get anchor(){return heroScreen;},get canvas(){return canvas;}};
  } };
})(window.Cardable, window);
