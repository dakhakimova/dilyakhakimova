/* bar-or-dot: правда 4.6%, 6750 гостей; оценка выше правды примерно в половине тестов (49.6%), интервал ±0.5 п. п.
   не накрывает правду примерно в 5 тестах из 100. Столбик рисует «правда внутри», точка с отрезком — симметрию. */
(function(){
  const C = Lab.C, P = 0.046, N = 6750;
  const one = document.getElementById('bod-one'), cv = document.getElementById('bod-cv');
  let tests = [], shown = 0;
  const ci = e => 1.959964 * Math.sqrt(e * (1 - e) / N);
  function drawOne(){
    const g = Lab.canvas(one, 0.3, 0.62); if (!g) return; const {c, w, h} = g;
    const L = 40, B = h - 22, T = 18, Y = v => B - v / 6 * (B - T), half = (w - L) / 2;
    Lab.gridY(c, Y, L, w, [0, 2, 4, 6], v => v + '%');
    const xa = L + half * 0.5, xb = L + half * 1.5;
    c.fillStyle = C.ctrl; c.fillRect(xa - 28, Y(4.6), 56, B - Y(4.6));
    c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(xa, Y(4.1)); c.lineTo(xa, Y(5.1)); c.moveTo(xa - 10, Y(4.1)); c.lineTo(xa + 10, Y(4.1)); c.moveTo(xa - 10, Y(5.1)); c.lineTo(xa + 10, Y(5.1)); c.stroke();
    c.strokeStyle = C.ctrl; c.lineWidth = 3; c.beginPath(); c.moveTo(xb, Y(4.1)); c.lineTo(xb, Y(5.1)); c.stroke(); Lab.dot(c, xb, Y(4.6), 6, C.ctrl, '#fff', 2);
    Lab.text(c, 'столбик с усами', xa, h - 4, C.ink2, 'center'); Lab.text(c, 'точка и 95% интервал', xb, h - 4, C.ink2, 'center');
    one.setAttribute('aria-label', 'Конверсия 4.6%, 95% интервал от 4.1% до 5.1%: столбиком с усами и точкой с отрезком');
  }
  function draw(){
    drawOne();
    const g = Lab.canvas(cv, 0.6, 1.35); if (!g) return; const {c, w, h} = g;
    const L = 8, R = 8, T = 22, B = h - 24, lo = 3.6, hi = 5.6, X = v => L + (v - lo) / (hi - lo) * (w - L - R), rh = (B - T) / 100;
    [4, 4.5, 5, 5.5].forEach(v => { c.strokeStyle = C.grid; c.lineWidth = 1; c.beginPath(); c.moveTo(X(v) + 0.5, T); c.lineTo(X(v) + 0.5, B); c.stroke(); });
    Lab.ticksX(c, X, h - 6, [4, 4.5, 5, 5.5], v => Lab.numT(v, 1) + '%');
    tests.slice(0, shown).forEach((e, i) => {
      const y = T + (i + 0.5) * rh, d = ci(e), miss = Math.abs(e - P) > d, col = miss ? C.trap : e > P ? C.ctrl : C.gray;
      c.strokeStyle = col; c.lineWidth = Math.max(1, rh * 0.45); c.beginPath(); c.moveTo(X((e - d) * 100), y); c.lineTo(X((e + d) * 100), y); c.stroke();
      Lab.dot(c, X(e * 100), y, Math.max(1.6, rh * 0.42), col);
    });
    c.strokeStyle = C.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(X(4.6), T - 6); c.lineTo(X(4.6), B); c.stroke();
    Lab.tag(c, 'правда 4.6%', X(4.6) + 6, T - 8, C.ink);
    const k = tests.slice(0, shown).filter(e => e > P).length;
    cv.setAttribute('aria-label', shown + ' повторов: правда ниже точки в ' + k + ', интервал не накрыл правду в ' + tests.slice(0, shown).filter(e => Math.abs(e - P) > ci(e)).length);
  }
  async function run(api){
    tests = Array.from({length: 100}, () => Lab.binom(N, P) / N); shown = 0;
    await Lab.anim(1500, t => { shown = Math.round(100 * t); draw(); });
    shown = 100; draw();
    const k = tests.filter(e => e > P).length, miss = tests.filter(e => Math.abs(e - P) > ci(e)).length;
    api.verdict(k + ' из 100', 'Выше конца уса правда оказалась в ' + tests.filter(e => P > e + ci(e)).length + ' тестах, интервал промахнулся всего в ' + miss);
  }
  Lab.game('bar-or-dot', {min: 0, max: 100, example: 70, run, draw});
})();
