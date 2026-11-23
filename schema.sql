-- База сайта dilyakhakimova.com (Cloudflare D1, SQLite).
-- Применить: Cloudflare → D1 → база → Console, вставить этот файл целиком и выполнить.

-- Персональных данных здесь нет: почта, имя и аватар хранятся в России (id.dilyakhakimova.com, папка id/).
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT NOT NULL UNIQUE,             -- случайный номер ученика из id.dilyakhakimova.com ('u_…')
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen   TEXT
);

-- одноразовость пропусков от id.dilyakhakimova.com
CREATE TABLE IF NOT EXISTS pass_used (
  n    TEXT PRIMARY KEY,
  exp  INTEGER NOT NULL
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
  kind        TEXT NOT NULL,                    -- 'card' | 'predict' | 'code' | 'interview' | 'quiz' | 'task'
  key         TEXT NOT NULL,                    -- 'coin', 'shop', 'at-least-one', ...
  value       REAL,                             -- прогноз в %, номер попытки и т. п.
  points      INTEGER NOT NULL DEFAULT 0,       -- начислено сервером
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, chapter, kind, key)
);

-- Старые промокоды по баллам (больше не выдаются; оставлены для истории).
CREATE TABLE IF NOT EXISTS promo_codes (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier        INTEGER NOT NULL,                 -- 10 | 20 | 30 (процент скидки)
  code        TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  used_at     TEXT,
  PRIMARY KEY (user_id, tier)
);

CREATE TABLE IF NOT EXISTS course_promos (
  code         TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course       TEXT NOT NULL,                   -- 'vp' | 'ss' | 'ab'
  discount     INTEGER NOT NULL DEFAULT 20,     -- %
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,                   -- created_at + 1 год
  redeemed_at  TEXT,                            -- когда использован (одноразовый)
  order_ref    TEXT,                            -- номер заказа при погашении
  UNIQUE (user_id, course)
);

-- Анонимный счётчик игрушек: агрегаты по дням, без cookie, IP и пользователей (POST /api/hit).
-- Для уже работающей базы — миграция migrations/002-toy-hits.sql (та же таблица).
CREATE TABLE IF NOT EXISTS toy_hits (
  day     TEXT NOT NULL,                        -- '2026-11-24', по UTC
  slug    TEXT NOT NULL,                        -- игрушка
  place   TEXT NOT NULL,                        -- 'course' | 'play' | 'embed'
  kind    TEXT NOT NULL,                        -- 'play' | 'view' | 'share_click'
  source  TEXT NOT NULL DEFAULT '',             -- utm_source; для embed — домен сайта; '' — нет
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, slug, place, kind, source)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS page_reads (
  day       TEXT NOT NULL,                      -- '2026-11-24', по UTC
  page      TEXT NOT NULL,                      -- путь: '/shelf/kohavi-trustworthy/'
  source    TEXT NOT NULL DEFAULT '',           -- utm_source; '' — нет
  views     INTEGER NOT NULL DEFAULT 0,         -- открыли страницу
  reads     INTEGER NOT NULL DEFAULT 0,         -- загрузок, где читали хоть 5 секунд
  read_sec  INTEGER NOT NULL DEFAULT 0,         -- сумма активного времени, с; одно чтение — не больше 3600
  deep      INTEGER NOT NULL DEFAULT 0,         -- дочитали до 90% страницы
  PRIMARY KEY (day, page, source)
) WITHOUT ROWID;

-- Посмотреть (Console):
-- SELECT page, SUM(views) AS views, ROUND(1.0*SUM(read_sec)/MAX(SUM(reads),1)/60,1) AS avg_min,
--        ROUND(100.0*SUM(deep)/MAX(SUM(reads),1)) AS deep_pct
-- FROM page_reads GROUP BY page ORDER BY views DESC;
