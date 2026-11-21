#!/usr/bin/env node
/* Статичные OG-картинки игрушек: play/og/<slug>.png (1200×630) — вопрос + кадр игрушки; play/og/index.png — каталог.
   Кадр снимается с самой игрушки в соло-режиме главы, после нажатий из play/toys-*.json → act. Серверной генерации нет:
   запускается руками после правки игрушки или вопроса, PNG кладутся в репозиторий. Сервер поднимается сам (tools/play-serve.js).
     NODE_PATH=$(npm root -g) node tools/og-play.js [slug …]      — только эти игрушки (каталог index.png не трогается)
     NODE_PATH=$(npm root -g) node tools/og-play.js               — все и каталог
   Шрифты (Literata, Onest) берутся с Google Fonts — без доступа к ним картинка выйдет с запасными шрифтами. */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const {load, ROOT} = require('./play-data.js');
const D = load('ru'), RU = D.I18N.ru, t = k => D.I18N.typo('ru', RU[k]), X = (s, k) => D.I18N.typo('ru', D.texts[s][k]);
const cfg = {toys: D.toys};
const only = process.argv.slice(2);
const LV = {1: '#0E7E5F', 2: '#D7A928', 3: '#C9413A'};
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Onest:wght@400;600&display=swap" rel="stylesheet">';
const BASE = `*{box-sizing:border-box} body{margin:0; width:1200px; height:630px; overflow:hidden; background:#E9E5DE radial-gradient(rgba(120,110,90,.22) 1px, transparent 1.2px) 0 0/18px 18px; font-family:Onest, system-ui, sans-serif; color:#24221F}
.chip{display:inline-flex; align-items:center; gap:8px; font:600 22px/1 Onest, sans-serif; background:#fff; padding:10px 16px; border-radius:9999px; box-shadow:0 1px 2px rgba(60,40,10,.1)}
.dot{width:14px; height:14px; border-radius:50%} .site{font:400 22px/1 Onest, sans-serif; color:#5E5A53}`;

(async () => {
  const srv = await require('./play-serve.js')(), HOST = srv.url;
  const b = await chromium.launch(); fs.mkdirSync(path.join(ROOT, 'play/og'), {recursive: true});
  const frames = {};
  const need = only.length ? cfg.toys.filter(x => only.includes(x.slug)) : cfg.toys;
  for (const toy of need){
    const p = await b.newPage({viewport: {width: 760, height: 900}, deviceScaleFactor: 2});
    await p.goto(`${HOST}${toy.src}?toy=${toy.slug}`); await p.waitForTimeout(600);
    for (const sel of toy.act || []){ await p.click(sel); await p.waitForTimeout(400); }
    await p.waitForTimeout(2500);
    frames[toy.slug] = (await (await p.$('.card[data-toy] canvas')).screenshot()).toString('base64');
    await p.close();
    const page = await b.newPage({viewport: {width: 1200, height: 630}});
    await page.setContent(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${FONTS}<style>${BASE}
      .l{position:absolute; left:64px; top:64px; width:500px; bottom:64px; display:flex; flex-direction:column; gap:28px}
      h1{font:400 54px/1.1 Literata, Georgia, serif; letter-spacing:-.01em; margin:0}
      .site{margin-top:auto}
      .r{position:absolute; right:48px; top:56px; bottom:56px; width:560px; background:#fff; border-radius:16px; box-shadow:0 2px 4px rgba(60,40,10,.06), 0 20px 34px -18px rgba(60,40,10,.48); display:flex; align-items:center; justify-content:center; padding:20px}
      .r img{max-width:100%; max-height:100%}</style></head><body>
      <div class="l"><span class="chip" style="align-self:flex-start"><span class="dot" style="background:${LV[toy.level]}"></span>${t('lvl.' + toy.level)}</span>
      <h1>${X(toy.slug, 'q')}</h1><span class="site">dilyakhakimova.com/play</span></div>
      <div class="r"><img src="data:image/png;base64,${frames[toy.slug]}"></div></body></html>`, {waitUntil: 'networkidle'}).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({path: path.join(ROOT, `play/og/${toy.slug}.png`)}); await page.close();
    console.log('og:', toy.slug);
  }
  if (!only.length){
    const page = await b.newPage({viewport: {width: 1200, height: 630}});
    await page.setContent(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${FONTS}<style>${BASE}
      h1{position:absolute; left:64px; top:52px; margin:0; font:400 72px/1 Literata, Georgia, serif}
      p{position:absolute; left:64px; top:140px; margin:0; font:400 26px/1.3 Literata, Georgia, serif; color:#4A463F; width:1000px}
      .g{position:absolute; left:64px; right:64px; bottom:64px; top:230px; display:grid; grid-template-columns:repeat(${Math.min(3, cfg.toys.length)}, 1fr); gap:24px}
      .g div{background:#fff; border-radius:16px; box-shadow:0 1px 2px rgba(60,40,10,.08), 0 6px 14px -6px rgba(60,40,10,.22); display:flex; align-items:center; justify-content:center; padding:12px; overflow:hidden}
      .g img{max-width:100%; max-height:100%} .site{position:absolute; right:64px; top:72px}</style></head><body>
      <h1>${t('play.title')}</h1><span class="site">dilyakhakimova.com/play</span><p>${t('play.lead')}</p>
      <div class="g">${cfg.toys.slice(0, 3).map(x => `<div><img src="data:image/png;base64,${frames[x.slug]}"></div>`).join('')}</div></body></html>`, {waitUntil: 'networkidle'}).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({path: path.join(ROOT, 'play/og/index.png')}); await page.close(); console.log('og: index');
  }
  await b.close(); srv.close();
})();
