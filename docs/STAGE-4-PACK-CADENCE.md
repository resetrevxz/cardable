**Done**
- Changed regeneration to one pack every two hours and storage capacity to four packs.
- Four stock indicators follow the configured capacity; the rear wrapper remains visible whenever more than one pack is stored.
- Existing timestamps use the new interval automatically. A save paused at the former two-pack cap starts regenerating again. Timer progress is preserved between arrivals; the four-pack cap still pauses regeneration without banking time.
- Updated rules, dev validation, countdown previews and the existing menu checks. All 18 menu test groups pass.
- Chromium/file:// verification passed exact two-hour boundaries, fractional catch-up, the four-pack cap, an old capped save, four rendered stock indicators, and consumption from four to three. No application exceptions occurred.

**Skipped or changed**
- Kept two starting packs, one card per pack, and the established opening sequence.
- No save reset or schema migration was needed.

**Look at**
- The four stock indicators and two-hour countdown in index.html. Screenshot and measured boundary evidence are in D:/CardableV2/outputs/idle-pack/four-pack-stock.png and timer-evidence.json.

**Open questions**
- Interpreted “4 max cards at once” as four stored packs, matching the timer/storage setting requested in the same sentence.
