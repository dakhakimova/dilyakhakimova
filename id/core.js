// Российский сервис входа dilyakhakimova.com (id.dilyakhakimova.com, Yandex Cloud, регион Россия).
// Здесь — и только здесь — хранятся почта, имя и аватар ученика. Сайт на Cloudflare получает от нас
// только случайный номер ученика (uid) в подписанном «пропуске» и по нему хранит прогресс.
//
// handle(req, deps) — чистая логика без привязки к облаку:
//   req  = {method, path, headers, query, body}  (body — строка)
//   deps = {store, mail, env, now?, fetch?}
//   ответ = {status, headers, body}
// Адаптер для Cloud Functions + API Gateway — index.js, локальный сервер для тестов — dev.js.

import crypto from 'node:crypto';

export const CONSENT_VERSION = '2026-11-22';
const CODE_TTL = 10 * 60e3;          // код из письма живёт 10 минут
const CODE_TRIES = 5;                 // столько попыток ввести код
const SENDS_PER_HOUR = 5;             // столько писем на один адрес в час
const SESSION_DAYS = 180;             // вход на id-домене
const PASS_TTL = 2 * 60e3;            // пропуск для сайта живёт 2 минуты
export const AVATARS = ['cat-1','cat-2','cat-3','cat-4','cat-5','cat-6','cat-7','cat-8','cat-9','cat-10',
  'dog-1','dog-2','dog-3','dog-4','dog-5','dog-6','dog-7','dog-8'];

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const hmac = (key, s) => crypto.createHmac('sha256', key).update(s).digest('base64url');
const rnd = n => crypto.randomBytes(n).toString('base64url');
const eqSafe = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export function normEmail(s){
  const e = String(s || '').trim().toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@.]{2,}$/.test(e) && e.length <= 254 ? e : null;
}
export function cleanName(s){
  const n = String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  return n.slice(0, 40);
}

// Пропуск для сайта: base64url(JSON {uid, exp, n}) + '.' + HMAC. Секрет PASS_SECRET общий с Cloudflare.
export function makePass(env, uid, now){
  const body = Buffer.from(JSON.stringify({uid, exp: now + PASS_TTL, n: rnd(9)})).toString('base64url');
  return body + '.' + hmac(env.PASS_SECRET, body);
}
// Подпись для запросов сервиса к сайту (удаление аккаунта): HMAC от "method path ts body".
export function signInternal(env, method, path, ts, body){ return hmac(env.PASS_SECRET, `${method} ${path} ${ts} ${body}`); }

function cors(env, req){
  const o = req.headers.origin || '';
  const allowed = String(env.SITE_ORIGINS || env.SITE_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(o)) return {};
  return {'access-control-allow-origin': o, 'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', vary: 'Origin'};
}
const J = (status, data, h = {}) => ({status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h}, body: JSON.stringify(data)});
const redirect = (to, h = {}) => ({status: 302, headers: {location: to, 'cache-control': 'no-store', ...h}, body: ''});

function cookieOf(req, name){
  for (const part of String(req.headers.cookie || '').split(/;\s*/)){
    const i = part.indexOf('='); if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}
const sessCookie = (tok, days) => `idsid=${tok}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.round(days * 86400)}`;

// altKey: второй способ входа с той же почтой (Яндекс ID с адресом, под которым уже входили по коду, и наоборот) —
// тот же ученик, а не новый аккаунт.
async function personFor(store, loginKey, init, now, altKey){
  for (const key of [loginKey, altKey].filter(Boolean)){
    const link = await store.get('logins', key);
    const p = link && await store.get('people', link.uid);
    if (!p) continue;
    if (key !== loginKey){
      await store.put('logins', {k: loginKey, uid: p.uid});
      const add = {};
      for (const f of ['yid', 'email', 'avatar_url']) if (init[f] && !p[f]) add[f] = init[f];
      if (!p.name && init.name) add.name = init.name;
      const q = {...p, ...add}; await store.put('people', q); return {p: q, isNew: false};
    }
    return {p, isNew: false};
  }
  const uid = 'u_' + rnd(12);
  const p = {k: uid, uid, created: new Date(now).toISOString(), ...init};
  await store.put('people', p);
  await store.put('logins', {k: loginKey, uid});
  return {p, isNew: true};
}

async function startSession(store, uid, now){
  const tok = rnd(32);
  await store.put('sessions', {k: sha(tok), uid, exp: now + SESSION_DAYS * 864e5});
  return tok;
}
async function sessionUser(store, req, now){
  const tok = cookieOf(req, 'idsid'); if (!tok) return null;
  const s = await store.get('sessions', sha(tok));
  if (!s || s.exp <= now) return null;
  const p = await store.get('people', s.uid);
  return p ? {p, hash: sha(tok)} : null;
}
const publicProfile = p => ({name: p.name || '', avatar: p.avatar || null, avatar_url: p.avatar_url || null,
  email: p.email || null, yandex: !!p.yid, created: p.created});

export async function handle(req, deps){
  const {store, mail, env} = deps, now = (deps.now || Date.now)();
  const C = cors(env, req), m = req.method.toUpperCase(), path = req.path.replace(/\/+$/, '') || '/';
  if (m === 'OPTIONS') return {status: 204, headers: C, body: ''};
  let body = {};
  if (m === 'POST' && req.body){ try { body = JSON.parse(req.body); } catch { return J(400, {error: 'Неверный запрос'}, C); } }
  const site = env.SITE_ORIGIN;

  // 1. Письмо с кодом
  if (m === 'POST' && path === '/email/start'){
    const email = normEmail(body.email);
    if (!email) return J(400, {error: 'Проверь адрес почты'}, C);
    const rec = (await store.get('codes', email)) || {k: email, sends: []};
    const sends = (rec.sends || []).filter(t => t > now - 3600e3);
    if (sends.length >= SENDS_PER_HOUR) return J(429, {error: 'Слишком много писем на этот адрес. Попробуй через час'}, C);
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    await store.put('codes', {k: email, hash: sha(email + ':' + code), exp: now + CODE_TTL, tries: 0, sends: [...sends, now]});
    await mail.sendCode(email, code);
    return J(200, {ok: true, ttl_min: CODE_TTL / 60e3}, C);
  }

  // 2. Проверка кода → вход
  if (m === 'POST' && path === '/email/verify'){
    const email = normEmail(body.email), code = String(body.code || '').replace(/\D/g, '');
    if (!email || code.length !== 6) return J(400, {error: 'Нужен код из шести цифр'}, C);
    const rec = await store.get('codes', email);
    if (!rec || !rec.hash || rec.exp <= now) return J(400, {error: 'Код устарел. Попроси новый'}, C);
    if (rec.tries >= CODE_TRIES) return J(429, {error: 'Слишком много попыток. Попроси новый код'}, C);
    if (!eqSafe(rec.hash, sha(email + ':' + code))){
      await store.put('codes', {...rec, tries: rec.tries + 1});
      return J(400, {error: 'Код не подходит', tries_left: CODE_TRIES - rec.tries - 1}, C);
    }
    const known = await store.get('logins', 'email:' + email);
    if (!known && body.consent !== CONSENT_VERSION) return J(400, {error: 'Нужно согласие на обработку персональных данных', need_consent: true}, C);
    await store.put('codes', {k: email, sends: rec.sends || []});        // код одноразовый
    const {p, isNew} = await personFor(store, 'email:' + email,
      {email, name: cleanName(body.name), consent: CONSENT_VERSION, consent_at: new Date(now).toISOString()}, now);
    const tok = await startSession(store, p.uid, now);
    return J(200, {ok: true, new: isNew, pass: makePass(env, p.uid, now), profile: publicProfile(p)}, {...C, 'set-cookie': sessCookie(tok, SESSION_DAYS)});
  }

  // 3. Яндекс ID: уход на oauth.yandex.ru
  if (m === 'GET' && path === '/yandex/start'){
    if (!env.YANDEX_CLIENT_ID) return J(503, {error: 'Вход через Яндекс ещё не настроен'}, C);
    const st = rnd(18);
    const consent = req.query.consent === CONSENT_VERSION ? '1' : '0';
    const q = new URLSearchParams({response_type: 'code', client_id: env.YANDEX_CLIENT_ID, redirect_uri: env.ID_ORIGIN + '/yandex/callback', state: st, force_confirm: 'no'});
    return redirect('https://oauth.yandex.ru/authorize?' + q, {'set-cookie': `yast=${st}.${consent}; Path=/yandex; HttpOnly; Secure; SameSite=Lax; Max-Age=600`});
  }
  // 4. Яндекс ID: возврат с кодом
  if (m === 'GET' && path === '/yandex/callback'){
    const back = (h) => redirect(site + '/account.html#' + h, {'set-cookie': 'yast=; Path=/yandex; Max-Age=0'});
    const [st, consent] = String(cookieOf(req, 'yast') || '').split('.');
    if (!st || !req.query.state || !eqSafe(st, req.query.state)) return back('err=state');
    if (req.query.error || !req.query.code) return back('err=cancel');
    const f = deps.fetch || fetch;
    const tr = await f('https://oauth.yandex.ru/token', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({grant_type: 'authorization_code', code: req.query.code, client_id: env.YANDEX_CLIENT_ID, client_secret: env.YANDEX_CLIENT_SECRET})});
    const t = tr.ok ? await tr.json() : null;
    if (!t || !t.access_token) return back('err=yandex');
    const ir = await f('https://login.yandex.ru/info?format=json', {headers: {authorization: 'OAuth ' + t.access_token}});
    const info = ir.ok ? await ir.json() : null;
    if (!info || !info.id) return back('err=yandex');
    const key = 'ya:' + info.id, yEmail = normEmail(info.default_email);
    const known = (await store.get('logins', key)) || (yEmail && await store.get('logins', 'email:' + yEmail));
    if (!known && consent !== '1') return back('err=consent');
    const avatar_url = info.default_avatar_id && !info.is_avatar_empty ? `https://avatars.yandex.net/get-yapic/${encodeURIComponent(info.default_avatar_id)}/islands-200` : null;
    const {p, isNew} = await personFor(store, key, {yid: String(info.id), email: yEmail, name: cleanName(info.first_name || info.display_name),
      avatar_url, consent: CONSENT_VERSION, consent_at: new Date(now).toISOString()}, now, yEmail && 'email:' + yEmail);
    if (yEmail && !(await store.get('logins', 'email:' + yEmail))) await store.put('logins', {k: 'email:' + yEmail, uid: p.uid});
    if (!isNew && avatar_url !== p.avatar_url) await store.put('people', {...p, avatar_url});
    const tok = await startSession(store, p.uid, now);
    return redirect(site + '/account.html#pass=' + makePass(env, p.uid, now) + (isNew ? '&new=1' : ''),
      {'set-cookie': [sessCookie(tok, SESSION_DAYS), 'yast=; Path=/yandex; Max-Age=0']});
  }

  // 5. Профиль: кто я; обновить имя или аватар; удалить всё
  if (path === '/profile'){
    const u = await sessionUser(store, req, now);
    if (!u) return J(401, {error: 'Не выполнен вход'}, C);
    if (m === 'GET') return J(200, {profile: publicProfile(u.p), pass: makePass(env, u.p.uid, now)}, C);
    if (m === 'POST'){
      const p = {...u.p};
      if ('name' in body) p.name = cleanName(body.name);
      if ('avatar' in body){
        if (body.avatar === null || body.avatar === 'yandex') p.avatar = null;
        else if (AVATARS.includes(body.avatar)) p.avatar = body.avatar;
        else return J(400, {error: 'Нет такой аватарки'}, C);
      }
      await store.put('people', p);
      return J(200, {profile: publicProfile(p)}, C);
    }
    if (m === 'DELETE'){
      // сначала стираем прогресс на сайте, потом — данные здесь
      const f = deps.fetch || fetch, ts = String(now), b = JSON.stringify({uid: u.p.uid});
      const r = await f(site + '/api/internal/forget', {method: 'POST', headers: {'content-type': 'application/json', 'x-ts': ts,
        'x-sig': signInternal(env, 'POST', '/api/internal/forget', ts, b)}, body: b}).catch(() => null);
      if (!r || !r.ok) return J(502, {error: 'Не получилось удалить прогресс на сайте. Попробуй ещё раз'}, C);
      if (u.p.email) await store.del('logins', 'email:' + u.p.email);
      if (u.p.yid) await store.del('logins', 'ya:' + u.p.yid);
      await store.del('people', u.p.uid);
      await store.delWhere('sessions', 'uid', u.p.uid);
      return J(200, {ok: true}, {...C, 'set-cookie': sessCookie('', 0)});
    }
  }
  if (m === 'POST' && path === '/logout'){
    const tok = cookieOf(req, 'idsid'); if (tok) await store.del('sessions', sha(tok));
    return J(200, {ok: true}, {...C, 'set-cookie': sessCookie('', 0)});
  }
  if (m === 'GET' && path === '/health') return J(200, {ok: true}, C);
  return J(404, {error: 'Нет такого адреса'}, C);
}
