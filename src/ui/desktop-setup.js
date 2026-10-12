(function (C, root) {
  'use strict';
  var stage = root.document.getElementById('cardable-startup'), ready = false, loading = !!stage, fill = stage && stage.querySelector('.cb-startup-fill');
  var waiting = [], stageCaps = [0.2, 0.46, 0.72, 0.94], stageAt = 0, calls = 0, shown = 0, finishing = false, last = 0, visibleAt = 0, started = root.performance.now(), capAt = started, frame = 0, blockedAt = -9999;
  // A bare bar: the shown value eases toward a goal that rises with each stage and drifts forward inside it, so it never looks stuck.
  function paint(now) {
    frame = 0;
    var dt = Math.min(64, now - (last || now)), reduce = !!(C.motion && C.motion.reduced); last = now;
    if (!stage) return;
    if (!visibleAt && now - started > 140) { visibleAt = now; stage.classList.add('is-visible'); }
    var lo = stageCaps[stageAt], hi = stageCaps[stageAt + 1], goal = finishing ? 1 : lo + (hi - lo) * 0.86 * (1 - Math.exp(-(now - capAt) / 2200)),
      ease = reduce ? 1 : 1 - Math.exp(-dt / (finishing ? 120 : 190));
    shown += (goal - shown) * ease;
    if (goal - shown < (finishing ? 0.012 : 0.0008)) shown = goal;
    fill.style.transform = 'scaleX(' + shown.toFixed(4) + ')';
    stage.setAttribute('aria-valuenow', String(Math.round(shown * 100)));
    if (finishing && shown >= 1) { close(now); return; }
    frame = root.requestAnimationFrame(paint);
  }
  function close(now) {
    // Once the bar has been seen it stays long enough to read as a finished bar, then leaves.
    var wait = visibleAt ? Math.max(0, 420 - (now - visibleAt)) : 0;
    root.setTimeout(function () {
      var done = function () {
        if (stage) { stage.remove(); stage = null; }
        loading = false; ready = true; root.document.body.classList.remove('is-booting');
        if (C.events && C.events.emit) C.events.emit('setup:ready');
        waiting.splice(0).forEach(function (fn) { try { fn(); } catch (_) {} });
      };
      if (!visibleAt) { done(); return; }
      stage.classList.add('is-done'); root.setTimeout(done, 280);
    }, wait);
  }
  function begin() { if (stage && !frame) frame = root.requestAnimationFrame(paint); }
  C.setup = {
    get loading() { return loading; },
    afterLoad: function (fn) { if (loading) waiting.push(fn); else fn(); },
    // Said when something is tried before the game has loaded; the inventory uses it. Once per moment, with a lock, not a check.
    blocked: function (what) {
      var at = root.performance.now(); if (at - blockedAt < 1800) return; blockedAt = at;
      var text = what === 'inventory' ? 'Inventory is blocked until Cardable finishes loading.' : 'Cardable is still loading.';
      if (C.ui && C.ui.toast) C.ui.toast(text, null, 'info', { icon: C.icons.create('lock'), duration: 2400 });
      else if (C.qol && C.qol.toast) C.qol.toast(text);
    },
    preview: function () {
      var panel = C.ui.create('panel', {className:'cb-startup-panel'}), node = C.packMarkup.node;
      node('div', 'cb-startup-mark', panel).setAttribute('aria-hidden', 'true');
      node('span', 'cb-setup-eyebrow', panel, 'CARDABLE');
      node('h2', '', panel, 'Getting Cardable ready');
      node('p', 'cb-small', panel, 'Checking your saved collection…');
      var track = node('div', 'cb-startup', panel); track.style.cssText = 'position:static;margin:0;width:100%;opacity:1'; node('i', 'cb-startup-fill', track).style.transform = 'scaleX(.4)';
      return panel;
    },
    status: function (text) {
      if (!stage) return;
      stage.setAttribute('aria-valuetext', text);
      if (calls > 0) stageAt = Math.min(stageAt + 1, stageCaps.length - 2); calls += 1; capAt = root.performance.now(); begin();
    },
    finish: function () {
      if (!stage) { loading = false; ready = true; root.document.body.classList.remove('is-booting'); return; }
      if (finishing) return;
      // The bar completes once fonts and the first frame are in, so the screen is ready when it leaves.
      var fonts = root.document.fonts && root.document.fonts.ready ? Promise.race([root.document.fonts.ready, new Promise(function (r) { root.setTimeout(r, 1500); })]) : Promise.resolve();
      fonts.then(function () { return new Promise(function (r) { root.requestAnimationFrame(function () { root.requestAnimationFrame(r); }); }); }).then(function () { finishing = true; begin(); });
    },
    welcome: function () {
      var info = C.desktop && C.desktop.info;
      if (loading) { C.setup.afterLoad(function () { C.setup.welcome(); }); return; }
      if (!ready || !info || C.bootFailure || C.state.recovery && C.state.recovery.pending) return;
      var seen; try { seen = root.localStorage.getItem('cardable.desktop.welcome') || root.localStorage.getItem('cardable.qol.welcomeSeen'); } catch (_) { return; }
      if (seen) return;
      var node = C.packMarkup.node, dialog = C.ui.create('dialog', {label: 'Cardable is ready', className: 'cb-setup-welcome'});
      node('span', 'cb-setup-eyebrow', dialog, 'WELCOME TO YOUR COLLECTION');
      node('h2', '', dialog, 'Cardable is ready');
      node('p', 'cb-small', dialog, 'The game is ready for offline play. Keep its files together in this folder.');
      node('p', 'cb-setup-path', dialog, info.installDirectory);
      node('p', 'cb-small', dialog, 'Your cards and settings save in your Windows profile. Settings → Data has export and recovery tools. Studio photos need their own download.');
      node('p', 'cb-small', dialog, info.installed ? 'Updates download in the background. When one is ready, Cardable offers a restart and waits until you finish playing. Choose Later to keep this session open.' : 'This folder build stays offline. Run the installer for guided setup and background updates.');
      var presentation, actions = node('div', 'cb-setup-actions', dialog);
      actions.appendChild(C.ui.create('button', {label: 'Open saves folder', onClick: function () { C.desktop.openSaveDirectory().then(function(ok){if(!ok)C.qol.toast('Could not open the saves folder. Try Settings → About.');}).catch(function(){C.qol.toast('Could not open the saves folder. Try Settings → About.');}); }}));
      actions.appendChild(C.ui.create('button', {label: 'Start collecting', variant: 'primary', onClick: function () { presentation.close(); }}));
      presentation = C.ui.present(dialog, {onClose: function () { try { root.localStorage.setItem('cardable.desktop.welcome', '1'); root.localStorage.setItem('cardable.qol.welcomeSeen','1'); } catch (_) {} }});
    }
  };
  begin();
})(window.Cardable, window);
