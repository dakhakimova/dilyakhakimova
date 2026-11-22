/* Шрифты для OG-картинок (Playwright рисует страницу без сервера): @font-face с данными из /fonts/*.woff2 прямо в <style>.
   Те же файлы, что на сайте (/fonts/fonts.css), без Google Fonts. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'fonts');
module.exports = function(){
  const css = [];
  for (const [fam, pkg, ws] of [['Literata', 'literata', [400, 500]], ['Onest', 'onest', [400, 500, 600]]])
    for (const w of ws) for (const sub of ['latin', 'cyrillic', 'latin-ext']){
      const f = path.join(DIR, `${pkg}-${sub}-${w}-normal.woff2`);
      if (fs.existsSync(f)) css.push(`@font-face{font-family:${fam}; font-weight:${w}; src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')}) format('woff2')}`);
    }
  return `<style>${css.join('\n')}</style>`;
};
