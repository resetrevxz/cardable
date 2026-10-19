/* Cardable Market — Help & feedback (Beta 1.0.0).
 * One honest page: what the beta is and is not, the plain-language terms, what the service keeps about a player, how
 * moderation works, whose rights are whose, and how to report a problem. Nothing here touches the network; the report is
 * text the player can copy, and on the desktop app the existing "Report a bug" opens a GitHub issue. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon;

  var SECTIONS = [
    { id: 'beta', title: 'What this beta is', items: [
      'Players is a beta. Its players are real, but few; it may be empty, and a price appears only after two players complete a sale.',
      'Its Credits and cards are separate from your offline game. Credits have no cash value and cannot be bought, sold or withdrawn.',
      'The beta economy can be reset. If that happens you will be told in advance on this page and in the app, and your offline collection, Credits and photos are never touched.',
      'The Simulation is a local game with bots. Nothing in Players is simulated: no bots, no sample listings, no invented prices.'] },
    { id: 'safe', title: 'Your offline game is safe', items: [
      'Importing your collection is a one-time copy. It reads your save and never changes it.',
      'Your Studio photos and Director album stay on your device. A picture leaves the device only when you choose to upload it for a listing.',
      'If the service is paused or unreachable, Standard, your collection and every offline feature keep working.'] },
    { id: 'terms', title: 'Terms of use (beta)', items: [
      'Be kind. No harassment, hate, threats, sexual content or anything illegal in comments, reviews, names or pictures.',
      'Only upload pictures you took or have the right to share, and never anyone’s face, home, documents or other private detail.',
      'Do not trade Credits or cards for money or goods outside the game, and do not try to exploit the service, automate trading or evade limits.',
      'The operator may hide content, mute a player, block uploads or end an account that breaks these terms. Each such action is recorded.',
      'The beta is provided as it is, without promises about availability, and trades are final once the server completes them.'] },
    { id: 'privacy', title: 'What the service keeps', items: [
      'An anonymous name and a private account created on this device. No email, no real name, no password.',
      'Your Players Credits and cards, listings, bids, offers, orders, trades, comments, reviews, follows and the pictures you upload.',
      'An import keeps the card ids, finishes and serials you chose to convert, so a card can be shown and traded exactly.',
      'Connection addresses are turned into an irreversible code to limit sign-up and request rates; they are not stored on your account.',
      'Nothing is sold, shared for advertising or used for tracking. Pictures are stripped of camera and location data on the server before anyone sees them.'] },
    { id: 'moderation', title: 'Moderation', items: [
      'Report a comment, review or picture from its menu. A report goes to the operator, who can hide it, mute the author or block uploads.',
      'Every operator action is logged with who did it and why. Hiding something never changes a sale, a bid or a balance.',
      'If you think a decision was wrong, send a report below and say which one. Decisions are reviewed by a person.'] },
    { id: 'rights', title: 'Whose is whose', items: [
      'Card artwork, names and the game itself belong to Cardable. Your own pictures remain yours; uploading one lets the service show it on your listing until you delete it.',
      'The game bundles its fonts and libraries; the Players service runs on Cloudflare, which stores and delivers the data described above.'] }
  ];

  function section(def) {
    var list = h('ul.mk-help-list');
    def.items.forEach(function (t) { list.appendChild(h('li', { text: t })); });
    return h('section.mk-box.mk-help-section', { id: 'help-' + def.id, 'aria-labelledby': 'help-h-' + def.id }, h('h2', { id: 'help-h-' + def.id, text: def.title }), list);
  }

  // The report carries what a helper needs and nothing that identifies the player. The Global name is added only if asked.
  function report(withName) {
    var o = C.market.online ? C.market.online.state : {}, cfg = C.data.market, lines = [
      'Cardable Market Beta ' + cfg.betaVersion,
      'Game version: ' + C.config.version,
      'Realm: ' + (C.market.store.session.realm || 'simulation'),
      'Players service: ' + (o.status || 'not available') + (o.mode && o.mode !== 'open' ? ' (' + o.mode + ')' : ''),
      'Service version: ' + (o.server ? o.server.version + ', schema ' + o.server.schema : 'unknown'),
      'Last error: ' + (o.lastError ? o.lastError.code + (o.lastError.trace ? ', id ' + o.lastError.trace : '') : 'none'),
      'Quality: ' + (C.settings && C.settings.get ? C.settings.get('quality') : 'unknown'),
      'Window: ' + root.innerWidth + 'x' + root.innerHeight
    ];
    if (withName && o.alias) lines.push('Players name: ' + o.alias);
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
      h('p', { text: 'Cardable Market Beta ' + C.data.market.betaVersion + '. Plain answers about what this is, what it keeps and how to tell us when something is wrong.' }))));

    var mode = o.status === 'paused' ? 'The Players service is paused for maintenance. Nothing is lost.' : o.mode === 'read-only' ? 'The Players service is read-only for a short while.' : null;
    if (mode) host.appendChild(h('div.mk-banner', { data: { tone: 'info' }, role: 'status' }, icon('info'), h('span', { text: mode + (o.modeMessage ? ' ' + o.modeMessage : '') })));

    var feedback = h('section.mk-box.mk-help-feedback', { 'aria-labelledby': 'help-h-feedback' }, h('h2', { id: 'help-h-feedback', text: 'Report a problem or send feedback' }),
      h('p', { text: 'The report below holds versions and the last error, nothing about your collection. Add what happened and send it with the button for your platform.' }));
    var named = h('input', { type: 'checkbox', id: 'help-named' });
    var preview = h('textarea.mk-input.mk-help-report', { id: 'help-report', rows: '10', readonly: 'true', 'aria-label': 'Report text', spellcheck: 'false' });
    preview.value = report(false);
    named.addEventListener('change', function () { preview.value = report(named.checked); });
    feedback.appendChild(preview);
    feedback.appendChild(h('label.mk-check', named, h('span', { text: 'Include my Players name (' + (o.alias || 'not connected') + ')' })));
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
