# id.dilyakhakimova.com — российский сервис входа

Почта, имя, аватар и согласие учеников хранятся только здесь: Yandex Cloud, регион Россия
(первичный сбор персональных данных — в базе в России, ч. 5 ст. 18 152-ФЗ). Сайт на Cloudflare получает только случайный номер ученика `uid`.

Как это работает:
1. Страница `/account.html` шлёт почту прямо сюда (`POST /email/start`), письмо с кодом уходит через Postbox.
2. `POST /email/verify` проверяет код, при первом входе требует согласие, ставит cookie `idsid` на id-домене и отдаёт **пропуск** —
   `base64url({uid, exp, n}).HMAC` на 2 минуты.
3. Страница отдаёт пропуск сайту: `POST /api/auth/pass` (Cloudflare) проверяет подпись общим секретом `PASS_SECRET` и заводит сессию.
4. Имя и аватар страница берёт отсюда (`GET /profile`) и кладёт в `localStorage` для шапки. На Cloudflare их нет.
5. Яндекс ID: `GET /yandex/start` → oauth.yandex.ru → `GET /yandex/callback` → `/account.html#pass=…`. Та же почта — тот же ученик.
6. Удаление аккаунта: `DELETE /profile` сначала стирает прогресс на сайте (`POST /api/internal/forget`, подпись HMAC), потом данные здесь.

Файлы: `core.js` — вся логика, `index.js` — вход для Cloud Functions, `store.js` — YDB (Document API) и память для тестов,
`mail.js` — Postbox и письмо. Проверка: `node id/test.js` (сервис), `NODE_PATH=$(npm root -g) node tools/test-login.js` (вход в браузере).

## Настройка (один раз)

Что делает Диля (нужны её аккаунты):
1. Yandex Cloud: зарегистрироваться физлицом, платёжный аккаунт, каталог `dilyakhakimova`.
2. Сервисный аккаунт `id-service` с ролями `ydb.editor`, `postbox.sender`, `functions.functionInvoker`, `lockbox.payloadViewer`;
   статический ключ доступа и авторизованный ключ (для деплоя) — файлами в папку проекта, не в чат.
3. Яндекс OAuth (oauth.yandex.ru → «Создать приложение»): веб-сервис, Redirect URI `https://id.dilyakhakimova.com/yandex/callback`,
   доступы «Доступ к адресу электронной почты», «Доступ к логину, имени и фамилии, полу», «Доступ к портрету пользователя».
   ClientID и Client secret — файлом в папку проекта.

Что делаю я (с ключами):
1. YDB serverless `id`, таблицы Document API `people`, `logins`, `codes`, `sessions`, ключ `k` (строка).
2. Postbox: адрес `hello@dilyakhakimova.com`, DKIM-записи в DNS Cloudflare.
3. Lockbox-секрет: `PASS_SECRET` (тот же — в Cloudflare Pages), `YANDEX_CLIENT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
4. Функция `id` (nodejs22, точка входа `index.handler`), переменные: `SITE_ORIGIN=https://dilyakhakimova.com`,
   `SITE_ORIGINS=https://dilyakhakimova.com,https://review.dilyakhakimova.pages.dev`, `ID_ORIGIN=https://id.dilyakhakimova.com`,
   `YDB_DOCAPI_ENDPOINT`, `YANDEX_CLIENT_ID`, `POSTBOX_FROM=Котейка <hello@dilyakhakimova.com>`.
5. API Gateway: все пути → функция; свой домен `id.dilyakhakimova.com`, сертификат Let's Encrypt через Certificate Manager.
   В DNS Cloudflare запись для `id` — **без прокси** (серое облако), иначе данные пойдут через Cloudflare.
6. Cloudflare Pages: `PASS_SECRET`, `ID_ORIGIN`; к базе D1 — `migrations/004-uid-login.sql`.

Cookie `idsid` ставится на `id.dilyakhakimova.com` (SameSite=Lax): для сайта это тот же «сайт», поэтому `fetch(..., {credentials: 'include'})`
с `dilyakhakimova.com` её отправляет. Превью `review.dilyakhakimova.pages.dev` — другой сайт: там вход проверяем на боевом домене или локально тестом.
