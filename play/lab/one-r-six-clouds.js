/* one-r-six-clouds: r = 0.6 по 20 кафе держится на одном кафе; без него r = 0.00. И ещё пять облаков с тем же r = 0.6.
   Наборы точек посчитаны заранее (/home/claude/ng/g2.py): у каждого r = 0.60 после округления до сотых. */
(function(){
  const C = Lab.C;
  const SETS = {"cloud":[[60.0,28.3],[81.8,63.8],[72.1,42.0],[28.0,60.2],[34.0,59.5],[79.9,64.3],[10.4,3.5],[75.7,56.6],[73.8,65.4],[47.4,62.0],[34.2,27.8],[32.3,47.2],[30.4,37.3],[45.6,44.2],[50.4,80.5],[54.3,46.3],[89.6,69.6],[73.4,82.8],[59.8,51.9],[89.1,67.9]],"outlier":[[40.8,34.7],[27.8,42.9],[39.7,37.9],[32.4,23.4],[36.0,31.6],[13.2,36.9],[28.9,34.1],[27.8,24.0],[40.5,47.6],[22.6,30.9],[30.9,42.4],[12.1,39.6],[23.6,53.5],[21.3,47.3],[15.3,32.0],[38.6,44.4],[23.3,56.1],[44.3,43.3],[30.6,39.0],[90.0,79.8]],"clusters":[[23.5,18.5],[34.1,23.1],[22.4,28.8],[23.2,24.6],[27.1,35.8],[24.3,50.5],[23.8,25.6],[18.3,23.4],[24.9,34.6],[22.3,35.1],[77.0,41.6],[73.9,41.0],[69.9,47.7],[74.0,46.8],[68.0,33.6],[76.3,42.3],[70.0,42.4],[73.5,34.1],[62.3,43.2],[72.1,35.5]],"arc":[[10.0,46.4],[14.2,52.9],[18.4,58.7],[22.6,64.0],[26.8,68.7],[31.1,72.8],[35.3,76.3],[39.5,79.2],[43.7,81.5],[47.9,83.3],[52.1,84.4],[56.3,84.9],[60.5,84.9],[64.7,84.3],[68.9,83.0],[73.2,81.2],[77.4,78.8],[81.6,75.8],[85.8,72.2],[90.0,68.1]],"fan":[[11.1,33.1],[24.4,33.7],[25.9,42.1],[28.1,36.1],[31.7,39.3],[37.2,36.6],[37.7,37.7],[39.1,34.1],[45.6,52.4],[51.0,44.1],[51.2,53.0],[51.7,45.6],[55.9,40.8],[60.3,45.1],[68.1,44.6],[73.4,52.1],[75.2,48.2],[85.8,51.8],[86.2,37.6],[88.4,45.6]],"line":[[10.0,36.0],[14.2,38.5],[18.4,41.1],[22.6,43.6],[26.8,46.1],[31.1,48.6],[35.3,51.2],[39.5,53.7],[43.7,56.2],[47.9,58.7],[52.1,61.3],[56.3,63.8],[60.5,66.3],[64.7,68.8],[68.9,71.4],[73.2,73.9],[77.4,76.4],[81.6,78.9],[85.8,81.5],[90.0,21.7]]};
  const NAMES = {cloud: 'облако', outlier: 'одно кафе-выброс', clusters: 'две кучки', arc: 'дуга', fan: 'веер', line: 'линия и один выброс'};
  const ORDER = ['cloud', 'outlier', 'clusters', 'arc', 'fan', 'line'];
  const main = SETS.outlier, cv = document.getElementById('orc-cv'), six = document.getElementById('orc-six');
  let fade = 0, sixOn = 0;
  const fit = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const b = Lab.slope(xs, ys); return {b, a: Lab.mean(ys) - b * Lab.mean(xs), r: Lab.corr(xs, ys)}; };
  const rr = r => Lab.num(Math.abs(r) < 0.005 ? 0 : r, 2);
  function draw(){
    const g = Lab.canvas(cv, 0.5, 0.9); if (!g) return; const {c, w, h} = g;
    const L = 38, B = h - 28, T = 22, R = 8, X = v => L + v / 100 * (w - L - R), Y = v => B - v / 100 * (B - T);
    Lab.gridY(c, Y, L, w - R, [0, 25, 50, 75, 100], v => Lab.num(v * 10));
    Lab.ticksX(c, X, h - 8, [0, 25, 50, 75, 100], v => Lab.num(v * 100));
    Lab.text(c, 'заказов', L, 12, C.ink2); Lab.text(c, 'листовок', w - R, B - 6, C.ink2, 'right');
    const pts = fade < 1 ? main : main.slice(0, -1), f0 = fit(main), f1 = fit(main.slice(0, -1));
    const a = Lab.lerp(f0.a, f1.a, fade), b = Lab.lerp(f0.b, f1.b, fade), r = Lab.lerp(f0.r, f1.r, fade);
    Lab.line(c, [[X(5), Y(a + b * 5)], [X(95), Y(a + b * 95)]], C.gray, 2, [6, 4]);
    main.forEach((p, i) => { const last = i === main.length - 1; c.globalAlpha = last ? 1 - 0.85 * fade : 1; Lab.dot(c, X(p[0]), Y(p[1]), last ? 6 : 4.5, last ? C.accent : C.ctrl, '#fff', 1); c.globalAlpha = 1; });
    const o = main[main.length - 1];
    Lab.tag(c, fade < 1 ? 'кафе у вокзала' : 'кафе у вокзала убрано', X(o[0]) - 10, Y(o[1]) + 4, fade < 1 ? C.trapInk : C.ink2, 'right');
    Lab.tag(c, 'r = ' + rr(r), L + 8, T + 14, C.ink, 'left', '500 15px Onest, system-ui, sans-serif');
    cv.setAttribute('aria-label', '20 кафе: r = ' + rr(r) + (fade >= 1 ? ' без кафе у вокзала' : ', кафе у вокзала далеко справа вверху'));
  }
  function drawSix(){
    const small = six.clientWidth < 520, cols = small ? 2 : 3, rows = 6 / cols;
    const g = Lab.canvas(six, 0.62, 1.55); if (!g) return; const {c, w, h} = g;
    const pw = w / cols, ph = h / rows, pad = 10;
    ORDER.forEach((k, i) => {
      if (i >= sixOn) return;
      const x0 = (i % cols) * pw + pad, y0 = Math.floor(i / cols) * ph + 24, cw = pw - 2 * pad, ch = ph - 36;
      c.strokeStyle = C.grid; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y0 + 0.5, cw - 1, ch - 1);
      Lab.text(c, NAMES[k], x0, y0 - 8, C.ink, 'left', Lab.FONT14);
      const xs = SETS[k].map(p => p[0]), ys = SETS[k].map(p => p[1]), ylo = Math.min(...ys) - 5, yhi = Math.max(...ys) + 5;
      SETS[k].forEach(([x, y]) => Lab.dot(c, x0 + 4 + (x / 100) * (cw - 8), y0 + ch - 4 - (y - ylo) / (yhi - ylo) * (ch - 8), small ? 2.5 : 3, k === 'outlier' ? C.ctrl : C.gray));
      Lab.tag(c, 'r = ' + rr(Lab.corr(xs, ys)), x0 + 6, y0 + 16, C.ink2, 'left', Lab.FONT);
    });
    six.setAttribute('aria-label', 'Облако, одно кафе-выброс, две кучки, дуга, веер, линия с выбросом — у всех r = 0.6');
  }
  async function run(api){
    fade = 0; sixOn = 0; drawSix(); draw();
    await Lab.sleep(700);
    await Lab.anim(900, t => { fade = Lab.ease(t); draw(); });
    fade = 1; draw();
    for (let i = 1; i <= 6; i++){ sixOn = i; drawSix(); await Lab.sleep(250); }
    api.verdict('1 кафе', 'Без кафе у вокзала r = ' + rr(fit(main.slice(0, -1)).r));
  }
  Lab.game('one-r-six-clouds', {min: 0, max: 20, example: 5, fmt: v => Lab.numT(v) + ' кафе', run, draw: () => { draw(); drawSix(); }});
})();
