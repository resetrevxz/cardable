# Aligned pack swipe remake

Owner-requested update, intentionally uncommitted alongside the existing shared work.

The cutting gesture has a larger invisible hit area, automatic top-seal alignment and generous drift tolerance during pointer capture. Either direction works. The persistent seam represents horizontal coverage, so vertical movement and repeated back-and-forth motion over the same area do not manufacture progress. Resume anywhere within the completed range or 72px from its ends.

The aligned tip follows over 38ms. Moving builds a brighter speed-sensitive silver glint and a bounded 24-segment trail; releasing lets the heat cool over 260ms. Small foil recoil adds resistance without moving the input geometry. At 72% width (60% Easy), a 130ms sweep extends to the edges before the cap peels away. The shorter tear/split/fall phases total 840ms. Reduced motion replaces motion with static aligned feedback/crossfades and removes particles.

Tuning lives in `config.cut` and `config.openingMotion`. `opening.js` owns input, seam/feedback and the existing state machine; `cursor.js` accepts the aligned blade target. The classic offline script layout and shared FX scheduler remain intact.

Standard Pack sets `design.showGenerationPool = false`, which removes the print from all shared wrapper layers: front, rear, transmitted print, opening foil and split pieces. Other pack designs can explicitly retain that print.

Credits use `is-quiet` for inactivity independently of modal/keyboard visibility holds. This fixes the case where a focused control keeps the rest of the UI visible. The fade follows the configured idle delay and resets on activity; the existing ten-minute AFK view still hides it.

## Verification

`tools/check-cut-swipe-browser.cjs` passes five flow groups on the actual file:// page using isolated saves and accelerated timeline clocks: original hold/cancellation and one-time reward; wide-area mouse cuts, alignment, partial resume and completion; reload/reward/Keep preservation and reverse fast slash; native phone touch with Easy/reduced motion/30 FPS; credits fading while a visibility hold remains active. No page errors or runtime HTTP requests. The test dismisses the existing FPS nudge in its isolated settings because accelerated clocks are not hardware performance evidence.

`tools/check-activity-browser.cjs` also passes all six existing idle/inventory/AFK browser groups after the remake. These checks establish behavior and rendered screenshots, not a hardware-wide frame-rate guarantee.

Screenshots and machine-readable evidence: `D:/CardableV2/outputs/cut-swipe/` and `D:/CardableV2/outputs/activity/`.
