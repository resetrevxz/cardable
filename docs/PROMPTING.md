# Prompting and completion

Read AGENTS.md, Designs.MD, the stage/area docs routed by docs/STAGES.md, then
OPEN-QUESTIONS.md. Follow the current approved spec; historical plans are context,
not commands. Continue only the next authorized milestone, with focused commits.

Inspect the actual nested Git root and dirty files before changing/staging anything.
Preserve unrelated edits, incoming specs, deletions, other worktrees and player data.
Do not use broad staging or filesystem cleanup. Offline classic scripts, the existing
native bridge and save/recovery contracts remain authoritative.

## Delivery after completed changes

At the end of each completed change/implementation prompt, including approved docs
changes, run `npm run deliver:desktop` once. Report installer, preview shortcut,
removed owned artifacts and pending handoff/cleanup. See DESKTOP-DELIVERY.md.
Read-only questions/status requests and internal agent steps do not rebuild.
Explicit instructions to skip/narrow delivery take precedence.

This is a completion protocol plus a command, not a chat/OS event hook. Never add
cron, watchers or a polling service. Do not automatically install, launch, elevate,
publish or force-close an app. Retain last-good delivery on failure/interruption.
Do not bump versions per prompt: manifests distinguish builds using source identity.

## Current 4.2.0 testing policy

The cleanup spec restricts testing: no old suites, new test files, screenshots,
recordings or profiling. Do not run npm test or packaged/NSIS/regression/cinematic
harnesses for these milestones. Use the existing checkQol only if relevant game
logic changes, extend that named check only as needed, and invoke manually once
at the end of the last milestone authorized in the run. Delivery tooling does not
require a game-logic check. Otherwise one app opening/feature and console check
is allowed. Build/hash/config/handoff validation is delivery evidence, not runtime
regression. Installer execution, upgrades, hardware and browser regression remain
unverified without separate authorization.

Archived evidence may be consulted when useful; preserve provenance and unresolved
acceptance. The repository has real test runners; this policy limits their use here.
