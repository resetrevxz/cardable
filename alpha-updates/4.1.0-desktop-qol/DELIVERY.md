# 4.1.0 desktop polish

## Milestone A

Continues the previous uncommitted viewport/zoom scaffold. Native Chromium page
zoom scales the existing 1920 x 1080 composition once, keeping DOM coordinates,
pointer hit-testing and text rasterization in the same CSS-pixel coordinate
system. The window-wide dots and cursor remain outside the centered composition.
The shared viewport owns coalesced resize/DPR notifications, design dimensions,
safe areas and conversion between window and composition coordinates. Existing
canvas contexts and opening state machines are retained.

Interface size and aspect lock are optional Settings fields, shown only on
desktop. Browser layout uses the original viewport sizes through fallback CSS
variables. Save schema and settings version are unchanged; no dependencies added.
The named dev check is loaded only in the developer workspace and never automatic.

Assumptions: the native framed titlebar is outside Electron's content area, so its
content inset is zero. The mandated 0.62 minimum and larger user scales cannot
mathematically fit all 1920 pixels into an 800-pixel portrait window; the centered
composition is cropped at that floor, with edge controls inset into visible space.
This prepares safe areas, not a mobile layout.

Runtime verification is deferred to the single permitted launch at the end of
the last milestone completed. The physical multi-monitor / Windows DPI matrix
and sustained live-resize frame rate are not certified without the forbidden
profiling or additional manual sessions.

## Milestone B

Native window life extends the existing secure bridge: taskbar progress, one
650 ms attention cue and monochrome pack-ready badge, focus clearing, Windows
tasks and single-instance commands, optional pinning, and a frameless Mini view.
Mini renders the existing real skin/markup without a save loader or writer, has
only get-state/expand/open IPC permissions, remembers its position separately
from the full window, and expands before invoking the original opening controller.
The main renderer stays alive with its current session and owns all gameplay.

Battery policy is a separate, reversible cap layered over existing saved settings
and developer overrides. It lowers each effects control one tier, caps DPR at 1
and the shared scheduler at 30 FPS, and never writes the lowered settings to save.
Power events restore AC settings. Cutscenes and Studio hold a native display-sleep
blocker only while visible; it is released on exit, hide, renderer loss and close.
Hidden/minimized native windows pause the shared scheduler, including Studio,
while timestamp-based pack reconciliation continues, including in native Studio.
Existing current-display fullscreen and disconnected-display fallback are retained.

Platform limitation: Electron's Page Visibility API reports full occlusion only
on macOS. On Windows/Linux a covered but not minimized window is still visible;
this requirement remains incomplete there. Adding a native occlusion monitor
would require a separate platform implementation, not a guessed Electron event.
No new native library, process polling or approximation was added.

## Remaining scope and acceptance

C/D are intentionally not included: player command palette, shortcuts sheet,
captures, global save drop, persistent focus mode, away/what's-new panels, updates
link mode, bug report, safe mode, first-run welcome and optional controller input.
Only the four named pure-logic concerns are checked by `Cardable.dev.checkQol()`.
Physical battery switching, cross-monitor DPI, shell taskbar/jump-list appearance,
and the full resize-state matrix remain manual acceptance items, not certification.
Runtime results of the one permitted launch will be recorded below.

## Verification performed

Testing: one isolated Electron session confirmed persisted interface size, Settings
survival on resize, native pinning, real-skin Mini without a save writer, hidden
main-loop pause, expand-before-open and charging continuity during resize;
`Cardable.dev.checkQol()` ran once and passed all 18 assertions with no observed
renderer console errors; no old suites, test files, screenshots, recordings or
profiling were used.

The temporary profile was outside the repository; the real player save was not
used or changed. No packaged build or browser-only launch was performed under
the current testing policy. Formula samples are pure-logic checks, not evidence
that all physical window/monitor combinations were rendered.

Unrelated journal/achievement edits, old spec deletions and untracked incoming
spec directories were left in place and excluded from the final QoL commit.
