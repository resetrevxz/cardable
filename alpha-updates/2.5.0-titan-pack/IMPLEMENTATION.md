# Titan Pack implementation

## Pool and schedule

The owner selected a **separate 5% chance on normal slots**. Titan is appended after the branded and Classic data definitions, giving it the next ordinary interval without changing existing brand/Classic outcomes. It replaces part of Standard's interval. Rare's fourth-opening cadence and Royal's replacement channel retain precedence. The first two tutorial slots stay Standard. This is approximately 3.75% of all lifetime positions. Preview/odds selection and one-shot forcing are supplied by the existing enabled-data dev registry; grants still add shared stock.

The data definition records all 17 IDs explicitly, with inclusive tiers 5–10 and the requested tier modifiers. GTX TITAN maps to `geforce-gtx-titan`; names shortened in the brief map to their existing GeForce/Radeon catalog records. No cards or rarity assignments were changed. The production filtered table normalizes to Unusual 15.4639%, Double Super Rare 19.3299%, Legendary 25.7732%, Mythical 19.3299%, Exotic 15.4639%, Ascendant 4.6392%. Within each tier the eligible cards use the existing uniform selection. Secret is excluded both by curated IDs and maximum tier. Standard variant gating/selection is unchanged; no variant-kind exclusions were requested. Forced cards/tiers still pass the same production filters.

## Vault presentation

`titan-pack-skin.js` registers the shared idle/waiting/wrapper renderer. The original CSS/vector surface keeps the same outer footprint with a titanium bezel, heavy chamfers, carbon strips, eight rivets, engraved print and a central round reactor. A 24-segment ring reads refill or committed charge progress. High uses pointer lighting, a four-second core cycle (0.25 Hz), a seven-second rim pass and faint capped steam. Medium keeps one rim pass and static metal; Low uses a simple static gradient; Very Low uses flat titanium. Reflection/material/animation controls restrict decoration independently. Waiting stays transparent even on Very Low. All work runs through existing material and queue subscriptions; hidden/AFK behavior remains shared.

`monolithDrop` is a registered arrival strategy. A bounded source wrapper is pressed down while the target drops 180 px and settles with an eight-pixel damped overshoot. A single local dust/shockwave ring follows impact; High alone receives a two-pixel presentation dip. Medium has no dip. Low, Very Low and reduced motion crossfade in 240 ms. Temporary nodes/styles clean up on completion or replacement; no capture, bitmap readback, private timers or additional scheduler subscriptions are used.

## Opening and recovery

The shared opening controller retains stock/hold/commit/reservation/reward. Its strategy context now provides guarded unseal/reveal callbacks. `vaultDial` uses the existing interactive `cutting` phase but hides the blade/guide and presents a clockwise dial with three status lights. Pointer capture and normalized angular deltas handle wraparound; counterclockwise motion and isolated jumps over 0.65 radians do not advance. Each quarter turn completes one tick, and partial progress survives release/re-grab. Enter advances exactly one tick regardless of custom hold/action key settings; the existing coarse-pointer action reads Next tick.

After the third tick the controller enters `vaultOpening`. Bolts retract, the door travels locally and steam/light resolve over 1,400 ms before the reserved tier's cinematic. Reduced motion fades the door and keeps tick lights static. The actual card remains unmounted until this completes. No new pull, serial, count or reward occurs during dial or unseal steps. Reload after any committed step resets ephemeral presentation and reveals the identical reservation directly. Keep/export retain `packId: titan`; card skin stays unset and existing card/finish stack identity remains intact. Schema 5 needs no new durable fields.

Existing Classic and Royal strategies accept the extended context without changing their controls. Architecture, design and opening guidance document the new registry contracts. The focused stage 18 checkpoint preserves unrelated working-tree and staged changes.
