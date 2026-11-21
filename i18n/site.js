/* Общие строки лендингов курсов: шапка, крошки, статусы, светофор, заголовки секций, «как устроен курс», лист ожидания, футер.
   Подключается на /probability/, /stats/, /ab/, /causal/ перед словарём страницы. У главной свой словарь i18n/home.js.
   Русский — эталон: у ключа, которого нет в другом языке, берётся русский вариант. Значения — HTML (свои, доверенные строки).
   После правки: node tools/bake-i18n.js — он впишет русский текст в разметку страниц. */
(function (root) {
const I18N = root.I18N = root.I18N || {};
/* Типограф для русского: неразрывный пробел после коротких предлогов, союзов и частиц, между числом и словом
   и перед тире. Работает только по тексту вне HTML-тегов. Тот же, что в i18n/home.js. */
const SHORT = 'в|и|к|с|о|у|а|я|на|не|ни|по|за|из|от|до|но|же|ли|бы|во|со|ко|об|для|без|при|или|что|как|под|над|про';
const RE_SHORT = new RegExp('(^|[\\s(«„> ])(' + SHORT + ')\\s+', 'gi');
I18N.typo = I18N.typo || function (lang, str){
  if (lang !== 'ru' || typeof str !== 'string') return str;
  return str.split(/(<[^>]+>)/).map(part => part.startsWith('<') ? part : part
    .replace(RE_SHORT, '$1$2 ').replace(RE_SHORT, '$1$2 ')
    .replace(/(\d)\s+(?=[A-Za-zА-Яа-яЁё%×₽])/g, '$1 ')
    .replace(/\s+—/g, ' —')).join('');
};

I18N.ru = Object.assign(I18N.ru || {}, {
  'skip': 'К содержанию',
  'logo': '<i>Диля</i> Хакимова',
  'nav.label': 'Разделы сайта',
  'nav.courses': 'Курсы',
  'nav.play': 'Игрушки',
  'nav.read': 'Статьи',
  'nav.about': 'Об авторе',
  'nav.login': 'Войти',
  'nav.lang': 'English',
  'crumbs.label': 'Где ты на сайте',
  'crumbs.courses': 'Курсы',
  'soon': 'скоро',
  'free': 'бесплатно',
  'paid': 'платно',
  'later': 'позже',
  'lvl.1': 'на пальцах',
  'lvl.2': 'для практика',
  'lvl.3': 'под капотом',
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
  'how.book.d': 'Короткие карточки: история с героями, игрушка «сначала угадай, потом проверь», правило формулой и задача. Работает и на телефоне.',
  'how.nb.t': 'Рабочие ноутбуки',
  'how.nb.d': 'К каждому модулю — ноутбук, который можно запустить на своих данных. Задача → свой анализ → сверка с эталоном → разбор типичных ошибок.',
  'how.video.t': 'Короткие ролики-разборы',
  'how.video.d': 'По 5–10 минут на ноутбук: запись экрана и голос — как запустить, что смотреть, где ломается. В ролике-знакомстве с курсом Диля в кадре.',
  'wait.title': 'Лист ожидания',
  'wait.text': 'Запись на платные курсы откроется вместе с Telegram-каналом, он появится скоро. А пока проходи бесплатные курсы: баллы сохранятся и превратятся в скидку.',
  'wait.cta': 'Войти и копить баллы →',
  'foot.courses': 'Курсы',
  'foot.more': 'Ещё',
  'foot.c.prob': 'Вероятность на пальцах — скоро',
  'foot.c.sig': 'Сигнал или шум',
  'foot.c.ab': 'A/B на пальцах',
  'foot.c.st': 'Прикладная статистика для аналитика — скоро',
  'foot.c.abm': 'A/B без мифов — скоро',
  'foot.c.cau': 'Курс по причинности — позже',
  'foot.habr': 'Статья на Хабре',
  'foot.gh': 'GitHub',
  'foot.copy': '© 2026 Диля Хакимова · Белград',
  'foot.kot': 'Котейка спит в мешке'
});

I18N.en = Object.assign(I18N.en || {}, {
  'skip': 'Skip to content',
  'logo': '<i>Dilya</i> Khakimova',
  'nav.courses': 'Courses',
  'nav.play': 'Toys',
  'nav.read': 'Articles',
  'nav.about': 'About',
  'nav.login': 'Log in',
  'nav.lang': 'Русский',
  'crumbs.courses': 'Courses',
  'soon': 'soon',
  'free': 'free',
  'paid': 'paid',
  'later': 'later',
  'lvl.1': 'by hand',
  'lvl.2': 'for practitioners',
  'lvl.3': 'under the hood',
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
