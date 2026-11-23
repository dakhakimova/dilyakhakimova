/* Анонимный счётчик чтения (POST /api/read → таблица page_reads): открыли страницу, сколько секунд реально читали, дочитали ли.
   Только на боевом домене. Без cookie и localStorage. Активное время: вкладка видна и было движение (прокрутка, мышь, клавиши, касание)
   за последние 60 секунд. Время уходит одним событием, когда вкладку прячут или закрывают; повторное — только если читали дальше. */
(function(){
  if (!/^(www\.)?dilyakhakimova\.com$/.test(location.hostname) || !navigator.sendBeacon) return;
  const page = location.pathname, source = (new URLSearchParams(location.search).get('utm_source') || '').slice(0, 60);
  const send = o => { try { navigator.sendBeacon('/api/read', JSON.stringify(Object.assign({page, source}, o))); } catch(e) {} };
  send({kind: 'view'});
  let active = 0, sentSec = 0, last = Date.now(), depth = 0, first = true, deepSent = false;
  const poke = () => { last = Date.now(); };
  ['scroll', 'mousemove', 'keydown', 'touchstart', 'click'].forEach(e => addEventListener(e, poke, {passive: true}));
  addEventListener('scroll', () => {
    const h = document.documentElement, d = Math.round(100 * (scrollY + innerHeight) / Math.max(h.scrollHeight, 1));
    if (d > depth) depth = Math.min(100, d);
  }, {passive: true});
  setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - last < 60e3) active += 5; }, 5000);
  const flush = () => {
    if (active - sentSec < 5) return;
    const deep = depth >= 90 && !deepSent;
    send({kind: 'time', sec: active - sentSec, first: first ? 1 : 0, depth: deep ? 100 : 0});
    sentSec = active; first = false; if (deep) deepSent = true;
  };
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
})();
