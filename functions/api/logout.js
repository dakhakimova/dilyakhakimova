// POST /api/logout — завершить сессию.
import { json, readCookie, sha256, clearCookie } from './_lib.js';

export async function onRequestPost({ request, env }) {
  const token = readCookie(request);
  if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': clearCookie });
}
