(function(C){
  'use strict';
  C.prismaticWorld={fragment:`#version 300 es
    precision highp float;precision highp sampler3D;in vec2 uv;out vec4 result;uniform vec2 uViewport;uniform float uTime,uPhase,uMono,uVeryHigh;uniform sampler3D uCloud;
    float prism(vec3 p,float radius,float height){p.xz=abs(p.xz);float side=max(p.x*.8660254+p.z*.5,p.z);return max(side-radius,abs(p.y)-height);}
    float crystal(vec3 p,float r,float h){float taper=max(0.,abs(p.y)-h*.65)*.52;return prism(p,r-taper,h);}
    float heroY(){return mix(2.8,-.28,smoothstep(.05,.48,uPhase));}
    vec2 world(vec3 p){float wall=min(4.8-abs(p.x),4.3-p.y);float stone=wall+(texture(uCloud,p*.055).r-.5)*.3;vec3 cell=p;cell.z=mod(p.z+1.1,2.2)-1.1;cell.x=abs(p.x)-3.8;cell.y-=2.5;float cluster=crystal(cell,.5,1.7);float hero=crystal(p-vec3(0.,heroY(),0.),.35,1.1);float tendril=10.;
      if(uPhase>.42){vec3 q=p-vec3(0.,heroY(),0.);float a=atan(q.z,q.x),r=length(q.xz),twist=.32+q.y*q.y*.14;float filament=abs(r-twist-sin(q.y*5.-uTime*2.+a*4.)*.07)-.016;float attach=max(filament,max(q.y-.15,-q.y-1.7));tendril=attach;}
      float d=min(min(stone,cluster),min(hero,tendril));return vec2(d,hero<min(stone,cluster)||tendril<min(stone,cluster)?2.:1.);}
    vec3 normalAt(vec3 p){vec2 e=vec2(.003,0);return normalize(vec3(world(p+e.xyy).x-world(p-e.xyy).x,world(p+e.yxy).x-world(p-e.yxy).x,world(p+e.yyx).x-world(p-e.yyx).x));}
    vec3 env(vec3 d){vec3 p=.82+.16*cos(vec3(0.,2.1,4.2)+d.y*2.+d.x*1.3);return mix(vec3(.055,.08,.14),p,smoothstep(-.25,.8,d.y));}
    void main(){vec2 q=(uv-.5)*vec2(uViewport.x/uViewport.y,1.);float top=smoothstep(.68,1.,uPhase);vec3 ro=mix(vec3(1.1,1.7,7.),vec3(.05,5.7,.2),top),target=mix(vec3(0.,1.,0.),vec3(0.,0.,0.),top),f=normalize(target-ro),r=normalize(cross(f,vec3(0.,1.,.001))),up=cross(r,f),rd=normalize(f+q.x*r+q.y*up);
      float distance=0.;vec2 hit;bool found=false;int steps=uVeryHigh>.5?80:56;
      for(int i=0;i<80;i++){if(i>=steps)break;vec3 p=ro+rd*distance;hit=world(p);if(hit.x<.008){found=true;break;}distance+=max(.008,hit.x*.75);if(distance>25.)break;}
      float poolDistance=rd.y<-.001?-ro.y/rd.y:100.;vec3 col=vec3(.017,.025,.055);vec3 light=normalize(vec3(-.45,.8,.4));
      if(poolDistance>0.&&poolDistance<distance){vec3 p=ro+rd*poolDistance;float d=length(p.xz),age=max(0.,(uPhase-.46)*5.),wave=sin(d*13.-age*9.)*exp(-abs(d-age*1.5)*2.)*exp(-age)*step(.46,uPhase);vec3 n=normalize(vec3(cos(p.x*4.+uTime)*.045+wave*.2,1.,sin(p.z*4.-uTime)*.045+wave*.2)),v=-rd;float fres=.1+.85*pow(1.-max(0.,dot(n,v)),5.);vec3 thin=.85+.12*cos(vec3(0.,2.1,4.2)+d*1.3+wave*7.);col=mix(vec3(.42,.48,.56),env(reflect(rd,n)),fres)*thin;float crown=exp(-pow((d-age*1.4)*14.,2.))*sin(clamp(age,0.,1.)*3.14159);col+=thin*crown*.25;float foam=smoothstep(.55,.95,wave*9.)*exp(-age);col+=foam*.12;
      }else if(found){vec3 p=ro+rd*distance,n=normalAt(p),v=-rd;float fres=.04+.96*pow(1.-max(0.,dot(n,v)),5.);vec3 through=vec3(env(refract(rd,n,.66)).r,env(refract(rd,n,.665)).g,env(refract(rd,n,.67)).b);float flaw=pow(abs(sin(p.y*11.+p.x*18.+p.z*8.)),36.);vec3 pastel=.8+.17*cos(vec3(0.,2.1,4.2)+p.y*1.3);col=mix(through*.32,env(reflect(rd,n)),fres)+pastel*pow(max(0.,dot(reflect(-light,n),v)),90.)*.55+flaw*.055;float caustic=pow(max(0.,sin(p.x*4.+uTime*.3)+sin(p.z*3.-uTime*.2))*.5,8.);col+=pastel*caustic*.12;if(hit.y>1.5){float pulse=pow(.5+.5*sin(p.y*8.-uTime*2.8),8.);col+=pastel*(.09+pulse*.045);}col=mix(col,vec3(.017,.025,.055),1.-exp(-distance*.055));}
      vec3 atmosphere=vec3(0.);float fogSteps=uVeryHigh>.5?24.:12.;for(int i=0;i<24;i++){if(float(i)>=fogSteps)break;vec3 p=ro+rd*(float(i)+.5)*min(distance,14.)/fogSteps;float n=texture(uCloud,p*.043+vec3(0.,uTime*.003,0.)).r;float shaft=pow(max(0.,sin(p.x*2.5+p.z*.6)),10.)*max(0.,p.y)/5.;atmosphere+=vec3(.18,.24,.35)*(n*.3+shaft*.288)/fogSteps;}
      col+=atmosphere;col=mix(col,vec3(dot(col,vec3(.213,.715,.072))),uMono);gl_FragDepth=clamp((65.08-10.4/max(.08,min(distance,poolDistance)))/64.92*.5+.5,0.,1.);float fade=smoothstep(0.,.16,uPhase)*(1.-smoothstep(.82,1.,uPhase));result=vec4(col,fade);
    }`};
})(window.Cardable);
