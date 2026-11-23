#!/usr/bin/env node
/* Рубрика «Плюшки» /extras/ (решение Дили, 22.11.2026): published:false до вычитки — noindex, нет в шапке и sitemap.
   Карточки тем же шаблоном, что курсы и рубрики на главной (.cards .course). Карточку без готового материала не показываем,
   «скоро» не пишем (рабочий ноутбук SRM и A/A-стенд появится, когда будет на GitHub). Основная персона — П1 «Лена перед собесом». */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), V = require('./version.js'), chrome = require('./chrome.js');
const PUBLISHED = false;
function build(){
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Собрано командой node tools/build-extras.js: правьте его. -->
${PUBLISHED ? '' : '<meta name="robots" content="noindex, follow">\n'}<title>Плюшки: калькуляторы и тренажёры · Диля Хакимова</title>
<meta name="description" content="Калькулятор MDE до и после эксперимента, проверка SRM и задачи с собеседований.">
<link rel="canonical" href="https://dilyakhakimova.com/extras/">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
${chrome.header('extras', true)}
<main id="main" class="wrap block extras">
  <h1>Плюшки</h1>
  <p class="lead">Калькуляторы и тренажёры</p>
  <ul class="ex-list" role="list">
    <li><a class="ex-card" href="/play/sample-size/">
      <span class="ex-pic" style="--ex:var(--c-ab)" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M10 12v42h44"/><path d="M14 16c6 20 14 28 36 32" class="th"/><circle cx="27" cy="37" r="4" class="dot"/></svg></span>
      <span class="ex-t">Калькулятор MDE</span>
      <span class="ex-d">Сколько людей и дней нужно, чтобы заметить эффект, и что мог заметить уже прошедший эксперимент</span>
    </a></li>
    <li><a class="ex-card" href="/play/srm-check/">
      <span class="ex-pic" style="--ex:var(--c-st)" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M8 54h48"/><rect x="14" y="18" width="14" height="36" rx="2" class="bar"/><rect x="36" y="32" width="14" height="22" rx="2" class="bar"/><path d="M10 25h44" class="dash"/></svg></span>
      <span class="ex-t">Калькулятор SRM</span>
      <span class="ex-d">Разделились ли группы так, как задумано: χ²-критерий по размерам групп</span>
    </a></li>
    <li><a class="ex-card" href="/probability/09-interview.html">
      <span class="ex-pic" style="--ex:var(--c-prob)" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="20"/><path d="M28 8h8M32 8v6M32 34V22"/><path d="M32 34l9 6"/></svg></span>
      <span class="ex-t">Пробное собеседование</span>
      <span class="ex-d">Десять задач по вероятности на время</span>
    </a></li>
  </ul>
</main>
${chrome.footer()}
<script>function artFail(i){ i.parentNode.classList.add('missing'); }</script>
</body>
</html>
`;
  fs.mkdirSync(path.join(ROOT, 'extras'), {recursive: true});
  fs.writeFileSync(path.join(ROOT, 'extras/index.html'), html);
  console.log('extras/index.html');
}
module.exports = build;
if (require.main === module) build();
