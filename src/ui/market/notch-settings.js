/* Cardable Market — customise the notch.
 * One sheet for what the notch covers and how it behaves: how much it speaks (Quiet, Calm, Busy), the three switches, and the list
 * of everything it can say, each with an on/off switch and a place in the order. The order is the priority: what is higher is said
 * first. Reorder by dragging a row, or with the arrows or Alt + Up and Alt + Down on a focused row; every change is saved at once
 * (through the shared settings) and the notch updates behind the sheet, so you see what you chose. */
(function (C, root) {
  'use strict';
  var ui = C.market.ui, h = ui.h, icon = ui.icon, N = C.market.notch, store = C.market.store, doc = root.document;
  var MODE_NOTE = {
    quiet: 'Only what needs you: you were outbid, an offer arrived, an auction is ending, something sold.',
    calm: 'Also what is going on: your bids and listings, what you are looking for, good deals, rare finds, big sales and price moves.',
    busy: 'Everything, including smaller price moves, news and goals.'
  };

  function open(anchor) {
    var s = C.settings, scope = ui.createScope();
    var order = N.normalizeOrder(s.get('marketNotchOrder')), hidden = N.normalizeHidden(s.get('marketNotchHidden'));
    var surface = h('section.mk-modal.mk-notchset', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Customize the notch' });
    surface.appendChild(h('header', ui.eyebrow('Notch'), h('h2', { text: 'Customize' })));
    var handle = null;

    // how much it speaks
    var note = h('p.mk-notchset-note', { role: 'status', 'aria-live': 'polite', text: MODE_NOTE[s.get('marketNotchMode')] });
    var mode = ui.segmented({ label: 'What the notch says', value: s.get('marketNotchMode'), onChange: function (v) { s.set('marketNotchMode', v); note.textContent = MODE_NOTE[v]; },
      options: [{ value: 'quiet', label: 'Quiet' }, { value: 'calm', label: 'Calm' }, { value: 'busy', label: 'Busy' }] });
    surface.appendChild(h('div.mk-notchset-block', h('span.mk-field-label', { text: 'How much it says' }), mode, note));

    // the switches
    function toggle(key, label, helper) {
      var input = h('input', { type: 'checkbox', role: 'switch', 'aria-labelledby': 'nsw-' + key, props: { checked: !!s.get(key) } });
      input.addEventListener('change', function () { s.set(key, input.checked); });
      scope.add(s.onChange(key, function () { input.checked = !!s.get(key); }));
      return h('div.mk-setting', h('div.mk-setting-copy', h('span.mk-setting-label', { id: 'nsw-' + key, text: label }), h('span.mk-hint', { text: helper })), h('label.mk-switch', input, h('span.mk-switch-track', { 'aria-hidden': 'true' }, h('i'))));
    }
    surface.appendChild(h('div.mk-notchset-switches',
      toggle('marketNotch', 'Show on the main menu', 'Keep the notch at the top with the Market closed.'),
      toggle('marketNotchCycle', 'Move through items', 'When nothing needs you, it moves through the best few things.'),
      toggle('marketNotchPeek', 'Peek for important news', 'A small card under the notch for what needs you.')));

    // the order is the priority
    surface.appendChild(h('div.mk-notchset-head', h('h3', { text: 'What it covers' }), h('span.mk-hint', { text: 'Drag to reorder. Higher is said first.' })));
    var list = h('ul.mk-notchset-list', { role: 'list', 'aria-label': 'What the notch covers, in priority order' });
    surface.appendChild(list);
    var live = h('p.mk-sr', { role: 'status', 'aria-live': 'polite' }); surface.appendChild(live);
    function save() { s.set('marketNotchOrder', N.serialize(order)); s.set('marketNotchHidden', Object.keys(hidden).join(',')); }
    function move(id, to) {
      var at = order.indexOf(id); if (at < 0) return;
      to = Math.max(0, Math.min(order.length - 1, to)); if (to === at) return;
      var had = list.contains(doc.activeElement);
      order.splice(at, 1); order.splice(to, 0, id); save(); paint(had ? id : null);
      live.textContent = N.byId[id].label + ', position ' + (to + 1) + ' of ' + order.length;
    }
    var dragging = null;
    function paint(focusId) {
      ui.clear(list);
      order.forEach(function (id, i) {
        var c = N.byId[id], on = !hidden[id];
        var sw = h('input', { type: 'checkbox', role: 'switch', 'aria-label': c.label, props: { checked: on } });
        sw.addEventListener('change', function () { if (sw.checked) delete hidden[id]; else hidden[id] = true; save(); li.dataset.off = String(!sw.checked); });
        var up = ui.iconButton('up', 'Move ' + c.label + ' up', function () { move(id, order.indexOf(id) - 1); }, { variant: 'ghost' }), down = ui.iconButton('down', 'Move ' + c.label + ' down', function () { move(id, order.indexOf(id) + 1); }, { variant: 'ghost' });
        up.disabled = i === 0; down.disabled = i === order.length - 1;
        var li = h('li.mk-notchset-row', { draggable: 'true', tabindex: '0', data: { id: id, off: String(!on), level: c.ambient ? 'ambient' : String(c.level) }, 'aria-label': c.label + ', position ' + (i + 1) + ' of ' + order.length + '. Alt and arrow keys move it.' },
          h('span.mk-notchset-grip', { 'aria-hidden': 'true' }, icon('more')),
          h('span.mk-notchset-icon', icon(c.icon)),
          h('span.mk-notchset-copy', h('strong', { text: c.label }), h('span.mk-hint', { text: c.hint })),
          h('span.mk-notchset-tier', { text: c.ambient ? 'When quiet' : c.level === 0 ? 'Quiet' : c.level === 1 ? 'Calm' : 'Busy' }),
          h('label.mk-switch', sw, h('span.mk-switch-track', { 'aria-hidden': 'true' }, h('i'))), up, down);
        li.addEventListener('keydown', function (e) {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault(); e.stopPropagation(); move(id, order.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1));
        });
        li.addEventListener('dragstart', function (e) { dragging = id; li.classList.add('is-dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); } catch (error) { /* some engines refuse */ } });
        li.addEventListener('dragend', function () { dragging = null; li.classList.remove('is-dragging'); Array.from(list.children).forEach(function (n) { n.classList.remove('is-over'); }); });
        li.addEventListener('dragover', function (e) { if (dragging && dragging !== id) { e.preventDefault(); li.classList.add('is-over'); } });
        li.addEventListener('dragleave', function () { li.classList.remove('is-over'); });
        li.addEventListener('drop', function (e) { e.preventDefault(); if (dragging && dragging !== id) move(dragging, order.indexOf(id)); });
        list.appendChild(li);
      });
      if (focusId) { var f = list.querySelector('[data-id="' + focusId + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
    paint();

    // the foot
    var foot = h('div.mk-modal-actions');
    foot.appendChild(ui.button('Reset', { variant: 'ghost', onClick: function () { order = N.DEFAULT_ORDER.slice(); hidden = {}; save(); s.set('marketNotchMode', 'calm'); mode.set('calm'); note.textContent = MODE_NOTE.calm; paint(); } }));
    foot.appendChild(ui.button('Show hidden items again', { variant: 'ghost', onClick: function () { store.clearNotchSnoozes(); C.ui.toast('Items you hid for an hour are back.'); } }));
    foot.appendChild(ui.button('Done', { variant: 'primary', onClick: function () { handle.close(); } }));
    surface.appendChild(foot);
    handle = C.ui.present(surface, { anchor: anchor || doc.activeElement, onClose: function () { scope.destroy(); } });
    return handle;
  }

  ui.notchSettings = { open: open };
})(window.Cardable = window.Cardable || {}, window);
