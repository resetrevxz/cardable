# Stage 11a — settings

## Done

- Added the classic-script settings schema/engine. Save schema stays 2; settingsVersion is 1. Invalid/missing values normalize, unknown keys drop, legacy preferences migrate, and reset preserves settings.
- Replaced Save & display with the 420 px glass panel, responsive margins, gear/S entry, 220/26 slide spring, focus trap/restoration, sticky groups, rolling values, spring segments/switches and a sole full preview. Preview tier changes do not allocate serials or modify inventory.
- Applied all live settings through effective policies and existing events. Rarity color remains the existing color/mono option. Motion Auto/On/Off consistently controls JS and CSS. Dots Off detaches its canvas; the blade remains available with cursor glow Off.
- Added quality policies: finish/core glare 60/30/15 Hz; ripple limits 3/2/1; particles 100/50/15 percent; reduced blur/shadows; Low retains ten structural nodes and paints seven. Pose/input stay at display cadence.
- Added honest Saved/session-only feedback, defaults click-again confirmation, eight-second Undo, private font credits/licenses, and the one-time performance nudge. Opening is blocked at input and controller boundaries during the modal.
- The focused suite passes 29 groups, including storage failure, fresh key gating, both mappings, extra Space Keep, normalized live reveal pacing, hidden/RM changes, quality cadence, and 50 modal cycles with stable view/listener/subscriber counts. All 34 isolated dev console checks PASS. Integration results are in SETTINGS-11A-REGRESSIONS.json.
- Host-only quality sampling is in SETTINGS-11A-PROFILE.json: 300 pose updates over five simulated seconds in every mode, with 300/150/75 finish updates and one full card. This excludes layout, raster, compositing and GPU time.

## Skipped or changed

- Data buttons and Sound controls are inactive in this checkpoint. No Stage 11b backup/checksum/destructive actions were wired.
- User requested Space as an additional Keep shortcut. The selected hold key charges, the other key tears/Keeps, and a fresh Space also Keeps after reveal. Held/repeated keys cannot accept a card.
- Used the current registry/config and preserved the concurrent card/pack/opening changes. Uncommitted currency changes, hero image and font assets are excluded from this commit.
- Updated old regression fixtures for normalized settings, the current top cut strip, refill title/stock behavior, and the newly approved Space shortcut. Save-file core regression coverage remains while the old Data UI tests assert inactive buttons.
- Screenshots, glass appearance, real file-open behavior and weak-machine 60 FPS remain unconfirmed. The existing file-preview restriction was respected; the browser-only idle-pack suite could not start because Playwright is unavailable. No browser was launched and no workaround was attempted.
- After the user's request for less testing, verification uses the integration gate plus focused reruns for changed fixtures and final settings logic.

## Look at

1. Double-click index.html, press S, then Tab through controls. Check the gear toggle, panel width, preview size and focus rings at desktop and narrow widths. Escape dismisses confirmation, then credits, then the panel.
2. Try dots On/Subtle/Off, cursor Off and each idle delay. Charge with dots Off to inspect the neutral ring fallback. Check that the cut blade still works.
3. Switch motion Auto/On/Off with the OS preference both ways. Compare High/Medium/Low on a full Legendary preview with the remaining gallery cards lite. Record real Performance/FPS on the target laptop.
4. Try each hold-key mapping through charge/cancel/tear/Keep. Space must also Keep. Hints follow the selected key; required tutorial hints survive the Hints Off setting.
5. Change settings, reload, then test defaults confirmation/timeout/Undo. With storage blocked, verify the session-only notice rather than Saved.

Source review: chrome uses existing neutral tokens; no new finish/color design was introduced. Rendered spacing, glass/light balance, readability of the small preview, and the narrow header still need a human screenshot critique. Future refinements are ranked in POLISH-BACKLOG.md.

## Open questions

- Section 3 defaults are authoritative. About contains version and font credits/licenses only, per the private-game decision.
- Applied existing defaults #3 monochrome chrome, #5 fixed charge with rarity reveal timing, #19 local font fallbacks, #21 desktop scope, and #22 serial on both faces (front visibility configurable).
- Low's seven-layer policy disables dedicated shadow/foil/beam paint while preserving the card's structural contract. No new saved game rules, rarity chances or config values were introduced.
