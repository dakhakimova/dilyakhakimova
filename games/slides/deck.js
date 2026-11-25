/* Движок слайдов для лекций /games/…/.
   Клавиши: → / пробел / PageDown — дальше (сначала раскрываются фрагменты .f), ← / PageUp — назад,
   Home / End — первый / последний, F — во весь экран, O — все слайды, N — заметки лектора, P — печать.
   Адрес #12 открывает 12-й слайд. Компоненты: .bars / .vbars (столбики), [data-sw] (переключатель версий),
   .quiz (прогноз с раскрытием), .hall (ввод результатов зала). */
(function(){
  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll(':scope > .s'));
  let cur = 0;

  /* ---------- масштаб ---------- */
  function fit(){
    const k = Math.min(window.innerWidth / 1600, window.innerHeight / 900) * 0.98;
    deck.style.transform = `translate(${-800 * k}px, ${-450 * k}px) scale(${k})`;
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- служебная панель ---------- */
  const ui = document.createElement('div'); ui.className = 'ui';
  ui.innerHTML = '<button type="button" data-a="prev" aria-label="Назад">←</button><span class="num" aria-live="polite"></span><button type="button" data-a="next" aria-label="Дальше">→</button><button type="button" data-a="ov" title="Все слайды (O)">▦</button><button type="button" data-a="notes" title="Заметки (N)">✎</button><button type="button" data-a="fs" title="Во весь экран (F)">⤢</button>';
  document.body.appendChild(ui);
  const prog = document.createElement('div'); prog.id = 'prog'; document.body.appendChild(prog);
  const notesBox = document.createElement('div'); notesBox.id = 'notes'; notesBox.hidden = true; document.body.appendChild(notesBox);
  const ov = document.createElement('div'); ov.id = 'overview'; ov.hidden = true; document.body.appendChild(ov);
  ui.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a; if(!a) return;
    if(a === 'prev') back(); if(a === 'next') fwd(); if(a === 'ov') toggleOv(); if(a === 'notes') toggleNotes(); if(a === 'fs') fullscreen();
  });

  /* ---------- показ ---------- */
  function frags(s){ return Array.from(s.querySelectorAll('.f')); }
  function show(i, fromEnd){
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[cur].classList.remove('on');
    cur = i; const s = slides[cur];
    s.classList.add('on');
    frags(s).forEach(f => f.classList.toggle('vis', !!fromEnd));
    ui.querySelector('.num').textContent = `${cur + 1} / ${slides.length}`;
    prog.style.width = `${(cur + 1) / slides.length * 100}%`;
    if(location.hash !== '#' + (cur + 1)) history.replaceState(null, '', '#' + (cur + 1));
    const t = s.dataset.title || s.querySelector('h1,h2')?.textContent || '';
    document.title = `${t.trim()} · ${document.body.dataset.deck || ''}`;
    renderNotes(); refresh(s, true);
    s.dispatchEvent(new CustomEvent('slide:enter', {bubbles:true}));
  }
  function fwd(){
    const hidden = frags(slides[cur]).filter(f => !f.classList.contains('vis'));
    if(hidden.length){ hidden[0].classList.add('vis'); refresh(hidden[0], false); return; }
    if(cur < slides.length - 1) show(cur + 1);
  }
  function back(){
    const vis = frags(slides[cur]).filter(f => f.classList.contains('vis'));
    if(vis.length){ vis[vis.length - 1].classList.remove('vis'); return; }
    if(cur > 0) show(cur - 1, true);
  }
  function fullscreen(){ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
  function renderNotes(){
    const n = slides[cur].querySelector('.notes');
    notesBox.innerHTML = n ? n.innerHTML : '<span style="opacity:.6">Заметок к этому слайду нет.</span>';
  }
  function toggleNotes(){ notesBox.hidden = !notesBox.hidden; }
  function toggleOv(){
    if(!ov.hidden){ ov.hidden = true; return; }
    ov.innerHTML = slides.map((s, i) => `<button type="button" data-i="${i}" class="${i === cur ? 'cur' : ''}"><span>${i + 1}</span>${(s.dataset.title || s.querySelector('h1,h2')?.textContent || '').trim()}</button>`).join('');
    ov.hidden = false; ov.querySelector('.cur')?.focus();
  }
  ov.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; ov.hidden = true; show(+b.dataset.i); });

  document.addEventListener('keydown', e => {
    if(e.target.closest('input, textarea, select') ) return;
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if(k === 'Escape'){ ov.hidden = true; notesBox.hidden = true; return; }
    if(!ov.hidden) return;
    if(['ArrowRight','PageDown',' ','Enter'].includes(k) && !(k === 'Enter' && e.target.closest('button'))){ e.preventDefault(); fwd(); }
    else if(['ArrowLeft','PageUp'].includes(k)){ e.preventDefault(); back(); }
    else if(k === 'Home') show(0); else if(k === 'End') show(slides.length - 1);
    else if(k === 'f' || k === 'F' || k === 'а' || k === 'А') fullscreen();
    else if(k === 'o' || k === 'O' || k === 'щ' || k === 'Щ') toggleOv();
    else if(k === 'n' || k === 'N' || k === 'т' || k === 'Т') toggleNotes();
    else if(k === 'p' || k === 'P' || k === 'з' || k === 'З') window.print();
  });
  let tx = null;
  deck.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
  deck.addEventListener('touchend', e => { if(tx === null) return; const dx = e.changedTouches[0].clientX - tx; if(Math.abs(dx) > 60){ dx < 0 ? fwd() : back(); } tx = null; });
  window.addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1), 10); if(n && n - 1 !== cur) show(n - 1); });

  /* ---------- столбики ---------- */
  const fmt = (v, unit) => (unit === '$' ? '$' : '') + (Number.isInteger(v) ? v : v.toFixed(v < 10 ? 2 : 1)).toString().replace('.', ',') + (unit && unit !== '$' ? unit : '');
  function buildBars(b){
    if(b.dataset.built) return; b.dataset.built = 1;
    b.querySelectorAll(':scope > .row').forEach(r => {
      const t = document.createElement('div'); t.className = 'track';
      t.innerHTML = `<div class="bar ${r.dataset.c || 'pen'}"></div><span class="val"></span>`;
      r.appendChild(t);
    });
  }
  function drawBars(b, reset){
    buildBars(b);
    const unit = b.dataset.unit ?? '%';
    const rows = Array.from(b.querySelectorAll(':scope > .row'));
    const max = +b.dataset.max || Math.max(...rows.map(r => +r.dataset.v || 0), 1);
    rows.forEach(r => {
      const bar = r.querySelector('.bar'), val = r.querySelector('.val'), track = r.querySelector('.track');
      const v = r.dataset.v === '' || r.dataset.v === undefined ? null : +r.dataset.v;
      const w = v === null ? 0 : Math.max(0, Math.min(100, v / max * 100));
      if(reset){ bar.style.transition = 'none'; bar.style.width = '0%'; track.style.setProperty('--w', '0%'); void bar.offsetWidth; bar.style.transition = ''; }
      requestAnimationFrame(() => { bar.style.width = w + '%'; track.style.setProperty('--w', w + '%'); });
      val.textContent = v === null ? '' : (r.dataset.label ?? fmt(v, unit));
      val.classList.toggle('in', w > 82);
    });
  }
  function drawV(b, reset){
    const unit = b.dataset.unit ?? '%';
    const cols = Array.from(b.querySelectorAll(':scope > .col'));
    const max = +b.dataset.max || Math.max(...cols.map(c => +c.dataset.v || 0), 1);
    cols.forEach(c => {
      if(!c.dataset.built){ c.dataset.built = 1; c.innerHTML = `<span class="val"></span><div class="bar ${c.dataset.c || 'pen'}"></div>`; }
      const bar = c.querySelector('.bar'), v = +c.dataset.v;
      if(reset){ bar.style.transition = 'none'; bar.style.height = '0%'; void bar.offsetWidth; bar.style.transition = ''; }
      requestAnimationFrame(() => { bar.style.height = Math.max(0, v / max * 88) + '%'; });
      c.querySelector('.val').textContent = c.dataset.label ?? fmt(v, unit);
    });
  }
  function refresh(scope, reset){
    const s = scope.closest ? (scope.classList?.contains('s') ? scope : scope.closest('.s')) : scope;
    scope.querySelectorAll?.('.bars').forEach(b => { if(!b.closest('.f') || b.closest('.f').classList.contains('vis')) drawBars(b, reset); else buildBars(b); });
    scope.querySelectorAll?.('.vbars').forEach(b => { if(!b.closest('.f') || b.closest('.f').classList.contains('vis')) drawV(b, reset); });
    if(scope.classList?.contains('f')){ if(scope.matches('.bars')) drawBars(scope, true); if(scope.matches('.vbars')) drawV(scope, true); }
  }

  /* ---------- переключатель версий ---------- */
  document.querySelectorAll('[data-sw]').forEach(box => {
    const btns = box.querySelectorAll('.seg button');
    function set(k){
      btns.forEach(b => b.classList.toggle('on', b.dataset.k === k));
      box.querySelectorAll('[data-show]').forEach(el => el.hidden = !el.dataset.show.split(' ').includes(k));
      box.querySelectorAll(`[data-v-${k}]`).forEach(el => { el.dataset.v = el.getAttribute(`data-v-${k}`); });
      box.querySelectorAll('.bars').forEach(b => drawBars(b, false));
      box.querySelectorAll('.vbars').forEach(b => drawV(b, false));
      box.dispatchEvent(new CustomEvent('sw', {detail:k}));
    }
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.k)));
    set(box.dataset.sw || btns[0]?.dataset.k);
  });

  /* ---------- квиз-прогноз ---------- */
  document.querySelectorAll('.quiz').forEach(q => {
    q.querySelectorAll('.opt').forEach(o => o.addEventListener('click', () => {
      if(q.classList.contains('done')) return;
      q.querySelectorAll('.opt').forEach(x => x.classList.toggle('pick', x === o));
    }));
    q.querySelector('.reveal')?.addEventListener('click', () => { q.classList.add('done'); refresh(q, true); });
  });

  /* ---------- результаты зала: доли из чисел ---------- */
  document.querySelectorAll('.hall[data-target]').forEach(h => {
    const target = document.querySelector(h.dataset.target);
    const ins = Array.from(h.querySelectorAll('input[data-i]'));
    const upd = () => {
      const vals = ins.map(i => Math.max(0, +i.value || 0)), sum = vals.reduce((a, b) => a + b, 0);
      target.querySelectorAll('[data-hall]').forEach(r => {
        const v = vals[+r.dataset.hall];
        r.dataset.v = sum ? Math.round(v / sum * 100) : '';
      });
      const tot = h.querySelector('.tot'); if(tot) tot.textContent = sum ? `всего ответов: ${sum}` : '';
      if(target.matches('.bars')) drawBars(target, false); else target.querySelectorAll('.bars').forEach(b => drawBars(b, false));
    };
    ins.forEach(i => i.addEventListener('input', upd));
  });

  window.Deck = {show, fwd, back, refresh, get cur(){ return cur; }, slides};
  const start = parseInt(location.hash.slice(1), 10);
  show(start ? start - 1 : 0);
})();
