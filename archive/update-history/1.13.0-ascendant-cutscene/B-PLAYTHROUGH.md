# Single allowed milestone B playthrough

- Game: file:///D:/CardableV2/cardable-spec/cardable/index.html?dev=1
- One headed Chromium launch; viewport 1280x800; Medium, Normal, color, dev sandbox.
- Trigger: the registered cutscene.ascendant Play tool. No seek or skip; no second launch.
- Sections reached in order: prelude, spark, cave, tip, fall, impact, underwater, tendrils, ascend, topPulse, morph, clock, title, shatter.
- Final phase: revealed. Backend at every section: webgl2. Renderer failures: none.
- Local Ascendant Bodoni font: loaded.
- Observed B hooks: four pulse events, clockStart, 48 tick events, clockAlign at 23200 ms, titleIn at 24000 ms, titleBreak at 27000 ms.
- Console errors: 0. Console warnings: 0. Browser closed after card reveal.
- No test suites, new tests, screenshots, recordings, frame-time collection or profiling. This records runtime completion, not visual/FPS acceptance.
