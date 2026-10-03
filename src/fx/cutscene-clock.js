(function(C){'use strict';var TAU=Math.PI*2;function mix(a,b,t){return a+(b-a)*t;}function smooth(v){v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);}
    function handPath(g,r,hand,polygon){
      var len=r*[.46,.64,.77][hand],wide=r*[.016,.010,.004][hand];
      polygon(g,[[-r*.13,-wide*.5],[len*.76,-wide],[len,0],[len*.76,wide],[-r*.13,wide*.5],[-r*.17,0]]);
    }
    function pose(age,config){
      var start=config.alignStartMs/1000,align=config.alignMs/1000,hold=config.holdMs/1000;
      function turns(t,rate){return t*rate+config.acceleration*t*t+config.jerk*t*t*t;}
      return config.rates.map(function(rate){
        var raw=turns(Math.min(age,start),rate),end=Math.ceil(turns(start,rate));
        if(age>=start)raw=mix(turns(start,rate),end,smooth((age-start)/align));
        if(age>start+align+hold){var dt=age-start-align-hold;raw=end+dt*dt*rate*.08;}
        return raw*TAU;
      });
    }
    function prismatic(g,r,age,strength,style){
      var rgba=style.rgba,arc=style.arc,polygon=style.polygon,formation=smooth(age/1.4);
      var angles=pose(age,style.config),colors=style.palette,alignAt=(style.config.alignStartMs+style.config.alignMs)/1000,hold=style.config.holdMs/1000;
      var mechanicalAge=age<alignAt?age:age<alignAt+hold?alignAt:age-hold;
      g.save();g.globalAlpha*=strength;
      // Same clock geometry and drawing primitives, with a luminous glass engraving style.
      for(var ring=0;ring<4;ring++){
        var rr=r*(1-ring*.115),turn=mechanicalAge*(ring%2?-.035:.025),amount=smooth((age-ring*.19)/1.1);
        for(var split=0;split<3;split++){
          g.save();g.translate((split-1)*1.1,0);
          for(var part=0;part<12;part++){
            var a=part*TAU/12+turn+.016;
            arc(g,rr,a,a+(TAU/12-.035)*amount,rgba(split===1?[255,255,255]:colors[split*2],split===1?.66:.24),Math.max(.7,r*.002));
          }
          g.restore();
        }
      }
      for(var mark=0;mark<60;mark++){
        var appearance=smooth((age-mark/60*.9)/.4),a=mark*TAU/60-Math.PI/2,major=mark%5===0;
        g.save();g.rotate(a);g.beginPath();g.moveTo(r*.94,0);g.lineTo(r*(major?.89:.918),0);
        g.strokeStyle=rgba(major?[255,255,255]:colors[mark%6],appearance*(major?.8:.4));g.lineWidth=major?Math.max(1,r*.003):.65;g.stroke();g.restore();
      }
      g.save();g.globalAlpha*=formation;g.fillStyle=rgba([255,255,255],.68);g.font=Math.max(9,r*.046)+'px '+(style.font||'monospace');g.textAlign='center';g.textBaseline='middle';
      ['XII','III','VI','IX'].forEach(function(label,i){var a=i*Math.PI/2-Math.PI/2;g.fillText(label,Math.cos(a)*r*.83,Math.sin(a)*r*.83);});g.restore();
      // Fine counter-rotating frames ratchet without brightness pulses.
      for(var frame=0;frame<2;frame++){
        var turn=mechanicalAge*(frame?-.12:.08),ratchet=Math.floor(turn*24)/24+smooth(turn*24-Math.floor(turn*24))*.012;
        g.save();g.rotate(ratchet);g.globalAlpha*=formation;
        for(var side=0;side<6;side++){
          var a=side*TAU/6,rr=r*(frame?.58:.72);arc(g,rr,a+.025,a+TAU/6-.025,rgba(colors[(side+frame)%6],.35),.8);
          polygon(g,[[Math.cos(a)*rr,Math.sin(a)*rr],[Math.cos(a+.016)*rr*.98,Math.sin(a+.016)*rr*.98],[Math.cos(a)*rr*.96,Math.sin(a)*rr*.96],[Math.cos(a-.016)*rr*.98,Math.sin(a-.016)*rr*.98]]);g.fillStyle=rgba([255,255,255],.55);g.fill();
        }
        g.restore();
      }
      var trail=Math.min(.22,.016+age*.035);g.save();g.rotate(angles[2]-Math.PI/2);
      var wedge=g.createRadialGradient(0,0,r*.23,0,0,r*.77);wedge.addColorStop(0,rgba(colors[0],0));wedge.addColorStop(1,rgba(colors[2],.08*formation));g.fillStyle=wedge;
      g.beginPath();g.moveTo(0,0);g.arc(0,0,r*.77,-trail,0);g.closePath();g.fill();g.restore();
      for(var hand=0;hand<3;hand++){
        // Leave the central sigil open by clipping away the hand's inner segment.
        g.save();g.beginPath();g.arc(0,0,r*1.2,0,TAU);g.arc(0,0,r*.42,0,TAU,true);g.clip('evenodd');
        g.rotate(angles[hand]-Math.PI/2);
        for(var fringe=0;fringe<3;fringe++){g.save();g.translate(0,(fringe-1)*(hand===2?.9:1.2));handPath(g,r,hand,polygon);g.fillStyle=rgba(fringe===1?[255,255,255]:colors[fringe*2],formation*(fringe===1?.8:.25));g.fill();g.restore();}
        g.restore();
      }
      (style.beats||[]).forEach(function(beat){if(beat.id!=='tick')return;var dt=age-(beat.ms-style.startMs)/1000;if(dt<0||dt>.3)return;arc(g,r*(.75+smooth(dt/.3)*.13),0,TAU,rgba(colors[2],(1-dt/.3)*.035),.7);});
      g.restore();
    }
    function draw(g,r,t,strength,rupture,remnant,style){
      if(style.prismatic){prismatic(g,r,t,strength,style);return;}
      var RED=style.RED,PALE=style.PALE,rings=style.rings,arc=style.arc,polygon=style.polygon,rgba=style.rgba,glow=style.glow;
      g.save();g.globalAlpha*=strength;
      // Broken load-bearing rim: faceted black iron, bevels, etched seams, fine damage.
      rings.forEach(function(part,i){var turn=t*.025*(i%3===0?-1:1),kick=Math.sin(t*(1+rupture*8)+i)*rupture*.028,rr=r*(1+rupture*.06);g.save();g.rotate(turn+kick);var a=part.a,b=a+part.span,points=[];for(var j=0;j<=8;j++)points.push([Math.cos(mix(a,b,j/8))*rr,Math.sin(mix(a,b,j/8))*rr]);for(var k=8;k>=0;k--)points.push([Math.cos(mix(a,b,k/8))*rr*.93,Math.sin(mix(a,b,k/8))*rr*.93]);polygon(g,points);var metal=g.createLinearGradient(-r,-r,r,r);metal.addColorStop(0,rgba([82,29,36],.95));metal.addColorStop(.18,rgba([19,8,13],1));metal.addColorStop(.62,rgba([42,12,20],1));metal.addColorStop(1,rgba([119,30,40],.85));g.fillStyle=metal;g.fill();g.strokeStyle=rgba([190,47,63],remnant?.14:.38);g.lineWidth=Math.max(.6,r*.002);g.stroke();arc(g,rr*.993,a,b,rgba(PALE,.12+rupture*.23),r*.002);arc(g,rr*.944,a,b,rgba(RED,.22+rupture*.28),r*.002);
        for(var notch=0;notch<3;notch++){var na=a+part.span*(notch+1)/4;g.save();g.rotate(na);g.translate(rr*.964,0);g.strokeStyle=rgba(RED,.25+rupture*.55);g.lineWidth=r*.002;g.beginPath();g.moveTo(-r*.018,-r*.01);g.lineTo(r*.016,0);g.lineTo(-r*.01,r*.008);g.stroke();g.restore();}g.restore();});
      if(remnant){g.restore();return;}
      for(var mark=0;mark<120;mark++){if(mark%17===0)continue;var a=mark*TAU/120;g.save();g.rotate(a);g.beginPath();g.moveTo(r*.91,0);g.lineTo(r*(mark%5===0?.875:.897),0);g.strokeStyle=rgba(mark%5===0?PALE:RED,mark%5===0?.36:.22);g.lineWidth=mark%5===0?r*.003:r*.0015;g.stroke();g.restore();}
      for(var hour=0;hour<12;hour++){g.save();g.rotate(hour*TAU/12);g.translate(0,-r*.82);g.strokeStyle=rgba(PALE,.38);g.lineWidth=r*.003;g.beginPath();g.moveTo(-r*.014,-r*.018);g.lineTo(-r*.014,r*.017);g.lineTo(r*.014,-r*.009);g.lineTo(r*.014,r*.018);if(hour%2===0){g.moveTo(-r*.019,0);g.lineTo(r*.019,0);}g.stroke();g.restore();}
      for(var layer=0;layer<3;layer++){g.save();g.translate(Math.sin(t*.12+layer)*r*.007,Math.cos(t*.09+layer)*r*.005);g.rotate(t*(layer%2?-.08:.055)*(1+rupture*5)+layer*.48);var size=r*(.59-layer*.09);g.strokeStyle='rgba(0,0,0,.8)';g.lineWidth=r*.019;g.strokeRect(-size+r*.005,-size+r*.008,size*2,size*2);var bevel=g.createLinearGradient(-size,-size,size,size);bevel.addColorStop(0,rgba(PALE,.4));bevel.addColorStop(.15,rgba([97,26,39],.85));bevel.addColorStop(.54,rgba([28,6,14],1));bevel.addColorStop(.85,rgba([157,34,53],.68));bevel.addColorStop(1,rgba(PALE,.24));g.strokeStyle=bevel;g.lineWidth=r*.012;g.strokeRect(-size,-size,size*2,size*2);g.strokeStyle=rgba(PALE,.24);g.lineWidth=r*.0018;g.strokeRect(-size+r*.004,-size+r*.004,size*2,size*2);for(var edge=0;edge<4;edge++){g.rotate(Math.PI/2);g.fillStyle=rgba(RED,.55);polygon(g,[[-size,-size-r*.016],[-size+r*.016,-size],[-size,-size+r*.016],[-size-r*.016,-size]]);g.fill();}g.restore();}
      for(var ring=0;ring<2;ring++){var radius=r*(ring?.39:.69),turn=t*(ring?-.09:.035)*(1+rupture*4);for(var j=0;j<9;j++)arc(g,radius,j*TAU/9+turn+.04,j*TAU/9+turn+.51,rgba(RED,.3),r*.005);}
      // Three visibly distinct hands; the fastest hand changes from ticking to continuous motion.
      for(var hand=0;hand<3;hand++){var rate=[.08,.24,1.1][hand]*(1+rupture*7),raw=t*rate;var ticking=hand===2&&rupture<.3?Math.floor(raw*5)/5+smooth((raw*5)%1)*.07:raw;g.save();g.rotate(ticking-2.1+hand*.7);handPath(g,r,hand,polygon);g.fillStyle=rgba(hand===2?PALE:[85,28,39],.86);g.fill();g.strokeStyle=rgba(RED,.7);g.lineWidth=r*.0016;g.stroke();g.restore();}
      glow(g,0,0,r*.17,r*.17,RED,.3);g.restore();
    }
C.cutsceneClock={draw:draw,pose:pose};})(window.Cardable);
