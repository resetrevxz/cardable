(function (C) {
  'use strict';
  // Shared clipping and displaced-fragment primitive from the Mythical title.
  // The painter supplies its font/path; this utility owns no time or animation loop.
  C.cutsceneText={
    bands:function(g,options,paint){
      for(var band=0;band<options.count;band++){
        g.save();g.translate(options.x(band),options.y(band));g.rotate(options.turn(band));
        g.beginPath();g.rect(options.left||-2,band*options.height,options.width,options.height);g.clip();paint();g.restore();
      }
    },
    scramble:function(text,progress,seed,epoch){
      var random=C.cutsceneMath.random(seed+':'+epoch),symbols='0123456789/<>-';
      return text.split('').map(function(c,i){return c===' '||i/text.length<progress?c:symbols[Math.floor(random()*symbols.length)];}).join('');
    },
    facet:function(g,points,paint){
      g.save();g.beginPath();points.forEach(function(p,i){if(i)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1]);});g.closePath();g.clip();paint();g.restore();
    }
  };
})(window.Cardable);
