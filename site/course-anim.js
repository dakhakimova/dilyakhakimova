/* Анимация на странице курса — одна, про главную мысль курса (решение Дили, 22.11.2026: «гифка, как на главной», вместо блока игр).
   <svg data-anim="dice|cafes|forks|peeking"> + счётчик [data-anim-n] в той же <figure>. Цвета по правилам сайта: A — синий,
   B и «событие» — красный. Цикл: рост → пауза → кроссфейд к началу. prefers-reduced-motion — последний кадр без движения.
   Случайность — с фиксированным зерном: каждый показ одинаковый и проверен (подглядывание действительно «прокрашивается»). */
(function(){
  const BLUE = '#23418A', CORAL = '#E8644A', CORAL_T = '#B8432B', INK = '#24221F', T2 = '#4A463F', T3 = '#5E5A53', LINE = 'rgba(36,34,31,.35)', SOFT = '#E3DED4';
  const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const f1 = x => Math.round(x * 10) / 10;
  function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const gauss = r => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const normCdf = x => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - q : q; };
  const txt = (x, y, s, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${o.a || 'start'}" class="${o.c || 'zone'}" fill="${o.fill || T2}"${o.bg ? ' paint-order="stroke" stroke="#FBF9F4" stroke-width="6" stroke-linejoin="round"' : ''}>${s}</text>`;
  const ln = (x1, y1, x2, y2, st = LINE, w = 1, dash = '') => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${st}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const poly = (pts, st, w = 2.5) => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('')}" fill="none" stroke="${st}" stroke-width="${w}" stroke-linejoin="round"/>`;

  // кубик: квадрат цвета группы и белые точки
  const PIPS = {1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]],
    5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]]};
  const die = (x, y, s, v, col) => `<rect x="${f1(x)}" y="${f1(y)}" width="${s}" height="${s}" rx="${f1(s * .2)}" fill="${col}"/>` +
    PIPS[v].map(([px, py]) => `<circle cx="${f1(x + px * s)}" cy="${f1(y + py * s)}" r="${f1(s * .09)}" fill="#fff"/>`).join('');

  const SCENES = {
    // «Вероятность на пальцах»: суммы двух кубиков; столбик 7 — событие (красный), поверх — точная доля из 36
    dice(nw){
      const W = nw ? 400 : 640, H = nw ? 300 : 300, L = 40, R = 16, T = 24, B = 44, base = H - B, N = 1200, r = rng(7);
      const rolls = []; for (let i = 0; i < N; i++) rolls.push(1 + (r() * 6 | 0) + 1 + (r() * 6 | 0));
      const bw = (W - L - R) / 11, X = s => L + (s - 2) * bw, ymax = 0.2, Y = p => base - p / ymax * (base - T);
      const exact = s => (6 - Math.abs(s - 7)) / 36;
      return {
        W, H, max: N, min: 30, label: n => fmtN(n),
        frame(n, final){
          const cnt = new Array(13).fill(0); for (let i = 0; i < n; i++) cnt[rolls[i]]++;
          let h = '';
          for (const p of [.05, .1, .15, .2]) h += ln(L, Y(p), W - R, Y(p), SOFT) + txt(L - 6, Y(p) + 4, Math.round(p * 100) + '%', {a: 'end', c: 'tick', fill: T3});
          for (let s = 2; s <= 12; s++){
            const p = n ? cnt[s] / n : 0, y = Y(Math.min(p, ymax));
            h += `<rect x="${f1(X(s) + 3)}" y="${f1(y)}" width="${f1(bw - 6)}" height="${f1(base - y)}" fill="${s === 7 ? CORAL : BLUE}" opacity="${s === 7 ? .9 : .8}"/>`;
            h += txt(X(s) + bw / 2, base + 20, s, {a: 'middle', c: 'tick', fill: T3});
          }
          h += ln(L, base, W - R, base, LINE, 1.5);
          // точные доли: ступенька «треугольника» 1/36 … 6/36 … 1/36
          const op = final ? 1 : Math.min(1, n / N * 1.4);
          let pts = []; for (let s = 2; s <= 12; s++){ pts.push([X(s) + 2, Y(exact(s))], [X(s) + bw - 2, Y(exact(s))]); }
          h += `<g opacity="${op.toFixed(2)}">${poly(pts, INK, 1.75)}</g>`;
          const top7 = Y(Math.min(n ? cnt[7] / n : 0, ymax));
          h += `<g opacity="${op.toFixed(2)}">${txt(X(8) + 4, Math.min(Y(exact(7)), top7) + 4, nw ? '← 6 из 36' : '← 7: шесть способов из 36', {fill: CORAL_T, bg: true})}</g>`;
          if (!nw) h += txt(W - R, H - 6, 'сумма двух кубиков', {a: 'end', c: 'tick', fill: T3});
          // красный и синий кубик с суммой 7 — перебирают шесть способов: 1+6, 2+5, … 6+1 (Диля, 23.11)
          const k = final ? 2 : Math.floor(n / 90) % 6, a = k + 1, b = 6 - k;
          h += die(L + 14, T + 2, nw ? 30 : 36, a, CORAL) + die(L + 14 + (nw ? 38 : 46), T + 2, nw ? 30 : 36, b, BLUE);
          h += txt(L + 14 + (nw ? 76 : 92), T + 2 + (nw ? 21 : 25), '= 7', {c: 'lab', fill: CORAL_T});
          return h;
        },
      };
    },
    // «Сигнал или шум»: выручка двух кафе по дням (точки) и бегущее среднее (линии). По дням они меняются местами, среднее расходится.
    cafes(nw){
      const W = nw ? 400 : 640, H = 300, L = 44, R = 16, T = 20, B = 44, base = H - B, N = 60, g = gauss(rng(11));
      const A = [], Bv = []; for (let i = 0; i < N; i++){ A.push(100 + 12 * g()); Bv.push(106 + 12 * g()); }
      const lo = 70, hi = 135, X = d => L + d / (N - 1) * (W - L - R), Y = v => base - (v - lo) / (hi - lo) * (base - T);
      const run = arr => { const o = []; let s = 0; arr.forEach((v, i) => { s += v; o.push(s / (i + 1)); }); return o; };
      const rA = run(A), rB = run(Bv);
      return {
        W, H, max: N, min: 3, label: n => fmtN(n),
        frame(n){
          const k = Math.max(1, Math.round(n));
          let h = '';
          for (const v of [80, 100, 120]) h += ln(L, Y(v), W - R, Y(v), SOFT) + txt(L - 6, Y(v) + 4, v, {a: 'end', c: 'tick', fill: T3});
          h += ln(L, base, W - R, base, LINE, 1.5);
          for (let i = 0; i < k; i++){
            h += `<circle cx="${f1(X(i))}" cy="${f1(Y(A[i]))}" r="3" fill="${BLUE}" opacity=".45"/>`;
            h += `<circle cx="${f1(X(i))}" cy="${f1(Y(Bv[i]))}" r="3" fill="${CORAL}" opacity=".45"/>`;
          }
          const pA = rA.slice(0, k).map((v, i) => [X(i), Y(v)]), pB = rB.slice(0, k).map((v, i) => [X(i), Y(v)]);
          h += poly(pA, BLUE, 3) + poly(pB, CORAL, 3);
          const end = k - 1;
          h += txt(Math.min(X(end) + 8, W - R - 88), Y(rA[end]) + 18, 'кафе A', {c: 'lab', fill: BLUE});
          h += txt(Math.min(X(end) + 8, W - R - 88), Y(rB[end]) - 10, 'кафе B', {c: 'lab', fill: CORAL_T});
          h += txt(W - R, H - 6, nw ? 'дни' : 'дни · точки — выручка за день, линии — среднее с первого дня', {a: 'end', c: 'tick', fill: T3});
          return h;
        },
      };
    },
    // «A/B на пальцах»: вилки (95%) конверсии A и B. Гостей больше — вилки уже; сначала перекрываются, потом расходятся.
    forks(nw){
      const W = nw ? 400 : 640, H = 240, L = 24, R = 24, T = 40, B = 48, pA = .100, pB = .115, N0 = 200, N1 = 20000;
      const lo = .04, hi = .18, X = p => L + (p - lo) / (hi - lo) * (W - L - R);
      return {
        W, H, max: N1, min: N0, log: true, label: n => fmtN(Math.round(n / 10) * 10),
        frame(n){
          const se = p => Math.sqrt(p * (1 - p) / n), yA = 90, yB = 150;
          let h = '';
          for (const p of [.06, .08, .10, .12, .14, .16]) h += ln(X(p), T - 10, X(p), H - B + 6, SOFT) + txt(X(p), H - B + 24, Math.round(p * 100) + '%', {a: 'middle', c: 'tick', fill: T3});
          const fork = (p, y, c, tc, name) => {
            const a = X(Math.max(lo, p - 1.96 * se(p))), b = X(Math.min(hi, p + 1.96 * se(p)));
            return `<rect x="${f1(a)}" y="${y - 9}" width="${f1(b - a)}" height="18" rx="9" fill="${c}" opacity=".28"/>` + ln(a, y, b, y, c, 3) +
              `<circle cx="${f1(X(p))}" cy="${y}" r="5" fill="${c}"/>` + txt(L, y - 16, name, {c: 'lab', fill: tc});
          };
          h += fork(pA, yA, BLUE, BLUE, 'A — старое меню') + fork(pB, yB, CORAL, CORAL_T, 'B — новое меню');
          const overlap = pA + 1.96 * se(pA) > pB - 1.96 * se(pB);
          h += txt(W - R, T - 18, nw ? (overlap ? 'вилки перекрываются' : 'вилки разошлись') : (overlap ? 'вилки перекрываются — разнице пока нельзя верить' : 'вилки разошлись — разница не похожа на шум'), {a: 'end', c: 'thr', fill: overlap ? T2 : INK});
          if (!nw) h += txt(W - R, H - 6, 'конверсия в заказ, 95-процентная вилка', {a: 'end', c: 'tick', fill: T3});
          return h;
        },
      };
    },
    // «A/B без мифов»: A/A-тест (эффекта нет), p-value пересчитывают каждый день. Линия ныряет ниже 0.05 — «прокрас», которого нет.
    peeking(nw){
      const W = nw ? 400 : 640, H = 300, L = 44, R = 16, T = 20, B = 44, base = H - B, D = 30, per = 400;
      // зерно подбирается: путь ныряет ниже 0.05 на 7–13-й день, позже ныряет ещё раз, а к 30-му дню возвращается к серому
      let seed = 3, path;
      for (;; seed++){
        const g = gauss(rng(seed)); let s = 0; path = [];
        for (let d = 1; d <= D; d++){ for (let i = 0; i < per; i++) s += g(); const z = s / Math.sqrt(d * per); path.push(2 * (1 - normCdf(Math.abs(z)))); }
        const dip = path.findIndex(p => p < 0.05);
        if (dip >= 6 && dip <= 12 && Math.min(...path) < 0.025 && path.filter((p, i) => i > dip + 3 && p < 0.05).length >= 1 && path[D - 1] > 0.3) break;
      }
      const X = d => L + (d - 1) / (D - 1) * (W - L - R), Y = p => base - Math.min(1, p) * (base - T);
      const dip = path.findIndex(p => p < 0.05);
      return {
        W, H, max: D, min: 1, label: n => fmtN(n),
        frame(n){
          const k = Math.max(1, Math.round(n));
          let h = '';
          for (const p of [.25, .5, .75, 1]) h += ln(L, Y(p), W - R, Y(p), SOFT) + txt(L - 6, Y(p) + 4, String(p).replace('0.', '0.'), {a: 'end', c: 'tick', fill: T3});
          h += `<rect x="${L}" y="${f1(Y(.05))}" width="${W - L - R}" height="${f1(base - Y(.05))}" fill="${CORAL}" opacity=".18"/>`;
          h += ln(L, Y(.05), W - R, Y(.05), CORAL_T, 1.25, '5 4') + txt(L + 6, Y(.05) - 6, 'p = 0.05', {c: 'thr', fill: CORAL_T, bg: true});
          h += ln(L, base, W - R, base, LINE, 1.5);
          h += poly(path.slice(0, k).map((p, i) => [X(i + 1), Y(p)]), BLUE, 3);
          if (k > dip){
            h += `<circle cx="${f1(X(dip + 1))}" cy="${f1(Y(path[dip]))}" r="6" fill="${CORAL}"/>`;
            h += txt(X(dip + 1) + 10, Y(path[dip]) - 30, nw ? `день ${dip + 1}: «прокрасилось»` : `день ${dip + 1}: «прокрасилось» — остановили бы здесь`, {c: 'zone', fill: CORAL_T, bg: true});
            for (let i = dip + 1; i < k; i++) if (path[i] < 0.05) h += `<circle cx="${f1(X(i + 1))}" cy="${f1(Y(path[i]))}" r="4" fill="${CORAL}"/>`;
          }
          h += txt(W - R, H - 6, nw ? 'дни A/A-теста' : 'дни A/A-теста · p-value, пересчитанный каждый день', {a: 'end', c: 'tick', fill: T3});
          return h;
        },
      };
    },
  };

  document.querySelectorAll('svg[data-anim]').forEach(svg => {
    const make = SCENES[svg.dataset.anim]; if (!make) return;
    const fig = svg.closest('figure'), cnt = fig && fig.querySelector('[data-anim-n]');
    const narrow = () => innerWidth <= 600;
    let nw = narrow(), sc = make(nw);
    const fit = () => { svg.setAttribute('viewBox', `0 0 ${sc.W} ${sc.H}`); svg.classList.toggle('nw', nw); };
    fit();
    addEventListener('resize', () => { if (narrow() !== nw){ nw = narrow(); sc = make(nw); fit(); } });
    const at = k => { const min = sc.min || 0; return sc.log ? min * Math.pow(sc.max / min, k) : min + (sc.max - min) * k; };
    const T0 = 600, GROW = 9000, HOLD = 3000, FADE = 900, CYCLE = T0 + GROW + HOLD + FADE;
    const ease = t => (1 - Math.cos(Math.PI * t)) / 2;
    const show = (n, op = 1) => { if (cnt){ const v = sc.label(n); if (cnt.textContent !== v) cnt.textContent = v; cnt.parentNode.style.opacity = op; } };
    function draw(t){
      t = ((t % CYCLE) + CYCLE) % CYCLE;
      if (t < T0){ svg.innerHTML = sc.frame(at(0)); return show(at(0)); }
      if (t < T0 + GROW){ const n = at(ease((t - T0) / GROW)); svg.innerHTML = sc.frame(n); return show(n); }
      if (t < T0 + GROW + HOLD){ svg.innerHTML = sc.frame(at(1), true); return show(at(1)); }
      const c = ease((t - T0 - GROW - HOLD) / FADE);
      svg.innerHTML = `<g opacity="${(1 - c).toFixed(3)}">${sc.frame(at(1), true)}</g><g opacity="${c.toFixed(3)}">${sc.frame(at(0))}</g>`;
      show(c < .5 ? at(1) : at(0), Math.abs(1 - 2 * c).toFixed(3));
    }
    svg._animAt = draw;   // для скриншотов и проверки
    if (matchMedia('(prefers-reduced-motion: reduce)').matches){ svg.innerHTML = sc.frame(at(1), true); show(at(1)); return; }
    let t0 = 0, vis = true;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(svg);
    function tick(ts){ if (svg._stop) return; if (!t0) t0 = ts; if (vis) draw(ts - t0); requestAnimationFrame(tick); }
    draw(0); requestAnimationFrame(tick);
  });
})();
