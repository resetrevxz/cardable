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

## A/B checkpoint scope and acceptance

C/D were not included at the A/B checkpoint: player command palette, shortcuts sheet,
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

At the A/B checkpoint, journal/achievement edits, old spec deletions and untracked
incoming specs were excluded. The latest explicit request brings the existing
Journal tab and its Achievements coordination changes into the C/D continuation.

## Milestone C continuation

Player commands use a data-driven registry and the developer palette's extracted
shared glass surface and fuzzy matcher. Keyboard shortcuts have one descriptor
registry; existing gameplay handlers remain the owners of their contextual keys.
Collected cards are indexed by actual owned finish stacks, with name/tier/variant
search. Sorts reuse the inventory toolbar's existing definitions. Save tools route
through the existing preview/confirmation UI, never straight to a save replacement.
Global dropping accepts one bounded JSON file and leaves validation to that flow.
Persistent H focus mode retains the pack/counter; detail's existing H History key
keeps ownership. Optional focus-on-launch is additive in Settings.

Native captures have sender-validated narrow IPC, bounded card rectangles, fixed
Pictures/Cardable output, opaque session IDs for revealing files and clipboard
image support. Rounded/squircle corner clipping is best-effort; tilted/complex
card silhouettes still need human image acceptance. Capture success emits the
existing ui:screenshot event. No capture is executed under the no-screenshots rule.

The latest request explicitly includes Card History in Electron: the pre-existing
History tab implementation and its Achievements page-coordination fix are now
included instead of preserved out of scope. History's timeline/charts remain intact.

Controller input is optional and deferred. C runtime acceptance is deferred to
the sole permitted launch/check at the end of D. No old test suite is run.

## Milestone D continuation

Native welcome explains local save paths and automatic backup behavior in three
lines, followed by browser-export import guidance using the original preview and
confirmation flow. A profile-local version marker shows bundled CHANGELOG.md
headings/bullets once; the full changelog remains accessible from About. Existing
profiles get an away summary on subsequent launches and after a 30-minute return;
timestamp reconciliation remains the timer's job, never a second reward writer.
Modal ownership is additive, preserves prior inert state, blocks accidental
charging and queues panels around active opening/collection/Studio views.

desktop-release.json remains the sole public configuration source: owner and
repository are deliberately null at the owner's request. updates.mode defaults
to link; github-public performs a manual, timeout/size-bounded stable-release API
check without credentials, automatic downloads or renderer network access.
The installer updater's service/handlers are retained; scheduled checks are
disabled outside its existing explicit update fixtures. About uses the QoL flow.
Bug reports derive the issue URL from the same repository configuration. Copies
and reports contain only version/platform/GPU features/quality plus a bounded
allowlist of structural lifecycle logs, excluding saves, IDs and local paths.

Safe-mode relaunch uses the existing renderer/disk flush handshake and cancels
if it fails. Hardware acceleration is disabled before Chromium starts; Low is a
session-only override of graphics controls, not a persisted preset change.
No new dependency, color or save/settings schema version was introduced.

### Intentionally unfinished / manual acceptance

- GitHub Releases, real public API behavior and issue submission remain deferred
  until the owner supplies owner/repository in a later update. Nothing was published.
- Optional controller support is not implemented and has no misleading toggle.
- F2/Copy/Save image output and corner accuracy were not executed (screenshots
  are forbidden). Safe-mode relaunch was not executed (one app launch only).
- Actual exported-file dropping, owned-card navigation and a real 30-minute
  absence remain manual acceptance; the timestamp helper is covered only by
  the single named logic check, not a long-running/profiling harness.
- A/B's physical DPI/battery/taskbar/monitor checks and Windows/Linux full
  occlusion limitation remain as documented above. Browser-only launch and
  packaged runtime regression are not claimed under this restricted policy.
- Existing old-spec deletions and unrelated incoming spec folders stay untouched
  and excluded from commits. They are not a clean-tree promise.

### C/D acceptance and Electron distribution

Runtime acceptance and distribution results are recorded at completion below.
The updated unpacked app/installer include the existing Card History engine,
its inventory tab, Achievements switch fix, all 4.1.0 scripts and bundled changelog.
Packaging is a build operation, not an old test-suite run; no installer is run
and no existing player installation/save is overwritten.

Testing: one isolated Electron app session (same window refreshed for final
wiring) confirmed welcome/import guidance, version/full-changelog and away-panel
rendering, palette→History, History↔Achievements switching, shortcuts, H focus,
palette filters, native About and trimmed diagnostics; checkQol ran once and
passed all 18 assertions with zero observed renderer console errors; no old
suites, test files, screenshots, recordings or profiling were used.

The automation connection timed out once and was reattached to the same app,
not relaunched. Its disconnected stdout/stderr exposed an existing main logger
EPIPE recursion during shutdown. The isolated process was stopped and a console
transport guard added; that guard was not rerun under the one-session/one-check
policy. No real player process or save was stopped/changed.

The default build encountered Windows EBUSY on dist/win-unpacked, which is used
by an already-running Cardable process. Delivery therefore uses the separate
dist/desktop-qol-4.1.0 output directory; the old process is not force-closed.
Close it normally before starting the updated executable. Retain a JSON export
and download Studio photos before switching file-origin directories.

The separate Windows x64 build completed successfully: unpacked Cardable.exe,
Cardable-Setup-4.1.0.exe and its blockmap are present. Nothing was published or
installed; packaged execution and publisher/signature acceptance were not run.
