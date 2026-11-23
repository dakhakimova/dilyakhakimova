/* Страница термина /terms/<slug>/: высота iframe игры по сообщениям из /play/bridge.js ({type:'toy:h', h, toy}),
   ссылка «открой в курсе», если игра молчит, и одна кнопка «Поделиться».
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
      // «Почему так» открывается после проверки прогноза — как на /play/
      const out = main.querySelector('.t-out');
      if (e.data.type === 'toy:reveal' && out){ out.querySelector('.reveal').hidden = false; out.classList.add('open'); }
    });
    // iframe загрузился, но молчит 8 секунд — показываем ссылку на игру в курсе
    frame.addEventListener('load', () => setTimeout(() => { if (!alive) frame.parentNode.classList.add('broken'); }, 8000));
  }
  // одна кнопка «Поделиться»: navigator.share (телефон, Safari) — системное меню; иначе ссылка в буфер и «Ссылка скопирована» на 2 секунды
  const st = main.querySelector('.t-share [role=status]');
  const link = medium => page + '?utm_source=share&utm_medium=' + medium + '&utm_content=term-' + slug;
  let tm = 0;
  const say = (m, ms) => { st.textContent = m; clearTimeout(tm); if (ms) tm = setTimeout(() => { st.textContent = ''; }, ms); };
  main.querySelector('[data-act=share]').addEventListener('click', async () => {
    const url = link('term'), title = main.dataset.shareTitle, text = main.dataset.shareText;
      // только копируем ссылку (Диля, 23.11): системное меню «Поделиться» не открываем
    try { await navigator.clipboard.writeText(url); say(main.dataset.sCopied, 2000); }
    catch(e) { say(url); }
  });

  // графики с выделением (svg.hl, tools/terms-viz.js): наведение, фокус или нажатие на кривую/строку легенды — она яркая,
  // остальные приглушены, в легенде одна её строка (рамка сжимается вокруг неё). Повторное нажатие или уход мыши — всё как было.
  document.querySelectorAll('svg.hl').forEach(svg => {
    const box = svg.querySelector('.hl-box'); let pinned = null;
    const set = i => {
      svg.classList.toggle('on', i !== null);
      svg.querySelectorAll('.hl-c, .hl-l').forEach(g => g.classList.toggle('cur', g.dataset.i === i));
      // строки легенды не двигаем (иначе строка уезжает из-под мыши) — рамка сжимается вокруг выбранной
      if (box){ box.dataset.y0 = box.dataset.y0 || box.getAttribute('y');
        box.setAttribute('y', i !== null ? +box.dataset.y0 + i * box.dataset.step : box.dataset.y0);
        box.setAttribute('height', i !== null ? box.dataset.h1 : box.dataset.hn); }
    };
    svg.querySelectorAll('.hl-c, .hl-l').forEach(g => {
      const i = g.dataset.i;
      g.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && pinned === null) set(i); });
      g.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && pinned === null) set(null); });
      g.addEventListener('click', () => { pinned = pinned === i ? null : i; set(pinned); });
      g.addEventListener('focus', () => set(i)); g.addEventListener('blur', () => { if (pinned === null) set(null); });
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pinned = pinned === i ? null : i; set(pinned); } });
    });
  });
})();
