// POST /api/auth/telegram — вход через Telegram Login Widget.
// Проверка подписи по документации Telegram: секретный ключ = SHA-256(токен бота),
// hash = HMAC-SHA-256(ключ, строка "key=value" по всем полям кроме hash, отсортированным по ключу, через \n).
import { json, bad, hex, createSession } from '../_lib.js';

const MAX_AGE_SEC = 24 * 3600;

async function checkTelegram(data, botToken) {
  if (!data || typeof data !== 'object' || !data.hash || !data.id || !data.auth_date) return false;
  const check = Object.keys(data).filter(k => k !== 'hash' && data[k] !== undefined && data[k] !== null)
    .sort().map(k => `${k}=${data[k]}`).join('\n');
  const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(botToken));
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(check)));
  if (sig !== String(data.hash).toLowerCase()) return false;
  const age = Date.now() / 1000 - Number(data.auth_date);
  return age >= 0 && age < MAX_AGE_SEC;
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.DB) return bad('Сервер ещё не настроен: нет токена бота или базы', 503);
  let data;
  try { data = await request.json(); } catch { return bad('Неверный запрос'); }
  if (!(await checkTelegram(data, env.TELEGRAM_BOT_TOKEN))) return bad('Не удалось подтвердить вход через Telegram', 401);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (tg_id, first_name, username, photo_url, last_seen) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tg_id) DO UPDATE SET first_name = excluded.first_name, username = excluded.username,
       photo_url = excluded.photo_url, last_seen = excluded.last_seen`
  ).bind(Number(data.id), data.first_name || null, data.username || null, data.photo_url || null, now).run();
  const user = await env.DB.prepare('SELECT id FROM users WHERE tg_id = ?').bind(Number(data.id)).first();
  const cookie = await createSession(env, user.id);
  return json({ ok: true }, 200, { 'set-cookie': cookie });
}
