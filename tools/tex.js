#!/usr/bin/env node
/* TeX в статичных страницах (решение Дили, 23.11.2026: «все формулы — техом»).
   В исходнике страницы формула пишется как \( … \) — в строке или \[ … \] — отдельной строкой.
   Сборка рендерит её KaTeX и сохраняет исходник в атрибуте: <span class="tx" data-tex="…" data-d="1">…KaTeX…</span>.
   Повторный прогон рендерит заново из data-tex, поэтому страница остаётся и исходником, и результатом.
   Не трогаем <head>, <script>, <style>, <svg>, <pre>, <code>, <textarea>, <template>.
   В <head> страницы с формулами добавляется ссылка на /fonts/katex/katex.min.css.
     node tools/tex.js               — все главы курсов и разборы книг
     node tools/tex.js file.html …   — только эти страницы */
const fs = require('fs'), path = require('path');
const KATEX = require('./vendor/katex.min.js');
const ROOT = path.join(__dirname, '..');
const V = require('./version.js');

const attrEsc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attrUn = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// в исходнике TeX могли оказаться неразрывные пробелы и типографский минус — KaTeX их не любит
const clean = t => t.replace(/ |&nbsp;/g, ' ').replace(/−/g, '-').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const render = (tex, display) => `<span class="tx${display ? ' tx-d' : ''}" data-tex="${attrEsc(tex)}"${display ? ' data-d="1"' : ''}>${KATEX.renderToString(clean(tex), {output: 'html', throwOnError: false, strict: 'ignore', displayMode: display})}</span>`;

// убрать уже отрендеренные формулы обратно в исходник: <span class="tx…" data-tex="…">…</span> с вложенными span
function unrender(s){
  let out = '', i = 0;
  const open = /<span class="tx( tx-d)?" data-tex="([^"]*)"( data-d="1")?>/g;
  let m;
  while ((m = open.exec(s))){
    out += s.slice(i, m.index);
    let depth = 1, j = open.lastIndex;
    const tag = /<span\b[^>]*>|<\/span>/g; tag.lastIndex = j;
    let t;
    while (depth && (t = tag.exec(s))) depth += t[0][1] === '/' ? -1 : 1;
    const end = t ? tag.lastIndex : s.length;
    const tex = attrUn(m[2]);
    out += m[3] ? `\\[${tex}\\]` : `\\(${tex}\\)`;
    i = end; open.lastIndex = end;
  }
  return out + s.slice(i);
}

function processHtml(html){
  const warn = console.warn; console.warn = () => {};  // KaTeX ворчит на «ёлочки» в \text — они рисуются шрифтом страницы, это нормально
  try { return processHtml0(html); } finally { console.warn = warn; }
}
function processHtml0(html){
  const src = unrender(html).replace(/<span class="nw">(\\\([\s\S]*?\\\)[,.;:!?»)]*)<\/span>/g, '$1');
  const SKIP = /(<head[\s>][\s\S]*?<\/head>|<script[\s>][\s\S]*?<\/script>|<style[\s>][\s\S]*?<\/style>|<svg[\s>][\s\S]*?<\/svg>|<pre[\s>][\s\S]*?<\/pre>|<code[\s>][\s\S]*?<\/code>|<textarea[\s>][\s\S]*?<\/textarea>|<template[\s>][\s\S]*?<\/template>)/;
  let n = 0;
  const body = src.split(SKIP).map((x, k) => k % 2 ? x : x
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => (n++, render(t, true)))
    .replace(/\\\(([\s\S]+?)\\\)([,.;:!?»)]*)/g, (_, t, p) => (n++, p ? `<span class="nw">${render(t, false)}${p}</span>` : render(t, false)))).join('');
  let out = body;
  if (n && !/katex\.min\.css/.test(out)) out = out.replace(/<\/head>/, `<link rel="stylesheet" href="/fonts/katex/katex.min.css?v=1${V}">\n</head>`);
  return {html: out, n};
}

function run(files){
  let total = 0;
  for (const f of files){
    const file = path.join(ROOT, f);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const {html: out, n} = processHtml(html);
    total += n;
    if (out !== html) fs.writeFileSync(file, out);
  }
  return total;
}

function allPages(){
  const list = [];
  for (const d of ['probability', 'signal', 'ab-basics', 'stats', 'ab', 'causal'])
    for (const f of fs.readdirSync(path.join(ROOT, d))) if (f.endsWith('.html')) list.push(d + '/' + f);
  for (const d of fs.readdirSync(path.join(ROOT, 'shelf'))){
    const f = path.join('shelf', d, 'index.html');
    if (fs.existsSync(path.join(ROOT, f))) list.push(f);
  }
  return list;
}

module.exports = {run, allPages, processHtml};
if (require.main === module && process.argv[2] === '--src'){
  // вернуть страницы к исходнику \( … \) — для правок руками и скриптами
  const files = process.argv.slice(3).length ? process.argv.slice(3) : allPages();
  for (const f of files){ const file = path.join(ROOT, f), h = fs.readFileSync(file, 'utf8');
    const out = unrender(h).replace(/<span class="nw">(\\\([\s\S]*?\\\)[,.;:!?»)]*)<\/span>/g, '$1'); if (out !== h) fs.writeFileSync(file, out); }
  console.log('tex: исходник в', files.length, 'страницах');
} else if (require.main === module){
  const files = process.argv.slice(2).length ? process.argv.slice(2) : allPages();
  console.log('tex:', run(files), 'формул в', files.length, 'страницах');
}
