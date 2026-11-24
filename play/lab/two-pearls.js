/* two-pearls: из 12 графиков отчёта Бобу для решения «катим или нет» нужны два — главная метрика с интервалом
   (разница B − A) и guardrail (отмены заказов). Остальные — устрицы: интересные, но решения не меняют (Нафлик, гл. 1). */
(function(){
  const C = Lab.C, PEARLS = ['diff', 'cancel'];
  const WHY = {
    diff: 'Жемчужина: эффект на главную метрику с интервалом — это и есть ответ «катим или нет».',
    cancel: 'Жемчужина: guardrail. Новое меню не должно ломать важное — например, поднимать отмены.',
    hours: 'Интересно, но решение «катим на всю сеть» от часа дня не зависит.',
    slices: '30 разрезов — где-нибудь «прокрасится» случайно. Решают по общему эффекту, разрезы — для новых гипотез.',
    pdays: 'p по дням — подглядывание. Решают в заранее выбранный день, по итогу.',
    checks: 'Форма чеков показывает, как тратят гости, но не эффект меню.',
    funnel: 'Где теряются гости — тема для следующего теста, а не для этого решения.',
    os: 'Описание аудитории: к решению ничего не добавляет.',
    split: 'Проверка сплита нужна Алисе. Бобу — одна строка: «группы поделились ровно».',
    weather: 'Погода одна и та же для A и B: монетка уже уравняла её.',
    matrix: 'Двадцать метрик сразу — открывать устрицы за Боба.',
    weeks: 'Средний чек без сравнения A и B ничего не говорит про меню.',
  };
  // мини-графики в плитках: что за график, без чисел
  const svg = kind => {
    const s = (inner) => '<svg viewBox="0 0 120 48" aria-hidden="true">' + inner + '</svg>', g = C.gray, b = C.ctrl, o = C.test;
    const line = pts => '<polyline fill="none" stroke="' + b + '" stroke-width="2" points="' + pts + '"/>';
    switch (kind){
      case 'diff': return s('<line x1="10" y1="24" x2="110" y2="24" stroke="' + g + '"/><line x1="52" y1="24" x2="98" y2="24" stroke="' + b + '" stroke-width="3"/><circle cx="75" cy="24" r="5" fill="' + b + '"/><line x1="30" y1="12" x2="30" y2="36" stroke="#6B6A65"/>');
      case 'cancel': return s('<rect x="30" y="18" width="22" height="26" fill="' + b + '"/><rect x="68" y="17" width="22" height="27" fill="' + o + '"/>');
      case 'hours': return s(line('6,40 20,30 34,20 48,26 62,12 76,18 90,30 104,36 116,40'));
      case 'slices': return s(Array.from({length: 10}, (_, i) => '<line x1="' + (40 + (i * 37 % 50)) + '" y1="' + (5 + i * 4) + '" x2="' + (60 + (i * 23 % 40)) + '" y2="' + (5 + i * 4) + '" stroke="' + b + '" stroke-width="2"/>').join(''));
      case 'pdays': return s(line('6,10 20,30 34,22 48,40 62,18 76,8 90,34 104,26 116,14') + '<line x1="6" y1="42" x2="116" y2="42" stroke="' + C.trap + '"/>');
      case 'checks': return s([6, 14, 26, 38, 30, 20, 12, 8, 5, 3].map((v, i) => '<rect x="' + (8 + i * 11) + '" y="' + (46 - v) + '" width="9" height="' + v + '" fill="' + g + '"/>').join(''));
      case 'funnel': return s([100, 70, 45, 30].map((v, i) => '<rect x="' + (60 - v / 2) + '" y="' + (4 + i * 11) + '" width="' + v + '" height="9" fill="' + g + '"/>').join(''));
      case 'os': return s('<rect x="10" y="18" width="62" height="12" fill="' + g + '"/><rect x="72" y="18" width="38" height="12" fill="#CFCBC2"/>');
      case 'split': return s('<polyline fill="none" stroke="' + b + '" stroke-width="2" points="6,26 30,22 54,27 78,23 102,26 116,24"/><polyline fill="none" stroke="' + o + '" stroke-width="2" points="6,24 30,25 54,23 78,26 102,23 116,25"/>');
      case 'weather': return s('<circle cx="40" cy="22" r="10" fill="#D9A441"/><ellipse cx="72" cy="28" rx="22" ry="10" fill="#CFCBC2"/>');
      case 'matrix': return s(Array.from({length: 40}, (_, i) => '<rect x="' + (20 + (i % 10) * 8) + '" y="' + (6 + Math.floor(i / 10) * 9) + '" width="7" height="8" fill="' + ['#E6ECF7', '#C7D8EF', '#FCE8E3', '#F4F3F0'][(i * 7) % 4] + '"/>').join(''));
      case 'weeks': return s(line('6,30 34,26 62,28 90,22 116,24'));
    }
    return '';
  };
  const card = document.querySelector('[data-toy="two-pearls"]');
  card.querySelectorAll('.lab-pick .opts button').forEach(b => b.insertAdjacentHTML('afterbegin', svg(b.dataset.v)));
  const read = Lab.pick(card, 2), det = document.getElementById('tp-d');
  async function run(api){
    const pick = api.guess, hit = pick.filter(v => PEARLS.includes(v)).length;
    card.querySelectorAll('.lab-pick .opts button').forEach(b => { b.classList.toggle('ok', PEARLS.includes(b.dataset.v)); b.classList.toggle('miss', pick.includes(b.dataset.v) && !PEARLS.includes(b.dataset.v)); });
    const name = v => card.querySelector('.opts button[data-v="' + v + '"]').textContent.trim();
    det.innerHTML = '';
    const items = [...new Set([...pick, ...PEARLS])];
    for (const v of items){ const p = document.createElement('p'); p.innerHTML = '<b>' + name(v) + '.</b> ' + WHY[v]; det.appendChild(p); await Lab.sleep(250); }
    api.status('Твой выбор: <b>' + pick.map(v => '«' + name(v) + '»').join(' и ') + '</b> · совпало с Алисой: <b>' + hit + ' из 2</b>. Жемчужины отмечены зелёным: главная метрика с интервалом и guardrail');
  }
  Lab.game('two-pearls', {fmt: v => v.length + ' графика выбраны', pick: () => { const v = read(); return v.length === 2 ? {v} : {err: 'Сначала выбери два графика: сейчас выбрано ' + v.length + '.'}; }, run});
})();
