/* peeking-two-panels: A/A, 30 дней по 1000 гостей в день в группу, 10%; p ниже 0.05 хоть раз — около 28 тестов из 100,
   на 30-й день — около 5; при взглядах раз в неделю — около 13. Разница и p — две панели с общей осью дней. */
(function(){
  const C = Lab.C, D = 30, G = 1000, P = 0.1;
  const cv = document.getElementById('ptp-cv');
  let runs = [], upto = 0, hl = -1;
  const one = () => { let a = 0, b = 0; const d = new Float32Array(D), p = new Float32Array(D); for (let i = 0; i < D; i++){ a += Lab.binom(G, P); b += Lab.binom(G, P); const n = G * (i + 1); d[i] = (b - a) / n * 100; p[i] = Lab.pZ(a, b, n); } return {d, p, hit: p.some(x => x < 0.05), last: p[D - 1] < 0.05, week: [6, 13, 20, 29].some(i => p[i] < 0.05)}; };
  function draw(){
    const g = Lab.canvas(cv, 0.62, 1.15); if (!g) return; const {c, w, h} = g;
    const L = 44, R = 8, gap = 30, ph = (h - 30 - gap) / 2, T1 = 8, B1 = T1 + ph, T2 = B1 + gap, B2 = T2 + ph;
    const X = i => L + i / (D - 1) * (w - L - R), Y1 = v => (T1 + B1) / 2 - v / 1.2 * (ph / 2), Y2 = v => B2 - v * ph;
    Lab.gridY(c, Y1, L, w - R, [-1, 0, 1], v => (v > 0 ? '+' : '') + Lab.num(v));
    c.fillStyle = C.fillB; c.fillRect(L, Y2(0.05), w - L - R, B2 - Y2(0.05));
    Lab.gridY(c, Y2, L, w - R, [0, 0.5, 1], v => Lab.numT(v, 2));
    Lab.tag(c, 'разница B − A, п. п.', L + 4, T1 + 12, C.ink2, 'left', Lab.FONT); Lab.text(c, 'p-value; полоса — ниже 0.05', L + 4, T2 - 8, C.ink2);
    Lab.ticksX(c, X, h - 6, [0, 6, 13, 20, 29], i => (i + 1) + ' д');
    const m = Math.min(upto, D);
    const path = (arr, Y, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); for (let i = 0; i < m; i++){ const y = Y(Math.max(-1.2, Math.min(1.2, arr[i]))); i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); } c.stroke(); };
    runs.forEach((r, j) => { if (j === hl) return; const col = r.hit ? 'rgba(201,65,58,.25)' : 'rgba(107,106,101,.18)'; path(r.d, Y1, col, 1); c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < m; i++){ const y = Y2(r.p[i]); i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); } c.stroke(); });
    if (hl >= 0){ const r = runs[hl]; path(r.d, Y1, C.ctrl, 2.2); c.strokeStyle = C.ctrl; c.lineWidth = 2.2; c.beginPath(); for (let i = 0; i < m; i++){ const y = Y2(r.p[i]); i ? c.lineTo(X(i), y) : c.moveTo(X(i), y); } c.stroke();
      const f = [...r.p].findIndex(x => x < 0.05); if (f >= 0 && f < m){ Lab.dot(c, X(f), Y2(r.p[f]), 5, C.trap, '#fff'); Lab.tag(c, 'день ' + (f + 1) + ': Боб выкатил', X(f) + (X(f) > w * 0.6 ? -8 : 8), Y2(r.p[f]) - 10, C.trapInk, X(f) > w * 0.6 ? 'right' : 'left'); } }
    const k = runs.filter(r => r.hit && r.p.slice(0, m).some(x => x < 0.05)).length;
    if (runs.length) Lab.tag(c, 'хоть раз ниже 0.05: ' + k + ' из ' + runs.length, w - R - 4, T2 + 14, C.trapInk, 'right');
    cv.setAttribute('aria-label', runs.length + ' A/A-тестов: p хоть раз ниже 0.05 у ' + runs.filter(r => r.hit).length + ', на 30-й день у ' + runs.filter(r => r.last).length);
  }
  async function run(api){
    runs = Array.from({length: 100}, one); hl = runs.findIndex(r => r.hit && r.p.findIndex(x => x < 0.05) > 3); upto = 0;
    await Lab.anim(2000, t => { upto = Math.max(1, Math.ceil(D * t)); draw(); });
    upto = D; draw();
    api.verdict(runs.filter(r => r.hit).length + ' из 100', 'На 30-й день ниже 0.05 только ' + runs.filter(r => r.last).length + ', раз в неделю — ' + runs.filter(r => r.week).length);
  }
  Lab.game('peeking-two-panels', {min: 0, max: 100, example: 5, run, draw,
    async x1000(api){
      let k = 0, l = 0, wk = 0, n = 0;
      for (let b = 0; b < 10; b++){ for (let i = 0; i < 100; i++){ const r = one(); k += r.hit; l += r.last; wk += r.week; n++; } api.status('Прожито ' + n + ' тестов из 1000…'); await Lab.sleep(20); }
      api.status('Твой прогноз: <b>' + Lab.numT(api.guess) + ' из 100</b> · из 1000 A/A хоть раз ниже 0.05: <b>' + k + '</b> (' + Lab.pct(k / n) + '), на 30-й день: ' + l + ', раз в неделю: ' + wk);
    }});
})();
