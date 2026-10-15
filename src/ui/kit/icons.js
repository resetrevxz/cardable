(function(C,root){'use strict';
  var NS='http://www.w3.org/2000/svg',paths={
    close:'m6 6 12 12M18 6 6 18',chevron:'m9 5 7 7-7 7',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
    settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    pack:'M5 3h14v18H5zM5 7h14M9 12h6M9 16h6',card:'M5 3h14v18H5zM8 7h8M8 16h8',variant:'m12 3 9 9-9 9-9-9zM8 12l4-4 4 4-4 4z',
    pin:'M8 3h8l-1 6 4 5H5l4-5ZM12 14v7',star:'m12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2',
    notes:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',check:'m4 12 5 5L20 6',reset:'M4 8a9 9 0 1 1-1 7M4 3v6h6',new:'M12 4v16M4 12h16',
    camera:'M3 7h4l2-3h6l2 3h4v13H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7',light:'M9 16a7 7 0 1 1 6 0v3H9zM9 22h6',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',error:'m12 3 10 18H2zM12 9v5M12 17h.01',copy:'M8 8h13v13H8zM3 16V3h13',menu:'M4 6h16M4 12h16M4 18h16',folder:'M3 7h7l2-3h9v16H3z',play:'m8 4 12 8-12 8z',pause:'M7 4v16M17 4v16'
  };
  Object.assign(paths,{
    settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    dots:'M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01',
    cursor:'m5 3 14 10-7 1-3 7Z',shop:'M5 7h14l1 14H4ZM8 8V6a4 4 0 0 1 8 0v2',
    grid:'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z',shelf:'M3 7h4v10H3ZM9 4h6v16H9ZM17 7h4v10h-4Z',
    filter:'M4 6h16M7 12h10M10 18h4M8 3v6M16 9v6M12 15v6',sort:'M6 4v16m-3-3 3 3 3-3M12 6h9M12 12h6M12 18h3',
    more:'M5 12h.01M12 12h.01M19 12h.01',collapse:'m6 9 6 6 6-6',expand:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
    back:'m10 5-7 7 7 7M3 12h17',next:'m9 5 7 7-7 7',previous:'m15 5-7 7 7 7',flip:'M5 9a8 8 0 1 1 1 10M5 4v5h5',
    download:'M12 4v11m-5-4 5 5 5-5M5 20h14',upload:'M12 16V5m-5 4 5-5 5 5M5 20h14',trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
    undo:'m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12',redo:'m16 5 5 5-5 5M21 10H10a6 6 0 0 0 0 12',
    layers:'m12 3 9 5-9 5-9-5ZM3 13l9 5 9-5M3 17l9 5 9-5',storage:'M4 3h16v18H4ZM4 15h16M8 18h.01M16 18h.01',
    compare:'M12 3v18M3 5h18v14H3Z',film:'M4 4h16v16H4ZM4 8h16M4 16h16M8 4v16M16 4v16',key:'m12 4 8 8-8 8-8-8Z',
    move:'M12 3v18M3 12h18m-12-6 3-3 3 3m3 3 3 3-3 3m-3 3-3 3-3-3m-3-3-3-3 3-3',scale:'M4 14v6h6M14 4h6v6M4 20l7-7M20 4l-7 7',
    text:'M4 5h16M12 5v15M8 20h8',shapes:'M4 4h9v9H4ZM16 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10',line:'M4 18 20 6',badge:'M4 5h16v14H4ZM8 9h8M8 14h5',
    lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5ZM12 14v3',unlock:'M7 10V7a5 5 0 0 1 9-3M5 10h14v11H5ZM12 14v3',
    'eye-off':'M3 3l18 18M9 5h3c6 0 10 7 10 7l-4 4M6 6l-4 6s4 7 10 7l5-1',
    palette:'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10ZM8 7h.01M5 12h.01M8 17h.01M13 7h.01',
    sparkle:'m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z',gauge:'M4 17a9 9 0 1 1 16 0M12 13l4-5M8 21h8',motion:'M13 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M3 8h6M2 12h7M3 16h6',
    keyboard:'M3 6h18v12H3ZM7 10h.01M11 10h.01M15 10h.01M7 14h10',monitor:'M3 4h18v12H3ZM9 20h6M12 16v4',
    access:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7h.01M8 10l4 1 4-1M12 11v4m0-1-3 4m3-4 3 4',info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v6M12 7h.01',
    swap:'M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4',image:'M3 5h18v14H3ZM3 16l5-5 4 4 3-3 6 6M16 9h.01',
    box:'m12 3 8 5v9l-8 4-8-4V8Zm0 9 8-4M4 8l8 4v9',crop:'M6 3v15h15M3 6h15v15',
    memory:'M4 6h16v11H4ZM7 9h3v4H7ZM14 9h3v4h-3ZM7 17v3M11 17v3M15 17v3',bolt:'m13 3-8 11h6l-1 7 8-11h-6Z',
    clipboard:'M9 3h6v4H9ZM9 5H5v16h14V5h-4',save:'M4 3h13l4 4v14H3V3ZM7 3v6h9V3M7 21v-8h10v8',minus:'M5 12h14',fullscreen:'M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6',coin:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M15 8c-5-3-7 8 0 8'
  });
  var aliases={select:'cursor',copies:'copy',backdrop:'palette',snap:'grid',paste:'clipboard',journal:'notes',receipt:'notes',album:'image',favorite:'star',collection:'folder',plus:'new',sliders:'filter',quality:'gauge',color:'palette',timer:'clock',export:'upload',replay:'flip',hide:'eye-off',rotate:'flip',photo:'camera',props:'box',scenes:'folder',cards:'card',arrow:'next',unknown:'memory',reorder:'dots',book:'notes'};
  Object.keys(aliases).forEach(function(id){paths[id]=paths[aliases[id]];});
  var sprite=root.document.createElementNS(NS,'svg');sprite.classList.add('cb-sprite');sprite.setAttribute('aria-hidden','true');
  Object.keys(paths).forEach(function(id){var symbol=root.document.createElementNS(NS,'symbol');symbol.id='cb-icon-'+id;symbol.setAttribute('viewBox','0 0 24 24');var p=root.document.createElementNS(NS,'path');p.setAttribute('d',paths[id]);symbol.appendChild(p);sprite.appendChild(symbol);});root.document.body.appendChild(sprite);
  C.icons={names:Object.keys(paths),register:function(name,path){if(paths[name])return;paths[name]=path;C.icons.names.push(name);var symbol=root.document.createElementNS(NS,'symbol');symbol.id='cb-icon-'+name;symbol.setAttribute('viewBox','0 0 24 24');var p=root.document.createElementNS(NS,'path');p.setAttribute('d',path);symbol.appendChild(p);sprite.appendChild(symbol);},create:function(name){var svg=root.document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('cb-icon');var use=root.document.createElementNS(NS,'use');use.setAttribute('href','#cb-icon-'+(paths[name]?name:'help'));svg.appendChild(use);return svg;}};
})(window.Cardable,window);
