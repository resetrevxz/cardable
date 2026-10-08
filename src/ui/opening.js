(function (C, root) {
  'use strict';
  var cfg, stage, host, glass, foil, halves, gap, hint, enterHint, status, error, seam, trails, particles, pack;
  var cutGuide, cutTrack, cutZone, cutGlow, cutTip, cutFinish=null, cutHeat=0, cutHeatAt=0, cutTipX=0.5, cutTargetX=0.5, cutDirection=1, variantLabel=null, touchTear, flipButton;
  var phase = 'idle', elapsed = 0, lastVisual = 0, chargeAt = 0, fill = 0, drainFrom = 0, pulseAt = 0;
  var path = [], hot = [], dirty = false, drag = null, split = null, cutIdle = 0, errorUntil = 0, savedFocus = null;
  var motion, scene, mount, bloom, keepButton, deleteButton, note, dust, currentView = null, rarity, timings, pendingCards = null;
  var cardIndex = 0, ownedCount = 0, revealClock = 0, infoClock = 0, shineAt = null, infoEnd = 0, keepAt = 0, sceneWidth = 0, sceneHeight = 0;
  var keeping = false, writingKeep = false, collected = false, flights = [], toast, toastView = null, toastAge = null, collectionSource, collectionTarget;
  var toastThumb, toastName, toastDetail, intro, swapShell = null, swapUnit = null, swapTarget = null;
  var meniscus, enabled = false, width = 0, height = 0, inventoryBlocked = false;
  var finePointer = root.matchMedia('(hover: hover) and (pointer: fine)');
  var preferencesActive = false;
  var packPose = null, packMaterial, foilMaterial, halfMaterials, cutStrategy=null, swapEffect=null, packEntrance=false;
  var stats = { commits: 0, transitions: 0, tears: 0, updates: 0, particles: 0, shines: 0, keeps: 0, collections: 0, recoveries: 0 };
  function node(tag, className, parent, text) { return C.packMarkup.node(tag, className, parent, text); }
  function svg(tag, parent) { var el = root.document.createElementNS('http://www.w3.org/2000/svg', tag); if (parent) parent.appendChild(el); return el; }
  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function ease(value) { return 1 - Math.pow(1 - clamp(value), 3); }
  function context() { C.events.emit('opening:context', { enabled: enabled, active: phase !== 'idle', phase: phase, step:phase==='cutting'&&!!(cutStrategy&&cutStrategy.advance), ready: !C.state.current.pendingReveal && C.state.current.packs.ready > 0 }); }
  function announce(text) { status.textContent = text; }
  function focus(el) { if (el && el.focus) el.focus({ preventScroll: true }); }
  function blade(value) { value = value && finePointer.matches; host.classList.toggle('has-blade', value); C.events.emit('cursor:blade', value); }
  function phaseTo(next) {
    if (phase === next) return;
    phase = next; C.opening.phase = next; elapsed = 0; lastVisual = root.performance.now(); stats.transitions += 1;
    stage.dataset.phase = next;
    if (next === 'rarityIntro' || next === 'rising' || next === 'revealed') {
      delete host.dataset.skin; delete host.dataset.packTinted;
      delete host.dataset.opening;
      ['--pack-fluid-start','--pack-fluid-end','--pack-leak','--pack-cut-glow'].forEach(function(key) { host.style.removeProperty(key); });
    }
    host.setAttribute('tabindex', next === 'charging' || next === 'draining' || next === 'cutting' ? '0' : '-1');
    var active = next !== 'idle';
    root.document.body.classList.toggle('is-opening', active);
    root.document.body.classList.toggle('is-opening-revealed', next === 'revealed');
    root.document.body.classList.toggle('is-rarity-cinematic', next === 'rarityIntro' || (next === 'flipping'||next==='settling'&&intro&&intro.cardStageActive) && !!(rarity && rarity.openingIntro && rarity.openingIntro.handoff));
    stage.hidden = !active;
    if (intro && (next === 'collecting' || next === 'discarding')) intro.exitBackdrop();
    if (active) bounds();
    ['wordmark', 'pack-stage', 'currency-counter', 'inventory-affordance'].forEach(function (id) {
      var el = root.document.getElementById(id); if (el) el.inert = active;
    });
    if (next === 'idle') {
      C.events.emit('menu:activity'); focus(savedFocus || root.document.getElementById('pack-stage')); savedFocus = null;
    }
    C.events.emit('menu:visibilityHold', { reason: 'opening', active: active });
    context(); C.events.emit('reveal:phase', next);
    if (next === 'dissolving' || next === 'cutting') {
      var reserved = C.state.current.pendingReveal;
      var upcoming = reserved && reserved.cards[Number(reserved.keptCount) || 0];
      if (upcoming) C.cutscenes.warmup(C.rarity(C.card(upcoming.cardId).rarity), upcoming.serial);
    }
    if (next !== 'cutting') { release(); blade(false); }
    hint.classList.toggle('is-held', next === 'charging');
    hint.style.opacity = next === 'charging' || next === 'draining' ? 1 : 0;
    if (next !== 'cutting') enterHint.style.opacity = 0;
    if (next === 'charging') announce('Hold ' + C.settings.holdKey + ' to open the pack.');
    if (next === 'draining') announce('Opening cancelled. Pack preserved.');
    if (next === 'cutting') {
      if(cutStrategy)cutStrategy.begin({announce:announce,canActivate:function(){return phase==='cutting'&&!preferencesActive&&!root.document.hidden;},unseal:function(){phaseTo('vaultOpening');},reveal:function(){startReveal(false);}});
      announce(cutStrategy&&cutStrategy.hint|| (cutStrategy&&!cutStrategy.usesSharedCut?'Drag the PULL tab upwards until it snaps free. Or press '+C.settings.actionKey+' to open.':'Swipe across the upper pack area; the blade aligns to the seal. Or press ' + C.settings.actionKey + ' to tear.'));focus(host);
    }
    if (next === 'revealed') announce(C.card(C.state.current.pendingReveal.cards[cardIndex].cardId).name + '. ' + note.textContent + '.');
    keepButton.hidden = true; keepButton.disabled = true;
    deleteButton.hidden = true; deleteButton.disabled = true;
    if (touchTear) {touchTear.hidden = next !== 'cutting';touchTear.textContent=cutStrategy&&cutStrategy.actionLabel||'Tear';touchTear.setAttribute('aria-label',cutStrategy&&cutStrategy.actionLabel||'Tear pack');}
    if (flipButton) flipButton.hidden = true;
    root.document.body.classList.toggle('is-collecting', next === 'collecting');
    if (next === 'idle' || next === 'rising') revealContext(false);
    if (['preFlip', 'flipping', 'settling', 'variantReveal', 'revealed'].indexOf(next) !== -1) revealContext(true, next === 'preFlip' ? 0 : 1);
    C.fx.wake();
  }
  function bounds() {
    var rect = host.getBoundingClientRect(); width = rect.width || C.config.shell.packWidth; height = rect.height || C.config.shell.packHeight;
    trails.setAttribute('viewBox', '0 0 ' + width + ' ' + height); dirty = true;
    var guideY = height * C.config.cut.guideY;
    var guidePath = 'M' + width * 0.03 + ' ' + guideY + ' L' + width * 0.97 + ' ' + guideY;
    cutGuide.setAttribute('d', guidePath); cutTrack.setAttribute('d', guidePath);
    if (split) halves.forEach(function (half, i) { half.style.clipPath = C.cutGeometry.polygon(split.halves[i]); });
    return rect;
  }
  function local(event) {
    var rect = host.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  }
  function insideCut(event, locked) {
    var rect = host.getBoundingClientRect(), policy = C.config.cut;
    var padding = policy.edgePaddingPx * C.settings.cutPolicy.tolerance;
    var top = locked ? policy.dragTop : policy.captureTop, bottom = locked ? policy.dragBottom : policy.captureBottom;
    return event.clientX >= rect.left - padding && event.clientX <= rect.right + padding &&
      event.clientY >= rect.top + rect.height * top && event.clientY <= rect.top + rect.height * bottom;
  }
  function aligned(event) { return { x: local(event).x, y: C.config.cut.guideY }; }
  function cutRange() {
    if (!path.length) return { min: 0, max: 0, span: 0 };
    var a = path[0].x, b = path[path.length - 1].x;
    return { min: Math.min(a,b), max: Math.max(a,b), span: Math.abs(b-a) };
  }
  function clearCut() {
    if(cutStrategy)cutStrategy.reset();
    release(); cutFinish=null;cutHeat=0;cutHeatAt=0;cutTipX=cutTargetX=0.5;host.classList.remove('is-cut-finishing');foil.style.transform='';if(cutGlow)cutGlow.setAttribute('d','');if(cutTip)cutTip.style.opacity=0;path = []; hot.forEach(function (item) { if (item.el) item.el.remove(); }); hot = []; split = null; cutIdle = 0;
    seam.setAttribute('d', ''); gap.setAttribute('d', ''); dirty = true;
    halves.forEach(function (half) { half.style.transform = ''; half.style.opacity = 0; half.style.clipPath = ''; });
  }
  function reset() {
    cleanReveal(); closeToast(); keeping = false; writingKeep = false;
    clearCut(); particles.clear(); fill = 0; meniscus.reset(0); errorUntil = 0; error.style.opacity = 0;
    host.style.visibility = ''; phaseTo('idle'); glass.pose.style.transform = ''; glass.el.style.opacity = 0; foil.style.opacity = 0;
  }
  function usePack(next, initialize) {
    if (!next) return;
    host.dataset.skin = next.skin;
    host.dataset.opening=next.opening||'cut';
    host.dataset.packTinted = C.packSkins.get(next).fluidTint ? 'true' : 'false';
    var skin = C.packSkins.get(next);
    ['--pack-fluid-start','--pack-fluid-end','--pack-leak','--pack-cut-glow'].forEach(function(key) { host.style.removeProperty(key); });
    if (skin.fluidTint) { host.style.setProperty('--pack-fluid-start', skin.fluidTint[0]); host.style.setProperty('--pack-fluid-end', skin.fluidTint[1]); }
    if (skin.leakTint) host.style.setProperty('--pack-leak', skin.leakTint);
    if (skin.cutGlow) host.style.setProperty('--pack-cut-glow', skin.cutGlow);
    if (!initialize && pack && pack.id === next.id && glass.el.dataset.pack === next.id) return;
    if(cutStrategy)cutStrategy.reset();
    pack = next;
    C.packMarkup.setPack(glass.el, pack);
    C.packMarkup.setPack(foil, pack, 'wrapper');
    halves.forEach(function(half) { C.packMarkup.setPack(half, pack, 'wrapper'); });
    var strategy=C.packOpenings.get(pack);cutStrategy=strategy?strategy.bind(host,foil,pack):null;
    packMaterial = C.packMaterial.create(glass.el, pack);
    foilMaterial = C.packMaterial.create(foil, pack);
    halfMaterials = halves.map(function(half) { return C.packMaterial.create(half, pack); });
    foilMaterial.update({rx:0,ry:0},0,true); halfMaterials.forEach(function(material) { material.update({rx:0,ry:0},0,true); });
  }
  function chargeStart() {
    if (!enabled || preferencesActive || inventoryBlocked || phase !== 'idle' || C.state.current.pendingReveal || root.document.hidden) return;
    C.timers.tick(); if (C.state.current.packs.ready <= 0) return;
    usePack(C.packs.upcoming(1)[0]);
    savedFocus = root.document.activeElement; clearCut(); particles.clear(); meniscus.reset(0); fill = 0;
    errorUntil = 0; error.style.opacity = 0; chargeAt = root.performance.now(); pulseAt = 0;
    packPose = C.packView.snapshot ? C.packView.snapshot() : null;
    phaseTo('charging'); glass.el.style.opacity = 1; foil.style.opacity = 0; paintFluid(0); focus(host); C.events.emit('charge:start');
  }
  function cancel(reason) {
    release(); blade(false);
    if (phase !== 'charging') return;
    fill = clamp((root.performance.now() - chargeAt) / C.config.hold.chargeMs); drainFrom = fill;
    phaseTo('draining'); C.events.emit('charge:end', { reason: reason });
  }
  function commit() {
    if (phase !== 'charging' || root.document.hidden) return;
    var candidate = JSON.parse(JSON.stringify(C.state.current)), now = C.clock.now();
    C.timers.reconcileInto(candidate, now);
    if (candidate.pendingReveal || !C.timers.consumeInto(candidate, now)) { cancel('unavailable'); return; }
    var request = { pack: C.packs.resolve(candidate), options: {} };
    try { C.events.emit('opening:resolve', request); } catch (_) { cancel('backup-failed'); error.textContent='Could not preserve the save. Your pack is still here.'; errorUntil=root.performance.now()+cfg.errorMs; return; }
    if (!candidate.tutorial.done) { request.pack=C.pack('standard'); delete request.buildPending; }
    if (request.pack && request.pack.enabled) usePack(request.pack);
    var forced = request.options.forcedTier || null;
    try {
      var cards = [];
      for (var i = 0; !request.buildPending && i < pack.cardsPerPack; i++) cards.push(C.pull.pullCard(pack, {
        forcedTier: i === 0 ? forced : null,
        forcedCard: i === 0 ? request.options.forcedCard : null,
        forcedVariant: i === 0 ? request.options.forcedVariant : undefined,
        luck: request.options.luck || 1,
        allocateSerial: function () { candidate.serialCounter += 1; return C.serial.format(candidate.playerCode, candidate.serialCounter); }
      }));
      candidate.stats.packsOpened += 1;
      candidate.packs.openedCount += 1;
      if (!Number.isSafeInteger(candidate.packs.openedCount)) throw new Error('Pack count exceeds its safe range');
      var before = candidate.currency;
      C.currency.applyInto(candidate,C.config.currency.packOpenReward,'pack opening',now);
      if (!Number.isSafeInteger(candidate.currency)) throw new Error('Currency exceeds its safe range');
      candidate.pendingReveal = request.buildPending ? request.buildPending(candidate, now) : { packId: pack.id, cards: cards, committedAt: now, keptCount: 0 };
      C.events.emit('opening:prepareCommit', candidate);
      if (!C.state.commit(candidate)) throw new Error('durable save unavailable');
    } catch (_) {
      error.textContent = 'Could not save. Your pack is still here.'; errorUntil = root.performance.now() + cfg.errorMs;
      cancel('save-failed'); announce(error.textContent); return;
    }
    C.events.emit('opening:committed', { cards: candidate.pendingReveal.cards, options: request.options, pack: pack });
    stats.commits += 1; fill = 1; C.currency.notify(before,'pack opening');
    C.events.emit('pack:reward', { before: before, value: candidate.currency, amount: C.config.currency.packOpenReward, source: host.getBoundingClientRect() });
    C.events.emit('pack:opened', { ready: candidate.packs.ready }); C.events.emit('charge:complete', candidate.pendingReveal);
    phaseTo('dissolving'); particles.emit('dissolve', null, width, height);
  }
  function chargeEnd() {
    if (phase !== 'charging') return;
    if (root.performance.now() - chargeAt >= C.config.hold.chargeMs && !root.document.hidden) commit();
    else cancel('release');
  }
  function release(event) {
    if(cutStrategy)cutStrategy.release(event);
    if (!drag || (event && event.pointerId !== drag.id)) return;
    var id = drag.id; drag = null;host.classList.remove('is-cut-dragging');C.events.emit('cursor:cutTarget',null);
    if (host.releasePointerCapture && host.hasPointerCapture && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    blade(false);
  }
  function cutStart(event) {
    if(cutStrategy&&!cutStrategy.usesSharedCut){if(phase==='cutting'&&!preferencesActive)cutStrategy.start(event);return;}
    if (phase !== 'cutting' || cutFinish || preferencesActive || event.button !== 0 || event.isPrimary === false ||
      !host.contains(event.target) || event.target.closest('button') || !insideCut(event)) return;
    var point = aligned(event), range = cutRange();
    if (path.length && (point.x < range.min - C.config.cut.resumePaddingPx * C.settings.cutPolicy.tolerance / width ||
      point.x > range.max + C.config.cut.resumePaddingPx * C.settings.cutPolicy.tolerance / width)) return;
    if (!path.length) path.push(point);
    drag = { id: event.pointerId, last: point, at: root.performance.now() };
    cutTipX=cutTargetX=point.x;cutHeatAt=drag.at;host.classList.add('is-cut-dragging');
    if (host.setPointerCapture) host.setPointerCapture(event.pointerId);
    if (event.preventDefault) event.preventDefault();
    cutIdle = 0; blade(true); dirty = true; C.fx.wake();
    C.events.emit('cut:started');
  }
  function addPoint(a, b, now, speed) {
    hot.push({ el: null, at: now, a: a, b: b, stroke: cfg.glintPx + (cfg.fastGlintPx - cfg.glintPx) * clamp(speed / cfg.glintSpeedPx) });
    if (hot.length > cfg.trailSegments) { var expired = hot.shift(); if (expired.el) expired.el.remove(); }
  }
  function cutMove(event) {
    if(cutStrategy&&!cutStrategy.usesSharedCut){if(phase==='cutting'&&!preferencesActive)cutStrategy.move(event,tear);return;}
    if (phase !== 'cutting' || cutFinish || preferencesActive) return;
    var valid = insideCut(event, !!drag); blade(valid);
    if (!valid) { release(event); return; }
    if (!drag && C.config.cut.requirePress) return;
    if (drag && event.pointerId !== drag.id) return;
    var point = aligned(event), now = root.performance.now();
    if (!path.length) path.push(point);
    var last = drag ? drag.last : path[path.length-1], distance = Math.abs(point.x-last.x)*width;
    if (distance < 0.5) return;
    var speed = distance / Math.max(8,now-(drag ? drag.at : now-C.config.shell.frameMs))*1000;
    var range=cutRange(), min=Math.min(range.min,point.x), max=Math.max(range.max,point.x);
    path=[{x:min,y:point.y},{x:max,y:point.y}];
    addPoint(last,point,now,speed);cutDirection=point.x>=last.x?1:-1;
    cutTargetX=point.x;cutHeatAt=now;cutHeat=Math.max(cutHeat,0.55+0.45*clamp(speed/cfg.glintSpeedPx));
    if (drag) { drag.at=now;drag.last=point; }
    cutIdle=0;dirty=true;C.events.emit('cut:progress',max-min);
    if (max-min >= C.settings.cutPolicy.span) {
      cutFinish={at:now,min:min,max:max,direction:cutDirection};
      host.classList.add('is-cut-finishing');release();cutHeat=1;
      announce('Seal cut. Opening pack.');
    }
    C.fx.wake();
  }
  function tear() {
    if (phase !== 'cutting') return;
    if(cutStrategy&&cutStrategy.advance){if(!preferencesActive&&!root.document.hidden)cutStrategy.advance();return;}
    cutFinish=null;host.classList.remove('is-cut-finishing');
    split = cutStrategy&&!cutStrategy.usesSharedCut?cutStrategy.geometry(width,height):C.cutGeometry.finish([{x:0,y:C.config.cut.guideY},{x:1,y:C.config.cut.guideY}], width, height, { axis: 'x', lineY: C.config.cut.guideY, minY: C.config.cut.topMin, maxY: C.config.cut.topMax });
    halves.forEach(function (half, i) { half.style.clipPath = C.cutGeometry.polygon(split.halves[i]); half.style.opacity = 1; });
    gap.setAttribute('d', C.cutGeometry.svg(split.path, width, height));
    stats.tears += 1; C.events.emit('cut:complete', { axis: split.axis, path: split.path });
    phaseTo('tearing'); particles.emit('tear', split.path, width, height, split.normal);
  }
  function paintFluid(dt) {
    var reduced = C.motion.reduced || !C.settings.policy.animation, agitation = clamp((fill - cfg.chargeAgitationAt) / (1 - cfg.chargeAgitationAt));
    var target = Math.sin(elapsed / cfg.waveMs * Math.PI * 2) * (cfg.meniscusPx + agitation * cfg.agitationPx);
    if (phase === 'draining') target += Math.sin(elapsed / C.config.hold.drainMs * Math.PI * cfg.sloshCycles) * cfg.sloshPx * (1 - elapsed / C.config.hold.drainMs);
    var wave = reduced ? 0 : meniscus.step(dt, target);
    var vibration = !reduced && phase === 'charging' ? clamp((fill - cfg.vibrationAt) / (1 - cfg.vibrationAt)) * cfg.vibrationPx : 0;
    glass.fluid.style.transform = 'translateY(' + (1 - fill) * 100 + '%)';
    glass.el.style.setProperty('--fluid-top', (1 - fill) * 100 + '%');
    glass.el.style.setProperty('--meniscus-wave', wave + 'px');
    glass.el.style.setProperty('--charge-leak', fill * fill);
    glass.el.dataset.chargeFill=fill;
    var transfer = reduced ? 0 : 1 - ease(Math.min(1, elapsed / C.config.packObject.handoffMs));
    var source = packPose || { x: 0, y: 0, lift: 0, rx: 0, ry: 0, rz: 0 };
    var pose = { rx: source.rx * transfer, ry: source.ry * transfer };
    glass.pose.style.transform = reduced ? 'translate(0px,0px)' : 'translate3d(' + (source.x * transfer + Math.sin(elapsed / 1000 * cfg.vibrationHz * Math.PI * 2) * vibration) + 'px,' + ((source.y - source.lift) * transfer + Math.cos(elapsed / 1000 * cfg.vibrationHz * Math.PI * 2) * vibration * 0.5) + 'px,' + source.lift * transfer + 'px) rotateX(' + pose.rx + 'deg) rotateY(' + pose.ry + 'deg) rotateZ(' + source.rz * transfer + 'deg)';
    if (packMaterial) packMaterial.update(pose, elapsed, reduced);
    if (C.settings.policy.particles > 0 && !reduced) glass.specks.forEach(function (speck) { speck.el.style.transform = 'translateY(' + (-((elapsed / 1000 * cfg.speckSpeedPx + speck.phase * cfg.speckSpeedPx) % height)) + 'px)'; });
    C.events.emit('charge:progress', fill);
  }
  function paintCut(now, dt) {
    if(cutStrategy&&!cutStrategy.usesSharedCut){cutGuide.style.opacity=0;cutTrack.style.opacity=0;cutTip.style.opacity=0;return cutStrategy.active;}
    var policy=C.config.cut, reduced=C.motion.reduced||!C.settings.policy.animation;
    var heat=phase==='cutting'?Math.max(drag?0.45:0,cutHeat*(1-clamp((now-cutHeatAt)/policy.heatDecayMs))):0;
    var draw=path;
    if(cutFinish){var snap=ease((now-cutFinish.at)/policy.finishSnapMs);draw=[{x:cutFinish.min*(1-snap),y:policy.guideY},{x:cutFinish.max+(1-cutFinish.max)*snap,y:policy.guideY}];heat=1;cutTargetX=cutFinish.direction>0?draw[1].x:draw[0].x;dirty=true;}
    if(dirty){var d=C.cutGeometry.svg(draw,width,height);seam.setAttribute('d',d);cutGlow.setAttribute('d',d);dirty=false;}
    cutTipX+=(cutTargetX-cutTipX)*(reduced?1:1-Math.exp(-dt/policy.tipFollowMs));
    if(Math.abs(cutTargetX-cutTipX)<0.001)cutTipX=cutTargetX;
    cutTip.setAttribute('cx',cutTipX*width);cutTip.setAttribute('cy',policy.guideY*height);
    cutTip.style.opacity=phase==='cutting'&&path.length?heat:0;
    cutGlow.style.opacity=phase==='tearing'?1-clamp(elapsed/cfg.tearMs):path.length?0.2+heat*0.8:0;
    host.style.setProperty('--cut-heat',heat);
    foil.style.transform=reduced?'none':'translateY('+(-heat*cfg.cutRecoilPx)+'px) rotate('+cutDirection*heat*cfg.cutRecoilDegrees+'deg)';
    if(drag){var r=host.getBoundingClientRect();C.events.emit('cursor:cutTarget',{x:r.left+cutTipX*width,y:r.top+policy.guideY*height,strength:heat});}
    var label=hint.querySelector('.opening-cut-hint');
    if(phase==='cutting')label.textContent=cutFinish?'Seal released':path.length>1?(drag?'Keep swiping':'Continue swipe')+' Ã‚· '+Math.min(100,Math.round(cutRange().span/C.settings.cutPolicy.span*100))+'%':'Swipe to open';
    hot=hot.filter(function(item){var age=now-item.at;if(age>=cfg.trailMs||reduced){if(item.el)item.el.remove();return false;}if(!item.el){item.el=svg('path',trails);item.el.setAttribute('class','opening-cut-glint');item.el.setAttribute('stroke-width',item.stroke);}item.el.setAttribute('d',C.cutGeometry.svg([item.a,item.b],width,height));item.el.style.opacity=1-ease(age/cfg.trailMs);return true;});
    return heat>0&&now-cutHeatAt<policy.heatDecayMs||Math.abs(cutTargetX-cutTipX)>0.001||!!drag||!!cutFinish;
  }

  function revealBounds() {
    var h = Math.min(C.viewport.height * motion.heightVh / 100, C.viewport.height - motion.viewportMarginPx * 2, (C.viewport.width - motion.viewportMarginPx * 2) * 7 / 5);
    h = Math.max(1, h); sceneHeight = h; sceneWidth = h * 5 / 7; scene.style.setProperty('--reveal-height', h + 'px'); scene.style.setProperty('--reveal-width', sceneWidth + 'px');
    scene.style.setProperty('--reveal-center-y', Math.min(C.viewport.height / 2, C.viewport.height - h / 2 - motion.actionSpacePx) + 'px');
    scene.style.setProperty('--bloom-scale', motion.bloomScale);
    if(variantLabel&&rarity)variantLabel.style.setProperty('--tag-prop-top',((rarity.propOutset?.top||0)*h)+'px');
  }
  function revealContext(active, strength) {
    stage.style.setProperty('--reveal-vignette', active && rarity && rarity.tier >= 7 && !C.motion.reduced ? C.config.polish.vignetteOpacity * (strength == null ? 1 : strength) : 0);
    C.events.emit('reveal:context', { hideCursor: active && phase === 'flipping', gridDim: active && rarity ? rarity.reveal.gridDim * (strength == null ? 1 : strength) : 0,
      halo: active ? Object.assign(C.viewport.global({x:C.viewport.width / 2,y:C.viewport.height / 2}), {radius:motion.haloRadiusPx}) : null });
  }
  function cleanReveal() {
    if(cutStrategy&&cutStrategy.clearReveal)cutStrategy.clearReveal();packEntrance=false;
    if(swapEffect)swapEffect.destroy();swapEffect=null;
    if (swapShell) swapShell.remove(); swapShell = null; swapUnit = null; swapTarget = null;
    if (mount) { mount.style.transformOrigin = ''; mount.style.transform = ''; }
    if (intro) intro.stop();
    if (currentView) currentView.destroy(); currentView = null;
    if(variantLabel){variantLabel.remove();variantLabel=null;}
    flights.forEach(function (flight) { flight.view.destroy(); flight.el.remove(); }); flights = [];
    if (dust) dust.clear(); stats.particles = 0; if (scene) { scene.hidden = true; scene.style.transform = ''; }
    if (bloom) bloom.style.opacity = 0; if (keepButton) { keepButton.hidden = true; keepButton.disabled = true; }
    if (deleteButton) { deleteButton.hidden = true; deleteButton.disabled = true; }
    pendingCards = null; shineAt = null; revealContext(false);
  }
  function updateBloom() {
    if (!currentView) return;
    currentView.setColorMode(C.config.rarityColorMode);
    var style = root.getComputedStyle(currentView.el);
    var accent = C.config.rarityColorMode === 'mono' ? 'white' : currentView.revealAccent || style.getPropertyValue('--border-accent').trim() || style.getPropertyValue('--art-accent').trim() || 'white';
    bloom.style.setProperty('--reveal-accent', accent);
  }
  function bloomLevel() { return Math.min(1, rarity.reveal.bloom + (ownedCount ? 0 : rarity.reveal.bloom * C.config.polish.newBloomGain)); }
  function revealTimings(speed) {
    var next = Object.assign(C.settings.revealTiming(rarity.reveal, rarity.tier, speed), { settleMs: motion.settleMs * speed });
    if(packEntrance){next.riseMs=cutStrategy.fallbackMs;next.preFlipPauseMs=0;next.flipMs=400;return next;}
    if (rarity.openingIntro && rarity.openingIntro.handoff) {
      next.riseMs = 0; next.preFlipPauseMs = 0;
      next.flipMs = rarity.openingIntro.handoff.flipMs * (C.settings.get('revealSpeed') === 'fast' ? C.config.rarityIntro.fastScale : 1);
    }
    return next;
  }
  function startReveal(recover, introDone, customEntrance) {
    packEntrance=!!customEntrance;
    if(recover&&cutStrategy)cutStrategy.reset();
    var pending = C.state.current.pendingReveal;
    if (pending && pending.options && pending.choice === null && cutStrategy && cutStrategy.resume) {
      cleanReveal(); host.style.visibility = ''; foil.style.opacity = 0;
      phaseTo('vaultOpening');
      cutStrategy.resume({announce:announce,canActivate:function(){return phase==='vaultOpening'&&!preferencesActive&&!root.document.hidden;},reveal:function(){startReveal(false);}});
      return;
    }
    if (!pending || !pending.cards.length) { reset(); return; }
    if (currentView) currentView.destroy(); currentView = null; if(variantLabel){variantLabel.remove();variantLabel=null;}
    cardIndex = Math.max(0, Math.min(pending.cards.length - 1, Math.floor(Number(pending.keptCount) || 0)));
    var instance = pending.cards[cardIndex], card = C.card(instance.cardId); rarity = C.rarity(card.rarity);
    if (!recover && !introDone && rarity.openingIntro) {
      cleanReveal(); particles.clear(); host.style.visibility = 'hidden'; foil.style.opacity = 0; gap.style.opacity = 0;
      phaseTo('rarityIntro'); C.events.emit('reveal:context', { hideCursor:true, gridDim:1, halo:null });
      intro.start(rarity.openingIntro, rarity.name, ['ascendant','secret'].indexOf(rarity.reveal.cutscene) !== -1 ? instance.serial : instance.instanceId);
      lastVisual = root.performance.now();
      announce(rarity.name + ' reveal. The card appears after the light sequence.'); return;
    }
    if (introDone && !recover) intro.beginHandoff(); else intro.stop();
    if (recover) intro.restoreBackdrop(rarity.openingIntro, ['ascendant','secret'].indexOf(rarity.reveal.cutscene) !== -1 ? instance.serial : instance.instanceId);
    ownedCount = C.state.current.inventory.filter(function (item) { return item.cardId === card.id; }).length + pending.cards.slice(0, cardIndex).filter(function (item) { return item.cardId === card.id && (pending.discardedInstanceIds || []).indexOf(item.instanceId) === -1; }).length;
    var speed = ownedCount && rarity.tier < 7 ? motion.duplicateMotionScale : 1;
    timings = revealTimings(speed);
    currentView = C.cardView.create(card, instance, { controlledReveal: true, autoFocus: false, owned: true }); mount.appendChild(currentView.el); currentView.setMode('full');
    currentView.setVariantProgress(recover ? 1 : 0);
    if(instance.variantId){variantLabel=node('div','variant-reveal-label',mount);variantLabel.style.setProperty('--tag-prop-top',((rarity.propOutset?.top||0)*sceneHeight)+'px');C.cardTags.render(variantLabel,{card:card,rarity:rarity,owned:true,variantId:instance.variantId,stackKey:C.stacks.of(instance),isNew:false},instance,'compact');if(recover)variantLabel.classList.add('is-ready');}
    currentView.setFace(recover ? 'front' : 'back'); revealClock = 0; infoClock = 0; shineAt = null; keeping = false;
    var specs = C.cardSpecs.frontRows(card).length;
    infoEnd = Math.max(motion.serialDelayMs + instance.serial.length * C.config.cardView.stampCharMs + C.config.cardView.stampFlickerMs,
      motion.serialDelayMs + motion.infoStepMs * (specs + 3) + (C.config.cardView.meterSegments - 1) * C.config.cardView.meterTickMs + motion.infoFadeMs);
    keepAt = Math.max(timings.settleMs, infoEnd + motion.keepDelayMs) + (ownedCount ? 0 : motion.newHoldMs);
    note.textContent = ownedCount ? 'x' + (ownedCount + 1) : 'New'; note.style.opacity = 0;
    scene.hidden = false; scene.style.opacity = 1; scene.style.transform = ''; mount.style.opacity = 1; mount.style.transform = ''; particles.clear(); stats.particles = 0;
    host.style.visibility = 'hidden'; foil.style.opacity = 0; hint.style.opacity = 0; gap.style.opacity = 0;
    updateBloom(); bloom.style.opacity = 0;
    currentView.setRevealFrame({ pose: { y: 0, scale: 1, turn: 0 }, angle: recover ? 0 : 180, frontOpacity: recover ? 1 : 0, shine: 0, infoMs: -1 });
    if (recover) {
      stats.recoveries += 1; infoClock = keepAt; currentView.setRevealFrame({ angle: 0, frontOpacity: 1, infoMs: infoClock, shine: 0 }); currentView.releaseReveal();
      phaseTo('revealed'); note.style.opacity = 1; bloom.style.opacity = bloomLevel(); showKeep();
    } else { phaseTo(introDone && rarity.openingIntro.handoff ? 'flipping' : 'rising'); announce('Revealing card ' + (cardIndex + 1) + ' of ' + pending.cards.length + '.'); }
  }
  function showKeep() {
    if (phase !== 'revealed' || infoClock < keepAt || keeping) return;
    var first = keepButton.hidden || keepButton.disabled;
    keepButton.hidden = false; keepButton.disabled = false;
    deleteButton.hidden = false; deleteButton.disabled = false;
    flipButton.hidden = false;
    if (first) C.events.emit('opening:keepReady');
    if (first && C.input.modality === 'keyboard') focus(keepButton);
  }
  function keep(discard) {
    discard = discard === true;
    if (preferencesActive || phase !== 'revealed' || keeping || keepButton.hidden || keepButton.disabled || root.document.hidden) return;
    var candidate = JSON.parse(JSON.stringify(C.state.current)), pending = candidate.pendingReveal;
    if (!pending || (Number(pending.keptCount) || 0) !== cardIndex) return;
    keeping = true; keepButton.disabled = true; deleteButton.disabled = true; pending.keptCount = cardIndex + 1;
    if (discard) { pending.discardedInstanceIds = pending.discardedInstanceIds || []; pending.discardedInstanceIds.push(pending.cards[cardIndex].instanceId); }
    var final = pending.keptCount >= pending.cards.length, discarded = pending.discardedInstanceIds || [];
    var cards = pending.cards.filter(function (item) { return discarded.indexOf(item.instanceId) === -1; }), decided = pending.cards[cardIndex];
    if (final) {
      var owned = new Set(candidate.inventory.map(function (item) { return item.instanceId; }));
      cards.forEach(function (item) { if (!owned.has(item.instanceId)) { candidate.inventory.push(item); owned.add(item.instanceId); } });
      candidate.pendingReveal = null;
      if (cards.length) candidate.inventoryUi.pendingFocusStackKey = C.stacks.of(cards[cards.length - 1]);
    }
    C.events.emit('opening:prepareKeep', { candidate: candidate, final: final });
    writingKeep = true; var saved = C.state.commit(candidate); writingKeep = false;
    if (!saved) {
      keeping = false; keepButton.disabled = false; deleteButton.disabled = false; error.textContent = 'Could not save. Your card is still reserved. Try again.';
      errorUntil = root.performance.now() + cfg.errorMs; announce(error.textContent); C.fx.wake(); return;
    }
    if (!discard) stats.keeps += 1;
    if (!final) startReveal(false);
    else if (cards.length) { pendingCards = cards; beginCollect(); }
    else { currentView.setMode('lite'); currentView.el.inert = true; phaseTo('discarding'); announce('Card deleted. Pack reward kept.'); }
    C.events.emit(discard ? 'card:discarded' : 'card:kept', decided);
  }
  function closeToast() {
    if (toastView) toastView.destroy(); toastView = null; toastAge = null;
    if (toast) { toast.hidden = true; toast.style.visibility = 'hidden'; toast.style.transform = 'translate(-50%,100vh)'; toast.style.clipPath = 'inset(100% 0 0 0 round var(--r-button))'; toast.style.willChange = ''; toast.setAttribute('aria-hidden', 'true'); }
    C.events.emit('menu:visibilityHold', { reason: 'collection-toast', active: false });
  }
  function beginCollect() {
    if (variantLabel) { variantLabel.remove(); variantLabel = null; }
    stats.collections += 1; collected = false;
    currentView.setPresentation('full'); currentView.setMode('lite'); currentView.setVisible(false);
    currentView.revealControlled = true; currentView.el.inert = true; dust.clear();
    currentView.el.style.opacity = 1; currentView.el.style.transform = '';
    currentView.setRevealFrame({ pose: { y: 0, scale: 1, turn: 0 }, angle: 0, frontOpacity: 1 });
    collectionSource = mount.getBoundingClientRect();
    var instance = pendingCards[pendingCards.length - 1];
    C.events.emit('inventory:handoffSource', { cardId: instance.cardId, stackKey: C.stacks.of(instance), instanceId: instance.instanceId, rect: collectionSource });
    collectionSource = C.viewport.rect(collectionSource);
    collectionTarget = C.viewport.rect(C.packView.el.getBoundingClientRect());
    swapTarget = C.packs.upcoming(1)[0];
    swapShell = node('div', 'pack-swap-shell', stage); swapShell.setAttribute('aria-hidden', 'true');
    swapShell.dataset.state = C.state.current.packs.ready ? 'ready' : 'waiting';
    swapShell.style.setProperty('--wrapper-shape', root.getComputedStyle(C.packView.el).getPropertyValue('--wrapper-shape'));
    swapUnit = C.packMarkup.unit(swapShell, false, swapTarget);
    C.packSkins.apply(swapUnit.el, swapTarget, C.state.current.packs.ready ? 'idle' : 'waiting');
    swapUnit.fluid.style.transform = 'translateY(' + (1 - (C.state.current.packs.ready ? 1 : C.timers.progress(Date.now()))) * 100 + '%)';
    C.packMaterial.create(swapUnit.el, swapTarget).update({ rx: 0, ry: 0 }, 0, true);
    swapShell.style.opacity = 0;
    closeToast(); toastAge = -(C.motion.reduced || C.settings.policy.animation < 2 ? C.config.packSwap.reducedMs / 2 : C.config.packSwap.turnMs * .75);
    toastView = C.cardView.create(pendingCards[0].cardId, pendingCards[0], { thumbnail: true, owned: true }); toastThumb.appendChild(toastView.el);
    var corner = parseFloat(root.getComputedStyle(currentView.el).getPropertyValue('--r-card'));
    toastThumb.style.setProperty('--thumbnail-radius', corner * motion.toastThumbnailWidthPx / collectionSource.width + 'px');
    toastName.textContent = pendingCards.length === 1 ? C.card(pendingCards[0].cardId).name : pendingCards.length + ' cards';
    toastDetail.textContent = 'Added to inventory';
    C.events.emit('menu:visibilityHold', { reason: 'collection-toast', active: true });
    phaseTo('collecting'); revealContext(true);
    announce('Card added to inventory. ' + swapTarget.name + ' is next.');
  }
  function updateToast(dt) {
    if (toastAge === null) return false;
    toastAge += dt; if (toastAge < 0) return true;
    toast.hidden = false; toast.style.visibility = 'visible'; toast.setAttribute('aria-hidden', 'false');
    var enter = clamp(toastAge / motion.infoFadeMs), exit = clamp((motion.toastMs - toastAge) / motion.infoFadeMs);
    paintToast(Math.min(enter, exit));
    if (toastAge >= motion.toastMs) { closeToast(); return false; } return true;
  }
  function paintToast(amount) {
    // One pre-mounted glass/content surface. Never fade the backdrop-filter layer.
    var moving = !C.motion.reduced && amount < 1;
    toast.style.willChange = moving ? 'transform' : '';
    toast.style.transform = C.motion.reduced ? 'translateX(-50%)' : 'translate(-50%,' + (1 - ease(amount)) * motion.packSlidePx + 'px)';
    toast.style.clipPath = C.motion.reduced ? 'none' : 'inset(' + (1 - ease(amount)) * 100 + '% 0 0 0 round var(--r-button))';
  }
  function updateReveal(dt) {
    if (!currentView) return false;
    var reduced = C.motion.reduced || !C.settings.policy.animation, p, pose, angle, h = sceneHeight;
    var dustActive = dust.update(dt); stats.particles = dust.count;
    if (phase === 'discarding') {
      p = clamp(elapsed / motion.discardMs); mount.style.opacity = 1 - ease(p);
      mount.style.transform = reduced ? 'none' : 'translateY(' + ease(p) * 16 + 'px) scale(' + (1 - ease(p) * .04) + ')';
      var waitingForBackdrop = rarity && rarity.openingIntro && rarity.openingIntro.backdrop && rarity.openingIntro.backdrop.animated && intro.backdropActive;
      if (p === 1 && !waitingForBackdrop) { cleanReveal(); phaseTo('idle'); host.style.visibility = ''; C.events.emit('pack:handoff'); }
      return phase !== 'idle';
    }
    if (phase === 'rising') {
      p = clamp(elapsed / timings.riseMs); pose = { y: (1 - ease(p)) * h * motion.risePortion, scale: 1 + (motion.riseScale - 1) * ease(p), turn: Math.sin(p * Math.PI) * motion.riseTurnDegrees };
      scene.style.opacity = reduced ? ease(p) : 1;
      currentView.setRevealFrame({ pose: pose, angle: 180, frontOpacity: 0, infoMs: -1 });
      if (p === 1) { phaseTo(timings.preFlipPauseMs ? 'preFlip' : 'flipping'); bloom.style.opacity = timings.preFlipPauseMs ? 0 : bloomLevel(); }
      return true;
    }
    if (phase === 'preFlip') {
      p = clamp(elapsed / timings.preFlipPauseMs); bloom.style.opacity = bloomLevel() * ease(p);
      revealContext(true, ease(p));
      scene.style.transform = !reduced && rarity.reveal.shiftPx ? 'translateX(' + rarity.reveal.shiftPx + 'px)' : '';
      var logo = 'cardable';
      if (currentView.backScramble && !reduced && elapsed >= timings.preFlipPauseMs - motion.secretBackMs) {
        var glyphs = C.config.finishMotion.secret.glyphs, step = Math.floor(elapsed / C.config.finishMotion.secret.scrambleMs);
        logo = Array.from(rarity.name).map(function (_, i) { return glyphs[(step + i * 7) % glyphs.length]; }).join('');
      }
      currentView.setRevealFrame({ pose: { y: 0, scale: motion.riseScale, turn: 0 }, backLogo: logo, angle: 180, frontOpacity: 0 });
      if (p === 1) { currentView.setRevealFrame({ backLogo: 'cardable' }); scene.style.transform = ''; phaseTo('flipping'); }
      return true;
    }
    if (phase === 'flipping') {
      p = clamp(elapsed / timings.flipMs); var smooth = p * p * (3 - 2 * p);
      angle = 180 * (1 - smooth) - motion.flipOvershootDegrees * Math.sin(clamp((p - motion.flipOvershootAt) / (1 - motion.flipOvershootAt)) * Math.PI);
      if (p >= 0.5 && shineAt === null) { shineAt = revealClock; stats.shines += 1; }
      pose = { y: intro.cardStageActive?0:-Math.sin(p * Math.PI) * motion.flipLiftPx, scale: intro.cardStageActive?1:1 + Math.sin(p * Math.PI) * (motion.flipScale - 1), turn: 0 };
      currentView.setRevealFrame({ pose: pose, angle: angle, frontOpacity: smooth, shine: shineAt === null ? 0 : (revealClock - shineAt) / motion.shineMs });
      if (p === 1) {
        currentView.setRevealFrame({ angle: 0, frontOpacity: 1 }); if(!intro.cardStageActive)currentView.releaseReveal(); phaseTo('settling'); infoClock = 0;
        if (!ownedCount) dust.emit('dust', [{ x: 0.5, y: 0.9 }], sceneWidth, h);
        C.events.emit('card:revealed', currentView.instance);
      }
      return true;
    }
    if (phase === 'settling' || phase === 'revealed') {
      if(intro.cardStageActive){currentView.setRevealFrame({angle:0,frontOpacity:1,infoMs:-1});return true;}
      if(currentView.revealControlled)currentView.releaseReveal();root.document.body.classList.remove('is-rarity-cinematic');
      currentView.setRevealFrame({ infoMs: infoClock, shine: shineAt === null ? 0 : (revealClock - shineAt) / motion.shineMs });
      var land = clamp(infoClock / timings.settleMs);
      mount.style.transform = reduced ? 'none' : 'translateY(' + Math.sin(land * Math.PI * motion.bounceCycles) * (1 - land) * motion.bouncePx + 'px)';
      note.style.opacity = clamp((infoClock - infoEnd) / motion.infoFadeMs);
      if (phase === 'settling' && land === 1 && infoClock >= infoEnd) phaseTo(currentView.instance.variantId ? 'variantReveal' : 'revealed');
      showKeep();
      return phase !== 'revealed' || infoClock < keepAt || (shineAt !== null && revealClock - shineAt < motion.shineMs) || dustActive;
    }
    if (phase === 'variantReveal') {
      var duration=reduced?C.config.variants.reducedRevealMs:C.config.variants.revealMs*(C.settings.get('revealSpeed')==='fast'?.7:1);
      var fraction=clamp(elapsed/duration), coating=reduced?fraction:clamp((fraction-.12)/.78);
      var steps=[.12,.36,.55,.70,.81,.88,.94], snap=0;
      if(!reduced&&fraction<.94){for(var n=0;n<steps.length-1;n++){if(fraction>=steps[n]&&fraction<steps[n+1]){var k=(fraction-steps[n])/(steps[n+1]-steps[n]);snap=(1-k)*(7-n)*(n%2?-1:1);break;}}}
      currentView.setVariantProgress(fraction>=.94?1:coating,snap);
      if(fraction===1){currentView.setVariantProgress(1,0);variantLabel.classList.add('is-ready');infoClock=keepAt;phaseTo('revealed');showKeep();C.events.emit('card:variantRevealed',currentView.instance);}
      return true;
    }
    if (phase === 'collecting') {
      if(swapTarget.swapIn){
        var swapStill=C.motion.reduced||C.settings.policy.animation<2,turnMs=swapStill?0:C.config.packSwap.turnMs*.45,turnP=turnMs?clamp(elapsed/turnMs):1,to=collectionTarget,from=collectionSource;
        currentView.setRevealFrame({angle:180*turnP,frontOpacity:1-turnP});
        mount.style.transformOrigin='top left';mount.style.transform=swapStill?'none':'translate('+((to.left-from.left)*turnP)+'px,'+((to.top-from.top)*turnP)+'px) scale('+(1+(to.width/from.width-1)*turnP)+')';
        currentView.el.style.opacity=turnP<1?1:0;
        swapShell.style.width=to.width+'px';swapShell.style.height=to.height+'px';swapShell.style.setProperty('--pack-width',to.width+'px');swapShell.style.transform='translate('+to.left+'px,'+to.top+'px)';
        if(turnP===1){
          if(!swapEffect){swapShell.style.opacity=1;swapUnit.el.style.opacity=0;swapEffect=C.packTransitions.create(swapTarget.swapIn,swapShell,pack,swapUnit.el,function(){},{incomingAlready:true});}
          if(!swapEffect||!swapEffect.update(dt)){cleanReveal();mount.style.transformOrigin='';phaseTo('idle');host.style.visibility='';C.events.emit('inventory:collectPulse');C.events.emit('pack:handoff',{swapped:true,packId:C.packs.upcoming(1)[0].id});}
        }
        bloom.style.opacity=bloomLevel()*(1-turnP);return phase==='collecting';
      }
      var fade = reduced || C.settings.policy.animation < 2;
      p = clamp(elapsed / (fade ? C.config.packSwap.reducedMs : C.config.packSwap.turnMs));
      var travel = p * p * (3 - 2 * p), from = collectionSource, to = collectionTarget;
      var x = from.left + (to.left - from.left) * travel, y = from.top + (to.top - from.top) * travel;
      var w = from.width + (to.width - from.width) * travel, height = from.height + (to.height - from.height) * travel;
      mount.style.transformOrigin = 'top left';
      mount.style.transform = fade ? 'none' : 'translate(' + (x - from.left) + 'px,' + (y - from.top) + 'px) scale(' + w / from.width + ')';
      var turn = p < .45 ? 180 * (p / .45) * (p / .45) * (3 - 2 * p / .45) : p < .65 ? 180 + (p - .45) * 200 : 220 + (p - .65) * 500;
      currentView.setRevealFrame({ angle: Math.min(270, turn), frontOpacity: 1 - p });
      currentView.el.style.opacity = fade ? 1 - clamp(p * 2) : p < .75 ? 1 : 0;
      swapShell.style.width = w + 'px'; swapShell.style.height = height + 'px';
      swapShell.style.setProperty('--pack-width', w + 'px');
      swapShell.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      swapUnit.pose.style.transform = C.packView.front.pose.style.transform;
      swapUnit.el.style.transform = fade ? 'none' : 'rotateY(' + (270 + clamp((p - .75) / .25) * 90) + 'deg)';
      swapShell.style.opacity = fade ? clamp((p - .5) * 2) : p >= .75 ? 1 : 0;
      bloom.style.opacity = bloomLevel() * (1 - travel);
      if (p >= .75 && !collected) { collected = true; C.events.emit('inventory:collectPulse'); }
      if (p === 1) {
        cleanReveal(); mount.style.transformOrigin = ''; phaseTo('idle'); host.style.visibility = '';
        C.events.emit('pack:handoff', { swapped: true, packId: C.packs.upcoming(1)[0].id });
      }
      return phase === 'collecting';
    }
    return false;
  }
  function update(now) {
    if (!enabled) return false;
    // Spatial/cosmic shots are analytic poses, so a slow frame must not lengthen the film.
    // Visibility changes reset lastVisual separately; hidden time never enters this clock.
    var cinematic = (phase === 'rarityIntro' || phase === 'flipping'||intro&&intro.cardStageActive) && rarity && rarity.openingIntro && (rarity.openingIntro.kind === 'crimson' || rarity.openingIntro.kind === 'cosmic' || rarity.openingIntro.kind === 'prismatic' || rarity.openingIntro.kind === 'system');
    var dt = Math.max(0, (cinematic ? now - lastVisual : Math.min(now - lastVisual, C.config.shell.maxFrameDeltaMs)) * (C.fx.presentationRate || 1)); lastVisual = now;
    stats.updates += 1;
    if (errorUntil) { error.style.opacity = now < errorUntil ? 1 : 0; if (now >= errorUntil) errorUntil = 0; }
    var toastActive = updateToast(dt);
    if (phase === 'idle') return errorUntil > 0 || toastActive;
    dt *= C.presentation.openingRate || 1; elapsed += dt;
    var backdropMoving = intro.updateBackdrop(dt);
    var wrapperMoving = false;
    if (['charging','draining','dissolving','cutting','tearing'].indexOf(phase) !== -1 && pack.skin !== 'standard') {
      var wrapperPose = packPose || {rx:0,ry:0}, still = C.motion.reduced || !C.settings.policy.ambient;
      wrapperMoving = !!foilMaterial.update(wrapperPose, elapsed, still);
      halfMaterials.forEach(function(material) { material.update(wrapperPose, elapsed, true); });
    }
    if(cutStrategy&&cutStrategy.updateReveal)cutStrategy.updateReveal(phase,elapsed);
    if(phase==='boxWaiting'||phase==='boxOpening'||phase==='vaultOpening')return cutStrategy.update(dt);
    if (phase === 'rarityIntro') { if (intro.update(elapsed, now)) startReveal(false, true); return true; }
    if (intro.active) intro.updateRelease(elapsed,dt);
    if(currentView&&intro.cardFrame){currentView.el.style.opacity=String(intro.cardFrame.opacity);currentView.el.style.transform='scale('+intro.cardFrame.scale+')';C.finishes.registry.ascendant.drawBorder(currentView.el,C.ascendantBackground.sampleBorder(currentView.instance.serial));bloom.style.opacity=String(bloomLevel()*.22*(1-intro.cardFrame.progress));}
    else if(currentView&&currentView.el.dataset.rarity==='ascendant'&&['flipping','settling','revealed','variantReveal'].indexOf(phase)!==-1){currentView.el.style.opacity='';currentView.el.style.transform='';C.finishes.registry.ascendant.drawBorder(currentView.el,1);}
    if (currentView && ['rising', 'preFlip', 'flipping', 'settling', 'variantReveal', 'revealed'].indexOf(phase) !== -1) { revealClock += dt; if (!intro.cardStageActive&&(phase === 'settling' || phase === 'variantReveal' || phase === 'revealed')) infoClock = Math.min(keepAt, infoClock + dt); }
    if (phase === 'charging') {
      fill = clamp((now - chargeAt) / C.config.hold.chargeMs); paintFluid(dt);
      glass.el.style.opacity = 1; foil.style.opacity = 0;
      if (!C.motion.reduced && C.settings.policy.particles > 0 && elapsed >= pulseAt) {
        var rect = host.getBoundingClientRect();
        C.events.emit('dots:pulse', { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, intensity: cfg.pulseIntensity });
        pulseAt = elapsed + cfg.pulseStartMs + (cfg.pulseEndMs - cfg.pulseStartMs) * fill;
      }
      if (fill === 1) commit();
      return true;
    }
    if (phase === 'draining') {
      var drain = clamp(elapsed / C.config.hold.drainMs); fill = drainFrom * (1 - ease(drain)); paintFluid(dt);
      glass.el.style.opacity = C.motion.reduced ? 1 - ease(drain) : 1 - ease((drain - (1 - cfg.drainExitPortion)) / cfg.drainExitPortion);
      hint.style.opacity = 1 - ease(drain);
      if (drain === 1) { glass.el.style.opacity = 0; phaseTo('idle'); }
      return phase !== 'idle' || errorUntil > 0;
    }
    if (['rising', 'preFlip', 'flipping', 'settling', 'variantReveal', 'revealed', 'collecting', 'discarding'].indexOf(phase) !== -1) return updateReveal(dt) || backdropMoving || toastActive || errorUntil > 0;
    var particleActive = particles.update(dt); stats.particles = particles.count;
    var cutActive=paintCut(now,dt);
    if (phase === 'dissolving') {
      var dissolve = clamp(elapsed / cfg.dissolveMs); glass.el.style.opacity = 1 - ease(dissolve); foil.style.opacity = ease(dissolve);
      paintFluid(dt);
      if(cutStrategy)cutStrategy.dissolve(glass,dissolve,dt);
      if (dissolve === 1) { glass.el.style.opacity = 0; phaseTo('cutting'); }
      return true;
    }
    if (phase === 'cutting') {
      foil.style.opacity = 1; cutIdle += dt;
      if(cutStrategy&&!cutStrategy.usesSharedCut){hint.style.opacity=0;enterHint.style.opacity=cutIdle>=cfg.enterHintMs?1:0;var strategyMoving=cutStrategy.update?cutStrategy.update(dt):false;return strategyMoving||wrapperMoving||cutStrategy.active||cutIdle<cfg.enterHintMs;}
      if(cutFinish&&now-cutFinish.at>=C.config.cut.finishSnapMs){tear();return true;}
      hint.style.opacity = 1;
      var guideP = (elapsed % cfg.cutGuideMs) / cfg.cutGuideMs;
      var guideVisible = !path.length;
      cutGuide.style.strokeDashoffset = C.motion.reduced || !C.settings.policy.animation ? 0 : 1 - ease(clamp(guideP / 0.72));
      cutGuide.style.opacity = guideVisible ? (C.motion.reduced || !C.settings.policy.animation ? 0.65 : guideP > 0.82 ? (1 - guideP) / 0.18 * 0.65 : 0.65) : 0;
      cutTrack.style.opacity = guideVisible ? 1 : 0.35;
      enterHint.style.opacity = cutIdle >= cfg.enterHintMs ? 1 : 0;
      return wrapperMoving || !C.motion.reduced && C.settings.policy.animation > 0 && guideVisible || cutIdle < cfg.enterHintMs || hot.length > 0 || particleActive || cutActive;
    }
    if (phase === 'tearing') {
      foil.style.opacity = 0; hint.style.opacity = 0; enterHint.style.opacity = 0;
      var lift = ease(elapsed / cfg.tearMs), separation = ease((elapsed - cfg.tearMs) / cfg.splitMs);
      var fall = ease((elapsed - cfg.tearMs - cfg.splitMs) / cfg.fallMs), reduced = C.motion.reduced || !C.settings.policy.animation;
      if(cutStrategy)cutStrategy.tear(halves,fall);
      var gapPx = cfg.separationMinPx * lift + (cfg.separationMaxPx - cfg.separationMinPx) * separation;
      gap.style.opacity = reduced ? 0 : lift * (1 - fall); gap.setAttribute('stroke-width', Math.min(cfg.cutFlashPx, gapPx));
      halves.forEach(function (half, i) {
        var side = (i === 0 ? -1 : 1) * (split.axis === 'x' ? 1 : -1);
        half.style.transform = reduced ? 'none' : 'translate3d(' + (split.normal.x * side * gapPx + (i===0?cfg.capSidePx*separation:0)) + 'px,' + (split.normal.y * side * gapPx + fall * (i === 0 ? cfg.fallMinPx : cfg.fallMaxPx)) + 'px,0) rotate(' + side * (i===0?cfg.capPeelDegrees:cfg.rotationDegrees) * separation + 'deg)';
        half.style.opacity = reduced ? 1 - ease(elapsed / (cfg.tearMs + cfg.splitMs + cfg.fallMs)) : 1 - fall;
      });
      if (elapsed >= cfg.tearMs + cfg.splitMs + cfg.fallMs) {
        gap.style.opacity = 0;
        if(cutStrategy&&cutStrategy.afterTear){
          phaseTo('boxWaiting');
          cutStrategy.afterTear({phase:phaseTo,announce:announce,canActivate:function(){return !preferencesActive&&!root.document.hidden&&phase==='boxWaiting';},reveal:function(fallback){startReveal(false,false,fallback);}});
        }else startReveal(false);
      }
      return true;
    }
    return false;
  }
  C.opening = {
    initialized: false, phase: phase, stats: stats,
    openNow: function (packId) {
      if (phase !== 'idle' || !enabled || preferencesActive || inventoryBlocked || C.state.current.pendingReveal) return false;
      if (packId) { var nextPack = C.pack(packId); if (!nextPack || !nextPack.enabled) return false; C.packs.forceNext(packId); }
      chargeStart(); if (phase !== 'charging') return false; commit();
      if (phase === 'dissolving') { elapsed = cfg.dissolveMs; C.fx.wake(); return true; } return false;
    },
    finishCut: function () { if (phase === 'cutting') tear(); },
    keepCurrent: function () { keep(false); },
    get view() { return currentView; }, get timings() { return timings; }, get cardIndex() { return cardIndex; }, get infoClock() { return infoClock; },
    get path() { return path; }, get fill() { return fill; }, get split() { return split; },
    init: function () {
      if (C.opening.initialized) return; C.opening.initialized = true;
      var params = new URLSearchParams(root.location.search);
      if (C.presentation.gallery) return;
      pack = C.packs.upcoming(1)[0]; if (!pack) return;
      if (C.state.current.pendingReveal) pack = C.pack(C.state.current.pendingReveal.packId) || pack;
      enabled = true; cfg = C.config.openingMotion; motion = C.config.revealMotion;
      root.document.body.style.setProperty('--opening-chrome-opacity', cfg.chargeChromeOpacity);
      stage = node('section', 'opening-stage', root.document.body); stage.hidden = true; stage.setAttribute('aria-label', 'Pack opening');
      intro = C.rarityIntro.create(stage); C.opening.intro = intro;var help=C.ui.create('help',{help:'opening',label:'Opening help'});help.classList.add('cb-opening-help');stage.appendChild(help);
      host = node('div', 'opening-pack', stage); host.setAttribute('tabindex', '0'); host.setAttribute('role', 'group');
      host.setAttribute('aria-label', 'Pack wrapper. Hold Space to charge; drag across the top strip or press Enter to tear.');
      cutZone=node('div','opening-cut-zone',host);cutZone.setAttribute('aria-hidden','true');
      host.style.setProperty('--cut-edge-padding',C.config.cut.edgePaddingPx+'px');
      host.style.setProperty('--cut-capture-top',C.config.cut.captureTop*100+'%');
      host.style.setProperty('--cut-capture-height',(C.config.cut.captureBottom-C.config.cut.captureTop)*100+'%');
      host.style.setProperty('--cut-guide-top', C.config.cut.guideY * 100 + '%');
      glass = C.packMarkup.unit(host, false, pack); glass.el.classList.add('opening-glass');
      foil = C.packMarkup.foil(host, pack);
      halves = [C.packMarkup.foil(host, pack), C.packMarkup.foil(host, pack)]; halves.forEach(function (half) { half.classList.add('opening-half'); });
      packMaterial = C.packMaterial.create(glass.el, pack); foilMaterial = C.packMaterial.create(foil, pack);
      halfMaterials = halves.map(function (half) { return C.packMaterial.create(half, pack); });
      usePack(pack,true);
      foilMaterial.update({ rx: 0, ry: 0 }, 0, true); halfMaterials.forEach(function (material) { material.update({ rx: 0, ry: 0 }, 0, true); });
      trails = svg('svg', host); trails.setAttribute('class', 'opening-seams'); trails.setAttribute('aria-hidden', 'true');
      cutTrack = svg('path', trails); cutTrack.setAttribute('class', 'opening-cut-track');
      cutGuide = svg('path', trails); cutGuide.setAttribute('class', 'opening-cut-guide'); cutGuide.setAttribute('pathLength', '1');
      cutGlow=svg('path',trails);cutGlow.setAttribute('class','opening-cut-glow');
      cutTip=svg('circle',trails);cutTip.setAttribute('class','opening-cut-tip');cutTip.setAttribute('r','2.5');cutTip.style.opacity=0;
      gap = svg('path', trails); gap.setAttribute('class', 'opening-light-gap'); seam = svg('path', trails); seam.setAttribute('class', 'opening-cut-seam'); seam.setAttribute('stroke-width', cfg.seamPx);
      var particleHost = node('div', 'opening-particles', host);
      particles = C.particles.create(particleHost, Math.max(cfg.dissolveCount, cfg.fleckCount));
      hint = node('div', 'opening-hint', host); node('kbd', 'opening-keycap', hint, 'Space'); node('span', 'opening-cut-hint', hint, 'Swipe to open');
      enterHint = node('div', 'opening-enter-hint', host, 'Enter to tear');
      touchTear = node('button', 'opening-tear-touch', host, 'Tear pack'); touchTear.type = 'button'; touchTear.hidden = true; touchTear.addEventListener('click', tear);
      status = node('div', 'visually-hidden', stage); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      error = node('div', 'opening-error', root.document.body); error.setAttribute('role', 'status');
      scene = node('div', 'opening-reveal', stage); scene.hidden = true;
      bloom = node('div', 'opening-bloom', scene); bloom.setAttribute('aria-hidden', 'true');
      mount = node('div', 'opening-card-mount', scene);
      var dustHost = node('div', 'opening-dust', scene); dust = C.particles.create(dustHost, motion.dustCount);
      note = node('div', 'opening-card-note', scene);
      flipButton = node('button', 'opening-flip', stage, 'Flip card'); flipButton.type = 'button'; flipButton.hidden = true; flipButton.addEventListener('click', function () { if (currentView) currentView.flip(); });
      keepButton = node('button', 'opening-keep glass', scene, 'Keep'); keepButton.setAttribute('type', 'button'); keepButton.hidden = true;
      keepButton.setAttribute('aria-keyshortcuts', 'Space Enter'); keepButton.setAttribute('aria-label', 'Keep card. Space or Enter.');
      node('kbd', 'opening-keep-key', keepButton, 'Space');
      keepButton.addEventListener('click', function () { C.input.keep(); });
      deleteButton = node('button', 'opening-delete glass', scene, 'Delete'); deleteButton.setAttribute('type', 'button'); deleteButton.hidden = true;
      deleteButton.setAttribute('aria-label', 'Delete this revealed card'); deleteButton.addEventListener('click', function () { C.input.discard(); });
      toast = node('aside', 'collection-toast glass', root.document.body); toast.setAttribute('role', 'status');
      toastThumb = node('div', 'collection-toast-thumb', toast); toastThumb.style.width = motion.toastThumbnailWidthPx + 'px'; toastThumb.setAttribute('aria-hidden', 'true'); toastThumb.inert = true;
      var toastText = node('div', 'collection-toast-text', toast);
      toastName = node('div', 'collection-toast-name', toastText);
      toastDetail = node('div', 'collection-toast-detail', toastText, 'Added to inventory'); closeToast();
      meniscus = C.springs.create(0); bounds(); revealBounds();
      host.dataset.tutorialTarget='wrapper'; keepButton.dataset.tutorialTarget='keep';
      C.opening.el = stage; C.opening.wrapper = host; C.opening.glass = glass; C.opening.foil = foil; C.opening.halves = halves;
      C.opening.scene = scene; C.opening.keepButton = keepButton; C.opening.note = note; C.opening.toast = toast;
      C.opening.deleteButton = deleteButton;
      C.opening.flipButton = flipButton; C.opening.tearButton = touchTear;
      C.opening.hint = hint; C.opening.enterHint = enterHint; C.opening.seam = seam; C.opening.error = error;
      root.document.getElementById('pack-stage').setAttribute('role', 'button');
      C.events.on('input:chargeStart', chargeStart); C.events.on('input:chargeEnd', chargeEnd); C.events.on('input:cancel', function (event) { cancel(event.reason); });
      C.events.on('inventory:context', function (event) { inventoryBlocked = event.active; });
      function keyHints() {
        var hold = C.settings.holdKey, action = C.settings.actionKey;
        hint.querySelector('kbd').textContent = hold; enterHint.textContent = action + ' to tear';
        var keepKey = keepButton.querySelector('kbd'); if (!keepKey) keepKey = node('kbd', 'opening-keep-key', keepButton); keepKey.textContent = 'Space';
        keepButton.setAttribute('aria-keyshortcuts', action === 'Enter' ? 'Space Enter' : 'Space'); keepButton.setAttribute('aria-label', 'Keep card. Space.');
        host.setAttribute('aria-label', 'Pack wrapper. Hold ' + hold + ' to charge; drag to cut or press ' + action + ' to tear.');
      }
      C.settings.onChange('openKey', keyHints); keyHints();
      C.settings.onChange('revealSpeed', function () {
        if (!currentView || !timings || !rarity) return;
        var old = timings, speed = ownedCount && rarity.tier < 7 ? motion.duplicateMotionScale : 1;
        timings = Object.assign(revealTimings(speed), { settleMs: old.settleMs });
        var key = { rising: 'riseMs', preFlip: 'preFlipPauseMs', flipping: 'flipMs' }[phase];
        if (key && old[key]) elapsed = elapsed / old[key] * timings[key];
      });
      C.events.on('preferences:context', function (event) { preferencesActive = event.active; });
      C.events.on('input:keep', keep);
      C.events.on('input:discard', function () { keep(true); });
      C.events.on('input:cutStart', cutStart); C.events.on('input:cutMove', cutMove); C.events.on('input:cutEnd', release); C.events.on('input:tear', tear);
      C.events.on('input:packActivate',function(){if(preferencesActive||root.document.hidden||!cutStrategy)return;if(phase==='boxWaiting'&&cutStrategy.activate)cutStrategy.activate();else if(phase==='cutting'&&cutStrategy.advance)cutStrategy.advance();});
      host.addEventListener('lostpointercapture', function () { release(); });
      host.addEventListener('pointerenter', function (event) { if (phase === 'cutting') blade(insideCut(event)); });
      host.addEventListener('pointerleave', function () { blade(false); });
      C.events.on('pointer:leave', function () { blade(false); });
      C.events.on('fx:visibility', function () { lastVisual = root.performance.now(); release(); blade(false); });
      C.events.on('motion:changed', function () { particles.clear(); dust.clear(); stats.particles = 0; meniscus.reset(0); hot.forEach(function (item) { if (item.el) item.el.remove(); }); hot = []; dirty = true; intro.resize(); C.fx.wake(); });
      C.events.on('save:written', function () { if (phase !== 'idle' && phase !== 'charging' && phase !== 'draining' && !C.state.current.pendingReveal && !writingKeep && phase !== 'collecting') reset(); context(); });
      C.events.on('save:reset', reset);
      C.events.on('save:imported', function () { if (C.state.current.pendingReveal) { usePack(C.pack(C.state.current.pendingReveal.packId)); startReveal(true); } });
      C.events.on('opening:replay', function () { if (phase === 'revealed' && C.state.current.pendingReveal) { cleanReveal(); clearCut(); host.style.visibility = ''; phaseTo('cutting'); foil.style.opacity = 1; } });
      C.viewport.onResize( function () {
        intro.resize();
        bounds(); revealBounds();
        if (currentView) revealContext(phase !== 'rising', phase === 'preFlip' ? ease(elapsed / timings.preFlipPauseMs) : 1);
        if (phase === 'collecting') {
          collectionSource = { left: C.viewport.width / 2 - sceneWidth / 2, top: parseFloat(scene.style.getPropertyValue('--reveal-center-y')) - sceneHeight / 2, width: sceneWidth, height: sceneHeight }; collectionTarget = C.viewport.rect(C.packView.el.getBoundingClientRect());
          var corner = parseFloat(root.getComputedStyle(currentView.el).getPropertyValue('--r-card'));
          toastThumb.style.setProperty('--thumbnail-radius', corner * motion.toastThumbnailWidthPx / collectionSource.width + 'px');
          flights.forEach(function (flight) { flight.el.style.width = collectionSource.width + 'px'; flight.el.style.setProperty('--thumbnail-radius', corner + 'px'); });
        }
        C.fx.wake();
      });
      C.events.on('settings:rarityColorMode', function () { updateBloom(); intro.resize(); });
      C.settings.onChange('cinematicQuality', function () { intro.resize(); });
      C.settings.onChange('canvasQuality', function () { intro.resize(); });
      C.settings.onChange('*', function() {
        if (pack.skin !== 'standard') {
          [packMaterial,foilMaterial].concat(halfMaterials).forEach(function(material) { material.update(packPose || {rx:0,ry:0},elapsed,true); });
        }
      });
      C.fx.subscribe(update, 'opening');
      if (C.state.current.pendingReveal) startReveal(true);
      else context();
    }
  };
})(window.Cardable, window);
