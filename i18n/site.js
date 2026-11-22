/* Общие строки лендингов курсов: шапка, крошки, статусы, светофор, заголовки секций, «как устроен курс», лист ожидания, футер.
   Подключается на /probability/, /stats/, /ab/, /causal/ перед словарём страницы. У главной свой словарь i18n/home.js.
   Русский — эталон: у ключа, которого нет в другом языке, берётся русский вариант. Значения — HTML (свои, доверенные строки).
   После правки: node tools/bake-i18n.js — он впишет русский текст в разметку страниц. */
(function (root) {
const I18N = root.I18N = root.I18N || {};
/* Типограф для русского: неразрывный пробел после коротких предлогов, союзов и частиц, между числом и словом
   (знак % — вплотную к числу), перед тире и между разрядами («10 000»). Работает только по тексту вне HTML-тегов. Тот же, что в i18n/home.js. */
const SHORT = 'в|и|к|с|о|у|а|я|на|не|ни|по|за|из|от|до|но|во|со|ко|об|для|без|при|или|что|как|под|над|про';
const RE_SHORT = new RegExp('(^|[\\s(«„> ])(' + SHORT + ')[ \\t\\r\\n]+', 'gi');
// частицы «же», «ли», «бы» держатся за предыдущее слово: «был бы», «так же», «нужно ли»
const RE_PART = /([А-Яа-яЁё0-9»)])[ \t\r\n]+(же|ли|бы)(?=[\s.,:;!?…»)]|$)/g;
// вложенные кавычки: «… „…“ …» (по всей строке, теги пропускаем; несбалансированную строку не трогаем)
const nestQuotes = s => {
  let d = 0, ok = true, out = '';
  for (const part of s.split(/(<[^>]+>)/)){
    if (part.startsWith('<')){ out += part; continue; }
    for (const ch of part){
      if (ch === '«'){ d++; out += d > 1 ? '„' : '«'; }
      else if (ch === '»'){ out += d > 1 ? '“' : '»'; d--; if (d < 0) ok = false; }
      else out += ch;
    }
  }
  return ok && d === 0 ? out : s;
};
I18N.typo = I18N.typo || function (lang, str){
  if (lang !== 'ru' || typeof str !== 'string') return str;
  return nestQuotes(str).split(/(<[^>]+>)/).map(part => part.startsWith('<') ? part : part
    .replace(RE_SHORT, '$1$2 ').replace(RE_SHORT, '$1$2 ')
    .replace(RE_PART, '$1 $2')
    .replace(/(^|[\s(«„ ])([А-ЯЁ]\.)\s*([А-ЯЁ]\.)\s+(?=[А-ЯЁ][а-яё])/g, '$1$2 $3 ')  // инициалы: «А. Н. Колмогоров»
    .replace(/(^|[\s(«„ ])([А-ЯЁ]\.)\s+(?=[А-ЯЁ][а-яё]{2,})/g, '$1$2 ')
    .replace(/(\d)(?:\s|&nbsp;)+%/g, '$1%')  // проценты вплотную: «90%», «0.05%» (решение Дили)
    .replace(/(\d)\s+(?=[A-Za-zА-Яа-яЁё×₽])/g, '$1 ')
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1 ')  // разряды: «10 000», «1 000 000» (четырёхзначные не группируем)
    .replace(/\s+—/g, ' —')  // тире не начинает строку
    .replace(/\s+·(?=\s)/g, ' ·')).join('');  // «·» между вариантами: неразрывный пробел перед ней
};

I18N.ru = Object.assign(I18N.ru || {}, {
  'skip': 'К содержанию',
  'logo': '<i>Диля</i> Хакимова',
  'nav.label': 'Разделы сайта',
  'nav.courses': 'Курсы',
  'nav.play': 'Игры',
  'nav.read': 'Полка',
  'nav.about': 'Об авторе',
  'nav.map': 'Карта навыков',
  'maplink': 'Где этот курс на карте навыков →',
  'tagline': 'Вероятность, статистика и A/B — в играх и задачах',
  'nav.progress': 'Мой прогресс',
  'nav.lang': 'English',
  'crumbs.label': 'Где ты на сайте',
  'crumbs.courses': 'Курсы',
  'soon': 'в курсе',
  'free': 'бесплатно',
  'paid': 'платно',
  'later': 'позже',
  'soon.w27': 'в работе',
  'soon.st': 'скоро',
  // цена «A/B без мифов» — одна на сайт; Диля ещё подтвердит сумму
  'price.paid': '4&nbsp;900&nbsp;₽',   // цена платного курса — одна на все карточки
  'soon.abm': 'скоро',
  'plan': 'позже',
  'notify': 'Сообщить о старте',
  'notifyNote': 'Сроки и промокод за пройденный бесплатный курс — на странице курса.',
  'lvl.1': 'Начальный',
  'lvl.2': 'Средний',
  'lvl.3': 'Продвинутый',
  'lvl.word': 'Уровень',
  'lvl.d1': 'без формул на входе, с нуля',
  'lvl.d2': 'немного формул и кода',
  'lvl.d3': 'математика, статьи, симуляции',
  'lvl.label': 'Уровень',
  'ph.prefix': 'Здесь будет картинка',
  'toy.try': 'Попробовать →',
  'sec.modules': 'Что будет в курсе',
  'sec.toys': 'Во что поиграем и что покрутим',
  'sec.results': 'Что получишь на выходе',
  'sec.who': 'Для кого и что нужно знать заранее',
  'sec.next': 'Куда дальше',
  'sec.how': 'Как устроен курс',
  'how.book.t': 'Интерактивная книга',
  'how.book.d': 'Короткие карточки: история с героями, игра «сначала угадай, потом проверь», правило формулой и задача. Работает и на телефоне.',
  'how.nb.t': 'Рабочие ноутбуки',
  'how.nb.d': 'К каждому модулю — ноутбук, который можно запустить на своих данных. Задача → свой анализ → сверка с эталоном → разбор типичных ошибок.',
  'how.video.t': 'Короткие ролики-разборы',
  'how.video.d': 'По 5–10 минут на ноутбук: запись экрана и голос — как запустить, что смотреть, где ломается. В ролике-знакомстве с курсом Диля в кадре.',
  'wait.title': 'Старт курсов',
  'wait.text': '«A/B без мифов» стартует скоро; «Прикладная статистика для аналитика» — весной 2027. Пройди любой бесплатный курс до&nbsp;конца — промокод на&nbsp;20% появится в&nbsp;«Моём прогрессе».',
  'wait.cta': '<a href="/account.html">Мой прогресс</a> — пройденные курсы и промокоды',
  'points.line': 'Пройди любой бесплатный курс до конца — промокод на {pct:0.2} на платный. Ответы могут быть любыми, важно дойти. <a href="/account.html#terms">Условия →</a>',
  'points.head': 'Пройди любой бесплатный курс до конца — промокод на {pct:0.2} на платный',
  'points.cond': 'Ответы могут быть любыми, важно дойти. За каждый пройденный курс — свой промокод. <a href="/account.html#terms">Условия →</a>',
  'foot.courses': 'Курсы',
  'foot.more': 'Ещё',
  'foot.terms': 'Словарь аналитика',
  'foot.c.prob': 'Вероятность на пальцах',
  'foot.c.sig': 'Сигнал или шум',
  'foot.c.ab': 'A/B на пальцах',
  'foot.c.st': 'Прикладная статистика для аналитика',
  'foot.c.abm': 'A/B без мифов',
  'foot.c.cau': 'Causal inference',
  'foot.books': 'Котейка читает',
  'foot.habr': '10 мифов об A/B-тестировании (Хабр)',
  'foot.gh': 'GitHub',
  'foot.copy': '© 2026 Диля Хакимова · Белград',
  'foot.kot': 'Котейка спит в мешке'
});

I18N.en = Object.assign(I18N.en || {}, {
  'skip': 'Skip to content',
  'logo': '<i>Dilya</i> Khakimova',
  'nav.courses': 'Courses',
  'nav.play': 'Games',
  'nav.read': 'Articles',
  'nav.about': 'About',
  'nav.map': 'Skill map',
  'nav.progress': 'My progress',
  'tagline': 'Probability, statistics and A/B — through toys and problems',
  'nav.lang': 'Русский',
  'crumbs.courses': 'Courses',
  'soon': 'soon',
  'free': 'free',
  'paid': 'paid',
  'later': 'later',
  'lvl.1': 'Beginner',
  'lvl.2': 'Intermediate',
  'lvl.3': 'Advanced',
  'lvl.word': 'Level',
  'notify': 'Notify me',
  'sec.modules': 'What’s inside',
  'sec.toys': 'Toys to play with',
  'sec.results': 'What you’ll walk away with',
  'sec.who': 'Who it’s for and what to know first',
  'sec.next': 'What’s next',
  'sec.how': 'How the course works',
  'wait.title': 'Waitlist',
  'foot.courses': 'Courses',
  'foot.more': 'More',
  'foot.copy': '© 2026 Dilya Khakimova · Belgrade'
});
})(typeof window !== 'undefined' ? window : globalThis);
