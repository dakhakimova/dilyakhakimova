/* random-clumps: 100 случайных заказов по 100 кварталам — пустых остаётся около 37 (100 · 0.99^100 = 36.6). */
(function(){
  const C = Lab.C, N = 100, K = 10;
  let drops = [], shown = 0, hist = null, last = null;
  const cv = document.getElementById('rc-cv'), title = document.getElementById('rc-t0');
  const counts = () => { const a = new Array(N).fill(0); drops.slice(0, shown).forEach(d => a[d.cell]++); return a; };
  function grid(c, x0, y0, s, cnt, dots){
    const cs = s / K;
    for (let i = 0; i < N; i++){
      const cx = x0 + (i % K) * cs, cy = y0 + Math.floor(i / K) * cs;
      c.fillStyle = cnt[i] === 0 && shown === N ? C.fillB : '#fff'; c.fillRect(cx, cy, cs, cs);
      c.strokeStyle = C.grid; c.lineWidth = 1; c.strokeRect(cx + 0.5, cy + 0.5, cs - 1, cs - 1);
    }
    dots.forEach(d => Lab.dot(c, x0 + ((d.cell % K) + d.u) * cs, y0 + (Math.floor(d.cell / K) + d.v) * cs, Math.max(2, cs * 0.12), C.ctrl));
  }
  function draw(){
    if (hist){ return drawHist(); }
    const g = Lab.canvas(cv, 0.46, 1.9); if (!g) return; const {c, w, h, small} = g;
    const s = small ? Math.min(w, h / 2 - 34) : Math.min((w - 40) / 2, h - 34);
    const pos = small ? [[(w - s) / 2, 22], [(w - s) / 2, s + 60]] : [[0, 22], [w - s, 22]];
    const cnt = counts();
    Lab.text(c, 'Случайно' + (shown === N ? ': пустых ' + cnt.filter(x => !x).length : ''), pos[0][0], 14, C.ink, 'left', Lab.FONT14);
    grid(c, pos[0][0], pos[0][1], s, cnt, drops.slice(0, shown));
    Lab.text(c, 'Ровно по одному: пустых 0', pos[1][0], pos[1][1] - 8, C.ink, 'left', Lab.FONT14);
    const even = []; for (let i = 0; i < N; i++) even.push({cell: i, u: 0.3 + 0.4 * ((i * 37 % 10) / 10), v: 0.3 + 0.4 * ((i * 53 % 10) / 10)});
    const keep = shown; shown = N; grid(c, pos[1][0], pos[1][1], s, new Array(N).fill(1), even); shown = keep;
    cv.setAttribute('aria-label', 'Случайные заказы: ' + (shown === N ? 'пустых кварталов ' + cnt.filter(x => !x).length + ' из 100' : 'падают') + '; ровная сетка: пустых нет');
  }
  function drawHist(){
    const g = Lab.canvas(cv, 0.42, 0.8); if (!g) return; const {c, w, h} = g;
    const L = 34, B = h - 28, T = 24, lo = 20, hi = 56, bw = (w - L - 6) / (hi - lo), X = v => L + (v - lo) * bw;
    const top = Math.max(...hist) || 1, ymax = Math.ceil(top / 20) * 20, Y = v => B - (B - T) * v / ymax;
    Lab.gridY(c, Y, L, w, [0, ymax / 2, ymax], v => Lab.num(v));
    for (let v = lo; v < hi; v++){ const k = hist[v] || 0; if (!k) continue; c.fillStyle = Math.abs(v - 37) < 0.5 ? C.test : C.ctrl; c.fillRect(X(v) + 1, Y(k), bw - 2, B - Y(k)); }
    Lab.ticksX(c, v => X(v) + bw / 2, h - 8, [20, 25, 30, 35, 40, 45, 50, 55], v => String(v));
    const gx = Math.max(lo, Math.min(hi, last.guess));
    c.strokeStyle = C.ink; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(X(gx) + bw / 2, T - 6); c.lineTo(X(gx) + bw / 2, B); c.stroke(); c.setLineDash([]);
    Lab.tag(c, 'твой прогноз' + (last.guess < lo || last.guess > hi ? ' (' + Lab.numT(last.guess) + ', за краем)' : ''), Math.min(w - 4, Math.max(4, X(gx) + bw / 2)), T - 10, C.ink, X(gx) > w / 2 ? 'right' : 'left');
    cv.setAttribute('aria-label', '1000 вечеров: в среднем пустых кварталов ' + Lab.numT(last.mean, 1) + ' из 100');
  }
  async function evening(api){
    hist = null; title.textContent = 'Слева — 100 случайных заказов, справа — «ровный» район: в каждом квартале по одному';
    drops = Array.from({length: N}, () => ({cell: Lab.int(N), u: 0.2 + 0.6 * Lab.rand(), v: 0.2 + 0.6 * Lab.rand()})); shown = 0;
    await Lab.anim(1400, t => { shown = Math.round(N * t); draw(); });
    shown = N; draw();
    const empty = counts().filter(x => !x).length, three = counts().filter(x => x >= 3).length;
    api.verdict(empty + ' из 100', 'Кварталов с тремя заказами и больше: ' + three);
  }
  Lab.game('random-clumps', {min: 0, max: 100, example: 20, run: evening, again: evening,
    async x1000(api){
      title.textContent = '1000 вечеров по 100 заказов: сколько кварталов остались пустыми';
      hist = []; let sum = 0; last = {guess: api.guess, mean: 0};
      for (let b = 0; b < 10; b++){
        for (let r = 0; r < 100; r++){ const a = new Uint8Array(N); for (let i = 0; i < N; i++) a[Lab.int(N)] = 1; let e = 0; for (let i = 0; i < N; i++) if (!a[i]) e++; hist[e] = (hist[e] || 0) + 1; sum += e; }
        last.mean = sum / ((b + 1) * 100); drawHist();
        api.status('Прогнано ' + (b + 1) * 100 + ' из 1000 вечеров…'); await Lab.sleep(60);
      }
      api.status('Твой прогноз: <b>' + Lab.numT(api.guess) + '</b> · в среднем за 1000 вечеров пустых: <b>' + Lab.numT(last.mean, 1) + ' из 100</b>');
    },
    draw});
})();
