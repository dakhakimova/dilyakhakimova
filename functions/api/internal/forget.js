// POST /api/internal/forget {uid} — удалить ученика и весь его прогресс. Зовёт только id.dilyakhakimova.com при удалении аккаунта:
// заголовки x-ts (мс) и x-sig = HMAC-SHA256(PASS_SECRET, "POST /api/internal/forget <ts> <тело>"), запрос не старше 5 минут.
import { json, bad, hmacB64, safeEq } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.PASS_SECRET || !env.DB) return bad('Не настроено', 503);
  const ts = request.headers.get('x-ts') || '', sig = request.headers.get('x-sig') || '', raw = await request.text();
  if (!(Math.abs(Date.now() - Number(ts)) < 5 * 60e3)) return bad('Нет доступа', 403);
  if (!safeEq(sig, await hmacB64(env.PASS_SECRET, `POST /api/internal/forget ${ts} ${raw}`))) return bad('Нет доступа', 403);
  let uid; try { uid = JSON.parse(raw).uid; } catch { return bad('Неверный запрос'); }
  const u = await env.DB.prepare('SELECT id FROM users WHERE uid = ?').bind(String(uid)).first();
  if (u) await env.DB.batch([
    env.DB.prepare('DELETE FROM events WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM promo_codes WHERE user_id = ?').bind(u.id),
    env.DB.prepare('DELETE FROM course_promos WHERE user_id = ? AND redeemed_at IS NULL').bind(u.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id),
  ]);
  return json({ ok: true, deleted: !!u });
}
