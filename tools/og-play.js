#!/usr/bin/env node
/* Статичные OG-картинки игрушек: play/og/<slug>.png (1200×630) — вопрос + кадр игрушки; play/og/index.png — каталог.
   Кадр снимается с самой игрушки (по slug) в соло-режиме главы: холст игрушки, без холста — её лист или карточка целиком.
   Снимаем до первого действия, чтобы превью не выдавало ответ; если холст до действия пуст — после шагов act из json. Серверной генерации нет:
   запускается руками после правки игрушки или вопроса, PNG кладутся в репозиторий. Сервер поднимается сам (tools/play-serve.js).
     NODE_PATH=$(npm root -g) node tools/og-play.js [slug …]      — только эти игрушки (каталог index.png не трогается)
     NODE_PATH=$(npm root -g) node tools/og-play.js               — все и каталог
   Шрифты (Literata, Onest) берутся с Google Fonts — без доступа к ним картинка выйдет с запасными шрифтами. */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const {load, ROOT} = require('./play-data.js');
const {doAct} = require('./play-act.js');
const D = load('ru'), RU = D.I18N.ru, t = k => D.I18N.typo('ru', RU[k]), X = (s, k) => D.I18N.typo('ru', D.texts[s][k]);
const cfg = {toys: D.toys};
const only = process.argv.slice(2);
const LV = {1: '#0E7E5F', 2: '#D7A928', 3: '#C9413A'};
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Onest:wght@400;600&display=swap" rel="stylesheet">';
// без доступа к Google Fonts — локальные шрифты из npm-пакетов @fontsource-variable/literata и /onest (если установлены:
// npm i @fontsource-variable/literata @fontsource-variable/onest; ищутся в NODE_PATH и в OG_FONTS); ими же подменяется
// запрос шрифтов в главе, чтобы подписи на холсте игрушки тоже были Onest
const LOCAL_FONTS = (() => {
  const dirs = [...(process.env.NODE_PATH || '').split(':'), process.env.OG_FONTS || '', '/tmp/fnt/node_modules'].filter(Boolean);
  const css = [];
  for (const [fam, pkg] of [['Literata', 'literata'], ['Onest', 'onest']]) for (const sub of ['latin', 'cyrillic']){
    const d = dirs.map(x => path.join(x, '@fontsource-variable', pkg, 'files', `${pkg}-${sub}-wght-normal.woff2`)).find(f => fs.existsSync(f));
    if (d) css.push(`@font-face{font-family:${fam}; font-weight:100 900; font-display:block; src:url(data:font/woff2;base64,${fs.readFileSync(d).toString('base64')}) format('woff2')}`);
  }
  return css.length === 4 ? css.join('\n') : '';
})();
const FONT_TAG = LOCAL_FONTS ? `<style>${LOCAL_FONTS}</style>` : FONTS;
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
    if (LOCAL_FONTS) await p.route(/fonts\.googleapis\.com\/css2/, r => r.fulfill({contentType: 'text/css', body: LOCAL_FONTS}));
    await p.goto(`${HOST}${toy.src}?toy=${toy.slug}`); await p.waitForTimeout(1200);
    const card = `.card[data-toy~="${toy.slug}"]`;
    // кадр — с холста своей игрушки (первый видимый крупнее 50×50), а без холста — первый лист карточки или вся карточка
    const pick = async () => { for (const c of await p.$$(card + ' canvas')){ const bb = await c.boundingBox(); if (bb && bb.width > 50 && bb.height > 50) return c; }
      for (const sh of await p.$$(card + ' .sheet')) if (await sh.isVisible()) return sh; return p.$(card); };
    // доля цветных (насыщенных) пикселей — есть ли на холсте данные, а не только оси
    const ink = el => el.evaluate(cv => { if (cv.tagName !== 'CANVAS' || !cv.width) return 1; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0;
      for (let i = 0; i < d.length; i += 16){ const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (d[i + 3] > 128 && mx - mn > 60) n++; } return n / (d.length / 16); });
    // кадр снимаем ДО первого действия, чтобы превью не выдавало ответ; если холст ещё пуст — после действий,
    // но только сам холст (вердикты и спойлеры в кадр не попадают)
    let el = await pick(), when = 'до действия';
    // шаги act — по одному, пока на холсте не появятся данные (меньше действий — меньше подсказок к ответу)
    for (const [i, a] of (toy.act || []).entries()){
      if (await ink(el) >= 0.004) break;
      await doAct(p, a); await p.waitForTimeout(2500); el = await pick(); when = `после act ${i + 1}/${toy.act.length}`;
    }
    frames[toy.slug] = (await el.screenshot()).toString('base64');
    await p.close();
    const page = await b.newPage({viewport: {width: 1200, height: 630}});
    await page.setContent(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${FONT_TAG}<style>${BASE}
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
    console.log('og:', toy.slug, '·', when);
  }
  if (!only.length){
    const page = await b.newPage({viewport: {width: 1200, height: 630}});
    await page.setContent(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${FONT_TAG}<style>${BASE}
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
