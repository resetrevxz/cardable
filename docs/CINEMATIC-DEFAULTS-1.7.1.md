# Cinematic defaults — 1.7.1

The owner requested cinematic new-player settings immediately after the Shop release. A clean 1.7.0 browser launch actually had Full cutscenes, Medium graphics, Safe strobing and reduced motion Off. Its Cinematic quick setup did not clear reduced motion, play-once or per-rarity routes; those saved choices could still suppress the intended presentation.

New saves now use High for the graphics preset and all ten independent graphics controls, Full cutscenes, Full strobing, normal reveal speed, reduced motion Off and disabled skip-all/play-once. Very High remains opt-in. The Windows installer’s explicit reduced-motion opt-in still seeds that player’s fresh save; existing preferences stay as chosen on load.

The Cinematic setup now restores reduced motion Off, Full cutscenes/strobing, every registered rarity’s inherited route, disabled skip-all/play-once, normal reveal speed, full variant animation, pack transitions and cinematic Shop motion. The existing setup preview lists changes before Apply and offers Undo. Existing saves can use Settings → Quick setups → Cinematic → Apply. Cards, Credits, serials, stock and Shop purchases are not part of the setup.

Direct Safe-to-Full selection retains its hold. Secret retains its pre-roll choice and eight-second Safe fallback. The final-output limiter, emergency brake, reduced-motion/light routes and quality budgets are retained. This instruction changes the default profile, not the authored films. Market stays disabled and its branch remains excluded.

## Verification

A disposable browser context verified the real fresh state, all ten High controls and all twelve registered rarity routes. It opened a forced Rare through the normal reservation/cut/cinematic/reveal/Keep flow without changing cinematic settings. The opening remained in its full cinematic beyond the three-second calm route, then kept the exact card and retained it after reload.

A second fixture saved Very Low graphics, reduced motion On, cutscenes Off, Safe strobing, skip-all, play-once and individual rarity skips. Reload retained those explicit choices. The actual Cinematic quick-setup tile and reviewed Apply restored the complete presentation, persisted through reload and retained the same card and Credits. There were no renderer errors. Desktop color cinematic and mobile monochrome Settings captures were reviewed. Data/resource/version validation, syntax and website generation passed.

Local delivery and the public Windows workflow validate their own packaged artifacts. Release completion additionally requires the asserted disposable native profile, successful Actions, published checksums and live download links; those results are recorded in the delivery manifest and release audit. Installer execution, a live updater upgrade and a broad physical-device matrix remain unverified.
