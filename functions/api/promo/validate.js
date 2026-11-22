// POST /api/promo/validate {code} — проверить промокод (не тратит его). Для страницы оплаты, когда она появится.
import { json, validatePromo } from '../_lib.js';
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'База не подключена' }, 503);
  let body = {}; try { body = await request.json(); } catch (e) {}
  return json(await validatePromo(env, body.code));
}
