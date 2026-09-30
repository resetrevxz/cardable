(function (C, root) {
  'use strict';
  var views = new Set(), active = null, subscribed = false;
  var layerNames = ['shadow', 'body', 'finish', 'art', 'foil', 'beam', 'glare', 'text', 'prop', 'edge'];
  var stats = { updates: 0, fullCards: 0 };
  function node(tag, className, text) {
    var element = root.document.createElement(tag); element.className = className || '';
    if (text != null) element.textContent = text;
    return element;
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function layer(index) {
    var element = node('div', 'card__layer card__' + layerNames[index]);
    element.dataset.layer = layerNames[index]; element.dataset.layerIndex = index;
    return element;
  }
  function material(layerEl, className) {
    var live = node('div', className + ' card__material card__material--live');
    var lite = node('div', className + ' card__material card__material--lite');
    layerEl.appendChild(live); layerEl.appendChild(lite);
    return { live: live, lite: lite };
  }
  function frontText(card, instance, rarity, generation, context) {
    var text = layer(7), header = node('div', 'card__header');
    header.appendChild(node('span', 'card__badge', rarity.code));
    header.appendChild(node('span', 'card__generation', generation ? generation.name : card.generation));
    text.appendChild(header);
    var info = node('div', 'card__info');
    if (context.presentation.concealed) {
      info.appendChild(node('p', 'card__unknown', context.presentation.description)); text.appendChild(info);
      return { el: text, serial: node('div'), meter: node('div') };
    }
    info.appendChild(node('h2', 'card__name', card.name));
    var memory = node('div', 'card__memory');
    memory.appendChild(node('span', 'card__vram', C.cardSpecs.vram(card)));
    memory.appendChild(node('span', 'card__memory-type', card.vram.type)); info.appendChild(memory);
    var specs = node('dl', 'card__specs');
    C.cardSpecs.rows(card).slice(0, C.config.cardView.maxFrontSpecs).forEach(function (row) {
      var spec = node('div', 'card__spec'); spec.appendChild(node('dt', '', row.label)); spec.appendChild(node('dd', '', row.value)); specs.appendChild(spec);
    });
    info.appendChild(specs);
    var serial = node('div', 'card__serial'); serial.setAttribute('aria-label', instance.serial);
    Array.from(instance.serial).forEach(function (character, i) {
      var char = node('span', 'card__serial-char', character); char.setAttribute('aria-hidden', 'true');
      char.style.setProperty('--char-delay', i * C.config.cardView.stampCharMs + 'ms'); serial.appendChild(char);
    });
    info.appendChild(serial);
    var meter = node('div', 'card__meter'); meter.setAttribute('aria-label', 'Tier ' + rarity.tier + ' of 12');
    for (var i = 0; i < C.config.cardView.meterSegments; i += 1) {
      var tick = node('span', 'card__meter-tick'); tick.dataset.filled = i <= rarity.tier;
      tick.style.setProperty('--tick-delay', i * C.config.cardView.meterTickMs + 'ms'); tick.setAttribute('aria-hidden', 'true'); meter.appendChild(tick);
    }
    info.appendChild(meter); text.appendChild(info);
    return { el: text, serial: serial, meter: meter };
  }
  function backText(instance, context) {
    var text = layer(7), mark = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('viewBox', '0 0 64 64'); mark.setAttribute('aria-hidden', 'true'); mark.classList.add('card__back-mark');
    var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M44 20C40 16 35 15 31 16C21 18 16 25 16 32C16 42 22 49 32 49C37 49 41 47 44 44');
    mark.appendChild(path); text.appendChild(mark);
    text.appendChild(node('div', 'card__back-wordmark', 'cardable'));
    if (!context.presentation.concealed) text.appendChild(node('div', 'card__back-serial', instance.serial));
    return text;
  }
  function buildFace(back, card, instance, rarity, generation, context) {
    var face = node('div', 'card__face ' + (back ? 'card__face--back' : 'card__face--front'));
    var binding = null, textParts, propLayer = layer(8), finishContext = context;
    if (!back && (rarity.propSpec || context.presentation.hasProp)) {
      var props = material(propLayer, 'card__prop-render');
      finishContext = Object.assign({}, context, { propElement: props.live, litePropElement: props.lite });
    }
    for (var i = 1; i < layerNames.length; i += 1) {
      var element = layer(i);
      if (i === 2 && !back) {
        var finish = material(element, 'card__finish-render');
        binding = C.finishes.bind(rarity.finish, finish.live, card, finishContext);
        finish.lite.appendChild(binding.lite());
      }
      if (i === 3 && !back && !context.presentation.hideArt) { var artWindow = node('div', 'card__art-window'); artWindow.appendChild(C.art.render(card)); element.appendChild(artWindow); }
      if (i >= 4 && i <= 6) material(element, 'card__' + layerNames[i] + '-render');
      if (i === 7) {
        if (back) element = backText(instance, context);
        else { textParts = frontText(card, instance, rarity, generation, context); element = textParts.el; }
      }
      if (i === 8) element = propLayer;
      face.appendChild(element);
    }
    return { el: face, finish: binding, text: textParts };
  }
  function update(now, dt) {
    if (!active || !active.visible || active.destroyed) return false;
    return active.update(now, dt);
  }
  C.cardView = {
    stats: stats,
    get active() { return active; },
    focus: function (view) {
      if (!views.has(view) || view.destroyed) return;
      if (active && active !== view) active.applyMode('lite');
      active = view; view.applyMode('full'); stats.fullCards = 1;
      C.events.emit('card:focused', view); C.fx.wake();
    },
    create: function (record, instance, options) {
      var card = typeof record === 'string' ? C.card(record) : record;
      options = options || {};
      if (!card || !instance || typeof instance.serial !== 'string') throw new Error('Card view needs a card and an instance serial');
      var rarity = C.rarity(card.rarity), generation = C.data.generations.find(function (g) { return g.id === card.generation; });
      if (!rarity || !C.finishes.registry[rarity.finish]) throw new Error('Card finish is not implemented');
      var context = { colorMode: options.colorMode || C.config.rarityColorMode, state: options.finishState,
        owned: typeof options.owned === 'boolean' ? options.owned : C.state.current.inventory.some(function (owned) { return owned && owned.cardId === card.id; }) };
      context.presentation = C.finishes.describe(rarity.finish, card, context);
      context.state = context.presentation.state || context.state;
      var el = node('article', 'collectible-card');
      el.dataset.cardId = card.id; el.dataset.rarity = rarity.id; el.dataset.colorMode = context.colorMode;
      el.dataset.mode = 'lite'; el.dataset.side = 'front'; el.dataset.visible = 'true';
      if (context.state) el.dataset.finishState = context.state;
      el.dataset.cursor = 'ring'; el.setAttribute('tabindex', 0); el.setAttribute('role', 'button');
      var label = context.presentation.concealed ? context.presentation.description : card.name + ', ' + rarity.name + '.';
      el.setAttribute('aria-label', label + ' Press Enter to turn the card.');
      el.style.setProperty('--stamp-flicker', C.config.cardView.stampFlickerMs + 'ms');
      el.style.setProperty('--mode-duration', C.config.cardView.crossfadeMs + 'ms');
      var shadow = layer(0); el.appendChild(shadow);
      var tilter = node('div', 'card__tilter'), flipper = node('div', 'card__flipper');
      var front = buildFace(false, card, instance, rarity, generation, context), back = buildFace(true, card, instance, rarity, generation, context);
      back.el.setAttribute('aria-hidden', 'true');
      flipper.appendChild(front.el); flipper.appendChild(back.el); tilter.appendChild(flipper); el.appendChild(tilter);
      var sx = C.springs.create(0), sy = C.springs.create(0), lift = C.springs.create(0);
      var pointer = { x: 0.5, y: 0.5 }, lastMove = root.performance.now(), idleTimer = null, stampTimer = null;
      var stamped = !!context.presentation.concealed, observer = null;
      var lamp = root.getComputedStyle(root.document.documentElement);
      var lampX = parseFloat(lamp.getPropertyValue('--lamp-x')), lampY = parseFloat(lamp.getPropertyValue('--lamp-y'));
      function idleWake() {
        root.clearTimeout(idleTimer);
        if (!C.motion.reduced && view.mode === 'full' && view.visible) idleTimer = root.setTimeout(C.fx.wake, Math.max(0, C.config.cardView.idleMs - (root.performance.now() - lastMove)));
      }
      function pose(rx, ry, raised) {
        var cfg = C.config.cardView;
        var lampAngle = Math.atan2(lampY + rx / cfg.tiltCap * 0.35, lampX - ry / cfg.tiltCap * 0.35) * 180 / Math.PI;
        var values = {
          '--mx': pointer.x, '--my': pointer.y, '--rx': rx + 'deg', '--ry': ry + 'deg', '--lamp-angle': lampAngle + 'deg', '--lift': raised,
          '--lift-px': raised * cfg.liftPx + 'px', '--card-scale': 1 + raised * 0.025,
          '--glare-x': clamp(pointer.x - lampX * cfg.lampInfluence, 0, 1) * 100 + '%', '--glare-y': clamp(pointer.y - lampY * cfg.lampInfluence, 0, 1) * 100 + '%',
          '--core-x': clamp(0.5 + (pointer.x - 0.5) * cfg.specularSpeed - lampX * cfg.lampInfluence, 0, 1) * 100 + '%',
          '--core-y': clamp(0.5 + (pointer.y - 0.5) * cfg.specularSpeed - lampY * cfg.lampInfluence, 0, 1) * 100 + '%',
          '--shadow-x': -ry * 0.5 + 'px', '--shadow-y': 12 + rx * 0.5 + raised * 8 + 'px',
          '--shadow-blur': 18 + raised * 14 + 'px', '--far-edge-angle': Math.atan2(rx, ry) * 180 / Math.PI + 90 + 'deg',
          '--far-edge-alpha': Math.max(Math.abs(rx), Math.abs(ry)) / cfg.tiltCap * 0.2
        };
        Object.keys(values).forEach(function (key) { el.style.setProperty(key, values[key]); });
      }
      var view = {
        el: el, card: card, instance: instance, mode: 'lite', side: 'front', visible: true, destroyed: false, followColorMode: !options.colorMode,
        finishState: context.state, description: context.presentation.description || '',
        stats: { updates: 0, stamps: 0 },
        applyMode: function (mode) {
          if (view.mode === mode) return;
          view.mode = mode; el.dataset.mode = mode;
          if (mode === 'lite') {
            root.clearTimeout(idleTimer); sx.reset(); sy.reset(); lift.reset(); pose(0, 0, 0);
            root.clearTimeout(stampTimer);
            front.text.serial.classList.remove('is-stamping'); front.text.meter.classList.remove('is-stamping');
          } else { lastMove = root.performance.now(); idleWake(); }
        },
        setMode: function (mode) {
          if (mode !== 'full' && mode !== 'lite') throw new Error('Unknown card render mode');
          if (mode === 'full') C.cardView.focus(view);
          else { view.applyMode('lite'); if (active === view) { active = null; stats.fullCards = 0; } }
        },
        setFace: function (side) {
          if (side !== 'front' && side !== 'back') throw new Error('Unknown card face');
          view.side = side; el.dataset.side = side;
          front.el.setAttribute('aria-hidden', side === 'back'); back.el.setAttribute('aria-hidden', side === 'front');
          C.events.emit('card:face', { view: view, side: side });
        },
        setColorMode: function (mode) {
          if (mode !== 'color' && mode !== 'mono') throw new Error('Unknown rarity color mode');
          context.colorMode = mode; el.dataset.colorMode = mode;
          el.querySelectorAll('.finish-surface').forEach(function (surface) { surface.dataset.colorMode = mode; });
        },
        setVisible: function (visible) {
          view.visible = visible; el.dataset.visible = visible;
          root.clearTimeout(idleTimer);
          if (visible && view.mode === 'full') { lastMove = root.performance.now(); idleWake(); C.fx.wake(); }
        },
        stamp: function () {
          if (context.presentation.concealed) return;
          root.clearTimeout(stampTimer); view.stats.stamps += 1; stamped = true;
          front.text.serial.classList.remove('is-stamping'); front.text.meter.classList.remove('is-stamping');
          if (C.motion.reduced || view.mode === 'lite') return;
          void front.text.serial.offsetWidth;
          front.text.serial.classList.add('is-stamping'); front.text.meter.classList.add('is-stamping');
          stampTimer = root.setTimeout(function () {
            front.text.serial.classList.remove('is-stamping'); front.text.meter.classList.remove('is-stamping');
          }, Math.max(instance.serial.length * C.config.cardView.stampCharMs + C.config.cardView.stampFlickerMs, C.config.cardView.meterSegments * C.config.cardView.meterTickMs));
        },
        update: function (now, dt) {
          var cfg = C.config.cardView, reduced = C.motion.reduced;
          var cap = reduced ? cfg.reducedTiltCap : cfg.tiltCap;
          var sway = !reduced && now - lastMove >= cfg.idleMs;
          var time = (now - lastMove - cfg.idleMs) / 1000;
          var tx = -(pointer.y - 0.5) * 2 * cap + (sway ? Math.sin(time * cfg.swaySpeed) * cfg.swayDegrees : 0);
          var ty = (pointer.x - 0.5) * 2 * cap + (sway ? Math.sin(time * cfg.swaySpeed * 0.8) * cfg.swayDegrees : 0);
          var rx = sx.step(dt, clamp(tx, -cap, cap), reduced ? cfg.reducedDamping : undefined);
          var ry = sy.step(dt, clamp(ty, -cap, cap), reduced ? cfg.reducedDamping : undefined);
          if (Math.abs(rx) > cap) { rx = clamp(rx, -cap, cap); sx.value = rx; sx.velocity = 0; }
          if (Math.abs(ry) > cap) { ry = clamp(ry, -cap, cap); sy.value = ry; sy.velocity = 0; }
          var raised = lift.step(dt, reduced ? 0 : cfg.focusedLift, reduced ? cfg.reducedDamping : undefined);
          pose(rx, ry, raised); stats.updates += 1; view.stats.updates += 1;
          var finishMoving = !reduced && view.side === 'front' && front.finish.update(dt, pointer);
          if (!stamped && sx.settled() && sy.settled() && lift.settled()) view.stamp();
          return sway || finishMoving || !sx.settled() || !sy.settled() || !lift.settled();
        },
        pointer: function (event) {
          if (view.mode !== 'full' || !view.visible) return;
          var bounds = el.getBoundingClientRect();
          pointer.x = clamp((event.pointer.x - bounds.left) / bounds.width, 0, 1);
          pointer.y = clamp((event.pointer.y - bounds.top) / bounds.height, 0, 1);
          lastMove = root.performance.now(); idleWake(); C.fx.wake();
        },
        destroy: function () {
          if (view.destroyed) return;
          view.setMode('lite'); view.destroyed = true;
          root.clearTimeout(idleTimer); root.clearTimeout(stampTimer);
          if (observer) observer.disconnect(); front.finish.destroy(); views.delete(view); el.remove();
        }
      };
      views.add(view); pose(0, 0, 0);
      if (options.autoFocus !== false) {
        el.addEventListener('pointerenter', function () { view.setMode('full'); });
        el.addEventListener('focus', function () { view.setMode('full'); });
      }
      el.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); view.setFace(view.side === 'front' ? 'back' : 'front'); }
      });
      if (root.IntersectionObserver) {
        observer = new root.IntersectionObserver(function (entries) { view.setVisible(entries[0].isIntersecting); }, { threshold: 0.02 }); observer.observe(el);
      }
      if (!subscribed) {
        subscribed = true; C.fx.subscribe(update);
        C.events.on('pointer:move', function (event) { if (active && active.el.contains(event.pointer.target)) active.pointer(event); });
        C.events.on('motion:changed', function () {
          if (active) {
            active.el.querySelectorAll('.is-stamping').forEach(function (element) { element.classList.remove('is-stamping'); });
            active.setVisible(active.visible);
          }
        });
        C.events.on('fx:visibility', function (visible) { if (visible && active) active.setVisible(active.visible); });
        C.events.on('settings:rarityColorMode', function (mode) { views.forEach(function (view) { if (view.followColorMode) view.setColorMode(mode); }); });
      }
      return view;
    }
  };
})(window.Cardable, window);
