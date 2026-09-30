# Stage 1 — Shell

## Done

- Monochrome shell: SVG wordmark at the top-left, static currency at the top-right, decorative bottom chevron, and a centered 180 × 252 px pack placeholder.
- Shared demand-driven animation loop; coalesced pointer input; high-DPI dot canvas; smooth hover growth and lean; cooling comet trail; two click rings with the configured 120 ms delay.
- Lagging cursor glow with a smaller ring over controls. Native cursor remains visible.
- Staggered opacity entrance, 2.5-second idle threshold, 600 ms fade-out, and 150 ms restoration. The pack stays visible; keyboard focus and named visibility holds keep controls readable.
- Per-letter SVG rolls using the configured glyph map, hover/focus looping, leave-to-settle behavior, and one idle wave queued for the next pointer movement after a minute.
- Live reduced-motion handling, hidden-tab animation cancellation, inline SVG favicon, tab title handling, and a transient dev title-test button.
- Dev FPS uses the shared loop and reports idle when it sleeps. The hidden wordmark settles instead of keeping the loop running.
- Reproducible checks: `node tools/check-stage1.cjs` passes 15 Stage 1 groups and all six Stage 0 console checks. The checks instrument DOM events, timers, scheduler state, and canvas commands; they also confirm the dev simulations preserve the real save.

## Skipped or changed

- Added visual tuning under `config.shell`. All existing configuration values, data files, and the save schema are unchanged.
- Fixed a dev-check bug: timer simulations previously wrote their temporary state to the real storage key. Simulations now suppress writes before the first timer check.
- Local font files are absent; the supplied system fallbacks remain in use.
- Browser tooling previously rejected this project's `file://` URL and prohibited workarounds. No browser screenshot or visual designer critique was possible. Direct file-open behavior, real SVG/font rendering, CSS transitions, and measured 60 fps remain unverified. Simulated 60 Hz timestamps are behavioral checks, not performance measurements.

## Look at

1. Double-click `index.html`; confirm the staggered entrance and plain centered placeholder.
2. Sweep the pointer quickly, stop, and click the page. Check the lens-like dots, faint trail, cursor lag, and two smooth ripple rings.
3. Stop moving for 2.5 seconds. Check that chrome fades while the pack remains visible, then returns promptly on movement.
4. Hover the wordmark and move away. Check its looping roll, clipping, spacing with fallback fonts, and clean settlement. After a minute of idle, movement should play one wave without breaking the idle fade.
5. Enable reduced motion and verify opacity-only/static equivalents, including changes made while an effect is running.
6. Open `index.html?dev=1`. Check the ring over controls, keyboard focus, FPS/idle status, and title-test button; switch away before its one-second event, then return.

## Open questions

- Applied defaults: local font fallbacks (#19), desktop scope (#21), and the supplied suggested glyph map (#23).
- The approved idle-wave choice is **play on return**: inactivity queues one wave, rather than briefly revealing the faded wordmark.
- Visual appearance and measured performance require the direct browser checks above.
