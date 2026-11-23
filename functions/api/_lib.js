// Общие функции API сайта: ответы, сессии, правила баллов.
// Окружение (Cloudflare Pages → Settings → Variables and secrets / Bindings):
//   DB          — привязка к базе D1
//   PASS_SECRET — секрет: общий с id.dilyakhakimova.com, им подписаны пропуска и служебные запросы
//   ID_ORIGIN   — адрес российского сервиса входа, 'https://id.dilyakhakimova.com'
// Персональных данных на Cloudflare нет: ученик здесь — только случайный номер uid.

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const bad = (msg, status = 400) => json({ error: msg }, status);

const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function hmacB64(secret, s) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(s)));
}
export function safeEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// Пропуск от id.dilyakhakimova.com: base64url(JSON {uid, exp, n}) + '.' + HMAC-SHA256(PASS_SECRET). null, если подпись или срок не те.
export async function readPass(secret, pass, now = Date.now()) {
  const [body, sig] = String(pass || '').split('.');
  if (!body || !sig || !safeEq(sig, await hmacB64(secret, body))) return null;
  let p; try { p = JSON.parse(decodeURIComponent(escape(atob(body.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; }
  if (!p || typeof p.uid !== 'string' || !/^u_[\w-]{8,40}$/.test(p.uid) || !(p.exp > now) || !p.n) return null;
  return p;
}
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

const COOKIE = 'sid';
const SESSION_DAYS = 30;

export function readCookie(request, name = COOKIE) {
  const h = request.headers.get('cookie') || '';
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export async function createSession(env, userId) {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = hex(raw);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, expires.toISOString()).run();
  const cookie = `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
  return cookie;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function currentUser(request, env) {
  const token = readCookie(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  ).bind(await sha256(token), new Date().toISOString()).first();
  return row || null;
}

// ---------- Правила баллов ----------
// Баллы считает только сервер. Для прогнозов он сам сравнивает догадку с правильным ответом,
// поэтому «попал» нельзя подделать, отправив готовый флаг.
export const RULES = {
  // «Сигнал или шум», глава 1 (свой встроенный скрипт, без квизов)
  ch01: {
    title: 'Вероятность — это доля в штуках',
    predict: { coin: 24.6, shop: 37.7 },          // правильный ответ, % — для «попал ±5 п.п.»
    code: ['at-least-one'],
    interview: ['disjoint', 'lamps', 'dice'],
  },
  // «Вероятность на пальцах»
  p01: { title: "Исходы и события", predict: {kot: 50}, code: ['p-sum'], interview: ['dice7', 'coins3', 'leibniz'], quiz: 5 },
  p02: { title: "Вероятность как частота", predict: {five: 24.6}, code: ['share-at-least'], interview: ['six-or-sixty', 'streak'], quiz: 5 },
  p03: { title: "Считаем исходы", predict: {five: 24.6}, code: ['n-choose-k'], interview: ['aces', 'handshakes', 'committee'], quiz: 5 },
  p04: { title: "Не, и, или", predict: {party23: 50.7}, code: ['p-shared'], interview: ['birthdays', 'dice6', 'lamps100'], quiz: 5 },
  p05: { title: "Условная вероятность и независимость", predict: {rainchoc: 40}, code: ['independent'], interview: ['twokids', 'threecards', 'diceindep'], quiz: 5 },
  p06: { title: "Байес", predict: {cash: 9}, code: ['posterior'], interview: ['rare', 'promoflags', 'monty'], quiz: 5 },
  p07: { title: "Случайная величина и распределение", predict: {mid: 24.6}, code: ['binom-pmf'], interview: ['first-heads', 'first-six', 'three-coins', 'ht-hh'], quiz: 5 },
  p08: { title: "Среднее и разброс", predict: {plus: 17}, code: ['coupons'], interview: ['all-faces', 'reroll', 'lottery'], quiz: 5 },
  p09: { title: "Пробное собеседование", predict: {}, code: ['seats'], interview: [], quiz: 10 },
  // «Сигнал или шум», главы 4–12 (главы 2–3 — в «Вероятности на пальцах», шаги 5–8)
  ch04: { title: "Шум", predict: {out: 24.1}, code: ['corridor'], interview: ['fifty', 'seven'], quiz: 5 },
  ch05: { title: "Нормальное распределение", predict: {beyond2: 4.6}, code: ['between'], interview: ['sigma2', 'twosigma', 'where'], quiz: 5 },
  ch06: { title: "Зоопарк распределений", predict: {above: 29.1}, code: ['whales'], interview: ['raisins', 'delivery', 'river'], quiz: 5 },
  ch07: { title: "ЦПТ в деле", predict: {whales30: 56.8}, code: ['shelves'], interview: ['dice10', 'rand12', 'shelves', 'jug'], quiz: 5 },
  ch08: { title: "Симпсон, Берксон, ошибка выжившего и автобус", predict: {simpson: 18.2}, code: ['mean-wait'], interview: ['buspass', 'menutop', 'speed'], quiz: 5 },
  ch09: { title: "A/A-тест", predict: {aa83: 5}, code: ['aa-rate'], interview: ['pvuniform', 'aareport'], quiz: 5 },
  ch10: { title: "A/B на простой метрике", predict: {nine: 1.1}, code: ['ztest-props'], interview: ['nine', 'octopus', 'cafes', 'late'], quiz: 5 },
  ch11: { title: "Ошибки I и II рода", predict: {half: 50}, code: ['power-props'], interview: ['errors', 'alpha', 'coin100', 'half'], quiz: 5 },
  ch12: { title: "«Прокрасилось» — значит, работает?", predict: {fdr: 36}, code: ['false-share'], interview: ['nulls1000', 'pvh0', 'needpower'], quiz: 5 },
  // «A/B на пальцах» (ab-basics/, движок course.js): балл за квиз с первой попытки (квизы «Разминки» не считаются),
  // quiz — число квизов на странице шага без разминки; task — прочие задания с баллом (ключ = id в AB.award).
  ab01: { title: "До и после — не доказательство", quiz: 10 },
  ab02: { title: "Монетка, соль и хеш", quiz: 3 },
  ab03: { title: "Шум есть всегда", quiz: 3 },
  ab04: { title: "Толпа предсказуема", quiz: 5 },
  ab05: { title: "Ширина колокола", quiz: 4 },
  ab06: { title: "Эффект — это вилка", quiz: 7 },
  ab07: { title: "p-value на пальцах", quiz: 11 },
  ab08: { title: "Два вида ошибок", quiz: 7 },
  ab09: { title: "MDE: что мы способны заметить", quiz: 17 },
  ab10: { title: "Когда зелёное врёт", quiz: 13 },
  ab11: { title: "Читаем отчёт и решаем", quiz: 23, task: ['rep3min'] },
};
export const PTS = { predict: 1, predictHit: 2, codeFirst: 5, codeLater: 3, interview: 1, quiz: 1, task: 1 };
export const HIT_TOLERANCE = 5;
// Скидка (решение Дили, 22.11.2026): 20% на платный курс за любой пройденный бесплатный курс. Баллы остаются прогрессом,
// скидку от них не считаем. «Пройден» — во всех шагах курса есть событие done (клиент шлёт его, когда открыта последняя
// карточка шага и на каждый вопрос дан любой ответ; игры не обязательны). Складываются ли скидки за несколько курсов — не решено.
export const DISCOUNT = 20;
export const COURSES = {
  vp: { title: 'Вероятность на пальцах', chapters: ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09'] },
  ss: { title: 'Сигнал или шум', chapters: ['ch01', 'ch04', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09', 'ch10', 'ch11', 'ch12'] },
  ab: { title: 'A/B на пальцах', chapters: ['ab01', 'ab02', 'ab03', 'ab04', 'ab05', 'ab06', 'ab07', 'ab08', 'ab09', 'ab10', 'ab11'] },
};
// Пороги скидки считаются от максимума трёх бесплатных курсов: «Вероятность на пальцах» (p01–p09, 143 балла),
// «Сигнал или шум» (ch01 и ch04–ch12, 14 + 145 = 159 баллов) и «A/B на пальцах» (ab01–ab11, 103 квиза + 1 задание = 104 балла) — всего 406.
// PLANNED_MAX — нижняя граница максимума: если главу временно уберут из RULES, пороги не упадут.
// Новые главы или квизы поднимают максимум сами (maxPoints считает по RULES).
export const PLANNED_MAX = 406;

export function maxPoints() {
  let m = 0;
  for (const ch of Object.values(RULES)) {
    m += Object.keys(ch.predict || {}).length * (PTS.predict + PTS.predictHit);
    m += (ch.code || []).length * PTS.codeFirst;
    m += (ch.interview || []).length * PTS.interview;
    m += (ch.quiz || 0) * PTS.quiz;
    m += (ch.task || []).length * PTS.task;
  }
  return Math.max(m, PLANNED_MAX);
}

// Возвращает число баллов за событие или null, если событие неизвестно.
export function scoreEvent(chapter, kind, key, value) {
  const ch = RULES[chapter];
  if (!ch) return null;
  if (kind === 'card') return Number.isInteger(+key) ? 0 : null;
  if (kind === 'done') return key === '1' ? 0 : null;
  if (kind === 'predict') {
    if (!(key in (ch.predict || {}))) return null;
    const v = +value;
    if (!Number.isFinite(v) || v < 0 || v > 100) return null;
    return PTS.predict + (Math.abs(v - ch.predict[key]) <= HIT_TOLERANCE ? PTS.predictHit : 0);
  }
  if (kind === 'code') {
    if (!(ch.code || []).includes(key)) return null;
    return (+value || 1) <= 1 ? PTS.codeFirst : PTS.codeLater;
  }
  if (kind === 'interview') return (ch.interview || []).includes(key) ? PTS.interview : null;
  if (kind === 'task') return (ch.task || []).includes(key) ? PTS.task : null;
  // квиз: ключ q0, q1, … — номер квиза на странице без разминки; движок шлёт событие только за верный ответ с первой попытки
  if (kind === 'quiz') { const m = /^q(\d+)$/.exec(key); return m && +m[1] < (ch.quiz || 0) ? PTS.quiz : null; }
  return null;
}


// Сводка по пользователю: баллы, прогресс по главам, калибровка, промокоды (выдаёт недостающие).
export async function summary(env, user) {
  const { results: ev } = await env.DB.prepare(
    'SELECT chapter, kind, key, value, points FROM events WHERE user_id = ?'
  ).bind(user.id).all();
  const total = ev.reduce((s, e) => s + e.points, 0);
  const max = maxPoints();
  const share = max ? total / max : 0;

  const chapters = {};
  for (const e of ev) {
    const c = (chapters[e.chapter] ||= { points: 0, cards: [] });
    c.points += e.points;
    if (e.kind === 'card') c.cards.push(+e.key);
  }
  // калибровка: средняя ошибка прогнозов в п. п. (меньше — лучше)
  const errs = ev.filter(e => e.kind === 'predict' && RULES[e.chapter]?.predict?.[e.key] !== undefined)
    .map(e => Math.abs(e.value - RULES[e.chapter].predict[e.key]));
  const calibration = errs.length ? Math.round(10 * errs.reduce((a, b) => a + b, 0) / errs.length) / 10 : null;

  // пройденные курсы: done во всех шагах
  const doneCh = new Set(ev.filter(e => e.kind === 'done').map(e => e.chapter));
  const courses_done = Object.entries(COURSES).filter(([, c]) => c.chapters.every(ch => doneCh.has(ch))).map(([id, c]) => ({id, title: c.title}));
  const courses_progress = Object.fromEntries(Object.entries(COURSES).map(([id, c]) => [id, {done: c.chapters.filter(ch => doneCh.has(ch)).length, total: c.chapters.length}]));
  for (const c of courses_done) await issueCoursePromo(env, user.id, c.id);
  const { results: promos } = await env.DB.prepare(
    'SELECT code, course, discount, created_at, expires_at, redeemed_at FROM course_promos WHERE user_id = ? ORDER BY created_at'
  ).bind(user.id).all();
  promos.forEach(p => { p.course_title = (COURSES[p.course] || {}).title || p.course; });
  // купленные платные курсы (migrations/006-purchases.sql); пока таблицы нет — пустой список
  let purchases = [];
  try {
    ({ results: purchases } = await env.DB.prepare('SELECT course, created_at AS at FROM purchases WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all());
  } catch (e) { purchases = []; }

  return {
    user: { uid: user.uid },
    points: total, max, share: Math.round(share * 1000) / 10,
    discount: courses_done.length ? DISCOUNT : 0, courses_done, courses_progress,
    calibration_error: calibration,
    chapters, promos, purchases,
  };
}

// ---------- промокоды за пройденные курсы: выдача, проверка, погашение ----------
// Один код на (пользователь, курс); одноразовый; год с выдачи; на одну покупку — один код.
export function newPromoCode(course){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(8));
  return course.toUpperCase() + '20-' + [...r].map(b => alphabet[b % alphabet.length]).join('');
}
export async function issueCoursePromo(env, userId, course, now = new Date()){
  if (!COURSES[course]) throw new Error('unknown course');
  const exp = new Date(now); exp.setUTCFullYear(exp.getUTCFullYear() + 1);
  await env.DB.prepare('INSERT OR IGNORE INTO course_promos (code, user_id, course, discount, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newPromoCode(course), userId, course, DISCOUNT, now.toISOString(), exp.toISOString()).run();
  return env.DB.prepare('SELECT * FROM course_promos WHERE user_id = ? AND course = ?').bind(userId, course).first();
}
// {valid, reason?, discount?, expires_at?}; reason: 'not_found' | 'redeemed' | 'expired'
export async function validatePromo(env, code, now = new Date()){
  const c = String(code || '').trim().toUpperCase();
  const row = c ? await env.DB.prepare('SELECT * FROM course_promos WHERE code = ?').bind(c).first() : null;
  if (!row) return {valid: false, reason: 'not_found'};
  if (row.redeemed_at) return {valid: false, reason: 'redeemed'};
  if (new Date(row.expires_at) <= now) return {valid: false, reason: 'expired'};
  return {valid: true, code: c, discount: row.discount, expires_at: row.expires_at};
}
// Погашение атомарно: UPDATE … WHERE redeemed_at IS NULL — второй раз код не пройдёт.
export async function redeemPromo(env, code, orderRef = '', now = new Date()){
  const v = await validatePromo(env, code, now);
  if (!v.valid) return v;
  const r = await env.DB.prepare('UPDATE course_promos SET redeemed_at = ?, order_ref = ? WHERE code = ? AND redeemed_at IS NULL')
    .bind(now.toISOString(), String(orderRef).slice(0, 80), v.code).run();
  return (r.meta && r.meta.changes) ? {valid: true, redeemed: true, code: v.code, discount: v.discount} : {valid: false, reason: 'redeemed'};
}
