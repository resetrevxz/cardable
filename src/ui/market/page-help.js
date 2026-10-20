/* Cardable Market — Help & feedback (Beta 1.0.0).
 * One honest page: what the beta is and is not, the plain-language terms, what the service keeps about a player, how
 * moderation works, whose rights are whose, and how to report a problem. Nothing here touches the network; the report is
 * text the player can copy, and on the desktop app the existing "Report a bug" opens a GitHub issue. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon;

  var SECTIONS = [
    { id: 'start', title: 'Trading cards', items: [
      'Browse cards, place a bid, or pay the buyout to buy a card immediately. Some cards have a Buy price without bidding.',
      'Sell a card from your collection. Set a starting bid and optional buyout, or turn bids off and choose a Buy price.',
      'The Market and Shop use the same Credits and collection. Credits have no cash value.'] },
    { id: 'account', title: 'Your account', items: [
      'Link an account to see player listings and trade with players. Game traders and the Shop are available without linking.',
      'Save your recovery code. It is the way to return to your account on another device.',
      'One gameplay device is active at a time. Sync before transferring play to another device.'] },
    { id: 'offline', title: 'Playing offline', items: [
      'Packs, the Shop, Quick Sell and game traders keep working without a connection. Saved changes sync when you reconnect.',
      'Cards listed with players and Credits held by bids stay reserved until those trades resolve. Player trades need a connection.',
      'Your Studio photos and album stay on your device unless you choose to upload a picture.'] },
    { id: 'privacy', title: 'Your data', items: [
      'Other players see a generated name. Accounts do not require an email or real name.',
      'The service keeps your linked collection, Credits, trade history and anything you choose to publish.',
      'Pictures are stripped of camera and location metadata. Upload only pictures you have permission to share.'] },
    { id: 'terms', title: 'Playing together', items: [
      'Be kind in comments and reviews. Report inappropriate content from its menu.',
      'Completed trades are final. Review the card and price before confirming.',
      'Only upload pictures you took or have permission to share.'] }
  ];

  function section(def) {
    var list = h('ul.mk-help-list');
    def.items.forEach(function (t) { list.appendChild(h('li', { text: t })); });
    return h('section.mk-box.mk-help-section', { id: 'help-' + def.id, 'aria-labelledby': 'help-h-' + def.id }, h('h2', { id: 'help-h-' + def.id, text: def.title }), list);
  }

  // The report carries what a helper needs and nothing that identifies the player. The Global name is added only if asked.
  function report(withName) {
    var o = C.market.online ? C.market.online.state : {}, cfg = C.data.market, lines = [
      'Cardable Market ' + cfg.betaVersion,
      'Game version: ' + C.config.version,
      'Market: combined',
      'Market service: ' + (o.status || 'not available') + (o.mode && o.mode !== 'open' ? ' (' + o.mode + ')' : ''),
      'Service version: ' + (o.server ? o.server.version + ', schema ' + o.server.schema : 'unknown'),
      'Last error: ' + (o.lastError ? o.lastError.code + (o.lastError.trace ? ', id ' + o.lastError.trace : '') : 'none'),
      'Quality: ' + (C.settings && C.settings.get ? C.settings.get('quality') : 'unknown'),
      'Window: ' + root.innerWidth + 'x' + root.innerHeight
    ];
    if (withName && o.alias) lines.push('Player name: ' + o.alias);
    lines.push('', 'What happened:', '', 'What I expected:', '');
    return lines.join('\n');
  }

  function copy(text) {
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) return root.navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    return Promise.resolve(false);
  }

  function mount(ctx) {
    var host = ctx.host, o = C.market.online ? C.market.online.state : {};
    host.appendChild(h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', h('span.mk-h1-icon', icon('info')), h('span', { text: 'Help & feedback' })),
      h('p', { text: 'Buying, selling, accounts and playing offline.' }))));

    var mode = o.status === 'paused' ? 'Player trading is paused for maintenance. Nothing is lost.' : o.mode === 'read-only' ? 'Player trading is read-only for a short while.' : null;
    if (mode) host.appendChild(h('div.mk-banner', { data: { tone: 'info' }, role: 'status' }, icon('info'), h('span', { text: mode + (o.modeMessage ? ' ' + o.modeMessage : '') })));

    var feedback = h('section.mk-box.mk-help-feedback', { 'aria-labelledby': 'help-h-feedback' }, h('h2', { id: 'help-h-feedback', text: 'Report a problem or send feedback' }),
      h('p', { text: 'The report below holds versions and the last error, nothing about your collection. Add what happened and send it with the button for your platform.' }));
    var named = h('input', { type: 'checkbox', id: 'help-named' });
    var preview = h('textarea.mk-input.mk-help-report', { id: 'help-report', rows: '10', readonly: 'true', 'aria-label': 'Report text', spellcheck: 'false' });
    preview.value = report(false);
    named.addEventListener('change', function () { preview.value = report(named.checked); });
    feedback.appendChild(preview);
    feedback.appendChild(h('label.mk-check', named, h('span', { text: 'Include my player name (' + (o.alias || 'not connected') + ')' })));
    var status = h('p.mk-hint', { role: 'status', 'aria-live': 'polite', text: '' });
    var actions = h('div.mk-sim-actions');
    actions.appendChild(ui.button('Copy report', { variant: 'primary', icon: 'save', onClick: function () {
      copy(preview.value).then(function (ok) { status.textContent = ok ? 'Copied. Paste it into your message.' : 'Could not copy. Select the text above and copy it by hand.'; });
    } }));
    if (C.native && C.friendly && C.friendly.reportBug) {
      actions.appendChild(ui.button('Report on GitHub', { variant: 'secondary', icon: 'forward', onClick: function () {
        Promise.resolve(C.friendly.reportBug()).then(function (r) { status.textContent = r && r.state === 'opened' ? 'Opened your browser. Paste the report into the issue.' : 'Could not open the issue page. Copy the report instead.'; },
          function () { status.textContent = 'Could not open the issue page. Copy the report instead.'; });
      } }));
    }
    feedback.appendChild(actions); feedback.appendChild(status);
    host.appendChild(feedback);

    var nav = h('nav.mk-help-nav', { 'aria-label': 'On this page' });
    SECTIONS.forEach(function (def) {
      nav.appendChild(ui.button(def.title, { variant: 'ghost', size: 'sm', onClick: function () { var t = host.querySelector('#help-' + def.id); if (t) t.scrollIntoView({ block: 'start' }); } }));
    });
    host.appendChild(nav);
    SECTIONS.forEach(function (def) { host.appendChild(section(def)); });
    ctx.restoreScroll();
  }

  ui.help = { report: report };
  ui.pages.register('help', { nav: function () { return 'discover'; }, title: function () { return 'Help & feedback'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
