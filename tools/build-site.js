#!/usr/bin/env node
/* Собирает /courses/index.html (каталог курсов) и /shelf/index.html (полка: книги и статьи),
   ставит общую шапку и футер (tools/chrome.js) на статические страницы семейства «сайт»
   и noindex на страницы неопубликованных курсов. Вызывается из tools/bake-i18n.js.
   Данные: courses/courses.json, shelf/shelf.json. */
const fs = require('fs'), path = require('path');
const chrome = require('./chrome.js'), REL = require('./related.js'), V = require('./version.js');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://dilyakhakimova.com';
const FONTS = '/fonts/fonts.css';  // свои шрифты (fonts/fonts.css), без Google Fonts
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const nb = s => String(s).replace(/ (₽)/g, ' $1').replace(/(\d) (\d{3})/g, '$1 $2').replace(/(^|[\s«(])([ВвКкСсОоИиАаУуЯя]|во|на|не|по|из|за|от|до|об|со) /g, '$1$2 ');

// какие статические страницы получают общую шапку и футер; значение — текущая рубрика
const STAMP = {
  'index.html': 'home', 'about/index.html': '', 'probability/index.html': 'courses', 'stats/index.html': 'courses',
  'ab/index.html': 'courses', 'causal/index.html': 'courses', 'map/index.html': 'courses',
  'books/index.html': 'shelf', 'books/kohavi-trustworthy/index.html': 'shelf', '404.html': '', 'styleguide/index.html': '',
};

function head({title, desc, url, css = [], og = '/img/og.png', noindex = false}){
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Страница собрана командой node tools/bake-i18n.js (tools/build-site.js): правьте данные, а не этот файл. -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Диля Хакимова">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="${FONTS}?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
${css.map(c => `<link rel="stylesheet" href="${c}?v=${V}">`).join('\n')}
</head>
<body>
<a class="skip" href="#main">К содержанию</a>
`;
}

const LV = {1: 'Начальный', 2: 'Средний', 3: 'Продвинутый'};
const chip = lv => `<span class="chip"><span class="lvl l${lv}" aria-hidden="true"></span><span class="vh">Уровень </span><span>${LV[lv]}</span></span>`;

function courses(){
  const list = chrome.COURSES.filter(c => c.published);
  const firstFree = list.find(c => c.tag === 'free');
  const card = (c, i) => `
    <li class="course${c.faded ? ' faded' : ''}" id="c-${c.id}">
      <figure class="art"><img src="${c.img}" width="1600" height="900" loading="${i < 2 ? 'eager' : 'lazy'}" alt="${esc(c.alt)}" onerror="this.parentNode.classList.add('missing')"><figcaption class="ph"></figcaption></figure>
      <p class="chips"><span class="tag ${c.tag}">${nb(c.status)}</span>${chip(c.level)}${c.hours ? `<span class="tag">${c.hours.replace(/ /g, '&nbsp;')}</span>` : ''}</p>
      <h3><span class="path-n">${i + 1}.</span> <a href="${c.href}">${c.name}</a></h3>
      <p class="line">${nb(c.line)}</p>
      <dl><dt>Тема</dt><dd>${c.topic}</dd><dt>Внутри</dt><dd>${nb(c.in)}</dd>${c.price ? `<dt>Цена</dt><dd>${nb(c.price)}</dd>` : ''}</dl>
      <p class="course-act">${c.faded ? `<a class="more" href="${c.href}">О чём будет курс →</a>` : c.tag === 'free'
        ? `<a class="btn${c === firstFree ? '' : ' ghost'}" href="${c.start}">Начать</a><a class="more" href="${c.href}">О курсе →</a>`
        : `<a class="btn ghost" href="${c.href}#waitlist">Сообщить о старте</a><a class="more" href="${c.href}">О курсе →</a>`}</p>
    </li>`;
  const html = head({title: 'Курсы по вероятности, статистике и A/B-тестам · Диля Хакимова',
    desc: 'Курсы по порядку «Весь путь»: от «Вероятности на пальцах» до продвинутого «A/B без мифов». Три бесплатных курса можно начать сразу, без регистрации.',
    url: '/courses/', css: ['/course.css', '/site/site.css'], og: '/img/probability-cover.jpg'}) + chrome.header('courses', true) + `

<main id="main" class="wrap courses-page">
  <section class="c-hero">
    <h1>Курсы</h1>
    <p class="sub">Весь путь — по порядку: от вероятностей «в штуках» до продвинутых A/B-тестов. Бесплатные курсы открываются сразу, без регистрации.</p>
    <p class="start-link"><a class="more" href="/start/">Не знаешь, с чего начать? Подобрать маршрут →</a></p>
  </section>
  <ul class="cards path" role="list">${list.map(card).join('')}
  </ul>
</main>
` + chrome.footer() + `
</body>
</html>
`;
  fs.mkdirSync(path.join(ROOT, 'courses'), {recursive: true});
  fs.writeFileSync(path.join(ROOT, 'courses/index.html'), html);
}

// цвет корешка по теме — палитра сайта (tokens.css)
const SPINE = {'Вероятность': '#23418A', 'Статистика': '#0E7E5F', 'A/B': '#A63D28', 'Причинность': '#6B4E8C', 'Решения': '#A85A24'};
function shelf(){
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'shelf/shelf.json'), 'utf8'));
  const books = S.books.filter(b => b.published), arts = S.articles.filter(a => a.published);
  const topics = REL.TOPICS.filter(tp => books.some(b => b.topic === tp));
  let h = 7;
  const spine = (b, i) => {
    h = (h * 37 + 11) % 100; // разные высота и толщина — стабильно от сборки к сборке
    const height = 232 + (h % 5) * 12, width = 52 + (h % 4) * 6;
    const card = `<span class="b-card" role="tooltip" id="bc-${b.slug}"><b>«${esc(b.title)}»</b><span>${esc(b.author)}, ${b.year}</span><span>${esc(nb(b.about))}</span><span class="b-topic">${b.topic}</span>${b.review ? '<span class="b-go">Читать разбор →</span>' : ''}</span>`;
    const inner = `<span class="b-t">${esc(b.title)}</span><span class="b-a">${esc(b.author.split(',')[0].trim().split(' ').pop())}</span>`;
    const st = `style="--h:${height}px; --w:${width}px; --c:${SPINE[b.topic]}"`;
    return b.review
      ? `<li class="book live" data-topic="${b.topic}"><a class="spine" href="${b.review}" ${st} aria-label="«${esc(b.title)}», ${esc(b.author)} — разбор «Котейка читает»" aria-describedby="bc-${b.slug}">${inner}</a>${card}</li>`
      : `<li class="book" data-topic="${b.topic}"><button class="spine" type="button" ${st} aria-label="«${esc(b.title)}», ${esc(b.author)}" aria-describedby="bc-${b.slug}" aria-expanded="false">${inner}</button>${card}</li>`;
  };
  const art = a => `
    <article class="panel article">
      <p class="chips"><span class="tag"><time datetime="${a.date}">${a.where} · ${a.dateText}</time></span><span class="tag">${a.topic}</span></p>
      <h3><a href="${a.href}">${esc(a.title)}</a></h3>
      <p>${esc(nb(a.about))}</p>${a.toy ? `
      <p><a class="more" href="${a.toy.href}">${a.toy.text} →</a></p>` : ''}
    </article>`;
  const html = head({title: 'Полка: книги и статьи по статистике и A/B-тестам · Диля Хакимова',
    desc: 'Книжная полка аналитика: разборы книг «Котейка читает» и статьи об A/B-тестах. Наведи на корешок — увидишь, о чём книга.',
    url: '/shelf/', css: ['/site/site.css'], og: '/books/img/kotejka-reads-cover.jpg'}) + chrome.header('shelf', true) + `

<main id="main" class="wrap shelf-page">
  <section class="c-hero">
    <h1>Полка</h1>
    <p class="sub">Книги, которые стоит прочитать аналитику, и статьи. Яркие корешки — с разбором «Котейка читает»: открой и читай. Наведи на любой корешок, чтобы узнать, о чём книга.</p>
  </section>
${topics.length > 1 ? `  <div class="topic-filter" role="group" aria-label="Тема">
    <button type="button" aria-pressed="true" data-topic="">Все темы</button>${topics.map(tp => `<button type="button" aria-pressed="false" data-topic="${tp}">${tp}</button>`).join('')}
  </div>
` : ''}  <div class="bookshelf" role="region" aria-label="Книжная полка" tabindex="0">
    <ul class="books" role="list">${books.map(spine).join('')}
      <li class="shelf-kot" aria-hidden="true"><img src="/img/kot.svg" width="64" height="64" alt=""></li>
    </ul>
    <div class="board" aria-hidden="true"></div>
  </div>
  <p class="figcap">Котейка читает по одной книге за раз. Разборы — с играми и кодом: <a href="/books/">все разборы</a>.</p>

  <section class="block shelf-read" aria-labelledby="read-h">
    <h2 id="read-h">Статьи</h2>
    <div class="read">${arts.map(art).join('')}
    </div>
  </section>
</main>
` + chrome.footer() + `
<script src="/site/shelf.js?v=${V}"></script>
</body>
</html>
`;
  fs.mkdirSync(path.join(ROOT, 'shelf'), {recursive: true});
  fs.writeFileSync(path.join(ROOT, 'shelf/index.html'), html);
}

function stampAll(){
  for (const [f, cur] of Object.entries(STAMP)){
    const file = path.join(ROOT, f);
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');
    html = chrome.stamp(html, cur, cur === 'home');
    // картинки, которых ещё нет: есть запасная — ставим её; нет — убираем рисунок целиком (на входных страницах без заглушек)
    html = html.replace(/<figure class="art[^"]*"><img src="(\/[^"]+)"([^>]*)>[\s\S]*?<\/figure>/g, (all, src, rest) => {
      if (fs.existsSync(path.join(ROOT, src))) return all;
      const fb = (rest.match(/data-fallback="([^"]+)"/) || [])[1];
      if (fb && fs.existsSync(path.join(ROOT, fb))) return all.replace(`src="${src}"`, `src="${fb}"`);
      return `<!--missing-art ${src} ${Buffer.from(all).toString('base64')} -->`;
    });
    // вернуть рисунки, файл которых уже появился
    html = html.replace(/<!--missing-art (\S+) (\S+) -->/g, (all, src, b64) => fs.existsSync(path.join(ROOT, src)) ? Buffer.from(b64, 'base64').toString('utf8') : all);
    // единая версия ассетов
    html = html.replace(/(\.(?:css|js))\?v=\d+/g, `$1?v=${V}`);
    fs.writeFileSync(file, html);
  }
  // неопубликованные курсы: страница есть, но noindex и не видна в навигации
  for (const c of chrome.COURSES.filter(c => !c.published)){
    const file = path.join(ROOT, c.href.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(file)) continue;
    let html = fs.readFileSync(file, 'utf8');
    if (!/name="robots"/.test(html)) html = html.replace(/(<title)/, '<meta name="robots" content="noindex, follow">\n$1');
    fs.writeFileSync(file, html);
  }
}

function build(){ courses(); shelf(); stampAll(); console.log('site: /courses/, /shelf/, шапка и футер на', Object.keys(STAMP).length, 'страницах'); }
module.exports = build;
if (require.main === module) build();
