/* Мост между главами бесплатных курсов и страницами игр /play/<slug>/.
   Подключается в <head> каждой главы (до progress.js и движка): <script src="/play/bridge.js?v=…"></script>

   Разметка в главе (подробно — /home/claude/play-guide.md, §4):
     <section class="card" data-toy="galton">       — карточка с игрой (slug латиницей);
     <section class="card" data-toy-pre="galton">   — необязательно: карточка «сначала угадай» к ней (показывается выше игры);
     data-toy-reveal  — у блока внутри этих карточек: на /play/ скрыт до первого касания игры (спойлер: «Как правильно…»);
     data-toy-hide    — у блока внутри этих карточек: на /play/ не показывается вовсе (отсылки к курсу, «страшное слово» и т. п.).
   В самом курсе обе пометки ничего не меняют.

   1. Соло-режим: глава открыта как …/07-distribution.html?toy=galton — видны только эти карточки, без шапки,
      оглавления и листалки; баллы, прогресс и догадки не пишутся (движки смотрят на PLAY_SOLO и держат всё в памяти).
      Так страница /play/<slug>/ показывает игру в iframe: код игры один — тот, что в главе.
      Под игрой — подпись «Игра из курса „…“, шаг N — dilyakhakimova.com · <статус курса>» из /play/credits.json
      (его собирает tools/build-play.js из play/courses.json — статус курса задаётся там). С &embed=1 ссылки открываются в новой вкладке.
      Родителю уходят сообщения: {type:'toy:h', h} — высота; {type:'toy:interact'} — первое касание игры
      (по нему раскрывается вывод); {type:'toy:guess'} — сделан прогноз.
   2. В обычном режиме под каждой карточкой с data-toy, у которой уже есть страница на /play/ (есть в credits.json), —
      кнопка «Поделиться игрой»: Web Share API на телефоне, копирование ссылки на десктопе.

   3. Анонимный счётчик (POST /api/hit → таблица toy_hits): «сыграл» = первое взаимодействие с игрой за загрузку страницы,
      в курсе (place 'course') и во встраивании (place 'embed', source — домен сайта); на /play/<slug>/ считает play/play.js.
      Только на боевом домене, через navigator.sendBeacon, ошибки молча; не чаще одного события на игру и вид за загрузку.

   Строки — в PLAY_STR (готово к /en/: язык из <html lang>). */
(function(){
  const PLAY_STR = {
    ru: {
      share: 'Скопировать ссылку',
      copied: 'Ссылка скопирована',
      copyFail: 'Скопируй ссылку: ',
      guessNote: 'Сначала запиши догадку, потом проверь на игре ниже.',
      preTag: 'Сначала угадай',
      checkTag: 'Потом проверь',
    },
  };
  const lang = (document.documentElement.lang || 'ru').slice(0, 2);
  const T = Object.assign({}, PLAY_STR.ru, PLAY_STR[lang] || {});
  const q = new URLSearchParams(location.search);
  const slug = (q.get('toy') || '').toLowerCase();
  const ok = /^[a-z0-9-]{1,40}$/.test(slug);
  const root = document.documentElement;
  const base = location.origin + (lang !== 'ru' ? '/' + lang : '') + '/play/';
  // список опубликованных игр и подписи к ним — /play/credits.json (собирает tools/build-play.js)
  // (cache: 'no-cache' — браузер переспрашивает сервер по ETag, так новая игра видна без смены версий)
  let credits = null;
  const loadCredits = () => credits || (credits = fetch(base + 'credits.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({})));

  // ---------- счётчик: одно событие на (игра, место, вид) за загрузку страницы; локально и на превью не шлём ----------
  const sent = new Set();
  const hit = (slug, place, kind, source) => {
    const k = slug + '|' + place + '|' + kind;
    if (sent.has(k) || !/^(www\.)?dilyakhakimova\.com$/.test(location.hostname) || !navigator.sendBeacon) return;
    sent.add(k);
    try { navigator.sendBeacon('/api/hit', JSON.stringify({slug, place, kind, source: source || ''})); } catch(e) {}
  };
  const utm = (q => (q.get('utm_source') || '').slice(0, 60))(new URLSearchParams(location.search));
  // первое осмысленное касание карточки игры: кнопка, ползунок, выбор, холст (не прокрутка и не просмотр).
  // Прогноз внутри карточки игры — не касание: ставка (.choice[data-key]), поле догадки (.guess, жёлтый лист c-butter,
  // поле .guess-in, id …-guess) только записывает догадку, вывод должен ждать, пока человек сыграет.
  const GUESS = '[data-key], .guess, [data-guess], .c-butter, input.guess-in, [id$="-guess"]';
  const onFirstTouch = (card, fn) => {
    const evs = ['click', 'input', 'change'];
    const h = e => { const t = e.target; if (!t.closest || !t.closest('button, input, select, canvas, [role=button]') || t.closest('.toy-share') || t.closest(GUESS)) return; evs.forEach(ev => card.removeEventListener(ev, h)); fn(); };
    evs.forEach(ev => card.addEventListener(ev, h));
  };

  // ---------- общий помощник «поделиться» ----------
  // одна кнопка «Поделиться»: системное меню (navigator.share — телефон, Safari), иначе ссылка в буфер
  // и на 2 секунды «Ссылка скопирована» рядом с кнопкой
  window.PlayShare = async function(url, title, text, statusEl){
      // только копируем ссылку (Диля, 23.11): системное меню «Поделиться» не открываем
    const say = (m, ms) => { if (!statusEl) return; statusEl.textContent = m; clearTimeout(statusEl._t); if (ms) statusEl._t = setTimeout(() => { statusEl.textContent = ''; }, ms); };
    try { await navigator.clipboard.writeText(url); say(T.copied, 2000); return 'copied'; }
    catch(e) { say(T.copyFail + url); return 'fail'; }
  };

  // ---------- ползунки (гайд: «Ползунок не дублирует параметр из вопроса», «У ползунка есть способ без перетаскивания»,
  // «Сначала условия вопроса, ползунок — потом») ----------
  // [data-sandbox] — ползунок, который меняет условие из вопроса прогноза: скрыт, пока человек не сыграл на условии вопроса.
  // У каждого видимого ползунка — шаги «−» и «+» (stepDown/stepUp + события input и change, как при перетаскивании).
  // холсты рисуются до загрузки шрифта: после загрузки Onest просим графики перерисоваться
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => window.dispatchEvent(new Event('resize')));
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.card [data-sandbox][hidden]').forEach(box => {
      const card = box.closest('.card');
      onFirstTouch(card, () => { box.hidden = false; window.dispatchEvent(new Event('resize')); });
    });
    document.querySelectorAll('.card input[type=range]').forEach(r => {
      if (r.closest('.range-steps')) return;
      const lab = (r.getAttribute('aria-label') || (r.labels && r.labels[0] ? r.labels[0].textContent : '') || '').replace(/\s+/g, ' ').trim().replace(/:.*$/, '');
      const wrap = document.createElement('span'); wrap.className = 'range-steps';
      const mk = (txt, dir) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost step'; b.textContent = txt;
        b.setAttribute('aria-label', (dir < 0 ? 'Меньше' : 'Больше') + (lab ? ': ' + lab.toLowerCase() : ''));
        b.addEventListener('click', () => {
          const v0 = r.value; dir < 0 ? r.stepDown() : r.stepUp();
          if (r.value !== v0){ r.dispatchEvent(new Event('input', {bubbles: true})); r.dispatchEvent(new Event('change', {bubbles: true})); }
        });
        return b;
      };
      r.parentNode.insertBefore(wrap, r);
      wrap.append(mk('−', -1), r, mk('+', 1));
    });
  });

  // ---------- тянуть сам объект, а не ползунок рядом (Норман, соответствие) ----------
  // Игра в своём draw() кладёт на холст обратное отображение: cv._inv = (x, y) => значение ползунка (x, y — css-пиксели холста).
  // Вызов window.dragObject(cv, range) один раз: касание или протяжка по холсту ставят ползунок (input + change), как будто тянули его.
  // Ползунок остаётся для клавиатуры и точного значения; курсор над холстом — «тянуть».
  window.dragObject = function(cv, range){
    if (!cv || !range || cv._dragOn) return; cv._dragOn = true;
    cv.style.cursor = 'ew-resize'; cv.style.touchAction = 'pan-y';
    let down = false;
    const set = ev => {
      if (!cv._inv) return; const r = cv.getBoundingClientRect(); let v = cv._inv(ev.clientX - r.left, ev.clientY - r.top);
      if (v == null || !Number.isFinite(+v)) return;
      const lo = +range.min, hi = +range.max, st = +range.step || 1; v = Math.min(hi, Math.max(lo, Math.round((v - lo) / st) * st + lo));
      const nv = String(+v.toFixed(6)); if (range.value === nv) return;
      range.value = nv; range.dispatchEvent(new Event('input', {bubbles: true}));
    };
    cv.addEventListener('pointerdown', ev => { down = true; cv.closest('.card') && cv.closest('.card').classList.add('dragging'); try { cv.setPointerCapture(ev.pointerId); } catch(e) {} set(ev); });
    cv.addEventListener('pointermove', ev => { if (down) set(ev); });
    const up = () => { if (!down) return; down = false; range.dispatchEvent(new Event('change', {bubbles: true})); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  };

  // ---------- одна кнопка на игру (решение Дили, 22.11.2026; правила — play/ui.json → _doc, гайд, «Страница игры») ----------
  // До первого запуска: вопрос, прогноз и ОДНА главная кнопка, она проводит весь опыт из вопроса.
  // После: «Ещё раз» (контурная; сброс + тот же опыт) и, если нужен масштаб, одна контурная кнопка второй ступени (×1000).
  // Исходные кнопки игры остаются в разметке скрытыми — их нажимает мост, движок игры не меняется.
  // Горячие клавиши: Пробел — главная кнопка, Shift+Пробел — ×1000 (не перехватываем, когда фокус в поле или на кнопке).
  const UI_STR = {again: 'Ещё раз', yourGuess: 'Твой прогноз: ', keySpace: 'Пробел', keyShift: 'Shift + Пробел'};
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
  const sleep = ms => new Promise(r => setTimeout(r, REDUCED.matches ? 0 : ms));
  root.classList.add('ui-pending');
  { const st = document.createElement('style');
    st.textContent = 'html.ui-pending .card[data-toy] .controls{visibility:hidden} [data-ui-hidden]{display:none !important} .ui-guess{font:400 .875rem/1.3 var(--body, Onest, sans-serif); color:#5E5A53; align-self:center} .ui-guess b{font-weight:500; color:#24221F}';
    document.head.appendChild(st); }
  // ответ как его поняли: «−10», а не «-10»; «0.5», а не «0,5» (пары 29–30, 90, 119)
  const normAns = s => String(s).trim().replace(/^[-–]\s*/, '−').replace(/(\d),(\d)/g, '$1.$2');
  const guessOf = (card, slug) => {
    const cards = [card, ...document.querySelectorAll(`.card[data-toy-pre~="${slug}"]`)];
    for (const c of cards){
      const box = c.querySelector('.guess.saved'), inp = box && box.querySelector('input');
      if (inp && inp.value.trim()){ const u = box.dataset.unit ?? '%'; return normAns(inp.value).replace(/\s*%$/, '') + (u === '%' ? '%' : u ? ' ' + u : ''); }
      const ch = c.querySelector('.choice[data-key] button[aria-pressed="true"], .choice[data-key] button.picked');
      if (ch && !ch.closest('.quiz')) return ch.textContent.trim();
    }
    return '';
  };
  const applyUi = (card, slug, cfg) => {
    const q = sel => card.querySelector(sel) || null;
    const steps = (cfg.run || []).map(x => typeof x === 'string' ? {sel: x, n: 1, ms: 0} : x);
    const first = steps.map(x => q(x.sel)).find(Boolean);
    if (!first) return;
    const row = first.closest('.controls') || first.parentNode;
    const keep = new Set((cfg.keep || []).map(q).filter(Boolean));
    const toHide = [...steps.map(x => x.sel), ...(cfg.reset || []), ...(cfg.hide || []), cfg.big].filter(Boolean).map(q).filter(Boolean);
    toHide.forEach(b => { if (!keep.has(b)) b.setAttribute('data-ui-hidden', ''); });
    const big0 = cfg.big ? q(cfg.big) : null;
    const mk = (txt, cls, key) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt; b.title = key; b.dataset.ui = cls === 'btn' ? 'main' : 'more'; return b; };
    const main = mk(cfg.label, 'btn', UI_STR.keySpace), again = mk(UI_STR.again, 'btn ghost', UI_STR.keySpace);
    main.dataset.ui = 'main'; again.dataset.ui = 'again';
    const show = (el, on) => el && (on ? el.removeAttribute('data-ui-hidden') : el.setAttribute('data-ui-hidden', ''));
    show(again, false);
    const big = big0 ? mk(big0.textContent.trim(), 'btn ghost', UI_STR.keyShift) : null;
    if (big){ big.dataset.ui = 'big'; show(big, false); }
    const note = document.createElement('span'); note.className = 'ui-guess'; show(note, false);
    row.prepend(...[main, again, big, note].filter(Boolean));
    let busy = false, runs = 0;
    const click = el => { if (el && !el.disabled) el.click(); };
    const after = () => {
      show(main, false); show(again, true); show(big, true);
      const g = window.PLAY_SOLO ? '' : guessOf(card, slug); show(note, !!g); if (g) note.innerHTML = UI_STR.yourGuess + '<b></b>', note.querySelector('b').textContent = g;
      window.dispatchEvent(new Event('resize'));
    };
    const run = async () => {
      if (busy) return; busy = true; main.setAttribute('aria-busy', 'true'); again.setAttribute('aria-busy', 'true');
      try {
        if (runs) (cfg.reset || []).forEach(s => click(q(s)));
        for (const st of steps){ const el = q(st.sel); for (let i = 0; i < (st.n || 1); i++){ click(el); if (st.ms) await sleep(st.ms); } }
        runs++; after(); card.dispatchEvent(new CustomEvent('toy:ran', {bubbles: true}));
      } finally { busy = false; main.removeAttribute('aria-busy'); again.removeAttribute('aria-busy'); }
    };
    main.addEventListener('click', () => { run(); });
    again.addEventListener('click', () => { run(); });
    if (big) big.addEventListener('click', () => { click(big0); runs++; after(); card.dispatchEvent(new CustomEvent('toy:ran', {bubbles: true})); });
    card.uiKeys = {main: () => (again.hasAttribute('data-ui-hidden') ? main : again).click(), big: big ? () => !big.hasAttribute('data-ui-hidden') && big.click() : null};
  };
  const uiReady = fetch('/play/ui.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : {}).catch(() => ({}));
  document.addEventListener('DOMContentLoaded', () => {
    const done = () => root.classList.remove('ui-pending');
    setTimeout(done, 1500);
    uiReady.then(U => {
      const toys = (U && U.toys) || {};
      document.querySelectorAll('.card[data-toy]').forEach(card => card.dataset.toy.split(/\s+/).forEach(s => {
        const c = toys[s]; if (c && c.run && !card.dataset.uiDone){ card.dataset.uiDone = s; try { applyUi(card, s, c); } catch(e) { console.warn('ui', s, e); } }
      }));
      done(); window.dispatchEvent(new Event('resize'));
    });
    // Норман, вопрос 5 «что произошло?»: итог игры объявляется — у вердикта, где нет своей роли, role="status"
    document.querySelectorAll('.card[data-toy] .verdict:not([role]):not([aria-live])').forEach(v => v.setAttribute('role', 'status'));
    // вердикт — по отпусканию ползунка: пока тянешь, у карточки класс .dragging (book.css прячет вердикт и крупные числа)
    document.addEventListener('pointerdown', e => { const r = e.target.closest && e.target.closest('.card input[type=range]'); if (r) r.closest('.card').classList.add('dragging'); });
    const drop = () => document.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
    addEventListener('pointerup', drop); addEventListener('pointercancel', drop);
    // Норман, вопрос 7 «это то, что я хотел?»: прогноз рядом с результатом и в играх без «одной кнопки» —
    // после первого касания игры строка «Твой прогноз: …» встаёт над вердиктом (у игр с одной кнопкой она в ряду кнопок)
    document.querySelectorAll('.card[data-toy]').forEach(card => {
      const sl = card.dataset.toy.split(/\s+/)[0];
      const put = () => { if (window.PLAY_SOLO || card.querySelector('.ui-guess')) return; const g = guessOf(card, sl); if (!g) return;
        const at = card.querySelector('.verdict') || card.querySelector('.controls'); if (!at) return;
        const n = document.createElement('p'); n.className = 'ui-guess'; n.innerHTML = UI_STR.yourGuess + '<b></b>'; n.querySelector('b').textContent = g;
        at.before(n); window.dispatchEvent(new Event('resize')); };
      onFirstTouch(card, () => setTimeout(put, 0));
    });
    // горячие клавиши: игра — та карточка, что видна (в соло-режиме — единственная)
    document.addEventListener('keydown', e => {
      if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, button, a, [contenteditable], [role=button], summary')) return;
      const cards = [...document.querySelectorAll('.card[data-toy]')].filter(c => { const r = c.getBoundingClientRect(); return r.height && r.bottom > 0 && r.top < innerHeight; });
      const card = cards[0]; if (!card) return;
      let act = null;
      if (card.uiKeys) act = e.shiftKey ? card.uiKeys.big : card.uiKeys.main;
      else if (!e.shiftKey){ const b = [...card.querySelectorAll('.controls button.btn:not(.ghost)')].find(b => b.offsetParent && !b.disabled); if (b) act = () => b.click(); }
      if (!act) return;
      e.preventDefault(); act();
    });
  });

  if (!ok){
    // ---------- обычный режим: кнопка «Поделиться» в карточках опубликованных игр ----------
    document.addEventListener('DOMContentLoaded', () => {
      const cards = [...document.querySelectorAll('.card[data-toy]')];
      if (!cards.length) return;
      cards.forEach(card => card.dataset.toy.split(/\s+/).forEach(s => onFirstTouch(card, () => hit(s, 'course', 'play', utm))));
      loadCredits().then(pub => {
        const st0 = document.createElement('style');
        st0.textContent = '.toy-share{display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; margin:12px 0 0} .toy-share .share-t{background:none; border:0; padding:8px 0; min-height:44px; font:500 .9375rem/1.2 Onest, "Onest fallback", system-ui, sans-serif; color:#23418A; text-decoration:underline; text-decoration-color:rgba(35,65,138,.35); text-underline-offset:4px; cursor:pointer} .toy-share .share-t:hover, .toy-share .share-t:focus-visible{text-decoration-color:currentColor} .toy-share .note{margin:0}';
        document.head.appendChild(st0);
        cards.forEach(card => {
          const s = card.dataset.toy.split(/\s+/).find(x => pub[x]);
          if (!s) return;
          const box = document.createElement('div'); box.className = 'toy-share';
          const b = document.createElement('button'); b.type = 'button'; b.className = 'share-t'; b.textContent = T.share + ' ↗';
          const st = document.createElement('span'); st.className = 'note'; st.setAttribute('role', 'status');
          box.append(b, st); card.appendChild(box);
          b.addEventListener('click', () => {
            hit(s, 'course', 'share_click', utm);
            const url = base + s + '/?utm_source=share&utm_medium=course&utm_content=' + s;
            const h = card.querySelector('h2'); PlayShare(url, h ? h.textContent.trim() : document.title, '', st);
          });
        });
      });
    });
    return;
  }

  // ---------- соло-режим ----------
  window.PLAY_SOLO = slug;
  // соло-режим и встраивание — не отдельные страницы для поиска: noindex (canonical главы указывает на её основной адрес)
  { const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, follow'; document.head.appendChild(m); }
  root.classList.add('solo');
  const embed = q.get('embed') === '1';
  if (embed) root.classList.add('embed');
  // ?viz=1 — только визуализация: без «Сначала угадай / Потом проверь» и без прогноза (для разборов книг, решение Дили, 23.11.2026)
  const viz = q.get('viz') === '1';
  if (viz) root.classList.add('viz');
  const mine = `.card[data-toy~="${slug}"], .card[data-toy-pre~="${slug}"]`;
  const css = document.createElement('style');
  css.textContent = `
html.solo body{background:transparent; background-image:none}
html.solo nav.top, html.solo .toc-side, html.solo .stage-head, html.solo .pager, html.solo #score{display:none !important}
html.solo .reader{display:block; max-width:none; padding:0; margin:0}
html.solo .stage{max-width:none}
html.solo .card{display:none !important}
html.solo ${mine.replace(/, /g, ', html.solo ')}{display:block !important}
html.solo .card + .card{margin-top:16px}
/* «Сначала угадай» и «Потом проверь» — два отдельных листа с явным зазором */
/* три шага «Сначала угадай» → «Потом проверь» → «Почему так» — три карточки одного стиля (решение Дили, 22.11.2026):
   белый фон, радиус 12, тень 1, отступы 16 × 24, метка сверху; между карточками зазор 24 px вместо линии.
   «Почему так» — такая же карточка на странице /play/ (play/play.css, .play-out). */
html.solo body{padding:4px 4px 8px}
html.solo .card[data-toy-pre], html.solo .card[data-toy]{background:var(--surface, #FBF9F4); border-radius:12px; padding:16px 24px 20px; box-shadow:0 1px 2px rgba(60,40,10,.10), 0 1px 1px rgba(60,40,10,.04)}
html.solo .card[data-toy-pre] + .card{margin-top:24px}
html.solo.pf-wait .card[data-toy]{display:none !important}
html.solo .pf{margin:12px 0 0}
html.solo .pf-mine, html.solo .pf-cmp{font:400 .9375rem/1.45 var(--body, Onest, sans-serif); color:#4A463F; margin:8px 0 0}
html.solo .pf-mine b, html.solo .pf-cmp b, html.solo .pf-q b{font-weight:500; color:#24221F}
html.solo .pf-ask{margin:12px 0 0; padding:12px 16px; background:#FBF1C9; border-radius:8px}
html.solo .pf-q{margin:0 0 8px}
html.solo .pf-row{display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin:0}
html.solo .pf-row .guess-in{width:7em}
html.solo .pf-skip{display:inline-block; margin:8px 0 0; background:none; border:0; padding:8px 0; min-height:44px; font:500 .9375rem/1.2 Onest, sans-serif; color:#23418A; text-decoration:underline; text-underline-offset:4px; cursor:pointer}
html.solo .card .sheet.c-white{box-shadow:none; border:1px solid rgba(36,34,31,.10)}
@media (max-width:620px){ html.solo .card[data-toy-pre], html.solo .card[data-toy]{padding:16px} }
html.solo .card[data-toy] > h2.scene-h{display:none}
html.solo .card > .step-tag:not(.play-pre), html.solo .card[data-toy-pre] > h2, html.solo .card[data-toy-pre] .chat,
html.solo .card .art, html.solo .card .src, html.solo .card .xref, html.solo .toy-share,
html.solo [data-toy-hide], html.solo .plus{display:none !important}
html.solo:not(.touched) [data-toy-reveal]{display:none !important}
html.solo .card[data-toy-pre] .note{margin-bottom:0}
html.solo .card[data-toy-pre] .guess, html.solo .card[data-toy-pre] .choice{margin-bottom:4px}
html.viz .card[data-toy-pre], html.viz .play-pre, html.viz .pf, html.viz .ui-guess, html.viz .card[data-toy] .guess[data-key], html.viz .card[data-toy] .choice[data-key]:not(.quiz *), html.viz .card[data-toy] .lab-guess{display:none !important}
html.viz .play-credit, html.viz .calc-note{display:none !important}
html.viz .card[data-toy]{background:transparent !important; box-shadow:none !important; padding:0 !important}
html.viz body{padding:0}
.play-credit{display:block; margin:10px 2px 0; font:400 .8125rem/1.45 Onest, "Onest fallback", system-ui, sans-serif; color:#5E5A53}
.play-credit a{color:#23418A}
.play-credit .st{white-space:nowrap}
`;
  document.head.appendChild(css);

  // сообщения без секретов, поэтому '*' (встраивают на любые сайты)
  const post = m => { if (parent !== window) parent.postMessage(m, '*'); };
  document.addEventListener('DOMContentLoaded', () => {
    const toy = document.querySelector(`.card[data-toy~="${slug}"]`);
    if (!toy) return;
    const stage = document.querySelector('.stage') || toy.parentNode;
    // подсказка «на следующей карточке проверим» в соло-режиме неверна: игра тут же, ниже
    document.querySelectorAll(`.card[data-toy-pre~="${slug}"] .note, .card[data-toy-pre~="${slug}"] p`).forEach(n => {
      if (!n.children.length && /(следующ|дальше|«Далее»)[^.]*карточк|карточк[^.]*(следующ|дальше)|Жми «Далее»/.test(n.textContent)) n.textContent = T.guessNote;
    });
    // единая метка «Сначала угадай» над прогнозом (свои метки карточек в соло-режиме скрыты)
    const pres = viz ? [] : document.querySelectorAll(`.card[data-toy-pre~="${slug}"]`);
    pres.forEach(c => { const t = document.createElement('span'); t.className = 'step-tag play-pre'; t.textContent = T.preTag; c.prepend(t); });
    // Под меткой «Потом проверь» — сразу визуализация, как у эталона (дни рождения, data-no-scene): заголовок-сцена h2
    // и абзацы главы под ним на /play/<slug>/ не показываются ни у какой игры — вопрос уже в h1 страницы, а это текст главы;
    // в курсе он остаётся (Д4, решение Дили, 22.11.2026)
    const h = toy.querySelector(':scope > h2');
    if (h){
      h.classList.add('scene-h');
      // первый видимый абзац под h2 — описание сцены; абзац-вопрос прямо над полем прогноза или ставкой остаётся
      const shown = el => { while (el && getComputedStyle(el).display === 'none') el = el.nextElementSibling; return el; };
      const nx = shown(h.nextElementSibling);
      if (nx && nx.tagName === 'P' && !nx.className && !nx.hasAttribute('data-toy-reveal') && !nx.querySelector('input, button, select, canvas, svg')){
        const after = shown(nx.nextElementSibling);
        if (!(after && after.matches('.choice, .guess, [data-key], .lab-guess'))) nx.setAttribute('data-toy-hide', '');
      }
    }
    // пара к «Сначала угадай» — «Потом проверь» над игрой (только если есть прогноз)
    if (pres.length){
      const t = document.createElement('span'); t.className = 'step-tag play-pre play-check'; t.textContent = T.checkTag;
      toy.prepend(t);
    }
    // подпись-источник под игрой (видна и в ?embed=1)
    loadCredits().then(c => {
      const x = c[slug]; if (!x) return;
      const p = document.createElement('p'); p.className = 'play-credit';
      p.innerHTML = x.html.replace(/\{target\}/g, embed ? '_blank' : '_top');  // без статуса курса: в игре не продаём
      const cards = [...document.querySelectorAll(mine)], last = cards[cards.length - 1];
      last.after(p); send();
    });
    // высота для родителя
    let last = 0;
    const send = () => { let b = 0; for (const el of stage.children){ if (!el.getClientRects().length) continue; const r = el.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom + (parseFloat(getComputedStyle(el).marginBottom) || 0)); }
      const h = Math.ceil(b + scrollY + 20); if (Math.abs(h - last) > 1){ last = h; post({type: 'toy:h', h, toy: slug}); } };
    new ResizeObserver(send).observe(document.body);
    addEventListener('resize', send); setTimeout(send, 50); setTimeout(send, 600);
    // первое касание игры: раскрыть спойлеры (data-toy-reveal) и сообщить родителю
    // на /play/<slug>/ «сыграл» считает родитель (play/play.js); во встраивании и при прямом заходе — здесь
    const ref = (() => { try { const h = (q.get('ref') || (document.referrer ? new URL(document.referrer).hostname : '')).replace(/^www\./, '').toLowerCase(); return h === 'dilyakhakimova.com' ? '' : h; } catch(e) { return ''; } })();
    const touch = () => { if (root.classList.contains('touched')) return; root.classList.add('touched'); post({type: 'toy:interact', toy: slug}); setTimeout(send, 30);
      if (embed) hit(slug, 'embed', 'play', ref); else if (parent === window) hit(slug, 'play', 'play', utm); };
    onFirstTouch(toy, touch);

    // ---------- прогноз ведёт к действию (решение Дили, 22.11.2026) ----------
    // а) «Сначала угадай»: «Запомнить» фиксирует ответ — и только тогда открывается игра, под ней «Твой ответ: 6%»;
    //    можно и без прогноза («Проверить без прогноза»);
    // б) после первого прогона: «Твой ответ был 6%. Хочешь изменить?» — поле с ответом, «Оставить» (главная) и «Изменить»;
    // в) потом сравнение «твой ответ → изменил на → на самом деле» (truth — из /play/credits.json) и родителю toy:reveal:
    //    на странице /play/ открывается «Почему так»; г) без прогноза — тот же ход без строки «твой ответ».
    const preCards = viz ? [] : [...document.querySelectorAll(`.card[data-toy-pre~="${slug}"]`)];
    const inCard = !preCards.some(c => c.querySelector('.guess[data-key], .choice[data-key]'));
    const preBox = viz ? null : preCards.map(c => c.querySelector('.guess[data-key], .choice[data-key]')).find(Boolean)
      || [...toy.querySelectorAll('.guess[data-key], .choice[data-key], .lab-guess')].find(x => !x.closest('.quiz'));
    const PS = {your: 'Твой ответ: ', was: 'Твой ответ был ', change: 'Хочешь изменить?', keep: 'Оставить', edit: 'Изменить',
      changed: ' → изменил на ', truth: 'На самом деле: ', skip: 'Проверить без прогноза', noTruth: 'Сравни с результатом игры выше.'};
    const answer = () => { if (!preBox) return '';
      if (preBox.classList.contains('lab-guess')){ const i = preBox.querySelector('input'); if (i) return normAns(i.value); const b = preBox.querySelector('[aria-pressed="true"]'); return b ? b.textContent.trim() : ''; } if (preBox.classList.contains('guess')){ const i = preBox.querySelector('input'); if (!preBox.classList.contains('saved') || !i.value.trim()) return '';
        const u = preBox.dataset.unit ?? '%'; return normAns(i.value).replace(/\s*%$/, '') + (u === '%' ? '%' : u ? ' ' + u : ''); }
      const b = preBox.querySelector('button[aria-pressed="true"], button.picked'); return b ? b.textContent.trim() : ''; };
    const quiet = b => b.classList.add('ghost');
    const filledIn = el => [...el.querySelectorAll('.btn:not(.ghost)')].filter(b => !b.closest('.pf') && !b.hasAttribute('data-ui-hidden') && !b.closest('[data-toy-hide]'));
    const flow = document.createElement('div'); flow.className = 'pf'; flow.setAttribute('role', 'status'); toy.appendChild(flow);
    const pfMine = document.createElement('p'); pfMine.className = 'pf-mine'; pfMine.hidden = true; flow.appendChild(pfMine);
    const showMine = () => { const a = answer(); pfMine.hidden = !a; pfMine.textContent = a ? PS.your + a : ''; send(); };
    if (preBox && inCard){ preBox.addEventListener('chosen', showMine); preBox.addEventListener('guessed', showMine); }
    if (preBox && !inCard){
      root.classList.add('pf-wait');
      const sk = document.createElement('button'); sk.type = 'button'; sk.className = 'btn-text pf-skip'; sk.textContent = PS.skip;
      (preBox.closest('.card')).appendChild(sk);
      const open = () => { root.classList.remove('pf-wait'); sk.remove(); showMine(); window.dispatchEvent(new Event('resize')); setTimeout(send, 60); };
      preBox.addEventListener('guessed', open); preBox.addEventListener('chosen', open); sk.addEventListener('click', open);
      if (answer()) open();
    }
    let asked = false;
    const reveal = changed0 => {
      flow.querySelectorAll('.pf-ask').forEach(x => x.remove());
      const r = document.createElement('p'); r.className = 'pf-cmp';
      const a = answer();
      if (changed0 && a && changed0 !== a){ r.append(PS.your, Object.assign(document.createElement('b'), {textContent: changed0}), PS.changed, Object.assign(document.createElement('b'), {textContent: a})); }
      else if (a){ r.append(PS.your, Object.assign(document.createElement('b'), {textContent: a})); }
      loadCredits().then(c => { const t = c[slug] && c[slug].truth; if (r.childNodes.length) r.append(' · ');
        if (t){ r.append(PS.truth); r.append(Object.assign(document.createElement('b'), {textContent: t})); } else if (!r.childNodes.length) r.append(PS.noTruth); else r.append(PS.noTruth);
        send(); });
      pfMine.hidden = true; flow.appendChild(r);
      post({type: 'toy:reveal', toy: slug}); root.classList.add('revealed'); send();
    };
    const ask = () => {
      if (asked) return; asked = true;
      const a = answer();
      if (!a){ reveal(''); return; }
      const box = document.createElement('div'); box.className = 'pf-ask';
      const q = document.createElement('p'); q.className = 'pf-q'; q.append(PS.was, Object.assign(document.createElement('b'), {textContent: a}), '. ' + PS.change);
      const row = document.createElement('div'); row.className = 'controls pf-row';
      const keep = document.createElement('button'); keep.type = 'button'; keep.className = 'btn'; keep.textContent = PS.keep; keep.dataset.ui = 'keep';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn ghost'; edit.textContent = PS.edit; edit.dataset.ui = 'edit';
      let inp = null;
      if (preBox.querySelector('input')){ inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.className = 'guess-in'; inp.value = preBox.querySelector('input').value; inp.setAttribute('aria-label', PS.change); row.append(inp); }
      filledIn(toy).forEach(quiet);   // главная сейчас — «Оставить», кнопки игры становятся контурными (пара 13)
      row.append(keep, edit); box.append(q, row); flow.appendChild(box); pfMine.hidden = true; send();
      keep.addEventListener('click', () => reveal(''));
      edit.addEventListener('click', () => {
        if (inp){ const i = preBox.querySelector('input'); const old = a; i.value = inp.value; const sv = preBox.classList.contains('guess') && preBox.querySelector('button'); if (sv) sv.click(); else if (!preBox.classList.contains('lab-guess')) i.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); reveal(old); }
        else { const old = a; preBox.scrollIntoView({block: 'center'}); asked = false; box.remove(); preBox.addEventListener('chosen', () => reveal(old), {once: true}); }
      });
    };
    // одна залитая кнопка на экране (пара 13). Если в «Сначала угадай» своя залитая кнопка прогноза (не поле .guess
    // из шаблона, которое прячет игру до «Запомнить»), игра видна сразу: пока прогноз не записан, её кнопки контурные;
    // записан или игру уже тронули — кнопка прогноза контурная, главная кнопка игры снова залита
    uiReady.then(() => {
      const preBtns = preCards.flatMap(filledIn).filter(b => !b.closest('.guess, .choice, .lab-guess'));
      if (!preBtns.length) return;
      const toyMain = filledIn(toy); toyMain.forEach(quiet);
      let done = false;
      const swap = () => { if (done) return; done = true; preBtns.forEach(quiet); toyMain.forEach(b => b.classList.remove('ghost')); };
      preBtns.forEach(b => b.addEventListener('click', () => setTimeout(() => {
        const i = b.closest('.card').querySelector('input'); if (!i || i.value.trim()) swap(); }, 0)));
      onFirstTouch(toy, swap);
    });
    // «первый прогон»: событие toy:ran (одна кнопка, свои игры) или первое касание игры + 1.5 с
    let ranT = 0;
    toy.addEventListener('toy:ran', () => { clearTimeout(ranT); ranT = setTimeout(ask, 300); });
    onFirstTouch(toy, () => { ranT = setTimeout(ask, 1500); });
    document.querySelectorAll(`.card[data-toy-pre~="${slug}"]`).forEach(c => ['guessed', 'chosen'].forEach(ev => c.addEventListener(ev, () => post({type: 'toy:guess', toy: slug}), true)));
  });
})();
