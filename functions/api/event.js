// POST /api/event — сохранить события прохождения (пачкой, до 50 за раз).
// Тело: { events: [{ chapter: 'p01', kind: 'predict', key: 'coin', value: 30 }, ...] }
// Повтор того же события баллов не добавляет (UNIQUE в базе).
import { json, bad, currentUser, scoreEvent, summary } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return bad('База не подключена', 503);
  const user = await currentUser(request, env);
  if (!user) return bad('Не выполнен вход', 401);
  let body;
  try { body = await request.json(); } catch { return bad('Неверный запрос'); }
  const list = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];
  const stmts = [];
  let skipped = 0;
  for (const e of list) {
    const chapter = String(e?.chapter || ''), kind = String(e?.kind || ''), key = String(e?.key ?? '');
    const value = e?.value === undefined || e?.value === null ? null : Number(e.value);
    const pts = scoreEvent(chapter, kind, key, value);
    if (pts === null) { skipped++; continue; }
    stmts.push(env.DB.prepare(
      'INSERT OR IGNORE INTO events (user_id, chapter, kind, key, value, points) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(user.id, chapter, kind, key, value, pts));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, saved: stmts.length, skipped, ...(await summary(env, user)) });
}
