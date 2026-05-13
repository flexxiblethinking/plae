-- 0001_init: users + usage_log
--
-- users.user_id is sha256(lowercased email) — PII is never stored in plain text.
-- usage_log records every model call; daily quota is derived by COUNT on a time window.

CREATE TABLE IF NOT EXISTS users (
  user_id      TEXT    PRIMARY KEY,
  email_domain TEXT    NOT NULL,
  role         TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT    NOT NULL REFERENCES users(user_id),
  mode        TEXT    NOT NULL CHECK (mode IN ('strudel', 'musicgen')),
  status      TEXT    NOT NULL CHECK (status IN ('ok', 'error', 'blocked')),
  created_at  INTEGER NOT NULL,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_usage_user_created
  ON usage_log (user_id, created_at);
