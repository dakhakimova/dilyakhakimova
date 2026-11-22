#!/usr/bin/env node
/* Headless-проверка мини-лабораторий /terms/ (Playwright) на ширине 1200 и 375:
   нет ошибок консоли (страница и iframe), нет горизонтальной прокрутки, игра в iframe ответила высотой,
   своя игра (terms/toys.js) после прогноза и главной кнопки показывает вердикт, все кнопки игры нажимаются без ошибок;
   ответы задач лежат в HTML; title ≤ 65; есть canonical; общий текст страниц не больше трети (правка 6 из terms-fixes).
     NODE_PATH=$(npm root -g) node tools/test-terms.js [slug …] [--base http://127.0.0.1:8000] [--shots папка --only hub,slug,…]
   Без --base сервер поднимается сам (tools/play-serve.js). */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const base = opt('--base'), shotDir = opt('--shots'), shotList = opt('--only') || '';
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'terms/terms.json'), 'utf8'));
const slugs = args.length ? args : cfg.terms.map(t => t.slug);
const errs = [];
const IGNORE = /fonts\.g|Failed to load resource/;

// общий текст: абзацы, повторяющиеся на 3+ страницах
function boiler(){
  const text = s => fs.readFileSync(path.join(ROOT, 'terms', s, 'index.html'), 'utf8').split('<main')[1].split('</main>')[0]
    .replace(/<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/g, '').split(/<\/(?:p|li|h2|h3|summary|th|td|span)>/).map(x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(x => x.length > 2);
  const all = cfg.terms.map(t => text(t.slug)), cnt = {};
  all.forEach(ps => new Set(ps).forEach(p => cnt[p] = (cnt[p] || 0) + 1));
  all.forEach((ps, i) => { const tot = ps.join('').length, com = ps.filter(p => cnt[p] >= 3).join('').length;
    const r = com / tot; if (r > 1 / 3) errs.push(`${cfg.terms[i].slug}: общего текста ${Math.round(r * 100)} %`);
    console.log(`общий текст ${cfg.terms[i].slug}: ${Math.round(r * 100)} %`); });
}

(async () => {
  boiler();
  const srv = base ? null : await require('./play-serve.js')(), H = base || srv.url;
  const b = await chromium.launch();
  const watch = (p, tag) => {
    p.on('pageerror', e => errs.push(`${tag}: PAGEERR ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`${tag}: console ${m.text()}`); });
  };
  for (const w of [1200, 375]){
    for (const s of ['', ...slugs]){
      const url = `${H}/terms/${s ? s + '/' : ''}`, tag = `${s || 'hub'} @${w}`;
      const p = await b.newPage({viewport: {width: w, height: 900}}); watch(p, tag);
      await p.goto(url, {waitUntil: 'load'});
      const title = await p.title(); if (title.length > 65) errs.push(`${tag}: title ${title.length}`);
      if (!(await p.$('link[rel=canonical]'))) errs.push(`${tag}: нет canonical`);
      if (await p.$('meta[name=robots][content*=noindex]')) errs.push(`${tag}: noindex`);
      if (s){
        const fr = await p.$('#toy-frame');
        if (fr){
          await fr.scrollIntoViewIfNeeded(); await p.waitForTimeout(3500);
          const st = await p.evaluate(() => { const f = document.getElementById('toy-frame'); return {h: f.style.height, broken: f.parentNode.classList.contains('broken')}; });
          const h0 = cfg.terms.find(t => t.slug === s).toy;
          if (st.broken) errs.push(`${tag}: iframe не ответил`);
          // в iframe — соло-режим главы с noindex
          const fc = fr && await fr.contentFrame();
          if (fc){ const ni = await fc.$('meta[name=robots][content*=noindex]'); if (!ni) errs.push(`${tag}: в соло-режиме нет noindex`);
            const vis = await fc.$$eval('.card', c => c.filter(x => getComputedStyle(x).display !== 'none').length); if (!vis) errs.push(`${tag}: в iframe не видно игры`); }
          console.log(`${tag}: iframe ${h0} → ${st.h}`);
        }
        const own = await p.$('.t-toy');
        if (own){
          await own.scrollIntoViewIfNeeded();
          await p.click('.t-toy .choice button[data-v="0"]');
          await p.click('.t-toy .t-ctl .btn:not(.ghost)'); await p.waitForTimeout(1200);
          if (!(await p.isVisible('.t-toy .verdict'))) errs.push(`${tag}: своя игра — нет вердикта`);
          if (!(await p.$('.t-toy .choice.done [data-right]'))) errs.push(`${tag}: не подсвечен верный прогноз`);
          for (const g of await p.$$('.t-toy .btn.ghost, .t-toy .seg button')) { await g.click(); await p.waitForTimeout(150); }
          await p.click('.t-toy .t-ctl .btn:not(.ghost)'); await p.waitForTimeout(1200);
          console.log(`${tag}: своя игра — ${(await p.textContent('.t-toy .verdict')).slice(0, 90)}`);
        }
        const faq = await p.$$eval('details.t-faq p', d => d.map(x => x.textContent.length));
        if (faq.length < 2 || faq.some(n => n < 20)) errs.push(`${tag}: ответы задач не в HTML`);
      }
      const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 1) errs.push(`${tag}: горизонтальная прокрутка ${over}px`);
      if (shotDir && (shotList.split(',').includes(s || 'hub'))){
        fs.mkdirSync(shotDir, {recursive: true});
        await p.screenshot({path: path.join(shotDir, `terms-${s || 'hub'}-${w}.png`), fullPage: true});
      }
      await p.close();
    }
  }
  await b.close(); if (srv) srv.close();
  if (errs.length){ console.log('\nОШИБКИ:\n' + errs.join('\n')); process.exit(1); }
  console.log('\nok: страниц', slugs.length + 1, '× 2 ширины');
})();
