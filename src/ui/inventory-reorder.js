(function (C, root) {
  'use strict';
  C.inventoryReorder = { claimEscape:function(event,active){if(event.key!=='Escape'||!active)return false;event.inventoryReorderHandled=true;return true;},create: function (host, options) {
    var drag = null, guard = 0, cfg = C.config.inventoryMotion;
    var marker = C.packMarkup.node('i', 'inventory-insertion', host); marker.hidden = true;
    function cancel() {
      if (!drag) return;
      var d = drag; drag = null;
      if (host.hasPointerCapture(d.id)) host.releasePointerCapture(d.id);
      d.tile.el.style.opacity = ''; d.tile.el.classList.remove('is-reordering');
      options.tiles().forEach(function (tile) { tile.pose.style.translate = ''; });
      if (d.clone) { if (d.clone.view) d.clone.view.destroy(); d.clone.el.remove(); }
      marker.hidden = true; guard = root.performance.now() + cfg.dragClickGuardMs;
      C.events.emit('inventory:dragContext', { active: false }); C.fx.wake();
    }
    function place() {
      var d = drag, target = options.tiles().get(d.to), grid = options.viewMode() === 'grid';
      options.tiles().forEach(function (tile) {
        var shift = tile.index > d.tile.index && tile.index <= d.to ? -cfg.reorderGapPx : tile.index < d.tile.index && tile.index >= d.to ? cfg.reorderGapPx : 0;
        tile.pose.style.translate = grid ? '0 ' + shift + 'px' : shift + 'px 0';
      });
      if (target) {
        var r = target.el.getBoundingClientRect(), h = host.getBoundingClientRect();
        marker.hidden = false; marker.style.transform = 'translate3d(' + (r.left - h.left - 6) + 'px,' + (r.top - h.top) + 'px,0)'; marker.style.height = r.height + 'px';
      }
    }
    host.addEventListener('pointerdown', function (event) {
      if (event.button !== 0 || options.blocked() || C.inventoryModel.current.sortMode !== 'custom') return;
      var tile = options.tile(event.target); if (!tile) return;
      drag = { id: event.pointerId, tile: tile, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, at: root.performance.now(), active: false, to: tile.index };
    });
    root.document.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var d = drag, dx = event.clientX - d.x, dy = event.clientY - d.y;
      if (!d.active) {
        if (root.performance.now() - d.at < cfg.reorderHoldMs) { if (Math.hypot(dx, dy) > cfg.dragSlopPx) drag = null; return; }
        d.active = true; options.cancelScroll(); host.setPointerCapture(d.id);
        d.tile.el.classList.add('is-reordering'); d.tile.el.style.opacity = '0';
        d.rect = d.tile.card.getBoundingClientRect(); d.clone = C.inventoryTransition.lift(d.rect, d.tile.entry);
        C.events.emit('inventory:dragContext', { active: true });
      }
      event.preventDefault(); d.lastX = event.clientX; d.lastY = event.clientY;
      d.finalRect={left:d.rect.left+dx,top:d.rect.top+dy,width:d.rect.width,height:d.rect.height};
      d.clone.el.style.transform = 'translate3d(' + (C.viewport.rect(d.rect).left + dx) + 'px,' + (C.viewport.rect(d.rect).top + dy) + 'px,0) scale(1.02)';
      var nearest = options.nearest(event.clientX, event.clientY); if (nearest != null) d.to = nearest;
      place(); C.fx.wake();
    });
    root.document.addEventListener('pointerup', function (event) { if (!drag || event.pointerId !== drag.id) return; var d = drag; cancel(); if (d.active) options.drop(d.tile.index, d.to,d.finalRect); });
    root.document.addEventListener('pointercancel', cancel); root.addEventListener('blur', cancel);
    root.document.addEventListener('keydown', function (event) { if (C.inventoryReorder.claimEscape(event,!!drag)) { event.preventDefault(); cancel(); } });
    return { get active() { return !!(drag && drag.active); }, get guarded() { return root.performance.now() < guard; }, cancel: cancel,
      update: function (now, dt) {
        if (!drag || !drag.active) return false;
        var rect = host.getBoundingClientRect(), grid = options.viewMode() === 'grid', point = grid ? drag.lastY : drag.lastX, start = grid ? rect.top : rect.left, size = grid ? rect.height : rect.width;
        var amount = point < start + cfg.reorderEdgePx ? -1 : point > start + size - cfg.reorderEdgePx ? 1 : 0;
        if (amount) { options.scroll(amount * dt / 1000 * cfg.reorderScrollSpeed); var nearest = options.nearest(drag.lastX, drag.lastY); if (nearest != null) drag.to = nearest; place(); }
        return true;
      }
    };
  } };
})(window.Cardable, window);
