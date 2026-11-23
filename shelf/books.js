/* Рубрика «Котейка читает»: интерактивы разборов, высота встроенных игр /play/, «Скинуть коллеге».
   Строки — из словаря i18n/books.js (ключи bx.*), он подключён на странице раньше этого файла.
   Интерактивы ищутся по data-toy: ideas (20 идей), twyman (вероятность бага), srm (χ²-проверка перекоса групп).
   Модели и числа — свои, игрушечные; из книги — только порядок величин. */
(function(){
  const I = window.I18N || {}, RU = I.ru || {};
  const tr = (k, o = {}) => (I.typo ? I.typo('ru', RU[k] || k) : (RU[k] || k)).replace(/\{(\w+)\}/g, (_, x) => x in o ? o[x] : '');
  // числа: десятичная точка, тысячи через неразрывный пробел, % вплотную
  const ruF = o => { const f = new Intl.NumberFormat('en-US', Object.assign({useGrouping: false}, o)); return {format: x => f.format(x).replace(/^-(?=0(\.0+)?(\D|$))/, '').replace(/^(\D*)(\d{5,})/, (_, a, d) => a + d.replace(/\B(?=(\d{3})+$)/g, '\u00a0'))}; };
  const NF = ruF({});
  const pct = (x, d = 0) => ruF({style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d}).format(x);
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}, parent) => { const e = document.createElementNS(SVG, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const C = {win: '#0E7E5F', zero: '#CFC8BB', loss: '#C9413A', ctrl: '#23418A', test: '#E8644A', coral: '#E8644A', ink: '#24221F', mute: '#5E5A53', line: '#E3DED4'};

  // erfc: Абрамовиц–Стиган 7.1.26 (точности хватает для подписей; для крошечных p — асимптотика)
  function erfc(x){
    if (x > 6) return Math.exp(-x * x) / (x * Math.sqrt(Math.PI)) * (1 - 1 / (2 * x * x));
    const t = 1 / (1 + 0.3275911 * x);
    const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    return y * Math.exp(-x * x);
  }
  const SUP = {'-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'};
  function fmtP(p){
    if (p >= 0.001) return ruF({maximumFractionDigits: 3}).format(p);
    if (p < 1e-300) return '≈ 0';
    const k = Math.floor(Math.log10(p)), m = p / Math.pow(10, k);
    return m.toFixed(1) + '·10' + String(k).split('').map(c => SUP[c]).join('');
  }

  // ---------- 1. Двадцать идей ----------
  document.querySelectorAll('[data-toy="ideas"]').forEach(box => {
    const svg = box.querySelector('svg'), out = box.querySelector('.bk-out');
    const RATES = {young: [1 / 3, 1 / 3], mature: [0.15, 0.35]}; // [помогла, навредила], остальное — ноль
    let mode = 'young', tot = {w: 0, n: 0};
    const bar = box.querySelector('.bk-shares');
    const share = () => {
      const segs = mode === 'young'
        ? [['win', 33.3, tr('bx.i1.young.w')], ['zero', 33.4, tr('bx.i1.young.z')], ['loss', 33.3, tr('bx.i1.young.l')]]
        : [['win', 15, tr('bx.i1.mat.w')], ['rest', 85, tr('bx.i1.mat.rest')]];
      bar.innerHTML = segs.map(([k, w, txt]) => `<span class="s-${k}" style="flex:${w}">${txt}</span>`).join('');
    };
    const cup = (x, y, kind) => {
      const g = el('g', {transform: `translate(${x},${y}) scale(.86)`}, svg);
      const fill = kind === 'rest' ? 'url(#cup-rest)' : C[kind];
      el('path', {d: 'M2 10 h30 l-3 32 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4 z', fill}, g);
      el('path', {d: 'M32 16 h3 a6 6 0 0 1 0 12 h-4', fill: 'none', stroke: kind === 'rest' ? '#E3A29C' : C[kind], 'stroke-width': 3}, g);
      const sym = {win: '✓', zero: '–', loss: '✕', rest: '?'}[kind];
      const t = el('text', {x: 17, y: 34, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: kind === 'zero' ? C.ink : '#fff'}, g);
      t.textContent = sym;
    };
    function run(){
      svg.textContent = '';
      const defs = el('defs', {}, svg), gr = el('linearGradient', {id: 'cup-rest', x1: 0, x2: 1, y1: 0, y2: 0}, defs);
      el('stop', {offset: '0', 'stop-color': C.zero}, gr); el('stop', {offset: '1', 'stop-color': '#E3A29C'}, gr);
      const [pw, pl] = RATES[mode], res = [];
      for (let i = 0; i < 20; i++){ const u = Math.random(); res.push(u < pw ? 'win' : mode === 'mature' ? 'rest' : u < pw + pl ? 'loss' : 'zero'); }
      res.sort((a, b) => ['win', 'zero', 'rest', 'loss'].indexOf(a) - ['win', 'zero', 'rest', 'loss'].indexOf(b));
      box.querySelectorAll('[data-lg]').forEach(x => { x.hidden = (x.dataset.lg === 'rest') !== (mode === 'mature'); });
      res.forEach((k, i) => cup(4 + (i % 10) * 43.6, 4 + Math.floor(i / 10) * 56, k));
      share();
      const c = k => res.filter(x => x === k).length;
      tot.w += c('win'); tot.n += 20;
      out.textContent = tot.n > 20 ? tr('bx.i1.tot', {w: tot.w, n: tot.n}) : '';
    }
    box.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode; tot = {w: 0, n: 0};
      box.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      run();
    }));
    box.querySelector('[data-act=run]').addEventListener('click', run);
    run();
  });

  // ---------- 2. Закон Твимена: вероятность, что «победа» — баг ----------
  document.querySelectorAll('[data-toy="twyman"]').forEach(box => {
    const svg = box.querySelector('svg'), inp = k => box.querySelector(`[data-k=${k}]`), o = k => box.querySelector(`[data-o=${k}]`);
    const verdict = box.querySelector('.verdict');
    // модель: честный результат ~ N(0,3; 0,8) %, результат с багом ~ N(0; 8) % — свои игрушечные числа
    const OK = [0.3, 0.8], BUG = [0, 8];
    const pdf = (x, [m, s]) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
    // одна ручка — эффект; доля тестов с багом фиксирована: 3 из 100
    const PRIOR = 0.03, X0 = 0, X1 = 15, L = 9, R = 431; // шкала совпадает с ползунком 0…15
    const sx = x => L + (x - X0) / (X1 - X0) * (R - L);
    function draw(eff, post){
      svg.textContent = '';
      // шкала эффекта: где бывают честные результаты и где — с багом
      const Y = 12;
      el('rect', {x: L, y: Y - 8, width: R - L, height: 16, rx: 8, fill: '#F6D9D2'}, svg);
      el('rect', {x: L, y: Y - 8, width: sx(2) - L, height: 16, rx: 8, fill: C.ctrl}, svg);
      const t1 = el('text', {x: L, y: Y + 30, class: 'sm'}, svg); t1.textContent = tr('bx.i2.okzone');
      const t2 = el('text', {x: R, y: Y + 30, 'text-anchor': 'end', class: 'sm'}, svg); t2.textContent = tr('bx.i2.bugzone');
      el('line', {x1: sx(eff), y1: Y - 12, x2: sx(eff), y2: Y + 12, stroke: C.ink, 'stroke-width': 2.5}, svg);
      // 20 тестов с таким эффектом
      const nb = Math.round(post * 20), Y2 = 78;
      const h = el('text', {x: L, y: Y2, class: 'lb'}, svg); h.textContent = tr('bx.i2.of20', {e: '+' + eff.toFixed(1) + '%'});
      for (let i = 0; i < 20; i++){
        el('rect', {x: L + i * 20.4, y: Y2 + 12, width: 16, height: 16, rx: 3, fill: i < nb ? C.coral : C.ctrl}, svg);
      }
    }
    function upd(){
      const eff = +inp('eff').value;
      const a = PRIOR * pdf(eff, BUG), b = (1 - PRIOR) * pdf(eff, OK), post = a / (a + b);
      o('eff').textContent = '+' + eff.toFixed(1) + '%';
      o('post').textContent = post > 0.995 ? '> 99%' : post < 0.005 ? '< 1%' : pct(post);
      verdict.className = 'verdict ' + (post < 0.2 ? 'good' : post < 0.7 ? 'warn' : 'bad');
      verdict.textContent = tr(post < 0.2 ? 'bx.i2.lo' : post < 0.7 ? 'bx.i2.mid' : 'bx.i2.hi');
      draw(eff, post);
    }
    box.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
    upd();
  });

  // ---------- 3. SRM: χ²-проверка перекоса групп ----------
  document.querySelectorAll('[data-toy="srm"]').forEach(box => {
    const svg = box.querySelector('svg'), inp = k => box.querySelector(`[data-k=${k}]`), o = k => box.querySelector(`[data-o=${k}]`);
    const verdict = box.querySelector('.verdict');
    let n = 1000000; // размер теста — переключатель, ползунок один: сколько потеряли
    // шкала ползунка растёт для маленьких тестов: на 10 000 SRM начинается только с потери около 7%
    const MAXL = {10000: 12, 100000: 5, 1000000: 2};
    const chiAt = (nn, l) => { const a = nn / 2, b = nn / 2 * (1 - l), e = (a + b) / 2; return ((a - e) ** 2 + (b - e) ** 2) / e; };
    const lossAtThr = nn => { let lo = 0, hi = 0.5; for (let i = 0; i < 60; i++){ const m = (lo + hi) / 2; chiAt(nn, m) < 12.12 ? lo = m : hi = m; } return hi; };
    const setN = (nn, keepShare) => {
      const r = inp('loss'), old = +r.value / +r.max; n = nn; r.max = MAXL[n]; r.step = MAXL[n] > 5 ? 0.2 : 0.1;
      r.value = keepShare ? Math.round(old * MAXL[n] / +r.step) * +r.step : r.value;
      const t = box.querySelector('.srm-thr'); if (t) t.textContent = tr('bx.i3.thrloss', {n: NF.format(n), l: (lossAtThr(n) * 100).toFixed(1)});
    };
    box.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
      box.querySelectorAll('[data-n]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); setN(+b.dataset.n, true); upd();
    }));
    setN(n, false);
    function upd(){
      const loss = +inp('loss').value / 100;
      const a = Math.round(n / 2), b = Math.round(n / 2 * (1 - loss)), e = (a + b) / 2;
      const chi2 = ((a - e) ** 2 + (b - e) ** 2) / e, p = erfc(Math.sqrt(chi2 / 2));
      o('loss').textContent = inp('loss').value + '%';
      o('p').textContent = fmtP(p);
      const bad = p < 0.0005, mid = !bad && p < 0.05;
      verdict.className = 'verdict ' + (bad ? 'bad' : mid ? 'warn' : 'good');
      verdict.textContent = tr(bad ? 'bx.i3.bad' : mid ? 'bx.i3.mid' : 'bx.i3.ok');
      // таблица «ждали — пришло»: из неё и складывается χ²
      const tab = box.querySelector('.chi-tab');
      if (tab){
        const sg = x => (x > 0 ? '+' : x < 0 ? '−' : '') + NF.format(Math.abs(Math.round(x)));
        const f1 = x => x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : NF.format(Math.round(x));
        const row = (g, r) => `<tr><th scope="row">${g}</th><td>${NF.format(Math.round(e))}</td><td>${NF.format(r)}</td><td>${sg(r - e)}</td><td>${f1((r - e) ** 2 / e)}</td></tr>`;
        tab.innerHTML = `<thead><tr><th scope="col">${tr('bx.i3.t.g')}</th><th scope="col">${tr('bx.i3.t.e')}</th><th scope="col">${tr('bx.i3.t.r')}</th><th scope="col">${tr('bx.i3.t.d')}</th><th scope="col">${tr('bx.i3.t.c')}</th></tr></thead>`
          + `<tbody>${row('A', a)}${row('B', b)}</tbody><tfoot><tr><th scope="row" colspan="4">${tr('bx.i3.t.sum')}</th><td>${f1(chi2)}</td></tr></tfoot>`;
      }
      // χ² → доля честных тестов, где χ² не меньше: кривая хвоста, порог SRM и наше значение
      const cs = box.querySelector('svg.chi');
      if (cs){
        cs.textContent = '';
        // шкала постоянная, но сжатая (по корню из χ²): порог стоит на месте, а наше χ² до 100 при любом ползунке видно
        const XM = 110, L = 44, R = 428, B = 122, T = 30, THR = 12.12;
        const px = x => L + Math.sqrt(Math.min(x, XM) / XM) * (R - L), py = q => B - q * (B - T);
        const S = x => x <= 0 ? 1 : erfc(Math.sqrt(x / 2));
        for (const q of [0, 0.5, 1]){
          el('line', {x1: L, y1: py(q), x2: R, y2: py(q), stroke: C.line, 'stroke-width': q ? 1 : 1.5}, cs);
          const yt = el('text', {x: L - 8, y: py(q) + 4, 'text-anchor': 'end', class: 'ax'}, cs); yt.textContent = Math.round(q * 100) + '%';
        }
        let d = '';
        for (let i = 0; i <= 400; i++){ const x = XM * Math.pow(i / 400, 2); d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(S(x)).toFixed(1); }
        el('path', {d, fill: 'none', stroke: C.ctrl, 'stroke-width': 2.5}, cs);
        for (const v of [0, 1, 4, 12, 25, 50, 100]){ el('line', {x1: px(v), y1: B, x2: px(v), y2: B + 4, stroke: C.mute}, cs); const tt = el('text', {x: px(v), y: B + 20, 'text-anchor': 'middle', class: 'ax'}, cs); tt.textContent = v; }
        const ax = el('text', {x: R, y: B + 40, 'text-anchor': 'end', class: 'ax'}, cs); ax.textContent = tr('bx.i3.ax');
        // опорные точки: χ² = 3.84 → 5%, порог SRM 12.1 → 1 из 2000
        el('line', {x1: px(THR), y1: T + 2, x2: px(THR), y2: B, stroke: C.loss, 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, cs);
        const tl = el('text', {x: Math.min(R - 120, Math.max(L + 120, px(THR))), y: T - 6, 'text-anchor': 'middle', class: 'sm halo'}, cs); tl.textContent = tr('bx.i3.thr');
        const v = chi2 < 10 ? chi2.toFixed(2) : chi2 < 100 ? chi2.toFixed(1) : NF.format(Math.round(chi2));
        {
          el('circle', {cx: px(chi2), cy: py(S(chi2)), r: 6, fill: C.ink}, cs);
          const q = S(chi2), X = Math.min(R - 4, Math.max(L + 4, px(chi2)));
          const nearR = px(chi2) > R - 50; const l1 = el('text', {x: px(chi2) + (nearR ? -10 : 10), y: py(q) - 10, 'text-anchor': nearR ? 'end' : 'start', class: 'lb halo'}, cs); l1.textContent = v;
          const qs = q >= 0.1 ? pct(q) : q >= 0.001 ? pct(q, 1) : null;
          const rd = box.querySelector('.chi-read');
          if (rd) rd.textContent = tr('bx.i3.ours', {v}) + ': ' + (qs ? tr('bx.i3.share2', {p: qs}) : tr('bx.i3.rare2')) + '.';
        }
        cs.setAttribute('aria-label', tr('bk.i3.dist') + '. ' + tr('bx.i3.ours', {v}));
      }
      // полоса: доля A и B, засечка 50 %
      svg.textContent = '';
      const W = 424, x0 = 8, wa = W * a / (a + b);
      el('rect', {x: x0, y: 8, width: wa, height: 26, rx: 5, fill: C.ctrl}, svg);
      el('rect', {x: x0 + wa, y: 8, width: W - wa, height: 26, rx: 5, fill: C.test}, svg);
      el('line', {x1: x0 + W / 2, y1: 2, x2: x0 + W / 2, y2: 40, stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': '3 3'}, svg);
      const ta = el('text', {x: x0, y: 58, class: 'sm'}, svg); ta.textContent = tr('bx.i3.a', {a: NF.format(a)});
      const tb = el('text', {x: x0 + W, y: 58, 'text-anchor': 'end', class: 'sm'}, svg); tb.textContent = tr('bx.i3.b', {b: NF.format(b)});
      svg.setAttribute('aria-label', tr('bx.i3.a', {a: NF.format(a)}) + ', ' + tr('bx.i3.b', {b: NF.format(b)}) + ', ' + tr('bx.i3.share', {s: pct(a / (a + b), 2)}));
    }
    box.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
    upd();
  });

  // ---------- встроенные игры /play/<slug>/?embed=1: высота по сообщениям моста (/play/bridge.js) ----------
  const frames = [...document.querySelectorAll('.bk-frame iframe')];
  const alive = new Set();
  addEventListener('message', e => {
    const f = frames.find(x => x.contentWindow === e.source);
    if (!f || !e.data || e.data.type !== 'toy:h') return;
    alive.add(f); f.style.height = Math.max(320, Math.min(4000, +e.data.h || 0)) + 'px';
  });
  // iframe с loading=lazy молчит, пока не доскроллили: «сломан» — только если 12 с без ответа после появления в окне
  if ('IntersectionObserver' in window) frames.forEach(f => {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)){ io.disconnect(); setTimeout(() => { if (!alive.has(f)) f.parentNode.classList.add('broken'); }, 12000); } });
    io.observe(f);
  });

  // ---------- одна кнопка «Поделиться» (как у терминов): на телефоне — системное меню, иначе ссылка в буфер и «Ссылка скопирована» на 2 секунды ----------
  const main = document.querySelector('main.bk'), share = main && main.querySelector('[data-act=share]');
  if (share){
    const st = main.querySelector('.bk-share [role=status]'), page = location.origin + location.pathname;
    const link = m => page + '?utm_source=share&utm_medium=' + m + '&utm_content=books';
    let tm = 0;
    const say = (m, ms) => { st.textContent = m; clearTimeout(tm); if (ms) tm = setTimeout(() => { st.textContent = ''; }, ms); };
    share.addEventListener('click', async () => {
      const url = link('books'), title = main.dataset.shareTitle, text = main.dataset.shareText;
      if (navigator.share && matchMedia('(pointer: coarse)').matches){
        try { await navigator.share({title, text, url}); return; } catch(e) { if (e && e.name === 'AbortError') return; }
      }
      try { await navigator.clipboard.writeText(url); say(main.dataset.sCopied, 2000); } catch(e) { say(url); }
    });
  }
})();
