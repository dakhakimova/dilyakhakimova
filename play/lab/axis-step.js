/* axis-step: 12 недельных замеров и 10 месячных через равные промежутки рисуют «ускорение в 4 раза»;
   по датам это одна прямая: +500 участников в неделю всё время. */
(function(){
  const C = Lab.C, WK = 4.345;
  const T = []; for (let i = 1; i <= 12; i++) T.push(i); for (let m = 1; m <= 10; m++) T.push(12 + WK * m);
  const V = T.map(t => 2000 + 500 * t);
  const cv = document.getElementById('ax-cv'); let k = 0;
  function draw(){
    const g = Lab.canvas(cv, 0.42, 0.5); if (!g) return; const {c, w, h} = g;
    const L = 34, R = 10, TT = 18, B = h - 26, tmax = T[T.length - 1];
    const XB = i => L + i / (T.length - 1) * (w - L - R), XT = i => L + (T[i] - 1) / (tmax - 1) * (w - L - R), X = i => Lab.lerp(XB(i), XT(i), k);
    const Y = v => B - v / 32000 * (B - TT);
    Lab.gridY(c, Y, L, w - R, [0, 10000, 20000, 30000], v => Lab.num(v / 1000));
    const sx = (X(11) + X(12)) / 2; c.fillStyle = C.fillGray; c.fillRect(sx, TT, w - R - sx, B - TT);
    Lab.text(c, k < 0.5 ? 'замер раз в месяц' : 'раз в месяц', w - R - 4, TT + 14, C.ink2, 'right');
    Lab.text(c, k < 0.5 ? 'раз в неделю' : '', L + 6, TT + 14, C.ink2, 'left');
    Lab.line(c, V.map((v, i) => [X(i), Y(v)]), C.ctrl, 2.5);
    V.forEach((v, i) => Lab.dot(c, X(i), Y(v), 3.5, C.ctrl));
    Lab.text(c, k > 0.5 ? 'недели от запуска →' : 'номер замера →', w - R, h - 6, C.ink2, 'right');
    cv.setAttribute('aria-label', k > 0.5 ? 'По датам: одна прямая, +500 участников в неделю' : 'Замеры подряд: после 12-го линия резко круче');
  }
  async function run(api){
    k = 0; draw(); await Lab.sleep(900);
    await Lab.anim(1500, t => { k = Lab.ease(t); draw(); });
    api.verdict('в 1 раз', 'Темп всё время один: +500 участников в неделю. Шаг между точками вырос в 4.3 раза — и наклон на равных промежутках тоже');
  }
  Lab.game('axis-step', {min: 0, max: 100, example: 2, fmt: v => 'в ' + Lab.numT(v, 2) + ' раз' + (v % 10 >= 2 && v % 10 <= 4 && (v % 100 < 12 || v % 100 > 14) && Number.isInteger(v) ? 'а' : ''), run, draw});
})();
