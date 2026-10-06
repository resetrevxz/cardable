# Validation — Cardable 2.1.0

Executed manually on 2026-10-03. No automatic checks, old suites, executable test files, screenshots or profiling.

- Isolated production data/core sampling: 3,000 seeded draws per brand (12,000 total); every draw satisfied both its catalog brand and exact roster IDs. All 65 NVIDIA, 33 AMD, 4 Snapdragon and 12 Apple roster entries resolve in the catalog. Forced Intel cards were rejected by all four pools.
- 100,000 production schedule resolutions: 25,000 Rare, 71,224 Standard, 944 NVIDIA, 926 AMD, 953 Snapdragon, 953 Apple. Branded rate among 75,000 normal slots: 5.0347%. JSON-cloned save identity produced identical types; the first two openings were Standard.
- One headed file:// Playwright session in `?dev=1&sandbox=1`, using an isolated browser storage context. All four waiting skins loaded official logos, showed 0.16 wrapper opacity, correct slot/type labels and half-refill progress. All four quality presets retained each brand's logo; Very Low was flat and Low disabled sheen.
- Normal Standard three-second Space hold, Enter tear/reveal and keyboard Keep: GeForce GT 610, one Standard instance, $200, stock consumed once, lifetime count advanced once, natural NVIDIA next. Mid-turn showed the real engraved card back and the NVIDIA return shell; temporary shell removed on completion.
- NVIDIA one-shot cancellation and injected failed persistence retained count 153, stock 1, override NVIDIA and no reservation. A successful three-second NVIDIA hold committed an NVIDIA-only Basic card with NVIDIA foil/halves, cleared the override, count 154 and total reward $400.
- Reload recovered that same reserved NVIDIA instance with identical serial/finish and no additional count/reward. Reduced-motion Keep used `none` for both card and wrapper rotation, and kept the second instance once. Expanded provenance read NVIDIA PACK.
- After final presentation cleanup changes, an Apple Basic dev opening/Keep returned to a naturally scheduled NVIDIA waiting pack. Its return shell had waiting state, opacity 0.16 and fluid translated 99.9405%, matching empty stock with refill just started. No shell remained after return.
- Production skin quality function: Medium sheen opacity 1 at 600 ms and 0 at 1,800 ms; High repeated with opacity 1 at 6,600 ms. Independent reflection rank applies to both.
- Existing manual `Cardable.dev.checkPackSchedule()` ran once: all three checks passed in 3.7 ms (100-opening Rare cadence, 3,000 seeded Rare draws and schema-3 count migration).
- Actual browser console/page errors: 0. Runtime HTTP requests: 0. Browser closed after the session.

Limits: presentation was checked through a headed session and DOM/style/state observations; no screenshot critique or physical phone/GPU acceptance is claimed. Existing tutorial/settings/nudge overlays intercepted some pointer attempts; keyboard Keep was used, and tutorial completion was set only in the isolated sandbox for recovery checks. Those unrelated overlays were preserved.
