-- База сайта dilyakhakimova.com (Cloudflare D1, SQLite).
-- Применить: Cloudflare → D1 → база → Console, вставить этот файл целиком и выполнить.

CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id       INTEGER NOT NULL UNIQUE,          -- id пользователя в Telegram
  first_name  TEXT,
  username    TEXT,
  photo_url   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen   TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,                 -- SHA-256 от токена из cookie; сам токен не храним
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- Одно событие на (пользователь, глава, вид, ключ): повторные отправки не дают новых баллов.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter     TEXT NOT NULL,                    -- 'ch01'
  kind        TEXT NOT NULL,                    -- 'card' | 'predict' | 'code' | 'interview'
  key         TEXT NOT NULL,                    -- 'coin', 'shop', 'at-least-one', ...
  value       REAL,                             -- прогноз в %, номер попытки и т. п.
  points      INTEGER NOT NULL DEFAULT 0,       -- начислено сервером
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, chapter, kind, key)
);

-- Персональные промокоды на «A/B без мифов».
CREATE TABLE IF NOT EXISTS promo_codes (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier        INTEGER NOT NULL,                 -- 10 | 20 | 30 (процент скидки)
  code        TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  used_at     TEXT,
  PRIMARY KEY (user_id, tier)
);
