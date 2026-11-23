#!/usr/bin/env node
/* Собирает /play/srm-check/index.html — калькулятор проверки SRM (χ²): подставь размеры групп и план сплита.
   Норман (банк идей № 119): n, MDE и мощность связаны, как два регулятора холодильника, — не три независимых ползунка,
   а «зафиксируй два, третий посчитаю» с подсветкой пересчитываемого поля; Купер (№ 120): запоминает ввод (localStorage
   и адрес страницы), показывает, как понял число, не встречает пустым экраном, сброс — с отменой, без «Вы уверены?».
   Не опубликована: noindex, нет в каталоге и в sitemap (published:false — см. play/srm-check.json).
   Шапка и футер — из собранной страницы игры (tools/chrome.js через build-play), поэтому запускать после bake-i18n:
     node tools/build-srm-check.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), V = require('./version.js');
const chrome = require('./chrome.js');
function build(){
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'play/srm-check.json'), 'utf8'));
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Собрано командой node tools/build-srm-check.js: правьте его. Основная персона: П2 «Артём, обжёгшийся middle» (design-system.md, «Персоны»). -->
${meta.published ? '' : '<meta name="robots" content="noindex, follow">\n'}<title>Проверка SRM: группы разделились честно? · калькулятор · Диля Хакимова</title>
<meta name="description" content="Калькулятор SRM: подставь, сколько пользователей в группах и какой был план сплита, — χ²-критерий скажет, можно ли верить отчёту.">
<link rel="canonical" href="https://dilyakhakimova.com/play/srm-check/">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
<link rel="stylesheet" href="/play/play.css?v=${V}">
<link rel="stylesheet" href="/play/sample-size/ss.css?v=${V}">
<link rel="stylesheet" href="/play/srm-check/srm.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
${chrome.header('play', false)}
<main id="main" class="wrap play ss-page">
  <h1>Группы разделились честно?</h1>
  <p class="play-meta">Калькулятор · Средний уровень</p>
  <p class="lead">Проверка SRM: подставь, сколько пользователей попало в каждую группу и какой был план сплита. Если группы разошлись сильнее, чем бывает случайно, отчёту теста верить нельзя.</p>

  <section class="ss-card" aria-labelledby="srm-h">
    <h2 id="srm-h" class="vh">Калькулятор</h2>
    <p class="ss-sentence">
      <label>В контроле <input class="input ss-in" id="srm-a" inputmode="numeric" autocomplete="off"> пользователей</label>,
      <label>в тесте <input class="input ss-in" id="srm-b" inputmode="numeric" autocomplete="off"></label>.
      <label>План: контролю <input class="input ss-in srm-share" id="srm-s" inputmode="decimal" autocomplete="off"> всех</label>.
    </p>
    <ul class="ss-heard" id="srm-heard" aria-live="polite"></ul>
    <div class="ss-out srm-out" role="status" aria-live="polite">
      <p class="ss-big" id="srm-big"></p>
      <p class="ss-when" id="srm-p"></p>
    </div>
    <figure class="ss-what">
      <figcaption class="chart-head">Реальность и ожидание</figcaption>
      <table class="table ss-table srm-table"><thead><tr><th>Группа</th><th class="num">Ждали</th><th class="num">Пришло</th><th class="num">Разница</th><th class="num">Разница² / ждали</th></tr></thead><tbody id="srm-rows"></tbody><tfoot><tr><th colspan="4" class="num">Сумма: χ²</th><td class="num" id="srm-chi"></td></tr></tfoot></table>
    </figure>
    <p class="ss-acts"><button type="button" class="btn-text" id="srm-reset">Вернуть пример</button><button type="button" class="btn-text" id="srm-copy">Скопировать ссылку на расчёт</button><span class="note" id="srm-note" role="status"></span></p>
  </section>
  <section class="play-out"><p class="kicker">Почему так</p>
    <p>χ² = Σ (пришло − ждали)² / ждали по всем группам. «Ждали» — доля из плана сплита от всех пришедших. Если группы делились честно, χ² больше 12 бывает реже, чем в одном тесте из двух тысяч, поэтому порог SRM — p &lt; 0.0005, а не обычные 0.05: проверка идёт в каждом тесте, и с мягким порогом то и дело были бы ложные срабатывания.</p>
    <p class="note">Что искать при SRM: фильтр ботов и антифрод, который по-разному режет группы; падения и редиректы в одной из версий; данные, которые теряются только в тесте. Подробно — в разборе книги <a href="/shelf/kohavi-trustworthy/">Trustworthy Online Controlled Experiments</a>.</p>
  </section>
</main>
${chrome.footer()}
<script src="/play/srm-check/srm.js?v=${V}"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'play/srm-check/index.html'), html);
console.log('play/srm-check/index.html');
}
module.exports = build;
if (require.main === module) build();
