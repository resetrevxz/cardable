(function(C,root){
  'use strict';
  function native(){return C.native&&C.native.studio;}
  function extension(blob){return {'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/webm':'webm'}[blob.type.split(';')[0]]||'png';}
  function name(label,blob){return String(label||'cardable-export').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').slice(0,140)+'.'+extension(blob);}
  function download(blob,label){var url=URL.createObjectURL(blob),a=root.document.createElement('a');a.href=url;a.download=name(label,blob);a.click();root.setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  async function save(blob,label){var n=native();if(n&&n.saveFile)return n.saveFile({name:name(label,blob),data:new Uint8Array(await blob.arrayBuffer())});download(blob,label);return true;}
  async function choose(){var n=native();if(n&&n.chooseFolder){var id=await n.chooseFolder();return id?{id:id,native:n}:null;}if(root.showDirectoryPicker){try{return {handle:await root.showDirectoryPicker({mode:'readwrite'})};}catch(e){if(e.name==='AbortError')return null;throw e;}}throw Error('Folder exports require the desktop app or a browser with folder access.');}
  async function write(folder,blob,label){var file=name(label,blob);if(folder.native)return folder.native.writeFile({folder:folder.id,name:file,data:new Uint8Array(await blob.arrayBuffer())});try{await folder.handle.getFileHandle(file);throw Error('An export with this name already exists.');}catch(e){if(e.name!=='NotFoundError')throw e;}var handle=await folder.handle.getFileHandle(file,{create:true}),stream=await handle.createWritable();try{await stream.write(blob);await stream.close();}catch(e){await stream.abort();throw e;}return true;}
  function release(folder){if(folder&&folder.native)return folder.native.releaseFolder(folder.id);return Promise.resolve();}
  C.studioFiles={save:save,download:download,choose:choose,write:write,release:release,name:name,get folders(){return !!(native()&&native().chooseFolder||root.showDirectoryPicker);},get clipboard(){return !!(native()&&native().copyImage);},copy:async function(blob){var n=native();if(!n||!n.copyImage)throw Error('Native image clipboard is unavailable.');return n.copyImage({name:name('clipboard',blob),data:new Uint8Array(await blob.arrayBuffer())});}};
})(window.Cardable,window);
