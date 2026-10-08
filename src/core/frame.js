(function(C,root){'use strict';
  var nativeRequest=root.requestAnimationFrame.bind(root),nativeCancel=root.cancelAnimationFrame.bind(root),queue=new Map(),ticket=0,raf=null,due=null;
  function cap(){var v=C.settings.get('fpsLimit'),n=v==='unlimited'?Infinity:v==='display'?Infinity:Number(v);if(!Number.isFinite(n)&&n!==Infinity)n=Infinity;if(C.settings.batterySaving)n=Math.min(n,30);if(!root.document.hasFocus()&&C.settings.get('unfocusedMode')==='30')n=Math.min(n,30);return n;}
  function schedule(){if(raf===null&&queue.size&&!root.document.hidden)raf=nativeRequest(paint);}
  function paint(now){raf=null;if(root.document.hidden)return;var interval=1000/cap();if(due!==null&&now+.1<due){schedule();return;}due=!interval?null:due===null||now-due>interval?now+interval:due+interval;var work=Array.from(queue);queue.clear();work.forEach(function(pair){try{pair[1](now);}catch(e){root.console.error('[Cardable frame]',e);}});schedule();}
  function request(fn){var id=++ticket;queue.set(id,fn);schedule();return id;}
  function cancel(id){queue.delete(id);if(!queue.size&&raf!==null){nativeCancel(raf);raf=null;due=null;}}
  C.frame={request:request,cancel:cancel,cap:cap,subscribe:function(fn){var active=true,id;function run(now){if(!active)return;if(fn(now)!==false)id=request(run);}id=request(run);return function(){active=false;cancel(id);};}};
  // Every existing RAF consumer uses this queue, preserving one-shot and nested
  // RAF semantics. There is one native clock, and no work when the queue is empty.
  root.requestAnimationFrame=request;root.cancelAnimationFrame=cancel;
  root.document.addEventListener('visibilitychange',function(){if(root.document.hidden&&raf!==null){nativeCancel(raf);raf=null;}due=null;schedule();});C.settings.onChange('fpsLimit',function(){due=null;schedule();});
})(window.Cardable,window);
