/* ratings-fives: контроль — 5★ 50%, 4★ 10%, 3★ 10%, 2★ 10%, 1★ 20% (средняя 3.60, медиана 4.5);
   тест — 40%, 45%, 10%, 3%, 2% (средняя 4.18, медиана 4). Пятёрок меньше, средняя +16%, единиц и двоек втрое меньше. */
(function(){
  const C = Lab.C, A = [200, 100, 100, 100, 500], Bv = [20, 30, 100, 450, 400];
  const mean = a => a.reduce((s, n, i) => s + n * (i + 1), 0) / 1000;
  const cv = document.getElementById('rf-cv'); let k = 0;
  function panel(c, x0, x1, T, B, arr, col, name){
    const bw = (x1 - x0) / 5, Y = v => B - v / 600 * (B - T);
    Lab.text(c, name, x0, T - 8, C.ink, 'left', Lab.FONT14);
    arr.forEach((n, i) => { const v = n * k, x = x0 + i * bw; c.fillStyle = col; c.fillRect(x + bw * 0.15, Y(v), bw * 0.7, B - Y(v));
      Lab.text(c, Lab.pct(v / 1000), x + bw / 2, Y(v) - 5, C.ink2, 'center'); Lab.text(c, (i + 1) + '★', x + bw / 2, B + 16, C.ink2, 'center'); });
    if (k >= 1){ const m = mean(arr), xm = x0 + (m - 0.5) * bw; Lab.dot(c, xm, B + 30, 5, C.ink); Lab.text(c, 'средняя ' + Lab.num(m, 2), xm, B + 48, C.ink, 'center', Lab.FONT14); }
  }
  function draw(){
    const g = Lab.canvas(cv, 0.42, 1.25); if (!g) return; const {c, w, h, small} = g;
    if (small){ const ph = (h - 40) / 2; panel(c, 0, w, 24, 24 + ph - 70, A, C.ctrl, 'Контроль A'); panel(c, 0, w, 24 + ph + 24, h - 70, Bv, C.test, 'Тест B'); }
    else { panel(c, 0, w / 2 - 16, 24, h - 70, A, C.ctrl, 'Контроль A'); panel(c, w / 2 + 16, w, 24, h - 70, Bv, C.test, 'Тест B'); }
    cv.setAttribute('aria-label', 'Оценки: в контроле пятёрок 50%, средняя 3.60; в тесте пятёрок 40%, средняя 4.18');
  }
  async function run(api){
    k = 0; await Lab.anim(1300, t => { k = t; draw(); }); k = 1; draw();
    api.verdict('+16%', 'Средняя 3.60 → 4.18. Пятёрок 50% → 40%, а единиц и двоек 30% → 5%; медиана 4.5 → 4');
  }
  Lab.game('ratings-fives', {min: -100, max: 100, example: -10, fmt: v => Lab.signed(v, 1).replace(/\.0$/, '') + '%', run, draw});
})();
