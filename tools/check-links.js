// Проверка ссылок и кнопок страницы: пустые href, несуществующие якоря, 404 внутренних ссылок, кнопки без обработчика.
// Запуск: NODE_PATH=$(npm root -g) node tools/check-links.js [/ /about/ ...]   (без аргументов — входные страницы, первые шаги курсов, 3 случайные игры; ширины 1200 и 375)
const {chromium} = require('playwright');
const serve = require('./play-serve.js');
// без аргументов: все входные страницы, первый шаг каждого бесплатного курса и три случайные игры
const ENTRY = ['/', '/probability/', '/signal/', '/ab-basics/', '/stats/', '/ab/', '/causal/', '/map/', '/start/', '/about/', '/play/', '/shelf/', '/terms/', '/extras/', '/account.html', '/404.html',
  '/probability/01-outcomes.html', '/signal/01-probability.html', '/ab-basics/01-before-after.html'];
const randomGames = k => { const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '..', 'play');
  const all = fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, 'index.html')));
  return all.sort(() => Math.random() - .5).slice(0, k).map(d => `/play/${d}/`); };
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ENTRY.concat(randomGames(3));
(async () => {
  const s = await serve(), b = await chromium.launch(), bad = [], seen = new Map();
  let total = 0;
  for (const u of pages) for (const w of [1200, 375]){
    const p = await b.newPage({viewport: {width: w, height: 900}});
    await p.goto(s.url + u, {waitUntil: 'networkidle'}); await p.waitForTimeout(300);
    const items = await p.evaluate(() => [...document.querySelectorAll('a, button, [role=button], [onclick]')].map((el, i) => {
      el.setAttribute('data-chk', i);
      return {i, tag: el.tagName.toLowerCase(), href: el.getAttribute('href'), text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50),
        type: el.getAttribute('type'), form: !!el.closest('form'), hidden: !el.offsetParent && getComputedStyle(el).position !== 'fixed'};
    }));
    const cdp = await p.context().newCDPSession(p);
    for (const it of items){
      const where = `${u} <${it.tag}> «${it.text}»`;   // ширина не пишется: одинаковые находки на 1200 и 375 схлопываются
      if (it.tag === 'a'){
        total++;
        const h = it.href;
        if (h === null) { bad.push(`${where}: нет href`); continue; }
        if (h === '' || h === '#' || /^javascript:/i.test(h)) { bad.push(`${where}: пустой href «${h}»`); continue; }
        if (/^(mailto|tel):/.test(h) || /^https?:\/\//.test(h) && !h.startsWith(s.url)) continue;
        const url = new URL(h, s.url + u);
        if (url.pathname === new URL(s.url + u).pathname && url.hash){
          const id = decodeURIComponent(url.hash.slice(1));
          // якорь-маршрут: нет элемента, но ссылку обрабатывает скрипт (data-go на карте навыков) — не мёртвая
          if (!await p.evaluate(id => !!document.getElementById(id), id) && !await p.evaluate(i => { const e = document.querySelector(`[data-chk="${i}"]`); return e.hasAttribute('data-go') || !!e.closest('[data-go]'); }, it.i))
            bad.push(`${where}: якорь ${url.hash} не найден на странице`);
          continue;
        }
        const key = url.pathname;
        if (!seen.has(key)){ const r = await fetch(s.url + key).catch(() => null); seen.set(key, r ? {st: r.status, html: r.status === 200 ? await r.text() : ''} : {st: 0, html: ''}); }
        const got = seen.get(key);
        if (got.st !== 200) bad.push(`${where}: ${h} → ${got.st}`);
        else if (url.hash){
          // id карточек и разделов часто создаёт скрипт страницы — ищем якорь в загруженной странице, а не в исходном HTML
          if (!got.ids){ const q = await b.newPage({viewport: {width: 1200, height: 900}}); await q.goto(s.url + key, {waitUntil: 'networkidle'}).catch(() => {}); await q.waitForTimeout(300);
            got.ids = new Set(await q.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id).concat([...document.querySelectorAll('a[name]')].map(e => e.name)))); await q.close(); }
          if (!got.ids.has(decodeURIComponent(url.hash.slice(1)))) bad.push(`${where}: ${h} — якоря нет в ${key}`);
        }
      } else {
        total++;
        if (it.type === 'submit' && it.form) continue;
        const {result} = await cdp.send('Runtime.evaluate', {expression: `document.querySelector('[data-chk="${it.i}"]')`});
        const {listeners} = await cdp.send('DOMDebugger.getEventListeners', {objectId: result.objectId, depth: 0});
        // делегированные обработчики на предках тоже считаем (так устроены кнопки ответов в курсах)
        let ok = listeners.some(l => /click|pointer|mouse|touch|key/.test(l.type));
        if (!ok){
          const {result: anc} = await cdp.send('Runtime.evaluate', {expression: `(()=>{const a=[];let e=document.querySelector('[data-chk="${it.i}"]').parentElement;while(e){a.push(e);e=e.parentElement}a.push(document,window);return a})()`});
          const {result: arr} = await cdp.send('Runtime.getProperties', {objectId: anc.objectId, ownProperties: true});
          for (const pr of arr) if (/^\d+$/.test(pr.name) && pr.value.objectId){
            const r = await cdp.send('DOMDebugger.getEventListeners', {objectId: pr.value.objectId, depth: 0});
            if (r.listeners.some(l => /click|pointer/.test(l.type))) { ok = true; break; }
          }
        }
        if (!ok) bad.push(`${where}: кнопка без обработчика`);
      }
    }
    await p.close();
  }
  console.log(`проверено элементов: ${total}`);
  console.log(bad.length ? 'НАЙДЕНО:\n' + [...new Set(bad)].join('\n') : 'мёртвых ссылок и кнопок нет');
  await b.close(); s.close(); process.exit(bad.length ? 1 : 0);
})();
