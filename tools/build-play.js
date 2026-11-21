#!/usr/bin/env node
/* Собирает страницы игрушек /play/<slug>/index.html, каталог /play/index.html и /play/credits.json.
   Данные (tools/play-data.js): play/courses.json — курсы и их статус; play/toys-{vp,ss,ab}.json — игрушки;
   i18n/play-{vp,ss,ab}.js — тексты игрушек; i18n/play.js — общие строки; шапка и футер — i18n/site.js.
   Запускается из tools/bake-i18n.js (одна команда на весь сайт) или сам:
     node tools/build-play.js        — русская версия в /play/
     node tools/build-play.js en     — позже: /en/play/
   Сама игрушка не копируется: страница показывает её в iframe из главы курса в соло-режиме
   (<глава>?toy=<slug>, см. play/bridge.js). Правка игрушки в курсе = правка на /play/.
   credits.json — подписи «Игрушка из курса …» и список опубликованных игрушек для моста (bridge.js). */
const fs = require('fs'), path = require('path');
const {load} = require('./play-data.js');
const SITE = 'https://dilyakhakimova.com';
const V = '202611240';

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

  const head = (title, desc, url, og, extra = '') => `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Страница собрана командой node tools/bake-i18n.js (tools/build-play.js) из play/toys-*.json и i18n/play*.js: правьте их, а не этот файл. -->
${extra}<title>${plain(title)}</title>
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Marck+Script&family=Onest:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/home.css?v=202611221">
<link rel="stylesheet" href="/play/play.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">${t('skip')}</a>
<header class="top wrap">
  <div class="brand">
    <a class="logo" href="${pre}/">${t('logo')}</a>
    <p class="tagline">${t('tagline')}</p>
  </div>
  <nav aria-label="${attr(t('nav.label'))}">
    <a href="${pre}/#courses">${t('nav.courses')}</a>
    <a href="${pre}/play/" aria-current="page">${t('nav.play')}</a>
    <a href="${pre}/#read">${t('nav.read')}</a>
    <a href="${pre}/about/">${t('nav.about')}</a>
  </nav>
</header>
`;
  const foot = () => `
<footer class="foot">
  <div class="wrap foot-grid">
    <div>
      <h2>${t('foot.courses')}</h2>
      <ul role="list">
        <li><a href="/probability/">${t('foot.c.prob')}</a><span class="note">${t('free')}</span></li>
        <li><a href="/signal/">${t('foot.c.sig')}</a><span class="note">${t('free')}</span></li>
        <li><a href="/ab-basics/">${t('foot.c.ab')}</a><span class="note">${t('free')}</span></li>
        <li><a href="/stats/">${t('foot.c.st')}</a><span class="note">${t('soon.w27')} · <a href="/stats/#waitlist">${t('wait.title').toLowerCase()}</a></span></li>
        <li><a href="/ab/">${t('foot.c.abm')}</a><span class="note">${t('soon.w27')} · <a href="/ab/#waitlist">${t('wait.title').toLowerCase()}</a></span></li>
        <li><a href="/causal/">${t('foot.c.cau')}</a><span class="note">${t('later')}</span></li>
      </ul>
    </div>
    <div>
      <h2>${t('foot.more')}</h2>
      <ul role="list">
        <li><a href="${pre}/play/">${t('play.all')}</a></li>
        <li><a href="https://habr.com/ru/companies/yandex/articles/919966/">${t('foot.habr')}</a></li>
        <li><a href="/about/">${t('nav.about')}</a></li>
        <li><a href="/account.html">${t('nav.progress')}</a></li>
      </ul>
    </div>
    <p class="copy">${t('foot.copy')}</p>
  </div>
</footer>
`;
  // светофор + уровень словами (как на главной и лендингах)
  const chip = lv => `<span class="chip"><span class="lvl l${lv}" aria-hidden="true"></span><span class="vh">${t('lvl.word')} </span><span>${t('lvl.' + lv)}</span></span>`;
  const statusTag = id => `<span class="tag ${C(id).status === 'free' ? 'free' : 'soon'}">${st(id, 'badge')}</span>`;
  const msg = ([who, say]) => `
    <div class="msg ${who}"><img class="ava" src="/ab-basics/img/ava-${who}.jpg" alt="" width="44" height="44"><div class="bubble"><div class="who">${t('play.hero.' + who)}</div><p class="say">${typo(say)}</p></div></div>`;
  const card = o => `
      <li><a href="${pre}/play/${o.slug}/">${chip(o.level)}<b>${X(o.slug, 'q')}</b><span>${X(o.slug, 'lead')}</span><small>${t('play.from')} «${cname(o.course)}», ${t(C(o.course).unit)} ${o.step}</small>${countSlot(o.slug)}<span class="go">${t('play.go')}</span></a></li>`;
  // место под счётчик «сыграли N раз»: пустое и скрытое, пока не включён показ (play/courses.json → showCountsFrom)
  const countSlot = s => `<span class="play-count" data-count-for="${s}" data-show-from="${cfg.showCountsFrom || 0}" hidden></span>`;
  // «Ещё игрушки»: из поля more, иначе соседи по курсу, потом другие курсы
  const moreOf = toy => {
    if (toy.more) return toy.more.map(s => toys.find(x => x.slug === s)).filter(Boolean);
    const same = toys.filter(x => x.course === toy.course && x.slug !== toy.slug), i = toys.indexOf(toy);
    same.sort((a, b) => Math.abs(toys.indexOf(a) - i) - Math.abs(toys.indexOf(b) - i));
    return same.concat(toys.filter(x => x.course !== toy.course)).slice(0, 3);
  };

  const credits = {};
  for (const toy of toys){
    const s = toy.slug, url = `${pre}/play/${s}/`, frame = `${toy.src}?toy=${s}`;
    const q = X(s, 'q'), x = texts[s], others = moreOf(toy);
    credits[s] = {
      html: t('play.credit', Object.assign({course: cname(toy.course), href: stepHref(toy) + '?utm_source=play&utm_medium=credit&utm_content=' + s, target: '{target}'}, unitN(toy))),
      badge: st(toy.course, 'badge'), status: C(toy.course).status,
    };
    // встраивание: редирект в соло-режим главы как можно раньше, до загрузки шрифтов и стилей
    // (ref — домен сайта, где встроено: после редиректа document.referrer в iframe был бы уже наш)
    const embedJs = `<script>if (/[?&]embed=1(&|$)/.test(location.search)){ var r = ''; try { r = document.referrer ? new URL(document.referrer).hostname : ''; } catch(e) {} location.replace(${JSON.stringify(frame)} + '&embed=1' + (r ? '&ref=' + encodeURIComponent(r) : '')); }</script>\n`;
    const img = toy.img ? `
    <figure class="art"><img src="${toy.img}" alt="${attr(X(s, 'imgAlt'))}" width="1600" height="900" loading="lazy" onerror="this.parentNode.classList.add('missing')"><figcaption class="ph"></figcaption></figure>` : '';
    const html = head(q + ' · ' + t('play.title') + ' · ' + plain(t('logo')), X(s, 'lead'), url, `/play/og/${s}.png`, embedJs) + `
<nav class="crumbs wrap" aria-label="${attr(t('crumbs.label'))}">
  <ol>
    <li><a href="${pre}/play/">${t('play.crumbs')}</a></li>
    <li><span aria-current="page">${q}</span></li>
  </ol>
</nav>

<main id="main" class="wrap play" data-toy="${s}" data-frame="${frame}"
  data-share-title="${attr(q)}" data-share-text="${attr(X(s, 'challenge'))}"
  data-s-copied="${attr(t('play.copied'))}" data-s-copied-msg="${attr(t('play.copiedMsg'))}">
  <p class="chips">${chip(toy.level)}<a class="tag" href="${C(toy.course).href}">${t('play.from')} «${cname(toy.course)}»</a>${countSlot(s)}</p>
  <h1>${q}</h1>

  <div class="chat" role="group" aria-label="${attr(t('play.scene'))}">${x.chat.map(msg).join('')}
  </div>

  <section class="play-what${toy.img ? ' has-art' : ''}" aria-labelledby="what-h">
    <h2 id="what-h">${t('play.what')}</h2>
    <div class="what-body">${x.what.map(p => `<p>${typo(p)}</p>`).join('')}</div>${img}
  </section>

  <div class="stage-frame">
    <iframe id="toy-frame" src="${frame}" title="${attr(t('play.frame') + ': ' + q)}" style="height:${toy.h}px" allow="clipboard-write"></iframe>
    <p class="note noframe">${t('play.noframe', {href: toy.src + '#card-' + (toy.pre[0] || toy.card)})}</p>
  </div>

  <section class="play-try" aria-labelledby="try-h">
    <h2 id="try-h">${t('play.try')}</h2>
    <ol>${x.try.map(li => `<li>${typo(li)}</li>`).join('')}</ol>
  </section>

  <section class="play-out" aria-labelledby="out-h" aria-live="polite">
    <h2 id="out-h">${t('play.out')}</h2>
    <p class="locked">${t('play.locked')}</p>
    <div class="reveal" hidden>
      <p>${X(s, 'out')}</p>${x.cheat.length ? `
      <h3>${t('play.cheat')}</h3>
      <ul class="cheat">${x.cheat.map(li => `<li>${typo(li)}</li>`).join('')}</ul>` : ''}
    </div>
  </section>

  <section class="play-share" aria-label="${attr(t('play.share'))}">
    <div class="row">
      <button class="btn" type="button" data-act="share">${t('play.share')}</button>
      <button class="btn ghost" type="button" data-act="copy">${t('play.copy')}</button>
      <span class="note" role="status"></span>
    </div>
    <details class="embed">
      <summary>${t('play.embed')}</summary>
      <p class="note">${t('play.embedNote')}</p>
      <textarea readonly rows="4" spellcheck="false" aria-label="${attr(t('play.embed'))}"></textarea>
    </details>
  </section>

  <p class="play-src"><b>${t('play.src')}.</b> ${X(s, 'src')}</p>

  <section class="play-next" aria-labelledby="next-h">
    <h2 id="next-h">${t('play.next')}</h2>
    <p>${X(s, 'next', {href: stepHref(toy)})}</p>
    <p class="ctas"><a class="btn" href="${stepHref(toy)}">${st(toy.course, 'cta', unitN(toy))}</a><a class="btn link" href="${C(toy.course).href}">${t('play.course')} «${cname(toy.course)}»</a></p>
    <p class="status">${statusTag(toy.course)}</p>
  </section>
${others.length ? `
  <section class="play-more" aria-labelledby="more-h">
    <h2 id="more-h">${t('play.more')}</h2>
    <ul class="toys" role="list">${others.map(card).join('')}</ul>
  </section>` : ''}
</main>
${foot()}
<script src="/play/play.js?v=${V}"></script>
</body>
</html>
`;
    fs.mkdirSync(path.join(outDir, s), {recursive: true});
    fs.writeFileSync(path.join(outDir, s, 'index.html'), html);
  }
  console.log('play:', toys.length, 'игрушек →', path.relative(ROOT, outDir) + '/<slug>/index.html');

  // ---------- каталог: по курсам ----------
  const groups = cfg.order.map(id => ({id, list: toys.filter(x => x.course === id)})).filter(g => g.list.length);
  const cat = head(t('play.meta.title'), t('play.meta.desc'), `${pre}/play/`, '/play/og/index.png') + `
<main id="main" class="wrap play-cat">
  <h1>${t('play.title')}</h1>
  <p class="lead">${t('play.lead')}</p>
  <p class="legend"><span>${t('play.legend')}</span>${[1, 2, 3].map(chip).join('')}</p>
${groups.map(g => `
  <section class="cat-course" aria-labelledby="cat-${g.id}">
    <h2 id="cat-${g.id}"><a href="${C(g.id).href}">${cname(g.id)}</a> ${statusTag(g.id)}</h2>
    <ul class="toys" role="list">${g.list.map(card).join('')}
    </ul>
  </section>`).join('')}
</main>
${foot()}
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, 'index.html'), cat);
  fs.writeFileSync(path.join(outDir, 'credits.json'), JSON.stringify(credits, null, 1) + '\n');
  console.log('play:', path.relative(ROOT, path.join(outDir, 'index.html')), '+ credits.json');
  // старые страницы игрушек, которых больше нет в списках
  for (const d of fs.readdirSync(outDir, {withFileTypes: true})){
    if (d.isDirectory() && !['og'].includes(d.name) && !toys.some(x => x.slug === d.name) && fs.existsSync(path.join(outDir, d.name, 'index.html'))
      && /tools\/build-play\.js/.test(fs.readFileSync(path.join(outDir, d.name, 'index.html'), 'utf8')))
      console.warn('play: папка', d.name, 'не в списках игрушек — удалите её, если игрушку убрали');
  }
}

module.exports = build;
if (require.main === module) build(process.argv[2] || 'ru');
