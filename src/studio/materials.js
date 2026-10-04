(function(C){
  'use strict';
  // Optional hooks are installed only by the studio loader. The normal DOM
  // materials never read them. GLSL runs against the studio's complete light rig.
  var variants={
    'rainbow-holo': 'float band=sin((uv.x*.8+uv.y*1.15+view.x*.24-view.y*.2)*38.);return spectrum(band*.18+uv.y*.6+view.x*.22)*(.18+.32*shine);',
    'vertical-holo': 'float stripe=pow(.5+.5*sin((uv.x+view.x*.055+normal.x*.06)*170.),12.);return vec3(stripe*(.08+.68*shine));',
    aurora: 'float ribbon=pow(.5+.5*sin(length((uv-vec2(.2,-.55))*vec2(.8,1.3))*38.+view.x*3.+time*.16),5.);return mix(vec3(.2,.78,.48),vec3(.36,.3,.82),.5+.5*sin(uv.y*9.+view.y))*ribbon*(.08+.3*shine);',
    matte: 'return vec3(0.);',
    'galaxy-holo': 'vec2 cell=floor(uv*vec2(140.,196.));float star=step(.991,hash(cell+seed))*pow(max(0.,1.-length(fract(uv*vec2(140.,196.))-.5)*2.),3.);float cloud=.5+.5*sin(uv.x*8.+uv.y*7.+view.x+time*.08);return (mix(vec3(.09,.26,.38),vec3(.35,.18,.56),cloud)*.18+star*vec3(.65,.75,1.))*(.15+.7*shine);',
    beam: 'float a=exp(-pow((uv.x+uv.y-1.+view.x*.25-view.y*.2)*9.,2.)),b=exp(-pow((uv.x-uv.y+view.x*.18+view.y*.15)*10.,2.));return vec3((a+b)*(.04+.48*shine));'
  };
  Object.keys(variants).forEach(function(id,i){var v=C.variant(id);if(v)v.studio={code:i+1,shader:variants[id],uses:['lights','normal'],animated:id==='aurora'||id==='galaxy-holo'};});
  var finishIds=['basic','common','uncommon','rare','super-rare','unusual','double-super-rare','legendary','mythical','ascendant','exotic','secret','limited'];
  var palettes=[['#909297','#44464C'],['#D2D4DA','#70737C'],['#9CACA0','#486450'],['#D3E1EC','#667D99'],['#247AD1','#0A214E'],['#7A43B1','#361756'],['#132D58','#E8C467'],['#FFF0BA','#BC8D36'],['#751A35','#651129'],['#FFFFFF','#DEDAF3'],['#F19DCC','#794095'],['#09090B','#FFFFFF'],['#7A43B1','#361756']];
  var finishChunks=[
    'return base;',
    'return base*(.88+.12*cos(atan(uv.y-.5,uv.x-.5)-time*.22));',
    'return base;',
    'float stars=pow(.5+.5*sin(uv.y*170.+uv.x*110.+seed),24.);return base+vec3(stars*(.08+.12*sin(time*.6)*sin(time*.6)));',
    'float checker=mod(floor(uv.x*16.)+floor(uv.y*22.),2.);float wave=.5+.5*sin(uv.x*22.+uv.y*8.-time*.6);return base*(.82+.13*checker)+vec3(.1,.25,.34)*wave*.3;',
    'return base+vec3(exp(-uv.y*3.)*(.08+.12*(.5+.5*sin(time*.5))));',
    'float checker=mod(floor(uv.x*16.)+floor(uv.y*22.),2.);return base*(.85+.1*checker)+vec3(.18,.12,.025)*(.5+.5*sin(time*.2+uv.y*4.));',
    'float wave=.5+.5*sin(uv.y*10.+uv.x*3.-time*.28);return mix(base,vec3(.42,.13,.21),smoothstep(.46,.5,wave)*(.3+.2*uv.x))+vec3(.06)*pow(.5+.5*sin(uv.y*130.+seed),18.);',
    'float facet=mod(floor(uv.y*24.)+floor(uv.x*16.),3.);return base*(.84+facet*.1)+vec3(.4,.12,.18)*(.08+.08*sin(time*.5))*pow(.5+.5*sin(uv.x*20.+uv.y*16.),8.);',
    'return mix(base,vec3(.86,.92,1.)+spectrum(uv.y*.7+time*.025)*.12,.45);',
    'float ring=abs(sin(uv.y*24.+uv.x*18.+time*.25));return base+vec3(.15,.06,.18)*smoothstep(.93,1.,ring);',
    'float stripe=.5+.5*sin(uv.y*67.+sin(uv.y*11.+seed)*2.-time*.45);return mix(vec3(.02),vec3(.76),smoothstep(.84,.99,stripe));',
    'return base+vec3(exp(-uv.y*3.)*(.08+.12*(.5+.5*sin(time*.5))));'
  ];
  finishIds.forEach(function(id,i){var f=C.finishes.registry[id];if(!f)return;var old=f.studio||{};f.studio=Object.assign({},old,{code:i+1,palette:palettes[i],shader:finishChunks[i],animated:i!==0&&i!==2});});
  function info(card,instance){var v=C.variant(instance.variantId),f=C.finishes.registry[C.rarity(card.rarity).finish],seed=String(instance.serial||card.id).split('').reduce(function(a,c){return (a*31+c.charCodeAt(0))>>>0;},17);return {variant:v&&v.studio?v.studio.code:0,finish:f&&f.studio?f.studio.code:0,seed:(seed%10007)/100,classic:instance.cardSkinId==='classic',plate:true,animated:!!(v&&v.studio&&v.studio.animated||f&&f.studio&&f.studio.animated)};}
  function shader(){var chunks=C.data.variants.filter(function(v){return v.studio&&v.studio.shader;}).map(function(v,i){v.studio.code=v.studio.code||100+i;return 'if(uVariant=='+v.studio.code+'){'+v.studio.shader+'}';}).join('\n'),finishes=Object.keys(C.finishes.registry).filter(function(id){var f=C.finishes.registry[id];return f.studio&&f.studio.shader;}).map(function(id,i){var f=C.finishes.registry[id];f.studio.code=f.studio.code||100+i;return 'if(uFinish=='+f.studio.code+'){'+f.studio.shader+'}';}).join('\n');return `
    uniform int uVariant,uFinish,uClassic,uPlate,uMono;uniform float uMaterialTime,uSeed;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    vec3 spectrum(float phase){return .5+.5*cos(6.2831853*(phase+vec3(0.,.33,.67)));}
    vec3 coating(vec2 uv,vec3 view,vec3 normal,float shine){float time=uMaterialTime,seed=uSeed;`+chunks+`return vec3(0.);}
    vec3 finishColor(vec3 base,vec2 uv){float time=uMaterialTime,seed=uSeed;`+finishes+`return base;}
    float innerMask(vec2 uv){vec2 edge=min(uv,1.-uv);return step(uClassic==1?.066:.032,edge.x)*step(uClassic==1?.047:.023,edge.y);}
    vec3 studioSurface(vec3 base,vec2 uv,vec3 n,vec3 view,vec3 diffuse,vec3 specular){float interior=innerMask(uv),mask=interior;if(uv.y>.82)mask*=.13;if(uPlate==1&&uv.y<.36)mask*=.14;vec3 c=coating(uv,view,n,clamp(dot(specular,vec3(.333))+.12*dot(diffuse,vec3(.333)),0.,2.));if(uMono==1)c=vec3(dot(c,vec3(.213,.715,.072)));vec3 rim=finishColor(base,vec2(uv.x,1.-uv.y));if(uMono==1)rim=vec3(dot(rim,vec3(.213,.715,.072)));return mix(base,rim,(1.-interior)*(uClassic==1?0.:1.))+c*mask;}
  `;}
  C.studioMaterials={info:info,shader:shader,active:function(faces,tier){return !!(faces&&faces.material&&faces.material.animated&&(tier==='high'||tier==='medium')&&!C.motion.reduced);}};
})(window.Cardable);
