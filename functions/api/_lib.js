// Общие функции API сайта: ответы, сессии, правила баллов.
// Окружение (Cloudflare Pages → Settings → Variables and secrets / Bindings):
//   DB                — привязка к базе D1
//   TELEGRAM_BOT_TOKEN — секрет: токен бота сайта (никогда не уходит в браузер)
//   TELEGRAM_BOT_NAME  — имя бота без @, для кнопки входа

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const bad = (msg, status = 400) => json({ error: msg }, status);

const enc = new TextEncoder();
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
};
export const PTS = { predict: 1, predictHit: 2, codeFirst: 5, codeLater: 3, interview: 1, quiz: 1 };
export const HIT_TOLERANCE = 5;
export const TIERS = [ [0.4, 10], [0.7, 20], [0.9, 30] ];   // доля от максимума → скидка, %: 40 % → 10 %, 70 % → 20 %, 90 % → 30 %
// Пороги скидки считаются от максимума двух бесплатных курсов: «Вероятность на пальцах» (p01–p09, 143 балла)
// и «Сигнал или шум» (ch01 и ch04–ch12, 14 + 145 баллов) — всего 302. Баллы «A/B на пальцах» сюда не входят (не решено).
// PLANNED_MAX — нижняя граница максимума: если главу временно уберут из RULES, пороги не упадут.
// Новые главы или квизы поднимают максимум сами (maxPoints считает по RULES).
export const PLANNED_MAX = 302;

export function maxPoints() {
  let m = 0;
  for (const ch of Object.values(RULES)) {
    m += Object.keys(ch.predict || {}).length * (PTS.predict + PTS.predictHit);
    m += (ch.code || []).length * PTS.codeFirst;
    m += (ch.interview || []).length * PTS.interview;
    m += (ch.quiz || 0) * PTS.quiz;
  }
  return Math.max(m, PLANNED_MAX);
}

// Возвращает число баллов за событие или null, если событие неизвестно.
export function scoreEvent(chapter, kind, key, value) {
  const ch = RULES[chapter];
  if (!ch) return null;
  if (kind === 'card') return Number.isInteger(+key) ? 0 : null;
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
  // квиз: ключ q0, q1, … — номер квиза на странице без разминки; движок шлёт событие только за верный ответ с первой попытки
  if (kind === 'quiz') { const m = /^q(\d+)$/.exec(key); return m && +m[1] < (ch.quiz || 0) ? PTS.quiz : null; }
  return null;
}

function promoCode(tier) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = crypto.getRandomValues(new Uint8Array(6));
  return 'SIGNAL' + tier + '-' + [...r].map(b => alphabet[b % alphabet.length]).join('');
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

  for (const [need, tier] of TIERS) {
    if (share >= need) {
      await env.DB.prepare('INSERT OR IGNORE INTO promo_codes (user_id, tier, code) VALUES (?, ?, ?)')
        .bind(user.id, tier, promoCode(tier)).run();
    }
  }
  const { results: promos } = await env.DB.prepare(
    'SELECT tier, code, created_at, used_at FROM promo_codes WHERE user_id = ? ORDER BY tier DESC'
  ).bind(user.id).all();

  const next = TIERS.find(([need]) => share < need);
  return {
    user: { first_name: user.first_name, username: user.username, photo_url: user.photo_url },
    points: total, max, share: Math.round(share * 1000) / 10,
    next_tier: next ? { discount: next[1], need_points: Math.ceil(next[0] * max) - total } : null,
    calibration_error: calibration,
    chapters, promos,
  };
}
