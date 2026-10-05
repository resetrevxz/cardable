(function (C, root) {
  'use strict';
  var node = C.packMarkup.node;
  // Shared surface for the game and the existing developer command registry.
  var closing=new WeakMap();
  C.paletteUI = {
    show:function(el){root.clearTimeout(closing.get(el));closing.delete(el);el.classList.remove('qol-closing');el.inert=false;el.hidden=false;},
    hide:function(el,remove){root.clearTimeout(closing.get(el));el.inert=true;el.classList.add('qol-closing');var delay=C.settings.get('quality')==='very-low'?0:150;closing.set(el,root.setTimeout(function(){closing.delete(el);el.classList.remove('qol-closing');if(remove)el.remove();else el.hidden=true;},delay));},
    create: function (options) {
    var backdrop=node('div','dev-palette-backdrop',C.viewport.parent(root.document.body));backdrop.hidden=true;
    var dialog=node('section','dev-palette glass glass--sheet',backdrop);dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',options.label);
    var input=node('input','dev-search',dialog);input.type='search';input.placeholder=options.placeholder;input.setAttribute('role','combobox');input.setAttribute('aria-label',options.label);input.setAttribute('aria-expanded','true');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',options.id);
    var matches=node('div','dev-matches',dialog);matches.id=options.id;matches.setAttribute('role','listbox');matches.setAttribute('aria-label','Matching commands');
    node('p','dev-palette-hint',dialog,'↑ ↓ Navigate   Enter Run   Esc Close');
    return {backdrop:backdrop,dialog:dialog,input:input,matches:matches};
  } };
})(window.Cardable,window);
