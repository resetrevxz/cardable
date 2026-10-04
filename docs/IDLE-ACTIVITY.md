# Idle and inventory proximity

Owner-requested local update, intentionally left uncommitted.

- The default idle delay is 15 seconds. The setting offers 15 seconds, 30 seconds or Never; existing 2.5/5-second settings normalize to the new default. Mouse/pen movement, pointer presses, keyboard input, wheel movement and text input reset inactivity.
- Ordinary idle keeps the pack, countdown, total owned-copy count, stored-pack count and next-pack stock fill visible. The wordmark scales to 65%. Existing inventory/tutorial/opening/toast holds retain their presentation.
- Credits independently fade after the configured inactivity delay even while a keyboard or panel visibility hold keeps the rest of the interface visible. Activity restores them. See `CUT-SWIPE.md`.
- At 10 minutes, AFK is independent of idle-fade settings and visibility holds. Card/pack visuals, panels, dots, cursor and performance display hide. The shared scheduler runs only the pack metrics subscriber, with static digit updates on timer ticks. Refills and tab title still use the original timestamps. Returning from a hidden tab re-evaluates elapsed inactivity.
- Activity wakes the existing scene without keeping, deleting or rerolling a card. A reserved reveal remains in the same phase and the same save.
- Inventory opacity ranges from 32% away to 100% nearby, with a 600ms fade. Keyboard focus keeps controls readable. Within 160px of the sheet/button, the current bounded Shelf/Grid thumbnails mount at opening geometry before a session starts. Dragging exposes card content before release. Leaving the closed sheet releases the thumbnails; proximity alone never writes selection preferences or ownership.
- The settings gear is visible on the resting menu, including during the tutorial. Inventory, detail, dragging, opening and settings panels suppress it. Idle/AFK presentation still hides secondary chrome; activity restores it.

## Verification

`tools/check-activity-browser.cjs` exercises the actual offline page in an isolated Playwright Chromium context with accelerated inactivity clocks, real CSS transitions and screenshots. It covers proximity, rendering before opening, content during dragging, both idle thresholds, timer/fill updates, wake, settings overlap, Shelf/Grid, reduced motion and a reserved reveal collected once after waking. Evidence and screenshots are written outside the checkout to `D:/CardableV2/outputs/activity/`.

The existing Node inventory/regression harnesses currently stop at boot because the shared checkout's other update moved boot behind `C.boot`; they are not evidence of passing regression coverage for this change.
