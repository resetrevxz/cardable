# Daily Shop — Stage 1 acceptance

Date: 2026-10-12. Worktree: `D:/CardableV2/Shop`. Branch: `feature/daily-shop`, based on local main `d25f7f0354e3630a73efc9c477e3bb3e640db6ea`. This stage is a local, non-spending showroom prototype. `SHOP-SPEC.md` is the owner-approved contract for Stages 2–4.

## Implemented

- Discoverable Shop entry on the menu; a kit modal owns focus and input, blocks pack charging/cutting, restores the originating control, and pauses the hidden menu pack renderer.
- Authentic Titan Pack exhibit from the registered `titan` pack and its existing skin. Permanent feature copy, inspection, illustrative price and safe practice hold.
- Four explicitly fixed real catalog cards: GeForce RTX 4070, Arc B580, Radeon RX 7900 XTX and GeForce GTX 1080 Ti. Static art-only previews; one full renderer mounted only during focused inspection. Rarity, names, specs and owned counts come from live registries/save. Standard finish is explicit. Preview serial is `PREVIEW` in the renderer and the UI says that a real serial is assigned on purchase.
- Existing Credits shown read-only. A single local-midnight countdown labels the future refresh boundary; offers do **not** rotate in Stage 1. All prices are illustrative fixture quotes, never valuations or purchase-ready quotes.
- The kit's 1.4-second hold pattern supports pointer and keyboard practice. Ordinary click and early release have no completed hold. Completion announces no Credits spent and no item added. There are no wallet, inventory, schema, stock, reward or pack-opening writes in `src/ui/shop.js`.
- Shop-specific responsive styles use the kit tokens, semantic buttons, visible focus, solid Very Low surfaces, monochrome parity and reduced-motion static behavior. The UI gallery links into the showroom.

## State and milestone boundary

The production Stage 1 screen is a labeled preview. It does not pretend an offer was purchased. `Cardable.shop.previewState(state)` is a **developer-only, non-persistent UI sampler** for `normal`, `unaffordable`, `purchased`, `loading`, `error`, `expired`, `disabled`, `underfilled`, and `empty`. It requires `?dev=1`; these states do not claim live transactions or save errors. Stage 2 supplies persisted daily snapshots and real prices. Stage 3 supplies safe buying and entitlement redemption. The optional one-time reveal is deferred until rotation lifecycle exists; access is immediate in Stage 1.

The future transaction adapter should replace `FIXTURES` and `FEATURED_PRICE` in `src/ui/shop.js`, keep the modal/input and renderer boundary, and connect the existing hold control only after the exact-once commit path is ready. The feature is intentionally isolated from Claude's Market worktree.

## Runtime evidence

Run `file:///D:/CardableV2/Shop/index.html` in Chrome, close the tutorial if it is present, then activate **Shop**. For repeatable browser checks, install project dependencies and run `node tools/check-shop-stage1.cjs` with a local Chromium-family browser; `SHOP_BROWSER_PATH` may point to an installed Chrome executable. The check was run in headless local Chrome against the real `file://` game on 2026-10-12, reusing the primary checkout's installed Playwright package through `NODE_PATH`. It passed:

- Four fixture offers and source art; 1920×1080, 1366×768, 1093×768, 1024×768, 768×1024, 683×768, 390×844 and 360×800 without Shop horizontal overflow. The 1093 and 683 widths approximate 125% and 200% zoom of a 1366px desktop viewport.
- Pointer single-click and early-release cancellation, completed pointer and keyboard practice holds with unchanged Credits/inventory, pack input blocked while open, focused card inspection and return, Escape and focus restoration, paused/restored menu pack rendering, and no browser page/console errors.
- Developer UI sampler for all nine named states. Color, monochrome/Very Low and reduced-motion DOM were exercised. The captured mono/Very Low view still shows the same labels and controls.

Visual captures from that run: [desktop](../artifacts/shop-stage1-1366x768.png), [390px phone](../artifacts/shop-stage1-390x844.png), [360px phone](../artifacts/shop-stage1-360x800.png), [mobile offers](../artifacts/shop-stage1-mobile-offers.png), [card inspection](../artifacts/shop-stage1-inspect.png), [mono and Very Low](../artifacts/shop-stage1-mono-very-low.png).

## Remaining acceptance

- Stage 1 does not perform a transaction, rollover, persisted selection, variant offer roll, purchased state, or save-error recovery. Those are the explicit Stage 2–3 gates.
- No physical touch device, screen reader, Electron packaged executable, or native hardware frame profile was exercised in this browser pass. A phone/touch and packaged smoke pass remain for Stage 4. The screenshot review found and fixed tutorial bleed-through and a mobile hero that hid the first offer; the inspected captures above reflect those fixes.
- `npm run deliver:desktop` was attempted from this worktree. The sandboxed process audit could not access CIM; an approved unsandboxed retry reached the delivery ownership check and stopped because this new worktree has no resolved existing preview origin. No installer, `latest.json`, preview replacement, or **Cardable (Latest Build)** shortcut was produced. Choosing an origin or changing the shared desktop preview is outside this isolated Stage 1 handoff.
- Apple's live HIG pages required JavaScript in the text browser. The available official search excerpts and the live Vercel Web Interface Guidelines informed hierarchy, feedback, focus and motion choices; Cardable's own `Designs.MD` and tokens controlled implementation.
