/* Тест уровня «Не знаешь, с чего начать?» на «Карте навыков» (/map/).
   Шесть вопросов по одному на экран: что ты делаешь с данными и пять быстрых проверок знаний по нарастающей.
   Итог — цель (маршрут из map/skills.json) и стартовая станция (навык этого маршрута); туда встаёт маркер «Ты здесь».
   Баллы не начисляются и не показываются. Ответы и итог — в localStorage (ключ STORE), только в этом браузере.
   Тексты — quiz.* в i18n/map.js. Проверка (каждый итог — настоящий маршрут и навык в нём, тексты есть): node tools/check-map.js.
   Здесь две части: QUIZ — данные и правило result(answers) (их же читает check-map.js), и SkillQuiz.init(api) — интерфейс. */
(function (root) {
'use strict';

const QUIZ = {
  store: 'map:quiz',
  // role — без правильного ответа; остальные — по нарастающей сложности, у каждой вариант «Не знаю» (засчитывается как «не знаю»)
  questions: [
    {id: 'role', opts: ['decide', 'calc', 'learn', 'interview']},
    {id: 'dice', opts: ['a', 'b', 'c', 'dunno'], right: 'b'},
    {id: 'aa', opts: ['a', 'b', 'c', 'dunno'], right: 'b'},
    {id: 'mde', opts: ['a', 'b', 'c', 'dunno'], right: 'b'},
    {id: 'peek', opts: ['a', 'b', 'c', 'dunno'], right: 'c'},
    {id: 'ratio', opts: ['a', 'b', 'c', 'dunno'], right: 'b'}
  ],
  // f — номер первой проверки с неверным ответом (0 — кубики … 4 — ratio; 5 — все верно)
  result(a){
    const checks = QUIZ.questions.filter(q => q.right), ok = id => a[id] === checks.find(q => q.id === id).right;
    let f = checks.findIndex(q => !ok(q.id)); if (f < 0) f = checks.length;
    const R = (goal, start) => ({goal, start});
    switch (a.role){
      case 'decide':                                    // формулы не нужны: кубики не важны, смотрим на A/A, MDE и подглядывание
        return R('decide', !ok('aa') ? 'ap-random' : !ok('mde') ? 'ap-width' : !ok('peek') ? 'ap-traps' : 'ap-decide');
      case 'calc':
        return f === 0 ? R('basics', 'vp-outcomes') : f === 1 ? R('basics', 'ss-noise') : f === 2 ? R('abtest', 'ss-aa')
          : f < 5 ? R('abtest', 'abm-design') : R('deep', 'ps-regression');
      case 'interview':
        return R('interview', ['vp-outcomes', 'vp-conditional', 'vp-interview'][f] || 'ss-wins');
      default:                                          // learn
        return f === 5 ? R('deep', 'ps-regression') : R('basics', ['vp-outcomes', 'vp-conditional', 'ss-noise', 'ss-wins', 'ps-interval'][f]);
    }
  }
};
root.SkillQuizData = QUIZ;
if (typeof document === 'undefined') return;

function load(){
  try { const v = JSON.parse(localStorage.getItem(QUIZ.store) || 'null'); return v && v.v === 1 ? v : null; } catch (e) { return null; }
}
function save(v){ try { localStorage.setItem(QUIZ.store, JSON.stringify(v)); } catch (e) {} }

root.SkillQuiz = {init, load: () => { const v = load(); return v && v.res || null; }};

function init(api){
  const {M, node, course, t, esc, setRoute} = api;
  const box = document.getElementById('quiz-body');
  if (!box) return;
  const Q = QUIZ.questions, total = Q.length;
  let st = load() || {v: 1, i: -1, a: {}, res: null};

  const optText = (q, o) => o === 'dunno' ? t('quiz.dunno') : t(`quiz.${q.id}.${o}`);
  const focusHead = () => { const h = box.querySelector('[data-focus]'); if (h) h.focus({preventScroll: true}); };

  function render(focus){
    if (st.res) box.innerHTML = resultHtml();
    else if (st.i < 0) box.innerHTML = `<p class="qz-lead">${t('quiz.lead')}</p><p class="qz-acts"><button type="button" class="btn" data-act="go">${t('quiz.go')}</button> <span class="qz-len">${t('quiz.len')}</span></p>`;
    else box.innerHTML = questionHtml(Q[st.i]);
    if (focus) focusHead();
  }
  function questionHtml(q){
    const pick = st.a[q.id], answered = pick !== undefined, last = st.i === total - 1;
    const opts = q.opts.map(o => {
      let cls = '';
      if (answered && q.right){ if (o === q.right) cls = ' ok'; else if (o === pick) cls = ' no'; }
      else if (answered && o === pick) cls = ' on';
      return `<li><button type="button" class="qz-opt${cls}" data-opt="${o}" aria-pressed="${o === pick}"${answered && q.right ? ' aria-disabled="true"' : ''}>${optText(q, o)}</button></li>`;
    }).join('');
    const fb = answered && q.right ? `<p class="qz-fb ${pick === q.right ? 'ok' : 'no'}" role="status"><b>${t(pick === q.right ? 'quiz.right' : 'quiz.wrong')}</b> ${t(`quiz.${q.id}.why`)}</p>` : '';
    return `<p class="qz-of">${t('quiz.of', {n: st.i + 1, total})}</p>`
      + `<div class="qz-bar" aria-hidden="true"><span style="width:${(st.i + (answered ? 1 : 0)) / total * 100}%"></span></div>`
      + `<h3 class="qz-q" tabindex="-1" data-focus>${t(`quiz.${q.id}.q`)}</h3>`
      + `<ul class="qz-opts" role="list" aria-label="${esc(t('quiz.opts'))}">${opts}</ul>${fb}`
      + `<p class="qz-acts">${st.i > 0 ? `<button type="button" class="btn ghost" data-act="back">${t('quiz.back')}</button> ` : ''}`
      + `<button type="button" class="btn" data-act="next"${answered ? '' : ' disabled'}>${t(last ? 'quiz.finish' : 'quiz.next')}</button></p>`;
  }
  function resultHtml(){
    const {goal, start} = st.res, r = M.routes.find(x => x.id === goal), n = node.get(start), c = course[n.course], step = M.steps[n.steps[0]];
    const stepName = step.n.charAt(0).toLowerCase() + step.n.slice(1);
    const act = c.status === 'free' ? `<a class="btn" href="${step.url}">${t('quiz.open')}</a>` : `<a class="btn ghost" href="${c.url}#waitlist">${t('quiz.wait')}</a>`;
    return `<p class="qz-of">${t('quiz.res.label')}</p>`
      + `<h3 class="qz-q" tabindex="-1" data-focus>${t('quiz.res.goal', {goal: esc(r.label)})}</h3>`
      + `<p class="qz-start">${t('quiz.res.start', {course: esc(c.title), step: esc(stepName), label: esc(n.label)})}</p>`
      + `<p class="qz-why">${t('quiz.why.' + goal)}</p>`
      + `<p class="qz-note">${t('quiz.res.note')}</p>`
      + `<p class="qz-acts"><button type="button" class="btn" data-act="show">${t('quiz.show')}</button> ${act} <button type="button" class="btn ghost" data-act="again">${t('quiz.again')}</button></p>`;
  }

  box.addEventListener('click', e => {
    const o = e.target.closest('[data-opt]');
    if (o){
      const q = Q[st.i];
      if (q.right && st.a[q.id] !== undefined) return;          // проверку знаний не переигрываем: ответ уже показан
      st.a[q.id] = o.dataset.opt; save(st); render(false);
      const nx = box.querySelector('[data-act="next"]'); if (nx) nx.focus({preventScroll: true});
      return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'go'){ st.i = 0; save(st); render(true); }
    else if (act === 'back'){ st.i = Math.max(0, st.i - 1); save(st); render(true); }
    else if (act === 'next'){
      if (st.i < total - 1){ st.i++; save(st); render(true); }
      else { st.res = QUIZ.result(st.a); save(st); render(true); setRoute(st.res.goal, true); }
    }
    else if (act === 'again'){ st = {v: 1, i: 0, a: {}, res: null}; save(st); render(true); api.repaint(); }
    else if (act === 'show'){
      setRoute(st.res.goal, true);
      const m = document.getElementById('metro-h');
      m.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
  });
  render(false);
  return {result: () => st.res};
}
})(typeof window !== 'undefined' ? window : globalThis);
