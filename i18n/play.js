/* Общие строки страниц-игрушек /play/ и каталога /play/index.html (шапка и футер — из i18n/site.js, уровни — lvl.1…3 оттуда же).
   Тексты самих игрушек — по курсам, чтобы их можно было писать параллельно:
     i18n/play-vp.js — «Вероятность на пальцах», i18n/play-ss.js — «Сигнал или шум», i18n/play-ab.js — «A/B на пальцах».
   Свойства игрушек (глава, уровень, картинка…) — play/toys-vp.json, play/toys-ss.json, play/toys-ab.json; курсы и их статус — play/courses.json.
   Стандарт полей и текстов — /home/claude/play-guide.md. После правки: node tools/bake-i18n.js (соберёт и /play/). */
(function (root) {
const I18N = root.I18N = root.I18N || {};

I18N.ru = Object.assign(I18N.ru || {}, {
  'play.meta.title': 'Игрушки по вероятности, статистике и A/B · Диля Хакимова',
  'play.meta.desc': 'Интерактивные игрушки: одна идея, один-два ползунка. Сначала угадай, потом проверь. Можно скинуть коллеге или вставить в статью.',
  'play.title': 'Игрушки',
  'play.lead': 'Одна идея, один-два ползунка. Сначала угадай, потом проверь. Каждую можно скинуть коллеге или вставить в статью.',
  'play.legend': 'Уровень:',
  'play.from': 'из курса',
  'play.go': 'Играть →',
  'play.scene': 'Сцена',
  'play.what': 'Что здесь происходит',
  'play.try': 'Попробуй',
  'play.out': 'Что получилось',
  'play.locked': 'Вывод откроется, когда покрутишь игрушку.',
  'play.cheat': 'Шпаргалка',
  'play.src': 'Откуда идея',
  'play.share': 'Скинуть коллеге',
  'play.copy': 'Скопировать ссылку',
  'play.copied': 'Ссылка скопирована',
  'play.copiedMsg': 'Сообщение со ссылкой скопировано — вставь в чат',
  'play.embed': 'Вставить в статью или на сайт',
  'play.embedNote': 'Код iframe: игрушка подстроит высоту сама, если подключить и скрипт. На Хабре iframe не работает — там вставь GIF или картинку и ссылку на эту страницу.',
  'play.frame': 'Игрушка',
  'play.noframe': 'Игрушка не загрузилась? <a href="{href}">Открой её в курсе</a>.',
  'play.all': 'Все игрушки',
  'play.crumbs': 'Игрушки',
  'play.more': 'Ещё игрушки',
  'play.next': 'Дальше в курсе',
  'play.course': 'Весь курс',
  'play.hero.bob': 'Боб, продакт',
  'play.hero.alice': 'Алиса, аналитик',
  'play.hero.kot': 'Котейка',
  'play.unit.step': 'шаг',
  'play.unit.chapter': 'глава',
  // подпись под игрушкой (видна и в ?embed=1): «Игрушка из курса «…», шаг 7 — dilyakhakimova.com · бесплатный курс — …»
  'play.credit': 'Игрушка из курса «{course}», <a href="{href}" target="{target}" rel="noopener">{unit}&nbsp;{n}</a> — dilyakhakimova.com',
  // ---------- статус курса: формулировки для play/courses.json → status (единственное место, где их менять) ----------
  // badge — подпись под игрушкой и значок в «Дальше в курсе» и каталоге; cta — кнопка в «Дальше в курсе»;
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
