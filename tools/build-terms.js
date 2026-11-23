#!/usr/bin/env node
/* Собирает мини-лаборатории терминов /terms/<slug>/index.html, хаб /terms/index.html, а заодно /sitemap.xml.
   Данные: terms/terms.json — список терминов (тема, игра, призыв, сравнение, связанные); i18n/terms.js — тексты;
   шапка и футер — i18n/site.js и i18n/play.js; схемы SVG — tools/terms-viz.js; названия игр /play/ — tools/play-data.js.
   Запускается из tools/bake-i18n.js (одна команда на весь сайт) или сам: node tools/build-terms.js
   Проверки при сборке (ошибка — сборка не проходит): title ≤ 65 знаков, description 50–220 знаков и не равен title,
   у термина есть пример, игра, схема и две задачи (иначе страница выходит с noindex), сравнение ссылается на существующий термин.
   Внизу — две тонкие строки (где это в курсе; связанные термины из terms.json → related, только опубликованные) и одна кнопка «Поделиться».
   Хаб: поиск, указатель букв и термины по алфавиту (пары 7, 8 гайда). */
const KATEX = require('./vendor/katex.min.js');
const fs = require('fs'), path = require('path'), vm = require('vm');

// μ и σ в тексте термина — тем же TeX, что и формула (Диля, 23.11): только текст внутри <main>, кроме svg, кода, скриптов и атрибутов
function greek(html){
  const a = html.indexOf('<main'), b = html.indexOf('</main>');
  if (a < 0 || b < 0) return html;
  return html.slice(0, a) + greekFrag(html.slice(a, b)) + html.slice(b);
}
function greekFrag(frag){
  let kd = 0;  // глубина внутри уже готовой формулы KaTeX: её не трогаем
  const TEX = {'μ': '\\mu', 'σ': '\\sigma'};
  let skip = 0;
  return frag.split(/(<[^>]+>)/).map(part => {
    if (kd > 0 && part.startsWith('<')){ if (/^<span[\s>]/.test(part)) kd++; else if (/^<\/span>/.test(part)) kd--; return part; }
    if (/^<span class="katex/.test(part)){ kd = 1; return part; }
    if (kd > 0) return part;
    if (part.startsWith('<')){
      const m = part.match(/^<(\/?)(svg|script|style|code|pre|textarea|title)\b/i);
      if (m && !part.endsWith('/>')) skip += m[1] ? -1 : 1;
      return part;
    }
    if (skip > 0) return part;
    const S = '[\\s\\u00a0]*', tex = [];
    const put = t => '\u0001' + (tex.push(t) - 1) + '\u0002';
    let x = part
      .replace(new RegExp('X' + S + '~' + S + 'N\\(μ,' + S + 'σ²\\)', 'g'), () => put('X \\sim N(\\mu, \\sigma^2)'))
      .replace(new RegExp('N\\(μ,' + S + 'σ²\\)', 'g'), () => put('N(\\mu, \\sigma^2)'))
      .replace(new RegExp('μ' + S + '±' + S + '2σ', 'g'), () => put('\\mu \\pm 2\\sigma'))
      .replace(/σ\/√(n|\d+)/g, (_, q) => put('\\sigma/\\sqrt{' + q + '}'))
      .replace(/(^|[\s\u00a0(«])([xXn])(?=[\s\u00a0,;:.)»]|$)/g, (_, a, v) => a + put(v))
      .replace(/([μσ])(²)?/g, (m, g, sq) => put(TEX[g] + (sq ? '^2' : '')));
    // короткое слово или знак перед формулой не остаётся в конце строки
    x = x.replace(/(^|[\s\u00a0])([а-яёА-ЯЁ]{1,3}|[=≈~±—–]) (?=\u0001)/g, '$1$2\u00a0');
    return x.replace(/\u0001(\d+)\u0002/g, (_, i) => KATEX.renderToString(tex[i], {output: 'html', throwOnError: false}));
  }).join('');
}
const {load} = require('./play-data.js');
const {viz, lim, top, err, clt} = require('./terms-viz.js');
const SOL = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'play', 'solutions.json'), 'utf8')); } catch { return {}; } })();  // «Почему так» игр — из tools/build-play.js
// все страницы терминов (решение Дили, 22.11.2026: «где объясняем — по центру, размер и шрифт как на нормальном»): шрифт 20 px, колонка ~700 px
const TRIAL = {includes: () => true};
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
<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=${V}">
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
    for (const k of ['name', 'title', 'desc', 'def', 'strict', 'read', 'vizT', 'vizCap', 'card', 'wiki']) if (!x[k]) throw new Error(`build-terms: ${s} — нет поля ${k}`);
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
    <section class="play-out t-out" aria-labelledby="out-h">
      <p class="kicker" id="out-h">${t('play.out')}</p>
      <p class="locked">${t('play.locked')}</p>
      <div class="reveal" hidden>${SOL[ptoy.slug] || ''}
      </div>
    </section>
`;  // три шага игры, как на /play/ (решение Дили, 22.11.2026): «Сначала угадай» и «Потом проверь» — внутри iframe, «Почему так» — здесь,
    // открывается по toy:reveal (terms/terms.js). Подпись «Игра из курса …» уже есть внутри игры — вторую не ставим

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
      {'@type': 'FAQPage', mainEntity: [...(x.faqQ || []), ...x.faq].map(([q, a]) => ({'@type': 'Question', name: plain(q), acceptedAnswer: {'@type': 'Answer', text: plain(a)}}))},
    ]};

    // первая картинка — сразу под определением (решение Дили, 22.11.2026): своя top[slug] или, если её нет, главная схема со своим вопросом
    const vizSec = `  <section class="t-sec" aria-labelledby="viz-h">
    <h2 id="viz-h">${typo(hq.viz)}</h2>
    <figure class="viz">
      <p class="chart-head">${typo(x.vizT)}</p>
      ${viz[s](vzPlain)}${x.sg ? `
      <div class="sg-ctl" role="group" aria-label="${attr(x.sg.label)}">${[1, 2, 3].map(k => `<button type="button" class="chip-btn" data-k="${k}" aria-pressed="${k === 2}">±${k}σ</button>`).join('')}</div>
      <p class="sg-out" aria-live="polite">${typo(x.sg.out[1])}</p>
      <script>(function(){var f=document.currentScript.closest('figure'),o=f.querySelector('.sg-out'),T=${json(x.sg.out.map(v => greekFrag(typo(v))))};
f.classList.add('sg-live');function set(k){f.dataset.k=k;f.querySelectorAll('.sg-ctl button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.k==k)});o.innerHTML=T[k-1]}
f.querySelectorAll('.sg-ctl button').forEach(function(b){b.addEventListener('click',function(){set(+b.dataset.k)})});
var go=function(){set(2)};if('IntersectionObserver' in window){var io=new IntersectionObserver(function(e){if(e[0].isIntersecting){io.disconnect();setTimeout(go,250)}},{threshold:.5});io.observe(f)}else go()})();</script>` : ''}
      <figcaption class="figcap">${typo(x.vizCap)}</figcaption>
    </figure>
  </section>
`;
    const html = head({title, desc: x.desc, url, og: `/terms/og/${s}.png`, noindex: !own || !term.published, ld}) + `
<main id="main" class="wrap term${TRIAL.includes(s) ? ' t-wide' : ''}" data-slug="${s}"
  data-share-title="${attr(h1Of(s))}" data-share-text="${attr(t('terms.shareText', {name: x.name}))}"
  data-s-copied="${attr(t('terms.copied'))}">
  <header class="t-hero">
    <p class="eyebrow">${t('terms.kicker')}</p>
    <h1>${typo(h1Of(s))}</h1>
    <p class="t-not">${t('terms.not', {href: wiki, wiki: x.wiki})}</p>
${x.sub ? `    <p class="t-sub">${typo(x.sub)}</p>` : ''}
  </header>
  <p class="t-def">${typo(x.def)}</p>
${top[s] && !x.texTop ? `  <figure class="viz t-top">
    <p class="chart-head">${typo(x.topT)}</p>
    ${(tz => top[s](tz, true) + top[s](tz, false))(Object.fromEntries(Object.entries(x.tz).map(([k, v]) => [k, plain(typo(v))])))}
    <figcaption class="figcap">${typo(x.topCap)}</figcaption>
  </figure>
` : top[s] ? '' : vizSec}
  <section class="t-sec" aria-labelledby="strict-h">
    <h2 id="strict-h">${typo(hq.strict)}</h2>
    <p>${typo(x.strict)}</p>${x.formula ? `
    ${x.tex ? `<div class="formula tex" role="math" aria-label="${attr(x.read)}">${KATEX.renderToString(x.tex, {output: 'html', throwOnError: false, displayMode: true})}</div>` : `<div class="formula" role="math" aria-label="${attr(x.read)}">${x.formula}</div>`}` : ''}
    <p class="t-read"><span class="lbl">${t('terms.read.h')}.</span> ${typo(x.read)}</p>
    ${top[s] && x.texTop ? `
`+`  <figure class="viz">
    <p class="chart-head">${typo(x.topT)}</p>
    ${(tz => top[s](tz, true) + top[s](tz, false))(Object.fromEntries(Object.entries(x.tz).map(([k, v]) => [k, plain(typo(v))])))}
    <figcaption class="figcap">${typo(x.topCap)}</figcaption>
  </figure>
` : ''}
  </section>

${top[s] ? vizSec : ''}



${clt[s] && x.cl ? `  <section class="t-sec" aria-labelledby="clt-h">
    <h2 id="clt-h">${typo(x.cl.h)}</h2>
    <p>${typo(x.cl.p1)}</p>${x.cl.tex ? `
    <div class="formula tex" role="math" aria-label="${attr(x.cl.read)}">${KATEX.renderToString(x.cl.tex, {output: 'html', throwOnError: false, displayMode: true})}</div>` : ''}
    <figure class="viz cl-fig">
      <p class="chart-head">${typo(x.cl.t)}</p>
      ${clt[s](Object.fromEntries(Object.entries(x.cl.vz).map(([k, v]) => [k, plain(typo(v))])))}
      <div class="sg-ctl" role="group" aria-label="${attr(x.cl.label)}">${[1, 2, 5, 30, 1000].map(n => `<button type="button" class="chip-btn" data-k="${n}" aria-pressed="${n === 1}">n = ${n}</button>`).join('')}</div>
      <p class="sg-out" aria-live="polite">${greekFrag(typo(x.cl.out[0]))}</p>
      <script>(function(){var f=document.currentScript.closest('figure'),o=f.querySelector('.sg-out'),N=[1,2,5,30,1000],T=${json(x.cl.out.map(v => greekFrag(typo(v))))};
f.dataset.n=1;f.querySelectorAll('.sg-ctl button').forEach(function(b){b.addEventListener('click',function(){f.dataset.n=b.dataset.k;f.querySelectorAll('.sg-ctl button').forEach(function(c){c.setAttribute('aria-pressed',c===b)});o.innerHTML=T[N.indexOf(+b.dataset.k)]})})})();</script>
    </figure>
    <p>${typo(x.cl.p2)}</p>
  </section>

` : ''}  <section class="t-sec" aria-labelledby="cafe-h">
    <h2 id="cafe-h">${typo(hq.cafe)}</h2>
    <div class="chat" role="group" aria-label="${attr(t('terms.cafe.h'))}">${x.chat.map(msg).join('')}
    </div>
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
    <h2 id="faq-h">${typo(hq.faq)}</h2>${(x.faqQ ? [[t('terms.faq.qual'), x.faqQ], [t('terms.faq.calc'), x.faq]] : [['', x.faq]]).map(([h, list]) => `${h ? `
    <h3 class="t-faq-h">${h}</h3>` : ''}${list.map(([q, a]) => `
    <details class="t-faq">
      <summary><span class="q">${typo(q)}</span><span class="show">${t('terms.faq.show')}</span></summary>
      <p>${typo(a)}</p>
    </details>`).join('')}`).join('')}
  </section>

  <section class="t-sec t-toy-sec" aria-labelledby="toy-h">
    <h2 id="toy-h">${typo(hq.toy)}</h2>
    ${toyBlock}  <!-- без вводного абзаца: игра сама начинается с «Сначала угадай» (решение Дили, 22.11.2026; Д19) -->
  </section>

  <section class="t-sec" aria-labelledby="err-h">
    <h2 id="err-h">${typo(hq.err)}</h2>
    <ul class="list t-err">${x.mistakes.map(([a, b], i) => `
      <li><span class="lead">${typo(a)}</span> ${typo(b)}</li>${err[s] && x.ez && i === (x.ez.after || 0) ? `
    </ul>
    <figure class="viz t-err-viz">${err[s](Object.fromEntries(Object.entries(x.ez).map(([k, v]) => [k, plain(typo(String(v)))])))}<figcaption class="figcap">${typo(x.ez.cap)}</figcaption></figure>
    <ul class="list t-err">` : ''}`).join('')}
    </ul>
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
    fs.writeFileSync(path.join(ROOT, 'terms', s, 'index.html'), greek(html2));
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
  <figure class="t-art"><img src="/img/terms-hero.jpg" width="1600" height="900" alt="Котейка листает на столе кафе толстый словарь, из страниц поднимается колокол нормального распределения" fetchpriority="high" onerror="this.parentNode.hidden=true"></figure>
  ${hubList.length < 6 ? '' : `<p class="t-search"><label for="t-q">${t('terms.hub.search')}</label><input id="t-q" type="search" autocomplete="off" spellcheck="false"></p>
  <nav class="t-abc" aria-label="${attr(t('terms.hub.abc'))}">${letters.map(([L, i]) => `<a href="#abc-${i}">${L}</a>`).join('')}</nav>`}
  <ul class="toys cat-list" role="list">${hubList.map(o => card(`/terms/${o.slug}/`, TX[o.slug].name, TX[o.slug].card).replace('<li>', `<li${o.first !== undefined ? ` id="abc-${o.first}"` : ''} data-q="${attr([TX[o.slug].name, ...(o.aka || [])].join(' ').toLowerCase())}">`)).join('')}
  </ul>
  <p class="t-empty" role="status" hidden><span></span> <button class="btn-text" type="button">${t('terms.hub.reset')}</button></p>
  <p class="t-author">${t('terms.author')}</p>
</main>
${foot()}
<script>
(function(){var q=document.getElementById('t-q');if(!q)return;var li=[].slice.call(document.querySelectorAll('.cat-list > li')),abc=document.querySelector('.t-abc'),em=document.querySelector('.t-empty'),msg=${json(RU['terms.hub.none'])};
function go(){var D=/[\u2010-\u2015\-]/g,v=q.value.trim().toLowerCase().replace(D,'-'),n=0;li.forEach(function(x){var h=!!v&&x.dataset.q.replace(D,'-').indexOf(v)<0;x.hidden=h;if(!h)n++});abc.hidden=!!v;em.hidden=n>0;if(!n)em.firstChild.textContent=msg.replace('{q}',q.value.trim())}
q.addEventListener('input',go);em.querySelector('button').addEventListener('click',function(){q.value='';go();q.focus()})})();
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, 'terms', 'index.html'), hub);
  console.log('terms:', terms.length, 'терминов + хаб → terms/');

  // ---------- sitemap.xml: только канонические публичные адреса ----------
  const list = ['/', '/courses/', '/about/', '/probability/', '/signal/', '/ab-basics/', '/stats/', '/ab/', '/causal/', '/play/', '/terms/', '/shelf/', '/map/', '/start/'];
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
