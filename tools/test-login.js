#!/usr/bin/env node
/* Проверка входа целиком в браузере без облака: страница /account.html с локального сервера, российский сервис — настоящий
   id/core.js с памятью вместо YDB (запросы к https://id.test перехватываются), /api/* сайта — настоящий readPass из functions/api/_lib.js
   и простая память вместо D1. Сценарии: новый ученик по почте (без согласия → с согласием), имя в шапке, выход, повторный вход,
   Яндекс ID с той же почтой, смена имени, удаление аккаунта.
   NODE_PATH=$(npm root -g) node tools/test-login.js [--shots папка] */
const {chromium} = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const SHOTS = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
      const file = path.join(ROOT, f);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ r.writeHead(404); return r.end('nf'); }
      const ext = path.extname(file).slice(1), types = {html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2', webp: 'image/webp', svg: 'image/svg+xml'};
      r.writeHead(200, {'content-type': types[ext] || 'application/octet-stream'}); fs.createReadStream(file).pipe(r);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const core = await import(path.join(ROOT, 'id/core.js'));
  const {memoryStore} = await import(path.join(ROOT, 'id/store.js'));
  const {memoryMail} = await import(path.join(ROOT, 'id/mail.js'));
  const lib = await import(path.join(ROOT, 'functions/api/_lib.js'));
  const srv = await serve(), SITE = 'http://localhost:' + srv.address().port, IDO = 'https://id.test';
  const env = {PASS_SECRET: 'sek', SITE_ORIGIN: SITE, ID_ORIGIN: IDO, YANDEX_CLIENT_ID: 'cid', YANDEX_CLIENT_SECRET: 'cs'};
  const store = memoryStore(), mail = memoryMail();
  // сайт: users uid → {id}, sessions sid → uid, использованные пропуска
  const site = {users: new Map(), sessions: new Map(), used: new Set(), forgotten: []};
  const yaUser = {id: '42', default_email: 'anya@example.com', first_name: 'Аня', default_avatar_id: '', is_avatar_empty: true};
  const deps = {store, mail, env, fetch: async (url, opt = {}) => {
    const ok = d => ({ok: true, json: async () => d});
    if (url === 'https://oauth.yandex.ru/token') return ok({access_token: 't'});
    if (url.startsWith('https://login.yandex.ru/info')) return ok(yaUser);
    if (url === SITE + '/api/internal/forget'){ const {uid} = JSON.parse(opt.body); site.forgotten.push(uid); site.users.delete(uid); return ok({ok: true}); }
    throw new Error('fetch ' + url);
  }};
  let fail = 0; const check = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1200, height: 900}});
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });

  // российский сервис: настоящий handle; cookie id-домена ведёт сам браузер
  await ctx.route(IDO + '/**', async route => {
    const rq = route.request(), u = new URL(rq.url()); if (process.env.DBG) console.log('id:', rq.method(), u.pathname + u.search, rq.isNavigationRequest());
    const headers = await rq.allHeaders();
    const r = await core.handle({method: rq.method(), path: u.pathname, headers: {...headers, origin: SITE}, query: Object.fromEntries(u.searchParams), body: rq.postData() || ''}, deps);
    const h = {...r.headers}; const sc = [].concat(h['set-cookie'] || []); delete h['set-cookie'];
    // cookie id-домена кладём в контекст сами (Secure+https тестового домена)
    for (const c of sc){ const [nv] = c.split(';'); const [n, v] = [nv.slice(0, nv.indexOf('=')), nv.slice(nv.indexOf('=') + 1)];
      if (/Max-Age=0/.test(c) || !v) await ctx.clearCookies({name: n}); else await ctx.addCookies([{name: n, value: v, domain: 'id.test', path: /Path=([^;]+)/.exec(c)[1], secure: true, httpOnly: true, sameSite: 'None'}]); }
    h['access-control-allow-origin'] = SITE; h['access-control-allow-credentials'] = 'true';
    if (r.status === 302 && h.location.startsWith('https://oauth.yandex.ru/')){
      // имитация Яндекса: сразу возвращаем на callback с кодом и тем же state
      const st = new URL(h.location).searchParams.get('state');
      return route.fulfill({status: 200, headers: {'content-type': 'text/html'}, body: `<script>location.replace(${JSON.stringify(IDO + '/yandex/callback?code=C&state=' + st)})</script>`});
    }
    // переадресацию после fulfill Playwright проходит сам, мимо route — поэтому уходим скриптом
    if (r.status === 302) return route.fulfill({status: 200, headers: {'content-type': 'text/html'}, body: `<script>location.replace(${JSON.stringify(h.location)})</script>`});
    return route.fulfill({status: r.status, headers: h, body: r.body});
  });
  // сайт /api/*
  await ctx.route(SITE + '/api/**', async route => {
    const rq = route.request(), p = new URL(rq.url()).pathname;
    const sid = ((await rq.allHeaders()).cookie || '').match(/sid=([^;]+)/);
    const uid = sid && site.sessions.get(sid[1]);
    const J = (st, d, h = {}) => route.fulfill({status: st, headers: {'content-type': 'application/json', ...h}, body: JSON.stringify(d)});
    if (p === '/api/config') return J(200, {id_origin: IDO});
    if (p === '/api/me' || p === '/api/event') return uid && site.users.has(uid) ? J(200, {user: {uid}, points: 3, max: 406, share: 0.7, discount: 0, courses_done: [], courses_progress: {vp: {done: 1, total: 9}, ss: {done: 0, total: 10}, ab: {done: 0, total: 11}}, calibration_error: null, chapters: {}, promos: []}) : J(401, {error: 'Не выполнен вход'});
    if (p === '/api/auth/pass'){
      const pass = await lib.readPass('sek', JSON.parse(rq.postData()).pass);
      if (!pass || site.used.has(pass.n)) return J(401, {error: 'Пропуск не подошёл'});
      site.used.add(pass.n); site.users.set(pass.uid, {}); const s = 's' + Math.random().toString(36).slice(2);
      site.sessions.set(s, pass.uid); return J(200, {ok: true}, {'set-cookie': 'sid=' + s + '; Path=/'});
    }
    if (p === '/api/logout'){ if (sid) site.sessions.delete(sid[1]); return J(200, {ok: true}, {'set-cookie': 'sid=; Path=/; Max-Age=0'}); }
    return J(404, {});
  });

  const shot = async name => { if (SHOTS){ fs.mkdirSync(SHOTS, {recursive: true}); await page.screenshot({path: path.join(SHOTS, name + '.png'), fullPage: true}); } };
  await page.goto(SITE + '/account.html'); await page.waitForSelector('#guest:not([hidden])');
  await shot('1-guest');
  check(await page.isVisible('#ya-btn'), 'кнопка Яндекс ID');
  // плохая почта
  await page.fill('#email', 'anya@'); await page.click('#f-email button[type=submit]');
  check(/Проверь адрес/.test(await page.textContent('#email-msg')), 'ошибка адреса');
  // новый ученик без согласия
  await page.fill('#email', 'Anya@Example.com'); await page.click('#f-email button[type=submit]');
  await page.waitForSelector('#f-code:not([hidden])');
  check(mail.sent.length === 1 && mail.sent[0].to === 'anya@example.com', 'письмо с кодом ушло');
  await page.fill('#code', '12ab'); check((await page.inputValue('#code')) === '12', 'в поле кода только цифры');
  await page.fill('#code', mail.sent[0].code); await page.click('#f-code button[type=submit]');
  await page.waitForSelector('#new-box:not([hidden])');
  check(await page.$eval('#consent-box', e => e.classList.contains('need')), 'без согласия — просим отметить');
  await shot('2-need-consent');
  await page.check('#consent'); await page.fill('#name', 'Аня'); await page.click('#f-code button[type=submit]');
  await page.waitForSelector('#member:not([hidden])');
  check((await page.textContent('#m-name')) === 'Аня', 'имя в кабинете');
  check(/anya@example\.com/.test(await page.textContent('#m-user')), 'почта в кабинете');
  const dk = JSON.parse(await page.evaluate(() => localStorage.getItem('dk:me')));
  check(dk.name === 'Аня', 'имя для шапки в браузере');
  check(![...site.users.keys()].some(k => /anya|Аня/.test(k)), 'на сайте нет почты и имени');
  await shot('3-member');
  // шапка на другой странице: буква имени
  await page.goto(SITE + '/play/'); await page.evaluate(s => { const x = document.createElement('script'); x.textContent = s; document.body.appendChild(x); }, require('./chrome.js').header('').match(/<script>(\(function\(\)\{var a=[\s\S]*?)<\/script>/)[1]);
  check((await page.textContent('.me .me-l').catch(() => '')) === 'А', 'буква имени в шапке');
  // смена имени
  await page.goto(SITE + '/account.html'); await page.waitForSelector('#member:not([hidden])');
  await page.fill('#m-name-in', 'Анна'); await page.click('#f-name button[type=submit]');
  await page.waitForFunction(() => document.getElementById('m-name').textContent === 'Анна');
  check(true, 'имя сменилось');
  // выход и вход через Яндекс с той же почтой — тот же ученик
  const uid1 = [...site.users.keys()][0];
  await page.click('#logout'); await page.waitForSelector('#guest:not([hidden])');
  check(!(await page.evaluate(() => localStorage.getItem('dk:me'))), 'после выхода шапка забыла имя');
  await page.click('#ya-btn'); await page.waitForSelector('#member:not([hidden])');
  check([...site.users.keys()].length === 1 && [...site.users.keys()][0] === uid1, 'Яндекс с той же почтой — тот же ученик');
  check(/Яндекс ID/.test(await page.textContent('#m-user')), 'в кабинете видно Яндекс ID');
  check(!(await page.evaluate(() => location.hash)), 'пропуск убран из адреса');
  // вход на сайт по живой сессии id-домена: стираем только cookie сайта
  await ctx.clearCookies({name: 'sid'}); await page.reload(); await page.waitForSelector('#member:not([hidden])');
  check(true, 'сессия id-домена сама впускает на сайт');
  // удаление
  await page.click('#del'); await shot('4-delete'); await page.click('#del-yes'); await page.waitForSelector('#guest:not([hidden])');
  check(site.forgotten.includes(uid1) && !store.tables.people.size, 'аккаунт удалён в России и на сайте');
  // телефон
  await page.setViewportSize({width: 375, height: 800}); await page.reload(); await page.waitForSelector('#guest:not([hidden])');
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check(!ov, '375 px без горизонтальной прокрутки'); await shot('5-guest-375');
  check(!errs.length, 'нет ошибок в консоли' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' проверок не прошли' : 'вход: все проверки прошли'); process.exit(fail ? 1 : 0);
})();
