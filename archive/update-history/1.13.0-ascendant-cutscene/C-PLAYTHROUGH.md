# Single allowed milestone C playthrough

- Game: file:///D:/CardableV2/cardable-spec/cardable/index.html?dev=1
- One headed Chromium launch; viewport 1280x800; Medium, Normal, Full, color, motion off (normal animation), dev sandbox.
- Trigger: the registered cutscene.ascendant Play tool. No seek or skip; no second launch.
- Sections reached in order: prelude, spark, cave, tip, fall, impact, underwater, tendrils, ascend, topPulse, morph, clock, title, shatter, aurora, explosion, card.
- Final phase: revealed. Backend: webgl2. Renderer failure: null.
- Final hooks: auroraRise at 28000 ms, exactly one flash beat at 30600 ms, cardIn at 31000 ms.
- Both Ascendant border paths had stroke-dashoffset 0. Retained backdrop was visible. S8 had completed; GPU scene was released and cinematic UI suppression was removed.
- Local Ascendant Bodoni font loaded. Full setting and dev Short/meter tools registered.
- Keep was still in its normal post-metadata delay at the instant revealed was reached; no decision or further check was performed.
- Console errors: 0. Console warnings: 0. Browser closed after card reveal.
- No test suites, new tests, screenshots, recordings, frame-time collection, meter sampling or profiling. This records runtime completion, not visual/FPS/photosensitivity acceptance.
