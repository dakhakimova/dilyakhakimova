// GET /api/config — публичные настройки для страниц: имя бота для кнопки входа.
import { json } from './_lib.js';

export async function onRequestGet({ env }) {
  return json({ telegram_bot: env.TELEGRAM_BOT_NAME || null });
}
