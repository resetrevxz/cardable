(function(C){
  'use strict';
  // Same original engraving used by the game's DOM card back; no front is constructed.
  C.cutsceneCardBack={markPath:'M49 16A23 23 0 1 0 49 48M45 23A14 14 0 1 0 45 41M26 26H38V38H26Z',
    draw:function(g,w,h,pose){
      var cw=Math.min(300,w*.64,h*.36),ch=cw*1.4,scale=Math.max(.007,Math.cos(pose.turn)),y=h*.5+pose.rise;
      g.save();g.translate(w*.5,y);g.scale(scale,1);g.globalAlpha=pose.opacity;
      if(!pose.shadowSkip){g.shadowColor='rgba(0,0,0,.72)';g.shadowBlur=28;g.shadowOffsetY=18;}
      g.beginPath();g.roundRect(-cw/2,-ch/2,cw,ch,14);var body=g.createLinearGradient(-cw/2,-ch/2,cw/2,ch/2);body.addColorStop(0,'#34353a');body.addColorStop(.38,'#121318');body.addColorStop(.72,'#282930');body.addColorStop(1,'#101116');g.fillStyle=body;g.fill();g.shadowBlur=0;g.shadowOffsetY=0;g.strokeStyle='#ddd';g.lineWidth=1.2;g.stroke();
      g.beginPath();g.roundRect(-cw*.448,-ch*.448,cw*.896,ch*.896,10);g.strokeStyle='rgba(255,255,255,.15)';g.lineWidth=.7;g.stroke();
      g.save();g.translate(-cw*.175,-ch*.19);g.scale(cw*.35/64,cw*.35/64);g.strokeStyle='#b1b3b9';g.lineWidth=1.35;g.lineCap='round';g.stroke(new Path2D(this.markPath));g.restore();
      g.fillStyle='#c1c3c9';g.textAlign='center';g.font='600 '+Math.round(cw*.06)+'px Inter, sans-serif';g.fillText('cardable',0,ch*.1);g.restore();
    }
  };
})(window.Cardable);
