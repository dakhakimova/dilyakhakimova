// GET /api/me — кто вошёл, баллы, прогресс, промокоды. 401, если не вошёл.
import { json, currentUser, summary } from './_lib.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'База не подключена' }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Не выполнен вход' }, 401);
  await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(new Date().toISOString(), user.id).run();
  return json(await summary(env, user));
}
