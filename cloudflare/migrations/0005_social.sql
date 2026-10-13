-- Cardable Market Beta, schema v5: custom listings, uploaded images, profiles, comments, reviews, follows, moderation
-- (Stage 7). Rules of this schema:
--  * an image is private to its owner until it is attached to a listing, and public only through that listing;
--  * a review exists only for one completed trade between two different players, once;
--  * nothing here stores or exposes anything about a player except the alias (no account id leaves the server);
--  * every operator action leaves a row in `moderation_log`.

-- More guard codes: an upload that cannot be used, a repeat, and an edit window that has closed.
ALTER TABLE _guard ADD COLUMN media     TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE _guard ADD COLUMN duplicate TEXT NOT NULL DEFAULT 'ok';
ALTER TABLE _guard ADD COLUMN edit_closed TEXT NOT NULL DEFAULT 'ok';

-- Operator restrictions. Both are reversible and both are logged.
ALTER TABLE accounts ADD COLUMN muted_until     INTEGER;
ALTER TABLE accounts ADD COLUMN uploads_blocked INTEGER NOT NULL DEFAULT 0 CHECK (uploads_blocked IN (0, 1));

-- ---- uploaded images ----------------------------------------------------------------------------------------------
-- One row per picture. The picture itself is three validated variants in R2 (thumb, card, full); the keys carry a random
-- nonce, so a replaced variant is a new object and a lost race can never leave the row pointing at the wrong bytes.
CREATE TABLE uploads (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'attached', 'removed', 'expired')),
  source       TEXT NOT NULL DEFAULT 'file' CHECK (source IN ('file', 'director')),
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  alt          TEXT NOT NULL DEFAULT '',
  listing_id   TEXT REFERENCES listings(id),
  position     INTEGER,
  removed_at   INTEGER,
  removed_by   TEXT,
  removed_note TEXT
);
CREATE INDEX uploads_by_account ON uploads(account_id, status, created_at DESC);
CREATE INDEX uploads_by_listing ON uploads(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX uploads_by_expiry  ON uploads(status, expires_at);

CREATE TABLE upload_variants (
  upload_id  TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  variant    TEXT NOT NULL CHECK (variant IN ('thumb', 'card', 'full')),
  object_key TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('image/webp', 'image/jpeg')),
  width      INTEGER NOT NULL CHECK (width > 0),
  height     INTEGER NOT NULL CHECK (height > 0),
  bytes      INTEGER NOT NULL CHECK (bytes > 0),
  stripped   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (upload_id, variant)
);

-- ---- how a listing is presented ------------------------------------------------------------------------------------
-- `images` is the ordered list of attached uploads as the listing shows them; the first is the cover. `cover` is the
-- crop (layout, zoom, focus) and `treatment` one of a few restrained looks. None of it changes what is for sale.
ALTER TABLE listings ADD COLUMN images    TEXT NOT NULL DEFAULT '[]';
ALTER TABLE listings ADD COLUMN cover     TEXT;
ALTER TABLE listings ADD COLUMN treatment TEXT NOT NULL DEFAULT 'none' CHECK (treatment IN ('none', 'frame', 'spotlight'));
ALTER TABLE listings ADD COLUMN feed_at   INTEGER;
UPDATE listings SET feed_at = COALESCE(closed_at, created_at) WHERE feed_at IS NULL;
-- A listing appearing or getting cheaper is one row here, written in the same transaction as the change. `seq` is
-- assigned in commit order (writers do not interleave), so a reader that has seen seq N has seen every event up to N:
-- an alert's watermark is a position in this log, never a clock reading, and cannot jump past a commit.
CREATE TABLE listing_events (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  at         INTEGER NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('listed', 'repriced'))
);
CREATE INDEX listing_events_by_listing ON listing_events(listing_id);
-- Each alert remembers how far along the log it has looked.
ALTER TABLE alerts ADD COLUMN checked_seq INTEGER NOT NULL DEFAULT 0;
ALTER TABLE alerts ADD COLUMN last_look_at INTEGER;
CREATE INDEX listings_by_feed ON listings(feed_at DESC, id) WHERE status IN ('active', 'sold');

-- ---- comments -------------------------------------------------------------------------------------------------------
-- One level of replies. A removed comment keeps its row (so a thread stays readable and a report stays attached) but
-- never its words.
CREATE TABLE comments (
  id         TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  author_id  TEXT NOT NULL REFERENCES accounts(id),
  parent_id  TEXT REFERENCES comments(id),
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'held', 'author_removed', 'seller_hidden', 'removed')),
  created_at INTEGER NOT NULL,
  edited_at  INTEGER,
  reports    INTEGER NOT NULL DEFAULT 0,
  note       TEXT
);
CREATE INDEX comments_by_listing ON comments(listing_id, parent_id, created_at, id);
CREATE INDEX comments_by_author  ON comments(author_id, created_at DESC);

-- ---- reviews: buyer-rated reputation, earned only from a completed trade ------------------------------------------
CREATE TABLE reviews (
  id         TEXT PRIMARY KEY,
  trade_id   TEXT NOT NULL UNIQUE REFERENCES trades(id),
  seller_id  TEXT NOT NULL REFERENCES accounts(id),
  buyer_id   TEXT NOT NULL REFERENCES accounts(id),
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'held', 'removed')),
  created_at INTEGER NOT NULL,
  edited_at  INTEGER,
  reports    INTEGER NOT NULL DEFAULT 0,
  CHECK (seller_id <> buyer_id)
);
CREATE INDEX reviews_by_seller ON reviews(seller_id, status, created_at DESC);
CREATE INDEX reviews_by_buyer  ON reviews(buyer_id, created_at DESC);

-- ---- follows -------------------------------------------------------------------------------------------------------
-- `target` is the seller's account id (never shown) or a card id.
CREATE TABLE follows (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('seller', 'card')),
  target     TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, kind, target)
);
CREATE INDEX follows_by_target ON follows(kind, target);

-- ---- reports and the operator's log ----------------------------------------------------------------------------------
CREATE TABLE reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES accounts(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('comment', 'review', 'upload', 'listing')),
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER,
  resolved_by TEXT,
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX reports_by_status ON reports(status, created_at);
CREATE INDEX reports_by_target ON reports(target_type, target_id, status);

CREATE TABLE moderation_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          INTEGER NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  detail      TEXT
);
CREATE INDEX moderation_by_target ON moderation_log(target_type, target_id);

UPDATE schema_info SET value = '5' WHERE key = 'schema';
