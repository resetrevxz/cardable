/* Cardable Market — Simulation controls: the clock chip, pause and speed, onboarding, export, import and reset.
 * Everything here acts on the local simulator only. Nothing touches the player's cards or Credits. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document;
  var chips = new Set();
  var cfg = function () { return C.data.marketSim; };

  // A realm is "live" when real trades can happen in it: the offline Simulation, or a connected Global Market.
  function live(realm) {
    if (realm === 'simulation') return !!C.market.api && C.market.api.simulationLive;
    if (realm === 'global') return !!C.market.online && C.market.online.state.status === 'online' && !(C.market.store && C.market.store.session.showGlobalSample);
    return false;
  }
  function rt() { return C.marketSim && C.marketSim.runtime; }
  function status() { return C.market.api.statusSync('simulation'); }
  function stateWord(st) {
    if (!st.exists) return 'Not started';
    if (st.paused) return 'Paused';
    if (st.clockState === 'running') return 'Running';
    return 'Frozen';
  }
  function speedInfo(id) { return cfg().speeds.find(function (s) { return s.id === id; }) || cfg().speeds[1]; }

  // ---- the chip -------------------------------------------------------------------------------------------------------
  function paintChip(chip) {
    if (C.market.store.session.realm !== 'simulation') { paintGlobalChip(chip); return; }
    var st = status();
    ui.clear(chip);
    var word = stateWord(st);
    chip.dataset.state = st.exists ? (st.paused ? 'paused' : st.clockState === 'running' ? 'running' : 'frozen') : 'idle';
    chip.appendChild(icon(st.paused || st.clockState !== 'running' ? 'pause' : 'play'));
    chip.appendChild(h('span.mk-sim-clock.mk-num', { text: st.clock || 'Day 1' }));
    chip.appendChild(h('span.mk-sim-clock-short.mk-num', { text: (st.clock || 'Day 1').replace('Day ', 'D').replace(' · ', ' '), 'aria-hidden': 'true' }));
    chip.appendChild(h('span.mk-sim-word', { text: word }));
    chip.setAttribute('aria-label', 'Simulation clock: ' + (st.clock || 'not started') + '. ' + word + (st.reason ? '. ' + st.reason : '') + '. Open the simulation controls.');
    chip.title = st.exists ? word + '. ' + (st.paused || st.clockState !== 'running' ? 'Simulated time is stopped.' : 'Simulated time runs only while Cardable is open.') : 'The simulation starts when you first use the Market.';
  }
  // In Global the same chip says whether you are connected, so the header has the same shape in both realms.
  function paintGlobalChip(chip) {
    var g = C.market.api.statusSync('global'), on = !!g.connected, text = on ? (/read-only/i.test(g.label) ? 'Read-only' : 'Online') : (g.label || 'Global');
    ui.clear(chip);
    chip.dataset.state = on ? 'running' : 'idle';
    chip.appendChild(icon(on ? 'check' : 'lock'));
    chip.appendChild(h('span.mk-sim-clock.mk-num', { text: text }));
    chip.appendChild(h('span.mk-sim-clock-short.mk-num', { text: text, 'aria-hidden': 'true' }));
    chip.appendChild(h('span.mk-sim-word', { text: on ? 'Global' : '' }));
    chip.setAttribute('aria-label', 'Global Market: ' + text + '. Open your market');
    chip.title = g.message || '';
  }
  function statusChip() {
    var chip = h('button.mk-sim-chip', { type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
    chips.add(chip);
    paintChip(chip);
    chip.addEventListener('click', function () { if (C.market.store.session.realm === 'simulation') openPanel(chip); else if (ui.island) ui.island.toggle(chip); });
    return chip;
  }
  function refresh() {
    chips.forEach(function (chip) { if (!chip.isConnected) { chips.delete(chip); return; } paintChip(chip); });
    if (ui.island) ui.island.refresh();
  }

  // ---- the panel ------------------------------------------------------------------------------------------------------
  function bar(label, value) { return h('div.mk-sim-row', h('span', { text: label }), h('span.mk-num', { text: value })); }
  function panelBody(close, compact) {
    var r = rt(), st = status(), world = r && r.world;
    var box = h('div.mk-sim-panel');
    box.appendChild(h('div.mk-menu-title', { text: 'Clock' }));
    box.appendChild(h('div.mk-sim-big', h('span.mk-num', { text: st.clock || 'Not started' }), h('span.mk-sim-word', { text: stateWord(st) })));
    var sp = speedInfo(st.speed);
    box.appendChild(h('p.mk-hint', { text: !st.exists ? 'Open the Market to start.' : st.paused ? 'Paused. Nothing moves until you resume.' : st.clockState === 'running' ? sp.note : (st.reason || 'Stopped.') }));
    var pause = ui.button(st.paused ? 'Resume' : 'Pause', { icon: st.paused ? 'play' : 'pause', variant: st.paused ? 'primary' : 'secondary', disabled: !st.exists });
    pause.addEventListener('click', function () { if (!r) return; if (r.paused) r.resume(); else r.pause(); refresh(); close && close(); });
    box.appendChild(pause);
    var speed = ui.segmented({ label: 'Simulation speed', value: st.speed, onChange: function (v) { r.setSpeed(v); refresh(); }, options: cfg().speeds.map(function (s) { return { value: s.id, label: s.label, title: s.note }; }) });
    box.appendChild(h('div.mk-field', h('span.mk-field-label', { text: 'Speed' }), speed));
    box.appendChild(h('p.mk-hint', { text: cfg().help.pause }));
    if (world) {
      var open = 0, orders = 0; Object.keys(world.listings).forEach(function (k) { if (world.listings[k].status === 'open') open++; }); Object.keys(world.orders).forEach(function (k) { if (world.orders[k].status === 'open') orders++; });
      box.appendChild(h('div.mk-sim-stats', bar('Traders', String(world.bots.length)), bar('Open listings', String(open)), bar('Buy orders', String(orders)), bar('Trades so far', String(world.stats.trades))));
    }
    if (!compact) box.appendChild(ui.button('Market settings', { icon: 'sliders', variant: 'ghost', onClick: function () { close && close(); ui.go('settings', {}); } }));
    return box;
  }
  function openPanel(anchor) {
    rt() && C.marketSim.ensure(true);
    ui.popover(anchor, function (close) { return panelBody(close, false); }, { label: 'Simulation controls', align: 'end', onClose: refresh });
  }

  // ---- onboarding -----------------------------------------------------------------------------------------------------
  function introCard(onDone) {
    var card = h('aside.mk-intro.is-sim', { role: 'note' },
      h('div', h('strong', { text: 'Local is a market on this device.' }),
        h('p', { text: cfg().help.intro }),
        h('ul.mk-bullets',
          h('li', { text: 'Traders are bots with their own Credits, cards and habits.' }),
          h('li', { text: 'Time runs only while Cardable is open and visible.' }),
          h('li', { text: 'Listed cards are locked until they sell or you withdraw them. Sales pay Credits once, after a 2% fee.' }))),
      ui.button('Got it', { variant: 'secondary', onClick: function () { C.market.store.markGuideSeen(); card.remove(); if (onDone) onDone(); } }));
    return card;
  }

  // ---- export, import, reset -----------------------------------------------------------------------------------------
  function exportFile() {
    var r = rt(); if (!r || !r.world) { C.ui.toast('Nothing to export yet.'); return; }
    var text = r.exportText();
    var blob = new root.Blob([text], { type: 'application/json' }), url = root.URL.createObjectURL(blob);
    var a = h('a', { href: url, download: 'cardable-market-simulation-day-' + (Math.floor((r.world.now - r.world.epoch) / 86400000) + 1) + '.json' });
    doc.body.appendChild(a); a.click(); a.remove();
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000);
    C.ui.toast('Simulation exported. It does not contain your cards.');
  }
  function importFile(file, done) {
    var r = C.marketSim.ensure(false);
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { C.ui.toast('That file is too large for a simulation export.', null, 'error'); return; }
    var reader = new root.FileReader();
    reader.onload = function () {
      try {
        var res = r.importText(String(reader.result));
        C.ui.toast('Simulation restored' + (res.changes.length ? ' (' + res.changes.length + ' adjusted to match your collection)' : ''));
        if (done) done(res);
      } catch (error) { C.ui.toast('That file could not be used: ' + error.message, null, 'error'); }
    };
    reader.onerror = function () { C.ui.toast('That file could not be read.', null, 'error'); };
    reader.readAsText(file);
  }
  function resetWorld(done) {
    var r = C.marketSim.ensure(true);
    r.reset();
    // Listing ids restart with a new world, so watched ids from the old one no longer mean anything.
    var prefs = C.market.store.prefs;
    prefs.watch = prefs.watch.filter(function (id) { return !/^L[0-9a-z]+$/.test(id); });
    prefs.notificationsRead = [];
    C.market.store.emit('watch'); C.market.store.emit('sim');
    C.ui.toast('Simulation reset. Your cards and Credits are unchanged.');
    if (done) done();
  }


  // ---- shared helpers for real trades ---------------------------------------------------------------------------------
  var reqCounter = 0;
  function newRequestId() { reqCounter++; return 'r' + Date.now().toString(36) + reqCounter.toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  // The clock a countdown is read against: the Simulation's own time, or the server's time in Global.
  function simNow() {
    if (C.market.store && C.market.store.session.realm === 'global' && C.market.onlineData) return C.market.onlineData.now();
    var r = rt(); return r && r.world ? r.world.now : 0;
  }
  // Countdowns are plain text updated from the simulator's own clock; there is no timer of their own.
  function countdowns(container) {
    var now = simNow();
    if (!now || !container) return;
    container.querySelectorAll('[data-end]').forEach(function (el) {
      var end = Number(el.dataset.end), mins = Math.max(0, (end - now) / 60000), num = el.querySelector('.mk-num') || el;
      var text = ui.fmt.duration(mins);
      if (num.textContent !== text) num.textContent = text;
      el.classList.toggle('is-urgent', mins <= 60);
    });
  }
  // A confirmation that really does something. It keeps the dialog open with the reason when the simulator refuses.
  function confirm(options) {
    var surface = h('section.mk-modal.mk-review', { role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title });
    surface.appendChild(h('header', ui.eyebrow(options.eyebrow || 'Review'), h('h2', { text: options.title })));
    if (options.card) surface.appendChild(options.card);
    var dl = h('dl.mk-review-rows');
    (options.rows || []).forEach(function (r) {
      if (!r) return;
      dl.appendChild(h('div', { data: { strong: r.strong ? 'true' : '' } }, h('dt', { text: r.label }), h('dd', r.node ? r.node : { text: r.value })));
    });
    surface.appendChild(dl);
    if (options.body) surface.appendChild(options.body);
    var message = h('p.mk-field-error.is-inline', { role: 'alert', hidden: true });
    // The state of this request, always in words: Processing while it is out, Retry safely when it cannot have acted twice.
    var stateChip = h('span.mk-review-state', { role: 'status', 'aria-live': 'polite', hidden: true });
    function setState(text, tone) { stateChip.hidden = !text; ui.clear(stateChip); if (text) stateChip.appendChild(ui.chip(text, { tone: tone || 'soft', icon: tone === 'warn' ? 'warn' : 'clock' })); }
    surface.appendChild(message);
    surface.appendChild(stateChip);
    if (options.note) surface.appendChild(h('p.mk-review-note', icon('info'), h('span', { text: options.note })));
    var requestId = newRequestId(), handle = null, busy = false;
    var cancel = ui.button(options.cancelLabel || 'Cancel', { variant: 'ghost', onClick: function () { handle.close(); } });
    var go = ui.button(options.confirmLabel || 'Confirm', { variant: 'primary', icon: options.icon, disabled: !!options.disabledReason, reason: options.disabledReason || '', onClick: function () { run(); } });
    function run() {
      if (busy) return;
      busy = true; go.disabled = true; cancel.disabled = true; message.hidden = true; setState('Processing');
      var out;
      try { out = options.run(requestId); } catch (error) { out = { ok: false, message: 'Something went wrong. Nothing was changed.' }; }
      Promise.resolve(out).then(function (res) {
        busy = false; setState('');
        if (res && res.ok !== false) { handle.close(); if (options.success) options.success(res); return; }
        // An answer that never arrived may or may not have been acted on: keep the same request id so a retry cannot act twice.
        message.textContent = ((res && res.message) || 'That did not work. Nothing was changed.');
        message.hidden = false; if (!(res && res.retrySafe)) requestId = newRequestId(); else setState('Retry safely', 'warn');
        go.disabled = false; cancel.disabled = false; go.focus();
        if (options.failure) options.failure(res);
      }, function () {
        busy = false; message.textContent = 'That did not work. If you try again it will not act twice.'; message.hidden = false; setState('Retry safely', 'warn'); go.disabled = false; cancel.disabled = false;
      });
    }
    surface.appendChild(h('div.mk-modal-actions', cancel, go));
    if (options.ready) options.ready({ go: go, cancel: cancel, message: message });
    handle = C.ui.present(surface, { anchor: options.anchor || doc.activeElement });
    return handle;
  }

  // The Market settings panel.
  function settingsPanel(ctx) {
    var r = rt(), st = status(), world = r && r.world;
    var panel = h('section.mk-box.mk-simbox', h('div.mk-panel-head', h('h3', { text: 'Simulation' }), ui.chip(stateWord(st), { tone: 'soft' })));
    panel.appendChild(h('p.mk-hint', { text: cfg().help.intro }));
    panel.appendChild(h('p.mk-hint', { text: cfg().help.pause }));
    if (world) {
      var days = Math.floor((world.now - world.epoch) / 86400000) + 1;
      var credits = world.bots.reduce(function (n, b) { return n + b.credits; }, 0);
      panel.appendChild(ui.statGrid([
        { label: 'Day', value: String(days) }, { label: 'Traders', value: String(world.bots.length) },
        { label: 'Trades', value: String(world.stats.trades) }, { label: 'Volume', value: ui.fmt.exact(world.stats.volume) + ' Credits' },
        { label: 'Fees removed', value: ui.fmt.exact(world.stats.burnt) + ' Credits', note: 'The 2% fee leaves the world' }, { label: 'Allowance issued', value: ui.fmt.exact(world.stats.allowance) + ' Credits', note: 'Bounded top-ups for traders' },
        { label: 'Credits held by traders', value: ui.fmt.exact(credits) }, { label: 'Packs opened by traders', value: String(world.stats.packs) }
      ], { cols: 2 }));
    }
    var pause = ui.button(st.paused ? 'Resume' : 'Pause', { icon: st.paused ? 'play' : 'pause', variant: 'secondary', disabled: !world });
    pause.addEventListener('click', function () { if (r.paused) r.resume(); else r.pause(); ui.shell.remount(); });
    var file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, 'aria-label': 'Choose a file' });
    file.addEventListener('change', function () { importFile(file.files && file.files[0], function () { ui.shell.remount(); }); file.value = ''; });
    var reset = ui.button('Reset Local', { icon: 'trash', variant: 'secondary' });
    var armed = false, timer = 0;
    reset.addEventListener('click', function () {
      if (!armed) { armed = true; reset.querySelector('span').textContent = 'Click again to reset'; reset.dataset.variant = 'danger'; timer = root.setTimeout(function () { armed = false; reset.querySelector('span').textContent = 'Reset Local'; reset.dataset.variant = 'secondary'; }, 4000); return; }
      root.clearTimeout(timer); resetWorld(function () { ui.shell.remount(); });
    });
    ctx.scope.add(function () { root.clearTimeout(timer); });
    panel.appendChild(h('div.mk-sim-actions', pause, ui.button('Export', { icon: 'save', variant: 'secondary', disabled: !world, onClick: exportFile }),
      ui.button('Restore from file', { icon: 'upload', variant: 'secondary', onClick: function () { file.click(); } }), file, reset));
    panel.appendChild(h('p.mk-hint', { text: cfg().help.reset }));
    if (r && r.error) panel.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: r.error }));
    if (r && r.recoveredFrom === 'backup') panel.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'Restored from the automatic backup. The unreadable copy was kept.' })));
    return panel;
  }

  ui.sim = { newRequestId: newRequestId, simNow: simNow, countdowns: countdowns, confirm: confirm, live: live, statusChip: statusChip, refresh: refresh, openPanel: openPanel, introCard: introCard, settingsPanel: settingsPanel, exportFile: exportFile, importFile: importFile, resetWorld: resetWorld, stateWord: stateWord, status: status };
})(window.Cardable = window.Cardable || {}, window);
