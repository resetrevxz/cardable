(function(C,root){'use strict';
  C.dev.checkQol=function(){var at=root.performance.now(),checks=[];function require(ok,label){if(!ok)throw new Error('QoL: '+label);checks.push(label);}
    [[1100,680,1,.62],[1280,720,1,2/3],[1366,768,1,768/1080],[1920,1080,1,1],[2560,1440,1,4/3],[3840,2160,1,1.6],[3440,1440,1,4/3],[800,1200,1,.62],[1920,1080,1.25,1.25],[1920,1080,1.5,1.5]].forEach(function(v){require(Math.abs(C.viewport.scale(v[0],v[1],v[2])-v[3])<.00001,'scale '+v.slice(0,3).join('×'));});
    var bindings=Array.from(C.keybindings.entries.values()).map(function(v){return v.binding.toLowerCase();});require(new Set(bindings).size===bindings.length,'unique registered keybindings');
    require(C.qol.fuzzyScore('inv','Inventory')>C.qol.fuzzyScore('inv','Inspect view'),'palette ranks inv');require(C.qol.fuzzyScore('set','Settings')>C.qol.fuzzyScore('set','Reset settings'),'palette ranks set');require(C.qol.fuzzyScore('xyz','Settings')===0,'palette excludes mismatch');
    var away=C.qol.awaySummary(1000,21000,1,1000,10000,4);require(away.elapsedMs===20000&&away.ready===3,'away timestamp catch-up');require(C.qol.awaySummary(1000,51000,3,1000,10000,4).ready===4,'away cap');require(C.qol.awaySummary(21000,1000,2,null,10000,4).elapsedMs===0,'away backwards clock');
    require(root.performance.now()-at<1000,'under one second');return {passed:true,checks:checks};
  };
})(window.Cardable,window);
