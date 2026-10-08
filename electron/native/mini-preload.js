const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cardableMini', {
  getState: () => ipcRenderer.invoke('mini:get-state'),
  restore: action => ipcRenderer.invoke('mini:restore',action==='settings'?'settings':null),
  open: () => ipcRenderer.invoke('mini:open'),
  configure: value => ipcRenderer.invoke('mini:configure', value),
  move: value => ipcRenderer.invoke('mini:move', value),
  onState: callback => {
    if(typeof callback!=='function')return () => {};
    const listener=(_event,state)=>callback(state);ipcRenderer.on('mini:state',listener);
    return () => ipcRenderer.removeListener('mini:state',listener);
  }
});
