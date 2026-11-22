/* Движок глав бесплатных курсов «Вероятность на пальцах» (/probability/NN-*.html) и «Сигнал или шум» (/signal/NN-*.html, с главы 4).
   Основа — движок «A/B на пальцах» (ab-basics/course.js, раунд 4): карточки, квизы с перемешиванием, разминка, прогнозы,
   плитки, подсказки на графиках. Добавлено: баллы на сервер через SignalProgress (/signal/progress.js), прогноз числом .guess,
   задачи с собеседований details[data-key], строки движка в объекте BOOK_STR (готовность к переводу), числа через Intl.
   Глава 1 «Сигнала» (01-probability.html) работает на своём встроенном скрипте и этот файл не подключает.

   Порядок подключения на странице главы (см. /home/claude/free-courses/conventions.md):
     <body data-course="probability" data-chapter="p03" data-next="04-not-and-or.html">
     /signal/progress.js — сразу после <body>; потом карточки;
     /signal/book.js     — после разметки, до скрипта страницы с играми;
     /signal/py.js       — последним, если есть ячейки Python.
   Свои игры страница рисует в Book.onShow(fn) и по событию window 'resize' (холст без ширины не рисуется). */

// ---------- строки движка (i18n) ----------
const BOOK_STR = {
  ru: {
    next: 'Далее →', nextStep: 'Следующий шаг →', nextChapter: 'Следующая глава →', toToc: 'К оглавлению курса',
    of: ' из ', right: ['Отлично!', 'Всё правильно!', 'Точно!', 'Верно!', 'Так и есть!'], right2: ['Разобрался!', 'Теперь верно.', 'Вот теперь точно.'],
    wrong: 'Не совсем.', wrongDone: 'Этот вариант неверный.', wrongDefault: 'Этот вариант не подходит.', again: 'Попробуй ещё раз.',
    others: 'Можно открыть и другие варианты — у каждого своё объяснение.', nextQ: 'Следующий вопрос →', question: 'Вопрос ',
    firstTry: 'С первого раза верно: ', firstWarm: 'Вспомнил с первого раза: ', plus1: '+1 балл', warm: 'вспомнил',
    scoreTitle: 'Баллы за верные ответы с первой попытки', inCourse: ' · в курсе ',
    pts: {one: 'балл', few: 'балла', many: 'баллов', other: 'балла'},
    choiceSaved: 'Ответ записан. Сейчас проверим.',
    guessBad: 'Введи число от {min} до {max}.', guessSaved: 'Запомнили: {v}. Дальше проверим.',
  },
};
const LANG = (document.documentElement.lang || 'ru').slice(0, 2);
const S = Object.assign({}, BOOK_STR.ru, BOOK_STR[LANG] || {});
const tpl = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => k in o ? o[k] : '');

// ---------- числа и тексты ----------
const NF = {};
// useGrouping 'min2': «1024», но «10 000» (как в текстах курса). Браузеры без Intl.NumberFormat v3 (до Chrome 106,
// Firefox 116, Safari 15.4) читают строку как true и группируют и четырёхзначные («1 024») — ничего не ломается.
// Для ru по правилам сайта: десятичная точка («10.4»), тысячи — неразрывный пробел с пяти знаков («1024», «10 000»), % вплотную.
const grp5 = s => s.replace(/^-(?=0(\.0+)?(\D|$))/, '').replace(/^(\D*)(\d{5,})/, (_, a, d) => a + d.replace(/\B(?=(\d{3})+$)/g, '\u00a0'));
const nf = (d, min = d) => NF[d + ':' + min] || (NF[d + ':' + min] = LANG === 'ru'
  ? (f => ({format: x => grp5(f.format(x))}))(new Intl.NumberFormat('en-US', {maximumFractionDigits: d, minimumFractionDigits: min, useGrouping: false}))
  : new Intl.NumberFormat(LANG, {maximumFractionDigits: d, minimumFractionDigits: min, useGrouping: 'min2'}));
const num = (x, d = 1) => nf(d).format(x);                       // 10.4
const numT = (x, d = 1) => nf(d, 0).format(x);                   // без хвостовых нулей: 10 / 10.4
const int = x => nf(0).format(Math.round(x));                    // 10 000
const NBSP = ' ', MINUS = '−';
const share = (x, d = 1) => num(100 * x, d) + '%';        // 0.104 → «10.4%»
const shareT = (x, d = 1) => numT(100 * x, d) + '%';      // 0.1 → «10%»
const pct = (x, d = 1) => (x > 0 ? '+' : x < 0 ? MINUS : '') + num(Math.abs(100 * x), d) + '%'; // эффект со знаком
const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? MINUS : '') + num(Math.abs(x), d);
const PR = new Intl.PluralRules(LANG);
// plural(5, 'балл', 'балла', 'баллов') или plural(5, {one, few, many, other})
const plural = (n, one, few, many) => { const f = typeof one === 'object' ? one : {one, few, many, other: few}; return f[PR.select(Math.abs(n))] || f.other || f.many; };
const fmtP = p => p < 0.001 ? (LANG === 'ru' ? 'меньше 0.001' : '< 0.001') : num(p, 3);

// ---------- арифметика и случайность ----------
const sum = (a, i = 0, j = a.length) => { let s = 0; for (let k = i; k < j; k++) s += a[k]; return s; };
const mean = a => sum(a) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
// Случайность: по умолчанию Math.random; для воспроизводимых картинок — Book.seed(42).
let RND = Math.random;
const rand = () => RND();
const mulberry32 = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));   // целое от a до b включительно
const bern = p => rand() < p;
// Биномиальное число успехов, точно при любом n: до 60 — честные броски, дальше — обратная функция распределения
// от моды в обе стороны (одно rand() на число, шагов порядка нескольких SD). Нормальное приближение — только при n > 10^7.
const binom = (n, p) => {
  if (p <= 0 || n <= 0) return 0; if (p >= 1) return n;
  if (n < 60){ let k = 0; for (let i = 0; i < n; i++) if (rand() < p) k++; return k; }
  if (n > 1e7) return Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gauss())));
  const m = Math.min(n, Math.floor((n + 1) * p)), r = p / (1 - p), pm = binomPmf(n, m, p);
  let u = rand() - pm; if (u < 0) return m;
  let lo = m, hi = m, plo = pm, phi = pm;
  while (lo > 0 || hi < n){
    if (hi < n){ phi *= (n - hi) / (hi + 1) * r; hi++; u -= phi; if (u < 0) return hi; }
    if (lo > 0){ plo *= lo / ((n - lo + 1) * r); lo--; u -= plo; if (u < 0) return lo; }
    if (phi < 1e-300 && plo < 1e-300) break;
  }
  return m;
};
const poisson = lam => { if (lam > 50) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss())); const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rand(); } while (p > L); return k - 1; };
const expo = rate => -Math.log(1 - rand()) / rate;
const geom = p => { let k = 1; while (rand() >= p) k++; return k; };  // номер первого успеха (1, 2, …)
// Комбинаторика и точные вероятности
const lgamma = x => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const v of c) s += v / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
const choose = (n, k) => { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r < 9e15 ? Math.round(r) : r; };
const binomPmf = (n, k, p) => k < 0 || k > n ? 0 : Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + (k ? k * Math.log(p) : 0) + (n - k ? (n - k) * Math.log(1 - p) : 0));
const poissonPmf = (lam, k) => Math.exp(-lam + k * Math.log(lam) - lgamma(k + 1));
// Нормальное распределение
const normPdf = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
function normCdf(x){ const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; }
// Квантиль нормального (Acklam), точность ~1e-9
function normInv(p){
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425; let q, r;
  if (p < pl){ q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if (p > 1 - pl){ q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  q = p - 0.5; r = q * q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
const pTwo = z => 2 * (1 - normCdf(Math.abs(z)));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- цвета графиков: один цвет — один смысл ----------
// ctrl — синий (контроль, основная серия), test — оранжевый (тест, вторая серия), truth — зелёный (правда, хорошо),
// trap — красный (плохо: ложная тревога, ошибка, вред), gray — теория. Текст красным — trapInk, оранжевым — testInk.
// pen и accent — фирменные синий и коралл курса (кнопки, акцентная точка «ты здесь»), не для смысловых ролей.
const COL = {ctrl:'#E8644A', ctrlInk:'#B8432B', test:'#23418A', truth:'#0E7E5F', trap:'#C9413A', trapInk:'#A8352F', testInk:'#23418A', ochre:'#C9A43A', viol:'#8F6FC9', gray:'#A3A19A', ink:'#2F2E2B', ink2:'#6B6A65', grid:'#E1E0D9', fillC:'#FCE8E3', fillT:'#E6ECF7', fillG:'#E2F0EB', fillB:'#F8DCD8', fillGray:'#F4F3F0', fillO:'#F8F0D9', pen:'#23418A', accent:'#E8644A'};
// соло-режим /play/ (window.PLAY_SOLO, ставит /play/bridge.js): догадки, выборы и баллы живут только в памяти вкладки —
// игра на /play/ не подставляет старых ответов из курса и не начисляет баллов
const store = window.PLAY_SOLO ? (() => { const m = {}; return {get: k => k in m ? JSON.parse(m[k]) : null, set: (k, v) => { m[k] = JSON.stringify(v); }}; })()
  : {get(k){ try { return JSON.parse(localStorage.getItem('free:' + k)); } catch(e) { return null; } }, set(k, v){ try { localStorage.setItem('free:' + k, JSON.stringify(v)); } catch(e) {} }};

// ---------- холсты ----------
// Холст по ширине контейнера; ratio — высота к ширине (на телефоне выше).
function canvas(cv, ratio = 0.4, mobileRatio = 0.62, fixedH){
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth;
  if (!w) return null;
  const h = fixedH || Math.round(w * (w < 520 ? mobileRatio : ratio));
  cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  c.font = '12px Onest, system-ui, sans-serif'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  return {c, w, h};
}
function axisY(c, L, R, T, ph, w, lo, hi, step, fmtY){
  c.strokeStyle = COL.grid; c.fillStyle = COL.ink2; c.lineWidth = 1;
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step){
    const y = T + (1 - (v - lo) / (hi - lo)) * ph;
    c.beginPath(); c.moveTo(L, y); c.lineTo(w - R, y); c.stroke();
    c.fillText(fmtY(Math.abs(v) < 1e-9 ? 0 : v), 2, y + 4);
  }
}
// Крайние подписи не обрезаются: если подпись по центру вылезает за край холста, она прижимается к краю.
function axisX(c, X, ticks, y, fmtX){
  c.fillStyle = COL.ink2;
  const W = c.canvas.clientWidth || c.canvas.width / (window.devicePixelRatio || 1);
  ticks.forEach(v => {
    const t = fmtX(v), x = X(v), tw = c.measureText(t).width;
    if (x - tw / 2 < 1){ c.textAlign = 'left'; c.fillText(t, Math.max(1, x - tw / 2), y); }
    else if (x + tw / 2 > W - 1){ c.textAlign = 'right'; c.fillText(t, Math.min(W - 1, x + tw / 2), y); }
    else { c.textAlign = 'center'; c.fillText(t, x, y); }
  });
  c.textAlign = 'left';
}
// Гистограмма значений vals на отрезке [lo, hi] с шагом bw. Возвращает счётчики.
function bins(vals, lo, hi, bw){
  const n = Math.round((hi - lo) / bw), b = new Array(n).fill(0);
  vals.forEach(v => { const i = Math.floor((v - lo) / bw); if (i >= 0 && i < n) b[i]++; });
  return b;
}
// Подсказка при наведении на столбик. bars — [{x0, x1, html}] в пикселях холста.
function hoverBars(cv, bars){
  cv._bars = bars;
  if (cv._tip) return;
  const wrap = document.createElement('div'); wrap.className = 'tipwrap'; cv.parentNode.insertBefore(wrap, cv); wrap.appendChild(cv);
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; wrap.appendChild(tip); cv._tip = tip;
  const show = ev => {
    const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    const b = (cv._bars || []).find(b => x >= b.x0 && x <= b.x1);
    if (!b){ tip.hidden = true; return; }
    tip.innerHTML = b.html; tip.hidden = false;
    tip.style.left = Math.max(0, Math.min(x + 12, r.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = Math.max(0, y - tip.offsetHeight - 10) + 'px';
  };
  cv.addEventListener('pointermove', show); cv.addEventListener('pointerdown', show);
  cv.addEventListener('pointerleave', () => { tip.hidden = true; });
}
// То же для гистограммы из bins(): opt.fmt — подпись границ, opt.words — {one, few, many} или [один, два, пять], opt.total.
function hoverBins(cv, X, lo, bw, b, opt){
  const total = opt.total || b.reduce((a, k) => a + k, 0), w = Array.isArray(opt.words) ? {one: opt.words[0], few: opt.words[1], many: opt.words[2], other: opt.words[1]} : opt.words;
  hoverBars(cv, b.map((k, i) => k ? {x0: X(lo + i * bw), x1: X(lo + (i + 1) * bw), html: (LANG === 'ru' ? 'от <b>' : 'from <b>') + opt.fmt(lo + i * bw) + (LANG === 'ru' ? '</b> до <b>' : '</b> to <b>') + opt.fmt(lo + (i + 1) * bw) + '</b><br>' + int(k) + ' ' + plural(k, w) + (total ? S.of + int(total) + ' (' + share(k / total, k / total < 0.1 ? 1 : 0) + ')' : '')} : null).filter(Boolean));
}
function label(c, text, x, y, color = COL.ink, align = 'left'){ c.fillStyle = color; c.textAlign = align; c.fillText(text, x, y); c.textAlign = 'left'; }

// ---------- состояние главы ----------
const COURSE_CHAPTERS = {
  probability: ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09'],
  signal: ['ch01', 'ch04', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09', 'ch10', 'ch11', 'ch12'],
};
const Book = {
  chapter: document.body.dataset.chapter,
  course: document.body.dataset.course || 'signal',
  shown: [],
  onShow(f){ this.shown.push(f); },
  seed(n){ RND = n == null ? Math.random : mulberry32(n); },
  // событие на сервер (баллы считает сервер по RULES в functions/api/_lib.js)
  track(kind, key, value){ if (window.SignalProgress) SignalProgress.track(this.chapter, kind, key, value); },
  // Выбор одного ответа без баллов: <div class="choice" data-key="g1"> с кнопками data-v.
  choice(key){ return store.get(this.chapter + ':' + key); },
  // Прогноз числом: .guess[data-key]. Возвращает сохранённую догадку или null.
  guess(key){ const v = store.get(this.chapter + ':guess:' + key); return typeof v === 'number' ? v : null; },
  // Локальные ★-баллы за квизы (показываются в шапке шага); на сервер уходят событием kind = 'quiz'.
  award(id, pts = 1){
    const k = this.chapter + ':pts', m = store.get(k) || {};
    if (m[id] != null) return false;
    m[id] = pts; store.set(k, m); this.paintScore(true); return true;
  },
  points(ch){ return Object.values(store.get((ch || this.chapter) + ':pts') || {}).reduce((a, b) => a + b, 0); },
  total(){ return (COURSE_CHAPTERS[this.course] || [this.chapter]).reduce((t, ch) => t + this.points(ch), 0); },
  paintScore(bump){
    const head = document.querySelector('.stage-head'); if (!head) return;
    let el = document.getElementById('score');
    if (!el){ el = document.createElement('span'); el.id = 'score'; el.className = 'score'; el.title = S.scoreTitle; head.appendChild(el); }
    const n = this.points(), t = this.total();
    el.textContent = '★ ' + n + ' ' + plural(n, S.pts) + (t !== n ? S.inCourse + t : '');
    if (bump){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  },
};
Book.paintScore(false);

// ---------- общие помощники игр (вынесены из страниц авторов, 21.11.2026) ----------
// Все — в пространстве Book, чтобы не спорить с именами в скриптах страниц. Страницы могут держать свои локальные копии.
Object.assign(Book, {
  // «Красивый» шаг оси: 1, 2, 5 × 10^k, около n делений на диапазон range.
  niceStep(range, n = 5){ const raw = range / n; if (!(raw > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; },
  // Гамма-распределение (Марсалья — Цанг): форма k > 0, масштаб theta; для k < 1 — gamma(k + 1) · U^(1/k).
  gamma(k, theta = 1){
    if (k < 1) return Book.gamma(k + 1, theta) * Math.pow(1 - rand(), 1 / k);
    const d = k - 1 / 3, cc = 1 / Math.sqrt(9 * d);
    for (;;){ let x, v; do { x = gauss(); v = 1 + cc * x; } while (v <= 0); v = v * v * v; const u = rand(); if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v * theta; }
  },
  // Корреляция Пирсона: corr([[x, y], …]) или corr(xs, ys).
  corr(a, b){
    const xs = b ? a : a.map(p => p[0]), ys = b || a.map(p => p[1]), n = xs.length; if (n < 3) return 0;
    const mx = mean(xs), my = mean(ys); let sxy = 0, sx = 0, sy = 0;
    for (let i = 0; i < n; i++){ const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sx += dx * dx; sy += dy * dy; }
    return sx && sy ? sxy / Math.sqrt(sx * sy) : 0;
  },
  // Выборочная асимметрия (моментная): m3 / m2^1.5.
  skew(a){ const m = mean(a); let m2 = 0, m3 = 0; for (const x of a){ const d = x - m; m2 += d * d; m3 += d * d * d; } m2 /= a.length; m3 /= a.length; return m2 ? m3 / Math.pow(m2, 1.5) : 0; },
  // Контур колокола N(m, s) на отрезке [a, b]: X — значение → px, Y — плотность → px.
  // opt.close — замкнуть по оси (для заливки площади: хвоста, окна); opt.unit — высота без деления на s (пик = normPdf(0)).
  bell(c, X, Y, m, s, a, b, opt = {}){
    const N = opt.steps || 120, f = v => opt.unit ? normPdf((v - m) / s) : normPdf((v - m) / s) / s;
    c.beginPath(); if (opt.close) c.moveTo(X(a), Y(0));
    for (let i = 0; i <= N; i++){ const v = a + (b - a) * i / N; (i || opt.close) ? c.lineTo(X(v), Y(f(v))) : c.moveTo(X(v), Y(f(v))); }
    if (opt.close){ c.lineTo(X(b), Y(0)); c.closePath(); }
  },
  // Колокол с закрашенными хвостами за порогами: левый хвост [lo, cutLo], правый [cutHi, hi] (null — без хвоста).
  bellTails(c, X, Y, m, s, lo, hi, cutLo, cutHi, opt = {}){
    c.fillStyle = opt.fill || COL.fillB;
    if (cutHi != null && cutHi < hi){ Book.bell(c, X, Y, m, s, cutHi, hi, {...opt, close: true}); c.fill(); }
    if (cutLo != null && cutLo > lo){ Book.bell(c, X, Y, m, s, lo, cutLo, {...opt, close: true}); c.fill(); }
    c.strokeStyle = opt.stroke || COL.gray; c.lineWidth = opt.lw || 2; Book.bell(c, X, Y, m, s, lo, hi, opt); c.stroke();
  },
  // Приглашение на пустом графике: текст на светлой подложке, чтобы не пересекать линии.
  invite(c, t, x, y){ const tw = c.measureText(t).width; c.fillStyle = COL.fillGray; c.fillRect(x - tw / 2 - 8, y - 14, tw + 16, 22); label(c, t, x, y, COL.ink2, 'center'); },
  // Столбики долей + серые точки теории + подписи k + подсветка столбика hl. Возвращает [{x0, x1, i}] для hoverBars.
  barsPanel(c, x0, x1, y0, y1, w, k0, vals, theory, hl, top, step, fmtX, fmtY, L){
    axisY(c, L, w - x1, y0, y1 - y0, w, 0, top, step, fmtY);
    const n = theory.length, bw = (x1 - x0) / n, bars = [];
    for (let i = 0; i < n; i++){
      const x = x0 + i * bw, v = vals ? vals[i] : 0, hh = (y1 - y0) * Math.min(v, top) / top;
      c.fillStyle = i === hl ? COL.test : COL.ctrl;
      if (v > 0) c.fillRect(x + Math.max(1, bw * 0.12), y1 - hh, bw - 2 * Math.max(1, bw * 0.12), hh);
      c.fillStyle = COL.gray; c.beginPath(); c.arc(x + bw / 2, y1 - (y1 - y0) * Math.min(theory[i], top) / top, Math.min(4, bw / 5), 0, 2 * Math.PI); c.fill();
      if (fmtX) label(c, fmtX(i + k0), x + bw / 2, y1 + 15, COL.ink2, 'center');
      bars.push({x0: x, x1: x + bw, i});
    }
    return bars;
  },
  // Сетка «1000 человечков» на холсте: colorOf(i) → цвет точки i (null — пустая клетка), opt.ring(i) → цвет обводки или null.
  // opt.cols / opt.mobileCols — колонок (50 / 25), opt.ratio / opt.mobileRatio — высота холста к ширине. Возвращает геометрию.
  grid1000(cv, colorOf, opt = {}){
    const total = opt.n || 1000, g = canvas(cv, opt.ratio || 0.4, opt.mobileRatio || 1.6); if (!g) return null; const {c, w, h} = g;
    const cols = w < 520 ? (opt.mobileCols || 25) : (opt.cols || 50), rows = Math.ceil(total / cols), s = Math.min(w / cols, h / rows), r = s * 0.36, ox = (w - cols * s) / 2;
    for (let i = 0; i < total; i++){
      const x = ox + (i % cols) * s + s / 2, y = Math.floor(i / cols) * s + s / 2, col = colorOf(i);
      c.fillStyle = col || COL.grid; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
      const ring = opt.ring && opt.ring(i); if (ring){ c.strokeStyle = ring; c.lineWidth = Math.max(1.5, s * 0.14); c.beginPath(); c.arc(x, y, r + s * 0.1, 0, 2 * Math.PI); c.stroke(); }
    }
    return {c, w, h, cols, rows, s, ox};
  },
});

// ---------- карточки ----------
(function(){
  const cards = [...document.querySelectorAll('.card')];
  const list = document.getElementById('toc-list'), reader = document.getElementById('reader');
  const prev = document.getElementById('prev'), next = document.getElementById('next');
  const key = Book.chapter + ':seen', nextPage = document.body.dataset.next;
  const seen = new Set(store.get(key) || []);
  cards.forEach((c, i) => {
    c.id = 'card-' + (i + 1);
    const li = document.createElement('li');
    li.innerHTML = '<button type="button"><span class="i" data-n="' + (i + 1) + '"></span><span>' + c.dataset.title + '</span></button>';
    li.querySelector('button').addEventListener('click', () => { go(i); if (matchMedia('(max-width: 900px)').matches) setOpen(false); });
    list.appendChild(li);
  });
  let cur = 0;
  function go(i, push = true){
    cur = Math.max(0, Math.min(cards.length - 1, i));
    cards.forEach((c, k) => c.classList.toggle('on', k === cur));
    if (!window.PLAY_SOLO){ seen.add(cur); store.set(key, [...seen]); Book.track('card', cur + 1); }  // соло-режим /play/: без прогресса
    [...list.children].forEach((li, k) => { li.classList.toggle('cur', k === cur); li.classList.toggle('done', seen.has(k) && k !== cur); });
    document.getElementById('prog').style.width = (100 * (cur + 1) / cards.length) + '%';
    document.getElementById('count').textContent = (cur + 1) + S.of + cards.length;
    prev.disabled = cur === 0;
    next.textContent = cur === cards.length - 1 ? (nextPage ? (Book.course === 'signal' ? S.nextChapter : S.nextStep) : S.toToc) : S.next;
    if (push && location.hash !== '#card-' + (cur + 1)) history.replaceState(null, '', '#card-' + (cur + 1));
    window.scrollTo({top: 0, behavior: 'auto'});
    Book.shown.forEach(f => f(cur, cards[cur]));
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  Book.go = go;
  Book.cardIndex = el => cards.indexOf(el.closest('.card'));
  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => cur === cards.length - 1 ? (location.href = nextPage || './') : go(cur + 1));
  document.addEventListener('keydown', e => {
    if (e.target.closest('textarea, input, select')) return;
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  });
  const toggle = document.getElementById('toc-toggle');
  function setOpen(open){
    const mobile = matchMedia('(max-width: 900px)').matches;
    reader.classList.toggle(mobile ? 'open' : 'collapsed', mobile ? open : !open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => {
    const mobile = matchMedia('(max-width: 900px)').matches;
    setOpen(mobile ? !reader.classList.contains('open') : reader.classList.contains('collapsed'));
  });
  if (matchMedia('(max-width: 900px)').matches) toggle.setAttribute('aria-expanded', 'false');
  // первая отрисовка — после того как скрипт страницы подпишется на события
  // соло-режим (/play/bridge.js, ?toy=<slug>): сразу карточка игры, остальные скрыты стилем моста
  const solo = window.PLAY_SOLO ? cards.findIndex(c => (c.dataset.toy || '').split(/\s+/).includes(window.PLAY_SOLO)) : -1;
  setTimeout(() => {
    const m = location.hash.match(/^#card-(\d+)$/);
    go(solo >= 0 ? solo : m ? +m[1] - 1 : 0, false);
  }, 0);
  window.addEventListener('hashchange', () => { const h = location.hash.match(/^#card-(\d+)$/); if (h) go(+h[1] - 1, false); });
})();

// ---------- выбор ответа без баллов: .choice[data-key] ----------
document.querySelectorAll('.choice[data-key]').forEach(box => {
  const k = Book.chapter + ':' + box.dataset.key;
  const paint = () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === store.get(k))));
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    store.set(k, b.dataset.v); paint();
    let note = document.getElementById(box.dataset.key + '-note');
    if (!note){ note = document.createElement('p'); note.id = box.dataset.key + '-note'; box.after(note); }
    note.className = 'fb';
    note.textContent = b.dataset.fb || S.choiceSaved;
    box.dispatchEvent(new CustomEvent('chosen', {detail: b.dataset.v}));
  });
  paint();
});

// ---------- прогноз числом: .guess[data-key] ----------
// <div class="guess" data-key="coin" data-min="0" data-max="100" data-unit="%">
//   <label class="field">Ровно 5 орлов будет примерно в <input type="number" inputmode="decimal"> % серий</label>
//   <button class="btn" type="button">Запомнить</button> <p class="note"></p>
// </div>
// Ввод терпимый: «24,6», «24.6», «24,6 %». Догадка сохраняется, уходит на сервер как predict (если ключ есть в RULES),
// и на элементе срабатывает событие 'guessed' (detail — число). Игра читает её через Book.guess('coin').
document.querySelectorAll('.guess[data-key]').forEach(box => {
  const key = box.dataset.key, inp = box.querySelector('input'), btn = box.querySelector('button'), note = box.querySelector('.note');
  if (note) note.setAttribute('role', 'status');
  const min = +(box.dataset.min ?? 0), max = +(box.dataset.max ?? 100), unit = box.dataset.unit ?? '%';
  const show = v => { box.classList.add('saved'); if (note) note.textContent = tpl(S.guessSaved, {v: numT(v, 2) + (unit ? (unit === '%' ? '' : ' ') + unit : '')}); };
  const old = Book.guess(key); if (old !== null){ inp.value = numT(old, 2); show(old); }
  const save = () => {
    const v = parseFloat(String(inp.value).replace(/\s|%/g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v < min || v > max){ if (note) note.textContent = tpl(S.guessBad, {min: numT(min, 2), max: numT(max, 2)}); return; }
    store.set(Book.chapter + ':guess:' + key, v); Book.track('predict', key, v); show(v);
    box.dispatchEvent(new CustomEvent('guessed', {detail: v}));
  };
  if (btn) btn.addEventListener('click', save);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); save(); } });
});

// ---------- плитки: .tiles button ----------
document.querySelectorAll('.tiles button').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'))));

// ---------- задачи с собеседований: details[data-key] ----------
document.querySelectorAll('details[data-key]').forEach(d => d.addEventListener('toggle', () => { if (d.open) Book.track('interview', d.dataset.key); }));

// ---------- перемешивание вариантов квиза ----------
// Верный ответ определяется по data-v === .quiz[data-right], поэтому порядок кнопок можно менять свободно.
// Порядок свой у каждого браузера, но постоянный между перезагрузками (зерно — соль из localStorage + текст вопроса).
// Не перемешиваются: .quiz[data-order="fixed"] или .choice[data-order="fixed"]; варианты, где у всех кнопок есть число
// и числа идут по порядку. Кнопка [data-fixed] остаётся на месте; так же закрепляются «Все …», «Оба …», «Обе …», «Ни один …», «Сравнить нельзя».
(function(){
  let salt = store.get('salt');
  if (!salt){ salt = Math.random().toString(36).slice(2, 10); store.set('salt', salt); }
  const hash = t => { let h = 2166136261; for (let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const PIN = /^\s*(все\s|всё\s|оба\b|обе\b|ни один|ни одна|ни одно|сравнить нельзя)/i;
  const firstNum = t => { const m = t.replace(/−/g, '-').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
  const ordered = btns => {
    const v = btns.map(b => firstNum(b.textContent));
    if (v.some(x => x === null)) return false;
    return v.every((x, i) => !i || x > v[i - 1]) || v.every((x, i) => !i || x < v[i - 1]);
  };
  Book.shuffleQuiz = function(q){
    const box = q.querySelector('.choice'); if (!box || q.dataset.order === 'fixed' || box.dataset.order === 'fixed') return;
    const btns = [...box.querySelectorAll(':scope > button')]; if (btns.length < 2 || ordered(btns)) return;
    const pinned = btns.map(b => b.hasAttribute('data-fixed') || PIN.test(b.textContent));
    const free = btns.filter((b, i) => !pinned[i]);
    const r = mulberry32(hash(salt + '|' + Book.chapter + '|' + (q.querySelector('.q') || q).textContent.trim()));
    for (let i = free.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    let k = 0; btns.map((b, i) => pinned[i] ? b : free[k++]).forEach(b => box.appendChild(b));
  };
  document.querySelectorAll('.quiz').forEach(Book.shuffleQuiz);
})();

// ---------- квизы: .quiz[data-right] ----------
// Вопросы в карточке открываются по одному. Верный — похвала + .why, неверный — «Не совсем» + data-why + «попробуй ещё раз».
// Балл — за верный ответ с первой попытки: локальная ★ и событие quiz/qN на сервер (N — номер квиза на странице без разминки).
// Квизы внутри .warmup дают отдельный счёт «вспомнил» и не входят в баллы и нумерацию q0, q1…
Book.warm = function(id){
  const k = this.chapter + ':warm', m = store.get(k) || {};
  if (m[id] != null) return false;
  m[id] = 1; store.set(k, m); return true;
};
document.querySelectorAll('.card').forEach(card => {
  const qs = [...card.querySelectorAll('.quiz')]; if (!qs.length) return;
  const out = card.querySelector('.quiz-score');
  qs.forEach((q, qi) => {
    if (qs.length > 1){ const n = document.createElement('p'); n.className = 'qnum'; n.textContent = S.question + (qi + 1) + S.of + qs.length; q.prepend(n); }
    if (qi > 0) q.classList.add('later');
    const box = q.querySelector('.choice'), fb = document.createElement('div'); fb.className = 'qfb'; fb.hidden = true; box.after(fb);
    const why = q.querySelector('.why'), whyHtml = why ? why.innerHTML : '', warm = !!q.closest('.warmup');
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const ok = b.dataset.v === q.dataset.right, done = q.classList.contains('done');
      box.querySelectorAll('button').forEach(x => x.classList.remove('picked')); b.classList.add('picked');
      b.classList.add(ok ? 'right' : 'wrong');
      if (!q.dataset.first) q.dataset.first = ok ? '1' : '0';
      let html;
      if (ok){
        let plus = '';
        if (!done){
          q.classList.add('done');
          if (warm){
            const wi = [...document.querySelectorAll('.warmup .quiz')].indexOf(q);
            if (q.dataset.first === '1' && Book.warm('w' + wi)) plus = ' <span class="plus warm">' + S.warm + '</span>';
          } else {
            const gi = [...document.querySelectorAll('.quiz')].filter(x => !x.closest('.warmup')).indexOf(q);
            if (q.dataset.first === '1'){ if (Book.award('q' + gi)) plus = ' <span class="plus">' + S.plus1 + '</span>'; Book.track('quiz', 'q' + gi, 1); }
          }
        }
        html = '<p class="vd">' + (q.dataset.first === '1' ? S.right[qi % S.right.length] : S.right2[qi % S.right2.length]) + plus + '</p><p>' + whyHtml + '</p>';
        const nq = qs[qi + 1];
        if (!done && nq){
          const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'btn qnext'; nb.textContent = S.nextQ;
          nb.addEventListener('click', () => { nq.classList.remove('later'); nb.remove(); window.dispatchEvent(new Event('resize')); nq.scrollIntoView({behavior: REDUCED ? 'auto' : 'smooth', block: 'start'}); });
          q.appendChild(nb);
        }
        if (!nq && out) out.textContent = (warm ? S.firstWarm : S.firstTry) + qs.filter(x => x.dataset.first === '1').length + S.of + qs.length + '.';
        fb.className = 'qfb ok';
      } else {
        html = '<p class="vd">' + (done ? S.wrongDone : S.wrong) + '</p><p>' + (b.dataset.why || S.wrongDefault) + '</p>' + (done ? '' : '<p class="again">' + S.again + '</p>');
        fb.className = 'qfb no';
      }
      fb.innerHTML = html; fb.hidden = false;
      if (done || ok) fb.insertAdjacentHTML('beforeend', '<p class="hint2">' + S.others + '</p>');
    });
  });
});
