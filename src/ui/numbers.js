(function (C, root) {
  'use strict';
  // Call update from the owner's shared scheduler subscription. No private timers.
  C.numbers = {
    create: function (host) {
      var slots = [], text = '', changes = 0;
      host.classList.add('rolling-number'); host.setAttribute('aria-hidden', 'true');
      function slot(character) {
        var el = root.document.createElement('span'), previous = root.document.createElement('span'), current = root.document.createElement('span');
        el.className = 'rolling-char' + (/\d/.test(character) ? '' : ' rolling-char--literal');
        previous.className = 'rolling-char__previous'; current.className = 'rolling-char__current'; current.textContent = character;
        el.appendChild(previous); el.appendChild(current);
        return { el: el, previous: previous, current: current, character: character, start: null };
      }
      return {
        get text() { return text; }, get changes() { return changes; }, get slots() { return slots; },
        set: function (value, animate) {
          value = String(value); if (value === text) return;
          var canAnimate = animate !== false && text !== '';
          // Preserve positions from the right during carries such as 9 -> 10.
          while (slots.length > value.length) slots.shift().el.remove();
          while (slots.length < value.length) {
            var next = slot(''); host.insertBefore(next.el, slots.length ? slots[0].el : null); slots.unshift(next);
          }
          Array.from(value).forEach(function (character, i) {
            var slot = slots[i]; if (slot.character === character) return;
            if (text !== '') changes += 1; slot.previous.textContent = slot.character; slot.current.textContent = character;
            slot.el.classList.toggle('rolling-char--literal', !/\d/.test(character));
            slot.start = canAnimate && !C.motion.reduced && /\d/.test(character) && (/\d/.test(slot.character) || slot.character === '') ? root.performance.now() : null;
            slot.character = character;
            slot.el.classList.toggle('is-rolling', slot.start !== null);
            slot.current.style.transform = slot.start !== null ? 'translateY(100%)' : 'translateY(0%)';
            slot.previous.style.transform = 'translateY(0%)'; slot.previous.style.opacity = slot.start !== null ? 1 : 0;
          }); text = value;
        },
        update: function (now) {
          var active = false;
          slots.forEach(function (slot) {
            if (slot.start === null) return;
            var p = C.motion.reduced ? 1 : Math.min(1, (now - slot.start) / C.config.menuMotion.digitMs), ease = 1 - Math.pow(1 - p, 3);
            slot.current.style.transform = 'translateY(' + (1 - ease) * 100 + '%)'; slot.previous.style.transform = 'translateY(' + -ease * 100 + '%)'; slot.previous.style.opacity = 1 - ease;
            if (p === 1) { slot.start = null; slot.el.classList.remove('is-rolling'); } else active = true;
          }); return active;
        }
      };
    }
  };
})(window.Cardable, window);
