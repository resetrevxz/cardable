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

## Remaining scope

Milestone B is next. C/D are intentionally not included in this run.
