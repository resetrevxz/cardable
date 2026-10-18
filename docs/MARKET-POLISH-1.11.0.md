# The same Cardable (1.11.0)

The owner's brief: the Market looked unlike the rest of Cardable, was cramped, wordy and "AI-like", the Shop and Market buttons in the main menu were broken, Home/Browse/Auctions should be icons, the top bar should hold an area for your trades and outbids (like a dynamic island), switching between Global and Simulation moved the top bar and dropped the Day clock, rarer cards should look better, and buying should animate. This page records what was changed and why, against Designs.MD, Apple's Human Interface Guidelines and Vercel's Web Interface Guidelines. The rules themselves live in Designs section 12 ("The same Cardable").

## What was wrong, measured

- Main menu: the Shop button measured 36 × 38 px with a 10 px radius; Market, Help and Settings are 44 px circles. The gaps between them were 62, 68 and 12 px. Now all four are 44 px circles, 12 px apart (`check-market-polish-browser` step 1).
- Header: in Global the Home tab disappeared, the Day clock vanished and the realm switch slid right. Now every slot is shared (step 2 compares the bounding box of every header control in both realms, within 1 px).
- Copy: section blurbs that restated the heading ("Cards worth a look right now, ranked for you rather than by price."), a disclaimer under every heading, coach lines of three sentences, and "Simulation" as a product word. Shortened, moved into tooltips, or removed; "Simulation" is "Local", "Stocks" is "Prices".

## Decisions

| Area | Decision | Rule it follows |
|---|---|---|
| Menu | One 44 px round glass family; `.shop-entry` takes the `.mk-hud` glass | Designs 1.2 and 4 (one surface language, 44 px targets); HIG consistency |
| Header | Mark, search, island, realm, wallet, close; one width per slot; the wallet is 176 px so the island never shifts | Designs 1.6 (precision); HIG predictability |
| Dock | Icons only (22 px, 1.5 px strokes), names in tooltips and accessible names, a sliding highlight (`transform` only) | Designs 8 (an icon always has an accessible name or tooltip); Vercel (animate transform and opacity) |
| Island | A button with `aria-expanded`; reads `activitySync()`; owns no timer; the pill breathes once when the top item changes, one ring if it needs you | Designs 3 and 10; Vercel (no idle loops, honour reduced motion, `aria-live` for updates) |
| Rarity | `--mk-rgb` from the rarity's own opening colour, `--mk-tier` from its tier; Basic and Common plain, rim and glow grow, foil from Super Rare, prismatic edge from Legendary; Mono drops the hue | Designs "authored colour identities" (rarity colours stay data-defined) |
| Settle | The card flies where you pressed (or out of the island) into Portfolio; a sale sends Credits to the wallet; one element for a card, at most eight coins, fourteen rays; all removed at the end | Designs 3 (one-shot, interruptible), AGENTS (no clock per card) |
| Space | Pages 28 px from the top, 24 px between tiles, tiles 26 px radius, panels 24 px, 56 px between Home sections | Designs 2 (4 px grid, concentric radii) |

## Checks actually run

- `tools/check-market-polish-browser.cjs`: eight steps with a real mouse and keyboard in headless Chromium (menu geometry; header stability across realms; dock names and tooltip; island states, panel, Escape and focus return; rarity treatments by tier; a settled purchase flies and cleans up; Reduced motion; a 390 px phone).
- `tools/check-market-hover-browser.cjs`, the sim, home, online, analytics, trading, social, economy, acceptance (including the Beta badge at every width and the UI sweep) and Cloudflare suites, updated where wording or structure changed on purpose.
- Screenshots of every main page at 1440 × 900, the dock at 2×, and the Market at 390 × 844 (qa-output, not committed).

## Not verified

- A real mouse and eyes on real hardware: all motion was checked by element state and screenshots, not by watching it run at 60 fps.
- A screen reader. The dock, island and bottom bar have accessible names and roles; nobody used them with assistive technology.
- A beginner. The copy is shorter and the structure calmer; no new player was observed.
- Windows high-contrast mode and the monochrome theme at every width (the rarity treatments neutralise in Mono; the state is asserted in CSS, not photographed everywhere).
