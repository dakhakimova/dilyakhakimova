/* Страница игры /play/<slug>/: высота iframe по сообщениям из соло-режима главы (/play/bridge.js),
   раскрытие вывода после первого касания игры, анонимный счётчик, одна кнопка «Поделиться». Код встраивания на странице не показываем (режим ?embed=1 работает).
   Строки приходят из разметки (data-*), их печёт tools/build-play.js из i18n/play.js. Счётчиков и баллов здесь нет. */
(function(){
  const main = document.querySelector('main.play'); if (!main) return;
  const slug = main.dataset.toy, frame = document.getElementById('toy-frame');
  const page = location.origin + location.pathname;
  // ---------- анонимный счётчик (POST /api/hit, functions/api/hit.js): только на боевом домене, одно событие на вид за загрузку ----------
  const utm = (new URLSearchParams(location.search).get('utm_source') || '').slice(0, 60), sent = new Set();
  const hit = kind => {
    if (sent.has(kind) || !/^(www\.)?dilyakhakimova\.com$/.test(location.hostname) || !navigator.sendBeacon) return;
    sent.add(kind);
    try { navigator.sendBeacon('/api/hit', JSON.stringify({slug, place: 'play', kind, source: utm})); } catch(e) {}
  };
  hit('view');
  const link = medium => page + '?utm_source=share&utm_medium=' + medium + '&utm_content=' + slug;

  // ---------- сообщения из iframe ----------
  const out = main.querySelector('.play-out'), reveal = out.querySelector('.reveal');
  let alive = false;
  addEventListener('message', e => {
    if (e.source !== frame.contentWindow || !e.data || e.data.toy !== slug) return;
    alive = true;
    if (e.data.type === 'toy:h') frame.style.height = Math.max(320, Math.min(4000, +e.data.h || 0)) + 'px';
    if (e.data.type === 'toy:interact') hit('play');
    // «Почему так» открывается после проверки прогноза (play/bridge.js: «Оставить» · «Изменить» → toy:reveal)
    if (e.data.type === 'toy:reveal' && reveal.hidden){ reveal.hidden = false; out.classList.add('open'); }
  });
  // iframe молчит 10 секунд — показываем ссылку «открой в курсе»
  setTimeout(() => { if (!alive){ frame.parentNode.classList.add('broken'); reveal.hidden = false; out.classList.add('open'); } }, 10000);

  // «Показать разбор» без игры
  const rb = main.querySelector('[data-act=reveal]');
  if (rb) rb.addEventListener('click', () => { reveal.hidden = false; out.classList.add('open'); rb.setAttribute('aria-expanded', 'true'); });

  // ---------- поделиться: одна текстовая кнопка ----------
  // есть navigator.share (телефон, Safari) — системное меню; иначе ссылка в буфер и «Ссылка скопирована» на 2 секунды
  const st = main.querySelector('.share-row [role=status]');
  const title = main.dataset.shareTitle, text = main.dataset.shareText;
  let tm = 0;
  const say = (m, ms) => { st.textContent = m; clearTimeout(tm); if (ms) tm = setTimeout(() => { st.textContent = ''; }, ms); };
  main.querySelector('[data-act=share]').addEventListener('click', async () => {
    hit('share_click');
    const url = link('play');
    if (navigator.share){
      try { await navigator.share({title, text, url}); return; } catch(e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); say(main.dataset.sCopied, 2000); }
    catch(e) { say(url); }
  });
})();
