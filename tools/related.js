/* Общий индекс материалов сайта для блока «Ещё по теме», фильтров по теме и флага published.
   Источники: play/toys-*.json + i18n/play-*.js (игры), terms/terms.json + i18n/terms.js (термины),
   courses/courses.json → chapters (главы), shelf/shelf.json (книги и статьи).
   Открыть материал = поставить published: true в его строке данных и запустить node tools/bake-i18n.js. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const TOPICS = ['Вероятность', 'Статистика', 'A/B', 'Причинность', 'Решения'];
const LEVELS = {1: 'Начальный', 2: 'Средний', 3: 'Продвинутый'};
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

function index(){
  const ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/play-vp.js', 'i18n/play-ss.js', 'i18n/play-ab.js', 'i18n/terms.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  const PT = ctx.PLAY_TEXT.ru, TT = ctx.TERMS_TEXT.ru;
  const toys = [];
  for (const f of ['play/toys-vp.json', 'play/toys-ss.json', 'play/toys-ab.json']) for (const t of J(f).toys)
    toys.push({kind: 'game', slug: t.slug, published: !!t.published, topic: t.topic, level: t.level, href: `/play/${t.slug}/`, title: PT[t.slug].q, line: PT[t.slug].lead});
  const terms = J('terms/terms.json').terms.map(t => ({kind: 'term', slug: t.slug, published: !!t.published, topic: t.topic, href: `/terms/${t.slug}/`, title: TT[t.slug].name, line: TT[t.slug].card}));
  const chapters = J('courses/courses.json').chapters.map(c => Object.assign({kind: 'chapter', published: true, line: `«${c.course}», ${c.unit}`}, c));
  const shelf = J('shelf/shelf.json');
  const books = shelf.books.filter(b => b.review).map(b => ({kind: 'book', slug: b.slug, published: !!b.published, topic: b.topic, href: b.review, title: `«${b.title}»`, line: `${b.author} — разбор «Котейка читает»`}));
  return {toys, terms, chapters, books, articles: shelf.articles, shelfBooks: shelf.books};
}

// по одной игре, термину, главе и книге той же темы (только опубликованные; себя не берём)
function sameTopic(I, topic, selfHref){
  const pickOne = (list, seed) => { const c = list.filter(x => x.published && x.topic === topic && x.href !== selfHref); return c.length ? c[seed % c.length] : null; };
  let seed = 0; for (const ch of selfHref) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return [pickOne(I.toys, seed), pickOne(I.terms, seed), pickOne(I.chapters, seed), pickOne(I.books, seed)].filter(Boolean);
}
const KIND = {game: 'Игра', term: 'Термин', chapter: 'Глава курса', book: 'Книга'};
const GO = {game: 'Сыграть →', term: 'Открыть →', chapter: 'Открыть главу →', book: 'Читать разбор →'};

module.exports = {index, sameTopic, TOPICS, LEVELS, KIND, GO};
