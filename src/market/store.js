/* Cardable Market — session store and preview preferences.
 * The store owns UI state (realm, route stack, filters, scroll memory) and a small preview record in its own
 * localStorage key. It never writes the Cardable save: watchlist, saved views, alerts and drafts are preview data
 * that Stage 6 replaces with real, realm-scoped records. Every storage access is wrapped; the market must render
 * correctly when storage is unavailable.
 */
(function (C, root) {
  'use strict';
  C.market = C.market || {};
  var K = function () { return C.market.core; };
  var listeners = new Set();
  var KEY = function () { return C.data.market.previewStorageKey; };

  function defaults() {
    return { v: 1, watch: [], saved: [], alerts: [], drafts: {}, recentSearches: [], guideSeen: false, notificationsRead: [], groups: [], sortPresets: [], compare: [] };
  }
  var prefs = defaults(), stored = true;
  function load() {
    try {
      var raw = root.localStorage.getItem(KEY());
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1) return;
      var base = defaults();
      ['watch', 'saved', 'alerts', 'recentSearches', 'notificationsRead', 'groups', 'sortPresets', 'compare'].forEach(function (k) { if (Array.isArray(parsed[k])) base[k] = parsed[k].slice(0, 200); });
      if (parsed.drafts && typeof parsed.drafts === 'object') base.drafts = parsed.drafts;
      base.guideSeen = parsed.guideSeen === true;
      prefs = base;
    } catch (_) { stored = false; }
  }
  function persist() {
    try { root.localStorage.setItem(KEY(), JSON.stringify(prefs)); stored = true; } catch (_) { stored = false; }
  }
  function emit(what) { listeners.forEach(function (fn) { try { fn(what); } catch (e) { console.error(e); } }); }

  var session = {
    realm: 'simulation', tab: 'for-you', sort: 'recommended', filters: null, view: null, advanced: null,
    showGlobalSample: false, filtersOpen: true, scroll: {}, stack: [], lastRoute: null, paneTop: 0
  };
  function resetFilters() { session.filters = K().emptyFilters(); }

  var store = {
    get prefs() { return prefs; },
    get session() { return session; },
    get persistent() { return stored; },
    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
    emit: emit,
    init: function () {
      load();
      resetFilters();
      var realm = C.settings && C.settings.get('marketRealm');
      session.realm = realm === 'global' ? 'global' : 'simulation';
    },
    setRealm: function (id) {
      if (id !== 'simulation' && id !== 'global') return;
      if (session.realm === id) return;
      session.realm = id; session.scroll = {};
      emit('realm');
    },
    // ---- watchlist ----
    isWatching: function (id) { return prefs.watch.indexOf(id) >= 0; },
    watching: function () { var m = {}; prefs.watch.forEach(function (id) { m[id] = true; }); return m; },
    toggleWatch: function (id) {
      var at = prefs.watch.indexOf(id), added = at < 0;
      if (added) prefs.watch.unshift(id); else prefs.watch.splice(at, 1);
      persist(); emit('watch');
      return added;
    },
    // ---- saved views ----
    saveView: function (name, state) {
      name = String(name || '').trim().slice(0, 40) || 'Saved view';
      var item = { id: 'v' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: name, q: state.q || '', sort: state.sort, tab: state.tab, filters: state.filters, realm: state.realm || null };
      prefs.saved.unshift(item); prefs.saved = prefs.saved.slice(0, 24);
      persist(); emit('saved');
      return item;
    },
    removeView: function (id) { prefs.saved = prefs.saved.filter(function (v) { return v.id !== id; }); persist(); emit('saved'); },
    // ---- alerts (evaluated against sample listings inside the market only) ----
    addAlert: function (alert) {
      var item = Object.assign({ id: 'a' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), kind: 'below', created: Date.now() }, alert);
      prefs.alerts.unshift(item); prefs.alerts = prefs.alerts.slice(0, 40);
      persist(); emit('alerts');
      return item;
    },
    removeAlert: function (id) { prefs.alerts = prefs.alerts.filter(function (a) { return a.id !== id; }); persist(); emit('alerts'); },
    // ---- saved portfolio groups, per realm ----
    addGroup: function (realm, name, ids) {
      var g = { id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), realm: realm, name: String(name || '').trim().slice(0, 40) || 'Group', ids: ids.slice(0, 200), created: Date.now() };
      prefs.groups.unshift(g); prefs.groups = prefs.groups.slice(0, 24); persist(); emit('groups');
      return g;
    },
    removeGroup: function (id) { prefs.groups = prefs.groups.filter(function (g) { return g.id !== id; }); persist(); emit('groups'); },
    groupsFor: function (realm) { return prefs.groups.filter(function (g) { return g.realm === realm; }); },
    // ---- named sort presets (a sort and a tab, per realm) ----
    addSortPreset: function (realm, name, sort, tab) {
      var p = { id: 'p' + Date.now().toString(36), realm: realm, name: String(name || '').trim().slice(0, 30) || 'Preset', sort: sort, tab: tab };
      prefs.sortPresets.unshift(p); prefs.sortPresets = prefs.sortPresets.slice(0, 12); persist(); emit('presets');
      return p;
    },
    removeSortPreset: function (id) { prefs.sortPresets = prefs.sortPresets.filter(function (p) { return p.id !== id; }); persist(); emit('presets'); },
    // ---- compare tray (two to four exact listings or cards) ----
    compareList: function () { return prefs.compare.slice(); },
    toggleCompare: function (item) {
      var at = prefs.compare.findIndex(function (x) { return x.key === item.key; });
      if (at >= 0) prefs.compare.splice(at, 1);
      else { if (prefs.compare.length >= 4) return false; prefs.compare.push(item); }
      persist(); emit('compare');
      return at < 0;
    },
    clearCompare: function () { prefs.compare = []; persist(); emit('compare'); },
    // ---- drafts ----
    saveDraft: function (key, draft) { prefs.drafts[key] = { savedAt: Date.now(), draft: draft }; persist(); emit('drafts'); },
    getDraft: function (key) { return prefs.drafts[key] || null; },
    clearDraft: function (key) { delete prefs.drafts[key]; persist(); emit('drafts'); },
    // ---- misc ----
    rememberSearch: function (q) {
      q = String(q || '').trim();
      if (!q) return;
      prefs.recentSearches = [q].concat(prefs.recentSearches.filter(function (x) { return x !== q; })).slice(0, 8);
      persist();
    },
    markGuideSeen: function () { if (!prefs.guideSeen) { prefs.guideSeen = true; persist(); } },
    markRead: function (ids) { var set = new Set(prefs.notificationsRead.concat(ids)); prefs.notificationsRead = Array.from(set).slice(-200); persist(); emit('notifications'); },
    clearPreview: function () { prefs = defaults(); persist(); emit('cleared'); emit('watch'); emit('saved'); emit('alerts'); emit('drafts'); }
  };
  C.market.store = store;
})(window.Cardable = window.Cardable || {}, window);
