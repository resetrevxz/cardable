(function(C,root){'use strict';
  // Static optical strips bend the backdrop at the rim, never foreground cards.
  // Their small bounds avoid filtering the complete scrolling sheet with SVG.
  C.ui.inventoryGlass=function(host){
    if(!root.document.getElementById('cb-inventory-refraction-x')){
      var svg=root.document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.classList.add('cb-inventory-optics');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
      ['x','y'].forEach(function(axis){
        var horizontal=axis==='x',map='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="edge" x2="'+(horizontal?'1':'0')+'" y2="'+(horizontal?'0':'1')+'"><stop stop-color="'+(horizontal?'#ff8000':'#80ff00')+'"/><stop offset=".5" stop-color="#808000"/><stop offset="1" stop-color="'+(horizontal?'#008000':'#800000')+'"/></linearGradient></defs><rect width="512" height="512" fill="url(#edge)"/></svg>';
        var definition=root.document.createElementNS(svg.namespaceURI,'defs');definition.innerHTML='<filter id="cb-inventory-refraction-'+axis+'" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="edge"/><feComponentTransfer in="edge" result="field"><feFuncR type="linear" intercept="-.00196078"/><feFuncG type="linear" intercept="-.00196078"/></feComponentTransfer><feDisplacementMap in="SourceGraphic" in2="field" scale=".32" xChannelSelector="R" yChannelSelector="G"/></filter>';
        definition.querySelector('feImage').setAttribute('href','data:image/svg+xml,'+encodeURIComponent(map));svg.appendChild(definition);
      });root.document.body.appendChild(svg);
    }
    host.classList.add('cb-inventory-glass');
    if(!host.querySelector(':scope > .cb-inventory-glass-edge'))['left','right','top'].forEach(function(side){var edge=root.document.createElement('i');edge.className='cb-inventory-glass-edge cb-inventory-glass-edge--'+side;edge.setAttribute('aria-hidden','true');host.appendChild(edge);});
    return host;
  };
})(window.Cardable,window);
