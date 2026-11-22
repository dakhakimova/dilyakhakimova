#!/usr/bin/env node
/* Собирает /play/sample-size/index.html — игру-калькулятор «зафиксируй два — третий посчитаю» (размер выборки · MDE · мощность).
   Норман (банк идей № 119): n, MDE и мощность связаны, как два регулятора холодильника, — не три независимых ползунка,
   а «зафиксируй два, третий посчитаю» с подсветкой пересчитываемого поля; Купер (№ 120): запоминает ввод (localStorage
   и адрес страницы), показывает, как понял число, не встречает пустым экраном, сброс — с отменой, без «Вы уверены?».
   Не опубликована: noindex, нет в каталоге и в sitemap (published:false — см. play/sample-size.json).
   Шапка и футер — из собранной страницы игры (tools/chrome.js через build-play), поэтому запускать после bake-i18n:
     node tools/build-sample-size.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), V = require('./version.js');
const chrome = require('./chrome.js');
function build(){
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'play/sample-size.json'), 'utf8'));
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Собрано командой node tools/build-sample-size.js: правьте его. Основная персона: П2 «Артём, обжёгшийся middle» (design-system.md, «Персоны»). -->
${meta.published ? '' : '<meta name="robots" content="noindex, follow">\n'}<title>Сколько дней держать A/B-тест? · калькулятор · Диля Хакимова</title>
<meta name="description" content="Размер выборки, MDE и мощность: зафиксируй два — третий посчитается. Срок теста в днях и дата окончания.">
<link rel="canonical" href="https://dilyakhakimova.com/play/sample-size/">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
<link rel="stylesheet" href="/play/play.css?v=${V}">
<link rel="stylesheet" href="/play/sample-size/ss.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
${chrome.header('play', false)}
<main id="main" class="wrap play ss-page">
  <h1>Сколько дней держать тест?</h1>
  <p class="play-meta">Калькулятор · Средний уровень</p>
  <p class="lead">Размер выборки, самый маленький заметный эффект (MDE) и мощность связаны: поменяешь одно — поедут остальные. Зафиксируй два, третье посчитаю.</p>

  <section class="ss-card" aria-labelledby="ss-h">
    <h2 id="ss-h" class="vh">Калькулятор</h2>
    <div class="seg ss-mode" role="radiogroup" aria-label="Что посчитать">
      <span class="ss-mode-l">Посчитать:</span>
      <button type="button" role="radio" data-mode="n" aria-checked="true">размер выборки</button>
      <button type="button" role="radio" data-mode="mde" aria-checked="false">MDE</button>
      <button type="button" role="radio" data-mode="pow" aria-checked="false">мощность</button>
    </div>
    <p class="ss-sentence">
      <label>Конверсия сейчас <input class="input ss-in" id="ss-base" inputmode="decimal" autocomplete="off"></label>,
      <label>хочу заметить рост на <input class="input ss-in" id="ss-mde" inputmode="decimal" autocomplete="off"> относительных</label>,
      <label>с мощностью <input class="input ss-in" id="ss-pow" inputmode="decimal" autocomplete="off"></label>,
      <label>в каждой группе <input class="input ss-in" id="ss-n" inputmode="numeric" autocomplete="off"> человек</label>.
      <label>В эксперимент приходит <input class="input ss-in" id="ss-traffic" inputmode="numeric" autocomplete="off"> человек в день</label>.
    </p>
    <ul class="ss-heard" id="ss-heard" aria-live="polite"></ul>
    <details class="ss-more"><summary>Настроить: α</summary>
      <div class="seg" role="radiogroup" aria-label="Уровень значимости α"><span class="ss-mode-l">α:</span>
        <button type="button" role="radio" data-alpha="0.01" aria-checked="false">0.01</button>
        <button type="button" role="radio" data-alpha="0.05" aria-checked="true">0.05</button>
        <button type="button" role="radio" data-alpha="0.1" aria-checked="false">0.1</button>
      </div>
      <p class="note">Двусторонний тест, группы поровну (50 / 50).</p>
    </details>
    <div class="ss-out" role="status" aria-live="polite">
      <p class="ss-big" id="ss-big"></p>
      <p class="ss-when" id="ss-when"></p>
      <p class="ss-warn" id="ss-warn" hidden></p>
    </div>
    <figure class="ss-what">
      <figcaption class="chart-head">Что если: срок теста при другом MDE</figcaption>
      <table class="table ss-table"><thead><tr><th>MDE</th><th class="num">на группу</th><th class="num">дней</th></tr></thead><tbody id="ss-what"></tbody></table>
    </figure>
    <p class="ss-acts"><button type="button" class="btn-text" id="ss-reset">Вернуть типичные значения</button><span class="note" id="ss-undo" role="status"></span></p>
    <div class="ss-recent" id="ss-recent-box" hidden><p class="note">Последние расчёты:</p><ul id="ss-recent"></ul></div>
  </section>
  <section class="play-out"><p class="kicker">Почему так</p>
    <p>Чтобы заметить вдвое меньший эффект, нужно вчетверо больше людей: шум группы падает как 1 / √n. Поэтому сроки для MDE 3% и 10% различаются не втрое, а примерно в одиннадцать раз.</p>
    <p class="note">Формула на салфетке: n ≈ 16 · p(1 − p) / δ² на группу при α = 0.05 и мощности 80%, где δ — эффект в долях. Врёт при очень маленьких конверсиях и группах меньше сотни.</p>
  </section>
</main>
${chrome.footer()}
<script src="/play/sample-size/ss.js?v=${V}"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'play/sample-size/index.html'), html);
console.log('play/sample-size/index.html');
}
module.exports = build;
if (require.main === module) build();
