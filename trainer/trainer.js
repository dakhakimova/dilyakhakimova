/* Тренажёр /trainer/: проверка ответов, «решено» в localStorage (только этот браузер), высота игр и «Почему так», смешанная тренировка. */
(function(){
  const parse = s => { const v = parseFloat(String(s).replace(/\s| /g, '').replace(',', '.').replace('%', '')); return isFinite(v) ? v : null; };
  const store = (() => { try { return JSON.parse(localStorage.getItem('dk:trainer') || '{}'); } catch (e) { return {}; } })();
  const save = () => { try { localStorage.setItem('dk:trainer', JSON.stringify(store)); } catch (e) {} };
  const check = (box, val, ans, tol) => {
    const fb = box.querySelector('.tr-fb'), v = parse(val);
    if (v === null){ fb.className = 'tr-fb no'; fb.textContent = 'Введи число.'; return null; }
    const ok = Math.abs(v - ans) <= tol;
    fb.className = 'tr-fb ' + (ok ? 'ok' : 'no');
    fb.textContent = ok ? 'Верно.' : 'Пока не сходится. Загляни в подсказку или попробуй ещё раз.';
    return ok;
  };
  // задачи на странице темы
  document.querySelectorAll('.tr-task[data-ans]').forEach(box => {
    const id = box.dataset.id;
    if (store[id]) box.classList.add('done');
    box.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const ok = check(box, box.querySelector('input').value, +box.dataset.ans, +box.dataset.tol);
      if (ok){ box.classList.add('done'); store[id] = 1; save(); }
    });
  });
  document.querySelectorAll('.tr-idea textarea').forEach(ta => {
    const id = 'txt:' + ta.closest('.tr-task').dataset.id;
    ta.value = store[id] || '';
    ta.addEventListener('input', () => { store[id] = ta.value; save(); });
  });
  // игры: высота и «Почему так» (сообщения /play/bridge.js)
  const frames = [...document.querySelectorAll('iframe.tr-frame')];
  if (frames.length) addEventListener('message', e => {
    const f = frames.find(x => x.contentWindow === e.source); if (!f || !e.data) return;
    if (e.data.type === 'toy:h') f.style.height = Math.max(320, Math.min(4000, +e.data.h || 0)) + 'px';
    const out = f.closest('.tr-game').querySelector('.tr-out');
    if (e.data.type === 'toy:reveal' && out){ out.querySelector('.reveal').hidden = false; out.classList.add('open'); }
  });
  // смешанная тренировка
  const data = document.getElementById('mix-data');
  if (data){
    const all = JSON.parse(data.textContent), box = document.querySelector('.tr-mixbox');
    const $ = s => box.querySelector('[data-mix-' + s + ']');
    let order = all.map((_, i) => i).sort(() => Math.random() - .5), k = 0, right = 0, tried = 0, cur;
    const show = () => {
      if (k >= order.length){ order.sort(() => Math.random() - .5); k = 0; }
      cur = all[order[k++]];
      $('n').textContent = 'Задача ' + (tried + 1);
      $('dom').textContent = cur.dom ? ' · ' + cur.dom : '';
      $('q').innerHTML = cur.q; $('unit').innerHTML = cur.unit;
      $('form').querySelector('input').value = '';
      box.querySelector('.tr-fb').textContent = ''; box.querySelector('.tr-after').hidden = true;
      $('form').querySelector('input').focus({preventScroll: true});
    };
    const after = () => { $('tpl').innerHTML = cur.tpl + ' (' + cur.topic + ')'; $('href').href = cur.href; $('sol').innerHTML = cur.sol; box.querySelector('.tr-after').hidden = false; };
    $('form').addEventListener('submit', e => {
      e.preventDefault();
      const ok = check(box, $('form').querySelector('input').value, cur.ans, cur.tol);
      if (ok === null) return;
      tried++; if (ok) right++;
      $('score').textContent = 'Решено верно: ' + right + ' из ' + tried;
      if (ok) after();
    });
    $('show').addEventListener('click', after);
    $('next').addEventListener('click', show);
    show();
  }
})();
