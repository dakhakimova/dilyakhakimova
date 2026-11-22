/* running-share-fan: 95% веер доли орлов — ±1.96 · 50% / √n: на 100 бросках ±9.8%, на 400 — ±4.9%, на 1000 — ±3.1%.
   Чтобы веер стал вдвое уже, бросков нужно вчетверо больше. */
(function(){
  const C = Lab.C, N = 1000, S = 50;
  const half = n => 1.959964 * 50 / Math.sqrt(n);
  const cv = document.getElementById('rsf-cv');
  let runs = [], upto = 0;
  const one = () => { const d = new Float32Array(N); let k = 0; for (let n = 1; n <= N; n++){ if (Lab.rand() < 0.5) k++; d[n - 1] = k / n * 100; } return d; };
  function draw(){
    const g = Lab.canvas(cv, 0.46, 0.5); if (!g) return; const {c, w, h} = g;
    const L = 40, R = 8, T = 12, B = h - 26, X = n => L + Math.log(n / 10) / Math.log(N / 10) * (w - L - R), Y = v => B - v / 100 * (B - T);
    const m = Math.min(upto, N);
    c.fillStyle = C.fillGray; c.beginPath();
    for (let n = 10; n <= N; n += n < 50 ? 1 : 5) c.lineTo(X(n), Y(50 + half(n))); for (let n = N; n >= 10; n -= n <= 50 ? 1 : 5) c.lineTo(X(n), Y(50 - half(n))); c.closePath(); c.fill();
    Lab.gridY(c, Y, L, w - R, [0, 25, 50, 75, 100], v => v + '%');
    Lab.ticksX(c, X, h - 6, [10, 100, 400, 1000], n => Lab.num(n));
    Lab.text(c, 'бросков →', w - R, B - 6, C.ink2, 'right');
    runs.forEach((d, j) => { c.strokeStyle = j ? 'rgba(107,106,101,.28)' : C.ctrl; c.lineWidth = j ? 1 : 2; c.beginPath(); for (let n = 10; n <= m; n++){ const y = Y(d[n - 1]); n === 10 ? c.moveTo(X(n), y) : c.lineTo(X(n), y); } c.stroke(); });
    [100, 400].forEach(n => { if (m < n) return; const x = X(n); c.strokeStyle = C.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(x, Y(50 + half(n))); c.lineTo(x, Y(50 - half(n))); c.stroke();
      Lab.tag(c, '±' + Lab.num(half(n), 1) + '%', n === 400 ? x - 6 : x + 6, Y(50 - half(n)) + 18, C.trapInk, n === 400 ? 'right' : 'left'); });
    cv.setAttribute('aria-label', '50 серий доли орлов; веер на 100 бросках ±9.8%, на 400 — ±4.9%');
  }
  async function run(api){
    runs = Array.from({length: S}, one); upto = 0;
    await Lab.anim(2200, t => { upto = Math.max(10, Math.round(10 * Math.exp(t * Math.log(N / 10)))); draw(); });
    upto = N; draw();
    const at = runs.map(d => d[399]).sort((a, b) => a - b), out = at.filter(v => Math.abs(v - 50) > half(400)).length;
    api.verdict('±4.9%', 'У этих 50 серий на 400 бросках — от ' + Lab.num(at[0], 1) + '% до ' + Lab.num(at[S - 1], 1) + '%, за веером ' + out + ' из 50');
  }
  Lab.game('running-share-fan', {min: 0, max: 50, example: 5, fmt: v => '±' + Lab.numT(v, 1) + '%', run, draw});
})();
