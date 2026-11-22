// POST /api/auth/pass {pass} — вход по пропуску от российского сервиса id.dilyakhakimova.com.
// Пропуск содержит только случайный номер ученика (uid), живёт 2 минуты и годится один раз.
import { json, bad, readPass, createSession } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.PASS_SECRET || !env.DB) return bad('Вход ещё не настроен', 503);
  let body; try { body = await request.json(); } catch { return bad('Неверный запрос'); }
  const now = Date.now();
  const p = await readPass(env.PASS_SECRET, body && body.pass, now);
  if (!p) return bad('Пропуск не подошёл или устарел. Войди ещё раз', 401);
  await env.DB.prepare('DELETE FROM pass_used WHERE exp < ?').bind(now).run();
  const r = await env.DB.prepare('INSERT OR IGNORE INTO pass_used (n, exp) VALUES (?, ?)').bind(String(p.n), p.exp).run();
  if (!(r.meta && r.meta.changes)) return bad('Этот пропуск уже использован. Войди ещё раз', 401);
  const iso = new Date(now).toISOString();
  await env.DB.prepare('INSERT INTO users (uid, last_seen) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET last_seen = excluded.last_seen').bind(p.uid, iso).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE uid = ?').bind(p.uid).first();
  return json({ ok: true }, 200, { 'set-cookie': await createSession(env, user.id) });
}
