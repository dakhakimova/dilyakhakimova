/* «Весь путь» на главной — компактный список станций 1–6 по данным map/skills.json (маршрут full, порядок и «необязательно»).
   Вызывается из tools/build-site.js при сборке: пункты вписываются в index.html между <!-- path --> и <!-- /path -->.
   Станция: круглая картинка (pic) с номером на краю, название ссылкой и метки в одну строку
   (статус · уровень · время hours у бесплатных или цена у платных · «необязательно»), под ними строка-задача (task).
   Стили — .path-list в home.css. li.dim — отрезки после последнего бесплатного курса (линия бледнее), li.later — неготовый курс (картинка выцветшая).
   o: {L: {free, soon, later, optional, price, level, lvl: {1, 2, 3}}, tx — экранировать и прогнать типограф, esc} */
'use strict';
function render(M, o){
  const course = Object.fromEntries(M.courses.map(c => [c.id, c]));
  const FULL = M.routes.find(r => r.id === 'full');
  if (!FULL) throw new Error('map/skills.json: нет маршрута full');
  const {L, tx, esc} = o, nb = s => esc(s).replace(/ /g, '&nbsp;');
  const lastFree = FULL.path.reduce((a, p, i) => course[p.course].status === 'free' ? i : a, -1);
  const status = s => s === 'free' ? L.free : s === 'soon' ? L.soon : L.later;
  return FULL.path.map((p, i) => { const c = course[p.course], free = c.status === 'free';
    if (!c.task || !c.pic) throw new Error('map/skills.json: у курса ' + c.id + ' нет task или pic');
    const cls = [lastFree >= 0 && i >= lastFree ? 'dim' : '', free ? '' : 'later'].filter(Boolean).join(' ');
    const chips = `<span class="tag ${c.status}">${tx(status(c.status))}</span>`
      + `<span class="chip"><span class="lvl l${c.level}" aria-hidden="true"></span><span class="vh">${tx(L.level)} </span>${tx(L.lvl[c.level])}</span>`
      + (free ? (c.hours ? `<span class="tag">${nb(c.hours)}</span>` : '') : `<span class="price"><b>${L.price}</b></span>`)
      + (p.optional ? `<span class="tag opt">${tx(L.optional)}</span>` : '');
    return `<li${cls ? ` class="${cls}"` : ''}><span class="pn pic"><img src="${esc(c.pic)}" width="120" height="120" loading="lazy" alt=""><span class="pnum" aria-hidden="true">${i + 1}</span></span>`
      + `<div><p class="pt"><a href="${c.url}">${tx(c.title)}</a> <span class="chips">${chips}</span></p>`
      + `<p class="pg">${tx(c.task)}</p></div></li>`; }).join('');
}
module.exports = {render};
