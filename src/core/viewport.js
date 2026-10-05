(function (C, root) {
  'use strict';
  var frame = null, container = null, desktopSize = null, ready = false, zoom = 1, watch, lastLayout = null;
  function scale(width, height, userScale) { return Math.max(.62, Math.min(1.6, Math.min(width / 1920, height / 1080) * (userScale || 1))); }
  function update() {
    frame = null;
    var enabled = !!C.native;
    if (enabled && desktopSize) {
      var value = C.settings.get('interfaceSize'), next = scale(desktopSize.width, desktopSize.height, value === 'auto' ? 1 : Number(value) / 100);
      if (Math.abs(next - zoom) > .0001) { zoom = next; C.native.window.setUiScale(next).catch(function () {}); }
    }
    var layout = [enabled, C.viewport.windowWidth, C.viewport.windowHeight, root.devicePixelRatio || 1, zoom].join(':');
    if (layout === lastLayout) return;
    lastLayout = layout;
    if (container) {
      container.classList.toggle('is-composed', enabled);
      var style = container.style;
      if (enabled) {
        style.setProperty('--layout-width', '1920px'); style.setProperty('--layout-height', '1080px'); style.setProperty('--layout-min', '1080px');
        style.left = (C.viewport.windowWidth - 1920) / 2 + 'px'; style.top = (C.viewport.windowHeight - 1080) / 2 + 'px';
      } else { style.removeProperty('--layout-width'); style.removeProperty('--layout-height'); style.removeProperty('--layout-min'); style.left = style.top = '0px'; }
      ['left','right','top','bottom'].forEach(function (edge) {
        var crop = enabled ? Math.max(0, ((edge === 'left' || edge === 'right' ? 1920 - C.viewport.windowWidth : 1080 - C.viewport.windowHeight)) / 2) : 0;
        style.setProperty('--safe-' + edge, 'calc(' + crop + 'px + env(safe-area-inset-' + edge + ',0px))');
      });
      style.setProperty('--available-width', Math.min(C.viewport.width, C.viewport.windowWidth) + 'px');
      style.setProperty('--available-height', Math.min(C.viewport.height, C.viewport.windowHeight) + 'px');
    }
    root.document.documentElement.style.setProperty('--ui-scale', String(zoom));
    C.events.emit('layout:resize', { width: C.viewport.width, height: C.viewport.height, dpr: root.devicePixelRatio || 1 });
    if (C.fx) C.fx.wake();
    if (watch) watch.removeEventListener('change', schedule);
    watch = root.matchMedia('(resolution: ' + (root.devicePixelRatio || 1) + 'dppx)'); watch.addEventListener('change', schedule, { once: true });
  }
  function schedule() { if (frame === null) frame = root.requestAnimationFrame(update); }
  function runtime(state) {
    var changed = !desktopSize || state.width !== desktopSize.width || state.height !== desktopSize.height;
    desktopSize = state;
    if (changed) schedule();
  }
  C.viewport = {
    scale: scale,
    get root() { return container; }, get composed() { return !!C.native; },
    get windowWidth() { return root.document.documentElement.clientWidth; }, get windowHeight() { return root.document.documentElement.clientHeight; },
    get width() { return this.composed ? 1920 : this.windowWidth; }, get height() { return this.composed ? 1080 : this.windowHeight; },
    parent: function (parent) { return parent === root.document.body && container ? container : parent; },
    layers: function () { return Array.from(root.document.body.children).filter(function (el) { return el !== container; }).concat(container ? Array.from(container.children) : []); },
    get safe() { var x = Math.max(0, (this.width - this.windowWidth) / 2), y = Math.max(0, (this.height - this.windowHeight) / 2); return {left:x,top:y,right:this.width-x,bottom:this.height-y}; },
    local: function (point) { var rect = container && this.composed ? container.getBoundingClientRect() : { left: 0, top: 0 }; return { x: point.x - rect.left, y: point.y - rect.top }; },
    rect: function (rect) { var point = this.local({ x: rect.left, y: rect.top }); return Object.assign({}, { left: point.x, top: point.y, right: point.x + rect.width, bottom: point.y + rect.height, width: rect.width, height: rect.height }); },
    global: function (point) { var rect = container && this.composed ? container.getBoundingClientRect() : { left: 0, top: 0 }; return { x: point.x + rect.left, y: point.y + rect.top }; },
    onResize: function (fn) { return C.events.on('layout:resize', fn); }, refresh: schedule,
    init: function () {
      if (ready) return; ready = true;
      if (C.native) {
        container = root.document.createElement('div'); container.className = 'qol-root';
        Array.from(root.document.body.children).forEach(function (element) { if (!['SCRIPT','CANVAS'].includes(element.tagName) && element.id !== 'cursor-glow') container.appendChild(element); });
        root.document.body.appendChild(container);
        C.native.window.onRuntimeState(runtime);
        C.native.window.getRuntimeState().then(runtime).catch(function () {});
        C.settings.onChange('interfaceSize', schedule);
        C.settings.onChange('aspectLock', function (value) { C.native.window.setAspectLock(value).catch(function () {}); });
        C.native.window.setAspectLock(C.settings.get('aspectLock')).catch(function () {});
      }
      // Listen to the browser resize, not our own layout notification. Subscribing
      // to layout:resize here would schedule a new resize on every emitted frame.
      root.addEventListener('resize', schedule); update();
    }
  };
})(window.Cardable, window);
