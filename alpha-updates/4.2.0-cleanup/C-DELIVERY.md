# Milestone C — First run, help and recovery

Implemented after milestone B (14518e2), against 4.1.1. A/B delivery and installer
behavior remain. D (documentation/archive audit and final version synchronization)
is pending; this milestone does not claim a 4.2.0 release.

## Implemented

- Existing welcome now offers Start playing and optional Import browser save.
  Three lines explain local progress, desktop/previous-save backups and separate
  Studio-photo downloads. Export save and Open saves folder reuse existing
  settings controls and secure native handlers. The forced import step and first
  run changelog interruption were removed; existing welcome/version keys govern
  returning users. Import still uses preview and confirmation.
- Locally bundled src/data/player-help.js supplies How to play / Desktop help
  inside the existing friendly surface, Settings About and command palette. It
  covers pack/reveal/Keep, Inventory/History, registered shortcuts, export/restore,
  photos, quality/Safe mode, installation, updates and recovery. Browser help
  remains useful and hides native folders, diagnostics, restart and install-only
  controls/content. No fetch, external link, dev workspace, new palette or library
  is needed to read it. Settings focus returns to the help button on close.
- Existing monochrome tokens, modal focus handling, quality-aware fades and
  reduced-motion class are reused. Help adds no canvas, particle or animation
  loop and does not change saved graphics choices. Safe-mode help explains the
  temporary Low/hardware-acceleration override. Release/reporting configuration
  remains absent; Settings disables the unavailable report action and explains
  how to obtain the locally supplied installer.
- Recovery retains unreadable local originals (including older corrupt copies)
  and pauses autosave/pack commits until an explicitly confirmed import, restore
  or new collection. The existing reset hold remains the new-collection
  confirmation. A recovery import does not overwrite the known previous-save
  backup with its temporary empty state. No save/settings schema changed.
- Existing native recovery reads retain exact original bytes under
  userData/saves/recovery/original-<sha256>.json, separately from rolling backup
  pruning. Identical reads deduplicate; failed preservation is retried before
  replacing the mirror. Native read/write failures get plain recovery/export
  guidance. Closing a paused recovery leaves the original data in place.
- Renderer boot failures expose original-save download and existing recovery
  folders/Safe-mode actions, with persistence paused. Missing game-file load
  failures expose a native recovery dialog with folders and normal close.
  No automatic restart, reset, profile deletion or public submission was added.

## Evidence and limits

Testing: syntax/diff/source validation, one isolated source-app session, the
existing Cardable.dev.checkQol() extended for C and manually run once (23/23),
and final build/hash/config/handoff validation via milestone A delivery.

The one session observed the new welcome and its three lines; no dev workspace
was visible. Start playing reached the existing tutorial/menu. Settings help,
keyboard focus, Escape return to the same Settings help button, palette help,
unconfigured-release copy and disabled reporting worked. All four graphics tiers
opened the same help with none/fade/light/full panel animation as appropriate.
The original saved quality was restored in the isolated session.

A deliberately unreadable primary save was used only inside the fresh temporary
QA profile. Its text stayed unchanged through load, import preview and first
confirmation click. The second click restored the exported player's collection,
cleared recovery and retained the corrupt original. Opening stayed idle while
recovery was pending. No renderer console/page errors were observed.

The OS reduced-motion emulation probe did not activate C.motion.reduced at the
immediate observation point. Existing Auto/On/Off media binding and the reduced
CSS class were inspected; actual OS/manual reduced-mode behavior is not accepted
by that probe. No extra app opening or second named-check run was substituted.

The source session closed normally; its private temporary profile was retained.
No old suites, new test files, screenshots, recordings or profiling were used.
Native save-directory/log/clipboard operations, actual failed startup dialog,
disk permission failures/native recovery archives, browser-native absence,
real returning-user relaunch, Safe-mode relaunch, Studio-photo persistence,
installed upgrade/uninstall, signing and hardware/browser regression remain
unverified. Simulated local corruption is not a disk/power-loss test.

Final package identity/hashes, installer/shortcut, removed owned artifacts and
pending legacy cleanup are authoritative in generated dist/delivery/latest.json.
The stable preview entry URL remains unchanged. Unmanaged legacy artifacts,
other worktrees, incoming specs and unrelated deletions remain untouched.

Native failure-dialog API was checked against the
[official Electron dialog reference](https://www.electronjs.org/docs/latest/api/dialog).
