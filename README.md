# dilyakhakimova.com

Личный сайт Дили Хакимовой. Статический сайт: `index.html` в корне, сборка не нужна.
Главная: `index.html` + `home.css` + `home.js`, все тексты — в словаре `i18n/home.js`. После правки словаря запустить `node tools/bake-i18n.js` (вписывает русский текст в HTML; `node tools/bake-i18n.js en` позже соберёт `/en/`). Прежняя главная-«тетрадь» теперь `/about/`.

Лендинги курсов: `/probability/`, `/stats/`, `/ab/` («A/B без мифов»), `/causal/` — `<курс>/index.html` + общие `home.css`, `course.css`, `landing.js`; тексты — в `i18n/site.js` (шапка, футер, общие блоки) и `i18n/<курс>.js`. У `/signal/` и `/ab-basics/` своя вёрстка: блоки лендинга вписаны прямо в их `index.html`, а типограф прогоняется по кускам между `<!-- typo -->` и `<!-- /typo -->`. Один запуск `node tools/bake-i18n.js` обновляет все страницы.

Хостинг — Cloudflare Pages, подключён к ветке `main`: каждое изменение в `main` публикуется автоматически.

## Игрушки /play/

Отдельная страница игрушки — `/play/<slug>/`, каталог — `/play/`. Код игрушки не копируется: страница показывает карточку главы курса в iframe в **соло-режиме** (`<глава>?toy=<slug>`: только карточка прогноза и игрушка, без шапки и листалки, без баллов; мост — `play/bridge.js`, подключён во всех главах). Правка игрушки в курсе сразу видна на `/play/`.

Данные разбиты по курсам, чтобы тексты можно было писать параллельно:
- `play/courses.json` — курсы и их **статус** (`free` / `paid` / `soon`): от него зависят подпись под игрушкой и кнопка «Дальше в курсе»; формулировки статусов — `i18n/play.js`, ключи `play.status.*`; порог показа счётчика — `showCountsFrom` (0 — выключено);
- `play/toys-vp.json`, `play/toys-ss.json`, `play/toys-ab.json` — записи игрушек;
- `i18n/play-vp.js`, `i18n/play-ss.js`, `i18n/play-ab.js` — тексты игрушек; `i18n/play.js` — общие строки интерфейса.

Разметка в главе: `data-toy="<slug>"` — карточка игрушки, `data-toy-pre="<slug>"` — карточка прогноза, `data-toy-reveal` — блок-спойлер (на /play/ скрыт до первого касания), `data-toy-hide` — блок, ненужный вне курса.

Команды (из корня):
- `node tools/check-play.js [vp|ss|ab|slug]` — проверка данных и текстов по стандарту;
- `node tools/bake-i18n.js` — собирает и `/play/` (`tools/build-play.js`: страницы, каталог, `play/credits.json`);
- `NODE_PATH=$(npm root -g) node tools/test-play.js [slug|курс|chapters] [--shots папка]` — headless-проверка (сервер поднимается сам);
- `NODE_PATH=$(npm root -g) node tools/og-play.js [slug …]` — OG-картинки `play/og/<slug>.png`.

Встраивание: `/play/<slug>/?embed=1` (переходит в соло-режим с подписью «Игрушка из курса …»); автоподгонка высоты на чужом сайте — `/play/embed.js`. На Хабре iframe не работает — там GIF и ссылка.

### Счётчик игрушек

Анонимно, без cookie, IP и входа: `POST /api/hit` (`functions/api/hit.js`) → таблица `toy_hits` (агрегаты по дням: `day, slug, place, kind, source, count`). `kind`: `play` — первое взаимодействие с игрушкой за загрузку страницы, `view` — открыли `/play/<slug>/`, `share_click` — «поделиться»; `place`: `course` / `play` / `embed` (для embed `source` — домен сайта, иначе `utm_source`). Шлётся только с боевого домена.

Включить: применить к базе `migrations/002-toy-hits.sql` (D1 → Console или `npx wrangler d1 execute dilyakhakimova --remote --file=migrations/002-toy-hits.sql`). Посмотреть цифры — D1 → Console:

```sql
-- за 30 дней: игрушки по числу игр, с разбивкой по месту
SELECT slug, SUM(count) AS total,
       SUM(CASE WHEN place='course' THEN count END) AS course,
       SUM(CASE WHEN place='play'   THEN count END) AS play,
       SUM(CASE WHEN place='embed'  THEN count END) AS embed
FROM toy_hits WHERE kind='play' AND day >= date('now','-30 day')
GROUP BY slug ORDER BY total DESC;
-- откуда приходят на /play/ и где встраивают
SELECT place, source, kind, SUM(count) AS n FROM toy_hits WHERE source <> '' GROUP BY 1,2,3 ORDER BY n DESC;
```

## Словарь аналитика /terms/ (мини-лаборатории терминов)

Страница термина — `/terms/<slug>/`, хаб — `/terms/`. Собирает `tools/build-terms.js` (вызывается из `node tools/bake-i18n.js`, заодно пишет `/sitemap.xml`).
- `terms/terms.json` — список: тема (`prob` · `stat` · `ab`), игрушка (`slug` с /play/ — встраивается `/play/<slug>/?embed=1`, или `new:tt|mw|chi|ss` — своя игрушка из `terms/toys.js`), главный призыв по стадии (`cta`), лист ожидания (`waitlist`), сравнение (`cmp` / `cmpHref`), связанные термины;
- `i18n/terms.js` — все тексты (определение, строгое определение и формула, пример из кафе, ошибки, «Когда метод врёт», сравнение, задачи, подзаголовки-вопросы);
- `tools/terms-viz.js` — схемы SVG (главная и кадр «Когда метод врёт»), `terms/terms.css`, `terms/terms.js` (высота iframe, «Скинуть коллеге»).
- `NODE_PATH=$(npm root -g) node tools/og-terms.js [slug …]` — OG-картинки `terms/og/<slug>.png`;
- `NODE_PATH=$(npm root -g) node tools/test-terms.js [slug …] [--base URL] [--shots папка --only hub,slug]` — проверка на 1200 и 375 (консоль, прокрутка, игрушки, canonical, доля общего текста ≤ 1/3).
Страница без своей игрушки, примера, схемы и двух задач собирается с `noindex`. «Ещё наугад» выбирается заново при каждой сборке.

Поиск: `robots.txt` (sitemap, закрыты `/api/`, `/styleguide/`, `?embed=1`; для Яндекса `Clean-param` для `toy`, `embed`, `ref`, utm), canonical у всех глав курсов, соло-режим игрушки (`?toy=`) ставит себе `noindex` (`play/bridge.js`).

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
