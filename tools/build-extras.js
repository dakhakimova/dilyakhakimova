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
${PUBLISHED ? '' : '<meta name="robots" content="noindex, follow">\n'}<title>Плюшки: тренажёр к собеседованию и калькулятор MDE · Диля Хакимова</title>
<meta name="description" content="Классические задачи по вероятности к собеседованию и калькулятор MDE при неравных группах.">
<link rel="canonical" href="https://dilyakhakimova.com/extras/">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
${chrome.header('', false)}
<main id="main" class="wrap block extras">
  <h1>Плюшки</h1>
  <ul class="cards cards-ex" role="list">
    <li class="course" id="x-interview">
      <figure class="art"><img src="/img/home-interview.jpg" width="1200" height="900" loading="lazy" alt="Алиса на собеседовании, напротив Котейка в бабочке с песочными часами" onerror="artFail(this)"><figcaption class="ph"></figcaption></figure>
      <h4><a href="/probability/09-interview.html">Тренажёр к собеседованию</a></h4>
      <p class="line">классические задачи из «Вероятности на пальцах» и пробное собеседование на время</p>
      <div class="task-box">
        <p class="q">Бросаем три монеты. Какова вероятность, что выпадет хотя бы два орла?</p>
        <details><summary>Показать ответ</summary><p><b>1/2.</b> В штуках: у трёх монет 8 равновероятных исходов, и в четырёх из них орлов два или три: ООО, ООР, ОРО, РОО. Формулой: P = (C(3, 2) + C(3, 3)) / 2³ = (3 + 1) / 8 = 1/2.</p></details>
      </div>
      <p class="course-act"><a class="btn ghost" href="/probability/09-interview.html">Открыть →</a></p>
    </li>
    <li class="course" id="x-mde">
      <figure class="art"><img src="/img/home-notebook.jpg" width="1200" height="900" loading="lazy" alt="Алиса передаёт Бобу ноутбук с расчётом" onerror="artFail(this)"><figcaption class="ph"></figcaption></figure>
      <h4><a href="/play/sample-size/">Калькулятор MDE</a></h4>
      <p class="line">размер выборки, MDE и мощность: зафиксируй два — третье посчитается; срок теста в днях</p>
      <div></div>
      <p class="course-act"><a class="btn ghost" href="/play/sample-size/">Открыть →</a></p>
    </li>
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
