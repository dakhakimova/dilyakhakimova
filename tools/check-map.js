#!/usr/bin/env node
/* Проверка карты навыков map/skills.json.
   node tools/check-map.js          — проверить: id, ссылки, циклы, пути из бесплатных курсов, параллельные ветки,
                                      маршруты (предпосылки идут раньше), лишние рёбра, адреса игрушек и карточек,
                                      курсы «в планах» (status: planned): без узлов, вне маршрутов, связи и тексты plan.* в i18n/map.js
   node tools/check-map.js --cards  — ещё и вписать в steps настоящее число карточек из страниц шагов
   node tools/check-map.js --street — показать иллюстрацию над схемой, если лежит map/img/street.jpg (снять hidden, вписать src)
   Схема метро (map/metro.js, LAYOUT): станции — настоящие узлы, у каждого курса 2–5 станций и есть главная, линии — маршруты,
   порядок остановок на линии = порядок маршрута, отрезки только под 0/45/90°, станции «строится» — курсы в планах, тексты metro.* есть.
   Маршруты-цели: поля, вход, опора из бесплатных внутри маршрута, каждый курс задет, reaches (маршрут «Глубже» доходит до CI).
   Тест уровня (map/quiz.js): на любых ответах итог — маршрут и навык в нём, тексты quiz.* есть.
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

// тест уровня (map/quiz.js): 5–6 вопросов, у проверок правильный вариант есть среди вариантов; на любых ответах итог — маршрут и навык в нём; тексты quiz.* есть
{
  const vm = require('vm'), ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/site.js', 'i18n/map.js', 'map/quiz.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  const Q = ctx.SkillQuizData, RU = ctx.I18N.ru, need = k => { if (!(k in RU)) err('тест: нет строки ' + k + ' в i18n/map.js'); };
  if (Q.questions.length < 5 || Q.questions.length > 6) err('тест: вопросов ' + Q.questions.length + ', нужно 5–6');
  ['quiz.title', 'quiz.lead', 'quiz.go', 'quiz.of', 'quiz.next', 'quiz.back', 'quiz.finish', 'quiz.right', 'quiz.wrong', 'quiz.dunno',
   'quiz.res.goal', 'quiz.res.start', 'quiz.res.note', 'quiz.show', 'quiz.again', 'quiz.open', 'quiz.wait'].forEach(need);
  if (!/ориентир/.test(RU['quiz.res.note'] || '') || !/любого места/.test(RU['quiz.res.note'] || '')) err('тест: в итоге нет оговорки «это ориентир, а не экзамен; можно начать с любого места»');
  for (const q of Q.questions){
    need('quiz.' + q.id + '.q');
    q.opts.filter(o => o !== 'dunno').forEach(o => need('quiz.' + q.id + '.' + o));
    if (q.right){ if (!q.opts.includes(q.right)) err('тест: у ' + q.id + ' правильного варианта нет среди вариантов'); need('quiz.' + q.id + '.why'); }
  }
  const role = Q.questions.find(q => !q.right), checks = Q.questions.filter(q => q.right), goals = new Set();
  if (!role) err('тест: нет вопроса «что ты делаешь с данными»');
  else for (const ro of role.opts) for (let m = 0; m < 1 << checks.length; m++){
    const ans = {[role.id]: ro};
    checks.forEach((q, i) => { ans[q.id] = m >> i & 1 ? q.right : 'dunno'; });
    const res = Q.result(ans), r = M.routes.find(x => x.id === res.goal);
    if (!r) { err('тест: итог ' + JSON.stringify(ans) + ' — нет маршрута ' + res.goal); continue; }
    if (!r.nodes.includes(res.start)) err('тест: итог ' + JSON.stringify(ans) + ' — навыка ' + res.start + ' нет в маршруте ' + r.id);
    goals.add(res.goal);
  }
  goals.forEach(g => need('quiz.why.' + g));
  M.routes.forEach(r => { if (!goals.has(r.id)) warn('тест: ни один набор ответов не ведёт к цели ' + r.id); });
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
    [ln.path, ln.cont || []].forEach(p => p.forEach((x, i) => i && angle(p[i - 1], x, 'линия ' + lid)));
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
  if (img && hidden){
    if (process.argv.includes('--street')){
      html = html.replace(/(<figure[^>]*id="street"[^>]*?)\s+hidden/, '$1').replace(/(<img )data-src="\/map\/img\/street\.jpg"/, '$1src="/map/img/street.jpg"');
      fs.writeFileSync(page, html); console.log('иллюстрация street.jpg: показана');
    } else warn('map/img/street.jpg есть, но блок скрыт: node tools/check-map.js --street');
  }
  if (!img && !hidden) err('иллюстрация: блок #street виден, а файла map/img/street.jpg нет');
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
  if (cnt === null) err(n.id + ': игрушка — нет файла ' + u);
  else if (m && +m[1] > cnt) err(n.id + ': игрушка — карточки ' + m[1] + ' нет (' + cnt + ')');
  if (!isFree(n.id)) err(n.id + ': у платного навыка у игрушки не должно быть адреса');
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
