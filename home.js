/* Главная: словарь + игра «Самая длинная серия орлов». Без внешних библиотек. */
(function () {
'use strict';
const LANG = (document.documentElement.lang || 'ru').slice(0, 2);
const DICT = (window.I18N && window.I18N[LANG]) || {};
const RU = (window.I18N && window.I18N.ru) || {};
// Числа: для ru — десятичная точка, тысячи через неразрывный пробел, % вплотную («0.05», «10 000», «90%»).
const numFormat = (lang, o = {}, from = 4) => { if (lang !== 'ru') return new Intl.NumberFormat(lang, o);
  const f = new Intl.NumberFormat('en-US', Object.assign({}, o, {useGrouping: false}));
  return {format: x => f.format(x).replace(/^-(?=0(\.0+)?(\D|$))/, '').replace(/^(\D*)(\d+)/, (_, a, d) => a + (d.length >= from ? d.replace(/\B(?=(\d{3})+$)/g, '\u00a0') : d))}; };
const NF = numFormat(LANG);
const PF = numFormat(LANG, { style: 'percent', maximumFractionDigits: 0 });
const PR = new Intl.PluralRules(LANG);

function raw(key){ return key in DICT ? DICT[key] : (key in RU ? RU[key] : key); }
function fmt(str, vars){
  return String(str).replace(/\{(num|pct):([\d.]+)\}/g, (_, k, v) => k === 'num' ? NF.format(+v) : PF.format(+v))
    .replace(/\{(\w+)\}/g, (m, k) => vars && k in vars ? vars[k] : m);
}
function t(key, vars){ const s = fmt(raw(key), vars); return window.I18N && I18N.typo ? I18N.typo(LANG, s) : s; }
function plural(key, n){ const f = raw(key); return typeof f === 'string' ? f : (f[PR.select(n)] || f.other); }

// Статические строки: data-i18n="ключ", data-i18n-attr="атрибут:ключ;атрибут:ключ".
// Русский текст уже стоит в HTML (его вписывает tools/bake-i18n.js), поэтому для ru ничего не подменяем;
// на другом языке (если страница не собрана заранее) подставляем строки словаря.
function apply(root){
  root.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (el.innerHTML !== v) el.innerHTML = v; });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(pair => {
    const [attr, key] = pair.split(':'); el.setAttribute(attr.trim(), t(key.trim()));
  }));
}
if (LANG !== 'ru') apply(document);
window.HomeI18n = { t, plural, apply, LANG };

// ---------- игра ----------
const N = 10, BATCH = 1000;
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const slider = $('guess');
if (!slider) return;

const counts = new Array(N + 1).fill(0);
let tries = 0, guessSet = false, tip = -1;
const past = [];   // 5 последних попыток — серые точки у оси (сравнение без памяти)

function longestRun(seq){ let best = 0, cur = 0; for (const h of seq){ cur = h ? cur + 1 : 0; if (cur > best) best = cur; } return best; }
function flip(){ const s = []; for (let i = 0; i < N; i++) s.push(Math.random() < 0.5); return s; }

// точная доля последовательностей из N бросков с серией орлов ≥ k (динамика по длине текущей серии)
function exactAtLeast(k){
  if (k <= 0) return 1;
  let dp = new Array(k).fill(0); dp[0] = 1;            // dp[j] — число последовательностей без серии ≥ k, оканчивающихся j орлами
  for (let i = 0; i < N; i++){
    const nx = new Array(k).fill(0);
    for (let j = 0; j < k; j++){ nx[0] += dp[j]; if (j + 1 < k) nx[j + 1] += dp[j]; }
    dp = nx;
  }
  return 1 - dp.reduce((a, b) => a + b, 0) / Math.pow(2, N);
}

function guessText(g){ return t('toy.guessOut', { n: NF.format(g), word: plural('toy.heads', g) }); }

function renderGuess(){
  const g = +slider.value;
  $('guess-out').textContent = guessSet ? guessText(g) : t('toy.guessNone');
  slider.setAttribute('aria-valuetext', guessSet ? guessText(g) : t('toy.guessNone'));
  renderHist(); renderFeedback();
}

function renderCoins(seq, animate){
  const box = $('coins'); box.innerHTML = '';
  const best = longestRun(seq);
  // где лежит самая длинная серия (первая из самых длинных)
  let end = -1, cur = 0;
  seq.forEach((h, i) => { cur = h ? cur + 1 : 0; if (cur === best && end < 0 && best > 0) end = i; });
  seq.forEach((h, i) => {
    const c = document.createElement('span');
    c.className = 'c ' + (h ? 'h' : 't') + (best > 0 && i > end - best && i <= end ? ' run' : '');
    c.textContent = t(h ? 'toy.H' : 'toy.T');
    c.title = t(h ? 'toy.Hfull' : 'toy.Tfull');
    if (animate){ c.style.animationDelay = (i * 45) + 'ms'; c.classList.add('in'); }
    box.appendChild(c);
  });
  // число попытки говорит Котейка в пузыре (aria-live), строка «ещё не брошены» нужна только до первого броска
  $('last').textContent = '';
}

function renderHist(){
  const svg = $('hist'), W = 560, H = 266, L = 60, R = 12, T = 30, B = 44;
  const pw = W - L - R, ph = H - T - B, bw = pw / (N + 1);
  const g = +slider.value;
  const shares = counts.map(c => tries ? c / tries : 0);
  // Ось не прыгает: верх шкалы фиксирован (50 %). Двигаются только столбики; столбик выше шкалы
  // упирается в верх и подписывается своим значением (так бывает только в первых попытках).
  const top = 0.5;
  const y = v => T + ph * (1 - Math.min(v, top) / top);
  let s = '';
  for (let v = 0; v <= top + 1e-9; v += 0.1){
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
    s += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="ax">${PF.format(v)}</text>`;
  }
  shares.forEach((v, k) => {
    const x = L + k * bw;
    if (v > 0) s += `<rect x="${x + 4}" y="${y(v)}" width="${bw - 8}" height="${T + ph - y(v)}" rx="3" class="bar${guessSet && k >= g ? ' ge' : ''}" data-k="${k}"/>`;
    // точное число — по касанию столбца (datatip), касание мимо скрывает
    if (k === tip && counts[k]) s += `<text x="${x + bw / 2}" y="${Math.max(T + 14, y(v) - 8)}" text-anchor="middle" class="tip">${t('toy.tip', {n: NF.format(counts[k]), all: NF.format(tries)})}</text>`;
    if (v > top) s += `<text x="${x + bw / 2}" y="${T + 16}" text-anchor="middle" class="over">${PF.format(v)}</text>`;
    s += `<text x="${x + bw / 2}" y="${T + ph + 16}" text-anchor="middle" class="ax">${NF.format(k)}</text>`;
  });
  past.forEach((k, i) => { s += `<circle cx="${L + k * bw + bw / 2 + (i - 2) * 5}" cy="${T + ph + 5}" r="2.6" class="past"/>`; });
  const gx = L + g * bw + bw / 2;
  if (guessSet) s += `<line x1="${gx}" x2="${gx}" y1="${T - 6}" y2="${T + ph}" class="guess-line"/>`;
  if (guessSet) s += `<text x="${Math.min(Math.max(gx, L + 40), W - R - 40)}" y="${T - 12}" text-anchor="middle" class="guess-lab">${t('toy.histGuess')}</text>`;
  s += `<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" class="ax">${t('toy.histX')}</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}" class="base"/>`;
  svg.innerHTML = s;
  $('tries').textContent = t('toy.tries', { n: NF.format(tries) });
  const parts = shares.map((v, k) => NF.format(k) + ': ' + PF.format(v)).join(', ');
  svg.setAttribute('aria-label', t('toy.histDesc') + (tries ? ' ' + parts : ''));
}

function renderFeedback(){
  const box = $('fb-box');
  if (tries < 50 || !guessSet){ $('fb').textContent = ''; box.hidden = true; return; }
  const g = +slider.value;
  let ge = 0; for (let k = g; k <= N; k++) ge += counts[k];
  const share = ge / tries;
  const key = share > 0.6 ? 'toy.fbLow' : share < 0.2 ? 'toy.fbHigh' : 'toy.fbMid';
  $('fb').textContent = t(key, { g: guessText(g), pct: PF.format(share) });
  // вердикт: тёмный текст на светлой плашке своего цвета (зелёная — попал, жёлтая — промахнулся)
  box.classList.toggle('good', key === 'toy.fbMid'); box.classList.toggle('off', key !== 'toy.fbMid');
  box.hidden = false;
}

function reveal(k){
  // Котейка говорит число из этой попытки — рядом с монетками и гистограммой
  $('kot-say').innerHTML = t('toy.kotN', { k: NF.format(k), pct: PF.format(exactAtLeast(3)) });
  $('kot').hidden = false; $('outcome').hidden = false;
  // одна кнопка: после первого броска главная становится контурной «Ещё раз», появляется ×1000 (решение Дили, 22.11.2026)
  const tb = $('toss'); if (!tb.classList.contains('ghost')){ tb.classList.add('ghost'); tb.textContent = t('toy.again'); $('k1000').hidden = false; }
  $('out-text').textContent = t('toy.out', { pct: PF.format(exactAtLeast(3)) });
}

function record(seq){ const k = longestRun(seq); counts[k]++; tries++; return k; }
function remember(k){ past.push(k); if (past.length > 5) past.shift(); }

$('toss').addEventListener('click', () => {
  const seq = flip(); const k = record(seq); remember(k);
  const anim = !reduce.matches;
  renderCoins(seq, anim); renderHist(); renderFeedback(); reveal(k);
  if (anim){ const c = document.querySelector('.coin-big'); c.classList.remove('spin'); void c.getBoundingClientRect(); c.classList.add('spin'); }
});
$('k1000').addEventListener('click', () => {
  let seq; for (let i = 0; i < BATCH; i++){ seq = flip(); record(seq); }
  remember(longestRun(seq));
  renderCoins(seq, false); renderHist(); renderFeedback(); reveal(longestRun(seq));
});
$('reset').addEventListener('click', () => {
  counts.fill(0); tries = 0;
  $('coins').innerHTML = ''; $('last').textContent = t('toy.empty');
  $('kot').hidden = true; $('outcome').hidden = true; $('reset').hidden = true;
  renderHist(); renderFeedback(); $('toss').focus();
});
const setGuess = () => { if (!guessSet){ guessSet = true; slider.classList.remove('unset'); } };
['pointerdown', 'keydown'].forEach(ev => slider.addEventListener(ev, setGuess));
slider.addEventListener('input', () => { setGuess(); renderGuess(); });
$('hist').addEventListener('click', e => { const r = e.target.closest('.bar'); tip = r ? +r.dataset.k : -1; renderHist(); e.stopPropagation(); });
document.addEventListener('click', e => { if (tip >= 0 && !e.target.closest('#hist')){ tip = -1; renderHist(); } });
// горячие клавиши: Пробел — бросить, Shift+Пробел — ×1000 (не перехватываем в полях и на кнопках)
document.addEventListener('keydown', e => {
  if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input, textarea, select, button, a, [contenteditable]'))) return;
  const r = $('toy').getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
  const b = e.shiftKey ? $('k1000') : $('toss'); if (b.hidden) return;
  e.preventDefault(); b.click();
});

// подписи под ползунком
const ticks = $('guess-ticks');
for (let k = 0; k <= N; k++){ const s = document.createElement('span'); s.textContent = NF.format(k); ticks.appendChild(s); }
renderGuess();
})();

// ---------- главная: анимация двух колоколов без управления (v4, 22.11.2026) ----------
// n плавно растёт 200 → 1 800 (~6 с), пауза 1.5 с на конечном кадре, кроссфейд к началу.
// Высота колоколов постоянная (нормировка по пику), ширина падает в 3 раза.
// Двусторонний z-тест, α = 0.05: критическое значение = A ± 1.96σ(n) и едет к центру вместе с сужением A.
// Синие хвосты A за критическими значениями — всегда 5% (ошибка I рода); коралловая часть B до критического значения — β, тает.
// Эффект D = 1.8σ(200): β ≈ 56% при n = 200, ≈ 12% при n = 600, < 1% при n = 1 800.
// prefers-reduced-motion — средний кадр.
(function(){
  const svg = document.getElementById('bells'); if (!svg) return;
  const W = 640, H = 280, L = 20, R = 20, T = 48, B = 58;
  const D = 1.8, Z = 1.959964, lo = -2.6, hi = D + 2.6, N0 = 200, N1 = 1800;   // единицы — σ при n = 200
  const X = v => L + (v - lo) / (hi - lo) * (W - L - R), base = H - B;
  const pdf = (v, m, s) => Math.exp(-0.5 * ((v - m) / s) ** 2);
  const Y = (v, m, s) => base - pdf(v, m, s) * (base - T);
  const path = (m, s, from, to, close) => {
    let d = ''; const k = 180;
    for (let i = 0; i <= k; i++){ const v = from + (to - from) * i / k; d += (i ? 'L' : 'M') + X(v).toFixed(1) + ' ' + Y(v, m, s).toFixed(1); }
    return close ? d + 'L' + X(to).toFixed(1) + ' ' + base + 'L' + X(from).toFixed(1) + ' ' + base + 'Z' : d;
  };
  const normCdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  const fmtN = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // β двустороннего z-теста: 1 − мощность = 1 − Φ(D/σ − z) − Φ(−D/σ − z)
  const betaAt = s => 1 - normCdf(D / s - Z) - normCdf(-D / s - Z);
  const pct = b => b < 0.005 ? '< 1%' : '= ' + Math.round(b * 100) + '%';
  const mob = () => innerWidth <= 600;
  function scene(n){
    const s = Math.sqrt(N0 / n), c = Z * s, beta = betaAt(s);
    const fs = mob() ? 20 : 14, wA = 21 * fs * 0.56;   // оценка ширины подписи α, чтобы не уйти за край
    let h = '';
    h += `<path d="${path(0, s, c, hi, true)}" fill="rgba(35,65,138,.35)"/>`;
    h += `<path d="${path(0, s, lo, -c, true)}" fill="rgba(35,65,138,.35)"/>`;
    h += `<path d="${path(D, s, lo, c, true)}" fill="rgba(232,100,74,.35)"/>`;
    h += `<line x1="${L}" x2="${W - R}" y1="${base}" y2="${base}" stroke="rgba(36,34,31,.35)"/>`;
    h += `<path d="${path(0, s, lo, hi)}" fill="none" stroke="#23418A" stroke-width="2.5"/>`;
    h += `<path d="${path(D, s, lo, hi)}" fill="none" stroke="#E8644A" stroke-width="2.5"/>`;
    if (X(-c) > L + 2) h += `<line x1="${X(-c)}" x2="${X(-c)}" y1="${Y(-c, 0, s) - 14}" y2="${base}" stroke="rgba(36,34,31,.45)" stroke-width="1" stroke-dasharray="3 4"/>`;
    h += `<line x1="${X(c)}" x2="${X(c)}" y1="${T - 20}" y2="${base}" stroke="#24221F" stroke-width="1.25" stroke-dasharray="5 4"/>`;
    h += `<text class="thr" x="${X(c)}" y="${T - 26}" text-anchor="middle">критическое значение</text>`;
    // A и B — на внешних склонах (не спорят с критическим значением у вершины B)
    h += `<text class="lab" x="${X(-1.1 * s) - 10}" y="${Y(-1.1 * s, 0, s)}" text-anchor="end" fill="#23418A">A</text>`;
    h += `<text class="lab" x="${X(D + 1.1 * s) + 10}" y="${Y(D + 1.1 * s, D, s)}" fill="#B8432B">B</text>`;
    // строка 1 — β (у кораллового куска слева от критического значения), строка 2 — α (у синего хвоста справа)
    const mx = X(c - 0.45 * s), my = base - 0.35 * (base - Y(c - 0.45 * s, D, s)), mo = Math.min(1, beta / 0.02);
    const fx = X(c + 0.5 * s), fy = base - 0.35 * (base - Y(c + 0.5 * s, 0, s));
    const ax = Math.min(fx - 4, W - R - wA);
    h += `<g opacity="${mo.toFixed(3)}"><line x1="${mx}" y1="${my}" x2="${mx}" y2="${base + 6}" stroke="#B8432B" stroke-width="1"/><circle cx="${mx}" cy="${my}" r="2.5" fill="#B8432B"/></g>`;
    h += `<text class="zone num" x="${mx + 4}" y="${base + 22}" text-anchor="end" fill="#B8432B">ошибка II рода, β ${pct(beta)}</text>`;
    h += `<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${base + 32}" stroke="#23418A" stroke-width="1"/><circle cx="${fx}" cy="${fy}" r="2.5" fill="#23418A"/>`;
    h += `<text class="zone" x="${ax}" y="${base + 48}" fill="#23418A">ошибка I рода, α = 5%</text>`;
    return h;
  }
  // расписание (мс): пауза на старте → рост → пауза на конце → кроссфейд к началу
  const T0 = 400, GROW = 6000, HOLD = 1500, FADE = 800, CYCLE = T0 + GROW + HOLD + FADE;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const nAt = k => N0 * Math.pow(N1 / N0, k);   // по логарифму n — ширина сужается равномерно
  // бегущий счётчик — HTML над картинкой (крупный на любой ширине), табличные цифры
  const cnt = document.getElementById('bells-n'), cntBox = cnt && cnt.parentNode;
  function count(n, op){ if (!cnt) return; const v = fmtN(Math.round(n / 10) * 10); if (cnt.textContent !== v) cnt.textContent = v; cntBox.style.opacity = op; }
  function draw(t){
    t = ((t % CYCLE) + CYCLE) % CYCLE;
    if (t < T0){ svg.innerHTML = scene(N0); return count(N0, 1); }
    if (t < T0 + GROW){ const n = nAt(ease((t - T0) / GROW)); svg.innerHTML = scene(n); return count(n, 1); }
    if (t < T0 + GROW + HOLD){ svg.innerHTML = scene(N1); return count(N1, 1); }
    const c = ease((t - T0 - GROW - HOLD) / FADE);   // кроссфейд конец → начало
    svg.innerHTML = `<g opacity="${(1 - c).toFixed(3)}">${scene(N1)}</g><g opacity="${c.toFixed(3)}">${scene(N0)}</g>`;
    count(c < .5 ? N1 : N0, Math.abs(1 - 2 * c).toFixed(3));
  }
  svg._bellsAt = draw;   // для скриншотов и проверки
  if (matchMedia('(prefers-reduced-motion: reduce)').matches){ const n = nAt(0.5); svg.innerHTML = scene(n); count(n, 1); return; }
  let t0 = 0, vis = true;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(svg);
  function tick(ts){
    if (svg._stop) return;
    if (!t0) t0 = ts;
    if (vis) draw(ts - t0);
    requestAnimationFrame(tick);
  }
  draw(0); requestAnimationFrame(tick);
})();

// ---------- главная: змейка-маршрут — пунктир через центры станций; после последней готовой — бледнее; ?route=before ----------
(function(){
  const sec = document.getElementById('route'); if (!sec) return;
  if ((new URLSearchParams(location.search).get('route') || '') === 'before'){ const c = document.getElementById('courses'); if (c) c.before(sec); }
  const svg = sec.querySelector('.snake-line'), wrap = sec.querySelector('.snake-wrap');
  function draw(){
    const r0 = wrap.getBoundingClientRect(), sts = [...sec.querySelectorAll('.st')];
    const pts = sts.map(li => { const r = li.querySelector('.st-pic').getBoundingClientRect(); return [r.left - r0.left + r.width / 2, r.top - r0.top + r.height / 2]; });
    const lastReady = sts.reduce((k, li, i) => li.classList.contains('later') ? k : i, 0);
    let h = '';
    for (let i = 0; i < pts.length - 1; i++){
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], pale = i >= lastReady;
      // поворот змейки (3 → 4): дуга справа
      const d = Math.abs(y2 - y1) > 20 && Math.abs(x2 - x1) < 20 && innerWidth > 820
        ? `M${x1} ${y1} C${x1 + 90} ${y1}, ${x2 + 90} ${y2}, ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
      h += `<path d="${d}" fill="none" stroke="${pale ? 'rgba(36,34,31,.2)' : 'rgba(35,65,138,.55)'}" stroke-width="2" stroke-dasharray="6 6"/>`;
    }
    svg.innerHTML = h;
  }
  addEventListener('resize', draw); addEventListener('load', draw); draw();
})();
