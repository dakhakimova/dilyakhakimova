#!/usr/bin/env node
/* Тесты промокодов за пройденные курсы (functions/api/_lib.js): база — SQLite в памяти (node:sqlite) с обёрткой под D1.
     node tools/test-promo.mjs */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { issueCoursePromo, validatePromo, redeemPromo, summary, COURSES } from '../functions/api/_lib.js';
const raw = new DatabaseSync(':memory:');
raw.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const DB = { prepare(sql){ const st = raw.prepare(sql); let args = [];
  const o = { bind(...a){ args = a; return o; }, async run(){ const r = st.run(...args); return {meta: {changes: r.changes}}; },
    async all(){ return {results: st.all(...args)}; }, async first(){ return st.get(...args) || null; } }; return o; } };
const env = { DB };
let fail = 0; const ok = (c, m) => { console.log((c ? 'ок   ' : 'ОШИБКА ') + m); if (!c) fail++; };
raw.prepare("INSERT INTO users (tg_id, first_name) VALUES (1, 'Лена'), (2, 'Артём')").run();
const t0 = new Date('2026-11-22T10:00:00Z');
const a = await issueCoursePromo(env, 1, 'vp', t0), a2 = await issueCoursePromo(env, 1, 'vp', t0), b = await issueCoursePromo(env, 1, 'ss', t0);
ok(a.code === a2.code, 'повторная выдача за тот же курс возвращает тот же код');
ok(a.code !== b.code, 'за другой курс — свой код');
ok(a.discount === 20, 'скидка 20%');
ok(a.expires_at.startsWith('2027-11-22'), 'действует год');
ok((await validatePromo(env, a.code, t0)).valid, 'новый код действителен');
ok((await validatePromo(env, a.code.toLowerCase(), t0)).valid, 'регистр не важен');
ok((await validatePromo(env, 'NOPE', t0)).reason === 'not_found', 'несуществующий код');
ok((await validatePromo(env, a.code, new Date('2027-11-23T00:00:00Z'))).reason === 'expired', 'через год — истёк');
const r1 = await redeemPromo(env, a.code, 'order-1', t0), r2 = await redeemPromo(env, a.code, 'order-2', t0);
ok(r1.redeemed, 'погашение');
ok(!r2.valid && r2.reason === 'redeemed', 'одноразовый: второй раз не гасится');
ok((await validatePromo(env, b.code, t0)).valid, 'второй код пользователя действует отдельно');
// подарить: код работает независимо от того, кто его вводит (проверка не смотрит на пользователя)
ok((await redeemPromo(env, b.code, 'order-of-colleague', t0)).redeemed, 'код можно подарить: гасится без привязки к покупателю');
// summary: курс засчитан, когда done во всех шагах
const ins = raw.prepare("INSERT INTO events (user_id, chapter, kind, key, points) VALUES (2, ?, 'done', '1', 0)");
COURSES.ab.chapters.slice(0, -1).forEach(ch => ins.run(ch));
let s = await summary(env, {id: 2, first_name: 'Артём'});
ok(s.courses_done.length === 0 && s.promos.length === 0, 'без последнего шага курс не засчитан, кода нет');
ins.run(COURSES.ab.chapters.at(-1));
s = await summary(env, {id: 2, first_name: 'Артём'});
ok(s.courses_done.map(c => c.id).join() === 'ab' && s.promos.length === 1 && s.promos[0].course === 'ab', 'все шаги — курс пройден, выдан код за «A/B на пальцах»');
ok(s.discount === 20, 'в сводке скидка 20%');
console.log(fail ? `\nОШИБОК: ${fail}` : '\nOK'); process.exit(fail ? 1 : 0);
