/* Главная: словарь + игрушка «Самая длинная серия орлов». Без внешних библиотек. */
(function () {
'use strict';
const LANG = (document.documentElement.lang || 'ru').slice(0, 2);
const DICT = (window.I18N && window.I18N[LANG]) || {};
const RU = (window.I18N && window.I18N.ru) || {};
const NF = new Intl.NumberFormat(LANG);
const PF = new Intl.NumberFormat(LANG, { style: 'percent', maximumFractionDigits: 0 });
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

// ---------- игрушка ----------
const N = 10, BATCH = 1000;
const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const slider = $('guess');
if (!slider) return;

const counts = new Array(N + 1).fill(0);
let tries = 0;

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
  $('guess-out').textContent = guessText(g);
  slider.setAttribute('aria-valuetext', guessText(g));
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
    if (v > 0) s += `<rect x="${x + 4}" y="${y(v)}" width="${bw - 8}" height="${T + ph - y(v)}" rx="3" class="bar${k >= g ? ' ge' : ''}"/>`;
    if (v > top) s += `<text x="${x + bw / 2}" y="${T + 16}" text-anchor="middle" class="over">${PF.format(v)}</text>`;
    s += `<text x="${x + bw / 2}" y="${T + ph + 16}" text-anchor="middle" class="ax">${NF.format(k)}</text>`;
  });
  const gx = L + g * bw + bw / 2;
  s += `<line x1="${gx}" x2="${gx}" y1="${T - 6}" y2="${T + ph}" class="guess-line"/>`;
  s += `<text x="${Math.min(Math.max(gx, L + 40), W - R - 40)}" y="${T - 12}" text-anchor="middle" class="guess-lab">${t('toy.histGuess')}</text>`;
  s += `<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" class="ax">${t('toy.histX')}</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}" class="base"/>`;
  svg.innerHTML = s;
  $('tries').textContent = t('toy.tries', { n: NF.format(tries) });
  const parts = shares.map((v, k) => NF.format(k) + ': ' + PF.format(v)).join(', ');
  svg.setAttribute('aria-label', t('toy.histDesc') + (tries ? ' ' + parts : ''));
}

function renderFeedback(){
  const box = $('fb-box');
  if (tries < 50){ $('fb').textContent = ''; box.hidden = true; return; }
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
  $('kot').hidden = false; $('outcome').hidden = false; $('reset').hidden = false;
  $('out-text').textContent = t('toy.out', { pct: PF.format(exactAtLeast(3)) });
}

function record(seq){ const k = longestRun(seq); counts[k]++; tries++; return k; }

$('toss').addEventListener('click', () => {
  const seq = flip(); const k = record(seq);
  const anim = !reduce.matches;
  renderCoins(seq, anim); renderHist(); renderFeedback(); reveal(k);
  if (anim){ const c = document.querySelector('.coin-big'); c.classList.remove('spin'); void c.getBoundingClientRect(); c.classList.add('spin'); }
});
$('k1000').addEventListener('click', () => {
  let seq; for (let i = 0; i < BATCH; i++){ seq = flip(); record(seq); }
  renderCoins(seq, false); renderHist(); renderFeedback(); reveal(longestRun(seq));
});
$('reset').addEventListener('click', () => {
  counts.fill(0); tries = 0;
  $('coins').innerHTML = ''; $('last').textContent = t('toy.empty');
  $('kot').hidden = true; $('outcome').hidden = true; $('reset').hidden = true;
  renderHist(); renderFeedback(); $('toss').focus();
});
slider.addEventListener('input', renderGuess);

// подписи под ползунком
const ticks = $('guess-ticks');
for (let k = 0; k <= N; k++){ const s = document.createElement('span'); s.textContent = NF.format(k); ticks.appendChild(s); }
renderGuess();
})();
