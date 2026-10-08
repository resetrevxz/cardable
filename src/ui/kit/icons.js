(function(C,root){'use strict';
  var NS='http://www.w3.org/2000/svg',paths={
    close:'m6 6 12 12M18 6 6 18',chevron:'m9 5 7 7-7 7',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
    settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    pack:'M5 3h14v18H5zM5 7h14M9 12h6M9 16h6',card:'M5 3h14v18H5zM8 7h8M8 16h8',variant:'m12 3 9 9-9 9-9-9zM8 12l4-4 4 4-4 4z',
    star:'m12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2',
    notes:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',check:'m4 12 5 5L20 6',reset:'M4 8a9 9 0 1 1-1 7M4 3v6h6',new:'M12 4v16M4 12h16',
    camera:'M3 7h4l2-3h6l2 3h4v13H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7',light:'M9 16a7 7 0 1 1 6 0v3H9zM9 22h6',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',error:'m12 3 10 18H2zM12 9v5M12 17h.01',copy:'M8 8h13v13H8zM3 16V3h13',menu:'M4 6h16M4 12h16M4 18h16',folder:'M3 7h7l2-3h9v16H3z',play:'m8 4 12 8-12 8z',pause:'M7 4v16M17 4v16'
  };
  var sprite=root.document.createElementNS(NS,'svg');sprite.classList.add('cb-sprite');sprite.setAttribute('aria-hidden','true');
  Object.keys(paths).forEach(function(id){var symbol=root.document.createElementNS(NS,'symbol');symbol.id='cb-icon-'+id;symbol.setAttribute('viewBox','0 0 24 24');var p=root.document.createElementNS(NS,'path');p.setAttribute('d',paths[id]);symbol.appendChild(p);sprite.appendChild(symbol);});root.document.body.appendChild(sprite);
  C.icons={names:Object.keys(paths),register:function(name,path){if(paths[name])return;paths[name]=path;C.icons.names.push(name);var symbol=root.document.createElementNS(NS,'symbol');symbol.id='cb-icon-'+name;symbol.setAttribute('viewBox','0 0 24 24');var p=root.document.createElementNS(NS,'path');p.setAttribute('d',path);symbol.appendChild(p);sprite.appendChild(symbol);},create:function(name){var svg=root.document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('cb-icon');var use=root.document.createElementNS(NS,'use');use.setAttribute('href','#cb-icon-'+(paths[name]?name:'card'));svg.appendChild(use);return svg;}};
})(window.Cardable,window);
