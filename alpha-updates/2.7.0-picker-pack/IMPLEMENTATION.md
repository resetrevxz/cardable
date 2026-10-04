# Picker Pack implementation

Milestone A adds unminted distinct offers, production-pool guarantees, optional pendingReveal options/choice, exact-once serial allocation, optional instance choice provenance and the single manual check. Schema stays 5. The existing data scheduler reads slotRules.regularChance through randomChance; earlier ordinary intervals and cadence stay unchanged. The definition is disabled until its presentation is ready.

Protected pack/cutscene registries, packs.js and finishes are read-only. Two small generic hooks in the central opening controller accept a custom pending builder and resume an unresolved choice through the registered strategy. Existing inventory/detail extension registries require no changes: chosen cards use the normal collection. Journal/Achievements receive the picker:chosen event only after a durable choice write.

The worktree starts from a snapshot of completed dependencies present in the shared checkout; the dependency snapshot is a baseline, not this feature's delivery commit.
