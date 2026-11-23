/* /play/sample-size/ — «зафиксируй два, третье посчитаю» (n на группу · MDE · мощность), срок в днях и дата окончания.
   Принимает «4», «4%», «0.04», «4,5» — и пишет, как понял число («Audit, don't edit», Купер). Значение за границей
   не отвергает, а прижимает к границе с пояснением. Ввод запоминается (localStorage) и попадает в адрес страницы —
   расчётом можно поделиться ссылкой. Пересчёт мгновенный, кнопки «Рассчитать» нет. Сброс — с отменой на 10 секунд. */
(function(){
  const $ = id => document.getElementById(id);
  const DEF = {mode: 'n', base: 4, mde: 5, pow: 80, n: 50000, traffic: 20000, alpha: 0.05};
  const KEY = 'dk:sample-size', RECENT = 'dk:sample-size:recent';
  const nf = (x, d = 0) => { const s = (+x).toFixed(d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1'); const [i, f] = s.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? '.' + f : ''); };
  // нормальное распределение
  const cdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  const inv = p => { let lo = -8, hi = 8; for (let i = 0; i < 80; i++){ const m = (lo + hi) / 2; cdf(m) < p ? lo = m : hi = m; } return (lo + hi) / 2; };
  const nFor = (p, rel, pow, a) => { const p2 = p * (1 + rel), d = p2 - p; return Math.ceil(Math.pow(inv(1 - a / 2) + inv(pow), 2) * (p * (1 - p) + p2 * (1 - p2)) / (d * d)); };
  const powFor = (p, rel, n, a) => { const p2 = p * (1 + rel), d = p2 - p; return cdf(Math.abs(d) / Math.sqrt((p * (1 - p) + p2 * (1 - p2)) / n) - inv(1 - a / 2)); };
  const mdeFor = (p, n, pow, a) => { let lo = 1e-4, hi = Math.min(20, (1 - p) / p); for (let i = 0; i < 70; i++){ const m = (lo + hi) / 2; powFor(p, m, n, a) < pow ? lo = m : hi = m; } return hi; };
  // разбор ввода: «4», «4%», «0.04» (доля), «4,5»; доли меньше 1 у процентов читаем как долю
  const parse = (raw, kind) => {
    const s = String(raw).trim().replace(/\s| /g, '').replace(',', '.'); const pct = /%$/.test(s);
    let v = parseFloat(s.replace('%', '')); if (!Number.isFinite(v)) return null;
    let how = '';
    if (kind === 'pct' && !pct && v > 0 && v < 1){ v = v * 100; how = 'доля → '; }
    return {v, how};
  };
  const LIM = {base: [0.01, 99], mde: [0.1, 500], pow: [5, 99.9], n: [10, 1e9], traffic: [1, 1e9]};
  let st = Object.assign({}, DEF);
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e) {}
  const q = new URLSearchParams(location.search); for (const k of Object.keys(DEF)) if (q.has(k)) st[k] = k === 'mode' ? q.get(k) : +q.get(k);
  const fields = {base: $('ss-base'), mde: $('ss-mde'), pow: $('ss-pow'), n: $('ss-n'), traffic: $('ss-traffic')};
  const fmt = {base: v => nf(v, 2) + '%', mde: v => nf(v, 1) + '%', pow: v => nf(v, 1) + '%', n: v => nf(v), traffic: v => nf(v)};
  const heard = {};
  const read = k => {
    const r = parse(fields[k].value, k === 'n' || k === 'traffic' ? 'int' : 'pct');
    if (!r){ heard[k] = 'не понял «' + fields[k].value + '» — оставил ' + fmt[k](st[k]); return; }
    let v = r.v, [lo, hi] = LIM[k], note = r.how ? 'понял как ' + fmt[k](v) : '';
    if (v < lo || v > hi){ const c = Math.min(hi, Math.max(lo, v)); note = 'прижал к границе: ' + fmt[k](c) + ' (можно от ' + fmt[k](lo) + ' до ' + fmt[k](hi) + ')'; v = c; }
    if (k === 'n' || k === 'traffic') v = Math.round(v);
    st[k] = v; heard[k] = note;
  };
  const date = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'}); };
  const days = n => Math.ceil(2 * n / st.traffic);
  const daysW = d => d + ' ' + (d % 10 === 1 && d % 100 !== 11 ? 'день' : d % 10 >= 2 && d % 10 <= 4 && (d % 100 < 10 || d % 100 >= 20) ? 'дня' : 'дней');
  function calc(){
    const p = st.base / 100, a = st.alpha;
    if (st.mode === 'n') st.n = nFor(p, st.mde / 100, st.pow / 100, a);
    else if (st.mode === 'mde') st.mde = +(100 * mdeFor(p, st.n, st.pow / 100, a)).toFixed(2);
    else st.pow = +(100 * powFor(p, st.mde / 100, st.n, a)).toFixed(1);
  }
  function render(focusKeep){
    for (const k of Object.keys(fields)){
      const calcd = (k === st.mode) || (k === 'pow' && st.mode === 'pow');
      fields[k].readOnly = calcd; fields[k].classList.toggle('calc', calcd);
      fields[k].setAttribute('aria-label', calcd ? 'посчитано' : '');
      if (k !== focusKeep) fields[k].value = fmt[k](st[k]).replace(/ /g, ' ');
    }
    document.querySelectorAll('.ss-mode [data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === st.mode)));
    document.querySelectorAll('[data-alpha]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.alpha === st.alpha)));
    const p = st.base, abs = p * st.mde / 100;
    const lines = ['База ' + fmt.base(p) + ', рост на ' + fmt.mde(st.mde) + ' относительных = +' + nf(abs, 3) + ' п.\u00a0п.: с ' + fmt.base(p) + ' до ' + nf(p + abs, 3) + '%'];
    Object.entries(heard).forEach(([k, v]) => { if (v) lines.push({base: 'Конверсия', mde: 'MDE', pow: 'Мощность', n: 'Размер группы', traffic: 'Трафик'}[k] + ': ' + v); });
    $('ss-heard').innerHTML = lines.map(l => '<li>' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</li>').join('');
    const d = days(st.n);
    $('ss-big').innerHTML = st.mode === 'n' ? '<b>' + nf(st.n) + '</b> человек в каждой группе' : st.mode === 'mde' ? 'Заметит рост от <b>' + fmt.mde(st.mde) + '</b> относительных' : 'Мощность <b>' + fmt.pow(st.pow) + '</b>';
    $('ss-when').textContent = 'При ' + nf(st.traffic) + ' человек в день это ' + daysW(d) + ' — тест закончится ' + date(d) + '.';
    const warn = [];
    if (st.n > 1e7) warn.push('больше 10 миллионов на группу — точно ли такой маленький эффект важен?');
    if (d > 90) warn.push('дольше 90 дней: за это время сменятся сезон и сама аудитория');
    if (st.mde > 100) warn.push('рост больше чем вдвое — обычно MDE в A/B-тестах от 1 до 20%');
    if (st.base >= 30) warn.push('конверсия ' + fmt.base(st.base) + ' — не имелась ли в виду ' + nf(st.base / 100, 2) + '%?');
    if (st.mode === 'pow' && st.pow < 50) warn.push('мощность ниже 50%: тест чаще пропустит эффект, чем заметит');
    $('ss-warn').hidden = !warn.length; $('ss-warn').textContent = warn.length ? 'Проверь: ' + warn.join('; ') + '.' : '';
    // «что если»
    const p0 = st.base / 100;
    $('ss-what').innerHTML = [2, 3, 5, 10, 20].map(m => { const n = nFor(p0, m / 100, st.mode === 'pow' ? 0.8 : st.pow / 100, st.alpha); return `<tr${Math.abs(m - st.mde) < 0.01 ? ' class="cur"' : ''}><td>${m}%</td><td class="num">${nf(n)}</td><td class="num">${nf(days(n))}</td></tr>`; }).join('');
    // запомнить: localStorage + адрес страницы
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e) {}
    const u = new URLSearchParams(); for (const k of Object.keys(DEF)) u.set(k, st[k]); history.replaceState(null, '', '?' + u);
  }
  // три последних расчёта
  const saveRecent = () => {
    let r = []; try { r = JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch(e) {}
    const s = JSON.stringify(st); r = [s].concat(r.filter(x => x !== s)).slice(0, 3);
    try { localStorage.setItem(RECENT, JSON.stringify(r)); } catch(e) {}
    paintRecent(r);
  };
  const paintRecent = r => {
    if (!r){ try { r = JSON.parse(localStorage.getItem(RECENT) || '[]'); } catch(e) { r = []; } }
    $('ss-recent-box').hidden = r.length < 2;
    $('ss-recent').innerHTML = '';
    r.forEach(s => { const o = JSON.parse(s), li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'btn-text';
      b.textContent = fmt.base(o.base) + ' · MDE ' + fmt.mde(o.mde) + ' · ' + nf(o.n) + ' на группу'; b.addEventListener('click', () => { Object.assign(st, o); render(); }); li.append(b); $('ss-recent').append(li); });
  };
  let saveT;
  Object.entries(fields).forEach(([k, el]) => {
    el.addEventListener('input', () => { if (el.readOnly) return; read(k); calc(); render(k); clearTimeout(saveT); saveT = setTimeout(saveRecent, 1500); });
    el.addEventListener('blur', () => render());
  });
  document.querySelectorAll('.ss-mode [data-mode]').forEach(b => b.addEventListener('click', () => { st.mode = b.dataset.mode; calc(); render(); }));
  document.querySelectorAll('[data-alpha]').forEach(b => b.addEventListener('click', () => { st.alpha = +b.dataset.alpha; calc(); render(); }));
  // сброс без «Вы уверены?»: сразу сбрасываем, 10 секунд можно вернуть
  let undoT;
  $('ss-reset').addEventListener('click', () => {
    const was = Object.assign({}, st); st = Object.assign({}, DEF); Object.keys(heard).forEach(k => delete heard[k]); calc(); render();
    const box = $('ss-undo'); box.innerHTML = 'Вернул типичные значения. <button type="button" class="btn-text">Вернуть мои</button>';
    box.querySelector('button').addEventListener('click', () => { st = was; render(); box.textContent = ''; clearTimeout(undoT); });
    clearTimeout(undoT); undoT = setTimeout(() => { box.textContent = ''; }, 10000);
  });
  calc(); render(); paintRecent();
  // «Скопировать ссылку на расчёт» — адрес страницы уже содержит все числа
  const cp = $('ss-copy');
  if (cp) cp.addEventListener('click', async () => { const note = $('ss-undo'); try { await navigator.clipboard.writeText(location.href); if (note) note.textContent = 'Ссылка скопирована.'; } catch(e) { if (note) note.textContent = location.href; } });
})();
