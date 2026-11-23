-- Миграция 005: анонимный счётчик чтения страниц (POST /api/read, functions/api/read.js).
-- Применить к работающей базе: Cloudflare → D1 → dilyakhakimova → Console, вставить этот файл, выполнить.
-- (или: npx wrangler d1 execute dilyakhakimova --remote --file=migrations/005-page-reads.sql)
-- Только агрегаты по дням и страницам: ни cookie, ни IP, ни id пользователя.
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
