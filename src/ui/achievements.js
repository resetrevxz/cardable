(function (C, root) {
  'use strict';
  var toast, pending = [], showing = null, until = 0, dismissedAt = 0;
  var overlay, panel, rail, grid, search, filter, sort, totalText, ring, resultText, detail;
  var opened = false, category = 'all', focusId = null, detailOrigin, tiles = [], ringAge = 0, ringTarget = 0;
  var hero, feature, recent, filterButtons = [], tab, tabCount, thumb = null, activeDetail = null, returnFromCard = null;
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
      !C.menu.afk && !C.tutorial.active && !C.contextMenu.open && !C.studio?.active && !(C.dev && (C.dev.immersive || C.dev.paletteOpen)) && !(C.achievementView && C.achievementView.open);
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
        node('span', 'achievement-eyebrow', copy, first.summary ? 'From your collection' : 'Achievement unlocked');
        node('strong', '', copy, first.summary ? first.count + ' achievements unlocked from your collection' : showing.length > 1 ? showing.length + ' achievements unlocked' : (def?.name || 'Achievement') + (def?.tiers.length > 1 ? ' · Tier ' + first.tier : ''));
        toast.hidden = false; toast.classList.add('is-visible'); until = now + 4000;
        C.events.emit('menu:visibilityHold', { reason: 'achievement-toast', active: true }); C.events.emit('ui:achievement', { beat: 'toast', id: first.id, count: showing.length });
      }
      return !!showing || !toast.hidden;
    }, 'achievements');
    ['opening:context', 'inventory:context', 'preferences:context', 'tutorial:step', 'contextmenu:close', 'fx:visibility', 'menu:afk', 'settings:changed'].forEach(function (event) { C.events.on(event, function () { C.fx.wake(); }); });
    C.events.on('achievement:resetting', function () { pending = []; if (showing) hide(); toast.hidden = true; });
    buildPanel();
    C.fx.subscribe(updatePanel, 'achievement-panel');
  });
  function button(label, parent, action, cls) {
    var el = node('button', cls || 'quiet-button', parent, label); el.type = 'button'; el.addEventListener('click', action); return el;
  }
  function date(at) { return at === null ? 'Before tracking' : new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function rewardText(reward) { return !reward ? 'No reward' : reward.credits ? reward.credits.toLocaleString() + ' credits' : reward.pack ? reward.count + ' × ' + (C.pack(reward.pack)?.name || reward.pack) : 'No reward'; }
  function concealed(def, p) { return def.hidden && !p.tier; }
  function name(def) { return concealed(def, C.achievements.progress(def.id)) ? '???' : def.name; }
  function latest(def) { var entry = C.state.current.achievements.unlocked[def.id]; return entry ? Math.max(0, ...Object.values(entry.at).filter(Number.isFinite)) : -1; }
  function ratio(def) { var p = C.achievements.progress(def.id); return concealed(def, p) ? 0 : p.tier === p.maxTier ? 1 : Math.min(1, p.value / p.goal); }
  function group(def) { return C.data.achievementGroups[def.group] || def.group; }
  function stateLabel(p) { return p.tier === p.maxTier ? 'Complete' : p.tier ? 'Tier ' + p.tier + ' of ' + p.maxTier : p.value ? 'In progress' : 'Locked'; }
  function buildPanel() {
    if (!C.inventory.content) return;
    overlay = node('section', 'achievements-panel', C.inventory.content);
    overlay.id = 'inventory-achievements'; overlay.hidden = true;
    overlay.setAttribute('role', 'tabpanel'); overlay.setAttribute('aria-labelledby', 'inventory-tab-achievements');
    panel = overlay;
    var scroll = node('div', 'achievements-scroll', panel);
    hero = node('header', 'achievements-hero', scroll);
    var heading = node('div', 'achievements-heading', hero);
    node('p', 'achievement-eyebrow', heading, 'Collection / Progress');
    node('h2', '', heading, 'Achievements');
    node('p', 'achievements-subtitle', heading, 'Your collection, in milestones.');
    var total = node('div', 'achievements-total', hero);
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true');
    [false, true].forEach(function (fill) { var c = root.document.createElementNS(svg.namespaceURI, 'circle'); c.setAttribute('cx', '24'); c.setAttribute('cy', '24'); c.setAttribute('r', '20'); c.setAttribute('pathLength', '100'); if (fill) { c.classList.add('achievements-ring-fill'); ring = c; } svg.appendChild(c); });
    total.appendChild(svg); var totalCopy = node('div', '', total); totalText = node('strong', '', totalCopy); node('span', 'achievement-eyebrow', totalCopy, 'Tiers unlocked');
    var highlights = node('div', 'achievements-highlights', scroll);
    feature = node('div', 'achievements-feature', highlights); recent = node('div', 'achievements-recent', highlights);
    var workspace = node('div', 'achievements-workspace', scroll);
    rail = node('nav', 'achievements-rail', workspace); rail.setAttribute('aria-label', 'Achievement categories');
    var catalog = node('div', 'achievements-catalog', workspace);
    var controls = node('div', 'achievements-controls', catalog);
    var segments = node('div', 'achievements-filters', controls); segments.setAttribute('aria-label', 'Filter achievements'); filter = { value: 'all' };
    [['all','All'],['unlocked','Unlocked'],['progress','In progress'],['locked','Locked']].forEach(function (item) {
      var b = button(item[1], segments, function () { filter.value = item[0]; render(); }, 'achievement-filter');
      b.dataset.filter = item[0]; filterButtons.push(b);
    });
    var searchRow = node('div', 'achievements-search-row', catalog);
    var searchBox = node('label', 'achievements-search-box', searchRow);
    glyph('eye', searchBox); search = node('input', '', searchBox); search.type = 'search'; search.placeholder = 'Find a milestone'; search.setAttribute('aria-label', 'Search achievements'); search.autocomplete = 'off'; search.addEventListener('input', render);
    var sortBox = node('label', 'achievements-sort', searchRow, 'Sort');
    sort = node('select', '', sortBox); sort.setAttribute('aria-label', 'Sort achievements');
    [['recent','Recent'],['name','Name'],['progress','Progress'],['group','Category']].forEach(function (item) { var o = node('option','',sort,item[1]); o.value = item[0]; });
    sort.addEventListener('change', render);
    resultText = node('p', 'achievement-results', catalog); resultText.setAttribute('role', 'status');
    grid = node('div', 'achievements-grid', catalog);
    detail = node('div', 'achievement-detail', panel); detail.hidden = true;
    detail.addEventListener('click', function (event) { if (event.target === detail) closeDetail(); });
    grid.addEventListener('pointermove', function (event) {
      if (C.settings.get('quality') !== 'high' || C.motion.reduced) return;
      var tile = event.target.closest('.achievement-tile'); if (!tile) return;
      var r = tile.getBoundingClientRect(); tile.style.setProperty('--light-x', event.clientX-r.left+'px'); tile.style.setProperty('--light-y', event.clientY-r.top+'px');
    });
    root.document.addEventListener('keydown', function (event) {
      if (!opened || event.key === 'Tab') return;
      if (event.key === 'Escape' && !event.repeat) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!detail.hidden && !detail.inert) closeDetail(); else C.inventory.request('peek');
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault(); event.stopImmediatePropagation(); if (detail.hidden) search.focus();
      } else if (!detail.hidden && !detail.inert) event.stopImmediatePropagation();
      else if (!event.target.closest('input,select,textarea') && [' ', 'i', 'I', 'ArrowUp'].includes(event.key)) event.stopImmediatePropagation();
    }, true);
    C.inventory.toolbar.tabs.addEventListener('click', function (event) {
      if (opened && event.target.closest('.inventory-tab-list, .inventory-unowned')) closePanel();
    }, true);
    C.events.on('achievements:open', function (p) { openPanel(p && p.id); });
    C.events.on('achievement:changed', function () { updateTab(); if (opened) render(); });
    C.events.on('inventory:pageChanged', function (p) { if (p.id !== 'achievements' && opened) closePanel(); });
    C.events.on('inventory:context', function (p) { if (!p.active && opened) closePanel(); });
    C.events.on('inventory:modelChanged', function () { if (opened) C.inventory.toolbar.tabs.querySelectorAll('.inventory-tab-list [role="tab"]').forEach(function (b) { b.setAttribute('aria-selected','false'); }); });
    ['achievement:resetting', 'save:willReplace', 'save:willReset'].forEach(function (event) { C.events.on(event, function () { returnFromCard = null; closePanel(); updateTab(); }); });
    C.events.on('opening:context', function (p) { if (p.active) closePanel(); });
    C.events.on('preferences:context', function (p) { if (p.active) closePanel(); });
    C.events.on('studio:context', function (p) { if (p.active) closePanel(); });
    C.events.on('inventory:detailContext', function (p) {
      if (!p.active && returnFromCard) { var id = returnFromCard; returnFromCard = null; openPanel(id); }
    });
    C.events.on('settings:changed', function () { if (opened) C.fx.wake(); });
    C.contextMenu.register({ target: 'empty', build: function () { return [{ id:'achievements', type:'action', label:'Achievements', icon:'check', run:function () { openPanel(); } }]; } });
    C.achievementView.el = panel; updateTab();
  }
  function updateTab() {
    if (!tabCount || !C.state.current.achievements) return;
    var totals = C.achievements.totals();
    tabCount.textContent = totals.achievements.toLocaleString();
    tab.classList.toggle('has-new', C.achievements.list().some(function (def) { return C.achievements.isUnlocked(def.id) && !C.state.current.achievements.seen.includes(def.id); }));
    tab.setAttribute('aria-selected', String(opened));
    C.inventory.toolbar.tabs.querySelectorAll('.inventory-tab-list [role="tab"]').forEach(function (b) { b.setAttribute('aria-selected', String(!opened && b.classList.contains('is-selected'))); });
  }
  function openPanel(id) {
    if (!panel || root.document.hidden || C.opening.phase !== 'idle' || C.preferences.open || C.tutorial.active || C.detail.phase !== 'closed' || C.studio?.active) return false;
    if (showing) hide();
    C.inventory.request('full'); if (!C.inventory.open) return false;
    opened = true; overlay.hidden = false; overlay.inert = false;
    C.inventory.setPage('achievements');
    if (id) { search.value = ''; filter.value = 'all'; category = 'all'; }
    focusId = id || null; ringAge = 0; ringTarget = C.achievements.totals().unlocked;
    C.state.current.achievements.settingsSeenIntro = true; C.state.save();
    render(); updateTab(); C.events.emit('achievements:context', { active:true }); C.events.emit('ui:achievement', { beat:'panel' });
    if (id) {
      var tile = grid.querySelector('[data-achievement="' + id + '"]');
      if (tile) { tile.scrollIntoView({ block:'nearest' }); showDetail(id, tile); }
    } else search.focus({ preventScroll:true });
    C.fx.wake(); return true;
  }
  function closePanel() {
    if (!opened) return;
    closeDetail(false); opened = false; overlay.hidden = true; overlay.inert = true; activeDetail = null;
    if (C.inventory.page === 'achievements') C.inventory.setPage(null); tiles = []; updateTab();
    C.events.emit('achievements:context', { active:false }); C.events.emit('menu:activity');
  }
  function highlight(host, def, kicker, emptyCopy) {
    host.replaceChildren(); node('p', 'achievement-eyebrow', host, kicker);
    if (!def) { node('strong', 'achievement-highlight-title', host, kicker === 'Up next' ? 'Every milestone reached.' : 'A clean slate.'); node('p', 'achievement-highlight-copy', host, emptyCopy); return; }
    var p = C.achievements.progress(def.id), action = button('', host, function () { openPanel(def.id); }, 'achievement-highlight-action');
    glyph(def.glyph, node('span','achievement-highlight-glyph',action));
    var copy = node('span', 'achievement-highlight-copy', action); node('strong', 'achievement-highlight-title', copy, name(def));
    node('span', '', copy, kicker === 'Up next' ? def.description : date(C.state.current.achievements.unlocked[def.id].at[p.tier]));
    node('span', 'achievement-highlight-arrow', action, '↗');
    if (kicker === 'Up next') {
      var line = node('div','achievement-feature-progress',host); node('span','',line,p.value.toLocaleString()+' / '+p.goal.toLocaleString()); node('span','',line,rewardText(def.tiers[p.tier].reward));
      var bar = node('div','achievement-bar',host); node('i','',bar).style.transform = 'scaleX('+ratio(def)+')';
    }
  }
  function render() {
    if (!opened) return;
    var all = C.achievements.list(), totals = C.achievements.totals(); ringTarget = totals.unlocked;
    totalText.textContent = totals.unlocked+' / '+totals.total; totalText.parentElement.parentElement.setAttribute('aria-label', totals.unlocked+' of '+totals.total+' tiers unlocked');
    var next = all.filter(function (d) { var p=C.achievements.progress(d.id); return !concealed(d,p) && p.tier<p.maxTier; }).sort(function(a,b){return ratio(b)-ratio(a) || a.id.localeCompare(b.id);})[0];
    var last = all.filter(function(d){return C.achievements.isUnlocked(d.id);}).sort(function(a,b){return latest(b)-latest(a);})[0];
    highlight(feature,next,'Up next','Your collection has reached every available milestone.');
    highlight(recent,last,'Latest unlock','Open a pack to begin your collection.');
    filterButtons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.filter===filter.value));});
    rail.replaceChildren();
    ['all'].concat(Object.keys(C.data.achievementGroups).filter(function(g){return all.some(function(d){return d.group===g;});})).forEach(function(g){
      var members=g==='all'?all:all.filter(function(d){return d.group===g;}), earned=members.filter(function(d){return C.achievements.isUnlocked(d.id);}).length;
      var b=button('',rail,function(){category=g;render();rail.querySelector('[aria-pressed="true"]').focus({preventScroll:true});},'achievements-category');
      node('span','',b,g==='all'?'All milestones':C.data.achievementGroups[g]); node('span','achievement-category-count',b,earned+' / '+members.length); b.setAttribute('aria-pressed',String(category===g));
    });
    var query=search.value.trim().toLocaleLowerCase();
    var shown=all.filter(function(d){
      var p=C.achievements.progress(d.id), hidden=concealed(d,p), text=name(d)+(hidden?'':' '+d.description);
      return (category==='all'||category===d.group) && text.toLocaleLowerCase().includes(query) &&
        (filter.value==='all'||filter.value==='unlocked'&&p.tier>0||filter.value==='progress'&&!hidden&&p.value>0&&p.tier<p.maxTier||filter.value==='locked'&&p.tier===0);
    });
    shown.sort(function(a,b){var order=sort.value==='recent'?latest(b)-latest(a):sort.value==='progress'?ratio(b)-ratio(a):sort.value==='group'?group(a).localeCompare(group(b)):0;return order||name(a).localeCompare(name(b))||a.id.localeCompare(b.id);});
    grid.replaceChildren(); tiles=[]; resultText.textContent=shown.length+' milestones'+(query?' matching “'+search.value.trim()+'”':'');
    if (!shown.length) {
      var empty=node('div','achievements-empty',grid); glyph('eye',empty); node('h3','',empty,'No milestones here.');
      node('p','',empty,'Try another search or show all milestones.');
      button('Clear filters',empty,function(){search.value='';filter.value='all';category='all';render();search.focus();});
    }
    var previous=null;
    shown.forEach(function(d,i){
      if (sort.value==='group'&&previous!==d.group) { node('h3','achievement-group-title',grid,group(d)); previous=d.group; }
      var p=C.achievements.progress(d.id), hidden=concealed(d,p), entry=C.state.current.achievements.unlocked[d.id];
      var tile=button('',grid,function(){showDetail(d.id,tile);},'achievement-tile'); tile.dataset.achievement=d.id; tile.style.setProperty('--stagger',Math.min(i,12)*30+'ms');
      tile.classList.toggle('is-hidden',!!hidden); tile.classList.toggle('is-complete',p.tier===p.maxTier); tile.classList.toggle('is-focused',focusId===d.id);
      var top=node('span','achievement-tile-head',tile); glyph(hidden?'secret':d.glyph,node('span','achievement-emblem',top));
      var status=node('span','achievement-state',top,hidden?'Locked':stateLabel(p));
      if(entry&&!C.state.current.achievements.seen.includes(d.id)){var dot=node('i','achievement-new-dot',status);dot.setAttribute('aria-label','Newly unlocked');}
      node('strong','achievement-tile-name',tile,name(d)); node('span','achievement-tile-description',tile,hidden?'A hidden milestone. Its story unfolds when you reach it.':d.description);
      var line=node('span','achievement-numbers',tile); node('span','achievement-eyebrow',line,hidden?'Undiscovered':p.tier===p.maxTier?'Completed':'Progress');
      var number=node('span','',line,hidden?'???':p.value.toLocaleString()+' / '+p.goal.toLocaleString());
      var bar=node('span','achievement-bar',tile),fill=node('i','',bar);
      bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',hidden?'Hidden progress':d.name+' progress');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(hidden?1:p.goal));bar.setAttribute('aria-valuenow',String(hidden?0:Math.min(p.value,p.goal)));
      var footer=node('span','achievement-tile-footer',tile),ticks=node('span','achievement-ticks',footer);
      d.tiers.forEach(function(_,n){node('i',p.tier>n?'is-earned':'',ticks);});ticks.setAttribute('aria-label',p.tier+' of '+p.maxTier+' tiers unlocked');
      node('span','achievement-date',footer,entry?date(entry.at[p.tier]):hidden?'???':'Not yet unlocked');
      tile.setAttribute('aria-label',hidden?'Hidden achievement, locked':d.name+', '+stateLabel(p));
      tiles.push({fill:fill,count:number,hidden:hidden,value:p.value,goal:p.goal,ratio:ratio(d),age:-Math.min(i,12)*30});
    });
    C.fx.wake();
  }
  function showDetail(id, tile) {
    var def=C.achievements.list().find(function(d){return d.id===id;});if(!def)return;
    closeDetail(false);activeDetail=id;detailOrigin=tile;detail.replaceChildren();detail.hidden=false;detail.inert=false;detail.classList.remove('is-closing');
    var box=node('aside','achievement-detail-box glass',detail);box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','achievement-detail-title');box.tabIndex=-1;
    var bar=node('div','achievement-detail-top',box);node('span','achievement-eyebrow',bar,group(def));var close=button('Close',bar,closeDetail,'achievement-detail-close');close.setAttribute('aria-label','Close achievement detail');
    var p=C.achievements.progress(id),hidden=concealed(def,p),entry=C.state.current.achievements.unlocked[id];
    glyph(hidden?'secret':def.glyph,node('div','achievement-detail-emblem'+(hidden?' is-hidden':''),box));
    node('p','achievement-eyebrow',box,hidden?'Undiscovered':stateLabel(p));node('h3','',box,name(def)).id='achievement-detail-title';
    node('p','achievement-detail-description',box,hidden?'Keep collecting. This milestone will reveal its story when you unlock it.':def.description);
    var summary=node('div','achievement-detail-progress',box);node('strong','',summary,hidden?'???':p.value.toLocaleString()+' / '+p.goal.toLocaleString());node('span','achievement-eyebrow',summary,'Progress');
    var progress=node('div','achievement-bar',box);node('i','',progress).style.transform='scaleX('+ratio(def)+')';
    node('h4','achievement-eyebrow',box,'Milestones');var ladder=node('ol','achievement-ladder',box);
    def.tiers.forEach(function(tier,i){
      var row=node('li',p.tier>i?'is-earned':'',ladder);
      node('span','achievement-tier-number',row,String(i+1).padStart(2,'0'));var copy=node('div','',row);node('strong','',copy,hidden?'???':'Reach '+tier.goal.toLocaleString());
      node('span','achievement-date',copy,entry&&i<entry.tier?date(entry.at[i+1]):'Not yet unlocked');node('span','achievement-tier-reward',row,hidden?'???':rewardText(tier.reward));
    });
    var item=entry&&C.state.current.inventory.find(function(i){return i.instanceId===entry.instanceId;});
    if(item){
      node('h4','achievement-eyebrow',box,'Found with');var link=button('',box,function(){returnFromCard=id;closePanel();C.events.emit('inventory:showCard',{cardId:item.cardId,instanceId:item.instanceId});},'achievement-card-link');
      var image=node('span','achievement-card-thumb',link);thumb=C.cardView.createThumbnail(C.card(item.cardId),item,{owned:true});image.appendChild(thumb.el);
      var copy=node('span','achievement-card-copy',link);node('strong','',copy,C.card(item.cardId).name);node('span','achievement-date',copy,item.serial);node('span','achievement-highlight-arrow',link,'↗');
    }
    C.accessibility.trap(box);close.focus({preventScroll:true});
    if(entry){C.achievements.markSeen(id);tile?.querySelector('.achievement-new-dot')?.remove();updateTab();}
    C.events.emit('ui:achievement',{beat:'detail',id:id});
  }
  function closeDetail(restore) {
    if(!detail||detail.hidden)return;
    if(thumb){thumb.destroy();thumb=null;}var box=detail.firstElementChild;if(box)C.accessibility.release(box);
    detail.inert=true;detail.classList.add('is-closing');activeDetail=null;
    root.setTimeout(function(){if(detail.firstElementChild===box&&detail.classList.contains('is-closing'))detail.hidden=true;},C.settings.get('quality')==='very-low'?0:250);
    if(restore!==false&&detailOrigin?.isConnected)detailOrigin.focus({preventScroll:true});
  }
  function updatePanel(now,dt) {
    if(!opened||root.document.hidden)return false;
    var quality=C.settings.get('quality'),instant=quality==='very-low'||quality==='low'||C.motion.reduced,duration=quality==='high'?600:350;
    ringAge+=dt;var p=instant?1:Math.min(1,ringAge/duration),ease=1-Math.pow(1-p,3),total=C.achievements.totals().total;
    totalText.textContent=Math.round(ringTarget*ease)+' / '+total;ring.style.strokeDashoffset=String(100*(1-(total?ringTarget/total:0)*ease));var moving=p<1;
    tiles.forEach(function(tile){tile.age+=dt;var p=instant?1:Math.max(0,Math.min(1,tile.age/duration)),eased=1-Math.pow(1-p,3);tile.fill.style.transform='scaleX('+tile.ratio*eased+')';if(!tile.hidden)tile.count.textContent=Math.round(tile.value*eased).toLocaleString()+' / '+tile.goal.toLocaleString();moving=moving||p<1;});
    return moving;
  }
  C.inventoryTabs.register('achievements',function(host){
    tab=button('',host,function(){openPanel();},'inventory-menu-option inventory-achievements-tab');tab.id='inventory-tab-achievements';tab.setAttribute('role','tab');tab.setAttribute('aria-controls','inventory-achievements');tab.setAttribute('aria-selected','false');
    glyph('star',tab);node('span','',tab,'Achievements');tabCount=node('span','achievement-tab-count',tab,'0');
  });
  C.detailActions.register('achievements',function(host,context){
    if(!context.entry.owned||context.preview)return;
    var ids=C.achievements.list().filter(function(d){return C.state.current.achievements?.unlocked[d.id]?.cardId===context.entry.card.id;}).map(function(d){return d.id;});
    if(!ids.length)return;
    button('Achievements · '+ids.length,host,function(){returnFromCard=ids[0];C.events.emit('detail:requestClose');},'achievement-detail-action');
  });
})(window.Cardable,window);
