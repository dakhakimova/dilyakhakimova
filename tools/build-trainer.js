#!/usr/bin/env node
/* Тренажёр собеседований /trainer/ (первая версия, 22.11.2026; к 15.12 — раздать студентам курса по прикладной статистике).
   Собирает: /trainer/index.html (карта тем), /trainer/<тема>/index.html (готовые темы), /trainer/mix/index.html (смешанная тренировка).
   Содержание — tools/trainer-content.js; карта и разметка всех задач — проектный документ «Тренажёр собеседований — карта тем и разметка задач».
   Пока тренажёр не открыт всем, страницы с noindex и не попадают в карту сайта.
   Запуск: node tools/build-trainer.js (и из tools/bake-i18n.js). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const V = require('./version.js');
const chrome = require('./chrome.js');
const {load} = require('./play-data.js');
const {C, SECTIONS, MAP, TOPICS} = require('./trainer-content.js');
const SOL = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'play', 'solutions.json'), 'utf8')); } catch { return {}; } })();

function build(){
  const P = load('ru');
  const ctx = {}; ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/site.js'), 'utf8'), ctx, {filename: 'i18n/site.js'});
  // формулы: \( … \) в текстах тренажёра → KaTeX при сборке (без скрипта на странице); типограф формулы не трогает
  const katex = require('./vendor/katex.min.js');
  const typo = s => {
    const tex = [];
    // \( … \) — в строке, \[ … \] — отдельной строкой по центру
    const t = ctx.I18N.typo('ru', String(s).replace(/\\([\[(])(.+?)\\[\])]/g, (_, k, f) => { tex.push([f, k === '[']); return '\u0000' + (tex.length - 1) + '\u0000'; }));
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => katex.renderToString(tex[i][0], {output: 'html', throwOnError: false, displayMode: tex[i][1]}));
  };
  const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
  const attr = s => plain(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const terms = JSON.parse(fs.readFileSync(path.join(ROOT, 'terms/terms.json'), 'utf8')).terms;
  const pubTerm = s => terms.some(x => x.slug === s && x.published);
  const img = name => fs.existsSync(path.join(ROOT, 'trainer/img', name + '.jpg')) ? `/trainer/img/${name}.jpg` : '';
  // картинки к задачам — 12 из 51 (Диля, 23.11): иллюстрации курса ШАДа «Прикладная статистика», занятия 2–5; соответствие — в проектном документе «Тренажёр — картинки к задачам».
  // Показываем, только когда файл trainer/img/tasks/<имя>.jpg на месте.
  // в trainer/img/tasks лежат и картинки ШАДа для будущих эталонов (birthdays, taxi-witness, berkson…): список — в документе «Тренажёр — промпты картинок к задачам»
  const PICS = {
    'S6a-w': ['mde-calendar', 'Боб тянется к самой мелкой лупе, Алиса показывает на календарь'],
    'S5a-w': ['octopus', 'Осьминог выбирает кормушку перед камерами, Алиса светит фонариком на прошлые угадывания'],
    'S9a-s1': ['jellybeans', 'Полка банок с мармеладками всех цветов, Боб радуется одной банке перед журналистами'],
    'S4a-w': ['ring-toss', 'Алиса бросает кольца на колышек, Боб и Котейка смотрят'],
    'S9a-w': ['false-greens', 'Стена лампочек: Боб собирает все кубки под зелёными, Алиса показывает, что один кубок картонный'],
    'P3a-w': ['promo-flag', 'Рамка-сканер подсвечивает красным много обычных людей, Котейка с лупой находит одного енота'],
    'P2b-w': ['monty-doors', 'Три двери на сцене шоу, за открытой — коза, Алиса раздумывает'],
    'A1a-i': ['lottery-drum', 'Барабан лотереи, шарики лежат слоями и не перемешаны, Котейка крутит ручку'],
    'A1c-w': ['split-machine', 'Машина делит гостей на две группы, Алиса проверяет весы'],
    'A3a-i': ['peeking-oven', 'Боб открывает духовку раньше времени, Алиса показывает на таймер'],
    'C1a-w': ['simpson-platforms', 'Котейка показывает внутри экрана две группы, Боб схватился за голову из-за падающего графика'],
    'C2b-w': ['bus-stop', 'Очередь на остановке, Алиса рулеткой меряет интервалы между автобусами'],
    'C2a-i': ['average-check', 'Недовольные гости уходят из кафе, Боб радуется анкетам оставшихся'],
  };
  const pic = id => { const p = PICS[id]; return p && img('tasks/' + p[0]) ? `<figure class="tr-pic"><img src="${img('tasks/' + p[0])}" alt="${attr(p[1])}" width="1600" height="900" loading="lazy"></figure>` : ''; };

  const head = o => `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Страница собрана командой node tools/build-trainer.js из tools/trainer-content.js: правьте их, а не этот файл. -->
<title>${plain(o.title)}</title>
<meta name="description" content="${attr(o.desc)}">
<meta name="robots" content="noindex, follow">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
<link rel="stylesheet" href="/terms/terms.css?v=${V}">
<link rel="preload" href="/fonts/katex/fonts/KaTeX_Main-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/katex/fonts/KaTeX_Math-Italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=${V}">
<link rel="stylesheet" href="/trainer/trainer.css?v=${V}">
</head>
<body class="t-page tr-page">
<a class="skip" href="#main">Перейти к содержанию</a>
${chrome.header('')}
`;
  const foot = () => `\n<script src="/trainer/trainer.js?v=${V}" defer></script>\n` + chrome.footer() + '\n';
  const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), {recursive: true}); fs.writeFileSync(f, html); };

  const TYPE = {calc: 'Расчёт', idea: 'На понимание'};
  const num = x => String(x).replace('.', ',');

  // одна задача с проверкой ответа
  const calcTask = (x, kind, id) => `
      <div class="tr-task" data-id="${id}" data-ans="${x.ans}" data-tol="${x.tol}">
        <p class="tr-kind">${kind}${x.dom ? ` · <span class="tr-dom">${typo(x.dom)}</span>` : ''}</p>
        ${pic(id)}<p class="tr-q">${typo(x.q)}</p>
        <form class="tr-form" novalidate>
          <label><span class="vh">Ответ</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="Ответ"></label>${x.unit ? `<span class="tr-unit">${typo(x.unit)}</span>` : ''}
          <button type="submit" class="btn ghost">Проверить</button>
        </form>
        <p class="tr-fb" role="status"></p>
        ${x.hint ? `<details class="tr-hint"><summary>Подсказка</summary><p>${typo(x.hint)}</p></details>` : ''}
        <details class="tr-sol"><summary>Решение</summary><p>${typo(x.sol)}</p></details>
      </div>`;

  const ideaTask = (d, id) => `
      <div class="tr-task tr-idea" data-id="${id}">
        <p class="tr-kind">На понимание · ответь вслух или письменно, потом сверься</p>
        ${pic(id)}<p class="tr-q">${typo(d.q)}</p>
        <textarea rows="4" placeholder="Твой ответ (остаётся только в этом браузере)" aria-label="Твой ответ"></textarea>
        <details class="tr-sol"><summary>Что хотят услышать</summary>
          <ul class="list">${d.points.map(p => `<li>${typo(p)}</li>`).join('')}</ul>
          <p><b>Слабый ответ:</b> ${typo(d.weak)}</p>
          <p><b>Сильный ответ:</b> ${typo(d.strong)}</p>
        </details>
      </div>`;

  const game = slug => {
    const g = slug && P.toys.find(x => x.slug === slug);
    if (!g) return '';
    return `
      <div class="tr-game">
        <p class="tr-kind">Игра · ${typo(P.texts[slug].q)}</p>
        <div class="stage-frame"><iframe class="tr-frame" src="/play/${slug}/?embed=1" data-toy="${slug}" title="Игра: ${attr(P.texts[slug].q)}" style="height:${g.h}px" loading="lazy"></iframe></div>
        ${SOL[slug] ? `<section class="play-out tr-out"><p class="kicker">Почему так</p><p class="locked">Сначала сделай прогноз и проверь его в игре.</p><div class="reveal" hidden>${SOL[slug]}</div></section>` : ''}
      </div>`;
  };

  const ready = {};
  for (const [slug, t] of Object.entries(TOPICS)) ready[t.code] = slug;
  const mix = [];

  // ---------- страницы тем
  for (const [slug, t] of Object.entries(TOPICS)){
    const url = `/trainer/${slug}/`;
    const termLink = t.term && pubTerm(t.term) ? ` <a href="/terms/${t.term}/">Подробнее в словаре →</a>` : '';
    const courses = t.courses.map(([c, step, href]) => `<a href="${href}">«${C[c].name}», ${typo(step)}</a>`).join(' · ');
    const nav = `<nav class="tr-toc" aria-label="Шаблоны темы"><p class="tr-kind">Шаблоны</p><ol>${t.templates.map(x => `<li><a href="#${x.id}">${typo(x.name)}</a></li>`).join('')}</ol></nav>`;
    const tpls = t.templates.map(x => {
      const steps = x.steps ? `<ol class="tr-steps">${x.steps.map(s => `<li>${typo(s)}</li>`).join('')}</ol>` : '';
      let body;
      if (x.type === 'idea') body = ideaTask(x.idea, x.id + '-i');
      else {
        body = calcTask(x.worked, 'Разбор · сначала попробуй сам', x.id + '-w');
        if (x.solo.length) body += `\n      <h3 class="tr-h3">Реши сам — тот же шаблон, другой сюжет</h3>` + x.solo.map((s, i) => calcTask(s, 'Реши сам', `${x.id}-s${i + 1}`)).join('');
        [x.worked, ...x.solo].forEach((s, i) => mix.push({id: `${x.id}-${i}`, q: typo(s.q), dom: s.dom || '', unit: s.unit ? typo(s.unit) : '', ans: s.ans, tol: s.tol, sol: typo(s.sol), tpl: typo(x.name), topic: typo(t.name), href: url + '#' + x.id}));
      }
      return `
    <section class="tr-tpl" id="${x.id}" aria-labelledby="${x.id}-h">
      <p class="tr-kind">${x.type === 'idea' ? 'На понимание' : 'Расчёт'}</p>
      <h2 id="${x.id}-h">${typo(x.name)}</h2>
      ${game(x.game)}
      <div class="tr-how-tpl">
        <p class="tr-kind">Шаблон</p>
        <p class="tr-rec"><b>Как узнать.</b> ${typo(x.recognize)}</p>
        ${steps}
      </div>
      ${body}
    </section>`;
    }).join('\n');
    const html = head({title: `${t.name} — тренажёр собеседований`, desc: `${t.name}: краткая теория, шаблоны и задачи с собеседований аналитика с проверкой ответа.`}) + `
<main id="main" class="wrap term t-wide tr-topic" data-topic="${slug}">
  <p class="eyebrow"><a href="/trainer/">Тренажёр собеседований</a> · ${t.code}</p>
  <h1>${typo(t.name)}</h1>
  <p class="t-def">${typo(t.lead)}</p>
  <section class="tr-theory" aria-label="Шпаргалка">
    <p class="tr-kind">Шпаргалка</p>
    ${t.theory.map(p => `<p>${typo(p)}</p>`).join('\n    ')}
    <p class="tr-where">Разбираем в курсах: ${courses}.${termLink}</p>
  </section>
  ${nav}
${tpls}
  <p class="tr-next"><a href="/trainer/mix/">Смешанная тренировка: задачи вперемешку, без подсказки темы →</a></p>
</main>` + foot();
    write(`trainer/${slug}/index.html`, html);
  }

  // ---------- смешанная тренировка
  const mixHtml = head({title: 'Смешанная тренировка — тренажёр собеседований', desc: 'Задачи с собеседований аналитика вперемешку, без подсказки темы: узнай шаблон сам, как на настоящем интервью.'}) + `
<main id="main" class="wrap term t-wide tr-mix">
  <p class="eyebrow"><a href="/trainer/">Тренажёр собеседований</a></p>
  <h1>Смешанная тренировка</h1>
  <p class="t-def">На собеседовании тему не называют. Здесь задачи идут вперемешку из всех готовых тем — сначала узнай шаблон, потом считай.</p>
  ${img('trainer-mixed') ? `<img class="tr-sec-img" src="${img('trainer-mixed')}" alt="" width="1200" height="800">` : ''}
  <div class="tr-mixbox" aria-live="polite">
    <p class="tr-kind"><span data-mix-n></span><span class="tr-dom" data-mix-dom></span></p>
    <p class="tr-q" data-mix-q></p>
    <form class="tr-form" novalidate data-mix-form>
      <label><span class="vh">Ответ</span><input type="text" inputmode="decimal" autocomplete="off" placeholder="Ответ"></label><span class="tr-unit" data-mix-unit></span>
      <button type="submit" class="btn ghost">Проверить</button>
    </form>
    <p class="tr-fb" role="status"></p>
    <div class="tr-after" hidden>
      <p><b>Шаблон:</b> <span data-mix-tpl></span> · <a data-mix-href href="#">разбор темы →</a></p>
      <p data-mix-sol></p>
    </div>
    <p class="tr-ctrls"><button type="button" class="btn ghost" data-mix-show>Показать решение</button> <button type="button" class="btn" data-mix-next>Следующая задача</button></p>
    <p class="tr-score" data-mix-score></p>
  </div>
  <script type="application/json" id="mix-data">${JSON.stringify(mix).replace(/</g, '\\u003c')}</script>
</main>` + foot();
  write('trainer/mix/index.html', mixHtml);

  // ---------- карта
  const hero = img('trainer-hero');
  const sec = SECTIONS.map(s => {
    const items = MAP.filter(m => m[0] === s.id);
    const total = items.reduce((a, m) => a + m[3], 0);
    const pic = img(s.img);
    return `
  <section class="tr-sec" aria-labelledby="sec-${s.id}">
    ${pic ? `<img class="tr-sec-img" src="${pic}" alt="" width="1200" height="800" loading="lazy">` : ''}
    <h2 id="sec-${s.id}">${s.name}</h2>
    <p class="tr-meta">${items.length} ${items.length > 4 ? 'тем' : 'темы'} · ${total} задач в банке</p>
    <ul class="tr-topics">${items.map(m => {
      const r = m[4] && TOPICS[m[4]];
      return r ? `<li class="on"><a href="/trainer/${m[4]}/"><b>${typo(m[2])}</b><span>${r.templates.length} шабл. · готово</span></a></li>`
               : `<li><b>${typo(m[2])}</b><span>скоро · ${m[3]} задач</span></li>`;
    }).join('')}</ul>
  </section>`;
  }).join('');
  const nReady = Object.keys(TOPICS).length, nTasks = mix.length;
  const index = head({title: 'Тренажёр собеседований аналитика — вероятность, статистика, A/B', desc: 'Задачи с собеседований аналитика по вероятности, статистике, A/B и продуктовым кейсам: игра, шаблон, разбор и задачи в других доменах с проверкой ответа.'}) + `
<main id="main" class="wrap term t-wide tr-map">
  <p class="eyebrow">Тренажёр · первая версия</p>
  <h1>Тренажёр собеседований аналитика</h1>
  <p class="t-def">Вероятность, статистика, A/B-тесты и продуктовые кейсы — задачи с собеседований аналитика, каждая разобрана по полочкам и проверена симуляцией. SQL и Python здесь нет.</p>
  ${hero ? `<img class="tr-hero" src="${hero}" alt="" width="1600" height="900" fetchpriority="high">` : ''}
  <section class="tr-how" aria-labelledby="how-h">
    <h2 id="how-h">Как устроено</h2>
    <ol class="tr-steps">
      <li><b>Тема</b> — коротко о главном и ссылка на курс, где это разбираем подробно.</li>
      <li><b>Игра</b> — сделай прогноз и проверь его: так идея запоминается лучше, чем из формулы.</li>
      <li><b>Шаблон</b> — тип задачи, как узнать его по условию и как решать по шагам.</li>
      <li><b>Разбор</b> — задача с решением по шагам. Сначала попробуй сам.</li>
      <li><b>Реши сам</b> — та же задача в другом домене и с другими числами: доставка, финтех, игры, маркетплейс. Ответ проверяется сразу.</li>
      <li><b>Смешанная тренировка</b> — задачи вперемешку, без подсказки темы, как на настоящем собеседовании.</li>
    </ol>
    <p class="tr-cta"><a class="btn" href="/trainer/mix/">Смешанная тренировка · ${nTasks} задач</a></p>
    <p class="tr-meta">Готово ${nReady} тем из ${MAP.length}. Остальные появятся до конца декабря.</p>
  </section>
${sec}
  <section class="tr-sec" aria-labelledby="sec-mock">
    ${img('trainer-mock') ? `<img class="tr-sec-img" src="${img('trainer-mock')}" alt="" width="1200" height="800" loading="lazy">` : ''}
    <h2 id="sec-mock">Пробное собеседование</h2>
    <p class="tr-meta">Скоро · 45 минут, задачи из разных разделов, разбор в конце</p>
  </section>
</main>` + foot();
  write('trainer/index.html', index);
  return {topics: nReady, tasks: mix.length};
}

module.exports = {build};
if (require.main === module) console.log('build-trainer:', build());
