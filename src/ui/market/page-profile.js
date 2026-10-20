/* Cardable Market — a player's public profile.
 * Read-only and pseudonymous: the generated two-word name, the month they started, counts, and reviews from completed
 * trades with the size of the sample stated. There is nothing here that identifies a person, and nothing to search by. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, store = C.market.store;
  var SAMPLE = { none: 'No reviews yet', small: 'A small sample', fair: 'A fair sample', solid: 'A solid sample' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function mount(ctx) {
    var host = ctx.host, env = ctx.env(), realm = ctx.realm, scope = ctx.scope, alias = ctx.params.alias || '';
    var back = ui.button('Back', { icon: 'back', variant: 'ghost', onClick: function () { ui.shell.back(); } });
    host.appendChild(h('div.mk-pagehead.is-detail', back));
    if (!ui.sim.isGlobal(realm) || !C.market.onlineProvider) {
      host.appendChild(ui.emptyState({ icon: 'user', title: 'Profiles are for real players', body: 'Game traders are software, so they have no profile. Link an account to see player profiles.' }));
      ctx.restoreScroll(); return;
    }
    var social = C.market.onlineProvider.social, body = h('div.mk-profile');
    host.appendChild(body);
    var more = { cursor: null, items: null };

    function paint() {
      ui.clear(body);
      var p = social.profile(alias);
      ctx.title(alias);
      if (p.loading) { body.appendChild(h('p.mk-hint', { text: 'Reading the profile…' })); return; }
      if (p.error || p.offline) {
        var notFound = p.error && p.error.code === 'not-found';
        body.appendChild(ui.emptyState({ kind: 'error', icon: notFound ? 'user' : 'warn', title: notFound ? 'No player has that name' : 'The profile could not be read',
          body: notFound ? 'Names are generated two words, like “Silent Falcon”. Check the spelling.' : 'Try again in a moment. Nothing was changed.',
          actions: [{ label: 'Back to Discover', variant: 'primary', run: function () { ui.shell.goTab('discover'); } }] }));
        return;
      }
      var since = new Date(p.memberSince);
      var head = h('div.mk-pagehead', h('div.mk-pagehead-copy', h('h1', { text: p.alias }),
        h('p', { text: 'A real player in the Market, shown only by this generated name. Here since ' + MONTHS[since.getUTCMonth()] + ' ' + since.getUTCFullYear() + '.' })),
        h('div.mk-pagehead-actions', ui.chip('Player', { tone: 'soft', icon: 'user' }), p.isYou ? ui.chip('This is you', { tone: 'soft' })
          : ui.social.followButton({ kind: 'seller', alias: p.alias }, { size: 'md', onChange: function () { /* the profile reads follower count again */ data().state.profiles[alias.toLowerCase()].at = 0; } })));
      body.appendChild(head);
      body.appendChild(ui.statGrid([
        { label: 'Completed sales', value: String(p.activity.sales) }, { label: 'Purchases', value: String(p.activity.purchases) },
        { label: 'Swaps', value: String(p.activity.swaps) }, { label: 'Open listings', value: String(p.activity.activeListings) }, { label: 'Followers', value: String(p.followers) }
      ], { cols: 5 }));

      var rep = h('section.mk-box', { 'aria-label': 'Reputation' }, h('div.mk-panel-head', h('h3', { text: 'Reputation' }), ui.chip(SAMPLE[p.reputation.sample] || '', { tone: 'soft', title: 'How many reviews this comes from' })));
      rep.appendChild(h('p.mk-rep-score', { 'aria-label': p.reputation.reviews ? p.reputation.average + ' out of 5' : 'No rating yet', text: ui.social.starsLine(p.reputation.average) }));
      rep.appendChild(h('p.mk-hint', { text: p.reputation.note }));
      if (p.reputation.reviews) {
        var bars = h('div.mk-bars', { role: 'list' });
        [5, 4, 3, 2, 1].forEach(function (n) {
          var count = p.reputation.distribution[n] || 0, frac = count / p.reputation.reviews;
          bars.appendChild(h('div.mk-bar', { role: 'listitem', 'aria-label': n + ' stars: ' + count }, h('span', { text: n + ' ★' }), h('i', { style: { '--v': frac } }), h('span.mk-num', { text: String(count) })));
        });
        rep.appendChild(bars);
      }
      rep.appendChild(h('p.mk-hint', icon('info'), h('span', { text: 'Reviews come only from a completed trade between two players, one per trade. Quick Sell and game-trader trades never count.' })));
      body.appendChild(rep);

      // reviews
      var list = more.items || p.reviews;
      var rv = h('section.mk-box', { 'aria-label': 'Reviews' }, h('div.mk-panel-head', h('h3', { text: 'Reviews' })));
      if (!list.length) rv.appendChild(h('p.mk-hint', { text: 'No reviews yet.' }));
      var ul = h('ul.mk-reviews');
      list.forEach(function (r) {
        var li = h('li.mk-review-item', h('div.mk-comment-head', h('span.mk-review-stars', { 'aria-label': r.rating + ' out of 5', text: ui.social.starsLine(r.rating).replace(/ [\d.]+$/, '') }),
          h('span.mk-muted', { text: r.buyer + ' · ' + ui.social.when(r.createdAt) + (r.editedAt ? ' · edited' : '') })));
        if (r.body) li.appendChild(h('p.mk-comment-body', { text: r.body }));
        if (!r.isYou) li.appendChild(h('div.mk-comment-actions', ui.button('Report', { variant: 'ghost', size: 'sm', onClick: function () { ui.social.reportDialog('review', r.id, null, 'this review'); } })));
        ul.appendChild(li);
      });
      rv.appendChild(ul);
      var cursorNow = more.items ? more.cursor : p.reviewsCursor;
      if (cursorNow) rv.appendChild(ui.button('Show more reviews', { variant: 'ghost', size: 'sm', onClick: function () {
        social.profileReviews(alias, cursorNow).then(function (d) {
          more.items = (more.items || p.reviews).concat(d.items);
          more.cursor = d.nextCursor; paint();
        });
      } }));
      body.appendChild(rv);

      // their open listings
      var all = (data().state.listings.items || []).filter(function (l) { return l.seller.alias.toLowerCase() === alias.toLowerCase() && (l.status === 'active' || l.status === 'ending'); });
      var box = h('section.mk-box', { 'aria-label': 'Open listings' }, h('div.mk-panel-head', h('h3', { text: 'Open listings' }), ui.chip(String(all.length), { tone: 'soft' })));
      if (!all.length) box.appendChild(h('p.mk-hint', { text: p.activity.activeListings ? 'Their listings are loading.' : 'Nothing is listed right now.' }));
      else {
        var grid = h('div.mk-grid');
        all.slice(0, 12).forEach(function (l, i) {
          grid.appendChild(ui.listingTile({ listing: l, rank: null }, { cards: env.cards, owned: env.owned, variants: env.variants, thumbs: ctx.thumbs, index: i }));
        });
        box.appendChild(grid);
      }
      body.appendChild(box);
      ui.sim.countdowns(body);
    }
    var data = function () { return C.market.onlineData; };
    paint();
    scope.add(store.subscribe(function (what) { if (what === 'sim') { ui.releaseArt(body, ctx.thumbs); paint(); } }));
    scope.add(function () { ui.releaseArt(body, ctx.thumbs); });
    ctx.restoreScroll();
  }
  ui.pages.register('profile', { nav: function () { return 'discover'; }, title: function (p) { return (p && p.alias) || 'Profile'; }, mount: mount });
})(window.Cardable = window.Cardable || {}, window);
