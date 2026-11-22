/* Схемы мини-лабораторий /terms/<slug>/ — статичный SVG, собирается в HTML при сборке (tools/build-terms.js).
   viz[slug](L) — главная схема (подписи L = TERMS_TEXT.ru[slug].vz); lim[slug](L) — кадр блока «Когда метод врёт» (L = .lz).
   Случайные картинки (лесенка вилок, бегущая доля, точки курьеров) — с фиксированным зерном, чтобы сборка не меняла их.
   Числа симуляций в кадрах lim (покрытие вилок, ложные тревоги t-теста и хи-квадрата) посчитаны в Python
   (numpy, scipy; логнормальное распределение σ = 1,5; 4000–200 000 повторов) и вписаны сюда константами.
   Ширина viewBox 460: на телефоне (≈330 px) подписи 17 → ≈12 px. Цвета — как в игрушках: синий A/данные, оранжевый B/прогноз, красный — «плохо». */
const W = 460;
const C = {a: '#3D7DC4', b: '#E59157', red: '#C9413A', pen: '#23418A', ink: '#24221F', t2: '#4A463F', t3: '#5E5A53', line: '#CFC8BB', soft: '#E3DED4', mint: '#0E7E5F', paper: '#FBFAF6'};
const esc = s => String(s).replace(/&(?!nbsp;|#)/g, '&amp;').replace(/</g, '&lt;');
const f1 = x => Math.round(x * 10) / 10;
function svg(h, body, title){
  return `<svg class="viz-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(title).replace(/"/g, '&quot;')}" xmlns="http://www.w3.org/2000/svg"><title>${esc(title)}</title>${body}</svg>`;
}
// подпись: подложка цвета фона под текстом, чтобы линии под ней не читались как зачёркивание
function tx(x, y, s, o = {}){
  const a = o.a || 'start', size = o.size || 17, fill = o.fill || C.t2, w = o.w || 400;
  const bg = o.bg ? `paint-order="stroke" stroke="${o.bg === true ? '#fff' : o.bg}" stroke-width="5" stroke-linejoin="round"` : '';
  return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${a}" font-size="${size}" font-weight="${w}" fill="${fill}" ${bg}>${esc(s)}</text>`;
}
const ln = (x1, y1, x2, y2, st = C.line, w = 1.5, dash = '') => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${st}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const rect = (x, y, w, h, fill, o = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${fill}" ${o}/>`;
const path = (pts, st, w = 2.5, fill = 'none', o = '') => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('')}${fill !== 'none' ? 'Z' : ''}" fill="${fill}" stroke="${st}" stroke-width="${w}" stroke-linejoin="round" ${o}/>`;
const circ = (x, y, r, fill, o = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${fill}" ${o}/>`;
const arrow = (x1, y1, x2, y2, st = C.t3) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 8;
  return ln(x1, y1, x2, y2, st, 1.5) + path([[x2, y2], [x2 - h * Math.cos(a - .45), y2 - h * Math.sin(a - .45)], [x2 - h * Math.cos(a + .45), y2 - h * Math.sin(a + .45)]], st, 1, st); };
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const gauss = r => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
const nf = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function lgamma(z){ const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z); z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }

const viz = {};
const lim = {};

viz['conditional-probability'] = L => {
  const x0 = 20, y0 = 50, w = 420, h = 190, kw = w * .25;
  const ice1 = h * .6, ice2 = h * (50 / 750);
  return svg(320, [
    tx(x0, 36, L.kids, {fill: C.pen, w: 500}), tx(x0 + kw + 12, 36, L.nokids),
    rect(x0, y0, w, h, '#F3F0EA', `stroke="${C.line}"`),
    rect(x0, y0 + h - ice1, kw, ice1, C.b, 'opacity=".85"'), rect(x0 + kw, y0 + h - ice2, w - kw, ice2, C.b, 'opacity=".85"'),
    rect(x0, y0, kw, h, 'none', `stroke="${C.pen}" stroke-width="3"`),
    ln(x0 + kw / 2, y0 + h + 4, x0 + kw / 2, y0 + h + 22, C.t3), tx(x0, y0 + h + 42, L.a, {fill: C.ink, w: 500}),
    ln(x0 + kw + 150, y0 + h + 4, x0 + kw + 150, y0 + h + 22, C.t3), tx(x0 + kw + 70, y0 + h + 42, L.b),
    rect(x0, 302, 14, 14, C.b, 'opacity=".85"'), tx(x0 + 22, 314, L.ice, {size: 15}),
  ].join(''), L.kids + '; ' + L.a);
};

viz['normal-distribution'] = L => {
  const X = z => 230 + z * 62, base = 200, Y = d => base - d * 420;
  const curve = (a, b) => { const p = []; for (let z = a; z <= b + 1e-9; z += .05) p.push([X(z), Y(phi(z))]); return p; };
  const band = (k, op) => path([[X(-k), base], ...curve(-k, k), [X(k), base]], 'none', 0, C.a, `opacity="${op}"`);
  const br = (k, y, s) => ln(X(-k), y, X(k), y, C.t3, 1.5) + ln(X(-k), y - 5, X(-k), y + 5, C.t3) + ln(X(k), y - 5, X(k), y + 5, C.t3) + tx(X(0), y - 7, s, {a: 'middle', size: 16, fill: C.ink});
  return svg(336, [
    band(3, .18), band(2, .22), band(1, .3),
    path(curve(-3.6, 3.6), C.pen, 2.5),
    ln(X(-3.6), base, X(3.6), base, C.t3, 1.5),
    ...[-3, -2, -1, 0, 1, 2, 3].map(k => ln(X(k), base, X(k), base + 6, C.t3) + tx(X(k), base + 24, k ? (k > 0 ? '+' : '−') + Math.abs(k) + 'σ' : L.mu, {a: 'middle', size: 15, fill: C.t3})),
    br(1, 256, L.s1), br(2, 290, L.s2), br(3, 324, L.s3),
    arrow(X(2.75), 120, X(2.35), Y(phi(2.3)) + 6), tx(X(2.75) - 6, 112, L.tail, {size: 16, fill: C.ink}),
  ].join(''), L.s1 + ' · ' + L.s2 + ' · ' + L.s3);
};

viz['ab-testing'] = L => {
  const box = (x, y, w, h, s, st, fill = '#fff') => rect(x, y, w, h, fill, `rx="10" stroke="${st}" stroke-width="2"`) + tx(x + w / 2, y + h / 2 + 6, s, {a: 'middle', size: 16, fill: C.ink});
  const dots = []; const r = rng(5);
  for (let i = 0; i < 14; i++) dots.push(circ(110 + i * 17.5, 26, 6, r() < .5 ? C.a : C.b, 'opacity=".9"'));
  return svg(430, [
    ...dots, tx(230, 54, L.users, {a: 'middle', size: 15, fill: C.t3}),
    arrow(230, 62, 230, 86), box(130, 88, 200, 40, L.hash, C.pen, '#EEF2FA'),
    arrow(195, 130, 115, 166), arrow(265, 130, 345, 166),
    box(30, 168, 170, 40, L.a, C.a, '#E6EEF8'), box(260, 168, 170, 40, L.b, C.b, '#FBEBDD'),
    arrow(115, 210, 115, 238), arrow(345, 210, 345, 238),
    box(30, 240, 170, 40, L.ma, C.line), box(260, 240, 170, 40, L.mb, C.line),
    arrow(115, 282, 200, 314), arrow(345, 282, 260, 314),
    box(80, 316, 300, 40, L.diff, C.t3),
    arrow(230, 358, 230, 382), box(80, 384, 300, 40, L.dec, C.mint, '#E2F1E7'),
  ].join(''), [L.users, L.hash, L.a, L.b, L.diff, L.dec].join(' → '));
};

viz['confidence-interval'] = L => {
  // ищем зерно, при котором ровно одна вилка из 20 промахивается (подпись «19 из 20»)
  let rows, seed = 1;
  for (;; seed++){ const g = gauss(rng(seed)); rows = Array.from({length: 20}, () => 3 + g()); if (rows.filter(m => Math.abs(m - 3) > 1.96).length === 1) break; }
  const X = v => 40 + (v + 1) * 50, top = 40, step = 14;
  const out = [ln(X(3), top - 12, X(3), top + 20 * step + 4, C.ink, 1.5, '5 4'), tx(X(3), top - 18, L.truth, {a: 'middle', size: 15, fill: C.ink})];
  rows.forEach((m, i) => { const y = top + i * step, miss = Math.abs(m - 3) > 1.96, col = miss ? C.red : C.a;
    out.push(ln(X(m - 1.96), y, X(m + 1.96), y, col, miss ? 3 : 2.5), circ(X(m), y, 3.5, col));
    if (miss) out.push(tx(m > 3 ? X(m - 1.96) - 8 : X(m + 1.96) + 8, y + 5, L.miss, {a: m > 3 ? 'end' : 'start', size: 15, fill: C.red, bg: true})); });
  out.push(ln(X(-1), top + 20 * step + 4, X(7.4), top + 20 * step + 4, C.t3));
  [0, 2, 4, 6].forEach(v => out.push(tx(X(v), top + 20 * step + 26, (v > 0 ? '+' : '') + v + ' %', {a: 'middle', size: 15, fill: C.t3})));
  out.push(tx(W - 10, top + 20 * step + 50, L.hit, {a: 'end', size: 16, fill: C.ink, w: 500}));
  return svg(top + 20 * step + 62, out.join(''), L.hit);
};

viz['t-test'] = L => {
  const X = v => 30 + (v - 610) * 5, base = 200, se = 7.5, Y = d => base - d * 2600;
  const bell = mu => { const p = []; for (let v = 610; v <= 690; v += .5) p.push([X(v), Y(phi((v - mu) / se) / se)]); return p; };
  const top = Y(phi(0) / se);
  return svg(320, [
    path([[X(610), base], ...bell(640), [X(690), base]], 'none', 0, C.a, 'opacity=".18"'), path(bell(640), C.a, 2.5),
    path([[X(610), base], ...bell(660), [X(690), base]], 'none', 0, C.b, 'opacity=".18"'), path(bell(660), C.b, 2.5),
    ln(X(640), top - 4, X(640), base, C.a, 1.5, '4 3'), ln(X(660), top - 4, X(660), base, C.b, 1.5, '4 3'),
    tx(X(640) - 8, top - 12, L.a, {a: 'end', size: 16, fill: '#2B5E96', w: 500}), tx(X(660) + 8, top - 12, L.b, {a: 'start', size: 16, fill: '#A85A24', w: 500}),
    ln(X(610), base, X(690), base, C.t3), ...[620, 640, 660, 680].map(v => ln(X(v), base, X(v), base + 5, C.t3) + tx(X(v), base + 22, v, {a: 'middle', size: 15, fill: C.t3})),
    tx(W / 2, base + 44, L.x, {a: 'middle', size: 15, fill: C.t3}),
    arrow(X(640), 270, X(660), 270, C.ink), arrow(X(660), 270, X(640), 270, C.ink), tx(X(660) + 12, 276, L.d, {size: 16, fill: C.ink}),
    tx(W / 2, 308, L.t, {a: 'middle', size: 17, fill: C.ink, w: 500}),
  ].join(''), L.t);
};

viz['survivorship-bias'] = L => {
  const cx = 230;
  const body = path([[cx - 16, 40], [cx, 18], [cx + 16, 40], [cx + 16, 300], [cx + 6, 330], [cx - 6, 330], [cx - 16, 300]], C.t3, 2, '#EEF0F2');
  const wing = path([[cx - 16, 140], [cx - 200, 205], [cx - 200, 225], [cx - 16, 195], [cx + 16, 195], [cx + 200, 225], [cx + 200, 205], [cx + 16, 140]], C.t3, 2, '#EEF0F2');
  const tail = path([[cx - 6, 290], [cx - 70, 320], [cx - 70, 332], [cx + 70, 332], [cx + 70, 320], [cx + 6, 290]], C.t3, 2, '#EEF0F2');
  const eng = [cx - 110, cx + 110].map(x => rect(x - 13, 150, 26, 44, '#fff', `rx="8" stroke="${C.mint}" stroke-width="2.5"`)).join('');
  const r = rng(11), holes = [];
  while (holes.length < 46){ const x = cx - 195 + r() * 390, y = 30 + r() * 300;
    const inBody = Math.abs(x - cx) < 13 && y > 45 && y < 300, inWing = Math.abs(x - cx) > 18 && y > 150 + Math.abs(x - cx) * .3 && y < 192 + Math.abs(x - cx) * .15,
      inEng = Math.abs(Math.abs(x - cx) - 110) < 20 && y > 140 && y < 205;
    if ((inBody || inWing) && !inEng) holes.push(circ(x, y, 3.2, C.red)); }
  return svg(370, [body, wing, tail, eng, ...holes,
    tx(cx - 110, 120, L.eng, {a: 'middle', size: 15, fill: C.mint, w: 500, bg: true}), ln(cx - 110, 126, cx - 110, 148, C.mint, 1.5),
    tx(cx + 200, 255, L.wing, {a: 'end', size: 15, fill: C.ink, bg: true}),
    tx(cx + 26, 80, L.body, {size: 15, fill: C.ink, bg: true}),
    tx(cx, 360, L.title, {a: 'middle', size: 15, fill: C.t3}),
  ].join(''), L.title + ': ' + L.eng);
};

viz['mann-whitney'] = L => {
  const A = [200, 350, 600, 650, 700], B = [450, 550, 680, 800, 900];
  const x0 = 150, y0 = 70, c = 46, out = [];
  let u = 0;
  B.forEach((b, j) => out.push(tx(x0 + j * c + c / 2, y0 - 10, b, {a: 'middle', size: 15, fill: '#A85A24'})));
  A.forEach((a, i) => { out.push(tx(x0 - 10, y0 + i * c + c / 2 + 5, a, {a: 'end', size: 15, fill: '#2B5E96'}));
    B.forEach((b, j) => { const w = b > a; if (w) u++; out.push(rect(x0 + j * c + 2, y0 + i * c + 2, c - 4, c - 4, w ? C.a : '#F3F0EA', `rx="6"${w ? ' opacity=".85"' : ` stroke="${C.line}"`}`)); }); });
  if (u !== 18) throw new Error('terms-viz: mann-whitney — U должно быть 18, вышло ' + u);
  out.push(tx(x0 + 2.5 * c, 30, L.b, {a: 'middle', size: 15, fill: C.t3}), tx(x0 - 70, y0 + 2.5 * c + 5, L.a, {a: 'middle', size: 15, fill: C.t3}).replace('<text', `<text transform="rotate(-90 ${x0 - 70} ${y0 + 2.5 * c})"`));
  out.push(rect(x0, y0 + 5 * c + 16, 14, 14, C.a, 'opacity=".85"'), tx(x0 + 20, y0 + 5 * c + 28, L.win, {size: 15}),
    rect(x0 + 130, y0 + 5 * c + 16, 14, 14, '#F3F0EA', `stroke="${C.line}"`), tx(x0 + 150, y0 + 5 * c + 28, L.lose, {size: 15}),
    tx(x0 + 2.5 * c, y0 + 5 * c + 60, L.u, {a: 'middle', size: 17, fill: C.ink, w: 500}));
  return svg(y0 + 5 * c + 72, out.join(''), L.u);
};

viz['bayes-theorem'] = L => {
  const node = (x, y, s, st, fill = '#fff', w = 150) => rect(x - w / 2, y - 18, w, 36, fill, `rx="10" stroke="${st}" stroke-width="2"`) + tx(x, y + 6, s, {a: 'middle', size: 15, fill: C.ink});
  return svg(330, [
    node(230, 30, L.top, C.t3, '#fff', 160),
    ln(200, 48, 115, 92, C.t3), ln(260, 48, 345, 92, C.t3),
    node(115, 110, L.nuts, C.red, '#FBE4E4', 190), node(345, 110, L.clean, C.a, '#E6EEF8', 170),
    ln(95, 128, 65, 182, C.t3), ln(135, 128, 165, 182, C.t3), ln(325, 128, 295, 182, C.t3), ln(365, 128, 395, 182, C.t3),
    tx(66, 158, L.p95, {a: 'end', size: 15, fill: C.t3}), tx(296, 158, L.p5, {a: 'end', size: 15, fill: C.t3}),
    node(65, 200, L.b1, C.b, '#FBEBDD', 100), node(170, 200, L.s1, C.line, '#fff', 90),
    node(290, 200, L.b2, C.b, '#FBEBDD', 100), node(400, 200, L.s2, C.line, '#fff', 100),
    `<path d="M65 220 Q65 262 180 268 M290 220 Q290 262 200 268" fill="none" stroke="${C.b}" stroke-width="2"/>`,
    rect(30, 270, 400, 40, '#FBF1C9', 'rx="10"'), tx(230, 296, L.sum, {a: 'middle', size: 16, fill: C.ink, w: 500}),
  ].join(''), L.sum);
};

viz['chi-square'] = L => {
  const O = [5, 8, 9, 7, 11, 20], base = 250, Y = v => base - v * 10, bw = 42, x0 = 112, st = 56;
  const out = [ln(x0 - 10, base, x0 + 6 * st, base, C.t3)];
  O.forEach((o, i) => { const x = x0 + i * st, k = (o - 10) ** 2 / 10;
    out.push(rect(x, Y(o), bw, o * 10, i === 5 ? C.b : C.a, 'opacity=".85" rx="3"'),
      tx(x + bw / 2, Y(o) - 8, o, {a: 'middle', size: 16, fill: C.ink, w: 500, bg: true}),
      tx(x + bw / 2, base + 22, i + 1, {a: 'middle', size: 15, fill: C.t3}),
      tx(x + bw / 2, base + 46, '+' + String(f1(k)).replace('.', ','), {a: 'middle', size: 15, fill: i === 5 ? '#A85A24' : C.t3})); });
  out.push(ln(x0 - 10, Y(10), x0 + 6 * st, Y(10), C.ink, 1.5, '6 4'), tx(x0 - 16, Y(10) + 5, L.e, {a: 'end', size: 15, fill: C.ink}),
    tx(x0 - 14, base + 22, L.face, {a: 'end', size: 15, fill: C.t3}), tx(x0 - 14, base + 46, '(O−E)²/E', {a: 'end', size: 13, fill: C.t3}),
    tx(W / 2, base + 80, L.sum, {a: 'middle', size: 15, fill: C.ink, w: 500}));
  const chi = O.reduce((s, o) => s + (o - 10) ** 2 / 10, 0); if (Math.abs(chi - 14) > 1e-9) throw new Error('terms-viz: chi-square ≠ 14');
  return svg(base + 92, out.join(''), L.sum);
};

viz['law-of-large-numbers'] = L => {
  const N = 10000, r = rng(42), X = n => 60 + Math.log10(n) / 4 * 380, Y = p => 30 + (1 - p) * 220;
  const pts = []; let h = 0; for (let n = 1; n <= N; n++){ h += r() < .5 ? 1 : 0; if (n < 50 || n % 25 === 0) pts.push([X(n), Y(h / n)]); }
  const up = [], dn = []; for (let e = 0; e <= 4.0001; e += .05){ const n = 10 ** e, d = 1.96 * .5 / Math.sqrt(n); up.push([X(n), Y(Math.min(1, .5 + d))]); dn.push([X(n), Y(Math.max(0, .5 - d))]); }
  return svg(320, [
    path([...up, ...dn.reverse()], 'none', 0, '#E3DED4', 'opacity=".8"'),
    ln(X(1), Y(.5), X(N), Y(.5), C.ink, 1.5, '5 4'), path(pts, C.a, 2),
    ln(X(1), Y(0), X(N), Y(0), C.t3), ln(X(1), Y(0), X(1), Y(1), C.t3),
    ...[1, 10, 100, 1000, 10000].map(n => tx(X(n), Y(0) + 22, nf(n), {a: n === 10000 ? 'end' : 'middle', size: 15, fill: C.t3})),
    ...[0, .5, 1].map(p => tx(X(1) - 8, Y(p) + 5, Math.round(p * 100) + ' %', {a: 'end', size: 15, fill: C.t3})),
    tx(X(N), Y(0) + 46, L.x, {a: 'end', size: 15, fill: C.t3}), tx(X(30), Y(.93), L.band, {size: 15, fill: C.t3, bg: '#FBFAF6'}),
  ].join(''), L.y + ' — ' + L.x);
};

viz['p-value'] = L => {
  const X = z => 230 + z * 55, base = 220, Y = d => base - d * 430, t = 2.17;
  const curve = (a, b) => { const p = []; for (let z = a; z <= b + 1e-9; z += .05) p.push([X(z), Y(phi(z))]); return p; };
  return svg(320, [
    path([[X(t), base], ...curve(t, 3.8), [X(3.8), base]], 'none', 0, C.red, 'opacity=".55"'),
    path([[X(-3.8), base], ...curve(-3.8, -t), [X(-t), base]], 'none', 0, C.red, 'opacity=".55"'),
    path(curve(-3.8, 3.8), C.pen, 2.5), ln(X(-3.8), base, X(3.8), base, C.t3),
    ln(X(t), 70, X(t), base, C.b, 2.5), ln(X(-t), 70, X(-t), base, C.b, 2, '5 4'),
    tx(X(t), 62, L.obs, {a: 'middle', size: 15, fill: '#A85A24', w: 500}), tx(X(-t), 62, L.mir, {a: 'middle', size: 15, fill: C.t3}),
    tx(X(0), Y(phi(0)) - 10, L.null, {a: 'middle', size: 15, fill: C.pen}),
    ...[-3, -2, -1, 0, 1, 2, 3].map(k => tx(X(k), base + 22, (k > 0 ? '+' : k < 0 ? '−' : '') + Math.abs(k), {a: 'middle', size: 15, fill: C.t3})),
    tx(X(3.8), base + 44, L.z, {a: 'end', size: 15, fill: C.t3}),
    tx(W / 2, base + 84, L.p, {a: 'middle', size: 16, fill: C.ink, w: 500}),
  ].join(''), L.p);
};

viz['statistical-significance'] = L => {
  const X = v => 240 + (v + 2) * 26, rows = [[L.a, 2.4, 4.6, C.mint], [L.b, .3, 1.1, C.a], [L.c, -1.8, 4.8, C.t3], [L.d, -.5, .6, C.t3]];
  const out = [ln(X(0), 30, X(0), 250, C.ink, 1.5), ln(X(2), 30, X(2), 250, C.b, 2, '6 4'),
    tx(X(0), 270, L.zero, {a: 'middle', size: 15, fill: C.ink}), tx(X(2) + 4, 22, L.thr, {a: 'middle', size: 15, fill: '#A85A24'})];
  rows.forEach(([s, a, b, col], i) => { const y = 60 + i * 52;
    out.push(tx(10, y + 5, s, {size: 15, fill: C.ink}), ln(X(a), y, X(b), y, col, 4), circ(X((a + b) / 2), y, 5, col)); });
  out.push(tx(X(6), 270, L.x + ' →', {a: 'end', size: 15, fill: C.t3}));
  return svg(285, out.join(''), rows.map(r => r[0]).join(' · '));
};

viz['sample-size'] = L => {
  const k = 7.848879734349088, n = d => k * (.1 * .9 + (.1 + d) * (.9 - d)) / (d * d);
  const X = m => 70 + (m - .3) / 2.7 * 360, ly = v => Math.log10(v), Y = v => 250 - (ly(v) - 3) / (ly(4e5) - 3) * 220;
  const pts = []; for (let m = .3; m <= 3.0001; m += .02) pts.push([X(m), Y(n(m / 100))]);
  const mk = (m, s, a) => { const v = n(m / 100); return circ(X(m), Y(v), 5, C.pen) + tx(X(m) + (a === 'end' ? -10 : 10), Y(v) - 8, s, {a, size: 16, fill: C.ink, w: 500, bg: true}); };
  return svg(310, [
    ln(X(.3), 250, X(3), 250, C.t3), ln(X(.3), 30, X(.3), 250, C.t3),
    ...[1e3, 1e4, 1e5].map(v => tx(X(.3) - 8, Y(v) + 5, nf(v), {a: 'end', size: 15, fill: C.t3}) + ln(X(.3), Y(v), X(3), Y(v), '#ECE9E2', 1)),
    ...[.5, 1, 1.5, 2, 2.5, 3].map(m => tx(X(m), 272, String(m).replace('.', ','), {a: 'middle', size: 15, fill: C.t3})),
    path(pts, C.a, 2.5), mk(.5, L.p05, 'start'), mk(1, L.p1, 'start'), mk(2, L.p2, 'start'),
    tx(X(3), 296, L.x, {a: 'end', size: 15, fill: C.t3}), tx(X(.3) + 6, 24, L.y, {size: 15, fill: C.t3}),
  ].join(''), `${L.p05} · ${L.p1} · ${L.p2}`);
};

viz['central-limit-theorem'] = L => {
  const X = v => 40 + v / 30 * 400, base = 230, Y = d => base - d * 900;
  const dens = (nn, v) => v <= 0 ? 0 : Math.exp(nn * Math.log(nn / 10) + (nn - 1) * Math.log(v) - nn * v / 10 - lgamma(nn));
  const cv = (nn, col, w) => { const p = []; for (let v = .05; v <= 30; v += .1) p.push([X(v), Y(Math.min(.24, dens(nn, v)))]); return path(p, col, w); };
  return svg(300, [
    ln(X(0), base, X(30), base, C.t3), ...[0, 10, 20, 30].map(v => tx(X(v), base + 22, v, {a: 'middle', size: 15, fill: C.t3})),
    ln(X(10), 20, X(10), base, C.line, 1.5, '4 4'),
    cv(1, '#9DB8DA', 2), cv(2, '#6E9BD0', 2), cv(5, C.a, 2.5), cv(30, C.pen, 3),
    tx(X(1.8), Y(.1) - 6, L.n1, {size: 15, fill: '#5C7FA8'}), tx(X(4.6), Y(.095) - 18, L.n2, {size: 15, fill: '#4D7DB7', bg: true}),
    tx(X(15.2), Y(.12), L.n5, {size: 15, fill: '#2B5E96', bg: true}), tx(X(12.4), Y(.205), L.n30, {size: 16, fill: C.pen, w: 500, bg: true}),
    tx(X(30), base + 46, L.x, {a: 'end', size: 15, fill: C.t3}),
  ].join(''), [L.n1, L.n2, L.n5, L.n30].join(' · '));
};

viz['monty-hall'] = L => {
  const out = [tx(296, 24, L.stay, {a: 'middle', size: 15, fill: C.t3}), tx(392, 24, L.sw, {a: 'middle', size: 15, fill: C.t3})];
  for (let p = 1; p <= 3; p++){ const y = 40 + (p - 1) * 70;
    const open = p === 1 ? 2 : p === 2 ? 3 : 2;   // ведущий открывает пустую из двух невыбранных (в раскладе 1 — любую, взята 2)
    out.push(tx(8, y + 34, L.row.replace('{n}', p), {size: 15, fill: C.ink}));
    for (let d = 1; d <= 3; d++){ const x = 150 + (d - 1) * 40;
      out.push(rect(x, y + 6, 32, 46, d === open ? '#ECE9E2' : '#fff', `rx="4" stroke="${d === 1 ? C.pen : C.line}" stroke-width="${d === 1 ? 3 : 1.5}"${d === open ? ' stroke-dasharray="4 3"' : ''}`));
      if (d === p) out.push(circ(x + 16, y + 29, 8, C.b)); }
    const stay = p === 1;
    out.push(tx(296, y + 36, stay ? '✓' : '✕', {a: 'middle', size: 22, fill: stay ? C.mint : C.red, w: 500}), tx(392, y + 36, stay ? '✕' : '✓', {a: 'middle', size: 22, fill: stay ? C.red : C.mint, w: 500})); }
  out.push(ln(8, 256, 452, 256, C.line), tx(8, 282, L.tot, {size: 15, fill: C.ink}), tx(296, 282, L.s, {a: 'middle', size: 16, fill: C.ink, w: 500}), tx(392, 282, L.w, {a: 'middle', size: 16, fill: C.mint, w: 500}));
  out.push(rect(128, 296, 14, 14, '#fff', `stroke="${C.pen}" stroke-width="3"`), tx(148, 308, L.pick, {size: 13, fill: C.t3}),
    rect(250, 296, 14, 14, '#ECE9E2', `stroke="${C.line}" stroke-dasharray="3 2"`), tx(270, 308, L.open, {size: 13, fill: C.t3}));
  return svg(320, out.join(''), `${L.stay}: ${L.s} · ${L.sw}: ${L.w}`);
};

viz['simpson-paradox'] = L => {
  const X = s => 70 + s * 360, Y = v => 40 + (100 - v) / 50 * 200;
  return svg(320, [
    ln(X(0), Y(50), X(1), Y(50), C.t3), ln(X(0), Y(50), X(0), Y(100), C.t3),
    ...[50, 75, 100].map(v => tx(X(0) - 8, Y(v) + 5, v + ' %', {a: 'end', size: 15, fill: C.t3})),
    ...[0, .5, 1].map(s => tx(X(s), Y(50) + 22, Math.round(s * 100) + ' %', {a: 'middle', size: 15, fill: C.t3})),
    tx(X(0), Y(50) + 46, L.m, {a: 'start', size: 15, fill: C.t3}), tx(X(1), Y(50) + 46, L.e, {a: 'end', size: 15, fill: C.t3}),
    path([[X(0), Y(95)], [X(1), Y(70)]], C.a, 3), path([[X(0), Y(90)], [X(1), Y(60)]], C.b, 3),
    tx(X(1) - 4, Y(70) - 10, L.bob, {a: 'end', size: 16, fill: '#2B5E96', w: 500}), tx(X(1) - 4, Y(60) + 22, L.kot, {a: 'end', size: 16, fill: '#A85A24', w: 500}),
    circ(X(.8), Y(75), 8, C.a, 'stroke="#fff" stroke-width="2"'), circ(X(.1), Y(87), 8, C.b, 'stroke="#fff" stroke-width="2"'),
    tx(X(.8), Y(75) - 18, L.bp, {a: 'middle', size: 15, fill: C.ink, bg: true}), ln(X(.1), Y(87) - 8, X(.1) + 8, 52, C.t3, 1) , tx(X(.1) + 10, 48, L.kp, {size: 15, fill: C.ink, bg: true}),
    tx(X(.5), Y(50) + 70, L.x, {a: 'middle', size: 15, fill: C.t3}),
  ].join(''), `${L.bp} · ${L.kp}`);
};

viz['regression-to-the-mean'] = L => {
  const r = rng(9), g = gauss(r), pts = [];
  // 40 курьеров: своя скорость (общая для недель) + недельное везение, ρ = 0,5 → σ общей части = σ везения
  for (let i = 0; i < 40; i++){ const s = g() * 2.83, a = 30 + s + g() * 2.83, b = 30 + s + g() * 2.83; pts.push([a, b]); }
  const slow = pts.slice().sort((p, q) => q[0] - p[0]).slice(0, 5);
  const m1 = slow.reduce((s, p) => s + p[0], 0) / 5, m2 = slow.reduce((s, p) => s + p[1], 0) / 5;
  if (!(Math.abs(m2 - 30) < Math.abs(m1 - 30))) throw new Error('terms-viz: регрессия не видна на этом зерне');
  const X = v => 60 + (v - 20) / 20 * 370, Y = v => 260 - (v - 20) / 20 * 230;
  return svg(375, [
    ln(X(20), Y(20), X(40), Y(20), C.t3), ln(X(20), Y(20), X(20), Y(40), C.t3),
    ...[20, 30, 40].map(v => tx(X(v), Y(20) + 22, v, {a: 'middle', size: 15, fill: C.t3}) + tx(X(20) - 8, Y(v) + 5, v, {a: 'end', size: 15, fill: C.t3})),
    ln(X(20), Y(20), X(40), Y(40), C.t3, 1.5, '5 4'), ln(X(20), Y(25), X(40), Y(35), C.pen, 2.5),
    ...pts.map(p => circ(X(p[0]), Y(Math.max(20, Math.min(40, p[1]))), 5, slow.includes(p) ? C.red : C.a, 'opacity=".85"')),
    ...slow.map(p => ln(X(p[0]), Y(p[0]), X(p[0]), Y(p[1]), C.red, 1.2, '2 3')),
    tx(X(40), Y(20) + 44, L.x, {a: 'end', size: 15, fill: C.t3}), tx(X(20) + 6, 18, L.y, {size: 15, fill: C.t3}),
    ln(20, 334, 44, 334, C.t3, 1.5, '5 4'), tx(50, 339, L.same, {size: 15, fill: C.t3}), ln(230, 334, 254, 334, C.pen, 2.5), tx(260, 339, L.exp, {size: 15, fill: C.pen}),
    circ(30, 360, 5, C.red), tx(50, 365, L.slow, {size: 15, fill: C.ink}),
  ].join(''), L.slow);
};

/* ---------- кадры «Когда метод врёт» ---------- */
const lineChart = (L, xs, series, {ymax, yfmt, ref, refLabel, refLeft, xfmt}) => {
  const X = i => 70 + i / (xs.length - 1) * 360, Y = v => 220 - v / ymax * 190;
  const out = [ln(X(0), Y(0), X(xs.length - 1), Y(0), C.t3), ln(X(0), Y(0), X(0), Y(ymax), C.t3)];
  [0, ymax / 2, ymax].forEach(v => out.push(tx(X(0) - 8, Y(v) + 5, yfmt(v), {a: 'end', size: 15, fill: C.t3})));
  xs.forEach((x, i) => out.push(tx(X(i), Y(0) + 22, xfmt(x), {a: 'middle', size: 15, fill: C.t3})));
  if (ref != null) out.push(ln(X(0), Y(ref), X(xs.length - 1), Y(ref), C.ink, 1.5, '6 4'), (refLeft ? tx(X(0) + 8, Y(ref) - 8, refLabel, {size: 15, fill: C.ink, bg: true}) : tx(X(xs.length - 1), Y(ref) - 8, refLabel, {a: 'end', size: 15, fill: C.ink, bg: true})));
  series.forEach(s => { out.push(path(s.v.map((v, i) => [X(i), Y(v)]), s.c, 2.5), ...s.v.map((v, i) => circ(X(i), Y(v), 4.5, s.c)));
    out.push(tx(X(s.at) + (s.dx || 0), Y(s.v[s.at]) + (s.dy || -12), s.label, {a: s.a || 'start', size: 15, fill: s.ink || s.c, w: 500, bg: true})); });
  out.push(tx(X(xs.length - 1), Y(0) + 46, L.x, {a: 'end', size: 15, fill: C.t3}));
  return out.join('');
};

lim['confidence-interval'] = L => svg(280, lineChart(L, [10, 30, 100, 1000, 10000],
  [{v: [67.3, 78.0, 85.0, 92.4, 93.9], c: C.a, label: L.cov, at: 1, dy: 26, ink: '#2B5E96'}],
  {ymax: 100, yfmt: v => v + ' %', ref: 95, refLabel: L.ref, xfmt: nf}), L.cov);

lim['t-test'] = L => svg(280, lineChart(L, [10, 30, 100, 1000],
  [{v: [17.2, 13.9, 10.3, 6.8], c: C.red, label: L.une, at: 0, dx: 10, dy: -12}, {v: [1.7, 2.4, 3.7, 4.8], c: C.a, label: L.eq, at: 2, dy: 24, a: 'middle', ink: '#2B5E96'}],
  {ymax: 20, yfmt: v => v + ' %', ref: 5, refLabel: L.ref, refLeft: true, xfmt: nf}), L.une + ' · ' + L.eq);

lim['chi-square'] = L => svg(280, lineChart(L, [6, 12, 18, 30, 60, 300],
  [{v: [5.8, 3.3, 4.7, 4.8, 4.9, 5.1], c: C.a, label: L.fpr, at: 1, dy: 28, ink: '#2B5E96'}],
  {ymax: 10, yfmt: v => v + ' %', ref: 5, refLabel: L.ref, xfmt: nf}), L.fpr);

lim['bayes-theorem'] = L => {
  const X = p => 60 + (Math.log10(p) + 3) / Math.log10(500) * 370, Y = v => 220 - v * 190, post = p => .95 * p / (.95 * p + .05 * (1 - p));
  const pts = []; for (let e = -3; e <= Math.log10(.5) + 1e-9; e += .02) pts.push([X(10 ** e), Y(post(10 ** e))]);
  return svg(280, [ln(X(.001), Y(0), X(.5), Y(0), C.t3), ln(X(.001), Y(0), X(.001), Y(1), C.t3),
    ...[0, .5, 1].map(v => tx(X(.001) - 8, Y(v) + 5, v * 100 + ' %', {a: 'end', size: 15, fill: C.t3})),
    ...[[.001, '0,1 %'], [.01, '1 %'], [.1, '10 %'], [.5, '50 %']].map(([p, s]) => tx(X(p), Y(0) + 22, s, {a: 'middle', size: 15, fill: C.t3})),
    path(pts, C.a, 2.5), circ(X(.02), Y(post(.02)), 6, C.b), tx(X(.02) + 10, Y(post(.02)) + 22, L.pt, {size: 15, fill: C.ink, bg: true}),
    tx(X(.5), Y(0) + 46, L.x, {a: 'end', size: 15, fill: C.t3}), tx(X(.001) + 6, 22, L.y, {size: 15, fill: C.t3})].join(''), L.y + ' — ' + L.x);
};

lim['law-of-large-numbers'] = L => {
  const r = rng(3), g = gauss(r), X = n => 60 + Math.log10(n) / 4 * 370, Y = v => 125 - v * 50;
  const a = [], b = []; let s1 = 0, s2 = 0;
  for (let n = 1; n <= 10000; n++){ s1 += g(); s2 += Math.tan(Math.PI * (r() - .5)); if (n < 30 || n % 20 === 0){ a.push([X(n), Y(s1 / n)]); b.push([X(n), Y(Math.max(-2, Math.min(2, s2 / n)))]); } }
  return svg(312, [ln(X(1), Y(0), X(10000), Y(0), C.ink, 1.5, '5 4'), ln(X(1), Y(-2), X(10000), Y(-2), C.t3), ln(X(1), Y(-2), X(1), Y(2), C.t3),
    path(b, C.red, 1.8), path(a, C.a, 2.2), ...[1, 10, 100, 1000, 10000].map(n => tx(X(n), Y(-2) + 22, nf(n), {a: n === 10000 ? 'end' : 'middle', size: 15, fill: C.t3})),
    tx(X(10000), Y(-2) + 44, L.x, {a: 'end', size: 15, fill: C.t3}),
    ln(X(1), 296, X(1) + 24, 296, C.a, 3), tx(X(1) + 30, 301, L.nor, {size: 15, fill: '#2B5E96', w: 500}),
    ln(X(1) + 170, 296, X(1) + 194, 296, C.red, 3), tx(X(1) + 200, 301, L.cau, {size: 15, fill: C.red, w: 500})].join(''), L.cau + ' · ' + L.nor);
};

lim['normal-distribution'] = L => {
  const X = v => 40 + (v + 20) / 70 * 400, base = 220, Y = d => base - d * 1700;
  const ex = [], no = [], neg = [[X(-20), base]];
  for (let v = -20; v <= 50; v += .25){ no.push([X(v), Y(phi((v - 10) / 10) / 10)]); if (v < 0) neg.push([X(v), Y(phi((v - 10) / 10) / 10)]); if (v >= 0) ex.push([X(v), Y(Math.exp(-v / 10) / 10)]); }
  neg.push([X(0), Y(phi(-1) / 10)], [X(0), base]);
  return svg(280, [path(neg, 'none', 0, C.red, 'opacity=".35"'), ln(X(-20), base, X(50), base, C.t3),
    ...[-20, 0, 10, 30, 50].map(v => tx(X(v), base + 22, (v < 0 ? '−' : '') + Math.abs(v), {a: 'middle', size: 15, fill: C.t3})),
    path([[X(0), base], ...ex], C.a, 2.5), path(no, C.pen, 2, 'none', 'stroke-dasharray="6 4"'),
    tx(X(2), Y(.1) - 6, L.real, {size: 15, fill: '#2B5E96', w: 500, bg: true}), tx(X(19), Y(.045), L.bell, {size: 15, fill: C.pen, bg: true}),
    tx(X(-19), Y(.012) - 24, L.neg, {size: 15, fill: C.red, bg: true}), tx(X(50), base + 46, L.x, {a: 'end', size: 15, fill: C.t3})].join(''), L.real + ' · ' + L.bell);
};

lim['mann-whitney'] = L => {
  const A = [150, 200, 200, 250, 300, 350, 400, 600, 650, 650, 700, 700, 750, 750, 800], B = [450, 500, 500, 550, 550, 550, 600, 600, 900, 950, 1000, 1050, 1100, 1200, 1300];
  const X = v => 60 + (v - 100) / 1250 * 380, out = [];
  const strip = (arr, y, col, lab) => { const seen = {}; arr.forEach(v => { seen[v] = (seen[v] || 0) + 1; out.push(circ(X(v), y - (seen[v] - 1) * 12, 5.5, col, 'opacity=".9"')); });
    out.push(tx(8, y + 5, lab, {size: 15, fill: C.ink, w: 500})); };
  strip(A, 90, C.a, 'A'); strip(B, 170, C.b, 'B');
  out.push(ln(X(600), 40, X(600), 200, C.ink, 1.5, '5 4'), tx(X(600) + 6, 34, L.med, {size: 15, fill: C.ink, bg: true}),
    ln(X(100), 210, X(1350), 210, C.t3), ...[200, 600, 1000].map(v => tx(X(v), 232, v, {a: 'middle', size: 15, fill: C.t3})), tx(X(1350), 256, L.x, {a: 'end', size: 15, fill: C.t3}));
  return svg(270, out.join(''), L.med);
};

module.exports = {viz, lim};
