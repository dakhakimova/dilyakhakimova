/* real-check: чек 420 → 610 ₽ (+45%) за 2019–2024, цены меню ×1.41; в ценах 2019 года — 432.6 ₽, +3%. */
(function(){
  const C = Lab.C, YEARS = [2019, 2020, 2021, 2022, 2023, 2024], NOM = [420, 445, 490, 540, 580, 610], IDX = [100, 105, 115, 126, 134, 141];
  const REAL = NOM.map((v, i) => v / IDX[i] * 100);
  const cv = document.getElementById('rch-cv'); let k = 0;
  function draw(){
    const g = Lab.canvas(cv, 0.45, 0.8); if (!g) return; const {c, w, h, small} = g;
    const L = 44, R = small ? 74 : 150, T = 16, B = h - 26, X = i => L + i / 5 * (w - L - R), Y = v => B - v / 700 * (B - T);
    Lab.gridY(c, Y, L, w - R + 10, [0, 200, 400, 600], v => Lab.num(v) + ' ₽');
    Lab.ticksX(c, X, h - 6, [0, 1, 2, 3, 4, 5], i => String(YEARS[i]));
    Lab.line(c, NOM.map((v, i) => [X(i), Y(v)]), k ? C.gray : C.ctrl, 2.5);
    NOM.forEach((v, i) => Lab.dot(c, X(i), Y(v), 3.5, k ? C.gray : C.ctrl));
    Lab.text(c, '610 ₽', X(5) + 8, Y(610) + 4, k ? C.ink2 : C.pen, 'left', Lab.FONT14);
    if (!small) Lab.text(c, 'в рублях того года', X(5) + 8, Y(610) + 20, C.ink2);
    if (k){
      const pts = REAL.map((v, i) => [X(i), Y(Lab.lerp(NOM[i], v, k))]);
      Lab.line(c, pts, C.ctrl, 2.5); pts.forEach(([x, y]) => Lab.dot(c, x, y, 3.5, C.ctrl));
      Lab.text(c, Lab.num(Lab.lerp(610, REAL[5], k)) + ' ₽', X(5) + 8, pts[5][1] + 4, C.pen, 'left', Lab.FONT14);
      if (!small) Lab.text(c, 'в ценах 2019 года', X(5) + 8, pts[5][1] + 20, C.ink2);
    }
    cv.setAttribute('aria-label', 'Средний чек: в рублях того года 420 → 610 ₽' + (k ? ', в ценах 2019 года 420 → 433 ₽, +3%' : ''));
  }
  async function run(api){
    k = 0; draw(); await Lab.sleep(700);
    await Lab.anim(1400, t => { k = Lab.ease(t); draw(); });
    api.verdict('+3%', 'В рублях каждого года +45%, но почти весь рост — цены');
  }
  Lab.game('real-check', {min: -100, max: 1000, example: 20, fmt: v => Lab.signed(v, 1).replace(/\.0$/, '') + '%', run, draw});
})();
