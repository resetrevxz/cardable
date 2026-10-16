-- Cardable Market Beta, schema v6: the operator's switches and their log (Stage 8).
--  * `ops_state` holds the service mode: open (normal), read-only (reads answer, writes are refused) or maintenance
--    (everything but the status page is refused and nothing settles). It is changed only through the operator route;
--  * `ops_log` records every change, with who made it and why. Nothing here touches Credits, cards or listings.
CREATE TABLE ops_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
INSERT INTO ops_state (key, value, updated_at) VALUES ('mode', 'open', 0), ('message', '', 0);

CREATE TABLE ops_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     INTEGER NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);

UPDATE schema_info SET value = '6' WHERE key = 'schema';
