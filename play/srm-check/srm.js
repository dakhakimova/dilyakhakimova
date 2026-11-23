/* /play/srm-check/ — калькулятор SRM: χ²-критерий согласия для любого числа групп и любого плана сплита.
   Поля пустые: пример — бледные подсказки. План — веса в любых единицах (50/50, 90/10, 30/30/30); пустой план — поровну.
   Принимает «500000», «500 000», «500k». Обновление страницы — с чистыми полями; «Скопировать ссылку» даёт ссылку с числами.
   p-value — хвост χ² с (k − 1) степенями свободы (неполная гамма-функция). Таблица и график — как в разборе Кохави. */
(function(){
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (n, at = {}, p) => { const e = document.createElementNS(SVG, n); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
  const C = {ctrl: '#23418A', loss: '#C9413A', ink: '#24221F', mute: '#5E5A53', line: '#E3DED4'};
  const GCOL = ['#23418A', '#E8644A', '#C29A48', '#0E7E5F', '#8A5A7A', '#4F8F8A', '#9A8F84', '#5E5A53'];
  // при двух группах — «Тест», при трёх и больше — «Тест 1», «Тест 2»…
  const NAME = (i, k = rows.length) => i === 0 ? 'Контроль' : k <= 2 ? 'Тест' : 'Тест ' + i;
  const EX = [[500000, 50], [493000, 50], [497000, 50]];
  const MAXG = 8;
  const nf = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const SUP = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
  // хвост χ²: Q(df/2, x/2) в логарифмах, чтобы крошечные p не превращались в ноль
  const lgamma = z => { const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z); z -= 1; let x = 0.99999999999980993; for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1); const t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); };
  const logQ = (a, x) => { if (x <= 0) return 0; const lg = lgamma(a);
    if (x < a + 1){ let sum = 1 / a, del = sum, ap = a; for (let n = 0; n < 500; n++){ ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; } const P = Math.exp(Math.log(sum) - x + a * Math.log(x) - lg); return Math.log(Math.max(1e-300, 1 - P)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i < 500; i++){ const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return Math.log(h) - x + a * Math.log(x) - lg; };
  const tail = (x, df) => Math.exp(logQ(df / 2, x / 2));
  const fmtLogP = lp => { const l10 = lp / Math.LN10; if (l10 >= -3) return String(+Math.exp(lp).toPrecision(2)); const k = Math.floor(l10), m = Math.pow(10, l10 - k); return m.toFixed(1) + '·10' + String(k).split('').map(c => SUP[c]).join(''); };
  const thrFor = df => { let lo = 0, hi = 1000; for (let i = 0; i < 80; i++){ const m = (lo + hi) / 2; tail(m, df) > 0.0005 ? lo = m : hi = m; } return (lo + hi) / 2; };
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  const parseN = raw => { let s = String(raw).trim().toLowerCase().replace(/[\s _]/g, '').replace(',', '.'); if (!s) return undefined; let m = 1; if (/(k|к|тыс)$/.test(s)){ m = 1e3; s = s.replace(/(k|к|тыс)$/, ''); } else if (/(m|м|млн)$/.test(s)){ m = 1e6; s = s.replace(/(m|м|млн)$/, ''); } const v = parseFloat(s) * m; return Number.isFinite(v) && v >= 0 ? Math.round(v) : null; };
  const parseW = raw => { const s = String(raw).trim().replace(',', '.').replace('%', ''); if (!s) return undefined; const v = parseFloat(s); return Number.isFinite(v) && v > 0 ? v : null; };

  // ---------- строки групп ----------
  const box = $('srm-rows-in');
  let rows = [];
  const renameAll = () => rows.forEach((x, i) => { x.r.querySelector('.srm-name b').textContent = NAME(i); x.inN.previousElementSibling.textContent = NAME(i) + ': пришло пользователей'; x.inW.previousElementSibling.textContent = NAME(i) + ': доля в плане'; const d = x.r.querySelector('.srm-del'); if (d) d.setAttribute('aria-label', 'Убрать группу ' + NAME(i)); });
  function addRow(n = '', w = ''){
    if (rows.length >= MAXG) return;
    const i = rows.length, r = document.createElement('div'); r.className = 'srm-row';
    const ex = EX[i] || EX[1];
    r.innerHTML = `<span class="srm-name"><i style="background:${GCOL[i]}"></i><b>${NAME(i)}</b></span>`
      + `<label><span class="vh">${NAME(i)}: пришло пользователей</span><input class="input ss-in srm-n" inputmode="numeric" autocomplete="off" placeholder="${nf(ex[0])}"></label>`
      + `<label><span class="vh">${NAME(i)}: доля в плане</span><input class="input ss-in srm-w" inputmode="decimal" autocomplete="off" placeholder="${ex[1]}"></label>`
      + (i >= 2 ? `<button type="button" class="srm-del" aria-label="Убрать группу ${NAME(i)}">×</button>` : '<span></span>');
    box.appendChild(r);
    const [inN, inW] = r.querySelectorAll('input');
    inN.value = n === '' ? '' : nf(n); inW.value = w;
    [inN, inW].forEach(f => {
      f.addEventListener('input', calc);
      f.addEventListener('focus', () => { if (f.value.replace(/[\s ]/g, '') === f.placeholder.replace(/\s/g, '')){ f.value = ''; calc(); } else setTimeout(() => f.select(), 0); });
    });
    inN.addEventListener('blur', () => { const v = parseN(inN.value); if (v != null) inN.value = nf(v); });
    const del = r.querySelector('.srm-del');
    if (del) del.addEventListener('click', () => { const keep = rows.filter(x => x.r !== r).map(x => [x.inN.value, x.inW.value]); box.textContent = ''; rows = []; keep.forEach(([a, b]) => addRow(parseN(a) ?? '', b)); renameAll(); calc(); });
    rows.push({r, inN, inW});
    $('srm-add').hidden = rows.length >= MAXG;
    renameAll();
  }
  $('srm-add').addEventListener('click', () => { addRow(); calc(); rows[rows.length - 1].inN.focus(); });

  // ссылка с числами: ?n=500000,493000&w=50,50 — читаем один раз и чистим адрес
  const q = new URLSearchParams(location.search);
  const qn = (q.get('n') || [q.get('a'), q.get('b')].filter(Boolean).join(',')).split(',').filter(Boolean);
  const qw = (q.get('w') || [q.get('wa'), q.get('wb')].filter(Boolean).join(',')).split(',');
  for (let i = 0; i < Math.max(2, qn.length); i++) addRow(qn[i] != null ? +qn[i] : '', qw[i] || '');
  if (location.search) history.replaceState(null, '', location.pathname);
  let link = '';
  const out = document.querySelector('.srm-out'), res = $('srm-res');

  function chart(chi2, df, lp){
    const cs = $('srm-chart'); cs.textContent = '';
    const THR = thrFor(df);
    const NICE = [110, 300, 1000, 3000, 1e4, 3e4, 1e5, 3e5, 1e6, 3e6, 1e7, 3e7, 1e8, 1e9, 1e10];
    const XM = NICE.find(m => m >= Math.max(chi2, THR * 3) * 1.05) || chi2 * 1.2, L = 44, R = 428, B = 118, T = 18;
    const lg = x => Math.log10(1 + Math.max(0, x)), px = x => L + lg(Math.min(x, XM)) / lg(XM) * (R - L), py = v => B - v * (B - T);
    for (const v of [0, 0.5, 1]){ el('line', {x1: L, y1: py(v), x2: R, y2: py(v), stroke: C.line, 'stroke-width': v ? 1 : 1.5}, cs); const t = el('text', {x: L - 8, y: py(v) + 4, 'text-anchor': 'end', class: 'ax'}, cs); t.textContent = Math.round(v * 100) + '%'; }
    let d = ''; for (let i = 0; i <= 400; i++){ const x = Math.pow(10, lg(XM) * i / 400) - 1; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(tail(x, df)).toFixed(1); }
    el('path', {d, fill: 'none', stroke: C.ctrl, 'stroke-width': 2.5}, cs);
    const thrR = Math.round(THR * 10) / 10;
    const ticks = [0, thrR]; for (const v of [1, 4, 50, 100, 1000, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9]) if (v <= XM && px(v) <= R - 36 && ticks.every(t => Math.abs(px(t) - px(v)) >= 52)) ticks.push(v);
    for (const v of ticks){ el('line', {x1: px(v), y1: B, x2: px(v), y2: B + 4, stroke: C.mute}, cs); const t = el('text', {x: px(v), y: B + 20, 'text-anchor': 'middle', class: 'ax'}, cs); t.textContent = v >= 1e6 ? (v / 1e6) + ' млн' : v === thrR ? String(thrR) : nf(v); }
    const ax = el('text', {x: R, y: B + 40, 'text-anchor': 'end', class: 'ax'}, cs); ax.textContent = 'χ², шкала логарифмическая';
    el('line', {x1: px(THR), y1: T + 8, x2: px(THR), y2: B, stroke: C.loss, 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, cs);
    const far = px(THR) > R - 170, ta = far ? 'end' : 'start', tx = px(THR) + (far ? -6 : 6);
    const tl = el('text', {x: tx, y: T + 10, 'text-anchor': ta, class: 'sm halo'}, cs); tl.textContent = 'порог SRM';
    const tl2 = el('text', {x: tx, y: T + 28, 'text-anchor': ta, class: 'sm halo'}, cs); tl2.textContent = 'p = 0.0005, χ² = ' + thrR;
    const v = chi2 < 10 ? chi2.toFixed(2) : chi2 < 100 ? chi2.toFixed(1) : nf(chi2), p = Math.exp(lp);
    el('circle', {cx: px(chi2), cy: py(p), r: 6, fill: C.ink}, cs);
    const lab = el('text', {x: Math.min(R - 4, Math.max(L + 4, px(chi2))), y: py(p) - 14, 'text-anchor': px(chi2) > R - 60 ? 'end' : 'middle', class: 'lb halo'}, cs); lab.textContent = v;
    const qs = p >= 0.1 ? pct(p) : p >= 0.001 ? pct(p, 1) : null;
    $('srm-read').textContent = 'Наше χ² = ' + v + ': ' + (qs ? 'столько и больше бывает у ' + qs + ' честных тестов.' : 'при честном делении так почти не бывает.');
    cs.setAttribute('aria-label', $('srm-read').textContent);
    return thrR;
  }

  function bar(n, w, tot){
    const bs = $('srm-bar'); bs.textContent = '';
    const W = 424, x0 = 8, MIN = 6, k = n.length;
    let ws = n.map(x => x ? Math.max(MIN, W * x / tot) : 0); const over = ws.reduce((a, b) => a + b, 0) - W;
    if (over > 0){ const big = ws.indexOf(Math.max(...ws)); ws[big] -= over; }
    let x = x0; ws.forEach((wd, i) => { el('rect', {x, y: 8, width: Math.max(0, wd - (i < k - 1 ? 1 : 0)), height: 26, rx: 4, fill: GCOL[i]}, bs); x += wd; });
    let acc = 0; for (let i = 0; i < k - 1; i++){ acc += w[i]; const xp = x0 + W * acc; el('line', {x1: xp, y1: 2, x2: xp, y2: 40, stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, bs); }
    const sh = v => (100 * v).toFixed(v > 0.001 && v < 0.999 ? 2 : 3).replace(/\.?0+$/, '') + '%';
    const lines = n.map((v, i) => NAME(i) + ': ' + nf(v) + ' · ' + sh(v / tot));
    if (k === 2){ const a = el('text', {x: x0, y: 58, class: 'sm'}, bs); a.textContent = lines[0]; const b = el('text', {x: x0 + W, y: 58, 'text-anchor': 'end', class: 'sm'}, bs); b.textContent = lines[1]; bs.setAttribute('viewBox', '0 0 440 70'); }
    else { const per = Math.ceil(k / 2); lines.forEach((t, i) => { const col = i < per ? 0 : 1; const tt = el('text', {x: x0 + col * (W / 2), y: 58 + (i % per) * 20, class: 'sm'}, bs); tt.textContent = t; el('rect', {x: x0 + col * (W / 2) - 0, y: 49 + (i % per) * 20, width: 0, height: 0}, bs); }); bs.setAttribute('viewBox', `0 0 440 ${58 + per * 20}`); }
    bs.setAttribute('aria-label', lines.join(', '));
  }

  function calc(){
    const heard = [];
    const n = rows.map((r, i) => { const v = parseN(r.inN.value); if (v === null) heard.push(NAME(i) + ': не понял число.'); return v; });
    const w0 = rows.map((r, i) => { const v = parseW(r.inW.value); if (v === null) heard.push(NAME(i) + ': доля в плане — положительное число.'); return v; });
    $('srm-heard').innerHTML = heard.map(x => '<li>' + x + '</li>').join('');
    const anyW = w0.some(v => v), w1 = w0.map(v => v || (anyW ? null : 1));
    const qq = new URLSearchParams(); if (n.some(v => v != null)) qq.set('n', n.map(v => v ?? '').join(',')); if (anyW) qq.set('w', w0.map(v => v ?? '').join(','));
    link = qq.toString() ? location.origin + location.pathname + '?' + qq : '';
    const idle = (big, small) => { out.className = 'ss-out srm-out idle'; res.hidden = true; $('srm-copy').hidden = true; $('srm-big').textContent = big; $('srm-p').textContent = small; };
    if (n.some(v => v == null)){ idle('Впиши, сколько пользователей пришло в каждую группу.', 'План сплита по умолчанию — поровну.'); return; }
    if (w1.some(v => v == null)){ idle('Впиши план для каждой группы — или оставь план пустым у всех, тогда поровну.', ''); return; }
    const sw = w1.reduce((a, b) => a + b, 0), w = w1.map(v => v / sw), tot = n.reduce((a, b) => a + b, 0), e = w.map(v => v * tot);
    const minE = Math.min(...e);
    if (minE < 5){ idle('Слишком мало пользователей для проверки.', `χ²-критерий работает, когда в каждой группе по плану ждут хотя бы 5 человек, а сейчас в самой маленькой ждут ${minE < 1 ? minE.toFixed(1) : Math.floor(minE * 10) / 10}. Подожди, пока в тест придёт больше людей.`); return; }
    const df = n.length - 1, chi2 = n.reduce((a, v, i) => a + (v - e[i]) ** 2 / e[i], 0), lp = logQ(df / 2, chi2 / 2), p = Math.exp(lp);
    const sg = x => (x > 0 ? '+' : x < 0 ? '−' : '') + nf(Math.abs(x)), f1 = x => x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : nf(x);
    $('srm-tab').innerHTML = '<thead><tr><th scope="col">Группа</th><th scope="col">Ждали</th><th scope="col">Пришло</th><th scope="col">Разница</th><th scope="col">Разница² / ждали</th></tr></thead><tbody>'
      + n.map((v, i) => `<tr><th scope="row">${NAME(i)}</th><td>${nf(e[i])}</td><td>${nf(v)}</td><td>${sg(v - e[i])}</td><td>${f1((v - e[i]) ** 2 / e[i])}</td></tr>`).join('')
      + `</tbody><tfoot><tr><th scope="row" colspan="4">Сумма: χ²</th><td>${f1(chi2)}</td></tr></tfoot>`;
    res.hidden = false; $('srm-copy').hidden = false;
    const thr = chart(chi2, df, lp); bar(n, w, tot);
    const bad = p < 0.0005, warn = !bad && p < 0.05;
    out.className = 'ss-out srm-out ' + (bad ? 'bad' : warn ? 'warn' : 'good');
    $('srm-big').innerHTML = bad ? '<b>SRM.</b> Отчёту не верим: ищем, куда пропали пользователи.'
      : warn ? '<b>Пограничный случай.</b> До порога SRM не дотянуло, но перекос больше обычного. Сравни доли групп отдельно по платформам и по дням: если перекос сидит в одном куске, это скорее поломка, чем случайность.'
      : '<b>Всё честно.</b> Перекос в пределах случайного, можно смотреть на эффект.';
    const got = n.length === 2 ? `Контроль получил ${(100 * n[0] / tot).toFixed(2)}% вместо ${(100 * w[0]).toFixed(2).replace(/\.00$/, '')}%. ` : `Групп: ${n.length}, степеней свободы: ${df}. `;
    $('srm-p').textContent = got + `χ² = ${f1(chi2)}, p-value = ${fmtLogP(lp)}; порог SRM — p < 0.0005, это χ² больше ${thr}. Такой строгий порог — стандарт Microsoft: SRM проверяют в каждом тесте, и с обычным p\u00a0<\u00a00.05 было бы много ложных срабатываний.`;
  }
  $('srm-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); $('srm-note').textContent = 'Ссылка скопирована.'; } catch(e) { $('srm-note').textContent = link; } });
  calc();
})();
