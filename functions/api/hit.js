// POST /api/hit — анонимный счётчик игрушек: +1 к агрегату (день, игрушка, место, событие, источник) в таблице toy_hits.
// Тело (navigator.sendBeacon, text/plain): { slug: 'galton', place: 'course' | 'play' | 'embed', kind: 'play' | 'view' | 'share_click', source: '…' }
// Без cookie, без входа, без баллов; IP в базу не пишется. Ответ всегда 204 — клиент ошибки не разбирает.
// Защита от накрутки: клиент шлёт не больше одного события на игрушку и вид за загрузку страницы (play/bridge.js, play/play.js);
// здесь — грубый лимит на адрес в памяти воркера (не в базе). Для строгой защиты — правило Rate limiting в панели Cloudflare на /api/hit.
const PLACES = ['course', 'play', 'embed'], KINDS = ['play', 'view', 'share_click'];
const LIMIT = 120, WINDOW = 60e3;                 // не больше 120 событий в минуту с одного адреса (на один экземпляр воркера)
const seen = new Map();
const none = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

function limited(ip) {
  const now = Date.now(), r = seen.get(ip);
  if (!r || now - r.t > WINDOW) { seen.set(ip, { t: now, n: 1 }); if (seen.size > 5000) seen.clear(); return false; }
  return ++r.n > LIMIT;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return none();
  if (limited(request.headers.get('cf-connecting-ip') || '?')) return none();
  let b;
  try { b = JSON.parse((await request.text()).slice(0, 500)); } catch { return none(); }
  const slug = String(b?.slug || ''), place = String(b?.place || ''), kind = String(b?.kind || '');
  if (!/^[a-z0-9-]{1,40}$/.test(slug) || !PLACES.includes(place) || !KINDS.includes(kind)) return none();
  let source = String(b?.source || '').toLowerCase().slice(0, 60);
  if (source && !/^[a-z0-9._-]+$/.test(source)) source = 'other';
  const day = new Date().toISOString().slice(0, 10);
  try {
    await env.DB.prepare(
      `INSERT INTO toy_hits (day, slug, place, kind, source, count) VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT (day, slug, place, kind, source) DO UPDATE SET count = count + 1`
    ).bind(day, slug, place, kind, source).run();
  } catch { /* таблицы ещё нет (не применена миграция 002) — молча */ }
  return none();
}
