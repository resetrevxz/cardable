# Cardable 1.7.5 — Inventory glass

Stage 124 gives the inventory and its Album page a translucent charcoal material that matches Cardable's glass controls. The card remains the foreground: no card artwork, stats or controls are refracted.

## Material and quality

| Glass / blur setting | Material |
|---|---|
| High / Very High | 52–74% charcoal tint, 18 px frost, brighter bevel, restrained blue/rose spectral coating, and three 16 px refracting rim strips |
| Medium | Denser 74–86% tint, 12 px frost and simpler edge highlight; no refraction strips |
| Low | Solid ink and a restrained border/shadow |
| Very Low | Plain solid ink and static edge |

Presets set their independent effects together, so Medium and below progressively simplify this material. An explicit Glass High override on a Low preset is still respected as a Customized choice; the base preset does not silently clamp independent settings. Reduce transparency overrides the optical treatment with solid ink. Monochrome neutralizes the spectral coating. High contrast strengthens the border and text; shadows retain their separate setting. Reduced motion introduces no extra movement because the new optics are static.

`Cardable.ui.inventoryGlass()` installs one shared hidden SVG definition container, with horizontal and vertical displacement filters, and adds three small noninteractive rim elements to each host. The body uses ordinary backdrop frost; SVG refraction is limited to the rim bounds. Both filters use `primitiveUnits="objectBoundingBox"`, so displacement lengths are fractions of the strip bounds, as documented by [MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/primitiveUnits). Neutral map channels are corrected to 0.5. No animation clock, pointer listener, canvas or GL context is added. The shared material also has a UI gallery specimen. The older conflicting sheet-material overrides were removed.

## Rendered acceptance

`tools/check-inventory-glass.cjs` passed in Edge 155 headless over localhost and in native Electron with separate disposable profiles. It checked all four normal presets; explicit independent glass/shadow choices; Reduce transparency in both setting orders; monochrome and high contrast; controls; one shared optics definition; and closing with no live inventory card. Browser windows were 1280×820, 760×820 and 390×820. Native content windows were 1280×820 and 1440×820; the existing native composition/zoom keeps a 1920-wide CSS composition. The desktop minimum width prevents treating a phone-sized native window as a supported scenario.

A deterministic striped backdrop behind an empty inventory compared refraction against the same blur without displacement. The final browser capture had 5,630 changed edge pixels and zero changed central pixels. The native capture had 15,096 changed edge pixels and zero changed central pixels. This is actual rendered evidence, alongside inspection of color, monochrome, normal/expanded sheets and phone layout. The temporary optical target exists only in QA. The browser gallery specimen opened and closed successfully. No renderer network requests or console/page errors were recorded.

The existing four-tier 1,512-stack regression passed bounded rendering, zero repeated caption writes, favorites, drag, detail/flip/return, far Grid scrolling, keyboard End, phone resize and release on close. The focused browser first-click/hover/keyboard/reduced-motion regression also passed. Full fronts and the 1.7.4 hover-churn/cursor fixes remain in place. Very High shares the High material policy; separate hardware-gated Very High acceptance was not performed.

## Performance comparison

Measurements use the same `profile-inventory-regression.cjs` fixture and instrumentation as 1.7.4: Windows 10.0.26200, AMD Ryzen 7 7800X3D / 16 logical processors, Node 24.20.0, Edge 155.0.4283.45 headless, 1366×900, 60 FPS cap. Each view/tier has two repetitions of 24 pointer moves and 24 pan/scroll samples spaced by 35 ms. The values are average renderer main-thread TaskDuration milliseconds per complete workload, not per frame.

| Tier / view | Hover before → after, ms | Pan before → after, ms |
|---|---:|---:|
| Medium / Shelf | 205 → 211 | 87 → 90 |
| Medium / Grid | 437 → 363 | 276 → 257 |
| High / Shelf | 287 → 283 | 143 → 148 |
| High / Grid | 397 → 478 | 275 → 289 |

The richer High glass has a measured tradeoff: Grid hover CPU work is about 20% higher in these two runs. Shelf and pan changes were smaller, and rapid sweeps still create zero full cards or static replacements. The measurements do not establish a speedup, universal FPS or GPU/memory behavior. Keep the independent Glass setting available for players choosing a different balance.

An initial full-sheet SVG refraction pass was rejected after High hover cost rose to roughly 546 ms Shelf / 705 ms Grid and Grid pan to 475 ms. Narrow strips reduced those costs to 283 / 478 / 289 ms while retaining actual rim refraction. No card design or focused-card quality was reduced. Medium never uses SVG refraction. Raw local evidence: `qa-output/inventory-regression/glass-before.json`, `glass-after.json` (rejected full-sheet experiment), `glass-final.json` (High) and `glass-final-medium.json`; optical captures/reports are under `qa-output/inventory-glass`.

## Delivery and limits

The completion workflow commits the reviewed patch, builds the desktop once, verifies packaged contents and runs an isolated packaged smoke check, then publishes the Windows release and verifies release-dispatched Pages and public download metadata. Those outcomes are recorded in local delivery manifests and Actions, separately from the source/runtime evidence above. The installer is not executed and the normal player profile is not launched. A real updater upgrade, physical touch and broad hardware/GPU acceptance remain separate. Save schema, card ownership, pack timing, exact-once rewards and photo storage are unchanged.
