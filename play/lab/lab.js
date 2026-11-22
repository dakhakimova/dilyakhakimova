/* Новые игры /play/ (ветка new-games): общий каркас «Сначала угадай → Потом проверь».
   Подключается на страницах <курс>/0NN-lab.html после движка курса (signal/book.js или ab-basics/course.js),
   до файлов самих игр /play/lab/<slug>.js. Сам ничего не рисует.

   Правило Дили для игр: до первого запуска на экране только вопрос, прогноз (фраза с пропуском) и одна залитая кнопка,
   которая сразу проводит весь опыт из вопроса. После запуска — итог рядом с прогнозом, одно тихое «Ещё раз»
   и, если нужен масштаб, одна контурная «×1000». Ни «+1», ни «Сбросить», ни «Новая …».

   Разметка карточки (см. любую 0NN-lab.html): шаги «Сначала угадай» и «Потом проверь» — две одинаковые карточки
   .lab-c, как у эталона (пара 34e); вторая открывается первым запуском, туда же переезжает «Твой ответ был…» моста.
     <section class="card" data-toy="<slug>"> <h2> (на /play/ скрыт)
       <div class="lab-c lab-c1"> метка · абзац · .lab-guess (поле input.guess-in или выбор .lab-pick) → .lab-status[role=status] → .lab-go [data-lab=run]
       <div class="lab-c lab-c2" hidden> .lab-stage[hidden] (метка, график) → .lab-after[hidden] ([data-lab=x1000], [data-lab=again])
   Без прогноза кнопка не запускает игру и не считается касанием (на /play/ решение не раскрывается).

   Lab.game(slug, {min, max, unit, fmt, run(api), again(api), x1000(api), draw(api)}) — api: {card, q, guess, status, stage, runs}. */
(function(){
  'use strict';
  const Lab = window.Lab = {};
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  Lab.REDUCED = REDUCED;
  // цвета — из движка курса (COL), чтобы смена палитры там дошла и сюда
  const ENG = (typeof COL === 'object' && COL) ? COL : {};
  Lab.C = Object.assign({ctrl:'#23418A', test:'#E8644A', testInk:'#B8432B', truth:'#0E7E5F', trap:'#C9413A', trapInk:'#A8352F',
    gray:'#A3A19A', ink:'#2F2E2B', ink2:'#6B6A65', grid:'#E1E0D9', fillGray:'#F4F3F0', fillB:'#F8DCD8', fillG:'#E2F0EB', fillC:'#E6ECF7', fillT:'#FCE8E3',
    pen:'#23418A', accent:'#E8644A', paper:'#FBF9F4'}, ENG);
  // поверхность листа — тёплая бумага из tokens.css (--surface), чистого белого на сайте нет
  { const sf = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(); if (sf) Lab.C.paper = sf; }
  const PAPER = v => (v === '#fff' || v === '#FFF' || v === '#ffffff' || v === '#FFFFFF') ? Lab.C.paper : v;

  // ---------- числа по правилам сайта: «0.05», «90%», «10 000», «−3», без «−0» ----------
  const grp = s => s.replace(/^(\d{5,})/, d => d.replace(/\B(?=(\d{3})+$)/g, ' '));
  Lab.num = (x, d = 0) => { let s = Math.abs(x).toFixed(d); if (+s === 0) return s; return (x < 0 ? '−' : '') + grp(s); };
  Lab.numT = (x, d = 1) => { let s = Lab.num(x, d); if (s.includes('.')) s = s.replace(/\.?0+$/, ''); return s; };
  Lab.signed = (x, d = 0) => (x > 0 && +Math.abs(x).toFixed(d) !== 0 ? '+' : '') + Lab.num(x, d);
  Lab.pct = (x, d = 0) => Lab.num(100 * x, d) + '%';
  Lab.plural = (n, one, few, many) => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? many : k === 1 ? one : k >= 2 && k <= 4 ? few : many; };
  // ввод прогноза: «30», «30%», « 30 », «30,5», «−2», «-2 п. п.», «1/2» → число или null
  Lab.parse = s => {
    s = String(s == null ? '' : s).trim().replace(/[\s ]/g, '').replace(/[−–—]/g, '-').replace(',', '.').replace(/(%|п\.?п\.?|₽|руб\.?|раз[а]?|мест[а]?|кафе|тестов|из\d+)$/i, '');
    if (/^-?\d+(\.\d+)?\/\d+(\.\d+)?$/.test(s)){ const [a, b] = s.split('/').map(Number); return b ? a / b : null; }
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    const v = Number(s); return Number.isFinite(v) ? v : null;
  };

  // ---------- случайность ----------
  Lab.mulberry = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let R = Math.random;
  Lab.rand = () => R();
  Lab.seed = n => { R = n == null ? Math.random : Lab.mulberry(n); };
  Lab.gauss = () => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R());
  Lab.int = n => Math.floor(R() * n);
  Lab.binom = (n, p) => { if (n < 60){ let k = 0; for (let i = 0; i < n; i++) if (R() < p) k++; return k; } return Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * Lab.gauss()))); };
  Lab.normCdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  // двусторонний z-тест долей: a и b заказавших из n в каждой группе
  Lab.pZ = (a, b, na, nb = na) => { const p = (a + b) / (na + nb); const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb)); if (!se) return 1; const z = (b / nb - a / na) / se; return 2 * (1 - Lab.normCdf(Math.abs(z))); };
  Lab.mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  Lab.corr = (xs, ys) => { const n = xs.length, mx = Lab.mean(xs), my = Lab.mean(ys); let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++){ const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sx += dx * dx; sy += dy * dy; } return sx && sy ? sxy / Math.sqrt(sx * sy) : 0; };
  Lab.slope = (xs, ys) => { const mx = Lab.mean(xs), my = Lab.mean(ys); let a = 0, b = 0; xs.forEach((x, i) => { a += (x - mx) * (ys[i] - my); b += (x - mx) ** 2; }); return b ? a / b : 0; };

  // ---------- время ----------
  Lab.sleep = ms => new Promise(ok => setTimeout(ok, REDUCED ? 0 : ms));
  // плавный переход: f(t), t от 0 до 1; при prefers-reduced-motion — сразу конечный кадр
  Lab.anim = (ms, f) => new Promise(ok => {
    if (REDUCED || ms <= 0){ f(1); return ok(); }
    const t0 = performance.now();
    const step = now => { const t = Math.min(1, (now - t0) / ms); f(t); t < 1 ? requestAnimationFrame(step) : ok(); };
    requestAnimationFrame(step);
  });
  Lab.ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // ---------- холсты ----------
  Lab.FONT = '13px Onest, system-ui, sans-serif';
  Lab.FONT14 = '14px Onest, system-ui, sans-serif';
  Lab.canvas = (cv, ratio = 0.5, mobileRatio = 0.8, fixedH) => {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth;
    if (!w) return null;
    const h = fixedH || Math.round(w * (w < 520 ? mobileRatio : ratio));
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    c.font = Lab.FONT; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.lineCap = 'round';
    return {c, w, h, small: w < 520};
  };
  // текст на подложке цвета фона (метка не ложится на линии)
  Lab.tag = (c, t, x, y, color = Lab.C.ink, align = 'left', font = Lab.FONT14, bg = Lab.C.paper) => {
    c.font = font; const tw = c.measureText(t).width, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    if (bg){ c.fillStyle = bg; c.fillRect(x0 - 3, y - 12, tw + 6, 16); }
    c.fillStyle = color; c.textAlign = 'left'; c.fillText(t, x0, y); c.font = Lab.FONT;
  };
  Lab.text = (c, t, x, y, color = Lab.C.ink2, align = 'left', font = Lab.FONT14) => { c.font = font; c.fillStyle = color; c.textAlign = align; c.fillText(t, x, y); c.textAlign = 'left'; c.font = Lab.FONT; };
  // горизонтальная сетка и подписи Y слева; ticks — значения, fmt — подпись
  Lab.gridY = (c, Y, x0, x1, ticks, fmt, labelX = 0) => {
    c.lineWidth = 1; c.font = Lab.FONT;
    ticks.forEach(v => { const y = Math.round(Y(v)) + 0.5; c.strokeStyle = Lab.C.grid; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.fillStyle = Lab.C.ink2; c.textAlign = 'left'; c.fillText(fmt(v), labelX, y + 4); });
  };
  Lab.ticksX = (c, X, y, ticks, fmt) => {
    const W = c.canvas.clientWidth; c.font = Lab.FONT; c.fillStyle = Lab.C.ink2;
    ticks.forEach(v => { const t = fmt(v), tw = c.measureText(t).width; let x = X(v) - tw / 2; x = Math.max(1, Math.min(W - tw - 1, x)); c.textAlign = 'left'; c.fillText(t, x, y); });
  };
  Lab.dot = (c, x, y, r, fill, stroke, lw = 1.5) => { c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); if (fill){ c.fillStyle = fill; c.fill(); } if (stroke){ c.strokeStyle = PAPER(stroke); c.lineWidth = lw; c.stroke(); } };
  Lab.line = (c, pts, color, lw = 2, dash) => { if (pts.length < 2) return; c.strokeStyle = color; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); };
  Lab.lerp = (a, b, t) => a + (b - a) * t;

  // ---------- игра ----------
  const fire = () => window.dispatchEvent(new Event('resize'));
  Lab.game = function(slug, o){
    const card = document.querySelector(`.card[data-toy~="${slug}"]`);
    if (!card) return null;
    const q = s => card.querySelector(s);
    const inp = q('input.guess-in'), box = q('.lab-guess'), run = q('[data-lab=run]'), stage = q('.lab-stage'),
      status = q('.lab-status'), after = q('.lab-after'), again = q('[data-lab=again]'), big = q('[data-lab=x1000]'), c2 = q('.lab-c2');
    // строка моста «Твой ответ был… Хочешь изменить?» — во второй карточке, под игрой
    if (c2) document.addEventListener('DOMContentLoaded', () => { const pf = card.querySelector(':scope > .pf'); if (pf) c2.appendChild(pf); });
    const api = {card, q, guess: null, runs: 0, stage,
      status(html){ status.innerHTML = html; },
      // «Твой прогноз: 10 · вышло: 36 из 100»
      verdict(got, extra){ status.innerHTML = 'Твой прогноз: <b>' + (o.fmt ? o.fmt(api.guess) : Lab.numT(api.guess, 2)) + '</b> · вышло: <b>' + got + '</b>' + (extra ? (/\.$/.test(got) ? ' ' : '. ') + extra : ''); }};
    let busy = false;
    const read = () => {
      if (o.pick) return o.pick(api);
      const v = Lab.parse(inp.value);
      const ex = o.example == null ? '30' : typeof o.example === 'number' ? Lab.numT(o.example, 2) : o.example;   // «−10», а не «-10»
      if (v === null) return {err: 'Сначала запиши прогноз: напиши число, например ' + ex + '.'};
      if (v < o.min || v > o.max) return {err: 'Напиши число от ' + Lab.numT(o.min, 2) + ' до ' + Lab.numT(o.max, 2) + '.'};
      return {v};
    };
    const go = async fn => {
      busy = true; after.hidden = true; fire();
      try { await fn(api); } catch(e) { console.error(e); }
      busy = false; api.runs++; after.hidden = false; fire();
      card.dispatchEvent(new CustomEvent('toy:ran', {bubbles: true}));   // мост: «Хочешь изменить?» (play/bridge.js)
    };
    run.addEventListener('click', e => {
      if (busy){ e.stopPropagation(); return; }
      const g = read();
      // без прогноза — не запуск и не касание игры: решение на /play/ не раскрывается
      if (g.err){ e.stopPropagation(); status.textContent = g.err; if (inp) inp.focus(); return; }
      api.guess = g.v;
      if (inp) inp.readOnly = true;
      box.classList.add('locked');
      card.querySelectorAll('.lab-pick .opts button').forEach(b => { b.disabled = true; });
      const gs = o.fmt ? o.fmt(g.v) : Lab.numT(g.v, 2); status.textContent = 'Запомнили: ' + gs + (/\.$/.test(gs) ? ' ' : '. ') + 'Проверяем…';
      run.hidden = true; stage.hidden = false; if (c2) c2.hidden = false; fire();
      requestAnimationFrame(() => go(o.run));
    });
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); if (!run.hidden) run.click(); } });
    if (again) again.addEventListener('click', () => { if (!busy) go(o.again || o.run); });
    if (big) big.addEventListener('click', () => { if (!busy) go(o.x1000); });
    if (o.draw){ let t = 0; window.addEventListener('resize', () => { if (stage.hidden) return; cancelAnimationFrame(t); t = requestAnimationFrame(() => { if (!busy) o.draw(api); }); }); }
    return api;
  };
  // выбор вместо числа: .lab-pick .opts button[data-v]; max — сколько можно выбрать
  Lab.pick = (card, max = 1) => {
    const btns = [...card.querySelectorAll('.lab-pick .opts button')];
    btns.forEach(b => { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') === 'true';
      if (!on && max === 1) btns.forEach(x => x.setAttribute('aria-pressed', 'false'));
      if (!on && max > 1 && btns.filter(x => x.getAttribute('aria-pressed') === 'true').length >= max) return;
      b.setAttribute('aria-pressed', String(!on));
    }); });
    return () => btns.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v);
  };
})();
