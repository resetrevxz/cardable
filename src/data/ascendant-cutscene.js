(function (C) {
  'use strict';
  // Presentation only: these descriptors never enter the pull sampler or saved instance.
  var rarity=C.data.rarities.find(function(r){return r.id==='ascendant';});
  var intro=rarity.openingIntro;
  intro.milestone='C';
  // S0/S1 now travel through the sky; their original local spark beats guide the flight.
  // A sustained cloud veil is a transition, not another flash/reversal.
  intro.skyFlight={endMs:9000,veilOutMs:1600,travel:35,shakePx:1.8,
    highSteps:48,mediumSteps:32,lowSteps:16,noiseSize:64};
  intro.sections=intro.sections.concat([
    {id:'ascend',ms:800},{id:'topPulse',ms:2200},{id:'morph',ms:2000},
    {id:'clock',ms:4000},{id:'title',ms:3000},{id:'shatter',ms:1000},
    {id:'aurora',ms:2600},{id:'explosion',ms:400},{id:'card',ms:1500}
  ]);
  intro.palette=[[255,159,178],[168,240,198],[169,204,255],[213,195,255],[255,210,176],[255,241,168]];
  intro.ritual={pulseHzStart:1.2,pulseHzEnd:2.4,pulseScale:.12,pulseLight:.025,
    sigilRadius:.145,clockRadius:.34,windCount:2000,mistLayers:3,
    titleTrackingEm:.35,titleStaggerMs:90,titleSplitPx:12,titleBlurPx:12,
    sideUpdateHz:2,splitPassMs:3000,starMaxRps:2};
  intro.clock={rates:[.045,.14,.36],acceleration:.18,jerk:.035,alignStartMs:3000,alignMs:200,holdMs:300};
  intro.climax={curtainLayers:5,riseMs:2500,startHeight:.2,endHeight:.9,aberrationMs:700,flashRiseMs:110,flashDecayMs:590,flashOpacity:.76,shockwaveMs:700};
  intro.cardScene={section:'card',ms:1500,flipMs:400,fadeMs:160,scaleFrom:.96,borderMs:1200};
  intro.light={ms:3000,handoffMs:2600};
  var starts={},at=0;
  intro.sections.forEach(function(part){starts[part.id]={start:at,ms:part.ms};at+=part.ms;});
  // Compress shot groups, never map through retired cave/water sections.
  intro.shortRoute=[
    {from:0,to:starts.veil.start,ms:4500},
    {from:starts.veil.start,to:starts.topPulse.start,ms:1500},
    {from:starts.topPulse.start,to:starts.clock.start,ms:2500},
    {from:starts.clock.start,to:starts.title.start,ms:2500},
    {from:starts.title.start,to:starts.aurora.start,ms:2000},
    {from:starts.aurora.start,to:starts.card.start,ms:2000},
    {from:starts.card.start,to:at,ms:1500}
  ];
  function beat(id,section,fraction,key){intro.beats.push({id:id,key:key||id,ms:starts[section].start+starts[section].ms*fraction});}
  // Integrate a linear frequency ramp; no pulse exceeds the descriptor's 2.4 Hz end.
  var a=(intro.ritual.pulseHzEnd-intro.ritual.pulseHzStart)/(2*2.2),b=intro.ritual.pulseHzStart;
  for(var pulse=0;pulse<4;pulse++){
    var age=pulse===0?0:(-b+Math.sqrt(b*b+4*a*pulse))/(2*a);
    beat('pulse','topPulse',age/2.2,'pulse:'+pulse);
  }
  beat('clockStart','clock',0);beat('clockAlign','clock',.8);
  beat('titleIn','title',0);beat('titleBreak','shatter',0);
  // Clock of Ages second hand crosses each engraved major mark, including its alignment.
  function turns(age){return age*intro.clock.rates[2]+intro.clock.acceleration*age*age+intro.clock.jerk*age*age*age;}
  var turnsAtThree=turns(3),aligned=Math.ceil(turnsAtThree);
  for(var tick=1;tick<=aligned*12;tick++){
    var goal=tick/12,lo=0,hi=3;
    if(goal<=turnsAtThree){for(var step=0;step<24;step++){var mid=(lo+hi)/2;if(turns(mid)<goal)lo=mid;else hi=mid;}hi=(lo+hi)/2;}
    else {var v=(goal-turnsAtThree)/(aligned-turnsAtThree);lo=0;hi=1;for(var step=0;step<24;step++){var mid=(lo+hi)/2;if(mid*mid*(3-2*mid)<v)lo=mid;else hi=mid;}hi=3+(lo+hi)*.1;}
    beat('tick','clock',hi/4,'tick:'+tick);
  }
  beat('auroraRise','aurora',0);beat('flash','explosion',0);beat('cardIn','card',0);
  intro.beats.sort(function(a,b){return a.ms-b.ms;});
})(window.Cardable);
