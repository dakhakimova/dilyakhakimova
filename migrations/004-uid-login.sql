-- Миграция 004 (решение Дили, 22.11.2026): вход через российский сервис id.dilyakhakimova.com.
-- На Cloudflare больше нет персональных данных: ни имени, ни ника, ни фото, ни id в Telegram — только случайный номер ученика uid.
-- Вход через Telegram убран (с 07.07.2026 вход через иностранные сервисы на российских сайтах запрещён, ст. 13.55 КоАП).
-- Прогресс прежних «телеграмных» учеников остаётся в базе под номером 'tg-<id>', но войти в эти записи больше нельзя.
-- Применить: D1 → Console или  npx wrangler d1 execute dilyakhakimova --remote --file=migrations/004-uid-login.sql
-- Запускать ОДИН раз (пересоздаёт таблицу users).
PRAGMA foreign_keys = OFF;
CREATE TABLE users_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uid         TEXT NOT NULL UNIQUE,             -- случайный номер ученика из id.dilyakhakimova.com ('u_…')
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen   TEXT
);
INSERT INTO users_new (id, uid, created_at, last_seen) SELECT id, 'tg-' || tg_id, created_at, last_seen FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
DELETE FROM sessions;
-- одноразовость пропусков: номер пропуска живёт, пока не истёк срок
CREATE TABLE IF NOT EXISTS pass_used (
  n    TEXT PRIMARY KEY,
  exp  INTEGER NOT NULL
);
PRAGMA foreign_keys = ON;
