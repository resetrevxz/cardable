# Automatic updates and signing follow-up — 4.2.0

The owner approved the proposed signing integration, background update download
and save-gated installation on normal quit after cleanup milestones A–D.

**Done**

- Automatic mode checks installed configured Windows builds after 30 seconds and
  every six hours, serializes check/download and installs ready updates on normal
  quit without reopening the game. Explicit restart uses the same save gate.
- Settings exposes progress, retained error/retry, release notes, Restart and
  update now and Skip update on this quit. Reopening Settings restores explicit
  restart after Skip. Browser/development/unpacked previews cannot auto-update.
  Installation is identified by NSIS's adjacent uninstaller, not delivery metadata
  shared by both the preview and supplied installer.
- Save-flush success is separate from permission to close. Failure/timeout,
  Windows session ending and Safe-mode restart defer installation. NSIS waits
  at most ten seconds for an updater-triggered natural exit and never kills it.
- Build configuration supports certificate/store, Azure and custom-provider hooks.
  Public tag CI requires a configured publisher, successful signing, and trusted
  timestamped app/installer signatures before creating a draft release.
- Player help, architecture, release instructions and both changelog consumers
  describe the approved policy. Version stays 4.2.0; save schema/identity and file
  origins stay unchanged. Focused source files are committed as stage 21.

**Skipped or changed**

- Public owner/repository and signing provider/credentials remain unset. No
  public release was invented or published, and no certificate was purchased.
  Local delivery is allowed unsigned; public CI refuses an unsigned release.
- No installer execution, OS shutdown/relaunch, real download, signature-provider
  request or public version-to-version upgrade was performed. These need owner
  configuration and separately authorized acceptance under the current policy.
- Existing shared deletions, incoming specs and external worktrees are preserved.

Testing: JavaScript syntax, installed builder schema for certificate/Azure,
missing-publisher release guard, PowerShell parser, version/notes and diff hygiene;
one source-app session in an isolated profile, checkQol 23/23, zero renderer errors,
unconfigured UI and injected progress/error/restart/Skip/reopen observations.
Native log records a successful ordinary shutdown flush. UI injections do not
prove real updater download/installation or signing. No old suites, new test files,
screenshots, recordings or profiling were used.

**Look at**

- Settings → About → Software updates; the unconfigured build must explain that
  releases are unavailable and disable checking. Existing logs/diagnostics remain.
- [RELEASING](RELEASING.md) lists provider setup and GitHub Actions variables/secrets.
  [UPDATES](UPDATES.md) lists the required public A→B acceptance and data checks.
- The completed-prompt delivery command runs once after the focused commit. Its
  transactional latest/last-good manifests record the actual installer/shortcut
  and cleanup or pending handoff; the final reply reports those concrete results.

**Open questions**

- Owner supplies the real public GitHub release repository and signing provider.
  Credentials belong in CI secrets, never chat or shipped metadata. Microsoft
  Public Trust eligibility currently excludes India; no provider was assumed.
- A public release newer than an already-installed version is needed to exercise
  A→B updates. The existing manual-only build needs a user-run bootstrap installer
  containing this feature; enabling it cannot retrofit old binaries remotely.
