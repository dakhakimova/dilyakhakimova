// Хранилище: четыре таблицы «ключ → запись», ключ всегда в поле k.
//   people   — ученик: uid, почта, имя, аватар, согласие (персональные данные)
//   logins   — способ входа → uid ('email:<адрес>', 'ya:<id в Яндексе>')
//   codes    — почта → хеш кода из письма, срок, попытки, время отправок
//   sessions — SHA-256 токена cookie → uid, срок
// memoryStore — для тестов. ydbStore — YDB (serverless) через Document API, совместимый с DynamoDB.

export function memoryStore(){
  const t = {people: new Map(), logins: new Map(), codes: new Map(), sessions: new Map()};
  return {
    tables: t,
    async get(tab, k){ const v = t[tab].get(k); return v ? structuredClone(v) : null; },
    async put(tab, item){ t[tab].set(item.k, structuredClone(item)); },
    async del(tab, k){ t[tab].delete(k); },
    async delWhere(tab, field, value){ for (const [k, v] of t[tab]) if (v[field] === value) t[tab].delete(k); },
  };
}

// env: YDB_DOCAPI_ENDPOINT (https://docapi.serverless.yandexcloud.net/ru-central1/…), AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY —
// статический ключ сервисного аккаунта с ролью ydb.editor.
export async function ydbStore(env){
  const {DynamoDBClient} = await import('@aws-sdk/client-dynamodb');
  const {DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand} = await import('@aws-sdk/lib-dynamodb');
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({region: 'ru-central1', endpoint: env.YDB_DOCAPI_ENDPOINT}),
    {marshallOptions: {removeUndefinedValues: true}});
  return {
    async get(tab, k){ return (await db.send(new GetCommand({TableName: tab, Key: {k}, ConsistentRead: true}))).Item || null; },
    async put(tab, item){ await db.send(new PutCommand({TableName: tab, Item: item})); },
    async del(tab, k){ await db.send(new DeleteCommand({TableName: tab, Key: {k}})); },
    // только для удаления аккаунта: сессий мало, полный просмотр таблицы допустим
    async delWhere(tab, field, value){
      let start;
      do {
        const r = await db.send(new ScanCommand({TableName: tab, FilterExpression: '#f = :v', ExpressionAttributeNames: {'#f': field},
          ExpressionAttributeValues: {':v': value}, ExclusiveStartKey: start}));
        for (const it of r.Items || []) await db.send(new DeleteCommand({TableName: tab, Key: {k: it.k}}));
        start = r.LastEvaluatedKey;
      } while (start);
    },
  };
}
