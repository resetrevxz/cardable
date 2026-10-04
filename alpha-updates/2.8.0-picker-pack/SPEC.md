# Picker Pack — pick 1 of 3

> **ON HOLD. Do not run this until the current pack work (Classic, Legendary and the other new packs) is merged.** It edits the same pack registry, opening-styles registry, swap registry, counter markers and save data as that work. The spec is written so it can be built on top of it.

A pack where the player is offered **three cards** and **chooses one to keep**. Custom design: a pearl-white triptych (gatefold) pack with three glowing windows.

**Read first:** `AGENTS.md`, `Designs.MD`, the pack-variant system and the new-packs spec and code (resolver, pools, skins, opening styles, swap styles, counter markers), `docs/04-PACK-OPENING.md`, the cutscene engine, the strobing profile helper, tags and the Journal/Achievement events if they exist.

## 1. Rules

- **Additive only.** Use the existing registries. Do not bump the save schema if avoidable; add optional fields (`pendingReveal.options`, `pendingReveal.choice`). If a bump is unavoidable, make it a single, clearly numbered migration and say so in the report.
- Data-driven; classic scripts; offline; file:// safe; no libraries; quality tiers and reduced motion respected; strobing profile respected.
- **Testing:** do not run old tests, create test files, take screenshots or profile. Add ONE small logic check, `Cardable.dev.checkPicker()`, run once at the end: three options are always distinct cards, the guarantee holds, only the chosen card creates an instance and mints a serial, a reload mid-pick resumes at the pick screen with the same options, and an old save loads. Under 1 second, never automatic.

## 2. Odds and pool

- Pack id `picker`, name "Picker Pack", tagline "PICK 1 OF 3". Chance **3 % of regular slots** (tunable in `slotRules`); counter accent teal.
- Pool: all cards, normal tier weights, no variant slot exclusions. `cardsShown: 3`, `cardsKept: 1`.
- Draw **three distinct cards** (distinct card ids), each with its own variant roll as usual. **Guarantee:** at least one option is Rare or better (`guarantees: [{ minTier: 3, count: 1 }]`). Reroll duplicates before applying the guarantee; fall back gracefully when pools are small.
- Optional `unpickedRefund` (default 0) gives credits for each unpicked card, scaled by tier, if the owner wants a consolation; keep it in data.
- **Commit at charge completion** like every pack: consume the pack and store `pendingReveal = { packId: 'picker', options: [three drawn results], choice: null }`. **Do not mint serials or create instances for the options.** When the player chooses, mint the serial and create the instance for the chosen card only (the serial counter never skips).
- Reload mid-pick resumes on the pick screen with the same options. Reload after choosing resumes at the settle/Keep state as usual.

## 3. Design (original, premium, distinct)

Colors: pearl white body, brushed aluminum trim, **teal glow `#2DE2B8`** in the three windows (teal is not used by any other pack). Keep the Cardable header and the standard silhouette and size.

- **Triptych:** the body has three vertical panels, a wider center panel and two narrower side wings with a fine gatefold crease. Three tall die-cut **windows** with brushed metal frames and engraved numerals **1 · 2 · 3**, each showing the back of a card peeking through. A center reticle ring and the label "PICKER PACK / PICK 1 OF 3", footer "SERIES 01 / P3 / ...".
- Material: glossy pearl lacquer with a soft clearcoat, a thin teal pinstripe, a faint hex-grid emboss that shows when light passes.
- **Idle:** the three windows chase-light in sequence (at most 1.5 Hz, smooth ramps), the card backs shuffle subtly behind the glass, a slow pearl sheen sweep every ~7 s. **Waiting:** transparent triptych outline filling with pale-teal fluid. **Ready moment:** the three windows light in order. **Charge (hold):** the windows brighten one after another as the fill passes them, the card backs fan slightly, seam light turns teal-white. **Dissolve:** the pearl shell splits into three panels that slide away.
- **Counter marker:** teal glyph with "1/3".
- **Swap-in (`fanCollapse`):** three card backs fan out from the center and fold together into the new pack (about 1.2 s). Reduced motion: crossfade.
- Quality tiers: High full animation; Medium static gloss and simpler chase; Low static with a single sheen; Very Low flat.

## 4. Opening and the pick screen

New opening style `pickThree` (registered like the others):

1. After the hold and dissolve, the two side wings **unfold** outward like a gatefold (drag them apart or press Enter), revealing **three face-down cards** fanned on a teal-lit surface.
2. The cards **flip one by one** (left to right, 350 ms apart) to show their face: art, name, tier badge, and variant glyphs, with a short, tier-scaled glow, **without** running any rarity cutscene. A Secret option shows as a black glitching card marked "???" (no tier, no fake name) and plays the Secret fake-out only if it is chosen.
3. **Pick:** hover enlarges and tilts a card (full-effect mode for the hovered card only), click or press `1` `2` `3` (or arrows then Enter) to select; the choice needs a confirm via a quick second click or hold of 600 ms with a fluid ring so it cannot be mis-clicked. A subtle "Pick 1 of 3" prompt fades in.
4. The two unchosen cards **fall away** (dissolve into particles; if `unpickedRefund` is set, the credit counter ticks up). The chosen card glides to the center.
5. The chosen card then plays its **own tier cutscene or normal reveal**, then `settling` (info, tags, Keep) as usual.
- Keyboard and accessibility: focusable cards, `aria-labels` ("Option 1 of 3: <name>, <tier>"), reduced motion = simple fades.
- Tags show "PICKED 1 OF 3" in the expanded view. If the Journal and Achievements exist, emit `picker:chosen` with `{ options: [...], chosenIndex, chosenTier, lowestTierChosen, bestTierChosen }`; ignore silently otherwise.

## 5. Other touchpoints

- Tab title "Cardable - Picker pack ready" when next; right-click pack info and dev menu pick up the pack through the registries (dev: force three options, set the guarantee, replay the pick screen).
- Right-click and tags read pack info from data; no hard-coded ids outside data and the skin.

## 6. Milestones (stop at a clean one, commit, list what is unfinished)

- **A:** data entry, resolver rule, draw logic with the guarantee, pending-reveal structure, serial minting at choice, counter marker, the dev check.
- **B:** the skin (all states) and swap style.
- **C:** the `pickThree` opening and pick screen, polish, quality tiers.

## 7. Manual checks

1. The pack appears at about 3 % of regular slots; the counter marker shows "1/3" in teal.
2. The gatefold unfolds, the three cards flip in sequence, and picking feels deliberate and responsive.
3. Only the chosen card enters the inventory with the next serial; reload mid-pick resumes correctly.
4. A Secret option shows as "???" and, if chosen, plays its cutscene.
5. Quality tiers and reduced motion degrade gracefully; no flashing beyond the profile.
6. Other packs behave exactly as before. No console errors.

## 8. Out of scope

Sound (hooks only), trading, shop pricing, changes to rarity logic or cutscenes.
