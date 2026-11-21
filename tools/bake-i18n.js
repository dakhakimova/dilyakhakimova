#!/usr/bin/env node
/* Вписывает строки словаря i18n/home.js в разметку главной, чтобы страница читалась без JS и поисковиками.
   node tools/bake-i18n.js       — обновить index.html (язык из <html lang>, сейчас ru)
   node tools/bake-i18n.js en    — собрать en/index.html из index.html с английским словарём (когда будет перевод;
                                   не забыть hreflang на обеих страницах и показать переключатель в шапке)
   Правило разметки: у элемента с data-i18n всё содержимое берётся из словаря; data-i18n-attr="атрибут:ключ;…". */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { globalThis: {} }; ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/home.js'), 'utf8'), ctx);
const I18N = ctx.I18N;

const target = process.argv[2];
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lang = target || (html.match(/<html lang="(\w+)"/) || [, 'ru'])[1];
if (target) html = html.replace(/<html lang="\w+"/, `<html lang="${lang}"`);

const DICT = I18N[lang] || {}, RU = I18N.ru;
const NF = new Intl.NumberFormat(lang), PF = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 });
const missing = new Set();
function t(key){
  if (!(key in RU)) missing.add(key);
  const v = key in DICT ? DICT[key] : (key in RU ? RU[key] : key);
  if (typeof v !== 'string') throw new Error('ключ ' + key + ' — не строка (формы множественного числа — только для кода)');
  return I18N.typo(lang, v.replace(/\{(num|pct):([\d.]+)\}/g, (_, k, x) => k === 'num' ? NF.format(+x) : PF.format(+x)));
}
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// атрибуты
html = html.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
  for (const pair of spec.split(';')){
    const [attr, key] = pair.split(':').map(s => s.trim());
    const re = new RegExp(`(\\s${attr}=")[^"]*(")`);
    tag = re.test(tag) ? tag.replace(re, `$1${esc(t(key).replace(/<[^>]+>/g, ''))}$2`) : tag.replace(/\s*\/?>$/, m => ` ${attr}="${esc(t(key))}"${m}`);
  }
  return tag;
});

// содержимое: ищем парный закрывающий тег с учётом вложенных тегов того же имени
const open = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>/g;
let out = '', pos = 0, m;
while ((m = open.exec(html))){
  const name = m[1].toLowerCase(), start = m.index + m[0].length;
  const scan = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi'); scan.lastIndex = start;
  let depth = 1, s, end = -1;
  while ((s = scan.exec(html))){ depth += s[1] ? -1 : 1; if (!depth){ end = s.index; break; } }
  if (end < 0) throw new Error('нет закрывающего </' + name + '> для ' + m[2]);
  out += html.slice(pos, start) + t(m[2]);
  pos = end; open.lastIndex = end;
}
html = out + html.slice(pos);

if (missing.size) console.warn('Нет в русском словаре:', [...missing].join(', '));
const dest = target ? path.join(ROOT, target, 'index.html') : path.join(ROOT, 'index.html');
if (target){
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  html = html.replace('href="https://dilyakhakimova.com/"', `href="https://dilyakhakimova.com/${target}/"`)
             .replace('content="ru_RU"', `content="${lang === 'en' ? 'en_US' : lang}"`);
}
fs.writeFileSync(dest, html);
console.log('ok:', path.relative(ROOT, dest), lang);
