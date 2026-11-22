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
      share: 'Поделиться',
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
    if (navigator.share){
      try { await navigator.share({title, text, url}); return 'shared'; } catch(e) { if (e && e.name === 'AbortError') return 'abort'; }
    }
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
html.solo .card[data-toy-pre] + .card{margin-top:48px; padding-top:32px; border-top:1px solid rgba(36,34,31,.14)}
html.solo .card[data-toy] > h2.scene-h{display:none}
html.solo .card .scene{font-size:inherit; margin-top:8px}
html.solo .card > .step-tag:not(.play-pre), html.solo .card[data-toy-pre] > h2, html.solo .card[data-toy-pre] .chat,
html.solo .card .art, html.solo .card .src, html.solo .card .xref, html.solo .toy-share,
html.solo [data-toy-hide], html.solo .plus{display:none !important}
html.solo:not(.touched) [data-toy-reveal]{display:none !important}
html.solo .card[data-toy-pre] .note{margin-bottom:0}
html.solo .card[data-toy-pre] .guess, html.solo .card[data-toy-pre] .choice{margin-bottom:4px}
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
    const pres = document.querySelectorAll(`.card[data-toy-pre~="${slug}"]`);
    pres.forEach(c => { const t = document.createElement('span'); t.className = 'step-tag play-pre'; t.textContent = T.preTag; c.prepend(t); });
    // пара к ней — «Потом проверь» над игрой (только если есть прогноз). Заголовок-сцена игры — не заголовок, а описание:
    // h2 «Гости входят по одному» + абзац «Каждый гость приносит…» → один абзац «Гости входят по одному: каждый гость приносит…»
    if (pres.length){
      const t = document.createElement('span'); t.className = 'step-tag play-pre play-check'; t.textContent = T.checkTag;
      const h = toy.querySelector(':scope > h2');
      if (h){
        const nx = h.nextElementSibling, head = h.textContent.trim().replace(/[.:]$/, '');
        if (nx && nx.tagName === 'P' && !nx.className && !nx.hasAttribute('data-toy-hide') && !nx.hasAttribute('data-toy-reveal') && /^[А-ЯЁ][а-яё]/.test(nx.textContent.trim())){
          const fc = nx.firstChild;
          if (fc && fc.nodeType === 3){ fc.textContent = fc.textContent.replace(/^\s*([А-ЯЁ])/, (_, c) => head + ': ' + c.toLowerCase()); nx.classList.add('scene'); }
          else nx.insertAdjacentText('afterbegin', head + '. ');
        } else { const p = document.createElement('p'); p.className = 'scene'; p.textContent = head + '.'; h.after(p); }
        h.classList.add('scene-h');
      }
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
    document.querySelectorAll(`.card[data-toy-pre~="${slug}"]`).forEach(c => ['guessed', 'chosen'].forEach(ev => c.addEventListener(ev, () => post({type: 'toy:guess', toy: slug}), true)));
  });
})();
