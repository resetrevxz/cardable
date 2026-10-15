'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
exports.start = root => new Promise(resolve => {
  const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2' };
  const server = http.createServer((req,res) => {
    let file;
    try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch (_) { res.writeHead(400).end(); return; }
    if(file !== root && !file.startsWith(root + path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file, (error,data) => { if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data); });
  });
  server.listen(0,'127.0.0.1',()=>{server.unref();resolve({url:'http://127.0.0.1:'+server.address().port,close:()=>server.close()});});
});
