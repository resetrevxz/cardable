(function (C, root) {
  'use strict';
  function node(name) { var el = root.document.createElement('div'); el.className = name; return el; }
  function layer(name) { var el = node('card__layer card__' + name); el.dataset.layer = name; return el; }
  C.cardView.createThumbnail = function (card, instance, options) {
    options = options || {};
    var rarity = C.rarity(card.rarity), context = { owned:options.owned!==false,instance:instance,colorMode:C.settings.get('rarityColor') };
    var generation=C.data.generations.find(function(g){return g.id===card.generation;});
    context.presentation = C.finishes.describe(rarity.finish, card, context);
    var el = node('collectible-card'), tilter = node('card__tilter'), flipper = node('card__flipper');
    el.dataset.cardId = card.id; el.dataset.rarity = rarity.id; el.dataset.frontDesign = rarity.frontDesign || '';
    el.dataset.visible = 'true'; el.dataset.mode = 'lite'; el.dataset.side = 'front'; el.dataset.presentation = options.presentation || 'full'; el.dataset.thumbnail = 'true'; el.dataset.colorMode = context.colorMode;
    el.dataset.variant = context.presentation.concealed ? 'normal' : instance.variantId || 'normal'; el.setAttribute('aria-hidden', 'true'); el.inert = true;
    el.dataset.cardSkin=instance.cardSkinId||'standard';
    if (context.presentation.state) el.dataset.finishState = context.presentation.state;
    el.appendChild(tilter); tilter.appendChild(flipper);
    function paintFace() {
      while (flipper.children.length) flipper.children[0].remove();
      // The printed front is complete; only its bounded static material is mounted.
      var face = node('card__face card__face--front'), art = layer('art');
      if (!context.presentation.hideArt) { var artWindow = node('card__art-window'); artWindow.appendChild(C.art.render(card, { thumbnail: true })); art.appendChild(artWindow); }
      face.appendChild(layer('body'));
      if(el.dataset.presentation==='full'){var finish=layer('finish'),lite=node('card__finish-render card__material card__material--lite');var prop=layer('prop'),propLite=node('card__prop-render card__material card__material--lite');prop.appendChild(propLite);var ctx=Object.assign({},context,{litePropElement:propLite,propElement:propLite});lite.appendChild(C.finishes.registry[rarity.finish].lite(card,ctx));finish.appendChild(lite);face.appendChild(finish);face.appendChild(prop);}
      face.appendChild(art);if(el.dataset.presentation==='full')face.appendChild(C.cardView.frontText(card,instance,rarity,generation,context).el);face.appendChild(layer('edge'));
      if (C.variantMaterials.registry[instance.variantId] && !context.presentation.concealed) { var coat = node('card__variant'), material = node('card__variant-render card__material card__material--lite'); material.appendChild(C.variantMaterials.registry[instance.variantId].lite(card, instance)); coat.appendChild(material); face.appendChild(coat); }
      flipper.appendChild(face);
      C.cardSkins.apply(face,card,instance,context);
    }
    function paint() {
      // Browsing mounts static, bounded materials; only detail/reveal mounts full effects.
      var tier = C.settings.get('quality') === 'very-low' ? 'very-low' : 'low';
      C.settings.withPolicy(tier, paintFace);
    }
    paint();
    var signature = C.settings.get('quality') === 'very-low' ? 'very-low' : 'low';
    var stop = C.settings.onChange('*', function (_, key) {
      if (key === 'rarityColor') { context.colorMode = C.settings.get('rarityColor'); el.dataset.colorMode = context.colorMode; el.querySelectorAll('.finish-surface').forEach(function (surface) { surface.dataset.colorMode = context.colorMode; }); }
      var next = C.settings.get('quality') === 'very-low' ? 'very-low' : 'low'; if (next !== signature) { signature = next; paint(); }
    });
    var untrack, view = { el: el, card: card, instance: instance, mode: 'lite', side: 'front', visible: true, destroyed: false, thumbnail: true,
      setMode: function () {}, setVisible: function (value) { if(view.visible===value)return;view.visible = value; el.dataset.visible = value; }, setPresentation:function(value){if(value!=='full'&&value!=='art-only')return;el.dataset.presentation=value;paint();},
      destroy: function () { if (view.destroyed) return; view.destroyed = true; stop(); untrack(); el.remove(); } };
    untrack = C.cardView.trackThumbnail(view); return view;
  };
})(window.Cardable, window);
