(function (C, root) {
  'use strict';
  var loading = null, busy = false;
  function load() {
    if (C.studioController) return Promise.resolve();
    if (loading) return loading;
    var files = ['assets/art-data/manifest.js', 'src/studio/art-data.js', 'src/studio/camera.js', 'src/studio/card-face.js', 'src/studio/renderer.js', 'src/studio/studio.js'];
    loading = files.reduce(function (chain, file) { return chain.then(function () { return new Promise(function (resolve, reject) { var script = root.document.createElement('script'); script.src = file; script.async = false; script.onload = function () { resolve(); }; script.onerror = function () { script.remove(); reject(new Error('The studio could not load. Rebuild or restore its local files.')); }; root.document.head.appendChild(script); }); }); }, Promise.resolve()).catch(function (error) { loading = null; throw error; }); return loading;
  }
  function report(message) { var panel = C.detail && C.detail.panel; if (!panel) return; var notice = panel.querySelector('.studio-entry-notice'); if (!notice) { notice = root.document.createElement('p'); notice.className = 'studio-entry-notice'; notice.setAttribute('role', 'status'); panel.appendChild(notice); } notice.textContent = message; }
  C.studio = {
    get active() { return !!(C.studioController && C.studioController.active); },
    get pending() { return busy; },
    enter: async function (context) { if (busy || this.active || !C.detail || C.detail.phase !== 'detail' || !C.detail.view || C.preferences.open) return false; busy = true; var selected = C.detail.view;
      try { await load(); if (C.detail.view !== selected || C.detail.phase !== 'detail') return false; return await C.studioController.enter(context || {}, selected); } catch (error) { report(error.message); return false; } finally { busy = false; }
    },
    exit: function () { if (C.studioController) C.studioController.exit(); }
  };
  C.detailActions.register('studio', function (host, context) { if (!context.entry.owned) return; var button = root.document.createElement('button'); button.type = 'button'; button.className = 'studio-inspect-action'; button.title = 'Inspect this instance · E'; button.setAttribute('aria-label', 'Inspect card in studio');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-3h4l2 3h4v13H4ZM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/></svg><span>Inspect</span>'; button.addEventListener('click', function () { C.studio.enter(context); }); host.appendChild(button);
  });
  root.document.addEventListener('keydown', function (event) { if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || String(event.key).toLowerCase() !== 'e' || C.studio.active || busy || C.detail.phase !== 'detail' || !C.detail.view || !C.detail.view.instance.serial || event.target.closest && event.target.closest('input,select,textarea,[contenteditable],[data-tool-surface]')) return; event.preventDefault(); C.studio.enter(); });
  C.events.on('app:ready', function () {
    if (!C.dev) return;
    C.dev.checkStudio = function () {
      var at = root.performance.now(), cases = [], pending = [];
      function require(ok, label) { if (!ok) throw new Error('Studio: ' + label); cases.push(label); }
      var scene = C.studioScenes.defaults(); require(JSON.stringify(C.studioScenes.parse(C.studioScenes.serialize(scene))) === JSON.stringify(C.studioScenes.parse(scene)), 'scene JSON round-trip');
      scene.lights = Array.from({ length: 20 }, function () { return scene.lights[0]; }); scene.props = Array.from({ length: 60 }, function () { return {}; });
      require(C.studioScenes.parse(scene).lights.length === 8 && ['high', 'medium', 'low', 'very-low'].every(function (tier) { var effective = C.studioScenes.effective(scene, tier), limits = C.studioScenes.limits(tier); return effective.lights.length <= limits.lights && effective.props.length <= limits.props; }), 'light and prop budget clamps');
      pending.push('undo/redo (B)', 'photo pixel dimensions (D)', 'album blob round-trip (D)');
      require(root.performance.now() - at < 2000, 'under two seconds'); var result = { milestone: 'A', passed: cases, pending: pending }; root.console.info('checkStudio', result); return result;
    };
    C.dev.register({ id: 'studio.check', group: 'Studio', label: 'Check Studio', type: 'button', helper: 'One explicit small check; later milestone checks are reported pending.', run: function () { return C.dev.checkStudio(); } });
  });
})(window.Cardable, window);
