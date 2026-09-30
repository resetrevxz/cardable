/* Cardable — config. Every tunable number and flag lives here. */
(function (C) {
  'use strict';

  C.config = {
    gameName: 'Cardable',

    packs: {
      regenMs: 8 * 60 * 60 * 1000,   // OPEN-QUESTIONS #1 (brief says both "4 per day" and "every 8 hours")
      maxStored: 2,
      startingPacks: 2
    },

    hold: { chargeMs: 3000, drainMs: 700 },
    cut: { requirePress: true, autoFinishSpan: 0.8 },   // OPEN-QUESTIONS #15

    idleFadeMs: 2500,

    pull: { emptyTierPolicy: 'downgrade' },   // 'downgrade' | 'renormalize'  (OPEN-QUESTIONS #8)

    rarityColorMode: 'color',                 // 'color' | 'mono'             (OPEN-QUESTIONS #3)

    currency: { name: 'Credits', symbol: '' },   // placeholder                 (OPEN-QUESTIONS #11)

    serial: { prefix: 'CBL', counterDigits: 6, playerCodeLength: 4 },

    storage: { key: 'cardable.save', schemaVersion: 1 },

    dots: {
      spacing: 26, baseRadius: 0.9, maxRadius: 2.2, influenceRadius: 170,
      baseAlpha: 0, maxAlpha: 0.55, lean: 1.5, trailDecayMs: 400,
      rippleMs: 600, rippleSecondDelayMs: 120, rippleSpeed: 700
    },

    // Stage 1 visual tuning; game rules and the original dot parameters stay as supplied.
    shell: {
      loadStaggerMs: 125, idleWaveMs: 60000,
      packWidth: 180, packHeight: 252,
      frameMs: 1000 / 60, maxFrameDeltaMs: 64,
      pointerSamples: 32,
      dots: { alphaThreshold: 0.002, trailStrength: 0.35, trailCooling: 4.605, ringWidthPitches: 1.25, secondRingIntensity: 0.55 },
      cursor: { glowPx: 220, ringPx: 24, ringScale: 1.1, opacity: 0.055, follow: 0.18, settlePx: 0.1 },
      logo: { fontPx: 40, letterSpacingEm: -0.04, cellHeight: 52, baseline: 40, swapMs: 200, staggerMs: 40, returnMs: 760, loopMs: 1600, blurPx: 2 },
      dev: { fpsSampleMs: 1000, titleTestDelayMs: 1000 }
    },

    // Stage 4 presentation; timestamp rules and pack data stay unchanged.
    menuMotion: {
      floatMs: 6000, floatPx: 5, backPhaseMs: 650, backOpacity: 0.45, leanDegrees: 5, followMs: 180,
      shadowOpacity: 0.4, shadowBreath: 0.08, speckInsetPercent: 10, sweepTravelPercent: 120,
      readyMomentMs: 850, arrivalLiftPx: 10, speckCount: 10, speckTravelPx: 8,
      fluidWavePx: 1.2, fluidWaveMs: 2400,
      vialMs: 450, vialSloshDegrees: 7, vialOscillations: 3,
      digitMs: 220, currencyMs: 700, shimmerMs: 850, shimmerOpacity: 0.4,
      arrowBreathMs: 6000, arrowNudgeMs: 14000, arrowNudgeDurationMs: 1000, arrowNudgePx: 2, arrowOpacity: 0.85, arrowOpacityRange: 0.15,
      previewReadyLeadMs: 2000, previewCurrencyAmount: 100, peekSlots: 3,
      previewCountdownsMs: { hours: (7 * 60 + 12) * 60000, minutes: (42 * 60 + 10) * 1000, seconds: 38000 }
    },

    // Stage 5 presentation. Charge/cut game rules above remain unchanged.
    openingMotion: {
      dissolveMs: 900, tearMs: 350, splitMs: 500, fallMs: 700, drainExitPortion: 0.25,
      cutHintMs: 2000, enterHintMs: 5000, samplePx: 8, snapPx: 16, maxPathSamples: 512,
      smoothSteps: 6, geometryEpsilon: 0.00001, boundaryInset: 0.002,
      trailMs: 300, seamPx: 1, glintPx: 1.6, fastGlintPx: 0.8, glintSpeedPx: 1200,
      bladeFollow: 0.35, bladeLengthPx: 36, bladeWidthPx: 2,
      chargeAgitationAt: 0.7, vibrationAt: 0.6, vibrationPx: 1.2, vibrationHz: 38,
      meniscusPx: 1.5, agitationPx: 3, waveMs: 900, speckSpeedPx: 24,
      sloshPx: 5, sloshCycles: 2, pulseStartMs: 750, pulseEndMs: 220, pulseIntensity: 0.65,
      separationMinPx: 6, separationMaxPx: 14, rotationDegrees: 1.2, fallMinPx: 40, fallMaxPx: 120,
      dissolveCount: 40, fleckCount: 32, particleMinMs: 400, particleMaxMs: 700,
      particleRisePx: 85, particleSpreadPx: 25, fleckSpeedPx: 85, gravityPx: 120,
      fleckMinPx: 1, fleckMaxPx: 4, particleOpacity: 0.65, particleRotationDegrees: 90,
      chargeChromeOpacity: 0.02, errorMs: 5000
    },

    // Card presentation only; existing game rules and data remain unchanged.
    cardView: {
      spring: { stiffness: 140, damping: 16, mass: 1, stepMs: 1000 / 120, epsilon: 0.01 },
      tiltCap: 14, reducedTiltCap: 3, reducedDamping: 26,
      idleMs: 3000, swayDegrees: 1.2, swaySpeed: 0.45, liftPx: 16, focusedLift: 0.7,
      specularSpeed: 1.5, lampInfluence: 0.12,
      crossfadeMs: 150, stampCharMs: 35, stampFlickerMs: 100, meterTickMs: 40,
      meterSegments: 12, maxFrontSpecs: 3, sparkleCount: 18
    },

    // Reveal presentation only. Rarity pacing remains in each rarity's reveal data.
    revealMotion: {
      heightVh: 62, viewportMarginPx: 64, risePortion: 0.12, riseScale: 1.06, riseTurnDegrees: 6,
      flipScale: 1.08, flipLiftPx: 12, flipOvershootDegrees: 3, flipOvershootAt: 0.8, airShadowBlurPx: 36,
      shineMs: 700, shineAngleDegrees: 20, shineTravelPercent: 220,
      settleMs: 1200, bouncePx: 7, bounceCycles: 2, dustCount: 12, dustSpreadPx: 60, dustRisePx: 20,
      serialDelayMs: 180, infoStepMs: 80, infoFadeMs: 150, keepDelayMs: 400,
      newHoldMs: 200, duplicateMotionScale: 0.85, secretBackMs: 400,
      collectMs: 900, thumbnailStaggerMs: 80, thumbnailWidthPx: 40, toastThumbnailWidthPx: 34,
      toastMs: 2400, menuReturnDelayMs: 200, arrowPulseMs: 500, arrowPulseScale: 1.15,
      packSlideMs: 500, packSlidePx: 12, haloRadiusPx: 260, haloStrength: 0.32,
      bloomScale: 1.6
    },

    finishMotion: {
      superRare: { cycleMs: 12000, travelPercent: 12 },
      unusual: { cycleMs: 5500, glowMinScale: 0.35, glowMinOpacity: 0.4 },
      doubleSuperRare: { goldCycleMs: 9000, blueCycleMs: 27000, sparkleCount: 20,
        goldHue: 43, goldHueRange: 15, blueHue: 216, blueHueRange: 12, sparkleSpeed: 1.4 },
      legendary: { waveCycleMs: 7000, waveTravelPercent: 3, sparkleCount: 16,
        crownSparkleCount: 8, sparkleSpeed: 1.3, tipSparkSpeed: 1.8, tipSparkTravelPx: 6, gemCycleMs: 6000 },
      mythical: { shineCycleMs: 6500, flameCount: 24, flameCycleMs: 1600, flameScaleMin: 0.75, flameScaleMax: 1.1 },
      exotic: { shapeCount: 9, shapeCycleMs: 11000, shapeTravelPx: 10, shapeRotateDegrees: 18, borderCycleMs: 5000 },
      ascendant: { auroraCycleMs: 12000, splashMinDelayMs: 2000, splashMaxDelayMs: 3000, splashMs: 1000, splashOpacity: 0.5 },
      secret: { lockMs: 300, scrambleMs: 55, lockFlashMs: 120, coverMs: 2400,
        lineCount: 8, lineHeightPercent: 3, lineScaleMax: 4.25, sweepHz: 2, maxSweepHz: 8, sweepPercent: 12,
        glyphs: '@#$&_-?!%+=/\\0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
      limited: { floatCycleMs: 6000, floatPx: 2.4, parallaxPx: 4 },
      profileMs: 5000
    },

    // Only a -> @ and l -> / were specified; the rest are suggestions (OPEN-QUESTIONS #23)
    logoMorph: { c: '(', a: '@', r: '®', d: '∂', b: '6', l: '/', e: '€' },

    flags: {
      market: false,     // future: the owner builds this later. Do not implement.
      variants: false,   // not made yet
      audio: false       // no music or sound yet
    },

    dev: { queryFlag: 'dev' }   // ?dev=1 enables dev panel and validation
  };
})(window.Cardable = window.Cardable || {});
