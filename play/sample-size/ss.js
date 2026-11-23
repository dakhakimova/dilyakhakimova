/* /play/sample-size/ — «зафиксируй два, третье посчитаю» (n на группу · MDE · мощность), срок в днях и дата окончания.
   Принимает «4», «4%», «0.04», «4,5» — и пишет, как понял число («Audit, don't edit», Купер). Значение за границей
   не отвергает, а прижимает к границе с пояснением. Ввод запоминается (localStorage) и попадает в адрес страницы —
   расчётом можно поделиться ссылкой. Пересчёт мгновенный, кнопки «Рассчитать» нет. Сброс — с отменой на 10 секунд. */
(function(){
  const $ = id => document.getElementById(id);
  const DEF = {mode: 'n', metric: 'share', base: 4, mean: 850, sd: 1200, rx: 1.2, sx: 2, ry: 10, sy: 12, rho: 0.6, mde: 5, pow: 80, n: 100000, traffic: 20000, split: 50, alpha: 0.05, sides: 'two'};
  const KEY = 'dk:sample-size', RECENT = 'dk:sample-size:recent';
  const nf = (x, d = 0) => { const s = (+x).toFixed(d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'); const [i, f] = s.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? '.' + f : ''); };
  // нормальное распределение
  const cdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  const inv = p => { let lo = -8, hi = 8; for (let i = 0; i < 80; i++){ const m = (lo + hi) / 2; cdf(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; };
  // доля: дисперсии p(1 − p) и p2(1 − p2); среднее: обе группы с одним стандартным отклонением sd
  const v2 = (p, rel) => {   // n дальше — всего в эксперименте; доля теста q = split, контроля 1 − q
   const r = st.sides === 'left' ? -rel : rel; return st.metric !== 'share' ? [st.sd * st.sd, st.sd * st.sd, st.mean * rel] : [p * (1 - p), p * (1 + r) * (1 - p * (1 + r)), p * rel]; };   // левосторонний: ждём падения
  const za = a => inv(1 - (st.sides === 'two' ? a / 2 : a));   // односторонний тест: весь α в одном хвосте
  const qT = () => st.split / 100;
  const nFor = (p, rel, pow, a) => { const [s1, s2, d] = v2(p, rel), q = qT(); return Math.ceil(Math.pow(za(a) + inv(pow), 2) * (s1 / (1 - q) + s2 / q) / (d * d)); };
  const powFor = (p, rel, n, a) => { const [s1, s2, d] = v2(p, rel), q = qT(); return cdf(Math.abs(d) / Math.sqrt(s1 / (n * (1 - q)) + s2 / (n * q)) - za(a)); };
  const mdeFor = (p, n, pow, a) => { let lo = 1e-4, hi = st.metric !== 'share' ? 20 : Math.min(20, (1 - p) / p); for (let i = 0; i < 70; i++){ const m = (lo + hi) / 2; powFor(p, m, n, a) < pow ? lo = m : hi = m; } return hi; };
  // разбор ввода: «4», «4%», «0.04» (доля), «4,5»; доли меньше 1 у процентов читаем как долю
  const parse = (raw, kind) => {
    const s = String(raw).trim().replace(/\s| /g, '').replace(',', '.'); const pct = /%$/.test(s);
    let v = parseFloat(s.replace('%', '')); if (!Number.isFinite(v)) return null;
    let how = '';
    if (kind === 'pct' && !pct && v > 0 && v < 1){ v = v * 100; how = 'доля → '; }
    return {v, how};
  };
  const LIM = {base: [0.01, 99], mean: [1e-6, 1e12], sd: [1e-6, 1e12], rx: [1e-9, 1e12], sx: [1e-9, 1e12], ry: [1e-9, 1e12], sy: [1e-9, 1e12], rho: [-0.99, 0.99], mde: [0.1, 500], pow: [5, 99.9], split: [1, 99], n: [10, 1e9], traffic: [1, 1e9]};
  let st = Object.assign({}, DEF);
  // обновление страницы — снова пример (как в калькуляторе SRM); ссылка с числами читается один раз
  const q = new URLSearchParams(location.search); const fromLink = [...q.keys()].some(k => k in DEF); q.delete('mode'); for (const k of Object.keys(DEF)) if (q.has(k)) st[k] = ['mode', 'metric', 'sides'].includes(k) ? q.get(k) : +q.get(k);
  if (location.search) history.replaceState(null, '', location.pathname);
  const touched = new Set(fromLink ? Object.keys(DEF).filter(k => k !== 'traffic' || q.has('traffic')) : []);   // пока поле не трогали, в нём бледный пример
  const fields = {base: $('ss-base'), mean: $('ss-mean'), sd: $('ss-sd'), rx: $('ss-rx'), sx: $('ss-sx'), ry: $('ss-ry'), sy: $('ss-sy'), rho: $('ss-rho'), mde: $('ss-mde'), pow: $('ss-pow'), n: $('ss-n'), traffic: $('ss-traffic'), split: $('ss-split')};
  Object.keys(fields).forEach(k => { if (!fields[k]) delete fields[k]; });   // поля, которых нет на странице (всего в эксперименте — только в итоге)
  const fmt = {base: v => nf(v, 2) + '%', mean: v => nf(v, v < 10 ? 2 : v < 100 ? 1 : 0), sd: v => nf(v, v < 10 ? 2 : v < 100 ? 1 : 0), rx: v => nf(v, 2), sx: v => nf(v, 2), ry: v => nf(v, 2), sy: v => nf(v, 2), rho: v => nf(v, 2), mde: v => nf(v, 1) + '%', pow: v => nf(v, 1) + '%', n: v => nf(v), traffic: v => nf(v), split: v => nf(v, 1) + '%'};
  const heard = {};
  const read = k => {
    const r = parse(fields[k].value, k === 'n' || k === 'traffic' || ['mean', 'sd', 'rx', 'sx', 'ry', 'sy', 'rho'].includes(k) ? 'int' : 'pct');
    if (!r){ heard[k] = 'не понял «' + fields[k].value + '» — оставил ' + fmt[k](st[k]); return; }
    let v = r.v, [lo, hi] = LIM[k], note = r.how ? 'понял как ' + fmt[k](v) : '';
    if (v < lo || v > hi){ const c = Math.min(hi, Math.max(lo, v)); note = 'прижал к границе: ' + fmt[k](c) + ', можно от ' + fmt[k](lo) + ' до ' + fmt[k](hi); v = c; }
    if (k === 'n' || k === 'traffic') v = Math.round(v);
    st[k] = v; heard[k] = note;
  };
  const date = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'}); };
  const days = n => Math.ceil(n / st.traffic);
  const daysW = d => d + ' ' + (d % 10 === 1 && d % 100 !== 11 ? 'день' : d % 10 >= 2 && d % 10 <= 4 && (d % 100 < 10 || d % 100 >= 20) ? 'дня' : 'дней');
  // отношение R = X̄ / Ȳ; стандартное отклонение на пользователя по дельта-методу: σR = √(σX² − 2R·ρ·σX·σY + R²·σY²) / Ȳ
  const ratioSd = () => { const R = st.rx / st.ry; return Math.sqrt(Math.max(0, st.sx ** 2 - 2 * R * st.rho * st.sx * st.sy + R * R * st.sy ** 2)) / st.ry; };
  function calc(){
    if (st.metric === 'ratio'){ st.mean = st.rx / st.ry; st.sd = ratioSd(); }
    const p = st.base / 100, a = st.alpha;
    if (st.mode === 'n') st.n = nFor(p, st.mde / 100, st.pow / 100, a);
    else if (st.mode === 'mde') st.mde = +(100 * mdeFor(p, st.n, st.pow / 100, a)).toFixed(2);
    else st.pow = +(100 * powFor(p, st.mde / 100, st.n, a)).toFixed(1);
  }
  function render(focusKeep){
    for (const k of Object.keys(fields)){
      const calcd = (k === st.mode) || (k === 'pow' && st.mode === 'pow');
      fields[k].readOnly = calcd; fields[k].classList.toggle('calc', calcd); fields[k].classList.toggle('ex', !calcd && !touched.has(k));
      fields[k].setAttribute('aria-label', calcd ? 'посчитано' : '');
      if (k !== focusKeep) fields[k].value = k === 'traffic' && !touched.has('traffic') ? '' : fmt[k](st[k]).replace(/ /g, ' ');   // трафик не подставляем: пока не введён, дней нет
    }
    document.querySelectorAll('.ss-mode [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === st.mode)));
    document.querySelectorAll('[data-alpha]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.alpha === st.alpha)));
    document.querySelectorAll('[data-sides]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.sides === st.sides)));
    const ml = $('ss-mde-l'); if (ml) ml.textContent = st.sides === 'left' ? 'Хочу заметить падение на' : 'Хочу заметить рост на';
    document.querySelectorAll('[data-pmetric]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.pmetric === st.metric)));
    document.querySelectorAll('[data-pm]').forEach(e => { e.hidden = !e.dataset.pm.split(' ').includes(st.metric); });
    document.querySelectorAll('[data-pml]').forEach(e => { e.hidden = e.dataset.pml !== st.metric; });
    const p = st.base, abs = p * st.mde / 100, am = st.mean * st.mde / 100;
    const rv = $('ss-rvar'); if (rv && st.metric === 'ratio') rv.textContent = nf(ratioSd(), 4) + ' на пользователя — посчитано дельта-методом; отношение ' + nf(st.rx / st.ry, 4);
    const vv = $('ss-var'); if (vv){ const q = st.base / 100; vv.textContent = 'σ = √(p · (1 − p)) = √(' + nf(q, 4) + ' · ' + nf(1 - q, 4) + ') = ' + nf(Math.sqrt(q * (1 - q)), 3) + ' на пользователя'; }
    const lines = [st.metric !== 'share'
      ? (st.metric === 'ratio' ? 'Отношение ' : 'Среднее ') + fmt.mean(st.mean) + ', ' + (st.sides === 'left' ? 'падение' : 'рост') + ' на ' + fmt.mde(st.mde) + ' относительных = ' + (st.sides === 'left' ? '−' : '+') + '' + nf(am, am < 10 ? 2 : 1) + ': с ' + fmt.mean(st.mean) + ' до ' + fmt.mean(st.mean + (st.sides === 'left' ? -am : am))
      : 'Доля ' + fmt.base(p) + ', ' + (st.sides === 'left' ? 'падение' : 'рост') + ' на ' + fmt.mde(st.mde) + ' относительных = ' + (st.sides === 'left' ? '−' : '+') + '' + nf(abs, 3) + ' п.\u00a0п.: с ' + fmt.base(p) + ' до ' + nf(p + (st.sides === 'left' ? -abs : abs), 3) + '%'];
    if (st.sides !== 'two' || st.split !== 50) lines.push((st.sides === 'two' ? 'Ждём изменения в любую сторону' : 'Ждём только ' + (st.sides === 'left' ? 'падения' : 'роста')) + ', группы ' + nf(100 - st.split, 1) + ' на ' + nf(st.split, 1) + ' — меняется в «Дополнительно»');
    Object.entries(heard).forEach(([k, v]) => { if (v) lines.push({base: 'Доля', mean: 'Среднее', sd: 'Стандартное отклонение', mde: 'MDE', pow: 'Мощность', n: 'Всего в эксперименте', traffic: 'Трафик', split: 'Доля теста'}[k] + ': ' + v); });
    $('ss-heard').innerHTML = lines.map(l => '<li>' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>').join('');
    const hasT = touched.has('traffic') && st.traffic > 0, d = hasT ? days(st.n) : 0;
    const nT = Math.round(st.n * qT()), nC = st.n - nT;
    $('ss-big').innerHTML = st.mode === 'n' ? '<b>' + nf(st.n) + '</b> человек всего: ' + nf(nC) + ' в контроле и ' + nf(nT) + ' в тесте' : st.mode === 'mde' ? 'Заметит рост от <b>' + fmt.mde(st.mde) + '</b> относительных' : 'Мощность <b>' + fmt.pow(st.pow) + '</b>';
    $('ss-when').textContent = hasT ? 'При ' + nf(st.traffic) + ' человек в день это ' + daysW(d) + ' — тест закончится ' + date(d) + '.' : 'Впиши трафик — посчитаю, сколько дней держать тест и когда он закончится.';
    const warn = [];
    if (st.split < 10 || st.split > 90) warn.push('доля теста ' + fmt.split(st.split) + ': при сильно неравных группах нужно больше людей, а точнее всего мерить при 50 на 50');
    if (st.n > 2e7) warn.push('больше 20 миллионов в эксперименте — точно ли такой маленький эффект важен?');
    if (hasT && d > 90) warn.push('дольше 90 дней: за это время сменятся сезон и сама аудитория');
    if (st.mde > 100) warn.push('рост больше чем вдвое — обычно MDE в A/B-тестах от 1 до 20%');
    if (st.metric === 'share' && st.base >= 30) warn.push('доля ' + fmt.base(st.base) + ' — не имелась ли в виду ' + nf(st.base / 100, 2) + '%?');
    if (st.metric !== 'share' && st.sd > 10 * st.mean) warn.push('стандартное отклонение в 10 раз больше среднего — проверь выбросы');
    if (st.mode === 'pow' && st.pow < 50) warn.push('мощность ниже 50%: тест чаще пропустит эффект, чем заметит');
    $('ss-warn').hidden = !warn.length; $('ss-warn').textContent = warn.length ? 'Проверь: ' + warn.join('; ') + '.' : '';
    // «что если»
    const p0 = st.base / 100;
    const th = document.querySelector('.ss-table thead tr'); if (th) th.innerHTML = '<th>MDE</th><th class="num">всего людей</th>' + (hasT ? '<th class="num">дней</th>' : '');
    $('ss-what').innerHTML = [...new Set([0.1, 0.25, 0.5, 1, 2, 3, 5, 10, +st.mde.toFixed(2)])].sort((x, y) => x - y).map(m => { const n = nFor(p0, m / 100, st.mode === 'pow' ? 0.8 : st.pow / 100, st.alpha); return `<tr${Math.abs(m - st.mde) < 0.01 ? ' class="cur"' : ''}><td>${nf(m, 2)}%</td><td class="num">${nf(n)}</td>${hasT ? '<td class="num">' + nf(days(n)) + '</td>' : ''}</tr>`; }).join('');
    drawCurve();
    // ссылка на расчёт — собирается при копировании, адрес страницы не меняем
  }

  // ---------- график: MDE от числа людей, отсечка — текущий расчёт; отсечку можно тянуть ----------
  const svg = $('ss-curve'); let XMAX = 0, YMAX = 0, SIG = '', dragging = false;
  const W = 560, H = 260, L = 52, R = 16, T = 30, B = 40;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, par) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (par || svg).appendChild(e); return e; };
  const niceUp = x => { const e = Math.pow(10, Math.floor(Math.log10(x))); return [1, 2, 2.5, 5, 10].map(m => m * e).find(v => v >= x); };
  const short = n => n >= 1e6 ? nf(n / 1e6, n < 1e7 ? 1 : 0) + ' млн' : n >= 1e3 ? nf(n / 1e3, n < 1e4 ? 1 : 0) + ' тыс.' : nf(n);
  function drawCurve(){
    if (!svg) return;
    const p = st.base / 100, a = st.alpha, pw = st.pow / 100;
    // масштаб не зависит от положения отсечки: пересчитываем, только когда поменялись исходные данные
    // (метрика, её значение, разброс, α, мощность, сторона, сплит) или точка ушла за край графика
    const sig = [st.metric, st.base, st.mean, st.sd, st.rx, st.ry, st.sx, st.sy, st.rho, st.alpha, st.pow, st.sides, st.split].join('|');
    const outside = XMAX && (st.n > XMAX || st.mde > YMAX);
    if (!XMAX || (!dragging && (sig !== SIG || outside))){ XMAX = niceUp(Math.max(st.n * 2.5, 100)); YMAX = 0; SIG = sig; }
    const mAt = n => 100 * mdeFor(p, n, pw, a);
    const N0 = XMAX / 60; if (!YMAX) YMAX = Math.min(niceUp(Math.max(st.mde * 3, mAt(XMAX / 8))), 500);
    const sx = n => L + n / XMAX * (W - L - R), sy = m => T + (1 - Math.min(m, YMAX) / YMAX) * (H - T - B);
    svg.textContent = '';
    for (let i = 0; i <= 4; i++){ const y = YMAX * i / 4; el('line', {x1: L, x2: W - R, y1: sy(y), y2: sy(y), stroke: 'rgba(0,0,0,.07)'}); const t = el('text', {x: L - 8, y: sy(y) + 4, 'text-anchor': 'end', class: 'ax'}); t.textContent = nf(y, y < 10 ? 1 : 0) + '%'; }
    for (let i = 0; i <= 4; i++){ const x = XMAX * i / 4; const t = el('text', {x: sx(x), y: H - B + 18, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle', class: 'ax'}); t.textContent = i ? short(x) : '0'; }
    const tl = el('text', {x: W - R, y: H - 4, 'text-anchor': 'end', class: 'ax'}); tl.textContent = 'людей в эксперименте →';
    let d = ''; for (let i = 0; i <= 120; i++){ const n = N0 + (XMAX - N0) * Math.pow(i / 120, 1.8), m = mAt(n); if (m > YMAX) continue; d += (d ? 'L' : 'M') + sx(n).toFixed(1) + ' ' + sy(m).toFixed(1); }
    const ty = el('text', {x: L - 8, y: 12, 'text-anchor': 'end', class: 'ax'}); ty.textContent = 'MDE ↑';
    el('path', {d, fill: 'none', stroke: '#23418A', 'stroke-width': 2.5});
    const cx = sx(Math.min(st.n, XMAX)), cy = sy(st.mde);
    el('line', {x1: cx, x2: cx, y1: cy, y2: H - B, stroke: '#E8644A', 'stroke-dasharray': '4 4', 'stroke-width': 1.5});
    el('line', {x1: L, x2: cx, y1: cy, y2: cy, stroke: '#E8644A', 'stroke-dasharray': '4 4', 'stroke-width': 1.5});
    el('circle', {cx, cy, r: 7, fill: '#E8644A', stroke: '#fff', 'stroke-width': 2, class: 'knob'});
    const lb = el('text', {x: cx + (cx > W * 0.6 ? -12 : 12), y: cy - 12, 'text-anchor': cx > W * 0.6 ? 'end' : 'start', class: 'lbl'});
    lb.textContent = 'MDE ' + fmt.mde(st.mde) + ' · ' + short(st.n) + (touched.has('traffic') && st.traffic > 0 ? ' · ' + daysW(days(st.n)) : '');
  }
  if (svg){
    svg.setAttribute('tabindex', '0');
    const toN = ev => { const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W; let n = Math.max(XMAX / 60, Math.min(XMAX, (x - L) / (W - L - R) * XMAX)); while (n < XMAX && 100 * mdeFor(st.base / 100, n, st.pow / 100, st.alpha) > YMAX) n *= 1.02; return n; };
    const setN = n => { st.mode = 'n'; st.mde = +(100 * mdeFor(st.base / 100, n, st.pow / 100, st.alpha)).toFixed(2); touched.add('mde'); calc(); render(); };   // тянем отсечку — меняется MDE, размер выборки пересчитывается
    svg.addEventListener('pointerdown', ev => { ev.preventDefault(); dragging = true; svg.setPointerCapture(ev.pointerId); setN(toN(ev)); });
    svg.addEventListener('pointermove', ev => { if (dragging) setN(toN(ev)); });
    const stop = () => { if (dragging){ dragging = false; render(); } };
    svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
    svg.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft'){ ev.preventDefault(); dragging = true; setN(st.n * (ev.key === 'ArrowRight' ? 1.05 : 1 / 1.05)); dragging = false; } });
  }
  Object.entries(fields).forEach(([k, el]) => {
    el.addEventListener('input', () => { if (el.readOnly) return; touched.add(k); read(k); calc(); render(k); });
    el.addEventListener('focus', () => { if (!el.readOnly) setTimeout(() => el.select(), 0); });
    el.addEventListener('blur', () => render());
  });
  document.querySelectorAll('.ss-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; calc(); render(); }));
  document.querySelectorAll('[data-alpha]').forEach(b => b.addEventListener('click', () => { st.alpha = +b.dataset.alpha; calc(); render(); }));
  document.querySelectorAll('[data-sides]').forEach(b => b.addEventListener('click', () => { st.sides = b.dataset.sides; calc(); render(); }));
  document.querySelectorAll('[data-pmetric]').forEach(b => b.addEventListener('click', () => {
    st.metric = b.dataset.pmetric;
    if (st.metric === 'mean'){ if (!touched.has('mean')) st.mean = 850; if (!touched.has('sd')) st.sd = 1200; }
    calc(); render();
  }));
  calc(); render();
  // «Скопировать ссылку на расчёт» — адрес страницы уже содержит все числа
  const cp = $('ss-copy');
  if (cp) cp.addEventListener('click', async () => { const note = $('ss-undo'); const u = new URLSearchParams(); for (const k of Object.keys(DEF)) if (k !== 'traffic' || touched.has('traffic')) u.set(k, st[k]); const link = location.origin + location.pathname + '?' + u; try { await navigator.clipboard.writeText(link); if (note) note.textContent = 'Ссылка скопирована.'; } catch(e) { if (note) note.textContent = link; } });
})();
