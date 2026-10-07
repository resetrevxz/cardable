# Achievements rework — approved 1.1.0 scope

Work directly on main, no worktrees and no GitHub publication. Read current AGENTS.md and Designs.MD; consult official Vercel and Apple design guidance. Preserve offline classic-script index.html, unrelated work, app identity and save schema.

Three weekly achievements per week, twenty recurring achievements, existing one-time catalogue unless additional one-time tasks are supplied. Weekly tasks use set pack/time objectives rather than luck. All rewards are credits. Weekly completion requires manual claim; one-time completion automatically claims. Owner correction: **one-time achievements do not have milestones**. Recurring auto-claim and Monday UTC rollover are implementation defaults, documented in docs/ACHIEVEMENTS.md.

Use two-word achievement names containing the task. Difficulty: Common, Uncommon, Rare, Legendary. Reference the supplied grouped quest sidebar composition while calling every feature Achievements. Include a separate Pinned Achievements section, clickable detail with images/disclosures, objective bars, a bottom dynamic completion bar and recurring milestone borders that evolve with earned progress. Add original visual refinements consistent with current monochrome/shaded design rules.

Emit achievement:unlocked {id,tier,at,retro} on the bus; do not call the Journal API. Keep pack/cutscene producers unchanged. Optional state only. Existing protected-feature instructions still apply.

Current restricted QA: extend and invoke existing checkQol once at the end; one game session with feature/console observation. No old test suites, new test files, screenshots, recordings or profiling. Run required local desktop delivery once; never execute the installer or publish.
