#!/usr/bin/env node
/* Собирает страницы игр /play/<slug>/index.html, каталог /play/index.html и /play/credits.json.
   Данные (tools/play-data.js): play/courses.json — курсы и их статус; play/toys-{vp,ss,ab}.json — игры;
   i18n/play-{vp,ss,ab}.js — тексты игр; i18n/play.js — общие строки; шапка и футер — i18n/site.js.
   Запускается из tools/bake-i18n.js (одна команда на весь сайт) или сам:
     node tools/build-play.js        — русская версия в /play/
     node tools/build-play.js en     — позже: /en/play/
   Сама игра не копируется: страница показывает её в iframe из главы курса в соло-режиме
   (<глава>?toy=<slug>, см. play/bridge.js). Правка игры в курсе = правка на /play/.
   credits.json — подписи «Игра из курса …» и список опубликованных игр для моста (bridge.js). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const KATEX = require('./vendor/katex.min.js');
const {load} = require('./play-data.js');
const chrome = require('./chrome.js'), REL = require('./related.js');
const SITE = 'https://dilyakhakimova.com';
const V = require('./version.js');

function build(lang = 'ru'){
  const {ROOT, I18N, cfg, toys, texts} = load(lang);
  const D = I18N[lang] || {}, RU = I18N.ru;
  const typo = s => I18N.typo(lang, s);
  const fill = (v, o) => v.replace(/\{(\w+)\}/g, (_, x) => x in o ? o[x] : '');
  const t = (k, o = {}) => {
    if (!(k in RU)) throw new Error('build-play: нет ключа ' + k);
    return typo(fill(k in D ? D[k] : RU[k], o));
  };
  const X = (s, k, o = {}) => typo(fill(texts[s][k], o));
  const plain = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const attr = s => plain(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const pre = lang === 'ru' ? '' : '/' + lang;
  const outDir = path.join(ROOT, lang === 'ru' ? '' : lang, 'play');
  const C = id => cfg.courses[id];
  const cname = id => t(C(id).name);
  const st = (id, k, o = {}) => t('play.status.' + C(id).status + '.' + k, o);
  // куда ведёт «шаг N»: у бесплатного курса — сама глава, иначе лендинг курса с якорем статуса
  const stepHref = toy => C(toy.course).status === 'free' ? toy.src : C(toy.course).href + st(toy.course, 'anchor');
  const unitN = toy => ({unit: t(C(toy.course).unit), n: String(toy.step)});

  const head = (title, desc, url, og, extra = '', noindex = false) => `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Страница собрана командой node tools/bake-i18n.js (tools/build-play.js) из play/toys-*.json и i18n/play*.js: правьте их, а не этот файл. -->
${extra}${noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<title>${plain(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${lang === 'ru' ? 'ru_RU' : 'en_US'}">
<meta property="og:site_name" content="${attr(t('logo'))}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:image" content="${SITE}${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=${V}">
<link rel="stylesheet" href="/play/play.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">${t('skip')}</a>
${chrome.header('play', /\/play\/$/.test(url))}
`;
  const foot = () => '\n' + chrome.footer() + '\n';
  // светофор + уровень словами (как на главной и лендингах)
  const chip = lv => `<span class="chip"><span class="lvl l${lv}" aria-hidden="true"></span><span class="vh">${t('lvl.word')} </span><span>${t('lvl.' + lv)}</span></span>`;
  const statusTag = id => `<span class="tag ${C(id).status === 'free' ? 'free' : 'soon'}">${st(id, 'badge')}</span>`;
  const msg = ([who, say]) => `
    <div class="msg ${who}"><img class="ava" src="/ab-basics/img/ava-${who}.jpg" alt="" width="44" height="44"><div class="bubble"><div class="who">${t('play.hero.' + who)}</div><p class="say">${typo(say)}</p></div></div>`;
  const card = o => `
      <li><a href="${pre}/play/${o.slug}/">${chip(o.level)}<b>${X(o.slug, 'q')}</b><span>${X(o.slug, 'lead')}</span><small>${t('play.from')} «${cname(o.course)}», ${t(C(o.course).unit)} ${o.step}</small>${countSlot(o.slug)}<span class="go">${t('play.go')}</span></a></li>`;
  // место под счётчик «сыграли N раз»: пустое и скрытое, пока не включён показ (play/courses.json → showCountsFrom)
  const countSlot = s => `<span class="play-count" data-count-for="${s}" data-show-from="${cfg.showCountsFrom || 0}" hidden></span>`;
  // «Ещё игры»: из поля more, иначе соседи по курсу, потом другие курсы
  const moreOf = toy => {
    if (toy.more) return toy.more.map(s => toys.find(x => x.slug === s)).filter(Boolean);
    const same = toys.filter(x => x.course === toy.course && x.slug !== toy.slug), i = toys.indexOf(toy);
    same.sort((a, b) => Math.abs(toys.indexOf(a) - i) - Math.abs(toys.indexOf(b) - i));
    return same.concat(toys.filter(x => x.course !== toy.course)).slice(0, 3);
  };

  // мини-лаборатория термина, где эта игра встроена (terms/terms.json → toy): ссылка «Что такое … — простыми словами»
  const termOf = {};
  if (lang === 'ru' && fs.existsSync(path.join(ROOT, 'terms/terms.json'))){
    const tctx = {}; tctx.globalThis = tctx;
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n/terms.js'), 'utf8'), tctx);
    for (const x of JSON.parse(fs.readFileSync(path.join(ROOT, 'terms/terms.json'), 'utf8')).terms){
      const nm = tctx.TERMS_TEXT.ru[x.slug].name, low = /^[А-ЯЁ][а-яё]/.test(nm) ? nm[0].toLowerCase() + nm.slice(1) : nm;
      if (x.published && !termOf[x.toy]) termOf[x.toy] = {slug: x.slug, text: typo(fill(tctx.I18N.ru['terms.playLink'], {name: low}))};
    }
  }
  const RI = REL.index();
  const relCard = o => `
      <li><a href="${o.href}"><span class="kind">${REL.KIND[o.kind]}</span><b>${typo(o.title)}</b><span>${typo(o.line)}</span><span class="go">${REL.GO[o.kind]}</span></a></li>`;
  // «Почему так» — одно решение пронумерованными шагами (решение Дили, 22.11.2026): у шага заголовок 500 и 1–2 фразы,
  // формула отдельной строкой без переноса (общий вид → подстановка → результат), таблица значений — компактная.
  // Если в тексте игры нет поля solution, шаги собираются из out, intuition/right и cheat — без отдельных блоков.
  // **результат** — вес 500 (<b>) в абзаце, формуле, списке и строке после формулы
  // TeX в текстах игр: \( … \) — в строке, \[ … \] — отдельной строкой; типограф формулы не трогает (Диля, 23.11: «везде техом»)
  const bold = s => { const tex = [];
    s = s.replace(/\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g, (m, d, i) => '\u0000' + (tex.push([d || i, !!d]) - 1) + '\u0000');
    return typo(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\u0000(\d+)\u0000/g, (_, k) => KATEX.renderToString(tex[k][0], {output: 'html', throwOnError: false, displayMode: tex[k][1]})); };
  const formula = f => /^\\\[/.test(f) ? `<div class="formula tex">${bold(f)}</div>` : `<p class="formula">${bold(f)}</p>`;
  const stepHtml = st => `
        <li><b class="st-h">${typo(st.h)}.</b> ${st.p ? bold(st.p) : ''}${st.list ? `<ul>${st.list.map(li => `<li>${bold(li)}</li>`).join('')}</ul>` : ''}${(st.f || []).map(formula).join('')}${st.after ? ' ' + bold(st.after) : ''}${st.table ? `
          <table class="table sol-table"><thead><tr>${st.table[0].map((c, i) => `<th${i ? ' class="num"' : ''}>${typo(c)}</th>`).join('')}</tr></thead><tbody>${st.table.slice(1).map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${typo(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}</li>`;
  const solutionHtml = (s, x) => {
    let steps = x.solution;
    if (!steps){
      steps = [{h: t('play.sol.result'), p: texts[s].out}];
      if (x.intuition && x.intuition.length) steps.push({h: t('play.sol.trap'), list: x.intuition});
      if (x.right) steps.push({h: t('play.sol.right'), p: x.right.replace(/^Правильно:\s*/, '')});
      if (x.cheat && x.cheat.length) steps.push({h: t('play.sol.rule'), p: x.cheat.join(' ')});
    }
    return `
      <ol class="solution">${steps.map(stepHtml).join('')}
      </ol>`;
  };
  const credits = {}, solutions = {};   // solutions — «Почему так» для страниц терминов (tools/build-terms.js)
  for (const toy of toys){
    const s = toy.slug, url = `${pre}/play/${s}/`, frame = `${toy.src}?toy=${s}`;
    const q = X(s, 'q'), x = texts[s];
    credits[s] = {
      html: t('play.credit', Object.assign({course: cname(toy.course), href: stepHref(toy) + '?utm_source=play&utm_medium=credit&utm_content=' + s, target: '{target}'}, unitN(toy))),
      badge: st(toy.course, 'badge'), status: C(toy.course).status, published: !!toy.published, truth: x.truth || '',
    };
    solutions[s] = solutionHtml(s, x);
    // встраивание: редирект в соло-режим главы как можно раньше, до загрузки шрифтов и стилей
    // (ref — домен сайта, где встроено: после редиректа document.referrer в iframe был бы уже наш)
    const embedJs = `<script>if (/[?&]embed=1(&|$)/.test(location.search)){ var r = ''; try { r = document.referrer ? new URL(document.referrer).hostname : ''; } catch(e) {} location.replace(${JSON.stringify(frame)} + '&embed=1' + (/[?&]viz=1(&|$)/.test(location.search) ? '&viz=1' : '') + (r ? '&ref=' + encodeURIComponent(r) : '')); }</script>\n`;
    const img = toy.img ? `
    <figure class="art play-art"><img src="${toy.img}" alt="${attr(X(s, 'imgAlt'))}" width="1600" height="900" loading="lazy" onerror="this.parentNode.classList.add('missing')"><figcaption class="ph"></figcaption></figure>` : '';
    const crumbLd = `<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: plain(t('play.crumbs')), item: SITE + pre + '/play/'}, {'@type': 'ListItem', position: 2, name: plain(q), item: SITE + url}]})}</script>\n`;
    const html = head(q + ' · ' + t('play.sim') + ' · ' + plain(t('logo')), X(s, 'lead'), url, `/play/og/${s}.png`, embedJs + crumbLd, !toy.published) + `
<main id="main" class="wrap play" data-toy="${s}" data-frame="${frame}"
  data-share-title="${attr(q)}" data-share-text="${attr(X(s, 'challenge'))}"
  data-s-copied="${attr(t('play.copied'))}">
  <h1>${q}</h1>
  <p class="play-meta">${t('play.fromCap')} <a href="${C(toy.course).href}">«${cname(toy.course)}»</a> · <span class="nw">${t('lvl.' + toy.level)} ${t('play.levelWord')}</span>${countSlot(s)}</p>

  <div class="chat" role="group" aria-label="${attr(t('play.scene'))}">${x.chat.map(msg).join('')}
  </div>

  ${img}

  <div class="stage-frame">
    <iframe id="toy-frame" src="${frame}" title="${attr(t('play.frame') + ': ' + q)}" style="height:${toy.h}px" allow="clipboard-write"></iframe>
    <p class="note noframe">${t('play.noframe', {href: toy.src + '#card-' + (toy.pre[0] || toy.card)})}</p>
  </div>

  <section class="play-out" aria-labelledby="out-h">
    <p class="kicker" id="out-h">${t('play.out')}</p>
    <p class="locked">${t('play.locked')}</p>
    <div class="reveal" hidden>${solutionHtml(s, x)}
    </div>
  </section>

  <div class="play-foot">
    <p class="share-row"><button class="btn-text" type="button" data-act="share">${t('play.share')} <span aria-hidden="true">↗</span></button><span class="note" role="status"></span></p>
    <p class="play-src"><b>${t('play.src')}.</b> ${X(s, 'src')}</p>
  </div>
</main>
${foot()}
<script src="/play/play.js?v=${V}"></script>
</body>
</html>
`;
    fs.mkdirSync(path.join(outDir, s), {recursive: true});
    fs.writeFileSync(path.join(outDir, s, 'index.html'), html);
  }
  console.log('play:', toys.length, 'игр →', path.relative(ROOT, outDir) + '/<slug>/index.html');

  // ---------- каталог (решение Дили, 22.11.2026): сверху три игры «начни с этих», дальше группы по темам
  // (по PER_TOPIC в группе), под ними «Ещё игры» раскрывает остальные опубликованные. Только published: true.
  // Какие три — play/courses.json → catalog.start (неопубликованные пропускаются, недостающие добираются уровнем 1).
  const pub = toys.filter(x => x.published);
  const PER_TOPIC = (cfg.catalog && cfg.catalog.perTopic) || 2;
  let start = ((cfg.catalog && cfg.catalog.start) || []).map(sl => pub.find(x => x.slug === sl)).filter(Boolean);
  for (const x of pub) if (start.length < 3 && x.level === 1 && !start.includes(x)) start.push(x);
  start = start.slice(0, 3);
  const rest = pub.filter(x => !start.includes(x));
  const topics = REL.TOPICS.filter(tp => rest.some(x => x.topic === tp));
  let hiddenN = 0;
  const groups = topics.map(tp => {
    const list = rest.filter(x => x.topic === tp);
    return `
  <section class="cat-group" aria-labelledby="t-${attr(tp).replace(/[^\wа-яё]/gi, '')}">
    <h2 id="t-${attr(tp).replace(/[^\wа-яё]/gi, '')}">${tp}</h2>
    <ul class="toys cat-list" role="list">${list.map((o, i) => { if (i >= PER_TOPIC) hiddenN++; return card(o).replace('<li>', i >= PER_TOPIC ? '<li data-more hidden>' : '<li>'); }).join('')}
    </ul>
  </section>`;
  }).join('');
  const cat = head(t('play.meta.title'), t('play.meta.desc'), `${pre}/play/`, '/play/og/index.png') + `
<!-- основная персона: П1 «Лена перед собесом» (design-system.md, «Персоны»); дополнительная — П3 «Марина, продакт без аналитика» -->
<main id="main" class="wrap play-cat">
  <h1>${t('play.title')}</h1>
  <p class="lead">${t('play.lead')}</p>
  <figure class="cat-art"><img src="/img/play-hero.jpg" width="1600" height="900" alt="${attr(t('play.art.alt'))}" fetchpriority="high" onerror="this.parentNode.hidden=true"></figure>${cfg.order.filter(cid => pub.some(x => x.course === cid)).map(cid => `
  <section class="cat-route" aria-labelledby="c-${cid}">
    <h2 id="c-${cid}"><a href="${C(cid).href}">${cname(cid)}</a></h2>
    <ol class="g-list" role="list">${pub.filter(x => x.course === cid).sort((a, b) => a.step - b.step).map(o => `
      <li><a href="${pre}/play/${o.slug}/"><span class="g-step">${t(C(o.course).unit)} ${o.step}</span><span class="g-q">${X(o.slug, 'q')}</span><span class="g-lead">${X(o.slug, 'lead')}</span><span class="lvl l${o.level}" title="${attr(t('lvl.' + o.level))}"><span class="vh">${t('lvl.word')} ${t('lvl.' + o.level)}</span></span></a></li>`).join('')}
    </ol>
  </section>`).join('')}
  <p class="legend"><span>${t('play.legend')}</span>${[1, 2, 3].map(chip).join('')}</p>
</main>
${foot()}
<script>
(function(){var b=document.getElementById('cat-more');if(!b)return;b.addEventListener('click',function(){var f=null;document.querySelectorAll('.cat-list > li[data-more]').forEach(function(li){if(li.hidden&&!f)f=li;li.hidden=false});b.parentNode.hidden=true;b.setAttribute('aria-expanded','true');if(f){var a=f.querySelector('a');if(a)a.focus()}})})();
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, 'index.html'), cat);
  fs.writeFileSync(path.join(outDir, 'credits.json'), JSON.stringify(credits, null, 1) + '\n');
  if (lang === 'ru') fs.writeFileSync(path.join(ROOT, 'play', 'solutions.json'), JSON.stringify(solutions, null, 1) + '\n');
  console.log('play:', path.relative(ROOT, path.join(outDir, 'index.html')), '+ credits.json');
  // старые страницы игр, которых больше нет в списках
  for (const d of fs.readdirSync(outDir, {withFileTypes: true})){
    if (d.isDirectory() && !['og'].includes(d.name) && !toys.some(x => x.slug === d.name) && fs.existsSync(path.join(outDir, d.name, 'index.html'))
      && /tools\/build-play\.js/.test(fs.readFileSync(path.join(outDir, d.name, 'index.html'), 'utf8')))
      console.warn('play: папка', d.name, 'не в списках игр — удалите её, если игру убрали');
  }
}

module.exports = build;
if (require.main === module) build(process.argv[2] || 'ru');
