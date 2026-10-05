(function (C, root) {
  'use strict';
  var node = C.packMarkup.node, data = C.data.journal, sheet, scroller, river, sticky, empty, search, jump, only, clearDay, status, heatmap, chart, heatHint, chartHint;
  var opened = false, origin, dirty = true, layoutDirty = false, filter = '', selectedDay = '', cardFilter = null;
  var rows = [], filtered = [], rendered = new Map(), textCache = new Map(), selected = null, chips = [], tiles = [], heatDays = [], heatFocus = 370, heatHover = null, growth = [], chartHover = null;
  var intro = 0, totalHeight = 0, lastQuality = '', numbersAge = 0, rollFrom = [0,0,0,0], targets = [0,0,0,0], values = [0,0,0,0], anniversary, backToJournal = false, returningOptions = null;
  function now() { return C.clock ? C.clock.now() : Date.now(); }
  function quality() { return Math.min(C.settings.policy.animation, C.settingsSchema.tiers.indexOf(C.settings.get('quality'))); }
  function motion() { return quality() >= 2 && !C.motion.reduced; }
  function glyph(path, host) { var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); var p = root.document.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', path); svg.appendChild(p); host.appendChild(svg); }
  function button(label, host, action, cls) { var b = node('button', cls || 'journal-button', host, label); b.type = 'button'; b.addEventListener('click', action); return b; }
  function beat(kind, entry) { C.events.emit('ui:journal', { beat: kind, entryId: entry && entry.id, cardId: entry && entry.cardId }); }
  function label(key) {
    if (key === 'before') return 'Before tracking';
    var today = C.journal.day(now()), yesterday = new Date(C.journal.date(today)); yesterday.setDate(yesterday.getDate() - 1);
    return key === today ? 'Today' : key === C.journal.day(yesterday.getTime()) ? 'Yesterday' : new Date(C.journal.date(key)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function destroy(item) { if (item.view) item.view.destroy(); item.el.remove(); }
  function clearRendered() { rendered.forEach(destroy); rendered.clear(); }
  function cached(e) { if (!textCache.has(e.id)) textCache.set(e.id, { text: C.journal.text(e), search: C.journal.searchText(e) }); return textCache.get(e.id); }
  function dayFilter(key) { selectedDay = selectedDay === key ? '' : key; if (key && key !== 'before') jump.value = key; rebuild(true); beat('day'); }
  function snapshot() { var before = new Map(); rendered.forEach(function (r, id) { if (r.entry) before.set(id, r.el.getBoundingClientRect()); }); return before; }
  function rebuild(animate) {
    if (!sheet || !opened) return;
    var before = animate && motion() ? snapshot() : null, j = C.journal.current, term = search.value.trim().toLowerCase();
    var source = C.journal.entries(j);
    var orders=new Map(source.map(function(e,i){return [e.id,i];}));
    filtered = source.filter(function (e) { return (!filter || data.categories.find(function (c) { return c.id === filter; }).types.indexOf(e.type) >= 0) && (!selectedDay || C.journal.day(e.at) === selectedDay) && (!cardFilter || e.cardId === cardFilter) && (!only.checked || C.journal.highlight(e)) && (!term || cached(e).search.indexOf(term) >= 0); }).sort(function(a,b){return (b.at==null?-1:b.at)-(a.at==null?-1:a.at)||orders.get(b.id)-orders.get(a.id);});
    chips.forEach(function (chip) { var count = source.filter(function (e) { return chip.category.types.indexOf(e.type) >= 0 && (!cardFilter || e.cardId === cardFilter); }).length; chip.button.textContent = chip.category.name + ' · ' + count; chip.button.setAttribute('aria-pressed', String(filter === chip.category.id)); });
    rows = []; var key = '', count = 0, header;
    filtered.forEach(function (e, index) {
      var next = C.journal.day(e.at); if (next !== key) { if (header) header.count = count; count = 0; key = next; header = { id: 'day-' + key, day: key, y: rows.length ? totalHeight : 0, height: 44, header: true }; rows.push(header); totalHeight = header.y + header.height; }
      var y = rows.length ? rows[rows.length - 1].y + rows[rows.length - 1].height : 0;
      var height = quality() === 0 ? 108 : C.journal.highlight(e) ? 188 : 160;
      rows.push({ id: e.id, entry: e, day: key, y: y, height: height, index: index }); count++; totalHeight = y + height;
    });
    if (header) header.count = count; if (!rows.length) totalHeight = 0;
    river.style.height = totalHeight + 'px'; clearDay.hidden = !selectedDay; clearDay.textContent = selectedDay ? label(selectedDay) + ' ×' : '';
    empty.hidden = !!filtered.length; empty.textContent = j.entries.length ? 'No memories match these filters.' : data.empty;
    status.textContent = filtered.length + (filtered.length === 1 ? ' memory' : ' memories');
    if (animate) { scroller.scrollTop = 0; selected = null; }
    clearRendered(); render();
    if (before) rendered.forEach(function (r, id) { var a = before.get(id); if (!a || !r.entry) return; var b = r.el.getBoundingClientRect();
      // Same FLIP capture / inverse / cubic release as the inventory sort.
      r.el.animate([{ transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px)' }, { transform: 'translate(0,0)' }], { duration: C.config.inventoryMotion.transitionMs, easing: 'cubic-bezier(.22,1,.36,1)' }); });
    renderAnniversary();dirty = true; C.fx.wake();
  }
  function mount(row) {
    if (row.header) { var heading = button(label(row.day) + ' · ' + row.count, river, function () { dayFilter(row.day); }, 'journal-day'); heading.style.top = row.y + 'px'; return { el: heading, row: row }; }
    var e = row.entry, highlight = C.journal.highlight(e), wrapper = node('div', 'journal-row' + (highlight ? ' is-highlight' : '') + (row.index % 2 ? ' is-right' : ''), river);
    wrapper.style.top = row.y + 'px'; wrapper.style.height = row.height + 'px'; wrapper.dataset.entryId = e.id;
    var card = C.card(e.cardId), actionable = card && C.state.current.inventory.some(function (i) { return i.cardId === e.cardId; });
    var entry = node('button', 'journal-entry glass', wrapper); entry.type = 'button'; entry.tabIndex = selected === e.id || !selected && row.index === 0 ? 0 : -1;
    entry.setAttribute('aria-label', data.types[e.type].name + '. ' + cached(e).text); if (!actionable) entry.setAttribute('aria-disabled', 'true');
    var icon = node('span', 'journal-glyph', entry); glyph(data.types[e.type].glyph, icon);
    var copy = node('div', 'journal-copy', entry); node('span', 'journal-kind', copy, data.types[e.type].name);
    node('p', 'journal-text', copy, cached(e).text);
    var time = node('time', 'journal-time', copy, e.at == null ? 'Before tracking' : new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })); if (e.at != null) time.dateTime = new Date(e.at).toISOString();
    if (e.retro) node('span', 'journal-retro', copy, 'Recovered memory');
    var view = null;
    if (card && quality() > 0) {
      var holder = node('div', 'journal-thumbnail', entry), owned = C.state.current.inventory.find(function (i) { return i.instanceId === e.instanceId; });
      var instance = owned || { cardId: e.cardId, instanceId: e.instanceId || e.id, variantId: e.variantKey && e.variantKey.indexOf('+') < 0 ? e.variantKey : null, serial: e.extra && e.extra.serial || '', packId: e.packId };
      view = C.cardView.createThumbnail(card, instance, { owned: true }); holder.appendChild(view.el);
      if (e.type === 'variantFirst' || e.type === 'comboFirst') {
        var badge = node('span', 'journal-variant-glyph', holder); glyph(data.types[e.type].glyph, badge);
        var ticks = node('span', 'journal-tier-ticks', copy), rarity = C.rarity(e.tier); ticks.setAttribute('aria-label', rarity ? rarity.name : '');
        for (var t = 0; t < C.config.cardView.meterSegments; t++) { var tick = node('i', '', ticks); tick.dataset.filled = !!rarity && t <= rarity.tier; }
      }
      entry.addEventListener('pointermove', function (event) { if (quality() !== 3 || C.motion.reduced) return; var r = holder.getBoundingClientRect(); holder.style.transform = 'perspective(400px) rotateX(' + (-(event.clientY - r.top - r.height / 2) / r.height * 8) + 'deg) rotateY(' + ((event.clientX - r.left - r.width / 2) / r.width * 8) + 'deg)'; });
      entry.addEventListener('pointerleave', function () { holder.style.transform = ''; });
    }
    entry.addEventListener('click', function () { if (actionable) openCard(e); }); entry.addEventListener('focus', function () { selected = e.id; });
    if (motion() || C.motion.reduced && quality() > 1) wrapper.animate(C.motion.reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)', filter: quality() === 3 ? 'blur(3px)' : 'none' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { duration: 250, delay: Math.min(240, rendered.size * 40), easing: 'cubic-bezier(.22,1,.36,1)' });
    return { el: wrapper, button: entry, entry: e, view: view, row: row };
  }
  function render() {
    if (!opened || !scroller) return;
    var min = Math.max(0, scroller.scrollTop - 280), max = scroller.scrollTop + scroller.clientHeight + 280;
    var lo = 0, hi = rows.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (rows[mid].y + rows[mid].height < min) lo = mid + 1; else hi = mid; }
    var visible = new Set(), currentHeader = null;
    for (var i = lo; i < rows.length && rows[i].y <= max; i++) { var row = rows[i]; visible.add(row.id); if (!rendered.has(row.id)) rendered.set(row.id, mount(row)); }
    rendered.forEach(function (r, id) { if (!visible.has(id)) { destroy(r); rendered.delete(id); } });
    for (var h = lo; h >= 0; h--) { if (rows[h] && rows[h].header && rows[h].y <= scroller.scrollTop + 4) { currentHeader = rows[h]; break; } }
    sticky.hidden = !currentHeader; if (currentHeader) { sticky.textContent = label(currentHeader.day) + ' · ' + currentHeader.count; sticky.dataset.day = currentHeader.day; }
    river.style.setProperty('--journal-line', Math.min(totalHeight, scroller.scrollTop + scroller.clientHeight) + 'px');
  }
  function selectIndex(index) {
    var row = rows.find(function (r) { return r.entry && r.index === index; }); if (!row) return;
    selected = row.id; var top = row.y, bottom = row.y + row.height;
    if (top < scroller.scrollTop + 44) scroller.scrollTop = Math.max(0, top - 44); else if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight;
    render(); rendered.forEach(function (r) { if (r.button) r.button.tabIndex = r.entry.id === selected ? 0 : -1; }); var item = rendered.get(selected); if (item) item.button.focus({ preventScroll: true });
  }
  function canvasSize(canvas, width, height) { var dpr = Math.min(root.devicePixelRatio || 1, C.settings.policy.dpr); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); canvas.style.aspectRatio = width + ' / ' + height; var ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); return ctx; }
  function prepareCharts() {
    var j = C.journal.current, d = new Date(now()); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay() - 52 * 7); heatDays = [];
    for (var i = 0; i < 371; i++) { heatDays.push(C.journal.day(d.getTime())); d.setDate(d.getDate() + 1); }
    heatFocus = Math.max(0, heatDays.indexOf(C.journal.day(now())));
    growth = []; var cumulative = C.journal.entries(j).filter(function (e) { return e.type === 'firstPull' && e.at == null; }).length;
    Object.keys(j.days).sort().forEach(function (key) { cumulative += j.days[key].unique; growth.push({ day: key, n: cumulative }); });
    heatmap.setAttribute('aria-label','Pull calendar, 53 weeks by 7 days. Arrow keys move by day or week; Enter filters a day.');
    chart.setAttribute('aria-description',j.counts.unique+' unique cards in total.');drawHeat(1); drawGrowth();
    var nextTargets = [j.counts.packs, j.counts.unique, j.counts.variants, C.journal.streak(j, now())];
    rollFrom = values.slice(); targets = nextTargets; numbersAge = 0;
    tiles.forEach(function (t, i) { t.el.setAttribute('aria-label', t.label + ': ' + targets[i]); });
  }
  function drawHeat(progress) {
    var ctx = canvasSize(heatmap, 636, 84), j = C.journal.current;
    heatDays.forEach(function (key, i) { var x = Math.floor(i / 7) * 12, y = i % 7 * 12, count = j.days[key] && j.days[key].pulls || 0;
      var diagonal = Math.floor(i / 7) + i % 7, alpha = progress == null || quality() < 3 || C.motion.reduced ? 1 : Math.max(0, Math.min(1, progress * 65 - diagonal));
      ctx.globalAlpha = alpha; ctx.fillStyle = count ? 'rgba(245,245,247,' + Math.min(.85,.2 + Math.log2(count + 1) * .14) + ')' : 'rgba(255,255,255,.045)';
      if (count > 3 && quality() >= 2) { ctx.shadowColor = 'rgba(255,255,255,.25)'; ctx.shadowBlur = 5; } else ctx.shadowBlur = 0;
      ctx.fillRect(x+1,y+1,9,9); if (heatmap === root.document.activeElement && i === heatFocus || i === heatHover) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x+.5,y+.5,10,10); }
    }); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  function heatInfo(index) {
    var key = heatDays[index], d = C.journal.current.days[key]; if (!key) return;
    heatHint.textContent = label(key) + ' · ' + (d ? d.pulls : 0) + ' pulls · ' + (d ? d.packs : 0) + ' packs' + (d && d.best && C.card(d.best.cardId) ? ' · Best: ' + C.card(d.best.cardId).name : '');
  }
  function heatIndex(event) { var r = heatmap.getBoundingClientRect(); return Math.max(0,Math.min(370,Math.floor((event.clientX-r.left)/r.width*53)*7+Math.floor((event.clientY-r.top)/r.height*7))); }
  function drawGrowth() {
    var ctx = canvasSize(chart, 320, 84); if (!growth.length) { ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(8,75,304,1);return; }
    var max = Math.max(1, growth[growth.length-1].n), first = C.journal.date(growth[0].day), last = Math.max(first+86400000, C.journal.date(growth[growth.length-1].day));
    function x(p) { return 8+(C.journal.date(p.day)-first)/(last-first)*304; } function y(p) { return 76-p.n/max*64; }
    var gradient=ctx.createLinearGradient(0,8,0,84);gradient.addColorStop(0,'rgba(255,255,255,.16)');gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.beginPath();ctx.moveTo(8,76);growth.forEach(function(p,i){if(i){var previous=growth[i-1];ctx.bezierCurveTo((x(previous)+x(p))/2,y(previous),(x(previous)+x(p))/2,y(p),x(p),y(p));}else ctx.lineTo(x(p),y(p));});ctx.lineTo(x(growth[growth.length-1]),76);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
    ctx.beginPath();growth.forEach(function(p,i){if(i){var previous=growth[i-1];ctx.bezierCurveTo((x(previous)+x(p))/2,y(previous),(x(previous)+x(p))/2,y(p),x(p),y(p));}else ctx.moveTo(x(p),y(p));});ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.stroke();
    if(chartHover!=null){var target=first+chartHover*(last-first),nearest=growth.reduce(function(a,b){return Math.abs(C.journal.date(b.day)-target)<Math.abs(C.journal.date(a.day)-target)?b:a;});ctx.beginPath();ctx.moveTo(x(nearest),0);ctx.lineTo(x(nearest),84);ctx.strokeStyle='rgba(255,255,255,.25)';ctx.stroke();ctx.beginPath();ctx.arc(x(nearest),y(nearest),3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();chartHint.textContent=label(nearest.day)+' · '+nearest.n+' unique cards';}
  }
  function updateTabs() { C.inventory.toolbar.tabs.querySelectorAll('.inventory-tab-list [role="tab"]').forEach(function(tab){tab.setAttribute('aria-selected',String(!C.inventory.page&&tab.classList.contains('is-selected')));}); }
  function show(options) {
    options=options||{}; if (opened) return; if(!sheet||root.document.hidden||C.opening.phase!=='idle'||C.preferences.open||C.tutorial.active||C.detail.phase!=='closed')return;
    C.inventory.request('full'); if(!C.inventory.open)return;
    origin=options.origin||root.document.activeElement;cardFilter=options.cardId||null;
    opened=true;sheet.hidden=false;sheet.inert=false;intro=0;C.inventory.setPage('journal');updateTabs();
    sheet.dataset.quality=quality();lastQuality=String(quality());sheet.dataset.reduced=String(C.motion.reduced);
    sheet.classList.add('is-open');sheet.style.opacity=motion()?0:1;
    C.events.emit('journal:context',{active:true});
    textCache.clear();prepareCharts();rebuild(false);search.focus({preventScroll:true});beat('open');C.fx.wake();
  }
  function close(immediate) { if(!opened)return;opened=false;sheet.hidden=true;sheet.inert=true;sheet.style.transform='';clearRendered();if(C.inventory.page==='journal')C.inventory.setPage(null);updateTabs();C.events.emit('journal:context',{active:false});if(!immediate&&origin&&origin.isConnected&&!origin.inert)origin.focus({preventScroll:true});beat('close'); }
  function openCard(e) { returningOptions={origin:origin,cardId:cardFilter};backToJournal=true;close(true);C.events.emit('inventory:showCard',{cardId:e.cardId,instanceId:e.instanceId});if(C.detail.phase==='closed')backToJournal=false;beat('card',e); }
  function renderAnniversary() {
    if(!anniversary)return;anniversary.replaceChildren();var today=new Date(now()),old=C.journal.entries(C.journal.current).filter(function(e){if(e.at==null)return false;var d=new Date(e.at);return d.getFullYear()<today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()&&(!cardFilter||e.cardId===cardFilter);});
    anniversary.hidden=!old.length;if(!old.length)return;node('span','journal-kicker',anniversary,'On this day');
    old.filter(function(e){return C.journal.highlight(e);}).concat(old.filter(function(e){return !C.journal.highlight(e);})).slice(0,3).forEach(function(e){var b=button(new Date(e.at).getFullYear()+' · '+C.journal.text(e),anniversary,function(){selectedDay=C.journal.day(e.at);jump.value=selectedDay;filter='';only.checked=false;search.value='';rebuild(true);beat('anniversary',e);},'journal-anniversary-entry');b.title=C.journal.text(e);});
  }
  function update(time,dt) {
    if(!opened)return false;
    var active=false;
    if(dirty||layoutDirty){render();dirty=layoutDirty=false;}
    if(intro<700&&quality()>=2){intro+=dt;var enter=Math.min(1,intro/250);sheet.style.opacity=enter;if(!C.motion.reduced)sheet.style.transform='translateY('+(1-enter)*8+'px)';if(quality()===3&&!C.motion.reduced)drawHeat(Math.min(1,intro/700));active=intro<700;}
    if(numbersAge<450){numbersAge+=dt;var p=motion()?Math.min(1,numbersAge/450):1;values=targets.map(function(n,i){return Math.round(rollFrom[i]+(n-rollFrom[i])*(1-Math.pow(1-p,3)));});tiles.forEach(function(t,i){t.number.set(values[i],quality()>=2&&!C.motion.reduced);});active=active||p<1;}
    tiles.forEach(function(t){active=t.number.update(time)||active;});return active;
  }
  function init() {
    if(sheet||!C.inventory.content)return;sheet=node('section','journal-sheet',C.inventory.content);sheet.id='inventory-journal';sheet.hidden=true;sheet.inert=true;sheet.setAttribute('role','tabpanel');sheet.setAttribute('aria-labelledby','inventory-tab-journal');
    var header=node('header','journal-header',sheet),heading=node('div','',header);node('p','journal-kicker',heading,'The collection, remembered');var title=node('h2','',heading,'History');title.id='journal-title';status=node('span','journal-status',header);button('Back to cards',header,function(){close();},'journal-button journal-close');
    var top=node('div','journal-top',sheet),calendar=node('div','journal-calendar',top);node('p','journal-kicker',calendar,'A year of pulls');heatmap=node('canvas','journal-heatmap',calendar);heatmap.tabIndex=0;heatmap.setAttribute('role','button');heatHint=node('p','journal-chart-hint',calendar,'Choose a day to revisit.');heatHint.setAttribute('aria-live','polite');
    var stats=node('div','journal-stats',top);['Packs opened','Unique cards','Variants found','Current streak'].forEach(function(label){var el=node('div','journal-stat',stats),host=node('div','journal-stat-number',el),number=C.numbers.create(host);number.set(0,false);node('span','journal-kicker',el,label);tiles.push({el:el,number:number,label:label});});
    var growthHost=node('div','journal-growth',top);node('p','journal-kicker',growthHost,'Collection growth');chart=node('canvas','journal-growth-chart',growthHost);chart.tabIndex=0;chart.setAttribute('aria-label','Cumulative unique cards over time. Arrow keys explore days.');chartHint=node('p','journal-chart-hint',growthHost,'Each new card leaves a mark.');chartHint.setAttribute('aria-live','polite');
    anniversary=node('aside','journal-anniversary',sheet);anniversary.setAttribute('aria-label','On this day');anniversary.hidden=true;
    var filters=node('div','journal-filters',sheet),chipHost=node('div','journal-chips',filters);data.categories.forEach(function(category){var b=button(category.name,chipHost,function(){filter=filter===category.id?'':category.id;rebuild(true);beat('filter');},'journal-chip');b.setAttribute('aria-pressed','false');chips.push({button:b,category:category});});
    var fields=node('div','journal-fields',filters);search=node('input','journal-search',fields);search.type='search';search.placeholder='Search your memories';search.setAttribute('aria-label','Search cards, variants and pack types');search.addEventListener('input',function(){rebuild(true);});
    var dateLabel=node('label','journal-jump',fields,'Jump to date');jump=node('input','',dateLabel);jump.type='date';jump.setAttribute('aria-label','Jump to date');jump.addEventListener('change',function(){selectedDay=jump.value;rebuild(true);beat('day');});
    var highlights=node('label','journal-highlights',fields);only=node('input','',highlights);only.type='checkbox';node('span','',highlights,'Highlights only');only.addEventListener('change',function(){rebuild(true);beat('highlights');});clearDay=button('',fields,function(){selectedDay='';jump.value='';rebuild(true);},'journal-chip');clearDay.hidden=true;
    scroller=node('div','journal-scroll',sheet);scroller.tabIndex=-1;sticky=button('',scroller,function(){dayFilter(sticky.dataset.day);},'journal-sticky-day');sticky.hidden=true;river=node('div','journal-river',scroller);empty=node('p','journal-empty',scroller,data.empty);
    scroller.addEventListener('scroll',function(){dirty=true;C.fx.wake();},{passive:true});
    heatmap.addEventListener('pointermove',function(event){heatHover=heatIndex(event);heatInfo(heatHover);drawHeat(1);});heatmap.addEventListener('pointerleave',function(){heatHover=null;drawHeat(1);});heatmap.addEventListener('click',function(event){heatFocus=heatIndex(event);dayFilter(heatDays[heatFocus]);});heatmap.addEventListener('focus',function(){heatInfo(heatFocus);drawHeat(1);});heatmap.addEventListener('blur',function(){drawHeat(1);});
    heatmap.addEventListener('keydown',function(event){var delta={ArrowLeft:-7,ArrowRight:7,ArrowUp:-1,ArrowDown:1}[event.key];if(delta){event.preventDefault();event.stopPropagation();heatFocus=Math.max(0,Math.min(370,heatFocus+delta));heatInfo(heatFocus);drawHeat(1);}else if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();dayFilter(heatDays[heatFocus]);}});
    chart.addEventListener('pointermove',function(event){var r=chart.getBoundingClientRect();chartHover=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));drawGrowth();});chart.addEventListener('pointerleave',function(){chartHover=null;drawGrowth();});chart.addEventListener('keydown',function(event){if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();chartHover=Math.max(0,Math.min(1,(chartHover||0)+(event.key==='ArrowLeft'?-1:1)/Math.max(1,growth.length-1)));drawGrowth();}});
    sheet.addEventListener('keydown',function(event){
      if(event.key==='Escape'){event.preventDefault();C.inventory.request('peek');}else if(event.key==='/'&&!event.target.closest('input')){event.preventDefault();search.focus();}
      else if(!event.target.closest('input,select,textarea')&&['ArrowDown','ArrowUp','Home','End'].indexOf(event.key)>=0){event.preventDefault();var index=filtered.findIndex(function(e){return e.id===selected;});selectIndex(event.key==='Home'?0:event.key==='End'?filtered.length-1:Math.max(0,Math.min(filtered.length-1,index+(event.key==='ArrowDown'?1:-1))));}
      if(event.defaultPrevented)event.stopPropagation();
    });
    root.document.addEventListener('keydown',function(event){if(opened&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();event.stopImmediatePropagation();search.focus();}},true);
    C.inventory.toolbar.tabs.addEventListener('click',function(event){if(opened&&event.target.closest('.inventory-tab-list, .inventory-unowned'))close(true);},true);
    C.events.on('inventory:pageChanged',function(event){if(event.id!=='journal'&&opened)close(true);});
    C.events.on('inventory:context',function(event){if((!event.active||event.detent==='peek')&&opened)close(true);else if(opened){layoutDirty=true;C.fx.wake();}});
    C.events.on('inventory:modelChanged',function(){if(opened)updateTabs();});
    if(root.ResizeObserver)new root.ResizeObserver(function(){layoutDirty=true;if(opened)C.fx.wake();}).observe(scroller);
    C.fx.subscribe(update,'journal');C.viewport.onResize(function(){layoutDirty=true;if(opened)C.fx.wake();});
    C.events.on('journal:changed',function(){textCache.clear();if(opened){prepareCharts();rebuild(false);}});
    C.events.on('save:willReplace',function(){backToJournal=false;close(true);textCache.clear();});C.events.on('save:willReset',function(){backToJournal=false;close(true);textCache.clear();});
    C.events.on('inventory:detailContext',function(event){if(!event.active&&backToJournal){backToJournal=false;show(returningOptions);}});
    C.events.on('preferences:context',function(event){if(event.active)close(true);});C.events.on('opening:context',function(event){if(event.active)close(true);});
    C.events.on('settings:changed',function(){if(!opened)return;var next=String(quality());sheet.dataset.quality=next;sheet.dataset.reduced=String(C.motion.reduced);if(next!==lastQuality){lastQuality=next;rebuild(false);}drawHeat(1);drawGrowth();C.fx.wake();});
    C.events.on('motion:changed',function(){if(sheet)sheet.dataset.reduced=String(C.motion.reduced);});
  }
  function cardHistory(host, context) {
    if(!context.entry.owned||context.preview)return;
    var cardId=context.entry.card.id,action=context.historyHost?null:button('History',host,function(){var opening=section.hidden;section.hidden=!opening;action.setAttribute('aria-expanded',String(opening));if(opening){fill();beat('card-history',{cardId:cardId});}},'journal-card-action');
    if(action)action.setAttribute('aria-expanded','false');var section=node('section','journal-card-history',context.historyHost||context.panel);section.hidden=!context.historyHost;section.setAttribute('aria-label',context.entry.card.name+' history');
    var title=node('h3','journal-card-title',section,'History'),summary=node('p','journal-card-summary',section),list=node('div','journal-card-scroll',section),canvas=node('div','journal-card-river',list),mounted=new Map(),memories=[];
    list.tabIndex=0;list.setAttribute('aria-label','Card history. Use arrow keys to scroll.');
    function renderCopies(){var min=Math.max(0,list.scrollTop-180),max=list.scrollTop+list.clientHeight+180,visible=new Set();var first=Math.floor(min/132),last=Math.min(memories.length,Math.ceil(max/132));
      for(var i=first;i<last;i++){var e=memories[i];visible.add(e.id);if(mounted.has(e.id))continue;var row=node('article','journal-card-memory',canvas);row.style.top=i*132+'px';glyph(data.types[e.type].glyph,node('span','journal-glyph',row));var copy=node('div','',row);var historyText=C.journal.text(e);if(context.historyHost&&e.extra&&e.extra.serial)historyText=historyText.replace('Serial '+e.extra.serial+'.','').replace(e.extra.serial,'this copy').trim();node('p','journal-text',copy,historyText);node('p','journal-time',copy,label(C.journal.day(e.at))+(e.packId&&C.pack(e.packId)?' · '+C.pack(e.packId).name:''));if(e.type==='pull'){node('p','journal-card-serial',copy,(context.historyHost?'':(e.extra&&e.extra.serial||'')+' · ')+(e.extra&&e.extra.variants||[]).map(function(id){return C.variant(id)?C.variant(id).name:id;}).join(' + '));}mounted.set(e.id,row);}
      mounted.forEach(function(row,id){if(!visible.has(id)){row.remove();mounted.delete(id);}});
    }
    function fill(){mounted.forEach(function(row){row.remove();});mounted.clear();memories=C.journal.forCard(cardId);var instances=C.state.current.inventory.filter(function(i){return i.cardId===cardId;}).sort(function(a,b){return b.pulledAt-a.pulledAt;});summary.textContent=context.historyHost?instances.length+(instances.length===1?' owned copy':' owned copies'):C.journal.format(data.copies,{n:instances.length,serial:instances[0]&&instances[0].serial||''});canvas.style.height=memories.length*132+'px';renderCopies();}
    list.addEventListener('scroll',renderCopies,{passive:true});if(action)action.setAttribute('aria-controls','card-history-'+cardId);section.id='card-history-'+cardId;
    if(context.onHistoryOpen)context.onHistoryOpen(function(){fill();beat('card-history',{cardId:cardId});});
  }
  C.journalView={show:show,close:close,get open(){return opened;}};
  C.detailActions.register('journal',cardHistory);
  C.inventoryTabs.register('journal',function(host){var tab=button('History',host,function(){show({origin:tab});},'inventory-menu-option inventory-journal-tab');tab.id='inventory-tab-journal';tab.setAttribute('role','tab');tab.setAttribute('aria-controls','inventory-journal');tab.setAttribute('aria-selected','false');C.events.on('journal:context',function(event){tab.setAttribute('aria-selected',String(event.active));});});
  C.contextMenu.register({target:'empty',build:function(){return [{id:'journal',type:'action',label:'History',icon:'timer',run:function(){show();}}];}});
  C.events.on('journal:request',show);C.events.on('app:ready',init);
})(window.Cardable,window);
