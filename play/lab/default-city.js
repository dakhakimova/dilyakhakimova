/* default-city: 120 заказов без распознанного адреса приложение пишет в Центр (район по умолчанию) — Центр «лидер» с 215,
   а без них у него 95 и 6-е место из 8. Значение по умолчанию — тоже данные, и оно копится в одной клетке. */
(function(){
  const C = Lab.C, NOADDR = 120;
  const D = [['Центр', 95], ['Северный', 160], ['Речной', 150], ['Парковый', 130], ['Южный', 120], ['Заречье', 100], ['Вокзальный', 80], ['Окраина', 45]];
  const cv = document.getElementById('dc-cv'); let k = 0;
  const ranks = extra => { const v = D.map(([, n], i) => n + (i === 0 ? extra : 0)); return v.map(x => 1 + v.filter(y => y > x).length); };
  function draw(){
    const g = Lab.canvas(cv, 0.42, 0.95); if (!g) return; const {c, w, h, small} = g;
    const L = small ? 86 : 110, R = 64, T = 4, rh = (h - T - 4) / D.length, X = v => L + v / 230 * (w - L - R);
    const extra = NOADDR * (1 - k), rk = ranks(k < 1 ? NOADDR : 0);
    D.forEach(([name, n], i) => {
      const y = T + i * rh, bh = rh * 0.6, top = y + (rh - bh) / 2;
      Lab.text(c, name, 0, top + bh / 2 + 5, i === 0 ? C.ink : C.ink2, 'left', Lab.FONT14);
      c.fillStyle = C.ctrl; c.fillRect(L, top, X(n) - L, bh);
      if (i === 0 && extra > 0.5){ c.globalAlpha = Math.max(0.15, 1 - k); c.fillStyle = C.gray; c.fillRect(X(n), top, X(n + extra) - X(n), bh); c.globalAlpha = 1; }
      Lab.text(c, Lab.num(n + (i === 0 ? extra : 0)), X(n + (i === 0 ? extra : 0)) + 6, top + bh / 2 + 5, C.ink, 'left', Lab.FONT14);
      Lab.text(c, rk[i] + '-е', w - 4, top + bh / 2 + 5, i === 0 ? C.trapInk : C.ink2, 'right', Lab.FONT14);
    });
    cv.setAttribute('aria-label', 'Центр: ' + (k < 1 ? '215 заказов с нераспознанными адресами, 1-е место' : '95 заказов, 6-е место из 8'));
  }
  async function run(api){
    k = 0; draw(); await Lab.sleep(900);
    await Lab.anim(1300, t => { k = Lab.ease(t); draw(); }); k = 1; draw();
    api.verdict('6-е место', '120 заказов из 1000 приложение записало в Центр, потому что не распознало адрес');
  }
  Lab.game('default-city', {min: 1, max: 8, example: 2, fmt: v => Lab.numT(v) + '-е', run, draw});
})();
