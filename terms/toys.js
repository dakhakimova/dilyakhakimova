/* Свои игры мини-лабораторий /terms/: tt — t-тест, mw — Манн — Уитни, chi — хи-квадрат, ss — размер выборки.
   Стиль игр сайта: прогноз (жёлтая плашка, варианты) → действие (одна синяя кнопка, остальные контурные) → вывод (плашка-вердикт).
   Разметку прогноза и строки печёт tools/build-terms.js из i18n/terms.js (поле toy термина) в data-s; тело игры рисуется здесь, SVG.
   Числа считаются вживую; формулы — те же, что в тексте страницы (Уэлч, U с поправкой на ничьи, χ² Пирсона, n для двух долей). */
(function(){
  const NS = 'http://www.w3.org/2000/svg';
  const C = {a: '#E8644A', b: '#23418A', red: '#C9413A', pen: '#23418A', ink: '#24221F', t3: '#5E5A53', line: '#CFC8BB', soft: '#ECE9E2', mint: '#0E7E5F'};
  const RIGHT = {tt: 2, mw: 1, chi: 1, ss: 1};
  // числа: десятичная точка, тысячи через неразрывный пробел, % вплотную
  const nf = (x, d = 0) => x.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false}).replace(/^-(?=0(\.0+)?(\D|$))/, '').replace(/^(\D*)(\d{4,})/, (_, a, n) => a + n.replace(/\B(?=(\d{3})+$)/g, '\u00a0'));
  const pct = x => nf(x * 100, x < .1 && x > 0 ? 1 : 0) + '%';
  const pf = p => p < .001 ? '< 0.001' : nf(p, p < .1 ? 3 : 2);
  const pv = p => p < .001 ? '< 0.001' : '= ' + pf(p);
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => k in o ? o[k] : '');
  const el = (tag, a = {}, kids = []) => { const e = document.createElement(tag); for (const k in a){ if (k === 'text') e.textContent = a[k]; else if (k === 'html') e.innerHTML = a[k]; else e.setAttribute(k, a[k]); } kids.forEach(k => e.appendChild(k)); return e; };
  const sv = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svgBox = (w, h, label) => sv('svg', {viewBox: `0 0 ${w} ${h}`, class: 't-svg', role: 'img', 'aria-label': label});
  const T = (svg, x, y, s, o = {}) => { const t = sv('text', {x, y, 'font-size': o.size || 16, fill: o.fill || C.t3, 'text-anchor': o.a || 'start', 'font-weight': o.w || 400}); t.textContent = s; svg.appendChild(t); return t; };
  const L = (svg, x1, y1, x2, y2, st = C.line, w = 1.5, dash) => svg.appendChild(sv('line', Object.assign({x1, y1, x2, y2, stroke: st, 'stroke-width': w}, dash ? {'stroke-dasharray': dash} : {})));
  const R = (svg, x, y, w, h, f, extra = {}) => svg.appendChild(sv('rect', Object.assign({x, y, width: Math.max(0, w), height: Math.max(0, h), fill: f}, extra)));
  const Ci = (svg, x, y, r, f, extra = {}) => svg.appendChild(sv('circle', Object.assign({cx: x, cy: y, r, fill: f}, extra)));
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  // Φ(z) — через erf (Абрамовиц — Стиган 7.1.26, точность ~1e-7)
  const Phi = z => { const s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + .3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return .5 * (1 + s * y); };
  const p2 = z => Math.min(1, 2 * (1 - Phi(Math.abs(z))));
  const btn = (text, primary) => el('button', {type: 'button', class: primary ? 'btn' : 'btn ghost', text});
  const seg = (opts, cur, on) => { const g = el('div', {class: 'seg', role: 'group'});
    opts.forEach((o, i) => { const b = el('button', {type: 'button', 'aria-pressed': String(i === cur), text: o}); b.onclick = () => { [...g.children].forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); on(i); }; g.appendChild(b); });
    return g; };
  const bigs = list => el('div', {class: 'big2'}, list.map(([lab, id]) => el('div', {}, [el('b', {id, text: '—'}), el('span', {text: lab})])));

  function setup(box){
    const id = box.dataset.ttoy, S = JSON.parse(box.dataset.s), body = box.querySelector('.t-body');
    const choice = box.querySelector('.choice'), gnote = box.querySelector('.gnote');
    choice.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      choice.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      gnote.textContent = gnote.dataset.saved; }));
    // после первого действия — подсветить верный вариант прогноза
    const reveal = () => { if (choice.classList.contains('done')) return; choice.classList.add('done'); choice.querySelector(`[data-v="${RIGHT[id]}"]`).setAttribute('data-right', ''); };
    ({tt, mw, chi, ss})[id](body, S, reveal);
  }

  /* ---------- t-тест ---------- */
  function tt(body, S, reveal){
    const NS_ = [100, 400, 1600], SD = 150, MU = 640;
    let n = 400, eff = 20, hist = [], caught = 0;
    const effOut = el('output', {text: '20 ₽'}), effIn = el('input', {type: 'range', min: 0, max: 40, step: 5, value: 20, 'aria-label': S.effLabel});
    const ctl1 = el('div', {class: 't-ctl'}, [el('div', {class: 't-field'}, [el('span', {text: S.nLabel}), seg(NS_.map(x => nf(x)), 1, i => { n = NS_[i]; hist = []; caught = 0; draw(null); })]),
      el('label', {class: 't-field'}, [el('span', {text: S.effLabel}), effOut, effIn])]);
    const run = btn(S.run, true), many = btn(S.many), ctl2 = el('div', {class: 't-ctl'}, [run, many]);
    const sheet1 = el('div', {class: 't-sheet'}), sheet2 = el('div', {class: 't-sheet'});
    const dots = svgBox(460, 150, S.chartA + ' · ' + S.chartB), ruler = svgBox(460, 96, S.ruler);
    sheet1.append(el('p', {class: 't-lbl', text: S.chartA + ' · ' + S.chartB}), dots, bigs([[S.diff, 'tt-d'], [S.se, 'tt-se'], [S.t, 'tt-t'], [S.p, 'tt-p']]));
    const cnt = el('p', {class: 'note', 'aria-live': 'polite'}), verdict = el('p', {class: 'verdict', hidden: ''});
    sheet2.append(el('p', {class: 't-lbl', text: S.ruler}), ruler, cnt);
    body.append(ctl1, sheet1, sheet2, ctl2, verdict);
    effIn.oninput = () => { eff = +effIn.value; effOut.textContent = eff + ' ₽'; hist = []; caught = 0; draw(null); };
    const X = v => 20 + (v - 200) / 900 * 420, TX = z => 230 + Math.max(-5, Math.min(5, z)) * 40;
    function one(){ let sa = 0, sb = 0, qa = 0, qb = 0; const A = [], B = [];
      for (let i = 0; i < n; i++){ const a = MU + SD * gauss(), b = MU + eff + SD * gauss(); sa += a; sb += b; qa += a * a; qb += b * b; if (i < 60){ A.push(a); B.push(b); } }
      const ma = sa / n, mb = sb / n, va = (qa - n * ma * ma) / (n - 1), vb = (qb - n * mb * mb) / (n - 1), se = Math.sqrt(va / n + vb / n), t = (mb - ma) / se;
      return {A, B, ma, mb, se, t, p: p2(t)}; }
    function draw(r){
      dots.replaceChildren(); ruler.replaceChildren();
      L(dots, 20, 140, 440, 140, C.t3); [300, 600, 900].forEach(v => T(dots, X(v), 136, nf(v) + ' ₽', {a: 'middle', size: 14}));
      T(dots, 20, 18, 'A', {fill: '#B8432B', w: 500}); T(dots, 20, 78, 'B', {fill: '#23418A', w: 500});
      if (r){ r.A.forEach((v, i) => Ci(dots, X(v), 30 + (i % 4) * 7, 3.2, C.a, {opacity: .7})); r.B.forEach((v, i) => Ci(dots, X(v), 90 + (i % 4) * 7, 3.2, C.b, {opacity: .7}));
        L(dots, X(r.ma), 20, X(r.ma), 62, '#B8432B', 3); L(dots, X(r.mb), 80, X(r.mb), 122, '#23418A', 3); }
      R(ruler, TX(-1.96), 14, TX(1.96) - TX(-1.96), 40, C.soft, {rx: 4}); L(ruler, 30, 54, 430, 54, C.t3);
      [-4, -2, 0, 2, 4].forEach(z => T(ruler, TX(z), 74, (z > 0 ? '+' : z < 0 ? '−' : '') + Math.abs(z), {a: 'middle', size: 14}));
      T(ruler, TX(1.96), 92, '1.96', {a: 'middle', size: 14}); T(ruler, TX(-1.96), 92, '−1.96', {a: 'middle', size: 14});
      hist.slice(-100).forEach(z => L(ruler, TX(z), 22, TX(z), 46, Math.abs(z) > 1.96 ? C.pen : '#9AA4B5', 1.2));
      if (r) Ci(ruler, TX(r.t), 34, 8, Math.abs(r.t) > 1.96 ? C.pen : C.t3, {stroke: '#fff', 'stroke-width': 2});
      cnt.textContent = hist.length ? fill(S.caught, {k: nf(caught), n: nf(hist.length), pct: pct(caught / hist.length)}) : '';
      const g = i => body.querySelector('#' + i);
      g('tt-d').textContent = r ? nf(r.mb - r.ma, 1) + ' ₽' : '—'; g('tt-se').textContent = r ? nf(r.se, 1) + ' ₽' : '—';
      g('tt-t').textContent = r ? nf(r.t, 2) : '—'; g('tt-p').textContent = r ? pf(r.p) : '—';
    }
    const push = r => { hist.push(r.t); if (Math.abs(r.t) > 1.96) caught++; };
    run.onclick = () => { const r = one(); push(r); draw(r); reveal(); verdict.hidden = false;
      verdict.className = 'verdict ' + (Math.abs(r.t) > 1.96 ? 'good' : '');
      verdict.textContent = (eff === 0 ? S.vZero + ' ' : '') + fill(Math.abs(r.t) > 1.96 ? S.vYes : S.vNo, {t: nf(r.t, 2), pv: pv(r.p)}); };
    many.onclick = () => { let r; for (let i = 0; i < 100; i++){ r = one(); push(r); } draw(r); reveal(); };
    draw(null);
  }

  /* ---------- Манн — Уитни ---------- */
  function mw(body, S, reveal){
    const A0 = [150, 200, 200, 250, 300, 350, 400, 600, 650, 650, 700, 700, 750, 750, 800], B0 = [450, 500, 500, 550, 550, 550, 600, 600, 900, 950, 1000, 1050, 1100, 1200, 1300];
    const A1 = [300, 350, 400, 400, 450, 500, 550, 600, 600, 650, 700, 750, 800, 900, 1000];
    const SETS = [[A0, B0], [A1, A1.map(v => v + 200)], [A1, A1.slice(0, 14).concat([30000])]];
    let k = 0, timer = null;
    const run = btn(S.run, true);
    const line = svgBox(460, 120, S.line), grid = svgBox(460, 340, S.grid);
    const verdict = el('p', {class: 'verdict', hidden: ''});
    body.append(el('div', {class: 't-ctl'}, [seg(S.presets, 0, i => { k = i; clearInterval(timer); verdict.hidden = true; drawLine(); drawGrid(-1); stats(false); })]),
      el('div', {class: 't-sheet'}, [el('p', {class: 't-lbl', text: S.line}), line]),
      el('div', {class: 't-sheet'}, [el('p', {class: 't-lbl', text: S.grid}), el('div', {class: 'grid-wrap'}, [grid]),
        bigs([[S.share, 'mw-s'], [S.p, 'mw-p'], [S.med, 'mw-m'], [S.mean, 'mw-a']]), el('p', {class: 'note', id: 'mw-w', 'aria-live': 'polite'})]),
      el('div', {class: 't-ctl'}, [run]), verdict);
    const med = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    function test(A, B){ let u = 0; for (const a of A) for (const b of B) u += b > a ? 1 : b === a ? .5 : 0;
      const n1 = A.length, n2 = B.length, N = n1 + n2, all = A.concat(B), cnt = {}; all.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
      const tie = Object.values(cnt).reduce((s, t) => s + t * t * t - t, 0), mu = n1 * n2 / 2, sd = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tie / (N * (N - 1))));
      return {u, share: u / (n1 * n2), p: Math.min(1, 2 * (1 - Phi(Math.max(0, Math.abs(u - mu) - .5) / sd)))}; }
    function drawLine(){ const [A, B] = SETS[k], X = v => 20 + Math.min(v, 1400) / 1400 * 410; line.replaceChildren();
      L(line, 20, 104, 430, 104, C.t3); [0, 500, 1000].forEach(v => T(line, X(v), 100, nf(v), {a: 'middle', size: 14}));
      const put = (arr, y, col) => { const seen = {}; arr.forEach(v => { seen[v] = (seen[v] || 0) + 1; Ci(line, X(v), y - (seen[v] - 1) * 8, 4.5, col, {opacity: .9}); if (v > 1400) T(line, X(v) - 8, y + 4, nf(v) + ' ₽ →', {a: 'end', size: 14, fill: C.red}); }); };
      T(line, 4, 34, 'A', {fill: '#B8432B', w: 500, size: 15}); T(line, 4, 76, 'B', {fill: '#23418A', w: 500, size: 15});
      put(A, 34, C.a); put(B, 76, C.b); }
    function drawGrid(upto){ const [A, B] = SETS[k], c = 20, x0 = 80, y0 = 30; grid.replaceChildren();
      const sa = A.slice().sort((x, y) => x - y), sb = B.slice().sort((x, y) => x - y);
      sb.forEach((b, j) => { if (j % 2 === 0) T(grid, x0 + j * c + c / 2, y0 - 8, b > 9999 ? '30к' : nf(b), {a: 'middle', size: 12, fill: '#23418A'}); });
      sa.forEach((a, i) => { T(grid, x0 - 6, y0 + i * c + 14, nf(a), {a: 'end', size: 12, fill: '#B8432B'});
        sb.forEach((b, j) => { const done = i <= upto, w = b > a, tie = b === a;
          R(grid, x0 + j * c + 1, y0 + i * c + 1, c - 2, c - 2, !done ? '#F7F5F0' : w ? C.a : tie ? '#B9CBE3' : C.soft, {rx: 3, opacity: done && w ? .85 : 1}); }); }); }
    function stats(on){ const [A, B] = SETS[k], r = test(A, B), g = i => body.querySelector('#' + i);
      g('mw-s').textContent = on ? pct(r.share) : '—'; g('mw-p').textContent = on ? pf(r.p) : '—';
      g('mw-m').textContent = nf(med(A)) + ' · ' + nf(med(B)); g('mw-a').textContent = nf(Math.round(mean(A))) + ' · ' + nf(Math.round(mean(B)));
      g('mw-w').textContent = on ? fill(S.wins, {u: nf(r.u, r.u % 1 ? 1 : 0), n: nf(A.length * B.length)}) : '';
      return r; }
    run.onclick = () => { clearInterval(timer); let i = -1; reveal(); verdict.hidden = true;
      timer = setInterval(() => { drawGrid(++i); if (i >= 14){ clearInterval(timer); const r = stats(true), [, B] = SETS[k];
        verdict.hidden = false; verdict.className = 'verdict' + (r.p < .05 ? ' good' : '');
        verdict.textContent = fill(S['v' + k], {pct: pct(r.share), p: pf(r.p), m: nf(Math.round(mean(B)))}); } }, 45); };
    drawLine(); drawGrid(-1); stats(false);
  }

  /* ---------- хи-квадрат ---------- */
  function chi(body, S, reveal){
    let mode = 0, chis = [], over = 0;
    // Q(x; 5) = P(χ²₅ > x) — точная формула для 5 степеней свободы
    const Q5 = x => { const r = Math.sqrt(x), ph = Math.exp(-x / 2) / Math.sqrt(2 * Math.PI); return Math.min(1, 2 * (1 - Phi(r)) + 2 * ph * r * (1 + x / 3)); };
    const roll = () => { const c = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 60; i++){ const u = Math.random(); c[mode ? (u < 1 / 3 ? 5 : Math.floor((u - 1 / 3) / (2 / 15))) : Math.floor(u * 6)]++; } return c; };
    const stat = c => c.reduce((s, o) => s + (o - 10) ** 2 / 10, 0);
    const run = btn(S.run, true), many = btn(S.many);
    const bars = svgBox(460, 200, S.bars), hist = svgBox(460, 170, S.hist), cnt = el('p', {class: 'note', 'aria-live': 'polite'}), verdict = el('p', {class: 'verdict', hidden: ''});
    body.append(el('div', {class: 't-ctl'}, [seg(S.modes, 0, i => { mode = i; chis = []; over = 0; draw(null); verdict.hidden = true; })]),
      el('div', {class: 't-sheet'}, [el('p', {class: 't-lbl', text: S.bars}), bars, bigs([[S.chi, 'chi-c'], [S.p, 'chi-p']])]),
      el('div', {class: 't-sheet'}, [el('p', {class: 't-lbl', text: S.hist}), hist, cnt]), el('div', {class: 't-ctl'}, [run, many]), verdict);
    function draw(c){ bars.replaceChildren(); hist.replaceChildren();
      const Y = v => 170 - v * 5.5; L(bars, 30, 170, 440, 170, C.t3);
      for (let i = 0; i < 6; i++){ const x = 45 + i * 66; if (c){ R(bars, x, Y(c[i]), 46, c[i] * 5.5, i === 5 && mode ? C.b : C.a, {rx: 3, opacity: .85}); T(bars, x + 23, Y(c[i]) - 6, c[i], {a: 'middle', size: 15, fill: C.ink, w: 500}); }
        T(bars, x + 23, 190, i + 1, {a: 'middle', size: 14}); }
      L(bars, 30, Y(10), 440, Y(10), C.ink, 1.5, '6 4'); T(bars, 440, Y(10) - 6, '10', {a: 'end', size: 14, fill: C.ink});
      const X = v => 30 + Math.min(v, 30) / 30 * 410, bins = new Array(31).fill(0); chis.forEach(v => bins[Math.min(30, Math.floor(v))]++);
      const mx = Math.max(1, ...bins); bins.forEach((b, i) => R(hist, X(i) + 1, 130 - b / mx * 110, 410 / 30 - 2, b / mx * 110, i >= 11 ? C.red : C.a, {opacity: .8}));
      L(hist, 30, 130, 440, 130, C.t3); L(hist, X(11.07), 14, X(11.07), 130, C.ink, 1.5, '5 4'); T(hist, X(11.07) + 4, 24, '11.07', {size: 14, fill: C.ink});
      [0, 10, 20, 30].forEach(v => T(hist, X(v), 150, v, {a: 'middle', size: 14}));
      cnt.textContent = chis.length ? fill(S.over, {k: nf(over), n: nf(chis.length), pct: pct(over / chis.length)}) : '';
      const g = i => body.querySelector('#' + i), x = c ? stat(c) : null;
      g('chi-c').textContent = c ? nf(x, 1) : '—'; g('chi-p').textContent = c ? pf(Q5(x)) : '—'; }
    const push = c => { const x = stat(c); chis.push(x); if (x > 11.07) over++; return x; };
    run.onclick = () => { const c = roll(), x = push(c); draw(c); reveal(); verdict.hidden = false; verdict.className = 'verdict' + (x > 11.07 ? ' bad' : '');
      verdict.textContent = fill(x > 11.07 ? S.vBad : S.vFair, {c: nf(x, 1), pv: pv(Q5(x))}); };
    many.onclick = () => { let c; for (let i = 0; i < 1000; i++){ c = roll(); push(c); } draw(c); reveal(); };
    draw(null);
  }

  /* ---------- размер выборки ---------- */
  function ss(body, S, reveal){
    const K = Math.pow(1.959964 + 0.841621, 2);
    let p = 10, d = 1;
    const nOf = (p1, dd) => { const a = p1 / 100, b = (p1 + dd) / 100; return Math.ceil(K * (a * (1 - a) + b * (1 - b)) / ((b - a) ** 2)); };
    const pOut = el('output'), pIn = el('input', {type: 'range', min: 2, max: 30, step: 1, value: 10, 'aria-label': S.base});
    const dOut = el('output'), dIn = el('input', {type: 'range', min: .2, max: 5, step: .1, value: 1, 'aria-label': S.mde});
    const run = btn(S.run, true), half = btn(S.half);
    const chart = svgBox(460, 120, S.chart), cnt = el('p', {class: 'note', 'aria-live': 'polite'}), verdict = el('p', {class: 'verdict', hidden: ''});
    const nBig = el('b', {class: 'n', text: '—'});
    body.append(el('div', {class: 't-ctl'}, [el('label', {class: 't-field'}, [el('span', {text: S.base}), pOut, pIn]), el('label', {class: 't-field'}, [el('span', {text: S.mde}), dOut, dIn])]),
      el('div', {class: 't-sheet'}, [el('div', {class: 'big2'}, [el('div', {}, [nBig, el('span', {text: S.n})])]), el('p', {class: 'note', text: S.note})]),
      el('div', {class: 't-sheet'}, [el('p', {class: 't-lbl', text: S.chart}), chart, cnt]), el('div', {class: 't-ctl'}, [run, half]), verdict);
    const X = z => 30 + (Math.max(-2, Math.min(8, z)) + 2) / 10 * 410;
    function axis(){ chart.replaceChildren(); R(chart, X(-2), 10, X(1.96) - X(-2), 60, C.soft, {rx: 4}); L(chart, 30, 70, 440, 70, C.t3);
      [-2, 0, 2, 4, 6, 8].forEach(z => T(chart, X(z), 90, (z < 0 ? '−' : '') + Math.abs(z), {a: 'middle', size: 14})); T(chart, X(1.96) + 4, 108, '1.96', {size: 14, fill: C.ink}); }
    function upd(){ p = +pIn.value; d = Math.min(+dIn.value, 99 - p); pOut.textContent = nf(p) + '%'; dOut.textContent = '+' + nf(d, 1) + ' п. п.';
      nBig.textContent = nf(nOf(p, d)); axis(); cnt.textContent = ''; verdict.hidden = true; }
    pIn.oninput = upd; dIn.oninput = upd;
    half.onclick = () => { dIn.value = Math.max(.2, Math.round(+dIn.value / 2 * 10) / 10); upd(); };
    run.onclick = () => { const n = nOf(p, d), a = p / 100, b = (p + d) / 100; let k = 0; axis(); reveal();
      for (let i = 0; i < 200; i++){ const xa = Math.max(0, Math.round(n * a + Math.sqrt(n * a * (1 - a)) * gauss())), xb = Math.max(0, Math.round(n * b + Math.sqrt(n * b * (1 - b)) * gauss()));
        const pa = xa / n, pb = xb / n, se = Math.sqrt(pa * (1 - pa) / n + pb * (1 - pb) / n), z = se ? (pb - pa) / se : 0, hit = z > 1.96; if (hit) k++;
        Ci(chart, X(z), 20 + (i % 10) * 5, 3, hit ? C.pen : '#9AA4B5', {opacity: .8}); }
      cnt.textContent = fill(S.caught, {k, n: 200, pct: pct(k / 200)}); verdict.hidden = false; verdict.className = 'verdict good';
      verdict.textContent = fill(S.v, {mde: nf(d, 1), k, pct: pct(k / 200)}); };
    upd();
  }

  document.querySelectorAll('.t-toy[data-ttoy]').forEach(setup);
})();
