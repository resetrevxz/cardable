const { IPC_CHANNELS } = require('../ipc/channels');
const { app, BrowserWindow, ipcMain, nativeImage, powerMonitor, powerSaveBlocker, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const windowState = require('../windows/window-state');
const config = require('../config/desktop-config');
let window = null, mini = null, pending = null, blocker = null, cueTimer = null, onBattery = false, signalled = false, lastReady = null;
let prefs = { taskbarProgress:true, alwaysOnTop:false }, pack = null, queued = null;
let lastState = null, progressValues = new WeakMap();
let miniRequest = null, requestSequence = 0;
function finishRequest(value){if(!miniRequest)return false;const item=miniRequest;miniRequest=null;clearTimeout(item.timer);item.resolve(value);return true;}
function requestMini(type,value){
  if(miniRequest||!window||window.isDestroyed()||window.webContents.isDestroyed())return Promise.resolve({ok:false,message:'An action is already saving. Please wait.'});
  return new Promise(resolve=>{const id=++requestSequence;miniRequest={id,resolve,timer:setTimeout(()=>finishRequest({ok:false,message:'The game did not respond. Expand Cardable to recover your reserved card.'}),8000)};window.webContents.send(IPC_CHANNELS.WINDOW_COMMAND,{type,id,...value});});
}
function dockMini(){if(!mini||mini.isDestroyed())return;const area=screen.getDisplayMatching(mini.getBounds()).workArea,b=mini.getBounds();mini.setPosition(prefs.miniSide==='left'?area.x+12:area.x+area.width-b.width-12,area.y+Math.max(0,Math.round((area.height-b.height)/2)));}
const tiers=['very-low','low','medium','high','very-high'],graphicsKeys=['finishQuality','reflectionQuality','propQuality','particleQuality','shadowQuality','glassQuality','backgroundQuality','animationQuality','canvasQuality','cinematicQuality'];
const miniUrl = pathToFileURL(path.join(__dirname,'mini.html')).href;
function state() { const bounds = window && !window.isDestroyed() ? window.getContentBounds() : {width:1920,height:1080}; return {width:bounds.width,height:bounds.height,mini:!!mini,onBattery,fullscreen:!!window&&window.isFullScreen(),visible:!!window&&window.isVisible()&&!window.isMinimized()}; }
function sendState(force = false) { pending = null; if(window && !window.isDestroyed() && !window.webContents.isDestroyed()){const value=state(),signature=JSON.stringify(value);if(!force&&signature===lastState)return;lastState=signature;window.webContents.send(IPC_CHANNELS.WINDOW_RUNTIME_STATE,value);} }
function schedule() { if(pending === null)pending = setImmediate(sendState); }
function stopBlocker() { if(blocker!==null){powerSaveBlocker.stop(blocker);blocker=null;} }
function focused() { return window && window.isFocused() || mini && mini.isFocused(); }
function clearCue() { if(!signalled&&cueTimer===null)return;signalled=false;clearTimeout(cueTimer);cueTimer=null; [window,mini].forEach(win=>{if(win&&!win.isDestroyed()){win.flashFrame(false);if(process.platform==='win32')win.setOverlayIcon(null,'');}}); }
function badge() { const size=24,bitmap=Buffer.alloc(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(Math.hypot(x-11.5,y-11.5)>11)continue;const i=(y*size+x)*4;bitmap[i]=247;bitmap[i+1]=245;bitmap[i+2]=245;bitmap[i+3]=255;}return nativeImage.createFromBitmap(bitmap,{width:size,height:size}); }
function taskbar() { const value=prefs.taskbarProgress&&pack?(pack.ready>0?1:pack.progress):-1;[window,mini].forEach(win=>{if(win&&!win.isDestroyed()&&progressValues.get(win)!==value){win.setProgressBar(value);progressValues.set(win,value);}}); }
function restore(action) { if(!window||window.isDestroyed())return false;finishRequest({ok:false,message:'Returned to Cardable.'});if(mini){const old=mini;mini=null;old.destroy();}if(window.isMinimized())window.restore();window.show();window.focus();clearCue();sendState();if(action)window.webContents.send(IPC_CHANNELS.WINDOW_COMMAND,action);return true; }
function openMini() {
  if(!window||window.isDestroyed()||!pack||!pack.canMini)return false;
  if(mini)return restore();
  const display=screen.getDisplayMatching(window.getBounds()),area=display.workArea;
  const width=Math.min(352,area.width),height=Math.min(620,area.height);
  const x=prefs.miniSide==='left'?area.x+12:area.x+area.width-width-12,y=area.y+Math.max(0,Math.round((area.height-height)/2));
  mini=new BrowserWindow({width,height,x,y,frame:false,resizable:false,show:false,alwaysOnTop:true,backgroundColor:config.backgroundColor,title:'Cardable Mini',icon:config.icons.ico,webPreferences:{preload:path.join(__dirname,'mini-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:true,devTools:config.isDev}});
  const win=mini;
  pack.miniPinned=win.isAlwaysOnTop();pack.miniOpacity=win.getOpacity();
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('will-attach-webview',e=>e.preventDefault());
  win.on('move',()=>{const b=win.getBounds();windowState.state.miniX=b.x;windowState.state.miniY=b.y;const d=screen.getDisplayMatching(b);windowState.state.miniByDisplay=windowState.state.miniByDisplay||{};windowState.state.miniByDisplay[String(d.id)]={x:b.x,y:b.y};windowState.saveState();});
  win.on('focus',clearCue);win.on('closed',()=>{if(mini===win){mini=null;restore();}});
  win.once('ready-to-show',()=>{if(mini!==win)return;window.hide();win.show();win.focus();taskbar();sendState();});
  win.webContents.on('did-finish-load',()=>win.webContents.send('mini:state',pack));
  win.webContents.on('render-process-gone',()=>{if(mini===win)restore();});
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
      if (channel === 'mini:open') {
        if(!value||typeof value.token!=='string'||value.token!==pack.token||!pack.canMini||value.choice!=null&&(!Number.isInteger(value.choice)||value.choice<0||value.choice>2))return {ok:false,message:'The pack changed. Please try again.'};
        return requestMini('mini-action',{token:value.token,choice:value.choice??null});
      }
      if (channel === 'mini:configure') {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          value.side != null && !['left','right'].includes(value.side) ||
          value.fps != null && ![30,60].includes(value.fps)) return {ok:false,message:'Invalid mini settings.'};
        return requestMini('mini-configure',{side:value.side,fps:value.fps});
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
    screen.on('display-metrics-changed',dockMini);screen.on('display-removed',dockMini);screen.on('display-metrics-changed',schedule);
    win.on('closed',()=>{finishRequest({ok:false,message:'Cardable closed.'});powerMonitor.removeListener('on-battery',battery);powerMonitor.removeListener('on-ac',battery);screen.removeListener('display-metrics-changed',schedule);screen.removeListener('display-metrics-changed',dockMini);screen.removeListener('display-removed',dockMini);clearTimeout(cueTimer);window=null;if(mini){const old=mini;mini=null;old.destroy();}stopBlocker();if(pending!==null)clearImmediate(pending);pending=null;['mini:get-state','mini:restore','mini:open','mini:configure','mini:move'].forEach(channel=>ipcMain.removeHandler(channel));});
    if(process.platform==='win32')app.setUserTasks(['inventory','settings','saves'].map(action=>({program:process.execPath,arguments:(app.isPackaged?'':'"'+app.getAppPath()+'" ')+'--cardable-'+action,iconPath:config.icons.ico,iconIndex:0,title:{inventory:'Open inventory',settings:'Open settings',saves:'Open saves folder'}[action],description:'Cardable '+action})));
    command(process.argv);
  },
  preferences(value) { if(!value||typeof value.taskbarProgress!=='boolean'||typeof value.alwaysOnTop!=='boolean'||value.miniSide!=null&&!['left','right'].includes(value.miniSide)||value.miniFps!=null&&![30,60].includes(value.miniFps))return false;const oldSide=prefs.miniSide;prefs={taskbarProgress:value.taskbarProgress,alwaysOnTop:value.alwaysOnTop,notifyPackReady:value.notifyPackReady!==false,miniSide:value.miniSide||'right',miniFps:value.miniFps===60?60:30};if(window&&!window.isDestroyed())window.setAlwaysOnTop(prefs.alwaysOnTop);if(oldSide!==prefs.miniSide)dockMini();taskbar();return true; },
  completeMiniAction(value){if(!value||!miniRequest||value.id!==miniRequest.id||typeof value.ok!=='boolean'||typeof value.message!=='string'||value.message.length>400)return false;return finishRequest({ok:value.ok,message:value.message});},
  pack(value) {
    if(!value||!Number.isInteger(value.ready)||value.ready<0||value.ready>100||!Number.isFinite(value.progress)||value.progress<0||value.progress>1||typeof value.packId!=='string'||value.packId.length>80||typeof value.countdown!=='string'||value.countdown.length>80||typeof value.canMini!=='boolean'||!tiers.includes(value.quality))return false;
    if(value.graphics!=null&&(typeof value.graphics!=='object'||Array.isArray(value.graphics)||graphicsKeys.some(key=>value.graphics[key]!=null&&!tiers.includes(value.graphics[key]))))return false;
    const graphics={};graphicsKeys.forEach(key=>{graphics[key]=value.graphics&&value.graphics[key]!=null?value.graphics[key]:value.quality;});
    const keys={};if(value.keyBindings&&typeof value.keyBindings==='object'){['menu.mini','opening.hold','opening.keep','global.settings'].forEach(id=>{if(Array.isArray(value.keyBindings[id]))keys[id]=value.keyBindings[id].filter(v=>typeof v==='string'&&v.length<60).slice(0,2);});}
    pack={keyBindings:keys,ready:value.ready,progress:value.progress,packId:value.packId,countdown:value.countdown,canMini:value.canMini,quality:value.quality,reduced:!!value.reduced,rarityColor:value.rarityColor==='mono'?'mono':'color',graphics,miniPinned:mini?mini.isAlwaysOnTop():windowState.state.miniPinned??prefs.alwaysOnTop,miniOpacity:mini?mini.getOpacity():windowState.state.miniOpacity||1};taskbar();
    function card(row){if(!row||typeof row.name!=='string'||typeof row.rarity!=='string')return null;return {id:String(row.id||'').slice(0,100),name:row.name.slice(0,120),rarity:row.rarity.slice(0,60),tier:Number.isInteger(row.tier)?row.tier:0,serial:String(row.serial||'').slice(0,80),variant:String(row.variant||'').slice(0,80),art:typeof row.art==='string'&&/^assets\/cards\/[a-z0-9_-]+\.webp$/i.test(row.art)?row.art:null};}
    pack.token=typeof value.token==='string'?value.token.slice(0,500):'';pack.capacity=Number.isInteger(value.capacity)?value.capacity:4;pack.credits=Number.isSafeInteger(value.credits)?value.credits:0;pack.nextPackName=String(value.nextPackName||value.packId).slice(0,100);pack.miniFps=value.miniFps===60?60:30;pack.miniSide=value.miniSide==='left'?'left':'right';pack.accent=typeof value.accent==='string'?value.accent.slice(0,30):'';
    pack.remainingMs=Number.isFinite(value.remainingMs)&&value.remainingMs>=0?Math.min(86400000,value.remainingMs):0;
    pack.recent=Array.isArray(value.recent)?value.recent.slice(0,3).map(card).filter(Boolean):[];
    pack.reveal=value.reveal&&Array.isArray(value.reveal.cards)?{packName:String(value.reveal.packName||'Pack').slice(0,100),choices:!!value.reveal.choices,cards:value.reveal.cards.slice(0,3).map(card).filter(Boolean)}:null;
    if(lastReady!==null&&pack.ready>lastReady&&prefs.notifyPackReady!==false&&!focused()&&!signalled){signalled=true;const win=mini||window;if(win){if(process.platform==='win32')win.setOverlayIcon(badge(),'Pack ready');win.flashFrame(true);if(require('electron').Notification.isSupported()){const note=new (require('electron').Notification)({title:'Cardable · Pack ready',body:'A '+pack.packId+' pack is ready to open.',silent:true});note.on('click',()=>restore());note.show();}cueTimer=setTimeout(()=>{if(!win.isDestroyed())win.flashFrame(false);},650);}}
    lastReady=pack.ready;if(pack.ready===0)clearCue();if(mini)mini.webContents.send('mini:state',pack);
    if(queued){const action=queued;queued=null;restore(action);}return true;
  },
  awake(value) { if(typeof value!=='boolean')return false;if(value&&blocker===null)blocker=powerSaveBlocker.start('prevent-display-sleep');else if(!value)stopBlocker();return true; },
  scale(value) { if(typeof value!=='number'||!Number.isFinite(value)||value<.35||value>2.4||!window)return false; window.webContents.setZoomFactor(value);return true; },
  aspect(value) { if(!window||![true,false,'free','16:9','21:9'].includes(value))return false;window.setAspectRatio(value===true||value==='16:9'?16/9:value==='21:9'?21/9:0);return true; },
  size(value){if(!window||!value||!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width<config.minWidth||value.width>7680||value.height<config.minHeight||value.height>4320)return false;const area=screen.getDisplayMatching(window.getBounds()).workArea;window.setFullScreen(false);if(window.isMaximized())window.unmaximize();window.setSize(Math.min(area.width,value.width),Math.min(area.height,value.height));window.center();sendState();return {width:window.getBounds().width,height:window.getBounds().height};}
};
