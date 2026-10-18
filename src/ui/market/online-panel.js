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

  // ---- Quick Sell: the system's disclosed redemption -------------------------------------------------------------------
  // It is the only place Global Credits are created, so the dialog says what it is before it shows a number: not a
  // player, not a market price, a fixed lower offer, limited per day. The server quotes and decides at the moment of sale.
  function quickSellDialog(preselect) {
    var P = C.market.onlineProvider, env = C.market.api.data(), selected = {}, picks = [];
    var inv = P.inventory('global').items.filter(function (i) { return i.state === 'owned'; });
    (preselect || []).forEach(function (id) { selected[id] = true; });
    var intro = h('div.mk-qs-intro',
      h('p.mk-prose', { text: 'The system buys cards at a fixed price, always below what another player would pay. It is not a player, it does not set market prices, and a sale to it never counts as a trade or a price.' }),
      h('p.mk-hint', { text: 'It is the way to get your first Credits on Global Market. A card you sell is retired for good.' }));
    var usage = h('p.mk-hint.mk-qs-usage', { role: 'status', text: '' });
    var search = h('input.mk-input', { type: 'search', placeholder: 'Search your online cards', 'aria-label': 'Search your online cards' });
    var list = h('div.mk-picker.is-compact', { role: 'group', 'aria-label': 'Your online cards' });
    var summary = h('p.mk-swap-summary', { role: 'status', 'aria-live': 'polite' });
    var rows = inv.map(function (i) {
      var q = P.quoteLocal(i), c = C.card(i.cardId), n = c ? ui.identity(c, true) : { name: i.cardId, rarityName: '' };
      return { inst: i, name: n.name, rarity: n.rarityName, finish: i.variantId ? ((env.variantById[i.variantId] || {}).name || '') : 'Normal', quote: q ? q.quote : 0, fair: q ? q.fair : 0 };
    }).sort(function (a, b) { return b.quote - a.quote || (a.name < b.name ? -1 : 1); });
    var handle, go, limit = { credits: Infinity, cards: 50 };
    function chosen() { return rows.filter(function (r) { return selected[r.inst.instanceId]; }); }
    function chosenTotal() { return chosen().reduce(function (n, r) { return n + r.quote; }, 0); }
    function update() {
      picks = chosen();
      var total = picks.reduce(function (n, r) { return n + r.quote; }, 0);
      summary.textContent = picks.length ? picks.length + (picks.length === 1 ? ' card' : ' cards') + ' for about ' + ui.fmt.exact(total) + ' Credits. The server confirms the exact total before anything is sold.' : (rows.length ? 'Choose the cards to sell.' : '');
      if (go) { go.disabled = !picks.length; go.title = picks.length ? '' : 'Choose at least one card.'; }
    }
    function paint() {
      ui.clear(list);
      var q = search.value.trim().toLowerCase(), shown = rows.filter(function (r) { return !q || (r.name + ' ' + r.rarity + ' ' + r.finish).toLowerCase().indexOf(q) >= 0; }).slice(0, 120);
      shown.forEach(function (r) {
        var on = !!selected[r.inst.instanceId];
        var over = !on && r.quote > limit.credits;
        var b = h('button.mk-pick-row', { type: 'button', role: 'checkbox', 'aria-checked': String(on), 'aria-disabled': String(over), data: { instance: r.inst.instanceId, over: over ? 'true' : '' } }, icon(on ? 'check' : 'plus'),
          h('span.mk-pick-name', { text: r.name }), h('span.mk-muted', { text: r.rarity + ' · ' + r.finish }), h('span.mk-mono', { text: r.inst.serial.replace('CBL-', '') }),
          h('span.mk-num', { text: ui.fmt.exact(r.quote) + ' Credits', title: over ? 'More than the system will pay you today.' : 'Quote. Average Value of this card is ' + ui.fmt.exact(r.fair) }));
        if (over) b.style.opacity = '0.55';
        b.addEventListener('click', function () {
          if (selected[r.inst.instanceId]) delete selected[r.inst.instanceId];
          else if (Object.keys(selected).length >= Math.min(50, limit.cards)) C.ui.toast(limit.cards < 50 ? 'The system will buy ' + limit.cards + ' more cards from you today.' : 'One sale holds at most 50 cards.');
          else if (chosenTotal() + r.quote > limit.credits) C.ui.toast('That is more than the system will pay you today. ' + ui.fmt.exact(Math.max(0, limit.credits - chosenTotal())) + ' Credits left; it resets at midnight UTC.');
          else selected[r.inst.instanceId] = true;
          paint(); update();
        });
        list.appendChild(b);
      });
      if (!shown.length) list.appendChild(h('p.mk-hint', { text: rows.length ? 'No card matches that search.' : '' }));
    }
    return modal('Sell to the system', function (surface, h2) {
      handle = h2;
      var body = h('div.mk-online-body.mk-qs');
      surface.appendChild(body);
      body.appendChild(intro);
      if (!rows.length) {
        body.appendChild(ui.emptyState({ kind: 'empty', icon: 'cards', title: 'You have no cards on Global Market', body: 'Credits here come only from selling cards. Convert your collection once to bring copies online.',
          actions: [{ label: 'Convert my collection', variant: 'primary', icon: 'upload', run: function () { handle.close(); importWizard(); } }] }));
        body.appendChild(h('div.mk-modal-actions', ui.button('Close', { variant: 'ghost', onClick: function () { handle.close(); } })));
        return;
      }
      var w = C.market.online.state;
      online().authed('GET', '/v1/wallet').then(function (d) {
        var u = d.usage;
        if (u) {
          usage.textContent = 'Today the system will still buy ' + u.cardsLeft + ' of ' + u.limits.cardsPerDay + ' cards and pay out ' + ui.fmt.exact(u.creditsLeft) + ' of ' + ui.fmt.exact(u.limits.creditsPerDay) + ' Credits for you. It resets at midnight UTC.';
          limit.credits = u.creditsLeft; limit.cards = u.cardsLeft; paint(); update();
        }
      }, function () { /* the server states the limits again at the sale */ });
      void w;
      search.addEventListener('input', paint);
      go = ui.button('Review the sale', { variant: 'primary', icon: 'coin', disabled: true, onClick: function () { review(); } });
      body.append(usage, search, list, summary, h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), go));
      paint(); update();
    });
    function review() {
      var ids = picks.map(function (r) { return r.inst.instanceId; });
      go.disabled = true;
      P.quoteQuickSell(ids).then(function (q) {
        go.disabled = false;
        if (!q.ok) { C.ui.toast(q.message, null, 'error'); return; }
        handle.close();
        var names = picks.slice(0, 3).map(function (r) { return r.name; }).join(', ') + (picks.length > 3 ? ' and ' + (picks.length - 3) + ' more' : '');
        ui.sim.confirm({
          title: 'Sell to the system', eyebrow: 'Not a player sale', anchor: doc.activeElement,
          rows: [{ label: 'Cards', value: names }, { label: 'The system pays', node: ui.credits(q.total), strong: true },
            { label: 'Average Value of these cards', value: ui.fmt.exact(q.items.reduce(function (n, i) { return n + i.fair; }, 0)) + ' Credits' },
            { label: 'Left of today\u2019s limit', value: ui.fmt.exact(q.usage.creditsLeft - q.total) + ' Credits, ' + (q.usage.cardsLeft - q.items.length) + ' cards' }],
          note: q.disclosure + ' The cards are retired for good. This price is checked again at the moment of sale; if it changed you see the new total first.',
          confirmLabel: 'Sell for ' + ui.fmt.exact(q.total), icon: 'coin',
          disabledReason: q.quotaOk ? '' : 'Today\u2019s limit would be exceeded. Choose fewer cards, or come back after midnight UTC.',
          run: function (req) { return P.quickSell('global', { instanceIds: ids, expectTotal: q.total, requestId: req }); },
          success: function (res) { C.ui.toast('Sold ' + res.count + (res.count === 1 ? ' card' : ' cards') + ' for ' + ui.fmt.exact(res.total) + ' Credits'); }
        });
      });
    }
  }

  // The first-visit note for a connected Global Market, in the place the Simulation's note sits.
  function introCard() {
    var card = h('aside.mk-intro.is-global', { role: 'note' },
      h('div', h('strong', { text: 'Global Market is real players.' }),
        h('p', { text: 'Everything here is listed, bid on and bought by people under generated two-word names. It starts nearly empty, prices appear after players trade, and there are no bots.' }),
        h('ul.mk-bullets',
          h('li', { text: 'Your online Credits are separate. The first come from selling cards to the system, limited each day.' }),
          h('li', { text: 'A listed card is held until it sells or you withdraw it. A sale takes a 2% fee from the seller.' }),
          h('li', { text: 'Auctions close on the server\u2019s clock, even while you are away. A late bid adds a few minutes.' }))),
      ui.button('Got it', { variant: 'secondary', onClick: function () { C.market.store.markGuideSeen(); card.remove(); } }));
    return card;
  }

  // ---- the settings panel ---------------------------------------------------------------------------------------
  function settingsPanel(ctx) {
    var panel = h('section.mk-box.mk-onlinebox');
    function paint() {
      ui.clear(panel);
      var s = online().state;
      panel.appendChild(h('div.mk-panel-head', h('h3', { text: 'Global Market (beta)' }), ui.chip(STATE_WORD[s.status] || s.status, { tone: s.status === 'online' ? 'good' : 'soft' })));
      panel.appendChild(h('p.mk-hint', { text: 'Real players only, under anonymous names. Its own Credits and history, separate from Local and your offline save.' }));
      if (s.status === 'unconfigured') { panel.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'This build is not connected to Global, so it stays empty and nothing is sent anywhere.' }))); return; }
      var actions = h('div.mk-sim-actions');
      if (s.status === 'online') {
        panel.appendChild(ui.statGrid([{ label: 'Your public name', value: s.alias || '—' }, { label: 'Online Credits', value: ui.fmt.exact(s.balance || 0) }, { label: 'Online cards', value: String(s.inventoryTotal || 0) },
          { label: 'Collection', value: s.imported ? 'Converted' : 'Not converted' }], { cols: 2 }));
        actions.appendChild(ui.button(s.imported ? 'Conversion receipt' : 'Convert my collection', { variant: s.imported ? 'secondary' : 'primary', icon: 'upload', onClick: function () { importWizard(); } }));
        actions.appendChild(ui.button('Sell to the system', { variant: 'secondary', icon: 'coin', onClick: function () { quickSellDialog(); } }));
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

  ui.online = { quickSellDialog: quickSellDialog, introCard: introCard, settingsPanel: settingsPanel, connectDialog: connectDialog, recoverDialog: recoverDialog, importWizard: importWizard, receiptDialog: receiptDialog };
})(window.Cardable = window.Cardable || {}, window);
