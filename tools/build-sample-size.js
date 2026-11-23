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
${meta.published ? '' : '<meta name="robots" content="noindex, follow">\n'}<title>Калькулятор MDE: сколько дней держать A/B-тест? · Диля Хакимова</title>
<meta name="description" content="Размер выборки, MDE и мощность: зафиксируй два — третий посчитается. Срок теста в днях и дата окончания.">
<link rel="canonical" href="https://dilyakhakimova.com/play/sample-size/">
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
  <h1>Калькулятор MDE</h1>
  <p class="play-meta srm-sub">Сколько дней держать тест?</p>

  <div class="seg ss-mode ss-when-mode" role="radiogroup" aria-label="Когда считаем">
    <button type="button" role="radio" data-when="pre" aria-checked="true">До теста: планирую</button>
    <button type="button" role="radio" data-when="post" aria-checked="false">После теста: пост-MDE</button>
  </div>
  <section class="ss-card" id="ss-pre" aria-labelledby="ss-h">
    <h2 id="ss-h" class="vh">Калькулятор</h2>
    <p class="ss-step">1. Что знаем заранее</p>
    <div class="seg ss-mode" role="radiogroup" aria-label="Метрика">
      <span class="ss-mode-l">Метрика:</span>
      <button type="button" role="radio" data-pmetric="share" aria-checked="true">доля: конверсия, ретеншен</button>
      <button type="button" role="radio" data-pmetric="mean" aria-checked="false">среднее: чек, время</button>
    </div>
    <div class="ss-form">
      <label class="ss-f" data-pm="share"><span>Доля сейчас</span><input class="input ss-in" id="ss-base" inputmode="decimal" autocomplete="off"><i>конверсия, ретеншен</i></label>
      <label class="ss-f" data-pm="mean" hidden><span>Среднее сейчас</span><input class="input ss-in" id="ss-mean" inputmode="decimal" autocomplete="off"><i>на пользователя</i></label>
      <label class="ss-f" data-pm="mean" hidden><span>Стандартное отклонение</span><input class="input ss-in" id="ss-sd" inputmode="decimal" autocomplete="off"><i>на пользователя</i></label>
    </div>
    <div class="ss-alpha">
      <div class="seg" role="radiogroup" aria-label="Ошибка I рода α"><span class="ss-mode-l">Ошибка I рода α:</span>
        <button type="button" role="radio" data-alpha="0.01" aria-checked="false">0.01</button>
        <button type="button" role="radio" data-alpha="0.05" aria-checked="true">0.05</button>
        <button type="button" role="radio" data-alpha="0.1" aria-checked="false">0.1</button>
      </div>
    </div>
    <p class="ss-step">2. Какой эффект хотим заметить</p>
    <div class="ss-form">
      <label class="ss-f"><span id="ss-mde-l">Хочу заметить рост на</span><input class="input ss-in" id="ss-mde" inputmode="decimal" autocomplete="off"><i>относительных</i></label>
      <label class="ss-f"><span>Мощность</span><input class="input ss-in" id="ss-pow" inputmode="decimal" autocomplete="off"><i></i></label>
      <label class="ss-f"><span>Всего в эксперименте</span><input class="input ss-in" id="ss-n" inputmode="numeric" autocomplete="off"><i>человек, тест и контроль вместе</i></label>
    </div>
    <ul class="ss-heard" id="ss-heard" aria-live="polite"></ul>
    <details class="ss-more"><summary>Дополнительно: в какую сторону ждём эффект, доли групп</summary>
      <div class="seg" role="radiogroup" aria-label="Чего ждём"><span class="ss-mode-l">Ждём:</span>
        <button type="button" role="radio" data-sides="two" aria-checked="true">изменения в любую сторону</button>
        <button type="button" role="radio" data-sides="left" aria-checked="false">падения</button>
        <button type="button" role="radio" data-sides="right" aria-checked="false">роста</button>
      </div>
      <p class="note">Это двусторонний, левосторонний и правосторонний тест. Односторонний требует меньше людей, но не заметит эффект в другую сторону.</p>
      <div class="ss-form">
        <label class="ss-f"><span>Доля теста</span><input class="input ss-in" id="ss-split" inputmode="decimal" autocomplete="off"><i>остальное — контроль; обычно 50%</i></label>
      </div>
    </details>
    <div class="ss-out" role="status" aria-live="polite">
      <p class="ss-big" id="ss-big"></p>
      <p class="ss-warn" id="ss-warn" hidden></p>
    </div>
    <p class="ss-step">3. Сколько дней держать</p>
    <div class="ss-form">
      <label class="ss-f"><span>Трафик в эксперимент</span><input class="input ss-in" id="ss-traffic" inputmode="numeric" autocomplete="off"><i>человек в день</i></label>
    </div>
    <p class="ss-when ss-days" id="ss-when"></p>
    <figure class="ss-chart">
      <figcaption class="chart-head">MDE и число людей в эксперименте</figcaption>
      <svg id="ss-curve" viewBox="0 0 560 260" style="overflow:visible" role="img" aria-label="Кривая: какой эффект можно заметить при разном числе людей"></svg>
      <p class="note">Чем больше людей, тем меньший эффект заметен, но медленно: чтобы заметить вдвое меньший эффект, людей нужно вчетверо больше.</p>
    </figure>
    <figure class="ss-what">
      <figcaption class="chart-head">Что если: срок теста при другом MDE</figcaption>
      <table class="chi-tab ss-table"><thead><tr><th>MDE</th><th class="num">всего людей</th><th class="num">дней</th></tr></thead><tbody id="ss-what"></tbody></table>
    </figure>
    <p class="ss-acts"><button type="button" class="btn-text" id="ss-copy">Скопировать ссылку на расчёт</button><span class="note" id="ss-undo" role="status"></span></p>
  </section>
  <section class="ss-card" id="ss-post" aria-labelledby="pm-h" hidden>
    <h2 id="pm-h" class="vh">Пост-MDE</h2>
    <p class="pm-lead">Тест закончился, и дисперсия, число людей и средние уже известны. Какой самый маленький эффект этот тест мог заметить? Если пост-MDE больше эффекта, который важен бизнесу, серый результат ничего не доказывает: такой эффект тест скорее всего не увидел бы.</p>
    <div class="seg ss-mode" role="radiogroup" aria-label="Метрика">
      <span class="ss-mode-l">Метрика:</span>
      <button type="button" role="radio" data-metric="share" aria-checked="true">доля: конверсия, ретеншен</button>
      <button type="button" role="radio" data-metric="mean" aria-checked="false">среднее: чек, время</button>
    </div>
    <div class="pm-grid">
      <div class="pm-head"><span></span><span>Пользователей</span><span data-m="share">Доля</span><span data-m="mean" hidden>Среднее</span><span data-m="mean" hidden>Ст. отклонение</span></div>
      <div class="pm-row"><span class="srm-name"><i style="background:#23418A"></i><b>Контроль</b></span><input class="input ss-in" id="pm-na" inputmode="numeric" autocomplete="off" placeholder="150 000" aria-label="Контроль: пользователей"><input class="input ss-in" id="pm-pa" inputmode="decimal" autocomplete="off" placeholder="4%" aria-label="Контроль: доля" data-m="share"><input class="input ss-in" id="pm-ma" inputmode="decimal" autocomplete="off" placeholder="850" aria-label="Контроль: среднее" data-m="mean" hidden><input class="input ss-in" id="pm-sa" inputmode="decimal" autocomplete="off" placeholder="1 200" aria-label="Контроль: стандартное отклонение" data-m="mean" hidden></div>
      <div class="pm-row"><span class="srm-name"><i style="background:#E8644A"></i><b>Тест</b></span><input class="input ss-in" id="pm-nb" inputmode="numeric" autocomplete="off" placeholder="150 000" aria-label="Тест: пользователей"><input class="input ss-in" id="pm-pb" inputmode="decimal" autocomplete="off" placeholder="4.1%" aria-label="Тест: доля" data-m="share"><input class="input ss-in" id="pm-mb" inputmode="decimal" autocomplete="off" placeholder="860" aria-label="Тест: среднее" data-m="mean" hidden><input class="input ss-in" id="pm-sb" inputmode="decimal" autocomplete="off" placeholder="1 250" aria-label="Тест: стандартное отклонение" data-m="mean" hidden></div>
    </div>
    <div class="ss-form pm-opts">
      <label class="ss-f"><span>Мощность</span><input class="input ss-in" id="pm-pow" inputmode="decimal" autocomplete="off" placeholder="80%"><i></i></label>
      <label class="ss-f"><span>Ошибка I рода α</span><input class="input ss-in" id="pm-alpha" inputmode="decimal" autocomplete="off" placeholder="0.05"><i></i></label>
    </div>
    <details class="ss-more pm-more"><summary>Дополнительно: в какую сторону ждали эффект</summary>
      <div class="seg" role="radiogroup" aria-label="Чего ждали"><span class="ss-mode-l">Ждали:</span>
        <button type="button" role="radio" data-psides="two" aria-checked="true">изменения в любую сторону</button>
        <button type="button" role="radio" data-psides="left" aria-checked="false">падения</button>
        <button type="button" role="radio" data-psides="right" aria-checked="false">роста</button>
      </div>
    </details>
    <div class="ss-out srm-out idle" id="pm-out" role="status" aria-live="polite">
      <p class="ss-big" id="pm-big">Впиши, сколько людей было в группах и что получилось.</p>
      <p class="ss-when" id="pm-p"></p>
    </div>
    <details class="pm-how"><summary>Как считается</summary>
      <ul class="srm-why">
        <li><b>Шум разницы</b> — стандартная ошибка: SE = √(s²A / nA + s²B / nB). Для доли s² = p(1 − p).</li>
        <li><b>Пост-MDE</b> = (z<sub>1−α/2</sub> + z<sub>мощность</sub>) · SE для двустороннего теста, z<sub>1−α</sub> вместо z<sub>1−α/2</sub> — для одностороннего; при α = 0.05 и мощности 80% множитель 2.8 и 2.5. Делим на среднее контроля — получаем относительный.</li>
        <li><b>Зачем:</b> до теста MDE считают по прикидке дисперсии, после — по настоящей. Если дисперсия оказалась больше, тест был слабее, чем планировали.</li>
      </ul>
    </details>
  </section>
  <details class="play-out srm-how" id="ss-pre-how"><summary>Как считается</summary>
    <ul class="srm-why">
      <li><b>Вдвое меньший эффект — вчетверо больше людей.</b> Шум группы падает как 1 / √n, поэтому сроки для MDE 3% и 10% различаются не втрое, а примерно в одиннадцать раз.</li>
      <li><b>Формула на салфетке:</b> n ≈ 16 · s² / δ² на группу при сплите 50 на 50, α = 0.05 и мощности 80%, где δ — эффект в абсолютных единицах, s² — дисперсия метрики. Для доли s² = p(1 − p), для среднего — квадрат стандартного отклонения.</li>
      <li><b>Где она врёт:</b> при очень маленьких долях, при сильных выбросах в среднем и в группах меньше сотни человек.</li>
    </ul>
  </details>
</main>
${chrome.footer()}
<script src="/play/sample-size/ss.js?v=${V}"></script>
<script src="/play/sample-size/post.js?v=${V}"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'play/sample-size/index.html'), html);
console.log('play/sample-size/index.html');
}
module.exports = build;
if (require.main === module) build();
