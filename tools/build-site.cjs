'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), pkg = require('../package.json'), release = require('../desktop-release.json'), manifest = require('../site/manifest.cjs');
if (!release.owner || !release.repository) throw Error('Configure release repository first.');
const repo = release.owner + '/' + release.repository, out = path.join(root, 'dist/site');

function copy(source, target = source) {
  const dest = path.join(out, target);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, source), dest);
}

const context = { window: { Cardable: { data: {} } } };
for (const name of ['rarities', 'cards']) vm.runInNewContext(fs.readFileSync(path.join(root, 'src/data/' + name + '.js'), 'utf8'), context);
const C = context.window.Cardable;
const cards = manifest.cards.map(id => {
  const card = C.data.cards.find(c => c.id === id);
  if (!card || card.retired || ['secret', 'limited'].includes(card.rarity) || !fs.existsSync(path.join(root, card.art.src))) {
    throw Error('Invalid public card ' + id);
  }
  return card;
});

// Copy scripts, styles, vendors
for (const file of [
  'style.css', 'journey.css', 'site.js', 'presentation.js', 'journey.js', 'adapter.js',
  'vendor/gsap.min.js', 'vendor/ScrollTrigger.min.js', 'vendor/GSAP-LICENSE.txt', 'vendor/GSAP-LICENSE.html'
]) copy('site/' + file, file);

for (const css of manifest.styles) copy('src/styles/' + css + '.css');
for (const js of manifest.scripts.filter(s => s !== '@adapter')) copy('src/' + js + '.js');

for (const file of [
  'assets/icons/icon.svg', 'assets/fonts/inter-variable.woff2', 'assets/fonts/jetbrains-mono-variable.woff2',
  'assets/fonts/bodoni-moda-variable.ttf', 'assets/fonts/bodoni-moda-OFL.txt', 'assets/fonts/bodoni-moda-SOURCE.md',
  'assets/fonts/Inter-OFL.txt', 'assets/fonts/JetBrainsMono-OFL.txt', 'assets/packs/foil-laminate.png',
  'assets/materials/matte-grain.svg', 'assets/materials/starlight.svg', 'assets/materials/galaxy-stars.svg'
]) copy(file);

for (const card of cards) {
  for (const asset of [card.art.src, card.art.thumb, card.art.thumbnail, card.art.subjectMask].filter(Boolean)) {
    if (fs.existsSync(path.join(root, asset))) copy(asset);
  }
}

const previews = [
  ...manifest.cards.map(id => id + '.jpg'),
  'card-back.jpg', 'rare-pack.jpg', 'finish-matte.jpg', 'finish-rainbow-holo.jpg',
  'finish-galaxy-holo.jpg', 'finish-aurora.jpg',
  ...['legendary', 'mythical', 'exotic', 'ascendant'].map(id => 'world-' + id + '.jpg')
];
for (const file of previews) copy('site/previews/' + file, 'previews/' + file);

const base = 'https://github.com/' + repo + '/releases/download/v' + pkg.version + '/';
const info = {
  version: pkg.version,
  installer: base + 'Cardable-Setup-' + pkg.version + '.exe',
  folder: base + 'Cardable-' + pkg.version + '-Windows-x64.zip',
  checksums: base + 'SHA256SUMS.txt',
  release: 'https://github.com/' + repo + '/releases/tag/v' + pkg.version
};

fs.writeFileSync(path.join(out, 'release.js'), 'window.CARDABLE_RELEASE = ' + JSON.stringify(info) + ';\n');
fs.writeFileSync(path.join(out, 'catalog.js'), 'window.CARDABLE_CATALOG = ' + JSON.stringify(cards.map(c => ({ id: c.id }))) + ';\n');

let html = fs.readFileSync(path.join(root, 'site/home.html'), 'utf8');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

html = html.replace('<!-- RENDERER_STYLES -->', manifest.styles.map(s => '<link rel="stylesheet" href="src/styles/' + s + '.css">').join('\n'));
html = html.replace('<!-- RENDERER_SCRIPTS -->', manifest.scripts.map(s => '<script defer src="' + (s === '@adapter' ? 'adapter.js' : 'src/' + s + '.js') + '"></script>').join('\n'));

function preview(c, extra = '') {
  return '<img src="previews/' + c.id + '.jpg" width="500" height="700" alt="' + esc(c.name) + ', ' + esc(C.data.rarities.find(r => r.id === c.rarity).name) + ' Cardable card" ' + extra + '>';
}

const collectionItems = cards.map((c, i) =>
  '<li data-rarity="' + c.rarity + '"><button class="collection-card" disabled data-card="' + c.id + '" aria-pressed="' + (i === 0) + '" aria-label="Select ' + esc(c.name) + '"><span class="thumb">' + preview(c, 'loading="lazy"') + '</span><span class="card-caption">' + esc(c.name) + '<small>' + esc(C.data.rarities.find(r => r.id === c.rarity).name) + '</small></span></button></li>'
).join('\n');

html = html.replace('<!-- COLLECTION -->', collectionItems);
html = html.replace('<!-- FINALE_CARDS -->', cards.slice(0, 18).map((c, i) => '<div class="final-card" style="--i:' + i + '">' + preview(c, 'loading="lazy"') + '</div>').join('\n'));
html = html.replaceAll('{{VERSION}}', pkg.version).replaceAll('{{INSTALLER}}', info.installer).replaceAll('{{FOLDER}}', info.folder);

// Standalone dedicated pages
const downloadPageContent = `
<div class="page-hero">
  <div>
    <p class="eyebrow">CARDABLE v${pkg.version} · WINDOWS 10/11 x64</p>
    <h1>Make it<br><span>yours.</span></h1>
    <p>100% Offline. Local saves. No account. Ever.</p>
    <div class="hero-actions" style="margin-top:32px;">
      <a class="button primary" data-download="installer" href="${info.installer}">Download for Windows <span>↗</span></a>
      <a class="text-link" data-download="folder" href="${info.folder}">Portable folder <span>↗</span></a>
    </div>
    <div class="pillars-grid" style="margin: 28px 0 0; grid-template-columns: repeat(2, 1fr); gap: 16px;">
      <div class="pillar-card">
        <span class="pillar-icon">01</span>
        <h4>Offline by design</h4>
        <p>Play offline without an account. The installed app contacts GitHub to check and download updates.</p>
      </div>
      <div class="pillar-card">
        <span class="pillar-icon">02</span>
        <h4>Local AppData</h4>
        <p>Saves live on your machine. Export full JSON backups whenever you want.</p>
      </div>
    </div>
  </div>
  <div class="page-hero-art download-art">
    <img src="previews/geforce-rtx-4090.jpg" width="500" height="700" alt="Exotic GeForce RTX 4090 Cardable card">
  </div>
</div>

<section class="scene" style="padding: 20px 8vw 100px;">
  <p class="eyebrow">CHOOSE YOUR INSTALLATION</p>
  <div class="download-cards-grid">
    <div class="download-box recommended">
      <span class="badge">RECOMMENDED</span>
      <h3>Windows installer</h3>
      <p>One click for your Windows user. Start Menu and Desktop shortcuts. Updates itself on normal quit.</p>
      <div style="font: 11px var(--font-mono); color: #8e8e93; margin-bottom: 24px;">Cardable-Setup-${pkg.version}.exe · Windows x64</div>
      <a class="button primary" data-download="installer" href="${info.installer}">Download installer <span>↗</span></a>
    </div>

    <div class="download-box">
      <span class="badge">PORTABLE</span>
      <h3>Complete portable folder</h3>
      <p>No install. Extract anywhere, keep the folder together, run Cardable.exe.</p>
      <div style="font: 11px var(--font-mono); color: #8e8e93; margin-bottom: 24px;">Cardable-${pkg.version}-Windows-x64.zip · Windows x64</div>
      <a class="button ghost" data-download="folder" href="${info.folder}">Download folder <span>↗</span></a>
    </div>
  </div>

  <div class="checksum-box">
    <p class="eyebrow">INTEGRITY &amp; RELEASES</p>
    <h3>Release checksums</h3>
    <p style="font-size: 13px; color: #8e8e93; margin-bottom: 20px;">Current builds are unsigned. Verify SHA-256 hashes against our published release before opening.</p>
    <div class="checksum-list">
      <div class="checksum-item">
        <div>
          <span style="display:block; font-weight:600; color:#fff; margin-bottom:4px;">Cardable-Setup-${pkg.version}.exe</span>
          <span style="display:block; font-weight:600; color:#fff; margin-bottom:4px;">Cardable-${pkg.version}-Windows-x64.zip</span>
        </div>
        <a class="text-link" href="${info.checksums}">Compare SHA-256 hashes ↗</a>
      </div>
    </div>
    <div class="release-links" style="margin-top: 24px;">
      <a href="${info.release}">GitHub Release notes ↗</a>
      <a href="https://github.com/${repo}/blob/main/PLAY.md">Complete player guide ↗</a>
      <a href="https://github.com/${repo}">Source repository ↗</a>
    </div>
  </div>

  <div class="guide-step-grid">
    <div class="guide-step">
      <span class="step-num">01 / SAVES &amp; BACKUPS</span>
      <h3>Local save folder</h3>
      <p>Saves live in <code>%APPDATA%\\Cardable\\saves</code>. Use in-game Settings → Data → Export save to produce a portable JSON backup. Keep backups before system resets.</p>
    </div>
    <div class="guide-step">
      <span class="step-num">02 / STUDIO ALBUM</span>
      <h3>Photo preservation</h3>
      <p>Studio photos are saved as local high-resolution image blobs separate from JSON saves. Download the photos you want to keep from the Album before changing installations.</p>
    </div>
    <div class="guide-step">
      <span class="step-num">03 / UPGRADES &amp; 4.X</span>
      <h3>Quiet updating</h3>
      <p>Installed builds update on normal quit after saving. Folder builds update manually. Older 4.x builds need a one-time manual installer for the new 1.x series. Close normally and back up progress and photos first.</p>
    </div>
  </div>

  <div class="game-notes"><h2>Play your way.</h2><div><p>Windows 10/11 x64. The installer includes the complete offline app.</p><p>Very Low, Low, Medium and High graphics. Choose FPS and background behaviour independently. Medium is the default.</p></div></div><div class="dl-finale">
    <p class="eyebrow">CARDABLE FOR WINDOWS</p>
    <h2>Keep the<br>moment.</h2>
    <div class="hero-actions" style="margin-top:32px; justify-content:center;">
      <a class="button primary" data-download="installer" href="${info.installer}">Download for Windows <span>↗</span></a>
      <a class="text-link" data-download="folder" href="${info.folder}">Portable folder <span>↗</span></a>
    </div>
    <p class="micro" style="margin-top:24px;">NO ACCOUNT · OFFLINE · YOURS</p>
  </div>
</section>
`;

const collectionPageContent = `
<div class="page-hero">
  <div>
    <p class="eyebrow">THE HARDWARE ARCHIVE · DEMO CATALOG</p>
    <h1>Make<br><span>room.</span></h1>
    <p>24 curated GPUs spanning silicon history. Search, filter, inspect the live card, turn front and back, and switch collectible finishes.</p>
  </div>
  <div class="page-hero-art selected-object render-slot">
    <img src="previews/geforce-rtx-4090.jpg" width="500" height="700" alt="Selected demonstration card">
  </div>
</div>

<section class="collection scene" style="padding-top: 20px;">
  <div class="collection-toolbar enhanced-control">
    <input class="catalog-search" type="search" placeholder="Find hardware by name or memory..." aria-label="Search catalog">
    <div class="filters" role="group" aria-label="Filter by rarity">
      <button data-filter="all" aria-pressed="true" type="button">All <span>24</span></button>
      <button data-filter="legendary" aria-pressed="false" type="button">Legendary</button>
      <button data-filter="mythical" aria-pressed="false" type="button">Mythical</button>
      <button data-filter="exotic" aria-pressed="false" type="button">Exotic</button>
      <button data-filter="ascendant" aria-pressed="false" type="button">Ascendant</button>
    </div>
    <div class="vendor-filters" role="group" aria-label="Filter by vendor">
      <button data-vendor="all" aria-pressed="true" type="button">All Vendors</button>
      <button data-vendor="nvidia" aria-pressed="false" type="button">NVIDIA</button>
      <button data-vendor="amd" aria-pressed="false" type="button">AMD</button>
      <button data-vendor="intel" aria-pressed="false" type="button">Intel</button>
      <button data-vendor="apple" aria-pressed="false" type="button">Apple</button>
    </div>
    <div class="view-controls" role="group" aria-label="Collection arrangement">
      <button data-layout="shelf" aria-pressed="true" type="button">Shelf</button>
      <button data-layout="grid" aria-pressed="false" type="button">Grid</button>
    </div>
  </div>

  <div class="catalog-results">
    <div class="collection-content">
      <ul class="collection-wall" data-layout="shelf">
        ${collectionItems}
      </ul>
      <aside class="collection-detail">
        <div class="selected-object render-slot" data-scene-card="collection">
          <img src="previews/geforce-rtx-4090.jpg" width="500" height="700" alt="Selected demonstration card">
        </div>
        <div class="selected-data" aria-live="polite">
          <span class="micro" data-selected-rarity>EXOTIC</span>
          <h3 data-selected-name>GeForce RTX 4090</h3>
          <p data-selected-specs>24 GB GDDR6X · Generation 2</p>
          <div class="serial-row">
            <span class="micro" data-selected-serial>CBL-WEB2-000001</span>
            <button class="copy-btn quiet-button enhanced-control" type="button" data-copy-target="[data-selected-serial]" aria-label="Copy serial number">Copy</button>
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin:16px 0;">
          <button id="flip-collection" class="quiet-button enhanced-control" type="button">Turn the card ↻</button>
        </div>
        <div class="finish-controls enhanced-control" role="group" aria-label="Inspect a finish">
          <button type="button" data-finish="normal" aria-pressed="true">Normal</button>
          <button type="button" data-finish="matte" aria-pressed="false">Matte</button>
          <button type="button" data-finish="rainbow-holo" aria-pressed="false">Rainbow Holo</button>
          <button type="button" data-finish="galaxy-holo" aria-pressed="false">Galaxy Holo</button>
          <button type="button" data-finish="aurora" aria-pressed="false">Aurora</button>
        </div>
        <p class="micro">HARDWARE ARCHIVE · DEMO ONLY</p>
      </aside>
    </div>
    <p class="empty-note" hidden>No matching GPUs found. Try another search term.</p>
  </div>
  <p class="collection-result micro" aria-live="polite">24 cards on display</p>
</section>

<section class="scene" style="padding: 40px 8vw 100px; border-top: 1px solid #ffffff15;">
  <p class="eyebrow">PROVENANCE &amp; SERIALS</p>
  <div class="game-notes" style="border:0; padding: 20px 0;">
    <h2>Every card.<br>Its own record.</h2>
    <div>
      <p>Cards carry a permanent serial, finish and pack origin. WEB2 serials and history shown here are demonstration examples.</p>
      <p>Create card portraits in Director, then save them to the Album or export a photo.</p>
      <a class="text-link" href="../download/">Download Cardable for Windows ↗</a>
    </div>
  </div>
</section>
`;

const worldsPageContent = `
<div class="page-hero">
  <div>
    <p class="eyebrow">THE WORLDS OF CARDABLE</p>
    <h1>Some reveals<br><span>change the room.</span></h1>
    <p>Four rarity worlds. Scroll, scrub, or watch the whole reveal.</p>
    <div class="world-index" style="margin-top:28px;">
      <a href="#world-legendary">01 / Legendary</a>
      <a href="#world-mythical">02 / Mythical</a>
      <a href="#world-exotic">03 / Exotic</a>
      <a href="#world-ascendant">04 / Ascendant</a>
    </div>
  </div>
</div>

<section class="worlds scene" style="padding-top: 0;">
  <div class="world-gallery">
    <article id="world-legendary" class="world-panel" data-world="legendary">
      <img src="previews/world-legendary.jpg" width="1440" height="900" loading="lazy" alt="Legendary gilded prism">
      <div class="world-caption">
        <span class="micro">LEGENDARY · 8.6 SECONDS</span>
        <h3>Gilded prism.</h3>
      </div>
    </article>
    <article id="world-mythical" class="world-panel" data-world="mythical">
      <img src="previews/world-mythical.jpg" width="1440" height="900" loading="lazy" alt="Mythical Crimson Clock">
      <div class="world-caption">
        <span class="micro">MYTHICAL · 27.6 SECONDS</span>
        <h3>Crimson Clock.</h3>
      </div>
    </article>
    <article id="world-exotic" class="world-panel" data-world="exotic">
      <img src="previews/world-exotic.jpg" width="1440" height="900" loading="lazy" alt="Exotic galaxy">
      <div class="world-caption">
        <span class="micro">EXOTIC · 19.3 SECONDS</span>
        <h3>A galaxy opens.</h3>
      </div>
    </article>
    <article id="world-ascendant" class="world-panel" data-world="ascendant">
      <img src="previews/world-ascendant.jpg" width="1440" height="900" loading="lazy" alt="Ascendant Prismatic Dawn">
      <div class="world-caption">
        <span class="micro">ASCENDANT · 32.5 SECONDS</span>
        <h3>Prismatic Dawn.</h3>
      </div>
    </article>
  </div>
</section>

<section class="scene world-outro"><p class="eyebrow">KEEP THE MOMENT.</p><h2>Yours to discover.</h2><a class="button primary" href="../download/">Download Cardable ↗</a></section>
`;

const gamePageContent = `
<div class="page-hero">
  <div>
    <p class="eyebrow">CARDABLE / THE GAME</p>
    <h1>Hold. Cut.<br><span>Reveal.</span></h1>
    <p>Open a pack. Keep a card. Build your collection.</p>
    <div style="margin-top: 32px;">
      <a class="button primary" href="../download/">Download for Windows ↗</a>
    </div>
  </div>
  <div class="page-hero-art hero-object render-slot has-live">
    <img src="previews/geforce-rtx-4090.jpg" width="500" height="700" alt="Exotic GeForce RTX 4090 Cardable card">
  </div>
</div>

<section class="scene" style="padding: 40px 8vw 100px;">
  <p class="eyebrow">THE THREE MOVEMENTS</p>
  <div class="guide-step-grid">
    <div class="guide-step">
      <span class="step-num">01 / HOLD</span>
      <h3>Hold three seconds</h3>
      <p>Hold the sealed pack for three seconds. Release early and the charge drains away.</p>
    </div>
    <div class="guide-step">
      <span class="step-num">02 / CUT</span>
      <h3>One pass of the blade</h3>
      <p>Press and drag across the seal. Cover the span and the foil snaps edge to edge with a silver trail and a small recoil. Either direction works.</p>
    </div>
    <div class="guide-step">
      <span class="step-num">03 / REVEAL</span>
      <h3>The card handoff</h3>
      <p>The wrapper falls away. The reveal arrives back first, then turns. Keep it, or let it go.</p>
    </div>
  </div>

  <div class="game-notes" style="border-top: 1px solid #ffffff15; margin-top: 60px;">
    <h2>Same hardware.<br>Your finish.</h2>
    <div>
      <p>This website shows the original card and four of Cardable’s collectible coatings:</p>
      <ul style="list-style:none; padding:0; margin:16px 0; display:flex; flex-direction:column; gap:12px; font-size:14px; color:#a7a7ad;">
        <li><strong style="color:#fff;">Normal:</strong> The card as pulled. Clean rarity frame, nothing added.</li>
        <li><strong style="color:#fff;">Matte:</strong> A grain-textured coating. Light settles instead of sweeping.</li>
        <li><strong style="color:#fff;">Rainbow Holo:</strong> A spectral coating that follows the light.</li>
        <li><strong style="color:#fff;">Galaxy Holo:</strong> A stellar coating with layered depth.</li>
        <li><strong style="color:#fff;">Aurora:</strong> A shifting aurora wash inside the rarity frame.</li>
      </ul>
      <a class="text-link" href="../collection/">Browse in collection ↗</a>
    </div>
  </div>

  <div class="game-notes" style="border-top: 1px solid #ffffff15;">
    <h2>Play your way.</h2>
    <div>
      <p>Very Low, Low, Medium and High. Choose your FPS limit and background behaviour independently. Start at Medium. Safe cinematic presentation is available.</p>
      <p>Play offline without an account. Installed builds check GitHub for updates. Saves live on your machine in <code>%APPDATA%\\Cardable\\saves</code>.</p>
      <a class="button primary" href="../download/" style="margin-top:20px;">Download Cardable ↗</a>
    </div>
  </div>
</section>
`;

const pages = {
  download: downloadPageContent,
  collection: collectionPageContent,
  worlds: worldsPageContent,
  game: gamePageContent
};

function writePage(route, content) {
  let page = html;
  if (route) {
    page = page.replace('<body data-page="home">', '<body data-page="' + route + '">')
               .replace(/<main id="story">[\s\S]*?<\/main>/, '<main id="story">' + content + '</main>')
               .replace('<title>Cardable — Keep the moment.</title>', '<title>' + (route === 'game' ? 'The Game' : route[0].toUpperCase() + route.slice(1)) + ' — Cardable</title>')
               .replace('<a class="wordmark" href="./">', '<a class="wordmark" href="../">');

    // Adjust relative asset and link paths
    page = page.replace(/(src|href)="(?!https?:|data:|blob:|#|\.\.\/)([^"?]+)"/g, (m, a, p) =>
      a + '="' + (p === './' ? '../' : p === route + '/' ? './' : '../' + p) + '"'
    );
    page = page.replace(
      'href="./">' + (route === 'game' ? 'The game' : route[0].toUpperCase() + route.slice(1)),
      'href="./" aria-current="page">' + (route === 'game' ? 'The game' : route[0].toUpperCase() + route.slice(1))
    );
  }

  // Fingerprint assets with SHA-256
  page = page.replace(/(src|href)="([^"?#]+\.(?:js|css))"/g, (match, attr, file) => {
    const relative = file.replace(/^\.\.\//, '');
    if (fs.existsSync(path.join(out, relative))) {
      const fileContent = fs.readFileSync(path.join(out, relative));
      return attr + '="' + file + '?v=' + crypto.createHash('sha256').update(fileContent).digest('hex').slice(0, 12) + '"';
    }
    return match;
  });

  const dir = path.join(out, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page);
}

writePage('', html);
for (const [route, content] of Object.entries(pages)) {
  writePage(route, content);
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Cardable ' + pkg.version + ': continuous journey + 4 bespoke destinations (' + cards.length + ' curated cards) -> dist/site');
