-- Cardable Market Beta, schema v3: real player trading (Stage 5).
-- Rules of this schema, enforced by the database and not only by code:
--  * a card instance is in exactly one place: owned, in escrow under one listing or offer, or redeemed;
--  * a wallet never has a negative balance and never holds more than its balance;
--  * every Credit change has a ledger row and every hold has a hold row, so both can be reconciled;
--  * a listing, order or offer changes only through a guarded transaction that checks its version.
-- Listings were an always-empty shell until now, so they are rebuilt rather than migrated.

-- A guard is an INSERT that fails, naming the broken rule in the column of the error, when its condition is false.
-- Rows are never stored: every guard either inserts nothing or aborts the whole transaction.
CREATE TABLE _guard (
  stale         TEXT NOT NULL DEFAULT 'ok',
  funds         TEXT NOT NULL DEFAULT 'ok',
  closed        TEXT NOT NULL DEFAULT 'ok',
  not_owned     TEXT NOT NULL DEFAULT 'ok',
  busy          TEXT NOT NULL DEFAULT 'ok',
  price_changed TEXT NOT NULL DEFAULT 'ok',
  limit_hit     TEXT NOT NULL DEFAULT 'ok',
  own           TEXT NOT NULL DEFAULT 'ok',
  quota         TEXT NOT NULL DEFAULT 'ok',
  conflict      TEXT NOT NULL DEFAULT 'ok'
);

ALTER TABLE instances ADD COLUMN escrow_ref TEXT;
CREATE INDEX instances_by_escrow ON instances(escrow_ref) WHERE escrow_ref IS NOT NULL;
ALTER TABLE notifications ADD COLUMN ref TEXT;
ALTER TABLE price_observations ADD COLUMN trade_id TEXT;

DROP TABLE listing_items;
DROP TABLE listings;
CREATE TABLE listings (
  id            TEXT PRIMARY KEY,
  seller_id     TEXT NOT NULL REFERENCES accounts(id),
  kind          TEXT NOT NULL CHECK (kind IN ('fixed', 'auction', 'swap')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'cancelled')),
  ask           INTEGER CHECK (ask IS NULL OR ask >= 1),
  start_price   INTEGER CHECK (start_price IS NULL OR start_price >= 1),
  reserve       INTEGER CHECK (reserve IS NULL OR reserve >= 1),
  buyout        INTEGER CHECK (buyout IS NULL OR buyout >= 1),
  step          INTEGER CHECK (step IS NULL OR step >= 1),
  price         INTEGER NOT NULL CHECK (price >= 0),
  bid_count     INTEGER NOT NULL DEFAULT 0,
  bidder_count  INTEGER NOT NULL DEFAULT 0,
  leader_id     TEXT REFERENCES accounts(id),
  title         TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  wants         TEXT,
  min_topup     INTEGER NOT NULL DEFAULT 0 CHECK (min_topup >= 0),
  card_id       TEXT NOT NULL,
  variant_id    TEXT,
  skin_id       TEXT,
  rarity        TEXT NOT NULL,
  item_count    INTEGER NOT NULL CHECK (item_count BETWEEN 1 AND 6),
  items         TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  ends_at       INTEGER NOT NULL,
  first_ends_at INTEGER NOT NULL,
  extensions    INTEGER NOT NULL DEFAULT 0,
  version       INTEGER NOT NULL DEFAULT 0,
  closed_at     INTEGER,
  sold_price    INTEGER,
  fee           INTEGER,
  buyer_id      TEXT REFERENCES accounts(id),
  end_note      TEXT,
  snipe_note    TEXT,
  relist_of     TEXT,
  CHECK (kind <> 'fixed' OR ask IS NOT NULL),
  CHECK (kind <> 'auction' OR start_price IS NOT NULL)
);
CREATE INDEX listings_by_status_end   ON listings(status, ends_at);
CREATE INDEX listings_by_seller       ON listings(seller_id, status, created_at DESC);
CREATE INDEX listings_by_card         ON listings(card_id, status, price);
CREATE INDEX listings_by_price        ON listings(status, price, id);
CREATE INDEX listings_by_created      ON listings(status, created_at DESC, id);
CREATE INDEX listings_by_leader       ON listings(leader_id, status);

-- Active attachments only: a row exists while the card is in escrow under the listing. Closing the listing deletes
-- its rows, so a card can be listed again, and a card can never be in two live listings (UNIQUE).
CREATE TABLE listing_items (
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL UNIQUE REFERENCES instances(id),
  PRIMARY KEY (listing_id, instance_id)
);

-- One proxy per bidder per listing. `max_amount` is private: no endpoint returns another bidder's.
CREATE TABLE bids (
  listing_id  TEXT NOT NULL REFERENCES listings(id),
  bidder_id   TEXT NOT NULL REFERENCES accounts(id),
  max_amount  INTEGER NOT NULL CHECK (max_amount >= 1),
  seq         INTEGER NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  placed_at   INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (listing_id, bidder_id),
  UNIQUE (listing_id, seq)
);
CREATE INDEX bids_by_bidder ON bids(bidder_id, active);

CREATE TABLE bid_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id   TEXT NOT NULL REFERENCES listings(id),
  at           INTEGER NOT NULL,
  bidder_id    TEXT NOT NULL REFERENCES accounts(id),
  price_after  INTEGER NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('bid', 'extend', 'buyout')),
  leader_changed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX bid_events_by_listing ON bid_events(listing_id, id DESC);

-- Credits reserved for something open. wallets.held is always the sum of the open holds.
CREATE TABLE holds (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  kind        TEXT NOT NULL CHECK (kind IN ('bid', 'order', 'offer')),
  ref         TEXT NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount >= 1),
  created_at  INTEGER NOT NULL,
  released_at INTEGER,
  outcome     TEXT
);
CREATE UNIQUE INDEX holds_open ON holds(kind, ref, account_id) WHERE released_at IS NULL;
CREATE INDEX holds_by_account ON holds(account_id, released_at);

CREATE TABLE orders (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  card_id     TEXT NOT NULL,
  variant_id  TEXT,
  any_finish  INTEGER NOT NULL DEFAULT 0 CHECK (any_finish IN (0, 1)),
  skin_id     TEXT,
  any_skin    INTEGER NOT NULL DEFAULT 1 CHECK (any_skin IN (0, 1)),
  max_price   INTEGER NOT NULL CHECK (max_price >= 1),
  quantity    INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  filled      INTEGER NOT NULL DEFAULT 0,
  spent       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'expired')),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  closed_at   INTEGER,
  version     INTEGER NOT NULL DEFAULT 0,
  CHECK (filled >= 0 AND filled <= quantity)
);
CREATE INDEX orders_open_by_card ON orders(card_id, status, max_price DESC, created_at);
CREATE INDEX orders_by_account   ON orders(account_id, status, created_at DESC);

CREATE TABLE offers (
  id          TEXT PRIMARY KEY,
  listing_id  TEXT NOT NULL REFERENCES listings(id),
  from_id     TEXT NOT NULL REFERENCES accounts(id),
  to_id       TEXT NOT NULL REFERENCES accounts(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  awaiting    TEXT NOT NULL DEFAULT 'seller' CHECK (awaiting IN ('seller', 'offerer')),
  round       INTEGER NOT NULL DEFAULT 0,
  cash        INTEGER NOT NULL DEFAULT 0 CHECK (cash >= 0),
  refund      INTEGER NOT NULL DEFAULT 0 CHECK (refund >= 0),
  message     TEXT NOT NULL DEFAULT '',
  items       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  closed_at   INTEGER,
  note        TEXT,
  version     INTEGER NOT NULL DEFAULT 0,
  CHECK (cash = 0 OR refund = 0),
  CHECK (from_id <> to_id)
);
CREATE INDEX offers_by_listing ON offers(listing_id, status);
CREATE INDEX offers_by_from    ON offers(from_id, status, updated_at DESC);
CREATE INDEX offers_by_to      ON offers(to_id, status, updated_at DESC);

CREATE TABLE offer_items (
  offer_id    TEXT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL UNIQUE REFERENCES instances(id),
  PRIMARY KEY (offer_id, instance_id)
);

-- A completed exchange between two players. A price observation is written only for a Credit sale of one card.
CREATE TABLE trades (
  id          TEXT PRIMARY KEY,
  at          INTEGER NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('fixed', 'auction', 'buyout', 'order', 'swap')),
  listing_id  TEXT REFERENCES listings(id),
  seller_id   TEXT NOT NULL REFERENCES accounts(id),
  buyer_id    TEXT NOT NULL REFERENCES accounts(id),
  price       INTEGER NOT NULL CHECK (price >= 0),
  fee         INTEGER NOT NULL CHECK (fee >= 0),
  item_count  INTEGER NOT NULL,
  card_id     TEXT NOT NULL,
  variant_id  TEXT,
  skin_id     TEXT,
  items       TEXT NOT NULL,
  given       TEXT,
  attributed  INTEGER NOT NULL DEFAULT 0 CHECK (attributed IN (0, 1)),
  CHECK (seller_id <> buyer_id)
);
CREATE INDEX trades_by_at       ON trades(at DESC, id);
CREATE INDEX trades_by_card     ON trades(card_id, at DESC);
CREATE INDEX trades_by_seller   ON trades(seller_id, at DESC);
CREATE INDEX trades_by_buyer    ON trades(buyer_id, at DESC);

CREATE TABLE order_fills (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  listing_id  TEXT NOT NULL REFERENCES listings(id),
  trade_id    TEXT NOT NULL REFERENCES trades(id),
  price       INTEGER NOT NULL,
  at          INTEGER NOT NULL
);
CREATE INDEX order_fills_by_order ON order_fills(order_id);

-- The system redemption (Quick Sell). It is not a trade: it never enters `trades` or `price_observations`.
CREATE TABLE redemptions (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  at          INTEGER NOT NULL,
  instance_id TEXT NOT NULL UNIQUE REFERENCES instances(id),
  card_id     TEXT NOT NULL,
  variant_id  TEXT,
  skin_id     TEXT,
  serial      TEXT NOT NULL,
  quote       INTEGER NOT NULL CHECK (quote >= 1),
  fair        INTEGER NOT NULL,
  baseline    INTEGER NOT NULL,
  op_id       TEXT NOT NULL
);
CREATE INDEX redemptions_by_account ON redemptions(account_id, at DESC);
CREATE INDEX redemptions_by_day     ON redemptions(at);

UPDATE schema_info SET value = '3' WHERE key = 'schema';
