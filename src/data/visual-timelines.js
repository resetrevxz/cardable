(function(C){
  'use strict';
  var spec=C.data.rarities.find(function(r){return r.id==='mythical';}).openingIntro,at=0,sections={};
  spec.sections.forEach(function(s){sections[s.id]={start:at,ms:s.ms};at+=s.ms;});
  // Sound hooks follow existing authored edits; no clock or presentation timing changes.
  var beats=[['creak','tip',.15],['break','fall',0],['impact','impact',0],['tendrils','underwater',.12],['clockStart','clock',0],['titleIn','clock',.2],['titleBreak','rupture',0],['flash','explosion',0],['cardIn','release',0]];
  spec.beats=beats.map(function(x){return {id:x[0],ms:sections[x[1]].start+sections[x[1]].ms*x[2]};});
  for(var i=1;i<=8;i++)spec.beats.push({id:'tick',key:'tick:'+i,ms:sections.clock.start+sections.clock.ms*i/9});
  spec.beats.sort(function(a,b){return a.ms-b.ms;});
})(window.Cardable);
