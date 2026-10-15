# Cardable 1.7.4 — Inventory fixes

Implemented on top of stage 122 / 1.7.3 (`7a34933`). This patch preserves the complete static fronts, rarity treatments, key stats, single live browsing card, graphics preferences and save schema. Two requested GPT-6 Luna agents investigated the independent cursor and optimization tracks; integration and runtime verification stayed with the main agent.

## Causes and changes

A live inventory preview is deliberately inert and hidden from assistive technology. Its direct handoff into detail inherited those flags. The first click therefore opened the card, but pointer events targeted an ancestor outside the card, so the existing tilt handler never received them. Detail now makes its inherited visual interactive on entry and noninteractive during return. No global pointer-target bypass or extra tracking loop is added.

Every brief pointer crossing previously constructed full front/back materials and then constructed a replacement static front on leave. Pointer entry now waits 110 ms; leave waits 130 ms. Moving away cancels the pending promotion, while keyboard focus remains immediate. A tile starts explicitly with `live: false`, so demoting an already static card is a no-op. Removal, recycling, take and restore cancel both timers. Detached, hidden or inert surfaces and hidden documents cannot receive delayed promotion.

The tradeoff is a short delay before decorative live materials start on pointer hover. The complete static card remains visible throughout, and clicking or keyboard focus still works immediately.

## Measured comparison

The requested performance metric is work and responsiveness while browsing inventory. `tools/profile-inventory-regression.cjs` uses disposable localhost browser contexts, Edge 155.0.4283.45 headless, Windows 10.0.26200, Node 24.20.0 and an AMD Ryzen 7 7800X3D (16 logical processors). Viewport: 1366×900, 60 FPS cap, animation enabled. The fixture has 126 active cards across normal and variant finishes: 1,512 stacks. Baseline routes the affected source files from exact commit `7a34933`; the same workload then runs against this patch.

Each tier/view has two sequential repetitions of 24 real pointer moves spaced by 35 ms, then 24 shelf-pan or grid-scroll samples spaced by 35 ms. The second repetition follows the same preceding scroll state in both versions. Values below are renderer main-thread `Performance.TaskDuration` milliseconds for the entire workload, not milliseconds per frame. Lower is better. The table keeps both hover samples visible; the last column averages the two pan samples.

| Tier / view | Baseline hover ms, both runs | Updated hover ms, both runs | Mean hover reduction | Mean pan ms, before → after |
|---|---:|---:|---:|---:|
| Very Low / Shelf | 187 / 223 | 76 / 86 | 60% | 72 → 74 |
| Very Low / Grid | 218 / 136 | 82 / 89 | 52% | 143 → 136 |
| Low / Shelf | 561 / 594 | 195 / 209 | 65% | 93 → 96 |
| Low / Grid | 711 / 636 | 281 / 356 | 53% | 304 → 278 |
| Medium / Shelf | 592 / 651 | 201 / 210 | 67% | 97 → 103 |
| Medium / Grid | 756 / 809 | 366 / 487 | 46% | 315 → 259 |
| High / Shelf | 674 / 659 | 260 / 317 | 57% | 166 → 143 |
| High / Grid | 769 / 692 | 361 / 442 | 45% | 331 → 290 |

Baseline sweeps constructed 24 full cards plus 24 static replacements in Shelf, and 12–24 of each in Grid. Every updated sweep constructed zero of either. This supports the hover-churn reduction; the smaller, mixed pan changes do not establish a general scrolling speedup. Headless measurements do not prove physical-display FPS, low-end hardware performance or a GPU/memory improvement. Raw local evidence: `qa-output/inventory-regression/baseline.json` and `final-timing.json` (ignored outputs).

Compositor diagnostics are separate from timing runs. Removing permanent layer hints and overriding the authored static finish mask did not establish a repeatable independent win, so neither experiment is included. A diagnostic run with LayerTree instrumentation was excluded from the timing table because its instrumentation differed from the baseline. No card design or quality setting was removed to improve the result.

## Runtime and regression evidence

- Baseline pointer probe reproduced `inert: true`, `aria-hidden: true`, target outside the card and unchanged `--mx: 0.5`. Updated probe recorded `inert: false`, no `aria-hidden`, target inside and `--mx: 0.78`, with visible tilt.
- `tools/check-inventory-interaction.cjs`: six check groups passed in browser and native Electron with separate disposable profiles. Shelf/Grid first-hovered click tracks both cursor directions, Flip and return work, keyboard focus retains live materials, blur returns to static, close cancels pending hover, document visibility and inert-owner guards prevent promotion, and reduced motion stays still. Inventory, Credits and serial state remained unchanged; no console/page errors or renderer network requests.
- The visibility fixture dispatches `visibilitychange` when entering/leaving simulated hidden state, preserving the shared native frame queue lifecycle. Its earlier omission stalled the test queue; this was corrected in the test, without changing the product scheduler. Shelf pointer targets are chosen after settling and verified with hit testing, avoiding clicks through overlapping neighbors.
- Existing four-tier large-inventory regression passed: bounded views, no repeated caption writes, drag/detail/flip/return, far Grid browsing, keyboard End, phone resize and cleanup.
- Existing UI contracts passed: all rarity/theme front values equal the full card, explicit art-only and concealed Secret behavior, preference import/reload, combined panel focus/state, and three repeated surface-close cycles returning views/subscribers to baseline.
- Existing native UI polish journey passed through empty inventory, controls, Settings, Shop wallet, Simple/Advanced Studio and Director exit to detail. Color and monochrome inventory captures were visually inspected. Native sizing requests resolved to the same 1920-wide viewport in this environment; those native captures do not prove the full requested size matrix. Browser phone resizing remains covered by the large-inventory regression.
- Assets, catalog data, release metadata, source parse and whitespace checks passed. Eight Electron service tests passed.

Local evidence is in `qa-output/inventory-regression`, `qa-output/inventory-optimization/qa.json`, `qa-output/ui-polish-contracts/report.json` and `qa-output/ui-polish/report.json`. The captures and JSON stay local rather than entering the shipped game.

## Delivery and limits

The repository completion workflow builds once after integration, verifies packaged contents, runs a disposable packaged Electron smoke check, publishes the versioned Windows assets and checks the release-dispatched website. Delivery manifests and Actions provide those results separately from the source evidence above. No installer is executed and no normal player profile is launched. A real previous-version updater upgrade, physical touch, the full cinematic matrix and broad hardware acceptance remain outside this patch's verified evidence. Existing saves, photo storage, pack schedules, ownership and exact-once purchase/reward paths are unchanged.
