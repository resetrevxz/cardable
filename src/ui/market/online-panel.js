/* Cardable Market — Global Market (beta) account and one-time collection conversion.
 * The online realm is a choice. Nothing here runs until the player presses a button, and nothing here changes the
 * offline game: the conversion reads the collection, asks the server to create separately owned online copies and
 * keeps a receipt. The offline originals stay exactly as they are. */
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
    if (s.status === 'unconfigured') { C.ui.toast('Global Market is not available in this build.'); return; }
    return modal('Connect to Global Market', function (surface, handle) {
      var body = h('div.mk-online-body');
      surface.appendChild(body);
      body.appendChild(note('Global Market has real players only. Your account is private: there is no email, and other players see only a generated two-word name. Your offline game, Credits and collection are not touched, and you can leave at any time.', 'mk-prose'));
      body.appendChild(note('Online Credits are a separate wallet that starts at zero. Cards come online only if you convert your collection, as separate copies, once.'));
      var message = h('p.mk-field-error.is-inline', { role: 'alert', hidden: true });
      var go = ui.button('Create a private account', { variant: 'primary', icon: 'user' });
      var recover = ui.button('I have a recovery code', { variant: 'ghost', onClick: function () { handle.close(); recoverDialog(); } });
      body.append(message, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), recover, go));
      go.addEventListener('click', function () {
        go.disabled = true; message.hidden = true;
        online().connect().then(function (r) {
          ui.clear(body);
          body.appendChild(h('p.mk-prose', { text: 'You are connected as ' + r.alias + '.' }));
          body.appendChild(h('p.mk-prose', { text: 'Save this recovery code now. It is shown once, and it is the only way back into this account on another device.' }));
          body.appendChild(h('p.mk-recovery.mk-mono', { text: r.recoveryCode, 'aria-label': 'Recovery code ' + r.recoveryCode.split('').join(' ') }));
          var saved = h('input', { type: 'checkbox', id: 'mk-code-saved' });
          var done = ui.button('Done', { variant: 'primary', disabled: true, onClick: function () { handle.close(); } });
          saved.addEventListener('change', function () { done.disabled = !saved.checked; });
          body.appendChild(h('div.mk-modal-actions',
            ui.button('Copy', { variant: 'secondary', icon: 'save', onClick: function () { try { root.navigator.clipboard.writeText(r.recoveryCode).then(function () { C.ui.toast('Recovery code copied'); }); } catch (_) { C.ui.toast('Copy it by hand.'); } } }),
            ui.button('Download', { variant: 'secondary', icon: 'save', onClick: function () { download('Cardable Global Market recovery code for ' + r.alias + ': ' + r.recoveryCode + '\n', 'cardable-recovery-code.txt', 'text/plain'); } })));
          body.appendChild(h('label.mk-toggle', saved, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'I have saved my recovery code' }))));
          body.appendChild(h('div.mk-modal-actions', done));
        }, function (error) {
          go.disabled = false; message.hidden = false;
          message.textContent = error.code === 'offline' ? 'Could not reach Global Market. Check your connection; nothing was created.' : error.code === 'rate-limited' ? 'Too many attempts from this network. Try again later.' : error.message;
        });
      });
    });
  }
  function recoverDialog() {
    return modal('Use a recovery code', function (surface, handle) {
      var input = h('input.mk-input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'XXXXX-XXXXX-XXXXX-XXXXX', 'aria-label': 'Recovery code' });
      var message = h('p.mk-field-error.is-inline', { role: 'alert', hidden: true });
      var go = ui.button('Reconnect', { variant: 'primary', onClick: function () {
        go.disabled = true; message.hidden = true;
        online().recover(input.value).then(function (r) { handle.close(); C.ui.toast('Reconnected as ' + r.alias); }, function (e) { go.disabled = false; message.hidden = false; message.textContent = e.code === 'offline' ? 'Could not reach Global Market.' : 'That recovery code was not accepted.'; });
      } });
      surface.append(h('p.mk-prose', { text: 'Enter the code you saved when you created the account. It works once per attempt and is never stored here.' }), input, message, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), go));
    });
  }

  // ---- one-time import ------------------------------------------------------------------------------------------
  function importWizard() {
    var s = online().state;
    if (s.status !== 'online') { C.ui.toast('Connect to Global Market first.'); return; }
    if (s.imported) { receiptDialog(); return; }
    var count = C.state.current.inventory.length;
    return modal('Convert your collection', function (surface, handle) {
      var body = h('div.mk-online-body');
      surface.appendChild(body);
      var step1 = function () {
        ui.clear(body);
        body.appendChild(h('p.mk-prose', { text: 'This creates separately owned online copies of the ' + count.toLocaleString() + ' cards in your collection, once. Your offline cards are not changed, moved or removed, and they stay yours offline.' }));
        body.appendChild(h('ul.mk-bullets', h('li', { text: 'It happens one time per account, and a collection can be converted by one account only.' }),
          h('li', { text: 'The beta checks that each card is a real card from the game with a valid serial, and refuses a collection that holds far more cards than packs opened. It is not anti-cheat: an offline save can be edited, and the beta accepts that.' }),
          h('li', { text: 'Online copies get new ids. Cards you open later offline are not transferable.' })));
        var backed = false, next = ui.button('Review what would convert', { variant: 'primary', disabled: true, onClick: step2 });
        var backup = ui.button('Export a backup of my save', { variant: 'secondary', icon: 'save', onClick: function () { C.saveFiles.export(); backed = true; next.disabled = false; backup.querySelector('span').textContent = 'Backup exported'; } });
        var skip = h('input', { type: 'checkbox' });
        skip.addEventListener('change', function () { next.disabled = !(backed || skip.checked); });
        body.appendChild(h('div.mk-modal-actions', backup));
        body.appendChild(h('label.mk-toggle', skip, h('span.mk-toggle-track', { 'aria-hidden': 'true' }, h('i')), h('span.mk-toggle-copy', h('span', { text: 'I already have a backup of this save' }))));
        body.appendChild(h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), next));
      };
      var step2 = function () {
        ui.clear(body);
        body.appendChild(h('p.mk-hint', { role: 'status', text: 'Checking your collection with the server…' }));
        online().previewImport().then(function (p) {
          ui.clear(body);
          var sum = p.summary;
          body.appendChild(h('p.mk-prose', { text: sum.accepted.toLocaleString() + ' cards can convert' + (sum.rejected ? ', ' + sum.rejected + ' cannot.' : '.') }));
          var list = h('ul.mk-importlist', { 'aria-label': 'Cards that will convert' });
          p.items.slice(0, C.data.marketOnline.previewRows).forEach(function (it) {
            var card = C.card(it.cardId), v = it.variantId && C.variant(it.variantId);
            list.appendChild(h('li', h('span', { text: card ? card.name : it.cardId }), h('span.mk-muted', { text: v ? v.name : 'Normal' }), h('span.mk-mono', { text: it.serial })));
          });
          body.appendChild(list);
          if (p.items.length > C.data.marketOnline.previewRows) body.appendChild(note('…and ' + (p.items.length - C.data.marketOnline.previewRows).toLocaleString() + ' more.'));
          if (p.rejected.length) {
            var d = h('details.mk-analysis', h('summary', h('span', { text: 'Why ' + sum.rejected + ' cannot convert' })));
            p.rejected.slice(0, 20).forEach(function (r) { d.appendChild(h('p.mk-hint', { text: r.serial + ': ' + r.reason.replace(/-/g, ' ') })); });
            body.appendChild(d);
          }
          var commit = ui.button('Convert ' + sum.accepted.toLocaleString() + ' cards', { variant: 'primary', icon: 'check', onClick: function () {
            commit.disabled = true; message.hidden = true;
            online().commitImport(p.previewId).then(function (r) { receiptView(body, handle, r.receipt, r.replayed); }, function (e) {
              commit.disabled = false; message.hidden = false;
              message.textContent = e.code === 'offline' ? 'Lost the connection. Nothing was changed on your account; it is safe to try again.' : e.message + ' Nothing was changed.';
            });
          } });
          var message = h('p.mk-field-error.is-inline', { role: 'alert', hidden: true });
          body.append(message, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), commit));
        }, function (e) {
          ui.clear(body);
          body.appendChild(h('p.mk-field-error.is-inline', { role: 'alert', text: e.code === 'offline' ? 'Could not reach Global Market. Nothing was changed.' : e.message }));
          body.appendChild(h('div.mk-modal-actions', ui.button('Close', { variant: 'primary', onClick: function () { handle.close(); } })));
        });
      };
      step1();
    });
  }
  function receiptView(body, handle, receipt, replayed) {
    ui.clear(body);
    body.appendChild(h('p.mk-prose', { text: (replayed ? 'This collection was already converted. ' : '') + receipt.count.toLocaleString() + ' cards are now yours on Global Market.' }));
    body.appendChild(ui.statGrid([{ label: 'Receipt', value: receipt.id }, { label: 'Converted', value: new Date(receipt.importedAt).toLocaleString() }, { label: 'Not converted', value: String(receipt.rejected) }, { label: 'Public name', value: receipt.alias }], { cols: 2 }));
    body.appendChild(h('div.mk-modal-actions', ui.button('Download receipt', { variant: 'secondary', icon: 'save', onClick: function () { download(JSON.stringify(receipt, null, 2) + '\n', 'cardable-import-receipt.json'); } }),
      ui.button('Done', { variant: 'primary', onClick: function () { handle.close(); } })));
  }
  function receiptDialog() {
    var r = online().receipt();
    return modal('Collection conversion', function (surface, handle) {
      var body = h('div.mk-online-body'); surface.appendChild(body);
      if (r) receiptView(body, handle, r, true);
      else { body.appendChild(h('p.mk-prose', { text: 'This account has already converted a collection.' })); body.appendChild(h('div.mk-modal-actions', ui.button('Close', { variant: 'primary', onClick: function () { handle.close(); } }))); }
    });
  }

  // ---- the settings panel ---------------------------------------------------------------------------------------
  function settingsPanel(ctx) {
    var panel = h('section.mk-box.mk-onlinebox');
    function paint() {
      ui.clear(panel);
      var s = online().state;
      panel.appendChild(h('div.mk-panel-head', h('h3', { text: 'Global Market (beta)' }), ui.chip(STATE_WORD[s.status] || s.status, { tone: s.status === 'online' ? 'good' : 'soft' })));
      panel.appendChild(h('p.mk-hint', { text: 'Real players only, under anonymous two-word names. It has its own Credits and its own history, and it is separate from the Simulation and from your offline save.' }));
      if (s.status === 'unconfigured') { panel.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'This build is not connected to a Global Market service, so the realm stays empty and nothing is sent anywhere.' }))); return; }
      var actions = h('div.mk-sim-actions');
      if (s.status === 'online') {
        panel.appendChild(ui.statGrid([{ label: 'Your public name', value: s.alias || '—' }, { label: 'Online Credits', value: ui.fmt.exact(s.balance || 0) }, { label: 'Online cards', value: String(s.inventoryTotal || 0) },
          { label: 'Collection', value: s.imported ? 'Converted' : 'Not converted' }], { cols: 2 }));
        actions.appendChild(ui.button(s.imported ? 'Conversion receipt' : 'Convert my collection', { variant: s.imported ? 'secondary' : 'primary', icon: 'upload', onClick: function () { importWizard(); } }));
        actions.appendChild(ui.button('Refresh', { variant: 'ghost', onClick: function () { online().refresh(true); } }));
        actions.appendChild(ui.button('Sign out', { variant: 'ghost', onClick: function () { online().signOut(); } }));
      } else if (s.status === 'signed-out') {
        actions.appendChild(ui.button('Connect', { variant: 'primary', icon: 'user', onClick: function () { connectDialog(); } }));
        actions.appendChild(ui.button('Use a recovery code', { variant: 'ghost', onClick: function () { recoverDialog(); } }));
      } else {
        panel.appendChild(h('p.mk-field-error.is-inline', { role: 'status', text: s.error || 'Global Market is not reachable right now. Your offline game is unaffected.' }));
        actions.appendChild(ui.button('Try again', { variant: 'primary', onClick: function () { online().refresh(true); } }));
        if (online().state.alias) actions.appendChild(ui.button('Sign out', { variant: 'ghost', onClick: function () { online().signOut(); } }));
      }
      panel.appendChild(actions);
    }
    paint();
    ctx.scope.add(online().subscribe(paint));
    return panel;
  }

  ui.online = { settingsPanel: settingsPanel, connectDialog: connectDialog, recoverDialog: recoverDialog, importWizard: importWizard, receiptDialog: receiptDialog };
})(window.Cardable = window.Cardable || {}, window);
