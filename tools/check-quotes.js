#!/usr/bin/env node
/* Кавычки (гайд, пара 118): снаружи «ёлочки», „лапки“ — только внутри «…». Ошибка — „…“ на первом уровне,
   то есть открывающая „ там, где в этой строке нет незакрытой «.
   node tools/check-quotes.js [файл …] — без аргументов: тексты входных страниц, словари i18n и данные курсов. Код выхода 1, если что-то найдено. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DEF = ['map/skills.json', 'courses/courses.json', 'i18n/site.js', 'i18n/home.js', 'i18n/map.js', 'i18n/start.js', 'i18n/about.js',
  'i18n/probability.js', 'i18n/stats.js', 'i18n/ab.js', 'i18n/causal.js', 'start/tree.json',
  'index.html', 'courses/index.html', 'probability/index.html', 'signal/index.html', 'ab-basics/index.html', 'stats/index.html', 'ab/index.html',
  'causal/index.html', 'map/index.html', 'start/index.html', 'about/index.html', 'play/index.html', 'extras/index.html', 'account.html', '404.html'];
const files = process.argv.slice(2).length ? process.argv.slice(2) : DEF;
let bad = 0;
for (const f of files){
  const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    let depth = 0;
    for (let k = 0; k < line.length; k++){
      const ch = line[k];
      if (ch === '«') depth++;
      else if (ch === '»') depth = Math.max(0, depth - 1);
      else if (ch === '„' && depth === 0){ bad++; console.log(`${f}:${i + 1}: „…“ на первом уровне — нужны «…»: ${line.slice(Math.max(0, k - 30), k + 40).trim()}`); break; }
    }
  });
}
console.log(bad ? `кавычки: ${bad} ошибок` : 'кавычки: ок');
process.exit(bad ? 1 : 0);
