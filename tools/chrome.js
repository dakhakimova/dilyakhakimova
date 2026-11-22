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
];
// курсы в футере и на /courses/: порядок «Весь путь»; published:false — не показываем
const COURSES = JSON.parse(fs.readFileSync(path.join(ROOT, 'courses/courses.json'), 'utf8')).courses;
const TAGLINE = 'Вероятность, статистика и A/B — в играх и задачах', TAGLINE_S = 'Вероятность · статистика · A/B';

// кружок входа: до входа — силуэт Котейки и подсказка «Войти»; после входа (account.html и progress.js кладут
// в localStorage 'dk:me' имя и фото) — фото из Telegram или первая буква имени, aria-label «Мой кабинет».
// Запросов к /api/ шапка не делает (на /play/ и /terms/ их быть не должно).
const ME_JS = `<script>(function(){var a=document.currentScript.previousElementSibling.querySelector('.me');if(!a)return;var m=null;try{m=JSON.parse(localStorage.getItem('dk:me')||'null')}catch(e){}if(!m)return;a.title='Мой кабинет';a.setAttribute('aria-label','Мой кабинет');a.classList.add('in');var i=a.querySelector('.me-i');if(m.photo){var g=new Image();g.alt='';g.src=m.photo;g.onload=function(){i.replaceWith(g)}}else if(m.name){i.className='me-l';i.textContent=m.name.trim().charAt(0).toUpperCase()}})()</script>`;

function header(current = ''){
  const a = ([k, href, label]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="top wrap" data-chrome>
  <a class="home-line" href="/"${current === 'home' ? ' aria-current="page"' : ''}><span class="hl-full">${TAGLINE}</span><span class="hl-short" aria-hidden="true">${TAGLINE_S}</span></a>
  <nav id="site-nav" aria-label="Разделы сайта">
    ${NAV.map(a).join('\n    ')}
  </nav>
  <button class="burger" type="button" aria-expanded="false" aria-controls="site-nav"><span class="vh">Меню</span><span class="burger-i" aria-hidden="true"></span></button>
  <a class="me" href="/account.html" title="Войти" aria-label="Войти"${current === 'account' ? ' aria-current="page"' : ''}><span class="me-i" aria-hidden="true"></span></a>
</header>
<script>(function(){var h=document.currentScript.previousElementSibling,b=h.querySelector('.burger');b.addEventListener('click',function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o)})})()</script>
${ME_JS}`;
}

// анонс платного курса — только на финале /start/ (start.js) и страницах курсов; в контенте и футере не продаём
function announce(cls = ''){
  return `<aside class="announce${cls ? ' ' + cls : ''}" aria-label="Анонс курса «A/B без мифов»">
  <p class="announce-t"><a href="/ab/">«A/B без мифов»</a>: ранний доступ в конце января</p>
</aside>`;
}

function footer(){
  const c = COURSES.filter(x => x.published).map(x => `<li><a href="${x.href}">${x.name}</a>${x.tag === 'free' ? '' : '<span class="note">скоро</span>'}</li>`).join('\n        ');
  return `<footer class="foot" data-chrome>
  <div class="wrap foot-grid">
    <div>
      <h2>Курсы</h2>
      <ul role="list">
        ${c}
      </ul>
    </div>
    <div>
      <h2>Рубрики</h2>
      <ul role="list">
        <li><a href="/play/">Игры</a></li>
        <li><a href="/shelf/">Полка</a></li>
        <li><a href="/terms/">Словарь</a></li>
      </ul>
    </div>
    <div>
      <h2>Автор</h2>
      <ul role="list">
        <li><a href="/about/">Диля Хакимова</a><span class="note">об авторе</span></li>
      </ul>
    </div>
    <p class="copy">© 2026 Диля Хакимова</p>
  </div>
</footer>`;
}

// заменить шапку и футер на странице; current — ключ рубрики
function stamp(html, current){
  const cls = (html.match(/<header class="(top[^"]*)"/) || [])[1] || 'top wrap';
  html = html.replace(/<header class="top[^"]*"[^>]*>[\s\S]*?<\/header>(\s*<script>\(function\(\)\{var h=document\.currentScript[\s\S]*?<\/script>)?(\s*<script>\(function\(\)\{var a=document\.currentScript[\s\S]*?<\/script>)?/, () => header(current).replace('<header class="top wrap"', `<header class="${cls}"`));
  if (/<footer class="foot"/.test(html)) html = html.replace(/<footer class="foot"[^>]*>[\s\S]*?<\/footer>/, footer());
  else html = html.replace(/<\/main>/, '</main>\n' + footer());
  return html;
}

module.exports = {header, footer, announce, stamp, NAV, COURSES};
