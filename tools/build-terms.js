#!/usr/bin/env node
/* Собирает мини-лаборатории терминов /terms/<slug>/index.html, хаб /terms/index.html, а заодно /sitemap.xml.
   Данные: terms/terms.json — список терминов (тема, игра, призыв, сравнение, связанные); i18n/terms.js — тексты;
   шапка и футер — i18n/site.js и i18n/play.js; схемы SVG — tools/terms-viz.js; названия игр /play/ — tools/play-data.js.
   Запускается из tools/bake-i18n.js (одна команда на весь сайт) или сам: node tools/build-terms.js
   Проверки при сборке (ошибка — сборка не проходит): title ≤ 65 знаков, description 50–220 знаков и не равен title,
   у термина есть пример, игра, схема и две задачи (иначе страница выходит с noindex), сравнение ссылается на существующий термин.
   Внизу — две тонкие строки (где это в курсе; связанные термины из terms.json → related, только опубликованные) и одна кнопка «Поделиться».
   Хаб: поиск, указатель букв и термины по алфавиту (пары 7, 8 гайда). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const {load} = require('./play-data.js');
const {viz, lim} = require('./terms-viz.js');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://dilyakhakimova.com';
const V = require('./version.js');
const chrome = require('./chrome.js'), REL = require('./related.js');
const FONTS = '/fonts/fonts.css';  // свои шрифты (fonts/fonts.css), без Google Fonts
const HEROES = {bob: 'play.hero.bob', alice: 'play.hero.alice', kot: 'play.hero.kot'};

function build(){
  const P = load('ru');                       // игры /play/ и словари site.js + play.js
  const ctx = {}; ctx.globalThis = ctx;
  for (const f of ['i18n/site.js', 'i18n/play.js', 'i18n/terms.js']) vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, {filename: f});
  const RU = ctx.I18N.ru, TX = ctx.TERMS_TEXT.ru, typo = s => ctx.I18N.typo('ru', s);
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'terms/terms.json'), 'utf8'));
  const fill = (v, o) => v.replace(/\{(\w+)\}/g, (_, x) => x in o ? o[x] : '{' + x + '}');
  const t = (k, o = {}) => { if (!(k in RU)) throw new Error('build-terms: нет ключа ' + k); return typo(fill(RU[k], o)); };
  const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/ /g, ' ');
  const attr = s => plain(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const json = o => JSON.stringify(o).replace(/</g, '\\u003c');
  const terms = cfg.terms, bySlug = Object.fromEntries(terms.map(x => [x.slug, x]));
  const name = s => TX[s].name;
  const h1Of = s => TX[s].h1 || fill(RU['terms.h1'], {name: TX[s].name});
  const courseName = {vp: t('foot.c.prob'), ss: t('foot.c.sig'), ab: t('foot.c.ab')};
  const unit = {vp: t('terms.unit.step'), ss: t('terms.unit.chapter'), ab: t('terms.unit.step')};
  const playCourse = {vp: 'vp', ss: 'ss', ab: 'ab'};

  const head = (o) => `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Страница собрана командой node tools/bake-i18n.js (tools/build-terms.js) из terms/terms.json и i18n/terms.js: правьте их, а не этот файл. -->
<title>${plain(o.title)}</title>
<meta name="description" content="${attr(o.desc)}">
${o.noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<link rel="canonical" href="${SITE}${o.url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Диля Хакимова">
<meta property="og:url" content="${SITE}${o.url}">
<meta property="og:title" content="${attr(o.ogTitle || o.title)}">
<meta property="og:description" content="${attr(o.desc)}">
<meta property="og:image" content="${SITE}${o.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/onest-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${FONTS}?v=${V}">
<link rel="stylesheet" href="/tokens.css?v=${V}">
<link rel="stylesheet" href="/home.css?v=${V}">
<link rel="stylesheet" href="/terms/terms.css?v=${V}">
<script type="application/ld+json">${json(o.ld)}</script>
</head>
<body class="t-page">
<a class="skip" href="#main">${t('skip')}</a>
${chrome.header('terms', o.url === '/terms/')}
`;
  const foot = () => '\n' + chrome.footer() + '\n';
  const person = {'@type': 'Person', name: 'Диля Хакимова', url: SITE + '/about/'};
  const termSet = {'@type': 'DefinedTermSet', '@id': SITE + '/terms/#set', name: plain(t('terms.hub.h1')), url: SITE + '/terms/'};
  const msg = ([who, say]) => `
      <div class="msg ${who}"><img class="ava" src="/ab-basics/img/ava-${who}.jpg" alt="" width="44" height="44" loading="lazy"><div class="bubble"><div class="who">${t(HEROES[who])}</div><p class="say">${typo(say)}</p></div></div>`;
  const card = (href, title, line, go = t('terms.go')) => `
      <li><a href="${href}"><b>${typo(title)}</b><span>${typo(line)}</span><span class="go">${go}</span></a></li>`;
  const toyOf = slug => P.toys.find(x => x.slug === slug);

  // ---------- игры, сделанные для страниц терминов (логика — terms/toys.js) ----------
  const ownToy = (id, x) => {
    const s = Object.assign({}, x.toy); for (const k in s) s[k] = Array.isArray(s[k]) ? s[k].map(typo) : typo(s[k]);
    return `
    <div class="t-toy" data-ttoy="${id}" data-s="${JSON.stringify(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
      <div class="guess">
        <p class="eyebrow">${t('tt.guessLabel')}</p>
        <p class="q">${s.q}</p>
        <div class="choice" role="group" aria-label="${attr(t('tt.guessLabel'))}">${s.opts.map((o, i) => `<button type="button" data-v="${i}" aria-pressed="false">${o}</button>`).join('')}</div>
        <p class="note gnote" data-saved="${attr(t('tt.saved'))}">${t('tt.pick')}</p>
      </div>
      <div class="t-body"></div>
    </div>`;
  };

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const urls = [];

  for (const term of terms){
    const s = term.slug, x = TX[s];
    if (!x) throw new Error('build-terms: нет текстов для ' + s);
    for (const k of ['name', 'title', 'desc', 'sub', 'def', 'strict', 'read', 'toyLead', 'toyOut', 'vizT', 'vizCap', 'card', 'wiki']) if (!x[k]) throw new Error(`build-terms: ${s} — нет поля ${k}`);
    if (!viz[s]) throw new Error('build-terms: нет схемы tools/terms-viz.js → viz[' + s + ']');
    const url = `/terms/${s}/`, title = x.title + RU['terms.brand'];
    if (title.length > 65) throw new Error(`build-terms: ${s} — title ${title.length} знаков (> 65): ${title}`);
    if (x.desc.length < 50 || x.desc.length > 220 || plain(x.desc) === plain(x.title)) throw new Error(`build-terms: ${s} — description ${x.desc.length} знаков`);
    // своя игра, свой пример, своя схема и две задачи — иначе noindex (правка 6 из terms-fixes)
    const own = !!term.toy && (x.chat || []).length >= 2 && (x.faq || []).length >= 2 && !!viz[s];
    const isNew = term.toy.startsWith('new:'), ptoy = isNew ? null : toyOf(term.toy);
    if (!isNew && !ptoy) throw new Error(`build-terms: ${s} — игры ${term.toy} нет на /play/`);
    if (isNew && !x.toy) throw new Error(`build-terms: ${s} — нет текстов своей игры (поле toy)`);
    if (term.cmp && !bySlug[term.cmp]) throw new Error(`build-terms: ${s} — cmp ${term.cmp} не термин`);
    for (const r of term.related) if (!bySlug[r]) throw new Error(`build-terms: ${s} — связанный ${r} не термин`);
    const hq = x.hq;
    const relTerms = term.related.filter(r => bySlug[r].published);

    const RI = REL.index();
    const pubToy = slug => RI.toys.some(o => o.slug === slug && o.published);

    const toyBlock = isNew ? ownToy(term.toy.slice(4), x) + `
    <p class="note credit">${t('terms.toy.own')}</p>` : `
    <div class="stage-frame">
      <iframe id="toy-frame" src="/play/${ptoy.slug}/?embed=1" data-toy="${ptoy.slug}" title="${attr(t('terms.toy.frame') + ': ' + P.texts[ptoy.slug].q)}" style="height:${ptoy.h}px" loading="lazy" allow="clipboard-write"></iframe>
      <p class="note noframe">${t('terms.toy.noframe', {href: ptoy.src + '#card-' + (ptoy.pre[0] || ptoy.card)})}</p>
    </div>
    <p class="note credit">${t('terms.toy.from', {course: courseName[playCourse[ptoy.course]], unit: unit[ptoy.course], n: ptoy.step, slug: ptoy.slug})}</p>`;

    const cmp = x.cmp, cmpLink = term.cmp && bySlug[term.cmp].published ? `<a href="/terms/${term.cmp}/">${typo(h1Of(term.cmp))} →</a>` : (term.cmpHref && (!/^\/play\//.test(term.cmpHref) || pubToy(term.cmpHref.split('/')[2])) ? `<a href="${term.cmpHref}">${t('terms.cmp.toy', {name: cmp.name})}</a>` : '');
    const c = term.cta;
    if (!lim[s] && !term.limToy) throw new Error(`build-terms: ${s} — у блока «Когда метод врёт» нет ни кадра (terms-viz.js → lim), ни игры (limToy)`);
    if (term.limToy && !toyOf(term.limToy)) throw new Error(`build-terms: ${s} — limToy ${term.limToy} нет на /play/`);
    const limFig = !lim[s] ? (!pubToy(term.limToy) ? '' : `
    <p class="more-link lim-toy"><a href="/play/${term.limToy}/">${t('terms.limToy', {q: plain(P.texts[term.limToy].q)})}</a></p>`) : lim[s] ? `
    <figure class="viz small">${lim[s](Object.fromEntries(Object.entries(x.lz).map(([k, v]) => [k, plain(typo(v))])))}<figcaption class="figcap">${typo(x.limViz)}</figcaption></figure>` : '';
    const vzPlain = Object.fromEntries(Object.entries(x.vz).map(([k, v]) => [k, plain(typo(v))]));
    const wiki = 'https://ru.wikipedia.org/w/index.php?search=' + encodeURIComponent(x.wiki);

    const ld = {'@context': 'https://schema.org', '@graph': [
      {'@type': 'BreadcrumbList', itemListElement: [
        {'@type': 'ListItem', position: 1, name: plain(t('terms.home')), item: SITE + '/'},
        {'@type': 'ListItem', position: 2, name: plain(t('terms.hub.crumb')), item: SITE + '/terms/'},
        {'@type': 'ListItem', position: 3, name: plain(x.name), item: SITE + url}]},
      {'@type': 'DefinedTerm', '@id': SITE + url + '#term', name: plain(x.name), description: plain(x.def), url: SITE + url, inDefinedTermSet: termSet},
      {'@type': 'LearningResource', name: plain(h1Of(s)), description: plain(x.desc), url: SITE + url, inLanguage: 'ru', learningResourceType: 'interactive explanation',
        author: person, about: {'@id': SITE + url + '#term'}, isAccessibleForFree: true},
      {'@type': 'FAQPage', mainEntity: x.faq.map(([q, a]) => ({'@type': 'Question', name: plain(q), acceptedAnswer: {'@type': 'Answer', text: plain(a)}}))},
    ]};

    const html = head({title, desc: x.desc, url, og: `/terms/og/${s}.png`, noindex: !own || !term.published, ld}) + `
<main id="main" class="wrap term" data-slug="${s}"
  data-share-title="${attr(h1Of(s))}" data-share-text="${attr(t('terms.shareText', {name: x.name}))}"
  data-s-copied="${attr(t('terms.copied'))}">
  <header class="t-hero">
    <p class="eyebrow">${t('terms.kicker')}</p>
    <h1>${typo(h1Of(s))}</h1>
    <p class="t-sub">${typo(x.sub)}</p>
  </header>
  <p class="t-def">${typo(x.def)}</p>
  <p class="t-not">${t('terms.not', {href: wiki, wiki: x.wiki})}</p>

  <section class="t-sec" aria-labelledby="strict-h">
    <h2 id="strict-h">${typo(hq.strict)}</h2>
    <p>${typo(x.strict)}</p>${x.formula ? `
    <div class="formula" role="math" aria-label="${attr(x.read)}">${x.formula}</div>` : ''}
    <p class="t-read"><span class="lbl">${t('terms.read.h')}.</span> ${typo(x.read)}</p>
  </section>

  <section class="t-sec" aria-labelledby="cafe-h">
    <h2 id="cafe-h">${typo(hq.cafe)}</h2>
    <div class="chat" role="group" aria-label="${attr(t('terms.cafe.h'))}">${x.chat.map(msg).join('')}
    </div>
  </section>

  <section class="t-sec t-toy-sec" aria-labelledby="toy-h">
    <h2 id="toy-h">${typo(hq.toy)}</h2>
    <p>${typo(x.toyLead)}</p>${toyBlock}
    <h3>${t('terms.toy.out')}</h3>
    <p>${typo(x.toyOut)}</p>
  </section>

  <section class="t-sec" aria-labelledby="viz-h">
    <h2 id="viz-h">${typo(hq.viz)}</h2>
    <figure class="viz">
      <p class="chart-head">${typo(x.vizT)}</p>
      ${viz[s](vzPlain)}
      <figcaption class="figcap">${typo(x.vizCap)}</figcaption>
    </figure>
  </section>

  <section class="t-sec" aria-labelledby="err-h">
    <h2 id="err-h">${typo(hq.err)}</h2>
    <ul class="list t-err">${x.mistakes.map(([a, b]) => `
      <li><span class="lead">${typo(a)}</span> ${typo(b)}</li>`).join('')}
    </ul>
  </section>

  <section class="t-sec" aria-labelledby="lim-h">
    <h2 id="lim-h">${typo(hq.lim)}</h2>
    ${x.lim.map(p => `<p>${typo(p)}</p>`).join('\n    ')}${limFig}
  </section>

  <section class="t-sec" aria-labelledby="cmp-h">
    <h2 id="cmp-h">${typo(hq.cmp)}</h2>
    <div class="t-table-wrap"><table class="t-table">
      <thead><tr><th scope="col"></th>${cmp.head.map(h => `<th scope="col">${typo(h)}</th>`).join('')}</tr></thead>
      <tbody>${cmp.rows.map(r => `
        <tr><th scope="row">${typo(r[0])}</th><td>${typo(r[1])}</td><td>${typo(r[2])}</td></tr>`).join('')}
      </tbody>
    </table></div>
    <p class="t-pick">${typo(cmp.pick)}</p>${cmpLink ? `
    <p class="more-link">${cmpLink}</p>` : ''}
  </section>

  <section class="t-sec" aria-labelledby="faq-h">
    <h2 id="faq-h">${typo(hq.faq)}</h2>${x.faq.map(([q, a], i) => `
    <details class="t-faq">
      <summary><span class="q">${typo(q)}</span><span class="show">${t('terms.faq.show')}</span></summary>
      <p>${typo(a)}</p>
    </details>`).join('')}
  </section>

  <section class="t-sec t-next" aria-label="${attr(t('terms.next.label'))}">
    <p>${t('terms.cta.text', {course: courseName[c.course], unit: unit[c.course], n: c.n, title: c.title, href: c.href})}</p>${relTerms.length ? `
    <p>${t('terms.rel.h')}: ${relTerms.map(r => `<a href="/terms/${r}/">${typo(TX[r].name)}</a>`).join(', ')}</p>` : ''}
  </section>

  <p class="share-row t-share"><button class="btn-text" type="button" data-act="share">${t('terms.share')} <span aria-hidden="true">↗</span></button><span class="note" role="status"></span></p>

  <p class="t-author">${t('terms.author')}</p>
</main>
${foot()}
<script src="/terms/terms.js?v=${V}"></script>${isNew ? `
<script src="/terms/toys.js?v=${V}"></script>` : ''}
</body>
</html>
`;
    fs.mkdirSync(path.join(ROOT, 'terms', s), {recursive: true});
    // доступность схем: у SVG — <title> (название) и связь с подписью с данными (aria-describedby на figcaption)
    let fi = 0;
    const html2 = html.replace(/<figure class="viz[^"]*">[\s\S]*?<\/figure>/g, fig => {
      if (!/<svg[^>]*role="img"/.test(fig) || !/<figcaption/.test(fig)) return fig;
      const id = `fc-${s}-${++fi}`;
      return fig.replace(/<svg([^>]*)role="img"/, `<svg$1role="img" aria-describedby="${id}"`).replace(/<figcaption class="figcap">/, `<figcaption class="figcap" id="${id}">`);
    });
    fs.writeFileSync(path.join(ROOT, 'terms', s, 'index.html'), html2);
    if (term.published) urls.push(url);
  }

  // ---------- хаб ----------
  const hubLd = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: plain(t('terms.home')), item: SITE + '/'},
      {'@type': 'ListItem', position: 2, name: plain(t('terms.hub.crumb')), item: SITE + '/terms/'}]},
    Object.assign({}, termSet, {'@context': undefined, author: person, hasDefinedTerm: terms.filter(o => o.published).map(o => ({'@type': 'DefinedTerm', name: plain(TX[o.slug].name), url: `${SITE}/terms/${o.slug}/`}))}),
  ]};
  // хаб: термины по алфавиту (кириллица, затем латиница — как сортирует ru), указатель — только буквы, на которые есть термины
  const hubList = terms.filter(o => o.published).sort((a, b) => TX[a.slug].name.localeCompare(TX[b.slug].name, 'ru')).map(o => Object.assign({}, o));
  const letters = [];
  hubList.forEach(o => { const L = TX[o.slug].name[0].toUpperCase(); if (!letters.length || letters[letters.length - 1][0] !== L){ o.first = letters.length + 1; letters.push([L, o.first]); } });
  const hub = head({title: t('terms.hub.title'), desc: t('terms.hub.desc'), url: '/terms/', og: '/terms/og/index.png', ld: hubLd}) + `
<main id="main" class="wrap term-hub">
  <h1>${t('terms.hub.h1')}</h1>
  <p class="lead">${t('terms.hub.lead')}</p>
  <p class="t-search"><label for="t-q">${t('terms.hub.search')}</label><input id="t-q" type="search" autocomplete="off" spellcheck="false"></p>
  <nav class="t-abc" aria-label="${attr(t('terms.hub.abc'))}">${letters.map(([L, i]) => `<a href="#abc-${i}">${L}</a>`).join('')}</nav>
  <ul class="toys cat-list" role="list">${hubList.map(o => card(`/terms/${o.slug}/`, TX[o.slug].name, TX[o.slug].card).replace('<li>', `<li${o.first !== undefined ? ` id="abc-${o.first}"` : ''} data-q="${attr([TX[o.slug].name, ...(o.aka || [])].join(' ').toLowerCase())}">`)).join('')}
  </ul>
  <p class="t-empty" role="status" hidden><span></span> <button class="btn-text" type="button">${t('terms.hub.reset')}</button></p>
  <p class="t-author">${t('terms.author')}</p>
</main>
${foot()}
<script>
(function(){var q=document.getElementById('t-q'),li=[].slice.call(document.querySelectorAll('.cat-list > li')),abc=document.querySelector('.t-abc'),em=document.querySelector('.t-empty'),msg=${json(RU['terms.hub.none'])};
function go(){var D=/[\u2010-\u2015\-]/g,v=q.value.trim().toLowerCase().replace(D,'-'),n=0;li.forEach(function(x){var h=!!v&&x.dataset.q.replace(D,'-').indexOf(v)<0;x.hidden=h;if(!h)n++});abc.hidden=!!v;em.hidden=n>0;if(!n)em.firstChild.textContent=msg.replace('{q}',q.value.trim())}
q.addEventListener('input',go);em.querySelector('button').addEventListener('click',function(){q.value='';go();q.focus()})})();
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, 'terms', 'index.html'), hub);
  console.log('terms:', terms.length, 'терминов + хаб → terms/');

  // ---------- sitemap.xml: только канонические публичные адреса ----------
  const list = ['/', '/courses/', '/about/', '/probability/', '/signal/', '/ab-basics/', '/stats/', '/ab/', '/causal/', '/play/', '/terms/', '/shelf/', '/books/', '/map/', '/start/'];
  for (const b of JSON.parse(fs.readFileSync(path.join(ROOT, 'shelf/shelf.json'), 'utf8')).books) if (b.published && b.review) list.push(b.review);
  for (const d of ['probability', 'signal', 'ab-basics']) for (const f of fs.readdirSync(path.join(ROOT, d)).filter(f => /^\d\d-.*\.html$/.test(f)).sort()) list.push(`/${d}/${f}`);
  if (fs.existsSync(path.join(ROOT, 'ab-basics/cheatsheet.html'))) list.push('/ab-basics/cheatsheet.html');
  for (const o of P.toys) if (o.published) list.push(`/play/${o.slug}/`);
  { const ss = path.join(ROOT, 'play/sample-size.json'); if (fs.existsSync(ss) && JSON.parse(fs.readFileSync(ss, 'utf8')).published) list.push('/play/sample-size/'); }
  list.push(...urls);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!-- Собирает tools/build-terms.js (node tools/bake-i18n.js). Только канонические адреса; без lastmod — его ставим только при правках по существу. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);
  console.log('sitemap.xml:', list.length, 'адресов');
}

module.exports = build;
if (require.main === module) build();
