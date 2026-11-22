#!/usr/bin/env node
/* OG-картинки мини-лабораторий: terms/og/<slug>.png (1200×630) — метка, заголовок «<термин> простыми словами» и схема страницы
   (та же SVG из tools/terms-viz.js); terms/og/index.png — хаб. Устроено как tools/og-play.js: шрифты Literata и Onest —
   локальные из @fontsource-variable (если установлены), иначе Google Fonts. Запуск после правки текстов или схем:
     NODE_PATH=$(npm root -g) node tools/og-terms.js [slug …] */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const {viz} = require('./terms-viz.js');
const ROOT = path.join(__dirname, '..');
const ctx = {}; ctx.globalThis = ctx;
for (const f of ['i18n/site.js', 'i18n/terms.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const RU = ctx.I18N.ru, TX = ctx.TERMS_TEXT.ru, typo = s => ctx.I18N.typo('ru', s);
const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'terms/terms.json'), 'utf8'));
const only = process.argv.slice(2);
const LOCAL = (() => {
  const dirs = [...(process.env.NODE_PATH || '').split(':'), '/tmp/fnt/node_modules'].filter(Boolean), css = [];
  for (const [fam, pkg] of [['Literata', 'literata'], ['Onest', 'onest']]) for (const sub of ['latin', 'cyrillic']){
    const d = dirs.map(x => path.join(x, '@fontsource-variable', pkg, 'files', `${pkg}-${sub}-wght-normal.woff2`)).find(f => fs.existsSync(f));
    if (d) css.push(`@font-face{font-family:${fam}; font-weight:100 900; src:url(data:font/woff2;base64,${fs.readFileSync(d).toString('base64')}) format('woff2')}`); }
  return css.length === 4 ? `<style>${css.join('\n')}</style>` : require('./fonts-inline.js')();
})();
const BASE = `*{box-sizing:border-box} body{margin:0; width:1200px; height:630px; overflow:hidden; background:#E9E5DE radial-gradient(rgba(120,110,90,.22) 1px, transparent 1.2px) 0 0/18px 18px; font-family:Onest, sans-serif; color:#24221F}
.eb{font:600 20px/1 Onest; letter-spacing:.08em; text-transform:uppercase; color:#A63D28} .site{font:400 22px/1 Onest; color:#5E5A53}
h1{font:400 58px/1.08 Literata, Georgia, serif; letter-spacing:-.02em; margin:0}`;
(async () => {
  const b = await chromium.launch(); fs.mkdirSync(path.join(ROOT, 'terms/og'), {recursive: true});
  for (const t of cfg.terms.filter(x => !only.length || only.includes(x.slug))){
    const x = TX[t.slug], h1 = plain(typo(x.h1 || RU['terms.h1'].replace('{name}', x.name)));
    const L = Object.fromEntries(Object.entries(x.vz).map(([k, v]) => [k, plain(typo(v))]));
    const p = await b.newPage({viewport: {width: 1200, height: 630}});
    await p.setContent(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${LOCAL}<style>${BASE}
      .l{position:absolute; left:64px; top:72px; bottom:64px; width:500px; display:flex; flex-direction:column; gap:24px} .site{margin-top:auto}
      .r{position:absolute; right:48px; top:56px; bottom:56px; width:560px; background:#fff; border-radius:16px; box-shadow:0 20px 34px -18px rgba(60,40,10,.48); display:flex; align-items:center; justify-content:center; padding:24px}
      .r svg{width:100%; height:100%; font-family:Onest}</style></head><body>
      <div class="l"><span class="eb">${RU['terms.kicker']}</span><h1>${h1}</h1><span class="site">dilyakhakimova.com/terms</span></div>
      <div class="r">${viz[t.slug](L)}</div></body></html>`, {waitUntil: 'networkidle'}).catch(() => {});
    await p.waitForTimeout(200); await p.screenshot({path: path.join(ROOT, `terms/og/${t.slug}.png`)}); await p.close(); console.log('og:', t.slug);
  }
  if (!only.length){
    const p = await b.newPage({viewport: {width: 1200, height: 630}});
    const names = cfg.terms.map(t => plain(TX[t.slug].name));
    await p.setContent(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${LOCAL}<style>${BASE}
      .w{position:absolute; inset:64px; display:flex; flex-direction:column; gap:24px} h1{font-size:64px; max-width:900px}
      .g{display:flex; flex-wrap:wrap; gap:10px; margin-top:8px} .g span{background:#fff; border-radius:999px; padding:9px 16px; font:400 21px/1 Onest; box-shadow:0 1px 2px rgba(60,40,10,.1)}
      .site{margin-top:auto}</style></head><body><div class="w"><span class="eb">${plain(RU['terms.hub.crumb'])}</span><h1>${plain(typo(RU['terms.hub.h1']))}</h1>
      <div class="g">${names.map(n => `<span>${n}</span>`).join('')}</div><span class="site">dilyakhakimova.com/terms</span></div></body></html>`, {waitUntil: 'networkidle'}).catch(() => {});
    await p.waitForTimeout(200); await p.screenshot({path: path.join(ROOT, 'terms/og/index.png')}); await p.close(); console.log('og: index');
  }
  await b.close();
})();
