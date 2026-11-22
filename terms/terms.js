/* Страница термина /terms/<slug>/: высота iframe игры по сообщениям из /play/bridge.js ({type:'toy:h', h, toy}),
   ссылка «открой в курсе», если игра молчит, и кнопки «Скинуть коллеге» / «Скопировать ссылку».
   Строки — из разметки (data-*), их печёт tools/build-terms.js из i18n/terms.js. */
(function(){
  const main = document.querySelector('main.term'); if (!main) return;
  const slug = main.dataset.slug, page = location.origin + location.pathname;
  const frame = document.getElementById('toy-frame');
  if (frame){
    let alive = false;
    addEventListener('message', e => {
      if (e.source !== frame.contentWindow || !e.data || e.data.toy !== frame.dataset.toy) return;
      alive = true;
      if (e.data.type === 'toy:h') frame.style.height = Math.max(320, Math.min(4000, +e.data.h || 0)) + 'px';
    });
    // iframe загрузился, но молчит 8 секунд — показываем ссылку на игру в курсе
    frame.addEventListener('load', () => setTimeout(() => { if (!alive) frame.parentNode.classList.add('broken'); }, 8000));
  }
  const st = main.querySelector('.t-share [role=status]');
  const link = medium => page + '?utm_source=share&utm_medium=' + medium + '&utm_content=term-' + slug;
  async function copy(s, msg){
    try { await navigator.clipboard.writeText(s); st.textContent = msg; }
    catch(e) { st.textContent = s; }
  }
  main.querySelector('[data-act=share]').addEventListener('click', async () => {
    const url = link('term'), title = main.dataset.shareTitle, text = main.dataset.shareText;
    if (navigator.share && matchMedia('(pointer: coarse)').matches){
      try { await navigator.share({title, text, url}); return; } catch(e) { if (e && e.name === 'AbortError') return; }
    }
    copy(text + ' ' + url, main.dataset.sCopiedMsg);
  });
  main.querySelector('[data-act=copy]').addEventListener('click', () => copy(link('term'), main.dataset.sCopied));
})();
