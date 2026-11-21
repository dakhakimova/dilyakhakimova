-- Миграция 002: анонимный счётчик игрушек (POST /api/hit, functions/api/hit.js).
-- Применить к уже работающей базе: Cloudflare → D1 → dilyakhakimova → Console, вставить этот файл, выполнить.
-- (или: npx wrangler d1 execute dilyakhakimova --remote --file=migrations/002-toy-hits.sql)
-- Существующие таблицы не трогает; повторный запуск безопасен (IF NOT EXISTS). Та же таблица есть в schema.sql для новой базы.
-- Только агрегаты по дням: ни cookie, ни IP, ни id пользователя здесь нет.
CREATE TABLE IF NOT EXISTS toy_hits (
  day     TEXT NOT NULL,                        -- '2026-11-24', по UTC
  slug    TEXT NOT NULL,                        -- игрушка: 'galton', 'peeking', …
  place   TEXT NOT NULL,                        -- 'course' — в главе курса | 'play' — на /play/<slug>/ | 'embed' — встроена на чужой сайт
  kind    TEXT NOT NULL,                        -- 'play' — первое взаимодействие за загрузку | 'view' — открыли /play/<slug>/ | 'share_click' — нажали «поделиться»
  source  TEXT NOT NULL DEFAULT '',             -- utm_source ссылки; для embed — домен сайта, где встроено; '' — нет
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, slug, place, kind, source)
) WITHOUT ROWID;
