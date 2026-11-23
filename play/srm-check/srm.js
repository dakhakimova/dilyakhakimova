/* /play/srm-check/ — калькулятор SRM: χ²-критерий для любого плана сплита.
   Поля пустые: пример — в подсказках и по кнопке «Вернуть пример». План — веса групп в любых единицах (50/50, 90/10, 30/30).
   Принимает «500000», «500 000», «500k». Ввод попадает в адрес страницы — расчётом можно поделиться ссылкой.
   Таблица «ждали — пришло» и график хвоста χ² — те же, что в разборе Кохави (shelf/books.js). */
(function(){
  const $ = id => document.getElementById(id);
  const EX = {a: 500000, b: 493000, wa: 50, wb: 50};
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (n, at = {}, p) => { const e = document.createElementNS(SVG, n); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const C = {ctrl: '#23418A', loss: '#C9413A', ink: '#24221F', mute: '#5E5A53', line: '#E3DED4'};
  const nf = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const erfc = x => { if (x > 6) return Math.exp(-x * x) / (x * Math.sqrt(Math.PI)) * (1 - 1 / (2 * x * x)); const t = 1 / (1 + 0.3275911 * x); return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x); };
  const SUP = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
  const fmtP = p => { if (p >= 0.001) return String(+p.toPrecision(2)); if (p < 1e-300) return '≈ 0'; const k = Math.floor(Math.log10(p)); return (p / Math.pow(10, k)).toFixed(1) + '·10' + String(k).split('').map(c => SUP[c]).join(''); };
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  const parseN = raw => { let s = String(raw).trim().toLowerCase().replace(/[\s _]/g, '').replace(',', '.'); if (!s) return undefined; let m = 1; if (/(k|к|тыс)$/.test(s)){ m = 1e3; s = s.replace(/(k|к|тыс)$/, ''); } else if (/(m|м|млн)$/.test(s)){ m = 1e6; s = s.replace(/(m|м|млн)$/, ''); } const v = parseFloat(s) * m; return Number.isFinite(v) && v >= 0 ? Math.round(v) : null; };
  const parseW = raw => { const s = String(raw).trim().replace(',', '.').replace('%', ''); if (!s) return undefined; const v = parseFloat(s); return Number.isFinite(v) && v > 0 ? v : null; };
  const F = {a: $('srm-a'), b: $('srm-b'), wa: $('srm-wa'), wb: $('srm-wb')};
  const q = new URLSearchParams(location.search);
  if (q.has('a')) F.a.value = nf(+q.get('a')); if (q.has('b')) F.b.value = nf(+q.get('b'));
  if (q.has('wa')) F.wa.value = q.get('wa'); if (q.has('wb')) F.wb.value = q.get('wb');
  if (location.search) history.replaceState(null, '', location.pathname);   // обновление страницы — с чистыми полями
  let link = '';
  const out = document.querySelector('.srm-out'), res = $('srm-res');
  function chart(chi2){
    const cs = $('srm-chart'); cs.textContent = '';
    // шкала подстраивается под наше χ², чтобы точка всегда помещалась; логарифмическая — иначе огромные χ² сжали бы всё к нулю
    const NICE = [110, 300, 1000, 3000, 1e4, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7, 3e7, 1e8, 1e9, 1e10];
    const XM = NICE.find(m => m >= chi2 * 1.05) || chi2 * 1.2, L = 44, R = 428, B = 118, T = 18, THR = 12.12;
    const lg = x => Math.log10(1 + Math.max(0, x)), px = x => L + lg(Math.min(x, XM)) / lg(XM) * (R - L), py = v => B - v * (B - T);
    const S = x => x <= 0 ? 1 : erfc(Math.sqrt(x / 2));
    for (const v of [0, 0.5, 1]){ el('line', {x1: L, y1: py(v), x2: R, y2: py(v), stroke: C.line, 'stroke-width': v ? 1 : 1.5}, cs); const t = el('text', {x: L - 8, y: py(v) + 4, 'text-anchor': 'end', class: 'ax'}, cs); t.textContent = Math.round(v * 100) + '%'; }
    let d = ''; for (let i = 0; i <= 400; i++){ const x = Math.pow(10, lg(XM) * i / 400) - 1; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(S(x)).toFixed(1); }
    el('path', {d, fill: 'none', stroke: C.ctrl, 'stroke-width': 2.5}, cs);
    const ticks = [0, 12]; for (const v of [1, 4, 50, 100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9]) if (v <= XM && px(v) <= R - 36 && ticks.every(t => Math.abs(px(t) - px(v)) >= 52)) ticks.push(v);
    for (const v of ticks){ el('line', {x1: px(v), y1: B, x2: px(v), y2: B + 4, stroke: C.mute}, cs); const t = el('text', {x: px(v), y: B + 20, 'text-anchor': px(v) > R - 20 ? 'end' : 'middle', class: 'ax'}, cs); t.textContent = v >= 1e6 ? (v / 1e6) + '\u00a0млн' : nf(v); }
    const ax = el('text', {x: R, y: B + 40, 'text-anchor': 'end', class: 'ax'}, cs); ax.textContent = 'χ², шкала логарифмическая: под ваше число';
    el('line', {x1: px(THR), y1: T + 8, x2: px(THR), y2: B, stroke: C.loss, 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, cs);
    const far = px(THR) > R - 170, ta = far ? 'end' : 'start', tx = px(THR) + (far ? -6 : 6); const tl = el('text', {x: tx, y: T + 10, 'text-anchor': ta, class: 'sm halo'}, cs); tl.textContent = 'порог SRM'; const tl2 = el('text', {x: tx, y: T + 28, 'text-anchor': ta, class: 'sm halo'}, cs); tl2.textContent = 'p = 0.0005, χ² = 12.1';
    const v = chi2 < 10 ? chi2.toFixed(2) : chi2 < 100 ? chi2.toFixed(1) : nf(chi2), p = S(chi2);
    el('circle', {cx: px(chi2), cy: py(p), r: 6, fill: C.ink}, cs);
    const lab = el('text', {x: Math.min(R - 4, Math.max(L + 4, px(chi2))), y: py(p) - 14, 'text-anchor': px(chi2) > R - 60 ? 'end' : 'middle', class: 'lb halo'}, cs);
    lab.textContent = v;
    const qs = p >= 0.1 ? pct(p) : p >= 0.001 ? pct(p, 1) : null;
    $('srm-read').textContent = 'Наше χ² = ' + v + ': ' + (qs ? 'столько и больше бывает у ' + qs + ' честных тестов.' : 'при честном делении так почти не бывает.');
    cs.setAttribute('aria-label', $('srm-read').textContent);
  }
  function calc(){
    const v = {a: parseN(F.a.value), b: parseN(F.b.value), wa: parseW(F.wa.value), wb: parseW(F.wb.value)};
    const heard = [];
    if (v.a === null) heard.push('Контроль: не понял число.'); if (v.b === null) heard.push('Тест: не понял число.');
    if (v.wa === null || v.wb === null) heard.push('План: нужны положительные числа, например 50 и 50.');
    $('srm-heard').innerHTML = heard.map(x => '<li>' + x + '</li>').join('');
    const wa = v.wa || 50, wb = v.wb || 50, sa = wa / (wa + wb);
    const qq = new URLSearchParams(); if (v.a != null) qq.set('a', v.a); if (v.b != null) qq.set('b', v.b); if (v.wa) qq.set('wa', v.wa); if (v.wb) qq.set('wb', v.wb);
    link = qq.toString() ? location.origin + location.pathname + '?' + qq : '';
    const idle = (big, small) => { out.className = 'ss-out srm-out idle'; res.hidden = true; $('srm-copy').hidden = true; $('srm-big').textContent = big; $('srm-p').textContent = small; };
    if (v.a == null || v.b == null){ idle('Впиши, сколько пользователей пришло в контроль и в тест.', 'План сплита по умолчанию — 50 и 50.'); return; }
    // χ²-критерий врёт на крошечных группах: нужно, чтобы в каждую группу по плану ждали хотя бы 5 человек
    const minE = Math.min((v.a + v.b) * sa, (v.a + v.b) * (1 - sa));
    if (minE < 5){ idle('Слишком мало пользователей для проверки.', `χ²-критерий работает, когда в каждой группе по плану ждут хотя бы 5 человек, а сейчас в меньшей ждут ${minE < 1 ? minE.toFixed(1) : Math.floor(minE * 10) / 10}. Подожди, пока в тест придёт больше людей.`); return; }
    const tot = v.a + v.b, ea = tot * sa, eb = tot - ea;
    const chi2 = (v.a - ea) ** 2 / ea + (v.b - eb) ** 2 / eb, p = erfc(Math.sqrt(chi2 / 2));
    const sg = x => (x > 0 ? '+' : x < 0 ? '−' : '') + nf(Math.abs(x)), f1 = x => x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : nf(x);
    const row = (g, e, r) => `<tr><th scope="row">${g}</th><td>${nf(e)}</td><td>${nf(r)}</td><td>${sg(r - e)}</td><td>${f1((r - e) ** 2 / e)}</td></tr>`;
    $('srm-tab').innerHTML = '<thead><tr><th scope="col">Группа</th><th scope="col">Ждали</th><th scope="col">Пришло</th><th scope="col">Разница</th><th scope="col">Разница² / ждали</th></tr></thead>'
      + '<tbody>' + row('Контроль', ea, v.a) + row('Тест', eb, v.b) + `</tbody><tfoot><tr><th scope="row" colspan="4">Сумма: χ²</th><td>${f1(chi2)}</td></tr></tfoot>`;
    res.hidden = false; $('srm-copy').hidden = false; chart(chi2);
    // полоса долей, как в разборе Кохави: контроль синий, тест красный, пунктир — где граница по плану
    const bs = $('srm-bar'); bs.textContent = '';
    const W = 424, x0 = 8, MIN = 6, wA = v.a ? Math.min(W - (v.b ? MIN : 0), Math.max(MIN, W * v.a / tot)) : 0;   // тонкую группу всё равно видно
    el('rect', {x: x0, y: 8, width: Math.max(0, wA), height: 26, rx: 5, fill: C.ctrl}, bs);
    el('rect', {x: x0 + wA, y: 8, width: Math.max(0, W - wA), height: 26, rx: 5, fill: '#E8644A'}, bs);
    el('line', {x1: x0 + W * sa, y1: 2, x2: x0 + W * sa, y2: 40, stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, bs);
    const sh = x => (100 * x).toFixed(x > 0.001 && x < 0.999 ? 2 : 3).replace(/\.?0+$/, '') + '%';
    const ta = el('text', {x: x0, y: 58, class: 'sm'}, bs); ta.textContent = 'Контроль: ' + nf(v.a) + ' · ' + sh(v.a / tot);
    const tb = el('text', {x: x0 + W, y: 58, 'text-anchor': 'end', class: 'sm'}, bs); tb.textContent = 'Тест: ' + nf(v.b) + ' · ' + sh(v.b / tot);
    bs.setAttribute('aria-label', ta.textContent + ', ' + tb.textContent + ', по плану контролю ' + sh(sa));
    const bad = p < 0.0005, warn = !bad && p < 0.05;
    out.className = 'ss-out srm-out ' + (bad ? 'bad' : warn ? 'warn' : 'good');
    $('srm-big').innerHTML = bad ? '<b>SRM.</b> Отчёту не верим: ищем, куда пропали пользователи.'
      : warn ? '<b>Пограничный случай.</b> Порог SRM не пройден, но перекос заметный — присмотрись к срезам.'
      : '<b>Всё честно.</b> Перекос в пределах случайного, можно смотреть на эффект.';
    $('srm-p').textContent = `Контроль получил ${(100 * v.a / tot).toFixed(2)}% вместо ${(100 * sa).toFixed(2).replace(/\.00$/, '')}%. χ² = ${f1(chi2)}, p-value = ${fmtP(p)}; порог SRM — p < 0.0005.`;
  }
  Object.values(F).forEach(f => f.addEventListener('input', () => { f.classList.remove('ex'); calc(); }));
  // в фокусе пример не мешает: число, совпадающее с примером, стирается, своё — выделяется целиком, и ввод его заменяет
  Object.values(F).forEach(f => f.addEventListener('focus', () => {
    if (f.value.replace(/[\s\u00a0]/g, '') === f.placeholder.replace(/\s/g, '')){ f.value = ''; calc(); }
    else setTimeout(() => f.select(), 0);
  }));
  [F.a, F.b].forEach(f => f.addEventListener('blur', () => { const n = parseN(f.value); if (n != null) f.value = nf(n); }));
  $('srm-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); $('srm-note').textContent = 'Ссылка скопирована.'; } catch(e) { $('srm-note').textContent = link; } });
  calc();
})();
