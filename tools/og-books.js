#!/usr/bin/env node
/* OG-картинки рубрики «Котейка читает»: shelf/og/<выпуск>.png (1200×630).
   Своя вёрстка: метка, заголовок, строка о книге и своя схема — без обложки и рисунков из книги.
     NODE_PATH=$(npm root -g) node tools/og-books.js
   Шрифты — локальные @fontsource-variable/literata и /onest (как в tools/og-play.js), иначе Google Fonts. */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const dirs = [...(process.env.NODE_PATH || '').split(':'), process.env.OG_FONTS || '', '/tmp/fnt/node_modules'].filter(Boolean);
const css = [];
for (const [fam, pkg] of [['Literata', 'literata'], ['Onest', 'onest']]) for (const sub of ['latin', 'cyrillic']){
  const f = dirs.map(x => path.join(x, '@fontsource-variable', pkg, 'files', `${pkg}-${sub}-wght-normal.woff2`)).find(x => fs.existsSync(x));
  if (f) css.push(`@font-face{font-family:${fam}; font-weight:100 900; src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2')}`);
}
const FONTS = css.length === 4 ? `<style>${css.join('\n')}</style>` : require('./fonts-inline.js')();
const ava = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'ab-basics/img/ava-kot.jpg')).toString('base64');
const bar = `<svg width="620" height="56" viewBox="0 0 440 40"><rect x="0" y="4" width="38" height="30" rx="6" fill="#23418A"/><rect x="42" y="4" width="398" height="30" rx="6" fill="#E8644A"/>
  <g stroke="#fff" stroke-opacity=".8" stroke-width="2"><line x1="122" y1="6" x2="122" y2="32"/><line x1="202" y1="6" x2="202" y2="32"/><line x1="282" y1="6" x2="282" y2="32"/><line x1="362" y1="6" x2="362" y2="32"/></g></svg>`;
const page = (title, line, extra) => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${FONTS}<style>
*{box-sizing:border-box} body{margin:0; width:1200px; height:630px; overflow:hidden; background:#E9E5DE radial-gradient(rgba(120,110,90,.22) 1px, transparent 1.2px) 0 0/18px 18px; font-family:Onest, sans-serif; color:#24221F}
.card{position:absolute; inset:48px; background:#FBFAF6; border-radius:24px; box-shadow:0 2px 4px rgba(60,40,10,.06), 0 20px 34px -18px rgba(60,40,10,.48); padding:56px 64px}
.lab{display:flex; align-items:center; gap:16px; font:600 24px/1 Onest; letter-spacing:.08em; text-transform:uppercase; color:#A63D28}
.lab img{width:56px; height:56px; border-radius:50%}
h1{font:400 64px/1.08 Literata, serif; letter-spacing:-.02em; margin:28px 0 20px; max-width:15em}
p{font:400 28px/1.35 Literata, serif; color:#4A463F; margin:0}
.site{position:absolute; right:64px; bottom:44px; font:400 22px/1 Onest; color:#5E5A53}
.bar{position:absolute; left:64px; bottom:40px}
</style></head><body><div class="card"><div class="lab"><img src="${ava}">Котейка читает</div><h1>${title}</h1><p>${line}</p>${extra || ''}<div class="site">dilyakhakimova.com/shelf</div></div></body></html>`;

(async () => {
  const b = await chromium.launch(), p = await b.newPage({viewport: {width: 1200, height: 630}});
  fs.mkdirSync(path.join(ROOT, 'shelf/og'), {recursive: true});
  const shots = {
    'kohavi-trustworthy': page('Как не выкатить баг, который притворился победой', 'Trustworthy Online Controlled Experiments · Kohavi, Tang, Xu', `<div class="bar">${bar}</div>`),
  };
  for (const [k, html] of Object.entries(shots)){
    await p.setContent(html); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({path: path.join(ROOT, 'shelf/og', k + '.png')});
    console.log('og: shelf/og/' + k + '.png');
  }
  await b.close();
})();
