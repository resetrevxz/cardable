/* Cardable — config. Every tunable number and flag lives here. */
(function (C) {
  'use strict';

  C.config = {
    gameName: 'Cardable',
    version: '2.6.0',
    titanPack: { coreMs:4000, rimMs:7000, swapMs:1200, tickRadians:Math.PI/2, tickCount:3,
      tickPulseMs:450, unsealMs:1400, dipPx:2, steamCount:6 },
    royalPack: { glintMs:5000, sheenMs:1400, swapMs:1100, boxRiseMs:900, boxHintMs:2000,
      boxOpenMs:1100, fallbackMs:3000, facetColumns:8, facetRows:12, dustCount:12 },
    classicPack: { modernCardWeight: 1, lightPassMs: 8000, ledStepMs: 600, pullDistance: .42,
      pullSnap: .85, vortexMs: 1400, appearanceMs: 1200, mediumVortexMs: 850, lowFadeMs: 450,
      pixelMax: 24, pixelColumns: 12, pixelRows: 20 },
    variants: { chance: 0.10, revealMs: 1200, reducedRevealMs: 180 },
    rarityIntro: { reducedMs: 800, veryLowMs: 600, lowMs: 1200, fastScale: .7,
      maxPixels: 2000000, refractionMaxPixels: 1500000, gildedMaxPixels: 1500000, mythicalMaxPixels: 1500000, mythicalMediumPixels: 975000,
      exoticMaxPixels: 1500000, exoticMediumPixels: 975000, exoticMaterialSize: 768, exoticStellarSize: 1024, exoticStars: 1400, exoticGalaxyStars: 5800, backdropFrameMs: 100, maxDpr: 1.5,
      cloudSize: 512, glassSize: 512, glassFieldSize: 640, gildedFieldSize: 640, stars: 32, motes: 32 },

    packs: {
      regenMs: 2 * 60 * 60 * 1000,   // One pack every two hours.
      maxStored: 4,
      startingPacks: 2
    },

    hold: { chargeMs: 3000, drainMs: 700 },
    packSwap: { turnMs: 1100, reducedMs: 240, previewMs: 700 },
    cut: { requirePress: true, autoFinishSpan: 0.72, topMin: 0.08, topMax: 0.22, guideY: 0.09,
      captureTop: -0.10, captureBottom: 0.36, dragTop: -0.28, dragBottom: 0.55,
      edgePaddingPx: 56, resumePaddingPx: 72, finishSnapMs: 130, heatDecayMs: 260, tipFollowMs: 38 },

    idleFadeMs: 15000,

    pull: { emptyTierPolicy: 'downgrade' },   // 'downgrade' | 'renormalize'  (OPEN-QUESTIONS #8)

    rarityColorMode: 'color',                 // 'color' | 'mono'             (OPEN-QUESTIONS #3)

    currency: { name: 'Credits', symbol: '$', packOpenReward: 200, rewardFlightMs: 1100, rewardHoldMs: 1700, rewardCoins: 6 },

    serial: { prefix: 'CBL', counterDigits: 6, playerCodeLength: 4 },

    storage: { key: 'cardable.save', schemaVersion: 5 },

    polish: {
      maxSaveBytes: 8 * 1024 * 1024, downloadReleaseMs: 1000,
      slowFrameMs: 1000 / 60 + 1, parallaxPx: 2,
      grainOpacity: 0.025, vignetteOpacity: 0.12, newBloomGain: 0.08, digitStaggerMs: 20,
      sheetDragHighlight: 0.26, sheetRestHighlight: 0.18, faviconReadyDotPx: 4
    },

    dots: {
      spacing: 26, baseRadius: 0.9, maxRadius: 2.2, influenceRadius: 170,
      baseAlpha: 0, maxAlpha: 0.55, lean: 1.5, trailDecayMs: 400,
      pulse: { lifeMs: 600, speed: 700, ringWidth: 65 },
      // Click breaths are independent of the opening's pack pulses.
      ripple: { speed: 320, lifeMs: 1100, peakAlpha: 0.28, ringWidth: 24, maxRadius: 240,
        secondRingScale: 0.30, secondDelayMs: 200, maxSimultaneous: 3 },
      openingFadeOutMs: 200, openingFadeInMs: 300
    },

    // Shell layout/font metrics. Click breaths and the requested calm logo use their own tuning.
    shell: {
      loadStaggerMs: 125, idleWaveMs: 60000, afkMs: 10 * 60 * 1000,
      packWidth: 180, packHeight: 266.4,
      frameMs: 1000 / 60, maxFrameDeltaMs: 64,
      pointerSamples: 32,
      dots: { alphaThreshold: 0.002, trailStrength: 0.35, trailCooling: 4.605 },
      cursor: { glowPx: 220, ringPx: 24, ringScale: 1.1, opacity: 0.055, follow: 0.18, settlePx: 0.1 },
      logo: { fontPx: 40, cellHeight: 52, baseline: 40 },
      dev: { fpsSampleMs: 1000, titleTestDelayMs: 1000 }
    },

    // Sealed wrapper presentation only. No gameplay or persistence parameters.
    packObject: {
      idleTilt: 3, dragTilt: 15, inspectTilt: 19, dragRangeX: 92, dragRangeY: 64,
      liftPx: 24, inspectLiftPx: 42, dragSlopPx: 5, massLagMs: 34,
      spring: { stiffness: 180, damping: 22, mass: 1 },
      fluidSpring: { stiffness: 100, damping: 15, mass: 1 },
      fluidAngleCap: 9, fluidWaveCapPx: 3, idleMaterialMs: 11000, handoffMs: 320
    },

    // Stage 4 presentation; timestamp rules and pack data stay unchanged.
    menuMotion: {
      floatMs: 6000, floatPx: 5, backPhaseMs: 650, backOpacity: 0.45, leanDegrees: 8, followMs: 180,
      sweepMs: 6000, sweepOpacity: 0.18, shadowScaleBreath: 0.08, reflectionOpacity: 0.055,
      shadowOpacity: 0.4, shadowBreath: 0.08, speckInsetPercent: 10, sweepTravelPercent: 120,
      readyMomentMs: 850, arrivalLiftPx: 10, speckCount: 10, speckTravelPx: 8,
      fluidWavePx: 1.2, fluidWaveMs: 2400,
      vialMs: 450, vialSloshDegrees: 7, vialOscillations: 3,
      stockShineMs: 700, stockLiftPx: 3,
      digitMs: 220, currencyMs: 700, shimmerMs: 850, shimmerOpacity: 0.4,
      arrowBreathMs: 6000, arrowNudgeMs: 14000, arrowNudgeDurationMs: 1000, arrowNudgePx: 2, arrowOpacity: 0.85, arrowOpacityRange: 0.15,
      previewReadyLeadMs: 2000, previewCurrencyAmount: 100, peekSlots: 3,
      previewCountdownsMs: { hours: (1 * 60 + 12) * 60000, minutes: (42 * 60 + 10) * 1000, seconds: 38000 }
    },

    // Opening presentation and swipe feedback on the shared scheduler.
    openingMotion: {
      dissolveMs: 900, tearMs: 180, splitMs: 240, fallMs: 420, drainExitPortion: 0.25,
      cutHintMs: 2000, enterHintMs: 5000, samplePx: 4, snapPx: 72, maxPathSamples: 96,
      cutGuideMs: 2800,
      smoothSteps: 6, geometryEpsilon: 0.00001, boundaryInset: 0.002,
      trailMs: 360, trailSegments: 24, seamPx: 1, glintPx: 2.2, fastGlintPx: 3.4, glintSpeedPx: 1200,
      bladeFollow: 0.55, bladeLengthPx: 46, bladeWidthPx: 2.5,
      cutRecoilPx: 2, cutRecoilDegrees: 0.45, cutFlashPx: 3.5, capPeelDegrees: 7, capSidePx: 36,
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
    cardTurn: { durationMs: 600, hintMs: 4000, hintFadeMs: 150, dampingRatio: 0.78, frequency: 10 },
    carousel: { stiffness: 160, damping: 2 * Math.sqrt(160), mass: 1, epsilon: 0.05,
      snapDamping: 19, snapOvershoot: 0.06, turnPerStep: 34, turnCap: 50, depthPx: 56,
      sideOpacity: 0.55, reducedSlideMs: 150, sortMs: 620, sortDecay: 7, sortWave: 8, sortStaggerMs: 20, sortMaxMs: 900, underlineMs: 250 },
    cardView: {
      spring: { stiffness: 140, damping: 16, mass: 1, stepMs: 1000 / 120, epsilon: 0.01 },
      tiltCap: 14, reducedTiltCap: 3, reducedDamping: 26,
      idleMs: 3000, swayDegrees: 1.2, swaySpeed: 0.45, liftPx: 16, focusedLift: 0.7,
      specularSpeed: 1.5, lampInfluence: 0.12,
      crossfadeMs: 150, stampCharMs: 35, stampFlickerMs: 100, meterTickMs: 40,
      meterSegments: 12, maxFrontSpecs: 3, maxScreenSpecs: 4, sparkleCount: 18
    },

    // Reveal presentation only. Rarity pacing remains in each rarity's reveal data.
    revealMotion: {
      heightVh: 62, viewportMarginPx: 64, actionSpacePx: 96, risePortion: 0.12, riseScale: 1.06, riseTurnDegrees: 6,
      flipScale: 1.08, flipLiftPx: 12, flipOvershootDegrees: 3, flipOvershootAt: 0.8, airShadowBlurPx: 36,
      shineMs: 700, shineAngleDegrees: 20, shineTravelPercent: 220,
      settleMs: 1200, bouncePx: 7, bounceCycles: 2, dustCount: 12, dustSpreadPx: 60, dustRisePx: 20,
      serialDelayMs: 180, infoStepMs: 80, infoFadeMs: 150, keepDelayMs: 400,
      newHoldMs: 200, duplicateMotionScale: 0.85, secretBackMs: 400,
      collectMs: 900, discardMs: 300, thumbnailStaggerMs: 80, thumbnailWidthPx: 40, toastThumbnailWidthPx: 34,
      collectionHandoffMs: 150, collectionExitScale: 0.96,
      toastMs: 2400, menuReturnDelayMs: 200, arrowPulseMs: 500, arrowPulseScale: 1.15,
      packSlideMs: 500, packSlidePx: 12, haloRadiusPx: 260, haloStrength: 0.32,
      bloomScale: 1.6
    },

    // Stage 6 guidance only; pack rules and existing presentation values stay unchanged.
    tutorialMotion: {
      welcomeMs: 2500, inventoryMs: 6000, timerMs: 4000, ghostMs: 3000,
      pulseMs: 1800, pulseMin: 0.35, chromeOpacity: 0.18, gridDim: 0.8,
      haloPaddingPx: 48, haloStrength: 0.4, instructionGapPx: 32, safeMarginPx: 32,
      ghostPath: 'M 4 12 C 28 5, 65 16, 96 7'
    },

    inventoryMotion: {
      detents: { peekPx: 104, normalVh: 62, expandedVh: 82, fullMarginPx: 16 },
      shelfTurnDegrees: 10, shelfTurnCap: 24, shelfDepthPx: 12, shelfSideScale: 0.9,
      shelfSideOpacity: 0.72, gridMinWidthPx: 160, gridMaxWidthPx: 220, gridGapPx: 24, gridOverscanRows: 2,
      transitionMs: 450, transitionStaggerMs: 18, tooltipMs: 600, reorderHoldMs: 320, reorderEdgePx: 64, reorderScrollSpeed: 4, reorderGapPx: 16,
      handoffMs: 700, indicatorWidthPx: 8, indicatorStretchMax: 2.4,
      sheetHeightVh: 62, sheetSpring: { stiffness: 220, damping: 26, mass: 1, epsilon: 0.002 },
      menuScale: 0.96, menuBlurPx: 8, menuDim: 0.4,
      rubberBandPx: 64, dragSlopPx: 6, flickProjectionMs: 180, flickDecayMs: 120, maxFlickPxPerSecond: 1800,
      closeThreshold: 0.5, wheelSnapMs: 140, wheelLinePx: 24, dragClickGuardMs: 300,
      tileHeightPortion: 0.62, tileMinHeightPx: 120, tileMaxHeightPx: 280, tileGapPx: 24, shelfChromePx: 144,
      overscan: 6, sideScale: 0.82, sideOpacity: 0.6, sideTurnDegrees: 12, hoverLiftPx: 6,
      centerPulseMs: 220, centerPulseScale: 0.025, countMs: 700, shimmerMs: 1100,
      detailHeightVh: 62, detailInfoWidthPx: 280, detailGapPx: 48, detailStackWidthPx: 760,
      detailClosePortion: 0.18, detailFlickPxPerSecond: 600, detailShineMs: 700, detailStackHeightVh: 50,
      detailBackdropDim: 0.65, sheetDetailOpacity: 0.4,
      safeMarginPx: 32, previewCount: 300, previewDuplicateMax: 3
    },

    finishMotion: {
      common: { cycleMs: 7200 },
      superRare: { cycleMs: 12000, travelPercent: 12 },
      unusual: { cycleMs: 5500, glowMinScale: 0.35, glowMinOpacity: 0.4 },
      doubleSuperRare: { goldCycleMs: 9000, blueCycleMs: 27000, sparkleCount: 20,
        goldHue: 43, goldHueRange: 15, blueHue: 216, blueHueRange: 12, sparkleSpeed: 1.4 },
      legendary: { waveCycleMs: 7000, waveTravelPercent: 3, sparkleCount: 16,
        crownSparkleCount: 8, sparkleSpeed: 1.3, tipSparkSpeed: 1.8, tipSparkTravelPx: 6, gemCycleMs: 6000 },
      mythical: { shineCycleMs: 6500, flameCount: 24, flameCycleMs: 1600, flameScaleMin: 0.75, flameScaleMax: 1.1 },
      exotic: { shapeCount: 9, shapeCycleMs: 11000, shapeTravelPx: 10, shapeRotateDegrees: 18, borderCycleMs: 5000 },
      ascendant: { auroraCycleMs: 12000, splashMinDelayMs: 2000, splashMaxDelayMs: 3000, splashMs: 1000, splashOpacity: 0.5 },
      secret: { sweepLeadMs: 1800, lockMs: 300, scrambleMs: 55, lockFlashMs: 120, coverMs: 2400,
        lineCount: 8, lineHeightPercent: 3, lineScaleMax: 4.25, sweepHz: 2, maxSweepHz: 8, sweepPercent: 12,
        glyphs: '@#$&_-?!%+=/\\0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
      limited: { floatCycleMs: 6000, floatPx: 2.4, parallaxPx: 4 },
    },

    // Only a -> @ and l -> / were specified; the rest are suggestions (OPEN-QUESTIONS #23)
    logoMorph: { c: '(', a: '@', r: '3', d: 'ð', b: '6', l: '/', e: '€' },
    logo: {
      pool: { c: ['c', '(', '6', '€'], a: ['a', '@', '4', 'ð'], r: ['r', '3', '1', '|'],
        d: ['d', 'ð', '6', '4'], b: ['b', '6', 'ð', '3'], l: ['l', '/', '1', '|'], e: ['e', '€', '3', '6'] },
      holdMinMs: 180, holdMaxMs: 520, swapMinMs: 320, swapMaxMs: 420,
      maxSwapping: 2, maxChanged: 4, returnMs: 320, trackingPx: 2, slotPaddingPx: 2,
      travelPortion: 0.35, blurPx: 2
    },

    flags: {
      market: false,     // future: the owner builds this later. Do not implement.
      variants: true,
      audio: false       // no music or sound yet
    },

  };
  C.version = C.config.version;
})(window.Cardable = window.Cardable || {});
