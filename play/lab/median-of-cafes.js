/* median-of-cafes: медиана сети (29 минут) — медиана заказов, а не кафе: дольше неё возят 7 кафе из 10.
   Учебный пример: времена доставки кафе — логнормальные с σ = 0.3 вокруг медианы кафе; пересчёт — /home/claude/ng/gC.py. */
(function(){
  const C = Lab.C, NET = 29;
  const CAFES = [['Вокзальное', 24, 1500], ['У парка', 26, 1300], ['Центральное', 27, 1200], ['Речное', 31, 420], ['Садовое', 32, 400],
    ['Лесное', 33, 390], ['Северное', 34, 380], ['Озёрное', 35, 370], ['Южное', 37, 360], ['Заречное', 40, 340]];
  const Q = 0.8167; // квартили логнормального с σ = 0.3: медиана × e^(∓0.3 · 0.674)
  const cv = document.getElementById('mc-cv');
  let shown = 0, line = 0;
  function draw(){
    const g = Lab.canvas(cv, 0.52, 1.25); if (!g) return; const {c, w, h, small} = g;
    const L = small ? 112 : 190, R = 56, T = 28, B = h - 26, rowH = (B - T) / CAFES.length;
    const lo = 15, hi = 50, X = v => L + (v - lo) / (hi - lo) * (w - L - R);
    [20, 30, 40, 50].forEach(v => { c.strokeStyle = C.grid; c.lineWidth = 1; c.beginPath(); c.moveTo(X(v) + 0.5, T - 6); c.lineTo(X(v) + 0.5, B); c.stroke(); });
    Lab.ticksX(c, X, h - 6, [20, 30, 40, 50], v => v + ' мин');
    CAFES.forEach(([name, m, n], i) => {
      const y = T + (i + 0.5) * rowH;
      Lab.text(c, name, 0, y + 4, C.ink, 'left', Lab.FONT14);
      if (!small) Lab.text(c, Lab.num(n) + ' заказов', 100, y + 4, C.ink2);
      if (i >= shown) return;
      c.fillStyle = C.grid; c.fillRect(X(m * Q), y - 4, X(m / Q) - X(m * Q), 8);
      const slow = m > NET, r = 3 + 6 * Math.sqrt(n / 1500);
      Lab.dot(c, X(m), y, r, slow ? C.accent : C.ctrl, '#fff', 1.5);
      Lab.text(c, m + ' мин', w - R + 6, y + 4, slow ? C.trapInk : C.ink2);
    });
    if (line){
      const x = X(NET); c.strokeStyle = C.ink; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(x, T - 4); c.lineTo(x, T - 4 + (B - T + 4) * line); c.stroke(); c.setLineDash([]);
      Lab.tag(c, 'медиана сети 29', x + 4, T - 10, C.ink, 'left');
    }
    cv.setAttribute('aria-label', 'Медианы доставки десяти кафе от 24 до 40 минут; медиана сети 29 минут; дольше неё — ' + CAFES.slice(0, shown).filter(x => x[1] > NET).length + ' кафе');
  }
  async function run(api){
    shown = 0; line = 0;
    await Lab.anim(500, t => { line = t; draw(); });
    for (let i = 1; i <= CAFES.length; i++){ shown = i; draw(); await Lab.sleep(170); }
    api.verdict('7 из 10', 'Медиана десяти медиан кафе — 32.5 минуты');
  }
  Lab.game('median-of-cafes', {min: 0, max: 10, example: 5, run, draw});
})();
