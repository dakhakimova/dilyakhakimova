/* /shelf/: подсказка у корешка — при наведении мышью, по фокусу с клавиатуры и по нажатию на телефоне.
   Одна подсказка на книгу (.b-card, role=tooltip, aria-describedby у корешка). Без JS работает CSS :hover/:focus-within.
   Обложка: при первом показе пробуем ISBN из data-isbn по очереди на covers.openlibrary.org (?default=false → 404, если нет);
   картинка попадает в карточку только после загрузки — нет обложки, нет и места под неё.
   Карточка position:fixed и прижимается к краям вьюпорта; закрывается по Esc, по нажатию мимо, при уходе мыши и фокуса.
   Фильтр по теме подсвечивает корешки. */
(function(){
  const books = document.querySelector('.books');
  if (!books) return;
  books.classList.add('tips');
  const GAP = 14, EDGE = 8;
  let cur = null, pinned = false, hideT = 0;

  function cover(card){
    if (card.dataset.coverTried) return;
    card.dataset.coverTried = '1';
    const list = (card.dataset.isbn || '').split(' ').filter(Boolean);
    const next = i => {
      if (i >= list.length) return;
      const img = document.createElement('img');
      img.className = 'b-cover';
      img.alt = card.dataset.coverAlt || '';
      img.width = 120;
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.setAttribute('referrerpolicy', 'no-referrer');
      img.onload = () => {
        if (img.naturalWidth < 2) return next(i + 1); // на всякий случай: пиксель-заглушка вместо обложки
        card.insertBefore(img, card.firstChild);
        if (cur && cur.querySelector('.b-card') === card) place();
      };
      img.onerror = () => next(i + 1);
      img.src = 'https://covers.openlibrary.org/b/isbn/' + encodeURIComponent(list[i]) + '-M.jpg?default=false';
    };
    next(0);
  }

  function place(){
    if (!cur) return;
    const card = cur.querySelector('.b-card'), sp = cur.querySelector('.spine');
    const r = sp.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const w = card.offsetWidth, h = card.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(EDGE, Math.min(x, vw - w - EDGE));
    let y = r.top - GAP - h;                                  // над корешком
    if (y < EDGE) y = r.bottom + GAP;                         // не влезло — под ним
    if (y + h > vh - EDGE) y = Math.max(EDGE, vh - h - EDGE); // и там нет места — внутри экрана
    card.style.left = Math.round(x) + 'px';
    card.style.top = Math.round(y) + 'px';
  }

  function show(li, pin){
    clearTimeout(hideT);
    if (cur && cur !== li) hide();
    cur = li; pinned = pinned && cur === li || !!pin;
    const card = li.querySelector('.b-card');
    cover(card);
    li.classList.add('open');
    card.classList.add('on');
    const b = li.querySelector('button.spine'); if (b) b.setAttribute('aria-expanded', 'true');
    place();
  }
  function hide(){
    clearTimeout(hideT);
    if (!cur) return;
    cur.classList.remove('open');
    cur.querySelector('.b-card').classList.remove('on');
    const b = cur.querySelector('button.spine'); if (b) b.setAttribute('aria-expanded', 'false');
    cur = null; pinned = false;
  }
  const later = () => { clearTimeout(hideT); hideT = setTimeout(() => { if (!pinned) hide(); }, 120); };

  // мышь: на корешке или на самой карточке подсказка держится (её можно навести и дочитать)
  books.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const li = e.target.closest('.book'); if (li) show(li);
  });
  books.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    const li = e.target.closest('.book');
    if (li && !li.contains(e.relatedTarget)) later();
  });
  // клавиатура: фокус на корешке
  books.addEventListener('focusin', e => {
    const sp = e.target.closest('.spine'); if (!sp) return;
    let kb = true; try { kb = sp.matches(':focus-visible'); } catch (_) {}
    if (kb) show(sp.closest('.book'));
  });
  books.addEventListener('focusout', e => {
    const li = e.target.closest('.book');
    if (li && li === cur && !li.contains(e.relatedTarget)) hide();
  });
  // нажатие: у книги без разбора — открыть или закрыть; у книги с разбором — переход по ссылке
  books.addEventListener('click', e => {
    const b = e.target.closest('button.spine'); if (!b) return;
    const li = b.closest('.book');
    if (cur === li && pinned) hide(); else show(li, true);
  });
  document.addEventListener('click', e => { if (cur && !cur.contains(e.target)) hide(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) hide(); });
  window.addEventListener('resize', place, {passive: true});
  window.addEventListener('scroll', place, {passive: true, capture: true});

  const f = document.querySelector('.topic-filter');
  if (f) f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const v = b.dataset.topic;
    f.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    books.classList.toggle('dim', !!v);
    books.querySelectorAll('.book').forEach(li => li.classList.toggle('hit', !!v && li.dataset.topic === v));
  });
})();
