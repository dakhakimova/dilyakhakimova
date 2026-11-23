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
${meta.published ? '' : '<meta name="robots" content="noindex, follow">\n'}<title>Калькулятор SRM: группы разделились честно? · Диля Хакимова</title>
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
  <h1>Калькулятор SRM</h1>
  <p class="play-meta srm-sub">Группы разделились честно?</p>
  <p class="lead">Проверка SRM — sample ratio mismatch, несовпадения соотношения групп с планом. Подставь, сколько пользователей попало в каждую группу и какой был план сплита. Если группы разошлись сильнее, чем бывает случайно, отчёту теста верить нельзя.</p>

  <section class="ss-card" aria-labelledby="srm-h">
    <h2 id="srm-h" class="vh">Калькулятор</h2>
    <div class="srm-grid" role="group" aria-label="Группы теста">
      <div class="srm-head"><span>Группа</span><span>Пришло, пользователей</span><span>План сплита</span><span></span></div>
      <div id="srm-rows-in"></div>
      <p class="srm-add-row"><button type="button" class="btn-text" id="srm-add">+ Добавить группу</button></p>
      <p class="note srm-hint">План — в процентах или в любых долях: 50 и 50, 90 и 10, 30 и 30 — калькулятор сам пересчитает в доли. Пусто — поровну.</p>
    </div>
    <ul class="ss-heard" id="srm-heard" aria-live="polite"></ul>
    <div class="srm-res" id="srm-res" hidden>
      <p class="chart-sub">Как разделились группы; пунктир — план сплита</p>
      <svg class="bk-svg split" id="srm-bar" viewBox="0 0 440 90" role="img" aria-label=""></svg>
      <p class="chart-sub">Критерий χ²: сравнение реальности и ожидания</p>
      <table class="chi-tab" id="srm-tab"></table>
      <p class="chart-sub">Сколько честных тестов дают χ² не меньше: чем дальше вправо, тем реже</p>
      <svg class="bk-svg chi" id="srm-chart" viewBox="0 0 440 164" role="img" aria-label=""></svg>
      <p class="chi-read" id="srm-read"></p>
    </div>
    <div class="ss-out srm-out" role="status" aria-live="polite">
      <p class="ss-big" id="srm-big"></p>
      <p class="ss-when" id="srm-p"></p>
    </div>
    <p class="ss-acts"><button type="button" class="btn-text" id="srm-copy">Скопировать ссылку на расчёт</button><span class="note" id="srm-note" role="status"></span></p>
  </section>
  <section class="play-out"><p class="kicker">Почему так</p>
    <div class="chi-f" role="img" aria-label="хи-квадрат равен сумме по всем группам: разница между «пришло» и «ждали» в квадрате, делённая на «ждали»">
      <div class="chi-row"><span class="chi-lhs">χ²&nbsp;=</span>
        <span class="chi-p p1"><b>Σ</b><i>по всем группам</i></span>
        <span class="chi-frac"><span class="chi-num"><span class="chi-p p2"><b>(пришло − ждали)<sup class="sq">2</sup></b><i>насколько разошлись реальность и ожидание; в квадрате — чтобы + и − не сократились</i></span></span>
        <span class="chi-den"><span class="chi-p p4"><b>ждали</b><i>сравниваем разницу с размером группы: не хватает 100 человек из тысячи — это много, из миллиона — пустяк</i></span></span></span>
      </div>
    </div>
    <ul class="srm-why">
      <li><b>«Ждали»</b> — доля из плана сплита от всех пришедших: при 50 и 50 это половина. Групп может быть сколько угодно, сумма идёт по всем.</li>
      <li><b>Порог SRM — p &lt; 0.0005.</b> Для двух групп это χ² больше 12.1, для трёх — больше 15.2: чем больше групп, тем больше χ² набегает случайно. При честном делении так бывает реже, чем в одном тесте из двух тысяч.</li>
      <li><b>Почему не p &lt; 0.05:</b> SRM проверяют в каждом тесте, и с обычным порогом то и дело были бы ложные срабатывания.</li>
    </ul>
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
