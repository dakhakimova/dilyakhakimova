-- Промокоды за пройденные бесплатные курсы (решение Дили, 22.11.2026): один код на пару (пользователь, курс),
-- 20% на платный курс, одноразовый, действует год, можно подарить. На одну покупку — один код (не складываются).
-- Применить к работающей базе: D1 → Console или
--   npx wrangler d1 execute dilyakhakimova --remote --file=migrations/003-course-promos.sql
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
