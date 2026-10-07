(function(C){
  'use strict';
  // A small video-only EBML writer for the VP8/VP9 chunks produced by WebCodecs.
  // One cluster per frame keeps timecodes in range; no audio, library or worker.
  function bytes(n){var a=[];do{a.unshift(n%256);n=Math.floor(n/256);}while(n);return new Uint8Array(a);}
  function size(n){var length=1;while(n>=Math.pow(2,7*length)-1)length++;var a=new Uint8Array(length);for(var i=length-1;i>=0;i--){a[i]=n%256;n=Math.floor(n/256);}a[0]|=1<<(8-length);return a;}
  function join(list){var n=list.reduce(function(v,a){return v+a.length;},0),out=new Uint8Array(n),at=0;list.forEach(function(a){out.set(a,at);at+=a.length;});return out;}
  function text(s){return new TextEncoder().encode(s);}
  function element(id,data){if(Array.isArray(data))data=join(data);return join([bytes(id),size(data.length),data]);}
  function integer(id,n){return element(id,bytes(n));}
  function float(id,n){var a=new Uint8Array(8);new DataView(a.buffer).setFloat64(0,n);return element(id,a);}
  function header(w,h,fps,duration,codec){var ebml=element(0x1a45dfa3,[integer(0x4286,1),integer(0x42f7,1),integer(0x42f2,4),integer(0x42f3,8),element(0x4282,text('webm')),integer(0x4287,4),integer(0x4285,2)]),segment=new Uint8Array([0x18,0x53,0x80,0x67,0x01,0xff,0xff,0xff,0xff,0xff,0xff,0xff]),info=element(0x1549a966,[integer(0x2ad7b1,1000000),element(0x4d80,text('Cardable Studio')),element(0x5741,text('Cardable Studio')),float(0x4489,duration*1000)]),tracks=element(0x1654ae6b,[element(0xae,[integer(0xd7,1),integer(0x73c5,1),integer(0x83,1),integer(0x9c,0),element(0x86,text(codec==='vp8'?'V_VP8':'V_VP9')),integer(0x23e383,Math.round(1e9/fps)),element(0xe0,[integer(0xb0,w),integer(0xba,h)])])]);return join([ebml,segment,info,tracks]);}
  function cluster(chunk){var data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);var block=join([new Uint8Array([0x81,0,0,chunk.type==='key'?0x80:0]),data]);return element(0x1f43b675,[integer(0xe7,Math.round(chunk.timestamp/1000)),element(0xa3,block)]);}
  C.studioWebM={header:header,cluster:cluster};
})(window.Cardable);
