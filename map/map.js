/* Карта навыков (/map/): рисует граф из map/skills.json.
   — колонки-курсы слева направо, карточки-навыки — кнопки (клавиатура, aria), стрелки предпосылок — SVG под карточками;
   — переключатель маршрутов подсвечивает путь и нумерует шаги;
   — «ты здесь»: читает прогресс бесплатных курсов из localStorage (те же ключи, что пишут движки глав:
     free:<глава>:seen — signal/book.js для «Вероятности» и глав 4–12 «Сигнала», signal:ch01:seen — глава 1 «Сигнала»,
     ab:<шаг>:seen — ab-basics/course.js; значение — массив номеров просмотренных карточек с нуля);
   — уже 1024 px граф становится списком по курсам, стрелки не рисуются, панель навыка — снизу.
   — «В планах»: курсы со status: planned из skills.json — лёгкие карточки без навыков-узлов, кнопок и листа ожидания
     (у платных «скоро» лист ожидания — пока только заглушка без формы), тексты — plan.* в i18n/map.js.
   — схема метро (основной вид, над графом) — map/metro.js: сюда он получает маршрут, прогресс и панель навыка через api.
   Строки интерфейса — ui.* в i18n/map.js. Адреса: ?route=product|analyst|interview|abtester, #<курс> (prob, sig, ab, st, abm, cau) или #<навык>. */
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
const NARROW = matchMedia('(max-width: 1023px)');
const COLS = ['ab', 'prob', 'sig', 'st', 'abm', 'cau'];        // слева направо; «A/B на пальцах» — отдельная ветка с краю
const $ = id => document.getElementById(id);

const src = new URL('skills.json', document.currentScript.src);
fetch(src).then(r => r.json()).then(init).catch(e => { console.error('map: не загрузилась карта', e); });

function init(M){
  const course = Object.fromEntries(M.courses.map(c => [c.id, c]));
  const node = new Map(M.nodes.map(n => [n.id, n]));
  const ins = new Map(), outs = new Map(), softIn = new Map();
  M.nodes.forEach(n => { ins.set(n.id, []); outs.set(n.id, []); softIn.set(n.id, []); });
  M.edges.forEach(([a, b]) => { outs.get(a).push(b); ins.get(b).push(a); });
  (M.soft || []).forEach(s => softIn.get(s.to).push(s));
  const free = id => course[node.get(id).course].status === 'free';
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
  }
  const known = id => state.get(id) === 'done' || state.get(id) === 'covered';
  const anyProgress = () => [...state.values()].some(Boolean);
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

  // ---------- разметка ----------
  const cols = $('cols');
  cols.innerHTML = COLS.map(cid => {
    const c = course[cid], list = M.nodes.filter(n => n.course === cid);
    const lv = M.levels[c.level];
    return `<section class="col${c.parallel ? ' parallel' : ''}" id="${cid}" style="--course:var(${c.color})" aria-labelledby="h-${cid}">
      <div class="col-h"><h2 id="h-${cid}"><a href="${c.url}">${tx(c.title)}</a></h2>
        <p class="chips"><span class="tag ${c.status}">${tx(M.status[c.status])}</span><span class="chip"><span class="lvl l${c.level}" aria-hidden="true"></span>${tx(lv.name)}</span></p>
        ${c.parallel ? `<p class="par">${t('ui.parallel')}</p>` : ''}
        <p class="cnt">${skills(list.length)}</p></div>
      <ol class="nodes" role="list">${list.map(n => nodeHtml(n, c)).join('')}</ol></section>`;
  }).join('');
  function nodeHtml(n, c){
    const st = M.steps[n.steps[0]];
    const lv = n.level !== c.level ? `<span class="lv"><span class="lvl l${n.level}" aria-hidden="true"></span>${tx(M.levels[n.level].name)}</span>` : '';
    return `<li><button type="button" class="node${c.status !== 'free' ? ' paid' : ''}${n.main ? ' main' : ''}" id="n-${n.id}" data-id="${n.id}" aria-controls="panel" aria-expanded="false">
      <span class="ord" aria-hidden="true"></span><span class="lab">${tx(n.label)}</span>
      <span class="meta"><span>${tx(st.n)}</span>${lv}${n.main ? `<span class="mn">${t('ui.main')}</span>` : ''}<span class="stt"></span></span><span class="vh rt"></span></button></li>`;
  }
  $('bounds-list').innerHTML = ['prob', 'sig', 'ab', 'st', 'abm', 'cau'].map(cid => { const c = course[cid];
    return `<li style="--course:var(${c.color})"><b>${tx(c.title)}</b><p>${tx(c.boundary)}</p></li>`; }).join('');
  const btn = id => $('n-' + id);

  // ---------- в планах ----------
  const has = k => k in DICT || k in RU;
  const ref = r => {
    if (r.startsWith('ext:')) return `<span class="ref ext">${t('plan.ext.' + r.slice(4))}</span>`;
    if (node.has(r)){ const n = node.get(r), c = course[n.course];
      return `<a class="ref" href="#${r}" data-go="${r}" style="--course:var(${c.color})">${esc(c.short)}: ${tx(n.label)}</a>`; }
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
      ${has(k('entry')) ? `<p class="entry">${t(k('entry'))}</p>` : ''}
      <dl class="rels">${rel(c, 'after')}${rel(c, 'near')}${rel(c, 'leads')}</dl>
      <p class="when">${t('plan.when')}</p></li>`; }).join('');
  $('plan-list').addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return;
    e.preventDefault(); const id = a.dataset.go; btn(id).scrollIntoView({block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); opener = btn(id); open(id); });

  // ---------- маршруты ----------
  let route = null;
  const rb = $('route-btns');
  const LINE = (window.SkillMetroLayout || {lines: {}}).lines;
  rb.innerHTML = M.routes.map(r => `<button type="button" data-route="${r.id}" aria-pressed="false">${LINE[r.id] ? `<span class="sw" style="--line:${LINE[r.id].color}" aria-hidden="true"></span>` : ''}${tx(r.button)}</button>`).join('')
    + `<button type="button" data-route="" aria-pressed="true">${t('routes.all')}</button>`;
  rb.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRoute(b.dataset.route, true); });
  function setRoute(id, push){
    route = M.routes.find(r => r.id === id) || null;
    rb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.route === (route ? route.id : ''))));
    if (push){ const u = new URL(location.href); if (route) u.searchParams.set('route', route.id); else u.searchParams.delete('route'); history.replaceState(null, '', u); }
    paint();
  }

  // ---------- состояние карточек, «ты здесь», маршрут ----------
  let sel = null;
  function paint(){
    readProgress();
    const nx = nextNode(route);
    const inRoute = new Map(route ? route.nodes.map((id, i) => [id, i + 1]) : []);
    const assumed = new Set();
    if (route) (route.assumes || []).forEach(a => { assumed.add(a); ancestors(a).forEach(x => assumed.add(x)); });
    $('graph').classList.toggle('routing', !!route);
    M.nodes.forEach(n => {
      const b = btn(n.id), s = state.get(n.id), c = course[n.course];
      b.classList.toggle('done', s === 'done'); b.classList.toggle('covered', s === 'covered'); b.classList.toggle('started', s === 'started');
      b.classList.toggle('next', n.id === nx); b.classList.toggle('inroute', inRoute.has(n.id)); b.classList.toggle('assumed', !inRoute.has(n.id) && assumed.has(n.id));
      b.querySelector('.ord').textContent = inRoute.get(n.id) || '';
      b.querySelector('.rt').textContent = inRoute.has(n.id) ? ', ' + t('ui.routeStep', {n: inRoute.get(n.id)}) : '';
      b.querySelector('.stt').textContent = n.id === nx ? '→ ' + t('ui.next') : s === 'done' ? '✓ ' + t('ui.done') : s === 'covered' ? '✓ ' + t('ui.covered') : s === 'started' ? t('ui.started') : c.status === 'soon' ? t('ui.soon') : c.status === 'later' ? t('ui.later') : '';
    });
    // «ты здесь»
    const freeIds = M.nodes.filter(n => free(n.id)).map(n => n.id), done = freeIds.filter(known).length;
    let h;
    if (!anyProgress()) h = `<p>${t('ui.hereNone')}</p>`;
    else {
      const per = ['prob', 'sig', 'ab'].map(cid => { const ids = freeIds.filter(id => node.get(id).course === cid); return `<span>${esc(course[cid].short)}: ${ids.filter(known).length}/${ids.length}</span>`; }).join('');
      h = `<p class="big">${t('ui.hereDone', {done, total: freeIds.length})}</p><p class="bar">${per}</p>`;
      if (nx && free(nx)) h += `<p>${t('ui.hereNext', {label: esc(node.get(nx).label)})}</p><a class="btn" href="${stepUrl(nx)}">${t(state.get(nx) === 'started' ? 'ui.continue' : 'ui.start')}</a>`;
      else if (done === freeIds.length) h += `<p>${t('ui.hereAll')}</p>`;
      else if (nx) h += `<p>${t('ui.hereNext', {label: esc(node.get(nx).label)})} · ${t('ui.soon')}</p>`;
    }
    $('here-body').innerHTML = h + `<p class="note">${t('ui.hereNote')}</p>`;
    // описание маршрута
    if (route){
      const first = route.nodes.find(id => !known(id)) || route.nodes[0];
      const as = (route.assumes || []).map(a => esc(node.get(a).label).replace(/^./, ch => ch.toLowerCase())).join('; ');
      $('route-info').innerHTML = `<b>${tx(route.label)}</b>${route.hero ? ' — ' + tx(route.hero) : ''}. ${tx(route.who)} ${t('ui.routeLen', {n: skills(route.nodes.length)})}. `
        + t('ui.routeStart', {label: esc(node.get(first).label)}) + (as ? ' ' + t('ui.routeAssumes', {list: as}) : '') + (route.then ? ' ' + tx(route.then) : '');
    } else $('route-info').textContent = '';
    drawEdges();
    if (metro) metro.paint({route, nx, known, any: anyProgress()});
  }
  function stepUrl(id){
    const n = node.get(id), s = n.steps.find(x => stepState(x) < 2) || n.steps[0];
    return M.steps[s].url;
  }

  // ---------- стрелки ----------
  const svg = $('edges'), NS = 'http://www.w3.org/2000/svg';
  function drawEdges(){
    if (NARROW.matches){ svg.innerHTML = ''; return; }
    const g = $('graph').getBoundingClientRect();
    const box = new Map(), colOf = new Map(), idx = new Map();
    M.nodes.forEach(n => {
      const r = btn(n.id).getBoundingClientRect();
      box.set(n.id, {l: r.left - g.left, r: r.right - g.left, t: r.top - g.top, b: r.bottom - g.top, cx: r.left - g.left + r.width / 2, cy: r.top - g.top + r.height / 2});
      colOf.set(n.id, COLS.indexOf(n.course));
    });
    COLS.forEach(cid => M.nodes.filter(n => n.course === cid).forEach((n, i) => idx.set(n.id, i)));
    const inRoute = new Set(route ? route.nodes : []);
    const lit = (a, b) => sel ? (a === sel || b === sel) : route ? inRoute.has(a) && inRoute.has(b) : false;
    const dim = (a, b) => (sel || route) && !lit(a, b);
    function d(a, b){
      const A = box.get(a), B = box.get(b), ca = colOf.get(a), cb = colOf.get(b);
      if (ca === cb){
        if (idx.get(b) === idx.get(a) + 1) return `M${A.cx} ${A.b}L${B.cx} ${B.t}`;
        const k = 10 + 3 * Math.min(idx.get(b) - idx.get(a), 5);
        return `M${A.l} ${A.cy}C${A.l - k} ${A.cy} ${B.l - k} ${B.cy} ${B.l} ${B.cy}`;
      }
      if (ca < cb){ const dx = Math.max(24, (B.l - A.r) / 2); return `M${A.r} ${A.cy}C${A.r + dx} ${A.cy} ${B.l - dx} ${B.cy} ${B.l} ${B.cy}`; }
      const dx = Math.max(24, (A.l - B.r) / 2); return `M${A.l} ${A.cy}C${A.l - dx} ${A.cy} ${B.r + dx} ${B.cy} ${B.r} ${B.cy}`;
    }
    let html = `<defs><marker id="ah" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L8 4L0 8z"/></marker>`
      + `<marker id="ah-on" class="on" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>`;
    const path = (a, b, cls) => { const on = lit(a, b); return `<path class="${cls}${on ? ' on' : dim(a, b) ? ' fade' : ''}" d="${d(a, b)}" marker-end="url(#${on ? 'ah-on' : 'ah'})"/>`; };
    // сначала тусклые, потом яркие — яркие ложатся сверху
    const all = M.edges.map(([a, b]) => [a, b, 'e']).concat((M.soft || []).map(s => [s.from, s.to, 'soft']));
    all.sort((x, y) => lit(x[0], x[1]) - lit(y[0], y[1]));
    svg.innerHTML = html + all.map(([a, b, c]) => path(a, b, c)).join('');
  }

  // ---------- панель навыка ----------
  const panel = $('panel'), pbody = $('p-body');
  let opener = null;
  const relBtn = (id, extra) => { const n = node.get(id), s = state.get(id);
    const tag = s === 'done' ? t('ui.done') : s === 'covered' ? t('ui.covered') : course[n.course].short;
    return `<li><button type="button" class="rel${s === 'done' || s === 'covered' ? ' ok' : ''}" data-go="${id}"><span>${tx(n.label)}${extra ? ` <span class="why">— ${tx(extra)}</span>` : ''}</span><small>${esc(tag)}</small></button></li>`; };
  function open(id, focusPanel = true){
    const n = node.get(id), c = course[n.course], lv = M.levels[n.level], s = state.get(id);
    if (sel && btn(sel)){ btn(sel).classList.remove('sel'); btn(sel).setAttribute('aria-expanded', 'false'); }
    sel = id; btn(id).classList.add('sel'); btn(id).setAttribute('aria-expanded', 'true');
    const where = n.steps.map(x => { const st = M.steps[x], ss = stepState(x);
      return `<li><a href="${st.url}">${tx(st.n)} · ${tx(st.title)}</a>${c.status === 'free' ? (ss === 2 ? ` <span class="tag free">${t('ui.done')}</span>` : ss === 1 ? ` <span class="tag">${t('ui.started')}</span>` : '') : ` <span class="tag ${c.status}">${tx(M.status[c.status])}</span>`}</li>`; }).join('');
    const need = ins.get(id), helps = softIn.get(id), opens = outs.get(id);
    let act;
    if (c.status === 'free') act = `<a class="btn" href="${stepUrl(id)}">${t(s === 'done' ? 'ui.repeat' : s === 'started' ? 'ui.continue' : 'ui.start')}</a>`;
    else if (c.status === 'soon') act = `<a class="btn waitlist" href="${c.url}#waitlist">${t('ui.waitlist')}</a>`;
    else act = `<a class="btn ghost" href="${c.url}">${t('ui.laterBtn')}</a>`;
    if (c.status === 'free') act += `<a class="btn ghost" href="${c.url}">${t('ui.toCourse')}</a>`;
    pbody.innerHTML = `<p class="chips"><span class="tag" style="box-shadow:inset 0 -3px 0 var(${c.color})">${tx(c.title)}</span><span class="tag ${c.status}">${tx(M.status[c.status])}</span>`
      + `<span class="chip"><span class="lvl l${n.level}" aria-hidden="true"></span><span class="vh">${t('ui.levelOf')}: </span>${tx(lv.name)}</span></p>`
      + `<h2 id="p-title" tabindex="-1">${tx(n.title)}</h2>`
      + `<h3>${t('ui.can')}</h3><p class="can">${tx(n.can)}</p>`
      + (n.main ? `<div class="plate mainp"><p><b>${t('ui.mainNote')}.</b> ${n.check ? t('ui.check') + ': ' + tx(n.check.charAt(0).toLowerCase() + n.check.slice(1)) : ''}</p></div>` : '')
      + (n.note ? `<div class="plate notep"><p>${tx(n.note)}</p></div>` : '')
      + `<h3>${t('ui.where')}</h3><ul>${where}</ul>`
      + (n.toy ? `<h3>${t('ui.toy')}</h3><p>${n.toy.url ? `<a href="${n.toy.url}">${tx(n.toy.name)}</a>` : `${tx(n.toy.name)} <span class="tag soon">${t('ui.soon')}</span>`}</p>` : '')
      + `<h3>${t('ui.needs')}</h3>` + (need.length ? `<ul>${need.map(x => relBtn(x)).join('')}</ul>` : `<p class="dim">${t('ui.needsNone')}</p>`)
      + (helps.length ? `<h3>${t('ui.helps')}</h3><ul>${helps.map(h => relBtn(h.from, h.why)).join('')}</ul>` : '')
      + (opens.length ? `<h3>${t('ui.opens')}</h3><ul>${opens.map(x => relBtn(x)).join('')}</ul>` : '')
      + `<p class="acts">${act}</p>`;
    if (panel.hidden && !opener) opener = btn(id);
    panel.hidden = false;
    drawEdges();
    if (metro) metro.select(id);
    if (focusPanel) $('p-title').focus({preventScroll: false});
  }
  function close(){
    if (!sel) return;
    const b = btn(sel); b.classList.remove('sel'); b.setAttribute('aria-expanded', 'false');
    panel.hidden = true; sel = null; drawEdges();
    if (metro) metro.select(null);
    (opener && opener.isConnected ? opener : b).focus(); opener = null; fromMetro = false;
  }
  cols.addEventListener('click', e => { const b = e.target.closest('.node'); if (!b) return; if (sel === b.dataset.id && !panel.hidden) close(); else { fromMetro = false; opener = b; open(b.dataset.id); } });
  pbody.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return;
    const id = b.dataset.go;
    if (fromMetro){ opener = metro.has(id) && !NARROW.matches ? metro.el(id) : opener; open(id); return; }   // со схемы — не уводим к графу
    btn(id).scrollIntoView({block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); opener = btn(id); open(id); });
  $('p-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  // ---------- схема метро ----------
  let fromMetro = false;
  const metro = window.SkillMetro ? window.SkillMetro.init({M, node, course, t, esc, typo, setRoute, route: () => route,
    openFrom(id, el){ if (sel === id && !panel.hidden) { close(); return; } fromMetro = true; opener = el; open(id); }}) : null;

  // ---------- старт ----------
  const q = new URL(location.href).searchParams.get('route');
  setRoute(q || '', false);
  const hash = decodeURIComponent(location.hash.slice(1));
  if (course[hash]) { const h = $(hash); requestAnimationFrame(() => { h.scrollIntoView({block: 'start'}); h.querySelector('h2 a').focus({preventScroll: true}); }); }
  else if (/^plan-/.test(hash) && $(hash)) requestAnimationFrame(() => $(hash).scrollIntoView({block: 'start'}));
  else if (node.has(hash)) { requestAnimationFrame(() => { btn(hash).scrollIntoView({block: 'center'}); open(hash, true); }); }
  const redraw = () => requestAnimationFrame(drawEdges);
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(cols); else addEventListener('resize', redraw);
  if (document.fonts) document.fonts.ready.then(redraw);
  NARROW.addEventListener ? NARROW.addEventListener('change', redraw) : NARROW.addListener(redraw);
  addEventListener('storage', paint);                       // прогресс из другой вкладки
  window.SkillMap = {paint, setRoute, open, close};
}
})();
