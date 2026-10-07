(function(root) {
  'use strict';
  var C = root.Cardable, D = document;
  // The website follows the game's no-audio boundary even if an older build loads audio.js.
  root.CardableAudio = null;
  var $ = s => D.querySelector(s), all = s => Array.from(D.querySelectorAll(s));
  var clamp = x => Math.max(0, Math.min(1, x)), smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); }, mix = (a, b, p) => a + (b - a) * p;

  var ids = root.CARDABLE_CATALOG.map(c => c.id), hero = ids[0], selected = hero;
  var surface = { p: 0 }, manual = false, paused = false;
  var subject = null, subjectHost = null, subjectId = null;
  var film = null, canvas = null, filmId = null, filmTime = 0, paintedTime = -1;
  var last = 0, running = false, disposed = false;
  var finishes = ['normal', 'matte', 'rainbow-holo', 'galaxy-holo', 'aurora'];
  var labels = ['Normal', 'Matte', 'Rainbow Holo', 'Galaxy Holo', 'Aurora'];
  var finishNotes = [
    'The original Exotic rim, without a variant coating.',
    'Fine grain quiets the front reflections.',
    'Spectral light follows the surface.',
    'A stellar field lives within the coating.',
    'Soft colour travels across the face.'
  ];
  var page = D.body.dataset.page || 'home';
  var journey = false, chapters = [], position = 0, current = 0;
  var viewport = null, stageWorld = null, pack = null, poses = {};
  var pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  var pulse = { x: 0, y: 0 };
  var tiltThumb = null, idleTimer = 0;
  var flip = { angle: 0 }, flipManual = false, autoplay = false, restore = false, selectionTween = null;
  // Film-length worlds still have explicit Watch; the scroll edit should not require watching all four.
  var lengths = [1.0, 3.2, 3.2, 2.6, 2.4, 2.0, 1.4, 2.1, 2.8, 2.4, 3.0, 1.4, 1.8];
  var names = ['Arrival', 'Hold. Cut. Reveal.', 'The moment', 'Your finish', 'Collection', 'The Record', 'Worlds', 'Gilded prism', 'Crimson Clock', 'Galaxy', 'Prismatic Dawn', 'Install', 'Another possibility'];
  var journeyTrigger = null;
  var scrollCueDismissed = false;

  function filmDuration(t) {
    return t.total + C.config.revealMotion.settleMs + (t.sections.card ? 0 : C.rarity('exotic').openingIntro.handoff.flipMs);
  }

  function sample(id) {
    return {
      cardId: id,
      instanceId: 'web-demo-' + id,
      serial: 'CBL-WEB2-' + String(ids.indexOf(id) + 1).padStart(6, '0'),
      variantId: null,
      packId: 'rare',
      cardSkinId: 'standard'
    };
  }

  function asset(path) {
    return (page === 'home' ? '' : '../') + path;
  }

  function showToast(msg) {
    var toast = $('.site-toast');
    if (!toast) {
      toast = D.createElement('div');
      toast.className = 'site-toast';
      D.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  function mount(id) {
    if (subjectId === id) return;
    var previous = subject;
    if (previous) previous.destroy();
    subject = null;
    subjectId = null;
    if (!subjectHost) return;
    try {
      subject = C.webCard(subjectHost, id, sample(id));
      subjectId = id;
      delete subjectHost.dataset.renderFallback;
      subject.surface(surface.p);
    } catch(error) {
      subjectId = id;
      subjectHost.dataset.renderFallback = 'true';
      var img = D.createElement('img');
      img.src = asset('previews/' + id + '.jpg');
      img.alt = C.card(id).name;
      subjectHost.replaceChildren(img);
      console.warn('Cardable card preview fallback:', error.message);
    }
  }

  function releaseFilm() {
    if (film) film.stop();
    if (filmId === 'ascendant') C.ascendantBackground.end();
    film = null;
    filmId = null;
    paintedTime = -1;
    if (canvas) {
      canvas.width = canvas.height = 1;
      canvas.remove();
      canvas = null;
    }
  }

  function showFilm(id, time, host, alpha) {
    if (C.motion.reduced || !host) { releaseFilm(); return; }
    if (filmId !== id || (film && film.handoffDone && time < (film.timeline.sections.card ? film.timeline.sections.card.start : film.timeline.total))) {
      if (canvas && canvas.parentNode === host && stageWorld === host) {
        try {
          var still = host.querySelector('.retained-field');
          if (!still) {
            still = D.createElement('img');
            still.className = 'retained-field';
            still.alt = '';
            host.appendChild(still);
          }
          still.src = canvas.toDataURL('image/jpeg', 0.86);
        } catch(error) {}
      }
      releaseFilm();
      try {
        film = root.CardableFilms.create(id);
        filmId = id;
        canvas = D.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);
      } catch(error) {
        releaseFilm();
        host.dataset.renderFallback = 'true';
        console.warn('Cardable world preview fallback:', error.message);
        return;
      }
    }
    filmTime = time;
    if (canvas) canvas.style.opacity = alpha;
    if (film && time !== paintedTime) {
      try {
        root.CardableFilms.paint(film, canvas, 0, 0, time, pointer);
        paintedTime = time;
      } catch(error) {
        releaseFilm();
        host.dataset.renderFallback = 'true';
        console.warn('Cardable world preview fallback:', error.message);
      }
    }
  }

  function clock() {
    if (disposed || D.hidden || paused) { stopClock(); return; }
    var now = performance.now(), dt = Math.min(50, last ? now - last : 16);
    last = now;

    // Smooth pointer damping
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;
    pulse.x *= 0.9;
    pulse.y *= 0.9;

    var moving = subject && subject.update(now, dt);
    if (subject && subject.interacting) {
      moving = true;
      if (journey) draw(); else pagePose();
    }
    if (Math.abs(pointer.targetX - pointer.x) > 0.005 || Math.abs(pointer.targetY - pointer.y) > 0.005) {
      moving = true;
      if (journey) draw(); else pagePose();
    }
    if ((Math.abs(pulse.x) > 0.004 || Math.abs(pulse.y) > 0.004) && !C.motion.reduced) {
      moving = true;
      if (journey) draw(); else pagePose();
    }

    if (autoplay) {
      poke();
      if (journey) {
        var ch = chapters[current], total = film ? filmDuration(film.timeline) : 20000;
        root.scrollTo({
          top: $('#story').offsetTop + Math.min(ch.end, position + dt / total * ch.length * 0.8) * root.innerHeight,
          behavior: 'instant'
        });
        if (film && filmTime >= filmDuration(film.timeline)) stopWatch();
      } else {
        filmTime += dt;
        var total = filmDuration(film.timeline);
        showPageWorld(canvas.parentNode, Math.min(filmTime, total));
        if (filmTime >= total) stopWatch();
      }
      moving = true;
    }
    if ((!moving && !autoplay) || C.motion.reduced) stopClock();
  }

  function wake() {
    if (!running && !paused && !disposed && !D.hidden) {
      running = true;
      last = 0;
      root.gsap.ticker.add(clock);
    }
  }

  // Interruptible light impulses: selections, morphs and flips sweep the lamp.
  function addPulse(x, y) {
    pulse.x += x;
    pulse.y += y;
    wake();
  }

  function poke() {
    D.body.classList.remove('controls-idle');
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function() { D.body.classList.add('controls-idle'); }, 4000);
  }

  function stopClock() {
    running = false;
    last = 0;
    root.gsap.ticker.remove(clock);
  }

  root.CardableWeb = {
    wake: wake,
    turnCard: function() { turnCard(); },
    dispose: function() {
      disposed = true;
      stopClock();
      releaseFilm();
      if (subject) subject.destroy();
    }
  };

  function setSurface(value) {
    surface.p = Math.max(0, Math.min(4, value));
    if (!restore) addPulse((surface.p - (setSurface._last || 0)) * 0.9, 0);
    setSurface._last = surface.p;
    if (subject) subject.surface(surface.p);
    var i = Math.round(surface.p);
    all('[data-finish]').forEach(b => b.setAttribute('aria-pressed', b.dataset.finish === finishes[i]));
    var word = $('.finish-word'), description = $('.finish-description'), count = $('.finish-count');
    if (word) word.textContent = labels[i].toUpperCase();
    if (description) description.textContent = finishNotes[i];
    if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / 05';
    var identity = $('[data-identity-finish]');
    if (identity) identity.textContent = labels[i];
    if (viewport) {
      viewport.style.setProperty('--atmosphere', mix(0.6, 1.4, surface.p / 4));
      viewport.style.setProperty('--light-x', mix(68, 82, surface.p / 4) + '%');
    }
    wake();
  }

  function chooseFinish(id) {
    manual = true;
    var i = finishes.indexOf(id);
    if (i < 0) return;
    if (root.CardableAudio) root.CardableAudio.shimmer(i);
    root.gsap.to(surface, {
      p: i,
      duration: C.motion.reduced ? 0 : 0.8,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => setSurface(surface.p)
    });
    var follow = $('[data-finish-follow]');
    if (follow) follow.setAttribute('aria-pressed', 'false');
    writeState({ finish: id });
  }

  function cardData(id) {
    selected = id;
    var card = C.card(id), rarity = C.rarity(card.rarity), instance = sample(id);
    var gen = C.data.generations.find(g => g.id === card.generation);
    all('[data-selected-name],[data-identity-name]').forEach(el => el.textContent = card.name);
    all('[data-selected-rarity]').forEach(el => el.textContent = rarity.name.toUpperCase());
    all('[data-selected-specs]').forEach(el => el.textContent = C.cardSpecs.vram(card) + ' ' + C.cardSpecs.memoryType(card) + ' · ' + (gen ? gen.name : 'Generation 2'));
    all('[data-selected-serial],[data-identity-serial]').forEach(el => el.textContent = instance.serial);

    var digits = $('[data-serial-counter]');
    if (digits) {
      digits.replaceChildren();
      Array.from(instance.serial.slice(-6)).forEach(n => {
        var el = D.createElement('span');
        el.className = 'serial-digit';
        el.textContent = n;
        digits.appendChild(el);
      });
    }

    all('[data-card]').forEach(b => b.setAttribute('aria-pressed', b.dataset.card === id));
    all('.selected-object>img,.identity-object>img').forEach(img => {
      img.src = asset('previews/' + id + '.jpg');
      img.alt = card.name + ', demo collection';
    });
  }

  function selectCard(button, replace) {
    var id = button.dataset.card, source = button.querySelector('img').getBoundingClientRect();
    if (selectionTween) selectionTween.kill();
    flipManual = false;
    flip.angle = 0;
    addPulse(0.35, -0.15);
    if (root.CardableAudio) root.CardableAudio.tick(920, 0.03, 0.08);
    cardData(id);
    mount(id);
    if (journey) {
      var end = current === 5 ? poses.identity : poses.collection;
      if (end && !C.motion.reduced) {
        var motion = { x: source.left, y: source.top, w: source.width, r: -4 };
        selectionTween = root.gsap.to(motion, {
          x: end.x, y: end.y, w: end.w, r: 0,
          duration: 0.65,
          ease: 'power3.inOut',
          onUpdate: () => place(motion, 1),
          onComplete: () => { selectionTween = null; draw(); }
        });
      } else draw();
    } else pagePose();
    root.gsap.fromTo('.selected-data', { opacity: 0.3, y: 10 }, { opacity: 1, y: 0, duration: C.motion.reduced ? 0 : 0.35, overwrite: true });
    writeState({ card: id }, replace);
    wake();
  }

  function filterCollection(replace) {
    var filter = $('[data-filter][aria-pressed=true]'), rarity = filter ? filter.dataset.filter : 'all';
    var vendorFilter = $('[data-vendor][aria-pressed=true]'), vendor = vendorFilter ? vendorFilter.dataset.vendor : 'all';
    var search = $('.catalog-search'), query = search ? search.value.trim().toLowerCase() : '';
    var before = all('.collection-wall li:not([hidden])').map(el => ({ el: el, b: el.getBoundingClientRect() }));

    all('.collection-wall li').forEach(li => {
      var btn = li.querySelector('[data-card]');
      var cardId = btn ? btn.dataset.card : '';
      var card = C.card(cardId);
      var matchRarity = rarity === 'all' || li.dataset.rarity === rarity;
      var matchVendor = vendor === 'all' || (
        vendor === 'nvidia' && (cardId.startsWith('geforce') || cardId.startsWith('titan'))
      ) || (
        vendor === 'amd' && cardId.startsWith('radeon')
      ) || (
        vendor === 'intel' && cardId.startsWith('intel')
      ) || (
        vendor === 'apple' && cardId.startsWith('apple')
      );
      var haystack = [card.name, C.cardSpecs.vram(card), C.cardSpecs.memoryType(card), card.specs && card.specs.cores].join(' ').toLowerCase();
      var matchQuery = !query || haystack.includes(query);
      li.hidden = !(matchRarity && matchVendor && matchQuery);
    });

    var visible = all('.collection-wall li:not([hidden])'), result = $('.collection-result');
    if (result) result.textContent = visible.length + ' cards on display';
    var empty = $('.empty-note');
    if (empty) empty.hidden = visible.length > 0;

    if (visible.length && !visible.some(li => li.querySelector('[data-card]').dataset.card === selected)) {
      selectCard(visible[0].querySelector('[data-card]'), replace);
    }
    if (!C.motion.reduced) {
      before.forEach(item => {
        if (item.el.hidden) return;
        var b = item.el.getBoundingClientRect();
        root.gsap.fromTo(item.el, { x: item.b.left - b.left, y: item.b.top - b.top }, { x: 0, y: 0, duration: 0.45, ease: 'power3.out', overwrite: true });
      });
    }
    writeState({ rarity: rarity, vendor: vendor, search: query }, replace);
    if (journey) measure();
  }

  function turnCard() {
    if (!subject) return;
    flipManual = true;
    addPulse(-0.3, 0.1);
    if (root.CardableAudio) root.CardableAudio.flip();
    root.gsap.to(flip, {
      angle: flip.angle > 90 ? 0 : 180,
      duration: C.motion.reduced ? 0 : 0.65,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        if (journey) draw(); else pagePose();
        wake();
      }
    });
  }

  function dismissScrollCue() {
    if (scrollCueDismissed) return;
    scrollCueDismissed = true;
    var cue = $('.journey-cue');
    if (cue) {
      cue.style.opacity = '0';
      cue.style.pointerEvents = 'none';
    }
  }

  function writeState(values, replace) {
    if (restore) return;
    var url = new URL(location.href);
    Object.keys(values).forEach(k => {
      if (!values[k] || values[k] === 'all' || values[k] === 'normal' || values[k] === 'shelf' || values[k] === hero) {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, values[k]);
      }
    });
    if (url.href !== location.href) {
      history[replace ? 'replaceState' : 'pushState'](journey ? { position: position } : null, '', url.href);
    }
  }

  function restoreState() {
    restore = true;
    var p = new URLSearchParams(location.search), id = p.get('card');
    if (ids.includes(id)) cardData(id); else cardData(hero);
    paused = p.get('motion') === 'paused';
    D.documentElement.classList.toggle('motion-paused', paused);
    var pause = $('.motion-toggle');
    if (pause) {
      pause.setAttribute('aria-pressed', paused);
      pause.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
    }
    var f = p.get('finish');
    manual = finishes.includes(f);
    var follow = D.querySelector('[data-finish-follow]');
    if (follow) follow.setAttribute('aria-pressed', !manual);
    setSurface(manual ? finishes.indexOf(f) : 0);
    all('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === (p.get('rarity') || 'all')));
    all('[data-vendor]').forEach(b => b.setAttribute('aria-pressed', b.dataset.vendor === (p.get('vendor') || 'all')));
    all('button[data-layout]').forEach(b => b.setAttribute('aria-pressed', b.dataset.layout === (p.get('layout') || 'shelf')));
    var wall = $('.collection-wall');
    if (wall) wall.dataset.layout = p.get('layout') === 'grid' ? 'grid' : 'shelf';
    var search = $('.catalog-search');
    if (search) search.value = p.get('search') || '';
    if (wall) filterCollection();
    restore = false;
    if (journey) {
      if (history.state && Number.isFinite(history.state.position)) go(history.state.position, false);
      draw();
    } else pageRefresh();
  }

  function controls() {
    D.documentElement.classList.add('enhanced');
    all('.collection-card').forEach(b => {
      b.disabled = false;
      b.addEventListener('click', () => selectCard(b));
    });
    all('[data-filter]').forEach(b => b.addEventListener('click', () => {
      all('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (root.CardableAudio) root.CardableAudio.tick(1100, 0.02, 0.06);
      filterCollection();
    }));
    all('[data-vendor]').forEach(b => b.addEventListener('click', () => {
      all('[data-vendor]').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (root.CardableAudio) root.CardableAudio.tick(1100, 0.02, 0.06);
      filterCollection();
    }));
    all('button[data-layout]').forEach(b => b.addEventListener('click', () => {
      all('button[data-layout]').forEach(x => x.setAttribute('aria-pressed', x === b));
      var wall = $('.collection-wall');
      if (wall) wall.dataset.layout = b.dataset.layout;
      if (root.CardableAudio) root.CardableAudio.tick(900, 0.02, 0.06);
      root.gsap.fromTo('.collection-wall .thumb', {
        rotation: b.dataset.layout === 'grid' ? 3 : -3
      }, {
        rotation: 0,
        duration: 0.4,
        clearProps: 'transform',
        overwrite: true
      });
      writeState({ layout: b.dataset.layout });
    }));
    all('[data-finish]').forEach(b => b.addEventListener('click', () => chooseFinish(b.dataset.finish)));

    // Collection tactility: pointer-direction tilt plus neighbor separation.
    // Thumbs stay static until approached; no idle animation runs here.
    function clearNear() {
      all('.collection-wall li.is-near-prev,.collection-wall li.is-near-next').forEach(li => li.classList.remove('is-near-prev', 'is-near-next'));
    }
    var wall = $('.collection-wall');
    if (wall) {
      wall.addEventListener('pointermove', e => {
        if (C.motion.reduced || e.pointerType === 'touch') return;
        var btn = e.target.closest('.collection-card');
        var thumb = btn && btn.querySelector('.thumb');
        if (tiltThumb && tiltThumb !== thumb) tiltThumb.style.transform = '';
        tiltThumb = thumb;
        if (!thumb) return;
        var r = thumb.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        thumb.style.transform = 'perspective(700px) rotateX(' + (-y * 9).toFixed(2) + 'deg) rotateY(' + (x * 12).toFixed(2) + 'deg)';
      });
      wall.addEventListener('pointerleave', () => {
        if (tiltThumb) tiltThumb.style.transform = '';
        tiltThumb = null;
        clearNear();
      });
      wall.addEventListener('pointerover', e => {
        if (e.pointerType === 'touch') return;
        var btn = e.target.closest('.collection-card');
        clearNear();
        if (!btn) return;
        var li = btn.closest('li');
        if (li && li.previousElementSibling && !li.previousElementSibling.hidden) li.previousElementSibling.classList.add('is-near-prev');
        if (li && li.nextElementSibling && !li.nextElementSibling.hidden) li.nextElementSibling.classList.add('is-near-next');
      });
    }

    var fc = $('.finish-controls');
    if (fc) {
      all('[data-finish]').forEach((button, i) => {
        button.dataset.number = String(i + 1).padStart(2, '0');
      });
      var edition = D.createElement('p');
      edition.className = 'finish-edition micro';
      edition.textContent = (finishes.length - 1) + ' OF ' + C.data.variants.length + ' COATINGS SHOWN · DEMO CARD';
      fc.parentNode.appendChild(edition);
    }
    if (fc && journey) {
      var follow = D.createElement('button');
      follow.dataset.finishFollow = '';
      follow.textContent = 'Follow scroll';
      follow.setAttribute('aria-pressed', 'true');
      fc.appendChild(follow);
      follow.addEventListener('click', () => {
        manual = false;
        follow.setAttribute('aria-pressed', 'true');
        writeState({ finish: '' });
        if (journey) draw();
      });
    }

    all('#flip-reveal,#flip-collection,#flip-identity').forEach(b => b.addEventListener('click', turnCard));
    var search = $('.catalog-search');
    if (search) search.addEventListener('input', () => filterCollection(true));

    // Copy to clipboard actions for serials and checksums
    D.addEventListener('click', function(e) {
      var copyBtn = e.target.closest('[data-copy],[data-copy-target]');
      if (!copyBtn) return;
      var text = copyBtn.dataset.copy;
      if (!text) {
        var targetEl = D.querySelector(copyBtn.dataset.copyTarget);
        if (targetEl) text = targetEl.textContent.trim();
      }
      if (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('Copied: ' + text);
            if (root.CardableAudio) root.CardableAudio.tick(1200, 0.03, 0.1);
          }).catch(() => {
            showToast('Clipboard unavailable — select the serial instead.');
          });
        } else {
          showToast('Clipboard unavailable — select the serial instead.');
        }
      }
    });

    // A quiet header at arrival, a legible shaded header over the later rooms.
    var header = $('.site-header'), menu = D.createElement('button');
    var headerNav = header.querySelector('nav');
    if (headerNav) headerNav.id = 'site-navigation';
    function shadeHeader() { header.classList.toggle('has-scrolled', root.scrollY > 24); }
    shadeHeader();
    root.addEventListener('scroll', shadeHeader, { passive: true });
    menu.className = 'menu-toggle enhanced-control';
    menu.textContent = '≡';
    menu.type = 'button';
    menu.setAttribute('aria-controls', 'site-navigation');
    menu.setAttribute('aria-label', 'Open navigation');
    menu.setAttribute('aria-expanded', 'false');
    var headerActions = header.querySelector('.header-actions');
    if (headerActions) headerActions.prepend(menu);
    function setMenu(open) {
      header.classList.toggle('nav-open', open);
      menu.textContent = open ? '✕' : '≡';
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    menu.addEventListener('click', () => setMenu(!header.classList.contains('nav-open')));
    D.addEventListener('pointerdown', e => {
      if (header.classList.contains('nav-open') && !header.contains(e.target)) setMenu(false);
    });
    D.addEventListener('keydown', e => {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) {
        setMenu(false);
        menu.focus();
      }
    });
    root.addEventListener('resize', () => {
      if (root.innerWidth > 760) setMenu(false);
    }, { passive: true });

    // Motion pause toggle
    var pause = $('.motion-toggle');
    if (pause) {
      pause.hidden = C.motion.reduced;
      pause.addEventListener('click', () => {
        paused = !paused;
        pause.setAttribute('aria-pressed', paused);
        pause.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
        pause.querySelector('span').textContent = paused ? '▶' : 'Ⅱ';
        D.documentElement.classList.toggle('motion-paused', paused);
        if (paused) { stopWatch(); stopClock(); } else wake();
        writeState({ motion: paused ? 'paused' : '' });
      });
    }

    // Viewport-wide pointer tracking with gentle damping
    D.addEventListener('pointermove', e => {
      if (C.motion.reduced || e.pointerType === 'touch') return;
      poke();
      var w = root.innerWidth, h = root.innerHeight;
      pointer.targetX = clamp(e.clientX / w) * 2 - 1;
      pointer.targetY = clamp(e.clientY / h) * 2 - 1;

      if (subject && subject.view) {
        subject.view.pointer({ pointer: { x: e.clientX, y: e.clientY } });
      }
      wake();
    });

    D.addEventListener('pointerleave', () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
      wake();
    });

    D.addEventListener('focusin', e => {
      if (!journey) return;
      var panel = e.target.closest('[data-chapter]'), ch = chapters.find(item => item.el === panel);
      if (ch && position < ch.start + ch.length * 0.16) go(ch.start + ch.length * 0.18, false);
    });

    root.addEventListener('popstate', restoreState);
    D.addEventListener('visibilitychange', () => {
      D.documentElement.classList.toggle('site-hidden', D.hidden);
      if (D.hidden) {
        stopWatch(); stopClock(); releaseFilm();
        if (subject) subject.suspend();
      } else {
        if (subject) subject.resume();
        if (journey) draw(); else pageRefresh();
        wake();
      }
    });

    root.addEventListener('wheel', () => { dismissScrollCue(); stopWatch(); poke(); }, { passive: true });
    root.addEventListener('touchstart', () => { dismissScrollCue(); stopWatch(); poke(); }, { passive: true });
    root.addEventListener('scroll', () => { if (root.scrollY > 80) dismissScrollCue(); poke(); }, { passive: true });
    root.addEventListener('pagehide', () => { stopClock(); releaseFilm(); if (subject) subject.suspend(); });
    root.addEventListener('pageshow', () => { if (subject) subject.resume(); if (journey) draw(); else pageRefresh(); });
    C.events.on('motion:changed', () => location.reload());
    poke();
  }

  function place(p, alpha) {
    if (!subjectHost || !p) return;
    var scale = p.w / 500;
    subjectHost.style.transform = 'translate3d(' + (p.x + p.w / 2) + 'px,' + (p.y + p.w * 0.7) + 'px,0) rotate(' + p.r + 'deg) scale(' + scale + ') translate(-250px,-350px)';
    subjectHost.style.opacity = alpha;
    subjectHost.style.pointerEvents = alpha > 0.1 ? 'auto' : 'none';
    subjectHost.inert = alpha < 0.1;
  }

  function blend(a, b, p) {
    return {
      x: mix(a.x, b.x, p),
      y: mix(a.y, b.y, p),
      w: mix(a.w, b.w, p),
      r: mix(a.r, b.r, p)
    };
  }

  function bounds(selector, r) {
    var el = $(selector);
    if (!el) return { x: 0, y: 0, w: 300, r: 0 };
    var b = el.getBoundingClientRect(), w = el.clientWidth;
    return { x: b.left + b.width / 2 - w / 2, y: b.top + b.height / 2 - w * 0.7, w: w, r: r || 0 };
  }

  function measure() {
    if (!journey) return;
    var vh = root.innerHeight;
    D.querySelector('#story').style.height = (chapters[chapters.length - 1].end * vh + vh) + 'px';
    chapters.forEach(ch => ch.marker.style.top = ch.start * vh + 'px');
    poses.arrival = bounds('.hero-object', -7);
    poses.ritual = {
      x: root.innerWidth * 0.54 - Math.min(root.innerWidth * 0.30, vh * 0.52) * 0.43,
      y: vh * 0.56 - Math.min(root.innerWidth * 0.30, vh * 0.52) * 0.43 * 1.4,
      w: Math.min(root.innerWidth * 0.30, vh * 0.52) * 0.86,
      r: 0
    };
    if (root.innerWidth <= 760) {
      poses.ritual = {
        x: root.innerWidth * 0.5 - Math.min(root.innerWidth * 0.56, vh * 0.34) * 0.43,
        y: vh * 0.53 - Math.min(root.innerWidth * 0.56, vh * 0.34) * 0.43 * 1.4,
        w: Math.min(root.innerWidth * 0.56, vh * 0.34) * 0.86,
        r: 0
      };
    }
    poses.reveal = bounds('.reveal-object', 0);
    poses.finishes = bounds('.finish-object', -4);
    poses.collection = bounds('.selected-object', 0);
    poses.identity = bounds('.identity-object', 8);
    var w = Math.min(root.innerWidth * (root.innerWidth <= 760 ? 0.48 : 0.28), vh * 0.36);
    poses.world = { x: root.innerWidth / 2 - w / 2, y: vh * 0.51 - w * 0.7, w: w, r: 0 };
    poses.final = { x: root.innerWidth / 2 - w / 2, y: vh * 0.85, w: w * 0.65, r: -8 };
    poses.support1 = bounds('.support-one', -16);
    poses.support2 = bounds('.support-two', 12);
    // Deliberate bleed: foreground cards leave the viewport instead of stopping at its edge.
    poses.support1.x -= root.innerWidth * 0.05;
    poses.support2.x += root.innerWidth * 0.06;
    if (pack) pack.resize();
    draw();
  }

  function makePack() {
    var host = D.createElement('div');
    host.className = 'journey-pack';
    viewport.appendChild(host);
    var glassHost = D.createElement('div');
    glassHost.className = 'opening-glass';
    host.appendChild(glassHost);
    var data = C.pack('rare'), unit = C.packMarkup.unit(glassHost, false, data);
    var foil = C.packMarkup.foil(host, data), cap = C.packMarkup.foil(host, data), body = C.packMarkup.foil(host, data);
    cap.classList.add('web-cap');
    body.classList.add('web-wrapper');
    var materials = [unit.el, foil, cap, body].map(el => C.packMaterial.create(el, data));

    var button = D.createElement('button');
    button.className = 'journey-cut';
    button.innerHTML = '<span>DRAG THE SEAM / ENTER TO CUT</span>';
    button.setAttribute('aria-label', 'Cut the top seal');
    host.appendChild(button);

    var dust = D.createElement('div');
    dust.className = 'journey-particles';
    host.appendChild(dust);
    var random = C.art.random(2409), flecks = [];
    for (var i = 0; i < Math.ceil(C.config.openingMotion.dissolveCount * C.settings.policy.particles); i++) {
      var bit = D.createElement('i');
      bit.style.left = ((i * 37) % 100) + '%';
      bit.style.top = ((i * 23) % 100) + '%';
      dust.appendChild(bit);
      flecks.push({
        el: bit, x: random(), y: random(),
        vx: (random() - 0.5) * C.config.openingMotion.particleSpreadPx,
        vy: -C.config.openingMotion.particleRisePx * (0.5 + random() * 0.5),
        life: C.config.openingMotion.particleMinMs + random() * (C.config.openingMotion.particleMaxMs - C.config.openingMotion.particleMinMs),
        rotation: (random() - 0.5) * C.config.openingMotion.particleRotationDegrees
      });
    }
    var packWidth = 0, packHeight = 0;
    var drag = null, hasPopped = false;

    button.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      var b = host.getBoundingClientRect();
      drag = { id: e.pointerId, min: clamp((e.clientX - b.left) / b.width), max: clamp((e.clientX - b.left) / b.width) };
      try { button.setPointerCapture(e.pointerId); } catch(err) {}
      dismissScrollCue();
      if (root.CardableAudio) root.CardableAudio.tear(0.04);
    });

    button.addEventListener('pointermove', e => {
      if (!drag || drag.done || drag.id !== e.pointerId) return;
      var b = host.getBoundingClientRect(), x = clamp((e.clientX - b.left) / b.width);
      drag.min = Math.min(drag.min, x);
      drag.max = Math.max(drag.max, x);
      var p = clamp((drag.max - drag.min) / C.config.cut.autoFinishSpan);
      go(chapters[1].start + chapters[1].length * (0.52 + 0.22 * p), false);
      if (root.CardableAudio) root.CardableAudio.tear(0.02 + p * 0.08);
      if (p >= 0.99) {
        drag.done = true;
        if (!hasPopped && root.CardableAudio) { root.CardableAudio.unseal(); hasPopped = true; }
        go(chapters[1].start + chapters[1].length * 0.82, true);
      }
    });

    button.addEventListener('pointerup', () => { drag = null; });
    button.addEventListener('pointercancel', () => { drag = null; });
    button.addEventListener('click', e => {
      if (e.detail === 0) {
        if (!hasPopped && root.CardableAudio) { root.CardableAudio.unseal(); hasPopped = true; }
        go(chapters[1].start + chapters[1].length * 0.9, true);
      }
    });

    function resize() {
      packWidth = host.offsetWidth;
      packHeight = host.offsetHeight;
      var split = C.cutGeometry.finish(
        [{ x: 0, y: C.config.cut.guideY }, { x: 1, y: C.config.cut.guideY }],
        host.offsetWidth, host.offsetHeight,
        { axis: 'x', lineY: C.config.cut.guideY, minY: C.config.cut.guideY, maxY: C.config.cut.guideY }
      );
      cap.style.clipPath = C.cutGeometry.polygon(split.halves[0]);
      body.style.clipPath = C.cutGeometry.polygon(split.halves[1]);
    }

    return {
      host: host,
      resize: resize,
      paint: function(p) {
        var ease = n => 1 - Math.pow(1 - clamp(n), 3), cfg = C.config.openingMotion;
        var fill = clamp((p - 0.16) / 0.26), dissolve = ease((p - 0.42) / 0.1);
        var cut = p < 0.74 ? clamp((p - 0.52) / 0.22) * C.config.cut.autoFinishSpan : mix(C.config.cut.autoFinishSpan, 1, smooth((p - 0.74) / 0.02));
        var tear = clamp((p - 0.76) / 0.14) * (cfg.tearMs + cfg.splitMs + cfg.fallMs);
        var lift = ease(tear / cfg.tearMs), separation = ease((tear - cfg.tearMs) / cfg.splitMs), fall = ease((tear - cfg.tearMs - cfg.splitMs) / cfg.fallMs);
        var gap = cfg.separationMinPx * lift + (cfg.separationMaxPx - cfg.separationMinPx) * separation;

        host.inert = p <= 0 || p >= 1;
        host.setAttribute('aria-hidden', p <= 0 || p >= 1);
        host.style.opacity = smooth(p / 0.16) * (1 - smooth((p - 0.9) / 0.1));
        host.style.transform = 'translate(-50%,-50%) rotateY(' + mix(-12, 0, smooth(p / 0.3)) + 'deg) rotateX(' + mix(7, 0, smooth(p / 0.4)) + 'deg)';

        glassHost.style.opacity = 1 - dissolve;
        glassHost.style.transform = 'translateY(' + (-dissolve * 8) + 'px) scale(' + (1 + dissolve * 0.02) + ')';
        unit.fluid.style.transform = 'translateY(' + ((1 - fill) * 100) + '%)';
        unit.el.style.setProperty('--fluid-top', (1 - fill) * 100 + '%');
        unit.el.style.setProperty('--charge-leak', fill * fill);
        unit.el.style.setProperty('--meniscus-wave', Math.sin(fill * 3000 / cfg.waveMs * Math.PI * 2) * (cfg.meniscusPx + clamp((fill - cfg.chargeAgitationAt) / (1 - cfg.chargeAgitationAt)) * cfg.agitationPx) + 'px');
        unit.el.dataset.chargeFill = fill;

        var vibration = clamp((fill - cfg.vibrationAt) / (1 - cfg.vibrationAt)) * cfg.vibrationPx * (1 - dissolve);
        unit.pose.style.transform = 'translate(' + Math.sin(fill * 3 * cfg.vibrationHz * Math.PI * 2) * vibration + 'px,' + Math.cos(fill * 3 * cfg.vibrationHz * Math.PI * 2) * vibration * 0.5 + 'px)';
        unit.specks.forEach(s => s.el.style.transform = 'translateY(' + (-((fill * 3 * cfg.speckSpeedPx + s.phase * cfg.speckSpeedPx) % packHeight)) + 'px)');

        foil.style.opacity = p < 0.76 ? dissolve : 0;
        foil.style.transform = 'translateY(' + (-Math.sin(cut * Math.PI) * cfg.cutRecoilPx) + 'px) rotate(' + Math.sin(cut * Math.PI) * cfg.cutRecoilDegrees + 'deg)';
        [cap, body].forEach((el, i) => {
          var side = i === 0 ? -1 : 1;
          el.style.opacity = p >= 0.76 ? 1 - fall : 0;
          el.style.transform = 'translate3d(' + (i === 0 ? cfg.capSidePx * separation : 0) + 'px,' + (side * gap + fall * (i === 0 ? cfg.fallMinPx : cfg.fallMaxPx)) + 'px,0) rotate(' + (side * (i === 0 ? cfg.capPeelDegrees : cfg.rotationDegrees) * separation) + 'deg)';
        });

        host.style.setProperty('--cut', cut);
        host.dataset.cutReady = p >= 0.52 && p < 0.76;
        materials.forEach(m => m.update({ rx: mix(7, 0, smooth(p / 0.4)), ry: mix(-12, 0, smooth(p / 0.3)) }, performance.now(), false));

        dust.style.opacity = 1;
        flecks.forEach((bit, i) => {
          var tearing = p >= 0.76, age = tearing ? tear : clamp((p - 0.42) / 0.1) * cfg.dissolveMs;
          var progress = clamp(age / bit.life), seconds = age / 1000, vx = bit.vx, vy = bit.vy;
          if (tearing) { vy = (i % 2 ? 1 : -1) * cfg.fleckSpeedPx * 0.75 - cfg.fleckSpeedPx * 0.375; }
          bit.el.style.left = '0';
          bit.el.style.top = '0';
          bit.el.style.width = (cfg.fleckMinPx + (i % 4) / 3 * (cfg.fleckMaxPx - cfg.fleckMinPx)) + 'px';
          bit.el.style.height = cfg.fleckMinPx + 'px';
          bit.el.style.transform = 'translate3d(' + (bit.x * packWidth + vx * seconds) + 'px,' + ((tearing ? C.config.cut.guideY : bit.y) * packHeight + vy * seconds + (tearing ? cfg.gravityPx * seconds * seconds * 0.5 : 0)) + 'px,0) rotate(' + bit.rotation * progress + 'deg)';
          bit.el.style.opacity = (p >= 0.42 && p < 0.9 ? Math.sin(progress * Math.PI) * cfg.particleOpacity : 0);
        });

        var status = $('.ritual-status');
        if (status) status.textContent = p < 0.16 ? 'SEALED' : p < 0.42 ? 'HOLD' : p < 0.52 ? 'DISSOLVE' : p < 0.76 ? 'CUT' : 'UNSEALED';
        all('[data-beat]').forEach(el => el.style.color = (el.dataset.beat === (p < 0.52 ? 'hold' : p < 0.9 ? 'cut' : 'reveal')) ? '#f5f5f7' : '#55555c');
      }
    };
  }

  function setupJourney() {
    journey = true;
    if (root.innerWidth <= 760) lengths = lengths.map((n, i) => n * (i === 1 ? 0.62 : i === 2 ? 0.6 : 0.72));
    D.documentElement.classList.add('journey-mode');
    var main = $('#story'), worlds = $('#worlds'), panels = all('.scene').filter(el => el.id !== 'finale' && el.id !== 'install'), worldPanels = all('.world-panel');
    panels = panels.filter(el => el.id !== 'worlds');
    panels.push(worlds, ...worldPanels, $('#install'), $('#finale'));

    viewport = D.createElement('div');
    viewport.className = 'journey-viewport';
    main.prepend(viewport);
    var markers = D.createElement('div');
    markers.className = 'journey-markers';
    main.appendChild(markers);
    var at = 0;

    panels.forEach((el, i) => {
      var id = el.id;
      el.id = id + '-panel';
      el.dataset.chapter = id;
      viewport.appendChild(el);
      var marker = D.createElement('div');
      marker.id = id;
      marker.className = 'journey-marker';
      markers.appendChild(marker);
      chapters.push({ el: el, marker: marker, id: id, start: at, length: lengths[i], end: at + lengths[i], name: names[i] });
      at += lengths[i];
    });

    stageWorld = D.createElement('div');
    stageWorld.className = 'journey-world';
    var poster = D.createElement('img');
    poster.alt = '';
    poster.src = asset('previews/world-exotic.jpg');
    stageWorld.appendChild(poster);
    viewport.prepend(stageWorld);

    var atmosphere = D.createElement('div');
    atmosphere.className = 'journey-atmosphere';
    viewport.prepend(atmosphere);

    // Worlds gate backdrop: the four authored posters breathe behind the index.
    var gateChapter = chapters.find(function(ch) { return ch.id === 'worlds'; });
    if (gateChapter) {
      var veil = D.createElement('div');
      veil.className = 'journey-worlds-veil';
      veil.setAttribute('aria-hidden', 'true');
      ['legendary', 'mythical', 'exotic', 'ascendant'].forEach(function(id) {
        var img = D.createElement('img');
        img.src = asset('previews/world-' + id + '.jpg');
        img.alt = '';
        img.loading = 'lazy';
        veil.appendChild(img);
      });
      gateChapter.el.prepend(veil);

      // A quiet catalog card establishes the scale before the authored worlds arrive.
      var first = C.card('geforce-gt-710'), baseline = D.createElement('div');
      baseline.className = 'rarity-baseline';
      var firstPoster = D.createElement('img');
      firstPoster.src = asset('previews/' + first.id + '.jpg');
      firstPoster.alt = C.rarity(first.rarity).name + ' ' + first.name + ' demonstration card';
      var firstCopy = D.createElement('div');
      var firstLabel = D.createElement('span');
      firstLabel.className = 'micro';
      firstLabel.textContent = C.rarity(first.rarity).name.toUpperCase() + ' / ' + first.name;
      var firstLine = D.createElement('p');
      firstLine.textContent = 'Even the familiar has a serial.';
      firstCopy.append(firstLabel, firstLine);
      baseline.append(firstPoster, firstCopy);
      gateChapter.el.appendChild(baseline);
    }

    subjectHost = D.createElement('div');
    subjectHost.className = 'journey-object';
    viewport.appendChild(subjectHost);
    mount(hero);
    pack = makePack();

    // The card's real engraved back and sealed Rare pack sit behind the live face.
    // Both are product artifacts, not additional implied pulls.
    [['.support-one', 'card-back.jpg'], ['.support-two', 'rare-pack.jpg']].forEach(([selector, image]) => {
      var el = $(selector).cloneNode(true);
      el.className = 'journey-support journey-support-' + (image === 'card-back.jpg' ? 'back' : 'pack');
      var poster = el.querySelector('img');
      poster.src = asset('previews/' + image);
      poster.alt = '';
      el.setAttribute('aria-hidden', 'true');
      viewport.appendChild(el);
    });

    var cue = D.createElement('div');
    cue.className = 'journey-cue';
    cue.innerHTML = '<span>SCROLL TO UNSEAL</span> <i class="cue-arrow">↓</i>';
    viewport.appendChild(cue);

    var progress = D.createElement('nav');
    progress.className = 'journey-progress';
    progress.setAttribute('aria-label', 'Explore the Cardable journey');
    progress.innerHTML = '<button type="button" aria-label="Previous chapter">←</button>' +
      '<select aria-label="Choose a chapter">' + chapters.map((ch, i) => '<option value="' + i + '">' + ch.name + '</option>').join('') + '</select>' +
      '<input type="range" min="0" max="1000" value="0" aria-label="Scrub the entire journey">' +
      '<output>01 / ARRIVAL</output>' +
      '<button type="button" aria-label="Next chapter">→</button>';
    D.body.appendChild(progress);

    progress.querySelectorAll('button')[0].addEventListener('click', () => {
      if (root.CardableAudio) root.CardableAudio.tick(900, 0.02, 0.06);
      navigate(Math.max(0, current - 1));
    });
    progress.querySelectorAll('button')[1].addEventListener('click', () => {
      if (root.CardableAudio) root.CardableAudio.tick(900, 0.02, 0.06);
      navigate(Math.min(chapters.length - 1, current + 1));
    });
    progress.querySelector('select').addEventListener('change', e => navigate(Number(e.target.value)));
    progress.querySelector('input').addEventListener('input', e => go(Number(e.target.value) / 1000 * chapters[chapters.length - 1].end, false));

    worldPanels.forEach(panel => filmControls(panel));

    root.gsap.registerPlugin(root.ScrollTrigger);
    journeyTrigger = root.ScrollTrigger.create({
      trigger: main,
      start: 'top top',
      end: () => '+=' + chapters[chapters.length - 1].end * root.innerHeight,
      onUpdate: t => {
        position = t.progress * chapters[chapters.length - 1].end;
        if (position > 0.08) dismissScrollCue();
        draw();
      }
    });

    root.addEventListener('scroll', () => {
      progress.hidden = main.getBoundingClientRect().bottom < root.innerHeight - 40;
    }, { passive: true });

    root.addEventListener('resize', () => {
      measure();
      root.ScrollTrigger.refresh();
    }, { passive: true });

    D.addEventListener('keydown', e => {
      if (e.target.matches('input,select,button,a,summary') || e.altKey || e.ctrlKey || e.metaKey) return;
      poke();
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(Math.min(chapters.length - 1, current + 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(Math.max(0, current - 1));
      }
      if (e.key.toLowerCase() === 'f' && (current === 0 || current === 2 || current === 3 || current === 4 || current === 5)) {
        e.preventDefault();
        turnCard();
      }
      if (e.key === ' ' && current >= 7 && current <= 10) {
        e.preventDefault();
        var watchBtn = chapters[current].el.querySelector('[data-world-watch]');
        if (watchBtn) watchBtn.click();
      }
      if (['1','2','3','4','5'].includes(e.key) && (current === 3 || page === 'collection')) {
        e.preventDefault();
        chooseFinish(finishes[Number(e.key) - 1]);
      }
    });

    D.addEventListener('click', e => {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var target = chapters.find(ch => '#' + ch.id === a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        history.pushState(null, '', '#' + target.id);
        go(target.start + target.length * 0.18, true);
      }
    });

    measure();
  }

  function navigate(index) {
    var ch = chapters[index], p = ch.start + ch.length * 0.18;
    history.pushState({ position: p }, '', '#' + ch.id);
    go(p, true);
  }

  function go(value, animate) {
    stopWatch();
    dismissScrollCue();
    var target = Math.max(0, Math.min(chapters[chapters.length - 1].end, value));
    root.scrollTo({
      top: $('#story').offsetTop + target * root.innerHeight,
      behavior: animate && !C.motion.reduced ? 'smooth' : 'instant'
    });
  }

  function stopWatch() {
    autoplay = false;
    all('[data-world-watch]').forEach(b => b.textContent = 'Watch');
  }

  function filmControls(panel) {
    var controls = D.createElement('div');
    controls.className = 'world-scrub enhanced-control';
    controls.innerHTML = '<span class="micro" data-film-stage>SCROLL THROUGH THE FILM</span>' +
      '<button type="button" class="quiet-button" data-world-watch>Watch</button>' +
      '<button type="button" class="quiet-button" data-world-replay aria-label="Replay ' + panel.dataset.world + ' world">↻</button>' +
      '<input type="range" min="0" max="1000" value="0" aria-label="Scrub ' + panel.dataset.world + ' cutscene">';
    panel.appendChild(controls);
    var index = chapters.findIndex(ch => ch.el === panel);

    controls.querySelector('input').addEventListener('input', e => {
      stopWatch();
      if (journey) {
        var ch = chapters[index];
        go(ch.start + ch.length * (0.1 + Number(e.target.value) / 1000 * 0.8), false);
      } else {
        var total = filmDuration(C.cutscenes.timeline(C.rarity(panel.dataset.world).openingIntro));
        showPageWorld(panel, total * Number(e.target.value) / 1000);
      }
    });

    controls.querySelector('[data-world-watch]').addEventListener('click', () => {
      if (C.motion.reduced) return;
      if (autoplay) { stopWatch(); return; }
      if (paused) {
        paused = false;
        $('.motion-toggle').setAttribute('aria-pressed', 'false');
        D.documentElement.classList.remove('motion-paused');
      }
      if (root.CardableAudio) root.CardableAudio.aura(panel.dataset.world);
      if (journey && (current !== index || position >= chapters[index].start + chapters[index].length * 0.89)) {
        go(chapters[index].start + 0.1 * chapters[index].length, false);
      } else if (!journey) {
        showPageWorld(panel, filmId === panel.dataset.world && filmTime < filmDuration(film.timeline) ? filmTime : 0);
      }
      autoplay = true;
      controls.querySelector('[data-world-watch]').textContent = 'Pause';
      wake();
    });

    controls.querySelector('[data-world-replay]').addEventListener('click', () => {
      if (root.CardableAudio) root.CardableAudio.tick(700, 0.02, 0.08);
      if (journey) go(chapters[index].start + 0.1 * chapters[index].length, false);
      else showPageWorld(panel, 0);
    });
  }

  function draw() {
    if (!journey || D.hidden || !poses.arrival) return;
    var total = chapters[chapters.length - 1].end;
    current = Math.min(chapters.length - 1, chapters.findIndex(ch => position < ch.end));
    if (current < 0) current = chapters.length - 1;
    var ch = chapters[current], p = clamp((position - ch.start) / ch.length), transition = smooth(p / 0.16);

    // Text dissolves slowly so the card passes OVER type; control clusters leave fast.
    var leaving = chapters[current - 1];
    var linger = leaving && (leaving.id === 'finishes' || leaving.id === 'collection' || leaving.id === 'install') ? 0.05 : 0.12;
    chapters.forEach((item, i) => {
      var opacity = i === current ? smooth((p - 0.02) / 0.16) : i === current - 1 ? 1 - smooth(p / linger) : 0;
      if (i === current && item.id === 'worlds') opacity = smooth((p - 0.015) / 0.15);
      if (current === 0 && i === 0) opacity = 1;
      item.el.style.opacity = opacity;
      // Control clusters and big headlines must not ghost over the incoming scene.
      var clusters = item.el.querySelectorAll('.world-scrub,.finish-controls,.collection-toolbar,.identity-actions');
      for (var ci = 0; ci < clusters.length; ci++) clusters[ci].style.opacity = i === current - 1 ? 1 - smooth(p / 0.05) : '';
      var heads = item.el.querySelectorAll('h1,h2,.world-caption h3');
      for (var hi = 0; hi < heads.length; hi++) heads[hi].style.opacity = i === current - 1 ? 1 - smooth(p / 0.06) : '';
      item.el.classList.toggle('is-active', i === current);
      item.el.inert = i !== current;
      item.el.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });

    // The arrival begins already composed. Later chapter type can travel with the object.
    if (!C.motion.reduced && (current <= 6 || current >= 11)) {
      var titles = ch.el.querySelectorAll('h1,h2,.eyebrow');
      var travel = current === 0 ? 18 : 24;
      for (var ti = 0; ti < titles.length; ti++) titles[ti].style.transform = 'translateY(' + Math.round(-p * travel) + 'px)';
    }

    var nav = $('.journey-progress');
    if (nav) {
      nav.querySelector('input').value = Math.round(position / total * 1000);
      nav.querySelector('select').value = current;
      nav.querySelector('output').textContent = String(current + 1).padStart(2, '0') + ' / ' + ch.name.toUpperCase();
      nav.querySelectorAll('button')[0].disabled = current === 0;
      nav.querySelectorAll('button')[1].disabled = current === chapters.length - 1;
    }
    if (position > 0.08) dismissScrollCue();
    viewport.dataset.chapter = ch.id;

    var baseline = $('.rarity-baseline'), worldIndex = $('.worlds .world-index'), gate = $('.worlds.scene');
    if (baseline && worldIndex && gate) {
      var inGate = current === 6;
      var baselineOpacity = inGate ? smooth(p / 0.12) * (1 - smooth((p - 0.2) / 0.11)) : 0;
      baseline.style.opacity = baselineOpacity;
      baseline.setAttribute('aria-hidden', baselineOpacity < 0.2 ? 'true' : 'false');
      gate.style.setProperty('--veil-strength', inGate ? smooth((p - 0.18) / 0.22) : 1);
      worldIndex.style.opacity = inGate ? smooth((p - 0.18) / 0.18) : '';
      if (inGate && p < 0.25 && worldIndex.contains(D.activeElement)) $('.journey-progress select').focus();
      worldIndex.inert = inGate && p < 0.25;
      worldIndex.setAttribute('aria-hidden', inGate && p < 0.25 ? 'true' : 'false');
    }

    var vh = root.innerHeight;
    var ascId = ids.find(function(id) { return C.card(id).rarity === 'ascendant'; });
    var target = current <= 3 ? hero : current <= 6 ? selected : current <= 10 ? ids.find(id => C.card(id).rarity === ch.el.dataset.world) || selected : ascId;
    mount(target);

    var fieldW = Math.min(root.innerWidth * 0.24, vh * 0.34);
    var fieldPose = { x: root.innerWidth / 2 - fieldW / 2, y: vh * 0.36 - fieldW * 0.7, w: fieldW, r: -4 };
    var belowPose = { x: root.innerWidth / 2 - fieldW / 2, y: vh + 40 - fieldW * 0.7, w: fieldW, r: -4 };
    var arrivalEnd = Object.assign({}, poses.arrival, {
      w: poses.arrival.w * 0.88,
      y: poses.arrival.y - 50
    });

    var pose = current === 0 ? poses.arrival :
               current === 1 ? blend(arrivalEnd, poses.ritual, smooth(p / 0.16)) :
               current === 2 ? blend(poses.ritual, poses.reveal, smooth(p / 0.45)) :
               current === 3 ? blend(poses.reveal, poses.finishes, transition) :
               current === 4 ? blend(poses.finishes, poses.collection, transition) :
               current === 5 ? blend(poses.collection, poses.identity, transition) :
               current === 6 ? blend(poses.identity, poses.world, smooth(p / 0.8)) :
               current <= 10 ? poses.world :
               current === 11 ? poses.final : blend(belowPose, fieldPose, smooth(p / 0.25));

    if (current === 0) {
      // Arrival hold: the hero recedes almost imperceptibly while supports depart.
      pose = Object.assign({}, pose);
      pose.w *= 1 - p * 0.12;
      pose.y -= p * 50;
    }

    var alpha = current === 1 ? (p < 0.6 ? 1 - smooth((p - 0.22) / 0.16) : smooth((p - 0.72) / 0.14)) :
                current === 2 ? 1 - smooth(p / 0.08) + smooth((p - 0.585) / 0.035) :
                current === 6 ? 1 - smooth((p - 0.02) / 0.15) :
                current >= 7 && current <= 10 ? 0 :
                current >= 11 ? 0 : 1;
    var angle = 0, infoMs = 4000, shine = 1;

    if (current === 1) {
      angle = 180 * smooth(p / 0.16);
      infoMs = -1;
      // Tear open: the reserved card rises out of the splitting wrapper, back first.
      var rise = smooth((p - 0.72) / 0.2);
      pose.y -= rise * 150;
      pose.r += rise * 2;
    }
    if (current === 6) {
      // Gate handoff: the card yields the center to the index and recedes right.
      pose = Object.assign({}, pose);
      var yield_ = smooth(p / 0.5);
      pose.x += root.innerWidth * 0.16 * yield_;
      pose.w *= 1 - 0.3 * yield_;
    }
    pack.paint(current === 1 ? p : current === 0 ? 0 : 1);

    var worldName = null, age = 0, worldAlpha = 0;
    if (current === 1 && p >= 0.9) {
      worldName = 'exotic'; age = clamp((p - 0.9) / 0.1) * 880; worldAlpha = smooth((p - 0.9) / 0.04);
    }
    if (current === 2) {
      worldName = 'exotic';
      var totalFilm = C.cutscenes.timeline(C.rarity(worldName).openingIntro).total;
      // The film scrubs across the first part of the chapter; the flip lands
      // on the handoff and the retained frame holds after, like the game.
      var ph = 0.62;
      age = 880 + clamp(p / ph) * (totalFilm - 880);
      worldAlpha = 1 * (1 - smooth((p - 0.94) / 0.06));
      // Settle the rise from the ritual, then flip into the handoff and hold.
      var carry = 1 - smooth(p / 0.12);
      pose.y -= carry * 150;
      pose.r += carry * 2;
      var turn = clamp((p - ph) / 0.06);
      angle = 180 * (1 - smooth(turn)) - C.config.revealMotion.flipOvershootDegrees * Math.sin(clamp((turn - 0.8) / 0.2) * Math.PI);
      infoMs = clamp((p - ph - 0.06) / 0.2) * 2500;
      shine = clamp((p - ph - 0.025) / 0.1);
      var settle = clamp((p - ph) / 0.25);
      pose.y += Math.sin(settle * Math.PI * 2) * (1 - settle) * 7;
    }
    if (current === 12) {
      // The cinematic card rises into the brightening wall and dissolves as the CTA lands.
      alpha = smooth(p / 0.1) * (1 - smooth((p - 0.12) / 0.18));
      angle = 0; infoMs = -1; shine = 0.3;
    }
    if (current >= 7 && current <= 10) {
      worldName = ch.el.dataset.world;
      var timeline = C.cutscenes.timeline(C.rarity(worldName).openingIntro), duration = filmDuration(timeline);
      age = clamp((p - 0.1) / 0.8) * duration;
      worldAlpha = 1;
      var handoff = timeline.sections.card ? timeline.sections.card.start : timeline.total;
      // Conceal the face until the handoff: the card stays back while the film runs,
      // then returns through the flip exactly as the game does.
      alpha = smooth((age - handoff + 500) / 500);
      angle = 180 * (1 - smooth((age - handoff) / 400));
      infoMs = Math.max(-1, age - handoff - 400);
      shine = clamp((age - handoff - 200) / 700);
      var scrubControls = ch.el.querySelector('.world-scrub');
      if (scrubControls) {
        scrubControls.querySelector('input').value = Math.round(age / duration * 1000);
        var part = C.rarity(worldName).openingIntro.sections.find(s => age < timeline.sections[s.id].start + s.ms) || { id: 'reveal' };
        scrubControls.querySelector('[data-film-stage]').textContent = part.id.toUpperCase() + ' / ' + Math.round(age / 1000) + 's';
      }
    }

    stageWorld.style.opacity = worldAlpha;
    if (worldName) {
      stageWorld.querySelector('img').src = asset('previews/world-' + worldName + '.jpg');
      // Dissolve from the static poster into the live film so early scroll never sits on black.
      var canvasAlpha = current >= 7 ? transition : current === 2 ? smooth((age - 880) / 1500) : 1;
      showFilm(worldName, age, stageWorld, canvasAlpha);
      viewport.style.setProperty('--world-caption', worldName === 'ascendant' && age > 28000 ? '#08080a' : '#fff');
    } else if ((current === 3 || current === 11) && p < 0.16 && film) {
      stageWorld.style.opacity = 1 - transition;
    } else {
      releaseFilm();
    }

    if (current === 3 && !manual) {
      // Material holds: rest on each finish, morph between them.
      var travel = clamp((p - 0.16) / 0.68), seg = Math.min(3.999, travel * 4), idx = Math.floor(seg);
      setSurface(idx + smooth(clamp((seg - idx - 0.2) / 0.6)));
    }
    if (flipManual && (current === 0 || current === 2 && p >= 0.68 || current === 3 || current === 4 || current === 5)) angle = flip.angle;

    if (worldName === 'ascendant' && film && film.cardFrame) {
      var cf = film.cardFrame;
      pose = Object.assign({}, pose);
      pose.w *= cf.scale;
      pose.x = root.innerWidth / 2 - pose.w / 2;
      pose.y = root.innerHeight * 0.51 - pose.w * 0.7;
      alpha = cf.opacity;
      infoMs = cf.done ? Math.max(0, age - film.timeline.sections.card.start - film.spec.cardScene.ms) : -1;
      if (subject) C.finishes.registry.ascendant.drawBorder(subject.view.el, C.ascendantBackground.sampleBorder(sample(subjectId).serial));
    }

    if (subject) {
      subject.surface(current >= 7 && current <= 11 ? 0 : current === 3 ? surface.p * transition : current < 3 ? 0 : surface.p);
      subjectHost.style.zIndex = current === 5 ? 2 : 5;
      var authoredTurn = current === 3 ? Math.sin(p * Math.PI * 2) * 6 : current === 5 ? mix(-4, 4, p) : 0;
      pose.r += current === 3 ? mix(-2, 3, p) : 0;
      viewport.style.setProperty('--camera-scale', 1 + Math.sin(position * 0.3) * 0.025);

      subject.frame({
        angle: angle,
        frontOpacity: angle < 90 ? 1 : 0,
        infoMs: infoMs,
        shine: shine,
        pose: { y: 0, turn: pointer.x * (current === 0 ? 2.5 : 6) + authoredTurn, scale: 1 }
      }, {
        x: mix(-0.55, 0.55, surface.p / 4) + pointer.x * (current === 0 ? 0.14 : 0.3) + pulse.x,
        y: -0.3 + pointer.y * 0.25 + pulse.y
      }, { x: pointer.x * 250, y: pointer.y * 350 });

      var tilter = subject.view.el.querySelector('.card__tilter');
      if (tilter) {
        tilter.style.transform += ' rotateX(' + (-pointer.y * (current === 0 ? 2.5 : 6)) + 'deg)';
      }
    }

    if (subject) {
      if (alpha > 0.01 && !subject.view.visible) subject.resume();
      else if (alpha <= 0.01 && subject.view.visible) subject.suspend();
    }
    if (!selectionTween) place(pose, alpha);

    var support = all('.journey-support'), depart = smooth(position / chapters[0].end);
    support.forEach((el, i) => {
      var base = poses[i === 0 ? 'support1' : 'support2'];
      el.style.transform = 'translate(' + (base.x + base.w / 2 + (i === 0 ? -1 : 1) * depart * root.innerWidth * 0.3) + 'px,' + (base.y + base.w * 0.7 + depart * root.innerHeight * 0.18) + 'px) rotate(' + (base.r + depart * (i === 0 ? -15 : 15)) + 'deg) scale(' + base.w / 500 + ') translate(-250px,-350px)';
      el.style.opacity = 1 - smooth((position - 0.4) / 1.7);
    });

    if (current === 4) {
      var spread = smooth(p / 0.28);
      all('.collection-wall li').forEach((el, i) => {
        if (el.hidden) return;
        el.style.opacity = spread;
        el.style.transform = 'translate3d(' + ((i % 8 - 3.5) * (1 - spread) * -18) + 'px,' + ((Math.floor(i / 8) - 1) * (1 - spread) * -30) + 'px,0) rotateX(' + ((1 - spread) * 20) + 'deg)';
      });
    }

    all('.identity-record dl>div').forEach((el, i) => {
      var q = current === 5 ? smooth((p - 0.12 - i * 0.08) / 0.3) : 1;
      el.style.opacity = q;
      el.style.transform = 'translateX(' + ((1 - q) * 32) + 'px)';
    });
    all('.serial-digit').forEach((el, i) => {
      var q = current === 5 ? smooth((p - 0.06 - i * 0.04) / 0.3) : 1;
      el.style.opacity = q;
      el.style.transform = 'translateY(' + ((1 - q) * 70) + '%)';
    });
    all('.final-card').forEach((el, i) => {
      var q = current === 12 ? smooth((p - 0.05 - i * 0.015) / 0.7) : 0;
      el.style.transform = 'translate(' + ((i % 9 - 4) * (1 - q) * 28) + 'px,' + ((i < 9 ? -1 : 1) * (1 - q) * 120) + 'px) scale(' + (mix(0.7, 1, q)) + ')';
      el.style.opacity = q;
    });

    wake();
  }

  function pagePose() {
    if (!subject) return;
    subject.frame({
      angle: flip.angle,
      frontOpacity: flip.angle < 90 ? 1 : 0,
      infoMs: 4000,
      shine: 1,
      pose: { y: 0, turn: C.motion.reduced ? 0 : pointer.x * 6, scale: 1 }
    }, {
      x: -0.4 + pointer.x * 0.35 + pulse.x,
      y: -0.3 + pointer.y * 0.25 + pulse.y
    });
    if (!C.motion.reduced) {
      var tilter = subject.view.el.querySelector('.card__tilter');
      if (tilter) tilter.style.transform += ' rotateX(' + (-pointer.y * 6) + 'deg)';
    }
    wake();
  }

  function showPageWorld(panel, age) {
    if (C.motion.reduced) return;
    var id = panel.dataset.world;
    showFilm(id, age, panel, 1);
    filmTime = age;
    if (!film) return;
    var idCard = ids.find(key => C.card(key).rarity === id);
    var host = panel.querySelector('.world-card-host');
    if (!host) {
      host = D.createElement('div');
      host.className = 'world-card-host';
      panel.appendChild(host);
    }
    if (subjectHost !== host) {
      if (subject) subject.destroy();
      subject = null;
      subjectId = null;
      subjectHost = host;
    }
    mount(idCard);
    var start = film.timeline.sections.card ? film.timeline.sections.card.start : film.timeline.total;
    host.style.opacity = smooth((age - start) / 160);
    var cf = film.cardFrame;
    if (cf) {
      host.style.transform = 'translate(-50%,-50%) scale(' + cf.scale + ')';
      host.style.opacity = cf.opacity;
      if (subject) C.finishes.registry.ascendant.drawBorder(subject.view.el, C.ascendantBackground.sampleBorder(sample(subjectId).serial));
    }
    if (!subject) return;
    subject.frame({
      angle: 180 * (1 - smooth((age - start) / 400)),
      frontOpacity: age - start >= 200 ? 1 : 0,
      infoMs: cf && !cf.done ? -1 : Math.max(-1, age - start - (cf ? film.spec.cardScene.ms : 400)),
      shine: clamp((age - start - 200) / 700)
    }, { x: -0.4, y: -0.3 });
    pageFilmControls();
    wake();
  }

  function pageFilmControls() {
    if (!film || !canvas) return;
    var panel = canvas.parentNode, range = panel.querySelector('input');
    if (range) range.value = Math.round(clamp(filmTime / (filmDuration(film.timeline))) * 1000);
    var label = panel.querySelector('[data-film-stage]');
    if (label) label.textContent = Math.round(filmTime / 1000) + 's / ' + Math.round(filmDuration(film.timeline) / 1000) + 's · SAFE';
  }

  function pageRefresh() {
    if (D.hidden) return;
    if (page === 'worlds') {
      var panels = all('.world-panel'), best = panels.find(p => {
        var b = p.getBoundingClientRect();
        return b.top < root.innerHeight * 0.6 && b.bottom > root.innerHeight * 0.5;
      });
      if (best) {
        if (filmId !== best.dataset.world) {
          stopWatch();
          showPageWorld(best, 0);
        }
      } else {
        releaseFilm();
        if (subject) subject.suspend();
      }
    } else if (page === 'home') {
      var slots = all('[data-scene-card]').filter(el => {
        var b = el.getBoundingClientRect();
        return b.bottom > 90 && b.top < root.innerHeight;
      });
      var best = slots.sort((a, b) => Math.abs(a.getBoundingClientRect().top + a.offsetHeight / 2 - root.innerHeight / 2) - Math.abs(b.getBoundingClientRect().top + b.offsetHeight / 2 - root.innerHeight / 2))[0];
      if (best) {
        if (best !== subjectHost) {
          if (subjectHost) subjectHost.classList.remove('has-live');
          if (subject) best.appendChild(subject.view.el);
          subjectHost = best;
          best.classList.add('has-live');
        }
        mount(['collection', 'identity'].includes(best.dataset.sceneCard) ? selected : hero);
        if (subject) subject.resume();
        pagePose();
      } else if (subject) {
        subject.suspend();
        stopClock();
      }
    } else if (subject) {
      var b = subjectHost.getBoundingClientRect();
      if (b.bottom > 0 && b.top < root.innerHeight) {
        subject.resume();
        pagePose();
      } else {
        subject.suspend();
        stopClock();
      }
    }
  }

  function setupPage() {
    D.body.classList.add('product-page');
    subjectHost = $('.collection-detail .selected-object') || $('.selected-object') || $('.hero-object') || $('.download-art') || D.createElement('div');
    if (subjectHost.parentNode) {
      mount(selected);
      subjectHost.classList.add('has-live');
    }
    all('.world-panel').forEach(panel => {
      filmControls(panel);
      var inp = panel.querySelector('input');
      if (inp) inp.disabled = C.motion.reduced;
      panel.querySelectorAll('button').forEach(b => b.disabled = C.motion.reduced);
    });
    root.addEventListener('scroll', pageRefresh, { passive: true });
    root.addEventListener('resize', pageRefresh, { passive: true });
  }

  function preview() {
    var params = new URLSearchParams(location.search), kind = params.get('preview'), host = $('.preview-stage');
    if (!host) return;
    D.body.classList.add('preview-mode');
    host.hidden = false;
    if (kind === 'pack') {
      D.body.classList.add('pack-preview');
      var packHost = D.createElement('div');
      packHost.className = 'pack-live';
      host.appendChild(packHost);
      C.packMarkup.unit(packHost, false, C.pack('rare'));
    } else if (kind === 'world') {
      D.body.classList.add('world-preview');
      canvas = D.createElement('canvas');
      host.appendChild(canvas);
      film = root.CardableFilms.create(params.get('id'));
      filmId = params.get('id');
      root.CardableFilms.paint(film, canvas, 0.5);
    } else {
      subjectHost = host;
      mount(params.get('id') || hero);
      subject.surface(Math.max(0, finishes.indexOf(params.get('finish') || 'normal')));
      subject.frame({ angle: kind === 'back' ? 180 : 0, frontOpacity: kind === 'back' ? 0 : 1, infoMs: 4000, shine: 1 }, { x: -0.4, y: -0.3 });
      subject.update(1200, 16);
    }
    Promise.all([D.fonts.ready, ...Array.from(host.querySelectorAll('img')).map(img => img.decode().catch(() => {}))]).then(() => requestAnimationFrame(() => {
      D.body.dataset.previewReady = 'true';
    }));
    root.addEventListener('pagehide', () => { if (subject) subject.destroy(); releaseFilm(); });
    stopClock();
  }

  function staticFallback() {
    stopClock();
    releaseFilm();
    if (subject) subject.destroy();
    subject = null;
    if (journeyTrigger) journeyTrigger.kill();
    journey = false;
    var main = $('#story'), gallery = $('.world-gallery');
    chapters.forEach(ch => {
      ch.el.id = ch.id;
      ch.el.style.opacity = '';
      ch.el.inert = false;
      ch.el.removeAttribute('aria-hidden');
      ch.el.classList.remove('is-active');
      if (ch.el.dataset.world && gallery) gallery.appendChild(ch.el);
      else if (main) main.appendChild(ch.el);
    });
    all('.journey-viewport,.journey-markers,.journey-progress,.journey-worlds-veil,.rarity-baseline').forEach(el => el.remove());
    all('.world-index').forEach(el => {
      el.style.opacity = '';
      el.inert = false;
      el.removeAttribute('aria-hidden');
    });
    all('#story h1,#story h2,#story .eyebrow').forEach(function(el) { el.style.transform = ''; el.style.opacity = ''; });
    all('.world-scrub,.finish-controls,.collection-toolbar,.identity-actions,.world-caption h3').forEach(function(el) { el.style.opacity = ''; });
    if (main) main.style.height = '';
    D.documentElement.classList.remove('enhanced', 'journey-mode');
    all('.has-live').forEach(el => el.classList.remove('has-live'));
  }

  if (new URLSearchParams(location.search).has('preview')) {
    try { preview(); } catch(error) { console.error(error); }
    return;
  }

  try {
    if (page === 'home' && !C.motion.reduced && root.ScrollTrigger) setupJourney();
    else setupPage();
    controls();
    restoreState();
    D.fonts.ready.then(() => {
      if (journey) {
        measure();
        root.ScrollTrigger.refresh();
        var ch = chapters.find(ch => '#' + ch.id === location.hash);
        if (ch) go(ch.start + ch.length * 0.18, false);
      } else pageRefresh();
      D.body.dataset.siteReady = 'true';
    });
  } catch(error) {
    staticFallback();
    console.error('Cardable website:', error);
  }
})(window);
