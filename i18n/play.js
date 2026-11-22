/* Общие строки страниц-игр /play/ и каталога /play/index.html (шапка и футер — из i18n/site.js, уровни — lvl.1…3 оттуда же).
   Тексты самих игр — по курсам, чтобы их можно было писать параллельно:
     i18n/play-vp.js — «Вероятность на пальцах», i18n/play-ss.js — «Сигнал или шум», i18n/play-ab.js — «A/B на пальцах».
   Свойства игр (глава, уровень, картинка…) — play/toys-vp.json, play/toys-ss.json, play/toys-ab.json; курсы и их статус — play/courses.json.
   Стандарт полей и текстов — /home/claude/play-guide.md. После правки: node tools/bake-i18n.js (соберёт и /play/). */
(function (root) {
const I18N = root.I18N = root.I18N || {};

I18N.ru = Object.assign(I18N.ru || {}, {
  'play.meta.title': 'Симуляторы по вероятности, статистике и A/B — игры онлайн · Диля Хакимова',
  'play.meta.desc': 'Интерактивные игры по вероятности, статистике и A/B: одна идея, один-два ползунка. Сначала угадай, потом проверь.',
  'play.title': 'Игры',
  'play.lead': 'Одна идея, один-два ползунка. Сначала угадай, потом проверь.',
  'play.legend': 'Уровень:',
  'play.from': 'из курса',
  'play.go': 'Сыграй →',
  'play.scene': 'Сцена',
  'play.what': 'Что здесь происходит',
  'play.tryQ': 'Попробуй ответить сам',
  'play.out': 'Почему так',
  'play.locked': 'Решение откроется, когда сыграешь.',
  'play.showOut': 'Показать решение',
  'play.cheat': 'Шпаргалка',
  'play.src': 'Откуда идея',
  'play.share': 'Поделиться',
  'play.copied': 'Ссылка скопирована',
  'play.embed': 'Вставить в статью или на сайт',
  'play.embedNote': 'Код iframe: игра подстроит высоту сама, если подключить и скрипт. На Хабре iframe не работает — там вставь GIF или картинку и ссылку на эту страницу.',
  'play.frame': 'Игра',
  'play.noframe': 'Игра не загрузилась? <a href="{href}">Открой её в курсе</a>.',
  'play.all': 'Все игры',
  'play.crumbs': 'Игры',
  'play.more': 'Ещё по теме',
  'play.sim': 'симулятор',
  'play.filter': 'Тема',
  'play.filter.all': 'Все темы',
  'play.next': 'Дальше в курсе',
  'play.course': 'Весь курс',
  'play.hero.bob': 'Боб, продакт',
  'play.hero.alice': 'Алиса, аналитик',
  'play.hero.kot': 'Котейка',
  'play.unit.step': 'шаг',
  'play.unit.chapter': 'глава',
  // подпись под игрой (видна и в ?embed=1): «Игра из курса „…“, шаг 7 — dilyakhakimova.com · бесплатный курс — …»
  'play.credit': 'Игра из курса «{course}», <a href="{href}" target="{target}" rel="noopener">{unit}&nbsp;{n}</a> — dilyakhakimova.com',
  // ---------- статус курса: формулировки для play/courses.json → status (единственное место, где их менять) ----------
  // badge — подпись под игрой и значок в «Дальше в курсе» и каталоге; cta — кнопка в «Дальше в курсе»;
  // anchor — куда ведёт кнопка и подпись, если курс не бесплатный (якорь на лендинге курса; у free — сама глава).
  'play.status.free.badge': 'бесплатный курс — начни сразу, без регистрации',
  'play.status.free.cta': 'Открыть {unit} {n} →',
  'play.status.free.anchor': '',
  'play.status.soon.badge': 'скоро, лист ожидания',
  'play.status.soon.cta': 'Записаться в лист ожидания →',
  'play.status.soon.anchor': '#waitlist',
  'play.status.paid.badge': 'платный курс',
  'play.status.paid.cta': 'Подробнее о курсе →',
  'play.status.paid.anchor': '',
});

I18N.en = Object.assign(I18N.en || {}, {
  'play.title': 'Toys',
});
})(typeof window !== 'undefined' ? window : globalThis);
