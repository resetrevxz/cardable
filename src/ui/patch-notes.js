/* Cardable — Patch Notes UI Controller
 * Features: Inventory showcase cards, interactive balance accordions,
 * 3D hover/click inspection, search/sort filters, and interactive playground mode.
 */
(function (C, root) {
  'use strict';
  var node = C.packMarkup.node;
  var currentVersion = '1.0.3';
  var storageKey = 'cardable.patchNotesSeen';

  var overlay = null;
  var modal = null;
  var scrollEl = null;
  var progressBar = null;
  var searchInput = null;
  var sortSelect = null;
  var interactiveToggle = null;
  var hoverInspectEl = null;
  var inspectModalEl = null;
  var hudBtn = null;
  var hudUnread = null;

  var activeVersion = '1.0.3';
  var searchQuery = '';
  var sortOrder = 'newest';
  var isInteractiveMode = false;
  var openState = false;
  var expandedShowcase = false;
  var expandedBalance = false;
  var previousActiveElement = null;

  function isSeen() {
    try {
      return root.localStorage.getItem(storageKey) === currentVersion;
    } catch (_) {
      return false;
    }
  }

  function markSeen() {
    try {
      root.localStorage.setItem(storageKey, currentVersion);
    } catch (_) {}
    if (hudUnread && hudUnread.parentNode) {
      hudUnread.remove();
      hudUnread = null;
    }
  }

  function getNotesList() {
    var list = (C.data && C.data.patchNotes) ? C.data.patchNotes.slice() : [];
    if (sortOrder === 'oldest') {
      list.reverse();
    } else if (sortOrder === 'major') {
      list = list.filter(function (n) { return n.tag === 'Major'; });
    }
    return list;
  }

  function getActiveNote() {
    var list = getNotesList();
    var match = list.find(function (n) { return n.version === activeVersion; });
    return match || list[0] || null;
  }

  /* ==========================================================================
     HUD Button Mounting (Adjacent to Credits)
     ========================================================================== */
  function mountHudButton() {
    var host = root.document.body;
    if (root.document.getElementById('patch-notes-hud-btn')) return;

    hudBtn = node('button', 'patch-notes-hud-btn idle-chrome entrance', host);
    hudBtn.id = 'patch-notes-hud-btn';
    hudBtn.type = 'button';
    hudBtn.setAttribute('aria-label', 'Patch notes v' + currentVersion);
    hudBtn.style.setProperty('--entry', 2);

    // Scroll / Sparkle icon
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'patch-notes-hud-btn__icon');
    svg.setAttribute('aria-hidden', 'true');
    var path = root.document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zM7 15h7v2H7v-2z');
    svg.appendChild(path);
    hudBtn.appendChild(svg);

    var label = node('span', 'patch-notes-hud-btn__label', hudBtn, 'Updates');
    var pill = node('span', 'patch-notes-hud-btn__pill', hudBtn, 'v' + currentVersion);

    if (!isSeen()) {
      hudUnread = node('span', 'patch-notes-hud-btn__unread', hudBtn);
    }

    hudBtn.addEventListener('click', function () {
      open();
    });
  }

  /* ==========================================================================
     Hover Inspect Engine (Feature 7)
     ========================================================================== */
  function initHoverInspect() {
    if (hoverInspectEl) return;
    hoverInspectEl = node('div', 'patch-hover-inspect', root.document.body);
    hoverInspectEl.setAttribute('aria-hidden', 'true');
  }

  function showHoverInspect(item, event) {
    if (!hoverInspectEl || !item) return;
    while (hoverInspectEl.children.length) hoverInspectEl.children[0].remove();

    node('h4', 'patch-hover-inspect__title', hoverInspectEl, item.name);
    node('div', 'patch-hover-inspect__rarity', hoverInspectEl, (item.rarity || 'standard') + (item.variantId ? ' · ' + item.variantId : ''));
    node('p', 'patch-hover-inspect__desc', hoverInspectEl, item.description || item.subtitle || '');

    if (item.specs) {
      var grid = node('div', 'patch-hover-inspect__specs', hoverInspectEl);
      Object.keys(item.specs).forEach(function (key) {
        var box = node('div', 'patch-hover-inspect__spec-item', grid);
        node('span', 'patch-hover-inspect__spec-label', box, key);
        node('span', 'patch-hover-inspect__spec-val', box, String(item.specs[key]));
      });
    }

    hoverInspectEl.classList.add('is-active');
    updateHoverInspectPos(event);
  }

  function updateHoverInspectPos(event) {
    if (!hoverInspectEl || !event) return;
    var x = event.clientX + 18;
    var y = event.clientY + 18;
    var rect = hoverInspectEl.getBoundingClientRect();
    if (x + rect.width > root.innerWidth - 12) x = root.innerWidth - rect.width - 12;
    if (y + rect.height > root.innerHeight - 12) y = root.innerHeight - rect.height - 12;
    hoverInspectEl.style.left = x + 'px';
    hoverInspectEl.style.top = y + 'px';
  }

  function hideHoverInspect() {
    if (!hoverInspectEl) return;
    hoverInspectEl.classList.remove('is-active');
  }

  /* ==========================================================================
     Full 3D Inspect Modal (Click to Inspect)
     ========================================================================== */
  function initInspectModal() {
    if (inspectModalEl) return;
    inspectModalEl = node('div', 'patch-inspect-modal', root.document.body);
    inspectModalEl.setAttribute('role', 'dialog');
    inspectModalEl.setAttribute('aria-modal', 'true');
    inspectModalEl.setAttribute('aria-label', 'Card Inspection');

    inspectModalEl.addEventListener('click', function (e) {
      if (e.target === inspectModalEl) closeInspectModal();
    });
  }

  function openInspectModal(item) {
    initInspectModal();
    while (inspectModalEl.children.length) inspectModalEl.children[0].remove();

    var box = node('div', 'patch-inspect-box', inspectModalEl);
    var stage = node('div', 'patch-inspect-card-stage', box);
    var info = node('div', 'patch-inspect-info', box);

    // Render interactive showcase specimen
    var cardWrapper = node('div', 'patch-card-tile', stage);
    cardWrapper.dataset.rarity = item.rarity || 'basic';
    cardWrapper.style.width = '240px';
    cardWrapper.style.transform = 'rotateY(0deg) rotateX(0deg)';
    cardWrapper.style.transition = 'transform 0.1s ease-out';

    var artStage = node('div', 'patch-card-preview-stage', cardWrapper);
    artStage.style.height = '240px';
    var svg = createCardSvgArt(item);
    artStage.appendChild(svg);

    // Mouse tilt inside stage
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      cardWrapper.style.transform = 'rotateY(' + (dx * 18) + 'deg) rotateX(' + (-dy * 18) + 'deg) scale(1.04)';
    });
    stage.addEventListener('mouseleave', function () {
      cardWrapper.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
    });

    // Info Column
    var top = node('div', '', info);
    node('span', 'patch-version-pill', top, (item.rarity || 'standard').toUpperCase());
    node('h2', 'patch-hero__title', top, item.name);
    node('p', 'patch-hero__subtitle', top, item.description || item.subtitle || '');

    if (item.specs) {
      var dl = node('div', 'patch-hover-inspect__specs', top);
      dl.style.marginTop = '16px';
      Object.keys(item.specs).forEach(function (key) {
        var itemEl = node('div', 'patch-hover-inspect__spec-item', dl);
        node('span', 'patch-hover-inspect__spec-label', itemEl, key);
        node('span', 'patch-hover-inspect__spec-val', itemEl, String(item.specs[key]));
      });
    }

    var actions = node('div', '', info);
    actions.style.display = 'flex';
    actions.style.gap = '10px';
    actions.style.marginTop = '24px';

    var closeBtn = node('button', 'patch-header-btn', actions, 'Close Inspection');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', closeInspectModal);

    inspectModalEl.classList.add('is-open');
    closeBtn.focus();
  }

  function closeInspectModal() {
    if (!inspectModalEl) return;
    inspectModalEl.classList.remove('is-open');
  }

  /* ==========================================================================
     Card SVG Art Generator for Showcases
     ========================================================================== */
  function createCardSvgArt(item) {
    var svg = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.setAttribute('class', 'patch-card-preview-art');

    var colorMap = {
      mythical: '#FF3B30',
      secret: '#9E6BFF',
      legendary: '#F5A623',
      exotic: '#2DE2B8',
      rare: '#2987FA',
      uncommon: '#B6FF3C',
      common: '#8E8E93',
      basic: '#F5F5F7'
    };
    var accent = colorMap[item.rarity] || '#2DE2B8';

    // Stylized GPU die or crate visual
    var defs = root.document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var grad = root.document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.id = 'grad-' + item.id;
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');

    var s1 = root.document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', accent); s1.setAttribute('stop-opacity', '0.85');
    var s2 = root.document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#121217');
    grad.appendChild(s1); grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    if (item.icon === 'pack') {
      // Crate / Box Art
      var box = root.document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('x', '30'); box.setAttribute('y', '30');
      box.setAttribute('width', '100'); box.setAttribute('height', '100');
      box.setAttribute('rx', '16'); box.setAttribute('fill', 'url(#grad-' + item.id + ')');
      box.setAttribute('stroke', accent); box.setAttribute('stroke-width', '2');
      svg.appendChild(box);

      var strap = root.document.createElementNS('http://www.w3.org/2000/svg', 'line');
      strap.setAttribute('x1', '80'); strap.setAttribute('y1', '30');
      strap.setAttribute('x2', '80'); strap.setAttribute('y2', '130');
      strap.setAttribute('stroke', '#FFFFFF'); strap.setAttribute('stroke-width', '3');
      strap.setAttribute('stroke-opacity', '0.5');
      svg.appendChild(strap);
    } else {
      // Silicon Die & Heatsink Art
      var pcb = root.document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      pcb.setAttribute('x', '24'); pcb.setAttribute('y', '24');
      pcb.setAttribute('width', '112'); pcb.setAttribute('height', '112');
      pcb.setAttribute('rx', '14'); pcb.setAttribute('fill', '#17171C');
      pcb.setAttribute('stroke', accent); pcb.setAttribute('stroke-width', '2');
      svg.appendChild(pcb);

      var die = root.document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      die.setAttribute('x', '48'); die.setAttribute('y', '48');
      die.setAttribute('width', '64'); die.setAttribute('height', '64');
      die.setAttribute('rx', '8'); die.setAttribute('fill', 'url(#grad-' + item.id + ')');
      svg.appendChild(die);

      var traces = root.document.createElementNS('http://www.w3.org/2000/svg', 'path');
      traces.setAttribute('d', 'M32 48h16M32 64h16M32 80h16M32 96h16 M112 48h16M112 64h16M112 80h16M112 96h16 M48 32v16M64 32v16M80 32v16M96 32v16');
      traces.setAttribute('stroke', accent); traces.setAttribute('stroke-width', '1.5');
      traces.setAttribute('stroke-opacity', '0.6');
      svg.appendChild(traces);
    }

    return svg;
  }

  /* ==========================================================================
     Silicon Circuit Canvas Hero Animation
     ========================================================================== */
  function renderHeroCanvas(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width = canvas.offsetWidth;
    var h = canvas.height = canvas.offsetHeight;

    var particles = [];
    for (var i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    function frame() {
      if (!canvas.isConnected) return;
      ctx.clearRect(0, 0, w, h);

      // Grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (var x = 0; x < w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (var y = 0; y < h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Animated nodes
      for (var j = 0; j < particles.length; j++) {
        var p = particles[j];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

        ctx.fillStyle = 'rgba(45, 226, 184, ' + p.alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      root.requestAnimationFrame(frame);
    }
    frame();
  }

  /* ==========================================================================
     Main Modal Creation & Render Pipeline
     ========================================================================== */
  function buildModal() {
    if (overlay) return;

    overlay = node('div', 'patch-overlay', root.document.body);
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Patch Notes');

    modal = node('div', 'patch-modal', overlay);
    progressBar = node('div', 'patch-progress-bar', modal);

    // Sticky Header
    var header = node('header', 'patch-header', modal);
    var titleGroup = node('div', 'patch-title-group', header);
    node('h2', 'patch-header-title', titleGroup, 'Patch Notes');
    node('span', 'patch-version-pill', titleGroup, 'v' + currentVersion);

    var headerActions = node('div', 'patch-header-actions', header);

    // Interactive Mode Button
    interactiveToggle = node('button', 'patch-interactive-toggle', headerActions);
    interactiveToggle.type = 'button';
    node('span', 'patch-interactive-toggle__dot', interactiveToggle);
    var toggleLabel = node('span', '', interactiveToggle, 'Interactive Mode');
    interactiveToggle.addEventListener('click', function () {
      isInteractiveMode = !isInteractiveMode;
      interactiveToggle.classList.toggle('is-active', isInteractiveMode);
      modal.classList.toggle('is-interactive-mode', isInteractiveMode);
      renderContent();
    });

    // Copy Notes Button
    var copyBtn = node('button', 'patch-header-btn', headerActions, 'Copy Notes');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', function () {
      copyNotes();
    });

    // Close Button
    var closeBtn = node('button', 'patch-header-btn patch-close-btn', headerActions, '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close patch notes');
    closeBtn.addEventListener('click', close);

    // Navigation & Filter Strip
    var navBar = node('div', 'patch-nav-bar', modal);
    var versionTabs = node('div', 'patch-version-tabs', navBar);

    var filterControls = node('div', 'patch-filter-controls', navBar);

    var searchBox = node('div', 'patch-search-box', filterControls);
    searchInput = node('input', 'patch-search-input', searchBox);
    searchInput.type = 'search';
    searchInput.placeholder = 'Search changes…';
    node('span', 'patch-search-hint', searchBox, '/');

    searchInput.addEventListener('input', function (e) {
      searchQuery = e.target.value.toLowerCase().trim();
      renderContent();
    });

    sortSelect = node('select', 'patch-sort-select', filterControls);
    var opt1 = node('option', '', sortSelect, 'Newest First'); opt1.value = 'newest';
    var opt2 = node('option', '', sortSelect, 'Oldest First'); opt2.value = 'oldest';
    var opt3 = node('option', '', sortSelect, 'Major Only'); opt3.value = 'major';

    sortSelect.addEventListener('change', function (e) {
      sortOrder = e.target.value;
      renderContent();
    });

    // Scrollable Content Shell
    scrollEl = node('div', 'patch-scroll', modal);

    scrollEl.addEventListener('scroll', function () {
      var max = scrollEl.scrollHeight - scrollEl.clientHeight;
      var p = max > 0 ? (scrollEl.scrollTop / max) * 100 : 0;
      progressBar.style.width = p + '%';
    });

    // Backdrop click to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    initHoverInspect();
  }

  /* ==========================================================================
     Content Renderer (Hero, Showcase, Balance, Sections)
     ========================================================================== */
  function renderContent() {
    if (!scrollEl) return;
    while (scrollEl.children.length) scrollEl.children[0].remove();

    // Render Version Tabs
    var tabStrip = modal.querySelector('.patch-version-tabs');
    if (tabStrip) {
      while (tabStrip.children.length) tabStrip.children[0].remove();
      getNotesList().forEach(function (note) {
        var tab = node('button', 'patch-version-tab' + (note.version === activeVersion ? ' is-active' : ''), tabStrip, 'v' + note.version + ' ' + note.codename.split(' ')[0]);
        tab.type = 'button';
        tab.addEventListener('click', function () {
          activeVersion = note.version;
          expandedShowcase = false;
          expandedBalance = false;
          renderContent();
        });
      });
    }

    var note = getActiveNote();
    if (!note) {
      node('p', 'patch-hero__subtitle', scrollEl, 'No patch notes found matching your filter.');
      return;
    }

    // 1. Interactive Mode Notice Bar (if enabled)
    if (isInteractiveMode) {
      var modeBar = node('div', 'patch-interactive-mode-bar', scrollEl);
      node('span', 'patch-interactive-mode-text', modeBar, '✨ Interactive Playground Mode Active: Mouse hover tilts cards in 3D. Click any card to inspect.');
      var simBtn = node('button', 'patch-header-btn', modeBar, 'Test Balance Specs');
      simBtn.type = 'button';
      simBtn.addEventListener('click', function () {
        if (C.qol && C.qol.toast) C.qol.toast('Simulated balance clocks loaded into runtime preview.');
      });
    }

    // 2. Hero Preview Banner
    var hero = node('section', 'patch-hero', scrollEl);
    var canvas = node('canvas', 'patch-hero__canvas', hero);
    renderHeroCanvas(canvas);

    var heroContent = node('div', 'patch-hero__content', hero);
    if (note.hero && note.hero.badge) node('span', 'patch-hero__badge', heroContent, note.hero.badge);
    node('h1', 'patch-hero__title', heroContent, (note.hero && note.hero.title) || note.codename);
    node('p', 'patch-hero__subtitle', heroContent, (note.hero && note.hero.subtitle) || note.tagline);

    // 3. Inventory Showcase Section (Reference Image 1)
    if (note.showcase && note.showcase.length) {
      var showcaseSection = node('section', '', scrollEl);
      var scHeader = node('div', 'patch-section-header', showcaseSection);
      node('h3', 'patch-section-title', scHeader, 'Featured Additions & Variants');
      node('span', 'patch-section-meta', scHeader, note.showcase.length + ' Showcase Items');

      var grid = node('div', 'patch-showcase-grid', showcaseSection);
      var filteredShowcase = note.showcase.filter(function (item) {
        if (!searchQuery) return true;
        return (item.name + ' ' + (item.subtitle || '') + ' ' + (item.description || '')).toLowerCase().includes(searchQuery);
      });

      var visibleCards = expandedShowcase ? filteredShowcase : filteredShowcase.slice(0, 3);

      visibleCards.forEach(function (item) {
        var card = node('div', 'patch-card-tile', grid);
        card.dataset.rarity = item.rarity || 'basic';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', item.name + ' - Click to inspect');

        var artStage = node('div', 'patch-card-preview-stage', card);
        artStage.appendChild(createCardSvgArt(item));

        var head = node('div', 'patch-card-header', card);
        node('h4', 'patch-card-name', head, item.name);
        node('span', 'patch-card-tag', head, item.rarity || 'standard');

        node('p', 'patch-card-subtitle', card, item.subtitle || '');

        if (item.specs) {
          var specsRow = node('div', 'patch-card-specs-row', card);
          if (item.specs.vram) node('span', 'patch-card-spec-chip', specsRow, item.specs.vram);
          if (item.specs.boostMhz) node('span', 'patch-card-spec-chip', specsRow, item.specs.boostMhz + ' MHz');
          if (item.specs.tdpW) node('span', 'patch-card-spec-chip', specsRow, item.specs.tdpW + 'W TDP');
        }

        var inspectHint = node('div', 'patch-card-inspect-hint', card);
        inspectHint.textContent = 'Hover · Click to Inspect';

        // Hover Inspect listeners
        card.addEventListener('mouseenter', function (e) {
          showHoverInspect(item, e);
        });
        card.addEventListener('mousemove', function (e) {
          updateHoverInspectPos(e);
          if (isInteractiveMode) {
            var r = card.getBoundingClientRect();
            var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
            var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
            card.style.transform = 'translateY(-6px) rotateY(' + (dx * 12) + 'deg) rotateX(' + (-dy * 12) + 'deg)';
          }
        });
        card.addEventListener('mouseleave', function () {
          hideHoverInspect();
          if (isInteractiveMode) card.style.transform = '';
        });

        // Click to Inspect
        card.addEventListener('click', function () {
          hideHoverInspect();
          openInspectModal(item);
        });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            hideHoverInspect();
            openInspectModal(item);
          }
        });
      });

      // View More Button for Showcase (Feature 6)
      if (filteredShowcase.length > 3) {
        var viewMoreCards = node('button', 'patch-view-more-btn', showcaseSection);
        viewMoreCards.type = 'button';
        viewMoreCards.textContent = expandedShowcase ? '▲ Collapse Showcase' : '▼ View More Showcase Cards (+' + (filteredShowcase.length - 3) + ' more)';
        viewMoreCards.addEventListener('click', function () {
          expandedShowcase = !expandedShowcase;
          renderContent();
        });
      }
    }

    // 4. Balance & Tuning Section (Reference Image 2)
    if (note.balanceChanges && note.balanceChanges.length) {
      var balanceSec = node('section', 'patch-balance-section', scrollEl);
      var balHeader = node('div', 'patch-section-header', balanceSec);
      node('h3', 'patch-section-title', balHeader, 'Balance Changes & Tuning');
      node('span', 'patch-section-meta', balHeader, 'Interactive Diffs');

      var visibleGroups = expandedBalance ? note.balanceChanges : note.balanceChanges.slice(0, 2);

      visibleGroups.forEach(function (group, idx) {
        var groupEl = node('div', 'patch-balance-group is-open', balanceSec);

        var headerBtn = node('button', 'patch-balance-header', groupEl);
        headerBtn.type = 'button';

        var left = node('div', 'patch-balance-header-left', headerBtn);
        var iconWrap = node('div', 'patch-balance-icon-wrap', left);
        iconWrap.textContent = group.icon === 'chip' ? '⚡' : group.icon === 'pack' ? '📦' : '✨';

        var titles = node('div', '', left);
        node('h4', 'patch-balance-group-title', titles, group.category);
        if (group.subtitle) node('p', 'patch-balance-group-sub', titles, group.subtitle);

        // Chevron
        var chev = root.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chev.setAttribute('viewBox', '0 0 24 24');
        chev.setAttribute('class', 'patch-balance-chevron');
        var cPath = root.document.createElementNS('http://www.w3.org/2000/svg', 'path');
        cPath.setAttribute('d', 'M7 10l5 5 5-5z');
        chev.appendChild(cPath);
        headerBtn.appendChild(chev);

        // Accordion Drawer
        var drawer = node('div', 'patch-balance-drawer', groupEl);
        var inner = node('div', 'patch-balance-drawer-inner', drawer);
        var table = node('div', 'patch-balance-table', inner);

        group.changes.forEach(function (change) {
          var row = node('div', 'patch-balance-row', table);

          var rowTop = node('div', 'patch-balance-row-top', row);
          var nameWrap = node('div', '', rowTop);
          node('span', 'patch-balance-stat-name', nameWrap, change.stat);
          if (change.entity) node('span', 'patch-balance-entity-chip', nameWrap, '· ' + change.entity);

          var diffVals = node('div', 'patch-balance-diff-values', rowTop);
          node('span', 'patch-balance-val-from', diffVals, change.from);
          node('span', 'patch-balance-arrow', diffVals, '→');
          node('span', 'patch-balance-val-to', diffVals, change.to);

          var badge = node('span', 'patch-diff-badge ' + (change.type === 'buff' ? 'is-buff' : 'is-nerf'), diffVals, change.diff + ' (' + change.percent + ')');

          if (change.note) {
            node('p', 'patch-balance-note', row, change.note);
          }

          // Visual Relative Comparison Bar
          var barWrap = node('div', 'patch-balance-bar-wrap', row);
          var barFill = node('div', 'patch-balance-bar-fill' + (change.type === 'nerf' ? ' is-nerf' : ''), barWrap);
          barFill.style.width = change.type === 'buff' ? '82%' : '45%';
        });

        headerBtn.addEventListener('click', function () {
          groupEl.classList.toggle('is-open');
        });
      });

      // View More Button for Balance (Feature 6)
      if (note.balanceChanges.length > 2) {
        var viewMoreBal = node('button', 'patch-view-more-btn', balanceSec);
        viewMoreBal.type = 'button';
        viewMoreBal.textContent = expandedBalance ? '▲ Collapse Balance Groups' : '▼ View More Balance Groups (+' + (note.balanceChanges.length - 2) + ' more)';
        viewMoreBal.addEventListener('click', function () {
          expandedBalance = !expandedBalance;
          renderContent();
        });
      }
    }

    // 5. Categorized Detailed Sections
    if (note.sections) {
      var secContainer = node('section', 'patch-sections-container', scrollEl);

      var categories = [
        { key: 'features', label: '🌟 Features & Architecture', list: note.sections.features },
        { key: 'systems', label: '⚙️ Systems & Pipelines', list: note.sections.systems },
        { key: 'visuals', label: '🎨 Visuals & Finishes', list: note.sections.visuals },
        { key: 'qol', label: '💎 Quality of Life', list: note.sections.qol },
        { key: 'fixes', label: '🛡 Fixes & Stability', list: note.sections.fixes }
      ];

      categories.forEach(function (cat) {
        if (!cat.list || !cat.list.length) return;
        var card = node('div', 'patch-section-card', secContainer);
        node('h4', 'patch-section-card-title', card, cat.label);

        var ul = node('ul', 'patch-change-list', card);
        cat.list.forEach(function (text) {
          node('li', 'patch-change-item', ul, text);
        });
      });
    }
  }

  /* ==========================================================================
     Copy Release Notes (Clipboard QoL)
     ========================================================================== */
  function copyNotes() {
    var note = getActiveNote();
    if (!note) return;

    var md = '# Cardable ' + note.version + ' — ' + note.codename + '\n\n';
    md += '*' + note.date + ' · ' + note.tag + ' Release*\n\n';
    md += note.tagline + '\n\n';

    if (note.balanceChanges) {
      md += '## Balance & Tuning\n';
      note.balanceChanges.forEach(function (grp) {
        md += '### ' + grp.category + '\n';
        grp.changes.forEach(function (ch) {
          md += '- **' + ch.stat + '** (' + ch.entity + '): `' + ch.from + '` → `' + ch.to + '` (' + ch.diff + ', ' + ch.percent + ')\n';
        });
      });
      md += '\n';
    }

    if (note.sections) {
      Object.keys(note.sections).forEach(function (key) {
        var items = note.sections[key];
        if (items && items.length) {
          md += '## ' + key.toUpperCase() + '\n';
          items.forEach(function (it) { md += '- ' + it + '\n'; });
          md += '\n';
        }
      });
    }

    if (root.navigator && root.navigator.clipboard) {
      root.navigator.clipboard.writeText(md).then(function () {
        if (C.qol && C.qol.toast) C.qol.toast('Patch notes markdown copied to clipboard.');
      }).catch(function () {
        fallbackCopy(md);
      });
    } else {
      fallbackCopy(md);
    }
  }

  function fallbackCopy(text) {
    var ta = root.document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    root.document.body.appendChild(ta);
    ta.select();
    try {
      root.document.execCommand('copy');
      if (C.qol && C.qol.toast) C.qol.toast('Patch notes copied to clipboard.');
    } catch (_) {}
    ta.remove();
  }

  /* ==========================================================================
     Public Controller API
     ========================================================================== */
  function open() {
    buildModal();
    if (openState) return;
    openState = true;
    previousActiveElement = root.document.activeElement;

    markSeen();
    renderContent();

    overlay.classList.add('is-open');
    if (C.accessibility && C.accessibility.trap) {
      C.accessibility.trap(modal);
    }
    modal.focus();
    C.events.emit('menu:visibilityHold', { reason: 'patch-notes', active: true });
  }

  function close() {
    if (!openState) return;
    openState = false;
    hideHoverInspect();
    closeInspectModal();

    if (overlay) overlay.classList.remove('is-open');
    if (C.accessibility && C.accessibility.release) {
      C.accessibility.release(modal);
    }

    C.events.emit('menu:visibilityHold', { reason: 'patch-notes', active: false });
    if (previousActiveElement && previousActiveElement.focus) {
      previousActiveElement.focus();
    }
  }

  C.patchNotes = {
    initialized: false,
    version: currentVersion,
    get isOpen() { return openState; },
    open: open,
    close: close,
    init: function () {
      if (C.patchNotes.initialized) return;
      mountHudButton();

      root.document.addEventListener('keydown', function (e) {
        if (e.target && (e.target.isContentEditable || e.target.closest('input,select,textarea,[contenteditable]'))) return;
        if (!openState) {
          if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
            e.preventDefault();
            open();
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (inspectModalEl && inspectModalEl.classList.contains('is-open')) {
            closeInspectModal();
          } else {
            close();
          }
        } else if (e.key === '/' && searchInput && root.document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      });
    }
  };
})(window.Cardable, window);
