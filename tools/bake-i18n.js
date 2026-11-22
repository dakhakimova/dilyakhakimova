#!/usr/bin/env node
/* Вписывает строки словарей в разметку страниц, чтобы они читались без JS и поисковиками.
   node tools/bake-i18n.js       — обновить все страницы из PAGES (язык из <html lang>, сейчас ru)
   node tools/bake-i18n.js en    — собрать en/<страница> с английским словарём (когда будет перевод;
                                   не забыть hreflang на обеих версиях и показать переключатель в шапке)
   Словари страницы — те i18n/*.js, что подключены в ней тегами <script src="/i18n/…">, в том же порядке
   (главная: i18n/home.js; лендинги курсов: i18n/site.js + i18n/<курс>.js; «Об авторе»: i18n/site.js + i18n/about.js).
   Правило разметки: у элемента с data-i18n всё содержимое берётся из словаря; data-i18n-attr="атрибут:ключ;…".

   Игрушки /play/ собирает tools/build-play.js (вызывается в конце): тексты — i18n/play.js, список — play/toys-*.json.
   Мини-лаборатории /terms/ и /sitemap.xml собирает tools/build-terms.js: тексты — i18n/terms.js, список — terms/terms.json.

   TYPO_ONLY — страницы без словаря (оглавления «Сигнала» и «A/B на пальцах»): там типограф (неразрывные пробелы,
   тире) прогоняется только по кускам между <!-- typo --> и <!-- /typo -->. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'probability/index.html', 'stats/index.html', 'ab/index.html', 'causal/index.html', 'about/index.html'];
const TYPO_ONLY = ['signal/index.html', 'ab-basics/index.html'];
const target = process.argv[2] === '--typo' ? undefined : process.argv[2];

function loadDicts(files){
  const ctx = {}; ctx.globalThis = ctx;
  for (const f of files) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  return ctx.I18N;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function bake(page){
  let html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const files = [...html.matchAll(/<script src="\/(i18n\/[\w-]+\.js)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);
  if (!files.length) throw new Error(page + ': не подключено ни одного словаря i18n/*.js');
  const I18N = loadDicts(files);
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
    if (end < 0) throw new Error(page + ': нет закрывающего </' + name + '> для ' + m[2]);
    out += html.slice(pos, start) + t(m[2]);
    pos = end; open.lastIndex = end;
  }
  html = out + html.slice(pos);

  if (missing.size) console.warn(page + ': нет в русском словаре:', [...missing].join(', '));
  const dest = target ? path.join(ROOT, target, page) : path.join(ROOT, page);
  if (target){
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const dir = path.dirname(page) === '.' ? '' : path.dirname(page) + '/';
    html = html.replace(`href="https://dilyakhakimova.com/${dir}"`, `href="https://dilyakhakimova.com/${target}/${dir}"`)
               .replace('content="ru_RU"', `content="${lang === 'en' ? 'en_US' : lang}"`);
  }
  fs.writeFileSync(dest, html);
  console.log('ok:', path.relative(ROOT, dest), lang);
}

function typoOnly(page){
  const I18N = loadDicts(['i18n/site.js']);
  const file = path.join(ROOT, page);
  const html = fs.readFileSync(file, 'utf8');
  let n = 0;
  const res = html.replace(/<!-- typo -->([\s\S]*?)<!-- \/typo -->/g, (_, body) => { n++; return '<!-- typo -->' + I18N.typo('ru', body) + '<!-- /typo -->'; });
  fs.writeFileSync(file, res);
  console.log('typo:', page, n, n === 1 ? 'кусок' : 'куска(ов)');
}

// node tools/bake-i18n.js --typo probability/03-counting.html [ещё файлы] — типограф по странице главы целиком,
// кроме <head>, <script>, <style>, <textarea>, <pre>, <code> (код не трогаем: неразрывный пробел ломает Python). Из атрибутов —
// только текстовые: data-why, data-fb, data-title, alt, aria-label, title. Разряды «10 000» — неразрывным пробелом.
// Повторный запуск ничего не меняет. Остальные страницы не трогает — можно запускать параллельно с другими авторами.
function typoPage(page){
  const I18N = loadDicts(['i18n/site.js']);
  const file = path.join(ROOT, page);
  const html = fs.readFileSync(file, 'utf8');
  const parts = html.split(/(<head[\s>][\s\S]*?<\/head>|<script[\s>][\s\S]*?<\/script>|<style[\s>][\s\S]*?<\/style>|<textarea[\s>][\s\S]*?<\/textarea>|<pre[\s>][\s\S]*?<\/pre>|<code[\s>][\s\S]*?<\/code>)/i);
  // текстовые атрибуты (пояснения квизов, подписи, alt, aria-label, названия карточек) — тем же типографом
  const ATTR = /(\s(?:data-why|data-fb|data-title|alt|aria-label|title)=")([^"]*)(")/g;
  const res = parts.map((x, i) => i % 2 ? x : I18N.typo('ru', x.replace(ATTR, (_, a, v, b) => a + I18N.typo('ru', v) + b))).join('');
  if (res !== html) fs.writeFileSync(file, res);
  console.log('typo:', page, res === html ? 'без изменений' : 'обновлено');
}

if (process.argv[2] === '--typo') process.argv.slice(3).forEach(typoPage);
else {
  PAGES.forEach(bake);
  if (!target) TYPO_ONLY.forEach(typoOnly);
  // страницы игрушек /play/ (и /<lang>/play/) — из play/toys-*.json и i18n/play.js
  require('./build-play.js')(target || 'ru');
  // мини-лаборатории /terms/ и /sitemap.xml — из terms/terms.json и i18n/terms.js (пока только русская версия)
  if (!target) require('./build-terms.js')();
}
