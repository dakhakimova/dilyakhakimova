/* /play/srm-check/ — калькулятор SRM: χ²-критерий для любого плана сплита.
   Принимает «500000», «500 000», «500k»; долю плана — «50», «50%», «0.5». Пишет, как понял число.
   Ввод запоминается (localStorage) и попадает в адрес страницы — расчётом можно поделиться ссылкой. */
(function(){
  const $ = id => document.getElementById(id);
  const DEF = {a: 500000, b: 493000, s: 50}, KEY = 'dk:srm-check';
  const nf = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const erfc = x => { if (x > 6) return Math.exp(-x * x) / (x * Math.sqrt(Math.PI)) * (1 - 1 / (2 * x * x)); const t = 1 / (1 + 0.3275911 * x); return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x); };
  const SUP = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
  const fmtP = p => { if (p >= 0.001) return (+p.toPrecision(2)).toString(); if (p < 1e-300) return '≈ 0'; const k = Math.floor(Math.log10(p)); return (p / Math.pow(10, k)).toFixed(1) + '·10' + String(k).split('').map(c => SUP[c]).join(''); };
  const parseN = raw => { let s = String(raw).trim().toLowerCase().replace(/[\s _]/g, '').replace(',', '.'); let m = 1; if (/k$|к$|тыс$/.test(s)){ m = 1e3; s = s.replace(/(k|к|тыс)$/, ''); } else if (/m$|м$|млн$/.test(s)){ m = 1e6; s = s.replace(/(m|м|млн)$/, ''); } const v = parseFloat(s) * m; return Number.isFinite(v) && v >= 0 ? Math.round(v) : null; };
  const parseS = raw => { const s = String(raw).trim().replace(',', '.').replace('%', ''); let v = parseFloat(s); if (!Number.isFinite(v)) return null; if (v > 0 && v < 1) v *= 100; return v > 0 && v < 100 ? v : null; };
  let st = Object.assign({}, DEF);
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e) {}
  const q = new URLSearchParams(location.search); for (const k of Object.keys(DEF)) if (q.has(k) && Number.isFinite(+q.get(k))) st[k] = +q.get(k);
  const F = {a: $('srm-a'), b: $('srm-b'), s: $('srm-s')};
  const show = () => { F.a.value = nf(st.a); F.b.value = nf(st.b); F.s.value = (+st.s.toFixed(2)) + '%'; };
  function calc(){
    const heard = [];
    const a = parseN(F.a.value), b = parseN(F.b.value), s = parseS(F.s.value);
    if (a === null) heard.push('В контроле: не понял число.'); else st.a = a;
    if (b === null) heard.push('В тесте: не понял число.'); else st.b = b;
    if (s === null) heard.push('План: доля контроля от 0 до 100%.'); else st.s = s;
    $('srm-heard').innerHTML = heard.map(x => '<li>' + x + '</li>').join('');
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e) {}
    history.replaceState(null, '', '?' + new URLSearchParams({a: st.a, b: st.b, s: st.s}).toString());
    const tot = st.a + st.b, out = document.querySelector('.srm-out');
    if (tot < 20){ $('srm-big').textContent = 'Нужно хотя бы несколько десятков пользователей.'; $('srm-p').textContent = ''; $('srm-rows').innerHTML = ''; $('srm-chi').textContent = ''; out.className = 'ss-out srm-out'; return; }
    const ea = tot * st.s / 100, eb = tot - ea;
    const chi2 = (st.a - ea) ** 2 / ea + (st.b - eb) ** 2 / eb, p = erfc(Math.sqrt(chi2 / 2));
    const sg = x => (x > 0 ? '+' : x < 0 ? '−' : '') + nf(Math.abs(x));
    const f1 = x => x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : nf(x);
    const row = (g, e, r) => `<tr><td>${g}</td><td class="num">${nf(e)}</td><td class="num">${nf(r)}</td><td class="num">${sg(r - e)}</td><td class="num">${f1((r - e) ** 2 / e)}</td></tr>`;
    $('srm-rows').innerHTML = row('Контроль', ea, st.a) + row('Тест', eb, st.b);
    $('srm-chi').textContent = f1(chi2);
    const bad = p < 0.0005, warn = !bad && p < 0.05;
    out.className = 'ss-out srm-out ' + (bad ? 'bad' : warn ? 'warn' : 'good');
    const share = (100 * st.a / tot).toFixed(2);
    $('srm-big').innerHTML = bad ? '<b>SRM.</b> Отчёту не верим: ищем, куда пропали пользователи.'
      : warn ? '<b>Пограничный случай.</b> Порог SRM не пройден, но перекос заметный — присмотрись к срезам.'
      : '<b>Всё честно.</b> Перекос в пределах случайного, можно смотреть на эффект.';
    $('srm-p').textContent = `Контроль получил ${share}% вместо ${+st.s.toFixed(2)}%. χ² = ${f1(chi2)}, p-value = ${fmtP(p)}; порог SRM — p < 0.0005.`;
  }
  Object.values(F).forEach(f => { f.addEventListener('input', calc); f.addEventListener('blur', () => { show(); calc(); }); });
  $('srm-reset').addEventListener('click', () => { st = Object.assign({}, DEF); show(); calc(); $('srm-note').textContent = 'Вернула пример.'; });
  $('srm-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('srm-note').textContent = 'Ссылка скопирована.'; } catch(e) { $('srm-note').textContent = location.href; } });
  show(); calc();
})();
