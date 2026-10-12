# CARDABLE SHOP — Master Specification
## Codex parallel worktree feature: `D:/CardableV2/Shop`
**Status:** Four Shop milestones implemented on the isolated `feature/daily-shop` branch; Stage 4 acceptance and delivery limits are recorded in [SHOP-ACCEPTANCE](SHOP-ACCEPTANCE.md). Owner-approved integration remains separate. **Product:** A premium, entirely local Daily Shop for Cardable. **Reference date:** October 12, 2026. **Source of truth:** The actual current local repo and its latest `AGENTS.md` / `Designs.MD` take precedence over stale code examples here. No cloud dependency.

### 0. Non-negotiable owner decisions
1. Work in a **separate Git worktree at `D:/CardableV2/Shop`**, derived from the real checkout presently documented as `D:/CardableV2/cardable-spec/cardable`. Inspect `git worktree list --porcelain`, current branch/status and destination existence first; create a unique feature branch. Never reset, clean, delete, overwrite or merge another worktree. Keep Claude's concurrent Market work isolated.
2. Daily Shop is fully **local**, without accounts, services, cloud database, remote price calls, marketplace listings, bots or global transactions. Must work in offline `file://` source play and packaged Electron.
3. A **permanent featured Titan Pack** remains in the Shop until a later *game content update* changes it. There is no weekly featured rotation. The displayed theme is **TITAN: FIRST CONTACT** at launch.
4. Exactly **four distinct randomly selected catalog card offers** refresh every day. They are independent of the Titan featured theme. Do not force Titan cards, wishlist items, specific tiers or guaranteed good pulls into the four slots.
5. Choose daily cards with **rarity-weighted selection**, then uniform selection among eligible cards of that rarity, without replacement. Avoid equal chance per card across the whole catalog. The owner's phrase “fully randomized” refers to no thematic restrictions, not uniform rarity rates. Shop eligibility must respect intentionally locked/unreleased catalog definitions; include all legitimately shop-eligible published GPU cards.
6. **Purchasing requires press-and-hold confirmation** for BOTH individual cards and Titan Packs. Pointer, keyboard, touch and reduced-motion all supported. No ordinary single-click purchase. Releasing early cancels with no charge. Store and inventory commit must be exact-once.
7. One purchase per daily offer slot per rotation; mark it Purchased/Owned. An owned duplicate elsewhere is still eligible as a future offer. No duplicate `cardId` within one day's four cards. Featured pack is independently purchasable repeatedly while available, subject to Credits and safely managed pending-open entitlements.
8. The Shop uses existing **Credits** and the same *local* inventory. No second Shop wallet, premium currency, real payments or network requests. Price must feel premium but reasonable, ideally above a normal local quick-sell value to discourage risk-free money loops. Exact price formula is a data-tunable provisional implementation, not owner-approved final numbers.
9. The shop is about **quality above quantity**, especially outstanding visual craft. Build just one coherent, complete premium showroom, not a dashboard of unrelated features. Iterate each milestone's first pass until its specific acceptance criteria are met.
10. Four sequential Codex milestones; Stage 1 establishes the isolated worktree and spec. Subsequent stages reuse it. Keep code isolated through Stages 1–4. **Do not push main, merge branches, publish releases, deploy, run release:github or alter Claude's worktree** as part of these staged tasks. Prepare an explicit integration handoff; public release is a separate owner-approved action. This scoped direction overrides general automatic-release steps during worktree development.

### 1. Actual Cardable architecture to respect
As inspected in `resetrevxz/cardable` on October 12, 2026:
- Current published repo describes v1.5.6. Root guidance: `AGENTS.md`; design source: `Designs.MD`; roadmap: `docs/ROADMAP.md`; architecture: `docs/ARCHITECTURE.md`; inventory: `docs/06-INVENTORY.md`; rules: `docs/01-GAME-RULES.md`; settings: `src/data/settings-schema.js`.
- Classic scripts boot in defined order through `index.html` and `window.Cardable`; packaged Electron shares the same renderer. Do NOT convert the game to ES modules/React, add runtime CDN packages or assume a network/API is present.
- `src/ui/kit/tokens.css`, `src/styles/tokens.css` and `Cardable.ui` components are canonical. Current font stack: **Inter** and **JetBrains Mono**. Dark ink surfaces, limited purposeful color, top-left physical light, layered shadows, subtle borders, meaningful motion, built-in reduced motion, mono theme, Very Low to Very High performance policies.
- Existing wallet/ownership/reveal flow is commit-safe; a successful store purchase must not bypass save/backup/recovery protections or mint duplicate card serials. Existing card copies have immutable instance IDs, serials, `pulledAt`, optional variant/frame skin, and provenance. Stacks group copies visually; they do not merge instances.
- `src/data/titan-pack.js` defines actual Titan Pack `id:'titan'`, 17 curated halo-card IDs, `skin:'titan'`, `opening:'shroudDial'`, `swapIn:'monolithDrop'` and custom vault art. **Reuse the authentic Titan Pack and its real pack-opening mechanics.** Do not remake a fake pack or infer the old `src/data/packs.js` is the whole registry.
- Ordinary packs regenerate every two hours, at most four stored; normal opening commits stock/pull/reward/pending reveal. **Purchased packs must not consume ordinary ready stock, modify the scheduled Rare cadence, silently grant a phantom 200 Credits or duplicate their pull on reload.** Existing `src/config.js` at inspection has `currency.packOpenReward:200`; Claude Market plans to remove that payout, so isolate this logic carefully.
- Source of truth for card identity is registries and current live catalog, never made-up placeholder GPUs. The old rarity `marketValueUsd` property is marked RESERVED. Do not silently repurpose it to price the Shop.
- Studio/Director photos live in separate IndexedDB blobs. This shop does not need remote images and must not break that storage.
- Current AGENTS.md asks for precise stage reports with headings **Done**, **Skipped or changed**, **Look at**, **Open questions**. Preserve audit/delivery conventions that do not conflict with feature-worktree isolation.

### 2. Design mission: a precious-objects showroom
The Shop should feel like Cardable commissioned a world-class product design team: an elegant dark collectible showroom, tangible card materials, exceptional typographic rhythm and a restrained cinematic Titan Pack hero. Combine **Apple HIG's hierarchy, clarity, restraint, feedback and material depth** with **Vercel's precise interaction and accessibility workmanship**. Borrow the concept of four daily offerings from Valorant, NOT Valorant's exact appearance, intellectual property or text.

**Composition / user journey**
- Entry: a clearly discoverable **Shop** action in the existing main screen/navigation or command palette, not competition with the main pack. One click opens a well-integrated shop screen; exiting returns focus and context.
- Header: small `SHOP / CARDABLE`, clear local Credits, next refresh time, Shop Help and close/back. A subtle date indicator, not an enormous floating dashboard.
- Feature: editorial hero surface for **TITAN: FIRST CONTACT**. Real 3D / authentic skin preview of Titan Pack, sculpted brushed titanium / machined-metal frame, readable concise series text, one obvious **Inspect** and one **Hold to purchase** action. Price is consistently visible and aligned. Avoid excessive fake lens flares and dense decorative cards.
- The fold: immediately visible heading `Your daily offers` + reset countdown and four retail slots. At desktop widths, four generous single-row portrait tiles if physical card art is readable; at narrower widths use intentional 2×2, and on narrow phones use well-spaced stacked/two-column layouts as practical. No tiny unreadable GPUs.
- Each offer: full real card preview/thumbnail, name, rarity, variant when present, bold Credits price, distinct visual states (ready, unaffordable, purchased, expired/replaced, loading), favorite/wishlist/owned indicators when available. Preview affordance opens real existing Inspect/details through safe APIs. Price and artwork do not visually fight each other.
- On first visit of a new rotation, the four slots may be briefly concealed and flip/reveal using restrained physical choreography. `Reveal all` or instant reveal is allowed. Never hide prices after reveal or force repeated unskippable sequences.
- Focused purchase: select a real offer, inspect it, see owned copy count and full details, inspect exact variant and price, then hold to commit. Completed acquisition has a short celebratory transition to the collection, durable receipt and optional `View in inventory` link.
- **Do not add** a second marketplace, player-to-player trading, price speculation screen, social feeds, comments, online accounts, cash payments or fake stock numbers.

**Visual design recipe**
- Primary palette: Cardable existing near-black inks `#08080A`, `#0E0E11`, `#141418`, `#1B1B20`; text `#F5F5F7`, muted `#A1A1A6`; actual Cardable theme accents from tokens. Titan feature alone gets silver, graphite and subdued cold-steel highlights sourced from the real pack skin. No neon-purple AI gradients or generic SaaS widgets.
- Borrow Cards/kit font sizes, UI primitives, tokens, 4px spacing cadence, concentric border radii and subtle layered shadows. Use Inter for labels and JetBrains Mono with tabular numerals for Credits/countdown/serials.
- Give hero card/pack art ample breathing room; one dominant lighting direction from upper left; let local artwork, not gratuitous background glass, supply color. Real materials: fine edge highlights, brushed metal rim, slight grounding shadow, restrained perspective. Crisp text on solid ink.
- Hover: a calm 1–4px lift, slightly stronger edge, pointer-responsive glare ONLY on focused card and allowed graphics tiers. No heavy animations on all four tiles. Motion is purposeful, cancelable, short; prioritize compositor-only transform/opacity and no per-card RAF loops.
- Cards are accessible DOM controls with real labels and focus. Use static front thumbnails for all four Shop offers; mount full effects for the focused card only, in accordance with Cardable GPU budget.
- Maintain Color and Monochrome parity, Dark theme, Very Low/Low solid surfaces, High/VHigh focused premium material, reduced motion, keyboard/touch, safe focus return and measured responsive constraints.

**Concrete Apple/Vercel references** (implementation agents should read these live if browsing is available and inspect Cardable Designs.MD FIRST):
- https://developer.apple.com/design/human-interface-guidelines/design-principles
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/feedback
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://vercel.com/design/guidelines
Principles: progressive disclosure, logical visual hierarchy, precision/alignment, clear feedback and escape routes, semantic native controls, unobscured `:focus-visible`, ≥44px coarse pointer targets, non-color-only states, accurate tabular numbers, no UI flashes, no `transition:all`, no always-running decorative animation, accessible statuses, no horizontal overflow, reduced-motion equivalents, meaningful copy.

### 3. Rotation rules, immutable daily offer snapshot
- Exactly four card offers per local calendar-day `YYYY-MM-DD` (local midnight is the reset boundary; document date/clock handling). The permanent Titan feature does not rotate with the daily cards.
- Derive or persist a private player seed, day key, catalog/rarity eligibility version and immutable offer IDs + card IDs + variants + quoted integer prices. On each date, calculate the day's offers once and **persist the actual snapshot**; don't silently reroll on open/close, import, graphics changes or UI refresh. Save recovery and version migration must preserve the snapshot.
- An offer is purchased once or not; a purchased slot remains visibly purchased until the next day. No manual refresh, rerolls with Credits, or paid randomizing.
- Weighted rarity procedure: collect catalog definitions eligible for Shop; group by canonical rarity; filter invalid/unreleased/explicitly excluded definitions, use existing registry chances as initial relative weights for remaining populated eligible tiers, normalize, choose a tier, choose uniformly among still available cards, remove picked card ID, repeat four times. Recompute if tier is exhausted. Do not guarantee special tiers, impose Titan bias or select same ID twice. Handle too-small catalogs explicitly rather than looping forever.
- Preview variants: default to Cardable's existing variant registry/gate if compatible and legally shop-eligible, with one immutable preview roll per offer; do not roll a second variant or serial during purchase. If frame skins require special rules, reuse their registry or omit if unsupported; never invent inaccessible combinations. Disclose normal vs variant clearly. Preview serial is 'Assigned on purchase' until minted.
- A rotation changes with the real date even when the application has been closed, on next launch/focus/open. It does not run a market simulation or require a background timer. A stale open screen reconciles on day rollover. Finish any in-flight committed purchase safely at boundary, then refresh. Handle clock reversal and date/timezone changes deterministically; this is offline software, not DRM/anti-cheat.
- Use existing save architecture and opt-in optional fields. Keep sidecar copy if necessary. No destructive save schema migration, no mutation on mere data import until normalization validates. Export/import behavior and data reset must be documented and tested. No private account info or network telemetry.

### 4. Prices, economy and purchase contract
- Shared local Credits only. No premium currency. `src/data/economy.js` and future market's valuation adapter may evolve independently; create a data-driven Shop pricing interface rather than a hard-coded copy of the future Market.
- Default shop pricing derived from a **local, stable reference valuation**: rarity baseline × per-card rarity/collectibility modifier × variant/skin multiplier × shop convenience premium. Use positive finite integer Credits with explicit clamps and rounding. Stable quote frozen in the day's snapshot. Do NOT treat `marketValueUsd` (currently RESERVED) as current market price, and do NOT invent live Average Value, volume, or trend information.
- If a compatible real local market estimate becomes available later, an adapter may show honest 'Estimated value'; absent that use 'Reference value' / 'Shop price'. Never label placeholders as recent sales or current market data.
- Price tiers should preserve rarity aspiration while allowing attainable early purchases through ordinary economy; expose data-only economy tuning and test scenarios before choosing exact numbers. No guaranteed profitable roundtrip against local Quick Sell. Future Claude Market may revise the Credits generation model; do not unilaterally duplicate or override its wallet implementation.
- **Purchase holding:** recommended ~1.4 seconds, subject to UI feel, reusing Cardable's existing confirmation/progress infrastructure. On pointer/touch press or keyboard Space/Enter on focused purchase control, initiate hold and visibly show progress, total price and item. Pointer up/cancel/leave as appropriate, window blur, Escape, dialog close or insufficient funds cancels with zero side effects. Prevent repeat keydown or double clicks. No click shortcut to bypass. Reduced motion uses straightforward non-animated or calm fill. Purchase processes once after full hold, never on press start.
- **Transaction:** validate offer/date/price/not-bought/credits/inventory capacity and source; precompute immutable acquired instance and proper serial/variant/skin/provenance; atomically persist Credits debit + new ownership OR pending purchased pack entitlement + purchased slot + receipt; adopt new state only after successful durable write. On write failure, reject with explanatory recovery and **no debit, ownership or consumed slot**. Retries use an idempotency/transaction ID. Preserve previous save and pending reveals.
- For direct card purchases, use real instance identity and metadata, preserve collections/favorites, no artificial pack-open effects or achievements/pack count unless existing rules explicitly require them.
- For Titan Pack purchases, create a durable *purchased pack entitlement* separate from natural regenerated stock; reuse the authentic Titan `shroudDial` pack opening through a safe entry path. Consuming an entitlement must be exact-once across crash, reload, skip, re-entry; do not decrement natural stock, alter every-fourth Rare schedule, or issue regular opening rewards. Bought pack rolls one real valid Titan pool result at the appropriate commit boundary and preserves existing Keep/reveal recovery. The outcome does not roll again on reload.
- Featured pack remains available until a later content update replaces it. Do not add a weekly timer or automatically remove it. It can be purchased repeatedly if Credits permit; if a cap is later desired, make it a separately approved change.
- Explicit state for closed/purchased card after rotation, unavailable funds, sold slot, unfinished purchased-pack opening, storage full, invalid metadata, restore/import conflicts and duplicates.

### 5. QoL and settings without feature bloat
- Countdown to local midnight, accurately reconciled on visibility/focus; no high-frequency per-slot timers.
- Show player's actual Credits, cost, owned copy count, eligible rarity/variant info, source pack provenance and useful tooltips.
- Accessible Help: two-line explanation of four rotating slots, featured pack, hold-to-buy and refresh behavior.
- Inventory handoff after purchase with selection of new instance; preserve existing sheet scroll/focus/filter where feasible.
- Optional purchase receipt/history (bounded durable ledger), acquired card zoom/flip, clear Owned/Purchased/Sold state, optional compact/reduced motion preferences. No fabricated marketing banners or social signals.
- Shop Settings integrated into existing settings schema **only where necessary** (e.g., reveal intro toggle/skip, purchase confirmation duration if product owners later want it). Do not make dozens of settings or a separate enormous Shop Settings panel.
- All data-only rules may be evolved by future updates; keep simple defaults well documented. No audio work in this feature (existing game audio disabled).

### 6. Performance, quality and accessibility gates
- Respect `Very Low`, `Low`, `Medium`, `High`, optional hardware-gated `Very High`, independently customized controls and `prefers-reduced-motion`.
- No new always-running frame loop for the Shop. Shared scheduler only when UI needs it; hide/unmount release GL/canvas/listener resources. Static thumbnails in browsing. Full effects on focused card only.
- Measure and inspect screenshots/interactions at approx 1920×1080, 1366×768, 1024×768, 768×1024, 390×844 and 360×800. Validate 125–200% zoom, long card names, mono, Very Low and reduced motion. Preserve normal scrolling and prevent cut-off controls/overlays.
- Keyboard-only full purchase journey and close/focus restore, clear success/error announced politely to assistive tech, visible labels on icon controls, no hover-only info, ≥44px coarse pointer essential targets.
- Hold under press-release, pointer cancel, blur, Escape, key repeats, tab switch, zero Credits, one Credit short, save throw, reload mid-hold, completed purchase reload and day rollover; check exact-once money+ownership.
- Data tests for deterministic daily rotation, rarity weights, no duplicated card in day, no guaranteed rarity, variant persistence, clock reversal, timezone offset, card removal from catalog, imported old saves, price arithmetic and rounding, priced pack EV sanity.
- Existing card openings, natural stock, cadence, Studio, Settings, Data backups/recovery/import/export and desktop build must continue working.

### 7. Four sequential milestone gates
**Stage 1: Premium Shop UI and interaction prototype.** Build one exceptional shop screen, authentic Titan hero, four offer slots, real catalog previews, inspect/close/header/countdown states, interactive but non-mutating purchase prototype, accessibility/performance foundations. No real debit/purchase until Stage 3.

**Stage 2: Daily rarity-weighted rotation and persisted offers.** Deterministic local day snapshots, fully random catalog-wide weighted rarity, immutable offers/variants/quotes, owned/slot state, rollover, data migration and pure pricing model. Shop remains non-spending until Stage 3.

**Stage 3: Hold-to-buy, Credits and authentic Titan redemption.** Exact-once local transactions, direct card granting, purchased pack entitlement and authentic opening without natural-stock contamination, receipts and inventory integration, failure/recovery tests.

**Stage 4: Deep design polish, QA and integration handoff.** Human-feeling motion/craft, refinements of contrast and typography and responsiveness, aggressive regression suite and runtime inspection, code review, bounded resource budgets, real packaged smoke checks when feasible, Market interoperability documentation. No deployment/merge/publication in this parallel phase.

**Do not advance a milestone until it satisfies its own visual, accessibility, functionality, safety and performance acceptance.** Report what was observed, not imagined. Implement all four in the same feature branch with focused commits, while preserving unrelated changes.

### 8. Integration boundaries with Claude Market
- Feature branches may both touch Credits, inventory, save schema, UI kit and pack controls. Do not touch Claude's branch or resolve conflicts by blindly overwriting Market work. Implement Shop as namespaced modules/adapters with small deliberate hooks; produce a file-by-file integration map and suggested merge order at Stage 4.
- **Local Shop purchases remain local**, not automatically tradeable online. Market's one-time legacy collection migration is a separate bounded action with explicit eligibility. Do not enable repeat imports of newly purchased local cards as an online minting exploit.
- The future Market economy removes the older automatic $200 per pack open. Shop must not rely on it and must avoid silently changing existing source-play economy in a concurrent branch. Document the eventual wallet-service reconciliation.
- The local Market simulator and Daily Shop may eventually share local Credits and collection, but Shop does not run or reset that simulator. Featured packs and daily offers have no global bidding or market-price manipulation hooks.
- Do not invent cloud authentication, networking, or bind player accounts. The Shop must be complete without Claude's Market ever landing.

### 9. Delivery report contract for EACH milestone
Use exactly these headings, compatible with current AGENTS.md:
**Done** — changes, owned commits, observable behavior, choice of defaults.
**Skipped or changed** — requested scope deferred, what was not changed and why.
**Look at** — exact screens/files/screenshots or test outputs, what was truly verified across quality/modes, any packaged build limitations.
**Open questions** — issues for the next stage or Market integration and impact.

### 10. Definition of excellent
If the UI resembles a generic subscription storefront, contains 4 empty gradient blocks, consumes Credits twice, fabricates discounts, forgets a purchase after restart, permits click-to-buy bypass, steals pack stock, or breaks offline play, the milestone is **not finished**. A visually gorgeous front end is not enough without correct states and safe transactions; robust code is not enough without excellent Cardable-native design.

### Stage 4 disposition
The Shop's local browser acceptance, unresolved desktop packaging boundary, and exact Market merge decisions are in [SHOP-STAGE-4](SHOP-STAGE-4.md), [SHOP-ACCEPTANCE](SHOP-ACCEPTANCE.md), and [SHOP-MARKET-INTEGRATION](SHOP-MARKET-INTEGRATION.md). The provisional price policy stays in `src/data/shop.js`; no Market estimate or future resale value is claimed. A packaged Electron launch and owner-approved economy reconciliation remain integration gates.
