/* Занятие 4 ШАД: общие помощники поверх /signal/book.js.
   Проверка ответа: <div class="check" data-ans="20" data-tol="0.5" data-unit="%" data-ok="…" data-hint="…"><label>…</label></div>
   — поле и кнопка дорисовываются сами; принимаются запятая и точка, знак % можно не писать.
   Несколько верных ответов: data-ans="20|21". Если ответ — отрезок, data-min / data-max. */
(function(){
  const parse = s => { s = String(s).trim().replace(/\s+/g, '').replace(',', '.').replace(/%$/, '').replace(/^\+/, '').replace('−', '-'); return s === '' || isNaN(+s) ? null : +s; };
  document.querySelectorAll('.check').forEach((box, i) => {
    const id = 'chk-' + i, lab = box.querySelector('label');
    if (lab) lab.setAttribute('for', id);
    const inp = document.createElement('input'); inp.id = id; inp.inputMode = 'decimal'; inp.autocomplete = 'off';
    const unit = box.dataset.unit ? Object.assign(document.createElement('span'), {className: 'unit', textContent: box.dataset.unit}) : null;
    const btn = Object.assign(document.createElement('button'), {type: 'button', className: 'btn ghost', textContent: 'Проверить'});
    const fb = Object.assign(document.createElement('p'), {className: 'fb'}); fb.setAttribute('role', 'status');
    box.append(inp); if (unit) box.append(unit); box.append(btn, fb);
    const tol = +(box.dataset.tol || 0), answers = (box.dataset.ans || '').split('|').filter(Boolean).map(Number);
    const ok = v => box.dataset.min != null ? v >= +box.dataset.min && v <= +box.dataset.max : answers.some(a => Math.abs(v - a) <= tol + 1e-9);
    const run = () => {
      const v = parse(inp.value);
      box.classList.remove('ok', 'bad');
      if (v === null){ fb.textContent = 'Впиши число.'; inp.focus(); return; }
      if (ok(v)){ box.classList.add('ok'); fb.textContent = box.dataset.ok || 'Верно!'; }
      else { box.classList.add('bad'); fb.textContent = 'Пока не сходится. ' + (box.dataset.hint || 'Проверь расчёт или открой решение ниже.'); inp.focus(); }
    };
    btn.addEventListener('click', run);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  });
  // кнопка-ступенька: <span class="stepper" data-min data-max data-v><button>−</button><output></output><button>+</button></span>
  window.Stepper = (el, onChange) => {
    const min = +el.dataset.min, max = +el.dataset.max, out = el.querySelector('output'), [m, p] = el.querySelectorAll('button');
    let v = +el.dataset.v;
    const set = x => { v = Math.max(min, Math.min(max, x)); out.textContent = v; m.disabled = v <= min; p.disabled = v >= max; onChange(v); };
    m.addEventListener('click', () => set(v - 1)); p.addEventListener('click', () => set(v + 1));
    set(v);
    return {get: () => v, set};
  };
})();

// Слайды для живой лекции: подписи на графиках крупнее, чем в книге (15 px вместо 12)
(function(){
  if (typeof window.canvas !== 'function') return;
  const base = window.canvas;
  window.canvas = function(){ const g = base.apply(this, arguments); if (g && g.c) g.c.font = '15px Onest, system-ui, sans-serif'; return g; };
})();

// Формулы в текстах, которые пишут игры (.out и отклики): \( … \) → KaTeX прямо в браузере
(function(){
  const K = () => window.katex;
  const R = el => { if (!K() || !el.innerHTML.includes('\\(')) return; el.innerHTML = el.innerHTML.replace(/\\\((.+?)\\\)/g, (_, t) => K().renderToString(t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), {throwOnError: false, strict: 'ignore'})); };
  const watch = el => { R(el); new MutationObserver(() => R(el)).observe(el, {childList: true, characterData: true, subtree: true}); };
  const go = () => document.querySelectorAll('.out, .qfb, p.fb, .why').forEach(watch);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  document.addEventListener('click', () => setTimeout(() => document.querySelectorAll('.qfb, p.fb').forEach(R), 0));
})();

// Калькулятор биномиальных вероятностей: <div class="calc" data-kind="binom" data-n data-k data-p data-m></div>
(function(){
  const K = (t, d) => window.katex ? window.katex.renderToString(t, {throwOnError: false, displayMode: !!d}) : t;
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const pct = v => v < 1e-4 ? v.toExponential(2).replace('e', '·10^{') + '}' : (Math.round(v * 10000) / 100) + '\\%';
  function build(el){
    const d = el.dataset;
    el.innerHTML = '<p class="calc-h">Калькулятор: биномиальное распределение</p>' +
      '<div class="calc-row"><label>​<span class="tx-i">' + K('n') + '</span> = <input type="number" min="1" max="2000" step="1" data-f="n" value="' + (d.n || 14) + '"></label>' +
      '<label><span class="tx-i">' + K('p') + '</span> = <input type="number" min="0" max="1" step="0.01" data-f="p" value="' + (d.p || 0.5) + '"></label>' +
      '<label><select data-f="op"><option value="ge">' + 'P(X ≥ k)' + '</option><option value="le">P(X ≤ k)</option><option value="eq">P(X = k)</option></select></label>' +
      '<label><span class="tx-i">' + K('k') + '</span> = <input type="number" min="0" step="1" data-f="k" value="' + (d.k || 12) + '"></label></div>' +
      '<div class="calc-out"></div>' +
      (d.m ? '<div class="calc-row"><label>«Оракулов» <span class="tx-i">' + K('m') + '</span> = <input type="number" min="1" max="10000" step="1" data-f="m" value="' + d.m + '"></label></div><div class="calc-out2"></div>' : '');
    const f = k => el.querySelector('[data-f="' + k + '"]');
    function go(){
      const n = Math.max(1, Math.round(+f('n').value)), p = Math.min(1, Math.max(0, +String(f('p').value).replace(',', '.'))), k = Math.max(0, Math.min(n, Math.round(+f('k').value))), op = f('op').value;
      let lo = op === 'ge' ? k : op === 'le' ? 0 : k, hi = op === 'ge' ? n : op === 'le' ? k : k, s = 0; const terms = [];
      for (let i = lo; i <= hi; i++){ s += C(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i); if (terms.length < 4) terms.push('C_{' + n + '}^{' + i + '}'); }
      const sym = op === 'ge' ? '\\ge' : op === 'le' ? '\\le' : '=';
      let tex = 'P(X ' + sym + ' ' + k + ') = ';
      if (p === 0.5){ const cnt = []; for (let i = lo; i <= hi && cnt.length < 4; i++) cnt.push(Math.round(C(n, i))); const tot = Math.round(s * Math.pow(2, n));
        tex += '\\frac{' + cnt.join(' + ') + (hi - lo + 1 > 4 ? ' + \\dots' : '') + '}{2^{' + n + '}} = \\frac{' + tot + '}{' + Math.round(Math.pow(2, n)) + '} \\approx ' + pct(s); }
      else tex += '\\sum_{i=' + lo + '}^{' + hi + '} C_{' + n + '}^{i}\\, ' + p + '^{i}\\, ' + (Math.round((1 - p) * 1e6) / 1e6) + '^{' + n + '-i} \\approx ' + pct(s);
      el.querySelector('.calc-out').innerHTML = K(tex, true);
      if (d.m){ const m = Math.max(1, Math.round(+f('m').value)), q = 1 - Math.pow(1 - s, m);
        el.querySelector('.calc-out2').innerHTML = K('P(\\text{хотя бы один из } ' + m + ') = 1 - (1 - ' + (Math.round(s * 1e4) / 1e4) + ')^{' + m + '} \\approx ' + pct(q), true); }
    }
    el.addEventListener('input', go); el.addEventListener('change', go); go();
  }
  const init = () => document.querySelectorAll('.calc[data-kind="binom"]').forEach(build);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();

// Калькулятор на каждом слайде: кнопка «Калькулятор» в шапке, выражения вида 2^10, C(14,12), 1-(1-0.0065)^50, sqrt(2/100), Phi(1.96)
(function(){
  const fact = n => { n = Math.round(n); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const C = (n, k) => { n = Math.round(n); k = Math.round(k); if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r * 1e6) / 1e6 === Math.round(r) ? Math.round(r) : r; };
  const Phi = z => (typeof normCdf === 'function') ? normCdf(z) : NaN;
  function ev(src){
    let s = String(src).replace(/[Сс]/g, 'C').replace(/\bc\(/g, 'C(').replace(/[Хх]/g, '*').replace(/C\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)/g, 'C($1;$2)').replace(/,/g, '.').replace(/[×·]/g, '*').replace(/−/g, '-').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    s = s.replace(/;/g, ',');
    if (!/^[0-9+\-*/^().!,a-zA-Zπ%]*$/.test(s)) throw 0;
    const words = s.match(/[a-zA-Zπ]+/g) || [];
    if (words.some(w => !['C', 'sqrt', 'ln', 'log', 'exp', 'pi', 'e', 'Phi', 'π'].includes(w))) throw 0;
    s = s.replace(/(\d+(?:\.\d+)?|\))!/g, 'fact($1)').replace(/\^/g, '**').replace(/π|\bpi\b/g, 'Math.PI').replace(/\bsqrt\b/g, 'Math.sqrt').replace(/\bln\b/g, 'Math.log').replace(/\blog\b/g, 'Math.log10').replace(/\bexp\b/g, 'Math.exp').replace(/\be\b/g, 'Math.E').replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    return Function('C', 'fact', 'Phi', '"use strict"; return (' + s + ');')(C, fact, Phi);
  }
  const fmt = v => !isFinite(v) ? '—' : Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-4 && v !== 0) ? v.toExponential(4) : String(Math.round(v * 1e6) / 1e6);
  function init(){
    const head = document.querySelector('.stage-head'); if (!head) return;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'toggle calc-btn'; btn.textContent = '🧮 Калькулятор'; btn.setAttribute('aria-expanded', 'false');
    head.appendChild(btn);
    const box = document.createElement('div'); box.className = 'calc-pop'; box.hidden = true;
    box.innerHTML = '<div class="calc-line"><input type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="например 2^10, C(14,12), 1-(1-0.0065)^50"><button type="button" class="btn calc-eq">=</button><button type="button" class="btn ghost calc-clr">Очистить</button></div><ol class="calc-hist"></ol><p class="calc-help">Можно: + − × / ^, скобки, C(n,k), n!, sqrt(), ln(), exp(), Phi(z), проценты 5%. Esc — стереть строку.</p>';
    head.after(box);
    const inp = box.querySelector('input'), hist = box.querySelector('.calc-hist');
    const run = () => { const t = inp.value.trim(); if (!t) return; let r; try { r = fmt(ev(t)); } catch (e) { r = 'не понимаю выражение'; } const li = document.createElement('li'); li.innerHTML = '<span class="q"></span> = <b></b>'; li.querySelector('.q').textContent = t; li.querySelector('b').textContent = r; hist.prepend(li); while (hist.children.length > 6) hist.lastChild.remove(); inp.select(); };
    box.querySelector('.calc-eq').addEventListener('click', run);
    box.querySelector('.calc-clr').addEventListener('click', () => { inp.value = ''; hist.innerHTML = ''; inp.focus(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); if (e.key === 'Escape'){ inp.value = ''; } e.stopPropagation(); });
    btn.addEventListener('click', () => { box.hidden = !box.hidden; btn.setAttribute('aria-expanded', String(!box.hidden)); if (!box.hidden) inp.focus(); });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
