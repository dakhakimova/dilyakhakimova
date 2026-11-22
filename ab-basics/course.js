// Общий движок курса «A/B на пальцах».
// Подключается в конце каждой страницы шага до её собственного скрипта.
// Страница шага: <body data-chapter="ab02" data-next="03-noise.html">, карточки — <section class="card" data-title="…">.
// Свои игры шаг рисует в обработчике AB.onShow / window 'resize' (холст без ширины не рисуется).

const MON = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const MLEN = [31,28,31,30,31,30,31,31,30,31,30,31];
const MSTART = MLEN.reduce((a, d, i) => (a.push(i ? a[i - 1] + MLEN[i - 1] : 0), a), []);
const dayLabel = d => { let m = 11; while (MSTART[m] > d) m--; return (d - MSTART[m] + 1) + ' ' + MON[m]; };
// Числа: десятичная точка, тысячи через неразрывный пробел («10 000»), % вплотную («10.4%»).
const grp = s => s.replace(/^-(?=0(\.0+)?(\D|$))/, '').replace(/^(\D*)(\d{4,})/, (_, a, d) => a + d.replace(/\B(?=(\d{3})+$)/g, '\u00a0'));
const num = (x, d = 1) => grp(x.toLocaleString('en-US', {maximumFractionDigits: d, minimumFractionDigits: d, useGrouping: false}));
const pct = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + num(Math.abs(100 * x), d) + '%';
const share = (x, d = 1) => num(100 * x, d) + '%';
const pp = x => num(100 * x, 1) + ' п.п.';
const plural = (n, one, few, many) => { n = Math.abs(n) % 100; const d = n % 10; return n > 10 && n < 20 ? many : d === 1 ? one : d >= 2 && d <= 4 ? few : many; };
const int = x => num(Math.round(x), 0);
const sum = (a, i = 0, j = a.length) => { let s = 0; for (let k = i; k < j; k++) s += a[k]; return s; };
const mean = a => sum(a) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const avg7 = (a, d) => sum(a, Math.max(0, d - 6), d + 1) / (d + 1 - Math.max(0, d - 6));
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
// Биномиальное число успехов: точно для малых n, нормальным приближением для больших.
const binom = (n, p) => { if (n < 60){ let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; } return Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gauss()))); };
// Нормальное распределение
const normPdf = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
function normCdf(x){ const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; }
const pTwo = z => 2 * (1 - normCdf(Math.abs(z)));
const fmtP = p => p < 0.001 ? 'меньше 0.001' : num(p, 3);

// trap = «плохо» (ложная тревога, падение, вред). Раунд 4: краснее, чтобы не путать с оранжевым тестом. testInk — тёмно-оранжевый для подписей теста (контраст 5:1 на белом).
// trapInk — тот же красный для текста на белом и на светлой заливке fillB (контраст ≥ 5:1).
const COL = {ctrl:'#23418A', ctrlInk:'#23418A', test:'#E8644A', truth:'#0E7E5F', trap:'#C9413A', trapInk:'#A8352F', testInk:'#B8432B', ochre:'#C9A43A', viol:'#8F6FC9', gray:'#A3A19A', ink:'#2F2E2B', ink2:'#6B6A65', grid:'#E1E0D9', fillC:'#E6ECF7', fillT:'#FCE8E3', fillG:'#E2F0EB', fillB:'#F8DCD8', fillGray:'#F4F3F0'};
// соло-режим /play/ (window.PLAY_SOLO, ставит /play/bridge.js): догадки, выборы и баллы живут только в памяти вкладки —
// игра на /play/ не подставляет старых ответов из курса и не начисляет баллов
const store = window.PLAY_SOLO ? (() => { const m = {}; return {get: k => k in m ? JSON.parse(m[k]) : null, set: (k, v) => { m[k] = JSON.stringify(v); }}; })()
  : {get(k){ try { return JSON.parse(localStorage.getItem('ab:' + k)); } catch(e) { return null; } }, set(k, v){ try { localStorage.setItem('ab:' + k, JSON.stringify(v)); } catch(e) {} }};

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
// Ось X с подписями: ticks — массив значений.
function axisX(c, X, ticks, y, fmtX){
  c.fillStyle = COL.ink2; c.textAlign = 'center';
  ticks.forEach(v => c.fillText(fmtX(v), X(v), y));
  c.textAlign = 'left';
}
// Гистограмма значений vals на отрезке [lo, hi] с шагом bw. Возвращает счётчики.
function bins(vals, lo, hi, bw){
  const n = Math.round((hi - lo) / bw), b = new Array(n).fill(0);
  vals.forEach(v => { const i = Math.floor((v - lo) / bw); if (i >= 0 && i < n) b[i]++; });
  return b;
}
// Подсказка при наведении на столбик гистограммы. bars — [{x0, x1, html}] в пикселях холста.
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
  // точное число — по касанию или клику (datatip, решение Дили 22.11.2026): касание закрепляет подсказку у столбца,
  // касание мимо столбца или вне графика скрывает; мышью — ещё и при наведении
  let pinned = false;
  cv.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse' && !pinned) show(ev); });
  cv.addEventListener('pointerdown', ev => { show(ev); pinned = !tip.hidden; });
  cv.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse' && !pinned) tip.hidden = true; });
  document.addEventListener('pointerdown', ev => { if (!cv.contains(ev.target) && ev.target !== cv){ pinned = false; tip.hidden = true; } });
}
// То же для обычной гистограммы из bins(): от lo с шагом bw, X — перевод значения в пиксели.
// opt: fmt — подпись границ, words — [один, два, пять] («запуск», «запуска», «запусков»), total — всего наблюдений.
function hoverBins(cv, X, lo, bw, b, opt){
  const total = opt.total || b.reduce((a, k) => a + k, 0);
  hoverBars(cv, b.map((k, i) => k ? {x0: X(lo + i * bw), x1: X(lo + (i + 1) * bw), html: 'от <b>' + opt.fmt(lo + i * bw) + '</b> до <b>' + opt.fmt(lo + (i + 1) * bw) + '</b><br>' + k + ' ' + plural(k, ...opt.words) + (total ? ' из ' + int(total) + ' (' + share(k / total, k / total < 0.1 ? 1 : 0) + ')' : '')} : null).filter(Boolean));
}
function label(c, text, x, y, color = COL.ink, align = 'left'){ c.fillStyle = color; c.textAlign = align; c.fillText(text, x, y); c.textAlign = 'left'; }

const AB = {
  chapter: document.body.dataset.chapter,
  shown: [],
  onShow(f){ this.shown.push(f); },
  // Выбор одного ответа: <div class="choice" data-key="g1"> с кнопками data-v.
  choice(key){ return store.get(this.chapter + ':' + key); },
  // Баллы: за верный ответ с первой попытки. Хранятся по шагам, в шапке — сумма за шаг и за курс.
  award(id, pts = 1){
    const k = this.chapter + ':pts', m = store.get(k) || {};
    if (m[id] != null) return false;
    m[id] = pts; store.set(k, m); this.paintScore(true); this.send(id); return true;
  },
  // На сервер (общий учёт баллов бесплатных курсов, /signal/progress.js): квиз q0, q1, … — kind 'quiz', прочие баллы шага — kind 'task'.
  // Сервер сам считает баллы по правилам RULES в functions/api/_lib.js, поэтому ключи здесь и там должны совпадать.
  track(kind, key, value, ch){ if (window.SignalProgress) SignalProgress.track(ch || this.chapter, kind, key, value); },
  send(id, ch){ /^q\d+$/.test(id) ? this.track('quiz', id, 1, ch) : this.track('task', id, 1, ch); },
  points(ch){ return Object.values(store.get((ch || this.chapter) + ':pts') || {}).reduce((a, b) => a + b, 0); },
  total(){ let t = 0; for (let i = 1; i <= 12; i++) t += this.points('ab' + String(i).padStart(2, '0')); return t; },
  paintScore(bump){
    let el = document.getElementById('score');
    if (!el){ el = document.createElement('span'); el.id = 'score'; el.className = 'score'; el.title = 'Баллы за верные ответы с первой попытки'; document.querySelector('.stage-head').appendChild(el); }
    const n = this.points(), t = this.total();
    el.textContent = '★ ' + n + ' ' + plural(n, 'балл', 'балла', 'баллов') + (t !== n ? ' · в курсе ' + t : '');
    if (bump){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  },
};
AB.paintScore(false);
// Баллы, набранные до подключения учёта на сервере (или без входа), — в очередь отправки; повторы отсекает progress.js и база.
for (let i = 1; i <= 12; i++){ const ch = 'ab' + String(i).padStart(2, '0'); Object.keys(store.get(ch + ':pts') || {}).forEach(id => AB.send(id, ch)); (store.get(ch + ':seen') || []).forEach(i => AB.track('card', i + 1, undefined, ch)); }

// ---------- карточки ----------
(function(){
  const cards = [...document.querySelectorAll('.card')];
  const list = document.getElementById('toc-list'), reader = document.getElementById('reader');
  const prev = document.getElementById('prev'), next = document.getElementById('next');
  const key = AB.chapter + ':seen', nextPage = document.body.dataset.next;
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
    if (!window.PLAY_SOLO) store.set('pos:' + location.pathname, cur);   // Купер: возврат в шаг — на то же место, а не с начала
    cards.forEach((c, k) => c.classList.toggle('on', k === cur));
    if (!window.PLAY_SOLO){ seen.add(cur); store.set(key, [...seen]); AB.track('card', cur + 1); } if (window.CourseDone) CourseDone();  // соло-режим /play/: без прогресса
    [...list.children].forEach((li, k) => { li.classList.toggle('cur', k === cur); li.classList.toggle('done', seen.has(k) && k !== cur); });
    document.getElementById('prog').style.width = (100 * (cur + 1) / cards.length) + '%';
    document.getElementById('count').textContent = (cur + 1) + ' из ' + cards.length;
    prev.disabled = cur === 0;
    // последняя карточка: кнопка называет следующий шаг так же, как плитка «Дальше: N. Название» (гайд, пара 129)
    const nx = cards[cards.length - 1].querySelector('.next-step b');
    next.textContent = cur === cards.length - 1 ? (nextPage ? (nx ? (l => l.length > 28 ? l.replace(/^(Дальше: \d+)\..*$/, '$1') : l)(nx.textContent.trim()) : 'Следующий шаг') : 'К оглавлению курса') : 'Далее';
    if (push && location.hash !== '#card-' + (cur + 1)) history.replaceState(null, '', '#card-' + (cur + 1));
    window.scrollTo({top: 0, behavior: 'auto'});
    AB.shown.forEach(f => f(cur));
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  AB.go = go;
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
    const saved = store.get('pos:' + location.pathname);
    go(solo >= 0 ? solo : m ? +m[1] - 1 : typeof saved === 'number' ? saved : 0, false);
  }, 0);
  window.addEventListener('hashchange', () => { const h = location.hash.match(/^#card-(\d+)$/); if (h) go(+h[1] - 1, false); });
})();

// ---------- выбор ответа: .choice[data-key] ----------
document.querySelectorAll('.choice[data-key]').forEach(box => {
  const k = AB.chapter + ':' + box.dataset.key;
  const paint = () => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === store.get(k))));
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    store.set(k, b.dataset.v); paint();
    let note = document.getElementById(box.dataset.key + '-note');
    if (!note){ note = document.createElement('p'); note.id = box.dataset.key + '-note'; box.after(note); }
    note.className = 'fb';
    note.textContent = b.dataset.fb || 'Ответ записан. Сейчас проверим.';
    box.dispatchEvent(new CustomEvent('chosen', {detail: b.dataset.v}));
  });
  paint();
});

// ---------- плитки: .tiles button ----------
document.querySelectorAll('.tiles button').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'))));

// ---------- перемешивание вариантов квиза ----------
// Верный ответ определяется по data-v === .quiz[data-right], поэтому порядок кнопок можно менять свободно.
// Порядок свой у каждого браузера, но постоянный между перезагрузками (зерно — соль из localStorage + текст вопроса).
// Не перемешиваются: .quiz[data-order="fixed"] или .choice[data-order="fixed"]; варианты, где у всех кнопок есть число
// и числа идут по порядку (+3 / +8 / +16 %, 4 / 8 / 16 недель). Кнопка [data-fixed] остаётся на своём месте;
// так же сами закрепляются варианты «Все …», «Оба …», «Обе …», «Ни один …», «Сравнить нельзя».
(function(){
  let salt = store.get('salt');
  if (!salt){ salt = Math.random().toString(36).slice(2, 10); store.set('salt', salt); }
  const hash = t => { let h = 2166136261; for (let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const PIN = /^\s*(все\s|всё\s|оба\b|обе\b|ни один|ни одна|ни одно|сравнить нельзя)/i;
  const firstNum = t => { const m = t.replace(/\u2212/g, '-').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
  const ordered = btns => {
    const v = btns.map(b => firstNum(b.textContent));
    if (v.some(x => x === null)) return false;
    const up = v.every((x, i) => !i || x > v[i - 1]), down = v.every((x, i) => !i || x < v[i - 1]);
    return up || down;
  };
  AB.shuffleQuiz = function(q){
    const box = q.querySelector('.choice'); if (!box || q.dataset.order === 'fixed' || box.dataset.order === 'fixed') return;
    const btns = [...box.querySelectorAll(':scope > button')]; if (btns.length < 2 || ordered(btns)) return;
    const pinned = btns.map(b => b.hasAttribute('data-fixed') || PIN.test(b.textContent));
    const free = btns.filter((b, i) => !pinned[i]);
    const r = rng(hash(salt + '|' + AB.chapter + '|' + (q.querySelector('.q') || q).textContent.trim()));
    for (let i = free.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    let k = 0; btns.map((b, i) => pinned[i] ? b : free[k++]).forEach(b => box.appendChild(b));
  };
  document.querySelectorAll('.quiz').forEach(AB.shuffleQuiz);
})();

// ---------- квизы: .quiz[data-right] ----------
// Вопросы в карточке открываются по одному. На каждый выбор — вердикт и объяснение:
// верный — «Отлично!» + .why, неверный — «Не совсем» + data-why кнопки + «попробуй ещё раз».
// После верного ответа остальные варианты можно открыть и прочитать. Балл — за верный ответ с первой попытки.
// Квизы внутри .warmup («Разминка») дают отдельный счёт «вспомнил» и не входят в ★-баллы и нумерацию q0, q1…
const RIGHT = ['Отлично!', 'Всё правильно!', 'Точно!', 'Верно!', 'Так и есть!'];
const RIGHT2 = ['Разобрался!', 'Теперь верно.', 'Вот теперь точно.'];
AB.warm = function(id){
  const k = this.chapter + ':warm', m = store.get(k) || {};
  if (m[id] != null) return false;
  m[id] = 1; store.set(k, m); return true;
};
document.querySelectorAll('.card').forEach(card => {
  const qs = [...card.querySelectorAll('.quiz')]; if (!qs.length) return;
  const out = card.querySelector('.quiz-score');
  qs.forEach((q, qi) => {
    if (qs.length > 1){ const n = document.createElement('p'); n.className = 'qnum'; n.textContent = 'Вопрос ' + (qi + 1) + ' из ' + qs.length; q.prepend(n); }
    if (qi > 0) q.classList.add('later');
    const box = q.querySelector('.choice'), fb = document.createElement('div'); fb.className = 'qfb'; fb.hidden = true; box.after(fb);
    const why = q.querySelector('.why'), whyHtml = why ? why.innerHTML : '', warm = !!q.closest('.warmup');
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const ok = b.dataset.v === q.dataset.right, done = q.classList.contains('done');
      // «курс пройден» (решение Дили, 22.11.2026): считается любой ответ, верный или нет
      { const allQ = [...document.querySelectorAll('.quiz')], ak = AB.chapter + ':ans', ans = new Set(store.get(ak) || []); ans.add(allQ.indexOf(q)); store.set(ak, [...ans]); if (window.CourseDone) CourseDone(); }
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
            if (q.dataset.first === '1' && AB.warm('w' + wi)) plus = ' <span class="plus warm">вспомнил</span>';
          } else {
            const gi = [...document.querySelectorAll('.quiz')].filter(x => !x.closest('.warmup')).indexOf(q);
            if (q.dataset.first === '1' && AB.award('q' + gi)) plus = ' <span class="plus">+1 балл</span>';
          }
        }
        html = '<p class="vd">' + (q.dataset.first === '1' ? RIGHT[qi % RIGHT.length] : RIGHT2[qi % RIGHT2.length]) + plus + '</p><p>' + whyHtml + '</p>';
        const next = qs[qi + 1];
        if (!done && next){
          const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'btn qnext'; nb.textContent = 'Следующий вопрос';
          nb.addEventListener('click', () => { next.classList.remove('later'); nb.remove(); window.dispatchEvent(new Event('resize')); next.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); });
          q.appendChild(nb);
        }
        if (!next && out) out.textContent = (warm ? 'Вспомнил с первого раза: ' : 'С первого раза верно: ') + qs.filter(x => x.dataset.first === '1').length + ' из ' + qs.length + '.';
        fb.className = 'qfb ok';
      } else {
        html = '<p class="vd">' + (done ? 'Этот вариант неверный.' : 'Не совсем.') + '</p><p>' + (b.dataset.why || 'Этот вариант не подходит.') + '</p>' + (done ? '' : '<p class="again">Попробуй ещё раз.</p>');
        fb.className = 'qfb no';
      }
      fb.innerHTML = html; fb.hidden = false;
      if (done || ok) fb.insertAdjacentHTML('beforeend', '<p class="hint2">Можно открыть и другие варианты — у каждого своё объяснение.</p>');
    });
  });
});

// Шаг пройден (решение Дили, 22.11.2026): открыта последняя карточка и на каждый вопрос (квиз, прогноз числом, выбор) дан
// хоть какой-то ответ; игры не обязательны. Тогда один раз уходит событие done — сервер считает курс пройденным,
// когда done есть во всех шагах курса (functions/api/_lib.js, COURSES). Скидка 20% — за любой пройденный бесплатный курс.
window.CourseDone = function(){
  if (window.PLAY_SOLO) return;
  const ch = document.body.dataset.chapter; if (!ch || store.get(ch + ':done')) return;
  const cards = document.querySelectorAll('.card'), seen = store.get(ch + ':seen') || [];
  if (!cards.length || !seen.includes(cards.length - 1)) return;
  const qn = document.querySelectorAll('.quiz').length, ans = store.get(ch + ':ans') || [];
  if (ans.length < qn) return;
  for (const g of document.querySelectorAll('.guess[data-key]')) if (store.get(ch + ':guess:' + g.dataset.key) == null) return;
  for (const c of document.querySelectorAll('.choice[data-key]')) if (!c.closest('.quiz') && store.get(ch + ':' + c.dataset.key) == null) return;
  store.set(ch + ':done', 1); AB.track('done', '1');
};
