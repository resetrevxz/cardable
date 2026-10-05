# Milestone A — Automatic local delivery

Implemented against main after f914947 (4.1.1 optimization), not the spec's older
4.1.0 audit snapshot. The original historical plan was found beside SPEC.md at
alpha-updates/4.2.0-cleanup/ORIGINAL-PLAN-v2.md; no destructive commands from that
plan were executed. Milestones B, C and D remain planned. No 4.2.0 shipped claim
or version bump is made for this delivery-only milestone.

## Delivered

- `npm run deliver:desktop` with a kernel mutex, exclusive file handle and PID/token audit, fresh
  isolated NSIS + unpacked Windows x64 staging, publish disabled and no new library.
- Source revision, dirty-source/build-input fingerprint, packaged identity and
  bundled source/hash validation, installer size/SHA-256, complete artifact hashes
  and manifest-owned path records. Desktop/Mini/History/changelog remain bundled.
- Atomic latest/last-good pointers, preview transaction journal and rollback,
  existing-origin binding, one Cardable (Latest Build) shortcut to the actual app.
- Running preview deferral, same-source `deliver:desktop:resume`, read-only
  inspect/verify commands, hash/reparse/locked-file guards and exact owned cleanup.
- Completion protocol added to AGENTS and PROMPTING, with developer guidance in
  DESKTOP-DELIVERY and BUILDING. No OS/chat hook, watcher, scheduled job, automatic
  installation or launch was added.

## Exercised paths

1. First build produced a validated offline installer, packaged app and Latest
   Build shortcut. The existing versioned desktop link selected
   dist/desktop-qol-4.1.0/win-unpacked as the immutable preview location. Its exact
   app.asar entry URL, appId and userData path remain unchanged.
2. An invalid public release-owner setting made the builder fail before handoff.
   Latest, last-good, installer and shortcut remained unchanged. Failure/staging
   provenance was recorded; the exact failed stamp-only stage was pruned only
   after a later successful handoff.
3. A second delivery while the preview was running built/validated a fresh
   installer, retained the working old shortcut/preview and recorded
   preview-pending with process IDs. A concurrent delivery was refused by the
   mutex. No process was force-closed.
4. The one app session was closed normally. Resume completed the handoff, retained
   the same shortcut bytes/target, then pruned superseded owned build and rollback
   directories. Completed runs converged to one current owned installer/build.
5. A known-dead owner audit was reclaimed under the mutex; verification succeeded.
6. A manual interrupted-state exercise copied the same validated preview bytes,
   journaled the old/new/rollback paths, swapped them under the same mutex and
   left latest uncommitted. The next verify command restored the old directory,
   retained the installer/pointer/link, rehashed the package/preview and archived
   the transaction provenance. This simulates the interrupted filesystem state;
   it is not a power-loss or forced-process-termination test.

Local manifests/records/history are in dist/delivery (ignored). Final delivery is
described by latest.json; last-good.json is the last ready handoff. Each build
record retains source identity, owned-file hashes, removed paths and recovery
provenance even after superseded binaries are removed.
The initial small control-cleanup development probe was archived with its exact
original path and SHA-256 under delivery/history instead of deleting its evidence.

## Runtime and testing boundary

Testing: delivery build/hash/config/handoff validation plus exactly one isolated
app opening at the stable preview URL; 4.1.1, native bridge, inventory and Card
History initialized, with zero observed renderer console/page errors. No old
suites, new test files, screenshots, recordings, profiling or checkQol invocation.
Game logic was unchanged, so the named dev check was unnecessary. Installer
execution, upgrade/relaunch, signing, browser/hardware regression, actual power
loss and every Windows sharing/reparse failure remain unverified.

## Retained and deferred

Pre-manifest outputs (including the separate 4.1.1 optimization delivery), existing
versioned desktop links and the normal installed-app shortcuts are retained and
inventoried. No broad Cardable filename deletion, public-release pruning,
dependency/worktree move, profile cleanup or photo migration was performed.
OneDrive Desktop is used via the Windows Desktop API for a new regular link;
its directory/reparse attributes and older links are not recursively touched.

Recoverability: new binaries remain until their replacement handoff commits;
superseded owned binaries can be rebuilt from recorded revision/fingerprint and
source. Delivery history preserves provenance, not a permanent binary rollback.
Public hosting/signing/live updater setup remains deferred. B owns installer
simplification; C owns help/onboarding; D owns documentation/archive consolidation
and final 4.2.0 version synchronization.
