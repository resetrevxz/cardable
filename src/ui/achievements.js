(function (C, root) {
  'use strict';
  var toast, pending = [], showing = null, until = 0, dismissedAt = 0;
  var overlay, panel, search, filter, difficulty, sidebar, inspector, footer, status;
  var selected = null, progressRefs = [], mobileDetail = false;
  var opened = false;
  var filterButtons = [], tab, tabCount, thumb = null, returnFromCard = null;
  var paths = {
    pack: 'M5 4h14v16H5zM5 8h14M9 12h6M9 16h6',
    collection: 'M4 7h16v14H4zM7 3h10M7 11h10M7 15h6',
    star: 'm12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',
    secret: 'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
    variant: 'm12 3 9 9-9 9-9-9zM8 12l4-4 4 4-4 4z',
    serial: 'M8 3 6 21M16 3l-2 18M3 9h18M3 15h18',
    archive: 'M4 4h16v5H4zM6 9v12h12V9M10 13h4',
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15 8a5 5 0 1 0 0 8',
    cut: 'M4 5l16 14M4 19 20 5M7 5a3 3 0 1 0-6 0 3 3 0 0 0 6 0M7 19a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
    camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'
  };
  function node(tag, cls, parent, text) { return C.packMarkup.node(tag, cls, parent, text); }
  function glyph(name, parent) {
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'achievement-glyph');
    var path = root.document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || paths.star); svg.appendChild(path); parent.appendChild(svg); return svg;
  }
  function safeMenu() {
    return !root.document.hidden && C.opening.phase === 'idle' && !C.state.current.pendingReveal && !C.inventory.active && !C.preferences.open &&
      !C.menu.afk && !C.tutorial.active && !C.contextMenu.open && !C.studio?.active && !C.journalView?.open && !(C.dev && (C.dev.immersive || C.dev.paletteOpen)) && !(C.achievementView && C.achievementView.open);
  }
  function hide() {
    toast.classList.remove('is-visible'); dismissedAt = root.performance.now();
    showing = null; C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: false }); C.fx.wake();
  }
  function enqueue(entry) { pending.push(entry); C.fx.wake(); }
  C.achievementView = { glyph: glyph, get open() { return opened; }, show: openPanel, close: closePanel, replayToast: function (id) {
    var p = C.achievements.progress(id); if (p) enqueue({ id: id, tier: p.tier || 1 });
  } };
  C.events.on('achievement:unlocked', function (event) { if (!event.retro) enqueue(event); });
  C.events.on('achievement:backfilled', function (event) { enqueue({ summary: true, count: event.count }); });
  C.events.on('app:ready', function () {
    toast = node('button', 'achievement-toast glass', root.document.body); toast.type = 'button'; toast.hidden = true;
    toast.setAttribute('aria-live', 'polite'); toast.setAttribute('aria-atomic', 'true');
    toast.addEventListener('click', function () { var id = showing && showing[0].id; hide(); C.events.emit('achievements:open', { id: id }); });
    C.fx.subscribe(function (now) {
      if (!C.settings.get('achievementToasts')) { pending = []; if (showing) hide(); }
      if (showing && !safeMenu()) { pending = showing.concat(pending); hide(); toast.hidden = true; }
      if (showing && now >= until) hide();
      if (!showing && !toast.hidden && now - dismissedAt >= 250) toast.hidden = true;
      if (!showing && pending.length && safeMenu() && C.settings.get('achievementToasts')) {
        showing = pending.splice(0); toast.replaceChildren(); var first = showing[0], def = C.achievements.list().find(function (d) { return d.id === first.id; });
        glyph(def ? def.glyph : 'star', toast); var copy = node('span', 'achievement-toast-copy', toast);
        node('span', 'achievement-eyebrow', copy, first.summary ? 'From your collection' : def?.kind === 'weekly' ? 'Achievement ready to claim' : 'Achievement unlocked');
        node('strong', '', copy, first.summary ? first.count + ' achievements unlocked from your collection' : showing.length > 1 ? showing.length + ' achievements unlocked' : (def?.name || 'Achievement') + (def?.tiers.length > 1 ? ' · Tier ' + first.tier : ''));
        toast.hidden = false; toast.classList.add('is-visible'); until = now + 4000;
        C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: true }); C.events.emit('ui:achievement', { beat: 'toast', id: first.id, count: showing.length });
      }
      return !!showing || !toast.hidden;
    }, 'achievements');
    ['opening:context', 'inventory:context', 'preferences:context', 'tutorial:step', 'contextmenu:close', 'fx:visibility', 'menu:afk', 'settings:changed'].forEach(function (event) { C.events.on(event, function () { C.fx.wake(); }); });
    C.events.on('achievement:resetting', function () { pending = []; if (showing) hide(); toast.hidden = true; });
    buildPanel();

  });
  function button(label, parent, action, cls) {
    var el=node('button',cls || 'achievement-button',parent,label);el.type='button';el.addEventListener('click',action);return el;
  }
  function format(value,unit) {
    if (unit==='seconds') { var h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60; return h ? h+'h '+m+'m' : m ? m+'m '+s+'s' : s+'s'; }
    return value.toLocaleString();
  }
  function date(at) { return at===null?'Before tracking':new Date(at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }
  function entry(def) { return C.state.current.achievements.unlocked[def.id]; }
  function hidden(def,p) { return def.hidden && !p.tier; }
  function title(def,p) { return hidden(def,p)?'Hidden Achievement':def.name; }
  function ratio(def,p) { return hidden(def,p)?0:def.kind==='eternal'&&p.tier?1:p.ratio ?? Math.min(1,p.value/p.goal); }
  function state(def,p) {
    return def.kind==='weekly'?(p.claimed?'Claimed':p.ready?'Ready to claim':'In progress'):def.kind==='recurring'?'Cycle '+(p.cycles+1):p.tier?'Complete':hidden(def,p)?'Undiscovered':'In progress';
  }
  function complete(def,p) { return def.kind==='weekly'?p.claimed:def.kind==='eternal'?p.tier>0:false; }
  function tasks(def,p) {
    return p.objectives || [{verb:def.description,unit:'',value:p.value,goal:p.goal}];
  }
  function credits(def) { return def.credits ?? def.tiers[0].reward?.credits ?? 0; }
  function bar(parent,label,value,goal) {
    var el=node('div','achievement-bar',parent), fill=node('i','',el);
    el.setAttribute('role','progressbar');el.setAttribute('aria-label',label);el.setAttribute('aria-valuemin','0');
    el.setAttribute('aria-valuemax',String(goal));el.setAttribute('aria-valuenow',String(Math.min(value,goal)));
    fill.style.transform='scaleX('+Math.min(1,value/goal)+')';return el;
  }
  function buildPanel() {
    if(!C.inventory.content)return;
    overlay=node('section','achievements-panel',C.inventory.content);panel=overlay;panel.id='inventory-achievements';panel.hidden=true;
    panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','inventory-tab-achievements');
    var header=node('header','achievements-header',panel), heading=node('div','',header);
    node('p','achievement-eyebrow',heading,'The collection continues');node('h2','',heading,'Achievements');
    var reset=node('div','achievement-week-reset',header);glyph('clock',reset);node('span','',reset,'Three goals. A fresh week.');
    var back=button('Back to cards',header,closePanel);back.dataset.focus='cards';
    var workspace=node('div','achievements-workspace',panel), rail=node('aside','achievements-sidebar',workspace);
    var controls=node('div','achievements-controls',rail), searchLabel=node('label','achievement-search',controls);
    glyph('eye',searchLabel);search=node('input','',searchLabel);search.type='search';search.placeholder='Find an achievement…';search.setAttribute('aria-label','Search achievements');search.autocomplete='off';search.addEventListener('input',render);
    var filters=node('div','achievement-filters',controls);filter={value:'all'};
    [['all','All'],['ready','Ready'],['active','Active'],['complete','Complete']].forEach(function(pair){
      var b=button(pair[1],filters,function(){filter.value=pair[0];render();},'achievement-filter');b.dataset.filter=pair[0];b.dataset.focus='filter-'+pair[0];filterButtons.push(b);
    });
    var difficultyLabel=node('label','achievement-difficulty-filter',controls);node('span','',difficultyLabel,'Difficulty');difficulty=node('select','',difficultyLabel);difficulty.setAttribute('aria-label','Filter by achievement difficulty');
    ['All difficulties','Common','Uncommon','Rare','Legendary'].forEach(function(text,i){var o=node('option','',difficulty,text);o.value=i?text:'all';});difficulty.addEventListener('change',render);
    sidebar=node('div','achievement-list',rail);sidebar.setAttribute('aria-label','Achievement groups');
    inspector=node('article','achievement-inspector',workspace);inspector.id='achievement-inspector';inspector.setAttribute('aria-label','Selected achievement');
    footer=node('footer','achievements-footer',panel);status=node('span','achievement-announcement',panel);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    root.document.addEventListener('keydown',function(event){
      if(!opened || event.key==='Tab')return;
      if(event.key==='Escape'&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();if(mobileDetail){mobileDetail=false;panel.classList.remove('is-detail');sidebar.querySelector('[aria-pressed="true"]')?.focus();}else closePanel();}
      else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();event.stopImmediatePropagation();mobileDetail=false;panel.classList.remove('is-detail');search.focus();}
      else if(!event.target.closest('input,select,textarea,summary,button')&&[' ','i','I','ArrowUp'].includes(event.key))event.stopImmediatePropagation();
    },true);
    C.inventory.toolbar.tabs.addEventListener('click',function(event){if(opened&&event.target.closest('.inventory-tab-list, .inventory-unowned'))closePanel();},true);
    C.events.on('achievements:open',function(p){openPanel(p?.id);});
    C.events.on('achievement:changed',function(){updateTab();if(opened)render();});
    C.events.on('achievement:clock',function(){if(opened)updateProgress();});
    C.events.on('inventory:pageChanged',function(p){if(p.id!=='achievements'&&opened)closePanel();});
    C.events.on('inventory:context',function(p){if(!p.active&&opened)closePanel();});
    C.events.on('inventory:modelChanged',function(){if(opened)updateTab();});
    ['achievement:resetting','save:willReplace','save:willReset'].forEach(function(e){C.events.on(e,function(){returnFromCard=null;selected=null;closePanel();updateTab();});});
    ['opening:context','preferences:context','journal:context','studio:context'].forEach(function(e){C.events.on(e,function(p){if(p.active)closePanel();});});
    C.events.on('inventory:detailContext',function(p){if(!p.active&&returnFromCard){var id=returnFromCard;returnFromCard=null;openPanel(id);}});
    C.contextMenu.register({target:'empty',build:function(){return [{id:'achievements',type:'action',label:'Achievements',icon:'check',run:function(){openPanel();}}];}});
    C.achievementView.el=panel;updateTab();
  }
  function updateTab() {
    if(!tabCount||!C.state.current?.achievements)return;
    var all=C.achievements.list(), ready=all.filter(function(d){var p=C.achievements.progress(d.id);return d.kind==='weekly'&&p.ready&&!p.claimed;}).length;
    tabCount.textContent=ready?String(ready):String(all.filter(function(d){return d.kind==='eternal'&&C.achievements.isUnlocked(d.id);}).length);
    tab.classList.toggle('has-new',!!ready);tab.setAttribute('aria-selected',String(opened));
    C.inventory.toolbar.tabs.querySelectorAll('.inventory-tab-list [role="tab"]').forEach(function(b){b.setAttribute('aria-selected',String(!opened&&b.classList.contains('is-selected')));});
  }
  function openPanel(id) {
    if(!panel||root.document.hidden||C.opening.phase!=='idle'||C.preferences.open||C.tutorial.active||C.detail.phase!=='closed'||C.studio?.active)return false;
    if(showing)hide();C.inventory.request('full');if(!C.inventory.open)return false;
    opened=true;panel.hidden=false;panel.inert=false;C.inventory.setPage('achievements');
    if(id){search.value='';filter.value='all';difficulty.value='all';selected=id;mobileDetail=true;}else mobileDetail=false;
    panel.classList.toggle('is-detail',mobileDetail);render();updateTab();C.events.emit('achievements:context',{active:true});
    if(id)inspector.querySelector('h3')?.focus({preventScroll:true});else search.focus({preventScroll:true});return true;
  }
  function releaseThumb(){if(thumb){thumb.destroy();thumb=null;}}
  function closePanel(){
    if(!opened)return;releaseThumb();opened=false;panel.hidden=true;panel.inert=true;progressRefs=[];
    if(C.inventory.page==='achievements')C.inventory.setPage(null);updateTab();C.events.emit('achievements:context',{active:false});C.events.emit('menu:activity');tab?.focus({preventScroll:true});
  }
  function render() {
    if(!opened)return;
    var focus=root.document.activeElement,focusKey=focus?.dataset.focus,scroll=sidebar.scrollTop,inspectScroll=inspector.scrollTop;
    var expanded={};panel.querySelectorAll('details[data-section]').forEach(function(d){expanded[d.dataset.section]=d.open;});
    var all=C.achievements.list(),query=search.value.trim().toLocaleLowerCase();
    var shown=all.filter(function(def){var p=C.achievements.progress(def.id),done=complete(def,p);
      return (title(def,p)+(hidden(def,p)?'':' '+def.description+' '+def.difficulty)).toLocaleLowerCase().includes(query)&&
        (difficulty.value==='all'||def.difficulty===difficulty.value)&&
        (filter.value==='all'||filter.value==='ready'&&p.ready&&!p.claimed||filter.value==='active'&&!done||filter.value==='complete'&&done);
    });
    filterButtons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.filter===filter.value));});
    if(!all.some(function(d){return d.id===selected;}))selected=(all.find(function(d){var p=C.achievements.progress(d.id);return d.kind==='weekly'&&p.ready&&!p.claimed;})||all.find(function(d){return d.kind==='weekly'&&!d.archived;})||all[0])?.id;
    if(shown.length&&!shown.some(function(d){return d.id===selected;}))selected=shown[0].id;
    sidebar.replaceChildren();progressRefs=[];
    var pinned=shown.filter(function(d){return C.achievements.isPinned(d.id);});
    [['pinned','Pinned Achievements',pinned],['weekly','Weekly Achievements'],['unclaimed','Unclaimed Rewards'],['recurring','Recurring Achievements'],['eternal','One-time Achievements']].forEach(function(group){
      var members=group[2]||shown.filter(function(d){return (d.archived?'unclaimed':d.kind)===group[0]&&!C.achievements.isPinned(d.id);});
      if(!members.length&&group[0]!=='pinned')return;
      var section=node('details','achievement-section',sidebar);section.dataset.section=group[0];section.open=expanded[group[0]]??group[0]!=='eternal';
      var summary=node('summary','',section);glyph(group[0]==='weekly'?'clock':group[0]==='pinned'?'star':'collection',summary);node('span','',summary,group[1]);node('span','achievement-section-count',summary,String(members.length));
      if(!members.length)node('p','achievement-pin-hint',section,'Pin an achievement to keep it here.');
      members.forEach(function(def){renderRow(def,section);});
    });
    if(!shown.length){var empty=node('div','achievement-empty',sidebar);node('h3','',empty,'No matches');node('p','',empty,'Try another name or difficulty.');button('Clear filters',empty,function(){search.value='';filter.value='all';difficulty.value='all';render();search.focus();});}
    renderInspector(all.find(function(d){return d.id===selected;}));
    inspector.querySelectorAll('details[data-section]').forEach(function(d){if(expanded[d.dataset.section]!==undefined)d.open=expanded[d.dataset.section];});
    updateProgress();
    sidebar.scrollTop=scroll;inspector.scrollTop=inspectScroll;
    if(focusKey)panel.querySelector('[data-focus="'+focusKey+'"]')?.focus({preventScroll:true});
  }
  function renderRow(def,parent) {
    var p=C.achievements.progress(def.id),row=node('div','achievement-row',parent);row.dataset.rank=String(p.rank||0);row.dataset.difficulty=def.difficulty;row.classList.toggle('is-selected',selected===def.id);row.classList.toggle('is-ready',!!p.ready&&!p.claimed);row.classList.toggle('is-complete',complete(def,p));
    var select=button('',row,function(){selected=def.id;mobileDetail=true;panel.classList.add('is-detail');C.achievements.markSeen(def.id);render();inspector.scrollTop=0;if(root.matchMedia('(max-width: 760px)').matches)inspector.querySelector('h3').focus();},'achievement-row-select');select.dataset.achievement=def.id;select.dataset.focus='row-'+def.id;select.setAttribute('aria-pressed',String(selected===def.id));select.setAttribute('aria-controls','achievement-inspector');
    glyph(hidden(def,p)?'secret':def.glyph,node('span','achievement-row-emblem',select));
    var copy=node('span','achievement-row-copy',select);node('strong','',copy,title(def,p));
    var meta=node('span','achievement-row-meta',copy);node('span','',meta,def.difficulty);node('span','achievement-row-state',meta,state(def,p));
    var progress=bar(copy,def.name+' completion',ratio(def,p)*100,100);node('span','achievement-chevron',select,'›');
    var pin=button(C.achievements.isPinned(def.id)?'◆':'◇',row,function(){C.achievements.togglePin(def.id);},'achievement-pin');pin.dataset.focus='pin-'+def.id;pin.setAttribute('aria-label',(C.achievements.isPinned(def.id)?'Unpin ':'Pin ')+title(def,p));pin.setAttribute('aria-pressed',String(C.achievements.isPinned(def.id)));
    progressRefs.push({id:def.id,bar:progress,state:meta.lastElementChild});
  }
  function renderInspector(def) {
    releaseThumb();inspector.replaceChildren();if(!def)return;
    var p=C.achievements.progress(def.id),concealed=hidden(def,p),rank=p.rank||0;
    var back=button('‹ All achievements',inspector,function(){mobileDetail=false;panel.classList.remove('is-detail');sidebar.querySelector('[aria-pressed="true"]')?.focus();},'achievement-mobile-back');back.dataset.focus='browse';
    var top=node('div','achievement-inspector-top',inspector);node('span','achievement-eyebrow',top,def.archived?'Previous week':def.kind==='eternal'?'One-time achievement':def.kind+' achievement');
    var pin=button(C.achievements.isPinned(def.id)?'Unpin achievement':'Pin achievement',top,function(){C.achievements.togglePin(def.id);});pin.dataset.focus='detail-pin';pin.setAttribute('aria-pressed',String(C.achievements.isPinned(def.id)));
    var surface=node('div','achievement-surface',inspector);surface.dataset.rank=String(rank);surface.dataset.difficulty=def.difficulty;
    var art=node('div','achievement-art',surface);art.setAttribute('aria-hidden','true');
    node('span','achievement-art-coordinate',art,'CBL / '+(def.kind==='recurring'?String(p.cycles).padStart(3,'0'):'001'));
    var image=node('img','achievement-illustration',art);image.src='assets/achievements/'+(concealed?'hidden':def.glyph==='clock'?'time':def.glyph==='pack'?'pack':def.glyph==='camera'?'photo':'collection')+'.svg';image.alt='';image.width=320;image.height=240;
    var seal=node('div','achievement-seal',art);glyph(concealed?'secret':def.glyph,seal);
    node('span','achievement-art-edition',art,def.kind==='recurring'?(rank?C.data.achievementRankNames[rank-1]:'Unetched')+' / '+String(rank).padStart(2,'0'):'Collection record');
    var content=node('div','achievement-surface-content',surface), labels=node('div','achievement-labels',content);
    node('span','achievement-difficulty',labels,def.difficulty);node('span','achievement-status',labels,state(def,p));
    var h=node('h3','',content,title(def,p));h.tabIndex=-1;
    node('p','achievement-description',content,concealed?'An undiscovered record. Keep collecting to reveal its objective.':def.description||(def.kind==='weekly'?'A little progress, throughout the week. Your reward is ready when every objective is complete.':'A familiar task. A growing record. Each completion starts a new cycle.'));
    var progressTop=node('div','achievement-progress-copy',content);node('span','',progressTop,def.kind==='recurring'?'Current cycle':complete(def,p)?'Completed':'Objective progress');
    var count=node('strong','',progressTop);var progress=bar(content,def.name+' objective progress',ratio(def,p)*100,100);progressRefs.push({id:def.id,bar:progress,count:count});
    var objectives=node('details','achievement-objectives',content);objectives.dataset.section='objectives';objectives.open=true;node('summary','',objectives,'Objectives');
    tasks(def,p).forEach(function(task,i){
      var row=node('div','achievement-objective',objectives);glyph(concealed?'secret':task.unit==='seconds'?'clock':def.glyph,node('span','',row));var copy=node('div','',row);
      node('span','',copy,concealed?'Hidden objective':task.unit?task.verb+' '+format(task.goal,task.unit)+' '+(task.unit==='seconds'?'':task.unit):task.verb);
      var count=node('strong','achievement-task-count',copy);var b=bar(copy,'Objective '+(i+1),concealed?0:task.value,task.goal);progressRefs.push({id:def.id,bar:b,count:count,task:i,concealed:concealed});
    });
    var reward=node('div','achievement-reward',content), rewardCopy=node('div','',reward);glyph('coin',rewardCopy);var text=node('span','',rewardCopy);node('span','achievement-eyebrow',text,'Credit reward');node('strong','',text,credits(def).toLocaleString()+' credits');
    if(def.kind==='weekly'){
      var claim=button(p.claimed?'Claimed':p.ready?'Claim '+credits(def).toLocaleString()+' credits':'Complete objectives',reward,function(){if(C.achievements.claim(def.id))status.textContent=credits(def).toLocaleString()+' credits claimed for '+def.name+'.';},'achievement-claim');claim.disabled=!p.ready||p.claimed;claim.dataset.focus='claim';
    }else node('span','achievement-auto-claim',reward,p.tier&&def.kind==='eternal'?'Auto-claimed':'Auto-claim');
    if(def.kind==='recurring')renderRanks(def,p,content);
    var info=node('details','achievement-info',content);info.dataset.section='info';node('summary','',info,'Reward & progress details');
    var text=def.kind==='weekly'?(p.claimed?'Your credits have been added.':p.ready?'Claim this reward once. Completed rewards stay available after the week ends.':'Resets Monday at 00:00 UTC. New weekly progress starts from this week’s actions.'):
      def.kind==='recurring'?'Every cycle automatically pays '+credits(def)+' credits. Extra progress carries into the next cycle. Your milestone border stays earned.':p.tier?'Automatically claimed '+date(entry(def)?.at[1]??null)+'. One objective, one reward.':'A permanent objective with one automatic credit reward. There are no milestones.';
    node('p','',info,text);if(def.kind==='recurring')node('p','',info,p.cycles+' completed cycles · '+(p.cycles*credits(def)).toLocaleString()+' credits earned');
    if(def.kind!=='eternal')node('p','',info,'Time counts while the game is visible. Offline and minimized time does not count.');
    var item=entry(def)&&C.state.current.inventory.find(function(i){return i.instanceId===entry(def).instanceId;});
    if(item){
      var link=button('',content,function(){returnFromCard=def.id;closePanel();C.events.emit('inventory:showCard',{cardId:item.cardId,instanceId:item.instanceId});},'achievement-card-link');
      var image=node('span','achievement-card-thumb',link);thumb=C.cardView.createThumbnail(C.card(item.cardId),item,{owned:true});image.appendChild(thumb.el);
      var copy=node('span','',link);node('span','achievement-eyebrow',copy,'Found with');node('strong','',copy,C.card(item.cardId).name);node('span','achievement-card-serial',copy,item.serial);node('span','achievement-chevron',link,'↗');
    }
  }
  function renderRanks(def,p,parent) {
    var ranks=node('details','achievement-milestones',parent);ranks.dataset.section='ranks';ranks.open=true;node('summary','',ranks,'Milestone border');
    var rail=node('ol','achievement-rank-rail',ranks);
    C.data.achievementRanks.forEach(function(goal,i){var row=node('li',p.cycles>=goal?'is-earned':'',rail);node('span','achievement-rank-mark',row,String(i+1).padStart(2,'0'));node('strong','',row,C.data.achievementRankNames[i]);node('span','',row,goal+' '+(goal===1?'cycle':'cycles'));});
    var label=node('label','achievement-border-preview',ranks,'Preview border');var select=node('select','',label);select.setAttribute('aria-label','Preview recurring milestone border');select.dataset.focus='border-preview';
    node('option','',select,'Current milestone').value='current';C.data.achievementRankNames.forEach(function(name,i){node('option','',select,name+(p.cycles>=C.data.achievementRanks[i]?' · Earned':' · Preview')).value=String(i+1);});
    select.addEventListener('change',function(){inspector.querySelector('.achievement-surface').dataset.rank=select.value==='current'?String(p.rank):select.value;});
    node('p','achievement-border-note',ranks,'An unetched edge becomes a layered, dotted frame as you complete cycles. Previewing a border does not unlock it.');
  }
  function updateProgress() {
    if(!opened||root.document.hidden)return;
    var definitions=new Map(C.achievements.list().map(function(d){return [d.id,d];})),values=new Map();
    definitions.forEach(function(d){values.set(d.id,C.achievements.progress(d.id));});
    progressRefs.forEach(function(ref){var def=definitions.get(ref.id),p=values.get(ref.id);if(!def||!p)return;
      var task=ref.task===undefined?null:tasks(def,p)[ref.task],value=task?ref.concealed?0:task.value:ratio(def,p)*100,goal=task?task.goal:100;
      ref.bar.setAttribute('aria-valuenow',String(Math.min(value,goal)));ref.bar.firstElementChild.style.transform='scaleX('+Math.min(1,value/goal)+')';
      if(ref.count)ref.count.textContent=ref.concealed?'???':task?format(task.value,task.unit)+' / '+format(task.goal,task.unit):Math.round(value)+'%';if(ref.state)ref.state.textContent=state(def,p);
    });
    var all=Array.from(definitions.values()).filter(function(d){return !d.archived;}),sum=0,cycles=0,oneTime=0,weekly=0;
    all.forEach(function(d){var p=values.get(d.id);sum+=ratio(d,p);if(d.kind==='recurring')cycles+=p.cycles;if(d.kind==='eternal'&&p.tier)oneTime++;if(d.kind==='weekly'&&p.ready)weekly++;});
    var completion=all.length?sum/all.length:0;
    if(!footer.firstChild){var copy=node('div','achievement-footer-copy',footer);node('strong','',copy,'');node('span','',copy,'');bar(footer,'Current achievement objectives',0,100);node('span','achievement-footer-percent',footer);}
    footer.firstChild.firstChild.textContent='Your progress';footer.firstChild.lastChild.textContent=weekly+'/3 weekly · '+cycles+' '+(cycles===1?'cycle':'cycles')+' · '+oneTime+' one-time';
    var b=footer.querySelector('.achievement-bar');b.setAttribute('aria-valuenow',String(Math.round(completion*100)));b.firstElementChild.style.transform='scaleX('+completion+')';footer.lastChild.textContent=Math.round(completion*100)+'%';
    var reset=panel.querySelector('.achievement-week-reset span');reset.textContent='Resets in '+C.timers.format(Math.max(0,C.achievements.weekEndsAt-Date.now()));
  }
  C.inventoryTabs.register('achievements',function(host){
    tab=button('',host,function(){openPanel();},'inventory-menu-option inventory-achievements-tab');tab.id='inventory-tab-achievements';tab.setAttribute('role','tab');tab.setAttribute('aria-controls','inventory-achievements');tab.setAttribute('aria-selected','false');glyph('star',tab);node('span','',tab,'Achievements');tabCount=node('span','achievement-tab-count',tab,'0');
  });
  C.detailActions.register('achievements',function(host,context){
    if(!context.entry.owned||context.preview)return;
    var ids=C.achievements.list().filter(function(d){return entry(d)?.cardId===context.entry.card.id;}).map(function(d){return d.id;});if(!ids.length)return;
    button('Achievements · '+ids.length,host,function(){returnFromCard=ids[0];C.events.emit('detail:requestClose');},'achievement-detail-action');
  });
})(window.Cardable,window);
