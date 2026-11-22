/* worst-cafes-slope: 20 кафе (обычный уровень N(10, 1) заказа на 100 гостей, 800 гостей в неделю), пустое промо пяти худшим.
   Во второй неделе худшие в среднем поднимаются на 4 места (по 1000 сетей ≈ 4.2), лучшие — опускаются: регрессия к среднему. */
(function(){
  const C = Lab.C, K = 20, G = 800;
  const cv = document.getElementById('wcs-cv');
  let net = null, k = 0;
  const rankOf = v => { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(v.length); idx.forEach(([, i], j) => { r[i] = j + 1; }); return r; };
  const make = () => {
    const mu = Array.from({length: K}, () => Math.max(7, Math.min(13, 10 + Lab.gauss())));
    const w1 = mu.map(m => Lab.binom(G, m / 100) / G * 100), w2 = mu.map(m => Lab.binom(G, m / 100) / G * 100);
    const r1 = rankOf(w1), r2 = rankOf(w2), worst = r1.map((r, i) => [r, i]).filter(([r]) => r <= 5).map(x => x[1]), best = r1.map((r, i) => [r, i]).filter(([r]) => r > K - 5).map(x => x[1]);
    return {w1, w2, r1, r2, worst, best, gain: Lab.mean(worst.map(i => r1[i] - r2[i])) * -1, dW: Lab.mean(worst.map(i => w2[i] - w1[i])), dB: Lab.mean(best.map(i => w2[i] - w1[i]))};
  };
  function draw(){
    if (!net) return; const g = Lab.canvas(cv, 0.5, 1.0); if (!g) return; const {c, w, h} = g;
    const L = 40, T = 26, B = h - 14, x1 = L + (w - L) * 0.18, x2 = L + (w - L) * 0.82, Y = v => B - (v - 6) / 9 * (B - T);
    Lab.gridY(c, Y, L, w, [6, 8, 10, 12, 14], v => Lab.num(v));
    Lab.text(c, 'неделя 1', x1, 14, C.ink, 'center', Lab.FONT14); Lab.text(c, 'неделя 2', x2, 14, C.ink, 'center', Lab.FONT14);
    const order = [...Array(K).keys()].sort((a, b) => (net.worst.includes(a) || net.best.includes(a)) - (net.worst.includes(b) || net.best.includes(b)));
    order.forEach(i => {
      const col = net.worst.includes(i) ? C.test : net.best.includes(i) ? C.ctrl : '#CFCBC2', lw = col === '#CFCBC2' ? 1.2 : 2.2;
      const ya = Y(net.w1[i]), yb = Y(Lab.lerp(net.w1[i], net.w2[i], k)), xb = Lab.lerp(x1, x2, k);
      Lab.line(c, [[x1, ya], [xb, yb]], col, lw); Lab.dot(c, x1, ya, 3.5, col); if (k > 0) Lab.dot(c, xb, yb, 3.5, col);
    });
    cv.setAttribute('aria-label', 'Пять худших кафе первой недели во второй в среднем ' + (net.dW >= 0 ? 'выросли' : 'упали') + ' на ' + Lab.num(Math.abs(net.dW), 1) + ' заказа на 100 гостей, пять лучших изменились на ' + Lab.num(net.dB, 1));
  }
  async function run(api){
    net = make(); k = 0; draw(); await Lab.sleep(600);
    await Lab.anim(1300, t => { k = Lab.ease(t); draw(); });
    api.verdict('на ' + Lab.numT(net.gain, 1) + ' ' + Lab.plural(Math.round(net.gain), 'место', 'места', 'мест'),
      'Худшие в среднем ' + Lab.signed(net.dW, 1) + ' заказа на 100 гостей, лучшие без промо ' + Lab.signed(net.dB, 1));
  }
  Lab.game('worst-cafes-slope', {min: -20, max: 20, example: 2, fmt: v => 'на ' + Lab.numT(v, 1), run, draw,
    async x1000(api){
      let s = 0, n = 0;
      for (let b = 0; b < 10; b++){ for (let i = 0; i < 100; i++){ s += make().gain; n++; } api.status('Прожито ' + n + ' сетей из 1000…'); await Lab.sleep(20); }
      api.status('Твой прогноз: <b>на ' + Lab.numT(api.guess, 1) + '</b> · по 1000 сетей худшие поднимаются в среднем на <b>' + Lab.num(s / n, 1) + ' места</b>, хотя промо пустое');
    }});
})();
