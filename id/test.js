// node id/test.js — проверка сервиса входа без облака: память вместо YDB, письма в массив, Яндекс и сайт подменены.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {handle, CONSENT_VERSION, signInternal} from './core.js';
import {memoryStore} from './store.js';
import {memoryMail as mm} from './mail.js';

const env = {PASS_SECRET: 'test-secret', SITE_ORIGIN: 'https://dilyakhakimova.com', SITE_ORIGINS: 'https://dilyakhakimova.com,https://review.dilyakhakimova.pages.dev',
  ID_ORIGIN: 'https://id.dilyakhakimova.com', YANDEX_CLIENT_ID: 'cid', YANDEX_CLIENT_SECRET: 'csec'};
let clock = Date.parse('2026-11-22T12:00:00Z');
const store = memoryStore(), mail = mm();
const forgotten = [];
const yaUser = {id: '777', default_email: 'Anya@Ya.ru', first_name: 'Аня', default_avatar_id: '12/abc', is_avatar_empty: false};
async function fakeFetch(url, opt = {}){
  const ok = (d) => ({ok: true, json: async () => d});
  if (url === 'https://oauth.yandex.ru/token') return ok({access_token: 'AT'});
  if (url.startsWith('https://login.yandex.ru/info')) return ok(yaUser);
  if (url === env.SITE_ORIGIN + '/api/internal/forget'){
    assert.equal(opt.headers['x-sig'], signInternal(env, 'POST', '/api/internal/forget', opt.headers['x-ts'], opt.body));
    forgotten.push(JSON.parse(opt.body).uid); return ok({ok: true});
  }
  throw new Error('unexpected fetch ' + url);
}
const deps = {store, mail, env, now: () => clock, fetch: fakeFetch};
const origin = 'https://dilyakhakimova.com';
let jar = '';
async function call(method, path, body, extra = {}){
  const r = await handle({method, path, headers: {origin, cookie: jar, ...(extra.headers || {})}, query: extra.query || {}, body: body ? JSON.stringify(body) : ''}, deps);
  const sc = [].concat(r.headers['set-cookie'] || []);
  for (const c of sc){ const m = /^idsid=([^;]*)/.exec(c); if (m) jar = m[1] ? 'idsid=' + m[1] : ''; }
  return {...r, json: r.body ? JSON.parse(r.body || 'null') : null, cookies: sc};
}
function passUid(pass){
  const [b, sig] = pass.split('.');
  assert.equal(sig, crypto.createHmac('sha256', env.PASS_SECRET).update(b).digest('base64url'));
  const p = JSON.parse(Buffer.from(b, 'base64url').toString()); assert.ok(p.exp > clock); return p.uid;
}

// CORS: чужой сайт не получает разрешения
let r = await call('OPTIONS', '/email/start');
assert.equal(r.headers['access-control-allow-origin'], origin);
r = await handle({method: 'OPTIONS', path: '/email/start', headers: {origin: 'https://evil.example'}, query: {}, body: ''}, deps);
assert.equal(r.headers['access-control-allow-origin'], undefined);

// плохая почта
r = await call('POST', '/email/start', {email: 'не почта'}); assert.equal(r.status, 400);

// новый ученик: код, неверный код, без согласия, с согласием
r = await call('POST', '/email/start', {email: ' Anya@Ya.RU '}); assert.equal(r.status, 200);
const code = mail.sent.at(-1).code; assert.match(code, /^\d{6}$/); assert.equal(mail.sent.at(-1).to, 'anya@ya.ru');
assert.ok(!JSON.stringify(store.tables.codes.get('anya@ya.ru')).includes(code), 'код хранится только хешем');
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code: code === '000000' ? '111111' : '000000'}); assert.equal(r.status, 400); assert.equal(r.json.tries_left, 4);
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code}); assert.equal(r.status, 400); assert.equal(r.json.need_consent, true);
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code, consent: CONSENT_VERSION, name: '  Аня <b> '});
assert.equal(r.status, 200); assert.equal(r.json.new, true); assert.equal(r.json.profile.name, 'Аня b');
const uid = passUid(r.json.pass); assert.match(uid, /^u_/);
assert.ok(jar, 'cookie id-домена');
// код одноразовый
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code}); assert.equal(r.status, 400);

// профиль: читать, менять имя и аватар
r = await call('GET', '/profile'); assert.equal(r.status, 200); assert.equal(r.json.profile.email, 'anya@ya.ru'); assert.equal(passUid(r.json.pass), uid);
r = await call('POST', '/profile', {name: 'Анна', avatar: 'cat-3'}); assert.equal(r.json.profile.name, 'Анна'); assert.equal(r.json.profile.avatar, 'cat-3');
r = await call('POST', '/profile', {avatar: '../x'}); assert.equal(r.status, 400);

// повторный вход по почте: согласие уже есть, тот же uid
jar = '';
await call('POST', '/email/start', {email: 'anya@ya.ru'});
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code: mail.sent.at(-1).code}); assert.equal(r.status, 200); assert.equal(r.json.new, false); assert.equal(passUid(r.json.pass), uid);

// лимит писем: 5 в час
for (let i = 0; i < 3; i++) await call('POST', '/email/start', {email: 'anya@ya.ru'});
r = await call('POST', '/email/start', {email: 'anya@ya.ru'}); assert.equal(r.status, 429);
clock += 3601e3;
r = await call('POST', '/email/start', {email: 'anya@ya.ru'}); assert.equal(r.status, 200);
// код устаревает через 10 минут
const c2 = mail.sent.at(-1).code; clock += 11 * 60e3;
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code: c2}); assert.equal(r.status, 400);
// 5 неверных попыток — дальше и верный код не проходит
await call('POST', '/email/start', {email: 'anya@ya.ru'}); const c3 = mail.sent.at(-1).code;
for (let i = 0; i < 5; i++) await call('POST', '/email/verify', {email: 'anya@ya.ru', code: c3 === '999999' ? '999998' : '999999'});
r = await call('POST', '/email/verify', {email: 'anya@ya.ru', code: c3}); assert.equal(r.status, 429);

// Яндекс ID с той же почтой — тот же ученик (согласие уже было)
jar = '';
r = await call('GET', '/yandex/start'); assert.equal(r.status, 302); assert.match(r.headers.location, /^https:\/\/oauth\.yandex\.ru\/authorize\?/);
const st = new URL(r.headers.location).searchParams.get('state'); const yast = /yast=([^;]+)/.exec([].concat(r.headers['set-cookie'])[0])[1];
r = await call('GET', '/yandex/callback', null, {query: {state: st, code: 'C'}, headers: {cookie: 'yast=' + yast}});
assert.equal(r.status, 302); const loc = new URL(r.headers.location);
assert.equal(loc.origin + loc.pathname, 'https://dilyakhakimova.com/account.html');
const h = new URLSearchParams(loc.hash.slice(1)); assert.equal(passUid(h.get('pass')), uid); assert.equal(h.get('new'), null);
r = await call('GET', '/profile'); assert.equal(r.json.profile.yandex, true); assert.equal(r.json.profile.avatar_url, 'https://avatars.yandex.net/get-yapic/12%2Fabc/islands-200');
// подделанный state
r = await call('GET', '/yandex/callback', null, {query: {state: 'x', code: 'C'}, headers: {cookie: 'yast=' + yast}}); assert.match(r.headers.location, /#err=state$/);

// новый ученик через Яндекс без согласия — отказ, с согласием — вход
yaUser.id = '888'; yaUser.default_email = 'boris@ya.ru'; yaUser.first_name = 'Борис';
r = await call('GET', '/yandex/start'); let s2 = new URL(r.headers.location).searchParams.get('state'), y2 = /yast=([^;]+)/.exec([].concat(r.headers['set-cookie'])[0])[1];
r = await call('GET', '/yandex/callback', null, {query: {state: s2, code: 'C'}, headers: {cookie: 'yast=' + y2}}); assert.match(r.headers.location, /#err=consent$/);
r = await call('GET', '/yandex/start', null, {query: {consent: CONSENT_VERSION}}); s2 = new URL(r.headers.location).searchParams.get('state'); y2 = /yast=([^;]+)/.exec([].concat(r.headers['set-cookie'])[0])[1];
r = await call('GET', '/yandex/callback', null, {query: {state: s2, code: 'C'}, headers: {cookie: 'yast=' + y2}});
const h2 = new URLSearchParams(new URL(r.headers.location).hash.slice(1)); const uid2 = passUid(h2.get('pass')); assert.notEqual(uid2, uid); assert.equal(h2.get('new'), '1');

// удаление аккаунта Бориса: сайт получил подписанный запрос, данных не осталось
r = await call('DELETE', '/profile'); assert.equal(r.status, 200); assert.deepEqual(forgotten, [uid2]);
assert.equal(store.tables.people.has(uid2), false); assert.equal(store.tables.logins.has('ya:888'), false); assert.equal(store.tables.logins.has('email:boris@ya.ru'), false);
r = await call('GET', '/profile'); assert.equal(r.status, 401);
assert.equal(store.tables.people.has(uid), true, 'Аня на месте');

// выход
jar = ''; await call('POST', '/email/start', {email: 'anya@ya.ru'}).catch(() => {});
console.log('id: все проверки прошли');
