# Alpha 1.8.0 — Mythical: the Crimson Clock

- Added Mythical's 28-second spatial cave, falling ruby crystal, black-water impact, underwater tendrils, overhead omen and corrupted clock ritual.
- Added original vector gothic lettering, layered ruby smoke, textured flames, a spinning mineral star, broken metal clock frames and one white explosion flash.
- Kept the reserved card hidden until the direct 400 ms flip with overlapping foreground release. Metadata, variants, Keep/Delete and exact-once rewards retain their existing gates.
- Retained a red-black background with quiet edge smoke/embers, bounded to 10 Hz through the shared scheduler. It sleeps on blur/activity hide/static graphics and fades fully on either final decision.
- Added native WebGL2 rendering with bounded targets, half-resolution reflections/bloom and a deliberate Canvas fallback for missing/lost WebGL. Both GPU and Canvas versions use descriptor section boundaries and independent visual seeds.
- Preserved Mono, Fast, reduced motion and Low/Very Low alternatives. Earlier rarity intros still run; Legendary keeps its gold background.
- Updated design/reveal guidance and browser evidence. No audio, runtime network dependency, gameplay/save-schema change or Git commit.
