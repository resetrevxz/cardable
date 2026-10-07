(function (C, root) {
  'use strict';
  var node = C.packMarkup.node;
  function title(value) { return ({ 'very-low': 'Very Low', display: 'Display refresh', unlimited: 'Unlimited', sleep: 'Sleep completely', timer: 'Timer/title only', pause: 'Pause visuals' })[value] || (value === '2.5' || value === '5' ? value + ' s' : /^\d+$/.test(value) ? value + ' FPS' : value.charAt(0).toUpperCase() + value.slice(1)); }
  C.uiKit = {
    create: function (descriptor, parent, binding) {
      binding = binding || { get: C.settings.get, set: C.settings.set, subscribe: C.settings.onChange };
      var key = descriptor.key, type = descriptor.control, control, buttons = [], indicator, knob, current = binding.get(key), pending = false;
      var disabled = descriptor.group === 'Sound', spring = C.springs.create(0, { stiffness: 220, damping: 26 });
      var row = node('div', 'settings-row', parent), copy = node('div', 'settings-copy', row);
      var label = node('span', 'settings-label', copy, descriptor.label); label.id = (descriptor.prefix || 'setting-') + key;
      node('span', 'settings-helper', copy, descriptor.helper);
      if (type === 'switch') {
        control = node('button', 'settings-switch', row); control.type = 'button'; control.setAttribute('role', 'switch');
        knob = node('i', 'settings-switch-knob', control); control.disabled = disabled;
        control.addEventListener('click', function () { if (control.disabled) return; binding.set(key, key === 'rarityColor' ? binding.get(key) === 'color' ? 'mono' : 'color' : !binding.get(key)); });
      } else if (type === 'input') {
        control = node('input', 'settings-input', row); control.type = descriptor.inputType || 'text';
        if (descriptor.min != null) control.min = descriptor.min;
        if (descriptor.max != null) control.max = descriptor.max;
        if (descriptor.step != null) control.step = descriptor.step;
        control.addEventListener('change', function () { binding.set(key, control.type === 'number' ? Number(control.value) : control.value); });
      } else if (type === 'select') {
        control = node('select', 'settings-select', row);
        descriptor.choices.forEach(function (choice) { var value = typeof choice === 'object' ? choice.value : choice; var option = node('option', '', control, typeof choice === 'object' ? choice.label : descriptor.format ? descriptor.format(value) : title(value)); option.value = value; option.disabled = !!choice.disabled; });
        control.addEventListener('change', function () { binding.set(key, control.value); });
      } else if (type === 'volume' || type === 'slider') {
        control = node('input', 'settings-volume', row); control.type = 'range'; control.min = descriptor.min == null ? 0 : descriptor.min; control.max = descriptor.max == null ? 100 : descriptor.max; control.step = descriptor.step || 1; control.value = current; control.disabled = disabled || type === 'volume';
        control.setAttribute('aria-label', descriptor.label);
        control.addEventListener('input', function () { binding.set(key, Number(control.value)); refresh(Number(control.value)); });
        var valueHost = node('span', 'settings-value', row), digits = C.numbers.create(valueHost); digits.set(current, false);
      } else {
        control = node('div', 'settings-segments' + (type === 'keycaps' ? ' settings-keycaps' : ''), row); control.setAttribute('role', 'radiogroup');
        indicator = node('i', 'settings-segments-highlight', control); indicator.setAttribute('aria-hidden', 'true');
        descriptor.choices.forEach(function (value) {
          var b = node('button', 'settings-segment', control, descriptor.format?descriptor.format(value):title(value)); b.type = 'button'; b.setAttribute('role', 'radio'); b.value = value;
          b.addEventListener('click', function () { binding.set(key, value); });
          b.addEventListener('keydown', function (event) {
            var index = descriptor.choices.indexOf(binding.get(key));
            if (type === 'keycaps' && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault(); if (event.repeat) return;
              binding.set(key, event.key === 'Enter' ? 'enter' : 'space'); b.classList.add('is-pressed');
            } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(event.key) !== -1) {
              event.preventDefault(); var delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
              index = (index + delta + descriptor.choices.length) % descriptor.choices.length; binding.set(key, descriptor.choices[index]); buttons[index].focus();
            }
          });
          b.addEventListener('keyup', function () { b.classList.remove('is-pressed'); }); b.addEventListener('blur', function () { b.classList.remove('is-pressed'); }); buttons.push(b);
        });
      }
      control.setAttribute('aria-labelledby', label.id);
      function refresh(value) {
        current = value;
        if (type === 'switch') { var on = key === 'rarityColor' ? value === 'color' : value; control.setAttribute('aria-checked', on); control.classList.toggle('is-on', on); spring.target = on ? 1 : 0; pending = true; }
        else if (type === 'select' || type === 'input') control.value = value;
        else if ((type === 'volume' || type === 'slider')) { control.value = value; digits.set(value); }
        else {
          buttons.forEach(function (b) { var selected = b.value === value; b.setAttribute('aria-checked', selected); b.setAttribute('tabindex', selected ? '0' : '-1'); });
          var index = descriptor.choices.indexOf(value); indicator.style.setProperty('--segments', descriptor.choices.length); spring.target = index;
          if (C.motion.reduced) spring.reset(index); pending = true;
        }
        C.fx.wake();
      }
      refresh(current); if (indicator) spring.reset(descriptor.choices.indexOf(current)); else if (knob) spring.reset(spring.target);
      var unsubscribe = binding.subscribe ? binding.subscribe(key, refresh) : function () {};
      return { el: control, row: row, buttons: buttons, update: function (now, dt) {
        if ((type === 'volume' || type === 'slider')) return digits.update(now);
        if ((!indicator && !knob) || !pending) return false;
        if (C.motion.reduced) spring.reset(spring.target); else spring.step(dt, spring.target);
        if (knob) knob.style.transform = 'translateX(' + spring.value * 17 + 'px)'; else indicator.style.transform = 'translateX(' + spring.value * 100 + '%)'; pending = !spring.settled(); return pending;
      }, destroy: unsubscribe };
    },
    // Reusable click-again and hold controls for settings and Data actions.
    confirmation: function (button, action, options) {
      options = options || {}; var text = button.textContent, armedAt = null, held = false, heldAt = 0, fill = 0, fired = false, milestone = 0, bindings = [];
      var hold = options.mode === 'hold', announce = options.announce || function () {};
      function listen(target, name, fn) { target.addEventListener(name, fn); bindings.push(function () { target.removeEventListener(name, fn); }); }
      function cancel() { armedAt = null; held = false; fired = false; fill = 0; button.style.setProperty('--confirm-progress', 0); button.textContent = text; button.classList.remove('is-confirming', 'is-confirmed'); C.fx.wake(); }
      function start(event) { if (button.disabled || event && (event.repeat || event.button !== undefined && event.button !== 0) || held) return; if (event && event.preventDefault) event.preventDefault(); held = true; heldAt = root.performance.now(); fired = false; fill = 0; milestone = 0; button.classList.add('is-confirming'); button.textContent = options.holdLabel || 'Hold to confirm'; C.fx.wake(); }
      function release() { held = false; if (!fired) button.textContent = text; C.fx.wake(); }
      if (hold) {
        button.classList.add('is-hold-confirm');
        listen(button, 'pointerdown', start); listen(root.document, 'pointerup', release); listen(root.document, 'pointercancel', release);
        listen(button, 'keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') start(e); });
        listen(button, 'keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') release(); }); listen(button, 'blur', cancel); listen(root, 'blur', cancel);
        listen(root.document, 'keydown', function (e) { if (e.key === 'Escape' && (held || fill)) { e.preventDefault(); e.settingsHandled = true; cancel(); } });
        listen(root.document, 'visibilitychange', function () { if (root.document.hidden) cancel(); });
      } else listen(button, 'click', function () {
        if (button.disabled) return;
        if (armedAt !== null && root.performance.now() - armedAt < 3000) { cancel(); action(); }
        else { armedAt = root.performance.now(); button.classList.add('is-confirming'); button.textContent = 'Click again to confirm'; announce(options.confirmMessage || 'Click again within three seconds to restore defaults.'); C.fx.wake(); }
      });
      return { get active() { return armedAt !== null || held || fill > 0; }, cancel: cancel,
        setLabel: function (value) { text = value; if (armedAt === null && !held && fill === 0) button.textContent = text; },
        destroy: function () { cancel(); bindings.forEach(function (stop) { stop(); }); bindings = []; },
        update: function (now, dt) {
          if (hold) {
            fill = Math.max(0, Math.min(1, held ? (now - heldAt) / 3000 : fill - dt / 700)); button.style.setProperty('--confirm-progress', fill);
            button.style.setProperty('--confirm-wave', C.motion.reduced ? '0px' : Math.sin(now / 140) * fill + 'px');
            if (held && Math.floor(fill * 4) > milestone) { milestone = Math.floor(fill * 4); if (milestone < 4) announce(milestone * 25 + ' percent.'); }
            if (fill >= 1 - 1e-9 && !fired && held) { fired = true; held = false; button.classList.add('is-confirmed'); action(); announce('Confirmed.'); }
            if (!held && fill === 0) { button.classList.remove('is-confirming', 'is-confirmed'); button.textContent = text; } return held || fill > 0;
          }
          if (armedAt === null) return false;
          var p = Math.min(1, (now - armedAt) / 3000); button.style.setProperty('--confirm-progress', 1 - p); if (p === 1) cancel(); return p < 1;
        }
      };
    }
  };
  C.settingsControls = C.uiKit;
})(window.Cardable, window);
