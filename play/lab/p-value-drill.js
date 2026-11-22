/* p-value-drill: 1000 A/A (по 20 000 гостей, 10%) — p-value лежат ровным ковром, около 50 на столбик шириной 0.05,
   в том числе в столбике 0.90–0.95. Нажатие на столбик открывает один тест из него (лестница абстракции Виктора). */
(function(){
  const C = Lab.C, N = 20000, P = 0.1, K = 1000;
  const cv = document.getElementById('pvd-cv'), det = document.getElementById('pvd-d');
  let tests = [], shown = 0, bars = [];
  const bin = p => Math.min(19, Math.floor(p / 0.05));
  function draw(){
    const g = Lab.canvas(cv, 0.42, 0.78); if (!g) return; const {c, w, h} = g;
    const L = 34, R = 6, T = 12, B = h - 26, bw = (w - L - R) / 20, ymax = 100, Y = v => B - v / ymax * (B - T);
    Lab.gridY(c, Y, L, w - R, [0, 25, 50, 75, 100], v => Lab.num(v));
    const cnt = new Array(20).fill(0); for (let i = 0; i < shown; i++) cnt[bin(tests[i].p)]++;
    bars = [];
    cnt.forEach((k, i) => { const x = L + i * bw; c.fillStyle = i === 18 ? C.accent : i === 0 ? C.ctrl : C.gray; c.fillRect(x + 1, Y(Math.min(k, ymax)), bw - 2, B - Y(Math.min(k, ymax))); bars.push([x, x + bw, i]); });
    c.strokeStyle = C.ink; c.lineWidth = 1.5; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(L, Y(50)); c.lineTo(w - R, Y(50)); c.stroke(); c.setLineDash([]);
    Lab.ticksX(c, v => L + v / 0.05 * bw, h - 6, [0, 0.25, 0.5, 0.75, 1], v => Lab.numT(v, 2));
    if (shown === K){ Lab.tag(c, Lab.num(cnt[18]), L + 18.5 * bw, Y(cnt[18]) - 6, C.trapInk, 'center', Lab.FONT14, null); Lab.tag(c, Lab.num(cnt[0]), L + 0.5 * bw, Y(cnt[0]) - 6, C.pen, 'center', Lab.FONT14, null); }
    cv.setAttribute('aria-label', 'p-value ' + shown + ' A/A-тестов: от ' + Math.min(...cnt) + ' до ' + Math.max(...cnt) + ' тестов на столбик; 0.90–0.95 — ' + cnt[18] + ', меньше 0.05 — ' + cnt[0]);
    return cnt;
  }
  const fmtT = (t, i) => 'Тест № ' + (i + 1) + ': A — ' + Lab.num(t.a) + ' заказов из 20 000 (' + Lab.num(t.a / N * 100, 2) + '%), B — ' + Lab.num(t.b) + ' (' + Lab.num(t.b / N * 100, 2) + '%), разница ' + Lab.signed((t.b - t.a) / N * 100, 2) + ' п. п., p = ' + Lab.num(t.p, 3) + '.' + (t.p < 0.05 ? ' «Значимо», хотя группы одинаковые.' : t.p > 0.9 ? ' Почти одинаковые группы — но и это случай, а не доказательство равенства.' : '');
  cv.addEventListener('pointerdown', e => {
    if (shown < K) return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, b = bars.find(b => x >= b[0] && x <= b[1]); if (!b) return;
    const ids = tests.map((t, i) => [t, i]).filter(([t]) => bin(t.p) === b[2]); if (!ids.length){ det.textContent = 'В этом столбике тестов нет.'; return; }
    const [t, i] = ids[Lab.int(ids.length)];
    det.textContent = 'Столбик p от ' + Lab.numT(b[2] * 0.05, 2) + ' до ' + Lab.numT(b[2] * 0.05 + 0.05, 2) + ', в нём ' + ids.length + ' тестов. ' + fmtT(t, i);
  });
  async function run(api){
    det.textContent = ''; shown = 0;
    tests = Array.from({length: K}, () => { const a = Lab.binom(N, P), b = Lab.binom(N, P); return {a, b, p: Lab.pZ(a, b, N)}; });
    for (let s = 1; s <= 20; s++){ shown = s * 50; draw(); await Lab.sleep(60); }
    const cnt = draw();
    api.verdict(cnt[18] + ' из 1000', 'p меньше 0.05 у ' + cnt[0] + ' тестов: столько же, сколько в любом другом столбике');
  }
  Lab.game('p-value-drill', {min: 0, max: 1000, example: 10, run, draw});
})();
