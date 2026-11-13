# dilyakhakimova.com

Личный сайт Дили Хакимовой. Статический сайт: `index.html` в корне, сборка не нужна.
Хостинг — Cloudflare Pages, подключён к ветке `main`: каждое изменение в `main` публикуется автоматически.

## Бэкенд: вход через Telegram, прогресс и баллы

Серверная часть — Cloudflare Pages Functions в папке `functions/api/` и база D1 (`schema.sql`).

| Адрес | Что делает |
|---|---|
| `POST /api/auth/telegram` | вход через Telegram Login Widget, проверка подписи, cookie-сессия на 30 дней |
| `GET /api/me` | имя, баллы, прогресс по главам, калибровка, промокоды |
| `POST /api/event` | события прохождения пачкой; баллы начисляет сервер |
| `POST /api/logout` | выход |
| `GET /api/config` | имя бота для кнопки входа |

Правила баллов и пороги скидок — в `functions/api/_lib.js` (`RULES`, `PTS`, `TIERS`, `PLANNED_MAX`).
Новая глава = новая запись в `RULES` и вызовы `SignalProgress.track(...)` на её странице.

### Настройка в Cloudflare (один раз)
1. **База:** Workers & Pages → D1 SQL Database → Create → имя `dilyakhakimova`. В базе открыть Console, вставить содержимое `schema.sql`, выполнить.
2. **Привязка базы к сайту:** проект `dilyakhakimova` → Settings → Bindings → Add → D1 database → Variable name `DB`, база `dilyakhakimova`. Для Production и Preview.
3. **Бот:** в Telegram у @BotFather — `/newbot`, затем `/setdomain` → `dilyakhakimova.com`.
4. **Переменные:** проект → Settings → Variables and secrets:
   - `TELEGRAM_BOT_NAME` — имя бота без @ (обычная переменная);
   - `TELEGRAM_BOT_TOKEN` — токен от BotFather (тип **Secret**).
5. Пересобрать последний деплой (Deployments → … → Retry deployment), чтобы привязки подхватились.

Локальная проверка: `wrangler d1 execute site --local --file=schema.sql`, затем `wrangler pages dev .` с `wrangler.toml` и `.dev.vars` вне репозитория (в репозиторий их не класть: `wrangler.toml` в корне перебивает настройки привязок в панели Cloudflare).
