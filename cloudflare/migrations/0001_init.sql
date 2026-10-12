-- Cardable Market Beta, online beta schema v1.
-- Authority model: this one D1 database is the source of truth. Every mutation is a single `batch()` (one SQLite
-- transaction) whose statements carry guards (WHERE clauses and CHECK / UNIQUE constraints), so a race or a retry can
-- only fail whole, never half-apply. Durable Objects (Gate) rate-limit and serialize per account; they own no data.

CREATE TABLE schema_info (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO schema_info (key, value) VALUES ('schema', '1'), ('environment', 'beta');

-- A private account. Nothing here is ever shown to another player except `alias`.
CREATE TABLE accounts (
  id             TEXT PRIMARY KEY,
  alias          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at     INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  imported       INTEGER NOT NULL DEFAULT 0 CHECK (imported IN (0, 1)),
  recovery_hash  TEXT NOT NULL UNIQUE,
  CHECK (length(alias) BETWEEN 5 AND 40)
);

CREATE TABLE sessions (
  id                 TEXT PRIMARY KEY,
  account_id         TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  refresh_hash       TEXT NOT NULL UNIQUE,
  prev_refresh_hash  TEXT,
  created_at         INTEGER NOT NULL,
  expires_at         INTEGER NOT NULL,
  last_used_at       INTEGER NOT NULL,
  revoked_at         INTEGER,
  label              TEXT
);
CREATE INDEX sessions_by_account ON sessions(account_id, revoked_at);

-- Online Credits. A separate wallet from the offline game's, with its own ledger. Starts at 0.
CREATE TABLE wallets (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  held       INTEGER NOT NULL DEFAULT 0 CHECK (held >= 0 AND held <= balance),
  version    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ledger (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id    TEXT NOT NULL REFERENCES accounts(id),
  at            INTEGER NOT NULL,
  delta         INTEGER NOT NULL CHECK (delta <> 0),
  reason        TEXT NOT NULL,
  ref           TEXT,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  idem          TEXT,
  UNIQUE (account_id, idem)
);
CREATE INDEX ledger_by_account ON ledger(account_id, id DESC);

-- Online-owned card instances. `id` is server-issued; the offline instance id is never trusted as identity.
CREATE TABLE instances (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES accounts(id),
  card_id     TEXT NOT NULL,
  variant_id  TEXT,
  skin_id     TEXT,
  serial      TEXT NOT NULL UNIQUE,
  origin_code TEXT NOT NULL,
  pack_id     TEXT,
  pulled_at   INTEGER,
  source      TEXT NOT NULL CHECK (source IN ('legacy-import', 'online-pack')),
  state       TEXT NOT NULL DEFAULT 'owned' CHECK (state IN ('owned', 'escrow', 'redeemed')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX instances_by_owner ON instances(owner_id, state, card_id);

-- One-time beta conversion of an offline collection. One per account, one per package, ever.
CREATE TABLE imports (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  package_hash  TEXT NOT NULL UNIQUE,
  origin_code   TEXT NOT NULL,
  item_count    INTEGER NOT NULL CHECK (item_count >= 0),
  rejected      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  receipt_sig   TEXT NOT NULL,
  idem          TEXT UNIQUE
);

CREATE TABLE import_previews (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  package_hash TEXT NOT NULL,
  summary      TEXT NOT NULL,
  items        TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX import_previews_by_account ON import_previews(account_id, created_at DESC);

-- Replays of the same request return the first answer; the same key with a different body is refused.
CREATE TABLE idempotency (
  account_id   TEXT NOT NULL,
  key          TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response     TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (account_id, key)
);

-- Listings and prices exist in the schema so Stage 5 only adds mutations. No row is ever written by a bot or a fixture.
CREATE TABLE listings (
  id          TEXT PRIMARY KEY,
  seller_id   TEXT NOT NULL REFERENCES accounts(id),
  format      TEXT NOT NULL CHECK (format IN ('buy-now', 'auction', 'swap')),
  status      TEXT NOT NULL CHECK (status IN ('active', 'sold', 'expired', 'cancelled', 'settling')),
  ask         INTEGER CHECK (ask IS NULL OR ask >= 1),
  title       TEXT,
  created_at  INTEGER NOT NULL,
  ends_at     INTEGER
);
CREATE INDEX listings_active ON listings(status, ends_at, created_at DESC);

CREATE TABLE listing_items (
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL UNIQUE REFERENCES instances(id),
  PRIMARY KEY (listing_id, instance_id)
);

CREATE TABLE price_observations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          INTEGER NOT NULL,
  card_key    TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 1),
  kind        TEXT NOT NULL CHECK (kind IN ('fixed', 'auction', 'buyout'))
);
CREATE INDEX price_by_card ON price_observations(card_key, at DESC);

CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  at          INTEGER NOT NULL,
  kind        TEXT NOT NULL,
  body        TEXT NOT NULL,
  read_at     INTEGER
);
CREATE INDEX notifications_by_account ON notifications(account_id, id DESC);

CREATE TABLE settings (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
