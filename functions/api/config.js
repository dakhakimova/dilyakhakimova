// GET /api/config — публичные настройки для страниц: адрес российского сервиса входа.
import { json } from './_lib.js';

export async function onRequestGet({ env }) {
  return json({ id_origin: env.ID_ORIGIN || null });
}
