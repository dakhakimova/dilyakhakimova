/* half-month: ноябрь «упал на 38%», но в нём только 18 дней из 30; по тому же темпу — 9 667 заказов, +3.9% к октябрю. */
(function(){
  const C = Lab.C, M = ['июн', 'июл', 'авг', 'сен', 'окт', 'ноя'], V = [8900, 9100, 9000, 9200, 9300, 5800], FULL = 5800 / 18 * 30;
  const cv = document.getElementById('hm-cv'); let k = 0;
  function draw(){
    const g = Lab.canvas(cv, 0.42, 0.8); if (!g) return; const {c, w, h} = g;
    const L = 52, T = 22, B = h - 26, bw = (w - L) / 6, Y = v => B - v / 11000 * (B - T);
    Lab.gridY(c, Y, L, w, [0, 2500, 5000, 7500, 10000], v => Lab.num(v));
    V.forEach((v, i) => {
      const x = L + i * bw + bw * 0.18, ww = bw * 0.64;
      c.fillStyle = i === 5 ? C.test : C.ctrl; c.fillRect(x, Y(v), ww, B - Y(v));
      Lab.text(c, M[i], x + ww / 2, h - 6, C.ink2, 'center');
      if (i === 5){
        const top = Lab.lerp(v, FULL, k);
        if (k){ c.fillStyle = C.fillT; c.fillRect(x, Y(top), ww, Y(v) - Y(top)); c.strokeStyle = C.testInk; c.lineWidth = 1.5; c.setLineDash([5, 4]); c.strokeRect(x + 0.75, Y(top) + 0.75, ww - 1.5, Y(v) - Y(top) - 1.5); c.setLineDash([]); }
        Lab.tag(c, k ? Lab.num(Math.round(top)) : '18 дней из 30', x + ww / 2, Y(k ? top : v) - 6, C.testInk, 'center', Lab.FONT14, null);
      } else if (i === 4) Lab.text(c, '9300', x + ww / 2, Y(v) - 6, C.ink, 'center', Lab.FONT14);
    });
    cv.setAttribute('aria-label', 'Заказы по месяцам: октябрь 9300, ноябрь 5800 за 18 дней' + (k ? ', по тому же темпу за 30 дней около 9667' : ''));
  }
  async function run(api){
    k = 0; draw(); await Lab.sleep(800);
    await Lab.anim(1400, t => { k = t; draw(); });
    api.verdict('+3.9%', '5800 заказов за 18 дней — это 322 в день, за 30 дней около 9667');
  }
  Lab.game('half-month', {min: -100, max: 200, example: -20, fmt: v => Lab.signed(v, 1).replace(/\.0$/, '') + '%', run, draw});
})();
