/* Необязательный скрипт для сайтов, которые встраивают игры dilyakhakimova.com через iframe:
   подгоняет высоту iframe под игру (сообщения {type:'toy:h', h} из /play/bridge.js). Без него iframe просто фиксированной высоты. */
(function(){
  if (window.__dkPlayEmbed) return; window.__dkPlayEmbed = 1;
  addEventListener('message', e => {
    if (!/^https:\/\/(www\.)?dilyakhakimova\.com$/.test(e.origin) || !e.data || e.data.type !== 'toy:h') return;
    for (const f of document.querySelectorAll('iframe')){
      if (f.contentWindow === e.source){ f.style.height = Math.max(200, Math.min(4000, +e.data.h || 0)) + 'px'; break; }
    }
  });
})();
