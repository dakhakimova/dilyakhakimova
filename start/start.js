/* «Подобрать маршрут» (/start/): пара вопросов про тебя → дерево самооценки «Ты уже знаешь …?» → «Твой маршрут».
   Задач нет; единственная мини-проверка (две задачи по вероятности) — только если на «Байесе» выбрано «хочу проверить».
   Данные: start/tree.json (вопросы, ветвление, навыки), map/skills.json (маршруты, навыки, шаги), map/metro.js (станции для мини-схемы).
   Тексты — i18n/start.js. Ответы и итог — в localStorage (ключ start:plan), только в этом браузере; итог читает карта навыков (map/map.js):
   ставит «ты здесь» на стартовую станцию и отмечает знакомые навыки «знаешь».
   Здесь две части: SkillStart — чистые функции над деревом (их же гоняет tools/check-map.js), и интерфейс страницы. */
(function (root) {
'use strict';
const STORE = 'start:plan', V = 1;

const Engine = {
  // следующий вопрос блока «про тебя» ({q}) или дерево ({branch})
  aboutNext(T, about){
    let id = T.about.start; const seen = new Set();
    for (;;){
      if (seen.has(id)) throw new Error('start: цикл в блоке «про тебя» на ' + id);
      seen.add(id);
      const q = T.about.qs[id], a = about[id];
      if (a === undefined) return {q: id};
      const o = q.opts.find(x => x.id === a), nx = (o && o.next) || q.next;
      if (!nx) throw new Error('start: тупик после ' + id);
      if (nx[0] === '#') return {branch: nx.slice(1)};
      id = nx;
    }
  },
  aboutPath(T, about){
    const p = []; let id = T.about.start;
    while (id && id[0] !== '#'){ p.push(id); const q = T.about.qs[id], a = about[id];
      if (a === undefined) break; const o = q.opts.find(x => x.id === a); id = (o && o.next) || q.next; }
    return p;
  },
  answers: (T, item) => T.items[item].answers || ['yes', 'heard', 'no'],
  passed: (T, h) => h.a === 'check' && Array.isArray(h.ck) && h.ck.length === T.check.tasks.length && T.check.tasks.every((k, i) => h.ck[i] === k.right),
  isYes: (T, h) => h.a === 'yes' || Engine.passed(T, h),
  // пройти дерево по ответам ans = [{item, a, ck?}] → {next: пункт | null, end: {goal, also} | null}
  run(T, bid, ans){
    const tr = T.trees[bid]; let cur = tr.start;
    for (const h of ans){
      const edge = tr.nodes[cur][Engine.isYes(T, h) ? 'yes' : 'no'];
      if (typeof edge !== 'string') return {next: null, end: edge};
      cur = edge;
    }
    return {next: cur, end: null};
  },
  // сколько ещё вопросов дерева может быть: [меньше всего, больше всего]
  range(T, bid, ans){
    let lo = Infinity, hi = 0;
    (function go(a){
      const r = Engine.run(T, bid, a);
      if (r.end){ lo = Math.min(lo, a.length - ans.length); hi = Math.max(hi, a.length - ans.length); return; }
      go(a.concat({item: r.next, a: 'yes'})); go(a.concat({item: r.next, a: 'no'}));
    })(ans);
    return [lo, hi];
  },
  // итог: M — skills.json
  result(T, M, bid, about, ans, end){
    const known = new Set(), heard = new Set();
    const add = (it, seen = new Set()) => { if (seen.has(it)) return; seen.add(it); T.items[it].skills.forEach(s => known.add(s)); (T.items[it].implies || []).forEach(x => add(x, seen)); };
    ans.forEach(h => { if (Engine.isYes(T, h)) add(h.item); });
    ans.forEach(h => { if (!Engine.isYes(T, h) && h.a !== 'no') T.items[h.item].skills.forEach(s => { if (!known.has(s)) heard.add(s); }); });
    const r = M.routes.find(x => x.id === end.goal);
    let start = r.nodes.find(id => !known.has(id)), all = false;
    if (!start){ start = r.nodes[r.nodes.length - 1]; all = true; }
    const i = r.nodes.indexOf(start), gaps = all ? [] : r.nodes.slice(i).filter(id => !known.has(id)).slice(0, 2);
    const last = ans[ans.length - 1], check = ans.find(h => h.a === 'check');
    // личная карта курсов: курсы цели (и второй цели — «по желанию») в порядке «Весь путь»; знакомые — пропускаем, номера — только своим
    const full = M.routes.find(x => x.id === 'full'), also = end.also && end.also !== end.goal ? M.routes.find(x => x.id === end.also) : null;
    const nc = id => M.nodes.find(x => x.id === id).course;
    const mine = r.nodes.concat(also ? also.nodes.filter(id => !r.nodes.includes(id)) : []);
    const marks = {};                                                    // курс → что человек отметил «нет» или «слышал(а)»
    ans.forEach(h => { if (Engine.isYes(T, h)) return; const c = nc(T.items[h.item].skills[0]);     // пункт — к курсу его первого навыка
      (marks[c] = marks[c] || []).push({item: h.item, a: h.a === 'no' || h.a === 'check' ? 'no' : 'heard'}); });
    let k = 0;
    const plan = full.path.filter(p => mine.some(id => nc(id) === p.course)).map(p => {
      const ids = mine.filter(id => nc(id) === p.course), kn = ids.filter(id => known.has(id));
      const extra = !r.nodes.some(id => nc(id) === p.course);
      const skip = kn.length === ids.length;
      return {course: p.course, n: skip || extra ? null : ++k, skip, extra,
        known: kn, marks: (marks[p.course] || []).slice(0, 2)};
    });
    return {v: V, goal: end.goal, plan, nodes: mine, also: end.also && end.also !== end.goal ? end.also : null, start, all, known: [...known], heard: [...heard], gaps,
      path: ans.map(h => ({item: h.item, a: Engine.isYes(T, h) ? 'yes' : h.a === 'check' ? 'check-no' : h.a})), branch: bid, role: about.role || null,
      note: check ? (Engine.passed(T, check) ? null : 'failed') : last && last.a === 'unsure' ? 'unsure' : null};
  }
};
root.SkillStart = Engine;
if (typeof document === 'undefined') return;

// ---------- интерфейс ----------
const LANG = (document.documentElement.lang || 'ru').slice(0, 2);
const I = root.I18N || {}, RU = I.ru || {}, DICT = I[LANG] || {};
const typo = s => I.typo ? I.typo(LANG, s) : s;
const t = (k, v) => typo(String(k in DICT ? DICT[k] : k in RU ? RU[k] : k).replace(/\{(\w+)\}/g, (m, x) => v && x in v ? v[x] : m));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const tx = s => typo(esc(s));
const lower = s => s.charAt(0).toLowerCase() + s.slice(1);
const load = () => { try { const v = JSON.parse(localStorage.getItem(STORE) || 'null'); return v && v.v === V ? v : null; } catch (e) { return null; } };
const save = v => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} };
const fresh = () => ({v: V, stage: 'intro', about: {}, cur: null, ans: [], ck: null, say: null, res: null});
const IMG = {
  intro: ['/probability/img/vp09-02-next.jpg', 'img.intro'],
  check: ['/probability/img/vp09-00-interview.jpg', 'img.check'],
  unsure: ['/probability/img/vp04-02-next.jpg', 'img.unsure'],
  final: ['/map/img/street.jpg', 'img.final']
};

const app = document.getElementById('app');
const base = new URL('.', document.currentScript.src);
Promise.all([fetch(new URL('tree.json', base)).then(r => r.json()), fetch(new URL('../map/skills.json', base)).then(r => r.json())])
  .then(([T, M]) => mount(T, M)).catch(e => console.error('start: не загрузились данные', e));

function mount(T, M){
  const node = new Map(M.nodes.map(n => [n.id, n])), course = Object.fromEntries(M.courses.map(c => [c.id, c]));
  const full = M.routes.find(r => r.id === 'full'), num = Object.fromEntries((full.path || []).map((p, i) => [p.course, i + 1]));
  const ST = (root.SkillMetroLayout || {stations: {}}).stations;
  let st = load() || fresh();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const branch = () => Engine.aboutNext(T, st.about).branch || null;

  const kot = key => key ? `<div class="kot" role="note"><img class="kot-ava" src="/ab-basics/img/ava-kot.jpg" width="56" height="56" alt=""><p class="kot-say"><span class="vh">${t('st.kot')}: </span>${t(key)}</p></div>` : '';
  const pic = (k, eager) => `<figure class="pic"><img src="${IMG[k][0]}" width="1600" height="900" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(t(IMG[k][1]))}"></figure>`;
  const opt = (o, label, cls = '', dis) => `<li><button type="button" class="opt${cls}" data-opt="${o}"${dis ? ' aria-disabled="true"' : ''}>${label}</button></li>`;
  const opts = items => `<ul class="opts" role="list" aria-label="${esc(t('st.opts'))}">${items}</ul>`;
  const back = () => `<button type="button" class="btn link" data-act="back">← ${t('st.back')}</button>`;

  // прогресс: сделано / (сделано + ещё, в среднем)
  function progress(){
    const done = Object.keys(st.about).length + st.ans.length;
    let more;
    if (st.stage === 'about'){
      const left = T.about.qs[st.cur || Engine.aboutNext(T, st.about).q] ? 1 : 0;
      more = left + 1 + 6;
    } else if (st.stage === 'tree' || st.stage === 'check'){ const [lo, hi] = Engine.range(T, branch(), st.ans); more = (lo + hi) / 2 + (st.stage === 'check' ? 1 : 0); }
    else more = 0;
    return st.stage === 'done' ? 100 : st.stage === 'intro' ? 0 : Math.round(100 * done / (done + Math.max(more, 1)));
  }
  function frame(body, focus){
    const p = progress();
    app.innerHTML = `<div class="bar" role="progressbar" aria-label="${esc(t('st.title'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><span style="width:${p}%"></span></div>`
      + `<p class="time">${t('st.time')}</p>` + body;
    const h = app.querySelector('[data-focus]');
    if (focus && h) { h.focus({preventScroll: true}); window.scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'}); }
  }

  function render(focus){
    if (st.stage === 'done' && st.res) return frame(resultHtml(), focus);
    if (st.stage === 'about') return frame(aboutHtml(), focus);
    if (st.stage === 'tree') return frame(treeHtml(), focus);
    if (st.stage === 'check') return frame(checkHtml(), focus);
    frame(pic('intro', true) + kot('st.hello') + `<h1 class="q" tabindex="-1" data-focus>${t('st.title')}</h1><p class="hint">${t('st.lead')}</p>`
      + `<p class="acts"><button type="button" class="btn" data-act="go">${t('st.go')}</button></p>`, focus);
  }
  function aboutHtml(){
    const id = st.cur || Engine.aboutNext(T, st.about).q, q = T.about.qs[id], a = st.about[id];
    return kot(st.say) + `<h1 class="q" tabindex="-1" data-focus>${t(`qz.${id}.q`)}</h1>`
      + opts(q.opts.map(o => opt(o.id, t(`qz.${id}.${o.id}`), a === o.id ? ' on' : '')).join(''))
      + `<p class="acts">${back()}</p>`;
  }
  function treeHtml(){
    const item = Engine.run(T, branch(), st.ans).next;
    return kot(st.say) + `<h1 class="q" tabindex="-1" data-focus>${t(`sa.${item}.q`)}</h1><p class="hint">${t(`sa.${item}.hint`)}</p>`
      + opts(Engine.answers(T, item).map(a => opt(a, t('sa.' + a))).join(''))
      + `<p class="acts">${back()}</p>`;
  }
  function checkHtml(){
    const ck = st.ck, k = T.check.tasks[ck.i], pick = ck.picks[ck.i], shown = pick !== undefined;
    const items = k.opts.concat('dunno').map(o => {
      let cls = '';
      if (shown){ if (o === k.right) cls = ' ok'; else if (o === pick) cls = ' no'; }
      return opt(o, o === 'dunno' ? t('ck.dunno') : t(`ck.${k.id}.${o}`), cls, shown);
    }).join('');
    const res = shown ? (pick === k.right ? 'ok' : pick === 'dunno' ? 'dk' : 'no') : '';
    const fb = shown ? `<div class="fb ${res}" role="status"><p class="vd">${t(res === 'ok' ? 'ck.right' : res === 'dk' ? 'ck.dunnoFb' : 'ck.wrong')}</p><p>${t(`ck.${k.id}.why`)}</p></div>` : '';
    return (ck.i === 0 && !shown ? pic('check', true) : '') + kot(ck.i === 0 && !shown ? 'ck.say' : null)
      + `<p class="qnum">${t('ck.of', {n: ck.i + 1})}</p><h1 class="q" tabindex="-1" data-focus>${t(`ck.${k.id}.q`)}</h1>`
      + opts(items) + fb
      + `<p class="acts">${back()}${shown ? `<button type="button" class="btn" data-act="cknext">${t('st.next')}</button>` : `<button type="button" class="btn ghost" data-act="ckskip">${t('ck.skip')}</button>`}</p>`;
  }

  // ---------- итог: личная карта курсов ----------
  const PLURAL = {one: 'курс', few: 'курса', many: 'курсов', other: 'курса'}, PR = new Intl.PluralRules('ru');
  const NOM = {'Шаг': ['шаг', 'шаги'], 'Глава': ['глава', 'главы'], 'Модуль': ['модуль', 'модули'], 'Тема': ['тема', 'темы']};
  // «шаги 1–3», «глава 4» — по шагам уже знакомых навыков курса
  function stepsText(ids){
    const ns = [...new Set(ids.map(id => M.steps[node.get(id).steps[0]].n))];
    if (!ns.length) return '';
    const w = ns[0].split(' ')[0], nums = ns.map(x => +x.split(' ')[1]).sort((a, b) => a - b), f = NOM[w] || [lower(w), lower(w)];
    const runs = []; nums.forEach(x => { const r = runs[runs.length - 1]; if (r && x === r[1] + 1) r[1] = x; else runs.push([x, x]); });
    return (nums.length > 1 ? f[1] : f[0]) + ' ' + runs.map(([a, b]) => a === b ? a : a + '–' + b).join(', ');
  }
  const and = list => list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' и ' + list[list.length - 1];
  function resultHtml(){
    const R = st.res, r = M.routes.find(x => x.id === R.goal), n = node.get(R.start), c = course[n.course], step = M.steps[n.steps[0]];
    const free = c.status === 'free';
    const url = free ? step.url : c.url + '#waitlist';
    const go = R.plan.filter(p => !p.skip && !p.extra);
    const sum = t('st.res.sum', {n: go.length + ' ' + PLURAL[PR.select(go.length)], list: and(go.map(p => '«' + esc(course[p.course].title) + '»'))});
    const main = free ? `<a class="btn" href="${step.url}">${t('st.res.open', {course: esc(c.title), step: lower(step.n)})}</a>`
      : `<a class="btn" href="${url}">${t('st.res.wait')}</a>`;
    const role = R.goal === 'decide' && R.role && R.role !== 'other' ? ' ' + t(`qz.role.${R.role}Note`) : '';
    const say = R.note === 'unsure' ? 'st.say.unsure' : R.note === 'failed' ? 'ck.failed' : null;
    return pic(R.note === 'unsure' || R.note === 'failed' ? 'unsure' : 'final', true) + kot(say)
      + `<h1 class="r-title" tabindex="-1" data-focus>${t('st.res.title')}</h1>`
      + `<p class="r-goal">${sum}</p>`
      + `<p class="r-start">${R.all ? t('st.res.all') : t('st.res.start', {url, course: esc(c.title), step: esc(lower(step.n)), label: esc(lower(n.label))})}</p>`
      + `<p class="r-why">${t('st.why.' + R.goal, {goal: esc(r.label)})}${role}</p>`
      + `<p class="acts">${main}<a class="btn ghost" href="/map/?route=mine">${t('st.res.map')}</a><button type="button" class="btn link" data-act="again">${t('st.res.again')}</button></p>`
      + (free ? `<p class="btn-note">${t('st.res.openNote')}</p>` : '')
      + `<h2 class="r-h">${t('st.res.line')}</h2>` + lineHtml(R)
      + `<h2 class="r-h">${t('st.res.can')}</h2><ul class="r-list" role="list">${r.nodes.slice(-3).map(id => `<li>${tx(node.get(id).title)}</li>`).join('')}</ul>`
      + `<h2 class="r-h">${t('st.res.tree')}</h2>` + flowHtml(R, n)
      + `<div class="mail"><button type="button" class="btn ghost" disabled aria-describedby="mail-n">${t('st.res.mail')}</button><p class="btn-note" id="mail-n">${t('st.res.mailSoon')}</p></div>`
      + `<p class="r-note">${t('st.res.note')}</p>`;
  }
  // личная линия метро: курсы по порядку («районы» с номерами 1, 2, 3… только своих), в каждом — зачем, статус, что пропустить, станции
  function lineHtml(R){
    const known = new Set(R.known), heard = new Set(R.heard);
    return `<ol class="line" role="list">` + R.plan.map(p => {
      const c = course[p.course], dashed = p.skip || p.extra;
      const why = p.marks.length ? p.marks.map(m => t('st.res.mark.' + m.a, {what: t(`sa.${m.item}.short`)})).join('; ')
        : t((p.extra ? 'st.res.extra.' : 'st.c.') + p.course);
      const skip = p.skip ? t('st.res.skipAll') : p.known.length ? t('st.res.skipPart', {steps: stepsText(p.known)}) : '';
      const stations = R.nodes.filter(id => node.get(id).course === p.course && (ST[id] || id === R.start));
      const sts = p.skip ? '' : `<ol class="sts" role="list">` + stations.map(id => { const k = node.get(id), here = id === R.start;
        return `<li class="sn${here ? ' here' : known.has(id) ? ' done' : heard.has(id) ? ' heard' : ''}${k.main ? ' main' : ''}"><span class="dot" aria-hidden="true"></span><span class="sn-l">${tx(k.label)}</span>`
          + (here ? `<span class="sn-h">${t('st.res.here')}</span>` : known.has(id) ? `<span class="sn-d">✓ ${t('st.res.known')}</span>` : heard.has(id) ? `<span class="sn-d">~ ${t('st.res.heard')}</span>` : '') + `</li>`; }).join('') + `</ol>`;
      return `<li class="dz${dashed ? ' dashed' : ''}${p.skip ? ' passed' : ''}" style="--zc:var(${c.color})">`
        + `<p class="dz-h"><span class="dz-n" aria-hidden="true">${p.n || (p.skip ? '✓' : '+')}</span><a href="${c.url}">${tx(c.title)}</a></p>`
        + `<p class="dz-s">${t('st.res.status.' + (p.skip ? 'skip' : c.status))}${p.extra ? ' · ' + t('st.res.deeper') : ''}</p>`
        + `<p class="dz-w">${why}</p>` + (skip ? `<p class="dz-k">${skip}</p>` : '') + sts + `</li>`;
    }).join('') + `</ol>`;
  }
  // блок-схема: какие развилки пройдены (✓ знаю · ~ слышал · ✗ пока нет) и где остановились
  function flowHtml(R, n){
    const mark = a => a === 'yes' ? ['✓', 'yes'] : a === 'no' ? ['✗', 'no'] : a === 'check-no' ? ['✗', 'check'] : ['~', 'heard'];
    return `<ol class="flow" role="list">` + R.path.map(p => { const [m, k] = mark(p.a);
      return `<li class="f-${k}"><span class="f-m" aria-hidden="true">${m}</span>${t(`sa.${p.item}.short`)} <span class="f-a">— ${t('st.res.tree.' + k)}</span></li>`; }).join('')
      + `<li class="f-stop"><span class="f-m" aria-hidden="true">→</span>${t('st.res.tree.stop', {label: esc(lower(n.label))})}</li></ol>`;
  }

  function finish(end){
    st.res = Engine.result(T, M, branch(), st.about, st.ans, end); st.stage = 'done'; st.say = null; save(st); render(true);
  }
  function afterTree(){
    const r = Engine.run(T, branch(), st.ans);
    if (r.end) finish(r.end); else { st.stage = 'tree'; save(st); render(true); }
  }

  app.addEventListener('click', e => {
    const o = e.target.closest('[data-opt]');
    if (o && o.getAttribute('aria-disabled') !== 'true'){
      const v = o.dataset.opt;
      if (st.stage === 'about'){
        const id = st.cur || Engine.aboutNext(T, st.about).q, q = T.about.qs[id];
        const path = Engine.aboutPath(T, st.about), i = path.indexOf(id);
        if (st.about[id] !== v) path.slice(i + 1).forEach(x => delete st.about[x]);
        st.about[id] = v;
        const opt0 = q.opts.find(x => x.id === v), nx = (opt0 && opt0.next) || q.next;
        st.say = id === 'what' ? 'st.say.' + v : null;
        if (nx[0] === '#'){ st.stage = 'tree'; st.cur = null; st.ans = []; st.say = st.say || 'st.say.tree'; if (id !== 'what') st.say = 'st.say.tree'; }
        else st.cur = nx;
        save(st); render(true); return;
      }
      if (st.stage === 'tree'){
        const item = Engine.run(T, branch(), st.ans).next;
        st.say = null;
        if (v === 'check'){ st.stage = 'check'; st.ck = {item, i: 0, picks: []}; save(st); render(true); return; }
        st.ans.push({item, a: v}); afterTree(); return;
      }
      if (st.stage === 'check'){
        st.ck.picks[st.ck.i] = v; save(st); render(false);
        const nx = app.querySelector('[data-act="cknext"]'); if (nx) nx.focus({preventScroll: true});
        return;
      }
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'go' || act === 'again'){ st = fresh(); st.stage = 'about'; save(st); render(true); }
    else if (act === 'cknext' || act === 'ckskip'){
      const ck = st.ck;
      if (act === 'cknext' && ck.i < T.check.tasks.length - 1){ ck.i++; save(st); render(true); return; }
      const h = {item: ck.item, a: 'check', ck: act === 'ckskip' ? [] : ck.picks.slice()};
      st.ans.push(h); st.ck = null;
      st.say = Engine.passed(T, h) ? 'ck.passed' : null;
      afterTree();
    }
    else if (act === 'back'){
      st.say = null;
      if (st.stage === 'check'){ if (st.ck.i > 0 && st.ck.picks[st.ck.i] === undefined){ st.ck.i--; st.ck.picks.length = st.ck.i; } else if (st.ck.picks[st.ck.i] !== undefined){ st.ck.picks.length = st.ck.i; } else { st.ck = null; st.stage = 'tree'; } }
      else if (st.stage === 'tree'){
        if (st.ans.length) st.ans.pop();
        else { st.stage = 'about'; const p = Engine.aboutPath(T, st.about); st.cur = p[p.length - 1]; delete st.about[st.cur]; }
      }
      else if (st.stage === 'about'){
        const p = Engine.aboutPath(T, st.about), id = st.cur || Engine.aboutNext(T, st.about).q, i = p.indexOf(id);
        if (i <= 0){ st = fresh(); }
        else { st.cur = p[i - 1]; delete st.about[st.cur]; }
      }
      save(st); render(true);
    }
  });
  render(false);
}
})(typeof window !== 'undefined' ? window : globalThis);
