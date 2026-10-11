'use strict';
const fs=require('node:fs');
const trace=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),totals=new Map(),threads=new Map();
for(const e of trace.traceEvents){
  if(e.name==='thread_name')threads.set(e.pid+'/'+e.tid,e.args.name);
  if(e.ph!=='X'||!e.dur)continue;
  const key=e.pid+'/'+e.tid+'/'+e.name,item=totals.get(key)||{name:e.name,thread:e.pid+'/'+e.tid,count:0,totalMs:0,maxMs:0};
  item.count++;item.totalMs+=e.dur/1000;item.maxMs=Math.max(item.maxMs,e.dur/1000);totals.set(key,item);
}
const result=Array.from(totals.values()).sort((a,b)=>b.totalMs-a.totalMs).slice(0,45).map(e=>({...e,thread:threads.get(e.thread)||e.thread,totalMs:Math.round(e.totalMs),maxMs:Math.round(e.maxMs*100)/100}));
console.log(JSON.stringify(result,null,2));
