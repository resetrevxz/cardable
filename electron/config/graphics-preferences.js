const { app } = require('electron');
const fs = require('fs');
const path = require('path');
function file() { return path.join(app.getPath('userData'), 'graphics-preferences.json'); }
function read() { try { const text=fs.readFileSync(file(),'utf8');return text.length<2048&&JSON.parse(text).unlimited===true; } catch (_) { return false; } }
function write(unlimited) { if(typeof unlimited!=='boolean')return false;const target=file();fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',JSON.stringify({unlimited}));fs.renameSync(target+'.tmp',target);return true; }
module.exports={read,write};
