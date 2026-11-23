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
  'index.html': 'home', 'about/index.html': '', 'probability/index.html': 'courses', 'signal/index.html': 'courses', 'ab-basics/index.html': 'courses', 'stats/index.html': 'courses',
  'ab/index.html': 'courses', 'causal/index.html': 'courses', 'map/index.html': 'courses',
  'account.html': 'account', 'shelf/kohavi-trustworthy/index.html': 'shelf', '404.html': '', 'styleguide/index.html': '',
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
  const card = (c, i) => `
    <li class="course${c.faded ? ' faded' : ''}" id="c-${c.id}">
      <figure class="art"><img src="${c.img}" width="1600" height="900" loading="${i < 2 ? 'eager' : 'lazy'}" alt="${esc(c.alt)}" onerror="this.parentNode.classList.add('missing')"><figcaption class="ph"></figcaption></figure>
      <p class="chips">${c.tag === 'free' ? `<span class="tag free">${nb(c.status)}</span>` : `<span class="price"><b>${nb(c.price || '')}</b></span>`}${chip(c.level)}${c.hours ? `<span class="tag">${c.hours.replace(/ /g, '&nbsp;')}</span>` : ''}${c.tag === 'free' ? '' : `<span class="tag muted">${nb(c.status)}</span>`}</p>
      <h3><span class="path-n">${i + 1}.</span> <a href="${c.href}">${c.name}</a></h3>
      <p class="line">${nb(c.line)}</p>
      <dl><dt>Тема</dt><dd>${c.topic}</dd><dt>Внутри</dt><dd>${nb(c.in)}</dd></dl>
      <p class="course-act"><a class="btn ghost" href="${c.href}" aria-label="Подробнее о курсе «${esc(c.name)}»">Подробнее</a></p>
    </li>`;
  const html = head({title: 'Курсы по вероятности, статистике и A/B-тестам · Диля Хакимова',
    desc: 'Курсы по порядку «Весь путь»: от «Вероятности на пальцах» до продвинутого «A/B без мифов». Три бесплатных курса можно начать сразу, без регистрации.',
    url: '/courses/', css: ['/course.css', '/site/site.css'], og: '/img/probability-cover.jpg'}) + chrome.header('courses', true) + `

<main id="main" class="wrap courses-page">
  <section class="c-hero">
    <h1>Курсы</h1>
    <p class="sub">Весь путь — по порядку: от первой вероятности до продвинутых A/B-тестов. Бесплатные курсы открываются сразу, без регистрации.</p>
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
// корешки — спокойные «книжные» тона, не цвета данных (синий #23418A, коралл #E8644A), не уровни (--l1/2/3) и не рубрики;
// белый текст на каждом ≥ 5.6 : 1. Цвет — от slug (FNV-1a), не от темы и не от порядка: не меняется между сборками.
const SPINE = ['#2F5A3E' /* тёмно-зелёный 7.9:1 */, '#86601C' /* охра 5.7:1 */, '#5C3A64' /* сливовый 9.4:1 */,
  '#3E4148' /* графит 10.2:1 */, '#1F4B5C' /* тёмно-синий с зеленцой 9.5:1 */, '#6A4632' /* умбра 8.3:1 */];
const spineColor = slug => { let x = 0x811c9dc5; for (const ch of slug) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return SPINE[x % SPINE.length]; };
// названия книги: основное — оригинал (title_en; у русской книги — title_ru), под ним — русское издание или «перевода нет»
const bookTitle = b => b.title_en || b.title_ru;
const bookLang = b => b.title_en ? ' lang="en"' : '';
const SHELF_FILTER_MIN = 6;  // фильтр по темам — только если на полке хотя бы столько позиций
function shelf(){
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'shelf/shelf.json'), 'utf8'));
  // на полке — только то, у чего уже вышел разбор; остальное ждёт с published:false
  const books = S.books.filter(b => b.published && b.review), arts = S.articles.filter(a => a.published && a.review);
  const topics = REL.TOPICS.filter(tp => books.some(b => b.topic === tp));
  const showFilter = books.length + arts.length >= SHELF_FILTER_MIN && topics.length > 1;
  let h = 7;
  const spine = (b, i) => {
    h = (h * 37 + 11) % 100; // разные высота и толщина — стабильно от сборки к сборке
    const height = 232 + (h % 5) * 12, width = 52 + (h % 4) * 6;
    const t = bookTitle(b), lg = bookLang(b);
    // одна подсказка на корешок: текст в HTML, обложка — у читателя из Open Library при первом наведении (site/shelf.js)
    const isbn = (b.isbn || []).filter(x => /^\d{9}[\dX]$|^\d{13}$/.test(x));
    // подсказка только для чтения (без ссылок, pointer-events:none): слева обложка, если загрузилась (site/shelf.js), справа текст;
    // «Нажми ещё раз…» видна только после нажатия пальцем (первое нажатие показывает карточку, второе открывает разбор)
    // правая колонка: метки → оригинал (название, авторы по-английски · год) → перевод (название · год издания, без авторов;
    // нет перевода — «Перевода на русском нет»; у русской книги — только русский блок с авторами) → about
    const by = (a, y) => `${esc(a)}${y ? `&nbsp;· ${y}` : ''}`;  // «· 2020» не уезжает на отдельную строку
    const orig = b.title_en
      ? `<span class="b-orig" lang="en"><b>${esc(b.title_en)}</b>${b.author_en ? `<span class="b-by">${by(b.author_en, b.year)}</span>` : ''}</span>`
        + `<span class="b-tr">${b.title_ru ? by(nb(b.title_ru), b.year_ru) : 'Перевода на русском нет'}</span>`
      : `<span class="b-orig"><b>${esc(b.title_ru)}</b><span class="b-by">${by(b.author, b.year)}</span></span>`;
    const card = `<span class="b-card" role="tooltip" id="bc-${b.slug}"${isbn.length ? ` data-isbn="${isbn.join(' ')}" data-cover-alt="Обложка: ${esc(t)}"` : ''}><span class="b-txt"><span class="b-topic">книга · ${b.topic}</span>${orig}${b.about ? `<span class="b-about">${esc(nb(b.about))}</span>` : ''}${b.review ? '<span class="b-tap" aria-hidden="true">Нажми ещё раз, чтобы открыть разбор</span>' : ''}</span></span>`;
    // на узком корешке — короткое название (title_short), полное — в подсказке
    const inner = `<span class="b-t"${lg}>${esc(b.title_short || t)}</span><span class="b-a">${esc(((b.title_en && b.author_en) || b.author).split(',')[0].trim().split(' ').pop())}</span>`;
    const st = `style="--h:${height}px; --w:${width}px; --hn:${height}; --wn:${width}; --c:${spineColor(b.slug)}"`;  // --hn/--wn — для полки-картинки (масштаб от ширины)
    const label = `${esc(t)}${b.title_en && b.title_ru ? ` («${esc(b.title_ru)}»)` : ''}, ${esc((b.title_en && b.author_en) || b.author)}`;
    return b.review
      ? `<li class="book live" data-topic="${b.topic}" data-slug="${b.slug}"><a class="spine" href="${b.review}" ${st} aria-label="${label} — разбор книги" aria-describedby="bc-${b.slug}">${inner}</a>${card}</li>`
      : `<li class="book" data-topic="${b.topic}" data-slug="${b.slug}"><button class="spine" type="button" ${st} aria-label="${label}" aria-describedby="bc-${b.slug}" aria-expanded="false">${inner}</button>${card}</li>`;
  };
  // список разборов под полкой (просьба Дили, 22.11): группы «Книги» → «Статьи», пустая группа не выводится;
  // строка без рамки и фона: название-ссылка на разбор, мелко — авторы · год, приглушённо — русское издание, справа — метки тем.
  // Метки «книга/статья» нет: тип задан заголовком группы. Колонка — .col (гайд, 109a), чуть шире --measure, чтобы метки вставали в строку.
  const topicsOf = x => [].concat(x.topic || []).filter(Boolean);
  const tags = x => { const t = topicsOf(x); return t.length ? `<span class="r-tags">${t.map(tp => `<span class="tag">${esc(tp)}</span>`).join('')}</span>` : ''; };
  const meta = (a, y, lg = '') => a || y ? `<span class="r-by"${lg}>${a ? esc(a) : ''}${a && y ? '&nbsp;· ' : ''}${y || ''}</span>` : '';
  const bookRow = b => {
    const ru = b.title_en ? `<span class="r-tr">${b.title_ru ? `На русском: «${esc(nb(b.title_ru))}»${b.year_ru ? `&nbsp;· ${b.year_ru}` : ''}` : 'Перевода на русском нет'}</span>` : '';
    return `
      <li data-slug="${b.slug}"><div class="r-main"><a class="r-t" href="${b.review}"${bookLang(b)}>${esc(bookTitle(b))}</a>${meta(b.title_en ? (b.author_en || b.author) : b.author, b.year, b.title_en && b.author_en ? ' lang="en"' : '')}${ru}</div>${tags(b)}</li>`;
  };
  const artRow = a => {
    const t = a.title_en || a.title, by = a.title_en ? (a.author_en || a.author) : a.author;
    return `
      <li><div class="r-main"><a class="r-t" href="${a.review}"${a.title_en ? ' lang="en"' : ''}>${esc(t)}</a>${meta([by, a.where].filter(Boolean).join(', '), a.year)}</div>${tags(a)}</li>`;
  };
  const group = (id, name, list, row) => list.length ? `
    <section class="r-group" aria-labelledby="${id}">
      <h2 id="${id}">${name}</h2>
      <ul class="reviews" role="list">${list.map(row).join('')}
      </ul>
    </section>` : '';
  // свои материалы: есть url — вся карточка ссылка в той же вкладке, площадка названа словами (гайд, п. 126); url:null — заглушка «скоро», после готовых
  const WHERE = {'Хабр': 'на Хабре', 'Medium': 'на Medium', 'YouTube': 'на YouTube', 'Telegram': 'в Telegram'};
  const GO = {article: 'Читать', video: 'Смотреть', channel: 'Открыть канал'};
  const KIND = {article: 'статья', video: 'видео', channel: 'канал'};  // метка типа — первой в строке меток
  const mineCard = m => {
    const body = `
      <p class="chips"><span class="tag">${KIND[m.kind] || 'статья'}</span><span class="tag">${esc(m.where)}</span>${m.topic ? `<span class="tag">${m.topic}</span>` : ''}</p>
      <h3>${esc(nb(m.title))}</h3>
      <p>${esc(nb(m.about))}</p>`;
    return m.url
      ? `
    <li><a class="panel article shelf-card" href="${esc(m.url)}">${body}
      <span class="go">${GO[m.kind] || 'Открыть'} ${WHERE[m.where] || ''} →</span>
    </a></li>`
      : `
    <li><div class="panel article shelf-card stub">${body}
      <span class="soon">скоро</span>
    </div></li>`;
  };
  // Блок «Статьи и видео от автора» пока скрыт (решение Дили 22.11): данные в shelf.json сохранены, место для блока ещё ищем.
  const SHOW_MINE = false;
  const mine = SHOW_MINE ? (S.mine || []).filter(m => m.url).concat((S.mine || []).filter(m => !m.url)) : [];
  const html = head({title: 'Полка Котейки — книги и статьи для аналитика',
    desc: 'Книжная полка аналитика: разборы книг и статьи об A/B-тестах. Наведи на корешок — увидишь, о чём книга.',
    url: '/shelf/', css: ['/site/site.css'], og: '/shelf/img/kotejka-reads-cover.jpg'}) + chrome.header('shelf', true) + `

<main id="main" class="wrap shelf-page">
  <!-- первый экран — как на главной и /map/: .hero, .hero-text, .art.hero-art (home.css); картинка 4:3 целиком (.r43, пара 135a), на телефоне — под текстом.
       Класс c-hero оставлен для site/shelf.js: подсказка у корешка не заходит на шапку -->
  <section class="hero c-hero">
    <div class="hero-text">
      <h1>Полка Котейки</h1>
      <!-- три строки под h1, как на главной (.sub.hero-list): первая — подзаголовок, крупнее (решение Дили, 22.11.2026) -->
      <p class="sub shelf-lead">Книги и статьи, которые стоит прочитать аналитику.</p>
      <ul class="sub hero-list" role="list">
        <li>Классика, на которой стоит вся статистика, — и свежие статьи о том, как эксперименты ставят в индустрии сейчас.</li>
        <li>Каждый разбор — главная мысль, 3–5 идей с играми и что из этого пригодится на работе. Новый разбор каждую неделю.</li>
      </ul>
    </div>
    <figure class="art r43 hero-art">
      <img src="/shelf/img/kotejka-reads-cover.jpg" width="1600" height="1200" decoding="async" alt="Котейка в очках читает книгу в кресле">
    </figure>
  </section>
${showFilter ? `  <div class="topic-filter" role="group" aria-label="Тема">
    <button type="button" aria-pressed="true" data-topic="">Все темы</button>${topics.map(tp => `<button type="button" aria-pressed="false" data-topic="${tp}">${tp}</button>`).join('')}
  </div>
` : ''}  <!-- полка — картинка Котейки (img/rubrics/shelf-kotejka.png, кадр 1600×850): корешки стоят на доске между горшком и мешком;
       от 700 px; уже — прежняя полка из CSS (корешки на картинке стали бы нечитаемыми) -->
  <div class="bookshelf scene" role="region" aria-label="Книжная полка" tabindex="0">
    <img class="scene-art" src="/shelf/img/shelf-scene.jpg" srcset="/shelf/img/shelf-scene-800.jpg 800w, /shelf/img/shelf-scene.jpg 1600w" sizes="(max-width:1120px) 100vw, 1056px" width="1600" height="850" alt="" decoding="async">
    <ul class="books" role="list">${books.map(spine).join('')}
    </ul>
    <div class="board" aria-hidden="true"></div>
  </div>
  <p class="figcap">Нажми на корешок — откроется разбор.</p>
${books.length || arts.length ? `
  <div class="block shelf-list">
    <div class="col">${group('books-h', 'Книги', books, bookRow)}${group('arts-h', 'Статьи', arts, artRow)}
    </div>
  </div>
` : ''}${mine.length ? `
  <section class="block shelf-read" aria-labelledby="mine-h">
    <h2 id="mine-h">Статьи и видео от автора</h2>
    <ul class="shelf-cards" role="list">${mine.map(mineCard).join('')}
    </ul>
  </section>
` : ''}</main>
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
    html = chrome.stamp(html, cur, cur === 'home', '/' + f.replace(/index\.html$/, ''));
    // картинки, которых ещё нет: есть запасная — ставим её; нет — убираем рисунок целиком (на входных страницах без заглушек)
    html = html.replace(/<figure class="art[^"]*"><img src="(\/[^"]+)"([^>]*)>[\s\S]*?<\/figure>/g, (all, src, rest) => {
      if (fs.existsSync(path.join(ROOT, src.split('?')[0]))) return all;
      const fb = (rest.match(/data-fallback="([^"]+)"/) || [])[1];
      if (fb && fs.existsSync(path.join(ROOT, fb))) return all.replace(`src="${src}"`, `src="${fb}"`);
      return `<!--missing-art ${src} ${Buffer.from(all).toString('base64')} -->`;
    });
    // вернуть рисунки, файл которых уже появился
    html = html.replace(/<!--missing-art (\S+) (\S+) -->/g, (all, src, b64) => fs.existsSync(path.join(ROOT, src.split('?')[0])) ? Buffer.from(b64, 'base64').toString('utf8') : all);
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

// «Весь путь» на главной — компактный список из map/skills.json (tools/path-list.js);
// подписи — из i18n/home.js, время — hours из courses/courses.json
function homePath(){
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/home.js'), 'utf8'), ctx);
  const RU = ctx.I18N.ru, typo = s => ctx.I18N.typo('ru', s);
  const mctx = {}; mctx.globalThis = mctx; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/map.js'), 'utf8'), mctx);
  const MAP = mctx.I18N.ru;   // «Проверь себя: ты уже {list}.» — та же строка, что на /map/
  const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'map/skills.json'), 'utf8'));
  const H = Object.fromEntries(chrome.COURSES.filter(c => c.hours).map(c => [c.href, c.hours]));
  // термины курса — ссылка на /terms/<slug>/, если страница опубликована; совпадение по name (i18n/terms.js) или aka (terms/terms.json), без учёта регистра
  const tctx = {}; tctx.globalThis = tctx; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/terms.js'), 'utf8'), tctx);
  const TERMS = JSON.parse(fs.readFileSync(path.join(ROOT, 'terms/terms.json'), 'utf8')).terms, TERM = new Map();
  TERMS.filter(x => x.published).forEach(x => [tctx.TERMS_TEXT.ru[x.slug].name, ...(x.aka || [])].forEach(n => TERM.set(n.toLowerCase(), '/terms/' + x.slug + '/')));
  M.courses.forEach(c => { if (H[c.url]) c.hours = H[c.url]; });
  const html = require('./path-list.js').render(M, {esc, tx: s => typo(esc(s)).replace(/p-value/g, '<span class="nw">p-value</span>'),
    L: {free: RU.free, soon: RU['soon.abm'], later: RU.later, optional: RU['path.opt'], price: RU['price.paid'], level: RU['lvl.word'], lvl: {1: RU['lvl.1'], 2: RU['lvl.2'], 3: RU['lvl.3']}, pre: list => typo(MAP['ui.pre.short'].replace('{list}', list)), terms: RU['path.terms']}, termHref: n => TERM.get(n.toLowerCase())});
  const file = path.join(ROOT, 'index.html'), page = fs.readFileSync(file, 'utf8');
  if (!page.includes('<!-- path -->')) throw new Error('index.html: нет места для «Весь путь» (<!-- path --><!-- /path -->)');
  fs.writeFileSync(file, page.replace(/<!-- path -->[\s\S]*?<!-- \/path -->/, () => '<!-- path -->' + html + '<!-- /path -->'));
}
// «Где метод ломается и что дальше» на страницах курсов: заголовок — bnd.title (i18n/site.js), абзац — boundary курса из map/skills.json.
// Место — между <!-- boundary --> и <!-- /boundary -->: на лендингах перед «Для кого / Куда дальше», в «Сигнале» и «A/B на пальцах» — перед «Для кого и куда дальше»
function boundaries(){
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/site.js'), 'utf8'), ctx);
  const RU = ctx.I18N.ru, typo = s => ctx.I18N.typo('ru', s);
  const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'map/skills.json'), 'utf8'));
  const BOOK = [];   // все лендинги — в общем шаблоне
  M.courses.filter(c => c.url && c.boundary).forEach(c => {
    const file = path.join(ROOT, c.url.slice(1), 'index.html'); if (!fs.existsSync(file)) return;
    const page = fs.readFileSync(file, 'utf8');
    if (!page.includes('<!-- boundary -->')) throw new Error(c.url + ': нет места для «Где метод ломается» (<!-- boundary --><!-- /boundary -->)');
    const h = typo(esc(RU['bnd.title'])), p = typo(esc(c.boundary)).replace(/p-value/g, '<span class="nw">p-value</span>');
    const html = BOOK.includes(c.url) ? `<h2 id="bounds">${h}</h2>\n  <p class="bound">${p}</p>`
      : `<section class="wrap block" id="bounds" aria-labelledby="bnd-h">\n  <div class="col">\n    <h2 id="bnd-h">${h}</h2>\n    <p>${p}</p>\n  </div>\n</section>`;
    fs.writeFileSync(file, page.replace(/<!-- boundary -->[\s\S]*?<!-- \/boundary -->/, () => '<!-- boundary -->' + html + '<!-- /boundary -->'));
  });
}
function build(){ courses(); homePath(); boundaries(); shelf(); stampAll(); console.log('site: /courses/, /shelf/, шапка и футер на', Object.keys(STAMP).length, 'страницах'); }
module.exports = build;
if (require.main === module) build();
