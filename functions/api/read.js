// POST /api/read — анонимный счётчик чтения страниц: агрегаты (день, страница, источник) в таблице page_reads.
// Тело (navigator.sendBeacon, text/plain): { page: '/shelf/…/', kind: 'view' | 'time', sec: активные секунды с прошлой отправки, first: 1 — первая отправка за загрузку, depth: 100 — впервые дочитали до 90%, source: '…' }
// Без cookie, без входа; IP в базу не пишется. Ответ всегда 204. Клиент — site/reads.js (только на боевом домене, по одному событию каждого вида за загрузку).
const LIMIT = 60, WINDOW = 60e3, seen = new Map();
const none = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
function limited(ip) {
  const now = Date.now(), r = seen.get(ip);
  if (!r || now - r.t > WINDOW) { seen.set(ip, { t: now, n: 1 }); if (seen.size > 5000) seen.clear(); return false; }
  return ++r.n > LIMIT;
}
export async function onRequestPost({ request, env }) {
  if (!env.DB) return none();
  if (limited(request.headers.get('cf-connecting-ip') || '?')) return none();
  let b; try { b = JSON.parse((await request.text()).slice(0, 500)); } catch { return none(); }
  const page = String(b?.page || ''), kind = String(b?.kind || '');
  if (!/^\/[a-z0-9\/._-]{0,120}$/.test(page) || !['view', 'time'].includes(kind)) return none();
  let source = String(b?.source || '').toLowerCase().slice(0, 60);
  if (source && !/^[a-z0-9._-]+$/.test(source)) source = 'other';
  const day = new Date().toISOString().slice(0, 10);
  const sec = Math.max(0, Math.min(3600, Math.round(Number(b?.sec) || 0)));
  const deep = Number(b?.depth) >= 90 ? 1 : 0, first = b?.first ? 1 : 0;   // одно чтение = одна загрузка страницы; добавки времени приходят с first=0
  const q = kind === 'view'
    ? env.DB.prepare(`INSERT INTO page_reads (day, page, source, views) VALUES (?, ?, ?, 1)
        ON CONFLICT (day, page, source) DO UPDATE SET views = views + 1`).bind(day, page, source)
    : env.DB.prepare(`INSERT INTO page_reads (day, page, source, reads, read_sec, deep) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (day, page, source) DO UPDATE SET reads = reads + excluded.reads, read_sec = read_sec + excluded.read_sec, deep = deep + excluded.deep`).bind(day, page, source, first, sec, deep);
  try { await q.run(); } catch { /* таблицы ещё нет (миграция 005) — молча */ }
  return none();
}
