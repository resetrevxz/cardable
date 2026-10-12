-- Import hardening (security review of stage 4):
--  * one import per origin code (a save has one player code), so a second account cannot claim cards under it;
--  * an Idempotency-Key is unique per account, not globally, so one account's key can never block another's.
-- `imports` is referenced by no other table, so it is rebuilt in place.
CREATE TABLE imports_v2 (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  package_hash  TEXT NOT NULL UNIQUE,
  origin_code   TEXT NOT NULL UNIQUE,
  item_count    INTEGER NOT NULL CHECK (item_count >= 0),
  rejected      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  receipt_sig   TEXT NOT NULL,
  idem          TEXT,
  UNIQUE (account_id, idem)
);
INSERT INTO imports_v2 (id, account_id, package_hash, origin_code, item_count, rejected, created_at, receipt_sig, idem)
  SELECT id, account_id, package_hash, origin_code, item_count, rejected, created_at, receipt_sig, idem FROM imports;
DROP TABLE imports;
ALTER TABLE imports_v2 RENAME TO imports;
UPDATE schema_info SET value = '2' WHERE key = 'schema';
