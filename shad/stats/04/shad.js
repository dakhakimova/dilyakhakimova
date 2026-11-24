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
