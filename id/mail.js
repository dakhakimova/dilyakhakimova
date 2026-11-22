// Письма с кодом входа. postboxMail — Yandex Cloud Postbox (API совместим с Amazon SES v2), регион Россия.
// env: POSTBOX_FROM ('Котейка <hello@dilyakhakimova.com>'), AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (роль postbox.sender).

export function letter(code){
  const subject = `Код для входа: ${code}`;
  const text = `Код для входа на dilyakhakimova.com: ${code}\n\nОн действует 10 минут. Если вход запрашивал не ты, просто удали это письмо.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2a44">
<p>Код для входа на dilyakhakimova.com:</p>
<p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:16px 0">${code}</p>
<p>Он действует 10 минут. Если вход запрашивал не ты, просто удали это письмо.</p></div>`;
  return {subject, text, html};
}

export function memoryMail(){
  const sent = [];
  return {sent, async sendCode(to, code){ sent.push({to, code, ...letter(code)}); }};
}

export async function postboxMail(env){
  const {SESv2Client, SendEmailCommand} = await import('@aws-sdk/client-sesv2');
  const ses = new SESv2Client({region: 'ru-central1', endpoint: 'https://postbox.cloud.yandex.net'});
  return {
    async sendCode(to, code){
      const l = letter(code);
      await ses.send(new SendEmailCommand({FromEmailAddress: env.POSTBOX_FROM, Destination: {ToAddresses: [to]},
        Content: {Simple: {Subject: {Data: l.subject, Charset: 'UTF-8'},
          Body: {Text: {Data: l.text, Charset: 'UTF-8'}, Html: {Data: l.html, Charset: 'UTF-8'}}}}}));
    },
  };
}
