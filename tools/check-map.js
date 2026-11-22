#!/usr/bin/env node
/* Проверка карты навыков map/skills.json.
   node tools/check-map.js          — проверить: id, ссылки, циклы, пути из бесплатных курсов, параллельные ветки,
                                      маршруты (предпосылки идут раньше), лишние рёбра, адреса игр и карточек,
                                      курсы «в планах» (status: planned): без узлов, вне маршрутов, связи и тексты plan.* в i18n/map.js
   node tools/check-map.js --cards  — ещё и вписать в steps настоящее число карточек из страниц шагов
   node tools/check-map.js --street — показать иллюстрацию над схемой, если лежит map/img/street.jpg (снять hidden, вписать src)
   Схема метро (map/metro.js, LAYOUT): станции — настоящие узлы, у каждого курса 2–5 станций и есть главная, линии — маршруты,
   порядок остановок на линии = порядок маршрута, отрезки только под 0/45/90°, станции «строится» — курсы в планах, тексты metro.* есть.
   Маршруты-цели: поля, вход, опора из бесплатных внутри маршрута, каждый курс задет, reaches (маршрут «Глубже» доходит до CI).
   «Подобрать маршрут» (/start/): блок «про тебя» и деревья без тупиков, перебор и 200 случайных проходов — не длиннее 14 вопросов, итог — цель и навык в ней.
   Порядок курсов: 1 ВП → 2 СШ → 3 АП → 4 ПС → 5 АБМ → 6 CI — везде одинаковый. Банк задач (map/quiz-bank.json) — навыки и тексты.
   Ошибки — код выхода 1; предупреждения (лишнее ребро, которое и так следует из других) — только печать. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'map/skills.json');
const M = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const errors = [], warns = [];
const err = s => errors.push(s), warn = s => warns.push(s);

const courses = Object.fromEntries(M.courses.map(c => [c.id, c]));
const planned = M.courses.filter(c => c.status === 'planned');
const isPlanned = cid => courses[cid] && courses[cid].status === 'planned';
const nodes = new Map();
for (const n of M.nodes){
  if (nodes.has(n.id)) err('повтор id ' + n.id);
  nodes.set(n.id, n);
  if (!courses[n.course]) err(n.id + ': нет курса ' + n.course);
  if (!M.levels[n.level]) err(n.id + ': нет уровня ' + n.level);
  for (const k of ['label', 'title', 'can']) if (!n[k]) err(n.id + ': пусто поле ' + k);
  if (n.label && n.label.length > 48) warn(n.id + ': label длиннее 48 знаков — на карточке будет тесно');
  for (const s of n.steps || []){
    const st = M.steps[s];
    if (!st) err(n.id + ': нет шага ' + s);
    else if (st.course !== n.course) err(n.id + ': шаг ' + s + ' из другого курса');
  }
  for (const c of n.covers || []) if (!nodes.has(c) && !M.nodes.some(x => x.id === c)) err(n.id + ': covers — нет узла ' + c);
}
for (const c of M.courses){
  if (c.status === 'planned') continue;                       // у курсов «в планах» нет навыков и главного действия
  if (!nodes.has(c.main)) err(c.id + ': главный навык ' + c.main + ' не найден');
  else if (!nodes.get(c.main).main) err(c.id + ': у ' + c.main + ' нет main: true');
}

// термины (terms) у навыков и курсов: непустые строки без повторов; написание — как договорились
{
  const BAD = [[/бутстр[еэ]п/i, 'бутстрап'], [/поправк\S* на множественность/i, 'поправка на множественное тестирование'], [/множественные проверки/i, 'множественное тестирование']];
  const chk = (who, list) => {
    if (list === undefined) return;
    if (!Array.isArray(list) || !list.length) { err(who + ': terms — нужен непустой список'); return; }
    if (new Set(list).size !== list.length) err(who + ': terms — повтор');
    list.forEach(x => { if (typeof x !== 'string' || !x.trim()) err(who + ': terms — пустой термин'); });
  };
  M.nodes.forEach(n => chk(n.id, n.terms)); M.courses.forEach(c => chk(c.id, c.terms));
  const txt = JSON.stringify(M) + fs.readFileSync(path.join(ROOT, 'i18n/map.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'i18n/map-quiz.js'), 'utf8');
  BAD.forEach(([re, ok]) => { const m = txt.match(re); if (m) err('написание: «' + m[0] + '» — пишем «' + ok + '»'); });
}

// рёбра
const ins = new Map(), outs = new Map();
for (const id of nodes.keys()){ ins.set(id, []); outs.set(id, []); }
for (const [a, b] of M.edges){
  if (!nodes.has(a) || !nodes.has(b)){ err('ребро ' + a + ' → ' + b + ': нет узла'); continue; }
  if (a === b) err('петля ' + a);
  outs.get(a).push(b); ins.get(b).push(a);
}
for (const s of M.soft || []) if (!nodes.has(s.from) || !nodes.has(s.to)) err('soft ' + s.from + ' → ' + s.to + ': нет узла');

// циклы: топологическая сортировка (Кан)
const deg = new Map([...ins].map(([k, v]) => [k, v.length]));
const order = [], queue = [...nodes.keys()].filter(k => !deg.get(k));
while (queue.length){ const k = queue.shift(); order.push(k); for (const t of outs.get(k)) { deg.set(t, deg.get(t) - 1); if (!deg.get(t)) queue.push(t); } }
if (order.length !== nodes.size) err('цикл среди: ' + [...nodes.keys()].filter(k => deg.get(k)).join(', '));

const anc = new Map();
function ancestors(id){
  if (anc.has(id)) return anc.get(id);
  const s = new Set(); anc.set(id, s);
  for (const p of ins.get(id)){ s.add(p); for (const q of ancestors(p)) s.add(q); }
  return s;
}
const isFree = id => courses[nodes.get(id).course].status === 'free';

// входы — только в бесплатных курсах; у каждого платного навыка есть путь из бесплатных (курсы «в планах» узлов не имеют — их не проверяем)
for (const id of nodes.keys()){
  if (isPlanned(nodes.get(id).course)) continue;
  if (!ins.get(id).length && !isFree(id)) err(id + ': платный навык без предпосылок — нет пути из бесплатных курсов');
  if (!isFree(id) && ![...ancestors(id)].some(isFree)) err(id + ': нет пути из бесплатных курсов');
}
// параллельная ветка: в её навыки не входят рёбра из других курсов
for (const c of M.courses.filter(c => c.parallel))
  for (const [a, b] of M.edges) if (nodes.get(b).course === c.id && nodes.get(a).course !== c.id) err('параллельный курс ' + c.id + ': ребро снаружи ' + a + ' → ' + b);

// лишние рёбра (транзитивная редукция)
for (const [a, b] of M.edges){
  const other = ins.get(b).filter(p => p !== a);
  if (other.some(p => ancestors(p).has(a))) warn('лишнее ребро ' + a + ' → ' + b + ' (следует из других)');
}

// маршруты: каждая предпосылка — раньше в маршруте, в assumes (с предками) или засчитана через covers
for (const r of M.routes){
  const known = new Set();
  const add = id => { known.add(id); for (const c of nodes.get(id).covers || []){ known.add(c); for (const q of ancestors(c)) known.add(q); } };
  for (const a of r.assumes || []){ if (!nodes.has(a)) { err(r.id + ': assumes — нет ' + a); continue; } add(a); ancestors(a).forEach(add); }
  if (!courses[r.entry]) err(r.id + ': нет курса входа ' + r.entry);
  else if (isPlanned(r.entry)) err(r.id + ': вход в курс «в планах» ' + r.entry);
  const seen = new Set();
  for (const id of r.nodes){
    if (!nodes.has(id)){ err(r.id + ': нет узла ' + id); continue; }
    if (seen.has(id)) err(r.id + ': повтор ' + id);
    if (isPlanned(nodes.get(id).course)) err(r.id + ': ' + id + ' — из курса «в планах», в маршрут не входит');
    seen.add(id);
    for (const p of ins.get(id)) if (!known.has(p)) err('маршрут ' + r.id + ': «' + id + '» раньше своей предпосылки «' + p + '»');
    add(id);
  }
}

// маршруты-цели: поля, вход = курс первого шага, у платных навыков маршрута — бесплатная опора внутри маршрута (в нём или в assumes),
// каждый курс (кроме «в планах») задет хотя бы одним маршрутом, главный навык каждого курса — конечная хотя бы одного маршрута; reaches — дойти до главного навыка курса
{
  const touched = new Set(), mains = new Set();
  for (const r of M.routes){
    for (const k of ['label', 'button', 'for']) if (!r[k]) err('маршрут ' + r.id + ': пусто поле ' + k);
    if (/продакт|аналитик|менеджер|разработчик/i.test(r.label || '')) err('маршрут ' + r.id + ': в названии ролевой ярлык — маршруты называем по цели');
    const ok = r.nodes.filter(id => nodes.has(id));
    if (ok.length && courses[r.entry] && nodes.get(ok[0]).course !== r.entry) err('маршрут ' + r.id + ': вход ' + r.entry + ', а первый шаг из ' + nodes.get(ok[0]).course);
    const base = new Set(ok);
    for (const a of r.assumes || []) if (nodes.has(a)){ base.add(a); ancestors(a).forEach(x => base.add(x)); }
    for (const id of ok){
      touched.add(nodes.get(id).course); mains.add(id);
      if (!isFree(id) && ![...ancestors(id)].some(x => isFree(x) && base.has(x))) err('маршрут ' + r.id + ': у платного «' + id + '» нет опоры из бесплатных в маршруте или в assumes');
    }
    if (r.reaches){
      const c = courses[r.reaches];
      if (!c) err('маршрут ' + r.id + ': reaches — нет курса ' + r.reaches);
      else if (r.nodes[r.nodes.length - 1] !== c.main) err('маршрут ' + r.id + ': должен дойти до «' + c.main + '» (' + c.short + '), а кончается на «' + r.nodes[r.nodes.length - 1] + '»');
    }
  }
  for (const c of M.courses.filter(c => c.status !== 'planned')){
    if (!touched.has(c.id)) err('курс ' + c.id + ': в него не идёт ни один маршрут');
    if (!M.routes.some(r => r.nodes.includes(c.main))) err('курс ' + c.id + ': главный навык ' + c.main + ' не входит ни в один маршрут');
  }
}

// порядок курсов — один везде: 1 «Вероятность на пальцах», 2 «Сигнал или шум», 3 «A/B на пальцах», 4 «Прикладная статистика»,
// 5 «A/B без мифов», 6 Causal inference. Из него выводятся «Весь путь» (route full), «Что в каждом курсе», номера на схеме и в /start/.
{
  const ORDER = ['prob', 'sig', 'ab', 'st', 'abm', 'cau'];
  const real = M.courses.filter(c => c.status !== 'planned').map(c => c.id);
  if (real.join() !== ORDER.join()) err('порядок курсов в skills.json: ' + real.join(' → ') + ', нужно ' + ORDER.join(' → '));
  const full = M.routes.find(r => r.id === 'full');
  if (!full) err('нет цели «Весь путь» (full)');
  else {
    if ((full.path || []).map(p => p.course).join() !== ORDER.join()) err('«Весь путь»: path — ' + (full.path || []).map(p => p.course).join(' → ') + ', нужно ' + ORDER.join(' → '));
    const seen = []; full.nodes.forEach(id => { const c = nodes.get(id) && nodes.get(id).course; if (c && seen[seen.length - 1] !== c) seen.push(c); });
    if (seen.join() !== ORDER.join()) err('«Весь путь»: навыки идут по курсам ' + seen.join(' → '));
    if (M.nodes.some(n => !full.nodes.includes(n.id))) err('«Весь путь» должен включать все навыки');
    (full.path || []).forEach(p => { if (p.optional && !p.why) err('«Весь путь»: у необязательного курса ' + p.course + ' нет why'); });
  }
  if (M.routes[0] && M.routes[0].id !== 'full') err('«Весь путь» — первая цель в routes (вид по умолчанию)');
  // что нужно заранее (prereq) у каждого курса
  for (const c of M.courses.filter(c => c.status !== 'planned')){
    const p = c.prereq;
    if (!p) { err(c.id + ': нет prereq («что нужно заранее»)'); continue; }
    if (!p.none && !(Array.isArray(p.know) && p.know.length)) err(c.id + ': prereq — нужен none или непустой know');
    (p.else || []).concat(p.deeper || []).forEach(x => { if (!courses[x]) err(c.id + ': prereq — нет курса ' + x); });
  }
}

// «Подобрать маршрут» (/start/: start/tree.json + start/start.js + i18n/start.js): блок «про тебя» без тупиков и циклов, все деревья достижимы,
// у каждого пункта есть навыки и тексты (вопрос, подсказка, подпись), полный перебор ответов и 200 случайных проходов — не длиннее 14 вопросов,
// итог — настоящая цель, стартовый навык в ней, личная линия по курсам — в порядке «Весь путь»
{
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/site.js', 'i18n/start.js', 'start/start.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  const E = ctx.SkillStart, RU = ctx.I18N.ru, T = JSON.parse(fs.readFileSync(path.join(ROOT, 'start/tree.json'), 'utf8'));
  const need = k => { if (!(k in RU)) err('/start/: нет строки ' + k + ' в i18n/start.js'); };
  ['st.title', 'st.hello', 'st.time', 'st.go', 'st.back', 'st.next', 'sa.yes', 'sa.heard', 'sa.no', 'sa.unsure', 'sa.check', 'ck.say', 'ck.skip',
   'st.res.title', 'st.res.sum', 'st.res.start', 'st.res.open', 'st.res.map', 'st.res.again', 'st.res.mail', 'st.res.note', 'st.res.tree'].forEach(need);
  if (!/2 минут/.test(RU['st.time'] || '')) err('/start/: в интро должно быть «около 2 минут»');
  if (!/ориентир/.test(RU['st.res.note'] || '') || !/любого места/.test(RU['st.res.note'] || '')) err('/start/: в итоге нет оговорки «ориентир, а не экзамен; начать можно с любого места»');
  for (const [id, it] of Object.entries(T.items)){
    it.skills.forEach(sk => { if (!nodes.has(sk)) err('/start/: пункт ' + id + ' — нет навыка ' + sk); });
    (it.implies || []).forEach(x => { if (!T.items[x]) err('/start/: пункт ' + id + ' — implies: нет пункта ' + x); });
    if (!it.hidden) ['q', 'hint', 'short'].forEach(k => need('sa.' + id + '.' + k));
    (it.answers || []).forEach(a => need('sa.' + a));
  }
  T.check.tasks.forEach(k => { ['q', 'why'].concat(k.opts).forEach(o => need('ck.' + k.id + '.' + o)); if (!k.opts.includes(k.right)) err('/start/: у задачи ' + k.id + ' верного нет среди вариантов'); });
  if (!(T.items[T.check.item].answers || []).includes('check')) err('/start/: у пункта мини-проверки нет варианта «хочу проверить»');
  const A = T.about.qs, reachQ = new Set(), reachB = new Set();
  (function walk(id, trail){
    if (trail.includes(id)) { err('/start/: цикл в блоке «про тебя»: ' + trail.concat(id).join(' → ')); return; }
    const q = A[id]; if (!q) { err('/start/: нет вопроса ' + id); return; }
    reachQ.add(id); need('qz.' + id + '.q'); q.opts.forEach(o => need('qz.' + id + '.' + o.id));
    if (trail.length + 1 > 4) err('/start/: блок «про тебя» длиннее 4 вопросов');
    q.opts.map(o => o.next || q.next).forEach(nx => { if (!nx) err('/start/: тупик после ' + id); else if (nx[0] === '#'){ if (!T.trees[nx.slice(1)]) err('/start/: нет дерева ' + nx); else reachB.add(nx.slice(1)); } else walk(nx, trail.concat(id)); });
  })(T.about.start, []);
  Object.keys(A).forEach(id => { if (!reachQ.has(id)) err('/start/: вопрос ' + id + ' недостижим'); });
  const isRoute = g => M.routes.some(r => r.id === g);
  for (const [bid, tr] of Object.entries(T.trees)){
    if (!reachB.has(bid)) err('/start/: дерево ' + bid + ' недостижимо');
    if (!tr.nodes[tr.start]) err('/start/: у дерева ' + bid + ' нет стартового пункта');
    for (const [it, nd] of Object.entries(tr.nodes)){
      if (!T.items[it] || T.items[it].hidden) err('/start/: дерево ' + bid + ' — нет пункта с вопросом ' + it);
      ['yes', 'no'].forEach(k => { const e = nd[k];
        if (e === undefined) err('/start/: ' + bid + '.' + it + ' — нет ветки ' + k);
        else if (typeof e === 'string'){ if (!tr.nodes[e]) err('/start/: ' + bid + '.' + it + ' → ' + e + ' — нет такого пункта в дереве'); }
        else { if (!isRoute(e.goal)) err('/start/: ' + bid + '.' + it + ' — нет цели ' + e.goal); if (e.also && !isRoute(e.also)) err('/start/: ' + bid + '.' + it + ' — нет цели ' + e.also); need('st.why.' + e.goal); } });
    }
  }
  const abouts = [];
  (function gen(about){ const x = E.aboutNext(T, about); if (x.branch) { abouts.push([JSON.parse(JSON.stringify(about)), x.branch]); return; }
    A[x.q].opts.forEach(o => gen(Object.assign({}, about, {[x.q]: o.id}))); })({});
  const ORDER = ['prob', 'sig', 'ab', 'st', 'abm', 'cau'];
  const check = (about, bid, ans, end, where) => {
    const total = E.aboutPath(T, about).length + ans.length;
    if (total > 14) err('/start/: ' + where + ' — ' + total + ' вопросов, больше 14');
    const R = E.result(T, M, bid, about, ans, end), r = M.routes.find(x => x.id === R.goal);
    if (!r) { err('/start/: ' + where + ' — нет цели ' + R.goal); return; }
    if (!r.nodes.includes(R.start)) err('/start/: ' + where + ' — старт ' + R.start + ' не в цели ' + r.id);
    const seq = R.plan.map(p => ORDER.indexOf(p.course));
    if (seq.some((x, i) => i && x <= seq[i - 1])) err('/start/: ' + where + ' — личная линия не в порядке «Весь путь»: ' + R.plan.map(p => p.course).join(' → '));
    if (!R.plan.some(p => !p.skip && !p.extra) && !R.all) err('/start/: ' + where + ' — в личной линии нет ни одного курса');
  };
  let runs = 0, maxLen = 0;
  const answersOf = it => (T.items[it].answers || ['yes', 'heard', 'no']);
  for (const [about, bid] of abouts){
    (function go(ans){
      const r = E.run(T, bid, ans);
      if (r.end){ runs++; maxLen = Math.max(maxLen, ans.length); check(about, bid, ans, r.end, bid + ' ' + ans.map(h => h.a[0]).join('')); return; }
      if (ans.length > 14) { err('/start/: ' + bid + ' — дерево не заканчивается'); return; }
      answersOf(r.next).forEach(a => {
        if (a === 'check') { go(ans.concat({item: r.next, a, ck: T.check.tasks.map(k => k.right)})); go(ans.concat({item: r.next, a, ck: []})); }
        else go(ans.concat({item: r.next, a}));
      });
    })([]);
  }
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 200; i++){
    const [about, bid] = abouts[Math.floor(rnd() * abouts.length)], ans = [];
    let r, guard = 0;
    while (!(r = E.run(T, bid, ans)).end && guard++ < 30){ const as = answersOf(r.next), a = as[Math.floor(rnd() * as.length)];
      ans.push(a === 'check' ? {item: r.next, a, ck: T.check.tasks.map(k => rnd() < .5 ? k.right : 'dunno')} : {item: r.next, a}); }
    if (!r.end) { err('/start/: случайный проход ' + i + ' не завершился'); continue; }
    check(about, bid, ans, r.end, 'случайный проход ' + i);
  }
  console.log('/start/: деревьев ' + Object.keys(T.trees).length + ', наборов ответов «про тебя» ' + abouts.length + ', полных проходов ' + runs + ' (дерево — до ' + maxLen + ' вопросов), случайных 200');
}

// банк задач (map/quiz-bank.json + i18n/map-quiz.js; сейчас не подключён к страницам): навыки есть, верный вариант среди вариантов,
// тексты есть, верный вариант не всегда самый длинный и не всегда на одном месте
{
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/map-quiz.js'), 'utf8'), ctx);
  const RU = ctx.I18N.ru, B = JSON.parse(fs.readFileSync(path.join(ROOT, 'map/quiz-bank.json'), 'utf8')), Q = B.questions, ids = Object.keys(Q);
  const need = k => { if (!(k in RU)) err('банк задач: нет строки ' + k); };
  let longest = 0; const pos = {};
  for (const id of ids){
    const q = Q[id];
    if (!nodes.has(q.skill)) err('банк задач: у ' + id + ' нет навыка ' + q.skill);
    if (!q.opts.includes(q.right)) err('банк задач: у ' + id + ' верного нет среди вариантов');
    ['q', 'why'].concat(q.opts).forEach(k => need('qz.' + id + '.' + k));
    const len = o => (RU['qz.' + id + '.' + o] || '').length, mx = Math.max(...q.opts.map(len));
    if (len(q.right) === mx && q.opts.filter(o => len(o) === mx).length === 1) longest++;
    pos[q.opts.indexOf(q.right)] = (pos[q.opts.indexOf(q.right)] || 0) + 1;
    if (!Object.values(B.pools).some(p => p.includes(id))) err('банк задач: ' + id + ' не входит ни в один набор');
  }
  Object.entries(B.pools).forEach(([k, p]) => p.forEach(id => { if (!Q[id]) err('банк задач: в наборе ' + k + ' нет ' + id); }));
  if (longest > ids.length / 2) err('банк задач: верный — самый длинный в ' + longest + ' из ' + ids.length);
  if (Object.values(pos).some(v => v > ids.length * 0.45)) err('банк задач: верный слишком часто на одном месте ' + JSON.stringify(pos));
}

// в планах: ни узлов, ни шагов; связи after/near/leads — курс, навык или ext:<ключ>; тексты plan.<id>.* есть в словаре; 3–5 навыков
{
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/site.js', 'i18n/map.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  const RU = ctx.I18N.ru, need = k => { if (!(k in RU)) err('нет строки ' + k + ' в i18n/map.js'); };
  ['plan.title', 'plan.lead', 'plan.tag', 'plan.can', 'plan.after', 'plan.near', 'plan.leads', 'plan.or', 'plan.when'].forEach(need);
  for (const c of planned){
    if (M.nodes.some(n => n.course === c.id)) err(c.id + ': у курса «в планах» не должно быть навыков-узлов');
    if (Object.values(M.steps).some(st => st.course === c.id)) err(c.id + ': у курса «в планах» не должно быть шагов');
    ['title', 'lead'].forEach(k => need('plan.' + c.id + '.' + k));
    const sk = [1, 2, 3, 4, 5, 6].filter(i => ('plan.' + c.id + '.s' + i) in RU).length;
    if (sk < 3 || sk > 5) err(c.id + ': ключевых навыков ' + sk + ', нужно 3–5 (plan.' + c.id + '.s1…)');
    for (const k of ['after', 'near', 'leads']) for (const r of c[k] || []){
      if (r.startsWith('ext:')) need('plan.ext.' + r.slice(4));
      else if (r === c.id) err(c.id + ': связь ' + k + ' на себя');
      else if (!courses[r] && !nodes.has(r)) err(c.id + ': связь ' + k + ' — нет курса или навыка ' + r);
    }
  }
}

// схема метро
{
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/site.js', 'i18n/map.js', 'map/metro.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  const L = ctx.SkillMetroLayout, RU = ctx.I18N.ru, routes = Object.fromEntries(M.routes.map(r => [r.id, r]));
  const need = k => { if (!(k in RU)) err('схема: нет строки ' + k + ' в i18n/map.js'); };
  ['metro.title', 'metro.lead', 'metro.label', 'metro.here', 'metro.start', 'metro.building', 'metro.zoom', 'metro.unzoom', 'metro.pick', 'street.alt'].forEach(need);
  const pt = x => typeof x === 'string' ? (L.stations[x] || L.planned.stations[x]) : x;
  for (const id of Object.keys(L.stations)){ if (!nodes.has(id)) err('схема: станция ' + id + ' — нет такого навыка'); need('metro.st.' + id); }
  for (const c of M.courses.filter(c => c.status !== 'planned')){
    const st = Object.keys(L.stations).filter(id => nodes.has(id) && nodes.get(id).course === c.id);
    if (st.length < 2 || st.length > 5) err('схема: у курса ' + c.id + ' станций ' + st.length + ', нужно 2–5');
    if (!st.includes(c.main)) err('схема: главного навыка ' + c.main + ' нет среди станций');
    if (!L.zones[c.id]) err('схема: нет зоны курса ' + c.id);
  }
  const angle = (a, b, where) => { const A = pt(a), B = pt(b); if (!A || !B) { err('схема: ' + where + ' — нет точки ' + (A ? b : a)); return; }
    const dx = Math.abs(B[0] - A[0]), dy = Math.abs(B[1] - A[1]); if (dx && dy && dx !== dy) err('схема: ' + where + ' — отрезок не под 0/45/90° (' + A + ' → ' + B + ')'); };
  const served = new Set();
  for (const [lid, ln] of Object.entries(L.lines)){
    const r = routes[lid]; if (!r) { err('схема: линия ' + lid + ' — нет маршрута'); continue; }
    need('line.' + lid);
    [ln.path, ln.cont || [], ln.bypass || []].forEach(p => p.forEach((x, i) => i && angle(p[i - 1], x, 'линия ' + lid)));
    (ln.dashed || []).forEach(([a, b]) => { if (!(a >= 0 && b < ln.path.length && a < b)) err('схема: линия ' + lid + ' — пунктир [' + a + ', ' + b + '] вне пути'); });
    if (ln.bypass){ const k = x => JSON.stringify(pt(x)), P = ln.path.map(k); if (!P.includes(k(ln.bypass[0])) || !P.includes(k(ln.bypass[ln.bypass.length - 1]))) err('схема: линия ' + lid + ' — обход должен начинаться и кончаться на пути линии'); }
    const onPath = ln.path.filter(x => typeof x === 'string');
    const stopsSeq = onPath.filter(id => r.nodes.includes(id));
    const want = r.nodes.filter(id => L.stations[id]);
    if (stopsSeq.join() !== want.join()) err('схема: линия ' + lid + ' останавливается ' + stopsSeq.join(' → ') + ', а по маршруту ' + want.join(' → '));
    stopsSeq.forEach(id => served.add(id)); (ln.cont || []).forEach(x => typeof x === 'string' && served.add(x));
  }
  // линия без петель: станция на пути — не больше одного раза; цвет линии на белом — контраст ≥ 3:1
  const lum = hex => { const c = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  for (const [lid, ln] of Object.entries(L.lines)){
    const st = ln.path.filter(x => typeof x === 'string');
    if (new Set(st).size !== st.length) err('схема: линия ' + lid + ' проходит станцию дважды');
    const k = 1.05 / (lum(ln.color) + .05);
    if (k < 3) err('схема: линия ' + lid + ' ' + ln.color + ' — контраст с белым ' + k.toFixed(2) + ':1, нужно ≥ 3:1');
  }
  for (const id of Object.keys(L.stations)) if (!served.has(id)) err('схема: на станции ' + id + ' не останавливается ни одна линия');
  for (const [id, [, , , cid]] of Object.entries(L.planned.stations)) if (!isPlanned(cid)) err('схема: станция «строится» ' + id + ' — курс ' + cid + ' не в планах');
  L.planned.paths.forEach(p => p.forEach((x, i) => i && angle(p[i - 1], x, 'строится')));
  // иллюстрация над схемой
  const page = path.join(ROOT, 'map/index.html'), img = fs.existsSync(path.join(ROOT, 'map/img/street.jpg'));
  let html = fs.readFileSync(page, 'utf8');
  const hidden = /<figure[^>]*id="street"[^>]*\shidden/.test(html);
  if (img && hidden && /id="street"/.test(html)){
    if (process.argv.includes('--street')){
      html = html.replace(/(<figure[^>]*id="street"[^>]*?)\s+hidden/, '$1').replace(/(<img )data-src="\/map\/img\/street\.jpg"/, '$1src="/map/img/street.jpg"');
      fs.writeFileSync(page, html); console.log('иллюстрация street.jpg: показана');
    } else warn('map/img/street.jpg есть, но блок скрыт: node tools/check-map.js --street');
  }
  if (!img && !hidden && /id="street"/.test(html)) err('иллюстрация: блок #street виден, а файла map/img/street.jpg нет');
}

// адреса: шаги существуют, якоря карточек не больше числа карточек
const countCards = url => { const f = path.join(ROOT, url.split('#')[0]); return fs.existsSync(f) ? (fs.readFileSync(f, 'utf8').match(/<section class="card[\s"]/g) || []).length : null; };
const write = process.argv.includes('--cards');
for (const [id, st] of Object.entries(M.steps)){
  if (!st.store) continue;
  const n = countCards(st.url);
  if (n === null) { err('шаг ' + id + ': нет файла ' + st.url); continue; }
  if (st.cards !== n){ (write ? warn : err)('шаг ' + id + ': карточек ' + n + ', в skills.json ' + st.cards); if (write) st.cards = n; }
}
for (const n of nodes.values()){
  const u = n.toy && n.toy.url; if (!u) continue;
  const m = u.match(/#card-(\d+)$/), cnt = countCards(u);
  if (cnt === null) err(n.id + ': игра — нет файла ' + u);
  else if (m && +m[1] > cnt) err(n.id + ': игра — карточки ' + m[1] + ' нет (' + cnt + ')');
  if (!isFree(n.id)) err(n.id + ': у платного навыка у игры не должно быть адреса');
}
if (write) fs.writeFileSync(FILE, JSON.stringify(M, null, 2) + '\n');

const byCourse = M.courses.filter(c => c.status !== 'planned').map(c => c.short + ' ' + M.nodes.filter(n => n.course === c.id).length).join(', ');
console.log('узлов: ' + nodes.size + ' (' + byCourse + '), рёбер: ' + M.edges.length + ', мягких: ' + (M.soft || []).length + ', маршрутов: ' + M.routes.length);
console.log('входы (без предпосылок): ' + order.filter(k => !ins.get(k).length).join(', '));
warns.forEach(w => console.warn('предупреждение: ' + w));
errors.forEach(e => console.error('ОШИБКА: ' + e));
console.log(errors.length ? errors.length + ' ошибок' : 'ок: циклов нет, у каждого платного навыка есть путь из бесплатных, маршруты согласованы'
  + (planned.length ? ', в планах: ' + planned.length + ' (вне графа и маршрутов)' : ''));
process.exit(errors.length ? 1 : 0);
