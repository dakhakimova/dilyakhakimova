#!/usr/bin/env node
/* Headless-проверка игр /play/ (Playwright). Сервер поднимается сам на свободном порту — можно запускать параллельно.
     NODE_PATH=$(npm root -g) node tools/test-play.js                 — все игры из play/toys-*.json + каталог
     NODE_PATH=$(npm root -g) node tools/test-play.js ab              — игры одного курса (vp | ss | ab)
     NODE_PATH=$(npm root -g) node tools/test-play.js peeking galton  — выбранные
     NODE_PATH=$(npm root -g) node tools/test-play.js chapters        — все главы трёх курсов: открываются без ошибок консоли
     … --shots <папка>  — ещё и скриншоты страниц: <slug>-1200.png, <slug>-375.png, <slug>-embed.png
   Перед проверкой — node tools/bake-i18n.js (страницы /play/ собираются из данных).
   Что проверяется для игры (ширина 1200 и 375): нет ошибок в консоли страницы и iframe; в iframe видны только карточки
   игры и прогноза; act из json меняет игру; range (если есть) тоже; вывод и data-toy-reveal (своих карточек) скрыты
   до касания и открываются после; прогноз внутри карточки (ставка, поле «?») вывод не раскрывает; act — селекторы или точки
   холста (tools/play-act.js); подпись «Игра из курса…» есть; iframe не обрезает игру; нет горизонтальной прокрутки;
   ?embed=1 открывает соло-режим с подписью. Ошибки — в конце, код выхода 1. */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const {load, ROOT} = require('./play-data.js');
const {doAct} = require('./play-act.js');
const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots'), shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
const D = load('ru');
const errs = [];
const IGNORE = /fonts\.g|Failed to load resource/;   // шрифты без сети и картинки-заглушки (404) — не ошибки

function watch(p, tag, apiOk = false){
  p.on('pageerror', e => errs.push(`${tag}: PAGEERR ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`${tag}: console ${m.text()}`); });
  // в соло-режиме и на /play/ — ни прогресса, ни баллов: запросы к /api/ (кроме счётчика /api/hit) — ошибка; в самом курсе /api/me нормален
  p.on('request', r => { if ((!apiOk && /\/api\/(?!hit)/.test(r.url())) || /pyodide/.test(r.url())) errs.push(`${tag}: лишний запрос ${r.url()}`); });
}

(async () => {
  const srv = await require('./play-serve.js')(), H = srv.url;
  const b = await chromium.launch();
  if (shots) fs.mkdirSync(shots, {recursive: true});

  if (args[0] === 'chapters'){
    const files = ['probability', 'signal', 'ab-basics'].flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => /^\d\d-.*\.html$/.test(f)).map(f => `/${d}/${f}`));
    for (const f of files){
      const p = await b.newPage({viewport: {width: 1200, height: 900}}); watch(p, f, true);
      await p.route(/pyodide|jsdelivr/, r => r.abort());
      await p.goto(H + f); await p.waitForTimeout(250);
      // пройти все карточки: многие игры рисуются при показе карточки
      const n = await p.$$eval('.card', c => c.length);
      // на последней карточке «Далее» ведёт в следующую главу — не уходим со страницы
      for (let i = 0; i < n - 1; i++){ const go = await p.evaluate(() => { const b = document.getElementById('next'); if (!b || b.disabled || b.tagName === 'A' || /оглавлен|глав|шаг/i.test(b.textContent)) return false; b.click(); return true; }).catch(() => false); if (!go) break; await p.waitForTimeout(40); }
      if (!p.url().split("#")[0].endsWith(f)) errs.push(`${f}: листалка увела на ${p.url()}`);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 2) errs.push(`${f}: горизонтальная прокрутка ${over}`);
      console.log(`${f}: карточек ${n}`);
      await p.close();
    }
    // соло-режим каждой опубликованной игры
    for (const toy of D.toys){
      const p = await b.newPage({viewport: {width: 800, height: 900}}); watch(p, toy.slug + ' solo');
      await p.goto(`${H}${toy.src}?toy=${toy.slug}`); await p.waitForTimeout(300);
      const vis = await p.$$eval('.card', c => c.filter(x => getComputedStyle(x).display !== 'none').length);
      if (vis !== 1 + toy.pre.length) errs.push(`${toy.slug}: в соло-режиме видно карточек ${vis}, ждали ${1 + toy.pre.length}`);
      await p.close();
    }
  } else {
    const pick = args.length ? D.toys.filter(t => args.includes(t.slug) || args.includes(t.course)) : D.toys;
    if (!pick.length) errs.push('нет таких игр: ' + args.join(' '));
    for (const toy of pick){
      const s = toy.slug;
      for (const width of [1200, 375]){
        const p = await b.newPage({viewport: {width, height: 900}}); watch(p, `${s} ${width}`);
        await p.goto(`${H}/play/${s}/`); await p.waitForTimeout(1000);
        const fr = p.frames().find(f => /toy=/.test(f.url()));
        if (!fr){ errs.push(s + ' нет iframe'); await p.close(); continue; }
        const snap = () => fr.evaluate(sl => { const c = document.querySelector(`.card[data-toy~="${sl}"]`); let t = c.innerText; c.querySelectorAll('canvas').forEach(x => { try { t += x.toDataURL(); } catch(e) {} }); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; }, s);
        const state = () => Promise.all([p.$eval('.play-out .reveal', e => e.hidden), fr.$$eval(mineRv, a => a.filter(e => e.getClientRects().length).length), fr.$$eval(mineRv, a => a.length)]);
        // спойлеры — только в карточках этой игры и её прогноза (в главе бывает несколько игр)
        const mineRv = `.card[data-toy~="${s}"] [data-toy-reveal], .card[data-toy-pre~="${s}"] [data-toy-reveal]`;
        const [hid0, rv0, rvN] = await state();
        // ставка внутри карточки игры (кнопка прогноза или поле догадки) не должна раскрывать вывод — это не касание игры
        let betOk = null;
        const bet = await fr.$(`.card[data-toy~="${s}"] .choice[data-key] button, .card[data-toy~="${s}"] .guess button, .card[data-toy~="${s}"] input.guess-in`);
        if (bet && await bet.isVisible() && !(typeof toy.act[0] === 'string' && await bet.evaluate((e, sel) => e.matches(sel), toy.act[0]))){
          if (await bet.evaluate(e => e.tagName === 'INPUT')) await bet.fill('7'); else await bet.click();
          await p.waitForTimeout(400);
          const [hb, rb] = await state(); betOk = hb && rb === 0;
          if (!betOk) errs.push(`${s} ${width}: вывод раскрылся сразу после прогноза, до игры`);
        }
        const before = await snap();
        for (const a of toy.act){ await doAct(fr, a); await p.waitForTimeout(500); }
        await p.waitForTimeout(1200);
        const after = await snap();
        let rangeOk = null;
        if (toy.range){ const r = await fr.$(toy.range); await r.focus(); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500); rangeOk = (await snap()) !== after; }
        const [hid1, rv1] = await state();
        const fh = await p.$eval('#toy-frame', f => f.getBoundingClientRect().height);
        const inner = await fr.evaluate(() => ({sh: document.documentElement.scrollHeight, over: document.documentElement.scrollWidth - innerWidth, cards: [...document.querySelectorAll('.card')].filter(c => getComputedStyle(c).display !== 'none').length, credit: (document.querySelector('.play-credit') || {}).textContent || ''}));
        const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        console.log(`${s} ${width}px: карточек ${inner.cards}, игра ${before !== after ? 'меняется' : 'НЕ меняется'}${rangeOk === null ? '' : rangeOk ? ', ползунок работает' : ', ползунок НЕ меняет'}, вывод ${hid0 && !hid1 ? 'раскрылся после касания' : 'ОШИБКА'}, спойлеры ${rvN ? (rv0 === 0 && rv1 === rvN ? 'раскрылись' : 'ОШИБКА') : 'нет'}, ${betOk === null ? '' : betOk ? 'прогноз не раскрыл вывод, ' : 'прогноз РАСКРЫЛ вывод, '}подпись ${inner.credit ? 'есть' : 'НЕТ'}, iframe ${Math.round(fh)}/${inner.sh}, прокрутка ${over}/${inner.over}`);
        if (inner.cards !== 1 + toy.pre.length) errs.push(`${s} ${width}: видно карточек ${inner.cards}, ждали ${1 + toy.pre.length}`);
        if (before === after) errs.push(`${s} ${width}: act не изменил игру`);
        if (rangeOk === false) errs.push(`${s} ${width}: range не изменил игру`);
        if (!(hid0 && !hid1)) errs.push(`${s} ${width}: вывод не раскрылся (до ${hid0 ? 'скрыт' : 'виден'}, после ${hid1 ? 'скрыт' : 'виден'})`);
        if (rvN && !(rv0 === 0 && rv1 === rvN)) errs.push(`${s} ${width}: data-toy-reveal: до касания видно ${rv0}, после ${rv1} из ${rvN}`);
        if (!/Игра\s+из\s+курса/.test(inner.credit)) errs.push(`${s} ${width}: нет подписи-источника под игрой`);
        if (over > 2 || inner.over > 2) errs.push(`${s} ${width}: горизонтальная прокрутка ${over}/${inner.over}`);
        if (fh < inner.sh - 40) errs.push(`${s} ${width}: iframe обрезан ${Math.round(fh)} < ${inner.sh}`);
        if (width === 1200 && Math.abs(fh - toy.h) > 250) console.log(`  подсказка: поставь в json h ≈ ${Math.round(fh / 50) * 50} (сейчас ${toy.h}) — страница не будет прыгать при загрузке`);
        if (shots){ await p.waitForTimeout(300); await p.screenshot({path: path.join(shots, `${s}-${width}.png`), fullPage: true}); }
        await p.close();
      }
      // встраивание
      const p = await b.newPage({viewport: {width: 375, height: 800}}); watch(p, `${s} embed`);
      await p.goto(`${H}/play/${s}/?embed=1`); await p.waitForTimeout(900);
      const u = p.url();
      const credit = await p.$eval('.play-credit a', a => ({href: a.getAttribute('href'), target: a.target})).catch(() => null);
      const vis = await p.evaluate(() => [...document.querySelectorAll('.card')].filter(c => getComputedStyle(c).display !== 'none').length);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      console.log(`${s} embed: ${u.replace(H, '')} · карточек ${vis} · подпись → ${credit ? credit.href + ' (' + credit.target + ')' : 'НЕТ'} · прокрутка ${over}`);
      if (!/embed=1/.test(u) || !credit || credit.target !== '_blank' || vis < 1 || over > 2) errs.push(s + ' embed не работает');
      if (shots) await p.screenshot({path: path.join(shots, `${s}-embed.png`), fullPage: true});
      await p.close();
    }
    // каталог
    for (const width of [1200, 375]){
      const p = await b.newPage({viewport: {width, height: 800}}); watch(p, 'catalog ' + width);
      await p.goto(H + '/play/'); await p.waitForTimeout(300);
      const n = await p.$$eval('.toys li', x => x.length), over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      console.log(`каталог ${width}: карточек ${n}, прокрутка ${over}`); if (over > 2) errs.push('каталог: горизонтальная прокрутка');
      const npub = D.toys.filter(x => x.published).length; // в каталоге — только опубликованные (published: true в play/toys-*.json)
      if (n !== npub) errs.push(`каталог: ${n} карточек, а опубликованных игр ${npub} — пересобери (node tools/bake-i18n.js)`);
      if (shots) await p.screenshot({path: path.join(shots, `catalog-${width}.png`), fullPage: true});
      await p.close();
    }
  }
  await b.close(); srv.close();
  console.log(errs.length ? '\nОШИБКИ:\n' + errs.join('\n') : '\nOK');
  process.exit(errs.length ? 1 : 0);
})();
