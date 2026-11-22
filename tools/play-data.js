/* Общий загрузчик данных /play/: курсы (play/courses.json), игрушки (play/toys-<курс>.json), тексты (i18n/play-<курс>.js)
   и словари сайта. Им пользуются tools/build-play.js, tools/og-play.js, tools/check-play.js, tools/test-play.js.
   Жёсткие ошибки (нет поля, нет карточки в главе, нет картинки…) — исключение с понятным текстом: сборка не пройдёт.
   Стандарт полей — /home/claude/play-guide.md. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HEROES = ['alice', 'bob', 'kot'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Карточки главы по порядку: номер карточки (с 1), data-toy и data-toy-pre каждой.
const chapterCache = {};
function chapterCards(src){
  if (chapterCache[src]) return chapterCache[src];
  const file = path.join(ROOT, src.replace(/^\//, ''));
  if (!fs.existsSync(file)) throw new Error(`play: нет главы ${src}`);
  const html = fs.readFileSync(file, 'utf8'), cards = [];
  const re = /<section class="card"([^>]*)>/g; let m;
  while ((m = re.exec(html))){
    const a = m[1], g = n => ((a.match(new RegExp(n + '="([^"]*)"')) || [])[1] || '').split(/\s+/).filter(Boolean);
    cards.push({n: cards.length + 1, toy: g('data-toy'), pre: g('data-toy-pre'), title: (a.match(/data-title="([^"]*)"/) || [])[1] || ''});
  }
  return (chapterCache[src] = {html, cards, bridge: /<script src="\/play\/bridge\.js/.test(html)});
}

function load(lang = 'ru', {strict = true} = {}){
  const errs = [], warn = [];
  const fail = s => { if (strict) throw new Error('play: ' + s); errs.push(s); };
  // словари сайта и общие строки
  const ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/site.js', 'i18n/play.js']) vm.runInNewContext(read(f), ctx, {filename: f});
  const I18N = ctx.I18N;
  const cfg = JSON.parse(read('play/courses.json'));
  const toys = [], texts = {}, textOwner = {};
  for (const cid of cfg.order){
    const c = cfg.courses[cid];
    if (!['free', 'paid', 'soon'].includes(c.status)) fail(`курс ${cid}: status «${c.status}» — нужно free, paid или soon`);
    // тексты курса: каждый файл в своём контексте, чтобы поймать один slug в двух файлах
    const tctx = {}; tctx.globalThis = tctx;
    vm.runInNewContext(read(c.texts), tctx, {filename: c.texts});
    const T = (tctx.PLAY_TEXT && tctx.PLAY_TEXT[lang]) || {};
    for (const s of Object.keys(T)){
      if (textOwner[s]) fail(`тексты «${s}» есть и в ${textOwner[s]}, и в ${c.texts}`);
      textOwner[s] = c.texts; texts[s] = T[s];
    }
    const list = JSON.parse(read(c.toys));
    if (list.course !== cid) fail(`${c.toys}: course «${list.course}», а ожидается «${cid}»`);
    for (const t of list.toys) toys.push(Object.assign({course: cid, file: c.toys}, t));
  }
  const seen = new Set();
  for (const t of toys){
    const s = t.slug, where = `${t.file} → ${s}`;
    if (!/^[a-z0-9-]{1,40}$/.test(s || '')) { fail(`${where}: slug — латиница, цифры, дефис`); continue; }
    if (seen.has(s)) fail(`slug «${s}» повторяется`); seen.add(s);
    if (!cfg.courses[t.course].dir || !t.src || !t.src.startsWith(cfg.courses[t.course].dir)) fail(`${where}: src должен быть главой курса (${cfg.courses[t.course].dir}…)`);
    let ch;
    try { ch = chapterCards(t.src); } catch(e) { fail(`${where}: ${e.message}`); continue; }
    const card = ch.cards.find(c => c.toy.includes(s));
    if (!card) { fail(`${where}: в ${t.src} нет карточки data-toy="${s}"`); continue; }
    if (ch.cards.filter(c => c.toy.includes(s)).length > 1) warn.push(`${where}: data-toy="${s}" у нескольких карточек — покажутся все`);
    if (!ch.bridge) fail(`${where}: в <head> ${t.src} не подключён /play/bridge.js`);
    t.card = card.n; t.cardTitle = card.title;
    t.pre = ch.cards.filter(c => c.pre.includes(s)).map(c => c.n);
    t.step = +((t.src.match(/\/(\d+)-[^/]+$/) || [])[1] || 0);
    if (!t.step) fail(`${where}: из имени главы не понять номер шага (ждём …/07-name.html)`);
    if (![1, 2, 3].includes(t.level)) fail(`${where}: level — 1, 2 или 3`);
    if (!(t.h >= 300 && t.h <= 4000)) fail(`${where}: h — примерная высота игрушки в px, 300…4000`);
    if (typeof t.img !== 'string') fail(`${where}: img — путь к картинке или "" (пусто)`);
    else if (t.img && !fs.existsSync(path.join(ROOT, t.img.replace(/^\//, '')))) fail(`${where}: нет файла картинки ${t.img}`);
    if (!Array.isArray(t.act) || !t.act.length || !t.act.every(require('./play-act.js').actOk)) fail(`${where}: act — список шагов первого касания (тест и OG-картинка): селекторы или {sel, color | at} для точки на холсте, см. tools/play-act.js`);
    if (t.more && (!Array.isArray(t.more) || t.more.length > 3)) fail(`${where}: more — до трёх slug`);
    // тексты
    const x = texts[s];
    if (!x) { fail(`${where}: нет текстов в ${cfg.courses[t.course].texts}`); continue; }
    if (textOwner[s] !== cfg.courses[t.course].texts) fail(`${where}: тексты лежат в ${textOwner[s]}, а курс — ${t.course}`);
    const str = k => { if (typeof x[k] !== 'string' || !x[k].trim()) fail(`${s}: нет текста «${k}»`); };
    ['q', 'lead', 'out', 'challenge', 'src', 'next'].forEach(str);
    if (t.img) str('imgAlt');
    if (!Array.isArray(x.chat) || x.chat.length < 3 || x.chat.length > 6) fail(`${s}: chat — от 3 до 6 реплик`);
    else x.chat.forEach((r, i) => { if (!Array.isArray(r) || !HEROES.includes(r[0]) || typeof r[1] !== 'string' || !r[1].trim()) fail(`${s}: chat[${i}] — ['alice' | 'bob' | 'kot', 'реплика']`); });
    if (!Array.isArray(x.what) || x.what.length < 1 || x.what.length > 2) fail(`${s}: what — 1–2 абзаца`);
    if (!Array.isArray(x.try) || x.try.length < 2 || x.try.length > 3) fail(`${s}: try — 2–3 задания`);
    if (!Array.isArray(x.cheat) || x.cheat.length > 5) fail(`${s}: cheat — до 5 пунктов (можно [])`);
    if (typeof x.next === 'string' && !x.next.includes('{href}')) fail(`${s}: next — со ссылкой <a href="{href}">…</a> на шаг`);
  }
  for (const s of Object.keys(texts)) if (!seen.has(s)) warn.push(`тексты «${s}» (${textOwner[s]}) без записи в play/toys-*.json — на /play/ не попадут`);
  return {ROOT, I18N, cfg, toys, texts, errs, warn, chapterCards};
}

module.exports = {load, chapterCards, ROOT, HEROES};
