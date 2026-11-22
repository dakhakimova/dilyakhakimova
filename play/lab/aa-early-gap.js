/* aa-early-gap: A/A с конверсией 10%; при 20 гостях в группе |B − A| ≥ 10 п. п. в 42% тестов (точно — 41.7%),
   при 100 — в 2.5%, при 500 — почти никогда. Разница сужается как 1/√n. */
(function(){
  const C = Lab.C, P = 0.1, NMAX = 500, CUT = 20;
  const cv = document.getElementById('aeg-cv');
  let runs = [], upto = 0;
  const one = () => { const d = new Float32Array(NMAX); let a = 0, b = 0; for (let n = 1; n <= NMAX; n++){ if (Lab.rand() < P) a++; if (Lab.rand() < P) b++; d[n - 1] = (b - a) / n * 100; } return d; };
  const wide = (d, n) => Math.abs(d[n - 1]) >= 10 - 1e-9;
  function draw(){
    const g = Lab.canvas(cv, 0.46, 0.85); if (!g) return; const {c, w, h} = g;
    const N0 = 5, L = 40, R = 8, T = 12, B = h - 26, X = n => L + Math.log(n / N0) / Math.log(NMAX / N0) * (w - L - R), Y = v => (T + B) / 2 - v / 80 * (B - T);
    c.fillStyle = C.fillGray; c.fillRect(L, Y(10), w - L - R, Y(-10) - Y(10));
    Lab.gridY(c, Y, L, w - R, [-40, -20, 0, 20, 40], v => (v > 0 ? '+' : '') + Lab.num(v));
    c.strokeStyle = C.ink2; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Y(0) + 0.5); c.lineTo(w - R, Y(0) + 0.5); c.stroke();
    Lab.ticksX(c, X, h - 6, [5, 20, 100, 500], n => Lab.num(n));
    Lab.text(c, 'гостей в группе →', w - R, B - 6, C.ink2, 'right');
    const m = Math.min(upto, NMAX);
    runs.forEach((d, j) => { if (j === 0) return; c.strokeStyle = 'rgba(107,106,101,.22)'; c.lineWidth = 1; c.beginPath(); for (let n = N0; n <= m; n++){ const y = Y(Math.max(-40, Math.min(40, d[n - 1]))); n === N0 ? c.moveTo(X(n), y) : c.lineTo(X(n), y); } c.stroke(); });
    if (runs[0]){ c.strokeStyle = C.ctrl; c.lineWidth = 2; c.beginPath(); for (let n = N0; n <= m; n++){ const y = Y(Math.max(-40, Math.min(40, runs[0][n - 1]))); n === N0 ? c.moveTo(X(n), y) : c.lineTo(X(n), y); } c.stroke(); }
    if (m >= CUT){ const x = X(CUT); c.strokeStyle = C.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(x, T); c.lineTo(x, B); c.stroke();
      const k = runs.filter(d => wide(d, CUT)).length; Lab.tag(c, (w < 520 ? '' : '20 гостей: ') + k + ' из ' + runs.length + ' за ±10 п. п.', x + 6, T + 14, C.trapInk); }
    Lab.tag(c, '±10 п. п.', w - R - 4, Y(10) - 4, C.ink2, 'right', Lab.FONT, null);
    cv.setAttribute('aria-label', runs.length + ' линий A/A: при 20 гостях за ±10 п. п. — ' + runs.filter(d => wide(d, CUT)).length + ', при 500 — ' + runs.filter(d => wide(d, NMAX)).length);
  }
  async function run(api){
    runs = Array.from({length: 100}, one); upto = 0;
    await Lab.anim(2200, t => { upto = Math.max(5, Math.round(5 * Math.exp(t * Math.log(NMAX / 5)))); draw(); });
    upto = NMAX; draw();
    const k = n => runs.filter(d => wide(d, n)).length;
    api.verdict(k(CUT) + ' из 100', 'При 100 гостях в группе — ' + k(100) + ', при 500 — ' + k(500));
  }
  Lab.game('aa-early-gap', {min: 0, max: 100, example: 5, run, draw,
    async x1000(api){
      let k20 = 0, k100 = 0, n = 0;
      for (let b = 0; b < 10; b++){ for (let i = 0; i < 100; i++){ const d = one(); if (wide(d, CUT)) k20++; if (wide(d, 100)) k100++; n++; } api.status('Прогнано ' + n + ' из 1000 тестов…'); await Lab.sleep(30); }
      api.status('Твой прогноз: <b>' + Lab.numT(api.guess) + ' из 100</b> · из 1000 тестов при 20 гостях: <b>' + k20 + '</b> (' + Lab.pct(k20 / 1000) + '), при 100 гостях: ' + k100);
    }});
})();
