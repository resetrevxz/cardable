(function (C) {
  'use strict';
  var reasons = ['pack opening','reveal duplicate','shop','delete refund','cutscene unlock','dev','achievement reward'];
  function normalize(value) {
    var daily=value&&value.daily&&typeof value.daily==='object'&&!Array.isArray(value.daily)?value.daily:{};
    var days={};Object.keys(daily).slice(-32).forEach(function(day){var d=daily[day];if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&d&&Number.isSafeInteger(d.earned)&&d.earned>=0&&Number.isSafeInteger(d.spent)&&d.spent>=0)days[day]={earned:d.earned,spent:d.spent};});
    return { daily:days, log: (value && Array.isArray(value.log) ? value.log : []).filter(function(e){return e && Number.isFinite(e.at) && e.at >= 0 && Number.isSafeInteger(e.delta) && reasons.includes(e.reason);}).slice(0,200).map(function(e){return {at:e.at,delta:e.delta,reason:e.reason};}) };
  }
  function applyInto(save, delta, reason, at) {
    if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(save.currency) || !reasons.includes(reason)) throw new TypeError('Invalid wallet transaction');
    var next = save.currency + delta;
    if (!Number.isSafeInteger(next) || next < 0) throw new RangeError('Wallet balance out of range');
    if (!delta) return next;
    var time = at == null ? C.clock.now() : at;
    if (!Number.isFinite(time) || time < 0) throw new TypeError('Invalid wallet time');
    var wallet = normalize(save.wallet);
    var date=new Date(time),day=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),d=wallet.daily[day];
    if(!d){d={earned:0,spent:0};wallet.log.forEach(function(e){var old=new Date(e.at);if(old.toDateString()===date.toDateString()){if(e.delta>0)d.earned+=e.delta;else d.spent-=e.delta;}});wallet.daily[day]=d;}
    if(delta>0)d.earned+=delta;else d.spent-=delta;
    if(!Number.isSafeInteger(d.earned)||!Number.isSafeInteger(d.spent))throw new RangeError('Wallet daily totals out of range');
    save.wallet=wallet;
    save.wallet.log.unshift({at:time,delta:delta,reason:reason}); save.wallet.log.length=Math.min(200,save.wallet.log.length);
    save.currency=next; return next;
  }
  function notify(before, reason) {
    var value=C.state.current.currency, delta=value-before;
    if(delta) C.events.emit('currency:changed',{before:before,value:value,delta:delta,amount:Math.abs(delta),direction:Math.sign(delta),reason:reason});
  }
  function transact(amount, direction, reason) {
    if(!Number.isSafeInteger(amount)||amount<0)throw new TypeError('Invalid currency amount');
    var before=C.state.current.currency;
    if(direction<0&&amount>before){C.events.emit('currency:insufficient',{requested:amount,available:before});return false;}
    var candidate=JSON.parse(C.state.encode(C.state.current)); applyInto(candidate,amount*direction,reason||'dev');
    if(!C.state.commit(candidate))return false; notify(before,reason||'dev'); return candidate.currency;
  }
  C.currency={normalize:normalize,applyInto:applyInto,notify:notify,reasons:reasons,
    add:function(amount,reason){return transact(amount,1,reason);},spend:function(amount,reason){return transact(amount,-1,reason);},
    canAfford:function(amount){if(!Number.isSafeInteger(amount)||amount<0)throw new TypeError('Invalid currency amount');return C.state.current.currency>=amount;},
    today:function(save,now){var date=new Date(now==null?C.clock.now():now);var day=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),wallet=normalize(save.wallet);if(wallet.daily[day])return wallet.daily[day];date.setHours(0,0,0,0);var earned=0,spent=0;normalize(save.wallet).log.forEach(function(e){if(e.at>=date.getTime()){if(e.delta>0)earned+=e.delta;else spent-=e.delta;}});return {earned:earned,spent:spent};}
  };
})(window.Cardable);
