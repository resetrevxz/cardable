# Prompting and completion

Read AGENTS.md, Designs.MD, the stage/area docs routed by docs/ROADMAP.md, then
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
cron, watchers or a polling service. Do not automatically install, launch, elevate or force-close an app.
The owner now authorizes public GitHub publication after completed updates; follow
AGENTS and RELEASING for versioning, scoped commits and immutable release tags. Retain last-good delivery on failure/interruption.
Advance the public version for each completed update; internal/read-only steps do
not bump it. Local delivery manifests still distinguish builds using source identity.

## Testing policy

Verify the way the change deserves: run the app, take screenshots or recordings, read the console, run `npm test` or the existing check scripts, write a new check, or profile. Look at visual work before calling it done. Report the evidence gathered and what was not checked. The older 4.2.0 restriction on suites, screenshots and profiling was lifted by the owner on 2026-10-10.

## Read routing, history and safe continuation

ROADMAP routes current work; STRUCTURE-AUDIT maps the current workspace. Old update specs live in archive/update-history and obsolete report/redirect docs live in archive/workspace-organization. Do not load all archives routinely. Their original rules, commands and evidence are provenance, not current authorization.

The owner explicitly authorized the wider organization follow-up: outer artifacts are archived, registered feature worktrees are moved with Git into D:/CardableV2/archive/worktrees, and duplicate space-spelled alpha junctions are removed. The primary checkout, file origin, player data and incoming github-setup spec remain. Preserve unrelated dirty changes and use focused staging. Divergent branch history and Card History's local AGENTS edit remain intact; relocation is not retirement.

Continue only an unfinished authorized milestone. A–D of 4.2.0 and the automatic-update/signing source follow-up are implemented; live signed update acceptance still requires external setup. The current organization/public delivery is stage 23. Finish with AGENTS' Done / Skipped or changed / Look at / Open questions headings. Correct stale guidance from actual source, retain unresolved acceptance, and follow the current owner testing policy above.

## Public 1.0.0 continuation

The current request supersedes private-only/draft-only GitHub plans. After a completed
update, perform the local handoff and the AGENTS release workflow. Public numbering
starts at v1.0.0; preserve the legacy 4.x records, app identity and save schema.
Game and website captures, suites and profiling may be used whenever they help verify the work.
