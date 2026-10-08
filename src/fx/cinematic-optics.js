(function(C){
  'use strict';
  // Shared high-tier optical recipes. Existing Medium/Low shader strings stay intact.
  C.cinematicOptics={
    catmull:function(points,p){p=Math.max(0,Math.min(.999999,p));var u=p*(points.length-3),i=Math.floor(u),t=u-i;return points[i].map(function(_,a){var p0=points[i][a],p1=points[i+1][a],p2=points[i+2][a],p3=points[i+3][a];return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);});},
    material:`
      const float PI=3.14159265;
      float Dggx(float nh,float r){float a=r*r,a2=a*a,d=nh*nh*(a2-1.)+1.;return a2/(PI*d*d+.0001);}
      float Gschlick(float nv,float r){float k=(r+1.)*(r+1.)/8.;return nv/(nv*(1.-k)+k+.0001);}
      vec3 Fschlick(float vh,vec3 f0){return f0+(1.-f0)*pow(1.-vh,5.);}
      vec3 envLight(vec3 d){return mix(vec3(.025,.031,.045),vec3(.38,.44,.52),smoothstep(-.4,.9,d.y))+vec3(.55,.49,.43)*pow(max(0.,dot(d,normalize(vec3(-.6,.7,.4)))),24.);}
      vec3 brdf(vec3 n,vec3 v,vec3 l,vec3 base,float rough,float metallic){vec3 h=normalize(v+l);float nv=max(.001,dot(n,v)),nl=max(0.,dot(n,l));vec3 f=Fschlick(max(0.,dot(h,v)),mix(vec3(.04),base,metallic));vec3 spec=Dggx(max(0.,dot(n,h)),rough)*Gschlick(nv,rough)*Gschlick(nl,rough)*f/(4.*nv*max(.001,nl));return ((1.-f)*(1.-metallic)*base/PI+spec)*nl;}
    `,
    post:`#version 300 es
      precision highp float;in vec2 uv;out vec4 result;
      uniform sampler2D uScene,uBloom,uWide,uDepth,uHistory;uniform vec2 uPixel,uMotion;uniform float uTime,uDawn,uMono,uVeryHigh,uFocus,uHistoryReady,uSafe;
      vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
      float linearDepth(float d){return .16/(130.-d*129.84);}
      void main(){
        float z=linearDepth(texture(uDepth,uv).r)*65.;float coc=texture(uDepth,uv).r>.999?0.:clamp(abs(z-uFocus)/max(1.,uFocus)*.009,0.,.009);vec3 c=texture(uScene,uv).rgb;
        vec3 blur=vec3(0.);float count=uVeryHigh>.5?12.:6.;
        for(int k=0;k<12;k++){if(float(k)>=count)break;float a=float(k)*2.399963,r=sqrt((float(k)+.5)/count);vec2 o=vec2(cos(a),sin(a))*coc*r;blur+=texture(uScene,clamp(uv+o,vec2(.001),vec2(.999))).rgb/count;}
        c=mix(c,blur,smoothstep(.001,.006,coc));
        if(uHistoryReady>.5&&length(uMotion)>.0001){vec3 shutter=c;for(int k=1;k<=3;k++)shutter+=texture(uHistory,clamp(uv-uMotion*float(k)/3.,vec2(.001),vec2(.999))).rgb;c=mix(c,shutter*.25,min(.22,length(uMotion)*9.));}
        vec3 bloom=texture(uBloom,uv).rgb,wide=texture(uWide,uv).rgb;
        c+=bloom*.26+wide*.18;
        float edge=smoothstep(.24,.7,length(uv-.5));vec2 split=(uv-.5)*uPixel*(.6+uVeryHigh*.4)*edge;
        c.r+=texture(uScene,uv+split).r-texture(uScene,uv).r;c.b+=texture(uScene,uv-split).b-texture(uScene,uv).b;
        vec2 sun=uDawn>.5?vec2(.32,.82):vec2(.52,.76),ray=(sun-uv)/12.;vec3 shaft=vec3(0.);
        for(int j=0;j<12;j++){vec2 q=uv+ray*float(j);float visible=step(.985,texture(uDepth,q).r);shaft+=texture(uWide,q).rgb*visible/12.;}
        c+=shaft*(uDawn>.5?.08:.035);
        float streak=0.;for(int j=-3;j<=3;j++)streak+=dot(texture(uWide,uv+vec2(float(j)*.014,0.)).rgb,vec3(.213,.715,.072))/7.;c+=vec3(streak*.022);
        c+=texture(uWide,vec2(1.)-uv*.85-.075).rgb*.007;
        c+=wide*vec3(.028,.007,.004);c*=1.-smoothstep(.25,.8,length(uv-.5))*.27;
        c*=uDawn>.5?vec3(.98,1.,1.035):vec3(1.045,.96,.95);
        float grain=fract(sin(dot(gl_FragCoord.xy+floor(uTime*24.),vec2(12.9898,78.233)))*43758.5453)-.5;
        c=aces(max(vec3(0.),c)*1.25);c=pow(c,vec3(1./2.2));c+=grain*.006*(1.-uSafe*.4);c=mix(c,vec3(dot(c,vec3(.213,.715,.072))),uMono);result=vec4(c,1.);
      }`,
    blur:`#version 300 es
      precision highp float;in vec2 uv;out vec4 result;uniform sampler2D uSource;uniform vec2 uDirection;
      void main(){vec3 c=texture(uSource,uv).rgb*.227027;c+=texture(uSource,uv+uDirection*1.384615).rgb*.316216;c+=texture(uSource,uv-uDirection*1.384615).rgb*.316216;c+=texture(uSource,uv+uDirection*3.230769).rgb*.070270;c+=texture(uSource,uv-uDirection*3.230769).rgb*.070270;result=vec4(c,1.);}`,
    bright:`#version 300 es
      precision highp float;in vec2 uv;out vec4 result;uniform sampler2D uSource;uniform vec2 uPixel;
      void main(){vec3 c=vec3(0.);for(int y=0;y<2;y++)for(int x=0;x<2;x++)c+=texture(uSource,uv+vec2(float(x),float(y))*uPixel).rgb*.25;float b=max(c.r,max(c.g,c.b));float knee=clamp((b-.48)/.22,0.,1.);result=vec4(c*knee*knee*.5,1.);}`,
    shadow:`#version 300 es
      precision highp float;out vec4 result;void main(){float d=gl_FragCoord.z;vec3 e=fract(d*vec3(1.,255.,65025.));e-=e.yzz*vec3(1./255.,1./255.,0.);result=vec4(e,1.);}`
  };
})(window.Cardable);
