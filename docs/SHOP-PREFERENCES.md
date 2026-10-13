# Atomic Shop preferences

2026-10-13 · isolated `feature/daily-shop`, following `f158235`.

Individual registered `shop…` settings now use the existing state commit boundary before applying their values or notifying presentation. Failure keeps the previous settings object, effective preference and view. Native Shop selects and checkbox return to their saved values; Gameplay listboxes keep their prior selected value. The main Settings feedback distinguishes this rejected Shop change from ordinary session-only settings. Opening Settings with unavailable saving uses a general retry/export message.

Reset Shop settings restores layout, motion, offer order, comparison differences and wishlist marks in one settings metadata commit. The wallet, serial, cards, pack stock, quotes, receipts, collections and all other preferences are retained. Reset failure retains every previous Shop value. Existing full Settings restore/default behavior and ordinary setting fallback remain unchanged. The Shop reuses its adjacent save notice and retry; retry never replays a rejected setting or reset. Pending recovery blocks both actions.

`check-shop-preferences.cjs` passed rejected/successful setting writes, control rollback, retained-state feedback, failed/successful reset, reload, unchanged economic data, other preferences retained, the real Gameplay listbox route, recovery blocking and mobile mono. Shop state is normalized for before/after comparisons so normal reload normalization is distinguished from changes to offers. Visuals were inspected at 1366×768 and 390×844. Existing cinematic and inspection checks passed after the engine change. Syntax, index asset references and whitespace checks passed.

Review [desktop rejection/reset](../artifacts/shop-preferences-error.png) and [mobile mono](../artifacts/shop-preferences-mobile-mono.png). Failed purchases retain their existing exact-once flow; no new purchase writer, timer, network or frame loop is added.

The user's reported saving failure remains unidentified. This pass fixes a verified source issue for individual Shop preferences; it does not claim to resolve the unknown installed/browser failure. Tests use isolated browser contexts and asserted native QA profiles. The earlier native-profile incident and cleanup disposition remain in [SHOP-COMPARE-NATIVE](SHOP-COMPARE-NATIVE.md); no player profile or backup-history cleanup was used during this preference pass.

`npm run dist` completed with publishing disabled. The rebuilt packaged app passed rejected Shop preference control rollback, successful preference retention through restart and native mirror recovery, inspection, held purchase, rejected/repaired mirror retry and no purchase replay in its asserted QA profile. All five changed shipped files match source bytes in app.asar. The unsigned review installer is `dist/Cardable-Setup-1.6.4.exe`, 189869914 bytes, SHA-256 `094208599326B309A7A7BEA74E5590A0B9923E78A0744AE90C83F0FBDD744434`. It was not installed.

The required `npm run deliver:desktop` attempt stopped at unresolved preview origin. No Shop promotion, Latest Build shortcut replacement, cleanup, merge, push or publication occurred. The existing delivery remains in place. Choosing another origin still requires an owner decision with save and separate Studio-photo export guidance.
