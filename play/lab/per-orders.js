/* per-orders: жалобы и опоздания по 12 районам в штуках связаны (r = 0.85), потому что оба числа растут с числом заказов;
   на 1000 заказов связь исчезает (r = −0.03), а лидер по жалобам — Вокзальный — оказывается 9-м из 12.
   Данные учебные (/home/claude/ng/gB.py): [район, заказы, опоздания, жалобы]. */
(function(){
  const C = Lab.C;
  const D = [["Центр",1110,111,32],["Северный",5510,499,122],["Речной",1970,328,54],["Парковый",1190,183,41],["Южный",2310,318,59],["Заречье",700,91,20],["Вокзальный",5170,1026,124],["Садовый",3830,646,77],["Озёрный",930,180,24],["Лесной",2650,238,72],["Новый",790,104,11],["Старый город",2570,487,63]];
  const cv = document.getElementById('po-cv'); let k = 0;
  const cnt = D.map(([, o, d, c]) => [d, c]), rate = D.map(([, o, d, c]) => [d / o * 1000, c / o * 1000]);
  const rC = Lab.corr(cnt.map(p => p[0]), cnt.map(p => p[1])), rR = Lab.corr(rate.map(p => p[0]), rate.map(p => p[1]));
  const LEAD = D.findIndex(x => x[0] === 'Вокзальный');
  const rankRate = 1 + rate.filter(p => p[1] > rate[LEAD][1]).length;
  const AX = [{x: [0, 1100], y: [0, 140], xt: [0, 250, 500, 750, 1000], yt: [0, 50, 100], xl: 'опозданий', yl: 'жалоб'},
              {x: [0, 220], y: [0, 40], xt: [0, 50, 100, 150, 200], yt: [0, 20, 40], xl: 'опозданий на 1000 заказов', yl: 'жалоб на 1000 заказов'}];
  function draw(){
    const g = Lab.canvas(cv, 0.52, 0.95); if (!g) return; const {c, w, h} = g;
    const L = 40, R = 10, T = 24, B = h - 26, A = AX[k < 0.5 ? 0 : 1];
    const nx = (v, a) => (v - a.x[0]) / (a.x[1] - a.x[0]), ny = (v, a) => (v - a.y[0]) / (a.y[1] - a.y[0]);
    const PX = f => L + f * (w - L - R), PY = f => B - f * (B - T);
    Lab.gridY(c, v => PY(ny(v, A)), L, w - R, A.yt, v => Lab.num(v));
    Lab.ticksX(c, v => PX(nx(v, A)), h - 6, A.xt, v => Lab.num(v));
    Lab.text(c, A.yl, L, 12, C.ink2); Lab.text(c, A.xl, w - R, B - 6, C.ink2, 'right');
    D.forEach((d, i) => {
      const fx = Lab.lerp(nx(cnt[i][0], AX[0]), nx(rate[i][0], AX[1]), k), fy = Lab.lerp(ny(cnt[i][1], AX[0]), ny(rate[i][1], AX[1]), k);
      const r = 3 + 5 * Math.sqrt(d[1] / 5510);
      Lab.dot(c, PX(fx), PY(fy), r, i === LEAD ? C.accent : C.ctrl, '#fff', 1);
      if (i === LEAD) Lab.tag(c, 'Вокзальный', PX(fx) + (PX(fx) > w * 0.7 ? -10 : 10), PY(fy) + 4, C.trapInk, PX(fx) > w * 0.7 ? 'right' : 'left');
    });
    Lab.tag(c, 'r = ' + Lab.num(Lab.lerp(rC, rR, k), 2), L + 8, T + 12, C.ink, 'left', '500 15px Onest, system-ui, sans-serif');
    cv.setAttribute('aria-label', k < 0.5 ? '12 районов в штуках: чем больше опозданий, тем больше жалоб, r = 0.85' : 'На 1000 заказов связь пропала, r около 0; Вокзальный — 9-й по жалобам');
  }
  async function run(api){
    k = 0; draw(); await Lab.sleep(1000);
    await Lab.anim(1500, t => { k = Lab.ease(t); draw(); }); k = 1; draw();
    api.verdict(rankRate + '-е место', 'Связь жалоб с опозданиями: в штуках r = ' + Lab.num(rC, 2) + ', на 1000 заказов r = ' + Lab.num(rR, 2));
  }
  Lab.game('per-orders', {min: 1, max: 12, example: 3, fmt: v => Lab.numT(v) + '-е', run, draw});
})();
