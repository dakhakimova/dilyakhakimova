/* eco-fallacy: по кафе «десерт → возвраты» сильная связь (+0.93 п. п. на п. п.), внутри районов её нет, а у гостя десерт
   даже снижает шанс вернуться на 2 п. п. Связь кафе даёт район: в спальных и десертов, и возвратов больше.
   Учебный пример посчитан заранее (/home/claude/ng/gD.py). */
(function(){
  const C = Lab.C;
  const CAFES = [["спальные",45.1,63.8],["спальные",49.9,60.0],["спальные",43.8,60.1],["спальные",47.3,60.9],["спальные",48.0,57.3],["спальные",51.3,60.8],["спальные",47.7,60.8],["спальные",43.5,62.1],["спальные",48.3,60.6],["спальные",44.4,62.5],["центр",26.5,41.4],["центр",31.6,43.0],["центр",22.3,42.9],["центр",28.1,42.1],["центр",24.0,44.6],["центр",33.6,43.9],["центр",27.0,45.2],["центр",32.9,43.7],["центр",32.2,46.4],["центр",29.2,42.8],["деловые",16.4,30.2],["деловые",19.4,27.0],["деловые",12.4,28.1],["деловые",8.1,30.1],["деловые",17.1,28.2],["деловые",20.5,31.2],["деловые",17.5,30.5],["деловые",18.8,27.0],["деловые",17.5,30.9],["деловые",7.9,30.5]];
  const GUESTS = [["спальные",59.8,61.9],["центр",42.2,44.2],["деловые",27.6,29.7]];
  // цвета (Д14): коралл — только событие «с десертом» на графике гостей; районы различаются нейтральными тонами и подписями,
  // линии внутри районов — синие (норма), третьего цвета нет
  const DIST = ['спальные', 'центр', 'деловые'], TONES = [C.ink, '#6B6A65', '#8C8A83'];
  const cv = document.getElementById('eco-cv'), gv = document.getElementById('eco-g');
  let stage = 0, k = 0;
  const xs = CAFES.map(c => c[1]), ys = CAFES.map(c => c[2]);
  const ALL = {b: Lab.slope(xs, ys)}; ALL.a = Lab.mean(ys) - ALL.b * Lab.mean(xs);
  const sg = n => (n > 0 ? '+' : '') + Lab.num(n, 2).replace('-', '−');
  function draw(){
    const g = Lab.canvas(cv, 0.5, 0.95); if (!g) return; const {c, w, h} = g;
    const L = 40, B = h - 28, T = 24, R = 10, X = v => L + (v - 5) / 55 * (w - L - R), Y = v => B - (v - 20) / 50 * (B - T);
    Lab.gridY(c, Y, L, w - R, [20, 30, 40, 50, 60, 70], v => v + '%');
    Lab.ticksX(c, X, h - 8, [10, 20, 30, 40, 50, 60], v => v + '%');
    Lab.text(c, 'вернулись', L, 12, C.ink2); Lab.text(c, 'чеков с десертом', w - R, B - 6, C.ink2, 'right');
    if (stage >= 1){ c.globalAlpha = stage === 1 ? 1 : 1 - 0.7 * k; Lab.line(c, [[X(8), Y(ALL.a + ALL.b * 8)], [X(55), Y(ALL.a + ALL.b * 55)]], C.ink, 2, [6, 4]); c.globalAlpha = 1;
      if (stage === 1){ const t = 'все кафе: ' + sg(ALL.b) + ' п. п. возвратов на 1 п. п. десертов';   // на телефоне — в две строки
        if (g.small){ Lab.tag(c, t.replace(/ на 1 .*$/, ''), L + 6, T + 10, C.ink); Lab.tag(c, t.replace(/^.* (на 1 )/, '$1'), L + 6, T + 28, C.ink); }
        else Lab.tag(c, t, L + 6, T + 10, C.ink); } }
    CAFES.forEach(([d, x, y]) => { const i = DIST.indexOf(d); Lab.dot(c, X(x), Y(y), 4.5, stage >= 2 ? TONES[i] : C.gray, '#fff', 1); });
    if (stage >= 2) DIST.forEach((d, i) => {
      const p = CAFES.filter(q => q[0] === d), px = p.map(q => q[1]), py = p.map(q => q[2]), b = Lab.slope(px, py), a = Lab.mean(py) - b * Lab.mean(px);
      const x0 = Math.min(...px) - 2, x1 = Math.max(...px) + 2; c.globalAlpha = k; Lab.line(c, [[X(x0), Y(a + b * x0)], [X(x1), Y(a + b * x1)]], C.pen, 2.5);
      Lab.tag(c, d + ': ' + sg(b), X(x1), Y(a + b * x1) + 22, C.ink, 'right'); c.globalAlpha = 1; });
    cv.setAttribute('aria-label', stage >= 2 ? 'Внутри районов связь десерта и возвратов почти нулевая, общий наклон даёт разница районов' : 'Все 30 кафе: чем больше десертов, тем больше возвратов');
  }
  function drawG(){
    const gt = document.getElementById('eco-t1'); if (stage < 3){ gv.hidden = true; gt.hidden = true; return; } gv.hidden = false; gt.hidden = false;
    const g = Lab.canvas(gv, 0.32, 0.7); if (!g) return; const {c, w, h} = g;
    const L = 40, B = h - 24, T = 18, Y = v => B - v / 70 * (B - T), gw = (w - L) / 3;
    c.strokeStyle = Lab.C.ink2; c.lineWidth = 1; c.beginPath(); c.moveTo(L, B + 0.5); c.lineTo(w, B + 0.5); c.stroke();
    GUESTS.forEach(([d, wD, w0], i) => {
      const x = L + i * gw + gw * 0.12, bw = gw * 0.34;
      [[w0, C.gray, 'без'], [wD, C.test, 'с десертом']].forEach(([v, col, lab], j) => {
        const vv = v * Math.min(1, k * 1.2); c.fillStyle = col; c.fillRect(x + j * (bw + 4), Y(vv), bw, B - Y(vv));
        Lab.text(c, Lab.num(v, 1) + (bw > 46 ? '%' : ''), x + j * (bw + 4) + bw / 2, Y(vv) - 4, C.ink, 'center'); });
      Lab.text(c, d, x + bw + 2, h - 2, C.ink, 'center', Lab.FONT14);
    });
    gv.setAttribute('aria-label', 'В каждом районе гости с десертом возвращаются на 2 п. п. реже: ' + GUESTS.map(g => g[0] + ' ' + Lab.num(g[1], 1) + '% против ' + Lab.num(g[2], 1) + '%').join('; '));
  }
  async function run(api){
    stage = 1; k = 0; drawG(); draw(); await Lab.sleep(1100);
    stage = 2; await Lab.anim(800, t => { k = t; draw(); }); await Lab.sleep(900);
    stage = 3; k = 0; await Lab.anim(700, t => { k = t; drawG(); });
    api.verdict('−2 п. п.', 'По кафе связь +0.93 п. п. на каждый п. п. десертов, внутри районов — около нуля');
  }
  Lab.game('eco-fallacy', {min: -100, max: 100, example: 10, fmt: v => Lab.signed(v, 1).replace(/\.0$/, '') + ' п. п.', run, draw: () => { draw(); drawG(); }});
})();
