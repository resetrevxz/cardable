# Cardable Market Beta 1.0.0 — Stage 7 acceptance report: social market and uploads

Branch `feature/market-beta`, worktree `D:/CardableV2/Market`. Unreleased: no merge, no release, no live-site change, no desktop delivery. Operator runbook: [cloudflare.md](cloudflare.md). Earlier stages: [stage-5.md](stage-5.md) (trading), [stage-6.md](stage-6.md) (analytics).

## 0. The honest headline

Custom listings with real uploaded pictures, anonymous profiles, comments, reviews, follows, the community feed and the operator's moderation tools are built end to end and verified **locally**: the real Worker on the real Workers runtime (`wrangler dev --local`), a real local D1 and a real local **R2**, and the real game interface in headless Chromium with three independent test accounts.

They are **not deployed**. `wrangler whoami` still answers *not authenticated* (checked again in this stage), and a sign-in is an interactive consent only the account owner can give, so nothing was created in Cloudflare and no deployed-staging evidence exists. The exit gate's "real upload and listing view by an independent test account on deployed staging" is therefore **not met as written**; section 12 lists exactly what remains and the one command that proves it once the owner has signed in (`deploy.cjs --verify`, which now performs a real picture round trip and was rehearsed 20/20 against a local origin). Real Cloudflare usage and cost were not measured; section 10 is arithmetic from the documented limits and from local measurements, and says so.

## 1. What a player gets

- **Custom listings**: a title, a note, up to three of their own pictures, a cover shape (banner, square, portrait) with crop and zoom, and one of three restrained looks (plain, a thin frame, a soft spotlight). A live preview tile is beside the form.
- **Pictures from a file, a drop, a paste or the Director album**, each cropped, described and explicitly confirmed before anything leaves the device.
- **Anonymous profiles** (generated two-word names, counts and reviews with their sample size), **comments** with one level of replies, **reviews** from completed trades only, **follows**, the **community feed**, and a **report** button on every public thing a stranger can write or upload.
- **Choices**: switch social notifications off, switch follow notices off, hide comments, mute a player; remove any picture of their own from Global Market.

Source labels: every social surface carries **Global Market**; the Simulation has no profiles, comments or reviews and says why (its traders are software).

## 2. Identity and privacy

| Fact | Rule |
|---|---|
| Public name | a generated two-word alias (256 × 256 words), unique case-insensitively, chosen by the server, never by the player; 30 concurrent registrations produce 30 distinct names (tested) |
| What others can read | the alias, counts, reviews (with the reviewer's alias), comments (with their alias) and pictures on listings |
| What nobody can read | account id, session, recovery code, network address, device detail, the original file, the file name, camera/GPS metadata (tests scan every social response for `acct_`, `ses_`, `recovery` and `@`) |
| Profile age | the **month** an account started, not the day |
| Operator | a server-side secret (`ADMIN_TOKEN`); every admin route answers 404 to anyone without it; every action is logged with who, what and why |

## 3. Pictures

### Pipeline

1. **On the device** (`src/market/online/media.js`): the file's first bytes decide what it is, never its name; GIF, SVG and anything else are refused with a reason; animated WebP and PNG are detected and refused; the browser decodes it with its own decoder (EXIF rotation applied, so a photo taken sideways is shown upright); the player crops; three variants (320, 960 and 1920 px on the long edge) are drawn to a canvas and encoded as WebP (JPEG when WebP is unavailable) under their byte budgets. Drawing to a canvas drops every camera, GPS and colour-profile field. The original file and the Director album are only read.
2. **Upload** (`POST /v1/uploads`, then `PUT /v1/uploads/:id/:variant` ×3): a slot with a 15 minute authorisation, then each size with real progress (XHR), a cancel that deletes the slot and a retry of a dropped connection (twice).
3. **On the server** (`cloudflare/src/media.js`, `uploads.js`): the Workers runtime has no image decoder, so the server verifies what it can with certainty and rewrites the file instead of trusting it:
   - the real format from the bytes (JPEG or WebP only; PNG, GIF, SVG, HTML and unknown are refused) and the declared `content-type` must agree with it;
   - the container is walked end to end: complete (a file cut off at 95% is refused as *truncated*), well formed, not animated, 8-bit grey or RGB, one frame;
   - dimensions read from the headers must be inside the size's box and the picture at most 4.2 megapixels;
   - **metadata is stripped by rewriting the container**: every JPEG application segment except the JFIF header, comments, and any bytes after the end-of-image marker; every WebP `EXIF`, `XMP ` and `ICCP` chunk and the matching flags; the stored bytes are the picture and nothing else;
   - the three variants must have the same shape (within 3%);
   - the object key is made by the server (`u/<upload id>/<variant>-<nonce>`): no request names a key, lists the bucket or reaches an object no upload row points at.
4. **Attached only after validation**: a listing names uploads by id; in the same transaction the server checks each is the player's own, finished and either unattached or on one of their closed listings (for listing again), then attaches it. A forged id, someone else's picture or an unfinished one is refused (`404`/`409`).

### What the server cannot do

It cannot prove the compressed data decodes. The game decodes every picture before it is sent, and a file that only pretends to be an image is served with a fixed image type, `nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Content-Disposition: inline` and no markup, so a browser either draws it or shows nothing. A hostile client could therefore store bytes that are structurally a WebP or JPEG but do not decode; the only consequence is a broken picture for viewers. Full decoding would need Cloudflare Images (paid) or a WebAssembly decoder; it is not built.

### Budgets and quotas

| Item | Limit |
|---|---|
| Thumb · card · full | ≤ 40 KB · ≤ 180 KB · ≤ 600 KB; long edge ≤ 320 · 960 · 1920 px; short edge ≥ 48 · 96 · 160 px |
| Source file on the device | ≤ 15 MB, ≤ 12,000 px a side, ≤ 60 MP, short edge ≥ 200 px, JPEG/PNG/WebP, not animated |
| Pictures a player may hold | 12 (pending, ready or attached) and 12 MB in all |
| New upload slots | 20 per rolling day, 3 open at once |
| Attempts per slot | 12 variant uploads, accepted or refused, counted before anything is read |
| Pictures per listing | 3 (the first is the cover) |
| Slot authorisation · unused finished picture | 15 minutes · 24 hours |
| Kept after a listing ends | 30 days if it sold, 14 days if not (so it can be listed again) |

The storage cap is checked in the same transaction that stores a variant, so two uploads at once cannot both fit the last of it (tested).

### Reading

`GET /v1/media/:id/:variant` needs the player's token (no address carries one; the game fetches with the token and draws from memory). The owner can read a picture at any time; everyone else only once it is attached to a listing; "no such picture" and "not yours to see" answer the same. Responses are `private, max-age=300` with an `ETag` so a repeat view is a 304 with no body. The game loads pictures lazily as they approach the screen and keeps at most 80 object URLs.

### Cleanup

The cron sweep (every 5 minutes, bounded) expires slots that ran out of time and finished pictures nobody used, and retires pictures of listings that ended long ago, taking them out of public view first and then deleting the objects by prefix (so a lost race leaves nothing behind). A removed or expired picture is also taken out of its listing's `images`.

## 4. Listing presentation

`POST /v1/listings` and `POST /v1/listings/:id/presentation` accept `images: [{ uploadId, alt }]`, `cover: { layout, zoom, x, y }` and `treatment: none|frame|spotlight`, and nothing else about the picture: a URL, an extra field or the same picture twice is a `422`. The presentation route changes **only** presentation; sending `ask` or `instanceIds` to it changes nothing (tested). The card art, serial, finish, price and terms are drawn from the escrowed items and are never replaced by a cover: the tile keeps the card art first, the seller picture below it with a **Seller photo** label, and the detail page says the picture is not proof of the item. Listing again carries the pictures that are still available.

## 5. Comments

Plain text only, always rendered with `textContent`. Rules (all enforced on the server, the cooldown and caps inside the transaction):

| Rule | Value |
|---|---|
| Length · markup · links · contact details | 1–300 characters; tag-like text refused; links, e-mail, handles, phone numbers and off-platform payment talk refused (shared with listing text) |
| Characters | control, zero-width and bidirectional-override characters are removed, not kept |
| Wording | a short blunt list, matched word by word after look-alike folding ("sh1t", "f.u.c.k") so "grape" and "skyscraper" are fine; a long run of one character is refused |
| Pace | 15 s cooldown, 20 an hour, 80 a day, 200 per listing; a repeat of the same words within 10 minutes is refused |
| Threads | one level of replies; the seller is marked; pagination by cursor |
| Own comment | editable 10 minutes, removable (the words are erased, the place in the thread stays) |
| Seller | can hide or show a comment on their listing (author and seller still see it) |
| Reports | one per player per target; **three different players** hold a comment (hidden from all but its author) until the operator looks |
| Open for | while the listing is open and for a week after it ends |
| Muted by the operator | refused with the date |

## 6. Reviews and reputation

A review exists only for **one completed trade between two different players**, by the buyer, **once per trade**, within 30 days; it can be changed once within a day; text ≤ 200 characters under the same text rules; 10 a day. A Quick Sell (a system redemption, no trade row) and the Simulation (never on the server) can never produce one. A probe for a trade between two other players answers the same as "not yours" (`403 not-eligible`). Held or removed reviews stop counting at once. The profile and every listing show the **sample**: the average, the number of reviews and the number of distinct buyers, with a label (none, small < 5, fair < 20, solid) and no default rating. Known limit: two colluding accounts can trade with each other to manufacture reviews; the distinct-buyer count is shown so it is visible, and the operator can remove reviews, but the beta does not detect collusion.

## 7. Follows, feed and notifications

Follow a seller (by alias) or a card; at most 100. The feed (`GET /v1/feed?scope=all|following`) lists open and sold listings by the time they were listed or sold, keyset-paginated from a partial index. A new listing from a followed seller or card writes **one notification per follower** in one statement, deduplicated if both match, skipping followers who switched it off. One statement notifies at most 200 followers of one listing (so a popular seller costs a bounded number of writes); everyone still sees it in their Following feed, which is the complete record. There is no push channel in the beta: everything waits in the Activity inbox until the game is opened, which is what "queued on reconnect" means here and what the settings page says. Preferences (`notifySocial`, `notifyFollows`, `hideComments`, up to 50 muted aliases) are stored on the server and applied inside the statement that writes the notification.

## 8. Moderation and the runbook

Operator tools: `GET /v1/admin/reports`, `POST /v1/admin/moderate`, `GET /v1/admin/log`, `GET /v1/admin/usage` (all `x-admin-token`; 404 otherwise), and the command-line wrapper `cloudflare/scripts/moderate.cjs`. Actions (each needs a reason, is sent to the player concerned and written to `moderation_log` in the same batch): `remove_comment`, `release_comment` (a held one), `remove_review`, `release_review`, `remove_upload` (deleted from R2 and from its listing), `revoke_listing` (an open listing is withdrawn, the card goes home, holds are released), `clear_listing_text`, `mute` (1–2160 hours), `unmute`, `block_uploads`, `unblock_uploads`, `dismiss_report`.

Routine:

1. `node scripts/moderate.cjs <origin> reports` once a day (and after any rise in `usage`): reports are grouped by target with the reasons and what the target is.
2. Decide. Remove the picture, comment or review, or `release-…`/`dismiss` it. A held comment or review is not visible to others until you do.
3. For a player who keeps offending: `mute` (comments and reviews) or `block-uploads`.
4. `moderate.cjs <origin> log` shows the trail. Deleting a comment does not alter a completed sale's receipt.
5. `moderate.cjs <origin> usage` shows live pictures and bytes, by status and the ten largest holders.

There is no automated image moderation; the takedown path and the report path are the control, as the brief allows.

## 9. Permissions matrix (tested)

| Operation | Anyone signed in | Owner / author | Seller of the listing | Operator |
|---|---|---|---|---|
| Read a draft picture | no (404) | yes | n/a | via remove only |
| Read a picture on a listing | yes | yes | yes | yes |
| Write to someone's upload | no (404) | yes while pending | n/a | n/a |
| Attach a picture | only their own | yes | n/a | n/a |
| Edit or remove a comment | no | yes (10 min / any time) | hide or show only | remove, release |
| Review a trade | only as its buyer | once; edit once in a day | cannot review own sale (403) | remove, release |
| Admin routes | 404 | 404 | 404 | yes |

## 10. Resource accounting (local measurement and arithmetic; not Cloudflare's meter)

- **R2**: three Class A writes per picture (one per size), plus at most 9 more for retries; deletions are free; a view is one Class B read per size, usually answered by the browser's private cache or a 304; egress is free. At the caps one player holds at most 12 pictures (≤ 9.8 MB at the per-size budgets). A realistic photo crop lands at roughly 25 / 90 / 250 KB; the generated test picture was 7 KB in all.
- **D1**: an upload is about 6 writes (slot, three variants, the status flip, the listing update); a comment is 1 write plus the notifications it makes; a profile read is 10 indexed queries; the feed is one query plus one valuation batch.
- **Worker**: every PUT is bounded by its size's byte budget (a 40 KB–600 KB body, read through a counting stream); a slot accepts 12 attempts.
- **Estimate for a beta of 200 players on the Free plan**: if each uploads 3 pictures, that is 1,800 R2 writes and about 4 MB each at most (800 MB worst case), far inside R2's 10 GB and 1 M Class A a month; D1 writes stay in the thousands a day. Not measured in production.

## 11. Evidence

| Check | Result |
|---|---|
| `npm run test:cloudflare` (api, analytics, social, economy, trading, races) | **92 / 92** (`stage-7-cloudflare-tests.txt`) |
| Social worker suite (picture lifecycle, refusals, quotas, races, presentation, moderation, comments, reviews, follows, settings, CORS) | 17 tests, included above |
| Picture refusals on known bytes: PNG, GIF, SVG with a script, HTML called a JPEG, JPEG declared WebP, WebP declared JPEG, animated WebP, JPEG cut at 95%, empty, thumb too large in pixels, too small, over its byte budget, mismatched shapes, a link instead of an id, someone else's picture | all refused with the named reason; nothing stored |
| Metadata: EXIF/GPS/comment/trailing bytes in a JPEG, EXIF/XMP chunks and flags in a WebP | absent from the stored bytes |
| `npm run check:market-social` (real interface, three accounts, local R2): upload with crop, confirmation and progress, listing, another account's feed and page, comment and reply, purchase and review, profile, follow and feed, refusals, sideways photo, cancel in flight, Director album, report and operator removal, five widths, mono and reduced motion, storage accounting | **14 / 14** (`stage-7-evidence.json`) |
| `deploy.cjs --verify` rehearsed against a local origin | 20 / 20 (adds the picture round trip; `stage-7-verify-rehearsal.txt`) |
| Regression: `test:market` 74/74; browser checks Stage 1 passed, Stage 2 18/18, Stage 3 13/13, Stage 4 9/9, Stage 5 10/10, Stage 6 11/11 | `stage-7-regression.txt` |

Screens (`docs/market-beta/screenshots/social-*.jpg`): the composer with the crop dialog, with the picture added, and a refused file; the listing page with the gallery and note; the Discover tile with the seller photo; comments with a seller reply; a profile with its reputation; Market settings with the social choices and the player's pictures; a listing after the operator removed its picture; the feed at 360, 390, 768, 1366 and 1920 px; the profile at 360 px; Discover in saved monochrome with reduced motion.

## 12. Known limits and open gates

| Item | Status |
|---|---|
| Deployed-staging upload, serve and moderation by an independent account | **not done**: needs the owner's `wrangler login`; then `deploy.cjs --apply`, `--verify <origin>` (does the round trip), `--apply-origin <origin>` |
| Actual Cloudflare usage, latency and cost | not measured; arithmetic only (section 10) |
| Server-side decoding of the compressed image data | not possible in the Workers runtime without a paid service; client decodes, server validates structure and strips |
| Image content moderation (nudity, violence) | none; reports and the operator's takedown are the control |
| Reactions on comments | not built (replies only) |
| Review collusion between accounts, and sybil accounts in general | bounded by registration limits and visible in the distinct-buyer count; not prevented |
| Turnstile on `file://` | unchanged from Stage 4: not built |
| The picture of a listing that ended is deleted after 30 days (sold) or 14 days (not sold) | by design; the listing keeps its card art and says the picture is gone |
| Reputation does not yet feed the ranking beyond the Stage 6 trust factor's sales count | the rating is shown, not scored |
| A review can be left for a bundle or a swap | yes, any completed trade; the review is about the other player |
