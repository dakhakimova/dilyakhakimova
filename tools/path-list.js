/* «Весь путь» на главной — компактный список станций 1–6 по данным map/skills.json (маршрут full, порядок и «необязательно»).
   Вызывается из tools/build-site.js при сборке: пункты вписываются в index.html между <!-- path --> и <!-- /path -->.
   Станция: круглая картинка (pic) с номером на краю, название ссылкой и метки в одну строку
   («бесплатно» или цена · уровень · время hours у бесплатных · «необязательно» · у неготовых — статус последним, серым), под ними описание курса
   (lead с заглавной и с точкой, плюс why необязательного шага, если он не quiet) и мелкая строка из prereq
   («Ничего не нужно знать заранее: …» или «Проверь себя: ты уже …»); между ними — «Термины: a · b · …» из terms курса
   (термин с опубликованной страницей /terms/ — тихая ссылка, o.termHref). Тексты — те же, что шли в «Весь путь» на /map/.
   Стили — .path-list в home.css. li.dim — отрезки после последнего бесплатного курса (линия бледнее), li.later — неготовый курс (картинка выцветшая).
   o: {L: {free, soon, later, optional, price, level, lvl: {1, 2, 3}, pre(list) — «Проверь себя: ты уже {list}.», terms — «Термины:»}, termHref(термин) — адрес страницы термина или пусто, tx — экранировать и прогнать типограф, esc} */
'use strict';
function render(M, o){
  const course = Object.fromEntries(M.courses.map(c => [c.id, c]));
  const FULL = M.routes.find(r => r.id === 'full');
  if (!FULL) throw new Error('map/skills.json: нет маршрута full');
  const {L, tx, esc} = o, nb = s => esc(s).replace(/ /g, '&nbsp;'), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const lastFree = FULL.path.reduce((a, p, i) => course[p.course].status === 'free' ? i : a, -1);
  const status = s => s === 'free' ? L.free : s === 'soon' ? L.soon : L.later;
  return FULL.path.map((p, i) => { const c = course[p.course], free = c.status === 'free';
    if (!c.pic) throw new Error('map/skills.json: у курса ' + c.id + ' нет pic');
    const pre = c.prereq ? (c.prereq.none ? tx(c.prereq.none) : L.pre(tx(c.prereq.know.join('; ')))) : '';
    const cls = [lastFree >= 0 && i >= lastFree ? 'dim' : '', free ? '' : 'later'].filter(Boolean).join(' ');
    // метки: первая — «сколько стоит» (бесплатно или цена на том же месте), дальше уровень, время у бесплатных, «необязательно»;
    // статус неготового курса («скоро», «позже») — последним, приглушённым (tag muted)
    const chips = (free ? `<span class="tag free">${tx(L.free)}</span>` : `<span class="price"><b>${L.price}</b></span>`)
      + `<span class="chip"><span class="lvl l${c.level}" aria-hidden="true"></span><span class="vh">${tx(L.level)} </span>${tx(L.lvl[c.level])}</span>`
      + (free && c.hours ? `<span class="tag">${nb(c.hours)}</span>` : '')
      + (p.optional ? `<span class="tag opt">${tx(L.optional)}</span>` : '')
      + (free ? '' : `<span class="tag muted">${tx(status(c.status))}</span>`);
    return `<li${cls ? ` class="${cls}"` : ''}><span class="pn pic"><img src="${esc(c.pic)}" width="120" height="120" loading="lazy" alt=""><span class="pnum" aria-hidden="true">${i + 1}</span></span>`
      + `<div><p class="pt">${free ? `<a href="${c.url}">${tx(c.title)}</a>` : `<span class="pt-name">${tx(c.title)}</span>`} <span class="chips">${chips}</span></p>`  // платные — без ссылки, пока страницы не вычитаны (Диля, 23.11)
      + `<p class="pg">${tx(cap(c.lead))}.${p.why && !p.quiet ? ' ' + tx(cap(p.why)) + '.' : ''}</p>`
      + (c.terms && c.terms.length ? `<p class="pp pterms">${tx(L.terms)} ${c.terms.map(x => { const h = o.termHref && o.termHref(x);
          const w = tx(x).replace(/<span class="nw">(.*?)<\/span>/g, '$1');   // термин целиком в строке: «z-тест» не рвётся
          return h ? `<a class="nw" href="${h}">${w}</a>` : `<span class="nw">${w}</span>`; }).join('&nbsp;· ')}</p>` : '')
      + (pre ? `<p class="pp">${pre}</p>` : '') + `</div></li>`; }).join('');
}
module.exports = {render};
