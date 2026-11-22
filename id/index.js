// Точка входа для Yandex Cloud Functions (среда nodejs22), вызывается через API Gateway (интеграция cloud_functions).
// Переменные окружения и секреты (Lockbox): см. id/README.md.
import {handle} from './core.js';
import {ydbStore} from './store.js';
import {postboxMail} from './mail.js';

let deps;
async function init(){
  if (!deps) deps = {store: await ydbStore(process.env), mail: await postboxMail(process.env), env: process.env};
  return deps;
}

export async function handler(event){
  const d = await init();
  const h = {};
  for (const [k, v] of Object.entries(event.headers || {})) h[k.toLowerCase()] = v;
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
  const r = await handle({method: event.httpMethod, path: String(event.url || event.path || '/').split('?')[0], headers: h,
    query: event.queryStringParameters || {}, body}, d);
  const headers = {}, multi = {};
  for (const [k, v] of Object.entries(r.headers || {})) Array.isArray(v) ? (multi[k] = v) : (headers[k] = v);
  return {statusCode: r.status, headers, multiValueHeaders: multi, body: r.body, isBase64Encoded: false};
}
