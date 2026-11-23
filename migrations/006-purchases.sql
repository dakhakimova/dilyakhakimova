-- Купленные платные курсы — для блока «Мои курсы» в кабинете (24.11.2026): купленный курс виден сразу, даже без прогресса.
-- Строку добавляет обработчик оплаты, когда он появится. Применить:
--   npx wrangler d1 execute dilyakhakimova --remote --file=migrations/006-purchases.sql
CREATE TABLE IF NOT EXISTS purchases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course      TEXT NOT NULL,                     -- 'abm' | 'stats' | …
  order_ref   TEXT,                              -- номер заказа у платёжного сервиса
  promo_code  TEXT,                              -- если оплачено с промокодом
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course)
);
