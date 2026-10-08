const { IPC_CHANNELS } = require('../ipc/channels');
const { app, BrowserWindow, ipcMain, nativeImage, powerMonitor, powerSaveBlocker, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const windowState = require('../windows/window-state');
const config = require('../config/desktop-config');
let window = null, mini = null, pending = null, blocker = null, cueTimer = null, onBattery = false, signalled = false, lastReady = null;
let prefs = { taskbarProgress:true, alwaysOnTop:false }, pack = null, queued = null;
let lastState = null, progressValues = new WeakMap();
const tiers=['very-low','low','medium','high'],graphicsKeys=['finishQuality','reflectionQuality','propQuality','particleQuality','shadowQuality','glassQuality','backgroundQuality','animationQuality','canvasQuality','cinematicQuality'];
const miniUrl = pathToFileURL(path.join(__dirname,'mini.html')).href;
function state() { const bounds = window && !window.isDestroyed() ? window.getContentBounds() : {width:1920,height:1080}; return {width:bounds.width,height:bounds.height,mini:!!mini,onBattery,fullscreen:!!window&&window.isFullScreen(),visible:!!window&&window.isVisible()&&!window.isMinimized()}; }
function sendState(force = false) { pending = null; if(window && !window.isDestroyed() && !window.webContents.isDestroyed()){const value=state(),signature=JSON.stringify(value);if(!force&&signature===lastState)return;lastState=signature;window.webContents.send(IPC_CHANNELS.WINDOW_RUNTIME_STATE,value);} }
function schedule() { if(pending === null)pending = setImmediate(sendState); }
function stopBlocker() { if(blocker!==null){powerSaveBlocker.stop(blocker);blocker=null;} }
function focused() { return window && window.isFocused() || mini && mini.isFocused(); }
function clearCue() { if(!signalled&&cueTimer===null)return;signalled=false;clearTimeout(cueTimer);cueTimer=null; [window,mini].forEach(win=>{if(win&&!win.isDestroyed()){win.flashFrame(false);if(process.platform==='win32')win.setOverlayIcon(null,'');}}); }
function badge() { const size=24,bitmap=Buffer.alloc(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(Math.hypot(x-11.5,y-11.5)>11)continue;const i=(y*size+x)*4;bitmap[i]=247;bitmap[i+1]=245;bitmap[i+2]=245;bitmap[i+3]=255;}return nativeImage.createFromBitmap(bitmap,{width:size,height:size}); }
function taskbar() { const value=prefs.taskbarProgress&&pack?(pack.ready>0?1:pack.progress):-1;[window,mini].forEach(win=>{if(win&&!win.isDestroyed()&&progressValues.get(win)!==value){win.setProgressBar(value);progressValues.set(win,value);}}); }
function restore(action) { if(!window||window.isDestroyed())return false;if(mini){const old=mini;mini=null;old.destroy();}if(window.isMinimized())window.restore();window.show();window.focus();clearCue();sendState();if(action)window.webContents.send(IPC_CHANNELS.WINDOW_COMMAND,action);return true; }
function openMini() {
  if(!window||window.isDestroyed()||!pack||!pack.canMini)return false;
  if(mini)return restore();
  const saved=windowState.state,display=screen.getDisplayMatching(window.getBounds()),area=display.workArea;
  const placement=saved.miniByDisplay&&saved.miniByDisplay[String(display.id)]||{};
  let x=placement.x??saved.miniX,y=placement.y??saved.miniY;
  if(!screen.getAllDisplays().some(d=>Number.isFinite(x)&&Number.isFinite(y)&&x>=d.workArea.x&&y>=d.workArea.y&&x+320<=d.workArea.x+d.workArea.width&&y+440<=d.workArea.y+d.workArea.height)){x=area.x+area.width-336;y=area.y+16;}
  mini=new BrowserWindow({width:320,height:440,x,y,frame:false,resizable:false,show:false,alwaysOnTop:saved.miniPinned??prefs.alwaysOnTop,opacity:Number.isFinite(saved.miniOpacity)?Math.max(.5,Math.min(1,saved.miniOpacity)):1,backgroundColor:config.backgroundColor,title:'Cardable Mini',icon:config.icons.ico,webPreferences:{preload:path.join(__dirname,'mini-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:true,devTools:config.isDev}});
  const win=mini;
  pack.miniPinned=win.isAlwaysOnTop();pack.miniOpacity=win.getOpacity();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('will-attach-webview',e=>e.preventDefault());
  win.on('move',()=>{const b=win.getBounds();windowState.state.miniX=b.x;windowState.state.miniY=b.y;const d=screen.getDisplayMatching(b);windowState.state.miniByDisplay=windowState.state.miniByDisplay||{};windowState.state.miniByDisplay[String(d.id)]={x:b.x,y:b.y};windowState.saveState();});
  win.on('focus',clearCue);win.on('closed',()=>{if(mini===win){mini=null;restore();}});
  win.once('ready-to-show',()=>{if(mini!==win)return;window.hide();win.show();win.focus();taskbar();sendState();});
  win.webContents.on('did-finish-load',()=>win.webContents.send('mini:state',pack));
  win.loadURL(miniUrl).catch(error=>{require('../logging/logger').warn('Mini view could not load',error.message);restore();});return true;
}
function command(args) { const arg=args.find(value=>/^--cardable-(inventory|settings|saves)$/.test(value));if(!arg)return false;const action=arg.slice('--cardable-'.length);if(!pack){queued=action;return true;}return restore(action); }
function initMiniHandlers() {
  ['mini:get-state','mini:restore','mini:open','mini:configure','mini:move'].forEach(channel => {
    ipcMain.handle(channel, (event,value) => {
      if (!mini || event.sender !== mini.webContents || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== miniUrl) {
        throw new Error('Untrusted Mini sender');
      }
      if (channel === 'mini:get-state') return pack;
      if (channel === 'mini:move') {
        if (!value || !Number.isFinite(value.dx) || !Number.isFinite(value.dy) || Math.abs(value.dx)>5000 || Math.abs(value.dy)>5000) return false;
        const bounds=mini.getBounds();
        const candidate={...bounds,x:Math.round(bounds.x+value.dx),y:Math.round(bounds.y+value.dy)};
        const area=screen.getDisplayMatching(candidate).workArea;
        mini.setPosition(Math.max(area.x,Math.min(area.x+area.width-bounds.width,candidate.x)),Math.max(area.y,Math.min(area.y+area.height-bounds.height,candidate.y)));
        return true;
      }
      if (channel === 'mini:configure') {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          value.pinned != null && typeof value.pinned !== 'boolean' ||
          value.opacity != null && (!Number.isFinite(value.opacity) || value.opacity<.5 || value.opacity>1)) return false;
        if (value.pinned != null) { mini.setAlwaysOnTop(value.pinned); windowState.state.miniPinned=value.pinned; }
        if (value.opacity != null) { mini.setOpacity(value.opacity); windowState.state.miniOpacity=value.opacity; }
        windowState.saveState();
        pack.miniPinned=mini.isAlwaysOnTop(); pack.miniOpacity=mini.getOpacity();
        mini.webContents.send('mini:state',pack);
        return true;
      }
      return restore(channel==='mini:restore'&&value==='settings'?'settings':channel === 'mini:open' && pack && pack.ready>0 ? 'open-pack' : null);
    });
  });
}

module.exports = {
  state, restore, openMini, command,
  init(win) {
    window=win;lastState=null;progressValues=new WeakMap();onBattery=powerMonitor.isOnBatteryPower();initMiniHandlers();
    function battery(){onBattery=powerMonitor.isOnBatteryPower();sendState();}
    powerMonitor.on('on-battery',battery);powerMonitor.on('on-ac',battery);
    ['resize','move','show','hide','minimize','restore','enter-full-screen','leave-full-screen'].forEach(name=>win.on(name,schedule));
    win.on('focus',clearCue);win.webContents.on('did-finish-load',()=>sendState(true));
    win.webContents.on('render-process-gone',stopBlocker);
    screen.on('display-metrics-changed',schedule);
    win.on('closed',()=>{powerMonitor.removeListener('on-battery',battery);powerMonitor.removeListener('on-ac',battery);screen.removeListener('display-metrics-changed',schedule);clearTimeout(cueTimer);window=null;if(mini){const old=mini;mini=null;old.destroy();}stopBlocker();if(pending!==null)clearImmediate(pending);pending=null;['mini:get-state','mini:restore','mini:open','mini:configure','mini:move'].forEach(channel=>ipcMain.removeHandler(channel));});
    if(process.platform==='win32')app.setUserTasks(['inventory','settings','saves'].map(action=>({program:process.execPath,arguments:(app.isPackaged?'':'"'+app.getAppPath()+'" ')+'--cardable-'+action,iconPath:config.icons.ico,iconIndex:0,title:{inventory:'Open inventory',settings:'Open settings',saves:'Open saves folder'}[action],description:'Cardable '+action})));
    command(process.argv);
  },
  preferences(value) { if(!value||typeof value.taskbarProgress!=='boolean'||typeof value.alwaysOnTop!=='boolean')return false;prefs={taskbarProgress:value.taskbarProgress,alwaysOnTop:value.alwaysOnTop,notifyPackReady:value.notifyPackReady!==false};if(window&&!window.isDestroyed())window.setAlwaysOnTop(prefs.alwaysOnTop);if(mini&&!mini.isDestroyed())mini.setAlwaysOnTop(windowState.state.miniPinned??prefs.alwaysOnTop);taskbar();return true; },
  pack(value) {
    if(!value||!Number.isInteger(value.ready)||value.ready<0||value.ready>100||!Number.isFinite(value.progress)||value.progress<0||value.progress>1||typeof value.packId!=='string'||value.packId.length>80||typeof value.countdown!=='string'||value.countdown.length>80||typeof value.canMini!=='boolean'||!['very-low','low','medium','high'].includes(value.quality))return false;
    if(value.graphics!=null&&(typeof value.graphics!=='object'||Array.isArray(value.graphics)||graphicsKeys.some(key=>value.graphics[key]!=null&&!tiers.includes(value.graphics[key]))))return false;
    const graphics={};graphicsKeys.forEach(key=>{graphics[key]=value.graphics&&value.graphics[key]!=null?value.graphics[key]:value.quality;});
    const keys={};if(value.keyBindings&&typeof value.keyBindings==='object'){['menu.mini','opening.hold','global.settings'].forEach(id=>{if(Array.isArray(value.keyBindings[id]))keys[id]=value.keyBindings[id].filter(v=>typeof v==='string'&&v.length<60).slice(0,2);});}
    pack={keyBindings:keys,ready:value.ready,progress:value.progress,packId:value.packId,countdown:value.countdown,canMini:value.canMini,quality:value.quality,reduced:!!value.reduced,rarityColor:value.rarityColor==='mono'?'mono':'color',graphics,miniPinned:mini?mini.isAlwaysOnTop():windowState.state.miniPinned??prefs.alwaysOnTop,miniOpacity:mini?mini.getOpacity():windowState.state.miniOpacity||1};taskbar();
    if(lastReady!==null&&pack.ready>lastReady&&prefs.notifyPackReady!==false&&!focused()&&!signalled){signalled=true;const win=mini||window;if(win){if(process.platform==='win32')win.setOverlayIcon(badge(),'Pack ready');win.flashFrame(true);if(require('electron').Notification.isSupported()){const note=new (require('electron').Notification)({title:'Cardable · Pack ready',body:'A '+pack.packId+' pack is ready to open.',silent:true});note.on('click',()=>restore());note.show();}cueTimer=setTimeout(()=>{if(!win.isDestroyed())win.flashFrame(false);},650);}}
    lastReady=pack.ready;if(pack.ready===0)clearCue();if(mini)mini.webContents.send('mini:state',pack);
    if(queued){const action=queued;queued=null;restore(action);}return true;
  },
  awake(value) { if(typeof value!=='boolean')return false;if(value&&blocker===null)blocker=powerSaveBlocker.start('prevent-display-sleep');else if(!value)stopBlocker();return true; },
  scale(value) { if(typeof value!=='number'||!Number.isFinite(value)||value<.35||value>2.4||!window)return false; window.webContents.setZoomFactor(value);return true; },
  aspect(value) { if(typeof value!=='boolean'||!window)return false;window.setAspectRatio(value?16/9:0);return true; }
};
