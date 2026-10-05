Read AGENTS.md, Designs.md, all current project documentation, package configuration, source structure, save/storage code, and any files related to builds, testing, or deployment in full before making changes.



You are migrating the COMPLETE existing Cardable application from its current browser/web application architecture into a production-quality Electron desktop application.



This is NOT a rewrite of Cardable.



The existing HTML/CSS/JavaScript game, visual design, animation system, inventory, card rendering, effects, menus, save system, creator/director tools, audio, input handling, canvas/WebGL features, and every other existing working feature must continue to behave correctly.



The renderer is the existing game.



Electron is the desktop/runtime layer around it.



Do not casually replace existing systems with React, Vue, another UI framework, or a new architecture merely because this is becoming an Electron app.



Do not remove, simplify, fake, or disable difficult existing functionality to make Electron migration easier.



This should ultimately become the canonical desktop version of Cardable.



==================================================

PRIMARY GOALS

==================================================



1\. Migrate Cardable to Electron with ZERO intentional renderer feature regressions.

2\. Produce a proper installable Windows desktop application.

3\. Add production auto-updating through GitHub Releases.

4\. Add Discord Rich Presence.

5\. Add desktop-specific Cardable features where they genuinely improve the experience.

6\. Preserve saves/settings/player data across launches and application updates.

7\. Build an automated release pipeline.

8\. Maintain strong Electron security.

9\. Keep development workflow pleasant and documented.

10\. Test the packaged application, not merely the browser development version.



Work through the THREE MILESTONES below in order.



Do not move to the next milestone until the previous milestone has been run, tested, and stabilized.



==================================================

MILESTONE 1

ELECTRON FOUNDATION + PERFECT WEB COMPATIBILITY

==================================================



First understand exactly how the existing application works.



Inventory:

\- entry HTML files

\- scripts/modules

\- CSS

\- assets

\- fonts

\- audio

\- WebGL/canvas usage

\- fetch/resource loading

\- localStorage

\- IndexedDB

\- save data

\- drag/drop

\- clipboard

\- keyboard shortcuts

\- fullscreen

\- downloads/uploads

\- file inputs

\- workers

\- timers

\- audio context

\- external links

\- any browser APIs

\- any development server assumptions

\- asset path assumptions



Document the compatibility risks before altering architecture.



Then create a clean Electron architecture.



Prefer something conceptually like:



electron/

&#x20;   main.\*

&#x20;   preload.\*

&#x20;   ipc/

&#x20;   updater/

&#x20;   discord/

&#x20;   windows/

&#x20;   native/



Do not unnecessarily mix Electron main-process code into game code.



MAIN PROCESS



Create the application lifecycle.



Handle:

\- app ready

\- main BrowserWindow

\- app activation

\- window-all-closed

\- single-instance behavior

\- graceful shutdown

\- development versus production loading

\- icon configuration

\- version metadata



Security requirements:



\- nodeIntegration: false

\- contextIsolation: true

\- sandbox renderer where compatible

\- no unrestricted require() in renderer

\- never expose ipcRenderer directly

\- expose only narrow validated APIs through contextBridge

\- validate IPC arguments and senders

\- do not disable webSecurity

\- do not allow unrestricted navigation

\- external URLs must be validated before opening

\- no secrets in renderer code

\- no GitHub tokens packaged into the application



Do NOT fix compatibility problems by globally weakening Electron security.



If the existing renderer needs desktop functionality, expose a specific API through preload.



For example conceptually:



window.cardableDesktop.app.getVersion()

window.cardableDesktop.updates.check()

window.cardableDesktop.updates.install()

window.cardableDesktop.discord.setPresence(...)

window.cardableDesktop.system.openExternal(...)

window.cardableDesktop.system.platform()



Do NOT expose generic filesystem access or generic IPC.



RENDERER COMPATIBILITY



The existing Cardable UI should remain visually and behaviorally equivalent.



Test:

\- startup

\- menus

\- transitions

\- animations

\- cards

\- pack opening

\- inventory

\- sorting

\- filters

\- drag/reorder systems

\- creator/director tools

\- game state

\- settings

\- sound

\- music

\- shaders

\- canvas/WebGL

\- mouse

\- keyboard

\- scroll behavior

\- resizing

\- high-DPI monitors

\- fullscreen

\- 16:9

\- ultrawide

\- windowed mode

\- very large resolutions



Do not accept “loads successfully” as proof of compatibility.



Actually interact with the application.



PERSISTENCE



Identify exactly where Cardable currently stores player state.



Ensure:

\- saves survive Electron restarts

\- saves survive application updates

\- settings survive updates

\- inventory survives updates

\- generated cards survive updates

\- user-created content survives updates



Do not accidentally change the renderer origin and silently wipe/localize existing storage.



If the origin or storage architecture needs to change, implement an explicit migration mechanism.



Never store mutable player saves inside packaged application resources.



Store desktop-specific data under Electron's proper user-data location.



DEVELOPMENT EXPERIENCE



Provide scripts such as conceptually:



npm run dev

npm run electron:dev

npm run build

npm run dist

npm run test

npm run test:electron



Keep browser development available if doing so costs little.



Create an Electron development workflow with DevTools available in development but not automatically opened in production.



WINDOW EXPERIENCE



Make the desktop experience feel intentional.



Implement:

\- proper minimum window size

\- sensible default window size

\- remember last window size/position

\- restore safely if monitor configuration changed

\- F11 fullscreen

\- optional Alt+Enter fullscreen if it does not conflict with Cardable

\- clean close behavior



If a custom Cardable titlebar would significantly improve presentation, implement it only AFTER the native-window version is stable.



It must support:

\- drag region

\- minimize

\- maximize

\- restore

\- close

\- double-click maximize

\- maximized-state detection



Do not compromise usability for aesthetics.



MILESTONE 1 ACCEPTANCE CRITERIA



Do not consider Milestone 1 complete until:



1\. Cardable launches through Electron.

2\. The existing game works.

3\. All important HTML/browser functionality has been manually tested.

4\. Saves persist correctly.

5\. No major console errors occur.

6\. Renderer has no unrestricted Node access.

7\. Production build launches.

8\. Development build launches.

9\. Application can be repeatedly opened/closed without corruption.

10\. Existing Cardable visual quality has not regressed.



At completion, write:

docs/electron-milestone-1.md



Include:

\- architecture

\- files added

\- APIs exposed

\- compatibility changes

\- storage decisions

\- tests performed

\- remaining issues



Commit Milestone 1 cleanly before proceeding.



==================================================

MILESTONE 2

UPDATER + GITHUB RELEASES + DISCORD + DESKTOP FEATURES

==================================================



Once Milestone 1 is genuinely stable, add desktop platform features.



\------------------------------------------

AUTO UPDATE

\------------------------------------------



Use electron-builder and electron-updater unless the current project presents a strong documented reason not to.



For Windows use the proper NSIS installer/update target.



Configure GitHub Releases as the update provider.



Implement a real update lifecycle:



\- idle

\- checking

\- update available

\- downloading

\- download progress

\- update downloaded

\- install ready

\- no update available

\- failure

\- retry



Cardable should have its OWN update UI matching its existing design language.



Do not dump ugly native dialogs on top of the game unless dealing with an exceptional fatal condition.



Add:



Settings -> Check for Updates



Show:

\- current version

\- latest version

\- update status

\- download percentage

\- downloaded bytes where available

\- release notes where practical



Support:

\- background update checks

\- manual update checks

\- download progress

\- install and restart

\- postpone until later



Never unexpectedly restart the application while a user is actively using it.



Before restart/install:

\- flush saves

\- persist settings

\- safely close game state



Do not call setFeedURL when electron-builder's generated update configuration already handles the provider.



Do not place GH\_TOKEN, GitHub PATs, repository secrets, Discord secrets, or CI credentials inside the packaged application.



\------------------------------------------

GITHUB RELEASE PIPELINE

\------------------------------------------



Create GitHub Actions release automation.



Design an understandable version workflow.



Use semantic versions:

MAJOR.MINOR.PATCH



Example:

0.1.0

0.1.1

0.2.0



Create a release workflow triggered intentionally, preferably from a version tag such as:



v0.1.0



The pipeline should:



1\. checkout repository

2\. install exact dependencies

3\. run tests

4\. build Cardable

5\. package Electron application

6\. generate updater metadata

7\. create/upload GitHub Release artifacts

8\. upload installer

9\. upload update metadata

10\. fail safely if tests/build fail



Do not publish a broken build merely because packaging succeeded.



Artifacts should use understandable names.



Create documentation explaining exactly how the owner publishes a new version.



Support a release notes/changelog flow.



If source repository privacy makes distributing updates from that repository inappropriate, support a dedicated release repository rather than embedding credentials into users' applications.



\------------------------------------------

DISCORD RICH PRESENCE

\------------------------------------------



Add Discord Rich Presence.



Keep Discord communication in the Electron main process or isolated native/service layer, not ordinary renderer code.



The application must still work perfectly when:

\- Discord is closed

\- Discord is not installed

\- RPC connection fails

\- Discord restarts while Cardable is running

\- network is unavailable



Never block Cardable startup waiting for Discord.



Add graceful reconnect logic.



Presence should dynamically reflect Cardable state where useful.



Examples:



Main Menu

"Browsing the Main Menu"



Opening Packs

"Opening GPU Packs"



Inventory

"Browsing the Collection"



Inspecting Card

"Inspecting their Collection"



Marketplace

"Exploring the Market"



Creator/Director Mode

"Creating in Cardable"



Do not expose private player information.



Add elapsed playtime where appropriate.



Support Rich Presence art/assets using Cardable branding.



Add a user setting:



Discord Rich Presence

\[On / Off]



Default to a sensible choice and persist it.



Turning it off must clear the presence.



\------------------------------------------

DESKTOP-SPECIFIC FEATURES

\------------------------------------------



Implement desktop features that genuinely improve Cardable.



Good candidates include:



\- application version in settings

\- native crash/error logging

\- log directory access from Settings

\- copy diagnostic information

\- single-instance lock

\- restore/focus existing window if launched twice

\- protocol/deep-link architecture such as cardable:// if useful

\- safe external-link handling

\- native notifications only where useful

\- proper application icon everywhere

\- startup splash/loading experience

\- graphics/GPU diagnostics

\- current Electron/Chromium/platform information in diagnostics

\- update channel architecture

\- stable/beta channel support if appropriate

\- safe recovery from corrupted window-position settings

\- graceful handling of GPU/WebGL startup failure



Do NOT turn Cardable into a generic desktop utility.



Every addition should feel like part of Cardable.



\------------------------------------------

LOGGING / DIAGNOSTICS

\------------------------------------------



Add production logging.



Capture:

\- startup

\- Electron version

\- Cardable version

\- updater state

\- Discord connection state

\- fatal errors

\- renderer crashes

\- unhandled exceptions



Do not log:

\- secrets

\- auth credentials

\- private player data unnecessarily



Add a small diagnostics section in settings.



\------------------------------------------

MILESTONE 2 ACCEPTANCE CRITERIA

\------------------------------------------



1\. Installable Windows build works.

2\. GitHub release artifacts build automatically.

3\. A release can be published from CI.

4\. Installed build can detect a newer GitHub release.

5\. Update downloads.

6\. progress UI works.

7\. application installs the update after confirmation.

8\. save data survives the update.

9\. Discord presence connects.

10\. Discord absence does not break the application.

11\. disabling RPC actually clears it.

12\. single-instance behavior works.

13\. logs are usable.

14\. no tokens/secrets are shipped.



Perform a REAL updater test using two versions.



For example:

install version A

publish/use version B

launch A

detect B

download B

install/restart

verify application reports B

verify Cardable data still exists



Do not mark the updater complete without testing an actual version-to-version update.



Write:

docs/electron-milestone-2.md



Commit Milestone 2 cleanly.



==================================================

MILESTONE 3

PRODUCTION HARDENING + RELEASE QUALITY

==================================================



Now treat Cardable as a real desktop game preparing for distribution.



Do NOT spend this milestone adding random features.



Spend it making everything reliable.



\------------------------------------------

FULL REGRESSION

\------------------------------------------



Test the entire Cardable experience in the PACKAGED build.



Not merely localhost.

Not merely npm run dev.



Run through all major existing features.



Create a regression checklist covering the actual game.



Compare browser and Electron behavior where useful.



Any HTML feature that worked before the migration and broke afterward is a migration bug.



Fix it.



\------------------------------------------

AUTOMATED TESTING

\------------------------------------------



Where practical add Electron-aware tests.



Use appropriate tooling for:

\- launch smoke tests

\- main/preload API tests

\- persistence

\- updater state handling

\- settings

\- app lifecycle

\- window restoration

\- single-instance behavior

\- Discord failure handling



Retain existing Cardable tests.



Do not delete tests merely because Electron made them inconvenient.



\------------------------------------------

PERFORMANCE

\------------------------------------------



Profile:

\- startup time

\- renderer FPS

\- memory

\- GPU usage

\- animation smoothness

\- card-heavy inventory

\- pack animations

\- creator/director tools

\- resizing

\- fullscreen transitions



Electron migration must not introduce obvious input lag or animation stutter.



Keep hardware acceleration enabled unless a demonstrated compatibility fallback is required.



Do not apply random Chromium flags based on folklore.



\------------------------------------------

RELEASE SAFETY

\------------------------------------------



Verify:

\- production source paths

\- packaged assets

\- ASAR behavior

\- updater metadata

\- version values

\- icons

\- application name

\- uninstall/reinstall behavior

\- update behavior

\- log paths

\- user-data paths

\- executable naming

\- shortcuts

\- Start Menu entry

\- installer branding

\- publisher metadata where available



No development-only absolute paths may remain.



No dependency should assume the developer's machine.



No D:\\Cardable or similar hardcoded path.



\------------------------------------------

SECURITY REVIEW

\------------------------------------------



Review Electron security again.



Ensure:

\- contextIsolation remains enabled

\- nodeIntegration remains disabled

\- sandbox is used where compatible

\- preload bridge remains narrow

\- IPC validates arguments

\- external navigation is restricted

\- window creation is restricted

\- arbitrary renderer code cannot access filesystem/process APIs

\- CSP is sensible

\- no secrets exist in renderer bundles

\- dependency vulnerabilities are reviewed



Do not “solve” issues by setting dangerous global Electron options.



\------------------------------------------

FINAL RELEASE UX

\------------------------------------------



Polish:

\- splash/startup

\- update UI

\- errors

\- Discord setting

\- diagnostics

\- version display

\- installer

\- application icon

\- taskbar icon

\- startup transitions

\- closing/relaunching behavior



Everything should visually belong to Cardable.



Do not leave Electron-looking placeholder UI.



\------------------------------------------

FINAL DOCUMENTATION

\------------------------------------------



Create:



docs/ELECTRON.md

docs/RELEASING.md

docs/UPDATES.md

docs/DISCORD\_RPC.md

docs/BUILDING.md



RELEASING.md should give the owner a very short release procedure.



Something conceptually like:



1\. update version

2\. update changelog

3\. commit

4\. tag vX.Y.Z

5\. push tag

6\. CI validates/builds/publishes

7\. test updater from previous version



Adapt this to the actual implementation.



Also document required repository secrets WITHOUT inserting their values.



\------------------------------------------

FINAL TORTURE TEST

\------------------------------------------



Before finishing:



1\. clean clone/install dependencies

2\. build from scratch

3\. launch development build

4\. launch packaged build

5\. exercise core Cardable features

6\. test persistence

7\. test Discord unavailable

8\. test Discord available

9\. test update check

10\. perform a real update between versions

11\. inspect console/main-process logs

12\. fix every reproducible serious issue

13\. repeat packaged smoke test



Only then consider the migration finished.



FINAL REPORT



Report:



\- Electron architecture

\- version/build system

\- updater architecture

\- GitHub Release workflow

\- Discord integration

\- desktop-only additions

\- storage migration/persistence

\- security decisions

\- test results

\- packaged build location

\- required actions from me

\- anything that cannot be automated



Do not merely tell me how to implement any of this.



Implement it, run it, test it, iterate on failures, and leave the repository in a production-ready state.

