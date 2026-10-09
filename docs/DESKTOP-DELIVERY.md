# Local desktop delivery

From the actual repository root, run `npm run deliver:desktop`. Windows x64 and
the existing Node/Electron development dependencies are required for building;
players only need the resulting offline installer. This command never installs,
launches, publishes, elevates, kills Cardable or changes the game/save schema.
The installer uses guided per-user setup with folder selection on a new install
and the [player guide](../PLAY.md). In-place updates retain the registered folder.
Milestone C adds bundled Settings/palette help and explicit recovery choices.
Milestone D consolidated documentation and evidence at 4.2.0. Public numbering now starts at 1.0.0. Each local delivery has a unique build ID; each completed public update also advances the release version under [RELEASING](RELEASING.md). Read-only questions and internal steps do not rebuild or release.

## What the command does

1. Resolve this tool's actual Git root. Acquire a per-repository Windows kernel
   mutex and exclusive file handle (also covering other logon sessions); a
   crashed owner releases them. An additional PID/token audit prevents
   taking over an orphaned, still-running delivery child. A dead-owner record can
   be replaced under the mutex without racing another command.
2. Build with existing electron-builder configuration, NSIS + unpacked x64 and
   publishing disabled. Every build has a fresh owned staging directory. Previous
   unpacked binaries may remain open; their directory is never used for building.
3. Validate version, source revision/fingerprint, required files (desktop bridge,
   Mini, deletion/replay/performance, changelog/icons), every shipped source/asset hash and local
   HTML resources. Record installer/executable/ASAR size and SHA-256, all artifact
   hashes, Git dirty fingerprint, ownership, shortcut and pending cleanup.
4. Promote only complete validated artifacts to `dist/delivery/builds/<buildId>`.
   Atomic `dist/delivery/latest.json` points to their installer. No partly copied
   installer is advertised. `last-good.json` identifies the last ready handoff.
5. Copy a preview beside its stable directory, validate the copy, journal the
   transaction, retain the old directory for rollback, then replace it at the same
   path. Create exactly `Cardable (Latest Build).lnk` on the Windows Desktop. It
   targets the actual Cardable.exe, with no npm/terminal/installer command.
6. After both installer and shortcut handoff succeed, remove exact superseded
   manifest-owned build/rollback trees. Before removal, check absolute paths,
   every ancestor/descendant for reparse points and every owned file/hash, then
   claim all files against other readers/writers. A running/locked/changed tree
   is deferred. Records remain, with removal and recovery provenance.

The normal installed Cardable shortcut belongs to NSIS and remains separate.
NSIS now recreates it on reinstall; Start Menu shortcuts and launch after setup
are enabled. The supported include never kills Cardable: interactive setup asks
the player to close it and retry, while silent setup stops. Existing all-users or
ambiguous locations stop for manual review, not a new origin/profile. See PLAY.md.
Using the installer is configured to upgrade the stable app identity; delivery does not execute it or
claim that an installation/upgrade has been accepted. No private absolute paths
enter packaged build metadata: only build ID, revision and source fingerprint.

## Preview binding and storage

The first run inventories exact existing checkout builds and Cardable link targets.
It automatically adopts a preview only when the existing links identify one verified
checkout location. Existing package identity, appId and source entry are checked.
The binding is persisted in `dist/delivery/binding.json` and never silently changed.
If unresolved, delivery stops with the inventory and a useful error. Explicit
`CARDABLE_DELIVERY_PREVIEW` can select an existing verified checkout preview;
creating a different origin requires save export and separate Studio-photo download
guidance and must be resolved before handoff. JSON exports do not contain photo blobs.

Here the existing `Cardable 4.1.0.lnk` selects
`dist/desktop-qol-4.1.0/win-unpacked`. That historical folder name remains, while
its contents/version advance. The same executable directory, app.asar entry URL,
appId and userData preserve the preview's storage location. Do not rename it to
make its label look newer. The Latest Build link has the accurate stable label.

Desktop may be redirected to OneDrive: the command uses the Windows Desktop API
and creates one new regular link without recursive operations there. Existing
versioned/manual links and pre-manifest installer outputs are inventoried and
retained, not broadly adopted for deletion. No separate installed shortcut is
overwritten. Existing valid Latest Build links are retained; altered target/args
or an unexpected link owner blocks handoff rather than overwriting personal files.

## Failure, interruption and retry

- Running/locked old preview: the new validated installer stays available;
  latest status is `preview-pending`, the old app/link keep working. Close it
  normally, then `npm run deliver:desktop:resume`. No force termination.
- Interrupted promotion: the next command replays the transaction record,
  restoring the previous directory if the latest ready commit did not complete.
  A committed replacement is retained. Unknown/modified/reparse paths stop
  recovery rather than trigger destructive guessing.
- Build/validation failure: latest, last-good, preview and existing link stay.
  Failure records retain staging paths and identities. Interrupted/failed staging
  remains visible for audited recovery; it is not indiscriminately swept.
- `npm run deliver:desktop:verify` rehashes the current delivery/preview and checks
  its actual shortcut target. `deliver:desktop:inspect` inventories legacy paths
  and targets without a build. Neither opens the game or executes an installer.
- `deliver:desktop:resume` completes the pending same-source preview handoff and
  retries owned cleanup without rebuilding. Changed packaged source requires a
  fresh `deliver:desktop` instead of reusing an outdated installer.

Manifests, build records, inventories and transaction/failure history are local,
generated/ignored data. They are not saves. Do not delete them to bypass ownership
checks. No published release or active latest.yml/installer/blockmap pair is pruned;
paired local artifacts live together inside the manifest-owned build directory.

## Evidence and limits

Milestone evidence is recorded in alpha-updates/4.2.0-cleanup/A-DELIVERY.md through D-DELIVERY.md and the
local manifests. Hash/config/handoff validation does not prove gameplay, installer
execution, signing, update/relaunch, hardware or browser regression. Follow the
restricted testing policy in the current spec and PROMPTING.md.
