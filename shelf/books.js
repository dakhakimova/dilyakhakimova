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
    const bar = box.querySelector('.bk-share');
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
    const NS = [10000, 20000, 50000, 100000, 200000, 500000, 1000000];
    function upd(){
      const n = NS[+inp('n').value], loss = +inp('loss').value / 100;
      const a = Math.round(n / 2), b = Math.round(n / 2 * (1 - loss)), e = (a + b) / 2;
      const chi2 = ((a - e) ** 2 + (b - e) ** 2) / e, p = erfc(Math.sqrt(chi2 / 2));
      o('n').textContent = NF.format(n);
      o('loss').textContent = inp('loss').value + '%';
      o('p').textContent = fmtP(p);
      const bad = p < 0.0005, mid = !bad && p < 0.05;
      verdict.className = 'verdict ' + (bad ? 'bad' : mid ? 'warn' : 'good');
      verdict.textContent = tr(bad ? 'bx.i3.bad' : mid ? 'bx.i3.mid' : 'bx.i3.ok');
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
