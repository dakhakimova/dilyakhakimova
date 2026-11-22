/* Схема метро на «Карте навыков» (/map/) — основной вид страницы. Подробный граф всех навыков рисует map/map.js ниже.
   Линии = маршруты-цели из map/skills.json (routes), станции = ключевые навыки (узлы nodes), зоны = курсы, пунктир = курсы «в планах».
   Здесь две части:
   1) LAYOUT — данные схемы: координаты станций на сетке (viewBox 1200 × 760, отрезки только под 0/45/90°), пути линий,
      цвета, зоны курсов. Остановка линии на станции = навык есть в маршруте; иначе линия идёт мимо (не останавливается).
      Проверка схемы (станции — настоящие узлы, порядок остановок = порядок маршрута, углы 0/45/90°, тексты metro.* есть):
      node tools/check-map.js.
   2) SkillMetro.init(api) — рисует SVG, легенду линий, линейный вид для узких экранов («линия сверху вниз»)
      и маркер «Ты здесь». Состояние (маршрут, прогресс, панель навыка) остаётся в map.js, сюда приходит через api.
   Тексты — metro.* и line.* в i18n/map.js; короткие имена станций — metro.st.<id>. */
(function (root) {
'use strict';

const LAYOUT = {
  w: 1200, h: 780,
  // Компоновка — «змейка» в порядке цели «Весь путь»: ряд 1 слева направо (1 ВП → 2 СШ), ряд 2 справа налево (3 АП → 4 ПС),
  // ряд 3 слева направо (5 АБМ → 6 CI). Остальные цели — свои линии поверх той же компоновки, рядом (сдвиг off).
  // линия: цвет, сдвиг от осевой (px, + — слева по ходу) на общих перегонах, путь — id станций и точки изгибов [x, y];
  // dashed — участки пути [от, до] (индексы точек) пунктиром: необязательные курсы; bypass — сплошной обход необязательного участка
  // (рисуется той же линией, станций на нём нет); cont — продолжение «дальше» (курс «позже», вне маршрута)
  lines: {
    full:      {color: '#4A463F', off: 0, path: ['vp-outcomes', 'vp-bayes', 'vp-mean', 'vp-interview', [560, 120], 'ss-clt', 'ss-aa', 'ss-errors', 'ss-main',
                                                [1130, 120], [1160, 150], [1160, 350], [1160, 390], [1130, 420], 'ap-random', 'ap-interval', 'ap-mde', 'ap-decide', [580, 420],
                                                'ps-interval', 'ps-power', 'ps-regression', 'ps-sim', [80, 420], [50, 450], [50, 640], [80, 670],
                                                'abm-design', 'abm-cuped', 'abm-srm', 'abm-main', 'ci-confound', 'ci-did', 'ci-main'],
                dashed: [[0, 4], [11, 18]], bypass: [[1160, 350], [1130, 380], [620, 380], [580, 420]]},
    decide:    {color: '#E8644A', off: 5, path: ['ap-random', 'ap-interval', 'ap-mde', 'ap-decide']},
    basics:    {color: '#23418A', off: -5, path: ['vp-outcomes', 'vp-bayes', 'vp-mean', 'vp-interview', [560, 120], 'ss-clt', 'ss-aa', 'ss-errors', 'ss-main',
                                                  [1130, 120], [1160, 150], [1160, 350], [1130, 380], [620, 380], [580, 420], 'ps-interval', 'ps-power', 'ps-regression', 'ps-sim']},
    interview: {color: '#0E7E5F', off: 5, path: ['vp-outcomes', 'vp-bayes', 'vp-mean', 'vp-interview', [560, 120], 'ss-clt', 'ss-aa', 'ss-errors', 'ss-main']},
    // охра темнее прежней #C9A43A: контраст линии с белым ≥ 3:1
    abtest:    {color: '#A8862A', off: -10, path: ['ss-aa', 'ss-errors', 'ss-main', [1130, 120], [1160, 150], [1160, 350], [1130, 380], [620, 380], [580, 420],
                                                   'ps-interval', 'ps-power', 'ps-regression', 'ps-sim', [80, 420], [50, 450], [50, 640], [80, 670],
                                                   'abm-design', 'abm-cuped', 'abm-srm', 'abm-main']},
    deep:      {color: '#6A4C9C', off: 5, path: ['ps-regression', 'ps-sim', [80, 420], [50, 450], [50, 640], [80, 670], 'abm-design', 'abm-cuped', 'abm-srm', 'abm-main',
                                                 'ci-confound', 'ci-did', 'ci-main']}
  },
  // станция: [x, y, где подпись: a — над, b — под, l — слева, r — справа]
  stations: {
    'vp-outcomes': [100, 120, 'a'], 'vp-bayes': [215, 120, 'a'], 'vp-mean': [330, 120, 'a'], 'vp-interview': [445, 120, 'a'],
    'ss-clt': [660, 120, 'a'], 'ss-aa': [790, 120, 'a'], 'ss-errors': [920, 120, 'a'], 'ss-main': [1050, 120, 'a'],
    'ap-random': [1060, 420, 'b'], 'ap-interval': [940, 420, 'b'], 'ap-mde': [820, 420, 'b'], 'ap-decide': [700, 420, 'b'],
    'ps-interval': [530, 420, 'b'], 'ps-power': [410, 420, 'b'], 'ps-regression': [290, 420, 'b'], 'ps-sim': [170, 420, 'b'],
    'abm-design': [170, 670, 'b'], 'abm-cuped': [300, 670, 'b'], 'abm-srm': [430, 670, 'b'], 'abm-main': [560, 670, 'b'],
    'ci-confound': [760, 670, 'b'], 'ci-did': [900, 670, 'b'], 'ci-main': [1050, 670, 'b']
  },
  // строится: курсы «в планах» (status: planned) — пунктирные ответвления от зон курсов. Станция ведёт к карточке #plan-<course>.
  planned: {
    stations: {bet: [300, 240, 'b', 'luck'], luck: [480, 240, 'b', 'luck'], mkt: [760, 240, 'b', 'mkt'], talk: [880, 550, 'r', 'talk']},
    paths: [[[160, 170], [230, 240], 'bet', 'luck', 'mkt'], [[880, 500], 'talk']]
  },
  // зоны курсов: прямоугольники [x, y, w, h]; номер (по цели «Весь путь») и подпись — в левом верхнем углу первого
  zones: {
    prob: [[30, 20, 520, 150]],
    sig:  [[580, 20, 530, 150]],
    ab:   [[640, 320, 480, 180]],
    st:   [[70, 320, 540, 180]],
    abm:  [[70, 580, 560, 180]],
    cau:  [[660, 580, 520, 180]]
  }
};
root.SkillMetroLayout = LAYOUT;
if (typeof document === 'undefined') return;                 // node: нужен только LAYOUT (tools/check-map.js)

const NS = 'http://www.w3.org/2000/svg';
const INK = '#24221F', PLAN = '#8A847A';
const R = {main: 14, st: 7, xfer: 12, single: 10};

root.SkillMetro = {init};

function init(api){
  const {M, node, course, t, esc, typo} = api;
  const svg = document.getElementById('metro'), legend = document.getElementById('metro-legend');
  const linear = document.getElementById('metro-linear'), scroll = document.getElementById('metro-scroll');
  const zoomBtn = document.getElementById('metro-zoom'), card = document.getElementById('metro-card');
  if (!svg) return null;
  const routes = Object.fromEntries(M.routes.map(r => [r.id, r]));
  const L = LAYOUT, ids = Object.keys(L.lines);
  const has = k => k in (root.I18N.ru || {});
  const sname = id => has('metro.st.' + id) ? t('metro.st.' + id) : node.get(id).label;
  const pt = x => typeof x === 'string' ? (L.stations[x] || L.planned.stations[x]) : x;

  // ---------- остановки и пересадки ----------
  const stops = new Map(Object.keys(L.stations).map(id => [id, []]));   // id → линии, что здесь останавливаются
  const conts = new Set();
  ids.forEach(lid => {
    const inRoute = new Set(routes[lid].nodes);
    L.lines[lid].path.forEach(x => { if (typeof x === 'string' && inRoute.has(x)) stops.get(x).push(lid); });
    (L.lines[lid].cont || []).slice(1).forEach(x => { if (typeof x === 'string'){ conts.add(x); stops.get(x).push(lid); } });
  });

  // ---------- геометрия: сдвиг линии от осевой ----------
  function offsetPts(path, d){
    const P = path.map(pt).map(p => [p[0], p[1]]);
    const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
    return P.map((p, i) => {
      if (!d) return p;
      const n1 = i > 0 ? nrm(P[i - 1], p) : null, n2 = i < P.length - 1 ? nrm(p, P[i + 1]) : null;
      if (!n1 || !n2) { const n = n1 || n2; return [p[0] + n[0] * d, p[1] + n[1] * d]; }
      const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k];
    });
  }
  const dstr = P => 'M' + P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  // где рисовать кружок одиночной станции: на своей линии; если рядом идёт чужая линия — снаружи, чтобы не налезать
  const pos = new Map();
  ids.forEach(lid => {
    const ln = L.lines[lid];
    [['path', ln.off], ['cont', ln.off]].forEach(([k, d]) => { const path = ln[k]; if (!path) return;
      const P = offsetPts(path, d);
      path.forEach((x, i) => { if (typeof x !== 'string' || !stops.has(x) || !stops.get(x).includes(lid) || pos.has(x + '|' + lid)) return;
        pos.set(x + '|' + lid, {p: P[i], dir: [P[i][0] - pt(x)[0], P[i][1] - pt(x)[1]]}); });
    });
  });
  const passing = id => ids.filter(lid => L.lines[lid].path.includes(id));

  // ---------- рисуем ----------
  const lv = c => M.levels[c.level].name;
  const full = routes.full, NUM = Object.fromEntries(((full && full.path) || []).map((p, i) => [p.course, {n: i + 1, optional: !!p.optional}]));
  let html = `<title>${esc(t('metro.label'))}</title>`;
  // зоны
  Object.entries(L.zones).forEach(([cid, rects]) => { const c = course[cid];
    html += `<g class="zone z-${c.status}" style="--zc:var(${c.color})">` + rects.map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="16"/>`).join('')
      + (NUM[cid] ? `<circle class="zn-c" cx="${rects[0][0] + 26}" cy="${rects[0][1] + 26}" r="15"/><text class="zn" x="${rects[0][0] + 26}" y="${rects[0][1] + 32}" text-anchor="middle">${NUM[cid].n}</text>` : '')
      + `<text class="zt" x="${rects[0][0] + (NUM[cid] ? 50 : 14)}" y="${rects[0][1] + 24}">${esc(has('metro.zone.' + cid) ? t('metro.zone.' + cid) : typo(c.title))}`
      + `<tspan class="zs" x="${rects[0][0] + (NUM[cid] ? 50 : 14)}" dy="16">`
      + `${esc(typo(M.status[c.status]))} · ${esc(lv(c))}${NUM[cid] && NUM[cid].optional ? ' · ' + esc(t('ui.optional')) : ''}</tspan></text></g>`;
  });
  // строится
  html += `<g class="plan-ln" aria-hidden="true">` + L.planned.paths.map(p => `<path d="${dstr(p.map(pt))}"/>`).join('') + `</g>`;
  // линии
  // необязательные участки (dashed) — пунктиром, рядом — сплошной обход (bypass)
  const pieces = (P, ranges) => { const solid = [], dash = [];
    for (let i = 0; i < P.length - 1; i++){ const dsh = (ranges || []).some(([a, b]) => i >= a && i + 1 <= b), arr = dsh ? dash : solid;
      const last = arr[arr.length - 1]; if (last && last.end === i) { last.pts.push(P[i + 1]); last.end = i + 1; } else arr.push({pts: [P[i], P[i + 1]], end: i + 1}); }
    return [solid.map(x => dstr(x.pts)).join(''), dash.map(x => dstr(x.pts)).join('')]; };
  ids.forEach(lid => { const ln = L.lines[lid];
    const P = offsetPts(ln.path, ln.off), [sd, dd] = pieces(P, ln.dashed), all = dstr(P);
    const by = ln.bypass ? dstr(offsetPts(ln.bypass, ln.off)) : '';
    html += `<g class="ln" data-route="${lid}" style="--line:${ln.color}">`
      + (ln.cont ? `<path class="cont" d="${dstr(offsetPts(ln.cont, ln.off))}"/>` : '')
      + `<path class="hit" d="${all}${by}"/>` + (sd ? `<path class="stroke" d="${sd}${by}"/>` : '') + (dd ? `<path class="stroke dash" d="${dd}"/>` : '') + `</g>`;
  });
  // станции
  const labelSvg = (lines, x, y, side, r, cls) => {
    const lh = 15, n = lines.length;
    let ax = x, anchor = 'middle', y0;
    if (side === 'a') y0 = y - r - 7 - (n - 1) * lh;
    else if (side === 'b') y0 = y + r + 15;
    else { ax = side === 'l' ? x - r - 8 : x + r + 8; anchor = side === 'l' ? 'end' : 'start'; y0 = y - (n - 1) * lh / 2 + 4.5; }
    return `<text class="${cls || 'sl'}" x="${ax}" y="${y0}" text-anchor="${anchor}">` + lines.map((s, i) => `<tspan x="${ax}" dy="${i ? lh : 0}"${s.cls ? ` class="${s.cls}"` : ''}>${esc(s.t || s)}</tspan>`).join('') + `</text>`;
  };
  const wrap = (s, max) => { const out = []; let cur = '';
    s.split(' ').forEach(w => { if (cur && (cur + ' ' + w).replace(/ /g, ' ').length > max){ out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push(cur); return out; };
  const stInfo = new Map();
  Object.entries(L.stations).forEach(([id, [x, y, side]]) => {
    const n = node.get(id), c = course[n.course], lines = stops.get(id), big = !!n.main, later = conts.has(id);
    let cx = x, cy = y, mark, r;
    if (later){ r = big ? 9 : 6; const q = pos.get(id + '|' + lines[0]).p; cx = q[0]; cy = q[1];
      mark = `<circle class="mk cont-mk" cx="${cx}" cy="${cy}" r="${r}" style="--line:${L.lines[lines[0]].color}"/>`; }
    else if (lines.length > 1){ r = big ? R.main : R.xfer;
      mark = `<circle class="mk xfer${big ? ' big' : ''}" cx="${x}" cy="${y}" r="${r}"/>`; }
    else {
      const lid = lines[0], col = L.lines[lid].color, q = pos.get(id + '|' + lid);
      r = big ? R.single : 6.5; cx = q.p[0]; cy = q.p[1];
      if (passing(id).length > 1){                              // мимо идёт другая линия: кружок — снаружи
        const dl = Math.hypot(q.dir[0], q.dir[1]) || 1, push = r - 3;
        cx += q.dir[0] / dl * push; cy += q.dir[1] / dl * push;
      }
      mark = `<circle class="mk one" cx="${cx}" cy="${cy}" r="${r}" style="fill:${col}"/>` + (big ? `<circle class="mk-in" cx="${cx}" cy="${cy}" r="4"/>` : '');
    }
    const nm = sname(id), max = side === 'l' || side === 'r' ? 22 : 15;
    stInfo.set(id, {cx, cy, r, side, lines, later, big});
    const aria = t('metro.aria', {name: nm, course: c.title, status: M.status[c.status]})
      + (big ? ' ' + t('metro.ariaMain') : '') + ' ' + t('metro.ariaLines', {list: lines.map(l => t('line.' + l)).join(', ')});
    html += `<g class="st${big ? ' main' : ''}${later ? ' later' : ''}" id="ms-${id}" data-id="${id}" data-lines="${lines.join(' ')}" tabindex="0" role="button" aria-label="${esc(aria)}" aria-controls="panel">`
      + `<circle class="hitc" cx="${cx}" cy="${cy}" r="22"/><circle class="ring" cx="${cx}" cy="${cy}" r="${r + 6}"/>` + mark
      + labelSvg(wrap(nm, max), cx, cy, side, r, big ? 'sl big' : 'sl') + `</g>`;
  });
  Object.entries(L.planned.stations).forEach(([id, [x, y, side, cid]]) => {
    const nm = id === 'bet' ? t('metro.st.bet') : t('plan.' + cid + '.title');
    html += `<a class="st plan" href="#plan-${cid}" aria-label="${esc(t('metro.ariaPlan', {name: nm}))}">`
      + `<circle class="hitc" cx="${x}" cy="${y}" r="22"/><circle class="ring" cx="${x}" cy="${y}" r="14"/><circle class="mk pl-mk" cx="${x}" cy="${y}" r="7"/>`
      + labelSvg(wrap(nm, side === 'r' ? 22 : 15).concat([{t: t('metro.building'), cls: 'bld'}]), x, y, side, 7, 'sl') + `</a>`;
  });
  // маркер «Ты здесь»: тонкое кольцо вплотную к кружку станции и плашка с ножкой — с той стороны, где нет подписи (подпись не перекрываем)
  html += `<g class="here-pin" id="here-pin" aria-hidden="true" style="display:none"><circle class="hp-ring"/><path class="hp-leg"/><rect height="22" rx="11"/><text text-anchor="middle"></text></g>`;
  svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`);
  svg.innerHTML = html;

  // ---------- легенда: линии — переключатель маршрута ----------
  legend.innerHTML = `<ul class="ml-lines" role="list">` + (routes.mine ? `<li><button type="button" class="ml-line mine" data-route="mine" aria-pressed="false" style="--line:${L.lines.full.color}"><span class="sw" aria-hidden="true"></span>${t('line.mine')}</button></li>` : '') + ids.map(lid => `<li><button type="button" class="ml-line" data-route="${lid}" aria-pressed="false" style="--line:${L.lines[lid].color}">`
      + `<span class="sw" aria-hidden="true"></span>${t('line.' + lid)}</button></li>`).join('') + `</ul>`
    + `<ul class="ml-keys" role="list">`
    + `<li><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/></svg>${t('metro.key.xfer')}</li>`
    + `<li><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#23418A"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>${t('metro.key.main')}</li>`
    + (conts.size ? `<li><svg width="40" height="24" aria-hidden="true"><path d="M2 12H38" stroke="#A8862A" stroke-opacity=".45" stroke-width="4"/><circle cx="20" cy="12" r="6" fill="#fff" stroke="#A8862A" stroke-width="2.5"/></svg>${t('metro.key.later')}</li>` : '')
    + `<li><svg width="40" height="24" aria-hidden="true"><path d="M2 12H38" stroke="${PLAN}" stroke-width="4" stroke-dasharray="7 5"/><circle cx="20" cy="12" r="6" fill="#fff" stroke="${PLAN}" stroke-width="2" stroke-dasharray="3 2"/></svg>${t('metro.key.plan')}</li>`
    + `<li><svg width="24" height="24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="6" fill="var(--c-prob)" fill-opacity=".16"/></svg>${t('metro.key.free')}</li>`
    + `<li><svg width="24" height="24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="#fff" stroke="var(--c-abm)" stroke-width="1.5" stroke-dasharray="4 3"/></svg>${t('metro.key.soon')}</li>`
    + `</ul>`;
  const pick = lid => api.setRoute(api.route() && api.route().id === lid ? '' : lid, true);
  legend.addEventListener('click', e => { const b = e.target.closest('[data-route]'); if (b) pick(b.dataset.route); });
  svg.addEventListener('click', e => {
    const s = e.target.closest('.st:not(.plan)'); if (s) { api.openFrom(s.dataset.id, s); return; }
    const l = e.target.closest('.ln'); if (l) pick(l.dataset.route);
  });
  svg.addEventListener('keydown', e => { const s = e.target.closest('.st:not(.plan)');
    if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); api.openFrom(s.dataset.id, s); } });
  linear.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) api.openFrom(b.dataset.id, b); });
  if (zoomBtn) zoomBtn.addEventListener('click', () => { const on = card.classList.toggle('zoomed');
    zoomBtn.setAttribute('aria-pressed', String(on)); zoomBtn.textContent = t(on ? 'metro.unzoom' : 'metro.zoom'); });

  // ---------- «Ты здесь»: ближайшая станция по ходу курса ----------
  const order = M.nodes.map(n => n.id);
  function stationFor(id){
    if (!id) return null;
    if (L.stations[id]) return id;
    const c = node.get(id).course, i = order.indexOf(id);
    return order.find((x, j) => j >= i && L.stations[x] && node.get(x).course === c) || course[c].main;
  }

  // ---------- состояние ----------
  let selId = null;
  function paint(s){
    const r = s.route, rid = r ? r.id : '', mine = rid === 'mine';     // «Твой маршрут» рисуем по линии «Весь путь», гасим чужие станции
    svg.classList.toggle('routing', !!r);
    svg.querySelectorAll('.ln').forEach(g => g.classList.toggle('on', g.dataset.route === (mine ? 'full' : rid)));
    svg.querySelectorAll('.st:not(.plan)').forEach(g => {
      const id = g.dataset.id, on = !r || (mine ? r.nodes.includes(id) : stops.get(id).includes(rid));
      g.classList.toggle('off', !on); g.classList.toggle('done', s.known(id));
    });
    legend.querySelectorAll('[data-route]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.route === rid)));
    // маркер
    const here = stationFor(s.nx), pin = document.getElementById('here-pin');
    if (here && (s.any || r)){
      const k = stInfo.get(here), ring = k.r + 4, up = k.side !== 'a';   // плашка над станцией; если подпись сверху — под ней
      pin.setAttribute('transform', `translate(${k.cx} ${k.cy})`);
      pin.querySelector('.hp-ring').setAttribute('r', ring);
      const tx = pin.querySelector('text'); tx.textContent = t(s.any ? 'metro.here' : 'metro.start');
      pin.style.display = '';
      const w = Math.ceil((tx.getComputedTextLength ? tx.getComputedTextLength() : 60) + 20), gap = ring + 7;
      const top = up ? -gap - 22 : gap, rect = pin.querySelector('rect');
      rect.setAttribute('x', -w / 2); rect.setAttribute('width', w); rect.setAttribute('y', top);
      tx.setAttribute('y', top + 15);
      pin.querySelector('.hp-leg').setAttribute('d', up ? `M0 ${-ring - 1}V${-gap}` : `M0 ${ring + 1}V${gap}`);
    } else pin.style.display = 'none';
    svg.querySelectorAll('.st.here').forEach(g => { g.classList.remove('here'); g.querySelector('.sl').removeAttribute('transform'); });
    if (here && (s.any || r)){
      const g = document.getElementById('ms-' + here), sd = stInfo.get(here).side;
      g.classList.add('here');
      g.querySelector('.sl').setAttribute('transform', `translate(${sd === 'l' ? -5 : sd === 'r' ? 5 : 0} ${sd === 'a' ? -5 : sd === 'b' ? 5 : 0})`);
    }
    // линейный вид (узкий экран): выбранный маршрут сверху вниз
    card.classList.toggle('has-route', !!r);
    linear.innerHTML = r ? linearHtml(mine ? 'full' : rid, here && (s.any || r) ? here : null, s, mine ? r : null) : '';
    linear.style.setProperty('--line', r ? L.lines[mine ? 'full' : rid].color : '');
    select(selId);
  }
  function linearHtml(rid, here, s, mine){
    const ln = L.lines[rid];
    const seq = ln.path.filter(x => typeof x === 'string' && stops.get(x).includes(rid) && (!mine || mine.nodes.includes(x))).map(id => [id, false])
      .concat((ln.cont || []).slice(1).filter(x => typeof x === 'string').map(id => [id, true]));
    let prev = null, out = '';
    seq.forEach(([id, later]) => {
      const n = node.get(id), c = course[n.course];
      if (n.course !== prev){
        out += `<li class="lz z-${c.status}${NUM[c.id] && NUM[c.id].optional && rid === 'full' ? ' opt' : ''}" style="--zc:var(${c.color})">${NUM[c.id] ? `<span class="lz-n">${NUM[c.id].n}</span>` : ''}<span class="lz-t">${esc(typo(c.title))}</span> <span class="lz-s">${esc(typo(M.status[c.status]))} · ${esc(lv(c))}${NUM[c.id] && NUM[c.id].optional ? ' · ' + esc(t('ui.optional')) : ''}</span></li>`;
        prev = n.course;
      }
      const others = stops.get(id).filter(l => l !== rid);
      out += `<li class="ls${n.main ? ' main' : ''}${later ? ' later' : ''}${id === here ? ' here' : ''}${s.known(id) ? ' done' : ''}">`
        + `<button type="button" class="ls-b" data-id="${id}" aria-controls="panel"><span class="dot" aria-hidden="true"></span>`
        + `<span class="ls-n">${esc(sname(id))}</span>`
        + (n.main ? `<span class="ls-m">${t('ui.main')}</span>` : '')
        + (id === here ? `<span class="ls-h">${t(s.any ? 'metro.here' : 'metro.start')}</span>` : '')
        + (s.known(id) ? `<span class="ls-d">✓ ${s.knownLabel ? s.knownLabel(id) : t('ui.done')}</span>` : '')
        + (others.length ? `<span class="ls-x">${t('metro.xfer', {list: others.map(l => `<span class="sw" style="--line:${L.lines[l].color}"></span>${t('line.' + l)}`).join(', ')})}</span>` : '')
        + `</button></li>`;
    });
    return out;
  }
  function select(id){
    selId = id;
    svg.querySelectorAll('.st.sel').forEach(g => g.classList.remove('sel'));
    svg.querySelectorAll('.st[aria-expanded]').forEach(g => g.setAttribute('aria-expanded', 'false'));
    if (id && L.stations[id]){ const g = document.getElementById('ms-' + id); g.classList.add('sel'); g.setAttribute('aria-expanded', 'true'); }
    linear.querySelectorAll('.ls-b').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.id === id)));
  }
  return {paint, select, has: id => !!L.stations[id], el: id => document.getElementById('ms-' + id)};
}
})(typeof window !== 'undefined' ? window : globalThis);
