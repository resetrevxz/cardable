-- One linked game and one active device. Gameplay is trusted; transactions still conserve ownership and holds.
ALTER TABLE accounts ADD COLUMN actor_kind TEXT NOT NULL DEFAULT 'player' CHECK(actor_kind IN ('player','trader'));
ALTER TABLE instances ADD COLUMN game_data TEXT;
ALTER TABLE instances ADD COLUMN game_removed INTEGER NOT NULL DEFAULT 0 CHECK(game_removed IN (0,1));
ALTER TABLE idempotency ADD COLUMN durable INTEGER NOT NULL DEFAULT 0;
CREATE TABLE game_links (
 account_id TEXT PRIMARY KEY REFERENCES accounts(id),
 device_id TEXT NOT NULL,
 origin_id TEXT NOT NULL UNIQUE,
 sequence INTEGER NOT NULL DEFAULT 0,
 serial_counter INTEGER NOT NULL DEFAULT 0,
 receipt TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TABLE game_mapping (
 account_id TEXT NOT NULL REFERENCES accounts(id),
 local_id TEXT NOT NULL,
 instance_id TEXT NOT NULL REFERENCES instances(id),
 PRIMARY KEY(account_id,local_id)
);
CREATE TABLE game_operations (
 account_id TEXT NOT NULL REFERENCES accounts(id),
 operation_id TEXT NOT NULL,
 body_hash TEXT NOT NULL,
 PRIMARY KEY(account_id,operation_id)
);
CREATE TABLE trader_runs (slot INTEGER PRIMARY KEY, created_at INTEGER NOT NULL);
UPDATE schema_info SET value = '7' WHERE key = 'schema';
