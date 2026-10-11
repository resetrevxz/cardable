# Picker: the three-card shuffle

A clear plastic sleeve with three card backs showing inside.

## Front
- Frosted heat seals top and bottom, a teal label strip, `1/3`, and the three backs fanned inside. They sway slowly and catch an occasional glint.

## Back
- The same sleeve seen from behind, with the mirrored fan and a barcode.

## Arrival (`cardRiffle`)
The three backs riffle like a magician's overhand: one card at a time lifts, arcs out and drops back under, with trails and teal sparks, then they settle into the sleeve.

## Opening
The hold and the cut are the shared ones; the sleeve tears like any other pack. Then:
1. **Shown.** The three reserved cards come out face-up with their names, so you know what you are choosing between.
2. **Turned.** They flip face-down, one after another.
3. **Gathered** into a pile and squared with a tap.
4. **Shuffled** by hand: three overhand drops (packets lifted and dropped onto each other, reversing their order), a riffle (split, bow, interleave), and a cut (top card to the bottom).
5. **Dealt** back out with a flick, then **two monte swaps** past each other.
6. **Picked** from the backs: 1, 2 or 3 and Enter, a second click, or a short hold. The chosen card and the others turn face-up, then the normal reveal follows.

The shuffle is presentation only. Each card element belongs to one reserved option, the script is seeded from the reservation, positions are tracked through every operation, and the pick goes through the unchanged `C.picker.choose(optionIndex)`. Nothing is minted until then. Reload during the pick restores the same reserved options and replays the sequence; reduced motion shows the cards, turns them and trades places with a short fade.

No changes to probabilities, pack cadence, reservations, serials or rewards.
