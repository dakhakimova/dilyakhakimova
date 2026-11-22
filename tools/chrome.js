/* Общая шапка и футер сайта — одно место на все страницы семейства «сайт» (tools/stamp → home.css).
   Пользуются: tools/bake-i18n.js (штампует статические страницы), tools/build-play.js, tools/build-terms.js, books, 404.
   Шапка (решения Дили, 22.11.2026): слева строка-ссылка на главную «Вероятность, статистика и A/B — в играх и задачах»
   (на телефоне — «Вероятность · статистика · A/B»); рубрики Курсы · Игры · Полка · Словарь; справа кружок входа
   с силуэтом Котейки (после входа — фото или первая буква имени). Без значка-логотипа и без «С чего начать».
   Футер статичный, без продаж: Курсы · Рубрики · Автор · копирайт.
   Шапку и футер на страницах не правят руками: правка здесь + node tools/bake-i18n.js. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

const NAV = [
  ['courses', '/courses/', 'Курсы'],
  ['play', '/play/', 'Игры'],
  ['shelf', '/shelf/', 'Полка'],
  ['terms', '/terms/', 'Словарь'],
  ['extras', '/extras/', 'Плюшки'],
];
// курсы в футере и на /courses/: порядок «Весь путь»; published:false — не показываем
const COURSES = JSON.parse(fs.readFileSync(path.join(ROOT, 'courses/courses.json'), 'utf8')).courses;
const TAGLINE = 'Вероятность, статистика и A/B — в играх и задачах', TAGLINE_S = 'Вероятность · статистика · A/B';
// на внутренних страницах слева в шапке вместо названия сайта — «← На главную» (решение Дили, 22.11.2026); полное название — только на главной, без ссылки
const BACK = '← На главную';

// кружок входа: до входа — силуэт Котейки и подсказка «Войти»; после входа (account.html и progress.js кладут
// в localStorage 'dk:me' имя и фото) — фото из Telegram или первая буква имени, aria-label «Мой кабинет».
// Запросов к /api/ шапка не делает (на /play/ и /terms/ их быть не должно).
const ME_JS = `<script>(function(){var a=document.currentScript.previousElementSibling.querySelector('.me');if(!a)return;var m=null;try{m=JSON.parse(localStorage.getItem('dk:me')||'null')}catch(e){}if(!m)return;a.setAttribute('aria-label','Мой кабинет');a.classList.add('in');var i=a.querySelector('.me-i');if(m.photo){var g=new Image();g.alt='';g.src=m.photo;g.onload=function(){i.replaceWith(g)}}else if(m.name){i.className='me-l';i.textContent=m.name.trim().charAt(0).toUpperCase()}})()</script>`;

function header(current = '', self = false){
  // текущая рубрика: на её главной странице — не ссылка (<span aria-current="page">), внутри рубрики — ссылка с aria-current="true";
  // на главной сайта строка-«логотип» тоже не ссылка (гайд, пара «Страница не ссылается на саму себя»)
  // data-rub — цвет рубрики для подчёркивания текущего пункта (tokens.css: --rub-*-line; у «Курсов» — нейтральный)
  const a = ([k, href, label]) => k === current && self ? `<span class="cur" data-rub="${k}" aria-current="page">${label}</span>`
    : `<a href="${href}" data-rub="${k}"${k === current ? ' aria-current="true"' : ''}>${label}</a>`;
  const hl = `<span class="hl-full">${TAGLINE}</span><span class="hl-short" aria-hidden="true">${TAGLINE_S}</span>`;
  return `<header class="top wrap" data-chrome>
  ${current === 'home' ? `<span class="home-line" aria-current="page">${hl}</span>` : `<a class="home-line" href="/">${BACK}</a>`}
  <nav id="site-nav" aria-label="Разделы сайта">
    ${NAV.map(a).join('\n    ')}
  </nav>
  <button class="burger" type="button" aria-expanded="false" aria-controls="site-nav"><span class="vh">Меню</span><span class="burger-i" aria-hidden="true"></span></button>
  <a class="me" href="/account.html" aria-label="Войти"${current === 'account' ? ' aria-current="page"' : ''}><span class="me-i" aria-hidden="true"></span></a>
</header>
<script>(function(){var h=document.currentScript.previousElementSibling,b=h.querySelector('.burger');b.addEventListener('click',function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o)})})()</script>
${ME_JS}`;
}

// анонс платного курса — только на финале /start/ (start.js) и страницах курсов; в контенте и футере не продаём
function announce(cls = ''){
  return `<aside class="announce${cls ? ' ' + cls : ''}" aria-label="Анонс курса «A/B без мифов»">
  <p class="announce-t"><a href="/ab/">«A/B без мифов»</a>: скоро</p>
</aside>`;
}

function footer(here = ''){   // here — адрес текущей страницы («/about/»): ссылка на саму себя становится текстом (гайд, пара 125)
  // футер служебный (решение Дили, 22.11.2026): бесплатные курсы, об авторе, копирайт. Не продаём, не анонсируем, не дублируем шапку.
  const c = COURSES.filter(x => x.published && x.tag === 'free').map(x => x.href === here ? `<span aria-current="page">${x.name}</span>` : `<a href="${x.href}">${x.name}</a>`).join(' · ');
  return `<footer class="foot" data-chrome>
  <div class="wrap">
    <p class="foot-line">Бесплатные курсы: ${c}</p>
    <p class="foot-line">${here === '/about/' ? '<span aria-current="page">Об авторе</span>' : '<a href="/about/">Об авторе</a>'} · © 2026 Диля Хакимова</p>
  </div>
</footer>`;
}

// заменить шапку и футер на странице; current — ключ рубрики
function stamp(html, current, self = false, here = ''){
  const cls = (html.match(/<header class="(top[^"]*)"/) || [])[1] || 'top wrap';
  html = html.replace(/<header class="top[^"]*"[^>]*>[\s\S]*?<\/header>(\s*<script>\(function\(\)\{var h=document\.currentScript[\s\S]*?<\/script>)?(\s*<script>\(function\(\)\{var a=document\.currentScript[\s\S]*?<\/script>)?/, () => header(current, self).replace('<header class="top wrap"', `<header class="${cls}"`));
  if (/<footer class="foot"/.test(html)) html = html.replace(/<footer class="foot"[^>]*>[\s\S]*?<\/footer>/, () => footer(here));
  else html = html.replace(/<\/main>/, () => '</main>\n' + footer(here));
  return html;
}

module.exports = {header, footer, announce, stamp, NAV, COURSES};
