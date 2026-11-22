/* /shelf/: тап по корешку на телефоне показывает карточку; фильтр по теме подсвечивает корешки. */
(function(){
  const books = document.querySelector('.books');
  if (!books) return;
  books.addEventListener('click', e => {
    const b = e.target.closest('button.spine'); if (!b) return;
    const li = b.closest('.book'), was = li.classList.contains('open');
    books.querySelectorAll('.book.open').forEach(x => { x.classList.remove('open'); const s = x.querySelector('button.spine'); if (s) s.setAttribute('aria-expanded', 'false'); });
    if (!was){ li.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.book')) books.querySelectorAll('.book.open').forEach(x => x.classList.remove('open')); });
  const f = document.querySelector('.topic-filter');
  if (f) f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const v = b.dataset.topic;
    f.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    books.classList.toggle('dim', !!v);
    books.querySelectorAll('.book').forEach(li => li.classList.toggle('hit', !!v && li.dataset.topic === v));
  });
})();
