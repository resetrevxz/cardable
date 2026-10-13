-- Cardable Market Beta, schema v4: analytics, cost basis, alerts and search (Stage 6).
-- Source-of-truth rules: `price_observations` is exactly the completed Credit sales of ONE card between two players.
-- Quick Sell, swaps, bundles, offers and cancelled orders never write a row, so every chart and total is derived from it
-- (or from `trades`, which carries the same sales plus bundles and barters, kept apart).

ALTER TABLE price_observations ADD COLUMN card_id TEXT;
UPDATE price_observations SET card_id = substr(card_key, 1, instr(card_key, '|') - 1) WHERE card_id IS NULL;
CREATE INDEX obs_by_card_at ON price_observations(card_id, at);
CREATE INDEX obs_by_key_at  ON price_observations(card_key, at);
CREATE INDEX obs_by_at      ON price_observations(at);

-- Cost basis: what a held card cost, when the market itself set it. A card from an import or a swap has none, and is
-- reported as "No cost basis" rather than as free.
ALTER TABLE instances ADD COLUMN basis INTEGER CHECK (basis IS NULL OR basis >= 0);
ALTER TABLE instances ADD COLUMN acquired_via TEXT;
ALTER TABLE instances ADD COLUMN acquired_at INTEGER;
ALTER TABLE trades ADD COLUMN seller_basis INTEGER;
ALTER TABLE redemptions ADD COLUMN basis INTEGER;

-- Listing search facets that an index can serve.
ALTER TABLE listings ADD COLUMN serial_n INTEGER;
ALTER TABLE listings ADD COLUMN brand TEXT;
ALTER TABLE listings ADD COLUMN generation TEXT;
ALTER TABLE listings ADD COLUMN tier INTEGER;
CREATE INDEX listings_search_rarity ON listings(status, rarity, kind, price);
CREATE INDEX listings_search_brand  ON listings(status, brand, price);
CREATE INDEX listings_search_gen    ON listings(status, generation, price);

-- Alerts: a price threshold on a card, or a saved search. Delivered as a notification in the in-app inbox when a real
-- listing matches. There is no push channel in the beta, so nothing is promised while the game is closed.
CREATE TABLE alerts (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('price', 'search')),
  card_id     TEXT,
  variant_id  TEXT,
  max_price   INTEGER CHECK (max_price IS NULL OR max_price >= 1),
  query       TEXT,
  label       TEXT NOT NULL DEFAULT '',
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  INTEGER NOT NULL,
  last_hit_at INTEGER
);
CREATE INDEX alerts_by_account ON alerts(account_id, active);
CREATE INDEX alerts_by_card    ON alerts(card_id, active);
CREATE TABLE alert_hits (
  alert_id   TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  at         INTEGER NOT NULL,
  PRIMARY KEY (alert_id, listing_id)
);

UPDATE schema_info SET value = '4' WHERE key = 'schema';
