# Milestone B — Download, install, play

Implemented after milestone A (5240fee), against the current 4.1.1 source.
Milestones C and D remain pending. The final 4.2.0 version synchronization belongs
to D; this milestone does not claim a 4.2.0 release or public availability.

## Installer

The existing package.json build configuration and electron-builder.config.cjs
remain the source of installer settings. Explicit NSIS options are now oneClick
true, perMachine false, allowToChangeInstallationDirectory false,
createDesktopShortcut "always", createStartMenuShortcut true, runAfterFinish
true, and deleteAppDataOnUninstall false. Offline Windows x64 NSIS + unpacked
targets, com.cardable.game, Cardable product/shortcut names, icons, fonts, assets,
vendor content and the updater/release asset pairing are retained.

Installed electron-builder 26.15.3 schema/options/templates were inspected and
configuration schema validation passed. Its stock one-click installer requests
user execution level; its current HKCU InstallLocation is reused before setup.
Ordinary fresh per-user setup therefore does not require elevation by design.
Protected custom paths and managed Windows policies may still block installation.

The supported include at tools/nsis-installer.nsh adds narrowly scoped hooks;
the stock extraction, identity, registry, upgrades and shortcut machinery remain.
It replaces the builder's default close/kill sequence with process detection,
manual-close/Retry guidance, and a nonzero silent-setup exit when Cardable is
open or process detection fails. Detection is conservatively by executable name,
so an open Latest Build preview also defers setup. No KillProcess, CloseProcess,
taskkill, Stop-Process or force-termination operation is invoked by these hooks.
The same check is used by the new uninstaller.

Before extracting/replacing anything, the installer audits 32/64-bit identity
registry views. All-users registrations, missing older location metadata, or
locations conflicting with the selected registered per-user path stop for manual
review. A registered current per-user custom path is retained. A /D override
cannot choose a new location; --delete-app-data is refused by both installer and
new uninstaller. Normal uninstall keeps player data; the in-game reset is separate.
No registry entries, installed app files, profiles or photos were migrated here.

Read-only local audit found no matching installation/uninstall records in HKCU
or HKLM in either registry view, using the unchanged appId-derived GUID
bf524a7b-fe34-562e-beee-99d287d10b48. Existing checkout previews are not NSIS
installations. This is an audit of this machine, not evidence that every player's
legacy installation will upgrade. Older uninstallers are not rewritten; legacy
upgrade execution and process/file races require separate manual acceptance.

## Player guide and delivery

PLAY.md gives the supplied-installer → install → offline-play flow, normal
shortcuts, save export/import/previous-save recovery and separate Studio Album
photo download guidance. It explains locked upgrades, older installations,
missing collections and unsigned warnings without security bypass instructions.
Developer dependencies and release/signing procedures stay in BUILDING/RELEASING.

The actual prior delivered installer was 323,797,610 bytes (approximately 324 MB,
309 MiB); Windows Authenticode reported NotSigned, with no signer certificate.
The guide's approximate size and unsigned status derive from that artifact;
final delivery size/hash/signature are verified separately before handoff.
desktop-release.json and observed native support both remain unconfigured. No
download URL, publisher, hardware minimum or public release was invented.

Milestone A's command remains the completion route. The NSIS include is now
fingerprinted with the other build inputs; changing it invalidates a pending
same-source resume. Final output identity, installer hash, shortcut and cleanup
are recorded in generated dist/delivery/latest.json and last-good.json. The
stable preview path/entry URL and Latest Build link remain bound to A's location.

## Testing and limits

Testing: installed-builder schema and source/template inspection, read-only
registry/Authenticode/size audit, diff/syntax hygiene, and one isolated source-app
opening. Version 4.1.1/native bridge initialized, Settings opened with Export save,
Import save, Restore previous save and Open saves folder; support was unconfigured
and no renderer console/page errors were observed. Final installer compilation
and delivery hash/config/handoff verification are recorded by the delivery command.

The source session used a fresh temporary --qa-test profile; it was closed
normally and the isolated profile was retained. The normal player's profile was
not changed. Game logic was unchanged, so no checkQol was needed. No old suites,
new test files, screenshots, recordings or profiling were used. No installer was
executed, no app installed/elevated/published, and no running process was killed.

Fresh installation, shortcut creation by NSIS, launch-after-finish, actual
upgrade/uninstall preservation (including photos), legacy custom/all-users
behavior, silent updater execution, real Windows sharing/policy failures,
hardware/browser regression and verified signing remain untested. Build/schema
acceptance is not installation/runtime acceptance. Broader execution is outside
the current restricted policy.

Sources: [electron-builder v26 NSIS options/include/identity](https://www.electron.build/v26/docs/nsis/)
and [the bundled process plugin's documented return codes](https://nsis.sourceforge.io/NsProcess_plugin).
