# Stage 12 — Variants and Card Tags (1.1.0)

## Release notes

- Every new card has an independent 10% chance of one permanent cosmetic finish, across Basic through Secret. Existing cards and already reserved reveals remain normal.
- Eleven coatings: Rainbow Holo, Vertical Holo, Horizontal Holo, Matte, Beam, Cross, Spotlight, Galaxy Holo, Starlight, Shattered and Aurora.
- Variants transform after the normal reveal: a normal hold, increasingly fast coating alignment snaps, a final lock, then the finish tag and Keep/Delete. Default 1200 ms, Fast 840 ms, reduced motion 180 ms. Reload displays the saved final finish immediately.
- Inventory cards and flying copies show artwork, coatings, rarity rims and props with names outside the card. Detail restores the printed front.
- Normal and variant copies form separate finish stacks. Favorites, named collections, custom order, acquisition focus and serial browsing refer to that stack. Unique GPU completion still counts GPU designs once.
- Neutral shaped glass tags show finish, New, Favorite, rarity, unpacking date, age and recorded serial. Compact inventory rails expand in selection/detail. New clears when that finish stack is viewed.
- Finish filters, grouping and queries (`variant:beam`, `variant:"Rainbow Holo"`, `finish:normal`, `finish:any`, `favorite:true`). Inventory summary controls filter New and variant copies and report owned finish stacks separately.

## Odds and materials

| Finish | Class | Conditional weight | Chance per pull |
|---|---|---:|---:|
| Rainbow Holo | Common | 18 | 1.8% |
| Vertical Holo | Common | 16 | 1.6% |
| Horizontal Holo | Common | 16 | 1.6% |
| Matte | Common | 10 | 1.0% |
| Beam | Uncommon | 16 | 1.6% |
| Cross | Rare | 4 | 0.4% |
| Spotlight | Rare | 4 | 0.4% |
| Galaxy Holo | Rare | 4 | 0.4% |
| Starlight | Rare | 4 | 0.4% |
| Shattered | Rare | 4 | 0.4% |
| Aurora | Rare | 4 | 0.4% |

Normal is 90%. Finish class is separate from card rarity. Finishes do not change specs, rewards, card/rarity selection or serial allocation. Vertical, Horizontal and Beam use white/silver light. Matte removes simulated front reflections, preserving baked artwork lighting and rarity identity. Spotlight uses local GPU silhouette masks; procedural art reuses the hardware geometry. The back remains the existing common Cardable design.

The focused card alone updates its coating through the existing card FX/lamp loop and quality throttle. Lite coatings are static. Galaxy/Aurora drift only on the visible focused front; back/offscreen/hidden views stop their material updates. Starlight and grain use single local SVG textures; Shattered uses 24 clipped shards per material.

## Save and API contracts

- Save schema 3 adds `variantId: null | registeredId` to inventory and pending instances. Assign it in `pullCard` after choosing the GPU, and include it in the original durable opening commit. Keep/Delete/replay/recovery never roll a finish.
- `C.data.variants` is data-only; `C.variant(id)` resolves metadata. `C.variants.roll(random)` implements the gate and weighted selection. `C.variantMaterials` registers mount/update/destroy/lite coating lifecycles independently of rarity finishes.
- `C.stacks.key(cardId, variantId)` uses the canonical JSON tuple. Projection entries carry `stackKey`, `variantId`, variant metadata and serial instances. Saved favorites/custom order store stack keys; named collections use `stackKeys`; selection fields are `lastSelectedStackKey` and `pendingFocusStackKey`.
- Schema 0–2 migrations leave instances normal and map GPU preference IDs to their normal stack. Missing finish fields normalize to null; unsupported explicit finish IDs are rejected by validation. Verify an old export's original checksum before migrating it.
- Inventory selection and acquisition/return handoffs carry `stackKey` alongside catalog `cardId`. Acquisition source also carries `instanceId`. Export, import, backup, Restore and Undo preserve finishes and preferences.
- `cardView.create(..., {presentation:'art-only'})` and `view.setPresentation('full'|'art-only')` support the shared detail handoff. `setVariantProgress(progress,snap)` controls the optical transformation without mutating the saved instance.
- `C.cardTags.derive/render` derives presentation from the actual entry, selected instance, preferences and time. Today/Yesterday follow local calendar boundaries; age follows elapsed days. Compact tags are included in the keyboard card label; detail tags have individual focus rings. No invented edition or global print history.

## Extension and boundaries

Add new finishes through the variant registry and material lifecycle, with weights totaling 100 and a static/reduced-motion appearance. Supply a local subject mask for new image art used by Spotlight. Do not replace rarity borders/props, introduce per-card timers, network assets, new packs, market behavior, audio or rerolls. See [VARIANTS-AND-TAGS-QA.md](../archive/4.2.0-cleanup/docs/VARIANTS-AND-TAGS-QA.md) for acceptance evidence.

## 2.2.0 Frame skins

Classic's permanent monitor bezel is a separate instance field, `cardSkinId`, rather than an extra surface finish. Existing coatings remain eligible; variants explicitly classified `kind:'frame'` are excluded from Classic's probability table and forced draws. A skin adds a third element to the canonical stack tuple, preserving all ordinary two-element card/finish identities. The selected instance retains its actual pack tag; pre-2007 card metadata independently supplies the CLASSIC era tag and search term.
