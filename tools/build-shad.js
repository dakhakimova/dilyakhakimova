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
const DIR = 'shad/stats/04', SRC = path.join(ROOT, DIR, 'src');
const LESSON = 'Занятие 4 · Проверка гипотез';
const COURSE = 'Прикладная статистика для аналитика · ШАД';

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
<link rel="stylesheet" href="/${DIR}/shad.css?v=${ver}">
<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=${ver}">
</head>`;

const nav = `<nav class="top" aria-label="Навигация">
  <span class="top-l"><a class="home-line" href="/">dilyakhakimova.com</a> <span class="top-sep" aria-hidden="true">/</span> <a class="course" href="./">${LESSON}</a></span>
  <span><a href="./">Оглавление занятия</a></span>
</nav>`;

const files = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.html$/.test(f)).sort();
const metas = [];
for (const f of files){
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8'), nl = raw.indexOf('\n');
  const meta = JSON.parse(raw.slice(0, nl)); let body = raw.slice(nl + 1);
  const m = body.match(/<script>[\s\S]*<\/script>\s*$/); const script = m ? m[0] : ''; if (m) body = body.slice(0, m.index);
  const n = +f.slice(0, 2); metas.push({...meta, f, n});
  const html = `${head(meta.title + ' · ' + LESSON, meta.desc || meta.title, f)}
<body data-course="shad4" data-chapter="shad4-${f.slice(0, 2)}"${meta.next ? ` data-next="${meta.next}"` : ''}>
${nav}
<div class="reader" id="reader">
  <aside class="toc-side" id="toc-side" aria-label="Карточки блока">
    <h2>${meta.h}</h2>
    <ol id="toc-list"></ol>
  </aside>
  <main class="stage">
    <div class="stage-head">
      <button class="toggle" id="toc-toggle" type="button" aria-controls="toc-side" aria-expanded="true">☰ Карточки блока</button>
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
<script src="/signal/book.js?v=${ver}"></script>
<script src="/${DIR}/shad.js?v=${ver}"></script>
${script}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, DIR, f), html);
}

// оглавление
const toc = metas.map(m => `      <li><a href="${m.f}"><span class="n">${m.n}</span><span><b>${m.short || m.title}</b>${m.lead ? '<br><span class="muted">' + m.lead + '</span>' : ''}</span></a></li>`).join('\n');
fs.writeFileSync(path.join(ROOT, DIR, 'index.html'), `${head(LESSON + ' · ' + COURSE, 'Интерактивная версия занятия 4 курса ШАД «Прикладная статистика для аналитика»: критерии, p-value, мощность, ЦПТ, z- и t-тест, интервалы, MDE, χ², Манн — Уитни, множественные проверки.')}
<body class="shad-index">
${nav}
<main class="wrap shad-toc">
  <p class="kicker">${COURSE}</p>
  <h1>${LESSON}</h1>
  <p class="lead">Интерактивная версия занятия: девять блоков лекции. В задачах можно проверить свой ответ числом, решение спрятано под раскрывашкой, а там, где идею лучше видно на графике, — игра.</p>
  <ol class="shad-list">
${toc}
  </ol>
</main>
</body>
</html>
`);
const tex = require('./tex.js');
console.log('shad:', files.length, 'блоков; формул', tex.run([...metas.map(m => DIR + '/' + m.f)]));
