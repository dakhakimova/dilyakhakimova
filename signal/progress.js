/* Прогресс и баллы курса «Сигнал или шум».
   SignalProgress.track(chapter, kind, key, value) — записать событие.
   Без входа события копятся в браузере; после входа уходят на сервер, баллы считает сервер.
   Плашка со статусом — элемент #sp-badge, если он есть на странице. */
(function(){
  const QKEY = 'signal:queue';
  let me = null, sending = false;

  const load = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch(e) { return []; } };
  const save = q => { try { localStorage.setItem(QKEY, JSON.stringify(q.slice(-300))); } catch(e) {} };

  function badge(){
    const el = document.getElementById('sp-badge');
    if (!el) return;
    if (me){
      el.innerHTML = '<a href="/account.html">' + me.points + ' из ' + me.max + ' баллов</a>';
    } else {
      const n = load().filter(e => e.kind !== 'card').length;
      el.innerHTML = '<a href="/account.html">Войти' + (n ? ' и сохранить прогресс' : '') + '</a>';
    }
  }

  async function flush(){
    if (sending) return;
    const q = load();
    if (!q.length) return;
    sending = true;
    try {
      const r = await fetch('/api/event', {method: 'POST', headers: {'content-type': 'application/json'}, credentials: 'same-origin', body: JSON.stringify({events: q.slice(0, 50)})});
      if (r.ok){
        me = await r.json();
        q.slice(0, 50).forEach(e => sent.add(e.chapter + '|' + e.kind + '|' + e.key));
        try { localStorage.setItem('signal:sent', JSON.stringify([...sent].slice(-1000))); } catch(e) {}
        save(load().slice(q.slice(0, 50).length));
      }
    } catch(e) {}
    sending = false;
    badge();
    if (me && load().length) flush();
  }

  async function refresh(){
    try {
      const r = await fetch('/api/me', {credentials: 'same-origin'});
      me = r.ok ? await r.json() : null;
    } catch(e) { me = null; }
    badge();
    if (me) flush();
    return me;
  }

  const sent = new Set(JSON.parse((() => { try { return localStorage.getItem('signal:sent') || '[]'; } catch(e) { return '[]'; } })()));
  function track(chapter, kind, key, value){
    const id = chapter + '|' + kind + '|' + key;
    const q = load();
    if (sent.has(id) || q.some(e => e.chapter + '|' + e.kind + '|' + e.key === id)) return;
    q.push({chapter, kind, key: String(key), value: value === undefined ? null : value});
    save(q);
    if (me) flush(); else badge();
  }

  window.SignalProgress = { track, refresh, flush, get me(){ return me; } };
  refresh();
})();
