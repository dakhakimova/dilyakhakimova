/* Схема метро на «Карте навыков» (/map/) — основной вид страницы. Подробный граф всех навыков рисует map/map.js ниже.
   Линии = маршруты из map/skills.json (routes), станции = ключевые навыки (узлы nodes), зоны = курсы, пунктир = курсы «в планах».
   Здесь две части:
   1) LAYOUT — данные схемы: координаты станций на сетке (viewBox 1200 × 720, отрезки только под 0/45/90°), пути линий,
      цвета, зоны курсов. Остановка линии на станции = навык есть в маршруте; иначе линия идёт мимо (не останавливается).
      Проверка схемы (станции — настоящие узлы, порядок остановок = порядок маршрута, углы 0/45/90°, тексты metro.* есть):
      node tools/check-map.js.
   2) SkillMetro.init(api) — рисует SVG, легенду линий, линейный вид для узких экранов («линия сверху вниз»)
      и маркер «Ты здесь». Состояние (маршрут, прогресс, панель навыка) остаётся в map.js, сюда приходит через api.
   Тексты — metro.* и line.* в i18n/map.js; короткие имена станций — metro.st.<id>. */
(function (root) {
'use strict';

const LAYOUT = {
  w: 1200, h: 720,
  // линия: цвет, сдвиг от осевой (px, + — слева по ходу) на общих перегонах, путь — id станций и точки изгибов [x, y];
  // cont — продолжение «дальше» (курс «позже», вне маршрута): бледная линия того же цвета
  lines: {
    product:   {color: '#E8644A', off: 0,  path: ['ap-random', 'ap-interval', 'ap-mde', 'ap-decide']},
    analyst:   {color: '#23418A', off: -4, path: ['ss-share', [150, 170], 'vp-bayes', 'vp-mean', 'vp-interview', [560, 100], [640, 180],
                                                   'ss-clt', 'ss-aa', 'ss-errors', 'ss-main', [640, 560], [700, 620], 'ps-interval', 'ps-power', 'ps-regression', 'ps-sim']},
    interview: {color: '#0E7E5F', off: 4,  path: ['vp-outcomes', 'vp-bayes', 'vp-mean', 'vp-interview', [560, 100], [640, 180], 'ss-clt', 'ss-aa', 'ss-errors', 'ss-main']},
    abtester:  {color: '#C9A43A', off: 4,  path: ['ps-power', 'ps-regression', 'ps-sim', [1110, 620], [1150, 580], 'abm-design', 'abm-cuped', 'abm-srm', 'abm-main'],
                cont: ['abm-main', [1150, 120], [1110, 80], 'ci-confound', 'ci-did', 'ci-main']}
  },
  // станция: [x, y, где подпись: a — над, b — под, l — слева, r — справа]
  stations: {
    'vp-outcomes': [90, 100, 'a'], 'vp-bayes': [220, 100, 'a'], 'vp-mean': [350, 100, 'a'], 'vp-interview': [480, 100, 'a'],
    'ss-share': [150, 250, 'r'],
    'ss-clt': [640, 270, 'l'], 'ss-aa': [640, 360, 'l'], 'ss-errors': [640, 450, 'l'], 'ss-main': [640, 540, 'l'],
    'ap-random': [90, 640, 'b'], 'ap-interval': [200, 640, 'b'], 'ap-mde': [310, 640, 'b'], 'ap-decide': [420, 640, 'b'],
    'ps-interval': [770, 620, 'b'], 'ps-power': [880, 620, 'b'], 'ps-regression': [990, 620, 'b'], 'ps-sim': [1100, 620, 'b'],
    'abm-design': [1150, 500, 'l'], 'abm-cuped': [1150, 410, 'l'], 'abm-srm': [1150, 320, 'l'], 'abm-main': [1150, 230, 'l'],
    'ci-confound': [1000, 80, 'b'], 'ci-did': [890, 80, 'b'], 'ci-main': [780, 80, 'b']
  },
  // строится: курсы «в планах» (status: planned). Станция ведёт к карточке #plan-<course>.
  planned: {
    stations: {bet: [720, 260, 'r', 'luck'], luck: [720, 350, 'r', 'luck'], mkt: [850, 455, 'b', 'mkt'], talk: [540, 640, 'b', 'talk']},
    paths: [[[640, 180], 'bet', 'luck', [720, 370], [805, 455], 'mkt', [1150, 455]], ['ap-decide', 'talk']]
  },
  // зоны курсов: прямоугольники [x, y, w, h]; подпись — в левом верхнем углу первого
  zones: {
    prob: [[30, 14, 520, 150]],
    sig:  [[430, 212, 250, 360], [90, 212, 260, 78]],
    ab:   [[30, 592, 470, 116]],
    st:   [[700, 574, 488, 134]],
    abm:  [[935, 156, 253, 374]],
    cau:  [[700, 14, 488, 130]]
  }
};
root.SkillMetroLayout = LAYOUT;
if (typeof document === 'undefined') return;                 // node: нужен только LAYOUT (tools/check-map.js)

const NS = 'http://www.w3.org/2000/svg';
const INK = '#24221F', PLAN = '#8A847A';
const R = {main: 12, st: 7, single: 10};

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
  let html = `<title>${esc(t('metro.label'))}</title>`;
  // зоны
  Object.entries(L.zones).forEach(([cid, rects]) => { const c = course[cid];
    html += `<g class="zone z-${c.status}" style="--zc:var(${c.color})">` + rects.map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="16"/>`).join('')
      + `<text class="zt" x="${rects[0][0] + 14}" y="${rects[0][1] + 24}">${esc(has('metro.zone.' + cid) ? t('metro.zone.' + cid) : typo(c.title))}`
      + (rects[0][2] < 400 ? `<tspan class="zs" x="${rects[0][0] + 14}" dy="16">` : `<tspan class="zs" dx="8">`)   // узкая зона — статус второй строкой
      + `${esc(typo(M.status[c.status]))} · ${esc(lv(c))}</tspan></text></g>`;
  });
  // строится
  html += `<g class="plan-ln" aria-hidden="true">` + L.planned.paths.map(p => `<path d="${dstr(p.map(pt))}"/>`).join('') + `</g>`;
  // линии
  ids.forEach(lid => { const ln = L.lines[lid];
    const d = dstr(offsetPts(ln.path, ln.off));
    html += `<g class="ln" data-route="${lid}" style="--line:${ln.color}">`
      + (ln.cont ? `<path class="cont" d="${dstr(offsetPts(ln.cont, ln.off))}"/>` : '')
      + `<path class="hit" d="${d}"/><path class="stroke" d="${d}"/></g>`;
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
    else if (lines.length > 1){ r = big ? R.main : R.st + 2;
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
  html += `<g class="here-pin" id="here-pin" aria-hidden="true" style="display:none"><circle r="19"/><rect x="-40" y="-52" width="80" height="24" rx="12"/><text y="-35" text-anchor="middle"></text></g>`;
  svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`);
  svg.innerHTML = html;

  // ---------- легенда: линии — переключатель маршрута ----------
  legend.innerHTML = `<ul class="ml-lines" role="list">` + ids.map(lid => `<li><button type="button" class="ml-line" data-route="${lid}" aria-pressed="false" style="--line:${L.lines[lid].color}">`
      + `<span class="sw" aria-hidden="true"></span>${t('line.' + lid)}</button></li>`).join('') + `</ul>`
    + `<ul class="ml-keys" role="list">`
    + `<li><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="#fff" stroke="${INK}" stroke-width="3"/></svg>${t('metro.key.xfer')}</li>`
    + `<li><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#23418A"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>${t('metro.key.main')}</li>`
    + `<li><svg width="40" height="24" aria-hidden="true"><path d="M2 12H38" stroke="#C9A43A" stroke-opacity=".45" stroke-width="4"/><circle cx="20" cy="12" r="6" fill="#fff" stroke="#C9A43A" stroke-width="2.5"/></svg>${t('metro.key.later')}</li>`
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
    const r = s.route, rid = r ? r.id : '';
    svg.classList.toggle('routing', !!r);
    svg.querySelectorAll('.ln').forEach(g => g.classList.toggle('on', g.dataset.route === rid));
    svg.querySelectorAll('.st:not(.plan)').forEach(g => {
      const id = g.dataset.id, on = !r || stops.get(id).includes(rid);
      g.classList.toggle('off', !on); g.classList.toggle('done', s.known(id));
    });
    legend.querySelectorAll('[data-route]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.route === rid)));
    // маркер
    const here = stationFor(s.nx), pin = document.getElementById('here-pin');
    if (here && (s.any || r)){
      const k = stInfo.get(here);
      pin.setAttribute('transform', `translate(${k.cx} ${k.cy})`);
      const up = k.side === 'b';                                // ярлык — с той стороны, где нет подписи станции
      pin.querySelector('rect').setAttribute('y', up ? -52 : 28); pin.querySelector('text').setAttribute('y', up ? -35 : 45);
      pin.querySelector('text').textContent = t(s.any ? 'metro.here' : 'metro.start');
      pin.style.display = '';
    } else pin.style.display = 'none';
    svg.querySelectorAll('.st.here').forEach(g => g.classList.remove('here'));
    if (here && (s.any || r)) document.getElementById('ms-' + here).classList.add('here');
    // линейный вид (узкий экран): выбранный маршрут сверху вниз
    card.classList.toggle('has-route', !!r);
    linear.innerHTML = r ? linearHtml(rid, here && (s.any || r) ? here : null, s) : '';
    linear.style.setProperty('--line', r ? L.lines[rid].color : '');
    select(selId);
  }
  function linearHtml(rid, here, s){
    const ln = L.lines[rid];
    const seq = ln.path.filter(x => typeof x === 'string' && stops.get(x).includes(rid)).map(id => [id, false])
      .concat((ln.cont || []).slice(1).filter(x => typeof x === 'string').map(id => [id, true]));
    let prev = null, out = '';
    seq.forEach(([id, later]) => {
      const n = node.get(id), c = course[n.course];
      if (n.course !== prev){
        out += `<li class="lz z-${c.status}" style="--zc:var(${c.color})"><span class="lz-t">${esc(typo(c.title))}</span> <span class="lz-s">${esc(typo(M.status[c.status]))} · ${esc(lv(c))}</span></li>`;
        prev = n.course;
      }
      const others = stops.get(id).filter(l => l !== rid);
      out += `<li class="ls${n.main ? ' main' : ''}${later ? ' later' : ''}${id === here ? ' here' : ''}${s.known(id) ? ' done' : ''}">`
        + `<button type="button" class="ls-b" data-id="${id}" aria-controls="panel"><span class="dot" aria-hidden="true"></span>`
        + `<span class="ls-n">${esc(sname(id))}</span>`
        + (n.main ? `<span class="ls-m">${t('ui.main')}</span>` : '')
        + (id === here ? `<span class="ls-h">${t(s.any ? 'metro.here' : 'metro.start')}</span>` : '')
        + (s.known(id) ? `<span class="ls-d">✓ ${t('ui.done')}</span>` : '')
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
