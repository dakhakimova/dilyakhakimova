#!/usr/bin/env node
/* Проверка данных и текстов игрушек /play/ без браузера — быстро, запускать после каждой правки.
     node tools/check-play.js            — все курсы
     node tools/check-play.js ab         — один курс (vp | ss | ab)
     node tools/check-play.js peeking    — одна игрушка
   ОШИБКА — сборка не пройдёт (то же проверяет tools/build-play.js). ВНИМАНИЕ — нарушение стандарта текстов
   (/home/claude/play-guide.md, §3): исправить или осознанно оставить. Код выхода 1, если есть ошибки. */
const {load} = require('./play-data.js');
const D = load('ru', {strict: false});
const arg = process.argv[2];
const pick = D.toys.filter(t => !arg || t.course === arg || t.slug === arg);
const W = [], plain = s => String(s).replace(/<[^>]+>/g, '');
const warn = (s, m) => W.push(`  ВНИМАНИЕ ${s}: ${m}`);

// эвристики стандарта (§3 гайда)
const CYR = '[а-яё]';
const VY = new RegExp(`(?<!${CYR})(вы|вас|вам|вами|ваш|ваша|ваше|ваши|вашего|вашей|ваших|вашим|сделайте|попробуйте|нажмите|посмотрите|запишите|угадайте|проверьте)(?!${CYR})`, 'i');
const FORMULA = /[=√Σ^∑≈±·]|\bP\(|\bSE\b|\bσ\b|\d\s*\/\s*\d/;
const INFOBIZ = /(успей|только сегодня|секрет|лайфхак|гарантир|без воды|прокачай|топ-\d|ты удивишься|никто не расскажет|шок|срочно|бесплатный вебинар|марафон|ошибк\w* на миллион)/i;
const SCARE = /(уволят|увольн|катастроф|провал|опасн|страшн|позор|потеряешь деньги)/i;
const COMPANIES = /(яндекс|yandex|ozon|озон|авито|avito|сбер|тинькофф|т-банк|wildberries|вайлдберриз|самокат|купер|delivery club|google|гугл|amazon|netflix|booking|microsoft|uber|airbnb|meta\b|facebook|linkedin|spotify)/i;
const STRAIGHT = /"|(?<=\s)-(?=\s)/;
const COURSEREF = /(на следующей карточке|на прошлой карточке|в этой главе|в этом шаге|жми «далее»|как мы видели)/i;
const LIM = {q: 80, lead: 170, out: 650, challenge: 280, src: 260, next: 330, imgAlt: 160};

for (const t of pick){
  const x = D.texts[t.slug]; if (!x) continue;
  const s = t.slug;
  for (const [k, n] of Object.entries(LIM)) if (typeof x[k] === 'string' && plain(x[k]).length > n) warn(s, `${k} длиннее ${n} знаков (${plain(x[k]).length})`);
  if (x.q && !/\?$/.test(plain(x.q).trim())) warn(s, 'q — заголовок-вопрос, должен кончаться «?»');
  (x.chat || []).forEach(([who, say], i) => {
    if (plain(say).length > 230) warn(s, `chat[${i}] длинная реплика (${plain(say).length} > 230): в чате реплики короткие`);
    if (FORMULA.test(plain(say))) warn(s, `chat[${i}] похоже на формулу или обозначение — в диалоге без формул`);
  });
  if (x.chat && !x.chat.some(r => r[0] === 'alice')) warn(s, 'в сцене нет Алисы — вопрос обычно ставит или проверяет аналитик');
  (x.what || []).forEach((p, i) => { if (plain(p).length > 600) warn(s, `what[${i}] длиннее 600 знаков`); });
  (x.try || []).forEach((p, i) => { if (plain(p).length > 150) warn(s, `try[${i}] длиннее 150 знаков`); });
  (x.cheat || []).forEach((p, i) => { if (plain(p).length > 160) warn(s, `cheat[${i}] длиннее 160 знаков`); });
  const all = Object.entries(x).filter(([k]) => k !== 'src').map(([k, v]) => [k, Array.isArray(v) ? v.flat().join(' ') : String(v)]);
  for (const [k, v] of all){
    const p = plain(v);
    if (VY.test(p)) warn(s, `${k}: обращение на «вы» («${p.match(VY)[0]}») — на сайте на «ты»`);
    if (INFOBIZ.test(p)) warn(s, `${k}: интонация инфобизнеса («${p.match(INFOBIZ)[0]}»)`);
    if (SCARE.test(p)) warn(s, `${k}: запугивание? («${p.match(SCARE)[0]}»)`);
    if (COMPANIES.test(p)) warn(s, `${k}: название компании («${p.match(COMPANIES)[0]}») — примеры только из мира кафе; реальный кейс — только общеизвестный, публичный и с источником в src`);
    if (STRAIGHT.test(p)) warn(s, `${k}: прямые кавычки или дефис вместо тире — «ёлочки» и « — »`);
    if (COURSEREF.test(p)) warn(s, `${k}: отсылка к устройству курса («${p.match(COURSEREF)[0]}») — страница игрушки читается без курса`);
  }
  if (x.challenge && !/(продакт|аналитик|отчёт|тест|дашборд|метрик|эксперимент|команд|релиз|коллег|A\/B|A\/A)/i.test(plain(x.challenge))) warn(s, 'challenge не про рабочую ситуацию аналитика (нет «тест», «отчёт», «продакт», «метрика»…)');
  if (!t.img) warn(s, 'img пустой — проверь, что промпт для картинки записан в /home/claude/play-image-prompts.md');
  const ch = D.chapterCards(t.src);
  if (!t.pre.length && /data-key=|class="guess"|class="choice"/.test(cardHtml(ch.html, t.card))) {} // прогноз внутри карточки — ок
  if (!t.pre.length && !/class="guess|class="choice|data-key=/.test(cardHtml(ch.html, t.card))) warn(s, 'нет прогноза: ни data-toy-pre, ни догадки в самой карточке — проверь, есть ли в главе «сначала угадай»');
}
function cardHtml(html, n){ const parts = html.split(/<section class="card"/); return parts[n] || ''; }

const errs = D.errs.filter(e => !arg || e.includes(arg) || !/→|:/.test(e) || pick.some(t => e.includes(t.slug)));
console.log(`Игрушек: ${pick.length}${arg ? ' (' + arg + ')' : ''}`);
errs.forEach(e => console.log('  ОШИБКА ' + e));
D.warn.filter(w => !arg || pick.some(t => w.includes(t.slug)) || w.includes('без записи')).forEach(w => console.log('  ВНИМАНИЕ ' + w));
W.forEach(w => console.log(w));
if (!errs.length && !W.length) console.log('  OK');
process.exit(errs.length ? 1 : 0);
