# Done

- Implemented only Stage 6: `welcome → hold → cut → keep → inventory → timer → done`, with the tutorial table's copy on a fresh save and the real two starting packs.
- Added `src/ui/tutorial.js` and `src/styles/tutorial.css`, loaded locally after the opening controller and initialized once. The dev gallery suppresses guidance.
- Added a soft elliptical spotlight to the existing dot canvas, with surrounding grid/chrome dimming. The tutorial uses a named menu visibility hold; highlights remain visible during idle without trapping input.
- Added the repeating three-second ghost path inside the existing “cut here” element. A valid cut press stops it; the existing five-second keyboard hint reads “Press Enter to tear” during the lesson. No ghost interaction changes the real cut path.
- Added the small, keyboard reachable Skip button and Esc skipping. Esc also retains normal cancellation of an uncommitted charge. Skipping a committed opening preserves its pending result and allows the normal sequence to continue.
- Saved progress in the existing `save.tutorial` fields. Charge and final Keep milestones join the existing strict, single-write commits; failed writes leave the lesson and real pack/card state intact. Multi-card packs retain Keep guidance until the final Keep succeeds.
- Reload restores the saved lesson. An unfinished cut lesson restores the committed wrapper via its existing replay event, retaining the identical pull and serials. Keep resumes at the first unkept card. Completed/skipped tutorials retain normal Stage 5 front-face recovery.
- Added live reduced-motion equivalents: static halo, keycap/arrow highlights and ghost path. The shared scheduler pauses presentation when hidden and can sleep on a stationary reduced-motion highlight.
- Connected **Replay tutorial** in `?dev=1` to guidance restart. It preserves collection, stock and counters; it does not grant a replacement pack.
- Verification: **25 Stage 6 behavior groups**, **140 existing Stage 1–5 behavior groups**, and **six Stage 0 console checks passed**. All **56 JavaScript files passed syntax checks**. The tests execute the real local classic scripts in the existing Node VM/instrumented DOM, including real pulls, saves, failed writes, reloads, timing, ghost stopping, multi-card Keep, hidden tabs and reduced motion.
- Compared config objects against the prior commit: every existing value is unchanged. The only config addition is `tutorialMotion`. No data files changed.

# Skipped or changed

- The inventory sheet remains Stage 7 work. This lesson uses its specified six-second fallback and subscribes to `inventory:open` for the future sheet.
- The inventory instruction starts after the menu and collection toast clear, so its six seconds describe time during which the highlight and copy are actually visible.
- Dev replay's welcome count reflects current real stock, with singular/plural grammar; a fresh save still says exactly “You have 2 packs.”
- Timed lessons pause in hidden tabs. Reload resumes the same step with that step's presentation clock restarted. Cut coordinates/ghost progress remain unsaved presentation state; reloading a cut lesson restores an intact committed wrapper.
- Prior-stage test fixtures suppress tutorial initialization to isolate their original acceptance checks. The Stage 6 suite explicitly enables production tutorial initialization and checks the complete fresh-save flow with all components active.
- Screenshots, visual critique from rendered output, direct file-open verification and measured browser FPS remain **unconfirmed**. The established `file://` browser preview restriction was respected; no alternate browser or local-server workaround was attempted. Instrumented DOM checks establish behavior, not visual acceptance.

# Look at

1. Double-click `index.html`, append `?dev=1`, and use **Reset save** with a disposable save. Confirm two packs, one quiet welcome line and a small Skip button. Hover the pack or wait 2.5 seconds.
2. Check the static pack spotlight and pulsing Space keycap. Hold Space for less than three seconds and release: the real pack drains and the hold lesson stays available. Hold for three seconds: exactly one pack is consumed.
3. Watch the ghost cut path repeat. Start a real press-and-drag cut: the ghost stops. Alternatively wait five seconds for “Press Enter to tear”, then press Enter. Confirm the cut lesson stays through the tear and the Keep highlight appears only when Keep is available.
4. Keep the card. Confirm it reaches inventory once, the arrow lesson pulses for six visible seconds, then the timer and both vials are highlighted for four seconds. The timer line should say “A new pack arrives every 8 hours.” Guidance then fades away.
5. Reload at welcome, hold, cutting, Keep, inventory and timer. Confirm the same lesson resumes. At cutting, the wrapper is restored without consuming another pack or changing the reserved serial; at Keep, the same front face is immediately available.
6. Test Skip and Esc before charging, during charging and after commit. Confirm reserved cards survive skipping and later Keep still works. Clicking Skip during an ongoing hold removes guidance while the real hold continues; Esc cancels an uncommitted hold.
7. Enable reduced motion, including while cutting: confirm static highlights/path and no tutorial pulses. Switch tabs during timed lessons and confirm hidden time does not advance them.
8. After completion, use **Replay tutorial**. Stock and collection must remain unchanged. If stock is depleted, use the existing **Grant a pack** dev control or reset a disposable save to exercise the real opening lesson again.
9. Check instruction placement, halo softness, readability, focus rings, ghost contrast, and performance in the actual browser at your normal viewport size. These require human visual acceptance.

# Open questions

- Applied defaults: **#1** eight-hour regeneration; **#2** normalized written pull chances; **#3** monochrome chrome and direct rarity accents; **#4** one card per pack with multi-card support; **#5** fixed three-second charge; **#8** empty-tier downgrade; **#14** stock cap of two with no banked time; **#15** press-and-drag cutting; **#16** standard pack; **#19** local Inter/JetBrains Mono with system fallbacks; **#21** desktop scope.
- Presentation choices: timed lessons restart their remaining presentation interval on reload; multi-card packs advance from Keep after the final successful Keep; an interrupted cut lesson restores its intact committed wrapper. These preserve the saved lesson and existing durable pack results without adding schema fields or game rules.
- No unresolved implementation dependency remains for Stage 6. Rendered appearance and browser performance still need the manual checks above.
