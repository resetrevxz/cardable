# Cardable's public cinematic gallery

Repository: **resetrevxz/cardable**. Site: **https://resetrevxz.github.io/cardable/**. Current version: **v1.0.1**. The owner authorizes publication after completed updates. The root index.html remains the offline game.

## Static architecture

site/ uses HTML, CSS and classic scripts. npm run site:build generates dist/site. site/manifest.cjs selects 24 catalog cards, renderer modules and style dependencies. The builder copies their actual art/subject masks, Rare pack laminate, variant textures, local fonts/licenses, GSAP **3.15.0**/ScrollTrigger and 34 mandatory renderer-generated JPEGs. URLs remain relative to the Pages project root. No game bootstrap, saves, pulls, rewards, gameplay input or Electron bridge is loaded.

site/adapter.js supplies fixed ephemeral presentation settings. site/site.js owns demonstration instances, filters/selection, absolute reversible progress and disposal. Sample CBL-WEB2-000001 serials follow the game format; history is explicitly demo. No real ownership, market value or randomized reward is implied. One nearest visible full card is mounted; all other collection cards are static. At most one cinematic world is active; primary canvas resolution is bounded and renderer resources are released on exit. GSAP's shared ticker updates the focused material and the single visible world at a bounded 30 Hz. Ambient movement has a pause control. Full films use the actual descriptor durations, Safe profile and the game's final-output limiter, with play/continue/restart and real demonstration-card handoff; scrolling away pauses and disposes them. Finish/card/filter/layout/motion choices are shareable in the URL and restore through browser history. Hidden pages release decorative resources.

## Story and fallbacks

Nine scenes: arrival, Rare pack ritual, reveal, five actual finishes, collection, serial archive, four complete Safe rarity films, installation and finale. Desktop uses spacious pins. Mobile shortens opening and stacks the gallery; finishes have buttons, selection brings detail into view. Native scrolling remains intact. OS reduced motion removes extended pinning/tilt/travel and uses calm poses/posters. Without JavaScript the static narrative, finish posters, 24 catalog previews and downloads remain. Rendering failures leave posters underneath.

[Poster provenance](../site/previews/README.md) identifies modules and safe windows. [WEBSITE-REVIEW](WEBSITE-REVIEW.md) records the three passes and limits. Figma is a composition aid; website rendering is authoritative.

## Publication and downloads

Pages uses GitHub Actions, never the game/internal docs directory. Its workflow requires the package version's published, nonempty installer and complete-folder ZIP before building/deploying. An absent release keeps the last good website. Successful Windows release publication explicitly dispatches pages.yml on main.

Cardable-Setup-X.Y.Z.exe contains the complete offline Windows x64 app. Cardable-X.Y.Z-Windows-x64.zip contains the entire Electron folder, including resources, DLLs and locales; extract all and run Cardable.exe. GitHub's source ZIP is a separate artifact. The site uses immutable version-specific URLs; binaries never enter Git or Pages. Installed builds use the native save-gated updater; folder/preview builds use manual updates. Releases also carry blockmap, latest.yml and SHA256SUMS.txt.

After release, inspect Actions, the live nine-scene site, relative assets and both final HTTP responses. Packaging/ZIP hashes are separate from installation or upgrading. Builds are unsigned; real updater, physical-device and photosensitivity acceptance remains separate. See RELEASING.md and PLAY.md.
