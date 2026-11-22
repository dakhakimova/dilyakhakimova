/* bob-strategies: 80 пустых и 20 хороших идей (+0.5 п. п. к 10%), 28 дней по 2000 гостей в день в группу.
   Ожидаемые очки за год (хорошие − пустышки), /home/claude/ng/calc2.py: Алиса ≈ +14, мягкий судья ≈ +11, Боб ≈ +7, нетерпеливый ≈ +4. */
(function(){
  const C = Lab.C, D = 28, G = 2000, P = 0.1, EFF = 0.005;
  const NAMES = {bob: 'Боб: каждый день', alice: 'Алиса: 28-й день', week: 'Нетерпеливый: 7-й день', soft: 'Мягкий судья: порог 0.20'}, KEYS = ['bob', 'alice', 'week', 'soft'];
  const cv = document.getElementById('bst-cv'), card = document.querySelector('[data-toy="bob-strategies"]');
  const read = Lab.pick(card, 1);
  let res = null, k = 0;
  const idea = good => { let a = 0, b = 0, bob = false, week = false; const e = good ? EFF : 0;
    for (let i = 0; i < D; i++){ a += Lab.binom(G, P); b += Lab.binom(G, P + e); const n = G * (i + 1), p = Lab.pZ(a, b, n), up = b > a; if (!bob && p < 0.05 && up) bob = true; if (i === 6) week = p < 0.05 && up; if (i === D - 1) return {bob, week, alice: p < 0.05 && up, soft: p < 0.2 && up}; } };
  const year = () => { const s = {}; KEYS.forEach(x => { s[x] = {g: 0, e: 0}; });
    for (let i = 0; i < 100; i++){ const good = i < 20, r = idea(good); KEYS.forEach(x => { if (r[x]) good ? s[x].g++ : s[x].e++; }); } return s; };
  const score = s => s.g - s.e;
  function draw(){
    if (!res) return; const g = Lab.canvas(cv, 0.36, 0.85); if (!g) return; const {c, w, h, small} = g;
    const L = small ? 8 : 190, R = 50, T = 8, rh = (h - T - 8) / 4, lo = -20, hi = 20, X = v => L + (v - lo) / (hi - lo) * (w - L - R);
    c.strokeStyle = C.ink2; c.lineWidth = 1; c.beginPath(); c.moveTo(X(0) + 0.5, T); c.lineTo(X(0) + 0.5, h - 8); c.stroke();
    KEYS.forEach((key, i) => {
      const y = T + i * rh, v = score(res[key]) * k, top = small ? y + 16 : y + rh * 0.25, bh = small ? rh * 0.36 : rh * 0.5;
      Lab.text(c, NAMES[key], small ? L : 0, small ? y + 12 : top + bh / 2 + 5, C.ink, 'left', Lab.FONT14);
      const best = KEYS.every(x => score(res[x]) <= score(res[key]));
      c.fillStyle = v >= 0 ? (best ? C.truth : C.ctrl) : C.trap; c.fillRect(Math.min(X(0), X(v)), top + (small ? 6 : 0), Math.abs(X(v) - X(0)), bh);
      Lab.text(c, (v > 0 ? '+' : '') + Lab.num(v), Math.max(X(0), X(v)) + 6, top + (small ? 6 : 0) + bh / 2 + 5, C.ink, 'left', Lab.FONT14);
      if (!small) Lab.text(c, 'хороших ' + res[key].g + ' · пустышек ' + res[key].e, L + 4, y + rh - 2, C.ink2);
    });
    cv.setAttribute('aria-label', KEYS.map(x => NAMES[x] + ': ' + score(res[x]) + ' очков (хороших ' + res[x].g + ', пустышек ' + res[x].e + ')').join('; '));
  }
  const win = s => KEYS.reduce((a, b) => score(s[b]) > score(s[a]) ? b : a);
  async function run(api){
    res = year(); k = 0;
    await Lab.anim(1200, t => { k = t; draw(); }); k = 1; draw();
    const wv = win(res);
    api.status('Твой прогноз: <b>' + NAMES[api.guess] + '</b> · победила: <b>' + NAMES[wv] + '</b>, ' + Lab.signed(score(res[wv])) + '. ' + 'Боб выкатил хороших ' + res.bob.g + ' из 20, но и пустышек ' + res.bob.e + ' из 80');
    card.querySelectorAll('.lab-pick .opts button').forEach(b => b.classList.toggle('ok', b.dataset.v === wv));
  }
  Lab.game('bob-strategies', {fmt: v => NAMES[v], pick: () => { const v = read(); return v.length ? {v: v[0]} : {err: 'Сначала выбери стратегию.'}; }, run, draw,
    async x1000(api){
      const tot = {}; KEYS.forEach(x => { tot[x] = {g: 0, e: 0}; });
      for (let b = 0; b < 10; b++){ for (let i = 0; i < 100; i++){ const s = year(); KEYS.forEach(x => { tot[x].g += s[x].g; tot[x].e += s[x].e; }); } api.status('Прожито ' + (b + 1) * 100 + ' лет из 1000…'); await Lab.sleep(10); }
      KEYS.forEach(x => { tot[x].g /= 1000; tot[x].e /= 1000; });
      res = {}; KEYS.forEach(x => { res[x] = {g: Math.round(tot[x].g * 10) / 10, e: Math.round(tot[x].e * 10) / 10}; }); k = 1; draw();
      api.status('В среднем за 1000 лет: ' + KEYS.map(x => NAMES[x] + ' ' + Lab.signed(tot[x].g - tot[x].e, 1)).join(' · '));
    }});
})();
