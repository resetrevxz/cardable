/* Cardable Market — optional account linking and recovery. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, doc = root.document;
  var online = function () { return C.market.online; };
  var STATE_WORD = { unconfigured: 'Not available', 'signed-out': 'Not connected', offline: 'Offline', error: 'Unavailable', online: 'Online' };

  function download(text, name, type) {
    var blob = new root.Blob([text], { type: type || 'application/json' }), url = root.URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name }); doc.body.appendChild(a); a.click(); a.remove();
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000);
  }
  function modal(title, build, options) {
    var surface = h('section.mk-modal.mk-online', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    surface.appendChild(h('h2', { text: title }));
    var handle = C.ui.present(surface, { anchor: doc.activeElement, onClose: options && options.onClose });
    build(surface, handle);
    return handle;
  }
  function note(text, cls) { return h('p.' + (cls || 'mk-hint'), { text: text }); }

  // ---- connect ------------------------------------------------------------------------------------------------
  function connectDialog() {
    var s = online().state;
    if (s.status === 'unconfigured') { C.ui.toast('Market is not available in this build.'); return; }
    return modal('Link account', function (surface, handle) {
      var body = h('div.mk-online-body');
      surface.appendChild(body);
      body.appendChild(note('Link a private account to trade with players and sync your collection. Other players see only a generated name. No email is needed.', 'mk-prose'));
      body.appendChild(note('Your collection and Credits are linked once. Save your recovery code so you can return on another device.'));
      var message = h('p.mk-field-error.is-inline', { role: 'alert', hidden: true });
      var go = ui.button('Create a private account', { variant: 'primary', icon: 'user' });
      var recover = ui.button('I have a recovery code', { variant: 'ghost', onClick: function () { handle.close(); recoverDialog(); } });
      body.append(message, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), recover, go));
      go.addEventListener('click', function () {
        go.disabled = true; message.hidden = true;
        online().connect().then(function (r) {
          ui.clear(body);
          body.appendChild(h('p.mk-prose', { text: 'You are connected as ' + r.alias + '.' }));
          if (!r.recoveryCode) {
            body.appendChild(h('p.mk-prose', { text: r.alreadyConnected ? 'This account is already linked.' : 'Your account is linked.' }));
            if (r.syncPending) body.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: r.syncError || 'Collection sync is pending. Retry from Account.' }));
            body.appendChild(ui.button('Done', { variant: 'primary', onClick: function () { handle.close(); } }));
            return;
          }
          if (r.syncPending) body.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: r.syncError || 'Collection sync is pending. Save the recovery code, then retry from Account.' }));
          body.appendChild(h('p.mk-prose', { text: 'Save this recovery code now. It is shown once, and it is the only way back into this account on another device.' }));
          body.appendChild(h('p.mk-recovery.mk-mono', { text: r.recoveryCode, 'aria-label': 'Recovery code ' + r.recoveryCode.split('').join(' ') }));
          var saved = h('input', { type: 'checkbox', id: 'mk-code-saved' });
          var done = ui.button('Done', { variant: 'primary', disabled: true, onClick: function () { handle.close(); } });
          saved.addEventListener('change', function () { done.disabled = !saved.checked; });
          body.appendChild(h('div.mk-modal-actions',
            ui.button('Copy', { variant: 'secondary', icon: 'save', onClick: function () { try { root.navigator.clipboard.writeText(r.recoveryCode).then(function () { C.ui.toast('Recovery code copied'); }); } catch (_) { C.ui.toast('Copy it by hand.'); } } }),
            ui.button('Download', { variant: 'secondary', icon: 'save', onClick: function () { download('Cardable Market recovery code for ' + r.alias + ': ' + r.recoveryCode + '\n', 'cardable-recovery-code.txt', 'text/plain'); } })));
          body.appendChild(h('label.mk-toggle', saved, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'I have saved my recovery code' }))));
          body.appendChild(h('div.mk-modal-actions', done));
        }, function (error) {
          go.disabled = false; message.hidden = false;
          message.textContent = error.code === 'offline' ? 'Could not reach Market. Check your connection; nothing was created.' : error.code === 'rate-limited' ? 'Too many attempts from this network. Try again later.' : error.message;
        });
      });
    });
  }
  function recoverDialog() {
    return modal('Use a recovery code', function (surface, handle) {
      var input = h('input.mk-input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX', 'aria-label': 'Recovery code' });
      var message = h('p.mk-field-error.is-inline', { role: 'alert', hidden: true });
      var restore = h('div.mk-online-body', { hidden: true });
      var confirm = h('input', { type: 'checkbox' });
      var restoreGo = ui.button('Restore last synced state', { variant: 'primary', disabled: true, onClick: function () {
        restoreGo.disabled = true; message.hidden = true;
        C.market.sync.restoreLastSynced().then(function () { handle.close(); C.ui.toast('Last synced collection restored on this device.'); }, function (error) { restoreGo.disabled = !confirm.checked; message.hidden = false; message.textContent = error.message || 'Restore could not finish. Retry to continue the saved restore request.'; });
      } });
      confirm.addEventListener('change', function () { restoreGo.disabled = !confirm.checked; });
      restore.append(h('p.mk-prose', { text: 'If your old device is available, sync there and transfer play first. If it is lost, restore the last synchronized collection and Credits here. Unsynchronized progress on the old device will not merge. Your current collection, unsynced cards and reserved pack are backed up locally and replaced in active play.' }), h('label.mk-toggle', confirm, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'I understand and want to move play to this device' }))), restoreGo);
      var go = ui.button('Reconnect', { variant: 'primary', onClick: function () {
        go.disabled = true; message.hidden = true; restore.hidden = true;
        online().recover(input.value).then(function (r) { handle.close(); C.ui.toast('Reconnected as ' + r.alias); }, function (e) { go.disabled = false; message.hidden = false; message.textContent = e.message || (e.code === 'offline' ? 'Could not reach the Market.' : 'That recovery code was not accepted.'); if (e.code === 'device-mismatch' && online().state.status === 'online') { restore.hidden = false; go.disabled = true; input.disabled = true; } });
      } });
      surface.append(h('p.mk-prose', { text: 'Enter the code you saved when you created the account. It works once per attempt and is never stored here.' }), input, message, restore, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), go));
    });
  }

  function transferDialog() {
    return modal('Transfer play', function (surface, handle) {
      var input = h('input.mk-input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Receiving device code', placeholder: 'Device code from your other device' });
      var message = h('p.mk-field-error.is-inline', { hidden: true, role: 'alert' });
      var go = ui.button('Sync and transfer', { variant: 'primary', onClick: function () {
        go.disabled = true; message.hidden = true;
        C.market.sync.transfer(input.value.trim()).then(function () { handle.close(); C.ui.toast('Play transferred. Use your recovery code on the receiving device.'); }, function (error) { go.disabled = false; message.hidden = false; message.textContent = error.message; });
      } });
      surface.append(h('p.mk-prose', { text: 'Open Market settings on the receiving device and copy its device code below. Your current changes sync before play moves. This device then stops making shared trades.' }), input, message, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), go));
    });
  }

  // Quick Sell shares the game's exact-copy review and durable C.sales settlement.
  function quickSellDialog() {
    if (!C.bulkSellView) { C.ui.toast('Selling is unavailable right now.'); return; }
    ui.shell.close();
    root.setTimeout(function () { C.bulkSellView.show(); }, 0);
  }

  // The first-visit note for a connected Global Market, in the place the Market's note sits.
  function introCard() { return h('span', { hidden: true }); }

  // ---- the settings panel ---------------------------------------------------------------------------------------
  function settingsPanel(ctx) {
    var panel = h('section.mk-box.mk-onlinebox');
    function paint() {
      ui.clear(panel);
      var s = online().state, sync = C.market.sync && C.market.sync.state;
      var linked = s.status === 'online';
      panel.appendChild(h('div.mk-panel-head', h('h3', { text: 'Account' }), ui.chip(linked ? 'Linked' : STATE_WORD[s.status] || s.status, { tone: linked ? 'good' : 'soft' })));
      panel.appendChild(h('p.mk-hint', { text: linked ? 'Linked as ' + (s.alias || 'your private account') + '.' : 'Link an account to trade with players and keep your collection in sync.' }));
      if (sync && sync.error) panel.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: sync.error.message || String(sync.error) }));
      var cancelled = C.state.current.unified && C.state.current.unified.cancelledListings;
      if (cancelled && cancelled.length) panel.appendChild(h('p.mk-hint', { role: 'status', text: cancelled.length + (cancelled.length === 1 ? ' older listing was' : ' older listings were') + ' cancelled because the cards were already sold or are no longer owned. Your migration backup is preserved.' }));
      if (C.market.sync) {
        var ownDevice = sync.deviceId || C.market.sync.deviceId();
        panel.appendChild(h('p.mk-hint', { text: sync.linked ? (sync.pending ? sync.pending + ' saved changes waiting to sync.' : sync.status === 'ready' ? 'Your collection is up to date.' : 'Your saved progress will sync when connected.') : 'Create an account here or reconnect with your recovery code.' }));
        var deviceDetails = h('details.mk-account-device', h('summary', { text: 'Move to another device' }), h('p.mk-hint', { text: 'On your active device, choose Transfer play and enter this device code.' }), h('input.mk-input', { value: ownDevice, readonly: true, 'aria-label': 'This device code' }));
        if (linked && sync.linked && (!sync.activeDeviceId || sync.activeDeviceId === ownDevice)) deviceDetails.appendChild(ui.button('Transfer play', { variant: 'secondary', onClick: transferDialog }));
        panel.appendChild(deviceDetails);
      }
      var actions = h('div.mk-sim-actions');
      if (linked) {
        actions.appendChild(ui.button('Refresh', { variant: 'secondary', icon: 'refresh', onClick: function () { online().connect().catch(function (error) { C.ui.toast(error.message || 'Sync could not finish.', null, 'error'); }); } }));
        actions.appendChild(ui.button('Unlink account', { variant: 'ghost', onClick: function () { online().signOut(); } }));
      } else {
        actions.appendChild(ui.button('Link account', { variant: 'secondary', icon: 'user', disabled: s.status === 'unconfigured', reason: s.status === 'unconfigured' ? 'Account linking is unavailable in this build.' : '', onClick: function () { connectDialog(); } }));
        actions.appendChild(ui.button('Use recovery code', { variant: 'ghost', onClick: function () { recoverDialog(); } }));
      }
      panel.appendChild(actions);
    }
    paint();
    ctx.scope.add(online().subscribe(paint));
    if (C.market.sync && C.market.sync.subscribe) ctx.scope.add(C.market.sync.subscribe(paint));
    return panel;
  }

  ui.online = { quickSellDialog: quickSellDialog, introCard: introCard, settingsPanel: settingsPanel, connectDialog: connectDialog, recoverDialog: recoverDialog };
})(window.Cardable = window.Cardable || {}, window);
