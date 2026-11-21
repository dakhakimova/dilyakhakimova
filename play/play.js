/* Страница игрушки /play/<slug>/: высота iframe по сообщениям из соло-режима главы (/play/bridge.js),
   раскрытие вывода после первого касания игрушки, анонимный счётчик, «Скинуть коллеге» / «Скопировать ссылку», код встраивания.
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
    if (e.data.type === 'toy:interact'){ hit('play'); if (reveal.hidden){ reveal.hidden = false; out.classList.add('open'); } }
  });
  // iframe молчит 10 секунд — показываем ссылку «открой в курсе»
  setTimeout(() => { if (!alive) frame.parentNode.classList.add('broken'); }, 10000);

  // ---------- поделиться ----------
  const st = main.querySelector('.play-share [role=status]');
  const title = main.dataset.shareTitle, text = main.dataset.shareText;
  async function copy(s, msg){
    try { await navigator.clipboard.writeText(s); st.textContent = msg; }
    catch(e) { st.textContent = s; }
  }
  main.querySelector('[data-act=share]').addEventListener('click', async () => {
    hit('share_click');
    const url = link('play');
    if (navigator.share && matchMedia('(pointer: coarse)').matches){
      try { await navigator.share({title, text, url}); return; } catch(e) { if (e && e.name === 'AbortError') return; }
    }
    copy(text + ' ' + url, main.dataset.sCopiedMsg);
  });
  main.querySelector('[data-act=copy]').addEventListener('click', () => (hit('share_click'), copy(link('play'), main.dataset.sCopied)));

  // ---------- код встраивания ----------
  const ta = main.querySelector('.embed textarea');
  if (ta){
    ta.value = '<iframe src="' + page + '?embed=1" title="' + title.replace(/"/g, '&quot;') + '" width="100%" height="' + parseInt(frame.style.height, 10) + '" style="border:0; max-width:820px" loading="lazy"></iframe>\n'
      + '<script src="' + location.origin + '/play/embed.js" async></' + 'script>';
    ta.addEventListener('focus', () => ta.select());
  }
})();
