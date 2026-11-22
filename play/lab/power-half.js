/* power-half: эффект +1.19 п. п. при конверсии 10% тест на 10 000 гостей в группе замечает в 80% случаев,
   на 5 000 — в 51%, на 20 000 — в 98%. Мощность = Φ(δ / SE − 1.96) (+ малый левый хвост). */
(function(){
  const C = Lab.C, P = 0.10, D = 0.011886, N = 5000;
  const power = n => { const se = Math.sqrt(2 * P * (1 - P) / n); return Lab.normCdf(D / se - 1.959964) + Lab.normCdf(-D / se - 1.959964); };
  const gv = document.getElementById('ph-grid'), cv = document.getElementById('ph-cv');
  let res = [], tot = null;
  const test = () => { const a = Lab.binom(N, P), b = Lab.binom(N, P + D); return Lab.pZ(a, b, N) < 0.05 && b > a; };
  function drawGrid(){
    const g = Lab.canvas(gv, 0.16, 0.42); if (!g) return; const {c, w, h} = g;
    const cols = w < 520 ? 20 : 50, rows = 100 / cols, s = Math.min(w / cols, h / rows), r = s * 0.36;
    for (let i = 0; i < 100; i++) Lab.dot(c, (i % cols) * s + s / 2, Math.floor(i / cols) * s + s / 2, r, i < res.length ? (res[i] ? C.truth : C.grid) : '#F4F3F0');
    gv.setAttribute('aria-label', 'Заметили эффект ' + res.filter(Boolean).length + ' тестов из ' + res.length);
  }
  function drawCurve(api){
    const g = Lab.canvas(cv, 0.42, 0.75); if (!g) return; const {c, w, h} = g;
    const L = 40, R = 12, T = 16, B = h - 26, lx = Math.log(1000), hx = Math.log(40000);
    const X = n => L + (Math.log(n) - lx) / (hx - lx) * (w - L - R), Y = p => B - p * (B - T);
    Lab.gridY(c, Y, L, w - R, [0, 0.5, 0.8, 1], v => Lab.num(v * 100) + '%');
    Lab.ticksX(c, X, h - 6, w < 520 ? [1000, 5000, 10000, 40000] : [1000, 2500, 5000, 10000, 20000, 40000], n => Lab.num(n));
    const pts = []; for (let i = 0; i <= 120; i++){ const n = Math.exp(lx + (hx - lx) * i / 120); pts.push([X(n), Y(power(n))]); }
    Lab.line(c, pts, C.ctrl, 2.5);
    Lab.dot(c, X(10000), Y(0.8), 5, C.ctrl, '#fff'); Lab.tag(c, '10 000 → 80%', X(10000) + 8, Y(0.8) + 18, C.pen);
    const sh = tot ? tot.k / tot.n : res.filter(Boolean).length / Math.max(1, res.length);
    Lab.dot(c, X(N), Y(sh), 5, C.truth, '#fff'); Lab.tag(c, 'у тебя вышло ' + Lab.pct(sh), X(N) + 8, Y(sh) + 18, C.truth);
    if (api && api.guess != null){ const gy = Y(Math.max(0, Math.min(100, api.guess)) / 100); c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(X(N) - 7, gy); c.lineTo(X(N) + 7, gy); c.stroke(); Lab.tag(c, 'прогноз', X(N) - 10, gy + 4, C.ink, 'right'); }
    cv.setAttribute('aria-label', 'Кривая мощности: 2500 гостей — 29%, 5000 — 51%, 10 000 — 80%, 20 000 — 98%');
  }
  let A = null;
  const draw = api => { A = api || A; drawGrid(); drawCurve(A); };
  async function run(api){
    A = api; res = []; tot = null; cv.hidden = true; document.getElementById('ph-t1').hidden = true;
    for (let i = 0; i < 100; i++){ res.push(test()); if (i % 4 === 3){ drawGrid(); await Lab.sleep(30); } }
    drawGrid(); cv.hidden = false; document.getElementById('ph-t1').hidden = false; drawCurve(api);
    api.verdict(res.filter(Boolean).length + ' из 100', 'По формуле — 51%: вдвое меньше гостей не значит вдвое ниже мощность');
  }
  Lab.game('power-half', {min: 0, max: 100, example: 40, fmt: v => Lab.numT(v) + '%', run, draw,
    async x1000(api){
      tot = {k: 0, n: 0};
      for (let b = 0; b < 10; b++){ for (let i = 0; i < 100; i++){ tot.k += test() ? 1 : 0; tot.n++; } drawCurve(api); api.status('Прогнано ' + tot.n + ' из 1000 тестов…'); await Lab.sleep(40); }
      api.status('Твой прогноз: <b>' + Lab.numT(api.guess) + '%</b> · из 1000 тестов эффект заметили <b>' + tot.k + '</b> — ' + Lab.pct(tot.k / tot.n));
    }});
})();
