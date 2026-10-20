/* Cardable Market — the social surfaces of the Global Market: seller photos, comments, reviews, follows, reports.
 * Everything here is plain text drawn with textContent: nothing a player writes can become markup. It talks to the
 * server only through C.market.onlineProvider.social, and only for the Global Market; the Simulation's traders are
 * software and have no profiles, comments or reviews. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store;
  var social = function () { return C.market.onlineProvider && C.market.onlineProvider.social; };
  var data = function () { return C.market.onlineData; };
  var REASONS = [['spam', 'Spam or advertising'], ['abusive', 'Abusive or harassing'], ['scam', 'Misleading or a scam'], ['unsafe-image', 'Unsafe or inappropriate picture'], ['other', 'Something else']];
  var STARS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  function minutesSince(at) { return Math.max(0, (data().now() - at) / 60000); }
  function when(at) { var m = minutesSince(at); return m < 1 ? 'just now' : ui.fmt.age(m); }
  function errorText(r) { return (r && r.message) || 'That did not work. Nothing was changed.'; }
  function isGlobal(realm) { return ui.sim.isGlobal(realm); }

  // ---- seller photos ---------------------------------------------------------------------------------------------------------
  // A picture is always labelled as the seller's, and never stands where the card is.
  function photoImg(image, variant, alt) {
    var img = h('img.mk-photo-img', { alt: alt || image.alt || 'A photo from the seller', decoding: 'async', draggable: 'false' });
    C.market.media.lazy(img, image.id, variant);
    return img;
  }
  function tilePhoto(l) {
    if (!l.images || !l.images.length || !C.market.media) return null;
    var layout = l.photoCover && l.photoCover.layout || 'banner';
    var wrap = h('div.mk-tile-photo', { data: { layout: layout, treatment: l.treatment || 'none' } });
    wrap.appendChild(photoImg(l.images[0], 'thumb', l.images[0].alt || 'Seller photo for ' + (l.title || 'this listing')));
    wrap.appendChild(h('span.mk-photo-tag', { text: l.images.length > 1 ? 'Seller photos · ' + l.images.length : 'Seller photo' }));
    return wrap;
  }
  function gallery(l) {
    if (!l.images || !l.images.length || !C.market.media) return null;
    var box = h('section.mk-box.mk-gallery', { 'aria-label': 'Seller photos', data: { treatment: l.treatment || 'none' } });
    box.appendChild(h('div.mk-panel-head', h('h3', { text: 'Seller photos' }), ui.chip('From the seller', { tone: 'soft' })));
    var main = h('button.mk-gallery-main', { type: 'button', 'aria-label': 'Open the photo larger', data: { layout: l.photoCover && l.photoCover.layout || 'banner' } });
    var strip = h('div.mk-gallery-strip', { role: 'list' });
    var current = 0;
    function show(n) {
      current = n;
      ui.clear(main);
      main.appendChild(photoImg(l.images[n], 'card'));
      Array.prototype.forEach.call(strip.children, function (c, i) { c.setAttribute('aria-current', String(i === n)); });
    }
    main.addEventListener('click', function () { zoom(l.images[current]); });
    if (l.images.length > 1) {
      l.images.forEach(function (im, n) {
        var b = h('button.mk-gallery-thumb', { type: 'button', role: 'listitem', 'aria-label': 'Photo ' + (n + 1) + ' of ' + l.images.length });
        b.appendChild(photoImg(im, 'thumb', 'Photo ' + (n + 1)));
        b.addEventListener('click', function () { show(n); });
        strip.appendChild(b);
      });
    }
    box.append(main, strip);
    show(0);
    var alt = l.images[0].alt;
    if (alt) box.appendChild(h('p.mk-hint', { text: alt }));
    box.appendChild(h('p.mk-hint', icon('shield'), h('span', { text: 'A seller’s own photo is decoration. It is not proof of the item and never replaces the card shown above, its serial or its price.' })));
    if (!l.isMine && isGlobal('global')) {
      box.appendChild(h('div.mk-linkrow', ui.button('Report this photo', { icon: 'warn', variant: 'ghost', size: 'sm', onClick: function () { reportDialog('upload', l.images[current].id, l.id, 'this photo'); } })));
    }
    return box;
  }
  function zoom(image) {
    var surface = h('section.mk-modal.mk-zoom', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Seller photo' });
    var img = photoImg(image, 'full');
    surface.append(h('div.mk-zoom-frame', img), h('p.mk-hint', { text: image.alt || 'A photo from the seller.' }),
      h('div.mk-modal-actions', ui.button('Close', { variant: 'primary', onClick: function () { handle.close(); } })));
    var handle = C.ui.present(surface, { anchor: root.document.activeElement });
  }

  // ---- reporting ---------------------------------------------------------------------------------------------------------------
  function reportDialog(type, id, listingId, what) {
    var surface = h('section.mk-modal.mk-report', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Report ' + what });
    var sel = h('select.mk-select', { 'aria-label': 'Reason' });
    REASONS.forEach(function (r) { sel.appendChild(h('option', { value: r[0], text: r[1] })); });
    var note = h('textarea.mk-input', { rows: '3', maxlength: '140', placeholder: 'Optional: what should the operator know? (140 characters)', 'aria-label': 'Note for the operator' });
    var msg = h('p.mk-field-error', { role: 'alert', hidden: true });
    var send = ui.button('Send report', { variant: 'primary', onClick: function () {
      send.disabled = true; msg.hidden = true;
      social().report(type, id, sel.value, note.value.trim(), listingId).then(function (r) {
        if (r.ok) { handle.close(); C.ui.toast('Thanks. The operator will take a look.'); return; }
        send.disabled = false; msg.textContent = r.error === 'duplicate' ? 'You already reported this. Thank you.' : errorText(r); msg.hidden = false;
      });
    } });
    surface.append(h('header', ui.eyebrow('Report'), h('h2', { text: 'Report ' + what })),
      h('p', { text: 'Reports go to the person who runs the beta. The player is not told who reported them. Several reports hide a comment until it is looked at.' }),
      h('div.mk-field', h('span.mk-field-label', { text: 'Reason' }), sel), h('div.mk-field', h('span.mk-field-label', { text: 'Note' }), note), msg,
      h('div.mk-modal-actions', ui.button('Cancel', { variant: 'ghost', onClick: function () { handle.close(); } }), send));
    var handle = C.ui.present(surface, { anchor: root.document.activeElement });
  }

  // ---- follow ------------------------------------------------------------------------------------------------------------------
  function followButton(spec, options) {
    options = options || {};
    var on = spec.kind === 'seller' ? social().isFollowingSeller(spec.alias) : social().isFollowingCard(spec.cardId);
    var label = spec.kind === 'seller' ? 'seller' : 'card';
    var b = ui.button(on ? 'Following' : 'Follow', { icon: on ? 'check' : 'plus', variant: on ? 'secondary' : 'ghost', size: options.size || 'sm' });
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('title', on ? 'Stop following this ' + label : 'See this ' + label + '’s new listings in your feed and inbox');
    b.addEventListener('click', function () {
      var now = b.getAttribute('aria-pressed') !== 'true';
      b.disabled = true;
      social().follow(spec, now).then(function (r) {
        b.disabled = false;
        if (!r.ok) { C.ui.toast(errorText(r), null, 'error'); return; }
        b.setAttribute('aria-pressed', String(now)); b.setAttribute('title', now ? 'Stop following this ' + label : 'Follow this ' + label);
        var t = b.querySelector('span'); if (t) t.textContent = now ? 'Following' : 'Follow';
        C.ui.toast(now ? 'Following. New listings appear in your feed.' : 'Not following any more.');
        if (options.onChange) options.onChange(now);
      });
    });
    return b;
  }

  // ---- comments ----------------------------------------------------------------------------------------------------------------
  function commentsPanel(ctx, listing) {
    var scope = ctx.scope, box = h('section.mk-box.mk-comments', { 'aria-label': 'Comments' });
    var open = true, draft = '', replyTo = null, editing = null, busy = false, showAll = false;
    var listEl = h('div.mk-comment-list', { 'aria-live': 'polite' });
    var head = h('div.mk-panel-head');
    var formHost = h('div.mk-comment-form');
    box.append(head, formHost, listEl);

    function settings() { return social().settings(); }
    function muted(alias) { var m = settings().mutedAliases || []; return m.some(function (x) { return x.toLowerCase() === String(alias).toLowerCase(); }); }
    function paint() {
      var d = social().comments(listing.id), s = settings();
      ui.clear(head); ui.clear(listEl);
      head.append(h('h3', { text: 'Comments' }), ui.chip(d.total != null ? String(d.total) : '…', { tone: 'soft', title: 'Comments on this listing' }), ui.chip('Players', { tone: 'soft', icon: 'user', title: 'Written by real players under their anonymous names' }));
      open = d.open !== false;
      if (s.hideComments && !showAll) {
        listEl.appendChild(h('p.mk-hint', { text: 'You chose to hide comments. ' + (d.total || 0) + ' on this listing.' }));
        listEl.appendChild(ui.button('Show comments', { variant: 'secondary', size: 'sm', onClick: function () { showAll = true; paint(); } }));
        buildForm(d); return;
      }
      if (d.loading) { listEl.appendChild(h('p.mk-hint', { text: 'Reading the comments…' })); buildForm(d); return; }
      if (d.error) { listEl.appendChild(h('p.mk-hint', { text: 'The comments could not be read just now. ' }, ui.button('Try again', { variant: 'ghost', size: 'sm', onClick: function () { data().loadComments(listing.id, true); } }))); buildForm(d); return; }
      if (!d.items.length) listEl.appendChild(h('p.mk-hint', { text: open ? 'No comments yet. Ask the seller about the card, or say what you think of the price.' : 'No comments were left on this listing.' }));
      d.items.forEach(function (c) { listEl.appendChild(commentNode(c, d, false)); });
      if (d.nextCursor) listEl.appendChild(ui.button('Show earlier comments', { variant: 'ghost', size: 'sm', onClick: function () { social().moreComments(listing.id).then(paint); } }));
      buildForm(d);
    }
    function commentNode(c, d, isReply) {
      var li = h('article.mk-comment' + (isReply ? '.is-reply' : ''), { data: { status: c.status, id: c.id } });
      if (c.body != null && !c.isYou && muted(c.author)) {
        li.appendChild(h('p.mk-hint', { text: 'A comment from a player you muted. ' }, ui.button('Show', { variant: 'ghost', size: 'sm', onClick: function () { li.replaceWith(commentNode(Object.assign({}, c, { _show: true }), d, isReply)); } })));
        if (!c._show) return li;
      }
      var who = h('span.mk-comment-who');
      var alias = h('button.mk-comment-alias', { type: 'button', text: c.author, title: 'See ' + c.author + '’s profile' });
      alias.addEventListener('click', function () { ui.go('profile', { alias: c.author }); });
      who.appendChild(alias);
      if (c.isSeller) who.appendChild(ui.chip('Seller', { tone: 'soft' }));
      if (c.isYou) who.appendChild(ui.chip('You', { tone: 'soft' }));
      li.appendChild(h('div.mk-comment-head', who, h('span.mk-muted', { text: when(c.createdAt) + (c.editedAt ? ' · edited' : '') })));
      if (editing === c.id) {
        var ta = h('textarea.mk-input', { rows: '3', maxlength: '300', 'aria-label': 'Edit your comment' }); ta.value = c.body || '';
        var err = h('p.mk-field-error', { role: 'alert', hidden: true });
        li.appendChild(ta); li.appendChild(err);
        li.appendChild(h('div.mk-comment-actions', ui.button('Save', { variant: 'primary', size: 'sm', onClick: function () {
          social().editComment(listing.id, c.id, ta.value.trim()).then(function (r) { if (r.ok) { editing = null; paint(); } else { err.textContent = errorText(r); err.hidden = false; } });
        } }), ui.button('Cancel', { variant: 'ghost', size: 'sm', onClick: function () { editing = null; paint(); } })));
        return li;
      }
      if (c.body != null) li.appendChild(h('p.mk-comment-body', { text: c.body }));
      else li.appendChild(h('p.mk-comment-body.is-placeholder', { text: c.placeholder || 'Not available.' }));
      if (c.status === 'held' && c.isYou) li.appendChild(h('p.mk-hint', { text: 'Other players cannot see this while it is reviewed.' }));
      if (c.status === 'seller_hidden' && (c.isYou || listing.isMine)) li.appendChild(h('p.mk-hint', { text: 'Hidden from other players by the seller.' }));
      var acts = h('div.mk-comment-actions');
      if (!isReply && open && c.status !== 'author_removed' && c.status !== 'removed') acts.appendChild(ui.button('Reply', { variant: 'ghost', size: 'sm', onClick: function () { replyTo = c; buildForm(d); var t = formHost.querySelector('textarea'); if (t) t.focus(); } }));
      if (c.canEdit) acts.appendChild(ui.button('Edit', { variant: 'ghost', size: 'sm', onClick: function () { editing = c.id; paint(); } }));
      if (c.canDelete) acts.appendChild(ui.button('Remove', { variant: 'ghost', size: 'sm', onClick: function () { social().removeComment(listing.id, c.id).then(function (r) { if (!r.ok) C.ui.toast(errorText(r), null, 'error'); else paint(); }); } }));
      if (c.canHide) acts.appendChild(ui.button(c.hiddenBySeller ? 'Show' : 'Hide', { variant: 'ghost', size: 'sm', onClick: function () { social().hideComment(listing.id, c.id, !c.hiddenBySeller).then(function (r) { if (!r.ok) C.ui.toast(errorText(r), null, 'error'); else paint(); }); } }));
      if (!c.isYou && c.status !== 'removed' && c.status !== 'author_removed') {
        acts.appendChild(ui.button(c.reported ? 'Reported' : 'Report', { variant: 'ghost', size: 'sm', disabled: !!c.reported, onClick: function () { reportDialog('comment', c.id, listing.id, 'this comment'); } }));
        acts.appendChild(ui.button(muted(c.author) ? 'Unmute' : 'Mute', { variant: 'ghost', size: 'sm', title: 'Hide this player’s comments for you', onClick: function () {
          var cur = (settings().mutedAliases || []).filter(function (x) { return x.toLowerCase() !== c.author.toLowerCase(); });
          if (!muted(c.author)) cur.push(c.author);
          social().saveSettings({ mutedAliases: cur }).then(function () { paint(); });
        } }));
      }
      li.appendChild(acts);
      if (!isReply && c.replies && c.replies.length) {
        var thread = h('div.mk-comment-replies');
        c.replies.forEach(function (r) { thread.appendChild(commentNode(r, d, true)); });
        if (c.replyCount > c.replies.length) thread.appendChild(h('p.mk-hint', { text: (c.replyCount - c.replies.length) + ' more replies not shown.' }));
        li.appendChild(thread);
      }
      return li;
    }
    function buildForm(d) {
      ui.clear(formHost);
      if (!open) { formHost.appendChild(h('p.mk-hint', icon('lock'), h('span', { text: d.closedReason || 'Comments are closed on this listing.' }))); return; }
      if (replyTo) formHost.appendChild(h('p.mk-hint', { text: 'Replying to ' + replyTo.author + '. ' }, ui.button('Cancel', { variant: 'ghost', size: 'sm', onClick: function () { replyTo = null; buildForm(d); } })));
      var ta = h('textarea.mk-input', { rows: '2', maxlength: '300', placeholder: replyTo ? 'Write a reply' : 'Ask a question or leave a comment', 'aria-label': replyTo ? 'Reply' : 'Comment' }); ta.value = draft;
      var count = h('small.mk-hint', { text: draft.length + '/300' });
      var err = h('p.mk-field-error', { role: 'alert', hidden: true });
      ta.addEventListener('input', function () { draft = ta.value; count.textContent = ta.value.length + '/300'; });
      var post = ui.button('Post', { variant: 'primary', size: 'sm', icon: 'check' });
      post.addEventListener('click', function () {
        var text = ta.value.trim();
        if (!text || busy) return;
        busy = true; post.disabled = true; err.hidden = true;
        social().postComment(listing.id, text, replyTo ? replyTo.id : null).then(function (r) {
          busy = false;
          if (r.ok) { draft = ''; replyTo = null; paint(); C.ui.toast('Posted.'); return; }
          post.disabled = false; err.textContent = errorText(r); err.hidden = false;
        });
      });
      formHost.append(ta, h('div.mk-comment-foot', count, post), err,
        h('p.mk-hint', { text: 'Plain text only: no links, contact details or markup. Be kind. Everyone sees your anonymous name.' }));
    }
    paint();
    scope.add(store.subscribe(function (what) { if (what === 'sim' && !editing && !busy) paint(); }));
    return box;
  }

  // ---- reviews -------------------------------------------------------------------------------------------------------------------
  function reviewDialog(due, onDone) {
    var surface = h('section.mk-modal.mk-review-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Rate ' + due.seller });
    var rating = 0, stars = h('div.mk-stars', { role: 'radiogroup', 'aria-label': 'Rating out of 5' });
    var label = h('span.mk-muted', { text: 'Choose a rating' });
    function paintStars() {
      ui.clear(stars);
      for (var n = 1; n <= 5; n++) (function (v) {
        var b = h('button.mk-star' + (v <= rating ? '.is-on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(v === rating), 'aria-label': v + ' out of 5, ' + STARS[v], text: v <= rating ? '★' : '☆' });
        b.addEventListener('click', function () { rating = v; label.textContent = v + ' of 5 · ' + STARS[v]; paintStars(); send.disabled = false; });
        stars.appendChild(b);
      })(n);
    }
    var note = h('textarea.mk-input', { rows: '3', maxlength: '200', placeholder: 'Optional: how did it go? Plain text, 200 characters.', 'aria-label': 'Your review' });
    var msg = h('p.mk-field-error', { role: 'alert', hidden: true });
    var send = ui.button('Leave review', { variant: 'primary', disabled: true, onClick: function () {
      send.disabled = true; msg.hidden = true;
      social().postReview(due.tradeId, rating, note.value.trim()).then(function (r) {
        if (r.ok) { handle.close(); C.ui.toast('Thanks. Your review is on ' + due.seller + '’s profile.'); if (onDone) onDone(); return; }
        send.disabled = false; msg.textContent = errorText(r); msg.hidden = false;
      });
    } });
    paintStars();
    surface.append(h('header', ui.eyebrow('Completed trade'), h('h2', { text: 'Rate ' + due.seller })),
      h('p', { text: 'One review per trade, only after it completed. It appears on their profile under your anonymous name and can be changed once within a day.' }),
      stars, label, h('div.mk-field', h('span.mk-field-label', { text: 'Review' }), note), msg,
      h('div.mk-modal-actions', ui.button('Not now', { variant: 'ghost', onClick: function () { handle.close(); } }), send));
    var handle = C.ui.present(surface, { anchor: root.document.activeElement });
  }

  function starsLine(avg) {
    if (avg == null) return 'No rating yet';
    var full = Math.round(avg), out = '';
    for (var i = 1; i <= 5; i++) out += i <= full ? '★' : '☆';
    return out + ' ' + avg.toFixed(1);
  }

  // ---- share a reference ---------------------------------------------------------------------------------------------------------
  // A listing reference is plain text, "Market listing lst_…". It is only ever understood by pasting it back into
  // the Market's search; it is not a link and registers no protocol handler.
  var REF = /(lst_[A-Za-z0-9_-]{6,40})/;
  function refOf(id) { return 'Market listing ' + id; }
  function copyRef(id) {
    var text = refOf(id);
    function done() { C.ui.toast('Reference copied. Paste it into Market search to open this listing.'); }
    try {
      if (root.navigator.clipboard && root.navigator.clipboard.writeText) { root.navigator.clipboard.writeText(text).then(done, function () { C.ui.toast(text); }); return; }
    } catch (_) { /* fall through */ }
    C.ui.toast(text);
  }
  function parseRef(text) { var m = REF.exec(String(text || '')); return m ? m[1] : null; }


  // ---- the player's own social choices, pictures and follows (Market settings) ---------------------------------------------------
  function bytesText(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function settingsPanel(ctx) {
    var box = h('section.mk-box.mk-social-settings', { 'aria-label': 'Social and pictures' }), scope = ctx.scope;
    function paint() {
      ui.clear(box);
      box.appendChild(h('div.mk-panel-head', h('h3', { text: 'Social and pictures' }), ui.chip('Players', { tone: 'soft', icon: 'user' })));
      if (!C.market.onlineProvider || !C.market.online || C.market.online.state.status !== 'online') {
        box.appendChild(h('p.mk-hint', { text: 'Link an account to choose what you are told about, and to see the pictures you have uploaded.' }));
        return;
      }
      var s = social().settings();
      function toggle(key, label, help, def) {
        var on = s[key] == null ? def : !!s[key];
        var input = h('input', { type: 'checkbox', role: 'switch', 'aria-label': label, props: { checked: on } });
        input.addEventListener('change', function () { var patch = {}; patch[key] = input.checked; social().saveSettings(patch).then(function (r) { if (!r.ok) { input.checked = !input.checked; C.ui.toast(errorText(r), null, 'error'); } }); });
        return h('div.mk-setting', h('div.mk-setting-copy', h('span.mk-setting-label', { text: label }), h('span.mk-hint', { text: help })), h('label.mk-switch', input, h('span.mk-switch-track', { 'aria-hidden': 'true' }, h('i'))));
      }
      box.appendChild(toggle('notifySocial', 'Comments, replies and reviews', 'Tell me when someone comments on my listing, replies to me or rates a trade.', true));
      box.appendChild(toggle('notifyFollows', 'New listings from who I follow', 'Tell me when a seller or a card I follow gets a new listing.', true));
      box.appendChild(toggle('hideComments', 'Hide comments on listings', 'Comment threads start collapsed. You can still open them one listing at a time.', false));
      var muted = s.mutedAliases || [];
      box.appendChild(h('p.mk-hint', { text: muted.length ? 'Muted players: ' + muted.join(', ') + '. You will not see their comments.' : 'You have not muted anyone. Mute a player from one of their comments.' }));
      if (muted.length) box.appendChild(ui.button('Unmute everyone', { variant: 'ghost', size: 'sm', onClick: function () { social().saveSettings({ mutedAliases: [] }).then(paint); } }));
      box.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'There is no push channel in the beta: what you are told waits in your Activity inbox until you open the game.' })));

      // pictures
      var up = social().uploads();
      var pics = h('div.mk-subsection', h('h4', { text: 'Your uploaded pictures' }));
      if (up.loading) pics.appendChild(h('p.mk-hint', { text: 'Reading your pictures…' }));
      else {
        var u = up.usage;
        if (u) pics.appendChild(h('p.mk-hint', { text: u.count + ' of ' + u.maxCount + ' pictures · ' + bytesText(u.bytes) + ' of ' + bytesText(u.maxBytes) + ' · ' + u.startedToday + ' of ' + u.maxPerDay + ' uploads started today.' }));
        if (!up.items.length) pics.appendChild(h('p.mk-hint', { text: 'No pictures yet. Add one when you list a card. Your Director album is never uploaded unless you choose a photo.' }));
        var ul = h('ul.mk-pictures');
        up.items.forEach(function (p) {
          var li = h('li.mk-picture', { data: { status: p.status } });
          var thumb = h('div.mk-picture-thumb'); if (p.status !== 'pending') thumb.appendChild(photoImg({ id: p.id, alt: p.alt }, 'thumb', 'Your uploaded picture'));
          var state = p.status === 'attached' ? 'On ' + (p.listingStatus === 'active' ? 'an open listing' : 'a listing that ended') : p.status === 'ready' ? (p.expired ? 'Expired, will be cleared' : 'Ready, not on a listing') : 'Unfinished';
          li.append(thumb, h('div.mk-picture-copy', h('strong', { text: state }), h('span.mk-muted', { text: bytesText(p.bytes) + ' · ' + (p.source === 'director' ? 'From the Director album' : 'From a file') })));
          var inUse = p.status === 'attached' && p.listingStatus === 'active';
          li.appendChild(ui.button('Remove', { variant: 'ghost', size: 'sm', disabled: inUse, title: inUse ? 'It is on an open listing. Change or withdraw the listing first.' : 'Delete this picture from Market', onClick: function () {
            social().deleteUpload(p.id).then(function (r) { if (!r.ok) C.ui.toast(errorText(r), null, 'error'); else C.ui.toast('Picture removed from Market. Your original is untouched.'); paint(); });
          } }));
          ul.appendChild(li);
        });
        pics.appendChild(ul);
        pics.appendChild(h('p.mk-hint', { text: 'Removing a picture here deletes only the copy on Market. The original file and your Director album are never changed.' }));
      }
      box.appendChild(pics);

      // follows
      var f = social().follows();
      var fol = h('div.mk-subsection', h('h4', { text: 'Following' }));
      if (!f.sellers.length && !f.cards.length) fol.appendChild(h('p.mk-hint', { text: 'Follow a seller from their profile, or a card from its market, to see their new listings in your feed.' }));
      f.sellers.forEach(function (x) {
        fol.appendChild(h('div.mk-linkrow', ui.button(x.alias, { icon: 'user', variant: 'ghost', size: 'sm', onClick: function () { ui.go('profile', { alias: x.alias }); } }),
          ui.button('Unfollow', { variant: 'ghost', size: 'sm', onClick: function () { social().follow({ kind: 'seller', alias: x.alias }, false).then(paint); } })));
      });
      f.cards.forEach(function (x) {
        var c = ctx.env().cards[x.cardId];
        fol.appendChild(h('div.mk-linkrow', ui.button(c ? c.name : x.cardId, { icon: 'cards', variant: 'ghost', size: 'sm', onClick: function () { ui.go('card', { id: x.cardId, variant: '' }); } }),
          ui.button('Unfollow', { variant: 'ghost', size: 'sm', onClick: function () { social().follow({ kind: 'card', cardId: x.cardId }, false).then(paint); } })));
      });
      box.appendChild(fol);
    }
    paint();
    scope.add(store.subscribe(function (what) { if (what === 'sim') paint(); }));
    return box;
  }

  // Completed trades the player has not rated yet.
  function reviewsDueBox(ctx) {
    if (!C.market.onlineProvider || !C.market.online || C.market.online.state.status !== 'online') return null;
    var box = h('section.mk-box.mk-reviews-due', { 'aria-label': 'Waiting for your review' });
    function paint() {
      ui.clear(box);
      var d = social().reviewsDue();
      if (d.loading || !d.items.length) { box.hidden = true; return; }
      box.hidden = false;
      box.appendChild(h('div.mk-panel-head', h('h3', { text: 'Rate your trades' }), ui.chip(String(d.items.length), { tone: 'soft' })));
      d.items.slice(0, 5).forEach(function (t) {
        var card = ctx.env().cards[t.cardId];
        box.appendChild(h('div.mk-linkrow', h('span', { text: (card ? card.name : 'A card') + (t.count > 1 ? ' and ' + (t.count - 1) + ' more' : '') + ' from ' + t.seller }),
          h('span.mk-muted', { text: when(t.at) }), ui.button('Rate', { variant: 'secondary', size: 'sm', onClick: function () { reviewDialog(t, paint); } })));
      });
      box.appendChild(h('p.mk-hint', { text: 'Reviews are how players earn a reputation. You can rate a completed trade for 30 days.' }));
    }
    paint();
    ctx.scope.add(store.subscribe(function (what) { if (what === 'sim') paint(); }));
    return box;
  }

  // The community feed: new and sold listings from real players, optionally only from who the player follows.
  function feedSection(ctx) {
    var scope = ctx.scope, env = ctx.env(), mode = 'all';
    var sec = h('section.mk-section.mk-feed', { 'aria-label': 'Community feed' });
    var body = h('div.mk-feed-body');
    var tabs = ui.segmented({ label: 'Community feed', value: mode, onChange: function (v) { mode = v; paint(); },
      options: [{ value: 'all', label: 'Everyone' }, { value: 'following', label: 'Following' }] });
    sec.appendChild(h('div.mk-section-head', h('h2', { text: 'Community' }), tabs));
    sec.appendChild(body);
    function paint() {
      ui.releaseArt(body, ctx.thumbs); ui.clear(body);
      var d = social().feed(mode);
      if (d.loading) { body.appendChild(h('p.mk-hint', { text: 'Reading the feed…' })); return; }
      if (!d.items.length) { body.appendChild(h('p.mk-hint', { text: mode === 'following' ? 'Nothing yet. Follow a seller or a card and their new listings appear here.' : 'Nothing has been listed yet. When players list or sell cards they show up here.' })); return; }
      var list = h('ul.mk-feed-list');
      d.items.slice(0, 12).forEach(function (l, i) {
        var card = env.cards[l.card.cardId]; if (!card) return;
        var idn = ui.identity(card, !!env.owned[card.id]);
        var item = h('li.mk-feed-item', { data: { event: l.event } });
        var photo = ui.social.tilePhoto(l);
        var open = h('button.mk-feed-open', { type: 'button' }, h('strong', { text: l.title || idn.name }),
          h('span', { text: idn.rarityName + ' · ' + (l.card.variantId ? (env.variants[l.card.variantId] || {}).name : 'Normal') + ' · ' + l.card.serial.replace('CBL-', '') }));
        open.addEventListener('click', function () { ui.go('listing', { id: l.id }); });
        var line = l.event === 'sold' ? 'Sold for ' + ui.fmt.exact(l.soldFor || 0) + ' Credits' : (l.format === 'swap' ? 'Listed for swapping' : 'Listed at ' + ui.fmt.exact(l.format === 'auction' ? l.auction.current : l.ask) + ' Credits');
        var alias = h('button.mk-comment-alias', { type: 'button', text: l.seller.alias }); alias.addEventListener('click', function () { ui.go('profile', { alias: l.seller.alias }); });
        item.append(photo || h('span.mk-feed-icon', icon(l.event === 'sold' ? 'check' : 'tag')), open, h('span.mk-muted', { text: line }), alias, h('span.mk-muted', { text: ui.fmt.age(l.eventMin) }));
        void i;
        list.appendChild(item);
      });
      body.appendChild(list);
    }
    paint();
    scope.add(store.subscribe(function (what) { if (what === 'sim') paint(); }));
    scope.add(function () { ui.releaseArt(body, ctx.thumbs); });
    return sec;
  }

  ui.social = { tilePhoto: tilePhoto, gallery: gallery, commentsPanel: commentsPanel, followButton: followButton, reportDialog: reportDialog, reviewDialog: reviewDialog,
    starsLine: starsLine, settingsPanel: settingsPanel, reviewsDueBox: reviewsDueBox, feedSection: feedSection, copyRef: copyRef, parseRef: parseRef, refOf: refOf, photoImg: photoImg, when: when };
})(window.Cardable = window.Cardable || {}, window);
