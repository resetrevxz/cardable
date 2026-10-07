'use strict';
// Developer-only local delivery. No installation, launch, renderer API or service.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process'), {pathToFileURL} = require('node:url');
const asar = require('@electron/asar');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
const dist = path.join(root, 'dist'), home = path.join(dist, 'delivery');
const backend = path.join(__dirname, 'desktop-delivery.ps1');
const idPattern = /^[0-9TZ.-]+-[0-9a-f]{12}$/;
const mode = ['inspect','verify','resume'].find(value=>process.argv.includes('--'+value)) || process.env.CARDABLE_DELIVERY_MODE || 'deliver';
let scratch, owner;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {cwd:root, windowsHide:true, encoding:'utf8', maxBuffer:32*1024*1024, ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status}): ${result.stderr || ''}`);
  return (result.stdout || '').trim();
}
function git(args) { return run('git', args); }
function ps(action, payload) {
  let file;
  if (payload) { file=path.join(home,'control',owner.token+'.request.json'); noLinks(file);fs.writeFileSync(file,JSON.stringify(payload)); }
  const text=run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',backend,'-Action',action,...(file?['-PayloadPath',file]:[])]);
  return action==='Guard'||action==='Remove'?text:JSON.parse(text);
}
function sha(bytes) {return crypto.createHash('sha256').update(bytes).digest('hex');}
function hash(file) {return sha(fs.readFileSync(file));}
function equalPath(a,b){return path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();}
function inside(base,file){const relative=path.relative(base,path.resolve(file));return !!relative&&!relative.startsWith('..')&&!path.isAbsolute(relative);}
function lexical(file,base=dist){if(!inside(base,file))throw new Error('Path escapes owned output: '+file);return path.resolve(file);}
function noLinks(file) {
  lexical(file);
  let cursor=path.resolve(file);
  while (true) {
    if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw new Error('Refusing link/junction: '+cursor);
    const next=path.dirname(cursor);if(next===cursor)break;cursor=next;
  }
}
function files(folder) {
  if(fs.lstatSync(folder).isSymbolicLink())throw new Error('Refusing linked directory: '+folder);
  const list=[];
  function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(fs.lstatSync(file).isSymbolicLink())throw new Error('Refusing link: '+file);if(entry.isDirectory())visit(file);else if(entry.isFile())list.push(file);else throw new Error('Unsupported artifact: '+file);}}
  visit(folder);return list;
}
function tree(folder) {return files(folder).map(file=>({path:path.relative(folder,file).replaceAll('\\','/'),size:fs.statSync(file).size,sha256:hash(file)}));}
function verifyTree(folder,expected){noLinks(folder);const actual=tree(folder);if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Artifact changed: '+folder);}
function atomic(file,value) {
  noLinks(file);const temporary=file+'.writing';noLinks(temporary);
  const fd=fs.openSync(temporary,'w');try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temporary,file);
}
function read(file){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;}
function removeTree(folder,expected) {
  lexical(folder);verifyTree(folder,expected);ps('Remove',{paths:[folder],target:folder,expected});
}
function move(from,to){lexical(from);lexical(to);ps('Guard',{paths:[from,to]});fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(from,to);}
function source() {
  const shipped=['index.html','desktop-release.json','CHANGELOG.md'];
  for(const name of ['src','assets','electron','vendor']) shipped.push(...files(path.join(root,name)).map(file=>path.relative(root,file).replaceAll('\\','/')));
  shipped.sort();
  const entries=shipped.map(name=>({path:name,size:fs.statSync(path.join(root,name)).size,sha256:hash(path.join(root,name))}));
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
  if(pkg.version!==JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'))).version || !fs.readFileSync(path.join(root,'src/config.js'),'utf8').includes("version: '"+pkg.version+"'"))throw new Error('Version sources disagree');
  const buildInputs=['package.json','package-lock.json','electron-builder.config.cjs','tools/deliver-desktop.cjs','tools/desktop-delivery.config.cjs','tools/desktop-delivery.ps1','tools/nsis-installer.nsh'].map(name=>({path:name,sha256:hash(path.join(root,name))}));
  const fingerprint=sha(JSON.stringify(entries)+JSON.stringify(buildInputs));
  const status=git(['status','--porcelain=v1','--untracked-files=all']);
  const untracked=git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean).sort().map(name=>{const file=path.join(root,name);return [name,fs.lstatSync(file).isSymbolicLink()?'link':hash(file)];});
  return {version:pkg.version,sourceRevision:git(['rev-parse','HEAD']),sourceFingerprint:fingerprint,dirtyFingerprint:sha(git(['diff','--binary','HEAD'])+status+JSON.stringify(untracked)),dirtyStatus:status,files:entries,buildInputs};
}
function inspectLegacy(info) {
  const dirs=new Set([path.join(dist,'win-unpacked')]);
  if(fs.existsSync(dist))for(const item of fs.readdirSync(dist,{withFileTypes:true}))if(item.isDirectory()&&item.name!=='delivery')dirs.add(path.join(dist,item.name,'win-unpacked'));
  const builds=[];
  for(const folder of dirs){const archive=path.join(folder,'resources','app.asar'),exe=path.join(folder,'Cardable.exe');if(!fs.existsSync(archive)||!fs.existsSync(exe))continue;
    try{noLinks(folder);const pkg=JSON.parse(asar.extractFile(archive,'package.json'));if(pkg.name!=='cardable'||pkg.productName!=='Cardable'||pkg.main!=='electron/main.js')continue;
      const config=asar.extractFile(archive,path.normalize('electron/config/desktop-config.js')).toString();
      if(!config.includes("appId: 'com.cardable.game'"))continue;
      if(sha(asar.extractFile(archive,'index.html'))!==hash(path.join(root,'index.html')))continue;
      builds.push({path:folder,version:pkg.version,exeHash:hash(exe),asarHash:hash(archive),ownership:'verified checkout candidate; not adopted for removal'});
    }catch(error){builds.push({path:folder,rejected:error.message});}
  }
  return {at:new Date().toISOString(),builds,links:info.links};
}
function binding(info,legacy) {
  const stored=read(path.join(home,'binding.json'));
  if(stored){lexical(stored.preview);if(stored.schema!==1||stored.repo!==root||path.basename(stored.preview)!=='win-unpacked'||inside(home,stored.preview)||!equalPath(stored.adoptedPreview?.path||root,stored.preview)||stored.entryUrl!==pathToFileURL(path.join(stored.preview,'resources','app.asar','index.html')).href)throw new Error('Preview binding ownership/path mismatch');if(!equalPath(stored.shortcut,path.join(info.desktop,'Cardable (Latest Build).lnk')))throw new Error('Desktop changed; retain existing delivery and review the binding.');return stored;}
  const requested=process.env.CARDABLE_DELIVERY_PREVIEW;
  const linked=info.links.filter(link=>!link.arguments&&legacy.builds.some(build=>!build.rejected&&equalPath(path.join(build.path,'Cardable.exe'),link.target))).map(link=>path.dirname(link.target));
  const choices=[...new Set(linked.map(folder=>folder.toLowerCase()))];
  const preview=requested?path.resolve(root,requested):choices.length===1?linked[0]:null;
  if(!preview)throw new Error('Preview origin is unresolved. Review delivery/legacy-inventory.json, export saves and download photos before choosing a different origin. Set CARDABLE_DELIVERY_PREVIEW to the existing preview directory.');
  lexical(preview);ps('Guard',{paths:[preview]});
  const existing=legacy.builds.find(build=>!build.rejected&&equalPath(build.path,preview));
  if(!existing)throw new Error('First preview binding must adopt a verified existing checkout preview; no silent storage-origin transition.');
  const value={schema:1,repo:root,preview,entryUrl:pathToFileURL(path.join(preview,'resources','app.asar','index.html')).href,shortcut:path.join(info.desktop,'Cardable (Latest Build).lnk'),adoptedPreview:existing};
  atomic(path.join(home,'binding.json'),value);return value;
}
function validated(folder,identity) {
  ps('Guard',{paths:[folder]});
  const installer=path.join(folder,`Cardable-Setup-${identity.version}.exe`),preview=path.join(folder,'win-unpacked'),archive=path.join(preview,'resources','app.asar');
  for(const file of [installer,path.join(preview,'Cardable.exe'),archive])if(!fs.existsSync(file)||fs.statSync(file).size<1024*1024)throw new Error('Incomplete artifact: '+file);
  const pkg=JSON.parse(asar.extractFile(archive,'package.json'));
  if(pkg.version!==identity.version||pkg.name!=='cardable'||pkg.main!=='electron/main.js'||pkg.productName!=='Cardable'||JSON.stringify(pkg.cardableDelivery)!==JSON.stringify({buildId:identity.buildId,sourceRevision:identity.sourceRevision,sourceFingerprint:identity.sourceFingerprint}))throw new Error('Packaged source identity mismatch');
  if(pkg.cardableDesktop?.updateFixture||pkg.scripts||pkg.devDependencies)throw new Error('Development metadata leaked into package');
  const entries=new Set(asar.listPackage(archive).map(name=>name.replace(/^[/\\]/,'').replaceAll('\\','/')));
  for(const name of ['electron/preload.js','electron/native/mini.html','src/core/card-deletion.js','src/ui/cutscene-replay.js','src/ui/performance.js','CHANGELOG.md','assets/icons/icon.ico'])if(!entries.has(name))throw new Error('Missing bundled file: '+name);
  for(const file of identity.files)if(!entries.has(file.path)||sha(asar.extractFile(archive,path.normalize(file.path)))!==file.sha256)throw new Error('Bundled source mismatch: '+file.path);
  const html=asar.extractFile(archive,'index.html').toString();
  if(!html.includes('Content-Security-Policy')||/<script[^>]+type="module"/.test(html))throw new Error('Offline/CSP contract changed');
  for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g))if(!/^(https?:|data:|#)/.test(match[1])&&!entries.has(match[1]))throw new Error('Missing HTML resource: '+match[1]);
  return {installer:path.relative(home,installer),installerBytes:fs.statSync(installer).size,installerSha256:hash(installer),previewFiles:tree(preview),artifactFiles:tree(folder)};
}
function recordFile(buildId){if(!idPattern.test(buildId))throw new Error('Invalid build ID');return path.join(home,'records',buildId+'.json');}
function artifactFolder(buildId){if(!idPattern.test(buildId))throw new Error('Invalid build ID');return path.join(home,'builds',buildId);}
function writeLatest(manifest) {
  atomic(recordFile(manifest.buildId),manifest);
  const prior=read(path.join(home,'latest.json'));
  if(prior?.status==='ready'&&prior.buildId!==manifest.buildId)atomic(path.join(home,'last-good.json'),prior);
  atomic(path.join(home,'latest.json'),manifest);
  if(manifest.status==='ready')atomic(path.join(home,'last-good.json'),manifest);
}
function verifyManifest(manifest){if(!manifest||manifest.schema!==1||manifest.repo!==root||!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(manifest.version))throw new Error('Delivery manifest is not owned by this checkout');const folder=artifactFolder(manifest.buildId),installer=path.join(folder,`Cardable-Setup-${manifest.version}.exe`);if(manifest.installer!==path.relative(home,installer))throw new Error('Installer pointer escaped its owned build');verifyTree(folder,manifest.artifactFiles);if(hash(installer)!==manifest.installerSha256||fs.statSync(installer).size!==manifest.installerBytes)throw new Error('Installer identity changed');}
function recover() {
  const journal=read(path.join(home,'transaction.json'));if(!journal)return;
  const bind=read(path.join(home,'binding.json'));if(!bind||!equalPath(journal.preview,bind.preview)||journal.repo!==root||!idPattern.test(journal.buildId))throw new Error('Unsafe transaction record');
  const staging=path.join(path.dirname(bind.preview),'.cardable-preview-'+journal.buildId);
  const backup=path.join(home,'rollback',journal.buildId,'preview');
  if(!equalPath(journal.staging,staging)||!equalPath(journal.backup,backup))throw new Error('Transaction path mismatch');
  if(ps('Inspect').processes.some(proc=>!proc.path||[bind.preview,backup,staging].some(folder=>inside(folder,proc.path))))throw new Error('Interrupted handoff has a running preview; close it normally before recovery.');
  ps('Guard',{paths:[bind.preview,backup,staging]});
  const committed=read(path.join(home,'latest.json'))?.buildId===journal.buildId&&read(path.join(home,'latest.json'))?.status==='ready';
  if(!committed){
    if(fs.existsSync(backup)){
      verifyTree(backup,journal.oldFiles);
      if(fs.existsSync(bind.preview))removeTree(bind.preview,journal.newFiles);
      move(backup,bind.preview);
    }else if(!fs.existsSync(bind.preview))throw new Error('Recovery requires the missing prior preview; nothing was deleted.');
    else verifyTree(bind.preview,journal.oldFiles);
    if(fs.existsSync(staging))removeTree(staging,journal.newFiles);
    console.log('Interrupted handoff rolled back to the previous preview; validated installer retained.');
  }else console.log('Committed handoff recovered; old owned output remains eligible for cleanup.');
  atomic(path.join(home,'history',journal.buildId+'-transaction.json'),{...journal,recoveredAt:new Date().toISOString(),committed});
  fs.unlinkSync(path.join(home,'transaction.json'));
}
function ensureShortcut(bind,info) {
  const existing=info.links.find(link=>equalPath(link.path,bind.shortcut));
  if(existing){if(existing.reparse||!equalPath(existing.target,path.join(bind.preview,'Cardable.exe'))||existing.arguments||!equalPath(existing.workingDirectory,bind.preview))throw new Error('Existing Latest Build shortcut has another owner/target; left unchanged.');return {path:bind.shortcut,target:existing.target,sha256:hash(bind.shortcut),refreshed:false};}
  if(fs.existsSync(bind.shortcut))throw new Error('Unrecognized shortcut exists; left unchanged.');
  const temporary=path.join(scratch,'Cardable (Latest Build).lnk'),target=path.join(bind.preview,'Cardable.exe');
  const link=ps('Shortcut',{path:temporary,target});
  if(!equalPath(link.target,target)||link.arguments||!equalPath(link.workingDirectory,bind.preview))throw new Error('Shortcut validation failed');
  // Known Desktop API destination; create exactly one new regular file, never
  // recurse into or remove a OneDrive/reparse Desktop directory.
  fs.copyFileSync(temporary,bind.shortcut,fs.constants.COPYFILE_EXCL);
  if(hash(temporary)!==hash(bind.shortcut))throw new Error('Shortcut copy mismatch');
  return {path:bind.shortcut,target,sha256:hash(bind.shortcut),refreshed:true};
}
function cleanup(manifest) {
  const remaining=[];
  for(const item of manifest.pendingCleanup){
    try{
      if(item.kind==='legacy'){remaining.push(item);continue;}
      if(!['build','rollback','staging'].includes(item.kind))throw new Error('Unrecognized cleanup ownership');
      if(!idPattern.test(item.buildId))throw new Error('Invalid cleanup build ID');
      const expected=item.kind==='rollback'?path.join(home,'rollback',item.buildId,'preview'):item.kind==='staging'?path.join(home,'staging',item.buildId):artifactFolder(item.buildId);
      if(!equalPath(expected,item.path)||item.buildId===manifest.buildId&&item.kind!=='rollback')throw new Error('Cleanup identity mismatch');
      if(ps('Inspect').processes.some(proc=>proc.path&&inside(item.path,proc.path)))throw new Error('Old output is still running');
      if(fs.existsSync(item.path))removeTree(item.path,item.files);
      manifest.removed.push({path:item.path,at:new Date().toISOString(),recovery:'Source/build identity and hashes retained in delivery records; binaries removed after successful replacement.'});
    }catch(error){remaining.push({...item,files:item.files?.filter(file=>fs.existsSync(path.join(item.path,file.path))),reason:error.message});}
  }
  manifest.pendingCleanup=remaining;writeLatest(manifest);
}
function promote(manifest,bind) {
  verifyManifest(manifest);
  const info=ps('Inspect');
  const existingLink=info.links.find(link=>equalPath(link.path,bind.shortcut));
  if(existingLink&&(!equalPath(existingLink.target,path.join(bind.preview,'Cardable.exe'))||existingLink.arguments||existingLink.reparse))throw new Error('Latest Build link target changed; last-good delivery retained.');
  const running=info.processes.filter(proc=>!proc.path||inside(bind.preview,proc.path));
  if(running.length){manifest.status='preview-pending';manifest.preview={path:bind.preview,entryUrl:bind.entryUrl,buildId:read(path.join(home,'last-good.json'))?.preview?.buildId||null,reason:'Close the old preview normally, then run deliver:desktop:resume.',processes:running};manifest.shortcut=read(path.join(home,'last-good.json'))?.shortcut||null;writeLatest(manifest);return;}
  ps('Guard',{paths:[bind.preview]});
  const oldFiles=tree(bind.preview),newFiles=manifest.previewFiles;
  if(oldFiles.some(file=>!newFiles.some(next=>next.path===file.path)))throw new Error('Preview contains unowned extra files; preview promotion stopped.');
  const staging=path.join(path.dirname(bind.preview),'.cardable-preview-'+manifest.buildId),backup=path.join(home,'rollback',manifest.buildId,'preview');
  noLinks(staging);if(fs.existsSync(staging)||fs.existsSync(backup))throw new Error('Unexpected staging/rollback path; recovery must finish first.');
  fs.cpSync(path.join(artifactFolder(manifest.buildId),'win-unpacked'),staging,{recursive:true,errorOnExist:true,force:false});
  verifyTree(staging,newFiles);
  const journal={schema:1,repo:root,buildId:manifest.buildId,preview:bind.preview,staging,backup,oldFiles,newFiles};
  atomic(path.join(home,'transaction.json'),journal);
  try {
    move(bind.preview,backup);move(staging,bind.preview);verifyTree(bind.preview,newFiles);
    manifest.shortcut=ensureShortcut(bind,ps('Inspect'));
    manifest.preview={path:bind.preview,entryUrl:bind.entryUrl,buildId:manifest.buildId};manifest.status='ready';
    manifest.pendingCleanup.push({kind:'rollback',buildId:manifest.buildId,path:backup,files:oldFiles});
    writeLatest(manifest);
    fs.unlinkSync(path.join(home,'transaction.json'));
  }catch(error){recover();manifest.status='preview-pending';manifest.preview={path:bind.preview,entryUrl:bind.entryUrl,buildId:null,reason:error.message};writeLatest(manifest);return;}
  cleanup(manifest);
}
function report(manifest){console.log(JSON.stringify({status:manifest.status,buildId:manifest.buildId,version:manifest.version,installer:path.resolve(home,manifest.installer),installerSha256:manifest.installerSha256,preview:manifest.preview,shortcut:manifest.shortcut||null,removed:manifest.removed,pendingCleanup:manifest.pendingCleanup.map(({files,...item})=>item)},null,2));}
function deliver() {
  const identity=source(),info=ps('Inspect'),legacy=inspectLegacy(info);
  if(info.buildProcesses?.length)throw new Error('Another checkout build process is still running; retain its files and let it finish normally.');
  atomic(path.join(home,'legacy-inventory.json'),legacy);
  if(mode==='inspect'){console.log(JSON.stringify(legacy,null,2));return;}
  const bind=binding(info,legacy);recover();
  const previous=read(path.join(home,'latest.json'));
  if(mode==='verify'){verifyManifest(previous);if(previous.status==='ready'){verifyTree(bind.preview,previous.previewFiles);const link=info.links.find(link=>equalPath(link.path,bind.shortcut));if(!link||!equalPath(link.target,path.join(bind.preview,'Cardable.exe'))||link.arguments)throw new Error('Shortcut is missing or changed');}report(previous);return;}
  if(mode==='resume'){
    verifyManifest(previous);if(previous.sourceFingerprint!==identity.sourceFingerprint)throw new Error('Source changed; run deliver:desktop for a new build.');
    if(previous.status==='preview-pending')promote(previous,bind);else cleanup(previous);report(read(path.join(home,'latest.json')));return;
  }
  if(mode!=='deliver')throw new Error('Unknown delivery mode: '+mode);
  const buildId=new Date().toISOString().replaceAll(':','-')+'-'+crypto.randomBytes(6).toString('hex');
  const staging=path.join(home,'staging',buildId),output=artifactFolder(buildId);
  noLinks(staging);fs.mkdirSync(staging,{recursive:true});
  atomic(path.join(staging,'owner.json'),{schema:1,repo:root,buildId,createdAt:new Date().toISOString()});
  const input=path.join(scratch,'build-identity.json');fs.writeFileSync(input,JSON.stringify({...identity,buildId}));
  try {
    run(process.execPath,[require.resolve('electron-builder/out/cli/cli.js'),'--config',path.join(__dirname,'desktop-delivery.config.cjs'),'--config.directories.output='+staging,'--win','nsis','dir','--x64','--publish','never'],{stdio:'inherit',env:{...process.env,CARDABLE_DELIVERY_INPUT:input}});
    if(source().sourceFingerprint!==identity.sourceFingerprint)throw new Error('Source changed during build; prior delivery retained.');
    const artifact=validated(staging,{...identity,buildId});
    // The manifest is outside the artifact tree; every advertised byte is already final.
    move(staging,output);artifact.installer=path.relative(home,path.join(output,`Cardable-Setup-${identity.version}.exe`));
    const manifest={schema:1,repo:root,...identity,buildId,createdAt:new Date().toISOString(),status:'validated',...artifact,ownedPaths:[output,bind.preview,bind.shortcut],pendingCleanup:[],removed:[],legacyInventory:path.join(home,'legacy-inventory.json')};
    if(previous){verifyManifest(previous);manifest.pendingCleanup.push(...previous.pendingCleanup,{kind:'build',buildId:previous.buildId,path:artifactFolder(previous.buildId),files:previous.artifactFiles});}
    // Validated builds left behind by a crash before pointer commit are owned
    // by their independent records; unknown directories are never adopted here.
    for(const candidate of fs.readdirSync(path.join(home,'builds'),{withFileTypes:true})){
      if(!candidate.isDirectory()||candidate.name===buildId||!idPattern.test(candidate.name))continue;
      const retained=read(recordFile(candidate.name));if(!retained)continue;
      verifyManifest(retained);manifest.pendingCleanup.push({kind:'build',buildId:retained.buildId,path:artifactFolder(retained.buildId),files:retained.artifactFiles});
    }
    for(const name of fs.readdirSync(path.join(home,'history')).filter(name=>name.endsWith('-failure.json'))){
      const failure=read(path.join(home,'history',name));
      let retained=failure.retainedArtifacts||[];
      // Older failure records with only the creation stamp have no package bytes
      // to guess about. Adopt that exact stamp-only directory into this manifest.
      if(!retained.length&&idPattern.test(failure.buildId)){
        const folder=path.join(home,'staging',failure.buildId);
        if(failure.retained?.some(file=>equalPath(file,folder))&&fs.existsSync(folder)){
          const snapshot=tree(folder);if(snapshot.length===1&&snapshot[0].path==='owner.json')retained=[{kind:'staging',buildId:failure.buildId,path:folder,files:snapshot}];
        }
      }
      for(const item of retained){
        if(item.kind!=='staging'||!idPattern.test(item.buildId)||!equalPath(item.path,path.join(home,'staging',item.buildId))||!fs.existsSync(item.path))continue;
        const stamp=read(path.join(item.path,'owner.json'));if(stamp?.repo!==root||stamp.buildId!==item.buildId)throw new Error('Failed stage ownership mismatch');
        manifest.pendingCleanup.push(item);
      }
    }
    manifest.pendingCleanup.push({kind:'legacy',path:'See legacy-inventory.json',reason:'Pre-manifest outputs and versioned links retained; no broad deletion or origin transition.'});
    manifest.pendingCleanup=[...new Map(manifest.pendingCleanup.map(item=>[item.kind+':'+item.path,item])).values()];
    atomic(recordFile(buildId),manifest);
    try{promote(manifest,bind);}catch(error){
      if(read(path.join(home,'transaction.json')))throw error;
      verifyManifest(manifest);manifest.status='preview-pending';manifest.preview={path:bind.preview,entryUrl:bind.entryUrl,buildId:read(path.join(home,'last-good.json'))?.preview?.buildId||null,reason:error.message};manifest.shortcut=read(path.join(home,'last-good.json'))?.shortcut||null;writeLatest(manifest);
    }
    report(read(path.join(home,'latest.json')));
  }catch(error){const retainedArtifacts=fs.existsSync(staging)?[{kind:'staging',buildId,path:staging,files:tree(staging)}]:[];atomic(path.join(home,'history',buildId+'-failure.json'),{buildId,version:identity.version,sourceRevision:identity.sourceRevision,sourceFingerprint:identity.sourceFingerprint,error:error.message,retained:[staging,output].filter(file=>fs.existsSync(file)),retainedArtifacts,previousBuildId:previous?.buildId||null});throw error;}
}
if(process.platform!=='win32')throw new Error('Desktop delivery supports Windows x64 only.');
if(!process.argv.includes('--locked')){
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',backend,'-Action','Run','-NodePath',process.execPath],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,CARDABLE_DELIVERY_MODE:mode}});
  if(result.error)console.error(result.error.message);process.exitCode=result.status|| (result.error?1:0);
}else{
  try{
    if(!equalPath(git(['rev-parse','--show-toplevel']),root))throw new Error('Not the actual repository root');
    noLinks(home);fs.mkdirSync(home,{recursive:true});
    const lock=path.join(home,'lock.json'),prior=read(lock);
    if(prior){let alive=false;try{process.kill(prior.pid,0);alive=true;}catch(error){if(error.code!=='ESRCH')alive=true;}if(alive)throw new Error('Prior delivery process is still alive; refusing a stale-lock takeover.');}
    owner={pid:process.pid,token:crypto.randomBytes(12).toString('hex'),startedAt:new Date().toISOString()};atomic(lock,owner);
    scratch=path.join(home,'control',owner.token);fs.mkdirSync(scratch,{recursive:true});
    atomic(path.join(scratch,'owner.json'),{schema:1,repo:root,...owner});
    for(const name of ['records','history'])fs.mkdirSync(path.join(home,name),{recursive:true});
    ps('Guard',{paths:[home]});deliver();
  }catch(error){console.error('Delivery failed: '+error.message);process.exitCode=1;}
  finally{
    if(owner&&read(path.join(home,'lock.json'))?.token===owner.token)fs.unlinkSync(path.join(home,'lock.json'));
    if(scratch&&fs.existsSync(scratch)){
      try{ps('Guard',{paths:[scratch]});removeTree(scratch,tree(scratch));const request=path.join(home,'control',owner.token+'.request.json');noLinks(request);if(fs.existsSync(request))fs.unlinkSync(request);}
      catch(error){console.error('Owned control cleanup deferred: '+scratch+' — '+error.message);}
    }
  }
}
