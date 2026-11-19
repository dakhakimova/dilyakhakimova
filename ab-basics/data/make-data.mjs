// Данные курса «A/B на пальцах», шаг 1: заказы в приложении кафе по дням.
// Запуск: node ab-basics/data/make-data.mjs  → ab-basics/data/step01.json
// Всё выдуманное, но устроено как в жизни: сезон, праздники, день недели, погода и шум.
// Генератор с фиксированным зерном, поэтому цифры в курсе не меняются от запуска к запуску.
import { writeFileSync } from 'node:fs';

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

const DAYS = 365;
const BASE = 9000;         // заказов в день в среднем по всей сети кафе
const RELEASE = 334;       // 1 декабря (день года от 0, год не високосный)
const EFFECT = 0.02;       // настоящий эффект новой кнопки: +2%
const bump = (d, c, w, a) => a * (Math.exp(-(((d - c) / w) ** 2)) + Math.exp(-(((d - c + 365) / w) ** 2)) + Math.exp(-(((d - c - 365) / w) ** 2)));

// Сезонный множитель: зимой заказывают чаще, летом реже, вокруг праздников пики и провалы.
const season = Array.from({ length: DAYS }, (_, d) => {
  let s = 1 + 0.06 * Math.cos(2 * Math.PI * (d - 10) / 365);
  s += 0.10 / (1 + Math.exp(-(d - 333.5) / 1.2));   // с 1 декабря зимнее меню и холода
  s += bump(d, 357, 6, 0.12);    // предновогодний пик
  s -= bump(d, 0, 3, 0.18);      // 1 января все спят
  s += bump(d, 44, 2.5, 0.07);   // 14 февраля
  s += bump(d, 66, 2.5, 0.08);   // 8 марта
  s -= bump(d, 128, 4, 0.07);    // майские: все на дачах
  s -= bump(d, 215, 18, 0.07);   // август: отпуска
  s += bump(d, 243, 3, 0.05);    // 1 сентября
  return +s.toFixed(4);
});
// День недели: 0 = понедельник. Год начинается с четверга.
const weekly = [0.94, 0.95, 0.97, 1.00, 1.09, 1.12, 0.99];
const dow = d => (d + 3) % 7;

function year(seed, effectFrom) {
  const r = rng(seed);
  let weather = 0;
  return Array.from({ length: DAYS }, (_, d) => {
    weather = 0.75 * weather + 0.025 * gauss(r);        // погода: несколько дней подряд похожи
    let mean = BASE * season[d] * weekly[dow(d)] * (1 + weather);
    if (effectFrom !== null && d >= effectFrom) mean *= 1 + EFFECT;
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * 1.3 * gauss(r)));
  });
}

const data = {
  about: 'Выдуманные заказы в приложении кафе по дням. lastYear — прошлый год без кнопки, thisYear — этот год, кнопка с 1 декабря (+2%), noButton — этот год, если бы кнопку не выпускали.',
  base: BASE, release: RELEASE, effect: EFFECT, firstWeekday: 3,
  weekly, season,
  lastYear: year(2016, null),
  thisYear: year(2026, RELEASE),
  noButton: year(2026, null),
};
const sum = (a, i, j) => a.slice(i, j).reduce((x, y) => x + y, 0);
const ba = a => sum(a, RELEASE, RELEASE + 7) / sum(a, RELEASE - 7, RELEASE) - 1;
console.log('до/после этот год', (100 * ba(data.thisYear)).toFixed(1) + '%', 'прошлый год', (100 * ba(data.lastYear)).toFixed(1) + '%');
writeFileSync(new URL('./step01.json', import.meta.url), JSON.stringify(data));
