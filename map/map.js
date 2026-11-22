/* Карта навыков (/map/): по данным map/skills.json рисует
   — «Весь путь» текстом: шесть курсов по порядку с номерами, необязательные отмечены;
   — переключатель целей (маршрутов) и схему метро (map/metro.js, основной вид): линия цели, станции — ключевые навыки, панель станции;
   — «Что в каждом курсе»: компактные карточки курсов в порядке «Весь путь», внутри — свёрнутый список навыков-действий,
     «что нужно заранее» (prereq) и термины;
   — «В планах» и «Честные границы».
   Прогресс бесплатных курсов — из localStorage (те же ключи, что пишут движки глав: free:<глава>:seen — signal/book.js,
   signal:ch01:seen — глава 1 «Сигнала», ab:<шаг>:seen — ab-basics/course.js; значение — массив номеров просмотренных карточек).
   Пройденное подсвечивается на схеме, «ты здесь» — маркер на схеме; кнопка перехода — в панели станции.
   Личный маршрут из «Подобрать маршрут» (/start/, localStorage start:plan) — цель «Твой маршрут» (id mine): «ты здесь» на стартовой станции,
   знакомые навыки отмечены «знаешь» (состояние quiz). Без него вид по умолчанию — цель «Весь путь» (full).
   Строки интерфейса — ui.* в i18n/map.js.
   Адреса: ?route=full|mine|decide|basics|interview|abtest|deep (старые product, analyst, abtester ведут на decide, basics, abtest),
   #<курс> (prob, sig, ab, st, abm, cau) — карточка курса, #<навык> — панель навыка. */
(function () {
'use strict';
const LANG = (document.documentElement.lang || 'ru').slice(0, 2);
const I = window.I18N || {}, RU = I.ru || {}, DICT = I[LANG] || {};
const typo = s => I.typo ? I.typo(LANG, s) : s;
const raw = k => k in DICT ? DICT[k] : (k in RU ? RU[k] : k);
const t = (k, v) => typo(String(raw(k)).replace(/\{(\w+)\}/g, (m, x) => v && x in v ? v[x] : m));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const tx = s => typo(esc(s)).replace(/p-value/g, '<span class="nw">p-value</span>');                                   // текст из skills.json: экранировать и прогнать типограф
const PR = new Intl.PluralRules(LANG);
const SKILLS = {ru: {one: 'навык', few: 'навыка', many: 'навыков', other: 'навыка'}, en: {one: 'skill', other: 'skills'}};
const skills = n => n + ' ' + ((SKILLS[LANG] || SKILLS.ru)[PR.select(n)] || (SKILLS[LANG] || SKILLS.ru).other);
const $ = id => document.getElementById(id);

const src = new URL('skills.json', document.currentScript.src);
// время прохождения бесплатных курсов (hours) — из courses/courses.json, одно место на сайт; курс — по адресу (url = href)
const HOURS = fetch('/courses/courses.json').then(r => r.json()).then(d => Object.fromEntries(d.courses.filter(c => c.hours).map(c => [c.href, c.hours]))).catch(() => ({}));
Promise.all([fetch(src).then(r => r.json()), HOURS]).then(([M, H]) => { M.courses.forEach(c => { if (H[c.url]) c.hours = H[c.url]; }); init(M); }).catch(e => { console.error('map: не загрузилась карта', e); });

// личный маршрут из «Подобрать маршрут» (/start/, start/start.js): цель, старт, знакомые навыки, личная линия по курсам
const PLAN = (() => { try { const v = JSON.parse(localStorage.getItem('start:plan') || 'null'); return v && v.v === 1 && v.res ? v.res : null; } catch (e) { return null; } })();

function init(M){
  const course = Object.fromEntries(M.courses.map(c => [c.id, c]));
  // личная линия — ещё одна цель «Твой маршрут» (id mine): её узлы — курсы цели и второй цели по порядку «Весь путь»
  if (PLAN && Array.isArray(PLAN.nodes)) M.routes.unshift({id: 'mine', label: t('ui.mine'), button: t('ui.mine'), for: t('ui.mineFor'), entry: '', nodes: PLAN.nodes.filter(id => M.nodes.some(n => n.id === id))});
  const FULL = M.routes.find(r => r.id === 'full'), NUM = Object.fromEntries(((FULL && FULL.path) || []).map((p, i) => [p.course, {n: i + 1, optional: !!p.optional, why: p.quiet ? '' : p.why}]));
  const node = new Map(M.nodes.map(n => [n.id, n]));
  const ins = new Map(), outs = new Map(), softIn = new Map();
  M.nodes.forEach(n => { ins.set(n.id, []); outs.set(n.id, []); softIn.set(n.id, []); });
  M.edges.forEach(([a, b]) => { outs.get(a).push(b); ins.get(b).push(a); });
  (M.soft || []).forEach(s => softIn.get(s.to).push(s));
  const free = id => course[node.get(id).course].status === 'free';
  const has = k => k in DICT || k in RU;
  const ancestors = (id, acc = new Set()) => { ins.get(id).forEach(p => { if (!acc.has(p)){ acc.add(p); ancestors(p, acc); } }); return acc; };

  // ---------- прогресс ----------
  const seen = key => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch(e) { return new Set(); } };
  function stepState(id){                                    // 0 — не начат, 1 — начат, 2 — пройден
    const st = M.steps[id]; if (!st || !st.store) return 0;
    const s = seen(st.store); if (!s.size) return 0;
    return s.has(st.cards - 1) || s.size >= Math.ceil(0.8 * st.cards) ? 2 : 1;
  }
  const state = new Map();                                   // done | covered | started | ''
  function readProgress(){
    M.nodes.forEach(n => {
      if (!free(n.id)) { state.set(n.id, ''); return; }
      const s = n.steps.map(stepState);
      state.set(n.id, s.every(x => x === 2) ? 'done' : s.some(x => x > 0) ? 'started' : '');
    });
    M.nodes.forEach(n => { if (state.get(n.id) === 'done') (n.covers || []).forEach(c => { if (state.get(c) !== 'done') state.set(c, 'covered'); }); });
    // «Подобрать маршрут» засчитал навык как знакомый — «знаешь» (если по прогрессу он ещё не пройден)
    ((PLAN && PLAN.known) || []).forEach(id => { if (node.has(id) && !state.get(id)) state.set(id, 'quiz'); });
  }
  const known = id => ['done', 'covered', 'quiz'].includes(state.get(id));
  const knownLabel = id => state.get(id) === 'quiz' ? t('ui.quizKnown') : t('ui.done');
  const anyProgress = () => [...state.values()].some(v => v && v !== 'quiz');
  function nextNode(route){
    if (route){
      const pending = route.nodes.filter(id => !known(id));
      return pending.find(free) || pending[0] || null;
    }
    if (!anyProgress()) return null;
    const weight = c => M.nodes.filter(n => n.course === c && state.get(n.id)).length;
    const cand = M.nodes.filter(n => !known(n.id) && ins.get(n.id).every(known));
    cand.sort((a, b) => (free(b.id) - free(a.id)) || (weight(b.course) - weight(a.course)) || (M.nodes.indexOf(a) - M.nodes.indexOf(b)));
    return cand.length ? cand[0].id : null;
  }

  // ---------- «Что в каждом курсе»: карточки в порядке «Весь путь» ----------
  const order = FULL ? FULL.path.map(p => p.course) : M.courses.filter(c => c.status !== 'planned').map(c => c.id);
  $('course-cards').innerHTML = order.map(cid => {
    const c = course[cid], list = M.nodes.filter(n => n.course === cid), lv = M.levels[c.level];
    return `<li class="cc" id="${cid}" style="--course:var(${c.color})">
      <p class="cc-h">${NUM[cid] ? `<span class="cnum" aria-hidden="true">${NUM[cid].n}</span>` : ''}<a href="${c.url}">${NUM[cid] ? `<span class="vh">${NUM[cid].n}. </span>` : ''}${tx(c.title)}</a></p>
      <p class="chips"><span class="tag ${c.status}">${tx((c.when || M.status[c.status]))}</span><span class="chip"><span class="lvl l${c.level}" aria-hidden="true"></span>${tx(lv.name)}</span>${NUM[cid] && NUM[cid].optional ? `<span class="tag opt">${t('ui.optional')}</span>` : ''}</p>
      ${has('cc.' + cid) ? `<p class="cc-for">${t('cc.' + cid)}</p>` : ''}
      <details class="cc-more"><summary>${t('ui.ccCan', {n: skills(list.length)})}</summary>
        <ul class="cc-sk">${list.map(n => `<li><a href="#${n.id}" data-go="${n.id}">${tx(n.label)}</a></li>`).join('')}</ul>
        ${prereqHtml(c, false)}${termsHtml(c.terms, c.status === 'free' ? 'ui.termsFree' : 'ui.terms')}
        <p class="cc-open"><a href="${c.url}">${t('ui.ccOpen')} →</a></p>
      </details></li>`;
  }).join('');
  $('course-cards').addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault(); opener = a; open(a.dataset.go); });
  // что нужно заранее: «Ты уже …» + где это взять + «проверь себя» → /start/
  function prereqHtml(c){
    const p = c.prereq; if (!p) return '';
    const link = id => `<a href="${course[id].url}">«${tx(course[id].title)}»</a>`;
    const body = p.none ? `<p>${tx(p.none)}</p>`
      : `<p>${t('ui.pre.know')}</p><ul>${p.know.map(x => `<li>${tx(x)}</li>`).join('')}</ul>`
        + `<p>${t('ui.pre.else', {list: (p.else || []).map(link).join(', ')})}${p.deeper ? ' ' + t('ui.pre.deeper', {link: link(p.deeper)}) : ''}${p.note ? ' ' + tx(p.note) : ''}</p>`
        + `<p><a href="/start/">${t('ui.pre.check')}</a></p>`;
    return `<div class="pre"><p class="pre-h">${t('ui.pre.title')}</p>${body}</div>`;
  }
  // термины — строкой-облаком: в шапке курса и в панели навыка (у бесплатных курсов — «на собеседовании это назовут …»)
  function termsHtml(list, key){
    return list && list.length ? `<p class="terms"><span class="terms-h">${t(key)}:</span> ${list.map(x => `<span class="term">${tx(x)}</span>`).join(' ')}</p>` : '';
  }
  $('bounds-list').innerHTML = ['prob', 'sig', 'ab', 'st', 'abm', 'cau'].map(cid => { const c = course[cid];
    return `<li style="--course:var(${c.color})"><b>${tx(c.title)}</b><p>${tx(c.boundary)}</p></li>`; }).join('');

  // ---------- в планах ----------
  const ref = r => {
    if (r.startsWith('ext:')) return `<span class="ref ext">${t('plan.ext.' + r.slice(4))}</span>`;
    if (node.has(r)){ const n = node.get(r), c = course[n.course];
      return `<a class="ref" href="#${r}" data-go="${r}" style="--course:var(${c.color})">«${tx(c.title)}»: ${tx(n.label)}</a>`; }
    const c = course[r];
    return c.status === 'planned' ? `<a class="ref planref" href="#plan-${r}">«${t('plan.' + r + '.title')}»</a>`
      : `<a class="ref" href="#${r}" style="--course:var(${c.color})">${tx(c.title)}</a>`;
  };
  const rel = (c, k) => !(c[k] || []).length ? '' : `<div><dt>${t('plan.' + k)}</dt><dd>${c[k].map(r => ref(r)
    + (has(`plan.${c.id}.${k}.${r}`) ? ` <span class="why">— ${t(`plan.${c.id}.${k}.${r}`)}</span>` : '')).join(k === 'after' ? ` ${t('plan.or')} ` : ', ')}</dd></div>`;
  $('plan-list').innerHTML = M.courses.filter(c => c.status === 'planned').map(c => { const k = x => `plan.${c.id}.${x}`;
    const sk = [1, 2, 3, 4, 5].filter(i => has(k('s' + i))).map(i => `<li>${t(k('s' + i))}</li>`).join('');
    return `<li class="plan" id="plan-${c.id}" aria-labelledby="ph-${c.id}">
      <p class="chips"><span class="tag planned">${t('plan.tag')}</span></p>
      <h3 id="ph-${c.id}">${t(k('title'))}</h3>${has(k('alt')) ? `<p class="alt">${t(k('alt'))}</p>` : ''}
      <p class="pl-about">${t(k('lead'))}</p>
      <h4>${t('plan.can')}</h4><ul class="sk">${sk}</ul>
      ${has(k('terms')) ? termsHtml(t(k('terms')).split(', '), 'plan.terms') : ''}
      ${has(k('entry')) ? `<p class="entry">${t(k('entry'))}</p>` : ''}
      <dl class="rels">${rel(c, 'after')}${rel(c, 'near')}${rel(c, 'leads')}</dl>
      <p class="when">${t('plan.when')}</p></li>`; }).join('');
  $('plan-list').addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return;
    e.preventDefault(); opener = a; open(a.dataset.go); });

  // ---------- «Весь путь» текстом: шесть курсов по порядку ----------
  const pl = $('path-list');
  // Одна колонка: станции 1–6 сверху вниз на линии-маршруте; после последнего бесплатного курса линия бледнее (li.dim).
  // Метки статуса — общие для сайта (бесплатно · скоро · позже), у платных рядом цена price.paid, как на главной.
  const lastFree = FULL ? FULL.path.reduce((a, p, i) => course[p.course].status === 'free' ? i : a, -1) : -1;
  const pathTag = s => s === 'free' ? M.status.free : t(s === 'soon' ? 'ui.soon' : 'ui.later');
  if (pl && FULL) pl.innerHTML = FULL.path.map((p, i) => { const c = course[p.course];
    const pre = c.prereq ? (c.prereq.none ? tx(c.prereq.none) : t('ui.pre.short', {list: tx(c.prereq.know.join('; '))})) : '';
    return `<li${lastFree >= 0 && i >= lastFree ? ' class="dim"' : ''}><span class="pn" aria-hidden="true">${i + 1}</span><div><p class="pt"><a href="${c.url}">${tx(c.title)}</a></p>`
      + `<p class="chips">${c.status !== 'free' ? `<span class="price"><b>${t('price.paid')}</b></span>` : ''}<span class="tag ${c.status}">${tx(pathTag(c.status))}</span>${c.status === 'free' && c.hours ? `<span class="tag">${esc(c.hours).replace(/ /g, '&nbsp;')}</span>` : ''}${p.optional ? `<span class="tag opt">${t('ui.optional')}</span>` : ''}</p>`
      + `<p class="pg">${tx(c.lead.charAt(0).toUpperCase() + c.lead.slice(1))}.${p.why && !p.quiet ?' ' + tx(p.why.charAt(0).toUpperCase() + p.why.slice(1)) + '.' : ''}</p>`
      + (pre ? `<p class="pp">${pre}</p>` : '') + `</div></li>`; }).join('');
  const mb = $('mine-btn');
  if (mb){ mb.hidden = !PLAN; mb.addEventListener('click', () => { setRoute('mine', true); $('metro-h').scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }); }

  // ---------- маршруты ----------
  let route = null;
  const rb = $('route-btns');
  const LINE = (window.SkillMetroLayout || {lines: {}}).lines;
  rb.innerHTML = `<ul class="goals" role="list">` + M.routes.map(r => `<li><button type="button" class="goal" data-route="${r.id}" aria-pressed="false"${LINE[r.id] ? ` style="--line:${LINE[r.id].color}"` : ''}>`
      + `<span class="g-t">${LINE[r.id] ? `<span class="sw" aria-hidden="true"></span>` : ''}${tx(r.label)}</span><span class="g-for">${tx(r.for)}</span></button></li>`).join('') + `</ul>`
    + `<button type="button" class="all" data-route="" aria-pressed="true">${t('routes.all')}</button>`;
  rb.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRoute(b.dataset.route, true); });
  const OLD = {product: 'decide', analyst: 'basics', abtester: 'abtest'};          // прежние ролевые адреса
  function setRoute(id, push){
    id = OLD[id] || id;
    route = M.routes.find(r => r.id === id) || null;
    rb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.route === (route ? route.id : ''))));
    if (push){ const u = new URL(location.href); if (route) u.searchParams.set('route', route.id); else u.searchParams.delete('route'); history.replaceState(null, '', u); }
    paint();
  }

  // ---------- состояние карточек, «ты здесь», маршрут ----------
  let sel = null;
  function paint(){
    readProgress();
    // итог теста уровня: на маршруте-цели (или без маршрута) «ты здесь» — со стартовой станции теста, дальше — по прогрессу
    const qz = PLAN;
    let nx = nextNode(route), byQuiz = false;
    if (qz && (!route || route.id === qz.goal || route.id === 'mine')){
      const r = M.routes.find(x => x.id === (route && route.id === 'mine' ? 'mine' : qz.goal)), i = r ? r.nodes.indexOf(qz.start) : -1;
      const cand = i < 0 ? null : r.nodes.slice(i).find(id => !known(id));
      if (cand){ nx = cand; byQuiz = true; }
    }
    // описание маршрута
    if (route){
      const first = byQuiz ? nx : route.nodes.find(id => !known(id)) || route.nodes[0];
      const as = (route.assumes || []).map(a => esc(node.get(a).label).replace(/^./, ch => ch.toLowerCase())).join('; ');
      $('route-info').innerHTML = `<b>${tx(route.label)}</b>: ${t('ui.routeLen', {n: skills(route.nodes.length)})}. `
        + t('ui.routeStart', {label: esc(node.get(first).label)}) + (as ? ' ' + t('ui.routeAssumes', {list: as}) : '') + (route.then ? ' ' + tx(route.then) : '');
    } else $('route-info').textContent = '';
    if (metro) metro.paint({route, nx, known, knownLabel, any: anyProgress() || byQuiz});
  }
  function stepUrl(id){
    const n = node.get(id), s = n.steps.find(x => stepState(x) < 2) || n.steps[0];
    return M.steps[s].url;
  }

  // ---------- панель навыка ----------
  const panel = $('panel'), pbody = $('p-body');
  let opener = null;
  const relBtn = (id, extra) => { const n = node.get(id), s = state.get(id);
    const tag = s === 'done' ? t('ui.done') : s === 'covered' ? t('ui.covered') : s === 'quiz' ? t('ui.quizKnown') : course[n.course].title;
    return `<li><button type="button" class="rel${known(id) ? ' ok' : ''}" data-go="${id}"><span>${tx(n.label)}${extra ? ` <span class="why">— ${tx(extra)}</span>` : ''}</span><small>${esc(tag)}</small></button></li>`; };
  function open(id, focusPanel = true){
    const n = node.get(id), c = course[n.course], lv = M.levels[n.level], s = state.get(id);
    sel = id;
    const where = n.steps.map(x => { const st = M.steps[x], ss = stepState(x);
      return `<li><a href="${st.url}">${tx(st.n)} · ${tx(st.title)}</a>${c.status === 'free' ? (ss === 2 ? ` <span class="tag free">${t('ui.done')}</span>` : ss === 1 ? ` <span class="tag">${t('ui.started')}</span>` : '') : ` <span class="tag ${c.status}">${tx((c.when || M.status[c.status]))}</span>`}</li>`; }).join('');
    const need = ins.get(id), helps = softIn.get(id), opens = outs.get(id);
    let act;
    if (c.status === 'free') act = `<a class="btn" href="${stepUrl(id)}">${t(s === 'done' ? 'ui.repeat' : s === 'started' ? 'ui.continue' : 'ui.start')}</a>`;
    else if (c.status === 'soon') act = `<a class="btn waitlist" href="${c.url}#waitlist">${t('ui.waitlist')}</a>`;
    else act = `<a class="btn ghost" href="${c.url}">${t('ui.laterBtn')}</a>`;
    if (c.status === 'free') act += `<a class="btn ghost" href="${c.url}">${t('ui.toCourse')}</a>`;
    pbody.innerHTML = `<p class="chips"><span class="tag" style="box-shadow:inset 0 -3px 0 var(${c.color})">${tx(c.title)}</span><span class="tag ${c.status}">${tx((c.when || M.status[c.status]))}</span>`
      + `<span class="chip"><span class="lvl l${n.level}" aria-hidden="true"></span><span class="vh">${t('ui.levelOf')}: </span>${tx(lv.name)}</span></p>`
      + `<h2 id="p-title" tabindex="-1">${tx(n.title)}</h2>`
      + `<h3>${t('ui.can')}</h3><p class="can">${tx(n.can)}</p>`
      + termsHtml(n.terms, c.status === 'free' ? 'ui.termsFree' : 'ui.terms')
      + prereqHtml(c, false)
      + (n.main ? `<div class="plate mainp"><p><b>${t('ui.mainNote')}.</b> ${n.check ? t('ui.check') + ': ' + tx(n.check.charAt(0).toLowerCase() + n.check.slice(1)) : ''}</p></div>` : '')
      + (n.note ? `<div class="plate notep"><p>${tx(n.note)}</p></div>` : '')
      + `<h3>${t('ui.where')}</h3><ul>${where}</ul>`
      + (n.toy ? `<h3>${t('ui.toy')}</h3><p>${n.toy.url ? `<a href="${n.toy.url}">${tx(n.toy.name)}</a>` : `${tx(n.toy.name)} <span class="tag soon">${t('ui.soon')}</span>`}</p>` : '')
      + `<h3>${t('ui.needs')}</h3>` + (need.length ? `<ul>${need.map(x => relBtn(x)).join('')}</ul>` : `<p class="dim">${t('ui.needsNone')}</p>`)
      + (helps.length ? `<h3>${t('ui.helps')}</h3><ul>${helps.map(h => relBtn(h.from, h.why)).join('')}</ul>` : '')
      + (opens.length ? `<h3>${t('ui.opens')}</h3><ul>${opens.map(x => relBtn(x)).join('')}</ul>` : '')
      + `<p class="acts">${act}</p>`;
    panel.hidden = false;
    if (metro) metro.select(id);
    if (focusPanel) $('p-title').focus({preventScroll: false});
  }
  function close(){
    if (!sel) return;
    panel.hidden = true; sel = null;
    if (metro) metro.select(null);
    if (opener && opener.isConnected) opener.focus(); opener = null;
  }
  pbody.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return;
    const id = b.dataset.go; if (metro && metro.has(id) && metro.el(id) && !matchMedia('(max-width: 1023px)').matches) opener = metro.el(id); open(id); });
  $('p-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  // ---------- схема метро ----------
  const metro = window.SkillMetro ? window.SkillMetro.init({M, node, course, t, esc, typo, setRoute, route: () => route,
    openFrom(id, el){ if (sel === id && !panel.hidden) { close(); return; } opener = el; open(id); }}) : null;


  // ---------- старт ----------
  const q = new URL(location.href).searchParams.get('route');
  setRoute(q || (PLAN ? 'mine' : 'full'), false);
  const hash = decodeURIComponent(location.hash.slice(1));
  if (course[hash] && $(hash)) requestAnimationFrame(() => { const h = $(hash); h.scrollIntoView({block: 'start'}); h.querySelector('details').open = true; h.querySelector('.cc-h a').focus({preventScroll: true}); });
  else if (/^plan-/.test(hash) && $(hash)) requestAnimationFrame(() => $(hash).scrollIntoView({block: 'start'}));
  else if (node.has(hash)) requestAnimationFrame(() => open(hash, true));
  addEventListener('storage', paint);                       // прогресс из другой вкладки
  window.SkillMap = {paint, setRoute, open, close, metro};
}
})();
