/* Общая шапка и футер сайта — одно место на все страницы семейства «сайт» (tokens.css → home.css).
   Пользуются: tools/bake-i18n.js (штампует статические страницы), tools/build-play.js, tools/build-terms.js, books, 404.
   Структура (решение Дили, 22.11.2026): слева значок Котейки → главная; рубрики Курсы · Игры · Словарь · Полка;
   справа «Войти» и кнопка «С чего начать» (/start/). Имя автора — только в футере и на «Об авторе».
   Шапку и футер на страницах не правят руками: правка здесь + node tools/bake-i18n.js. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

const NAV = [
  ['courses', '/courses/', 'Курсы'],
  ['play', '/play/', 'Игры'],
  ['terms', '/terms/', 'Словарь'],
  ['shelf', '/shelf/', 'Полка'],
];
// курсы в футере и на /courses/: порядок «Весь путь»; published:false — не показываем
const COURSES = JSON.parse(fs.readFileSync(path.join(ROOT, 'courses/courses.json'), 'utf8')).courses;
const ANNOUNCE = {title: '«A/B без мифов»', text: 'Ранний доступ в конце января, 3 490 ₽.', href: '/ab/#waitlist', cta: 'Сообщить о старте'};

function header(current = ''){
  const a = ([k, href, label]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="top wrap" data-chrome>
  <a class="kot-home" href="/" aria-label="На главную"><img src="/img/kot.svg" width="30" height="30" alt=""></a>
  <p class="tagline">Вероятность, статистика и A/B — в играх и задачах</p>
  <button class="burger" type="button" aria-expanded="false" aria-controls="site-nav"><span class="vh">Меню</span><span class="burger-i" aria-hidden="true"></span></button>
  <nav id="site-nav" aria-label="Разделы сайта">
    ${NAV.map(a).join('\n    ')}
    <a class="login" href="/account.html"${current === 'account' ? ' aria-current="page"' : ''}>Войти</a>
    <a class="btn ghost start-btn" href="/start/"${current === 'start' ? ' aria-current="page"' : ''}>С чего начать</a>
  </nav>
</header>
<script>(function(){var h=document.currentScript.previousElementSibling,b=h.querySelector('.burger');b.addEventListener('click',function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o)})})()</script>`;
}

// блок-анонс платного курса: в конце бесплатных курсов, на финале /start/ и в футере
function announce(cls = ''){
  return `<aside class="announce${cls ? ' ' + cls : ''}" aria-label="Анонс курса «A/B без мифов»">
  <p class="announce-t"><a href="/ab/">${ANNOUNCE.title}</a>: ранний доступ в конце января, 3 490 ₽</p>
  <p class="announce-s">Продвинутый A/B на практике: каждый модуль — рабочий ноутбук, каждая задача — на\u00a0данных и\u00a0со\u00a0сверкой с\u00a0эталоном.</p>
  <p class="ctas"><a class="btn ghost" href="${ANNOUNCE.href}">${ANNOUNCE.cta}</a></p>
</aside>`;
}

function footer(){
  const c = COURSES.filter(x => x.published).map(x => `<li><a href="${x.href}">${x.name}</a><span class="note">${x.status}</span></li>`).join('\n        ');
  return `<footer class="foot" data-chrome>
  <div class="wrap foot-grid">
    <div>
      <h2>Курсы</h2>
      <ul role="list">
        ${c}
      </ul>
    </div>
    <div>
      <h2>Разделы</h2>
      <ul role="list">
        <li><a href="/play/">Игры</a></li>
        <li><a href="/terms/">Словарь аналитика</a></li>
        <li><a href="/shelf/">Полка</a></li>
        <li><a href="/map/">Карта навыков</a></li>
        <li><a href="/start/">С чего начать</a></li>
        <li><a href="/account.html">Мой прогресс</a></li>
      </ul>
    </div>
    <div>
      <h2>Автор</h2>
      <ul role="list">
        <li><a href="/about/">Диля Хакимова</a><span class="note">об авторе</span></li>
        <li><a href="https://github.com/dakhakimova">GitHub</a></li>
        <li hidden><a href="#">Telegram</a></li>
      </ul>
    </div>
    ${announce('foot-ann')}
    <p class="copy">© 2026 Диля Хакимова · Белград</p>
  </div>
</footer>`;
}

// заменить шапку и футер на странице; current — ключ рубрики
function stamp(html, current){
  const cls = (html.match(/<header class="(top[^"]*)"/) || [])[1] || 'top wrap';
  html = html.replace(/<header class="top[^"]*"[^>]*>[\s\S]*?<\/header>(\s*<script>\(function\(\)\{var h=document\.currentScript[\s\S]*?<\/script>)?/, () => header(current).replace('<header class="top wrap"', `<header class="${cls}"`));
  if (/<footer class="foot"/.test(html)) html = html.replace(/<footer class="foot"[^>]*>[\s\S]*?<\/footer>/, footer());
  else html = html.replace(/<\/main>/, '</main>\n' + footer());
  return html;
}

module.exports = {header, footer, announce, stamp, NAV, COURSES};
