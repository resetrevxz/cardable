const { IPC_CHANNELS } = require('../ipc/channels');
const { app, BrowserWindow, ipcMain, nativeImage, powerMonitor, powerSaveBlocker, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const windowState = require('../windows/window-state');
const config = require('../config/desktop-config');
let window = null, mini = null, pending = null, blocker = null, cueTimer = null, onBattery = false, signalled = false, lastReady = null;
let prefs = { taskbarProgress:true, alwaysOnTop:false }, pack = null, queued = null;
const miniUrl = pathToFileURL(path.join(__dirname,'mini.html')).href;
function state() { const bounds = window && !window.isDestroyed() ? window.getContentBounds() : {width:1920,height:1080}; return {width:bounds.width,height:bounds.height,mini:!!mini,onBattery,fullscreen:!!window&&window.isFullScreen(),visible:!!window&&window.isVisible()&&!window.isMinimized()}; }
function sendState() { pending = null; if(window && !window.isDestroyed() && !window.webContents.isDestroyed())window.webContents.send(IPC_CHANNELS.WINDOW_RUNTIME_STATE,state()); }
function schedule() { if(pending === null)pending = setImmediate(sendState); }
function stopBlocker() { if(blocker!==null){powerSaveBlocker.stop(blocker);blocker=null;} }
function focused() { return window && window.isFocused() || mini && mini.isFocused(); }
function clearCue() { signalled=false;clearTimeout(cueTimer);cueTimer=null; [window,mini].forEach(win=>{if(win&&!win.isDestroyed()){win.flashFrame(false);if(process.platform==='win32')win.setOverlayIcon(null,'');}}); }
function badge() { const size=24,bitmap=Buffer.alloc(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(Math.hypot(x-11.5,y-11.5)>11)continue;const i=(y*size+x)*4;bitmap[i]=247;bitmap[i+1]=245;bitmap[i+2]=245;bitmap[i+3]=255;}return nativeImage.createFromBitmap(bitmap,{width:size,height:size}); }
function taskbar() { [window,mini].forEach(win=>{if(win&&!win.isDestroyed())win.setProgressBar(prefs.taskbarProgress&&pack?(pack.ready>0?1:pack.progress):-1);}); }
function restore(action) { if(!window||window.isDestroyed())return false;if(mini){const old=mini;mini=null;old.destroy();}if(window.isMinimized())window.restore();window.show();window.focus();clearCue();sendState();if(action)window.webContents.send(IPC_CHANNELS.WINDOW_COMMAND,action);return true; }
function openMini() {
  if(!window||window.isDestroyed()||!pack||!pack.canMini)return false;
  if(mini)return restore();
  const saved=windowState.state,area=screen.getPrimaryDisplay().workArea;
  let x=saved.miniX,y=saved.miniY;
  if(!screen.getAllDisplays().some(d=>Number.isFinite(x)&&Number.isFinite(y)&&x>=d.workArea.x&&y>=d.workArea.y&&x+320<=d.workArea.x+d.workArea.width&&y+440<=d.workArea.y+d.workArea.height)){x=area.x+area.width-336;y=area.y+16;}
  mini=new BrowserWindow({width:320,height:440,x,y,frame:false,resizable:false,show:false,alwaysOnTop:prefs.alwaysOnTop,backgroundColor:config.backgroundColor,title:'Cardable Mini',icon:config.icons.ico,webPreferences:{preload:path.join(__dirname,'mini-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:true,devTools:config.isDev}});
  const win=mini;
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('will-attach-webview',e=>e.preventDefault());
  win.on('move',()=>{const b=win.getBounds();windowState.state.miniX=b.x;windowState.state.miniY=b.y;windowState.saveState();});
  win.on('focus',clearCue);win.on('closed',()=>{if(mini===win){mini=null;restore();}});
  win.once('ready-to-show',()=>{if(mini!==win)return;window.hide();win.show();win.focus();taskbar();sendState();});
  win.webContents.on('did-finish-load',()=>win.webContents.send('mini:state',pack));
  win.loadURL(miniUrl).catch(error=>{require('../logging/logger').warn('Mini view could not load',error.message);restore();});return true;
}
function command(args) { const arg=args.find(value=>/^--cardable-(inventory|settings|saves)$/.test(value));if(!arg)return false;const action=arg.slice('--cardable-'.length);if(!pack){queued=action;return true;}return restore(action); }
function initMiniHandlers() { ['mini:get-state','mini:restore','mini:open'].forEach(channel=>ipcMain.handle(channel,event=>{if(!mini||event.sender!==mini.webContents||event.senderFrame!==event.sender.mainFrame||event.senderFrame.url!==miniUrl)throw new Error('Untrusted Mini sender');if(channel==='mini:get-state')return pack;return restore(channel==='mini:open'&&pack&&pack.ready>0?'open-pack':null);})); }
module.exports = {
  state, restore, openMini, command,
  init(win) {
    window=win;onBattery=powerMonitor.isOnBatteryPower();initMiniHandlers();
    function battery(){onBattery=powerMonitor.isOnBatteryPower();sendState();}
    powerMonitor.on('on-battery',battery);powerMonitor.on('on-ac',battery);
    ['resize','move','show','hide','minimize','restore','enter-full-screen','leave-full-screen'].forEach(name=>win.on(name,schedule));
    win.on('focus',clearCue);win.webContents.on('did-finish-load',sendState);
    win.webContents.on('render-process-gone',stopBlocker);
    screen.on('display-metrics-changed',schedule);
    win.on('closed',()=>{powerMonitor.removeListener('on-battery',battery);powerMonitor.removeListener('on-ac',battery);screen.removeListener('display-metrics-changed',schedule);clearTimeout(cueTimer);window=null;if(mini){const old=mini;mini=null;old.destroy();}stopBlocker();if(pending!==null)clearImmediate(pending);pending=null;['mini:get-state','mini:restore','mini:open'].forEach(channel=>ipcMain.removeHandler(channel));});
    if(process.platform==='win32')app.setUserTasks(['inventory','settings','saves'].map(action=>({program:process.execPath,arguments:(app.isPackaged?'':'"'+app.getAppPath()+'" ')+'--cardable-'+action,iconPath:config.icons.ico,iconIndex:0,title:{inventory:'Open inventory',settings:'Open settings',saves:'Open saves folder'}[action],description:'Cardable '+action})));
    command(process.argv);
  },
  preferences(value) { if(!value||typeof value.taskbarProgress!=='boolean'||typeof value.alwaysOnTop!=='boolean')return false;prefs={taskbarProgress:value.taskbarProgress,alwaysOnTop:value.alwaysOnTop};[window,mini].forEach(win=>{if(win&&!win.isDestroyed())win.setAlwaysOnTop(prefs.alwaysOnTop);});taskbar();return true; },
  pack(value) {
    if(!value||!Number.isInteger(value.ready)||value.ready<0||value.ready>100||!Number.isFinite(value.progress)||value.progress<0||value.progress>1||typeof value.packId!=='string'||value.packId.length>80||typeof value.countdown!=='string'||value.countdown.length>80||typeof value.canMini!=='boolean'||!['very-low','low','medium','high'].includes(value.quality))return false;
    pack={ready:value.ready,progress:value.progress,packId:value.packId,countdown:value.countdown,canMini:value.canMini,quality:value.quality,reduced:!!value.reduced};taskbar();
    if(lastReady!==null&&pack.ready>lastReady&&!focused()&&!signalled){signalled=true;const win=mini||window;if(win){if(process.platform==='win32')win.setOverlayIcon(badge(),'Pack ready');win.flashFrame(true);cueTimer=setTimeout(()=>{if(!win.isDestroyed())win.flashFrame(false);},650);}}
    lastReady=pack.ready;if(pack.ready===0)clearCue();if(mini)mini.webContents.send('mini:state',pack);
    if(queued){const action=queued;queued=null;restore(action);}return true;
  },
  awake(value) { if(typeof value!=='boolean')return false;if(value&&blocker===null)blocker=powerSaveBlocker.start('prevent-display-sleep');else if(!value)stopBlocker();return true; },
  scale(value) { if(typeof value!=='number'||!Number.isFinite(value)||value<.62||value>1.6||!window)return false; window.webContents.setZoomFactor(value);return true; },
  aspect(value) { if(typeof value!=='boolean'||!window)return false;window.setAspectRatio(value?16/9:0);return true; }
};
