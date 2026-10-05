const { IPC_CHANNELS } = require('../ipc/channels');
let window = null, pending = null;
function state() { const bounds = window && !window.isDestroyed() ? window.getContentBounds() : {width:1920,height:1080}; return {width:bounds.width,height:bounds.height,mini:false}; }
function sendState() { pending = null; if(window && !window.isDestroyed() && !window.webContents.isDestroyed())window.webContents.send(IPC_CHANNELS.WINDOW_RUNTIME_STATE,state()); }
function schedule() { if(pending === null)pending = setImmediate(sendState); }
module.exports = {
  state, init(win) { window=win; win.on('resize',schedule); win.webContents.on('did-finish-load',sendState); win.on('closed',()=>{window=null;if(pending!==null)clearImmediate(pending);pending=null;}); },
  scale(value) { if(typeof value!=='number'||!Number.isFinite(value)||value<.62||value>1.6||!window)return false; window.webContents.setZoomFactor(value);return true; },
  aspect(value) { if(typeof value!=='boolean'||!window)return false;window.setAspectRatio(value?16/9:0);return true; }
};
