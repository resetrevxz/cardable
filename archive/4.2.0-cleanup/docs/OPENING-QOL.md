# Opening and refill quality of life

Read `AGENTS.md`, `Designs.MD`, the opening, main menu, game rules, cursor, tutorial and current settings docs before implementation.

- A fresh Space press accepts a revealed card once the Keep action is available. The original held charge key and repeated key events are guarded. The shortcut remains available when the opening key preference changes, and focused buttons keep their corresponding actions.
- The owner-approved swipe remake supersedes the old 8–22% pointer restriction: a larger upper-pack hit area and captured-drag tolerance feed an automatically aligned top seam. Normal coverage is 72% (Easy 60%), with a 130ms finishing sweep. Partial cuts resume broadly. See `CUT-SWIPE.md`. Keyboard tearing also removes a top cap.
- A silver draw-on guide sits just below the top seal, with its label above the wrapper. A partial cut replaces it with the persistent seam. Reduced motion displays a static guide.
- Four miniature card backs show stored packs, the next slot's continuous refill, and empty future slots. New arrivals lift subtly and catch a silver sweep. Reduced motion uses a shine without movement.
- The existing four-pack maximum and two-hour refill cadence remain authoritative. At capacity the timer pauses without banking time.
- The browser title shows the timestamp-derived countdown and remaining percentage while refilling, including when some packs are already stored. A refill arrival switches it to `pack ready`; opening a pack or returning to the tab resumes the next countdown. A full bank stays ready.

## Evidence

- Isolated checkpoint: 15 shell/title checks and 26 opening/cutting checks passed after export from the Git index. The exported checkpoint also passed the offline browser journey independently of the concurrent settings changes.
- `node tools/check-stage5.cjs`: 26 opening/cutting behavior groups passed, including rejection outside the top strip, resumable seams, Enter fallback, durable saves, hidden phases and reduced motion.
- Existing reveal/collection checks: 24 groups passed before the concurrent settings integration; final browser checks exercise the integrated input path.
- `tools/check-opening-qol-browser.cjs`: isolated file:// Playwright journey, with four groups covering real keyboard/pointer input, timestamp refill and title updates, four-slot cap, partial fills, arrival motion, reveal persistence, repeated/held Space guards, and reduced motion. No page errors or runtime HTTP requests.
- Browser screenshots and the machine-readable report are in `D:/CardableV2/outputs/opening-qol/`.

The current checkout contains concurrent card and settings work. The currency reward and settings changes are outside this quality-of-life pass. Screenshot review moved the guide above the printed wordmark so it stays below the top seal.
