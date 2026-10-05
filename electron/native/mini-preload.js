const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cardableMini', {
  getState: () => ipcRenderer.invoke('mini:get-state'),
  restore: () => ipcRenderer.invoke('mini:restore'),
  open: () => ipcRenderer.invoke('mini:open'),
  onState: callback => {
    if(typeof callback!=='function')return () => {};
    const listener=(_event,state)=>callback(state);ipcRenderer.on('mini:state',listener);
    return () => ipcRenderer.removeListener('mini:state',listener);
  }
});
