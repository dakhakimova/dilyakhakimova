// POST /api/promo/redeem {code, order} — погасить промокод при оплате. Только для сервера оплаты:
// заголовок Authorization: Bearer <PROMO_SECRET> (секрет в настройках Cloudflare). Оплаты пока нет.
import { json, redeemPromo } from '../_lib.js';
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'База не подключена' }, 503);
  const auth = request.headers.get('Authorization') || '';
  if (!env.PROMO_SECRET || auth !== 'Bearer ' + env.PROMO_SECRET) return json({ error: 'Нет доступа' }, 403);
  let body = {}; try { body = await request.json(); } catch (e) {}
  return json(await redeemPromo(env, body.code, body.order));
}
