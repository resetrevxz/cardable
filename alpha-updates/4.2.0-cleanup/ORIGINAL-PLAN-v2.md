# Historical input: 4.2.0 execution plan v2

Preserved from the incoming spec on 2026-10-05 for traceability. This is NOT
current guidance. Its delivery claims, paths, worktree moves and deletion rules
are superseded by SPEC.md. Do not execute its commands.

+# Cardable Docs & Structure Overhaul — Execution Plan v2

> **Status:** Full survey complete. All git branches read. Ready to execute.
> **Active working branch:** `update/achievements-ab`
> **Repo root:** `d:/CardableV2/achievements-ab`

---

## 1. True Delivery State (from git log)

This corrects the previous plan. Everything significant is **done and committed** across branches:

| Feature | Branch | Commits |
|---|---|---|
| Stages 0–8, 11a/b, 12, 13, 14 | `update/achievements-ab` | ✅ Merged into current |
| Ascendant (A/B/C) | `update/achievements-ab` | ✅ All three milestones committed |
| **Secret cutscene (A/B/C)** | `update/inspect-director` + others | ✅ All three milestones committed |
| Achievements (A/B/C + 2.7 remake) | `update/achievements-ab` | ✅ Fully committed |
| Inspect / Studio (A–E) | `update/inspect-director` | ✅ Full studio with photos, props, scenes |
| Journal / Card History (A–C) | `update/card-history` | ✅ History engine, charts, anniversaries |
| Picker Pack (A–C + stage 19) | `update/picker-pack` | ✅ Gatefold, triptych, durable choice |
| Electron (4.0.0 milestone 1) | `main` (via cardable-spec) | ✅ Foundation committed |

**The `2.3.0-secret-cutscene/` folder only has milestone A files** because it was written during A. Milestones B and C are committed directly in the source on their respective branches — the alpha-updates folder was never updated after A. This means the delivery doc (`DELIVERY.md`) only covers A. **That entire folder should be archived.**

---

## 2. Root-Level Workspace Cleanup (`d:/CardableV2/`)

These are stale worktree snapshots — the real work lives in git branches inside `achievements-ab`.

| Path | What | Action |
|---|---|---|
| `card-history-work/` | Worktree for `update/card-history` | Archive inside `achievements-ab/archive/root-workspaces/` |
| `inspect-director-work/` | Worktree for `update/inspect-director` | Archive |
| `picker-pack-work/` | Worktree for `update/picker-pack` | Archive |
| `stage11a-baseline/` | Old baseline snapshot | Archive |
| `stage11a-review/` | Old review snapshot | Archive |
| `cardable-spec/` | Full clone with Electron + node_modules | Archive (it's a separate full app tree — keep, but move it) |
| `alpha updates/` | Space-in-name folder, stale | Delete (duplicate junk) |
| `alpha-updates/` | Root-level stale alpha-updates | Archive |
| `outputs/` | Browser test screenshots/JSON | Leave as-is (not source) |
| `finish-stage11a-checks.py` | One-off migration script | Archive |
| `prepare-stage11a.py` | One-off migration script | Archive |
| `run-stage11a.py` | One-off migration script | Archive |
| `stage11a-integration-initial.json` | Migration artifact | Archive |
| `stage11a-manifest.json` | Migration artifact | Archive |
| `stage11a-pack-css.patch` | One-off patch | Archive |
| `stage11a-scoped-regressions.json` | One-off regression snapshot | Archive |
| `package.json` | Root orphan file | Archive |

---

## 3. Inside `achievements-ab/docs/` — Full File-by-File Verdict

### 🗑️ DELETE — Pure noise (JSON blobs, no prompt value)

| File | Size | Reason |
|---|---|---|
| `BUG-PASS-9C-EVIDENCE.json` | 3.4 KB | Raw QA evidence blob |
| `BUG-PASS-9C-PROFILE.json` | 2.3 KB | Raw profiler data |
| `BUG-PASS-9C-REGRESSIONS.json` | 2.5 KB | Raw regression snapshot |
| `CARD-REMAKE-PASS-1-EVIDENCE.json` | 9.9 KB | Raw evidence blob |
| `CARD-REMAKE-PASS-2-EVIDENCE.json` | 8.3 KB | Raw evidence blob |
| `FIXES-F1-F6-PROFILE.json` | 2.0 KB | Raw profiler data |
| `GRAPHICS-BROWSER.json` | 14 KB | Raw browser test output |
| `GRAPHICS-COMPARISON.json` | 8.7 KB | Raw comparison snapshot |
| `GRAPHICS-REGRESSIONS.json` | 1.5 KB | Raw regression data |
| `IDLE-PACK-STAGED-BROWSER-EVIDENCE.json` | 4.1 KB | Raw evidence blob |
| `IDLE-PACK-WORKING-BROWSER-EVIDENCE.json` | 4.2 KB | Raw evidence blob |
| `INVENTORY-REFRESH-PROFILE.json` | 3.4 KB | Raw profiler data |
| `INVENTORY-REFRESH-REGRESSIONS.json` | 18.3 KB | Raw regression JSON |
| `NEW-FEATURES-N1-N6-PROFILE.json` | 2.3 KB | Raw profiler data |
| `SETTINGS-11A-PROFILE.json` | 1.6 KB | Raw profiler data |
| `SETTINGS-11A-REGRESSIONS.json` | 36.6 KB | Raw regression JSON |
| `STAGE-8-PROFILE.json` | 2.0 KB | Raw profiler data |
| `VARIANTS-AND-TAGS-EVIDENCE.json` | 23.5 KB | Raw evidence blob |
| `ogprompt.txt` | 8.3 KB | Old raw prompt dump, obsolete |
| `STAGE-4-PACK-CADENCE.md` | 1.3 KB | One-off note, absorbed into ARCHITECTURE |

### 📦 ARCHIVE → `archive/docs/` — Historical, not guidance

| File | Why archive not delete |
|---|---|
| `STAGE-1-REPORT.md` | Build history |
| `STAGE-2-REPORT.md` | Build history |
| `STAGE-3-TIERS-4-6-REPORT.md` | Build history |
| `STAGE-3-TIERS-7-9-REPORT.md` | Build history |
| `STAGE-3-TIERS-10-12-REPORT.md` | Build history |
| `STAGE-4-REPORT.md` | Build history |
| `STAGE-4-IDLE-PACK-REPORT.md` | Build history |
| `STAGE-5-THROUGH-TEAR-REPORT.md` | Build history |
| `STAGE-5-REVEAL-REPORT.md` | Build history |
| `STAGE-6-REPORT.md` | Build history |
| `STAGE-7-REPORT.md` | Build history |
| `STAGE-8-REPORT.md` | Build history |
| `STAGE-8-DESIGN-REVIEW.md` | Build history |
| `BUG-PASS-9C-REPORT.md` | Historical bug pass report |
| `FIXES-F1-F6-REPORT.md` | Historical fix report |
| `NEW-FEATURES-N1-N6-REPORT.md` | Historical feature report |
| `CARD-REMAKE-PASS-1.md` | Absorbed into 02-RARITIES and 03-CARD |
| `CARD-REMAKE-PASS-2.md` | Absorbed into 02-RARITIES and 03-CARD |
| `SETTINGS-11A.md` | Historical acceptance report |
| `SETTINGS-11B.md` | Historical acceptance report |
| `VISUAL-PASS-PROGRESS.md` | Ongoing pass that stalled |
| `VARIANTS-AND-TAGS-QA.md` | Historical QA, absorbed into VARIANTS-AND-TAGS.md |
| `INVENTORY-REFRESH.md` | Historical QA report, absorbed into 06-INVENTORY |

### 🔄 ABSORB THEN DELETE — Content folds into a canonical doc

| File | Absorb into | Section to add |
|---|---|---|
| `CUT-SWIPE.md` | `04-PACK-OPENING.md` | "Cut mechanics & gesture" |
| `IDLE-ACTIVITY.md` | `05-MAIN-MENU.md` | "Idle & AFK behavior" |
| `OPENING-QOL.md` | `04-PACK-OPENING.md` | "Quality-of-life rules" |
| `INVENTORY-PERFORMANCE.md` | `06-INVENTORY.md` | "Performance & rendering" |
| `GRAPHICS-QA.md` | `GRAPHICS-UPDATE.md` | Consolidate, remove JSON references |

### ✏️ REWRITE IN-PLACE — File stays, content cleaned

| File | What changes |
|---|---|
| `ARCHITECTURE.md` | Remove duplicate Stage 14 paragraph. Trim stage-appended implementation walls (lines ~147+) — keep only extension recipes section. The rest is already in source. |
| `RARITY-INTROS.md` | Becomes `CINEMATICS.md`. Trim from 27 KB to ~8 KB: keep timing tables, field retention rules, renderer contracts, RM/mono paths. Cut milestone A/B/C narrative (already in ARCHITECTURE). |
| `BUGS.md` | Strip all "fixed" rows from the inventory bug table. Keep "deferred" rows + manual acceptance checklist. Remove old defaults/scope paragraph. |
| `POLISH-BACKLOG.md` | Strip "blocked on rendered evidence" / "acceptance deferred" meta-commentary. Keep only the ranked todo items and the "detail nobody would notice" lines. |
| `GRAPHICS-UPDATE.md` | After absorbing GRAPHICS-QA: remove all references to external JSON evidence files. Clean up the QA table. Single source for graphics. |
| `STAGES.md` | Full rewrite → `ROADMAP.md`. See section 4D. |
| `Designs.MD` | Renamed `DESIGN-SYSTEM.md`. Remove the duplicate Stage 14 paragraph. Move stage-appended sections to appendices. Reorder so Principles comes first, not the 2.1.0 brand exception. See section 4B. |

### ✅ KEEP AS-IS — These are clean and authoritative

| File | Note |
|---|---|
| `01-GAME-RULES.md` | Clean |
| `02-RARITIES.md` | Clean — but remove the "system is a template, ignore variants" warning (Stage 12 made variants in-scope) |
| `03-CARD.md` | Clean |
| `04-PACK-OPENING.md` | Clean — receives absorbed content |
| `05-MAIN-MENU.md` | Clean — receives absorbed content |
| `06-INVENTORY.md` | Clean — receives absorbed content |
| `07-DOT-GRID-CURSOR.md` | Clean |
| `08-TUTORIAL.md` | Clean |
| `11-SETTINGS.md` | Clean |
| `OPEN-QUESTIONS.md` | Good reference doc |
| `VARIANTS-AND-TAGS.md` | Clean |

---

## 4. Inside `achievements-ab/alpha-updates/` — Verdict

### ✅ KEEP — Still relevant as specs
| Folder | Why |
|---|---|
| `2.7.0-achievements/` | Most recent delivered spec — useful reference |

### 📦 ARCHIVE → `archive/alpha-updates/` — All delivered

Every other folder represents a feature fully committed to source. The alpha-updates delivery docs are now redundant with ARCHITECTURE.md and the canonical numbered docs.

| Folder | Delivered |
|---|---|
| `1.3.0-update/` | Dev workspace — ARCHITECTURE section 5 |
| `1.4.0-context-menu/` | Delivered |
| `1.5.0-rarity-intros/` | In new CINEMATICS.md |
| `1.6.0-prism-reveals/` | In CINEMATICS.md (Legendary) |
| `1.7.0-legendary-reveal/` | In CINEMATICS.md |
| `1.8.0-mythical-reveal/` | In CINEMATICS.md |
| `1.9.0-exotic-reveal/` | In CINEMATICS.md |
| `2.0.0-pack-variants/` | In ARCHITECTURE |
| `2.1.0-brand-packs/` | In ARCHITECTURE + 05-MAIN-MENU |
| `2.2.0-classic-pack/` | In ARCHITECTURE |
| `2.3.0-secret-cutscene/` | Only has milestone A delivery doc. B/C are committed in source. Archive the folder. |
| `1.13.0-ascendant-cutscene/` | All A/B/C committed. Archive. |
| `2.4.0-achievements/` | Superseded by 2.7.0 |

---

## 5. New Files to Create

### A. `AGENTS.md` — Full Rewrite
Tight, briefing-card style. Every sentence earns its place.

```
# AGENTS.md — Cardable

One paragraph: what the game is.

## Read order
1. This file
2. DESIGN-SYSTEM.md — always, before touching any UI
3. The doc(s) for your area (list by area)
4. OPEN-QUESTIONS.md — defaults for anything undecided

## Hard rules (numbered, scannable, no fluff)

## Stage protocol (condensed to 5 bullet points)

## Where things go
→ See docs/ARCHITECTURE.md section 6 (extension recipes)
```

### B. `DESIGN-SYSTEM.md` — Rename + Rewrite of `Designs.MD`
Structure becomes:
```
1. Principles          ← unchanged, perfect
2. Design tokens       ← CSS block, unchanged
3. Typography          ← table, unchanged
4. Palette & color     ← cleaned, no stage notes inline
5. Glass recipe        ← unchanged
6. Motion              ← table + springs, cleaned
7. Light model         ← unchanged
8. Layout & idle       ← merged with idle behavior
9. Component states    ← table, unchanged
10. Micro-interactions ← unchanged
11. Accessibility      ← unchanged
12. Performance budget ← unchanged
13. Don'ts             ← unchanged
14. References         ← unchanged

Appendix A: Authorized palette exceptions
  (brand packs, cinematics per rarity, Classic pack, dev workspace)
  All the stage-appended paragraphs live here, consolidated.
```

Key fixes:
- Remove verbatim duplicate paragraph (Stage 14 inventory, appears twice)
- Move brand exception from line 1 to Appendix A
- Move "Stage 13 graphics", "1.3.0 dev workspace", "Stage 14 inventory", all Ascendant milestone notes, Secret milestone A, Classic 2.2.0, and the 2.1.0 wrapper exception text to Appendix A
- Remove cross-references to deleted docs

### C. `docs/CINEMATICS.md` — New, replaces `RARITY-INTROS.md`
All rarity cinematic specs in one clean reference. Source from RARITY-INTROS.md (27 KB) → distill to ~8 KB.

```
1. Overview table
   Rarity | Type | Duration (Normal/Fast/Short/Off) | Retained field

2. Shared infrastructure
   - Scheduler, flip timing (400 ms), field retention lifecycle
   - Skip (2 s hint + 500 ms fade)
   - Reload / recovery behavior (no replay)

3. Per-rarity cinematics
   Basic → Common → Uncommon → Rare → SR → Unusual → DSR
     (these use shared intro controller, timing table only)
   Legendary — molten gold prism, crystal sweeps, gold field
   Mythical — Crimson Clock, ruby cave, red-black field
   Exotic — galaxy tunnel, rotating galaxy, star field
   Ascendant — Prismatic Dawn A/B/C, pastel curtains, squircle border
   Secret — Fatal Exception A/B/C, fakeout/boot/desktop/resurrection

4. Photosensitivity controls
   Safe (default) / Full, pre-roll, limiter, emergency brake

5. Extension guide
   How to register a new cinematic renderer
```

### D. `docs/ROADMAP.md` — Replaces `STAGES.md`
Forward-looking. No checklists for completed stages.

```
## Shipped (complete, committed)
One-line entries for every stage + update that's in git.
Includes: all stages 0–14, Secret A/B/C, Ascendant A/B/C,
Achievements A/B/C + 2.7 remake, Inspect/Studio A–E,
Journal/Card History A–C, Picker Pack A–C, Classic Pack,
Brand Packs, Variants, Graphics presets.

## Active branches (not yet merged to achievements-ab)
- update/inspect-director — Studio A–E (inspect mode, photo, props)
- update/card-history — Journal A–C (history, charts, anniversaries)
- update/picker-pack — Picker 2.8.0 (triptych skin, gatefold, choice)
- main (cardable-spec) — Electron 4.0.0 milestone 1

## Planned (no timeline)
Items from POLISH-BACKLOG.md

## Prompting guide
How to give one stage per prompt. Which docs to read for each area.
```

### E. `docs/ACHIEVEMENTS.md` — Promote from alpha-updates
Take `alpha-updates/2.7.0-achievements/SPEC.md`, strip delivery-specific language, promote to first-class doc.

```
1. Overview
2. Data model
3. Engine API (register, progress, list, totals)
4. Full catalog (41 active / 16 dormant, with tiers)
5. UI spec (panel, tiles, toast, detail drawer)
6. Conditional achievements (requires flags + future publishers)
7. Extension guide
```

### F. `docs/PROMPTING.md` — New AI agent guide
Explicitly tells an agent what to do and what to skip when working on this project.

```
## Always read first (in this order)
1. AGENTS.md
2. DESIGN-SYSTEM.md
3. ARCHITECTURE.md
4. The numbered doc for your area

## Never read (archived, legacy, noise)
archive/, JSON files, STAGE-*-REPORT files, ogprompt.txt

## Common mistakes this codebase guards against
- ES module imports (file:// blocks them — classic scripts only)
- Hard-coding card/rarity data in UI (always data-driven)
- Adding color outside card faces (chrome is monochrome)
- Inventing game rules not in docs
- Starting the next stage before finishing the current one

## How to add things
→ ARCHITECTURE.md section 6 (extension recipes)

## Testing expectations
No automated test runner. Dev console checks only.
Manual acceptance checklist in BUGS.md.
```

---

## 6. In-Place Doc Fixes (minor, targeted)

### `02-RARITIES.md`
Remove line: *"The system is a template reused from another project. **Ignore** its variants system and its card names."*
Variants are in-scope since Stage 12. This line actively confuses agents.

### `ARCHITECTURE.md`
- Fix duplicate Stage 14 paragraph (appears verbatim twice at lines ~211 and ~215)
- Trim or collapse lines ~147–163 where stage-appended implementation details repeat what's in source. Keep section 6 (extension recipes) — it's essential.
- Remove the "2.0.0 brand pack extension" opening header and fold it cleanly into section flow.

### `BUGS.md`
- Remove all `| fixed |` rows from the inventory bug table (inv-01 through inv-11, inv-13). Keep inv-12 (deferred — browser acceptance).
- Keep the manual acceptance checklist section.
- Remove the "Defaults and scope" paragraph at the bottom (duplicates OPEN-QUESTIONS.md).

### `POLISH-BACKLOG.md`
- Remove all "acceptance deferred / blocked on rendered evidence / file preview restriction" meta-commentary.
- Keep only the ranked todo lists and the "detail people would feel missing" insights.
- Keep the stage-sourced ranked lists (sealed idle pack review, inventory refresh, settings, Data tools, stage 12, etc.).

### `OPEN-QUESTIONS.md`
- No changes needed — clean and useful.

---

## 7. Execution Order (15 steps)

```
Step 1:  Snapshot commit
         git add -A && git commit -m "docs: pre-overhaul snapshot"

Step 2:  Archive root-level stale workspace forks
         Move into achievements-ab/archive/root-workspaces/:
           card-history-work/, inspect-director-work/, picker-pack-work/,
           stage11a-baseline/, stage11a-review/, cardable-spec/,
           root alpha-updates/, "alpha updates"/
           + .py scripts + .json manifests + package.json

Step 3:  Delete JSON evidence blobs from docs/
         (20 files — section 3 delete list)

Step 4:  Archive stage reports → achievements-ab/archive/docs/
         (24 files — section 3 archive list)
         Also create archive/docs/README.md explaining the structure.

Step 5:  Archive delivered alpha-updates → archive/alpha-updates/
         (all except 2.7.0-achievements which stays in place)
         Create archive/alpha-updates/README.md

Step 6:  Absorb sub-specs into canonical docs (add sections)
         CUT-SWIPE.md       → 04-PACK-OPENING.md  (§ Cut mechanics)
         IDLE-ACTIVITY.md   → 05-MAIN-MENU.md      (§ Idle & AFK)
         OPENING-QOL.md     → 04-PACK-OPENING.md  (§ QoL rules)
         INVENTORY-PERFORMANCE.md → 06-INVENTORY.md (§ Performance)
         GRAPHICS-QA.md     → GRAPHICS-UPDATE.md  (consolidate)
         Then delete the source files.

Step 7:  Minor in-place fixes
         02-RARITIES.md — remove stale template warning
         ARCHITECTURE.md — fix duplicate, trim stage appendages
         BUGS.md — strip fixed rows, remove duplicate defaults section
         POLISH-BACKLOG.md — strip blocked/deferred meta-commentary
         GRAPHICS-UPDATE.md — post-absorption cleanup

Step 8:  Rewrite AGENTS.md
         Apple-memo style. Tight. < 40 lines.

Step 9:  Rename + rewrite Designs.MD → DESIGN-SYSTEM.md
         Fix duplicate paragraph, reorder (Principles first),
         move all stage-appended text to Appendix A.
         Update the one reference in AGENTS.md.

Step 10: Write docs/CINEMATICS.md
         Source: RARITY-INTROS.md + Designs.MD cinematic sections
                 + ARCHITECTURE cinematic sections
         Then delete RARITY-INTROS.md.

Step 11: Write docs/ACHIEVEMENTS.md
         Source: alpha-updates/2.7.0-achievements/SPEC.md
         Strip delivery language, promote to canonical.

Step 12: Write docs/ROADMAP.md
         Source: STAGES.md (rewrite, forward-looking only)
         Then delete STAGES.md.

Step 13: Write docs/PROMPTING.md
         New from scratch.

Step 14: Verify no broken references
         Search for removed filenames in src/, docs/, AGENTS.md:
           RARITY-INTROS, STAGES.md, CUT-SWIPE, IDLE-ACTIVITY,
           OPENING-QOL, INVENTORY-PERFORMANCE, GRAPHICS-QA,
           CARD-REMAKE-PASS, BUG-PASS-9C, ogprompt,
           INVENTORY-REFRESH.md (old version)
         Fix any found.

Step 15: Final commit
         git add -A
         git commit -m "docs: overhaul — archive legacy, clean structure, new design system + cinematics + achievements + roadmap + prompting"
```

---

## 8. Archive Structure (Final Layout)

```
achievements-ab/
  archive/
    dev-menu-legacy/            ← existing, untouched
    docs/                       ← NEW
      README.md                 ← "These are historical stage reports and QA records. Not guidance."
      STAGE-1-REPORT.md
      STAGE-2-REPORT.md
      STAGE-3-TIERS-4-6-REPORT.md
      STAGE-3-TIERS-7-9-REPORT.md
      STAGE-3-TIERS-10-12-REPORT.md
      STAGE-4-REPORT.md
      STAGE-4-IDLE-PACK-REPORT.md
      STAGE-5-REVEAL-REPORT.md
      STAGE-5-THROUGH-TEAR-REPORT.md
      STAGE-6-REPORT.md
      STAGE-7-REPORT.md
      STAGE-8-REPORT.md
      STAGE-8-DESIGN-REVIEW.md
      BUG-PASS-9C-REPORT.md
      FIXES-F1-F6-REPORT.md
      NEW-FEATURES-N1-N6-REPORT.md
      CARD-REMAKE-PASS-1.md
      CARD-REMAKE-PASS-2.md
      SETTINGS-11A.md
      SETTINGS-11B.md
      VISUAL-PASS-PROGRESS.md
      VARIANTS-AND-TAGS-QA.md
      INVENTORY-REFRESH.md
    alpha-updates/              ← NEW
      README.md                 ← "These specs are delivered. See src/ and canonical docs."
      1.3.0-update/
      1.4.0-context-menu/
      1.5.0-rarity-intros/
      1.6.0-prism-reveals/
      1.7.0-legendary-reveal/
      1.8.0-mythical-reveal/
      1.9.0-exotic-reveal/
      2.0.0-pack-variants/
      2.1.0-brand-packs/
      2.2.0-classic-pack/
      2.3.0-secret-cutscene/
      2.4.0-achievements/
      1.13.0-ascendant-cutscene/
    root-workspaces/            ← NEW
      README.md                 ← "Stale git worktrees. Active work lives in branches."
      card-history-work/
      inspect-director-work/
      picker-pack-work/
      stage11a-baseline/
      stage11a-review/
      cardable-spec/
      [root scripts and json files]
```

---

## 9. Final Active Doc Tree (After Overhaul)

```
achievements-ab/
  AGENTS.md                     ← rewritten, < 40 lines
  DESIGN-SYSTEM.md              ← renamed + rewritten Designs.MD
  index.html
  src/
  assets/
  references/
  tools/
  alpha-updates/
    2.7.0-achievements/         ← kept (active reference spec)
  archive/
    dev-menu-legacy/
    docs/
    alpha-updates/
    root-workspaces/
  docs/
    01-GAME-RULES.md            ← unchanged
    02-RARITIES.md              ← removed stale "ignore variants" line
    03-CARD.md                  ← unchanged
    04-PACK-OPENING.md          ← + cut-swipe + opening-qol sections
    05-MAIN-MENU.md             ← + idle-activity section
    06-INVENTORY.md             ← + performance section
    07-DOT-GRID-CURSOR.md       ← unchanged
    08-TUTORIAL.md              ← unchanged
    11-SETTINGS.md              ← unchanged
    ACHIEVEMENTS.md             ← NEW: promoted from 2.7.0-achievements/SPEC.md
    ARCHITECTURE.md             ← duplicate fixed, stage appendages trimmed
    BUGS.md                     ← fixed rows stripped, only deferred + checklist
    CINEMATICS.md               ← NEW: replaces RARITY-INTROS.md (all reveals)
    GRAPHICS-UPDATE.md          ← + graphics-qa content, cleaned
    OPEN-QUESTIONS.md           ← unchanged
    POLISH-BACKLOG.md           ← meta-commentary stripped
    PROMPTING.md                ← NEW: AI agent guide
    ROADMAP.md                  ← NEW: replaces STAGES.md
    VARIANTS-AND-TAGS.md        ← unchanged
```

**Active docs:** ~20 files (was ~65 with JSON blobs and reports).
**Archive:** All history preserved with README context.

---

## 10. Impact on Prompting

| Problem | Fix |
|---|---|
| Agent wades through 65 files to orient | 4 files to start: AGENTS → DESIGN-SYSTEM → ARCHITECTURE → area doc |
| 36 KB SETTINGS-11A-REGRESSIONS.json in context | Deleted |
| Secret described as "milestone A only, B/C unfinished" | CINEMATICS.md shows all three milestones delivered |
| RARITY-INTROS.md is 27 KB of milestone narrative | CINEMATICS.md: ~8 KB of rules and tables |
| Designs.MD opens with 2.1.0 brand exception | DESIGN-SYSTEM.md opens with Principles |
| "Ignore variants" warning conflicts with Stage 12 | Removed |
| No agent knows what's done vs what's planned | ROADMAP.md |
| Achievements spec buried in alpha-updates | First-class ACHIEVEMENTS.md |
| Nothing telling agents what NOT to read | PROMPTING.md |

---

*Survey: 2026-10-05. All branches and files read. Execution ready on approval.*
