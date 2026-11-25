#!/usr/bin/env node
/* Интерактивная версия занятий ШАД «Прикладная статистика для аналитика» (осень 2026).
   Источник — фрагменты shad/stats/04/src/NN-*.html: первая строка — JSON с метаданными
   {"title": "...", "h": "Блок 1 · Критерий своими руками", "next": "02-pvalue.html"}, дальше — карточки <section class="card">
   и необязательный <script> страницы. Скрипт собирает страницы shad/stats/04/NN-*.html и оглавление index.html,
   потом прогоняет формулы через tools/tex.js. Страницы закрыты от поисковиков (noindex) и не связаны с остальным сайтом,
   пока Диля не вычитает: решение 24.11.2026. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const V = require('./version.js');
const ver = typeof V === 'string' ? V : (V.version || V.V || V);
const COURSE = 'Прикладная статистика для аналитика · ШАД';
const SHARED = 'shad/stats/04';   // общие shad.css и shad.js лежат в папке занятия 4
const LESSONS = require('./shad-lessons.js');
for (const L of LESSONS){ if (fs.existsSync(path.join(ROOT, L.dir, 'src'))) buildLesson(L); }

// Версия для студентов: убираем решения и ответы (hideSolutions в shad-lessons.js), исходники не трогаем.
// Снимаются <details class="sol"> с заголовком «Решение»/«Ответ» и все <details class="rule-d"> («Показать ответ», «Показать критерий»).
function stripSolutions(html){
  const isAnswer = open => /class="[^"]*rule-d/.test(open) || (/class="[^"]*\bsol\b/.test(open) && /^\s*<summary>\s*(Решение|Ответ)\s*<\/summary>/.test(open.slice(open.indexOf('>') + 1)));
  let out = '', i = 0;
  const re = /<details\b[^>]*>/g;
  for (let m; (m = re.exec(html)); ){
    if (m.index < i) continue;
    // ищем парный </details> с учётом вложенных
    let depth = 0, j = m.index, end = -1; const tag = /<\/?details\b[^>]*>/g; tag.lastIndex = m.index;
    for (let x; (x = tag.exec(html)); ){ depth += x[0][1] === '/' ? -1 : 1; if (depth === 0){ end = x.index + x[0].length; break; } }
    if (end < 0) break;
    if (isAnswer(html.slice(m.index, Math.min(end, m.index + 300)))){ out += html.slice(i, m.index); i = end; re.lastIndex = end; }
  }
  return out + html.slice(i);
}

function buildLesson(L){
const DIR = L.dir, SRC = path.join(ROOT, DIR, 'src'), LESSON = L.lesson, PLAN = L.plan;

const head = (title, desc, canon) => `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${ver}">
<link rel="stylesheet" href="/tokens.css?v=${ver}">
<link rel="stylesheet" href="/signal/book.css?v=${ver}">
<link rel="stylesheet" href="/signal/free.css?v=${ver}">
<link rel="stylesheet" href="/${SHARED}/shad.css?v=${ver}">
<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=${ver}">
</head>`;

const nav = `<nav class="top" aria-label="Навигация">
  <span class="top-l"><a class="home-line" href="/">dilyakhakimova.com</a> <span class="top-sep" aria-hidden="true">/</span> <a class="course" href="./">${LESSON}</a></span>
  <span><a href="./">Оглавление занятия</a></span>
</nav>`;

const files = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.html$/.test(f)).sort();
const metas = [];
// всё оглавление занятия в боковой панели: текущий блок — карточки (заполняет book.js), остальные — раскрывашки со ссылками на слайды
const ALL = files.map(f => { const raw = fs.readFileSync(path.join(SRC, f), 'utf8'); const meta = JSON.parse(raw.slice(0, raw.indexOf('\n')));
  const titles = [...raw.matchAll(/<section class="card" data-title="([^"]*)"/g)].map(x => x[1]); return {f, meta, titles}; });
const fullToc = cur => ALL.map(b => b.f === cur
  ? `    <div class="lt cur"><h2>${b.meta.h}</h2>\n    <ol id="toc-list"></ol></div>`
  : `    <details class="lt"><summary>${b.meta.h}</summary><ol>${b.titles.map((t, i) => `<li><a class="tb" href="${b.f}#card-${i + 1}"><span class="i" data-n="${i + 1}"></span><span>${t}</span></a></li>`).join('')}</ol></details>`).join('\n');
for (const f of files){
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8'), nl = raw.indexOf('\n');
  const meta = JSON.parse(raw.slice(0, nl)); let body = raw.slice(nl + 1);
  const m = body.match(/<script>[\s\S]*<\/script>\s*$/); const script = m ? m[0] : ''; if (m) body = body.slice(0, m.index);
  if (L.hideSolutions) body = stripSolutions(body);
  const n = +f.slice(0, 2); metas.push({...meta, f, n});
  // формулы в атрибутах прячем от tex.js (он вставил бы разметку прямо в атрибут) — рендерим их отдельно ниже
  body = body.replace(/ data-(why|fb)="([^"]*)"/g, (all, k, v) => ` data-${k}="${v.replace(/\\\(/g, '⟪').replace(/\\\)/g, '⟫').replace(/\\\[/g, '⟦').replace(/\\\]/g, '⟧')}"`);
  const html = `${head(meta.title + ' · ' + LESSON, meta.desc || meta.title, f)}
<body data-course="shad4" data-chapter="shad${L.n}-${f.slice(0, 2)}"${meta.next ? ` data-next="${meta.next}"` : ''}>
${nav}
<div class="reader" id="reader">
  <aside class="toc-side" id="toc-side" aria-label="Оглавление занятия">
${fullToc(f)}
  </aside>
  <main class="stage">
    <div class="stage-head">
      <button class="toggle" id="toc-toggle" type="button" aria-controls="toc-side" aria-expanded="true">☰ Оглавление</button>
      <div class="progress" aria-hidden="true"><span id="prog"></span></div>
      <span class="count" id="count"></span>
    </div>
${body.trim()}
    <div class="pager">
      <button class="btn ghost" id="prev" type="button">← Назад</button>
      <button class="btn" id="next" type="button">Далее</button>
    </div>
  </main>
</div>
<script src="/fonts/katex/katex.min.js?v=${ver}"></script>
<script src="/signal/book.js?v=${ver}"></script>
${/class="cell"/.test(body) ? '<script src="/signal/py.js?v=' + ver + '"></script>\n' : ''}<script src="/${SHARED}/shad.js?v=${ver}"></script>
${script}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, DIR, f), html);
}

// оглавление — в шаблоне лендингов курсов (home.css + course.css), как /signal/
const done = new Set(metas.map(m => m.f));
const toc = PLAN.map(([f, t, d], i) => done.has(f)
  ? `      <li><span class="n">${i + 1}</span><h3><a href="${f}">${t}</a></h3><p class="d">${d}</p></li>`
  : `      <li class="soon"><span class="n">${i + 1}</span><h3>${t}</h3><p class="d">${d}</p><p class="x">Скоро</p></li>`).join('\n');
fs.writeFileSync(path.join(ROOT, DIR, 'index.html'), `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${LESSON} · ${COURSE}</title>
<meta name="description" content="Интерактивная версия занятия ${L.n} курса ШАД «Прикладная статистика для аналитика».">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${ver}">
<link rel="stylesheet" href="/tokens.css?v=${ver}">
<link rel="stylesheet" href="/home.css?v=${ver}">
<link rel="stylesheet" href="/course.css?v=${ver}">
<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=${ver}">
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
<header class="top wrap">
  <a class="home-line" href="/">← dilyakhakimova.com</a>
</header>
<main id="main">
<section class="c-hero wrap">
  <div>
    <p class="chips"><span class="tag">ШАД</span><span class="tag">Прикладная статистика для аналитика</span></p>
    <h1>${L.h1}</h1>
    <p class="sub">Интерактивная версия занятия: ${L.blocks}, как в лекции. В задачах можно проверить ответ числом, решение спрятано под «Решением», а там, где идею лучше видно на графике, — игра.</p>
    <p class="ctas"><a class="btn" href="${PLAN[0][0]}">Начать</a><a class="btn ghost" href="#toc">Оглавление ↓</a></p>
  </div>
  ${L.hero ? `<figure class="art"><img width="1200" height="675" src="${L.hero[0]}" alt="${L.hero[1]}"></figure>` : ''}
</section>
<section class="wrap block" id="toc">
  <div class="col">
    <h2>Оглавление</h2>
    <ol class="modules" role="list">
${toc}
    </ol>
  </div>
</section>
</main>
</body>
</html>
`);
const tex = require('./tex.js');
console.log('shad:', files.length, 'блоков; формул', tex.run([...metas.map(m => DIR + '/' + m.f), DIR + '/index.html']));
// формулы в пояснениях квиза и откликах (data-why, data-fb) — book.js вставляет их как HTML, поэтому рендерим KaTeX и туда
{
  const KATEX = require('./vendor/katex.min.js');
  const un = t => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const esc = t => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  for (const m of metas){
    const f = path.join(ROOT, DIR, m.f); let h = fs.readFileSync(f, 'utf8');
    h = h.replace(/ data-(why|fb)="([^"]*)"/g, (all, k, v) => {
      const raw = un(v); if (!/[⟪⟦]/.test(raw)) return all;
      const out = raw.replace(/⟦(.+?)⟧/g, (_, t) => '<span class="tx-d">' + KATEX.renderToString(t.replace(/−/g, '-'), {output: 'html', throwOnError: false, strict: 'ignore', displayMode: true}) + '</span>').replace(/⟪(.+?)⟫/g, (_, t) => KATEX.renderToString(t.replace(/−/g, '-'), {output: 'html', throwOnError: false, strict: 'ignore'}));
      return ` data-${k}="${esc(out)}"`;
    });
    // пара фамилий «Шапиро–Уилк» не рвётся на строки: склейка U+2060 вокруг короткого тире (Диля, 24.11)
    h = h.replace(/([А-Яа-яЁё])–([А-Яа-яЁё])/g, '$1\u2060–\u2060$2');
    // тире не начинает строку: неразрывный пробел перед « — » (гайд, пара 119)
    h = h.replace(/ — /g, '\u00a0— ');
    // кавычка не отрывается от формулы: «\(\beta\)» не рвётся после «
    h = h.replace(/«(?=<span class="(?:nw|tx|katex))/g, '«\u2060').replace(/<\/span>»/g, '</span>\u2060»');
    // «t-критерий», «p-value», «A/B-тест» не рвутся по дефису (гайд): склейка U+2060 после дефиса
    h = h.replace(/(^|[^A-Za-z0-9_-])([A-Za-z](?:\/[A-Za-z])?)-(?=[А-Яа-яЁё]|value)/g, '$1$2\u2060-\u2060');
    fs.writeFileSync(f, h);
  }
}
// тире между фамилиями (гайд 119a): проверяем исходники занятия при каждой сборке
try { require('child_process').execFileSync('node', [require('path').join(__dirname, 'check-names.js'), ...require('fs').readdirSync(require('path').join(__dirname, '..', DIR, 'src')).filter(f => f.endsWith('.html')).map(f => require('path').join(DIR, 'src', f))], {stdio: 'inherit'}); } catch (e) { console.error('Исправь тире между фамилиями — см. выше'); process.exitCode = 1; }
}
